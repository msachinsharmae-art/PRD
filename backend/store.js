const { clone, coerceBoolean, coerceNumber, createId, normalizeDate } = require("./models");
const {
  countrySettings,
  defaultClientModules,
  enums,
  permissionActions,
  rolePresets,
} = require("./config");
const OTEngine = require("./otEngine");
const PayrollEngine = require("./payrollEngine");
const TimesheetEngine = require("./timesheetEngine");

class AdminPortalStore {
  constructor() {
    this.settings = {
      countries: clone(countrySettings),
      clientModules: defaultClientModules.slice(),
      permissionMatrix: clone(rolePresets),
      permissionActions: permissionActions.slice(),
    };

    this.state = {
      users: seedUsers(),
      clients: [],
      rateCards: [],
      projects: [],
      tasks: [],
      timeEntries: [],
      timesheets: [],
      notifications: [],
      audits: [],
      payrollRuns: [],
    };

    this.otEngine = new OTEngine();
    this.timesheetEngine = new TimesheetEngine(this.otEngine);
    this.payrollEngine = new PayrollEngine();

    this.seedScenario();
  }

  getSnapshot() {
    return {
      ...clone(this.state),
      settings: clone(this.settings),
      enums: clone(enums),
      summary: this.buildSummary(),
    };
  }

  createClient(payload) {
    const name = String(payload.name || "").trim();
    const country = payload.country;
    const currency = String(payload.currency || "").trim() || this.settings.countries[country]?.currency;
    const gstNumber = String(payload.gstNumber || "").trim();
    const modules = Array.isArray(payload.modules) && payload.modules.length
      ? payload.modules
      : this.settings.clientModules.slice();

    if (!name) {
      throw new Error("Client name is required.");
    }
    if (!this.settings.countries[country]) {
      throw new Error("Select a supported country.");
    }
    if (!currency) {
      throw new Error("Currency is required.");
    }
    if (country === "India" && !gstNumber) {
      throw new Error("GST number is mandatory for India clients.");
    }

    const client = {
      id: createId("CLT"),
      name,
      country,
      currency,
      gstNumber,
      modules,
      createdAt: new Date().toISOString(),
    };

    this.state.clients.unshift(client);
    this.appendAudit("client_created", `Client ${client.name} created for ${country}.`, { clientId: client.id });
    return client;
  }

  deleteClient(clientId) {
    if (this.state.projects.some((project) => project.clientId === clientId)) {
      throw new Error("Delete linked projects before removing this client.");
    }
    const next = this.removeById(this.state.clients, clientId);
    this.state.clients = next.collection;
    this.appendAudit("client_deleted", `Client ${next.removed.name} deleted.`, { clientId });
    return next.removed;
  }

  createRateCard(payload) {
    const country = payload.country;
    const defaults = this.settings.countries[country];
    const name = String(payload.name || "").trim();
    const role = String(payload.role || "").trim();

    if (!defaults) {
      throw new Error("Rate card country is required.");
    }
    if (!name || !role) {
      throw new Error("Rate card name and role are required.");
    }

    const rateCard = {
      id: createId("RC"),
      name,
      role,
      country,
      currency: String(payload.currency || "").trim() || defaults.currency,
      hourlyRate: positiveNumber(payload.hourlyRate, "Hourly rate"),
      dailyShiftHours: positiveNumber(payload.dailyShiftHours, "Daily shift hours", defaults.shiftRules.dailyShiftHours),
      weeklyLimit: positiveNumber(payload.weeklyLimit, "Weekly limit", defaults.shiftRules.weeklyLimit),
      biweeklyLimit: positiveNumber(payload.biweeklyLimit, "Biweekly limit", defaults.shiftRules.biweeklyLimit),
      monthlyLimit: positiveNumber(payload.monthlyLimit, "Monthly limit", defaults.shiftRules.monthlyLimit),
      otFrequency: payload.otFrequency || defaults.otRules.frequency,
      otThreshold: positiveNumber(payload.otThreshold, "OT threshold", defaults.otRules.threshold),
      otMultiplier: positiveNumber(payload.otMultiplier, "OT multiplier", defaults.otRules.multiplier),
      openBucket: coerceBoolean(payload.openBucket ?? defaults.otRules.openBucket),
      createdAt: new Date().toISOString(),
    };

    this.state.rateCards.unshift(rateCard);
    this.appendAudit("rate_card_created", `Rate card ${rateCard.name} created for ${country}.`, { rateCardId: rateCard.id });
    return rateCard;
  }

  deleteRateCard(rateCardId) {
    if (this.state.projects.some((project) => project.rateCardId === rateCardId)) {
      throw new Error("Delete or reassign linked projects before removing this rate card.");
    }
    const next = this.removeById(this.state.rateCards, rateCardId);
    this.state.rateCards = next.collection;
    this.appendAudit("rate_card_deleted", `Rate card ${next.removed.name} deleted.`, { rateCardId });
    return next.removed;
  }

