const puppeteer = require('puppeteer-core');
const path = require('path');

const URL = process.argv[2] || 'https://kmylpenter.github.io/FamilyGoals';
const OUTPUT_DIR = path.join(__dirname, '../logs/screenshots');

async function capture() {
  console.log('Launching browser...');

  const browser = await puppeteer.launch({
    executablePath: '/data/data/com.termux/files/usr/bin/chromium-browser',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });

  const page = await browser.newPage();

  // Mobile viewport (iPhone SE size)
  await page.setViewport({ width: 375, height: 667, deviceScaleFactor: 2 });

  console.log(`Loading ${URL}...`);
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });

  // Wait for page to render
  await page.waitForSelector('.pin-screen', { timeout: 10000 });

  // Screenshot 1: PIN Screen
  console.log('Screenshot 1: PIN Screen');
  await page.screenshot({
    path: path.join(OUTPUT_DIR, '01-pin-screen.png'),
    fullPage: false
  });

  // Enter PIN: 9890 (fallback PIN)
  console.log('Entering PIN...');
  await page.evaluate(() => {
    pinKey('9');
    pinKey('8');
    pinKey('9');
    pinKey('0');
  });

  // Wait for dashboard
  await new Promise(r => setTimeout(r, 500));

  // Screenshot 2: Dashboard
  console.log('Screenshot 2: Dashboard');
  await page.screenshot({
    path: path.join(OUTPUT_DIR, '02-dashboard.png'),
    fullPage: true
  });

  // Scroll to show bottom nav
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 300));

  // Screenshot 3: Dashboard top with nav
  console.log('Screenshot 3: Dashboard top');
  await page.screenshot({
    path: path.join(OUTPUT_DIR, '03-dashboard-top.png'),
    fullPage: false
  });

  // Click FAB to open modal
  console.log('Opening add modal...');
  await page.click('.fab');
  await new Promise(r => setTimeout(r, 300));

  // Screenshot 4: Add Menu Modal
  console.log('Screenshot 4: Add Modal');
  await page.screenshot({
    path: path.join(OUTPUT_DIR, '04-add-modal.png'),
    fullPage: false
  });

  // Click "Dodaj wydatek"
  await page.click('.modal-menu-item:nth-child(2)');
  await new Promise(r => setTimeout(r, 300));

  // Screenshot 5: Expense Form Modal
  console.log('Screenshot 5: Expense Form');
  await page.screenshot({
    path: path.join(OUTPUT_DIR, '05-expense-form.png'),
    fullPage: false
  });

  // Close modal (press Escape)
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 500));

  // Navigate to Goals screen
  console.log('Navigating to Goals...');
  await page.click('.nav-item:nth-child(3)');
  await new Promise(r => setTimeout(r, 300));

  // Screenshot 6: Goals Screen
  console.log('Screenshot 6: Goals Screen');
  await page.screenshot({
    path: path.join(OUTPUT_DIR, '06-goals-screen.png'),
    fullPage: false
  });

  // Navigate to Settings
  console.log('Navigating to Settings...');
  await page.click('.nav-item:nth-child(5)');
  await new Promise(r => setTimeout(r, 300));

  // Screenshot 7: Settings Screen
  console.log('Screenshot 7: Settings Screen');
  await page.screenshot({
    path: path.join(OUTPUT_DIR, '07-settings-screen.png'),
    fullPage: false
  });

  await browser.close();
  console.log('\nDone! Screenshots saved to logs/screenshots/');
}

capture().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
