// @ts-check
// SKIP LOGIN & MODIFY SALARY (already done)
// Just: Login → Go to Run Payroll → Set filters → Check Success & Error tabs → Find Test Shift
const { test, chromium } = require('@playwright/test');
const fs = require('fs');
test.setTimeout(0);

test('Run Payroll for Test Shift — check Success & Error tabs', async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const p = await context.newPage();

  // ===== LOGIN =====
  console.log('>>> LOGIN...');
  for (let i = 0; i < 3; i++) {
    try { await p.goto('https://www.zimyo.net', { waitUntil: 'domcontentloaded', timeout: 30000 }); break; }
    catch { await p.waitForTimeout(3000); }
  }
  await p.waitForLoadState('networkidle').catch(() => {});
  await p.waitForTimeout(3000);
  await p.locator('#username').fill('devteam@yopmail.com');
  await p.locator('#password').fill('Zimyo@12345');
  await p.locator('button[type="submit"]').click();
  await p.waitForLoadState('networkidle').catch(() => {});
  await p.waitForTimeout(6000);
  console.log('>>> Logged in');

  // ===== GO DIRECTLY TO RUN PAYROLL =====
  console.log('>>> Opening Run Payroll...');
  await p.goto('https://www.zimyo.net/payroll/payroll-operations/run-payroll', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await p.waitForLoadState('networkidle').catch(() => {});
  await p.waitForTimeout(8000);
  await p.screenshot({ path: 'screenshots/rp-01-page.png' });

  // ===== SET ALL FILTERS =====
  // From screenshot: Entity ~x:280,y:194 | Month-Year ~x:555,y:194 | Status ~x:833,y:194 | Employee Group ~x:1110,y:194

  // Helper to select a react-select option
  async function pickFilter(x, y, text, label) {
    console.log(`>>> ${label}: clicking dropdown...`);
    await p.mouse.click(x, y);
    await p.waitForTimeout(800);
    await p.keyboard.press('Control+a');
    await p.keyboard.press('Backspace');
    await p.keyboard.type(text, { delay: 80 });
    await p.waitForTimeout(1500);
    const opt = p.locator('[class*="option"]').first();
    if (await opt.isVisible({ timeout: 3000 }).catch(() => false)) {
      await opt.click();
      console.log(`>>> ${label} → selected!`);
    } else {
      await p.keyboard.press('Enter');
      console.log(`>>> ${label} → entered`);
    }
    await p.waitForTimeout(800);
  }

  // Entity — select All
  await pickFilter(280, 194, 'All', 'Entity');

  // Month-Year — select March 2026
  await pickFilter(555, 194, 'Mar-2026', 'Month-Year');

  // Status — need to CLEAR existing tags first (Pending × and Attendance Locked ×)
  // Then select All
  console.log('>>> Clearing Status filter...');
  // Click X on "Pending" tag
  const pendingX = p.locator('text=Pending').locator('..').locator('svg, [class*="remove"]').first();
  await pendingX.click().catch(() => {});
  await p.waitForTimeout(500);
  // Click X on "Attendance Locked" tag
  const lockedX = p.locator('text=Attendance Locked').locator('..').locator('svg, [class*="remove"]').first();
  await lockedX.click().catch(() => {});
  await p.waitForTimeout(500);
  // Now click Status dropdown and select All
  await pickFilter(833, 194, 'All', 'Status');

  // Employee Group — already has Active, which should be fine
  // But let's also ensure it has "All" or keep Active

  await p.screenshot({ path: 'screenshots/rp-02-filters.png' });

  // ===== CLICK SEARCH =====
  console.log('>>> Clicking Search...');
  await p.locator('button').filter({ hasText: /^Search/ }).first().click();
  await p.waitForTimeout(10000);
  await p.screenshot({ path: 'screenshots/rp-03-results.png' });

  // ===== CHECK SUCCESS TAB =====
  console.log('>>> Checking Success tab...');
  const successTab = p.locator('button, [role="tab"]').filter({ hasText: /Success/i }).first();
  const successText = await successTab.textContent().catch(() => '');
  console.log('>>> Success tab:', successText);

  // Click Success tab and search for Test Shift
  await successTab.click();
  await p.waitForTimeout(2000);

  // Search for Test Shift in the employee search bar
  const searchInput = p.locator('input[placeholder*="Search Employee"]').first();
  if (await searchInput.isVisible().catch(() => false)) {
    await searchInput.fill('test shift');
    await p.waitForTimeout(3000);
  }

  // Check if Test Shift is visible in Success tab
  const inSuccess = await p.getByText('Test Shift', { exact: false }).isVisible().catch(() => false);
  console.log('>>> Test Shift in Success tab:', inSuccess);
  await p.screenshot({ path: 'screenshots/rp-04-success-tab.png' });

  if (inSuccess) {
    // Select checkbox and proceed
    console.log('>>> Found in Success! Selecting checkbox...');
    await p.evaluate(() => {
      const rows = document.querySelectorAll('tr');
      for (const row of rows) {
        if (row.textContent?.toLowerCase().includes('test shift')) {
          const cb = row.querySelector('input[type="checkbox"]');
          if (cb) { cb.click(); return; }
        }
      }
    });
    await p.waitForTimeout(2000);
    await p.screenshot({ path: 'screenshots/rp-05-selected.png' });

    // Lock Attendance & Proceed
    console.log('>>> Clicking Lock Attendance & Proceed...');
    await p.locator('button').filter({ hasText: /Lock Attendance/i }).first().click();
    await p.waitForTimeout(8000);
    await p.screenshot({ path: 'screenshots/rp-06-locked.png', fullPage: true });
    console.log('>>> DONE — Attendance locked!');

    // Log success
    fs.appendFileSync('PROGRESS.md', `
### Run Payroll — Test Shift March 2026 — ${new Date().toISOString().split('T')[0]}
| Step | Status |
|------|--------|
| Set filters (Entity=All, Month=Mar-2026) | DONE |
| Search | DONE |
| Found Test Shift in SUCCESS tab | PASSED |
| Selected checkbox | DONE |
| Lock Attendance & Proceed | DONE |
`);

  } else {
    // ===== CHECK ERROR TAB =====
    console.log('>>> Not in Success tab. Checking Error tab...');
    // Clear the search first
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.clear();
      await p.waitForTimeout(1000);
    }

    const errorTab = p.locator('button, [role="tab"]').filter({ hasText: /Error/i }).first();
    const errorText = await errorTab.textContent().catch(() => '');
    console.log('>>> Error tab:', errorText);
    await errorTab.click();
    await p.waitForTimeout(3000);

    await p.waitForTimeout(3000);
    await p.screenshot({ path: 'screenshots/rp-05-error-tab.png' });

    // Error tab has no search bar — need to scroll through the list to find Test Shift
    // Or check if the text is anywhere on the page (it may be visible or need scrolling)
    let inError = await p.getByText('Test Shift', { exact: false }).isVisible().catch(() => false);

    // If not visible, scroll down the error list to find it
    if (!inError) {
      console.log('>>> Scrolling to find Test Shift in error list...');
      for (let scroll = 0; scroll < 20; scroll++) {
        await p.mouse.wheel(0, 300);
        await p.waitForTimeout(500);
        inError = await p.getByText('Test Shift', { exact: false }).isVisible().catch(() => false);
        if (inError) break;
      }
    }
    console.log('>>> Test Shift in Error tab:', inError);

    if (inError) {
      console.log('>>> FOUND IN ERROR TAB! Capturing error details...');

      // Read the error details from the row
      const errorDetails = await p.evaluate(() => {
        const rows = document.querySelectorAll('tr, [class*="row"]');
        for (const row of rows) {
          if (row.textContent?.toLowerCase().includes('test shift')) {
            // Get all cell text from this row
            const cells = row.querySelectorAll('td, [class*="cell"]');
            const data = Array.from(cells).map(c => c.textContent?.trim());
            return {
              rowText: row.textContent?.trim()?.substring(0, 500),
              cells: data,
            };
          }
        }
        return { rowText: 'Row not found', cells: [] };
      });
      console.log('>>> Error details:', JSON.stringify(errorDetails, null, 2));
      await p.screenshot({ path: 'screenshots/rp-06-error-details.png', fullPage: true });

      // Log error to ERRORS.md
      const errorLog = `| ${new Date().toISOString().split('T')[0]} | RP-001 | Run Payroll - Test Shift March 2026 | Employee found in ERROR tab: ${errorDetails.cells.join(' | ')} | rp-06-error-details.png | OPEN |`;

      let errFile = fs.readFileSync('ERRORS.md', 'utf-8');
      if (errFile.includes('_No errors recorded yet._')) {
        errFile = errFile.replace(
          '_No errors recorded yet._',
          `| Date | Test ID | Feature | Error | Screenshot | Status |\n|------|---------|---------|-------|------------|--------|\n${errorLog}`
        );
      } else {
        errFile += '\n' + errorLog;
      }
      fs.writeFileSync('ERRORS.md', errFile);
      console.log('>>> Error logged to ERRORS.md');

      // Log to PROGRESS.md as failed
      fs.appendFileSync('PROGRESS.md', `
### Run Payroll — Test Shift March 2026 — ${new Date().toISOString().split('T')[0]}
| Step | Status |
|------|--------|
| Set filters (Entity=All, Month=Mar-2026) | DONE |
| Search | DONE |
| Test Shift in Success tab | NOT FOUND |
| Test Shift in Error tab | FOUND — ERROR |
| Error details captured | DONE |
| **TEST CASE: FAILED** | Employee has payroll errors |
`);

    } else {
      console.log('>>> Test Shift not found in either tab!');
      fs.appendFileSync('PROGRESS.md', `
### Run Payroll — Test Shift March 2026 — ${new Date().toISOString().split('T')[0]}
| Step | Status |
|------|--------|
| Set filters | DONE |
| Test Shift in Success tab | NOT FOUND |
| Test Shift in Error tab | NOT FOUND |
| **TEST CASE: BLOCKED** | Employee not in any tab |
`);
    }
  }

  console.log('>>> COMPLETE. Browser stays open.');
  await p.pause();
  await browser.close();
});
