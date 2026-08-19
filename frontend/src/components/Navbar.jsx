import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <nav className="navbar">
      <Link to="/home" className="navbar__brand">
        <span className="navbar__brand-icon">🌿</span>
        AgroScan
      </Link>

      <div className="navbar__right">
        {isAdmin && (
          <Link to="/admin" className="navbar__admin-pill">
            Admin
          </Link>
        )}

        <div className="user-menu" ref={menuRef}>
          <button
            className="user-menu__trigger"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <div className="user-menu__avatar">{initials}</div>
            <span>{user?.name?.split(' ')[0]}</span>
            <span style={{ fontSize: '0.65rem' }}>▼</span>
          </button>

          <div className={`user-menu__dropdown ${menuOpen ? 'open' : ''}`}>
            <div className="user-menu__info">
              <div className="user-menu__name">{user?.name}</div>
              <div className="user-menu__email">{user?.email}</div>
            </div>
            {isAdmin && (
              <button
                className="user-menu__item"
                onClick={() => { setMenuOpen(false); navigate('/admin'); }}
              >
                📊 Admin Panel
              </button>
            )}
            <button
              className="user-menu__item"
              onClick={() => { setMenuOpen(false); navigate('/history'); }}
            >
              📋 Scan History
            </button>
            <button
              className="user-menu__item user-menu__item--danger"
              onClick={handleLogout}
            >
              🚪 Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
