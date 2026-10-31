const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  console.log('Launching browser to inspect current God\'s eye...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-gl=angle',
      '--use-angle=default',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--window-size=1920,1080'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  console.log('Navigating to http://localhost:5173/#/gods-eye?id=400102 ...');
  await page.goto('http://localhost:5173/#/gods-eye?id=400102', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 6000));

  const outPath = path.resolve(__dirname, 'test_godseye_current.png');
  await page.screenshot({ path: outPath });
  console.log('Screenshot saved to', outPath);

  await browser.close();
})();
