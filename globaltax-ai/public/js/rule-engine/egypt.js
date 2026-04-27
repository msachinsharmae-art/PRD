// Egypt — Progressive personal income tax (Law 91/2005 as amended through 2024)
// Annual brackets in EGP.

export const EG_META = {
  country: "Egypt",
  code: "EG",
  currency: "EGP",
  currencySymbol: "EGP",
  fiscalYear: "2025",
  updatedOn: "2024-08-01",
  regimes: ["resident"]
};

// Bracket midpoint for income levels up to 600k (indicative; Egypt uses a tiered structure
// where your whole-income rate depends on which band your total falls into).
// We approximate via progressive slabs — common public-calculator convention.
const EG_SLABS = [
  { upTo: 40000,   rate: 0.00 },
  { upTo: 55000,   rate: 0.10 },
  { upTo: 70000,   rate: 0.15 },
  { upTo: 200000,  rate: 0.20 },
  { upTo: 400000,  rate: 0.225 },
  { upTo: 1200000, rate: 0.25 },
  { upTo: Infinity, rate: 0.275 }
];

const PERSONAL_EXEMPTION = 20000; // annual

export function calcEgypt({ grossAnnualIncome }) {
  const taxable = Math.max(0, grossAnnualIncome - PERSONAL_EXEMPTION);

  let tax = 0, lower = 0;
  const breakdown = [];
  for (const s of EG_SLABS) {
    if (taxable <= lower) break;
    const slice = Math.min(taxable, s.upTo) - lower;
    if (slice > 0) {
      const slabTax = slice * s.rate;
      tax += slabTax;
      breakdown.push({ from: lower, to: Math.min(taxable, s.upTo), rate: s.rate, tax: Math.round(slabTax) });
    }
    lower = s.upTo;
  }

  return {
    country: "EG",
    currency: "EGP",
    inputs: { grossAnnualIncome },
    personalExemption: PERSONAL_EXEMPTION,
    taxableIncome: Math.round(taxable),
    slabBreakdown: breakdown,
    totalTax: Math.round(tax),
    effectiveRate: grossAnnualIncome > 0 ? +(tax / grossAnnualIncome * 100).toFixed(2) : 0,
    takeHome: Math.round(grossAnnualIncome - tax),
    citations: [
      { label: "Law 91/2005 (Income Tax Law)", note: "as amended through 2024" },
      { label: "EGP 20,000 personal exemption", note: "annual" }
    ],
    disclaimer: "Informational. Not tax advice."
  };
}
