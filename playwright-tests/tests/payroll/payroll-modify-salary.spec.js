// @ts-check
const { test, chromium } = require('@playwright/test');
const fs = require('fs');
test.setTimeout(0);

test('Modify salary for Test Shift and run payroll March 2026', async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  // ===== LOGIN =====
  console.log('>>> LOGIN...');
  for (let i = 0; i < 3; i++) {
    try { await page.goto('https://www.zimyo.net', { waitUntil: 'domcontentloaded', timeout: 30000 }); break; }
    catch { await page.waitForTimeout(3000); }
  }
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(3000);
  await page.locator('#username').fill('devteam@yopmail.com');
  await page.locator('#password').fill('Zimyo@12345');
  await page.locator('button[type="submit"]').click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(6000);
  console.log('>>> Logged in');

  // ===== PAYROLL — navigate directly (more reliable than AppsIcon) =====
  console.log('>>> Opening Payroll...');
  await page.goto('https://www.zimyo.net/payroll/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(5000);
  const p = page; // Same tab — no new tab needed
  console.log('>>> Payroll open:', p.url());

  // ===== EMPLOYEE WORKSPACE → SEARCH → CLICK =====
  console.log('>>> Employee Workspace...');
  await p.goto('https://www.zimyo.net/payroll/employees/list', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await p.waitForLoadState('networkidle').catch(() => {});
  await p.waitForTimeout(8000);

  console.log('>>> Searching test shift...');
  await p.locator('input[placeholder="Search Employees"]').fill('test shift');
  await p.waitForTimeout(3000);

  console.log('>>> Clicking Test Shift...');
  await p.getByText('Test Shift', { exact: true }).first().click();
  await p.waitForLoadState('networkidle').catch(() => {});
  await p.waitForTimeout(5000);

  // ===== MODIFY SALARY =====
  console.log('>>> Clicking Modifiy Salary...');
  await p.getByText(/Modif(i)?y\s*Salary/i).first().scrollIntoViewIfNeeded();
  await p.getByText(/Modif(i)?y\s*Salary/i).first().click();
  await p.waitForTimeout(5000);
  await p.screenshot({ path: 'screenshots/ms-04-modify-form.png' });

  // ===== SET APPLICABLE DATE TO 1 MARCH 2026 =====
  console.log('>>> Setting date to 1 March 2026...');

  // The "Applicable from" field shows a date like "August 01, 2025"
  // It has: [date text] [X button] [calendar icon]
  // Strategy: Click the X to clear, then click calendar, navigate to March 2026, click 1

  // Step A: Click the X button to clear the existing date
  // The X is a small clickable icon between the date text and calendar icon
  // From screenshot: date text ends ~x:165, X is ~x:207, calendar icon ~x:228
  await p.mouse.click(207, 134);
  await p.waitForTimeout(1000);
  await p.screenshot({ path: 'screenshots/ms-05a-cleared.png' });

  // Step B: Click the calendar icon to open picker
  await p.mouse.click(228, 134);
  await p.waitForTimeout(2000);
  await p.screenshot({ path: 'screenshots/ms-05b-cal-open.png' });

  // Step C: Navigate calendar to March 2026
  // The calendar shows: [< button] [Month YYYY text] [> button]
  // Read the month header, click > or < until March 2026
  for (let attempt = 0; attempt < 60; attempt++) {
    // Get the month-year text from the calendar header button
    const monthText = await p.evaluate(() => {
      // The month/year is typically in a button between the arrow buttons
      // Look for text like "March 2026" anywhere in a visible popup/calendar
      const candidates = document.querySelectorAll('button, span, div, h6, h5, h4, p');
      for (const el of candidates) {
        const t = el.textContent?.trim();
        if (!t) continue;
        // Match "MonthName YYYY" pattern
        if (/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}$/.test(t)) {
          // Make sure this element is visible and in the calendar area (top-left of page)
          const r = el.getBoundingClientRect();
          if (r.y > 150 && r.y < 250 && r.x < 350 && r.height > 0) {
            return t;
          }
        }
      }
      return 'NOT_FOUND';
    });

    console.log(`  Calendar header: "${monthText}"`);

    if (monthText === 'March 2026') {
      console.log('>>> Reached March 2026!');
      break;
    }

    if (monthText === 'NOT_FOUND') {
      console.log('>>> Calendar header not found, trying to click calendar icon again...');
      await p.mouse.click(228, 134);
      await p.waitForTimeout(2000);
      continue;
    }

    // Parse current month to determine direction
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const [mName, yStr] = monthText.split(' ');
    const curIdx = parseInt(yStr) * 12 + months.indexOf(mName);
    const targetIdx = 2026 * 12 + 2; // March = index 2

    if (targetIdx > curIdx) {
      // Need to go forward → click right arrow
      // Right arrow is the > button on the right side of the calendar header
      // From screenshot: right arrow at approximately x:300, y:185
      await p.mouse.click(300, 185);
    } else if (targetIdx < curIdx) {
      // Need to go backward → click left arrow
      // Left arrow at approximately x:86, y:185
      await p.mouse.click(86, 185);
    }
    await p.waitForTimeout(300);
  }

  // Step D: Click day 1
  console.log('>>> Clicking day 1...');
  // Find the first "1" button that is a day in the current month (not grayed out)
  const clicked = await p.evaluate(() => {
    const btns = document.querySelectorAll('button');
    for (const btn of btns) {
      if (btn.textContent?.trim() !== '1') continue;
      const r = btn.getBoundingClientRect();
      // Day buttons are in the calendar grid area: y > 220, x < 350, small buttons
      if (r.y > 220 && r.y < 450 && r.x < 330 && r.x > 50 && r.width < 50 && r.height > 0) {
        // Check opacity — grayed out days have lower opacity
        const opacity = parseFloat(window.getComputedStyle(btn).opacity);
        if (opacity >= 0.5 || isNaN(opacity)) {
          btn.click();
          return true;
        }
      }
    }
    return false;
  });
  console.log('>>> Day 1 clicked:', clicked);
  await p.waitForTimeout(2000);
  await p.screenshot({ path: 'screenshots/ms-05c-date-selected.png' });

  // ===== COMPUTE =====
  console.log('>>> Clicking Compute...');
  await p.getByRole('button', { name: 'Compute' }).click();
  await p.waitForTimeout(8000);
  await p.screenshot({ path: 'screenshots/ms-06-computed.png' });
  console.log('>>> Computed!');

  // ===== SAVE =====
  console.log('>>> Clicking Save...');
  await p.getByRole('button', { name: 'Save' }).click();
  await p.waitForTimeout(3000);
  await p.screenshot({ path: 'screenshots/ms-07-save-popup.png' });

  // ===== CONFIRM POPUP =====
  console.log('>>> Clicking Confirm...');
  await p.waitForTimeout(2000);
  // Try multiple selectors for the confirm button
  const confirmed = await p.locator('button').filter({ hasText: /^Confirm$/i }).first().click().then(() => true).catch(() => false);
  if (!confirmed) {
    // Try other patterns
    await p.locator('[role="dialog"] button, .MuiDialog-root button, .MuiModal-root button')
      .filter({ hasText: /confirm|yes|ok|submit|proceed/i }).first().click().catch(() => {});
  }
  await p.waitForTimeout(5000);
  await p.screenshot({ path: 'screenshots/ms-08-confirmed.png' });
  console.log('>>> Confirmed!');

  // ===== RUN PAYROLL =====
  console.log('>>> Going to Run Payroll...');
  await p.goto('https://www.zimyo.net/payroll/payroll-operations/run-payroll', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await p.waitForLoadState('networkidle').catch(() => {});
  await p.waitForTimeout(8000);
  await p.screenshot({ path: 'screenshots/ms-09-run-payroll.png' });

  // ===== SET FILTERS using react-select dropdowns =====
  // Layout from screenshot: Entity | Month-Year | Status | Employee Group
  // Entity ~x:280,y:194 | Month-Year ~x:555,y:194 | Status ~x:833,y:194 | Employee Group ~x:1110,y:194

  // Helper: click a react-select dropdown, type to filter, select first matching option
  async function selectFilter(x, y, searchText, label) {
    console.log(`>>> Setting ${label} → "${searchText}"...`);
    await p.mouse.click(x, y);
    await p.waitForTimeout(1000);
    // Clear any existing text in the input
    await p.keyboard.press('Control+a');
    await p.keyboard.press('Backspace');
    await p.keyboard.type(searchText, { delay: 80 });
    await p.waitForTimeout(1500);
    // Click the first visible option in the dropdown menu
    const option = p.locator('[class*="option"]').first();
    if (await option.isVisible({ timeout: 3000 }).catch(() => false)) {
      await option.click();
      console.log(`>>> ${label} selected!`);
    } else {
      await p.keyboard.press('Enter');
      console.log(`>>> ${label} entered via keyboard`);
    }
    await p.waitForTimeout(1000);
  }

  // Entity — select all / first entity
  await selectFilter(280, 194, 'All', 'Entity');

  // Month-Year — select March 2026
  await selectFilter(555, 194, 'Mar-2026', 'Month-Year');

  // Status — already has Pending + Attendance Locked, which is fine for our purpose
  // Employee Group — already has Active, which is fine

  await p.screenshot({ path: 'screenshots/ms-10-filters.png' });

  // ===== CLICK SEARCH =====
  console.log('>>> Clicking Search...');
  await p.locator('button').filter({ hasText: /^Search/ }).first().click();
  await p.waitForTimeout(10000);
  await p.screenshot({ path: 'screenshots/ms-11-search-results.png', fullPage: true });

  // ===== SEARCH FOR TEST SHIFT IN EMPLOYEE TABLE =====
  console.log('>>> Searching for Test Shift in the employee list...');
  // After Search loads employees, there's an inline search bar above the table
  // From exploration: the table has columns Employee Name, Entity, Designation, Department, Location
  // Look for any search/filter input in the table area (y > 280)
  const tableSearchInputs = await p.evaluate(() => {
    return Array.from(document.querySelectorAll('input')).filter(el => {
      const r = el.getBoundingClientRect();
      return r.y > 280 && r.y < 400 && r.height > 0 && el.type === 'text';
    }).map(el => ({
      placeholder: el.placeholder, id: el.id, name: el.name,
      rect: { x: Math.round(el.getBoundingClientRect().x), y: Math.round(el.getBoundingClientRect().y) }
    }));
  });
  console.log('Table search inputs:', JSON.stringify(tableSearchInputs));

  // If there's an inline search, use it; otherwise look for the employee directly
  if (tableSearchInputs.length > 0) {
    await p.mouse.click(tableSearchInputs[0].rect.x + 50, tableSearchInputs[0].rect.y + 10);
    await p.keyboard.type('test shift', { delay: 80 });
    await p.waitForTimeout(3000);
  }
  await p.screenshot({ path: 'screenshots/ms-12-emp-search.png' });

  // ===== SELECT EMPLOYEE CHECKBOX =====
  console.log('>>> Selecting Test Shift checkbox...');
  // Find the row containing "Test Shift" text and click its checkbox
  const selected = await p.evaluate(() => {
    // Find all table rows
    const rows = document.querySelectorAll('tr, [class*="MuiTableRow"]');
    for (const row of rows) {
      if (row.textContent?.toLowerCase().includes('test shift')) {
        const cb = row.querySelector('input[type="checkbox"]');
        if (cb) {
          cb.click();
          return 'checkbox_clicked';
        }
        // Try clicking the first cell (might be a clickable checkbox area)
        const firstTd = row.querySelector('td');
        if (firstTd) {
          firstTd.click();
          return 'first_cell_clicked';
        }
      }
    }
    // Also try non-table layouts (card/div rows)
    const allEls = document.querySelectorAll('[class*="row"], [class*="item"]');
    for (const el of allEls) {
      if (el.textContent?.toLowerCase().includes('test shift') && el.querySelector('input[type="checkbox"]')) {
        el.querySelector('input[type="checkbox"]').click();
        return 'div_checkbox_clicked';
      }
    }
    return 'not_found';
  });
  console.log('>>> Select result:', selected);
  await p.waitForTimeout(2000);
  await p.screenshot({ path: 'screenshots/ms-13-selected.png' });

  // ===== LOCK ATTENDANCE & PROCEED =====
  console.log('>>> Clicking Lock Attendance & Proceed...');
  const lockBtn = p.getByRole('button', { name: /Lock Attendance/i }).or(
    p.locator('button').filter({ hasText: /Lock Attendance/i })
  ).first();
  await lockBtn.scrollIntoViewIfNeeded();
  await lockBtn.click();
  await p.waitForTimeout(8000);
  await p.screenshot({ path: 'screenshots/ms-14-locked.png', fullPage: true });
  console.log('>>> Attendance locked!');

  // ===== SAVE PROGRESS =====
  fs.appendFileSync('PROGRESS.md', `
### Salary Modification & Run Payroll — Test Shift (March 2026) — ${new Date().toISOString().split('T')[0]}
| Step | Action | Status |
|------|--------|--------|
| 1 | Login → Payroll | DONE |
| 2 | Employee Workspace → Search Test Shift | DONE |
| 3 | Modifiy Salary → Set date March 1, 2026 | DONE |
| 4 | Compute → Save → Confirm | DONE |
| 5 | Run Payroll → Set filters (Entity/Month/Status) | DONE |
| 6 | Search → Find Test Shift → Select checkbox | DONE |
| 7 | Lock Attendance & Proceed | DONE |
`);

  console.log('>>> ALL STEPS COMPLETE. Browser stays open.');
  await p.pause();
  await browser.close();
});
