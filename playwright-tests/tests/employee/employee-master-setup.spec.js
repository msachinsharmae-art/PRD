// @ts-check
// Login with new credentials and save session for employee master tests
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const CREDENTIALS = {
  username: 'sachin.sharma+demo@zimyo.com',
  password: 'Zimyo@12345',
};

test.setTimeout(60000);

test('Login and save session for employee master tests', async ({ page, context }) => {
  await page.goto('https://www.zimyo.net', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2000);

  await page.locator('#username').fill(CREDENTIALS.username);
  await page.locator('#password').fill(CREDENTIALS.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(8000);

  console.log('Post-login URL:', page.url());
  await page.screenshot({ path: 'screenshots/employee-master-login.png', fullPage: true });

  // Save session state
  const storageState = await context.storageState();
  const sessionPath = path.join(__dirname, '..', 'auth', 'session.json');
  fs.writeFileSync(sessionPath, JSON.stringify(storageState, null, 2));
  console.log('Session saved to:', sessionPath);
});
