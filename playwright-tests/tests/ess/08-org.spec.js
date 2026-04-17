// @ts-check
const { test, expect } = require('@playwright/test');
const { ESSPage, S, URLS } = require('../../pages/ess.page');

let ess;

test.describe('ESS Org Module', () => {
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

  test('TC-O01: Org Dashboard loads correctly', async () => {
    await ess.goto(URLS.org.dashboard);
    expect(await ess.verifyUrl('/ess/hr/dashboard')).toBeTruthy();
    await ess.screenshot('O01-org-dashboard');
  });

  test('TC-O02: All Org sub-tabs are visible', async () => {
    await ess.goto(URLS.org.dashboard);
    expect(await ess.isVisible('Dashboard')).toBeTruthy();
    expect(await ess.isVisible('Directory')).toBeTruthy();
    expect(await ess.isVisible('Policy')).toBeTruthy();
    expect(await ess.isVisible('Knowledge Base')).toBeTruthy();
    expect(await ess.isVisible('Helpdesk')).toBeTruthy();
    expect(await ess.isVisible('Reports')).toBeTruthy();
  });

  test('TC-O03: Reporting tabs are visible (Direct, Indirect, Department)', async () => {
    await ess.goto(URLS.org.dashboard);
    expect(await ess.isVisible('Direct Reporting')).toBeTruthy();
    expect(await ess.isVisible('Indirect Reporting')).toBeTruthy();
    expect(await ess.isVisible('Department')).toBeTruthy();
  });

  test('TC-O04: Average stats cards are visible', async () => {
    await ess.goto(URLS.org.dashboard);
    expect(await ess.isVisible('Average working hours')).toBeTruthy();
    expect(await ess.isVisible('Average leave taken')).toBeTruthy();
    expect(await ess.isVisible('Average early going')).toBeTruthy();
    expect(await ess.isVisible('Average late arrival')).toBeTruthy();
  });

  test('TC-O05: Leaderboard section is visible', async () => {
    await ess.goto(URLS.org.dashboard);
    expect(await ess.isVisible('Leaderboard')).toBeTruthy();
  });

  test('TC-O06: Need Attention section is visible', async () => {
    await ess.goto(URLS.org.dashboard);
    await ess.scrollToBottom();
    expect(await ess.isVisible('Need Attention')).toBeTruthy();
  });

  test('TC-O07: Indirect Reporting tab switches correctly', async () => {
    await ess.goto(URLS.org.dashboard);
    await ess.essPage.locator('text=Indirect Reporting').first().click();
    await ess.essPage.waitForTimeout(2000);
    await ess.screenshot('O07-indirect-reporting');
  });

  test('TC-O08: Department tab switches correctly', async () => {
    await ess.goto(URLS.org.dashboard);
    await ess.essPage.locator('text=Department').first().click();
    await ess.essPage.waitForTimeout(2000);
    await ess.screenshot('O08-department');
  });

  // ── Policy ────────────────────────────────────────────────

  test('TC-O09: Policy page loads correctly', async () => {
    await ess.goto(URLS.org.policy);
    expect(await ess.verifyUrl('/ess/hr/policy')).toBeTruthy();
    await ess.screenshot('O09-policy');
  });

  // ── Knowledge Base ────────────────────────────────────────

  test('TC-O10: Knowledge Base page loads correctly', async () => {
    await ess.goto(URLS.org.knowledgeBase);
    expect(await ess.verifyUrl('/ess/hr/knowledge-base')).toBeTruthy();
    await ess.screenshot('O10-knowledge-base');
  });

  // ── Reports ───────────────────────────────────────────────

  test('TC-O11: Reports page loads correctly', async () => {
    await ess.goto(URLS.org.reports);
    expect(await ess.verifyUrl('/ess/hr/reports')).toBeTruthy();
    await ess.screenshot('O11-reports');
  });
});
