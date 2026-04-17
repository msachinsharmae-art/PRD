// ─────────────────────────────────────────────────────────────
//  pay-run.js  -  Pay Run model for US payroll
// ─────────────────────────────────────────────────────────────
const fs   = require('fs');
const path = require('path');

// ── Constants ────────────────────────────────────────────────

const PAY_RUN_STATUSES = ['draft', 'calculating', 'review', 'approved', 'finalized'];

// ── ID counter ───────────────────────────────────────────────
let _nextSeq = 1;

function _padSeq(n) {
  return String(n).padStart(4, '0');
}

// ── Default totals ───────────────────────────────────────────

function _defaultTotals() {
  return {
    total_gross:            0,
    total_net:              0,
    total_federal_tax:      0,
    total_state_tax:        0,
    total_ss_employer:      0,
    total_medicare_employer:0,
    total_futa:             0,
    total_suta:             0,
    total_employer_cost:    0,
  };
}

// ── createPayRun ─────────────────────────────────────────────

/**
 * Build a new pay-run record.
 * Auto-generates an ID like "PR-2026-0001".
 *
 * @param {object} data - partial pay-run fields
 * @returns {object} fully-formed pay-run record
 */
function createPayRun(data = {}) {
  const year = data.pay_date
    ? new Date(data.pay_date).getFullYear()
    : new Date().getFullYear();

  const id = `PR-${year}-${_padSeq(_nextSeq++)}`;

  const payRun = {
    pay_run_id:       id,
    state:            data.state            || null,
    pay_period_start: data.pay_period_start || null,
    pay_period_end:   data.pay_period_end   || null,
    pay_date:         data.pay_date         || null,
    pay_frequency:    data.pay_frequency    || 'bi_weekly',
    status:           data.status           || 'draft',

    // ── employee & stub references
    employees:        Array.isArray(data.employees) ? [...data.employees] : [],
    stubs:            Array.isArray(data.stubs)     ? [...data.stubs]     : [],

    // ── aggregate totals (populated after calculation)
    totals:           { ..._defaultTotals(), ...(data.totals || {}) },

    // ── meta
    created_at:       new Date().toISOString(),
    updated_at:       new Date().toISOString(),
  };

  return payRun;
}

// ── seedPayRunCounter ────────────────────────────────────────

/**
 * Call once at startup if loading pay runs from disk so that
 * createPayRun picks up where the last sequence left off.
 * @param {object[]} existingRuns
 */
function seedPayRunCounter(existingRuns) {
  let max = 0;
  for (const run of existingRuns) {
    const match = /^PR-\d{4}-(\d+)$/.exec(run.pay_run_id);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > max) max = n;
    }
  }
  _nextSeq = max + 1;
}

// ── Exports ──────────────────────────────────────────────────

module.exports = {
  createPayRun,
  seedPayRunCounter,
  PAY_RUN_STATUSES,
};
