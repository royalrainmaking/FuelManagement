/**
 * Script สำหรับตรวจสอบโครงสร้าง Sheet gid=1828300695
 * รัน: checkPTTSheetStructure()
 */

function checkPTTSheetStructure() {
  try {
    const sheetsId = '18EaX2GwcZaPFXzcL0B9T4gFRAOhBXdHqZHm1bMJ8-sE';
    const gid = '1828300695';
    
    const spreadsheet = SpreadsheetApp.openById(sheetsId);
    const sheets = spreadsheet.getSheets();
    
    let targetSheet = null;
    
    for (let sheet of sheets) {
      if (sheet.getSheetId().toString() === gid.toString()) {
        targetSheet = sheet;
        console.log('✅ Found sheet with GID:', gid);
        break;
      }
    }
    
    if (!targetSheet) {
      console.log('❌ Sheet not found with GID:', gid);
      console.log('Available sheets:');
      for (let sheet of sheets) {
        console.log(`  - ${sheet.getName()} (GID: ${sheet.getSheetId()})`);
      }
      return;
    }
    
    const lastRow = targetSheet.getLastRow();
    const lastCol = targetSheet.getLastColumn();
    
    console.log('\n📊 Sheet Info:');
    console.log(`  Name: ${targetSheet.getName()}`);
    console.log(`  Last Row: ${lastRow}`);
    console.log(`  Last Column: ${lastCol}`);
    
    if (lastRow < 1) {
      console.log('❌ Sheet is empty');
      return;
    }
    
    console.log('\n📋 First 5 rows (all columns):');
    const maxRows = Math.min(5, lastRow);
    const dataRange = targetSheet.getRange(1, 1, maxRows, lastCol);
    const values = dataRange.getValues();
    
    for (let i = 0; i < values.length; i++) {
      console.log(`Row ${i + 1}:`, values[i]);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the function
checkPTTSheetStructure();
