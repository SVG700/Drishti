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
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: path.join(outDir, 'scene2_dashboard.png') });

  // 2. Projects Explorer
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
      await new Promise(r => setTimeout(r, 1500));
      await page.screenshot({ path: path.join(outDir, 'scene3_project_dossier.png') });
    } else {
      // Fallback: click inspect or row
      const firstRow = await page.$('tr');
      if (firstRow) await firstRow.click();
      await new Promise(r => setTimeout(r, 1500));
      await page.screenshot({ path: path.join(outDir, 'scene3_project_dossier.png') });
    }
  } catch (e) {
    console.log('Dossier click fallback:', e.message);
    await page.screenshot({ path: path.join(outDir, 'scene3_project_dossier.png') });
  }

  // 4. God's Eye 3D Geospatial Intelligence
  console.log('4. Capturing God\'s Eye 3D Map View...');
  await page.goto('http://localhost:5173/#/gods-eye?id=400102', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 6000)); // Allow Cesium terrain and imagery tiles to settle
  await page.screenshot({ path: path.join(outDir, 'scene4_godseye_3d.png') });

  // 5. DRISHTI AI Assistant
  console.log('5. Interacting with DRISHTI AI Assistant...');
  await page.goto('http://localhost:5173/#/assistant?id=400102', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  
  const inputEl = await page.$('input[placeholder*="Ask"]');
  if (inputEl) {
    await inputEl.type('What is the current progress and delay risk of project 400102?');
    await page.keyboard.press('Enter');
    console.log('Query submitted, waiting for AI synthesis...');
    await new Promise(r => setTimeout(r, 6000));
  }
  await page.screenshot({ path: path.join(outDir, 'scene5_assistant_chat.png') });

  // 6. Predictive Analytics View
  console.log('6. Capturing Predictive Analytics View...');
  await page.goto('http://localhost:5173/#/analytics?id=400102', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: path.join(outDir, 'scene6_analytics_forecast.png') });

  // 7. Executive Reports View
  console.log('7. Capturing Executive Reports Brief View...');
  await page.goto('http://localhost:5173/#/reports?id=400102', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: path.join(outDir, 'scene6_reports_brief.png') });

  console.log('All real application screenshots successfully captured!');
  await browser.close();
})();
