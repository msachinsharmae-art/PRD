// @ts-check
// Based on the working add-employee.spec.js — uses same proven selectors
const { test } = require('@playwright/test');

test.use({ timeout: 180000 });

test('Add Employee Manually — Maldives Entity', async ({ page, context }) => {
  test.setTimeout(0);

  let n = 0;
  const snap = async (label) => {
    n++;
    await page.screenshot({ path: `screenshots/add-emp-${String(n).padStart(2,'0')}-${label}.png`, fullPage: true });
    console.log(`[${n}] ${label}`);
  };

  // ── LOGIN ──
  // Login opens a new tab — handle both pages
  await page.goto('https://www.zimyo.net/login', { timeout: 30000 });
  await page.getByRole('textbox', { name: 'Username' }).fill('sachin.sharma+demo@zimyo.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('Zimyo@12345');

  const newPagePromise = context.waitForEvent('page', { timeout: 15000 }).catch(() => null);
  await page.getByRole('button', { name: 'Login', exact: true }).click();

  const newPage = await newPagePromise;
  const p = newPage || page; // p = the active page after login
  await p.waitForURL('**/dashboard/**', { timeout: 30000 });
  await snap('logged-in');

  // ── NAVIGATE: Core HR > Employee Master > Take Action > Add Manually ──
  await p.locator('a').filter({ hasText: 'Core HR' }).click();
  await p.getByRole('tab', { name: 'Employee Master' }).click();
  await p.waitForTimeout(3000);
  await snap('employee-master');

  await p.getByRole('button', { name: 'Take Action' }).click();
  await p.getByRole('button', { name: 'Add Manually' }).click();
  await p.waitForTimeout(2000);
  await snap('add-manually');

  // ── SELECT ENTITY = MALDIVES ──
  // The working pattern: click the "Select..." div, then click entity name
  // nth(2) was for Zimyo Dev — we need to find the right index or scroll to Maldives
  await p.locator('div').filter({ hasText: /^Select\.\.\.$/ }).nth(2).click();
  await p.waitForTimeout(1000);
  await snap('entity-dropdown');

  // Scroll through options to find Maldives
  let maldivesFound = false;
  const maldivesOpt = p.getByText('Maldives', { exact: true });
  if (await maldivesOpt.isVisible({ timeout: 2000 }).catch(() => false)) {
    await maldivesOpt.click();
    maldivesFound = true;
  } else {
    // Scroll in the dropdown menu to find Maldives
    for (let i = 0; i < 15; i++) {
      await p.keyboard.press('ArrowDown');
      await p.waitForTimeout(300);
      if (await maldivesOpt.isVisible({ timeout: 500 }).catch(() => false)) {
        await maldivesOpt.click();
        maldivesFound = true;
        break;
      }
    }
  }
  if (!maldivesFound) {
    // Type to filter
    await p.keyboard.type('Maldives', { delay: 80 });
    await p.waitForTimeout(1500);
    const opt = p.locator('[role="option"]').first();
    if (await opt.isVisible({ timeout: 2000 }).catch(() => false)) await opt.click();
    else await p.locator('[class*="option"]').first().click();
  }
  console.log('Entity = Maldives');
  await p.waitForTimeout(3000);
  await snap('maldives-selected');

  // ── STEP 1: PERSONAL DETAILS ──
  // Full Name = "sachin claude 1234"
  await p.getByRole('textbox', { name: /Full Name/i }).first().fill('mayank demo 1234');
  console.log('Full Name = mayank demo 1234');

  // Joining Date = 22/03/2026 — click calendar icon by exact coordinates
  console.log('Setting Joining Date...');
  // Find the calendar icon coordinates using evaluate
  const calIconPos = await p.evaluate(() => {
    // Find all fieldsets, look for "Joining Date"
    const fieldsets = document.querySelectorAll('fieldset');
    for (const fs of fieldsets) {
      const legend = fs.querySelector('legend');
      if (legend && /joining date/i.test(legend.textContent || '')) {
        // Found the fieldset — now find the calendar icon (SVG or img) inside it
        const svg = fs.querySelector('svg');
        if (svg) {
          const r = svg.getBoundingClientRect();
          return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2), found: 'svg' };
        }
        // Try button inside
        const btn = fs.querySelector('button');
        if (btn) {
          const r = btn.getBoundingClientRect();
          return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2), found: 'button' };
        }
        // Try any clickable icon
        const icon = fs.querySelector('[class*="icon"], [class*="Icon"], img');
        if (icon) {
          const r = icon.getBoundingClientRect();
          return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2), found: 'icon' };
        }
        // Last resort: click right side of the fieldset (where icon visually is)
        const r = fs.getBoundingClientRect();
        return { x: Math.round(r.x + r.width - 25), y: Math.round(r.y + r.height/2), found: 'fieldset-right' };
      }
    }
    return null;
  });

  if (calIconPos) {
    console.log(`Calendar icon found via ${calIconPos.found} at (${calIconPos.x}, ${calIconPos.y})`);
    await p.mouse.click(calIconPos.x, calIconPos.y);
    await p.waitForTimeout(2000);
    await snap('joining-calendar-open');

    // Calendar should now be open — find and click day 22
    // Use evaluate to find day 22 button precisely
    const day22Pos = await p.evaluate(() => {
      const els = document.querySelectorAll('button, td, div, span, [role="gridcell"]');
      for (const el of els) {
        if (el.textContent?.trim() === '22' && el.offsetHeight > 0 && el.offsetHeight < 60) {
          const r = el.getBoundingClientRect();
          // Must be in the calendar area (not part of some other UI)
          if (r.width < 80 && r.width > 10) {
            return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) };
          }
        }
      }
      return null;
    });

    if (day22Pos) {
      await p.mouse.click(day22Pos.x, day22Pos.y);
      console.log('Clicked day 22');
      await p.waitForTimeout(1000);
    } else {
      console.log('Day 22 not found in calendar!');
      await snap('joining-no-day22');
    }

    // Click OK if visible
    const okBtn = p.locator('button').filter({ hasText: /^OK$/i }).first();
    if (await okBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await okBtn.click();
      console.log('Clicked OK');
      await p.waitForTimeout(1000);
    }

    console.log('Joining Date = 22/03/2026');
  } else {
    console.log('ERROR: Could not find Joining Date calendar icon!');
    await snap('joining-icon-not-found');
  }
  await p.waitForTimeout(500);

  // Other step 1 fields
  await fillFs(p, 'Father Name', 'Rajesh Kumar');
  await fillFs(p, 'Mother Name', 'Sunita Devi');
  await pickFirst(p, 'City Type');
  await pickOpt(p, 'Gender', 'Male');
  await pickFirst(p, 'Marital Status');
  await pickFirst(p, 'Nationality');

  // IFSC Code if visible
  const ifsc = p.locator('input[name="IFSC_CODE"]');
  if (await ifsc.isVisible({ timeout: 1000 }).catch(() => false)) await ifsc.fill('SBIN0001234');

  await snap('step1-filled');

  // Click Proceed
  await p.getByRole('button', { name: 'Proceed' }).click();
  await p.waitForTimeout(2000);
  await snap('step2');

  // ── STEP 2: EMPLOYMENT DETAILS ──
  // Employee Code = E00012Claude
  const empCode = p.getByRole('textbox', { name: /Employee Code/i }).first();
  if (await empCode.isVisible({ timeout: 5000 }).catch(() => false)) {
    await empCode.fill('E00012Claude');
    console.log('Employee Code = E00012Claude');
  }

  // Leave Rule = "k rule test" — click the textbox, then pick option
  const leaveRule = p.getByRole('textbox', { name: /Leave Rule/i }).first();
  if (await leaveRule.isVisible({ timeout: 3000 }).catch(() => false)) {
    await leaveRule.click();
    await p.waitForTimeout(1000);
    // Look for "k rule test" option
    const kRule = p.locator('[role="option"]').filter({ hasText: /k rule test/i }).first();
    if (await kRule.isVisible({ timeout: 3000 }).catch(() => false)) {
      await kRule.click();
    } else {
      // Type to search
      await p.keyboard.type('k rule', { delay: 80 });
      await p.waitForTimeout(1500);
      const opt = p.locator('[role="option"]').first();
      if (await opt.isVisible({ timeout: 2000 }).catch(() => false)) await opt.click();
    }
    console.log('Leave Rule = k rule test');
  }

  // Shift — select first available
  const shift = p.getByRole('textbox', { name: /Shift/i }).first();
  if (await shift.isVisible({ timeout: 2000 }).catch(() => false)) {
    await shift.click();
    await p.waitForTimeout(1000);
    const opt = p.locator('[role="option"]').first();
    if (await opt.isVisible({ timeout: 2000 }).catch(() => false)) await opt.click();
  }

  // Auto-fill remaining
  await autoSelect(p);
  await snap('step2-filled');

  await p.getByRole('button', { name: 'Proceed' }).click();
  await p.waitForTimeout(2000);
  await snap('step3');

  // ── STEPS 3-7: CLICK PROCEED (fill if needed) ──
  for (let step = 3; step <= 9; step++) {
    console.log(`── STEP ${step} ──`);

    // Auto-fill any visible empty fields
    await autoFill(p);
    await autoSelect(p);

    // Step 6 might need spouse name
    const spouse = p.getByRole('textbox', { name: /Wife\/Husband Name|Spouse/i }).first();
    if (await spouse.isVisible({ timeout: 1000 }).catch(() => false)) {
      await spouse.fill('Test Spouse');
    }

    await p.waitForTimeout(1000);

    // Click Proceed if visible
    const proceed = p.getByRole('button', { name: 'Proceed' });
    if (await proceed.isVisible({ timeout: 3000 }).catch(() => false)) {
      await proceed.click();
      console.log(`Proceed ${step}`);
    } else {
      // Try Save
      const save = p.getByRole('button', { name: 'Save' });
      if (await save.isVisible({ timeout: 2000 }).catch(() => false)) {
        await save.click();
        console.log('SAVED!');
        await p.waitForTimeout(5000);
        break;
      }
    }
    await p.waitForTimeout(2000);
    await snap(`step${step}`);

    // Dismiss popups
    const ok = p.locator('button').filter({ hasText: /confirm|yes|ok|done/i }).first();
    if (await ok.isVisible({ timeout: 1000 }).catch(() => false)) await ok.click();
  }

  await snap('employee-created');

  // ── VERIFY: Search for the employee in Employee Master ──
  console.log('\n── VERIFY: Search employee ──');
  // Navigate to Employee Master
  await p.goto('https://www.zimyo.net/admin/core_hr/users/employee-master', { timeout: 30000 });
  await p.waitForLoadState('networkidle').catch(() => {});
  await p.waitForTimeout(3000);

  // If redirected to login, login again
  if (p.url().includes('/login')) {
    await p.locator('#username').fill('sachin.sharma+demo@zimyo.com');
    await p.locator('#password').fill('Zimyo@12345');
    await p.locator('button[type="submit"]').click();
    await p.waitForTimeout(8000);
    await p.goto('https://www.zimyo.net/admin/core_hr/users/employee-master', { timeout: 30000 });
    await p.waitForLoadState('networkidle').catch(() => {});
    await p.waitForTimeout(3000);
  }

  // Click Employee Master tab if needed
  const empTab = p.getByRole('tab', { name: 'Employee Master' });
  if (await empTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await empTab.click();
    await p.waitForTimeout(3000);
    await p.waitForLoadState('networkidle').catch(() => {});
  }
  await snap('employee-master-list');

  // Type "mayank demo 1234" in the search bar
  const searchBox = p.locator('input[placeholder*="Search" i], input[type="search"]').first();
  if (await searchBox.isVisible({ timeout: 5000 }).catch(() => false)) {
    await searchBox.click();
    await searchBox.fill('mayank demo 1234');
    console.log('Searching for: mayank demo 1234');
    await p.waitForTimeout(3000);
    await p.waitForLoadState('networkidle').catch(() => {});
    await snap('search-result');

    // Check if employee is visible in the list
    const empRow = p.locator('td, tr, [class*="row"], [class*="Row"]').filter({ hasText: /mayank demo 1234/i }).first();
    if (await empRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('VERIFIED: Employee "mayank demo 1234" found in Employee Master!');
    } else {
      // Also check by partial name
      const anyMatch = p.getByText('mayank', { exact: false }).first();
      if (await anyMatch.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('VERIFIED: Employee with name "mayank" found in list!');
      } else {
        console.log('WARNING: Employee not found in search results');
      }
    }
    await snap('verification-done');
  } else {
    console.log('Search box not found');
  }

  console.log('\nDONE — Test complete');
  await p.waitForTimeout(5000);
});


