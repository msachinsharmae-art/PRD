// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  testIgnore: ['**/exploration/**'],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['html'], ['list'], ['./utils/mixpanel-reporter.js']],
  timeout: 120000,

  use: {
    baseURL: 'https://www.zimyo.net',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true,
    ...devices['Desktop Chrome'],
  },

  projects: [
    {
      name: 'auth',
      testDir: './tests/auth',
    },
    {
      name: 'payroll',
      testDir: './tests/payroll',
    },
    {
      name: 'employee',
      testDir: './tests/employee',
    },
  ],
});
