import { chromium } from '@playwright/test';

async function compareLayouts() {
  const browser = await chromium.launch();
  
  // ===== MOBILE VIEWPORT =====
  console.log('=== MOBILE VIEWPORT (390x844) ===\n');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 }
  });
  const mobilePage = await mobileContext.newPage();
  
  console.log('Navigating to http://localhost:5173/puzzle/4...');
  await mobilePage.goto('http://localhost:5173/puzzle/4', { waitUntil: 'domcontentloaded' });
  
  console.log('Waiting 2 seconds for hot reload...');
  await mobilePage.waitForTimeout(2000);
  
  // Get mobile layout info
  const mobileInfo = await mobilePage.evaluate(() => {
    const header = document.querySelector('.ui-layout-header');
    const board = document.querySelector('.ui-layout-board');
    const timerIcon = document.querySelector('.ui-timer-icon') || 
                      document.querySelector('[class*="timer"] svg') ||
                      document.querySelector('[class*="stopwatch"]');
    
    // Get all text elements in header
    const headerTexts = [];
    if (header) {
      const textElements = header.querySelectorAll('*');
      textElements.forEach(el => {
        const text = el.textContent?.trim();
        if (text && text.length < 50 && el.children.length === 0) {
          const styles = window.getComputedStyle(el);
          headerTexts.push({
            text: text,
            fontSize: styles.fontSize,
            fontWeight: styles.fontWeight,
            color: styles.color
          });
        }
      });
    }
    
    return {
      headerTop: header ? header.getBoundingClientRect().top : null,
      headerHeight: header ? header.getBoundingClientRect().height : null,
      boardTop: board ? board.getBoundingClientRect().top : null,
      boardHeight: board ? board.getBoundingClientRect().height : null,
      boardAlignSelf: board ? getComputedStyle(board).alignSelf : null,
      hasTimerIcon: !!timerIcon,
      timerIconSize: timerIcon ? {
        width: timerIcon.getBoundingClientRect().width,
        height: timerIcon.getBoundingClientRect().height
      } : null,
      headerTexts: headerTexts,
      viewportHeight: window.innerHeight
    };
  });
  
  console.log('Mobile Layout Analysis:');
  console.log(`  Header top: ${mobileInfo.headerTop}px`);
  console.log(`  Header height: ${mobileInfo.headerHeight}px`);
  console.log(`  Board top: ${mobileInfo.boardTop}px`);
  console.log(`  Board height: ${mobileInfo.boardHeight}px`);
  console.log(`  Board align-self: ${mobileInfo.boardAlignSelf}`);
  console.log(`  Has timer icon: ${mobileInfo.hasTimerIcon}`);
  if (mobileInfo.timerIconSize) {
    console.log(`  Timer icon size: ${mobileInfo.timerIconSize.width}x${mobileInfo.timerIconSize.height}px`);
  }
  console.log(`\n  Header text elements:`);
  mobileInfo.headerTexts.forEach((el, i) => {
    console.log(`    ${i + 1}. "${el.text}"`);
    console.log(`       Font: ${el.fontSize} / weight=${el.fontWeight} / color=${el.color}`);
  });
  
  // Calculate if board is centered
  const spaceAboveBoard = mobileInfo.boardTop - mobileInfo.headerHeight;
  const spaceBelowBoard = mobileInfo.viewportHeight - (mobileInfo.boardTop + mobileInfo.boardHeight);
  console.log(`\n  Space above board: ${spaceAboveBoard.toFixed(2)}px`);
  console.log(`  Space below board: ${spaceBelowBoard.toFixed(2)}px`);
  console.log(`  Vertically centered: ${Math.abs(spaceAboveBoard - spaceBelowBoard) < 5 ? 'YES' : 'NO'}`);
  
  console.log('\nTaking mobile screenshot...');
  await mobilePage.screenshot({ path: 'final-mobile.png', fullPage: false });
  console.log('Screenshot saved to final-mobile.png\n');
  
  await mobileContext.close();
  
  // ===== DESKTOP VIEWPORT =====
  console.log('\n=== DESKTOP VIEWPORT (1440x900) ===\n');
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const desktopPage = await desktopContext.newPage();
  
  console.log('Navigating to http://localhost:5173/puzzle/4...');
  await desktopPage.goto('http://localhost:5173/puzzle/4', { waitUntil: 'domcontentloaded' });
  
  console.log('Waiting 2 seconds for hot reload...');
  await desktopPage.waitForTimeout(2000);
  
  // Get desktop layout info
  const desktopInfo = await desktopPage.evaluate(() => {
    const board = document.querySelector('.ui-layout-board');
    const sidebar = document.querySelector('.ui-layout-sidebar') || 
                    document.querySelector('[class*="sidebar"]') ||
                    document.querySelector('[class*="info"]');
    const layout = document.querySelector('.ui-app-layout');
    
    return {
      layoutDisplay: layout ? getComputedStyle(layout).display : null,
      layoutFlexDirection: layout ? getComputedStyle(layout).flexDirection : null,
      boardLeft: board ? board.getBoundingClientRect().left : null,
      boardWidth: board ? board.getBoundingClientRect().width : null,
      boardHeight: board ? board.getBoundingClientRect().height : null,
      sidebarExists: !!sidebar,
      sidebarLeft: sidebar ? sidebar.getBoundingClientRect().left : null,
      sidebarWidth: sidebar ? sidebar.getBoundingClientRect().width : null,
      viewportWidth: window.innerWidth
    };
  });
  
  console.log('Desktop Layout Analysis:');
  console.log(`  Layout display: ${desktopInfo.layoutDisplay}`);
  console.log(`  Layout flex-direction: ${desktopInfo.layoutFlexDirection}`);
  console.log(`  Board left: ${desktopInfo.boardLeft}px`);
  console.log(`  Board width: ${desktopInfo.boardWidth}px`);
  console.log(`  Board height: ${desktopInfo.boardHeight}px`);
  console.log(`  Sidebar exists: ${desktopInfo.sidebarExists}`);
  if (desktopInfo.sidebarExists) {
    console.log(`  Sidebar left: ${desktopInfo.sidebarLeft}px`);
    console.log(`  Sidebar width: ${desktopInfo.sidebarWidth}px`);
  }
  console.log(`  Layout type: ${desktopInfo.boardLeft < 100 ? 'Board on LEFT' : 'Board on RIGHT or centered'}`);
  
  console.log('\nTaking desktop screenshot...');
  await desktopPage.screenshot({ path: 'final-desktop.png', fullPage: false });
  console.log('Screenshot saved to final-desktop.png\n');
  
  await desktopContext.close();
  await browser.close();
  
  console.log('Done!');
}

compareLayouts().catch(console.error);
