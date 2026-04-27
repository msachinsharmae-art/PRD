// Calculators Hub
// Country-aware deterministic calculators. No LLM involvement.

import { calcIndia } from "/js/rule-engine/india.js";
import { splitWages } from "/js/rule-engine/india-payroll/wages.js";
import { computeMonthly as usComputeMonthly } from "/js/rule-engine/us-payroll/index.js";
import { computeMonthly as aeComputeMonthly } from "/js/rule-engine/uae-payroll/index.js";
import { computeMonthly as saComputeMonthly } from "/js/rule-engine/ksa-payroll/index.js";
import { computeMonthly as egComputeMonthly } from "/js/rule-engine/egypt-payroll/index.js";

const FMTRS = {
  IN: new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }),
  US: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }),
  AE: new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED", maximumFractionDigits: 0 }),
  SA: new Intl.NumberFormat("en-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 0 }),
  EG: new Intl.NumberFormat("en-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 })
};
const fmt = (n, country = "IN") => FMTRS[country].format(Math.round(n || 0));

// ─── Calculator definitions ─────────────────────────────────────────
const CALCS = [
  // ─────────────────────────────────────────
  {
    id: "net_pay",
    title: "Net Pay (take-home)",
    subtitle: "Annual CTC → monthly net in hand",
    fields: [
      { id: "ctc", label: "Annual CTC (₹)", type: "number", default: 1800000 },
      { id: "state", label: "State", type: "select", options: [
        { v: "KA", t: "Karnataka" }, { v: "MH", t: "Maharashtra" }, { v: "TN", t: "Tamil Nadu" },
        { v: "DL", t: "Delhi (no PT)" }, { v: "HR", t: "Haryana (no PT)" }, { v: "TS", t: "Telangana" },
        { v: "WB", t: "West Bengal" }, { v: "GJ", t: "Gujarat" }, { v: "UP", t: "Uttar Pradesh (no PT)" }
      ], default: "KA" },
      { id: "metro", label: "Metro city?", type: "select", options: [
        { v: "true", t: "Yes (HRA 50% of basic)" }, { v: "false", t: "No (HRA 40%)" }
      ], default: "true" },
      { id: "regime", label: "Tax regime", type: "select", options: [
        { v: "new", t: "New regime (default, FY 25-26)" }, { v: "old", t: "Old regime (with 80C)" }
      ], default: "new" }
    ],
    regimeToggle: { legacy: "Legacy (Basic 40% of CTC)", new: "New Code (Basic ≥50% of CTC)" },
    compute: ({ ctc, state, metro, regime, wageCode }) => {
      const split = splitWages({ ctc: +ctc, metro: metro === "true" }, wageCode);
      const monthly = split.monthly;
      const paidMonthly = monthly.basic + monthly.hra + monthly.special + monthly.lta + monthly.medical;
      const pfBase = Math.min(monthly.basic, 15000);
      const employeePF = Math.round(pfBase * 0.12);
      const employerPF = employeePF;
      // ESI: only if monthly gross ≤ 21000
      const esiApplies = paidMonthly <= 21000;
      const employeeESI = esiApplies ? Math.round(paidMonthly * 0.0075) : 0;
      const employerESI = esiApplies ? Math.round(paidMonthly * 0.0325) : 0;
      // PT: flat 200 for eligible states if gross > 25k
      const ptStates = new Set(["KA","MH","TN","TS","WB","GJ","KL"]);
      const pt = (ptStates.has(state) && paidMonthly > 25000) ? 200 : 0;
      // TDS: annualized via calcIndia / 12
      const tdsAnnual = calcIndia({ grossAnnualIncome: +ctc, regime, deductions80C: regime === "old" ? 150000 : 0 }).totalTax;
      const monthlyTDS = Math.round(tdsAnnual / 12);

      const net = paidMonthly - employeePF - employeeESI - pt - monthlyTDS;
      return {
        output: [
          { label: "Monthly Basic",      value: monthly.basic },
          { label: "Monthly HRA",        value: monthly.hra },
          { label: "Special Allowance",  value: monthly.special },
          { label: "LTA",                value: monthly.lta },
          { label: "Medical reimb.",     value: monthly.medical },
          { label: "Paid (gross)",       value: paidMonthly, bold: true },
          { label: "− Employee PF (12%)", value: -employeePF },
          { label: "− Employee ESI",     value: -employeeESI, muted: !esiApplies ? "N/A (gross > ₹21k)" : "" },
          { label: "− Professional Tax", value: -pt,        muted: ptStates.has(state) ? "" : state + " exempt" },
          { label: "− TDS on salary",    value: -monthlyTDS },
          { label: "NET PAY (monthly)",  value: net, total: true }
        ],
        formula: [
          ["Basic", wageCode === "legacy" ? `40% × CTC = 40% × ₹${(+ctc).toLocaleString('en-IN')}` : `50% × CTC (Code on Wages §2(y))`],
          ["HRA",   metro === "true" ? `50% × Basic` : `40% × Basic`],
          ["PF",    `12% × min(Basic, ₹15,000) = ${fmt(employeePF)} (EPF Scheme Para 26A cap)`],
          ["ESI",   esiApplies ? `0.75% × Gross (applies because gross ≤ ₹21,000)` : `Not applicable — gross > ₹21,000`],
          ["PT",    ptStates.has(state) ? (paidMonthly > 25000 ? `Flat ₹200/mo for ${state} above ₹25k gross` : "₹0 (below slab)") : `No PT in ${state}`],
          ["TDS",   `Annual tax / 12 = ${fmt(tdsAnnual)} / 12 = ${fmt(monthlyTDS)}`],
          ["NET",   `Gross − PF − ESI − PT − TDS = ${fmt(net)}`]
        ],
        cite: "Finance Act 2025 slabs · EPF Scheme 1952 · ESI Act 1948 · State PT Acts · Income-tax Act §192"
      };
    }
  },

  // ─────────────────────────────────────────
  {
    id: "pf",
    title: "Provident Fund (EPF + EPS)",
    subtitle: "12% employee + 12% employer split into EPS (8.33%) + EPF (3.67%)",
    fields: [
      { id: "basic", label: "Monthly Basic + DA (₹)", type: "number", default: 50000 },
      { id: "uncap", label: "PF on full wages?", type: "select", options: [
        { v: "false", t: "No — cap at ₹15,000 basic (standard)" },
        { v: "true", t: "Yes — pay PF on full basic (uncapped)" }
      ], default: "false" }
    ],
    regimeToggle: { legacy: "Pre-Code practice", new: "New Labour Codes" },
    compute: ({ basic, uncap, wageCode }) => {
      const uncapped = uncap === "true";
      const pfBase = uncapped ? +basic : Math.min(+basic, 15000);
      const empPF = Math.round(pfBase * 0.12);
      const epsBase = Math.min(pfBase, 15000);
      const employerEPS = Math.round(epsBase * 0.0833);
      const employerEPF = Math.round(pfBase * 0.12) - employerEPS;
      const totalMonthly = empPF + Math.round(pfBase * 0.12);
      const annualEmployee = empPF * 12;
      const annualTotal = totalMonthly * 12;

      return {
        output: [
          { label: "PF base (wages)",    value: pfBase },
          { label: "Employee PF (12%)",  value: empPF },
          { label: "Employer contribution (12%)", value: Math.round(pfBase * 0.12) },
          { label: "  └ split: EPS (8.33% of min(base,₹15k))", value: employerEPS, muted: "pension fund — capped" },
          { label: "  └ split: EPF balance",                    value: employerEPF },
          { label: "Monthly total (both sides)", value: totalMonthly, bold: true },
          { label: "Annual contribution (both)", value: annualTotal },
          { label: "Employee annual PF",         value: annualEmployee, total: true }
        ],
        formula: [
          ["Base",         uncapped ? `Full basic = ₹${(+basic).toLocaleString('en-IN')}` : `min(Basic, ₹15,000) = ${fmt(pfBase)}`],
          ["Employee",     `12% × ${fmt(pfBase)} = ${fmt(empPF)}`],
          ["Employer EPS", `8.33% × min(Base, ₹15,000) = ${fmt(employerEPS)} (pension; capped)`],
          ["Employer EPF", `Remainder = ${fmt(employerEPF)}`],
          ["Total annual", `${fmt(totalMonthly)} × 12 = ${fmt(annualTotal)}`]
        ],
        explain: [
          "Both sides contribute 12% of wages — most companies cap at ₹15,000 monthly basic (EPF Scheme 1952, Para 26A).",
          "Employer 12% is split: 8.33% to Employee Pension Scheme (EPS, capped at ₹1,250/mo on ₹15k basic) + 3.67% to EPF account.",
          "Under the new Code on Social Security 2020, PF continues on 'wages' as newly defined — which forces basic ≥ 50% of CTC. For most employees with basic already > ₹15k/mo, no change unless employer opts to uncap.",
          "International Workers: uncapped contributions are mandatory."
        ],
        cite: "EPF & MP Act 1952 · EPF Scheme 1952 Para 26A · Code on Social Security 2020 §16"
      };
    }
  },

  // ─────────────────────────────────────────
  {
    id: "esi",
    title: "Employees' State Insurance (ESI)",
    subtitle: "Applies only when monthly gross ≤ ₹21,000 (₹25,000 for PwD)",
    fields: [
      { id: "gross", label: "Monthly gross (₹)", type: "number", default: 18000 },
      { id: "pwd", label: "Person with Disability?", type: "select", options: [
        { v: "false", t: "No (ceiling ₹21,000)" }, { v: "true", t: "Yes (ceiling ₹25,000)" }
      ], default: "false" }
    ],
    compute: ({ gross, pwd }) => {
      const ceiling = pwd === "true" ? 25000 : 21000;
      const applies = +gross <= ceiling;
      const empESI = applies ? Math.round(+gross * 0.0075) : 0;
      const erESI  = applies ? Math.round(+gross * 0.0325) : 0;
      return {
        output: [
          { label: "Applicability ceiling", value: ceiling },
          { label: "Applies?", value: applies ? "YES" : "NO — gross exceeds ceiling" },
          { label: "Employee share (0.75%)", value: empESI },
          { label: "Employer share (3.25%)", value: erESI },
          { label: "Total ESI contribution", value: empESI + erESI, total: true }
        ],
        formula: [
          ["Check", `Gross ₹${(+gross).toLocaleString('en-IN')} ${applies ? "≤" : ">"} ₹${ceiling.toLocaleString('en-IN')} → ESI ${applies ? "applies" : "does NOT apply"}`],
          applies ? ["Employee", `0.75% × ₹${(+gross).toLocaleString('en-IN')} = ${fmt(empESI)}`] : null,
          applies ? ["Employer", `3.25% × ₹${(+gross).toLocaleString('en-IN')} = ${fmt(erESI)}`] : null
        ].filter(Boolean),
        explain: [
          "ESI covers medical, sickness, maternity, disablement, and dependents' benefits.",
          "Contribution periods are Apr-Sep and Oct-Mar. An employee crossing ceiling mid-period continues contributing till end of that period.",
          "Code on Social Security 2020 retains ₹21,000 ceiling but extends ESI to all districts and to establishments with <10 employees in hazardous industries."
        ],
        cite: "ESI Act 1948 §39 · Code on Social Security 2020 Ch IV"
      };
    }
  },

  // ─────────────────────────────────────────
  {
    id: "gratuity",
    title: "Gratuity (Payment of Gratuity Act)",
    subtitle: "15 days' last-drawn wages × years of service ÷ 26",
    fields: [
      { id: "basic", label: "Last drawn Basic + DA (₹/month)", type: "number", default: 60000 },
      { id: "years", label: "Years of continuous service", type: "number", default: 8, step: 0.5 },
      { id: "type", label: "Employee type", type: "select", options: [
        { v: "regular", t: "Regular (≥5 years required)" },
        { v: "fte", t: "Fixed-Term (1+ year under new Code on SS)" }
      ], default: "regular" }
    ],
    compute: ({ basic, years, type }) => {
      const eligible = type === "fte" ? +years >= 1 : +years >= 5;
      const cap = 2000000;
      const raw = (15 * +basic * +years) / 26;
      const payable = eligible ? Math.min(raw, cap) : 0;
      return {
        output: [
          { label: "Eligibility",               value: eligible ? "Eligible" : "NOT eligible", muted: eligible ? "" : type === "fte" ? "FTE needs 1 year" : "regular needs 5 years" },
          { label: "Last drawn basic",          value: +basic },
          { label: "Years",                     value: +years },
          { label: "Formula output",            value: Math.round(raw) },
          { label: "Statutory cap",             value: cap, muted: "Income-tax exempt up to this" },
          { label: "Gratuity payable",          value: payable, total: true }
        ],
        formula: [
          ["Formula", `(15 × ${fmt(+basic)} × ${+years}) ÷ 26 = ${fmt(raw)}`],
          ["Cap",     `₹20,00,000 under §4(3) of Payment of Gratuity Act (raised from ₹10L in 2018)`],
          ["Tax",     `Income-tax Act §10(10) — exempt up to ₹20L lifetime across employers`],
          ["Payable", `${fmt(payable)}`]
        ],
        explain: [
          "Gratuity is payable on termination after 5 continuous years (regular) OR 1 year (Fixed-Term Employees under Code on Social Security 2020 §53(2)).",
          "Formula = 15/26 × Last drawn wages × Years of service. The '26' represents working days per month.",
          "Wages under new Labour Code = basic + DA (excludes allowances). Since basic must be ≥50% of CTC under Code on Wages §2(y), gratuity accrual rises materially for salaries currently structured with low basic.",
          "Tax exemption u/s 10(10) is ₹20 lakh lifetime across all employers combined."
        ],
        cite: "Payment of Gratuity Act 1972 §4 · Code on Social Security 2020 §53 · Income-tax Act §10(10)"
      };
    }
  },

  // ─────────────────────────────────────────
  {
    id: "hra",
    title: "HRA Exemption (§10(13A))",
    subtitle: "Least of 3: actual HRA, 50/40% of basic, rent − 10% of basic",
    fields: [
      { id: "basic", label: "Annual Basic + DA (₹)", type: "number", default: 720000 },
      { id: "hra", label: "Annual HRA received (₹)", type: "number", default: 288000 },
      { id: "rent", label: "Annual rent paid (₹)", type: "number", default: 360000 },
      { id: "tier", label: "City tier", type: "select", options: [
        { v: "metro", t: "Metro (Mumbai/Delhi/Kolkata/Chennai + Bengaluru/Hyderabad/Pune/Ahmedabad from FY26-27) — 50%" },
        { v: "nonmetro", t: "Non-metro — 40%" }
      ], default: "metro" }
    ],
    compute: ({ basic, hra, rent, tier }) => {
      const a = +hra;
      const b = +basic * (tier === "metro" ? 0.50 : 0.40);
      const c = Math.max(0, +rent - +basic * 0.10);
      const exempt = Math.min(a, b, c);
      const taxable = Math.max(0, +hra - exempt);
      return {
        output: [
          { label: "(a) Actual HRA received", value: a },
          { label: `(b) ${tier === "metro" ? "50" : "40"}% of Basic`, value: b },
          { label: "(c) Rent − 10% of Basic", value: c },
          { label: "HRA EXEMPT (least of a/b/c)", value: exempt, bold: true },
          { label: "HRA taxable", value: taxable, total: true }
        ],
        formula: [
          ["a", `Actual HRA = ${fmt(a)}`],
          ["b", `${tier === "metro" ? "50" : "40"}% × Basic = ${fmt(b)}`],
          ["c", `Rent − 10% Basic = ${fmt(+rent)} − ${fmt(+basic * 0.1)} = ${fmt(c)}`],
          ["Exempt", `min(a, b, c) = ${fmt(exempt)}`],
          ["Taxable", `HRA − Exempt = ${fmt(taxable)}`]
        ],
        explain: [
          "Available only under the OLD tax regime. New regime has no HRA exemption.",
          "Budget 2025 (for FY 2026-27) added Bengaluru, Hyderabad, Pune, Ahmedabad to the 50% metro tier, joining Mumbai, Delhi, Kolkata, Chennai.",
          "Rent receipts + landlord PAN (Form 124 / 12BB) required if annual rent > ₹1 lakh."
        ],
        cite: "Income-tax Act §10(13A) · Rule 2A · Budget 2025 metro expansion"
      };
    }
  },

  // ─────────────────────────────────────────
  {
    id: "tds",
    title: "TDS on Salary (§192)",
    subtitle: "Projected annual tax ÷ 12, with slab breakdown",
    fields: [
      { id: "ctc", label: "Annual CTC / salary (₹)", type: "number", default: 2400000 },
      { id: "regime", label: "Regime", type: "select", options: [
        { v: "new", t: "New (default — FY 25-26 slabs)" }, { v: "old", t: "Old (with 80C/80D)" }
      ], default: "new" },
      { id: "ded80c", label: "80C deductions (only old regime, ₹)", type: "number", default: 150000 }
    ],
    compute: ({ ctc, regime, ded80c }) => {
      const res = calcIndia({ grossAnnualIncome: +ctc, regime, deductions80C: regime === "old" ? +ded80c : 0 });
      return {
        output: [
          { label: "Taxable income",       value: res.taxableIncome, muted: regime === "new" ? "after ₹75k std ded" : `after ${fmt(50000 + (regime === "old" ? Math.min(+ded80c, 150000) : 0))} deductions` },
          { label: "Slab tax",              value: res.totalTax - res.cess - res.surcharge },
          { label: "Surcharge",             value: res.surcharge, muted: res.surcharge ? "high-income" : "not applicable" },
          { label: "Cess 4%",               value: res.cess },
          { label: "87A rebate",            value: -res.rebate87A, muted: res.rebate87A ? "full rebate up to taxable ₹12L (new)" : "" },
          { label: "ANNUAL TOTAL TAX",      value: res.totalTax, bold: true },
          { label: "Monthly TDS",           value: Math.round(res.totalTax / 12), total: true }
        ],
        formula: [
          ["Slabs", regime === "new" ? "0/5/10/15/20/25/30% at 4L/8L/12L/16L/20L/24L" : "0/5/20/30% at 2.5L/5L/10L (individuals < 60)"],
          ["87A",   "Full tax rebate if taxable ≤ ₹12L (new) / ₹5L (old)"],
          ["Cess",  "4% × (tax + surcharge)"],
          ["Monthly", `Annual tax ÷ 12 = ${fmt(Math.round(res.totalTax / 12))}`]
        ],
        explain: [
          "Under §192 of the Income-tax Act, employers deduct TDS every month based on projected annual income.",
          "For FY 26-27, Budget 2025 expanded 87A rebate: new regime income up to ₹12L is fully exempt, with marginal relief above.",
          "Standard deduction: ₹75,000 (new regime) / ₹50,000 (old regime)."
        ],
        cite: "Income-tax Act §192, §87A · Finance Act 2025 · Budget 2025 announcements"
      };
    }
  },

  // ─────────────────────────────────────────
  {
    id: "hourly_payroll",
    title: "Hourly Payroll",
    subtitle: "Regular + overtime + shift differential — FLSA / CA rules compatible",
    fields: [
      { id: "rate", label: "Hourly rate (per hour)", type: "number", default: 25 },
      { id: "hours", label: "Regular hours worked in period", type: "number", default: 80, step: 0.5 },
      { id: "ot_hours", label: "Overtime hours (1.5×)", type: "number", default: 5, step: 0.5 },
      { id: "dt_hours", label: "Double-time hours (2×, CA only)", type: "number", default: 0, step: 0.5 },
      { id: "bonus", label: "Non-discretionary bonus in period", type: "number", default: 0 },
      { id: "frequency", label: "Pay frequency", type: "select", options: [
        { v: "weekly", t: "Weekly (52 periods/yr)" },
        { v: "biweekly", t: "Bi-weekly (26 periods/yr)" },
        { v: "semimonthly", t: "Semi-monthly (24 periods/yr)" },
        { v: "monthly", t: "Monthly (12 periods/yr)" }
      ], default: "biweekly" },
      { id: "rule_set", label: "Rule set", type: "select", options: [
        { v: "flsa", t: "US FLSA (1.5× over 40 hrs/wk)" },
        { v: "ca", t: "California (1.5× >8hr/day, 2× >12hr/day)" },
        { v: "in", t: "India Factories Act (2× for overtime)" }
      ], default: "flsa" }
    ],
    compute: ({ rate, hours, ot_hours, dt_hours, bonus, frequency, rule_set }) => {
      const h = +hours, oh = +ot_hours, dh = +dt_hours, b = +bonus, r = +rate;
      // Alvarado-style regular rate: base rate + non-discretionary bonus prorated over non-OT hours
      const regRate = h > 0 ? r + (b / h) : r;
      const otMult = rule_set === "in" ? 2 : 1.5;
      const regular = r * h;
      const ot = regRate * otMult * oh;
      const dt = regRate * 2 * dh;
      const gross = regular + ot + dt + b;
      return {
        output: [
          { label: "Regular pay", value: Math.round(regular) },
          { label: "Overtime pay (" + (otMult === 2 ? "2×" : "1.5×") + ")", value: Math.round(ot), muted: "Regular rate × " + otMult + " × OT hours" },
          { label: "Double-time pay (2×)", value: Math.round(dt), muted: rule_set === "ca" && dh > 0 ? "CA only: >12hr/day or >8hr on 7th day" : rule_set !== "ca" ? "Not applicable outside CA" : "—" },
          { label: "Non-discretionary bonus", value: Math.round(b) },
          { label: "Effective regular rate", value: Math.round(regRate * 100) / 100, muted: "Base + bonus÷hours (Alvarado method)", bold: true },
          { label: "GROSS PAY (period)",     value: Math.round(gross), total: true }
        ],
        formula: [
          ["Regular", `$${r}/hr × ${h} hrs = $${Math.round(regular)}`],
          ["Reg rate", `(Base + Bonus ÷ NonOT hours) = (${r} + ${b}÷${h}) = $${regRate.toFixed(2)}/hr`],
          ["OT", `$${regRate.toFixed(2)} × ${otMult} × ${oh} hrs = $${Math.round(ot)}`],
          rule_set === "ca" && dh > 0 ? ["DT", `$${regRate.toFixed(2)} × 2 × ${dh} hrs = $${Math.round(dt)}`] : null,
          ["Frequency", frequency === "weekly" ? "52 periods/year" : frequency === "biweekly" ? "26 periods/year" : frequency === "semimonthly" ? "24 periods/year" : "12 periods/year"],
          ["Gross",   `Regular + OT + DT + Bonus = $${Math.round(gross)}`]
        ].filter(Boolean),
        explain: [
          "FLSA requires overtime at 1.5× the regular rate for hours over 40/week. California adds stricter rules: 1.5× over 8 hrs/day, 2× over 12 hrs/day, and 1.5× for first 8 hrs on 7th consecutive workday (2× thereafter).",
          "Non-discretionary bonuses (production, attendance, shift-differential) must be included in the 'regular rate' when computing OT — this is the Alvarado v. Dart Container rule for flat-sum bonuses in California.",
          "India (Factories Act / OSH Code 2020) mandates 2× the ordinary wage for overtime; quarterly cap raised to 125 hours under OSH Code.",
          "This calculator is period-level. For year-end taxes, feed the gross into the Net Pay or TDS calculators."
        ],
        cite: "FLSA 29 USC §207 · CA Labor Code §510 · India OSH Code 2020 §27 · Alvarado v. Dart Container (2018)"
      };
    }
  },

  // ─────────────────────────────────────────
  {
    id: "leave_enc",
    title: "Leave Encashment",
    subtitle: "Per Code on Wages / OSH Code + §10(10AA) tax",
    fields: [
      { id: "basic", label: "Last drawn Basic + DA (₹/month)", type: "number", default: 50000 },
      { id: "days", label: "Leave balance (days)", type: "number", default: 45 },
      { id: "during", label: "When?", type: "select", options: [
        { v: "exit", t: "At retirement / termination" }, { v: "service", t: "During service" }
      ], default: "exit" }
    ],
    compute: ({ basic, days, during }) => {
      const perDay = +basic / 30;
      const amount = Math.round(perDay * +days);
      const exemptCap = 2500000;
      const taxable = during === "exit"
        ? Math.max(0, amount - Math.min(amount, exemptCap))
        : amount; // during service: fully taxable
      const exempt = amount - taxable;
      return {
        output: [
          { label: "Per-day rate",                  value: Math.round(perDay) },
          { label: "Days being encashed",            value: +days },
          { label: "Gross encashment",               value: amount, bold: true },
          { label: "Tax exemption u/s 10(10AA)",     value: exempt, muted: during === "exit" ? "cap ₹25L lifetime" : "no exemption during service" },
          { label: "Taxable",                        value: taxable, total: true }
        ],
        formula: [
          ["Per day", `Basic ÷ 30 = ${fmt(Math.round(perDay))}`],
          ["Amount",  `${fmt(Math.round(perDay))} × ${+days} days = ${fmt(amount)}`],
          ["Exempt",  during === "exit" ? `min(amount, ₹25L) = ${fmt(exempt)}` : `₹0 — encashment during service is fully taxable`]
        ],
        explain: [
          "OSH Code 2020 §32 allows accrual of 1 leave for every 20 days worked after 180 days continuous service (previously 240 days under Factories Act).",
          "Carry-forward is capped at 30 days — any excess must be encashed at year-end.",
          "Income-tax exemption §10(10AA) — ₹25 lakh lifetime across employers for non-government employees (raised in 2023 from ₹3L)."
        ],
        cite: "OSH Code 2020 §32 · Income-tax Act §10(10AA) · Notification 2023"
      };
    }
  },

  // ═════════════════════════════════════════════════════════════════
  // 🇺🇸 UNITED STATES
  // ═════════════════════════════════════════════════════════════════
  {
    id: "us_net_pay", country: "US",
    title: "Net Pay (US, TY 2026)",
    subtitle: "W-4 (2020+) · OBBBA · Federal + FICA + State withholding",
    fields: [
      { id: "salary", label: "Annual gross salary ($)", type: "number", default: 95000 },
      { id: "filing", label: "W-4 Step 1: Filing status", type: "select", options: [
        { v: "single", t: "Single" }, { v: "marriedJoint", t: "Married Filing Jointly" }, { v: "hoh", t: "Head of Household" }
      ], default: "single" },
      { id: "state", label: "Work state", type: "select", options: [
        { v: "CA", t: "California (1-13.3% progressive + SDI)" },
        { v: "NY", t: "New York (4-10.9%)" },
        { v: "TX", t: "Texas (no state income tax)" },
        { v: "FL", t: "Florida (no state income tax)" },
        { v: "WA", t: "Washington (no income tax + 0.92% PFML)" },
        { v: "IN", t: "Indiana (2.9% flat + county)" }
      ], default: "CA" },
      { id: "k401_pct", label: "401(k) pre-tax contribution %", type: "number", default: 6, step: 0.5 },
      { id: "monthly_premium", label: "§125 health premium ($/month)", type: "number", default: 200 }
    ],
    compute: ({ salary, filing, state, k401_pct, monthly_premium }) => {
      const monthlySalary = +salary / 12;
      const k401Annual = +salary * (+k401_pct / 100);
      const k401Monthly = k401Annual / 12;
      const premiumMonthly = +monthly_premium;
      const r = usComputeMonthly(
        { id: "demo", salary: +salary, state, filing },
        { lop: 0, bonus: 0, reimburse: 0 },
        {}
      );
      // Adjust net for 401(k) and pre-tax health
      const netAfterPretax = r.netPay - k401Monthly - premiumMonthly;
      return {
        output: [
          { label: "Monthly gross salary",   value: Math.round(monthlySalary) },
          { label: "− 401(k) (pre-tax)",     value: -Math.round(k401Monthly), muted: `${k401_pct}% of salary` },
          { label: "− §125 health premium",  value: -premiumMonthly },
          { label: "− Federal income tax",   value: -r.deductions.fedWH, muted: "IRS Pub 15-T percentage method" },
          { label: "− FICA Social Security", value: -r.deductions.empSS, muted: "6.2% up to wage base $176,100" },
          { label: "− FICA Medicare",        value: -r.deductions.empMed, muted: "1.45% no cap" },
          { label: "− Additional Medicare",  value: -r.deductions.addlMed, muted: salary > 200000 ? "0.9% on excess >$200k" : "n/a" },
          { label: "− State income tax",     value: -r.deductions.stateTax },
          { label: "Net take-home (monthly)", value: Math.round(netAfterPretax), total: true }
        ],
        formula: [
          ["Annualize",   `Annual gross = $${(+salary).toLocaleString("en")}`],
          ["Std deduct",  filing === "marriedJoint" ? "$32,200" : filing === "hoh" ? "$24,150" : "$16,100"],
          ["FIT method",  "Annualize → subtract pre-tax + std deduction → apply 2026 brackets → divide by 12"],
          ["FICA",        "6.2% SS up to $176,100/yr · 1.45% Medicare unlimited"],
          ["State",       state === "TX" || state === "FL" || state === "WA" ? "0% — no state income tax" : "Per state percentage method"]
        ],
        explain: [
          "TY 2026 federal brackets: 10/12/22/24/32/35/37%. Std deduction Single $16,100 / MFJ $32,200 / HOH $24,150.",
          "OBBBA additions for 2026: SALT cap $40,400, senior bonus deduction up to $6,000, optional OT/tips/car-loan deductions on personal return.",
          "401(k) reduces FIT taxable wages but NOT FICA-taxable wages. §125 health premium reduces both.",
          "Additional Medicare 0.9% kicks in for employee-only on wages over $200,000 (employer threshold; employee adjusts on personal return)."
        ],
        cite: "IRS Pub 15-T 2026 · IRC §3101/3111/3402 · OBBBA 2026 provisions"
      };
    }
  },
  {
    id: "us_fica", country: "US",
    title: "FICA — Social Security + Medicare",
    subtitle: "Period-level; tracks YTD SS wage base",
    fields: [
      { id: "gross", label: "Gross wages this period ($)", type: "number", default: 5000 },
      { id: "ytd", label: "YTD SS-taxable wages so far ($)", type: "number", default: 50000 },
      { id: "filing", label: "Filing status (for Add'l Medicare)", type: "select", options: [
        { v: "single", t: "Single (threshold $200k)" }, { v: "marriedJoint", t: "MFJ (threshold $250k)" }, { v: "mfs", t: "MFS (threshold $125k)" }
      ], default: "single" }
    ],
    compute: ({ gross, ytd, filing }) => {
      const SS_BASE = 176100;
      const remaining = Math.max(0, SS_BASE - +ytd);
      const ssTaxable = Math.min(+gross, remaining);
      const empSS = ssTaxable * 0.062;
      const erSS  = empSS;
      const empMed = +gross * 0.0145;
      const erMed  = empMed;
      const addlThresh = filing === "marriedJoint" ? 250000 : filing === "mfs" ? 125000 : 200000;
      const ytdAfter = +ytd + +gross;
      const addlMed = ytdAfter > addlThresh ? Math.max(0, ytdAfter - Math.max(addlThresh, +ytd)) * 0.009 : 0;
      return {
        output: [
          { label: "SS-taxable this period",     value: Math.round(ssTaxable), muted: ssTaxable < +gross ? "Capped at remaining wage base" : "Below wage base" },
          { label: "Employee SS (6.2%)",         value: Math.round(empSS) },
          { label: "Employer SS (6.2%)",         value: Math.round(erSS), muted: "Matched, employer cost" },
          { label: "Employee Medicare (1.45%)",  value: Math.round(empMed) },
          { label: "Employer Medicare (1.45%)",  value: Math.round(erMed) },
          { label: "Additional Medicare (0.9%)", value: Math.round(addlMed), muted: addlMed > 0 ? `>$${addlThresh.toLocaleString("en")} threshold` : "Not yet over threshold" },
          { label: "Total employee FICA",        value: Math.round(empSS + empMed + addlMed), total: true },
          { label: "Total employer FICA",        value: Math.round(erSS + erMed) }
        ],
        formula: [
          ["SS",       `min($${(+gross).toLocaleString("en")}, $${SS_BASE.toLocaleString("en")} − YTD $${(+ytd).toLocaleString("en")}) × 6.2% = $${Math.round(empSS).toLocaleString("en")}`],
          ["Medicare", `$${(+gross).toLocaleString("en")} × 1.45% = $${Math.round(empMed).toLocaleString("en")}`],
          ["Add'l",    addlMed > 0 ? `(YTD $${ytdAfter.toLocaleString("en")} − $${addlThresh.toLocaleString("en")}) × 0.9% = $${Math.round(addlMed).toLocaleString("en")}` : `YTD below $${addlThresh.toLocaleString("en")} → no Add'l Medicare`]
        ],
        cite: "IRC §3101 · §3111 · 2025 SS wage base $176,100 (2026 TBD by SSA)"
      };
    }
  },
  {
    id: "us_futa", country: "US",
    title: "FUTA — Federal Unemployment Tax",
    subtitle: "Employer-only · 0.6% net rate · first $7,000",
    fields: [
      { id: "ytd_wages", label: "YTD FUTA wages this employee ($)", type: "number", default: 4500 },
      { id: "current_pay", label: "Current period gross ($)", type: "number", default: 1500 }
    ],
    compute: ({ ytd_wages, current_pay }) => {
      const cap = 7000;
      const remaining = Math.max(0, cap - +ytd_wages);
      const taxable = Math.min(+current_pay, remaining);
      const futa = taxable * 0.006;
      const yearMax = cap * 0.006;
      return {
        output: [
          { label: "FUTA wage base",       value: cap },
          { label: "YTD FUTA wages",       value: +ytd_wages },
          { label: "Remaining base",       value: remaining },
          { label: "Taxable this period",  value: Math.round(taxable) },
          { label: "FUTA tax (0.6%)",      value: Math.round(futa), bold: true },
          { label: "Max FUTA per employee/yr", value: yearMax, muted: "$7,000 × 0.6% = $42 cap" }
        ],
        formula: [
          ["Cap",   `min($${(+current_pay).toLocaleString("en")}, $${cap} − YTD $${(+ytd_wages).toLocaleString("en")}) = $${Math.round(taxable).toLocaleString("en")}`],
          ["Tax",   `Taxable × 0.6% = $${Math.round(futa).toLocaleString("en")}`]
        ],
        explain: [
          "FUTA is employer-only — never deducted from employee wages.",
          "Gross 6.0% rate becomes 0.6% net after the maximum 5.4% state credit, applicable when SUTA is paid on time.",
          "Credit-reduction states (those with outstanding federal UI loans) have lower credit and higher effective FUTA — check IRS announcements annually."
        ],
        cite: "IRC §3301 · IRS Form 940"
      };
    }
  },

  // ═════════════════════════════════════════════════════════════════
  // 🇦🇪 UAE
  // ═════════════════════════════════════════════════════════════════
  {
    id: "ae_take_home", country: "AE",
    title: "Take-home (UAE)",
    subtitle: "0% PIT · GPSSA for nationals · EOS Art. 51 for expats",
    fields: [
      { id: "salary", label: "Annual gross salary (AED)", type: "number", default: 360000 },
      { id: "nationality", label: "Nationality", type: "select", options: [
        { v: "UAE", t: "UAE national" },
        { v: "GCC", t: "GCC national" },
        { v: "expat", t: "Expat (any other)" }
      ], default: "expat" },
      { id: "basicPct", label: "Basic % of total", type: "number", default: 0.6, step: 0.05 },
      { id: "housingPct", label: "Housing % of total", type: "number", default: 0.25, step: 0.05 },
      { id: "doj", label: "Date of joining", type: "text", default: "2022-01-01" }
    ],
    compute: ({ salary, nationality, basicPct, housingPct, doj }) => {
      const r = aeComputeMonthly(
        { id: "demo", salary: +salary, nationality, basicPct: +basicPct, housingPct: +housingPct, doj },
        { lop: 0, bonus: 0, reimburse: 0 },
        {}
      );
      return {
        output: [
          { label: "Monthly gross",            value: r.earnings.gross },
          { label: "Basic component",          value: r.earnings.basic },
          { label: "Housing component",        value: r.earnings.housing },
          { label: "− GPSSA employee (11%)",   value: -r.deductions.employeeGPSSA, muted: nationality === "UAE" || nationality === "GCC" ? "On contribution pay (basic + housing)" : "N/A — expats exempt" },
          { label: "Net take-home",            value: r.netPay, total: true },
          { label: "Employer GPSSA (12.5%)",   value: r.deductions.employerGPSSA, muted: "Employer cost; not deducted from net" },
          { label: "EOS gratuity accrual",     value: r.deductions.eosAccrual, muted: nationality === "expat" ? "21/30 days basic per year" : "Pension instead of EOS" },
          { label: "Total employer cost",      value: r.employerCost }
        ],
        formula: [
          ["Wages",   `Basic = ${(basicPct*100).toFixed(0)}% × salary; Housing = ${(housingPct*100).toFixed(0)}% × salary`],
          ["GPSSA",   nationality === "UAE" || nationality === "GCC" ? `(Basic + Housing) × 11% employee + 12.5% employer` : `Not applicable — expat`],
          ["EOS",     nationality === "expat" ? `21 days basic per year (first 5 years), 30 days thereafter; capped at 2 years' basic` : `Pension via GPSSA replaces EOS`]
        ],
        explain: [
          "UAE has 0% personal income tax. Take-home = gross minus GPSSA (only for UAE/GCC nationals).",
          "GPSSA contribution pay = basic + housing + certain fixed allowances. New hires post-Oct 2023 use 26% total split (11% employee + 12.5% employer + 2.5% government).",
          "Wage Protection System (WPS) requires monthly electronic salary transfer via MOHRE-approved bank."
        ],
        cite: "Federal Law 7/1999 (amended 57/2023) · Labour Law Decree 33/2021 Art. 51 · MOHRE WPS Decision 788/2009"
      };
    }
  },

  // ═════════════════════════════════════════════════════════════════
  // 🇸🇦 KSA
  // ═════════════════════════════════════════════════════════════════
  {
    id: "sa_take_home", country: "SA",
    title: "Take-home (KSA)",
    subtitle: "0% PIT · GOSI 10.25/12.25% (July 2025) · EOS Art. 84",
    fields: [
      { id: "salary", label: "Annual gross salary (SAR)", type: "number", default: 360000 },
      { id: "nationality", label: "Nationality", type: "select", options: [
        { v: "SA", t: "Saudi national" },
        { v: "GCC", t: "GCC national (treated as Saudi)" },
        { v: "expat", t: "Expat" }
      ], default: "SA" },
      { id: "basicPct", label: "Basic % of total", type: "number", default: 0.6, step: 0.05 },
      { id: "housingPct", label: "Housing % of total", type: "number", default: 0.25, step: 0.05 },
      { id: "doj", label: "Date of joining", type: "text", default: "2020-01-01" }
    ],
    compute: ({ salary, nationality, basicPct, housingPct, doj }) => {
      const r = saComputeMonthly(
        { id: "demo", salary: +salary, nationality, basicPct: +basicPct, housingPct: +housingPct, doj },
        { lop: 0, bonus: 0, reimburse: 0 },
        {}
      );
      const isSaudi = nationality === "SA" || nationality === "GCC";
      return {
        output: [
          { label: "Monthly gross",          value: r.earnings.gross },
          { label: "Basic + Housing (cap SAR 45,000)", value: r.earnings.basic + r.earnings.housing },
          { label: "− GOSI employee",        value: -r.deductions.employeeGOSI, muted: isSaudi ? "9.5% Annuities + 0.75% SANED = 10.25%" : "0% — expats exempt" },
          { label: "Net take-home",          value: r.netPay, total: true },
          { label: "Employer GOSI",          value: r.deductions.employerGOSI, muted: isSaudi ? "9.5% + 0.75% + 2% OH = 12.25%" : "2% OH only (expats)" },
          { label: "EOS gratuity accrual",   value: r.deductions.eosAccrual, muted: "Art 84: 0.5/1.0 month basic per year" },
          { label: "Total employer cost",    value: r.employerCost }
        ],
        formula: [
          ["Cap",     `GOSI base = min(Basic + Housing, SAR 45,000)`],
          ["GOSI",    isSaudi ? `Saudi: 10.25% employee + 12.25% employer` : `Expat: 0% employee + 2% employer (OH only)`],
          ["EOS",     `0.5 month basic per year for first 5 years, 1 month thereafter`],
          ["Resign factors", `<2yr: 0; 2-5yr: 1/3; 5-10yr: 2/3; >10yr: 100%`]
        ],
        explain: [
          "KSA has 0% personal income tax. GOSI is the social-insurance system — employees contribute only if Saudi/GCC.",
          "GOSI rates updated July 2025: Annuities stepping up 0.5%/year until 11% by 2028 (currently 9.5% each side).",
          "Expats receive End-of-Service Gratuity but no pension. The Wage Protection System (WPS) via Mudad mandates electronic salary payment within 7 days of due date."
        ],
        cite: "Royal Decree M/33 (GOSI) · Saudi Labour Law Art. 84 · MHRSD Mudad WPS"
      };
    }
  },

  // ═════════════════════════════════════════════════════════════════
  // 🇪🇬 EGYPT
  // ═════════════════════════════════════════════════════════════════
  {
    id: "eg_take_home", country: "EG",
    title: "Take-home (Egypt)",
    subtitle: "Social Insurance + progressive Income Tax + Martyrs Fund",
    fields: [
      { id: "salary", label: "Annual gross salary (EGP)", type: "number", default: 240000 }
    ],
    compute: ({ salary }) => {
      const r = egComputeMonthly(
        { id: "demo", salary: +salary },
        { lop: 0, bonus: 0, reimburse: 0 },
        {}
      );
      return {
        output: [
          { label: "Monthly gross",                  value: r.earnings.gross },
          { label: "− Social Insurance (11% Ee)",    value: -r.deductions.employeeSI, muted: "Capped at EGP 16,700 base (2026)" },
          { label: "− Income Tax (progressive)",     value: -r.deductions.incomeTax, muted: "0-27.5% slabs after EGP 20k personal exemption" },
          { label: "− Martyrs & Victims Fund (0.05%)", value: -r.deductions.martyrs, muted: "Law 4/2021" },
          { label: "Net take-home",                  value: r.netPay, total: true },
          { label: "Employer SI (18.75%)",           value: r.deductions.employerSI, muted: "Employer-side, capped at EGP 16,700 base" },
          { label: "Total employer cost",            value: r.employerCost }
        ],
        formula: [
          ["SI base",   `min(Gross, EGP 16,700/mo) — indexed +15%/yr`],
          ["Employee",  `SI base × 11% = monthly contribution`],
          ["Employer",  `SI base × 18.75%`],
          ["Income tax", `Annual gross − Annual SI − EGP 20,000 → progressive 0-27.5% → ÷ 12`],
          ["Martyrs",   `Gross × 0.05%`]
        ],
        explain: [
          "Egypt SI ceiling rises 15% per year; EGP 16,700/month for 2026.",
          "Income tax slabs (annual EGP): 0-40k 0% · 40-55k 10% · 55-70k 15% · 70-200k 20% · 200-400k 22.5% · 400k-1.2M 25% · >1.2M 27.5%.",
          "Personal exemption EGP 20,000/year applies to all.",
          "Martyrs & Victims Fund (0.05%) replaces older 'community participation tax' references — legal authority is Law 4/2021."
        ],
        cite: "Law 148/2019 (SI) · Law 91/2005 amended (IT) · Law 4/2021 (Martyrs Fund)"
      };
    }
  }
];

// ─── UI render ──────────────────────────────────────────────────────
let country = localStorage.getItem("gt_country") || "IN";
const country_of = (c) => c.country || "IN";
function visibleCalcs() { return CALCS.filter(c => country_of(c) === country); }
let activeId = (visibleCalcs()[0] || CALCS[0]).id;
let wageCode = "legacy";
let inputs = {};

function boot() {
  renderPicker();
  renderActive();

  // React to topbar country switch
  window.addEventListener("gt:country", (e) => {
    country = e.detail;
    const list = visibleCalcs();
    activeId = list.length ? list[0].id : CALCS[0].id;
    inputs = {};
    renderPicker();
    renderActive();
  });

  // Expose page context for AI drawer
  window.__GT_PAGE_CTX__ = () => {
    const c = CALCS.find(x => x.id === activeId);
    if (!c) return { page: "calculators" };
    const params = { ...Object.fromEntries(c.fields.map(f => [f.id, inputs[f.id] ?? f.default])), wageCode };
    let result = null;
    try { result = c.compute(params); } catch {}
    return {
      page: "calculators",
      country: country_of(c),
      active_calculator: c.id,
      active_title: c.title,
      inputs: params,
      wage_regime: wageCode,
      result_summary: result ? result.output.map(r => ({ label: r.label, value: r.value })) : null,
      legal_basis: result ? result.cite : null
    };
  };
  window.addEventListener("resize", () => {});
}

function renderPicker() {
  const el = document.getElementById("calcPicker");
  const list = visibleCalcs();
  if (list.length === 0) {
    el.innerHTML = `<p class="muted" style="padding:10px">No calculators yet for ${country}. Pick another country in the topbar.</p>`;
    return;
  }
  const active = list.find(c => c.id === activeId) || list[0];
  el.innerHTML = `
    <div class="picker-toggle" data-picker-toggle>
      <span class="label">
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="1.75" fill="none"><rect x="5" y="3" width="14" height="18" rx="2"/><rect x="8" y="6" width="8" height="3"/></svg>
        ${active ? active.title : "Choose a calculator"}
      </span>
      <svg class="chev" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M6 9l6 6 6-6"/></svg>
    </div>
    <div class="picker-list">
      ${list.map(c => `
        <div class="calc-picker-item ${c.id === activeId ? "active" : ""}" data-id="${c.id}">
          <svg class="ico" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" fill="none"><rect x="5" y="3" width="14" height="18" rx="2"/><rect x="8" y="6" width="8" height="3"/></svg>
          <span>${c.title}</span>
        </div>
      `).join("")}
    </div>
  `;
  // On desktop, picker is always "open" (the toggle is hidden via CSS). On
  // mobile, default closed so result panel is immediately visible.
  el.classList.toggle("open", window.innerWidth > 900);

  el.querySelector("[data-picker-toggle]").addEventListener("click", () => el.classList.toggle("open"));

  el.querySelectorAll("[data-id]").forEach(n => n.addEventListener("click", () => {
    activeId = n.dataset.id;
    inputs = {};
    renderPicker();
    renderActive();
    if (window.innerWidth <= 900) {
      el.classList.remove("open");
      const panel = document.getElementById("calcPanel");
      if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }));
}

function renderActive() {
  const c = CALCS.find(x => x.id === activeId);
  const panel = document.getElementById("calcPanel");
  panel.innerHTML = `
    <div class="card">
      <h3>${c.title}</h3>
      <p class="muted" style="margin-bottom:10px">${c.subtitle}</p>
      ${c.regimeToggle ? `
        <div class="regime-toggle">
          <b style="color:var(--muted);margin-right:auto">Wage regime</b>
          <div class="seg">
            <button class="seg-btn ${wageCode === "legacy" ? "active" : ""}" data-wage="legacy">${c.regimeToggle.legacy}</button>
            <button class="seg-btn ${wageCode === "new" ? "active" : ""}" data-wage="new">${c.regimeToggle.new}</button>
          </div>
        </div>
      ` : ""}
      <div class="calc-io" id="inputsWrap">
        ${c.fields.map(f => {
          const val = inputs[f.id] ?? f.default;
          if (f.type === "select") {
            return `<div class="field"><label>${f.label}</label><select data-field="${f.id}">${f.options.map(o => `<option value="${o.v}" ${String(val) === String(o.v) ? "selected" : ""}>${o.t}</option>`).join("")}</select></div>`;
          }
          return `<div class="field"><label>${f.label}</label><input type="${f.type}" data-field="${f.id}" value="${val}" ${f.step ? `step="${f.step}"` : ""} /></div>`;
        }).join("")}
        <div><button class="btn" id="computeBtn">Compute</button></div>
      </div>
    </div>
    <div id="outputPanel"></div>
  `;

  if (c.regimeToggle) {
    panel.querySelectorAll("[data-wage]").forEach(b => b.addEventListener("click", () => {
      wageCode = b.dataset.wage;
      renderActive(); computeAndShow();
    }));
  }
  panel.querySelectorAll("[data-field]").forEach(i => {
    inputs[i.dataset.field] = i.value;
    i.addEventListener("change", () => { inputs[i.dataset.field] = i.value; computeAndShow(); });
  });
  document.getElementById("computeBtn").addEventListener("click", computeAndShow);
  computeAndShow();
}

function computeAndShow() {
  const c = CALCS.find(x => x.id === activeId);
  if (!c) return;
  const cc = country_of(c);
  const params = { ...Object.fromEntries(c.fields.map(f => [f.id, inputs[f.id] ?? f.default])), wageCode };
  const result = c.compute(params);
  const out = document.getElementById("outputPanel");
  out.innerHTML = `
    <div class="card">
      <h3 style="margin-bottom:10px">Result</h3>
      ${result.output.map(r => {
        const label = r.label + (r.muted ? ` <span class="muted">${r.muted}</span>` : "");
        const v = (typeof r.value === "number") ? fmt(r.value, cc) : r.value;
        return `<div class="output-row ${r.total ? "total" : ""}"><span>${label}</span><b${r.bold ? ' style="color:var(--accent)"' : ""}>${v}</b></div>`;
      }).join("")}
    </div>
    <div class="card" style="margin-top:16px">
      <h3>How it's calculated</h3>
      <div class="formula">${result.formula.map(([k, v]) => `<div class="step"><span class="step-label">${k}</span>${v}</div>`).join("")}</div>
      ${result.explain ? `<ul class="explain-list">${result.explain.map(e => `<li>${e}</li>`).join("")}</ul>` : ""}
      ${result.cite ? `<div class="cite-box"><b>Legal basis:</b> ${result.cite}</div>` : ""}
    </div>
  `;
}

boot();
