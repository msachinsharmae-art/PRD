/**
 * Tax Calculation Engine
 * Orchestrates federal + state tax calculations for US payroll.
 * Uses real 2024 IRS brackets, rates, and wage bases.
 */

'use strict';

// ---------------------------------------------------------------------------
// Data imports  (../data/ modules supply brackets, rates, and limits)
// ---------------------------------------------------------------------------
let federalTaxData, stateTaxData;
try { federalTaxData = require('../data/federalTaxData'); } catch (_) { federalTaxData = null; }
try { stateTaxData   = require('../data/stateTaxData');   } catch (_) { stateTaxData   = null; }

// ---------------------------------------------------------------------------
// 2024 Federal constants (used as defaults when data modules are absent)
// ---------------------------------------------------------------------------
const FEDERAL_DEFAULTS = {
  // Social Security
  SS_RATE: 0.062,
  SS_WAGE_BASE: 168600,        // 2024 wage base

  // Medicare
  MEDICARE_RATE: 0.0145,
  ADDITIONAL_MEDICARE_RATE: 0.009,
  ADDITIONAL_MEDICARE_THRESHOLD: {
    single: 200000,
    married_filing_jointly: 250000,
    married_filing_separately: 125000,
    head_of_household: 200000,
  },

  // FUTA
  FUTA_RATE: 0.006,            // after state credit
  FUTA_WAGE_BASE: 7000,

  // 2024 standard deduction (used when employee has no itemized amount)
  STANDARD_DEDUCTION: {
    single: 14600,
    married_filing_jointly: 29200,
    married_filing_separately: 14600,
    head_of_household: 21900,
  },

  // 2024 federal income tax brackets (single filer shown; married brackets doubled)
  BRACKETS_SINGLE: [
    { min: 0,      max: 11600,   rate: 0.10 },
    { min: 11600,  max: 47150,   rate: 0.12 },
    { min: 47150,  max: 100525,  rate: 0.22 },
    { min: 100525, max: 191950,  rate: 0.24 },
    { min: 191950, max: 243725,  rate: 0.32 },
    { min: 243725, max: 609350,  rate: 0.35 },
    { min: 609350, max: Infinity, rate: 0.37 },
  ],
  BRACKETS_MARRIED: [
    { min: 0,      max: 23200,   rate: 0.10 },
    { min: 23200,  max: 94300,   rate: 0.12 },
    { min: 94300,  max: 201050,  rate: 0.22 },
    { min: 201050, max: 383900,  rate: 0.24 },
    { min: 383900, max: 487450,  rate: 0.32 },
    { min: 487450, max: 731200,  rate: 0.35 },
    { min: 731200, max: Infinity, rate: 0.37 },
  ],
  BRACKETS_HEAD_OF_HOUSEHOLD: [
    { min: 0,      max: 16550,   rate: 0.10 },
    { min: 16550,  max: 63100,   rate: 0.12 },
    { min: 63100,  max: 100500,  rate: 0.22 },
    { min: 100500, max: 191950,  rate: 0.24 },
    { min: 191950, max: 243700,  rate: 0.32 },
    { min: 243700, max: 609350,  rate: 0.35 },
    { min: 609350, max: Infinity, rate: 0.37 },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Number of pay periods per year for a given frequency.
 */
function periodsPerYear(frequency) {
  const map = {
    weekly: 52,
    biweekly: 26,
    semimonthly: 24,
    monthly: 12,
    quarterly: 4,
    annually: 1,
  };
  const f = (frequency || 'biweekly').toLowerCase();
  if (!map[f]) {
    throw new Error(`Unsupported pay frequency: ${frequency}`);
  }
  return map[f];
}

/**
 * Annualize a per-period amount.
 */
function annualize(perPeriodAmount, payFrequency) {
  return perPeriodAmount * periodsPerYear(payFrequency);
}

/**
 * De-annualize an annual amount back to a per-period amount.
 */
function deannualize(annualAmount, payFrequency) {
  return annualAmount / periodsPerYear(payFrequency);
}

/**
 * Return the correct federal brackets based on filing status.
 */
function getFederalBrackets(filingStatus) {
  const data = federalTaxData || FEDERAL_DEFAULTS;
  const status = (filingStatus || 'single').toLowerCase().replace(/\s+/g, '_');

  if (status === 'married_filing_jointly' || status === 'married') {
    return data.BRACKETS_MARRIED || FEDERAL_DEFAULTS.BRACKETS_MARRIED;
  }
  if (status === 'head_of_household') {
    return data.BRACKETS_HEAD_OF_HOUSEHOLD || FEDERAL_DEFAULTS.BRACKETS_HEAD_OF_HOUSEHOLD;
  }
  // single or married_filing_separately use single brackets
  return data.BRACKETS_SINGLE || FEDERAL_DEFAULTS.BRACKETS_SINGLE;
}

/**
 * Progressive bracket calculation.
 */
function calcProgressiveTax(taxableIncome, brackets) {
  let tax = 0;
  for (const bracket of brackets) {
    if (taxableIncome <= bracket.min) break;
    const taxableInBracket = Math.min(taxableIncome, bracket.max) - bracket.min;
    tax += taxableInBracket * bracket.rate;
  }
  return Math.round(tax * 100) / 100;
}

// ---------------------------------------------------------------------------
// Federal Tax Calculations
// ---------------------------------------------------------------------------

/**
 * Calculate federal income tax withholding for one pay period.
 */
function calculateFederalWithholding(employee, grossPay, payPeriod) {
  const data = federalTaxData || FEDERAL_DEFAULTS;
  const w4 = employee.w4 || {};
  const filingStatus = w4.filingStatus || 'single';
  const allowances = w4.allowances || 0;           // legacy; new W-4 uses credits
  const additionalWithholding = w4.additionalWithholding || 0;
  const preTaxDeductions = payPeriod.preTaxDeductions || 0;
  const payFrequency = payPeriod.frequency || employee.payFrequency || 'biweekly';

  // Step 1 - Annualize
  const annualGross = annualize(grossPay - preTaxDeductions, payFrequency);

  // Step 2 - Standard deduction
  const stdDeduction = (data.STANDARD_DEDUCTION || FEDERAL_DEFAULTS.STANDARD_DEDUCTION);
  const deductionKey = filingStatus.toLowerCase().replace(/\s+/g, '_');
  const deduction = stdDeduction[deductionKey] || stdDeduction.single;

  // Step 3 - Taxable income
  const annualTaxable = Math.max(0, annualGross - deduction);

  // Step 4 - Apply brackets
  const brackets = getFederalBrackets(filingStatus);
  const annualTax = calcProgressiveTax(annualTaxable, brackets);

  // Step 5 - Tax credits from W-4 Step 3
  const annualCredits = w4.dependentCredits || 0;
  const adjustedAnnualTax = Math.max(0, annualTax - annualCredits);

  // Step 6 - Per-period withholding + any additional withholding
  const periodWithholding = deannualize(adjustedAnnualTax, payFrequency) + additionalWithholding;

  return Math.round(Math.max(0, periodWithholding) * 100) / 100;
}

/**
 * Calculate Social Security tax for one pay period, respecting YTD wage base.
 */
function calculateSocialSecurity(grossPay, ytdGross) {
  const data = federalTaxData || FEDERAL_DEFAULTS;
  const rate = data.SS_RATE || FEDERAL_DEFAULTS.SS_RATE;
  const wageBase = data.SS_WAGE_BASE || FEDERAL_DEFAULTS.SS_WAGE_BASE;
  const ytd = ytdGross || 0;

  if (ytd >= wageBase) return 0;

  const taxableThisPeriod = Math.min(grossPay, wageBase - ytd);
  return Math.round(taxableThisPeriod * rate * 100) / 100;
}

/**
 * Calculate Medicare tax (regular + additional) for one pay period.
 */
function calculateMedicare(employee, grossPay, ytdGross) {
  const data = federalTaxData || FEDERAL_DEFAULTS;
  const rate = data.MEDICARE_RATE || FEDERAL_DEFAULTS.MEDICARE_RATE;
  const addRate = data.ADDITIONAL_MEDICARE_RATE || FEDERAL_DEFAULTS.ADDITIONAL_MEDICARE_RATE;
  const thresholds = data.ADDITIONAL_MEDICARE_THRESHOLD || FEDERAL_DEFAULTS.ADDITIONAL_MEDICARE_THRESHOLD;

  const filingStatus = (employee.w4 && employee.w4.filingStatus) || 'single';
  const statusKey = filingStatus.toLowerCase().replace(/\s+/g, '_');
  const threshold = thresholds[statusKey] || thresholds.single;
  const ytd = ytdGross || 0;

  const regularMedicare = Math.round(grossPay * rate * 100) / 100;

  // Additional Medicare applies to wages above the threshold
  let additionalMedicare = 0;
  if (ytd + grossPay > threshold) {
    const wagesAboveThreshold = Math.max(0, (ytd + grossPay) - threshold);
    const previouslyTaxed = Math.max(0, ytd - threshold);
    const newlyTaxable = wagesAboveThreshold - previouslyTaxed;
    additionalMedicare = Math.round(newlyTaxable * addRate * 100) / 100;
  }

  return { regularMedicare, additionalMedicare };
}

// ---------------------------------------------------------------------------
// State Tax Calculations
// ---------------------------------------------------------------------------

/**
 * Calculate state income tax for one pay period.
 * Falls back to a flat-rate estimate when detailed state data is unavailable.
 */
function calculateStateIncomeTax(employee, grossPay, payPeriod) {
  const state = (employee.workState || employee.state || '').toUpperCase();
  const payFrequency = payPeriod.frequency || employee.payFrequency || 'biweekly';

  // States with no income tax
  const noIncomeTaxStates = ['AK', 'FL', 'NV', 'NH', 'SD', 'TN', 'TX', 'WA', 'WY'];
  if (noIncomeTaxStates.includes(state)) return 0;

  // Try detailed state data first
  if (stateTaxData && stateTaxData.getStateBrackets) {
    const brackets = stateTaxData.getStateBrackets(state, employee);
    if (brackets) {
      const annualGross = annualize(grossPay - (payPeriod.preTaxDeductions || 0), payFrequency);
      const stateDeduction = (stateTaxData.getStandardDeduction && stateTaxData.getStandardDeduction(state, employee)) || 0;
      const taxableIncome = Math.max(0, annualGross - stateDeduction);
      const annualTax = calcProgressiveTax(taxableIncome, brackets);
      return Math.round(deannualize(annualTax, payFrequency) * 100) / 100;
    }
  }

  // Fallback: approximate flat rates by state
  const approxRates = {
    AL: 0.050, AZ: 0.025, AR: 0.047, CA: 0.093, CO: 0.044,
    CT: 0.050, DE: 0.066, GA: 0.055, HI: 0.072, ID: 0.058,
    IL: 0.0495, IN: 0.0315, IA: 0.060, KS: 0.057, KY: 0.045,
    LA: 0.0425, ME: 0.0715, MD: 0.0575, MA: 0.050, MI: 0.0425,
    MN: 0.0535, MS: 0.050, MO: 0.048, MT: 0.059, NE: 0.0564,
    NJ: 0.0637, NM: 0.049, NY: 0.0685, NC: 0.0475, ND: 0.0195,
    OH: 0.040, OK: 0.0475, OR: 0.0875, PA: 0.0307, RI: 0.0475,
    SC: 0.065, UT: 0.0485, VT: 0.066, VA: 0.0575, WV: 0.055,
    WI: 0.053, DC: 0.065,
  };

  const rate = approxRates[state] || 0.05;
  const preTax = payPeriod.preTaxDeductions || 0;
  return Math.round((grossPay - preTax) * rate * 100) / 100;
}

/**
 * Calculate state disability insurance (SDI) where applicable.
 */
function calculateSDI(employee, grossPay) {
  const state = (employee.workState || employee.state || '').toUpperCase();
  const ytdGross = employee.ytdGross || 0;

  // Only a few states have mandatory employee SDI
  const sdiRates = {
    CA: { rate: 0.009,  wageBase: 153164 },   // 2024 CA SDI
    HI: { rate: 0.005,  wageBase: 67956.16 },
    NJ: { rate: 0.006,  wageBase: 161400 },
    NY: { rate: 0.005,  wageBase: Infinity, maxWeekly: 0.60 },  // $0.60/week max
    RI: { rate: 0.011,  wageBase: 87300 },
  };

  const config = sdiRates[state];
  if (!config) return 0;

  // NY has a fixed weekly max
  if (state === 'NY' && config.maxWeekly !== undefined) {
    return config.maxWeekly;
  }

  if (ytdGross >= config.wageBase) return 0;
  const taxableThisPeriod = Math.min(grossPay, config.wageBase - ytdGross);
  return Math.round(taxableThisPeriod * config.rate * 100) / 100;
}

/**
 * Calculate SUI (state unemployment insurance) employee portion.
 * Most states only have employer-side SUI; a few have employee contributions.
 */
function calculateSUI(employee, grossPay) {
  const state = (employee.workState || employee.state || '').toUpperCase();
  const ytdGross = employee.ytdGross || 0;

  // States with employee SUI contributions
  const suiRates = {
    AK: { rate: 0.005, wageBase: 47100 },
    NJ: { rate: 0.003825, wageBase: 42300 },
    PA: { rate: 0.0006, wageBase: 10000 },
  };

  const config = suiRates[state];
  if (!config) return 0;

  if (ytdGross >= config.wageBase) return 0;
  const taxableThisPeriod = Math.min(grossPay, config.wageBase - ytdGross);
  return Math.round(taxableThisPeriod * config.rate * 100) / 100;
}

// ---------------------------------------------------------------------------
// Main Export
// ---------------------------------------------------------------------------

/**
 * Calculate all employee taxes for one pay period.
 *
 * @param {Object} employee       - Employee record with w4, workState, ytdGross, etc.
 * @param {number} grossPay       - Gross pay for this period.
 * @param {Object} payPeriod      - { frequency, preTaxDeductions, periodNumber, ... }
 * @returns {Object} Detailed tax breakdown.
 */
function calculateEmployeeTaxes(employee, grossPay, payPeriod) {
  if (!employee) throw new Error('Employee record is required');
  if (typeof grossPay !== 'number' || grossPay < 0) {
    throw new Error('grossPay must be a non-negative number');
  }

  const period = payPeriod || {};
  const ytdGross = employee.ytdGross || 0;

  // --- Federal ---
  const withholding = calculateFederalWithholding(employee, grossPay, period);
  const socialSecurity = calculateSocialSecurity(grossPay, ytdGross);
  const { regularMedicare, additionalMedicare } = calculateMedicare(employee, grossPay, ytdGross);

  const federal = {
    withholding,
    socialSecurity,
    medicare: regularMedicare,
    additionalMedicare,
    totalFederal: Math.round((withholding + socialSecurity + regularMedicare + additionalMedicare) * 100) / 100,
  };

  // --- State ---
  const incomeTax = calculateStateIncomeTax(employee, grossPay, period);
  const sdi = calculateSDI(employee, grossPay);
  const sui = calculateSUI(employee, grossPay);

  const state = {
    incomeTax,
    sdi,
    sui,
    otherDeductions: 0,  // placeholder for local/city taxes, transit, etc.
    totalState: Math.round((incomeTax + sdi + sui) * 100) / 100,
  };

  const total = Math.round((federal.totalFederal + state.totalState) * 100) / 100;

  return {
    federal,
    state,
    total,
    meta: {
      annualizedGross: annualize(grossPay, period.frequency || employee.payFrequency || 'biweekly'),
      ytdGrossBeforePeriod: ytdGross,
      ytdGrossAfterPeriod: ytdGross + grossPay,
    },
  };
}

module.exports = {
  calculateEmployeeTaxes,
  // Expose internals for unit testing / other engines
  calculateFederalWithholding,
  calculateSocialSecurity,
  calculateMedicare,
  calculateStateIncomeTax,
  calculateSDI,
  calculateSUI,
  annualize,
  deannualize,
  periodsPerYear,
  FEDERAL_DEFAULTS,
};
