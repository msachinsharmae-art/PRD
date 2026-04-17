// @ts-check
// TableComponent — reusable table interactions (search, find row, checkbox, scroll)

class TableComponent {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  /**
   * Search in a table's search input.
   */
  async search(placeholder, text) {
    const input = this.page.locator(`input[placeholder="${placeholder}"]`);
    await input.waitFor({ state: 'visible', timeout: 15000 });
    await input.fill(text);
    await this.page.waitForTimeout(3000);
  }

  /**
   * Search employees using the standard Zimyo search bar.
   */
  async searchEmployee(name) {
    await this.search('Search Employees', name);
  }

  /**
   * Click an employee row by name text.
   */
  async clickEmployee(name) {
    console.log(`>>> Click ${name}...`);
    await this.page.getByText(name, { exact: false }).first().click();
    await this.page.waitForLoadState('networkidle').catch(() => {});
    await this.page.waitForTimeout(5000);
  }

  /**
   * Check if an employee name is visible in the current table/tab.
   */
  async isEmployeeVisible(name) {
    return await this.page.getByText(name, { exact: false }).isVisible().catch(() => false);
  }

  /**
   * Select checkbox for an employee row by name.
   */
  async selectEmployeeCheckbox(name) {
    await this.page.evaluate((empName) => {
      for (const row of document.querySelectorAll('tr')) {
        if (row.textContent?.toLowerCase().includes(empName.toLowerCase())) {
          const cb = row.querySelector('input[type="checkbox"]');
          if (cb && !cb.checked) cb.click();
        }
      }
    }, name);
    await this.page.waitForTimeout(2000);
  }

  /**
   * Get error info for an employee from a table row.
   */
  async getEmployeeRowInfo(name) {
    return await this.page.evaluate((empName) => {
      for (const row of document.querySelectorAll('tr, [class*="row"]')) {
        if (row.textContent?.toLowerCase().includes(empName.toLowerCase())) {
          return Array.from(row.querySelectorAll('td')).map(c => c.textContent?.trim()).join(' | ');
        }
      }
      return null;
    }, name);
  }

  /**
   * Scroll down to find an employee (useful for long lists).
   */
  async scrollToFindEmployee(name, maxScrolls = 30) {
    for (let i = 0; i < maxScrolls; i++) {
      const found = await this.isEmployeeVisible(name);
      if (found) return true;
      await this.page.mouse.wheel(0, 300);
      await this.page.waitForTimeout(400);
    }
    return false;
  }

  /**
   * Click a tab (Success, Error, etc.).
   */
  async clickTab(tabText) {
    await this.page.locator('button, [role="tab"]').filter({ hasText: new RegExp(tabText, 'i') }).first().click();
    await this.page.waitForTimeout(2000);
  }

  /**
   * Clear multi-value tags in react-select (used for Status filter).
   */
  async clearMultiSelectTags(maxTags = 4) {
    for (let i = 0; i < maxTags; i++) {
      await this.page.locator('[class*="multi-value"] [class*="remove"], [class*="multiValue"] svg')
        .first().click().catch(() => {});
      await this.page.waitForTimeout(300);
    }
  }
}

module.exports = TableComponent;
