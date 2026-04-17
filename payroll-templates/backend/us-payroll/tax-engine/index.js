/**
 * Tax Engine Pipeline Orchestrator
 * Sequences: gross → pre-tax deductions → federal taxes → state taxes → post-tax deductions → net pay
 *
 * This is the core calculation engine that processes a single employee for a single pay period.
 */

const path = require('path');
const { calculateGrossPay } = require('../calculators/gross-pay');
const { calculatePreTaxDeductions, calculatePostTaxDeductions } = require('../calculators/deductions');
const { calculateNetPay, calculateEmployerTaxTotal, calculateTotalEmployerCost } = require('../calculators/net-pay');

// State modules loaded dynamically
const STATE_MODULES = {};
const SUPPORTED_STATES = ['CA', 'TX', 'FL', 'WA', 'NY', 'GA'];

/**
 * Load a state tax module (lazy loading with caching)
 */
function getStateModule(stateCode) {
  if (!SUPPORTED_STATES.includes(stateCode)) {
    throw new Error(`Unsupported state: ${stateCode}. Supported: ${SUPPORTED_STATES.join(', ')}`);
  }
  if (!STATE_MODULES[stateCode]) {
    STATE_MODULES[stateCode] = require(path.join(__dirname, 'states', stateCode));
  }
  return STATE_MODULES[stateCode];
}

/**
 * Load federal tax module
 */
let federalModule;
function getFederalModule() {
  if (!federalModule) {
    federalModule = require('./federal');
  }
  return federalModule;
}

const PAY_PERIODS_PER_YEAR = {
  weekly: 52,
  bi_weekly: 26,
  semi_monthly: 24,
  monthly: 12
};

function round(value) {
  return Math.round(value * 100) / 100;
}

/**
 * Run the complete payroll calculation pipeline for a single employee
 *
 * @param {Object} employee - Employee record with all fields
 * @param {Object} hours - Hours worked: { regular, overtime_15x, overtime_2x, sick, vacation, holiday, daily: [] }
 * @param {Object} adjustments - Bonuses, commissions, etc.
 * @param {Object} companySettings - Company-level settings (SUI rate, etc.)
 * @returns {Object} Complete pay stub data
 */
