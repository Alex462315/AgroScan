# ===========================================================================
# AgroScan — Crop Leaf Disease Detection API
# ===========================================================================
# PRE-REQUISITE: Create the MySQL database before running:
#   Open MySQL command line or MySQL Workbench and run:
#     CREATE DATABASE agroscan_db;
#
# MYSQL SETUP:
#   Step 1: Open MySQL Workbench or MySQL command line
#   Step 2: Run: CREATE DATABASE agroscan_db;
#   Step 3: Verify MySQL is running on localhost:3306
#   Step 4: Ensure username is root and password is root
#   Step 5: Install new requirements: pip install -r requirements.txt
#   Step 6: Run the backend: python app.py
#   Step 7: Tables will be created automatically on first run
#   Step 8: Default admin account created automatically:
#             Email:    admin@agroscan.com
#             Password: admin123
# ===========================================================================

import os

# Set Keras backend BEFORE importing keras — JAX works on Python 3.14
# TensorFlow does not yet support Python 3.14 on Windows
os.environ.setdefault("KERAS_BACKEND", "jax")

import io
import json
import logging
import traceback
from datetime import datetime, timedelta, timezone

import numpy as np
from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import (
    JWTManager, create_access_token, jwt_required,
    get_jwt_identity, get_jwt
)
from werkzeug.security import generate_password_hash, check_password_hash

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
CONFIDENCE_THRESHOLD = 70.0  # percentage — adjust to tune strictness
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
KERAS_MODEL_PATH = os.path.join(BASE_DIR, "agroscan_phase1_best.keras")
CLASS_INDICES_PATH = os.path.join(BASE_DIR, "class_indices.json")
TREATMENTS_PATH = os.path.join(BASE_DIR, "treatments.json")
IMAGE_SIZE = (224, 224)

SUPPORTED_CROPS = [
    "Apple", "Blueberry", "Cherry", "Corn", "Grape", "Orange",
    "Peach", "Bell Pepper", "Potato", "Raspberry", "Soybean",
    "Squash", "Strawberry", "Tomato",
]

GEMINI_PROMPT = (
    "Look at this image carefully. Is the PRIMARY subject of this image "
    "a leaf (or leaves) from a crop plant such as apple, blueberry, cherry, "
    "corn, grape, orange, peach, bell pepper, potato, raspberry, soybean, "
    "squash, strawberry, or tomato? The image must show an actual plant leaf "
    "as the main subject — not an animal, person, object, landscape, food, "
    "or any other non-leaf subject. Even if there are plants visible in the "
    "background, answer 'no' unless a crop leaf is the clear main subject. "
    "Answer with ONLY 'yes' or 'no'."
)

OOD_ERROR_RESPONSE = {
    "error": "unrecognized_image",
    "message": (
        "The uploaded image does not appear to be a recognizable crop leaf "
        "from our supported plant list. Please upload a clear photo of a "
        "leaf from one of the 14 supported crops."
    ),
}

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s  %(levelname)-8s  %(message)s")
logger = logging.getLogger("agroscan")

# ---------------------------------------------------------------------------
# Flask app + extensions
# ---------------------------------------------------------------------------
app = Flask(__name__)

# CORS — allow Vite dev server
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173"]}},
     supports_credentials=True)

# MySQL database
app.config["SQLALCHEMY_DATABASE_URI"] = "mysql+pymysql://root:root@localhost:3306/agroscan_db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 280,
    "pool_pre_ping": True,
}

# JWT
app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY", "agroscan-super-secret-key-change-in-production")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=7)

db = SQLAlchemy(app)
jwt = JWTManager(app)

# ---------------------------------------------------------------------------
# Database models
# ---------------------------------------------------------------------------

