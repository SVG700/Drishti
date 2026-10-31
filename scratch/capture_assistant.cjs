const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  await page.goto('http://localhost:5173/#/assistant?id=400102', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // Type the inquiry into the input bar
  const inputEl = await page.$('input[placeholder*="Ask"]');
  if (inputEl) {
    await inputEl.type('What is the current progress and delay risk of project 400102?');
  } else {
    // Fallback to any text input in the main container
    const inputs = await page.$$('input[type="text"]');
    for (const inp of inputs) {
      const ph = await (await inp.getProperty('placeholder')).jsonValue();
      if (ph && ph.toLowerCase().includes('ask')) {
        await inp.type('What is the current progress and delay risk of project 400102?');
        break;
      }
    }
  }

  // Press Enter to submit
  await page.keyboard.press('Enter');
  console.log('Submitted question to DRISHTI AI Assistant, awaiting response...');

  // Wait for the response to arrive and render
  await new Promise(r => setTimeout(r, 6000));

  await page.screenshot({ path: 'test_assistant_response.png' });
  console.log('Captured assistant response screenshot!');

  await browser.close();
})();
