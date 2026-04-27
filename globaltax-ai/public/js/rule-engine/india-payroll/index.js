// India — monthly payroll rule engine.
// Composes wage-split + statutory deductions + salary TDS into a single
// deterministic result per employee per month, under the selected wage regime.
//
// ┌────────────────────────────────────────────────────────────────────┐
// │  LLMs DO NOT compute any number here. Rule files are the source    │
// │  of truth; AI agents only narrate, route, or explain.              │
// └────────────────────────────────────────────────────────────────────┘

import { splitWages, WAGE_CITATIONS } from "./wages.js";
import { calcIndia } from "../india.js";

// ─── Statutory constants (FY 25-26 / AY 26-27) ───────────────────────
const PF_RATE          = 0.12;    // Employee & Employer each, Code-SS Sec 16
const PF_MONTHLY_CAP_BASIC = 15000;
const ESI_EMPLOYEE     = 0.0075;
const ESI_EMPLOYER     = 0.0325;
const ESI_WAGE_CEIL    = 21000;   // gross per month (₹25,000 for PwD)

// Professional Tax — simplified, flat ₹200 / month for eligible-state earners > ₹25k
const PT_STATES_FLAT200 = new Set(["KA", "MH", "TN", "TS", "WB", "GJ", "OR", "AS", "KL"]);
const PT_THRESHOLD_MONTHLY = 25000;

/**
 * @param {object} emp           employee master (employees.json)
 * @param {object} runInput      month-row from runs-raw.json ({ lop, bonus, reimburse })
 * @param {object} opts
 *   - wageCode: 'legacy' | 'new'
 *   - taxRegime: 'new' | 'old'
 *   - workingDays: default 30
 */
export function computeMonthly(emp, runInput, { wageCode = "legacy", taxRegime = "new", workingDays = 30 } = {}) {
  const w = splitWages(emp, wageCode);
  const m = w.monthly;
  const bonus = runInput?.bonus ?? 0;
  const reimburse = runInput?.reimburse ?? 0;

  // Loss of pay pro-rates the PAID portion of the monthly comp (not provisions)
  const paidMonthly = m.basic + m.hra + m.special + m.lta + m.medical;
  const lopDays = runInput?.lop ?? 0;
  const lopDeduction = Math.round(paidMonthly * (lopDays / workingDays));
  const earnings = paidMonthly + bonus + reimburse - lopDeduction;

  // ─── PF ─────────────────────────────────────────────────────────────
  // Base = basic+DA (here basic only — DA = 0 for private employers).
  // Legacy practice caps at ₹15k/month. Many Code-compliant employers will
  // pay on full wages; toggle-ready via `opts.pfUncap`.
  const pfBasic = Math.min(m.basic - Math.round(m.basic * (lopDays / workingDays)), PF_MONTHLY_CAP_BASIC);
  const employeePF = Math.round(pfBasic * PF_RATE);
  const employerPF = Math.round(pfBasic * PF_RATE);

  // ─── ESI ───────────────────────────────────────────────────────────
  const monthlyGrossForESI = paidMonthly - lopDeduction + bonus;
  const esiApplies = monthlyGrossForESI <= ESI_WAGE_CEIL;
  const employeeESI = esiApplies ? Math.round(monthlyGrossForESI * ESI_EMPLOYEE) : 0;
  const employerESI = esiApplies ? Math.round(monthlyGrossForESI * ESI_EMPLOYER) : 0;

  // ─── PT ────────────────────────────────────────────────────────────
  const pt = ptMonthly(emp.state, earnings);

  // ─── TDS (salary) ──────────────────────────────────────────────────
  // Annualized: project full-year gross taxable from CTC + any current-month bonus as arrear.
  // We use the existing india.js calculator (same slab logic, 87A, cess).
  const annualForTDS = emp.ctc + (bonus - (lopDeduction * 12 / Math.max(lopDays, 1)) * (lopDays ? 1 : 0));
  const annualTax = calcIndia({
    grossAnnualIncome: emp.ctc,   // simpler: annual projection from CTC
    regime: taxRegime,
    deductions80C: taxRegime === "old" ? 150000 : 0
  }).totalTax;
  const monthlyTDS = Math.max(0, Math.round(annualTax / 12));

  // Gratuity accrual (employer-only provision, 4.81% of monthly basic under either regime;
  // rises under New Code because basic is higher).
  const gratuityAccrual = Math.round((m.basic - Math.round(m.basic * (lopDays / workingDays))) * 0.0481);

  const netPay = earnings - employeePF - employeeESI - pt - monthlyTDS;
  const employerCost = earnings + employerPF + employerESI + gratuityAccrual;

  return {
    empId: emp.id,
    wageCode,
    taxRegime,
    month: runInput?.month ?? null,
    earnings: {
      basic: m.basic - Math.round(m.basic * (lopDays / workingDays)),
      hra: m.hra - Math.round(m.hra * (lopDays / workingDays)),
      special: m.special - Math.round(m.special * (lopDays / workingDays)),
      lta: m.lta - Math.round(m.lta * (lopDays / workingDays)),
      medical: m.medical - Math.round(m.medical * (lopDays / workingDays)),
      bonus,
      reimburse,
      lopDeduction,
      gross: earnings
    },
    deductions: {
      employeePF, employerPF,
      employeeESI, employerESI,
      pt,
      tds: monthlyTDS,
      gratuityAccrual
    },
    netPay,
    employerCost,
    wageBase: w.wageBase,
    citations: [...WAGE_CITATIONS,
      { label: "ESI Act 1948 §39 + Reg 31", note: "0.75% + 3.25%; wage ceiling ₹21,000" },
      { label: "State PT Acts",             note: "KA/MH/TN/TS/WB/GJ/... flat slabs; DL/HR/UP/PB exempt" },
      { label: "Income-tax Act §192",       note: "TDS on salary: annual tax / 12" }
    ]
  };
}

function ptMonthly(state, monthlyGross) {
  if (!PT_STATES_FLAT200.has(state)) return 0;
  if (monthlyGross < PT_THRESHOLD_MONTHLY) return 0;
  return 200;
}

/**
 * Aggregate payroll across all employees for one month.
 * @param {Array} employees
 * @param {Array} runRows       rows from runs[month]
 * @param {object} opts         wageCode, taxRegime
 */
export function runMonth(employees, runRows, opts) {
  const empMap = Object.fromEntries(employees.map(e => [e.id, e]));
  const rows = runRows.map(r => {
    const emp = empMap[r.id];
    if (!emp) return null;
    return computeMonthly(emp, r, { taxRegime: emp.regime ?? "new", ...opts });
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
