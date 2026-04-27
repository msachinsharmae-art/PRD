// United States — monthly payroll engine (TY 2026)
// Statutory items: Federal income-tax W/H, FICA SS, FICA Medicare + Additional Medicare,
// FUTA (employer), SUTA (employer, state-specific), state income tax.
//
// Updated April 2026: brackets reflect Tax Year 2026 per IRS announcement + OBBBA provisions.
// Source: IRS Publication 15-T (2026), One Big Beautiful Bill Act.

// ─── 2026 Federal brackets ───────────────────────────────────────────
const FED_SINGLE = [
  { upTo: 12400,   rate: 0.10 },
  { upTo: 50400,   rate: 0.12 },
  { upTo: 105700,  rate: 0.22 },
  { upTo: 201775,  rate: 0.24 },
  { upTo: 256225,  rate: 0.32 },
  { upTo: 640600,  rate: 0.35 },
  { upTo: Infinity, rate: 0.37 }
];
const FED_MFJ = [
  { upTo: 24800,   rate: 0.10 },
  { upTo: 100800,  rate: 0.12 },
  { upTo: 211400,  rate: 0.22 },
  { upTo: 403550,  rate: 0.24 },
  { upTo: 512450,  rate: 0.32 },
  { upTo: 768700,  rate: 0.35 },
  { upTo: Infinity, rate: 0.37 }
];
const FED_HOH = [
  { upTo: 17700,   rate: 0.10 },
  { upTo: 67450,   rate: 0.12 },
  { upTo: 105700,  rate: 0.22 },
  { upTo: 201750,  rate: 0.24 },
  { upTo: 256200,  rate: 0.32 },
  { upTo: 640600,  rate: 0.35 },
  { upTo: Infinity, rate: 0.37 }
];
const STD_DED = { single: 16100, marriedJoint: 32200, hoh: 24150, mfs: 16100 };

// ─── FICA (2025) ─────────────────────────────────────────────────────
const SS_RATE          = 0.062;
const SS_WAGE_BASE     = 176100;
const MEDICARE_RATE    = 0.0145;
const ADDL_MEDICARE    = 0.009;    // employee-only, above threshold
const ADDL_MED_THRESH  = { single: 200000, marriedJoint: 250000 };

// ─── FUTA + SUTA (2025 indicative) ───────────────────────────────────
const FUTA_RATE       = 0.006;     // effective 0.6% after state credit
const FUTA_WAGE_BASE  = 7000;      // per employee per year
const STATE_SUTA = {
  CA: { rate: 0.034, base: 7000 },
  NY: { rate: 0.030, base: 12500 },
  TX: { rate: 0.027, base: 9000 },
  FL: { rate: 0.027, base: 7000 },
  WA: { rate: 0.018, base: 68500 }
};

// ─── State income tax (2025 simplified effective rates) ──────────────
const STATE_TAX = { CA: 0.065, NY: 0.055, TX: 0, FL: 0, WA: 0 };

function applySlabs(amount, slabs) {
  let tax = 0, lower = 0;
  for (const s of slabs) {
    if (amount <= lower) break;
    tax += (Math.min(amount, s.upTo) - lower) * s.rate;
    lower = s.upTo;
  }
  return tax;
}

function federalTax(gross, status) {
  const taxable = Math.max(0, gross - (STD_DED[status] || STD_DED.single));
  const slabs = status === "marriedJoint" ? FED_MFJ : status === "hoh" ? FED_HOH : FED_SINGLE;
  return applySlabs(taxable, slabs);
}

/**
 * @param {object} emp   { salary, state, filing, nationality?, ... }
 * @param {object} run   { bonus, lop, reimburse }
 */
