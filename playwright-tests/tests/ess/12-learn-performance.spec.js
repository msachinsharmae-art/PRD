// @ts-check
const { test, expect } = require('@playwright/test');
const { ESSPage, S, URLS } = require('../../pages/ess.page');

let ess;

test.describe('ESS Learn & Performance Modules', () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    ess = new ESSPage(page, context);
    await ess.loginToESS();
  });

  test.afterAll(async () => {
    await ess.essPage.context().close();
  });

  // ── Learn ─────────────────────────────────────────────────

  test('TC-L01: Learn page loads correctly', async () => {
    await ess.goto(URLS.learn);
    expect(await ess.verifyUrl('/ess/learn')).toBeTruthy();
    await ess.screenshot('L01-learn');
  });

  // ── Performance ───────────────────────────────────────────

  test('TC-PF01: Performance page loads correctly', async () => {
    await ess.goto(URLS.performance);
    expect(await ess.verifyUrl('/ess/performance')).toBeTruthy();
    await ess.screenshot('PF01-performance');
  });
});
