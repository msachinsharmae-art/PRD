/**
 * AI Engine for salary template modifications.
 * Processes natural language commands and generates HTML modifications.
 * Works entirely server-side with rule-based NLP + pattern matching.
 *
 * Supports: bulk operations, targeted styling, width/height changes,
 * color modifications per section, and 200+ natural language variations.
 */

const { getAllSlugs, SLUG_CATEGORIES } = require('./slugs');

// ═══════════════════════════════════════════════════════════════════
// CONTEXT BUILDER
// ═══════════════════════════════════════════════════════════════════

function buildAIContext(templateHtml) {
  const allSlugs = getAllSlugs();
  const slugsByCategory = {};
  for (const s of allSlugs) {
    if (!slugsByCategory[s.category]) slugsByCategory[s.category] = [];
    slugsByCategory[s.category].push(`${s.slug} → ${s.description}`);
  }

  return {
    templateHtml,
    slugsByCategory,
    allSlugs,
  };
}

// ═══════════════════════════════════════════════════════════════════
// SECTION DETECTION — understands which part of the template the user means
// ═══════════════════════════════════════════════════════════════════

function detectSection(text) {
  const t = text.toLowerCase().replace(/\s+/g, ' ').trim();
  if (/earn|earning|earnings|salary\s*component/i.test(t)) return 'earnings';
  if (/ded|deduct|deduction|deductions/i.test(t)) return 'deductions';
  if (/employee|emp\s*info|personal|header\s*info/i.test(t)) return 'employee_info';
  if (/bank\s*(?:detail|info|section|panel)/i.test(t)) return 'bank_details';
  if (/statut|id\s*(?:number|detail)|pf|esi|uan|pan|aadh?a/i.test(t)) return 'statutory_ids';
  if (/attend|day|leave/i.test(t)) return 'attendance_days';
  if (/salary|amount|pay|ctc|gross|net/i.test(t)) return 'salary_amounts';
  if (/org|company|organization|organisation/i.test(t)) return 'org_details';
  if (/reimburse/i.test(t)) return 'reimbursement';
  if (/compli/i.test(t)) return 'compliance';
  if (/overtime|ot\b/i.test(t)) return 'overtime';
  if (/loan|emi/i.test(t)) return 'loan_emi';
  if (/header/i.test(t)) return 'header';
  if (/footer/i.test(t)) return 'footer';
  return null;
}

// ═══════════════════════════════════════════════════════════════════
// BULK CATEGORY GROUPS — maps user phrases to slug categories
// ═══════════════════════════════════════════════════════════════════

const BULK_GROUPS = {
  'bank': {
    category: 'bank_details',
    fields: [
      { label: 'Account Number', slug: '{{single.ACCOUNT_NUMBER}}' },
      { label: 'Account Holder Name', slug: '{{single.ACCOUNT_HOLDER_NAME}}' },
      { label: 'Bank Name', slug: '{{single.BANK_NAME}}' },
      { label: 'Account Type', slug: '{{single.ACCOUNT_TYPE}}' },
      { label: 'IFSC Code', slug: '{{single.IFSC_CODE}}' },
      { label: 'Payment Type', slug: '{{single.PAYMENT_TYPE}}' },
    ],
  },
  'statutory': {
    category: 'statutory_ids',
    fields: [
      { label: 'PAN Number', slug: '{{single.PAN_CARD}}' },
      { label: 'Aadhaar Number', slug: '{{single.AADHAR_CARD}}' },
      { label: 'UAN Number', slug: '{{single.UAN_NUMBER}}' },
      { label: 'ESI Number', slug: '{{single.ESI_NUMBER}}' },
      { label: 'PF Number', slug: '{{single.PF_NUMBER}}' },
    ],
  },
  'attendance': {
    category: 'attendance_days',
    fields: [
      { label: 'Working Days', slug: '{{single.WORKING_DAYS}}' },
      { label: 'Present Days', slug: '{{single.PRESENT_DAYS}}' },
      { label: 'Payable Days', slug: '{{single.PAYABLE_DAYS}}' },
      { label: 'LOP Days', slug: '{{single.LWP}}' },
      { label: 'Absence Days', slug: '{{single.ABSENCE_DAYS}}' },
      { label: 'Weekly Off', slug: '{{single.WEEKLY_OFF}}' },
      { label: 'Holidays', slug: '{{single.HOLIDAYS}}' },
    ],
  },
  'personal': {
    category: 'employee_info',
    fields: [
      { label: 'Employee Name', slug: '{{single.emp_name}}' },
      { label: 'Employee Code', slug: '{{single.emp_code}}' },
      { label: 'Email', slug: '{{single.emp_email}}' },
      { label: 'Mobile', slug: '{{single.mobile_no}}' },
      { label: 'Date of Birth', slug: '{{single.date_of_birth}}' },
      { label: 'Gender', slug: '{{single.gender}}' },
      { label: "Father's Name", slug: '{{single.FATHER_NAME}}' },
      { label: 'Address', slug: '{{single.ADDRESS}}' },
    ],
  },
  'organization': {
    category: 'org_details',
    fields: [
      { label: 'Organization Name', slug: '{{org_details.ORG_NAME}}' },
      { label: 'Organization Address', slug: '{{org_details.ORG_ADDRESS}}' },
      { label: 'City', slug: '{{org_details.ORG_CITY}}' },
      { label: 'State', slug: '{{org_details.ORG_STATE}}' },
      { label: 'Zip Code', slug: '{{org_details.ORG_ZIP_CODE}}' },
      { label: 'PAN', slug: '{{org_details.PAN}}' },
    ],
  },
  'payroll_period': {
    category: 'payroll_period',
    fields: [
      { label: 'Payroll Month', slug: '{{single.PAYROLL_MONTH}}' },
      { label: 'Payroll Year', slug: '{{single.PAYROLL_YEAR}}' },
      { label: 'Pay Cycle', slug: '{{single.PAY_CYCLE}}' },
      { label: 'Financial Year', slug: '{{single.financial_year}}' },
      { label: 'Issue Date', slug: '{{issue_date}}' },
    ],
  },
  'salary': {
    category: 'salary_amounts',
    fields: [
      { label: 'Gross Salary', slug: '{{single.GROSS_SALARY}}' },
      { label: 'Net Salary', slug: '{{single.NET_SALARY}}' },
      { label: 'CTC', slug: '{{single.FREEZED_CTC}}' },
      { label: 'Monthly CTC', slug: '{{single.MONTHLY_CTC}}' },
      { label: 'Amount in Words', slug: '{{single.amount_in_words}}' },
    ],
  },
  'overtime': {
    category: 'overtime',
    fields: [
      { label: 'OT Amount', slug: '{{single.OT}}' },
      { label: 'OT Days', slug: '{{single.OT_DAYS}}' },
      { label: 'Extra OT', slug: '{{single.EXTRA_OT}}' },
    ],
  },
  'loan': {
    category: 'loan_emi',
    fields: [
      { label: 'EMI Amount', slug: '{{loan_emi.emi}}' },
      { label: 'Opening Balance', slug: '{{loan_emi.openong_bal}}' },
      { label: 'Closing Balance', slug: '{{loan_emi.closing_bal}}' },
    ],
  },
};

// Aliases that map user phrases to BULK_GROUPS keys
const BULK_ALIASES = {
  'bank details': 'bank', 'bank info': 'bank', 'bank information': 'bank',
  'bank data': 'bank', 'bank fields': 'bank', 'bank slugs': 'bank',
  'banking details': 'bank', 'account details': 'bank', 'payment details': 'bank',
  'all bank': 'bank', 'bank related': 'bank',

  'statutory details': 'statutory', 'statutory info': 'statutory', 'statutory ids': 'statutory',
  'statutory numbers': 'statutory', 'id details': 'statutory', 'id numbers': 'statutory',
  'identification': 'statutory', 'all statutory': 'statutory', 'id proofs': 'statutory',

  'attendance details': 'attendance', 'attendance info': 'attendance', 'day details': 'attendance',
  'attendance data': 'attendance', 'leave details': 'attendance', 'all attendance': 'attendance',
  'days info': 'attendance', 'working details': 'attendance',

  'personal details': 'personal', 'personal info': 'personal', 'personal information': 'personal',
  'employee details': 'personal', 'employee info': 'personal', 'emp details': 'personal',
  'all personal': 'personal', 'employee information': 'personal',

  'organization details': 'organization', 'org details': 'organization', 'company details': 'organization',
  'company info': 'organization', 'company information': 'organization', 'all org': 'organization',
  'organisation details': 'organization',

  'payroll period': 'payroll_period', 'period details': 'payroll_period', 'pay period': 'payroll_period',
  'payroll info': 'payroll_period', 'payroll details': 'payroll_period', 'date details': 'payroll_period',

  'salary details': 'salary', 'salary info': 'salary', 'salary amounts': 'salary',
  'pay details': 'salary', 'salary data': 'salary', 'all salary': 'salary',

  'overtime details': 'overtime', 'ot details': 'overtime', 'all overtime': 'overtime',
  'overtime info': 'overtime',

  'loan details': 'loan', 'emi details': 'loan', 'loan info': 'loan', 'loan emi': 'loan',
  'all loan': 'loan',
};

// ═══════════════════════════════════════════════════════════════════
// COLOR NAME MAP — human color names to hex/CSS values
// ═══════════════════════════════════════════════════════════════════

const COLOR_MAP = {
  'red': '#e53935', 'dark red': '#b71c1c', 'light red': '#ef5350',
  'blue': '#1e88e5', 'dark blue': '#1565c0', 'light blue': '#42a5f5', 'navy': '#0d47a1', 'sky blue': '#64b5f6',
  'green': '#43a047', 'dark green': '#2e7d32', 'light green': '#66bb6a',
  'yellow': '#fdd835', 'gold': '#ffc107', 'amber': '#ff8f00',
  'orange': '#fb8c00', 'dark orange': '#e65100',
  'purple': '#8e24aa', 'violet': '#7b1fa2', 'indigo': '#3f51b5',
  'pink': '#ec407a', 'magenta': '#e91e63',
  'grey': '#9e9e9e', 'gray': '#9e9e9e', 'dark grey': '#616161', 'dark gray': '#616161',
  'light grey': '#e0e0e0', 'light gray': '#e0e0e0',
  'black': '#000000', 'white': '#ffffff',
  'teal': '#009688', 'cyan': '#00bcd4', 'brown': '#795548',
  'maroon': '#880e4f', 'olive': '#827717', 'coral': '#ff7043', 'salmon': '#ff8a65',
  'transparent': 'transparent', 'none': 'transparent',
};

