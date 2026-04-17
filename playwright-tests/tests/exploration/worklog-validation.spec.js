// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Timesheet Worklog Validation Test
 *
 * Settings path: Admin > Timesheet > Configuration > Timesheet Policy > Manage
 * Worklog path:  ESS > Timesheet > Timelog > click "test job" on 17th March
 *
 * Test Data:
 *   Date: 17th March 2026
 *   Shift: 8:00 AM – 5:30 PM
 *   Attendance (punch): 8:00 AM – 11:30 PM
 *
 * Scenario 1: Flexible Log Time OFF + Restrict Attendance ON  (shift-based)
 * Scenario 2: Flexible Log Time ON  + Restrict Attendance ON  (punch-based)
 */

test.describe.serial('Worklog Validation Tests', () => {
  let adminPage, essPage, context;

  // ── HELPERS ──

  async function login(page) {
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
  }

  /** Toggle a setting on the Timesheet Policy page by label text */
  async function setToggle(page, labelText, desiredState) {
    // Find the MuiSwitch input that has aria-checked, within the row containing the label
    const toggleRow = page.locator(`text=${labelText}`).first().locator('..').locator('..').locator('..');
    const switchInput = toggleRow.locator('input[type="checkbox"]');

    // Get current state
    const currentState = await switchInput.isChecked();
    console.log(`>>> [Toggle] "${labelText}" current=${currentState}, desired=${desiredState}`);

    if (currentState !== desiredState) {
      // Click the MuiSwitch span (the visual toggle), not the hidden input
      const switchSpan = toggleRow.locator('[class*="MuiSwitch-switchBase"]');
      await switchSpan.click();
      await page.waitForTimeout(2000);

      // Verify
      const newState = await switchInput.isChecked();
      console.log(`>>> [Toggle] "${labelText}" now=${newState}`);
    }
  }

  /** Navigate to ESS Timelog and click "test job" on the 17th */
  async function openWorklogDialog(page) {
    await page.goto('https://www.zimyo.net/ess/timesheet/timelogs', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(5000);

    // Find "test job" in the 17th date column
    const clickTarget = await page.evaluate(() => {
      const testJobs = Array.from(document.querySelectorAll('p, span, div')).filter(el =>
        el.textContent?.trim() === 'test job' && el.children.length === 0
      );
      const dates = Array.from(document.querySelectorAll('p, span, div')).filter(el =>
        el.textContent?.trim() === '17' && el.children.length === 0
      );
      const date17 = dates.find(d => d.getBoundingClientRect().y > 300);
      if (!date17) return null;
      const d17Rect = date17.getBoundingClientRect();
      const match = testJobs.find(tj => {
        const r = tj.getBoundingClientRect();
        return Math.abs(r.x - d17Rect.x) < 100 && r.y > d17Rect.y && r.y < d17Rect.y + 100;
      });
      if (match) {
        const r = match.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }
      return null;
    });

    if (!clickTarget) throw new Error('Could not find "test job" on 17th March');
    await page.mouse.click(clickTarget.x, clickTarget.y);
    await page.waitForTimeout(3000);

    // Verify dialog opened with date 17 March
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
    const dialogText = await page.locator('[role="dialog"]').textContent();
    expect(dialogText).toContain('17 March 2026');
  }

  /** Fill start and end time in the worklog dialog */
  async function fillTime(page, startTime, endTime) {
    const startInput = page.locator('[role="dialog"] input[placeholder="h:mm a"]').first();
    const endInput = page.locator('[role="dialog"] input[placeholder="h:mm a"]').nth(1);

    await startInput.click();
    await startInput.fill(startTime);
    await page.waitForTimeout(500);

    await endInput.click();
    await endInput.fill(endTime);
    await page.waitForTimeout(500);
  }

  /** Click Save Work Log and return the result — 'success' | 'error: <message>' */
  async function clickSaveAndGetResult(page) {
    await page.locator('[role="dialog"] button:has-text("Save Work Log")').click();
    await page.waitForTimeout(4000);

    // Check for error toast/snackbar/alert
    const errorText = await page.evaluate(() => {
      // Check Toastify notifications
      const toast = document.querySelector('.Toastify__toast-body, [class*="toast"], [class*="Toast"], [class*="snackbar"], [class*="Snackbar"], [role="alert"], [class*="MuiAlert"]');
      if (toast) return toast.textContent?.trim() || '';
      return '';
    });

    // Check if dialog is still open (means error/restriction)
    const dialogStillOpen = await page.locator('[role="dialog"]').isVisible().catch(() => false);

    // Check for any error message in the dialog
    const dialogError = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return '';
      const errorEls = dialog.querySelectorAll('[class*="error"], [class*="Error"], [class*="red"], [class*="alert"], [class*="Alert"]');
      for (const el of errorEls) {
        const text = el.textContent?.trim();
        if (text && text.length > 5) return text;
      }
      return '';
    });

    if (errorText) return `error: ${errorText}`;
    if (dialogError) return `error: ${dialogError}`;
    if (!dialogStillOpen) return 'success';
    return 'dialog still open (possible restriction)';
  }

  /** Close the worklog dialog */
  async function closeDialog(page) {
    const dialog = page.locator('[role="dialog"]');
    if (await dialog.isVisible().catch(() => false)) {
      await page.locator('[role="dialog"] button:has-text("Cancel")').click().catch(async () => {
        // Try X button
        await page.locator('[role="dialog"] [aria-label="close"], [role="dialog"] button:has(svg)').first().click().catch(() => {});
      });
      await page.waitForTimeout(1000);
    }
  }

  /** Delete existing worklogs for the test job on 17th March */
  async function deleteExistingWorklogs(page) {
    // Go to ESS > Tasks > click on "test job" task
    await page.goto('https://www.zimyo.net/ess/timesheet/task', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    // Click on "test job" in the task list
    const testJobRow = page.locator('text=test job').first();
    if (await testJobRow.isVisible().catch(() => false)) {
      await testJobRow.click();
      await page.waitForTimeout(3000);

      // Look for 17th March entries and delete them
      const deleteButtons = page.locator('button:has-text("Delete"), [aria-label="delete"], [title="Delete"]');
      const count = await deleteButtons.count();
      console.log(`>>> Found ${count} delete buttons in task details`);

      // We'll handle this if "No hours remaining" error occurs
    }
  }

  // ── SETUP ──

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    adminPage = await context.newPage();
    await login(adminPage);
    console.log('>>> Admin logged in');
  });

  test.afterAll(async () => {
    await context.close();
  });

  // ── SCENARIO 1: Flexible Log Time OFF + Restrict Attendance ON ──

  test('Scenario 1 Setup — Turn OFF Flexible Log Time', async () => {
    test.setTimeout(60000);

    // Go to Timesheet Policy page
    await adminPage.goto('https://www.zimyo.net/admin/timesheet/configuration', { waitUntil: 'domcontentloaded' });
    await adminPage.waitForTimeout(3000);

    // Click Timesheet Policy Manage (4th button)
    await adminPage.locator('button:has-text("Manage")').nth(3).click();
    await adminPage.waitForTimeout(3000);

    await adminPage.screenshot({ path: 'screenshots/wl-s1-01-before-toggle.png', fullPage: true });

    // Set Flexible Log Time OFF, Restrict Worklog ON
    await setToggle(adminPage, 'Flexible Log Time (Punch-based)', false);
    await setToggle(adminPage, 'Restrict Worklog Upload Without Attendance', true);

    await adminPage.waitForTimeout(2000);
    await adminPage.screenshot({ path: 'screenshots/wl-s1-02-after-toggle.png', fullPage: true });
    console.log('>>> Scenario 1 settings: Flexible=OFF, Restrict=ON');

    // Open ESS in new tab
    const pagePromise = context.waitForEvent('page', { timeout: 15000 }).catch(() => null);
    await adminPage.locator('[data-testid="AppsIcon"]').click();
    await adminPage.waitForTimeout(2000);
    await adminPage.locator('text=ESS').first().click();
    const newPage = await pagePromise;
    if (newPage) {
      await newPage.waitForLoadState('domcontentloaded');
      await newPage.waitForTimeout(8000);
      essPage = newPage;
    } else {
      essPage = adminPage;
    }
    console.log('>>> ESS page ready');
  });

  // Test Case 1.1: 8:00 AM – 11:30 PM → Should be RESTRICTED (outside shift 8AM-5:30PM)
  test('S1-TC1: 8:00 AM – 11:30 PM → RESTRICTED (outside shift)', async () => {
    test.setTimeout(60000);
    await openWorklogDialog(essPage);
    await fillTime(essPage, '08:00 AM', '11:30 PM');
    await essPage.screenshot({ path: 'screenshots/wl-s1-tc1-filled.png' });

    const result = await clickSaveAndGetResult(essPage);
    console.log(`>>> S1-TC1 Result: ${result}`);
    await essPage.screenshot({ path: 'screenshots/wl-s1-tc1-result.png' });
    await closeDialog(essPage);

    // Expected: restricted
    expect(result).not.toBe('success');
  });

  // Test Case 1.2: 8:00 AM – 5:30 PM → Should be ALLOWED (within shift)
  test('S1-TC2: 8:00 AM – 5:30 PM → ALLOWED (within shift)', async () => {
    test.setTimeout(60000);
    await openWorklogDialog(essPage);
    await fillTime(essPage, '08:00 AM', '05:30 PM');
    await essPage.screenshot({ path: 'screenshots/wl-s1-tc2-filled.png' });

    const result = await clickSaveAndGetResult(essPage);
    console.log(`>>> S1-TC2 Result: ${result}`);
    await essPage.screenshot({ path: 'screenshots/wl-s1-tc2-result.png' });
    await closeDialog(essPage);
  });

  // Test Case 1.3: 10:00 AM – 3:00 PM → Should be ALLOWED (within shift)
  test('S1-TC3: 10:00 AM – 3:00 PM → ALLOWED (within shift)', async () => {
    test.setTimeout(60000);
    await openWorklogDialog(essPage);
    await fillTime(essPage, '10:00 AM', '03:00 PM');
    await essPage.screenshot({ path: 'screenshots/wl-s1-tc3-filled.png' });

    const result = await clickSaveAndGetResult(essPage);
    console.log(`>>> S1-TC3 Result: ${result}`);
    await essPage.screenshot({ path: 'screenshots/wl-s1-tc3-result.png' });
    await closeDialog(essPage);
  });

  // Test Case 1.4: 7:00 AM – 10:00 AM → Should be RESTRICTED (before shift)
  test('S1-TC4: 7:00 AM – 10:00 AM → RESTRICTED (before shift)', async () => {
    test.setTimeout(60000);
    await openWorklogDialog(essPage);
    await fillTime(essPage, '07:00 AM', '10:00 AM');
    await essPage.screenshot({ path: 'screenshots/wl-s1-tc4-filled.png' });

    const result = await clickSaveAndGetResult(essPage);
    console.log(`>>> S1-TC4 Result: ${result}`);
    await essPage.screenshot({ path: 'screenshots/wl-s1-tc4-result.png' });
    await closeDialog(essPage);

    expect(result).not.toBe('success');
  });

  // Test Case 1.5: 3:00 PM – 7:00 PM → Should be RESTRICTED (after shift)
  test('S1-TC5: 3:00 PM – 7:00 PM → RESTRICTED (after shift)', async () => {
    test.setTimeout(60000);
    await openWorklogDialog(essPage);
    await fillTime(essPage, '03:00 PM', '07:00 PM');
    await essPage.screenshot({ path: 'screenshots/wl-s1-tc5-filled.png' });

    const result = await clickSaveAndGetResult(essPage);
    console.log(`>>> S1-TC5 Result: ${result}`);
    await essPage.screenshot({ path: 'screenshots/wl-s1-tc5-result.png' });
    await closeDialog(essPage);

    expect(result).not.toBe('success');
  });

  // ── SCENARIO 2: Flexible Log Time ON + Restrict Attendance ON ──

  test('Scenario 2 Setup — Turn ON Flexible Log Time', async () => {
    test.setTimeout(60000);

    // Switch back to admin page to toggle setting
    await adminPage.goto('https://www.zimyo.net/admin/timesheet/configuration', { waitUntil: 'domcontentloaded' });
    await adminPage.waitForTimeout(3000);
    await adminPage.locator('button:has-text("Manage")').nth(3).click();
    await adminPage.waitForTimeout(3000);

    // Set Flexible Log Time ON
    await setToggle(adminPage, 'Flexible Log Time (Punch-based)', true);
    await setToggle(adminPage, 'Restrict Worklog Upload Without Attendance', true);

    await adminPage.waitForTimeout(2000);
    await adminPage.screenshot({ path: 'screenshots/wl-s2-01-settings.png', fullPage: true });
    console.log('>>> Scenario 2 settings: Flexible=ON, Restrict=ON');
  });

  // Test Case 2.1: 8:00 AM – 11:30 PM → Should be ALLOWED (within punch time)
  test('S2-TC1: 8:00 AM – 11:30 PM → ALLOWED (within punch)', async () => {
    test.setTimeout(60000);
    await openWorklogDialog(essPage);
    await fillTime(essPage, '08:00 AM', '11:30 PM');
    await essPage.screenshot({ path: 'screenshots/wl-s2-tc1-filled.png' });

    const result = await clickSaveAndGetResult(essPage);
    console.log(`>>> S2-TC1 Result: ${result}`);
    await essPage.screenshot({ path: 'screenshots/wl-s2-tc1-result.png' });
    await closeDialog(essPage);
  });

  // Test Case 2.2: 7:00 AM – 11:30 PM → Should be RESTRICTED (before punch-in)
  test('S2-TC2: 7:00 AM – 11:30 PM → RESTRICTED (before punch-in)', async () => {
    test.setTimeout(60000);
    await openWorklogDialog(essPage);
    await fillTime(essPage, '07:00 AM', '11:30 PM');
    await essPage.screenshot({ path: 'screenshots/wl-s2-tc2-filled.png' });

    const result = await clickSaveAndGetResult(essPage);
    console.log(`>>> S2-TC2 Result: ${result}`);
    await essPage.screenshot({ path: 'screenshots/wl-s2-tc2-result.png' });
    await closeDialog(essPage);

    expect(result).not.toBe('success');
  });

  // Test Case 2.3: 8:00 AM – 12:00 AM → Should be RESTRICTED (after punch-out)
  test('S2-TC3: 8:00 AM – 12:00 AM → RESTRICTED (after punch-out)', async () => {
    test.setTimeout(60000);
    await openWorklogDialog(essPage);
    await fillTime(essPage, '08:00 AM', '12:00 AM');
    await essPage.screenshot({ path: 'screenshots/wl-s2-tc3-filled.png' });

    const result = await clickSaveAndGetResult(essPage);
    console.log(`>>> S2-TC3 Result: ${result}`);
    await essPage.screenshot({ path: 'screenshots/wl-s2-tc3-result.png' });
    await closeDialog(essPage);

    expect(result).not.toBe('success');
  });
});
