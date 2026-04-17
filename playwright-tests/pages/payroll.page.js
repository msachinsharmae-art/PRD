// @ts-check
// PayrollPage — payroll module selectors, methods, and component usage
const BasePage = require('./base.page');
const FormComponent = require('../components/form.component');
const TableComponent = require('../components/table.component');
const ModalComponent = require('../components/modal.component');
const { EMPLOYEES_URL, RUN_PAYROLL_URL, TIMEOUTS } = require('../utils/constants');

class PayrollPage extends BasePage {
  // Selectors — all payroll-specific selectors live here
  selectors = {
    searchEmployees: 'input[placeholder="Search Employees"]',
    modifySalary: /Modif(i)?y\s*Salary/i,  // typo in Zimyo UI
    grossSalary: '#GROSS_SALARY',
    computeBtn: 'Compute',
    saveBtn: 'Save',
    searchBtn: /^Search/,
    lockAttendance: /Lock Attendance/i,
    nextBtn: /next|skip|proceed|generate/i,
    runPayrollBtn: /run payroll|proceed|next/i,
    successTab: /Success/i,
    errorTab: /Error/i,
    employeeSearchInTab: 'input[placeholder*="Search Employee"]',
  };

  // React-select filter coordinates for Run Payroll page
  filters = {
    entity: { x: 280, y: 194 },
    monthYear: { x: 555, y: 194 },
    status: { x: 833, y: 194 },
  };

  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    super(page);
    this.form = new FormComponent(page);
    this.table = new TableComponent(page);
    this.modal = new ModalComponent(page);
  }

  // ===== NAVIGATION =====

  async goToEmployeeWorkspace() {
    await this.loginAndGoto(EMPLOYEES_URL);
  }

  async goToRunPayroll() {
    await this.goto(RUN_PAYROLL_URL);
    await this.page.waitForTimeout(TIMEOUTS.networkIdle);
  }

  // ===== EMPLOYEE SEARCH & PROFILE =====

  async searchAndOpenEmployee(name) {
    console.log(`>>> Search "${name}"...`);
    await this.table.searchEmployee(name);
    await this.screenshot(`${name.toLowerCase()}-search`);
    await this.table.clickEmployee(name);
    await this.screenshot(`${name.toLowerCase()}-profile`);
  }

  // ===== MODIFY SALARY =====

  async openModifySalary() {
    console.log('>>> Opening Modify Salary...');
    await this.page.getByText(this.selectors.modifySalary).first().scrollIntoViewIfNeeded();
    await this.page.getByText(this.selectors.modifySalary).first().click();
    await this.page.waitForTimeout(TIMEOUTS.afterAction);
    await this.screenshot('modify-salary-form');
  }

  /**
   * Set salary fields: CTC and optionally BASIC.
   * Handles finding the right field by label when ID isn't known.
   */
  async setSalaryFields({ ctc, basic }) {
    if (ctc) {
      console.log(`>>> Setting CTC to ${ctc}...`);
      // Try by label first (CTC/Gross Salary)
      const found = await this.form.fillFieldByLabel(/CTC|Salary|Gross/i, String(ctc));
      if (!found) {
        // Fallback to known ID
        await this.form.fillInput(this.selectors.grossSalary, String(ctc));
      }
    }

    if (basic) {
      console.log(`>>> Setting BASIC to ${basic}...`);

      // BASIC lives in the earnings table — scan all visible inputs first
      const allFields = await this.page.evaluate(() => {
        const fields = [];
        document.querySelectorAll('input').forEach(inp => {
          if (inp.offsetHeight > 0) {
            const row = inp.closest('tr, [class*="row"]');
            const rowText = row?.textContent?.trim()?.substring(0, 100) || '';
            const parent = inp.closest('div, td, [class*="form"]');
            const label = parent?.querySelector('label, span, p')?.textContent?.trim() || '';
            fields.push({
              id: inp.id, name: inp.name, type: inp.type,
              label, rowText, value: inp.value,
              y: Math.round(inp.getBoundingClientRect().y),
            });
          }
        });
        return fields;
      });
      console.log('>>> All visible inputs:', JSON.stringify(allFields.filter(f =>
        f.rowText.includes('BASIC') || f.label.match(/BASIC/i)
      ), null, 2));

      // Strategy 1: Find input in a table row containing "BASIC"
      const basicSet = await this.page.evaluate((val) => {
        const rows = document.querySelectorAll('tr, [class*="row"]');
        for (const row of rows) {
          if (row.textContent?.includes('BASIC')) {
            const inp = row.querySelector('input');
            if (inp && inp.offsetHeight > 0) {
              inp.focus();
              inp.select();
              const setter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype, 'value'
              ).set;
              setter.call(inp, val);
              inp.dispatchEvent(new Event('input', { bubbles: true }));
              inp.dispatchEvent(new Event('change', { bubbles: true }));
              return true;
            }
          }
        }
        return false;
      }, String(basic));

      if (basicSet) {
        console.log(`>>> BASIC set to ${basic} via earnings table`);
      } else {
        // Strategy 2: Try standard form label search
        const found = await this.form.fillFieldByLabel(/BASIC/i, String(basic));
        if (!found) console.log('>>> WARNING: Could not find BASIC field');
      }
      await this.page.waitForTimeout(1000);
    }
  }

  /**
   * Full modify salary flow: set fields → compute → save → confirm.
   * Returns true if successful, false if Save was disabled.
   */
  async modifySalary({ ctc, basic }) {
    await this.setSalaryFields({ ctc, basic });
    await this.screenshot('salary-fields-set');

    const saved = await this.form.computeAndSave();
    if (!saved) {
      await this.screenshotFull('save-disabled-error');
      const errors = await this.modal.getPageErrors();
      console.log('>>> Page errors:', errors);
      return false;
    }

    await this.modal.confirm();
    await this.screenshot('salary-saved');
    console.log('>>> Salary modification saved!');
    return true;
  }

  // ===== RUN PAYROLL =====

  /**
   * Set payroll run filters (Entity, Month-Year, Status) and click Search.
   */
  async setPayrollFilters({ entity = 'All', month, status = 'All' }) {
    await this.form.pickReactSelect(this.filters.entity.x, this.filters.entity.y, entity, 'Entity');
    await this.form.pickReactSelect(this.filters.monthYear.x, this.filters.monthYear.y, month, 'Month-Year');

    // Clear existing status tags
    await this.table.clearMultiSelectTags();
    await this.form.pickReactSelect(this.filters.status.x, this.filters.status.y, status, 'Status');

    console.log('>>> Searching payroll results...');
    await this.form.clickButtonByText(this.selectors.searchBtn);
    await this.page.waitForTimeout(TIMEOUTS.afterSearch);
    await this.screenshot('payroll-search-results');
  }

  /**
   * Check if employee is in Success or Error tab.
   * Returns { found: boolean, tab: 'success'|'error'|null, errorInfo: string|null }
   */
  async checkEmployeePayrollStatus(name) {
    // Check Success tab
    await this.table.clickTab('Success');
    const empSearch = this.page.locator(this.selectors.employeeSearchInTab).first();
    if (await empSearch.isVisible().catch(() => false)) {
      await empSearch.fill(name);
      await this.page.waitForTimeout(3000);
    }

    if (await this.table.isEmployeeVisible(name)) {
      console.log(`>>> ${name} found in Success tab!`);
      return { found: true, tab: 'success', errorInfo: null };
    }

    // Check Error tab
    console.log(`>>> ${name} not in Success. Checking Error tab...`);
    if (await empSearch.isVisible().catch(() => false)) await empSearch.clear();
    await this.table.clickTab('Error');
    await this.page.waitForTimeout(3000);

    const foundInError = await this.table.scrollToFindEmployee(name);
    if (foundInError) {
      const errInfo = await this.table.getEmployeeRowInfo(name);
      console.log(`>>> ERROR for ${name}: ${errInfo}`);
      await this.screenshot(`${name.toLowerCase()}-error`);
      return { found: true, tab: 'error', errorInfo: errInfo || 'Error not captured' };
    }

    return { found: false, tab: null, errorInfo: null };
  }

  /**
   * Execute full payroll run steps for an employee:
   * 1. Lock Attendance → 2. Process Arrear → 3. Review & Run → 4. Publish
   */
  async executePayrollSteps(name) {
    // Select employee checkbox
    await this.table.selectEmployeeCheckbox(name);

    // Step 1: Lock Attendance
    console.log('>>> Step 1: Lock Attendance...');
    await this.form.clickButtonByText(this.selectors.lockAttendance);
    await this.page.waitForTimeout(TIMEOUTS.afterSearch);
    await this.screenshotFull(`${name.toLowerCase()}-locked`);

    // Step 2: Process Arrear
    console.log('>>> Step 2: Process Arrear...');
    await this.page.waitForTimeout(TIMEOUTS.afterAction);
    await this.table.selectEmployeeCheckbox(name);
    await this.form.clickButtonByText(this.selectors.nextBtn).catch(() => {});
    await this.page.waitForTimeout(TIMEOUTS.afterSearch);
    await this.screenshotFull(`${name.toLowerCase()}-arrear`);

    // Step 3: Review & Run
    console.log('>>> Step 3: Review & Run...');
    await this.page.waitForTimeout(TIMEOUTS.afterAction);
    await this.table.selectEmployeeCheckbox(name);
    await this.form.clickButtonByText(this.selectors.runPayrollBtn).catch(() => {});
    await this.page.waitForTimeout(TIMEOUTS.afterSearch);
    await this.screenshotFull(`${name.toLowerCase()}-run`);

    // Step 4: Publish Payslips
    console.log('>>> Step 4: Publish Payslips...');
    await this.page.waitForTimeout(TIMEOUTS.afterAction);
    await this.screenshotFull(`${name.toLowerCase()}-publish`);

    console.log('>>> FULL PAYROLL COMPLETE!');
  }
}

module.exports = PayrollPage;
