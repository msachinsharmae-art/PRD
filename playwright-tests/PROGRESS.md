# Playwright Test Progress — Zimyo Portal

## Portal Details
- **URL**: https://www.zimyo.net
- **Credentials**: devteam@yopmail.com / Zimyo@12345
- **Post-login URL**: https://www.zimyo.net/admin/dashboard/master-dashboard
- **Payroll URL**: https://www.zimyo.net/payroll/ (opens in new tab from nine-dot menu)

---

## Login Page Selectors (MUI/React App)
| Element | Selector |
|---------|----------|
| Login Type Dropdown | `#login_type` |
| Username | `#username` (name="username") |
| Password | `#password` (name="password") |
| Submit Button | `button[type="submit"]` (text: "Login") |
| Password Toggle | `button[aria-label="toggle password visibility"]` |
| SSO Button | text: "Login With SSO" |
| Forgot Password | text: "Forgot password?" |

---

## Navigation: Nine-Dot App Switcher
- **Selector**: `button:has(svg[data-testid="AppsIcon"])` (top-right, ~x:1132)
- **Popup contains**: ESS, Learn, Performance, Payroll, Recruit
- **Payroll opens in NEW TAB** → `https://www.zimyo.net/payroll/`

---

## Admin Sidebar Modules
| Module | URL |
|--------|-----|
| Dashboard | /admin/dashboard/master-dashboard |
| Inbox | /admin/request/employee-request/probation/confirmation |
| Core HR | /admin/core_hr/users/edm-dashboard |
| Advance HR | /admin/advance-hr/onboarding/overview |
| Finance | /admin/finance/expense/overview |
| Engage | /admin/engage/announcement/dashboard |
| Timesheet | /admin/timesheet/dashboard |
| Workflow | /admin/workflows/configure-workflows |
| Reports | /admin/reports/attendance |
| Recruit | /admin/recruit |
| Learn | /admin/learn |

---

## Payroll Module Sidebar
| Section | URL |
|---------|-----|
| Home | /payroll/ |
| Payroll Operations | /payroll/payroll-operations/run-payroll |
| Employee Workspace | /payroll/employees/list |
| Compensation & Benefits | /payroll/benefits-taxation/loans |
| Data & Insights | /payroll/data-insights/custom-reports/draft |
| Configuration Center | /payroll/configurations/org-setup/org-info |

---

## Top Bar Icons (Admin)
| Position | aria-label | Function |
|----------|-----------|----------|
| x:1010 | AI Assistant | Opens AI chat |
| x:1070 | Integrations | Opens integrations page |
| x:1112 | (none) | Nine-dot App Switcher |
| x:1162 | (none) | Notifications bell |
| x:1202 | (none) | Profile avatar "D" |

---

## Test Results

### Login Module — 10/10 PASSED
| Test ID | Description | Status |
|---------|-------------|--------|
| TC-01 | Login page loads correctly | PASSED |
| TC-02 | Login with valid credentials | PASSED |
| TC-03 | Error for invalid password | PASSED |
| TC-04 | Error for invalid username | PASSED |
| TC-05 | Cannot submit with empty fields | PASSED |
| TC-06 | Cannot submit with only username | PASSED |
| TC-07 | Cannot submit with only password | PASSED |
| TC-08 | Password visibility toggle works | PASSED |
| TC-09 | Forgot password link visible | PASSED |
| TC-10 | Login With SSO button visible | PASSED |

### Navigation — Payroll Module
| Step | Status |
|------|--------|
| Login to admin portal | PASSED |
| Click nine-dot app switcher | PASSED |
| Navigate to Payroll (new tab) | PASSED |
| Payroll page loaded at /payroll/ | PASSED |

---

### Payroll Module Exploration — COMPLETED
| Section | Tabs Discovered | Status |
|---------|----------------|--------|
| Home | Dashboard KPIs, Approvals, Cost Tables | EXPLORED |
| Payroll Operations | Run Payroll, Process Arrear, Full & Final Settlement | EXPLORED |
| Employee Workspace | Employee Directory (360), Payslips, Action Logs, Email Documents | EXPLORED |
| Compensation & Benefits | Loans, Advances, Reimbursements, Expenses, Tax Declarations, Previous Employer, Other Earnings, Restructure | EXPLORED |
| Data & Insights | Custom Reports, Payroll Reports | EXPLORED |
| Configuration Center | Org Setup, Payroll Framework, Payroll Settings | EXPLORED |

### Reference Documents
- **Zimyo Payroll Guide** (92 pages) — extracted and saved to `payroll-guide-text.txt`
- **Module Map** — full structure saved to `PAYROLL-MODULE-MAP.md`

---

## Next: Feature-level testing (ready — tell me which feature)

### Salary Modification & Run Payroll — Test Shift (March 2026) — 2026-03-18
| Step | Action | Status |
|------|--------|--------|
| 1 | Login → Payroll | DONE |
| 2 | Employee Workspace → Search Test Shift | DONE |
| 3 | Open profile → Modifiy Salary | DONE |
| 4 | Set Applicable From to March 1, 2026 | DONE |
| 5 | Click Compute | DONE |
| 6 | Click Save | DONE |
| 7 | Click Confirm on popup | DONE |
| 8 | Go to Run Payroll | DONE |
| 9 | Set Entity=All, Month=March, Status=All | DONE |
| 10 | Click Search → Employee list loaded | DONE |

### Run Payroll — Test Shift March 2026 — 2026-03-18
| Step | Status |
|------|--------|
| Set filters | DONE |
| Test Shift in Success tab | NOT FOUND |
| Test Shift in Error tab | NOT FOUND |
| **TEST CASE: BLOCKED** | Employee not in any tab |

### Run Payroll — Test Shift March 2026 — 2026-03-18
| Step | Status |
|------|--------|
| Set filters (Entity=All, Month=Mar-2026) | DONE |
| Search | DONE |
| Test Shift in Success tab | NOT FOUND |
| Test Shift in Error tab | FOUND — ERROR |
| Error details captured | DONE |
| **TEST CASE: FAILED** | Employee has payroll errors |

### Anita (AN-001) — CTC 500000, BASIC 20000 + Payroll March 2026 — 2026-03-18
| Step | Status |
|------|--------|
| CTC=500000, BASIC=20000 | DONE |
| Compute → Save → Confirm | DONE |
| Run Payroll (all steps) | DONE |

### Anita — CTC 500000 + Payroll Mar-2026 — 2026-03-18 (POM)
| Step | Status |
|------|--------|
| Modify Salary (CTC: 500000) | FAILED |
| Compute → Save → Confirm | FAILED |
| Run Payroll Mar-2026 | FAILED |
| Error | Save disabled after Compute |

### Anita — CTC 500000 + Payroll Mar-2026 — 2026-03-18 (POM)
| Step | Status |
|------|--------|
| Modify Salary (CTC: 500000) | DONE |
| Compute → Save → Confirm | DONE |
| Run Payroll Mar-2026 | DONE |

