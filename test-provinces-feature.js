async () => {
    console.log('🔍 ทดสอบฟีเจอร์ Province Dropdown...\n');
    
    const selectIds = [
        'operatingUnit',
        'returnOperatingUnit',
        'transactionNakhonsawanOperatingUnit',
        'transactionKhlongLuangOperatingUnit'
    ];
    
    let passCount = 0;
    let totalTests = 0;
    
    console.log('========== Test 1: Check THAI_PROVINCES ==========');
    totalTests++;
    if (typeof THAI_PROVINCES !== 'undefined' && THAI_PROVINCES.length >= 77) {
        console.log(`✅ THAI_PROVINCES loaded: ${THAI_PROVINCES.length} provinces`);
        passCount++;
    } else {
        console.error('❌ THAI_PROVINCES not available or insufficient provinces');
    }
    
    console.log('\n========== Test 2: Check populateProvinceSelects function ==========');
    totalTests++;
    if (typeof populateProvinceSelects === 'function') {
        console.log('✅ populateProvinceSelects function exists');
        passCount++;
    } else {
        console.error('❌ populateProvinceSelects function not found');
    }
    
    console.log('\n========== Test 3: Check if selects are populated ==========');
    selectIds.forEach(selectId => {
        totalTests++;
        const selectElement = document.getElementById(selectId);
        if (selectElement) {
            const optionCount = selectElement.options.length;
            if (optionCount >= 78) { // 1 default + 77 provinces
                console.log(`✅ #${selectId}: ${optionCount} options (${optionCount - 1} provinces + default)`);
                passCount++;
            } else {
                console.warn(`⚠️ #${selectId}: ${optionCount} options (expected >= 78)`);
            }
        } else {
            console.error(`❌ #${selectId}: Element not found`);
        }
    });
    
    console.log('\n========== Test 4: Verify first province value ==========');
    totalTests++;
    const firstSelect = document.getElementById('operatingUnit');
    if (firstSelect && firstSelect.options[1]) {
        const firstProvinceValue = firstSelect.options[1].value;
        const firstProvinceName = firstSelect.options[1].text;
        if (firstProvinceValue === 'กรุงเทพมหานคร' && firstProvinceName === 'กรุงเทพมหานคร') {
            console.log(`✅ First province: ${firstProvinceValue}`);
            passCount++;
        } else {
            console.warn(`⚠️ First province value/text incorrect: ${firstProvinceValue} / ${firstProvinceName}`);
        }
    }
    
    console.log('\n========== Test 5: Verify required attribute ==========');
    totalTests++;
    const requiredFound = selectIds.every(id => {
        const el = document.getElementById(id);
        return el && el.hasAttribute('required');
    });
    if (requiredFound) {
        console.log('✅ All select elements have required attribute');
        passCount++;
    } else {
        console.warn('⚠️ Some select elements missing required attribute');
    }
    
    console.log('\n========== SUMMARY ==========');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passCount}`);
    console.log(`Failed: ${totalTests - passCount}`);
    
    if (passCount === totalTests) {
        console.log('\n✅ ALL TESTS PASSED!');
        return true;
    } else {
        console.log('\n❌ Some tests failed');
        return false;
    }
}
