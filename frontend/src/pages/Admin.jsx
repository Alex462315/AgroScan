import { useState } from 'react';
import { Link, Outlet, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Admin() {
  const { isAdmin } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!isAdmin) return <Navigate to="/home" replace />;

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="admin-layout">
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="admin-sidebar__title">Admin Panel</div>

        <Link
          to="/admin"
          className={`admin-sidebar__link ${location.pathname === '/admin' ? 'admin-sidebar__link--active' : ''}`}
          onClick={() => setSidebarOpen(false)}
        >
          📊 Dashboard
        </Link>
        <Link
          to="/admin/users"
          className={`admin-sidebar__link ${isActive('/admin/users') ? 'admin-sidebar__link--active' : ''}`}
          onClick={() => setSidebarOpen(false)}
        >
          👥 Users
        </Link>
        <Link
          to="/admin/predictions"
          className={`admin-sidebar__link ${isActive('/admin/predictions') ? 'admin-sidebar__link--active' : ''}`}
          onClick={() => setSidebarOpen(false)}
        >
          🔬 Predictions
        </Link>

        <div className="admin-sidebar__back">
          <Link
            to="/home"
            className="admin-sidebar__link"
            onClick={() => setSidebarOpen(false)}
          >
            ← Back to App
          </Link>
        </div>
      </aside>

      <main className="admin-content">
        <Outlet />
      </main>

      <button
        className="admin-hamburger"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? '✕' : '☰'}
      </button>
    </div>
  );
}
