// @ts-check
// Reports > Upload Logs — Date filter validation
const { test, expect } = require('@playwright/test');

const CREDENTIALS = {
  email: 'sachin.sharma+demo@zimyo.com',
  password: 'Zimyo@12345',
};

test.use({ timeout: 180000 });

// ── Helper: Login and return the active page ─────────────────────
async function login(page, context) {
  try {
    await page.goto('https://www.zimyo.net/login', { timeout: 30000 });
  } catch {
    try { await page.goto('https://www.zimyo.net', { timeout: 30000 }); } catch {}
  }
  await page.waitForTimeout(5000);

  const needsLogin = await page.locator('#username').isVisible().catch(() => false);
  if (needsLogin) {
    await page.locator('#username').fill(CREDENTIALS.email);
    await page.waitForTimeout(500);
    await page.locator('#password').fill(CREDENTIALS.password);
    await page.waitForTimeout(500);

    // Login may open a new tab, so listen for it
    const newPagePromise = context.waitForEvent('page', { timeout: 15000 }).catch(() => null);
    await page.locator('button:has-text("Login")').first().click();
    await page.waitForTimeout(12000);

    // Check if a new tab opened
    const newPage = await newPagePromise;
    if (newPage) {
      await newPage.waitForTimeout(5000);
      console.log('New tab URL after login:', newPage.url());
      return newPage;
    }
  }

  // If no new tab, check all pages in context
  const pages = context.pages();
  for (const p of pages) {
    const url = p.url();
    if (url.includes('admin') || url.includes('dashboard') || url.includes('zimyo.net')) {
      if (!url.includes('login') && url !== 'about:blank') {
        console.log('Found active page:', url);
        return p;
      }
    }
  }

  console.log('Post-login URL:', page.url());
  return page;
}

// ── Helper: Navigate to Reports > Upload Logs ────────────────────
async function goToUploadLogs(page) {
  // Click Reports in sidebar
  const reportsLink = page.locator('a, [role="menuitem"], [class*="sidebar"] span, [class*="menu"] span, li')
    .filter({ hasText: /^Reports$/i }).first();
  if (await reportsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
    await reportsLink.click();
    await page.waitForTimeout(2000);
  }

  // Click Upload Logs tab/link
  const uploadLogsLink = page.locator('a, [role="menuitem"], span, li')
    .filter({ hasText: /Upload Logs/i }).first();
  if (await uploadLogsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
    await uploadLogsLink.click();
    await page.waitForTimeout(3000);
  }

  // Verify we're on the right page
  await page.waitForTimeout(2000);
  console.log('Upload Logs URL:', page.url());
}

