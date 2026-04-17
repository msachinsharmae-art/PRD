/**
 * US State Tax Calculations - 2026 Projected Rates
 * Covers: CA, NY, TX, NJ, WA, IL
 */

// ---------------------------------------------------------------------------
// State Tax Configurations
// ---------------------------------------------------------------------------

const STATE_TAX_CONFIG = {

  // =========================================================================
  // CALIFORNIA
  // =========================================================================
  CA: {
    name: 'California',
    hasIncomeTax: true,
    brackets: {
      single: [
        { min: 0,       max: 10412,   rate: 0.01 },
        { min: 10412,   max: 24684,   rate: 0.02 },
        { min: 24684,   max: 38959,   rate: 0.04 },
        { min: 38959,   max: 54081,   rate: 0.06 },
        { min: 54081,   max: 68350,   rate: 0.08 },
        { min: 68350,   max: 349137,  rate: 0.093 },
        { min: 349137,  max: 418961,  rate: 0.103 },
        { min: 418961,  max: 698271,  rate: 0.113 },
        { min: 698271,  max: 1000000, rate: 0.123 },
        { min: 1000000, max: Infinity, rate: 0.133 },
      ],
      married: [
        { min: 0,       max: 20824,   rate: 0.01 },
        { min: 20824,   max: 49368,   rate: 0.02 },
        { min: 49368,   max: 77918,   rate: 0.04 },
        { min: 77918,   max: 108162,  rate: 0.06 },
        { min: 108162,  max: 136700,  rate: 0.08 },
        { min: 136700,  max: 698274,  rate: 0.093 },
        { min: 698274,  max: 837922,  rate: 0.103 },
        { min: 837922,  max: 1396542, rate: 0.113 },
        { min: 1396542, max: 2000000, rate: 0.123 },
        { min: 2000000, max: Infinity, rate: 0.133 },
      ],
    },
    standardDeduction: { single: 5363, married: 10726 },
    // CA SDI (State Disability Insurance) - employee paid
    sdi: { rate: 0.011, wageBase: Infinity }, // No wage cap as of 2024+
    // CA PIT exemption credit
    exemptionCredit: { single: 154.00, married: 308.00 },
    // Mental Health Services Tax (additional 1% over $1M handled in brackets)
    sui: { employerRate: 0.034, wageBase: 7000 }, // employer-only, default new employer rate
  },

  // =========================================================================
  // NEW YORK
  // =========================================================================
  NY: {
    name: 'New York',
    hasIncomeTax: true,
    brackets: {
      single: [
        { min: 0,       max: 8500,    rate: 0.04 },
        { min: 8500,    max: 11700,   rate: 0.045 },
        { min: 11700,   max: 13900,   rate: 0.0525 },
        { min: 13900,   max: 80650,   rate: 0.055 },
        { min: 80650,   max: 215400,  rate: 0.06 },
        { min: 215400,  max: 1077550, rate: 0.0685 },
        { min: 1077550, max: 5000000, rate: 0.0965 },
        { min: 5000000, max: 25000000, rate: 0.103 },
        { min: 25000000, max: Infinity, rate: 0.109 },
      ],
      married: [
        { min: 0,       max: 17150,   rate: 0.04 },
        { min: 17150,   max: 23600,   rate: 0.045 },
        { min: 23600,   max: 27900,   rate: 0.0525 },
        { min: 27900,   max: 161550,  rate: 0.055 },
        { min: 161550,  max: 323200,  rate: 0.06 },
        { min: 323200,  max: 2155350, rate: 0.0685 },
        { min: 2155350, max: 5000000, rate: 0.0965 },
        { min: 5000000, max: 25000000, rate: 0.103 },
        { min: 25000000, max: Infinity, rate: 0.109 },
      ],
    },
    standardDeduction: { single: 8000, married: 16050 },
    // NYC additional income tax (for NYC residents only)
    nycTax: {
      brackets: [
        { min: 0,      max: 12000,  rate: 0.03078 },
        { min: 12000,  max: 25000,  rate: 0.03762 },
        { min: 25000,  max: 50000,  rate: 0.03819 },
        { min: 50000,  max: Infinity, rate: 0.03876 },
      ],
    },
    // NY SDI - employee paid
    sdi: { rate: 0.005, maxWeekly: 0.60 }, // $0.60/week max
    // NY Paid Family Leave
    pfl: { rate: 0.00455, wageBase: 89343.80 }, // 2026 projected
    sui: { employerRate: 0.041, wageBase: 12500 },
  },

  // =========================================================================
  // TEXAS
  // =========================================================================
  TX: {
    name: 'Texas',
    hasIncomeTax: false,
    brackets: null,
    standardDeduction: null,
    // No state income tax, but employer pays SUTA
    sui: { employerRate: 0.027, wageBase: 9000 }, // default new employer rate
  },

  // =========================================================================
  // NEW JERSEY
  // =========================================================================
  NJ: {
    name: 'New Jersey',
    hasIncomeTax: true,
    brackets: {
      single: [
        { min: 0,       max: 20000,   rate: 0.014 },
        { min: 20000,   max: 35000,   rate: 0.0175 },
        { min: 35000,   max: 40000,   rate: 0.035 },
        { min: 40000,   max: 75000,   rate: 0.05525 },
        { min: 75000,   max: 500000,  rate: 0.0637 },
        { min: 500000,  max: 1000000, rate: 0.0897 },
        { min: 1000000, max: Infinity, rate: 0.1075 },
      ],
      married: [
        { min: 0,       max: 20000,   rate: 0.014 },
        { min: 20000,   max: 50000,   rate: 0.0175 },
        { min: 50000,   max: 70000,   rate: 0.0245 },
        { min: 70000,   max: 80000,   rate: 0.035 },
        { min: 80000,   max: 150000,  rate: 0.05525 },
        { min: 150000,  max: 500000,  rate: 0.0637 },
        { min: 500000,  max: 1000000, rate: 0.0897 },
        { min: 1000000, max: Infinity, rate: 0.1075 },
      ],
    },
    standardDeduction: { single: 0, married: 0 }, // NJ has no standard deduction
    // NJ worker contributions
    sui: { employerRate: 0.028, wageBase: 42300 },
    workerContributions: {
      sui: { rate: 0.003825, wageBase: 42300 },       // SUI - employee share
      sdi: { rate: 0.0, wageBase: 42300 },             // SDI merged into TDI
      tdi: { rate: 0.00, wageBase: 42300 },             // Temporary Disability Insurance (set by employer)
      fli: { rate: 0.006, wageBase: 161400 },           // Family Leave Insurance
      wfSwf: { rate: 0.000425, wageBase: 42300 },       // Workforce Development
    },
  },

  // =========================================================================
  // WASHINGTON
  // =========================================================================
  WA: {
    name: 'Washington',
    hasIncomeTax: false,
    brackets: null,
    standardDeduction: null,
    // WA Paid Family & Medical Leave
    pfml: {
      totalRate: 0.0074,       // 0.74% total
      employeeShare: 0.58,     // Employee pays 58% of total
      employerShare: 0.42,     // Employer pays 42% of total
      wageBase: 168600,        // Social Security wage base
    },
    // WA Long-Term Care (WA Cares Fund)
    ltc: { rate: 0.0058, employeeOnly: true }, // 0.58% employee-paid
    // L&I (Workers Comp) - varies by industry, base rate placeholder
    lni: { baseRate: 0.0153, wageBase: Infinity }, // varies by risk class
    sui: { employerRate: 0.027, wageBase: 72500 },
  },

  // =========================================================================
  // ILLINOIS
  // =========================================================================
  IL: {
    name: 'Illinois',
    hasIncomeTax: true,
    flatRate: 0.0495, // 4.95% flat rate
    brackets: null,    // flat tax - no brackets
    standardDeduction: { single: 0, married: 0 }, // IL has no standard deduction
    personalExemption: { single: 2625, married: 5250 }, // 2026 projected
    sui: { employerRate: 0.0325, wageBase: 13590 },
  },

  // =========================================================================
  // GEORGIA
  // =========================================================================
  GA: {
    name: 'Georgia',
    hasIncomeTax: true,
    brackets: {
      single: [
        { min: 0,     max: 750,    rate: 0.01 },
        { min: 750,   max: 2250,   rate: 0.02 },
        { min: 2250,  max: 3750,   rate: 0.03 },
        { min: 3750,  max: 5250,   rate: 0.04 },
        { min: 5250,  max: 7000,   rate: 0.05 },
        { min: 7000,  max: Infinity, rate: 0.0549 },
      ],
      married: [
        { min: 0,     max: 1000,   rate: 0.01 },
        { min: 1000,  max: 3000,   rate: 0.02 },
        { min: 3000,  max: 5000,   rate: 0.03 },
        { min: 5000,  max: 7000,   rate: 0.04 },
        { min: 7000,  max: 10000,  rate: 0.05 },
        { min: 10000, max: Infinity, rate: 0.0549 },
      ],
    },
    standardDeduction: { single: 12000, married: 24000 },
    personalExemption: { single: 2700, married: 7400 },
    dependentExemption: 3000,
    sui: { employerRate: 0.027, wageBase: 9500 },
  },

  // =========================================================================
  // FLORIDA
  // =========================================================================
  FL: {
    name: 'Florida',
    hasIncomeTax: false,
    brackets: null,
    standardDeduction: null,
    sui: { employerRate: 0.027, wageBase: 7000 },
  },

};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function applyBrackets(taxableIncome, brackets) {
  let tax = 0;
  for (const bracket of brackets) {
    if (taxableIncome <= bracket.min) break;
    const taxableInBracket = Math.min(taxableIncome, bracket.max) - bracket.min;
    tax += taxableInBracket * bracket.rate;
  }
  return Math.round(tax * 100) / 100;
}

