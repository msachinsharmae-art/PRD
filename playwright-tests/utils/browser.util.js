// @ts-check
// Browser utility — persistent Chrome session reuse
// RULE: Never kill all Chrome. Single browser. Don't reopen from scratch.
const { chromium } = require('@playwright/test');
const path = require('path');

const BROWSER_PROFILE = path.join(__dirname, '..', 'browser-profile');

const BROWSER_OPTIONS = {
  headless: false,
  slowMo: 200,
  viewport: { width: 1280, height: 720 },
  args: ['--disable-blink-features=AutomationControlled'],
};

/**
 * Launch a persistent browser context (reuses cookies/session).
 * Returns { context, page }.
 */
async function launchPersistentBrowser() {
  const context = await chromium.launchPersistentContext(BROWSER_PROFILE, BROWSER_OPTIONS);
  const page = context.pages()[0] || await context.newPage();
  return { context, page };
}

/**
 * Keep browser open for manual inspection (default 10 min).
 */
async function keepBrowserOpen(page, ms = 600000) {
  console.log(`>>> Browser stays open for ${ms / 60000} min.`);
  await page.waitForTimeout(ms).catch(() => {
    console.log('>>> Browser was closed manually.');
  });
}

module.exports = {
  launchPersistentBrowser,
  keepBrowserOpen,
  BROWSER_PROFILE,
  BROWSER_OPTIONS,
};
