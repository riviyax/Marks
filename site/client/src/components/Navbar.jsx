import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar({ onOpenLogin }) {
  const { firebaseUser, profile, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="nav">
      <Link to="/" className="nav-brand">
        Ayanakoji<span>_X</span>
      </Link>
      <nav className="nav-links">
        {firebaseUser ? (
          <>
            <Link to="/account" className="nav-link">
              Account
            </Link>
            {profile?.unlocked && (
              <Link to="/download" className="nav-link">
                Download
              </Link>
            )}
            {profile?.isAdmin && (
              <Link to="/admin" className="nav-link nav-link-admin">
                Admin
              </Link>
            )}
            <button
              className="nav-avatar-btn"
              onClick={() => navigate('/account')}
              title={firebaseUser.displayName}
            >
              {firebaseUser.photoURL ? (
                <img src={firebaseUser.photoURL} alt="" className="nav-avatar" />
              ) : (
                <span className="nav-avatar-fallback">
                  {firebaseUser.displayName?.[0]?.toUpperCase() || '?'}
                </span>
              )}
            </button>
            <button className="btn btn-ghost nav-logout" onClick={logout}>
              Sign out
            </button>
          </>
        ) : (
          <button className="btn btn-primary" onClick={onOpenLogin}>
            Sign in
          </button>
        )}
      </nav>
    </header>
  );
}
