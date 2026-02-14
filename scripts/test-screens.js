/**
 * Test Screens - Screenshots all app screens
 * Usage: node scripts/test-screens.js
 */

const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const os = require('os');

const PIXEL_7 = {
  viewport: { width: 412, height: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true },
  userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
};

const SCREENS = [
  { name: 'dashboard', param: '' },
  { name: 'income', param: '?screen=income' },
  { name: 'goals', param: '?screen=goals' },
  { name: 'achievements', param: '?screen=achievements' },
  { name: 'settings', param: '?screen=settings' }
];

function getChromePath() {
  const platform = os.platform();
  if (platform === 'win32') return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  if (platform === 'darwin') return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  return '/data/data/com.termux/files/usr/bin/chromium-browser';
}

async function testScreens() {
  const url = process.argv[2] || 'http://localhost:7321';
  const screenshotDir = path.join(__dirname, '..', 'logs', 'screenshots', 'test');

  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  console.log('Starting screen test...\n');

  const browser = await puppeteer.launch({
    executablePath: getChromePath(),
    headless: true,
    defaultViewport: PIXEL_7.viewport,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent(PIXEL_7.userAgent);

  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  console.log(`Base URL: ${url}\n`);

  // Screenshot each screen using URL params
  for (let i = 0; i < SCREENS.length; i++) {
    const screen = SCREENS[i];

    // Navigate to screen via URL
    await page.goto(`${url}${screen.param}`, { waitUntil: 'networkidle2', timeout: 30000 });
    await wait(500);

    // Enter PIN if needed (first screen or after navigation)
    const pinVisible = await page.$('#pin-screen.active');
    if (pinVisible) {
      await page.evaluate(() => ['9', '8', '9', '0'].forEach(d => pinKey(d)));
      await wait(800);
    }

    // Take screenshot
    const filepath = path.join(screenshotDir, `${i + 1}-${screen.name}.png`);
    await page.screenshot({ path: filepath });
    console.log(`✓ ${screen.name} captured`);
  }

  await browser.close();

  console.log(`\n✅ All screenshots saved to: ${screenshotDir}`);
  console.log('\nScreenshots:');
  fs.readdirSync(screenshotDir).forEach(f => console.log(`  - ${f}`));
}

testScreens().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
