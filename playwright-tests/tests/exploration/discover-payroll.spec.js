// @ts-check
const { test, expect } = require('@playwright/test');

test('Click nine-dot grid and find Payroll', async ({ page }) => {
  // Login
  await page.goto('https://www.zimyo.net');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await page.locator('#username').fill('devteam@yopmail.com');
  await page.locator('#password').fill('Zimyo@12345');
  await page.locator('button[type="submit"]').click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(6000);

  // From the screenshot, the nine-dot grid icon is at approximately x:1132, y:22
  // Let's click it precisely
  await page.mouse.click(1132, 22);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'screenshots/ninedot-popup.png', fullPage: false });

  // Check for any new overlay/popup/drawer that appeared
  const allText = await page.evaluate(() => {
    // Look for anything that appeared as overlay
    const overlays = document.querySelectorAll('.MuiPopover-root, .MuiDrawer-root, .MuiDialog-root, .MuiModal-root, [role="presentation"], [role="dialog"], [role="menu"]');
    return Array.from(overlays).map(el => ({
      tag: el.tagName,
      class: el.className?.toString?.()?.substring(0, 100),
      text: el.textContent?.trim()?.substring(0, 1000),
      visible: el.offsetHeight > 0,
    }));
  });
  console.log('=== OVERLAYS AFTER CLICK ===');
  console.log(JSON.stringify(allText, null, 2));

  // Also check if anything new is visible with high z-index
  const highZElements = await page.evaluate(() => {
    const all = document.querySelectorAll('*');
    const highZ = [];
    for (const el of all) {
      const style = window.getComputedStyle(el);
      const z = parseInt(style.zIndex);
      if (z > 100 && el.offsetHeight > 0 && el.textContent?.trim()) {
        highZ.push({
          tag: el.tagName,
          class: el.className?.toString?.()?.substring(0, 80),
          zIndex: z,
          text: el.textContent?.trim()?.substring(0, 300),
        });
      }
    }
    return highZ;
  });
  console.log('\n=== HIGH Z-INDEX ELEMENTS ===');
  console.log(JSON.stringify(highZElements, null, 2));
});
