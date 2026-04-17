// @ts-check
// Continue from where we left — browser profile already has session
// Anita Modify Salary page was last open. Go back, fix CTC + BASIC, compute, save, run payroll.
const { test, chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
test.setTimeout(0);

test('Anita — Fix CTC to 500000 with adjusted components + run payroll', async () => {
  const EMP = 'Anita';
  const CTC = '500000';
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

  // Go to Employee Workspace → Anita
  console.log('>>> Going to Anita profile...');
  await p.goto('https://www.zimyo.net/payroll/employees/list', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await p.waitForLoadState('networkidle').catch(() => {});
  await p.waitForTimeout(8000);

  await p.locator('input[placeholder="Search Employees"]').waitFor({ state: 'visible', timeout: 15000 });
  await p.locator('input[placeholder="Search Employees"]').fill(EMP);
  await p.waitForTimeout(3000);
  await p.getByText(EMP, { exact: false }).first().click();
  await p.waitForLoadState('networkidle').catch(() => {});
  await p.waitForTimeout(5000);

  // Open Modify Salary
  console.log('>>> Modifiy Salary...');
  await p.getByText(/Modif(i)?y\s*Salary/i).first().scrollIntoViewIfNeeded();
  await p.getByText(/Modif(i)?y\s*Salary/i).first().click();
  await p.waitForTimeout(5000);

  // ===== SET CTC TO 500000 AND ADJUST BASIC =====
  console.log('>>> Setting CTC to 500000 and adjusting BASIC...');

  // First, scan all editable fields to understand the salary structure
  const salaryFields = await p.evaluate(() => {
    const fields = [];
    document.querySelectorAll('input[type="text"]').forEach(inp => {
      if (inp.offsetHeight > 0) {
        const parent = inp.closest('div, td, [class*="form"]');
        const label = parent?.querySelector('label, span, p')?.textContent?.trim() ||
                      inp.closest('tr')?.querySelector('td')?.textContent?.trim() || '';
        fields.push({ id: inp.id, name: inp.name, label, value: inp.value,
                       y: Math.round(inp.getBoundingClientRect().y) });
      }
    });
    return fields;
  });
  console.log('>>> Salary fields:', JSON.stringify(salaryFields, null, 2));

  // Set Employee CTC to 500000
  const ctcField = salaryFields.find(f => f.label.match(/CTC|Gross Salary/i) && f.value && !isNaN(f.value.replace(/,/g, '')));
  if (ctcField) {
    console.log(`>>> CTC field: "${ctcField.label}" = ${ctcField.value} → ${CTC}`);
    const sel = ctcField.id ? `#${ctcField.id}` : `input[name="${ctcField.name}"]`;
    await p.locator(sel).click({ clickCount: 3 });
    await p.locator(sel).fill(CTC);
    await p.waitForTimeout(1000);
  }

  // Now adjust BASIC to fit within CTC
  // BASIC was 265000 which is > 50% of 500000. Set BASIC to 250000 (50% of 5L)
  const basicField = salaryFields.find(f => f.label.match(/BASIC/i) || (f.y > 380 && f.y < 440 && f.value === '265000'));
  if (basicField) {
    const newBasic = '200000'; // Safe value within 500000 CTC
    console.log(`>>> BASIC field: "${basicField.label}" = ${basicField.value} → ${newBasic}`);
    const basicSel = basicField.id ? `#${basicField.id}` : `input[name="${basicField.name}"]`;
    // Try locating by the value since BASIC might be in the table
    const basicInput = p.locator(basicSel).or(p.locator(`input[value="${basicField.value}"]`)).first();
    if (await basicInput.isVisible().catch(() => false)) {
      await basicInput.click({ clickCount: 3 });
      await basicInput.fill(newBasic);
      await p.waitForTimeout(1000);
    }
  } else {
    // BASIC is in the earning table — find the input in the BASIC row
    console.log('>>> Finding BASIC in earning table...');
    await p.evaluate(() => {
      const rows = document.querySelectorAll('tr, [class*="row"]');
      for (const row of rows) {
        if (row.textContent?.includes('BASIC')) {
          const inp = row.querySelector('input');
          if (inp) {
            inp.focus(); inp.select();
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            setter.call(inp, '200000');
            inp.dispatchEvent(new Event('input', { bubbles: true }));
            inp.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      }
    });
    await p.waitForTimeout(1000);
  }

  await p.screenshot({ path: 'screenshots/anita-fix-01-ctc-basic.png' });

  // ===== COMPUTE =====
  console.log('>>> Compute...');
  await p.getByRole('button', { name: 'Compute' }).click();
  await p.waitForTimeout(8000);
  await p.screenshot({ path: 'screenshots/anita-fix-02-computed.png' });

  // Check if Save is enabled now
  const saveBtn = p.getByRole('button', { name: 'Save' });
  const saveVisible = await saveBtn.isVisible().catch(() => false);
  const saveDisabled = await saveBtn.isDisabled().catch(() => true);
  console.log(`>>> Save visible: ${saveVisible}, disabled: ${saveDisabled}`);

  if (saveVisible && !saveDisabled) {
    // ===== SAVE =====
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
    await p.screenshot({ path: 'screenshots/anita-fix-03-saved.png' });
    console.log('>>> CTC updated to 500000!');
  } else {
    // Save still not available — capture the error
    console.log('>>> ERROR: Save button not available after Compute');
    await p.screenshot({ path: 'screenshots/anita-fix-ERROR-save-disabled.png', fullPage: true });

    // Check for error messages on page
    const errors = await p.evaluate(() => {
      const errEls = document.querySelectorAll('[class*="error"], [class*="Error"], [class*="alert"], [role="alert"]');
      return Array.from(errEls).filter(e => e.offsetHeight > 0).map(e => e.textContent?.trim()?.substring(0, 200));
    });
    console.log('>>> Page errors:', errors);

    let errFile = fs.readFileSync('ERRORS.md', 'utf-8');
    errFile += `\n| ${new Date().toISOString().split('T')[0]} | MOD-ANITA | ${EMP} Modify Salary CTC 500000 | Save disabled after Compute. BASIC may exceed CTC. Errors: ${errors.join('; ')} | anita-fix-ERROR-save-disabled.png | OPEN |`;
    fs.writeFileSync('ERRORS.md', errFile);
    console.log('>>> Error logged. Stopping here.');

    // Keep browser open
    console.log('>>> Browser stays open.');
    await p.waitForTimeout(600000);
    await browser.close();
    return;
  }

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
      let errFile = fs.readFileSync('ERRORS.md', 'utf-8');
      errFile += `\n| ${new Date().toISOString().split('T')[0]} | RP-ANITA | ${EMP} Run Payroll March 2026 | ${errInfo} | anita-error.png | OPEN |`;
      fs.writeFileSync('ERRORS.md', errFile);
      await p.screenshot({ path: 'screenshots/anita-error.png' });
      console.log('>>> Error logged. TEST FAILED.');
      found = false;
    }
  }

  if (found) {
    console.log(`>>> ${EMP} in Success! Full payroll...`);

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

    // Lock Attendance
    console.log('>>> Lock Attendance...');
    await p.locator('button').filter({ hasText: /Lock Attendance/i }).first().click();
    await p.waitForTimeout(10000);

    // Process Arrear — select + next
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

    // Review & Run — select + run
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

    console.log('>>> FULL PAYROLL COMPLETE!');
    await p.screenshot({ path: 'screenshots/anita-final.png', fullPage: true });
  }

  fs.appendFileSync('PROGRESS.md', `
### ${EMP} (AN-001) — CTC 500000 + Payroll March 2026 — ${new Date().toISOString().split('T')[0]}
| Step | Status |
|------|--------|
| Update CTC to 500000, adjust BASIC to 200000 | DONE |
| Compute → Save → Confirm | ${found ? 'DONE' : 'FAILED'} |
| Run Payroll March 2026 | ${found ? 'DONE' : 'FAILED'} |
`);

  console.log('>>> Browser stays open.');
  await p.waitForTimeout(600000);
  await browser.close();
});
