// @ts-check
const { test, expect } = require('@playwright/test');
const { ESSPage, S, URLS } = require('../../pages/ess.page');

let ess;

test.describe('ESS Rewards & Recognition Module', () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    ess = new ESSPage(page, context);
    await ess.loginToESS();
  });

  test.afterAll(async () => {
    await ess.essPage.context().close();
  });

  // ── Home ──────────────────────────────────────────────────

  test('TC-RR01: Rewards Home page loads correctly', async () => {
    await ess.goto(URLS.rewards.home);
    expect(await ess.verifyUrl('/ess/rewards/home')).toBeTruthy();
    await ess.screenshot('RR01-rewards-home');
  });

  test('TC-RR02: All R&R tabs are visible (Home, My Recognitions, Wallet)', async () => {
    await ess.goto(URLS.rewards.home);
    const tabs = await ess.getVisibleTabs();
    expect(tabs.some(t => t.includes('Home'))).toBeTruthy();
    expect(tabs.some(t => t.includes('My Recognitions'))).toBeTruthy();
    expect(tabs.some(t => t.includes('Wallet'))).toBeTruthy();
  });

  test('TC-RR03: R&R Overview section with Badges, Points, Leaderboard is visible', async () => {
    await ess.goto(URLS.rewards.home);
    expect(await ess.isVisible('R&R Overview')).toBeTruthy();
    expect(await ess.isVisible('Badges')).toBeTruthy();
    expect(await ess.isVisible('Points')).toBeTruthy();
    expect(await ess.isVisible('Leaderboard')).toBeTruthy();
  });

  test('TC-RR04: Available Points card is visible', async () => {
    await ess.goto(URLS.rewards.home);
    expect(await ess.isVisible('Available Points')).toBeTruthy();
  });

  test('TC-RR05: Recognize button is visible', async () => {
    await ess.goto(URLS.rewards.home);
    const btn = ess.essPage.locator(S.rewards.recognizeBtn);
    await expect(btn).toBeVisible();
  });

  test('TC-RR06: Clicking Recognize opens the form', async () => {
    await ess.goto(URLS.rewards.home);
    await ess.essPage.locator(S.rewards.recognizeBtn).click();
    await ess.essPage.waitForTimeout(2000);
    await ess.screenshot('RR06-recognize-form');
    await ess.closeModal();
  });

  test('TC-RR07: Recognition Wall is visible with Team/Organisation toggle', async () => {
    await ess.goto(URLS.rewards.home);
    expect(await ess.isVisible('Recognition Wall')).toBeTruthy();
    expect(await ess.isVisible('Team')).toBeTruthy();
    expect(await ess.isVisible('Organisation')).toBeTruthy();
  });

  test('TC-RR08: Monthly Activity chart is visible', async () => {
    await ess.goto(URLS.rewards.home);
    expect(await ess.isVisible('Monthly Activity')).toBeTruthy();
  });

  test('TC-RR09: My Badges section is visible (Given / Received)', async () => {
    await ess.goto(URLS.rewards.home);
    await ess.scrollToBottom();
    expect(await ess.isVisible('My Badges')).toBeTruthy();
    expect(await ess.isVisible('Given')).toBeTruthy();
    expect(await ess.isVisible('Received')).toBeTruthy();
  });

  test('TC-RR10: Engagement Leaders section is visible', async () => {
    await ess.goto(URLS.rewards.home);
    await ess.scrollToBottom();
    expect(await ess.isVisible('Engagement Leaders')).toBeTruthy();
  });

  test('TC-RR11: Top Receivers leaderboard is visible', async () => {
    await ess.goto(URLS.rewards.home);
    await ess.scrollToBottom();
    expect(await ess.isVisible('Top Receivers')).toBeTruthy();
  });

  test('TC-RR12: Top Senders leaderboard is visible', async () => {
    await ess.goto(URLS.rewards.home);
    await ess.scrollToBottom();
    expect(await ess.isVisible('Top Senders')).toBeTruthy();
  });

  // ── Wallet ────────────────────────────────────────────────

  test('TC-RR13: Wallet page loads correctly', async () => {
    await ess.goto(URLS.rewards.wallet);
    expect(await ess.verifyUrl('/ess/rewards/wallet')).toBeTruthy();
    await ess.screenshot('RR13-wallet');
  });
});
