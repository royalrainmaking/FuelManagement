const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  
  // Desktop screenshot - full viewport
  const pageDt = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await pageDt.goto('http://localhost:8000', { waitUntil: 'load' });
  await pageDt.waitForTimeout(3000);
  
  // Capture full page top section
  await pageDt.screenshot({ path: 'cards-desktop-full.png', fullPage: false });
  console.log('Desktop full screenshot saved: cards-desktop-full.png');
  
  // Capture just the cards grid
  const cardsContainer = await pageDt.locator('.row.mb-3.g-2').first();
  await cardsContainer.screenshot({ path: 'cards-desktop.png' });
  console.log('Desktop cards screenshot saved: cards-desktop.png');
  
  // Check computed styles
  const cardInfo = await pageDt.evaluate(() => {
    const card = document.querySelector('.overview-card');
    const body = card?.querySelector('.card-body');
    const icon = card?.querySelector('.overview-icon-wrapper');
    if (card && body) {
      const cardStyle = window.getComputedStyle(card);
      const bodyStyle = window.getComputedStyle(body);
      const iconStyle = window.getComputedStyle(icon);
      return {
        cardBg: cardStyle.background,
        cardBorder: cardStyle.border,
        cardRadius: cardStyle.borderRadius,
        bodyPadding: bodyStyle.padding,
        bodyDisplay: bodyStyle.display,
        gridCols: bodyStyle.gridTemplateColumns,
        iconWidth: iconStyle.width,
        iconHeight: iconStyle.height
      };
    }
    return 'NOT FOUND';
  });
  console.log('Card styles:', JSON.stringify(cardInfo, null, 2));
  
  await pageDt.close();
  
  // Mobile screenshot
  const pageMob = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await pageMob.goto('http://localhost:8000', { waitUntil: 'load' });
  await pageMob.waitForTimeout(3000);
  
  const cardsContainerMob = await pageMob.locator('.row.mb-3.g-2').first();
  await cardsContainerMob.screenshot({ path: 'cards-mobile.png' });
  console.log('Mobile cards screenshot saved: cards-mobile.png');
  await pageMob.close();
  
  await browser.close();
})();
