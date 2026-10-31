const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('LOG:', msg.text()));
  page.on('pageerror', err => console.log('ERR:', err.message));
  page.on('requestfailed', req => console.log('REQ FAILED:', req.url(), req.failure().errorText));

  await page.goto('http://localhost:5173/#/gods-eye?id=400102', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 4000));

  const tilesInfo = await page.evaluate(() => {
    const v = window.cesiumViewer;
    if (!v) return 'no viewer';
    const layers = [];
    for (let i = 0; i < v.imageryLayers.length; i++) {
      const l = v.imageryLayers.get(i);
      layers.push({
        ready: l.ready,
        show: l.show,
        alpha: l.alpha,
        provider: l.imageryProvider ? l.imageryProvider.constructor.name : null
      });
    }
    return {
      layers,
      globeShow: v.scene.globe.show,
      globeBaseColor: v.scene.globe.baseColor.toCssColorString(),
      enableLighting: v.scene.globe.enableLighting
    };
  });

  console.log('Cesium layers info:', JSON.stringify(tilesInfo, null, 2));

  await browser.close();
})();
