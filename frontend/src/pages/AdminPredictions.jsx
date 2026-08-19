import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AdminPredictions() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/predictions', {
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

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner"></div></div>;

  return (
    <div>
      <h2 className="admin-page-title">Predictions ({predictions.length})</h2>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Crop</th>
              <th>Condition</th>
              <th>Confidence</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {predictions.map((p) => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.user_name || p.user_email || `#${p.user_id}`}</td>
                <td>{p.crop}</td>
                <td>{p.condition}</td>
                <td>{p.confidence?.toFixed(1)}%</td>
                <td>
                  <span className={`result-badge ${p.is_healthy ? 'badge--healthy' : 'badge--disease'}`}>
                    {p.is_healthy ? 'Healthy' : 'Disease'}
                  </span>
                </td>
                <td>{p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
            {predictions.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: '#6b7280' }}>No predictions yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
