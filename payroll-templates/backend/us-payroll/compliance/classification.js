/**
 * Employee Classification Module
 * Validates exempt vs non-exempt, employee vs contractor (AB5)
 */

// 2026 Federal exempt salary threshold
const FEDERAL_EXEMPT_THRESHOLD = {
  weekly: 684,
  annual: 35568
};

// State-specific exempt thresholds (override federal if higher)
const STATE_EXEMPT_THRESHOLDS = {
  CA: {
    // 2x state minimum wage × 2080 hours
    annual: 70304, // 2 × $16.90 × 2080
    weekly: 1352,
    computer_professional_hourly: 53.80,
    computer_professional_annual: 112065.20
  },
  TX: {
    annual: FEDERAL_EXEMPT_THRESHOLD.annual,
    weekly: FEDERAL_EXEMPT_THRESHOLD.weekly
  },
  FL: {
    annual: FEDERAL_EXEMPT_THRESHOLD.annual,
    weekly: FEDERAL_EXEMPT_THRESHOLD.weekly
  },
  WA: {
    // Washington has its own thresholds
    large_employer: { annual: 67724.80, weekly: 1302.40 },
    small_employer: { annual: 61776, weekly: 1188 },
    computer_professional_hourly: 55.09
  },
  NY: {
    nyc: { annual: 62400, weekly: 1200 },
    long_island: { annual: 62400, weekly: 1200 },
    westchester: { annual: 62400, weekly: 1200 },
    rest_of_state: { annual: 58458.40, weekly: 1124.20 }
  },
  GA: {
    annual: FEDERAL_EXEMPT_THRESHOLD.annual,
    weekly: FEDERAL_EXEMPT_THRESHOLD.weekly
  }
};

const EXEMPT_DUTIES_CATEGORIES = [
  'executive',       // Manages enterprise/department, supervises 2+ employees
  'administrative',  // Non-manual work, exercises discretion
  'professional',    // Advanced knowledge, science/learning
  'computer',        // Systems analyst, programmer, software engineer
  'outside_sales',   // Regularly away from office making sales
  'highly_compensated' // $107,432+ annual with at least one exempt duty
];

/**
 * Get applicable exempt salary threshold for an employee
 */
function getExemptThreshold(state, city, employerSize) {
  const stateThreshold = STATE_EXEMPT_THRESHOLDS[state];
  if (!stateThreshold) return FEDERAL_EXEMPT_THRESHOLD;

  // State-specific logic
  if (state === 'WA') {
    const tier = (employerSize && employerSize > 50) ? 'large_employer' : 'small_employer';
    return stateThreshold[tier] || FEDERAL_EXEMPT_THRESHOLD;
  }

  if (state === 'NY') {
    if (city) {
      const cityLower = city.toLowerCase();
      if (cityLower.includes('new york') || cityLower.includes('nyc') || cityLower.includes('manhattan') ||
          cityLower.includes('brooklyn') || cityLower.includes('queens') || cityLower.includes('bronx') ||
          cityLower.includes('staten island')) {
        return stateThreshold.nyc;
      }
      if (cityLower.includes('long island') || cityLower.includes('nassau') || cityLower.includes('suffolk')) {
        return stateThreshold.long_island;
      }
      if (cityLower.includes('westchester')) {
        return stateThreshold.westchester;
      }
    }
    return stateThreshold.rest_of_state;
  }

  // For CA, TX, FL, GA — single threshold
  return { annual: stateThreshold.annual, weekly: stateThreshold.weekly };
}

/**
 * Validate exempt classification
 */
function validateExemptClassification(employee, employerSize) {
  const warnings = [];
  const errors = [];

  if (employee.flsa_status !== 'exempt') return { warnings, errors };

  const threshold = getExemptThreshold(employee.work_state, employee.work_city, employerSize);
  const annualSalary = employee.annual_salary ||
    (employee.pay_rate * ({ weekly: 52, bi_weekly: 26, semi_monthly: 24, monthly: 12 }[employee.pay_frequency] || 24));

  // Salary basis test
  if (employee.pay_type === 'hourly') {
    // Computer professional exemption allows hourly in some states
    if (employee.work_state === 'CA' && employee.exempt_category === 'computer') {
      if (employee.pay_rate < STATE_EXEMPT_THRESHOLDS.CA.computer_professional_hourly) {
        errors.push({
          code: 'EXEMPT_COMPUTER_RATE',
          message: `Computer professional hourly rate $${employee.pay_rate} is below CA threshold of $${STATE_EXEMPT_THRESHOLDS.CA.computer_professional_hourly}`,
          severity: 'error'
        });
      }
    } else {
      errors.push({
        code: 'EXEMPT_NOT_SALARIED',
        message: 'Exempt employees must generally be paid on a salary basis, not hourly',
        severity: 'error'
      });
    }
  }

  // Salary level test
  if (threshold && annualSalary < threshold.annual) {
    errors.push({
      code: 'EXEMPT_SALARY_BELOW_THRESHOLD',
      message: `Annual salary $${annualSalary.toFixed(2)} is below the exempt threshold of $${threshold.annual.toFixed(2)} for ${employee.work_state}`,
      severity: 'error',
      required_minimum: threshold.annual,
      current_salary: annualSalary
    });
  }

  // Duties test warning (cannot validate programmatically - needs human review)
  if (!employee.exempt_category || !EXEMPT_DUTIES_CATEGORIES.includes(employee.exempt_category)) {
    warnings.push({
      code: 'EXEMPT_DUTIES_UNVERIFIED',
      message: 'Exempt duties test has not been verified. Please ensure employee meets executive, administrative, or professional duties test.',
      severity: 'warning'
    });
  }

  return { warnings, errors, threshold };
}

/**
 * Validate worker classification (W-2 vs 1099)
 * AB5 warning for California
 */
function validateWorkerClassification(employee) {
  const warnings = [];

  if (employee.worker_type === '1099' && employee.work_state === 'CA') {
    warnings.push({
      code: 'AB5_RISK',
      message: 'California AB5 law requires the ABC test for independent contractors. Ensure: (A) Worker is free from control, (B) Work is outside usual business, (C) Worker has independently established trade.',
      severity: 'warning'
    });
  }

  return { warnings };
}

module.exports = {
  FEDERAL_EXEMPT_THRESHOLD,
  STATE_EXEMPT_THRESHOLDS,
  EXEMPT_DUTIES_CATEGORIES,
  getExemptThreshold,
  validateExemptClassification,
  validateWorkerClassification
};
