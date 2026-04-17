/* ═══════════════════════════════════════════════════
   PAGE: Payroll — Pay Run Wizard (4-step)
   ═══════════════════════════════════════════════════ */
window.Page_payroll = {

  async render(container) {
    const { fmt, fmtDate, esc, $, showToast, dl } = window.Utils;
    const API = window.API;

    // ── Module-scoped state ──────────────────────────
    let allPayRuns  = [];
    let allEmployees = [];
    let currentRun   = null;
    let currentStubs = [];
    let wizardStep   = 1;
    let currentView  = 'list';          // 'list' | 'wizard'

    const selectedState = () => window.AppState.get('selectedState');

    // ── Badge helper ─────────────────────────────────
    function badgeHTML(status) {
      return `<span class="badge badge-${esc(status)}">${esc(status)}</span>`;
    }

    // ════════════════════════════════════════════════════
    // RENDER SHELL
    // ════════════════════════════════════════════════════
    container.innerHTML = `
      <!-- LIST MODE -->
      <div id="pr-listMode">
        <div class="page-header">
          <div>
            <div class="page-title">Pay Runs</div>
            <span id="pr-runCount" class="count-badge">0</span>
          </div>
          <button class="btn btn-primary" id="pr-btnNew">+ New Pay Run</button>
        </div>
        <div class="card">
          <div class="card-body" style="padding:0;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>State</th>
                  <th>Period</th>
                  <th>Pay Date</th>
                  <th>Status</th>
                  <th class="num">Employees</th>
                  <th class="num">Gross Total</th>
                  <th class="num">Net Total</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="pr-runTableBody"></tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- WIZARD MODE -->
      <div id="pr-wizardMode" class="hidden">
        <div class="page-header">
          <div style="display:flex;align-items:center;gap:12px;">
            <button class="btn btn-outline btn-sm" id="pr-btnBackList" title="Back to list">&larr; Back</button>
            <div class="page-title" id="pr-wizardTitle">New Pay Run</div>
          </div>
          <span id="pr-wizardBadge" class="badge badge-draft">DRAFT</span>
        </div>

        <!-- STEPPER -->
        <div class="stepper">
          <div class="step-item active" id="pr-stepItem1">
            <span class="step-num">1</span><span class="step-label">Setup</span>
          </div>
          <div class="step-connector" id="pr-stepConn1"></div>
          <div class="step-item" id="pr-stepItem2">
            <span class="step-num">2</span><span class="step-label">Hours &amp; Earnings</span>
          </div>
          <div class="step-connector" id="pr-stepConn2"></div>
          <div class="step-item" id="pr-stepItem3">
            <span class="step-num">3</span><span class="step-label">Review</span>
          </div>
          <div class="step-connector" id="pr-stepConn3"></div>
          <div class="step-item" id="pr-stepItem4">
            <span class="step-num">4</span><span class="step-label">Finalized</span>
          </div>
        </div>

        <!-- STEP 1: Setup -->
        <div id="pr-step1" class="card">
          <div class="card-header"><h3>Pay Run Setup</h3></div>
          <div class="card-body">
            <div class="form-grid">
              <div class="form-group">
                <label>State</label>
                <select id="pr-prState">
                  <option value="">Select State</option>
                  <option value="CA">California</option>
                  <option value="NY">New York</option>
                  <option value="TX">Texas</option>
                  <option value="FL">Florida</option>
                  <option value="WA">Washington</option>
                  <option value="GA">Georgia</option>
                </select>
              </div>
              <div class="form-group">
                <label>Period Start</label>
                <input type="date" id="pr-prStart">
              </div>
              <div class="form-group">
                <label>Period End</label>
                <input type="date" id="pr-prEnd">
              </div>
              <div class="form-group">
                <label>Pay Date</label>
                <input type="date" id="pr-prPayDate">
              </div>
              <div class="form-group">
                <label>Pay Frequency</label>
                <select id="pr-prFreq">
                  <option value="weekly">Weekly</option>
                  <option value="bi_weekly" selected>Bi-Weekly</option>
                  <option value="semi_monthly">Semi-Monthly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>

            <h3 style="margin-top:24px;margin-bottom:12px;font-size:14px;font-weight:600;color:#1a2332;">Select Employees</h3>
            <div id="pr-empSelectWrap">
              <div class="emp-list" id="pr-empList">
                <div class="empty-state" style="padding:30px;">Select a state to load employees</div>
              </div>
            </div>

            <div class="wizard-actions">
              <div class="left-btns">
                <button class="btn btn-outline" id="pr-step1Cancel">Cancel</button>
              </div>
              <div class="right-btns">
                <button class="btn btn-primary" id="pr-btnStep1Next">Continue &rarr;</button>
              </div>
            </div>
          </div>
        </div>

        <!-- STEP 2: Hours & Earnings -->
        <div id="pr-step2" class="card hidden">
          <div class="card-header">
            <h3>Hours &amp; Earnings Entry</h3>
            <span id="pr-step2EmpCount" style="font-size:12px;color:#6b7280;"></span>
          </div>
          <div class="card-body">
            <div class="hours-table-wrap">
              <table class="hours-table">
                <thead id="pr-hoursHead"></thead>
                <tbody id="pr-hoursBody"></tbody>
              </table>
            </div>
            <div class="wizard-actions">
              <div class="left-btns">
                <button class="btn btn-outline" id="pr-step2Back">&larr; Back to Setup</button>
              </div>
              <div class="right-btns">
                <button class="btn btn-primary" id="pr-btnCalc">Calculate Payroll</button>
              </div>
            </div>
          </div>
        </div>

        <!-- STEP 3: Review -->
        <div id="pr-step3" class="card hidden">
          <div class="card-header">
            <h3>Payroll Review</h3>
            <span id="pr-step3RunId" style="font-size:12px;color:#6b7280;"></span>
          </div>
          <div class="card-body">
            <div style="overflow-x:auto;">
              <table class="review-table" id="pr-reviewTable">
                <thead>
                  <tr>
                    <th style="text-align:left;">Employee</th>
                    <th>Gross Pay</th>
                    <th>Pre-Tax Ded.</th>
                    <th>Federal Tax</th>
                    <th>State Tax</th>
                    <th>SS + Medicare</th>
                    <th>Post-Tax Ded.</th>
                    <th>Net Pay</th>
                  </tr>
                </thead>
                <tbody id="pr-reviewBody"></tbody>
              </table>
            </div>
            <div id="pr-warningsSection"></div>
            <div class="wizard-actions">
              <div class="left-btns">
                <button class="btn btn-outline" id="pr-step3Back">&larr; Back to Edit</button>
              </div>
              <div class="right-btns">
                <button class="btn btn-success" id="pr-btnApprove">Approve Pay Run</button>
              </div>
            </div>
          </div>
        </div>

        <!-- STEP 4: Finalized -->
        <div id="pr-step4" class="card hidden">
          <div class="card-body">
            <div class="confirm-box" id="pr-step4Content"></div>
          </div>
        </div>
      </div>
    `;

    // ════════════════════════════════════════════════════
    // DOM REFERENCES (resolved after innerHTML is set)
    // ════════════════════════════════════════════════════
    const el = (id) => container.querySelector('#' + id);

    // ════════════════════════════════════════════════════
    // SHOW / HIDE MODES
    // ════════════════════════════════════════════════════
    function showList() {
      el('pr-listMode').classList.remove('hidden');
      el('pr-wizardMode').classList.add('hidden');
      currentView = 'list';
    }

    function showWizard() {
      el('pr-listMode').classList.add('hidden');
      el('pr-wizardMode').classList.remove('hidden');
      currentView = 'wizard';
    }

    // ════════════════════════════════════════════════════
    // PAY RUN LIST
    // ════════════════════════════════════════════════════
    async function loadPayRuns() {
      const state = selectedState();
      const qs = state ? `?state=${state}` : '';
      try {
        const data = await API.get(`/pay-runs${qs}`);
        allPayRuns = data.pay_runs || [];
      } catch {
        allPayRuns = [];
      }
      renderPayRunList();
    }

    function renderPayRunList() {
      el('pr-runCount').textContent = allPayRuns.length;
      const tbody = el('pr-runTableBody');

      if (allPayRuns.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="empty-state"><div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
               style="width:48px;height:48px;margin-bottom:12px;opacity:0.4;">
            <path d="M9 12h6m-3-3v6m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
          <div>No pay runs found. Click <strong>+ New Pay Run</strong> to get started.</div>
        </div></td></tr>`;
        return;
      }

      tbody.innerHTML = allPayRuns.map(r => `
        <tr>
          <td><strong>${esc(r.pay_run_id)}</strong></td>
          <td>${esc(r.state)}</td>
          <td>${fmtDate(r.pay_period_start)} &ndash; ${fmtDate(r.pay_period_end)}</td>
          <td>${fmtDate(r.pay_date)}</td>
          <td>${badgeHTML(r.status)}</td>
          <td class="num">${(r.employees || []).length}</td>
          <td class="num">${fmt(r.totals?.total_gross)}</td>
          <td class="num">${fmt(r.totals?.total_net)}</td>
          <td>
            <div class="actions">
              <button class="btn btn-outline btn-sm" data-action="view" data-id="${esc(r.pay_run_id)}">View</button>
              ${r.status === 'draft' ? `<button class="btn btn-primary btn-sm" data-action="edit" data-id="${esc(r.pay_run_id)}">Edit</button>` : ''}
            </div>
          </td>
        </tr>
      `).join('');
    }

    // ════════════════════════════════════════════════════
    // NAVIGATION
    // ════════════════════════════════════════════════════
    function backToList() {
      currentRun = null;
      currentStubs = [];
      showList();
      loadPayRuns();
    }

    function startNewPayRun() {
      currentRun = null;
      currentStubs = [];
      el('pr-wizardTitle').textContent = 'New Pay Run';
      el('pr-wizardBadge').className = 'badge badge-draft';
      el('pr-wizardBadge').textContent = 'DRAFT';

      // Reset form
      el('pr-prState').value = selectedState() || '';
      el('pr-prStart').value = '';
      el('pr-prEnd').value = '';
      el('pr-prPayDate').value = '';
      el('pr-prFreq').value = 'bi_weekly';
      el('pr-empList').innerHTML = '<div class="empty-state" style="padding:30px;">Select a state to load employees</div>';
      allEmployees = [];

      if (el('pr-prState').value) loadEmployeesForState(el('pr-prState').value);

      showWizard();
      goToStep(1);
    }

    async function openPayRun(id) {
      try {
        const data = await API.get(`/pay-runs/${id}`);
        currentRun = data.pay_run;
        currentStubs = data.stubs || [];

        el('pr-wizardTitle').textContent = currentRun.pay_run_id;
        el('pr-wizardBadge').className = `badge badge-${currentRun.status}`;
        el('pr-wizardBadge').textContent = currentRun.status.toUpperCase();

        // Load employees for this state
        await loadEmployeesForState(currentRun.state);

        // Pre-fill form
        el('pr-prState').value = currentRun.state;
        el('pr-prStart').value = currentRun.pay_period_start;
        el('pr-prEnd').value = currentRun.pay_period_end;
        el('pr-prPayDate').value = currentRun.pay_date;
        el('pr-prFreq').value = currentRun.pay_frequency;

        // Check the included employees
        setTimeout(() => {
          const checkboxes = el('pr-empList').querySelectorAll('input[type="checkbox"]');
          checkboxes.forEach(cb => {
            cb.checked = (currentRun.employees || []).includes(cb.value);
          });
        }, 100);

        showWizard();

        // Jump to appropriate step based on status
        if (currentRun.status === 'draft') {
          goToStep(1);
        } else if (currentRun.status === 'review') {
          buildHoursTable();
          buildReviewTable();
          goToStep(3);
        } else if (currentRun.status === 'approved') {
          buildReviewTable();
          goToStep(4);
          renderStep4('approved');
        } else if (currentRun.status === 'finalized') {
          goToStep(4);
          renderStep4('finalized');
        } else {
          goToStep(1);
        }
      } catch { /* toast already shown by API layer */ }
    }

    // ════════════════════════════════════════════════════
    // STEPPER LOGIC
    // ════════════════════════════════════════════════════
    function goToStep(n) {
      wizardStep = n;
      [1, 2, 3, 4].forEach(i => {
        const panel = el('pr-step' + i);
        const item  = el('pr-stepItem' + i);
        panel.classList.toggle('hidden', i !== n);

        item.classList.remove('active', 'completed');
        if (i < n) item.classList.add('completed');
        else if (i === n) item.classList.add('active');
      });
      [1, 2, 3].forEach(i => {
        const conn = el('pr-stepConn' + i);
        conn.classList.remove('active', 'completed');
        if (i < n) conn.classList.add('completed');
        else if (i === n) conn.classList.add('active');
      });
    }

    // ════════════════════════════════════════════════════
    // STEP 1: SETUP
    // ════════════════════════════════════════════════════
    async function loadEmployeesForState(state) {
      try {
        const data = await API.get(`/employees?state=${state}&status=active`);
        allEmployees = data.employees || [];
        renderEmployeeChecklist();
      } catch {
        allEmployees = [];
        renderEmployeeChecklist();
      }
    }

    function renderEmployeeChecklist() {
      const empListEl = el('pr-empList');
      if (allEmployees.length === 0) {
        empListEl.innerHTML = '<div class="empty-state" style="padding:30px;">No active employees found for this state</div>';
        return;
      }
      let html = `<div class="emp-select-all">
        <input type="checkbox" id="pr-empSelectAll" checked>
        <label for="pr-empSelectAll">Select All (${allEmployees.length} employees)</label>
      </div>`;
      html += allEmployees.map(e => `
        <div class="emp-row">
          <input type="checkbox" value="${esc(e.employee_id)}" checked>
          <span class="emp-name">${esc(e.first_name)} ${esc(e.last_name)}</span>
          <span class="emp-meta">${esc(e.employee_id)}</span>
          <span class="emp-meta">${esc(e.job_title || '-')}</span>
          <span class="emp-meta">${esc(e.department || '-')}</span>
          <span class="emp-meta emp-type-tag ${e.pay_type === 'salary' ? 'tag-salary' : 'tag-hourly'}">${esc(e.pay_type)}</span>
        </div>
      `).join('');
      empListEl.innerHTML = html;

      // Re-bind select-all
      const selectAllCb = container.querySelector('#pr-empSelectAll');
      if (selectAllCb) {
        selectAllCb.addEventListener('change', function () {
          el('pr-empList').querySelectorAll('.emp-row input[type="checkbox"]').forEach(cb => {
            cb.checked = this.checked;
          });
        });
      }
    }

    function getSelectedEmployeeIds() {
      const cbs = el('pr-empList').querySelectorAll('.emp-row input[type="checkbox"]:checked');
      return Array.from(cbs).map(cb => cb.value);
    }

    async function submitSetup() {
      const state   = el('pr-prState').value;
      const start   = el('pr-prStart').value;
      const end     = el('pr-prEnd').value;
      const payDate = el('pr-prPayDate').value;
      const freq    = el('pr-prFreq').value;
      const empIds  = getSelectedEmployeeIds();

      if (!state)             return showToast('Please select a state', 'error');
      if (!start || !end)     return showToast('Please enter pay period dates', 'error');
      if (!payDate)           return showToast('Please enter a pay date', 'error');
      if (empIds.length === 0) return showToast('Please select at least one employee', 'error');

      const btn = el('pr-btnStep1Next');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Creating...';

      try {
        if (!currentRun) {
          const data = await API.post('/pay-runs', {
            state,
            pay_period_start: start,
            pay_period_end: end,
            pay_date: payDate,
            pay_frequency: freq,
            employee_ids: empIds
          });
          currentRun = data.pay_run;
          el('pr-wizardTitle').textContent = currentRun.pay_run_id;
          showToast('Pay run created: ' + currentRun.pay_run_id);
        }
        buildHoursTable();
        goToStep(2);
      } catch { /* toast already shown */ }
      finally {
        btn.disabled = false;
        btn.innerHTML = 'Continue &rarr;';
      }
    }

    // ════════════════════════════════════════════════════
    // STEP 2: HOURS & EARNINGS
    // ════════════════════════════════════════════════════
    function buildHoursTable() {
      if (!currentRun) return;

      const isCA = currentRun.state === 'CA';
      const empIds = currentRun.employees || [];
      const employees = empIds.map(id => allEmployees.find(e => e.employee_id === id)).filter(Boolean);

      el('pr-step2EmpCount').textContent = `${employees.length} employee${employees.length !== 1 ? 's' : ''}`;

      // Build header
      let hCols = `<tr>
        <th style="text-align:left;">Employee</th>
        <th>Regular Hrs</th>
        <th>OT 1.5x Hrs</th>`;
      if (isCA) hCols += `<th>OT 2x Hrs</th>`;
      hCols += `<th>Sick Hrs</th>
        <th>Vacation Hrs</th>
        <th>Holiday Hrs</th>
        <th>Bonus ($)</th>
        <th>Commission ($)</th>
      </tr>`;
      el('pr-hoursHead').innerHTML = hCols;

      // Build rows
      el('pr-hoursBody').innerHTML = employees.map(emp => {
        const isSalary = emp.pay_type === 'salary';
        const defReg = isSalary ? 0 : (
          currentRun.pay_frequency === 'bi_weekly' ? 80 :
          currentRun.pay_frequency === 'weekly' ? 40 :
          currentRun.pay_frequency === 'semi_monthly' ? 86.67 : 173.33
        );

        let row = `<tr data-emp="${esc(emp.employee_id)}">
          <td>${esc(emp.first_name)} ${esc(emp.last_name)}<span class="emp-type-tag ${isSalary ? 'tag-salary' : 'tag-hourly'}">${esc(emp.pay_type)}</span></td>
          <td><input type="number" name="regular" value="${isSalary ? '0' : defReg.toFixed(2)}" min="0" step="0.25" ${isSalary ? 'title="Salary - hours for record only"' : ''}></td>
          <td><input type="number" name="overtime_15x" value="0" min="0" step="0.25"></td>`;
        if (isCA) row += `<td><input type="number" name="overtime_2x" value="0" min="0" step="0.25"></td>`;
        row += `<td><input type="number" name="sick" value="0" min="0" step="0.25"></td>
          <td><input type="number" name="vacation" value="0" min="0" step="0.25"></td>
          <td><input type="number" name="holiday" value="0" min="0" step="0.25"></td>
          <td><input type="number" name="bonus" value="0" min="0" step="0.01"></td>
          <td><input type="number" name="commission" value="0" min="0" step="0.01"></td>
        </tr>`;
        return row;
      }).join('');
    }

    function collectHoursData() {
      const hours = {};
      const adjustments = {};
      const rows = el('pr-hoursBody').querySelectorAll('tr[data-emp]');
      rows.forEach(row => {
        const empId = row.dataset.emp;
        const val = (name) => parseFloat(row.querySelector(`input[name="${name}"]`)?.value || 0) || 0;
        hours[empId] = {
          regular: val('regular'),
          overtime_15x: val('overtime_15x'),
          overtime_2x: val('overtime_2x'),
          sick: val('sick'),
          vacation: val('vacation'),
          holiday: val('holiday')
        };
        adjustments[empId] = {
          bonus: val('bonus'),
          commission: val('commission')
        };
      });
      return { hours, adjustments };
    }

    async function calculatePayroll() {
      if (!currentRun) return;
      const { hours, adjustments } = collectHoursData();

      const btn = el('pr-btnCalc');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Calculating...';

      try {
        const data = await API.post(`/pay-runs/${currentRun.pay_run_id}/calculate`, { hours, adjustments });
        currentRun = data.pay_run;
        currentStubs = data.stubs || [];

        el('pr-wizardBadge').className = `badge badge-${currentRun.status}`;
        el('pr-wizardBadge').textContent = currentRun.status.toUpperCase();

        buildReviewTable();
        showToast('Payroll calculated successfully');
        goToStep(3);
      } catch { /* toast already shown */ }
      finally {
        btn.disabled = false;
        btn.innerHTML = 'Calculate Payroll';
      }
    }

    // ════════════════════════════════════════════════════
    // STEP 3: REVIEW
    // ════════════════════════════════════════════════════
    function buildReviewTable() {
      el('pr-step3RunId').textContent = currentRun ? currentRun.pay_run_id : '';

      if (currentStubs.length === 0) {
        el('pr-reviewBody').innerHTML = '<tr><td colspan="8" class="empty-state">No results to display</td></tr>';
        el('pr-warningsSection').innerHTML = '';
        return;
      }

      let totals = { gross: 0, preTax: 0, fed: 0, state: 0, fica: 0, postTax: 0, net: 0 };
      const warnings = [];

      const rows = currentStubs.map((stub, idx) => {
        const emp  = allEmployees.find(e => e.employee_id === stub.employee_id);
        const name = emp ? `${emp.first_name} ${emp.last_name}` : stub.employee_id;

        const gross      = stub.earnings?.gross_pay || 0;
        const preTaxDed  = stub.deductions?.pre_tax_total || 0;
        const fedTax     = stub.taxes?.federal_income || 0;
        const stateTax   = (stub.taxes?.state_income || 0) + (stub.taxes?.local_income || 0);
        const fica       = (stub.taxes?.social_security_employee || 0) + (stub.taxes?.medicare_employee || 0) + (stub.taxes?.additional_medicare || 0);
        const postTaxDed = stub.deductions?.post_tax_total || 0;
        const net        = stub.net_pay || 0;

        totals.gross   += gross;
        totals.preTax  += preTaxDed;
        totals.fed     += fedTax;
        totals.state   += stateTax;
        totals.fica    += fica;
        totals.postTax += postTaxDed;
        totals.net     += net;

        // Collect compliance warnings
        if (stub.warnings) {
          stub.warnings.forEach(w => warnings.push({ employee: name, message: w }));
        }
        if (stub.compliance_warnings) {
          stub.compliance_warnings.forEach(w => warnings.push({ employee: name, message: w }));
        }

        const detail = buildStubDetail(stub, emp);

        return `<tr class="expandable" data-detail-idx="${idx}">
          <td><span class="expand-icon" id="pr-expIcon${idx}">&#9654;</span>${esc(name)}</td>
          <td>${fmt(gross)}</td>
          <td>${fmt(preTaxDed)}</td>
          <td>${fmt(fedTax)}</td>
          <td>${fmt(stateTax)}</td>
          <td>${fmt(fica)}</td>
          <td>${fmt(postTaxDed)}</td>
          <td style="font-weight:600;">${fmt(net)}</td>
        </tr>
        <tr class="detail-row"><td colspan="8"><div class="detail-inner" id="pr-detail${idx}">${detail}</div></td></tr>`;
      }).join('');

      const totalsRow = `<tr class="totals-row">
        <td>TOTALS (${currentStubs.length} employees)</td>
        <td>${fmt(totals.gross)}</td>
        <td>${fmt(totals.preTax)}</td>
        <td>${fmt(totals.fed)}</td>
        <td>${fmt(totals.state)}</td>
        <td>${fmt(totals.fica)}</td>
        <td>${fmt(totals.postTax)}</td>
        <td>${fmt(totals.net)}</td>
      </tr>`;

      el('pr-reviewBody').innerHTML = rows + totalsRow;

      // Warnings section
      if (warnings.length > 0) {
        el('pr-warningsSection').innerHTML = `<div class="warnings-panel has-warnings">
          <h4>&#9888; Compliance Warnings (${warnings.length})</h4>
          ${warnings.map(w => `<div class="warning-item"><span class="wi-icon">&#9888;</span><span><strong>${esc(w.employee)}:</strong> ${esc(w.message)}</span></div>`).join('')}
        </div>`;
      } else {
        el('pr-warningsSection').innerHTML = `<div class="warnings-panel all-clear">
          <h4>&#10003; All Clear</h4>
          <div style="font-size:12px;color:#166534;">No compliance warnings detected.</div>
        </div>`;
      }
    }

    function buildStubDetail(stub, emp) {
      const t   = stub.taxes || {};
      const e   = stub.earnings || {};
      const d   = stub.deductions || {};
      const er  = stub.employer_taxes || {};

      return `<div class="detail-grid">
        <div class="detail-section">
          <h5>Earnings</h5>
          ${dl('Regular Pay', e.regular_pay)}
          ${dl('Overtime Pay (1.5x)', e.overtime_pay)}
          ${dl('Double Time Pay (2x)', e.double_time_pay)}
          ${dl('Sick Pay', e.sick_pay)}
          ${dl('Vacation Pay', e.vacation_pay)}
          ${dl('Holiday Pay', e.holiday_pay)}
          ${dl('Bonus', e.bonus)}
          ${dl('Commission', e.commission)}
          ${dl('Gross Pay', e.gross_pay, true)}
        </div>
        <div class="detail-section">
          <h5>Employee Taxes</h5>
          ${dl('Federal Income', t.federal_income)}
          ${dl('State Income', t.state_income)}
          ${dl('Local Income', t.local_income)}
          ${dl('Social Security', t.social_security_employee)}
          ${dl('Medicare', t.medicare_employee)}
          ${dl('Addl. Medicare', t.additional_medicare)}
          ${t.state_disability ? dl('SDI', t.state_disability) : ''}
          ${t.state_ui_employee ? dl('State UI (EE)', t.state_ui_employee) : ''}
          ${t.fli_employee ? dl('FLI (EE)', t.fli_employee) : ''}
        </div>
        <div class="detail-section">
          <h5>Deductions</h5>
          ${dl('Pre-Tax 401(k)', d.pre_tax_401k)}
          ${dl('Pre-Tax Health', d.pre_tax_health)}
          ${dl('Pre-Tax HSA', d.pre_tax_hsa)}
          ${dl('Pre-Tax FSA', d.pre_tax_fsa)}
          ${dl('Post-Tax Roth', d.post_tax_roth)}
          ${dl('Post-Tax Other', d.post_tax_other)}
        </div>
        <div class="detail-section">
          <h5>Employer Taxes</h5>
          ${dl('SS (Employer)', er.ss_employer)}
          ${dl('Medicare (Employer)', er.medicare_employer)}
          ${dl('FUTA', er.futa)}
          ${dl('SUTA', er.suta)}
          ${er.state_disability_employer ? dl('SDI (ER)', er.state_disability_employer) : ''}
          ${dl('Total Employer Cost', er.total_employer_cost, true)}
        </div>
      </div>
      <div style="margin-top:8px;font-size:12px;color:#374151;">
        <strong>Net Pay: ${fmt(stub.net_pay)}</strong>
      </div>`;
    }

    function toggleDetail(idx) {
      const detailEl = el('pr-detail' + idx);
      const icon     = el('pr-expIcon' + idx);
      if (detailEl.classList.contains('visible')) {
        detailEl.classList.remove('visible');
        icon.classList.remove('open');
      } else {
        detailEl.classList.add('visible');
        icon.classList.add('open');
      }
    }

    // ════════════════════════════════════════════════════
    // APPROVE
    // ════════════════════════════════════════════════════
    async function approvePayRun() {
      if (!currentRun) return;
      const btn = el('pr-btnApprove');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Approving...';
      try {
        const data = await API.post(`/pay-runs/${currentRun.pay_run_id}/approve`);
        currentRun = data.pay_run;
        el('pr-wizardBadge').className = `badge badge-${currentRun.status}`;
        el('pr-wizardBadge').textContent = currentRun.status.toUpperCase();
        showToast('Pay run approved');
        goToStep(4);
        renderStep4('approved');
      } catch { /* toast already shown */ }
      finally {
        btn.disabled = false;
        btn.innerHTML = 'Approve Pay Run';
      }
    }

    // ════════════════════════════════════════════════════
    // STEP 4: FINALIZED
    // ════════════════════════════════════════════════════
    function renderStep4(mode) {
      const t = currentRun.totals || {};
      const empCount = (currentRun.employees || []).length;
      const step4El = el('pr-step4Content');

      if (mode === 'approved') {
        step4El.innerHTML = `
          <div class="check-circle" style="background:#dbeafe;">
            <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <h3>Pay Run Approved</h3>
          <p>This pay run has been approved and is ready to be finalized. Finalizing will update all employee YTD totals.</p>
          <div class="summary-grid">
            <div class="summary-stat"><div class="ss-label">Employees</div><div class="ss-value">${empCount}</div></div>
            <div class="summary-stat"><div class="ss-label">Gross Pay</div><div class="ss-value">${fmt(t.total_gross)}</div></div>
            <div class="summary-stat"><div class="ss-label">Net Pay</div><div class="ss-value">${fmt(t.total_net)}</div></div>
            <div class="summary-stat"><div class="ss-label">Federal Tax</div><div class="ss-value">${fmt(t.total_federal_tax)}</div></div>
            <div class="summary-stat"><div class="ss-label">State Tax</div><div class="ss-value">${fmt(t.total_state_tax)}</div></div>
          </div>
          <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
            <button class="btn btn-outline" id="pr-step4BackReview">&larr; Back to Review</button>
            <button class="btn btn-success" id="pr-btnFinalize">Finalize Pay Run</button>
          </div>`;

        // Bind step 4 buttons
        el('pr-step4BackReview').addEventListener('click', () => goToStep(3));
        el('pr-btnFinalize').addEventListener('click', finalizePayRun);

      } else {
        step4El.innerHTML = `
          <div class="check-circle">
            <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2"><path d="M5 13l4 4L19 7"/></svg>
          </div>
          <h3>Pay Run Finalized</h3>
          <p><strong>${esc(currentRun.pay_run_id)}</strong> has been finalized. Employee YTD totals have been updated.</p>
          <div class="summary-grid">
            <div class="summary-stat"><div class="ss-label">Pay Run</div><div class="ss-value">${esc(currentRun.pay_run_id)}</div></div>
            <div class="summary-stat"><div class="ss-label">State</div><div class="ss-value">${esc(currentRun.state)}</div></div>
            <div class="summary-stat"><div class="ss-label">Employees</div><div class="ss-value">${empCount}</div></div>
            <div class="summary-stat"><div class="ss-label">Pay Date</div><div class="ss-value">${fmtDate(currentRun.pay_date)}</div></div>
            <div class="summary-stat"><div class="ss-label">Gross Pay</div><div class="ss-value">${fmt(t.total_gross)}</div></div>
            <div class="summary-stat"><div class="ss-label">Net Pay</div><div class="ss-value">${fmt(t.total_net)}</div></div>
          </div>
          <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
            <button class="btn btn-outline" id="pr-step4BackAll">&larr; All Pay Runs</button>
            <button class="btn btn-primary" id="pr-step4ViewStubs">View Pay Stubs</button>
          </div>`;

        el('pr-step4BackAll').addEventListener('click', backToList);
        el('pr-step4ViewStubs').addEventListener('click', () => {
          location.hash = '#pay-stubs?pay_run_id=' + currentRun.pay_run_id;
        });
      }
    }

    async function finalizePayRun() {
      if (!currentRun) return;
      const btn = el('pr-btnFinalize');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Finalizing...';
      try {
        const data = await API.post(`/pay-runs/${currentRun.pay_run_id}/finalize`);
        currentRun = data.pay_run;
        el('pr-wizardBadge').className = `badge badge-${currentRun.status}`;
        el('pr-wizardBadge').textContent = currentRun.status.toUpperCase();
        showToast('Pay run finalized! YTDs updated.');
        renderStep4('finalized');
      } catch { /* toast already shown */ }
      finally {
        if (btn) { btn.disabled = false; btn.innerHTML = 'Finalize Pay Run'; }
      }
    }

    // ════════════════════════════════════════════════════
    // EVENT BINDINGS
    // ════════════════════════════════════════════════════

    // New Pay Run button
    el('pr-btnNew').addEventListener('click', startNewPayRun);

    // Back to list buttons
    el('pr-btnBackList').addEventListener('click', backToList);
    el('pr-step1Cancel').addEventListener('click', backToList);

    // Step 1 next
    el('pr-btnStep1Next').addEventListener('click', submitSetup);

    // Step 2 back and calculate
    el('pr-step2Back').addEventListener('click', () => goToStep(1));
    el('pr-btnCalc').addEventListener('click', calculatePayroll);

    // Step 3 back and approve
    el('pr-step3Back').addEventListener('click', () => goToStep(2));
    el('pr-btnApprove').addEventListener('click', approvePayRun);

    // State select change in step 1
    el('pr-prState').addEventListener('change', function () {
      if (this.value) loadEmployeesForState(this.value);
      else {
        allEmployees = [];
        el('pr-empList').innerHTML = '<div class="empty-state" style="padding:30px;">Select a state to load employees</div>';
      }
    });

    // Delegated click for list table actions (View / Edit)
    el('pr-runTableBody').addEventListener('click', function (e) {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const id = btn.dataset.id;
      if (id) openPayRun(id);
    });

    // Delegated click for review table expand/collapse
    el('pr-reviewBody').addEventListener('click', function (e) {
      const row = e.target.closest('tr.expandable');
      if (!row) return;
      const idx = row.dataset.detailIdx;
      if (idx != null) toggleDetail(idx);
    });

    // ════════════════════════════════════════════════════
    // INIT
    // ════════════════════════════════════════════════════
    await loadPayRuns();
  }
};
