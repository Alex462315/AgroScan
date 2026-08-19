import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null; // AuthContext handles the loading screen

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
