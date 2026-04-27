// Japan — National income tax 2025 + 10% local inhabitant tax + social insurance (≈15%).

export const JP_META = {
  country: "Japan",
  code: "JP",
  currency: "JPY",
  currencySymbol: "¥",
  fiscalYear: "2025",
  updatedOn: "2025-01-01",
  regimes: ["resident"]
};

// National income-tax brackets (on taxable income after deductions)
const BANDS = [
  { upTo: 1950000,    rate: 0.05, deduction: 0 },
  { upTo: 3300000,    rate: 0.10, deduction: 97500 },
  { upTo: 6950000,    rate: 0.20, deduction: 427500 },
  { upTo: 9000000,    rate: 0.23, deduction: 636000 },
  { upTo: 18000000,   rate: 0.33, deduction: 1536000 },
  { upTo: 40000000,   rate: 0.40, deduction: 2796000 },
  { upTo: Infinity,   rate: 0.45, deduction: 4796000 }
];

const EMPLOYMENT_INCOME_DEDUCTION = (gross) => {
  // Very simplified — real table has 6 tiers.
  if (gross <= 1625000) return 550000;
  if (gross <= 1800000) return gross * 0.4 - 100000;
  if (gross <= 3600000) return gross * 0.3 + 80000;
  if (gross <= 6600000) return gross * 0.2 + 440000;
  if (gross <= 8500000) return gross * 0.1 + 1100000;
  return 1950000;
};

const BASIC_DEDUCTION = 480000;
const INHABITANT_RATE = 0.10; // prefectural + municipal combined
const SURTAX_RATE = 0.021; // 2.1% reconstruction surtax on national tax

// Social insurance — very approximate (health + pension + employment)
const SOCIAL_INSURANCE = 0.15;

export function calcJapan({ grossAnnualIncome }) {
  const empDed = EMPLOYMENT_INCOME_DEDUCTION(grossAnnualIncome);
  const taxable = Math.max(0, grossAnnualIncome - empDed - BASIC_DEDUCTION);

  let national = 0;
  for (const b of BANDS) {
    if (taxable <= b.upTo) {
      national = taxable * b.rate - b.deduction;
      break;
    }
  }
  national = Math.max(0, national);
  const surtax = national * SURTAX_RATE;
  const inhabitant = taxable * INHABITANT_RATE;
  const social = grossAnnualIncome * SOCIAL_INSURANCE;
  const total = national + surtax + inhabitant + social;

  return {
    country: "JP",
    currency: "JPY",
    inputs: { grossAnnualIncome },
    employmentDeduction: Math.round(empDed),
    basicDeduction: BASIC_DEDUCTION,
    taxableIncome: Math.round(taxable),
    nationalTax: Math.round(national),
    reconstructionSurtax: Math.round(surtax),
    inhabitantTax: Math.round(inhabitant),
    socialInsurance: Math.round(social),
    totalTax: Math.round(total),
    effectiveRate: grossAnnualIncome > 0 ? +(total / grossAnnualIncome * 100).toFixed(2) : 0,
    takeHome: Math.round(grossAnnualIncome - total),
    citations: [
      { label: "NTA national income tax brackets", note: "5%–45% with deduction formula" },
      { label: "Inhabitant tax 10%", note: "prefectural + municipal" },
      { label: "Reconstruction surtax 2.1%", note: "until 2037" }
    ],
    disclaimer: "Informational. Social insurance approximated at 15%; real rate depends on prefecture and health union."
  };
}
