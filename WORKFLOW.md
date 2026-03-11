# Global Timesheet to Payroll Workflow

## Configuration Structure
- **Rate Cards:** Define hourly rates, OT multipliers, currency per role/user
- **Shift Rules:** Daily, weekly, monthly limits per country
- **OT Rules:** Frequency, threshold, multiplier, open bucket
- **Pay Periods:** Daily, weekly, biweekly, monthly per project

## Workflow Logic

### 1. Timesheet Logging
- User logs time against task/project
- System validates project/task dates
- System enforces shift rules (India/US)
- Hours are stored in buckets: planned, OT, extra, PTO

### 2. Hour Buckets
- **Planned:** Within shift/task/project limits
- **OT:** Exceeds shift/task/project limits, classified by OT engine
- **Extra:** Allowed if open bucket enabled, pending approval
- **PTO:** Paid time off, holidays

### 3. Approval and Notifications
- Auto alerts for exceeded shift, task, project, OT
- Extra hours require PM approval
- Audit trail for all approvals

### 4. Payroll Integration
- After timesheet approval, payroll run is generated
- Gross pay calculated using universal formula:
  - RegularPay = RegularHours x Rate
  - OTPay = OTHours x Rate x Multiplier
  - PTOPay = PTOHours x Rate
  - GrossPay = Regular + OT + PTO

### 5. Compliance Engine
- **India:** TDS, PF, ESI, PT applied after gross
- **US:** Federal, State, Social Security, Medicare applied after gross
- Compliance logic is plugin-based, country-specific

### 6. Payslip Generation
- Payslip shows earnings (regular, OT, PTO), gross, deductions, net pay, pay period, employee ID, project, country

### 7. Reporting and Audit
- Dashboards for project, payroll, and audit logs

## End-to-End Flow
1. Client -> Rate Card -> Project/Pay Period -> Tasks -> Timesheet
2. Timesheet -> Hour Buckets -> OT Engine -> Approval
3. Approval -> Payroll Gross -> Compliance -> Net Pay -> Payslip
4. Reports and Audit

## Engineering Rules
- No hour enters payroll without validation, OT classification, approval, and compliance
- OT increases gross, compliance reduces gross, net pay is mathematical
- PTO/holiday never creates OT
- All compliance is applied after gross

---
This workflow ensures compliance-ready, configuration-driven, global timesheet to payroll integration for India and the US.
