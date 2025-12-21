/**
 * Debug Nakhonsawan Modal - Real Test
 */

async function debugNakhonsawanReal() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   DEBUG: Nakhonsawan Modal (Real Test)                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  // Manually open modal
  console.log('1️⃣ Opening modal by calling openTransactionNakhonsawanModal()...');
  openTransactionNakhonsawanModal();
  
  setTimeout(() => {
    console.log('\n2️⃣ After modal opened:');
    console.log('  - nakhonsawanPttRefillData:', window.nakhonsawanPttRefillData);
    
    // Check elements
    const checkbox = document.getElementById('transactionNakhonsawanPPTCheckbox');
    const priceField = document.getElementById('transactionNakhonsawanPricePerDrum');
    const priceIndicator = document.getElementById('transactionNakhonsawanPriceIndicator');
    const operatingUnit = document.getElementById('transactionNakhonsawanOperatingUnit');
    const modal = document.getElementById('transactionNakhonsawanModal');
    
    console.log('  - Modal visible:', modal.style.display !== 'none');
    console.log('  - Checkbox exists:', checkbox !== null, 'checked:', checkbox.checked);
    console.log('  - Price field exists:', priceField !== null, 'value:', priceField.value);
    
    // Try checking checkbox
    console.log('\n3️⃣ Check PTT checkbox...');
    if (checkbox) {
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      
      setTimeout(() => {
        console.log('  - After check, nakhonsawanPttRefillData:', window.nakhonsawanPttRefillData);
        console.log('  - After check, price indicator display:', priceIndicator.style.display);
        console.log('  - After check, price field value:', priceField.value);
        
        // Try selecting operating unit
        console.log('\n4️⃣ Select operating unit...');
        const options = operatingUnit.querySelectorAll('option');
        let selectedOption = null;
        for (let opt of options) {
          if (opt.value && opt.value !== '' && opt.value.includes('กรุง')) {
            selectedOption = opt;
            break;
          }
        }
        
        if (selectedOption) {
          operatingUnit.value = selectedOption.value;
          operatingUnit.dispatchEvent(new Event('change', { bubbles: true }));
          
          console.log('  - Selected:', selectedOption.value);
          
          setTimeout(() => {
            console.log('  - After selection, nakhonsawanPttRefillData:', window.nakhonsawanPttRefillData);
            console.log('  - After selection, price field value:', priceField.value);
            console.log('  - After selection, price indicator display:', priceIndicator.style.display);
          }, 300);
        }
      }, 300);
    }
  }, 300);
}

console.log('✅ Real debug script loaded. Run: debugNakhonsawanReal()');