  createProject(payload) {
    const client = this.findClient(payload.clientId);
    const rateCard = this.findRateCard(payload.rateCardId);
    const name = String(payload.name || "").trim();
    const type = payload.type;
    const startDate = normalizeDate(payload.startDate);
    const endDate = normalizeDate(payload.endDate);
    const estimatedHours = positiveNumber(payload.estimatedHours, "Project estimated hours");

    if (!client) {
      throw new Error("Select a client before creating a project.");
    }
    if (!rateCard) {
      throw new Error("Select a rate card before creating a project.");
    }
    if (client.country !== rateCard.country) {
      throw new Error("Project rate card must match the client country.");
    }
    if (!name || !type || !startDate || !endDate) {
      throw new Error("Project name, type, and dates are required.");
    }
    if (endDate < startDate) {
      throw new Error("Project end date cannot be before start date.");
    }

    const assignedUserIds = Array.isArray(payload.assignedUserIds)
      ? payload.assignedUserIds.filter((userId) => this.findUser(userId))
      : [];

    const project = {
      id: createId("PRJ"),
      clientId: client.id,
      clientName: client.name,
      name,
      type,
      country: client.country,
      currency: client.currency,
      startDate,
      endDate,
      estimatedHours,
      payPeriod: payload.payPeriod || "weekly",
      taskEstimatePolicy: payload.taskEstimatePolicy || "approval",
      projectEstimatePolicy: payload.projectEstimatePolicy || "approval",
      rateCardId: rateCard.id,
      rateCardName: rateCard.name,
      assignedUserIds,
      createdAt: new Date().toISOString(),
    };

    this.state.projects.unshift(project);
    this.appendAudit("project_created", `Project ${project.name} created under ${client.name}.`, { projectId: project.id });
    return project;
  }

  deleteProject(projectId) {
    if (this.state.tasks.some((task) => task.projectId === projectId)) {
      throw new Error("Delete linked tasks before removing this project.");
    }
    if (this.state.timeEntries.some((entry) => entry.projectId === projectId)) {
      throw new Error("Delete linked timesheet entries before removing this project.");
    }
    const next = this.removeById(this.state.projects, projectId);
    this.state.projects = next.collection;
    this.appendAudit("project_deleted", `Project ${next.removed.name} deleted.`, { projectId });
    return next.removed;
  }

  createTask(payload) {
    const project = this.findProject(payload.projectId);
    const name = String(payload.name || "").trim();
    const startDate = normalizeDate(payload.startDate);
    const endDate = normalizeDate(payload.endDate);
    const dueDate = normalizeDate(payload.dueDate);
    const estimatedHours = positiveNumber(payload.estimatedHours, "Task estimated hours");

    if (!project) {
      throw new Error("Select a project before creating a task.");
    }
    if (!name || !startDate || !endDate || !dueDate) {
      throw new Error("Task name and dates are required.");
    }
    if (startDate < project.startDate || endDate > project.endDate) {
      throw new Error("Task dates must fit inside the project date range.");
    }
    if (endDate < startDate || dueDate < startDate) {
      throw new Error("Task dates are inconsistent.");
    }

    const task = {
      id: createId("TSK"),
      projectId: project.id,
      projectName: project.name,
      name,
      startDate,
      endDate,
      dueDate,
      estimatedHours,
      createdAt: new Date().toISOString(),
    };

    this.state.tasks.unshift(task);
    this.appendAudit("task_created", `Task ${task.name} created under ${project.name}.`, { taskId: task.id });
    return task;
  }

  deleteTask(taskId) {
    if (this.state.timeEntries.some((entry) => entry.taskId === taskId)) {
      throw new Error("Delete linked timesheet entries before removing this task.");
    }
    const next = this.removeById(this.state.tasks, taskId);
    this.state.tasks = next.collection;
    this.appendAudit("task_deleted", `Task ${next.removed.name} deleted.`, { taskId });
    return next.removed;
  }

  logTime(payload) {
    const worker = this.findUser(payload.workerId);
    const project = this.findProject(payload.projectId);
    const task = this.findTask(payload.taskId);
    const client = project ? this.findClient(project.clientId) : null;
    const rateCard = project ? this.findRateCard(project.rateCardId) : null;

    const existingWorkerEntries = this.state.timeEntries.filter((entry) =>
      entry.workerId === payload.workerId &&
      entry.country === project?.country &&
      entry.status !== "rejected"
    );
    const taskEntries = this.state.timeEntries.filter((entry) =>
      entry.taskId === payload.taskId &&
      entry.status !== "rejected"
    );
    const projectEntries = this.state.timeEntries.filter((entry) =>
      entry.projectId === payload.projectId &&
      entry.status !== "rejected"
    );

    const result = this.timesheetEngine.createEntry(payload, {
      worker,
      client,
      project,
      task,
      rateCard,
      existingWorkerEntries,
      taskEntries,
      projectEntries,
    });

    if (!result.ok) {
      this.appendAudit("validation_blocked", result.message, { projectId: payload.projectId, taskId: payload.taskId });
      throw new Error(result.message);
    }

    result.entry.payPeriodKey = periodKey(result.entry.date, project.payPeriod);
    result.entry.payPeriodLabel = periodLabel(result.entry.date, project.payPeriod);

    this.state.timeEntries.unshift(result.entry);
    this.recalculateEntriesAndTimesheets();

    result.notifications.forEach((notification) => this.appendNotification(notification.level, notification.text, result.entry));
    result.audits.forEach((audit) => this.appendAudit(audit.type, audit.text, result.entry));
    return this.state.timeEntries.find((entry) => entry.id === result.entry.id);
  }

