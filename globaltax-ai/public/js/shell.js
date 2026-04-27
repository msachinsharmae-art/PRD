// shell.js — global app layout injection.
// Runs on every page. Removes legacy <nav>/voiceFab, injects:
//   · Left sidebar with grouped navigation
//   · Top bar with search, country switcher, role, voice, profile
//   · Persistent right-side voice drawer (works on any page)
// State (country, role) syncs to localStorage so the rest of the app picks it up.

const NAV = [
  {
    section: "Overview",
    items: [
      { icon: "home", label: "Home",       href: "/" },
      { icon: "layout", label: "Dashboard", href: "/dashboard" },
      { icon: "calendar", label: "Compliance Calendar", href: "/calendar" }
    ]
  },
  {
    section: "Calculate",
    items: [
      { icon: "calculator", label: "Calculators Hub", href: "/calculators" },
      { icon: "calculator", label: "Income Tax",     href: "/calculator" },
      { icon: "gavel",      label: "Labour Code",    href: "/labour-code" },
      { icon: "gift",       label: "Perquisites",    href: "/perquisites" }
    ]
  },
  {
    section: "Configure",
    items: [
      { icon: "settings", label: "Statutory Rules", href: "/configure" }
    ]
  },
  {
    section: "Knowledge",
    items: [
      { icon: "book",  label: "Compliance Guide", href: "/compliance" },
      { icon: "bell",  label: "Latest Updates",   href: "/updates" }
    ]
  },
  {
    section: "Company",
    items: [
      { icon: "info",    label: "About",   href: "/about" },
      { icon: "message", label: "Contact", href: "/contact" }
    ]
  }
];

// Brand logo — clean blue/white inline SVG
const LOGO_SVG = `<svg viewBox="0 0 40 40" width="28" height="28" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="4" fill="#2563EB"/><path d="M20 10 L26 22 L20 19 L14 22 Z" fill="#FFFFFF"/><circle cx="20" cy="26" r="2" fill="#FFFFFF"/><path d="M10 30 L30 30" stroke="#93B4F5" stroke-width="2" stroke-linecap="round"/></svg>`;

const COUNTRIES = [
  { code: "IN", label: "🇮🇳 India",          currency: "INR" },
  { code: "US", label: "🇺🇸 United States",   currency: "USD" },
  { code: "AE", label: "🇦🇪 UAE",            currency: "AED" },
  { code: "SA", label: "🇸🇦 Saudi Arabia",    currency: "SAR" },
  { code: "EG", label: "🇪🇬 Egypt",          currency: "EGP" }
];

// Minimal inline SVG icon set (stroke only — inherits currentColor)
const ICONS = {
  home: `<path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1v-9.5z" fill="none" stroke="currentColor"/>`,
  layout: `<rect x="3" y="3" width="7" height="9" rx="1" fill="none" stroke="currentColor"/><rect x="14" y="3" width="7" height="5" rx="1" fill="none" stroke="currentColor"/><rect x="14" y="12" width="7" height="9" rx="1" fill="none" stroke="currentColor"/><rect x="3" y="16" width="7" height="5" rx="1" fill="none" stroke="currentColor"/>`,
  calendar: `<rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor"/><path d="M3 9h18M8 3v4M16 3v4" fill="none" stroke="currentColor"/>`,
  calculator: `<rect x="5" y="3" width="14" height="18" rx="2" fill="none" stroke="currentColor"/><rect x="8" y="6" width="8" height="3" rx="0.5" fill="none" stroke="currentColor"/><circle cx="9" cy="13" r="0.8" fill="currentColor"/><circle cx="12" cy="13" r="0.8" fill="currentColor"/><circle cx="15" cy="13" r="0.8" fill="currentColor"/><circle cx="9" cy="17" r="0.8" fill="currentColor"/><circle cx="12" cy="17" r="0.8" fill="currentColor"/><circle cx="15" cy="17" r="0.8" fill="currentColor"/>`,
  gavel: `<path d="M13 5l6 6M11 7l6 6-4 4-6-6 4-4zM3 21l5-5M8 16l3 3" fill="none" stroke="currentColor"/>`,
  gift: `<rect x="3" y="8" width="18" height="5" rx="1" fill="none" stroke="currentColor"/><path d="M4 13v7a1 1 0 001 1h14a1 1 0 001-1v-7M12 8v13M8 8c-1.5-1.5-1.5-4 0-5s3 .5 4 2c1-1.5 2.5-3 4-2s1.5 3.5 0 5" fill="none" stroke="currentColor"/>`,
  globe: `<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" fill="none" stroke="currentColor"/>`,
  upload: `<path d="M12 15V3M7 8l5-5 5 5M4 17v3a1 1 0 001 1h14a1 1 0 001-1v-3" fill="none" stroke="currentColor"/>`,
  message: `<path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8A8.5 8.5 0 018.7 3.9a8.38 8.38 0 013.8-.9h.5A8.48 8.48 0 0121 11v.5z" fill="none" stroke="currentColor"/>`,
  info: `<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor"/><path d="M12 8v.01M11 12h1v5h1" fill="none" stroke="currentColor"/>`,
  book: `<path d="M4 19.5A2.5 2.5 0 016.5 17H20V3H6.5A2.5 2.5 0 004 5.5v14zM4 19.5V21h16" fill="none" stroke="currentColor"/>`,
  bell: `<path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" fill="none" stroke="currentColor"/>`,
  search: `<circle cx="11" cy="11" r="7" fill="none" stroke="currentColor"/><path d="M21 21l-4.3-4.3" fill="none" stroke="currentColor"/>`,
  mic: `<rect x="9" y="2" width="6" height="12" rx="3" fill="none" stroke="currentColor"/><path d="M5 10a7 7 0 0014 0M12 17v5M8 22h8" fill="none" stroke="currentColor"/>`,
  close: `<path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor"/>`,
  menu: `<path d="M3 6h18M3 12h18M3 18h18" fill="none" stroke="currentColor"/>`,
  settings: `<circle cx="12" cy="12" r="3" fill="none" stroke="currentColor"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" fill="none" stroke="currentColor"/>`
};

