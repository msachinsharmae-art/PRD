/* ═══════════════════════════════════════════════════
   PAGE: Pay Stubs — View employee pay stubs
   ═══════════════════════════════════════════════════ */
window.Page_pay_stubs = {
  async render(container) {
    const { fmt, fmtDate, esc } = window.Utils;

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">Pay Stubs</div>
          <div class="page-subtitle">View detailed pay stubs for each employee</div>
        </div>
      </div>
      <div class="filter-bar" id="stubs-filters">
        <div class="form-group">
          <label>Pay Run</label>
          <select id="filter-pay-run"><option value="">All Pay Runs</option></select>
        </div>
        <div class="form-group">
          <label>Employee</label>
          <select id="filter-employee"><option value="">All Employees</option></select>
        </div>
      </div>
      <div class="card">
        <div class="card-body" style="padding:0;">
          <table class="data-table">
            <thead><tr>
              <th></th><th>Employee</th><th>Period</th><th class="num">Gross</th>
              <th class="num">Federal Tax</th><th class="num">State Tax</th>
              <th class="num">FICA</th><th class="num">Net Pay</th>
            </tr></thead>
            <tbody id="stubs-body"></tbody>
          </table>
        </div>
      </div>
    `;

    let allStubs = [];
    let payRuns = [];
    let employees = [];

    try {
      const [stubsRes, runsRes, empsRes] = await Promise.all([
        window.API.get('/pay-stubs'),
        window.API.get('/pay-runs'),
        window.API.get('/employees')
      ]);
      allStubs = stubsRes.stubs || stubsRes || [];
      payRuns = runsRes.pay_runs || runsRes || [];
      employees = empsRes.employees || empsRes || [];
    } catch {
      document.getElementById('stubs-body').innerHTML =
        '<tr><td colspan="8" class="empty-state">Failed to load pay stubs</td></tr>';
      return;
    }

    // Populate filters
    const runSel = document.getElementById('filter-pay-run');
    payRuns.forEach(r => {
      runSel.innerHTML += `<option value="${r.pay_run_id}">${r.pay_run_id} — ${fmtDate(r.pay_period_start)} to ${fmtDate(r.pay_period_end)}</option>`;
    });

    const empSel = document.getElementById('filter-employee');
    employees.forEach(e => {
      empSel.innerHTML += `<option value="${e.employee_id}">${esc(e.first_name)} ${esc(e.last_name)}</option>`;
    });

    function renderStubs() {
      const runFilter = runSel.value;
      const empFilter = empSel.value;
      let filtered = allStubs;
      if (runFilter) filtered = filtered.filter(s => s.pay_run_id === runFilter);
      if (empFilter) filtered = filtered.filter(s => s.employee_id === empFilter);

      if (!filtered.length) {
        document.getElementById('stubs-body').innerHTML =
          '<tr><td colspan="8" class="empty-state">No pay stubs found</td></tr>';
        return;
      }

      document.getElementById('stubs-body').innerHTML = filtered.map(s => {
        const emp = employees.find(e => e.employee_id === s.employee_id);
        const empName = emp ? `${esc(emp.first_name)} ${esc(emp.last_name)}` : s.employee_id;
        const fica = (s.taxes?.social_security_ee || 0) + (s.taxes?.medicare_ee || 0) + (s.taxes?.additional_medicare || 0);

        return `
          <tr class="stub-row" data-id="${s.stub_id || s.employee_id}" style="cursor:pointer">
            <td><span class="expand-icon">&#9654;</span></td>
            <td>${empName}</td>
            <td>${fmtDate(s.pay_period_start)} — ${fmtDate(s.pay_period_end)}</td>
            <td class="num">${fmt(s.gross_pay)}</td>
            <td class="num">${fmt(s.taxes?.federal_income_tax || s.federal_tax || 0)}</td>
            <td class="num">${fmt(s.taxes?.state_income_tax || s.state_tax || 0)}</td>
            <td class="num">${fmt(fica)}</td>
            <td class="num"><strong>${fmt(s.net_pay)}</strong></td>
          </tr>
          <tr class="stub-detail hidden" data-detail="${s.stub_id || s.employee_id}">
            <td colspan="8">
              <div class="detail-grid" style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:16px;padding:12px 0;">
                <div class="detail-section">
                  <h4>Earnings</h4>
                  ${renderDl(s.earnings || {
                    regular_pay: s.regular_pay || 0,
                    overtime_pay: s.overtime_pay || 0,
                    other_pay: s.other_pay || 0
                  })}
                  <div class="dl-row" style="font-weight:700;border-top:1px solid var(--color-border);padding-top:6px;">
                    <span class="dl-label">Gross Pay</span><span class="dl-value">${fmt(s.gross_pay)}</span>
                  </div>
                </div>
                <div class="detail-section">
                  <h4>Federal Taxes</h4>
                  <div class="dl-row"><span class="dl-label">Federal Income Tax</span><span class="dl-value">${fmt(s.taxes?.federal_income_tax || s.federal_tax || 0)}</span></div>
                  <div class="dl-row"><span class="dl-label">Social Security</span><span class="dl-value">${fmt(s.taxes?.social_security_ee || 0)}</span></div>
                  <div class="dl-row"><span class="dl-label">Medicare</span><span class="dl-value">${fmt(s.taxes?.medicare_ee || 0)}</span></div>
                  ${s.taxes?.additional_medicare ? `<div class="dl-row"><span class="dl-label">Add'l Medicare</span><span class="dl-value">${fmt(s.taxes.additional_medicare)}</span></div>` : ''}
                </div>
                <div class="detail-section">
                  <h4>State Taxes</h4>
                  <div class="dl-row"><span class="dl-label">State Income Tax</span><span class="dl-value">${fmt(s.taxes?.state_income_tax || s.state_tax || 0)}</span></div>
                  ${s.taxes?.state_disability ? `<div class="dl-row"><span class="dl-label">SDI</span><span class="dl-value">${fmt(s.taxes.state_disability)}</span></div>` : ''}
                  ${s.taxes?.paid_family_leave ? `<div class="dl-row"><span class="dl-label">PFL</span><span class="dl-value">${fmt(s.taxes.paid_family_leave)}</span></div>` : ''}
                  ${s.taxes?.local_tax ? `<div class="dl-row"><span class="dl-label">Local Tax</span><span class="dl-value">${fmt(s.taxes.local_tax)}</span></div>` : ''}
                </div>
                <div class="detail-section">
                  <h4>Deductions</h4>
                  ${s.deductions && Object.keys(s.deductions).length
                    ? renderDl(s.deductions)
                    : '<p style="color:var(--color-text-muted);font-size:12px;">No deductions</p>'}
                </div>
              </div>
              ${s.employer_taxes ? `
              <div class="detail-section" style="border-top:1px solid var(--color-border);padding-top:12px;">
                <h4>Employer Taxes</h4>
                <div style="display:flex;gap:24px;flex-wrap:wrap;">
                  ${Object.entries(s.employer_taxes).map(([k, v]) => `
                    <div class="dl-row"><span class="dl-label">${formatLabel(k)}</span><span class="dl-value">${fmt(v)}</span></div>
                  `).join('')}
                </div>
              </div>` : ''}
            </td>
          </tr>
        `;
      }).join('');

      // Attach expand/collapse
      document.querySelectorAll('.stub-row').forEach(row => {
        row.addEventListener('click', () => {
          const id = row.dataset.id;
          const detail = document.querySelector(`.stub-detail[data-detail="${id}"]`);
          const icon = row.querySelector('.expand-icon');
          if (detail) {
            detail.classList.toggle('hidden');
            icon.innerHTML = detail.classList.contains('hidden') ? '&#9654;' : '&#9660;';
          }
        });
      });
    }

    function renderDl(obj) {
      return Object.entries(obj).map(([k, v]) =>
        `<div class="dl-row"><span class="dl-label">${formatLabel(k)}</span><span class="dl-value">${fmt(v)}</span></div>`
      ).join('');
    }

    function formatLabel(key) {
      return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }

    runSel.addEventListener('change', renderStubs);
    empSel.addEventListener('change', renderStubs);
    renderStubs();
  }
};
