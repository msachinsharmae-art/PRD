// ─────────────────────────────────────────────────────────────
//  employee.js  -  Employee model & validation for US payroll
// ─────────────────────────────────────────────────────────────
const fs   = require('fs');
const path = require('path');

// ── Supported states & enums ─────────────────────────────────
const SUPPORTED_STATES = ['CA', 'TX', 'FL', 'WA', 'NY', 'GA'];

const FLSA_STATUSES     = ['exempt', 'non_exempt'];
const PAY_TYPES         = ['hourly', 'salary'];
const EMPLOYMENT_TYPES  = ['full_time', 'part_time', 'temp'];
const PAY_FREQUENCIES   = ['weekly', 'bi_weekly', 'semi_monthly', 'monthly'];
const FILING_STATUSES   = ['single', 'married_filing_jointly', 'married_filing_separately', 'head_of_household'];
const DEPOSIT_TYPES     = ['checking', 'savings'];
const DEPOSIT_AMT_TYPES = ['fixed', 'percent', 'remainder'];

// ── Counter for auto-incrementing employee IDs ───────────────
let _nextId = 1;

function _padId(n) {
  return String(n).padStart(3, '0');
}

// ── Schema defaults ──────────────────────────────────────────

function _defaultW4Federal() {
  return {
    filing_status:       'single',
    multiple_jobs:       false,
    dependents_credit:   0,
    other_income:        0,
    deductions:          0,
    extra_withholding:   0,
  };
}

function _defaultStateW4(stateCode) {
  switch (stateCode) {
    case 'CA': // DE-4
      return {
        form:                   'DE-4',
        filing_status:          'single',
        allowances:             1,
        additional_withholding: 0,
      };
    case 'NY': // IT-2104
      return {
        form:                   'IT-2104',
        filing_status:          'single',
        allowances:             1,
        additional_withholding: 0,
        nyc_resident:           false,
        yonkers_resident:       false,
      };
    case 'GA': // G-4
      return {
        form:                   'G-4',
        filing_status:          'single',
        allowances:             1,
        additional_withholding: 0,
      };
    // TX, FL, WA have no state income tax -- no W-4 equivalent
    default:
      return null;
  }
}

function _defaultDeductions() {
  return {
    retirement_401k_pct:    0,
    retirement_401k_dollar: 0,
    health_insurance:       0,
    dental_insurance:       0,
    vision_insurance:       0,
    hsa_contribution:       0,
    fsa_contribution:       0,
    roth_401k_pct:          0,
    garnishments:           [],   // array of { type, amount, case_number }
  };
}

function _defaultDirectDeposit() {
  return [];  // array of { bank_name, account_last4, type, amount_type, amount }
}

function _defaultYTD() {
  return {
    gross_pay:    0,
    federal_tax:  0,
    ss_tax:       0,
    ss_wages:     0,
    medicare_tax: 0,
    state_tax:    0,
    local_tax:    0,
    futa_wages:   0,
    suta_wages:   0,
  };
}

// ── createEmployee ───────────────────────────────────────────

/**
 * Build a new employee record with sensible defaults.
 * Auto-generates an employee_id like "EMP-001".
 *
 * @param {object} data - partial employee fields (overrides defaults)
 * @returns {object} fully-formed employee record
 */
function createEmployee(data = {}) {
  const id = `EMP-${_padId(_nextId++)}`;

  const workState = (data.work_state || 'TX').toUpperCase();

  const employee = {
    // ── identity
    employee_id:      id,
    first_name:       data.first_name       || '',
    last_name:        data.last_name        || '',
    ssn_last4:        data.ssn_last4        || '',
    date_of_birth:    data.date_of_birth    || null,
    hire_date:        data.hire_date        || new Date().toISOString().slice(0, 10),
    termination_date: data.termination_date || null,

    // ── work info
    work_state:       workState,
    work_city:        data.work_city        || '',
    department:       data.department       || '',
    job_title:        data.job_title        || '',

    // ── classification
    flsa_status:      data.flsa_status      || 'non_exempt',
    pay_type:         data.pay_type         || 'hourly',
    employment_type:  data.employment_type  || 'full_time',

    // ── compensation
    pay_rate:         data.pay_rate != null  ? Number(data.pay_rate)      : 0,
    annual_salary:    data.annual_salary != null ? Number(data.annual_salary) : 0,
    pay_frequency:    data.pay_frequency    || 'bi_weekly',

    // ── federal W-4 (2020+ form)
    w4_federal:       { ..._defaultW4Federal(),   ...(data.w4_federal || {}) },

    // ── state W-4
    w4_state:         data.w4_state
                        ? { ..._defaultStateW4(workState), ...data.w4_state }
                        : _defaultStateW4(workState),

    // ── deductions
    deductions:       { ..._defaultDeductions(), ...(data.deductions || {}) },

    // ── direct deposit
    direct_deposit:   Array.isArray(data.direct_deposit) ? data.direct_deposit : _defaultDirectDeposit(),

    // ── YTD accumulators
    ytd:              { ..._defaultYTD(), ...(data.ytd || {}) },

    // ── meta
    created_at:       new Date().toISOString(),
    updated_at:       new Date().toISOString(),
  };

  return employee;
}

// ── validateEmployee ─────────────────────────────────────────

