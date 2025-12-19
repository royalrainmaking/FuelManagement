// ฟังก์ชันสำหรับดึงข้อมูล Transaction Logs จาก Google Sheets
// ต้องเพิ่มฟังก์ชันนี้เข้าไปใน Google Apps Script project

function getTransactionLogs(sheetsId, gid) {
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
    
    // อ่านข้อมูลทั้งหมดจาก sheet (เริ่มจากแถวที่ 2 เพื่อข้าม header)
    const lastRow = targetSheet.getLastRow();
    
    if (lastRow < 2) {
      return {
        success: true,
        data: []
      };
    }
    
    // อ่านข้อมูลจากแถว 2 ถึงแถวสุดท้าย, คอลัมน์ A ถึง J
    const dataRange = targetSheet.getRange(2, 1, lastRow - 1, 10);
    const values = dataRange.getValues();
    
    // แปลงข้อมูลเป็น array of objects
    const logs = [];
    for (let i = 0; i < values.length; i++) {
      const row = values[i];
      
      // ข้ามแถวที่ว่างเปล่า
      if (!row[0] && !row[1] && !row[2]) {
        continue;
      }
      
      logs.push({
        date: row[0] ? Utilities.formatDate(new Date(row[0]), 'Asia/Bangkok', 'yyyy-MM-dd') : '',
        time: row[1] || '',
        transaction_type: row[2] || '',
        source_name: row[3] || '',
        destination_name: row[4] || '',
        volume: parseFloat(row[5]) || 0,
        price_per_liter: parseFloat(row[6]) || 0,
        total_cost: parseFloat(row[7]) || 0,
        operator_name: row[8] || '',
        unit: row[9] || ''
      });
    }
    
    return {
      success: true,
      data: logs
    };
    
  } catch (error) {
    console.error('Error in getTransactionLogs:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

// อัพเดทฟังก์ชัน doGet เพื่อรองรับ getTransactionLogs action
function doGet(e) {
  const action = e.parameter.action;
  const sheetsId = e.parameter.sheetsId;
  const gid = e.parameter.gid;
  
  try {
    switch (action) {
      case 'getTransactionLogs':
        return ContentService
          .createTextOutput(JSON.stringify(getTransactionLogs(sheetsId, gid)))
          .setMimeType(ContentService.MimeType.JSON);
      
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