import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function getPasswordStrength(pw) {
  if (!pw) return null;
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 2) return 'weak';
  if (score <= 3) return 'medium';
  return 'strong';
}

const strengthLabels = { weak: 'Weak', medium: 'Medium', strong: 'Strong' };

export default function Signup() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [registeredName, setRegisteredName] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [dots, setDots] = useState('');

  const strength = getPasswordStrength(password);

  // Animated dots for redirect text
  useEffect(() => {
    if (!success) return;
    const timer = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(timer);
  }, [success]);

  // Auto-redirect after 2.5 seconds
  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => {
      navigate('/login', { state: { email: registeredEmail }, replace: true });
    }, 2500);
    return () => clearTimeout(timer);
  }, [success, registeredEmail, navigate]);

  const validate = () => {
    const errs = {};
    if (!name.trim()) errs.name = 'Name is required';
    if (!email.trim() || !email.includes('@')) errs.email = 'Valid email is required';
    if (password.length < 6) errs.password = 'Password must be at least 6 characters';
    if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Signup failed');
        return;
      }

      // Do NOT save token — redirect to login instead
      setRegisteredName(name.trim());
      setRegisteredEmail(email.trim());
      setSuccess(true);
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
          <div className="auth-card__subtitle">
            {success ? 'Welcome aboard!' : 'Create your account'}
          </div>
        </div>

        <div className="auth-card__body">
          {success ? (
            /* ─── Success state ─── */
            <div className="signup-success">
              <div className="signup-success__icon">✅</div>
              <div className="signup-success__title">Account Created Successfully!</div>
              <p className="signup-success__text">
                Welcome to AgroScan, {registeredName}! Your account has been created.
              </p>
              <div className="signup-success__redirect">
                Redirecting to login{dots}
              </div>
            </div>
          ) : (
            /* ─── Registration form ─── */
            <>
              {error && (
                <div className="alert alert--error">
                  <span>⚠️</span> {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label" htmlFor="signup-name">Full Name</label>
                  <input
                    id="signup-name"
                    className="form-input"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                  {fieldErrors.name && <div className="form-error">{fieldErrors.name}</div>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="signup-email">Email</label>
                  <input
                    id="signup-email"
                    className="form-input"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                  {fieldErrors.email && <div className="form-error">{fieldErrors.email}</div>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="signup-password">Password</label>
                  <input
                    id="signup-password"
                    className="form-input"
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  {fieldErrors.password && <div className="form-error">{fieldErrors.password}</div>}

                  {strength && (
                    <div className="password-strength">
                      <div className="password-strength__bar">
                        <div className={`password-strength__fill password-strength__fill--${strength}`}></div>
                      </div>
                      <div className={`password-strength__text password-strength__text--${strength}`}>
                        {strengthLabels[strength]}
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="signup-confirm">Confirm Password</label>
                  <input
                    id="signup-confirm"
                    className="form-input"
                    type="password"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  {fieldErrors.confirmPassword && <div className="form-error">{fieldErrors.confirmPassword}</div>}
                </div>

                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={loading}
                >
                  {loading ? (
                    <><span className="spinner spinner--sm"></span> Creating account…</>
                  ) : (
                    '🚀 Create Account'
                  )}
                </button>
              </form>

              <div className="auth-footer">
                Already have an account? <Link to="/login">Sign in</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
