/* ═══════════════════════════════════════════════════
   API — Shared fetch helper
   ═══════════════════════════════════════════════════ */

const API_BASE = '/api/us-payroll';

async function apiFetch(url, opts = {}) {
  try {
    const res = await fetch(url, opts);
    const data = await res.json();
    if (!res.ok || data.success === false) {
      const msg = data.error || `HTTP ${res.status}`;
      window.Utils.showToast(msg, 'error');
      throw new Error(msg);
    }
    return data;
  } catch (err) {
    if (!err.message.includes('HTTP')) {
      window.Utils.showToast(err.message || 'Network error', 'error');
    }
    throw err;
  }
}

function apiGet(path) {
  return apiFetch(`${API_BASE}${path}`);
}

function apiPost(path, body) {
  return apiFetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

function apiPut(path, body) {
  return apiFetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

function apiDelete(path) {
  return apiFetch(`${API_BASE}${path}`, { method: 'DELETE' });
}

window.API = { BASE: API_BASE, fetch: apiFetch, get: apiGet, post: apiPost, put: apiPut, delete: apiDelete };
