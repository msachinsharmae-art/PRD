// @ts-check
const { test } = require('@playwright/test');

const BASE_URL = 'https://www.zimyo.net';
const CREDENTIALS = {
  username: 'sachin.sharma+demo@zimyo.com',
  password: 'Zimyo@12345',
};

const ESS_SECTIONS = [
  { name: 'Dashboard', url: 'https://www.zimyo.net/ess/dashboard/my-dashboard' },
  { name: 'Engage', url: 'https://www.zimyo.net/ess/engage' },
  { name: 'Request', url: 'https://www.zimyo.net/ess/request/my-requests' },
  { name: 'Attendance', url: 'https://www.zimyo.net/ess/leave-and-attendance/my-attendance' },
  { name: 'Pay', url: 'https://www.zimyo.net/ess/pay' },
  { name: 'Finance', url: 'https://www.zimyo.net/ess/finance-bundle/expense/my-expense' },
  { name: 'Task', url: 'https://www.zimyo.net/ess/task/dashboard' },
  { name: 'Org', url: 'https://www.zimyo.net/ess/hr/dashboard' },
  { name: 'Timesheet', url: 'https://www.zimyo.net/ess/timesheet/dashboard' },
  { name: 'Rewards', url: 'https://www.zimyo.net/ess/rewards/home' },
  { name: 'Recruit', url: 'https://www.zimyo.net/ess/recruit/requisition/my-requisition' },
  { name: 'Learn', url: 'https://www.zimyo.net/ess/learn' },
  { name: 'Performance', url: 'https://www.zimyo.net/ess/performance' },
];

async function loginAndGetEssPage(page, context) {
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

  // Navigate to ESS via nine-dot
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
  return page;
}

test('Explore all ESS sections in depth', async ({ page, context }) => {
  test.setTimeout(300000);

  const essPage = await loginAndGetEssPage(page, context);
  console.log('>>> ESS Portal loaded:', essPage.url());

  for (const section of ESS_SECTIONS) {
    try {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`>>> SECTION: ${section.name}`);
      console.log(`>>> URL: ${section.url}`);
      console.log('='.repeat(60));

      await essPage.goto(section.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await essPage.waitForLoadState('networkidle').catch(() => {});
      await essPage.waitForTimeout(3000);

      // Capture full text
      const text = await essPage.evaluate(() => document.body.innerText);
      console.log(`>>> Content:\n${text.substring(0, 3000)}`);

      // Capture sub-navigation links within this section
      const subLinks = await essPage.evaluate((sectionUrl) => {
        return Array.from(document.querySelectorAll('a'))
          .map(a => ({ text: a.innerText.trim(), href: a.href }))
          .filter(l => l.text && l.href.includes('/ess/'));
      }, section.url);

      if (subLinks.length > 0) {
        console.log(`>>> Sub-links:`, JSON.stringify(subLinks, null, 2));
      }

      // Screenshot
      const safeName = section.name.replace(/[^a-zA-Z0-9]/g, '_');
      await essPage.screenshot({ path: `screenshots/ess-detail-${safeName}.png`, fullPage: true });

      // For sections with tabs/sub-pages, explore them
      const tabLinks = subLinks.filter(l =>
        l.href.startsWith(section.url.replace(/\/[^/]*$/, '')) &&
        l.href !== section.url
      );

      for (const tab of tabLinks.slice(0, 5)) {
        try {
          console.log(`\n>>> Sub-section: ${tab.text} (${tab.href})`);
          await essPage.goto(tab.href, { waitUntil: 'domcontentloaded', timeout: 20000 });
          await essPage.waitForLoadState('networkidle').catch(() => {});
          await essPage.waitForTimeout(2000);

          const subText = await essPage.evaluate(() => document.body.innerText);
          console.log(`>>> Sub-content:\n${subText.substring(0, 1500)}`);

          const subSafeName = `${safeName}_${tab.text.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20)}`;
          await essPage.screenshot({ path: `screenshots/ess-detail-${subSafeName}.png`, fullPage: true });
        } catch (err) {
          console.log(`>>> Error in sub-section ${tab.text}: ${err.message.substring(0, 100)}`);
        }
      }

    } catch (err) {
      console.log(`>>> Error in section ${section.name}: ${err.message.substring(0, 200)}`);
    }
  }
});