function calculatePayroll(employee, hours = {}, adjustments = {}, companySettings = {}) {
  const state = employee.work_state;
  const federal = getFederalModule();
  const stateModule = getStateModule(state);
  const ytd = employee.ytd || {};

  // ═══════════════════════════════════════════════════
  // STEP 1: GROSS PAY CALCULATION
  // ═══════════════════════════════════════════════════
  const grossResult = calculateGrossPay(employee, hours, adjustments);
  const grossPay = grossResult.gross_pay;

  // ═══════════════════════════════════════════════════
  // STEP 2: PRE-TAX DEDUCTIONS
  // ═══════════════════════════════════════════════════
  const preTaxResult = calculatePreTaxDeductions(grossPay, employee, ytd);

  // Calculate taxable amounts
  const fitTaxableWages = round(grossPay - preTaxResult.totals.fit_pretax);
  const stateTaxableWages = round(grossPay - preTaxResult.totals.state_pretax);
  const ficaTaxableWages = round(grossPay - preTaxResult.totals.fica_pretax);

  // For SS/Medicare: use gross (401k is NOT pre-tax for FICA, but Section 125 health is)
  const ssAndMedicareGross = round(grossPay - preTaxResult.totals.fica_pretax);

  // ═══════════════════════════════════════════════════
  // STEP 3: FEDERAL TAXES
  // ═══════════════════════════════════════════════════
  const w4 = employee.w4 || employee.w4_federal || { filing_status: 'single' };

  // Federal Income Tax
  const fitResult = federal.calculateFIT(
    grossPay,
    preTaxResult.totals.fit_pretax,
    w4,
    employee.pay_frequency
  );

  // Social Security
  const ssResult = federal.calculateSocialSecurity(
    grossPay, // SS uses gross (401k not exempt, but Section 125 items are)
    ytd.ss_wages || 0
  );

  // Medicare
  const medicareResult = federal.calculateMedicare(
    grossPay,
    ytd.gross_pay || 0,
    w4.filing_status
  );

  // FUTA (employer only)
  const futaResult = federal.calculateFUTA(
    grossPay,
    ytd.futa_wages || 0
  );

  // ═══════════════════════════════════════════════════
  // STEP 4: STATE TAXES
  // ═══════════════════════════════════════════════════
  const stateW4 = (employee.state_w4 && employee.state_w4[state]) ||
    (employee.w4_state) || {};

  // State Income Tax
  let stateIncomeTax = 0;
  let localIncomeTax = 0;
  if (stateModule.hasStateIncomeTax) {
    const stateResult = stateModule.calculateStateIncomeTax(
      stateTaxableWages,
      stateW4,
      employee.pay_frequency
    );
    stateIncomeTax = stateResult.amount || 0;

    // Local taxes (NYC, Yonkers)
    if (stateResult.local_tax !== undefined) {
      localIncomeTax = stateResult.local_tax;
    }
  }

  // State Programs (SDI, PFL, PFML, WA Cares, DBL, etc.)
  const statePrograms = stateModule.calculateStatePrograms(
    grossPay,
    ytd.gross_pay || 0,
    employee
  );

  // State Employer Taxes (SUI, ETT, etc.)
  const stateConfig = (companySettings.states && companySettings.states[state]) || {};
  // sui_rate stored as percentage (e.g., 3.4 for 3.4%) — convert to decimal for tax calculation
  const suiRatePct = stateConfig.sui_rate || stateModule.config.defaultSUIRate || 2.7;
  const suiRate = suiRatePct / 100;
  const stateEmployerTaxes = stateModule.calculateEmployerTaxes(
    grossPay,
    ytd.suta_wages || 0,
    suiRate
  );

  // ═══════════════════════════════════════════════════
  // STEP 5: COMPILE ALL TAXES
  // ═══════════════════════════════════════════════════
  const allTaxes = {
    federal_income: round(fitResult.amount),
    social_security_employee: round(ssResult.employee),
    social_security_employer: round(ssResult.employer),
    medicare_employee: round(medicareResult.employee),
    medicare_employer: round(medicareResult.employer),
    medicare_additional: round(medicareResult.additionalEmployee || 0),
    state_income: round(stateIncomeTax),
    local_income: round(localIncomeTax),
    state_programs: (statePrograms.items || []).map(p => ({
      code: p.code,
      name: p.name,
      employee_amount: round(p.employee_amount || 0),
      employer_amount: round(p.employer_amount || 0)
    })),
    futa: round(futaResult.employer),
    employer_taxes: (stateEmployerTaxes.items || []).map(t => ({
      code: t.code,
      name: t.name,
      amount: round(t.amount || 0),
      taxable_wages: round(t.taxable_wages || 0)
    }))
  };

  // ═══════════════════════════════════════════════════
  // STEP 6: POST-TAX DEDUCTIONS
  // ═══════════════════════════════════════════════════
  // Calculate net before post-tax deductions (for garnishment limits)
  const netBeforePostTax = grossPay - preTaxResult.totals.total -
    allTaxes.federal_income - allTaxes.social_security_employee -
    allTaxes.medicare_employee - allTaxes.medicare_additional -
    allTaxes.state_income - allTaxes.local_income -
    allTaxes.state_programs.reduce((s, p) => s + p.employee_amount, 0);

  const postTaxResult = calculatePostTaxDeductions(
    grossPay,
    netBeforePostTax,
    employee,
    ytd
  );

  // ═══════════════════════════════════════════════════
  // STEP 7: NET PAY
  // ═══════════════════════════════════════════════════
  const netPayResult = calculateNetPay(
    grossPay,
    preTaxResult,
    allTaxes,
    postTaxResult
  );

  // ═══════════════════════════════════════════════════
  // STEP 8: COMPILE EMPLOYER COSTS
  // ═══════════════════════════════════════════════════
  const employerTaxes = {
    ss_employer: allTaxes.social_security_employer,
    medicare_employer: allTaxes.medicare_employer,
    futa: allTaxes.futa,
    state_programs: allTaxes.state_programs,
    employer_taxes: allTaxes.employer_taxes
  };

  const totalEmployerTax = round(
    employerTaxes.ss_employer +
    employerTaxes.medicare_employer +
    employerTaxes.futa +
    allTaxes.state_programs.reduce((s, p) => s + p.employer_amount, 0) +
    allTaxes.employer_taxes.reduce((s, t) => s + t.amount, 0)
  );

  // ═══════════════════════════════════════════════════
  // STEP 9: BUILD PAY STUB DATA
  // ═══════════════════════════════════════════════════
  return {
    employee_id: employee.employee_id,
    state: state,

    // Hours
    hours: grossResult.hours || hours,

    // Earnings
    earnings: {
      ...(grossResult.earnings || {}),
      regular_rate: grossResult.regular_rate || employee.pay_rate,
      base_rate: grossResult.base_rate || employee.pay_rate,
      gross_pay: grossPay
    },

    // Pre-tax deductions
    pre_tax_deductions: {
      items: preTaxResult.items,
      total: preTaxResult.totals.total
    },

    // Taxable wages (for reporting)
    taxable_wages: {
      fit: fitTaxableWages,
      state: stateTaxableWages,
      ss: round(ssResult.taxableWages),
      medicare: grossPay
    },

    // Employee taxes
    taxes: {
      federal_income: allTaxes.federal_income,
      social_security_employee: allTaxes.social_security_employee,
      medicare_employee: allTaxes.medicare_employee,
      medicare_additional: allTaxes.medicare_additional,
      state_income: allTaxes.state_income,
      local_income: allTaxes.local_income,
      state_programs: allTaxes.state_programs,
      total_employee_taxes: netPayResult.total_taxes
    },

    // Post-tax deductions
    post_tax_deductions: {
      items: postTaxResult.items,
      total: postTaxResult.total
    },

    // Net pay
    net_pay: netPayResult.net_pay,

    // Employer costs
    employer_taxes: {
      ss_employer: employerTaxes.ss_employer,
      medicare_employer: employerTaxes.medicare_employer,
      futa: employerTaxes.futa,
      state_employer_taxes: allTaxes.employer_taxes,
      state_program_employer: allTaxes.state_programs.filter(p => p.employer_amount > 0),
      total_employer_taxes: totalEmployerTax,
      total_employer_cost: round(grossPay + totalEmployerTax)
    },

    // Computation metadata
    _meta: {
      calculated_at: new Date().toISOString(),
      tax_year: new Date().getFullYear(),
      pay_frequency: employee.pay_frequency,
      state_module: stateModule.stateCode,
      federal_config_year: federal.FEDERAL_CONFIG?.year || 2026
    }
  };
}

/**
 * Get state configuration info (for UI display)
 */
function getStateInfo(stateCode) {
  const mod = getStateModule(stateCode);
  return {
    code: mod.stateCode,
    name: mod.stateName,
    has_income_tax: mod.hasStateIncomeTax,
    config: mod.config,
    required_stub_fields: mod.getRequiredStubFields()
  };
}

/**
 * Get all supported states with their configurations
 */
function getAllStatesInfo() {
  return SUPPORTED_STATES.map(code => {
    try {
      return getStateInfo(code);
    } catch {
      return { code, name: code, error: 'Module not loaded' };
    }
  });
}

module.exports = {
  calculatePayroll,
  getStateInfo,
  getAllStatesInfo,
  getStateModule,
  getFederalModule,
  SUPPORTED_STATES,
  PAY_PERIODS_PER_YEAR
};
