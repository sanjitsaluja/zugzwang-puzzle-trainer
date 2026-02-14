import { chromium } from '@playwright/test';

async function measureLayout() {
  const browser = await chromium.launch();
  
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 }
  });
  const mobilePage = await mobileContext.newPage();
  
  console.log('Navigating to http://localhost:5173/puzzle/4...');
  await mobilePage.goto('http://localhost:5173/puzzle/4', { waitUntil: 'domcontentloaded' });
  
  console.log('Waiting 2 seconds for hot reload...');
  await mobilePage.waitForTimeout(2000);
  
  console.log('Taking screenshot...');
  await mobilePage.screenshot({ path: 'mobile-layout-check.png', fullPage: false });
  console.log('Screenshot saved to mobile-layout-check.png\n');
  
  // Run the specific measurements
  console.log('=== Layout Measurements ===\n');
  
  const measurements = await mobilePage.evaluate(() => {
    const results = {};
    
    // 1. padding-top of ui-app-shell
    const appShell = document.querySelector('.ui-app-shell');
    if (appShell) {
      const styles = window.getComputedStyle(appShell);
      results.appShellPaddingTop = styles.paddingTop;
    } else {
      results.appShellPaddingTop = 'Element not found';
    }
    
    // 2. getBoundingClientRect().top of ui-layout-header
    const layoutHeader = document.querySelector('.ui-layout-header');
    if (layoutHeader) {
      results.layoutHeaderTop = layoutHeader.getBoundingClientRect().top;
    } else {
      results.layoutHeaderTop = 'Element not found';
    }
    
    // 3. getBoundingClientRect().top of ui-layout-board
    const layoutBoard = document.querySelector('.ui-layout-board');
    if (layoutBoard) {
      results.layoutBoardTop = layoutBoard.getBoundingClientRect().top;
    } else {
      results.layoutBoardTop = 'Element not found';
    }
    
    // 4. getBoundingClientRect().height of ui-layout-board
    if (layoutBoard) {
      results.layoutBoardHeight = layoutBoard.getBoundingClientRect().height;
    } else {
      results.layoutBoardHeight = 'Element not found';
    }
    
    // 5. getBoundingClientRect().top of ui-board-wrapper
    const boardWrapper = document.querySelector('.ui-board-wrapper');
    if (boardWrapper) {
      results.boardWrapperTop = boardWrapper.getBoundingClientRect().top;
    } else {
      results.boardWrapperTop = 'Element not found';
    }
    
    // 6. computed align-self of ui-layout-board
    if (layoutBoard) {
      const styles = window.getComputedStyle(layoutBoard);
      results.layoutBoardAlignSelf = styles.alignSelf;
    } else {
      results.layoutBoardAlignSelf = 'Element not found';
    }
    
    return results;
  });
  
  console.log('1. padding-top of .ui-app-shell:');
  console.log(`   ${measurements.appShellPaddingTop}\n`);
  
  console.log('2. getBoundingClientRect().top of .ui-layout-header:');
  console.log(`   ${measurements.layoutHeaderTop}px\n`);
  
  console.log('3. getBoundingClientRect().top of .ui-layout-board:');
  console.log(`   ${measurements.layoutBoardTop}px\n`);
  
  console.log('4. getBoundingClientRect().height of .ui-layout-board:');
  console.log(`   ${measurements.layoutBoardHeight}px\n`);
  
  console.log('5. getBoundingClientRect().top of .ui-board-wrapper:');
  console.log(`   ${measurements.boardWrapperTop}px\n`);
  
  console.log('6. computed align-self of .ui-layout-board:');
  console.log(`   ${measurements.layoutBoardAlignSelf}\n`);
  
  await mobileContext.close();
  await browser.close();
  console.log('Done!');
}

measureLayout().catch(console.error);
