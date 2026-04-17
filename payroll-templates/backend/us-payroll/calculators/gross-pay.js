/**
 * Gross Pay Calculator
 * Calculates total gross pay from hours, rates, bonuses, commissions, and differentials
 */

const { calculateOvertime, calculateRegularRate, calculateBreakPremiums } = require('../compliance/overtime');
const { PAY_PERIODS_PER_YEAR } = require('../compliance/pay-frequency');

/**
 * Calculate gross pay for a salaried (exempt) employee
 */
function calculateSalaryGross(employee, adjustments = {}) {
  const periods = PAY_PERIODS_PER_YEAR[employee.pay_frequency] || 24;
  const perPeriodSalary = (employee.annual_salary || employee.pay_rate) / periods;

  let gross = perPeriodSalary;

  // Add any bonuses
  if (adjustments.bonus) gross += adjustments.bonus;
  if (adjustments.commission) gross += adjustments.commission;

  // Prorated pay for partial periods (mid-month join/term)
  if (adjustments.proration_factor && adjustments.proration_factor < 1) {
    gross = perPeriodSalary * adjustments.proration_factor;
    if (adjustments.bonus) gross += adjustments.bonus;
    if (adjustments.commission) gross += adjustments.commission;
  }

  return {
    base_salary: round(perPeriodSalary),
    bonus: round(adjustments.bonus || 0),
    commission: round(adjustments.commission || 0),
    gross_pay: round(gross),
    hours: {
      regular: 0, // exempt employees don't track hours for pay
      overtime_15x: 0,
      overtime_2x: 0
    }
  };
}

/**
 * Calculate gross pay for an hourly (non-exempt) employee
 */
function calculateHourlyGross(employee, hours, adjustments = {}) {
  const state = employee.work_state;
  const baseRate = employee.pay_rate;

  // Calculate regular rate (may be higher than base if bonuses/differentials included)
  const totalHoursWorked = (hours.regular || 0) + (hours.overtime_15x || 0) + (hours.overtime_2x || 0);
  const regularRate = calculateRegularRate(
    baseRate,
    totalHoursWorked || 1,
    adjustments.nondiscretionary_bonus || 0,
    adjustments.commission || 0,
    (hours.shift_differential_hours || 0) * (employee.shift_differential || 0)
  );

  // Calculate overtime based on state rules
  let otResult;
  if (state === 'CA' && hours.daily) {
    // California: use daily hours array
    otResult = calculateOvertime(state, hours, regularRate);
  } else {
    // Use provided hour breakdowns or calculate from total
    otResult = {
      regular_hours: round(hours.regular || 0),
      ot_hours: round(hours.overtime_15x || 0),
      dt_hours: round(hours.overtime_2x || 0),
      regular_pay: round((hours.regular || 0) * regularRate),
      ot_pay: round((hours.overtime_15x || 0) * regularRate * 1.5),
      dt_pay: round((hours.overtime_2x || 0) * regularRate * 2.0)
    };
  }

  // Shift differential
  const shiftDiffPay = round((hours.shift_differential_hours || 0) * (employee.shift_differential || 0));

  // Holiday pay
  const holidayPay = round((hours.holiday || 0) * baseRate * (adjustments.holiday_multiplier || 1));

  // Sick/vacation pay
  const sickPay = round((hours.sick || 0) * baseRate);
  const vacationPay = round((hours.vacation || 0) * baseRate);

  // Break premiums (CA)
  let breakPremiums = { meal_premium: 0, rest_premium: 0, total: 0 };
  if (state === 'CA' && (adjustments.missed_meal_breaks || adjustments.missed_rest_breaks)) {
    breakPremiums = calculateBreakPremiums(
      regularRate,
      adjustments.missed_meal_breaks || 0,
      adjustments.missed_rest_breaks || 0
    );
  }

  // NY Spread of Hours
  let spreadOfHoursPay = 0;
  if (state === 'NY' && adjustments.workday_span_hours && adjustments.workday_span_hours > 10) {
    // 1 extra hour at minimum wage
    const nyMinWage = adjustments.applicable_minimum_wage || 16.00;
    spreadOfHoursPay = round(nyMinWage);
  }

  // Bonuses
  const bonus = round(adjustments.bonus || 0);
  const commission = round(adjustments.commission || 0);
  const nondiscretionaryBonus = round(adjustments.nondiscretionary_bonus || 0);

  const grossPay = round(
    otResult.regular_pay +
    otResult.ot_pay +
    otResult.dt_pay +
    shiftDiffPay +
    holidayPay +
    sickPay +
    vacationPay +
    breakPremiums.total +
    spreadOfHoursPay +
    bonus +
    commission +
    nondiscretionaryBonus
  );

  return {
    regular_rate: regularRate,
    base_rate: baseRate,
    hours: {
      regular: otResult.regular_hours,
      overtime: otResult.ot_hours,
      double_time: otResult.dt_hours,
      shift_differential: hours.shift_differential_hours || 0,
      holiday: hours.holiday || 0,
      sick: hours.sick || 0,
      vacation: hours.vacation || 0,
      total: round(otResult.regular_hours + otResult.ot_hours + otResult.dt_hours +
        (hours.shift_differential_hours || 0) + (hours.holiday || 0) +
        (hours.sick || 0) + (hours.vacation || 0))
    },
    earnings: {
      regular_pay: otResult.regular_pay,
      overtime_pay: otResult.ot_pay,
      double_time_pay: otResult.dt_pay,
      shift_differential_pay: shiftDiffPay,
      holiday_pay: holidayPay,
      sick_pay: sickPay,
      vacation_pay: vacationPay,
      meal_break_premium: breakPremiums.meal_premium,
      rest_break_premium: breakPremiums.rest_premium,
      spread_of_hours_pay: spreadOfHoursPay,
      bonus: bonus,
      nondiscretionary_bonus: nondiscretionaryBonus,
      commission: commission
    },
    gross_pay: grossPay
  };
}

/**
 * Main gross pay calculation dispatcher
 */
function calculateGrossPay(employee, hours, adjustments = {}) {
  if (employee.pay_type === 'salary' || employee.flsa_status === 'exempt') {
    return calculateSalaryGross(employee, adjustments);
  }
  return calculateHourlyGross(employee, hours, adjustments);
}

function round(value) {
  return Math.round(value * 100) / 100;
}

module.exports = {
  calculateGrossPay,
  calculateSalaryGross,
  calculateHourlyGross
};
