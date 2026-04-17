// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/ess',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['html'], ['list']],
  timeout: 180000,

  use: {
    baseURL: 'https://www.zimyo.net',
    screenshot: 'only-on-failure',
    headless: false,
    ...devices['Desktop Chrome'],
  },
});
