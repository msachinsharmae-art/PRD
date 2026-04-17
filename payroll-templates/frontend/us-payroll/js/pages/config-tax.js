/* ═══════════════════════════════════════════════════
   PAGE: Configuration > Tax Settings
   ═══════════════════════════════════════════════════ */
window.Page_config_tax = {
  async render(container) {
    const { fmt } = window.Utils;
    const states = window.AppState.get('allStates');

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">Tax Settings</div>
          <div class="page-subtitle">Federal and state tax rates for 2026</div>
        </div>
      </div>
      <div class="tabs" id="tax-tabs"></div>
      <div id="tax-content"></div>
    `;

    // Build tabs
    const tabs = ['Federal', ...states];
    document.getElementById('tax-tabs').innerHTML = tabs.map((t, i) =>
      `<div class="tab-item ${i === 0 ? 'active' : ''}" data-tab="${t}">${t}</div>`
    ).join('');

    document.querySelectorAll('#tax-tabs .tab-item').forEach(el => {
      el.addEventListener('click', () => {
        document.querySelectorAll('#tax-tabs .tab-item').forEach(t => t.classList.remove('active'));
        el.classList.add('active');
        showTab(el.dataset.tab);
      });
    });

    showTab('Federal');

    async function showTab(tab) {
      const content = document.getElementById('tax-content');
      if (tab === 'Federal') {
        content.innerHTML = `
          <div class="card" style="margin-bottom:16px;">
            <div class="card-header"><h3>Federal Income Tax Brackets (2026 — Single)</h3></div>
            <div class="card-body" style="padding:0;">
              <table class="data-table">
                <thead><tr><th>Bracket</th><th>Rate</th></tr></thead>
                <tbody>
                  <tr><td>$0 — $11,925</td><td>10%</td></tr>
                  <tr><td>$11,926 — $48,475</td><td>12%</td></tr>
                  <tr><td>$48,476 — $103,350</td><td>22%</td></tr>
                  <tr><td>$103,351 — $197,300</td><td>24%</td></tr>
                  <tr><td>$197,301 — $250,525</td><td>32%</td></tr>
                  <tr><td>$250,526 — $626,350</td><td>35%</td></tr>
                  <tr><td>$626,351+</td><td>37%</td></tr>
                </tbody>
              </table>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
            <div class="card">
              <div class="card-header"><h3>FICA Taxes</h3></div>
              <div class="card-body">
                <div class="dl-row"><span class="dl-label">Social Security Rate</span><span class="dl-value">6.2% (EE + ER)</span></div>
                <div class="dl-row"><span class="dl-label">SS Wage Base Cap</span><span class="dl-value">$176,100</span></div>
                <div class="dl-row"><span class="dl-label">Medicare Rate</span><span class="dl-value">1.45% (EE + ER)</span></div>
                <div class="dl-row"><span class="dl-label">Additional Medicare</span><span class="dl-value">0.9% (over $200k)</span></div>
                <div class="dl-row"><span class="dl-label">FUTA Rate</span><span class="dl-value">0.6% (employer only)</span></div>
                <div class="dl-row"><span class="dl-label">FUTA Wage Base</span><span class="dl-value">$7,000</span></div>
              </div>
            </div>
            <div class="card">
              <div class="card-header"><h3>Standard Deductions</h3></div>
              <div class="card-body">
                <div class="dl-row"><span class="dl-label">Single</span><span class="dl-value">$14,600</span></div>
                <div class="dl-row"><span class="dl-label">Married Filing Jointly</span><span class="dl-value">$29,200</span></div>
                <div class="dl-row"><span class="dl-label">Head of Household</span><span class="dl-value">$21,900</span></div>
              </div>
            </div>
          </div>
        `;
      } else {
        try {
          const res = await window.API.get('/states/' + tab);
          const info = res.state || res;
          const data = info.config || info;
          content.innerHTML = `
            <div class="card" style="margin-bottom:16px;">
              <div class="card-header"><h3>${info.name || tab} State Tax</h3>
                <span class="badge ${info.has_income_tax ? 'badge-active' : 'badge-inactive'}">${info.has_income_tax ? 'Has Income Tax' : 'No Income Tax'}</span>
              </div>
              <div class="card-body">
                ${info.has_income_tax && data.taxBrackets ? `
                  <h4 style="margin-bottom:8px;font-size:13px;font-weight:700;">Income Tax Brackets (Single)</h4>
                  <table class="data-table" style="margin-bottom:20px;">
                    <thead><tr><th>Min</th><th>Max</th><th>Rate</th></tr></thead>
                    <tbody>
                      ${data.taxBrackets.map(b => `<tr>
                        <td>${fmt(b.min)}</td>
                        <td>${b.max >= 999999999 ? 'Unlimited' : fmt(b.max)}</td>
                        <td>${(b.rate * 100).toFixed(1)}%</td>
                      </tr>`).join('')}
                    </tbody>
                  </table>
                ` : '<p style="color:var(--color-text-muted);margin-bottom:16px;">This state does not have a state income tax.</p>'}
                <h4 style="margin-bottom:8px;font-size:13px;font-weight:700;">State Programs & Employer Taxes</h4>
                <div class="dl-row"><span class="dl-label">SUI Wage Base</span><span class="dl-value">${data.suiWageBase ? fmt(data.suiWageBase) : 'N/A'}</span></div>
                ${data.programs ? Object.entries(data.programs).map(([k, v]) => `
                  <div class="dl-row"><span class="dl-label">${v.name || k}</span><span class="dl-value">${v.rate ? (v.rate * 100).toFixed(2) + '%' : 'N/A'}</span></div>
                `).join('') : ''}
              </div>
            </div>
          `;
        } catch {
          content.innerHTML = '<div class="empty-state">Failed to load state info</div>';
        }
      }
    }
  }
};
