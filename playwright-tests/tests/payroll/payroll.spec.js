// @ts-check
// Payroll POM Test — Anita (AN-001) Salary Modify + Full Payroll Run
// Uses the modular POM framework: components → pages → actions → test
const { test } = require('@playwright/test');
const { launchPersistentBrowser, keepBrowserOpen } = require('../utils/browser.util');
const PayrollActions = require('../actions/payroll.actions');

test.setTimeout(0); // No timeout — payroll flows take variable time

test.describe('Payroll Module — POM Framework', () => {

  test('Anita (AN-001) — Modify CTC to 500000 + Run Payroll March 2026', async () => {
    // Launch persistent browser (reuses session)
    const { context, page } = await launchPersistentBrowser();

    try {
      const payroll = new PayrollActions(page);

      // Step 1: Ensure logged in
      await payroll.login();

      // Step 2: Modify salary and run payroll (single business flow)
      const result = await payroll.modifySalaryAndRunPayroll('Anita', {
        ctc: 500000,
        basic: 200000,
        month: 'Mar-2026',
        entity: 'All',
      });

      // Step 3: Log outcome
      if (result.salaryModified) {
        console.log('>>> Salary modified successfully');
      } else {
        console.log('>>> Salary modification failed');
      }

      if (result.payrollRun) {
        console.log('>>> Payroll run completed successfully');
      } else {
        console.log('>>> Payroll run failed:', result.errorInfo || 'Unknown');
      }

      // Keep browser open for inspection
      await keepBrowserOpen(page);
    } finally {
      await context.close().catch(() => {});
    }
  });

});
