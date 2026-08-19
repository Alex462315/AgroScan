import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successBanner, setSuccessBanner] = useState(false);

  // Pre-fill email and show banner if coming from signup
  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
      setSuccessBanner(true);
      // Clear the state so back-button doesn't re-show banner
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  // Auto-dismiss success banner after 4 seconds
  useEffect(() => {
    if (!successBanner) return;
    const timer = setTimeout(() => setSuccessBanner(false), 4000);
    return () => clearTimeout(timer);
  }, [successBanner]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      login(data.token, data.user);
      navigate('/home', { replace: true });
    } catch {
      setError('Network error — please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__header">
          <div className="auth-card__logo-icon">🌿</div>
          <div className="auth-card__logo-text">AgroScan</div>
          <div className="auth-card__subtitle">Sign in to your account</div>
        </div>

        <div className="auth-card__body">
          {successBanner && (
            <div className="alert alert--success">
              <span>✓</span> Account created! Please sign in to continue.
            </div>
          )}

          {error && (
            <div className="alert alert--error">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">Email</label>
              <input
                id="login-email"
                className="form-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-password">Password</label>
              <input
                id="login-password"
                className="form-input"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn--primary"
              disabled={loading}
            >
              {loading ? (
                <><span className="spinner spinner--sm"></span> Signing in…</>
              ) : (
                '🔑 Sign In'
              )}
            </button>
          </form>

          <div className="auth-footer">
            Don't have an account? <Link to="/signup">Create one</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
