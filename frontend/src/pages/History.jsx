import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const CROP_EMOJIS = {
  Apple: '🍎', Blueberry: '🫐', Cherry: '🍒', Corn: '🌽',
  Grape: '🍇', Orange: '🍊', Peach: '🍑', 'Bell Pepper': '🫑',
  Potato: '🥔', Raspberry: '🫐', Soybean: '🫘', Squash: '🎃',
  Strawberry: '🍓', Tomato: '🍅',
};

export default function History() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'healthy' | 'disease'

  useEffect(() => {
    fetch('/api/predictions/history', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 401) { logout(); navigate('/login', { replace: true }); return; }
        return res.json();
      })
      .then((data) => { if (data) setPredictions(data.predictions || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = predictions.filter((p) => {
    if (filter === 'healthy') return p.is_healthy;
    if (filter === 'disease') return !p.is_healthy;
    return true;
  });

  const healthyCount = predictions.filter((p) => p.is_healthy).length;
  const diseaseCount = predictions.filter((p) => !p.is_healthy).length;

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 8 }}>
          📋 Scan History
        </h1>
        <p style={{ color: '#6b7280', fontSize: '0.92rem', maxWidth: 480, margin: '0 auto' }}>
          View all your past leaf scans and diagnoses.
        </p>
      </div>

      {/* Stats summary */}
      <div className="history-stats">
        <div className="history-stat-card">
          <div className="history-stat-card__value">{predictions.length}</div>
          <div className="history-stat-card__label">Total Scans</div>
        </div>
        <div className="history-stat-card history-stat-card--healthy">
          <div className="history-stat-card__value">{healthyCount}</div>
          <div className="history-stat-card__label">Healthy</div>
        </div>
        <div className="history-stat-card history-stat-card--disease">
          <div className="history-stat-card__value">{diseaseCount}</div>
          <div className="history-stat-card__label">Disease</div>
        </div>
      </div>

      {/* Filter pills */}
      <div className="history-filters">
        <button
          className={`history-filter-pill ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({predictions.length})
        </button>
        <button
          className={`history-filter-pill history-filter-pill--healthy ${filter === 'healthy' ? 'active' : ''}`}
          onClick={() => setFilter('healthy')}
        >
          ✅ Healthy ({healthyCount})
        </button>
        <button
          className={`history-filter-pill history-filter-pill--disease ${filter === 'disease' ? 'active' : ''}`}
          onClick={() => setFilter('disease')}
        >
          🔍 Disease ({diseaseCount})
        </button>
      </div>

      {/* Results list */}
      {filtered.length === 0 ? (
        <div className="history-empty card">
          <div className="history-empty__icon">
            {predictions.length === 0 ? '🌱' : '🔎'}
          </div>
          <div className="history-empty__title">
            {predictions.length === 0
              ? 'No scans yet'
              : 'No matching results'}
          </div>
          <p className="history-empty__text">
            {predictions.length === 0
              ? 'Upload a leaf photo from the home page to get started.'
              : 'Try a different filter to see your scan history.'}
          </p>
          {predictions.length === 0 && (
            <button
              className="btn btn--primary"
              onClick={() => navigate('/home')}
            >
              🔬 Start Scanning
            </button>
          )}
        </div>
      ) : (
        <div className="history-list">
          {filtered.map((p) => (
            <div
              key={p.id}
              className={`history-card card ${p.is_healthy ? 'history-card--healthy' : 'history-card--disease'}`}
            >
              <div className="history-card__header">
                <span className="history-card__emoji">
                  {CROP_EMOJIS[p.crop] || '🌿'}
                </span>
                <div className="history-card__crop-info">
                  <div className="history-card__crop">{p.crop}</div>
                  <span className={`result-badge ${p.is_healthy ? 'badge--healthy' : 'badge--disease'}`}>
                    {p.is_healthy ? 'Healthy' : 'Disease'}
                  </span>
                </div>
                <div className="history-card__confidence">
                  <div className="history-card__conf-value">
                    {p.confidence?.toFixed(1)}%
                  </div>
                  <div className="history-card__conf-label">Confidence</div>
                </div>
              </div>

              <div className="history-card__details">
                <div className="history-card__detail">
                  <span className="history-card__detail-label">Condition</span>
                  <span className="history-card__detail-value">{p.condition}</span>
                </div>
                {p.image_filename && (
                  <div className="history-card__detail">
                    <span className="history-card__detail-label">File</span>
                    <span className="history-card__detail-value history-card__filename">
                      {p.image_filename}
                    </span>
                  </div>
                )}
                <div className="history-card__detail">
                  <span className="history-card__detail-label">Date</span>
                  <span className="history-card__detail-value">
                    {p.created_at
                      ? new Date(p.created_at).toLocaleDateString('en-US', {
                          year: 'numeric', month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })
                      : '—'}
                  </span>
                </div>
              </div>

              <div className="confidence-bar__track" style={{ marginTop: 0 }}>
                <div
                  className={`confidence-bar__fill ${
                    p.confidence >= 90
                      ? 'confidence-bar__fill--high'
                      : 'confidence-bar__fill--medium'
                  }`}
                  style={{ width: `${p.confidence}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
