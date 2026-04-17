/* ═══════════════════════════════════════════════════
   PAGE: Compliance — Validation Dashboard
   ═══════════════════════════════════════════════════ */
window.Page_compliance = {
  async render(container) {
    const state = window.AppState.get('selectedState');
    const allStates = window.AppState.get('allStates');
    const { showToast, esc } = window.Utils;

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">Compliance Validation</div>
          <div class="page-subtitle">Run compliance checks against federal and state regulations</div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-primary" id="btn-validate">Validate ${state}</button>
          <button class="btn btn-outline" id="btn-validate-all">Validate All States</button>
        </div>
      </div>
      <div id="compliance-results">
        <div class="empty-state">Click "Validate" to run compliance checks</div>
      </div>
    `;

    document.getElementById('btn-validate').addEventListener('click', () => validateState(state));
    document.getElementById('btn-validate-all').addEventListener('click', () => validateAllStates());

    async function validateState(st) {
      const el = document.getElementById('compliance-results');
      el.innerHTML = '<div class="empty-state">Running validation...</div>';

      try {
        const data = await window.API.get(`/compliance/validate/${st}`);
        renderStateResults(el, st, data);
        showToast(`Validation complete for ${st}`);
      } catch {
        el.innerHTML = `<div class="empty-state">Failed to validate ${st}</div>`;
      }
    }

    async function validateAllStates() {
      const el = document.getElementById('compliance-results');
      el.innerHTML = '<div class="empty-state">Validating all states...</div>';

      const allResults = [];
      for (const st of allStates) {
        try {
          const data = await window.API.get(`/compliance/validate/${st}`);
          allResults.push({ state: st, data, error: false });
        } catch {
          allResults.push({ state: st, data: null, error: true });
        }
      }

      let html = `
        <div class="card" style="margin-bottom:20px;">
          <div class="card-header"><h3>All-States Summary</h3></div>
          <div class="card-body" style="padding:0;">
            <table class="data-table">
              <thead><tr><th>State</th><th>Employees</th><th>Status</th><th>Errors</th><th>Warnings</th></tr></thead>
              <tbody>
                ${allResults.map(r => {
                  if (r.error) return `<tr><td><strong>${r.state}</strong></td><td>—</td><td><span class="badge badge-inactive">Error</span></td><td colspan="2">Failed</td></tr>`;
                  const d = r.data;
                  const errs = d.total_errors || 0;
                  const warns = d.total_warnings || 0;
                  const status = errs > 0 ? 'badge-inactive' : warns > 0 ? 'badge-review' : 'badge-finalized';
                  const label = errs > 0 ? 'Issues' : warns > 0 ? 'Warnings' : 'All Clear';
                  return `<tr>
                    <td><strong>${r.state}</strong></td>
                    <td>${d.employee_count || 0}</td>
                    <td><span class="badge ${status}">${label}</span></td>
                    <td>${errs}</td>
                    <td>${warns}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

      allResults.forEach(r => {
        if (!r.error && r.data) {
          html += `<h3 style="margin:16px 0 8px;">${r.state}</h3>`;
          html += renderEmployeeCards(r.data);
        }
      });

      el.innerHTML = html;
      showToast(`Validated ${allResults.length} states`);
    }

    function renderStateResults(el, st, data) {
      const errs = data.total_errors || 0;
      const warns = data.total_warnings || 0;
      const count = data.employee_count || 0;
      const status = errs > 0 ? 'badge-inactive' : warns > 0 ? 'badge-review' : 'badge-finalized';
      const label = errs > 0 ? 'Issues Found' : warns > 0 ? 'Warnings' : 'All Clear';

      el.innerHTML = `
        <div class="kpi-grid" style="margin-bottom:20px;">
          <div class="kpi-card"><div class="kpi-label">Employees Checked</div><div class="kpi-value">${count}</div></div>
          <div class="kpi-card"><div class="kpi-label">Errors</div><div class="kpi-value" style="color:${errs ? 'var(--color-danger)' : 'var(--color-success)'}">${errs}</div></div>
          <div class="kpi-card"><div class="kpi-label">Warnings</div><div class="kpi-value" style="color:${warns ? 'var(--color-warning)' : 'var(--color-success)'}">${warns}</div></div>
          <div class="kpi-card"><div class="kpi-label">Status</div><div class="kpi-value"><span class="badge ${status}">${label}</span></div></div>
        </div>
        <h3 style="margin-bottom:12px;">Employee Results — ${st}</h3>
        ${renderEmployeeCards(data)}
      `;
    }

    function renderEmployeeCards(data) {
      const results = data.results || [];
      if (!results.length) return '<div class="empty-state">No employees found for this state</div>';

      return `<div class="card">
        <div class="card-body" style="padding:0;">
          <table class="data-table">
            <thead><tr><th>Employee</th><th>Status</th><th>Details</th></tr></thead>
            <tbody>
              ${results.map(r => {
                const errs = r.errors || [];
                const warns = r.warnings || [];
                const ok = !errs.length && !warns.length;
                const badge = errs.length ? 'badge-inactive' : warns.length ? 'badge-review' : 'badge-finalized';
                const label = errs.length ? 'Error' : warns.length ? 'Warning' : 'Pass';

                return `<tr>
                  <td><strong>${esc(r.name || r.employee_id)}</strong></td>
                  <td><span class="badge ${badge}">${label}</span></td>
                  <td>
                    ${errs.map(e => `<div style="color:var(--color-danger);font-size:12px;">&#10008; ${esc(typeof e === 'string' ? e : e.message || JSON.stringify(e))}</div>`).join('')}
                    ${warns.map(w => `<div style="color:var(--color-warning);font-size:12px;">&#9888; ${esc(typeof w === 'string' ? w : w.message || JSON.stringify(w))}</div>`).join('')}
                    ${ok ? '<span style="color:var(--color-success);font-size:12px;">&#10004; All checks passed</span>' : ''}
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
    }
  }
};