const icon = (name) => `<span class="ico"><svg viewBox="0 0 24 24">${ICONS[name] || ""}</svg></span>`;

// ─── State ──────────────────────────────────────────────────────────
// Default country is whatever the user last picked — otherwise rotate round-robin so
// first-time users don't assume the product is India-only.
function defaultCountry() {
  const stored = localStorage.getItem("gt_country");
  if (stored) return stored;
  // Lightweight: use browser locale to bias; fall back to IN
  const lang = (navigator.language || "").toLowerCase();
  if (lang.startsWith("en-us")) return "US";
  if (lang.includes("-ae"))     return "AE";
  if (lang.includes("-sa"))     return "SA";
  if (lang.includes("-eg") || lang === "ar-eg") return "EG";
  return "IN";
}
const state = {
  country: defaultCountry(),
  conversation: []   // per-session AI chat
};

// Clear any legacy role state — role-based view filtering has been removed
try { localStorage.removeItem("gt_role"); } catch {}

// ─── Auth + activity tracking (client-side, encrypted at rest) ──────
// Storage is AES-GCM-256 enveloped before being written to localStorage.
// Honest caveat: the AES key is delivered with this script, so anyone who
// can run the page in a browser can decrypt their own localStorage. The
// encryption protects against casual exposure (DevTools screenshots, raw
// storage exports, extensions reading other origins' data) — it is NOT a
// substitute for a server-side auth backend. See SECURITY.md.
//
// Passwords are hashed with PBKDF2-SHA256 (200,000 iters, 16-byte salt).
// Legacy SHA-256 hashes from older releases are detected at login and
// transparently upgraded.
const AUTH_KEYS = { users: "gt_users", session: "gt_session", activity: "gt_activity_log" };
const OWNER_EMAIL = "msachinsharmae@gmail.com";
const ADMIN_EMAILS = [OWNER_EMAIL];
const PBKDF2_ITERS = 200000;

// 32 bytes for AES-256-GCM. Not a secret in the cryptographic sense — see caveat above.
const ENC_KEY_HEX = "8f3a91b22c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f90a1b2c3d4e5f60718293a4b";

let _aesKey = null;
async function _getAesKey() {
  if (_aesKey) return _aesKey;
  const raw = new Uint8Array(ENC_KEY_HEX.match(/.{2}/g).map(h => parseInt(h, 16)));
  _aesKey = await crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
  return _aesKey;
}
function _b64(bytes) { let s = ""; for (const b of bytes) s += String.fromCharCode(b); return btoa(s); }
function _fromB64(s) { return new Uint8Array(atob(s).split("").map(c => c.charCodeAt(0))); }

async function encryptJSON(value) {
  const key = await _getAesKey();
  const iv  = crypto.getRandomValues(new Uint8Array(12));
  const ct  = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(value)));
  return JSON.stringify({ v: 1, iv: _b64(iv), ct: _b64(new Uint8Array(ct)) });
}
async function decryptJSON(raw) {
  if (!raw) return null;
  let parsed;
  try { parsed = JSON.parse(raw); } catch { return null; }
  if (parsed && typeof parsed === "object" && parsed.v === 1 && parsed.iv && parsed.ct) {
    try {
      const key = await _getAesKey();
      const pt  = await crypto.subtle.decrypt({ name: "AES-GCM", iv: _fromB64(parsed.iv) }, key, _fromB64(parsed.ct));
      return JSON.parse(new TextDecoder().decode(pt));
    } catch { return null; } // tampered or wrong key
  }
  // Legacy plain JSON from pre-encryption builds — return as-is, will be
  // re-saved as ciphertext on the next write.
  return parsed;
}

// In-memory caches keep the rest of the app's sync read paths working.
let _usersCache = [], _sessionCache = null, _activityCache = [];

async function _loadAll() {
  const u = await decryptJSON(localStorage.getItem(AUTH_KEYS.users));
  const s = await decryptJSON(localStorage.getItem(AUTH_KEYS.session));
  const a = await decryptJSON(localStorage.getItem(AUTH_KEYS.activity));
  _usersCache    = Array.isArray(u) ? u : [];
  _sessionCache  = (s && typeof s === "object") ? s : null;
  _activityCache = Array.isArray(a) ? a : [];

  if (_sessionCache && _sessionCache.role === 'admin') {
    try {
      const res = await fetch('/api/auth/users');
      if (res.ok) {
        _usersCache = await res.json();
      }
    } catch(e) {}
  }
}

function getUsers()    { return _usersCache; }
function getSession()  { return _sessionCache; }
function getActivity() { return _activityCache; }

