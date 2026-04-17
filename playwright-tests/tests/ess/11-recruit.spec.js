// @ts-check
const { test, expect } = require('@playwright/test');
const { ESSPage, S, URLS } = require('../../pages/ess.page');

let ess;

test.describe('ESS Recruit Module', () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    ess = new ESSPage(page, context);
    await ess.loginToESS();
  });

  test.afterAll(async () => {
    await ess.essPage.context().close();
  });

  // ── My Requisition ────────────────────────────────────────

  test('TC-RC01: My Requisition page loads correctly', async () => {
    await ess.goto(URLS.recruit.myRequisition);
    expect(await ess.verifyUrl('/ess/recruit/requisition/my-requisition')).toBeTruthy();
    await ess.screenshot('RC01-my-requisition');
  });

  test('TC-RC02: Requisition and Interviews tabs are visible', async () => {
    await ess.goto(URLS.recruit.myRequisition);
    expect(await ess.isVisible('Requisition')).toBeTruthy();
    expect(await ess.isVisible('Interviews')).toBeTruthy();
  });

  test('TC-RC03: Self and Team sub-tabs are visible', async () => {
    await ess.goto(URLS.recruit.myRequisition);
    expect(await ess.isVisible('Self')).toBeTruthy();
    expect(await ess.isVisible('Team')).toBeTruthy();
  });

  test('TC-RC04: Create New button is visible', async () => {
    await ess.goto(URLS.recruit.myRequisition);
    expect(await ess.isVisible('Create New')).toBeTruthy();
  });

  test('TC-RC05: Requisition table has data with correct columns', async () => {
    await ess.goto(URLS.recruit.myRequisition);
    const text = await ess.getPageText();
    expect(text).toContain('Requisition Id');
    expect(text).toContain('Created By');
    expect(text).toContain('Status');
  });

  test('TC-RC06: Status filter dropdown is visible', async () => {
    await ess.goto(URLS.recruit.myRequisition);
    expect(await ess.isVisible('Status')).toBeTruthy();
  });

  test('TC-RC07: Create New opens the requisition form', async () => {
    await ess.goto(URLS.recruit.myRequisition);
    await ess.essPage.locator('button:has-text("Create New")').click();
    await ess.essPage.waitForTimeout(3000);
    expect(await ess.isVisible('Create Requisition')).toBeTruthy();
    await ess.screenshot('RC07-create-requisition-form');
    // Verify form fields
    expect(await ess.isVisible('Minimum Salary')).toBeTruthy();
    expect(await ess.isVisible('Maximum Salary')).toBeTruthy();
    expect(await ess.isVisible('Job Description')).toBeTruthy();
    expect(await ess.isVisible('Submit')).toBeTruthy();
    expect(await ess.isVisible('Cancel')).toBeTruthy();
  });

  // ── Team Requisition ──────────────────────────────────────

  test('TC-RC08: Team Requisition page loads', async () => {
    await ess.goto(URLS.recruit.teamRequisition);
    expect(await ess.verifyUrl('/ess/recruit/requisition/emp-requisition')).toBeTruthy();
    await ess.screenshot('RC08-team-requisition');
  });

  // ── Interviews ────────────────────────────────────────────

  test('TC-RC09: Interviews page loads', async () => {
    await ess.goto(URLS.recruit.interviews);
    expect(await ess.verifyUrl('/ess/recruit/interviews')).toBeTruthy();
    await ess.screenshot('RC09-interviews');
  });
});
