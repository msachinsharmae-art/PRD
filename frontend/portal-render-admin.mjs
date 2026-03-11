import {
  capitalize,
  formatBreakMinutes,
  formatCurrency,
  formatDateTime,
  formatHours,
  getTimesheetEntries,
  humanize,
  normalizeLevel,
  renderBucketPills,
  renderFlagPills,
} from "./portal-utils.mjs";

export function renderAdmin(snapshot, elements, uiState) {
  renderMetrics(snapshot, elements);
  renderCountryMix(snapshot, elements);
  renderProjectHealth(snapshot, elements);
  renderClients(snapshot, elements);
  renderRateCards(snapshot, elements);
  renderProjects(snapshot, elements);
  renderTasks(snapshot, elements);
  renderTimesheets(snapshot, elements, uiState);
  renderApprovals(snapshot, elements, uiState);
  renderPayrollRuns(snapshot, elements);
  renderPayrollPreview(snapshot, elements, uiState.lastPayroll);
  renderSignals(snapshot, elements);
}

function renderMetrics(snapshot, elements) {
  const metrics = snapshot.summary.metrics;
  elements.metricClients.textContent = String(metrics.clients);
  elements.metricProjects.textContent = String(metrics.projects);
  elements.metricPending.textContent = String(metrics.pendingApprovals);
  elements.metricPayrollRuns.textContent = String(metrics.payrollRuns);
  elements.metricApprovedHours.textContent = formatHours(metrics.approvedHours);
  elements.metricOtHours.textContent = formatHours(metrics.otHours);
  elements.criticalRule.textContent = snapshot.summary.criticalRule;
}

function renderCountryMix(snapshot, elements) {
  elements.countryMixBody.innerHTML = snapshot.summary.countryMix
    .map((row) => `
      <tr>
        <td>${row.country}</td>
        <td>${row.clients}</td>
        <td>${row.projects}</td>
        <td>${formatHours(row.approvedHours)}</td>
        <td>${row.payrollRuns}</td>
      </tr>
    `)
    .join("");
}

function renderProjectHealth(snapshot, elements) {
  elements.projectHealthBody.innerHTML = snapshot.summary.projectHealth
    .map((row) => `
      <tr>
        <td>${row.name}</td>
        <td>${formatHours(row.estimatedHours)}</td>
        <td>${formatHours(row.loggedHours)}</td>
        <td>${formatHours(row.variance)}</td>
        <td>${row.pendingApprovals}</td>
      </tr>
    `)
    .join("");
}

function renderClients(snapshot, elements) {
  elements.clientsBody.innerHTML = snapshot.clients
    .map((client) => `
      <tr>
        <td>${client.name}</td>
        <td>${client.country}</td>
        <td>${client.currency}</td>
        <td>${client.modules.join(", ")}</td>
        <td><button class="table-action" data-delete-type="client" data-id="${client.id}" type="button">Delete</button></td>
      </tr>
    `)
    .join("");
}

function renderRateCards(snapshot, elements) {
  elements.rateCardsBody.innerHTML = snapshot.rateCards
    .map((rateCard) => `
      <tr>
        <td>${rateCard.name}</td>
        <td>${rateCard.country}</td>
        <td>${rateCard.role}</td>
        <td>${formatCurrency(rateCard.hourlyRate, rateCard.currency)}</td>
        <td>${capitalize(rateCard.otFrequency)} / ${rateCard.otThreshold}h x ${rateCard.otMultiplier}</td>
        <td><button class="table-action" data-delete-type="rate-card" data-id="${rateCard.id}" type="button">Delete</button></td>
      </tr>
    `)
    .join("");
}

function renderProjects(snapshot, elements) {
  elements.projectsBody.innerHTML = snapshot.projects
    .map((project) => `
      <tr>
        <td>${project.name}</td>
        <td>${project.clientName}</td>
        <td>${capitalize(project.payPeriod)}</td>
        <td>${formatHours(project.estimatedHours)}</td>
        <td>${capitalize(project.taskEstimatePolicy)} / ${capitalize(project.projectEstimatePolicy)}</td>
        <td><button class="table-action" data-delete-type="project" data-id="${project.id}" type="button">Delete</button></td>
      </tr>
    `)
    .join("");
}

function renderTasks(snapshot, elements) {
  elements.tasksBody.innerHTML = snapshot.tasks
    .map((task) => `
      <tr>
        <td>${task.name}</td>
        <td>${task.projectName}</td>
        <td>${task.startDate} to ${task.endDate}</td>
        <td>${formatHours(task.estimatedHours)}</td>
        <td><button class="table-action" data-delete-type="task" data-id="${task.id}" type="button">Delete</button></td>
      </tr>
    `)
    .join("");
}

