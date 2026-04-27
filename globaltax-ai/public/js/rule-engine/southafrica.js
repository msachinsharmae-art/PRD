// South Africa — PIT 2025/26 (SARS) + UIF employee 1% (capped).

export const ZA_META = {
  country: "South Africa",
  code: "ZA",
  currency: "ZAR",
  currencySymbol: "R",
  fiscalYear: "2025-26",
  updatedOn: "2025-03-01",
  regimes: ["resident"]
};

const BANDS = [
  { upTo: 237100,   rate: 0.18 },
  { upTo: 370500,   rate: 0.26 },
  { upTo: 512800,   rate: 0.31 },
  { upTo: 673000,   rate: 0.36 },
  { upTo: 857900,   rate: 0.39 },
  { upTo: 1817000,  rate: 0.41 },
  { upTo: Infinity, rate: 0.45 }
];

const PRIMARY_REBATE = 17235;  // under 65
const TAX_THRESHOLD = 95750;   // under 65

const UIF_RATE = 0.01;
const UIF_MAX_MONTHLY = 177.12;

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

export function calcSouthAfrica({ grossAnnualIncome }) {
  if (grossAnnualIncome <= TAX_THRESHOLD) {
    return {
      country: "ZA",
      currency: "ZAR",
      inputs: { grossAnnualIncome },
      incomeTax: 0,
      uif: Math.round(Math.min(grossAnnualIncome * UIF_RATE, UIF_MAX_MONTHLY * 12)),
      slabBreakdown: [],
      totalTax: Math.round(Math.min(grossAnnualIncome * UIF_RATE, UIF_MAX_MONTHLY * 12)),
      effectiveRate: 0,
      takeHome: Math.round(grossAnnualIncome - Math.min(grossAnnualIncome * UIF_RATE, UIF_MAX_MONTHLY * 12)),
      citations: [{ label: "SARS tax threshold R95,750 (<65)", note: "no income tax below threshold" }],
      disclaimer: "Informational."
    };
  }
  const { tax: pre, breakdown } = applyBands(grossAnnualIncome, BANDS);
  const incomeTax = Math.max(0, pre - PRIMARY_REBATE);
  const uif = Math.min(grossAnnualIncome * UIF_RATE, UIF_MAX_MONTHLY * 12);
  const total = incomeTax + uif;
  return {
    country: "ZA",
    currency: "ZAR",
    inputs: { grossAnnualIncome },
    incomeTax: Math.round(incomeTax),
    primaryRebate: PRIMARY_REBATE,
    uif: Math.round(uif),
    slabBreakdown: breakdown,
    totalTax: Math.round(total),
    effectiveRate: grossAnnualIncome > 0 ? +(total / grossAnnualIncome * 100).toFixed(2) : 0,
    takeHome: Math.round(grossAnnualIncome - total),
    citations: [
      { label: "SARS PIT brackets 2025/26", note: "primary rebate R17,235" },
      { label: "UIF 1% employee capped", note: "R177.12 / month" }
    ],
    disclaimer: "Informational. Medical credits and retirement fund contributions not modelled."
  };
}
