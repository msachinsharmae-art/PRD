// @ts-check
// Deep exploration: Attendance, Pay, Finance
const { test } = require('@playwright/test');
const { loginToESS, capturePageInteractions } = require('./ess-deep-utils');

test('Deep explore: Attendance', async ({ page, context }) => {
  test.setTimeout(180000);
  const ess = await loginToESS(page, context);

  console.log('\n' + '█'.repeat(60));
  console.log('█ ATTENDANCE');
  console.log('█'.repeat(60));

  // --- My Attendance ---
  console.log('\n>>> === My Attendance ===');
  await ess.goto('https://www.zimyo.net/ess/leave-and-attendance/my-attendance', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(3000);
  await capturePageInteractions(ess, 'Attendance > My Attendance');
  await ess.screenshot({ path: 'screenshots/deep-att-my-attendance.png', fullPage: true });

  // Scroll to see full calendar
  await ess.evaluate(() => window.scrollTo(0, 500));
  await ess.waitForTimeout(1000);
  await ess.screenshot({ path: 'screenshots/deep-att-my-attendance-scroll.png', fullPage: true });

  // Check for regularization or any action buttons on attendance dates
  const regBtn = ess.locator('button:has-text("Regularize"), button:has-text("Regularise"), text=Regularize').first();
  if (await regBtn.isVisible().catch(() => false)) {
    console.log('>>> Regularization button visible');
  }

  // --- My Leave ---
  console.log('\n>>> === My Leave ===');
  await ess.goto('https://www.zimyo.net/ess/leave-and-attendance/my-leave', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(3000);
  await capturePageInteractions(ess, 'Attendance > My Leave');
  await ess.screenshot({ path: 'screenshots/deep-att-my-leave.png', fullPage: true });

  // Check for Apply Leave button
  const applyLeave = ess.locator('button:has-text("Apply"), button:has-text("Apply Leave"), a:has-text("Apply Leave")').first();
  if (await applyLeave.isVisible().catch(() => false)) {
    console.log('>>> Clicking "Apply Leave" to see the form...');
    await applyLeave.click();
    await ess.waitForTimeout(2500);
    await capturePageInteractions(ess, 'Attendance > Apply Leave Form');
    await ess.screenshot({ path: 'screenshots/deep-att-apply-leave-form.png', fullPage: true });
    // Close
    await ess.keyboard.press('Escape');
    await ess.waitForTimeout(500);
  }

  // Scroll for leave balance details
  await ess.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await ess.waitForTimeout(1000);
  await ess.screenshot({ path: 'screenshots/deep-att-my-leave-scroll.png', fullPage: true });

  // --- Team Attendance ---
  console.log('\n>>> === Team Attendance ===');
  await ess.goto('https://www.zimyo.net/ess/leave-and-attendance/team-attendance', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(3000);
  await capturePageInteractions(ess, 'Attendance > Team Attendance');
  await ess.screenshot({ path: 'screenshots/deep-att-team-attendance.png', fullPage: true });

  // --- Team Roster ---
  console.log('\n>>> === Team Roster ===');
  await ess.goto('https://www.zimyo.net/ess/leave-and-attendance/team-roster', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(3000);
  await capturePageInteractions(ess, 'Attendance > Team Roster');
  await ess.screenshot({ path: 'screenshots/deep-att-team-roster.png', fullPage: true });

  // --- Attendance Snapshot ---
  console.log('\n>>> === Attendance Snapshot ===');
  await ess.goto('https://www.zimyo.net/ess/leave-and-attendance/attendance-snapshot', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(3000);
  await capturePageInteractions(ess, 'Attendance > Attendance Snapshot');
  await ess.screenshot({ path: 'screenshots/deep-att-snapshot.png', fullPage: true });
});

test('Deep explore: Pay', async ({ page, context }) => {
  test.setTimeout(180000);
  const ess = await loginToESS(page, context);

  console.log('\n' + '█'.repeat(60));
  console.log('█ PAY');
  console.log('█'.repeat(60));

  await ess.goto('https://www.zimyo.net/ess/pay', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(3000);
  await capturePageInteractions(ess, 'Pay - Main');
  await ess.screenshot({ path: 'screenshots/deep-pay-main.png', fullPage: true });

  // Get the actual URL it redirected to
  console.log('>>> Pay actual URL:', ess.url());

  // Find sub-tabs
  const paySubLinks = await ess.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href*="/ess/pay"]'))
      .map(a => ({ text: a.innerText.trim(), href: a.href }))
      .filter(l => l.text);
  });
  console.log('>>> Pay sub-links:', JSON.stringify(paySubLinks, null, 2));

  // Try common pay sub-pages
  const payPages = [
    { name: 'My Salary', url: 'https://www.zimyo.net/ess/pay/my-salary' },
    { name: 'Payslips', url: 'https://www.zimyo.net/ess/pay/payslips' },
    { name: 'Salary Structure', url: 'https://www.zimyo.net/ess/pay/salary-structure' },
    { name: 'Tax', url: 'https://www.zimyo.net/ess/pay/tax' },
    { name: 'IT Declaration', url: 'https://www.zimyo.net/ess/pay/it-declaration' },
    { name: 'Loans', url: 'https://www.zimyo.net/ess/pay/loans' },
    { name: 'Reimbursement', url: 'https://www.zimyo.net/ess/pay/reimbursement' },
  ];

  for (const pg of payPages) {
    try {
      console.log(`\n>>> === Pay > ${pg.name} ===`);
      await ess.goto(pg.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await ess.waitForLoadState('networkidle').catch(() => {});
      await ess.waitForTimeout(2000);
      const currentUrl = ess.url();
      console.log(`>>> Actual URL: ${currentUrl}`);
      if (currentUrl.includes('/ess/pay') || currentUrl.includes('/ess/')) {
        await capturePageInteractions(ess, `Pay > ${pg.name}`);
        const safeName = pg.name.replace(/[^a-zA-Z0-9]/g, '_');
        await ess.screenshot({ path: `screenshots/deep-pay-${safeName}.png`, fullPage: true });
      }
    } catch (e) {
      console.log(`>>> Error: ${e.message.substring(0, 100)}`);
    }
  }

  // Explore actual tabs visible on the Pay page
  await ess.goto('https://www.zimyo.net/ess/pay', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(2000);

  // Look for all visible tabs/links in Pay header area
  const payTabs = await ess.evaluate(() => {
    const links = [];
    document.querySelectorAll('a').forEach(a => {
      const rect = a.getBoundingClientRect();
      const text = a.innerText?.trim();
      if (text && rect.y > 40 && rect.y < 120 && text.length < 50) {
        links.push({ text, href: a.href, y: Math.round(rect.y) });
      }
    });
    return links;
  });
  console.log('>>> Pay header tabs:', JSON.stringify(payTabs, null, 2));

  // Click each pay tab
  for (const tab of payTabs) {
    if (tab.href.includes('/ess/') && !tab.href.includes('/ess/dashboard') && !tab.href.includes('/ess/engage') && !tab.href.includes('/ess/request')) {
      try {
        console.log(`\n>>> Navigating to Pay tab: ${tab.text}`);
        await ess.goto(tab.href, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await ess.waitForLoadState('networkidle').catch(() => {});
        await ess.waitForTimeout(2000);
        await capturePageInteractions(ess, `Pay > ${tab.text}`);
        const safeName = tab.text.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 25);
        await ess.screenshot({ path: `screenshots/deep-pay-tab-${safeName}.png`, fullPage: true });
      } catch (e) {
        console.log(`>>> Error: ${e.message.substring(0, 100)}`);
      }
    }
  }
});

test('Deep explore: Finance', async ({ page, context }) => {
  test.setTimeout(180000);
  const ess = await loginToESS(page, context);

  console.log('\n' + '█'.repeat(60));
  console.log('█ FINANCE');
  console.log('█'.repeat(60));

  // --- Expense > My Expense ---
  console.log('\n>>> === Finance > Expense > My Expense ===');
  await ess.goto('https://www.zimyo.net/ess/finance-bundle/expense/my-expense', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(3000);
  await capturePageInteractions(ess, 'Finance > My Expense');
  await ess.screenshot({ path: 'screenshots/deep-fin-my-expense.png', fullPage: true });

  // Click "Raise New Request" to see expense form
  const raiseReq = ess.locator('button:has-text("Raise New Request"), a:has-text("Raise New Request"), button:has-text("Raise New"), text=Raise New Request').first();
  if (await raiseReq.isVisible().catch(() => false)) {
    console.log('>>> Clicking "Raise New Request"...');
    await raiseReq.click();
    await ess.waitForTimeout(2500);
    await capturePageInteractions(ess, 'Finance > New Expense Request Form');
    await ess.screenshot({ path: 'screenshots/deep-fin-new-expense-form.png', fullPage: true });
    await ess.keyboard.press('Escape');
    await ess.waitForTimeout(500);
  }

  // --- Expense > AP Access ---
  console.log('\n>>> === Finance > AP Access ===');
  await ess.goto('https://www.zimyo.net/ess/finance-bundle/expense/ap-access', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(2000);
  await capturePageInteractions(ess, 'Finance > AP Access');
  await ess.screenshot({ path: 'screenshots/deep-fin-ap-access.png', fullPage: true });

  // --- Expense > AP Report ---
  console.log('\n>>> === Finance > AP Report ===');
  await ess.goto('https://www.zimyo.net/ess/finance-bundle/expense/ap-report', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(2000);
  await capturePageInteractions(ess, 'Finance > AP Report');
  await ess.screenshot({ path: 'screenshots/deep-fin-ap-report.png', fullPage: true });

  // --- Travel Desk ---
  console.log('\n>>> === Finance > Travel Desk ===');
  await ess.goto('https://www.zimyo.net/ess/finance-bundle/travel-desk', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(2000);
  await capturePageInteractions(ess, 'Finance > Travel Desk');
  await ess.screenshot({ path: 'screenshots/deep-fin-travel-desk.png', fullPage: true });

  // Try clicking "Raise" or "New" for travel
  const travelNew = ess.locator('button:has-text("Raise"), button:has-text("New"), button:has-text("Create")').first();
  if (await travelNew.isVisible().catch(() => false)) {
    console.log('>>> Clicking new travel request...');
    await travelNew.click();
    await ess.waitForTimeout(2500);
    await capturePageInteractions(ess, 'Finance > New Travel Request Form');
    await ess.screenshot({ path: 'screenshots/deep-fin-new-travel-form.png', fullPage: true });
    await ess.keyboard.press('Escape');
    await ess.waitForTimeout(500);
  }

  // --- Petty Cash ---
  console.log('\n>>> === Finance > Petty Cash ===');
  await ess.goto('https://www.zimyo.net/ess/finance-bundle/petty-cash', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(2000);
  await capturePageInteractions(ess, 'Finance > Petty Cash');
  await ess.screenshot({ path: 'screenshots/deep-fin-petty-cash.png', fullPage: true });

  // --- Vendor ---
  console.log('\n>>> === Finance > Vendor ===');
  await ess.goto('https://www.zimyo.net/ess/finance-bundle/vendor', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(2000);
  await capturePageInteractions(ess, 'Finance > Vendor');
  await ess.screenshot({ path: 'screenshots/deep-fin-vendor.png', fullPage: true });
});
