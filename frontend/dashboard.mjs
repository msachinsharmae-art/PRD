import { elements } from "./portal-dom.mjs";
import { fetchJson, postJson } from "./portal-api.mjs";
import { renderAdmin } from "./portal-render-admin.mjs";
import { renderEss } from "./portal-render-ess.mjs";
import {
  fillSelect,
  getProjectsForWorker,
  getWorkers,
  humanize,
  pickCurrent,
  todayIso,
} from "./portal-utils.mjs";

const screenMeta = {
  admin: {
    overview: ["Overview", "Monitor configuration health, approvals, and payroll activity across India and the US."],
    clients: ["Clients", "Create and maintain client accounts before delivery teams start logging time."],
    "rate-cards": ["Rate Cards", "Set pay, shift, OT, and open-bucket rules that drive validation and payroll."],
    projects: ["Projects", "Define pay periods, assignments, and estimate policies for each client program."],
    tasks: ["Tasks", "Configure task ranges and estimates that ESS users can log against."],
    timesheets: ["Timesheets", "Browse every submitted and reviewed timesheet with task-level drilldown."],
    approvals: ["Approvals", "Review submitted timesheets, adjust logs, and approve or reject in bulk."],
    payroll: ["Payroll", "Generate gross-to-net payroll runs from approved time."],
    settings: ["Settings", "Maintain country defaults, permissions, alerts, and audit visibility."],
  },
  ess: {
    dashboard: ["Dashboard", "Track draft bundles, review activity, and latest payroll visibility for the selected worker."],
    timelog: ["Timelog", "Enter daily task logs, include breaks, and see draft lines before submission."],
    "my-timesheets": ["My Timesheets", "Club draft task logs into a timesheet and track approval status."],
  },
};

const appState = {
  snapshot: null,
  activePortal: "admin",
  activeScreens: {
    admin: "overview",
    ess: "dashboard",
  },
  lastPayroll: null,
  expandedTimesheets: new Set(),
  selectedApprovalIds: new Set(),
  agentMessages: [],
};

initialize();

async function initialize() {
  bindEvents();
  setDateDefaults();
  await loadBootstrap();
}

function bindEvents() {
  elements.portalAdminTab.addEventListener("click", () => switchPortal("admin"));
  elements.portalEssTab.addEventListener("click", () => switchPortal("ess"));
  elements.navButtons.forEach((button) => {
    button.addEventListener("click", () => switchScreen(button.dataset.screenTarget));
  });

  elements.clientCountry.addEventListener("change", syncClientCountryDefaults);
  elements.rateCardCountry.addEventListener("change", syncRateCardCountryDefaults);
  elements.projectClient.addEventListener("change", syncProjectDependencies);
  elements.settingsCountry.addEventListener("change", renderSettingsForm);
  elements.essWorker.addEventListener("change", () => {
    syncEssProjectOptions();
    syncEssSubmitMirror();
    renderEssSection();
  });
  elements.essProject.addEventListener("change", () => {
    syncEssTaskOptions();
    syncEssSubmitMirror();
    renderEssSection();
  });
  elements.essSubmitWorker.addEventListener("change", syncEssSubmitProjectOptions);
  elements.essCategory.addEventListener("change", syncEssBreakAvailability);

  bindSubmit(elements.clientForm, handleClientSubmit);
  bindSubmit(elements.rateCardForm, handleRateCardSubmit);
  bindSubmit(elements.projectForm, handleProjectSubmit);
  bindSubmit(elements.taskForm, handleTaskSubmit);
  bindSubmit(elements.settingsForm, handleSettingsSubmit);
  bindSubmit(elements.payrollRunForm, handlePayrollRun);
  bindSubmit(elements.essLogForm, handleEssLogSubmit);
  bindSubmit(elements.essSubmitForm, handleEssSubmit);
  bindSubmit(elements.agentForm, handleAgentSubmit);

  document.body.addEventListener("click", handleBodyClick);
  document.body.addEventListener("change", handleBodyChange);
  elements.approveSelectedButton.addEventListener("click", () => handleBulkReview("approved"));
  elements.rejectSelectedButton.addEventListener("click", () => handleBulkReview("rejected"));
  elements.agentHintButtons.forEach((button) => {
    button.addEventListener("click", () => {
      elements.agentInput.value = button.dataset.agentPrompt;
      elements.agentInput.focus();
    });
  });
}

function bindSubmit(form, handler) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await handler();
    } catch (error) {
      setFeedback(error.message, true);
    }
  });
}

async function loadBootstrap(message) {
  const result = await fetchJson("/api/bootstrap");
  applySnapshot(result.snapshot, message);
  if (!appState.agentMessages.length) {
    pushAgentMessage("agent", "result: success\naction: help\nsummary: Agent is ready. Use 'help' for command syntax.\nnext: summary");
    renderAgentMessages();
  }
}

function applySnapshot(snapshot, message) {
  appState.snapshot = snapshot;
  filterUiSelections();
  fillStaticSelects();
  renderSettingsForm();
  syncProjectDependencies();
  syncEssProjectOptions();
  syncEssSubmitProjectOptions();
  syncEssSubmitMirror();
  syncEssBreakAvailability();
  renderAdmin(snapshot, elements, appState);
  renderEssSection();
  updatePortalChrome();
  renderAgentMessages();
  if (message) {
    setFeedback(message, false);
  }
}

function filterUiSelections() {
  const timesheetIds = new Set(appState.snapshot?.timesheets?.map((timesheet) => timesheet.id) || []);
  appState.expandedTimesheets = new Set([...appState.expandedTimesheets].filter((id) => timesheetIds.has(id)));
  appState.selectedApprovalIds = new Set(
    [...appState.selectedApprovalIds].filter((id) =>
      appState.snapshot.timesheets.some((timesheet) => timesheet.id === id && timesheet.status === "submitted")
    )
  );
}

