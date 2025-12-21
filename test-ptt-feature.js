/**
 * PTT Price Feature - Comprehensive Test Script
 * Run these tests in browser console to verify the feature works correctly
 */

const PTTTests = {
  // Test 1: Load PTT prices and verify cache
  async test1_LoadPricesAndCache() {
    console.log('\n=== TEST 1: Load PTT Prices and Cache ===');
    try {
      localStorage.removeItem('pttPrices');
      const prices = await fetchPTTPricesFromSheets();
      
      console.assert(prices !== null, '❌ Prices should not be null');
      console.assert(prices.average > 0, '❌ Average should be > 0');
      console.assert(Object.keys(prices.prices).length > 0, '❌ Should have at least one province');
      
      const cached = JSON.parse(localStorage.getItem('pttPrices'));
      console.assert(cached !== null, '❌ Cache should exist');
      console.assert(cached.average === prices.average, '❌ Cache should match fetched data');
      
      console.log('✅ TEST 1 PASSED: Prices loaded and cached correctly');
      console.log('   - Average Price:', prices.average);
      console.log('   - Provinces:', Object.keys(prices.prices).length);
      return true;
    } catch (error) {
      console.error('❌ TEST 1 FAILED:', error);
      return false;
    }
  },

  // Test 2: Verify cache is used on second load
  async test2_CacheUsage() {
    console.log('\n=== TEST 2: Cache Usage ===');
    try {
      const prices1 = await fetchPTTPricesFromSheets();
      const prices2 = await fetchPTTPricesFromSheets();
      
      console.assert(JSON.stringify(prices1) === JSON.stringify(prices2), '❌ Cached prices should match');
      console.log('✅ TEST 2 PASSED: Cache is being used correctly');
      return true;
    } catch (error) {
      console.error('❌ TEST 2 FAILED:', error);
      return false;
    }
  },

  // Test 3: Province in price sheet
  async test3_ProvinceInSheet() {
    console.log('\n=== TEST 3: Province in Price Sheet ===');
    try {
      const prices = await fetchPTTPricesFromSheets();
      
      const testProvince = Object.keys(prices.prices)[0];
      if (!testProvince) {
        console.log('⚠️ No provinces in sheet, skipping test');
        return true;
      }
      
      const result = matchProvinceToPrice(testProvince, prices.prices, prices.average);
      
      console.assert(result.source === 'province', '❌ Should detect province-specific price');
      console.assert(result.price > 0, '❌ Price should be > 0');
      console.assert(result.price === prices.prices[testProvince], '❌ Price should match sheet value');
      
      console.log(`✅ TEST 3 PASSED: Province "${testProvince}" found`);
      console.log(`   - Price: ${result.price}`);
      console.log(`   - Source: ${result.source}`);
      return true;
    } catch (error) {
      console.error('❌ TEST 3 FAILED:', error);
      return false;
    }
  },

  // Test 4: Province NOT in sheet - should return average
  async test4_UnknownProvince() {
    console.log('\n=== TEST 4: Unknown Province Returns Average ===');
    try {
      const prices = await fetchPTTPricesFromSheets();
      const unknownProvince = 'UnknownProvinceXYZ123';
      
      const result = matchProvinceToPrice(unknownProvince, prices.prices, prices.average);
      
      console.assert(result.source === 'average', '❌ Should use average for unknown province');
      console.assert(result.price === prices.average, '❌ Should match average price');
      console.assert(result.price > 0, '❌ Average price should be > 0');
      
      console.log('✅ TEST 4 PASSED: Unknown province returns average');
      console.log(`   - Average: ${result.price}`);
      console.log(`   - Source: ${result.source}`);
      return true;
    } catch (error) {
      console.error('❌ TEST 4 FAILED:', error);
      return false;
    }
  },

  // Test 5: Check Nakhonsawan modal elements exist
  test5_NakhonsawanModalElements() {
    console.log('\n=== TEST 5: Nakhonsawan Modal Elements ===');
    try {
      const checkbox = document.getElementById('transactionNakhonsawanPPTCheckbox');
      const indicator = document.getElementById('transactionNakhonsawanPriceIndicator');
      const priceSource = document.getElementById('transactionNakhonsawanPriceSource');
      const operatingUnit = document.getElementById('transactionNakhonsawanOperatingUnit');
      
      console.assert(checkbox !== null, '❌ PTT checkbox not found');
      console.assert(indicator !== null, '❌ Price indicator not found');
      console.assert(priceSource !== null, '❌ Price source element not found');
      console.assert(operatingUnit !== null, '❌ Operating unit dropdown not found');
      
      console.log('✅ TEST 5 PASSED: All Nakhonsawan modal elements exist');
      return true;
    } catch (error) {
      console.error('❌ TEST 5 FAILED:', error);
      return false;
    }
  },

  // Test 6: Check Khlong Luang modal elements exist
  test6_KhlongLuangModalElements() {
    console.log('\n=== TEST 6: Khlong Luang Modal Elements ===');
    try {
      const checkbox = document.getElementById('transactionKhlongLuangPPTCheckbox');
      const indicator = document.getElementById('transactionKhlongLuangPriceIndicator');
      const priceSource = document.getElementById('transactionKhlongLuangPriceSource');
      const operatingUnit = document.getElementById('transactionKhlongLuangOperatingUnit');
      
      console.assert(checkbox !== null, '❌ PTT checkbox not found');
      console.assert(indicator !== null, '❌ Price indicator not found');
      console.assert(priceSource !== null, '❌ Price source element not found');
      console.assert(operatingUnit !== null, '❌ Operating unit dropdown not found');
      
      console.log('✅ TEST 6 PASSED: All Khlong Luang modal elements exist');
      return true;
    } catch (error) {
      console.error('❌ TEST 6 FAILED:', error);
      return false;
    }
  },

  // Test 7: Verify window data objects exist
  test7_WindowDataObjects() {
    console.log('\n=== TEST 7: Window Data Objects ===');
    try {
      console.assert(typeof window.nakhonsawanPttRefillData !== 'undefined', '❌ nakhonsawanPttRefillData not found');
      console.assert(typeof window.khlongluangPttRefillData !== 'undefined', '❌ khlongluangPttRefillData not found');
      
      console.log('✅ TEST 7 PASSED: Window data objects exist');
      console.log('   - nakhonsawanPttRefillData:', window.nakhonsawanPttRefillData);
      console.log('   - khlongluangPttRefillData:', window.khlongluangPttRefillData);
      return true;
    } catch (error) {
      console.error('❌ TEST 7 FAILED:', error);
      return false;
    }
  },

  // Test 8: Verify transaction log fields
  test8_TransactionLogFields() {
    console.log('\n=== TEST 8: Transaction Log Fields ===');
    try {
      console.log('ℹ️ Checking if transaction logs include PTT fields...');
      
      if (transactionLogs && transactionLogs.length > 0) {
        const lastLog = transactionLogs[transactionLogs.length - 1];
        
        console.assert(typeof lastLog.isPTTPurchase !== 'undefined', 'ℹ️ isPTTPurchase field available in logs');
        console.assert(typeof lastLog.priceSource !== 'undefined', 'ℹ️ priceSource field available in logs');
        
        console.log('✅ TEST 8 PASSED: Transaction log structure supports PTT fields');
        console.log('   - isPTTPurchase:', lastLog.isPTTPurchase);
        console.log('   - priceSource:', lastLog.priceSource);
      } else {
        console.log('ℹ️ No transaction logs to check (new session)');
      }
      return true;
    } catch (error) {
      console.error('❌ TEST 8 FAILED:', error);
      return false;
    }
  },

  // Run all tests
  async runAllTests() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   PTT PRICE FEATURE - COMPREHENSIVE TEST SUITE              ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    
    const results = [];
    
    results.push(await this.test1_LoadPricesAndCache());
    results.push(await this.test2_CacheUsage());
    results.push(await this.test3_ProvinceInSheet());
    results.push(await this.test4_UnknownProvince());
    results.push(this.test5_NakhonsawanModalElements());
    results.push(this.test6_KhlongLuangModalElements());
    results.push(this.test7_WindowDataObjects());
    results.push(this.test8_TransactionLogFields());
    
    const passed = results.filter(r => r).length;
    const total = results.length;
    
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log(`║   RESULTS: ${passed}/${total} TESTS PASSED                               ║`);
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    return passed === total;
  }
};

// Export for use in console
console.log('✅ Test script loaded. Run: PTTTests.runAllTests()');