// ── Helper: Open date picker and select a range ──────────────────
// MUI dual-calendar date range picker:
//   - Left calendar shows "from" month, right shows next month
//   - Navigate with < > arrows at top
//   - Click start day, then click end day
//   - Picker auto-closes after selecting range
//
// fromStr/toStr format: "YYYY-MM-DD" e.g. "2026-01-01"
async function applyDateFilter(page, fromStr, toStr) {
  const [fromYear, fromMonth, fromDay] = fromStr.split('-').map(Number);
  const [toYear, toMonth, toDay] = toStr.split('-').map(Number);

  const monthNames = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];

  // Click on the calendar icon / date range display to open picker
  await page.mouse.click(1245, 121);
  await page.waitForTimeout(2000);

  // Verify picker opened
  const popover = page.locator('.MuiPopover-paper');
  if (!await popover.isVisible({ timeout: 5000 }).catch(() => false)) {
    // Fallback: click the date text itself
    await page.locator('div:has-text("Filter by Date")').last().click();
    await page.waitForTimeout(2000);
  }

  console.log('Date picker opened');

  // Navigate to the FROM month
  // The left calendar shows the "from" month, right shows "from + 1"
  // We need to navigate the left calendar to show fromMonth/fromYear
  const targetLeftHeader = `${monthNames[fromMonth - 1]} ${fromYear}`;

  // Navigate backwards/forwards until left calendar shows the target month
  for (let i = 0; i < 24; i++) {
    const leftHeader = await popover.locator('div').filter({ hasText: new RegExp(`^\\w+ \\d{4}$`) }).first().textContent().catch(() => '');
    console.log(`Calendar left header: "${leftHeader?.trim()}", target: "${targetLeftHeader}"`);

    if (leftHeader?.trim() === targetLeftHeader) break;

    // Determine direction: need to go back (click <) or forward (click >)
    const currentText = leftHeader?.trim() || '';
    const currentMatch = currentText.match(/(\w+)\s+(\d{4})/);
    if (currentMatch) {
      const currentMonthIdx = monthNames.indexOf(currentMatch[1]);
      const currentYear = parseInt(currentMatch[2]);
      const currentVal = currentYear * 12 + currentMonthIdx;
      const targetVal = fromYear * 12 + (fromMonth - 1);

      if (currentVal > targetVal) {
        // Go back
        await popover.locator('button').filter({ hasText: '<' }).first().click().catch(async () => {
          await popover.locator('svg[data-testid="ArrowLeftIcon"], [aria-label*="prev"], button').first().click();
        });
      } else {
        // Go forward
        await popover.locator('button').filter({ hasText: '>' }).last().click().catch(async () => {
          await popover.locator('svg[data-testid="ArrowRightIcon"], [aria-label*="next"], button').last().click();
        });
      }
      await page.waitForTimeout(800);
    } else {
      // Can't parse — just go back
      await popover.locator('button').first().click();
      await page.waitForTimeout(800);
    }
  }

  // Click the FROM day in the left calendar
  // Days are button elements with the day number text
  const fromDayBtn = popover.locator('button').filter({ hasText: new RegExp(`^${fromDay}$`) }).first();
  await fromDayBtn.click();
  await page.waitForTimeout(1000);
  console.log(`Clicked FROM date: ${fromDay}`);

  // If to-date is in a different month, navigate forward
  if (toMonth !== fromMonth || toYear !== fromYear) {
    const targetToHeader = `${monthNames[toMonth - 1]} ${toYear}`;

    for (let i = 0; i < 12; i++) {
      // Check both left and right calendar headers
      const headers = await popover.evaluate(() => {
        const els = document.querySelectorAll('.MuiPopover-paper div');
        const results = [];
        for (const el of els) {
          if (/^\w+ \d{4}$/.test(el.textContent?.trim() || '') && el.children.length === 0) {
            results.push(el.textContent?.trim());
          }
        }
        return results;
      });
      console.log('Calendar headers:', headers);

      if (headers.includes(targetToHeader)) break;

      // Navigate forward
      await popover.locator('button').filter({ hasText: '>' }).last().click().catch(async () => {
        // Fallback: click the right arrow by position
        await page.mouse.click(1230, 170);
      });
      await page.waitForTimeout(800);
    }
  }

  // Click the TO day
  // If same month, the day button is still in the same calendar
  // If different month, it should be in the right calendar
  const toDayBtns = popover.locator('button').filter({ hasText: new RegExp(`^${toDay}$`) });
  const toDayCount = await toDayBtns.count();
  // Click the last matching day button (to avoid clicking a day from previous month)
  if (toDayCount > 1 && (toMonth !== fromMonth || toYear !== fromYear)) {
    await toDayBtns.last().click();
  } else {
    await toDayBtns.first().click();
  }
  await page.waitForTimeout(1000);
  console.log(`Clicked TO date: ${toDay}`);

  // Picker should auto-close; wait for table to reload
  await page.waitForTimeout(3000);

  // If popover still open, click outside to close
  if (await popover.isVisible({ timeout: 1000 }).catch(() => false)) {
    await page.mouse.click(400, 400);
    await page.waitForTimeout(2000);
  }

  // Verify the filter text changed
  const filterDisplay = await page.evaluate(() => {
    const els = document.querySelectorAll('div');
    for (const el of els) {
      const text = el.textContent?.trim();
      if (/\w+ \d{1,2}, \d{4}\s*-\s*\w+ \d{1,2}, \d{4}/.test(text || '') && el.children.length <= 3 && text.length < 80) {
        return text;
      }
    }
    return null;
  });
  console.log('Filter after apply:', filterDisplay);

  await page.screenshot({ path: 'screenshots/date-filter-applied.png', fullPage: true });
}

