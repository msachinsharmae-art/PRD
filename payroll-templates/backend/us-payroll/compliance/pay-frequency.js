/**
 * Pay Frequency Compliance Module
 * Validates pay schedules and final pay timing per state laws
 */

const PAY_FREQUENCY_RULES = {
  CA: {
    non_exempt: {
      required: 'semi_monthly',
      allowed: ['weekly', 'bi_weekly', 'semi_monthly'],
      // Work done 1st-15th: paid by 26th. Work done 16th-end: paid by 10th of next month
      pay_deadline_days: { first_half: 26, second_half: 10 }
    },
    exempt: {
      required: 'monthly',
      allowed: ['weekly', 'bi_weekly', 'semi_monthly', 'monthly']
    },
    final_pay: {
      termination: 'immediate', // Same day if fired
      resignation_with_notice: 'last_day', // Last working day (72hrs+ notice)
      resignation_no_notice: '72_hours',
      waiting_penalty: true, // 1 day's pay per day late, up to 30 days
      pto_payout_required: true
    }
  },
  TX: {
    non_exempt: {
      required: 'semi_monthly',
      allowed: ['weekly', 'bi_weekly', 'semi_monthly']
    },
    exempt: {
      required: 'monthly',
      allowed: ['weekly', 'bi_weekly', 'semi_monthly', 'monthly']
    },
    final_pay: {
      termination: '6_calendar_days',
      resignation: 'next_regular_payday',
      waiting_penalty: false,
      pto_payout_required: false // per policy
    }
  },
  FL: {
    // Florida has no state law mandating pay frequency
    non_exempt: {
      required: null,
      allowed: ['weekly', 'bi_weekly', 'semi_monthly', 'monthly']
    },
    exempt: {
      required: null,
      allowed: ['weekly', 'bi_weekly', 'semi_monthly', 'monthly']
    },
    final_pay: {
      termination: 'next_regular_payday',
      resignation: 'next_regular_payday',
      waiting_penalty: false,
      pto_payout_required: false // per policy
    }
  },
  WA: {
    non_exempt: {
      required: 'monthly',
      allowed: ['weekly', 'bi_weekly', 'semi_monthly', 'monthly'],
      pay_deadline_days: 10 // within 10 days after end of pay period
    },
    exempt: {
      required: 'monthly',
      allowed: ['weekly', 'bi_weekly', 'semi_monthly', 'monthly']
    },
    final_pay: {
      termination: 'next_regular_payday',
      resignation: 'next_regular_payday',
      waiting_penalty: false,
      pto_payout_required: false // per employer policy
    }
  },
  NY: {
    manual_workers: {
      required: 'weekly', // Manual/hourly workers must be paid weekly
      allowed: ['weekly'],
      exception: 'bi_weekly', // with DOL authorization
      pay_deadline_days: 7 // within 7 calendar days
    },
    clerical: {
      required: 'semi_monthly',
      allowed: ['weekly', 'bi_weekly', 'semi_monthly']
    },
    exempt: {
      required: 'semi_monthly',
      allowed: ['weekly', 'bi_weekly', 'semi_monthly', 'monthly']
    },
    final_pay: {
      termination: 'next_regular_payday',
      resignation: 'next_regular_payday',
      waiting_penalty: false,
      pto_payout_required: false // per policy
    }
  },
  GA: {
    non_exempt: {
      required: 'semi_monthly',
      allowed: ['weekly', 'bi_weekly', 'semi_monthly']
    },
    exempt: {
      required: 'monthly',
      allowed: ['weekly', 'bi_weekly', 'semi_monthly', 'monthly']
    },
    final_pay: {
      termination: 'next_regular_payday',
      resignation: 'next_regular_payday',
      waiting_penalty: false,
      pto_payout_required: false // per policy
    }
  }
};

const PAY_PERIODS_PER_YEAR = {
  weekly: 52,
  bi_weekly: 26,
  semi_monthly: 24,
  monthly: 12
};

/**
 * Validate pay frequency for an employee
 */
function validatePayFrequency(employee) {
  const warnings = [];
  const errors = [];

  const stateRules = PAY_FREQUENCY_RULES[employee.work_state];
  if (!stateRules) return { warnings, errors };

  // Determine which rule set applies
  let applicableRules;
  if (employee.work_state === 'NY') {
    if (employee.flsa_status === 'exempt') {
      applicableRules = stateRules.exempt;
    } else if (employee.pay_type === 'hourly') {
      applicableRules = stateRules.manual_workers;
    } else {
      applicableRules = stateRules.clerical;
    }
  } else {
    applicableRules = employee.flsa_status === 'exempt'
      ? stateRules.exempt
      : stateRules.non_exempt;
  }

  if (!applicableRules || !applicableRules.allowed) return { warnings, errors };

  if (!applicableRules.allowed.includes(employee.pay_frequency)) {
    errors.push({
      code: 'PAY_FREQUENCY_NOT_ALLOWED',
      message: `Pay frequency '${employee.pay_frequency}' is not allowed for ${employee.flsa_status} employees in ${employee.work_state}. Allowed: ${applicableRules.allowed.join(', ')}`,
      severity: 'error'
    });
  }

  // NY manual workers must be paid weekly
  if (employee.work_state === 'NY' && employee.pay_type === 'hourly' && employee.pay_frequency !== 'weekly') {
    if (employee.pay_frequency === 'bi_weekly') {
      warnings.push({
        code: 'NY_MANUAL_BIWEEKLY',
        message: 'NY manual workers must be paid weekly. Bi-weekly requires DOL authorization.',
        severity: 'warning'
      });
    } else {
      errors.push({
        code: 'NY_MANUAL_FREQUENCY',
        message: 'NY manual (hourly) workers must be paid weekly per Labor Law.',
        severity: 'error'
      });
    }
  }

  return { warnings, errors };
}

/**
 * Get final pay rules for a state
 */
function getFinalPayRules(state) {
  const rules = PAY_FREQUENCY_RULES[state];
  return rules ? rules.final_pay : null;
}

/**
 * Calculate final pay deadline
 */
function calculateFinalPayDeadline(state, separationType, lastWorkDay) {
  const rules = getFinalPayRules(state);
  if (!rules) return null;

  const lastDay = new Date(lastWorkDay);
  let deadline;

  if (separationType === 'termination' || separationType === 'fired') {
    switch (rules.termination) {
      case 'immediate':
        deadline = new Date(lastDay);
        break;
      case '6_calendar_days':
        deadline = new Date(lastDay);
        deadline.setDate(deadline.getDate() + 6);
        break;
      case 'next_regular_payday':
      default:
        deadline = null; // depends on pay schedule
        break;
    }
  } else {
    // Resignation
    const resignRule = rules.resignation_with_notice || rules.resignation || 'next_regular_payday';
    switch (resignRule) {
      case 'last_day':
        deadline = new Date(lastDay);
        break;
      case '72_hours':
        deadline = new Date(lastDay);
        deadline.setDate(deadline.getDate() + 3);
        break;
      case 'next_regular_payday':
      default:
        deadline = null;
        break;
    }
  }

  return {
    deadline: deadline ? deadline.toISOString().split('T')[0] : 'Next regular payday',
    pto_payout_required: rules.pto_payout_required,
    waiting_penalty: rules.waiting_penalty
  };
}

module.exports = {
  PAY_FREQUENCY_RULES,
  PAY_PERIODS_PER_YEAR,
  validatePayFrequency,
  getFinalPayRules,
  calculateFinalPayDeadline
};
