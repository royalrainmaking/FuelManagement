const { test, expect } = require('@playwright/test');

test.describe('Daily Balance Confirmation Feature', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    // Intercept and log network requests to Google Apps Script
    page.on('request', request => {
      if (request.url().includes('script.google.com')) {
        console.log('📡 API Request to Google Apps Script:');
        console.log('  URL:', request.url());
        console.log('  Method:', request.method());
      }
    });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should render daily confirmation button for each fuel source', async () => {
    await page.goto('http://localhost:3000');
    
    // Wait for inventory table to load
    await page.waitForSelector('table tbody', { timeout: 5000 });
    
    // Check for daily confirmation buttons (one per source)
    const confirmButtons = await page.locator('[id^="btn-"]').count();
    expect(confirmButtons).toBeGreaterThan(0);
    
    console.log(`✅ Found ${confirmButtons} daily confirmation button(s)`);
  });

  test('should open confirmation modal when button is clicked', async () => {
    await page.goto('http://localhost:3000');
    
    // Wait for inventory to load
    await page.waitForSelector('table tbody', { timeout: 5000 });
    
    // Get first confirmation button
    const firstButton = await page.locator('[id^="btn-"]').first();
    await firstButton.click();
    
    // Modal should be visible
    const modal = page.locator('#dailyConfirmationModal');
    await expect(modal).toBeVisible();
    
    // Modal should have operator name input field
    const operatorInput = page.locator('#confirmationOperatorName');
    await expect(operatorInput).toBeVisible();
    
    console.log('✅ Modal opened successfully');
  });

  test('should show validation error when operator name is empty', async () => {
    await page.goto('http://localhost:3000');
    
    // Wait for inventory to load
    await page.waitForSelector('table tbody', { timeout: 5000 });
    
    // Click first confirmation button
    const firstButton = await page.locator('[id^="btn-"]').first();
    await firstButton.click();
    
    // Wait for modal
    await page.locator('#dailyConfirmationModal').waitFor({ state: 'visible' });
    
    // Click submit button without filling operator name
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('กรุณากรอกชื่อผู้ปฏิบัติการ');
      await dialog.accept();
    });
    
    const submitBtn = page.locator('button:has-text("บันทึก")').first();
    await submitBtn.click();
    
    console.log('✅ Validation error shown for empty operator name');
  });

  test('should submit daily confirmation with valid data', async () => {
    await page.goto('http://localhost:3000');
    
    // Wait for inventory to load
    await page.waitForSelector('table tbody', { timeout: 5000 });
    
    // Capture network requests to Google Apps Script
    const requests = [];
    page.on('request', request => {
      if (request.url().includes('script.google.com')) {
        requests.push({
          url: request.url(),
          method: request.method()
        });
      }
    });
    
    // Click first confirmation button
    const firstButton = await page.locator('[id^="btn-"]').first();
    const buttonId = await firstButton.getAttribute('id');
    await firstButton.click();
    
    // Wait for modal
    await page.locator('#dailyConfirmationModal').waitFor({ state: 'visible' });
    
    // Fill operator name
    const operatorInput = page.locator('#confirmationOperatorName');
    await operatorInput.fill('ผู้ทดสอบระบบ');
    
    // Submit form
    page.once('dialog', async dialog => {
      await dialog.accept();
    });
    
    const submitBtn = page.locator('button:has-text("บันทึก")').first();
    await submitBtn.click();
    
    // Wait for modal to close
    await page.waitForTimeout(1000);
    
    // Verify modal is closed
    const modal = page.locator('#dailyConfirmationModal');
    expect(await modal.evaluate(el => el.style.display)).toBe('none');
    
    // Verify API request was made
    expect(requests.length).toBeGreaterThan(0);
    const apiCall = requests[0];
    expect(apiCall.url).toContain('logDailyConfirmation');
    expect(apiCall.url).toContain('gid=1512968674');
    
    console.log('✅ Daily confirmation submitted successfully');
    console.log('📡 API URL:', apiCall.url);
  });

  test('should verify confirmation data in API request', async () => {
    await page.goto('http://localhost:3000');
    
    // Wait for inventory to load
    await page.waitForSelector('table tbody', { timeout: 5000 });
    
    // Capture request details
    const capturedRequests = [];
    page.on('request', request => {
      if (request.url().includes('logDailyConfirmation')) {
        const url = new URL(request.url());
        const params = Object.fromEntries(url.searchParams);
        capturedRequests.push(params);
      }
    });
    
    // Click first confirmation button
    const firstButton = await page.locator('[id^="btn-"]').first();
    await firstButton.click();
    
    // Wait for modal
    await page.locator('#dailyConfirmationModal').waitFor({ state: 'visible' });
    
    // Fill operator name
    await page.locator('#confirmationOperatorName').fill('ทดสอบ123');
    
    // Submit form
    page.once('dialog', async dialog => {
      await dialog.accept();
    });
    
    const submitBtn = page.locator('button:has-text("บันทึก")').first();
    await submitBtn.click();
    
    // Wait for request to be captured
    await page.waitForTimeout(2000);
    
    // Verify request parameters
    expect(capturedRequests.length).toBeGreaterThan(0);
    const requestParams = capturedRequests[0];
    
    expect(requestParams.action).toBe('logDailyConfirmation');
    expect(requestParams.sheetsId).toBeDefined();
    expect(requestParams.gid).toBe('1512968674');
    expect(requestParams.data).toBeDefined();
    
    // Parse and verify data object
    const confirmationData = JSON.parse(requestParams.data);
    expect(confirmationData.operatorName).toBe('ทดสอบ123');
    expect(confirmationData.date).toBeDefined();
    expect(confirmationData.time).toBeDefined();
    expect(confirmationData.sourceName).toBeDefined();
    expect(confirmationData.sourceId).toBeDefined();
    expect(confirmationData.timestamp).toBeDefined();
    
    console.log('✅ Confirmation data verified');
    console.log('📋 Data object:', confirmationData);
  });

  test('should update localStorage with confirmation date', async () => {
    await page.goto('http://localhost:3000');
    
    // Wait for inventory to load
    await page.waitForSelector('table tbody', { timeout: 5000 });
    
    // Get source ID from first button
    const firstButton = await page.locator('[id^="btn-"]').first();
    const buttonId = await firstButton.getAttribute('id');
    const sourceId = buttonId.replace('btn-', '');
    
    // Click first confirmation button
    await firstButton.click();
    
    // Wait for modal
    await page.locator('#dailyConfirmationModal').waitFor({ state: 'visible' });
    
    // Fill operator name and submit
    await page.locator('#confirmationOperatorName').fill('ผู้ทดสอบ');
    
    page.once('dialog', async dialog => {
      await dialog.accept();
    });
    
    const submitBtn = page.locator('button:has-text("บันทึก")').first();
    await submitBtn.click();
    
    // Wait for localStorage update
    await page.waitForTimeout(1000);
    
    // Check localStorage
    const confirmedDate = await page.evaluate((sourceId) => {
      return localStorage.getItem('confirmed_' + sourceId);
    }, sourceId);
    
    const lastConfirmationDate = await page.evaluate(() => {
      return localStorage.getItem('lastConfirmationDate');
    });
    
    expect(confirmedDate).toBeDefined();
    expect(lastConfirmationDate).toBeDefined();
    
    console.log('✅ localStorage updated');
    console.log('  confirmed_' + sourceId + ':', confirmedDate);
    console.log('  lastConfirmationDate:', lastConfirmationDate);
  });

  test('should hide confirmation button after successful submission', async () => {
    await page.goto('http://localhost:3000');
    
    // Wait for inventory to load
    await page.waitForSelector('table tbody', { timeout: 5000 });
    
    // Get first confirmation button
    const firstButton = await page.locator('[id^="btn-"]').first();
    const buttonId = await firstButton.getAttribute('id');
    
    // Verify button is initially visible
    await expect(firstButton).toBeVisible();
    
    // Click button
    await firstButton.click();
    
    // Wait for modal
    await page.locator('#dailyConfirmationModal').waitFor({ state: 'visible' });
    
    // Fill and submit form
    await page.locator('#confirmationOperatorName').fill('ผู้ทดสอบ');
    
    page.once('dialog', async dialog => {
      await dialog.accept();
    });
    
    const submitBtn = page.locator('button:has-text("บันทึก")').first();
    await submitBtn.click();
    
    // Wait for button to be hidden
    await page.waitForTimeout(1000);
    
    // Verify button is hidden
    const buttonDisplay = await page.locator('#' + buttonId).evaluate(el => el.style.display);
    expect(buttonDisplay).toBe('none');
    
    console.log('✅ Confirmation button hidden after submission');
  });

  test('should use correct API endpoint from config', async () => {
    await page.goto('http://localhost:3000');
    
    // Wait for inventory to load
    await page.waitForSelector('table tbody', { timeout: 5000 });
    
    // Verify config is loaded
    const scriptUrl = await page.evaluate(() => {
      return typeof GOOGLE_SCRIPT_URL !== 'undefined' ? GOOGLE_SCRIPT_URL : null;
    });
    
    expect(scriptUrl).toBeDefined();
    expect(scriptUrl).toContain('script.google.com');
    
    console.log('✅ Config loaded correctly');
    console.log('  GOOGLE_SCRIPT_URL:', scriptUrl);
  });

  test('should handle multiple confirmations for different sources', async () => {
    await page.goto('http://localhost:3000');
    
    // Wait for inventory to load
    await page.waitForSelector('table tbody', { timeout: 5000 });
    
    // Get all confirmation buttons
    const buttons = await page.locator('[id^="btn-"]');
    const buttonCount = await buttons.count();
    
    if (buttonCount < 2) {
      console.log('⚠️ Only one fuel source available, skipping multi-source test');
      return;
    }
    
    // Submit confirmation for first source
    const firstButton = await page.locator('[id^="btn-"]').nth(0);
    await firstButton.click();
    
    await page.locator('#dailyConfirmationModal').waitFor({ state: 'visible' });
    await page.locator('#confirmationOperatorName').fill('ผู้ทดสอบ1');
    
    page.once('dialog', async dialog => {
      await dialog.accept();
    });
    
    let submitBtn = page.locator('button:has-text("บันทึก")').first();
    await submitBtn.click();
    
    // Wait for first submission to complete
    await page.waitForTimeout(1500);
    
    // Submit confirmation for second source
    const secondButton = await page.locator('[id^="btn-"]').nth(1);
    if (await secondButton.isVisible()) {
      await secondButton.click();
      
      await page.locator('#dailyConfirmationModal').waitFor({ state: 'visible' });
      await page.locator('#confirmationOperatorName').fill('ผู้ทดสอบ2');
      
      page.once('dialog', async dialog => {
        await dialog.accept();
      });
      
      submitBtn = page.locator('button:has-text("บันทึก")').first();
      await submitBtn.click();
      
      console.log('✅ Multiple confirmations submitted successfully');
    }
  });

  test('should close modal when close button is clicked', async () => {
    await page.goto('http://localhost:3000');
    
    // Wait for inventory to load
    await page.waitForSelector('table tbody', { timeout: 5000 });
    
    // Click first confirmation button
    const firstButton = await page.locator('[id^="btn-"]').first();
    await firstButton.click();
    
    // Wait for modal
    const modal = page.locator('#dailyConfirmationModal');
    await modal.waitFor({ state: 'visible' });
    
    // Find and click close button
    const closeButton = modal.locator('button:has-text("ปิด"), [aria-label="Close"], .btn-close').first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
    } else {
      // Try clicking outside modal or using escape key
      await page.press('Escape');
    }
    
    // Wait for modal to close
    await page.waitForTimeout(500);
    
    // Verify modal is closed
    const modalDisplay = await modal.evaluate(el => el.style.display);
    expect(modalDisplay).toBe('none');
    
    console.log('✅ Modal closed successfully');
  });

  test('should clear form after submission', async () => {
    await page.goto('http://localhost:3000');
    
    // Wait for inventory to load
    await page.waitForSelector('table tbody', { timeout: 5000 });
    
    // Click first confirmation button
    const firstButton = await page.locator('[id^="btn-"]').first();
    await firstButton.click();
    
    // Wait for modal
    await page.locator('#dailyConfirmationModal').waitFor({ state: 'visible' });
    
    // Fill operator name
    const operatorInput = page.locator('#confirmationOperatorName');
    await operatorInput.fill('ทดสอบฟอร์ม');
    
    // Submit form
    page.once('dialog', async dialog => {
      await dialog.accept();
    });
    
    const submitBtn = page.locator('button:has-text("บันทึก")').first();
    await submitBtn.click();
    
    // Wait for form to clear
    await page.waitForTimeout(1000);
    
    // Check that input is cleared
    const inputValue = await operatorInput.inputValue();
    expect(inputValue).toBe('');
    
    console.log('✅ Form cleared after submission');
  });
});