function renderTimesheets(snapshot, elements, uiState) {
  const timesheets = snapshot.timesheets
    .slice()
    .sort((left, right) => new Date(right.submittedAt || right.reviewedAt || 0) - new Date(left.submittedAt || left.reviewedAt || 0));

  elements.adminTimesheetsList.innerHTML = timesheets.length
    ? timesheets.map((timesheet) => renderTimesheetCard(snapshot, timesheet, uiState, { mode: "read" })).join("")
    : '<article class="empty-state"><p>No timesheets yet. ESS submissions will appear here after users club task logs into a timesheet.</p></article>';
}

function renderApprovals(snapshot, elements, uiState) {
  const submittedTimesheets = snapshot.timesheets
    .filter((timesheet) => timesheet.status === "submitted")
    .sort((left, right) => new Date(right.submittedAt) - new Date(left.submittedAt));

  elements.approvalsList.innerHTML = submittedTimesheets.length
    ? submittedTimesheets.map((timesheet) => renderTimesheetCard(snapshot, timesheet, uiState, { mode: "review" })).join("")
    : '<article class="empty-state"><p>No submitted timesheets are waiting for review.</p></article>';
}

function renderPayrollRuns(snapshot, elements) {
  elements.payrollRunsBody.innerHTML = snapshot.payrollRuns
    .map((run) => `
      <tr>
        <td>${formatDateTime(run.generatedAt)}</td>
        <td>${run.workerName}</td>
        <td>${run.projectName}</td>
        <td>${formatCurrency(run.gross, run.currency)}</td>
        <td>${formatCurrency(run.net, run.currency)}</td>
      </tr>
    `)
    .join("");
}

function renderPayrollPreview(snapshot, elements, lastPayroll) {
  const payroll = lastPayroll || snapshot.payrollRuns[0];
  if (!payroll) {
    elements.payrollPreview.innerHTML = "<p>Generate a payroll run to preview gross, deductions, and net pay.</p>";
    return;
  }

  elements.payrollPreview.innerHTML = `
    <div class="payroll-preview-grid">
      <article class="preview-block">
        <span>Worker</span>
        <strong>${payroll.workerName}</strong>
        <p>${payroll.projectName}</p>
      </article>
      <article class="preview-block">
        <span>Gross</span>
        <strong>${formatCurrency(payroll.gross, payroll.currency)}</strong>
        <p>${payroll.scopeLabel}</p>
      </article>
      <article class="preview-block">
        <span>Deductions</span>
        <strong>${formatCurrency(payroll.totalDeductions, payroll.currency)}</strong>
        <p>${payroll.deductions.map((item) => `${item.label}: ${formatCurrency(item.amount, payroll.currency)}`).join("<br>")}</p>
      </article>
      <article class="preview-block">
        <span>Net pay</span>
        <strong>${formatCurrency(payroll.net, payroll.currency)}</strong>
        <p>Regular ${formatHours(payroll.hours.regular)} | OT ${formatHours(payroll.hours.ot)}</p>
      </article>
    </div>
  `;
}

function renderSignals(snapshot, elements) {
  elements.permissionsBody.innerHTML = snapshot.settings.permissionMatrix
    .map((row) => `
      <tr>
        <td>${row.role}</td>
        <td>${row.scope}</td>
        <td>${row.actions.length ? row.actions.join(", ") : "View own data only"}</td>
      </tr>
    `)
    .join("");

  elements.notificationsList.innerHTML = snapshot.notifications.length
    ? snapshot.notifications
      .slice(0, 10)
      .map((item) => `
        <article class="signal-card">
          <span class="status-pill signal-${normalizeLevel(item.level)}">${capitalize(item.level)}</span>
          <p>${item.text}</p>
          <small>${formatDateTime(item.createdAt)}</small>
        </article>
      `)
      .join("")
    : '<article class="signal-card"><p>No alerts yet.</p></article>';

  elements.auditList.innerHTML = snapshot.audits.length
    ? snapshot.audits
      .slice(0, 10)
      .map((item) => `
        <article class="audit-card">
          <strong>${humanize(item.type)}</strong>
          <p>${item.text}</p>
          <small>${item.actor} | ${formatDateTime(item.createdAt)}</small>
        </article>
      `)
      .join("")
    : '<article class="audit-card"><p>No audit events yet.</p></article>';
}

