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
  await new Promise(r => setTimeout(r, 4000));

  // 1. First capture: All India Globe Overview
  await page.evaluate(() => {
    const v = window.cesiumViewer;
    if (v) {
      v.camera.setView({
        destination: v.scene.globe.ellipsoid.cartographicToCartesian(
          { longitude: 78.9629 * Math.PI / 180, latitude: 20.5937 * Math.PI / 180, height: 3800000 }
        ),
        orientation: {
          heading: 0,
          pitch: -65 * Math.PI / 180,
          roll: 0
        }
      });
    }
  });
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: path.resolve(__dirname, 'test_godseye_india_globe.png') });
  console.log('Saved test_godseye_india_globe.png');

  // 2. Second capture: Zoomed in to Sri Ram Sagar Project site (Telangana)
  await page.evaluate(() => {
    const v = window.cesiumViewer;
    if (v) {
      v.camera.setView({
        destination: v.scene.globe.ellipsoid.cartographicToCartesian(
          { longitude: 78.3347 * Math.PI / 180, latitude: 18.9686 * Math.PI / 180, height: 48000 }
        ),
        orientation: {
          heading: 25 * Math.PI / 180,
          pitch: -42 * Math.PI / 180,
          roll: 0
        }
      });
    }
  });
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: path.resolve(__dirname, 'test_godseye_project_zoom.png') });
  console.log('Saved test_godseye_project_zoom.png');

  await browser.close();
})();