async function saveUsers(u) {
  _usersCache = u;
  localStorage.setItem(AUTH_KEYS.users, await encryptJSON(u));
}
async function saveSession(s) {
  _sessionCache = s;
  if (s == null) localStorage.removeItem(AUTH_KEYS.session);
  else           localStorage.setItem(AUTH_KEYS.session, await encryptJSON(s));
}
async function saveActivity(a) {
  const trimmed = a.slice(-2000);
  _activityCache = trimmed;
  localStorage.setItem(AUTH_KEYS.activity, await encryptJSON(trimmed));
}

// ─── Password hashing (PBKDF2 + legacy migration) ───────────────────
async function _pbkdf2(pwd, saltHex, iters) {
  const saltBytes = new Uint8Array(saltHex.match(/.{2}/g).map(h => parseInt(h, 16)));
  const baseKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(pwd), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBytes, iterations: iters, hash: "SHA-256" }, baseKey, 256
  );
  return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, "0")).join("");
}
async function hashPassword(pwd) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, "0")).join("");
  const hashHex = await _pbkdf2(pwd, saltHex, PBKDF2_ITERS);
  return `pbkdf2$${PBKDF2_ITERS}$${saltHex}$${hashHex}`;
}
function _safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
// Returns "ok" | "legacy" | false. "legacy" = caller should re-hash and persist.
async function verifyPassword(pwd, stored) {
  if (!stored) return false;
  if (stored.startsWith("pbkdf2$")) {
    const [, itersStr, saltHex, hashHex] = stored.split("$");
    const candidate = await _pbkdf2(pwd, saltHex, +itersStr);
    return _safeEqual(candidate, hashHex) ? "ok" : false;
  }
  if (/^[a-f0-9]{64}$/.test(stored)) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pwd));
    const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
    return _safeEqual(hex, stored) ? "legacy" : false;
  }
  if (stored.startsWith("plain:")) return stored === ("plain:" + pwd) ? "legacy" : false;
  return false;
}

async function logActivity(type, detail) {
  const session = _sessionCache;
  const list = _activityCache.slice();
  list.push({
    ts: new Date().toISOString(),
    userId: session?.userId || null,
    email:  session?.email  || null,
    name:   session?.name   || null,
    type,
    page:   location.pathname,
    detail: detail || null,
    ua:     navigator.userAgent.slice(0, 140)
  });
  await saveActivity(list);
}

// Boot promise — pages call await GTAuth.ready() before reading caches.
const _ready = (async () => {
  try { await _loadAll(); } catch { /* corrupt or unreadable storage — start empty */ }
})();

window.GTAuth = {
  AUTH_KEYS, ADMIN_EMAILS,
  ready: () => _ready,
  getUsers, getSession, getActivity,
  saveUsers, saveSession, saveActivity,
  hashPassword, verifyPassword, logActivity,
  isAdmin: (s) => !!s && (s.email || "").toLowerCase() === OWNER_EMAIL
};

const PUBLIC_PATHS = new Set([
  "/login", "/signup", "/forgot-password",
  "/login.html", "/signup.html", "/forgot-password.html"
]);
(async function authGate() {
  await _ready;
  const path = location.pathname.replace(/\/+$/, "") || "/";
  const isPublic = PUBLIC_PATHS.has(path);
  if (!_sessionCache && !isPublic) {
    const next = encodeURIComponent(location.pathname + location.search);
    location.replace("/login?next=" + next);
  }
})();

window.addEventListener("load", async () => {
  await _ready;
  if (_sessionCache) logActivity("page_view");
});

// ─── Setup ──────────────────────────────────────────────────────────
function init() {
  // Auth pages render their own minimal layout — skip the app chrome.
  if (document.body?.classList.contains("auth-page")) return;

  // Remove legacy nav and voice UI
  document.querySelectorAll("nav.nav, #voiceFab, #voicePanel").forEach(el => el.remove());

  // If body is empty or already wrapped, skip.
  if (document.querySelector(".sidebar")) return;

  // Inject favicon link if not present
  if (!document.querySelector('link[rel="icon"]')) {
    const link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/svg+xml";
    link.href = "/favicon.svg";
    document.head.appendChild(link);
  }

  const body = document.body;
  // Move existing body children into <main class="app-main">
  const main = document.createElement("main");
  main.className = "app-main";
  while (body.firstChild) main.appendChild(body.firstChild);

  body.appendChild(buildSidebar());
  body.appendChild(buildTopbar());
  // Append a global site footer at the end of the main content area
  main.appendChild(buildSiteFooter());
  body.appendChild(main);
  body.appendChild(buildVoiceDrawer());

  // Mobile backdrop (shown when sidebar is open on narrow screens)
  const backdrop = document.createElement("div");
  backdrop.className = "sidebar-backdrop";
  backdrop.id = "gt-backdrop";
  body.appendChild(backdrop);

  wireHandlers();
}

