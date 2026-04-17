/**
 * US State Compliance Rules - 2026
 * Covers: CA, NY, TX, NJ, WA, IL
 */

const STATE_COMPLIANCE = {

  // =========================================================================
  // CALIFORNIA
  // =========================================================================
  CA: {
    name: 'California',
    minimumWage: {
      standard: 16.50,
      tipped: 16.50, // CA has no tip credit - full minimum wage
      effectiveDate: '2026-01-01',
      notes: 'CA does not allow tip credit. Some cities have higher local minimums.',
    },
    overtime: {
      type: 'daily_and_weekly',
      dailyThreshold: 8,           // OT after 8 hours/day
      dailyDoubleThreshold: 12,    // Double time after 12 hours/day
      weeklyThreshold: 40,         // OT after 40 hours/week
      seventhConsecutiveDay: true,  // First 8 hrs at 1.5x, after 8 hrs at 2x
      overtimeRate: 1.5,
      doubleTimeRate: 2.0,
      notes: 'California requires daily overtime. First 8 hours on the 7th consecutive day paid at 1.5x.',
    },
    paidSickLeave: {
      required: true,
      accrualRate: '1 hour per 30 hours worked',
      annualCap: 80,              // hours (updated 2024+)
      usageCap: 40,               // hours per year minimum usage allowed
      carryover: true,
      carryoverCap: 80,
      waitingPeriod: '90 days of employment',
      notes: 'CA Healthy Workplaces, Healthy Families Act. Expanded in 2024.',
    },
    newHireReporting: {
      deadline: '20 days from hire or first day of work',
      agency: 'Employment Development Department (EDD)',
      method: 'Electronic or paper (DE 34)',
      penaltyForLate: '$24 per late report, $490 if conspiracy',
    },
    payFrequency: {
      allowed: ['weekly', 'biweekly', 'semimonthly'],
      notes: 'Semimonthly: wages earned 1st-15th paid by 26th; 16th-last paid by 10th of following month.',
      overtimePayDeadline: 'Next regular payday after the payroll period in which overtime was earned.',
    },
    finalPay: {
      involuntaryTermination: 'Immediately at time of termination',
      voluntaryResignation: '72 hours (immediately if 72+ hours notice given)',
      penalty: 'Waiting time penalty: full day wages for each day late, up to 30 days',
    },
    mealBreaks: {
      required: true,
      firstMeal: { afterHours: 5, duration: 30, paid: false },
      secondMeal: { afterHours: 10, duration: 30, paid: false },
      penalty: '1 hour of pay at regular rate for each violation',
      notes: 'Must be relieved of all duties. On-duty meal period allowed only if nature of work prevents relief.',
    },
    restBreaks: {
      required: true,
      frequency: '10 minutes per 4 hours worked (or major fraction thereof)',
      paid: true,
      penalty: '1 hour of pay at regular rate for each violation',
    },
    workersComp: {
      required: true,
      coverageType: 'All employees from day one',
      notes: 'Must be obtained from licensed insurer or through self-insurance. No minimum employee count.',
    },
  },

  // =========================================================================
  // NEW YORK
  // =========================================================================
  NY: {
    name: 'New York',
    minimumWage: {
      standard: 16.00,
      tipped: {
        foodService: 10.65, // tip credit allowed
        serviceEmployees: 13.35,
      },
      effectiveDate: '2026-01-01',
      notes: 'NYC, Long Island, and Westchester may have same rate (unified in 2024+). Tip credits apply to food service workers.',
    },
    overtime: {
      type: 'weekly',
      weeklyThreshold: 40,
      overtimeRate: 1.5,
      notes: 'Standard FLSA weekly overtime. Residential employees: OT after 44 hours.',
    },
    paidSickLeave: {
      required: true,
      accrualRate: '1 hour per 30 hours worked',
      annualCap: null, // depends on employer size
      tiers: [
        { employeeCount: '1-4, net income <= $1M', hours: 40, paid: false },
        { employeeCount: '1-4, net income > $1M', hours: 40, paid: true },
        { employeeCount: '5-99', hours: 40, paid: true },
        { employeeCount: '100+', hours: 56, paid: true },
      ],
      carryover: true,
      waitingPeriod: 'None - can use as accrued',
    },
    newHireReporting: {
      deadline: '20 days from hire',
      agency: 'New York State Department of Taxation and Finance',
      method: 'Electronic (preferred) or Form IT-2104',
      penaltyForLate: '$20 per late report',
    },
    payFrequency: {
      allowed: ['weekly', 'biweekly', 'semimonthly'],
      notes: 'Manual workers must be paid weekly. Clerical/other can be semimonthly with DOL permission.',
      manualWorkers: 'Must be paid weekly (within 7 days of end of pay period).',
    },
    finalPay: {
      involuntaryTermination: 'Next regular payday',
      voluntaryResignation: 'Next regular payday',
      penalty: 'Liquidated damages up to 100% of unpaid wages plus attorney fees',
    },
    mealBreaks: {
      required: true,
      factoryWorkers: { afterHours: 6, duration: 60, paid: false },
      nonFactoryWorkers: { afterHours: 6, duration: 30, paid: false },
      notes: 'Additional meal period if shift spans specific time windows (11am-2pm, 7pm-midnight).',
    },
    restBreaks: {
      required: false,
      notes: 'No state-mandated rest breaks (except for specific industries). FLSA applies.',
    },
    workersComp: {
      required: true,
      coverageType: 'All employees including part-time',
      notes: 'Obtained through NY State Insurance Fund, private carriers, or self-insurance.',
    },
  },

  // =========================================================================
  // TEXAS
  // =========================================================================
  TX: {
    name: 'Texas',
    minimumWage: {
      standard: 7.25, // Federal minimum wage (TX follows federal)
      tipped: 2.13,
      effectiveDate: '2026-01-01',
      notes: 'Texas follows the federal minimum wage. Tip credit allowed.',
    },
    overtime: {
      type: 'weekly',
      weeklyThreshold: 40,
      overtimeRate: 1.5,
      notes: 'Standard FLSA weekly overtime rules apply. No additional state requirements.',
    },
    paidSickLeave: {
      required: false,
      notes: 'No statewide paid sick leave law. Some cities (Austin, Dallas, San Antonio) passed ordinances but enforcement varies due to legal challenges.',
    },
    newHireReporting: {
      deadline: '20 days from hire or first day of work',
      agency: 'Texas Attorney General - New Hire Reporting',
      method: 'Electronic or paper',
      penaltyForLate: '$25 per late report; $500 if conspiracy between employer and employee',
    },
    payFrequency: {
      allowed: ['weekly', 'biweekly', 'semimonthly', 'monthly'],
      notes: 'Employers may choose any frequency. Exempt employees can be paid monthly. Non-exempt at least semimonthly.',
    },
    finalPay: {
      involuntaryTermination: '6 calendar days after termination',
      voluntaryResignation: 'Next regular payday',
      penalty: 'Employees may file wage claims with TWC. Employer may owe additional damages.',
    },
    mealBreaks: {
      required: false,
      notes: 'No state meal break requirement. FLSA rules apply (if break given, <20 min is paid).',
    },
    restBreaks: {
      required: false,
      notes: 'No state rest break requirement.',
    },
    workersComp: {
      required: false,
      coverageType: 'Optional (non-subscriber state)',
      notes: 'Texas is the only state where workers comp is optional. Non-subscribers lose certain legal protections.',
    },
  },

  // =========================================================================
  // NEW JERSEY
  // =========================================================================
  NJ: {
    name: 'New Jersey',
    minimumWage: {
      standard: 15.49,
      tipped: 5.62,
      effectiveDate: '2026-01-01',
      notes: 'Annual CPI adjustments. Seasonal and small employers (<6 employees) may have slightly lower rates.',
    },
    overtime: {
      type: 'weekly',
      weeklyThreshold: 40,
      overtimeRate: 1.5,
      notes: 'NJ follows FLSA standards. State law mirrors federal exemptions.',
    },
    paidSickLeave: {
      required: true,
      accrualRate: '1 hour per 30 hours worked',
      annualCap: 40,
      carryover: true,
      carryoverCap: 40,
      waitingPeriod: '120 days from hire to begin using',
      notes: 'NJ Earned Sick Leave Law. All employers, regardless of size.',
    },
    newHireReporting: {
      deadline: '20 days from hire',
      agency: 'New Jersey Department of Treasury',
      method: 'Electronic or Form NJ-W4',
      penaltyForLate: '$25 per late report',
    },
    payFrequency: {
      allowed: ['weekly', 'biweekly', 'semimonthly'],
      notes: 'Must pay at least twice per month. Wages due within 10 days of end of pay period.',
    },
    finalPay: {
      involuntaryTermination: 'Next regular payday',
      voluntaryResignation: 'Next regular payday',
      penalty: 'NJDOL can order payment plus liquidated damages and penalties.',
    },
    mealBreaks: {
      required: false,
      notes: 'No state meal break law for adult workers. Minors under 18 must receive a 30-minute break after 5 consecutive hours.',
    },
    restBreaks: {
      required: false,
      notes: 'No state rest break requirement for adults.',
    },
    workersComp: {
      required: true,
      coverageType: 'All employees',
      notes: 'Must obtain through private carrier or self-insurance approved by NJ DOL.',
    },
  },

  // =========================================================================
  // WASHINGTON
  // =========================================================================
  WA: {
    name: 'Washington',
    minimumWage: {
      standard: 16.66,
      tipped: 16.66, // WA has no tip credit
      effectiveDate: '2026-01-01',
      notes: 'WA does not allow tip credit. Annual CPI adjustments. Seattle and SeaTac may have higher local rates.',
    },
    overtime: {
      type: 'weekly',
      weeklyThreshold: 40,
      overtimeRate: 1.5,
      notes: 'Agricultural workers phased into OT requirements. Salaried workers phased into eligibility via multiplier threshold.',
    },
    paidSickLeave: {
      required: true,
      accrualRate: '1 hour per 40 hours worked',
      annualCap: null, // no cap on accrual
      carryover: true,
      carryoverCap: 40, // reasonable carryover
      waitingPeriod: '90 days from hire',
      notes: 'WA Paid Sick Leave law (I-1433). Applies to all employers.',
    },
    newHireReporting: {
      deadline: '20 days from hire',
      agency: 'Washington State Division of Child Support (DSHS)',
      method: 'Electronic or paper',
      penaltyForLate: '$25 per late report',
    },
    payFrequency: {
      allowed: ['weekly', 'biweekly', 'semimonthly', 'monthly'],
      notes: 'Must pay at least monthly. Regular established paydays required.',
    },
    finalPay: {
      involuntaryTermination: 'Next regular payday',
      voluntaryResignation: 'Next regular payday',
      penalty: 'Double damages for willful withholding of wages.',
    },
    mealBreaks: {
      required: true,
      firstMeal: { afterHours: 5, duration: 30, paid: false },
      notes: 'Must be provided no less than 2 hours and no more than 5 hours from start. Second meal for shifts over 10 hours.',
    },
    restBreaks: {
      required: true,
      frequency: '10 minutes per 4 hours worked',
      paid: true,
      notes: 'Scheduled as close to midpoint of each 4-hour period as practical.',
    },
    workersComp: {
      required: true,
      coverageType: 'All employees - state-fund system',
      notes: 'Washington uses a state fund (Department of Labor & Industries). No private insurance option for most employers.',
    },
  },

  // =========================================================================
  // ILLINOIS
  // =========================================================================
  IL: {
    name: 'Illinois',
    minimumWage: {
      standard: 14.00,
      tipped: 8.40, // 60% of minimum wage
      effectiveDate: '2026-01-01',
      notes: 'Scheduled increase. Chicago has a higher local minimum ($15.80+ for large employers).',
    },
    overtime: {
      type: 'weekly',
      weeklyThreshold: 40,
      overtimeRate: 1.5,
      notes: 'Standard weekly overtime. IL follows FLSA exemption rules.',
    },
    paidSickLeave: {
      required: true,
      accrualRate: '1 hour per 40 hours worked',
      annualCap: 40,
      carryover: true,
      carryoverCap: null, // accrued hours carry but usage capped at 40/year
      waitingPeriod: '90 days (or 30 days for Paid Leave for All Workers Act)',
      notes: 'IL Paid Leave for All Workers Act (effective 2024). Can be used for any reason.',
    },
    newHireReporting: {
      deadline: '20 days from hire',
      agency: 'Illinois Department of Employment Security (IDES)',
      method: 'Electronic or paper (Form IL-W-4)',
      penaltyForLate: '$15 per late report; $500 if conspiracy',
    },
    payFrequency: {
      allowed: ['weekly', 'biweekly', 'semimonthly', 'monthly'],
      notes: 'Semimonthly required for most employees. Executive, administrative, and professional employees may be paid monthly.',
    },
    finalPay: {
      involuntaryTermination: 'Next regular payday (if possible, at time of separation)',
      voluntaryResignation: 'Next regular payday',
      penalty: '2% per month penalty on unpaid wages. IWPCA provides for damages.',
    },
    mealBreaks: {
      required: true,
      firstMeal: { afterHours: 7.5, duration: 20, paid: false },
      notes: 'One Day Rest in Seven Act: 20-minute meal break for shifts of 7.5+ hours, no later than 5 hours after start.',
    },
    restBreaks: {
      required: true,
      frequency: '15 minutes per 7.5-hour shift (in addition to meal break)',
      paid: true,
      notes: 'Hotel Room Attendants get additional breaks. Updated under One Day Rest in Seven Act amendments.',
    },
    workersComp: {
      required: true,
      coverageType: 'All employees',
      notes: 'Must obtain through private carrier or self-insurance approved by IL Workers Comp Commission.',
    },
  },
  // =========================================================================
  // GEORGIA
  // =========================================================================
  GA: {
    name: 'Georgia',
    minimumWage: {
      standard: 7.25,
      tipped: 2.13,
      effectiveDate: '2026-01-01',
      notes: 'Georgia follows the federal minimum wage. Tip credit allowed.',
    },
    overtime: {
      type: 'weekly',
      weeklyThreshold: 40,
      overtimeRate: 1.5,
      notes: 'Standard FLSA weekly overtime rules apply.',
    },
    paidSickLeave: {
      required: false,
      notes: 'No statewide paid sick leave law. Atlanta attempted a local ordinance but it was preempted by state law.',
    },
    newHireReporting: {
      deadline: '10 days from hire',
      agency: 'Georgia Department of Labor - New Hire Reporting',
      method: 'Electronic or paper',
      penaltyForLate: '$25 per late report; $500 if conspiracy',
    },
    payFrequency: {
      allowed: ['weekly', 'biweekly', 'semimonthly', 'monthly'],
      notes: 'Must pay at least semimonthly. Employers may choose any frequency at or above that.',
    },
    finalPay: {
      involuntaryTermination: 'Next regular payday',
      voluntaryResignation: 'Next regular payday',
      penalty: 'Employees may file wage claims with GA DOL.',
    },
    mealBreaks: {
      required: false,
      notes: 'No state meal break requirement for adults. Minors under 18 have restrictions.',
    },
    restBreaks: {
      required: false,
      notes: 'No state rest break requirement.',
    },
    workersComp: {
      required: true,
      coverageType: 'Employers with 3+ employees',
      notes: 'Must obtain through private carrier or self-insurance approved by GA State Board of Workers Comp.',
    },
  },

  // =========================================================================
  // FLORIDA
  // =========================================================================
  FL: {
    name: 'Florida',
    minimumWage: {
      standard: 13.00,
      tipped: 9.98,
      effectiveDate: '2024-09-30',
      notes: 'Florida minimum wage increases $1/year through 2026. Tip credit is $3.02. Next increase to $14.00 on 2025-09-30, $15.00 on 2026-09-30.',
    },
    overtime: {
      type: 'weekly',
      weeklyThreshold: 40,
      overtimeRate: 1.5,
      notes: 'Standard FLSA weekly overtime rules apply. No additional state requirements.',
    },
    paidSickLeave: {
      required: false,
      notes: 'No statewide paid sick leave law. Some local ordinances exist but enforcement varies.',
    },
    newHireReporting: {
      deadline: '20 days from hire',
      agency: 'Florida Department of Revenue - New Hire Reporting Center',
      method: 'Electronic or paper (Form W-4)',
      penaltyForLate: '$25 per late report; $500 if conspiracy',
    },
    payFrequency: {
      allowed: ['weekly', 'biweekly', 'semimonthly', 'monthly'],
      notes: 'Employers may choose any frequency. No state-specific restrictions.',
    },
    finalPay: {
      involuntaryTermination: 'Next regular payday',
      voluntaryResignation: 'Next regular payday',
      penalty: 'Employees may file complaints with FL DEO.',
    },
    mealBreaks: {
      required: false,
      notes: 'No state meal break requirement. FLSA rules apply.',
    },
    restBreaks: {
      required: false,
      notes: 'No state rest break requirement.',
    },
    workersComp: {
      required: true,
      coverageType: 'Employers with 4+ employees (construction: 1+)',
      notes: 'Must obtain through authorized insurer. Construction industry has stricter requirements.',
    },
  },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get compliance rules for a given state.
 *
 * @param {string} stateCode - Two-letter state code
 * @returns {object} Full compliance data for the state
 */
function getStateCompliance(stateCode) {
  const code = (stateCode || '').toUpperCase();
  if (!STATE_COMPLIANCE[code]) {
    throw new Error(
      `State "${code}" is not supported. Supported: ${Object.keys(STATE_COMPLIANCE).join(', ')}`
    );
  }
  return { stateCode: code, ...STATE_COMPLIANCE[code] };
}

/**
 * Get all supported states and their compliance data.
 */
function getAllStateCompliance() {
  const result = {};
  for (const code of Object.keys(STATE_COMPLIANCE)) {
    result[code] = getStateCompliance(code);
  }
  return result;
}

/**
 * Get minimum wage for a state.
 */
function getMinimumWage(stateCode) {
  return getStateCompliance(stateCode).minimumWage;
}

/**
 * Get overtime rules for a state.
 */
function getOvertimeRules(stateCode) {
  return getStateCompliance(stateCode).overtime;
}

/**
 * Check if a state requires paid sick leave.
 */
function requiresPaidSickLeave(stateCode) {
  return getStateCompliance(stateCode).paidSickLeave.required;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
module.exports = {
  STATE_COMPLIANCE,
  getStateCompliance,
  getAllStateCompliance,
  getMinimumWage,
  getOvertimeRules,
  requiresPaidSickLeave,
};
