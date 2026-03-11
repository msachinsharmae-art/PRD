const STORAGE_KEY = "pulsesheet.entries.v1";

const form = document.getElementById("timesheet-form");
const entriesBody = document.getElementById("entries-body");
const projectList = document.getElementById("project-list");
const formMessage = document.getElementById("form-message");
const emptyState = document.getElementById("empty-state");
const filterEmployee = document.getElementById("filter-employee");
const filterStatus = document.getElementById("filter-status");
const seedDemoButton = document.getElementById("seed-demo");
const exportCsvButton = document.getElementById("export-csv");

const summaryHours = document.getElementById("summary-hours");
const summaryProjects = document.getElementById("summary-projects");
const summaryPending = document.getElementById("summary-pending");
const heroHours = document.getElementById("hero-hours");
const heroEntries = document.getElementById("hero-entries");

const projectRowTemplate = document.getElementById("project-row-template");

let entries = loadEntries();

initialize();

function initialize() {
  document.getElementById("date").value = getTodayISO();
  form.addEventListener("submit", handleSubmit);
  filterEmployee.addEventListener("input", render);
  filterStatus.addEventListener("change", render);
  seedDemoButton.addEventListener("click", seedDemoData);
  exportCsvButton.addEventListener("click", exportCsv);
  render();
}

function handleSubmit(event) {
  event.preventDefault();
  const formData = new FormData(form);
  const record = {
    id: crypto.randomUUID(),
    employee: formData.get("employee").trim(),
    project: formData.get("project").trim(),
    task: formData.get("task").trim(),
    date: formData.get("date"),
    hours: Number(formData.get("hours")),
    status: formData.get("status"),
    notes: formData.get("notes").trim(),
  };

  if (!record.employee || !record.project || !record.task || !record.date || !record.hours) {
    setFormMessage("Complete all required fields.", true);
    return;
  }

  if (record.hours <= 0 || record.hours > 24) {
    setFormMessage("Hours must be between 0.25 and 24.", true);
    return;
  }

  entries = [record, ...entries];
  persistEntries();
  form.reset();
  document.getElementById("date").value = getTodayISO();
  document.getElementById("status").value = "Draft";
  setFormMessage("Entry saved.");
  render();
}

function render() {
  const filteredEntries = getFilteredEntries();
  const weeklyEntries = getCurrentWeekEntries(filteredEntries);

  renderTable(weeklyEntries);
  renderSummary(weeklyEntries);
  renderProjects(weeklyEntries);
}

