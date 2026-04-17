// @ts-check
// Deep exploration: Task, Org, Timesheet
const { test } = require('@playwright/test');
const { loginToESS, capturePageInteractions } = require('./ess-deep-utils');

test('Deep explore: Task', async ({ page, context }) => {
  test.setTimeout(180000);
  const ess = await loginToESS(page, context);

  console.log('\n' + '█'.repeat(60));
  console.log('█ TASK');
  console.log('█'.repeat(60));

  // --- Task Dashboard ---
  console.log('\n>>> === Task > Dashboard ===');
  await ess.goto('https://www.zimyo.net/ess/task/dashboard', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(3000);
  await capturePageInteractions(ess, 'Task > Dashboard');
  await ess.screenshot({ path: 'screenshots/deep-task-dashboard.png', fullPage: true });
  await ess.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await ess.waitForTimeout(1000);
  await ess.screenshot({ path: 'screenshots/deep-task-dashboard-scroll.png', fullPage: true });

  // --- Task List ---
  console.log('\n>>> === Task > List ===');
  await ess.goto('https://www.zimyo.net/ess/task/list', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(3000);
  await capturePageInteractions(ess, 'Task > List');
  await ess.screenshot({ path: 'screenshots/deep-task-list.png', fullPage: true });

  // Check for "Add Task" / "Create Task" button
  const addTask = ess.locator('button:has-text("Add"), button:has-text("Create"), button:has-text("New Task"), button:has-text("+ Add")').first();
  if (await addTask.isVisible().catch(() => false)) {
    console.log('>>> Clicking "Add Task" button...');
    await addTask.click();
    await ess.waitForTimeout(2500);
    await capturePageInteractions(ess, 'Task > Add Task Form');
    await ess.screenshot({ path: 'screenshots/deep-task-add-form.png', fullPage: true });
    await ess.keyboard.press('Escape');
    await ess.waitForTimeout(500);
  }

  // Check for filters
  const filterButtons = await ess.evaluate(() => {
    const btns = [];
    document.querySelectorAll('button, [role="button"]').forEach(el => {
      const text = el.innerText?.trim();
      if (text && (text.toLowerCase().includes('filter') || text.toLowerCase().includes('status') || text.toLowerCase().includes('priority') || text.toLowerCase().includes('assigned'))) {
        btns.push(text);
      }
    });
    return btns;
  });
  console.log('>>> Task filter buttons:', filterButtons);

  // Try different task list tabs (My Tasks, Team Tasks, etc.)
  const taskTabs = await ess.evaluate(() => {
    return Array.from(document.querySelectorAll('[role="tab"], [class*="tab"]'))
      .map(el => el.innerText?.trim())
      .filter(t => t && t.length < 40);
  });
  console.log('>>> Task list tabs:', taskTabs);

  for (const tabName of taskTabs.slice(0, 5)) {
    const tab = ess.locator(`[role="tab"]:has-text("${tabName}"), [class*="tab"]:has-text("${tabName}")`).first();
    if (await tab.isVisible().catch(() => false)) {
      console.log(`\n>>> Clicking task tab: "${tabName}"...`);
      await tab.click();
      await ess.waitForTimeout(2000);
      await capturePageInteractions(ess, `Task > List > ${tabName}`);
      const safeName = tabName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
      await ess.screenshot({ path: `screenshots/deep-task-list-${safeName}.png`, fullPage: true });
    }
  }
});

test('Deep explore: Org', async ({ page, context }) => {
  test.setTimeout(180000);
  const ess = await loginToESS(page, context);

  console.log('\n' + '█'.repeat(60));
  console.log('█ ORG');
  console.log('█'.repeat(60));

  // --- Org Dashboard ---
  console.log('\n>>> === Org > Dashboard ===');
  await ess.goto('https://www.zimyo.net/ess/hr/dashboard', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(3000);
  await capturePageInteractions(ess, 'Org > Dashboard');
  await ess.screenshot({ path: 'screenshots/deep-org-dashboard.png', fullPage: true });
  await ess.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await ess.waitForTimeout(1000);
  await ess.screenshot({ path: 'screenshots/deep-org-dashboard-scroll.png', fullPage: true });

  // Check Direct/Indirect/Department tabs
  for (const tabName of ['Direct Reporting', 'Indirect Reporting', 'Department']) {
    const tab = ess.locator(`text="${tabName}"`).first();
    if (await tab.isVisible().catch(() => false)) {
      console.log(`\n>>> Clicking "${tabName}" tab...`);
      await tab.click();
      await ess.waitForTimeout(2000);
      await capturePageInteractions(ess, `Org > Dashboard > ${tabName}`);
      const safeName = tabName.replace(/[^a-zA-Z0-9]/g, '_');
      await ess.screenshot({ path: `screenshots/deep-org-${safeName}.png`, fullPage: true });
    }
  }

  // --- Directory ---
  console.log('\n>>> === Org > Directory ===');
  await ess.goto('https://www.zimyo.net/ess/hr/directory', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(3000);
  await capturePageInteractions(ess, 'Org > Directory');
  await ess.screenshot({ path: 'screenshots/deep-org-directory.png', fullPage: true });

  // --- Policy ---
  console.log('\n>>> === Org > Policy ===');
  await ess.goto('https://www.zimyo.net/ess/hr/policy', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(3000);
  await capturePageInteractions(ess, 'Org > Policy');
  await ess.screenshot({ path: 'screenshots/deep-org-policy.png', fullPage: true });

  // --- Knowledge Base ---
  console.log('\n>>> === Org > Knowledge Base ===');
  await ess.goto('https://www.zimyo.net/ess/hr/knowledge-base', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(3000);
  await capturePageInteractions(ess, 'Org > Knowledge Base');
  await ess.screenshot({ path: 'screenshots/deep-org-knowledge-base.png', fullPage: true });

  // --- Helpdesk ---
  console.log('\n>>> === Org > Helpdesk ===');
  await ess.goto('https://www.zimyo.net/ess/hr/helpdesk', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(3000);
  await capturePageInteractions(ess, 'Org > Helpdesk');
  await ess.screenshot({ path: 'screenshots/deep-org-helpdesk.png', fullPage: true });

  // Check for "Raise Ticket" button
  const raiseTicket = ess.locator('button:has-text("Raise"), button:has-text("New Ticket"), button:has-text("Create Ticket")').first();
  if (await raiseTicket.isVisible().catch(() => false)) {
    console.log('>>> Clicking "Raise Ticket"...');
    await raiseTicket.click();
    await ess.waitForTimeout(2500);
    await capturePageInteractions(ess, 'Org > Helpdesk > New Ticket Form');
    await ess.screenshot({ path: 'screenshots/deep-org-helpdesk-new-ticket.png', fullPage: true });
    await ess.keyboard.press('Escape');
    await ess.waitForTimeout(500);
  }

  // --- Reports ---
  console.log('\n>>> === Org > Reports ===');
  await ess.goto('https://www.zimyo.net/ess/hr/reports', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(3000);
  await capturePageInteractions(ess, 'Org > Reports');
  await ess.screenshot({ path: 'screenshots/deep-org-reports.png', fullPage: true });
});

test('Deep explore: Timesheet', async ({ page, context }) => {
  test.setTimeout(180000);
  const ess = await loginToESS(page, context);

  console.log('\n' + '█'.repeat(60));
  console.log('█ TIMESHEET');
  console.log('█'.repeat(60));

  // --- Timesheet Dashboard ---
  console.log('\n>>> === Timesheet > Dashboard ===');
  await ess.goto('https://www.zimyo.net/ess/timesheet/dashboard', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(3000);
  await capturePageInteractions(ess, 'Timesheet > Dashboard');
  await ess.screenshot({ path: 'screenshots/deep-ts-dashboard.png', fullPage: true });
  await ess.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await ess.waitForTimeout(1000);
  await ess.screenshot({ path: 'screenshots/deep-ts-dashboard-scroll.png', fullPage: true });

  // Check My Dashboard / All Team toggle
  const allTeam = ess.locator('text=All Team').first();
  if (await allTeam.isVisible().catch(() => false)) {
    console.log('>>> Clicking "All Team" toggle...');
    await allTeam.click();
    await ess.waitForTimeout(2000);
    await capturePageInteractions(ess, 'Timesheet > Dashboard > All Team');
    await ess.screenshot({ path: 'screenshots/deep-ts-dashboard-all-team.png', fullPage: true });
  }

  // --- Tasks ---
  console.log('\n>>> === Timesheet > Tasks ===');
  await ess.goto('https://www.zimyo.net/ess/timesheet/tasks', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(3000);
  await capturePageInteractions(ess, 'Timesheet > Tasks');
  await ess.screenshot({ path: 'screenshots/deep-ts-tasks.png', fullPage: true });

  // Check for Add Task
  const addTask = ess.locator('button:has-text("Add"), button:has-text("Create"), button:has-text("New")').first();
  if (await addTask.isVisible().catch(() => false)) {
    console.log('>>> Clicking add task in Timesheet...');
    await addTask.click();
    await ess.waitForTimeout(2500);
    await capturePageInteractions(ess, 'Timesheet > Add Task Form');
    await ess.screenshot({ path: 'screenshots/deep-ts-add-task-form.png', fullPage: true });
    await ess.keyboard.press('Escape');
    await ess.waitForTimeout(500);
  }

  // --- Projects ---
  console.log('\n>>> === Timesheet > Projects ===');
  await ess.goto('https://www.zimyo.net/ess/timesheet/projects', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(3000);
  await capturePageInteractions(ess, 'Timesheet > Projects');
  await ess.screenshot({ path: 'screenshots/deep-ts-projects.png', fullPage: true });

  // Click on a project to see details
  const projectRow = ess.locator('table tr, [class*="project-row"], [class*="ProjectRow"]').nth(1);
  if (await projectRow.isVisible().catch(() => false)) {
    console.log('>>> Clicking on first project row to see details...');
    await projectRow.click();
    await ess.waitForTimeout(2500);
    await capturePageInteractions(ess, 'Timesheet > Project Detail');
    await ess.screenshot({ path: 'screenshots/deep-ts-project-detail.png', fullPage: true });
    await ess.goBack();
    await ess.waitForTimeout(1500);
  }

  // --- Approvals ---
  console.log('\n>>> === Timesheet > Approvals ===');
  await ess.goto('https://www.zimyo.net/ess/timesheet/approvals', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(3000);
  await capturePageInteractions(ess, 'Timesheet > Approvals');
  await ess.screenshot({ path: 'screenshots/deep-ts-approvals.png', fullPage: true });

  // --- Timelog ---
  console.log('\n>>> === Timesheet > Timelog ===');
  await ess.goto('https://www.zimyo.net/ess/timesheet/timelog', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(3000);
  await capturePageInteractions(ess, 'Timesheet > Timelog');
  await ess.screenshot({ path: 'screenshots/deep-ts-timelog.png', fullPage: true });

  // Check for "Log Time" button
  const logTime = ess.locator('button:has-text("Log"), button:has-text("Add Log"), button:has-text("Log Time")').first();
  if (await logTime.isVisible().catch(() => false)) {
    console.log('>>> Clicking "Log Time"...');
    await logTime.click();
    await ess.waitForTimeout(2500);
    await capturePageInteractions(ess, 'Timesheet > Log Time Form');
    await ess.screenshot({ path: 'screenshots/deep-ts-log-time-form.png', fullPage: true });
    await ess.keyboard.press('Escape');
    await ess.waitForTimeout(500);
  }

  // --- Reports ---
  console.log('\n>>> === Timesheet > Reports ===');
  await ess.goto('https://www.zimyo.net/ess/timesheet/reports', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(3000);
  await capturePageInteractions(ess, 'Timesheet > Reports');
  await ess.screenshot({ path: 'screenshots/deep-ts-reports.png', fullPage: true });
});
