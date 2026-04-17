/**
 * Zimyo US Payroll - Express API Server
 * Serves the frontend and exposes payroll API endpoints.
 * Uses multi-agent orchestrator for AI-powered payroll processing.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const path = require('path');

const store = require('./data/store');
const payrollEngine = require('./engines/payrollEngine');
const complianceEngine = require('./engines/complianceEngine');
const stateCompliance = require('./data/stateCompliance');
const taxEngine = require('./engines/taxEngine');
const achEngine = require('./engines/achEngine');
const { runPayrollAgent } = require('./agents/orchestrator');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

// ── DASHBOARD ──

app.get('/api/dashboard/summary', (req, res) => {
  const company = store.getCompany ? store.getCompany() : {};
  const employees = store.getAllEmployees();
  const payRuns = store.getAllPayRuns();
  const activeEmployees = employees.filter(e => e.isActive);
  const completedRuns = payRuns.filter(r => r.status === 'completed');
  const pendingRuns = payRuns.filter(r => r.status === 'draft' || r.status === 'processing');

  const stateBreakdown = {};
  activeEmployees.forEach(emp => {
    stateBreakdown[emp.state] = (stateBreakdown[emp.state] || 0) + 1;
  });

  // Calculate next pay date (next Friday from today)
  const today = new Date();
  const daysUntilFriday = (5 - today.getDay() + 7) % 7 || 7;
  const nextPayDate = new Date(today);
  nextPayDate.setDate(today.getDate() + daysUntilFriday);

  res.json({
    companyName: company.name || 'Acme Corp',
    totalEmployees: activeEmployees.length,
    totalPayRuns: payRuns.length,
    completedPayRuns: completedRuns.length,
    pendingPayRuns: pendingRuns.length,
    pendingPayroll: pendingRuns.length,
    complianceStatus: 'Compliant',
    nextPayDate: nextPayDate.toISOString().split('T')[0],
    totalGrossYTD: completedRuns.reduce((sum, r) => sum + (r.totalGross || 0), 0),
    totalNetYTD: completedRuns.reduce((sum, r) => sum + (r.totalNet || 0), 0),
    totalTaxesYTD: completedRuns.reduce((sum, r) => sum + (r.totalTaxes || 0), 0),
    stateBreakdown,
    recentPayRuns: payRuns.slice(-5).reverse(),
    states: ['CA', 'NY', 'TX', 'NJ', 'WA', 'IL', 'GA', 'FL']
  });
});

// ── EMPLOYEES ──

app.get('/api/employees', (req, res) => {
  let employees = store.getAllEmployees();
  if (req.query.state) {
    employees = employees.filter(e => e.state === req.query.state);
  }
  if (req.query.active === 'true') {
    employees = employees.filter(e => e.isActive);
  }
  res.json(employees);
});

app.get('/api/employees/:id', (req, res) => {
  const emp = store.getEmployee(req.params.id);
  if (!emp) return res.status(404).json({ error: 'Employee not found' });
  res.json(emp);
});

app.post('/api/employees', (req, res) => {
  try {
    const emp = store.addEmployee(req.body);
    res.status(201).json(emp);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/employees/:id', (req, res) => {
  try {
    const emp = store.updateEmployee(req.params.id, req.body);
    if (!emp) return res.status(404).json({ error: 'Employee not found' });
    res.json(emp);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── PAYROLL ──

app.get('/api/payroll/runs', (req, res) => {
  res.json(store.getAllPayRuns());
});

app.get('/api/payroll/runs/:id', (req, res) => {
  const run = store.getPayRun(req.params.id);
  if (!run) return res.status(404).json({ error: 'Pay run not found' });
  res.json(run);
});

app.post('/api/payroll/run', async (req, res) => {
  try {
    const { payPeriodStart, payPeriodEnd, payDate, employeeIds, hoursMap } = req.body;

    if (!payPeriodStart || !payPeriodEnd || !payDate) {
      return res.status(400).json({ error: 'Pay period start, end, and pay date are required' });
    }

    // Create pay run
    const payRun = store.addPayRun({
      payPeriodStart,
      payPeriodEnd,
      payDate,
      status: 'processing'
    });

    // Get employees to process
    const allEmployees = store.getAllEmployees().filter(e => e.isActive);
    const employees = employeeIds
      ? allEmployees.filter(e => employeeIds.includes(e.id))
      : allEmployees;

    // Process each employee
    const payStubs = [];
    const errors = [];

    for (const emp of employees) {
      try {
        // Build hours object for the engine
        const rawHours = (hoursMap && hoursMap[emp.id]) || (emp.payType === 'hourly' ? 80 : 0);
        const hours = typeof rawHours === 'number' ? { regular: rawHours } : rawHours;

        // Calculate pay stub
        const payPeriod = { start: payPeriodStart, end: payPeriodEnd, payDate };
        const stub = payrollEngine.processPayStub(emp, hours, payPeriod);
        payStubs.push(stub);
      } catch (err) {
        errors.push({ employeeId: emp.id, employeeName: `${emp.firstName} ${emp.lastName}`, error: err.message });
      }
    }

    // Update pay run
    const totalGross = payStubs.reduce((s, p) => s + (p.earnings?.totalGross || 0), 0);
    const totalNet = payStubs.reduce((s, p) => s + (p.netPay || 0), 0);
    const totalTaxes = payStubs.reduce((s, p) => {
      const t = p.taxes || {};
      const fed = t.federal || {};
      const st = t.state || {};
      return s + (fed.withholding || 0) + (fed.socialSecurity || 0) + (fed.medicare || 0) + (st.incomeTax || 0) + (st.sdi || 0) + (st.sui || 0);
    }, 0);
    const totalDeductions = payStubs.reduce((s, p) => {
      const d = p.deductions || {};
      const pre = d.preTax || {};
      const post = d.postTax || {};
      return s + Object.values(pre).reduce((a,v) => a + (typeof v === 'number' ? v : 0), 0)
               + Object.values(post).reduce((a,v) => a + (typeof v === 'number' ? v : 0), 0);
    }, 0);

    store.updatePayRun(payRun.id, {
      status: errors.length > 0 ? 'completed_with_errors' : 'completed',
      employees: payStubs,
      errors,
      totalGross: Math.round(totalGross * 100) / 100,
      totalNet: Math.round(totalNet * 100) / 100,
      totalTaxes: Math.round(totalTaxes * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      processedAt: new Date().toISOString()
    });

    res.json(store.getPayRun(payRun.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PAY STUBS ──

app.get('/api/payroll/stub/:employeeId', (req, res) => {
  try {
    const emp = store.getEmployee(req.params.employeeId);
    if (!emp) return res.status(404).json({ error: 'Employee not found' });

    const rawHours = req.query.hours ? parseFloat(req.query.hours) : (emp.payType === 'hourly' ? 80 : 0);
    const hours = { regular: rawHours };
    const payPeriod = {
      start: req.query.start || '2026-03-16',
      end: req.query.end || '2026-03-31',
      payDate: req.query.payDate || '2026-04-05'
    };

    const stub = payrollEngine.processPayStub(emp, hours, payPeriod);
    res.json(stub);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── TAX ──

app.get('/api/tax/breakdown/:employeeId', (req, res) => {
  try {
    const emp = store.getEmployee(req.params.employeeId);
    if (!emp) return res.status(404).json({ error: 'Employee not found' });

    const grossPay = emp.payType === 'salary'
      ? emp.payRate / (emp.payFrequency === 'biweekly' ? 26 : emp.payFrequency === 'semimonthly' ? 24 : 12)
      : emp.payRate * 80;

    const payPeriod = { start: '2026-03-16', end: '2026-03-31' };
    const taxes = taxEngine.calculateEmployeeTaxes(emp, grossPay, payPeriod);
    res.json({ employee: `${emp.firstName} ${emp.lastName}`, state: emp.state, grossPay, ...taxes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── COMPLIANCE ──

app.get('/api/compliance/:state', (req, res) => {
  try {
    const rules = stateCompliance.getStateCompliance(req.params.state.toUpperCase());
    if (!rules) return res.status(404).json({ error: 'State not found' });
    res.json(rules);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/compliance', (req, res) => {
  res.json(stateCompliance.getAllStateCompliance());
});

// ── ACH / DIRECT DEPOSIT ──

app.post('/api/payroll/deposit/:payRunId', (req, res) => {
  try {
    const payRun = store.getPayRun(req.params.payRunId);
    if (!payRun) return res.status(404).json({ error: 'Pay run not found' });

    const result = achEngine.processDirectDeposit(payRun);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── AI AGENT ──

app.post('/api/agent/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const result = await runPayrollAgent(message, history);
    res.json(result);
  } catch (err) {
    console.error('Agent error:', err);
    res.status(500).json({
      response: `I encountered an error: ${err.message}. Please check your ANTHROPIC_API_KEY is set.`,
      history: []
    });
  }
});

// ── REPORTS ──

app.get('/api/reports/payroll-summary', (req, res) => {
  const payRuns = store.getAllPayRuns().filter(r => r.status === 'completed' || r.status === 'completed_with_errors');
  const summary = {
    totalRuns: payRuns.length,
    totalGross: payRuns.reduce((s, r) => s + (r.totalGross || 0), 0),
    totalNet: payRuns.reduce((s, r) => s + (r.totalNet || 0), 0),
    totalTaxes: payRuns.reduce((s, r) => s + (r.totalTaxes || 0), 0),
    runs: payRuns
  };
  res.json(summary);
});

// ── REPORTS ── (detailed)

app.get('/api/reports/payroll-register', (req, res) => {
  const payRuns = store.getAllPayRuns().filter(r => r.status === 'completed' || r.status === 'completed_with_errors');
  const register = payRuns.map(run => ({
    id: run.id,
    payPeriodStart: run.payPeriodStart,
    payPeriodEnd: run.payPeriodEnd,
    payDate: run.payDate,
    status: run.status,
    processedAt: run.processedAt || run.updatedAt,
    totalGross: run.totalGross || 0,
    totalNet: run.totalNet || 0,
    totalTaxes: run.totalTaxes || 0,
    employeeCount: (run.employees || []).length,
    stubs: (run.employees || []).map(s => ({
      employeeName: s.employeeName,
      state: s.state || '',
      grossPay: s.earnings ? s.earnings.totalGross : 0,
      netPay: s.netPay || 0,
      totalTax: s.taxes ? s.taxes.total : 0,
    })),
  }));
  res.json(register);
});

app.get('/api/reports/tax-summary', (req, res) => {
  const payRuns = store.getAllPayRuns().filter(r => r.status === 'completed' || r.status === 'completed_with_errors');
  const summary = { federal: { withholding: 0, socialSecurity: 0, medicare: 0 }, state: { incomeTax: 0, sdi: 0, sui: 0 }, totalFederal: 0, totalState: 0, grandTotal: 0 };
  for (const run of payRuns) {
    for (const stub of (run.employees || [])) {
      const t = stub.taxes || {};
      const fed = t.federal || {};
      const st = t.state || {};
      summary.federal.withholding += fed.withholding || 0;
      summary.federal.socialSecurity += fed.socialSecurity || 0;
      summary.federal.medicare += fed.medicare || 0;
      summary.state.incomeTax += st.incomeTax || 0;
      summary.state.sdi += st.sdi || 0;
      summary.state.sui += st.sui || 0;
    }
  }
  summary.totalFederal = Math.round((summary.federal.withholding + summary.federal.socialSecurity + summary.federal.medicare) * 100) / 100;
  summary.totalState = Math.round((summary.state.incomeTax + summary.state.sdi + summary.state.sui) * 100) / 100;
  summary.grandTotal = Math.round((summary.totalFederal + summary.totalState) * 100) / 100;
  // Round individual values
  Object.keys(summary.federal).forEach(k => { summary.federal[k] = Math.round(summary.federal[k] * 100) / 100; });
  Object.keys(summary.state).forEach(k => { summary.state[k] = Math.round(summary.state[k] * 100) / 100; });
  res.json(summary);
});

app.get('/api/reports/employee-earnings', (req, res) => {
  const payRuns = store.getAllPayRuns().filter(r => r.status === 'completed' || r.status === 'completed_with_errors');
  const empMap = {};
  for (const run of payRuns) {
    for (const stub of (run.employees || [])) {
      const id = stub.employeeId || 'unknown';
      if (!empMap[id]) {
        empMap[id] = { employeeId: id, employeeName: stub.employeeName || '', state: stub.state || '', totalGross: 0, totalFederalTax: 0, totalStateTax: 0, totalNet: 0, payPeriods: 0 };
      }
      empMap[id].totalGross += stub.earnings ? stub.earnings.totalGross : 0;
      empMap[id].totalNet += stub.netPay || 0;
      const fed = (stub.taxes || {}).federal || {};
      const st = (stub.taxes || {}).state || {};
      empMap[id].totalFederalTax += (fed.withholding || 0) + (fed.socialSecurity || 0) + (fed.medicare || 0);
      empMap[id].totalStateTax += (st.incomeTax || 0) + (st.sdi || 0) + (st.sui || 0);
      empMap[id].payPeriods++;
    }
  }
  // Fill in state from employee record if missing
  const employees = store.getAllEmployees();
  for (const emp of employees) {
    if (empMap[emp.id] && !empMap[emp.id].state) empMap[emp.id].state = emp.state;
    if (!empMap[emp.id]) {
      empMap[emp.id] = { employeeId: emp.id, employeeName: `${emp.firstName} ${emp.lastName}`, state: emp.state, totalGross: 0, totalFederalTax: 0, totalStateTax: 0, totalNet: 0, payPeriods: 0 };
    }
  }
  const result = Object.values(empMap).map(e => ({
    ...e,
    totalGross: Math.round(e.totalGross * 100) / 100,
    totalFederalTax: Math.round(e.totalFederalTax * 100) / 100,
    totalStateTax: Math.round(e.totalStateTax * 100) / 100,
    totalNet: Math.round(e.totalNet * 100) / 100,
  }));
  res.json(result);
});

app.get('/api/reports/state-breakdown', (req, res) => {
  const payRuns = store.getAllPayRuns().filter(r => r.status === 'completed' || r.status === 'completed_with_errors');
  const stateMap = {};
  for (const run of payRuns) {
    for (const stub of (run.employees || [])) {
      // Try to find employee state
      let state = stub.state || '';
      if (!state && stub.employeeId) {
        const emp = store.getEmployee(stub.employeeId);
        if (emp) state = emp.state;
      }
      if (!state) state = 'Unknown';
      if (!stateMap[state]) stateMap[state] = { state, employeeCount: new Set(), totalGross: 0, totalTaxes: 0, totalNet: 0, federalTax: 0, stateTax: 0 };
      stateMap[state].employeeCount.add(stub.employeeId);
      stateMap[state].totalGross += stub.earnings ? stub.earnings.totalGross : 0;
      stateMap[state].totalNet += stub.netPay || 0;
      const fed = (stub.taxes || {}).federal || {};
      const st = (stub.taxes || {}).state || {};
      stateMap[state].federalTax += (fed.withholding || 0) + (fed.socialSecurity || 0) + (fed.medicare || 0);
      stateMap[state].stateTax += (st.incomeTax || 0) + (st.sdi || 0) + (st.sui || 0);
      stateMap[state].totalTaxes += (stub.taxes || {}).total || 0;
    }
  }
  const result = Object.values(stateMap).map(s => ({
    state: s.state,
    employeeCount: s.employeeCount.size,
    totalGross: Math.round(s.totalGross * 100) / 100,
    federalTax: Math.round(s.federalTax * 100) / 100,
    stateTax: Math.round(s.stateTax * 100) / 100,
    totalTaxes: Math.round(s.totalTaxes * 100) / 100,
    totalNet: Math.round(s.totalNet * 100) / 100,
  }));
  res.json(result);
});

// ── NEW MODULE ROUTES ──

function tryMount(path, routeFile) {
  try {
    app.use('/api' + path, require('./routes/' + routeFile));
  } catch (err) {
    console.warn(`  [warn] Route ${routeFile} not loaded: ${err.message}`);
  }
}

tryMount('/company', 'company');
tryMount('/pay-schedules', 'paySchedules');
tryMount('/ot-plans', 'otPlans');
tryMount('/break-rules', 'breakRules');
tryMount('/pto', 'pto');
tryMount('/benefits', 'benefits');
tryMount('/documents', 'documents');
tryMount('/payslips', 'payslips');

// ── SERVE FRONTEND ──

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// ── START SERVER ──

const PORT = process.env.PAYROLL_PORT || 4000;
app.listen(PORT, () => {
  console.log(`\n  Zimyo US Payroll Server`);
  console.log(`  ──────────────────────────────`);
  console.log(`  Dashboard:  http://localhost:${PORT}`);
  console.log(`  API:        http://localhost:${PORT}/api`);
  console.log(`  AI Agent:   http://localhost:${PORT}/api/agent/chat`);
  console.log(`  States:     CA, NY, TX, NJ, WA, IL, GA, FL`);
  console.log(`  Modules:    14 payroll modules loaded`);
  console.log(`  ──────────────────────────────\n`);
});