// ---------------------------------------------------------------------------
// State-specific calculators
// ---------------------------------------------------------------------------

function calcCA(annualWage, filingStatus) {
  const cfg = STATE_TAX_CONFIG.CA;
  const status = filingStatus === 'married' ? 'married' : 'single';
  const deduction = cfg.standardDeduction[status];
  const brackets = cfg.brackets[status];
  const taxableIncome = Math.max(0, annualWage - deduction);
  const incomeTax = applyBrackets(taxableIncome, brackets) - cfg.exemptionCredit[status];
  const sdi = Math.round(annualWage * cfg.sdi.rate * 100) / 100;

  return {
    state: 'CA',
    incomeTax: Math.max(0, Math.round(incomeTax * 100) / 100),
    sdi,
    totalEmployeeStateTax: Math.max(0, Math.round(incomeTax * 100) / 100) + sdi,
    compliance: {
      standardDeduction: deduction,
      taxableIncome,
      sdiRate: cfg.sdi.rate,
    },
  };
}

function calcNY(annualWage, filingStatus, isNYCResident = false) {
  const cfg = STATE_TAX_CONFIG.NY;
  const status = filingStatus === 'married' ? 'married' : 'single';
  const deduction = cfg.standardDeduction[status];
  const brackets = cfg.brackets[status];
  const taxableIncome = Math.max(0, annualWage - deduction);
  const incomeTax = applyBrackets(taxableIncome, brackets);

  // NYC additional tax
  let nycTax = 0;
  if (isNYCResident) {
    nycTax = applyBrackets(taxableIncome, cfg.nycTax.brackets);
  }

  // SDI: $0.60/week capped = $31.20/year
  const sdi = Math.min(31.20, 52 * cfg.sdi.maxWeekly);

  // Paid Family Leave
  const pflWage = Math.min(annualWage, cfg.pfl.wageBase);
  const pfl = Math.round(pflWage * cfg.pfl.rate * 100) / 100;

  const totalTax = Math.round((incomeTax + nycTax + sdi + pfl) * 100) / 100;

  return {
    state: 'NY',
    incomeTax: Math.round(incomeTax * 100) / 100,
    nycTax: Math.round(nycTax * 100) / 100,
    sdi,
    pfl,
    totalEmployeeStateTax: totalTax,
    compliance: {
      standardDeduction: deduction,
      taxableIncome,
      isNYCResident,
    },
  };
}

