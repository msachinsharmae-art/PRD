# Product Requirements Document

## Product Name

PulseSheet

## Document Status

Draft v1

## Date

March 10, 2026

## Owner

Product / Founder

## 1. Overview

PulseSheet is a timesheet product for companies that need employees to log work hours accurately, managers to review and approve timesheets quickly, and finance or payroll teams to export approved hours for payroll, billing, and compliance.

The initial product should solve the core workflow end to end:

- Employees record time against projects, tasks, and dates
- Managers review and approve or reject submitted timesheets
- Admins export approved data for payroll and client billing

The MVP should be simple, fast, and reliable. It should reduce spreadsheet-based tracking and give teams a single source of truth for work hours.

## 2. Problem Statement

Many teams still manage timesheets using spreadsheets, chat messages, and manual follow-up. This creates several problems:

- Employees forget to submit hours on time
- Managers do not have a clean review workflow
- Payroll and finance teams spend too much time reconciling data
- Billable and non-billable hours are difficult to track consistently
- Audit history is weak or missing
- Reporting across teams and projects is fragmented

The result is delayed payroll, poor utilization visibility, billing leakage, and administrative overhead.

## 3. Vision

Build a lightweight but scalable timesheet platform that makes time capture effortless for employees, approval clear for managers, and reporting dependable for operations teams.

## 4. Goals

- Replace manual or spreadsheet-based timesheet tracking
- Improve on-time timesheet submission rates
- Reduce manager review time
- Create export-ready data for payroll and billing
- Provide clear visibility into hours by employee, project, client, and status

## 5. Non-Goals For MVP

- Full project management suite
- Advanced invoicing engine
- Native mobile applications
- Deep payroll processing inside the product
- Capacity planning and forecasting
- Multi-country statutory compliance automation

## 6. Target Users

### Primary Users

- Employees or consultants who log hours
- Managers who review and approve timesheets
- Admin or HR/Finance teams who manage reporting and exports

### Secondary Users

- Delivery heads who monitor utilization
- Founders or executives who need high-level reporting

## 7. User Personas

### 1. Employee

Needs:

- Fast daily or weekly time entry
- Clear view of submission status
- Minimal friction and reminders

Pain points:

- Re-entering repetitive project/task data
- Missing deadlines
- Unclear approval status

### 2. Manager

Needs:

- Quick review of submitted timesheets
- Ability to approve, reject, or request changes
- Visibility into missing submissions and over-reported hours

Pain points:

- Chasing employees manually
- Reviewing inconsistent data
- Limited project-level visibility

### 3. Admin / Finance

Needs:

- Clean approved data
- Export by payroll period
- Auditability and reporting

Pain points:

- Data cleanup before payroll
- No consistent approval trail
- Difficulty separating billable and internal work

## 8. Key Use Cases

- An employee logs 8 hours for a client project on a specific date
- An employee submits a weekly timesheet for approval
- A manager reviews the weekly submission and approves or rejects entries
- An admin exports approved timesheets for payroll processing
- A finance user filters time by project/client for billing support
- A manager sees who has not submitted timesheets for the week

## 9. MVP Scope

### In Scope

- User login
- Role-based access: Employee, Manager, Admin
- Create, edit, delete timesheet entries
- Daily and weekly timesheet views
- Project and task selection
- Entry status: Draft, Submitted, Approved, Rejected
- Weekly submission workflow
- Manager approval workflow
- Employee and project filters
- Basic dashboard and weekly summaries
- CSV export for approved entries
- Submission reminders
- Audit trail for status changes

### Out of Scope

- Mobile app
- Offline sync
- Accounting integrations in MVP
- Advanced analytics and forecasting
- Client portal
- Expense reimbursement

## 10. Product Requirements

### 10.1 Authentication And Access Control

- Users must log in securely
- Each user must have a role
- Employees can create and edit their own draft entries
- Managers can review entries for their direct reports or assigned teams
- Admins can view all data and manage exports

### 10.2 Timesheet Entry

- Users must be able to add an entry with:
  - Date
  - Project
  - Task or work item
  - Hours worked
  - Billable or non-billable classification
  - Optional notes
- Users must be able to edit or delete draft entries
- The system must validate hours entered
- The system should support quarter-hour increments
- Users should not be able to log more than 24 hours in a day

### 10.3 Weekly Timesheet Workflow

- Users can view entries grouped by week
- Users can submit a week for approval
- Once submitted, entries become read-only unless rejected or reopened
- Users can see the current status of each week

### 10.4 Approval Workflow

- Managers can approve or reject submitted timesheets
- Rejected timesheets must require a reason
- Employees must be notified of approval or rejection
- Admins must be able to reopen timesheets in exceptional cases

### 10.5 Dashboards And Reporting

