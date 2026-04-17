const express = require('express');
const router = express.Router();
const store = require('../data/store');

// GET /run/:payRunId - get all payslips from a pay run
router.get('/run/:payRunId', (req, res) => {
  const payRun = store.getPayRun(req.params.payRunId);
  if (!payRun) {
    return res.status(404).json({ error: `Pay run ${req.params.payRunId} not found` });
  }
  res.json({
    payRunId: payRun.id,
    payPeriodStart: payRun.payPeriodStart,
    payPeriodEnd: payRun.payPeriodEnd,
    payDate: payRun.payDate,
    status: payRun.status,
    payslips: payRun.employees,
  });
});

// GET /run/:payRunId/:empId - get specific payslip from a pay run
router.get('/run/:payRunId/:empId', (req, res) => {
  const payRun = store.getPayRun(req.params.payRunId);
  if (!payRun) {
    return res.status(404).json({ error: `Pay run ${req.params.payRunId} not found` });
  }
  const payslip = payRun.employees.find((e) => e.employeeId === req.params.empId);
  if (!payslip) {
    return res.status(404).json({
      error: `Payslip for employee ${req.params.empId} not found in pay run ${req.params.payRunId}`,
    });
  }
  res.json({
    payRunId: payRun.id,
    payPeriodStart: payRun.payPeriodStart,
    payPeriodEnd: payRun.payPeriodEnd,
    payDate: payRun.payDate,
    ...payslip,
  });
});

// GET /employee/:empId - get all payslips for an employee (across all runs)
router.get('/employee/:empId', (req, res) => {
  const allRuns = store.getAllPayRuns();
  const payslips = [];
  for (const run of allRuns) {
    const empPayslip = run.employees.find((e) => e.employeeId === req.params.empId);
    if (empPayslip) {
      payslips.push({
        payRunId: run.id,
        payPeriodStart: run.payPeriodStart,
        payPeriodEnd: run.payPeriodEnd,
        payDate: run.payDate,
        status: run.status,
        ...empPayslip,
      });
    }
  }
  res.json(payslips);
});

module.exports = router;
