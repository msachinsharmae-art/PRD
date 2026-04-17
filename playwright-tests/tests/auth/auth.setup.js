// @ts-check
const { test: setup } = require('@playwright/test');

// This setup runs ONCE and saves the login session
// All subsequent tests reuse the saved cookies — no re-login needed
setup('Save login session', async ({ page, context }) => {
  await page.goto('https://www.zimyo.net', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(3000);

  await page.locator('#username').fill('sachin.sharma+demo@zimyo.com');
  await page.locator('#password').fill('Zimyo@12345');
  await page.locator('button[type="submit"]').click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(6000);

  // Save the authenticated session
  await context.storageState({ path: 'auth/session.json' });
  console.log('Session saved to auth/session.json');
});
