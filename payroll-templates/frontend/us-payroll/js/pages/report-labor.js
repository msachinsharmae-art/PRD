/* ═══════════════════════════════════════════════════
   PAGE: Reports > Labor Cost
   ═══════════════════════════════════════════════════ */
window.Page_reports_labor_cost = {
  async render(container) {
    const { fmt, fmtDate, esc } = window.Utils;

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">Labor Cost Report</div>
          <div class="page-subtitle">Analyze labor costs by department or job title</div>
        </div>
      </div>
      <div class="filter-bar">
        <div class="form-group">
          <label>Pay Run</label>
          <select id="filter-lc-run"><option value="">Select a pay run</option></select>
        </div>
        <div class="form-group">
          <label>Group By</label>
          <select id="filter-lc-group">
            <option value="department">Department</option>
            <option value="job_title">Job Title</option>
          </select>
        </div>
        <button class="btn btn-primary" id="btn-load-labor">Load Report</button>
      </div>
      <div id="labor-content">
        <div class="empty-state">Select a pay run and click "Load Report"</div>
      </div>
    `;

    // Load pay runs
    let payRuns = [];
    try {
      const res = await window.API.get('/pay-runs');
      payRuns = res.pay_runs || res || [];
    } catch {}

    const runSel = document.getElementById('filter-lc-run');
    payRuns.forEach(r => {
      runSel.innerHTML += `<option value="${r.pay_run_id}">${r.pay_run_id} — ${fmtDate(r.pay_period_start)} to ${fmtDate(r.pay_period_end)} (${r.status})</option>`;
    });

    document.getElementById('btn-load-labor').addEventListener('click', async () => {
      const runId = runSel.value;
      const groupBy = document.getElementById('filter-lc-group').value;
      const content = document.getElementById('labor-content');

      if (!runId) return;

      content.innerHTML = '<div class="empty-state">Loading report...</div>';

      try {
        const data = await window.API.get(`/reports/labor-cost?pay_run_id=${runId}&group_by=${groupBy}`);
        const report = data.report || data;
        const groups = report.groups || report || [];
        const run = payRuns.find(r => r.pay_run_id === runId);

        if ((!Array.isArray(groups) || !groups.length) && typeof groups === 'object' && !Array.isArray(groups)) {
          // If the response is a flat object, wrap it
          renderGroups([groups], groupBy, run);
          return;
        }

        if (!groups.length) {
          content.innerHTML = '<div class="empty-state">No data for this pay run</div>';
          return;
        }

        renderGroups(groups, groupBy, run);
      } catch {
        content.innerHTML = '<div class="empty-state">Failed to load labor cost report</div>';
      }
    });

    function renderGroups(groups, groupBy, run) {
      const content = document.getElementById('labor-content');
      const groupLabel = groupBy === 'department' ? 'Department' : 'Job Title';

      // Grand totals
      const grand = { count: 0, gross: 0, ot_cost: 0, employer_taxes: 0, total_cost: 0 };
      groups.forEach(g => {
        grand.count += g.employee_count || g.count || 0;
        grand.gross += g.total_gross || g.gross || 0;
        grand.ot_cost += g.ot_cost || g.overtime_cost || 0;
        grand.employer_taxes += g.employer_taxes || g.employer_cost || 0;
        grand.total_cost += g.total_cost || ((g.total_gross || g.gross || 0) + (g.employer_taxes || g.employer_cost || 0));
      });

      let html = '';

      if (run) {
        html += `<div style="margin-bottom:12px;font-size:13px;color:var(--color-text-muted);">
          Period: ${fmtDate(run.pay_period_start)} to ${fmtDate(run.pay_period_end)} | Grouped by: ${groupLabel}
        </div>`;
      }

      // Summary KPIs
      html += `
        <div class="kpi-grid" style="margin-bottom:20px;">
          <div class="kpi-card">
            <div class="kpi-label">Total Employees</div>
            <div class="kpi-value">${grand.count}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Total Gross</div>
            <div class="kpi-value">${fmt(grand.gross)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Total OT Cost</div>
            <div class="kpi-value">${fmt(grand.ot_cost)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Employer Taxes</div>
            <div class="kpi-value">${fmt(grand.employer_taxes)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Total Labor Cost</div>
            <div class="kpi-value">${fmt(grand.total_cost)}</div>
          </div>
        </div>
      `;

      // Per-group cards
      groups.forEach(g => {
        const name = g.group || g.name || g[groupBy] || 'Ungrouped';
        const empCount = g.employee_count || g.count || 0;
        const gross = g.total_gross || g.gross || 0;
        const otCost = g.ot_cost || g.overtime_cost || 0;
        const empTaxes = g.employer_taxes || g.employer_cost || 0;
        const totalCost = g.total_cost || (gross + empTaxes);
        const details = g.employees || g.details || [];

        html += `
          <div class="card" style="margin-bottom:16px;">
            <div class="card-header">
              <h3>${esc(name)}</h3>
              <span style="font-size:13px;color:var(--color-text-muted);">${empCount} employee${empCount !== 1 ? 's' : ''}</span>
            </div>
            <div class="card-body" style="padding:0;">
              <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:16px;border-bottom:1px solid var(--color-border);">
                <div>
                  <div style="font-size:11px;color:var(--color-text-muted);">Total Gross</div>
                  <div style="font-size:16px;font-weight:700;">${fmt(gross)}</div>
                </div>
                <div>
                  <div style="font-size:11px;color:var(--color-text-muted);">OT Cost</div>
                  <div style="font-size:16px;font-weight:700;">${fmt(otCost)}</div>
                </div>
                <div>
                  <div style="font-size:11px;color:var(--color-text-muted);">Employer Taxes</div>
                  <div style="font-size:16px;font-weight:700;">${fmt(empTaxes)}</div>
                </div>
                <div>
                  <div style="font-size:11px;color:var(--color-text-muted);">Total Cost</div>
                  <div style="font-size:16px;font-weight:700;">${fmt(totalCost)}</div>
                </div>
              </div>
              ${details.length ? `
                <table class="data-table">
                  <thead><tr>
                    <th>Employee</th>
                    <th class="num">Gross</th>
                    <th class="num">OT Cost</th>
                    <th class="num">Employer Taxes</th>
                    <th class="num">Total Cost</th>
                  </tr></thead>
                  <tbody>
                    ${details.map(d => {
                      const dName = d.employee_name || ((d.first_name || '') + ' ' + (d.last_name || ''));
                      const dGross = d.gross_pay || d.gross || 0;
                      const dOt = d.ot_cost || d.overtime_cost || d.overtime_pay || 0;
                      const dEmpTax = d.employer_taxes || d.employer_cost || 0;
                      const dTotal = d.total_cost || (dGross + dEmpTax);
                      return `<tr>
                        <td>${esc(dName)}</td>
                        <td class="num">${fmt(dGross)}</td>
                        <td class="num">${fmt(dOt)}</td>
                        <td class="num">${fmt(dEmpTax)}</td>
                        <td class="num"><strong>${fmt(dTotal)}</strong></td>
                      </tr>`;
                    }).join('')}
                  </tbody>
                </table>
              ` : ''}
            </div>
          </div>
        `;
      });

      content.innerHTML = html;
    }
  }
};
