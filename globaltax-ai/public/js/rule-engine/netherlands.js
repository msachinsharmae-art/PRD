// Netherlands — Box 1 income tax 2025 + employee premiums.
// Below retirement age; simplified general tax credit.

export const NL_META = {
  country: "Netherlands",
  code: "NL",
  currency: "EUR",
  currencySymbol: "€",
  fiscalYear: "2025",
  updatedOn: "2025-01-01",
  regimes: ["box1"]
};

// 2025 Box 1 brackets (combined income tax + national-insurance premium)
const BANDS = [
  { upTo: 38441,  rate: 0.3582 },
  { upTo: 76817,  rate: 0.3748 },
  { upTo: Infinity, rate: 0.495 }
];

const ALGEMENE_HEFFINGSKORTING_MAX = 3068;
const ARBEIDSKORTING_MAX = 5599; // 2025 peak

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

export function calcNetherlands({ grossAnnualIncome }) {
  const { tax: preCredit, breakdown } = applyBands(grossAnnualIncome, BANDS);
  // Very simplified credit model — real calc tapers both credits with income
  const credit = Math.min(ALGEMENE_HEFFINGSKORTING_MAX + ARBEIDSKORTING_MAX, preCredit);
  const total = Math.max(0, preCredit - credit);
  return {
    country: "NL",
    currency: "EUR",
    inputs: { grossAnnualIncome },
    taxBeforeCredits: Math.round(preCredit),
    creditsApplied: Math.round(credit),
    slabBreakdown: breakdown,
    totalTax: Math.round(total),
    effectiveRate: grossAnnualIncome > 0 ? +(total / grossAnnualIncome * 100).toFixed(2) : 0,
    takeHome: Math.round(grossAnnualIncome - total),
    citations: [
      { label: "Belastingdienst Box 1 2025", note: "35.82% / 37.48% / 49.5%" },
      { label: "Algemene heffingskorting + Arbeidskorting", note: "simplified, actual tapers with income" }
    ],
    disclaimer: "Informational. Credits are simplified — actual amounts depend on income and age."
  };
}
