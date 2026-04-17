// @ts-check
const { test, expect, chromium } = require('@playwright/test');
const fs = require('fs');

// No timeout — browser stays open as long as needed
test.setTimeout(0);

// Single persistent session — login once, stay on payroll
test('Payroll Live Session', async () => {
  // Launch browser — stays open the entire time
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  // ========== STEP 1: LOGIN ==========
  console.log('>>> STEP 1: Logging in...');
  await page.goto('https://www.zimyo.net', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(3000);
  await page.locator('#username').fill('devteam@yopmail.com');
  await page.locator('#password').fill('Zimyo@12345');
  await page.locator('button[type="submit"]').click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(6000);
  console.log('>>> Logged in. URL:', page.url());

  // ========== STEP 2: NAVIGATE TO PAYROLL ==========
  console.log('>>> STEP 2: Opening Payroll module...');

  // Click nine-dot app switcher
  const appsBtn = page.locator('button').filter({ has: page.locator('svg[data-testid="AppsIcon"]') });
  await appsBtn.click();
  await page.waitForTimeout(2000);

  // Click Payroll — opens in new tab
  const [payrollPage] = await Promise.all([
    context.waitForEvent('page', { timeout: 15000 }),
    page.locator('.MuiPopover-paper').getByText('Payroll', { exact: true }).click(),
  ]);

  await payrollPage.waitForLoadState('networkidle').catch(() => {});
  await payrollPage.waitForTimeout(5000);
  console.log('>>> Payroll opened. URL:', payrollPage.url());
  await payrollPage.screenshot({ path: 'screenshots/payroll-live.png', fullPage: true });

  // Close the old admin tab — keep only payroll
  await page.close();

  // ========== PAYROLL IS NOW OPEN AND VISIBLE ==========
  console.log('>>> Payroll module is live. Browser stays open.');
  console.log('>>> Waiting for further actions...');

  // Keep the browser open — pause here so user can see it
  // This will hold until the test is manually stopped (Ctrl+C)
  await payrollPage.pause();

  // Cleanup (only runs after manual stop)
  await browser.close();
});