  submitTimesheet(payload) {
    const worker = this.findUser(payload.workerId);
    const project = this.findProject(payload.projectId);
    const scope = payload.scope || "current";

    if (!worker || !project) {
      throw new Error("Select a worker and project before submitting a timesheet.");
    }

    const draftEntries = this.state.timeEntries.filter((entry) =>
      entry.workerId === worker.id &&
      entry.projectId === project.id &&
      entry.status === "draft" &&
      matchesScope(entry.date, project.payPeriod, scope)
    );

    if (!draftEntries.length) {
      throw new Error("No draft entries are available for submission.");
    }

    const now = new Date().toISOString();
    const createdTimesheets = [];
    const groups = groupBy(draftEntries, (entry) => entry.payPeriodKey || periodKey(entry.date, project.payPeriod));

    for (const [key, entries] of groups.entries()) {
      const currentPeriodLabel = entries[0].payPeriodLabel || periodLabel(entries[0].date, project.payPeriod);
      const approvedTimesheet = this.state.timesheets.find((timesheet) =>
        timesheet.workerId === worker.id &&
        timesheet.projectId === project.id &&
        timesheet.periodKey === key &&
        timesheet.status === "approved"
      );

      if (approvedTimesheet) {
        throw new Error(`A timesheet for ${currentPeriodLabel} is already approved. Reopen that period before adding more hours.`);
      }

      let timesheet = this.state.timesheets.find((item) =>
        item.workerId === worker.id &&
        item.projectId === project.id &&
        item.periodKey === key &&
        item.status === "submitted"
      );

      if (!timesheet) {
        timesheet = {
          id: createId("TMS"),
          workerId: worker.id,
          workerName: worker.name,
          projectId: project.id,
          projectName: project.name,
          clientId: project.clientId,
          clientName: project.clientName,
          country: project.country,
          currency: project.currency,
          payPeriod: project.payPeriod,
          periodKey: key,
          periodLabel: currentPeriodLabel,
          status: "submitted",
          flags: [],
          requiresApproval: false,
          entryIds: [],
          submittedAt: now,
          reviewedAt: "",
          reviewerId: "",
          reviewerName: "",
          reviewComment: "",
          totals: emptyTotals(),
        };

        this.state.timesheets.unshift(timesheet);
      }

      if (!createdTimesheets.some((item) => item.id === timesheet.id)) {
        createdTimesheets.push(timesheet);
      }

      entries.forEach((entry) => {
        entry.status = "submitted";
        entry.submittedAt = now;
        entry.timesheetId = timesheet.id;
        entry.approvalReason = entry.requiresApproval ? entry.flags.map(humanize).join(", ") : "";
      });

      timesheet.entryIds = unique([...timesheet.entryIds, ...entries.map((entry) => entry.id)]);
    }

    this.rebuildTimesheets();

    this.appendAudit(
      "timesheet_submitted",
      `${draftEntries.length} entries submitted across ${createdTimesheets.length} timesheet(s) for ${worker.name} on ${project.name}.`,
      { workerId: worker.id, projectId: project.id, scope }
    );
    this.appendNotification(
      "info",
      `${worker.name} submitted ${createdTimesheets.length} timesheet(s) for ${project.name}.`,
      { workerId: worker.id, projectId: project.id, scope }
    );

    return {
      submittedCount: draftEntries.length,
      timesheetCount: createdTimesheets.length,
      workerName: worker.name,
      projectName: project.name,
      timesheets: createdTimesheets.map((timesheet) => this.findTimesheet(timesheet.id)),
    };
  }

  reviewTimesheet(timesheetId, payload) {
    const action = payload.action;
    const reviewer = this.findUser(payload.reviewerId) || this.state.users.find((user) => user.role === "Admin");
    const reason = String(payload.reason || "").trim();
    const timesheet = this.findTimesheet(timesheetId);

    if (!timesheet) {
      throw new Error("Timesheet not found.");
    }
    if (timesheet.status !== "submitted") {
      throw new Error("Only submitted timesheets can be reviewed.");
    }
    if (!["approved", "rejected"].includes(action)) {
      throw new Error("Review action must be approved or rejected.");
    }
    if (action === "rejected" && !reason) {
      throw new Error("Rejections require a reason.");
    }

    const adjustments = Array.isArray(payload.adjustments) ? payload.adjustments : [];
    adjustments.forEach((adjustment) => {
      const entry = this.state.timeEntries.find((item) => item.id === adjustment.entryId && item.timesheetId === timesheetId);
      if (!entry) {
        throw new Error("One or more timesheet adjustments reference an invalid entry.");
      }
      this.applyEntryAdjustment(entry, adjustment, reviewer);
    });

    this.recalculateEntriesAndTimesheets();

    const freshTimesheet = this.findTimesheet(timesheetId);
    const entries = this.getTimesheetEntries(timesheetId);
    const reviewedAt = new Date().toISOString();

    freshTimesheet.status = action;
    freshTimesheet.reviewedAt = reviewedAt;
    freshTimesheet.reviewerId = reviewer.id;
    freshTimesheet.reviewerName = reviewer.name;
    freshTimesheet.reviewComment = reason;

    entries.forEach((entry) => {
      entry.status = action;
      entry.reviewerId = reviewer.id;
      entry.reviewerName = reviewer.name;
      entry.reviewedAt = reviewedAt;
      entry.reviewComment = reason;
      entry.approvalReason = action === "rejected"
        ? reason
        : (entry.requiresApproval ? entry.flags.map(humanize).join(", ") : "");
    });

    if (action === "rejected") {
      this.recalculateEntriesAndTimesheets();
      const refreshed = this.findTimesheet(timesheetId);
      refreshed.status = action;
      refreshed.reviewedAt = reviewedAt;
      refreshed.reviewerId = reviewer.id;
      refreshed.reviewerName = reviewer.name;
      refreshed.reviewComment = reason;
    } else {
      this.rebuildTimesheets();
    }

    const message = action === "approved"
      ? `${freshTimesheet.workerName}'s timesheet ${freshTimesheet.periodLabel} was approved.`
      : `${freshTimesheet.workerName}'s timesheet ${freshTimesheet.periodLabel} was rejected.`;

    this.appendAudit(
      action === "approved" ? "approval_granted" : "approval_rejected",
      `${message}${reason ? ` Reason: ${reason}` : ""}`,
      { timesheetId, projectId: freshTimesheet.projectId, workerId: freshTimesheet.workerId },
      reviewer.name
    );
    this.appendNotification(
      action === "approved" ? "success" : "critical",
      `${message}${reason ? ` ${reason}` : ""}`,
      { timesheetId, projectId: freshTimesheet.projectId, workerId: freshTimesheet.workerId }
    );

    return this.findTimesheet(timesheetId);
  }