- Employees can see their weekly total hours and submission status
- Managers can see pending approvals and missing submissions
- Admins can filter by employee, manager, project, client, and status
- The system must provide basic reports for:
  - Total hours
  - Billable vs non-billable hours
  - Hours by employee
  - Hours by project

### 10.6 Export

- Admins can export approved timesheets as CSV
- Export should support date range and filter selection
- Exported data must include enough fields for payroll and billing

### 10.7 Notifications

- Employees should receive reminders before submission deadlines
- Managers should receive reminders for pending approvals
- Users should receive status notifications for approval actions

### 10.8 Auditability

- The system must store:
  - Who created an entry
  - Who edited an entry
  - When submission happened
  - Who approved or rejected a timesheet
  - Timestamps for all status changes

## 11. Functional Requirements

### Employee Requirements

- View current and past week timesheets
- Add, edit, delete draft entries
- Copy previous week entries as a convenience feature if implemented after MVP
- Submit a week for approval
- View rejection comments

### Manager Requirements

- View submitted timesheets from assigned employees
- Approve or reject timesheets
- View pending, approved, and rejected counts
- Filter by employee, team, and week

### Admin Requirements

- View all timesheets
- Reopen submitted or approved timesheets when necessary
- Export approved entries
- Configure projects, clients, and task categories
- View system-wide reports

## 12. Non-Functional Requirements

- Page load for normal dashboard views should be under 3 seconds
- Core workflows should be usable on laptop and mobile browser
- System should support at least 1,000 active users in the first production version
- Data changes must be stored reliably and consistently
- Access control must prevent users from seeing unauthorized records
- Audit logs must be immutable to normal users

## 13. UX Principles

- Daily time entry must take less than 1 minute for common use cases
- Weekly review should be visually simple and easy to scan
- Approval actions should be explicit and low-risk
- The UI should minimize repetitive data entry
- Empty, error, and reminder states should be clear

## 14. Success Metrics

### Primary Metrics

- Timesheet submission rate by deadline
- Average time to submit a weekly timesheet
- Average manager approval turnaround time
- Percentage of approved timesheets requiring rework

### Secondary Metrics

- Monthly active users
- Export accuracy rate
- Billable hour capture rate
- Reduction in payroll processing time

## 15. Assumptions

- Most users will access the product through a desktop browser
- Companies will initially accept CSV exports rather than full payroll integrations
- Timesheets are reviewed weekly, not daily, for most teams
- Role hierarchy can be modeled with employee-manager mapping

## 16. Risks

- Low employee adoption if time entry feels slow or repetitive
- Approval bottlenecks if managers oversee too many users
- Data quality issues if project/task setup is poorly governed
- Scope expansion into HRIS, payroll, and project management too early
- Compliance needs may vary significantly by region and company size

## 17. Dependencies

- Identity and authentication system
- User directory with reporting hierarchy
- Project and client master data
- Notification service for emails or in-app reminders
- Export requirements from payroll/finance stakeholders

## 18. Open Questions

- Is the core submission cycle weekly, biweekly, or configurable?
- Should overtime calculations exist in MVP or later?
- Should leave and holidays affect expected hours in MVP?
- Are bill rates and cost rates required early, or only later?
- Is approval single-level only, or does it require multi-level approvals?
- Which payroll or billing systems should exports target first?

## 19. Phased Roadmap

### Phase 1: MVP

- Login and role-based access
- Time entry
- Weekly submission
- Manager approvals
- Basic dashboard
- CSV export
- Reminder notifications

### Phase 2: Operational Scale

- Team dashboards
- Missing timesheet tracking
- Bulk approvals
- Reopen workflow
- Better reports
- Client and project administration

### Phase 3: Advanced Product

- Payroll and accounting integrations
- Utilization analytics
- Overtime and policy rules
- Leave and holiday integration
- Multi-level approvals
- Mobile experience

## 20. Recommended MVP Screens

- Login
- Employee dashboard
- Weekly timesheet view
- Add/edit entry modal or form
- Manager approvals queue
- Admin export/reporting screen
- Project and client setup

## 21. Recommended Data Entities

- User
- Role
- Employee profile
- Manager mapping
- Client
- Project
- Task category
- Timesheet entry
- Timesheet week submission
- Approval action
- Notification
- Audit log

## 22. MVP Release Criteria

- Employees can log and submit weekly hours
- Managers can approve or reject submissions
- Admins can export approved data
- Role-based access works correctly
- Basic reporting is available
- Audit trail exists for submission and approval actions
- Core workflows pass UAT with pilot users

## 23. Summary

PulseSheet should start as a focused timesheet workflow product, not a broad operations platform. The MVP should prioritize reliable time capture, fast approvals, and clean exports. If that core loop is strong, the product can later expand into reporting, payroll integrations, and operational analytics.
