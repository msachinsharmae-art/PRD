/**
 * Labor Cost Report
 * Analyzes total employer cost by department and location
 */

function generateLaborCost(stubs, employees, groupBy = 'department') {
  const groups = {};

  for (const stub of stubs) {
    const emp = employees.find(e => e.employee_id === stub.employee_id) || {};
    const groupKey = emp[groupBy] || 'Unassigned';

    if (!groups[groupKey]) {
      groups[groupKey] = {
        name: groupKey,
        employee_count: 0,
        total_gross: 0,
        total_overtime: 0,
        total_employer_taxes: 0,
        total_benefits: 0,
        total_cost: 0,
        employees: []
      };
    }

    const g = groups[groupKey];
    g.employee_count++;

    const gross = stub.earnings?.gross_pay || 0;
    const ot = (stub.earnings?.overtime_pay || 0) + (stub.earnings?.double_time_pay || 0);
    const empTaxes = Object.values(stub.employer_taxes || {}).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);

    g.total_gross += gross;
    g.total_overtime += ot;
    g.total_employer_taxes += empTaxes;
    g.total_cost += gross + empTaxes;

    g.employees.push({
      employee_id: stub.employee_id,
      name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
      gross: gross,
      overtime: ot,
      employer_taxes: empTaxes,
      total_cost: gross + empTaxes
    });
  }

  const round = v => Math.round(v * 100) / 100;

  const summary = Object.values(groups).map(g => ({
    ...g,
    total_gross: round(g.total_gross),
    total_overtime: round(g.total_overtime),
    total_employer_taxes: round(g.total_employer_taxes),
    total_cost: round(g.total_cost),
    avg_cost_per_employee: round(g.total_cost / (g.employee_count || 1)),
    overtime_pct: g.total_gross > 0 ? round((g.total_overtime / g.total_gross) * 100) : 0,
    employees: g.employees.map(e => ({
      ...e,
      gross: round(e.gross),
      overtime: round(e.overtime),
      employer_taxes: round(e.employer_taxes),
      total_cost: round(e.total_cost)
    }))
  }));

  const grandTotal = summary.reduce((acc, g) => {
    acc.total_gross += g.total_gross;
    acc.total_overtime += g.total_overtime;
    acc.total_employer_taxes += g.total_employer_taxes;
    acc.total_cost += g.total_cost;
    acc.employee_count += g.employee_count;
    return acc;
  }, { total_gross: 0, total_overtime: 0, total_employer_taxes: 0, total_cost: 0, employee_count: 0 });

  return {
    report_type: 'labor_cost',
    grouped_by: groupBy,
    groups: summary,
    grand_total: {
      ...grandTotal,
      total_gross: round(grandTotal.total_gross),
      total_overtime: round(grandTotal.total_overtime),
      total_employer_taxes: round(grandTotal.total_employer_taxes),
      total_cost: round(grandTotal.total_cost)
    }
  };
}

module.exports = { generateLaborCost };
