// India — Income Tax rule engine
// FY 2025-26 / AY 2026-27 (Union Budget 2025 revised new-regime slabs)
// Disclaimer: informational, not advice. Verify with CBDT notifications.

export const IN_META = {
  country: "India",
  code: "IN",
  currency: "INR",
  currencySymbol: "₹",
  fiscalYear: "2025-26",
  updatedOn: "2025-02-01", // Budget 2025 announcement date
  regimes: ["new", "old"]
};

// New regime slabs for FY 2025-26 (Budget 2025)
const NEW_REGIME_SLABS = [
  { upTo: 400000,   rate: 0.00 },
  { upTo: 800000,   rate: 0.05 },
  { upTo: 1200000,  rate: 0.10 },
  { upTo: 1600000,  rate: 0.15 },
  { upTo: 2000000,  rate: 0.20 },
  { upTo: 2400000,  rate: 0.25 },
  { upTo: Infinity, rate: 0.30 }
];

// Old regime slabs (unchanged, individuals < 60)
const OLD_REGIME_SLABS = [
  { upTo: 250000,   rate: 0.00 },
  { upTo: 500000,   rate: 0.05 },
  { upTo: 1000000,  rate: 0.20 },
  { upTo: Infinity, rate: 0.30 }
];

const STANDARD_DEDUCTION_NEW = 75000;
const STANDARD_DEDUCTION_OLD = 50000;
const CESS_RATE = 0.04; // Health & Education cess

// Section 87A rebate — new regime FY25-26: full rebate up to 12L taxable
const REBATE_87A_NEW_LIMIT = 1200000;
const REBATE_87A_OLD_LIMIT = 500000;
const REBATE_87A_OLD_MAX   = 12500;

function applySlabs(income, slabs) {
  let tax = 0, lower = 0;
  const breakdown = [];
  for (const s of slabs) {
    if (income <= lower) break;
    const taxable = Math.min(income, s.upTo) - lower;
    if (taxable > 0) {
      const slabTax = taxable * s.rate;
      tax += slabTax;
      breakdown.push({
        from: lower,
        to: Math.min(income, s.upTo),
        rate: s.rate,
        tax: Math.round(slabTax)
      });
    }
    lower = s.upTo;
  }
  return { tax, breakdown };
}

function surcharge(taxableIncome, baseTax, regime) {
  // Simplified surcharge (individual). New regime max 25% (cap reduced from 37%).
  let rate = 0;
  if (taxableIncome > 50000000) rate = regime === "new" ? 0.25 : 0.37;
  else if (taxableIncome > 20000000) rate = 0.25;
  else if (taxableIncome > 10000000) rate = 0.15;
  else if (taxableIncome > 5000000)  rate = 0.10;
  return baseTax * rate;
}

export function calcIndia({ grossAnnualIncome, regime = "new", deductions80C = 0, otherDeductions = 0 }) {
  const std = regime === "new" ? STANDARD_DEDUCTION_NEW : STANDARD_DEDUCTION_OLD;
  const deductionTotal = regime === "new"
    ? std
    : std + Math.min(deductions80C, 150000) + otherDeductions;

  const taxable = Math.max(0, grossAnnualIncome - deductionTotal);
  const slabs = regime === "new" ? NEW_REGIME_SLABS : OLD_REGIME_SLABS;
  const { tax: preRebate, breakdown } = applySlabs(taxable, slabs);

  // 87A rebate
  let rebate = 0;
  if (regime === "new" && taxable <= REBATE_87A_NEW_LIMIT) rebate = preRebate;
  else if (regime === "old" && taxable <= REBATE_87A_OLD_LIMIT) rebate = Math.min(preRebate, REBATE_87A_OLD_MAX);

  const afterRebate = Math.max(0, preRebate - rebate);
  const sur = surcharge(taxable, afterRebate, regime);
  const cess = (afterRebate + sur) * CESS_RATE;
  const total = afterRebate + sur + cess;

  return {
    country: "IN",
    currency: "INR",
    inputs: { grossAnnualIncome, regime, deductions80C, otherDeductions },
    taxableIncome: Math.round(taxable),
    standardDeduction: std,
    slabBreakdown: breakdown,
    rebate87A: Math.round(rebate),
    surcharge: Math.round(sur),
    cess: Math.round(cess),
    totalTax: Math.round(total),
    effectiveRate: grossAnnualIncome > 0 ? +(total / grossAnnualIncome * 100).toFixed(2) : 0,
    takeHome: Math.round(grossAnnualIncome - total),
    citations: [
      { label: "Budget 2025 new-regime slabs", note: "Finance Bill 2025, Section 115BAC" },
      { label: "Standard deduction ₹75,000 (new)", note: "Finance Act 2024" },
      { label: "87A rebate up to ₹12L taxable (new)", note: "Finance Act 2025" }
    ],
    disclaimer: "Informational. Not tax advice. Verify with a qualified CA."
  };
}