function buildSiteFooter() {
  const el = document.createElement("footer");
  el.className = "site-footer";
  const session = (() => { try { return JSON.parse(localStorage.getItem("gt_session") || "null"); } catch { return null; } })();
  const year = new Date().getFullYear();
  el.innerHTML = `
    <div class="site-footer-inner">
      <div class="sf-credit">
        © ${year} <b>SMVPS Pvt Ltd</b> · Multi Country Payroll, Taxation and Compliance
      </div>
      <div class="sf-actions">
        ${session ? `
          <span class="sf-user">Signed in as <b>${escape(session.name || session.email)}</b></span>
          ${window.GTAuth?.isAdmin(session) ? `<a class="sf-link" href="/admin">Admin</a>` : ""}
          <a class="sf-link" id="sf-logout" href="#">Sign out</a>
        ` : `
          <a class="sf-link" href="/login">Sign in</a>
          <a class="sf-link" href="/signup">Create account</a>
        `}
      </div>
    </div>
  `;
  // Wire logout (event listener; safer than inline onclick)
  setTimeout(() => {
    const lo = document.getElementById("sf-logout");
    if (lo) lo.addEventListener("click", (e) => {
      e.preventDefault();
      logActivity("logout");
      try { localStorage.removeItem("gt_session"); } catch {}
      location.href = "/login";
    });
  }, 0);
  return el;
}

function buildSidebar() {
  const el = document.createElement("aside");
  el.className = "sidebar";
  // Build a per-render NAV that adds an Admin section for admin users
  const session = getSession();
  const navGroups = window.GTAuth?.isAdmin(session)
    ? [...NAV, { section: "Admin", items: [{ icon: "settings", label: "Admin Console", href: "/admin" }] }]
    : NAV;
  el.innerHTML = `
    <a href="/" class="sidebar-brand" style="text-decoration:none;color:inherit">
      ${LOGO_SVG}
      <div>GlobalTax<span style="color:#2563EB">.</span>AI</div>
    </a>
    ${navGroups.map(group => `
      <div class="sidebar-section">${group.section}</div>
      ${group.items.map(it => `
        <a class="sidebar-link ${isActive(it.href) ? "active" : ""}" href="${it.href}">
          ${icon(it.icon)}<span>${it.label}</span>
        </a>
      `).join("")}
    `).join("")}
    <div class="sidebar-spacer"></div>
    <div class="sidebar-footer">
      <span class="sidebar-badge">Multi-country payroll engine</span>
      <div style="margin-top:8px;line-height:1.4">Deterministic rule engines · AI for narration only</div>
    </div>
  `;
  return el;
}

function buildTopbar() {
  const el = document.createElement("header");
  el.className = "topbar";
  el.innerHTML = `
    <button class="topbar-menu-btn" id="gt-menu" title="Menu">${svg(ICONS.menu)}</button>
    <div class="topbar-search">
      <span class="ico">${svg(ICONS.search)}</span>
      <input id="gt-search" placeholder="Search pages, countries, rules…" />
    </div>
    <div class="topbar-spacer"></div>
    <label class="topbar-tool" title="Country">
      ${svg(ICONS.globe)}
      <select id="gt-country">
        ${COUNTRIES.map(c => `<option value="${c.code}" ${c.code === state.country ? "selected" : ""}>${c.label}</option>`).join("")}
      </select>
    </label>
    <button class="topbar-tool accent" id="gt-voice-btn" title="Ask the AI (works from any page)">
      ${svg(ICONS.mic)}<span>Ask AI</span>
    </button>
    <div class="topbar-profile">
      <span class="avatar">SS</span>
      <div>
        <div class="name">Sachin</div>
        <div class="role">Admin</div>
      </div>
    </div>
  `;
  return el;
}

function buildVoiceDrawer() {
  const el = document.createElement("aside");
  el.className = "voice-drawer";
  el.id = "gt-voice-drawer";
  el.innerHTML = `
    <div class="voice-drawer-head">
      <div>
        <h3>AI Compliance Assistant</h3>
        <div class="muted">Cross-platform · deterministic answers when possible</div>
      </div>
      <button class="topbar-tool" id="gt-voice-close" style="padding:0;min-width:32px;height:32px">${svg(ICONS.close)}</button>
    </div>
    <div class="voice-drawer-body" id="gt-voice-body">
      <div class="voice-empty">
        Ask about payroll, tax, compliance calendar, or labour-code changes.<br>
        <div class="voice-examples">
          <button class="chip" data-q="What changed in FY 2026-27 perquisite rules?">Perquisite changes FY26-27</button>
          <button class="chip" data-q="Compare KSA GOSI Saudi vs expat">KSA GOSI split</button>
          <button class="chip" data-q="Show my Q1 PF trend">Q1 PF trend</button>
          <button class="chip" data-q="Upcoming filings next 30 days">Filings next 30 days</button>
        </div>
      </div>
    </div>
    <div class="voice-drawer-foot">
      <form class="voice-drawer-input" id="gt-voice-form">
        <input id="gt-voice-input" placeholder="Ask anything…" autocomplete="off" />
        <button class="btn" type="submit">Send</button>
        <button class="btn secondary" type="button" id="gt-voice-mic" title="Voice input">${svg(ICONS.mic)}</button>
      </form>
    </div>
  `;
  return el;
}

function svg(path) { return `<svg viewBox="0 0 24 24" style="width:16px;height:16px" stroke="currentColor" stroke-width="1.75" fill="none">${path}</svg>`; }

function isActive(href) {
  const here = location.pathname;
  if (href === "/") return here === "/" || here === "/index";
  return here === href || here === href + ".html" || here.replace(/\.html$/, "") === href || (here.endsWith("/") && here.slice(0, -1) === href);
}

