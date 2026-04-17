# Zimyo Payroll Module — Complete Map

> Generated from live exploration + Zimyo Payroll Guide (92 pages)
> Last updated: 2026-03-18

---

## 1. HOME (`/payroll/`)

**Dashboard KPIs:**
- Pending for Payroll | Pending for FNF | Salary on Hold | Pending for Payment

**Payroll Approvals:**
- Approval Pending on Me | Payroll Pending for Approval | Approval Received | Approval Rejected

**Salary Benefits & Taxation Cards:**
- Investment Declaration | Reimbursement | Loans & Advances

**Tables:**
| Table | Columns |
|-------|---------|
| Cost Analysis | Entity, Fixed Cost, Variable Cost |
| Budget Forecast | Entity, Forecasted Payout, Actual Payout Disbursed |
| Minimum Wage Compliance | Employee Name, Code, Entity, Dept, Designation, Location, Wage Received, Wage as per Slab |

**Other Widgets:** Budget Forecasting, CTC Analysis (3/6/12 month trends), Loan Overview (active loans, outstanding amount, pending EMIs)

---

## 2. PAYROLL OPERATIONS (`/payroll/payroll-operations/`)

### 2.1 Run Payroll (`/payroll/payroll-operations/run-payroll`)
**5-Step Payroll Process:**
1. **Leave & Attendance** — Select entity, month, status. Filter by dept/designation/zone/location. Search employees.
2. **Process Arrear** — Select employees, bulk upload arrears using templates, skip if N/A
3. **Review & Run Payroll** — Final checks, View Salary, Edit Deductions, Recompute. Bulk Upload: Override TDS, Misc Entries, Bonus
4. **Initiate Payouts** — Mark as Paid, Download Bank Sheet
5. **Publish Payslips** — Print PDF, email slips

**Table Columns:** Employee Name, Entity, Designation, Department, Location, Working Days, Payable Present, LOP Days, Leaves, Penalized, Overtime, Extra OT, Status, Action

**Buttons:** Search, Bulk Attendance Recompute, Bulk Upload, Lock Attendance & Proceed

**Sub-tabs:** Success (count) | Error (count)

**Key Actions per Employee:** Map CTC, Edit (LOP/OT/Leave Encashment), Recompute

**Special Features:**
- Red checkbox = attendance change
- Freeze Entity = exclude entire entity from payroll
- Freeze Employee = exclude specific employee for a month
- Payroll Approval: Level 1 & Level 2 configurable

### 2.2 Process Arrear (`/payroll/payroll-operations/arrear`)
**Steps:** Arrear Info → Preview & Generate → Summary
**Table Columns:** Code, Employee Name, Designation, Department, Paid On, Arrear Salary, Arrear Days, Arrear Status

### 2.3 Full & Final Settlement (`/payroll/payroll-operations/fnf/pending`)
**Sub-tabs:** Pending for F&F | F&F Completed
- Lists employees marked for FNF with pending settlements

---

## 3. EMPLOYEE WORKSPACE (`/payroll/employees/`)

### 3.1 Employee Directory (`/payroll/employees/list`)
- 360 employees listed
- Card view with designation
- Upload Form 16 button
- **Click on employee opens:** Summary, Salary Details, Salary Slips, Loans, Advances, Expenses, Previous Employer Earnings, Investment Declarations, Vehicle Perquisites

**Employee Detail Actions:**
- Modify Salary — edit salary structure
- Salary on Hold — suspend salary for selected months
- Hold Salary History — view/edit hold status
- TDS Projection Report — old vs new tax regime comparison
- Downloads: Salary Report, Annual Sheet, Tax Sheet
- Salary Timeline view

### 3.2 Payslips (`/payroll/employees/payslips`)
**Table Columns:** Employee, Department, Designation, Published Status, Generated Status, Email Sent, Action
**Buttons:** Unpublish Payslips, Publish Payslips, Regenerate Payslips, Email Payslips, Download Zip

### 3.3 Action Logs (`/payroll/employees/logs`)
**Table Columns:** Employee Name, Department, Action Type, Action Description, Action Date, Action Time, Action Taken By, Action
- 30+ rows of logs
- Download button available

### 3.4 Email Documents (`/payroll/employees/email_docs`)
**Table Columns:** Employee, Department Name, Designation Name, Email, DOB, Gender, Location
- 361 employee rows
- Submit & Reports buttons

---

## 4. COMPENSATION & BENEFITS (`/payroll/benefits-taxation/`)

