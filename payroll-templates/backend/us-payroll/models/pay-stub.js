// ─────────────────────────────────────────────────────────────
//  pay-stub.js  -  Pay Stub model for US payroll
// ─────────────────────────────────────────────────────────────
const fs   = require('fs');
const path = require('path');

// ── ID counter ───────────────────────────────────────────────
let _nextSeq = 1;

function _padSeq(n) {
  return String(n).padStart(6, '0');
}

// ── Default sub-structures ───────────────────────────────────

function _defaultHours() {
  return {
    regular:       0,
    overtime:      0,
    double_time:   0,
    holiday:       0,
    pto:           0,
    sick:          0,
    total:         0,
  };
}

function _defaultEarnings() {
  return {
    regular_pay:       0,
    overtime_pay:      0,
    double_time_pay:   0,
    holiday_pay:       0,
    pto_pay:           0,
    sick_pay:          0,
    commission:        0,
    bonus:             0,
    tips:              0,
    reimbursement:     0,   // non-taxable
    other:             0,
    gross_pay:         0,
  };
}

function _defaultPreTaxDeductions() {
  return {
    retirement_401k:    0,
    roth_401k:          0,
    health_insurance:   0,
    dental_insurance:   0,
    vision_insurance:   0,
    hsa:                0,
    fsa:                0,
    total_pre_tax:      0,
  };
}

function _defaultTaxes() {
  return {
    // ── federal
    federal_income:     0,
    social_security:    0,   // employee share (6.2 %)
    medicare:           0,   // employee share (1.45 %)
    additional_medicare:0,   // 0.9 % over $200 k

    // ── state (itemized by state)
    state_income:       0,
    state_disability:   0,   // e.g. CA SDI
    state_family_leave: 0,   // e.g. CA PFL, NY PFL

    // ── local
    local_tax:          0,   // e.g. NYC, Yonkers

    total_taxes:        0,
  };
}

function _defaultPostTaxDeductions() {
  return {
    garnishments:       0,
    roth_ira:           0,
    union_dues:         0,
    other:              0,
    total_post_tax:     0,
  };
}

function _defaultYTDSnapshot() {
  return {
    gross_pay:    0,
    federal_tax:  0,
    ss_tax:       0,
    ss_wages:     0,
    medicare_tax: 0,
    state_tax:    0,
    local_tax:    0,
    net_pay:      0,
  };
}

function _defaultEmployerTaxes() {
  return {
    ss_employer:       0,   // 6.2 %
    medicare_employer: 0,   // 1.45 %
    futa:              0,   // 0.6 % (after credit)
    suta:              0,   // state-specific
    total_employer:    0,
  };
}

// ── createPayStub ────────────────────────────────────────────

/**
 * Build a new pay-stub record with all sections defaulted.
 * Auto-generates a stub_id like "STUB-000001".
 *
 * @param {object} data - partial pay-stub fields (overrides defaults)
 * @returns {object} fully-formed pay-stub record
 */
function createPayStub(data = {}) {
  const id = `STUB-${_padSeq(_nextSeq++)}`;

  const stub = {
    stub_id:            id,
    pay_run_id:         data.pay_run_id         || null,
    employee_id:        data.employee_id        || null,

    // ── period info
    pay_period_start:   data.pay_period_start   || null,
    pay_period_end:     data.pay_period_end     || null,
    pay_date:           data.pay_date           || null,
    work_state:         data.work_state         || null,

    // ── hours breakdown
    hours:              { ..._defaultHours(),              ...(data.hours || {}) },

    // ── earnings breakdown
    earnings:           { ..._defaultEarnings(),           ...(data.earnings || {}) },

    // ── pre-tax deductions
    pre_tax_deductions: { ..._defaultPreTaxDeductions(),   ...(data.pre_tax_deductions || {}) },

    // ── taxes (employee)
    taxes:              { ..._defaultTaxes(),              ...(data.taxes || {}) },

    // ── post-tax deductions
    post_tax_deductions:{ ..._defaultPostTaxDeductions(),  ...(data.post_tax_deductions || {}) },

    // ── net pay
    net_pay:            data.net_pay != null ? Number(data.net_pay) : 0,

    // ── YTD snapshot (after this pay period)
    ytd_snapshot:       { ..._defaultYTDSnapshot(),        ...(data.ytd_snapshot || {}) },

    // ── employer-side taxes
    employer_taxes:     { ..._defaultEmployerTaxes(),      ...(data.employer_taxes || {}) },

    // ── meta
    created_at:         new Date().toISOString(),
  };

  return stub;
}

// ── seedStubCounter ──────────────────────────────────────────

/**
 * Call once at startup if loading stubs from disk so that
 * createPayStub picks up where the last sequence left off.
 * @param {object[]} existingStubs
 */
function seedStubCounter(existingStubs) {
  let max = 0;
  for (const s of existingStubs) {
    const match = /^STUB-(\d+)$/.exec(s.stub_id);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > max) max = n;
    }
  }
  _nextSeq = max + 1;
}

// ── Exports ──────────────────────────────────────────────────

module.exports = {
  createPayStub,
  seedStubCounter,
};