  bulkReviewTimesheets(payload) {
    const timesheetIds = [...new Set(Array.isArray(payload.timesheetIds) ? payload.timesheetIds : [])];
    if (!timesheetIds.length) {
      throw new Error("Select at least one timesheet for bulk review.");
    }

    const reviewed = timesheetIds.map((timesheetId) => this.reviewTimesheet(timesheetId, payload));
    return {
      reviewedCount: reviewed.length,
      action: payload.action,
      timesheetIds: reviewed.map((timesheet) => timesheet.id),
    };
  }

  generatePayroll(payload) {
    const worker = this.findUser(payload.workerId);
    const project = this.findProject(payload.projectId);
    const scope = payload.scope || "current";

    if (!worker || !project) {
      throw new Error("Select a worker and project before running payroll.");
    }

    const approvedEntries = this.state.timeEntries.filter((entry) =>
      entry.workerId === worker.id &&
      entry.projectId === project.id &&
      entry.status === "approved" &&
      matchesScope(entry.date, project.payPeriod, scope)
    );

    if (!approvedEntries.length) {
      throw new Error("No approved entries are available for the requested payroll run.");
    }

    const payroll = this.payrollEngine.generate({
      worker,
      project,
      entries: approvedEntries,
      countryPolicy: this.settings.countries[project.country],
      scopeLabel: scope === "all" ? "All approved entries" : describeCurrentPeriod(project.payPeriod),
    });

    this.state.payrollRuns.unshift(payroll);
    this.appendAudit("payroll_generated", `Payroll generated for ${worker.name} on ${project.name}.`, payroll);
    this.appendNotification("info", `Payroll run created for ${worker.name} (${project.country}).`, payroll);
    return payroll;
  }

  updateCountrySettings(country, payload) {
    const current = this.settings.countries[country];
    if (!current) {
      throw new Error("Unsupported country settings requested.");
    }

    current.shiftRules.dailyShiftHours = positiveNumber(payload.dailyShiftHours, "Daily shift hours", current.shiftRules.dailyShiftHours);
    current.shiftRules.weeklyLimit = positiveNumber(payload.weeklyLimit, "Weekly limit", current.shiftRules.weeklyLimit);
    current.shiftRules.biweeklyLimit = positiveNumber(payload.biweeklyLimit, "Biweekly limit", current.shiftRules.biweeklyLimit);
    current.shiftRules.monthlyLimit = positiveNumber(payload.monthlyLimit, "Monthly limit", current.shiftRules.monthlyLimit);
    current.otRules.frequency = payload.otFrequency || current.otRules.frequency;
    current.otRules.threshold = positiveNumber(payload.otThreshold, "OT threshold", current.otRules.threshold);
    current.otRules.multiplier = positiveNumber(payload.otMultiplier, "OT multiplier", current.otRules.multiplier);
    current.otRules.openBucket = coerceBoolean(payload.openBucket ?? current.otRules.openBucket);

    if (country === "India") {
      current.compliance.basicPercent = positiveNumber(payload.basicPercent, "Basic percent", current.compliance.basicPercent);
      current.compliance.pfRate = positiveNumber(payload.pfRate, "PF rate", current.compliance.pfRate);
      current.compliance.esiRate = positiveNumber(payload.esiRate, "ESI rate", current.compliance.esiRate);
      current.compliance.esiThreshold = positiveNumber(payload.esiThreshold, "ESI threshold", current.compliance.esiThreshold);
      current.compliance.professionalTax = positiveNumber(payload.professionalTax, "Professional tax", current.compliance.professionalTax);
      current.compliance.tdsRate = positiveNumber(payload.tdsRate, "TDS rate", current.compliance.tdsRate);
    } else {
      current.compliance.federalTaxRate = positiveNumber(payload.federalTaxRate, "Federal tax rate", current.compliance.federalTaxRate);
      current.compliance.stateTaxRate = positiveNumber(payload.stateTaxRate, "State tax rate", current.compliance.stateTaxRate);
      current.compliance.socialSecurityRate = positiveNumber(payload.socialSecurityRate, "Social Security rate", current.compliance.socialSecurityRate);
      current.compliance.medicareRate = positiveNumber(payload.medicareRate, "Medicare rate", current.compliance.medicareRate);
    }

    this.appendAudit("country_settings_updated", `${country} payroll settings updated.`, { country });
    return current;
  }

