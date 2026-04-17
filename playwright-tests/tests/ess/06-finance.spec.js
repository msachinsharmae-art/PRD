// @ts-check
const { test, expect } = require('@playwright/test');
const { ESSPage, S, URLS } = require('../../pages/ess.page');

let ess;

test.describe('ESS Finance Module', () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    ess = new ESSPage(page, context);
    await ess.loginToESS();
  });

  test.afterAll(async () => {
    await ess.essPage.context().close();
  });

  // ── Expense ───────────────────────────────────────────────

  test('TC-F01: My Expense page loads correctly', async () => {
    await ess.goto(URLS.finance.myExpense);
    expect(await ess.verifyUrl('/ess/finance-bundle/expense/my-expense')).toBeTruthy();
    await ess.screenshot('F01-my-expense');
  });

  test('TC-F02: Finance top tabs are visible (Expense, Travel Desk, Petty Cash, Vendor)', async () => {
    await ess.goto(URLS.finance.myExpense);
    const tabs = await ess.getVisibleTabs();
    expect(tabs.some(t => t.includes('Expense'))).toBeTruthy();
    expect(tabs.some(t => t.includes('Travel Desk'))).toBeTruthy();
    expect(tabs.some(t => t.includes('Petty Cash'))).toBeTruthy();
    expect(tabs.some(t => t.includes('Vendor'))).toBeTruthy();
  });

  test('TC-F03: Expense sub-tabs are visible (My Expense, AP Access, AP Report)', async () => {
    await ess.goto(URLS.finance.myExpense);
    expect(await ess.isVisible('My Expense')).toBeTruthy();
    expect(await ess.isVisible('AP Access')).toBeTruthy();
    expect(await ess.isVisible('AP Report')).toBeTruthy();
  });

  test('TC-F04: Raise New Request button is visible', async () => {
    await ess.goto(URLS.finance.myExpense);
    expect(await ess.isVisible('Raise New Request')).toBeTruthy();
  });

  test('TC-F05: Attached Policies link is visible', async () => {
    await ess.goto(URLS.finance.myExpense);
    expect(await ess.isVisible('Attached Policies')).toBeTruthy();
  });

  test('TC-F06: Expense summary cards are visible', async () => {
    await ess.goto(URLS.finance.myExpense);
    expect(await ess.isVisible('Expense Request Raised')).toBeTruthy();
    expect(await ess.isVisible('Request Approval Rate')).toBeTruthy();
    expect(await ess.isVisible('Pending Request On Me')).toBeTruthy();
  });

  test('TC-F07: Month Wise Expense chart section is visible', async () => {
    await ess.goto(URLS.finance.myExpense);
    await ess.scrollToBottom();
    expect(await ess.isVisible('Month Wise Expense')).toBeTruthy();
  });

  test('TC-F08: Category Wise Expenses section is visible', async () => {
    await ess.goto(URLS.finance.myExpense);
    await ess.scrollToBottom();
    expect(await ess.isVisible('Category Wise Expenses')).toBeTruthy();
  });

  // ── Tab switching ─────────────────────────────────────────

  test('TC-F09: Travel Desk tab is clickable', async () => {
    await ess.goto(URLS.finance.myExpense);
    await ess.clickTab('Travel Desk');
    await ess.screenshot('F09-travel-desk');
  });

  test('TC-F10: Petty Cash tab is clickable', async () => {
    await ess.goto(URLS.finance.myExpense);
    await ess.clickTab('Petty Cash');
    await ess.screenshot('F10-petty-cash');
  });

  test('TC-F11: Vendor tab is clickable', async () => {
    await ess.goto(URLS.finance.myExpense);
    await ess.clickTab('Vendor');
    await ess.screenshot('F11-vendor');
  });
});
