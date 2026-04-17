/**
 * Core Payroll Processing Engine
 * Handles gross pay, deductions, tax integration, and full pay-run processing.
 */

'use strict';

const taxEngine = require('./taxEngine');

// Optional data imports
let deductionLimits, employeeStore;
try { deductionLimits = require('../data/deductionLimits'); } catch (_) { deductionLimits = null; }
try { employeeStore   = require('../data/employeeStore');   } catch (_) { employeeStore   = null; }

// ---------------------------------------------------------------------------
// 2024 IRS contribution limits (defaults when data module is absent)
// ---------------------------------------------------------------------------
const LIMITS_2024 = {
  traditional401k: 23000,
  traditional401kCatchUp: 7500,   // age 50+
  catchUpAge: 50,
  hsaIndividual: 4150,
  hsaFamily: 8300,
  fsaHealthcare: 3200,
  fsaDependentCare: 5000,
};

function getLimits() {
  return deductionLimits || LIMITS_2024;
}

// ---------------------------------------------------------------------------
// Gross Pay Calculation
// ---------------------------------------------------------------------------

/**
 * Calculate gross pay for one pay period.
 *
 * @param {Object} employee    - { payType: 'salary'|'hourly', annualSalary, hourlyRate, payFrequency, ... }
 * @param {Object} hoursWorked - { regular, overtime, doubleTime, holiday, pto }
 * @param {Object} payPeriod   - { frequency, startDate, endDate }
 * @returns {Object} Gross pay breakdown.
 */
function calculateGrossPay(employee, hoursWorked, payPeriod) {
  if (!employee) throw new Error('Employee record is required');

  const hours = hoursWorked || {};
  const frequency = (payPeriod && payPeriod.frequency) || employee.payFrequency || 'biweekly';
  const periods = taxEngine.periodsPerYear(frequency);
  const payType = (employee.payType || 'salary').toLowerCase();

  let regularPay = 0;
  let overtimePay = 0;
  let doubleTimePay = 0;
  let holidayPay = 0;
  let ptoPay = 0;
  let otherEarnings = 0;

  if (payType === 'salary') {
    // Salaried: divide annual salary by number of pay periods
    const annualSalary = employee.annualSalary || employee.payRate || 0;
    regularPay = Math.round((annualSalary / periods) * 100) / 100;

    // Salaried employees may still have overtime if non-exempt
    if (employee.flsaStatus === 'non-exempt' && hours.overtime) {
      // Effective hourly rate = annual / (periods * standard hours per period)
      const standardHoursPerPeriod = (frequency === 'weekly') ? 40
        : (frequency === 'biweekly') ? 80
        : (frequency === 'semimonthly') ? 86.67
        : (frequency === 'monthly') ? 173.33
        : 80;
      const effectiveRate = annualSalary / periods / standardHoursPerPeriod;
      overtimePay = Math.round(hours.overtime * effectiveRate * 1.5 * 100) / 100;
      doubleTimePay = Math.round((hours.doubleTime || 0) * effectiveRate * 2 * 100) / 100;
    }
  } else {
    // Hourly
    const rate = employee.hourlyRate || employee.payRate || 0;
    regularPay = Math.round((hours.regular || 0) * rate * 100) / 100;
    overtimePay = Math.round((hours.overtime || 0) * rate * 1.5 * 100) / 100;
    doubleTimePay = Math.round((hours.doubleTime || 0) * rate * 2 * 100) / 100;
    holidayPay = Math.round((hours.holiday || 0) * rate * (employee.holidayMultiplier || 1.5) * 100) / 100;
    ptoPay = Math.round((hours.pto || 0) * rate * 100) / 100;
  }

  // Bonuses, commissions, reimbursements, etc.
  if (hours.otherEarnings) {
    otherEarnings = Math.round((hours.otherEarnings || 0) * 100) / 100;
  }

  const totalGross = Math.round(
    (regularPay + overtimePay + doubleTimePay + holidayPay + ptoPay + otherEarnings) * 100
  ) / 100;

  return {
    regularPay,
    overtimePay,
    doubleTimePay,
    holidayPay,
    ptoPay,
    otherEarnings,
    totalGross,
    payType,
    frequency,
  };
}

// ---------------------------------------------------------------------------
// Deductions
// ---------------------------------------------------------------------------

