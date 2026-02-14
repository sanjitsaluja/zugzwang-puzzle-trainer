import { chromium } from '@playwright/test';

async function captureDetailedScreenshot() {
  const browser = await chromium.launch();
  
  // Mobile screenshot (iPhone 14)
  console.log('Capturing mobile screenshot (390x844)...');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 }
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://localhost:5173/puzzle/4', { waitUntil: 'domcontentloaded' });
  await mobilePage.waitForTimeout(2000); // Wait for any animations/renders
  
  // Get detailed measurements
  const measurements = await mobilePage.evaluate(() => {
    const header = document.querySelector('header');
    const board = document.querySelector('[class*="board"]') || document.querySelector('.chessboard');
    
    const headerRect = header?.getBoundingClientRect();
    const boardRect = board?.getBoundingClientRect();
    
    // Get all text elements in header
    const headerElements = [];
    if (header) {
      const walker = document.createTreeWalker(
        header,
        NodeFilter.SHOW_TEXT,
        null
      );
      
      let node = walker.nextNode();
      while (node) {
        const parent = node.parentElement;
        if (node.textContent?.trim()) {
          const rect = parent.getBoundingClientRect();
          const styles = window.getComputedStyle(parent);
          headerElements.push({
            text: node.textContent.trim(),
            fontSize: styles.fontSize,
            fontWeight: styles.fontWeight,
            color: styles.color,
            top: rect.top,
            left: rect.left
          });
        }
        node = walker.nextNode();
      }
    }
    
    return {
      headerTop: headerRect?.top || 0,
      headerHeight: headerRect?.height || 0,
      boardTop: boardRect?.top || 0,
      boardHeight: boardRect?.height || 0,
      viewportHeight: window.innerHeight,
      headerElements,
      hasStopwatchIcon: !!document.querySelector('svg[class*="stopwatch"]') || 
                        !!document.querySelector('[class*="timer"] svg') ||
                        !!document.querySelector('[class*="clock"] svg')
    };
  });
  
  console.log('\n=== Mobile Layout Measurements ===');
  console.log(`Header top position: ${measurements.headerTop}px`);
  console.log(`Header height: ${measurements.headerHeight}px`);
  console.log(`Board top position: ${measurements.boardTop}px`);
  console.log(`Board height: ${measurements.boardHeight}px`);
  console.log(`Viewport height: ${measurements.viewportHeight}px`);
  console.log(`Has stopwatch icon: ${measurements.hasStopwatchIcon}`);
  console.log('\nHeader text elements:');
  measurements.headerElements.forEach((el, i) => {
    console.log(`  ${i + 1}. "${el.text}"`);
    console.log(`     Font size: ${el.fontSize}, Weight: ${el.fontWeight}, Color: ${el.color}`);
    console.log(`     Position: top=${el.top}px, left=${el.left}px`);
  });
  
  await mobilePage.screenshot({ path: 'mobile-detailed.png', fullPage: false });
  console.log('\nScreenshot saved to mobile-detailed.png');
  
  await mobileContext.close();
  await browser.close();
  console.log('Done!');
}

captureDetailedScreenshot().catch(console.error);
