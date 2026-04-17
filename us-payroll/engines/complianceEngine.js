/**
 * Compliance Checking Engine
 * Validates payroll against federal and state labor laws.
 */

'use strict';

// Optional data imports
let stateRules, employeeStore;
try { stateRules    = require('../data/stateRules');    } catch (_) { stateRules    = null; }
try { employeeStore = require('../data/employeeStore'); } catch (_) { employeeStore = null; }

// ---------------------------------------------------------------------------
// State minimum wages (2024 rates, $/hr)
// ---------------------------------------------------------------------------
const FEDERAL_MINIMUM_WAGE = 7.25;

const STATE_MINIMUM_WAGES = {
  AL: 7.25, AK: 11.73, AZ: 14.35, AR: 11.00, CA: 16.00,
  CO: 14.42, CT: 16.35, DE: 13.25, FL: 13.00, GA: 7.25,
  HI: 14.00, ID: 7.25, IL: 14.00, IN: 7.25, IA: 7.25,
  KS: 7.25, KY: 7.25, LA: 7.25, ME: 14.15, MD: 15.00,
  MA: 15.00, MI: 10.33, MN: 10.85, MS: 7.25, MO: 12.30,
  MT: 10.30, NE: 12.00, NV: 12.00, NH: 7.25, NJ: 15.49,
  NM: 12.00, NY: 15.00, NC: 7.25, ND: 7.25, OH: 10.45,
  OK: 7.25, OR: 14.70, PA: 7.25, RI: 14.00, SC: 7.25,
  SD: 11.20, TN: 7.25, TX: 7.25, UT: 7.25, VT: 13.67,
  VA: 12.41, WA: 16.28, WV: 8.75, WI: 7.25, WY: 7.25,
  DC: 17.50,
};

// ---------------------------------------------------------------------------
// State overtime rules
// ---------------------------------------------------------------------------
const OT_RULES_DEFAULT = { dailyThreshold: null, weeklyThreshold: 40 };

const STATE_OT_RULES = {
  // California: daily OT after 8 hrs, double-time after 12 hrs, weekly after 40
  CA: { dailyThreshold: 8, dailyDoubleTimeThreshold: 12, weeklyThreshold: 40, seventhDayRule: true },
  // Alaska: daily OT after 8 hrs, weekly after 40
  AK: { dailyThreshold: 8, weeklyThreshold: 40 },
  // Nevada: daily OT after 8 hrs if rate < 1.5x minimum wage
  NV: { dailyThreshold: 8, weeklyThreshold: 40, dailyCondition: 'belowMinWageThreshold' },
  // Colorado: daily OT after 12 hrs, weekly after 40
  CO: { dailyThreshold: 12, weeklyThreshold: 40 },
};

// ---------------------------------------------------------------------------
// State pay frequency requirements
// ---------------------------------------------------------------------------
const STATE_PAY_FREQUENCY_RULES = {
  // States requiring at least semimonthly pay
  AZ: { maxInterval: 'semimonthly' },
  CA: { maxInterval: 'semimonthly' },
  CT: { maxInterval: 'weekly' },
  DE: { maxInterval: 'monthly' },
  IL: { maxInterval: 'semimonthly' },
  MA: { maxInterval: 'biweekly' },
  MI: { maxInterval: 'monthly' },
  MN: { maxInterval: 'monthly' },
  NH: { maxInterval: 'biweekly' },
  NY: { maxInterval: 'semimonthly' },  // manual workers weekly, others semimonthly
  OH: { maxInterval: 'semimonthly' },
  VT: { maxInterval: 'biweekly' },
};

// Ranking for interval comparison (lower = more frequent)
const FREQUENCY_RANK = {
  weekly: 1,
  biweekly: 2,
  semimonthly: 3,
  monthly: 4,
  quarterly: 5,
  annually: 6,
};

// ---------------------------------------------------------------------------
// Minimum Wage Compliance
// ---------------------------------------------------------------------------

