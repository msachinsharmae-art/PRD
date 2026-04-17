/**
 * In-Memory Data Store for US Payroll System
 * Provides CRUD operations for employees, pay runs, tax filings, and compliance checks.
 */

const { v4 } = (() => {
  // Simple UUID v4 generator (no external dependency)
  function v4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
  return { v4 };
})();

// ---------------------------------------------------------------------------
// Data Maps
// ---------------------------------------------------------------------------
const employees = new Map();
const payRuns = new Map();
const taxFilings = new Map();
const complianceChecks = new Map();
const paySchedules = new Map();
const otPlans = new Map();
const breakRules = new Map();
const ptoPolicies = new Map();
const ptoBalances = new Map();
const leaveRequests = new Map();
const benefitPlans = new Map();
const benefitEnrollments = new Map();
const documents = new Map();

// ---------------------------------------------------------------------------
// Company Config (single object)
// ---------------------------------------------------------------------------
let companyConfig = {
  id: 'company-001',
  name: 'Acme Corp',
  ein: '12-3456789',
  address: { street: '100 Main St', city: 'San Francisco', state: 'CA', zip: '94105' },
  phone: '(415) 555-0100',
  industry: 'Technology',
  registeredStates: ['CA', 'NY', 'TX', 'NJ', 'WA', 'IL', 'GA', 'FL'],
  workLocations: [
    { id: 'loc-1', name: 'HQ - San Francisco', state: 'CA', city: 'San Francisco', isPrimary: true },
    { id: 'loc-2', name: 'NYC Office', state: 'NY', city: 'New York', isPrimary: false },
  ],
  defaultPayScheduleId: null,
  logo: null,
};

// ---------------------------------------------------------------------------
// Employee Operations
// ---------------------------------------------------------------------------