function fillStaticSelects() {
  const { enums, settings } = appState.snapshot;
  fillSelect(elements.clientCountry, enums.countries, elements.clientCountry.value || enums.countries[0]);
  fillSelect(elements.rateCardCountry, enums.countries, elements.rateCardCountry.value || enums.countries[0]);
  fillSelect(elements.settingsCountry, enums.countries, elements.settingsCountry.value || enums.countries[0]);
  fillSelect(elements.rateCardOtFrequency, enums.payPeriods, elements.rateCardOtFrequency.value || "weekly");
  fillSelect(elements.settingsOtFrequency, enums.payPeriods, elements.settingsOtFrequency.value || "weekly");
  fillSelect(elements.projectType, enums.projectTypes, elements.projectType.value || "fixed");
  fillSelect(elements.projectPayPeriod, enums.payPeriods, elements.projectPayPeriod.value || "weekly");
  fillSelect(elements.projectTaskPolicy, enums.estimatePolicies, elements.projectTaskPolicy.value || "approval");
  fillSelect(elements.projectEstimatePolicy, enums.estimatePolicies, elements.projectEstimatePolicy.value || "approval");
  fillSelect(elements.essCategory, enums.hourCategories, elements.essCategory.value || "work");

  const clients = appState.snapshot.clients.map((client) => ({ value: client.id, label: `${client.name} (${client.country})` }));
  const projects = appState.snapshot.projects.map((project) => ({ value: project.id, label: `${project.name} (${project.payPeriod})` }));
  const workers = getWorkers(appState.snapshot).map((worker) => ({ value: worker.id, label: `${worker.name} (${worker.country})` }));

  fillSelect(elements.projectClient, clients, pickCurrent(elements.projectClient, clients));
  fillSelect(elements.taskProject, projects, pickCurrent(elements.taskProject, projects));
  fillSelect(elements.payrollProject, projects, pickCurrent(elements.payrollProject, projects));
  fillSelect(elements.payrollWorker, workers, pickCurrent(elements.payrollWorker, workers));
  fillSelect(elements.essWorker, workers, pickCurrent(elements.essWorker, workers));
  fillSelect(elements.essSubmitWorker, workers, pickCurrent(elements.essSubmitWorker, workers));

  elements.clientCurrency.value = settings.countries[elements.clientCountry.value].currency;
  elements.rateCardCurrency.value = settings.countries[elements.rateCardCountry.value].currency;
  syncClientCountryDefaults();
  syncRateCardCountryDefaults();
}

function renderSettingsForm() {
  const config = appState.snapshot.settings.countries[elements.settingsCountry.value];
  elements.settingsDailyShift.value = config.shiftRules.dailyShiftHours;
  elements.settingsWeeklyLimit.value = config.shiftRules.weeklyLimit;
  elements.settingsBiweeklyLimit.value = config.shiftRules.biweeklyLimit;
  elements.settingsMonthlyLimit.value = config.shiftRules.monthlyLimit;
  elements.settingsOtFrequency.value = config.otRules.frequency;
  elements.settingsOtThreshold.value = config.otRules.threshold;
  elements.settingsOtMultiplier.value = config.otRules.multiplier;
  elements.settingsOpenBucket.value = String(config.otRules.openBucket);
  elements.settingsBasicPercent.value = config.compliance.basicPercent ?? "";
  elements.settingsPfRate.value = config.compliance.pfRate ?? "";
  elements.settingsEsiRate.value = config.compliance.esiRate ?? "";
  elements.settingsEsiThreshold.value = config.compliance.esiThreshold ?? "";
  elements.settingsProfessionalTax.value = config.compliance.professionalTax ?? "";
  elements.settingsTdsRate.value = config.compliance.tdsRate ?? "";
  elements.settingsFederalTaxRate.value = config.compliance.federalTaxRate ?? "";
  elements.settingsStateTaxRate.value = config.compliance.stateTaxRate ?? "";
  elements.settingsSocialSecurityRate.value = config.compliance.socialSecurityRate ?? "";
  elements.settingsMedicareRate.value = config.compliance.medicareRate ?? "";
}

function syncClientCountryDefaults() {
  const config = appState.snapshot.settings.countries[elements.clientCountry.value];
  elements.clientCurrency.value = config.currency;
  elements.clientGstNumber.placeholder = elements.clientCountry.value === "India" ? "Required for India" : "Not required for US";
}

function syncRateCardCountryDefaults() {
  const config = appState.snapshot.settings.countries[elements.rateCardCountry.value];
  elements.rateCardCurrency.value = config.currency;
  elements.rateCardDailyShift.value = config.shiftRules.dailyShiftHours;
  elements.rateCardWeeklyLimit.value = config.shiftRules.weeklyLimit;
  elements.rateCardBiweeklyLimit.value = config.shiftRules.biweeklyLimit;
  elements.rateCardMonthlyLimit.value = config.shiftRules.monthlyLimit;
  elements.rateCardOtFrequency.value = config.otRules.frequency;
  elements.rateCardOtThreshold.value = config.otRules.threshold;
  elements.rateCardOtMultiplier.value = config.otRules.multiplier;
  elements.rateCardOpenBucket.value = String(config.otRules.openBucket);
}

