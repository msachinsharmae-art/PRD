/* ========================================
   Zimyo US Payroll - Frontend Application
   Hash-based SPA Router
   ======================================== */

(function () {
  'use strict';

  // ── Constants ──────────────────────────
  const API = '/api';
  const STATES = {
    CA: 'California',
    NY: 'New York',
    TX: 'Texas',
    NJ: 'New Jersey',
    WA: 'Washington',
    IL: 'Illinois',
    GA: 'Georgia',
    FL: 'Florida',
  };

  // ── Helpers ────────────────────────────

  function formatCurrency(amount) {
    if (amount == null || isNaN(amount)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  function formatDate(dateStr) {
    if (!dateStr) return '--';
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatDateShort(dateStr) {
    if (!dateStr) return '--';
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function stateName(code) {
    return STATES[code] || code;
  }

  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function badgeHtml(status) {
    var cls = (status || '').toLowerCase().replace(/\s+/g, '-');
    return '<span class="badge badge-' + cls + '">' + escapeHtml(status) + '</span>';
  }

  function toISODate(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function showToast(message, type) {
    type = type || 'info';
    var container = document.getElementById('toast-container');
    if (!container) return;
    var toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(function () {
      toast.classList.add('fade-out');
      setTimeout(function () { toast.remove(); }, 300);
    }, 3500);
  }

  // ── API Helpers ────────────────────────

  function apiFetch(path, options) {
    options = options || {};
    var fetchOptions = {
      headers: { 'Content-Type': 'application/json' },
    };
    Object.keys(options).forEach(function (k) { fetchOptions[k] = options[k]; });
    if (options.body && typeof options.body === 'object') {
      fetchOptions.body = JSON.stringify(options.body);
    }
    return fetch(API + path, fetchOptions)
      .then(function (res) {
        if (!res.ok) {
          return res.json().catch(function () { return {}; }).then(function (data) {
            throw new Error(data.error || data.message || 'Request failed (' + res.status + ')');
          });
        }
        return res.json();
      });
  }

  // ── Expose Shared Utilities Globally ──
  window.PayrollApp = {
    apiFetch: apiFetch,
    formatCurrency: formatCurrency,
    formatDate: formatDate,
    formatDateShort: formatDateShort,
    escapeHtml: escapeHtml,
    badgeHtml: badgeHtml,
    showToast: showToast,
    stateName: stateName,
    toISODate: toISODate,
    STATES: STATES,
    API: API,
  };

  // ── Module Registry ───────────────────
  window.PayrollModules = {};

  // ── Router ────────────────────────────
  var pageContent = document.getElementById('page-content');
  var navItems = document.querySelectorAll('.nav-item');
  var pageTitle = document.getElementById('topbar-title');

  var routeMap = {
    '/dashboard':     { title: 'Dashboard',      module: 'dashboard' },
    '/company-setup': { title: 'Company Setup',   module: 'companySetup' },
    '/employees':     { title: 'Employees',       module: 'employees' },
    '/pay-schedules': { title: 'Pay Schedules',   module: 'paySchedules' },
    '/ot-plans':      { title: 'OT Plans',        module: 'otPlans' },
    '/break-rules':   { title: 'Break Rules',     module: 'breakRules' },
    '/pto-leave':     { title: 'PTO & Leave',     module: 'ptoLeave' },
    '/benefits':      { title: 'Benefits',        module: 'benefits' },
    '/run-payroll':   { title: 'Run Payroll',     module: 'runPayroll' },
    '/payslips':      { title: 'Payslips',        module: 'payslips' },
    '/compliance':    { title: 'Compliance',      module: 'compliance' },
    '/reports':       { title: 'Reports',         module: 'reports' },
    '/documents':     { title: 'Documents',       module: 'documents' },
    '/ai-assistant':  { title: 'AI Assistant',    module: 'aiAssistant' },
  };

  function navigate() {
    var hash = window.location.hash || '#/dashboard';
    var route = hash.replace('#', '');
    var config = routeMap[route] || routeMap['/dashboard'];

    // Update sidebar active state
    navItems.forEach(function (item) {
      var href = item.getAttribute('href');
      item.classList.toggle('active', href === '#' + route);
    });

    // Update page title
    if (pageTitle) pageTitle.textContent = config.title;

    // Render module
    var mod = window.PayrollModules[config.module];
    if (mod) {
      pageContent.innerHTML = mod.render();
      if (mod.init) mod.init();
    } else {
      pageContent.innerHTML = '<div class="empty-state">Module loading...</div>';
    }
  }

  window.addEventListener('hashchange', navigate);

  // Sidebar toggle for mobile
  var sidebarToggle = document.getElementById('sidebar-toggle');
  var sidebar = document.querySelector('.sidebar');
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', function () {
      sidebar.classList.toggle('open');
    });
  }

  // Close sidebar on nav click (mobile)
  navItems.forEach(function (item) {
    item.addEventListener('click', function () {
      if (sidebar) sidebar.classList.remove('open');
    });
  });

  // Initial navigation
  if (!window.location.hash) window.location.hash = '#/dashboard';
  setTimeout(navigate, 50);

})();
