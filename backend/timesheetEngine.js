const { createId, normalizeDate } = require("./models");

class TimesheetEngine {
  constructor(otEngine) {
    this.otEngine = otEngine;
  }

  createEntry(payload, context) {
    const normalized = normalizePayload(payload);
    if (!normalized.ok) {
      return normalized;
    }

    const assessment = this.assessEntry(normalized.value, context);
    if (!assessment.ok) {
      return assessment;
    }

    const { worker, client, project, task, rateCard } = context;
    const now = new Date().toISOString();

    return {
      ok: true,
      entry: {
        id: createId("TSE"),
        workerId: worker.id,
        workerName: worker.name,
        workerRole: worker.role,
        clientId: client.id,
        clientName: client.name,
        projectId: project.id,
        projectName: project.name,
        projectType: project.type,
        taskId: task.id,
        taskName: task.name,
        country: project.country,
        currency: rateCard.currency,
        hourlyRate: Number(rateCard.hourlyRate),
        otMultiplier: Number(rateCard.otMultiplier),
        payPeriod: project.payPeriod,
        date: normalized.value.date,
        loggedHours: normalized.value.loggedHours,
        breakMinutes: normalized.value.breakMinutes,
        hours: normalized.value.netHours,
        category: normalized.value.category,
        notes: normalized.value.notes,
        flags: assessment.flags,
        requiresApproval: assessment.requiresApproval,
        buckets: assessment.buckets,
        status: "draft",
        timesheetId: "",
        payPeriodKey: "",
        payPeriodLabel: "",
        approvalReason: "",
        submittedAt: "",
        reviewedAt: "",
        reviewerId: "",
        reviewerName: "",
        reviewComment: "",
        adjustedAt: "",
        adjustedBy: "",
        createdAt: now,
      },
      notifications: assessment.notifications,
      audits: assessment.audits,
      message: assessment.requiresApproval
        ? "Entry saved as draft with approval flags."
        : "Entry saved as draft.",
    };
  }

  recalculateEntry(entry, context) {
    const normalized = normalizePayload({
      date: entry.date,
      loggedHours: entry.loggedHours,
      breakMinutes: entry.breakMinutes,
      category: entry.category,
      notes: entry.notes,
    });

    if (!normalized.ok) {
      return normalized;
    }

    const assessment = this.assessEntry(normalized.value, context);
    if (!assessment.ok) {
      return assessment;
    }

    const { client, project, task, rateCard } = context;

    return {
      ok: true,
      entry: {
        ...entry,
        clientId: client.id,
        clientName: client.name,
        projectName: project.name,
        projectType: project.type,
        taskName: task.name,
        country: project.country,
        currency: rateCard.currency,
        hourlyRate: Number(rateCard.hourlyRate),
        otMultiplier: Number(rateCard.otMultiplier),
        payPeriod: project.payPeriod,
        hours: normalized.value.netHours,
        flags: assessment.flags,
        requiresApproval: assessment.requiresApproval,
        buckets: assessment.buckets,
      },
    };
  }