  buildSummary() {
    const approvedEntries = [];
    const submittedTimesheets = [];
    const projectHours = new Map();
    const pendingTimesheetsByProject = new Map();
    const approvedHoursByCountry = createKeyCountMap(enums.countries, 0);

    this.state.timeEntries.forEach((entry) => {
      if (entry.status === "approved") {
        approvedEntries.push(entry);
        approvedHoursByCountry.set(entry.country, (approvedHoursByCountry.get(entry.country) || 0) + entry.hours);
      }
      if (entry.status !== "rejected") {
        projectHours.set(entry.projectId, (projectHours.get(entry.projectId) || 0) + entry.hours);
      }
    });

    this.state.timesheets.forEach((timesheet) => {
      if (timesheet.status === "submitted") {
        submittedTimesheets.push(timesheet);
        pendingTimesheetsByProject.set(
          timesheet.projectId,
          (pendingTimesheetsByProject.get(timesheet.projectId) || 0) + 1
        );
      }
    });

    const clientsByCountry = createKeyCountMap(enums.countries, 0);
    this.state.clients.forEach((client) => {
      clientsByCountry.set(client.country, (clientsByCountry.get(client.country) || 0) + 1);
    });

    const projectsByCountry = createKeyCountMap(enums.countries, 0);
    this.state.projects.forEach((project) => {
      projectsByCountry.set(project.country, (projectsByCountry.get(project.country) || 0) + 1);
    });

    const payrollRunsByCountry = createKeyCountMap(enums.countries, 0);
    this.state.payrollRuns.forEach((run) => {
      payrollRunsByCountry.set(run.country, (payrollRunsByCountry.get(run.country) || 0) + 1);
    });

    const metrics = {
      clients: this.state.clients.length,
      projects: this.state.projects.length,
      tasks: this.state.tasks.length,
      workers: this.state.users.filter((user) => user.userType === "worker").length,
      pendingApprovals: submittedTimesheets.length,
      payrollRuns: this.state.payrollRuns.length,
      approvedHours: approvedEntries.reduce((sum, entry) => sum + entry.hours, 0),
      otHours: approvedEntries.reduce((sum, entry) => sum + entry.buckets.ot, 0),
      extraHours: approvedEntries.reduce((sum, entry) => sum + entry.buckets.extra, 0),
      submittedTimesheets: submittedTimesheets.length,
    };

    const countryMix = enums.countries.map((country) => {
      return {
        country,
        clients: clientsByCountry.get(country) || 0,
        projects: projectsByCountry.get(country) || 0,
        approvedHours: approvedHoursByCountry.get(country) || 0,
        payrollRuns: payrollRunsByCountry.get(country) || 0,
      };
    });

    const projectHealth = this.state.projects.map((project) => {
      const loggedHours = projectHours.get(project.id) || 0;
      const pending = pendingTimesheetsByProject.get(project.id) || 0;
      return {
        id: project.id,
        name: project.name,
        country: project.country,
        estimatedHours: project.estimatedHours,
        loggedHours,
        variance: loggedHours - project.estimatedHours,
        pendingApprovals: pending,
      };
    });

    return {
      metrics,
      countryMix,
      projectHealth,
      criticalRule: "No hour enters payroll without validation, OT classification, approval, and compliance.",
    };
  }

  seedScenario() {
    const usClient = this.createClient({
      name: "Northstar Retail",
      country: "US",
      currency: "USD",
      gstNumber: "",
      modules: this.settings.clientModules.slice(),
    });
    const indiaClient = this.createClient({
      name: "Zimyo Consulting India",
      country: "India",
      currency: "INR",
      gstNumber: "27AABCU9603R1ZX",
      modules: this.settings.clientModules.slice(),
    });

    const usRateCard = this.createRateCard({
      name: "US Delivery Card",
      role: "Engineer",
      country: "US",
      currency: "USD",
      hourlyRate: 45,
      dailyShiftHours: 8,
      weeklyLimit: 40,
      biweeklyLimit: 80,
      monthlyLimit: 200,
      otFrequency: "weekly",
      otThreshold: 40,
      otMultiplier: 1.5,
      openBucket: true,
    });
    const indiaRateCard = this.createRateCard({
      name: "India Consulting Card",
      role: "Consultant",
      country: "India",
      currency: "INR",
      hourlyRate: 1000,
      dailyShiftHours: 9,
      weeklyLimit: 54,
      biweeklyLimit: 108,
      monthlyLimit: 220,
      otFrequency: "monthly",
      otThreshold: 180,
      otMultiplier: 1.5,
      openBucket: true,
    });

    const usWorkers = this.state.users.filter((user) => user.country === "US" && user.userType === "worker").map((user) => user.id);
    const indiaWorkers = this.state.users.filter((user) => user.country === "India" && user.userType === "worker").map((user) => user.id);

    const usProject = this.createProject({
      clientId: usClient.id,
      name: "US Payroll Rollout",
      type: "rate-card",
      rateCardId: usRateCard.id,
      startDate: offsetIso(todayIso(), -21),
      endDate: offsetIso(todayIso(), 30),
      estimatedHours: 160,
      payPeriod: "weekly",
      taskEstimatePolicy: "approval",
      projectEstimatePolicy: "approval",
      assignedUserIds: usWorkers,
    });
    const indiaProject = this.createProject({
      clientId: indiaClient.id,
      name: "India Compliance Setup",
      type: "fixed",
      rateCardId: indiaRateCard.id,
      startDate: offsetIso(todayIso(), -10),
      endDate: offsetIso(todayIso(), 30),
      estimatedHours: 220,
      payPeriod: "monthly",
      taskEstimatePolicy: "approval",
      projectEstimatePolicy: "overrun",
      assignedUserIds: indiaWorkers,
    });

    const usTaskA = this.createTask({
      projectId: usProject.id,
      name: "API Mapping",
      startDate: offsetIso(todayIso(), -14),
      endDate: offsetIso(todayIso(), 12),
      dueDate: offsetIso(todayIso(), 12),
      estimatedHours: 30,
    });
    const usTaskB = this.createTask({
      projectId: usProject.id,
      name: "Payroll QA",
      startDate: offsetIso(todayIso(), -10),
      endDate: offsetIso(todayIso(), 18),
      dueDate: offsetIso(todayIso(), 18),
      estimatedHours: 24,
    });
    const indiaTaskA = this.createTask({
      projectId: indiaProject.id,
      name: "PF Rules Engine",
      startDate: offsetIso(todayIso(), -5),
      endDate: offsetIso(todayIso(), 20),
      dueDate: offsetIso(todayIso(), 20),
      estimatedHours: 70,
    });
    const indiaTaskB = this.createTask({
      projectId: indiaProject.id,
      name: "Payslip Review",
      startDate: offsetIso(todayIso(), -2),
      endDate: offsetIso(todayIso(), 23),
      dueDate: offsetIso(todayIso(), 23),
      estimatedHours: 18,
    });

    const usWorker = usWorkers[0];
    const indiaWorker = indiaWorkers[0];
    const admin = this.state.users.find((user) => user.role === "Admin");

    const lastWeekMonday = offsetIso(toIso(startOfWeek(new Date())), -7);
    const usEntries = [
      { date: lastWeekMonday, loggedHours: 8.5, breakMinutes: 30, taskId: usTaskA.id },
      { date: offsetIso(lastWeekMonday, 1), loggedHours: 8.5, breakMinutes: 30, taskId: usTaskA.id },
      { date: offsetIso(lastWeekMonday, 2), loggedHours: 8, breakMinutes: 0, taskId: usTaskA.id },
      { date: offsetIso(lastWeekMonday, 3), loggedHours: 8.5, breakMinutes: 30, taskId: usTaskB.id },
      { date: offsetIso(lastWeekMonday, 4), loggedHours: 10.5, breakMinutes: 30, taskId: usTaskB.id },
    ];

    usEntries.forEach((entry, index) => {
      this.logTime({
        workerId: usWorker,
        projectId: usProject.id,
        taskId: entry.taskId,
        date: entry.date,
        loggedHours: entry.loggedHours,
        breakMinutes: entry.breakMinutes,
        category: "work",
        notes: `Seeded US entry ${index + 1}`,
      });
    });

    const usSubmission = this.submitTimesheet({
      workerId: usWorker,
      projectId: usProject.id,
      scope: "all",
    });

    usSubmission.timesheets.forEach((timesheet) => {
      this.reviewTimesheet(timesheet.id, {
        action: "approved",
        reviewerId: admin.id,
        reason: "Reviewed in seeded scenario.",
      });
    });

    this.logTime({
      workerId: indiaWorker,
      projectId: indiaProject.id,
      taskId: indiaTaskA.id,
      date: todayIso(),
      loggedHours: 9.5,
      breakMinutes: 30,
      category: "work",
      notes: "Seeded India baseline day.",
    });
    this.logTime({
      workerId: indiaWorker,
      projectId: indiaProject.id,
      taskId: indiaTaskB.id,
      date: offsetIso(todayIso(), 1),
      loggedHours: 11.5,
      breakMinutes: 30,
      category: "work",
      notes: "Seeded India approval case.",
    });
    this.logTime({
      workerId: indiaWorker,
      projectId: indiaProject.id,
      taskId: indiaTaskB.id,
      date: offsetIso(todayIso(), 2),
      loggedHours: 8,
      breakMinutes: 0,
      category: "pto",
      notes: "Seeded PTO case.",
    });

    this.submitTimesheet({
      workerId: indiaWorker,
      projectId: indiaProject.id,
      scope: "all",
    });

    this.generatePayroll({
      workerId: usWorker,
      projectId: usProject.id,
      scope: "all",
    });
  }

