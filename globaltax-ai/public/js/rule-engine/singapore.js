// Singapore — Resident income tax 2025 (YA 2025) + CPF (for Singaporeans/PRs).

export const SG_META = {
  country: "Singapore",
  code: "SG",
  currency: "SGD",
  currencySymbol: "S$",
  fiscalYear: "2025",
  updatedOn: "2025-01-01",
  regimes: ["resident"]
};

const BANDS = [
  { upTo: 20000,   rate: 0.00 },
  { upTo: 30000,   rate: 0.02 },
  { upTo: 40000,   rate: 0.035 },
  { upTo: 80000,   rate: 0.07 },
  { upTo: 120000,  rate: 0.115 },
  { upTo: 160000,  rate: 0.15 },
  { upTo: 200000,  rate: 0.18 },
  { upTo: 240000,  rate: 0.19 },
  { upTo: 280000,  rate: 0.195 },
  { upTo: 320000,  rate: 0.20 },
  { upTo: 500000,  rate: 0.22 },
  { upTo: 1000000, rate: 0.23 },
  { upTo: Infinity, rate: 0.24 }
];

const CPF_EMPLOYEE = 0.20;           // under age 55
const CPF_WAGE_CEIL = 7400 * 12;     // 2025 ordinary wage ceiling annualised

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

export function calcSingapore({ grossAnnualIncome, residency = "citizen" }) {
  const { tax: incomeTax, breakdown } = applyBands(grossAnnualIncome, BANDS);
  const cpf = residency === "foreigner"
    ? 0
    : Math.min(grossAnnualIncome, CPF_WAGE_CEIL) * CPF_EMPLOYEE;
  const total = incomeTax + cpf;
  return {
    country: "SG",
    currency: "SGD",
    inputs: { grossAnnualIncome, residency },
    incomeTax: Math.round(incomeTax),
    cpfEmployee: Math.round(cpf),
    slabBreakdown: breakdown,
    totalTax: Math.round(total),
    effectiveRate: grossAnnualIncome > 0 ? +(total / grossAnnualIncome * 100).toFixed(2) : 0,
    takeHome: Math.round(grossAnnualIncome - total),
    citations: [
      { label: "IRAS resident rates YA 2025", note: "top marginal 24%" },
      { label: "CPF 20% employee (<55)", note: "ordinary wage ceiling S$7,400/mo" }
    ],
    disclaimer: "Informational. Foreigners typically do not pay CPF."
  };
}
