/**
 * Net Pay Calculator
 * Final step in the pipeline: gross - pre-tax - taxes - post-tax = net
 */

function round(value) {
  return Math.round(value * 100) / 100;
}

/**
 * Calculate net pay from all components
 */
function calculateNetPay(grossPay, preTaxDeductions, taxes, postTaxDeductions) {
  const preTaxTotal = preTaxDeductions.totals ? preTaxDeductions.totals.total :
    (Array.isArray(preTaxDeductions.items) ? preTaxDeductions.items.reduce((s, i) => s + i.amount, 0) : 0);

  const taxTotal = calculateTaxTotal(taxes);

  const postTaxTotal = postTaxDeductions.total ||
    (Array.isArray(postTaxDeductions.items) ? postTaxDeductions.items.reduce((s, i) => s + i.amount, 0) : 0);

  const netPay = round(grossPay - preTaxTotal - taxTotal - postTaxTotal);

  return {
    gross_pay: round(grossPay),
    pre_tax_deductions: round(preTaxTotal),
    total_taxes: round(taxTotal),
    post_tax_deductions: round(postTaxTotal),
    net_pay: Math.max(0, netPay), // Net pay cannot be negative
    breakdown: {
      federal_taxes: round(
        (taxes.federal_income || 0) +
        (taxes.social_security_employee || 0) +
        (taxes.medicare_employee || 0) +
        (taxes.medicare_additional || 0)
      ),
      state_taxes: round(
        (taxes.state_income || 0) +
        (taxes.local_income || 0)
      ),
      state_programs: round(
        (taxes.state_programs || []).reduce((s, p) => s + (p.employee_amount || 0), 0)
      )
    }
  };
}

/**
 * Sum all employee-side taxes
 */
function calculateTaxTotal(taxes) {
  let total = 0;
  total += taxes.federal_income || 0;
  total += taxes.social_security_employee || 0;
  total += taxes.medicare_employee || 0;
  total += taxes.medicare_additional || 0;
  total += taxes.state_income || 0;
  total += taxes.local_income || 0;

  // State programs (employee portion only)
  if (taxes.state_programs && Array.isArray(taxes.state_programs)) {
    for (const prog of taxes.state_programs) {
      total += prog.employee_amount || 0;
    }
  }

  return round(total);
}

/**
 * Sum all employer-side taxes (not deducted from employee)
 */
function calculateEmployerTaxTotal(taxes) {
  let total = 0;
  total += taxes.social_security_employer || 0;
  total += taxes.medicare_employer || 0;
  total += taxes.futa || 0;

  // State employer taxes
  if (taxes.employer_taxes && Array.isArray(taxes.employer_taxes)) {
    for (const tax of taxes.employer_taxes) {
      total += tax.amount || 0;
    }
  }

  // State programs (employer portion)
  if (taxes.state_programs && Array.isArray(taxes.state_programs)) {
    for (const prog of taxes.state_programs) {
      total += prog.employer_amount || 0;
    }
  }

  return round(total);
}

/**
 * Calculate total employer cost for an employee
 * (what the employer actually pays beyond the employee's gross)
 */
function calculateTotalEmployerCost(grossPay, employerTaxes, employerBenefits = {}) {
  const taxCost = calculateEmployerTaxTotal(employerTaxes);

  let benefitsCost = 0;
  if (employerBenefits.health_insurance) benefitsCost += employerBenefits.health_insurance;
  if (employerBenefits.retirement_match) benefitsCost += employerBenefits.retirement_match;
  if (employerBenefits.workers_comp) benefitsCost += employerBenefits.workers_comp;

  return {
    gross_pay: round(grossPay),
    employer_taxes: round(taxCost),
    employer_benefits: round(benefitsCost),
    total_employer_cost: round(grossPay + taxCost + benefitsCost)
  };
}

module.exports = {
  calculateNetPay,
  calculateTaxTotal,
  calculateEmployerTaxTotal,
  calculateTotalEmployerCost
};
