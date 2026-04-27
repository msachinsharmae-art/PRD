// Brazil — IRPF progressive 2025 + INSS employee contribution.

export const BR_META = {
  country: "Brazil",
  code: "BR",
  currency: "BRL",
  currencySymbol: "R$",
  fiscalYear: "2025",
  updatedOn: "2025-02-01",
  regimes: ["resident"]
};

// IRPF 2025 monthly bands annualised (MP 1171/2023 updated).
const BANDS = [
  { upTo: 26963.20,  rate: 0.00,   deduction: 0 },
  { upTo: 33919.80,  rate: 0.075,  deduction: 2022.24 },
  { upTo: 45012.60,  rate: 0.15,   deduction: 4566.23 },
  { upTo: 55976.16,  rate: 0.225,  deduction: 7942.17 },
  { upTo: Infinity,  rate: 0.275,  deduction: 10740.98 }
];

// INSS employee 2025 progressive bands (monthly annualised)
const INSS = [
  { upTo: 18315.48,  rate: 0.075 },
  { upTo: 30491.28,  rate: 0.09 },
  { upTo: 45736.92,  rate: 0.12 },
  { upTo: 89128.08,  rate: 0.14 }  // cap
];

function inssAnnual(gross) {
  let inss = 0, lower = 0;
  for (const b of INSS) {
    if (gross <= lower) break;
    const slice = Math.min(gross, b.upTo) - lower;
    inss += slice * b.rate;
    lower = b.upTo;
  }
  return inss;
}

export function calcBrazil({ grossAnnualIncome }) {
  let irpf = 0;
  for (const b of BANDS) {
    if (grossAnnualIncome <= b.upTo) {
      irpf = Math.max(0, grossAnnualIncome * b.rate - b.deduction);
      break;
    }
  }
  const inss = inssAnnual(grossAnnualIncome);
  const total = irpf + inss;
  return {
    country: "BR",
    currency: "BRL",
    inputs: { grossAnnualIncome },
    irpf: Math.round(irpf),
    inss: Math.round(inss),
    totalTax: Math.round(total),
    effectiveRate: grossAnnualIncome > 0 ? +(total / grossAnnualIncome * 100).toFixed(2) : 0,
    takeHome: Math.round(grossAnnualIncome - total),
    citations: [
      { label: "Receita Federal IRPF bands 2025", note: "up to 27.5%" },
      { label: "INSS employee progressive 7.5–14%", note: "cap at teto previdenciário" }
    ],
    disclaimer: "Informational. 13º salary and dependants deduction not modelled."
  };
}