function syncProjectDependencies() {
  const client = appState.snapshot.clients.find((item) => item.id === elements.projectClient.value) || appState.snapshot.clients[0];
  const rateCards = client ? appState.snapshot.rateCards.filter((card) => card.country === client.country) : [];
  const options = rateCards.map((card) => ({ value: card.id, label: `${card.name} (${card.role})` }));
  fillSelect(elements.projectRateCard, options, pickCurrent(elements.projectRateCard, options));

  const workers = client ? getWorkers(appState.snapshot).filter((worker) => worker.country === client.country) : [];
  elements.projectAssignees.innerHTML = workers.map((worker) => `
    <label><input type="checkbox" value="${worker.id}"> ${worker.name}</label>
  `).join("");
}

function syncEssProjectOptions() {
  const workerId = elements.essWorker.value;
  const projects = workerId ? getProjectsForWorker(appState.snapshot, workerId) : [];
  const options = projects.map((project) => ({ value: project.id, label: `${project.name} (${project.country})` }));
  fillSelect(elements.essProject, options, pickCurrent(elements.essProject, options), "Select project");
  syncEssTaskOptions();
}

function syncEssTaskOptions() {
  const tasks = appState.snapshot.tasks.filter((task) => task.projectId === elements.essProject.value);
  const options = tasks.map((task) => ({ value: task.id, label: task.name }));
  fillSelect(elements.essTask, options, pickCurrent(elements.essTask, options), "Select task");
}

function syncEssSubmitProjectOptions() {
  const workerId = elements.essSubmitWorker.value || elements.essWorker.value;
  const projects = workerId ? getProjectsForWorker(appState.snapshot, workerId) : [];
  const options = projects.map((project) => ({ value: project.id, label: `${project.name} (${project.payPeriod})` }));
  fillSelect(elements.essSubmitProject, options, pickCurrent(elements.essSubmitProject, options), "Select project");
}

function syncEssSubmitMirror() {
  elements.essSubmitWorker.value = elements.essWorker.value;
  syncEssSubmitProjectOptions();
  if ([...elements.essSubmitProject.options].some((option) => option.value === elements.essProject.value)) {
    elements.essSubmitProject.value = elements.essProject.value;
  }
}

function syncEssBreakAvailability() {
  if (elements.essCategory.value !== "work") {
    elements.essBreakMinutes.value = "0";
    elements.essBreakMinutes.disabled = true;
    return;
  }
  elements.essBreakMinutes.disabled = false;
}

function renderEssSection() {
  renderEss(appState.snapshot, elements, elements.essWorker.value, appState);
}

function switchPortal(portal) {
  appState.activePortal = portal;
  updatePortalChrome();
}

function switchScreen(screen) {
  appState.activeScreens[appState.activePortal] = screen;
  updatePortalChrome();
}

function updatePortalChrome() {
  const portal = appState.activePortal;
  const screen = appState.activeScreens[portal];

  elements.portalAdminTab.classList.toggle("active", portal === "admin");
  elements.portalEssTab.classList.toggle("active", portal === "ess");
  elements.navGroups.forEach((group) => {
    group.classList.toggle("is-hidden", group.dataset.navPortal !== portal);
  });
  elements.navButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.screenTarget === screen);
  });
  elements.screens.forEach((section) => {
    section.classList.toggle("is-active", section.dataset.portal === portal && section.dataset.screen === screen);
  });

  const [title, subtitle] = screenMeta[portal][screen];
  elements.portalModeLabel.textContent = portal === "admin" ? "Admin Portal" : "ESS Portal";
  elements.screenTitle.textContent = title;
  elements.screenSubtitle.textContent = subtitle;
}

function setDateDefaults() {
  elements.projectStartDate.value = todayIso();
  elements.projectEndDate.value = todayIso();
  elements.taskStartDate.value = todayIso();
  elements.taskEndDate.value = todayIso();
  elements.taskDueDate.value = todayIso();
  elements.essDate.value = todayIso();
}

function setFeedback(message, isError) {
  elements.portalFeedback.textContent = message;
  elements.portalFeedback.style.color = isError ? "#9f2e16" : "#1f6a49";
}

async function handleClientSubmit() {
  const modules = [...elements.clientForm.querySelectorAll('input[type="checkbox"]:checked')].map((node) => node.value);
  const result = await postJson("/api/clients", {
    name: elements.clientName.value.trim(),
    country: elements.clientCountry.value,
    currency: elements.clientCurrency.value.trim(),
    gstNumber: elements.clientGstNumber.value.trim(),
    modules,
  });
  elements.clientForm.reset();
  [...elements.clientForm.querySelectorAll('input[type="checkbox"]')].forEach((node) => { node.checked = true; });
  applySnapshot(result.snapshot, `Client ${result.client.name} created.`);
}

async function handleRateCardSubmit() {
  const result = await postJson("/api/rate-cards", {
    name: elements.rateCardName.value.trim(),
    role: elements.rateCardRole.value.trim(),
    country: elements.rateCardCountry.value,
    currency: elements.rateCardCurrency.value.trim(),
    hourlyRate: elements.rateCardHourlyRate.value,
    dailyShiftHours: elements.rateCardDailyShift.value,
    weeklyLimit: elements.rateCardWeeklyLimit.value,
    biweeklyLimit: elements.rateCardBiweeklyLimit.value,
    monthlyLimit: elements.rateCardMonthlyLimit.value,
    otFrequency: elements.rateCardOtFrequency.value,
    otThreshold: elements.rateCardOtThreshold.value,
    otMultiplier: elements.rateCardOtMultiplier.value,
    openBucket: elements.rateCardOpenBucket.value,
  });
  elements.rateCardForm.reset();
  applySnapshot(result.snapshot, `Rate card ${result.rateCard.name} created.`);
}

