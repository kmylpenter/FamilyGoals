/**
 * Dev Browser - Opens Chrome window with Pixel 7 dimensions
 * Usage: node scripts/dev-browser.js [url]
 * Default URL: http://localhost:3000
 */

const puppeteer = require('puppeteer-core');
const path = require('path');
const os = require('os');

// Pixel 7 specs
const PIXEL_7 = {
  name: 'Pixel 7',
  viewport: {
    width: 412,
    height: 915,
    deviceScaleFactor: 2.625,
    isMobile: true,
    hasTouch: true,
    isLandscape: false
  },
  userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
};

// Find Chrome executable based on OS
function getChromePath() {
  const platform = os.platform();

  if (platform === 'win32') {
    return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  } else if (platform === 'darwin') {
    return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  } else if (platform === 'linux') {
    // Check for Termux first
    const termuxPath = '/data/data/com.termux/files/usr/bin/chromium-browser';
    try {
      require('fs').accessSync(termuxPath);
      return termuxPath;
    } catch {
      return '/usr/bin/google-chrome';
    }
  }
  throw new Error(`Unsupported platform: ${platform}`);
}

async function openDevBrowser() {
  const url = process.argv[2] || 'http://localhost:3000';

  console.log(`Opening ${PIXEL_7.name} browser...`);
  console.log(`Viewport: ${PIXEL_7.viewport.width}x${PIXEL_7.viewport.height}`);
  console.log(`URL: ${url}`);

  const browser = await puppeteer.launch({
    executablePath: getChromePath(),
    headless: false, // Show window
    defaultViewport: PIXEL_7.viewport,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      `--window-size=${PIXEL_7.viewport.width + 16},${PIXEL_7.viewport.height + 140}`, // Add Chrome UI space
      '--auto-open-devtools-for-tabs' // Open DevTools automatically
    ]
  });

  const page = await browser.newPage();
  await page.setUserAgent(PIXEL_7.userAgent);

  // Emulate touch
  await page.emulate({
    viewport: PIXEL_7.viewport,
    userAgent: PIXEL_7.userAgent
  });

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

  console.log('\nBrowser ready! DevTools opened.');
  console.log('Press Ctrl+C to close.\n');

  // Keep browser open until Ctrl+C
  process.on('SIGINT', async () => {
    console.log('\nClosing browser...');
    await browser.close();
    process.exit(0);
  });

  // Keep process alive
  await new Promise(() => {});
}

openDevBrowser().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
