'use strict';

// ─── Georgia (GA) State Tax Module ──────────────────────────────────────────
// 6-bracket income tax with standard deduction & personal exemptions,
// G-4 with allowances, SUI employer-only, no SDI/PFL.

const stateCode = 'GA';
const stateName = 'Georgia';
const hasStateIncomeTax = true;

// ─── Rounding helper ────────────────────────────────────────────────────────
function round2(value) {
  return Math.round(value * 100) / 100;
}

// ─── Configuration ──────────────────────────────────────────────────────────
const config = {
  minimumWage: 7.25, // GA state min is $5.15 but federal $7.25 applies to most

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
    finalPayIfTerminated: 'next_regular_payday',
    finalPayIfQuit: 'next_regular_payday',
    newHireReport: {
      deadline: '10_days',
      reportTo: 'GA New Hire Reporting Center',
    },
  },

  // 2024 GA state income tax brackets (per individual)
  taxBrackets: [
    { min: 0,     max: 750,      rate: 0.01 },
    { min: 751,   max: 2250,     rate: 0.02 },
    { min: 2251,  max: 3750,     rate: 0.03 },
    { min: 3751,  max: 5250,     rate: 0.04 },
    { min: 5251,  max: 7000,     rate: 0.05 },
    { min: 7001,  max: Infinity, rate: 0.0549 },
  ],

  standardDeduction: {
    single: 12000,
    married_filing_jointly: 24000,
    married_filing_separately: 12000,
    head_of_household: 12000,
  },

  personalExemption: {
    taxpayer: 2700,
    dependent: 3000,
  },

  programs: {
    SUI: {
      name: 'State Unemployment Insurance',
      wageBase: 9500,
      newEmployerRate: 0.027, // 2.7%
      paidBy: 'employer',
    },
  },

  workersComp: {
    mandatory: true,
    employeeThreshold: 3, // mandatory for 3+ employees
  },

  mealBreakRules: null,  // no state requirement
  restBreakRules: null,   // no state requirement
};

// ─── Pay-frequency annualization factors ────────────────────────────────────
const ANNUALIZE = {
  weekly: 52,
  bi_weekly: 26, biweekly: 26,
  semi_monthly: 24, semimonthly: 24,
  monthly: 12,
  annually: 1,
};

// ─── PIT Calculation ────────────────────────────────────────────────────────
function calculateStateIncomeTax(taxableIncome, stateW4, payFrequency) {
  if (taxableIncome <= 0) {
    return { amount: 0, effectiveRate: 0 };
  }

  const periods = ANNUALIZE[payFrequency] || 1;

  // G-4 form data
  const filingStatus = (stateW4 && (stateW4.filing_status || stateW4.filingStatus)) || 'single';
  const allowances = (stateW4 && stateW4.allowances) || 0;
  const dependents = (stateW4 && stateW4.dependents) || 0;
  const additionalWithholding = (stateW4 && (stateW4.additional_withholding || stateW4.additionalWithholding)) || 0;

  // Annualize
  const annualGross = taxableIncome * periods;

  // Subtract standard deduction
  const stdDeduction = config.standardDeduction[filingStatus] || config.standardDeduction.single;

  // Personal exemptions: taxpayer allowances + dependent exemptions
  const personalExemptions = (allowances * config.personalExemption.taxpayer)
    + (dependents * config.personalExemption.dependent);

  const annualTaxableIncome = Math.max(0, annualGross - stdDeduction - personalExemptions);
  if (annualTaxableIncome <= 0) {
    return { amount: 0, effectiveRate: 0 };
  }

  // Progressive bracket calculation
  let annualTax = 0;
  for (const bracket of config.taxBrackets) {
    if (annualTaxableIncome <= bracket.min) break;
    const taxableInBracket = Math.min(annualTaxableIncome, bracket.max) - bracket.min;
    if (taxableInBracket > 0) {
      annualTax += taxableInBracket * bracket.rate;
    }
  }

  // De-annualize
  let periodTax = annualTax / periods;
  periodTax += additionalWithholding;
  periodTax = round2(Math.max(periodTax, 0));

  return {
    amount: periodTax,
    effectiveRate: round2((periodTax / taxableIncome) * 100) / 100,
  };
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
    code: 'GA_SUI',
    name: 'GA State Unemployment Insurance',
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
    'all_deductions_itemized',
    'net_pay',
  ];
}

// ─── Compliance Validation ──────────────────────────────────────────────────
function validateCompliance(employee, hours) {
  const warnings = [];
  const errors = [];

  // Minimum wage check (federal applies)
  if (employee.hourlyRate && employee.hourlyRate < config.minimumWage) {
    errors.push(
      `Hourly rate $${employee.hourlyRate} is below applicable minimum wage $${config.minimumWage}`
    );
  }

  // Exempt salary threshold (federal)
  if (employee.isExempt && employee.annualSalary && employee.annualSalary < config.exemptSalaryThreshold) {
    errors.push(
      `Exempt salary $${employee.annualSalary} is below FLSA threshold $${config.exemptSalaryThreshold}`
    );
  }

  // New hire reporting
  if (employee.isNewHire && !employee.newHireReported) {
    warnings.push(
      'GA requires new hire report within 10 days of hire to GA New Hire Reporting Center'
    );
  }

  // Workers comp reminder
  if (employee.companySize && employee.companySize >= config.workersComp.employeeThreshold) {
    if (!employee.workersCompCoverage) {
      warnings.push(
        'GA requires workers compensation for employers with 3+ employees'
      );
    }
  }

  // G-4 form check
  if (!employee.stateW4 || !employee.stateW4.filingStatus) {
    warnings.push(
      'Missing GA G-4 form — cannot determine filing status and allowances'
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
