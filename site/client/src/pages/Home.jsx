import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Home.css';

export default function Home({ onOpenLogin }) {
  const { firebaseUser, profile } = useAuth();
  const navigate = useNavigate();

  const phoneSectionRef = useRef(null);
  const reactionRef = useRef(null);
  const replyRef = useRef(null);
  const [revealed, setRevealed] = useState({});

  // Scroll-reveal for elements carrying data-reveal-id
  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal-id]');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setRevealed((prev) => ({ ...prev, [entry.target.dataset.revealId]: true }));
          }
        });
      },
      { threshold: 0.3 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Reaction + reply demo loop in section 3
  useEffect(() => {
    const section = phoneSectionRef.current;
    if (!section) return;
    let running = false;
    let timers = [];

    const clearTimers = () => {
      timers.forEach(clearTimeout);
      timers = [];
    };

    const loop = () => {
      if (!running) return;
      const reactionEl = reactionRef.current;
      const replyEl = replyRef.current;
      if (!reactionEl || !replyEl) return;

      reactionEl.classList.remove('show');
      replyEl.classList.remove('show');
      reactionEl.textContent = '';

      timers.push(
        setTimeout(() => {
          reactionEl.textContent = '\u23F3';
          reactionEl.classList.add('show');
        }, 500)
      );
      timers.push(
        setTimeout(() => {
          reactionEl.classList.remove('show');
          void reactionEl.offsetWidth;
          reactionEl.textContent = '\u2713';
          reactionEl.classList.add('show');
        }, 1700)
      );
      timers.push(
        setTimeout(() => {
          replyEl.classList.add('show');
        }, 2100)
      );
      timers.push(setTimeout(loop, 5200));
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !running) {
            running = true;
            loop();
          } else if (!entry.isIntersecting && running) {
            running = false;
            clearTimers();
          }
        });
      },
      { threshold: 0.5 }
    );
    observer.observe(section);
    return () => {
      observer.disconnect();
      clearTimers();
    };
  }, []);

  function handleCta() {
    if (!firebaseUser) {
      onOpenLogin();
      return;
    }
    navigate(profile?.unlocked ? '/download' : '/checkout');
  }

  const r = (id, extra = '') => `reveal ${revealed[id] ? 'in' : ''} ${extra}`.trim();

  return (
    <main className="home">
      {/* SECTION 1 — HERO */}
      <section id="s1">
        <p className={r('s1-eyebrow')} data-reveal-id="s1-eyebrow">
          <span className="dot" />
          Riviya_X Project
        </p>
        <h1 className={`hero-title ${r('s1-title', 'd1')}`} data-reveal-id="s1-title">
          Ayanakoji<span>_X</span>
        </h1>
        <p className={`hero-sub ${r('s1-sub', 'd2')}`} data-reveal-id="s1-sub">
          The marks database that <strong>texts your team for you.</strong> Weekly
          scores, group invites, and live status — all running quietly in the
          background.
        </p>

        <div className={`orb-wrap ${r('s1-orb', 'd3')}`} data-reveal-id="s1-orb">
          <svg className="radar-svg" viewBox="0 0 220 220" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="110" cy="110" r="104" stroke="rgba(0,229,255,0.10)" strokeWidth="1" />
            <circle cx="110" cy="110" r="82" stroke="rgba(0,229,255,0.07)" strokeWidth="1" />
            <circle cx="110" cy="110" r="60" stroke="rgba(0,229,255,0.07)" strokeWidth="1" />
            <path d="M110 110 L110 6 A104 104 0 0 1 200 160 Z" fill="url(#sweep)" opacity="0.55" />
            <defs>
              <radialGradient id="sweep" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#00E5FF" stopOpacity="0" />
              </radialGradient>
            </defs>
            <line x1="110" y1="6" x2="110" y2="214" stroke="rgba(0,229,255,0.08)" strokeWidth="1" />
            <line x1="6" y1="110" x2="214" y2="110" stroke="rgba(0,229,255,0.08)" strokeWidth="1" />
          </svg>
          <div className="orb">
            <div className="orb-dot" />
            <div className="orb-label">Online</div>
          </div>
        </div>

        <div className={`scroll-hint ${r('s1-hint', 'd4')}`} data-reveal-id="s1-hint">
          <span>SCROLL</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </section>

      {/* SECTION 2 — THE BRIDGE */}
      <section id="s2">
        <p className={r('s2-eyebrow')} data-reveal-id="s2-eyebrow">
          The problem
        </p>
        <h2 className={`bridge-title ${r('s2-title', 'd1')}`} data-reveal-id="s2-title">
          Marks live in a database.
          <br />
          Your team lives in <span className="accent">WhatsApp</span>.
        </h2>

        <div className={`bridge-flow ${r('s2-flow', 'd2')}`} data-reveal-id="s2-flow">
          <div className="flow-card">
            <svg className="flow-icon" viewBox="0 0 24 24" fill="none" stroke="#00E5FF" strokeWidth="1.6">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M3 9h18M9 4v16" />
            </svg>
            <span className="flow-label cyan-text">DATABASE</span>
          </div>
          <span className="flow-arrow">&#8594;</span>
          <div className="flow-card">
            <svg className="flow-icon" viewBox="0 0 24 24" fill="none" stroke="#7B9BB5" strokeWidth="1.6">
              <rect x="4" y="2" width="16" height="20" rx="3" />
              <circle cx="12" cy="18" r="0.6" fill="#7B9BB5" />
            </svg>
            <span className="flow-label">AYANAKOJI_X</span>
          </div>
          <span className="flow-arrow">&#8594;</span>
          <div className="flow-card">
            <svg className="flow-icon" viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth="1.6">
              <path d="M20 12a8 8 0 1 0-3.2 6.4L20 20l-1.4-3A8 8 0 0 0 20 12Z" />
            </svg>
            <span className="flow-label green-text">WHATSAPP</span>
          </div>
        </div>
      </section>

      {/* SECTION 3 — REACTION DEMO */}
      <section id="s3" ref={phoneSectionRef}>
        <p className={r('s3-eyebrow')} data-reveal-id="s3-eyebrow">
          The signature feature
        </p>
        <h2 className={`demo-title ${r('s3-title', 'd1')}`} data-reveal-id="s3-title">
          Every command, acknowledged instantly.
        </h2>
        <p className={`demo-sub ${r('s3-sub', 'd2')}`} data-reveal-id="s3-sub">
          No more wondering if the bot saw your message. A reaction lands the
          second a command is read — even if the reply itself takes a few
          seconds.
        </p>

        <div className={`phone ${r('s3-phone', 'd3')}`} data-reveal-id="s3-phone">
          <div className="phone-bar">
            <div className="phone-avatar">MMU</div>
            <div>
              <div className="phone-name">Marks Bot</div>
              <div className="phone-sub">online</div>
            </div>
          </div>

          <div className="bubble-row">
            <div className="bubble">
              .markslist
              <div className="bubble-reaction" ref={reactionRef} />
            </div>
          </div>

          <div className="reply-row">
            <div className="reply-bubble" ref={replyRef}>
              <strong>MMU Marks List</strong>
              <br />
              1. Rivith Abinidu — 17 marks
              <br />
              2. Suraj Kasun — 29 marks
              <br />
              &hellip;39 members total
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4 — DASHBOARD GLIMPSE */}
      <section id="s4">
        <p className={r('s4-eyebrow')} data-reveal-id="s4-eyebrow">
          The control room
        </p>
        <h2 className={`dash-title ${r('s4-title', 'd1')}`} data-reveal-id="s4-title">
          One dashboard. Every member.
        </h2>
        <p className={`dash-sub ${r('s4-sub', 'd2')}`} data-reveal-id="s4-sub">
          Search, sort, and message your whole team — or just one person —
          without opening WhatsApp at all.
        </p>

        <div className={`dash-card ${r('s4-card', 'd3')}`} data-reveal-id="s4-card">
          <div className="dash-bar">
            <div className="dash-dot close-dot" />
            <div className="dash-dot minimize-dot" />
            <div className="dash-dot expand-dot" />
          </div>
          <div className="dash-body">
            <div className="dash-row">
              <span className="dash-name">Rivith Abinidu — President</span>
              <span className="dash-action-group">
                <span className="dash-marks">17</span>
                <span className="dash-btn">Send</span>
              </span>
            </div>
            <div className="dash-row">
              <span className="dash-name">Suraj Kasun — Secretary</span>
              <span className="dash-action-group">
                <span className="dash-marks">29</span>
                <span className="dash-btn">Send</span>
              </span>
            </div>
            <div className="dash-row">
              <span className="dash-name">Not Selected — Vice President</span>
              <span className="dash-action-group">
                <span className="dash-marks">0</span>
                <span className="dash-btn disabled-btn">Send</span>
              </span>
            </div>
            <div className="dash-sendall">Send All (39)</div>
          </div>
        </div>
      </section>

      {/* SECTION 5 — CLOSER */}
      <section id="s5">
        <p className={r('s5-eyebrow')} data-reveal-id="s5-eyebrow">
          <span className="dot" />
          Available now
        </p>
        <h2 className={`closer-title ${r('s5-title', 'd1')}`} data-reveal-id="s5-title">
          Stop copy-pasting
          <br />
          marks by hand.
        </h2>
        <p className={`closer-sub ${r('s5-sub', 'd2')}`} data-reveal-id="s5-sub">
          Ayanakoji_X handles the messaging, the grouping, and the reminders —
          so you handle everything else.
        </p>

        <div className={`price-card ${r('s5-price', 'd3')}`} data-reveal-id="s5-price">
          <span className="price-label">One-time license</span>
          <span className="price-value">
            <sup>$</sup>5
          </span>
          <span className="price-note">Yours to keep &middot; no subscription</span>

          <div className="payment-methods">
            <span className="pay-method ezcash">eZCash</span>
            <span className="pay-method paypal">PayPal</span>
          </div>

          <button className="buy-button" onClick={handleCta}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 6, verticalAlign: -1 }}>
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            {firebaseUser ? (profile?.unlocked ? 'Go to download' : 'Unlock now') : 'Sign in to purchase'}
          </button>
        </div>

        <div className={`release-card ${r('s5-release', 'd3')}`} data-reveal-id="s5-release">
          <span className="release-tag">v1.0.0</span>
          <span className="release-text">
            Production Build &middot; <strong>Self-Hosted Engine</strong> &middot;
            Automated Cron Included
          </span>
        </div>

        <p className={`footer-credit ${r('s5-credit', 'd4')}`} data-reveal-id="s5-credit">
          Built by <span>Riviya_X</span> &middot; Marks System
        </p>
      </section>
    </main>
  );
}
