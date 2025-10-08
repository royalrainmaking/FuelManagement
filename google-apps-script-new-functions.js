// Google Apps Script functions ที่ต้องเพิ่มเข้าไปใน Google Apps Script project

// ฟังก์ชันสำหรับอ่านข้อมูลสรุปจากตำแหน่งที่กำหนด
function getSummaryData(sheetsId, gid) {
  try {
    const sheet = SpreadsheetApp.openById(sheetsId);
    const worksheets = sheet.getSheets();
    let targetSheet = null;
    
    // หา sheet ที่มี gid ตรงกัน
    for (let i = 0; i < worksheets.length; i++) {
      if (worksheets[i].getSheetId().toString() === gid.toString()) {
        targetSheet = worksheets[i];
        break;
      }
    }
    
    if (!targetSheet) {
      throw new Error('ไม่พบ sheet ที่กำหนด');
    }
    
    // อ่านข้อมูลจากตำแหน่งที่กำหนด
    const totalPurchaseVolume = targetSheet.getRange('D2').getValue() || 0; // จำนวนลิตรที่ซื้อจาก ปตท.
    
    // คำนวณผลรวมของคอลัมน์ H ทั้งหมดที่เป็นตัวเลข (ยอดเงินที่ซื้อจาก ปตท.)
    const lastRow = targetSheet.getLastRow();
    const amountRange = targetSheet.getRange('H2:H' + lastRow);
    const amountValues = amountRange.getValues();
    let totalPurchaseAmount = 0;
    
    for (let i = 0; i < amountValues.length; i++) {
      const value = parseFloat(amountValues[i][0]);
      // ตรวจสอบว่าเป็นตัวเลขและไม่ใช่ NaN
      if (!isNaN(value) && typeof amountValues[i][0] === 'number') {
        totalPurchaseAmount += value;
      }
    }
    
    // คำนวณผลรวมของ D3:D16 สำหรับความจุคงเหลือทั้งหมด
    const stockRange = targetSheet.getRange('D3:D16');
    const stockValues = stockRange.getValues();
    let totalCurrentStock = 0;
    
    for (let i = 0; i < stockValues.length; i++) {
      const value = parseFloat(stockValues[i][0]) || 0;
      totalCurrentStock += value;
    }
    
    return {
      success: true,
      data: {
        totalPurchaseAmount: totalPurchaseAmount,
        totalPurchaseVolume: totalPurchaseVolume,
        totalCurrentStock: totalCurrentStock
      }
    };
    
  } catch (error) {
    console.error('Error in getSummaryData:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

// ฟังก์ชันสำหรับอัพเดท D2 (จำนวนลิตรที่ซื้อจาก ปตท.)
function updatePTTPurchaseVolume(sheetsId, gid, liters) {
  try {
    const sheet = SpreadsheetApp.openById(sheetsId);
    const worksheets = sheet.getSheets();
    let targetSheet = null;
    
    // หา sheet ที่มี gid ตรงกัน
    for (let i = 0; i < worksheets.length; i++) {
      if (worksheets[i].getSheetId().toString() === gid.toString()) {
        targetSheet = worksheets[i];
        break;
      }
    }
    
    if (!targetSheet) {
      throw new Error('ไม่พบ sheet ที่กำหนด');
    }
    
    // อ่านค่าปัจจุบันใน D2
    const currentValue = parseFloat(targetSheet.getRange('D2').getValue()) || 0;
    const additionalLiters = parseFloat(liters) || 0;
    
    // บวกเพิ่มลิตรที่ซื้อใหม่
    const newValue = currentValue + additionalLiters;
    
    // อัพเดทค่าใน D2
    targetSheet.getRange('D2').setValue(newValue);
    
    return {
      success: true,
      data: {
        previousValue: currentValue,
        additionalLiters: additionalLiters,
        newValue: newValue,
        updatedAt: new Date().toISOString()
      }
    };
    
  } catch (error) {
    console.error('Error in updatePTTPurchaseVolume:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

// อัพเดทฟังก์ชัน doGet เดิมเพื่อรองรับ action ใหม่
function doGet(e) {
  const action = e.parameter.action;
  const sheetsId = e.parameter.sheetsId;
  const gid = e.parameter.gid;
  
  try {
    switch (action) {
      // ... existing actions ...
      
      case 'getSummaryData':
        return ContentService
          .createTextOutput(JSON.stringify(getSummaryData(sheetsId, gid)))
          .setMimeType(ContentService.MimeType.JSON);
      
      case 'updatePTTPurchaseVolume':
        const liters = e.parameter.liters;
        return ContentService
          .createTextOutput(JSON.stringify(updatePTTPurchaseVolume(sheetsId, gid, liters)))
          .setMimeType(ContentService.MimeType.JSON);
      
      default:
        return ContentService
          .createTextOutput(JSON.stringify({
            success: false,
            error: 'Invalid action: ' + action
          }))
          .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    console.error('Error in doGet:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}