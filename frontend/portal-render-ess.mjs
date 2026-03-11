import {
  formatBreakMinutes,
  formatCurrency,
  formatDateTime,
  formatHours,
  getDraftGroups,
  getEntriesForWorker,
  getTimesheetEntries,
  getTimesheetsForWorker,
  getWorkers,
  humanize,
  renderBucketPills,
  renderFlagPills,
  summarizeEntries,
} from "./portal-utils.mjs";

export function renderEss(snapshot, elements, currentWorkerId, uiState) {
  const worker = getWorkers(snapshot).find((item) => item.id === currentWorkerId) || getWorkers(snapshot)[0] || null;
  const entries = worker ? getEntriesForWorker(snapshot, worker.id) : [];
  const draftGroups = worker ? getDraftGroups(snapshot, worker.id) : [];
  const timesheets = worker ? getTimesheetsForWorker(snapshot, worker.id) : [];
  const latestRun = worker ? snapshot.payrollRuns.find((run) => run.workerId === worker.id) : null;

  elements.essDraftCount.textContent = String(draftGroups.length);
  elements.essSubmittedCount.textContent = String(timesheets.filter((timesheet) => timesheet.status === "submitted").length);
  elements.essApprovedCount.textContent = String(timesheets.filter((timesheet) => timesheet.status === "approved").length);
  elements.essNetPreview.textContent = latestRun ? formatCurrency(latestRun.net, latestRun.currency) : "-";

  elements.essDraftGroups.innerHTML = draftGroups.length
    ? draftGroups.map((group) => renderDraftGroup(group)).join("")
    : '<article class="empty-state"><p>No draft task bundles yet. Add task logs from the Timelog screen and they will appear here before submission.</p></article>';

  elements.essEntriesBody.innerHTML = entries.length
    ? entries
      .filter((entry) => entry.status === "draft")
      .slice()
      .sort((left, right) => right.date.localeCompare(left.date))
      .map((entry) => `
        <tr>
          <td>${entry.date}</td>
          <td>${entry.projectName}</td>
          <td>${entry.taskName}</td>
          <td>${formatHours(entry.loggedHours)}</td>
          <td>${formatBreakMinutes(entry.breakMinutes)}</td>
          <td>${formatHours(entry.hours)}</td>
          <td>${renderFlagPills(entry.flags) || "-"}</td>
        </tr>
      `)
      .join("")
    : '<tr><td colspan="7">No draft entries for this worker yet.</td></tr>';

  elements.essTimesheetsList.innerHTML = timesheets.length
    ? timesheets.map((timesheet) => renderEssTimesheet(snapshot, timesheet, uiState)).join("")
    : '<article class="empty-state"><p>No submitted timesheets yet.</p></article>';

  const relevantAudits = snapshot.audits
    .filter((item) => item.meta?.workerId === worker?.id)
    .slice(0, 6);
  const relevantNotifications = snapshot.notifications
    .filter((item) => item.meta?.workerId === worker?.id)
    .slice(0, 6);
  const combined = [...relevantNotifications, ...relevantAudits]
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
    .slice(0, 6);

  elements.essStatusFeed.innerHTML = combined.length
    ? combined.map((item) => `
      <article class="signal-card">
        <strong>${item.text}</strong>
        <small>${formatDateTime(item.createdAt)}</small>
      </article>
    `).join("")
    : '<article class="signal-card"><p>No worker-specific status updates yet.</p></article>';
}

function renderDraftGroup(group) {
  return `
    <article class="draft-card">
      <div class="draft-card-head">
        <div>
          <strong>${group.projectName}</strong>
          <p>${group.periodLabel} · ${group.country}</p>
        </div>
        <div class="draft-card-stats">
          <span class="mini-stat">Logged ${formatHours(group.totals.loggedHours)}</span>
          <span class="mini-stat">Break ${formatHours(group.totals.breakHours)}</span>
          <span class="mini-stat">Payable ${formatHours(group.totals.payableHours)}</span>
        </div>
      </div>
      <div class="pill-row">
        ${group.entries.map((entry) => `<span class="pill pill-muted">${entry.taskName} · ${formatHours(entry.hours)}</span>`).join("")}
      </div>
    </article>
  `;
}

function renderEssTimesheet(snapshot, timesheet, uiState) {
  const expanded = uiState.expandedTimesheets.has(timesheet.id);
  const entries = getTimesheetEntries(snapshot, timesheet.id);
  const totals = summarizeEntries(entries);

  return `
    <article class="timesheet-card ${expanded ? "is-expanded" : ""}">
      <div class="timesheet-header">
        <div class="timesheet-header-main">
          <button class="timesheet-toggle" data-toggle-timesheet="${timesheet.id}" type="button">
            <strong>${timesheet.projectName}</strong>
            <span>${timesheet.periodLabel}</span>
          </button>
        </div>
        <div class="timesheet-header-stats">
          <span class="status-pill status-${timesheet.status}">${humanize(timesheet.status)}</span>
          <span class="mini-stat">Payable ${formatHours(totals.payableHours)}</span>
          <span class="mini-stat">OT ${formatHours(totals.otHours)}</span>
        </div>
      </div>
      <div class="pill-row">
        ${renderFlagPills(timesheet.flags) || '<span class="pill pill-muted">No exception flags</span>'}
      </div>
      ${expanded ? `
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
                </tr>
              </thead>
              <tbody>
                ${entries.map((entry) => `
                  <tr>
                    <td>${entry.date}</td>
                    <td>
                      <strong>${entry.taskName}</strong>
                      <small>${entry.notes || "No notes added."}</small>
                    </td>
                    <td>${formatHours(entry.loggedHours)}</td>
                    <td>${formatBreakMinutes(entry.breakMinutes)}</td>
                    <td>${formatHours(entry.hours)}</td>
                    <td>${renderBucketPills(entry.buckets) || "-"}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
          <div class="timesheet-footer">
            <div class="timesheet-footer-copy">
              <strong>Total logged ${formatHours(totals.loggedHours)}</strong>
              <p>Break ${formatHours(totals.breakHours)} · Payable ${formatHours(totals.payableHours)} · Submitted ${formatDateTime(timesheet.submittedAt)}</p>
            </div>
            <div class="timesheet-footer-copy">
              <strong>${timesheet.reviewerName || "Pending review"}</strong>
              <p>${timesheet.reviewComment || "No reviewer comment yet."}</p>
            </div>
          </div>
        </div>
      ` : ""}
    </article>
  `;
}
