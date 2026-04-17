// Shared utilities for deep ESS exploration
const BASE_URL = 'https://www.zimyo.net';
const CREDENTIALS = {
  username: 'sachin.sharma+demo@zimyo.com',
  password: 'Zimyo@12345',
};

async function loginToESS(page, context) {
  // Go directly to the ESS dashboard - login if needed
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`>>> Attempt ${attempt}: navigating to ESS...`);
      await page.goto(BASE_URL + '/ess/dashboard/my-dashboard', { timeout: 60000 });
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(3000);
      break;
    } catch (e) {
      console.log(`>>> Attempt ${attempt} failed: ${e.message.substring(0, 100)}`);
      if (attempt === 3) throw e;
      await page.waitForTimeout(5000 * attempt);
    }
  }

  // If redirected to login page, enter credentials
  const url = page.url();
  if (url.includes('/login') || url === BASE_URL + '/' || url === BASE_URL) {
    console.log('>>> Need to login...');
    await page.locator('#username').waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('#username').fill(CREDENTIALS.username);
    await page.locator('#password').fill(CREDENTIALS.password);
    await page.waitForTimeout(1000);
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(10000);

    // Now navigate to ESS via nine-dot
    await page.locator('.MuiIconButton-root svg[data-testid="AppsIcon"]').click();
    await page.waitForTimeout(2000);
    const [newPage] = await Promise.all([
      context.waitForEvent('page', { timeout: 10000 }).catch(() => null),
      page.locator('text=ESS').first().click(),
    ]);

    if (newPage) {
      await newPage.waitForLoadState('domcontentloaded');
      await newPage.waitForLoadState('networkidle').catch(() => {});
      await newPage.waitForTimeout(3000);
      return newPage;
    }
  }

  // If we ended up on admin dashboard instead of ESS, navigate to ESS via nine-dot
  const currentUrl = page.url();
  if (currentUrl.includes('/admin/')) {
    console.log('>>> On admin dashboard, switching to ESS via nine-dot...');
    await page.locator('.MuiIconButton-root svg[data-testid="AppsIcon"]').click();
    await page.waitForTimeout(2000);
    const [newPage] = await Promise.all([
      context.waitForEvent('page', { timeout: 10000 }).catch(() => null),
      page.locator('text=ESS').first().click(),
    ]);

    if (newPage) {
      await newPage.waitForLoadState('domcontentloaded');
      await newPage.waitForLoadState('networkidle').catch(() => {});
      await newPage.waitForTimeout(3000);
      return newPage;
    }
  }

  return page;
}

/**
 * Capture every interactive element on the current page:
 * buttons, links, inputs, selects, dropdowns, tabs, etc.
 */