// ─── Wiring ─────────────────────────────────────────────────────────
function wireHandlers() {
  // Country sync
  const cs = document.getElementById("gt-country");
  cs.addEventListener("change", () => {
    state.country = cs.value;
    localStorage.setItem("gt_country", state.country);
    logActivity("country_switch", state.country);
    window.dispatchEvent(new CustomEvent("gt:country", { detail: state.country }));
    if (location.pathname.includes("dashboard")) location.reload();
  });

  // Search — simple fuzzy open
  document.getElementById("gt-search").addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const q = e.target.value.toLowerCase().trim(); if (!q) return;
    const hit = NAV.flatMap(g => g.items).find(i => i.label.toLowerCase().includes(q));
    if (hit) location.href = hit.href;
    else openVoice(q);
  });

  // Voice drawer
  const drawer = document.getElementById("gt-voice-drawer");
  document.getElementById("gt-voice-btn").addEventListener("click", () => {
    const opening = !drawer.classList.contains("open");
    drawer.classList.toggle("open");
    if (!opening) stopAllVoice(); // closing the drawer kills any in-flight voice
  });
  document.getElementById("gt-voice-close").addEventListener("click", () => {
    drawer.classList.remove("open");
    stopAllVoice();
  });

  // Example chips
  drawer.querySelectorAll("[data-q]").forEach(b => b.addEventListener("click", () => askAI(b.dataset.q)));

  // Form submit
  document.getElementById("gt-voice-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const inp = document.getElementById("gt-voice-input");
    const q = inp.value.trim(); if (!q) return;
    inp.value = "";
    askAI(q);
  });

  // Mic (Web Speech API)
  const micBtn = document.getElementById("gt-voice-mic");
  micBtn.addEventListener("click", () => startMic(micBtn));

  // Mobile menu toggle (hamburger)
  const menuBtn = document.getElementById("gt-menu");
  const sidebar = document.querySelector(".sidebar");
  const backdrop = document.getElementById("gt-backdrop");
  const closeSidebar = () => { sidebar.classList.remove("open"); backdrop.classList.remove("open"); };
  const openSidebar  = () => { sidebar.classList.add("open");    backdrop.classList.add("open"); };
  menuBtn?.addEventListener("click", () => {
    if (sidebar.classList.contains("open")) closeSidebar(); else openSidebar();
  });
  backdrop?.addEventListener("click", closeSidebar);
  // Close sidebar when any link is tapped (mobile UX)
  sidebar.querySelectorAll(".sidebar-link").forEach(a => a.addEventListener("click", () => {
    if (window.innerWidth <= 900) closeSidebar();
  }));
  // Close on resize up to desktop
  window.addEventListener("resize", () => { if (window.innerWidth > 900) closeSidebar(); });
}

function openVoice(q) {
  document.getElementById("gt-voice-drawer").classList.add("open");
  if (q) askAI(q);
}

async function askAI(q) {
  // Stop any ongoing speech or listening before starting a new question
  stopAllVoice();
  logActivity("ai_question", (q || "").slice(0, 200));

  const body = document.getElementById("gt-voice-body");
  body.querySelector(".voice-empty")?.remove();
  body.innerHTML += `<div class="voice-msg user">${escape(q)}</div>`;
  const placeholder = document.createElement("div");
  placeholder.className = "voice-msg ai";
  placeholder.innerHTML = `<span class="tag">thinking</span>…`;
  body.appendChild(placeholder);
  body.scrollTop = body.scrollHeight;

  // 1) Try local deterministic routing first (computation, navigation, knowledge)
  const local = await localRoute(q);
  if (local) {
    placeholder.innerHTML = local.html;
    speak(local.spoken || "");
    body.scrollTop = body.scrollHeight;
    return;
  }

  // 2) Fall through to LLM with full context
  let ctx = { country: state.country, page: location.pathname };
  if (window.__GT_DASHBOARD_CTX__) ctx = { ...ctx, ...window.__GT_DASHBOARD_CTX__() };
  if (window.__GT_PAGE_CTX__)      ctx = { ...ctx, pageContent: window.__GT_PAGE_CTX__() };

  try {
    const r = await fetch("/api/payroll-query", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question: q, context: ctx })
    });
    const j = r.ok ? await r.json() : { narration: "API error " + r.status, intent: "error" };
    placeholder.innerHTML = `<span class="tag">${j.intent || "ai"}</span>${escape(j.narration || j.reply || "No answer.")}`;
    speak(j.narration || j.reply || "");
  } catch (e) {
    placeholder.innerHTML = `<span class="tag">offline</span>AI agent unreachable. Try: "net pay at 13 lpa", "labour code changes", "perquisites fy 2026-27".`;
  }
  body.scrollTop = body.scrollHeight;
}

