import { auth } from './firebase';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

async function authHeader() {
  const user = auth.currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

async function request(path, { method = 'GET', body, isForm = false } = {}) {
  const headers = await authHeader();
  if (!isForm) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // no JSON body
  }

  if (!res.ok) {
    const message = data?.error || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export const api = {
  // Registers / fetches the current user's profile + unlock status.
  getMe: () => request('/api/users/me'),

  // Order lifecycle
  createOrder: (payload) => request('/api/orders', { method: 'POST', body: payload }),
  getMyOrders: () => request('/api/orders/mine'),

  // Manual receipt upload (eZCash / bank transfer etc.)
  uploadReceipt: (orderId, file) => {
    const form = new FormData();
    form.append('receipt', file);
    form.append('orderId', orderId);
    return request('/api/orders/receipt', { method: 'POST', body: form, isForm: true });
  },

  // PayPal
  createPaypalOrder: (orderId) =>
    request('/api/paypal/create-order', { method: 'POST', body: { orderId } }),
  capturePaypalOrder: (orderId, paypalOrderId) =>
    request('/api/paypal/capture-order', { method: 'POST', body: { orderId, paypalOrderId } }),

  // Download
  getDownloadLink: () => request('/api/downloads/bot'),

  // Admin (server also re-checks ADMIN_EMAILS on every call — this is not
  // the security boundary, just the UI for someone already allowed through)
  adminListOrders: (status) =>
    request(`/api/admin/orders?status=${encodeURIComponent(status)}`),
  adminApproveOrder: (orderId) =>
    request(`/api/admin/orders/${orderId}/approve`, { method: 'POST' }),
  adminRejectOrder: (orderId, reason) =>
    request(`/api/admin/orders/${orderId}/reject`, { method: 'POST', body: { reason } }),

  // Fetches an authenticated binary resource (e.g. a receipt image) and
  // returns a local blob URL, since <img src> can't carry an Authorization header.
  fetchAuthedBlobUrl: async (path) => {
    const headers = await authHeader();
    const res = await fetch(`${BASE_URL}${path}`, { headers });
    if (!res.ok) throw new Error(`Could not load file (${res.status})`);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },
};
