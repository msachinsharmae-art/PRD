'use strict';

// ─── Texas (TX) State Tax Module ────────────────────────────────────────────
// Simplest state: no income tax, no SDI, no PFL. Employer SUI only.

const stateCode = 'TX';
const stateName = 'Texas';
const hasStateIncomeTax = false;

// ─── Rounding helper ────────────────────────────────────────────────────────
function round2(value) {
  return Math.round(value * 100) / 100;
}

// ─── Configuration ──────────────────────────────────────────────────────────
const config = {
  minimumWage: 7.25, // follows federal
  localMinimumWages: {},

  overtimeRules: {
    type: 'weekly_only',
    weekly: {
      threshold: 40,
      rate: 1.5,
    },
  },

  exemptSalaryThreshold: 35568, // federal FLSA threshold

  payFrequencyRules: {
    allowed: ['weekly', 'biweekly', 'semimonthly', 'monthly'],
    finalPayIfTerminated: '6_calendar_days',
    finalPayIfQuit: 'next_regular_payday',
  },

  taxBrackets: [], // no state income tax

  programs: {
    SUI: {
      name: 'State Unemployment Insurance',
      wageBase: 9000,
      newEmployerRate: 0.027, // 2.7%
      paidBy: 'employer',
    },
  },

  mealBreakRules: null,  // no state requirement
  restBreakRules: null,   // no state requirement
};

// ─── PIT Calculation (none) ─────────────────────────────────────────────────
function calculateStateIncomeTax(taxableIncome, stateW4, payFrequency) {
  return { amount: 0, effectiveRate: 0 };
}

// ─── State Programs (none) ──────────────────────────────────────────────────
function calculateStatePrograms(grossPay, ytdGross, employee) {
  return { items: [] };
}

// ─── Employer Taxes ─────────────────────────────────────────────────────────
function calculateEmployerTaxes(grossPay, ytdSUTAWages, suiRate) {
  const items = [];
  const suiWageBase = config.programs.SUI.wageBase;

  const suiTaxableWages = Math.max(0, Math.min(grossPay, suiWageBase - ytdSUTAWages));
  const effectiveRate = suiRate || config.programs.SUI.newEmployerRate;
  const suiAmount = round2(suiTaxableWages * effectiveRate);

  items.push({
    code: 'TX_SUI',
    name: 'TX State Unemployment Insurance',
    amount: suiAmount,
    taxable_wages: suiTaxableWages,
  });

  return { items };
}

// ─── Required Pay Stub Fields ───────────────────────────────────────────────
function getRequiredStubFields() {
  return [
    'employer_name',
    'employee_name',
    'pay_period_dates',
    'pay_date',
    'hours_worked',
    'pay_rate',
    'gross_pay',
    'deductions',
    'net_pay',
  ];
}

// ─── Compliance Validation ──────────────────────────────────────────────────
function validateCompliance(employee, hours) {
  const warnings = [];
  const errors = [];

  // Minimum wage check (federal)
  if (employee.hourlyRate && employee.hourlyRate < config.minimumWage) {
    errors.push(
      `Hourly rate $${employee.hourlyRate} is below federal minimum wage $${config.minimumWage}`
    );
  }

  // Exempt salary threshold (federal)
  if (employee.isExempt && employee.annualSalary && employee.annualSalary < config.exemptSalaryThreshold) {
    errors.push(
      `Exempt salary $${employee.annualSalary} is below FLSA threshold $${config.exemptSalaryThreshold}`
    );
  }

  // Final pay warning for terminated employees
  if (employee.isTerminated && !employee.finalPayIssued) {
    warnings.push(
      'TX requires final pay within 6 calendar days of involuntary termination'
    );
  }

  return { warnings, errors };
}

// ─── Exports ────────────────────────────────────────────────────────────────
module.exports = {
  stateCode,
  stateName,
  hasStateIncomeTax,
  config,
  calculateStateIncomeTax,
  calculateStatePrograms,
  calculateEmployerTaxes,
  getRequiredStubFields,
  validateCompliance,
};
