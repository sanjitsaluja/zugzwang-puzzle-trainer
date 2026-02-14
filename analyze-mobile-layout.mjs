import { chromium } from '@playwright/test';

async function analyzeLayout() {
  const browser = await chromium.launch();
  
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 }
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://localhost:5173/puzzle/4', { waitUntil: 'domcontentloaded' });
  await mobilePage.waitForTimeout(2000);
  
  // Get detailed layout info
  const layoutInfo = await mobilePage.evaluate(() => {
    // Find all top-level elements
    const body = document.body;
    const bodyRect = body.getBoundingClientRect();
    
    // Get the main container
    const main = document.querySelector('main') || document.querySelector('[class*="container"]') || body.firstElementChild;
    const mainRect = main?.getBoundingClientRect();
    
    // Find chess board
    const board = document.querySelector('[class*="board"]') || 
                  document.querySelector('.chessboard') ||
                  document.querySelector('svg[viewBox]');
    const boardRect = board?.getBoundingClientRect();
    
    // Find all visible text in the top 100px
    const topElements = [];
    const allElements = document.querySelectorAll('*');
    
    allElements.forEach(el => {
      const rect = el.getBoundingClientRect();
      const styles = window.getComputedStyle(el);
      const text = el.textContent?.trim();
      
      if (rect.top < 100 && text && text.length < 50 && rect.height > 0) {
        // Check if this is a leaf node or has minimal children
        const hasTextChildren = Array.from(el.children).some(child => 
          child.textContent?.trim().length > 0
        );
        
        if (!hasTextChildren || el.children.length === 0) {
          topElements.push({
            tag: el.tagName.toLowerCase(),
            text: text,
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            fontSize: styles.fontSize,
            fontWeight: styles.fontWeight,
            color: styles.color,
            className: el.className
          });
        }
      }
    });
    
    // Check for SVG icons
    const svgs = Array.from(document.querySelectorAll('svg')).filter(svg => {
      const rect = svg.getBoundingClientRect();
      return rect.top < 100 && rect.width < 50 && rect.height < 50;
    });
    
    const icons = svgs.map(svg => ({
      viewBox: svg.getAttribute('viewBox'),
      className: svg.className.baseVal || svg.className,
      top: svg.getBoundingClientRect().top,
      left: svg.getBoundingClientRect().left,
      width: svg.getBoundingClientRect().width,
      height: svg.getBoundingClientRect().height
    }));
    
    return {
      bodyTop: bodyRect.top,
      mainTop: mainRect?.top || 0,
      mainPaddingTop: main ? window.getComputedStyle(main).paddingTop : '0',
      boardTop: boardRect?.top || 0,
      boardLeft: boardRect?.left || 0,
      boardWidth: boardRect?.width || 0,
      boardHeight: boardRect?.height || 0,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
      topElements: topElements.sort((a, b) => a.top - b.top || a.left - b.left),
      icons
    };
  });
  
  console.log('\n=== Mobile Layout Analysis ===');
  console.log(`Viewport: ${layoutInfo.viewportWidth}x${layoutInfo.viewportHeight}px`);
  console.log(`Body top: ${layoutInfo.bodyTop}px`);
  console.log(`Main container top: ${layoutInfo.mainTop}px`);
  console.log(`Main padding-top: ${layoutInfo.mainPaddingTop}`);
  console.log(`\nChess Board:`);
  console.log(`  Position: top=${layoutInfo.boardTop}px, left=${layoutInfo.boardLeft}px`);
  console.log(`  Size: ${layoutInfo.boardWidth}x${layoutInfo.boardHeight}px`);
  
  console.log(`\nTop Elements (first 100px):`);
  layoutInfo.topElements.forEach((el, i) => {
    console.log(`\n${i + 1}. ${el.tag}.${el.className || '(no class)'}`);
    console.log(`   Text: "${el.text}"`);
    console.log(`   Position: top=${el.top.toFixed(1)}px, left=${el.left.toFixed(1)}px`);
    console.log(`   Size: ${el.width.toFixed(1)}x${el.height.toFixed(1)}px`);
    console.log(`   Font: ${el.fontSize} / weight=${el.fontWeight} / color=${el.color}`);
  });
  
  console.log(`\nIcons/SVGs in top area:`);
  layoutInfo.icons.forEach((icon, i) => {
    console.log(`\n${i + 1}. SVG`);
    console.log(`   Class: ${icon.className || '(none)'}`);
    console.log(`   Position: top=${icon.top.toFixed(1)}px, left=${icon.left.toFixed(1)}px`);
    console.log(`   Size: ${icon.width.toFixed(1)}x${icon.height.toFixed(1)}px`);
    console.log(`   ViewBox: ${icon.viewBox || '(none)'}`);
  });
  
  await mobilePage.screenshot({ path: 'mobile-analyzed.png', fullPage: false });
  console.log('\nScreenshot saved to mobile-analyzed.png');
  
  await mobileContext.close();
  await browser.close();
}

analyzeLayout().catch(console.error);
