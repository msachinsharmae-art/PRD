// @ts-check
// Deep ESS exploration Part 1: Dashboard, Engage, Request, Attendance, Pay
const { test } = require('@playwright/test');
const { loginToESS, capturePageInteractions } = require('./ess-deep-utils');

test('Deep explore ESS Part 1', async ({ page, context }) => {
  test.setTimeout(600000); // 10 min

  const ess = await loginToESS(page, context);
  console.log('>>> ESS loaded:', ess.url());

  // ═══════════════════════════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════════════════════════
  console.log('\n' + '█'.repeat(60) + '\n█ DASHBOARD\n' + '█'.repeat(60));
  await ess.goto('https://www.zimyo.net/ess/dashboard/my-dashboard', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(3000);
  await capturePageInteractions(ess, 'Dashboard');
  await ess.screenshot({ path: 'screenshots/deep-dashboard.png', fullPage: true });

  // Apply New dropdown
  const applyNew = ess.locator('button:has-text("Apply New"), a:has-text("Apply New")').first();
  if (await applyNew.isVisible().catch(() => false)) {
    await applyNew.click();
    await ess.waitForTimeout(2000);
    const dropdownItems = await ess.evaluate(() => {
      const items = [];
      document.querySelectorAll('[role="menu"] li, [role="menuitem"], [class*="dropdown-menu"] li, [class*="popover"] li, .MuiMenu-list li, .MuiMenuItem-root, [class*="Popover"] li, [class*="menu-item"], [class*="MenuItem"]').forEach(el => {
        const text = el.innerText?.trim();
        if (text && text.length < 80) items.push(text);
      });
      // Also get any visible popup text
      document.querySelectorAll('[role="dialog"], .MuiPopover-paper, .MuiDrawer-paper').forEach(el => {
        const text = el.innerText?.trim();
        if (text) items.push('POPUP: ' + text.substring(0, 200));
      });
      return items;
    });
    console.log('>>> Apply New options:', JSON.stringify(dropdownItems, null, 2));
    await ess.screenshot({ path: 'screenshots/deep-dashboard-apply-new.png' });
    await ess.keyboard.press('Escape');
    await ess.waitForTimeout(500);
  }

  // Scroll full page
  await ess.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await ess.waitForTimeout(1000);
  await capturePageInteractions(ess, 'Dashboard (bottom)');
  await ess.screenshot({ path: 'screenshots/deep-dashboard-bottom.png', fullPage: true });

  // ═══════════════════════════════════════════════════════════
  // ENGAGE
  // ═══════════════════════════════════════════════════════════
  console.log('\n' + '█'.repeat(60) + '\n█ ENGAGE\n' + '█'.repeat(60));
  await ess.goto('https://www.zimyo.net/ess/engage', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(3000);
  await capturePageInteractions(ess, 'Engage');
  await ess.screenshot({ path: 'screenshots/deep-engage.png', fullPage: true });

  // Check Feed / Groups / Direct Messages sections
  const engageSections = await ess.evaluate(() => {
    const sections = [];
    document.querySelectorAll('[class*="tab"], [role="tab"], a, button').forEach(el => {
      const text = el.innerText?.trim();
      const rect = el.getBoundingClientRect();
      if (text && (text === 'Feed' || text === 'Groups' || text === 'Direct Messages' || text.includes('Make Yourself')) && rect.width > 0) {
        sections.push({ text, y: Math.round(rect.y) });
      }
    });
    return sections;
  });
  console.log('>>> Engage sections:', JSON.stringify(engageSections));

  // ═══════════════════════════════════════════════════════════
  // REQUEST - DEEP DIVE
  // ═══════════════════════════════════════════════════════════
  console.log('\n' + '█'.repeat(60) + '\n█ REQUEST\n' + '█'.repeat(60));
  await ess.goto('https://www.zimyo.net/ess/request/my-requests', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(3000);
  await capturePageInteractions(ess, 'Request - Self');
  await ess.screenshot({ path: 'screenshots/deep-request-self.png', fullPage: true });

  // Click each request category on the left side
  const requestCategories = [
    'Leave & Attendance', 'Document', 'Onboarding', 'Offboarding', 'Asset',
    'Requisition', 'Expense', 'Vendor', 'Petty Cash', 'Travel Desk',
    'Loan and Advance', 'Task Mangement', 'Checklist',
    'Internal Job Posting Approval', 'Maker and Checker',
    'Probation Confirmation', 'Probation Feedback', 'Probation Feedback Survey',
    'Transfer', 'Performance Improvement Plan', 'Rejoining Confirmation'
  ];
  for (const cat of requestCategories) {
    const catEl = ess.locator(`text="${cat}"`).first();
    if (await catEl.isVisible().catch(() => false)) {
      await catEl.click();
      await ess.waitForTimeout(1500);
      const hasData = await ess.evaluate(() => {
        const text = document.body.innerText;
        return !text.includes('No Requests Found');
      });
      console.log(`>>> Request > Self > ${cat}: ${hasData ? 'HAS DATA' : 'No Requests Found'}`);
    }
  }

  // Switch to Team tab
  console.log('\n>>> Request > Team tab');
  const teamTab = ess.locator('[class*="tab"]:has-text("Team"), a:has-text("Team"), button:has-text("Team")').first();
  if (await teamTab.isVisible().catch(() => false)) {
    await teamTab.click();
    await ess.waitForTimeout(2500);
    await capturePageInteractions(ess, 'Request - Team');
    await ess.screenshot({ path: 'screenshots/deep-request-team.png', fullPage: true });

    // Check team request categories
    for (const cat of requestCategories.slice(0, 10)) {
      const catEl = ess.locator(`text="${cat}"`).first();
      if (await catEl.isVisible().catch(() => false)) {
        await catEl.click();
        await ess.waitForTimeout(1500);
        const text = await ess.evaluate(() => document.body.innerText.substring(0, 300));
        console.log(`>>> Request > Team > ${cat}: ${text.includes('No') ? 'No data' : 'Has data'}`);
      }
    }
  }

  // Switch to Employee tab
  console.log('\n>>> Request > Employee tab');
  const empTab = ess.locator('[class*="tab"]:has-text("Employee"), a:has-text("Employee"), button:has-text("Employee")').first();
  if (await empTab.isVisible().catch(() => false)) {
    await empTab.click();
    await ess.waitForTimeout(2500);
    await capturePageInteractions(ess, 'Request - Employee');
    await ess.screenshot({ path: 'screenshots/deep-request-employee.png', fullPage: true });
  }

  // Click "Apply New" in request
  console.log('\n>>> Request > Apply New');
  await ess.goto('https://www.zimyo.net/ess/request/my-requests', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(2000);
  const reqApplyNew = ess.locator('button:has-text("Apply New"), a:has-text("Apply New")').first();
  if (await reqApplyNew.isVisible().catch(() => false)) {
    await reqApplyNew.click();
    await ess.waitForTimeout(2500);
    await capturePageInteractions(ess, 'Request > Apply New Form');
    await ess.screenshot({ path: 'screenshots/deep-request-apply-new.png', fullPage: true });
    // Capture form content
    const formContent = await ess.evaluate(() => {
      const modals = document.querySelectorAll('[role="dialog"], .MuiDialog-root, .MuiDrawer-root, [class*="modal"], [class*="Modal"], [class*="drawer"], [class*="Drawer"]');
      let text = '';
      modals.forEach(m => text += m.innerText + '\n');
      return text || 'No modal found - checking full page';
    });
    console.log('>>> Apply New form content:', formContent.substring(0, 2000));
    await ess.keyboard.press('Escape');
    await ess.waitForTimeout(500);
  }

  // ═══════════════════════════════════════════════════════════
  // ATTENDANCE - DEEP DIVE
  // ═══════════════════════════════════════════════════════════
  console.log('\n' + '█'.repeat(60) + '\n█ ATTENDANCE\n' + '█'.repeat(60));

  // My Attendance
  console.log('\n>>> === Attendance > My Attendance ===');
  await ess.goto('https://www.zimyo.net/ess/leave-and-attendance/my-attendance', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(3000);
  await capturePageInteractions(ess, 'Attendance > My Attendance');
  await ess.screenshot({ path: 'screenshots/deep-att-my-attendance.png', fullPage: true });

  // Click on a date cell to see what actions are available
  const dateCell = ess.locator('td, [class*="calendar-cell"], [class*="day-cell"]').nth(5);
  if (await dateCell.isVisible().catch(() => false)) {
    await dateCell.click();
    await ess.waitForTimeout(2000);
    const popup = await ess.evaluate(() => {
      const modals = document.querySelectorAll('[role="dialog"], [class*="modal"], [class*="Modal"], [class*="popover"], [class*="Popover"], [class*="tooltip"], [class*="Tooltip"]');
      let text = '';
      modals.forEach(m => text += m.innerText + '\n');
      return text;
    });
    if (popup) console.log('>>> Date cell popup:', popup.substring(0, 500));
    await ess.screenshot({ path: 'screenshots/deep-att-date-click.png' });
    await ess.keyboard.press('Escape');
    await ess.waitForTimeout(500);
  }

  // My Leave
  console.log('\n>>> === Attendance > My Leave ===');
  await ess.goto('https://www.zimyo.net/ess/leave-and-attendance/my-leave', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(3000);
  await capturePageInteractions(ess, 'Attendance > My Leave');
  await ess.screenshot({ path: 'screenshots/deep-att-my-leave.png', fullPage: true });
  await ess.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await ess.waitForTimeout(1000);
  await ess.screenshot({ path: 'screenshots/deep-att-my-leave-bottom.png', fullPage: true });

  // Apply Leave
  const applyLeave = ess.locator('button:has-text("Apply"), a:has-text("Apply Leave"), button:has-text("Apply Leave")').first();
  if (await applyLeave.isVisible().catch(() => false)) {
    console.log('>>> Clicking Apply Leave...');
    await applyLeave.click();
    await ess.waitForTimeout(2500);
    await capturePageInteractions(ess, 'Attendance > Apply Leave Form');
    await ess.screenshot({ path: 'screenshots/deep-att-apply-leave.png', fullPage: true });
    const leaveForm = await ess.evaluate(() => {
      const modals = document.querySelectorAll('[role="dialog"], .MuiDialog-root, .MuiDrawer-root, [class*="modal"], [class*="Modal"]');
      let text = '';
      modals.forEach(m => text += m.innerText + '\n');
      return text;
    });
    console.log('>>> Leave form fields:', leaveForm.substring(0, 1500));
    await ess.keyboard.press('Escape');
    await ess.waitForTimeout(500);
  }

  // Team Attendance
  console.log('\n>>> === Attendance > Team Attendance ===');
  await ess.goto('https://www.zimyo.net/ess/leave-and-attendance/team-attendance', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(3000);
  await capturePageInteractions(ess, 'Attendance > Team Attendance');
  await ess.screenshot({ path: 'screenshots/deep-att-team-attendance.png', fullPage: true });

  // Team Roster
  console.log('\n>>> === Attendance > Team Roster ===');
  await ess.goto('https://www.zimyo.net/ess/leave-and-attendance/team-roster', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(3000);
  await capturePageInteractions(ess, 'Attendance > Team Roster');
  await ess.screenshot({ path: 'screenshots/deep-att-team-roster.png', fullPage: true });

  // Attendance Snapshot
  console.log('\n>>> === Attendance > Attendance Snapshot ===');
  await ess.goto('https://www.zimyo.net/ess/leave-and-attendance/attendance-snapshot', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(3000);
  await capturePageInteractions(ess, 'Attendance > Attendance Snapshot');
  await ess.screenshot({ path: 'screenshots/deep-att-snapshot.png', fullPage: true });

  // ═══════════════════════════════════════════════════════════
  // PAY - DEEP DIVE
  // ═══════════════════════════════════════════════════════════
  console.log('\n' + '█'.repeat(60) + '\n█ PAY\n' + '█'.repeat(60));
  await ess.goto('https://www.zimyo.net/ess/pay', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(3000);
  console.log('>>> Pay redirected to:', ess.url());
  await capturePageInteractions(ess, 'Pay');
  await ess.screenshot({ path: 'screenshots/deep-pay-main.png', fullPage: true });

  // Get all Pay top navigation tabs
  const payHeaderTabs = await ess.evaluate(() => {
    const tabs = [];
    document.querySelectorAll('a').forEach(a => {
      const rect = a.getBoundingClientRect();
      const text = a.innerText?.trim();
      if (text && rect.y > 40 && rect.y < 110 && text.length < 50 && a.href.includes('/ess/')) {
        tabs.push({ text, href: a.href });
      }
    });
    return tabs;
  });
  console.log('>>> Pay header tabs:', JSON.stringify(payHeaderTabs, null, 2));

  // Click each Pay sub-tab
  for (const tab of payHeaderTabs) {
    try {
      console.log(`\n>>> === Pay > ${tab.text} ===`);
      await ess.goto(tab.href, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await ess.waitForLoadState('networkidle').catch(() => {});
      await ess.waitForTimeout(2500);
      await capturePageInteractions(ess, `Pay > ${tab.text}`);
      const safeName = tab.text.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 25);
      await ess.screenshot({ path: `screenshots/deep-pay-${safeName}.png`, fullPage: true });

      // Scroll to see full content
      await ess.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await ess.waitForTimeout(1000);
      await ess.screenshot({ path: `screenshots/deep-pay-${safeName}-bottom.png`, fullPage: true });
    } catch (e) {
      console.log(`>>> Error: ${e.message.substring(0, 100)}`);
    }
  }
});
