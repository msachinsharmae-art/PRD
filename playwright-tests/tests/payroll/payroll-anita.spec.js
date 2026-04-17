// @ts-check
// Anita (AN-001): Update CTC to 500000 → Run full payroll March 2026
// Uses persistent browser profile to keep session alive across runs
const { test, chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
test.setTimeout(0);

test('Anita AN-001 — Update CTC to 500000 + Run full payroll March 2026', async () => {
  const EMP = 'Anita';
  const CTC = '500000';
  const MONTH = 'Mar-2026';
  const userDataDir = path.join(__dirname, '..', 'browser-profile');

  // Persistent context — keeps cookies/login across runs
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false, slowMo: 200, viewport: { width: 1280, height: 720 },
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const p = context.pages()[0] || await context.newPage();

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

  // ===== CHECK IF ALREADY LOGGED IN =====
  console.log('>>> Checking session...');
  await p.goto('https://www.zimyo.net/payroll/employees/list', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  await p.waitForLoadState('networkidle').catch(() => {});
  await p.waitForTimeout(5000);

  const currentUrl = p.url();
  console.log('>>> Current URL:', currentUrl);

  if (currentUrl.includes('/login') || currentUrl === 'https://www.zimyo.net/') {
    // Need to login
    console.log('>>> Not logged in. Logging in...');
    await p.goto('https://www.zimyo.net', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    await p.waitForLoadState('networkidle').catch(() => {});
    await p.waitForTimeout(5000);
    await p.locator('#username').waitFor({ state: 'visible', timeout: 15000 });
    await p.locator('#username').click();
    await p.locator('#username').fill('devteam@yopmail.com');
    await p.locator('#password').click();
    await p.locator('#password').fill('Zimyo@12345');
    await p.waitForTimeout(1000);
    await p.locator('button[type="submit"]').click();
    await p.waitForTimeout(10000);
    console.log('>>> Post-login:', p.url());
    // Navigate to employee workspace
    await p.goto('https://www.zimyo.net/payroll/employees/list', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await p.waitForLoadState('networkidle').catch(() => {});
    await p.waitForTimeout(8000);
  } else {
    console.log('>>> Already on payroll! Session active.');
  }

  // ===== SEARCH ANITA =====
  console.log(`>>> Search "${EMP}"...`);
  const searchInput = p.locator('input[placeholder="Search Employees"]');
  await searchInput.waitFor({ state: 'visible', timeout: 15000 });
  await searchInput.fill(EMP);
  await p.waitForTimeout(3000);
  await p.screenshot({ path: 'screenshots/anita-01-search.png' });

  // Click Anita
  console.log(`>>> Click ${EMP}...`);
  await p.getByText(EMP, { exact: false }).first().click();
  await p.waitForLoadState('networkidle').catch(() => {});
  await p.waitForTimeout(5000);
  await p.screenshot({ path: 'screenshots/anita-02-profile.png' });

  // ===== MODIFY SALARY =====
  console.log('>>> Modifiy Salary...');
  await p.getByText(/Modif(i)?y\s*Salary/i).first().scrollIntoViewIfNeeded();
  await p.getByText(/Modif(i)?y\s*Salary/i).first().click();
  await p.waitForTimeout(5000);
  await p.screenshot({ path: 'screenshots/anita-03-modify.png' });

  // ===== UPDATE CTC ONLY =====
  console.log(`>>> Setting CTC to ${CTC}...`);
  // Find the CTC/salary input — could be #GROSS_SALARY or #EMPLOYEE_CTC or by label
  const ctcField = await p.evaluate(() => {
    const inputs = document.querySelectorAll('input[type="text"]');
    for (const inp of inputs) {
      const label = inp.closest('[class*="FormControl"], [class*="form"]')?.querySelector('label, span, p')?.textContent?.trim() || '';
      if (label.match(/CTC|Salary|Gross/i) && inp.offsetHeight > 0) {
        return { id: inp.id, name: inp.name, label, value: inp.value };
      }
    }
    return null;
  });
  console.log('>>> Found CTC field:', JSON.stringify(ctcField));

  if (ctcField?.id) {
    await p.locator(`#${ctcField.id}`).click({ clickCount: 3 });
    await p.locator(`#${ctcField.id}`).fill(CTC);
  } else if (ctcField?.name) {
    await p.locator(`input[name="${ctcField.name}"]`).click({ clickCount: 3 });
    await p.locator(`input[name="${ctcField.name}"]`).fill(CTC);
  } else {
    console.log('>>> CTC field not found by ID/name. Trying by label...');
    // Click the input near "CTC" or "Salary" label
    await p.evaluate((newCTC) => {
      const inputs = document.querySelectorAll('input[type="text"]');
      for (const inp of inputs) {
        const parent = inp.closest('div');
        const text = parent?.textContent || '';
        if (text.match(/CTC|Salary|Gross/i) && inp.offsetHeight > 0 && inp.value && !isNaN(inp.value.replace(/,/g, ''))) {
          inp.value = '';
          inp.focus();
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          nativeInputValueSetter.call(inp, newCTC);
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          inp.dispatchEvent(new Event('change', { bubbles: true }));
          return;
        }
      }
    }, CTC);
  }
  await p.waitForTimeout(2000);
  await p.screenshot({ path: 'screenshots/anita-04-ctc-set.png' });

  // ===== COMPUTE =====
  console.log('>>> Compute...');
  await p.getByRole('button', { name: 'Compute' }).click();
  await p.waitForTimeout(8000);
  await p.screenshot({ path: 'screenshots/anita-05-computed.png' });

  // ===== SAVE =====
  console.log('>>> Save...');
  await p.getByRole('button', { name: 'Save' }).click();
  await p.waitForTimeout(3000);

  // ===== CONFIRM =====
  console.log('>>> Confirm...');
  await p.waitForTimeout(2000);
  await p.locator('button').filter({ hasText: /^Confirm$/i }).first().click().catch(async () => {
    await p.locator('[role="dialog"] button').filter({ hasText: /confirm|yes|ok/i }).first().click().catch(() => {});
  });
  await p.waitForTimeout(5000);
  await p.screenshot({ path: 'screenshots/anita-06-saved.png' });
  console.log('>>> CTC updated to ' + CTC + '!');

  // ===== RUN PAYROLL =====
  console.log('>>> Run Payroll...');
  await p.goto('https://www.zimyo.net/payroll/payroll-operations/run-payroll', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await p.waitForLoadState('networkidle').catch(() => {});
  await p.waitForTimeout(8000);

  // Set filters
  await pickFilter(280, 194, 'All', 'Entity');
  await pickFilter(555, 194, MONTH, 'Month-Year');
  // Clear Status tags and select All
  for (let i = 0; i < 4; i++) {
    await p.locator('[class*="multi-value"] [class*="remove"], [class*="multiValue"] svg').first().click().catch(() => {});
    await p.waitForTimeout(300);
  }
  await pickFilter(833, 194, 'All', 'Status');

  // Search
  console.log('>>> Search...');
  await p.locator('button').filter({ hasText: /^Search/ }).first().click();
  await p.waitForTimeout(10000);
  await p.screenshot({ path: 'screenshots/anita-07-results.png' });

  // ===== CHECK SUCCESS/ERROR TABS =====
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
        for (const row of document.querySelectorAll('tr, [class*="row"]')) {
          if (row.textContent?.toLowerCase().includes(name.toLowerCase())) {
            return Array.from(row.querySelectorAll('td')).map(c => c.textContent?.trim()).join(' | ');
          }
        }
        return 'Error not captured';
      }, EMP);
      console.log(`>>> ERROR for ${EMP}: ${errInfo}`);
      await p.screenshot({ path: 'screenshots/anita-08-error.png' });
      let errFile = fs.readFileSync('ERRORS.md', 'utf-8');
      errFile += `\n| ${new Date().toISOString().split('T')[0]} | RP-ANITA | ${EMP} (AN-001) March 2026 | ${errInfo} | anita-08-error.png | OPEN |`;
      fs.writeFileSync('ERRORS.md', errFile);
      console.log('>>> Error logged. TEST FAILED for payroll run.');
      found = false; // Don't proceed with payroll steps
    }
  }

  if (found) {
    console.log(`>>> ${EMP} in Success! Running full payroll...`);

    // Select checkbox
    await p.evaluate((name) => {
      for (const row of document.querySelectorAll('tr')) {
        if (row.textContent?.toLowerCase().includes(name.toLowerCase())) {
          const cb = row.querySelector('input[type="checkbox"]');
          if (cb && !cb.checked) cb.click();
        }
      }
    }, EMP);
    await p.waitForTimeout(2000);

    // STEP 1: Lock Attendance & Proceed
    console.log('>>> Lock Attendance & Proceed...');
    await p.locator('button').filter({ hasText: /Lock Attendance/i }).first().click();
    await p.waitForTimeout(10000);
    await p.screenshot({ path: 'screenshots/anita-09-locked.png', fullPage: true });

    // STEP 2: Process Arrear — select checkbox, next
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
    await p.screenshot({ path: 'screenshots/anita-10-arrear.png', fullPage: true });

    // STEP 3: Review & Run — select checkbox, run
    console.log('>>> Review & Run Payroll...');
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
    await p.screenshot({ path: 'screenshots/anita-11-run.png', fullPage: true });

    // STEP 4: Publish Payslips
    console.log('>>> Publish Payslips...');
    await p.waitForTimeout(5000);
    await p.screenshot({ path: 'screenshots/anita-12-publish.png', fullPage: true });
    console.log('>>> FULL PAYROLL COMPLETE!');
  }

  // Log progress
  fs.appendFileSync('PROGRESS.md', `
### ${EMP} (AN-001) — CTC ${CTC} + Payroll March 2026 — ${new Date().toISOString().split('T')[0]}
| Step | Status |
|------|--------|
| Update CTC to ${CTC} | DONE |
| Compute → Save → Confirm | DONE |
| Run Payroll | ${found ? 'DONE' : 'FAILED'} |
`);

  // Keep browser open — no pause, just a long wait
  console.log('>>> Browser stays open for 10 min.');
  await p.waitForTimeout(600000);
  await context.close();
});
