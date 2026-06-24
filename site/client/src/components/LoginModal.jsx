import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './LoginModal.css';

export default function LoginModal({ open, onClose }) {
  const { login, authError, isAuthLoading } = useAuth();

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Sign in">
      <div className="modal-card">
        <button className="modal-close" onClick={onClose} aria-label="Close">
          &times;
        </button>

        <p className="eyebrow" style={{ justifyContent: 'center' }}>
          <span className="dot" />
          Sign in to continue
        </p>
        <h2 className="modal-title">Ayanakoji<span>_X</span></h2>
        <p className="modal-sub">
          One account. Used to track your purchase and unlock your download.
        </p>

        <button className="google-btn" onClick={login} disabled={isAuthLoading}>
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9A8.7 8.7 0 0 0 17.64 9.2Z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.55-1.84.87-3.06.87-2.35 0-4.34-1.58-5.05-3.71H.96v2.33A9 9 0 0 0 9 18Z"
            />
            <path
              fill="#FBBC05"
              d="M3.95 10.72A5.4 5.4 0 0 1 3.66 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l2.99-2.33Z"
            />
            <path
              fill="#EA4335"
              d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l2.99 2.33C4.66 5.16 6.65 3.58 9 3.58Z"
            />
          </svg>
          Continue with Google
        </button>

        {authError && <p className="modal-error">{authError}</p>}

        <p className="modal-fine">
          We only request your name, email, and profile photo. No other sign-in
          methods are available.
        </p>
      </div>
    </div>
  );
}
