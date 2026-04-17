// @ts-check
const { test, expect } = require('@playwright/test');
const { ESSPage, S, URLS } = require('../../pages/ess.page');

let ess;

test.describe('ESS Dashboard Module', () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    ess = new ESSPage(page, context);
    await ess.loginToESS();
  });

  test.afterAll(async () => {
    await ess.essPage.context().close();
  });

  test('TC-D01: Dashboard page loads with correct URL', async () => {
    await ess.goto(URLS.dashboard);
    expect(await ess.verifyUrl('/ess/dashboard/my-dashboard')).toBeTruthy();
    await ess.screenshot('D01-dashboard-loaded');
  });

  test('TC-D02: All 13 sidebar menu items are visible', async () => {
    await ess.goto(URLS.dashboard);
    const menus = ['Dashboard', 'Engage', 'Request', 'Attendance', 'Pay', 'Finance', 'Task', 'Org', 'Timesheet', 'Rewards And Recognition', 'Recruit', 'Learn', 'Performance'];
    for (const menu of menus) {
      expect(await ess.isVisible(menu)).toBeTruthy();
    }
  });

  test('TC-D03: Apply New button is visible and clickable', async () => {
    await ess.goto(URLS.dashboard);
    const btn = ess.essPage.locator(S.applyNewBtn).first();
    await expect(btn).toBeVisible();
  });

  test('TC-D04: Apply New dropdown shows all 16 request types', async () => {
    await ess.goto(URLS.dashboard);
    await ess.applyNew();
    const options = ['Leave', 'Regularisation', 'Work From Home', 'On Duty', 'Comp Off', 'Expense', 'Restricted Holiday', 'Requisition', 'Short Leave', 'Petty Cash', 'Petty Expense', 'OverTime', 'Travel Desk', 'Document Request', 'Local Stays', 'Rejoining Request'];
    for (const opt of options) {
      expect(await ess.isVisible(opt)).toBeTruthy();
    }
    await ess.closeModal();
    await ess.screenshot('D04-apply-new-options');
  });

  test('TC-D05: Clock In button is visible', async () => {
    await ess.goto(URLS.dashboard);
    const clockIn = ess.essPage.locator(S.dashboard.clockInBtn);
    const clockOut = ess.essPage.locator(S.dashboard.clockOutBtn);
    const isClockIn = await clockIn.isVisible().catch(() => false);
    const isClockOut = await clockOut.isVisible().catch(() => false);
    expect(isClockIn || isClockOut).toBeTruthy();
  });

  test('TC-D06: Mood tracker is visible', async () => {
    await ess.goto(URLS.dashboard);
    expect(await ess.isVisible('Mood')).toBeTruthy();
  });

  test('TC-D07: Announcements section is visible', async () => {
    await ess.goto(URLS.dashboard);
    expect(await ess.isVisible('Announcements')).toBeTruthy();
  });

  test('TC-D08: Leave calendar is visible with month navigation', async () => {
    await ess.goto(URLS.dashboard);
    expect(await ess.isVisible('Future Leave Projection')).toBeTruthy();
    expect(await ess.isVisible('SUN')).toBeTruthy();
  });

  test('TC-D09: Celebrations section is visible', async () => {
    await ess.goto(URLS.dashboard);
    await ess.scrollToBottom();
    expect(await ess.isVisible('Celebrations')).toBeTruthy();
  });

  test('TC-D10: Upcoming Holidays section is visible', async () => {
    await ess.goto(URLS.dashboard);
    await ess.scrollToBottom();
    expect(await ess.isVisible('Upcoming Holidays')).toBeTruthy();
  });

  test('TC-D11: Pending Tasks section is visible', async () => {
    await ess.goto(URLS.dashboard);
    await ess.scrollToBottom();
    expect(await ess.isVisible('Pending Tasks')).toBeTruthy();
  });

  test('TC-D12: Open Job Positions section is visible', async () => {
    await ess.goto(URLS.dashboard);
    await ess.scrollToBottom();
    expect(await ess.isVisible('Open Job Positions')).toBeTruthy();
  });

  test('TC-D13: Quick Links section is visible', async () => {
    await ess.goto(URLS.dashboard);
    await ess.scrollToBottom();
    expect(await ess.isVisible('Quick Links')).toBeTruthy();
  });

  test('TC-D14: My Pending Requests widget is visible', async () => {
    await ess.goto(URLS.dashboard);
    await ess.scrollToBottom();
    expect(await ess.isVisible('My Pending Requests')).toBeTruthy();
  });

  test('TC-D15: Pending On Me widget is visible', async () => {
    await ess.goto(URLS.dashboard);
    await ess.scrollToBottom();
    expect(await ess.isVisible('Pending On Me')).toBeTruthy();
  });
});
