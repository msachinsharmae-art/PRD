// Ireland — Income tax 2025 (single) + PRSI + USC.

export const IE_META = {
  country: "Ireland",
  code: "IE",
  currency: "EUR",
  currencySymbol: "€",
  fiscalYear: "2025",
  updatedOn: "2025-01-01",
  regimes: ["single"]
};

// Single — standard rate band €44,000 @ 20%, balance @ 40%.
const BANDS = [
  { upTo: 44000,   rate: 0.20 },
  { upTo: Infinity, rate: 0.40 }
];

const PERSONAL_CREDIT  = 2000; // 2025
const PAYE_CREDIT      = 2000;

const PRSI_RATE = 0.041; // 2025

// USC — single filer simplified
const USC = [
  { upTo: 12012,  rate: 0.005 },
  { upTo: 27382,  rate: 0.02 },
  { upTo: 70044,  rate: 0.03 },
  { upTo: Infinity, rate: 0.08 }
];

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

export function calcIreland({ grossAnnualIncome }) {
  const { tax: preCredit, breakdown } = applyBands(grossAnnualIncome, BANDS);
  const incomeTax = Math.max(0, preCredit - PERSONAL_CREDIT - PAYE_CREDIT);
  const prsi = grossAnnualIncome * PRSI_RATE;
  const { tax: usc } = applyBands(grossAnnualIncome, USC);
  const total = incomeTax + prsi + usc;
  return {
    country: "IE",
    currency: "EUR",
    inputs: { grossAnnualIncome },
    incomeTax: Math.round(incomeTax),
    prsi: Math.round(prsi),
    usc: Math.round(usc),
    slabBreakdown: breakdown,
    totalTax: Math.round(total),
    effectiveRate: grossAnnualIncome > 0 ? +(total / grossAnnualIncome * 100).toFixed(2) : 0,
    takeHome: Math.round(grossAnnualIncome - total),
    citations: [
      { label: "Revenue standard rate band €44,000", note: "single filer 2025" },
      { label: "PRSI 4.1% (Class A)", note: "from Oct 2024" },
      { label: "USC bands 2025", note: "0.5% / 2% / 3% / 8%" }
    ],
    disclaimer: "Informational. Married/civil-partner bands and credits not modelled."
  };
}
