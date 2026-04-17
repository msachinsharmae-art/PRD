'use strict';

// ─── California (CA) State Tax Module ───────────────────────────────────────
// Most complex state: PIT with 10 brackets + mental health surcharge,
// SDI, SUI, ETT, daily/weekly OT, meal/rest break rules, strict stub reqs.

const stateCode = 'CA';
const stateName = 'California';
const hasStateIncomeTax = true;

// ─── Rounding helper ────────────────────────────────────────────────────────
function round2(value) {
  return Math.round(value * 100) / 100;
}

// ─── Configuration ──────────────────────────────────────────────────────────
const config = {
  minimumWage: 16.90,
  localMinimumWages: {
    'Los Angeles': 17.28,
    'San Francisco': 18.67,
    'San Jose': 17.55,
    'Santa Monica': 17.27,
  },

  overtimeRules: {
    type: 'daily_and_weekly',
    daily: {
      threshold1: 8,   // hours: >8 = 1.5x
      rate1: 1.5,
      threshold2: 12,  // hours: >12 = 2x
      rate2: 2.0,
    },
    weekly: {
      threshold: 40,   // weekly >40h after daily OT already counted
      rate: 1.5,
    },
    seventhConsecutiveDay: {
      first8: 1.5,
      after8: 2.0,
    },
  },

  exemptSalaryThreshold: 70304, // 2 x $16.90 x 2080

  payFrequencyRules: {
    allowed: ['weekly', 'biweekly', 'semimonthly', 'monthly'],
    semimonthlyPayDays: [1, 16],     // wages earned 1st-15th due by 26th, 16th-last due by 10th
    finalPayIfTerminated: 'immediate', // same day if fired
    finalPayIfQuit72Notice: 'last_day',
    finalPayIfQuitNoNotice: '72_hours',
  },

  // 2026 PIT brackets — Single/MFS filing (annualized)
  taxBrackets: [
    { min: 0,         max: 10756,   rate: 0.01 },
    { min: 10757,     max: 25499,   rate: 0.02 },
    { min: 25500,     max: 40245,   rate: 0.04 },
    { min: 40246,     max: 55866,   rate: 0.06 },
    { min: 55867,     max: 70606,   rate: 0.08 },
    { min: 70607,     max: 360659,  rate: 0.093 },
    { min: 360660,    max: 432787,  rate: 0.103 },
    { min: 432788,    max: 721314,  rate: 0.113 },
    { min: 721315,    max: Infinity, rate: 0.123 },
  ],

  mentalHealthSurcharge: {
    threshold: 1000000,
    rate: 0.01,
  },

  programs: {
    SDI: {
      name: 'State Disability Insurance',
      rate: 0.011,       // 1.1%
      wageCap: Infinity, // no cap since 2024
      paidBy: 'employee',
    },
    SUI: {
      name: 'State Unemployment Insurance',
      wageBase: 7000,
      paidBy: 'employer',
    },
    ETT: {
      name: 'Employment Training Tax',
      rate: 0.001,  // 0.1%
      wageBase: 7000,
      paidBy: 'employer',
    },
  },

  mealBreakRules: {
    first: { afterHours: 5, durationMinutes: 30 },
    second: { afterHours: 10, durationMinutes: 30 },
    premium: '1_hour_regular_rate',
  },
  restBreakRules: {
    interval: 4,          // every 4 hours (or major fraction)
    durationMinutes: 10,
    paid: true,
    premium: '1_hour_regular_rate',
  },
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

  // DE-4 allowances reduce taxable income
  const allowanceValue = stateW4 && stateW4.allowances
    ? stateW4.allowances * (stateW4.allowanceValue || 154.00)
    : 0;
  const additionalWithholding = (stateW4 && (stateW4.additional_withholding || stateW4.additionalWithholding)) || 0;

  // Annualize the periodic income
  const annualIncome = (taxableIncome * periods) - allowanceValue;
  if (annualIncome <= 0) {
    return { amount: 0, effectiveRate: 0 };
  }

  // Progressive bracket calc
  let annualTax = 0;
  for (const bracket of config.taxBrackets) {
    if (annualIncome <= bracket.min) break;
    const taxableInBracket = Math.min(annualIncome, bracket.max) - bracket.min;
    if (taxableInBracket > 0) {
      annualTax += taxableInBracket * bracket.rate;
    }
  }

  // Mental health surcharge: +1% on income > $1M
  if (annualIncome > config.mentalHealthSurcharge.threshold) {
    annualTax += (annualIncome - config.mentalHealthSurcharge.threshold) * config.mentalHealthSurcharge.rate;
  }

  // De-annualize back to pay period
  let periodTax = annualTax / periods;
  periodTax += additionalWithholding;
  periodTax = round2(Math.max(periodTax, 0));

  return {
    amount: periodTax,
    effectiveRate: round2((periodTax / taxableIncome) * 100) / 100,
  };
}

