// @ts-check
// REUSABLE PAYROLL SESSION
// Uses saved auth cookies — goes directly to Payroll, no re-login.
// Browser stays open at the end for real-time viewing.

const { test, expect, chromium } = require('@playwright/test');
const fs = require('fs');

test.setTimeout(0); // No timeout — browser stays open

/**
 * Helper: Log progress to PROGRESS.md
 */
function logProgress(testId, feature, description, status) {
  const progressFile = 'PROGRESS.md';
  const content = fs.readFileSync(progressFile, 'utf-8');
  const date = new Date().toISOString().split('T')[0];
  const entry = `| ${testId} | ${feature} | ${description} | ${status} | ${date} |`;

  if (!content.includes('## Live Test Log')) {
    fs.appendFileSync(progressFile, `\n\n## Live Test Log\n| Test ID | Feature | Description | Status | Date |\n|---------|---------|-------------|--------|------|\n`);
  }
  fs.appendFileSync(progressFile, entry + '\n');
}

/**
 * Helper: Log error to ERRORS.md
 */
function logError(testId, feature, error, screenshot) {
  const errorFile = 'ERRORS.md';
  const content = fs.readFileSync(errorFile, 'utf-8');
  const date = new Date().toISOString().split('T')[0];
  const entry = `| ${date} | ${testId} | ${feature} | ${error} | ${screenshot} | OPEN |`;

  // Replace "_No errors recorded yet._" if first error
  if (content.includes('_No errors recorded yet._')) {
    const updated = content.replace(
      '_No errors recorded yet._',
      `| Date | Test ID | Feature | Error | Screenshot | Status |\n|------|---------|---------|-------|------------|--------|\n${entry}`
    );
    fs.writeFileSync(errorFile, updated);
  } else {
    fs.appendFileSync(errorFile, entry + '\n');
  }
}

// Export helpers so other test files can import
module.exports = { logProgress, logError };

test('Payroll Persistent Session', async () => {
  // Load saved auth session
  const storageState = JSON.parse(fs.readFileSync('auth/session.json', 'utf-8'));

  // Launch browser with saved cookies — NO LOGIN NEEDED
  const browser = await chromium.launch({
    headless: false,
    slowMo: 200,
    args: ['--start-maximized'],
  });
  const context = await browser.newContext({
    storageState,
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();

  // Go directly to Payroll
  console.log('>>> Opening Payroll directly (session reused)...');
  await page.goto('https://www.zimyo.net/payroll/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(5000);

  console.log('>>> Payroll loaded. URL:', page.url());
  await page.screenshot({ path: 'screenshots/payroll-session-ready.png', fullPage: true });

  // ========================================
  // PAYROLL IS NOW OPEN — BROWSER STAYS OPEN
  // Add test actions below this line
  // ========================================

  console.log('>>> Session ready. Browser open on Payroll. Waiting...');
  await page.pause(); // Keeps browser open for user to view

  await browser.close();
});