function calcTX(annualWage) {
  // No state income tax
  return {
    state: 'TX',
    incomeTax: 0,
    totalEmployeeStateTax: 0,
    compliance: {
      note: 'Texas has no state income tax. Employer pays SUTA.',
      sutaRate: STATE_TAX_CONFIG.TX.sui.employerRate,
      sutaWageBase: STATE_TAX_CONFIG.TX.sui.wageBase,
    },
  };
}

function calcNJ(annualWage, filingStatus) {
  const cfg = STATE_TAX_CONFIG.NJ;
  const status = filingStatus === 'married' ? 'married' : 'single';
  const brackets = cfg.brackets[status];
  const incomeTax = applyBrackets(annualWage, brackets); // NJ has no standard deduction

  const wc = cfg.workerContributions;
  const suiWage = Math.min(annualWage, wc.sui.wageBase);
  const sui = Math.round(suiWage * wc.sui.rate * 100) / 100;

  const fliWage = Math.min(annualWage, wc.fli.wageBase);
  const fli = Math.round(fliWage * wc.fli.rate * 100) / 100;

  const wfWage = Math.min(annualWage, wc.wfSwf.wageBase);
  const wfSwf = Math.round(wfWage * wc.wfSwf.rate * 100) / 100;

  const totalTax = Math.round((incomeTax + sui + fli + wfSwf) * 100) / 100;

  return {
    state: 'NJ',
    incomeTax: Math.round(incomeTax * 100) / 100,
    sui,
    fli,
    workforceDevelopment: wfSwf,
    totalEmployeeStateTax: totalTax,
    compliance: {
      note: 'NJ has no standard deduction. Worker contributions include SUI, FLI, WF/SWF.',
      taxableIncome: annualWage,
    },
  };
}

