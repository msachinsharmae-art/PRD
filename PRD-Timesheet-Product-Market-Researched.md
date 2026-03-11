# Product Requirements Document

## Product Name

PulseSheet

## Document Status

Draft v2, market-researched

## Date

March 10, 2026

## Research Basis

This PRD is informed by publicly available product information reviewed on March 10, 2026 from:

- Gusto
- QuickBooks Time
- Rippling
- Clockify
- Deel
- Zoho People
- Jibble
- Everhour

## 1. Executive Summary

PulseSheet is a modern timesheet product designed for SMBs and mid-market service businesses that need three outcomes at once:

- accurate employee time capture
- fast manager approvals
- payroll- and billing-ready exports

The market shows two dominant patterns:

- US payroll platforms such as Gusto, QuickBooks Time, and Rippling treat time tracking as part of payroll accuracy, approvals, and labor compliance.
- Global and project-centric tools such as Clockify, Zoho People, Deel, Jibble, and Everhour emphasize project allocation, billable time, approval routing, and reporting.

PulseSheet should combine both models. It should be simpler than a full HR suite, more payroll-ready than a pure time tracker, and better for project-based organizations than a payroll-only tool.

## 2. Market Context

### 2.1 What Current Products Emphasize

Across reviewed products, the recurring capabilities are:

- web and mobile time capture
- clock-in/clock-out plus manual timesheet entry
- approvals and submission workflows
- payroll sync or payroll-ready exports
- project, task, or client allocation
- overtime, break, and attendance controls
- reminders for missing time or pending approvals
- reporting and audit history

### 2.2 Key Product Archetypes

#### A. Payroll-Native Time Tracking

Examples:

- Gusto
- QuickBooks Time
- Rippling

Strengths:

- direct payroll sync
- attendance and scheduling linkage
- better compliance positioning
- manager approvals tied to pay runs

Weaknesses:

- usually less flexible for agency/project billing workflows
- can become part of a broader HR/payroll sale rather than a standalone product

#### B. Project-Centric Timesheet Platforms

Examples:

- Clockify
- Everhour
- Zoho People

Strengths:

- rich task/project/client tagging
- billable vs non-billable tracking
- reusable templates, copy-week flows, budgets, and utilization reporting

Weaknesses:

- payroll handling is often indirect
- compliance depth varies by geography

#### C. Global Workforce and Contractor Platforms

Examples:

- Deel
- Jibble

Strengths:

- support distributed and global teams
- stronger policy flexibility around shifts, permissions, and overtime
- better fit for EOR, contractor, and multi-country operations

Weaknesses:

- broader product scope can make the timesheet experience secondary

## 3. Competitor Research Summary

### 3.1 Gusto

Observed strengths:

- browser and mobile time tracking
- tablet-based kiosk/time clock model
- GPS-based location recording
- manager approvals on mobile
- schedules, PTO, and payroll connected in one platform
- project/pay-rate/job-type clock-ins

Implication for PulseSheet:

- payroll-adjacent workflows matter
- kiosk mode is valuable for field and shift-based teams
- location-aware clock events are useful, but should be optional and privacy-aware

### 3.2 QuickBooks Time

Observed strengths:

- app-based time submission and approval
- accounting and payroll sync
- schedule creation by job or shift
- reporting and invoicing orientation

Implication for PulseSheet:

- payroll export alone is not enough; invoicing and job costing matter
- time should be attributable to jobs, shifts, projects, and customers

### 3.3 Rippling

Observed strengths:

- approved hours flow directly into payroll
- policy-driven compliance around overtime and breaks
- location-based labor rules

Implication for PulseSheet:

- policy engine is a strategic differentiator
- compliance settings should be configurable per location, not hard-coded globally

### 3.4 Clockify

Observed strengths:

- weekly timesheet view
- templates and copy-week behavior
- timesheet locking
- reminders for logging, submission, and approval
- unsubmitted timesheet visibility
- audit trail

Implication for PulseSheet:

- timesheet UX must reduce repetitive entry
- locking and auditability are not optional in a serious product