// ─── Deterministic intent router (runs before calling the LLM) ─────
// Handles: navigation, instant tax/net-pay compute, labour-code & perquisite knowledge.
async function localRoute(q) {
  const lc = q.toLowerCase().trim();

  // ── Navigation: "open X" / "go to X" / "show X" / "take me to X" ──
  const navIntent = /\b(open|go\s*to|show\s*(me\s*)?(the\s*)?|navigate\s*(to\s*)?|take\s*me\s*(to\s*)?)\b/.test(lc);
  if (navIntent) {
    const synonyms = {
      "calculator": "/calculators", "calculators": "/calculators", "calc": "/calculators",
      "tax calculator": "/calculator", "income tax": "/calculator",
      "dashboard": "/dashboard", "home": "/", "homepage": "/",
      "perquisite": "/perquisites", "perquisites": "/perquisites",
      "labour code": "/labour-code", "labor code": "/labour-code", "wage code": "/labour-code",
      "calendar": "/calendar", "compliance calendar": "/calendar",
      "compliance": "/compliance", "compliance guide": "/compliance",
      "configuration": "/configure", "configure": "/configure", "rules": "/configure", "statutory": "/configure",
      "upload": "/upload", "updates": "/updates", "ask ai": "/ask"
    };
    for (const key of Object.keys(synonyms).sort((a, b) => b.length - a.length)) {
      if (lc.includes(key)) {
        const href = synonyms[key];
        setTimeout(() => location.href = href, 500);
        return { html: `<span class="tag">navigate</span>Opening <b>${key}</b> → ${href}`, spoken: `Opening ${key}` };
      }
    }
  }

  // ── Amount parser: "13 lpa", "18 lakh", "2.4 crore", "50k" ──
  const amtMatch = lc.match(/(\d+(?:\.\d+)?)\s*(lpa|lakhs?|l\b|crores?|cr|k|thousand|mn|million)?/);
  const parseAmt = () => amtMatch ? toRupees(amtMatch[1], amtMatch[2]) : null;

  // ── Tax / net-pay instant compute ──
  const wantsNet = /\b(net\s*pay|take[-\s]*home|in[-\s]*hand|salary after tax|salary after deduction|what.*my.*(net|take))\b/.test(lc);
  const wantsTax = /\b(tax|tds|income\s*tax|how much tax)\b/.test(lc);
  if ((wantsNet || wantsTax) && amtMatch) {
    const amount = parseAmt();
    if (amount && amount >= 100000) {
      const { calcIndia } = await import("/js/rule-engine/india.js");
      const wantsOld = /\bold\s*regime\b/.test(lc);
      const r = calcIndia({ grossAnnualIncome: amount, regime: wantsOld ? "old" : "new", deductions80C: wantsOld ? 150000 : 0 });
      const net = amount - r.totalTax;
      const fmt = (n) => "₹" + Math.round(n).toLocaleString("en-IN");
      const html = `<span class="tag">compute</span>
        <b>CTC ${fmt(amount)}</b> — ${wantsOld ? "OLD regime (with ₹1.5L 80C)" : "NEW regime, FY 2025-26"}<br>
        Standard deduction: ${fmt(wantsOld ? 50000 : 75000)}<br>
        Taxable income: ${fmt(r.taxableIncome)}<br>
        Annual tax: <b>${fmt(r.totalTax)}</b> (effective ${r.effectiveRate}%)<br>
        87A rebate applied: ${fmt(r.rebate87A)}<br>
        <b>Annual take-home: ${fmt(net)}</b><br>
        <b>Monthly take-home: ${fmt(Math.round(net / 12))}</b><br>
        <em>Note: PF, ESI, PT not deducted here (they depend on basic/state). For the full monthly breakdown, <a href="/calculators">open the Calculators Hub → Net Pay</a>.</em>`;
      const spoken = `At ${fmt(amount)} CTC under the ${wantsOld ? "old" : "new"} regime, annual tax is ${fmt(r.totalTax)} and monthly take-home is approximately ${fmt(Math.round(net / 12))}.`;
      return { html, spoken };
    }
  }

  // ── Labour code knowledge ──
  if (/\b(labour|labor)\s*code|wage\s*code|new\s*code|code\s*on\s*(wages|social\s*security|industrial)|4\s*codes|29\s*acts|osh\s*code/.test(lc) ||
      (/what.*(changed|new|different)/.test(lc) && /code|wage|labour|labor/.test(lc))) {
    const html = `<span class="tag">knowledge</span>India's four Labour Codes replace 29 legacy Acts:<br>
      <b>1. Code on Wages 2019</b> — uniform 'wages' definition (§2(y)): basic + DA ≥ 50% of total remuneration. PF, gratuity, bonus all calculated on this broader base.<br>
      <b>2. Code on Social Security 2020</b> — EPF/EPS + ESI + Gratuity consolidated. Fixed-Term Employees get gratuity after 1 year (vs 5). Gig/platform workers covered.<br>
      <b>3. Industrial Relations Code 2020</b> — retrenchment threshold raised 100 → 300 workers. FTE gets full statutory parity. 14-day strike notice mandatory.<br>
      <b>4. OSH Code 2020</b> — 48-hour weekly cap preserved but daily 12 hours allowed (enables 4-day week). Leave accrual from 180 days (was 240). Universal appointment letter.<br>
      Status: all 4 Codes received assent 2019/2020; 'appointed day' pending final State rules. <a href="/labour-code">See full diff + impact calculator →</a>`;
    return { html, spoken: "India's four Labour Codes consolidate 29 legacy Acts. The biggest change is the new wage definition requiring basic pay to be at least 50 percent of total remuneration, which raises PF and gratuity contributions." };
  }

  // ── IT Act 2025 perquisites knowledge ──
  if (/perquisite|it\s*act\s*2025|fy\s*26|motor\s*car|gift\s*voucher|interest.?free\s*loan|meal\s*allowance|hra.*metro/.test(lc)) {
    const html = `<span class="tag">knowledge</span>FY 2026-27 (Income-tax Rules 2026, effective 1 Apr 2026) perquisite changes:<br>
      • <b>Motor car</b> ≤1.6L: ₹1,800 → <b>₹5,000/mo</b> · >1.6L: ₹2,400 → <b>₹7,000/mo</b> · Driver: ₹900 → <b>₹3,000/mo</b><br>
      • <b>Gift vouchers</b> annual: ₹5,000 → <b>₹15,000</b><br>
      • <b>Interest-free loan</b> threshold: ₹20,000 → <b>₹2,00,000</b><br>
      • <b>Meal allowance</b>: ₹50 → <b>₹200 per meal</b> (now exempt in BOTH regimes)<br>
      • <b>Children Education</b>: ₹100 → <b>₹3,000/mo/child</b> · <b>Hostel</b>: ₹300 → <b>₹9,000/mo</b><br>
      • <b>HRA 50% metro tier</b> now includes 8 cities (Mumbai/Delhi/Kolkata/Chennai + Bengaluru/Hyderabad/Pune/Ahmedabad)<br>
      • <b>RFA</b>: metro % reduced 15% → 10%, non-metro 10% → 7.5%, below non-metro 7.5% → 5%<br>
      <a href="/perquisites">Open Perquisites page for the full comparison + calculator →</a>`;
    return { html, spoken: "FY 2026-27 brings major perquisite updates: motor car roughly 3x higher, gifts 3x, loans 10x threshold, meals 4x, and HRA metro tier expanded to 8 cities." };
  }

  // ── GOSI / KSA ──
  if (/gosi|saudi.*insurance|ksa.*rates/.test(lc)) {
    const html = `<span class="tag">knowledge</span>Saudi GOSI rates (July 2025 update):<br>
      <b>Saudi national employee</b>: 10.25% (9.5% annuities + 0.75% SANED)<br>
      <b>Saudi national employer</b>: 12.25% (9.5% + 0.75% + 2% occ-hazards)<br>
      <b>Expat</b>: 0% employee · 2% employer OH only<br>
      Ceiling: SAR 45,000/month · Floor: SAR 1,500/month<br>
      Annuities rate steps +0.5%/year until 11% in 2028.`;
    return { html, spoken: "Saudi GOSI employee rate is 10.25%, employer 12.25%, capped at SAR 45,000 monthly. Expats only 2% employer-side." };
  }

  // ── PF / gratuity / ESI / HRA ──
  if (/\bpf\b|provident|epf|eps/.test(lc) && /formula|rate|calcu/.test(lc)) {
    return { html: `<span class="tag">knowledge</span>PF (EPF + EPS) formula:<br>
      Employee: 12% × wages (basic + DA); cap at ₹15,000 basic under EPF Scheme §26A.<br>
      Employer: 12% total — split as 8.33% to EPS (pension, capped at ₹1,250/mo) + 3.67% to EPF.<br>
      Under Code on Social Security 2020, PF continues on the new wage definition (basic ≥50% of CTC).<br>
      <a href="/calculators">Open the PF calculator →</a>`, spoken: "PF is 12% of wages on each side. Employer's 12% splits into 8.33% pension and 3.67% to EPF. Most employers cap at ₹15,000 basic." };
  }
  if (/gratuity/.test(lc)) {
    return { html: `<span class="tag">knowledge</span>Gratuity formula (Payment of Gratuity Act 1972 §4):<br>
      <code>(15 × Last drawn Basic+DA × Years of service) / 26</code><br>
      Eligibility: 5 continuous years (regular employees) · 1 year (Fixed-Term Employees under Code on SS 2020 §53(2)).<br>
      Tax-exempt up to ₹20,00,000 lifetime under Income-tax §10(10).<br>
      <a href="/calculators">Run the gratuity calculator →</a>`, spoken: "Gratuity equals 15 divided by 26 times last drawn wages times years of service. Fixed-term employees need only 1 year under the new Labour Codes." };
  }
  if (/\besi\b|employees.state.insurance/.test(lc)) {
    return { html: `<span class="tag">knowledge</span>ESI (Employees' State Insurance):<br>
      <b>Applicability</b>: monthly gross ≤ ₹21,000 (₹25,000 for persons with disability).<br>
      <b>Employee</b>: 0.75% · <b>Employer</b>: 3.25% · <b>Total</b>: 4% of gross.<br>
      Due: 15th of following month. Act: ESI Act 1948 (Code on Social Security 2020 Ch IV).<br>
      <a href="/calculators">Run the ESI calculator →</a>`, spoken: "ESI applies when monthly gross is below 21,000 rupees. Employee pays 0.75%, employer pays 3.25%." };
  }
  if (/hra/.test(lc) && /exempt/.test(lc)) {
    return { html: `<span class="tag">knowledge</span>HRA exemption u/s 10(13A) — least of three:<br>
      (a) Actual HRA received<br>
      (b) 50% of basic (metro) or 40% (non-metro)<br>
      (c) Rent paid − 10% of basic<br>
      Metro from FY 2026-27: Mumbai, Delhi, Kolkata, Chennai + Bengaluru, Hyderabad, Pune, Ahmedabad.<br>
      Available only under OLD tax regime. <a href="/calculators">Run the HRA calculator →</a>`, spoken: "HRA exemption is the least of three: actual HRA, 50 or 40 percent of basic, and rent paid minus 10 percent of basic. Only available in old regime." };
  }

  // ── Dashboard contextual queries (existing) ──
  if (window.__GT_DASHBOARD_CTX__) {
    const ctx = window.__GT_DASHBOARD_CTX__();
    const trend = Array.isArray(ctx.trend) ? ctx.trend : [];
    const fmt = (n) => Math.abs(n) >= 1e7 ? "₹" + (n / 1e7).toFixed(2) + "Cr" : Math.abs(n) >= 1e5 ? "₹" + (n / 1e5).toFixed(2) + "L" : "₹" + (n || 0).toLocaleString("en-IN");
    if (/\bq1\b/.test(lc) && trend.length) {
      const q1 = trend.filter(t => ["2026-01", "2026-02", "2026-03"].includes(t.month));
      const sum = q1.reduce((a, x) => a + x.employerPF + x.employeePF, 0);
      return { html: `<span class="tag">aggregate</span>Q1 2026 PF outflow across ${q1.length} months: <b>${fmt(sum)}</b>`, spoken: `Q1 PF outflow is ${fmt(sum)}` };
    }
    if (/trend|last\s*\d*\s*months?/.test(lc) && trend.length) {
      const totalG = trend.reduce((a, x) => a + x.gross, 0);
      const totalN = trend.reduce((a, x) => a + x.netPay, 0);
      const totalP = trend.reduce((a, x) => a + x.employerPF + x.employeePF, 0);
      return { html: `<span class="tag">trend</span>Last ${trend.length} months — Gross ${fmt(totalG)} · Net ${fmt(totalN)} · PF ${fmt(totalP)}`, spoken: `Last ${trend.length} months: gross ${fmt(totalG)}, net ${fmt(totalN)}` };
    }
  }

  return null;
}

