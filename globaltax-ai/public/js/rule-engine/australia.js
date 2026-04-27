// Australia — Resident income tax 2025-26 + Medicare levy 2%.
// Stage-3 redesigned brackets effective 1 Jul 2024.

export const AU_META = {
  country: "Australia",
  code: "AU",
  currency: "AUD",
  currencySymbol: "A$",
  fiscalYear: "2025-26",
  updatedOn: "2024-07-01",
  regimes: ["resident"]
};

const BANDS = [
  { upTo: 18200,   rate: 0.00 },
  { upTo: 45000,   rate: 0.16 },
  { upTo: 135000,  rate: 0.30 },
  { upTo: 190000,  rate: 0.37 },
  { upTo: Infinity, rate: 0.45 }
];

const MEDICARE = 0.02;
const MEDICARE_EXEMPT_UPTO = 27222;

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

export function calcAustralia({ grossAnnualIncome }) {
  const { tax: income, breakdown } = applyBands(grossAnnualIncome, BANDS);
  const medicare = grossAnnualIncome > MEDICARE_EXEMPT_UPTO ? grossAnnualIncome * MEDICARE : 0;
  const total = income + medicare;
  return {
    country: "AU",
    currency: "AUD",
    inputs: { grossAnnualIncome },
    incomeTax: Math.round(income),
    medicareLevy: Math.round(medicare),
    slabBreakdown: breakdown,
    totalTax: Math.round(total),
    effectiveRate: grossAnnualIncome > 0 ? +(total / grossAnnualIncome * 100).toFixed(2) : 0,
    takeHome: Math.round(grossAnnualIncome - total),
    citations: [
      { label: "ATO resident tax rates 2025-26", note: "Stage-3 brackets" },
      { label: "Medicare levy 2%", note: "above low-income threshold" }
    ],
    disclaimer: "Informational. Medicare levy surcharge for high earners without private health not modelled."
  };
}