async function handleProjectSubmit() {
  const assignedUserIds = [...elements.projectAssignees.querySelectorAll('input[type="checkbox"]:checked')].map((node) => node.value);
  const result = await postJson("/api/projects", {
    clientId: elements.projectClient.value,
    name: elements.projectName.value.trim(),
    type: elements.projectType.value,
    rateCardId: elements.projectRateCard.value,
    payPeriod: elements.projectPayPeriod.value,
    estimatedHours: elements.projectEstimatedHours.value,
    startDate: elements.projectStartDate.value,
    endDate: elements.projectEndDate.value,
    taskEstimatePolicy: elements.projectTaskPolicy.value,
    projectEstimatePolicy: elements.projectEstimatePolicy.value,
    assignedUserIds,
  });
  elements.projectForm.reset();
  setDateDefaults();
  applySnapshot(result.snapshot, `Project ${result.project.name} created.`);
}

async function handleTaskSubmit() {
  const result = await postJson("/api/tasks", {
    projectId: elements.taskProject.value,
    name: elements.taskName.value.trim(),
    startDate: elements.taskStartDate.value,
    endDate: elements.taskEndDate.value,
    dueDate: elements.taskDueDate.value,
    estimatedHours: elements.taskEstimatedHours.value,
  });
  elements.taskForm.reset();
  setDateDefaults();
  applySnapshot(result.snapshot, `Task ${result.task.name} created.`);
}

async function handleSettingsSubmit() {
  const country = elements.settingsCountry.value;
  const result = await postJson(`/api/settings/countries/${encodeURIComponent(country)}`, {
    dailyShiftHours: elements.settingsDailyShift.value,
    weeklyLimit: elements.settingsWeeklyLimit.value,
    biweeklyLimit: elements.settingsBiweeklyLimit.value,
    monthlyLimit: elements.settingsMonthlyLimit.value,
    otFrequency: elements.settingsOtFrequency.value,
    otThreshold: elements.settingsOtThreshold.value,
    otMultiplier: elements.settingsOtMultiplier.value,
    openBucket: elements.settingsOpenBucket.value,
    basicPercent: elements.settingsBasicPercent.value,
    pfRate: elements.settingsPfRate.value,
    esiRate: elements.settingsEsiRate.value,
    esiThreshold: elements.settingsEsiThreshold.value,
    professionalTax: elements.settingsProfessionalTax.value,
    tdsRate: elements.settingsTdsRate.value,
    federalTaxRate: elements.settingsFederalTaxRate.value,
    stateTaxRate: elements.settingsStateTaxRate.value,
    socialSecurityRate: elements.settingsSocialSecurityRate.value,
    medicareRate: elements.settingsMedicareRate.value,
  });
  applySnapshot(result.snapshot, `${country} settings updated.`);
}

async function handlePayrollRun() {
  const result = await postJson("/api/payroll/run", {
    workerId: elements.payrollWorker.value,
    projectId: elements.payrollProject.value,
    scope: elements.payrollScope.value,
  });
  appState.lastPayroll = result.payroll;
  applySnapshot(result.snapshot, `Payroll generated for ${result.payroll.workerName}.`);
}

async function handleEssLogSubmit() {
  const result = await postJson("/api/timesheets", {
    workerId: elements.essWorker.value,
    projectId: elements.essProject.value,
    taskId: elements.essTask.value,
    date: elements.essDate.value,
    loggedHours: elements.essLoggedHours.value,
    breakMinutes: elements.essBreakMinutes.value,
    category: elements.essCategory.value,
    notes: elements.essNotes.value.trim(),
  });
  elements.essLogForm.reset();
  elements.essDate.value = todayIso();
  elements.essCategory.value = "work";
  syncEssBreakAvailability();
  applySnapshot(result.snapshot, `Task log saved for ${result.entry.taskName}.`);
}

async function handleEssSubmit() {
  const result = await postJson("/api/timesheets/submit", {
    workerId: elements.essSubmitWorker.value,
    projectId: elements.essSubmitProject.value,
    scope: elements.essSubmitScope.value,
  });
  applySnapshot(result.snapshot, `${result.submission.timesheetCount} timesheet(s) submitted for ${result.submission.workerName}.`);
}

async function handleAgentSubmit() {
  const command = elements.agentInput.value.trim();
  if (!command) {
    return;
  }

  pushAgentMessage("user", command);
  elements.agentInput.value = "";

  try {
    const response = await executeAgentCommand(command);
    pushAgentMessage("agent", response);
  } catch (error) {
    pushAgentMessage("agent", `result: error\naction: unknown\nsummary: ${error.message}`);
  }
  renderAgentMessages();
}

