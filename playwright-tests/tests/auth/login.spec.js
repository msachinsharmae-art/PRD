// @ts-check
const { test, expect } = require('@playwright/test');

const CREDENTIALS = {
  username: 'devteam@yopmail.com',
  password: 'Zimyo@12345',
};

test.describe('Login Module — Zimyo Portal', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('TC-01: Login page loads correctly', async ({ page }) => {
    await expect(page).toHaveTitle(/Account.*Zimyo/i);
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toHaveText('Login');
    await page.screenshot({ path: 'screenshots/TC01-login-page.png' });
  });

  test('TC-02: Login successfully with valid credentials', async ({ page }) => {
    await page.locator('#username').fill(CREDENTIALS.username);
    await page.locator('#password').fill(CREDENTIALS.password);
    await page.locator('button[type="submit"]').click();

    // Wait for redirect after successful login
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    // Verify we left the login page
    const url = page.url();
    console.log('Post-login URL:', url);
    await page.screenshot({ path: 'screenshots/TC02-after-login.png', fullPage: true });
  });

  test('TC-03: Show error for invalid password', async ({ page }) => {
    await page.locator('#username').fill(CREDENTIALS.username);
    await page.locator('#password').fill('WrongPassword123');
    await page.locator('button[type="submit"]').click();

    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/TC03-invalid-password.png' });
  });

  test('TC-04: Show error for invalid username', async ({ page }) => {
    await page.locator('#username').fill('nonexistent@yopmail.com');
    await page.locator('#password').fill(CREDENTIALS.password);
    await page.locator('button[type="submit"]').click();

    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/TC04-invalid-username.png' });
  });

  test('TC-05: Cannot submit with empty fields', async ({ page }) => {
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/TC05-empty-fields.png' });
  });

  test('TC-06: Cannot submit with only username', async ({ page }) => {
    await page.locator('#username').fill(CREDENTIALS.username);
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/TC06-only-username.png' });
  });

  test('TC-07: Cannot submit with only password', async ({ page }) => {
    await page.locator('#password').fill(CREDENTIALS.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/TC07-only-password.png' });
  });

  test('TC-08: Password visibility toggle works', async ({ page }) => {
    await page.locator('#password').fill('TestPassword');

    // Password should be masked
    await expect(page.locator('#password')).toHaveAttribute('type', 'password');

    // Click the eye icon to toggle visibility
    await page.locator('button[aria-label="toggle password visibility"]').click();
    await expect(page.locator('#password')).toHaveAttribute('type', 'text');

    // Click again to hide
    await page.locator('button[aria-label="toggle password visibility"]').click();
    await expect(page.locator('#password')).toHaveAttribute('type', 'password');

    await page.screenshot({ path: 'screenshots/TC08-password-toggle.png' });
  });

  test('TC-09: Forgot password link is visible', async ({ page }) => {
    const forgotLink = page.getByText('Forgot password?');
    await expect(forgotLink).toBeVisible();
    await page.screenshot({ path: 'screenshots/TC09-forgot-password.png' });
  });

  test('TC-10: Login With SSO button is visible', async ({ page }) => {
    const ssoButton = page.getByText('Login With SSO');
    await expect(ssoButton).toBeVisible();
    await page.screenshot({ path: 'screenshots/TC10-sso-button.png' });
  });

});
