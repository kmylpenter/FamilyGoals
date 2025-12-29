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

  // Enter PIN
  const pinScreen = await page.$('#pin-screen.active');
  if (pinScreen) {
    for (const digit of ['9', '8', '9', '0']) {
      await page.click(`.pin-key[onclick="pinKey('${digit}')"]`);
      await new Promise(r => setTimeout(r, 100));
    }
    await new Promise(r => setTimeout(r, 500));
  }

  const screenshotDir = path.join(__dirname, '..', 'logs', 'screenshots');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  // Scroll to chart section
  await page.evaluate(() => {
    const dashboard = document.querySelector('#screen-dashboard');
    if (dashboard) {
      dashboard.scrollTop = 500; // Scroll to see chart
    }
  });
  await new Promise(r => setTimeout(r, 500));

  await page.screenshot({
    path: path.join(screenshotDir, `dashboard-scroll-${timestamp}.png`),
    fullPage: false
  });
  console.log(`Screenshot: dashboard-scroll-${timestamp}.png`);

  // Full page screenshot
  await page.evaluate(() => {
    const dashboard = document.querySelector('#screen-dashboard');
    if (dashboard) dashboard.scrollTop = 0;
  });
  await new Promise(r => setTimeout(r, 300));

  await page.screenshot({
    path: path.join(screenshotDir, `dashboard-full-${timestamp}.png`),
    fullPage: true
  });
  console.log(`Screenshot: dashboard-full-${timestamp}.png`);

  // Check Goals FAB
  await page.click('.nav-item:nth-child(3)');
  await new Promise(r => setTimeout(r, 500));

  // Scroll goals to bottom
  await page.evaluate(() => {
    const goals = document.querySelector('#screen-goals');
    if (goals) goals.scrollTop = goals.scrollHeight;
  });
  await new Promise(r => setTimeout(r, 300));

  await page.screenshot({
    path: path.join(screenshotDir, `goals-bottom-${timestamp}.png`),
    fullPage: false
  });
  console.log(`Screenshot: goals-bottom-${timestamp}.png`);

  await browser.close();
  console.log('Done!');
}

capture().catch(console.error);