### 4.1 Loans (`/payroll/benefits-taxation/loans`)
**Table:** Employee Name, Department, Loan ID, Loan Amount, Tenure, Request Date, Status, Open/Closed, Proof, Actions
**Button:** Bulk Create Loan
- View/Edit EMI and tenure details

### 4.2 Advances (`/payroll/benefits-taxation/advance`)
**Table:** Same as Loans table structure

### 4.3 Reimbursements (`/payroll/benefits-taxation/riembursement`)
- Tracks submitted proofs against CTC-linked reimbursements

### 4.4 Expenses (`/payroll/benefits-taxation/expense`)
- Expense claims management

### 4.5 Tax Declarations (`/payroll/benefits-taxation/investment-declaration`)
- Investment declarations submitted via ESS
- Admin review and action

### 4.6 Previous Employer Earnings (`/payroll/benefits-taxation/previous-employer`)
- Previous employer income data for tax computation

### 4.7 Other Earnings (`/payroll/benefits-taxation/other-earnings`)
- Non-salary earnings management

### 4.8 Restructure - Salary / Tax / Bonus (`/payroll/benefits-taxation/restructure`)
- Salary restructuring tool
- Tax regime changes
- Bonus configuration

---

## 5. DATA & INSIGHTS (`/payroll/data-insights/`)

### 5.1 Custom Reports (`/payroll/data-insights/custom-reports/draft`)
- Draft reports

### 5.2 Payroll Reports (`/payroll/data-insights/payroll-reports`)
- Standard payroll reports
- Bank Sheet, Salary Register, PF/ESI reports

### 5.3 Statutory Reports
- PF, ESI, PT, TDS returns
- Form 24Q, Form 16/16A

---

## 6. CONFIGURATION CENTER (`/payroll/configurations/`)

### 6.1 Org Setup (`/payroll/configurations/org-setup/org-info`)
- Organization Info
- Entity management

### 6.2 Payroll Framework (`/payroll/configurations/payroll-framework`)
- Salary components setup
- Earnings & deductions configuration
- CTC templates

### 6.3 Payroll Settings (`/payroll/configurations/payroll-settings`)
- General payroll settings
- Pay cycle configuration
- Attendance integration settings

### 6.4 Compliance & Governance
- PF Configuration
- ESI Configuration
- PT Slabs
- TDS settings
- LWF settings
- Minimum Wage compliance

---

## Payroll Guide Key Concepts (from Manual)

### Run Payroll Flow
```
Leave & Attendance → Process Arrear → Review & Run → Initiate Payout → Publish Payslips
```

### Employee Salary Actions
- Map CTC, Edit LOP/OT, Recompute
- Freeze Entity/Employee
- Override TDS, Misc Entries, Bonus Upload

### Compliance
- ESI Wage configuration (Labour Law update)
- PT configuration updates
- Minimum Wage compliance tracking

### Approvals
- Multi-level approval (Level 1, 2)
- Sub-admins request → Approvers approve/reject
- Notifications on approval events

---

## URLs Quick Reference

| Page | URL |
|------|-----|
| Home | `/payroll/` |
| Run Payroll | `/payroll/payroll-operations/run-payroll` |
| Process Arrear | `/payroll/payroll-operations/arrear` |
| FNF Pending | `/payroll/payroll-operations/fnf/pending` |
| FNF Completed | `/payroll/payroll-operations/fnf/completed` |
| Employee Directory | `/payroll/employees/list` |
| Payslips | `/payroll/employees/payslips` |
| Action Logs | `/payroll/employees/logs` |
| Email Documents | `/payroll/employees/email_docs` |
| Loans | `/payroll/benefits-taxation/loans` |
| Advances | `/payroll/benefits-taxation/advance` |
| Reimbursements | `/payroll/benefits-taxation/riembursement` |
| Expenses | `/payroll/benefits-taxation/expense` |
| Tax Declarations | `/payroll/benefits-taxation/investment-declaration` |
| Previous Employer | `/payroll/benefits-taxation/previous-employer` |
| Other Earnings | `/payroll/benefits-taxation/other-earnings` |
| Restructure | `/payroll/benefits-taxation/restructure` |
| Custom Reports | `/payroll/data-insights/custom-reports/draft` |
| Payroll Reports | `/payroll/data-insights/payroll-reports` |
| Org Setup | `/payroll/configurations/org-setup/org-info` |
| Payroll Framework | `/payroll/configurations/payroll-framework` |
| Payroll Settings | `/payroll/configurations/payroll-settings` |