### 3.5 Deel

Observed strengths:

- desktop and mobile clock-in/clock-out
- hours reflected into payroll
- permissions for editing submitted time
- relevance for global payroll teams

Implication for PulseSheet:

- permission granularity is critical
- product should support both employees and contractors from day one in the data model

### 3.6 Zoho People

Observed strengths:

- time logs tied to jobs, projects, and clients
- billable/non-billable classification
- configurable pay periods
- scheduled approval routing
- billing and payroll support

Implication for PulseSheet:

- flexible pay periods and approval scheduling are important for real operations
- service businesses need client/project structure, not just employee-hours totals

### 3.7 Jibble

Observed strengths:

- payroll-ready timesheets
- flexible overtime definitions
- approval workflows
- strong clock-in options and operational controls

Implication for PulseSheet:

- overtime configuration is a must-have for payroll-readiness
- product needs clear separation between tracked time, payable time, and billable time

### 3.8 Everhour

Observed strengths:

- approved timesheet locking
- budget thresholds and alerts
- billing and profitability orientation
- PM-tool adjacent positioning

Implication for PulseSheet:

- budget-awareness is a major wedge for agencies and service firms
- reporting should cover cost and revenue impact, not only attendance

## 4. Product Opportunity

There is a clear gap between:

- payroll suites that treat timesheets mainly as attendance inputs
- time trackers that are strong on projects but weaker on payroll readiness

PulseSheet should target this gap with a product that:

- handles payroll-ready approvals and exports well enough for US and global teams
- supports client/project/task structures deeply enough for services businesses
- remains easier to adopt than a full HRIS or payroll platform

## 5. Product Vision

PulseSheet becomes the operational source of truth for worked time across employees, contractors, projects, and locations, with outputs ready for payroll, billing, utilization, and compliance.

## 6. Target Customers

### Primary Segments

- professional services firms
- agencies
- consulting firms
- outsourced operations teams
- field-service SMBs
- distributed teams using contractors plus employees

### Company Size

- MVP focus: 20 to 500 workers
- expansion: 500 to 5,000 workers

### Geographic Focus

- Phase 1: US-first
- Phase 2: multi-country support for payroll-ready exports and policy localization

## 7. Personas

### Employee / Contractor

Goals:

- log time quickly
- reuse prior work patterns
- know whether time is submitted, approved, or rejected

### Manager

Goals:

- review weekly submissions fast
- spot missing time, unusual hours, overtime, and project mismatches
- approve without chasing spreadsheets

### Payroll / Finance Admin

Goals:

- export trusted approved hours
- separate payable, billable, overtime, and leave-related time
- maintain auditability

### Operations / Delivery Lead

Goals:

- understand project burn, utilization, and staffing risk
- compare plan vs actual hours

## 8. Positioning

### Positioning Statement

For SMB and mid-market service businesses that need payroll-ready time tracking without buying a full HR suite, PulseSheet is a timesheet platform that combines approval workflows, project costing, and export-ready data in one product.

### Proposed Differentiation

- payroll-ready without being payroll-dependent
- built equally for attendance and project accounting
- supports employees and contractors in one workflow
- policy-aware but operationally lightweight

## 9. Product Principles

- Fast entry beats feature overload
- Approved time must be trustworthy
- Every hour needs context
- Managers should act from exceptions, not review everything manually
- Payroll and billing outputs must be deterministic

## 10. Goals

- achieve >90% on-time weekly submission rate in active accounts
- reduce manager approval time per employee per week
- eliminate spreadsheet timesheet reconciliation for target customers
- improve billable-hour capture and export accuracy

## 11. Non-Goals For MVP

- full payroll engine
- full HRIS
- deep project management suite
- native desktop applications
- enterprise workforce surveillance features such as invasive monitoring screenshots by default

## 12. MVP Scope

### Core Jobs To Be Done

- capture time
- submit time
- approve time
- export approved time
- analyze basic weekly/project totals

### MVP In Scope

