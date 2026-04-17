/**
 * Federal Tax Engine — US Payroll
 * ================================
 * Pure JavaScript implementation of all federal payroll tax calculations.
 * Based on IRS Publication 15-T (2026) Percentage Method tables.
 *
 * Covers: Federal Income Tax (FIT), Social Security (OASDI),
 *         Medicare (HI + Additional), and FUTA.
 *
 * No external dependencies.
 */

'use strict';

// ---------------------------------------------------------------------------
// Currency rounding helper
// ---------------------------------------------------------------------------
function round2(value) {
  return Math.round(value * 100) / 100;
}

// ---------------------------------------------------------------------------
// Pay-frequency → annual pay periods
// ---------------------------------------------------------------------------
const PAY_PERIODS = {
  weekly: 52,
  bi_weekly: 26,
  semi_monthly: 24,
  monthly: 12,
};

// ---------------------------------------------------------------------------
// 2026 Federal Income Tax — Standard Deductions (W-4 Step 4(b) defaults)
// ---------------------------------------------------------------------------
const STANDARD_DEDUCTIONS = {
  single: 14600,
  married_jointly: 29200,
  head_of_household: 21900,
};

// ---------------------------------------------------------------------------
// 2026 Federal Income Tax — Marginal Brackets (Publication 15-T)
// Each entry: { min, max, rate }
// "max" of Infinity marks the top bracket.
// ---------------------------------------------------------------------------
const TAX_BRACKETS = {
  single: [
    { min: 0,      max: 11925,  rate: 0.10 },
    { min: 11925,  max: 48475,  rate: 0.12 },
    { min: 48475,  max: 103350, rate: 0.22 },
    { min: 103350, max: 197300, rate: 0.24 },
    { min: 197300, max: 250525, rate: 0.32 },
    { min: 250525, max: 626350, rate: 0.35 },
    { min: 626350, max: Infinity, rate: 0.37 },
  ],
  married_jointly: [
    { min: 0,      max: 23850,  rate: 0.10 },
    { min: 23850,  max: 96950,  rate: 0.12 },
    { min: 96950,  max: 206700, rate: 0.22 },
    { min: 206700, max: 394600, rate: 0.24 },
    { min: 394600, max: 501050, rate: 0.32 },
    { min: 501050, max: 751600, rate: 0.35 },
    { min: 751600, max: Infinity, rate: 0.37 },
  ],
  head_of_household: [
    { min: 0,      max: 17000,  rate: 0.10 },
    { min: 17000,  max: 64850,  rate: 0.12 },
    { min: 64850,  max: 103350, rate: 0.22 },
    { min: 103350, max: 197300, rate: 0.24 },
    { min: 197300, max: 250500, rate: 0.32 },
    { min: 250500, max: 626350, rate: 0.35 },
    { min: 626350, max: Infinity, rate: 0.37 },
  ],
};

// ---------------------------------------------------------------------------
// Social Security (OASDI) — 2026
// ---------------------------------------------------------------------------
const SOCIAL_SECURITY = {
  employeeRate: 0.062,
  employerRate: 0.062,
  wageBase: 176100,
};

// ---------------------------------------------------------------------------
// Medicare (HI) — 2026
// ---------------------------------------------------------------------------
const MEDICARE = {
  employeeRate: 0.0145,
  employerRate: 0.0145,
  additionalRate: 0.009, // employee-only
  additionalThresholds: {
    single: 200000,
    married_jointly: 250000,
    married_separately: 125000,
    head_of_household: 200000,
  },
};

// ---------------------------------------------------------------------------
// FUTA — 2026
// ---------------------------------------------------------------------------
const FUTA = {
  grossRate: 0.060,
  stateCredit: 0.054,
  effectiveRate: 0.006,
  wageBase: 7000,
};

