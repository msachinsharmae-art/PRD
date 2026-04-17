// @ts-check
const { test, expect } = require('@playwright/test');

test('Find nine-dot menu and navigate to Payroll', async ({ page }) => {
  // Login
  await page.goto('https://www.zimyo.net');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await page.locator('#username').fill('devteam@yopmail.com');
  await page.locator('#password').fill('Zimyo@12345');
  await page.locator('button[type="submit"]').click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);

  // The unlabelled button at x:1112 could be the nine-dot grid
  // Let's try clicking it
  const topButtons = page.locator('button.MuiIconButton-root').filter({ hasNot: page.locator('[aria-label]') });
  const count = await topButtons.count();
  console.log('Unlabelled icon buttons:', count);

  // Click the button at approximate position x:1112, y:3 (index 3 - no aria-label, 40x40)
  const nineDotBtn = page.locator('button.MuiIconButton-sizeMedium.css-1yxmbwk');
  if (await nineDotBtn.isVisible()) {
    console.log('Found potential nine-dot button');
    await nineDotBtn.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/after-ninedot-click.png', fullPage: true });

    // Check what popped up
    const popupContent = await page.evaluate(() => {
      const popups = document.querySelectorAll('[role="dialog"], [role="menu"], [role="listbox"], .MuiPopover-root, .MuiDrawer-root, .MuiModal-root, [class*="popover"], [class*="popup"], [class*="drawer"], [class*="modal"]');
      return Array.from(popups).map(el => ({
        tag: el.tagName,
        className: el.className?.toString?.()?.substring(0, 100),
        text: el.textContent?.trim()?.substring(0, 500),
        visible: el.getBoundingClientRect().width > 0,
      }));
    });
    console.log('\n=== POPUP/DIALOG CONTENT ===');
    console.log(JSON.stringify(popupContent, null, 2));
  } else {
    console.log('Nine-dot button not found by class, trying by position');
    // Try clicking by coordinates
    await page.mouse.click(1132, 23);
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/after-position-click.png', fullPage: true });

    const popupContent = await page.evaluate(() => {
      const popups = document.querySelectorAll('[role="dialog"], [role="menu"], [role="listbox"], .MuiPopover-root, .MuiDrawer-root, .MuiModal-root, [class*="popover"], [class*="popup"], [class*="drawer"], [class*="modal"]');
      return Array.from(popups).map(el => ({
        tag: el.tagName,
        className: el.className?.toString?.()?.substring(0, 100),
        text: el.textContent?.trim()?.substring(0, 500),
        visible: el.getBoundingClientRect().width > 0,
      }));
    });
    console.log('\n=== POPUP/DIALOG CONTENT ===');
    console.log(JSON.stringify(popupContent, null, 2));
  }
});
