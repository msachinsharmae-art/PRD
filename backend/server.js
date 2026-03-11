const express = require("express");
const cors = require("cors");
const path = require("path");
const AdminPortalStore = require("./store");

const app = express();
const store = new AdminPortalStore();
const frontendDir = path.join(__dirname, "..", "frontend");
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(frontendDir));

app.get("/", (_req, res) => {
  res.sendFile(path.join(frontendDir, "dashboard.html"));
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.get("/api/bootstrap", (_req, res) => {
  res.json({ success: true, snapshot: store.getSnapshot() });
});

app.post("/api/clients", handleMutation((req) => ({
  client: store.createClient(req.body),
})));

app.delete("/api/clients/:id", handleMutation((req) => ({
  removed: store.deleteClient(req.params.id),
})));

app.post("/api/rate-cards", handleMutation((req) => ({
  rateCard: store.createRateCard(req.body),
})));

app.delete("/api/rate-cards/:id", handleMutation((req) => ({
  removed: store.deleteRateCard(req.params.id),
})));

app.post("/api/projects", handleMutation((req) => ({
  project: store.createProject(req.body),
})));

app.delete("/api/projects/:id", handleMutation((req) => ({
  removed: store.deleteProject(req.params.id),
})));

app.post("/api/tasks", handleMutation((req) => ({
  task: store.createTask(req.body),
})));

app.delete("/api/tasks/:id", handleMutation((req) => ({
  removed: store.deleteTask(req.params.id),
})));

app.post("/api/timesheets", handleMutation((req) => ({
  entry: store.logTime(req.body),
})));

app.post("/api/timesheets/submit", handleMutation((req) => ({
  submission: store.submitTimesheet(req.body),
})));

app.post("/api/timesheets/:id/review", handleMutation((req) => ({
  timesheet: store.reviewTimesheet(req.params.id, req.body),
})));

app.post("/api/timesheets/bulk-review", handleMutation((req) => ({
  review: store.bulkReviewTimesheets(req.body),
})));

app.post("/api/approvals/:id", handleMutation((req) => ({
  timesheet: store.reviewTimesheet(req.params.id, req.body),
})));

app.post("/api/payroll/run", handleMutation((req) => ({
  payroll: store.generatePayroll(req.body),
})));

app.post("/api/settings/countries/:country", handleMutation((req) => ({
  countrySettings: store.updateCountrySettings(req.params.country, req.body),
})));

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.listen(PORT, () => {
  console.log(`Timesheet admin portal running on http://localhost:${PORT}`);
});

function handleMutation(action) {
  return (req, res) => {
    try {
      const payload = action(req) || {};
      res.json({
        success: true,
        ...payload,
        snapshot: store.getSnapshot(),
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  };
}