  findUser(userId) {
    return this.state.users.find((user) => user.id === userId);
  }

  findClient(clientId) {
    return this.state.clients.find((client) => client.id === clientId);
  }

  findRateCard(rateCardId) {
    return this.state.rateCards.find((rateCard) => rateCard.id === rateCardId);
  }

  findProject(projectId) {
    return this.state.projects.find((project) => project.id === projectId);
  }

  findTask(taskId) {
    return this.state.tasks.find((task) => task.id === taskId);
  }

  findTimesheet(timesheetId) {
    return this.state.timesheets.find((timesheet) => timesheet.id === timesheetId);
  }

  getTimesheetEntries(timesheetId) {
    return this.state.timeEntries.filter((entry) => entry.timesheetId === timesheetId);
  }

  applyEntryAdjustment(entry, adjustment, reviewer) {
    const nextLoggedHours = adjustment.loggedHours ?? entry.loggedHours;
    const nextBreakMinutes = adjustment.breakMinutes ?? entry.breakMinutes;
    const normalizedLoggedHours = coerceNumber(nextLoggedHours, entry.loggedHours);
    const normalizedBreakMinutes = Math.round(coerceNumber(nextBreakMinutes, entry.breakMinutes));

    if (!Number.isFinite(normalizedLoggedHours) || normalizedLoggedHours <= 0 || normalizedLoggedHours > 24) {
      throw new Error("Adjusted hours must be between 0.25 and 24.");
    }
    if (!Number.isFinite(normalizedBreakMinutes) || normalizedBreakMinutes < 0) {
      throw new Error("Adjusted break minutes must be zero or greater.");
    }
    if (entry.category !== "work" && normalizedBreakMinutes > 0) {
      throw new Error("Break minutes can only be adjusted for work entries.");
    }
    if (normalizedBreakMinutes >= normalizedLoggedHours * 60) {
      throw new Error("Adjusted break minutes must be less than the logged duration.");
    }

    const previousLoggedHours = entry.loggedHours;
    const previousBreakMinutes = entry.breakMinutes;

    entry.originalLoggedHours = entry.originalLoggedHours ?? previousLoggedHours;
    entry.originalBreakMinutes = entry.originalBreakMinutes ?? previousBreakMinutes;
    entry.loggedHours = roundHours(normalizedLoggedHours);
    entry.breakMinutes = normalizedBreakMinutes;
    entry.hours = roundHours(entry.loggedHours - (entry.breakMinutes / 60));
    entry.adjustedAt = new Date().toISOString();
    entry.adjustedBy = reviewer.name;

    this.appendAudit(
      "entry_adjusted",
      `${reviewer.name} adjusted ${entry.taskName} on ${entry.date} from ${formatHours(previousLoggedHours)} / ${previousBreakMinutes}m break to ${formatHours(entry.loggedHours)} / ${entry.breakMinutes}m break.`,
      { entryId: entry.id, timesheetId: entry.timesheetId, reviewerId: reviewer.id },
      reviewer.name
    );
  }

