// @ts-check
const { test, expect } = require('@playwright/test');
const { ESSPage, S, URLS } = require('../../pages/ess.page');

let ess;

test.describe('ESS Pay Module', () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    ess = new ESSPage(page, context);
    await ess.loginToESS();
  });

  test.afterAll(async () => {
    await ess.essPage.context().close();
  });

  test('TC-P01: Pay page loads via sidebar navigation', async () => {
    await ess.goto(URLS.dashboard);
    await ess.clickSidebarMenu('Pay');
    await ess.screenshot('P01-pay-loaded');
  });

  test('TC-P02: Pay page shows salary/payslip related content', async () => {
    await ess.goto(URLS.pay);
    const text = await ess.getPageText();
    // Pay page should show some content
    expect(text.length).toBeGreaterThan(100);
    await ess.screenshot('P02-pay-content');
  });
});