// ─── State Programs (employee-side) ─────────────────────────────────────────
function calculateStatePrograms(grossPay, ytdGross, employee) {
  const items = [];

  // SDI — 1.1% of all wages, no cap
  const sdiAmount = round2(grossPay * config.programs.SDI.rate);
  items.push({
    code: 'CA_SDI',
    name: 'CA State Disability Insurance',
    employee_amount: sdiAmount,
    employer_amount: 0,
  });

  return { items };
}

// ─── Employer Taxes ─────────────────────────────────────────────────────────
function calculateEmployerTaxes(grossPay, ytdSUTAWages, suiRate) {
  const items = [];
  const suiWageBase = config.programs.SUI.wageBase;
  const ettWageBase = config.programs.ETT.wageBase;

  // SUI
  const suiTaxableWages = Math.max(0, Math.min(grossPay, suiWageBase - ytdSUTAWages));
  const suiAmount = round2(suiTaxableWages * (suiRate || 0.034));
  items.push({
    code: 'CA_SUI',
    name: 'CA State Unemployment Insurance',
    amount: suiAmount,
    taxable_wages: suiTaxableWages,
  });

  // ETT — 0.1% on first $7,000
  const ettTaxableWages = Math.max(0, Math.min(grossPay, ettWageBase - ytdSUTAWages));
  const ettAmount = round2(ettTaxableWages * config.programs.ETT.rate);
  items.push({
    code: 'CA_ETT',
    name: 'CA Employment Training Tax',
    amount: ettAmount,
    taxable_wages: ettTaxableWages,
  });

  return { items };
}

// ─── Required Pay Stub Fields (Labor Code section 226) ──────────────────────
function getRequiredStubFields() {
  return [
    'employer_name',
    'employer_address',
    'employee_name',
    'ssn_last4',
    'pay_period_dates',
    'pay_date',
    'hours_itemized',
    'all_rates',
    'all_deductions_itemized',
    'net_wages',
    'sick_leave_balance',
  ];
}

// ─── Compliance Validation ──────────────────────────────────────────────────
function validateCompliance(employee, hours) {
  const warnings = [];
  const errors = [];

  // Minimum wage check
  if (employee.hourlyRate && employee.hourlyRate < config.minimumWage) {
    errors.push(
      `Hourly rate $${employee.hourlyRate} is below CA minimum wage $${config.minimumWage}`
    );
  }

  // Local minimum wage
  if (employee.workCity && config.localMinimumWages[employee.workCity]) {
    const localMin = config.localMinimumWages[employee.workCity];
    if (employee.hourlyRate && employee.hourlyRate < localMin) {
      errors.push(
        `Hourly rate $${employee.hourlyRate} is below ${employee.workCity} minimum wage $${localMin}`
      );
    }
  }

  // Exempt salary threshold
  if (employee.isExempt && employee.annualSalary && employee.annualSalary < config.exemptSalaryThreshold) {
    errors.push(
      `Exempt salary $${employee.annualSalary} is below CA threshold $${config.exemptSalaryThreshold}`
    );
  }

  // Meal break validation
  if (hours && hours.dailyHours) {
    for (const day of hours.dailyHours) {
      if (day.hoursWorked > 5 && !day.mealBreakTaken) {
        warnings.push(
          `${day.date}: Worked ${day.hoursWorked}h without meal break — 1hr premium may apply`
        );
      }
      if (day.hoursWorked > 10 && !day.secondMealBreakTaken) {
        warnings.push(
          `${day.date}: Worked ${day.hoursWorked}h without second meal break — 1hr premium may apply`
        );
      }
      // Rest break: 10 min per 4 hours
      const expectedRestBreaks = Math.ceil(day.hoursWorked / 4) - (day.hoursWorked <= 3.5 ? 1 : 0);
      if (expectedRestBreaks > 0 && day.restBreaksTaken !== undefined && day.restBreaksTaken < expectedRestBreaks) {
        warnings.push(
          `${day.date}: Expected ${expectedRestBreaks} rest break(s), only ${day.restBreaksTaken} taken`
        );
      }
    }
  }

  // Daily overtime detection
  if (hours && hours.dailyHours && !employee.isExempt) {
    for (const day of hours.dailyHours) {
      if (day.hoursWorked > 12) {
        warnings.push(`${day.date}: ${day.hoursWorked}h worked — double-time applies after 12h`);
      } else if (day.hoursWorked > 8) {
        warnings.push(`${day.date}: ${day.hoursWorked}h worked — overtime (1.5x) applies after 8h`);
      }
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
