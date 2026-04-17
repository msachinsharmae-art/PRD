// @ts-check
const { test } = require('@playwright/test');
const { injectMixpanel, trackInBrowser } = require('../../utils/mixpanel-init');

test.describe.serial('Mixpanel Verify — Login + Explore Payroll', () => {
  let page, context;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    injectMixpanel(page);
  });
  test.afterAll(async () => { await context.close(); });

  test('Login to Zimyo', async () => {
    test.setTimeout(90000);
    await page.goto('https://www.zimyo.net', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(3000);

    // Select Email ID login method
    await page.locator('.MuiAutocomplete-root').first().click();
    await page.waitForTimeout(1000);
    await page.locator('[role="option"]:has-text("Email ID")').click();
    await page.waitForTimeout(1000);

    // Fill credentials
    await page.locator('#username').fill('sachin.sharma+demo@zimyo.com');
    await page.locator('#password').fill('Zimyo@12345');
    await page.waitForTimeout(500);
    await page.locator('button:has-text("Login")').first().click();
    await page.waitForURL('**/admin/**', { timeout: 60000 });
    await page.waitForTimeout(5000);

    console.log('>>> Logged in:', page.url());

    // Track Sign In event
    await trackInBrowser(page, 'Sign In', {
      user_id: 'sachin.sharma+demo@zimyo.com',
      login_method: 'email',
      success: true,
    });

    await page.screenshot({ path: 'screenshots/mp-01-logged-in.png' });
  });

  test('Navigate to Payroll module', async () => {
    test.setTimeout(60000);

    // Click nine-dot icon to open module switcher
    await page.locator('[data-testid="AppsIcon"]').click();
    await page.waitForTimeout(2000);

    // Track Page View for module switcher
    await trackInBrowser(page, 'Page View', {
      page_url: page.url(),
      page_title: 'Module Switcher',
      user_id: 'sachin.sharma+demo@zimyo.com',
    });

    // Click Payroll
    await page.locator('text=Payroll').first().click();
    await page.waitForTimeout(8000);

    // Check if payroll opened in new tab
    const pages = context.pages();
    const payrollPage = pages.find(p => p.url().includes('payroll'));
    if (payrollPage && payrollPage !== page) {
      console.log('>>> Payroll opened in new tab');
      page = payrollPage;
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(3000);
      injectMixpanel(page);
      await page.waitForTimeout(2000);
    }

    console.log('>>> Payroll URL:', page.url());
    await page.screenshot({ path: 'screenshots/mp-02-payroll-home.png', fullPage: true });

    await trackInBrowser(page, 'Page View', {
      page_url: page.url(),
      page_title: 'Payroll Home',
      user_id: 'sachin.sharma+demo@zimyo.com',
    });
  });

  test('Explore Payroll — Employees section', async () => {
    test.setTimeout(60000);

    await page.goto('https://www.zimyo.net/payroll/employees/list', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(5000);

    console.log('>>> Employees URL:', page.url());
    await page.screenshot({ path: 'screenshots/mp-03-payroll-employees.png', fullPage: true });

    await trackInBrowser(page, 'Page View', {
      page_url: page.url(),
      page_title: 'Payroll Employees',
      user_id: 'sachin.sharma+demo@zimyo.com',
    });
  });

  test('Explore Payroll — Run Payroll section', async () => {
    test.setTimeout(60000);

    await page.goto('https://www.zimyo.net/payroll/payroll-operations/run-payroll', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(5000);

    console.log('>>> Run Payroll URL:', page.url());
    await page.screenshot({ path: 'screenshots/mp-04-run-payroll.png', fullPage: true });

    await trackInBrowser(page, 'Page View', {
      page_url: page.url(),
      page_title: 'Run Payroll',
      user_id: 'sachin.sharma+demo@zimyo.com',
    });
  });

  test('Explore Payroll — Configuration', async () => {
    test.setTimeout(60000);

    await page.goto('https://www.zimyo.net/payroll/configuration/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(5000);

    console.log('>>> Config URL:', page.url());
    await page.screenshot({ path: 'screenshots/mp-05-payroll-config.png', fullPage: true });

    await trackInBrowser(page, 'Page View', {
      page_url: page.url(),
      page_title: 'Payroll Configuration',
      user_id: 'sachin.sharma+demo@zimyo.com',
    });

    // Final flush — wait for all Mixpanel events to send
    await page.waitForTimeout(5000);
    console.log('>>> All Mixpanel events tracked');
  });
});
