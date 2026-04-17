/**
 * Deductions Calculator
 * Handles pre-tax (401k, health, HSA, FSA) and post-tax (Roth, garnishments) deductions
 * Enforces California illegal deduction rules and garnishment limits
 */

// Annual limits for 2026
const ANNUAL_LIMITS = {
  traditional_401k: 23500,
  roth_401k: 23500,
  combined_401k: 23500, // traditional + roth combined
  catch_up_401k: 7500, // age 50+
  hsa_individual: 4300,
  hsa_family: 8550,
  fsa_medical: 3200,
  fsa_dependent_care: 5000
};

// Pre-tax deduction codes and their tax treatment
const DEDUCTION_MATRIX = {
  retirement_401k: {
    code: '401K',
    name: '401(k) Pre-Tax',
    pre_tax_fit: true,
    pre_tax_state: true, // most states
    pre_tax_ss_medicare: false, // SS/Medicare calculated on gross
    pre_tax_sdi: false,
    annual_limit: ANNUAL_LIMITS.traditional_401k
  },
  health_insurance: {
    code: 'MED_PRE',
    name: 'Medical Insurance (Pre-Tax)',
    pre_tax_fit: true,
    pre_tax_state: true,
    pre_tax_ss_medicare: true, // Section 125
    pre_tax_sdi: true,
    annual_limit: null
  },
  dental_insurance: {
    code: 'DENTAL_PRE',
    name: 'Dental Insurance (Pre-Tax)',
    pre_tax_fit: true,
    pre_tax_state: true,
    pre_tax_ss_medicare: true,
    pre_tax_sdi: true,
    annual_limit: null
  },
  vision_insurance: {
    code: 'VISION_PRE',
    name: 'Vision Insurance (Pre-Tax)',
    pre_tax_fit: true,
    pre_tax_state: true,
    pre_tax_ss_medicare: true,
    pre_tax_sdi: true,
    annual_limit: null
  },
  hsa_contribution: {
    code: 'HSA',
    name: 'HSA Contribution',
    pre_tax_fit: true,
    pre_tax_state: true, // EXCEPT California — CA does not conform to HSA
    pre_tax_ss_medicare: true,
    pre_tax_sdi: true,
    annual_limit: ANNUAL_LIMITS.hsa_individual,
    ca_exception: true // Taxable for CA PIT and SDI
  },
  fsa_contribution: {
    code: 'FSA_MED',
    name: 'Medical FSA',
    pre_tax_fit: true,
    pre_tax_state: true,
    pre_tax_ss_medicare: true,
    pre_tax_sdi: true,
    annual_limit: ANNUAL_LIMITS.fsa_medical
  }
};

const POST_TAX_DEDUCTIONS = {
  roth_401k: {
    code: 'ROTH_401K',
    name: 'Roth 401(k)',
    annual_limit: ANNUAL_LIMITS.roth_401k
  },
  garnishment: {
    code: 'GARNISH',
    name: 'Wage Garnishment'
  },
  child_support: {
    code: 'CHILD_SUPPORT',
    name: 'Child Support'
  }
};

/**
 * Calculate pre-tax deductions for a pay period
 * Returns: { items: [{code, name, amount}], totals: { fit_pretax, state_pretax, fica_pretax } }
 */
