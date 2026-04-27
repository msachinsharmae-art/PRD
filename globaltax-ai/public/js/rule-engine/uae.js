// UAE — No personal income tax. Corporate tax 9% (above AED 375k).
// VAT 5% standard. Mandatory pension (GPSSA) for UAE/GCC nationals only.

export const AE_META = {
  country: "United Arab Emirates",
  code: "AE",
  currency: "AED",
  currencySymbol: "AED",
  fiscalYear: "2025",
  updatedOn: "2025-01-01",
  regimes: ["resident"]
};

export function calcUAE({ grossAnnualIncome, nationality = "expat" }) {
  // Personal income tax: 0% for all residents.
  const pensionRate = (nationality === "UAE" || nationality === "GCC") ? 0.05 : 0.0; // employee share of GPSSA
  const pension = grossAnnualIncome * pensionRate;

  return {
    country: "AE",
    currency: "AED",
    inputs: { grossAnnualIncome, nationality },
    taxableIncome: 0,
    personalIncomeTax: 0,
    pensionContribution: Math.round(pension),
    totalTax: Math.round(pension), // framed as total statutory deduction
    effectiveRate: grossAnnualIncome > 0 ? +(pension / grossAnnualIncome * 100).toFixed(2) : 0,
    takeHome: Math.round(grossAnnualIncome - pension),
    citations: [
      { label: "No personal income tax", note: "UAE Federal Tax Authority" },
      { label: "Corporate Tax 9% > AED 375k", note: "Federal Decree-Law No. 47 of 2022, effective 1 Jun 2023" },
      { label: "GPSSA pension 5% employee share", note: "applies to UAE/GCC nationals only" }
    ],
    disclaimer: "Informational. Not tax advice."
  };
}
