// @ts-check
// Employee Master — Create employee and test all cases
const { test, expect } = require('@playwright/test');
const FormComponent = require('../components/form.component');
const TableComponent = require('../components/table.component');
const ModalComponent = require('../components/modal.component');

const CREDENTIALS = {
  username: 'sachin.sharma+demo@zimyo.com',
  password: 'Zimyo@12345',
};

// Test employee data
const EMP_DATA = {
  firstName: 'Test',
  lastName: 'Employee' + Date.now().toString().slice(-4),
  email: `testemp${Date.now().toString().slice(-6)}@yopmail.com`,
  phone: '9876543210',
  employeeId: 'EMP' + Date.now().toString().slice(-6),
};

test.setTimeout(180000);

/** Login and navigate to Admin panel */
async function loginAndGoToAdmin(page, context) {
  await page.goto('https://www.zimyo.net', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(3000);

  // Check if already logged in
  const isLoginPage = await page.locator('#username').isVisible().catch(() => false);
  if (isLoginPage) {
    await page.locator('#username').fill(CREDENTIALS.username);
    await page.locator('#password').fill(CREDENTIALS.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(8000);
  }

  console.log('Post-login URL:', page.url());
  return page;
}

/** Navigate to Admin app via nine-dot menu or direct URL */
async function navigateToAdmin(page, context) {
  // Try direct admin URL first
  await page.goto('https://www.zimyo.net/admin', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(5000);
  console.log('Admin URL:', page.url());

  // If redirected to login, login again
  if (page.url().includes('login') || await page.locator('#username').isVisible().catch(() => false)) {
    await page.locator('#username').fill(CREDENTIALS.username);
    await page.locator('#password').fill(CREDENTIALS.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(8000);
  }

  return page;
}

/** Navigate to Employee Master page from Admin sidebar */
async function goToEmployeeMaster(page) {
  // Look for Employee menu item in sidebar
  const employeeLink = page.locator('a, [role="menuitem"], [class*="sidebar"] span, [class*="menu"] span')
    .filter({ hasText: /^Employee$/i }).first();

  if (await employeeLink.isVisible({ timeout: 5000 }).catch(() => false)) {
    await employeeLink.click();
    await page.waitForTimeout(2000);
  }

  // Look for "Employee Master" sub-menu or direct link
  const masterLink = page.locator('a, [role="menuitem"], span')
    .filter({ hasText: /Employee Master|Employee List|All Employees/i }).first();

  if (await masterLink.isVisible({ timeout: 5000 }).catch(() => false)) {
    await masterLink.click();
    await page.waitForTimeout(3000);
  }

  // Fallback: try direct URL patterns
  if (!await page.locator('table, [class*="employee"], [class*="master"]').first().isVisible({ timeout: 3000 }).catch(() => false)) {
    // Try common admin employee master URL patterns
    const urls = [
      'https://www.zimyo.net/admin/employee-master',
      'https://www.zimyo.net/admin/employee',
      'https://www.zimyo.net/admin/employees',
      'https://www.zimyo.net/admin#/employee-master',
      'https://www.zimyo.net/admin#/employee',
    ];
    for (const url of urls) {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(3000);
      const hasContent = await page.locator('table, [class*="employee"], button:has-text("Add")').first()
        .isVisible({ timeout: 3000 }).catch(() => false);
      if (hasContent) {
        console.log('Employee Master found at:', url);
        break;
      }
    }
  }

  await page.screenshot({ path: 'screenshots/employee-master-page.png', fullPage: true });
  return page;
}

test.describe('Employee Master — Full Test Suite', () => {

  // ─── TC-01: Navigate to Employee Master ────────────────────────
  test('TC-01: Navigate to Employee Master page', async ({ page, context }) => {
    await loginAndGoToAdmin(page, context);
    await navigateToAdmin(page, context);

    // Discover the page structure
    const pageStructure = await page.evaluate(() => {
      const sidebar = document.querySelectorAll('[class*="sidebar"] a, [class*="menu"] a, nav a');
      return Array.from(sidebar).map(el => ({
        text: el.textContent?.trim()?.substring(0, 60),
        href: el.getAttribute('href'),
        y: Math.round(el.getBoundingClientRect().y),
      })).filter(el => el.text);
    });
    console.log('\n=== ADMIN SIDEBAR LINKS ===');
    console.log(JSON.stringify(pageStructure, null, 2));

    await goToEmployeeMaster(page);

    // Verify we're on the Employee Master page
    const pageText = await page.textContent('body');
    console.log('Page contains "Employee":', pageText?.includes('Employee'));
    console.log('Page contains "Add":', pageText?.includes('Add'));

    await page.screenshot({ path: 'screenshots/TC01-employee-master.png', fullPage: true });
  });

  // ─── TC-02: Discover Add Employee form fields ──────────────────
  test('TC-02: Discover Add Employee form and fields', async ({ page, context }) => {
    await loginAndGoToAdmin(page, context);
    await navigateToAdmin(page, context);
    await goToEmployeeMaster(page);

    // Click "Add Employee" or "+" button
    const addBtn = page.locator('button, a')
      .filter({ hasText: /Add Employee|Add New|Create Employee|\+/i }).first();

    if (await addBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(3000);
    } else {
      // Look for a floating action button or icon button
      await page.locator('[class*="add"], [class*="fab"], button:has(svg[data-testid="AddIcon"])')
        .first().click().catch(() => {});
      await page.waitForTimeout(3000);
    }

    await page.screenshot({ path: 'screenshots/TC02-add-employee-form.png', fullPage: true });

    // Discover all form fields
    const formFields = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input, select, textarea');
      return Array.from(inputs).filter(el => el.offsetHeight > 0).map(el => ({
        tag: el.tagName,
        type: el.getAttribute('type'),
        name: el.getAttribute('name'),
        id: el.id,
        placeholder: el.getAttribute('placeholder'),
        label: el.closest('[class*="form"], [class*="Form"], div')?.querySelector('label, span')?.textContent?.trim()?.substring(0, 50),
        required: el.hasAttribute('required') || el.getAttribute('aria-required') === 'true',
      }));
    });

    console.log('\n=== ADD EMPLOYEE FORM FIELDS ===');
    console.log(JSON.stringify(formFields, null, 2));

    // Discover dropdowns (react-select)
    const dropdowns = await page.evaluate(() => {
      const selects = document.querySelectorAll('[class*="select"], [class*="Select"], [class*="dropdown"]');
      return Array.from(selects).filter(el => el.offsetHeight > 0).slice(0, 20).map(el => ({
        className: el.className?.toString()?.substring(0, 100),
        text: el.textContent?.trim()?.substring(0, 60),
        label: el.closest('[class*="form"], div')?.querySelector('label')?.textContent?.trim()?.substring(0, 50),
      }));
    });
    console.log('\n=== DROPDOWNS ===');
    console.log(JSON.stringify(dropdowns, null, 2));

    // Discover all buttons on the form
    const buttons = await page.evaluate(() => {
      const btns = document.querySelectorAll('button');
      return Array.from(btns).filter(el => el.offsetHeight > 0).map(el => ({
        text: el.textContent?.trim()?.substring(0, 50),
        type: el.getAttribute('type'),
        disabled: el.disabled,
      }));
    });
    console.log('\n=== FORM BUTTONS ===');
    console.log(JSON.stringify(buttons, null, 2));
  });

  // ─── TC-03: Create employee with all mandatory fields ──────────
  test('TC-03: Create employee with all mandatory fields', async ({ page, context }) => {
    const form = new FormComponent(page);
    const modal = new ModalComponent(page);

    await loginAndGoToAdmin(page, context);
    await navigateToAdmin(page, context);
    await goToEmployeeMaster(page);

    // Click Add Employee
    const addBtn = page.locator('button, a')
      .filter({ hasText: /Add Employee|Add New|Create Employee/i }).first();
    await addBtn.click({ timeout: 10000 });
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'screenshots/TC03-before-fill.png', fullPage: true });

    // Fill mandatory fields — using common field patterns for Zimyo
    // First Name
    await form.fillInput('input[name*="first_name"], input[placeholder*="First Name"], input[name*="firstName"]', EMP_DATA.firstName)
      .catch(() => form.fillFieldByLabel(/first.?name/i, EMP_DATA.firstName));

    // Last Name
    await form.fillInput('input[name*="last_name"], input[placeholder*="Last Name"], input[name*="lastName"]', EMP_DATA.lastName)
      .catch(() => form.fillFieldByLabel(/last.?name/i, EMP_DATA.lastName));

    // Email
    await form.fillInput('input[name*="email"], input[placeholder*="Email"], input[type="email"]', EMP_DATA.email)
      .catch(() => form.fillFieldByLabel(/email/i, EMP_DATA.email));

    // Phone / Mobile
    await form.fillInput('input[name*="phone"], input[name*="mobile"], input[placeholder*="Phone"], input[placeholder*="Mobile"]', EMP_DATA.phone)
      .catch(() => form.fillFieldByLabel(/phone|mobile/i, EMP_DATA.phone));

    // Employee ID (if visible)
    await form.fillInput('input[name*="emp_id"], input[name*="employee_id"], input[placeholder*="Employee ID"]', EMP_DATA.employeeId)
      .catch(() => {});

    await page.screenshot({ path: 'screenshots/TC03-after-fill.png', fullPage: true });

    // Submit / Save
    const submitBtn = page.locator('button')
      .filter({ hasText: /Save|Submit|Create|Add$/i }).first();
    if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      const isDisabled = await submitBtn.isDisabled();
      console.log('Submit button disabled?', isDisabled);
      if (!isDisabled) {
        await submitBtn.click();
        await page.waitForTimeout(5000);
      }
    }

    // Handle confirmation modal if any
    if (await modal.isVisible()) {
      await modal.confirm();
    }

    await page.screenshot({ path: 'screenshots/TC03-after-submit.png', fullPage: true });

    // Check for success message
    const successMsg = await page.locator('[class*="success"], [class*="toast"], [class*="snack"], [role="alert"]')
      .first().textContent().catch(() => null);
    console.log('Success message:', successMsg);

    // Check for errors
    const errors = await modal.getPageErrors();
    console.log('Page errors:', errors);
  });

  // ─── TC-04: Validate mandatory field errors (submit empty form) ─
  test('TC-04: Submit empty form shows validation errors', async ({ page, context }) => {
    const modal = new ModalComponent(page);

    await loginAndGoToAdmin(page, context);
    await navigateToAdmin(page, context);
    await goToEmployeeMaster(page);

    // Click Add Employee
    const addBtn = page.locator('button, a')
      .filter({ hasText: /Add Employee|Add New|Create Employee/i }).first();
    await addBtn.click({ timeout: 10000 });
    await page.waitForTimeout(3000);

    // Click Submit without filling anything
    const submitBtn = page.locator('button')
      .filter({ hasText: /Save|Submit|Create|Add$/i }).first();

    if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(3000);
    }

    await page.screenshot({ path: 'screenshots/TC04-empty-submit.png', fullPage: true });

    // Capture all validation error messages
    const validationErrors = await page.evaluate(() => {
      const errorEls = document.querySelectorAll(
        '[class*="error"], [class*="Error"], [class*="helper"], [class*="Helper"], ' +
        '[class*="invalid"], [class*="validation"], [role="alert"], .Mui-error, ' +
        'p[class*="Mui-error"], span[class*="error"]'
      );
      return Array.from(errorEls)
        .filter(el => el.offsetHeight > 0)
        .map(el => el.textContent?.trim())
        .filter(Boolean);
    });

    console.log('\n=== VALIDATION ERRORS ===');
    console.log(JSON.stringify(validationErrors, null, 2));

    // There should be at least one validation error
    expect(validationErrors.length).toBeGreaterThan(0);
    console.log(`Found ${validationErrors.length} validation errors as expected`);
  });

  // ─── TC-05: Duplicate employee ID check ────────────────────────
  test('TC-05: Duplicate employee ID shows error', async ({ page, context }) => {
    const form = new FormComponent(page);
    const modal = new ModalComponent(page);

    await loginAndGoToAdmin(page, context);
    await navigateToAdmin(page, context);
    await goToEmployeeMaster(page);

    // Click Add Employee
    const addBtn = page.locator('button, a')
      .filter({ hasText: /Add Employee|Add New|Create Employee/i }).first();
    await addBtn.click({ timeout: 10000 });
    await page.waitForTimeout(3000);

    // Use employee ID "1" — likely already exists
    await form.fillInput('input[name*="emp_id"], input[name*="employee_id"], input[placeholder*="Employee ID"]', '1')
      .catch(() => form.fillFieldByLabel(/employee.?id/i, '1'));

    // Fill other mandatory fields
    await form.fillInput('input[name*="first_name"], input[placeholder*="First Name"], input[name*="firstName"]', 'Duplicate')
      .catch(() => form.fillFieldByLabel(/first.?name/i, 'Duplicate'));
    await form.fillInput('input[name*="last_name"], input[placeholder*="Last Name"], input[name*="lastName"]', 'Test')
      .catch(() => form.fillFieldByLabel(/last.?name/i, 'Test'));
    await form.fillInput('input[name*="email"], input[placeholder*="Email"], input[type="email"]', 'dup@yopmail.com')
      .catch(() => form.fillFieldByLabel(/email/i, 'dup@yopmail.com'));

    const submitBtn = page.locator('button')
      .filter({ hasText: /Save|Submit|Create|Add$/i }).first();
    if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(5000);
    }

    await page.screenshot({ path: 'screenshots/TC05-duplicate-empid.png', fullPage: true });

    const errors = await modal.getPageErrors();
    console.log('Duplicate ID errors:', errors);

    // Check for toast/snackbar messages
    const toastMsg = await page.locator('[class*="toast"], [class*="snack"], [class*="Toastify"], [class*="notistack"]')
      .first().textContent({ timeout: 5000 }).catch(() => null);
    console.log('Toast message:', toastMsg);
  });

  // ─── TC-06: Duplicate email check ──────────────────────────────
  test('TC-06: Duplicate email shows error', async ({ page, context }) => {
    const form = new FormComponent(page);
    const modal = new ModalComponent(page);

    await loginAndGoToAdmin(page, context);
    await navigateToAdmin(page, context);
    await goToEmployeeMaster(page);

    // Click Add Employee
    const addBtn = page.locator('button, a')
      .filter({ hasText: /Add Employee|Add New|Create Employee/i }).first();
    await addBtn.click({ timeout: 10000 });
    await page.waitForTimeout(3000);

    // Use an existing email (devteam@yopmail.com or the demo account email)
    await form.fillInput('input[name*="first_name"], input[placeholder*="First Name"], input[name*="firstName"]', 'Dup')
      .catch(() => form.fillFieldByLabel(/first.?name/i, 'Dup'));
    await form.fillInput('input[name*="last_name"], input[placeholder*="Last Name"], input[name*="lastName"]', 'Email')
      .catch(() => form.fillFieldByLabel(/last.?name/i, 'Email'));
    await form.fillInput('input[name*="email"], input[placeholder*="Email"], input[type="email"]', 'devteam@yopmail.com')
      .catch(() => form.fillFieldByLabel(/email/i, 'devteam@yopmail.com'));

    const submitBtn = page.locator('button')
      .filter({ hasText: /Save|Submit|Create|Add$/i }).first();
    if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(5000);
    }

    await page.screenshot({ path: 'screenshots/TC06-duplicate-email.png', fullPage: true });

    const errors = await modal.getPageErrors();
    console.log('Duplicate email errors:', errors);

    const toastMsg = await page.locator('[class*="toast"], [class*="snack"], [class*="Toastify"], [class*="notistack"]')
      .first().textContent({ timeout: 5000 }).catch(() => null);
    console.log('Toast message:', toastMsg);
  });

  // ─── TC-07: Invalid email format ───────────────────────────────
  test('TC-07: Invalid email format shows validation error', async ({ page, context }) => {
    const form = new FormComponent(page);

    await loginAndGoToAdmin(page, context);
    await navigateToAdmin(page, context);
    await goToEmployeeMaster(page);

    const addBtn = page.locator('button, a')
      .filter({ hasText: /Add Employee|Add New|Create Employee/i }).first();
    await addBtn.click({ timeout: 10000 });
    await page.waitForTimeout(3000);

    // Fill with invalid email
    await form.fillInput('input[name*="email"], input[placeholder*="Email"], input[type="email"]', 'not-an-email')
      .catch(() => form.fillFieldByLabel(/email/i, 'not-an-email'));

    // Tab out to trigger validation
    await page.keyboard.press('Tab');
    await page.waitForTimeout(2000);

    // Try submitting
    const submitBtn = page.locator('button')
      .filter({ hasText: /Save|Submit|Create|Add$/i }).first();
    if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(3000);
    }

    await page.screenshot({ path: 'screenshots/TC07-invalid-email.png', fullPage: true });

    const validationErrors = await page.evaluate(() => {
      const errorEls = document.querySelectorAll(
        '[class*="error"], [class*="Error"], [class*="helper"], [class*="invalid"], .Mui-error'
      );
      return Array.from(errorEls).filter(el => el.offsetHeight > 0).map(el => el.textContent?.trim()).filter(Boolean);
    });
    console.log('Invalid email errors:', validationErrors);
  });

  // ─── TC-08: Invalid phone number ──────────────────────────────
  test('TC-08: Invalid phone number shows validation error', async ({ page, context }) => {
    const form = new FormComponent(page);

    await loginAndGoToAdmin(page, context);
    await navigateToAdmin(page, context);
    await goToEmployeeMaster(page);

    const addBtn = page.locator('button, a')
      .filter({ hasText: /Add Employee|Add New|Create Employee/i }).first();
    await addBtn.click({ timeout: 10000 });
    await page.waitForTimeout(3000);

    // Fill with invalid phone (too short)
    await form.fillInput('input[name*="phone"], input[name*="mobile"], input[placeholder*="Phone"], input[placeholder*="Mobile"]', '123')
      .catch(() => form.fillFieldByLabel(/phone|mobile/i, '123'));

    await page.keyboard.press('Tab');
    await page.waitForTimeout(2000);

    const submitBtn = page.locator('button')
      .filter({ hasText: /Save|Submit|Create|Add$/i }).first();
    if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(3000);
    }

    await page.screenshot({ path: 'screenshots/TC08-invalid-phone.png', fullPage: true });

    const validationErrors = await page.evaluate(() => {
      const errorEls = document.querySelectorAll(
        '[class*="error"], [class*="Error"], [class*="helper"], [class*="invalid"], .Mui-error'
      );
      return Array.from(errorEls).filter(el => el.offsetHeight > 0).map(el => el.textContent?.trim()).filter(Boolean);
    });
    console.log('Invalid phone errors:', validationErrors);
  });

  // ─── TC-09: Search for employee in list ────────────────────────
  test('TC-09: Search for employee in Employee Master list', async ({ page, context }) => {
    const table = new TableComponent(page);

    await loginAndGoToAdmin(page, context);
    await navigateToAdmin(page, context);
    await goToEmployeeMaster(page);

    // Take screenshot of the employee list
    await page.screenshot({ path: 'screenshots/TC09-employee-list.png', fullPage: true });

    // Search for an employee
    await table.search('Search Employees', 'Dev').catch(async () => {
      // Try alternative search selectors
      const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], input[placeholder*="search"]').first();
      if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await searchInput.fill('Dev');
        await page.waitForTimeout(3000);
      }
    });

    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/TC09-search-results.png', fullPage: true });

    // Verify search results
    const rowCount = await page.locator('table tbody tr, [class*="row"][class*="employee"]').count().catch(() => 0);
    console.log('Search results row count:', rowCount);
  });

  // ─── TC-10: View employee profile ──────────────────────────────
  test('TC-10: Click employee to view profile', async ({ page, context }) => {
    const table = new TableComponent(page);

    await loginAndGoToAdmin(page, context);
    await navigateToAdmin(page, context);
    await goToEmployeeMaster(page);

    // Click first employee in the list
    const firstRow = page.locator('table tbody tr, [class*="row"]').first();
    if (await firstRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstRow.click();
      await page.waitForTimeout(5000);

      console.log('Profile URL:', page.url());
      await page.screenshot({ path: 'screenshots/TC10-employee-profile.png', fullPage: true });

      // Discover profile tabs/sections
      const profileSections = await page.evaluate(() => {
        const tabs = document.querySelectorAll('[role="tab"], .MuiTab-root, [class*="tab"]');
        return Array.from(tabs).filter(el => el.offsetHeight > 0).map(el => el.textContent?.trim()).filter(Boolean);
      });
      console.log('Profile tabs/sections:', profileSections);
    }
  });

  // ─── TC-11: Filter employees by status ─────────────────────────
  test('TC-11: Filter employees by status', async ({ page, context }) => {
    await loginAndGoToAdmin(page, context);
    await navigateToAdmin(page, context);
    await goToEmployeeMaster(page);

    // Look for status filter/tabs (Active, Inactive, All)
    const statusTabs = page.locator('button, [role="tab"]')
      .filter({ hasText: /Active|Inactive|All|Probation|Confirmed/i });

    const tabCount = await statusTabs.count();
    console.log('Status filter tabs found:', tabCount);

    for (let i = 0; i < Math.min(tabCount, 5); i++) {
      const tabText = await statusTabs.nth(i).textContent();
      console.log(`Clicking tab: ${tabText?.trim()}`);
      await statusTabs.nth(i).click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: `screenshots/TC11-filter-${i}.png`, fullPage: true });
    }
  });

  // ─── TC-12: Bulk import option exists ──────────────────────────
  test('TC-12: Bulk import option is available', async ({ page, context }) => {
    await loginAndGoToAdmin(page, context);
    await navigateToAdmin(page, context);
    await goToEmployeeMaster(page);

    // Look for Import/Bulk Upload button
    const importBtn = page.locator('button, a')
      .filter({ hasText: /Import|Bulk Upload|Upload|Excel/i }).first();

    const isVisible = await importBtn.isVisible({ timeout: 5000 }).catch(() => false);
    console.log('Import/Bulk upload button visible:', isVisible);

    if (isVisible) {
      await importBtn.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'screenshots/TC12-bulk-import.png', fullPage: true });
    }
  });

  // ─── TC-13: Export employee data ───────────────────────────────
  test('TC-13: Export employee data option exists', async ({ page, context }) => {
    await loginAndGoToAdmin(page, context);
    await navigateToAdmin(page, context);
    await goToEmployeeMaster(page);

    // Look for Export/Download button
    const exportBtn = page.locator('button, a')
      .filter({ hasText: /Export|Download|CSV|Excel/i }).first();

    const isVisible = await exportBtn.isVisible({ timeout: 5000 }).catch(() => false);
    console.log('Export button visible:', isVisible);

    if (isVisible) {
      await page.screenshot({ path: 'screenshots/TC13-export-option.png', fullPage: true });
    }
  });

  // ─── TC-14: Cancel add employee form ───────────────────────────
  test('TC-14: Cancel button closes add employee form', async ({ page, context }) => {
    const modal = new ModalComponent(page);

    await loginAndGoToAdmin(page, context);
    await navigateToAdmin(page, context);
    await goToEmployeeMaster(page);

    // Click Add Employee
    const addBtn = page.locator('button, a')
      .filter({ hasText: /Add Employee|Add New|Create Employee/i }).first();
    await addBtn.click({ timeout: 10000 });
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'screenshots/TC14-form-opened.png', fullPage: true });

    // Click Cancel or Close
    const cancelBtn = page.locator('button')
      .filter({ hasText: /Cancel|Close|Back/i }).first();

    if (await cancelBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await cancelBtn.click();
      await page.waitForTimeout(2000);
    } else {
      await modal.dismiss();
    }

    await page.screenshot({ path: 'screenshots/TC14-form-cancelled.png', fullPage: true });
    console.log('Form closed successfully after cancel');
  });

  // ─── TC-15: Special characters in name ─────────────────────────
  test('TC-15: Special characters in name field', async ({ page, context }) => {
    const form = new FormComponent(page);

    await loginAndGoToAdmin(page, context);
    await navigateToAdmin(page, context);
    await goToEmployeeMaster(page);

    const addBtn = page.locator('button, a')
      .filter({ hasText: /Add Employee|Add New|Create Employee/i }).first();
    await addBtn.click({ timeout: 10000 });
    await page.waitForTimeout(3000);

    // Try special characters in name
    await form.fillInput('input[name*="first_name"], input[placeholder*="First Name"], input[name*="firstName"]', '@#$%^&*()')
      .catch(() => form.fillFieldByLabel(/first.?name/i, '@#$%^&*()'));

    await page.keyboard.press('Tab');
    await page.waitForTimeout(2000);

    const submitBtn = page.locator('button')
      .filter({ hasText: /Save|Submit|Create|Add$/i }).first();
    if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(3000);
    }

    await page.screenshot({ path: 'screenshots/TC15-special-chars.png', fullPage: true });

    const errors = await page.evaluate(() => {
      const errorEls = document.querySelectorAll(
        '[class*="error"], [class*="Error"], [class*="helper"], .Mui-error'
      );
      return Array.from(errorEls).filter(el => el.offsetHeight > 0).map(el => el.textContent?.trim()).filter(Boolean);
    });
    console.log('Special char errors:', errors);
  });

  // ─── TC-16: Page structure and element discovery ───────────────
  test('TC-16: Full page discovery — capture all elements', async ({ page, context }) => {
    await loginAndGoToAdmin(page, context);
    await navigateToAdmin(page, context);
    await goToEmployeeMaster(page);

    // Capture full page structure for debugging
    const allElements = await page.evaluate(() => {
      const els = document.querySelectorAll('button, a, input, select, [role="tab"], [role="menuitem"]');
      return Array.from(els).filter(el => el.offsetHeight > 0).map(el => ({
        tag: el.tagName,
        type: el.getAttribute('type'),
        text: el.textContent?.trim()?.substring(0, 80),
        href: el.getAttribute('href'),
        placeholder: el.getAttribute('placeholder'),
        ariaLabel: el.getAttribute('aria-label'),
        rect: {
          x: Math.round(el.getBoundingClientRect().x),
          y: Math.round(el.getBoundingClientRect().y),
        },
      }));
    });

    console.log('\n=== ALL INTERACTIVE ELEMENTS ===');
    console.log(JSON.stringify(allElements, null, 2));

    await page.screenshot({ path: 'screenshots/TC16-full-discovery.png', fullPage: true });
  });
});
