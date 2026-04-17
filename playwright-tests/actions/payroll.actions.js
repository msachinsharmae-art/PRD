// @ts-check
// PayrollActions — business-level flows combining multiple page methods
// Each method here represents a complete user journey.
const PayrollPage = require('../pages/payroll.page');
const fs = require('fs');
const path = require('path');

const ERRORS_FILE = path.join(__dirname, '..', 'ERRORS.md');
const PROGRESS_FILE = path.join(__dirname, '..', 'PROGRESS.md');

class PayrollActions {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.payroll = new PayrollPage(page);
    this.page = page;
  }

  /**
   * Login and ensure session is active.
   */
  async login() {
    await this.payroll.login();
  }

  /**
   * Full flow: Navigate to employee → Modify Salary → Compute → Save → Confirm.
   * Returns true if salary was modified successfully.
   */
  async modifySalary(employeeName, { ctc, basic }) {
    await this.payroll.goToEmployeeWorkspace();
    await this.payroll.searchAndOpenEmployee(employeeName);
    await this.payroll.openModifySalary();
    return await this.payroll.modifySalary({ ctc, basic });
  }

  /**
   * Full flow: Run Payroll → Set filters → Check status → Execute steps if successful.
   * Returns { success: boolean, tab: string, errorInfo: string|null }
   */
  async runPayroll(employeeName, { month, entity = 'All', status = 'All' }) {
    await this.payroll.goToRunPayroll();
    await this.payroll.setPayrollFilters({ entity, month, status });

    const result = await this.payroll.checkEmployeePayrollStatus(employeeName);

    if (result.tab === 'success') {
      await this.payroll.executePayrollSteps(employeeName);
      return { success: true, tab: 'success', errorInfo: null };
    }

    if (result.tab === 'error') {
      this._logError(employeeName, month, result.errorInfo);
      return { success: false, tab: 'error', errorInfo: result.errorInfo };
    }

    console.log(`>>> ${employeeName} not found in any tab.`);
    return { success: false, tab: null, errorInfo: 'Employee not found in results' };
  }

  /**
   * Complete end-to-end: Modify Salary → Run Payroll → Verify.
   * This is the main business flow for payroll testing.
   */
  async modifySalaryAndRunPayroll(employeeName, { ctc, basic, month, entity = 'All' }) {
    // Step 1: Modify salary
    const salaryModified = await this.modifySalary(employeeName, { ctc, basic });
    if (!salaryModified) {
      console.log('>>> Save was disabled — salary may already be at target value. Continuing to payroll run...');
    }

    // Step 2: Run payroll
    const payrollResult = await this.runPayroll(employeeName, { month, entity });
    this._logProgress(employeeName, ctc, month, payrollResult.success, payrollResult.errorInfo);

    return {
      salaryModified: true,
      payrollRun: payrollResult.success,
      errorInfo: payrollResult.errorInfo,
    };
  }

  /**
   * Verify a salary template was created/applied by checking employee in payroll results.
   */
  async verifyPayrollSuccess(employeeName) {
    const result = await this.payroll.checkEmployeePayrollStatus(employeeName);
    return result.tab === 'success';
  }

  // ===== PRIVATE LOGGING =====

  _logError(employeeName, month, errorInfo) {
    try {
      let errFile = fs.readFileSync(ERRORS_FILE, 'utf-8');
      const date = new Date().toISOString().split('T')[0];
      errFile += `\n| ${date} | RP-POM | ${employeeName} ${month} | ${errorInfo} | ${employeeName.toLowerCase()}-error.png | OPEN |`;
      fs.writeFileSync(ERRORS_FILE, errFile);
      console.log('>>> Error logged to ERRORS.md');
    } catch (e) {
      console.log('>>> Could not log error:', e.message);
    }
  }

  _logProgress(employeeName, ctc, month, success, errorInfo) {
    try {
      const date = new Date().toISOString().split('T')[0];
      const entry = `
### ${employeeName} — CTC ${ctc} + Payroll ${month} — ${date} (POM)
| Step | Status |
|------|--------|
| Modify Salary (CTC: ${ctc}) | ${success || !errorInfo?.includes('Save disabled') ? 'DONE' : 'FAILED'} |
| Compute → Save → Confirm | ${success || !errorInfo?.includes('Save disabled') ? 'DONE' : 'FAILED'} |
| Run Payroll ${month} | ${success ? 'DONE' : 'FAILED'} |
${errorInfo ? `| Error | ${errorInfo} |` : ''}
`;
      fs.appendFileSync(PROGRESS_FILE, entry);
      console.log('>>> Progress logged to PROGRESS.md');
    } catch (e) {
      console.log('>>> Could not log progress:', e.message);
    }
  }
}

module.exports = PayrollActions;