async function executeAgentCommand(command) {
  const normalized = command.trim().toLowerCase();

  if (normalized === "help") {
    return [
      "result: success",
      "action: help",
      "summary: Supported commands: help, summary, show pending approvals, show notifications, show audit trail,",
      "details: log time ..., submit timesheet ..., approve timesheet <id>, reject timesheet <id> reason <text>,",
      "details: run payroll worker <name> project <name> scope <current|all>, preview payroll worker <name> project <name> scope <current|all>",
      "next: summary",
    ].join("\n");
  }

  if (normalized === "summary") {
    const metrics = appState.snapshot.summary.metrics;
    return [
      "result: success",
      "action: summary",
      `summary: clients=${metrics.clients}, projects=${metrics.projects}, pending_approvals=${metrics.pendingApprovals}, payroll_runs=${metrics.payrollRuns}`,
      `details: approved_hours=${metrics.approvedHours.toFixed(1)}h, ot_hours=${metrics.otHours.toFixed(1)}h, extra_hours=${metrics.extraHours.toFixed(1)}h`,
      "next: show pending approvals",
    ].join("\n");
  }

  if (normalized === "show pending approvals") {
    const pending = appState.snapshot.timesheets.filter((timesheet) => timesheet.status === "submitted");
    const list = pending.slice(0, 5).map((timesheet) => `${timesheet.id} (${timesheet.workerName}, ${timesheet.periodLabel})`).join("; ");
    return [
      "result: success",
      "action: show_pending_approvals",
      `summary: ${pending.length} submitted timesheet(s) pending review.`,
      `details: ${list || "No submitted timesheets."}`,
      "next: approve timesheet <id>",
    ].join("\n");
  }

  if (normalized === "show notifications") {
    const notifications = appState.snapshot.notifications.slice(0, 5).map((item) => `${item.level}: ${item.text}`).join("; ");
    return [
      "result: success",
      "action: show_notifications",
      `summary: ${appState.snapshot.notifications.length} notification(s) in feed.`,
      `details: ${notifications || "No notifications yet."}`,
      "next: show audit trail",
    ].join("\n");
  }

  if (normalized === "show audit trail") {
    const audits = appState.snapshot.audits.slice(0, 5).map((item) => `${item.type}: ${item.text}`).join("; ");
    return [
      "result: success",
      "action: show_audit_trail",
      `summary: ${appState.snapshot.audits.length} audit event(s) recorded.`,
      `details: ${audits || "No audit events yet."}`,
      "next: summary",
    ].join("\n");
  }

  if (normalized.startsWith("log time")) {
    return executeAgentLogTime(command);
  }

  if (normalized.startsWith("create client")) {
    return executeAgentCreateClient(command);
  }

  if (normalized.startsWith("create rate card")) {
    return executeAgentCreateRateCard(command);
  }

  if (normalized.startsWith("create project")) {
    return executeAgentCreateProject(command);
  }

  if (normalized.startsWith("create task")) {
    return executeAgentCreateTask(command);
  }

  if (normalized.startsWith("submit timesheet")) {
    return executeAgentSubmitTimesheet(command);
  }

  if (normalized.startsWith("approve timesheet")) {
    return executeAgentReview(command, "approved");
  }

  if (normalized.startsWith("reject timesheet")) {
    return executeAgentReview(command, "rejected");
  }

  if (normalized.startsWith("approve selected")) {
    return executeAgentApproveSelected(command);
  }

  if (normalized.startsWith("run payroll")) {
    return executeAgentPayroll(command, true);
  }

  if (normalized.startsWith("preview payroll")) {
    return executeAgentPayroll(command, false);
  }

  return [
    "result: error",
    "action: unknown",
    "summary: Command not recognized.",
    "details: Try 'help' to view supported syntax.",
    "next: help",
  ].join("\n");
}

async function executeAgentCreateClient(command) {
  const fields = parseCommandFields(command, ["country", "currency", "gst"]);
  const name = extractPhrase(command, "create client", "country");
  requireNamedValue(name, "client name");
  requireFields(fields, ["country", "currency"]);

  const result = await postJson("/api/clients", {
    name,
    country: fields.country,
    currency: fields.currency,
    gstNumber: fields.gst || "",
    modules: appState.snapshot.settings.clientModules,
  });
  applySnapshot(result.snapshot, `Agent created client ${result.client.name}.`);
  return [
    "result: success",
    "action: create_client",
    `entity_id: ${result.client.id}`,
    `summary: Client ${result.client.name} created.`,
    `details: country=${result.client.country}, currency=${result.client.currency}`,
    "next: create project <name> client <client> rate_card <card> pay_period <period> estimate <hours> start <yyyy-mm-dd> end <yyyy-mm-dd>",
  ].join("\n");
}

async function executeAgentCreateRateCard(command) {
  const fields = parseCommandFields(command, ["role", "country", "currency", "rate", "shift", "weekly", "biweekly", "monthly", "ot", "threshold", "multiplier", "open_bucket"]);
  const name = extractPhrase(command, "create rate card", "role");
  requireNamedValue(name, "rate card name");
  requireFields(fields, ["role", "country", "rate"]);

  const defaults = appState.snapshot.settings.countries[fields.country];
  if (!defaults) {
    throw new Error("Unsupported country.");
  }

  const result = await postJson("/api/rate-cards", {
    name,
    role: fields.role,
    country: fields.country,
    currency: fields.currency || defaults.currency,
    hourlyRate: fields.rate,
    dailyShiftHours: fields.shift || defaults.shiftRules.dailyShiftHours,
    weeklyLimit: fields.weekly || defaults.shiftRules.weeklyLimit,
    biweeklyLimit: fields.biweekly || defaults.shiftRules.biweeklyLimit,
    monthlyLimit: fields.monthly || defaults.shiftRules.monthlyLimit,
    otFrequency: fields.ot || defaults.otRules.frequency,
    otThreshold: fields.threshold || defaults.otRules.threshold,
    otMultiplier: fields.multiplier || defaults.otRules.multiplier,
    openBucket: normalizeOnOff(fields.open_bucket, defaults.otRules.openBucket),
  });
  applySnapshot(result.snapshot, `Agent created rate card ${result.rateCard.name}.`);
  return [
    "result: success",
    "action: create_rate_card",
    `entity_id: ${result.rateCard.id}`,
    `summary: Rate card ${result.rateCard.name} created.`,
    `details: country=${result.rateCard.country}, rate=${result.rateCard.currency} ${result.rateCard.hourlyRate}/hr`,
    "next: create project <name> client <client> rate_card <card> pay_period <period> estimate <hours> start <yyyy-mm-dd> end <yyyy-mm-dd>",
  ].join("\n");
}

