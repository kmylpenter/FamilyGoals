const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const url = process.argv[2] || 'https://kmylpenter.github.io/FamilyGoals/';
const name = process.argv[3] || 'screenshot';

async function capture() {
  const browser = await puppeteer.launch({
    executablePath: '/data/data/com.termux/files/usr/bin/chromium-browser',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 }); // iPhone 14 Pro
  
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  
  // Wait for page to render
  await new Promise(r => setTimeout(r, 2000));
  
  // Enter PIN if on PIN screen
  const pinScreen = await page.$('#pin-screen.active');
  if (pinScreen) {
    // Type PIN: 9890
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
  const filename = `${name}-${timestamp}.png`;
  const filepath = path.join(screenshotDir, filename);
  
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`Screenshot saved: ${filepath}`);
  
  await browser.close();
}

capture().catch(console.error);
