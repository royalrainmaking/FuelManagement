/**
 * Debug Nakhonsawan Modal
 */

async function debugNakhonsawanModal() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   DEBUG: Nakhonsawan Modal                                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  // Check elements
  console.log('1️⃣ Check HTML Elements:');
  const checkbox = document.getElementById('transactionNakhonsawanPPTCheckbox');
  const priceField = document.getElementById('transactionNakhonsawanPricePerDrum');
  const priceIndicator = document.getElementById('transactionNakhonsawanPriceIndicator');
  const operatingUnit = document.getElementById('transactionNakhonsawanOperatingUnit');
  
  console.log('  - Checkbox exists:', checkbox !== null);
  console.log('  - Price field exists:', priceField !== null);
  console.log('  - Price indicator exists:', priceIndicator !== null);
  console.log('  - Operating unit select exists:', operatingUnit !== null);
  
  if (checkbox) {
    console.log('  - Checkbox checked:', checkbox.checked);
  }
  if (priceField) {
    console.log('  - Price field value:', priceField.value);
    console.log('  - Price field readonly:', priceField.readOnly);
  }
  
  // Check window data
  console.log('\n2️⃣ Check Window Data:');
  console.log('  - nakhonsawanPttRefillData:', window.nakhonsawanPttRefillData);
  
  // Fetch PTT prices
  console.log('\n3️⃣ Fetch PTT Prices:');
  try {
    const prices = await fetchPTTPricesFromSheets();
    console.log('  - Prices loaded:', Object.keys(prices.prices).length, 'provinces');
    console.log('  - Sample:', prices.prices['กรุงเทพมหานคร']);
    console.log('  - Average:', prices.average);
  } catch (error) {
    console.error('  - Error fetching prices:', error);
  }
  
  // Simulate checkbox click
  console.log('\n4️⃣ Simulate Checkbox Click:');
  if (checkbox) {
    console.log('  - Triggering checkbox change event...');
    checkbox.click();
    
    setTimeout(() => {
      console.log('  - After click, checkbox value:', checkbox.checked);
      console.log('  - After click, price field value:', priceField.value);
      console.log('  - After click, price indicator display:', priceIndicator.style.display);
      console.log('  - After click, nakhonsawanPttRefillData:', window.nakhonsawanPttRefillData);
    }, 500);
  }
  
  // Select operating unit
  console.log('\n5️⃣ Select Operating Unit:');
  if (operatingUnit) {
    const options = operatingUnit.querySelectorAll('option');
    console.log('  - Available options:', options.length);
    
    // Get first non-empty option
    let selectedOption = null;
    for (let opt of options) {
      if (opt.value && opt.value !== '') {
        selectedOption = opt;
        break;
      }
    }
    
    if (selectedOption) {
      operatingUnit.value = selectedOption.value;
      operatingUnit.dispatchEvent(new Event('change', { bubbles: true }));
      
      console.log('  - Selected:', selectedOption.value);
      
      setTimeout(() => {
        console.log('  - After selection, price field value:', priceField.value);
        console.log('  - After selection, nakhonsawanPttRefillData:', window.nakhonsawanPttRefillData);
      }, 500);
    }
  }
}

console.log('✅ Debug script loaded. Run: debugNakhonsawanModal()');