/**
 * Calculate pre-tax and post-tax deductions.
 *
 * @param {Object} employee - employee record with deductions config
 * @param {number} grossPay - gross pay for the period
 * @returns {Object} { preTax: {...}, postTax: {...}, totalPreTax, totalPostTax }
 */
function calculateDeductions(employee, grossPay) {
  if (!employee) throw new Error('Employee record is required');

  const limits = getLimits();
  const deductions = employee.deductions || {};
  const frequency = employee.payFrequency || 'biweekly';
  const periods = taxEngine.periodsPerYear(frequency);
  const age = employee.age || 30;

  // Helper: cap an annual amount and return per-period value
  function perPeriod(annualAmount, annualCap) {
    const capped = annualCap ? Math.min(annualAmount || 0, annualCap) : (annualAmount || 0);
    return Math.round((capped / periods) * 100) / 100;
  }

  // Helper: calculate deduction that might be a flat dollar amount or a percentage of gross
  function resolveAmount(config) {
    if (!config) return 0;
    if (typeof config === 'number') return config;
    if (config.type === 'percent' || config.percentage) {
      const pct = config.percentage || config.rate || 0;
      return Math.round(grossPay * pct * 100) / 100;
    }
    return config.amount || 0;
  }

  // --- Pre-Tax Deductions ---
  const annual401kCap = age >= (limits.catchUpAge || 50)
    ? (limits.traditional401k + limits.traditional401kCatchUp)
    : limits.traditional401k;

  const retirement401k = resolveAmount(deductions.retirement401k);
  // Apply per-period cap derived from annual limit
  const max401kPerPeriod = Math.round(annual401kCap / periods * 100) / 100;
  const capped401k = Math.min(retirement401k, max401kPerPeriod);

  const hsaCap = (deductions.hsaCoverage === 'family')
    ? limits.hsaFamily
    : limits.hsaIndividual;
  const hsa = perPeriod(deductions.hsaAnnual || 0, hsaCap);

  const fsaHealth = perPeriod(deductions.fsaHealthAnnual || 0, limits.fsaHealthcare);
  const fsaDepCare = perPeriod(deductions.fsaDepCareAnnual || 0, limits.fsaDependentCare);

  const healthInsurance = resolveAmount(deductions.healthInsurance);
  const dentalInsurance = resolveAmount(deductions.dentalInsurance);
  const visionInsurance = resolveAmount(deductions.visionInsurance);
  const commuterBenefit = resolveAmount(deductions.commuterBenefit);

  const preTax = {
    retirement401k: capped401k,
    hsa,
    fsaHealth,
    fsaDepCare,
    healthInsurance,
    dentalInsurance,
    visionInsurance,
    commuterBenefit,
  };

  const totalPreTax = Math.round(
    Object.values(preTax).reduce((sum, v) => sum + v, 0) * 100
  ) / 100;

  // --- Post-Tax Deductions ---
  const rothIRA = resolveAmount(deductions.rothIRA);
  const lifeInsurance = resolveAmount(deductions.lifeInsurance);
  const legalShield = resolveAmount(deductions.legalShield);
  const garnishment = resolveAmount(deductions.garnishment);
  const unionDues = resolveAmount(deductions.unionDues);
  const charityContribution = resolveAmount(deductions.charityContribution);
  const otherPostTax = resolveAmount(deductions.otherPostTax);

  const postTax = {
    rothIRA,
    lifeInsurance,
    legalShield,
    garnishment,
    unionDues,
    charityContribution,
    otherPostTax,
  };

  const totalPostTax = Math.round(
    Object.values(postTax).reduce((sum, v) => sum + v, 0) * 100
  ) / 100;

  return { preTax, postTax, totalPreTax, totalPostTax };
}

// ---------------------------------------------------------------------------
// Pay Stub Processing
// ---------------------------------------------------------------------------

/**
 * Process a complete pay stub: gross -> pre-tax -> taxes -> post-tax -> net.
 *
 * @param {Object} employee    - Full employee record
 * @param {Object} hoursWorked - Hours breakdown
 * @param {Object} payPeriod   - { frequency, startDate, endDate, periodNumber }
 * @returns {Object} Complete pay stub
 */