function createEmployeeRecord(data) {
  return {
    id: data.id || v4(),
    firstName: data.firstName || '',
    lastName: data.lastName || '',
    email: data.email || '',
    ssn: data.ssn || '',
    dateOfBirth: data.dateOfBirth || null,
    hireDate: data.hireDate || null,
    department: data.department || '',
    jobTitle: data.jobTitle || '',
    payType: data.payType || 'salary',           // 'salary' | 'hourly'
    payRate: data.payRate || 0,                   // annual salary or hourly rate
    payFrequency: data.payFrequency || 'biweekly', // 'weekly' | 'biweekly' | 'semimonthly' | 'monthly'
    filingStatus: data.filingStatus || 'single',
    allowances: data.allowances || 0,
    state: data.state || '',
    city: data.city || '',
    benefits: data.benefits || [],
    bankAccount: data.bankAccount || {
      routingNumber: '',
      accountNumber: '',
      accountType: 'checking',                    // 'checking' | 'savings'
    },
    isActive: data.isActive !== undefined ? data.isActive : true,
    ytdEarnings: data.ytdEarnings || 0,
    ytdFederalTax: data.ytdFederalTax || 0,
    ytdStateTax: data.ytdStateTax || 0,
    ytdFica: data.ytdFica || 0,
    ytdDeductions: data.ytdDeductions || 0,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function addEmployee(data) {
  const employee = createEmployeeRecord(data);
  employees.set(employee.id, employee);
  return employee;
}

function getEmployee(id) {
  return employees.get(id) || null;
}

function getAllEmployees() {
  return Array.from(employees.values());
}

function getActiveEmployees() {
  return Array.from(employees.values()).filter((e) => e.isActive);
}

function getEmployeesByState(state) {
  const code = (state || '').toUpperCase();
  return Array.from(employees.values()).filter((e) => e.state === code);
}

function updateEmployee(id, updates) {
  const employee = employees.get(id);
  if (!employee) return null;
  const updated = { ...employee, ...updates, id, updatedAt: new Date().toISOString() };
  employees.set(id, updated);
  return updated;
}

function deactivateEmployee(id) {
  return updateEmployee(id, { isActive: false });
}

// ---------------------------------------------------------------------------
// Pay Run Operations
// ---------------------------------------------------------------------------

function createPayRunRecord(data) {
  return {
    id: data.id || v4(),
    payPeriodStart: data.payPeriodStart || null,
    payPeriodEnd: data.payPeriodEnd || null,
    payDate: data.payDate || null,
    status: data.status || 'draft',               // 'draft' | 'processing' | 'completed' | 'failed'
    employees: data.employees || [],               // array of payStub objects
    totalGross: data.totalGross || 0,
    totalNet: data.totalNet || 0,
    totalTaxes: data.totalTaxes || 0,
    totalDeductions: data.totalDeductions || 0,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function addPayRun(data) {
  const payRun = createPayRunRecord(data);
  payRuns.set(payRun.id, payRun);
  return payRun;
}

function getPayRun(id) {
  return payRuns.get(id) || null;
}

function getAllPayRuns() {
  return Array.from(payRuns.values());
}

function getPayRunsByStatus(status) {
  return Array.from(payRuns.values()).filter((pr) => pr.status === status);
}

function updatePayRun(id, updates) {
  const payRun = payRuns.get(id);
  if (!payRun) return null;
  const updated = { ...payRun, ...updates, id, updatedAt: new Date().toISOString() };
  payRuns.set(id, updated);
  return updated;
}

// ---------------------------------------------------------------------------
// Tax Filing Operations
// ---------------------------------------------------------------------------

function addTaxFiling(data) {
  const filing = {
    id: data.id || v4(),
    type: data.type || '',                         // 'federal' | 'state' | '941' | 'W2' | '1099'
    period: data.period || '',                     // e.g. '2026-Q1'
    state: data.state || null,
    status: data.status || 'pending',              // 'pending' | 'filed' | 'accepted' | 'rejected'
    filingDate: data.filingDate || null,
    dueDate: data.dueDate || null,
    amount: data.amount || 0,
    details: data.details || {},
    createdAt: data.createdAt || new Date().toISOString(),
  };
  taxFilings.set(filing.id, filing);
  return filing;
}

function getTaxFiling(id) {
  return taxFilings.get(id) || null;
}

function getAllTaxFilings() {
  return Array.from(taxFilings.values());
}

function updateTaxFiling(id, updates) {
  const filing = taxFilings.get(id);
  if (!filing) return null;
  const updated = { ...filing, ...updates, id };
  taxFilings.set(id, updated);
  return updated;
}

// ---------------------------------------------------------------------------
// Compliance Check Operations
// ---------------------------------------------------------------------------

function addComplianceCheck(data) {
  const check = {
    id: data.id || v4(),
    employeeId: data.employeeId || null,
    state: data.state || '',
    checkType: data.checkType || '',               // 'minimumWage' | 'overtime' | 'sickLeave' | 'newHire'
    status: data.status || 'pass',                 // 'pass' | 'fail' | 'warning'
    message: data.message || '',
    details: data.details || {},
    checkedAt: data.checkedAt || new Date().toISOString(),
  };
  complianceChecks.set(check.id, check);
  return check;
}

function getComplianceCheck(id) {
  return complianceChecks.get(id) || null;
}

function getComplianceChecksByEmployee(employeeId) {
  return Array.from(complianceChecks.values()).filter((c) => c.employeeId === employeeId);
}

function getAllComplianceChecks() {
  return Array.from(complianceChecks.values());
}

// ---------------------------------------------------------------------------
// Company Config Operations
// ---------------------------------------------------------------------------

function getCompany() {
  return { ...companyConfig };
}

function updateCompany(updates) {
  companyConfig = { ...companyConfig, ...updates, id: companyConfig.id };
  return { ...companyConfig };
}

// ---------------------------------------------------------------------------
// Pay Schedule Operations
// ---------------------------------------------------------------------------

function createPayScheduleRecord(data) {
  return {
    id: data.id || v4(),
    name: data.name || '',
    frequency: data.frequency || 'biweekly',         // 'weekly' | 'biweekly' | 'semimonthly' | 'monthly'
    anchorDate: data.anchorDate || null,
    processingLeadDays: data.processingLeadDays || 3,
    isDefault: data.isDefault !== undefined ? data.isDefault : false,
    assignedEmployeeIds: data.assignedEmployeeIds || [],
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function addPaySchedule(data) {
  const schedule = createPayScheduleRecord(data);
  paySchedules.set(schedule.id, schedule);
  return schedule;
}

function getPaySchedule(id) {
  return paySchedules.get(id) || null;
}

function getAllPaySchedules() {
  return Array.from(paySchedules.values());
}

function updatePaySchedule(id, updates) {
  const schedule = paySchedules.get(id);
  if (!schedule) return null;
  const updated = { ...schedule, ...updates, id, updatedAt: new Date().toISOString() };
  paySchedules.set(id, updated);
  return updated;
}

function deletePaySchedule(id) {
  return paySchedules.delete(id);
}

// ---------------------------------------------------------------------------
// OT Plan Operations
// ---------------------------------------------------------------------------

function createOTPlanRecord(data) {
  return {
    id: data.id || v4(),
    name: data.name || '',
    dailyThreshold: data.dailyThreshold !== undefined ? data.dailyThreshold : null,
    dailyMultiplier: data.dailyMultiplier || 1.5,
    dailyDoubleTimeThreshold: data.dailyDoubleTimeThreshold !== undefined ? data.dailyDoubleTimeThreshold : null,
    dailyDoubleTimeMultiplier: data.dailyDoubleTimeMultiplier || 2.0,
    weeklyThreshold: data.weeklyThreshold || 40,
    weeklyMultiplier: data.weeklyMultiplier || 1.5,
    seventhDayRule: data.seventhDayRule !== undefined ? data.seventhDayRule : false,
    exemptionType: data.exemptionType || 'non-exempt',
    assignedStates: data.assignedStates || [],
    isActive: data.isActive !== undefined ? data.isActive : true,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function addOTPlan(data) {
  const plan = createOTPlanRecord(data);
  otPlans.set(plan.id, plan);
  return plan;
}

function getOTPlan(id) {
  return otPlans.get(id) || null;
}

function getAllOTPlans() {
  return Array.from(otPlans.values());
}

function updateOTPlan(id, updates) {
  const plan = otPlans.get(id);
  if (!plan) return null;
  const updated = { ...plan, ...updates, id, updatedAt: new Date().toISOString() };
  otPlans.set(id, updated);
  return updated;
}

function deleteOTPlan(id) {
  return otPlans.delete(id);
}

// ---------------------------------------------------------------------------
// Break Rule Operations
// ---------------------------------------------------------------------------

function createBreakRuleRecord(data) {
  return {
    id: data.id || v4(),
    name: data.name || '',
    state: data.state || '',
    isStatePreset: data.isStatePreset !== undefined ? data.isStatePreset : false,
    mealBreaks: data.mealBreaks || [],                // [{afterHours, durationMinutes, paid}]
    restBreaks: data.restBreaks || [],                // [{perHours, durationMinutes, paid}]
    penaltyType: data.penaltyType || null,
    notes: data.notes || '',
    isActive: data.isActive !== undefined ? data.isActive : true,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function addBreakRule(data) {
  const rule = createBreakRuleRecord(data);
  breakRules.set(rule.id, rule);
  return rule;
}

function getBreakRule(id) {
  return breakRules.get(id) || null;
}

function getAllBreakRules() {
  return Array.from(breakRules.values());
}

function updateBreakRule(id, updates) {
  const rule = breakRules.get(id);
  if (!rule) return null;
  const updated = { ...rule, ...updates, id, updatedAt: new Date().toISOString() };
  breakRules.set(id, updated);
  return updated;
}

function deleteBreakRule(id) {
  return breakRules.delete(id);
}

// ---------------------------------------------------------------------------
// PTO Policy Operations
// ---------------------------------------------------------------------------

function createPTOPolicyRecord(data) {
  return {
    id: data.id || v4(),
    name: data.name || '',
    type: data.type || 'vacation',                    // 'vacation' | 'sick' | 'personal' | 'floating_holiday'
    accrualMethod: data.accrualMethod || 'per_pay_period', // 'per_pay_period' | 'per_hour' | 'annual_grant'
    accrualRate: data.accrualRate || 0,
    accrualCap: data.accrualCap || null,
    annualUsageCap: data.annualUsageCap || null,
    carryoverAllowed: data.carryoverAllowed !== undefined ? data.carryoverAllowed : true,
    carryoverCap: data.carryoverCap || null,
    waitingPeriodDays: data.waitingPeriodDays || 0,
    isActive: data.isActive !== undefined ? data.isActive : true,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function addPTOPolicy(data) {
  const policy = createPTOPolicyRecord(data);
  ptoPolicies.set(policy.id, policy);
  return policy;
}

function getPTOPolicy(id) {
  return ptoPolicies.get(id) || null;
}

function getAllPTOPolicies() {
  return Array.from(ptoPolicies.values());
}

function updatePTOPolicy(id, updates) {
  const policy = ptoPolicies.get(id);
  if (!policy) return null;
  const updated = { ...policy, ...updates, id, updatedAt: new Date().toISOString() };
  ptoPolicies.set(id, updated);
  return updated;
}

function deletePTOPolicy(id) {
  return ptoPolicies.delete(id);
}

// ---------------------------------------------------------------------------
// PTO Balance Operations
// ---------------------------------------------------------------------------

function createPTOBalanceRecord(data) {
  return {
    id: data.id || v4(),
    employeeId: data.employeeId || null,
    policyId: data.policyId || null,
    accrued: data.accrued || 0,
    used: data.used || 0,
    pending: data.pending || 0,
    available: data.available || 0,
    carryover: data.carryover || 0,
    asOfDate: data.asOfDate || new Date().toISOString().slice(0, 10),
    transactions: data.transactions || [],
  };
}

function addPTOBalance(data) {
  const balance = createPTOBalanceRecord(data);
  ptoBalances.set(balance.id, balance);
  return balance;
}

function getPTOBalance(id) {
  return ptoBalances.get(id) || null;
}

function getPTOBalancesByEmployee(employeeId) {
  return Array.from(ptoBalances.values()).filter((b) => b.employeeId === employeeId);
}

function updatePTOBalance(id, updates) {
  const balance = ptoBalances.get(id);
  if (!balance) return null;
  const updated = { ...balance, ...updates, id };
  ptoBalances.set(id, updated);
  return updated;
}

// ---------------------------------------------------------------------------
// Leave Request Operations
// ---------------------------------------------------------------------------

function createLeaveRequestRecord(data) {
  return {
    id: data.id || v4(),
    employeeId: data.employeeId || null,
    policyId: data.policyId || null,
    startDate: data.startDate || null,
    endDate: data.endDate || null,
    hours: data.hours || 0,
    status: data.status || 'pending',                 // 'pending' | 'approved' | 'denied' | 'cancelled'
    reason: data.reason || '',
    reviewedBy: data.reviewedBy || null,
    reviewedAt: data.reviewedAt || null,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function addLeaveRequest(data) {
  const request = createLeaveRequestRecord(data);
  leaveRequests.set(request.id, request);
  return request;
}

function getLeaveRequest(id) {
  return leaveRequests.get(id) || null;
}

function getAllLeaveRequests() {
  return Array.from(leaveRequests.values());
}

function getLeaveRequestsByEmployee(employeeId) {
  return Array.from(leaveRequests.values()).filter((r) => r.employeeId === employeeId);
}

function updateLeaveRequest(id, updates) {
  const request = leaveRequests.get(id);
  if (!request) return null;
  const updated = { ...request, ...updates, id, updatedAt: new Date().toISOString() };
  leaveRequests.set(id, updated);
  return updated;
}

// ---------------------------------------------------------------------------
// Benefit Plan Operations
// ---------------------------------------------------------------------------

function createBenefitPlanRecord(data) {
  return {
    id: data.id || v4(),
    type: data.type || 'health',                      // 'health' | 'dental' | 'vision' | '401k' | 'hsa' | 'fsa' | 'life'
    name: data.name || '',
    carrier: data.carrier || '',
    coverageLevels: data.coverageLevels || [],         // [{level, employeeCost, employerCost}]
    frequency: data.frequency || 'per_pay_period',    // 'per_pay_period' | 'monthly'
    preTax: data.preTax !== undefined ? data.preTax : true,
    isActive: data.isActive !== undefined ? data.isActive : true,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function addBenefitPlan(data) {
  const plan = createBenefitPlanRecord(data);
  benefitPlans.set(plan.id, plan);
  return plan;
}

function getBenefitPlan(id) {
  return benefitPlans.get(id) || null;
}

function getAllBenefitPlans() {
  return Array.from(benefitPlans.values());
}

function updateBenefitPlan(id, updates) {
  const plan = benefitPlans.get(id);
  if (!plan) return null;
  const updated = { ...plan, ...updates, id, updatedAt: new Date().toISOString() };
  benefitPlans.set(id, updated);
  return updated;
}

function deleteBenefitPlan(id) {
  return benefitPlans.delete(id);
}

// ---------------------------------------------------------------------------
// Benefit Enrollment Operations
// ---------------------------------------------------------------------------

function createBenefitEnrollmentRecord(data) {
  return {
    id: data.id || v4(),
    employeeId: data.employeeId || null,
    planId: data.planId || null,
    coverageLevel: data.coverageLevel || 'employee_only',
    employeeContribution: data.employeeContribution || 0,
    employerContribution: data.employerContribution || 0,
    effectiveDate: data.effectiveDate || null,
    status: data.status || 'active',                  // 'active' | 'pending' | 'terminated'
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function addBenefitEnrollment(data) {
  const enrollment = createBenefitEnrollmentRecord(data);
  benefitEnrollments.set(enrollment.id, enrollment);
  return enrollment;
}

function getBenefitEnrollment(id) {
  return benefitEnrollments.get(id) || null;
}

function getEnrollmentsByEmployee(employeeId) {
  return Array.from(benefitEnrollments.values()).filter((e) => e.employeeId === employeeId);
}

function updateBenefitEnrollment(id, updates) {
  const enrollment = benefitEnrollments.get(id);
  if (!enrollment) return null;
  const updated = { ...enrollment, ...updates, id, updatedAt: new Date().toISOString() };
  benefitEnrollments.set(id, updated);
  return updated;
}

function deleteBenefitEnrollment(id) {
  return benefitEnrollments.delete(id);
}

// ---------------------------------------------------------------------------
// Document Operations
// ---------------------------------------------------------------------------

function createDocumentRecord(data) {
  return {
    id: data.id || v4(),
    category: data.category || 'guide',               // 'form' | 'guide' | 'template' | 'policy'
    name: data.name || '',
    description: data.description || '',
    tags: data.tags || [],
    content: data.content || '',                       // HTML string
    applicableStates: data.applicableStates || [],
    year: data.year || new Date().getFullYear(),
    isActive: data.isActive !== undefined ? data.isActive : true,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function addDocument(data) {
  const doc = createDocumentRecord(data);
  documents.set(doc.id, doc);
  return doc;
}

function getDocument(id) {
  return documents.get(id) || null;
}

function getAllDocuments() {
  return Array.from(documents.values());
}

function getDocumentsByCategory(category) {
  return Array.from(documents.values()).filter((d) => d.category === category);
}

function updateDocument(id, updates) {
  const doc = documents.get(id);
  if (!doc) return null;
  const updated = { ...doc, ...updates, id, updatedAt: new Date().toISOString() };
  documents.set(id, updated);
  return updated;
}

function deleteDocument(id) {
  return documents.delete(id);
}

// ---------------------------------------------------------------------------
// Seed Data - 5 Sample Employees Across Different States
// ---------------------------------------------------------------------------

function seedData() {
  // Clear existing data
  employees.clear();
  payRuns.clear();
  taxFilings.clear();
  complianceChecks.clear();
  paySchedules.clear();
  otPlans.clear();
  breakRules.clear();
  ptoPolicies.clear();
  ptoBalances.clear();
  leaveRequests.clear();
  benefitPlans.clear();
  benefitEnrollments.clear();
  documents.clear();

  // Employee 1 - California, Salaried
  addEmployee({
    id: 'EMP-001',
    firstName: 'Maria',
    lastName: 'Garcia',
    email: 'maria.garcia@acmecorp.com',
    ssn: '***-**-1234',
    dateOfBirth: '1988-03-15',
    hireDate: '2022-06-01',
    department: 'Engineering',
    jobTitle: 'Senior Software Engineer',
    payType: 'salary',
    payRate: 145000,
    payFrequency: 'biweekly',
    filingStatus: 'married',
    allowances: 2,
    state: 'CA',
    city: 'San Francisco',
    benefits: [
      { type: 'health', name: 'PPO Health Plan', employeeContribution: 250, frequency: 'per_pay_period' },
      { type: '401k', name: '401(k) Retirement', employeeContribution: 750, frequency: 'per_pay_period', employerMatch: 0.04 },
      { type: 'dental', name: 'Dental Plan', employeeContribution: 35, frequency: 'per_pay_period' },
    ],
    bankAccount: { routingNumber: '121000358', accountNumber: '****6789', accountType: 'checking' },
    ytdEarnings: 33461.54,
    ytdFederalTax: 3680.77,
    ytdStateTax: 2245.38,
    ytdFica: 2559.79,
    ytdDeductions: 6210.00,
  });

  // Employee 2 - New York (NYC Resident), Salaried
  addEmployee({
    id: 'EMP-002',
    firstName: 'James',
    lastName: 'Chen',
    email: 'james.chen@acmecorp.com',
    ssn: '***-**-5678',
    dateOfBirth: '1992-11-22',
    hireDate: '2023-01-15',
    department: 'Finance',
    jobTitle: 'Financial Analyst',
    payType: 'salary',
    payRate: 95000,
    payFrequency: 'biweekly',
    filingStatus: 'single',
    allowances: 1,
    state: 'NY',
    city: 'New York',
    benefits: [
      { type: 'health', name: 'HMO Health Plan', employeeContribution: 180, frequency: 'per_pay_period' },
      { type: '401k', name: '401(k) Retirement', employeeContribution: 500, frequency: 'per_pay_period', employerMatch: 0.03 },
    ],
    bankAccount: { routingNumber: '021000021', accountNumber: '****4321', accountType: 'checking' },
    ytdEarnings: 21923.08,
    ytdFederalTax: 2631.77,
    ytdStateTax: 1205.77,
    ytdFica: 1677.12,
    ytdDeductions: 4080.00,
  });

  // Employee 3 - Texas, Hourly
  addEmployee({
    id: 'EMP-003',
    firstName: 'Robert',
    lastName: 'Johnson',
    email: 'robert.johnson@acmecorp.com',
    ssn: '***-**-9012',
    dateOfBirth: '1985-07-04',
    hireDate: '2021-09-20',
    department: 'Operations',
    jobTitle: 'Warehouse Supervisor',
    payType: 'hourly',
    payRate: 28.50,
    payFrequency: 'weekly',
    filingStatus: 'married',
    allowances: 3,
    state: 'TX',
    city: 'Houston',
    benefits: [
      { type: 'health', name: 'PPO Health Plan', employeeContribution: 200, frequency: 'per_pay_period' },
      { type: '401k', name: '401(k) Retirement', employeeContribution: 300, frequency: 'per_pay_period', employerMatch: 0.03 },
    ],
    bankAccount: { routingNumber: '111000025', accountNumber: '****8765', accountType: 'checking' },
    ytdEarnings: 14820.00,
    ytdFederalTax: 889.20,
    ytdStateTax: 0,
    ytdFica: 1133.73,
    ytdDeductions: 6500.00,
  });

  // Employee 4 - New Jersey, Salaried
  addEmployee({
    id: 'EMP-004',
    firstName: 'Priya',
    lastName: 'Patel',
    email: 'priya.patel@acmecorp.com',
    ssn: '***-**-3456',
    dateOfBirth: '1990-01-28',
    hireDate: '2024-03-10',
    department: 'Marketing',
    jobTitle: 'Marketing Manager',
    payType: 'salary',
    payRate: 110000,
    payFrequency: 'semimonthly',
    filingStatus: 'single',
    allowances: 1,
    state: 'NJ',
    city: 'Newark',
    benefits: [
      { type: 'health', name: 'PPO Health Plan', employeeContribution: 220, frequency: 'per_pay_period' },
      { type: '401k', name: '401(k) Retirement', employeeContribution: 600, frequency: 'per_pay_period', employerMatch: 0.05 },
      { type: 'vision', name: 'Vision Plan', employeeContribution: 15, frequency: 'per_pay_period' },
    ],
    bankAccount: { routingNumber: '021200339', accountNumber: '****2109', accountType: 'savings' },
    ytdEarnings: 27500.00,
    ytdFederalTax: 3575.00,
    ytdStateTax: 1512.50,
    ytdFica: 2103.75,
    ytdDeductions: 5010.00,
  });

  // Employee 5 - Washington, Hourly
  addEmployee({
    id: 'EMP-005',
    firstName: 'Sarah',
    lastName: 'Kim',
    email: 'sarah.kim@acmecorp.com',
    ssn: '***-**-7890',
    dateOfBirth: '1995-09-12',
    hireDate: '2025-08-01',
    department: 'Customer Support',
    jobTitle: 'Support Team Lead',
    payType: 'hourly',
    payRate: 32.00,
    payFrequency: 'biweekly',
    filingStatus: 'single',
    allowances: 0,
    state: 'WA',
    city: 'Seattle',
    benefits: [
      { type: 'health', name: 'HMO Health Plan', employeeContribution: 160, frequency: 'per_pay_period' },
      { type: '401k', name: '401(k) Retirement', employeeContribution: 400, frequency: 'per_pay_period', employerMatch: 0.04 },
    ],
    bankAccount: { routingNumber: '325070760', accountNumber: '****5432', accountType: 'checking' },
    ytdEarnings: 19968.00,
    ytdFederalTax: 1797.12,
    ytdStateTax: 0,
    ytdFica: 1527.55,
    ytdDeductions: 3360.00,
  });
  // Employee 6 - Georgia, Salaried
  addEmployee({
    id: 'EMP-006',
    firstName: 'David',
    lastName: 'Williams',
    email: 'david.williams@acmecorp.com',
    ssn: '***-**-2345',
    dateOfBirth: '1987-04-20',
    hireDate: '2023-08-15',
    department: 'Sales',
    jobTitle: 'Regional Sales Manager',
    payType: 'salary',
    payRate: 85000,
    payFrequency: 'biweekly',
    filingStatus: 'married',
    allowances: 2,
    state: 'GA',
    city: 'Atlanta',
    benefits: [
      { type: 'health', name: 'PPO Health Plan', employeeContribution: 200, frequency: 'per_pay_period' },
      { type: '401k', name: '401(k) Retirement', employeeContribution: 400, frequency: 'per_pay_period', employerMatch: 0.03 },
    ],
    bankAccount: { routingNumber: '061000104', accountNumber: '****3456', accountType: 'checking' },
    ytdEarnings: 19615.38,
    ytdFederalTax: 1569.23,
    ytdStateTax: 882.69,
    ytdFica: 1500.58,
    ytdDeductions: 3600.00,
  });

  // Employee 7 - Florida, Hourly
  addEmployee({
    id: 'EMP-007',
    firstName: 'Lisa',
    lastName: 'Rodriguez',
    email: 'lisa.rodriguez@acmecorp.com',
    ssn: '***-**-6789',
    dateOfBirth: '1993-12-03',
    hireDate: '2025-01-06',
    department: 'Customer Support',
    jobTitle: 'Senior Support Specialist',
    payType: 'hourly',
    payRate: 22.00,
    payFrequency: 'biweekly',
    filingStatus: 'single',
    allowances: 1,
    state: 'FL',
    city: 'Miami',
    benefits: [
      { type: 'health', name: 'HMO Health Plan', employeeContribution: 140, frequency: 'per_pay_period' },
      { type: '401k', name: '401(k) Retirement', employeeContribution: 250, frequency: 'per_pay_period', employerMatch: 0.03 },
    ],
    bankAccount: { routingNumber: '067014822', accountNumber: '****7890', accountType: 'checking' },
    ytdEarnings: 11440.00,
    ytdFederalTax: 915.20,
    ytdStateTax: 0,
    ytdFica: 875.16,
    ytdDeductions: 2340.00,
  });

  // -------------------------------------------------------------------------
  // Pay Schedules Seed
  // -------------------------------------------------------------------------

  addPaySchedule({
    id: 'PS-001',
    name: 'Biweekly Standard',
    frequency: 'biweekly',
    anchorDate: '2026-01-02',
    processingLeadDays: 3,
    isDefault: true,
    assignedEmployeeIds: ['EMP-001', 'EMP-002', 'EMP-004', 'EMP-005', 'EMP-006', 'EMP-007'],
  });

  addPaySchedule({
    id: 'PS-002',
    name: 'Weekly Operations',
    frequency: 'weekly',
    anchorDate: '2026-01-05',
    processingLeadDays: 2,
    isDefault: false,
    assignedEmployeeIds: ['EMP-003'],
  });

  // Link default pay schedule to company config
  companyConfig.defaultPayScheduleId = 'PS-001';

  // -------------------------------------------------------------------------
  // OT Plans Seed
  // -------------------------------------------------------------------------

  addOTPlan({
    id: 'OT-001',
    name: 'FLSA Standard',
    dailyThreshold: null,
    dailyMultiplier: 1.5,
    dailyDoubleTimeThreshold: null,
    dailyDoubleTimeMultiplier: 2.0,
    weeklyThreshold: 40,
    weeklyMultiplier: 1.5,
    seventhDayRule: false,
    exemptionType: 'non-exempt',
    assignedStates: ['TX', 'NY', 'NJ', 'WA', 'GA', 'FL', 'IL'],
    isActive: true,
  });

  addOTPlan({
    id: 'OT-002',
    name: 'California Daily+Weekly',
    dailyThreshold: 8,
    dailyMultiplier: 1.5,
    dailyDoubleTimeThreshold: 12,
    dailyDoubleTimeMultiplier: 2.0,
    weeklyThreshold: 40,
    weeklyMultiplier: 1.5,
    seventhDayRule: true,
    exemptionType: 'non-exempt',
    assignedStates: ['CA'],
    isActive: true,
  });

  // -------------------------------------------------------------------------
  // Break Rules Seed
  // -------------------------------------------------------------------------

  addBreakRule({
    id: 'BRK-001',
    name: 'California Break Rules',
    state: 'CA',
    isStatePreset: true,
    mealBreaks: [
      { afterHours: 5, durationMinutes: 30, paid: false },
      { afterHours: 10, durationMinutes: 30, paid: false },
    ],
    restBreaks: [
      { perHours: 4, durationMinutes: 10, paid: true },
    ],
    penaltyType: 'one_hour_pay',
    notes: 'California requires meal breaks and paid rest breaks. One hour of pay penalty for missed breaks.',
    isActive: true,
  });

  addBreakRule({
    id: 'BRK-002',
    name: 'New York Break Rules',
    state: 'NY',
    isStatePreset: true,
    mealBreaks: [
      { afterHours: 6, durationMinutes: 30, paid: false },
    ],
    restBreaks: [],
    penaltyType: null,
    notes: 'New York requires a 30-minute meal break for shifts over 6 hours.',
    isActive: true,
  });

  addBreakRule({
    id: 'BRK-003',
    name: 'Illinois Break Rules',
    state: 'IL',
    isStatePreset: true,
    mealBreaks: [
      { afterHours: 7.5, durationMinutes: 20, paid: false },
    ],
    restBreaks: [],
    penaltyType: null,
    notes: 'Illinois requires a 20-minute meal break for shifts of 7.5 hours or more, within first 5 hours.',
    isActive: true,
  });

  // -------------------------------------------------------------------------
  // PTO Policies Seed
  // -------------------------------------------------------------------------

  addPTOPolicy({
    id: 'PTO-001',
    name: 'Standard Vacation',
    type: 'vacation',
    accrualMethod: 'per_pay_period',
    accrualRate: 3.08,
    accrualCap: 160,
    annualUsageCap: null,
    carryoverAllowed: true,
    carryoverCap: 40,
    waitingPeriodDays: 90,
    isActive: true,
  });

  addPTOPolicy({
    id: 'PTO-002',
    name: 'Sick Leave',
    type: 'sick',
    accrualMethod: 'per_pay_period',
    accrualRate: 1.54,
    accrualCap: 80,
    annualUsageCap: null,
    carryoverAllowed: true,
    carryoverCap: 40,
    waitingPeriodDays: 0,
    isActive: true,
  });

  // -------------------------------------------------------------------------
  // PTO Balances Seed (for each employee x each PTO policy)
  // -------------------------------------------------------------------------

  const empIds = ['EMP-001', 'EMP-002', 'EMP-003', 'EMP-004', 'EMP-005', 'EMP-006', 'EMP-007'];
  const ptoSeeds = [
    // PTO-001 Standard Vacation balances (one per employee)
    { policyId: 'PTO-001', accrued: 24.64, used: 8, pending: 0, available: 16.64, carryover: 16 },
    { policyId: 'PTO-001', accrued: 18.48, used: 0, pending: 8, available: 10.48, carryover: 0 },
    { policyId: 'PTO-001', accrued: 36.96, used: 16, pending: 0, available: 20.96, carryover: 24 },
    { policyId: 'PTO-001', accrued: 12.32, used: 0, pending: 0, available: 12.32, carryover: 0 },
    { policyId: 'PTO-001', accrued: 6.16, used: 0, pending: 0, available: 6.16, carryover: 0 },
    { policyId: 'PTO-001', accrued: 18.48, used: 8, pending: 0, available: 10.48, carryover: 8 },
    { policyId: 'PTO-001', accrued: 9.24, used: 0, pending: 0, available: 9.24, carryover: 0 },
    // PTO-002 Sick Leave balances (one per employee)
    { policyId: 'PTO-002', accrued: 12.32, used: 4, pending: 0, available: 8.32, carryover: 8 },
    { policyId: 'PTO-002', accrued: 9.24, used: 0, pending: 0, available: 9.24, carryover: 0 },
    { policyId: 'PTO-002', accrued: 18.48, used: 8, pending: 0, available: 10.48, carryover: 12 },
    { policyId: 'PTO-002', accrued: 6.16, used: 0, pending: 0, available: 6.16, carryover: 0 },
    { policyId: 'PTO-002', accrued: 3.08, used: 0, pending: 0, available: 3.08, carryover: 0 },
    { policyId: 'PTO-002', accrued: 9.24, used: 4, pending: 0, available: 5.24, carryover: 4 },
    { policyId: 'PTO-002', accrued: 4.62, used: 0, pending: 0, available: 4.62, carryover: 0 },
  ];

  let balIdx = 0;
  for (const policyId of ['PTO-001', 'PTO-002']) {
    for (let i = 0; i < empIds.length; i++) {
      const seed = ptoSeeds[balIdx++];
      addPTOBalance({
        id: `PTOBAL-${policyId}-${empIds[i]}`,
        employeeId: empIds[i],
        policyId: seed.policyId,
        accrued: seed.accrued,
        used: seed.used,
        pending: seed.pending,
        available: seed.available,
        carryover: seed.carryover,
        asOfDate: '2026-04-04',
        transactions: [],
      });
    }
  }

  // -------------------------------------------------------------------------
  // Benefit Plans Seed
  // -------------------------------------------------------------------------

  addBenefitPlan({
    id: 'BEN-001',
    type: 'health',
    name: 'PPO Health Plan',
    carrier: 'Blue Cross Blue Shield',
    coverageLevels: [
      { level: 'employee_only', employeeCost: 250, employerCost: 600 },
      { level: 'employee_spouse', employeeCost: 450, employerCost: 900 },
      { level: 'employee_children', employeeCost: 400, employerCost: 850 },
      { level: 'family', employeeCost: 700, employerCost: 1200 },
    ],
    frequency: 'per_pay_period',
    preTax: true,
    isActive: true,
  });

  addBenefitPlan({
    id: 'BEN-002',
    type: 'dental',
    name: 'Dental Plan',
    carrier: 'Delta Dental',
    coverageLevels: [
      { level: 'employee_only', employeeCost: 35, employerCost: 50 },
      { level: 'employee_spouse', employeeCost: 60, employerCost: 75 },
      { level: 'family', employeeCost: 85, employerCost: 100 },
    ],
    frequency: 'per_pay_period',
    preTax: true,
    isActive: true,
  });

  addBenefitPlan({
    id: 'BEN-003',
    type: 'vision',
    name: 'Vision Plan',
    carrier: 'VSP',
    coverageLevels: [
      { level: 'employee_only', employeeCost: 15, employerCost: 20 },
      { level: 'employee_spouse', employeeCost: 25, employerCost: 30 },
      { level: 'family', employeeCost: 40, employerCost: 45 },
    ],
    frequency: 'per_pay_period',
    preTax: true,
    isActive: true,
  });

  addBenefitPlan({
    id: 'BEN-004',
    type: '401k',
    name: '401(k) Retirement Plan',
    carrier: 'Fidelity',
    coverageLevels: [
      { level: 'employee_contribution', employeeCost: 0, employerCost: 0 },
    ],
    frequency: 'per_pay_period',
    preTax: true,
    isActive: true,
  });

  // -------------------------------------------------------------------------
  // Documents Seed
  // -------------------------------------------------------------------------

  addDocument({
    id: 'DOC-001',
    category: 'guide',
    name: 'W-4 Employee Withholding Guide',
    description: 'Step-by-step guide for completing IRS Form W-4 for federal income tax withholding.',
    tags: ['tax', 'federal', 'withholding', 'W-4', 'onboarding'],
    content: '<h1>W-4 Employee Withholding Guide</h1><p>Form W-4 is used by employers to determine the amount of federal income tax to withhold from an employee\'s paycheck. Employees should complete this form when starting a new job or when their personal or financial situation changes.</p><h2>Steps</h2><ol><li>Enter personal information (name, SSN, filing status)</li><li>Complete the Multiple Jobs Worksheet if applicable</li><li>Claim dependents</li><li>Enter other adjustments (other income, deductions, extra withholding)</li><li>Sign and date the form</li></ol>',
    applicableStates: [],
    year: 2026,
    isActive: true,
  });

  addDocument({
    id: 'DOC-002',
    category: 'guide',
    name: 'I-9 Employment Eligibility Overview',
    description: 'Overview of USCIS Form I-9 requirements for verifying employment eligibility.',
    tags: ['compliance', 'I-9', 'eligibility', 'onboarding', 'federal'],
    content: '<h1>I-9 Employment Eligibility Verification</h1><p>Form I-9 is used to verify the identity and employment authorization of individuals hired in the United States. All U.S. employers must ensure proper completion of Form I-9 for each individual they hire.</p><h2>Employer Responsibilities</h2><ul><li>Provide the form to new hires on or before their first day of work</li><li>Review acceptable documents within 3 business days of hire</li><li>Retain completed forms for required retention period</li></ul>',
    applicableStates: [],
    year: 2026,
    isActive: true,
  });

  addDocument({
    id: 'DOC-003',
    category: 'guide',
    name: 'W-2 Wage and Tax Statement Explanation',
    description: 'Explanation of each box on the W-2 form and what the amounts represent.',
    tags: ['tax', 'federal', 'W-2', 'year-end', 'reporting'],
    content: '<h1>Understanding Your W-2</h1><p>The W-2 form reports an employee\'s annual wages and the amount of taxes withheld from their paycheck. Employers must send W-2 forms to employees by January 31 each year.</p><h2>Key Boxes</h2><ul><li><strong>Box 1:</strong> Wages, tips, other compensation</li><li><strong>Box 2:</strong> Federal income tax withheld</li><li><strong>Box 3:</strong> Social Security wages</li><li><strong>Box 4:</strong> Social Security tax withheld</li><li><strong>Box 5:</strong> Medicare wages and tips</li><li><strong>Box 6:</strong> Medicare tax withheld</li></ul>',
    applicableStates: [],
    year: 2026,
    isActive: true,
  });

  addDocument({
    id: 'DOC-004',
    category: 'guide',
    name: 'State Withholding Tax Guide',
    description: 'Overview of state income tax withholding requirements across all registered states.',
    tags: ['tax', 'state', 'withholding', 'multi-state'],
    content: '<h1>State Withholding Tax Guide</h1><p>Employers must withhold state income taxes based on the employee\'s work state and/or resident state. Some states have no income tax (e.g., TX, WA, FL), while others have complex withholding rules.</p><h2>No Income Tax States</h2><p>Alaska, Florida, Nevada, New Hampshire, South Dakota, Tennessee, Texas, Washington, Wyoming</p><h2>Key Considerations</h2><ul><li>Remote workers may create nexus in their home state</li><li>Some states have reciprocity agreements</li><li>Local taxes may also apply (e.g., NYC, Philadelphia)</li></ul>',
    applicableStates: ['CA', 'NY', 'TX', 'NJ', 'WA', 'IL', 'GA', 'FL'],
    year: 2026,
    isActive: true,
  });

  addDocument({
    id: 'DOC-005',
    category: 'guide',
    name: 'FLSA Overtime Compliance Guide',
    description: 'Federal and state overtime rules under the Fair Labor Standards Act.',
    tags: ['compliance', 'overtime', 'FLSA', 'federal', 'labor-law'],
    content: '<h1>FLSA Overtime Compliance Guide</h1><p>The Fair Labor Standards Act (FLSA) requires that non-exempt employees be paid overtime at 1.5x their regular rate for hours worked beyond 40 in a workweek.</p><h2>Exemption Tests</h2><ul><li><strong>Salary Level Test:</strong> Must earn at least $684/week ($35,568/year)</li><li><strong>Salary Basis Test:</strong> Must be paid on a salary basis</li><li><strong>Duties Test:</strong> Must perform exempt job duties (executive, administrative, professional)</li></ul><h2>State Variations</h2><p>California requires daily overtime after 8 hours. Some states have additional requirements for 7th consecutive day of work.</p>',
    applicableStates: [],
    year: 2026,
    isActive: true,
  });

  addDocument({
    id: 'DOC-006',
    category: 'template',
    name: 'Payroll Compliance Checklist',
    description: 'Monthly and quarterly payroll compliance checklist for administrators.',
    tags: ['compliance', 'checklist', 'admin', 'payroll'],
    content: '<h1>Payroll Compliance Checklist</h1><h2>Every Pay Period</h2><ul><li>Verify employee hours and time entries</li><li>Confirm overtime calculations</li><li>Process deductions (benefits, garnishments, taxes)</li><li>Validate net pay calculations</li><li>Submit direct deposit files</li></ul><h2>Monthly</h2><ul><li>Reconcile payroll tax deposits</li><li>Review new hire reporting</li><li>Check benefit enrollment changes</li></ul><h2>Quarterly</h2><ul><li>File Form 941 (federal quarterly tax return)</li><li>File state quarterly returns</li><li>Review FUTA liability</li></ul>',
    applicableStates: [],
    year: 2026,
    isActive: true,
  });

  addDocument({
    id: 'DOC-007',
    category: 'template',
    name: 'New Hire Onboarding Checklist',
    description: 'Complete checklist for payroll-related new hire onboarding tasks.',
    tags: ['onboarding', 'new-hire', 'checklist', 'admin'],
    content: '<h1>New Hire Onboarding Checklist</h1><h2>Day 1</h2><ul><li>Complete Form W-4 (federal withholding)</li><li>Complete state withholding form (if applicable)</li><li>Complete Form I-9 (employment eligibility)</li><li>Set up direct deposit</li><li>Enroll in benefits</li></ul><h2>Within 20 Days</h2><ul><li>Submit new hire report to state agency</li><li>Verify I-9 documentation</li></ul><h2>Within 90 Days</h2><ul><li>Confirm benefits enrollment finalized</li><li>Review probationary period status</li><li>Verify first payroll processed correctly</li></ul>',
    applicableStates: [],
    year: 2026,
    isActive: true,
  });

  addDocument({
    id: 'DOC-008',
    category: 'form',
    name: 'Direct Deposit Authorization Form',
    description: 'Employee authorization form for setting up or changing direct deposit information.',
    tags: ['form', 'direct-deposit', 'banking', 'onboarding'],
    content: '<h1>Direct Deposit Authorization Form</h1><p>I hereby authorize my employer to deposit my net pay into the bank account(s) specified below. This authorization remains in effect until I provide written notice of cancellation.</p><h2>Account Information</h2><ul><li>Bank Name: _______________</li><li>Routing Number: _______________</li><li>Account Number: _______________</li><li>Account Type: [ ] Checking  [ ] Savings</li><li>Deposit Amount: [ ] Full Net Pay  [ ] Partial: $___</li></ul><h2>Authorization</h2><p>Signature: _______________ Date: _______________</p>',
    applicableStates: [],
    year: 2026,
    isActive: true,
  });
}

// Run seed data on module load
seedData();

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
module.exports = {
  // Raw maps (for advanced queries)
  employees,
  payRuns,
  taxFilings,
  complianceChecks,

  // Employee CRUD
  addEmployee,
  getEmployee,
  getAllEmployees,
  getActiveEmployees,
  getEmployeesByState,
  updateEmployee,
  deactivateEmployee,

  // Pay Run CRUD
  addPayRun,
  getPayRun,
  getAllPayRuns,
  getPayRunsByStatus,
  updatePayRun,

  // Tax Filing CRUD
  addTaxFiling,
  getTaxFiling,
  getAllTaxFilings,
  updateTaxFiling,

  // Compliance Check CRUD
  addComplianceCheck,
  getComplianceCheck,
  getComplianceChecksByEmployee,
  getAllComplianceChecks,

  // Company Config
  getCompany,
  updateCompany,

  // Pay Schedule CRUD
  addPaySchedule,
  getPaySchedule,
  getAllPaySchedules,
  updatePaySchedule,
  deletePaySchedule,

  // OT Plan CRUD
  addOTPlan,
  getOTPlan,
  getAllOTPlans,
  updateOTPlan,
  deleteOTPlan,

  // Break Rule CRUD
  addBreakRule,
  getBreakRule,
  getAllBreakRules,
  updateBreakRule,
  deleteBreakRule,

  // PTO Policy CRUD
  addPTOPolicy,
  getPTOPolicy,
  getAllPTOPolicies,
  updatePTOPolicy,
  deletePTOPolicy,

  // PTO Balance CRUD
  addPTOBalance,
  getPTOBalance,
  getPTOBalancesByEmployee,
  updatePTOBalance,

  // Leave Request CRUD
  addLeaveRequest,
  getLeaveRequest,
  getAllLeaveRequests,
  getLeaveRequestsByEmployee,
  updateLeaveRequest,

  // Benefit Plan CRUD
  addBenefitPlan,
  getBenefitPlan,
  getAllBenefitPlans,
  updateBenefitPlan,
  deleteBenefitPlan,

  // Benefit Enrollment CRUD
  addBenefitEnrollment,
  getBenefitEnrollment,
  getEnrollmentsByEmployee,
  updateBenefitEnrollment,
  deleteBenefitEnrollment,

  // Document CRUD
  addDocument,
  getDocument,
  getAllDocuments,
  getDocumentsByCategory,
  updateDocument,
  deleteDocument,

  // Utility
  seedData,
};
