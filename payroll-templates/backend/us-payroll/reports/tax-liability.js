/**
 * Tax Liability Report
 * Summarizes federal and state tax liabilities with deposit due dates
 */

function generateTaxLiability(stubs, state, periodStart, periodEnd) {
  const federal = {
    fit_withheld: 0,
    ss_employee: 0,
    ss_employer: 0,
    medicare_employee: 0,
    medicare_employer: 0,
    medicare_additional: 0,
    futa: 0
  };

  const stateTaxes = {
    state_income_tax: 0,
    local_income_tax: 0,
    programs: {},
    employer_taxes: {}
  };

  for (const stub of stubs) {
    const taxes = stub.taxes || {};
    federal.fit_withheld += taxes.federal_income || 0;
    federal.ss_employee += taxes.social_security_employee || 0;
    federal.medicare_employee += taxes.medicare_employee || 0;
    federal.medicare_additional += taxes.medicare_additional || 0;

    const empTaxes = stub.employer_taxes || {};
    federal.ss_employer += empTaxes.ss_employer || 0;
    federal.medicare_employer += empTaxes.medicare_employer || 0;
    federal.futa += empTaxes.futa || 0;

    stateTaxes.state_income_tax += taxes.state_income || 0;
    stateTaxes.local_income_tax += taxes.local_income || 0;

    // State programs
    for (const prog of (taxes.state_programs || [])) {
      const key = prog.code || prog.name;
      if (!stateTaxes.programs[key]) {
        stateTaxes.programs[key] = { name: prog.name, employee: 0, employer: 0 };
      }
      stateTaxes.programs[key].employee += prog.employee_amount || 0;
      stateTaxes.programs[key].employer += prog.employer_amount || 0;
    }

    // State employer taxes
    for (const [key, value] of Object.entries(empTaxes)) {
      if (['ss_employer', 'medicare_employer', 'futa'].includes(key)) continue;
      if (typeof value === 'number' && value > 0) {
        if (!stateTaxes.employer_taxes[key]) {
          stateTaxes.employer_taxes[key] = { name: key.replace(/_/g, ' ').toUpperCase(), amount: 0 };
        }
        stateTaxes.employer_taxes[key].amount += value;
      }
    }
  }

  const round = v => Math.round(v * 100) / 100;

  // Calculate Form 941 deposit amount
  const form941Deposit = round(
    federal.fit_withheld + federal.ss_employee + federal.ss_employer +
    federal.medicare_employee + federal.medicare_employer + federal.medicare_additional
  );

  return {
    report_type: 'tax_liability',
    state,
    period: `${periodStart} to ${periodEnd}`,
    employee_count: stubs.length,
    federal: {
      fit_withheld: round(federal.fit_withheld),
      social_security: {
        employee: round(federal.ss_employee),
        employer: round(federal.ss_employer),
        total: round(federal.ss_employee + federal.ss_employer)
      },
      medicare: {
        employee: round(federal.medicare_employee),
        employer: round(federal.medicare_employer),
        additional: round(federal.medicare_additional),
        total: round(federal.medicare_employee + federal.medicare_employer + federal.medicare_additional)
      },
      futa: round(federal.futa),
      form_941_deposit: form941Deposit,
      total_federal: round(form941Deposit + federal.futa)
    },
    state_taxes: {
      income_tax_withheld: round(stateTaxes.state_income_tax),
      local_tax_withheld: round(stateTaxes.local_income_tax),
      programs: Object.entries(stateTaxes.programs).map(([code, p]) => ({
        code,
        name: p.name,
        employee_total: round(p.employee),
        employer_total: round(p.employer),
        combined: round(p.employee + p.employer)
      })),
      employer_taxes: Object.entries(stateTaxes.employer_taxes).map(([code, t]) => ({
        code,
        name: t.name,
        amount: round(t.amount)
      }))
    }
  };
}

module.exports = { generateTaxLiability };
