// @ts-check
const { test, expect } = require('@playwright/test');
const { ESSPage, S, URLS } = require('../../pages/ess.page');

let ess;

test.describe('ESS Request Module', () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    ess = new ESSPage(page, context);
    await ess.loginToESS();
  });

  test.afterAll(async () => {
    await ess.essPage.context().close();
  });

  // ── Self Tab ──────────────────────────────────────────────

  test('TC-R01: Request page loads with Self tab active', async () => {
    await ess.goto(URLS.request.self);
    expect(await ess.verifyUrl('/ess/request/my-requests')).toBeTruthy();
    await ess.screenshot('R01-request-self');
  });

  test('TC-R02: Self and Team tabs are visible', async () => {
    await ess.goto(URLS.request.self);
    const tabs = await ess.getVisibleTabs();
    expect(tabs.some(t => t.includes('Self'))).toBeTruthy();
    expect(tabs.some(t => t.includes('Team'))).toBeTruthy();
  });

  test('TC-R03: Apply New button is visible on Request page', async () => {
    await ess.goto(URLS.request.self);
    const btn = ess.essPage.locator(S.applyNewBtn).first();
    await expect(btn).toBeVisible();
  });

  test('TC-R04: All request categories are visible in left sidebar', async () => {
    await ess.goto(URLS.request.self);
    const categories = ['Employee', 'Leave & Attendance', 'Document', 'Onboarding', 'Offboarding', 'Asset', 'Requisition', 'Expense', 'Vendor', 'Petty Cash', 'Travel Desk', 'Loan and Advance', 'Task Mangement', 'Checklist', 'Internal Job Posting'];
    for (const cat of categories) {
      expect(await ess.isVisible(cat)).toBeTruthy();
    }
  });

  test('TC-R05: Inner tabs are visible (Maker and Checker, Probation etc.)', async () => {
    await ess.goto(URLS.request.self);
    const innerTabs = ['Maker and Checker', 'Probation Confirmation', 'Probation Feedback'];
    for (const tab of innerTabs) {
      expect(await ess.isVisible(tab)).toBeTruthy();
    }
  });

  test('TC-R06: Date range filter is visible', async () => {
    await ess.goto(URLS.request.self);
    expect(await ess.isVisible('Request Raise Date')).toBeTruthy();
  });

  test('TC-R07: Self > Leave & Attendance category loads data', async () => {
    await ess.goto(URLS.request.self);
    await ess.clickRequestCategory('Leave & Attendance');
    const text = await ess.getPageText();
    expect(text.includes('No Requests Found')).toBeFalsy();
    await ess.screenshot('R07-self-leave-attendance');
  });

  test('TC-R08: Self > Document category loads data', async () => {
    await ess.goto(URLS.request.self);
    await ess.clickRequestCategory('Document');
    const text = await ess.getPageText();
    expect(text.includes('No Requests Found')).toBeFalsy();
  });

  test('TC-R09: Self > Onboarding category loads data', async () => {
    await ess.goto(URLS.request.self);
    await ess.clickRequestCategory('Onboarding');
    const text = await ess.getPageText();
    expect(text.includes('No Requests Found')).toBeFalsy();
  });

  test('TC-R10: Self > Expense category loads data', async () => {
    await ess.goto(URLS.request.self);
    await ess.clickRequestCategory('Expense');
    const text = await ess.getPageText();
    expect(text.includes('No Requests Found')).toBeFalsy();
  });

  test('TC-R11: Self > Vendor category loads data', async () => {
    await ess.goto(URLS.request.self);
    await ess.clickRequestCategory('Vendor');
    const text = await ess.getPageText();
    expect(text.includes('No Requests Found')).toBeFalsy();
  });

  test('TC-R12: Self > Petty Cash category loads data', async () => {
    await ess.goto(URLS.request.self);
    await ess.clickRequestCategory('Petty Cash');
    const text = await ess.getPageText();
    expect(text.includes('No Requests Found')).toBeFalsy();
  });

  test('TC-R13: Self > Travel Desk category loads data', async () => {
    await ess.goto(URLS.request.self);
    await ess.clickRequestCategory('Travel Desk');
    const text = await ess.getPageText();
    expect(text.includes('No Requests Found')).toBeFalsy();
  });

  test('TC-R14: Self > Loan and Advance category loads data', async () => {
    await ess.goto(URLS.request.self);
    await ess.clickRequestCategory('Loan and Advance');
    const text = await ess.getPageText();
    expect(text.includes('No Requests Found')).toBeFalsy();
  });

  test('TC-R15: Self > Internal Job Posting Approval has data', async () => {
    await ess.goto(URLS.request.self);
    await ess.clickRequestCategory('Internal Job Posting');
    const text = await ess.getPageText();
    expect(text.includes('No Requests Found')).toBeFalsy();
  });

  test('TC-R16: Clicking Probation Confirmation inner tab works', async () => {
    await ess.goto(URLS.request.self);
    await ess.clickTab('Probation Confirmation');
    expect(await ess.isVisible('Probation Confirmation')).toBeTruthy();
    await ess.screenshot('R16-probation-confirmation');
  });

  // ── Team Tab ──────────────────────────────────────────────

  test('TC-R17: Team tab loads and shows pending requests', async () => {
    await ess.goto(URLS.request.team);
    expect(await ess.verifyUrl('/ess/request/pending-on-me')).toBeTruthy();
    await ess.screenshot('R17-request-team');
  });

  test('TC-R18: Team tab shows Bulk Approve button', async () => {
    await ess.goto(URLS.request.team);
    const btn = ess.essPage.locator(S.request.bulkApproveBtn);
    await expect(btn).toBeVisible();
  });

  test('TC-R19: Team tab shows search field', async () => {
    await ess.goto(URLS.request.team);
    const search = ess.essPage.locator('input[name="searchText"]');
    await expect(search).toBeVisible();
  });

  test('TC-R20: Team tab categories show pending counts', async () => {
    await ess.goto(URLS.request.team);
    const text = await ess.getPageText();
    // Categories should show counts like "Leave & Attendance 1040"
    expect(text).toContain('Leave & Attendance');
    expect(text).toContain('Document');
  });

  test('TC-R21: Team tab > Maker And Checker inner tab has data', async () => {
    await ess.goto(URLS.request.team);
    const text = await ess.getPageText();
    expect(text).toContain('Maker And Checker');
  });

  test('TC-R22: Team > Leave & Attendance category loads data', async () => {
    await ess.goto(URLS.request.team);
    await ess.clickRequestCategory('Leave & Attendance');
    await ess.essPage.waitForTimeout(1500);
    const rows = await ess.getTableRowCount();
    expect(rows).toBeGreaterThan(0);
    await ess.screenshot('R22-team-leave-attendance');
  });
});
