// @ts-check
const { test, expect } = require('@playwright/test');

test('Discover admin page - broad scan', async ({ page }) => {
  // Login
  await page.goto('https://www.zimyo.net');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await page.locator('#username').fill('devteam@yopmail.com');
  await page.locator('#password').fill('Zimyo@12345');
  await page.locator('button[type="submit"]').click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(8000);

  console.log('URL:', page.url());

  // Get ALL buttons and clickable elements on page
  const allClickables = await page.evaluate(() => {
    const els = document.querySelectorAll('button, a, [role="button"], [onclick], [class*="icon"], img[class*="icon"]');
    return Array.from(els).map((el, i) => ({
      index: i,
      tag: el.tagName,
      className: el.className?.toString?.()?.substring(0, 120),
      id: el.id,
      href: el.getAttribute('href'),
      ariaLabel: el.getAttribute('aria-label'),
      title: el.getAttribute('title'),
      text: el.textContent?.trim()?.substring(0, 60),
      rect: el.getBoundingClientRect ? {
        x: Math.round(el.getBoundingClientRect().x),
        y: Math.round(el.getBoundingClientRect().y),
        w: Math.round(el.getBoundingClientRect().width),
        h: Math.round(el.getBoundingClientRect().height),
      } : null,
    }));
  });

  console.log('\n=== ALL CLICKABLE ELEMENTS ===');
  // Filter for elements in top area (y < 80)
  const topElements = allClickables.filter(el => el.rect && el.rect.y < 80);
  console.log('\nTOP BAR ELEMENTS (y < 80):');
  console.log(JSON.stringify(topElements, null, 2));

  console.log('\nALL ELEMENTS COUNT:', allClickables.length);
  console.log('\nFIRST 40 ELEMENTS:');
  console.log(JSON.stringify(allClickables.slice(0, 40), null, 2));

  // Screenshot
  await page.screenshot({ path: 'screenshots/admin-page-full.png', fullPage: true });
});
