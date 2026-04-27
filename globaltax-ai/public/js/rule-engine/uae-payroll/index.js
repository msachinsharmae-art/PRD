// UAE — monthly payroll engine
// No personal income tax.
// GPSSA pension (UAE Federal Law 7/1999 as amended by 57/2023):
//   - UAE nationals (and GCC nationals working in UAE per GCC unified scheme):
//       employee 11% of contribution wage
//       employer 12.5% (private sector), up to 15% (public). NEW HIRES since Oct 2023: 26% total.
//     The scheme uses "contribution pay" (basic + social allowance + housing + certain fixed allowances).
//   - Expats: no pension. Entitled to End-of-Service Gratuity (Art. 51, Labour Law Decree 33/2021).
// EOS gratuity (expats & nationals both, but nationals usually get pension instead):
//   - 21 days basic pay per year for first 5 years
//   - 30 days basic pay per year after 5 years
//   - Capped at 2 years' basic pay
// Wage Protection System (WPS): employer must transfer salaries via MOHRE system monthly.

const GPSSA_EMPLOYEE = 0.11;   // national employee share (post Oct-2023)
const GPSSA_EMPLOYER = 0.125;  // private-sector employer
const EOS_FIRST5_DAYS = 21;
const EOS_AFTER5_DAYS = 30;

function isNational(emp) {
  return emp.nationality === "UAE" || emp.nationality === "GCC";
}

function yearsOfService(doj, asOf = new Date()) {
  const start = new Date(doj);
  return Math.max(0, (asOf - start) / (365.25 * 86400000));
}

export function computeMonthly(emp, run = {}, opts = {}) {
  const monthSalary = Math.round(emp.salary / 12);
  const basicShare = emp.basicPct ?? 0.60;
  const basic = Math.round(monthSalary * basicShare);
  const housing = Math.round(monthSalary * (emp.housingPct ?? 0.25));
  const other = monthSalary - basic - housing;

  const bonus = run.bonus || 0;
  const lopDays = run.lop || 0;
  const workingDays = opts.workingDays ?? 30;
  const lopDeduction = Math.round(monthSalary * (lopDays / workingDays));
  const gross = monthSalary - lopDeduction + bonus + (run.reimburse || 0);

  // Contribution pay for GPSSA = basic + housing + social allowance (simplified).
  const contributionPay = basic + housing;

  const national = isNational(emp);
  const employeeGPSSA = national ? Math.round(contributionPay * GPSSA_EMPLOYEE) : 0;
  const employerGPSSA = national ? Math.round(contributionPay * GPSSA_EMPLOYER) : 0;

  // EOS monthly accrual: expats only typically; nationals get pension instead.
  // Compute based on current year-of-service bracket for realism.
  let eosAccrual = 0;
  if (!national) {
    const yrs = yearsOfService(emp.doj);
    const dailyBasic = basic / 30;
    const daysPerYear = yrs <= 5 ? EOS_FIRST5_DAYS : EOS_AFTER5_DAYS;
    eosAccrual = Math.round((dailyBasic * daysPerYear) / 12);
  }

  const netPay = gross - employeeGPSSA; // no income tax
  const employerCost = gross + employerGPSSA + eosAccrual;

  return {
    empId: emp.id,
    country: "AE",
    currency: "AED",
    currencySymbol: "AED ",
    earnings: { gross, basic, housing, other, bonus, reimburse: run.reimburse || 0, lopDeduction },
    deductions: {
      employeeGPSSA, employerGPSSA, eosAccrual,
      employeePF: employeeGPSSA,
      employerPF: employerGPSSA,
      employeeESI: 0, employerESI: 0,
      pt: 0, tds: 0,
      gratuityAccrual: eosAccrual
    },
    netPay, employerCost,
    citations: [
      { label: "Federal Law 7/1999 + amendments 57/2023", note: "GPSSA pension rates (26% total)" },
      { label: "Labour Law Decree 33/2021, Art 51",       note: "End-of-Service Gratuity 21/30 days" },
      { label: "Ministerial Decision 788/2009",           note: "Wage Protection System" }
    ]
  };
}

export function runMonth(employees, runRows, opts = {}) {
  const empMap = Object.fromEntries(employees.map(e => [e.id, e]));
  const rows = runRows.map(r => { const emp = empMap[r.id]; if (!emp) return null; return computeMonthly(emp, r, opts); }).filter(Boolean);
  const totals = rows.reduce((a, x) => {
    a.headcount += 1;
    a.gross += x.earnings.gross;
    a.employeePF += x.deductions.employeePF;
    a.employerPF += x.deductions.employerPF;
    a.employeeESI += 0;
    a.employerESI += 0;
    a.pt += 0;
    a.tds += 0;
    a.gratuityAccrual += x.deductions.gratuityAccrual;
    a.netPay += x.netPay;
    a.employerCost += x.employerCost;
    return a;
  }, { headcount: 0, gross: 0, employeePF: 0, employerPF: 0, employeeESI: 0, employerESI: 0, pt: 0, tds: 0, gratuityAccrual: 0, netPay: 0, employerCost: 0 });
  return { rows, totals };
}