  recalculateEntriesAndTimesheets() {
    const relevantEntries = this.state.timeEntries
      .filter((entry) => entry.status !== "rejected")
      .slice()
      .sort(sortEntriesAscending);

    const usersById = new Map(this.state.users.map((user) => [user.id, user]));
    const clientsById = new Map(this.state.clients.map((client) => [client.id, client]));
    const rateCardsById = new Map(this.state.rateCards.map((rateCard) => [rateCard.id, rateCard]));
    const projectsById = new Map(this.state.projects.map((project) => [project.id, project]));
    const tasksById = new Map(this.state.tasks.map((task) => [task.id, task]));

    const workerEntries = new Map();
    const taskEntries = new Map();
    const projectEntries = new Map();

    relevantEntries.forEach((entry) => {
      const worker = usersById.get(entry.workerId);
      const project = projectsById.get(entry.projectId);
      const task = tasksById.get(entry.taskId);
      const client = project ? clientsById.get(project.clientId) : null;
      const rateCard = project ? rateCardsById.get(project.rateCardId) : null;
      const workerKey = `${entry.workerId}::${entry.country}`;

      const result = this.timesheetEngine.recalculateEntry(entry, {
        worker,
        client,
        project,
        task,
        rateCard,
        existingWorkerEntries: workerEntries.get(workerKey) || [],
        taskEntries: taskEntries.get(entry.taskId) || [],
        projectEntries: projectEntries.get(entry.projectId) || [],
      });

      if (!result.ok) {
        throw new Error(result.message);
      }

      Object.assign(entry, result.entry, {
        payPeriodKey: periodKey(entry.date, project.payPeriod),
        payPeriodLabel: periodLabel(entry.date, project.payPeriod),
      });

      if (entry.status !== "rejected") {
        entry.approvalReason = entry.requiresApproval ? entry.flags.map(humanize).join(", ") : "";
      }

      appendAggregation(workerEntries, workerKey, cloneEntryForAggregation(entry));
      appendAggregation(taskEntries, entry.taskId, cloneEntryForAggregation(entry));
      appendAggregation(projectEntries, entry.projectId, cloneEntryForAggregation(entry));
    });

    this.rebuildTimesheets();
  }

  rebuildTimesheets() {
    const entriesByTimesheetId = groupBy(
      this.state.timeEntries.filter((entry) => entry.timesheetId),
      (entry) => entry.timesheetId
    );

    this.state.timesheets.forEach((timesheet) => {
      const entries = (entriesByTimesheetId.get(timesheet.id) || [])
        .slice()
        .sort(sortEntriesAscending);

      if (!entries.length) {
        timesheet.entryIds = [];
        timesheet.flags = [];
        timesheet.requiresApproval = false;
        timesheet.totals = emptyTotals();
        return;
      }

      timesheet.workerId = entries[0].workerId;
      timesheet.workerName = entries[0].workerName;
      timesheet.projectId = entries[0].projectId;
      timesheet.projectName = entries[0].projectName;
      timesheet.clientId = entries[0].clientId;
      timesheet.clientName = entries[0].clientName;
      timesheet.country = entries[0].country;
      timesheet.currency = entries[0].currency;
      timesheet.payPeriod = entries[0].payPeriod;
      timesheet.periodKey = entries[0].payPeriodKey;
      timesheet.periodLabel = entries[0].payPeriodLabel;
      timesheet.entryIds = entries.map((entry) => entry.id);
      timesheet.flags = unique(entries.flatMap((entry) => entry.flags));
      timesheet.requiresApproval = entries.some((entry) => entry.requiresApproval);
      timesheet.totals = entries.reduce((totals, entry) => ({
        entryCount: totals.entryCount + 1,
        taskCount: totals.taskCount,
        loggedHours: totals.loggedHours + entry.loggedHours,
        breakHours: totals.breakHours + (entry.breakMinutes / 60),
        payableHours: totals.payableHours + entry.hours,
        plannedHours: totals.plannedHours + entry.buckets.planned,
        otHours: totals.otHours + entry.buckets.ot,
        extraHours: totals.extraHours + entry.buckets.extra,
        ptoHours: totals.ptoHours + entry.buckets.pto,
        holidayHours: totals.holidayHours + entry.buckets.holiday,
      }), emptyTotals());

      timesheet.totals.taskCount = new Set(entries.map((entry) => entry.taskId)).size;
    });
  }

  appendNotification(level, text, meta) {
    this.state.notifications.unshift({
      id: createId("NTF"),
      level,
      text,
      meta,
      createdAt: new Date().toISOString(),
    });
    this.state.notifications = this.state.notifications.slice(0, 40);
  }

  appendAudit(type, text, meta, actor = "System") {
    this.state.audits.unshift({
      id: createId("AUD"),
      type,
      text,
      actor,
      meta,
      createdAt: new Date().toISOString(),
    });
    this.state.audits = this.state.audits.slice(0, 100);
  }

  removeById(collection, id) {
    const index = collection.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new Error("Requested record was not found.");
    }
    return {
      removed: collection[index],
      collection: collection.filter((item) => item.id !== id),
    };
  }
}

