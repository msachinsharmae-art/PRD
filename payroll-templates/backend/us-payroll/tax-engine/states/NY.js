'use strict';

// ─── New York (NY) State Tax Module ─────────────────────────────────────────
// Second most complex: PIT with 9 brackets, NYC resident tax, Yonkers
// surcharge, PFL, DBL, spread-of-hours, WTPA notices.

const stateCode = 'NY';
const stateName = 'New York';
const hasStateIncomeTax = true;

// ─── Rounding helper ────────────────────────────────────────────────────────
function round2(value) {
  return Math.round(value * 100) / 100;
}

// ─── Configuration ──────────────────────────────────────────────────────────
const config = {
  minimumWage: {
    NYC: 16.00,
    'Long Island': 16.00,
    Westchester: 16.00,
    rest_of_state: 15.00,
  },
  localMinimumWages: {},

  overtimeRules: {
    type: 'weekly_only',
    weekly: {
      threshold: 40,
      rate: 1.5,
    },
    spreadOfHours: {
      spanThreshold: 10, // hours — if workday span >10h
      premium: 'one_hour_at_minimum_wage',
    },
  },

  exemptSalaryThreshold: {
    NYC: 62400,
    rest_of_state: 58458.40,
  },

  payFrequencyRules: {
    allowed: ['weekly', 'biweekly', 'semimonthly'],
    manualWorkers: 'weekly',  // manual workers must be paid weekly
    finalPayIfTerminated: 'next_regular_payday',
    finalPayIfQuit: 'next_regular_payday',
    wtpaNoticeRequired: true,
  },

  // 2024 NY State PIT brackets — Single filer
  taxBrackets: [
    { min: 0,         max: 8500,      rate: 0.04 },
    { min: 8501,      max: 11700,     rate: 0.045 },
    { min: 11701,     max: 13900,     rate: 0.0525 },
    { min: 13901,     max: 80650,     rate: 0.055 },
    { min: 80651,     max: 215400,    rate: 0.06 },
    { min: 215401,    max: 1077550,   rate: 0.0685 },
    { min: 1077551,   max: 5000000,   rate: 0.0965 },
    { min: 5000001,   max: 25000000,  rate: 0.103 },
    { min: 25000001,  max: Infinity,  rate: 0.109 },
  ],

  // NYC resident tax brackets — Single filer
  nycTaxBrackets: [
    { min: 0,      max: 12000,    rate: 0.03078 },
    { min: 12001,  max: 25000,    rate: 0.03762 },
    { min: 25001,  max: 50000,    rate: 0.03819 },
    { min: 50001,  max: Infinity, rate: 0.03876 },
  ],

  // Yonkers
  yonkersResident: {
    surchargeRate: 0.1675, // 16.75% of NY state tax
  },
  yonkersNonResident: {
    rate: 0.005, // 0.5% of wages
  },

  programs: {
    PFL: {
      name: 'Paid Family Leave',
      rate: 0.00373,              // 0.373%
      annualWageCap: 89343.80,    // SAWW x 52
      paidBy: 'employee',
    },
    DBL: {
      name: 'Disability Benefits Law',
      maxWeeklyDeduction: 0.60,   // $0.60/week max
      paidBy: 'employee',
    },
    SUI: {
      name: 'State Unemployment Insurance',
      wageBase: 12500,
      paidBy: 'employer',
    },
  },

  mealBreakRules: {
    factoryWorkers: { afterHours: 6, durationMinutes: 60, window: '11am-2pm' },
    nonFactoryWorkers: { afterHours: 6, durationMinutes: 30, window: '11am-2pm' },
    shiftOver6hStartingBefore2pm: true,
  },
  restBreakRules: null, // no general state requirement (some industry-specific)
};

// ─── Pay-frequency annualization factors ────────────────────────────────────
const ANNUALIZE = {
  weekly: 52,
  bi_weekly: 26, biweekly: 26,
  semi_monthly: 24, semimonthly: 24,
  monthly: 12,
  annually: 1,
};

// ─── Progressive bracket calculator ────────────────────────────────────────
function calcProgressiveTax(annualIncome, brackets) {
  let tax = 0;
  for (const bracket of brackets) {
    if (annualIncome <= bracket.min) break;
    const taxableInBracket = Math.min(annualIncome, bracket.max) - bracket.min;
    if (taxableInBracket > 0) {
      tax += taxableInBracket * bracket.rate;
    }
  }
  return tax;
}