/**
 * Check if gross pay meets minimum wage for hours worked.
 *
 * @param {Object} employee    - { workState, ... }
 * @param {Object} hoursWorked - { regular, overtime, ... }
 * @param {number} grossPay    - total gross pay for the period
 * @returns {Object} { compliant, effectiveRate, minimumWage, state, details }
 */
function checkMinimumWage(employee, hoursWorked, grossPay) {
  if (!employee) throw new Error('Employee record is required');

  const state = (employee.workState || employee.state || '').toUpperCase();
  const hours = hoursWorked || {};

  // Total hours (all types)
  const totalHours = (hours.regular || 0) + (hours.overtime || 0) +
    (hours.doubleTime || 0) + (hours.holiday || 0) + (hours.pto || 0);

  if (totalHours === 0) {
    return { compliant: true, effectiveRate: null, minimumWage: null, state, details: 'No hours worked' };
  }

  // Look up minimum wage: use state rules data if available, then static table, then federal
  let minWage = FEDERAL_MINIMUM_WAGE;
  if (stateRules && stateRules.getMinimumWage) {
    minWage = stateRules.getMinimumWage(state) || minWage;
  } else if (STATE_MINIMUM_WAGES[state]) {
    minWage = STATE_MINIMUM_WAGES[state];
  }
  // Always use the higher of federal and state
  minWage = Math.max(minWage, FEDERAL_MINIMUM_WAGE);

  const effectiveRate = Math.round((grossPay / totalHours) * 100) / 100;
  const compliant = effectiveRate >= minWage;

  return {
    compliant,
    effectiveRate,
    minimumWage: minWage,
    state,
    totalHours,
    shortfall: compliant ? 0 : Math.round((minWage - effectiveRate) * totalHours * 100) / 100,
    details: compliant
      ? `Effective rate $${effectiveRate}/hr meets minimum wage $${minWage}/hr`
      : `Effective rate $${effectiveRate}/hr is BELOW minimum wage $${minWage}/hr`,
  };
}

// ---------------------------------------------------------------------------
// Overtime Compliance
// ---------------------------------------------------------------------------

/**
 * Check overtime compliance based on state rules.
 *
 * @param {Object} employee    - { workState, ... }
 * @param {Object} hoursWorked - { regular, overtime, dailyHours: [8,9,7,...], weeklyTotal }
 * @returns {Object} { compliant, issues[], state, rules }
 */