// ── Helper: Parse date "19-Mar-2026" → Date object ───────────────
function parseUploadDate(dateStr) {
  if (!dateStr) return null;
  const monthMap = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
  const m = dateStr.trim().match(/(\d{1,2})-(\w{3})-(\d{4})/);
  if (m) {
    const mon = monthMap[m[2].toLowerCase()];
    if (mon !== undefined) return new Date(+m[3], mon, +m[1]);
  }
  return null;
}

// ── Helper: Get all Upload Date values from page (all pages) ─────
async function getUploadDates(page) {
  return await page.evaluate(() => {
    const results = [];
    const headers = Array.from(document.querySelectorAll('th, [role="columnheader"]'));
    let dateColIndex = -1;
    for (let i = 0; i < headers.length; i++) {
      if (headers[i].textContent?.trim()?.toLowerCase().includes('upload date')) {
        dateColIndex = i;
        break;
      }
    }
    if (dateColIndex >= 0) {
      const rows = document.querySelectorAll('tbody tr');
      for (const row of rows) {
        const cells = row.querySelectorAll('td');
        if (cells[dateColIndex]) {
          const text = cells[dateColIndex].textContent?.trim();
          if (text) results.push(text);
        }
      }
    }
    return results;
  });
}

// ── Helper: Get total record count from pagination text ──────────
async function getTotalRecords(page) {
  const paginationText = await page.evaluate(() => {
    const els = document.querySelectorAll('p, span, div');
    for (const el of els) {
      const text = el.textContent?.trim();
      // Match "1–10 of 381" or "1-10 of 381"
      if (text && /\d+[\-–]\d+\s+of\s+\d+/.test(text) && el.children.length === 0) {
        return text;
      }
    }
    return null;
  });
  console.log('Pagination text:', paginationText);
  if (paginationText) {
    const m = paginationText.match(/of\s+(\d+)/);
    return m ? parseInt(m[1]) : 0;
  }
  return 0;
}

// ── Helper: Validate all dates on current page are within range ──
function validateDatesInRange(dates, fromDate, toDate) {
  const outOfRange = [];
  for (const dateStr of dates) {
    const d = parseUploadDate(dateStr);
    if (d && (d < fromDate || d > toDate)) {
      outOfRange.push({ text: dateStr, parsed: d.toISOString() });
    }
  }
  return outOfRange;
}

// ══════════════════════════════════════════════════════════════════
// TEST CASES
// ══════════════════════════════════════════════════════════════════