// ---------------------------------------------------------------------------
// Consolidated config export (for transparency / UI display / tests)
// ---------------------------------------------------------------------------
const FEDERAL_CONFIG = {
  year: 2026,
  payPeriods: PAY_PERIODS,
  standardDeductions: STANDARD_DEDUCTIONS,
  taxBrackets: TAX_BRACKETS,
  socialSecurity: SOCIAL_SECURITY,
  medicare: MEDICARE,
  futa: FUTA,
};

// ---------------------------------------------------------------------------
// Internal: walk marginal brackets and compute annual tax
// ---------------------------------------------------------------------------
function computeBracketTax(taxableIncome, brackets) {
  if (taxableIncome <= 0) return 0;

  let tax = 0;
  for (const bracket of brackets) {
    if (taxableIncome <= bracket.min) break;
    const taxableInBracket = Math.min(taxableIncome, bracket.max) - bracket.min;
    tax += taxableInBracket * bracket.rate;
  }
  return tax;
}

// ---------------------------------------------------------------------------
// calculateFIT — Federal Income Tax (W-4 2020+ Percentage Method)
// ---------------------------------------------------------------------------
/**
 * @param {number}  grossPay         — Gross pay for the current pay period
 * @param {number}  preTaxDeductions — Section 125, 401(k), HSA, etc. for the period
 * @param {object}  w4               — W-4 data
 *   @param {string}  w4.filing_status      — "single" | "married_jointly" | "head_of_household"
 *   @param {number} [w4.dependents_credit] — Step 3 annual total (default 0)
 *   @param {number} [w4.other_income]      — Step 4(a) annual other income (default 0)
 *   @param {number} [w4.deductions]        — Step 4(b) annual deductions (default: standard deduction)
 *   @param {number} [w4.extra_withholding] — Step 4(c) per-period extra withholding (default 0)
 * @param {string}  payFrequency     — "weekly" | "bi_weekly" | "semi_monthly" | "monthly"
 * @returns {{ amount: number, taxableWages: number, annualizedTax: number }}
 */
function calculateFIT(grossPay, preTaxDeductions, w4, payFrequency) {
  const periods = PAY_PERIODS[payFrequency];
  if (!periods) {
    throw new Error(`Unknown pay frequency: "${payFrequency}"`);
  }

  const filingStatus = w4.filing_status || 'single';
  const brackets = TAX_BRACKETS[filingStatus];
  if (!brackets) {
    throw new Error(`Unknown filing status: "${filingStatus}"`);
  }

  // Step 1 — Annualize taxable wages
  const periodTaxableWages = grossPay - (preTaxDeductions || 0);
  const annualWages = periodTaxableWages * periods;

  // Step 2 — Add other income (W-4 Step 4a)
  const otherIncome = w4.other_income || 0;
  const adjustedAnnualWages = annualWages + otherIncome;

  // Step 3 — Subtract standard deduction + W-4 Step 4(b) additional deductions
  // Per IRS Pub 15-T: standard deduction is always applied; Step 4(b) is for
  // deductions *beyond* the standard (e.g. excess itemized deductions over standard).
  const standardDeduction = STANDARD_DEDUCTIONS[filingStatus] || 0;
  const additionalDeductions = w4.deductions || 0;
  const taxableIncome = Math.max(adjustedAnnualWages - standardDeduction - additionalDeductions, 0);

  // Step 4 — Apply marginal brackets
  let annualTax = computeBracketTax(taxableIncome, brackets);

  // Step 5 — Subtract W-4 Step 3 credits (dependents / child tax credit)
  const dependentsCredit = w4.dependents_credit || 0;
  annualTax = Math.max(annualTax - dependentsCredit, 0);

  // Step 6 — De-annualize
  let periodTax = annualTax / periods;

  // Step 7 — Add per-period extra withholding (W-4 Step 4c)
  const extraWithholding = w4.extra_withholding || 0;
  periodTax += extraWithholding;

  // Floor at $0
  periodTax = Math.max(periodTax, 0);

  return {
    amount: round2(periodTax),
    taxableWages: round2(periodTaxableWages),
    annualizedTax: round2(annualTax),
  };
}

