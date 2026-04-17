// @ts-check
// Deep exploration: Dashboard, Engage, Request
const { test } = require('@playwright/test');
const { loginToESS, capturePageInteractions, exploreTabsOnPage } = require('./ess-deep-utils');

test('Deep explore: Dashboard', async ({ page, context }) => {
  test.setTimeout(180000);
  const ess = await loginToESS(page, context);

  // ========== DASHBOARD ==========
  console.log('\n' + '█'.repeat(60));
  console.log('█ DASHBOARD - My Dashboard');
  console.log('█'.repeat(60));
  await ess.goto('https://www.zimyo.net/ess/dashboard/my-dashboard', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(3000);
  await capturePageInteractions(ess, 'Dashboard');
  await ess.screenshot({ path: 'screenshots/deep-dashboard-main.png', fullPage: true });

  // Click "Apply New" button to see what options it opens
  const applyNewBtn = ess.locator('button:has-text("Apply New"), a:has-text("Apply New")').first();
  if (await applyNewBtn.isVisible().catch(() => false)) {
    console.log('\n>>> Clicking "Apply New" to see dropdown options...');
    await applyNewBtn.click();
    await ess.waitForTimeout(2000);
    const dropdownText = await ess.evaluate(() => {
      const menus = document.querySelectorAll('[role="menu"], [role="listbox"], [class*="dropdown-menu"], [class*="popover"], [class*="Popover"], [class*="Menu-list"], .MuiMenu-list, .MuiPopover-paper');
      let text = '';
      menus.forEach(m => text += m.innerText + '\n');
      return text;
    });
    console.log('>>> "Apply New" dropdown options:', dropdownText);
    await ess.screenshot({ path: 'screenshots/deep-dashboard-apply-new.png', fullPage: false });
    // Close by pressing Escape
    await ess.keyboard.press('Escape');
    await ess.waitForTimeout(500);
  }

  // Click "Clock In" button area
  const clockInBtn = ess.locator('text=Clock In').first();
  if (await clockInBtn.isVisible().catch(() => false)) {
    console.log('\n>>> "Clock In" button is visible - can clock in attendance');
  }

  // Check "+ Add New" for tasks
  const addNewTask = ess.locator('button:has-text("+ Add New"), a:has-text("+ Add New")').first();
  if (await addNewTask.isVisible().catch(() => false)) {
    console.log('>>> "+ Add New" task button visible');
  }

  // Explore "Pending On Me" and "My Pending Requests" sections
  const pendingOnMe = ess.locator('text=Pending On Me').first();
  if (await pendingOnMe.isVisible().catch(() => false)) {
    console.log('>>> "Pending On Me" section visible on dashboard');
  }

  // Check mood tracker
  const moodSection = ess.locator('text=Mood').first();
  if (await moodSection.isVisible().catch(() => false)) {
    console.log('>>> Mood tracker visible - can set daily mood');
  }

  // Scroll down to see more
  await ess.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await ess.waitForTimeout(1500);
  await ess.screenshot({ path: 'screenshots/deep-dashboard-scrolled.png', fullPage: true });
  await capturePageInteractions(ess, 'Dashboard (scrolled)');
});

test('Deep explore: Engage', async ({ page, context }) => {
  test.setTimeout(180000);
  const ess = await loginToESS(page, context);

  // ========== ENGAGE ==========
  console.log('\n' + '█'.repeat(60));
  console.log('█ ENGAGE');
  console.log('█'.repeat(60));
  await ess.goto('https://www.zimyo.net/ess/engage', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(3000);
  await capturePageInteractions(ess, 'Engage - Feed');
  await ess.screenshot({ path: 'screenshots/deep-engage-feed.png', fullPage: true });

  // Check for "Groups" tab
  const groupsTab = ess.locator('text=Groups').first();
  if (await groupsTab.isVisible().catch(() => false)) {
    console.log('\n>>> Clicking "Groups" tab...');
    await groupsTab.click();
    await ess.waitForTimeout(2000);
    await capturePageInteractions(ess, 'Engage - Groups');
    await ess.screenshot({ path: 'screenshots/deep-engage-groups.png', fullPage: true });
  }

  // Check for "Direct Messages"
  const dmTab = ess.locator('text=Direct Messages').first();
  if (await dmTab.isVisible().catch(() => false)) {
    console.log('\n>>> "Direct Messages" section visible');
  }

  // Check post creation area
  const postArea = ess.locator('textarea, [contenteditable="true"], [class*="post-input"], [class*="compose"]').first();
  if (await postArea.isVisible().catch(() => false)) {
    console.log('>>> Post creation area visible - can create posts');
  }

  // Check "Make Yourself Private" toggle
  const privateToggle = ess.locator('text=Make Yourself Private').first();
  if (await privateToggle.isVisible().catch(() => false)) {
    console.log('>>> "Make Yourself Private" toggle visible');
  }
});

test('Deep explore: Request', async ({ page, context }) => {
  test.setTimeout(180000);
  const ess = await loginToESS(page, context);

  // ========== REQUEST ==========
  console.log('\n' + '█'.repeat(60));
  console.log('█ REQUEST');
  console.log('█'.repeat(60));
  await ess.goto('https://www.zimyo.net/ess/request/my-requests', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(3000);
  await capturePageInteractions(ess, 'Request - Self');
  await ess.screenshot({ path: 'screenshots/deep-request-self.png', fullPage: true });

  // Explore Self/Team/Employee tabs
  for (const tabName of ['Self', 'Team', 'Employee']) {
    const tab = ess.locator(`text="${tabName}"`).first();
    if (await tab.isVisible().catch(() => false)) {
      console.log(`\n>>> Clicking "${tabName}" tab...`);
      await tab.click();
      await ess.waitForTimeout(2500);
      await capturePageInteractions(ess, `Request - ${tabName}`);
      await ess.screenshot({ path: `screenshots/deep-request-${tabName.toLowerCase()}.png`, fullPage: true });
    }
  }

  // Click "Apply New" to see request types
  const applyNew = ess.locator('button:has-text("Apply New"), a:has-text("Apply New")').first();
  if (await applyNew.isVisible().catch(() => false)) {
    console.log('\n>>> Clicking "Apply New" in Request...');
    await applyNew.click();
    await ess.waitForTimeout(2000);
    const content = await ess.evaluate(() => {
      const modals = document.querySelectorAll('[role="dialog"], [class*="modal"], [class*="Modal"], [class*="drawer"], [class*="Drawer"], [class*="popover"], [class*="Popover"], .MuiDialog-root, .MuiDrawer-root, .MuiPopover-paper');
      let text = '';
      modals.forEach(m => text += m.innerText + '\n');
      return text || document.body.innerText;
    });
    console.log('>>> "Apply New" opened:', content.substring(0, 2000));
    await ess.screenshot({ path: 'screenshots/deep-request-apply-new.png', fullPage: true });
    await ess.keyboard.press('Escape');
    await ess.waitForTimeout(500);
  }

  // Explore request category filters (left sidebar within request)
  const categories = ['Leave & Attendance', 'Document', 'Onboarding', 'Offboarding', 'Asset', 'Requisition', 'Expense', 'Vendor', 'Petty Cash', 'Travel Desk', 'Loan and Advance', 'Task Mangement', 'Checklist', 'Internal Job Posting Approval', 'Maker and Checker'];
  for (const cat of categories) {
    const catEl = ess.locator(`text="${cat}"`).first();
    if (await catEl.isVisible().catch(() => false)) {
      console.log(`\n>>> Clicking request category: "${cat}"...`);
      await catEl.click();
      await ess.waitForTimeout(2000);
      const pageText = await ess.evaluate(() => document.body.innerText);
      // Find the relevant section text
      console.log(`>>> [Request > ${cat}] Content preview:`, pageText.substring(0, 500));
      const safeCat = cat.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 25);
      await ess.screenshot({ path: `screenshots/deep-request-cat-${safeCat}.png`, fullPage: true });
    }
  }
});