function checkOvertimeCompliance(employee, hoursWorked) {
  if (!employee) throw new Error('Employee record is required');

  const state = (employee.workState || employee.state || '').toUpperCase();
  const hours = hoursWorked || {};
  const issues = [];

  // Get OT rules for the state
  let rules;
  if (stateRules && stateRules.getOvertimeRules) {
    rules = stateRules.getOvertimeRules(state) || STATE_OT_RULES[state] || OT_RULES_DEFAULT;
  } else {
    rules = STATE_OT_RULES[state] || OT_RULES_DEFAULT;
  }

  // Exempt employees are not subject to OT rules
  if (employee.flsaStatus === 'exempt') {
    return { compliant: true, issues: [], state, rules, details: 'Employee is exempt from OT' };
  }

  // Weekly overtime check
  const weeklyTotal = hours.weeklyTotal || ((hours.regular || 0) + (hours.overtime || 0) + (hours.doubleTime || 0));
  if (rules.weeklyThreshold && weeklyTotal > rules.weeklyThreshold) {
    const otHours = weeklyTotal - rules.weeklyThreshold;
    const reportedOT = hours.overtime || 0;
    if (reportedOT < otHours) {
      issues.push({
        type: 'weekly_overtime',
        severity: 'error',
        message: `Employee worked ${weeklyTotal} hrs this week. ${otHours.toFixed(1)} hrs should be overtime (${rules.weeklyThreshold}hr threshold), but only ${reportedOT} hrs reported as OT.`,
        expectedOT: otHours,
        reportedOT,
      });
    }
  }

  // Daily overtime check (CA, AK, etc.)
  if (rules.dailyThreshold && Array.isArray(hours.dailyHours)) {
    for (let day = 0; day < hours.dailyHours.length; day++) {
      const dayHours = hours.dailyHours[day];

      // Double-time check (CA: after 12 hours in a day)
      if (rules.dailyDoubleTimeThreshold && dayHours > rules.dailyDoubleTimeThreshold) {
        const dtHours = dayHours - rules.dailyDoubleTimeThreshold;
        issues.push({
          type: 'daily_double_time',
          severity: 'error',
          day: day + 1,
          message: `Day ${day + 1}: ${dayHours} hrs worked. ${dtHours.toFixed(1)} hrs should be at double-time (>${rules.dailyDoubleTimeThreshold}hr threshold).`,
          doubleTimeHours: dtHours,
        });
      } else if (dayHours > rules.dailyThreshold) {
        // Daily OT
        const dailyOT = dayHours - rules.dailyThreshold;
        issues.push({
          type: 'daily_overtime',
          severity: 'warning',
          day: day + 1,
          message: `Day ${day + 1}: ${dayHours} hrs worked. ${dailyOT.toFixed(1)} hrs should be overtime (>${rules.dailyThreshold}hr daily threshold).`,
          overtimeHours: dailyOT,
        });
      }
    }
  }

  // 7th consecutive day rule (CA)
  if (rules.seventhDayRule && Array.isArray(hours.dailyHours) && hours.dailyHours.length >= 7) {
    const consecutiveDays = hours.dailyHours.filter(h => h > 0).length;
    if (consecutiveDays >= 7 && hours.dailyHours[6] > 0) {
      issues.push({
        type: 'seventh_day',
        severity: 'warning',
        message: `Employee worked 7 consecutive days. All hours on day 7 must be at overtime rate (first 8 hrs) or double-time (after 8 hrs) per ${state} law.`,
      });
    }
  }

  return {
    compliant: issues.filter(i => i.severity === 'error').length === 0,
    issues,
    state,
    rules,
    details: issues.length === 0 ? 'Overtime compliance passed' : `${issues.length} issue(s) found`,
  };
}

// ---------------------------------------------------------------------------
// Pay Frequency Compliance
// ---------------------------------------------------------------------------

/**
 * Check if the employee's pay frequency meets state requirements.
 *
 * @param {Object} employee - { workState, payFrequency }
 * @returns {Object} { compliant, required, actual, state }
 */
function checkPayFrequency(employee) {
  if (!employee) throw new Error('Employee record is required');

  const state = (employee.workState || employee.state || '').toUpperCase();
  const frequency = (employee.payFrequency || 'biweekly').toLowerCase();

  let rule;
  if (stateRules && stateRules.getPayFrequencyRule) {
    rule = stateRules.getPayFrequencyRule(state);
  }
  if (!rule) {
    rule = STATE_PAY_FREQUENCY_RULES[state];
  }

  // If no state-specific rule, any frequency is acceptable
  if (!rule) {
    return {
      compliant: true,
      required: null,
      actual: frequency,
      state,
      details: `${state} has no specific pay frequency requirement`,
    };
  }

  const requiredMax = rule.maxInterval;
  const actualRank = FREQUENCY_RANK[frequency] || 99;
  const requiredRank = FREQUENCY_RANK[requiredMax] || 99;
  const compliant = actualRank <= requiredRank;

  return {
    compliant,
    required: requiredMax,
    actual: frequency,
    state,
    details: compliant
      ? `Pay frequency "${frequency}" meets ${state} requirement (at least ${requiredMax})`
      : `Pay frequency "${frequency}" does NOT meet ${state} requirement of at least "${requiredMax}"`,
  };
}

// ---------------------------------------------------------------------------
// New Hire Validation
// ---------------------------------------------------------------------------

const REQUIRED_NEW_HIRE_FIELDS = [
  'firstName', 'lastName', 'ssn', 'dateOfBirth', 'address',
  'hireDate', 'w4', 'i9Completed', 'workState',
];

/**
 * Validate that an employee record has all required new-hire fields.
 *
 * @param {Object} employee
 * @returns {Object} { valid, missingFields[], warnings[] }
 */
