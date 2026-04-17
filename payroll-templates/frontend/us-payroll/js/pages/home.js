/* ═══════════════════════════════════════════════════
   PAGE: Home — Dashboard with KPIs
   ═══════════════════════════════════════════════════ */
window.Page_home = {
  async render(container) {
    const { fmt, fmtDate } = window.Utils;
    const state = window.AppState.get('selectedState');

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">Payroll Dashboard</div>
          <div class="page-subtitle">Overview of payroll operations for ${state}</div>
        </div>
        <button class="btn btn-primary" onclick="location.hash='#payroll'">+ New Pay Run</button>
      </div>
      <div class="kpi-grid" id="kpi-grid"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;" id="dash-panels"></div>
    `;

    try {
      const [empData, runsData, stubsData] = await Promise.all([
        window.API.get(`/employees?state=${state}`),
        window.API.get(`/pay-runs?state=${state}`),
        window.API.get('/pay-stubs')
      ]);

      const employees = empData.employees || empData || [];
      const payRuns = runsData.pay_runs || runsData || [];
      const stubs = stubsData.stubs || stubsData || [];

      const activeEmps = employees.filter(e => e.status !== 'inactive');
      const finalized = payRuns.filter(r => r.status === 'finalized');
      const pending = payRuns.filter(r => r.status !== 'finalized');

      // Calculate totals from finalized runs
      let totalGross = 0, totalNet = 0, totalTax = 0, totalEmployerCost = 0;
      finalized.forEach(r => {
        totalGross += r.totals?.total_gross || 0;
        totalNet += r.totals?.total_net || 0;
        totalTax += (r.totals?.total_federal_tax || 0) + (r.totals?.total_state_tax || 0);
        totalEmployerCost += r.totals?.total_employer_cost || 0;
      });

      // KPIs
      document.getElementById('kpi-grid').innerHTML = `
        <div class="kpi-card">
          <div class="kpi-label">Active Employees</div>
          <div class="kpi-value">${activeEmps.length}</div>
          <div class="kpi-sub">${state} state</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Total Gross Pay</div>
          <div class="kpi-value">${fmt(totalGross)}</div>
          <div class="kpi-sub">${finalized.length} finalized run${finalized.length !== 1 ? 's' : ''}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Total Taxes</div>
          <div class="kpi-value">${fmt(totalTax)}</div>
          <div class="kpi-sub">Federal + State</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Total Net Pay</div>
          <div class="kpi-value">${fmt(totalNet)}</div>
          <div class="kpi-sub">Employee take-home</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Employer Cost</div>
          <div class="kpi-value">${fmt(totalEmployerCost)}</div>
          <div class="kpi-sub">Gross + employer taxes</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Pending Runs</div>
          <div class="kpi-value">${pending.length}</div>
          <div class="kpi-sub">${pending.filter(r=>r.status==='review').length} in review</div>
        </div>
      `;

      // Panels
      document.getElementById('dash-panels').innerHTML = `
        <div class="card">
          <div class="card-header"><h3>Recent Pay Runs</h3></div>
          <div class="card-body" style="padding:0;">
            <table class="data-table">
              <thead><tr>
                <th>ID</th><th>Period</th><th>Status</th><th>Gross</th><th>Net</th>
              </tr></thead>
              <tbody>
                ${payRuns.slice(0, 10).map(r => `<tr style="cursor:pointer" onclick="location.hash='#payroll'">
                  <td>${r.pay_run_id}</td>
                  <td>${fmtDate(r.pay_period_start)} - ${fmtDate(r.pay_period_end)}</td>
                  <td><span class="badge badge-${r.status}">${r.status}</span></td>
                  <td class="num">${fmt(r.totals?.total_gross)}</td>
                  <td class="num">${fmt(r.totals?.total_net)}</td>
                </tr>`).join('') || '<tr><td colspan="5" class="empty-state">No pay runs yet</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3>Employee Summary</h3></div>
          <div class="card-body" style="padding:0;">
            <table class="data-table">
              <thead><tr>
                <th>Name</th><th>Type</th><th>Rate</th><th>Status</th>
              </tr></thead>
              <tbody>
                ${employees.slice(0, 10).map(e => `<tr style="cursor:pointer" onclick="location.hash='#employees'">
                  <td>${e.first_name} ${e.last_name}</td>
                  <td><span class="badge badge-${e.pay_type}">${e.pay_type}</span></td>
                  <td class="num">${e.pay_type === 'hourly' ? fmt(e.pay_rate) + '/hr' : fmt(e.annual_salary) + '/yr'}</td>
                  <td><span class="badge badge-${e.status || 'active'}">${e.status || 'active'}</span></td>
                </tr>`).join('') || '<tr><td colspan="4" class="empty-state">No employees</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } catch (err) {
      document.getElementById('kpi-grid').innerHTML = `<div class="empty-state">Failed to load dashboard data</div>`;
    }
  }
};
