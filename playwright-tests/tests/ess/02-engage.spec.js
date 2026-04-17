// @ts-check
const { test, expect } = require('@playwright/test');
const { ESSPage, S, URLS } = require('../../pages/ess.page');

let ess;

test.describe('ESS Engage Module', () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    ess = new ESSPage(page, context);
    await ess.loginToESS();
  });

  test.afterAll(async () => {
    await ess.essPage.context().close();
  });

  test('TC-E01: Engage page loads correctly', async () => {
    await ess.goto(URLS.engage);
    expect(await ess.verifyUrl('/ess/engage')).toBeTruthy();
    await ess.screenshot('E01-engage-loaded');
  });

  test('TC-E02: Feed section is visible', async () => {
    await ess.goto(URLS.engage);
    expect(await ess.isVisible('Feed')).toBeTruthy();
  });

  test('TC-E03: Groups section is visible', async () => {
    await ess.goto(URLS.engage);
    expect(await ess.isVisible('Groups')).toBeTruthy();
  });

  test('TC-E04: Direct Messages section is visible', async () => {
    await ess.goto(URLS.engage);
    expect(await ess.isVisible('Direct Messages')).toBeTruthy();
  });

  test('TC-E05: Post textarea "What\'s on your mind?" is visible', async () => {
    await ess.goto(URLS.engage);
    const textarea = ess.essPage.locator(S.engage.postTextarea);
    await expect(textarea).toBeVisible();
  });

  test('TC-E06: Appreciate button is visible', async () => {
    await ess.goto(URLS.engage);
    const btn = ess.essPage.locator(S.engage.appreciateBtn);
    await expect(btn).toBeVisible();
  });

  test('TC-E07: Schedule button is visible', async () => {
    await ess.goto(URLS.engage);
    const btn = ess.essPage.locator(S.engage.scheduleBtn);
    await expect(btn).toBeVisible();
  });

  test('TC-E08: Give Feedback button is visible', async () => {
    await ess.goto(URLS.engage);
    const btn = ess.essPage.locator(S.engage.giveFeedbackBtn);
    await expect(btn).toBeVisible();
  });

  test('TC-E09: Make Yourself Private toggle is visible', async () => {
    await ess.goto(URLS.engage);
    expect(await ess.isVisible('Make Yourself Private')).toBeTruthy();
  });

  test('TC-E10: Group search field is visible', async () => {
    await ess.goto(URLS.engage);
    const search = ess.essPage.locator(S.engage.searchGroup).first();
    await expect(search).toBeVisible();
  });
});
