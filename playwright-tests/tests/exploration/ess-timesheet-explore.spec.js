// @ts-check
const { test, expect } = require('@playwright/test');

test.describe.serial('ESS Timesheet — Full Exploration', () => {
  /** @type {import('@playwright/test').Page} */
  let page;
  /** @type {import('@playwright/test').BrowserContext} */
  let context;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('Step 1 — Login', async () => {
    test.setTimeout(120000);
    await page.goto('https://www.zimyo.net', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(3000);

    await page.locator('.MuiAutocomplete-root').first().click();
    await page.waitForTimeout(1000);
    await page.locator('[role="option"]:has-text("Email ID")').click();
    await page.waitForTimeout(1000);
    await page.locator('#username').fill('sachin.sharma+demo@zimyo.com');
    await page.locator('#password').fill('Zimyo@12345');
    await page.waitForTimeout(500);
    await page.locator('button:has-text("Login")').first().click();

    // Wait for URL to change from /login
    await page.waitForURL('**/admin/**', { timeout: 60000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(5000);
    console.log('>>> Logged in:', page.url());
  });

  test('Step 2 — Navigate to ESS (handle new tab)', async () => {
    test.setTimeout(120000);

    // Click nine-dot icon
    await page.locator('[data-testid="AppsIcon"]').click();
    await page.waitForTimeout(2000);

    // Listen for new page event before clicking ESS
    const pagePromise = context.waitForEvent('page', { timeout: 10000 }).catch(() => null);
    await page.locator('text=ESS').first().click();
    const newPage = await pagePromise;

    if (newPage) {
      console.log('>>> ESS opened in new tab');
      await newPage.waitForLoadState('domcontentloaded', { timeout: 30000 });
      await newPage.waitForLoadState('networkidle').catch(() => {});
      await newPage.waitForTimeout(8000);
      page = newPage;
    } else {
      console.log('>>> ESS loaded in same tab');
      await page.waitForTimeout(8000);
    }

    console.log('>>> ESS URL:', page.url());
    await page.screenshot({ path: 'screenshots/ess-01-portal.png', fullPage: true });

    // Log all sidebar items
    const sidebarItems = await page.evaluate(() => {
      const items = [];
      const seen = new Set();
      document.querySelectorAll('a').forEach(el => {
        const text = el.textContent?.trim();
        const href = el.getAttribute('href') || '';
        const rect = el.getBoundingClientRect();
        if (text && text.length > 0 && text.length < 60 && rect.width > 0 && rect.x < 200 && !seen.has(href)) {
          seen.add(href);
          items.push({ text, href });
        }
      });
      return items;
    });
    console.log('>>> Sidebar items:', JSON.stringify(sidebarItems, null, 2));
  });

  test('Step 3 — Navigate to Timesheet', async () => {
    test.setTimeout(60000);

    // Click Timesheet in sidebar or nav
    await page.locator('a:has-text("Timesheet")').first().click().catch(() => {});
    await page.waitForTimeout(5000);
    console.log('>>> Timesheet URL:', page.url());
    await page.screenshot({ path: 'screenshots/ess-02-timesheet-home.png', fullPage: true });

    // Capture all timesheet sub-links
    const tsLinks = await page.evaluate(() => {
      const seen = new Set();
      return Array.from(document.querySelectorAll('a')).filter(a => {
        const href = a.getAttribute('href') || '';
        const text = a.textContent?.trim() || '';
        if (href.includes('timesheet') && text.length > 0 && text.length < 40 && !seen.has(href)) {
          seen.add(href);
          return true;
        }
        return false;
      }).map(a => ({ text: a.textContent?.trim(), href: a.getAttribute('href') }));
    });
    console.log('>>> Timesheet sub-links:', JSON.stringify(tsLinks, null, 2));
  });

  test('Step 4 — Explore each Timesheet sub-page', async () => {
    test.setTimeout(600000); // 10 minutes

    // Known admin timesheet paths (discovered earlier)
    const subPages = [
      { name: 'Dashboard', path: '/admin/timesheet/dashboard' },
      { name: 'Client', path: '/admin/timesheet/clients' },
      { name: 'Project', path: '/admin/timesheet/projects' },
      { name: 'Timesheet', path: '/admin/timesheet/employee-timesheet' },
      { name: 'Timelog', path: '/admin/timesheet/timesheet-logs' },
      { name: 'Reports', path: '/admin/timesheet/timesheet-reports' },
      { name: 'Configuration', path: '/admin/timesheet/configuration' },
    ];

    // Check if we're in ESS and discover ESS-specific links
    const currentUrl = page.url();
    if (currentUrl.includes('/ess/')) {
      const essLinks = await page.evaluate(() => {
        const seen = new Set();
        return Array.from(document.querySelectorAll('a')).filter(a => {
          const href = a.getAttribute('href') || '';
          if (href.includes('timesheet') && !seen.has(href)) { seen.add(href); return true; }
          return false;
        }).map(a => ({ name: a.textContent?.trim(), path: a.getAttribute('href') }));
      });
      if (essLinks.length > 0) {
        subPages.length = 0;
        subPages.push(...essLinks);
        console.log('>>> Using ESS timesheet links');
      }
    }

    for (let i = 0; i < subPages.length; i++) {
      const sp = subPages[i];
      console.log(`\n${'='.repeat(60)}`);
      console.log(`SUB-PAGE ${i + 1}/${subPages.length}: "${sp.name}" → ${sp.path}`);
      console.log('='.repeat(60));

      const fullUrl = sp.path.startsWith('http') ? sp.path : `https://www.zimyo.net${sp.path}`;
      await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(4000);

      await analyzePage(sp.name);
      await page.screenshot({ path: `screenshots/ess-p${i + 1}-${sp.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`, fullPage: true });

      // Find and click inner tabs
      const innerTabs = await getInnerTabs();
      for (let t = 0; t < innerTabs.length; t++) {
        if (!innerTabs[t].selected && innerTabs[t].text && innerTabs[t].text.length < 40) {
          console.log(`\n  --- Tab: "${innerTabs[t].text}" ---`);
          await page.locator(`[role="tab"]`).filter({ hasText: innerTabs[t].text }).first().click().catch(() => {});
          await page.waitForTimeout(3000);
          await analyzePage(`${sp.name} > ${innerTabs[t].text}`);
          await page.screenshot({ path: `screenshots/ess-p${i + 1}-t${t + 1}-${innerTabs[t].text.replace(/[^a-zA-Z0-9]/g, '_')}.png`, fullPage: true });
        }
      }
    }

    console.log('\n>>> ===== EXPLORATION COMPLETE =====');
  });

  async function getInnerTabs() {
    return page.evaluate(() => {
      return Array.from(document.querySelectorAll('[role="tab"]')).filter(t => {
        const r = t.getBoundingClientRect();
        return r.y > 85 && r.width > 0 && r.height > 0;
      }).map(t => ({
        text: t.textContent?.trim().substring(0, 60),
        selected: t.getAttribute('aria-selected') === 'true'
      })).filter(t => t.text && t.text.length > 0 && t.text.length < 60);
    });
  }

  async function analyzePage(label) {
    const data = await page.evaluate(() => {
      // Table headers & rows
      const tables = Array.from(document.querySelectorAll('table, [role="grid"]')).map(t => ({
        headers: Array.from(t.querySelectorAll('th, [role="columnheader"]')).map(h => h.textContent?.trim().substring(0, 40) || ''),
        rows: t.querySelectorAll('tbody tr, [role="row"]').length
      }));

      // Buttons (in content area, y > 85)
      const buttons = [...new Set(
        Array.from(document.querySelectorAll('button')).filter(b => {
          const r = b.getBoundingClientRect();
          const text = b.textContent?.trim() || '';
          return r.width > 0 && r.y > 85 && text.length > 1 && text.length < 50;
        }).map(b => b.textContent?.trim())
      )];

      // Inputs/filters
      const inputs = Array.from(document.querySelectorAll('input, select, [role="combobox"]')).filter(f => {
        const r = f.getBoundingClientRect();
        return r.width > 0 && r.y > 85;
      }).map(f => ({
        type: f.getAttribute('type') || f.tagName.toLowerCase(),
        placeholder: f.getAttribute('placeholder') || ''
      })).slice(0, 10);

      // Cards
      const cards = Array.from(document.querySelectorAll('[class*="card"], [class*="Card"]')).filter(c => {
        const r = c.getBoundingClientRect();
        return r.width > 100 && r.height > 50 && r.y > 85;
      }).map(c => c.textContent?.trim().substring(0, 120) || '').slice(0, 8);

      // Dropdowns/selects with labels
      const selects = Array.from(document.querySelectorAll('[class*="MuiSelect"], [role="combobox"]')).filter(s => {
        const r = s.getBoundingClientRect();
        return r.width > 0 && r.y > 85;
      }).map(s => s.textContent?.trim().substring(0, 50) || '').slice(0, 5);

      return { tables, buttons, inputs, cards, selects };
    });

    if (data.tables.length > 0) {
      for (const t of data.tables) {
        console.log(`  [${label}] Table: ${t.rows} rows | Headers: ${JSON.stringify(t.headers)}`);
      }
    } else {
      console.log(`  [${label}] No tables found`);
    }

    if (data.buttons.length > 0) console.log(`  [${label}] Buttons: ${JSON.stringify(data.buttons)}`);
    if (data.inputs.length > 0) console.log(`  [${label}] Inputs: ${JSON.stringify(data.inputs)}`);
    if (data.cards.length > 0) console.log(`  [${label}] Cards: ${JSON.stringify(data.cards)}`);
    if (data.selects.length > 0) console.log(`  [${label}] Selects: ${JSON.stringify(data.selects)}`);
  }
});
