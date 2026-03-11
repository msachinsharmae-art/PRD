# PulseSheet

PulseSheet is now a two-mode prototype for a global timesheet-to-payroll workflow:

- `Admin Portal`: clients, rate cards, project/task setup, country policies, approvals, payroll runs, notifications, and audit.
- `ESS Portal`: employee self-service time logging, draft saving, timesheet submission, and personal status tracking.

## Run

1. Open a terminal in this folder.
2. Run `npm start`.
3. Open `http://localhost:3000`.

## Active Structure

- `backend/server.js`: Express API and frontend serving
- `backend/store.js`: seeded in-memory data store and business workflow
- `backend/timesheetEngine.js`: date and estimate validation
- `backend/otEngine.js`: bucket classification and OT logic
- `backend/payrollEngine.js`: gross-to-net payroll calculation
- `frontend/dashboard.html`: portal shell
- `frontend/dashboard.mjs`: main browser entrypoint
- `frontend/portal-*.mjs`: frontend modules for API, DOM, rendering, and utilities

## Current Workflow

1. Admin creates client, rate card, project, and task setup.
2. ESS user logs time into draft entries.
3. ESS user submits timesheets for the selected pay period.
4. Admin reviews submitted entries and approves or rejects them.
5. Admin runs payroll on approved time.

## Notes

- Data is seeded in memory for demo purposes and resets when the server restarts.
- The prototype supports India and US policy defaults.
- Root `index.html` and `dashboard.html` are legacy redirect files; the active app is served from `frontend/`.
