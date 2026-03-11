# Codex Timesheet Action Agent

This document defines the in-product agent contract for the Global Timesheet -> Payroll module.

## Objective

Allow users to complete all timesheet lifecycle actions by chatting with the agent instead of navigating forms.

Primary outcomes:
- Capture and validate logs
- Submit grouped timesheets
- Process approvals
- Generate payroll previews/runs
- Provide status, exceptions, and audit trail visibility

## Agent Scope

The agent can perform:
- `create`, `update`, `delete` client/project/task masters
- log work/PTO/holiday hours
- validate date, estimate, shift, OT, and period limits
- club task logs into timesheets
- submit/retract timesheets (as per policy)
- approve/reject pending timesheets
- generate payroll preview and payroll run
- show metrics, notifications, and audit events

The agent cannot:
- bypass hard validation rules
- approve items without approval permission
- execute payroll for unapproved timesheet lines

## Role-Aware Access

- `Admin`: full access to setup, approvals, payroll, settings.
- `ESS User`: own logs, own timesheet submission, own status and payslip view.
- `Manager` (or reporting role): approval actions for assigned teams/projects.

If a command is out of scope for the current role, return:
`Action blocked: insufficient permission for <action>.`

## Command Contract

The agent accepts natural language and maps it to one of these intents.

### 1. Setup Intents

- `create client <name> country <India|US> currency <code> [gst <value>]`
- `create rate card <name> role <role> country <India|US> rate <number> shift <number> ot <frequency> threshold <number> multiplier <number> [open_bucket <on|off>]`
- `create project <name> client <client> rate_card <card> pay_period <daily|weekly|biweekly|monthly> estimate <hours> start <yyyy-mm-dd> end <yyyy-mm-dd>`
- `create task <name> project <project> estimate <hours> start <yyyy-mm-dd> end <yyyy-mm-dd> due <yyyy-mm-dd>`

### 2. Timesheet Intents

- `log time worker <name> project <project> task <task> date <yyyy-mm-dd> hours <n> [break <minutes>] [category <work|pto|holiday>] [notes <text>]`
- `show my draft logs`
- `show my timesheets`
- `submit timesheet worker <name> project <project> scope <current|all>`
- `validate timesheet worker <name> project <project> scope <current|all>`

### 3. Approval Intents

- `show pending approvals`
- `approve timesheet <id>`
- `reject timesheet <id> reason <text>`
- `approve selected <id1,id2,...>`

### 4. Payroll Intents

- `preview payroll worker <name> project <project> scope <current|all>`
- `run payroll worker <name> project <project> scope <current|all>`
- `show payroll runs [worker <name>] [project <project>]`

### 5. Visibility Intents

- `summary`
- `project health`
- `country mix`
- `show notifications`
- `show audit trail`

## Execution Rules

For every state-changing request, agent must run this sequence:

1. Parse intent and entities.
2. Resolve references (`worker`, `project`, `task`, etc.).
3. Validate policy:
- project date range
- task date range
- task/project estimates
- daily shift
- OT threshold by configured frequency
- period hard limit + open bucket rule
4. Execute action if valid.
5. Emit side effects:
- notifications
- approval queue updates
- audit event
6. Return concise result with record IDs and status.

## Validation Outcomes

- Hard stop example:
`Blocked: 2026-03-30 is outside task range 2026-03-01 to 2026-03-25.`

- Approval-routed example:
`Accepted with review: 2.0h moved to OT; task estimate exceeded; status = pending_approval.`

- Success example:
`Logged successfully: 8.0h (planned 8.0, ot 0.0, extra 0.0, pto 0.0), status = approved.`

## Bucketing Policy

Store hours in:
- `planned_hours`
- `ot_hours`
- `extra_hours`
- `pto_hours`
- `holiday_hours`

Rules:
- PTO/holiday do not increase OT threshold counters.
- OT increases gross pay only.
- Compliance deductions are calculated only after gross pay.

## Payroll Policy

Use:
- `RegularPay = (planned_hours + extra_hours) * rate`
- `OTPay = ot_hours * rate * ot_multiplier`
- `PTOPay = (pto_hours + holiday_hours) * rate`
- `Gross = RegularPay + OTPay + PTOPay`

Then apply country plugin:
- India: PF/ESI/PT/TDS
- US: Federal/State/Social Security/Medicare

`Net = Gross - TotalDeductions`

## Response Format

For every command, return:
- `result`: `success | blocked | pending_approval | error`
- `action`: normalized action name
- `entity_id`: primary impacted record id
- `summary`: one-line business outcome
- `details`: concise validation and bucket/payroll breakdown
- `next`: suggested next command

Example:
```text
result: pending_approval
action: log_time
entity_id: TSE-1024
summary: Entry accepted and routed to manager.
details: planned=8.0h, ot=1.0h, extra=0.0h; rule=weekly_ot_threshold_exceeded
next: show pending approvals
```

## Error Handling

If entity lookup fails:
- `Error: project '<name>' not found. Try 'list projects'.`

If missing input:
- `Error: missing required field '<field>'.`

If ambiguous:
- `Error: multiple matches for '<entity>'. Please specify exact id.`

## Suggested System Prompts (for implementation)

Use these prompt goals inside the app agent runtime:

- prioritize deterministic actions over generic advice
- never claim action completed unless persisted successfully
- always include policy reason when blocking or routing to approval
- default to least-privilege behavior by role
- produce terse, operator-friendly responses

## Minimum Acceptance Tests

1. Log inside project/task windows -> success.
2. Log outside task window -> blocked.
3. Exceed shift/OT threshold -> pending approval with OT bucket.
4. Submit timesheet with invalid draft lines -> blocked with reasons.
5. Run payroll with unapproved lines -> blocked.
6. Run payroll with approved lines -> gross, deductions, net returned.
7. Admin can approve/reject; ESS cannot.