- email/password login or SSO-ready auth abstraction
- roles: worker, manager, admin
- daily and weekly timesheet entry
- manual entry and clock-in/clock-out
- projects, clients, tasks, cost centers
- billable/non-billable tagging
- notes and attachments-ready schema
- draft, submitted, approved, rejected, reopened states
- weekly submission workflow
- manager approval queue
- reminders for missing submission and pending approvals
- current week and prior week views
- copy previous week
- timesheet locking after approval
- audit log
- CSV export for payroll and billing
- basic overtime and break policy rules
- mobile-responsive web experience

### MVP Out Of Scope

- native mobile app
- multi-level approvals
- invoice generation
- direct payroll integrations
- AI auto-fill recommendations
- resource planning
- advanced budget alerts

## 13. Functional Requirements

### 13.1 Authentication And Roles

- The system must support role-based access control.
- Workers can create and edit their own draft entries.
- Managers can review entries for assigned workers.
- Admins can manage all records, exports, settings, and reopen actions.
- Permissions must support contractors as a worker type.

### 13.2 Worker Time Capture

- Workers must be able to:
  - add manual time entries
  - clock in and clock out
  - add breaks
  - assign time to client, project, task, and optionally location
  - mark time as billable or non-billable
  - add notes
- Workers should be able to duplicate prior entries or copy a previous week.
- Workers should be able to choose between weekly grid entry and line-item entry.
- System must support quarter-hour increments at minimum.

### 13.3 Validation Rules

- A user cannot log more than 24 total hours in a single day.
- Required dimensions must be configurable by workspace:
  - project
  - client
  - task
  - notes
  - location
- System must detect overlapping time intervals for clocked entries.
- System must distinguish:
  - tracked hours
  - payable hours
  - billable hours

### 13.4 Timesheet Submission

- Workers can submit a weekly timesheet for approval.
- Submitted timesheets become read-only for workers by default.
- Workers must see submission status clearly.
- Workers can withdraw a submitted timesheet only if manager review has not started, if policy allows.

### 13.5 Approvals

- Managers must have a queue of submitted timesheets.
- Managers can approve fully, reject fully, or approve with adjustments where policy allows.
- Rejections must require a reason.
- Managers must be able to view weekly totals, overtime flags, and missing required fields before action.
- Admins can reopen approved or rejected timesheets with audit logging.

### 13.6 Locking And Audit Trail

- Approved timesheets must be locked from worker edits.
- Every create, update, submit, approve, reject, reopen, and export event must be audit logged.
- Audit records must capture actor, timestamp, action, previous value, and new value where applicable.

### 13.7 Reminders And Notifications

- Workers receive reminders for:
  - incomplete time
  - unsubmitted weekly timesheets
- Managers receive reminders for:
  - pending approvals
  - overdue approvals
- Admins receive exception alerts for:
  - payroll export blocking issues
  - unusual overtime spikes

### 13.8 Policies

- Workspace admins can configure:
  - workweek start day
  - pay period cadence
  - overtime thresholds
  - break rules
  - edit permissions after submission
  - submission deadline
- Policies must support location-specific overrides in later phases.

### 13.9 Reporting

- System must provide reports for:
  - hours by employee
  - hours by project
  - hours by client
  - billable vs non-billable
  - pending vs approved submissions
  - overtime summary
- Reports must be filterable by date range, team, worker type, project, and status.

### 13.10 Export

- Admins must be able to export approved entries by pay period or date range.
- Export should support at minimum:
  - CSV for payroll
  - CSV for billing
- Export schemas should be template-based so customers can map output columns to downstream systems.

## 14. Derived Competitive Feature Priorities

### Priority 1

- weekly grid entry
- clock-in/clock-out
- approval workflow
- payroll-ready export
- project/client/task tagging
- billable vs non-billable
- locking
- reminders
- audit history

### Priority 2

- kiosk mode
- GPS/location tagging
- configurable overtime
- pay periods and cutoffs
- contractor support
- mobile-first approvals

### Priority 3

- schedules versus actuals
- budget thresholds and alerts
- invoice generation
- accounting and payroll integrations
- multi-country compliance policies

