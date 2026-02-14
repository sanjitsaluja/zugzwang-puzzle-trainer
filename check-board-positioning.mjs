import { chromium } from '@playwright/test';

async function checkBoardPositioning() {
  const browser = await chromium.launch();
  
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 }
  });
  const mobilePage = await mobileContext.newPage();
  
  console.log('Navigating to http://localhost:5173/puzzle/4...');
  await mobilePage.goto('http://localhost:5173/puzzle/4', { waitUntil: 'domcontentloaded' });
  
  console.log('Waiting 2 seconds for hot reload...');
  await mobilePage.waitForTimeout(2000);
  
  console.log('Running JavaScript measurements...\n');
  
  const measurements = await mobilePage.evaluate(() => {
    const header = document.querySelector('.ui-layout-header');
    const board = document.querySelector('.ui-layout-board');
    const wrapper = document.querySelector('.ui-board-wrapper');
    const moves = document.querySelector('.ui-layout-moves');
    const actions = document.querySelector('.ui-layout-actions');
    const layout = document.querySelector('.ui-app-layout');
    
    return {
      layoutHeight: layout ? layout.getBoundingClientRect().height : null,
      headerTop: header ? header.getBoundingClientRect().top : null,
      headerHeight: header ? header.getBoundingClientRect().height : null,
      boardTop: board ? board.getBoundingClientRect().top : null,
      boardHeight: board ? board.getBoundingClientRect().height : null,
      wrapperTop: wrapper ? wrapper.getBoundingClientRect().top : null,
      wrapperHeight: wrapper ? wrapper.getBoundingClientRect().height : null,
      movesTop: moves ? moves.getBoundingClientRect().top : null,
      movesHeight: moves ? moves.getBoundingClientRect().height : null,
      actionsTop: actions ? actions.getBoundingClientRect().top : null,
      actionsHeight: actions ? actions.getBoundingClientRect().height : null,
      boardAlignSelf: board ? getComputedStyle(board).alignSelf : null,
      layoutFlex: layout ? getComputedStyle(layout).flex : null,
    };
  });
  
  console.log('=== Board Positioning Measurements ===\n');
  console.log(JSON.stringify(measurements, null, 2));
  
  console.log('\n=== Individual Values ===\n');
  console.log(`layoutHeight: ${measurements.layoutHeight}`);
  console.log(`headerTop: ${measurements.headerTop}`);
  console.log(`headerHeight: ${measurements.headerHeight}`);
  console.log(`boardTop: ${measurements.boardTop}`);
  console.log(`boardHeight: ${measurements.boardHeight}`);
  console.log(`wrapperTop: ${measurements.wrapperTop}`);
  console.log(`wrapperHeight: ${measurements.wrapperHeight}`);
  console.log(`movesTop: ${measurements.movesTop}`);
  console.log(`movesHeight: ${measurements.movesHeight}`);
  console.log(`actionsTop: ${measurements.actionsTop}`);
  console.log(`actionsHeight: ${measurements.actionsHeight}`);
  console.log(`boardAlignSelf: ${measurements.boardAlignSelf}`);
  console.log(`layoutFlex: ${measurements.layoutFlex}`);
  
  console.log('\nTaking screenshot...');
  await mobilePage.screenshot({ path: 'board-positioning.png', fullPage: false });
  console.log('Screenshot saved to board-positioning.png');
  
  await mobileContext.close();
  await browser.close();
  console.log('\nDone!');
}

checkBoardPositioning().catch(console.error);