async function executeAgentCreateProject(command) {
  const fields = parseCommandFields(command, ["client", "rate_card", "pay_period", "estimate", "start", "end", "type", "task_policy", "project_policy"]);
  const name = extractPhrase(command, "create project", "client");
  requireNamedValue(name, "project name");
  requireFields(fields, ["client", "rate_card", "pay_period", "estimate", "start", "end"]);
  const client = resolveClient(fields.client);
  const rateCard = resolveRateCard(fields.rate_card);

  const result = await postJson("/api/projects", {
    clientId: client.id,
    name,
    type: fields.type || "fixed",
    rateCardId: rateCard.id,
    payPeriod: fields.pay_period,
    estimatedHours: fields.estimate,
    startDate: fields.start,
    endDate: fields.end,
    taskEstimatePolicy: fields.task_policy || "approval",
    projectEstimatePolicy: fields.project_policy || "approval",
    assignedUserIds: [],
  });
  applySnapshot(result.snapshot, `Agent created project ${result.project.name}.`);
  return [
    "result: success",
    "action: create_project",
    `entity_id: ${result.project.id}`,
    `summary: Project ${result.project.name} created.`,
    `details: period=${result.project.payPeriod}, estimate=${result.project.estimatedHours}h`,
    "next: create task <name> project <project> estimate <hours> start <yyyy-mm-dd> end <yyyy-mm-dd> due <yyyy-mm-dd>",
  ].join("\n");
}

async function executeAgentCreateTask(command) {
  const fields = parseCommandFields(command, ["project", "estimate", "start", "end", "due"]);
  const name = extractPhrase(command, "create task", "project");
  requireNamedValue(name, "task name");
  requireFields(fields, ["project", "estimate", "start", "end", "due"]);
  const project = resolveProject(fields.project);

  const result = await postJson("/api/tasks", {
    projectId: project.id,
    name,
    estimatedHours: fields.estimate,
    startDate: fields.start,
    endDate: fields.end,
    dueDate: fields.due,
  });
  applySnapshot(result.snapshot, `Agent created task ${result.task.name}.`);
  return [
    "result: success",
    "action: create_task",
    `entity_id: ${result.task.id}`,
    `summary: Task ${result.task.name} created for ${project.name}.`,
    `details: range=${result.task.startDate} to ${result.task.endDate}, estimate=${result.task.estimatedHours}h`,
    "next: log time worker <name> project <project> task <task> date <yyyy-mm-dd> hours <n>",
  ].join("\n");
}

async function executeAgentLogTime(command) {
  const fields = parseCommandFields(command, ["worker", "project", "task", "date", "hours", "break", "category", "notes"]);
  requireFields(fields, ["worker", "project", "task", "date", "hours"]);
  const worker = resolveWorker(fields.worker);
  const project = resolveProject(fields.project);
  const task = resolveTask(project.id, fields.task);

  const result = await postJson("/api/timesheets", {
    workerId: worker.id,
    projectId: project.id,
    taskId: task.id,
    date: fields.date,
    loggedHours: fields.hours,
    breakMinutes: fields.break || "0",
    category: fields.category || "work",
    notes: fields.notes || "",
  });
  applySnapshot(result.snapshot, `Agent logged time for ${worker.name}.`);

  const entry = result.entry;
  const responseResult = entry.requiresApproval ? "pending_approval" : "success";
  return [
    `result: ${responseResult}`,
    "action: log_time",
    `entity_id: ${entry.id}`,
    `summary: Logged ${Number(entry.hours).toFixed(1)}h for ${entry.workerName} on ${entry.projectName}.`,
    `details: planned=${Number(entry.buckets.planned).toFixed(1)}h, ot=${Number(entry.buckets.ot).toFixed(1)}h, extra=${Number(entry.buckets.extra).toFixed(1)}h, pto=${Number(entry.buckets.pto).toFixed(1)}h`,
    "next: submit timesheet worker <name> project <name> scope current",
  ].join("\n");
}

async function executeAgentSubmitTimesheet(command) {
  const fields = parseCommandFields(command, ["worker", "project", "scope"]);
  requireFields(fields, ["worker", "project"]);
  const worker = resolveWorker(fields.worker);
  const project = resolveProject(fields.project);
  const scope = fields.scope || "current";

  const result = await postJson("/api/timesheets/submit", {
    workerId: worker.id,
    projectId: project.id,
    scope,
  });
  applySnapshot(result.snapshot, `Agent submitted timesheets for ${worker.name}.`);
  return [
    "result: success",
    "action: submit_timesheet",
    `summary: ${result.submission.timesheetCount} timesheet(s) submitted for ${result.submission.workerName}.`,
    `details: submitted_entries=${result.submission.submittedCount}, scope=${scope}`,
    "next: show pending approvals",
  ].join("\n");
}

async function executeAgentReview(command, action) {
  const fields = parseCommandFields(command, ["approve timesheet", "reject timesheet", "reason"]);
  const timesheetId = extractFirstTokenAfter(command, action === "approved" ? "approve timesheet" : "reject timesheet");
  if (!timesheetId) {
    throw new Error("Missing timesheet id.");
  }
  const reason = action === "rejected" ? (fields.reason || "").trim() : "";
  if (action === "rejected" && !reason) {
    throw new Error("Rejections require 'reason <text>'.");
  }

  const result = await postJson(`/api/timesheets/${encodeURIComponent(timesheetId)}/review`, {
    action,
    reviewerId: "USR-ADMIN-01",
    reason,
    adjustments: [],
  });
  applySnapshot(result.snapshot, `Agent ${humanize(action)} timesheet ${timesheetId}.`);
  return [
    "result: success",
    `action: ${action}_timesheet`,
    `entity_id: ${result.timesheet.id}`,
    `summary: Timesheet ${result.timesheet.id} ${humanize(action)}.`,
    `details: worker=${result.timesheet.workerName}, period=${result.timesheet.periodLabel}`,
    "next: show pending approvals",
  ].join("\n");
}

