import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 401) { logout(); navigate('/login', { replace: true }); return; }
        return res.json();
      })
      .then((data) => { if (data) setStats(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner"></div></div>;

  return (
    <div>
      <h2 className="admin-page-title">Dashboard</h2>

      <div className="admin-stats">
        <div className="admin-stat-card">
          <div className="admin-stat-card__label">Total Users</div>
          <div className="admin-stat-card__value">{stats?.total_users ?? 0}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-card__label">Total Predictions</div>
          <div className="admin-stat-card__value">{stats?.total_predictions ?? 0}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-card__label">Healthy Scans</div>
          <div className="admin-stat-card__value" style={{ color: '#16a34a' }}>{stats?.healthy_count ?? 0}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-card__label">Disease Detected</div>
          <div className="admin-stat-card__value" style={{ color: '#d97706' }}>{stats?.disease_count ?? 0}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-card__label">Last 7 Days</div>
          <div className="admin-stat-card__value">{stats?.recent_predictions ?? 0}</div>
        </div>
      </div>
    </div>
  );
}
