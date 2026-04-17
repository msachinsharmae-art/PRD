// @ts-check
const { test, chromium } = require('@playwright/test');
const fs = require('fs');

test.setTimeout(0);

test('Explore entire Payroll module', async () => {
  const storageState = JSON.parse(fs.readFileSync('auth/session.json', 'utf-8'));
  const browser = await chromium.launch({ headless: false, slowMo: 150 });
  const context = await browser.newContext({ storageState, viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  // Go to Payroll
  await page.goto('https://www.zimyo.net/payroll/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(5000);
  console.log('>>> Payroll Home loaded:', page.url());

  const exploration = {};

  // Helper: get all visible text, tabs, links, buttons on current page
  async function scanPage(label) {
    await page.waitForTimeout(3000);
    const url = page.url();
    await page.screenshot({ path: `screenshots/explore-${label}.png`, fullPage: true });

    const data = await page.evaluate(() => {
      // Tabs
      const tabs = Array.from(document.querySelectorAll('[role="tab"], .MuiTab-root, a.MuiTab-root')).map(el => ({
        text: el.textContent?.trim()?.substring(0, 80),
        href: el.getAttribute('href'),
      }));

      // Sub-menu links (left sidebar sub-items if expanded)
      const subLinks = Array.from(document.querySelectorAll('a')).filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.x < 250 && rect.y > 50 && rect.height > 0;
      }).map(el => ({
        text: el.textContent?.trim()?.substring(0, 80),
        href: el.getAttribute('href'),
        x: Math.round(el.getBoundingClientRect().x),
        y: Math.round(el.getBoundingClientRect().y),
      }));

      // Main content headings
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, [class*="heading"], [class*="title"]')).filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.x > 100 && rect.height > 0 && el.textContent?.trim();
      }).map(el => el.textContent?.trim()?.substring(0, 100)).slice(0, 15);

      // Buttons in main area
      const buttons = Array.from(document.querySelectorAll('button')).filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.x > 100 && rect.y > 50 && rect.height > 0 && el.textContent?.trim();
      }).map(el => el.textContent?.trim()?.substring(0, 60)).slice(0, 20);

      // Tables if any
      const tables = Array.from(document.querySelectorAll('table, [role="grid"], [class*="table"], .MuiTable-root, .MuiDataGrid-root')).map(el => {
        const headers = Array.from(el.querySelectorAll('th, [role="columnheader"]')).map(h => h.textContent?.trim()?.substring(0, 40));
        const rowCount = el.querySelectorAll('tr, [role="row"]').length;
        return { headers, rowCount };
      });

      return { tabs, subLinks, headings, buttons, tables };
    });

    return { url, ...data };
  }

  // ========== 1. HOME ==========
  console.log('\n========== EXPLORING: HOME ==========');
  exploration['Home'] = await scanPage('home');
  console.log(JSON.stringify(exploration['Home'], null, 2));

  // ========== 2. PAYROLL OPERATIONS ==========
  console.log('\n========== EXPLORING: PAYROLL OPERATIONS ==========');
  await page.click('a[href*="payroll-operations"]');
  await page.waitForLoadState('networkidle').catch(() => {});
  exploration['Payroll Operations'] = await scanPage('payroll-operations');
  console.log(JSON.stringify(exploration['Payroll Operations'], null, 2));

  // Check all tabs under Payroll Operations
  const poTabs = exploration['Payroll Operations'].tabs || [];
  for (let i = 0; i < poTabs.length; i++) {
    const tab = poTabs[i];
    if (tab.href) {
      console.log(`\n--- Payroll Ops Tab: ${tab.text} ---`);
      await page.goto(`https://www.zimyo.net${tab.href}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('networkidle').catch(() => {});
      const tabLabel = tab.text.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      exploration[`Payroll Operations > ${tab.text}`] = await scanPage(`po-${tabLabel}`);
      console.log(JSON.stringify(exploration[`Payroll Operations > ${tab.text}`], null, 2));
    }
  }

  // ========== 3. EMPLOYEE WORKSPACE ==========
  console.log('\n========== EXPLORING: EMPLOYEE WORKSPACE ==========');
  await page.goto('https://www.zimyo.net/payroll/employees/list', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle').catch(() => {});
  exploration['Employee Workspace'] = await scanPage('employee-workspace');
  console.log(JSON.stringify(exploration['Employee Workspace'], null, 2));

  // Check tabs under Employee Workspace
  const ewTabs = exploration['Employee Workspace'].tabs || [];
  for (let i = 0; i < ewTabs.length; i++) {
    const tab = ewTabs[i];
    if (tab.href) {
      console.log(`\n--- Employee Workspace Tab: ${tab.text} ---`);
      await page.goto(`https://www.zimyo.net${tab.href}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('networkidle').catch(() => {});
      const tabLabel = tab.text.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      exploration[`Employee Workspace > ${tab.text}`] = await scanPage(`ew-${tabLabel}`);
      console.log(JSON.stringify(exploration[`Employee Workspace > ${tab.text}`], null, 2));
    }
  }

  // ========== 4. COMPENSATION & BENEFITS ==========
  console.log('\n========== EXPLORING: COMPENSATION & BENEFITS ==========');
  await page.goto('https://www.zimyo.net/payroll/benefits-taxation/loans', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle').catch(() => {});
  exploration['Compensation & Benefits'] = await scanPage('compensation-benefits');
  console.log(JSON.stringify(exploration['Compensation & Benefits'], null, 2));

  // Check tabs
  const cbTabs = exploration['Compensation & Benefits'].tabs || [];
  for (let i = 0; i < cbTabs.length; i++) {
    const tab = cbTabs[i];
    if (tab.href) {
      console.log(`\n--- Comp & Benefits Tab: ${tab.text} ---`);
      await page.goto(`https://www.zimyo.net${tab.href}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('networkidle').catch(() => {});
      const tabLabel = tab.text.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      exploration[`Compensation & Benefits > ${tab.text}`] = await scanPage(`cb-${tabLabel}`);
      console.log(JSON.stringify(exploration[`Compensation & Benefits > ${tab.text}`], null, 2));
    }
  }

  // ========== 5. DATA & INSIGHTS ==========
  console.log('\n========== EXPLORING: DATA & INSIGHTS ==========');
  await page.goto('https://www.zimyo.net/payroll/data-insights/custom-reports/draft', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle').catch(() => {});
  exploration['Data & Insights'] = await scanPage('data-insights');
  console.log(JSON.stringify(exploration['Data & Insights'], null, 2));

  // Check tabs
  const diTabs = exploration['Data & Insights'].tabs || [];
  for (let i = 0; i < diTabs.length; i++) {
    const tab = diTabs[i];
    if (tab.href) {
      console.log(`\n--- Data & Insights Tab: ${tab.text} ---`);
      await page.goto(`https://www.zimyo.net${tab.href}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('networkidle').catch(() => {});
      const tabLabel = tab.text.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      exploration[`Data & Insights > ${tab.text}`] = await scanPage(`di-${tabLabel}`);
      console.log(JSON.stringify(exploration[`Data & Insights > ${tab.text}`], null, 2));
    }
  }

  // ========== 6. CONFIGURATION CENTER ==========
  console.log('\n========== EXPLORING: CONFIGURATION CENTER ==========');
  await page.goto('https://www.zimyo.net/payroll/configurations/org-setup/org-info', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle').catch(() => {});
  exploration['Configuration Center'] = await scanPage('config-center');
  console.log(JSON.stringify(exploration['Configuration Center'], null, 2));

  // Check tabs
  const ccTabs = exploration['Configuration Center'].tabs || [];
  for (let i = 0; i < ccTabs.length; i++) {
    const tab = ccTabs[i];
    if (tab.href) {
      console.log(`\n--- Config Center Tab: ${tab.text} ---`);
      await page.goto(`https://www.zimyo.net${tab.href}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('networkidle').catch(() => {});
      const tabLabel = tab.text.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      exploration[`Configuration Center > ${tab.text}`] = await scanPage(`cc-${tabLabel}`);
      console.log(JSON.stringify(exploration[`Configuration Center > ${tab.text}`], null, 2));
    }
  }

  // ========== ALSO: EXPAND SIDEBAR SUB-MENUS ==========
  // Click each sidebar item to see if it expands sub-menus
  console.log('\n========== CHECKING SIDEBAR SUB-MENUS ==========');
  const sidebarSections = [
    { name: 'Payroll Operations', href: '/payroll/payroll-operations/run-payroll' },
    { name: 'Employee Workspace', href: '/payroll/employees/list' },
    { name: 'Compensation & Benefits', href: '/payroll/benefits-taxation/loans' },
    { name: 'Data & Insights', href: '/payroll/data-insights/custom-reports/draft' },
    { name: 'Configuration Center', href: '/payroll/configurations/org-setup/org-info' },
  ];

  for (const section of sidebarSections) {
    await page.goto(`https://www.zimyo.net${section.href}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);

    // Check for expanded sub-menu items in sidebar
    const subMenuItems = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a')).filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.x >= 10 && rect.x < 250 && rect.y > 50 && rect.height > 0;
      });
      return links.map(el => ({
        text: el.textContent?.trim()?.substring(0, 80),
        href: el.getAttribute('href'),
        indent: Math.round(el.getBoundingClientRect().x),
      }));
    });

    console.log(`\n--- Sidebar when on: ${section.name} ---`);
    console.log(JSON.stringify(subMenuItems, null, 2));
    exploration[`Sidebar > ${section.name}`] = subMenuItems;
  }

  // Save full exploration to file
  fs.writeFileSync('exploration-raw.json', JSON.stringify(exploration, null, 2));
  console.log('\n>>> Full exploration saved to exploration-raw.json');

  // Keep browser open
  console.log('>>> Exploration complete. Browser stays open.');
  await page.pause();
  await browser.close();
});
