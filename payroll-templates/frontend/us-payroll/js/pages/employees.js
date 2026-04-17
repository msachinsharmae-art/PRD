/* ═══════════════════════════════════════════════════
   PAGE: Employees — Full CRUD with compliance checks
   ═══════════════════════════════════════════════════ */
window.Page_employees = {

  /* ── local state ── */
  _allEmployees: [],
  _editingId: null,

  /* ── constants ── */
  STATE_NAMES: {
    CA: 'California', TX: 'Texas', FL: 'Florida',
    WA: 'Washington', NY: 'New York', GA: 'Georgia'
  },
  NO_STATE_INCOME_TAX: ['TX', 'FL', 'WA'],
  MIN_WAGES: {
    CA: 16.90, TX: 7.25, FL: 15.00,
    WA: 16.66, NY: 16.00, GA: 7.25
  },
  EXEMPT_THRESHOLDS: {
    CA: 70304, TX: 35568, FL: 35568,
    WA: 67724.80, NY: 58458.40, GA: 35568
  },

  /* ═══════════════════════════════════════════════════
     RENDER — entry point
     ═══════════════════════════════════════════════════ */
  async render(container) {
    const self = this;
    const { esc, showToast } = window.Utils;

    /* --- scaffold --- */
    container.innerHTML = `
      <!-- Toolbar -->
      <div class="filter-bar" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;margin-bottom:20px;">
        <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:280px;">
          <h1 class="page-title" style="margin:0;">Employees</h1>
          <span class="badge badge-info" id="empCount">0</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <div class="search-box" style="position:relative;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#9ca3af;width:16px;height:16px;">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input type="text" id="empSearchInput" class="form-control"
                   placeholder="Search name, ID, department..."
                   style="padding-left:36px;width:260px;">
          </div>
          <select class="form-control" id="empFilterStatus" style="width:auto;">
            <option value="">All Status</option>
            <option value="active" selected>Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select class="form-control" id="empFilterState" style="width:auto;">
            <option value="">All States</option>
            <option value="CA">CA</option>
            <option value="TX">TX</option>
            <option value="FL">FL</option>
            <option value="WA">WA</option>
            <option value="NY">NY</option>
            <option value="GA">GA</option>
          </select>
          <button class="btn btn-primary" id="btnAddEmployee">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 style="width:15px;height:15px;"><path d="M12 5v14M5 12h14"/></svg>
            Add Employee
          </button>
        </div>
      </div>

      <!-- Compliance alerts area -->
      <div id="empComplianceAlerts"></div>

      <!-- Table card -->
      <div class="card" style="overflow:hidden;">
        <div style="overflow-x:auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>State</th>
                <th>Department</th>
                <th>Job Title</th>
                <th>Pay Type</th>
                <th>Pay Rate</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="empTableBody"></tbody>
          </table>
        </div>
        <div class="empty-state" id="empEmptyState" style="display:none;text-align:center;padding:64px 24px;color:#9ca3af;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
               style="width:64px;height:64px;margin-bottom:16px;color:#d1d5db;">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <h3 style="font-size:16px;font-weight:600;color:#6b7280;margin-bottom:6px;">No Employees Found</h3>
          <p style="font-size:13px;margin-bottom:20px;">Add your first employee to get started with payroll.</p>
          <button class="btn btn-primary" id="btnAddEmployeeEmpty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 style="width:15px;height:15px;"><path d="M12 5v14M5 12h14"/></svg>
            Add Employee
          </button>
        </div>
      </div>

      <!-- ════════════════════════════════════════════
           ADD / EDIT EMPLOYEE MODAL
           ════════════════════════════════════════════ -->
      <div class="modal-overlay" id="empModal">
        <div class="modal" style="max-width:760px;">
          <div class="modal-header">
            <h2 id="empModalTitle">Add Employee</h2>
            <button class="modal-close" id="empModalCloseX">&times;</button>
          </div>
          <div class="modal-body">
            <!-- modal compliance alerts -->
            <div id="empModalAlerts"></div>

            <!-- Tabs -->
            <div class="tabs" id="empFormTabs" style="display:flex;gap:0;border-bottom:2px solid #e5e7eb;margin:0 -24px;padding:0 24px;margin-bottom:20px;overflow-x:auto;">
              <button type="button" class="tab-btn active" data-tab="personal">Personal Info</button>
              <button type="button" class="tab-btn" data-tab="work">Work Info</button>
              <button type="button" class="tab-btn" data-tab="federalw4">Federal W-4</button>
              <button type="button" class="tab-btn" data-tab="statew4">State Tax</button>
              <button type="button" class="tab-btn" data-tab="deductions">Deductions</button>
            </div>

            <form id="empForm" novalidate>

              <!-- ── PERSONAL INFO ── -->
              <div class="tab-panel active" id="empTab-personal">
                <div class="form-row">
                  <div class="form-group">
                    <label>First Name <span class="req">*</span></label>
                    <input type="text" name="first_name" required placeholder="John" class="form-control">
                  </div>
                  <div class="form-group">
                    <label>Last Name <span class="req">*</span></label>
                    <input type="text" name="last_name" required placeholder="Smith" class="form-control">
                  </div>
                  <div class="form-group">
                    <label>SSN (Last 4)</label>
                    <div class="masked-input" style="position:relative;">
                      <span class="mask-prefix" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#9ca3af;font-size:14px;pointer-events:none;letter-spacing:3px;">***-**-</span>
                      <input type="password" name="ssn_last4" maxlength="4" pattern="\\d{4}" placeholder="****"
                             class="form-control" style="padding-left:82px;letter-spacing:3px;">
                    </div>
                    <span class="field-hint">Only the last 4 digits are stored</span>
                  </div>
                  <div class="form-group">
                    <label>Date of Birth</label>
                    <input type="date" name="date_of_birth" class="form-control">
                  </div>
                  <div class="form-group">
                    <label>Hire Date <span class="req">*</span></label>
                    <input type="date" name="hire_date" required class="form-control">
                  </div>
                </div>
              </div>

              <!-- ── WORK INFO ── -->
              <div class="tab-panel" id="empTab-work">
                <div class="form-row">
                  <div class="form-group">
                    <label>Work State <span class="req">*</span></label>
                    <select name="work_state" required class="form-control">
                      <option value="">Select state</option>
                      <option value="CA">California (CA)</option>
                      <option value="TX">Texas (TX)</option>
                      <option value="FL">Florida (FL)</option>
                      <option value="WA">Washington (WA)</option>
                      <option value="NY">New York (NY)</option>
                      <option value="GA">Georgia (GA)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Work City</label>
                    <input type="text" name="work_city" placeholder="e.g. Los Angeles" class="form-control">
                  </div>
                  <div class="form-group">
                    <label>Department</label>
                    <input type="text" name="department" placeholder="e.g. Engineering" class="form-control">
                  </div>
                  <div class="form-group">
                    <label>Job Title</label>
                    <input type="text" name="job_title" placeholder="e.g. Software Engineer" class="form-control">
                  </div>
                  <div class="form-group">
                    <label>Employment Type</label>
                    <select name="employment_type" class="form-control">
                      <option value="full_time">Full-Time</option>
                      <option value="part_time">Part-Time</option>
                      <option value="temp">Temporary</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>FLSA Status</label>
                    <select name="flsa_status" class="form-control">
                      <option value="non_exempt">Non-Exempt</option>
                      <option value="exempt">Exempt</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Pay Type <span class="req">*</span></label>
                    <select name="pay_type" required class="form-control">
                      <option value="hourly">Hourly</option>
                      <option value="salary">Salary</option>
                    </select>
                  </div>
                  <div class="form-group" id="empPayRateGroup">
                    <label id="empPayRateLabel">Pay Rate ($/hr) <span class="req">*</span></label>
                    <input type="number" name="pay_rate" min="0" step="0.01" placeholder="0.00" class="form-control">
                    <span class="field-warning" id="empMinWageWarning" style="display:none;"></span>
                  </div>
                  <div class="form-group" id="empAnnualSalaryGroup">
                    <label>Annual Salary ($)</label>
                    <input type="number" name="annual_salary" min="0" step="0.01" placeholder="Computed from pay rate" class="form-control">
                    <span class="field-hint" id="empSalaryHint">Auto-calculated for hourly (rate x 2080 hrs)</span>
                  </div>
                  <div class="form-group">
                    <label>Pay Frequency</label>
                    <select name="pay_frequency" class="form-control">
                      <option value="weekly">Weekly</option>
                      <option value="bi_weekly" selected>Bi-Weekly</option>
                      <option value="semi_monthly">Semi-Monthly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- ── FEDERAL W-4 ── -->
              <div class="tab-panel" id="empTab-federalw4">
                <div class="form-section-title" style="font-size:14px;font-weight:700;color:#1a2332;margin:0 0 12px;padding-bottom:8px;border-bottom:1px solid #f3f4f6;">2020+ W-4 Form</div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Filing Status</label>
                    <select name="w4_federal.filing_status" class="form-control">
                      <option value="single">Single or Married Filing Separately</option>
                      <option value="married_filing_jointly">Married Filing Jointly</option>
                      <option value="head_of_household">Head of Household</option>
                    </select>
                  </div>
                  <div class="form-group checkbox-group" style="flex-direction:row;align-items:center;gap:8px;">
                    <input type="checkbox" name="w4_federal.multiple_jobs" id="empFedMultipleJobs"
                           style="width:16px;height:16px;accent-color:#2563eb;">
                    <label for="empFedMultipleJobs" style="text-transform:none;font-size:13px;font-weight:500;">Step 2: Multiple Jobs or Spouse Works</label>
                  </div>
                  <div class="form-group">
                    <label>Step 3: Dependents Credit ($)</label>
                    <input type="number" name="w4_federal.dependents_credit" min="0" step="1" value="0" class="form-control">
                    <span class="field-hint">Total amount from Step 3 of W-4</span>
                  </div>
                  <div class="form-group">
                    <label>Step 4a: Other Income ($)</label>
                    <input type="number" name="w4_federal.other_income" min="0" step="1" value="0" class="form-control">
                  </div>
                  <div class="form-group">
                    <label>Step 4b: Deductions ($)</label>
                    <input type="number" name="w4_federal.deductions" min="0" step="1" value="0" class="form-control">
                    <span class="field-hint">Amount over standard deduction</span>
                  </div>
                  <div class="form-group">
                    <label>Step 4c: Extra Withholding ($)</label>
                    <input type="number" name="w4_federal.extra_withholding" min="0" step="0.01" value="0" class="form-control">
                  </div>
                </div>
              </div>

              <!-- ── STATE TAX FORM ── -->
              <div class="tab-panel" id="empTab-statew4">
                <div id="empStateTaxContent">
                  <div class="no-state-tax-msg" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:24px;text-align:center;color:#166534;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:40px;height:40px;margin-bottom:8px;color:#22c55e;"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
                    <h4 style="font-size:15px;margin-bottom:4px;">Select a Work State First</h4>
                    <p style="font-size:13px;color:#4ade80;">Go to the Work Info tab and select a work state to see the state tax form.</p>
                  </div>
                </div>
              </div>

              <!-- ── DEDUCTIONS ── -->
              <div class="tab-panel" id="empTab-deductions">
                <div class="form-section-title" style="font-size:14px;font-weight:700;color:#1a2332;margin:0 0 12px;padding-bottom:8px;border-bottom:1px solid #f3f4f6;">Retirement</div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Traditional 401(k) (%)</label>
                    <input type="number" name="deductions.retirement_401k_pct" min="0" max="100" step="0.5" value="0" class="form-control">
                    <span class="field-hint">Percentage of gross pay</span>
                  </div>
                  <div class="form-group">
                    <label>Roth 401(k) (%)</label>
                    <input type="number" name="deductions.roth_401k_pct" min="0" max="100" step="0.5" value="0" class="form-control">
                    <span class="field-hint">Percentage of gross pay (post-tax)</span>
                  </div>
                </div>

                <div class="form-section-title" style="font-size:14px;font-weight:700;color:#1a2332;margin:20px 0 12px;padding-bottom:8px;border-bottom:1px solid #f3f4f6;">Health Benefits ($ per pay period)</div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Health Insurance</label>
                    <input type="number" name="deductions.health_insurance" min="0" step="0.01" value="0" class="form-control">
                  </div>
                  <div class="form-group">
                    <label>Dental Insurance</label>
                    <input type="number" name="deductions.dental_insurance" min="0" step="0.01" value="0" class="form-control">
                  </div>
                  <div class="form-group">
                    <label>Vision Insurance</label>
                    <input type="number" name="deductions.vision_insurance" min="0" step="0.01" value="0" class="form-control">
                  </div>
                </div>

                <div class="form-section-title" style="font-size:14px;font-weight:700;color:#1a2332;margin:20px 0 12px;padding-bottom:8px;border-bottom:1px solid #f3f4f6;">Tax-Advantaged Accounts ($ per pay period)</div>
                <div class="form-row">
                  <div class="form-group">
                    <label>HSA Contribution</label>
                    <input type="number" name="deductions.hsa_contribution" min="0" step="0.01" value="0" class="form-control">
                    <span class="field-hint">Health Savings Account</span>
                  </div>
                  <div class="form-group">
                    <label>FSA Contribution</label>
                    <input type="number" name="deductions.fsa_contribution" min="0" step="0.01" value="0" class="form-control">
                    <span class="field-hint">Flexible Spending Account</span>
                  </div>
                </div>
              </div>

            </form>
          </div>

          <div class="modal-footer">
            <div class="modal-footer-left" style="display:flex;gap:8px;">
              <button class="btn btn-danger" id="empBtnDelete" style="display:none;">Deactivate</button>
            </div>
            <div class="modal-footer-right" style="display:flex;gap:8px;">
              <button class="btn btn-secondary" id="empBtnCancel">Cancel</button>
              <button class="btn btn-primary" id="empBtnSave">Save Employee</button>
            </div>
          </div>
        </div>
      </div>
    `;

    /* ── sync global state filter ── */
    const globalState = window.AppState.get('selectedState');
    if (globalState) {
      const filterStateEl = document.getElementById('empFilterState');
      if (filterStateEl) filterStateEl.value = globalState;
    }

    /* ── bind events ── */
    self._bindEvents();
    self._setDefaultDates();

    /* ── initial data load ── */
    await self._loadEmployees();
  },

  /* ═══════════════════════════════════════════════════
     EVENT BINDING
     ═══════════════════════════════════════════════════ */
  _bindEvents() {
    const self = this;

    document.getElementById('empSearchInput').addEventListener('input', () => self._renderTable());
    document.getElementById('empFilterStatus').addEventListener('change', () => self._renderTable());
    document.getElementById('empFilterState').addEventListener('change', () => self._renderTable());
    document.getElementById('btnAddEmployee').addEventListener('click', () => self._openAddModal());
    const btnEmpty = document.getElementById('btnAddEmployeeEmpty');
    if (btnEmpty) btnEmpty.addEventListener('click', () => self._openAddModal());

    /* Tab switching */
    document.querySelectorAll('#empFormTabs .tab-btn').forEach(btn => {
      btn.addEventListener('click', () => self._switchTab(btn.dataset.tab));
    });

    /* Pay type toggle */
    const form = document.getElementById('empForm');
    form.querySelector('[name="pay_type"]').addEventListener('change', () => self._handlePayTypeChange());

    /* Pay rate live validation */
    form.querySelector('[name="pay_rate"]').addEventListener('input', () => {
      self._checkMinWageLive();
      self._autoCalcSalary();
    });
    form.querySelector('[name="work_state"]').addEventListener('change', () => {
      self._checkMinWageLive();
      self._updateStateTaxForm();
    });
    form.querySelector('[name="work_city"]').addEventListener('input', () => self._checkMinWageLive());

    /* Modal close */
    document.getElementById('empModalCloseX').addEventListener('click', () => self._closeModal());
    document.getElementById('empBtnCancel').addEventListener('click', () => self._closeModal());
    document.getElementById('empModal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) self._closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') self._closeModal();
    });

    /* Save / Delete */
    document.getElementById('empBtnSave').addEventListener('click', () => self._saveEmployee());
    document.getElementById('empBtnDelete').addEventListener('click', () => self._deleteEmployee());
  },

  _setDefaultDates() {
    const today = new Date().toISOString().slice(0, 10);
    const form = document.getElementById('empForm');
    if (form) {
      const hireDateInput = form.querySelector('[name="hire_date"]');
      if (hireDateInput) hireDateInput.value = today;
    }
  },


  /* ═══════════════════════════════════════════════════
     API CALLS
     ═══════════════════════════════════════════════════ */
  async _loadEmployees() {
    const { showToast } = window.Utils;
    try {
      const data = await window.API.get('/employees');
      this._allEmployees = data.employees || data || [];
      this._renderTable();
    } catch (err) {
      showToast('Failed to load employees: ' + err.message, 'error');
      this._allEmployees = [];
      this._renderTable();
    }
  },


  /* ═══════════════════════════════════════════════════
     RENDER TABLE
     ═══════════════════════════════════════════════════ */
  _renderTable() {
    const { esc } = window.Utils;
    const searchEl = document.getElementById('empSearchInput');
    const statusEl = document.getElementById('empFilterStatus');
    const stateEl  = document.getElementById('empFilterState');
    if (!searchEl || !statusEl || !stateEl) return;

    const search = searchEl.value.toLowerCase().trim();
    const statusFilter = statusEl.value;
    const stateFilter = stateEl.value;

    let filtered = this._allEmployees;

    if (statusFilter) {
      filtered = filtered.filter(e => (e.status || 'active') === statusFilter);
    }
    if (stateFilter) {
      filtered = filtered.filter(e => e.work_state === stateFilter);
    }
    if (search) {
      filtered = filtered.filter(e =>
        (e.employee_id || '').toLowerCase().includes(search) ||
        (e.first_name || '').toLowerCase().includes(search) ||
        (e.last_name || '').toLowerCase().includes(search) ||
        (e.department || '').toLowerCase().includes(search) ||
        (e.job_title || '').toLowerCase().includes(search)
      );
    }

    const countEl = document.getElementById('empCount');
    if (countEl) countEl.textContent = filtered.length;

    const tbody = document.getElementById('empTableBody');
    const emptyState = document.getElementById('empEmptyState');
    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }
    if (emptyState) emptyState.style.display = 'none';

    const self = this;
    tbody.innerHTML = filtered.map(emp => {
      const status = emp.status || 'active';
      const payDisplay = emp.pay_type === 'hourly'
        ? `$${Number(emp.pay_rate).toFixed(2)}/hr`
        : `$${Number(emp.annual_salary).toLocaleString()}/yr`;

      return `
        <tr>
          <td><span style="font-weight:600;color:#2563eb;">${esc(emp.employee_id)}</span></td>
          <td><span class="emp-name" style="font-weight:600;color:#1a2332;">${esc(emp.first_name)} ${esc(emp.last_name)}</span></td>
          <td><span class="badge badge-state">${esc(emp.work_state)}</span></td>
          <td>${esc(emp.department || '-')}</td>
          <td>${esc(emp.job_title || '-')}</td>
          <td>${emp.pay_type === 'hourly' ? 'Hourly' : 'Salary'}</td>
          <td>${payDisplay}</td>
          <td><span class="badge ${status === 'active' ? 'badge-active' : 'badge-inactive'}">${self._capitalize(status)}</span></td>
          <td>
            <div class="actions-cell" style="display:flex;gap:6px;">
              <button class="btn btn-secondary btn-sm" data-edit-id="${esc(emp.employee_id)}" title="View/Edit">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Edit
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');

    /* Bind edit buttons via delegation */
    tbody.querySelectorAll('[data-edit-id]').forEach(btn => {
      btn.addEventListener('click', () => self._viewEmployee(btn.dataset.editId));
    });
  },


  /* ═══════════════════════════════════════════════════
     MODAL MANAGEMENT
     ═══════════════════════════════════════════════════ */
  _openAddModal() {
    this._editingId = null;
    document.getElementById('empModalTitle').textContent = 'Add Employee';
    document.getElementById('empBtnDelete').style.display = 'none';
    document.getElementById('empBtnSave').textContent = 'Save Employee';
    this._resetForm();
    this._setDefaultDates();
    this._switchTab('personal');
    this._clearModalAlerts();
    document.getElementById('empModal').classList.add('open');
  },

  async _viewEmployee(id) {
    const { showToast } = window.Utils;
    try {
      const data = await window.API.get(`/employees/${id}`);
      const emp = data.employee || data;
      this._editingId = emp.employee_id;
      document.getElementById('empModalTitle').textContent = `Edit: ${emp.first_name} ${emp.last_name}`;
      document.getElementById('empBtnDelete').style.display =
        (emp.status || 'active') === 'active' ? 'inline-flex' : 'none';
      document.getElementById('empBtnSave').textContent = 'Update Employee';
      this._populateForm(emp);
      this._switchTab('personal');
      this._clearModalAlerts();
      document.getElementById('empModal').classList.add('open');
    } catch (err) {
      showToast('Failed to load employee: ' + err.message, 'error');
    }
  },

  _closeModal() {
    const modal = document.getElementById('empModal');
    if (modal) modal.classList.remove('open');
    this._editingId = null;
  },

  _switchTab(tabId) {
    document.querySelectorAll('#empFormTabs .tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    document.querySelectorAll('#empForm .tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `empTab-${tabId}`);
    });
  },

  _resetForm() {
    const form = document.getElementById('empForm');
    if (!form) return;
    form.reset();

    /* Reset specific defaults */
    form.querySelector('[name="employment_type"]').value = 'full_time';
    form.querySelector('[name="flsa_status"]').value = 'non_exempt';
    form.querySelector('[name="pay_type"]').value = 'hourly';
    form.querySelector('[name="pay_frequency"]').value = 'bi_weekly';
    form.querySelector('[name="w4_federal.filing_status"]').value = 'single';

    /* Clear number fields to 0 */
    form.querySelectorAll('input[type="number"]').forEach(input => {
      input.value = (input.name.includes('pay_rate') || input.name.includes('annual_salary')) ? '' : '0';
    });

    /* Reset validation states */
    form.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    form.querySelectorAll('.field-error.dynamic-error').forEach(el => el.remove());

    const minWageEl = document.getElementById('empMinWageWarning');
    if (minWageEl) minWageEl.style.display = 'none';

    this._handlePayTypeChange();
    this._updateStateTaxForm();
  },

  _populateForm(emp) {
    const form = document.getElementById('empForm');
    this._resetForm();

    /* Flat fields */
    const flatFields = [
      'first_name', 'last_name', 'ssn_last4', 'date_of_birth', 'hire_date',
      'work_state', 'work_city', 'department', 'job_title',
      'employment_type', 'flsa_status', 'pay_type', 'pay_rate',
      'annual_salary', 'pay_frequency'
    ];
    flatFields.forEach(field => {
      const input = form.querySelector(`[name="${field}"]`);
      if (input && emp[field] != null) {
        input.value = emp[field];
      }
    });

    /* W4 Federal */
    if (emp.w4_federal) {
      const w4 = emp.w4_federal;
      this._setVal('w4_federal.filing_status', w4.filing_status || 'single');
      this._setChecked('w4_federal.multiple_jobs', w4.multiple_jobs || false);
      this._setVal('w4_federal.dependents_credit', w4.dependents_credit || 0);
      this._setVal('w4_federal.other_income', w4.other_income || 0);
      this._setVal('w4_federal.deductions', w4.deductions || 0);
      this._setVal('w4_federal.extra_withholding', w4.extra_withholding || 0);
    }

    /* Deductions */
    if (emp.deductions) {
      const d = emp.deductions;
      this._setVal('deductions.retirement_401k_pct', d.retirement_401k_pct || 0);
      this._setVal('deductions.roth_401k_pct', d.roth_401k_pct || 0);
      this._setVal('deductions.health_insurance', d.health_insurance || 0);
      this._setVal('deductions.dental_insurance', d.dental_insurance || 0);
      this._setVal('deductions.vision_insurance', d.vision_insurance || 0);
      this._setVal('deductions.hsa_contribution', d.hsa_contribution || 0);
      this._setVal('deductions.fsa_contribution', d.fsa_contribution || 0);
    }

    this._handlePayTypeChange();
    this._updateStateTaxForm();

    /* Populate state W4 after the form is rendered */
    if (emp.w4_state) {
      const self = this;
      setTimeout(() => self._populateStateW4(emp.w4_state), 50);
    }
  },

  _populateStateW4(w4State) {
    if (!w4State) return;
    const container = document.getElementById('empStateTaxContent');
    if (!container) return;

    if (w4State.filing_status) {
      const fs = container.querySelector('[name="w4_state.filing_status"]');
      if (fs) fs.value = w4State.filing_status;
    }
    if (w4State.allowances != null) {
      const al = container.querySelector('[name="w4_state.allowances"]');
      if (al) al.value = w4State.allowances;
    }
    if (w4State.additional_withholding != null) {
      const aw = container.querySelector('[name="w4_state.additional_withholding"]');
      if (aw) aw.value = w4State.additional_withholding;
    }
    if (w4State.nyc_resident != null) {
      const nyc = container.querySelector('[name="w4_state.nyc_resident"]');
      if (nyc) nyc.checked = w4State.nyc_resident;
    }
    if (w4State.yonkers_resident != null) {
      const yon = container.querySelector('[name="w4_state.yonkers_resident"]');
      if (yon) yon.checked = w4State.yonkers_resident;
    }
  },


  /* ═══════════════════════════════════════════════════
     FORM HELPERS
     ═══════════════════════════════════════════════════ */
  _setVal(name, value) {
    const el = document.querySelector(`#empForm [name="${name}"]`);
    if (el) el.value = value;
  },

  _setChecked(name, checked) {
    const el = document.querySelector(`#empForm [name="${name}"]`);
    if (el) el.checked = checked;
  },

  _getVal(name) {
    const el = document.querySelector(`#empForm [name="${name}"]`);
    if (!el) return undefined;
    if (el.type === 'checkbox') return el.checked;
    return el.value;
  },

  _getNum(name) {
    return parseFloat(this._getVal(name)) || 0;
  },

  _handlePayTypeChange() {
    const payType = this._getVal('pay_type');
    const rateLabel = document.getElementById('empPayRateLabel');
    const salaryInput = document.querySelector('#empForm [name="annual_salary"]');
    const salaryHint = document.getElementById('empSalaryHint');

    if (payType === 'hourly') {
      if (rateLabel) rateLabel.innerHTML = 'Pay Rate ($/hr) <span class="req">*</span>';
      if (salaryInput) {
        salaryInput.readOnly = true;
        salaryInput.classList.add('computed-field');
      }
      if (salaryHint) salaryHint.textContent = 'Auto-calculated: rate x 2080 hrs';
      this._autoCalcSalary();
    } else {
      if (rateLabel) rateLabel.innerHTML = 'Pay Rate ($/period)';
      if (salaryInput) {
        salaryInput.readOnly = false;
        salaryInput.classList.remove('computed-field');
      }
      if (salaryHint) salaryHint.textContent = 'Enter the annual salary amount';
    }
    this._checkMinWageLive();
  },

  _autoCalcSalary() {
    if (this._getVal('pay_type') !== 'hourly') return;
    const rate = this._getNum('pay_rate');
    const annual = rate > 0 ? (rate * 2080).toFixed(2) : '';
    const salaryInput = document.querySelector('#empForm [name="annual_salary"]');
    if (salaryInput) salaryInput.value = annual;
  },

  _checkMinWageLive() {
    const state = this._getVal('work_state');
    const rate = this._getNum('pay_rate');
    const payType = this._getVal('pay_type');
    const warningEl = document.getElementById('empMinWageWarning');
    if (!warningEl) return;

    if (!state || !rate || payType !== 'hourly') {
      warningEl.style.display = 'none';
      return;
    }

    const minWage = this.MIN_WAGES[state] || 7.25;
    if (rate < minWage) {
      warningEl.textContent = `Below ${state} minimum wage of $${minWage.toFixed(2)}/hr`;
      warningEl.className = 'field-error';
      warningEl.style.display = 'block';
    } else if (rate < minWage * 1.05) {
      warningEl.textContent = `Within 5% of ${state} minimum wage ($${minWage.toFixed(2)}/hr)`;
      warningEl.className = 'field-warning';
      warningEl.style.display = 'block';
    } else {
      warningEl.style.display = 'none';
    }
  },


  /* ═══════════════════════════════════════════════════
     DYNAMIC STATE TAX FORM
     ═══════════════════════════════════════════════════ */
  _updateStateTaxForm() {
    const state = this._getVal('work_state');
    const container = document.getElementById('empStateTaxContent');
    if (!container) return;

    const noTaxMsgStyle = 'background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:24px;text-align:center;color:#166534;';
    const sectionTitleStyle = 'font-size:14px;font-weight:700;color:#1a2332;margin:0 0 12px;padding-bottom:8px;border-bottom:1px solid #f3f4f6;';

    if (!state) {
      container.innerHTML = `
        <div class="no-state-tax-msg" style="${noTaxMsgStyle}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:40px;height:40px;margin-bottom:8px;color:#22c55e;"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
          <h4 style="font-size:15px;margin-bottom:4px;">Select a Work State First</h4>
          <p style="font-size:13px;color:#4ade80;">Go to the Work Info tab and select a work state to see the state tax form.</p>
        </div>`;
      return;
    }

    if (this.NO_STATE_INCOME_TAX.includes(state)) {
      container.innerHTML = `
        <div class="no-state-tax-msg" style="${noTaxMsgStyle}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:40px;height:40px;margin-bottom:8px;color:#22c55e;"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
          <h4 style="font-size:15px;margin-bottom:4px;">No State Income Tax</h4>
          <p style="font-size:13px;color:#4ade80;">${this.STATE_NAMES[state]} does not have a state income tax. No state withholding form is required.</p>
        </div>`;
      return;
    }

    if (state === 'CA') {
      container.innerHTML = `
        <div class="form-section-title" style="${sectionTitleStyle}">California DE-4 - Employee's Withholding Allowance Certificate</div>
        <div class="form-row">
          <div class="form-group">
            <label>Filing Status</label>
            <select name="w4_state.filing_status" class="form-control">
              <option value="single">Single or Married (with two or more incomes)</option>
              <option value="married">Married (one income)</option>
              <option value="head_of_household">Head of Household</option>
            </select>
          </div>
          <div class="form-group">
            <label>Number of Allowances</label>
            <input type="number" name="w4_state.allowances" min="0" step="1" value="1" class="form-control">
            <span class="field-hint">From DE-4 worksheet</span>
          </div>
          <div class="form-group">
            <label>Additional Withholding ($)</label>
            <input type="number" name="w4_state.additional_withholding" min="0" step="0.01" value="0" class="form-control">
          </div>
        </div>`;
      return;
    }

    if (state === 'NY') {
      container.innerHTML = `
        <div class="form-section-title" style="${sectionTitleStyle}">New York IT-2104 - Employee's Withholding Allowance Certificate</div>
        <div class="form-row">
          <div class="form-group">
            <label>Filing Status</label>
            <select name="w4_state.filing_status" class="form-control">
              <option value="single">Single</option>
              <option value="married">Married</option>
            </select>
          </div>
          <div class="form-group">
            <label>Number of Allowances</label>
            <input type="number" name="w4_state.allowances" min="0" step="1" value="1" class="form-control">
          </div>
          <div class="form-group">
            <label>Additional Withholding ($)</label>
            <input type="number" name="w4_state.additional_withholding" min="0" step="0.01" value="0" class="form-control">
          </div>
          <div class="form-group checkbox-group" style="flex-direction:row;align-items:center;gap:8px;">
            <input type="checkbox" name="w4_state.nyc_resident" id="empNycResident"
                   style="width:16px;height:16px;accent-color:#2563eb;">
            <label for="empNycResident" style="text-transform:none;font-size:13px;font-weight:500;">NYC Resident (subject to NYC income tax)</label>
          </div>
          <div class="form-group checkbox-group" style="flex-direction:row;align-items:center;gap:8px;">
            <input type="checkbox" name="w4_state.yonkers_resident" id="empYonkersResident"
                   style="width:16px;height:16px;accent-color:#2563eb;">
            <label for="empYonkersResident" style="text-transform:none;font-size:13px;font-weight:500;">Yonkers Resident (subject to Yonkers surcharge)</label>
          </div>
        </div>`;
      return;
    }

    if (state === 'GA') {
      container.innerHTML = `
        <div class="form-section-title" style="${sectionTitleStyle}">Georgia G-4 - Employee Withholding Certificate</div>
        <div class="form-row">
          <div class="form-group">
            <label>Filing Status</label>
            <select name="w4_state.filing_status" class="form-control">
              <option value="single">Single</option>
              <option value="married_filing_jointly">Married Filing Jointly</option>
              <option value="married_filing_separately">Married Filing Separately</option>
              <option value="head_of_household">Head of Household</option>
            </select>
          </div>
          <div class="form-group">
            <label>Number of Allowances</label>
            <input type="number" name="w4_state.allowances" min="0" step="1" value="1" class="form-control">
          </div>
          <div class="form-group">
            <label>Additional Withholding ($)</label>
            <input type="number" name="w4_state.additional_withholding" min="0" step="0.01" value="0" class="form-control">
          </div>
        </div>`;
      return;
    }
  },


  /* ═══════════════════════════════════════════════════
     COMPLIANCE CHECKS (client-side pre-save)
     ═══════════════════════════════════════════════════ */
  _runComplianceChecks() {
    const warnings = [];
    const errors = [];

    const state       = this._getVal('work_state');
    const payType     = this._getVal('pay_type');
    const payRate     = this._getNum('pay_rate');
    const annualSalary = this._getNum('annual_salary');
    const flsa        = this._getVal('flsa_status');

    /* Minimum wage check for hourly */
    if (payType === 'hourly' && state && payRate > 0) {
      const minWage = this.MIN_WAGES[state] || 7.25;
      if (payRate < minWage) {
        errors.push(`Hourly rate $${payRate.toFixed(2)} is below the ${state} minimum wage of $${minWage.toFixed(2)}/hr.`);
      } else if (payRate < minWage * 1.05) {
        warnings.push(`Hourly rate $${payRate.toFixed(2)} is within 5% of the ${state} minimum wage ($${minWage.toFixed(2)}/hr).`);
      }
    }

    /* Minimum wage check for salary */
    if (payType === 'salary' && state && annualSalary > 0) {
      const effectiveHourly = annualSalary / 2080;
      const minWage = this.MIN_WAGES[state] || 7.25;
      if (effectiveHourly < minWage) {
        errors.push(`Annual salary $${annualSalary.toLocaleString()} converts to $${effectiveHourly.toFixed(2)}/hr, which is below the minimum wage of $${minWage.toFixed(2)}/hr.`);
      }
    }

    /* Exempt classification check */
    if (flsa === 'exempt') {
      if (payType === 'hourly') {
        errors.push('Exempt employees must generally be paid on a salary basis, not hourly.');
      }
      if (state && annualSalary > 0) {
        const threshold = this.EXEMPT_THRESHOLDS[state] || 35568;
        if (annualSalary < threshold) {
          errors.push(`Annual salary $${annualSalary.toLocaleString()} is below the ${state} exempt salary threshold of $${threshold.toLocaleString()}.`);
        }
      }
    }

    /* 401k total check */
    const total401k = this._getNum('deductions.retirement_401k_pct') + this._getNum('deductions.roth_401k_pct');
    if (total401k > 100) {
      errors.push('Combined 401(k) contributions cannot exceed 100% of gross pay.');
    } else if (total401k > 75) {
      warnings.push('Combined 401(k) contributions exceed 75% of gross pay. Please verify this is intentional.');
    }

    return { warnings, errors };
  },

  _clearModalAlerts() {
    const el = document.getElementById('empModalAlerts');
    if (el) el.innerHTML = '';
  },

  _showModalAlerts(warnings, errors) {
    const container = document.getElementById('empModalAlerts');
    if (!container) return;
    let html = '';

    if (errors.length > 0) {
      html += `
        <div class="alert-bar alert-error" style="padding:12px 18px;border-radius:10px;font-size:13px;font-weight:500;display:flex;align-items:flex-start;gap:10px;margin-bottom:16px;background:#fef2f2;border:1px solid #fecaca;color:#991b1b;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;flex-shrink:0;margin-top:1px;"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
          <div>
            <strong>Compliance Errors</strong>
            <ul style="list-style:none;margin-top:6px;padding-left:0;">${errors.map(e => `<li style="padding:2px 0;">&#8226; ${e}</li>`).join('')}</ul>
          </div>
        </div>`;
    }

    if (warnings.length > 0) {
      html += `
        <div class="alert-bar alert-warning" style="padding:12px 18px;border-radius:10px;font-size:13px;font-weight:500;display:flex;align-items:flex-start;gap:10px;margin-bottom:16px;background:#fffbeb;border:1px solid #fde68a;color:#92400e;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;flex-shrink:0;margin-top:1px;"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>
          <div>
            <strong>Compliance Warnings</strong>
            <ul style="list-style:none;margin-top:6px;padding-left:0;">${warnings.map(w => `<li style="padding:2px 0;">&#8226; ${w}</li>`).join('')}</ul>
          </div>
        </div>`;
    }

    container.innerHTML = html;
  },


  /* ═══════════════════════════════════════════════════
     FORM VALIDATION
     ═══════════════════════════════════════════════════ */
  _validateForm() {
    const errors = {};
    const self = this;

    const firstName    = (self._getVal('first_name') || '').trim();
    const lastName     = (self._getVal('last_name') || '').trim();
    const hireDate     = self._getVal('hire_date');
    const workState    = self._getVal('work_state');
    const payType      = self._getVal('pay_type');
    const payRate      = self._getNum('pay_rate');
    const annualSalary = self._getNum('annual_salary');
    const ssn          = (self._getVal('ssn_last4') || '').trim();

    if (!firstName) errors.first_name = 'First name is required';
    if (!lastName) errors.last_name = 'Last name is required';
    if (!hireDate) errors.hire_date = 'Hire date is required';
    if (!workState) errors.work_state = 'Work state is required';
    if (ssn && !/^\d{4}$/.test(ssn)) errors.ssn_last4 = 'Must be exactly 4 digits';

    if (payType === 'hourly' && payRate <= 0) {
      errors.pay_rate = 'Pay rate must be greater than 0';
    }
    if (payType === 'salary' && annualSalary <= 0) {
      errors.annual_salary = 'Annual salary must be greater than 0';
    }

    /* Clear previous error styling */
    const form = document.getElementById('empForm');
    form.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    form.querySelectorAll('.field-error.dynamic-error').forEach(el => el.remove());

    /* Track which tab has errors */
    const tabErrors = { personal: false, work: false, federalw4: false, statew4: false, deductions: false };

    for (const [field, msg] of Object.entries(errors)) {
      const input = form.querySelector(`[name="${field}"]`);
      if (input) {
        input.classList.add('input-error');
        const errEl = document.createElement('span');
        errEl.className = 'field-error dynamic-error';
        errEl.textContent = msg;
        input.parentNode.appendChild(errEl);

        /* Determine which tab this field belongs to */
        const panel = input.closest('.tab-panel');
        if (panel) {
          const tabId = panel.id.replace('empTab-', '');
          tabErrors[tabId] = true;
        }
      }
    }

    /* Mark tabs with errors */
    document.querySelectorAll('#empFormTabs .tab-btn').forEach(btn => {
      btn.classList.toggle('tab-error', tabErrors[btn.dataset.tab] === true);
    });

    /* Switch to first tab with errors */
    if (Object.keys(errors).length > 0) {
      for (const tab of ['personal', 'work', 'federalw4', 'statew4', 'deductions']) {
        if (tabErrors[tab]) {
          self._switchTab(tab);
          break;
        }
      }
    }

    return Object.keys(errors).length === 0;
  },


  /* ═══════════════════════════════════════════════════
     SAVE EMPLOYEE
     ═══════════════════════════════════════════════════ */
  async _saveEmployee() {
    const self = this;
    const { showToast } = window.Utils;

    self._clearModalAlerts();

    if (!self._validateForm()) return;

    /* Run compliance checks */
    const { warnings, errors: compErrors } = self._runComplianceChecks();

    if (compErrors.length > 0) {
      self._showModalAlerts(warnings, compErrors);
      /* Scroll modal body to top */
      const modalBody = document.querySelector('#empModal .modal-body');
      if (modalBody) modalBody.scrollTop = 0;

      /* Allow override with confirmation */
      if (!confirm('There are compliance errors. Do you want to save anyway?')) {
        return;
      }
    } else if (warnings.length > 0) {
      self._showModalAlerts(warnings, []);
      const modalBody = document.querySelector('#empModal .modal-body');
      if (modalBody) modalBody.scrollTop = 0;
    }

    /* Build payload */
    const state = self._getVal('work_state');
    const payload = {
      first_name:       self._getVal('first_name').trim(),
      last_name:        self._getVal('last_name').trim(),
      ssn_last4:        (self._getVal('ssn_last4') || '').trim(),
      date_of_birth:    self._getVal('date_of_birth') || null,
      hire_date:        self._getVal('hire_date'),
      work_state:       state,
      work_city:        (self._getVal('work_city') || '').trim(),
      department:       (self._getVal('department') || '').trim(),
      job_title:        (self._getVal('job_title') || '').trim(),
      employment_type:  self._getVal('employment_type'),
      flsa_status:      self._getVal('flsa_status'),
      pay_type:         self._getVal('pay_type'),
      pay_rate:         self._getNum('pay_rate'),
      annual_salary:    self._getNum('annual_salary'),
      pay_frequency:    self._getVal('pay_frequency'),
      w4_federal: {
        filing_status:     self._getVal('w4_federal.filing_status'),
        multiple_jobs:     self._getVal('w4_federal.multiple_jobs'),
        dependents_credit: self._getNum('w4_federal.dependents_credit'),
        other_income:      self._getNum('w4_federal.other_income'),
        deductions:        self._getNum('w4_federal.deductions'),
        extra_withholding: self._getNum('w4_federal.extra_withholding'),
      },
      deductions: {
        retirement_401k_pct: self._getNum('deductions.retirement_401k_pct'),
        roth_401k_pct:       self._getNum('deductions.roth_401k_pct'),
        health_insurance:    self._getNum('deductions.health_insurance'),
        dental_insurance:    self._getNum('deductions.dental_insurance'),
        vision_insurance:    self._getNum('deductions.vision_insurance'),
        hsa_contribution:    self._getNum('deductions.hsa_contribution'),
        fsa_contribution:    self._getNum('deductions.fsa_contribution'),
      },
    };

    /* State W4 (only for states with income tax) */
    if (!self.NO_STATE_INCOME_TAX.includes(state)) {
      const stateW4 = {
        filing_status:          self._getVal('w4_state.filing_status') || 'single',
        allowances:             parseInt(self._getVal('w4_state.allowances') || '1', 10),
        additional_withholding: self._getNum('w4_state.additional_withholding'),
      };
      if (state === 'CA') stateW4.form = 'DE-4';
      if (state === 'NY') {
        stateW4.form = 'IT-2104';
        stateW4.nyc_resident = self._getVal('w4_state.nyc_resident') || false;
        stateW4.yonkers_resident = self._getVal('w4_state.yonkers_resident') || false;
      }
      if (state === 'GA') stateW4.form = 'G-4';
      payload.w4_state = stateW4;
    } else {
      payload.w4_state = null;
    }

    /* Determine add vs update */
    const btnSave = document.getElementById('empBtnSave');
    btnSave.disabled = true;
    btnSave.textContent = 'Saving...';

    try {
      if (self._editingId) {
        await window.API.put(`/employees/${self._editingId}`, payload);
        showToast(`Employee ${payload.first_name} ${payload.last_name} updated successfully.`, 'success');
      } else {
        await window.API.post('/employees', payload);
        showToast(`Employee ${payload.first_name} ${payload.last_name} added successfully.`, 'success');
      }
      self._closeModal();
      await self._loadEmployees();
    } catch (err) {
      showToast('Save failed: ' + err.message, 'error');
    } finally {
      btnSave.disabled = false;
      btnSave.textContent = self._editingId ? 'Update Employee' : 'Save Employee';
    }
  },

  async _deleteEmployee() {
    const self = this;
    const { showToast } = window.Utils;

    if (!self._editingId) return;
    if (!confirm('Are you sure you want to deactivate this employee? They will be marked as inactive.')) return;

    try {
      await window.API.delete(`/employees/${self._editingId}`);
      showToast('Employee deactivated.', 'success');
      self._closeModal();
      await self._loadEmployees();
    } catch (err) {
      showToast('Deactivation failed: ' + err.message, 'error');
    }
  },


  /* ═══════════════════════════════════════════════════
     UTILITIES
     ═══════════════════════════════════════════════════ */
  _capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
  }
};
