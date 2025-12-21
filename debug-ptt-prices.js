/**
 * Debug Script สำหรับตรวจสอบราคา PTT
 * รัน: debugPTTPrices()
 */

async function debugPTTPrices() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   PTT PRICES DEBUG                                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  try {
    // Clear cache
    localStorage.removeItem('pttPrices');
    console.log('✅ Cleared cache\n');
    
    // Fetch from API
    const url = `${GOOGLE_SCRIPT_URL}?action=getPTTPrices&sheetsId=${GOOGLE_SHEETS_ID}&gid=${SHEET_GIDS.PTT_PRICES}`;
    
    console.log('🔗 URL:', url);
    console.log('Config:', {
      GOOGLE_SCRIPT_URL,
      GOOGLE_SHEETS_ID,
      PTT_PRICES_GID: SHEET_GIDS.PTT_PRICES
    });
    console.log('\n');
    
    const response = await fetch(url);
    console.log('Response Status:', response.status, response.statusText);
    
    const data = await response.json();
    console.log('\n📊 Response Data:');
    console.log(data);
    
    if (data.success) {
      console.log('\n✅ SUCCESS\n');
      console.log('Loaded Provinces:', Object.keys(data.data.prices).length);
      console.log('Header Info:', data.data.headerInfo);
      console.log('Header Load Count:', data.data.loadedCount);
      
      console.log('\n📋 Sample Prices:');
      const entries = Object.entries(data.data.prices).slice(0, 10);
      for (let [province, price] of entries) {
        console.log(`  ${province}: ${price}`);
      }
      
      if (Object.keys(data.data.prices).length > 10) {
        console.log(`  ... and ${Object.keys(data.data.prices).length - 10} more`);
      }
      
      // Test matchProvinceToPrice function
      if (Object.keys(data.data.prices).length > 0) {
        console.log('\n🔬 Testing matchProvinceToPrice:');
        
        const testProvince = Object.keys(data.data.prices)[0];
        const avg = Object.values(data.data.prices).reduce((a, b) => a + b) / Object.keys(data.data.prices).length;
        
        const result = matchProvinceToPrice(testProvince, data.data.prices, avg);
        console.log(`  Province: "${testProvince}"`);
        console.log(`  Result:`, result);
        
        const result2 = matchProvinceToPrice('UnknownProvince', data.data.prices, avg);
        console.log(`  Unknown Province Result:`, result2);
      }
      
    } else {
      console.log('\n❌ ERROR\n');
      console.log('Error:', data.error);
      if (data.errorDetails) {
        console.log('Details:', data.errorDetails);
      }
    }
    
  } catch (error) {
    console.error('❌ EXCEPTION:', error);
  }
}

console.log('✅ Debug script loaded. Run: debugPTTPrices()');