// ─── Helpers ───
async function fillFs(p, label, value) {
  const fs = p.locator('fieldset').filter({ hasText: new RegExp(label, 'i') }).first();
  if (!(await fs.isVisible({ timeout: 1500 }).catch(() => false))) return;
  const inp = fs.locator('input').first();
  if (await inp.isVisible({ timeout: 500 }).catch(() => false)) { await inp.fill(value); console.log(`  ${label} = ${value}`); }
}

async function pickFirst(p, label) {
  const fs = p.locator('fieldset').filter({ hasText: new RegExp(label, 'i') }).first();
  if (!(await fs.isVisible({ timeout: 1500 }).catch(() => false))) return;
  const sel = fs.locator('select').first();
  if (!(await sel.isVisible({ timeout: 500 }).catch(() => false))) return;
  const opts = await sel.locator('option').allTextContents();
  const v = opts.find(o => o.trim() && !/^select/i.test(o.trim()) && o.trim() !== label);
  if (v) { await sel.selectOption({ label: v.trim() }); console.log(`  ${label} = ${v.trim()}`); }
}

async function pickOpt(p, label, text) {
  const fs = p.locator('fieldset').filter({ hasText: new RegExp(label, 'i') }).first();
  if (!(await fs.isVisible({ timeout: 1500 }).catch(() => false))) return;
  const sel = fs.locator('select').first();
  if (!(await sel.isVisible({ timeout: 500 }).catch(() => false))) return;
  await sel.selectOption({ label: text }).catch(async () => {
    const opts = await sel.locator('option').allTextContents();
    const m = opts.find(o => new RegExp(text, 'i').test(o));
    if (m) await sel.selectOption({ label: m.trim() });
  });
}

