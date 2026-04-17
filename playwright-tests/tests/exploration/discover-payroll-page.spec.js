// @ts-check
const { test, expect } = require('@playwright/test');

test('Navigate to Payroll module and discover page', async ({ page }) => {
  // Login
  await page.goto('https://www.zimyo.net');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await page.locator('#username').fill('devteam@yopmail.com');
  await page.locator('#password').fill('Zimyo@12345');
  await page.locator('button[type="submit"]').click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(6000);

  // Click the nine-dot grid (AppsIcon) button
  await page.locator('[data-testid="AppsIcon"]').click();
  await page.waitForTimeout(2000);

  // Click Payroll in the popup
  await page.getByText('Payroll', { exact: true }).click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);

  console.log('Payroll URL:', page.url());
  await page.screenshot({ path: 'screenshots/payroll-page.png', fullPage: true });

  // Get left sidebar menu items
  const sidebarItems = await page.evaluate(() => {
    const links = document.querySelectorAll('a[href*="payroll"], a.left-menu-item, [class*="left-menu"]');
    return Array.from(links).map(el => ({
      text: el.textContent?.trim()?.substring(0, 60),
      href: el.getAttribute('href'),
    }));
  });
  console.log('\n=== PAYROLL SIDEBAR MENU ===');
  console.log(JSON.stringify(sidebarItems, null, 2));

  // Get all visible text/tabs on the payroll page
  const pageTabs = await page.evaluate(() => {
    const tabs = document.querySelectorAll('[role="tab"], .MuiTab-root, a.MuiTab-root');
    return Array.from(tabs).map(el => ({
      text: el.textContent?.trim(),
      href: el.getAttribute('href'),
    }));
  });
  console.log('\n=== PAYROLL PAGE TABS ===');
  console.log(JSON.stringify(pageTabs, null, 2));
});
