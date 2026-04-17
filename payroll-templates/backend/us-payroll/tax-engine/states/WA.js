'use strict';

// ─── Washington (WA) State Tax Module ───────────────────────────────────────
// No income tax. PFML, WA Cares Fund, SUI, high min wage, meal/rest breaks.

const stateCode = 'WA';
const stateName = 'Washington';
const hasStateIncomeTax = false;

// ─── Rounding helper ────────────────────────────────────────────────────────
function round2(value) {
  return Math.round(value * 100) / 100;
}

// ─── Configuration ──────────────────────────────────────────────────────────
const config = {
  minimumWage: 16.28,
  localMinimumWages: {
    'Seattle_large': 19.97,   // 501+ employees
    'Seattle_small': 17.25,   // 500 or fewer
    'SeaTac': 19.71,
    'Tukwila': 20.29,
  },

  overtimeRules: {
    type: 'weekly_only',
    weekly: {
      threshold: 40,
      rate: 1.5,
    },
  },

  exemptSalaryThreshold: 67724.80, // 2 x $16.28 x 2080

  payFrequencyRules: {
    allowed: ['weekly', 'biweekly', 'semimonthly', 'monthly'],
    monthlyAllowedFor: 'exempt_only',
    finalPayIfTerminated: 'next_regular_payday',
    finalPayIfQuit: 'next_regular_payday',
  },

  taxBrackets: [], // no state income tax

  programs: {
    PFML: {
      name: 'Paid Family & Medical Leave',
      totalRate: 0.0074,         // 0.74%
      employeeSharePct: 0.7276,  // 72.76%
      employerSharePct: 0.2724,  // 27.24%
      employeeRate: 0.005384,    // ~0.5384%
      employerRate: 0.002016,    // ~0.2016%
      wageCap: 176100,           // same as Social Security wage base
      paidBy: 'both',
    },
    WACares: {
      name: 'WA Cares Fund (Long-Term Care)',
      rate: 0.0058,             // 0.58%
      wageCap: Infinity,        // no cap
      paidBy: 'employee',
    },
    SUI: {
      name: 'State Unemployment Insurance',
      wageBase: 68500,
      paidBy: 'employer',
    },
  },

  paidSickLeave: {
    accrualRate: '1_hour_per_40_hours',
    accrualRateHours: 1 / 40,
    maxCarryover: 40,  // hours
  },

  mealBreakRules: {
    afterHours: 5,
    durationMinutes: 30,
    paid: false,
  },
  restBreakRules: {
    interval: 4,           // every 4 hours
    durationMinutes: 10,
    paid: true,
  },
};

// ─── PIT Calculation (none) ─────────────────────────────────────────────────
function calculateStateIncomeTax(taxableIncome, stateW4, payFrequency) {
  return { amount: 0, effectiveRate: 0 };
}

// ─── State Programs (employee & employer shares) ────────────────────────────
function calculateStatePrograms(grossPay, ytdGross, employee) {
  const items = [];
  const pfml = config.programs.PFML;
  const waCares = config.programs.WACares;

  // PFML — capped at Social Security wage base
  const pfmlTaxableWages = Math.max(0, Math.min(grossPay, pfml.wageCap - ytdGross));
  const pfmlEmployeeAmt = round2(pfmlTaxableWages * pfml.employeeRate);
  const pfmlEmployerAmt = round2(pfmlTaxableWages * pfml.employerRate);

  items.push({
    code: 'WA_PFML',
    name: 'WA Paid Family & Medical Leave',
    employee_amount: pfmlEmployeeAmt,
    employer_amount: pfmlEmployerAmt,
  });

  // WA Cares Fund — employee only, no cap
  // Employees with approved exemptions are excluded
  const isExempt = employee && employee.waCaresFundExempt === true;
  if (!isExempt) {
    const waCaresAmt = round2(grossPay * waCares.rate);
    items.push({
      code: 'WA_CARES',
      name: 'WA Cares Fund',
      employee_amount: waCaresAmt,
      employer_amount: 0,
    });
  }

  return { items };
}

// ─── Employer Taxes ─────────────────────────────────────────────────────────
function calculateEmployerTaxes(grossPay, ytdSUTAWages, suiRate) {
  const items = [];
  const suiWageBase = config.programs.SUI.wageBase;

  const suiTaxableWages = Math.max(0, Math.min(grossPay, suiWageBase - ytdSUTAWages));
  const suiAmount = round2(suiTaxableWages * (suiRate || 0.0));

  items.push({
    code: 'WA_SUI',
    name: 'WA State Unemployment Insurance',
    amount: suiAmount,
    taxable_wages: suiTaxableWages,
  });

  return { items };
}

// ─── Required Pay Stub Fields ───────────────────────────────────────────────
function getRequiredStubFields() {
  return [
    'employer_name',
    'employer_address',
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

  // Minimum wage check
  if (employee.hourlyRate && employee.hourlyRate < config.minimumWage) {
    errors.push(
      `Hourly rate $${employee.hourlyRate} is below WA minimum wage $${config.minimumWage}`
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
      `Exempt salary $${employee.annualSalary} is below WA threshold $${config.exemptSalaryThreshold}`
    );
  }

  // Meal break validation
  if (hours && hours.dailyHours) {
    for (const day of hours.dailyHours) {
      if (day.hoursWorked > 5 && !day.mealBreakTaken) {
        warnings.push(
          `${day.date}: Worked ${day.hoursWorked}h without meal break (required after 5h in WA)`
        );
      }
      // Rest break: 10 min per 4 hours
      const expectedRestBreaks = Math.floor(day.hoursWorked / 4);
      if (expectedRestBreaks > 0 && day.restBreaksTaken !== undefined && day.restBreaksTaken < expectedRestBreaks) {
        warnings.push(
          `${day.date}: Expected ${expectedRestBreaks} rest break(s), only ${day.restBreaksTaken} taken`
        );
      }
    }
  }

  // Paid sick leave accrual reminder
  if (hours && hours.totalHours && hours.totalHours > 0) {
    const accrued = round2(hours.totalHours * config.paidSickLeave.accrualRateHours);
    if (accrued > 0) {
      warnings.push(
        `Paid sick leave accrued this period: ${accrued}h (1h per 40h worked)`
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
