import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import './Admin.css';

const STATUS_TABS = [
  { value: 'receipt_submitted', label: 'Pending review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

export default function Admin() {
  const [status, setStatus] = useState('receipt_submitted');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actioningId, setActioningId] = useState(null);
  const [toast, setToast] = useState(null);

  const load = useCallback(async (s) => {
    setLoading(true);
    setError('');
    try {
      const data = await api.adminListOrders(s);
      setOrders(data.orders);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(status);
  }, [status, load]);

  function showToast(message, kind = 'success') {
    setToast({ message, kind });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleApprove(orderId) {
    setActioningId(orderId);
    try {
      await api.adminApproveOrder(orderId);
      showToast('Order approved — user unlocked');
      setOrders((prev) => prev.filter((o) => o._id !== orderId));
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActioningId(null);
    }
  }

  async function handleReject(orderId) {
    const reason = window.prompt('Reason for rejecting this receipt (shown internally only):', 'Receipt could not be verified');
    if (reason === null) return; // cancelled
    setActioningId(orderId);
    try {
      await api.adminRejectOrder(orderId, reason);
      showToast('Order rejected');
      setOrders((prev) => prev.filter((o) => o._id !== orderId));
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActioningId(null);
    }
  }

  return (
    <div className="page admin-page">
      <p className="eyebrow">
        <span className="dot" />
        Admin
      </p>
      <h1 className="page-title">
        Receipt <span>Review</span>
      </h1>
      <p className="page-sub">Approve unlocks the user immediately. Rejections are recorded but don't notify the user automatically.</p>

      <div className="admin-tabs">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            className={`method-tab ${status === t.value ? 'active' : ''}`}
            onClick={() => setStatus(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="checkout-error admin-error">{error}</p>}

      {loading ? (
        <div className="spinner" style={{ marginTop: 40 }} />
      ) : orders.length === 0 ? (
        <p className="admin-empty">No orders in this category.</p>
      ) : (
        <div className="admin-list">
          {orders.map((order) => (
            <OrderRow
              key={order._id}
              order={order}
              status={status}
              busy={actioningId === order._id}
              onApprove={() => handleApprove(order._id)}
              onReject={() => handleReject(order._id)}
            />
          ))}
        </div>
      )}

      {toast && <div className={`toast ${toast.kind}`}>{toast.message}</div>}
    </div>
  );
}

function OrderRow({ order, status, busy, onApprove, onReject }) {
  const [imgUrl, setImgUrl] = useState(null);
  const [imgError, setImgError] = useState('');

  useEffect(() => {
    let revoke;
    (async () => {
      try {
        const url = await api.fetchAuthedBlobUrl(`/api/admin/orders/${order._id}/receipt`);
        setImgUrl(url);
        revoke = url;
      } catch (err) {
        setImgError(err.message);
      }
    })();
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [order._id]);

  const isPdf = order.receiptOriginalName?.toLowerCase().endsWith('.pdf');

  return (
    <div className="admin-row">
      <div className="admin-receipt-preview">
        {imgError ? (
          <span className="admin-preview-error">No receipt</span>
        ) : !imgUrl ? (
          <div className="spinner" />
        ) : isPdf ? (
          <a href={imgUrl} target="_blank" rel="noreferrer" className="admin-pdf-link">
            View PDF
          </a>
        ) : (
          <a href={imgUrl} target="_blank" rel="noreferrer">
            <img src={imgUrl} alt="Receipt" className="admin-receipt-img" />
          </a>
        )}
      </div>

      <div className="admin-row-details">
        <div className="admin-row-email">{order.user?.email || 'Unknown user'}</div>
        <div className="admin-row-meta">
          ${order.amount} &middot; {order.product} &middot;{' '}
          {new Date(order.createdAt).toLocaleString()}
        </div>
        {order.rejectionReason && status === 'rejected' && (
          <div className="admin-row-reason">Reason: {order.rejectionReason}</div>
        )}
        {order.reviewedBy && (
          <div className="admin-row-meta">Reviewed by {order.reviewedBy}</div>
        )}
      </div>

      {status === 'receipt_submitted' && (
        <div className="admin-row-actions">
          <button className="btn btn-primary" onClick={onApprove} disabled={busy}>
            {busy ? <span className="spinner" /> : 'Approve'}
          </button>
          <button className="btn btn-danger" onClick={onReject} disabled={busy}>
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
