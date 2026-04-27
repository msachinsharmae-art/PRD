// Canada — Federal income tax 2025 + optional provincial flat (demo).
// Real product would layer all provincial brackets, CPP, EI.

export const CA_META = {
  country: "Canada",
  code: "CA",
  currency: "CAD",
  currencySymbol: "C$",
  fiscalYear: "2025",
  updatedOn: "2025-01-01",
  regimes: ["federal"]
};

const BPA = 15705; // basic personal amount 2025
const FED = [
  { upTo: 57375,   rate: 0.15 },
  { upTo: 114750,  rate: 0.205 },
  { upTo: 177882,  rate: 0.26 },
  { upTo: 253414,  rate: 0.29 },
  { upTo: Infinity, rate: 0.33 }
];

// Simplified average provincial rate — demo only
const PROVINCE = {
  ON: 0.095,
  BC: 0.08,
  AB: 0.10,
  QC: 0.155,
  NS: 0.125
};

const CPP_RATE = 0.0595;
const CPP_MAX  = 3867.50;
const EI_RATE  = 0.0164;
const EI_MAX   = 1077.48;

function applyBands(income, bands) {
  let tax = 0, lower = 0;
  const breakdown = [];
  for (const b of bands) {
    if (income <= lower) break;
    const slice = Math.min(income, b.upTo) - lower;
    if (slice > 0) {
      const t = slice * b.rate;
      tax += t;
      breakdown.push({ from: lower, to: Math.min(income, b.upTo), rate: b.rate, tax: Math.round(t) });
    }
    lower = b.upTo;
  }
  return { tax, breakdown };
}

export function calcCanada({ grossAnnualIncome, province = "ON" }) {
  const taxable = Math.max(0, grossAnnualIncome - BPA);
  const { tax: federal, breakdown } = applyBands(taxable, FED);
  const provRate = PROVINCE[province] ?? 0.10;
  const provincial = taxable * provRate;
  const cpp = Math.min(CPP_MAX, grossAnnualIncome * CPP_RATE);
  const ei = Math.min(EI_MAX, grossAnnualIncome * EI_RATE);
  const total = federal + provincial + cpp + ei;
  return {
    country: "CA",
    currency: "CAD",
    inputs: { grossAnnualIncome, province },
    basicPersonalAmount: BPA,
    taxableIncome: Math.round(taxable),
    federalTax: Math.round(federal),
    provincialTax: Math.round(provincial),
    cpp: Math.round(cpp),
    ei: Math.round(ei),
    slabBreakdown: breakdown,
    totalTax: Math.round(total),
    effectiveRate: grossAnnualIncome > 0 ? +(total / grossAnnualIncome * 100).toFixed(2) : 0,
    takeHome: Math.round(grossAnnualIncome - total),
    citations: [
      { label: "CRA federal brackets 2025", note: "BPA C$15,705" },
      { label: "CPP 5.95% to YMPE; EI 1.64% to $65,700", note: "2025 limits" },
      { label: "Provincial demo rate", note: `indicative ${province}` }
    ],
    disclaimer: "Informational. Provincial rate is indicative flat."
  };
}
