'use strict';

// ─── Florida (FL) State Tax Module ──────────────────────────────────────────
// No income tax. Reemployment Tax (SUI), min wage $15.00 (Sept 30 2026).

const stateCode = 'FL';
const stateName = 'Florida';
const hasStateIncomeTax = false;

// ─── Rounding helper ────────────────────────────────────────────────────────
function round2(value) {
  return Math.round(value * 100) / 100;
}

// ─── Configuration ──────────────────────────────────────────────────────────
const config = {
  minimumWage: 15.00,           // effective Sept 30, 2026
  tippedMinimumWage: 11.98,
  localMinimumWages: {},         // FL preempts local min wage laws

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
    finalPayIfTerminated: 'next_regular_payday',
    finalPayIfQuit: 'next_regular_payday',
  },

  taxBrackets: [], // no state income tax

  programs: {
    ReemploymentTax: {
      name: 'Reemployment Tax (SUI)',
      wageBase: 7000,
      rateMin: 0.0010,     // 0.10%
      rateMax: 0.0540,     // 5.40%
      newEmployerRate: 0.027, // 2.7%
      paidBy: 'employer',
    },
  },

  workersComp: {
    mandatory: true,
    employeeThreshold: 4, // mandatory for 4+ employees
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
  const wageBase = config.programs.ReemploymentTax.wageBase;

  const taxableWages = Math.max(0, Math.min(grossPay, wageBase - ytdSUTAWages));
  const effectiveRate = suiRate || config.programs.ReemploymentTax.newEmployerRate;
  const amount = round2(taxableWages * effectiveRate);

  items.push({
    code: 'FL_RT',
    name: 'FL Reemployment Tax',
    amount: amount,
    taxable_wages: taxableWages,
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

  // Minimum wage check
  if (employee.hourlyRate && employee.hourlyRate < config.minimumWage) {
    // Check tipped exception
    if (employee.isTipped && employee.hourlyRate >= config.tippedMinimumWage) {
      // Tipped rate is acceptable if tips bring total to minimum
      warnings.push(
        `Tipped employee rate $${employee.hourlyRate} — ensure tips + wage >= $${config.minimumWage}/hr`
      );
    } else if (!employee.isTipped) {
      errors.push(
        `Hourly rate $${employee.hourlyRate} is below FL minimum wage $${config.minimumWage}`
      );
    }
  }

  // Tipped minimum wage
  if (employee.isTipped && employee.hourlyRate && employee.hourlyRate < config.tippedMinimumWage) {
    errors.push(
      `Tipped hourly rate $${employee.hourlyRate} is below FL tipped minimum $${config.tippedMinimumWage}`
    );
  }

  // Exempt salary threshold (federal)
  if (employee.isExempt && employee.annualSalary && employee.annualSalary < config.exemptSalaryThreshold) {
    errors.push(
      `Exempt salary $${employee.annualSalary} is below FLSA threshold $${config.exemptSalaryThreshold}`
    );
  }

  // Workers comp reminder
  if (employee.companySize && employee.companySize >= config.workersComp.employeeThreshold) {
    if (!employee.workersCompCoverage) {
      warnings.push(
        'FL requires workers compensation for employers with 4+ employees'
      );
    }
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
