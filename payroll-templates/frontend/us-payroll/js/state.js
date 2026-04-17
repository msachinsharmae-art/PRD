/* ═══════════════════════════════════════════════════
   STATE — Global application state with pub/sub
   ═══════════════════════════════════════════════════ */

const AppState = {
  _data: {
    selectedState: localStorage.getItem('us-payroll-state') || 'CA',
    companySettings: null,
    allStates: ['CA', 'TX', 'FL', 'WA', 'NY', 'GA']
  },
  _listeners: {},

  get(key) {
    return this._data[key];
  },

  set(key, value) {
    this._data[key] = value;
    if (key === 'selectedState') {
      localStorage.setItem('us-payroll-state', value);
    }
    (this._listeners[key] || []).forEach(fn => fn(value));
  },

  onChange(key, fn) {
    if (!this._listeners[key]) this._listeners[key] = [];
    this._listeners[key].push(fn);
    return () => {
      this._listeners[key] = this._listeners[key].filter(f => f !== fn);
    };
  },

  async loadSettings() {
    try {
      const data = await window.API.get('/settings');
      this.set('companySettings', data.settings || data);
      // Update sidebar company name
      const el = document.getElementById('sidebar-company');
      const name = (data.settings || data)?.company_name;
      if (el && name) el.textContent = name;
    } catch { /* settings may not exist yet */ }
  }
};

window.AppState = AppState;