function toRupees(num, unit) {
  let n = parseFloat(num);
  if (!isFinite(n) || n <= 0) return null;
  const u = (unit || "").toLowerCase();
  if (u === "lakh" || u === "lakhs" || u === "lpa" || u === "l") n *= 100000;
  else if (u === "crore" || u === "crores" || u === "cr") n *= 10000000;
  else if (u === "k" || u === "thousand") n *= 1000;
  else if (u === "mn" || u === "million") n *= 1000000;
  else if (!u && n < 10000) n *= 100000; // bare small number → treat as lakh
  return Math.round(n);
}

// Mic + speech state (module-level so stop/start toggles reliably).
// `_speaking` is our tracked flag, but we ALSO check window.speechSynthesis.speaking
// because Android Chrome / iOS Safari sometimes drop `onend`, leaving the flag
// stale. The button click handler treats either as "currently busy".
let _rec = null;
let _speaking = false;

function isBusy() {
  return !!_rec || _speaking || (typeof window !== "undefined" && window.speechSynthesis && window.speechSynthesis.speaking);
}

function stopSpeaking() {
  if (window.speechSynthesis) {
    try { window.speechSynthesis.cancel(); } catch {}
    // Some engines (Chrome on Android) need a second pump before .speaking goes false
    try { window.speechSynthesis.pause(); } catch {}
    try { window.speechSynthesis.resume(); } catch {}
    try { window.speechSynthesis.cancel(); } catch {}
  }
  _speaking = false;
  document.querySelectorAll("#gt-voice-mic, .topbar-tool#gt-voice-btn").forEach(b => b.classList.remove("speaking"));
}

