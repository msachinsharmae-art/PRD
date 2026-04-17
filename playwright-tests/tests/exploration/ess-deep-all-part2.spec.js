// @ts-check
// Deep ESS exploration Part 2: Finance, Task, Org, Timesheet, Rewards, Recruit, Learn, Performance
const { test } = require('@playwright/test');
const { loginToESS, capturePageInteractions } = require('./ess-deep-utils');

test('Deep explore ESS Part 2', async ({ page, context }) => {
  test.setTimeout(600000); // 10 min

  const ess = await loginToESS(page, context);
  console.log('>>> ESS loaded:', ess.url());

  // ═══════════════════════════════════════════════════════════
  // FINANCE - ALL SUB-TABS
  // ═══════════════════════════════════════════════════════════
  console.log('\n' + '█'.repeat(60) + '\n█ FINANCE\n' + '█'.repeat(60));

  const financePages = [
    { name: 'My Expense', url: 'https://www.zimyo.net/ess/finance-bundle/expense/my-expense' },
    { name: 'AP Access', url: 'https://www.zimyo.net/ess/finance-bundle/expense/ap-access' },
    { name: 'AP Report', url: 'https://www.zimyo.net/ess/finance-bundle/expense/ap-report' },
  ];

  for (const pg of financePages) {
    console.log(`\n>>> === Finance > ${pg.name} ===`);
    await ess.goto(pg.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await ess.waitForLoadState('networkidle').catch(() => {});
    await ess.waitForTimeout(2500);
    await capturePageInteractions(ess, `Finance > ${pg.name}`);
    const safeName = pg.name.replace(/[^a-zA-Z0-9]/g, '_');
    await ess.screenshot({ path: `screenshots/deep-fin-${safeName}.png`, fullPage: true });
  }

  // Expense > Raise New Request form
  await ess.goto('https://www.zimyo.net/ess/finance-bundle/expense/my-expense', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(2000);
  const raiseExpense = ess.locator('button:has-text("Raise New Request"), text=Raise New Request').first();
  if (await raiseExpense.isVisible().catch(() => false)) {
    await raiseExpense.click();
    await ess.waitForTimeout(2500);
    await capturePageInteractions(ess, 'Finance > New Expense Form');
    await ess.screenshot({ path: 'screenshots/deep-fin-new-expense-form.png', fullPage: true });
    const formText = await ess.evaluate(() => {
      const el = document.querySelector('[role="dialog"], .MuiDrawer-root, .MuiDialog-root, [class*="modal"], [class*="Modal"]');
      return el ? el.innerText : 'No modal';
    });
    console.log('>>> Expense form:', formText.substring(0, 1500));
    await ess.keyboard.press('Escape');
    await ess.waitForTimeout(500);
  }

  // Travel Desk
  console.log('\n>>> === Finance > Travel Desk ===');
  await ess.goto('https://www.zimyo.net/ess/finance-bundle/travel-desk', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(2500);
  await capturePageInteractions(ess, 'Finance > Travel Desk');
  await ess.screenshot({ path: 'screenshots/deep-fin-travel-desk.png', fullPage: true });

  // Travel Desk sub-tabs
  const travelTabs = await ess.evaluate(() => {
    const tabs = [];
    document.querySelectorAll('a').forEach(a => {
      const rect = a.getBoundingClientRect();
      if (a.href.includes('travel') && rect.y > 40 && rect.y < 110 && a.innerText?.trim()) {
        tabs.push({ text: a.innerText.trim(), href: a.href });
      }
    });
    return tabs;
  });
  for (const tab of travelTabs) {
    console.log(`>>> Finance > Travel Desk > ${tab.text}`);
    await ess.goto(tab.href, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await ess.waitForLoadState('networkidle').catch(() => {});
    await ess.waitForTimeout(2000);
    await capturePageInteractions(ess, `Finance > Travel > ${tab.text}`);
    const safe = tab.text.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
    await ess.screenshot({ path: `screenshots/deep-fin-travel-${safe}.png`, fullPage: true });
  }

  // Petty Cash
  console.log('\n>>> === Finance > Petty Cash ===');
  await ess.goto('https://www.zimyo.net/ess/finance-bundle/petty-cash', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(2500);
  await capturePageInteractions(ess, 'Finance > Petty Cash');
  await ess.screenshot({ path: 'screenshots/deep-fin-petty-cash.png', fullPage: true });

  // Vendor
  console.log('\n>>> === Finance > Vendor ===');
  await ess.goto('https://www.zimyo.net/ess/finance-bundle/vendor', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(2500);
  await capturePageInteractions(ess, 'Finance > Vendor');
  await ess.screenshot({ path: 'screenshots/deep-fin-vendor.png', fullPage: true });

  // ═══════════════════════════════════════════════════════════
  // TASK - DEEP DIVE
  // ═══════════════════════════════════════════════════════════
  console.log('\n' + '█'.repeat(60) + '\n█ TASK\n' + '█'.repeat(60));

  // Dashboard
  console.log('\n>>> === Task > Dashboard ===');
  await ess.goto('https://www.zimyo.net/ess/task/dashboard', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(3000);
  await capturePageInteractions(ess, 'Task > Dashboard');
  await ess.screenshot({ path: 'screenshots/deep-task-dashboard.png', fullPage: true });
  await ess.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await ess.waitForTimeout(1000);
  await ess.screenshot({ path: 'screenshots/deep-task-dashboard-bottom.png', fullPage: true });

  // List
  console.log('\n>>> === Task > List ===');
  await ess.goto('https://www.zimyo.net/ess/task/list', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(3000);
  await capturePageInteractions(ess, 'Task > List');
  await ess.screenshot({ path: 'screenshots/deep-task-list.png', fullPage: true });

  // Click Add/Create task button
  const addTaskBtn = ess.locator('button:has-text("Add New"), button:has-text("+ Add"), button:has-text("Create Task"), button:has-text("Add Task")').first();
  if (await addTaskBtn.isVisible().catch(() => false)) {
    console.log('>>> Clicking Add Task...');
    await addTaskBtn.click();
    await ess.waitForTimeout(2500);
    await capturePageInteractions(ess, 'Task > Add Task Form');
    await ess.screenshot({ path: 'screenshots/deep-task-add-form.png', fullPage: true });
    const formText = await ess.evaluate(() => {
      const el = document.querySelector('[role="dialog"], .MuiDrawer-root, .MuiDialog-root, [class*="modal"], [class*="Modal"]');
      return el ? el.innerText : document.body.innerText.substring(0, 2000);
    });
    console.log('>>> Task form:', formText.substring(0, 1500));
    await ess.keyboard.press('Escape');
    await ess.waitForTimeout(500);
  }

  // Task filters / tabs within list
  const taskListInnerTabs = await ess.evaluate(() => {
    const tabs = [];
    document.querySelectorAll('[role="tab"], [class*="MuiTab"]').forEach(el => {
      tabs.push(el.innerText?.trim());
    });
    return tabs.filter(Boolean);
  });
  console.log('>>> Task list inner tabs:', taskListInnerTabs);

  for (const tabName of taskListInnerTabs.slice(0, 6)) {
    const tab = ess.locator(`[role="tab"]:has-text("${tabName}")`).first();
    if (await tab.isVisible().catch(() => false)) {
      await tab.click();
      await ess.waitForTimeout(2000);
      console.log(`>>> Task > List > ${tabName}: loaded`);
      await capturePageInteractions(ess, `Task > List > ${tabName}`);
      const safe = tabName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
      await ess.screenshot({ path: `screenshots/deep-task-list-${safe}.png`, fullPage: true });
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ORG - ALL TABS
  // ═══════════════════════════════════════════════════════════
  console.log('\n' + '█'.repeat(60) + '\n█ ORG\n' + '█'.repeat(60));

  const orgPages = [
    { name: 'Dashboard', url: 'https://www.zimyo.net/ess/hr/dashboard' },
    { name: 'Directory', url: 'https://www.zimyo.net/ess/hr/directory' },
    { name: 'Policy', url: 'https://www.zimyo.net/ess/hr/policy' },
    { name: 'Knowledge Base', url: 'https://www.zimyo.net/ess/hr/knowledge-base' },
    { name: 'Helpdesk', url: 'https://www.zimyo.net/ess/hr/helpdesk' },
    { name: 'Reports', url: 'https://www.zimyo.net/ess/hr/reports' },
  ];

  for (const pg of orgPages) {
    console.log(`\n>>> === Org > ${pg.name} ===`);
    await ess.goto(pg.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await ess.waitForLoadState('networkidle').catch(() => {});
    await ess.waitForTimeout(2500);
    await capturePageInteractions(ess, `Org > ${pg.name}`);
    const safeName = pg.name.replace(/[^a-zA-Z0-9]/g, '_');
    await ess.screenshot({ path: `screenshots/deep-org-${safeName}.png`, fullPage: true });

    // For Dashboard, explore Direct/Indirect/Department tabs
    if (pg.name === 'Dashboard') {
      for (const tabText of ['Indirect Reporting', 'Department']) {
        const tab = ess.locator(`text="${tabText}"`).first();
        if (await tab.isVisible().catch(() => false)) {
          await tab.click();
          await ess.waitForTimeout(2000);
          await capturePageInteractions(ess, `Org > Dashboard > ${tabText}`);
          const safe = tabText.replace(/[^a-zA-Z0-9]/g, '_');
          await ess.screenshot({ path: `screenshots/deep-org-dashboard-${safe}.png`, fullPage: true });
        }
      }
      await ess.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await ess.waitForTimeout(1000);
      await ess.screenshot({ path: 'screenshots/deep-org-dashboard-bottom.png', fullPage: true });
    }

    // For Helpdesk, try Raise Ticket
    if (pg.name === 'Helpdesk') {
      const raiseBtn = ess.locator('button:has-text("Raise"), button:has-text("New"), button:has-text("Create")').first();
      if (await raiseBtn.isVisible().catch(() => false)) {
        await raiseBtn.click();
        await ess.waitForTimeout(2500);
        await capturePageInteractions(ess, 'Org > Helpdesk > New Ticket');
        await ess.screenshot({ path: 'screenshots/deep-org-helpdesk-ticket.png', fullPage: true });
        const formText = await ess.evaluate(() => {
          const el = document.querySelector('[role="dialog"], .MuiDrawer-root, [class*="modal"]');
          return el ? el.innerText : 'No modal';
        });
        console.log('>>> Helpdesk ticket form:', formText.substring(0, 1000));
        await ess.keyboard.press('Escape');
        await ess.waitForTimeout(500);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // TIMESHEET - ALL TABS
  // ═══════════════════════════════════════════════════════════
  console.log('\n' + '█'.repeat(60) + '\n█ TIMESHEET\n' + '█'.repeat(60));

  const timesheetPages = [
    { name: 'Dashboard', url: 'https://www.zimyo.net/ess/timesheet/dashboard' },
    { name: 'Tasks', url: 'https://www.zimyo.net/ess/timesheet/tasks' },
    { name: 'Projects', url: 'https://www.zimyo.net/ess/timesheet/projects' },
    { name: 'Approvals', url: 'https://www.zimyo.net/ess/timesheet/approvals' },
    { name: 'Timelog', url: 'https://www.zimyo.net/ess/timesheet/timelog' },
    { name: 'Reports', url: 'https://www.zimyo.net/ess/timesheet/reports' },
  ];

  for (const pg of timesheetPages) {
    console.log(`\n>>> === Timesheet > ${pg.name} ===`);
    await ess.goto(pg.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await ess.waitForLoadState('networkidle').catch(() => {});
    await ess.waitForTimeout(2500);
    await capturePageInteractions(ess, `Timesheet > ${pg.name}`);
    const safeName = pg.name.replace(/[^a-zA-Z0-9]/g, '_');
    await ess.screenshot({ path: `screenshots/deep-ts-${safeName}.png`, fullPage: true });

    // For Dashboard - check All Team toggle
    if (pg.name === 'Dashboard') {
      const allTeam = ess.locator('text=All Team').first();
      if (await allTeam.isVisible().catch(() => false)) {
        await allTeam.click();
        await ess.waitForTimeout(2000);
        await capturePageInteractions(ess, 'Timesheet > Dashboard > All Team');
        await ess.screenshot({ path: 'screenshots/deep-ts-dashboard-all-team.png', fullPage: true });
      }
      await ess.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await ess.waitForTimeout(1000);
      await ess.screenshot({ path: 'screenshots/deep-ts-dashboard-bottom.png', fullPage: true });
    }

    // For Tasks - look for add
    if (pg.name === 'Tasks') {
      const addBtn = ess.locator('button:has-text("Add"), button:has-text("Create"), button:has-text("New")').first();
      if (await addBtn.isVisible().catch(() => false)) {
        await addBtn.click();
        await ess.waitForTimeout(2500);
        await capturePageInteractions(ess, 'Timesheet > Add Task Form');
        await ess.screenshot({ path: 'screenshots/deep-ts-add-task.png', fullPage: true });
        const formText = await ess.evaluate(() => {
          const el = document.querySelector('[role="dialog"], .MuiDrawer-root, [class*="modal"]');
          return el ? el.innerText : 'No modal';
        });
        console.log('>>> Timesheet task form:', formText.substring(0, 1000));
        await ess.keyboard.press('Escape');
        await ess.waitForTimeout(500);
      }
    }

    // For Timelog - look for log time
    if (pg.name === 'Timelog') {
      const logBtn = ess.locator('button:has-text("Log"), button:has-text("Add"), button:has-text("New")').first();
      if (await logBtn.isVisible().catch(() => false)) {
        await logBtn.click();
        await ess.waitForTimeout(2500);
        await capturePageInteractions(ess, 'Timesheet > Log Time Form');
        await ess.screenshot({ path: 'screenshots/deep-ts-log-time.png', fullPage: true });
        const formText = await ess.evaluate(() => {
          const el = document.querySelector('[role="dialog"], .MuiDrawer-root, [class*="modal"]');
          return el ? el.innerText : 'No modal';
        });
        console.log('>>> Timelog form:', formText.substring(0, 1000));
        await ess.keyboard.press('Escape');
        await ess.waitForTimeout(500);
      }
    }

    // For Projects - click on a project
    if (pg.name === 'Projects') {
      const projectLink = ess.locator('table tbody tr a, table tbody tr td').first();
      if (await projectLink.isVisible().catch(() => false)) {
        await projectLink.click();
        await ess.waitForTimeout(2500);
        console.log('>>> Project detail URL:', ess.url());
        await capturePageInteractions(ess, 'Timesheet > Project Detail');
        await ess.screenshot({ path: 'screenshots/deep-ts-project-detail.png', fullPage: true });
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // REWARDS & RECOGNITION
  // ═══════════════════════════════════════════════════════════
  console.log('\n' + '█'.repeat(60) + '\n█ REWARDS & RECOGNITION\n' + '█'.repeat(60));

  // Home
  console.log('\n>>> === R&R > Home ===');
  await ess.goto('https://www.zimyo.net/ess/rewards/home', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(3000);
  await capturePageInteractions(ess, 'Rewards > Home');
  await ess.screenshot({ path: 'screenshots/deep-rewards-home.png', fullPage: true });

  // Recognize button
  const recognizeBtn = ess.locator('button:has-text("Recognize")').first();
  if (await recognizeBtn.isVisible().catch(() => false)) {
    await recognizeBtn.click();
    await ess.waitForTimeout(2500);
    await capturePageInteractions(ess, 'Rewards > Recognize Form');
    await ess.screenshot({ path: 'screenshots/deep-rewards-recognize.png', fullPage: true });
    const formText = await ess.evaluate(() => {
      const el = document.querySelector('[role="dialog"], .MuiDrawer-root, [class*="modal"]');
      return el ? el.innerText : 'No modal';
    });
    console.log('>>> Recognize form:', formText.substring(0, 1000));
    await ess.keyboard.press('Escape');
    await ess.waitForTimeout(500);
  }

  // My Recognitions
  console.log('\n>>> === R&R > My Recognitions ===');
  await ess.goto('https://www.zimyo.net/ess/rewards/my-recognitions', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(2500);
  await capturePageInteractions(ess, 'Rewards > My Recognitions');
  await ess.screenshot({ path: 'screenshots/deep-rewards-recognitions.png', fullPage: true });

  // Wallet
  console.log('\n>>> === R&R > Wallet ===');
  await ess.goto('https://www.zimyo.net/ess/rewards/wallet', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(2500);
  await capturePageInteractions(ess, 'Rewards > Wallet');
  await ess.screenshot({ path: 'screenshots/deep-rewards-wallet.png', fullPage: true });

  // ═══════════════════════════════════════════════════════════
  // RECRUIT
  // ═══════════════════════════════════════════════════════════
  console.log('\n' + '█'.repeat(60) + '\n█ RECRUIT\n' + '█'.repeat(60));

  // My Requisition
  console.log('\n>>> === Recruit > My Requisition ===');
  await ess.goto('https://www.zimyo.net/ess/recruit/requisition/my-requisition', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(2500);
  await capturePageInteractions(ess, 'Recruit > My Requisition');
  await ess.screenshot({ path: 'screenshots/deep-recruit-my-req.png', fullPage: true });

  // Create New requisition form
  const createReq = ess.locator('button:has-text("Create New"), button:has-text("Create")').first();
  if (await createReq.isVisible().catch(() => false)) {
    await createReq.click();
    await ess.waitForTimeout(2500);
    await capturePageInteractions(ess, 'Recruit > New Requisition Form');
    await ess.screenshot({ path: 'screenshots/deep-recruit-new-req.png', fullPage: true });
    const formText = await ess.evaluate(() => {
      const el = document.querySelector('[role="dialog"], .MuiDrawer-root, [class*="modal"]');
      return el ? el.innerText : document.body.innerText.substring(0, 1500);
    });
    console.log('>>> Requisition form:', formText.substring(0, 1500));
    await ess.keyboard.press('Escape');
    await ess.waitForTimeout(500);
  }

  // Team Requisition
  console.log('\n>>> === Recruit > Team Requisition ===');
  await ess.goto('https://www.zimyo.net/ess/recruit/requisition/emp-requisition', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(2500);
  await capturePageInteractions(ess, 'Recruit > Team Requisition');
  await ess.screenshot({ path: 'screenshots/deep-recruit-team-req.png', fullPage: true });

  // Interviews
  console.log('\n>>> === Recruit > Interviews ===');
  await ess.goto('https://www.zimyo.net/ess/recruit/interviews', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(2500);
  await capturePageInteractions(ess, 'Recruit > Interviews');
  await ess.screenshot({ path: 'screenshots/deep-recruit-interviews.png', fullPage: true });

  // ═══════════════════════════════════════════════════════════
  // LEARN
  // ═══════════════════════════════════════════════════════════
  console.log('\n' + '█'.repeat(60) + '\n█ LEARN\n' + '█'.repeat(60));
  await ess.goto('https://www.zimyo.net/ess/learn', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(3000);
  console.log('>>> Learn redirected to:', ess.url());
  await capturePageInteractions(ess, 'Learn');
  await ess.screenshot({ path: 'screenshots/deep-learn.png', fullPage: true });

  // Get any sub-links
  const learnHeaderTabs = await ess.evaluate(() => {
    const tabs = [];
    document.querySelectorAll('a').forEach(a => {
      const rect = a.getBoundingClientRect();
      if (a.href.includes('/ess/learn') && rect.y > 40 && rect.y < 110 && a.innerText?.trim()) {
        tabs.push({ text: a.innerText.trim(), href: a.href });
      }
    });
    return tabs;
  });
  console.log('>>> Learn tabs:', JSON.stringify(learnHeaderTabs, null, 2));
  for (const tab of learnHeaderTabs) {
    console.log(`\n>>> Learn > ${tab.text}`);
    await ess.goto(tab.href, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await ess.waitForLoadState('networkidle').catch(() => {});
    await ess.waitForTimeout(2000);
    await capturePageInteractions(ess, `Learn > ${tab.text}`);
    const safe = tab.text.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
    await ess.screenshot({ path: `screenshots/deep-learn-${safe}.png`, fullPage: true });
  }

  // ═══════════════════════════════════════════════════════════
  // PERFORMANCE
  // ═══════════════════════════════════════════════════════════
  console.log('\n' + '█'.repeat(60) + '\n█ PERFORMANCE\n' + '█'.repeat(60));
  await ess.goto('https://www.zimyo.net/ess/performance', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(3000);
  console.log('>>> Performance redirected to:', ess.url());
  await capturePageInteractions(ess, 'Performance');
  await ess.screenshot({ path: 'screenshots/deep-perf.png', fullPage: true });

  // Get any sub-links
  const perfHeaderTabs = await ess.evaluate(() => {
    const tabs = [];
    document.querySelectorAll('a').forEach(a => {
      const rect = a.getBoundingClientRect();
      if (a.href.includes('/ess/performance') && rect.y > 40 && rect.y < 110 && a.innerText?.trim()) {
        tabs.push({ text: a.innerText.trim(), href: a.href });
      }
    });
    return tabs;
  });
  console.log('>>> Performance tabs:', JSON.stringify(perfHeaderTabs, null, 2));
  for (const tab of perfHeaderTabs) {
    console.log(`\n>>> Performance > ${tab.text}`);
    await ess.goto(tab.href, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await ess.waitForLoadState('networkidle').catch(() => {});
    await ess.waitForTimeout(2000);
    await capturePageInteractions(ess, `Performance > ${tab.text}`);
    const safe = tab.text.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
    await ess.screenshot({ path: `screenshots/deep-perf-${safe}.png`, fullPage: true });
  }

  // Also try navigating via sidebar in Performance
  const perfSideLinks = await ess.evaluate(() => {
    const links = [];
    document.querySelectorAll('a[href*="/ess/performance"]').forEach(a => {
      const text = a.innerText?.trim();
      if (text && !links.find(l => l.href === a.href)) {
        links.push({ text, href: a.href });
      }
    });
    return links;
  });
  console.log('>>> Performance all links:', JSON.stringify(perfSideLinks, null, 2));
  for (const link of perfSideLinks) {
    try {
      console.log(`\n>>> Performance > ${link.text}`);
      await ess.goto(link.href, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await ess.waitForLoadState('networkidle').catch(() => {});
      await ess.waitForTimeout(2000);
      await capturePageInteractions(ess, `Performance > ${link.text}`);
      const safe = link.text.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
      await ess.screenshot({ path: `screenshots/deep-perf-link-${safe}.png`, fullPage: true });
    } catch (e) {
      console.log(`>>> Error: ${e.message.substring(0, 100)}`);
    }
  }
});