function renderTable(records) {
  entriesBody.innerHTML = "";

  if (!records.length) {
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;

  records
    .sort((a, b) => b.date.localeCompare(a.date))
    .forEach((entry) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${formatDate(entry.date)}</td>
        <td>${escapeHtml(entry.employee)}</td>
        <td>${escapeHtml(entry.project)}</td>
        <td>${escapeHtml(entry.task)}</td>
        <td>${entry.hours.toFixed(2)}</td>
        <td><span class="status-pill ${statusClass(entry.status)}">${entry.status}</span></td>
        <td><button type="button" class="icon-button" data-id="${entry.id}">Delete</button></td>
      `;
      row.querySelector("button").addEventListener("click", () => deleteEntry(entry.id));
      entriesBody.appendChild(row);
    });
}

function renderSummary(records) {
  const totalHours = records.reduce((sum, entry) => sum + entry.hours, 0);
  const uniqueProjects = new Set(records.map((entry) => entry.project.toLowerCase()));
  const pending = records.filter((entry) => entry.status !== "Approved").length;

  summaryHours.textContent = totalHours.toFixed(1);
  summaryProjects.textContent = String(uniqueProjects.size);
  summaryPending.textContent = String(pending);
  heroHours.textContent = `${totalHours.toFixed(1)}h`;
  heroEntries.textContent = String(records.length);
}

function renderProjects(records) {
  projectList.innerHTML = "";

  if (!records.length) {
    projectList.innerHTML = '<p class="empty-state">No project activity in the current week.</p>';
    return;
  }

  const projectTotals = records.reduce((map, entry) => {
    const key = entry.project;
    if (!map.has(key)) {
      map.set(key, { hours: 0, employees: new Set() });
    }
    const current = map.get(key);
    current.hours += entry.hours;
    current.employees.add(entry.employee);
    return map;
  }, new Map());

  [...projectTotals.entries()]
    .sort((a, b) => b[1].hours - a[1].hours)
    .forEach(([project, details]) => {
      const node = projectRowTemplate.content.firstElementChild.cloneNode(true);
      node.querySelector(".project-name").textContent = project;
      node.querySelector(".project-meta").textContent = `${details.employees.size} employee(s)`;
      node.querySelector(".project-hours").textContent = `${details.hours.toFixed(1)}h`;
      projectList.appendChild(node);
    });
}

function getFilteredEntries() {
  const employeeQuery = filterEmployee.value.trim().toLowerCase();
  const statusValue = filterStatus.value;

  return entries.filter((entry) => {
    const employeeMatches = !employeeQuery || entry.employee.toLowerCase().includes(employeeQuery);
    const statusMatches = statusValue === "All" || entry.status === statusValue;
    return employeeMatches && statusMatches;
  });
}

function getCurrentWeekEntries(records) {
  const [year, week] = getISOWeekParts(new Date());
  return records.filter((entry) => {
    const [entryYear, entryWeek] = getISOWeekParts(new Date(`${entry.date}T00:00:00`));
    return year === entryYear && week === entryWeek;
  });
}

function deleteEntry(id) {
  entries = entries.filter((entry) => entry.id !== id);
  persistEntries();
  render();
}

function loadEntries() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function persistEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function seedDemoData() {
  if (entries.length) {
    setFormMessage("Demo data was skipped because entries already exist.", true);
    return;
  }

  const today = new Date();
  const offsets = [0, -1, -2, -3, -4];
  const demo = [
    ["Aarav Shah", "Website Redesign", "Wireframe revisions", 7.5, "Submitted"],
    ["Riya Patel", "Payroll Integration", "API mapping", 8, "Approved"],
    ["Aarav Shah", "Website Redesign", "Stakeholder review", 6.5, "Draft"],
    ["Neha Mehta", "Internal Ops", "Timesheet QA", 5, "Submitted"],
    ["Riya Patel", "Payroll Integration", "Bug fixes", 7.25, "Approved"],
  ].map(([employee, project, task, hours, status], index) => ({
    id: crypto.randomUUID(),
    employee,
    project,
    task,
    hours,
    status,
    notes: "",
    date: shiftDate(today, offsets[index]),
  }));

  entries = demo;
  persistEntries();
  setFormMessage("Demo data loaded.");
  render();
}

function exportCsv() {
  const records = getCurrentWeekEntries(getFilteredEntries());
  if (!records.length) {
    setFormMessage("Nothing to export for the current week.", true);
    return;
  }

  const header = ["Date", "Employee", "Project", "Task", "Hours", "Status", "Notes"];
  const lines = records.map((entry) => [
    entry.date,
    entry.employee,
    entry.project,
    entry.task,
    entry.hours.toFixed(2),
    entry.status,
    entry.notes,
  ]);

  const csv = [header, ...lines]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `pulsesheet-${getTodayISO()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function setFormMessage(message, isError = false) {
  formMessage.textContent = message;
  formMessage.style.color = isError ? "#8f3f2a" : "var(--success)";
}

function statusClass(status) {
  return `status-${status.toLowerCase()}`;
}

function getTodayISO() {
  return new Date().toISOString().slice(0, 10);
}

function shiftDate(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next.toISOString().slice(0, 10);
}

function getISOWeekParts(date) {
  const next = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = next.getUTCDay() || 7;
  next.setUTCDate(next.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(next.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((next - yearStart) / 86400000) + 1) / 7);
  return [next.getUTCFullYear(), week];
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
