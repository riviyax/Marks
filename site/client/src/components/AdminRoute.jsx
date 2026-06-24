import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminRoute({ children }) {
  const { firebaseUser, profile, isAuthLoading, profileLoading } = useAuth();

  if (isAuthLoading || profileLoading) {
    return (
      <div className="page" style={{ justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!firebaseUser) {
    return <Navigate to="/" replace />;
  }

  // This only hides the page from non-admins in the UI. Every admin API call
  // is independently re-checked against ADMIN_EMAILS server-side, so this
  // check is a convenience, not the security boundary.
  if (!profile?.isAdmin) {
    return <Navigate to="/account" replace />;
  }

  return children;
}
