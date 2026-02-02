import { chromium } from 'playwright';

async function testApp() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  console.log('Opening app at localhost:3000...');

  try {
    await page.goto('http://localhost:3000', { timeout: 10000 });
    await page.waitForLoadState('domcontentloaded');

    // Take a screenshot
    await page.screenshot({ path: 'screenshot-home.png', fullPage: true });
    console.log('Screenshot saved as screenshot-home.png');

    // Get page title
    const title = await page.title();
    console.log('Page title:', title);

    // Check for any visible text
    const bodyText = await page.locator('body').innerText();
    console.log('Body text preview:', bodyText.slice(0, 500));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

testApp().catch(console.error);
