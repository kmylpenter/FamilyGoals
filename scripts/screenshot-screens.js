const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const url = process.argv[2] || 'https://kmylpenter.github.io/FamilyGoals/';

async function capture() {
  const browser = await puppeteer.launch({
    executablePath: '/data/data/com.termux/files/usr/bin/chromium-browser',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  // Enter PIN if on PIN screen
  const pinScreen = await page.$('#pin-screen.active');
  if (pinScreen) {
    for (const digit of ['9', '8', '9', '0']) {
      await page.click(`.pin-key[onclick="pinKey('${digit}')"]`);
      await new Promise(r => setTimeout(r, 100));
    }
    await new Promise(r => setTimeout(r, 500));
  }

  const screenshotDir = path.join(__dirname, '..', 'logs', 'screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  // Screens to capture
  const screens = [
    { name: 'dashboard', selector: '#screen-dashboard' },
    { name: 'income', selector: '#screen-income', nav: 1 },
    { name: 'goals', selector: '#screen-goals', nav: 2 },
    { name: 'achievements', selector: '#screen-achievements', nav: 3 },
    { name: 'settings', selector: '#screen-settings', nav: 4 }
  ];

  for (const screen of screens) {
    if (screen.nav !== undefined) {
      // Click nav button
      await page.click(`.nav-item:nth-child(${screen.nav + 1})`);
      await new Promise(r => setTimeout(r, 500));
    }

    // Scroll to top
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) el.scrollTop = 0;
    }, screen.selector);
    await new Promise(r => setTimeout(r, 300));

    // Full page screenshot of active screen
    const filename = `${screen.name}-${timestamp}.png`;
    const filepath = path.join(screenshotDir, filename);

    await page.screenshot({ path: filepath, fullPage: false });
    console.log(`Screenshot: ${filename}`);
  }

  // Modal screenshots
  // First go back to dashboard
  await page.click('.nav-item:first-child');
  await new Promise(r => setTimeout(r, 500));

  // Open add modal
  await page.click('.fab');
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({
    path: path.join(screenshotDir, `modal-add-${timestamp}.png`),
    fullPage: false
  });
  console.log(`Screenshot: modal-add-${timestamp}.png`);

  // Open income modal
  await page.click('.modal-menu-item:first-child');
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({
    path: path.join(screenshotDir, `modal-income-${timestamp}.png`),
    fullPage: false
  });
  console.log(`Screenshot: modal-income-${timestamp}.png`);

  // Close and open goal modal
  await page.click('.modal-close');
  await new Promise(r => setTimeout(r, 300));
  await page.click('.fab');
  await new Promise(r => setTimeout(r, 300));
  await page.click('.modal-menu-item:last-child');
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({
    path: path.join(screenshotDir, `modal-goal-${timestamp}.png`),
    fullPage: false
  });
  console.log(`Screenshot: modal-goal-${timestamp}.png`);

  await browser.close();
  console.log('All screenshots done!');
}

capture().catch(console.error);
