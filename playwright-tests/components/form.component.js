// @ts-check
// FormComponent — reusable form interactions (inputs, dropdowns, buttons)

class FormComponent {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  /**
   * Fill an input field by selector (clears first).
   */
  async fillInput(selector, value) {
    const input = this.page.locator(selector);
    await input.waitFor({ state: 'visible', timeout: 15000 });
    await input.click({ clickCount: 3 });
    await input.fill(value);
    await this.page.waitForTimeout(1000);
  }

  /**
   * Fill input using native JS setter (for React-controlled inputs).
   */
  async fillInputNative(selector, value) {
    await this.page.evaluate(({ sel, val }) => {
      const inp = document.querySelector(sel);
      if (!inp) return;
      inp.focus();
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(inp, val);
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.dispatchEvent(new Event('change', { bubbles: true }));
    }, { sel: selector, val: value });
    await this.page.waitForTimeout(1000);
  }

  /**
   * Find a salary/form field by label text (regex match) and fill it.
   * Useful when field ID is unknown — scans visible inputs by surrounding label.
   */
  async fillFieldByLabel(labelRegex, value) {
    const fieldInfo = await this.page.evaluate((labelPattern) => {
      const regex = new RegExp(labelPattern, 'i');
      const inputs = document.querySelectorAll('input[type="text"]');
      for (const inp of inputs) {
        if (inp.offsetHeight === 0) continue;
        const parent = inp.closest('[class*="FormControl"], [class*="form"], div');
        const label = parent?.querySelector('label, span, p')?.textContent?.trim() || '';
        if (regex.test(label) && inp.offsetHeight > 0) {
          return { id: inp.id, name: inp.name, label, value: inp.value };
        }
      }
      return null;
    }, labelRegex.source || labelRegex);

    if (!fieldInfo) {
      console.log(`>>> Field matching "${labelRegex}" not found`);
      return null;
    }

    console.log(`>>> Found field: "${fieldInfo.label}" = ${fieldInfo.value}`);
    const selector = fieldInfo.id ? `#${fieldInfo.id}` : `input[name="${fieldInfo.name}"]`;
    await this.fillInput(selector, value);
    return fieldInfo;
  }

  /**
   * Select a react-select dropdown by clicking at coordinates, typing, and picking option.
   * Used for Zimyo's react-select filters (Entity, Month, Status).
   */
  async pickReactSelect(x, y, text, label) {
    console.log(`>>> ${label}: "${text}"...`);
    await this.page.mouse.click(x, y);
    await this.page.waitForTimeout(800);
    await this.page.keyboard.press('Control+a');
    await this.page.keyboard.press('Backspace');
    await this.page.keyboard.type(text, { delay: 80 });
    await this.page.waitForTimeout(1500);
    const opt = this.page.locator('[class*="option"]').first();
    if (await opt.isVisible({ timeout: 3000 }).catch(() => false)) {
      await opt.click();
    } else {
      await this.page.keyboard.press('Enter');
    }
    await this.page.waitForTimeout(800);
  }

  /**
   * Click a button by role and name.
   */
  async clickButton(name) {
    await this.page.getByRole('button', { name }).click();
    await this.page.waitForTimeout(2000);
  }

  /**
   * Click a button matching text regex.
   */
  async clickButtonByText(textRegex) {
    await this.page.locator('button').filter({ hasText: textRegex }).first().click();
    await this.page.waitForTimeout(2000);
  }

  /**
   * Submit a form — clicks Compute then Save.
   */
  async computeAndSave() {
    console.log('>>> Compute...');
    await this.clickButton('Compute');
    await this.page.waitForTimeout(8000);

    console.log('>>> Save...');
    const saveBtn = this.page.getByRole('button', { name: 'Save' });
    const isDisabled = await saveBtn.isDisabled().catch(() => true);

    if (isDisabled) {
      console.log('>>> ERROR: Save button is disabled after Compute');
      return false;
    }

    await saveBtn.click();
    await this.page.waitForTimeout(3000);
    return true;
  }
}

module.exports = FormComponent;