async function capturePageInteractions(page, sectionName) {
  const data = await page.evaluate(() => {
    const results = {
      url: window.location.href,
      title: document.title,
      tabs: [],
      buttons: [],
      links: [],
      inputs: [],
      selects: [],
      dropdowns: [],
      tables: [],
      modals: [],
      forms: [],
      checkboxes: [],
      radioButtons: [],
      textareas: [],
      dateFields: [],
      searchFields: [],
      toggles: [],
      badges: [],
      cards: [],
    };

    // Tabs (top bar navigation within the section)
    document.querySelectorAll('[role="tab"], .MuiTab-root, [class*="tab"], [class*="Tab"]').forEach(el => {
      const text = el.innerText?.trim();
      if (text && text.length < 60) results.tabs.push({ text, selected: el.getAttribute('aria-selected') === 'true', class: (typeof el.className === 'string' ? el.className : el.className?.baseVal || '').substring(0, 80) });
    });

    // Buttons
    document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"], a[class*="btn"], a[class*="Btn"], [class*="button"], [class*="Button"]').forEach(el => {
      const text = el.innerText?.trim() || el.getAttribute('aria-label') || el.getAttribute('title') || '';
      if (text && text.length < 100 && !text.includes('\n')) {
        results.buttons.push({
          text,
          type: el.tagName,
          disabled: el.disabled || el.getAttribute('aria-disabled') === 'true',
          class: (typeof el.className === 'string' ? el.className : el.className?.baseVal || '').substring(0, 80),
        });
      }
    });

    // Input fields
    document.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])').forEach(el => {
      results.inputs.push({
        type: el.type,
        name: el.name,
        placeholder: el.placeholder,
        label: el.closest('label')?.innerText?.trim() || el.getAttribute('aria-label') || '',
        id: el.id,
        value: el.type === 'password' ? '***' : el.value?.substring(0, 50),
      });
    });

    // Select dropdowns
    document.querySelectorAll('select, [role="listbox"], [role="combobox"], [class*="select"], [class*="Select"], [class*="dropdown"], [class*="Dropdown"]').forEach(el => {
      const text = el.innerText?.trim()?.substring(0, 100);
      results.selects.push({ text, class: (typeof el.className === 'string' ? el.className : el.className?.baseVal || '').substring(0, 80), tag: el.tagName });
    });

    // Checkboxes
    document.querySelectorAll('input[type="checkbox"], [role="checkbox"]').forEach(el => {
      results.checkboxes.push({
        label: el.closest('label')?.innerText?.trim() || el.getAttribute('aria-label') || el.name || '',
        checked: el.checked,
      });
    });

    // Radio buttons
    document.querySelectorAll('input[type="radio"], [role="radio"]').forEach(el => {
      results.radioButtons.push({
        label: el.closest('label')?.innerText?.trim() || el.getAttribute('aria-label') || el.name || '',
        checked: el.checked,
      });
    });

    // Textareas
    document.querySelectorAll('textarea').forEach(el => {
      results.textareas.push({
        name: el.name,
        placeholder: el.placeholder,
        label: el.closest('label')?.innerText?.trim() || el.getAttribute('aria-label') || '',
      });
    });

    // Tables
    document.querySelectorAll('table, [role="grid"], [class*="table"], [class*="Table"]').forEach(el => {
      const headers = [];
      el.querySelectorAll('th, [role="columnheader"]').forEach(th => {
        const text = th.innerText?.trim();
        if (text) headers.push(text);
      });
      const rowCount = el.querySelectorAll('tr, [role="row"]').length;
      if (headers.length > 0 || rowCount > 1) {
        results.tables.push({ headers, rowCount, class: (typeof el.className === 'string' ? el.className : el.className?.baseVal || '').substring(0, 80) });
      }
    });

    // Search fields
    document.querySelectorAll('input[type="search"], input[placeholder*="search" i], input[placeholder*="Search" i], [class*="search" i]').forEach(el => {
      if (el.tagName === 'INPUT') {
        results.searchFields.push({ placeholder: el.placeholder, name: el.name });
      }
    });

    // Date pickers
    document.querySelectorAll('input[type="date"], input[type="datetime-local"], [class*="datepicker" i], [class*="DatePicker" i], [class*="date-picker" i]').forEach(el => {
      results.dateFields.push({
        label: el.closest('label')?.innerText?.trim() || el.getAttribute('aria-label') || el.placeholder || '',
        type: el.type,
      });
    });

    // Links within the page content (not main nav)
    document.querySelectorAll('a').forEach(el => {
      const text = el.innerText?.trim();
      const href = el.href;
      if (text && href && href.includes('/ess/') && text.length < 80) {
        results.links.push({ text, href });
      }
    });

    return results;
  });

  console.log(`\n>>> [${sectionName}] URL: ${data.url}`);
  if (data.tabs.length) console.log(`>>> [${sectionName}] TABS:`, JSON.stringify(data.tabs, null, 2));
  if (data.buttons.length) console.log(`>>> [${sectionName}] BUTTONS (${data.buttons.length}):`, JSON.stringify(data.buttons.slice(0, 30), null, 2));
  if (data.inputs.length) console.log(`>>> [${sectionName}] INPUT FIELDS:`, JSON.stringify(data.inputs, null, 2));
  if (data.selects.length) console.log(`>>> [${sectionName}] SELECTS/DROPDOWNS:`, JSON.stringify(data.selects.slice(0, 15), null, 2));
  if (data.checkboxes.length) console.log(`>>> [${sectionName}] CHECKBOXES:`, JSON.stringify(data.checkboxes.slice(0, 10), null, 2));
  if (data.radioButtons.length) console.log(`>>> [${sectionName}] RADIO BUTTONS:`, JSON.stringify(data.radioButtons, null, 2));
  if (data.textareas.length) console.log(`>>> [${sectionName}] TEXTAREAS:`, JSON.stringify(data.textareas, null, 2));
  if (data.searchFields.length) console.log(`>>> [${sectionName}] SEARCH FIELDS:`, JSON.stringify(data.searchFields, null, 2));
  if (data.dateFields.length) console.log(`>>> [${sectionName}] DATE FIELDS:`, JSON.stringify(data.dateFields, null, 2));
  if (data.tables.length) console.log(`>>> [${sectionName}] TABLES:`, JSON.stringify(data.tables, null, 2));
  if (data.links.length) console.log(`>>> [${sectionName}] ESS LINKS:`, JSON.stringify(data.links, null, 2));

  return data;
}

