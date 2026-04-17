/**
 * Overtime Calculation Module
 * Handles FLSA federal overtime + state-specific rules (CA daily OT, etc.)
 */

const OT_RULES = {
  // Federal FLSA (applies to all states as baseline)
  federal: {
    weekly_threshold: 40,
    ot_multiplier: 1.5,
    has_daily_ot: false,
    has_double_time: false,
    has_seventh_day: false
  },
  CA: {
    weekly_threshold: 40,
    daily_threshold: 8,
    double_time_daily_threshold: 12,
    ot_multiplier: 1.5,
    dt_multiplier: 2.0,
    has_daily_ot: true,
    has_double_time: true,
    has_seventh_day: true,
    seventh_day_ot_threshold: 0, // first 8 hours at 1.5x
    seventh_day_dt_threshold: 8, // after 8 hours at 2x
    // Alternative workweek schedule support
    aws_daily_thresholds: [8, 9, 10, 12]
  },
  TX: { weekly_threshold: 40, has_daily_ot: false, has_double_time: false, has_seventh_day: false },
  FL: { weekly_threshold: 40, has_daily_ot: false, has_double_time: false, has_seventh_day: false },
  WA: { weekly_threshold: 40, has_daily_ot: false, has_double_time: false, has_seventh_day: false },
  NY: { weekly_threshold: 40, has_daily_ot: false, has_double_time: false, has_seventh_day: false,
    // Residential (live-in) employees: OT after 44 hours
    residential_threshold: 44
  },
  GA: { weekly_threshold: 40, has_daily_ot: false, has_double_time: false, has_seventh_day: false }
};

/**
 * Calculate overtime for simple (non-CA) states
 * Input: totalWeeklyHours, regularRate
 * Returns: { regular_hours, ot_hours, dt_hours, regular_pay, ot_pay, dt_pay }
 */
function calculateSimpleOvertime(totalWeeklyHours, regularRate, state = 'federal') {
  const rules = OT_RULES[state] || OT_RULES.federal;
  const threshold = rules.weekly_threshold;

  const regularHours = Math.min(totalWeeklyHours, threshold);
  const otHours = Math.max(0, totalWeeklyHours - threshold);

  return {
    regular_hours: round(regularHours),
    ot_hours: round(otHours),
    dt_hours: 0,
    regular_pay: round(regularHours * regularRate),
    ot_pay: round(otHours * regularRate * 1.5),
    dt_pay: 0,
    total_pay: round(regularHours * regularRate + otHours * regularRate * 1.5)
  };
}

/**
 * Calculate California overtime (daily + weekly + 7th day)
 *
 * dailyHours: array of 7 numbers representing hours worked each day of the workweek
 * regularRate: base hourly rate
 * isAlternativeWorkweek: boolean (for 4/10 schedules)
 * awsDailyThreshold: daily threshold if AWS (default 8)
 */
