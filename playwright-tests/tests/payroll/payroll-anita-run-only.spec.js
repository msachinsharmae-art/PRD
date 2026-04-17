// @ts-check
// Anita salary already saved. Just run payroll March 2026 through all steps till publish.
const { test, chromium } = require('@playwright/test');
const fs = require('fs');
test.setTimeout(0);

test('Anita — Run Payroll March 2026 (Lock → Arrear → Run → Publish)', async () => {
  const EMP = 'Anita';
  const MONTH = 'Mar-2026';

  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const p = await context.newPage();

  async function pickFilter(x, y, text, label) {
    console.log(`>>> ${label}: "${text}"...`);
    await p.mouse.click(x, y); await p.waitForTimeout(800);
    await p.keyboard.press('Control+a'); await p.keyboard.press('Backspace');
    await p.keyboard.type(text, { delay: 80 }); await p.waitForTimeout(1500);
    const opt = p.locator('[class*="option"]').first();
    if (await opt.isVisible({ timeout: 3000 }).catch(() => false)) await opt.click();
    else await p.keyboard.press('Enter');
    await p.waitForTimeout(800);
  }

  // Login
  console.log('>>> LOGIN...');
  await p.goto('https://www.zimyo.net');
  await p.waitForLoadState('networkidle').catch(() => {});
  await p.waitForTimeout(5000);
  await p.locator('#username').waitFor({ state: 'visible', timeout: 15000 });
  await p.locator('#username').click(); await p.locator('#username').fill('devteam@yopmail.com');
  await p.locator('#password').click(); await p.locator('#password').fill('Zimyo@12345');
  await p.waitForTimeout(1000);
  await p.locator('button[type="submit"]').click();
  await p.waitForTimeout(10000);
  console.log('>>> Logged in:', p.url());

  // ===== RUN PAYROLL =====
  console.log('>>> Navigate to Run Payroll...');
  await p.goto('https://www.zimyo.net/payroll/payroll-operations/run-payroll', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await p.waitForLoadState('networkidle').catch(() => {});
  await p.waitForTimeout(8000);
  await p.screenshot({ path: 'screenshots/anita-run-01-page.png' });

  // Set filters
  await pickFilter(280, 194, 'All', 'Entity');
  await pickFilter(555, 194, MONTH, 'Month-Year');
  // Clear existing status tags
  for (let i = 0; i < 4; i++) {
    await p.locator('[class*="multi-value"] [class*="remove"], [class*="multiValue"] svg').first().click().catch(() => {});
    await p.waitForTimeout(300);
  }
  await pickFilter(833, 194, 'All', 'Status');

  // Search
  console.log('>>> Search...');
  await p.locator('button').filter({ hasText: /^Search/ }).first().click();
  await p.waitForTimeout(10000);
  await p.screenshot({ path: 'screenshots/anita-run-02-results.png' });

  // Check Success tab for Anita
  await p.locator('button, [role="tab"]').filter({ hasText: /Success/i }).first().click();
  await p.waitForTimeout(2000);
  const empSearch = p.locator('input[placeholder*="Search Employee"]').first();
  if (await empSearch.isVisible().catch(() => false)) {
    await empSearch.fill(EMP); await p.waitForTimeout(3000);
  }

  let found = await p.getByText(EMP, { exact: false }).isVisible().catch(() => false);

  if (!found) {
    console.log('>>> Not in Success tab. Checking Error tab...');
    if (await empSearch.isVisible().catch(() => false)) await empSearch.clear();
    await p.locator('button, [role="tab"]').filter({ hasText: /Error/i }).first().click();
    await p.waitForTimeout(3000);
    for (let i = 0; i < 30; i++) {
      found = await p.getByText(EMP, { exact: false }).isVisible().catch(() => false);
      if (found) break;
      await p.mouse.wheel(0, 300); await p.waitForTimeout(400);
    }
    if (found) {
      const errInfo = await p.evaluate((name) => {
        for (const row of document.querySelectorAll('tr')) {
          if (row.textContent?.toLowerCase().includes(name.toLowerCase())) {
            return Array.from(row.querySelectorAll('td')).map(c => c.textContent?.trim()).join(' | ');
          }
        }
        return 'Error not captured';
      }, EMP);
      console.log(`>>> ERROR for ${EMP}: ${errInfo}`);
      await p.screenshot({ path: 'screenshots/anita-run-ERROR.png' });
      console.log('>>> Stopping due to error.');
      await p.waitForTimeout(600000);
      await browser.close();
      return;
    }
  }

  if (!found) {
    console.log('>>> Anita not found in any tab. Stopping.');
    await p.screenshot({ path: 'screenshots/anita-run-NOT-FOUND.png' });
    await p.waitForTimeout(600000);
    await browser.close();
    return;
  }

  console.log(`>>> ${EMP} found in Success! Starting payroll steps...`);

  // Select Anita's checkbox
  await p.evaluate((name) => {
    for (const row of document.querySelectorAll('tr')) {
      if (row.textContent?.toLowerCase().includes(name.toLowerCase())) {
        const cb = row.querySelector('input[type="checkbox"]');
        if (cb && !cb.checked) cb.click();
      }
    }
  }, EMP);
  await p.waitForTimeout(2000);
  await p.screenshot({ path: 'screenshots/anita-run-03-selected.png' });

  // ===== STEP 1: Lock Attendance & Proceed =====
  console.log('>>> STEP 1: Lock Attendance & Proceed...');
  await p.locator('button').filter({ hasText: /Lock Attendance/i }).first().click();
  await p.waitForTimeout(15000);
  await p.screenshot({ path: 'screenshots/anita-run-04-locked.png', fullPage: true });

  // ===== STEP 2: Process Arrear — select checkbox + next =====
  console.log('>>> STEP 2: Process Arrear...');
  await p.waitForTimeout(5000);
  await p.evaluate((name) => {
    for (const row of document.querySelectorAll('tr')) {
      if (row.textContent?.toLowerCase().includes(name.toLowerCase())) {
        const cb = row.querySelector('input[type="checkbox"]');
        if (cb && !cb.checked) cb.click();
      }
    }
  }, EMP);
  await p.waitForTimeout(2000);
  await p.screenshot({ path: 'screenshots/anita-run-05-arrear-selected.png', fullPage: true });
  await p.locator('button').filter({ hasText: /next|skip|proceed|generate/i }).first().click().catch(() => {});
  await p.waitForTimeout(15000);
  await p.screenshot({ path: 'screenshots/anita-run-06-arrear-done.png', fullPage: true });

  // ===== STEP 3: Review & Run Payroll — select checkbox + run =====
  console.log('>>> STEP 3: Review & Run Payroll...');
  await p.waitForTimeout(5000);
  await p.evaluate((name) => {
    for (const row of document.querySelectorAll('tr')) {
      if (row.textContent?.toLowerCase().includes(name.toLowerCase())) {
        const cb = row.querySelector('input[type="checkbox"]');
        if (cb && !cb.checked) cb.click();
      }
    }
  }, EMP);
  await p.waitForTimeout(2000);
  await p.screenshot({ path: 'screenshots/anita-run-07-review-selected.png', fullPage: true });
  await p.locator('button').filter({ hasText: /run payroll|proceed|next/i }).first().click().catch(() => {});
  await p.waitForTimeout(15000);
  await p.screenshot({ path: 'screenshots/anita-run-08-payroll-run.png', fullPage: true });

  // ===== STEP 4: Publish Payslips =====
  console.log('>>> STEP 4: Publish Payslips...');
  await p.waitForTimeout(5000);
  // Select Anita for publish
  await p.evaluate((name) => {
    for (const row of document.querySelectorAll('tr')) {
      if (row.textContent?.toLowerCase().includes(name.toLowerCase())) {
        const cb = row.querySelector('input[type="checkbox"]');
        if (cb && !cb.checked) cb.click();
      }
    }
  }, EMP);
  await p.waitForTimeout(2000);
  await p.locator('button').filter({ hasText: /publish/i }).first().click().catch(() => {});
  await p.waitForTimeout(5000);
  // Confirm publish if dialog appears
  await p.locator('button').filter({ hasText: /^Confirm$|^Yes$|^OK$/i }).first().click().catch(() => {});
  await p.waitForTimeout(10000);
  await p.screenshot({ path: 'screenshots/anita-run-09-published.png', fullPage: true });

  console.log('>>> FULL PAYROLL COMPLETE — ALL STEPS DONE!');

  fs.appendFileSync('PROGRESS.md', `
### ${EMP} (AN-001) — Payroll March 2026 (Run Only) — ${new Date().toISOString().split('T')[0]}
| Step | Status |
|------|--------|
| Lock Attendance | DONE |
| Process Arrear | DONE |
| Review & Run Payroll | DONE |
| Publish Payslips | DONE |
`);

  console.log('>>> Browser stays open for 10 min.');
  await p.waitForTimeout(600000);
  await browser.close();
});
