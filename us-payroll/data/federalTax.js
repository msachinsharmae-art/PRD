/**
 * US Federal Tax Withholding - 2026 Projected Rates
 * Based on IRS Publication 15-T methodology
 */

// ---------------------------------------------------------------------------
// 2026 Standard Deductions
// ---------------------------------------------------------------------------
const STANDARD_DEDUCTION = {
  single: 15000,
  married: 30000,
  head_of_household: 22500,
};

// ---------------------------------------------------------------------------
// 2026 Federal Income Tax Brackets (projected, inflation-adjusted)
// ---------------------------------------------------------------------------
const TAX_BRACKETS = {
  single: [
    { min: 0,       max: 11600,   rate: 0.10 },
    { min: 11600,   max: 47150,   rate: 0.12 },
    { min: 47150,   max: 100525,  rate: 0.22 },
    { min: 100525,  max: 191950,  rate: 0.24 },
    { min: 191950,  max: 243725,  rate: 0.32 },
    { min: 243725,  max: 609350,  rate: 0.35 },
    { min: 609350,  max: Infinity, rate: 0.37 },
  ],
  married: [
    { min: 0,       max: 23200,   rate: 0.10 },
    { min: 23200,   max: 94300,   rate: 0.12 },
    { min: 94300,   max: 201050,  rate: 0.22 },
    { min: 201050,  max: 383900,  rate: 0.24 },
    { min: 383900,  max: 487450,  rate: 0.32 },
    { min: 487450,  max: 731200,  rate: 0.35 },
    { min: 731200,  max: Infinity, rate: 0.37 },
  ],
  head_of_household: [
    { min: 0,       max: 16550,   rate: 0.10 },
    { min: 16550,   max: 63100,   rate: 0.12 },
    { min: 63100,   max: 100500,  rate: 0.22 },
    { min: 100500,  max: 191950,  rate: 0.24 },
    { min: 191950,  max: 243700,  rate: 0.32 },
    { min: 243700,  max: 609350,  rate: 0.35 },
    { min: 609350,  max: Infinity, rate: 0.37 },
  ],
};

// ---------------------------------------------------------------------------
// FICA Rates - 2026
// ---------------------------------------------------------------------------
const FICA = {
  socialSecurity: {
    rate: 0.062,           // 6.2 %
    wageBase: 168600,      // 2026 projected wage base
  },
  medicare: {
    rate: 0.0145,          // 1.45 %
    additionalRate: 0.009, // 0.9 % additional Medicare tax
    additionalThreshold: 200000, // applies above $200,000
  },
};

