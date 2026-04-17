/* ═══════════════════════════════════════════════════
   PAGE: Configuration > Company Settings
   ═══════════════════════════════════════════════════ */
window.Page_config_company = {
  async render(container) {
    const { esc, showToast } = window.Utils;

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">Company Settings</div>
          <div class="page-subtitle">Manage company details and state-specific configuration</div>
        </div>
        <button class="btn btn-primary" id="btn-save-settings">Save Changes</button>
      </div>
      <div id="settings-form"></div>
    `;

    let settings = {};
    try {
      const res = await window.API.get('/settings');
      settings = res.settings || res || {};
    } catch { settings = {}; }

    const states = window.AppState.get('allStates');

    document.getElementById('settings-form').innerHTML = `
      <div class="card" style="margin-bottom:20px;">
        <div class="card-header"><h3>Company Information</h3></div>
        <div class="card-body">
          <div class="form-row">
            <div class="form-group">
              <label>Company Name</label>
              <input id="s-name" value="${esc(settings.company_name || '')}">
            </div>
            <div class="form-group">
              <label>Legal Name</label>
              <input id="s-legal" value="${esc(settings.legal_name || '')}">
            </div>
            <div class="form-group">
              <label>Federal EIN</label>
              <input id="s-ein" value="${esc(settings.federal_ein || '')}" placeholder="XX-XXXXXXX">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Street Address</label>
              <input id="s-street" value="${esc(settings.address?.street || '')}">
            </div>
            <div class="form-group">
              <label>City</label>
              <input id="s-city" value="${esc(settings.address?.city || '')}">
            </div>
            <div class="form-group">
              <label>State</label>
              <input id="s-state" value="${esc(settings.address?.state || '')}">
            </div>
            <div class="form-group">
              <label>ZIP</label>
              <input id="s-zip" value="${esc(settings.address?.zip || '')}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Default State</label>
              <select id="s-default-state">
                ${states.map(s => `<option value="${s}" ${s === settings.default_state ? 'selected' : ''}>${s}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Workweek Start Day</label>
              <select id="s-workweek">
                ${['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => `<option ${d === (settings.workweek_start || 'Monday') ? 'selected' : ''}>${d}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h3>State Configuration</h3></div>
        <div class="card-body">
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;">
            ${states.map(s => {
              const sc = (settings.states && settings.states[s]) || {};
              return `<div class="card" style="border:1px solid var(--color-border);">
                <div class="card-header"><h3>${s}</h3><span class="badge badge-active">Enabled</span></div>
                <div class="card-body">
                  <div class="form-group">
                    <label>SUI Rate (%)</label>
                    <input type="number" step="0.01" class="state-sui" data-state="${s}" value="${sc.sui_rate || 2.7}" min="0" max="15">
                  </div>
                  <div class="form-group">
                    <label>State Account Number</label>
                    <input class="state-account" data-state="${s}" value="${esc(sc.state_account || '')}">
                  </div>
                  <div class="form-group">
                    <label>Default Pay Frequency</label>
                    <select class="state-freq" data-state="${s}">
                      ${['weekly','bi_weekly','semi_monthly','monthly'].map(f => `<option value="${f}" ${f === (sc.pay_frequency || 'bi_weekly') ? 'selected' : ''}>${f.replace('_',' ')}</option>`).join('')}
                    </select>
                  </div>
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    // Save handler
    document.getElementById('btn-save-settings').addEventListener('click', async () => {
      const stateConfigs = {};
      states.forEach(s => {
        stateConfigs[s] = {
          sui_rate: parseFloat(document.querySelector(`.state-sui[data-state="${s}"]`).value) || 2.7,
          state_account: document.querySelector(`.state-account[data-state="${s}"]`).value,
          pay_frequency: document.querySelector(`.state-freq[data-state="${s}"]`).value
        };
      });

      const payload = {
        company_name: document.getElementById('s-name').value,
        legal_name: document.getElementById('s-legal').value,
        federal_ein: document.getElementById('s-ein').value,
        address: {
          street: document.getElementById('s-street').value,
          city: document.getElementById('s-city').value,
          state: document.getElementById('s-state').value,
          zip: document.getElementById('s-zip').value
        },
        default_state: document.getElementById('s-default-state').value,
        workweek_start: document.getElementById('s-workweek').value,
        states: stateConfigs
      };

      try {
        await window.API.post('/settings', payload);
        showToast('Settings saved');
        window.AppState.set('companySettings', payload);
      } catch {}
    });
  }
};
