// @ts-check
const { test } = require('@playwright/test');

test.describe.serial('Worklog — Discover policy + form', () => {
  let page, context;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });
  test.afterAll(async () => { await context.close(); });

  test('Login', async () => {
    test.setTimeout(90000);
    await page.goto('https://www.zimyo.net', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(3000);
    await page.locator('.MuiAutocomplete-root').first().click();
    await page.waitForTimeout(1000);
    await page.locator('[role="option"]:has-text("Email ID")').click();
    await page.waitForTimeout(1000);
    await page.locator('#username').fill('sachin.sharma+demo@zimyo.com');
    await page.locator('#password').fill('Zimyo@12345');
    await page.waitForTimeout(500);
    await page.locator('button:has-text("Login")').first().click();
    await page.waitForURL('**/admin/**', { timeout: 60000 });
    await page.waitForTimeout(5000);
    console.log('>>> Logged in:', page.url());
  });

  test('Step 1 — Timesheet Policy Manage (4th Manage button)', async () => {
    test.setTimeout(60000);
    await page.goto('https://www.zimyo.net/admin/timesheet/configuration', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'screenshots/wl-01-config.png', fullPage: true });

    // Timesheet Policy is the 4th card => click the 4th "Manage" button (index 3)
    const manageBtns = page.locator('button:has-text("Manage")');
    const count = await manageBtns.count();
    console.log('>>> Manage buttons count:', count);

    // Click the one at index 3 (Timesheet Policy)
    await manageBtns.nth(3).click();
    await page.waitForTimeout(5000);

    console.log('>>> URL after Timesheet Policy Manage:', page.url());
    await page.screenshot({ path: 'screenshots/wl-02-policy.png', fullPage: true });

    // Log ALL text
    const pageText = await page.evaluate(() => document.body.innerText.substring(0, 6000));
    console.log('>>> Policy page text:\n', pageText);

    // Find all toggles
    const toggles = await page.evaluate(() => {
      const results = [];
      document.querySelectorAll('input[type="checkbox"], [role="switch"], [class*="MuiSwitch"]').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0) return;
        // Walk up DOM to find label text
        let label = '';
        let p = el.parentElement;
        for (let i = 0; i < 10 && p; i++) {
          const t = p.textContent?.trim() || '';
          if (t.length > 10 && t.length < 300 && !label) { label = t; }
          p = p.parentElement;
        }
        const checked = el.getAttribute('aria-checked') || (el instanceof HTMLInputElement ? String(el.checked) : '');
        results.push({ checked, label: label.substring(0, 200), y: Math.round(rect.y) });
      });
      return results;
    });
    console.log('>>> Toggles found:', JSON.stringify(toggles, null, 2));
  });

  test('Step 2 — Go to ESS Timelog', async () => {
    test.setTimeout(90000);

    // Navigate to ESS via nine-dot menu — handle new tab
    const pagePromise = context.waitForEvent('page', { timeout: 15000 }).catch(() => null);
    await page.locator('[data-testid="AppsIcon"]').click();
    await page.waitForTimeout(2000);
    await page.locator('text=ESS').first().click();

    const newPage = await pagePromise;
    if (newPage) {
      console.log('>>> ESS opened in new tab');
      await newPage.waitForLoadState('domcontentloaded', { timeout: 30000 });
      await newPage.waitForLoadState('networkidle').catch(() => {});
      await newPage.waitForTimeout(8000);
      page = newPage;
    } else {
      console.log('>>> ESS in same tab');
      await page.waitForTimeout(8000);
    }

    console.log('>>> Current URL:', page.url());

    // Go to Timelog
    await page.goto('https://www.zimyo.net/ess/timesheet/timelogs', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(5000);

    console.log('>>> Timelog URL:', page.url());
    await page.screenshot({ path: 'screenshots/wl-03-timelog.png', fullPage: true });

    // Verify calendar is visible
    const calText = await page.evaluate(() => document.body.innerText.substring(0, 2000));
    console.log('>>> Timelog page:\n', calText.substring(0, 1000));
  });

  test('Step 3 — Click on 17th date "test job"', async () => {
    test.setTimeout(60000);

    // The calendar shows dates as numbers. Find all "test job" text positions
    // and the position of number "17", then click "test job" in that cell

    // First screenshot the current state
    await page.screenshot({ path: 'screenshots/wl-04-before-click.png' });

    // Use a more targeted approach — find all text nodes with "test job"
    // and locate which one is inside the March 17 cell
    const clickTarget = await page.evaluate(() => {
      // Find all elements that contain exactly "test job"
      const testJobs = Array.from(document.querySelectorAll('p, span, div')).filter(el => {
        const t = el.textContent?.trim();
        return t === 'test job' && el.children.length === 0;
      });

      // Find the element showing "17" as a date number
      const dates = Array.from(document.querySelectorAll('p, span, div')).filter(el => {
        const t = el.textContent?.trim();
        return t === '17' && el.children.length === 0;
      });

      // Find the "17" that's in the calendar area (y > 300)
      const date17 = dates.find(d => d.getBoundingClientRect().y > 300);
      if (!date17) return null;

      const d17Rect = date17.getBoundingClientRect();

      // Find "test job" that's in the same column (similar x) and just below 17
      const match = testJobs.find(tj => {
        const r = tj.getBoundingClientRect();
        return Math.abs(r.x - d17Rect.x) < 100 && r.y > d17Rect.y && r.y < d17Rect.y + 100;
      });

      if (match) {
        const r = match.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: match.textContent };
      }

      // Fallback: return position of date 17 area for manual click
      return { x: d17Rect.x + 60, y: d17Rect.y + 30, text: 'fallback-17' };
    });

    console.log('>>> Click target for test job on 17th:', clickTarget);

    if (clickTarget) {
      await page.mouse.click(clickTarget.x, clickTarget.y);
      await page.waitForTimeout(4000);
    }

    await page.screenshot({ path: 'screenshots/wl-05-after-17-click.png', fullPage: true });

    // Check if dialog opened
    const dialogVisible = await page.locator('[role="dialog"]').isVisible().catch(() => false);
    console.log('>>> Dialog opened:', dialogVisible);

    if (dialogVisible) {
      // Get dialog content
      const dialogText = await page.locator('[role="dialog"]').textContent().catch(() => '');
      console.log('>>> Dialog text:', dialogText?.substring(0, 500));

      // Get all inputs in dialog
      const inputs = await page.locator('[role="dialog"] input').evaluateAll(els => {
        return els.map(el => ({
          placeholder: el.placeholder,
          value: el.value,
          type: el.type,
          rect: { x: Math.round(el.getBoundingClientRect().x), y: Math.round(el.getBoundingClientRect().y) }
        }));
      });
      console.log('>>> Dialog inputs:', JSON.stringify(inputs, null, 2));

      // Check the DATE field
      const dateInput = await page.locator('[role="dialog"] input').evaluateAll(els => {
        return els.filter(el => el.value.includes('March')).map(el => ({ value: el.value, placeholder: el.placeholder }));
      });
      console.log('>>> Date inputs:', JSON.stringify(dateInput));

      // Find Start Time & End Time inputs (placeholder "h:mm a")
      const timeInputs = await page.locator('[role="dialog"] input[placeholder="h:mm a"]').count();
      console.log('>>> Time inputs (h:mm a) count:', timeInputs);

      // Find Save Work Log button
      const saveBtn = await page.locator('[role="dialog"] button:has-text("Save Work Log")').isVisible().catch(() => false);
      console.log('>>> Save Work Log button visible:', saveBtn);

      // Find Cancel button
      const cancelBtn = await page.locator('[role="dialog"] button:has-text("Cancel")').isVisible().catch(() => false);
      console.log('>>> Cancel button visible:', cancelBtn);
    }
  });
});
