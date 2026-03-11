# Global Timesheet → Payroll Workflow Logic

## Configuration
- Admin sets up rate cards (hourly rates, OT multipliers, shift rules) per role/user and country.
- Pay periods (daily, weekly, biweekly, monthly) are defined per project.
- OT rules (frequency, threshold, multiplier) are configurable globally and per project.

## Timesheet Engine
- Users log time against tasks.
- System validates project/task dates, shift hours, and updates hour buckets (planned, OT, PTO, extra).
- No logging outside project/task dates or shift limits.

## OT Engine
- Classifies hours as regular, OT, PTO, or extra based on shift and period rules.
- OT calculated automatically when thresholds are exceeded.
- PM notified for approval if extra hours or overruns occur.

## Approval & Notifications
- Auto alerts for daily/weekly/monthly OT, task/project overruns, extra hours.
- Approval required for hours exceeding shift/task/project/OT limits.
- Audit trail maintained for all approvals.

## Payroll Engine
- After timesheet approval, payroll run is generated.
- Gross pay calculated: RegularPay + OTPay + PTOPay.
- Compliance deductions applied (India: TDS, PF, ESI, PT; US: Federal, State, Social Security, Medicare).
- Net pay and payslip generated.

## Payslip
- Shows earnings (regular, OT, PTO), gross pay, deductions, net pay, pay period, employee/project/country info.

## End-to-End Flow
1. Client setup
2. Rate card configuration
3. Project + pay period setup
4. Task creation
5. Timesheet entry
6. Hour bucket classification
7. OT evaluation
8. Approval workflow
9. Payroll run
10. Compliance deduction
11. Net pay calculation
12. Payslip generation
13. Reporting & audit

## Key Product Rule
No hour enters payroll without validation, OT classification, approval, and compliance.