class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="user")  # "user" or "admin"
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    predictions = db.relationship("Prediction", backref="user", lazy=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Prediction(db.Model):
    __tablename__ = "predictions"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    image_filename = db.Column(db.String(255), nullable=True)
    prediction = db.Column(db.String(120), nullable=False)
    confidence = db.Column(db.Float, nullable=False)
    crop = db.Column(db.String(80), nullable=False)
    condition = db.Column(db.String(120), nullable=False)
    is_healthy = db.Column(db.Boolean, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "user_name": self.user.name if self.user else None,
            "user_email": self.user.email if self.user else None,
            "image_filename": self.image_filename,
            "prediction": self.prediction,
            "confidence": self.confidence,
            "crop": self.crop,
            "condition": self.condition,
            "is_healthy": self.is_healthy,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

# ---------------------------------------------------------------------------
# Load class mappings
# ---------------------------------------------------------------------------
with open(CLASS_INDICES_PATH, "r") as f:
    class_indices: dict = json.load(f)
index_to_label = {int(k): v for k, v in class_indices.items()}

# ---------------------------------------------------------------------------
# Load treatment data
# ---------------------------------------------------------------------------
with open(TREATMENTS_PATH, "r", encoding="utf-8-sig") as f:
    treatments_data: dict = json.load(f)
logger.info("✓ Loaded treatment data for %d disease classes.", len(treatments_data))

# ---------------------------------------------------------------------------
# Load model with Keras 3
# ---------------------------------------------------------------------------
import keras
logger.info("Keras %s  |  Backend: %s", keras.__version__, keras.backend.backend())
logger.info("Loading model from %s …", KERAS_MODEL_PATH)
ml_model = keras.models.load_model(KERAS_MODEL_PATH)
logger.info("✓ Model loaded — input: %s  output: %s", ml_model.input_shape, ml_model.output_shape)

# ---------------------------------------------------------------------------
# Optional: Gemini client (Layer 2)
# ---------------------------------------------------------------------------
gemini_model = None
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if GEMINI_API_KEY:
    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        gemini_model = genai.GenerativeModel("gemini-1.5-flash")
        print("✅ Gemini Layer 2 verification: ENABLED")
        logger.info("Gemini Vision API configured with gemini-1.5-flash.")
    except Exception:
        print("⚠️ Gemini Layer 2 verification: DISABLED (API config failed)")
        logger.warning("Failed to configure Gemini API:\n%s",
                       traceback.format_exc())
else:
    print("⚠️ Gemini Layer 2 verification: DISABLED (running Layer 1 only)")

# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def _parse_label(label: str):
    """Split a class label like 'Tomato___Late_blight' into (crop, condition)."""
    parts = label.split("___")
    crop = parts[0].replace("_", " ").strip()
    crop = crop.replace("Corn (maize)", "Corn").replace("Cherry (including sour)", "Cherry")
    crop = crop.replace("Pepper, bell", "Bell Pepper")
    if "," in crop:
        crop = crop.title()
    condition = parts[1].replace("_", " ").strip() if len(parts) > 1 else "Unknown"
    is_healthy = condition.lower() == "healthy"
    return crop, condition, is_healthy


def _compute_severity(confidence: float) -> dict:
    """Return severity label and urgency message based on confidence score."""
    if confidence >= 95:
        return {
            "level": "critical",
            "emoji": "🔴",
            "label": "Critical",
            "message": "Immediate treatment required — high confidence detection.",
        }
    elif confidence >= 85:
        return {
            "level": "high",
            "emoji": "🟠",
            "label": "High",
            "message": "Treat within 48 hours to prevent spread.",
        }
    else:
        return {
            "level": "moderate",
            "emoji": "🟡",
            "label": "Moderate",
            "message": "Monitor closely and treat within a week.",
        }


def _preprocess_image(image_bytes: bytes) -> np.ndarray:
    """Load raw bytes → PIL → numpy array suitable for EfficientNetB0."""
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = img.resize(IMAGE_SIZE)
    arr = np.array(img, dtype="float32")
    return np.expand_dims(arr, axis=0)


def _check_leaf_image(image_bytes: bytes):
    """
    Layer 0 — Local image analysis to detect obvious non-leaf images.

    Analyzes the *center* of the image (ignoring background edges) for
    plant-like colour characteristics using HSV decomposition.
    Returns (is_likely_leaf: bool, reason: str).
    """
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        w, h = img.size

        # Centre-crop to ~60 % of the image so background doesn't dominate
        mx, my = int(w * 0.2), int(h * 0.2)
        center = img.crop((mx, my, w - mx, h - my))
        center = center.resize((80, 80))  # small is fine for statistics
        arr = np.array(center, dtype="float32") / 255.0
        r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
        total = arr.shape[0] * arr.shape[1]

        # ---- RGB-to-HSV (vectorised) ----
        cmax = np.maximum(np.maximum(r, g), b)
        cmin = np.minimum(np.minimum(r, g), b)
        delta = cmax - cmin

        hue = np.zeros_like(cmax)
        sat = np.where(cmax > 0.01, delta / (cmax + 1e-10), 0.0)

        m = delta > 0.01
        rm = m & (cmax == r)
        gm = m & (cmax == g) & ~rm
        bm = m & (cmax == b) & ~rm & ~gm
        hue[rm] = (60 * ((g[rm] - b[rm]) / (delta[rm] + 1e-10))) % 360
        hue[gm] = 60 * ((b[gm] - r[gm]) / (delta[gm] + 1e-10)) + 120
        hue[bm] = 60 * ((r[bm] - g[bm]) / (delta[bm] + 1e-10)) + 240
        hue = hue % 360

        # ---- Green / plant-like pixels (hue 35-165, decent saturation) ----
        green_mask = (hue >= 35) & (hue <= 165) & (sat > 0.10) & (cmax > 0.06)
        green_ratio = float(green_mask.sum()) / total

        # ---- Warm skin / fur tones (characteristic R > G > B, warm hue) ----
        skin_mask = (
            (r > g) & (g > b * 0.8) &
            (r > 0.25) &
            (sat > 0.04) & (sat < 0.65) &
            ((hue < 45) | (hue > 340)) &
            (cmax > 0.15)
        )
        skin_ratio = float(skin_mask.sum()) / total

        # ---- Blue-dominant pixels (sky, water, blue objects) ----
        blue_mask = (hue >= 180) & (hue <= 270) & (sat > 0.15) & (cmax > 0.10)
        blue_ratio = float(blue_mask.sum()) / total

        # ---- Gray / achromatic pixels ----
        gray_mask = (sat < 0.08) & (cmax > 0.10) & (cmax < 0.90)
        gray_ratio = float(gray_mask.sum()) / total

        logger.info(
            "Layer 0 — centre-crop colours: green=%.1f%%, skin=%.1f%%, "
            "blue=%.1f%%, gray=%.1f%%",
            green_ratio * 100, skin_ratio * 100,
            blue_ratio * 100, gray_ratio * 100,
        )

        # ---- Conservative rejection rules (only reject obvious non-leaves) ----

        # High skin/fur + very low green → likely animal or person
        if skin_ratio > 0.25 and green_ratio < 0.10:
            return False, (
                f"High skin/fur tones ({skin_ratio:.0%}) with minimal "
                f"plant colours ({green_ratio:.0%}) in image centre"
            )

        # Almost no green AND notable warm tones
        if green_ratio < 0.03 and skin_ratio > 0.12:
            return False, (
                f"Almost no green ({green_ratio:.0%}) with warm "
                f"tones ({skin_ratio:.0%})"
            )

        # Dominated by blue with no green
        if blue_ratio > 0.40 and green_ratio < 0.08:
            return False, (
                f"Dominated by blue ({blue_ratio:.0%}) with minimal "
                f"plant colours"
            )

        # Mostly achromatic with no plant colours
        if gray_ratio > 0.50 and green_ratio < 0.05:
            return False, (
                f"Mostly achromatic ({gray_ratio:.0%}) with minimal "
                f"plant colours"
            )

        return True, "passed"

    except Exception:
        logger.warning("Layer 0 check failed:\n%s", traceback.format_exc())
        return True, "check_error"  # fail-open so valid uploads aren't blocked


def _run_prediction(input_tensor: np.ndarray) -> np.ndarray:
    """Run inference and return class probabilities."""
    predictions = ml_model.predict(input_tensor, verbose=0)
    probabilities = np.array(predictions[0])
    if np.any(probabilities < 0) or np.any(probabilities > 1.01) or abs(float(probabilities.sum()) - 1.0) > 0.05:
        exp_preds = np.exp(probabilities - np.max(probabilities))
        probabilities = exp_preds / exp_preds.sum()
    return probabilities


def _gemini_verify(image_bytes: bytes) -> bool | None:
    """Layer 2 — ask Gemini Vision if the image is a supported crop leaf."""
    if gemini_model is None:
        return None
    try:
        pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        response = gemini_model.generate_content([GEMINI_PROMPT, pil_img])
        answer = response.text.strip().lower()
        logger.info("Gemini response: %s", answer)
        if "no" in answer and "yes" not in answer:
            return False
        if "yes" in answer:
            return True
        logger.warning("Gemini gave ambiguous answer: %s — skipping Layer 2", answer)
        return None
    except Exception:
        logger.warning("Gemini API call failed — skipping Layer 2.\n%s",
                       traceback.format_exc())
        return None


def admin_required(fn):
    """Decorator to require admin role."""
    from functools import wraps
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user_id = get_jwt_identity()
        user = db.session.get(User, int(user_id))
        if not user or user.role != "admin":
            return jsonify({"error": "Admin access required"}), 403
        return fn(*args, **kwargs)
    return wrapper

# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------

@app.route("/api/auth/signup", methods=["POST"])
def signup():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not name:
        return jsonify({"error": "Name is required"}), 400
    if not email or "@" not in email:
        return jsonify({"error": "Valid email is required"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 409

    user = User(name=name, email=email, role="user")
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": user.to_dict()}), 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid email or password"}), 401

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": user.to_dict()})


@app.route("/api/auth/me", methods=["GET"])
@jwt_required()
def get_me():
    user_id = get_jwt_identity()
    user = db.session.get(User, int(user_id))
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"user": user.to_dict()})

