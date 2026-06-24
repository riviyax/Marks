import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Account.css';

export default function Account() {
  const { firebaseUser, profile, profileLoading } = useAuth();

  const unlocked = profile?.unlocked;

  return (
    <div className="page">
      <p className="eyebrow">
        <span className={`dot ${unlocked ? '' : 'locked'}`} />
        {unlocked ? 'Access granted' : 'Access locked'}
      </p>
      <h1 className="page-title">
        Your <span>Account</span>
      </h1>
      <p className="page-sub">
        Signed in as {firebaseUser?.email}
      </p>

      <div className="card account-card">
        <div className="account-row">
          {firebaseUser?.photoURL ? (
            <img src={firebaseUser.photoURL} alt="" className="account-avatar" />
          ) : (
            <div className="account-avatar-fallback">
              {firebaseUser?.displayName?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          <div>
            <div className="account-name">{firebaseUser?.displayName}</div>
            <div className="account-email">{firebaseUser?.email}</div>
          </div>
        </div>

        <div className="lock-panel">
          {profileLoading ? (
            <div className="spinner" />
          ) : unlocked ? (
            <>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.6">
                <rect x="4" y="11" width="16" height="9" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
              <p className="lock-status unlocked">Ayanakoji Marks System — Unlocked</p>
              <p className="lock-desc">
                Your license is active. Head to the download page to get your files.
              </p>
              <Link to="/download" className="btn btn-primary">
                Go to download
              </Link>
            </>
          ) : (
            <>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="1.6">
                <rect x="4" y="11" width="16" height="9" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v3" />
              </svg>
              <p className="lock-status locked">Ayanakoji Marks System is locked</p>
              <p className="lock-desc">
                Purchase a one-time license to unlock the marks system and download
                your files.
              </p>
              <Link to="/checkout" className="btn btn-primary">
                Unlock for $5
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