async function executeAgentApproveSelected(command) {
  const idsRaw = command.slice(command.toLowerCase().indexOf("approve selected") + "approve selected".length).trim();
  const timesheetIds = idsRaw.split(",").map((value) => value.trim()).filter(Boolean);
  if (!timesheetIds.length) {
    throw new Error("Provide comma-separated timesheet IDs.");
  }

  const result = await postJson("/api/timesheets/bulk-review", {
    action: "approved",
    reviewerId: "USR-ADMIN-01",
    reason: "",
    timesheetIds,
  });
  applySnapshot(result.snapshot, `Agent approved ${result.review.reviewedCount} timesheet(s).`);
  return [
    "result: success",
    "action: approve_selected",
    `summary: ${result.review.reviewedCount} timesheet(s) approved.`,
    `details: ids=${result.review.timesheetIds.join(", ")}`,
    "next: run payroll worker <name> project <name> scope current",
  ].join("\n");
}

async function executeAgentPayroll(command, commitRun) {
  const fields = parseCommandFields(command, ["worker", "project", "scope"]);
  requireFields(fields, ["worker", "project"]);
  const worker = resolveWorker(fields.worker);
  const project = resolveProject(fields.project);
  const scope = fields.scope || "current";

  if (commitRun) {
    const result = await postJson("/api/payroll/run", {
      workerId: worker.id,
      projectId: project.id,
      scope,
    });
    appState.lastPayroll = result.payroll;
    applySnapshot(result.snapshot, `Agent generated payroll for ${worker.name}.`);
    return [
      "result: success",
      "action: run_payroll",
      `entity_id: ${result.payroll.id}`,
      `summary: Payroll run created for ${result.payroll.workerName}.`,
      `details: gross=${result.payroll.currency} ${Number(result.payroll.gross).toFixed(0)}, net=${result.payroll.currency} ${Number(result.payroll.net).toFixed(0)}`,
      "next: show notifications",
    ].join("\n");
  }

  const approvedEntries = appState.snapshot.timeEntries.filter((entry) =>
    entry.workerId === worker.id &&
    entry.projectId === project.id &&
    entry.status === "approved"
  );
  if (!approvedEntries.length) {
    throw new Error("No approved entries available for payroll preview.");
  }
  const totals = approvedEntries.reduce((sum, entry) => ({
    planned: sum.planned + Number(entry.buckets.planned || 0),
    ot: sum.ot + Number(entry.buckets.ot || 0),
    extra: sum.extra + Number(entry.buckets.extra || 0),
    pto: sum.pto + Number(entry.buckets.pto || 0),
    holiday: sum.holiday + Number(entry.buckets.holiday || 0),
  }), { planned: 0, ot: 0, extra: 0, pto: 0, holiday: 0 });
  const rateCard = appState.snapshot.rateCards.find((card) => card.id === project.rateCardId);
  const rate = Number(rateCard?.hourlyRate || 0);
  const regularPay = (totals.planned + totals.extra) * rate;
  const otPay = totals.ot * rate * Number(rateCard?.otMultiplier || 1);
  const ptoPay = (totals.pto + totals.holiday) * rate;
  const gross = regularPay + otPay + ptoPay;

  return [
    "result: success",
    "action: preview_payroll",
    `summary: Payroll preview prepared for ${worker.name} (${scope}).`,
    `details: regular=${regularPay.toFixed(0)}, ot=${otPay.toFixed(0)}, pto=${ptoPay.toFixed(0)}, gross=${gross.toFixed(0)} ${project.currency}`,
    "next: run payroll worker <name> project <name> scope current",
  ].join("\n");
}

async function handleBodyClick(event) {
  const deleteButton = event.target.closest("[data-delete-type]");
  if (deleteButton) {
    await handleDeleteAction(deleteButton);
    return;
  }

  const toggle = event.target.closest("[data-toggle-timesheet]");
  if (toggle) {
    const timesheetId = toggle.dataset.toggleTimesheet;
    if (appState.expandedTimesheets.has(timesheetId)) {
      appState.expandedTimesheets.delete(timesheetId);
    } else {
      appState.expandedTimesheets.add(timesheetId);
    }
    renderAdmin(appState.snapshot, elements, appState);
    renderEssSection();
    return;
  }

  const reviewButton = event.target.closest("[data-review-action]");
  if (reviewButton) {
    await handleReviewAction(reviewButton);
  }
}

function handleBodyChange(event) {
  const checkbox = event.target.closest("[data-timesheet-select]");
  if (checkbox) {
    const id = checkbox.dataset.timesheetSelect;
    if (checkbox.checked) {
      appState.selectedApprovalIds.add(id);
    } else {
      appState.selectedApprovalIds.delete(id);
    }
  }
}

async function handleDeleteAction(button) {
  const type = button.dataset.deleteType;
  const id = button.dataset.id;
  const route = {
    client: `/api/clients/${id}`,
    "rate-card": `/api/rate-cards/${id}`,
    project: `/api/projects/${id}`,
    task: `/api/tasks/${id}`,
  }[type];

  const result = await fetchJson(route, { method: "DELETE" });
  applySnapshot(result.snapshot, `${type.replace("-", " ")} deleted.`);
}

