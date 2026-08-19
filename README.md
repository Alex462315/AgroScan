# AgroScan
AI-powered crop leaf disease detection web application built with EfficientNetB0, Flask, and React.
# 🌿 AgroScan — AI-Powered Crop Disease Detection

AgroScan is a full-stack web application that uses deep learning to detect 
diseases in crop leaves from a single uploaded photo. Built as part of an 
academic project aligned with UN Sustainable Development Goals — 
SDG 2 (Zero Hunger), SDG 9 (Industry, Innovation and Infrastructure), 
and SDG 15 (Life on Land).

## 🔬 How It Works

Users upload a photo of a crop leaf through the web interface. The image 
is analysed by a fine-tuned EfficientNetB0 convolutional neural network 
trained on the PlantVillage dataset (54,305 images across 38 disease 
classes and 14 crop types). The system returns an instant diagnosis along 
with organic treatment recommendations, chemical treatment options, and 
prevention tips to help farmers take action immediately.

## ✨ Features

- 🔍 AI-powered disease detection with 98.54% validation accuracy
- 🌱 Supports 14 crop types and 38 disease/healthy classes
- 🛡 Two-layer out-of-distribution rejection system (confidence 
     threshold + Google Gemini Vision API) to reject non-leaf images
- 💊 Treatment recommendations including organic, chemical, and 
     prevention measures for each detected disease
- 🔐 JWT-based authentication with login, signup, and protected routes
- 👥 Admin dashboard for managing users and viewing prediction history
- 📊 Scan history for each authenticated user
- 🌿 Clean, responsive UI with a premium green gradient design

## 🛠 Tech Stack

### Machine Learning
- Model        : EfficientNetB0 (transfer learning, fine-tuned)
- Dataset      : PlantVillage (54,305 images, 38 classes)
- Framework    : TensorFlow / Keras 3
- Training     : Google Colab (T4 GPU)
- Accuracy     : 98.54% validation accuracy

### Backend
- Framework    : Python Flask
- Database     : MySQL (SQLAlchemy ORM)
- Auth         : JWT (PyJWT) + bcrypt password hashing
- OOD Layer 1  : Confidence threshold (70%)
- OOD Layer 2  : Google Gemini Vision API (gemini-1.5-flash)
- Image proc   : Pillow (PIL)

### Frontend
- Framework    : React 19 + Vite
- Routing      : React Router v6
- HTTP client  : Axios
- Animations   : Framer Motion
- Styling      : Plain CSS (no Tailwind, no UI library)

## 🌿 Supported Crops

Apple · Blueberry · Cherry · Corn · Grape · Orange · Peach · 
Bell Pepper · Potato · Raspberry · Soybean · Squash · 
Strawberry · Tomato

## 🚀 Getting Started

### Prerequisites
- Python 3.10 or 3.11
- Node.js 18 or 20 LTS
- MySQL Server 8.0

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
# Create MySQL database first:
# CREATE DATABASE agroscan_db;
python app.py
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Environment Variables
```bash
# Set your Gemini API key (optional but recommended for Layer 2 OOD rejection)
setx GEMINI_API_KEY "your-api-key-here"
```

### Default Admin Account