function calculateCaliforniaOvertime(dailyHours, regularRate, isAlternativeWorkweek = false, awsDailyThreshold = 8) {
  if (!Array.isArray(dailyHours) || dailyHours.length !== 7) {
    throw new Error('dailyHours must be an array of 7 values (one per day of workweek)');
  }

  const dailyThreshold = isAlternativeWorkweek ? awsDailyThreshold : 8;
  const dtDailyThreshold = 12;

  let totalRegular = 0;
  let totalDailyOT = 0;
  let totalDailyDT = 0;

  // Count consecutive days worked
  let consecutiveDays = 0;
  let isSeventhDay = false;

  // Find consecutive days worked ending at each day
  for (let i = 0; i < 7; i++) {
    if (dailyHours[i] > 0) {
      consecutiveDays++;
    } else {
      consecutiveDays = 0;
    }
  }

  // Step 1: Apply daily overtime rules first
  for (let day = 0; day < 7; day++) {
    const hours = dailyHours[day];
    if (hours <= 0) continue;

    // Check if this is the 7th consecutive day
    let tempConsecutive = 0;
    for (let j = 0; j <= day; j++) {
      if (dailyHours[j] > 0) tempConsecutive++;
      else tempConsecutive = 0;
    }
    isSeventhDay = (tempConsecutive >= 7);

    if (isSeventhDay) {
      // 7th consecutive day: first 8h at 1.5x, over 8h at 2x
      const regHours = 0; // all hours are premium on 7th day
      const otHours = Math.min(hours, 8);
      const dtHours = Math.max(0, hours - 8);
      totalDailyOT += otHours;
      totalDailyDT += dtHours;
    } else {
      // Normal day: apply daily thresholds
      const regHours = Math.min(hours, dailyThreshold);
      const otHours = Math.max(0, Math.min(hours, dtDailyThreshold) - dailyThreshold);
      const dtHours = Math.max(0, hours - dtDailyThreshold);
      totalRegular += regHours;
      totalDailyOT += otHours;
      totalDailyDT += dtHours;
    }
  }

  // Step 2: Apply weekly overtime on remaining hours not already classified as daily OT
  const totalHoursWorked = dailyHours.reduce((sum, h) => sum + h, 0);
  const weeklyOTThreshold = 40;
  const hoursAlreadyOT = totalDailyOT + totalDailyDT;

  // Weekly OT applies to regular hours that exceed 40 but aren't already daily OT
  const weeklyOTHours = Math.max(0, totalRegular - weeklyOTThreshold);
  if (weeklyOTHours > 0) {
    totalRegular -= weeklyOTHours;
    totalDailyOT += weeklyOTHours;
  }

  return {
    regular_hours: round(totalRegular),
    ot_hours: round(totalDailyOT),
    dt_hours: round(totalDailyDT),
    regular_pay: round(totalRegular * regularRate),
    ot_pay: round(totalDailyOT * regularRate * 1.5),
    dt_pay: round(totalDailyDT * regularRate * 2.0),
    total_pay: round(
      totalRegular * regularRate +
      totalDailyOT * regularRate * 1.5 +
      totalDailyDT * regularRate * 2.0
    ),
    total_hours: round(totalHoursWorked)
  };
}

/**
 * Calculate Regular Rate of Pay (for overtime calculations)
 * Must include non-discretionary bonuses, shift differentials, commissions
 * Excludes: discretionary bonuses, gifts, OT premiums already paid
 */
function calculateRegularRate(baseRate, totalHoursWorked, nonDiscretionaryBonus = 0, commission = 0, shiftDifferentialPay = 0) {
  const totalStraightTimeEarnings = (baseRate * totalHoursWorked) + nonDiscretionaryBonus + commission + shiftDifferentialPay;
  return round(totalStraightTimeEarnings / totalHoursWorked);
}

/**
 * Calculate flat-sum bonus OT adjustment (Alvarado v. Dart Container method for CA)
 * For flat bonuses, divide by NON-OT hours only (not total hours)
 */
function calculateFlatSumBonusOT(flatBonus, nonOTHours, otHours) {
  if (nonOTHours <= 0) return 0;
  const regularRateAddition = flatBonus / nonOTHours;
  return round(0.5 * regularRateAddition * otHours);
}

/**
 * Calculate meal/rest break premiums (California)
 */
function calculateBreakPremiums(regularRate, missedMealBreaks = 0, missedRestBreaks = 0) {
  // 1 hour of pay at regular rate for each missed break
  // Max: 1 meal premium + 1 rest premium per day
  return {
    meal_premium: round(missedMealBreaks * regularRate),
    rest_premium: round(missedRestBreaks * regularRate),
    total: round((missedMealBreaks + missedRestBreaks) * regularRate)
  };
}

/**
 * Main overtime calculation dispatcher
 */
function calculateOvertime(state, hours, regularRate, options = {}) {
  if (state === 'CA') {
    const dailyHours = hours.daily || [0, 0, 0, 0, 0, 0, 0];
    return calculateCaliforniaOvertime(
      dailyHours,
      regularRate,
      options.alternativeWorkweek,
      options.awsDailyThreshold
    );
  }

  // All other states use simple weekly OT
  const totalHours = hours.total || (hours.regular || 0) + (hours.overtime || 0);
  return calculateSimpleOvertime(totalHours, regularRate, state);
}

function round(value) {
  return Math.round(value * 100) / 100;
}

module.exports = {
  OT_RULES,
  calculateOvertime,
  calculateSimpleOvertime,
  calculateCaliforniaOvertime,
  calculateRegularRate,
  calculateFlatSumBonusOT,
  calculateBreakPremiums
};
