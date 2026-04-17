/**
 * US Payroll Agent - Tool Definitions
 * Claude API tool-use format (JSON Schema)
 */

const tools = [
  {
    name: "add_employee",
    description:
      "Add a new employee to the payroll system with full personal, tax, compensation, benefits, and banking details. Returns the created employee record with a generated ID. Use this when onboarding a new hire.",
    input_schema: {
      type: "object",
      properties: {
        first_name: {
          type: "string",
          description: "Employee's legal first name",
        },
        last_name: {
          type: "string",
          description: "Employee's legal last name",
        },
        ssn: {
          type: "string",
          description:
            "Social Security Number in format XXX-XX-XXXX. Must be 9 digits.",
          pattern: "^\\d{3}-\\d{2}-\\d{4}$",
        },
        email: {
          type: "string",
          description: "Employee email address",
          format: "email",
        },
        state: {
          type: "string",
          description: "State of residence/work (e.g. CA, NY, TX, NJ, WA, IL)",
          enum: ["CA", "NY", "TX", "NJ", "WA", "IL", "GA", "FL"],
        },
        pay_rate: {
          type: "number",
          description: "Hourly pay rate or annual salary amount in USD",
        },
        pay_type: {
          type: "string",
          description: "Whether the employee is hourly or salaried",
          enum: ["hourly", "salary"],
          default: "hourly",
        },
        filing_status: {
          type: "string",
          description: "Federal tax filing status from W-4",
          enum: ["single", "married", "head_of_household"],
        },
        allowances: {
          type: "integer",
          description: "Number of federal withholding allowances (W-4)",
          default: 0,
        },
        benefits: {
          type: "object",
          description: "Benefits enrollment selections",
          properties: {
            health_plan: {
              type: "string",
              description: "Health insurance plan tier",
              enum: ["none", "employee_only", "employee_spouse", "family"],
            },
            dental: {
              type: "boolean",
              description: "Whether dental coverage is elected",
            },
            vision: {
              type: "boolean",
              description: "Whether vision coverage is elected",
            },
            retirement_contribution_pct: {
              type: "number",
              description:
                "401(k) contribution as a percentage of gross pay (0-100)",
              minimum: 0,
              maximum: 100,
            },
          },
        },
        bank_account: {
          type: "object",
          description:
            "Bank account for direct deposit (ACH). Required for direct deposit processing.",
          properties: {
            routing_number: {
              type: "string",
              description: "9-digit ABA routing number",
              pattern: "^\\d{9}$",
            },
            account_number: {
              type: "string",
              description: "Bank account number",
            },
            account_type: {
              type: "string",
              enum: ["checking", "savings"],
              description: "Type of bank account",
            },
          },
          required: ["routing_number", "account_number", "account_type"],
        },
        start_date: {
          type: "string",
          description: "Employment start date in YYYY-MM-DD format",
          format: "date",
        },
      },
      required: [
        "first_name",
        "last_name",
        "ssn",
        "state",
        "pay_rate",
        "pay_type",
        "filing_status",
        "start_date",
      ],
    },
  },
  {
    name: "get_employee",
    description:
      "Retrieve a single employee's full record by their employee ID. Returns all personal, tax, compensation, benefits, and banking details.",
    input_schema: {
      type: "object",
      properties: {
        employee_id: {
          type: "string",
          description: "Unique employee identifier (e.g. EMP-001)",
        },
      },
      required: ["employee_id"],
    },
  },
  {
    name: "list_employees",
    description:
      "List all employees in the payroll system. Optionally filter by state. Returns an array of employee summary records.",
    input_schema: {
      type: "object",
      properties: {
        state: {
          type: "string",
          description:
            "Optional state code to filter employees (e.g. CA, NY, TX)",
          enum: ["CA", "NY", "TX", "NJ", "WA", "IL", "GA", "FL"],
        },
      },
    },
  },
  {
    name: "run_payroll",
    description:
      "Process payroll for all active employees for a given pay period. Calculates gross pay, all federal and state tax withholdings, benefit deductions, and net pay for each employee. Returns a payroll run summary with per-employee breakdowns.",
    input_schema: {
      type: "object",
      properties: {
        start_date: {
          type: "string",
          description: "Pay period start date in YYYY-MM-DD format",
          format: "date",
        },
        end_date: {
          type: "string",
          description: "Pay period end date in YYYY-MM-DD format",
          format: "date",
        },
        pay_date: {
          type: "string",
          description:
            "Date employees will be paid in YYYY-MM-DD format. Must be on or after end_date.",
          format: "date",
        },
      },
      required: ["start_date", "end_date", "pay_date"],
    },
  },
  {
    name: "calculate_pay",
    description:
      "Calculate detailed pay for a single employee including gross pay, federal income tax, FICA (Social Security + Medicare), state taxes, benefit deductions, and net pay. Does NOT commit the payroll run -- use this for previews and estimates.",
    input_schema: {
      type: "object",
      properties: {
        employee_id: {
          type: "string",
          description: "Employee ID to calculate pay for",
        },
        hours_worked: {
          type: "number",
          description:
            "Total hours worked in the pay period. For salaried employees this can be omitted (defaults to standard hours).",
          minimum: 0,
          maximum: 168,
        },
        overtime_hours: {
          type: "number",
          description: "Overtime hours (paid at 1.5x). Subset of hours_worked.",
          minimum: 0,
          default: 0,
        },
        pay_period: {
          type: "string",
          description: "Pay period frequency for annualization",
          enum: ["weekly", "biweekly", "semimonthly", "monthly"],
          default: "biweekly",
        },
        bonus: {
          type: "number",
          description: "One-time bonus amount to include in this pay period",
          minimum: 0,
          default: 0,
        },
      },
      required: ["employee_id"],
    },
  },
  {
    name: "check_compliance",
    description:
      "Run compliance checks against federal and state payroll regulations. Can check for a specific state's rules or for a specific employee. Returns a list of compliance items with pass/fail status and remediation guidance.",
    input_schema: {
      type: "object",
      properties: {
        state: {
          type: "string",
          description:
            "State code to check compliance rules for (e.g. CA, NY)",
          enum: ["CA", "NY", "TX", "NJ", "WA", "IL", "GA", "FL"],
        },
        employee_id: {
          type: "string",
          description:
            "Optional employee ID to run compliance checks for a specific employee",
        },
        check_type: {
          type: "string",
          description: "Type of compliance check to run",
          enum: [
            "all",
            "minimum_wage",
            "overtime",
            "pay_frequency",
            "tax_registration",
            "new_hire_reporting",
          ],
          default: "all",
        },
      },
    },
  },
  {
    name: "get_tax_breakdown",
    description:
      "Get a detailed tax breakdown for an employee showing federal income tax, Social Security, Medicare, state income tax, state disability/unemployment, local taxes, and employer-side taxes. Useful for understanding total tax burden.",
    input_schema: {
      type: "object",
      properties: {
        employee_id: {
          type: "string",
          description: "Employee ID to get tax breakdown for",
        },
        annual_gross: {
          type: "number",
          description:
            "Annual gross wages to use for the calculation. If omitted, uses the employee's configured pay rate.",
        },
        ytd_gross: {
          type: "number",
          description:
            "Year-to-date gross wages already earned (for wage base calculations)",
          default: 0,
        },
      },
      required: ["employee_id"],
    },
  },
  {
    name: "generate_pay_stub",
    description:
      "Generate a formatted pay stub for an employee for a specific pay run. Includes earnings, deductions, taxes, net pay, and YTD totals.",
    input_schema: {
      type: "object",
      properties: {
        employee_id: {
          type: "string",
          description: "Employee ID to generate pay stub for",
        },
        pay_run_id: {
          type: "string",
          description:
            "Pay run identifier (returned from run_payroll). Format: PR-YYYYMMDD-NNN",
        },
      },
      required: ["employee_id", "pay_run_id"],
    },
  },
  {
    name: "process_direct_deposit",
    description:
      "Process ACH direct deposits for a completed pay run. Generates ACH file entries for all employees with bank accounts on file. Returns deposit statuses and any errors for employees missing banking info.",
    input_schema: {
      type: "object",
      properties: {
        pay_run_id: {
          type: "string",
          description: "Pay run ID to process deposits for",
        },
        effective_date: {
          type: "string",
          description:
            "ACH effective date in YYYY-MM-DD format (when funds should settle). Must be a business day.",
          format: "date",
        },
      },
      required: ["pay_run_id", "effective_date"],
    },
  },
  {
    name: "generate_tax_report",
    description:
      "Generate tax filing reports for federal or state agencies. Supports IRS Form 941 (quarterly), W-2 (annual), and state-specific withholding reports. Returns structured report data ready for filing.",
    input_schema: {
      type: "object",
      properties: {
        report_type: {
          type: "string",
          description: "Type of tax report to generate",
          enum: ["941_quarterly", "w2_annual", "state_withholding"],
        },
        period: {
          type: "string",
          description:
            "Reporting period. For quarterly: 'YYYY-Q1' through 'YYYY-Q4'. For annual: 'YYYY'. For state: 'YYYY-Q1' through 'YYYY-Q4'.",
          pattern: "^\\d{4}(-Q[1-4])?$",
        },
        state: {
          type: "string",
          description:
            "State code, required for state_withholding report type",
          enum: ["CA", "NY", "TX", "NJ", "WA", "IL", "GA", "FL"],
        },
      },
      required: ["report_type", "period"],
    },
  },
  {
    name: "get_state_rules",
    description:
      "Get the full set of payroll compliance rules for a specific state including minimum wage, overtime rules, pay frequency requirements, state income tax details, disability insurance, unemployment insurance rates, and new hire reporting deadlines.",
    input_schema: {
      type: "object",
      properties: {
        state: {
          type: "string",
          description: "State code to retrieve rules for",
          enum: ["CA", "NY", "TX", "NJ", "WA", "IL", "GA", "FL"],
        },
      },
      required: ["state"],
    },
  },
  {
    name: "validate_new_hire",
    description:
      "Validate that all required new hire paperwork is complete and generate state new hire reporting data. Checks for W-4, I-9, state withholding forms, and direct deposit authorization. Returns validation results and the new hire report record for state submission.",
    input_schema: {
      type: "object",
      properties: {
        employee_id: {
          type: "string",
          description: "Employee ID of the new hire to validate",
        },
        documents: {
          type: "object",
          description: "Document completion status",
          properties: {
            w4_completed: {
              type: "boolean",
              description: "Whether W-4 has been submitted",
            },
            i9_completed: {
              type: "boolean",
              description: "Whether I-9 has been completed and verified",
            },
            state_withholding_completed: {
              type: "boolean",
              description:
                "Whether the state-specific withholding form has been submitted (e.g. CA DE-4, NY IT-2104)",
            },
            direct_deposit_authorized: {
              type: "boolean",
              description:
                "Whether the direct deposit authorization form has been submitted",
            },
          },
        },
      },
      required: ["employee_id"],
    },
  },
];

module.exports = { tools };