// ---------------------------------------------------------------------------
// FUTA - 2026
// ---------------------------------------------------------------------------
const FUTA = {
  rate: 0.060,        // 6.0 % gross rate
  creditRate: 0.054,  // 5.4 % credit for state UI
  netRate: 0.006,     // 0.6 % effective rate after credit
  wageBase: 7000,     // first $7,000 per employee
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Apply progressive brackets to a taxable amount.
 */
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
// Public API
// ---------------------------------------------------------------------------

/**
 * Calculate federal income tax withholding for a pay period.
 *
 * @param {number} annualWage        - Projected annual gross wages
 * @param {string} filingStatus      - "single" | "married" | "head_of_household"
 * @param {number} [allowances=0]    - Number of W-4 allowances (pre-2020 style)
 * @returns {{ annualTax: number, perPayPeriodEstimate: number, effectiveRate: number, brackets: object[] }}
 */
function calculateFederalWithholding(annualWage, filingStatus = 'single', allowances = 0) {
  const status = filingStatus.toLowerCase().replace(/ /g, '_');
  const deduction = STANDARD_DEDUCTION[status] || STANDARD_DEDUCTION.single;
  const brackets = TAX_BRACKETS[status] || TAX_BRACKETS.single;

  // Each allowance reduces taxable income by ~$4,300 (2026 projected)
  const allowanceDeduction = allowances * 4300;

  const taxableIncome = Math.max(0, annualWage - deduction - allowanceDeduction);
  const annualTax = applyBrackets(taxableIncome, brackets);
  const effectiveRate = annualWage > 0 ? annualTax / annualWage : 0;

  return {
    grossWage: annualWage,
    filingStatus: status,
    standardDeduction: deduction,
    allowanceDeduction,
    taxableIncome,
    annualTax,
    effectiveRate: Math.round(effectiveRate * 10000) / 10000,
    // Convenience: estimated per-period amounts (caller can divide further)
    perPayPeriodEstimate: {
      weekly: Math.round((annualTax / 52) * 100) / 100,
      biweekly: Math.round((annualTax / 26) * 100) / 100,
      semimonthly: Math.round((annualTax / 24) * 100) / 100,
      monthly: Math.round((annualTax / 12) * 100) / 100,
    },
  };
}

/**
 * Calculate FICA taxes (Social Security + Medicare).
 *
 * @param {number} annualWage  - Gross wages for the current pay period (annualized or period)
 * @param {number} [ytdWage=0] - Year-to-date wages already paid (for wage base cap)
 * @returns {{ socialSecurity: number, medicare: number, additionalMedicare: number, totalFICA: number }}
 */
function calculateFICA(annualWage, ytdWage = 0) {
  // --- Social Security ---
  const ssWageBase = FICA.socialSecurity.wageBase;
  const ssSubjectWage = Math.max(0, Math.min(annualWage, ssWageBase - ytdWage));
  const socialSecurity = Math.round(ssSubjectWage * FICA.socialSecurity.rate * 100) / 100;

  // --- Medicare ---
  const medicare = Math.round(annualWage * FICA.medicare.rate * 100) / 100;

  // --- Additional Medicare (0.9 % on wages over $200K) ---
  const totalWage = ytdWage + annualWage;
  let additionalMedicareWage = 0;
  if (totalWage > FICA.medicare.additionalThreshold) {
    const alreadyOverThreshold = Math.max(0, ytdWage - FICA.medicare.additionalThreshold);
    const newOverThreshold = Math.max(0, totalWage - FICA.medicare.additionalThreshold);
    additionalMedicareWage = newOverThreshold - alreadyOverThreshold;
  }
  const additionalMedicare = Math.round(additionalMedicareWage * FICA.medicare.additionalRate * 100) / 100;

  const totalFICA = Math.round((socialSecurity + medicare + additionalMedicare) * 100) / 100;

  return {
    socialSecurity,
    socialSecurityWageSubject: ssSubjectWage,
    medicare,
    additionalMedicare,
    additionalMedicareWageSubject: additionalMedicareWage,
    totalFICA,
    employerMatch: {
      socialSecurity,
      medicare,
      // Employer does NOT pay additional Medicare
      total: Math.round((socialSecurity + medicare) * 100) / 100,
    },
  };
}

/**
 * Calculate FUTA (Federal Unemployment Tax) - employer only.
 *
 * @param {number} periodWage - Wages for the current pay period
 * @param {number} [ytdWage=0] - Year-to-date wages already paid
 * @returns {{ futaWage: number, futaGross: number, futaCredit: number, futaNet: number }}
 */
function calculateFUTA(periodWage, ytdWage = 0) {
  const wageBase = FUTA.wageBase;
  const subjectWage = Math.max(0, Math.min(periodWage, wageBase - ytdWage));

  const futaGross = Math.round(subjectWage * FUTA.rate * 100) / 100;
  const futaCredit = Math.round(subjectWage * FUTA.creditRate * 100) / 100;
  const futaNet = Math.round(subjectWage * FUTA.netRate * 100) / 100;

  return {
    futaWage: subjectWage,
    futaGross,
    futaCredit,
    futaNet,
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
module.exports = {
  STANDARD_DEDUCTION,
  TAX_BRACKETS,
  FICA,
  FUTA,
  calculateFederalWithholding,
  calculateFICA,
  calculateFUTA,
};