export function computeMonthly(emp, run = {}, opts = {}) {
  const annualSalary = emp.salary;
  const monthSalary = Math.round(annualSalary / 12);
  const bonus = run.bonus || 0;
  const lopDays = run.lop || 0;
  const workingDays = opts.workingDays ?? 22;
  const lopDeduction = Math.round(monthSalary * (lopDays / workingDays));
  const gross = monthSalary - lopDeduction + bonus + (run.reimburse || 0);

  const filing = emp.filing || "single";

  // Federal W/H — annualized-percentage method: federalTax(annual)/12
  const annualTax = federalTax(annualSalary, filing);
  const fedWH = Math.round(annualTax / 12);

  // FICA SS — 6.2% of gross up to SS base annually.
  // Simplified: if annualSalary <= SS_WAGE_BASE → 6.2% of every monthly gross.
  const ssCapHit = annualSalary > SS_WAGE_BASE;
  const ssBaseMonth = ssCapHit ? Math.round(SS_WAGE_BASE / 12) : monthSalary;
  const empSS = Math.round(Math.min(gross, ssBaseMonth) * SS_RATE);
  const erSS  = empSS;

  // Medicare — 1.45% of every dollar.
  const empMed = Math.round(gross * MEDICARE_RATE);
  const erMed  = empMed;

  // Additional Medicare — 0.9% employee-only, above threshold (annualized check)
  const addlMedMonthly = annualSalary > ADDL_MED_THRESH[filing]
    ? Math.round(Math.max(0, gross - ADDL_MED_THRESH[filing] / 12) * ADDL_MEDICARE)
    : 0;

  // State tax
  const stateRate = STATE_TAX[emp.state] ?? 0;
  const stateTax = Math.round(gross * stateRate);

  // FUTA / SUTA — employer-only, monthly approx: annual liability / 12
  const futaAnnual = Math.min(annualSalary, FUTA_WAGE_BASE) * FUTA_RATE;
  const sutaDef = STATE_SUTA[emp.state] || { rate: 0.027, base: 7000 };
  const sutaAnnual = Math.min(annualSalary, sutaDef.base) * sutaDef.rate;
  const futa = Math.round(futaAnnual / 12);
  const suta = Math.round(sutaAnnual / 12);

  const netPay = gross - fedWH - empSS - empMed - addlMedMonthly - stateTax;
  const employerCost = gross + erSS + erMed + futa + suta;

  return {
    empId: emp.id,
    country: "US",
    currency: "USD",
    currencySymbol: "$",
    earnings: { gross, base: monthSalary - lopDeduction, bonus, reimburse: run.reimburse || 0, lopDeduction },
    deductions: {
      fedWH, empSS, erSS, empMed, erMed, addlMed: addlMedMonthly, stateTax, futa, suta,
      // Normalized aliases for the dashboard:
      employeePF: empSS + empMed + addlMedMonthly,   // "employee social insurance"
      employerPF: erSS + erMed + futa + suta,        // "employer social insurance + unemployment"
      tds: fedWH + stateTax,                          // "income-tax withholding (fed + state)"
      pt: 0,
      employeeESI: 0, employerESI: 0,
      gratuityAccrual: 0
    },
    netPay,
    employerCost,
    citations: [
      { label: "IRS Pub 15-T (2026)",     note: "TY 2026 federal brackets & std deduction (OBBBA adjustments)" },
      { label: "IRC §3101/3111",          note: "FICA SS 6.2% + Medicare 1.45%; 2025 SS wage base $176,100" },
      { label: "IRC §3101(b)(2)",         note: "Additional Medicare 0.9% on wages >$200k (employee only)" },
      { label: "FUTA §3301",              note: "0.6% effective after state credit; $7,000 base" },
      { label: "One Big Beautiful Bill Act", note: "SALT $40,400 · OT deduction $12,500 · Tips $25,000 · Senior $6,000" }
    ]
  };
}

export function runMonth(employees, runRows, opts = {}) {
  const empMap = Object.fromEntries(employees.map(e => [e.id, e]));
  const rows = runRows.map(r => {
    const emp = empMap[r.id];
    if (!emp) return null;
    return computeMonthly(emp, r, opts);
  }).filter(Boolean);

  const totals = rows.reduce((a, x) => {
    a.headcount += 1;
    a.gross += x.earnings.gross;
    a.employeePF += x.deductions.employeePF;
    a.employerPF += x.deductions.employerPF;
    a.employeeESI += x.deductions.employeeESI;
    a.employerESI += x.deductions.employerESI;
    a.pt += x.deductions.pt;
    a.tds += x.deductions.tds;
    a.gratuityAccrual += x.deductions.gratuityAccrual;
    a.netPay += x.netPay;
    a.employerCost += x.employerCost;
    return a;
  }, { headcount: 0, gross: 0, employeePF: 0, employerPF: 0, employeeESI: 0, employerESI: 0, pt: 0, tds: 0, gratuityAccrual: 0, netPay: 0, employerCost: 0 });

  return { rows, totals };
}
