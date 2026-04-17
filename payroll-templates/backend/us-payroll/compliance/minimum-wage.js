/**
 * Minimum Wage Compliance Module
 * Validates employee pay rates against federal, state, and local minimums
 */

const FEDERAL_MINIMUM_WAGE = 7.25;

// State minimum wages (2026 rates)
const STATE_MINIMUM_WAGES = {
  CA: {
    state: 16.90,
    industries: {
      fast_food: 20.00,
      healthcare: 25.00
    },
    local: {
      'Los Angeles': 17.28,
      'San Francisco': 18.67,
      'San Jose': 17.55,
      'Santa Monica': 17.27,
      'Sunnyvale': 19.65,
      'Berkeley': 18.67
    }
  },
  TX: {
    state: 7.25, // follows federal
    tipped: 2.13,
    local: {} // TX prohibits local minimum wages
  },
  FL: {
    state: 15.00, // effective Sept 30, 2026
    tipped: 11.98,
    local: {} // no local overrides
  },
  WA: {
    state: 16.66, // 2025 indexed, approximate 2026
    youth: 14.16, // 85% of state min
    local: {
      'Seattle': 19.97,
      'SeaTac': 19.71,
      'Tukwila': 20.29,
      'Renton': 20.29
    }
  },
  NY: {
    state: 16.00, // rest of state 2026
    local: {
      'New York City': 17.00,
      'Long Island': 17.00,
      'Westchester': 17.00
    },
    tipped_food_service: {
      'New York City': 10.65,
      'Long Island': 10.65,
      'Westchester': 10.65,
      default: 10.00
    }
  },
  GA: {
    state: 5.15, // GA state minimum (most employers use federal)
    federal_applies: true, // most employers covered by FLSA
    tipped: 2.13,
    local: {} // GA prohibits local minimum wages
  }
};

/**
 * Get the applicable minimum wage for an employee
 * Returns the highest of federal, state, industry, and local minimums
 */
function getApplicableMinimumWage(state, city, industry) {
  const stateConfig = STATE_MINIMUM_WAGES[state];
  if (!stateConfig) return FEDERAL_MINIMUM_WAGE;

  let applicable = Math.max(FEDERAL_MINIMUM_WAGE, stateConfig.state);

  // Check industry-specific minimums
  if (stateConfig.industries && industry && stateConfig.industries[industry]) {
    applicable = Math.max(applicable, stateConfig.industries[industry]);
  }

  // Check local minimums
  if (city && stateConfig.local) {
    for (const [locality, wage] of Object.entries(stateConfig.local)) {
      if (city.toLowerCase().includes(locality.toLowerCase()) ||
          locality.toLowerCase().includes(city.toLowerCase())) {
        applicable = Math.max(applicable, wage);
      }
    }
  }

  return applicable;
}

/**
 * Validate that an employee's pay rate meets minimum wage requirements
 */
function validateMinimumWage(employee) {
  const warnings = [];
  const errors = [];

  const minWage = getApplicableMinimumWage(
    employee.work_state,
    employee.work_city,
    employee.industry
  );

  if (employee.pay_type === 'hourly') {
    if (employee.pay_rate < minWage) {
      errors.push({
        code: 'MIN_WAGE_VIOLATION',
        message: `Hourly rate $${employee.pay_rate.toFixed(2)} is below the applicable minimum wage of $${minWage.toFixed(2)} for ${employee.work_city || employee.work_state}`,
        severity: 'error',
        applicable_minimum: minWage,
        current_rate: employee.pay_rate
      });
    } else if (employee.pay_rate < minWage * 1.05) {
      warnings.push({
        code: 'MIN_WAGE_NEAR',
        message: `Hourly rate $${employee.pay_rate.toFixed(2)} is within 5% of minimum wage ($${minWage.toFixed(2)})`,
        severity: 'warning'
      });
    }
  }

  if (employee.pay_type === 'salary') {
    const payPeriodsPerYear = { weekly: 52, bi_weekly: 26, semi_monthly: 24, monthly: 12 };
    const periods = payPeriodsPerYear[employee.pay_frequency] || 24;
    const annualSalary = employee.annual_salary || (employee.pay_rate * periods);
    // Assuming 2080 hours/year for salary-to-hourly conversion
    const effectiveHourly = annualSalary / 2080;

    if (effectiveHourly < minWage) {
      errors.push({
        code: 'MIN_WAGE_SALARY_VIOLATION',
        message: `Annual salary $${annualSalary.toFixed(2)} converts to $${effectiveHourly.toFixed(2)}/hr, below minimum wage of $${minWage.toFixed(2)}`,
        severity: 'error',
        effective_hourly: effectiveHourly,
        applicable_minimum: minWage
      });
    }
  }

  return { warnings, errors, applicable_minimum_wage: minWage };
}

module.exports = {
  FEDERAL_MINIMUM_WAGE,
  STATE_MINIMUM_WAGES,
  getApplicableMinimumWage,
  validateMinimumWage
};
