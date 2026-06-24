import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import './Download.css';

export default function Download() {
  const { profile, profileLoading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (profileLoading) {
    return (
      <div className="page" style={{ justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!profile?.unlocked) {
    return <Navigate to="/account" replace />;
  }

  async function handleDownload() {
    setBusy(true);
    setError('');
    try {
      const data = await api.getDownloadLink();
      // Backend returns a short-lived, single-use signed URL.
      window.location.href = data.url;
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <p className="eyebrow">
        <span className="dot" />
        Unlocked
      </p>
      <h1 className="page-title">
        Download <span>Ayanakoji_X</span>
      </h1>
      <p className="page-sub">
        Your license is active. Grab the bot package below — the link expires
        shortly after it's issued, so re-open this page if it lapses.
      </p>

      <div className="card download-card">
        <div className="download-file-row">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
          </svg>
          <div>
            <div className="download-file-name">ayanakoji-x-bot.zip</div>
            <div className="download-file-meta">Production build &middot; v1.0.0</div>
          </div>
        </div>

        {error && <p className="checkout-error">{error}</p>}

        <button className="btn btn-primary download-btn" onClick={handleDownload} disabled={busy}>
          {busy ? <span className="spinner" /> : 'Download bot package'}
        </button>

        <p className="download-note">
          Setup instructions are included in the zip's README.
        </p>
      </div>
    </div>
  );
}
