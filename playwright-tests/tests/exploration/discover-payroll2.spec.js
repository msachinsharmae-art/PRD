// @ts-check
const { test, expect } = require('@playwright/test');

test('Click nine-dot grid precisely and find Payroll', async ({ page }) => {
  // Login
  await page.goto('https://www.zimyo.net');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await page.locator('#username').fill('devteam@yopmail.com');
  await page.locator('#password').fill('Zimyo@12345');
  await page.locator('button[type="submit"]').click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(8000);

  // Let's get the exact icon buttons in the top bar with their SVG content
  const topBarIcons = await page.evaluate(() => {
    const buttons = document.querySelectorAll('button.MuiIconButton-root');
    return Array.from(buttons).map((btn, i) => {
      const rect = btn.getBoundingClientRect();
      const svg = btn.querySelector('svg');
      return {
        index: i,
        ariaLabel: btn.getAttribute('aria-label'),
        rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
        svgViewBox: svg?.getAttribute('viewBox'),
        svgPath: svg?.querySelector('path')?.getAttribute('d')?.substring(0, 50),
        classes: btn.className.substring(0, 100),
        childCount: btn.children.length,
        innerHTML: btn.innerHTML.substring(0, 200),
      };
    });
  });
  console.log('=== ALL ICON BUTTONS ===');
  console.log(JSON.stringify(topBarIcons, null, 2));

  // Try clicking each top-right button one by one (those with y < 50)
  const topButtons = topBarIcons.filter(b => b.rect.y < 50 && b.rect.x > 1000);
  console.log('\nTop-right buttons to try:', topButtons.length);

  for (const btn of topButtons) {
    const centerX = btn.rect.x + btn.rect.w / 2;
    const centerY = btn.rect.y + btn.rect.h / 2;
    console.log(`\nClicking button ${btn.index} at (${centerX}, ${centerY}) aria: ${btn.ariaLabel}`);

    await page.mouse.click(centerX, centerY);
    await page.waitForTimeout(2000);

    // Check for popups
    const popups = await page.evaluate(() => {
      const els = document.querySelectorAll('.MuiPopover-paper, .MuiDrawer-paper, .MuiMenu-paper, .MuiDialog-paper, [role="presentation"] .MuiPaper-root');
      return Array.from(els).filter(el => el.offsetHeight > 0).map(el => ({
        class: el.className?.toString()?.substring(0, 80),
        text: el.textContent?.trim()?.substring(0, 500),
      }));
    });

    if (popups.length > 0) {
      console.log('POPUP FOUND!');
      console.log(JSON.stringify(popups, null, 2));
      await page.screenshot({ path: `screenshots/popup-btn-${btn.index}.png` });

      // Check if payroll is mentioned
      const hasPayroll = popups.some(p => p.text?.toLowerCase().includes('payroll'));
      if (hasPayroll) {
        console.log('*** PAYROLL FOUND IN POPUP! ***');
      }
    }

    // Close popup by pressing Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }
});
