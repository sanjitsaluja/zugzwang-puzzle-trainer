import { chromium } from '@playwright/test';

async function captureScreenshots() {
  const browser = await chromium.launch();
  
  // Mobile screenshot (iPhone 14)
  console.log('Capturing mobile screenshot (390x844)...');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 }
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://localhost:5173/puzzle/4', { waitUntil: 'domcontentloaded' });
  await mobilePage.waitForTimeout(2000); // Wait for any animations/renders
  await mobilePage.screenshot({ path: 'mobile-screenshot.png' });
  console.log('Mobile screenshot saved to mobile-screenshot.png');
  await mobileContext.close();
  
  // Desktop screenshot
  console.log('Capturing desktop screenshot (1440x900)...');
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto('http://localhost:5173/puzzle/4', { waitUntil: 'domcontentloaded' });
  await desktopPage.waitForTimeout(2000); // Wait for any animations/renders
  await desktopPage.screenshot({ path: 'desktop-screenshot.png' });
  console.log('Desktop screenshot saved to desktop-screenshot.png');
  await desktopContext.close();
  
  await browser.close();
  console.log('Done!');
}

captureScreenshots().catch(console.error);
