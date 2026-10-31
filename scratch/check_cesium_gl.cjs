const puppeteer = require('puppeteer');

(async () => {
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
  await page.setViewport({ width: 1920, height: 1080 });

  page.on('console', msg => console.log('LOG:', msg.text()));
  page.on('pageerror', err => console.log('ERR:', err.message));

  await page.goto('http://localhost:5173/#/gods-eye', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 4000));

  const info = await page.evaluate(() => {
    // Look for Cesium viewer
    const container = document.querySelector('.cesium-viewer') || document.querySelector('#cesiumContainer') || document.querySelector('[class*="cesium"]');
    const canvas = document.querySelector('canvas');
    let webglOk = false;
    if (canvas) {
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      webglOk = !!gl;
    }
    return {
      hasContainer: !!container,
      hasCanvas: !!canvas,
      webglOk,
      bodyHtml: document.body.innerHTML.length
    };
  });
  console.log('Cesium status:', JSON.stringify(info, null, 2));

  await browser.close();
})();
