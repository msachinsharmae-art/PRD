class OTEngine {
  classify({
    date,
    hours,
    category,
    payPeriod,
    rateCard,
    existingEntries,
  }) {
    if (!date) {
      return { ok: false, message: "Date is required for OT classification." };
    }

    const normalizedHours = Number(hours);
    if (!Number.isFinite(normalizedHours) || normalizedHours <= 0) {
      return { ok: false, message: "Hours must be a positive number." };
    }

    const buckets = {
      planned: 0,
      ot: 0,
      extra: 0,
      pto: 0,
      holiday: 0,
    };
    const flags = [];
    const notifications = [];
    let requiresApproval = false;

    if (category === "pto") {
      buckets.pto = normalizedHours;
      return {
        ok: true,
        buckets,
        flags,
        notifications,
        requiresApproval,
        auditText: "PTO bucket assigned. PTO does not count toward OT thresholds.",
      };
    }

    if (category === "holiday") {
      buckets.holiday = normalizedHours;
      return {
        ok: true,
        buckets,
        flags,
        notifications,
        requiresApproval,
        auditText: "Holiday bucket assigned at base rate and excluded from OT thresholds.",
      };
    }

    const dailyThreshold = Number(rateCard.dailyShiftHours);
    const otFrequency = rateCard.otFrequency;
    const otThreshold = Number(rateCard.otThreshold);
    const payPeriodLimit = getLimitForPayPeriod(rateCard, payPeriod);

    const dayWorkedHours = sumHours(existingEntries.filter((entry) =>
      entry.category === "work" &&
      entry.date === date
    ));

    const otWindowWorkedHours = sumHours(existingEntries.filter((entry) =>
      entry.category === "work" &&
      inSamePeriod(entry.date, date, otFrequency)
    ));

    const payWindowWorkedHours = sumHours(existingEntries.filter((entry) =>
      entry.category === "work" &&
      inSamePeriod(entry.date, date, payPeriod)
    ));

    const dailyOtIncrement = incrementalExcess(dayWorkedHours, normalizedHours, dailyThreshold);
    const periodOtIncrement = otThreshold > 0
      ? incrementalExcess(otWindowWorkedHours, normalizedHours, otThreshold)
      : 0;
    const otHours = Math.min(normalizedHours, Math.max(dailyOtIncrement, periodOtIncrement));

    buckets.ot = otHours;
    buckets.planned = normalizedHours - otHours;

    if (dailyOtIncrement > 0) {
      flags.push("daily_shift_exceeded");
      notifications.push({
        level: "warning",
        text: `Daily shift exceeded. ${formatHours(dailyOtIncrement)} moved into OT review.`,
      });
      requiresApproval = true;
    }

    if (periodOtIncrement > 0) {
      flags.push("period_ot_triggered");
      notifications.push({
        level: "warning",
        text: `${capitalize(otFrequency)} OT threshold exceeded for the current cycle.`,
      });
      requiresApproval = true;
    }

    if (payPeriodLimit > 0) {
      const extraIncrement = incrementalExcess(payWindowWorkedHours, normalizedHours, payPeriodLimit);
      if (extraIncrement > 0) {
        if (!rateCard.openBucket) {
          return {
            ok: false,
            message: "Entry blocked. Pay period limit exceeded and open bucket is disabled.",
          };
        }

        buckets.extra = Math.min(buckets.planned, extraIncrement);
        buckets.planned -= buckets.extra;
        flags.push("extra_hours");
        notifications.push({
          level: "critical",
          text: `Pay period limit exceeded. ${formatHours(buckets.extra)} routed to extra hours.`,
        });
        requiresApproval = true;
      }
    }

    return {
      ok: true,
      buckets,
      flags,
      notifications,
      requiresApproval,
      auditText: `Buckets assigned: planned ${formatHours(buckets.planned)}, OT ${formatHours(buckets.ot)}, extra ${formatHours(buckets.extra)}, PTO ${formatHours(buckets.pto)}, holiday ${formatHours(buckets.holiday)}.`,
    };
  }
}

function getLimitForPayPeriod(rateCard, payPeriod) {
  if (payPeriod === "daily") {
    return Number(rateCard.dailyShiftHours) || 0;
  }
  if (payPeriod === "weekly") {
    return Number(rateCard.weeklyLimit) || 0;
  }
  if (payPeriod === "biweekly") {
    return Number(rateCard.biweeklyLimit) || (Number(rateCard.weeklyLimit) * 2) || 0;
  }
  if (payPeriod === "monthly") {
    return Number(rateCard.monthlyLimit) || 0;
  }
  return 0;
}

function incrementalExcess(existingHours, newHours, threshold) {
  if (!threshold || threshold <= 0) {
    return 0;
  }
  return Math.max(0, existingHours + newHours - threshold) - Math.max(0, existingHours - threshold);
}

function sumHours(entries) {
  return entries.reduce((sum, entry) => sum + Number(entry.hours), 0);
}

function inSamePeriod(leftDate, rightDate, period) {
  if (period === "daily") {
    return leftDate === rightDate;
  }

  if (period === "monthly") {
    return leftDate.slice(0, 7) === rightDate.slice(0, 7);
  }

  if (period === "biweekly") {
    return periodKey(leftDate, "biweekly") === periodKey(rightDate, "biweekly");
  }

  return periodKey(leftDate, "weekly") === periodKey(rightDate, "weekly");
}

function periodKey(dateValue, period) {
  const date = new Date(`${dateValue}T00:00:00`);
  const weekStart = startOfWeek(date);
  if (period === "biweekly") {
    const yearStart = startOfWeek(new Date(date.getFullYear(), 0, 1));
    const diffDays = Math.floor((weekStart - yearStart) / 86400000);
    const bucket = Math.floor(diffDays / 14);
    return `${weekStart.getFullYear()}-biweekly-${bucket}`;
  }
  return weekStart.toISOString().slice(0, 10);
}

function startOfWeek(date) {
  const next = new Date(date);
  const day = next.getDay() || 7;
  next.setDate(next.getDate() + 1 - day);
  next.setHours(0, 0, 0, 0);
  return next;
}

function formatHours(value) {
  return `${Number(value).toFixed(1)}h`;
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

module.exports = OTEngine;