function stopListening() {
  if (_rec) {
    try { _rec.stop(); } catch {}
    try { _rec.abort?.(); } catch {}
    _rec = null;
  }
  document.querySelectorAll("#gt-voice-mic, .topbar-tool#gt-voice-btn").forEach(b => b.classList.remove("listening"));
}

// Master "stop everything" — used by the mic-click toggle and any new question
function stopAllVoice() {
  stopSpeaking();
  stopListening();
}

function startMic(btn) {
  // SINGLE CLICK = STOP. If anything is happening (listening OR the bot is
  // mid-speaking), one tap on the mic stops it cleanly so the user can tap
  // again to ask a fresh question.
  if (isBusy()) {
    stopAllVoice();
    return;
  }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { alert("Voice input not supported in this browser."); return; }
  _rec = new SR();
  _rec.lang = "en-US";
  _rec.interimResults = false;
  btn.classList.add("listening");
  _rec.onresult = (e) => {
    const t = e.results[0][0].transcript;
    const inp = document.getElementById("gt-voice-input");
    if (inp) inp.value = t;
    stopListening();
    askAI(t);
  };
  _rec.onend = () => { _rec = null; btn.classList.remove("listening"); };
  _rec.onerror = () => { _rec = null; btn.classList.remove("listening"); };
  try { _rec.start(); }
  catch (err) { _rec = null; btn.classList.remove("listening"); }
}

function speak(text) {
  stopSpeaking();
  if (!text || !window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(text.replace(/<[^>]+>/g, ""));
  u.lang = "en-US";
  u.rate = 1.05;
  const btn = document.getElementById("gt-voice-mic");
  _speaking = true;
  const clear = () => {
    _speaking = false;
    if (btn) btn.classList.remove("speaking");
  };
  u.onend = clear;
  u.onerror = clear;
  // Some mobile browsers stop firing onend if the utterance is long. Poll the
  // synthesis engine and clear our flag the moment it reports speaking=false.
  const poll = setInterval(() => {
    if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
      clearInterval(poll);
      clear();
    }
  }, 400);
  if (btn) btn.classList.add("speaking");
  try { window.speechSynthesis.speak(u); }
  catch { clearInterval(poll); clear(); }
}

function escape(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