function validateNewHire(employee) {
  if (!employee) throw new Error('Employee record is required');

  const missing = [];
  const warnings = [];

  for (const field of REQUIRED_NEW_HIRE_FIELDS) {
    if (employee[field] === undefined || employee[field] === null || employee[field] === '') {
      missing.push(field);
    }
  }

  // W-4 sub-field checks
  if (employee.w4) {
    if (!employee.w4.filingStatus) {
      warnings.push('W-4 filing status not specified, will default to Single');
    }
  }

  // I-9 completion check
  if (employee.i9Completed === false) {
    warnings.push('I-9 form not completed - must be completed within 3 business days of hire');
  }

  // State-specific forms
  const state = (employee.workState || '').toUpperCase();
  const stateFormRequirements = {
    CA: ['de4Completed'],   // California DE-4
    IL: ['il_w4Completed'], // Illinois W-4
    NY: ['it2104Completed'], // NY IT-2104
  };

  if (stateFormRequirements[state]) {
    for (const form of stateFormRequirements[state]) {
      if (!employee[form]) {
        warnings.push(`State form "${form}" required for ${state} but not completed`);
      }
    }
  }

  // Direct deposit validation
  if (!employee.bankAccount || !employee.bankAccount.routingNumber || !employee.bankAccount.accountNumber) {
    warnings.push('Bank account information missing - employee will need a paper check');
  }

  // E-Verify states
  const eVerifyRequired = ['AL', 'AZ', 'GA', 'MS', 'NC', 'SC', 'TN', 'UT'];
  if (eVerifyRequired.includes(state) && !employee.eVerifyCompleted) {
    warnings.push(`${state} requires E-Verify enrollment - not yet completed`);
  }

  return {
    valid: missing.length === 0,
    missingFields: missing,
    warnings,
    details: missing.length === 0
      ? `New hire validation passed with ${warnings.length} warning(s)`
      : `Missing ${missing.length} required field(s): ${missing.join(', ')}`,
  };
}

// ---------------------------------------------------------------------------
// Generate New Hire Report
// ---------------------------------------------------------------------------

/**
 * Generate data for state new-hire reporting (federally mandated within 20 days).
 *
 * @param {Object} employee
 * @returns {Object} New hire report data
 */
function generateNewHireReport(employee) {
  if (!employee) throw new Error('Employee record is required');

  const state = (employee.workState || employee.state || '').toUpperCase();

  // Federal new hire reporting fields (required by all states)
  const report = {
    reportType: 'NEW_HIRE',
    reportingState: state,
    employer: {
      ein: employee.employerEIN || null,
      name: employee.employerName || null,
      address: employee.employerAddress || null,
    },
    employee: {
      firstName: employee.firstName || null,
      lastName: employee.lastName || null,
      ssn: employee.ssn ? maskSSN(employee.ssn) : null,
      ssnFull: employee.ssn || null,  // for actual submission
      address: employee.address || null,
      dateOfBirth: employee.dateOfBirth || null,
      hireDate: employee.hireDate || null,
      state,
    },
    dueDate: calculateDueDate(employee.hireDate, state),
    generatedAt: new Date().toISOString(),
  };

  // Some states require additional fields
  if (['CA', 'NY', 'IL'].includes(state)) {
    report.employee.healthInsuranceAvailable = employee.healthInsuranceOffered || false;
  }

  return report;
}

/**
 * Mask SSN for display (show last 4 only).
 */
function maskSSN(ssn) {
  const digits = ssn.replace(/\D/g, '');
  if (digits.length < 4) return '***-**-****';
  return `***-**-${digits.slice(-4)}`;
}

/**
 * Calculate the due date for new-hire reporting.
 * Federal law: 20 days from hire. Some states have shorter windows.
 */
function calculateDueDate(hireDate, state) {
  if (!hireDate) return null;

  const hire = new Date(hireDate);
  if (isNaN(hire.getTime())) return null;

  // State-specific windows (days from hire)
  const stateWindows = {
    AZ: 20, CA: 20, CO: 20, CT: 20, FL: 20,
    GA: 10, IL: 20, IN: 20, KS: 20, MD: 20,
    MN: 20, NJ: 20, NY: 20, OH: 20, PA: 20,
    TX: 20, VA: 20, WA: 20,
  };

  const days = stateWindows[state] || 20;
  const due = new Date(hire);
  due.setDate(due.getDate() + days);
  return due.toISOString().split('T')[0];
}

