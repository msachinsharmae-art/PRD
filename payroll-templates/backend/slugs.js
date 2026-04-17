/**
 * All available payroll template slugs organized by category.
 * These are Handlebars variables that can be used in salary slip templates.
 */

const SLUG_CATEGORIES = {
  employee_info: {
    label: "Employee Information",
    slugs: [
      { slug: "{{single.emp_id}}", description: "Employee ID" },
      { slug: "{{single.emp_code}}", description: "Employee Code" },
      { slug: "{{single.emp_name}}", description: "Employee Name" },
      { slug: "{{single.emp_email}}", description: "Employee Email" },
      { slug: "{{single.email_id}}", description: "Email ID" },
      { slug: "{{single.mobile_no}}", description: "Mobile Number" },
      { slug: "{{single.gender}}", description: "Gender" },
      { slug: "{{single.date_of_birth}}", description: "Date of Birth" },
      { slug: "{{single.anniversary_date}}", description: "Anniversary Date" },
      { slug: "{{single.joining_date}}", description: "Joining Date" },
      { slug: "{{single.last_working_date}}", description: "Last Working Date" },
      { slug: "{{single.department_name}}", description: "Department Name" },
      { slug: "{{single.designation_name}}", description: "Designation Name" },
      { slug: "{{single.location_name}}", description: "Location Name" },
      { slug: "{{single.state_name}}", description: "State Name" },
      { slug: "{{single.FATHER_NAME}}", description: "Father's Name" },
      { slug: "{{single.father_name}}", description: "Father Name" },
      { slug: "{{single.EMP_GRADE}}", description: "Employee Grade" },
      { slug: "{{single.GRADE_NAME}}", description: "Grade Name" },
      { slug: "{{single.SKILL_LEVEL}}", description: "Skill Level" },
      { slug: "{{single.ADDRESS}}", description: "Address" },
      { slug: "{{single.emp_address}}", description: "Employee Address" },
      { slug: "{{single.NATIONALITY}}", description: "Nationality" },
      { slug: "{{single.nationality}}", description: "Nationality (alt)" },
      { slug: "{{single.business_unit}}", description: "Business Unit" },
      { slug: "{{single.bussiness_code}}", description: "Business Code" },
      { slug: "{{single.business_unit_main_name}}", description: "Business Unit Main Name" },
      { slug: "{{single.BUSINESS_NAME}}", description: "Business Name" },
      { slug: "{{single.SUB_DEPT_NAME}}", description: "Sub Department Name" },
      { slug: "{{single.BRANCH_CITY}}", description: "Branch City" },
      { slug: "{{single.BRANCH_LOCATION}}", description: "Branch Location" },
      { slug: "{{single.ZONE_NAME}}", description: "Zone Name" },
      { slug: "{{single.entity_name}}", description: "Entity Name" },
      { slug: "{{single.empDep}}", description: "Employee Department" },
      { slug: "{{single.empDes}}", description: "Employee Designation" },
      { slug: "{{single.empLoc}}", description: "Employee Location" },
    ]
  },

  statutory_ids: {
    label: "Statutory & ID Numbers",
    slugs: [
      { slug: "{{single.PAN_CARD}}", description: "PAN Card Number" },
      { slug: "{{single.pan}}", description: "PAN (alt)" },
      { slug: "{{single.AADHAR_CARD}}", description: "Aadhaar Card Number" },
      { slug: "{{single.aadhaar_no}}", description: "Aadhaar Number (alt)" },
      { slug: "{{single.UAN_NUMBER}}", description: "UAN Number" },
      { slug: "{{single.uan}}", description: "UAN (alt)" },
      { slug: "{{single.ESI_NUMBER}}", description: "ESI Number" },
      { slug: "{{single.esi}}", description: "ESI (alt)" },
      { slug: "{{single.PF_NUMBER}}", description: "PF Number" },
      { slug: "{{single.pf}}", description: "PF (alt)" },
      { slug: "{{single.PASSPORT_NUMBER}}", description: "Passport Number" },
      { slug: "{{single.IBAN_NUMBER}}", description: "IBAN Number" },
      { slug: "{{single.ENFORCE_ESI_TILL}}", description: "Enforce ESI Till" },
      { slug: "{{single.work_permit}}", description: "Work Permit" },
    ]
  },

  bank_details: {
    label: "Bank Details",
    slugs: [
      { slug: "{{single.ACCOUNT_NUMBER}}", description: "Account Number" },
      { slug: "{{single.ACCOUNT_HOLDER_NAME}}", description: "Account Holder Name" },
      { slug: "{{single.BANK_NAME}}", description: "Bank Name" },
      { slug: "{{single.ACCOUNT_TYPE}}", description: "Account Type" },
      { slug: "{{single.IFSC_CODE}}", description: "IFSC Code" },
      { slug: "{{single.PAYMENT_TYPE}}", description: "Payment Type" },
    ]
  },

  payroll_period: {
    label: "Payroll Period & Dates",
    slugs: [
      { slug: "{{single.PAYROLL_MONTH}}", description: "Payroll Month" },
      { slug: "{{single.PAYROLL_YEAR}}", description: "Payroll Year" },
      { slug: "{{single.PAYROLL_MONTH_YEAR}}", description: "Payroll Month-Year" },
      { slug: "{{single.PAYROLL_RUN_DATE}}", description: "Payroll Run Date" },
      { slug: "{{single.PAID_MONTH_YEAR}}", description: "Paid Month-Year" },
      { slug: "{{single.PAY_CYCLE}}", description: "Pay Cycle" },
      { slug: "{{single.financial_year}}", description: "Financial Year" },
      { slug: "{{single.APPLICABLE_FROM}}", description: "Applicable From" },
      { slug: "{{month}}", description: "Month Name" },
      { slug: "{{month_caps}}", description: "Month Name (Caps)" },
      { slug: "{{year}}", description: "Year" },
      { slug: "{{month_sh}}", description: "Month Short" },
      { slug: "{{year_sh}}", description: "Year Short" },
      { slug: "{{issue_date}}", description: "Issue Date" },
      { slug: "{{single.CREATED_BY}}", description: "Created By" },
      { slug: "{{single.CREATED_ON}}", description: "Created On" },
      { slug: "{{single.UPDATED_ON}}", description: "Updated On" },
    ]
  },

  attendance_days: {
    label: "Attendance & Days",
    slugs: [
      { slug: "{{single.DAYS_IN_MONTH}}", description: "Days in Month" },
      { slug: "{{single.WORKING_DAYS}}", description: "Working Days" },
      { slug: "{{single.workingDays}}", description: "Working Days (alt)" },
      { slug: "{{single.PRESENT_DAYS}}", description: "Present Days" },
      { slug: "{{single.actual_present_days}}", description: "Actual Present Days" },
      { slug: "{{single.PRESENT_COUNT}}", description: "Present Count" },
      { slug: "{{single.EMP_LEAVES}}", description: "Employee Leaves" },
      { slug: "{{single.PAYROLL_DAYS}}", description: "Payroll Days" },
      { slug: "{{single.PAYABLE_DAYS}}", description: "Payable Days" },
      { slug: "{{single.paid_days}}", description: "Paid Days" },
      { slug: "{{single.payable}}", description: "Payable" },
      { slug: "{{single.ARREAR_DAYS}}", description: "Arrear Days" },
      { slug: "{{single.EXTRA_DAYS}}", description: "Extra Days" },
      { slug: "{{single.LWP}}", description: "Loss of Pay Days" },
      { slug: "{{single.lwp}}", description: "LOP (alt)" },
      { slug: "{{single.ABSENCE_DAYS}}", description: "Absence Days" },
      { slug: "{{single.NCP_DAYS}}", description: "NCP Days" },
      { slug: "{{single.ncp_days}}", description: "NCP Days (alt)" },
      { slug: "{{single.LATE_DAYS}}", description: "Late Days" },
      { slug: "{{single.EARLY_DAYS}}", description: "Early Days" },
      { slug: "{{single.HALF_DEDUCT}}", description: "Half Day Deductions" },
      { slug: "{{single.WEEKLY_OFF}}", description: "Weekly Off" },
      { slug: "{{single.HOLIDAYS}}", description: "Holidays" },
      { slug: "{{single.week_off_plus_holiday}}", description: "Week Off + Holiday" },
      { slug: "{{single.TOTAL_PENALTY_DAYS}}", description: "Total Penalty Days" },
      { slug: "{{single.penalized_day_count}}", description: "Penalized Day Count" },
      { slug: "{{single.LESS_MIN_WORKS}}", description: "Less Min Works" },
      { slug: "{{single.lop_present_days}}", description: "LOP Present Days" },
      { slug: "{{single.LEAVE_PAY_DAYS}}", description: "Leave Pay Days" },
      { slug: "{{single.LEAVE_PAY_AMOUNT}}", description: "Leave Pay Amount" },
      { slug: "{{single.WORKING_HR_IN_A_DAY}}", description: "Working Hours in a Day" },
      { slug: "{{month_days}}", description: "Month Days" },
      { slug: "{{payment_days}}", description: "Payment Days" },
    ]
  },

  salary_amounts: {
    label: "Salary & Amounts",
    slugs: [
      { slug: "{{single.GROSS_SALARY}}", description: "Gross Salary" },
      { slug: "{{single.NET_SALARY}}", description: "Net Salary" },
      { slug: "{{single.FREEZED_CTC}}", description: "Freezed CTC" },
      { slug: "{{single.MONTHLY_CTC}}", description: "Monthly CTC" },
      { slug: "{{single.YEARLY_FREEZED_CTC}}", description: "Yearly Freezed CTC" },
      { slug: "{{single.EARNED_CTC}}", description: "Earned CTC" },
      { slug: "{{single.PAYCUT_AMOUNT}}", description: "Paycut Amount" },
      { slug: "{{single.DEDUCTION}}", description: "Total Deduction" },
      { slug: "{{single.MIN_WAGES}}", description: "Minimum Wages" },
      { slug: "{{single.emp_basic}}", description: "Employee Basic" },
      { slug: "{{single.total_flexi_amount}}", description: "Total Flexi Amount" },
      { slug: "{{single.SALARY_SLIP}}", description: "Salary Slip ID" },
      { slug: "{{single.P_STATUS}}", description: "Payment Status" },
      { slug: "{{single.invoice_no}}", description: "Invoice Number" },
      { slug: "{{single.amount_in_words}}", description: "Amount in Words" },
      { slug: "{{single.currency_str}}", description: "Currency String" },
      { slug: "{{single.sub_currency_str}}", description: "Sub Currency String" },
      { slug: "{{single.ABBREVIATION}}", description: "Currency Abbreviation" },
      { slug: "{{single.SYMBOL}}", description: "Currency Symbol" },
    ]
  },

  statutory_deductions: {
    label: "Statutory Deductions",
    slugs: [
      { slug: "{{single.PT}}", description: "Professional Tax" },
      { slug: "{{single.TDS}}", description: "TDS" },
      { slug: "{{single.LWF}}", description: "LWF" },
      { slug: "{{single.STATUTORY_BONUS}}", description: "Statutory Bonus" },
      { slug: "{{single.PF_WAGES}}", description: "PF Wages" },
      { slug: "{{single.EPF_WAGES}}", description: "EPF Wages" },
      { slug: "{{single.EPS_WAGES}}", description: "EPS Wages" },
      { slug: "{{single.EDLI_WAGES}}", description: "EDLI Wages" },
      { slug: "{{single.ESIC_WAGES}}", description: "ESIC Wages" },
      { slug: "{{single.PT_WAGES}}", description: "PT Wages" },
      { slug: "{{single.LOAN}}", description: "Loan Deduction" },
      { slug: "{{single.ADVANCE}}", description: "Advance Deduction" },
      { slug: "{{single.MISS_DED}}", description: "Missed Deduction" },
      { slug: "{{single.MISS_EARN}}", description: "Missed Earning" },
    ]
  },

  overtime: {
    label: "Overtime",
    slugs: [
      { slug: "{{single.OT}}", description: "OT Amount" },
      { slug: "{{single.OT_DAYS}}", description: "OT Days" },
      { slug: "{{single.EXTRA_OT_AMOUNT}}", description: "Extra OT Amount" },
      { slug: "{{single.EXTRA_OT}}", description: "Extra OT" },
      { slug: "{{single.std_ot_rate}}", description: "Standard OT Rate" },
      { slug: "{{single.wo_ot_rate}}", description: "Week Off OT Rate" },
      { slug: "{{single.std_ot}}", description: "Standard OT" },
      { slug: "{{single.wo_ot}}", description: "Week Off OT" },
    ]
  },

  computed_totals: {
    label: "Computed Totals (new_obj)",
    slugs: [
      { slug: "{{new_obj.gross}}", description: "Gross Total" },
      { slug: "{{new_obj.deduction}}", description: "Total Deductions" },
      { slug: "{{new_obj.net_payable}}", description: "Net Payable" },
      { slug: "{{new_obj.actual_net_amount}}", description: "Actual Net Amount" },
      { slug: "{{new_obj.amount_in_words}}", description: "Amount in Words" },
      { slug: "{{new_obj.actual_net_amount_in_words}}", description: "Actual Net Amount in Words" },
      { slug: "{{new_obj.ctc_gross}}", description: "CTC Gross" },
      { slug: "{{new_obj.ctc_deduction}}", description: "CTC Deduction" },
      { slug: "{{new_obj.arrear_gross}}", description: "Arrear Gross" },
      { slug: "{{new_obj.arrear_deduction}}", description: "Arrear Deduction" },
      { slug: "{{new_obj.arrear_days}}", description: "Arrear Days" },
      { slug: "{{new_obj.total_reim_amount}}", description: "Total Reimbursement" },
      { slug: "{{new_obj.gross_without_basic}}", description: "Gross Without Basic" },
      { slug: "{{new_obj.yearly_ctc_gross}}", description: "Yearly CTC Gross" },
      { slug: "{{new_obj.yearly_ctc_deduction}}", description: "Yearly CTC Deduction" },
      { slug: "{{new_obj.yearly_net_ctc}}", description: "Yearly Net CTC" },
      { slug: "{{new_obj.has_leave_balance}}", description: "Has Leave Balance" },
      { slug: "{{new_obj.tds_plan}}", description: "TDS Plan" },
      { slug: "{{new_obj.total_leave_taken}}", description: "Total Leave Taken" },
      { slug: "{{new_obj.total_leave_balance}}", description: "Total Leave Balance" },
      { slug: "{{new_obj.total_loan_recovered}}", description: "Total Loan Recovered" },
      { slug: "{{new_obj.total_loan_balance}}", description: "Total Loan Balance" },
      { slug: "{{new_obj.total_tds_amount}}", description: "Total TDS Amount" },
      { slug: "{{new_obj.total_comp}}", description: "Total Compliance" },
      { slug: "{{new_obj.ytd_sum_err}}", description: "YTD Sum Earnings" },
      { slug: "{{new_obj.ytd_sum_ded}}", description: "YTD Sum Deductions" },
    ]
  },

  iterables: {
    label: "Iterable Sections (Loop Data)",
    slugs: [
      { slug: "{{#each new_obj.earnings}}...{{/each}}", description: "Earnings Loop" },
      { slug: "{{#each new_obj.deductions}}...{{/each}}", description: "Deductions Loop" },
      { slug: "{{#each new_obj.compliance}}...{{/each}}", description: "Compliance Loop" },
      { slug: "{{#each new_obj.reimbursment}}...{{/each}}", description: "Reimbursement Loop" },
      { slug: "{{#each new_obj.leave_arr}}...{{/each}}", description: "Leave Array Loop" },
      { slug: "{{#each new_obj.expenses}}...{{/each}}", description: "Expenses Loop" },
      { slug: "{{#each new_obj.pf_details}}...{{/each}}", description: "PF Details Loop" },
      { slug: "{{#each MISS_HEADS.earning}}...{{/each}}", description: "Missed Earnings Loop" },
      { slug: "{{#each MISS_HEADS.deduction}}...{{/each}}", description: "Missed Deductions Loop" },
      { slug: "{{earnings}}", description: "Earnings Table (pre-rendered)" },
      { slug: "{{deductions}}", description: "Deductions Table (pre-rendered)" },
      { slug: "{{compliances_table}}", description: "Compliance Table" },
      { slug: "{{compliance_total}}", description: "Compliance Total" },
      { slug: "{{compliances}}", description: "Compliances" },
      { slug: "{{loan_str}}", description: "Loan Details String" },
      { slug: "{{leave_str}}", description: "Leave Details String" },
      { slug: "{{payroll_remarks}}", description: "Payroll Remarks" },
    ]
  },

  loop_fields: {
    label: "Fields Inside Loops (this.*)",
    slugs: [
      { slug: "{{this.HEAD_NAME}}", description: "Head Name" },
      { slug: "{{this.monthly_payable}}", description: "Monthly Payable" },
      { slug: "{{this.ctc_monthly_payable}}", description: "CTC Monthly Payable" },
      { slug: "{{this.arrear_monthly_payable}}", description: "Arrear Monthly Payable" },
      { slug: "{{this.ytd_amt}}", description: "YTD Amount" },
      { slug: "{{this.yearly_head_amt}}", description: "Yearly Head Amount" },
      { slug: "{{this.projected_head_amount}}", description: "Projected Head Amount" },
      { slug: "{{this.head_exampt_amount}}", description: "Head Exempt Amount" },
      { slug: "{{this.taxable_head_amount}}", description: "Taxable Head Amount" },
      { slug: "{{this.ABBREVIATION}}", description: "Abbreviation" },
      { slug: "{{this.SYMBOL}}", description: "Symbol" },
      { slug: "{{this.PAYROLL_MONTH}}", description: "Payroll Month" },
      { slug: "{{this.PAYROLL_YEAR}}", description: "Payroll Year" },
      { slug: "{{this.name}}", description: "Name (missed heads)" },
      { slug: "{{this.amount}}", description: "Amount (missed heads)" },
      { slug: "{{this.remark}}", description: "Remark (missed heads)" },
      { slug: "{{this.leave_type}}", description: "Leave Type" },
      { slug: "{{this.leave_taken}}", description: "Leave Taken" },
      { slug: "{{this.leave_balance}}", description: "Leave Balance" },
      { slug: "{{this.leave_opening}}", description: "Leave Opening" },
      { slug: "{{this.new_assigned}}", description: "New Assigned" },
      { slug: "{{this.previousmonth_balance}}", description: "Previous Month Balance" },
      { slug: "{{this.EXPENSE_TITLE}}", description: "Expense Title" },
      { slug: "{{this.EXPENSE_NAME}}", description: "Expense Name" },
      { slug: "{{this.NET_APPROVED_AMOUNT}}", description: "Net Approved Amount" },
      { slug: "{{this.pf_ymt}}", description: "PF YTD Amount" },
      { slug: "{{this.payroll_amt}}", description: "Payroll Amount" },
    ]
  },

  org_details: {
    label: "Organization Details",
    slugs: [
      { slug: "{{org_details.ORG_NAME}}", description: "Organization Name" },
      { slug: "{{org_details.LEGAL_NAME}}", description: "Legal Name" },
      { slug: "{{org_details.ENTITY_NAME}}", description: "Entity Name" },
      { slug: "{{org_details.ORG_LOGO}}", description: "Organization Logo" },
      { slug: "{{org_details.ORG_ADDRESS}}", description: "Organization Address" },
      { slug: "{{org_details.ORG_ADDRESS2}}", description: "Address Line 2" },
      { slug: "{{org_details.ORG_LOCALITY}}", description: "Locality" },
      { slug: "{{org_details.ORG_CITY}}", description: "City" },
      { slug: "{{org_details.ORG_STATE}}", description: "State" },
      { slug: "{{org_details.ORG_COUNTRY}}", description: "Country" },
      { slug: "{{org_details.ORG_ZIP_CODE}}", description: "Zip Code" },
      { slug: "{{org_details.EMAIL}}", description: "Email" },
      { slug: "{{org_details.MOBILE_NUMBER}}", description: "Mobile Number" },
      { slug: "{{org_details.PAN}}", description: "PAN" },
      { slug: "{{org_details.AUTHRISED_SIGNATORY}}", description: "Authorized Signatory" },
      { slug: "{{org_details.INCORPORATION_DATE}}", description: "Incorporation Date" },
      { slug: "{{org_details.ORG_INDUSTRY}}", description: "Industry" },
      { slug: "{{org_details.ORG_TYPE}}", description: "Organization Type" },
      { slug: "{{org_details.CURRENCY}}", description: "Currency" },
      { slug: "{{org_details.BANK_NAME}}", description: "Bank Name" },
      { slug: "{{org_details.BANK_ACC}}", description: "Bank Account" },
      { slug: "{{org_details.BRANCH}}", description: "Branch" },
      { slug: "{{org_details.CITY}}", description: "City" },
      { slug: "{{org_details.IBAN}}", description: "IBAN" },
      { slug: "{{org_details.WPS_NUMBER}}", description: "WPS Number" },
      { slug: "{{org_details.MOL_NUMBER}}", description: "MOL Number" },
      { slug: "{{hrms_logo_url}}", description: "HRMS Logo Base URL" },
    ]
  },

  loan_emi: {
    label: "Loan & EMI",
    slugs: [
      { slug: "{{loan_emi.openong_bal}}", description: "Opening Balance" },
      { slug: "{{loan_emi.emi}}", description: "EMI Amount" },
      { slug: "{{loan_emi.closing_bal}}", description: "Closing Balance" },
      { slug: "{{loan_emi.principle_amount}}", description: "Principal Amount" },
      { slug: "{{loan_emi.interest_amount}}", description: "Interest Amount" },
      { slug: "{{loan_emi.prerequisite_amount}}", description: "Prerequisite Amount" },
    ]
  },

  yearly_earning: {
    label: "Yearly Earning Totals",
    slugs: [
      { slug: "{{yearly_earning_total.ytd_amount}}", description: "YTD Amount" },
      { slug: "{{yearly_earning_total.exempt_amount}}", description: "Exempt Amount" },
      { slug: "{{yearly_earning_total.taxable_amount}}", description: "Taxable Amount" },
      { slug: "{{yearly_earning_total.yearly_head_amount}}", description: "Yearly Head Amount" },
      { slug: "{{yearly_earning_total.monthly_ctc_amount}}", description: "Monthly CTC Amount" },
      { slug: "{{yearly_earning_total.projected_amount}}", description: "Projected Amount" },
    ]
  },

  detailed_ot: {
    label: "Detailed Overtime",
    slugs: [
      { slug: "{{detailedOt.hd_ot}}", description: "Holiday OT Hours" },
      { slug: "{{detailedOt.hd_ot_amount}}", description: "Holiday OT Amount" },
      { slug: "{{detailedOt.wo_ot}}", description: "Week Off OT Hours" },
      { slug: "{{detailedOt.wo_ot_amount}}", description: "Week Off OT Amount" },
      { slug: "{{detailedOt.wd_ot}}", description: "Working Day OT Hours" },
      { slug: "{{detailedOt.wd_ot_amount}}", description: "Working Day OT Amount" },
    ]
  },

  tax_details: {
    label: "Tax Details",
    slugs: [
      { slug: "{{new_obj.profession_tax.balance}}", description: "PT Balance" },
      { slug: "{{new_obj.profession_tax.projected}}", description: "PT Projected" },
      { slug: "{{new_obj.profession_tax.ytd}}", description: "PT YTD" },
      { slug: "{{new_obj.income_tax.projected}}", description: "Income Tax Projected" },
      { slug: "{{new_obj.income_tax.ytd}}", description: "Income Tax YTD" },
      { slug: "{{new_obj.income_tax.balance}}", description: "Income Tax Balance" },
    ]
  },

  revenue_commission: {
    label: "Revenue & Commission",
    slugs: [
      { slug: "{{single.revenue_contribution}}", description: "Revenue Contribution" },
      { slug: "{{single.revenue_remarks}}", description: "Revenue Remarks" },
      { slug: "{{single.revenue_commission}}", description: "Revenue Commission" },
      { slug: "{{single.rider_commission_min_orders_per_day}}", description: "Min Orders Per Day" },
      { slug: "{{single.rider_commission_rate_per_order}}", description: "Rate Per Order" },
      { slug: "{{single.rider_commission_monthly_minimum_business_order}}", description: "Monthly Min Business Order" },
      { slug: "{{single.rider_commission_monthly_actual_orders_received}}", description: "Monthly Actual Orders" },
      { slug: "{{single.rider_commission_monthly_gross_payout}}", description: "Monthly Gross Payout" },
      { slug: "{{single.rider_commission_remarks}}", description: "Commission Remarks" },
      { slug: "{{single.rider_commission_monthly_minimum_payout}}", description: "Monthly Min Payout" },
    ]
  },

  aggregated_sums: {
    label: "Aggregated Sums",
    slugs: [
      { slug: "{{single.gross_array_sum}}", description: "Gross Array Sum" },
      { slug: "{{single.scale_array_sum}}", description: "Scale Array Sum" },
      { slug: "{{single.arrear_array_sum}}", description: "Arrear Array Sum" },
      { slug: "{{single.net_deduction_sum}}", description: "Net Deduction Sum" },
      { slug: "{{single.annual_leave_balance}}", description: "Annual Leave Balance" },
      { slug: "{{single.sick_leave_days}}", description: "Sick Leave Days" },
      { slug: "{{single.ORIGINAL_LEAVE}}", description: "Original Leave" },
      { slug: "{{single.ARREAR_AMOUNT}}", description: "Arrear Amount" },
      { slug: "{{single.IS_REGENERAT_REQUIRED}}", description: "Is Regeneration Required" },
    ]
  },
};

// Flat list of all slugs for AI context
function getAllSlugs() {
  const all = [];
  for (const [catKey, cat] of Object.entries(SLUG_CATEGORIES)) {
    for (const s of cat.slugs) {
      all.push({ category: cat.label, ...s });
    }
  }
  return all;
}

module.exports = { SLUG_CATEGORIES, getAllSlugs };
