// @ts-check
// LoginPage — login-specific selectors and methods
const BasePage = require('./base.page');

class LoginPage extends BasePage {
  // Selectors
  selectors = {
    username: '#username',
    password: '#password',
    submitBtn: 'button[type="submit"]',
  };

  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    super(page);
  }
}

module.exports = LoginPage;