/**
 * Click on each tab within the current page and capture interactions.
 */
async function exploreTabsOnPage(page, sectionName, screenshotPrefix) {
  // Find clickable tabs in the top sub-navigation bar
  const topNavTabs = await page.evaluate(() => {
    const tabs = [];
    // Look for links in the top navigation area (below the main header)
    const navArea = document.querySelector('[class*="topNav"], [class*="subNav"], [class*="tab-bar"], [class*="TabBar"], nav[class*="secondary"]');
    // Also look for common tab patterns
    const candidates = document.querySelectorAll('a[href*="/ess/"], [role="tab"]');
    const seen = new Set();
    candidates.forEach(el => {
      const text = el.innerText?.trim();
      const href = el.href || '';
      // Only include section-level tabs (not sidebar)
      const rect = el.getBoundingClientRect();
      if (text && text.length < 50 && rect.y > 40 && rect.y < 120 && href && !seen.has(href)) {
        seen.add(href);
        tabs.push({ text, href, y: rect.y });
      }
    });
    return tabs;
  });

  console.log(`>>> [${sectionName}] Found ${topNavTabs.length} sub-tabs`);

  for (const tab of topNavTabs) {
    try {
      console.log(`\n>>> --- ${sectionName} > ${tab.text} ---`);
      await page.goto(tab.href, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(2500);

      await capturePageInteractions(page, `${sectionName} > ${tab.text}`);

      const safeName = `${screenshotPrefix}_${tab.text.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 25)}`;
      await page.screenshot({ path: `screenshots/${safeName}.png`, fullPage: true });

      // Check for inner tabs (second-level tabs within sub-pages)
      const innerTabs = await page.evaluate(() => {
        const tabs = [];
        const candidates = document.querySelectorAll('[role="tab"], [class*="MuiTab"], [class*="tabItem"], [class*="tab-item"]');
        candidates.forEach(el => {
          const text = el.innerText?.trim();
          if (text && text.length < 50) {
            tabs.push({ text, index: tabs.length });
          }
        });
        return tabs;
      });

      if (innerTabs.length > 1) {
        console.log(`>>> [${sectionName} > ${tab.text}] Inner tabs: ${innerTabs.map(t => t.text).join(', ')}`);
        for (const inner of innerTabs) {
          try {
            const innerEl = page.locator(`[role="tab"]:has-text("${inner.text}"), [class*="MuiTab"]:has-text("${inner.text}"), [class*="tabItem"]:has-text("${inner.text}")`).first();
            if (await innerEl.isVisible().catch(() => false)) {
              await innerEl.click();
              await page.waitForTimeout(2000);
              await capturePageInteractions(page, `${sectionName} > ${tab.text} > ${inner.text}`);
              const innerSafe = `${screenshotPrefix}_${tab.text.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 15)}_${inner.text.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 15)}`;
              await page.screenshot({ path: `screenshots/${innerSafe}.png`, fullPage: true });
            }
          } catch (e) {
            console.log(`>>> Error on inner tab ${inner.text}: ${e.message.substring(0, 100)}`);
          }
        }
      }
    } catch (e) {
      console.log(`>>> Error on tab ${tab.text}: ${e.message.substring(0, 150)}`);
    }
  }
}

module.exports = { loginToESS, capturePageInteractions, exploreTabsOnPage, BASE_URL, CREDENTIALS };
