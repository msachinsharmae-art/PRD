// United States — Federal income tax, 2025 brackets (single filer).
// State tax: simplified, demo uses California flat approximation.
// Real product would add FICA (6.2% SS up to wage base + 1.45% Medicare), full state lookup, etc.

export const US_META = {
  country: "United States",
  code: "US",
  currency: "USD",
  currencySymbol: "$",
  fiscalYear: "2025",
  updatedOn: "2024-11-01",
  regimes: ["single", "marriedJoint"]
};

// 2025 Federal brackets — single
const FED_SINGLE = [
  { upTo: 11925,   rate: 0.10 },
  { upTo: 48475,   rate: 0.12 },
  { upTo: 103350,  rate: 0.22 },
  { upTo: 197300,  rate: 0.24 },
  { upTo: 250525,  rate: 0.32 },
  { upTo: 626350,  rate: 0.35 },
  { upTo: Infinity, rate: 0.37 }
];

// 2025 Federal brackets — married filing jointly
const FED_MFJ = [
  { upTo: 23850,   rate: 0.10 },
  { upTo: 96950,   rate: 0.12 },
  { upTo: 206700,  rate: 0.22 },
  { upTo: 394600,  rate: 0.24 },
  { upTo: 501050,  rate: 0.32 },
  { upTo: 751600,  rate: 0.35 },
  { upTo: Infinity, rate: 0.37 }
];

const STD_DED_SINGLE = 15000;
const STD_DED_MFJ    = 30000;

const FICA_SS_RATE     = 0.062;
const FICA_SS_WAGE_CAP = 176100; // 2025
const FICA_MEDICARE    = 0.0145;

// Very rough state samples (2025) — replace with full lookup in prod
const STATE_RATES = {
  CA: 0.06,   // effective blend for demo
  NY: 0.055,
  TX: 0.0,    // no state income tax
  FL: 0.0,
  WA: 0.0
};

function applySlabs(income, slabs) {
  let tax = 0, lower = 0;
  const breakdown = [];
  for (const s of slabs) {
    if (income <= lower) break;
    const slice = Math.min(income, s.upTo) - lower;
    if (slice > 0) {
      const slabTax = slice * s.rate;
      tax += slabTax;
      breakdown.push({ from: lower, to: Math.min(income, s.upTo), rate: s.rate, tax: Math.round(slabTax) });
    }
    lower = s.upTo;
  }
  return { tax, breakdown };
}

export function calcUS({ grossAnnualIncome, filing = "single", state = "CA" }) {
  const stdDed = filing === "marriedJoint" ? STD_DED_MFJ : STD_DED_SINGLE;
  const taxable = Math.max(0, grossAnnualIncome - stdDed);
  const slabs = filing === "marriedJoint" ? FED_MFJ : FED_SINGLE;
  const { tax: federal, breakdown } = applySlabs(taxable, slabs);

  const ss = Math.min(grossAnnualIncome, FICA_SS_WAGE_CAP) * FICA_SS_RATE;
  const medicare = grossAnnualIncome * FICA_MEDICARE;
  const fica = ss + medicare;

  const stateRate = STATE_RATES[state] ?? 0.05;
  const stateTax = taxable * stateRate;

  const total = federal + fica + stateTax;

  return {
    country: "US",
    currency: "USD",
    inputs: { grossAnnualIncome, filing, state },
    standardDeduction: stdDed,
    taxableIncome: Math.round(taxable),
    federalTax: Math.round(federal),
    ficaSocialSecurity: Math.round(ss),
    ficaMedicare: Math.round(medicare),
    stateTax: Math.round(stateTax),
    slabBreakdown: breakdown,
    totalTax: Math.round(total),
    effectiveRate: grossAnnualIncome > 0 ? +(total / grossAnnualIncome * 100).toFixed(2) : 0,
    takeHome: Math.round(grossAnnualIncome - total),
    citations: [
      { label: "IRS Rev. Proc. 2024-40", note: "2025 inflation-adjusted brackets" },
      { label: "FICA 7.65% employee (6.2% SS + 1.45% Medicare)", note: "SSA 2025 wage base $176,100" },
      { label: "State rate (demo)", note: `indicative rate for ${state}` }
    ],
    disclaimer: "Informational. Not tax advice. Full state logic not modeled."
  };
}
