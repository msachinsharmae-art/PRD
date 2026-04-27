// India — wage-structure rule engine
// Splits annual CTC into its salary components under TWO regimes:
//   1. LEGACY  — pre-Wage-Code market practice (Basic 30-40% of CTC)
//   2. NEW CODE (Code on Wages 2019, Sec 2(y))
//         "wages" = basic + DA + retaining allowance
//         specified exclusions (HRA, conveyance, OT, bonus, commission,
//         employer PF, gratuity, etc.) cannot exceed 50% of total remuneration.
//         If they do, the EXCESS is added back to wages.
//
// All math is deterministic. No LLM involvement. Versioned so audits can replay.

const PF_CEILING_BASIC = 15000;          // EPF Scheme 1952, Para 26A — pending Code-SS notification
const GRATUITY_PROVISION_RATE = 0.0481;  // 15 / 26 / 12 — standard CTC provision

/**
 * @param {object} emp           - employee master (ctc, metro, ...)
 * @param {'legacy'|'new'} mode  - wage-structure regime
 * @returns monthly + annual breakup
 */
export function splitWages(emp, mode = "legacy") {
  const ctc = emp.ctc;
  const metro = emp.metro !== false;

  // Provisions that form part of CTC but aren't paid monthly-in-hand:
  //   - Employer PF (uses 12% of basic, capped at ₹1,800/month in legacy practice)
  //   - Gratuity provision (4.81% of basic)
  // Under LEGACY we back-solve basic from: ctc = basic + hra + special + lta + medical + empPF + gratuity
  // Under NEW, basic floor = 50% of (ctc net of provisions).

  if (mode === "new") return newCodeSplit(ctc, metro);
  return legacySplit(ctc, metro);
}

// ----- LEGACY (pre Wage-Code) -----
// Typical market structure used by Indian IT services firms.
// Basic 40% of CTC. HRA 50% of basic metro / 40% non-metro.
// Employer PF capped at 15k basic (₹1,800/m). Gratuity 4.81% of basic.
function legacySplit(ctc, metro) {
  const basic = Math.round(ctc * 0.40);
  const hra = Math.round(basic * (metro ? 0.50 : 0.40));
  const pfBasicCap = Math.min(basic, PF_CEILING_BASIC * 12);
  const employerPF = Math.round(pfBasicCap * 0.12);
  const gratuity = Math.round(basic * GRATUITY_PROVISION_RATE);
  const lta = Math.round(basic * 0.08333); // 1 month basic
  const medical = 15000;                    // tax-free reimb. (optional)
  const special = Math.max(0, ctc - basic - hra - employerPF - gratuity - lta - medical);
  return {
    mode: "legacy",
    annual: { basic, hra, special, lta, medical, employerPF, gratuity, ctc },
    monthly: monthlyFromAnnual({ basic, hra, special, lta, medical, employerPF, gratuity }),
    wageBase: basic,            // base for PF, gratuity
    metro
  };
}

// ----- NEW (Code on Wages 2019, Sec 2(y)) -----
// Rule: exclusions (HRA + special + LTA + medical) ≤ 50% of total remuneration.
// Interpretation: "total remuneration" = CTC net of employer-PF & gratuity provision.
// If declared basic+DA < 50% of that, bump basic UP until it equals 50%.
function newCodeSplit(ctc, metro) {
  // First pass: provisional basic = 50% of (CTC - employer_pf - gratuity)
  //   where employer_pf and gratuity themselves depend on basic → iterate once.
  let basic = Math.round(ctc * 0.50);
  for (let i = 0; i < 3; i++) {
    const pfBasicCap = Math.min(basic, PF_CEILING_BASIC * 12);
    const employerPF = pfBasicCap * 0.12;
    const gratuity = basic * GRATUITY_PROVISION_RATE;
    const totalRemun = ctc - employerPF - gratuity;
    const target = Math.round(totalRemun * 0.50);
    if (Math.abs(target - basic) < 10) { basic = target; break; }
    basic = target;
  }
  const pfBasicCap = Math.min(basic, PF_CEILING_BASIC * 12);
  const employerPF = Math.round(pfBasicCap * 0.12);
  const gratuity = Math.round(basic * GRATUITY_PROVISION_RATE);
  // Split remaining 50% into HRA / LTA / medical / special
  const exclusions = ctc - basic - employerPF - gratuity;
  const hra = Math.round(basic * (metro ? 0.50 : 0.40)); // HRA still linked to basic
  const lta = Math.round(basic * 0.08333);
  const medical = 15000;
  const special = Math.max(0, exclusions - hra - lta - medical);
  return {
    mode: "new",
    annual: { basic, hra, special, lta, medical, employerPF, gratuity, ctc },
    monthly: monthlyFromAnnual({ basic, hra, special, lta, medical, employerPF, gratuity }),
    wageBase: basic,
    metro
  };
}

function monthlyFromAnnual({ basic, hra, special, lta, medical, employerPF, gratuity }) {
  return {
    basic:       Math.round(basic / 12),
    hra:         Math.round(hra / 12),
    special:     Math.round(special / 12),
    lta:         Math.round(lta / 12),
    medical:     Math.round(medical / 12),
    employerPF:  Math.round(employerPF / 12),
    gratuity:    Math.round(gratuity / 12)
  };
}

export const WAGE_CITATIONS = [
  { label: "Code on Wages 2019 §2(y)",      note: "definition of 'wages'; 50% exclusion cap" },
  { label: "EPF Scheme 1952, Para 26A",     note: "PF statutory wage ceiling ₹15,000" },
  { label: "Payment of Gratuity Act §4(2)", note: "15/26 days per yr basic → 4.81% CTC provision" }
];
