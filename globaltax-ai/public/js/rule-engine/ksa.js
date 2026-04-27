// Saudi Arabia — No personal income tax for individuals.
// GOSI social insurance: Saudi nationals 9% employee + 9% employer + 1% unemployment.
// Expats: 0% income tax; 2% GOSI occupational hazards (employer only).
// Zakat: 2.5% of zakatable wealth (self-assessed by GCC Muslims, not a payroll tax).

export const SA_META = {
  country: "Saudi Arabia",
  code: "SA",
  currency: "SAR",
  currencySymbol: "SAR",
  fiscalYear: "2025",
  updatedOn: "2025-01-01",
  regimes: ["saudi", "expat"]
};

export function calcKSA({ grossAnnualIncome, nationality = "expat", includeZakat = false }) {
  const isSaudi = nationality === "SA" || nationality === "saudi" || nationality === "GCC";
  const gosiRate = isSaudi ? 0.10 : 0.0; // 9% pension + 1% unemployment (employee share)
  const gosi = grossAnnualIncome * gosiRate;

  // Zakat is personal, but we can show an indicative figure on gross
  const zakat = includeZakat ? grossAnnualIncome * 0.025 : 0;

  const totalDeduction = gosi + zakat;

  return {
    country: "SA",
    currency: "SAR",
    inputs: { grossAnnualIncome, nationality, includeZakat },
    taxableIncome: 0,
    personalIncomeTax: 0,
    gosiContribution: Math.round(gosi),
    zakatIndicative: Math.round(zakat),
    totalTax: Math.round(totalDeduction),
    effectiveRate: grossAnnualIncome > 0 ? +(totalDeduction / grossAnnualIncome * 100).toFixed(2) : 0,
    takeHome: Math.round(grossAnnualIncome - totalDeduction),
    citations: [
      { label: "No personal income tax", note: "ZATCA — Zakat, Tax and Customs Authority" },
      { label: "GOSI 10% employee (Saudi nationals)", note: "Social Insurance Law" },
      { label: "Zakat 2.5%", note: "Self-assessed; indicative only" }
    ],
    disclaimer: "Informational. Not tax advice."
  };
}
