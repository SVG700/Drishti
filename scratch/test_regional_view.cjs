const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  await page.goto('http://localhost:5173/#/gods-eye?id=400102', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3000));

  // Let's set the Cesium camera to show India and the project marker
  await page.evaluate(() => {
    const Cesium = window.Cesium || (window.cesiumViewer && window.cesiumViewer.constructor.Cesium) || null;
    const v = window.cesiumViewer;
    if (v) {
      // Set camera to regional view over Telangana / Central India
      v.camera.flyTo({
        destination: v.scene.globe.ellipsoid.cartographicToCartesian(
          { longitude: 78.5 * Math.PI / 180, latitude: 19.0 * Math.PI / 180, height: 650000 }
        ),
        orientation: {
          heading: 0,
          pitch: -45 * Math.PI / 180,
          roll: 0
        },
        duration: 0
      });
    }
  });

  await new Promise(r => setTimeout(r, 4000));

  const outPath = path.resolve(__dirname, 'test_godseye_regional.png');
  await page.screenshot({ path: outPath });
  console.log('Regional screenshot saved to', outPath);

  await browser.close();
})();
