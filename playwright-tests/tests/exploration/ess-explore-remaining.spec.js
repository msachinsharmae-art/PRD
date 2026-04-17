// @ts-check
const { test } = require('@playwright/test');

const BASE_URL = 'https://www.zimyo.net';
const CREDENTIALS = {
  username: 'sachin.sharma+demo@zimyo.com',
  password: 'Zimyo@12345',
};

const REMAINING_SECTIONS = [
  { name: 'Task', url: 'https://www.zimyo.net/ess/task/dashboard' },
  { name: 'Org', url: 'https://www.zimyo.net/ess/hr/dashboard' },
  { name: 'Timesheet', url: 'https://www.zimyo.net/ess/timesheet/dashboard' },
  { name: 'Rewards', url: 'https://www.zimyo.net/ess/rewards/home' },
  { name: 'Recruit', url: 'https://www.zimyo.net/ess/recruit/requisition/my-requisition' },
  { name: 'Learn', url: 'https://www.zimyo.net/ess/learn' },
  { name: 'Performance', url: 'https://www.zimyo.net/ess/performance' },
];

test('Explore remaining ESS sections', async ({ page, context }) => {
  test.setTimeout(300000);

  // Login
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(3000);

  const url = page.url();
  if (url.includes('/login') || url === BASE_URL + '/') {
    await page.locator('#username').waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('#username').fill(CREDENTIALS.username);
    await page.locator('#password').fill(CREDENTIALS.password);
    await page.waitForTimeout(1000);
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(10000);
  }

  // Go to ESS via nine-dot
  await page.locator('.MuiIconButton-root svg[data-testid="AppsIcon"]').click();
  await page.waitForTimeout(2000);
  const [essPage] = await Promise.all([
    context.waitForEvent('page', { timeout: 10000 }).catch(() => null),
    page.locator('text=ESS').first().click(),
  ]);

  const ess = essPage || page;
  if (essPage) {
    await essPage.waitForLoadState('domcontentloaded');
    await essPage.waitForLoadState('networkidle').catch(() => {});
    await essPage.waitForTimeout(3000);
  }

  for (const section of REMAINING_SECTIONS) {
    try {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`>>> SECTION: ${section.name}`);
      console.log('='.repeat(60));

      await ess.goto(section.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await ess.waitForLoadState('networkidle').catch(() => {});
      await ess.waitForTimeout(3000);

      const text = await ess.evaluate(() => document.body.innerText);
      console.log(`>>> Content:\n${text.substring(0, 3000)}`);

      // Get sub-links specific to this section
      const subLinks = await ess.evaluate((baseUrl) => {
        const sectionPath = new URL(baseUrl).pathname.split('/').slice(0, 4).join('/');
        return Array.from(document.querySelectorAll('a'))
          .map(a => ({ text: a.innerText.trim(), href: a.href }))
          .filter(l => l.text && l.href.includes(sectionPath) && l.href !== baseUrl);
      }, section.url);

      if (subLinks.length > 0) {
        console.log(`>>> Sub-links:`, JSON.stringify(subLinks, null, 2));
      }

      const safeName = section.name.replace(/[^a-zA-Z0-9]/g, '_');
      await ess.screenshot({ path: `screenshots/ess-remaining-${safeName}.png`, fullPage: true });

    } catch (err) {
      console.log(`>>> Error: ${err.message.substring(0, 200)}`);
    }
  }
});