# ---------------------------------------------------------------------------
# Prediction route (requires auth)
# ---------------------------------------------------------------------------

@app.route("/api/predict", methods=["POST"])
@jwt_required()
def predict():
    user_id = get_jwt_identity()

    if "file" not in request.files:
        return jsonify({"error": "no_file", "message": "No file uploaded."}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "no_file", "message": "No file selected."}), 400

    allowed_ext = {"png", "jpg", "jpeg", "webp", "bmp", "gif"}
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in allowed_ext:
        return jsonify({"error": "invalid_format",
                        "message": f"Unsupported file format '.{ext}'. "
                                   f"Please upload a PNG, JPG, or WEBP image."}), 400

    image_bytes = file.read()

    # Layer 0: Local colour-based leaf check (fast, no API call)
    is_leaf, leaf_reason = _check_leaf_image(image_bytes)
    if not is_leaf:
        logger.info("Layer 0 (local analysis) rejected: %s", leaf_reason)
        return jsonify(OOD_ERROR_RESPONSE), 400

    # Layer 2: Gemini Vision verification
    gemini_result = _gemini_verify(image_bytes)
    if gemini_result is False:
        logger.info("Layer 2 (Gemini) rejected the image.")
        return jsonify(OOD_ERROR_RESPONSE), 400

    # Preprocess & Predict
    try:
        input_tensor = _preprocess_image(image_bytes)
    except Exception:
        return jsonify({"error": "invalid_image",
                        "message": "Could not process the uploaded image."}), 400

    probabilities = _run_prediction(input_tensor)
    top_index = int(np.argmax(probabilities))
    top_confidence = float(probabilities[top_index]) * 100

    # Layer 1: Confidence threshold
    if top_confidence < CONFIDENCE_THRESHOLD:
        logger.info("Layer 1 rejected: confidence %.2f%% < threshold %.2f%%",
                     top_confidence, CONFIDENCE_THRESHOLD)
        return jsonify(OOD_ERROR_RESPONSE), 400

    # Success
    label = index_to_label.get(top_index, "Unknown")
    crop, condition, is_healthy = _parse_label(label)
    logger.info("Prediction: %s (%.2f%%)", label, top_confidence)

    # Save to database
    pred = Prediction(
        user_id=int(user_id),
        image_filename=file.filename,
        prediction=label,
        confidence=round(top_confidence, 2),
        crop=crop,
        condition=condition,
        is_healthy=is_healthy,
    )
    db.session.add(pred)
    db.session.commit()

    # Build treatment info from treatments.json
    treatment_info = treatments_data.get(label)
    severity = None if is_healthy else _compute_severity(round(top_confidence, 2))

    return jsonify({
        "id": pred.id,
        "prediction": label,
        "confidence": round(top_confidence, 2),
        "crop": crop,
        "condition": condition,
        "is_healthy": is_healthy,
        "severity": severity,
        "treatment": treatment_info,
    })