// ---------------------------------------------------------------------------
// Full Compliance Check for a Pay Run
// ---------------------------------------------------------------------------

/**
 * Run all compliance checks for a pay run.
 *
 * @param {Object} payRun - { id, employees: [{ employee, hoursWorked, grossPay }], payPeriod }
 *                          OR a payRunId string (loads from store)
 * @returns {Object} { payRunId, issues[], summary }
 */
function runComplianceCheck(payRun) {
  if (typeof payRun === 'string') {
    if (employeeStore && employeeStore.getPayRun) {
      payRun = employeeStore.getPayRun(payRun);
    } else {
      throw new Error(`Cannot load pay run "${payRun}" - no employee store available`);
    }
  }

  if (!payRun || !payRun.employees || !Array.isArray(payRun.employees)) {
    throw new Error('payRun must include an employees array');
  }

  const allIssues = [];
  let errorCount = 0;
  let warningCount = 0;

  for (const entry of payRun.employees) {
    const employee = entry.employee || entry;
    const hoursWorked = entry.hoursWorked || entry.hours || {};
    const grossPay = entry.grossPay || 0;
    const empId = employee.id || employee.employeeId;
    const empName = [employee.firstName, employee.lastName].filter(Boolean).join(' ');

    // Minimum wage check
    try {
      const mwResult = checkMinimumWage(employee, hoursWorked, grossPay);
      if (!mwResult.compliant) {
        allIssues.push({
          employeeId: empId,
          employeeName: empName,
          checkType: 'minimum_wage',
          severity: 'error',
          details: mwResult.details,
          data: mwResult,
        });
        errorCount++;
      }
    } catch (err) {
      allIssues.push({
        employeeId: empId,
        employeeName: empName,
        checkType: 'minimum_wage',
        severity: 'error',
        details: `Check failed: ${err.message}`,
      });
      errorCount++;
    }

    // Overtime compliance
    try {
      const otResult = checkOvertimeCompliance(employee, hoursWorked);
      for (const issue of otResult.issues) {
        allIssues.push({
          employeeId: empId,
          employeeName: empName,
          checkType: 'overtime',
          severity: issue.severity,
          details: issue.message,
          data: issue,
        });
        if (issue.severity === 'error') errorCount++;
        else warningCount++;
      }
    } catch (err) {
      allIssues.push({
        employeeId: empId,
        employeeName: empName,
        checkType: 'overtime',
        severity: 'error',
        details: `Check failed: ${err.message}`,
      });
      errorCount++;
    }

    // Pay frequency
    try {
      const pfResult = checkPayFrequency(employee);
      if (!pfResult.compliant) {
        allIssues.push({
          employeeId: empId,
          employeeName: empName,
          checkType: 'pay_frequency',
          severity: 'error',
          details: pfResult.details,
          data: pfResult,
        });
        errorCount++;
      }
    } catch (err) {
      allIssues.push({
        employeeId: empId,
        employeeName: empName,
        checkType: 'pay_frequency',
        severity: 'error',
        details: `Check failed: ${err.message}`,
      });
      errorCount++;
    }
  }

  return {
    payRunId: payRun.id || null,
    checkedAt: new Date().toISOString(),
    summary: {
      totalEmployees: payRun.employees.length,
      totalIssues: allIssues.length,
      errors: errorCount,
      warnings: warningCount,
      compliant: errorCount === 0,
    },
    issues: allIssues,
  };
}

module.exports = {
  checkMinimumWage,
  checkOvertimeCompliance,
  checkPayFrequency,
  validateNewHire,
  runComplianceCheck,
  generateNewHireReport,
  // Expose constants for testing
  STATE_MINIMUM_WAGES,
  FEDERAL_MINIMUM_WAGE,
  STATE_OT_RULES,
};
