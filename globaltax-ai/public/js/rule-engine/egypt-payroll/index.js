// Egypt — monthly payroll engine (2025/2026)
// Social Insurance (Law 148/2019):
//   Employee:  11%
//   Employer: 18.75%
// Wage base = Gross (up to ceiling). 2026 monthly ceiling = EGP 16,700 (indexed +15%/yr).
// Martyrs & Victims Fund (Law 4/2021): 0.05% of gross (often called "community participation tax").
// Personal income tax: progressive 0-27.5% after personal exemption EGP 20,000/yr.
// Pay deadline: 15th of following month.
//
// Sources: PwC Egypt Tax Summaries 2025, ZenHR flash alerts, Deloitte ME April 2025 cap update.

const SI_EMPLOYEE = 0.11;
const SI_EMPLOYER = 0.1875;
const SI_CEILING_2026 = 16700;     // EGP/month (was 14,500 in 2025, +15%)
const MARTYRS_FUND = 0.0005;        // 0.05% of gross (per Law 4/2021)
const PERSONAL_EXEMPT_YR = 20000;

// 2024-25 progressive brackets (EGP/yr) — update annually
const IT_SLABS = [
  { upTo: 40000,   rate: 0.00 },
  { upTo: 55000,   rate: 0.10 },
  { upTo: 70000,   rate: 0.15 },
  { upTo: 200000,  rate: 0.20 },
  { upTo: 400000,  rate: 0.225 },
  { upTo: 1200000, rate: 0.25 },
  { upTo: Infinity,rate: 0.275 }
];

function applySlabs(income, slabs) {
  let tax = 0, lower = 0;
  for (const s of slabs) {
    if (income <= lower) break;
    tax += (Math.min(income, s.upTo) - lower) * s.rate;
    lower = s.upTo;
  }
  return tax;
}

export function computeMonthly(emp, run = {}, opts = {}) {
  const monthSalary = Math.round(emp.salary / 12);
  const bonus = run.bonus || 0;
  const lopDays = run.lop || 0;
  const workingDays = opts.workingDays ?? 30;
  const lopDeduction = Math.round(monthSalary * (lopDays / workingDays));
  const gross = monthSalary - lopDeduction + bonus + (run.reimburse || 0);

  // SI — capped at 16,700
  const siBase = Math.min(gross, SI_CEILING_2026);
  const employeeSI = Math.round(siBase * SI_EMPLOYEE);
  const employerSI = Math.round(siBase * SI_EMPLOYER);

  // Martyrs Fund (0.05% of gross)
  const martyrs = Math.round(gross * MARTYRS_FUND);

  // Income tax — annualized
  const annualGross = emp.salary;
  const annualSI = Math.min(Math.round(emp.salary / 12), SI_CEILING_2026) * 12 * SI_EMPLOYEE;
  const taxableIncome = Math.max(0, annualGross - annualSI - PERSONAL_EXEMPT_YR);
  const annualTax = applySlabs(taxableIncome, IT_SLABS);
  const monthlyIT = Math.max(0, Math.round(annualTax / 12));

  const netPay = gross - employeeSI - martyrs - monthlyIT;
  const employerCost = gross + employerSI;

  return {
    empId: emp.id,
    country: "EG",
    currency: "EGP",
    currencySymbol: "EGP ",
    earnings: { gross, base: monthSalary - lopDeduction, bonus, reimburse: run.reimburse || 0, lopDeduction },
    deductions: {
      employeeSI, employerSI, martyrs, incomeTax: monthlyIT,
      employeePF: employeeSI,
      employerPF: employerSI,
      employeeESI: 0, employerESI: 0,
      pt: martyrs,
      tds: monthlyIT,
      gratuityAccrual: 0
    },
    netPay, employerCost,
    citations: [
      { label: "Law 148/2019",         note: "Social Insurance 11% + 18.75%; ceiling EGP 16,700 (2026)" },
      { label: "Law 4/2021",           note: "Martyrs & Victims Fund 0.05%" },
      { label: "IT Law 91/2005 amd",   note: "Progressive 0–27.5%; personal exemption EGP 20,000" }
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
    a.employeeESI += 0; a.employerESI += 0;
    a.pt += x.deductions.pt;
    a.tds += x.deductions.tds;
    a.gratuityAccrual += 0;
    a.netPay += x.netPay;
    a.employerCost += x.employerCost;
    return a;
  }, { headcount: 0, gross: 0, employeePF: 0, employerPF: 0, employeeESI: 0, employerESI: 0, pt: 0, tds: 0, gratuityAccrual: 0, netPay: 0, employerCost: 0 });
  return { rows, totals };
}
