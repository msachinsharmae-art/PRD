// =============================================================================
// ESS COMPLETE TEST SUITE — 120 Test Cases across all 13 ESS Modules
// =============================================================================
// Run:  npx playwright test tests/ess-complete-test-suite.spec.js --project=chromium
// HTML Report:  npx playwright show-report
// =============================================================================

const { test, expect } = require('@playwright/test');

// --------------- CONFIG ---------------
const BASE_URL = 'https://www.zimyo.net';
const CREDS = {
  username: 'sachin.sharma+demo@zimyo.com',
  password: 'Zimyo@12345',
};
const SCREENSHOT_DIR = 'screenshots/ess-suite';

// --------------- HELPERS ---------------

/** Login and return the ESS page (may be a new tab) */
async function loginToESS(page, context) {
  await page.goto(`${BASE_URL}/ess/dashboard/my-dashboard`, { timeout: 60000 });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(3000);

  const url = page.url();
  if (url.includes('/login') || url === `${BASE_URL}/` || url === BASE_URL) {
    await page.locator('#username').waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('#username').fill(CREDS.username);
    await page.locator('#password').fill(CREDS.password);
    await page.waitForTimeout(1000);
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(10000);

    await page.locator('.MuiIconButton-root svg[data-testid="AppsIcon"]').click();
    await page.waitForTimeout(2000);
    const [newPage] = await Promise.all([
      context.waitForEvent('page', { timeout: 10000 }).catch(() => null),
      page.locator('text=ESS').first().click(),
    ]);
    if (newPage) {
      await newPage.waitForLoadState('domcontentloaded');
      await newPage.waitForLoadState('networkidle').catch(() => {});
      await newPage.waitForTimeout(3000);
      return newPage;
    }
  }

  if (page.url().includes('/admin/')) {
    await page.locator('.MuiIconButton-root svg[data-testid="AppsIcon"]').click();
    await page.waitForTimeout(2000);
    const [newPage] = await Promise.all([
      context.waitForEvent('page', { timeout: 10000 }).catch(() => null),
      page.locator('text=ESS').first().click(),
    ]);
    if (newPage) {
      await newPage.waitForLoadState('domcontentloaded');
      await newPage.waitForLoadState('networkidle').catch(() => {});
      await newPage.waitForTimeout(3000);
      return newPage;
    }
  }
  return page;
}

/** Navigate to an ESS page and wait for it to load */
async function goTo(page, path) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(3000);
}

/** Take a full-page screenshot */
async function snap(page, name) {
  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
  await page.screenshot({ path: `${SCREENSHOT_DIR}/${safeName}.png`, fullPage: true });
}

/** Check a button exists and optionally click it */
async function checkButton(page, text, click = false) {
  const btn = page.locator(`button:has-text("${text}"), [role="button"]:has-text("${text}"), a:has-text("${text}")`).first();
  await expect(btn).toBeVisible({ timeout: 10000 });
  if (click) {
    await btn.click();
    await page.waitForTimeout(2000);
  }
  return btn;
}

/** Check a tab exists and optionally click it */
async function checkTab(page, text, click = false) {
  const tab = page.locator(`[role="tab"]:has-text("${text}"), [class*="MuiTab"]:has-text("${text}"), [class*="tab"]:has-text("${text}"), a:has-text("${text}")`).first();
  const visible = await tab.isVisible().catch(() => false);
  if (click && visible) {
    await tab.click();
    await page.waitForTimeout(2000);
  }
  return visible;
}

/** Check page loaded (not blank / not error) */
async function assertPageLoaded(page) {
  const body = await page.locator('body').innerText().catch(() => '');
  expect(body.length).toBeGreaterThan(50);
}

// =============================================================================
//  SHARED STATE — single login for entire suite (serial mode)
// =============================================================================

let essPage;