/**
 * Validate an employee object. Returns { valid, errors }.
 * @param {object} emp
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateEmployee(emp, isNew = true) {
  const errors = [];
  const warnings = [];

  // employee_id only required for updates, not creation (auto-generated)
  if (!isNew && !emp.employee_id)          errors.push('employee_id is required');
  if (!emp.first_name || !emp.first_name.trim())  errors.push('first_name is required');
  if (!emp.last_name  || !emp.last_name.trim())   errors.push('last_name is required');
  if (!emp.hire_date)                      errors.push('hire_date is required');

  // SSN last 4 format
  if (emp.ssn_last4 && !/^\d{4}$/.test(emp.ssn_last4)) {
    errors.push('ssn_last4 must be exactly 4 digits');
  }

  // work_state must be supported
  if (!SUPPORTED_STATES.includes(emp.work_state)) {
    errors.push(`work_state must be one of: ${SUPPORTED_STATES.join(', ')}`);
  }

  // classification enums
  if (!FLSA_STATUSES.includes(emp.flsa_status)) {
    errors.push(`flsa_status must be one of: ${FLSA_STATUSES.join(', ')}`);
  }
  if (!PAY_TYPES.includes(emp.pay_type)) {
    errors.push(`pay_type must be one of: ${PAY_TYPES.join(', ')}`);
  }
  if (!EMPLOYMENT_TYPES.includes(emp.employment_type)) {
    errors.push(`employment_type must be one of: ${EMPLOYMENT_TYPES.join(', ')}`);
  }
  if (!PAY_FREQUENCIES.includes(emp.pay_frequency)) {
    errors.push(`pay_frequency must be one of: ${PAY_FREQUENCIES.join(', ')}`);
  }

  // compensation
  if (emp.pay_type === 'hourly' && (emp.pay_rate == null || Number(emp.pay_rate) <= 0)) {
    errors.push('pay_rate must be greater than 0 for hourly employees');
  }
  if (emp.pay_type === 'salary' && (emp.annual_salary == null || Number(emp.annual_salary) <= 0)) {
    errors.push('annual_salary must be greater than 0 for salaried employees');
  }

  // W-4 federal filing status
  if (emp.w4_federal && !FILING_STATUSES.includes(emp.w4_federal.filing_status)) {
    errors.push(`w4_federal.filing_status must be one of: ${FILING_STATUSES.join(', ')}`);
  }

  // direct deposit validation
  if (Array.isArray(emp.direct_deposit)) {
    emp.direct_deposit.forEach((dd, i) => {
      if (!dd.bank_name)                         errors.push(`direct_deposit[${i}].bank_name is required`);
      if (!DEPOSIT_TYPES.includes(dd.type))      errors.push(`direct_deposit[${i}].type must be checking or savings`);
      if (!DEPOSIT_AMT_TYPES.includes(dd.amount_type)) errors.push(`direct_deposit[${i}].amount_type must be fixed, percent, or remainder`);
    });

    // only one "remainder" account allowed
    const remainders = emp.direct_deposit.filter((dd) => dd.amount_type === 'remainder');
    if (remainders.length > 1) {
      errors.push('Only one direct deposit account may use amount_type "remainder"');
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ── updateYTD ────────────────────────────────────────────────

/**
 * Roll pay-stub amounts into an employee's YTD accumulators.
 * Mutates `employee.ytd` in place and returns the updated ytd object.
 *
 * @param {object} employee - employee record (will be mutated)
 * @param {object} stubData - pay stub with numeric totals
 * @returns {object} updated ytd
 */
function updateYTD(employee, stubData) {
  const ytd = employee.ytd;

  ytd.gross_pay    += Number(stubData.gross_pay    || 0);
  ytd.federal_tax  += Number(stubData.federal_tax  || 0);
  ytd.ss_tax       += Number(stubData.ss_tax       || 0);
  ytd.ss_wages     += Number(stubData.ss_wages     || 0);
  ytd.medicare_tax += Number(stubData.medicare_tax || 0);
  ytd.state_tax    += Number(stubData.state_tax    || 0);
  ytd.local_tax    += Number(stubData.local_tax    || 0);
  ytd.futa_wages   += Number(stubData.futa_wages   || 0);
  ytd.suta_wages   += Number(stubData.suta_wages   || 0);

  // Round all YTD values to 2 decimal places to avoid float drift
  for (const key of Object.keys(ytd)) {
    ytd[key] = Math.round(ytd[key] * 100) / 100;
  }

  employee.updated_at = new Date().toISOString();
  return ytd;
}

// ── Seed the ID counter from an existing dataset ─────────────

/**
 * Call once at startup if loading employees from disk so that
 * createEmployee picks up where the last ID left off.
 * @param {object[]} existingEmployees
 */
function seedIdCounter(existingEmployees) {
  let max = 0;
  for (const emp of existingEmployees) {
    const match = /^EMP-(\d+)$/.exec(emp.employee_id);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > max) max = n;
    }
  }
  _nextId = max + 1;
}

// ── Exports ──────────────────────────────────────────────────

module.exports = {
  createEmployee,
  validateEmployee,
  updateYTD,
  seedIdCounter,
  SUPPORTED_STATES,
  FLSA_STATUSES,
  PAY_TYPES,
  EMPLOYMENT_TYPES,
  PAY_FREQUENCIES,
  FILING_STATUSES,
};
