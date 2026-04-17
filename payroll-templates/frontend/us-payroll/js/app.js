/* ═══════════════════════════════════════════════════
   APP — Hash Router + Sidebar Controller
   ═══════════════════════════════════════════════════ */

const ROUTES = {
  'home':                    { title: 'Home',                section: 'main',     parent: null,           icon: '\u2302',  script: 'pages/home.js' },
  'employees':               { title: 'Employees',           section: 'main',     parent: null,           icon: '\u263A',  script: 'pages/employees.js' },
  'payroll':                 { title: 'Payroll Operations',  section: 'main',     parent: null,           icon: '\u2630',  script: 'pages/payroll.js' },
  'pay-stubs':               { title: 'Pay Stubs',           section: 'main',     parent: null,           icon: '\u2637',  script: 'pages/pay-stubs.js' },
  'config/company':          { title: 'Company Settings',    section: 'config',   parent: 'Configuration',icon: '\u2699',  script: 'pages/config-company.js' },
  'config/salary':           { title: 'Salary Structure',    section: 'config',   parent: 'Configuration',icon: '\u2696',  script: 'pages/config-salary.js' },
  'config/ot-plans':         { title: 'OT Plans',            section: 'config',   parent: 'Configuration',icon: '\u23F0',  script: 'pages/config-ot-plans.js' },
  'config/tax':              { title: 'Tax Settings',        section: 'config',   parent: 'Configuration',icon: '\u2696',  script: 'pages/config-tax.js' },
  'config/pay-frequency':    { title: 'Pay Frequency',       section: 'config',   parent: 'Configuration',icon: '\u2637',  script: 'pages/config-pay-freq.js' },
  'config/deductions':       { title: 'Deduction Templates', section: 'config',   parent: 'Configuration',icon: '\u2702',  script: 'pages/config-deductions.js' },
  'compliance':              { title: 'Compliance Dashboard',section: 'compliance',parent: 'Compliance',  icon: '\u2713',  script: 'pages/compliance.js' },
  'compliance/ot-mapping':   { title: 'OT Plan Mapping',     section: 'compliance',parent: 'Compliance',  icon: '\u2699',  script: 'pages/compliance-ot.js' },
  'reports/payroll-register':{ title: 'Payroll Register',    section: 'reports',  parent: 'Reports',      icon: '\u2637',  script: 'pages/report-payroll.js' },
  'reports/tax-liability':   { title: 'Tax Liability',       section: 'reports',  parent: 'Reports',      icon: '\u2696',  script: 'pages/report-tax.js' },
  'reports/labor-cost':      { title: 'Labor Cost',          section: 'reports',  parent: 'Reports',      icon: '\u2630',  script: 'pages/report-labor.js' },
};

let currentPage = null;
let loadedScripts = {};

// ── Router ───────────────────────────────────────
function getRoute() {
  return (location.hash.slice(1) || 'home').replace(/^\//, '');
}

async function navigate(route) {
  if (!ROUTES[route]) route = 'home';
  const routeInfo = ROUTES[route];

  // Destroy previous page
  if (currentPage && typeof window.PageDestroy === 'function') {
    window.PageDestroy();
    window.PageDestroy = null;
  }

  // Update sidebar active state
  document.querySelectorAll('.sidebar-item').forEach(el => {
    el.classList.toggle('active', el.dataset.route === route);
  });

  // Open parent submenu if needed
  if (routeInfo.section !== 'main') {
    const submenu = document.querySelector(`.sidebar-submenu[data-section="${routeInfo.section}"]`);
    if (submenu) submenu.classList.add('open');
    const toggle = document.querySelector(`.sidebar-item[data-toggle="${routeInfo.section}"]`);
    if (toggle) toggle.classList.add('open');
  }

  // Update breadcrumb
  updateBreadcrumb(routeInfo);

  // Show loading
  const content = document.getElementById('page-content');
  content.innerHTML = '<div style="text-align:center;padding:60px;"><div class="spinner spinner-dark" style="width:24px;height:24px;"></div></div>';

  // Load page script
  try {
    if (!loadedScripts[route]) {
      await loadScript(`/us-payroll/js/${routeInfo.script}`);
      loadedScripts[route] = true;
    }
    // Each page module registers itself as window.Page_<routeName>
    const pageName = 'Page_' + route.replace(/[\/-]/g, '_');
    if (window[pageName] && typeof window[pageName].render === 'function') {
      currentPage = window[pageName];
      await window[pageName].render(content);
    } else {
      content.innerHTML = `<div class="empty-state"><div class="es-icon">\u{1F6A7}</div><div class="es-text">Page "${routeInfo.title}" is under construction</div></div>`;
    }
  } catch (err) {
    console.error('Page load error:', err);
    content.innerHTML = `<div class="empty-state"><div class="es-icon">\u26A0</div><div class="es-text">Error loading page: ${err.message}</div></div>`;
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(s);
  });
}

function updateBreadcrumb(routeInfo) {
  const bc = document.getElementById('breadcrumb');
  if (!bc) return;
  let html = '<span class="bc-item">US Payroll</span>';
  if (routeInfo.parent) {
    html += '<span class="bc-sep">/</span><span class="bc-item">' + routeInfo.parent + '</span>';
  }
  html += '<span class="bc-sep">/</span><span class="bc-current">' + routeInfo.title + '</span>';
  bc.innerHTML = html;
}

// ── Sidebar Toggle ───────────────────────────────
function initSidebar() {
  const shell = document.querySelector('.app-shell');
  const collapsed = localStorage.getItem('sidebar-collapsed') === 'true';
  if (collapsed) shell.classList.add('collapsed');

  document.getElementById('sidebar-toggle').addEventListener('click', () => {
    shell.classList.toggle('collapsed');
    localStorage.setItem('sidebar-collapsed', shell.classList.contains('collapsed'));
  });

  // Submenu toggles
  document.querySelectorAll('.sidebar-item[data-toggle]').forEach(el => {
    el.addEventListener('click', () => {
      const section = el.dataset.toggle;
      const submenu = document.querySelector(`.sidebar-submenu[data-section="${section}"]`);
      if (submenu) {
        submenu.classList.toggle('open');
        el.classList.toggle('open');
      }
    });
  });

  // Route clicks
  document.querySelectorAll('.sidebar-item[data-route]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const route = el.dataset.route;
      location.hash = '#' + route;
    });
  });
}

// ── State Selector ───────────────────────────────
function initStateSelector() {
  const sel = document.getElementById('state-select');
  if (!sel) return;
  sel.value = window.AppState.get('selectedState');
  sel.addEventListener('change', () => {
    window.AppState.set('selectedState', sel.value);
    // Re-render current page
    navigate(getRoute());
  });
}

// ── Init ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await window.AppState.loadSettings();
  initSidebar();
  initStateSelector();
  window.addEventListener('hashchange', () => navigate(getRoute()));
  navigate(getRoute());
});
