// @ts-check
// Deep exploration: Rewards, Recruit, Learn, Performance
const { test } = require('@playwright/test');
const { loginToESS, capturePageInteractions } = require('./ess-deep-utils');

test('Deep explore: Rewards & Recognition', async ({ page, context }) => {
  test.setTimeout(180000);
  const ess = await loginToESS(page, context);

  console.log('\n' + '█'.repeat(60));
  console.log('█ REWARDS & RECOGNITION');
  console.log('█'.repeat(60));

  // --- Home ---
  console.log('\n>>> === R&R > Home ===');
  await ess.goto('https://www.zimyo.net/ess/rewards/home', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(3000);
  await capturePageInteractions(ess, 'Rewards > Home');
  await ess.screenshot({ path: 'screenshots/deep-rewards-home.png', fullPage: true });
  await ess.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await ess.waitForTimeout(1000);
  await ess.screenshot({ path: 'screenshots/deep-rewards-home-scroll.png', fullPage: true });

  // Click "Recognize" button
  const recognizeBtn = ess.locator('button:has-text("Recognize"), a:has-text("Recognize")').first();
  if (await recognizeBtn.isVisible().catch(() => false)) {
    console.log('>>> Clicking "Recognize" to see form...');
    await recognizeBtn.click();
    await ess.waitForTimeout(2500);
    await capturePageInteractions(ess, 'Rewards > Recognize Form');
    await ess.screenshot({ path: 'screenshots/deep-rewards-recognize-form.png', fullPage: true });
    await ess.keyboard.press('Escape');
    await ess.waitForTimeout(500);
  }

  // Check Team / Organisation toggle on recognition wall
  const orgToggle = ess.locator('text=Organisation').first();
  if (await orgToggle.isVisible().catch(() => false)) {
    console.log('>>> Clicking "Organisation" toggle...');
    await orgToggle.click();
    await ess.waitForTimeout(2000);
    await ess.screenshot({ path: 'screenshots/deep-rewards-org-wall.png', fullPage: true });
  }

  // --- My Recognitions ---
  console.log('\n>>> === R&R > My Recognitions ===');
  await ess.goto('https://www.zimyo.net/ess/rewards/my-recognitions', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(3000);
  await capturePageInteractions(ess, 'Rewards > My Recognitions');
  await ess.screenshot({ path: 'screenshots/deep-rewards-my-recognitions.png', fullPage: true });

  // Check for Given/Received tabs
  for (const tabName of ['Given', 'Received']) {
    const tab = ess.locator(`text="${tabName}"`).first();
    if (await tab.isVisible().catch(() => false)) {
      console.log(`>>> Clicking "${tabName}" tab...`);
      await tab.click();
      await ess.waitForTimeout(2000);
      await capturePageInteractions(ess, `Rewards > My Recognitions > ${tabName}`);
      await ess.screenshot({ path: `screenshots/deep-rewards-${tabName.toLowerCase()}.png`, fullPage: true });
    }
  }

  // --- Wallet ---
  console.log('\n>>> === R&R > Wallet ===');
  await ess.goto('https://www.zimyo.net/ess/rewards/wallet', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(3000);
  await capturePageInteractions(ess, 'Rewards > Wallet');
  await ess.screenshot({ path: 'screenshots/deep-rewards-wallet.png', fullPage: true });
});

test('Deep explore: Recruit', async ({ page, context }) => {
  test.setTimeout(180000);
  const ess = await loginToESS(page, context);

  console.log('\n' + '█'.repeat(60));
  console.log('█ RECRUIT');
  console.log('█'.repeat(60));

  // --- My Requisition ---
  console.log('\n>>> === Recruit > My Requisition ===');
  await ess.goto('https://www.zimyo.net/ess/recruit/requisition/my-requisition', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(3000);
  await capturePageInteractions(ess, 'Recruit > My Requisition');
  await ess.screenshot({ path: 'screenshots/deep-recruit-my-req.png', fullPage: true });

  // Click "Create New"
  const createNew = ess.locator('button:has-text("Create New"), button:has-text("Create"), a:has-text("Create New")').first();
  if (await createNew.isVisible().catch(() => false)) {
    console.log('>>> Clicking "Create New" requisition...');
    await createNew.click();
    await ess.waitForTimeout(2500);
    await capturePageInteractions(ess, 'Recruit > New Requisition Form');
    await ess.screenshot({ path: 'screenshots/deep-recruit-new-req-form.png', fullPage: true });
    await ess.keyboard.press('Escape');
    await ess.waitForTimeout(500);
  }

  // --- Team Requisition ---
  console.log('\n>>> === Recruit > Team Requisition ===');
  await ess.goto('https://www.zimyo.net/ess/recruit/requisition/emp-requisition', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(3000);
  await capturePageInteractions(ess, 'Recruit > Team Requisition');
  await ess.screenshot({ path: 'screenshots/deep-recruit-team-req.png', fullPage: true });

  // --- Interviews ---
  console.log('\n>>> === Recruit > Interviews ===');
  await ess.goto('https://www.zimyo.net/ess/recruit/interviews', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(3000);
  await capturePageInteractions(ess, 'Recruit > Interviews');
  await ess.screenshot({ path: 'screenshots/deep-recruit-interviews.png', fullPage: true });

  // Check Self/Team tabs
  for (const tabName of ['Self', 'Team']) {
    const tab = ess.locator(`text="${tabName}"`).first();
    if (await tab.isVisible().catch(() => false)) {
      console.log(`>>> Clicking Interviews > "${tabName}" tab...`);
      await tab.click();
      await ess.waitForTimeout(2000);
      await capturePageInteractions(ess, `Recruit > Interviews > ${tabName}`);
      await ess.screenshot({ path: `screenshots/deep-recruit-interviews-${tabName.toLowerCase()}.png`, fullPage: true });
    }
  }
});

test('Deep explore: Learn', async ({ page, context }) => {
  test.setTimeout(120000);
  const ess = await loginToESS(page, context);

  console.log('\n' + '█'.repeat(60));
  console.log('█ LEARN');
  console.log('█'.repeat(60));

  await ess.goto('https://www.zimyo.net/ess/learn', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(3000);
  await capturePageInteractions(ess, 'Learn - Main');
  await ess.screenshot({ path: 'screenshots/deep-learn-main.png', fullPage: true });

  // Find all sub-links
  const learnLinks = await ess.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href*="/ess/learn"]'))
      .map(a => ({ text: a.innerText.trim(), href: a.href }))
      .filter(l => l.text);
  });
  console.log('>>> Learn sub-links:', JSON.stringify(learnLinks, null, 2));

  // Try common LMS sub-pages
  const learnPages = [
    'https://www.zimyo.net/ess/learn/dashboard',
    'https://www.zimyo.net/ess/learn/courses',
    'https://www.zimyo.net/ess/learn/my-courses',
    'https://www.zimyo.net/ess/learn/catalog',
    'https://www.zimyo.net/ess/learn/certifications',
  ];
  for (const url of learnPages) {
    try {
      console.log(`\n>>> Trying: ${url}`);
      await ess.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await ess.waitForLoadState('networkidle').catch(() => {});
      await ess.waitForTimeout(2000);
      const actualUrl = ess.url();
      console.log(`>>> Actual URL: ${actualUrl}`);
      if (actualUrl.includes('/learn')) {
        await capturePageInteractions(ess, `Learn > ${url.split('/').pop()}`);
        const safeName = url.split('/').pop() || 'page';
        await ess.screenshot({ path: `screenshots/deep-learn-${safeName}.png`, fullPage: true });
      }
    } catch (e) {
      console.log(`>>> Error: ${e.message.substring(0, 100)}`);
    }
  }
});

test('Deep explore: Performance', async ({ page, context }) => {
  test.setTimeout(120000);
  const ess = await loginToESS(page, context);

  console.log('\n' + '█'.repeat(60));
  console.log('█ PERFORMANCE');
  console.log('█'.repeat(60));

  await ess.goto('https://www.zimyo.net/ess/performance', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await ess.waitForLoadState('networkidle').catch(() => {});
  await ess.waitForTimeout(3000);
  await capturePageInteractions(ess, 'Performance - Main');
  await ess.screenshot({ path: 'screenshots/deep-perf-main.png', fullPage: true });

  // Find actual URL
  console.log('>>> Performance actual URL:', ess.url());

  // Find sub-links
  const perfLinks = await ess.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href*="/ess/performance"]'))
      .map(a => ({ text: a.innerText.trim(), href: a.href }))
      .filter(l => l.text);
  });
  console.log('>>> Performance sub-links:', JSON.stringify(perfLinks, null, 2));

  // Try common Performance sub-pages
  const perfPages = [
    'https://www.zimyo.net/ess/performance/dashboard',
    'https://www.zimyo.net/ess/performance/goals',
    'https://www.zimyo.net/ess/performance/my-goals',
    'https://www.zimyo.net/ess/performance/reviews',
    'https://www.zimyo.net/ess/performance/my-reviews',
    'https://www.zimyo.net/ess/performance/feedback',
    'https://www.zimyo.net/ess/performance/okr',
    'https://www.zimyo.net/ess/performance/kra',
    'https://www.zimyo.net/ess/performance/competency',
    'https://www.zimyo.net/ess/performance/pip',
    'https://www.zimyo.net/ess/performance/one-on-one',
    'https://www.zimyo.net/ess/performance/continuous-feedback',
  ];
  for (const url of perfPages) {
    try {
      console.log(`\n>>> Trying: ${url}`);
      await ess.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await ess.waitForLoadState('networkidle').catch(() => {});
      await ess.waitForTimeout(2000);
      const actualUrl = ess.url();
      console.log(`>>> Actual URL: ${actualUrl}`);
      if (actualUrl.includes('/performance')) {
        await capturePageInteractions(ess, `Performance > ${url.split('/').pop()}`);
        const safeName = url.split('/').pop() || 'page';
        await ess.screenshot({ path: `screenshots/deep-perf-${safeName}.png`, fullPage: true });
      }
    } catch (e) {
      console.log(`>>> Error: ${e.message.substring(0, 100)}`);
    }
  }
});
