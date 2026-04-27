// Saudi Arabia — monthly payroll engine
// No personal income tax.
// GOSI (General Organization for Social Insurance) Royal Decree M/33.
//
// ⚠️ Rates updated July 2025 per the GOSI annuities step-up plan
// (Council of Ministers Resolution; ZenHR / Infura summaries April 2025):
//   Saudi nationals:
//     - Annuities: 9.5% employee + 9.5% employer (stepping up 0.5%/yr to 11% by 2028)
//     - SANED (unemployment): 0.75% employee + 0.75% employer
//     - Occupational Hazards: 2% employer only
//     Totals: EMPLOYEE 10.25%, EMPLOYER 12.25%
//   Non-Saudi nationals (expats):
//     - Occupational Hazards: 2% employer only
//
// Contribution wage = basic + housing allowance; min SAR 1,500 / max SAR 45,000 per month.
// End-of-Service (Labour Law Art 84):
//   - 0.5 month basic per year for first 5 years
//   - 1 month basic per year beyond
//   - Pro-rated on resignation (1/3, 2/3, full by tenure)

const GOSI_CAP_MIN = 1500;
const GOSI_CAP_MAX = 45000;
const SAUDI_EMPLOYEE = 0.1025;   // 9.5% annuities + 0.75% SANED
const SAUDI_EMPLOYER = 0.1225;   // 9.5% annuities + 0.75% SANED + 2% occ hazards
const EXPAT_EMPLOYER = 0.02;     // occ hazards only

function isSaudi(emp) {
  return emp.nationality === "SA" || emp.nationality === "saudi" || emp.nationality === "GCC";
}

function yearsOfService(doj, asOf = new Date()) {
  return Math.max(0, (asOf - new Date(doj)) / (365.25 * 86400000));
}

export function computeMonthly(emp, run = {}, opts = {}) {
  const monthSalary = Math.round(emp.salary / 12);
  const basicShare = emp.basicPct ?? 0.60;
  const basic = Math.round(monthSalary * basicShare);
  const housing = Math.round(monthSalary * (emp.housingPct ?? 0.25));
  const contributionWageRaw = basic + housing;
  const contributionWage = Math.max(GOSI_CAP_MIN, Math.min(contributionWageRaw, GOSI_CAP_MAX));

  const bonus = run.bonus || 0;
  const lopDays = run.lop || 0;
  const workingDays = opts.workingDays ?? 30;
  const lopDeduction = Math.round(monthSalary * (lopDays / workingDays));
  const gross = monthSalary - lopDeduction + bonus + (run.reimburse || 0);

  const saudi = isSaudi(emp);
  const employeeGOSI = saudi ? Math.round(contributionWage * SAUDI_EMPLOYEE) : 0;
  const employerGOSI = saudi ? Math.round(contributionWage * SAUDI_EMPLOYER) : Math.round(contributionWage * EXPAT_EMPLOYER);

  // EOS accrual
  const yrs = yearsOfService(emp.doj);
  const daysPerYear = yrs <= 5 ? 15 : 30; // 0.5 month = 15 days, 1 month = 30 days
  const dailyBasic = basic / 30;
  const eosAccrual = Math.round((dailyBasic * daysPerYear) / 12);

  const netPay = gross - employeeGOSI;
  const employerCost = gross + employerGOSI + eosAccrual;

  return {
    empId: emp.id,
    country: "SA",
    currency: "SAR",
    currencySymbol: "SAR ",
    earnings: { gross, basic, housing, bonus, reimburse: run.reimburse || 0, lopDeduction },
    deductions: {
      employeeGOSI, employerGOSI, eosAccrual,
      employeePF: employeeGOSI,
      employerPF: employerGOSI,
      employeeESI: 0, employerESI: 0,
      pt: 0, tds: 0,
      gratuityAccrual: eosAccrual
    },
    netPay, employerCost,
    citations: [
      { label: "Royal Decree M/33 (GOSI)",   note: "9% + 0.75% annuities/SANED; 2% occ hazards" },
      { label: "Labour Law Art 84",          note: "End-of-service 0.5/1.0 month basic per year" },
      { label: "WPS — MHRSD Directive",      note: "Wage Protection System mandatory for all" }
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
    a.employeeESI += 0; a.employerESI += 0; a.pt += 0; a.tds += 0;
    a.gratuityAccrual += x.deductions.gratuityAccrual;
    a.netPay += x.netPay;
    a.employerCost += x.employerCost;
    return a;
  }, { headcount: 0, gross: 0, employeePF: 0, employerPF: 0, employeeESI: 0, employerESI: 0, pt: 0, tds: 0, gratuityAccrual: 0, netPay: 0, employerCost: 0 });
  return { rows, totals };
}