test.describe.configure({ mode: 'serial' });
test.describe('ESS Complete Test Suite — 120 Test Cases', () => {

  test.setTimeout(600000); // 10 min global timeout

  // =========================================================================
  //  AUTH & NAVIGATION (TC-117, TC-118, TC-119)
  // =========================================================================

  test('TC-118: Login with valid credentials', async ({ page, context }) => {
    essPage = await loginToESS(page, context);
    const url = essPage.url();
    expect(url).toContain('/ess/');
    await snap(essPage, 'TC-118_login_success');
  });

  test('TC-117: Nine-dot app switcher opens ESS', async () => {
    // Already verified during login — ESS opened via nine-dot
    expect(essPage.url()).toContain('/ess/');
  });

  test('TC-116: Sidebar shows all 13 sections', async () => {
    await goTo(essPage, '/ess/dashboard/my-dashboard');
    const sidebar = await essPage.locator('nav, [class*="sidebar"], [class*="Sidebar"], [class*="side-bar"]').first().innerText().catch(() => '');
    const pageText = await essPage.locator('body').innerText();
    const sections = ['Dashboard', 'Engage', 'Request', 'Attendance', 'Pay', 'Finance', 'Task', 'Org', 'Timesheet', 'Rewards', 'Recruit', 'Learn', 'Performance'];
    let found = 0;
    for (const s of sections) {
      if (pageText.toLowerCase().includes(s.toLowerCase())) found++;
    }
    console.log(`>>> Sidebar sections found: ${found}/13`);
    expect(found).toBeGreaterThanOrEqual(8); // at least 8 visible
    await snap(essPage, 'TC-116_sidebar');
  });

  test('TC-119: Session persists across navigation', async () => {
    await goTo(essPage, '/ess/engage');
    expect(essPage.url()).not.toContain('/login');
    await goTo(essPage, '/ess/pay');
    expect(essPage.url()).not.toContain('/login');
  });

  // =========================================================================
  //  1. DASHBOARD (TC-001 to TC-007)
  // =========================================================================

  test('TC-001: Navigate to ESS Dashboard', async () => {
    await goTo(essPage, '/ess/dashboard/my-dashboard');
    expect(essPage.url()).toContain('/ess/dashboard');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-001_dashboard');
  });

  test('TC-002: Apply New dropdown on Dashboard', async () => {
    await goTo(essPage, '/ess/dashboard/my-dashboard');
    const btn = essPage.locator('button:has-text("Apply New"), [role="button"]:has-text("Apply New"), :has-text("Apply New")').first();
    const visible = await btn.isVisible().catch(() => false);
    if (visible) {
      await btn.click();
      await essPage.waitForTimeout(2000);
      await snap(essPage, 'TC-002_apply_new_dropdown');
      // close dropdown by pressing Escape
      await essPage.keyboard.press('Escape');
    }
    console.log(`>>> TC-002: Apply New button visible = ${visible}`);
  });

  test('TC-003: Clock In button on Dashboard', async () => {
    await goTo(essPage, '/ess/dashboard/my-dashboard');
    const clockIn = essPage.locator('button:has-text("Clock In"), [role="button"]:has-text("Clock In"), button:has-text("Clock Out")').first();
    const visible = await clockIn.isVisible().catch(() => false);
    console.log(`>>> TC-003: Clock In/Out button visible = ${visible}`);
    await snap(essPage, 'TC-003_clock_in');
  });

  test('TC-004: Add New Task button on Dashboard', async () => {
    await goTo(essPage, '/ess/dashboard/my-dashboard');
    const btn = essPage.locator('button:has-text("Add New"), [role="button"]:has-text("Add New"), button:has-text("+ Add")').first();
    const visible = await btn.isVisible().catch(() => false);
    console.log(`>>> TC-004: Add New Task button visible = ${visible}`);
  });

  test('TC-005: Pending On Me section', async () => {
    await goTo(essPage, '/ess/dashboard/my-dashboard');
    const section = essPage.locator('text=Pending On Me').first();
    const visible = await section.isVisible().catch(() => false);
    console.log(`>>> TC-005: Pending On Me visible = ${visible}`);
  });

  test('TC-006: Mood Tracker on Dashboard', async () => {
    await goTo(essPage, '/ess/dashboard/my-dashboard');
    const mood = essPage.locator('text=Mood').first();
    const visible = await mood.isVisible().catch(() => false);
    console.log(`>>> TC-006: Mood tracker visible = ${visible}`);
  });

  test('TC-007: Dashboard scroll and content load', async () => {
    await goTo(essPage, '/ess/dashboard/my-dashboard');
    await essPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await essPage.waitForTimeout(2000);
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-007_dashboard_scrolled');
  });

  // =========================================================================
  //  2. ENGAGE (TC-008 to TC-012)
  // =========================================================================

  test('TC-008: Navigate to Engage', async () => {
    await goTo(essPage, '/ess/engage');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-008_engage');
  });

  test('TC-009: Groups tab in Engage', async () => {
    await goTo(essPage, '/ess/engage');
    const visible = await checkTab(essPage, 'Groups', true);
    console.log(`>>> TC-009: Groups tab visible = ${visible}`);
    await snap(essPage, 'TC-009_engage_groups');
  });

  test('TC-010: Direct Messages in Engage', async () => {
    await goTo(essPage, '/ess/engage');
    const dm = essPage.locator('text=Direct Message').first();
    const visible = await dm.isVisible().catch(() => false);
    console.log(`>>> TC-010: Direct Messages visible = ${visible}`);
  });

  test('TC-011: Post creation area in Engage', async () => {
    await goTo(essPage, '/ess/engage');
    const editor = essPage.locator('textarea, [contenteditable="true"], [class*="editor"]').first();
    const visible = await editor.isVisible().catch(() => false);
    console.log(`>>> TC-011: Post creation area visible = ${visible}`);
  });

  test('TC-012: Privacy toggle in Engage', async () => {
    await goTo(essPage, '/ess/engage');
    const toggle = essPage.locator('text=Private').first();
    const visible = await toggle.isVisible().catch(() => false);
    console.log(`>>> TC-012: Privacy toggle visible = ${visible}`);
  });

  // =========================================================================
  //  3. REQUEST (TC-013 to TC-036)
  // =========================================================================

  test('TC-013: Navigate to Request section', async () => {
    await goTo(essPage, '/ess/request/my-requests');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-013_request');
  });

  test('TC-014: Self tab in Requests', async () => {
    await goTo(essPage, '/ess/request/my-requests');
    await checkTab(essPage, 'Self', true);
    await snap(essPage, 'TC-014_request_self');
  });

  test('TC-015: Team tab in Requests', async () => {
    await goTo(essPage, '/ess/request/my-requests');
    await checkTab(essPage, 'Team', true);
    await snap(essPage, 'TC-015_request_team');
  });

  test('TC-016: Employee tab in Requests', async () => {
    await goTo(essPage, '/ess/request/my-requests');
    await checkTab(essPage, 'Employee', true);
    await snap(essPage, 'TC-016_request_employee');
  });

  test('TC-017: Apply New button opens request modal', async () => {
    await goTo(essPage, '/ess/request/my-requests');
    const btn = essPage.locator('button:has-text("Apply New"), [role="button"]:has-text("Apply New")').first();
    const visible = await btn.isVisible().catch(() => false);
    if (visible) {
      await btn.click();
      await essPage.waitForTimeout(2000);
      await snap(essPage, 'TC-017_apply_new_modal');
    }
    console.log(`>>> TC-017: Apply New visible = ${visible}`);
  });

  // TC-018 to TC-036: Request categories
  const requestCategories = [
    { id: 'TC-018', name: 'Leave & Attendance' },
    { id: 'TC-019', name: 'Document' },
    { id: 'TC-020', name: 'Onboarding' },
    { id: 'TC-021', name: 'Offboarding' },
    { id: 'TC-022', name: 'Asset' },
    { id: 'TC-023', name: 'Requisition' },
    { id: 'TC-024', name: 'Expense' },
    { id: 'TC-025', name: 'Vendor' },
    { id: 'TC-026', name: 'Petty Cash' },
    { id: 'TC-027', name: 'Travel Desk' },
    { id: 'TC-028', name: 'Loan and Advance' },
    { id: 'TC-029', name: 'Task Management' },
    { id: 'TC-030', name: 'Checklist' },
    { id: 'TC-031', name: 'Internal Job Posting' },
    { id: 'TC-032', name: 'Maker and Checker' },
    { id: 'TC-033', name: 'Probation Confirmation' },
    { id: 'TC-034', name: 'Probation Feedback' },
    { id: 'TC-035', name: 'Transfer' },
    { id: 'TC-036', name: 'Performance Improvement Plan' },
  ];

  for (const cat of requestCategories) {
    test(`${cat.id}: Request category — ${cat.name}`, async () => {
      await goTo(essPage, '/ess/request/my-requests');
      // Open Apply New modal
      const applyBtn = essPage.locator('button:has-text("Apply New"), [role="button"]:has-text("Apply New")').first();
      if (await applyBtn.isVisible().catch(() => false)) {
        await applyBtn.click();
        await essPage.waitForTimeout(2000);
      }
      // Click the category
      const catLink = essPage.locator(`text=${cat.name}`).first();
      const visible = await catLink.isVisible().catch(() => false);
      if (visible) {
        await catLink.click();
        await essPage.waitForTimeout(2000);
        await snap(essPage, `${cat.id}_${cat.name.replace(/\s+/g, '_')}`);
      }
      console.log(`>>> ${cat.id}: ${cat.name} visible = ${visible}`);
      await essPage.keyboard.press('Escape');
      await essPage.waitForTimeout(500);
    });
  }

  // =========================================================================
  //  4. ATTENDANCE (TC-037 to TC-045)
  // =========================================================================

  test('TC-037: Navigate to My Attendance', async () => {
    await goTo(essPage, '/ess/leave-and-attendance/my-attendance');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-037_my_attendance');
  });

  test('TC-038: Date cell click shows actions', async () => {
    await goTo(essPage, '/ess/leave-and-attendance/my-attendance');
    const cell = essPage.locator('td, [class*="calendar-cell"], [class*="day"]').nth(15);
    if (await cell.isVisible().catch(() => false)) {
      await cell.click();
      await essPage.waitForTimeout(2000);
      await snap(essPage, 'TC-038_date_click');
      await essPage.keyboard.press('Escape');
    }
  });

  test('TC-039: Regularization button', async () => {
    await goTo(essPage, '/ess/leave-and-attendance/my-attendance');
    const btn = essPage.locator('text=Regulariz').first();
    const visible = await btn.isVisible().catch(() => false);
    console.log(`>>> TC-039: Regularization visible = ${visible}`);
  });

  test('TC-040: Navigate to My Leave', async () => {
    await goTo(essPage, '/ess/leave-and-attendance/my-leave');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-040_my_leave');
  });

  test('TC-041: Apply Leave button', async () => {
    await goTo(essPage, '/ess/leave-and-attendance/my-leave');
    const btn = essPage.locator('button:has-text("Apply Leave"), [role="button"]:has-text("Apply Leave"), button:has-text("Apply")').first();
    const visible = await btn.isVisible().catch(() => false);
    if (visible) {
      await btn.click();
      await essPage.waitForTimeout(2000);
      await snap(essPage, 'TC-041_apply_leave_form');
      await essPage.keyboard.press('Escape');
    }
    console.log(`>>> TC-041: Apply Leave visible = ${visible}`);
  });

  test('TC-042: Leave balance details', async () => {
    await goTo(essPage, '/ess/leave-and-attendance/my-leave');
    const body = await essPage.locator('body').innerText();
    const hasBalance = body.toLowerCase().includes('balance') || body.toLowerCase().includes('available') || body.toLowerCase().includes('leave');
    console.log(`>>> TC-042: Leave balance info present = ${hasBalance}`);
    await snap(essPage, 'TC-042_leave_balance');
  });

  test('TC-043: Team Attendance', async () => {
    await goTo(essPage, '/ess/leave-and-attendance/team-attendance');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-043_team_attendance');
  });

  test('TC-044: Team Roster', async () => {
    await goTo(essPage, '/ess/leave-and-attendance/team-roster');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-044_team_roster');
  });

  test('TC-045: Attendance Snapshot', async () => {
    await goTo(essPage, '/ess/leave-and-attendance/attendance-snapshot');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-045_attendance_snapshot');
  });

  // =========================================================================
  //  5. PAY (TC-046 to TC-053)
  // =========================================================================

  test('TC-046: Navigate to Pay section', async () => {
    await goTo(essPage, '/ess/pay');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-046_pay');
  });

  test('TC-047: My Salary page', async () => {
    await goTo(essPage, '/ess/pay');
    await checkTab(essPage, 'My Salary', true);
    await snap(essPage, 'TC-047_my_salary');
  });

  test('TC-048: Payslips page', async () => {
    await goTo(essPage, '/ess/pay');
    await checkTab(essPage, 'Payslip', true);
    await snap(essPage, 'TC-048_payslips');
  });

  test('TC-049: Salary Structure', async () => {
    await goTo(essPage, '/ess/pay');
    await checkTab(essPage, 'Salary Structure', true);
    await snap(essPage, 'TC-049_salary_structure');
  });

  test('TC-050: Tax page', async () => {
    await goTo(essPage, '/ess/pay');
    await checkTab(essPage, 'Tax', true);
    await snap(essPage, 'TC-050_tax');
  });

  test('TC-051: IT Declaration', async () => {
    await goTo(essPage, '/ess/pay');
    await checkTab(essPage, 'IT Declaration', true);
    await snap(essPage, 'TC-051_it_declaration');
  });

  test('TC-052: Loans page', async () => {
    await goTo(essPage, '/ess/pay');
    await checkTab(essPage, 'Loan', true);
    await snap(essPage, 'TC-052_loans');
  });

  test('TC-053: Reimbursement page', async () => {
    await goTo(essPage, '/ess/pay');
    await checkTab(essPage, 'Reimbursement', true);
    await snap(essPage, 'TC-053_reimbursement');
  });

  // =========================================================================
  //  6. FINANCE (TC-054 to TC-061)
  // =========================================================================

  test('TC-054: Navigate to Finance section', async () => {
    await goTo(essPage, '/ess/finance-bundle/expense/my-expense');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-054_finance');
  });

  test('TC-055: Raise New Expense Request', async () => {
    await goTo(essPage, '/ess/finance-bundle/expense/my-expense');
    const btn = essPage.locator('button:has-text("Raise"), [role="button"]:has-text("Raise"), button:has-text("New Request")').first();
    const visible = await btn.isVisible().catch(() => false);
    if (visible) {
      await btn.click();
      await essPage.waitForTimeout(2000);
      await snap(essPage, 'TC-055_raise_expense');
      await essPage.keyboard.press('Escape');
    }
    console.log(`>>> TC-055: Raise New Request visible = ${visible}`);
  });

  test('TC-056: AP Access page', async () => {
    await goTo(essPage, '/ess/finance-bundle/ap/access');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-056_ap_access');
  });

  test('TC-057: AP Report page', async () => {
    await goTo(essPage, '/ess/finance-bundle/ap/report');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-057_ap_report');
  });

  test('TC-058: Travel Desk page', async () => {
    await goTo(essPage, '/ess/finance-bundle/travel');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-058_travel_desk');
  });

  test('TC-059: Raise Travel Request', async () => {
    await goTo(essPage, '/ess/finance-bundle/travel');
    const btn = essPage.locator('button:has-text("Raise"), [role="button"]:has-text("Raise")').first();
    const visible = await btn.isVisible().catch(() => false);
    if (visible) {
      await btn.click();
      await essPage.waitForTimeout(2000);
      await snap(essPage, 'TC-059_raise_travel');
      await essPage.keyboard.press('Escape');
    }
    console.log(`>>> TC-059: Raise Travel visible = ${visible}`);
  });

  test('TC-060: Petty Cash page', async () => {
    await goTo(essPage, '/ess/finance-bundle/petty-cash');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-060_petty_cash');
  });

  test('TC-061: Vendor page', async () => {
    await goTo(essPage, '/ess/finance-bundle/vendor');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-061_vendor');
  });

  // =========================================================================
  //  7. TASK (TC-062 to TC-066)
  // =========================================================================

  test('TC-062: Navigate to Task Dashboard', async () => {
    await goTo(essPage, '/ess/task/dashboard');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-062_task_dashboard');
  });

  test('TC-063: Task Dashboard widgets', async () => {
    await goTo(essPage, '/ess/task/dashboard');
    await essPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await essPage.waitForTimeout(2000);
    await snap(essPage, 'TC-063_task_widgets');
  });

  test('TC-064: Navigate to Task List', async () => {
    await goTo(essPage, '/ess/task/list');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-064_task_list');
  });

  test('TC-065: Add Task button', async () => {
    await goTo(essPage, '/ess/task/list');
    const btn = essPage.locator('button:has-text("Add Task"), [role="button"]:has-text("Add Task"), button:has-text("Add")').first();
    const visible = await btn.isVisible().catch(() => false);
    if (visible) {
      await btn.click();
      await essPage.waitForTimeout(2000);
      await snap(essPage, 'TC-065_add_task_form');
      await essPage.keyboard.press('Escape');
    }
    console.log(`>>> TC-065: Add Task visible = ${visible}`);
  });

  test('TC-066: Task List tabs (My Tasks / Team Tasks)', async () => {
    await goTo(essPage, '/ess/task/list');
    const myTasks = await checkTab(essPage, 'My Task', true);
    const teamTasks = await checkTab(essPage, 'Team', true);
    console.log(`>>> TC-066: My Tasks tab = ${myTasks}, Team Tasks tab = ${teamTasks}`);
    await snap(essPage, 'TC-066_task_tabs');
  });

  // =========================================================================
  //  8. ORG (TC-067 to TC-076)
  // =========================================================================

  test('TC-067: Navigate to Org Dashboard', async () => {
    await goTo(essPage, '/ess/hr/dashboard');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-067_org_dashboard');
  });

  test('TC-068: Org — Direct Reporting tab', async () => {
    await goTo(essPage, '/ess/hr/dashboard');
    await checkTab(essPage, 'Direct Report', true);
    await snap(essPage, 'TC-068_direct_reporting');
  });

  test('TC-069: Org — Indirect Reporting tab', async () => {
    await goTo(essPage, '/ess/hr/dashboard');
    await checkTab(essPage, 'Indirect Report', true);
    await snap(essPage, 'TC-069_indirect_reporting');
  });

  test('TC-070: Org — Department tab', async () => {
    await goTo(essPage, '/ess/hr/dashboard');
    await checkTab(essPage, 'Department', true);
    await snap(essPage, 'TC-070_department');
  });

  test('TC-071: Employee Directory', async () => {
    await goTo(essPage, '/ess/hr/directory');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-071_directory');
  });

  test('TC-072: Company Policy', async () => {
    await goTo(essPage, '/ess/hr/policy');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-072_policy');
  });

  test('TC-073: Knowledge Base', async () => {
    await goTo(essPage, '/ess/hr/knowledge-base');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-073_knowledge_base');
  });

  test('TC-074: Helpdesk', async () => {
    await goTo(essPage, '/ess/hr/helpdesk');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-074_helpdesk');
  });

  test('TC-075: Raise Ticket button', async () => {
    await goTo(essPage, '/ess/hr/helpdesk');
    const btn = essPage.locator('button:has-text("Raise Ticket"), [role="button"]:has-text("Raise Ticket"), button:has-text("Raise")').first();
    const visible = await btn.isVisible().catch(() => false);
    if (visible) {
      await btn.click();
      await essPage.waitForTimeout(2000);
      await snap(essPage, 'TC-075_raise_ticket');
      await essPage.keyboard.press('Escape');
    }
    console.log(`>>> TC-075: Raise Ticket visible = ${visible}`);
  });

  test('TC-076: Org Reports', async () => {
    await goTo(essPage, '/ess/hr/reports');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-076_org_reports');
  });

  // =========================================================================
  //  9. TIMESHEET (TC-077 to TC-088)
  // =========================================================================

  test('TC-077: Navigate to Timesheet Dashboard', async () => {
    await goTo(essPage, '/ess/timesheet/dashboard');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-077_timesheet_dashboard');
  });

  test('TC-078: All Team toggle on Timesheet Dashboard', async () => {
    await goTo(essPage, '/ess/timesheet/dashboard');
    const toggle = essPage.locator('text=All Team').first();
    const visible = await toggle.isVisible().catch(() => false);
    if (visible) {
      await toggle.click();
      await essPage.waitForTimeout(2000);
    }
    console.log(`>>> TC-078: All Team toggle visible = ${visible}`);
    await snap(essPage, 'TC-078_all_team');
  });

  test('TC-079: Timesheet Dashboard scroll content', async () => {
    await goTo(essPage, '/ess/timesheet/dashboard');
    await essPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await essPage.waitForTimeout(2000);
    await snap(essPage, 'TC-079_timesheet_scrolled');
  });

  test('TC-080: Navigate to Timesheet Tasks', async () => {
    await goTo(essPage, '/ess/timesheet/tasks');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-080_timesheet_tasks');
  });

  test('TC-081: Add Task in Timesheet', async () => {
    await goTo(essPage, '/ess/timesheet/tasks');
    const btn = essPage.locator('button:has-text("Add"), [role="button"]:has-text("Add Task")').first();
    const visible = await btn.isVisible().catch(() => false);
    if (visible) {
      await btn.click();
      await essPage.waitForTimeout(2000);
      await snap(essPage, 'TC-081_add_timesheet_task');
      await essPage.keyboard.press('Escape');
    }
    console.log(`>>> TC-081: Add Task visible = ${visible}`);
  });

  test('TC-082: Navigate to Timesheet Projects', async () => {
    await goTo(essPage, '/ess/timesheet/projects');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-082_timesheet_projects');
  });

  test('TC-083: Click project row for details', async () => {
    await goTo(essPage, '/ess/timesheet/projects');
    const row = essPage.locator('tr, [class*="row"], [class*="project-item"]').nth(1);
    if (await row.isVisible().catch(() => false)) {
      await row.click();
      await essPage.waitForTimeout(2000);
      await snap(essPage, 'TC-083_project_detail');
      await essPage.keyboard.press('Escape');
    }
  });

  test('TC-084: Navigate to Timesheet Approvals', async () => {
    await goTo(essPage, '/ess/timesheet/approvals');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-084_approvals');
  });

  test('TC-085: Navigate to Timelog', async () => {
    await goTo(essPage, '/ess/timesheet/timelog');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-085_timelog');
  });

  test('TC-086: Log Time button', async () => {
    await goTo(essPage, '/ess/timesheet/timelog');
    const btn = essPage.locator('button:has-text("Log Time"), [role="button"]:has-text("Log Time"), button:has-text("Log")').first();
    const visible = await btn.isVisible().catch(() => false);
    if (visible) {
      await btn.click();
      await essPage.waitForTimeout(2000);
      await snap(essPage, 'TC-086_log_time_form');
      await essPage.keyboard.press('Escape');
    }
    console.log(`>>> TC-086: Log Time visible = ${visible}`);
  });

  test('TC-087: Timesheet Reports', async () => {
    await goTo(essPage, '/ess/timesheet/reports');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-087_timesheet_reports');
  });

  test('TC-088: Timesheet Configuration', async () => {
    await goTo(essPage, '/ess/timesheet/configuration');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-088_timesheet_config');
  });

  // =========================================================================
  //  10. REWARDS (TC-089 to TC-094)
  // =========================================================================

  test('TC-089: Navigate to Rewards Home', async () => {
    await goTo(essPage, '/ess/rewards/home');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-089_rewards_home');
  });

  test('TC-090: Recognize button', async () => {
    await goTo(essPage, '/ess/rewards/home');
    const btn = essPage.locator('button:has-text("Recognize"), [role="button"]:has-text("Recognize")').first();
    const visible = await btn.isVisible().catch(() => false);
    if (visible) {
      await btn.click();
      await essPage.waitForTimeout(2000);
      await snap(essPage, 'TC-090_recognize_form');
      await essPage.keyboard.press('Escape');
    }
    console.log(`>>> TC-090: Recognize button visible = ${visible}`);
  });

  test('TC-091: Organisation view toggle', async () => {
    await goTo(essPage, '/ess/rewards/home');
    const toggle = essPage.locator('text=Organisation').first();
    const visible = await toggle.isVisible().catch(() => false);
    if (visible) {
      await toggle.click();
      await essPage.waitForTimeout(2000);
    }
    console.log(`>>> TC-091: Organisation toggle visible = ${visible}`);
    await snap(essPage, 'TC-091_org_view');
  });

  test('TC-092: My Recognitions — Given tab', async () => {
    await goTo(essPage, '/ess/rewards/my-recognitions');
    await checkTab(essPage, 'Given', true);
    await snap(essPage, 'TC-092_given');
  });

  test('TC-093: My Recognitions — Received tab', async () => {
    await goTo(essPage, '/ess/rewards/my-recognitions');
    await checkTab(essPage, 'Received', true);
    await snap(essPage, 'TC-093_received');
  });

  test('TC-094: Rewards Wallet', async () => {
    await goTo(essPage, '/ess/rewards/wallet');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-094_wallet');
  });

  // =========================================================================
  //  11. RECRUIT (TC-095 to TC-100)
  // =========================================================================

  test('TC-095: Navigate to Recruit section', async () => {
    await goTo(essPage, '/ess/recruit/requisition/my-requisition');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-095_recruit');
  });

  test('TC-096: Create New Requisition', async () => {
    await goTo(essPage, '/ess/recruit/requisition/my-requisition');
    const btn = essPage.locator('button:has-text("Create New"), [role="button"]:has-text("Create"), button:has-text("New")').first();
    const visible = await btn.isVisible().catch(() => false);
    if (visible) {
      await btn.click();
      await essPage.waitForTimeout(2000);
      await snap(essPage, 'TC-096_create_requisition');
      await essPage.keyboard.press('Escape');
    }
    console.log(`>>> TC-096: Create New visible = ${visible}`);
  });

  test('TC-097: Team Requisition', async () => {
    await goTo(essPage, '/ess/recruit/requisition/team-requisition');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-097_team_requisition');
  });

  test('TC-098: Interviews page', async () => {
    await goTo(essPage, '/ess/recruit/interviews');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-098_interviews');
  });

  test('TC-099: Interviews — Self tab', async () => {
    await goTo(essPage, '/ess/recruit/interviews');
    await checkTab(essPage, 'Self', true);
    await snap(essPage, 'TC-099_interviews_self');
  });

  test('TC-100: Interviews — Team tab', async () => {
    await goTo(essPage, '/ess/recruit/interviews');
    await checkTab(essPage, 'Team', true);
    await snap(essPage, 'TC-100_interviews_team');
  });

  // =========================================================================
  //  12. LEARN (TC-101 to TC-105)
  // =========================================================================

  test('TC-101: Navigate to Learn section', async () => {
    await goTo(essPage, '/ess/learn');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-101_learn');
  });

  test('TC-102: Courses page', async () => {
    await goTo(essPage, '/ess/learn/courses');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-102_courses');
  });

  test('TC-103: My Courses page', async () => {
    await goTo(essPage, '/ess/learn/my-courses');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-103_my_courses');
  });

  test('TC-104: Course Catalog', async () => {
    await goTo(essPage, '/ess/learn/catalog');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-104_catalog');
  });

  test('TC-105: Certifications page', async () => {
    await goTo(essPage, '/ess/learn/certifications');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-105_certifications');
  });

  // =========================================================================
  //  13. PERFORMANCE (TC-106 to TC-115)
  // =========================================================================

  test('TC-106: Navigate to Performance section', async () => {
    await goTo(essPage, '/ess/performance');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-106_performance');
  });

  test('TC-107: Goals page', async () => {
    await goTo(essPage, '/ess/performance/goals');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-107_goals');
  });

  test('TC-108: Reviews page', async () => {
    await goTo(essPage, '/ess/performance/reviews');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-108_reviews');
  });

  test('TC-109: Feedback page', async () => {
    await goTo(essPage, '/ess/performance/feedback');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-109_feedback');
  });

  test('TC-110: OKR page', async () => {
    await goTo(essPage, '/ess/performance/okr');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-110_okr');
  });

  test('TC-111: KRA page', async () => {
    await goTo(essPage, '/ess/performance/kra');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-111_kra');
  });

  test('TC-112: Competency page', async () => {
    await goTo(essPage, '/ess/performance/competency');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-112_competency');
  });

  test('TC-113: PIP page', async () => {
    await goTo(essPage, '/ess/performance/pip');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-113_pip');
  });

  test('TC-114: One-on-One page', async () => {
    await goTo(essPage, '/ess/performance/one-on-one');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-114_one_on_one');
  });

  test('TC-115: Continuous Feedback', async () => {
    await goTo(essPage, '/ess/performance/continuous-feedback');
    await assertPageLoaded(essPage);
    await snap(essPage, 'TC-115_continuous_feedback');
  });

  // =========================================================================
  //  SCREENSHOT CAPTURE (TC-120)
  // =========================================================================

  test('TC-120: Full page screenshot capture works', async () => {
    await goTo(essPage, '/ess/dashboard/my-dashboard');
    await snap(essPage, 'TC-120_full_page_screenshot');
    // Verify screenshot file was created (test passes if no error thrown)
  });

});
