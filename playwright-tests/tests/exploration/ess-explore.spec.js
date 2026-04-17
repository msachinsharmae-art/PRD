// @ts-check
const { test, expect } = require('@playwright/test');

const BASE_URL = 'https://www.zimyo.net';
const CREDENTIALS = {
  username: 'sachin.sharma+demo@zimyo.com',
  password: 'Zimyo@12345',
};

test('Login and explore ESS portal', async ({ page, context }) => {
  test.setTimeout(180000);

  // 1. Go to zimyo.net and login
  console.log('>>> Navigating to zimyo.net...');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(3000);

  const url = page.url();
  if (url.includes('/login') || url === BASE_URL + '/') {
    console.log('>>> Logging in...');
    await page.locator('#username').waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('#username').fill(CREDENTIALS.username);
    await page.locator('#password').fill(CREDENTIALS.password);
    await page.waitForTimeout(1000);
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(10000);
    console.log('>>> Logged in. URL:', page.url());
  }

  // 2. Click the nine-dot app switcher
  console.log('>>> Clicking nine-dot app switcher...');
  await page.locator('.MuiIconButton-root svg[data-testid="AppsIcon"]').click();
  await page.waitForTimeout(2000);

  // 3. Click ESS — it may open a new tab
  console.log('>>> Clicking ESS (watching for new tab)...');
  const [newPage] = await Promise.all([
    context.waitForEvent('page', { timeout: 10000 }).catch(() => null),
    page.locator('text=ESS').first().click(),
  ]);

  let essPage;
  if (newPage) {
    console.log('>>> ESS opened in new tab');
    essPage = newPage;
    await essPage.waitForLoadState('domcontentloaded');
    await essPage.waitForLoadState('networkidle').catch(() => {});
    await essPage.waitForTimeout(5000);
  } else {
    // Maybe it navigated in the same tab, or we need to go to ESS URL directly
    console.log('>>> No new tab detected, trying direct ESS URL...');
    await page.goto('https://www.zimyo.net/ess', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(5000);
    essPage = page;
  }

  console.log('>>> ESS URL:', essPage.url());
  await essPage.screenshot({ path: 'screenshots/ess-01-portal-home.png', fullPage: true });

  // 4. Read full page content
  const pageText = await essPage.evaluate(() => document.body.innerText);
  console.log('>>> ESS Portal Full Text:\n', pageText);

  // 5. Get all links
  const links = await essPage.evaluate(() => {
    return Array.from(document.querySelectorAll('a')).map(a => ({
      text: a.innerText.trim(),
      href: a.href,
    })).filter(l => l.text || l.href);
  });
  console.log('>>> ESS Links:', JSON.stringify(links, null, 2));

  // 6. Get sidebar / navigation items
  const navItems = await essPage.evaluate(() => {
    const items = [];
    document.querySelectorAll('nav a, [class*="sidebar"] a, [class*="Sidebar"] a, [class*="menu"] a, [class*="Menu"] a, [class*="nav"] a, [class*="Nav"] a, li a').forEach(el => {
      items.push({ text: el.innerText.trim(), href: el.href });
    });
    return items.filter(i => i.text);
  });
  console.log('>>> Nav items:', JSON.stringify(navItems, null, 2));

  // 7. Explore each sidebar section — click through main nav items and capture content
  const sidebarLinks = await essPage.evaluate(() => {
    // Get unique sidebar/nav links
    const links = [];
    document.querySelectorAll('nav a, [class*="sidebar"] a, [class*="Sidebar"] a, [role="navigation"] a, aside a').forEach(el => {
      const href = el.href;
      const text = el.innerText.trim();
      if (text && href && !links.find(l => l.href === href)) {
        links.push({ text, href });
      }
    });
    return links;
  });

  console.log(`>>> Found ${sidebarLinks.length} sidebar sections to explore`);

  for (const link of sidebarLinks.slice(0, 15)) {
    try {
      console.log(`\n>>> Navigating to: ${link.text} (${link.href})`);
      await essPage.goto(link.href, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await essPage.waitForLoadState('networkidle').catch(() => {});
      await essPage.waitForTimeout(3000);

      const sectionText = await essPage.evaluate(() => document.body.innerText);
      const safeName = link.text.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
      await essPage.screenshot({ path: `screenshots/ess-section-${safeName}.png`, fullPage: true });
      console.log(`>>> Content of ${link.text}:\n`, sectionText.substring(0, 1500));
    } catch (err) {
      console.log(`>>> Error navigating to ${link.text}: ${err.message}`);
    }
  }

  // Final screenshot
  await essPage.screenshot({ path: 'screenshots/ess-final.png', fullPage: true });
});
