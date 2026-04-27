// Germany — Einkommensteuer 2025, simplified formula + Soli + employee social security.
// Real engine would implement the kink-point formula; this is a conservative bracket approximation.

export const DE_META = {
  country: "Germany",
  code: "DE",
  currency: "EUR",
  currencySymbol: "€",
  fiscalYear: "2025",
  updatedOn: "2025-01-01",
  regimes: ["single"]
};

// Approximation of the 2025 Einkommensteuer schedule using bracket slices.
const BANDS = [
  { upTo: 12096,   rate: 0.00 },   // Grundfreibetrag
  { upTo: 17443,   rate: 0.14 },   // progressive zone 1 (avg approx)
  { upTo: 68480,   rate: 0.30 },   // progressive zone 2 (avg approx)
  { upTo: 277825,  rate: 0.42 },
  { upTo: Infinity, rate: 0.45 }
];

const SOLI_RATE = 0.055; // solidarity surcharge on income tax
const SOLI_EXEMPT_UPTO_TAX = 19950; // 2025 single-filer Soli free allowance (tax amount)

// Employee social security — combined approx 20.65%
const SS_EMPLOYEE = {
  pension: 0.093,
  health:  0.0735,
  unemployment: 0.013,
  longTermCare: 0.018
};
const SS_CAP_PENSION_UNEMP = 96600; // 2025 west
const SS_CAP_HEALTH = 66150;

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

export function calcGermany({ grossAnnualIncome }) {
  const { tax: incomeTax, breakdown } = applyBands(grossAnnualIncome, BANDS);
  const soli = incomeTax > SOLI_EXEMPT_UPTO_TAX ? incomeTax * SOLI_RATE : 0;

  const pension = Math.min(grossAnnualIncome, SS_CAP_PENSION_UNEMP) * SS_EMPLOYEE.pension;
  const unemp   = Math.min(grossAnnualIncome, SS_CAP_PENSION_UNEMP) * SS_EMPLOYEE.unemployment;
  const health  = Math.min(grossAnnualIncome, SS_CAP_HEALTH) * SS_EMPLOYEE.health;
  const care    = Math.min(grossAnnualIncome, SS_CAP_HEALTH) * SS_EMPLOYEE.longTermCare;
  const socialSecurity = pension + unemp + health + care;

  const total = incomeTax + soli + socialSecurity;
  return {
    country: "DE",
    currency: "EUR",
    inputs: { grossAnnualIncome },
    incomeTax: Math.round(incomeTax),
    soli: Math.round(soli),
    socialSecurity: Math.round(socialSecurity),
    slabBreakdown: breakdown,
    totalTax: Math.round(total),
    effectiveRate: grossAnnualIncome > 0 ? +(total / grossAnnualIncome * 100).toFixed(2) : 0,
    takeHome: Math.round(grossAnnualIncome - total),
    citations: [
      { label: "Grundfreibetrag 2025 €12,096", note: "EStG §32a" },
      { label: "Solidaritätszuschlag 5.5%", note: "above Soli free allowance" },
      { label: "Employee SS ≈20.65%", note: "capped by Beitragsbemessungsgrenze" }
    ],
    disclaimer: "Informational. Church tax and joint-filing (Zusammenveranlagung) not modelled."
  };
}
