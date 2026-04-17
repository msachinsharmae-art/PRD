/* ═══════════════════════════════════════════════════
   UTILS — Shared helpers
   ═══════════════════════════════════════════════════ */

/** Format as USD currency */
function fmt(n) {
  if (n == null || isNaN(n)) return '$0.00';
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Format date string to short format */
function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Escape HTML */
function esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = String(s);
  return d.innerHTML;
}

/** Shortcut for getElementById */
function $(id) { return document.getElementById(id); }

/** Show a toast notification */
function showToast(msg, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; }, 2500);
  setTimeout(() => t.remove(), 2800);
}

/** Build a detail-row label/value pair */
function dl(label, value, isTotal) {
  const v = (value != null && value !== 0) ? fmt(value) : '$0.00';
  return `<div class="dl-row${isTotal ? ' dl-total' : ''}"><span class="dl-label">${esc(label)}</span><span class="dl-value">${v}</span></div>`;
}

/** Debounce */
function debounce(fn, ms = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// Export to global
window.Utils = { fmt, fmtDate, esc, $, showToast, dl, debounce };