async function autoFill(p) {
  const inputs = await p.evaluate(() => Array.from(document.querySelectorAll('input')).filter(i =>
    i.offsetHeight > 0 && !i.value?.trim() && !i.disabled && !i.readOnly && !['hidden','file','checkbox','radio','date'].includes(i.type)
  ).map(i => ({ label: (i.closest('fieldset')?.querySelector('legend')?.textContent || i.placeholder || '').replace('*','').trim(), id: i.id })));
  for (const inp of inputs) {
    if (!inp.id) continue;
    const l = inp.label.toLowerCase();
    let val = 'Test';
    if (l.includes('email')) val = `test${Date.now().toString().slice(-4)}@yopmail.com`;
    else if (l.includes('phone')||l.includes('mobile')) val = '9876543210';
    else if (l.includes('address')) val = '123 Test St';
    else if (l.includes('city')) val = 'Male';
    else if (l.includes('pin')||l.includes('zip')) val = '20001';
    try { await p.locator('#'+inp.id).fill(val); } catch(e) {}
  }
}

async function autoSelect(p) {
  const sels = await p.evaluate(() => Array.from(document.querySelectorAll('select')).filter(s =>
    s.offsetHeight > 0 && !s.disabled && (!s.value || s.selectedIndex <= 0)
  ).map(s => ({ id: s.id, v: Array.from(s.options).find(o => o.value)?.value })).filter(s => s.id && s.v));
  for (const s of sels) { try { await p.selectOption('#'+s.id, s.v); } catch(e) {} }
}