  assessEntry(normalized, context) {
    const {
      worker,
      client,
      project,
      task,
      rateCard,
      existingWorkerEntries,
      taskEntries,
      projectEntries,
    } = context;

    if (!worker || !client || !project || !task || !rateCard) {
      return { ok: false, message: "The worker, client, project, task, or rate card could not be found." };
    }

    if (project.assignedUserIds.length && !project.assignedUserIds.includes(worker.id)) {
      return { ok: false, message: "Worker is not assigned to the selected project." };
    }

    if (normalized.date < project.startDate || normalized.date > project.endDate) {
      return { ok: false, message: "Entry blocked. Date is outside the project date range." };
    }

    if (normalized.date < task.startDate || normalized.date > task.endDate) {
      return { ok: false, message: "Entry blocked. Date is outside the task date range." };
    }

    const flags = [];
    const notifications = [];
    const audits = [{
      type: "validation_passed",
      text: "Entry passed project and task date validation.",
    }];
    let requiresApproval = false;

    if (normalized.breakMinutes > 0) {
      audits.push({
        type: "break_recorded",
        text: `Break captured for ${formatHours(normalized.breakMinutes / 60)} on ${normalized.date}.`,
      });
    }

    const taskCheck = evaluateEstimate({
      entityName: task.name,
      entityType: "task",
      policy: project.taskEstimatePolicy,
      existingHours: sumHours(taskEntries),
      newHours: normalized.netHours,
      estimatedHours: Number(task.estimatedHours),
    });
    if (!taskCheck.ok) {
      return { ok: false, message: taskCheck.message };
    }
    mergeDecision(taskCheck, flags, notifications, audits);
    requiresApproval = requiresApproval || taskCheck.requiresApproval;

    const projectCheck = evaluateEstimate({
      entityName: project.name,
      entityType: "project",
      policy: project.projectEstimatePolicy,
      existingHours: sumHours(projectEntries),
      newHours: normalized.netHours,
      estimatedHours: Number(project.estimatedHours),
    });
    if (!projectCheck.ok) {
      return { ok: false, message: projectCheck.message };
    }
    mergeDecision(projectCheck, flags, notifications, audits);
    requiresApproval = requiresApproval || projectCheck.requiresApproval;

    const classification = this.otEngine.classify({
      date: normalized.date,
      hours: normalized.netHours,
      category: normalized.category,
      payPeriod: project.payPeriod,
      rateCard,
      existingEntries: existingWorkerEntries,
    });

    if (!classification.ok) {
      return { ok: false, message: classification.message };
    }

    flags.push(...classification.flags);
    notifications.push(...classification.notifications);
    audits.push({ type: "bucketed", text: classification.auditText });
    requiresApproval = requiresApproval || classification.requiresApproval;

    return {
      ok: true,
      flags: unique(flags),
      notifications,
      audits,
      requiresApproval,
      buckets: classification.buckets,
    };
  }
}

function normalizePayload(payload) {
  const date = normalizeDate(payload.date);
  const loggedHours = roundHours(Number(payload.loggedHours ?? payload.hours));
  const category = payload.category || "work";
  const notes = String(payload.notes || "").trim();
  const breakMinutes = roundMinutes(Number(payload.breakMinutes ?? 0));

  if (!date || !Number.isFinite(loggedHours) || loggedHours <= 0 || loggedHours > 24) {
    return { ok: false, message: "Logged hours must be between 0.25 and 24." };
  }
  if (!Number.isFinite(breakMinutes) || breakMinutes < 0) {
    return { ok: false, message: "Break minutes must be zero or greater." };
  }
  if (category !== "work" && breakMinutes > 0) {
    return { ok: false, message: "Break time can only be added to work entries." };
  }
  if (breakMinutes >= loggedHours * 60) {
    return { ok: false, message: "Break time must be less than the logged duration." };
  }

  const netHours = roundHours(loggedHours - (breakMinutes / 60));
  if (netHours <= 0) {
    return { ok: false, message: "Break time must leave some payable time on the entry." };
  }

  return {
    ok: true,
    value: {
      date,
      loggedHours,
      breakMinutes,
      netHours,
      category,
      notes,
    },
  };
}

function evaluateEstimate({
  entityName,
  entityType,
  policy,
  existingHours,
  newHours,
  estimatedHours,
}) {
  if (!estimatedHours || existingHours + newHours <= estimatedHours) {
    return {
      ok: true,
      flags: [],
      notifications: [],
      audits: [],
      requiresApproval: false,
    };
  }

  if (policy === "block") {
    return {
      ok: false,
      message: `Entry blocked. ${capitalize(entityType)} estimate of ${estimatedHours}h would be exceeded.`,
    };
  }

  const flag = `${entityType}_estimate_exceeded`;
  return {
    ok: true,
    flags: [flag],
    notifications: [{
      level: policy === "approval" ? "warning" : "info",
      text: `${capitalize(entityType)} estimate exceeded for ${entityName}.`,
    }],
    audits: [{
      type: flag,
      text: `${capitalize(entityType)} estimate exceeded for ${entityName}. Policy: ${policy}.`,
    }],
    requiresApproval: policy === "approval",
  };
}

function mergeDecision(decision, flags, notifications, audits) {
  flags.push(...decision.flags);
  notifications.push(...decision.notifications);
  audits.push(...decision.audits);
}

function sumHours(entries) {
  return entries.reduce((sum, entry) => sum + Number(entry.hours || 0), 0);
}

function unique(values) {
  return [...new Set(values)];
}

function roundHours(value) {
  return Math.round(value * 100) / 100;
}

function roundMinutes(value) {
  return Math.round(value);
}

function formatHours(value) {
  return `${roundHours(value).toFixed(2)}h`;
}

function capitalize(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
}

module.exports = TimesheetEngine;
