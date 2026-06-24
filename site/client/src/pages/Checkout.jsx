import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import './Checkout.css';

const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID;

export default function Checkout() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null); // backend order record for this attempt
  const [method, setMethod] = useState('paypal'); // 'paypal' | 'receipt'
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptSubmitted, setReceiptSubmitted] = useState(false);

  // Already unlocked? nothing to buy.
  useEffect(() => {
    if (profile?.unlocked) navigate('/download', { replace: true });
  }, [profile, navigate]);

  // Create (or reuse) a pending order as soon as the page loads.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.createOrder({ product: 'ayanakoji_x_license', amount: 5 });
        if (!cancelled) setOrder(data.order);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleReceiptUpload(e) {
    e.preventDefault();
    if (!receiptFile || !order) return;
    setBusy(true);
    setError('');
    try {
      await api.uploadReceipt(order._id, receiptFile);
      setReceiptSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <p className="eyebrow">
        <span className="dot pending" />
        Checkout
      </p>
      <h1 className="page-title">
        Unlock <span>Ayanakoji_X</span>
      </h1>
      <p className="page-sub">One-time license &middot; $5 &middot; yours to keep, no subscription.</p>

      <div className="card checkout-card">
        <div className="method-tabs">
          <button
            className={`method-tab ${method === 'paypal' ? 'active' : ''}`}
            onClick={() => setMethod('paypal')}
          >
            PayPal
          </button>
          <button
            className={`method-tab ${method === 'receipt' ? 'active' : ''}`}
            onClick={() => setMethod('receipt')}
          >
            Upload receipt
          </button>
        </div>

        {error && <p className="checkout-error">{error}</p>}

        {method === 'paypal' && (
          <div className="paypal-pane">
            <p className="pane-desc">
              Pay securely with PayPal. Your access unlocks automatically the moment
              payment is confirmed.
            </p>
            {!PAYPAL_CLIENT_ID ? (
              <p className="checkout-error">
                PayPal isn't configured yet (missing VITE_PAYPAL_CLIENT_ID).
              </p>
            ) : !order ? (
              <div className="spinner" />
            ) : (
              <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, currency: 'USD' }}>
                <PayPalButtons
                  style={{ layout: 'vertical', color: 'blue', shape: 'rect', label: 'pay' }}
                  disabled={busy}
                  createOrder={async () => {
                    setError('');
                    const data = await api.createPaypalOrder(order._id);
                    return data.paypalOrderId;
                  }}
                  onApprove={async (data) => {
                    setBusy(true);
                    try {
                      await api.capturePaypalOrder(order._id, data.orderID);
                      await refreshProfile();
                      navigate('/download');
                    } catch (err) {
                      setError(err.message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                  onError={() => setError('PayPal could not complete the payment. Please try again.')}
                />
              </PayPalScriptProvider>
            )}
          </div>
        )}

        {method === 'receipt' && (
          <div className="receipt-pane">
            {receiptSubmitted ? (
              <div className="receipt-pending">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="1.6">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3.5 2" />
                </svg>
                <p className="pending-title">Receipt submitted</p>
                <p className="pane-desc">
                  We've received your receipt. An admin will review it shortly and
                  your account will unlock automatically once approved. Check your
                  account page for status.
                </p>
              </div>
            ) : (
              <form onSubmit={handleReceiptUpload}>
                <p className="pane-desc">
                  Pay via eZCash to the number below, then upload a screenshot or
                  photo of your receipt for manual review.
                </p>
                <div className="ezcash-box">
                  <span className="ezcash-label">eZCash number</span>
                  <span className="ezcash-number">077 355 7644</span>
                </div>
                <label className="file-drop">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                  />
                  {receiptFile ? receiptFile.name : 'Choose receipt image or PDF'}
                </label>
                <button type="submit" className="btn btn-primary" disabled={!receiptFile || busy || !order}>
                  {busy ? <span className="spinner" /> : 'Submit receipt for review'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