// ─── PIT Calculation ────────────────────────────────────────────────────────
function calculateStateIncomeTax(taxableIncome, stateW4, payFrequency) {
  if (taxableIncome <= 0) {
    return { amount: 0, effectiveRate: 0 };
  }

  const periods = ANNUALIZE[payFrequency] || 1;

  // IT-2104 allowances reduce taxable income
  const allowanceValue = stateW4 && stateW4.allowances
    ? stateW4.allowances * (stateW4.allowanceValue || 1000)
    : 0;
  const additionalWithholding = (stateW4 && (stateW4.additional_withholding || stateW4.additionalWithholding)) || 0;

  // Annualize periodic income
  const annualIncome = Math.max(0, (taxableIncome * periods) - allowanceValue);
  if (annualIncome <= 0) {
    return { amount: 0, effectiveRate: 0 };
  }

  // NY State tax
  let annualStateTax = calcProgressiveTax(annualIncome, config.taxBrackets);

  // NYC resident tax
  let annualCityTax = 0;
  if (stateW4 && (stateW4.nyc_resident || stateW4.nycResident)) {
    annualCityTax = calcProgressiveTax(annualIncome, config.nycTaxBrackets);
  }

  // Yonkers
  let annualYonkersTax = 0;
  if (stateW4 && (stateW4.yonkers_resident || stateW4.yonkersResident)) {
    annualYonkersTax = annualStateTax * config.yonkersResident.surchargeRate;
  } else if (stateW4 && stateW4.yonkersNonResident) {
    annualYonkersTax = annualIncome * config.yonkersNonResident.rate;
  }

  const totalAnnualTax = annualStateTax + annualCityTax + annualYonkersTax;

  // De-annualize
  let periodTax = totalAnnualTax / periods;
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
  const pfl = config.programs.PFL;
  const dbl = config.programs.DBL;

  // PFL — 0.373% of gross, capped at annual wage cap
  const pflTaxableWages = Math.max(0, Math.min(grossPay, pfl.annualWageCap - ytdGross));
  const pflAmount = round2(pflTaxableWages * pfl.rate);
  items.push({
    code: 'NY_PFL',
    name: 'NY Paid Family Leave',
    employee_amount: pflAmount,
    employer_amount: 0,
  });

  // DBL — max $0.60/week (typically deducted per pay period)
  const payFrequency = (employee && employee.payFrequency) || 'biweekly';
  const weeksPerPeriod = {
    weekly: 1,
    biweekly: 2,
    semimonthly: 2.1667,
    monthly: 4.3333,
  };
  const weeks = weeksPerPeriod[payFrequency] || 1;
  const dblAmount = round2(Math.min(grossPay * 0.005, dbl.maxWeeklyDeduction * weeks));
  items.push({
    code: 'NY_DBL',
    name: 'NY Disability Benefits',
    employee_amount: dblAmount,
    employer_amount: 0,
  });

  return { items };
}

// ─── Employer Taxes ─────────────────────────────────────────────────────────
function calculateEmployerTaxes(grossPay, ytdSUTAWages, suiRate) {
  const items = [];
  const suiWageBase = config.programs.SUI.wageBase;

  const suiTaxableWages = Math.max(0, Math.min(grossPay, suiWageBase - ytdSUTAWages));
  const suiAmount = round2(suiTaxableWages * (suiRate || 0.0));

  items.push({
    code: 'NY_SUI',
    name: 'NY State Unemployment Insurance',
    amount: suiAmount,
    taxable_wages: suiTaxableWages,
  });

  return { items };
}

// ─── Required Pay Stub Fields (WTPA) ────────────────────────────────────────
function getRequiredStubFields() {
  return [
    'employer_name',
    'employer_address',
    'employer_phone',
    'employee_name',
    'pay_period_dates',
    'pay_date',
    'hours_worked',         // regular and OT separately
    'regular_rate',
    'overtime_rate',
    'gross_pay',
    'all_deductions_itemized',
    'all_allowances_claimed',
    'net_pay',
  ];
}

// ─── Compliance Validation ──────────────────────────────────────────────────
function validateCompliance(employee, hours) {
  const warnings = [];
  const errors = [];

  // Determine applicable minimum wage region
  const region = (employee && employee.workRegion) || 'rest_of_state';
  const applicableMinWage = config.minimumWage[region] || config.minimumWage.rest_of_state;

  // Minimum wage check
  if (employee.hourlyRate && employee.hourlyRate < applicableMinWage) {
    errors.push(
      `Hourly rate $${employee.hourlyRate} is below NY ${region} minimum wage $${applicableMinWage}`
    );
  }

  // Exempt salary threshold
  if (employee.isExempt && employee.annualSalary) {
    const exemptRegion = region === 'NYC' ? 'NYC' : 'rest_of_state';
    const threshold = config.exemptSalaryThreshold[exemptRegion];
    if (employee.annualSalary < threshold) {
      errors.push(
        `Exempt salary $${employee.annualSalary} is below NY ${exemptRegion} threshold $${threshold}`
      );
    }
  }

  // Spread of hours
  if (hours && hours.dailyHours && !employee.isExempt) {
    for (const day of hours.dailyHours) {
      if (day.daySpanHours && day.daySpanHours > config.overtimeRules.spreadOfHours.spanThreshold) {
        warnings.push(
          `${day.date}: Workday span ${day.daySpanHours}h exceeds 10h — spread-of-hours premium (1hr at min wage) required`
        );
      }
    }
  }

  // Meal break validation
  if (hours && hours.dailyHours) {
    for (const day of hours.dailyHours) {
      if (day.hoursWorked > 6 && !day.mealBreakTaken) {
        warnings.push(
          `${day.date}: Worked ${day.hoursWorked}h without meal break (required after 6h in NY)`
        );
      }
    }
  }

  // Manual worker weekly pay check
  if (employee.isManualWorker && employee.payFrequency !== 'weekly') {
    errors.push(
      'NY requires manual workers to be paid weekly'
    );
  }

  // WTPA notice
  if (employee.isNewHire && !employee.wtpaNoticeProvided) {
    warnings.push(
      'NY WTPA requires written notice of pay rate, pay day, OT rate, and allowances at time of hire'
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
