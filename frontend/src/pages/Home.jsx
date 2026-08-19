import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const CROP_EMOJIS = {
  Apple: '🍎', Blueberry: '🫐', Cherry: '🍒', Corn: '🌽',
  Grape: '🍇', Orange: '🍊', Peach: '🍑', 'Bell Pepper': '🫑',
  Potato: '🥔', Raspberry: '🫐', Soybean: '🫘', Squash: '🎃',
  Strawberry: '🍓', Tomato: '🍅',
};

const SUPPORTED_CROPS = Object.keys(CROP_EMOJIS);

const IPM_ICONS = ['🚨', '📋', '🔄', '📅'];

/* ------------------------------------------------------------------ */
/*  Accordion component                                                */
/* ------------------------------------------------------------------ */
function Accordion({ icon, title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`accordion ${open ? 'accordion--open' : ''}`}>
      <button className="accordion__header" onClick={() => setOpen(!open)}>
        <span className="accordion__icon">{icon}</span>
        <span className="accordion__title">{title}</span>
        <span className="accordion__arrow">▼</span>
      </button>
      <div className="accordion__body">
        <div className="accordion__content">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pesticide Card                                                     */
/* ------------------------------------------------------------------ */
function PesticideCard({ p }) {
  return (
    <div className="pesticide-card">
      <div className="pesticide-card__name">{p.name}</div>
      {p.brand_names && p.brand_names[0] !== 'N/A' && (
        <div className="pesticide-card__brands">
          {p.brand_names.map((b, i) => (
            <span key={i} className="pesticide-card__brand-tag">{b}</span>
          ))}
        </div>
      )}
      <div className="pesticide-card__details">
        {p.dosage && p.dosage !== 'N/A' && (
          <div className="pesticide-card__detail">
            <span className="pesticide-card__detail-label">💧 Dosage</span>
            <span>{p.dosage}</span>
          </div>
        )}
        {p.frequency && p.frequency !== 'N/A' && (
          <div className="pesticide-card__detail">
            <span className="pesticide-card__detail-label">🔁 Frequency</span>
            <span>{p.frequency}</span>
          </div>
        )}
        {p.method && p.method !== 'N/A' && (
          <div className="pesticide-card__detail">
            <span className="pesticide-card__detail-label">🎯 Method</span>
            <span>{p.method}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Treatment Panel (the big section below the result card)            */
/* ------------------------------------------------------------------ */
function TreatmentPanel({ result }) {
  const t = result.treatment;
  const severity = result.severity;
  const [farmerMode, setFarmerMode] = useState('organic'); // 'organic' | 'chemical'
  const [checkedItems, setCheckedItems] = useState({});

  if (!t) return null;

  // Healthy state — show care tips
  if (t.is_healthy) {
    return (
      <div className="treatment-panel card">
        <div className="healthy-banner">
          <span className="healthy-banner__icon">🌱</span>
          <div>
            <div className="healthy-banner__title">Your plant is healthy!</div>
            <p className="healthy-banner__desc">{t.description}</p>
          </div>
        </div>
        {t.care_tips && (
          <div className="care-tips">
            <div className="care-tips__title">💡 General Care Tips</div>
            <ul className="care-tips__list">
              {t.care_tips.map((tip, i) => (
                <li key={i} className="care-tips__item">{tip}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // Disease state — full treatment UI
  const toggleCheck = (idx) => {
    setCheckedItems((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const checkedCount = Object.values(checkedItems).filter(Boolean).length;
  const totalChecklist = t.spread_checklist?.length || 0;

  return (
    <div className="treatment-panel">

      {/* Severity Banner */}
      {severity && (
        <div className={`severity-banner severity--${severity.level}`}>
          <span className="severity-banner__emoji">{severity.emoji}</span>
          <div className="severity-banner__content">
            <div className="severity-banner__label">{severity.label} Severity</div>
            <div className="severity-banner__message">{severity.message}</div>
          </div>
        </div>
      )}

      {/* Disease Description */}
      <div className="card treatment-desc">
        <div className="treatment-desc__title">🔬 About This Condition</div>
        <p className="treatment-desc__text">{t.description}</p>
      </div>

      {/* Farmer Mode Toggle */}
      <div className="farmer-toggle-wrap">
        <div className="farmer-toggle">
          <button
            className={`farmer-toggle__btn ${farmerMode === 'organic' ? 'farmer-toggle__btn--active' : ''}`}
            onClick={() => setFarmerMode('organic')}
          >
            🌿 Organic Farmer
          </button>
          <button
            className={`farmer-toggle__btn ${farmerMode === 'chemical' ? 'farmer-toggle__btn--active' : ''}`}
            onClick={() => setFarmerMode('chemical')}
          >
            🧪 Conventional Farmer
          </button>
        </div>
      </div>

      {/* Treatment Accordions */}
      {farmerMode === 'organic' && t.organic_treatment && (
        <Accordion icon="🌿" title="Organic Treatment Methods" defaultOpen={true}>
          <div className="treatment-methods">
            {t.organic_treatment.methods.map((m, i) => (
              <div key={i} className="treatment-method-card">
                <div className="treatment-method-card__name">{m.name}</div>
                <p className="treatment-method-card__instructions">{m.instructions}</p>
                <div className="treatment-method-card__freq">
                  <span>🔁</span> {m.frequency}
                </div>
              </div>
            ))}
          </div>
        </Accordion>
      )}

      {farmerMode === 'chemical' && t.chemical_treatment && (
        <Accordion icon="🧪" title="Chemical Treatment — Pesticide Recommendations" defaultOpen={true}>
          <div className="treatment-methods">
            {t.chemical_treatment.pesticides.map((p, i) => (
              <PesticideCard key={i} p={p} />
            ))}
          </div>
          {t.chemical_treatment.warning && (
            <div className="treatment-warning">
              <span>⚠️</span> {t.chemical_treatment.warning}
            </div>
          )}
        </Accordion>
      )}

      <Accordion icon="🛡" title="Prevention Tips">
        {t.prevention && (
          <ul className="prevention-list">
            {t.prevention.map((tip, i) => (
              <li key={i} className="prevention-list__item">{tip}</li>
            ))}
          </ul>
        )}
      </Accordion>

      {/* Spread Prevention Checklist */}
      {t.spread_checklist && (
        <div className="card checklist-card">
          <div className="checklist-card__header">
            <div className="checklist-card__title">🚧 Spread Prevention Checklist</div>
            <div className="checklist-card__progress">
              <span className="checklist-card__count">{checkedCount}/{totalChecklist}</span>
              <div className="checklist-progress-track">
                <div
                  className="checklist-progress-fill"
                  style={{ width: totalChecklist > 0 ? `${(checkedCount / totalChecklist) * 100}%` : '0%' }}
                ></div>
              </div>
            </div>
          </div>
          <div className="checklist">
            {t.spread_checklist.map((item, i) => (
              <label key={i} className={`checklist__item ${checkedItems[i] ? 'checklist__item--done' : ''}`}>
                <input
                  type="checkbox"
                  checked={!!checkedItems[i]}
                  onChange={() => toggleCheck(i)}
                />
                <span className="checklist__checkbox"></span>
                <span className="checklist__text">{item}</span>
              </label>
            ))}
          </div>
          {checkedCount === totalChecklist && totalChecklist > 0 && (
            <div className="checklist-complete">
              ✅ All prevention steps completed! Great job protecting your crops.
            </div>
          )}
        </div>
      )}

      {/* IPM Timeline */}
      {t.ipm_steps && (
        <div className="card ipm-card">
          <div className="ipm-card__title">📊 Integrated Pest Management (IPM) Plan</div>
          <div className="ipm-timeline">
            {t.ipm_steps.map((step, i) => (
              <div key={i} className="ipm-step">
                <div className="ipm-step__connector">
                  <div className="ipm-step__dot">{IPM_ICONS[i] || '📌'}</div>
                  {i < t.ipm_steps.length - 1 && <div className="ipm-step__line"></div>}
                </div>
                <div className="ipm-step__content">
                  <div className="ipm-step__header">
                    <span className="ipm-step__phase">{step.phase}</span>
                    <span className="ipm-step__timeframe">{step.timeframe}</span>
                  </div>
                  <ul className="ipm-step__actions">
                    {step.actions.map((action, j) => (
                      <li key={j}>{action}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Home Page                                                          */
/* ================================================================== */
export default function Home() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [oodError, setOodError] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [cropsOpen, setCropsOpen] = useState(false);

  const handleFile = useCallback((f) => {
    const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/bmp', 'image/gif'];
    if (!validTypes.includes(f.type)) {
      setError('Please upload a valid image file (PNG, JPG, or WEBP).');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('Image is too large. Please upload an image under 10 MB.');
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setOodError(false);
    setError('');
  }, []);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setOodError(false);
    setError('');
    setCropsOpen(false);
  };

  const analyze = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    setOodError(false);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.status === 401) {
        logout();
        navigate('/login', { replace: true });
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'unrecognized_image') {
          setOodError(true);
        } else {
          setError(data.message || 'Prediction failed.');
        }
        return;
      }

      setResult(data);
    } catch {
      setError('Network error — please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 8 }}>
          Crop Leaf Disease Detection
        </h1>
        <p style={{ color: '#6b7280', fontSize: '0.92rem', maxWidth: 480, margin: '0 auto' }}>
          Upload a leaf photo to get an instant AI-powered diagnosis across 14 supported crops.
        </p>
        <div className="hero-stats">
          <span className="stat-pill">🔬 38 Conditions</span>
          <span className="stat-pill">🌱 14 Crops</span>
          <span className="stat-pill">⚡ Instant Results</span>
        </div>
      </div>

      {/* Upload card */}
      <div className="card">
        {!preview && (
          <div
            className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
            onClick={() => document.getElementById('file-input').click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
            }}
          >
            <span className="upload-zone__icon">📤</span>
            <p className="upload-zone__text"><strong>Click to upload</strong> or drag &amp; drop</p>
            <p className="upload-zone__hint">PNG, JPG, WEBP — max 10 MB</p>
            <input
              type="file"
              id="file-input"
              accept="image/png,image/jpeg,image/webp,image/bmp,image/gif"
              onChange={(e) => { if (e.target.files.length) handleFile(e.target.files[0]); }}
            />
          </div>
        )}

        {preview && (
          <div className="preview-container">
            <div className="preview-wrapper">
              <img src={preview} alt="Uploaded leaf" />
              <div className="preview-overlay">
                <span className="preview-filename">{file?.name}</span>
                <button className="preview-remove" onClick={reset}>✕ Remove</button>
              </div>
            </div>
          </div>
        )}

        {preview && !result && !oodError && (
          <button
            className="btn btn--primary"
            style={{ marginTop: 18 }}
            onClick={analyze}
            disabled={loading}
          >
            {loading ? (
              <><span className="spinner spinner--sm"></span> Analyzing…</>
            ) : (
              '🔬 Analyze Leaf'
            )}
          </button>
        )}
      </div>

      {/* Result */}
      {result && (
        <>
          <div className={`result-card card ${result.is_healthy ? 'result-card--healthy' : 'result-card--disease'}`}>
            <div className="result-header">
              <span className="result-header__icon">{result.is_healthy ? '✅' : '🔍'}</span>
              <div>
                <div className="result-header__title">{result.crop}</div>
                <span className={`result-badge ${result.is_healthy ? 'badge--healthy' : 'badge--disease'}`}>
                  {result.is_healthy ? 'Healthy' : 'Disease Detected'}
                </span>
              </div>
            </div>
            <div className="result-details">
              <div className="result-detail">
                <span className="result-detail__label">Condition</span>
                <span className="result-detail__value">{result.condition}</span>
              </div>
              <div className="result-detail">
                <span className="result-detail__label">Full Label</span>
                <span className="result-detail__value" style={{ fontSize: '0.82rem' }}>{result.prediction}</span>
              </div>
              <div className="result-detail">
                <span className="result-detail__label">Confidence</span>
                <span className="result-detail__value">{result.confidence.toFixed(1)}%</span>
              </div>
              <div className="confidence-bar__track">
                <div
                  className={`confidence-bar__fill ${result.confidence >= 90 ? 'confidence-bar__fill--high' : 'confidence-bar__fill--medium'}`}
                  style={{ width: `${result.confidence}%` }}
                ></div>
              </div>
            </div>
            <button className="btn btn--outline" style={{ marginTop: 20, width: '100%' }} onClick={reset}>
              🔄 Scan Another Leaf
            </button>
          </div>

          {/* Treatment Panel — all 5 enhancements rendered here */}
          <TreatmentPanel result={result} />
        </>
      )}

      {/* OOD rejection */}
      {oodError && (
        <div className="ood-card">
          <div className="ood-header">
            <span className="ood-header__icon">⚠️</span>
            <div className="ood-header__title">Image Not Recognized</div>
          </div>
          <p className="ood-message">
            This doesn't appear to be a supported crop leaf. Please upload a clear photo of a leaf from one of the 14 supported crops.
          </p>
          <button
            className={`crops-toggle ${cropsOpen ? 'open' : ''}`}
            onClick={() => setCropsOpen(!cropsOpen)}
          >
            <span className="crops-toggle__arrow">▼</span>
            Supported Crops
          </button>
          <div className={`crops-list ${cropsOpen ? 'open' : ''}`}>
            <div className="crops-grid">
              {SUPPORTED_CROPS.map((c) => (
                <div className="crop-tag" key={c}>
                  <span className="crop-tag__icon">{CROP_EMOJIS[c]}</span> {c}
                </div>
              ))}
            </div>
          </div>
          <button className="btn btn--primary" style={{ marginTop: 18 }} onClick={reset}>
            🔄 Try Again
          </button>
        </div>
      )}

      {/* Generic error */}
      {error && (
        <div className="ood-card" style={{ borderColor: '#fecaca' }}>
          <div className="ood-header">
            <span className="ood-header__icon">❌</span>
            <div className="ood-header__title" style={{ color: '#dc2626' }}>Something Went Wrong</div>
          </div>
          <p className="ood-message">{error}</p>
          <button className="btn btn--primary" onClick={reset}>🔄 Try Again</button>
        </div>
      )}
    </div>
  );
}
