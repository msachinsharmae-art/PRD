// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/exploration',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['./utils/mixpanel-reporter.js']],
  timeout: 120000,

  use: {
    baseURL: 'https://www.zimyo.net',
    screenshot: 'only-on-failure',
    headless: false,
    ...devices['Desktop Chrome'],
  },
});