function resolveColor(val) {
  if (!val) return null;
  const v = val.trim().toLowerCase();
  if (COLOR_MAP[v]) return COLOR_MAP[v];
  if (/^#[0-9a-f]{3,8}$/i.test(v)) return v;
  if (/^rgb/i.test(v)) return v;
  if (/^hsl/i.test(v)) return v;
  return v; // pass through CSS color keywords
}

// ═══════════════════════════════════════════════════════════════════
// SECTION TARGET RESOLVER — maps user section references to CSS selectors / search terms
// ═══════════════════════════════════════════════════════════════════

const SECTION_TARGETS = {
  'employee info': { search: ['main-table', 'emp_name', 'emp_code', 'emp_id'], cssClass: 'main-table' },
  'employee information': { search: ['main-table', 'emp_name', 'emp_code'], cssClass: 'main-table' },
  'emp info': { search: ['main-table', 'emp_name', 'emp_code'], cssClass: 'main-table' },
  'personal info': { search: ['main-table', 'emp_name', 'emp_code'], cssClass: 'main-table' },
  'header': { search: ['main-table', 'emp_name'], cssClass: 'main-table' },
  'earnings': { search: ['earnings', '#each new_obj.earnings'], cssClass: 'earnings' },
  'earnings section': { search: ['earnings', '#each new_obj.earnings'], cssClass: 'earnings' },
  'earnings table': { search: ['earnings', '#each new_obj.earnings'], cssClass: 'earnings' },
  'deductions': { search: ['deductions', '#each new_obj.deductions'], cssClass: 'deductions' },
  'deductions section': { search: ['deductions', '#each new_obj.deductions'], cssClass: 'deductions' },
  'deductions table': { search: ['deductions', '#each new_obj.deductions'], cssClass: 'deductions' },
  'earnings header': { search: ['earnings-header'], cssClass: 'earnings-header' },
  'deductions header': { search: ['earnings-header'], cssClass: 'earnings-header' },
  'table header': { search: ['earnings-header'], cssClass: 'earnings-header' },
  'section header': { search: ['earnings-header'], cssClass: 'earnings-header' },
  'footer': { search: ['amount_in_words', 'net_payable', 'Authorized'], cssClass: 'footer' },
  'salary summary': { search: ['GROSS_SALARY', 'NET_SALARY', 'net_payable'], cssClass: 'salary-summary' },
  'net pay': { search: ['net_payable', 'NET_SALARY'], cssClass: 'net-pay' },
  'whole template': { search: ['body', '<table'], cssClass: 'body' },
  'entire template': { search: ['body', '<table'], cssClass: 'body' },
  'full template': { search: ['body', '<table'], cssClass: 'body' },
  'template': { search: ['body', '<table'], cssClass: 'body' },
  'payslip': { search: ['body', '<table'], cssClass: 'body' },
};

// ═══════════════════════════════════════════════════════════════════
// FIELD MAP — maps 200+ natural language field names to slugs
// ═══════════════════════════════════════════════════════════════════

const FIELD_MAP = {
  // Employee Info
  'lop': { label: 'LOP Days', slug: '{{single.LWP}}' },
  'loss of pay': { label: 'LOP Days', slug: '{{single.LWP}}' },
  'lwp': { label: 'LOP Days', slug: '{{single.LWP}}' },
  'lop days': { label: 'LOP Days', slug: '{{single.LWP}}' },
  'pan': { label: 'PAN Number', slug: '{{single.PAN_CARD}}' },
  'pan number': { label: 'PAN Number', slug: '{{single.PAN_CARD}}' },
  'pan card': { label: 'PAN Number', slug: '{{single.PAN_CARD}}' },
  'aadhaar': { label: 'Aadhaar Number', slug: '{{single.AADHAR_CARD}}' },
  'aadhar': { label: 'Aadhaar Number', slug: '{{single.AADHAR_CARD}}' },
  'aadhaar number': { label: 'Aadhaar Number', slug: '{{single.AADHAR_CARD}}' },
  'aadhar number': { label: 'Aadhaar Number', slug: '{{single.AADHAR_CARD}}' },
  'aadhaar card': { label: 'Aadhaar Number', slug: '{{single.AADHAR_CARD}}' },
  'uan': { label: 'UAN Number', slug: '{{single.UAN_NUMBER}}' },
  'uan number': { label: 'UAN Number', slug: '{{single.UAN_NUMBER}}' },
  'esi': { label: 'ESI Number', slug: '{{single.ESI_NUMBER}}' },
  'esi number': { label: 'ESI Number', slug: '{{single.ESI_NUMBER}}' },
  'pf number': { label: 'PF Number', slug: '{{single.PF_NUMBER}}' },
  'pf': { label: 'PF Number', slug: '{{single.PF_NUMBER}}' },
  'provident fund': { label: 'PF Number', slug: '{{single.PF_NUMBER}}' },
  'passport': { label: 'Passport Number', slug: '{{single.PASSPORT_NUMBER}}' },
  'passport number': { label: 'Passport Number', slug: '{{single.PASSPORT_NUMBER}}' },

  // Bank Details
  'bank name': { label: 'Bank Name', slug: '{{single.BANK_NAME}}' },
  'account number': { label: 'Account Number', slug: '{{single.ACCOUNT_NUMBER}}' },
  'account no': { label: 'Account Number', slug: '{{single.ACCOUNT_NUMBER}}' },
  'a/c number': { label: 'Account Number', slug: '{{single.ACCOUNT_NUMBER}}' },
  'a/c no': { label: 'Account Number', slug: '{{single.ACCOUNT_NUMBER}}' },
  'ifsc': { label: 'IFSC Code', slug: '{{single.IFSC_CODE}}' },
  'ifsc code': { label: 'IFSC Code', slug: '{{single.IFSC_CODE}}' },
  'account holder': { label: 'Account Holder Name', slug: '{{single.ACCOUNT_HOLDER_NAME}}' },
  'account holder name': { label: 'Account Holder Name', slug: '{{single.ACCOUNT_HOLDER_NAME}}' },
  'account type': { label: 'Account Type', slug: '{{single.ACCOUNT_TYPE}}' },
  'payment type': { label: 'Payment Type', slug: '{{single.PAYMENT_TYPE}}' },
  'payment mode': { label: 'Payment Type', slug: '{{single.PAYMENT_TYPE}}' },

  // Employee Details
  'department': { label: 'Department', slug: '{{single.department_name}}' },
  'dept': { label: 'Department', slug: '{{single.department_name}}' },
  'designation': { label: 'Designation', slug: '{{single.designation_name}}' },
  'location': { label: 'Location', slug: '{{single.location_name}}' },
  'joining date': { label: 'Joining Date', slug: '{{single.joining_date}}' },
  'doj': { label: 'Date of Joining', slug: '{{single.joining_date}}' },
  'date of joining': { label: 'Date of Joining', slug: '{{single.joining_date}}' },
  'father name': { label: "Father's Name", slug: '{{single.FATHER_NAME}}' },
  "father's name": { label: "Father's Name", slug: '{{single.FATHER_NAME}}' },
  'employee code': { label: 'Employee Code', slug: '{{single.emp_code}}' },
  'emp code': { label: 'Employee Code', slug: '{{single.emp_code}}' },
  'employee id': { label: 'Employee ID', slug: '{{single.emp_id}}' },
  'emp id': { label: 'Employee ID', slug: '{{single.emp_id}}' },
  'employee name': { label: 'Employee Name', slug: '{{single.emp_name}}' },
  'emp name': { label: 'Employee Name', slug: '{{single.emp_name}}' },
  'name': { label: 'Employee Name', slug: '{{single.emp_name}}' },
  'email': { label: 'Email', slug: '{{single.emp_email}}' },
  'email id': { label: 'Email', slug: '{{single.email_id}}' },
  'mobile': { label: 'Mobile', slug: '{{single.mobile_no}}' },
  'mobile number': { label: 'Mobile', slug: '{{single.mobile_no}}' },
  'phone': { label: 'Mobile', slug: '{{single.mobile_no}}' },
  'phone number': { label: 'Mobile', slug: '{{single.mobile_no}}' },
  'contact': { label: 'Mobile', slug: '{{single.mobile_no}}' },
  'contact number': { label: 'Mobile', slug: '{{single.mobile_no}}' },
  'gender': { label: 'Gender', slug: '{{single.gender}}' },
  'date of birth': { label: 'Date of Birth', slug: '{{single.date_of_birth}}' },
  'dob': { label: 'Date of Birth', slug: '{{single.date_of_birth}}' },
  'birthday': { label: 'Date of Birth', slug: '{{single.date_of_birth}}' },
  'anniversary': { label: 'Anniversary Date', slug: '{{single.anniversary_date}}' },
  'anniversary date': { label: 'Anniversary Date', slug: '{{single.anniversary_date}}' },
  'last working date': { label: 'Last Working Date', slug: '{{single.last_working_date}}' },
  'lwd': { label: 'Last Working Date', slug: '{{single.last_working_date}}' },
  'address': { label: 'Address', slug: '{{single.ADDRESS}}' },
  'employee address': { label: 'Address', slug: '{{single.emp_address}}' },
  'nationality': { label: 'Nationality', slug: '{{single.NATIONALITY}}' },
  'grade': { label: 'Grade', slug: '{{single.GRADE_NAME}}' },
  'employee grade': { label: 'Employee Grade', slug: '{{single.EMP_GRADE}}' },
  'skill level': { label: 'Skill Level', slug: '{{single.SKILL_LEVEL}}' },
  'state': { label: 'State', slug: '{{single.state_name}}' },
  'state name': { label: 'State', slug: '{{single.state_name}}' },
  'business unit': { label: 'Business Unit', slug: '{{single.business_unit}}' },
  'sub department': { label: 'Sub Department', slug: '{{single.SUB_DEPT_NAME}}' },
  'branch': { label: 'Branch City', slug: '{{single.BRANCH_CITY}}' },
  'branch city': { label: 'Branch City', slug: '{{single.BRANCH_CITY}}' },
  'branch location': { label: 'Branch Location', slug: '{{single.BRANCH_LOCATION}}' },
  'zone': { label: 'Zone', slug: '{{single.ZONE_NAME}}' },
  'entity': { label: 'Entity', slug: '{{single.entity_name}}' },
  'entity name': { label: 'Entity', slug: '{{single.entity_name}}' },

  // Salary & Amounts
  'gross salary': { label: 'Gross Salary', slug: '{{single.GROSS_SALARY}}' },
  'gross': { label: 'Gross Salary', slug: '{{single.GROSS_SALARY}}' },
  'net salary': { label: 'Net Salary', slug: '{{single.NET_SALARY}}' },
  'net pay': { label: 'Net Salary', slug: '{{single.NET_SALARY}}' },
  'net': { label: 'Net Salary', slug: '{{single.NET_SALARY}}' },
  'working days': { label: 'Working Days', slug: '{{single.WORKING_DAYS}}' },
  'present days': { label: 'Present Days', slug: '{{single.PRESENT_DAYS}}' },
  'payable days': { label: 'Payable Days', slug: '{{single.PAYABLE_DAYS}}' },
  'paid days': { label: 'Paid Days', slug: '{{single.paid_days}}' },
  'days in month': { label: 'Days in Month', slug: '{{single.DAYS_IN_MONTH}}' },
  'overtime': { label: 'Overtime', slug: '{{single.OT}}' },
  'ot': { label: 'OT Amount', slug: '{{single.OT}}' },
  'ot amount': { label: 'OT Amount', slug: '{{single.OT}}' },
  'ot days': { label: 'OT Days', slug: '{{single.OT_DAYS}}' },
  'arrear': { label: 'Arrear Days', slug: '{{single.ARREAR_DAYS}}' },
  'arrear days': { label: 'Arrear Days', slug: '{{single.ARREAR_DAYS}}' },
  'arrear amount': { label: 'Arrear Amount', slug: '{{single.ARREAR_AMOUNT}}' },
  'loan': { label: 'Loan', slug: '{{single.LOAN}}' },
  'advance': { label: 'Advance', slug: '{{single.ADVANCE}}' },
  'weekly off': { label: 'Weekly Off', slug: '{{single.WEEKLY_OFF}}' },
  'holidays': { label: 'Holidays', slug: '{{single.HOLIDAYS}}' },
  'late days': { label: 'Late Days', slug: '{{single.LATE_DAYS}}' },
  'early days': { label: 'Early Days', slug: '{{single.EARLY_DAYS}}' },
  'absence days': { label: 'Absence Days', slug: '{{single.ABSENCE_DAYS}}' },
  'absent days': { label: 'Absence Days', slug: '{{single.ABSENCE_DAYS}}' },
  'ncp days': { label: 'NCP Days', slug: '{{single.NCP_DAYS}}' },
  'amount in words': { label: 'Amount in Words', slug: '{{single.amount_in_words}}' },
  'salary in words': { label: 'Amount in Words', slug: '{{single.amount_in_words}}' },
  'net in words': { label: 'Amount in Words', slug: '{{single.amount_in_words}}' },
  'leave balance': { label: 'Leave Balance', slug: '{{single.annual_leave_balance}}' },
  'leave table': { label: 'Leave Balance Table', slug: '{{leave_str}}' },
  'leave details': { label: 'Leave Balance Table', slug: '{{leave_str}}' },
  'loan details': { label: 'Loan Details', slug: '{{loan_str}}' },
  'loan emi': { label: 'Loan EMI', slug: '{{loan_emi.emi}}' },
  'professional tax': { label: 'Professional Tax', slug: '{{single.PT}}' },
  'pt': { label: 'Professional Tax', slug: '{{single.PT}}' },
  'tds': { label: 'TDS', slug: '{{single.TDS}}' },
  'lwf': { label: 'LWF', slug: '{{single.LWF}}' },
  'pf wages': { label: 'PF Wages', slug: '{{single.PF_WAGES}}' },
  'epf wages': { label: 'EPF Wages', slug: '{{single.EPF_WAGES}}' },
  'esic wages': { label: 'ESIC Wages', slug: '{{single.ESIC_WAGES}}' },
  'basic': { label: 'Employee Basic', slug: '{{single.emp_basic}}' },
  'basic salary': { label: 'Employee Basic', slug: '{{single.emp_basic}}' },
  'ctc': { label: 'CTC', slug: '{{single.FREEZED_CTC}}' },
  'monthly ctc': { label: 'Monthly CTC', slug: '{{single.MONTHLY_CTC}}' },
  'yearly ctc': { label: 'Yearly CTC', slug: '{{single.YEARLY_FREEZED_CTC}}' },
  'min wages': { label: 'Minimum Wages', slug: '{{single.MIN_WAGES}}' },
  'minimum wages': { label: 'Minimum Wages', slug: '{{single.MIN_WAGES}}' },
  'paycut': { label: 'Paycut Amount', slug: '{{single.PAYCUT_AMOUNT}}' },
  'deduction total': { label: 'Total Deduction', slug: '{{single.DEDUCTION}}' },
  'currency': { label: 'Currency', slug: '{{single.ABBREVIATION}}' },
  'currency symbol': { label: 'Currency Symbol', slug: '{{single.SYMBOL}}' },
  'financial year': { label: 'Financial Year', slug: '{{single.financial_year}}' },
  'pay cycle': { label: 'Pay Cycle', slug: '{{single.PAY_CYCLE}}' },
  'invoice number': { label: 'Invoice Number', slug: '{{single.invoice_no}}' },
  'invoice': { label: 'Invoice Number', slug: '{{single.invoice_no}}' },
  'payment status': { label: 'Payment Status', slug: '{{single.P_STATUS}}' },
  'payroll month': { label: 'Payroll Month', slug: '{{single.PAYROLL_MONTH}}' },
  'payroll year': { label: 'Payroll Year', slug: '{{single.PAYROLL_YEAR}}' },
  'salary slip id': { label: 'Salary Slip ID', slug: '{{single.SALARY_SLIP}}' },
  'penalty days': { label: 'Total Penalty Days', slug: '{{single.TOTAL_PENALTY_DAYS}}' },
  'half day deductions': { label: 'Half Day Deductions', slug: '{{single.HALF_DEDUCT}}' },
  'working hours': { label: 'Working Hours/Day', slug: '{{single.WORKING_HR_IN_A_DAY}}' },

  // Organization Details
  'company address': { label: 'Company Address', slug: '{{org_details.ORG_ADDRESS}}' },
  'company name': { label: 'Company Name', slug: '{{org_details.ORG_NAME}}' },
  'org name': { label: 'Organization Name', slug: '{{org_details.ORG_NAME}}' },
  'organization name': { label: 'Organization Name', slug: '{{org_details.ORG_NAME}}' },
  'legal name': { label: 'Legal Name', slug: '{{org_details.LEGAL_NAME}}' },
  'org logo': { label: 'Organization Logo', slug: '{{org_details.ORG_LOGO}}' },
  'company logo': { label: 'Company Logo', slug: '{{org_details.ORG_LOGO}}' },
  'logo': { label: 'Organization Logo', slug: '{{org_details.ORG_LOGO}}' },
  'authorized signatory': { label: 'Authorized Signatory', slug: '{{org_details.AUTHRISED_SIGNATORY}}' },
  'signatory': { label: 'Authorized Signatory', slug: '{{org_details.AUTHRISED_SIGNATORY}}' },
  'org email': { label: 'Organization Email', slug: '{{org_details.EMAIL}}' },
  'org mobile': { label: 'Organization Mobile', slug: '{{org_details.MOBILE_NUMBER}}' },
  'org pan': { label: 'Organization PAN', slug: '{{org_details.PAN}}' },

  // Computed Totals
  'total earnings': { label: 'Total Earnings', slug: '{{new_obj.gross}}' },
  'total deductions': { label: 'Total Deductions', slug: '{{new_obj.deduction}}' },
  'net payable': { label: 'Net Payable', slug: '{{new_obj.net_payable}}' },
  'total reimbursement': { label: 'Total Reimbursement', slug: '{{new_obj.total_reim_amount}}' },

  // Special Sections
  'compliance': { label: 'Compliance Table', slug: '{{compliances_table}}' },
  'compliance table': { label: 'Compliance Table', slug: '{{compliances_table}}' },
  'reimbursement': { label: 'Reimbursement Section', slug: 'reimbursement_section' },
  'ytd': { label: 'YTD Earnings', slug: 'ytd_section' },
  'yearly': { label: 'Yearly Summary', slug: 'yearly_section' },
  'yearly summary': { label: 'Yearly Summary', slug: 'yearly_section' },
};

// ═══════════════════════════════════════════════════════════════════
// COMMAND PARSER — the brain of the engine
// ═══════════════════════════════════════════════════════════════════

/**
 * Parse user's description of desired sections for a new template.
 * e.g., "bank details, earnings, deductions and attendance"
 * → ['employee_info', 'bank', 'earnings', 'deductions', 'attendance']
 */
function parseCreateSections(text) {
  if (!text || !text.trim()) {
    // Default sections
    return ['employee_info', 'earnings', 'deductions'];
  }

  const t = text.toLowerCase();
  const sections = [];

  // Always include employee_info if any employee-related keyword is mentioned, or by default
  if (/employee|personal|emp\b|name|designation|department/i.test(t) || !t.trim()) {
    sections.push('employee_info');
  }
  if (/bank|account|ifsc|payment/i.test(t)) sections.push('bank');
  if (/statut|pan|uan|esi|pf\b|aadh?a|id\s*(?:number|proof|detail)/i.test(t)) sections.push('statutory');
  if (/attend|day|working|present|leave|lop|lwp/i.test(t)) sections.push('attendance');
  if (/earn|salary|income|gross/i.test(t)) sections.push('earnings');
  if (/ded|deduct|tax|pf\s+deduct/i.test(t)) sections.push('deductions');
  if (/net\s*pay/i.test(t)) sections.push('net_pay');

  // If user said "all" or nothing specific was matched, include everything
  if (/\ball\b/i.test(t) || sections.length === 0) {
    return ['employee_info', 'bank', 'statutory', 'attendance', 'earnings', 'deductions'];
  }

  // Always include employee_info if not already there
  if (!sections.includes('employee_info')) {
    sections.unshift('employee_info');
  }

  return sections;
}

function parseCommand(command) {
  // Normalize common verb typos before parsing
  let cmd = command.toLowerCase().trim();
  cmd = cmd.replace(/^love\b/i, 'move');   // "love logo to..." → "move logo to..."
  cmd = cmd.replace(/^mve\b/i, 'move');
  cmd = cmd.replace(/^moev\b/i, 'move');
  const result = { action: null, params: {} };

  // ── Undo / Revert (check first, it's simple) ──
  if (/^(?:undo|revert|go\s*back|roll\s*back|ctrl\s*z)\s*$/i.test(cmd)) {
    result.action = 'undo';
    return result;
  }

  // ── CREATE TEMPLATE: "create a new template", "create salary slip with bank details and earnings" ──
  {
    const createMatch = cmd.match(
      /(?:create|generate|build|make|start)\s+(?:a\s+)?(?:new\s+)?(?:salary\s*(?:slip|template)?|payslip|template|pay\s*slip)(?:\s+(?:with|having|including|that\s+has|containing)\s+(.+?))?$/i
    );
    if (createMatch) {
      const sectionsText = createMatch[1] || '';
      const sections = parseCreateSections(sectionsText);
      result.action = 'create_template';
      result.params = { sections, raw: sectionsText };
      return result;
    }
  }

  // ── Add logo (check early, before add patterns consume it) ──
  if (/(?:add|show|insert|include|put)\s+(?:(?:company|org|organization|organisation)\s+)?logo/i.test(cmd) ||
      /(?:company|org|organization|organisation)\s+logo\s+(?:add|insert|include|show)/i.test(cmd)) {
    result.action = 'add_logo';
    return result;
  }

  // ── Style keywords guard: if the command talks about colors/fonts/widths/heights/padding,
  //    do NOT let rename patterns steal it ──
  const STYLE_GUARD = /(?:background|bg|font[\s-]?(?:size|family)?|text[\s-]?color|width|height|padding|margin|border|color\s+(?:of|to)|wider|narrower|taller|shorter|bigger|smaller|font\s+to\b)/i;

  // ── TARGETED STYLE: color/bg/font/width/height/padding/margin for a specific section ──
  //    Must come before rename to avoid "change X to Y" being misinterpreted
  if (STYLE_GUARD.test(cmd)) {
    // Check simple global font change FIRST: "change font to Arial" (no "of" = no section target)
    if (/(?:change|set|update|make)\s+(?:the\s+)?font\s+(?:to|as)\s+/i.test(cmd) && !/font[\s-]?size/i.test(cmd) && !/\bof\b/i.test(cmd)) {
      const m = cmd.match(/(?:to|as)\s+["']?(.+?)["']?$/i);
      if (m) {
        result.action = 'style';
        result.params = { property: 'font-family', value: m[1].trim() };
        return result;
      }
    }

    // Targeted style FIRST (section-specific width/height/color/padding/border etc.)
    // This catches: "change X of Y to Z", "make Y wider", "set X of Y to Z"
    const targeted = parseTargetedStyle(command);
    if (targeted) return targeted;

    // Global style fallbacks (no section specified)
    if (/font[\s-]?size/i.test(cmd)) {
      const m = cmd.match(/(?:to|as)\s+["']?(.+?)["']?$/i);
      if (m) {
        result.action = 'style';
        result.params = { property: 'font-size', value: m[1].trim() };
        return result;
      }
      // "increase the font size", "decrease font size", "make font size bigger"
      if (/(?:increase|enlarge|bigger|larger|make.*bigger)/i.test(cmd)) {
        result.action = 'style';
        result.params = { property: 'font-size', value: '14px' };
        return result;
      }
      if (/(?:decrease|reduce|smaller|make.*smaller)/i.test(cmd)) {
        result.action = 'style';
        result.params = { property: 'font-size', value: '10px' };
        return result;
      }
    }
    // "increase font" / "make font bigger" without "size" keyword
    if (/(?:increase|make.*bigger|make.*larger)\s+(?:the\s+)?font\b/i.test(cmd) && !/family/i.test(cmd)) {
      result.action = 'style';
      result.params = { property: 'font-size', value: '14px' };
      return result;
    }
    if (/(?:background|bg)\s*color/i.test(cmd)) {
      const m = cmd.match(/(?:to|as)\s+["']?(.+?)["']?$/i);
      if (m) {
        result.action = 'style';
        result.params = { property: 'background-color', value: m[1].trim() };
        return result;
      }
    }
    if (/header.*(?:color|background|bg)/i.test(cmd)) {
      const m = cmd.match(/(?:to|as)\s+["']?(.+?)["']?$/i);
      if (m) {
        result.action = 'style';
        result.params = { property: 'header-background', value: m[1].trim() };
        return result;
      }
    }
    if (/text[\s-]?color/i.test(cmd)) {
      const m = cmd.match(/(?:to|as)\s+["']?(.+?)["']?$/i);
      if (m) {
        result.action = 'style';
        result.params = { property: 'text-color', value: m[1].trim() };
        return result;
      }
    }
    // Add/Remove border (global)
    if (/(?:add|show|enable)\s+(?:full\s+)?borders?/i.test(cmd)) {
      result.action = 'style';
      result.params = { property: 'borders', value: 'add' };
      return result;
    }
    if (/(?:remove|hide|disable)\s+(?:all\s+)?borders?/i.test(cmd)) {
      result.action = 'style';
      result.params = { property: 'borders', value: 'remove' };
      return result;
    }
  }

  // ── BULK ADD: "add all bank details", "add all statutory ids to employee info" ──
  //    Requires "all" keyword to distinguish from single-field add
  {
    const bulkMatch = cmd.match(
      /(?:add|insert|include|show|put)\s+all\s+(?:the\s+)?(?:missing\s+)?(.+?)(?:\s+(?:to|in|into|on)\s+(?:the\s+)?(?:employee\s*(?:info|section|details|panel|area)?|template|payslip|salary\s*slip|my\s+template)(?:\s+(?:section|panel|area))?)?(?:\s+(?:managing|with|balancing)\s+.+)?$/i
    );
    if (bulkMatch) {
      const fieldPhrase = bulkMatch[1].trim()
        .replace(/\s+(?:slugs?|fields?|data|info|information|related\s+(?:slugs?|fields?|data))$/i, '')
        .trim();

      // Check exact match first
      const groupKey = BULK_ALIASES[fieldPhrase] || (BULK_GROUPS[fieldPhrase] ? fieldPhrase : null);
      if (groupKey && BULK_GROUPS[groupKey]) {
        result.action = 'bulk_add';
        result.params = { group: groupKey, fields: BULK_GROUPS[groupKey].fields };
        return result;
      }
      // Try with " details" suffix
      const withDetails = BULK_ALIASES[fieldPhrase + ' details'];
      if (withDetails && BULK_GROUPS[withDetails]) {
        result.action = 'bulk_add';
        result.params = { group: withDetails, fields: BULK_GROUPS[withDetails].fields };
        return result;
      }
      // Partial match only if the phrase is long enough (3+ words) to avoid false positives
      if (fieldPhrase.split(/\s+/).length >= 2) {
        for (const [alias, key] of Object.entries(BULK_ALIASES)) {
          if (fieldPhrase === alias || alias === fieldPhrase) {
            result.action = 'bulk_add';
            result.params = { group: key, fields: BULK_GROUPS[key].fields };
            return result;
          }
        }
      }
    }
  }

  // ── BULK REMOVE: "remove all bank details", "remove all statutory fields" ──
  //    Requires "all" to distinguish from single-field remove
  {
    const bulkRemoveMatch = cmd.match(
      /(?:remove|delete|hide|drop)\s+all\s+(?:the\s+)?(.+?)(?:\s+(?:from|in|of)\s+(?:the\s+)?(?:employee\s*info|template|payslip|salary\s*slip)(?:\s+(?:section|panel|area))?)?$/i
    );
    if (bulkRemoveMatch) {
      const fieldPhrase = bulkRemoveMatch[1].trim()
        .replace(/\s+(?:slugs?|fields?|data|info|information|related\s+(?:slugs?|fields?|data))$/i, '')
        .trim();

      const groupKey = BULK_ALIASES[fieldPhrase] || BULK_ALIASES[fieldPhrase + ' details'] || BULK_GROUPS[fieldPhrase] ? fieldPhrase : null;
      if (groupKey && BULK_GROUPS[groupKey]) {
        result.action = 'bulk_remove';
        result.params = { group: groupKey, fields: BULK_GROUPS[groupKey].fields };
        return result;
      }
      for (const [alias, key] of Object.entries(BULK_ALIASES)) {
        if (fieldPhrase.includes(alias) || alias.includes(fieldPhrase)) {
          result.action = 'bulk_remove';
          result.params = { group: key, fields: BULK_GROUPS[key].fields };
          return result;
        }
      }
    }
  }

  // ── Rename/Change header ── (match on original command to preserve casing)
  const renamePatterns = [
    /(?:rename|change|replace|update)\s+(?:the\s+)?(?:header|heading|label|text|title|column|field)?\s*(?:from\s+)?["']?(.+?)["']?\s+(?:to|with|as|into)\s+["']?(.+?)["']?$/i,
    /(?:rename|change|replace)\s+["'](.+?)["']\s+(?:to|with|as)\s+["'](.+?)["']/i,
  ];
  for (const pat of renamePatterns) {
    const m = command.trim().match(pat);
    if (m) {
      result.action = 'rename';
      result.params = { from: m[1].trim(), to: m[2].trim() };
      return result;
    }
  }

  // ── ADD TO RIGHT/LEFT SIDE of a row ──
  // Handles: "add X to right of Y", "add X right side of Y", "add X in right side to Y",
  //          "add X next to Y", "add X beside Y", "add X on right side of Y row"
  {
    // Right-side patterns
    const rightPatterns = [
      /(?:add|insert|put)\s+(?:the\s+)?(.+?)\s+(?:to\s+)?(?:the\s+)?(?:right\s+(?:side\s+)?(?:of|in|to)|right\s+column\s+(?:of|in))\s+(?:the\s+)?(.+?)(?:\s+(?:row|field|slug))?\s*$/i,
      /(?:add|insert|put)\s+(?:the\s+)?(.+?)\s+(?:in|on)\s+(?:the\s+)?right\s+(?:side\s+)?(?:of|to)\s+(?:the\s+)?(.+?)(?:\s+(?:row|field|slug))?\s*$/i,
      /(?:add|insert|put)\s+(?:the\s+)?(.+?)\s+(?:next\s+to|beside|alongside)\s+(?:the\s+)?(.+?)(?:\s+(?:row|field|slug))?\s*$/i,
    ];
    for (const pat of rightPatterns) {
      const m = cmd.match(pat);
      if (m) {
        result.action = 'add_right';
        result.params = { field: m[1].trim(), targetField: m[2].trim() };
        return result;
      }
    }
    // Left-side patterns
    const leftPatterns = [
      /(?:add|insert|put)\s+(?:the\s+)?(.+?)\s+(?:to\s+)?(?:the\s+)?(?:left\s+(?:side\s+)?(?:of|in|to)|left\s+column\s+(?:of|in))\s+(?:the\s+)?(.+?)(?:\s+(?:row|field|slug))?\s*$/i,
      /(?:add|insert|put)\s+(?:the\s+)?(.+?)\s+(?:in|on)\s+(?:the\s+)?left\s+(?:side\s+)?(?:of|to)\s+(?:the\s+)?(.+?)(?:\s+(?:row|field|slug))?\s*$/i,
    ];
    for (const pat of leftPatterns) {
      const m = cmd.match(pat);
      if (m) {
        result.action = 'add_left';
        result.params = { field: m[1].trim(), targetField: m[2].trim() };
        return result;
      }
    }
  }

  // ── Add field with positional reference (above/below/before/after) ──
  //    Also supports "right side" qualifier: "add X below Y on right side"
  const POSITION_BELOW = /(?:below|after|under)/i;
  const POSITION_ABOVE = /(?:above|before|on\s+top\s+of|top\s+of|over)/i;
  const POSITION_ANY = /(?:below|after|under|above|before|on\s+top\s+of|top\s+of|over)/i;

  function detectDirection(text) {
    if (POSITION_ABOVE.test(text)) return 'before';
    return 'after';
  }

  function detectSide(text) {
    if (/(?:right\s*(?:side|column|cell)?|second\s*(?:row|column|pair|slot))/i.test(text)) return 'right';
    if (/(?:left\s*(?:side|column|cell)?|first\s*(?:row|column|pair|slot))/i.test(text)) return 'left';
    return null; // default: create new row
  }

  // With custom title: "add 'Custom Title' as <slug> below <field>"
  const addPositionWithTitlePatterns = [
    new RegExp(
      `(?:add|insert|include|show|put)\\s+(?:the\\s+)?(?:a\\s+)?["'](.+?)["']\\s+(?:as|for|with)\\s+(.+?)\\s+(?:slug\\s+)?(?:${POSITION_ANY.source})\\s+(?:the\\s+)?(?:to\\s+)?(?:the\\s+)?(.+?)(?:\\s+(?:slug|field|row|label|with\\s+same\\s+format|in\\s+the\\s+.+?))?\\s*$`, 'i'
    ),
    new RegExp(
      `(?:add|insert|include|show|put)\\s+(?:the\\s+)?(?:a\\s+)?(.+?)\\s+(\\w+)\\s+slug\\s+(?:${POSITION_ANY.source})\\s+(?:the\\s+)?(?:to\\s+)?(?:the\\s+)?(.+?)(?:\\s+(?:field|row|label|with\\s+same\\s+format))?\\s*$`, 'i'
    ),
  ];
  for (const pat of addPositionWithTitlePatterns) {
    const m = command.trim().match(pat);
    if (m) {
      const dir = detectDirection(command);
      result.action = dir === 'before' ? 'add_before' : 'add_after';
      result.params = { title: m[1].trim(), field: m[2].trim(), afterField: m[3].trim() };
      return result;
    }
  }

  // Handle "add X in SECTION below/above Y" — section-targeted positional add
  {
    const sectionPosMatch = cmd.match(
      /(?:add|insert|include|show|put)\s+(?:the\s+)?(?:a\s+)?(.+?)\s+(?:in|to|into)\s+(?:the\s+)?(.+?)\s+(?:section\s+)?(?:below|after|under|above|before)\s+(?:the\s+)?(?:to\s+)?(.+?)$/i
    );
    if (sectionPosMatch) {
      const fieldName = sectionPosMatch[1].trim();
      const sectionName = sectionPosMatch[2].trim();
      const targetField = sectionPosMatch[3].trim();
      const dir = detectDirection(cmd);
      const section = detectSection(sectionName);
      // If section is earnings/deductions, route to section add
      if (section === 'earnings' || section === 'deductions') {
        result.action = 'add';
        result.params = { field: fieldName, section };
        return result;
      }
      result.action = dir === 'before' ? 'add_before' : 'add_after';
      result.params = { field: fieldName, afterField: targetField };
      return result;
    }
  }

  // Simple positional: "add department below designation", "add LOP above present days"
  // Also: "add LOP below present days on right side"
  const addPositionPatterns = [
    new RegExp(
      `(?:add|insert|include|show|put)\\s+(?:the\\s+)?(?:a\\s+)?(.+?)\\s+(?:slug\\s+)?(?:${POSITION_ANY.source})\\s+(?:the\\s+)?(?:to\\s+)?(?:the\\s+)?(.+?)(?:\\s+(?:slug|field|row|label|in\\s+the\\s+.+?|with\\s+same\\s+format))?(?:\\s+(?:on\\s+)?(?:right|left)\\s*(?:side|column)?)?\\s*$`, 'i'
    ),
  ];
  for (const pat of addPositionPatterns) {
    const m = cmd.match(pat);
    if (m) {
      const dir = detectDirection(cmd);
      const side = detectSide(cmd);
      if (side === 'right') {
        result.action = 'add_right';
        result.params = { field: m[1].trim(), targetField: m[2].trim() };
        return result;
      }
      result.action = dir === 'before' ? 'add_before' : 'add_after';
      result.params = { field: m[1].trim(), afterField: m[2].trim() };
      return result;
    }
  }

  // ── Add at the top / in the top ──
  {
    const topMatch = command.trim().match(/(?:add|insert|include|show|put)\s+(?:the\s+)?(.+?)\s+(?:at|in|on|to)\s+(?:the\s+)?top\s*$/i);
    if (topMatch) {
      result.action = 'add_top';
      result.params = { field: topMatch[1].trim() };
      return result;
    }
  }

  // ── Hide/Show section (check BEFORE add patterns, since "show" overlaps with add keywords) ──
  {
    const hideMatch = cmd.match(/(?:hide|collapse|minimize)\s+(?:the\s+)?(.+?)(?:\s+(?:section|table|panel|area))?\s*$/i);
    if (hideMatch) {
      const sec = detectSection(hideMatch[1].trim());
      if (sec) {
        result.action = 'hide_section';
        result.params = { section: hideMatch[1].trim() };
        return result;
      }
    }
    const showMatch = cmd.match(/(?:show|unhide|expand|restore|bring\s*back|display|enable)\s+(?:the\s+)?(.+?)(?:\s+(?:section|table|panel|area))?\s*$/i);
    if (showMatch) {
      const sec = detectSection(showMatch[1].trim());
      if (sec) {
        result.action = 'show_section';
        result.params = { section: showMatch[1].trim() };
        return result;
      }
    }
  }

  // ── Add a field/section with custom title ──
  const addWithTitlePatterns = [
    /(?:add|insert|include|show|put)\s+(?:the\s+)?(?:a\s+)?["'](.+?)["']\s+(?:as|for|with)\s+(.+?)\s+(?:in|to|into|on|under)\s+(?:the\s+)?(.+?)(?:\s+(?:section|tab|panel|part|table|area))?\s*$/i,
  ];
  for (const pat of addWithTitlePatterns) {
    const m = command.trim().match(pat);
    if (m) {
      result.action = 'add';
      const section = m[3] ? detectSection(m[3].trim()) : null;
      result.params = { title: m[1].trim(), field: m[2].trim(), section };
      return result;
    }
  }

  // ── Add a field/section (with optional target section) ──
  const addPatterns = [
    /(?:add|insert|include|show|put)\s+(?:the\s+)?(?:a\s+)?(.+?)\s+(?:head|field|column|row|slug|data)?\s*(?:in|to|into|on|under)\s+(?:the\s+)?(.+?)(?:\s+(?:section|tab|panel|part|table|area))?(?:\s+(?:of|in)\s+(?:the\s+)?(?:salary\s*slip|payslip|template))?\s*$/i,
    /(?:add|insert|include|show|put)\s+(?:the\s+)?(?:a\s+)?(.+?)\s+(?:in|to|into|on|under)\s+(?:the\s+)?(.+?)(?:\s+(?:section|tab|panel|part|table|area))?\s*$/i,
    /(?:add|insert|include|show|put)\s+(?:the\s+)?(?:a\s+)?(.+?)(?:\s+(?:field|column|section|row|data|info|details|slug))?(?:\s+(?:in|to|on|into)\s*(?:the\s+)?(?:salary\s*slip|payslip|template))?\s*$/i,
  ];
  for (const pat of addPatterns) {
    const m = cmd.match(pat);
    if (m) {
      result.action = 'add';
      const section = m[2] ? detectSection(m[2].trim()) : null;
      result.params = { field: m[1].trim(), section };
      return result;
    }
  }

  // ── Remove a field/section (with optional target section) ──
  const removePatterns = [
    /(?:remove|delete|drop)\s+(?:the\s+)?(.+?)\s+(?:from|in|of)\s+(?:the\s+)?(.+?)(?:\s+(?:section|tab|panel|part|table|area))?\s*$/i,
    /(?:remove|delete|drop)\s+(?:the\s+)?(.+?)(?:\s+(?:field|column|section|row|data|from)\s*(?:the\s+)?(?:salary\s*slip|payslip|template)?)?\s*$/i,
  ];
  for (const pat of removePatterns) {
    const m = cmd.match(pat);
    if (m) {
      result.action = 'remove';
      const section = m[2] ? detectSection(m[2].trim()) : null;
      result.params = { field: m[1].trim(), section };
      return result;
    }
  }

  // ── Swap / Move fields ──
  {
    const swapMatch = cmd.match(/(?:swap|switch|exchange)\s+(?:the\s+)?["']?(.+?)["']?\s+(?:and|with)\s+(?:the\s+)?["']?(.+?)["']?\s*$/i);
    if (swapMatch) {
      result.action = 'swap';
      result.params = { field1: swapMatch[1].trim(), field2: swapMatch[2].trim() };
      return result;
    }
  }

  // ── Move field to position ──
  {
    const moveMatch = cmd.match(/(?:move|shift)\s+(?:the\s+)?["']?(.+?)["']?\s+(?:to\s+)?(?:above|before)\s+(?:the\s+)?["']?(.+?)["']?\s*$/i);
    if (moveMatch) {
      result.action = 'move';
      result.params = { field: moveMatch[1].trim(), target: moveMatch[2].trim(), position: 'before' };
      return result;
    }
    const moveAfter = cmd.match(/(?:move|shift)\s+(?:the\s+)?["']?(.+?)["']?\s+(?:to\s+)?(?:below|after)\s+(?:the\s+)?["']?(.+?)["']?\s*$/i);
    if (moveAfter) {
      result.action = 'move';
      result.params = { field: moveAfter[1].trim(), target: moveAfter[2].trim(), position: 'after' };
      return result;
    }
  }

  // ── Move field to left/right column ──
  {
    const moveColMatch = cmd.match(
      /(?:move|shift|put|place)\s+(?:the\s+)?["']?(.+?)["']?\s+(?:to\s+(?:the\s+)?|on\s+(?:the\s+)?|in\s+(?:the\s+)?)(left|right)(?:\s+(?:side|column|col))?\s*$/i
    );
    if (moveColMatch) {
      result.action = 'move_to_column';
      result.params = { field: moveColMatch[1].trim(), direction: moveColMatch[2].toLowerCase() };
      return result;
    }
  }

  // ── Duplicate row ──
  {
    const dupMatch = cmd.match(/(?:duplicate|copy|clone|repeat)\s+(?:the\s+)?["']?(.+?)["']?\s*(?:row|field)?\s*$/i);
    if (dupMatch) {
      result.action = 'duplicate_row';
      result.params = { field: dupMatch[1].trim() };
      return result;
    }
  }

  // ── Set colspan / merge cells ──
  {
    const colspanMatch = cmd.match(/(?:merge|colspan|span)\s+(?:the\s+)?(.+?)(?:\s+(?:to|across))\s+(\d+)\s*(?:columns?|cols?)?\s*$/i);
    if (colspanMatch) {
      result.action = 'colspan';
      result.params = { field: colspanMatch[1].trim(), span: parseInt(colspanMatch[2]) };
      return result;
    }
  }

  // ── Align text ──
  {
    const alignMatch = cmd.match(/(?:align|set\s+alignment)\s+(?:the\s+)?(.+?)\s+(?:to\s+)?(?:the\s+)?(left|right|center|centre|justify)\s*$/i);
    if (alignMatch) {
      result.action = 'align';
      result.params = { target: alignMatch[1].trim(), alignment: alignMatch[2].trim().replace('centre', 'center') };
      return result;
    }
    // "center align the header", "right align earnings"
    const alignMatch2 = cmd.match(/(left|right|center|centre|justify)\s+align\s+(?:the\s+)?(.+?)\s*$/i);
    if (alignMatch2) {
      result.action = 'align';
      result.params = { target: alignMatch2[2].trim(), alignment: alignMatch2[1].trim().replace('centre', 'center') };
      return result;
    }
  }

  // ── Bold / Unbold text ──
  {
    const boldMatch = cmd.match(/(?:make|set)\s+(?:the\s+)?(.+?)\s+(?:text\s+)?bold\s*$/i);
    if (boldMatch) {
      result.action = 'bold';
      result.params = { target: boldMatch[1].trim() };
      return result;
    }
    if (/^bold\s+(?:the\s+)?(.+)/i.test(cmd)) {
      const m = cmd.match(/^bold\s+(?:the\s+)?(.+)/i);
      result.action = 'bold';
      result.params = { target: m[1].trim() };
      return result;
    }
  }

  // ── Set orientation (portrait/landscape) ──
  {
    const orientMatch = cmd.match(/(?:set|change|switch|make|turn)\s+(?:the\s+)?(?:page\s+|template\s+|slip\s+)?(?:orientation|layout)\s+(?:to\s+)?(portrait|landscape)/i) ||
      cmd.match(/(?:make|set|change|switch)\s+(?:it\s+|the\s+)?(?:template\s+|page\s+|slip\s+)?(portrait|landscape)/i) ||
      cmd.match(/(?:change|switch)\s+to\s+(portrait|landscape)/i);
    if (orientMatch) {
      result.action = 'set_orientation';
      result.params = { orientation: (orientMatch[1] || orientMatch[2]).toLowerCase() };
      return result;
    }
  }

  // ── Set preset page size (A4/A3/Letter) ──
  {
    const presetMatch = cmd.match(/(?:set|change|make)\s+(?:the\s+)?(?:page\s+|template\s+|slip\s+)?(?:size|format)\s+(?:to\s+)?(a4|a3|letter|legal)/i) ||
      cmd.match(/(?:make|set)\s+(?:it\s+)?(a4|a3|letter|legal)\s*(?:size|format)?/i);
    if (presetMatch) {
      result.action = 'set_preset_size';
      result.params = { preset: presetMatch[1].toUpperCase() };
      return result;
    }
  }

  // ── Logo size/position ──
  {
    const logoSizeMatch = cmd.match(/(?:set|change|make|resize)\s+(?:the\s+)?(?:company\s+)?logo\s+(?:size\s+)?(?:to\s+)?(\d+)\s*(?:px)?\s*$/i) ||
      cmd.match(/(?:make|set)\s+(?:the\s+)?(?:company\s+)?logo\s+(?:bigger|larger|smaller|(?:\d+\s*(?:px)?))/i);
    if (logoSizeMatch) {
      const sizeStr = logoSizeMatch[0];
      const sizeNum = sizeStr.match(/(\d+)/);
      let size = sizeNum ? parseInt(sizeNum[1]) : null;
      if (!size) {
        if (/bigger|larger/i.test(sizeStr)) size = 120;
        else if (/smaller/i.test(sizeStr)) size = 60;
      }
      if (size) {
        result.action = 'logo_size';
        result.params = { size };
        return result;
      }
    }
    const logoPosMatch = cmd.match(/(?:move|set|place|put|position)\s+(?:the\s+)?(?:company\s+)?logo\s+(?:to\s+)?(?:the\s+)?(left|right|center|centre|middle)/i) ||
      cmd.match(/(left|right|center|centre|middle)\s+align\s+(?:the\s+)?(?:company\s+)?logo/i);
    if (logoPosMatch) {
      result.action = 'logo_position';
      result.params = { position: logoPosMatch[1].replace('centre', 'center').replace('middle', 'center').toLowerCase() };
      return result;
    }
  }

  // ── Change section label/title text ──
  {
    const labelMatch = cmd.match(/(?:change|set|update|rename)\s+(?:the\s+)?(.+?)\s+(?:section\s+)?(?:label|title|heading|header\s*text)\s+(?:to|as)\s+["']?(.+?)["']?\s*$/i) ||
      cmd.match(/(?:change|set|update|rename)\s+(?:the\s+)?(?:label|title|heading)\s+(?:of\s+)?(?:the\s+)?(.+?)\s+(?:section\s+)?(?:to|as)\s+["']?(.+?)["']?\s*$/i);
    if (labelMatch) {
      const section = detectSection(labelMatch[1].trim());
      if (section) {
        result.action = 'set_label';
        result.params = { section: labelMatch[1].trim(), label: labelMatch[2].trim() };
        return result;
      }
    }
  }

  // ── Set column count ──
  {
    const colMatch = cmd.match(/(?:set|change|make)\s+(?:the\s+)?(?:employee\s*(?:info|information|details)?\s+)?(?:columns?|cols?)\s+(?:to\s+)?(\d+)/i) ||
      cmd.match(/(?:show|display|use)\s+(\d+)\s+columns?\s+(?:in|for)\s+(?:the\s+)?(?:employee\s*(?:info|information|details)?)/i);
    if (colMatch) {
      result.action = 'set_columns';
      result.params = { columns: parseInt(colMatch[1]) };
      return result;
    }
  }

  // ── Template status (activate/deactivate) ──
  {
    const statusMatch = cmd.match(/(?:activate|enable|publish)\s+(?:this\s+|the\s+)?template/i);
    if (statusMatch) {
      result.action = 'set_status';
      result.params = { status: 1 };
      return result;
    }
    const deactivateMatch = cmd.match(/(?:deactivate|disable|unpublish|draft)\s+(?:this\s+|the\s+)?template/i);
    if (deactivateMatch) {
      result.action = 'set_status';
      result.params = { status: 0 };
      return result;
    }
  }

  // ── Reset template ──
  {
    if (/(?:reset|restore)\s+(?:this\s+|the\s+)?template\s*(?:to\s+default)?/i.test(cmd)) {
      result.action = 'reset_template';
      return result;
    }
  }

  // ── Generic fallback ──
  result.action = 'unknown';
  result.params = { raw: command };
  return result;
}

// ═══════════════════════════════════════════════════════════════════
// TARGETED STYLE PARSER — handles "change X of Y section to Z"
// ═══════════════════════════════════════════════════════════════════

function parseTargetedStyle(command) {
  const cmd = command.toLowerCase().trim();
  const result = { action: null, params: {} };

  // ── Width changes: "increase width of earnings", "set width of employee info to 100%",
  //    "make earnings table wider", "reduce width of deductions" ──
  {
    // "set/change width of <section> to <value>"
    const widthSet = cmd.match(
      /(?:set|change|update|make)\s+(?:the\s+)?width\s+(?:of\s+)?(?:the\s+)?(.+?)\s+(?:to|as|=)\s+["']?(.+?)["']?\s*$/i
    );
    if (widthSet) {
      result.action = 'targeted_style';
      result.params = { target: widthSet[1].trim(), property: 'width', value: widthSet[2].trim() };
      return result;
    }
    // "<section> width to <value>"
    const widthSet2 = cmd.match(
      /(?:the\s+)?(.+?)\s+width\s+(?:to|as|=)\s+["']?(.+?)["']?\s*$/i
    );
    if (widthSet2) {
      result.action = 'targeted_style';
      result.params = { target: widthSet2[1].trim(), property: 'width', value: widthSet2[2].trim() };
      return result;
    }
    // "increase/decrease width of <section>"
    const widthChange = cmd.match(
      /(?:increase|enlarge|expand|widen|grow)\s+(?:the\s+)?width\s+(?:of\s+)?(?:the\s+)?(.+?)(?:\s+(?:by|to)\s+(.+?))?\s*$/i
    );
    if (widthChange) {
      result.action = 'targeted_style';
      result.params = { target: widthChange[1].trim(), property: 'width', value: widthChange[2] || '+10%', direction: 'increase' };
      return result;
    }
    const widthDecrease = cmd.match(
      /(?:decrease|reduce|shrink|narrow|compress)\s+(?:the\s+)?width\s+(?:of\s+)?(?:the\s+)?(.+?)(?:\s+(?:by|to)\s+(.+?))?\s*$/i
    );
    if (widthDecrease) {
      result.action = 'targeted_style';
      result.params = { target: widthDecrease[1].trim(), property: 'width', value: widthDecrease[2] || '-10%', direction: 'decrease' };
      return result;
    }
    // "make <section> wider/narrower"
    const widthMake = cmd.match(
      /make\s+(?:the\s+)?(.+?)\s+(wider|narrower|bigger|smaller)\s*$/i
    );
    if (widthMake) {
      const dir = (widthMake[2] === 'wider' || widthMake[2] === 'bigger') ? 'increase' : 'decrease';
      result.action = 'targeted_style';
      result.params = { target: widthMake[1].trim(), property: 'width', value: dir === 'increase' ? '+10%' : '-10%', direction: dir };
      return result;
    }
  }

  // ── Height changes: "increase height of <section>", "set height of header to 50px" ──
  {
    const heightSet = cmd.match(
      /(?:set|change|update|make)\s+(?:the\s+)?height\s+(?:of\s+)?(?:the\s+)?(.+?)\s+(?:to|as|=)\s+["']?(.+?)["']?\s*$/i
    );
    if (heightSet) {
      result.action = 'targeted_style';
      result.params = { target: heightSet[1].trim(), property: 'height', value: heightSet[2].trim() };
      return result;
    }
    const heightChange = cmd.match(
      /(?:increase|enlarge|expand|grow)\s+(?:the\s+)?height\s+(?:of\s+)?(?:the\s+)?(.+?)(?:\s+(?:by|to)\s+(.+?))?\s*$/i
    );
    if (heightChange) {
      result.action = 'targeted_style';
      result.params = { target: heightChange[1].trim(), property: 'height', value: heightChange[2] || '+20px', direction: 'increase' };
      return result;
    }
    const heightDecrease = cmd.match(
      /(?:decrease|reduce|shrink|compress)\s+(?:the\s+)?height\s+(?:of\s+)?(?:the\s+)?(.+?)(?:\s+(?:by|to)\s+(.+?))?\s*$/i
    );
    if (heightDecrease) {
      result.action = 'targeted_style';
      result.params = { target: heightDecrease[1].trim(), property: 'height', value: heightDecrease[2] || '-20px', direction: 'decrease' };
      return result;
    }
    const heightMake = cmd.match(
      /make\s+(?:the\s+)?(.+?)\s+(taller|shorter)\s*$/i
    );
    if (heightMake) {
      const dir = heightMake[2] === 'taller' ? 'increase' : 'decrease';
      result.action = 'targeted_style';
      result.params = { target: heightMake[1].trim(), property: 'height', value: dir === 'increase' ? '+20px' : '-20px', direction: dir };
      return result;
    }
  }

  // ── Padding changes: "increase padding of <section>", "set padding to 10px" ──
  {
    const paddingSet = cmd.match(
      /(?:set|change|update)\s+(?:the\s+)?padding\s+(?:of\s+)?(?:the\s+)?(.+?)\s+(?:to|as)\s+["']?(.+?)["']?\s*$/i
    );
    if (paddingSet) {
      result.action = 'targeted_style';
      result.params = { target: paddingSet[1].trim(), property: 'padding', value: paddingSet[2].trim() };
      return result;
    }
    const paddingChange = cmd.match(
      /(?:increase|add\s+more|enlarge)\s+(?:the\s+)?padding\s+(?:of\s+)?(?:the\s+)?(.+?)(?:\s+(?:by|to)\s+(.+?))?\s*$/i
    );
    if (paddingChange) {
      result.action = 'targeted_style';
      result.params = { target: paddingChange[1].trim(), property: 'padding', value: paddingChange[2] || '15px' };
      return result;
    }
    const paddingReduce = cmd.match(
      /(?:decrease|reduce|remove)\s+(?:the\s+)?padding\s+(?:of\s+)?(?:the\s+)?(.+?)(?:\s+(?:by|to)\s+(.+?))?\s*$/i
    );
    if (paddingReduce) {
      result.action = 'targeted_style';
      result.params = { target: paddingReduce[1].trim(), property: 'padding', value: paddingReduce[2] || '2px' };
      return result;
    }
    // Global padding: "set padding to 10px"
    const globalPadding = cmd.match(/(?:set|change)\s+(?:the\s+)?padding\s+(?:to|as)\s+["']?(.+?)["']?\s*$/i);
    if (globalPadding) {
      result.action = 'targeted_style';
      result.params = { target: 'template', property: 'padding', value: globalPadding[1].trim() };
      return result;
    }
  }

  // ── Margin changes ──
  {
    const marginSet = cmd.match(
      /(?:set|change|update)\s+(?:the\s+)?margin\s+(?:of\s+)?(?:the\s+)?(.+?)\s+(?:to|as)\s+["']?(.+?)["']?\s*$/i
    );
    if (marginSet) {
      result.action = 'targeted_style';
      result.params = { target: marginSet[1].trim(), property: 'margin', value: marginSet[2].trim() };
      return result;
    }
  }

  // ── Targeted color: "change color of earnings header to blue",
  //    "change employee info background to light blue",
  //    "make the header text red" ──
  {
    // "change/set <property> of <section> to <color>"
    const colorOfSection = cmd.match(
      /(?:change|set|update|make)\s+(?:the\s+)?(?:(background|bg|text|font|header|border)\s+)?(?:color\s+)?(?:of\s+)?(?:the\s+)?(.+?)\s+(?:section\s+|table\s+|panel\s+|area\s+)?(?:to|as|=)\s+["']?(.+?)["']?\s*$/i
    );
    if (colorOfSection) {
      const prop = colorOfSection[1] || 'background';
      const target = colorOfSection[2].trim();
      const color = resolveColor(colorOfSection[3].trim());

      let cssProperty;
      if (/bg|background/i.test(prop)) cssProperty = 'background-color';
      else if (/text|font/i.test(prop)) cssProperty = 'color';
      else if (/border/i.test(prop)) cssProperty = 'border-color';
      else if (/header/i.test(prop)) cssProperty = 'header-background';
      else cssProperty = 'background-color';

      result.action = 'targeted_style';
      result.params = { target, property: cssProperty, value: color };
      return result;
    }

    // "make <section> background <color>"
    const makeBg = cmd.match(
      /make\s+(?:the\s+)?(.+?)\s+(?:background|bg)\s+["']?(.+?)["']?\s*$/i
    );
    if (makeBg) {
      result.action = 'targeted_style';
      result.params = { target: makeBg[1].trim(), property: 'background-color', value: resolveColor(makeBg[2].trim()) };
      return result;
    }

    // "make <section> text <color>"
    const makeText = cmd.match(
      /make\s+(?:the\s+)?(.+?)\s+(?:text|font)\s+(?:color\s+)?["']?(.+?)["']?\s*$/i
    );
    if (makeText) {
      result.action = 'targeted_style';
      result.params = { target: makeText[1].trim(), property: 'color', value: resolveColor(makeText[2].trim()) };
      return result;
    }

    // "<section> color to <color>"
    const sectionColor = cmd.match(
      /(?:the\s+)?(.+?)\s+(?:background\s+)?color\s+(?:to|as|=)\s+["']?(.+?)["']?\s*$/i
    );
    if (sectionColor && !/^(?:change|set|update|make)/i.test(cmd)) {
      result.action = 'targeted_style';
      result.params = { target: sectionColor[1].trim(), property: 'background-color', value: resolveColor(sectionColor[2].trim()) };
      return result;
    }
  }

  // ── Font size for section: "increase font size of earnings", "make header text bigger" ──
  {
    const fontSizeOf = cmd.match(
      /(?:set|change|update)\s+(?:the\s+)?(?:font[\s-]?size)\s+(?:of\s+)?(?:the\s+)?(.+?)\s+(?:to|as)\s+["']?(.+?)["']?\s*$/i
    );
    if (fontSizeOf) {
      result.action = 'targeted_style';
      result.params = { target: fontSizeOf[1].trim(), property: 'font-size', value: fontSizeOf[2].trim() };
      return result;
    }
    const fontSizeIncrease = cmd.match(
      /(?:increase|enlarge|make\s+bigger)\s+(?:the\s+)?(?:font[\s-]?size)\s+(?:of\s+)?(?:the\s+)?(.+?)(?:\s+(?:by|to)\s+(.+?))?\s*$/i
    );
    if (fontSizeIncrease) {
      result.action = 'targeted_style';
      result.params = { target: fontSizeIncrease[1].trim(), property: 'font-size', value: fontSizeIncrease[2] || '+2px', direction: 'increase' };
      return result;
    }
    const fontSizeDecrease = cmd.match(
      /(?:decrease|reduce|make\s+smaller)\s+(?:the\s+)?(?:font[\s-]?size)\s+(?:of\s+)?(?:the\s+)?(.+?)(?:\s+(?:by|to)\s+(.+?))?\s*$/i
    );
    if (fontSizeDecrease) {
      result.action = 'targeted_style';
      result.params = { target: fontSizeDecrease[1].trim(), property: 'font-size', value: fontSizeDecrease[2] || '-2px', direction: 'decrease' };
      return result;
    }
  }

  // ── Border for section: "add border to earnings", "remove border from employee info" ──
  {
    const addBorderTo = cmd.match(
      /(?:add|show|enable)\s+(?:a\s+)?(?:full\s+)?border(?:s)?\s+(?:to|on|for|around)\s+(?:the\s+)?(.+?)(?:\s+(?:section|table|panel|area))?\s*$/i
    );
    if (addBorderTo) {
      result.action = 'targeted_style';
      result.params = { target: addBorderTo[1].trim(), property: 'border', value: '1px solid lightgray' };
      return result;
    }
    const removeBorderFrom = cmd.match(
      /(?:remove|hide|disable)\s+(?:all\s+)?border(?:s)?\s+(?:from|of|on)\s+(?:the\s+)?(.+?)(?:\s+(?:section|table|panel|area))?\s*$/i
    );
    if (removeBorderFrom) {
      result.action = 'targeted_style';
      result.params = { target: removeBorderFrom[1].trim(), property: 'border', value: 'none' };
      return result;
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════
// COMMAND EXECUTOR — routes parsed commands to the right handler
// ═══════════════════════════════════════════════════════════════════

function applyCommand(templateHtml, parsedCommand) {
  const { action, params } = parsedCommand;

  switch (action) {
    case 'rename':
      return applyRename(templateHtml, params.from, params.to);
    case 'add':
      return applyAdd(templateHtml, params.field, params.section, params.title);
    case 'add_after':
      return applyAddAfter(templateHtml, params.field, params.afterField, params.title);
    case 'add_before':
      return applyAddBefore(templateHtml, params.field, params.afterField, params.title);
    case 'add_right':
      return applyAddToSide(templateHtml, params.field, params.targetField, 'right');
    case 'add_left':
      return applyAddToSide(templateHtml, params.field, params.targetField, 'left');
    case 'remove':
      return applyRemove(templateHtml, params.field, params.section);
    case 'style':
      return applyStyle(templateHtml, params.property, params.value);
    case 'add_top':
      return applyAddTop(templateHtml, params.field);
    case 'add_logo':
      return applyAddLogo(templateHtml);
    case 'create_template':
      return { action: 'create_template', sections: params.sections, description: `Creating new template with: ${params.sections.join(', ')}` };
    case 'bulk_add':
      return applyBulkAdd(templateHtml, params.group, params.fields);
    case 'bulk_remove':
      return applyBulkRemove(templateHtml, params.group, params.fields);
    case 'targeted_style':
      return applyTargetedStyle(templateHtml, params.target, params.property, params.value, params.direction);
    case 'swap':
      return applySwap(templateHtml, params.field1, params.field2);
    case 'move':
      return applyMove(templateHtml, params.field, params.target, params.position);
    case 'move_to_column':
      return applyMoveToColumn(templateHtml, params.field, params.direction);
    case 'duplicate_row':
      return applyDuplicateRow(templateHtml, params.field);
    case 'align':
      return applyAlign(templateHtml, params.target, params.alignment);
    case 'bold':
      return applyBold(templateHtml, params.target);
    case 'hide_section':
      return applyHideSection(templateHtml, params.section);
    case 'show_section':
      return applyShowSection(templateHtml, params.section);
    case 'set_orientation':
      return applySetOrientation(templateHtml, params.orientation);
    case 'set_preset_size':
      return applySetPresetSize(templateHtml, params.preset);
    case 'logo_size':
      return applyLogoSize(templateHtml, params.size);
    case 'logo_position':
      return applyLogoPosition(templateHtml, params.position);
    case 'set_label':
      return applySetLabel(templateHtml, params.section, params.label);
    case 'set_columns':
      return applySetColumns(templateHtml, params.columns);
    case 'set_status':
      return { action: 'set_status', status: params.status, description: `Template status set to ${params.status === 1 ? 'active' : 'inactive'}` };
    case 'reset_template':
      return { action: 'reset_template', description: 'Template will be reset to default' };
    case 'colspan':
      return applyColspan(templateHtml, params.field, params.span);
    case 'undo':
      return { error: 'undo_request' };
    default:
      return { action: 'claude_fallback', raw: params.raw };
  }
}

// ═══════════════════════════════════════════════════════════════════
// ACTION HANDLERS
// ═══════════════════════════════════════════════════════════════════

function applyRename(html, from, to) {
  const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escaped, 'gi');
  const count = (html.match(regex) || []).length;
  if (count === 0) {
    return { error: `Could not find "${from}" in the template. Please check the exact text.` };
  }
  const newHtml = html.replace(regex, to);
  return { html: newHtml, description: `Renamed "${from}" to "${to}" (${count} occurrence${count > 1 ? 's' : ''})` };
}

// ── BULK ADD: adds all fields from a category group to the employee info panel ──
function applyBulkAdd(html, groupName, fields) {
  const group = BULK_GROUPS[groupName];
  if (!group || !fields || fields.length === 0) {
    return { error: `No fields found for group "${groupName}".` };
  }

  // Filter out fields that already exist in the template
  const fieldsToAdd = fields.filter(f => {
    const slugEscaped = f.slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return !new RegExp(slugEscaped, 'i').test(html);
  });

  if (fieldsToAdd.length === 0) {
    return { html, description: `All ${groupName} fields are already present in the template.` };
  }

  // Find existing info row format to clone
  const infoRow = findExistingInfoRow(html);
  let newRows = '';

  if (infoRow) {
    // For 4-column layout, pair fields two per row
    const cells = infoRow.match(/<td[^>]*>[\s\S]*?<\/td>/gi);
    if (cells && cells.length === 4) {
      // Pair fields: [Label1][Value1][Label2][Value2]
      for (let i = 0; i < fieldsToAdd.length; i += 2) {
        let row = infoRow;
        row = replaceCellContent(row, cells[0], fieldsToAdd[i].label);
        row = replaceCellContent(row, cells[1], fieldsToAdd[i].slug);
        if (i + 1 < fieldsToAdd.length) {
          row = replaceCellContent(row, cells[2], fieldsToAdd[i + 1].label);
          row = replaceCellContent(row, cells[3], fieldsToAdd[i + 1].slug);
        } else {
          row = replaceCellContent(row, cells[2], '');
          row = replaceCellContent(row, cells[3], '');
        }
        newRows += '\n' + row;
      }
    } else {
      // 2-column or other layout: check for dual nested table structure first
      const dualPoints = findDualNestedTableInsertPoints(html);
      if (dualPoints) {
        const [left, right] = dualPoints;
        const gap = right.rowCount - left.rowCount; // positive = right has more rows

        const leftFields = [];
        const rightFields = [];
        const remaining = [...fieldsToAdd];

        // Fill the shorter table first, then alternate
        if (gap > 0) {
          leftFields.push(...remaining.splice(0, Math.min(gap, remaining.length)));
        } else if (gap < 0) {
          rightFields.push(...remaining.splice(0, Math.min(-gap, remaining.length)));
        }
        remaining.forEach((f, i) => {
          if (i % 2 === 0) leftFields.push(f);
          else rightFields.push(f);
        });

        const buildRows = (fields) =>
          fields.map(f => buildInfoRowFromTemplate(infoRow, f.label, f.slug)).join('');

        // Insert right rows first (higher offset), then left (to keep offsets valid)
        let newHtml = html;
        if (rightFields.length > 0) {
          const rightRowsHtml = buildRows(rightFields);
          newHtml = newHtml.slice(0, right.insertPoint) + rightRowsHtml + newHtml.slice(right.insertPoint);
        }
        if (leftFields.length > 0) {
          const leftRowsHtml = buildRows(leftFields);
          newHtml = newHtml.slice(0, left.insertPoint) + leftRowsHtml + newHtml.slice(left.insertPoint);
        }

        return {
          html: autoBalanceDualNestedTables(newHtml),
          description: `Added ${fieldsToAdd.length} ${groupName} field${fieldsToAdd.length > 1 ? 's' : ''} to employee info: ${fieldsToAdd.map(f => f.label).join(', ')}`,
        };
      }
      // Single-table fallback: one field per row
      for (const f of fieldsToAdd) {
        newRows += '\n' + buildInfoRowFromTemplate(infoRow, f.label, f.slug);
      }
    }
  } else {
    // Fallback: generate simple rows
    for (let i = 0; i < fieldsToAdd.length; i += 2) {
      let row = `\n        <tr class="with-border">\n            <td class="no-right-border"><strong>${fieldsToAdd[i].label}</strong></td>\n            <td class="no-right-border1">${fieldsToAdd[i].slug}</td>`;
      if (i + 1 < fieldsToAdd.length) {
        row += `\n            <td class="no-right-border"><strong>${fieldsToAdd[i + 1].label}</strong></td>\n            <td class="border-collapse">${fieldsToAdd[i + 1].slug}</td>`;
      } else {
        row += `\n            <td class="no-right-border"></td>\n            <td class="border-collapse"></td>`;
      }
      row += `\n        </tr>`;
      newRows += row;
    }
  }

  // Insert into the employee info section — BEFORE any nested earnings/deductions tables
  const insertPoint = findEmployeeInfoInsertPoint(html);
  if (insertPoint > -1) {
    const newHtml = html.slice(0, insertPoint) + newRows + html.slice(insertPoint);
    return {
      html: newHtml,
      description: `Added ${fieldsToAdd.length} ${groupName} field${fieldsToAdd.length > 1 ? 's' : ''} to employee info: ${fieldsToAdd.map(f => f.label).join(', ')}`,
    };
  }

  // Fallback 2: Insert before the salary/earnings section (emp_salary class or Earnings header)
  const salaryTable = html.match(/<table[^>]*class=["'][^"']*emp_salary[^"']*["']/i);
  if (salaryTable) {
    const insertAt = salaryTable.index;
    // For nested table templates, build simple 2-col rows inside a wrapper table
    const wrapperRows = fieldsToAdd.map(f =>
      `<tr><td>${f.label}:</td><td>${f.slug}</td></tr>`
    ).join('\n                ');
    const newSection = `\n<table class="emp_details"><tr><td><table>\n                ${wrapperRows}\n            </table></td></tr></table>\n`;
    const newHtml = html.slice(0, insertAt) + newSection + html.slice(insertAt);
    return {
      html: newHtml,
      description: `Added ${fieldsToAdd.length} ${groupName} field${fieldsToAdd.length > 1 ? 's' : ''} to employee info: ${fieldsToAdd.map(f => f.label).join(', ')}`,
    };
  }

  // Fallback 3: insert before the first nested table row (colspan + inner table)
  const nestedTableRow = html.match(/<tr[^>]*>\s*<td[^>]*colspan[^>]*>\s*<table/i);
  if (nestedTableRow) {
    const insertAt = nestedTableRow.index;
    const newHtml = html.slice(0, insertAt) + newRows + '\n    ' + html.slice(insertAt);
    return {
      html: newHtml,
      description: `Added ${fieldsToAdd.length} ${groupName} field${fieldsToAdd.length > 1 ? 's' : ''} to employee info: ${fieldsToAdd.map(f => f.label).join(', ')}`,
    };
  }

  // Fallback 4: insert before first {{#each}} block
  const firstEach = html.indexOf('{{#each');
  if (firstEach > -1) {
    // Find the <tr> or <table> that contains this #each
    const beforeEach = html.lastIndexOf('<tr', firstEach);
    const tableBeforeEach = html.lastIndexOf('<table', firstEach);
    const insertAt = Math.min(
      beforeEach > -1 ? beforeEach : html.length,
      tableBeforeEach > -1 ? tableBeforeEach : html.length
    );
    if (insertAt < html.length) {
      const newHtml = html.slice(0, insertAt) + newRows + '\n    ' + html.slice(insertAt);
      return {
        html: newHtml,
        description: `Added ${fieldsToAdd.length} ${groupName} field${fieldsToAdd.length > 1 ? 's' : ''} to employee info: ${fieldsToAdd.map(f => f.label).join(', ')}`,
      };
    }
  }

  // Last resort: before the last </tbody>
  const lastTbody = html.lastIndexOf('</tbody>');
  if (lastTbody > -1) {
    const newHtml = html.slice(0, lastTbody) + newRows + '\n    ' + html.slice(lastTbody);
    return {
      html: newHtml,
      description: `Added ${fieldsToAdd.length} ${groupName} field${fieldsToAdd.length > 1 ? 's' : ''}: ${fieldsToAdd.map(f => f.label).join(', ')}`,
    };
  }

  return { error: `Could not find a suitable location to add ${groupName} fields.` };
}

// ── BULK REMOVE: removes all fields from a category group ──
function applyBulkRemove(html, groupName, fields) {
  const group = BULK_GROUPS[groupName];
  if (!group || !fields || fields.length === 0) {
    return { error: `No fields found for group "${groupName}".` };
  }

  let removedCount = 0;
  let currentHtml = html;

  for (const f of fields) {
    const slugEscaped = f.slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const labelEscaped = f.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const rows = currentHtml.split(/(?=<tr[\s>])/i);
    const newRows = rows.map(row => {
      if (!/<tr[\s>]/i.test(row)) return row;
      if (/<th[\s>]/i.test(row)) return row;
      if (/\{\{#each\s/i.test(row)) return row;
      if (/\{\{this\.\w+\}\}/i.test(row)) return row;

      if (new RegExp(slugEscaped, 'i').test(row) || new RegExp(labelEscaped, 'i').test(row)) {
        removedCount++;
        return '';
      }
      return row;
    });
    currentHtml = newRows.join('');
  }

  if (removedCount > 0) {
    return {
      html: currentHtml,
      description: `Removed ${removedCount} ${groupName} field${removedCount > 1 ? 's' : ''} from the template`,
    };
  }

  return { error: `No ${groupName} fields were found in the template to remove.` };
}

// ── TARGETED STYLE: apply style to a specific section ──
function applyTargetedStyle(html, target, property, value, direction) {
  const sectionTarget = SECTION_TARGETS[target.toLowerCase()] || SECTION_TARGETS[target.toLowerCase().replace(/\s+section$/, '')] || SECTION_TARGETS[target.toLowerCase().replace(/\s+table$/, '')];

  // Ensure value has units
  if (property === 'width' || property === 'height' || property === 'font-size') {
    if (value && /^\d+$/.test(value)) value = value + 'px';
  }
  if (property === 'padding' || property === 'margin') {
    if (value && /^\d+$/.test(value)) value = value + 'px';
  }

  // For relative changes (+/- values), just use the value as-is since we can't compute
  // Instead provide a reasonable absolute value
  if (value && /^[+-]/.test(value)) {
    if (property === 'width') value = '100%';
    else if (property === 'height') value = 'auto';
    else if (property === 'font-size') {
      value = direction === 'increase' ? '14px' : '11px';
    }
    else if (property === 'padding') value = direction === 'increase' ? '15px' : '5px';
  }

  // ── Handle earnings/deductions sections by finding their table blocks ──
  if (sectionTarget) {
    return applyStyleToSection(html, sectionTarget, property, value);
  }

  // ── Try to find the section by searching for known text ──
  // Try matching against SECTION_TARGETS keys partially
  for (const [key, st] of Object.entries(SECTION_TARGETS)) {
    if (target.toLowerCase().includes(key) || key.includes(target.toLowerCase())) {
      return applyStyleToSection(html, st, property, value);
    }
  }

  // ── Fallback: apply globally ──
  return applyStyleGlobal(html, property, value);
}

function applyStyleToSection(html, sectionTarget, property, value) {
  const { search, cssClass } = sectionTarget;

  // Strategy: Find table/rows that contain the search terms and modify their styles
  if (cssClass === 'body' || cssClass === 'template') {
    return applyStyleGlobal(html, property, value);
  }

  if (cssClass === 'earnings-header') {
    // Modify the .earnings-header class in <style> or inline styles
    if (property === 'background-color') {
      let newHtml = html;
      // Try inline style on earnings-header rows
      newHtml = newHtml.replace(/(class="[^"]*earnings-header[^"]*"[^>]*style="[^"]*?)background-color:\s*[^;]+/gi,
        `$1background-color: ${value}`);
      // If no inline bg exists, add it to the style
      if (newHtml === html) {
        newHtml = newHtml.replace(/(class="[^"]*earnings-header[^"]*"[^>]*style=")([^"]*")/gi,
          `$1background-color: ${value}; $2`);
      }
      // Also try <style> block
      if (newHtml === html) {
        newHtml = newHtml.replace(/(\.earnings-header\s*\{[^}]*?)background-color:\s*[^;]+/gi,
          `$1background-color: ${value}`);
      }
      if (newHtml !== html) {
        return { html: newHtml, description: `Changed earnings header background to "${value}"` };
      }
    }
    if (property === 'color') {
      let newHtml = html;
      newHtml = newHtml.replace(/(class="[^"]*earnings-header[^"]*"[^>]*style="[^"]*?)(?:(?:^|;\s*)color:\s*[^;]+)/gi,
        `$1color: ${value}`);
      if (newHtml === html) {
        newHtml = newHtml.replace(/(class="[^"]*earnings-header[^"]*"[^>]*style=")([^"]*")/gi,
          `$1color: ${value}; $2`);
      }
      if (newHtml !== html) {
        return { html: newHtml, description: `Changed header text color to "${value}"` };
      }
    }
  }

  // For specific section tables: find the table/rows containing search terms
  // and modify their style attributes
  let newHtml = html;
  let modified = false;

  // Find tables or rows that contain the section's search terms
  for (const term of search) {
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Try modifying the containing <table> element
    const tableRegex = new RegExp(`(<table[^>]*)(>[\\s\\S]*?${escapedTerm}[\\s\\S]*?<\\/table>)`, 'gi');
    newHtml = newHtml.replace(tableRegex, (full, tableOpen, tableRest) => {
      modified = true;
      return modifyStyleAttribute(tableOpen, property, value) + tableRest;
    });
    if (modified) break;

    // Try modifying rows containing the term
    if (property === 'background-color' || property === 'color' || property === 'font-size') {
      const rows = newHtml.split(/(?=<tr[\s>])/i);
      const modifiedRows = rows.map(row => {
        if (new RegExp(escapedTerm, 'i').test(row) && /<tr[\s>]/i.test(row)) {
          modified = true;
          return row.replace(/<tr([^>]*)>/i, (trFull, trAttrs) => {
            return '<tr' + modifyStyleInAttrs(trAttrs, property, value) + '>';
          });
        }
        return row;
      });
      if (modified) {
        newHtml = modifiedRows.join('');
        break;
      }
    }
  }

  if (modified) {
    const targetName = Object.entries(SECTION_TARGETS).find(([k, v]) => v === sectionTarget)?.[0] || 'section';
    return { html: newHtml, description: `Changed ${property} of ${targetName} to "${value}"` };
  }

  // If we couldn't find the specific section, fall back to global
  return applyStyleGlobal(html, property, value);
}

function applyStyleGlobal(html, property, value) {
  switch (property) {
    case 'width': {
      const result = applyTemplateWidth(html, value, `Changed template width to "${value}"`);
      return result.error ? { html, description: `Changed template width to "${value}"` } : result;
    }
    case 'height': {
      // Height on tables: try main class tables, then CSS .main
      let newHtml = html;
      // Try inline style on main-table or main class
      const heightInlineRe = /(<table[^>]*class=["'][^"']*(?:main-table|main)[^"']*["'][^>]*style=["'][^"']*?)height\s*:\s*[^;"']+/i;
      if (heightInlineRe.test(newHtml)) {
        newHtml = newHtml.replace(heightInlineRe, `$1height: ${value}`);
      } else {
        // Try adding height to style attr
        const mainStyleRe = /(<table[^>]*class=["'][^"']*(?:main-table|main)[^"']*["'][^>]*style=["'])([^"']*["'])/i;
        if (mainStyleRe.test(newHtml)) {
          newHtml = newHtml.replace(mainStyleRe, `$1height: ${value}; $2`);
        } else {
          // Try CSS .main block
          const cssHeightRe = /(\.main\s*\{[^}]*?)height\s*:\s*[^;}]+/i;
          if (cssHeightRe.test(newHtml)) {
            newHtml = newHtml.replace(cssHeightRe, `$1height: ${value}`);
          }
        }
      }
      return { html: newHtml, description: `Changed template height to "${value}"` };
    }
    case 'background-color': {
      const newHtml = html.replace(/background-color:\s*[^;}"']+/gi, `background-color: ${value}`);
      return { html: newHtml, description: `Changed background color to "${value}"` };
    }
    case 'color': {
      // Be careful not to change background-color
      const newHtml = html.replace(/(?<!background-)color:\s*[^;}"']+/gi, `color: ${value}`);
      return { html: newHtml, description: `Changed text color to "${value}"` };
    }
    case 'font-size': {
      if (!value.includes('px') && !value.includes('em') && !value.includes('pt') && !value.includes('%')) {
        value = value + 'px';
      }
      const newHtml = html.replace(/font-size:\s*[^;}"']+/gi, `font-size: ${value}`);
      return { html: newHtml, description: `Changed font size to "${value}"` };
    }
    case 'font-family': {
      const newHtml = html.replace(/font-family:\s*[^;}"']+/gi, `font-family: ${value}`);
      return { html: newHtml, description: `Changed font to "${value}"` };
    }
    case 'padding': {
      const newHtml = html.replace(/padding:\s*[^;}"']+/gi, `padding: ${value}`);
      return { html: newHtml, description: `Changed padding to "${value}"` };
    }
    case 'margin': {
      const newHtml = html.replace(/margin:\s*[^;}"']+/gi, `margin: ${value}`);
      return { html: newHtml, description: `Changed margin to "${value}"` };
    }
    case 'border': {
      if (value === 'none') {
        let newHtml = html.replace(/border:\s*1px\s+solid\s+[^;]+/gi, 'border: none');
        return { html: newHtml, description: 'Removed borders' };
      } else {
        let newHtml = html.replace(/border:\s*none/gi, `border: ${value}`);
        newHtml = newHtml.replace(/border:\s*0px/gi, `border: ${value}`);
        return { html: newHtml, description: `Added borders: ${value}` };
      }
    }
    case 'header-background': {
      const newHtml = html.replace(/(\.earnings-header\s*\{[^}]*?)background-color:\s*[^;]+/gi, (match) => {
        return match.replace(/background-color:\s*[^;]+/, `background-color: ${value}`);
      });
      return { html: newHtml, description: `Changed header background to "${value}"` };
    }
    case 'text-color': {
      const newHtml = html.replace(/(?<!background-)color:\s*[^;}"']+/gi, `color: ${value}`);
      return { html: newHtml, description: `Changed text color to "${value}"` };
    }
    default:
      return { error: `Unknown style property: ${property}` };
  }
}

// Helper: modify a style attribute within an HTML opening tag
function modifyStyleAttribute(tagOpen, property, value) {
  const styleMatch = tagOpen.match(/style="([^"]*)"/i);
  if (styleMatch) {
    const existingStyle = styleMatch[1];
    const propRegex = new RegExp(`${property}:\\s*[^;]+`, 'gi');
    if (propRegex.test(existingStyle)) {
      const newStyle = existingStyle.replace(propRegex, `${property}: ${value}`);
      return tagOpen.replace(styleMatch[0], `style="${newStyle}"`);
    } else {
      return tagOpen.replace(styleMatch[0], `style="${existingStyle}; ${property}: ${value}"`);
    }
  } else {
    return tagOpen + ` style="${property}: ${value}"`;
  }
}

// Helper: modify style within existing tag attributes string
function modifyStyleInAttrs(attrs, property, value) {
  const styleMatch = attrs.match(/style="([^"]*)"/i);
  if (styleMatch) {
    const existingStyle = styleMatch[1];
    const propRegex = new RegExp(`${property}:\\s*[^;]+`, 'gi');
    if (propRegex.test(existingStyle)) {
      const newStyle = existingStyle.replace(propRegex, `${property}: ${value}`);
      return attrs.replace(styleMatch[0], `style="${newStyle}"`);
    } else {
      return attrs.replace(styleMatch[0], `style="${existingStyle}; ${property}: ${value}"`);
    }
  } else {
    return attrs + ` style="${property}: ${value}"`;
  }
}

// ── SWAP: swap two rows in the template ──
function applySwap(html, field1Text, field2Text) {
  const match1 = resolveField(field1Text);
  const match2 = resolveField(field2Text);

  const search1 = [field1Text];
  const search2 = [field2Text];
  if (match1) { search1.push(match1.label, match1.slug); }
  if (match2) { search2.push(match2.label, match2.slug); }

  const rows = html.split(/(?=<tr[\s>])/i);
  let idx1 = -1, idx2 = -1;

  for (let i = 0; i < rows.length; i++) {
    if (!/<tr[\s>]/i.test(rows[i])) continue;
    if (/<th[\s>]/i.test(rows[i])) continue;
    if (/\{\{this\.\w+\}\}/i.test(rows[i])) continue;

    for (const term of search1) {
      if (new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(rows[i])) {
        idx1 = i;
        break;
      }
    }
    for (const term of search2) {
      if (new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(rows[i])) {
        idx2 = i;
        break;
      }
    }
  }

  if (idx1 === -1) return { error: `Could not find "${field1Text}" to swap.` };
  if (idx2 === -1) return { error: `Could not find "${field2Text}" to swap.` };

  // Swap the rows
  const temp = rows[idx1];
  rows[idx1] = rows[idx2];
  rows[idx2] = temp;

  return {
    html: rows.join(''),
    description: `Swapped "${match1 ? match1.label : field1Text}" and "${match2 ? match2.label : field2Text}"`,
  };
}

// ── MOVE: move a row to before/after another row ──
function applyMove(html, fieldText, targetText, position) {
  const fieldMatch = resolveField(fieldText);
  const targetMatch = resolveField(targetText);

  const searchField = [fieldText];
  const searchTarget = [targetText];
  if (fieldMatch) searchField.push(fieldMatch.label, fieldMatch.slug);
  if (targetMatch) searchTarget.push(targetMatch.label, targetMatch.slug);

  const rows = html.split(/(?=<tr[\s>])/i);
  let fieldIdx = -1, targetIdx = -1;

  for (let i = 0; i < rows.length; i++) {
    if (!/<tr[\s>]/i.test(rows[i])) continue;
    if (/<th[\s>]/i.test(rows[i])) continue;
    if (/\{\{this\.\w+\}\}/i.test(rows[i])) continue;

    for (const term of searchField) {
      if (new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(rows[i])) {
        fieldIdx = i; break;
      }
    }
    for (const term of searchTarget) {
      if (new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(rows[i])) {
        targetIdx = i; break;
      }
    }
  }

  if (fieldIdx === -1) return { error: `Could not find "${fieldText}" to move.` };
  if (targetIdx === -1) return { error: `Could not find "${targetText}" as target.` };

  const [movedRow] = rows.splice(fieldIdx, 1);
  // Recalculate target index after removal
  const newTargetIdx = fieldIdx < targetIdx ? targetIdx - 1 : targetIdx;
  const insertIdx = position === 'before' ? newTargetIdx : newTargetIdx + 1;
  rows.splice(insertIdx, 0, movedRow);

  return {
    html: rows.join(''),
    description: `Moved "${fieldMatch ? fieldMatch.label : fieldText}" ${position} "${targetMatch ? targetMatch.label : targetText}"`,
  };
}

// ── MOVE TO COLUMN: move a field to the left or right column in a 4-col row ──
function applyMoveToColumn(html, fieldText, direction) {
  // Logo uses position-based logic, not column-swap
  if (/^(?:(?:company|org(?:anization|anisation)?)\s+)?logo$/i.test(fieldText.trim())) {
    const pos = direction === 'right' ? 'right' : direction === 'left' ? 'left' : 'center';
    return applyLogoPosition(html, pos);
  }

  const fieldMatch = resolveField(fieldText);
  const searchTerms = [fieldText];
  if (fieldMatch) searchTerms.push(fieldMatch.label, fieldMatch.slug);

  const rows = html.split(/(?=<tr[\s>])/i);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!/<tr[\s>]/i.test(row)) continue;
    if (/<th[\s>]/i.test(row)) continue;
    if (/\{\{this\.\w+\}\}/i.test(row)) continue;

    let found = false;
    for (const term of searchTerms) {
      if (new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(row)) {
        found = true; break;
      }
    }
    if (!found) continue;

    // Extract all <td> positions
    const tdRegex = /<td[\s\S]*?<\/td>/gi;
    const tds = [];
    let m;
    while ((m = tdRegex.exec(row)) !== null) {
      tds.push({ html: m[0], start: m.index, end: m.index + m[0].length });
    }

    const label = fieldMatch ? fieldMatch.label : fieldText;

    // 4-column row: swap left pair ↔ right pair
    if (tds.length >= 4) {
      const leftPairHtml = tds[0].html + tds[1].html;
      const rightPairHtml = tds[2].html + tds[3].html;

      const fieldInLeft = searchTerms.some(t =>
        new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(leftPairHtml)
      );
      const fieldInRight = searchTerms.some(t =>
        new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(rightPairHtml)
      );

      if (!fieldInLeft && !fieldInRight) continue;
      if (direction === 'left' && fieldInLeft) return { error: `"${label}" is already on the left side.` };
      if (direction === 'right' && fieldInRight) return { error: `"${label}" is already on the right side.` };

      const preamble = row.slice(0, tds[0].start);
      const gap01 = row.slice(tds[0].end, tds[1].start);
      const gap12 = row.slice(tds[1].end, tds[2].start);
      const gap23 = row.slice(tds[2].end, tds[3].start);
      const rest = row.slice(tds[3].end);
      rows[i] = preamble + tds[2].html + gap01 + tds[3].html + gap12 + tds[0].html + gap23 + tds[1].html + rest;
      return { html: rows.join(''), description: `Moved "${label}" to the ${direction} column` };
    }

    // 2-column row (header): swap the two cells
    if (tds.length === 2) {
      const fieldInFirst = searchTerms.some(t =>
        new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(tds[0].html)
      );
      const fieldInSecond = !fieldInFirst;

      if (direction === 'right' && fieldInSecond) return { error: `"${label}" is already on the right side.` };
      if (direction === 'left' && fieldInFirst) return { error: `"${label}" is already on the left side.` };

      const preamble = row.slice(0, tds[0].start);
      const gap = row.slice(tds[0].end, tds[1].start);
      const rest = row.slice(tds[1].end);
      rows[i] = preamble + tds[1].html + gap + tds[0].html + rest;
      return { html: rows.join(''), description: `Moved "${label}" to the ${direction} side` };
    }
  }

  return { error: `Could not find "${fieldText}" in the template.` };
}

// ── DUPLICATE ROW ──
function applyDuplicateRow(html, fieldText) {
  const match = resolveField(fieldText);
  const searchTerms = [fieldText];
  if (match) searchTerms.push(match.label, match.slug);

  const rows = html.split(/(?=<tr[\s>])/i);
  let targetIdx = -1;

  for (let i = 0; i < rows.length; i++) {
    if (!/<tr[\s>]/i.test(rows[i])) continue;
    for (const term of searchTerms) {
      if (new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(rows[i])) {
        targetIdx = i; break;
      }
    }
    if (targetIdx > -1) break;
  }

  if (targetIdx === -1) return { error: `Could not find "${fieldText}" to duplicate.` };

  rows.splice(targetIdx + 1, 0, rows[targetIdx]);
  return {
    html: rows.join(''),
    description: `Duplicated "${match ? match.label : fieldText}" row`,
  };
}

// ── ALIGN: change text-align of a section ──
function applyAlign(html, target, alignment) {
  const sectionTarget = SECTION_TARGETS[target.toLowerCase()] ||
    SECTION_TARGETS[target.toLowerCase().replace(/\s+section$/, '')];

  if (sectionTarget) {
    let newHtml = html;
    let modified = false;
    for (const term of sectionTarget.search) {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rows = newHtml.split(/(?=<tr[\s>])/i);
      newHtml = rows.map(row => {
        if (new RegExp(escaped, 'i').test(row) && /<tr[\s>]/i.test(row)) {
          modified = true;
          return row.replace(/text-align:\s*\w+/gi, `text-align: ${alignment}`);
        }
        return row;
      }).join('');
      if (modified) break;
    }
    if (modified) {
      return { html: newHtml, description: `Aligned ${target} to ${alignment}` };
    }
  }

  // Global text-align change
  const newHtml = html.replace(/text-align:\s*\w+/gi, `text-align: ${alignment}`);
  return { html: newHtml, description: `Aligned text to ${alignment}` };
}

// ── BOLD: make a section's text bold ──
function applyBold(html, target) {
  const match = resolveField(target);
  const searchTerms = [target];
  if (match) searchTerms.push(match.label, match.slug);

  const rows = html.split(/(?=<tr[\s>])/i);
  let modified = false;
  const newRows = rows.map(row => {
    if (!/<tr[\s>]/i.test(row)) return row;
    for (const term of searchTerms) {
      if (new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(row)) {
        modified = true;
        return row.replace(/font-weight:\s*\w+/gi, 'font-weight: bold')
          .replace(/<tr([^>]*)>/i, (full, attrs) => {
            if (/font-weight/i.test(attrs)) return full;
            return '<tr' + modifyStyleInAttrs(attrs, 'font-weight', 'bold') + '>';
          });
      }
    }
    return row;
  });

  if (modified) {
    return { html: newRows.join(''), description: `Made "${match ? match.label : target}" bold` };
  }
  return { error: `Could not find "${target}" to make bold.` };
}

// ── HIDE SECTION ──
function applyHideSection(html, sectionText) {
  const section = detectSection(sectionText);
  if (section === 'earnings' || section === 'deductions') {
    const eachTag = section === 'earnings' ? '{{#each new_obj.earnings}}' : '{{#each new_obj.deductions}}';
    const eachIdx = html.indexOf(eachTag);
    if (eachIdx === -1) return { error: `Could not find the ${section} section.` };

    // Find the containing table and add display:none
    const tableStart = html.lastIndexOf('<table', eachIdx);
    if (tableStart > -1) {
      const newHtml = html.slice(0, tableStart) +
        html.slice(tableStart).replace(/<table/, '<table style="display:none"');
      return { html: newHtml, description: `Hidden ${section} section` };
    }
  }
  return { error: `Could not find the "${sectionText}" section to hide.` };
}

// ── SHOW SECTION (unhide) ──
function applyShowSection(html, sectionText) {
  const section = detectSection(sectionText);
  if (section === 'earnings' || section === 'deductions') {
    const eachTag = section === 'earnings' ? '{{#each new_obj.earnings}}' : '{{#each new_obj.deductions}}';
    const eachIdx = html.indexOf(eachTag);
    if (eachIdx === -1) return { error: `Could not find the ${section} section.` };

    // Find the containing table and remove display:none
    const tableStart = html.lastIndexOf('<table', eachIdx);
    if (tableStart > -1) {
      const tableTag = html.slice(tableStart).match(/<table[^>]*>/i);
      if (tableTag) {
        const origTag = tableTag[0];
        let newTag = origTag
          .replace(/\s*display\s*:\s*none\s*;?\s*/gi, '')
          .replace(/\s*style=["']\s*["']/gi, '');
        // Also clean up empty style=""
        newTag = newTag.replace(/\s+style=["']\s*["']/gi, '');
        if (newTag === origTag) {
          return { html, description: `${section} section is already visible` };
        }
        const newHtml = html.slice(0, tableStart) + html.slice(tableStart).replace(origTag, newTag);
        return { html: newHtml, description: `Shown ${section} section` };
      }
    }
  }

  // Generic: remove display:none from ANY element in the template
  const displayNoneRe = /display\s*:\s*none\s*;?\s*/gi;
  let modified = html;

  // Broad approach: find all tags with display:none and remove it
  modified = modified.replace(
    /(<(?:table|tr|td|div|section|thead|tbody)[^>]*style=["'])([^"']*)(["'][^>]*>)/gi,
    (match, prefix, style, suffix) => {
      if (/display\s*:\s*none/i.test(style)) {
        const newStyle = style.replace(displayNoneRe, '').trim();
        if (!newStyle) return prefix.replace(/style=["']$/, '') + suffix.replace(/^["']/, '');
        return prefix + newStyle + suffix;
      }
      return match;
    }
  );

  if (modified !== html) {
    return { html: modified, description: `Shown ${sectionText} section` };
  }

  return { error: `Could not find the "${sectionText}" section to show, or it is already visible.` };
}

// ── SET ORIENTATION ──
function applySetOrientation(html, orientation) {
  const isLandscape = orientation === 'landscape';
  const width = isLandscape ? '1123px' : '794px';
  return applyTemplateWidth(html, width, `Changed orientation to ${orientation} (width: ${width})`);
}

// ── SET PRESET SIZE ──
function applySetPresetSize(html, preset) {
  const sizes = { A4: '794px', A3: '1123px', LETTER: '816px', LEGAL: '816px' };
  const width = sizes[preset] || '794px';
  return applyTemplateWidth(html, width, `Set page size to ${preset} (width: ${width})`);
}

// ── Shared helper: set width on the main outermost table ──
function applyTemplateWidth(html, width, description) {
  // Strategy 1: table with class="main-table" or class="main" that has width in style
  const mainClassRe = /(<table[^>]*class=["'][^"']*(?:main-table|main)[^"']*["'][^>]*style=["'][^"']*?)width\s*:\s*[^;"']+/i;
  if (mainClassRe.test(html)) {
    return { html: html.replace(mainClassRe, `$1width: ${width}`), description };
  }

  // Strategy 2: table with class="main-table" or "main" — add width to existing style
  const mainClassStyleRe = /(<table[^>]*class=["'][^"']*(?:main-table|main)[^"']*["'][^>]*style=["'])([^"']*["'])/i;
  if (mainClassStyleRe.test(html)) {
    return { html: html.replace(mainClassStyleRe, `$1width: ${width}; $2`), description };
  }

  // Strategy 3: table with class="main-table" or "main" — no style attr, add one
  const mainClassNoStyleRe = /(<table[^>]*class=["'][^"']*(?:main-table|main)[^"']*["'])([^>]*>)/i;
  if (mainClassNoStyleRe.test(html)) {
    return { html: html.replace(mainClassNoStyleRe, `$1 style="width: ${width}"$2`), description };
  }

  // Strategy 4: any table with width in style
  const tableWidthRe = /(<table[^>]*style=["'][^"']*?)width\s*:\s*[^;"']+/i;
  if (tableWidthRe.test(html)) {
    return { html: html.replace(tableWidthRe, `$1width: ${width}`), description };
  }

  // Strategy 5: first <table> — add width via style
  const firstTableRe = /(<table\b)([^>]*>)/i;
  if (firstTableRe.test(html)) {
    return { html: html.replace(firstTableRe, `$1 style="width: ${width}"$2`), description };
  }

  // Strategy 6: CSS .main class in <style> block
  const cssMainRe = /(\.main\s*\{[^}]*?)width\s*:\s*[^;}]+/i;
  if (cssMainRe.test(html)) {
    return { html: html.replace(cssMainRe, `$1width: ${width}`), description };
  }

  return { error: `Could not find the template container to set width.` };
}

// ── LOGO SIZE ──
function applyLogoSize(html, size) {
  // Find logo img/image and update width/height
  const logoRe = /(<img[^>]*(?:logo|ORG_LOGO)[^>]*?)(?:width\s*[:=]\s*["']?\d+(?:px)?["']?)/gi;
  if (logoRe.test(html)) {
    let newHtml = html.replace(/(<img[^>]*(?:logo|ORG_LOGO)[^>]*?)width\s*[:=]\s*["']?\d+(?:px)?["']?/gi, `$1width="${size}"`);
    newHtml = newHtml.replace(/(<img[^>]*(?:logo|ORG_LOGO)[^>]*?)height\s*[:=]\s*["']?\d+(?:px)?["']?/gi, `$1height="${size}"`);
    return { html: newHtml, description: `Set logo size to ${size}px` };
  }

  // Try style-based width
  const logoStyleRe = /(<img[^>]*(?:logo|ORG_LOGO)[^>]*style=["'][^"']*?)width\s*:\s*[^;"']+/gi;
  if (logoStyleRe.test(html)) {
    let newHtml = html.replace(logoStyleRe, `$1width: ${size}px`);
    newHtml = newHtml.replace(/(<img[^>]*(?:logo|ORG_LOGO)[^>]*style=["'][^"']*?)height\s*:\s*[^;"']+/gi, `$1height: ${size}px`);
    return { html: newHtml, description: `Set logo size to ${size}px` };
  }

  return { error: `Could not find a logo element to resize. Try "add logo" first.` };
}

// ── LOGO POSITION ──
function applyLogoPosition(html, position) {
  // Find the td/div containing the logo and change alignment
  const alignMap = { left: 'left', right: 'right', center: 'center' };
  const align = alignMap[position] || 'left';

  // Find logo container td and update text-align
  const logoContainerRe = /(<td[^>]*)(>[\s\S]*?(?:logo|ORG_LOGO)[\s\S]*?<\/td>)/gi;
  const match = html.match(logoContainerRe);
  if (match) {
    let newHtml = html;
    for (const m of match) {
      const tdAttrs = m.match(/<td([^>]*)>/i);
      if (tdAttrs) {
        let attrs = tdAttrs[1];
        if (/text-align\s*:/i.test(attrs)) {
          attrs = attrs.replace(/text-align\s*:\s*[^;"']+/gi, `text-align: ${align}`);
        } else if (/style=["']/i.test(attrs)) {
          attrs = attrs.replace(/style=["']/i, `style="text-align: ${align}; `);
        } else {
          attrs += ` style="text-align: ${align}"`;
        }
        const newTd = `<td${attrs}>`;
        newHtml = newHtml.replace(tdAttrs[0], newTd);
      }
    }
    return { html: newHtml, description: `Moved logo to ${position}` };
  }

  return { error: `Could not find a logo element to reposition.` };
}

// ── SET SECTION LABEL ──
function applySetLabel(html, sectionText, newLabel) {
  const section = detectSection(sectionText);

  // Look for section headers like <strong>Earnings</strong> or <th>Deductions</th>
  const sectionLabels = {
    earnings: ['Earnings', 'Gross Earnings', 'Income'],
    deductions: ['Deductions', 'Total Deductions'],
    net_pay: ['Net Pay', 'Net Salary', 'Take Home'],
    employee_info: ['Employee Info', 'Employee Information', 'Employee Details'],
    footer: ['Footer'],
  };

  const labels = sectionLabels[section] || [sectionText];
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match in <strong>, <th>, <b>, or standalone in header-like cells
    const patterns = [
      new RegExp(`(<(?:strong|b|th)[^>]*>\\s*)${escaped}(\\s*<\\/(?:strong|b|th)>)`, 'gi'),
      new RegExp(`(<td[^>]*class=["'][^"']*header[^"']*["'][^>]*>\\s*)${escaped}(\\s*<\\/td>)`, 'gi'),
    ];
    for (const re of patterns) {
      if (re.test(html)) {
        const newHtml = html.replace(re, `$1${newLabel}$2`);
        return { html: newHtml, description: `Changed ${section} label from "${label}" to "${newLabel}"` };
      }
    }
  }

  return { error: `Could not find the "${sectionText}" section label to change.` };
}

// ── SET COLUMNS (employee info) ──
function applySetColumns(html, columns) {
  if (columns < 1 || columns > 4) {
    return { error: `Column count must be between 1 and 4.` };
  }

  // For employee info, we need to restructure 4-column rows into N-column rows
  const rows = html.split(/(?=<tr[\s>])/i);
  let modified = false;

  if (columns === 2) {
    // Already 4-col layout → convert to 2-col by splitting each row into two rows
    const newRows = [];
    for (let i = 0; i < rows.length; i++) {
      if (!/<tr[\s>]/i.test(rows[i]) || /\{\{this\.\w+\}\}/i.test(rows[i]) || /<th[\s>]/i.test(rows[i])) {
        newRows.push(rows[i]);
        continue;
      }
      if (/<td[^>]*colspan/i.test(rows[i]) && /<table/i.test(rows[i])) {
        newRows.push(rows[i]);
        continue;
      }

      const trMatch = rows[i].match(/<tr[\s\S]*?<\/tr>/i);
      if (!trMatch) { newRows.push(rows[i]); continue; }

      const cells = trMatch[0].match(/<td[^>]*>[\s\S]*?<\/td>/gi);
      if (!cells || cells.length !== 4) { newRows.push(rows[i]); continue; }

      // Check if right side has content
      const rightHasContent = cells.slice(2).some(c => {
        const stripped = c.replace(/<[^>]*>/g, '').replace(/\{\{[^}]*\}\}/g, '').trim();
        return stripped.length > 0;
      });

      if (rightHasContent) {
        // Split into two 2-column rows
        const trTag = trMatch[0].match(/<tr[^>]*>/i)[0];
        const prefix = rows[i].slice(0, rows[i].indexOf(trMatch[0]));
        const suffix = rows[i].slice(rows[i].indexOf(trMatch[0]) + trMatch[0].length);

        // Make cells span wider
        const row1 = `${trTag}\n            ${cells[0]}\n            ${cells[1]}\n        </tr>`;
        const row2 = `${trTag}\n            ${cells[2]}\n            ${cells[3]}\n        </tr>`;
        newRows.push(prefix + row1 + '\n' + row2 + suffix);
        modified = true;
      } else {
        newRows.push(rows[i]);
      }
    }

    if (modified) {
      return { html: newRows.join(''), description: `Changed employee info to ${columns} columns` };
    }
  }

  // For columns=4 (or converting back), would need to merge 2-col rows into 4-col
  // This is the default layout, so usually no action needed
  if (columns === 4) {
    return { html, description: `Employee info is already in ${columns}-column layout` };
  }

  return { error: `Column count change to ${columns} is not supported yet. Use 2 or 4.` };
}

// ── COLSPAN ──
function applyColspan(html, fieldText, span) {
  const match = resolveField(fieldText);
  const searchTerms = [fieldText];
  if (match) searchTerms.push(match.label, match.slug);

  const rows = html.split(/(?=<tr[\s>])/i);
  let modified = false;
  const newRows = rows.map(row => {
    if (!/<tr[\s>]/i.test(row)) return row;
    for (const term of searchTerms) {
      if (new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(row)) {
        modified = true;
        // Add colspan to the first td
        return row.replace(/<td([^>]*)>/i, `<td$1 colspan="${span}">`);
      }
    }
    return row;
  });

  if (modified) {
    return { html: newRows.join(''), description: `Set colspan of "${match ? match.label : fieldText}" to ${span}` };
  }
  return { error: `Could not find "${fieldText}" to modify colspan.` };
}

// ═══════════════════════════════════════════════════════════════════
// PROTECTED RANGES — prevent accidental modification of loop blocks
// ═══════════════════════════════════════════════════════════════════

function findProtectedRanges(html) {
  const ranges = [];
  const loopTags = [
    '{{#each new_obj.earnings}}',
    '{{#each new_obj.deductions}}',
    '{{#each new_obj.reimbursment}}',
    '{{#each new_obj.compliance}}',
  ];
  const endTag = '{{/each}}';

  for (const tag of loopTags) {
    let searchFrom = 0;
    while (true) {
      const start = html.indexOf(tag, searchFrom);
      if (start === -1) break;
      const end = html.indexOf(endTag, start);
      if (end === -1) break;
      ranges.push({ start, end: end + endTag.length });
      searchFrom = end + endTag.length;
    }
  }
  return ranges;
}

function isInsideProtectedRange(offset, ranges) {
  return ranges.some(r => offset >= r.start && offset <= r.end);
}

function applyRemoveFooter(html) {
  let newHtml = html;
  let removed = 0;

  // Strategy 1: remove <tr> rows with footer CSS class
  newHtml = newHtml.replace(/<tr[^>]*class=["'][^"']*footer[^"']*["'][^>]*>[\s\S]*?<\/tr>/gi,
    () => { removed++; return ''; });

  // Strategy 2: remove entire <table> with footer CSS class
  if (removed === 0) {
    newHtml = newHtml.replace(/<table[^>]*class=["'][^"']*footer[^"']*["'][^>]*>[\s\S]*?<\/table>/gi,
      () => { removed++; return ''; });
  }

  // Strategy 3: remove rows containing footer-specific slugs
  if (removed === 0) {
    const footerSlugs = ['amount_in_words', 'EMPLOYER_SIGN', 'Authorized'];
    newHtml = html.split(/(?=<tr[\s>])/i).map(row => {
      if (!/<tr[\s>]/i.test(row)) return row;
      if (footerSlugs.some(s => new RegExp(s, 'i').test(row))) { removed++; return ''; }
      return row;
    }).join('');
  }

  if (removed > 0) {
    return { html: newHtml, description: `Removed footer section` };
  }
  return { error: 'Could not find a footer section in this template.' };
}

function applyRemove(html, field, section) {
  const escapedField = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Handle section-level removal
  if (/^footer$/i.test(field.trim())) {
    return applyRemoveFooter(html);
  }

  if (section === 'earnings' || section === 'deductions') {
    const sectionResult = removeSectionField(html, field, section);
    if (sectionResult) return sectionResult;
  }

  const resolved = resolveField(field);
  const slugEscaped = resolved ? resolved.slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : null;

  const protectedRanges = findProtectedRanges(html);

  const rows = html.split(/(?=<tr[\s>])/i);
  let removedCount = 0;
  let charOffset = 0;
  const newRows = rows.map(row => {
    const rowStart = charOffset;
    charOffset += row.length;

    if (!/<tr[\s>]/i.test(row)) return row;

    const fieldMatch = new RegExp(escapedField, 'i').test(row);
    const slugMatch = slugEscaped && new RegExp(slugEscaped, 'i').test(row);

    if (fieldMatch || slugMatch) {
      if (/<th[\s>]/i.test(row)) return row;
      if (/\{\{#each\s/i.test(row)) return row;
      if (/\{\{this\.\w+\}\}/i.test(row)) return row;
      if (/\{\{\/each\}\}/i.test(row)) return row;

      if (!section && isInsideProtectedRange(rowStart, protectedRanges)) return row;

      removedCount++;
      return '';
    }
    return row;
  });

  if (removedCount > 0) {
    return {
      html: newRows.join(''),
      description: `Removed "${field}" (${removedCount} row${removedCount > 1 ? 's' : ''})`,
    };
  }

  return { error: `Could not find "${field}" in the template to remove.` };
}

function removeSectionField(html, field, section) {
  const escapedField = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const eachTag = section === 'earnings' ? '{{#each new_obj.earnings}}' : '{{#each new_obj.deductions}}';
  const endTag = '{{/each}}';

  const eachIdx = html.indexOf(eachTag);
  if (eachIdx === -1) return null;

  const endIdx = html.indexOf(endTag, eachIdx);
  if (endIdx === -1) return null;

  const afterEach = endIdx + endTag.length;
  const tbodyEnd = html.indexOf('</tbody>', afterEach);
  if (tbodyEnd === -1) return null;

  const regionAfter = html.substring(afterEach, tbodyEnd);
  const trRegex = new RegExp(`\\s*<tr[^>]*>[\\s\\S]*?${escapedField}[\\s\\S]*?<\\/tr>`, 'gi');
  const match = regionAfter.match(trRegex);
  if (match && match.length > 0) {
    let newRegion = regionAfter;
    for (const m of match) {
      newRegion = newRegion.replace(m, '');
    }
    const newHtml = html.substring(0, afterEach) + newRegion + html.substring(tbodyEnd);
    return { html: newHtml, description: `Removed "${field}" from ${section} section` };
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════
// FIELD RESOLVER
// ═══════════════════════════════════════════════════════════════════

function resolveField(field) {
  const fieldLower = field.toLowerCase();
  const allSlugs = getAllSlugs();

  // Handle raw Handlebars slug input like "{{org_details.ORG_LOGO}}"
  const rawSlugMatch = field.match(/^\s*\{\{([^}]+)\}\}\s*$/);
  if (rawSlugMatch) {
    const slugText = rawSlugMatch[0].trim();
    const found = allSlugs.find(s => s.slug.toLowerCase() === slugText.toLowerCase());
    if (found) {
      return { label: found.description, slug: found.slug };
    }
    for (const val of Object.values(FIELD_MAP)) {
      if (val.slug.toLowerCase() === slugText.toLowerCase()) {
        return val;
      }
    }
    const slugName = rawSlugMatch[1]
      .split('.').pop()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
    return { label: slugName, slug: slugText };
  }

  let match = FIELD_MAP[fieldLower];
  if (!match) {
    for (const [key, val] of Object.entries(FIELD_MAP)) {
      if (key.includes(fieldLower) || fieldLower.includes(key)) {
        match = val;
        break;
      }
    }
  }
  if (!match) {
    const found = allSlugs.find(s =>
      s.description.toLowerCase().includes(fieldLower) ||
      s.slug.toLowerCase().includes(fieldLower)
    );
    if (found) {
      match = { label: found.description, slug: found.slug };
    }
  }
  return match;
}

// ═══════════════════════════════════════════════════════════════════
// ROW BUILDERS — clone existing row formats for consistent styling
// ═══════════════════════════════════════════════════════════════════

function extractRowTemplate(html, eachTag) {
  const eachIdx = html.indexOf(eachTag);
  if (eachIdx === -1) return null;

  const afterEach = eachIdx + eachTag.length;
  const endEach = html.indexOf('{{/each}}', afterEach);
  if (endEach === -1) return null;

  const block = html.substring(afterEach, endEach);
  const trMatch = block.match(/<tr[\s\S]*?<\/tr>/i);
  return trMatch ? trMatch[0] : null;
}

function buildSectionRow(existingRow, label, slug) {
  if (!existingRow) return null;

  let newRow = existingRow;
  newRow = newRow.replace(/\{\{this\.HEAD_NAME\}\}/gi, label);

  const amountPlaceholders = newRow.match(/\{\{this\.\w+\}\}/gi);
  if (!amountPlaceholders || amountPlaceholders.length === 0) return newRow;

  if (amountPlaceholders.length === 1) {
    newRow = newRow.replace(amountPlaceholders[0], slug);
  } else {
    for (let i = 0; i < amountPlaceholders.length; i++) {
      if (i === amountPlaceholders.length - 1) {
        newRow = newRow.replace(amountPlaceholders[i], slug);
      } else {
        newRow = newRow.replace(amountPlaceholders[i], '');
      }
    }
  }

  return newRow;
}

function findExistingInfoRow(html) {
  const infoSlugs = ['emp_name', 'emp_code', 'empDes', 'empDep', 'empLoc', 'designation_name', 'department_name', 'joining_date', 'PAN_CARD', 'ACCOUNT_NUMBER', 'BANK_NAME', 'IFSC_CODE', 'LWP', 'WORKING_DAYS', 'PAYABLE_DAYS', 'UAN_NUMBER', 'ESI_NUMBER', 'PF_NUMBER'];
  const rows = html.split(/(?=<tr[\s>])/i);
  for (const row of rows) {
    if (!/<tr[\s>]/i.test(row)) continue;
    if (/<th[\s>]/i.test(row)) continue;
    if (/\{\{this\.\w+\}\}/i.test(row)) continue;
    if (/\{\{#each/i.test(row)) continue;
    for (const slug of infoSlugs) {
      if (row.includes(slug)) {
        const trMatch = row.match(/<tr[\s\S]*?<\/tr>/i);
        if (trMatch) return trMatch[0];
      }
    }
  }
  return null;
}

/**
 * Detect a dual nested table layout (e.g. emp_details with left + right sub-tables).
 * Returns [{insertPoint, rowCount}, {insertPoint, rowCount}] for the two sub-tables, or null.
 */
function findDualNestedTableInsertPoints(html) {
  const empTableRegex = /<table[^>]*class=["'][^"']*emp_details[^"']*["'][^>]*>/i;
  const empMatch = empTableRegex.exec(html);
  if (!empMatch) return null;

  const empTableStart = empMatch.index;

  // Find end of emp_details table by tracking depth
  let depth = 1;
  let pos = empTableStart + empMatch[0].length;
  let empTableEnd = -1;
  while (pos < html.length && depth > 0) {
    const nextOpen = html.indexOf('<table', pos);
    const nextClose = html.indexOf('</table>', pos);
    if (nextClose === -1) break;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      pos = nextOpen + 6;
    } else {
      depth--;
      if (depth === 0) empTableEnd = nextClose + 8;
      pos = nextClose + 8;
    }
  }
  if (empTableEnd === -1) return null;

  const empTableHtml = html.slice(empTableStart, empTableEnd);
  const nested = [];
  let scanPos = 1; // skip position 0 (the outer emp_details tag itself)

  while (nested.length < 2) {
    const tableStart = empTableHtml.indexOf('<table', scanPos);
    if (tableStart === -1) break;

    // Find matching </table> for this nested table
    let innerDepth = 1;
    let innerPos = tableStart + 6;
    while (innerPos < empTableHtml.length && innerDepth > 0) {
      const o = empTableHtml.indexOf('<table', innerPos);
      const c = empTableHtml.indexOf('</table>', innerPos);
      if (c === -1) break;
      if (o !== -1 && o < c) { innerDepth++; innerPos = o + 6; }
      else { innerDepth--; innerPos = c + 8; }
    }

    const tableHtml = empTableHtml.slice(tableStart, innerPos);
    const rowMatches = [...tableHtml.matchAll(/<tr[^>]*>[\s\S]*?<\/tr>/gi)].filter(m =>
      !/<th[\s>]/i.test(m[0]) && !/\{\{this\./i.test(m[0]) && !/\{\{#each/i.test(m[0])
    );

    if (rowMatches.length > 0) {
      const lastRow = rowMatches[rowMatches.length - 1];
      nested.push({
        insertPoint: empTableStart + tableStart + lastRow.index + lastRow[0].length,
        rowCount: rowMatches.length,
      });
    }
    scanPos = innerPos;
  }

  if (nested.length < 2) return null;
  return nested; // [leftTable, rightTable]
}

/**
 * Auto-balance rows across both sub-tables in a dual nested table emp_details layout.
 * Pools all data rows from both sub-tables and redistributes them evenly (ceil/floor split).
 * Skips if already balanced (difference <= 1 row). Returns rebalanced HTML.
 */
function autoBalanceDualNestedTables(html) {
  const empTableRegex = /<table[^>]*class=["'][^"']*emp_details[^"']*["'][^>]*>/i;
  const empMatch = empTableRegex.exec(html);
  if (!empMatch) return html;

  const empTableStart = empMatch.index;
  let depth = 1;
  let pos = empTableStart + empMatch[0].length;
  let empTableEnd = -1;
  while (pos < html.length && depth > 0) {
    const nextOpen = html.indexOf('<table', pos);
    const nextClose = html.indexOf('</table>', pos);
    if (nextClose === -1) break;
    if (nextOpen !== -1 && nextOpen < nextClose) { depth++; pos = nextOpen + 6; }
    else { depth--; if (depth === 0) empTableEnd = nextClose + 8; pos = nextClose + 8; }
  }
  if (empTableEnd === -1) return html;

  const empTableHtml = html.slice(empTableStart, empTableEnd);

  // Find both nested sub-tables
  const subTables = [];
  let scanPos = 1;
  while (subTables.length < 2) {
    const tableStart = empTableHtml.indexOf('<table', scanPos);
    if (tableStart === -1) break;
    let innerDepth = 1;
    let innerPos = tableStart + 6;
    while (innerPos < empTableHtml.length && innerDepth > 0) {
      const o = empTableHtml.indexOf('<table', innerPos);
      const c = empTableHtml.indexOf('</table>', innerPos);
      if (c === -1) break;
      if (o !== -1 && o < c) { innerDepth++; innerPos = o + 6; }
      else { innerDepth--; innerPos = c + 8; }
    }
    subTables.push({ start: tableStart, end: innerPos, html: empTableHtml.slice(tableStart, innerPos) });
    scanPos = innerPos;
  }
  if (subTables.length < 2) return html;

  // Extract only data rows (skip header/template-loop rows)
  const getDataRows = (tableHtml) =>
    [...tableHtml.matchAll(/<tr[^>]*>[\s\S]*?<\/tr>/gi)].filter(m =>
      !/<th[\s>]/i.test(m[0]) &&
      !/\{\{this\./i.test(m[0]) &&
      !/\{\{#each/i.test(m[0])
    );

  const leftRows = getDataRows(subTables[0].html);
  const rightRows = getDataRows(subTables[1].html);
  const total = leftRows.length + rightRows.length;

  // Already balanced — nothing to do
  if (Math.abs(leftRows.length - rightRows.length) <= 1) return html;

  // Pool all rows (left first) and redistribute evenly
  const allRows = [...leftRows.map(r => r[0]), ...rightRows.map(r => r[0])];
  const targetLeft = Math.ceil(total / 2);
  const newLeftRows = allRows.slice(0, targetLeft);
  const newRightRows = allRows.slice(targetLeft);

  // Rebuild a sub-table, replacing its data-row region with redistributed rows
  const rebuildSubTable = (tableHtml, oldRows, newDataRows) => {
    if (oldRows.length === 0 && newDataRows.length === 0) return tableHtml;
    if (oldRows.length === 0) {
      const closeIdx = tableHtml.lastIndexOf('</table>');
      return tableHtml.slice(0, closeIdx) + newDataRows.join('\n') + tableHtml.slice(closeIdx);
    }
    const firstStart = oldRows[0].index;
    const lastEnd = oldRows[oldRows.length - 1].index + oldRows[oldRows.length - 1][0].length;
    return tableHtml.slice(0, firstStart) + newDataRows.join('\n') + tableHtml.slice(lastEnd);
  };

  const newLeftTableHtml = rebuildSubTable(subTables[0].html, leftRows, newLeftRows);
  const newRightTableHtml = rebuildSubTable(subTables[1].html, rightRows, newRightRows);

  // Reconstruct empTableHtml — replace right first (higher offset) so left offset stays valid
  let newEmpTableHtml = empTableHtml;
  newEmpTableHtml = newEmpTableHtml.slice(0, subTables[1].start) + newRightTableHtml + newEmpTableHtml.slice(subTables[1].end);
  newEmpTableHtml = newEmpTableHtml.slice(0, subTables[0].start) + newLeftTableHtml + newEmpTableHtml.slice(subTables[0].end);

  return html.slice(0, empTableStart) + newEmpTableHtml + html.slice(empTableEnd);
}

/**
 * Find the correct insert point in the employee info section.
 * Returns the character offset where new rows should be inserted.
 * Strategy: find the last simple info <tr> row BEFORE any nested tables
 * (earnings/deductions sections start with <td colspan> containing a <table>).
 */
function findEmployeeInfoInsertPoint(html) {
  // Strategy 1: Find rows with known employee info slugs and insert after the last one
  const empSlugs = ['emp_name', 'emp_code', 'emp_id', 'empDes', 'empDep', 'empLoc',
    'designation_name', 'department_name', 'joining_date', 'location_name',
    'PAN_CARD', 'UAN_NUMBER', 'ESI_NUMBER', 'PF_NUMBER', 'BANK_NAME',
    'ACCOUNT_NUMBER', 'DAYS_IN_MONTH', 'PAYABLE_DAYS', 'paid_days', 'LWP', 'WEEKLY_OFF'];

  const rows = html.split(/(?=<tr[\s>])/i);
  let charOffset = 0;
  let lastInfoRowEnd = -1;

  for (const row of rows) {
    const rowStart = charOffset;
    charOffset += row.length;

    if (!/<tr[\s>]/i.test(row)) continue;

    // Stop if we hit a {{#each}} loop
    if (/\{\{#each/i.test(row)) break;
    // Stop if we hit template loop rows
    if (/\{\{this\.\w+\}\}/i.test(row)) break;
    // Stop at Earnings/Deductions header rows (colspan with bold text)
    if (/<td[^>]*colspan/i.test(row) && /(?:Earnings|Deductions)/i.test(row)) break;

    // Check if this row contains known employee slugs or has simple field structure
    const hasEmpSlug = empSlugs.some(s => row.includes(s));
    const hasSimpleField = /\{\{single\.\w+\}\}/i.test(row) && !/<table/i.test(row);

    if (hasEmpSlug || hasSimpleField) {
      const trEndMatch = row.match(/<\/tr>/i);
      if (trEndMatch) {
        lastInfoRowEnd = rowStart + trEndMatch.index + '</tr>'.length;
      }
    }
  }

  // Strategy 2: If nothing found, look for the last row in emp_details table
  if (lastInfoRowEnd === -1) {
    const empDetailsMatch = html.match(/<table[^>]*class=["'][^"']*emp_details[^"']*["'][^>]*>[\s\S]*?<\/table>/i);
    if (empDetailsMatch) {
      const endIdx = empDetailsMatch.index + empDetailsMatch[0].lastIndexOf('</table>');
      // Insert before the closing </table> of emp_details
      const lastTr = empDetailsMatch[0].lastIndexOf('</tr>');
      if (lastTr > -1) {
        lastInfoRowEnd = empDetailsMatch.index + lastTr + '</tr>'.length;
      }
    }
  }

  // Strategy 3: Find last simple <tr> before nested tables or #each
  if (lastInfoRowEnd === -1) {
    charOffset = 0;
    for (const row of rows) {
      const rowStart = charOffset;
      charOffset += row.length;
      if (!/<tr[\s>]/i.test(row)) continue;
      if (/<td[^>]*colspan/i.test(row) && /<table/i.test(row)) break;
      if (/\{\{#each/i.test(row)) break;
      if (/\{\{this\.\w+\}\}/i.test(row)) break;
      if (/<tr[\s>]/i.test(row) && !/<th[\s>]/i.test(row)) {
        const trEndMatch = row.match(/<\/tr>/i);
        if (trEndMatch) {
          lastInfoRowEnd = rowStart + trEndMatch.index + '</tr>'.length;
        }
      }
    }
  }

  return lastInfoRowEnd;
}

function buildInfoRowFromTemplate(templateRow, label, slug) {
  let newRow = templateRow;
  const cells = newRow.match(/<td[^>]*>[\s\S]*?<\/td>/gi);
  if (!cells || cells.length === 0) return templateRow;

  if (cells.length === 4) {
    newRow = replaceCellContent(newRow, cells[0], label);
    newRow = replaceCellContent(newRow, cells[1], slug);
    newRow = replaceCellContent(newRow, cells[2], '');
    newRow = replaceCellContent(newRow, cells[3], '');
  } else if (cells.length === 2) {
    newRow = replaceCellContent(newRow, cells[0], label);
    newRow = replaceCellContent(newRow, cells[1], slug);
  } else {
    newRow = replaceCellContent(newRow, cells[0], label);
    if (cells.length > 1) {
      newRow = replaceCellContent(newRow, cells[1], slug);
      for (let i = 2; i < cells.length; i++) {
        newRow = replaceCellContent(newRow, cells[i], '');
      }
    }
  }

  return '\n' + newRow;
}

/**
 * Try to fill an empty right-side pair in an existing 4-column info row.
 * Scans all info rows (before earnings/deductions) and finds the first row
 * where cells[2] and cells[3] are empty, then fills them with the new field.
 * Returns { html, description } if successful, or null if no empty slot found.
 */
function tryFillEmptySlot(html, label, slug) {
  const rows = html.split(/(?=<tr[\s>])/i);
  let charOffset = 0;

  for (let i = 0; i < rows.length; i++) {
    const rowStart = charOffset;
    charOffset += rows[i].length;

    if (!/<tr[\s>]/i.test(rows[i])) continue;
    if (/<th[\s>]/i.test(rows[i])) continue;
    if (/\{\{this\.\w+\}\}/i.test(rows[i])) continue;
    if (/\{\{#each/i.test(rows[i])) continue;
    // Stop at nested tables (earnings/deductions sections)
    if (/<td[^>]*colspan/i.test(rows[i]) && /<table/i.test(rows[i])) break;

    const trMatch = rows[i].match(/<tr[\s\S]*?<\/tr>/i);
    if (!trMatch) continue;

    const cells = trMatch[0].match(/<td[^>]*>[\s\S]*?<\/td>/gi);
    if (!cells || cells.length !== 4) continue;

    // Check if the right pair (cells 2-3) is empty
    const cell2Content = cells[2].replace(/<[^>]*>/g, '').replace(/\{\{[^}]*\}\}/g, '').trim();
    const cell3Content = cells[3].replace(/<[^>]*>/g, '').replace(/\{\{[^}]*\}\}/g, '').trim();

    if (!cell2Content && !cell3Content) {
      // Found an empty right pair — fill it
      function getTdTag(cell) {
        const m = cell.match(/<td([^>]*)>/i);
        return m ? `<td${m[1]}>` : '<td>';
      }
      const labelTd = getTdTag(cells[2]);
      const valueTd = getTdTag(cells[3]);
      const newLabelCell = `${labelTd}<strong>${label}</strong></td>`;
      const newValueCell = `${valueTd}${slug}</td>`;

      // Rebuild the row
      const origTr = trMatch[0];
      let newTr = origTr;
      newTr = newTr.replace(cells[2], newLabelCell);
      newTr = newTr.replace(cells[3], newValueCell);

      rows[i] = rows[i].replace(origTr, newTr);
      return {
        html: rows.join(''),
        description: `Added "${label}" (${slug}) to the right side of an existing row`,
      };
    }

    // Also check if the LEFT pair is empty (less common but possible)
    const cell0Content = cells[0].replace(/<[^>]*>/g, '').replace(/\{\{[^}]*\}\}/g, '').trim();
    const cell1Content = cells[1].replace(/<[^>]*>/g, '').replace(/\{\{[^}]*\}\}/g, '').trim();

    if (!cell0Content && !cell1Content) {
      function getTdTag2(cell) {
        const m = cell.match(/<td([^>]*)>/i);
        return m ? `<td${m[1]}>` : '<td>';
      }
      const labelTd = getTdTag2(cells[0]);
      const valueTd = getTdTag2(cells[1]);
      const newLabelCell = `${labelTd}<strong>${label}</strong></td>`;
      const newValueCell = `${valueTd}${slug}</td>`;

      const origTr = trMatch[0];
      let newTr = origTr;
      newTr = newTr.replace(cells[0], newLabelCell);
      newTr = newTr.replace(cells[1], newValueCell);

      rows[i] = rows[i].replace(origTr, newTr);
      return {
        html: rows.join(''),
        description: `Added "${label}" (${slug}) to the left side of an existing row`,
      };
    }
  }

  return null; // No empty slot found
}

function replaceCellContent(rowHtml, originalCell, newContent) {
  const hasStrong = /<strong>/i.test(originalCell);

  let newCell;
  if (hasStrong && newContent) {
    newCell = originalCell.replace(
      /(<td[^>]*>\s*(?:<[^>]*>)*\s*<strong>)[\s\S]*?(<\/strong>[\s\S]*?<\/td>)/i,
      `$1${newContent}$2`
    );
    if (newCell === originalCell) {
      newCell = originalCell.replace(/(<td[^>]*>)[\s\S]*?(<\/td>)/i, `$1<strong>${newContent}</strong>$2`);
    }
  } else {
    newCell = originalCell.replace(/(<td[^>]*>)[\s\S]*?(<\/td>)/i, `$1${newContent}$2`);
  }

  return rowHtml.replace(originalCell, newCell);
}

// ═══════════════════════════════════════════════════════════════════
// COMPACT HALF-EMPTY ROWS — merges rows that have one empty side
// ═══════════════════════════════════════════════════════════════════

function compactHalfEmptyRows(html) {
  const rows = html.split(/(?=<tr[\s>])/i);

  function isInfoRow(row) {
    if (!/<tr[\s>]/i.test(row)) return false;
    if (/<th[\s>]/i.test(row)) return false;
    if (/\{\{this\.\w+\}\}/i.test(row)) return false;
    if (/\{\{#each/i.test(row)) return false;
    if (/<td[^>]*colspan/i.test(row) && /<table/i.test(row)) return false;
    return true;
  }

  function getCells(row) {
    const trMatch = row.match(/<tr[\s\S]*?<\/tr>/i);
    if (!trMatch) return null;
    const cells = trMatch[0].match(/<td[^>]*>[\s\S]*?<\/td>/gi);
    if (!cells || cells.length !== 4) return null;
    return cells;
  }

  function cellIsEmpty(cell) {
    const stripped = cell.replace(/<[^>]*>/g, '').replace(/\{\{[^}]*\}\}/g, '').trim();
    return stripped.length === 0;
  }

  function getTdTag(cell) {
    const m = cell.match(/<td([^>]*)>/i);
    return m ? `<td${m[1]}>` : '<td>';
  }

  function getCellInnerHtml(cell) {
    const m = cell.match(/<td[^>]*>([\s\S]*?)<\/td>/i);
    return m ? m[1] : '';
  }

  // Scan for half-empty rows and merge them
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < rows.length; i++) {
      if (!isInfoRow(rows[i])) continue;
      const cellsA = getCells(rows[i]);
      if (!cellsA) continue;

      const aLeftEmpty = cellIsEmpty(cellsA[0]) && cellIsEmpty(cellsA[1]);
      const aRightEmpty = cellIsEmpty(cellsA[2]) && cellIsEmpty(cellsA[3]);
      if (!aLeftEmpty && !aRightEmpty) continue; // both sides have content
      if (aLeftEmpty && aRightEmpty) {
        // Completely empty row — remove it
        rows.splice(i, 1);
        changed = true;
        break;
      }

      // This row has one empty side — find another half-empty row to merge with
      for (let j = i + 1; j < rows.length; j++) {
        if (!isInfoRow(rows[j])) continue;
        const cellsB = getCells(rows[j]);
        if (!cellsB) continue;

        const bLeftEmpty = cellIsEmpty(cellsB[0]) && cellIsEmpty(cellsB[1]);
        const bRightEmpty = cellIsEmpty(cellsB[2]) && cellIsEmpty(cellsB[3]);
        if (!bLeftEmpty && !bRightEmpty) continue;
        if (bLeftEmpty && bRightEmpty) continue;

        // Can merge if one has empty-left and other has empty-right
        let leftCells, rightCells;
        if (aRightEmpty && bLeftEmpty) {
          // Row A has content on LEFT, Row B has content on RIGHT
          leftCells = [cellsA[0], cellsA[1]];
          rightCells = [cellsB[2], cellsB[3]];
        } else if (aLeftEmpty && bRightEmpty) {
          // Row A has content on RIGHT, Row B has content on LEFT
          leftCells = [cellsB[0], cellsB[1]];
          rightCells = [cellsA[2], cellsA[3]];
        } else {
          continue; // same side empty — can't merge
        }

        // Build merged row using Row A's <tr> tag and cell structure for styling
        const trTag = rows[i].match(/<tr[^>]*>/i);
        const trOpen = trTag ? trTag[0] : '<tr>';

        // Preserve td tags from row A but use content from the source
        const mergedLeft0 = `${getTdTag(cellsA[0])}${getCellInnerHtml(leftCells[0])}</td>`;
        const mergedLeft1 = `${getTdTag(cellsA[1])}${getCellInnerHtml(leftCells[1])}</td>`;
        const mergedRight0 = `${getTdTag(cellsA[2])}${getCellInnerHtml(rightCells[0])}</td>`;
        const mergedRight1 = `${getTdTag(cellsA[3])}${getCellInnerHtml(rightCells[1])}</td>`;

        const mergedRow = `${trOpen}\n            ${mergedLeft0}\n            ${mergedLeft1}\n            ${mergedRight0}\n            ${mergedRight1}\n        </tr>`;

        // Replace row A with merged, remove row B
        const origTr = rows[i].match(/<tr[\s\S]*?<\/tr>/i);
        if (origTr) {
          rows[i] = rows[i].replace(origTr[0], mergedRow);
        }
        rows.splice(j, 1);
        changed = true;
        break;
      }
      if (changed) break;
    }
  }

  return rows.join('');
}

// ═══════════════════════════════════════════════════════════════════
// ADD HANDLERS
// ═══════════════════════════════════════════════════════════════════

function addToSection(html, match, section) {
  const eachTag = section === 'earnings'
    ? '{{#each new_obj.earnings}}'
    : '{{#each new_obj.deductions}}';
  const endTag = '{{/each}}';

  const eachIdx = html.indexOf(eachTag);
  if (eachIdx === -1) {
    return { error: `Could not find the ${section} section in this template.` };
  }

  const endIdx = html.indexOf(endTag, eachIdx);
  if (endIdx === -1) {
    return { error: `Could not find the end of the ${section} loop.` };
  }

  const rowTemplate = extractRowTemplate(html, eachTag);

  let newRow;
  if (rowTemplate) {
    newRow = buildSectionRow(rowTemplate, match.label, match.slug);
  } else {
    newRow = `<tr><td style="font-weight:bold;">${match.label}</td><td style="text-align:right;">${match.slug}</td></tr>`;
  }

  const insertAt = endIdx + endTag.length;
  const newHtml = html.slice(0, insertAt) + '\n' + newRow + '\n' + html.slice(insertAt);

  return {
    html: newHtml,
    description: `Added "${match.label}" (${match.slug}) to ${section} section`,
  };
}

/**
 * Add a field to the RIGHT or LEFT side of an existing row (4-column layout).
 * In a 4-col layout [Label1][Value1][Label2][Value2]:
 *   - "right" fills the [Label2][Value2] pair
 *   - "left" fills the [Label1][Value1] pair
 * If the target side is occupied, creates a new row below with the field on that SAME side.
 */
function applyAddToSide(html, field, targetField, side) {
  const match = resolveField(field);
  if (!match) {
    return { error: `Could not find a matching slug for "${field}".` };
  }

  const targetMatch = resolveField(targetField);
  const searchTerms = [targetField];
  if (targetMatch) searchTerms.push(targetMatch.label, targetMatch.slug);

  const rows = html.split(/(?=<tr[\s>])/i);
  let targetIdx = -1;

  for (let i = 0; i < rows.length; i++) {
    if (!/<tr[\s>]/i.test(rows[i])) continue;
    if (/\{\{this\.\w+\}\}/i.test(rows[i])) continue;
    if (/<th[\s>]/i.test(rows[i])) continue;

    for (const term of searchTerms) {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(escaped, 'i').test(rows[i])) {
        targetIdx = i;
        break;
      }
    }
    if (targetIdx > -1) break;
  }

  if (targetIdx === -1) {
    return { error: `Could not find "${targetField}" in the template.` };
  }

  const targetRow = rows[targetIdx];
  const trContent = targetRow.match(/<tr[\s\S]*?<\/tr>/i);
  if (!trContent) {
    return { error: `Could not parse the row format for "${targetField}".` };
  }

  let rowHtml = trContent[0];
  const cells = rowHtml.match(/<td[^>]*>[\s\S]*?<\/td>/gi);

  if (!cells || cells.length < 4) {
    return applyAddAfter(html, field, targetField, null);
  }

  // Check which cells have actual content (not just tags)
  const cellHasContent = cells.map(cell => {
    const stripped = cell.replace(/<[^>]*>/g, '').replace(/\{\{[^}]*\}\}/g, '').trim();
    return stripped.length > 0;
  });

  // Extract the <td> tag with attributes (to preserve class/style)
  function getTdTag(cell) {
    const m = cell.match(/<td([^>]*)>/i);
    return m ? `<td${m[1]}>` : '<td>';
  }

  // Build a properly formatted cell pair for a side
  function buildCellPair(labelCell, valueCell, label, slug) {
    const labelTd = getTdTag(labelCell);
    const valueTd = getTdTag(valueCell);
    return {
      labelHtml: `${labelTd}<strong>${label}</strong></td>`,
      valueHtml: `${valueTd}${slug}</td>`,
    };
  }

  // Build an empty cell pair
  function buildEmptyCellPair(labelCell, valueCell) {
    const labelTd = getTdTag(labelCell);
    const valueTd = getTdTag(valueCell);
    return {
      labelHtml: `${labelTd}</td>`,
      valueHtml: `${valueTd}</td>`,
    };
  }

  const targetLabel = targetMatch ? targetMatch.label : targetField;

  if (side === 'right') {
    const rightEmpty = !cellHasContent[2] && !cellHasContent[3];
    if (rightEmpty) {
      // Fill the right pair of this row
      const rightPair = buildCellPair(cells[2], cells[3], match.label, match.slug);
      // Rebuild the row: keep left pair, replace right pair
      const trTag = rowHtml.match(/<tr[^>]*>/i)[0];
      const newRow = `${trTag}\n            ${cells[0]}\n            ${cells[1]}\n            ${rightPair.labelHtml}\n            ${rightPair.valueHtml}\n        </tr>`;
      rows[targetIdx] = targetRow.replace(trContent[0], newRow);
      return {
        html: rows.join(''),
        description: `Added "${match.label}" (${match.slug}) to the right of "${targetLabel}"`,
      };
    } else {
      // Right side occupied — scan ALL nearby info rows for an empty right side
      for (let scanIdx = targetIdx + 1; scanIdx < rows.length; scanIdx++) {
        if (!/<tr[\s>]/i.test(rows[scanIdx])) continue;
        if (/\{\{this\.\w+\}\}/i.test(rows[scanIdx])) continue;
        if (/<th[\s>]/i.test(rows[scanIdx])) continue;
        if (/<td[^>]*colspan/i.test(rows[scanIdx]) && /<table/i.test(rows[scanIdx])) break;
        if (/\{\{#each/i.test(rows[scanIdx])) break;

        const scanTrContent = rows[scanIdx].match(/<tr[\s\S]*?<\/tr>/i);
        if (!scanTrContent) continue;
        const scanCells = scanTrContent[0].match(/<td[^>]*>[\s\S]*?<\/td>/gi);
        if (!scanCells || scanCells.length < 4) continue;

        const scanRightHasContent = scanCells.slice(2).some(cell => {
          const stripped = cell.replace(/<[^>]*>/g, '').replace(/\{\{[^}]*\}\}/g, '').trim();
          return stripped.length > 0;
        });
        if (!scanRightHasContent) {
          // Fill the right side of this existing row
          const rightPair = buildCellPair(scanCells[2], scanCells[3], match.label, match.slug);
          const scanTrTag = scanTrContent[0].match(/<tr[^>]*>/i)[0];
          const updatedRow = `${scanTrTag}\n            ${scanCells[0]}\n            ${scanCells[1]}\n            ${rightPair.labelHtml}\n            ${rightPair.valueHtml}\n        </tr>`;
          rows[scanIdx] = rows[scanIdx].replace(scanTrContent[0], updatedRow);
          return {
            html: rows.join(''),
            description: `Added "${match.label}" (${match.slug}) on right side near "${targetLabel}"`,
          };
        }
      }
      // Fallback: create new row with field on RIGHT side, then compact
      const emptyLeft = buildEmptyCellPair(cells[0], cells[1]);
      const rightPair = buildCellPair(cells[2], cells[3], match.label, match.slug);
      const trTag = rowHtml.match(/<tr[^>]*>/i)[0];
      const newRow = `${trTag}\n            ${emptyLeft.labelHtml}\n            ${emptyLeft.valueHtml}\n            ${rightPair.labelHtml}\n            ${rightPair.valueHtml}\n        </tr>`;
      rows.splice(targetIdx + 1, 0, '\n' + newRow);
      const compacted = compactHalfEmptyRows(rows.join(''));
      return {
        html: compacted,
        description: `Added "${match.label}" (${match.slug}) on right side below "${targetLabel}"`,
      };
    }
  } else {
    // LEFT side
    const leftEmpty = !cellHasContent[0] && !cellHasContent[1];
    if (leftEmpty) {
      const leftPair = buildCellPair(cells[0], cells[1], match.label, match.slug);
      const trTag = rowHtml.match(/<tr[^>]*>/i)[0];
      const newRow = `${trTag}\n            ${leftPair.labelHtml}\n            ${leftPair.valueHtml}\n            ${cells[2]}\n            ${cells[3]}\n        </tr>`;
      rows[targetIdx] = targetRow.replace(trContent[0], newRow);
      return {
        html: rows.join(''),
        description: `Added "${match.label}" (${match.slug}) to the left of "${targetLabel}"`,
      };
    } else {
      // Left side occupied — scan ALL nearby info rows for an empty left side
      for (let scanIdx = targetIdx + 1; scanIdx < rows.length; scanIdx++) {
        if (!/<tr[\s>]/i.test(rows[scanIdx])) continue;
        if (/\{\{this\.\w+\}\}/i.test(rows[scanIdx])) continue;
        if (/<th[\s>]/i.test(rows[scanIdx])) continue;
        if (/<td[^>]*colspan/i.test(rows[scanIdx]) && /<table/i.test(rows[scanIdx])) break;
        if (/\{\{#each/i.test(rows[scanIdx])) break;

        const scanTrContent = rows[scanIdx].match(/<tr[\s\S]*?<\/tr>/i);
        if (!scanTrContent) continue;
        const scanCells = scanTrContent[0].match(/<td[^>]*>[\s\S]*?<\/td>/gi);
        if (!scanCells || scanCells.length < 4) continue;

        const scanLeftHasContent = scanCells.slice(0, 2).some(cell => {
          const stripped = cell.replace(/<[^>]*>/g, '').replace(/\{\{[^}]*\}\}/g, '').trim();
          return stripped.length > 0;
        });
        if (!scanLeftHasContent) {
          // Fill the left side of this existing row
          const leftPair = buildCellPair(scanCells[0], scanCells[1], match.label, match.slug);
          const scanTrTag = scanTrContent[0].match(/<tr[^>]*>/i)[0];
          const updatedRow = `${scanTrTag}\n            ${leftPair.labelHtml}\n            ${leftPair.valueHtml}\n            ${scanCells[2]}\n            ${scanCells[3]}\n        </tr>`;
          rows[scanIdx] = rows[scanIdx].replace(scanTrContent[0], updatedRow);
          return {
            html: rows.join(''),
            description: `Added "${match.label}" (${match.slug}) on left side near "${targetLabel}"`,
          };
        }
      }
      // Fallback: create new row with field on LEFT side, then compact
      const leftPair = buildCellPair(cells[0], cells[1], match.label, match.slug);
      const emptyRight = buildEmptyCellPair(cells[2], cells[3]);
      const trTag = rowHtml.match(/<tr[^>]*>/i)[0];
      const newRow = `${trTag}\n            ${leftPair.labelHtml}\n            ${leftPair.valueHtml}\n            ${emptyRight.labelHtml}\n            ${emptyRight.valueHtml}\n        </tr>`;
      rows.splice(targetIdx + 1, 0, '\n' + newRow);
      const compacted = compactHalfEmptyRows(rows.join(''));
      return {
        html: compacted,
        description: `Added "${match.label}" (${match.slug}) on left side below "${targetLabel}"`,
      };
    }
  }
}

function applyAddAfter(html, field, afterField, title) {
  const match = resolveField(field);
  if (!match) {
    return { error: `Could not find a matching slug for "${field}". Try: LOP, PAN, UAN, department, bank name, etc.\nYou can also use: "add 'Your Title' as <slug> below <field>"` };
  }

  const displayLabel = title || match.label;
  const afterMatch = resolveField(afterField);

  const searchTerms = [afterField];
  if (afterMatch) {
    searchTerms.push(afterMatch.label, afterMatch.slug);
  }

  const rows = html.split(/(?=<tr[\s>])/i);
  let targetIdx = -1;

  for (let i = 0; i < rows.length; i++) {
    if (!/<tr[\s>]/i.test(rows[i])) continue;
    if (/\{\{this\.\w+\}\}/i.test(rows[i])) continue;
    if (/<th[\s>]/i.test(rows[i])) continue;

    for (const term of searchTerms) {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(escaped, 'i').test(rows[i])) {
        targetIdx = i;
        break;
      }
    }
    if (targetIdx > -1) break;
  }

  if (targetIdx === -1) {
    return { error: `Could not find "${afterField}" in the template to insert after.` };
  }

  const targetRow = rows[targetIdx];
  const trContent = targetRow.match(/<tr[\s\S]*?<\/tr>/i);
  if (!trContent) {
    return { error: `Could not parse the row format for "${afterField}".` };
  }

  // "below/above" = always create a NEW row. Never modify the target row.
  let newRow = trContent[0];
  const cells = newRow.match(/<td[^>]*>[\s\S]*?<\/td>/gi);
  if (cells && cells.length > 0) {
    const cellAnalysis = cells.map(cell => {
      const hasSlug = /\{\{[^}]+\}\}/.test(cell);
      const textContent = cell.replace(/<[^>]*>/g, '').trim();
      return { cell, hasSlug, textContent };
    });

    let valueSuffix = '';
    const afterLabelText = (afterMatch ? afterMatch.label : afterField).toLowerCase();
    let afterFieldCellIdx = -1;
    for (let ci = 0; ci < cellAnalysis.length; ci++) {
      if (cellAnalysis[ci].textContent.toLowerCase().includes(afterLabelText)) {
        afterFieldCellIdx = ci;
        break;
      }
    }
    if (afterFieldCellIdx >= 0 && afterFieldCellIdx + 1 < cellAnalysis.length) {
      const valueCa = cellAnalysis[afterFieldCellIdx + 1];
      if (valueCa.hasSlug) {
        const suffixMatch = valueCa.textContent.match(/\{\{[^}]+\}\}\s*(.+)/);
        if (suffixMatch) valueSuffix = ' ' + suffixMatch[1].trim();
      }
    }
    if (!valueSuffix) {
      for (const ca of cellAnalysis) {
        if (ca.hasSlug) {
          const suffixMatch = ca.textContent.match(/\{\{[^}]+\}\}\s*(.+)/);
          if (suffixMatch) { valueSuffix = ' ' + suffixMatch[1].trim(); break; }
        }
      }
    }

    const slugValue = match.slug + valueSuffix;

    if (cells.length === 4) {
      const cell0HasSlug = cellAnalysis[0].hasSlug;
      const cell1HasSlug = cellAnalysis[1].hasSlug;
      const cell2HasSlug = cellAnalysis[2].hasSlug;
      const cell3HasSlug = cellAnalysis[3].hasSlug;

      if (!cell0HasSlug && cell1HasSlug && !cell2HasSlug && cell3HasSlug) {
        newRow = replaceCellContent(newRow, cells[0], displayLabel);
        newRow = replaceCellContent(newRow, cells[1], slugValue);
        newRow = replaceCellContent(newRow, cells[2], '');
        newRow = replaceCellContent(newRow, cells[3], '');
      } else {
        newRow = replaceCellContent(newRow, cells[0], displayLabel);
        for (let i = 1; i < cells.length; i++) {
          const value = (i === cells.length - 1) ? slugValue : '';
          newRow = replaceCellContent(newRow, cells[i], value);
        }
      }
    } else if (cells.length === 2) {
      newRow = replaceCellContent(newRow, cells[0], displayLabel);
      newRow = replaceCellContent(newRow, cells[1], slugValue);
    } else {
      newRow = replaceCellContent(newRow, cells[0], displayLabel);
      for (let i = 1; i < cells.length; i++) {
        const value = (i === cells.length - 1) ? slugValue : '';
        newRow = replaceCellContent(newRow, cells[i], value);
      }
    }
  }

  rows.splice(targetIdx + 1, 0, newRow + '\n');

  // Compact any half-empty rows that resulted from the insertion
  const compacted = compactHalfEmptyRows(rows.join(''));

  return {
    html: compacted,
    description: `Added "${displayLabel}" (${match.slug}) below "${afterMatch ? afterMatch.label : afterField}"`,
  };
}

function applyAddBefore(html, field, beforeField, title) {
  const match = resolveField(field);
  if (!match) {
    return { error: `Could not find a matching slug for "${field}". Try: LOP, PAN, UAN, department, bank name, etc.\nYou can also use: "add 'Your Title' as <slug> above <field>"` };
  }

  const displayLabel = title || match.label;
  const beforeMatch = resolveField(beforeField);

  const searchTerms = [beforeField];
  if (beforeMatch) {
    searchTerms.push(beforeMatch.label, beforeMatch.slug);
  }

  const rows = html.split(/(?=<tr[\s>])/i);
  let targetIdx = -1;

  for (let i = 0; i < rows.length; i++) {
    if (!/<tr[\s>]/i.test(rows[i])) continue;
    if (/\{\{this\.\w+\}\}/i.test(rows[i])) continue;
    if (/<th[\s>]/i.test(rows[i])) continue;

    for (const term of searchTerms) {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(escaped, 'i').test(rows[i])) {
        targetIdx = i;
        break;
      }
    }
    if (targetIdx > -1) break;
  }

  if (targetIdx === -1) {
    return { error: `Could not find "${beforeField}" in the template to insert before.` };
  }

  const targetRow = rows[targetIdx];
  const trContent = targetRow.match(/<tr[\s\S]*?<\/tr>/i);
  if (!trContent) {
    return { error: `Could not parse the row format for "${beforeField}".` };
  }

  let newRow = trContent[0];
  const cells = newRow.match(/<td[^>]*>[\s\S]*?<\/td>/gi);
  if (cells && cells.length > 0) {
    const cellAnalysis = cells.map(cell => {
      const hasSlug = /\{\{[^}]+\}\}/.test(cell);
      const textContent = cell.replace(/<[^>]*>/g, '').trim();
      return { cell, hasSlug, textContent };
    });

    let valueSuffix = '';
    const beforeLabelText = (beforeMatch ? beforeMatch.label : beforeField).toLowerCase();
    let beforeFieldCellIdx = -1;
    for (let ci = 0; ci < cellAnalysis.length; ci++) {
      if (cellAnalysis[ci].textContent.toLowerCase().includes(beforeLabelText)) {
        beforeFieldCellIdx = ci;
        break;
      }
    }
    if (beforeFieldCellIdx >= 0 && beforeFieldCellIdx + 1 < cellAnalysis.length) {
      const valueCa = cellAnalysis[beforeFieldCellIdx + 1];
      if (valueCa.hasSlug) {
        const suffixMatch = valueCa.textContent.match(/\{\{[^}]+\}\}\s*(.+)/);
        if (suffixMatch) valueSuffix = ' ' + suffixMatch[1].trim();
      }
    }
    if (!valueSuffix) {
      for (const ca of cellAnalysis) {
        if (ca.hasSlug) {
          const suffixMatch = ca.textContent.match(/\{\{[^}]+\}\}\s*(.+)/);
          if (suffixMatch) { valueSuffix = ' ' + suffixMatch[1].trim(); break; }
        }
      }
    }

    const slugValue = match.slug + valueSuffix;

    if (cells.length === 4) {
      const cell0HasSlug = cellAnalysis[0].hasSlug;
      const cell1HasSlug = cellAnalysis[1].hasSlug;
      const cell2HasSlug = cellAnalysis[2].hasSlug;
      const cell3HasSlug = cellAnalysis[3].hasSlug;

      if (!cell0HasSlug && cell1HasSlug && !cell2HasSlug && cell3HasSlug) {
        newRow = replaceCellContent(newRow, cells[0], displayLabel);
        newRow = replaceCellContent(newRow, cells[1], slugValue);
        newRow = replaceCellContent(newRow, cells[2], '');
        newRow = replaceCellContent(newRow, cells[3], '');
      } else {
        newRow = replaceCellContent(newRow, cells[0], displayLabel);
        for (let i = 1; i < cells.length; i++) {
          const value = (i === cells.length - 1) ? slugValue : '';
          newRow = replaceCellContent(newRow, cells[i], value);
        }
      }
    } else if (cells.length === 2) {
      newRow = replaceCellContent(newRow, cells[0], displayLabel);
      newRow = replaceCellContent(newRow, cells[1], slugValue);
    } else {
      newRow = replaceCellContent(newRow, cells[0], displayLabel);
      for (let i = 1; i < cells.length; i++) {
        const value = (i === cells.length - 1) ? slugValue : '';
        newRow = replaceCellContent(newRow, cells[i], value);
      }
    }
  }

  rows.splice(targetIdx, 0, newRow + '\n');

  // Compact any half-empty rows that resulted from the insertion
  const compacted = compactHalfEmptyRows(rows.join(''));

  return {
    html: compacted,
    description: `Added "${displayLabel}" (${match.slug}) above "${beforeMatch ? beforeMatch.label : beforeField}"`,
  };
}

function applyAdd(html, field, section, title) {
  if (/logo/i.test(field) && !section) {
    return applyAddLogo(html);
  }

  const match = resolveField(field);

  if (!match) {
    return { error: `Could not find a matching slug for "${field}". Available fields include: LOP, PAN, Aadhaar, UAN, ESI, PF, bank details, department, designation, overtime, arrears, advance, loan, etc.\n\nTip: You can also add entire categories: "add all bank details", "add all statutory ids"` };
  }

  const effectiveMatch = title ? { ...match, label: title } : match;

  if (section === 'earnings' || section === 'deductions') {
    return addToSection(html, effectiveMatch, section);
  }

  // Special sections
  if (match.slug === 'reimbursement_section') {
    const sectionHtml = `
    <tr>
      <td colspan="8" style="padding:0">
        <table cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse;">
          <thead>
            <tr class="earnings-header">
              <th colspan="8" style="text-align:center; padding:10px; border:1px solid lightgray;">Reimbursements</th>
            </tr>
            <tr class="earnings-header">
              <th style="border-right:1px solid lightgray; padding:5px;">Description</th>
              <th style="text-align:right; padding:5px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            {{#each new_obj.reimbursment}}
            <tr style="border-bottom:1px solid lightgray;">
              <td style="border-right:1px solid lightgray; font-weight:bold;">{{this.HEAD_NAME}}</td>
              <td style="text-align:right;">{{this.monthly_payable}}</td>
            </tr>
            {{/each}}
          </tbody>
        </table>
      </td>
    </tr>`;
    const insertPoint = html.lastIndexOf('</tbody>');
    if (insertPoint > -1) {
      const newHtml = html.slice(0, insertPoint) + sectionHtml + html.slice(insertPoint);
      return { html: newHtml, description: `Added Reimbursement section to the template` };
    }
  }

  if (match.slug === 'ytd_section' || match.slug === 'yearly_section') {
    const sectionHtml = `
    <tr>
      <td colspan="8" style="padding:0">
        <table cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse;">
          <thead>
            <tr class="earnings-header">
              <th colspan="4" style="text-align:center; padding:10px; border:1px solid lightgray;">Yearly Summary</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom:1px solid lightgray;">
              <td style="border-right:1px solid lightgray; font-weight:bold; width:50%;">YTD Earnings</td>
              <td style="text-align:right; width:50%;">{{new_obj.ytd_sum_err}}</td>
            </tr>
            <tr style="border-bottom:1px solid lightgray;">
              <td style="border-right:1px solid lightgray; font-weight:bold;">YTD Deductions</td>
              <td style="text-align:right;">{{new_obj.ytd_sum_ded}}</td>
            </tr>
            <tr style="border-bottom:1px solid lightgray;">
              <td style="border-right:1px solid lightgray; font-weight:bold;">Yearly CTC</td>
              <td style="text-align:right;">{{new_obj.yearly_ctc_gross}}</td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>`;
    const insertPoint = html.lastIndexOf('</tbody>');
    if (insertPoint > -1) {
      const newHtml = html.slice(0, insertPoint) + sectionHtml + html.slice(insertPoint);
      return { html: newHtml, description: `Added Yearly Summary section to the template` };
    }
  }

  // Standard field — add to employee info section
  // FIRST: try to fill an empty right/left slot in an existing row (no blank cells)
  const slotResult = tryFillEmptySlot(html, effectiveMatch.label, effectiveMatch.slug);
  if (slotResult) {
    return slotResult;
  }

  // No empty slot — create a new row
  const infoRow = findExistingInfoRow(html);
  let newRow;
  if (infoRow) {
    newRow = buildInfoRowFromTemplate(infoRow, effectiveMatch.label, effectiveMatch.slug);
  } else {
    newRow = `\n        <tr class="with-border">\n            <td class="no-right-border"><strong>${effectiveMatch.label}</strong></td>\n            <td class="no-right-border1">${effectiveMatch.slug}</td>\n            <td class="no-right-border"></td>\n            <td class="border-collapse"></td>\n        </tr>`;
  }

  // For dual nested table templates, route to the shorter sub-table then auto-balance
  const dualPoints = findDualNestedTableInsertPoints(html);
  if (dualPoints) {
    const [left, right] = dualPoints;
    const target = left.rowCount <= right.rowCount ? left : right;
    const inserted = html.slice(0, target.insertPoint) + newRow + html.slice(target.insertPoint);
    return { html: autoBalanceDualNestedTables(inserted), description: `Added "${effectiveMatch.label}" (${effectiveMatch.slug}) to employee info section` };
  }

  // Use smart insert point — BEFORE any nested earnings/deductions tables
  const insertPoint = findEmployeeInfoInsertPoint(html);
  if (insertPoint > -1) {
    const newHtml = html.slice(0, insertPoint) + newRow + html.slice(insertPoint);
    return { html: newHtml, description: `Added "${effectiveMatch.label}" (${effectiveMatch.slug}) to employee info section` };
  }

  // Fallback: insert before the first nested table row
  const nestedTableRow = html.match(/<tr[^>]*>\s*<td[^>]*colspan[^>]*>\s*<table/i);
  if (nestedTableRow) {
    const newHtml = html.slice(0, nestedTableRow.index) + newRow + '\n    ' + html.slice(nestedTableRow.index);
    return { html: newHtml, description: `Added "${effectiveMatch.label}" (${effectiveMatch.slug}) to employee info section` };
  }

  // Last resort: before last </tbody>
  const lastIdx = html.lastIndexOf('</tbody>');
  if (lastIdx > -1) {
    const newHtml = html.slice(0, lastIdx) + newRow + '\n    ' + html.slice(lastIdx);
    return { html: newHtml, description: `Added "${effectiveMatch.label}" (${effectiveMatch.slug}) to the template` };
  }

  return { error: `Could not find a suitable location to add "${field}" in the template.` };
}

function applyStyle(html, property, value) {
  return applyStyleGlobal(html, property, value);
}

function applyAddTop(html, field) {
  if (/logo/i.test(field)) {
    return applyAddLogo(html);
  }

  let match = resolveField(field);
  if (!match) {
    const rawSlugMatch = field.match(/\{\{[^}]+\}\}/);
    if (rawSlugMatch) {
      const slugName = rawSlugMatch[0]
        .replace(/\{\{|\}\}/g, '')
        .split('.').pop()
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
      match = { label: slugName, slug: rawSlugMatch[0] };
    }
  }
  if (!match) {
    return { error: `Could not find a matching slug for "${field}".` };
  }

  const firstTrMatch = html.match(/<table[^>]*class="[^"]*main[^"]*"[^>]*>\s*<tbody>\s*/i);
  if (firstTrMatch) {
    const insertAt = firstTrMatch.index + firstTrMatch[0].length;
    const infoRow = findExistingInfoRow(html);
    let newRow;
    if (infoRow) {
      newRow = buildInfoRowFromTemplate(infoRow, match.label, match.slug);
    } else {
      newRow = `\n    <tr>\n      <td class="bordered-cell"><strong>${match.label}</strong></td>\n      <td class="bordered-cell">${match.slug}</td>\n      <td class="sub-header-cell"></td>\n      <td class="sub-header-cell1"></td>\n    </tr>`;
    }
    const newHtml = html.slice(0, insertAt) + newRow + '\n    ' + html.slice(insertAt);
    return { html: newHtml, description: `Added "${match.label}" (${match.slug}) at the top of the template` };
  }

  const tbodyStart = html.indexOf('<tbody>');
  if (tbodyStart > -1) {
    const insertAt = tbodyStart + '<tbody>'.length;
    const newRow = `\n    <tr>\n      <td class="bordered-cell"><strong>${match.label}</strong></td>\n      <td class="bordered-cell" colspan="3">${match.slug}</td>\n    </tr>`;
    const newHtml = html.slice(0, insertAt) + newRow + html.slice(insertAt);
    return { html: newHtml, description: `Added "${match.label}" (${match.slug}) at the top of the template` };
  }

  return { error: `Could not find a suitable location to add "${field}" at the top.` };
}

function applyAddLogo(html) {
  if (/<img[^>]*(?:hrms_logo_url|ORG_LOGO)/i.test(html)) {
    return { html, description: 'Logo is already present in the template.' };
  }

  const logoHtml = `<p style="text-align:left; border:0; padding:5px;"><img src="{{hrms_logo_url}}{{org_details.ORG_LOGO}}" width="100" /></p>\n`;
  const bodyIdx = html.indexOf('<body>');
  if (bodyIdx > -1) {
    const insertAt = bodyIdx + '<body>'.length;
    const newHtml = html.slice(0, insertAt) + '\n' + logoHtml + html.slice(insertAt);
    return { html: newHtml, description: 'Added company logo at the top of the template' };
  }

  const firstTable = html.indexOf('<table');
  if (firstTable > -1) {
    const newHtml = html.slice(0, firstTable) + logoHtml + html.slice(firstTable);
    return { html: newHtml, description: 'Added company logo at the top of the template' };
  }

  return { html: logoHtml + html, description: 'Added company logo at the top of the template' };
}

// ═══════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════════

function processCommand(templateHtml, userCommand) {
  const parsed = parseCommand(userCommand);
  const result = applyCommand(templateHtml, parsed);
  return {
    ...result,
    parsed,
  };
}

module.exports = { processCommand, parseCommand, applyCommand, buildAIContext, getAllSlugs };
