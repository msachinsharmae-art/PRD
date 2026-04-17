/* ═══════════════════════════════════════════════════
   PAGE: Reports > Tax Liability
   ═══════════════════════════════════════════════════ */
window.Page_reports_tax_liability = {
  async render(container) {
    const { fmt } = window.Utils;
    const allStates = window.AppState.get('allStates');
    const selectedState = window.AppState.get('selectedState');

    // Default date range: current month
    const now = new Date();
    const startDefault = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const endDefault = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">Tax Liability Report</div>
          <div class="page-subtitle">Federal and state tax obligations for a given period</div>
        </div>
      </div>
      <div class="filter-bar">
        <div class="form-group">
          <label>State</label>
          <select id="filter-tax-state">
            ${allStates.map(s => `<option value="${s}" ${s === selectedState ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Period Start</label>
          <input type="date" id="filter-tax-start" value="${startDefault}">
        </div>
        <div class="form-group">
          <label>Period End</label>
          <input type="date" id="filter-tax-end" value="${endDefault}">
        </div>
        <button class="btn btn-primary" id="btn-load-tax">Load Report</button>
      </div>
      <div id="tax-content">
        <div class="empty-state">Select filters and click "Load Report"</div>
      </div>
    `;

    document.getElementById('btn-load-tax').addEventListener('click', async () => {
      const state = document.getElementById('filter-tax-state').value;
      const start = document.getElementById('filter-tax-start').value;
      const end = document.getElementById('filter-tax-end').value;
      const content = document.getElementById('tax-content');

      if (!start || !end) {
        window.Utils.showToast('Please select a date range', 'error');
        return;
      }

      content.innerHTML = '<div class="empty-state">Loading report...</div>';

      try {
        const data = await window.API.get(`/reports/tax-liability?state=${state}&period_start=${start}&period_end=${end}`);
        const report = data.report || data;
        const fed = report.federal || {};
        const st = report.state || {};
        const summary = report.summary || {};

        const fedTotal = (fed.fit || 0) + (fed.ss_ee || 0) + (fed.ss_er || 0) +
          (fed.medicare_ee || 0) + (fed.medicare_er || 0) + (fed.additional_medicare || 0) + (fed.futa || 0);

        const stTotal = (st.income_tax || 0) + (st.local_tax || 0) +
          Object.values(st.programs || {}).reduce((sum, v) => sum + (typeof v === 'number' ? v : v.amount || 0), 0) +
          Object.values(st.employer_taxes || {}).reduce((sum, v) => sum + (typeof v === 'number' ? v : v.amount || 0), 0);

        content.innerHTML = `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
            <div class="card">
              <div class="card-header"><h3>Federal Taxes</h3><span style="font-weight:700;">${fmt(fedTotal)}</span></div>
              <div class="card-body">
                <div class="dl-row"><span class="dl-label">Federal Income Tax (FIT)</span><span class="dl-value">${fmt(fed.fit || 0)}</span></div>
                <div class="dl-row"><span class="dl-label">Social Security — Employee</span><span class="dl-value">${fmt(fed.ss_ee || 0)}</span></div>
                <div class="dl-row"><span class="dl-label">Social Security — Employer</span><span class="dl-value">${fmt(fed.ss_er || 0)}</span></div>
                <div class="dl-row"><span class="dl-label">Medicare — Employee</span><span class="dl-value">${fmt(fed.medicare_ee || 0)}</span></div>
                <div class="dl-row"><span class="dl-label">Medicare — Employer</span><span class="dl-value">${fmt(fed.medicare_er || 0)}</span></div>
                ${fed.additional_medicare ? `<div class="dl-row"><span class="dl-label">Additional Medicare (0.9%)</span><span class="dl-value">${fmt(fed.additional_medicare)}</span></div>` : ''}
                <div class="dl-row"><span class="dl-label">FUTA</span><span class="dl-value">${fmt(fed.futa || 0)}</span></div>
              </div>
            </div>

            <div class="card">
              <div class="card-header"><h3>State Taxes — ${state}</h3><span style="font-weight:700;">${fmt(stTotal)}</span></div>
              <div class="card-body">
                <div class="dl-row"><span class="dl-label">State Income Tax</span><span class="dl-value">${fmt(st.income_tax || 0)}</span></div>
                ${st.local_tax ? `<div class="dl-row"><span class="dl-label">Local Tax</span><span class="dl-value">${fmt(st.local_tax)}</span></div>` : ''}
                ${st.programs ? `
                  <h4 style="margin:12px 0 6px;font-size:12px;font-weight:700;">State Programs (Employee)</h4>
                  ${Object.entries(st.programs).map(([k, v]) => {
                    const amount = typeof v === 'number' ? v : v.amount || 0;
                    return `<div class="dl-row"><span class="dl-label">${formatLabel(k)}</span><span class="dl-value">${fmt(amount)}</span></div>`;
                  }).join('')}
                ` : ''}
                ${st.employer_taxes ? `
                  <h4 style="margin:12px 0 6px;font-size:12px;font-weight:700;">Employer Taxes</h4>
                  ${Object.entries(st.employer_taxes).map(([k, v]) => {
                    const amount = typeof v === 'number' ? v : v.amount || 0;
                    return `<div class="dl-row"><span class="dl-label">${formatLabel(k)}</span><span class="dl-value">${fmt(amount)}</span></div>`;
                  }).join('')}
                ` : ''}
              </div>
            </div>
          </div>

          <div class="card" style="margin-top:20px;">
            <div class="card-header"><h3>Summary</h3></div>
            <div class="card-body">
              <div class="kpi-grid">
                <div class="kpi-card">
                  <div class="kpi-label">Total Federal</div>
                  <div class="kpi-value">${fmt(fedTotal)}</div>
                </div>
                <div class="kpi-card">
                  <div class="kpi-label">Total State</div>
                  <div class="kpi-value">${fmt(stTotal)}</div>
                </div>
                <div class="kpi-card">
                  <div class="kpi-label">Grand Total</div>
                  <div class="kpi-value">${fmt(fedTotal + stTotal)}</div>
                </div>
                ${summary.employee_count ? `<div class="kpi-card">
                  <div class="kpi-label">Employees</div>
                  <div class="kpi-value">${summary.employee_count}</div>
                </div>` : ''}
                ${summary.total_gross ? `<div class="kpi-card">
                  <div class="kpi-label">Total Gross Pay</div>
                  <div class="kpi-value">${fmt(summary.total_gross)}</div>
                </div>` : ''}
                ${summary.effective_rate ? `<div class="kpi-card">
                  <div class="kpi-label">Effective Tax Rate</div>
                  <div class="kpi-value">${(summary.effective_rate * 100).toFixed(1)}%</div>
                </div>` : ''}
              </div>
            </div>
          </div>
        `;
      } catch {
        content.innerHTML = '<div class="empty-state">Failed to load tax liability report</div>';
      }
    });

    function formatLabel(key) {
      return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
  }
};