function processPayStub(employee, hoursWorked, payPeriod) {
  if (!employee) throw new Error('Employee record is required');

  const period = payPeriod || {};

  // Step 1: Gross pay
  const gross = calculateGrossPay(employee, hoursWorked, period);

  // Step 2: Pre-tax deductions
  const deductions = calculateDeductions(employee, gross.totalGross);

  // Step 3: Taxable income (gross minus pre-tax deductions)
  const taxableIncome = Math.round((gross.totalGross - deductions.totalPreTax) * 100) / 100;

  // Step 4: Taxes (pass pre-tax deduction total into payPeriod for annualization)
  const taxPeriod = Object.assign({}, period, {
    preTaxDeductions: deductions.totalPreTax,
  });
  const taxes = taxEngine.calculateEmployeeTaxes(employee, gross.totalGross, taxPeriod);

  // Step 5: Net pay
  const netPay = Math.round(
    (gross.totalGross - deductions.totalPreTax - taxes.total - deductions.totalPostTax) * 100
  ) / 100;

  // Assemble pay stub
  return {
    employeeId: employee.id || employee.employeeId,
    employeeName: [employee.firstName, employee.lastName].filter(Boolean).join(' '),
    payPeriod: {
      startDate: period.startDate || null,
      endDate: period.endDate || null,
      frequency: period.frequency || employee.payFrequency || 'biweekly',
      periodNumber: period.periodNumber || null,
    },
    earnings: gross,
    deductions,
    taxableIncome,
    taxes,
    netPay,
    ytd: {
      grossBefore: employee.ytdGross || 0,
      grossAfter: (employee.ytdGross || 0) + gross.totalGross,
      taxesBefore: employee.ytdTaxes || 0,
      taxesAfter: (employee.ytdTaxes || 0) + taxes.total,
      netBefore: employee.ytdNet || 0,
      netAfter: (employee.ytdNet || 0) + netPay,
    },
    generatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Pay Run Processing
// ---------------------------------------------------------------------------

/**
 * Run payroll for all employees in a pay run.
 *
 * @param {Object} payRun - { id, employees: [...], payPeriod, status }
 *                          OR a payRunId string (loads from store)
 * @returns {Object} Pay run results with per-employee stubs and summary.
 */
function runPayroll(payRun) {
  // If a string ID is passed, try loading from store
  if (typeof payRun === 'string') {
    if (employeeStore && employeeStore.getPayRun) {
      payRun = employeeStore.getPayRun(payRun);
    } else {
      throw new Error(`Cannot load pay run "${payRun}" - no employee store available`);
    }
  }

  if (!payRun || !payRun.employees || !Array.isArray(payRun.employees)) {
    throw new Error('payRun must include an employees array');
  }

  const results = [];
  const errors = [];
  let totalGross = 0;
  let totalTaxes = 0;
  let totalDeductions = 0;
  let totalNet = 0;

  for (const entry of payRun.employees) {
    const employee = entry.employee || entry;
    const hoursWorked = entry.hoursWorked || entry.hours || {};

    try {
      const stub = processPayStub(employee, hoursWorked, payRun.payPeriod);
      results.push({ employeeId: employee.id || employee.employeeId, status: 'success', payStub: stub });

      totalGross += stub.earnings.totalGross;
      totalTaxes += stub.taxes.total;
      totalDeductions += stub.deductions.totalPreTax + stub.deductions.totalPostTax;
      totalNet += stub.netPay;
    } catch (err) {
      errors.push({
        employeeId: employee.id || employee.employeeId,
        employeeName: [employee.firstName, employee.lastName].filter(Boolean).join(' '),
        status: 'error',
        error: err.message,
      });
    }
  }

  return {
    payRunId: payRun.id || null,
    processedAt: new Date().toISOString(),
    payPeriod: payRun.payPeriod || {},
    summary: {
      totalEmployees: payRun.employees.length,
      successCount: results.length,
      errorCount: errors.length,
      totalGross: Math.round(totalGross * 100) / 100,
      totalTaxes: Math.round(totalTaxes * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      totalNet: Math.round(totalNet * 100) / 100,
    },
    results,
    errors,
  };
}

module.exports = {
  calculateGrossPay,
  calculateDeductions,
  processPayStub,
  runPayroll,
};
