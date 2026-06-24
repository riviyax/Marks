import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { firebaseUser, isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return (
      <div className="page" style={{ justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!firebaseUser) {
    return <Navigate to="/" replace />;
  }

  return children;
}
