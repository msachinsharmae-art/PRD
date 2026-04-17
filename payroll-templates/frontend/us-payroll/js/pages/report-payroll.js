/* ═══════════════════════════════════════════════════
   PAGE: Reports > Payroll Register
   ═══════════════════════════════════════════════════ */
window.Page_reports_payroll_register = {
  async render(container) {
    const { fmt, fmtDate, esc } = window.Utils;

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">Payroll Register</div>
          <div class="page-subtitle">Detailed payroll breakdown per pay run</div>
        </div>
      </div>
      <div class="filter-bar">
        <div class="form-group">
          <label>Pay Run</label>
          <select id="filter-pr-run"><option value="">Select a pay run</option></select>
        </div>
        <button class="btn btn-primary" id="btn-load-register">Load Report</button>
      </div>
      <div id="register-content">
        <div class="empty-state">Select a pay run and click "Load Report"</div>
      </div>
    `;

    // Load pay runs for dropdown
    let payRuns = [];
    try {
      const res = await window.API.get('/pay-runs');
      payRuns = res.pay_runs || res || [];
    } catch {}

    const runSel = document.getElementById('filter-pr-run');
    payRuns.forEach(r => {
      runSel.innerHTML += `<option value="${r.pay_run_id}">${r.pay_run_id} — ${fmtDate(r.pay_period_start)} to ${fmtDate(r.pay_period_end)} (${r.status})</option>`;
    });

    document.getElementById('btn-load-register').addEventListener('click', async () => {
      const runId = runSel.value;
      if (!runId) return;

      const content = document.getElementById('register-content');
      content.innerHTML = '<div class="empty-state">Loading report...</div>';

      try {
        const data = await window.API.get(`/reports/payroll-register?pay_run_id=${runId}`);
        const report = data.report || data;
        const rows = report.rows || report.employees || [];
        const run = payRuns.find(r => r.pay_run_id === runId);

        if (!rows.length) {
          content.innerHTML = '<div class="empty-state">No data for this pay run</div>';
          return;
        }

        // Calculate totals
        const totals = {
          regular_hours: 0, ot_hours: 0, gross: 0,
          federal_tax: 0, state_tax: 0, fica: 0,
          deductions: 0, net: 0
        };

        rows.forEach(r => {
          totals.regular_hours += r.regular_hours || r.hours?.regular || 0;
          totals.ot_hours += r.ot_hours || r.hours?.overtime || 0;
          totals.gross += r.gross_pay || r.gross || 0;
          totals.federal_tax += r.federal_tax || r.taxes?.federal_income_tax || 0;
          totals.state_tax += r.state_tax || r.taxes?.state_income_tax || 0;
          totals.fica += r.fica || ((r.taxes?.social_security_ee || 0) + (r.taxes?.medicare_ee || 0));
          totals.deductions += r.total_deductions || r.deductions_total || 0;
          totals.net += r.net_pay || r.net || 0;
        });

        content.innerHTML = `
          ${run ? `<div style="margin-bottom:12px;font-size:13px;color:var(--color-text-muted);">
            Period: ${fmtDate(run.pay_period_start)} to ${fmtDate(run.pay_period_end)} | Status: <span class="badge badge-${run.status}">${run.status}</span>
          </div>` : ''}
          <div class="card">
            <div class="card-body" style="padding:0;">
              <table class="data-table">
                <thead><tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th class="num">Reg Hrs</th>
                  <th class="num">OT Hrs</th>
                  <th class="num">Gross</th>
                  <th class="num">Federal Tax</th>
                  <th class="num">State Tax</th>
                  <th class="num">FICA</th>
                  <th class="num">Deductions</th>
                  <th class="num">Net Pay</th>
                </tr></thead>
                <tbody>
                  ${rows.map(r => {
                    const name = r.employee_name || ((r.first_name || '') + ' ' + (r.last_name || ''));
                    const regHrs = r.regular_hours || r.hours?.regular || 0;
                    const otHrs = r.ot_hours || r.hours?.overtime || 0;
                    const gross = r.gross_pay || r.gross || 0;
                    const fedTax = r.federal_tax || r.taxes?.federal_income_tax || 0;
                    const stTax = r.state_tax || r.taxes?.state_income_tax || 0;
                    const fica = r.fica || ((r.taxes?.social_security_ee || 0) + (r.taxes?.medicare_ee || 0));
                    const ded = r.total_deductions || r.deductions_total || 0;
                    const net = r.net_pay || r.net || 0;

                    return `<tr>
                      <td>${esc(name)}</td>
                      <td>${esc(r.department || '—')}</td>
                      <td class="num">${regHrs.toFixed(1)}</td>
                      <td class="num">${otHrs.toFixed(1)}</td>
                      <td class="num">${fmt(gross)}</td>
                      <td class="num">${fmt(fedTax)}</td>
                      <td class="num">${fmt(stTax)}</td>
                      <td class="num">${fmt(fica)}</td>
                      <td class="num">${fmt(ded)}</td>
                      <td class="num"><strong>${fmt(net)}</strong></td>
                    </tr>`;
                  }).join('')}
                </tbody>
                <tfoot>
                  <tr style="font-weight:700;background:var(--color-surface-alt,#f8f9fa);">
                    <td colspan="2">TOTALS</td>
                    <td class="num">${totals.regular_hours.toFixed(1)}</td>
                    <td class="num">${totals.ot_hours.toFixed(1)}</td>
                    <td class="num">${fmt(totals.gross)}</td>
                    <td class="num">${fmt(totals.federal_tax)}</td>
                    <td class="num">${fmt(totals.state_tax)}</td>
                    <td class="num">${fmt(totals.fica)}</td>
                    <td class="num">${fmt(totals.deductions)}</td>
                    <td class="num">${fmt(totals.net)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        `;
      } catch {
        content.innerHTML = '<div class="empty-state">Failed to load payroll register</div>';
      }
    });
  }
};