test.describe('Reports > Upload Logs — Date Filter Validation', () => {

  // ─── TC-01: Discover date picker interaction ───────────────────
  test('TC-01: Discover date picker UI after clicking filter', async ({ page, context }) => {
    const activePage = await login(page, context);
    await goToUploadLogs(activePage);

    // Get default filter text
    const filterText = await activePage.evaluate(() => {
      const els = document.querySelectorAll('div, span');
      for (const el of els) {
        if (/\w+ \d{1,2}, \d{4}\s*-\s*\w+ \d{1,2}, \d{4}/.test(el.textContent?.trim() || '') && el.children.length <= 2) {
          return { text: el.textContent?.trim(), className: el.className?.toString()?.substring(0, 100), tag: el.tagName };
        }
      }
      return null;
    });
    console.log('Date filter display:', JSON.stringify(filterText));

    // Click the date range — Dec 1-30, 2025
    await applyDateFilter(activePage, '2025-12-01', '2025-12-30');

    const dates = await getUploadDates(activePage);
    console.log('Dates after filter attempt:', JSON.stringify(dates));
    const total = await getTotalRecords(activePage);
    console.log('Total records:', total);
  });

  // ─── TC-02: Default filter shows last 3 months data ────────────
  test('TC-02: Default filter loads data within 3-month range', async ({ page, context }) => {
    const activePage = await login(page, context);
    await goToUploadLogs(activePage);

    const dates = await getUploadDates(activePage);
    const total = await getTotalRecords(activePage);
    console.log('Default dates (page 1):', JSON.stringify(dates));
    console.log('Total records:', total);

    // Default is ~3 months back from today (Dec 20, 2025 - Mar 20, 2026)
    const fromDate = new Date(2025, 11, 20);  // Dec 20, 2025
    const toDate = new Date(2026, 2, 20, 23, 59, 59);  // Mar 20, 2026

    const outOfRange = validateDatesInRange(dates, fromDate, toDate);
    console.log('Out of range:', outOfRange.length);

    expect(dates.length).toBeGreaterThan(0);
    expect(outOfRange.length).toBe(0);
    console.log('PASS — all dates on page 1 are within default 3-month range');

    await activePage.screenshot({ path: 'screenshots/TC02-default-filter.png', fullPage: true });
  });

  // ─── TC-03: Apply Jan 2026 filter ──────────────────────────────
  test('TC-03: Filter Jan 2026 — all Upload Dates within range', async ({ page, context }) => {
    const activePage = await login(page, context);
    await goToUploadLogs(activePage);

    await applyDateFilter(activePage, '2026-01-01', '2026-01-31');

    const dates = await getUploadDates(activePage);
    const total = await getTotalRecords(activePage);
    console.log('Jan 2026 dates:', JSON.stringify(dates));
    console.log('Total records:', total);

    const fromDate = new Date(2026, 0, 1);
    const toDate = new Date(2026, 0, 31, 23, 59, 59);
    const outOfRange = validateDatesInRange(dates, fromDate, toDate);

    if (dates.length > 0) {
      expect(outOfRange.length).toBe(0);
      console.log('PASS — all dates within Jan 2026');
    } else {
      console.log('No records for Jan 2026');
    }

    await activePage.screenshot({ path: 'screenshots/TC03-jan-filter.png', fullPage: true });
  });

  // ─── TC-04: Narrow range 1-5 Jan 2026 ─────────────────────────
  test('TC-04: Narrow range 1-5 Jan 2026', async ({ page, context }) => {
    const activePage = await login(page, context);
    await goToUploadLogs(activePage);

    await applyDateFilter(activePage, '2026-01-01', '2026-01-05');

    const dates = await getUploadDates(activePage);
    console.log('1-5 Jan dates:', JSON.stringify(dates));

    const fromDate = new Date(2026, 0, 1);
    const toDate = new Date(2026, 0, 5, 23, 59, 59);
    const outOfRange = validateDatesInRange(dates, fromDate, toDate);

    if (dates.length > 0) {
      if (outOfRange.length > 0) {
        console.log('FAIL — out of range:', JSON.stringify(outOfRange));
      }
      expect(outOfRange.length).toBe(0);
      console.log('PASS — all records within 1-5 Jan 2026');
    } else {
      console.log('No records for this narrow range');
    }

    await activePage.screenshot({ path: 'screenshots/TC04-narrow-range.png', fullPage: true });
  });

  // ─── TC-05: Feb 2026 filter ────────────────────────────────────
  test('TC-05: Filter Feb 2026 — validate dates update', async ({ page, context }) => {
    const activePage = await login(page, context);
    await goToUploadLogs(activePage);

    await applyDateFilter(activePage, '2026-02-01', '2026-02-28');

    const dates = await getUploadDates(activePage);
    console.log('Feb 2026 dates:', JSON.stringify(dates));

    const fromDate = new Date(2026, 1, 1);
    const toDate = new Date(2026, 1, 28, 23, 59, 59);
    const outOfRange = validateDatesInRange(dates, fromDate, toDate);

    if (dates.length > 0) {
      expect(outOfRange.length).toBe(0);
      console.log('PASS — all records within Feb 2026');
    } else {
      console.log('No records for Feb 2026');
    }

    await activePage.screenshot({ path: 'screenshots/TC05-feb-range.png', fullPage: true });
  });

  // ─── TC-06: Mar 2026 (current month) ──────────────────────────
  test('TC-06: Current month Mar 2026', async ({ page, context }) => {
    const activePage = await login(page, context);
    await goToUploadLogs(activePage);

    await applyDateFilter(activePage, '2026-03-01', '2026-03-20');

    const dates = await getUploadDates(activePage);
    console.log('Mar 2026 dates:', JSON.stringify(dates));

    const fromDate = new Date(2026, 2, 1);
    const toDate = new Date(2026, 2, 20, 23, 59, 59);
    const outOfRange = validateDatesInRange(dates, fromDate, toDate);

    if (dates.length > 0) {
      expect(outOfRange.length).toBe(0);
      console.log('PASS — all records within Mar 1-20, 2026');
    } else {
      console.log('No records for Mar 2026');
    }

    await activePage.screenshot({ path: 'screenshots/TC06-mar-range.png', fullPage: true });
  });

  // ─── TC-07: Single day filter ──────────────────────────────────
  test('TC-07: Single day filter — 17 Mar 2026', async ({ page, context }) => {
    const activePage = await login(page, context);
    await goToUploadLogs(activePage);

    // Pick Mar 17 since we know it has data from discovery
    await applyDateFilter(activePage, '2026-03-17', '2026-03-17');

    const dates = await getUploadDates(activePage);
    console.log('17 Mar dates:', JSON.stringify(dates));

    const targetDate = new Date(2026, 2, 17);
    const targetEnd = new Date(2026, 2, 17, 23, 59, 59);

    for (const dateStr of dates) {
      const d = parseUploadDate(dateStr);
      if (d) {
        expect(d >= targetDate && d <= targetEnd).toBe(true);
      }
    }
    console.log(dates.length > 0 ? 'PASS — all records on 17 Mar 2026' : 'No records for this date');

    await activePage.screenshot({ path: 'screenshots/TC07-single-day.png', fullPage: true });
  });

  // ─── TC-08: Future date — no data expected ─────────────────────
  test('TC-08: Future date range shows no data', async ({ page, context }) => {
    const activePage = await login(page, context);
    await goToUploadLogs(activePage);

    await applyDateFilter(activePage, '2027-01-01', '2027-01-31');

    const dates = await getUploadDates(activePage);
    const total = await getTotalRecords(activePage);
    console.log('Future dates:', dates.length, 'Total:', total);

    // Check for "No data" message
    const noDataMsg = await activePage.locator('text=/No data|No records|No results|Nothing found|No Upload/i')
      .isVisible({ timeout: 3000 }).catch(() => false);
    console.log('No data message:', noDataMsg);

    expect(dates.length).toBe(0);
    console.log('PASS — no records for future dates');

    await activePage.screenshot({ path: 'screenshots/TC08-future-range.png', fullPage: true });
  });

  // ─── TC-09: Record count changes with narrower filter ──────────
  test('TC-09: Narrower filter produces fewer or equal records', async ({ page, context }) => {
    const activePage = await login(page, context);
    await goToUploadLogs(activePage);

    // Get default total
    const defaultTotal = await getTotalRecords(activePage);
    console.log('Default total:', defaultTotal);

    // Apply narrower filter
    await applyDateFilter(activePage, '2026-03-01', '2026-03-05');

    const filteredTotal = await getTotalRecords(activePage);
    console.log('Filtered total (Mar 1-5):', filteredTotal);

    expect(filteredTotal).toBeLessThanOrEqual(defaultTotal);
    console.log(`PASS — filtered (${filteredTotal}) <= default (${defaultTotal})`);

    await activePage.screenshot({ path: 'screenshots/TC09-count-comparison.png', fullPage: true });
  });

  // ─── TC-10: Pagination respects filter ─────────────────────────
  test('TC-10: Page 2 dates also respect the applied filter', async ({ page, context }) => {
    const activePage = await login(page, context);
    await goToUploadLogs(activePage);

    // Use wide range to get multiple pages
    const fromDate = new Date(2025, 11, 20);
    const toDate = new Date(2026, 2, 20, 23, 59, 59);

    // Check page 1
    const page1Dates = await getUploadDates(activePage);
    console.log('Page 1 dates:', page1Dates.length);

    // Click next page
    const nextBtn = activePage.locator('[aria-label="next page"]');
    if (await nextBtn.isEnabled({ timeout: 3000 }).catch(() => false)) {
      await nextBtn.click();
      await activePage.waitForTimeout(3000);

      const page2Dates = await getUploadDates(activePage);
      console.log('Page 2 dates:', JSON.stringify(page2Dates));

      const outOfRange = validateDatesInRange(page2Dates, fromDate, toDate);
      if (page2Dates.length > 0) {
        expect(outOfRange.length).toBe(0);
        console.log('PASS — page 2 dates within default range');
      }
    } else {
      console.log('Next page button disabled — only 1 page');
    }

    await activePage.screenshot({ path: 'screenshots/TC10-pagination.png', fullPage: true });
  });
});
