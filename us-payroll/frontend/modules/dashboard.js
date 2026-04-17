/* ========================================
   Module: Dashboard
   ======================================== */
(function () {
  'use strict';
  var P = window.PayrollApp;

  window.PayrollModules.dashboard = {
    render: function () {
      return '' +
        '<div class="page-header">' +
          '<h3>Dashboard Overview</h3>' +
          '<div class="page-header-actions">' +
            '<a href="#/run-payroll" class="btn btn-primary">Run Payroll</a>' +
            '<a href="#/employees" class="btn btn-secondary">Add Employee</a>' +
          '</div>' +
        '</div>' +

        '<div class="stats-grid">' +
          '<div class="stat-card"><div class="stat-label">Total Employees</div><div class="stat-value" id="stat-total-employees">--</div></div>' +
          '<div class="stat-card"><div class="stat-label">Pending Payroll</div><div class="stat-value" id="stat-pending-payroll">--</div></div>' +
          '<div class="stat-card"><div class="stat-label">Compliance Status</div><div class="stat-value" id="stat-compliance-status">--</div></div>' +
          '<div class="stat-card"><div class="stat-label">Next Pay Date</div><div class="stat-value" id="stat-next-pay-date">--</div></div>' +
          '<div class="stat-card"><div class="stat-label">Total Gross YTD</div><div class="stat-value" id="stat-gross-ytd">--</div></div>' +
          '<div class="stat-card"><div class="stat-label">Total Net YTD</div><div class="stat-value" id="stat-net-ytd">--</div></div>' +
        '</div>' +

        '<div class="card">' +
          '<h3 class="card-title">Recent Pay Runs</h3>' +
          '<div class="table-wrapper">' +
            '<table class="data-table">' +
              '<thead><tr>' +
                '<th>Pay Period</th><th>Run Date</th><th>Employees</th><th>Gross</th><th>Net</th><th>Status</th>' +
              '</tr></thead>' +
              '<tbody id="recent-payruns-body">' +
                '<tr><td colspan="6" class="empty-state">Loading...</td></tr>' +
              '</tbody>' +
            '</table>' +
          '</div>' +
        '</div>';
    },

    init: function () {
      // Load dashboard summary
      P.apiFetch('/dashboard/summary')
        .then(function (data) {
          var el = function (id) { return document.getElementById(id); };
          if (el('stat-total-employees')) el('stat-total-employees').textContent = data.totalEmployees != null ? data.totalEmployees : '--';
          if (el('stat-pending-payroll')) el('stat-pending-payroll').textContent = data.pendingPayroll != null ? data.pendingPayroll : '--';
          if (el('stat-compliance-status')) el('stat-compliance-status').textContent = data.complianceStatus || '--';
          if (el('stat-next-pay-date')) el('stat-next-pay-date').textContent = data.nextPayDate ? P.formatDate(data.nextPayDate) : '--';
          if (el('stat-gross-ytd')) el('stat-gross-ytd').textContent = data.totalGrossYTD != null ? P.formatCurrency(data.totalGrossYTD) : '--';
          if (el('stat-net-ytd')) el('stat-net-ytd').textContent = data.totalNetYTD != null ? P.formatCurrency(data.totalNetYTD) : '--';
        })
        .catch(function (err) {
          console.error('Dashboard summary error:', err);
        });

      // Load recent pay runs
      P.apiFetch('/payroll/runs')
        .then(function (data) {
          var runs = Array.isArray(data) ? data : (data.runs || []);
          var tbody = document.getElementById('recent-payruns-body');
          if (!tbody) return;
          if (!runs.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No pay runs yet.</td></tr>';
            return;
          }
          tbody.innerHTML = runs.slice(0, 10).map(function (run) {
            return '<tr>' +
              '<td>' + P.formatDateShort(run.payPeriodStart || run.periodStart) + ' - ' + P.formatDateShort(run.payPeriodEnd || run.periodEnd) + '</td>' +
              '<td>' + P.formatDate(run.processedAt || run.runDate || run.createdAt) + '</td>' +
              '<td>' + (run.employeeCount || (run.employees ? run.employees.length : '--')) + '</td>' +
              '<td>' + P.formatCurrency(run.totalGross) + '</td>' +
              '<td>' + P.formatCurrency(run.totalNet) + '</td>' +
              '<td>' + P.badgeHtml(run.status || 'Completed') + '</td>' +
            '</tr>';
          }).join('');
        })
        .catch(function (err) {
          console.error('Pay runs error:', err);
          var tbody = document.getElementById('recent-payruns-body');
          if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Failed to load pay runs.</td></tr>';
        });
    }
  };
})();