function seedUsers() {
  return [
    { id: "USR-ADMIN-01", name: "Deepak Sharma", role: "Admin", userType: "admin", country: "India", managerId: "" },
    { id: "USR-PM-US-01", name: "Maya Lewis", role: "Project Manager", userType: "manager", country: "US", managerId: "USR-ADMIN-01", stateTaxRate: 0.05 },
    { id: "USR-PM-IN-01", name: "Arjun Rao", role: "Project Manager", userType: "manager", country: "India", managerId: "USR-ADMIN-01", basicPercent: 0.4, tdsRate: 0.085 },
    { id: "USR-US-01", name: "Olivia Carter", role: "Team Member", userType: "worker", country: "US", managerId: "USR-PM-US-01", stateTaxRate: 0.05, federalTaxRate: 0.1 },
    { id: "USR-US-02", name: "Ethan Cole", role: "Team Member", userType: "worker", country: "US", managerId: "USR-PM-US-01", stateTaxRate: 0.04, federalTaxRate: 0.1 },
    { id: "USR-IN-01", name: "Aarav Shah", role: "Team Member", userType: "worker", country: "India", managerId: "USR-PM-IN-01", basicPercent: 0.4, tdsRate: 0.085 },
    { id: "USR-IN-02", name: "Neha Mehta", role: "Team Member", userType: "worker", country: "India", managerId: "USR-PM-IN-01", basicPercent: 0.4, tdsRate: 0.09 },
  ];
}

function positiveNumber(value, label, fallback) {
  const parsed = coerceNumber(value, fallback);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be greater than zero.`);
  }
  return parsed;
}

function matchesScope(dateValue, payPeriod, scope) {
  if (scope === "all") {
    return true;
  }
  return inSamePeriod(dateValue, todayIso(), payPeriod);
}

function describeCurrentPeriod(payPeriod) {
  if (payPeriod === "monthly") {
    return `Current month (${todayIso().slice(0, 7)})`;
  }
  if (payPeriod === "biweekly") {
    return `Current biweekly period (${periodLabel(todayIso(), "biweekly")})`;
  }
  if (payPeriod === "daily") {
    return `Current day (${todayIso()})`;
  }
  return `Current week (${periodLabel(todayIso(), "weekly")})`;
}

function inSamePeriod(leftDate, rightDate, payPeriod) {
  if (payPeriod === "daily") {
    return leftDate === rightDate;
  }
  if (payPeriod === "monthly") {
    return leftDate.slice(0, 7) === rightDate.slice(0, 7);
  }
  return periodKey(leftDate, payPeriod) === periodKey(rightDate, payPeriod);
}

function periodKey(dateValue, payPeriod) {
  const date = new Date(`${dateValue}T00:00:00`);
  if (payPeriod === "daily") {
    return dateValue;
  }
  if (payPeriod === "monthly") {
    return dateValue.slice(0, 7);
  }

  const start = startOfWeek(date);
  if (payPeriod === "biweekly") {
    const yearStart = startOfWeek(new Date(date.getFullYear(), 0, 1));
    const diffDays = Math.floor((start - yearStart) / 86400000);
    const bucketStart = new Date(yearStart);
    bucketStart.setDate(yearStart.getDate() + (Math.floor(diffDays / 14) * 14));
    return toIso(bucketStart);
  }

  return toIso(start);
}

function periodLabel(dateValue, payPeriod) {
  const date = new Date(`${dateValue}T00:00:00`);
  if (payPeriod === "daily") {
    return dateValue;
  }
  if (payPeriod === "monthly") {
    return `${dateValue.slice(0, 7)} (Monthly)`;
  }

  const start = payPeriod === "biweekly"
    ? new Date(`${periodKey(dateValue, "biweekly")}T00:00:00`)
    : startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + (payPeriod === "biweekly" ? 13 : 6));
  return `${toIso(start)} to ${toIso(end)}`;
}

function startOfWeek(date) {
  const next = new Date(date);
  const day = next.getDay() || 7;
  next.setDate(next.getDate() + 1 - day);
  next.setHours(0, 0, 0, 0);
  return next;
}

function todayIso() {
  return toIso(new Date());
}

function offsetIso(dateValue, amount) {
  const normalized = dateValue instanceof Date ? toIso(dateValue) : dateValue;
  const next = new Date(`${normalized}T00:00:00`);
  next.setDate(next.getDate() + amount);
  return toIso(next);
}

function humanize(value) {
  return String(value).replaceAll("_", " ");
}

function toIso(date) {
  return date.toISOString().slice(0, 10);
}

function groupBy(items, keySelector) {
  const map = new Map();
  items.forEach((item) => {
    const key = keySelector(item);
    const group = map.get(key) || [];
    group.push(item);
    map.set(key, group);
  });
  return map;
}

function createKeyCountMap(keys, defaultValue = 0) {
  return new Map(keys.map((key) => [key, defaultValue]));
}

function appendAggregation(map, key, entry) {
  const bucket = map.get(key);
  if (bucket) {
    bucket.push(entry);
    return;
  }
  map.set(key, [entry]);
}

function sortEntriesAscending(left, right) {
  return left.date.localeCompare(right.date) || left.createdAt.localeCompare(right.createdAt);
}

function cloneEntryForAggregation(entry) {
  return {
    id: entry.id,
    date: entry.date,
    category: entry.category,
    hours: entry.hours,
  };
}

function emptyTotals() {
  return {
    entryCount: 0,
    taskCount: 0,
    loggedHours: 0,
    breakHours: 0,
    payableHours: 0,
    plannedHours: 0,
    otHours: 0,
    extraHours: 0,
    ptoHours: 0,
    holidayHours: 0,
  };
}

function unique(values) {
  return [...new Set(values)];
}

function roundHours(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function formatHours(value) {
  return `${roundHours(value).toFixed(2)}h`;
}

module.exports = AdminPortalStore;
