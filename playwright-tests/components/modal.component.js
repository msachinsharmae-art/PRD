// @ts-check
// ModalComponent — reusable modal/dialog interactions (confirm, dismiss, detect)

class ModalComponent {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  /**
   * Click the Confirm button in a dialog/modal.
   * Handles Zimyo's confirm popup after Save.
   */
  async confirm() {
    console.log('>>> Confirm...');
    await this.page.waitForTimeout(2000);
    try {
      await this.page.locator('button').filter({ hasText: /^Confirm$/i }).first().click();
    } catch {
      // Fallback: look inside role="dialog"
      await this.page.locator('[role="dialog"] button')
        .filter({ hasText: /confirm|yes|ok/i }).first().click().catch(() => {});
    }
    await this.page.waitForTimeout(5000);
  }

  /**
   * Dismiss/close a modal by clicking close button or Cancel.
   */
  async dismiss() {
    try {
      await this.page.locator('[role="dialog"] button')
        .filter({ hasText: /close|cancel|no/i }).first().click();
    } catch {
      // Try the X button
      await this.page.locator('[role="dialog"] [class*="close"], [role="dialog"] svg')
        .first().click().catch(() => {});
    }
    await this.page.waitForTimeout(2000);
  }

  /**
   * Check if a dialog/modal is currently visible.
   */
  async isVisible() {
    return await this.page.locator('[role="dialog"]').isVisible().catch(() => false);
  }

  /**
   * Wait for a modal to appear.
   */
  async waitForModal(timeout = 10000) {
    await this.page.locator('[role="dialog"]').waitFor({ state: 'visible', timeout }).catch(() => {});
  }

  /**
   * Get any error messages displayed on page (alerts, error elements).
   */
  async getPageErrors() {
    return await this.page.evaluate(() => {
      const errEls = document.querySelectorAll(
        '[class*="error"], [class*="Error"], [class*="alert"], [role="alert"]'
      );
      return Array.from(errEls)
        .filter(e => e.offsetHeight > 0)
        .map(e => e.textContent?.trim()?.substring(0, 200));
    });
  }
}

module.exports = ModalComponent;
