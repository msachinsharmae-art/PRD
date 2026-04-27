// United Kingdom — Income Tax 2025/26 (England & NI) + employee NIC.
// Scotland has separate bands — not modelled here.

export const GB_META = {
  country: "United Kingdom",
  code: "GB",
  currency: "GBP",
  currencySymbol: "£",
  fiscalYear: "2025-26",
  updatedOn: "2025-04-06",
  regimes: ["resident"]
};

const PERSONAL_ALLOWANCE = 12570;
const PA_TAPER_START = 100000;

const BANDS = [
  { upTo: 12570,  rate: 0.00 },
  { upTo: 50270,  rate: 0.20 },
  { upTo: 125140, rate: 0.40 },
  { upTo: Infinity, rate: 0.45 }
];

const NIC_PRIMARY = [
  { upTo: 12570,  rate: 0.00 },
  { upTo: 50270,  rate: 0.08 },
  { upTo: Infinity, rate: 0.02 }
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

export function calcUK({ grossAnnualIncome }) {
  let pa = PERSONAL_ALLOWANCE;
  if (grossAnnualIncome > PA_TAPER_START) {
    pa = Math.max(0, PERSONAL_ALLOWANCE - (grossAnnualIncome - PA_TAPER_START) / 2);
  }
  const taxable = Math.max(0, grossAnnualIncome - pa);
  const adjBands = BANDS.map(b => ({ ...b, upTo: b.upTo - (PERSONAL_ALLOWANCE - pa) }));
  const { tax: incomeTax, breakdown } = applyBands(grossAnnualIncome, adjBands);
  const { tax: nic } = applyBands(grossAnnualIncome, NIC_PRIMARY);
  const total = incomeTax + nic;
  return {
    country: "GB",
    currency: "GBP",
    inputs: { grossAnnualIncome },
    personalAllowance: Math.round(pa),
    taxableIncome: Math.round(taxable),
    incomeTax: Math.round(incomeTax),
    nationalInsurance: Math.round(nic),
    slabBreakdown: breakdown,
    totalTax: Math.round(total),
    effectiveRate: grossAnnualIncome > 0 ? +(total / grossAnnualIncome * 100).toFixed(2) : 0,
    takeHome: Math.round(grossAnnualIncome - total),
    citations: [
      { label: "HMRC Income Tax bands 2025/26", note: "PA £12,570 tapered above £100k" },
      { label: "Employee Class 1 NIC 8% / 2%", note: "above PT £12,570" }
    ],
    disclaimer: "Informational. England/NI bands only. Scotland differs."
  };
}