## 15. User Flows

### 15.1 Worker Weekly Flow

1. Worker opens current week.
2. Worker logs or copies entries.
3. System validates missing fields, overlaps, and daily hour caps.
4. Worker reviews weekly totals and warnings.
5. Worker submits for approval.
6. Timesheet locks for worker edits.

### 15.2 Manager Approval Flow

1. Manager opens approvals queue.
2. Manager sees weekly totals, project mix, overtime flags, and missing days.
3. Manager approves or rejects with comments.
4. Worker receives notification.
5. Audit record is created.

### 15.3 Payroll Admin Flow

1. Admin selects pay period.
2. System shows approved and export-ready entries plus exceptions.
3. Admin exports payroll file.
4. Export event is logged.

## 16. MVP Screens

- login
- worker dashboard
- weekly timesheet grid
- line-item time entry form
- submission review modal
- manager approval queue
- admin export center
- basic settings for projects, clients, and policies
- audit history drawer

## 17. Data Model

### Core Entities

- organization
- user
- role
- worker profile
- manager assignment
- client
- project
- task category
- timesheet entry
- break entry
- weekly timesheet
- approval action
- overtime policy
- break policy
- pay period
- export template
- audit event
- notification event

### Important Data Fields

- worker type: employee or contractor
- timesheet status
- approval status
- billable status
- tracked hours
- payable hours
- overtime hours
- location or worksite
- currency for billing context

## 18. Non-Functional Requirements

- Normal page loads under 3 seconds for common views
- Export of 50,000 entries in acceptable operational time
- High audit integrity
- Mobile-responsive browser support
- secure role-based access
- timezone-safe storage and reporting
- accessibility support for core workflows
- privacy controls for GPS/location features

## 19. Compliance And Risk Considerations

- US labor rules vary by state, especially for breaks and overtime
- global teams may need country-level pay period and work-hour logic
- approved time must not be editable without explicit reopen action
- location tracking must be opt-in and disclosed clearly
- export templates must avoid silent data transformation errors

## 20. Success Metrics

### Product Metrics

- weekly submission completion rate
- manager approval turnaround time
- percentage of entries edited after initial save
- percentage of payroll exports completed without manual correction
- active users per account per week

### Business Metrics

- conversion from free trial to paid
- number of organizations replacing spreadsheets
- number of payroll and billing exports per account
- retention at 90 and 180 days

## 21. Release Plan

### Phase 1: MVP

- worker entry
- weekly submission
- manager approval
- export center
- reminders
- audit log

### Phase 2: Operational Depth

- kiosk mode
- schedules vs actuals
- overtime and break policy engine
- project budgets
- exception dashboards

### Phase 3: Ecosystem Expansion

- payroll integrations
- accounting integrations
- invoicing
- utilization analytics
- multi-country policy packs
- API and partner ecosystem

## 22. Open Questions

- Should PulseSheet target US payroll-adjacent SMBs first or agency/project-led teams first?
- Is kiosk mode necessary in the initial commercial wedge?
- Which payroll export formats should be supported first?
- Should approval allow manager edits or only reject/reopen?
- Do we support both hours-based and start/end-time-based entry in the first release?
- How much location tracking is acceptable for the target customer profile?

## 23. Recommended Build Strategy

Build PulseSheet as a standalone SaaS timesheet product with:

- a strong weekly UX inspired by Clockify
- payroll-readiness and mobile approvals informed by Gusto and QuickBooks Time
- policy architecture influenced by Rippling
- global worker model informed by Deel
- project/billing structure informed by Zoho People and Everhour

This path creates a more focused product than full HR/payroll suites while still competing above simple timer apps.

## 24. Summary

The research shows that winning timesheet products do not compete on time entry alone. They win by connecting time capture to downstream action:

- approval
- payroll
- billing
- compliance
- reporting

PulseSheet should therefore be built as an approval and export system wrapped around a fast time-entry experience. That is the defensible middle ground between payroll suites and lightweight trackers.
