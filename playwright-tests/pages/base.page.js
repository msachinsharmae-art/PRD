// @ts-check
// BasePage — shared navigation and session helpers for all pages
const { CREDENTIALS, BASE_URL, TIMEOUTS } = require('../utils/constants');
const { injectMixpanel } = require('../utils/mixpanel-init');

class BasePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    injectMixpanel(page);
  }

  /**
   * Navigate to a URL and wait for network idle.
   */
  async goto(url) {
    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUTS.navigation });
    await this.page.waitForLoadState('networkidle').catch(() => {});
    await this.page.waitForTimeout(TIMEOUTS.afterAction);
  }

  /**
   * Check if user is logged in (not on login page).
   */
  async isLoggedIn() {
    const url = this.page.url();
    return !url.includes('/login') && url !== BASE_URL + '/';
  }

  /**
   * Login to Zimyo if not already logged in.
   */
  async login() {
    await this.goto(BASE_URL);
    await this.page.waitForTimeout(5000);

    const url = this.page.url();
    if (!url.includes('/login') && url !== BASE_URL + '/') {
      console.log('>>> Already logged in:', url);
      return;
    }

    console.log('>>> Logging in...');
    await this.page.locator('#username').waitFor({ state: 'visible', timeout: TIMEOUTS.element });
    await this.page.locator('#username').click();
    await this.page.locator('#username').fill(CREDENTIALS.username);
    await this.page.locator('#password').click();
    await this.page.locator('#password').fill(CREDENTIALS.password);
    await this.page.waitForTimeout(TIMEOUTS.short);
    await this.page.locator('button[type="submit"]').click();
    await this.page.waitForTimeout(10000);
    console.log('>>> Logged in:', this.page.url());
    const { trackInBrowser } = require('../utils/mixpanel-init');
    await trackInBrowser(this.page, 'Sign In', {
      user_id: 'zimyo-qa-tester',
      login_method: 'email',
      success: true,
    });
  }

  /**
   * Ensure user is logged in, then navigate to target URL.
   */
  async loginAndGoto(url) {
    // Try going directly first (session may be active)
    await this.goto(url);
    await this.page.waitForTimeout(3000);

    if (!(await this.isLoggedIn())) {
      await this.login();
      await this.goto(url);
      await this.page.waitForTimeout(TIMEOUTS.networkIdle);
    }
  }

  /**
   * Take a screenshot with a descriptive name.
   */
  async screenshot(name) {
    await this.page.screenshot({ path: `screenshots/${name}.png` });
  }

  /**
   * Take a full-page screenshot.
   */
  async screenshotFull(name) {
    await this.page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
  }

  /**
   * Track an error event in Mixpanel.
   */
  async trackError(errorType, errorMessage, errorCode = '') {
    await this.page.evaluate(({ type, message, code }) => {
      if (window.mixpanel) {
        window.mixpanel.track('Error', {
          error_type: type,
          error_message: message,
          error_code: code,
          page_url: window.location.href,
          user_id: 'zimyo-qa-tester',
        });
      }
    }, { type: errorType, message: errorMessage, code: errorCode });
  }
}

module.exports = BasePage;