// ---------------------------------------------------------------------------
// calculateSocialSecurity — OASDI
// ---------------------------------------------------------------------------
/**
 * @param {number} grossPay    — Gross pay for the current period
 * @param {number} ytdSSWages  — Year-to-date SS wages BEFORE this period
 * @returns {{ employee: number, employer: number, taxableWages: number }}
 */
function calculateSocialSecurity(grossPay, ytdSSWages) {
  const wageBase = SOCIAL_SECURITY.wageBase;
  const ytd = ytdSSWages || 0;

  if (ytd >= wageBase) {
    return { employee: 0, employer: 0, taxableWages: 0 };
  }

  const remainingBase = wageBase - ytd;
  const taxableWages = Math.min(grossPay, remainingBase);

  return {
    employee: round2(taxableWages * SOCIAL_SECURITY.employeeRate),
    employer: round2(taxableWages * SOCIAL_SECURITY.employerRate),
    taxableWages: round2(taxableWages),
  };
}

// ---------------------------------------------------------------------------
// calculateMedicare — HI + Additional Medicare Tax
// ---------------------------------------------------------------------------
/**
 * @param {number} grossPay         — Gross pay for the current period
 * @param {number} ytdMedicareWages — Year-to-date Medicare wages BEFORE this period
 * @param {string} filingStatus     — "single" | "married_jointly" | "married_separately" | "head_of_household"
 * @returns {{ employee: number, employer: number, additionalEmployee: number }}
 */
function calculateMedicare(grossPay, ytdMedicareWages, filingStatus) {
  const ytd = ytdMedicareWages || 0;
  const status = filingStatus || 'single';

  // Base Medicare — no wage cap
  const baseTaxEmployee = round2(grossPay * MEDICARE.employeeRate);
  const baseTaxEmployer = round2(grossPay * MEDICARE.employerRate);

  // Additional Medicare Tax (employee-only, 0.9% above threshold)
  const threshold = MEDICARE.additionalThresholds[status] || MEDICARE.additionalThresholds.single;
  let additionalTax = 0;

  const totalWagesAfter = ytd + grossPay;
  if (totalWagesAfter > threshold) {
    // Only the portion of this period's pay that exceeds the threshold is taxed
    const wagesAboveThreshold = totalWagesAfter - threshold;
    const priorAboveThreshold = Math.max(ytd - threshold, 0);
    const additionalTaxableThisPeriod = wagesAboveThreshold - priorAboveThreshold;
    additionalTax = round2(additionalTaxableThisPeriod * MEDICARE.additionalRate);
  }

  return {
    employee: round2(baseTaxEmployee + additionalTax),
    employer: baseTaxEmployer,
    additionalEmployee: additionalTax,
  };
}

// ---------------------------------------------------------------------------
// calculateFUTA — Federal Unemployment Tax (employer-only)
// ---------------------------------------------------------------------------
/**
 * @param {number} grossPay     — Gross pay for the current period
 * @param {number} ytdFUTAWages — Year-to-date FUTA wages BEFORE this period
 * @returns {{ employer: number, taxableWages: number }}
 */
function calculateFUTA(grossPay, ytdFUTAWages) {
  const wageBase = FUTA.wageBase;
  const ytd = ytdFUTAWages || 0;

  if (ytd >= wageBase) {
    return { employer: 0, taxableWages: 0 };
  }

  const remainingBase = wageBase - ytd;
  const taxableWages = Math.min(grossPay, remainingBase);

  return {
    employer: round2(taxableWages * FUTA.effectiveRate),
    taxableWages: round2(taxableWages),
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
module.exports = {
  calculateFIT,
  calculateSocialSecurity,
  calculateMedicare,
  calculateFUTA,
  FEDERAL_CONFIG,
};
