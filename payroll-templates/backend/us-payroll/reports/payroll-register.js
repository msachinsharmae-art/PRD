/**
 * Payroll Register Report
 * Generates a comprehensive report of all employees for a pay period
 */

function generatePayrollRegister(payRun, stubs, employees) {
  const rows = stubs.map(stub => {
    const emp = employees.find(e => e.employee_id === stub.employee_id) || {};
    return {
      employee_id: stub.employee_id,
      employee_name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
      department: emp.department || '',
      pay_type: emp.pay_type || '',
      hours: {
        regular: stub.hours?.regular || 0,
        overtime: (stub.hours?.overtime_15x || 0) + (stub.hours?.overtime_2x || 0),
        total: Object.values(stub.hours || {}).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0)
      },
      gross_pay: stub.earnings?.gross_pay || 0,
      pre_tax_deductions: stub.pre_tax_deductions?.total || 0,
      federal_tax: (stub.taxes?.federal_income || 0) + (stub.taxes?.social_security_employee || 0) + (stub.taxes?.medicare_employee || 0),
      state_tax: (stub.taxes?.state_income || 0) + (stub.taxes?.local_income || 0),
      state_programs: (stub.taxes?.state_programs || []).reduce((s, p) => s + (p.employee_amount || 0), 0),
      post_tax_deductions: stub.post_tax_deductions?.total || 0,
      net_pay: stub.net_pay || 0,
      employer_taxes: Object.values(stub.employer_taxes || {}).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0)
    };
  });

  const totals = rows.reduce((acc, row) => {
    acc.gross_pay += row.gross_pay;
    acc.pre_tax_deductions += row.pre_tax_deductions;
    acc.federal_tax += row.federal_tax;
    acc.state_tax += row.state_tax;
    acc.state_programs += row.state_programs;
    acc.post_tax_deductions += row.post_tax_deductions;
    acc.net_pay += row.net_pay;
    acc.employer_taxes += row.employer_taxes;
    return acc;
  }, { gross_pay: 0, pre_tax_deductions: 0, federal_tax: 0, state_tax: 0, state_programs: 0, post_tax_deductions: 0, net_pay: 0, employer_taxes: 0 });

  // Round totals
  for (const key of Object.keys(totals)) {
    totals[key] = Math.round(totals[key] * 100) / 100;
  }

  return {
    report_type: 'payroll_register',
    pay_run_id: payRun.pay_run_id,
    state: payRun.state,
    pay_period: `${payRun.pay_period_start} to ${payRun.pay_period_end}`,
    pay_date: payRun.pay_date,
    employee_count: rows.length,
    rows,
    totals
  };
}

module.exports = { generatePayrollRegister };
