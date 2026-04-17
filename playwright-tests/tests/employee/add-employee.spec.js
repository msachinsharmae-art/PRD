// @ts-check
// Core HR > Employee Master — Add Employee via Manual Entry
const { test, expect } = require('@playwright/test');

const CREDENTIALS = {
  email: 'sachin.sharma+demo@zimyo.com',
  password: 'Zimyo@12345',
};

const EMPLOYEE = {
  fullName: 'Playwright test',
  organization: 'Zimyo Dev',
  employeeCode: '22222',
  ifscCode: '12212',
  region: 'Region',
  shift: 'Fixed Shift Test Break',
  spouseName: 'ssss',
};

test.use({ timeout: 180000 });

test('Add employee manually and approve', async ({ page, context }) => {
  // ── Login ────────────────────────────────────────────────
  await page.goto('https://www.zimyo.net/login', { timeout: 30000 });
  await page.getByRole('textbox', { name: 'Username' }).fill(CREDENTIALS.email);
  await page.getByRole('textbox', { name: 'Password' }).fill(CREDENTIALS.password);

  const newPagePromise = context.waitForEvent('page', { timeout: 15000 }).catch(() => null);
  await page.getByRole('button', { name: 'Login', exact: true }).click();

  const newPage = await newPagePromise;
  const activePage = newPage || page;
  await activePage.waitForURL('**/dashboard/**', { timeout: 30000 });

  // ── Navigate to Employee Master ──────────────────────────
  await activePage.locator('a').filter({ hasText: 'Core HR' }).click();
  await activePage.getByRole('tab', { name: 'Employee Master' }).click();
  await activePage.waitForTimeout(3000);

  // ── Start Add Employee flow ──────────────────────────────
  await activePage.getByRole('button', { name: 'Take Action' }).click();
  await activePage.getByRole('button', { name: 'Add Manually' }).click();
  await activePage.waitForTimeout(2000);

  // Step 1: Basic Info
  await activePage.locator('div').filter({ hasText: /^Select\.\.\.$/ }).nth(2).click();
  await activePage.getByText(EMPLOYEE.organization).click();

  await activePage.getByRole('textbox', { name: 'Full Name Last Name Mobile No' }).fill(EMPLOYEE.fullName);

  await activePage.locator('input[name="IFSC_CODE"]').fill(EMPLOYEE.ifscCode);

  await activePage.getByRole('textbox', { name: 'Region Id' }).click();
  await activePage.getByRole('option', { name: EMPLOYEE.region }).click();

  await activePage.getByRole('button', { name: 'Proceed' }).click();
  await activePage.waitForTimeout(2000);

  // Step 2: Employment Details
  await activePage.getByRole('textbox', { name: 'Employee Code Official Email' }).fill(EMPLOYEE.employeeCode);

  await activePage.getByRole('textbox', { name: 'Shift' }).click();
  await activePage.getByRole('option', { name: EMPLOYEE.shift, exact: true }).click();

  await activePage.getByRole('textbox', { name: 'Leave Rule' }).click();
  await activePage.waitForTimeout(1000);
  // Select first available leave rule
  await activePage.locator('[role="option"]').first().click();

  await activePage.getByRole('button', { name: 'Proceed' }).click();
  await activePage.waitForTimeout(2000);

  // Steps 3-5: Click through remaining steps
  await activePage.getByRole('button', { name: 'Proceed' }).click();
  await activePage.waitForTimeout(1500);
  await activePage.getByRole('button', { name: 'Proceed' }).click();
  await activePage.waitForTimeout(1500);
  await activePage.getByRole('button', { name: 'Proceed' }).click();
  await activePage.waitForTimeout(1500);

  // Step 6: Personal Details
  await activePage.getByRole('textbox', { name: 'Wife/Husband Name' }).fill(EMPLOYEE.spouseName);
  await activePage.getByRole('button', { name: 'Proceed' }).click();
  await activePage.waitForTimeout(2000);

  // Steps 7-9: Click through final steps
  await activePage.getByRole('button', { name: 'Proceed' }).click();
  await activePage.waitForTimeout(1500);
  await activePage.getByRole('button', { name: 'Proceed' }).click();
  await activePage.waitForTimeout(1500);
  await activePage.getByRole('button', { name: 'Proceed' }).click();
  await activePage.waitForTimeout(2000);

  // ── Navigate back to Employee Master ─────────────────────
  await activePage.goto('https://www.zimyo.net/admin/core_hr/users/employee-master', { timeout: 30000 });
  await activePage.waitForTimeout(3000);

  // ── Switch to Betainbox and approve ──────────────────────
  await activePage.locator('a').filter({ hasText: 'Betainbox' }).click();
  await activePage.waitForTimeout(2000);

  await activePage.getByRole('button', { name: 'Table View' }).click();
  await activePage.waitForTimeout(2000);

  // Find and approve the request
  await activePage.getByText('REQ-12640').click();
  await activePage.waitForTimeout(1500);

  await activePage.getByRole('button', { name: 'Approve' }).click();
  await activePage.waitForTimeout(2000);

  console.log('Employee added and approved successfully');
});
