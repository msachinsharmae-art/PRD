export function fillSelect(select, items, selectedValue, placeholder = "") {
  const normalizedItems = items.map((item) =>
    typeof item === "string" ? { value: item, label: capitalize(item) } : item
  );

  const options = [];
  if (placeholder) {
    options.push(`<option value="">${placeholder}</option>`);
  }

  select.innerHTML = options.concat(normalizedItems
    .map((item) => `<option value="${item.value}">${item.label}</option>`))
    .join("");

  if (!normalizedItems.length) {
    select.value = "";
    return;
  }

  const fallback = placeholder ? "" : normalizedItems[0].value;
  select.value = normalizedItems.some((item) => item.value === selectedValue) ? selectedValue : fallback;
}

export function pickCurrent(select, items) {
  if (!items.length) {
    return "";
  }
  const currentValue = select.value;
  return items.some((item) => item.value === currentValue) ? currentValue : items[0].value;
}

export function getWorkers(snapshot) {
  return snapshot.users.filter((user) => user.userType === "worker");
}

export function getProjectsForWorker(snapshot, workerId) {
  return snapshot.projects.filter((project) =>
    !project.assignedUserIds.length || project.assignedUserIds.includes(workerId)
  );
}

export function getEntriesForWorker(snapshot, workerId) {
  return snapshot.timeEntries.filter((entry) => entry.workerId === workerId);
}

export function getTimesheetEntries(snapshot, timesheetId) {
  return snapshot.timeEntries
    .filter((entry) => entry.timesheetId === timesheetId)
    .slice()
    .sort((left, right) => right.date.localeCompare(left.date));
}

export function getTimesheetsForWorker(snapshot, workerId) {
  return snapshot.timesheets
    .filter((timesheet) => timesheet.workerId === workerId)
    .slice()
    .sort((left, right) => sortByRecent(left, right, "submittedAt"));
}

export function getDraftGroups(snapshot, workerId) {
  const groups = new Map();
  getEntriesForWorker(snapshot, workerId)
    .filter((entry) => entry.status === "draft")
    .forEach((entry) => {
      const key = `${entry.projectId}::${entry.payPeriodKey}`;
      const current = groups.get(key) || {
        id: key,
        projectId: entry.projectId,
        projectName: entry.projectName,
        country: entry.country,
        payPeriod: entry.payPeriod,
        periodLabel: entry.payPeriodLabel,
        entries: [],
      };
      current.entries.push(entry);
      groups.set(key, current);
    });

  return [...groups.values()]
    .map((group) => ({
      ...group,
      entries: group.entries.slice().sort((left, right) => right.date.localeCompare(left.date)),
      totals: summarizeEntries(group.entries),
    }))
    .sort((left, right) => left.periodLabel < right.periodLabel ? 1 : -1);
}

export function summarizeEntries(entries) {
  return entries.reduce((totals, entry) => ({
    loggedHours: totals.loggedHours + Number(entry.loggedHours || 0),
    payableHours: totals.payableHours + Number(entry.hours || 0),
    breakHours: totals.breakHours + (Number(entry.breakMinutes || 0) / 60),
    plannedHours: totals.plannedHours + Number(entry.buckets?.planned || 0),
    otHours: totals.otHours + Number(entry.buckets?.ot || 0),
    extraHours: totals.extraHours + Number(entry.buckets?.extra || 0),
    ptoHours: totals.ptoHours + Number(entry.buckets?.pto || 0),
    holidayHours: totals.holidayHours + Number(entry.buckets?.holiday || 0),
  }), {
    loggedHours: 0,
    payableHours: 0,
    breakHours: 0,
    plannedHours: 0,
    otHours: 0,
    extraHours: 0,
    ptoHours: 0,
    holidayHours: 0,
  });
}

export function formatHours(value) {
  return `${Number(value || 0).toFixed(1)}h`;
}

export function formatBreakMinutes(value) {
  const minutes = Number(value || 0);
  if (!minutes) {
    return "0m";
  }
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours && remainder) {
    return `${hours}h ${remainder}m`;
  }
  if (hours) {
    return `${hours}h`;
  }
  return `${remainder}m`;
}

export function formatCurrency(value, currency) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function formatDateTime(value) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function humanize(value) {
  return String(value).replaceAll("_", " ");
}

export function capitalize(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
}

export function normalizeLevel(level) {
  return ["info", "warning", "critical", "success"].includes(level) ? level : "info";
}

export function renderFlagPills(flags) {
  if (!flags || !flags.length) {
    return "";
  }
  return flags.map((flag) => `<span class="pill pill-flag">${humanize(flag)}</span>`).join("");
}

export function renderBucketPills(buckets) {
  return Object.entries(buckets || {})
    .filter(([, value]) => Number(value) > 0)
    .map(([key, value]) => `<span class="pill pill-bucket">${key}: ${formatHours(value)}</span>`)
    .join("");
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function sortByRecent(left, right, field) {
  return new Date(right[field] || right.createdAt || 0) - new Date(left[field] || left.createdAt || 0);
}
