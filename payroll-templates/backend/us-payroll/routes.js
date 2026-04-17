/**
 * US Payroll API Routes
 * All endpoints under /api/us-payroll/*
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const Store = require('./models/store');
const { createEmployee, validateEmployee, updateYTD, seedIdCounter, SUPPORTED_STATES } = require('./models/employee');
const { createPayRun, PAY_RUN_STATUSES, seedPayRunCounter } = require('./models/pay-run');
const { createPayStub, seedStubCounter } = require('./models/pay-stub');
const { calculatePayroll, getStateInfo, getAllStatesInfo, SUPPORTED_STATES: ENGINE_STATES } = require('./tax-engine/index');
const { validateMinimumWage, getApplicableMinimumWage } = require('./compliance/minimum-wage');
const { validateExemptClassification } = require('./compliance/classification');
const { validatePayFrequency } = require('./compliance/pay-frequency');
const { generatePayrollRegister } = require('./reports/payroll-register');
const { generateTaxLiability } = require('./reports/tax-liability');
const { generateLaborCost } = require('./reports/labor-cost');

// Initialize data stores
const dataDir = path.join(__dirname, 'data');
const employeeStore = new Store(path.join(dataDir, 'employees.json'));
const payRunStore = new Store(path.join(dataDir, 'pay-runs.json'));
const payStubStore = new Store(path.join(dataDir, 'pay-stubs.json'));

// Load company settings
const settingsPath = path.join(dataDir, 'company-settings.json');
function getSettings() {
  try { return JSON.parse(fs.readFileSync(settingsPath, 'utf-8')); } catch { return {}; }
}
function saveSettings(data) {
  fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2), 'utf-8');
}

// Seed all ID counters on startup so IDs don't collide after server restart
seedIdCounter(employeeStore.getAll());
seedPayRunCounter(payRunStore.getAll());
seedStubCounter(payStubStore.getAll());

// ══════════════════════════════════════════════
// COMPANY SETTINGS
// ══════════════════════════════════════════════

router.get('/settings', (req, res) => {
  res.json({ success: true, settings: getSettings() });
});

router.post('/settings', (req, res) => {
  const current = getSettings();
  const updated = { ...current, ...req.body };
  saveSettings(updated);
  res.json({ success: true, settings: updated });
});

// ══════════════════════════════════════════════
// STATES (Reference Data)
// ══════════════════════════════════════════════

router.get('/states', (req, res) => {
  try {
    const states = getAllStatesInfo();
    res.json({ success: true, states });
  } catch (err) {
    res.json({ success: true, states: SUPPORTED_STATES.map(code => ({ code, name: code })) });
  }
});

router.get('/states/:code', (req, res) => {
  try {
    const info = getStateInfo(req.params.code.toUpperCase());
    res.json({ success: true, state: info });
  } catch (err) {
    res.status(404).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════
// EMPLOYEES
// ══════════════════════════════════════════════

router.get('/employees', (req, res) => {
  let employees = employeeStore.getAll();
  if (req.query.state) {
    employees = employees.filter(e => e.work_state === req.query.state.toUpperCase());
  }
  if (req.query.status) {
    employees = employees.filter(e => (e.status || 'active') === req.query.status);
  }
  // Don't send sensitive data in list view
  const safe = employees.map(e => ({
    employee_id: e.employee_id,
    first_name: e.first_name,
    last_name: e.last_name,
    work_state: e.work_state,
    work_city: e.work_city,
    department: e.department,
    job_title: e.job_title,
    flsa_status: e.flsa_status,
    pay_type: e.pay_type,
    pay_rate: e.pay_rate,
    annual_salary: e.annual_salary,
    pay_frequency: e.pay_frequency,
    employment_type: e.employment_type,
    status: e.status || 'active',
    hire_date: e.hire_date
  }));
  res.json({ success: true, employees: safe, count: safe.length });
});

router.get('/employees/:id', (req, res) => {
  const emp = employeeStore.getById(req.params.id, 'employee_id');
  if (!emp) return res.status(404).json({ success: false, error: 'Employee not found' });
  res.json({ success: true, employee: emp });
});

router.post('/employees', (req, res) => {
  try {
    // Create first (generates ID, sets defaults), then validate
    const employee = createEmployee(req.body);
    const validation = validateEmployee(employee, true);
    if (validation.errors.length > 0) {
      return res.status(400).json({ success: false, errors: validation.errors });
    }
    employeeStore.add(employee);
    res.json({ success: true, employee, warnings: validation.warnings });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/employees/:id', (req, res) => {
  const existing = employeeStore.getById(req.params.id, 'employee_id');
  if (!existing) return res.status(404).json({ success: false, error: 'Employee not found' });

  const updated = employeeStore.update(req.params.id, req.body, 'employee_id');
  res.json({ success: true, employee: updated });
});

router.delete('/employees/:id', (req, res) => {
  const existing = employeeStore.getById(req.params.id, 'employee_id');
  if (!existing) return res.status(404).json({ success: false, error: 'Employee not found' });

  // Soft delete - mark as inactive
  employeeStore.update(req.params.id, { status: 'inactive', termination_date: new Date().toISOString().split('T')[0] }, 'employee_id');
  res.json({ success: true, message: 'Employee deactivated' });
});

// ══════════════════════════════════════════════
// PAY RUNS
// ══════════════════════════════════════════════

router.get('/pay-runs', (req, res) => {
  let runs = payRunStore.getAll();
  if (req.query.state) {
    runs = runs.filter(r => r.state === req.query.state.toUpperCase());
  }
  if (req.query.status) {
    runs = runs.filter(r => r.status === req.query.status);
  }
  // Sort by created_at descending
  runs.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  res.json({ success: true, pay_runs: runs, count: runs.length });
});

router.get('/pay-runs/:id', (req, res) => {
  const run = payRunStore.getById(req.params.id, 'pay_run_id');
  if (!run) return res.status(404).json({ success: false, error: 'Pay run not found' });

  // Include stubs
  const stubs = (run.stubs || []).map(stubId =>
    payStubStore.getById(stubId, 'stub_id')
  ).filter(Boolean);

  res.json({ success: true, pay_run: run, stubs });
});

router.post('/pay-runs', (req, res) => {
  try {
    const { state, pay_period_start, pay_period_end, pay_date, pay_frequency, employee_ids } = req.body;

    if (!state || !SUPPORTED_STATES.includes(state.toUpperCase())) {
      return res.status(400).json({ success: false, error: `State required. Supported: ${SUPPORTED_STATES.join(', ')}` });
    }
    if (!pay_period_start || !pay_period_end || !pay_date) {
      return res.status(400).json({ success: false, error: 'pay_period_start, pay_period_end, and pay_date are required' });
    }

    // If no employee_ids provided, include all active employees in the state
    let empIds = employee_ids;
    if (!empIds || empIds.length === 0) {
      empIds = employeeStore.getAll()
        .filter(e => e.work_state === state.toUpperCase() && (e.status || 'active') === 'active')
        .map(e => e.employee_id);
    }

    const payRun = createPayRun({
      state: state.toUpperCase(),
      pay_period_start,
      pay_period_end,
      pay_date,
      pay_frequency: pay_frequency || 'bi_weekly',
      employees: empIds
    });

    payRunStore.add(payRun);
    res.json({ success: true, pay_run: payRun });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Calculate payroll for a pay run
router.post('/pay-runs/:id/calculate', (req, res) => {
  try {
    const run = payRunStore.getById(req.params.id, 'pay_run_id');
    if (!run) return res.status(404).json({ success: false, error: 'Pay run not found' });

    if (run.status === 'finalized') {
      return res.status(400).json({ success: false, error: 'Cannot recalculate a finalized pay run' });
    }

    const settings = getSettings();
    const hoursData = req.body.hours || {}; // { "EMP-001": { regular: 80, overtime_15x: 5, ... } }
    const adjustmentsData = req.body.adjustments || {}; // { "EMP-001": { bonus: 500, ... } }

    // Remove existing stubs for this run
    const existingStubs = run.stubs || [];
    for (const stubId of existingStubs) {
      payStubStore.remove(stubId, 'stub_id');
    }

    const newStubs = [];
    const errors = [];

    for (const empId of run.employees) {
      const employee = employeeStore.getById(empId, 'employee_id');
      if (!employee) {
        errors.push({ employee_id: empId, error: 'Employee not found' });
        continue;
      }

      try {
        const hours = hoursData[empId] || { regular: employee.pay_type === 'salary' ? 0 : 80 };
        const adjustments = adjustmentsData[empId] || {};

        // Use pay run's frequency for tax annualization (overrides employee default)
        const empForCalc = { ...employee, pay_frequency: run.pay_frequency || employee.pay_frequency };

        // Run the tax engine pipeline
        const result = calculatePayroll(empForCalc, hours, adjustments, settings);

        // Create pay stub
        const stub = createPayStub({
          pay_run_id: run.pay_run_id,
          employee_id: empId,
          state: run.state,
          period_start: run.pay_period_start,
          period_end: run.pay_period_end,
          pay_date: run.pay_date,
          ...result
        });

        payStubStore.add(stub);
        newStubs.push(stub.stub_id);
      } catch (err) {
        errors.push({ employee_id: empId, error: err.message });
      }
    }

    // Update pay run with stubs and totals
    const allStubs = newStubs.map(id => payStubStore.getById(id, 'stub_id')).filter(Boolean);
    const totals = {
      total_gross: round(allStubs.reduce((s, st) => s + (st.earnings?.gross_pay || 0), 0)),
      total_net: round(allStubs.reduce((s, st) => s + (st.net_pay || 0), 0)),
      total_federal_tax: round(allStubs.reduce((s, st) => s + (st.taxes?.federal_income || 0), 0)),
      total_state_tax: round(allStubs.reduce((s, st) => s + (st.taxes?.state_income || 0) + (st.taxes?.local_income || 0), 0)),
      total_ss_employee: round(allStubs.reduce((s, st) => s + (st.taxes?.social_security_employee || 0), 0)),
      total_ss_employer: round(allStubs.reduce((s, st) => s + (st.employer_taxes?.ss_employer || 0), 0)),
      total_medicare_employee: round(allStubs.reduce((s, st) => s + (st.taxes?.medicare_employee || 0), 0)),
      total_medicare_employer: round(allStubs.reduce((s, st) => s + (st.employer_taxes?.medicare_employer || 0), 0)),
      total_employer_cost: round(allStubs.reduce((s, st) => s + (st.employer_taxes?.total_employer_cost || 0), 0))
    };

    payRunStore.update(run.pay_run_id, {
      stubs: newStubs,
      totals,
      status: 'review',
      calculated_at: new Date().toISOString()
    }, 'pay_run_id');

    const updatedRun = payRunStore.getById(run.pay_run_id, 'pay_run_id');

    res.json({
      success: true,
      pay_run: updatedRun,
      stubs: allStubs,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Approve a pay run
router.post('/pay-runs/:id/approve', (req, res) => {
  const run = payRunStore.getById(req.params.id, 'pay_run_id');
  if (!run) return res.status(404).json({ success: false, error: 'Pay run not found' });
  if (run.status !== 'review') {
    return res.status(400).json({ success: false, error: 'Pay run must be in review status to approve' });
  }

  payRunStore.update(run.pay_run_id, { status: 'approved', approved_at: new Date().toISOString() }, 'pay_run_id');
  res.json({ success: true, pay_run: payRunStore.getById(run.pay_run_id, 'pay_run_id') });
});

// Finalize a pay run (updates YTDs)
router.post('/pay-runs/:id/finalize', (req, res) => {
  const run = payRunStore.getById(req.params.id, 'pay_run_id');
  if (!run) return res.status(404).json({ success: false, error: 'Pay run not found' });
  if (run.status !== 'approved') {
    return res.status(400).json({ success: false, error: 'Pay run must be approved before finalizing' });
  }

  // Update employee YTDs
  for (const stubId of (run.stubs || [])) {
    const stub = payStubStore.getById(stubId, 'stub_id');
    if (!stub) continue;

    const employee = employeeStore.getById(stub.employee_id, 'employee_id');
    if (!employee) continue;

    const ytdUpdates = updateYTD(employee, stub);
    employeeStore.update(employee.employee_id, { ytd: ytdUpdates }, 'employee_id');
  }

  payRunStore.update(run.pay_run_id, { status: 'finalized', finalized_at: new Date().toISOString() }, 'pay_run_id');
  res.json({ success: true, pay_run: payRunStore.getById(run.pay_run_id, 'pay_run_id') });
});

// ══════════════════════════════════════════════
// PAY STUBS
// ══════════════════════════════════════════════

router.get('/pay-stubs', (req, res) => {
  let stubs = payStubStore.getAll();
  if (req.query.employee_id) {
    stubs = stubs.filter(s => s.employee_id === req.query.employee_id);
  }
  if (req.query.pay_run_id) {
    stubs = stubs.filter(s => s.pay_run_id === req.query.pay_run_id);
  }
  res.json({ success: true, stubs, count: stubs.length });
});

router.get('/pay-stubs/:id', (req, res) => {
  const stub = payStubStore.getById(req.params.id, 'stub_id');
  if (!stub) return res.status(404).json({ success: false, error: 'Pay stub not found' });

  const employee = employeeStore.getById(stub.employee_id, 'employee_id');
  const settings = getSettings();

  res.json({ success: true, stub, employee: employee || null, company: settings });
});

// ══════════════════════════════════════════════
// COMPLIANCE
// ══════════════════════════════════════════════

router.get('/compliance/validate/:state', (req, res) => {
  const state = req.params.state.toUpperCase();
  const employees = employeeStore.getAll().filter(e => e.work_state === state && (e.status || 'active') === 'active');

  const results = employees.map(emp => {
    const minWage = validateMinimumWage(emp);
    const classification = validateExemptClassification(emp);
    const payFreq = validatePayFrequency(emp);

    return {
      employee_id: emp.employee_id,
      name: `${emp.first_name} ${emp.last_name}`,
      warnings: [...minWage.warnings, ...classification.warnings, ...payFreq.warnings],
      errors: [...minWage.errors, ...classification.errors, ...payFreq.errors]
    };
  });

  const totalErrors = results.reduce((s, r) => s + r.errors.length, 0);
  const totalWarnings = results.reduce((s, r) => s + r.warnings.length, 0);

  res.json({
    success: true,
    state,
    employee_count: employees.length,
    total_errors: totalErrors,
    total_warnings: totalWarnings,
    results
  });
});

// ══════════════════════════════════════════════
// REPORTS
// ══════════════════════════════════════════════

router.get('/reports/payroll-register', (req, res) => {
  const { pay_run_id } = req.query;
  if (!pay_run_id) return res.status(400).json({ success: false, error: 'pay_run_id required' });

  const run = payRunStore.getById(pay_run_id, 'pay_run_id');
  if (!run) return res.status(404).json({ success: false, error: 'Pay run not found' });

  const stubs = (run.stubs || []).map(id => payStubStore.getById(id, 'stub_id')).filter(Boolean);
  const employees = employeeStore.getAll();

  const report = generatePayrollRegister(run, stubs, employees);
  res.json({ success: true, report });
});

router.get('/reports/tax-liability', (req, res) => {
  const { state, period_start, period_end } = req.query;

  let stubs = payStubStore.getAll();
  if (state) stubs = stubs.filter(s => s.state === state.toUpperCase());
  if (period_start) stubs = stubs.filter(s => s.period_start >= period_start);
  if (period_end) stubs = stubs.filter(s => s.period_end <= period_end);

  const report = generateTaxLiability(stubs, state || 'ALL', period_start || '', period_end || '');
  res.json({ success: true, report });
});

router.get('/reports/labor-cost', (req, res) => {
  const { pay_run_id, group_by } = req.query;

  let stubs;
  if (pay_run_id) {
    const run = payRunStore.getById(pay_run_id, 'pay_run_id');
    if (!run) return res.status(404).json({ success: false, error: 'Pay run not found' });
    stubs = (run.stubs || []).map(id => payStubStore.getById(id, 'stub_id')).filter(Boolean);
  } else {
    stubs = payStubStore.getAll();
  }

  const employees = employeeStore.getAll();
  const report = generateLaborCost(stubs, employees, group_by || 'department');
  res.json({ success: true, report });
});

function round(v) { return Math.round(v * 100) / 100; }

module.exports = router;
