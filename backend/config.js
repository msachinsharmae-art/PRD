const enums = {
  countries: ["India", "US"],
  projectTypes: ["fixed", "milestone", "rate-card"],
  payPeriods: ["daily", "weekly", "biweekly", "monthly"],
  estimatePolicies: ["block", "approval", "overrun"],
  hourCategories: ["work", "pto", "holiday"],
  approvalActions: ["approved", "rejected"],
};

const defaultClientModules = [
  "Client Details",
  "Projects",
  "Permissions",
  "Billing",
];

const permissionActions = [
  "Create Project",
  "Edit Project",
  "Delete Project",
  "Create Task Category",
  "Edit Task Category",
  "Delete Task Category",
  "Approve Timesheet",
  "Run Payroll",
  "View Billing",
];

const rolePresets = [
  {
    role: "Project Manager",
    scope: "Delivery",
    actions: [
      "Create Project",
      "Edit Project",
      "Create Task Category",
      "Edit Task Category",
      "Approve Timesheet",
      "View Billing",
    ],
  },
  {
    role: "Project Coordinator",
    scope: "Execution",
    actions: [
      "Create Task Category",
      "Edit Task Category",
      "View Billing",
    ],
  },
  {
    role: "Reporting Manager",
    scope: "Governance",
    actions: [
      "Approve Timesheet",
      "Run Payroll",
      "View Billing",
    ],
  },
  {
    role: "Team Member",
    scope: "Delivery",
    actions: [],
  },
  {
    role: "Admin",
    scope: "Platform",
    actions: permissionActions.slice(),
  },
];

const countrySettings = {
  India: {
    country: "India",
    currency: "INR",
    gstRequired: true,
    shiftRules: {
      dailyShiftHours: 9,
      weeklyLimit: 54,
      biweeklyLimit: 108,
      monthlyLimit: 220,
    },
    otRules: {
      frequency: "monthly",
      threshold: 180,
      multiplier: 1.5,
      openBucket: true,
    },
    compliance: {
      type: "india",
      basicPercent: 0.4,
      pfRate: 0.12,
      esiRate: 0.0075,
      esiThreshold: 21000,
      professionalTax: 200,
      tdsRate: 0.085,
    },
  },
  US: {
    country: "US",
    currency: "USD",
    gstRequired: false,
    shiftRules: {
      dailyShiftHours: 8,
      weeklyLimit: 40,
      biweeklyLimit: 80,
      monthlyLimit: 200,
    },
    otRules: {
      frequency: "weekly",
      threshold: 40,
      multiplier: 1.5,
      openBucket: true,
    },
    compliance: {
      type: "us",
      federalTaxRate: 0.1,
      stateTaxRate: 0.05,
      socialSecurityRate: 0.062,
      medicareRate: 0.0145,
    },
  },
};

module.exports = {
  countrySettings,
  defaultClientModules,
  enums,
  permissionActions,
  rolePresets,
};
