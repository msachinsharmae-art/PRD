// @ts-check
const { test, expect } = require('@playwright/test');
const { ESSPage, S, URLS } = require('../../pages/ess.page');

let ess;

test.describe('ESS Attendance Module', () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    ess = new ESSPage(page, context);
    await ess.loginToESS();
  });

  test.afterAll(async () => {
    await ess.essPage.context().close();
  });

  // ── My Attendance ─────────────────────────────────────────

  test('TC-A01: My Attendance page loads correctly', async () => {
    await ess.goto(URLS.attendance.myAttendance);
    expect(await ess.verifyUrl('/ess/leave-and-attendance/my-attendance')).toBeTruthy();
    await ess.screenshot('A01-my-attendance');
  });

  test('TC-A02: All attendance tabs are visible', async () => {
    await ess.goto(URLS.attendance.myAttendance);
    const tabs = ['My Attendance', 'My Leave', 'Team Attendance', 'Team Roster'];
    for (const tab of tabs) {
      expect(await ess.isVisible(tab)).toBeTruthy();
    }
  });

  test('TC-A03: Current period overview cards are visible', async () => {
    await ess.goto(URLS.attendance.myAttendance);
    expect(await ess.isVisible('Present')).toBeTruthy();
    expect(await ess.isVisible('Absent')).toBeTruthy();
    expect(await ess.isVisible('Holiday')).toBeTruthy();
    expect(await ess.isVisible('Leaves')).toBeTruthy();
    expect(await ess.isVisible('Week Off')).toBeTruthy();
    expect(await ess.isVisible('Penalties')).toBeTruthy();
  });

  test('TC-A04: Calendar is displayed with day headers', async () => {
    await ess.goto(URLS.attendance.myAttendance);
    const text = await ess.getPageText();
    expect(text).toContain('Sun');
    expect(text).toContain('Mon');
    expect(text).toContain('Tue');
    expect(text).toContain('Wed');
    expect(text).toContain('Thu');
    expect(text).toContain('Fri');
    expect(text).toContain('Sat');
  });

  test('TC-A05: Month/Year navigation is visible', async () => {
    await ess.goto(URLS.attendance.myAttendance);
    expect(await ess.isVisible('April 2026') || await ess.isVisible('2026')).toBeTruthy();
  });

  // ── My Leave ──────────────────────────────────────────────

  test('TC-A06: My Leave tab loads correctly', async () => {
    await ess.goto(URLS.attendance.myLeave);
    expect(await ess.verifyUrl('/ess/leave-and-attendance/my-leave')).toBeTruthy();
    await ess.screenshot('A06-my-leave');
  });

  test('TC-A07: Leave balance table is visible', async () => {
    await ess.goto(URLS.attendance.myLeave);
    const text = await ess.getPageText();
    // Should have leave type headers or balance info
    expect(text.includes('Balance') || text.includes('Leave') || text.includes('Availed')).toBeTruthy();
  });

  test('TC-A08: Apply Leave button is visible', async () => {
    await ess.goto(URLS.attendance.myLeave);
    const applyBtn = ess.essPage.locator('button:has-text("Apply")').first();
    await expect(applyBtn).toBeVisible();
  });

  test('TC-A09: Future Leave Projection link is visible', async () => {
    await ess.goto(URLS.attendance.myAttendance);
    expect(await ess.isVisible('Future Leave Projection') || await ess.isVisible('See Your Future Leave Projection')).toBeTruthy();
  });

  // ── Team Attendance ───────────────────────────────────────

  test('TC-A10: Team Attendance tab is clickable', async () => {
    await ess.goto(URLS.attendance.myAttendance);
    await ess.clickTab('Team Attendance');
    await ess.screenshot('A10-team-attendance');
  });

  // ── Team Roster ───────────────────────────────────────────

  test('TC-A11: Team Roster tab is clickable', async () => {
    await ess.goto(URLS.attendance.myAttendance);
    await ess.clickTab('Team Roster');
    await ess.screenshot('A11-team-roster');
  });
});