function calcWA(annualWage) {
  const cfg = STATE_TAX_CONFIG.WA;

  // Paid Family & Medical Leave - employee share
  const pfmlWage = Math.min(annualWage, cfg.pfml.wageBase);
  const pfmlEmployee = Math.round(pfmlWage * cfg.pfml.totalRate * cfg.pfml.employeeShare * 100) / 100;

  // Long-Term Care (WA Cares Fund)
  const ltc = Math.round(annualWage * cfg.ltc.rate * 100) / 100;

  const totalTax = Math.round((pfmlEmployee + ltc) * 100) / 100;

  return {
    state: 'WA',
    incomeTax: 0,
    pfml: pfmlEmployee,
    ltc,
    totalEmployeeStateTax: totalTax,
    compliance: {
      note: 'Washington has no state income tax. Employee pays PFML share and LTC.',
      pfmlTotal: Math.round(pfmlWage * cfg.pfml.totalRate * 100) / 100,
      pfmlEmployer: Math.round(pfmlWage * cfg.pfml.totalRate * cfg.pfml.employerShare * 100) / 100,
    },
  };
}

function calcIL(annualWage, filingStatus) {
  const cfg = STATE_TAX_CONFIG.IL;
  const status = filingStatus === 'married' ? 'married' : 'single';
  const exemption = cfg.personalExemption[status];
  const taxableIncome = Math.max(0, annualWage - exemption);
  const incomeTax = Math.round(taxableIncome * cfg.flatRate * 100) / 100;

  return {
    state: 'IL',
    incomeTax,
    totalEmployeeStateTax: incomeTax,
    compliance: {
      flatRate: cfg.flatRate,
      personalExemption: exemption,
      taxableIncome,
    },
  };
}

function calcGA(annualWage, filingStatus) {
  const cfg = STATE_TAX_CONFIG.GA;
  const status = filingStatus === 'married' ? 'married' : 'single';
  const deduction = cfg.standardDeduction[status];
  const exemption = cfg.personalExemption[status];
  const brackets = cfg.brackets[status];
  const taxableIncome = Math.max(0, annualWage - deduction - exemption);
  const incomeTax = applyBrackets(taxableIncome, brackets);

  return {
    state: 'GA',
    incomeTax: Math.round(incomeTax * 100) / 100,
    totalEmployeeStateTax: Math.round(incomeTax * 100) / 100,
    compliance: {
      standardDeduction: deduction,
      personalExemption: exemption,
      taxableIncome,
    },
  };
}

function calcFL(annualWage) {
  return {
    state: 'FL',
    incomeTax: 0,
    totalEmployeeStateTax: 0,
    compliance: {
      note: 'Florida has no state income tax. Employer pays Reemployment Tax (SUI).',
      sutaRate: STATE_TAX_CONFIG.FL.sui.employerRate,
      sutaWageBase: STATE_TAX_CONFIG.FL.sui.wageBase,
    },
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Calculate state taxes for a given state.
 *
 * @param {string} state          - Two-letter state code (CA, NY, TX, NJ, WA, IL)
 * @param {number} annualWage     - Annual gross wages
 * @param {string} filingStatus   - "single" | "married"
 * @param {object} [options]      - Additional options (e.g. { isNYCResident: true })
 * @returns {object} State tax breakdown
 */
function calculateStateTax(state, annualWage, filingStatus = 'single', options = {}) {
  const stateCode = (state || '').toUpperCase();

  switch (stateCode) {
    case 'CA': return calcCA(annualWage, filingStatus);
    case 'NY': return calcNY(annualWage, filingStatus, options.isNYCResident || false);
    case 'TX': return calcTX(annualWage);
    case 'NJ': return calcNJ(annualWage, filingStatus);
    case 'WA': return calcWA(annualWage);
    case 'IL': return calcIL(annualWage, filingStatus);
    case 'GA': return calcGA(annualWage, filingStatus);
    case 'FL': return calcFL(annualWage);
    default:
      throw new Error(`State "${stateCode}" is not supported. Supported states: CA, NY, TX, NJ, WA, IL, GA, FL`);
  }
}

/**
 * Get the raw configuration for a state.
 */
function getStateConfig(state) {
  const stateCode = (state || '').toUpperCase();
  if (!STATE_TAX_CONFIG[stateCode]) {
    throw new Error(`State "${stateCode}" is not supported.`);
  }
  return STATE_TAX_CONFIG[stateCode];
}

/**
 * List all supported states.
 */
function getSupportedStates() {
  return Object.keys(STATE_TAX_CONFIG);
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
module.exports = {
  STATE_TAX_CONFIG,
  calculateStateTax,
  getStateConfig,
  getSupportedStates,
};