function renderTimesheetCard(snapshot, timesheet, uiState, options) {
  const expanded = uiState.expandedTimesheets.has(timesheet.id);
  const selected = uiState.selectedApprovalIds.has(timesheet.id);
  const entries = getTimesheetEntries(snapshot, timesheet.id);
  const canEdit = options.mode === "review";

  return `
    <article class="timesheet-card ${expanded ? "is-expanded" : ""}">
      <div class="timesheet-header">
        <div class="timesheet-header-main">
          ${options.mode === "review" ? `<label class="checkbox-pill"><input type="checkbox" data-timesheet-select="${timesheet.id}" ${selected ? "checked" : ""}> Select</label>` : ""}
          <button class="timesheet-toggle" data-toggle-timesheet="${timesheet.id}" type="button">
            <strong>${timesheet.workerName} · ${timesheet.projectName}</strong>
            <span>${timesheet.periodLabel}</span>
          </button>
        </div>
        <div class="timesheet-header-stats">
          <span class="status-pill status-${timesheet.status}">${humanize(timesheet.status)}</span>
          <span class="mini-stat">Payable ${formatHours(timesheet.totals.payableHours)}</span>
          <span class="mini-stat">Break ${formatHours(timesheet.totals.breakHours)}</span>
          <span class="mini-stat">OT ${formatHours(timesheet.totals.otHours)}</span>
        </div>
      </div>
      <div class="timesheet-meta">
        <span>${timesheet.country}</span>
        <span>${capitalize(timesheet.payPeriod)}</span>
        <span>${timesheet.totals.entryCount} task logs</span>
        <span>${timesheet.submittedAt ? `Submitted ${formatDateTime(timesheet.submittedAt)}` : ""}</span>
        ${timesheet.reviewedAt ? `<span>Reviewed ${formatDateTime(timesheet.reviewedAt)}</span>` : ""}
      </div>
      <div class="pill-row">
        ${renderFlagPills(timesheet.flags) || '<span class="pill pill-muted">No exception flags</span>'}
      </div>
      ${expanded ? renderTimesheetDetail(timesheet, entries, canEdit) : ""}
    </article>
  `;
}

function renderTimesheetDetail(timesheet, entries, canEdit) {
  return `
    <div class="timesheet-detail">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Task</th>
              <th>Logged</th>
              <th>Break</th>
              <th>Payable</th>
              <th>Buckets</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${entries.map((entry) => `
              <tr>
                <td>${entry.date}</td>
                <td>
                  <strong>${entry.taskName}</strong>
                  <small>${entry.notes || "No notes added."}</small>
                  ${entry.adjustedAt ? `<small>Adjusted by ${entry.adjustedBy} on ${formatDateTime(entry.adjustedAt)}</small>` : ""}
                </td>
                <td>
                  ${canEdit
                    ? `<input class="line-input" data-adjust-logged data-entry-id="${entry.id}" type="number" min="0.25" max="24" step="0.25" value="${entry.loggedHours}">`
                    : formatHours(entry.loggedHours)}
                </td>
                <td>
                  ${canEdit
                    ? `<input class="line-input" data-adjust-break data-entry-id="${entry.id}" type="number" min="0" max="600" step="15" value="${entry.breakMinutes}" ${entry.category !== "work" ? "disabled" : ""}>`
                    : formatBreakMinutes(entry.breakMinutes)}
                </td>
                <td>${formatHours(entry.hours)}</td>
                <td>${renderBucketPills(entry.buckets) || "-"}</td>
                <td><span class="status-pill status-${entry.status}">${humanize(entry.status)}</span></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
      <div class="timesheet-footer">
        <div class="timesheet-footer-copy">
          <strong>Total logged ${formatHours(timesheet.totals.loggedHours)}</strong>
          <p>Break ${formatHours(timesheet.totals.breakHours)} · Payable ${formatHours(timesheet.totals.payableHours)} · ${timesheet.totals.taskCount} tasks</p>
        </div>
        ${canEdit ? `
          <div class="timesheet-review-actions">
            <input class="review-input" data-review-reason="${timesheet.id}" type="text" placeholder="Reason required for rejection" value="${timesheet.reviewComment || ""}">
            <button class="primary-button" data-review-action="approved" data-timesheet-id="${timesheet.id}" type="button">Approve</button>
            <button class="secondary-button" data-review-action="rejected" data-timesheet-id="${timesheet.id}" type="button">Reject</button>
          </div>
        ` : `
          <div class="timesheet-footer-copy">
            <strong>${timesheet.reviewerName || "Pending review"}</strong>
            <p>${timesheet.reviewComment || "No reviewer comment added."}</p>
          </div>
        `}
      </div>
    </div>
  `;
}
