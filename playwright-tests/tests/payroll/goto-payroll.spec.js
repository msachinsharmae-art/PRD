// @ts-check
const { test, expect } = require('@playwright/test');

test.setTimeout(120000);

test('Navigate to Payroll - handle new tab', async ({ page, context }) => {
  // Login
  await page.goto('https://www.zimyo.net', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(3000);
  await page.locator('#username').fill('devteam@yopmail.com');
  await page.locator('#password').fill('Zimyo@12345');
  await page.locator('button[type="submit"]').click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(6000);

  // Click the nine-dot grid button (the one containing AppsIcon SVG)
  await page.locator('button:has(svg[data-testid="AppsIcon"])').click();
  await page.waitForTimeout(2000);

  // Screenshot the popup
  await page.screenshot({ path: 'screenshots/apps-popup.png' });

  // Get Payroll element details
  const payrollLink = await page.evaluate(() => {
    const all = document.querySelectorAll('*');
    const results = [];
    for (const el of all) {
      if (el.textContent?.trim() === 'Payroll' && el.children.length === 0) {
        results.push({
          tag: el.tagName,
          href: el.closest('a')?.getAttribute('href'),
          className: el.className?.toString?.()?.substring(0, 100),
          parentTag: el.parentElement?.tagName,
          grandparentTag: el.parentElement?.parentElement?.tagName,
          closestAnchor: el.closest('a')?.outerHTML?.substring(0, 200),
        });
      }
    }
    return results;
  });
  console.log('=== PAYROLL ELEMENT DETAILS ===');
  console.log(JSON.stringify(payrollLink, null, 2));

  // Listen for new tab and click Payroll
  const pagePromise = context.waitForEvent('page', { timeout: 10000 }).catch(() => null);

  // Find and click the Payroll text in the popover
  const popover = page.locator('.MuiPopover-paper');
  await popover.getByText('Payroll', { exact: true }).click();

  const newPage = await pagePromise;

  if (newPage) {
    await newPage.waitForLoadState('networkidle');
    await newPage.waitForTimeout(5000);
    console.log('NEW TAB URL:', newPage.url());
    await newPage.screenshot({ path: 'screenshots/payroll-module.png', fullPage: true });

    // Get sidebar menu
    const sidebar = await newPage.evaluate(() => {
      const links = document.querySelectorAll('a');
      return Array.from(links).filter(el => el.getBoundingClientRect().x < 120 && el.getBoundingClientRect().y > 50).map(el => ({
        text: el.textContent?.trim()?.substring(0, 60),
        href: el.getAttribute('href'),
        y: Math.round(el.getBoundingClientRect().y),
      }));
    });
    console.log('\n=== PAYROLL SIDEBAR ===');
    console.log(JSON.stringify(sidebar, null, 2));

    // Get tabs on payroll page
    const tabs = await newPage.evaluate(() => {
      const tabEls = document.querySelectorAll('[role="tab"], .MuiTab-root');
      return Array.from(tabEls).map(el => ({
        text: el.textContent?.trim(),
        href: el.getAttribute('href'),
      }));
    });
    console.log('\n=== PAYROLL TABS ===');
    console.log(JSON.stringify(tabs, null, 2));
  } else {
    // Maybe it navigated in the same tab
    await page.waitForTimeout(5000);
    console.log('Same tab URL:', page.url());
    await page.screenshot({ path: 'screenshots/payroll-same-tab.png', fullPage: true });
  }
});
