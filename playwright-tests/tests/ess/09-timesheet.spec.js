// @ts-check
const { test, expect } = require('@playwright/test');
const { ESSPage, S, URLS } = require('../../pages/ess.page');

let ess;

test.describe('ESS Timesheet Module', () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    ess = new ESSPage(page, context);
    await ess.loginToESS();
  });

  test.afterAll(async () => {
    await ess.essPage.context().close();
  });

  // ── Dashboard ─────────────────────────────────────────────

  test('TC-TS01: Timesheet Dashboard loads correctly', async () => {
    await ess.goto(URLS.timesheet.dashboard);
    expect(await ess.verifyUrl('/ess/timesheet/dashboard')).toBeTruthy();
    await ess.screenshot('TS01-timesheet-dashboard');
  });

  test('TC-TS02: All Timesheet sub-tabs are visible', async () => {
    await ess.goto(URLS.timesheet.dashboard);
    expect(await ess.isVisible('Dashboard')).toBeTruthy();
    expect(await ess.isVisible('Tasks')).toBeTruthy();
    expect(await ess.isVisible('Projects')).toBeTruthy();
    expect(await ess.isVisible('Approvals')).toBeTruthy();
    expect(await ess.isVisible('Timelog')).toBeTruthy();
    expect(await ess.isVisible('Reports')).toBeTruthy();
  });

  test('TC-TS03: My Dashboard / All Team toggle is visible', async () => {
    await ess.goto(URLS.timesheet.dashboard);
    expect(await ess.isVisible('My Dashboard')).toBeTruthy();
    expect(await ess.isVisible('All Team')).toBeTruthy();
  });

  test('TC-TS04: Summary cards are visible (Projects, Tasks, Logs, Timesheets)', async () => {
    await ess.goto(URLS.timesheet.dashboard);
    const text = await ess.getPageText();
    expect(text).toContain('Projects');
    expect(text).toContain('Tasks');
    expect(text).toContain('Logs');
    expect(text).toContain('Timesheets');
  });

  test('TC-TS05: Task Status chart is visible', async () => {
    await ess.goto(URLS.timesheet.dashboard);
    expect(await ess.isVisible('Task Status')).toBeTruthy();
  });

  test('TC-TS06: Tasks by Due Date table is visible', async () => {
    await ess.goto(URLS.timesheet.dashboard);
    expect(await ess.isVisible('Tasks by Due Date')).toBeTruthy();
  });

  test('TC-TS07: Project Overview table is visible', async () => {
    await ess.goto(URLS.timesheet.dashboard);
    await ess.scrollToBottom();
    expect(await ess.isVisible('Project Overview')).toBeTruthy();
  });

  test('TC-TS08: All Team toggle switches view', async () => {
    await ess.goto(URLS.timesheet.dashboard);
    await ess.essPage.locator('text=All Team').first().click();
    await ess.essPage.waitForTimeout(2000);
    await ess.screenshot('TS08-all-team-view');
  });

  test('TC-TS09: Date range picker is visible', async () => {
    await ess.goto(URLS.timesheet.dashboard);
    expect(await ess.isVisible('Reset')).toBeTruthy();
  });

  // ── Projects ──────────────────────────────────────────────

  test('TC-TS10: Timesheet Projects page loads', async () => {
    await ess.goto(URLS.timesheet.projects);
    expect(await ess.verifyUrl('/ess/timesheet/projects')).toBeTruthy();
    await ess.screenshot('TS10-projects');
  });

  test('TC-TS11: Project list shows US Timesheet and ESS Revamp', async () => {
    await ess.goto(URLS.timesheet.projects);
    const text = await ess.getPageText();
    expect(text).toContain('US Timesheet');
    expect(text).toContain('ESS Revamp');
  });

  // ── Tab navigation via clicks ─────────────────────────────

  test('TC-TS12: Tasks tab is clickable via header nav', async () => {
    await ess.goto(URLS.timesheet.dashboard);
    await ess.essPage.locator('a[href*="/ess/timesheet/tasks"]').first().click();
    await ess.essPage.waitForTimeout(2000);
    await ess.screenshot('TS12-tasks-via-click');
  });

  test('TC-TS13: Approvals tab is clickable via header nav', async () => {
    await ess.goto(URLS.timesheet.dashboard);
    await ess.essPage.locator('a[href*="/ess/timesheet/approvals"]').first().click();
    await ess.essPage.waitForTimeout(2000);
    await ess.screenshot('TS13-approvals-via-click');
  });

  test('TC-TS14: Timelog tab is clickable via header nav', async () => {
    await ess.goto(URLS.timesheet.dashboard);
    await ess.essPage.locator('a[href*="/ess/timesheet/timelog"]').first().click();
    await ess.essPage.waitForTimeout(2000);
    await ess.screenshot('TS14-timelog-via-click');
  });

  test('TC-TS15: Reports tab is clickable via header nav', async () => {
    await ess.goto(URLS.timesheet.dashboard);
    await ess.essPage.locator('a[href*="/ess/timesheet/reports"]').first().click();
    await ess.essPage.waitForTimeout(2000);
    await ess.screenshot('TS15-reports-via-click');
  });
});