# ---------------------------------------------------------------------------
# Misc API routes
# ---------------------------------------------------------------------------

@app.route("/api/supported-crops")
def supported_crops():
    return jsonify({"crops": SUPPORTED_CROPS})


@app.route("/api/treatments/<path:label>", methods=["GET"])
def get_treatment(label: str):
    """Return treatment data for a given disease label."""
    info = treatments_data.get(label)
    if not info:
        return jsonify({"error": "Treatment data not found for this label."}), 404
    return jsonify({"label": label, "treatment": info})

# ---------------------------------------------------------------------------
# User prediction history
# ---------------------------------------------------------------------------

@app.route("/api/predictions/history", methods=["GET"])
@jwt_required()
def prediction_history():
    """Return the authenticated user's own prediction history."""
    user_id = get_jwt_identity()
    preds = (
        Prediction.query
        .filter_by(user_id=int(user_id))
        .order_by(Prediction.created_at.desc())
        .all()
    )
    return jsonify({"predictions": [p.to_dict() for p in preds]})

# ---------------------------------------------------------------------------
# Admin routes
# ---------------------------------------------------------------------------

@app.route("/api/admin/stats", methods=["GET"])
@admin_required
def admin_stats():
    total_users = User.query.count()
    total_predictions = Prediction.query.count()
    healthy_count = Prediction.query.filter_by(is_healthy=True).count()
    disease_count = Prediction.query.filter_by(is_healthy=False).count()

    # Recent predictions (last 7 days)
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    recent_predictions = Prediction.query.filter(Prediction.created_at >= week_ago).count()

    return jsonify({
        "total_users": total_users,
        "total_predictions": total_predictions,
        "healthy_count": healthy_count,
        "disease_count": disease_count,
        "recent_predictions": recent_predictions,
    })


@app.route("/api/admin/users", methods=["GET"])
@admin_required
def admin_users():
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify({"users": [u.to_dict() for u in users]})


@app.route("/api/admin/predictions", methods=["GET"])
@admin_required
def admin_predictions():
    preds = Prediction.query.order_by(Prediction.created_at.desc()).limit(100).all()
    return jsonify({"predictions": [p.to_dict() for p in preds]})

# ---------------------------------------------------------------------------
# Seed admin account
# ---------------------------------------------------------------------------

def seed_admin():
    """Create default admin account if it doesn't exist."""
    admin = User.query.filter_by(email="admin@agroscan.com").first()
    if not admin:
        admin = User(name="Admin", email="admin@agroscan.com", role="admin")
        admin.set_password("admin123")
        db.session.add(admin)
        db.session.commit()
        print("✅ Default admin account created: admin@agroscan.com / admin123")
    else:
        print("ℹ️  Admin account already exists.")

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        print("✅ Database tables created/verified.")
        seed_admin()

    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
