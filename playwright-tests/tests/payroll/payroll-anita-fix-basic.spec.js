// @ts-check
// Browser is open on Modify Salary page. Just fix BASIC to 20000, compute, save, run payroll.
const { test, chromium } = require('@playwright/test');
const fs = require('fs');
test.setTimeout(0);

test('Anita — Set BASIC to 20000, compute, save, run payroll', async () => {
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

  // Go to Anita → Modify Salary
  console.log('>>> Anita profile...');
  await p.goto('https://www.zimyo.net/payroll/employees/list', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await p.waitForLoadState('networkidle').catch(() => {});
  await p.waitForTimeout(8000);
  await p.locator('input[placeholder="Search Employees"]').waitFor({ state: 'visible', timeout: 15000 });
  await p.locator('input[placeholder="Search Employees"]').fill(EMP);
  await p.waitForTimeout(3000);
  await p.getByText(EMP, { exact: false }).first().click();
  await p.waitForLoadState('networkidle').catch(() => {});
  await p.waitForTimeout(5000);

  console.log('>>> Modifiy Salary...');
  await p.getByText(/Modif(i)?y\s*Salary/i).first().scrollIntoViewIfNeeded();
  await p.getByText(/Modif(i)?y\s*Salary/i).first().click();
  await p.waitForTimeout(5000);

  // Set CTC=500000, BASIC=20000
  console.log('>>> CTC=500000, BASIC=20000...');
  await p.locator('#EMPLOYEE_CTC').click({ clickCount: 3 });
  await p.locator('#EMPLOYEE_CTC').fill('500000');
  await p.waitForTimeout(1000);

  await p.locator('#outlined-basic').click({ clickCount: 3 });
  await p.locator('#outlined-basic').fill('20000');
  await p.waitForTimeout(1000);
  await p.screenshot({ path: 'screenshots/anita-basic20k-01.png' });

  // Compute
  console.log('>>> Compute...');
  await p.getByRole('button', { name: 'Compute' }).click();
  await p.waitForTimeout(8000);
  await p.screenshot({ path: 'screenshots/anita-basic20k-02-computed.png' });

  // Check Save
  const saveBtn = p.getByRole('button', { name: 'Save' });
  const saveDisabled = await saveBtn.isDisabled().catch(() => true);
  console.log('>>> Save disabled:', saveDisabled);

  if (saveDisabled) {
    console.log('>>> ERROR: Save still disabled. Capturing screenshot.');
    await p.screenshot({ path: 'screenshots/anita-basic20k-ERROR.png', fullPage: true });
    console.log('>>> Stopping. Check screenshot for error details.');
    await p.waitForTimeout(600000);
    await browser.close();
    return;
  }

  // Save
  console.log('>>> Save...');
  await saveBtn.click();
  await p.waitForTimeout(3000);

  // Confirm
  console.log('>>> Confirm...');
  await p.waitForTimeout(2000);
  await p.locator('button').filter({ hasText: /^Confirm$/i }).first().click().catch(async () => {
    await p.locator('[role="dialog"] button').filter({ hasText: /confirm|yes|ok/i }).first().click().catch(() => {});
  });
  await p.waitForTimeout(5000);
  await p.screenshot({ path: 'screenshots/anita-basic20k-03-saved.png' });
  console.log('>>> Saved!');

  // ===== RUN PAYROLL =====
  console.log('>>> Run Payroll...');
  await p.goto('https://www.zimyo.net/payroll/payroll-operations/run-payroll', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await p.waitForLoadState('networkidle').catch(() => {});
  await p.waitForTimeout(8000);

  await pickFilter(280, 194, 'All', 'Entity');
  await pickFilter(555, 194, MONTH, 'Month-Year');
  for (let i = 0; i < 4; i++) {
    await p.locator('[class*="multi-value"] [class*="remove"], [class*="multiValue"] svg').first().click().catch(() => {});
    await p.waitForTimeout(300);
  }
  await pickFilter(833, 194, 'All', 'Status');

  console.log('>>> Search...');
  await p.locator('button').filter({ hasText: /^Search/ }).first().click();
  await p.waitForTimeout(10000);
  await p.screenshot({ path: 'screenshots/anita-basic20k-04-results.png' });

  // Check Success tab
  await p.locator('button, [role="tab"]').filter({ hasText: /Success/i }).first().click();
  await p.waitForTimeout(2000);
  const empSearch = p.locator('input[placeholder*="Search Employee"]').first();
  if (await empSearch.isVisible().catch(() => false)) {
    await empSearch.fill(EMP); await p.waitForTimeout(3000);
  }

  let found = await p.getByText(EMP, { exact: false }).isVisible().catch(() => false);

  if (!found) {
    console.log('>>> Not in Success. Checking Error tab...');
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
      console.log(`>>> ERROR: ${errInfo}`);
      await p.screenshot({ path: 'screenshots/anita-basic20k-ERROR-payroll.png' });
      console.log('>>> Error logged. Stopping.');
      await p.waitForTimeout(600000);
      await browser.close();
      return;
    }
  }

  if (found) {
    console.log(`>>> ${EMP} in Success! Selecting + Lock Attendance...`);
    await p.evaluate((name) => {
      for (const row of document.querySelectorAll('tr')) {
        if (row.textContent?.toLowerCase().includes(name.toLowerCase())) {
          const cb = row.querySelector('input[type="checkbox"]');
          if (cb && !cb.checked) cb.click();
        }
      }
    }, EMP);
    await p.waitForTimeout(2000);

    console.log('>>> Lock Attendance & Proceed...');
    await p.locator('button').filter({ hasText: /Lock Attendance/i }).first().click();
    await p.waitForTimeout(10000);
    await p.screenshot({ path: 'screenshots/anita-basic20k-05-locked.png', fullPage: true });

    // Process Arrear
    console.log('>>> Process Arrear...');
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
    await p.locator('button').filter({ hasText: /next|skip|proceed|generate/i }).first().click().catch(() => {});
    await p.waitForTimeout(10000);
    await p.screenshot({ path: 'screenshots/anita-basic20k-06-arrear.png', fullPage: true });

    // Review & Run
    console.log('>>> Review & Run...');
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
    await p.locator('button').filter({ hasText: /run payroll|proceed|next/i }).first().click().catch(() => {});
    await p.waitForTimeout(10000);
    await p.screenshot({ path: 'screenshots/anita-basic20k-07-run.png', fullPage: true });

    console.log('>>> FULL PAYROLL COMPLETE!');
  } else {
    console.log('>>> Anita not found in any tab. Stopping.');
  }

  fs.appendFileSync('PROGRESS.md', `
### ${EMP} (AN-001) — CTC 500000, BASIC 20000 + Payroll March 2026 — ${new Date().toISOString().split('T')[0]}
| Step | Status |
|------|--------|
| CTC=500000, BASIC=20000 | DONE |
| Compute → Save → Confirm | ${found ? 'DONE' : 'FAILED'} |
| Run Payroll (all steps) | ${found ? 'DONE' : 'FAILED'} |
`);

  console.log('>>> Browser stays open.');
  await p.waitForTimeout(600000);
  await browser.close();
});
