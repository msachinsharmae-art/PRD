/* ═══════════════════════════════════════════════════
   PAGE: Compliance > Overtime Applicability
   ═══════════════════════════════════════════════════ */
window.Page_compliance_ot_mapping = {
  async render(container) {
    const { esc } = window.Utils;
    const allStates = window.AppState.get('allStates');
    const selectedState = window.AppState.get('selectedState');

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">Overtime Applicability</div>
          <div class="page-subtitle">Employee overtime eligibility and applied rules by FLSA status</div>
        </div>
      </div>
      <div class="filter-bar">
        <div class="form-group">
          <label>State</label>
          <select id="filter-ot-state">
            <option value="">All States</option>
            ${allStates.map(s => `<option value="${s}" ${s === selectedState ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="card">
        <div class="card-body" style="padding:0;">
          <table class="data-table">
            <thead><tr>
              <th>Employee</th>
              <th>State</th>
              <th>Pay Type</th>
              <th>FLSA Status</th>
              <th>OT Rule Applied</th>
            </tr></thead>
            <tbody id="ot-body"></tbody>
          </table>
        </div>
      </div>
    `;

    let employees = [];
    try {
      const res = await window.API.get('/employees');
      employees = res.employees || res || [];
    } catch {
      document.getElementById('ot-body').innerHTML =
        '<tr><td colspan="5" class="empty-state">Failed to load employees</td></tr>';
      return;
    }

    const otRules = {
      CA: 'CA: Daily 8h OT (1.5x), 12h DT (2x), Weekly 40h, 7th day rules',
      TX: 'Federal: Weekly 40h (1.5x)',
      FL: 'Federal: Weekly 40h (1.5x)',
      WA: 'Federal: Weekly 40h (1.5x)',
      NY: 'NY: Weekly 40h (1.5x); 44h for residential employees',
      GA: 'Federal: Weekly 40h (1.5x)'
    };

    function getOtRule(emp) {
      if (emp.flsa_status === 'exempt' || emp.exempt) {
        return 'N/A — Exempt';
      }
      const st = emp.work_state || emp.state;
      return otRules[st] || 'Federal: Weekly 40h (1.5x)';
    }

    function getFlsaStatus(emp) {
      if (emp.flsa_status) return emp.flsa_status;
      if (emp.exempt) return 'exempt';
      if (emp.pay_type === 'salary' && (emp.annual_salary || 0) >= 58656) return 'exempt';
      return 'non-exempt';
    }

    function renderTable() {
      const stateFilter = document.getElementById('filter-ot-state').value;
      let filtered = employees;
      if (stateFilter) {
        filtered = filtered.filter(e => (e.work_state || e.state) === stateFilter);
      }

      if (!filtered.length) {
        document.getElementById('ot-body').innerHTML =
          '<tr><td colspan="5" class="empty-state">No employees found</td></tr>';
        return;
      }

      document.getElementById('ot-body').innerHTML = filtered.map(e => {
        const flsa = getFlsaStatus(e);
        const isExempt = flsa === 'exempt';
        const otRule = getOtRule(e);
        const st = e.work_state || e.state || '—';

        return `<tr>
          <td>${esc(e.first_name)} ${esc(e.last_name)}</td>
          <td>${st}</td>
          <td><span class="badge badge-${e.pay_type}">${e.pay_type}</span></td>
          <td><span class="badge ${isExempt ? 'badge-inactive' : 'badge-active'}">${flsa}</span></td>
          <td style="font-size:12px;${isExempt ? 'color:var(--color-text-muted);' : ''}">${otRule}</td>
        </tr>`;
      }).join('');
    }

    document.getElementById('filter-ot-state').addEventListener('change', renderTable);
    renderTable();
  }
};
