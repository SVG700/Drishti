const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const outDir = path.resolve(__dirname, '../brag-output/composition/assets/ui');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

(async () => {
  console.log('Launching browser to capture DRISHTI live application...');
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

  // 1. Overview Dashboard
  console.log('1. Capturing Executive Dashboard...');
  await page.goto('http://localhost:5173/#/overview', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: path.join(outDir, 'scene2_dashboard.png') });

  // 2. Projects Explorer List
  console.log('2. Capturing Projects Explorer List...');
  await page.goto('http://localhost:5173/#/projects?id=400102', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: path.join(outDir, 'scene3_projects_list.png') });

  // 3. Project Dossier Modal
  console.log('3. Opening Project 400102 Dossier Modal...');
  try {
    const dossierBtn = await page.$('button ::-p-text(Dossier)');
    if (dossierBtn) {
      await dossierBtn.click();
      await new Promise(r => setTimeout(r, 2000));
      await page.screenshot({ path: path.join(outDir, 'scene3_project_dossier.png') });
    } else {
      const inspectBtn = await page.$('button[title*="dossier" i], button[title*="inspect" i]');
      if (inspectBtn) await inspectBtn.click();
      await new Promise(r => setTimeout(r, 2000));
      await page.screenshot({ path: path.join(outDir, 'scene3_project_dossier.png') });
    }
  } catch (e) {
    console.log('Dossier capture note:', e.message);
  }

  // 4. God's Eye 3D Geospatial Intelligence (Overview & Zoom)
  console.log('4. Capturing God\'s Eye 3D Geospatial View...');
  await page.goto('http://localhost:5173/#/gods-eye?id=400102', { waitUntil: 'networkidle2' });
  // Wait for Cesium and Esri satellite tiles to load
  await new Promise(r => setTimeout(r, 5000));
  
  // Set camera to regional Pochampad / Telangana view where terrain, reservoir, and project marker are visible
  await page.evaluate(() => {
    const v = window.cesiumViewer;
    if (v) {
      v.camera.setView({
        destination: v.scene.globe.ellipsoid.cartographicToCartesian(
          { longitude: 78.48 * Math.PI / 180, latitude: 18.98 * Math.PI / 180, height: 18000 }
        ),
        orientation: {
          heading: 20 * Math.PI / 180,
          pitch: -38 * Math.PI / 180,
          roll: 0
        }
      });
    }
  });
  await new Promise(r => setTimeout(r, 4000));
  await page.screenshot({ path: path.join(outDir, 'scene4_godseye_3d.png') });

  // Also capture global/India view for smooth transition
  await page.evaluate(() => {
    const v = window.cesiumViewer;
    if (v) {
      v.camera.setView({
        destination: v.scene.globe.ellipsoid.cartographicToCartesian(
          { longitude: 78.9629 * Math.PI / 180, latitude: 20.5937 * Math.PI / 180, height: 3800000 }
        ),
        orientation: {
          heading: 0,
          pitch: -68 * Math.PI / 180,
          roll: 0
        }
      });
    }
  });
  await new Promise(r => setTimeout(r, 4000));
  await page.screenshot({ path: path.join(outDir, 'scene4_godseye_globe.png') });

  // 5. DRISHTI AI Assistant
  console.log('5. Interacting with DRISHTI AI Assistant...');
  await page.goto('http://localhost:5173/#/assistant?id=400102', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2500));
  
  const inputEl = await page.$('input[placeholder*="Ask"]');
  if (inputEl) {
    await inputEl.type('What is the current progress and delay risk of project 400102?');
    await page.keyboard.press('Enter');
    console.log('Query submitted, waiting for grounded AI synthesis...');
    await new Promise(r => setTimeout(r, 6000));
  }
  await page.screenshot({ path: path.join(outDir, 'scene5_assistant_chat.png') });

  // 6. Predictive Analytics View
  console.log('6. Capturing Predictive Analytics View...');
  await page.goto('http://localhost:5173/#/analytics?id=400102', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3500));
  await page.screenshot({ path: path.join(outDir, 'scene6_analytics_forecast.png') });

  // 7. Executive Reports View
  console.log('7. Capturing Executive Reports Brief View...');
  await page.goto('http://localhost:5173/#/reports?id=400102', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3500));
  await page.screenshot({ path: path.join(outDir, 'scene6_reports_brief.png') });

  console.log('All real application screenshots successfully captured!');
  await browser.close();
})();