function calculatePreTaxDeductions(grossPay, employee, ytd = {}) {
  const items = [];
  let fitPreTax = 0;
  let statePreTax = 0;
  let ficaPreTax = 0;

  const state = employee.work_state;
  const deductions = employee.deductions || {};

  // 401(k) Traditional
  if (deductions.retirement_401k_pct > 0 || deductions.retirement_401k_dollar > 0) {
    let amount;
    if (deductions.retirement_401k_dollar > 0) {
      amount = deductions.retirement_401k_dollar;
    } else {
      amount = grossPay * (deductions.retirement_401k_pct / 100);
    }
    // Check annual limit
    const ytd401k = ytd.retirement_401k || 0;
    const remaining = ANNUAL_LIMITS.traditional_401k - ytd401k;
    amount = Math.min(amount, Math.max(0, remaining));
    amount = round(amount);

    if (amount > 0) {
      items.push({ code: '401K', name: '401(k) Pre-Tax', amount, category: 'retirement' });
      fitPreTax += amount;
      statePreTax += amount;
      // 401k is NOT pre-tax for SS/Medicare
    }
  }

  // Health Insurance
  if (deductions.health_insurance > 0) {
    const amount = round(deductions.health_insurance);
    items.push({ code: 'MED_PRE', name: 'Medical Insurance', amount, category: 'insurance' });
    fitPreTax += amount;
    statePreTax += amount;
    ficaPreTax += amount; // Section 125
  }

  // Dental
  if (deductions.dental_insurance > 0) {
    const amount = round(deductions.dental_insurance);
    items.push({ code: 'DENTAL_PRE', name: 'Dental Insurance', amount, category: 'insurance' });
    fitPreTax += amount;
    statePreTax += amount;
    ficaPreTax += amount;
  }

  // Vision
  if (deductions.vision_insurance > 0) {
    const amount = round(deductions.vision_insurance);
    items.push({ code: 'VISION_PRE', name: 'Vision Insurance', amount, category: 'insurance' });
    fitPreTax += amount;
    statePreTax += amount;
    ficaPreTax += amount;
  }

  // HSA
  if (deductions.hsa_contribution > 0) {
    let amount = round(deductions.hsa_contribution);
    const ytdHSA = ytd.hsa || 0;
    const remaining = ANNUAL_LIMITS.hsa_individual - ytdHSA;
    amount = Math.min(amount, Math.max(0, remaining));

    if (amount > 0) {
      items.push({ code: 'HSA', name: 'HSA Contribution', amount, category: 'health_savings' });
      fitPreTax += amount;
      ficaPreTax += amount;
      // CA exception: HSA is NOT pre-tax for CA PIT and SDI
      if (state !== 'CA') {
        statePreTax += amount;
      }
    }
  }

  // FSA
  if (deductions.fsa_contribution > 0) {
    let amount = round(deductions.fsa_contribution);
    const ytdFSA = ytd.fsa || 0;
    const remaining = ANNUAL_LIMITS.fsa_medical - ytdFSA;
    amount = Math.min(amount, Math.max(0, remaining));

    if (amount > 0) {
      items.push({ code: 'FSA_MED', name: 'Medical FSA', amount, category: 'health_savings' });
      fitPreTax += amount;
      statePreTax += amount;
      ficaPreTax += amount;
    }
  }

  return {
    items,
    totals: {
      total: round(items.reduce((sum, i) => sum + i.amount, 0)),
      fit_pretax: round(fitPreTax),
      state_pretax: round(statePreTax),
      fica_pretax: round(ficaPreTax)
    }
  };
}

/**
 * Calculate post-tax deductions
 */
function calculatePostTaxDeductions(grossPay, netAfterTaxes, employee, ytd = {}) {
  const items = [];
  const deductions = employee.deductions || {};

  // Roth 401(k)
  if (deductions.roth_401k_pct > 0) {
    let amount = round(grossPay * (deductions.roth_401k_pct / 100));
    const ytdRoth = ytd.roth_401k || 0;
    const ytd401k = ytd.retirement_401k || 0;
    const combinedRemaining = ANNUAL_LIMITS.combined_401k - ytdRoth - ytd401k;
    amount = Math.min(amount, Math.max(0, combinedRemaining));

    if (amount > 0) {
      items.push({ code: 'ROTH_401K', name: 'Roth 401(k)', amount, category: 'retirement' });
    }
  }

  // Garnishments
  if (deductions.garnishments && deductions.garnishments.length > 0) {
    for (const g of deductions.garnishments) {
      let amount = 0;
      const disposableEarnings = netAfterTaxes;

      if (g.type === 'child_support') {
        // Child support: up to 50-65% of disposable earnings
        const maxPct = g.supporting_other_family ? 0.50 : 0.60;
        const maxAmt = round(disposableEarnings * maxPct);
        amount = Math.min(g.amount || 0, maxAmt);
      } else if (g.type === 'consumer_debt') {
        // Consumer debt: lesser of 25% of disposable or excess over 30× federal min wage
        const pct25 = disposableEarnings * 0.25;
        const excess30 = disposableEarnings - (30 * 7.25); // 30 × $7.25 per week
        amount = Math.min(g.amount || 0, Math.min(pct25, Math.max(0, excess30)));
      } else if (g.type === 'tax_levy') {
        amount = g.amount || 0; // per IRS/FTB order
      } else {
        amount = g.amount || 0;
      }

      amount = round(Math.max(0, amount));
      if (amount > 0) {
        items.push({
          code: g.type === 'child_support' ? 'CHILD_SUPPORT' : 'GARNISH',
          name: g.description || 'Garnishment',
          amount,
          category: 'garnishment'
        });
      }
    }
  }

  return {
    items,
    total: round(items.reduce((sum, i) => sum + i.amount, 0))
  };
}

function round(value) {
  return Math.round(value * 100) / 100;
}

module.exports = {
  ANNUAL_LIMITS,
  DEDUCTION_MATRIX,
  calculatePreTaxDeductions,
  calculatePostTaxDeductions
};
