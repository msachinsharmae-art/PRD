// @ts-check
const { test, expect } = require('@playwright/test');

test('Discover admin page and navigate to Payroll', async ({ page }) => {
  // Login first
  await page.goto('https://www.zimyo.net');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await page.locator('#username').fill('devteam@yopmail.com');
  await page.locator('#password').fill('Zimyo@12345');
  await page.locator('button[type="submit"]').click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);

  console.log('Post-login URL:', page.url());
  await page.screenshot({ path: 'screenshots/admin-dashboard.png', fullPage: true });

  // Find the nine-dot menu (app switcher) - usually top right
  const topRightButtons = await page.evaluate(() => {
    const els = document.querySelectorAll('button, [role="button"], svg, [class*="grid"], [class*="menu"], [class*="app"], [class*="dot"], [class*="nine"], [class*="module"], [class*="switch"]');
    return Array.from(els).slice(0, 30).map(el => ({
      tag: el.tagName,
      className: el.className?.toString?.()?.substring(0, 100),
      id: el.id,
      ariaLabel: el.getAttribute('aria-label'),
      title: el.getAttribute('title'),
      text: el.textContent?.trim()?.substring(0, 50),
      dataTestId: el.getAttribute('data-testid'),
    }));
  });

  console.log('\n=== TOP AREA ELEMENTS ===');
  console.log(JSON.stringify(topRightButtons, null, 2));

  // Also look for icon buttons in header/navbar area
  const headerElements = await page.evaluate(() => {
    const header = document.querySelector('header, nav, [class*="header"], [class*="navbar"], [class*="topbar"], [class*="appbar"]');
    if (!header) return 'No header found';
    return {
      html: header.innerHTML.substring(0, 2000),
      children: Array.from(header.querySelectorAll('button, a, [role="button"], svg')).map(el => ({
        tag: el.tagName,
        className: el.className?.toString?.()?.substring(0, 80),
        ariaLabel: el.getAttribute('aria-label'),
        title: el.getAttribute('title'),
        text: el.textContent?.trim()?.substring(0, 50),
      }))
    };
  });

  console.log('\n=== HEADER ELEMENTS ===');
  console.log(JSON.stringify(headerElements, null, 2));
});
