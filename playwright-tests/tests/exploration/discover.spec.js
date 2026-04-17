// @ts-check
const { test, expect } = require('@playwright/test');

test('Discover login page selectors', async ({ page }) => {
  await page.goto('https://www.zimyo.net');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // Screenshot the login page
  await page.screenshot({ path: 'screenshots/login-page-full.png', fullPage: true });

  // Dump all input fields
  const inputs = await page.evaluate(() => {
    const els = document.querySelectorAll('input, button, [role="button"]');
    return Array.from(els).map(el => ({
      tag: el.tagName,
      type: el.getAttribute('type'),
      name: el.getAttribute('name'),
      id: el.id,
      placeholder: el.getAttribute('placeholder'),
      className: el.className,
      text: el.textContent?.trim().substring(0, 50),
      ariaLabel: el.getAttribute('aria-label'),
    }));
  });

  console.log('\n=== LOGIN PAGE FORM ELEMENTS ===');
  console.log(JSON.stringify(inputs, null, 2));

  // Also get the page title
  const title = await page.title();
  console.log('\nPage Title:', title);

  // Get all visible text on page
  const bodyText = await page.evaluate(() => document.body?.innerText?.substring(0, 1000));
  console.log('\nPage Text:', bodyText);
});
