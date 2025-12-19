/**
 * Script สำหรับตรวจสอบ Google Sheets Schema
 * ตรวจสอบว่า columns K, L, M, N มีอยู่ใน Transaction_History sheet
 * 
 * ใช้ดังนี้:
 * 1. เปิด Google Sheets
 * 2. ไปที่ Extensions > Apps Script
 * 3. วางโค้ดนี้ลงไป
 * 4. รัน function: verifyUploadSchema()
 */

function verifyUploadSchema() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = spreadsheet.getSheets();
    
    console.log('🔍 ตรวจสอบ Google Sheets Schema...\n');
    
    let transactionSheet = null;
    for (let i = 0; i < sheets.length; i++) {
      if (sheets[i].getName() === 'Transaction_History' || sheets[i].getSheetId().toString() === '0') {
        transactionSheet = sheets[i];
        break;
      }
    }
    
    if (!transactionSheet) {
      console.error('❌ ไม่พบ Transaction_History sheet');
      return;
    }
    
    console.log('✅ พบ Transaction_History sheet');
    console.log('   Sheet ID: ' + transactionSheet.getSheetId());
    console.log('   Total Rows: ' + transactionSheet.getLastRow());
    console.log('   Total Columns: ' + transactionSheet.getLastColumn() + '\n');
    
    const firstRow = transactionSheet.getRange(1, 1, 1, transactionSheet.getLastColumn()).getValues()[0];
    
    console.log('📋 Headers:\n');
    firstRow.forEach((header, index) => {
      const colLetter = String.fromCharCode(65 + index);
      console.log('   ' + colLetter + ': ' + header);
    });
    
    console.log('\n🎯 ตรวจสอบ Image Upload Columns:\n');
    
    const requiredColumns = {
      'K': 'image_url',
      'L': 'image_filename',
      'M': 'image_upload_date',
      'N': 'image_drive_id'
    };
    
    let allExist = true;
    for (const [colLetter, colName] of Object.entries(requiredColumns)) {
      const colIndex = colLetter.charCodeAt(0) - 65;
      const headerValue = firstRow[colIndex] || '';
      const exists = headerValue === colName;
      
      console.log('   ' + colLetter + ' (' + colName + '): ' + (exists ? '✅ exists' : '❌ NOT FOUND'));
      
      if (!exists) {
        allExist = false;
      }
    }
    
    console.log('\n' + (allExist ? '✅ ✅ ✅ Schema พร้อมใช้งาน!' : '❌ ❌ ❌ ต้องเพิ่ม columns'));
    
    if (!allExist) {
      console.log('\n📝 วิธีแก้ไข:');
      console.log('1. เปิด Transaction_History sheet');
      console.log('2. เพิ่มคอลัมน์ K: image_url');
      console.log('3. เพิ่มคอลัมน์ L: image_filename');
      console.log('4. เพิ่มคอลัมน์ M: image_upload_date');
      console.log('5. เพิ่มคอลัมน์ N: image_drive_id');
    }
    
  } catch (error) {
    console.error('❌ Error: ' + error.toString());
  }
}