async function handleReviewAction(button) {
  const timesheetId = button.dataset.timesheetId;
  const card = button.closest(".timesheet-card");
  const action = button.dataset.reviewAction;
  const reasonInput = card.querySelector(`[data-review-reason="${timesheetId}"]`);
  const adjustments = [...card.querySelectorAll("[data-adjust-logged]")].map((input) => {
    const entryId = input.dataset.entryId;
    const breakInput = card.querySelector(`[data-adjust-break][data-entry-id="${entryId}"]`);
    return {
      entryId,
      loggedHours: input.value,
      breakMinutes: breakInput ? breakInput.value : 0,
    };
  });

  const result = await postJson(`/api/timesheets/${encodeURIComponent(timesheetId)}/review`, {
    action,
    reviewerId: "USR-ADMIN-01",
    reason: reasonInput?.value.trim() || "",
    adjustments,
  });

  appState.selectedApprovalIds.delete(timesheetId);
  applySnapshot(result.snapshot, `Timesheet ${humanize(action)}.`);
}

async function handleBulkReview(action) {
  if (!appState.selectedApprovalIds.size) {
    setFeedback("Select at least one timesheet first.", true);
    return;
  }

  const result = await postJson("/api/timesheets/bulk-review", {
    action,
    reviewerId: "USR-ADMIN-01",
    reason: elements.approvalBulkReason.value.trim(),
    timesheetIds: [...appState.selectedApprovalIds],
  });

  appState.selectedApprovalIds.clear();
  elements.approvalBulkReason.value = "";
  applySnapshot(result.snapshot, `${result.review.reviewedCount} timesheet(s) ${humanize(action)}.`);
}

function resolveWorker(workerRef) {
  const workers = getWorkers(appState.snapshot);
  return resolveEntity(workers, workerRef, "worker");
}

function resolveProject(projectRef) {
  return resolveEntity(appState.snapshot.projects, projectRef, "project");
}

function resolveClient(clientRef) {
  return resolveEntity(appState.snapshot.clients, clientRef, "client");
}

function resolveRateCard(rateCardRef) {
  return resolveEntity(appState.snapshot.rateCards, rateCardRef, "rate card");
}

function resolveTask(projectId, taskRef) {
  const tasks = appState.snapshot.tasks.filter((task) => task.projectId === projectId);
  return resolveEntity(tasks, taskRef, "task");
}

function resolveEntity(list, rawRef, entityType) {
  const ref = String(rawRef || "").trim();
  if (!ref) {
    throw new Error(`Missing ${entityType}.`);
  }
  const lower = ref.toLowerCase();
  const exact = list.find((item) => item.id.toLowerCase() === lower || item.name.toLowerCase() === lower);
  if (exact) {
    return exact;
  }
  const partial = list.filter((item) => item.name.toLowerCase().includes(lower));
  if (partial.length === 1) {
    return partial[0];
  }
  if (partial.length > 1) {
    throw new Error(`Multiple ${entityType}s match '${ref}'. Use exact name or id.`);
  }
  throw new Error(`${humanize(entityType)} '${ref}' not found.`);
}

function requireFields(fields, names) {
  names.forEach((name) => {
    if (!String(fields[name] || "").trim()) {
      throw new Error(`Missing required field '${name}'.`);
    }
  });
}

function requireNamedValue(value, label) {
  if (!String(value || "").trim()) {
    throw new Error(`Missing required field '${label}'.`);
  }
}

function parseCommandFields(command, fieldNames) {
  const map = {};
  const names = fieldNames.slice().sort((left, right) => right.length - left.length);
  names.forEach((name) => {
    const pattern = new RegExp(`\\b${escapeRegExp(name)}\\s+([\\s\\S]*?)(?=\\b(?:${names.map(escapeRegExp).join("|")})\\b|$)`, "i");
    const match = command.match(pattern);
    if (match) {
      map[name] = match[1].trim().replace(/^"|"$/g, "");
    }
  });
  return map;
}

function extractFirstTokenAfter(command, phrase) {
  const pattern = new RegExp(`${escapeRegExp(phrase)}\\s+([^\\s]+)`, "i");
  const match = command.match(pattern);
  return match ? match[1].trim() : "";
}

function extractPhrase(command, startPhrase, endKey) {
  const pattern = new RegExp(`${escapeRegExp(startPhrase)}\\s+([\\s\\S]*?)\\s+${escapeRegExp(endKey)}\\b`, "i");
  const match = command.match(pattern);
  return match ? match[1].trim().replace(/^"|"$/g, "") : "";
}

function normalizeOnOff(value, fallback) {
  if (value == null || value === "") {
    return fallback;
  }
  const next = String(value).toLowerCase();
  if (["on", "true", "yes", "enabled"].includes(next)) {
    return true;
  }
  if (["off", "false", "no", "disabled"].includes(next)) {
    return false;
  }
  return fallback;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pushAgentMessage(role, text) {
  appState.agentMessages.push({
    id: `${Date.now()}-${Math.random()}`,
    role,
    text,
    createdAt: new Date().toISOString(),
  });
  if (appState.agentMessages.length > 50) {
    appState.agentMessages = appState.agentMessages.slice(-50);
  }
}

function renderAgentMessages() {
  if (!elements.agentMessages) {
    return;
  }
  elements.agentMessages.innerHTML = appState.agentMessages
    .slice(-14)
    .map((message) => `
      <article class="agent-message agent-${message.role}">
        <strong>${message.role === "agent" ? "Agent" : "You"}</strong>
        <pre>${message.text}</pre>
      </article>
    `)
    .join("");
  elements.agentMessages.scrollTop = elements.agentMessages.scrollHeight;
}
