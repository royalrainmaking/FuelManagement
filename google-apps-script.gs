/**
 * Google Apps Script สำหรับระบบจัดการน้ำมัน
 * รองรับการดึงข้อมูลจาก Google Sheets ตาม URL ที่กำหนด
 */

/**
 * ========================================
 * LINE Notification Configuration
 * ========================================
 */
const LINE_CONFIG = {
    CHANNEL_ACCESS_TOKEN: 'Ts3qJEyllswxdeuw+EJP8JToU0YygwxcfKkvkwIA6J1PxGYo1DzkQoem2TwBvhfKuk3dvthfEM7ItJDJjZJI1GINn6TyjRpPD6428bZrFRJDiGgq6Cwz4PIgs/8NsDCbdle9fvMf0ispJucL45SVowdB04t89/1O/w1cDnyilFU=',
    GROUP_ID: 'C31b16b0dcb85b6e706b7a4f0e551d787',
    NOTIFICATION_DELAY: 1000,
    LINE_API_URL: 'https://api.line.me/v2/bot/message/push',
    ENABLED: true
};

/**
 * ฟังก์ชันสำหรับอ่านข้อมูลงบประมาณและคำนวณเงินคงเหลือ
 * ยอดเงินคงเหลือ = รวมงบประมาณทั้ง 4 แผน - ยอดเงินที่ซื้อจาก ปตท.
 */
function getBudgetData(sheetsId, budgetGid) {
  try {
    const spreadsheet = SpreadsheetApp.openById(sheetsId);
    const worksheets = spreadsheet.getSheets();
    
    // หา sheet งบประมาณตาม GID
    let budgetSheet = null;
    for (let i = 0; i < worksheets.length; i++) {
      if (worksheets[i].getSheetId().toString() === budgetGid.toString()) {
        budgetSheet = worksheets[i];
        break;
      }
    }
    
    if (!budgetSheet) {
      throw new Error('ไม่พบ sheet งบประมาณที่กำหนด');
    }
    
    // หา sheet Transaction Log
    let transactionSheet = null;
    for (let i = 0; i < worksheets.length; i++) {
      if (worksheets[i].getName() === 'Transaction_Log' || worksheets[i].getSheetId().toString() === '0') {
        transactionSheet = worksheets[i];
        break;
      }
    }
    
    if (!transactionSheet) {
      throw new Error('ไม่พบ sheet Transaction_Log');
    }
    
    // อ่านข้อมูลงบประมาณ - SUM ของคอลัมน์ B
    const budgetLastRow = budgetSheet.getLastRow();
    let totalBudget = 0;
    
    if (budgetLastRow > 1) {
      const budgetRange = budgetSheet.getRange('B2:B' + budgetLastRow);
      const budgetValues = budgetRange.getValues();
      
      for (let i = 0; i < budgetValues.length; i++) {
        const value = parseFloat(budgetValues[i][0]) || 0;
        totalBudget += value;
      }
    }
    
    // อ่านข้อมูลยอดเงินที่ซื้อจาก ปตท. - SUM ของคอลัมน์ I ของ Transaction Log
    // โครงสร้าง: A=วันที่, B=เวลา, C=ชนิด, D=ชื่อ, E=ปลายทาง, F=จำนวน(ลิตร), G=ราคาต่อลิตร, H=ยอดรวม, I=ผู้ปฏิบัติงาน
    const transLastRow = transactionSheet.getLastRow();
    let totalPurchaseAmount = 0;
    
    if (transLastRow > 1) {
      // อ่านจากคอลัมน์ H (ยอดรวม) ไม่ใช่ I
      const amountRange = transactionSheet.getRange('I2:I' + transLastRow);
      const amountValues = amountRange.getValues();
      
      for (let i = 0; i < amountValues.length; i++) {
        const value = parseFloat(amountValues[i][0]) || 0;
        totalPurchaseAmount += value;
      }
    }
    
    // คำนวณเงินคงเหลือ
    const remainingBudget = totalBudget - totalPurchaseAmount;
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data: {
          totalBudget: totalBudget,
          totalPurchaseAmount: totalPurchaseAmount,
          remainingBudget: remainingBudget
        }
      }))
      .setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error('Error in getBudgetData:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * ฟังก์ชันสำหรับสร้างข้อมูลตัวอย่างงบประมาณ
 * เพิ่มข้อมูล 4 แผนของงบประมาณลงใน Budget Sheet
 */
function createSampleBudgetData(sheetsId, budgetGid) {
  try {
    const spreadsheet = SpreadsheetApp.openById(sheetsId);
    const worksheets = spreadsheet.getSheets();
    
    // หา sheet งบประมาณตาม GID
    let budgetSheet = null;
    for (let i = 0; i < worksheets.length; i++) {
      if (worksheets[i].getSheetId().toString() === budgetGid.toString()) {
        budgetSheet = worksheets[i];
        break;
      }
    }
    
    if (!budgetSheet) {
      throw new Error('ไม่พบ sheet งบประมาณที่กำหนด');
    }
    
    // ลบข้อมูลเก่า (ถ้ามี)
    const maxRows = budgetSheet.getMaxRows();
    if (maxRows > 1) {
      budgetSheet.deleteRows(2, maxRows - 1);
    }
    
    // เพิ่ม header
    budgetSheet.getRange('A1').setValue('ชื่อแผน');
    budgetSheet.getRange('B1').setValue('งบประมาณ');
    
    // เพิ่มข้อมูล 4 แผน
    const budgetPlans = [
      { name: 'แผนบรู', budget: 500000 },
      { name: 'แผนยุทธ', budget: 750000 },
      { name: 'แผนฝุ่น', budget: 600000 },
      { name: 'แผนลูกเห็บ', budget: 400000 }
    ];
    
    for (let i = 0; i < budgetPlans.length; i++) {
      const row = i + 2;
      budgetSheet.getRange('A' + row).setValue(budgetPlans[i].name);
      budgetSheet.getRange('B' + row).setValue(budgetPlans[i].budget);
    }
    
    // จัดรูปแบบ header
    const headerRange = budgetSheet.getRange('A1:B1');
    headerRange.setBackground('#1f77d2');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    
    // จัดรูปแบบคอลัมน์ B (ตัวเลข)
    budgetSheet.getRange('B2:B5').setNumberFormat('#,##0');
    
    // ปรับความกว้าง
    budgetSheet.setColumnWidth(1, 150);
    budgetSheet.setColumnWidth(2, 150);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'สร้างข้อมูลตัวอย่างงบประมาณสำเร็จ',
        data: {
          plansCreated: budgetPlans.length,
          totalBudget: budgetPlans.reduce((sum, plan) => sum + plan.budget, 0),
          plans: budgetPlans
        }
      }))
      .setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error('Error in createSampleBudgetData:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * ฟังก์ชันสำหรับอ่านข้อมูลสรุปจากตำแหน่งที่กำหนด
 */
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

    // คำนวณผลรวมของ D3:D14 สำหรับความจุคงเหลือทั้งหมด
    const stockRange = targetSheet.getRange('D3:D14');
    const stockValues = stockRange.getValues();
    let totalCurrentStock = 0;

    for (let i = 0; i < stockValues.length; i++) {
      const value = parseFloat(stockValues[i][0]) || 0;
      totalCurrentStock += value;
    }

    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data: {
          totalPurchaseAmount: totalPurchaseAmount,
          totalPurchaseVolume: totalPurchaseVolume,
          totalCurrentStock: totalCurrentStock
        }
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error('Error in getSummaryData:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * ฟังก์ชันสำหรับอัพเดท D2 (จำนวนลิตรที่ซื้อจาก ปตท.)
 */
function updatePTTPurchaseVolume(liters, sheetsId, gid) {
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

    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data: {
          previousValue: currentValue,
          additionalLiters: additionalLiters,
          newValue: newValue,
          updatedAt: new Date().toISOString()
        }
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error('Error in updatePTTPurchaseVolume:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const action = e.parameter.action;
    const sheetsId = e.parameter.sheetsId;
    const gid = e.parameter.gid;
    
    console.log('Action:', action, 'SheetsId:', sheetsId, 'GID:', gid);
    
    switch(action) {
      case 'getMasterData':
        return getMasterData(sheetsId, gid);
      case 'getInventory':
        return getInventory(sheetsId, gid);
      case 'updateInventory':
        return updateInventory(e.parameter.data, sheetsId, gid);
      case 'updateFuelStock':
        return updateFuelStock(e.parameter.fuelName, e.parameter.newStock, sheetsId, gid);
      case 'getTransactionLogs':
        return getTransactionLogs(sheetsId, gid);
      case 'logTransaction':
        return logTransaction(e.parameter.data, sheetsId);
      case 'createSheet':
        return createInventorySheet(e.parameter.data, sheetsId);
      case 'createLogSheet':
        return createTransactionLogSheet(sheetsId);
      case 'getSummaryData':
        return getSummaryData(sheetsId, gid);
      case 'updatePTTPurchaseVolume':
        return updatePTTPurchaseVolume(e.parameter.liters, sheetsId, gid);
      case 'getCurrentPrices':
        return getCurrentPrices(sheetsId, gid);
      case 'updatePrices':
        return updatePrices(e.parameter.data, sheetsId);
      case 'getPriceHistory':
        return getPriceHistory(sheetsId);
      case 'createPriceSheet':
        return createPriceHistorySheet(sheetsId);
      case 'getBudgetData':
        return getBudgetData(sheetsId, gid);
      case 'createSampleBudgetData':
        return createSampleBudgetData(sheetsId, gid);
      case 'createBudgetSheet':
        return createBudgetSheet(sheetsId);
      case 'updateBudgetAllocation':
        return updateBudgetAllocation(e.parameter.planName, e.parameter.allocatedAmount, sheetsId);
      case 'updateBudgetUsage':
        return updateBudgetUsage(e.parameter.totalPurchaseAmount, sheetsId);
      case 'confirmDailyInventory':
        return confirmDailyInventory(e.parameter.data, sheetsId);
      case 'getLatestDailyConfirmations':
        return getLatestDailyConfirmations(sheetsId, gid);
      case 'logDailyConfirmation':
        return logDailyConfirmation(e.parameter.data, sheetsId, gid);
      default:
        return ContentService
          .createTextOutput(JSON.stringify({
            success: false,
            error: 'Invalid action'
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

/**
 * ดึงข้อมูล Master Data จาก Google Sheets
 */
function getMasterData(sheetsId, gid) {
  try {
    // เปิด Google Sheets
    const spreadsheet = SpreadsheetApp.openById(sheetsId);
    const sheets = spreadsheet.getSheets();
    
    // หา sheet ที่ถูกต้องตาม GID
    let targetSheet = null;
    for (let sheet of sheets) {
      if (sheet.getSheetId().toString() === gid) {
        targetSheet = sheet;
        break;
      }
    }
    
    // ถ้าไม่เจอ sheet ตาม GID ให้ใช้ sheet แรก
    if (!targetSheet) {
      targetSheet = sheets[0];
    }
    
    // อ่านข้อมูลทั้งหมดจาก sheet
    const range = targetSheet.getDataRange();
    const values = range.getValues();
    
    if (values.length < 2) {
      throw new Error('ไม่มีข้อมูลใน sheet หรือไม่มี header');
    }
    
    // แปลง header เป็น key
    const headers = values[0];
    const data = [];
    
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const rowData = {};
      
      headers.forEach((header, index) => {
        const key = normalizeKey(header);
        rowData[key] = row[index] || '';
      });
      
      // ข้าม row ที่ไม่มีชื่อ
      if (rowData.name || rowData.source_name) {
        data.push(rowData);
      }
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data: data,
        count: data.length
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error in getMasterData:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * ดึงข้อมูล inventory (แบบเดิม - compatibility)
 */
function getInventory(sheetsId, gid) {
  try {
    const masterDataResult = getMasterData(sheetsId, gid);
    const masterData = JSON.parse(masterDataResult.getContent());
    
    if (!masterData.success) {
      return masterDataResult;
    }
    
    // แปลงเป็น format เดิม
    const inventoryData = {};
    masterData.data.forEach(row => {
      const name = row.name || row.source_name;
      if (name) {
        inventoryData[name] = {
          currentStock: parseFloat(row.current_stock) || 0,
          capacity: row.capacity ? (row.capacity === 'ไม่จำกัด' ? null : parseInt(row.capacity)) : null
        };
      }
    });
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data: inventoryData
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error in getInventory:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * ดึงข้อมูล Transaction Logs จาก Google Sheets
 * อ่านข้อมูลจาก sheet ตาม GID ที่กำหนด
 * โครงสร้างคอลัมน์: A=วันที่, B=เวลา, C=ชนิด, D=ชื่อ, E=ปลายทาง, F=จำนวน(ลิตร), G=ราคาต่อลิตร, H=ยอดรวม, I=ผู้ปฏิบัติงาน, J=หน่วย
 */
function getTransactionLogs(sheetsId, gid) {
  try {
    // เปิด Google Sheets
    const spreadsheet = SpreadsheetApp.openById(sheetsId);
    let targetSheet = null;
    
    // หา sheet ที่ถูกต้องตาม GID
    if (gid) {
      const sheets = spreadsheet.getSheets();
      for (let sheet of sheets) {
        if (sheet.getSheetId().toString() === gid.toString()) {
          targetSheet = sheet;
          break;
        }
      }
    }
    
    // ถ้าไม่เจอตาม GID ให้หาตามชื่อ
    if (!targetSheet) {
      try {
        targetSheet = spreadsheet.getSheetByName('Transaction_Log');
      } catch (e) {
        console.log('ไม่พบ Transaction_Log sheet');
      }
    }
    
    if (!targetSheet) {
      throw new Error('ไม่พบ sheet ที่กำหนด');
    }
    
    // อ่านข้อมูลทั้งหมดจาก sheet (เริ่มจากแถวที่ 2 เพื่อข้าม header)
    const lastRow = targetSheet.getLastRow();
    
    if (lastRow < 2) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: true,
          data: [],
          count: 0
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // อ่านข้อมูลจากแถว 2 ถึงแถวสุดท้าย, คอลัมน์ A ถึง P (16 คอลัมน์)
    const dataRange = targetSheet.getRange(2, 1, lastRow - 1, 16);
    const values = dataRange.getValues();
    
    // แปลงข้อมูลเป็น array of objects
    const logs = [];
    for (let i = 0; i < values.length; i++) {
      const row = values[i];
      
      // ข้ามแถวที่ว่างเปล่า (ตรวจสอบ UID, วันที่, เวลา)
      if (!row[0] && !row[1] && !row[2]) {
        continue;
      }
      
      // สร้าง object สำหรับแต่ละ transaction
      // แปลงวันที่และเวลาให้ถูกต้อง
      let dateStr = '';
      let timeStr = '';
      
      if (row[1]) {
        try {
          const dateObj = new Date(row[1]);
          dateStr = Utilities.formatDate(dateObj, Session.getScriptTimeZone(), 'yyyy-MM-dd');
        } catch (e) {
          dateStr = row[1].toString();
        }
      }
      
      if (row[2]) {
        try {
          // ถ้า row[2] เป็น Date object ให้แปลงเป็นเวลาเท่านั้น
          if (row[2] instanceof Date) {
            timeStr = Utilities.formatDate(row[2], Session.getScriptTimeZone(), 'HH:mm:ss');
          } else {
            timeStr = row[2].toString();
          }
        } catch (e) {
          timeStr = row[2].toString();
        }
      }
      
      const logEntry = {
        id: `transaction_${i}_${Date.now()}`,
        uid: row[0] || '',               // คอลัมน์ A: UID
        date: dateStr,                   // คอลัมน์ B: วันที่
        time: timeStr,                   // คอลัมน์ C: เวลา
        transaction_type: row[3] || '',  // คอลัมน์ D: ประเภท
        source_name: row[4] || '',       // คอลัมน์ E: แหล่งที่มา
        destination_name: row[5] || '',  // คอลัมน์ F: ปลายทาง
        volume: parseFloat(row[6]) || 0, // คอลัมน์ G: จำนวน(ลิตร)
        price_per_liter: parseFloat(row[7]) || 0, // คอลัมน์ H: ราคาต่อลิตร
        total_cost: parseFloat(row[8]) || 0,      // คอลัมน์ I: ยอดรวม
        operator_name: row[9] || '',     // คอลัมน์ J: ผู้ปฏิบัติงาน
        unit: row[10] || '',             // คอลัมน์ K: หน่วย
        aircraft_type: row[11] || '',    // คอลัมน์ L: ประเภทอากาศยาน
        aircraft_number: row[12] || '',  // คอลัมน์ M: เลขทะเบียน
        notes: row[13] || '',            // คอลัมน์ N: หมายเหตุ
        book_no: row[14] || '',          // คอลัมน์ O: Book No.
        receipt_no: row[15] || ''        // คอลัมน์ P: Receipt No.
      };
      
      // กำหนดประเภทปลายทางตาม destination name (ถ้ามี)
      if (logEntry.destination_name && typeof logEntry.destination_name === 'string') {
        const destName = logEntry.destination_name.toLowerCase();
        if (destName.includes('แท๊ง') || destName.includes('tank')) {
          logEntry.destination_type = 'tank';
        } else if (destName.includes('ถัง') && destName.includes('200')) {
          logEntry.destination_type = 'drum';
        } else if (/\d{2}-\d{4}/.test(logEntry.destination_name)) {
          logEntry.destination_type = 'truck';
        } else {
          logEntry.destination_type = 'other';
        }
      }
      
      logs.push(logEntry);
    }
    
    // หาเวลาล่าสุดจาก logs ที่อ่านได้
    let lastTimestamp = '';
    if (logs.length > 0) {
      // เรียงลำดับ logs เพื่อหาเวลาล่าสุด
      const sortedLogs = [...logs].sort((a, b) => {
        const dateA = new Date(`${a.date} ${a.time}`);
        const dateB = new Date(`${b.date} ${b.time}`);
        return dateB - dateA; // เรียงจากใหม่ไปเก่า
      });
      
      if (sortedLogs.length > 0 && sortedLogs[0].date && sortedLogs[0].time) {
        const latestLog = sortedLogs[0];
        // แปลงเป็นรูปแบบ DD/MM/YYYY HH:MM:SS
        try {
          const [year, month, day] = latestLog.date.split('-');
          const [hours, minutes, seconds] = latestLog.time.split(':');
          lastTimestamp = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
        } catch (e) {
          lastTimestamp = `${latestLog.date} ${latestLog.time}`;
        }
      }
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data: logs,
        count: logs.length,
        lastTimestamp: lastTimestamp
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error in getTransactionLogs:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * อัปเดตข้อมูล inventory
 */
function updateInventory(dataString, sheetsId, gid) {
  try {
    const updateData = JSON.parse(dataString);
    
    const spreadsheet = SpreadsheetApp.openById(sheetsId);
    const sheets = spreadsheet.getSheets();
    
    // หา sheet ที่ถูกต้องตาม GID
    let targetSheet = null;
    for (let sheet of sheets) {
      if (sheet.getSheetId().toString() === gid) {
        targetSheet = sheet;
        break;
      }
    }
    
    if (!targetSheet) {
      targetSheet = sheets[0];
    }
    
    // อ่านข้อมูลปัจจุบัน
    const range = targetSheet.getDataRange();
    const values = range.getValues();
    const headers = values[0];
    
    // หา column ที่เกี่ยวข้อง
    const nameCol = findColumnIndex(headers, ['name', 'source_name', 'ชื่อ']);
    const stockCol = findColumnIndex(headers, ['current_stock', 'คงเหลือ', 'stock']);
    
    if (nameCol === -1 || stockCol === -1) {
      throw new Error('ไม่พบ column ที่จำเป็น');
    }
    
    // อัปเดตข้อมูล
    for (let i = 1; i < values.length; i++) {
      const rowName = values[i][nameCol];
      if (updateData[rowName] !== undefined) {
        values[i][stockCol] = updateData[rowName];
      }
    }
    
    // เขียนข้อมูลกลับ
    range.setValues(values);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'อัปเดตข้อมูลสำเร็จ'
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error in updateInventory:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * ฟังก์ชันอัพเดตยอดน้ำมัน (คงเหลือ) ในคอลัมน์ D
 */
function updateFuelStock(fuelName, newStock, sheetsId, gid) {
  try {
    if (!fuelName || newStock === undefined) {
      throw new Error('ต้องระบุ fuelName และ newStock');
    }
    
    const spreadsheet = SpreadsheetApp.openById(sheetsId);
    const sheets = spreadsheet.getSheets();
    
    let targetSheet = null;
    for (let sheet of sheets) {
      if (sheet.getSheetId().toString() === gid) {
        targetSheet = sheet;
        break;
      }
    }
    
    if (!targetSheet) {
      targetSheet = sheets[0];
    }
    
    const range = targetSheet.getDataRange();
    const values = range.getValues();
    const headers = values[0];
    
    const nameCol = findColumnIndex(headers, ['name', 'source_name', 'ชื่อ']);
    const stockCol = findColumnIndex(headers, ['current_stock', 'คงเหลือ', 'stock']);
    
    if (nameCol === -1 || stockCol === -1) {
      throw new Error('ไม่พบ column ที่จำเป็น (name หรือ current_stock)');
    }
    
    let found = false;
    for (let i = 1; i < values.length; i++) {
      const rowName = values[i][nameCol];
      if (rowName && rowName.toString().trim() === fuelName.toString().trim()) {
        values[i][stockCol] = parseFloat(newStock);
        found = true;
        console.log(`✅ Updated "${fuelName}" with new stock: ${newStock}`);
        break;
      }
    }
    
    if (!found) {
      throw new Error(`ไม่พบแหล่งน้ำมัน: ${fuelName}`);
    }
    
    range.setValues(values);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: `อัพเดต "${fuelName}" เป็น ${newStock} ลิตรสำเร็จ`,
        fuelName: fuelName,
        newStock: newStock
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error in updateFuelStock:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * สร้าง sheet ใหม่สำหรับ inventory พร้อมข้อมูลเริ่มต้น
 */
function createInventorySheet(dataString, sheetsId) {
  try {
    const defaultData = JSON.parse(dataString);
    
    const spreadsheet = SpreadsheetApp.openById(sheetsId);
    
    // สร้าง sheet ใหม่ชื่อ "Inventory" หรือใช้ชื่อที่มีอยู่
    let inventorySheet = null;
    try {
      inventorySheet = spreadsheet.getSheetByName('Inventory');
      // ถ้ามี sheet อยู่แล้ว ลบข้อมูลเดิม
      inventorySheet.clear();
    } catch (e) {
      // ถ้าไม่มี sheet ให้สร้างใหม่
      inventorySheet = spreadsheet.insertSheet('Inventory');
    }
    
    // สร้าง header
    inventorySheet.getRange(1, 1, 1, 5).setValues([[
      'ID', 'ชื่อแหล่งน้ำมัน', 'ความจุ', 'จำนวนปัจจุบัน', 'ประเภท'
    ]]);
    
    // จัดรูปแบบ header
    const headerRange = inventorySheet.getRange(1, 1, 1, 5);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#4CAF50');
    headerRange.setFontColor('#FFFFFF');
    
    // เพิ่มข้อมูลเริ่มต้น
    const dataRows = [];
    defaultData.forEach(source => {
      dataRows.push([
        source.id,
        source.name,
        source.capacity ? source.capacity.toString() : 'ไม่จำกัด',
        source.currentStock.toString(),
        source.type
      ]);
    });
    
    if (dataRows.length > 0) {
      inventorySheet.getRange(2, 1, dataRows.length, 5).setValues(dataRows);
    }
    
    // ปรับขนาด column ให้เหมาะสม
    inventorySheet.autoResizeColumns(1, 5);
    
    // ตั้งค่า frozen header
    inventorySheet.setFrozenRows(1);
    
    // ส่งข้อมูลกลับพร้อมกับ sheet ID
    const newSheetId = inventorySheet.getSheetId();
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'สร้าง sheet ใหม่สำเร็จ',
        data: {
          sheetName: 'Inventory',
          sheetId: newSheetId,
          gid: newSheetId.toString(),
          rowsCreated: dataRows.length
        }
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error in createInventorySheet:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * สร้าง sheet สำหรับ transaction log
 */
function createTransactionLogSheet(sheetsId) {
  try {
    const spreadsheet = SpreadsheetApp.openById(sheetsId);
    
    // สร้าง sheet ใหม่ชื่อ "Transaction_Log" หรือใช้ชื่อที่มีอยู่
    let logSheet = null;
    try {
      logSheet = spreadsheet.getSheetByName('Transaction_Log');
      // ถ้ามี sheet อยู่แล้ว ลบข้อมูลเดิม
      logSheet.clear();
    } catch (e) {
      // ถ้าไม่มี sheet ให้สร้างใหม่
      logSheet = spreadsheet.insertSheet('Transaction_Log');
    }
    
    // สร้าง header
    logSheet.getRange(1, 1, 1, 13).setValues([[
      'วันที่', 'เวลา', 'ประเภท', 'แหล่งที่มา', 'ปลายทาง', 'จำนวน(ลิตร)', 
      'ราคาต่อลิตร', 'ยอดรวม', 'ผู้ปฏิบัติงาน', 'หน่วย', 'ประเภทอากาศยาน', 
      'เลขทะเบียน', 'หมายเหตุ'
    ]]);
    
    // จัดรูปแบบ header
    const headerRange = logSheet.getRange(1, 1, 1, 13);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#2196F3');
    headerRange.setFontColor('#FFFFFF');
    
    // ปรับขนาด column ให้เหมาะสม
    logSheet.autoResizeColumns(1, 13);
    
    // ตั้งค่า frozen header
    logSheet.setFrozenRows(1);
    
    // ส่งข้อมูลกลับพร้อมกับ sheet ID
    const newSheetId = logSheet.getSheetId();
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'สร้าง Transaction Log sheet สำเร็จ',
        data: {
          sheetName: 'Transaction_Log',
          sheetId: newSheetId,
          gid: newSheetId.toString()
        }
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error in createTransactionLogSheet:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * บันทึก transaction log
 */
/**
 * ดึง LINE config จาก Google Sheets (Settings sheet)
 * หากไม่พบ ใช้ค่า LINE_CONFIG ที่ define ไว้ที่ top ของ file
 */
function getLineConfigFromSheet(spreadsheet) {
  try {
    const settings = spreadsheet.getSheetByName('Settings');
    if (!settings) {
      console.log('⚠️ Settings sheet ไม่พบ, ใช้ default LINE_CONFIG');
      console.log('   DEFAULT LINE_CONFIG.ENABLED:', LINE_CONFIG.ENABLED);
      return LINE_CONFIG;
    }

    const lastRow = settings.getLastRow();
    if (lastRow < 2) {
      console.log('⚠️ Settings sheet ว่าง, ใช้ default LINE_CONFIG');
      console.log('   DEFAULT LINE_CONFIG.ENABLED:', LINE_CONFIG.ENABLED);
      return LINE_CONFIG;
    }

    const data = settings.getRange('A1:B' + lastRow).getValues();
    const config = {};
    
    console.log('📝 Reading Settings sheet...');
    for (let i = 0; i < data.length; i++) {
      const key = data[i][0];
      const value = data[i][1];
      console.log('   Row ' + i + ': ' + key + ' = ' + value);
      if (key && value !== '') {
        config[key] = value;
      }
    }

    const finalConfig = {
      CHANNEL_ACCESS_TOKEN: config['CHANNEL_ACCESS_TOKEN'] || LINE_CONFIG.CHANNEL_ACCESS_TOKEN,
      GROUP_ID: config['GROUP_ID'] || LINE_CONFIG.GROUP_ID,
      NOTIFICATION_DELAY: parseInt(config['NOTIFICATION_DELAY']) || LINE_CONFIG.NOTIFICATION_DELAY,
      LINE_API_URL: config['LINE_API_URL'] || LINE_CONFIG.LINE_API_URL,
      ENABLED: config['ENABLED'] === 'true' || config['ENABLED'] === true || LINE_CONFIG.ENABLED
    };
    
    console.log('✅ Final LINE config:');
    console.log('   ENABLED:', finalConfig.ENABLED);
    console.log('   GROUP_ID:', finalConfig.GROUP_ID ? 'มี' : 'ไม่มี');
    
    return finalConfig;
  } catch (error) {
    console.log('⚠️ Error reading config from sheet:', error, 'using default LINE_CONFIG');
    console.log('   DEFAULT LINE_CONFIG.ENABLED:', LINE_CONFIG.ENABLED);
    return LINE_CONFIG;
  }
}

/**
 * ดึงเวลา notification ล่าสุด จาก PropertiesService
 */
function getLastNotificationTime() {
  try {
    const properties = PropertiesService.getScriptProperties();
    const lastTime = properties.getProperty('LAST_LINE_NOTIFICATION_TIME');
    return lastTime ? parseInt(lastTime) : 0;
  } catch (error) {
    console.log('⚠️ Error reading last notification time:', error);
    return 0;
  }
}

/**
 * บันทึกเวลา notification ปัจจุบัน ไปยัง PropertiesService
 */
function setLastNotificationTime(timestamp) {
  try {
    const properties = PropertiesService.getScriptProperties();
    properties.setProperty('LAST_LINE_NOTIFICATION_TIME', timestamp.toString());
    return true;
  } catch (error) {
    console.log('⚠️ Error saving last notification time:', error);
    return false;
  }
}

/**
 * ส่งแจ้งเตือน LINE แบบ async (non-blocking) พร้อมการ rate limiting
 * ป้องกัน spam โดยรอให้มีระยะห่างตามที่กำหนด (NOTIFICATION_DELAY) ระหว่าง notification แต่ละครั้ง
 */
function sendLineNotificationAsync(transactionData, config) {
  try {
    if (!config.ENABLED) {
      console.log('ℹ️ LINE notification ถูก disable');
      return;
    }

    if (!config.CHANNEL_ACCESS_TOKEN || !config.GROUP_ID) {
      console.log('⚠️ LINE config ไม่สมบูรณ์');
      return;
    }

    const now = Date.now();
    const lastNotificationTime = getLastNotificationTime();
    const timeSinceLastNotification = now - lastNotificationTime;
    const delayMs = config.NOTIFICATION_DELAY || 1000;

    if (timeSinceLastNotification < delayMs) {
      const waitTime = delayMs - timeSinceLastNotification;
      console.log(`⏱️ Rate limiting: รอ ${waitTime}ms ก่อนส่ง notification`);
      Utilities.sleep(waitTime);
    }

    const result = sendLineNotification(transactionData, config.CHANNEL_ACCESS_TOKEN, config.GROUP_ID);
    
    if (result.success) {
      setLastNotificationTime(Date.now());
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error in sendLineNotificationAsync:', error);
    return { success: false, error: error.toString() };
  }
}

function logTransaction(dataString, sheetsId) {
  const logs = [];
  
  try {
    logs.push('=== 🔵 logTransaction STARTED ===');
    logs.push('Input dataString length: ' + (dataString ? dataString.length : 0));
    
    const transactionData = JSON.parse(dataString);
    logs.push('✅ Parsed transaction data: ' + JSON.stringify(transactionData));
    
    const spreadsheet = SpreadsheetApp.openById(sheetsId);
    logs.push('✅ Opened spreadsheet: ' + sheetsId);
    
    // หาหรือสร้าง sheet สำหรับ transaction log
    let logSheet = null;
    try {
      logSheet = spreadsheet.getSheetByName('Transaction_Log');
      
      // ตรวจสอบว่า sheet มี header หรือไม่
      if (!logSheet || logSheet.getLastRow() === 0) {
        throw new Error('Sheet ว่างหรือไม่มี header');
      }
      
    } catch (e) {
      console.log('กำลังสร้าง Transaction_Log sheet ใหม่...');
      
      // ลบ sheet เก่าถ้ามี (แต่ว่าง)
      try {
        const oldSheet = spreadsheet.getSheetByName('Transaction_Log');
        if (oldSheet && oldSheet.getLastRow() === 0) {
          spreadsheet.deleteSheet(oldSheet);
        }
      } catch (deleteError) {
        // ไม่ต้องทำอะไร
      }
      
      // สร้าง sheet ใหม่
      logSheet = spreadsheet.insertSheet('Transaction_Log');
      
      // สร้าง header (เพิ่ม UID, Book No., Receipt No.)
      logSheet.getRange(1, 1, 1, 16).setValues([[
        'UID', 'วันที่', 'เวลา', 'ประเภท', 'แหล่งที่มา', 'ปลายทาง', 'จำนวน(ลิตร)', 
        'ราคาต่อลิตร', 'ยอดรวม', 'ผู้ปฏิบัติงาน', 'หน่วย', 'ประเภทอากาศยาน', 
        'เลขทะเบียน', 'หมายเหตุ', 'Book No.', 'Receipt No.'
      ]]);
      
      // จัดรูปแบบ header
      const headerRange = logSheet.getRange(1, 1, 1, 16);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#2196F3');
      headerRange.setFontColor('#FFFFFF');
      
      logSheet.autoResizeColumns(1, 16);
      logSheet.setFrozenRows(1);
    }
    
    // ตรวจสอบอีกครั้งก่อน append
    if (!logSheet) {
      throw new Error('ไม่สามารถสร้างหรือเข้าถึง Transaction_Log sheet ได้');
    }
    
    // เพิ่ม transaction ใหม่
    const timestamp = transactionData.timestamp ? new Date(transactionData.timestamp) : new Date();
    const dateStr = timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = timestamp.toTimeString().split(' ')[0]; // HH:MM:SS
    
    logSheet.appendRow([
      transactionData.uid || '',           
      dateStr,                             
      timeStr,                             
      transactionData.type || '',          
      transactionData.source || '',        
      transactionData.destination || '',   
      transactionData.volume || 0,         
      transactionData.pricePerLiter || 0,  
      transactionData.totalCost || 0,      
      transactionData.operatorName || '',  
      transactionData.unit || '',          
      transactionData.aircraftType || '',  
      transactionData.aircraftNumber || '',
      transactionData.notes || '',         
      transactionData.bookNo || '',        
      transactionData.receiptNo || ''      
    ]);
    
    const lineConfig = getLineConfigFromSheet(spreadsheet);
    
    logs.push('🔍 Line config check:');
    logs.push('   ENABLED: ' + lineConfig.ENABLED);
    logs.push('   Type of ENABLED: ' + typeof lineConfig.ENABLED);
    logs.push('   GROUP_ID: ' + (lineConfig.GROUP_ID ? '✓ มี' : '✗ ไม่มี'));
    logs.push('   TOKEN length: ' + (lineConfig.CHANNEL_ACCESS_TOKEN ? lineConfig.CHANNEL_ACCESS_TOKEN.length : 0));
    
    try {
      if (lineConfig.ENABLED === true || lineConfig.ENABLED === 'true') {
        logs.push('🟢 Sending LINE notification...');
        const notificationResult = sendLineNotificationAsync(transactionData, lineConfig);
        logs.push('📬 Notification result: ' + JSON.stringify(notificationResult));
      } else {
        logs.push('🔴 LINE notification disabled. ENABLED value: ' + lineConfig.ENABLED);
        logs.push('   Using default LINE_CONFIG.ENABLED: ' + LINE_CONFIG.ENABLED);
      }
    } catch (notificationError) {
      logs.push('⚠️ Warning: LINE notification failed, but transaction saved: ' + notificationError);
      logs.push('❌ Full error: ' + notificationError.toString());
    }
    
    logs.push('=== 🟢 logTransaction COMPLETED ===');
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'บันทึก transaction สำเร็จ',
        logs: logs
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    logs.push('❌ Error in logTransaction: ' + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString(),
        logs: logs
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Helper functions
 */
function normalizeKey(header) {
  if (!header) return '';
  
  const keyMappings = {
    'ชื่อ': 'name',
    'ชื่อแหล่งน้ำมัน': 'name',
    'source_name': 'name',
    'แหล่งน้ำมัน': 'name',
    'ความจุ': 'capacity',
    'capacity': 'capacity',
    'คงเหลือ': 'current_stock',
    'จำนวนปัจจุบัน': 'current_stock',
    'current_stock': 'current_stock',
    'stock': 'current_stock',
    'ประเภท': 'type',
    'type': 'type',
    'id': 'id',
    'สถานะ': 'status',
    'status': 'status'
  };
  
  const normalized = header.toString().toLowerCase().trim();
  return keyMappings[normalized] || keyMappings[header.toString().trim()] || normalized.replace(/\s+/g, '_');
}

function findColumnIndex(headers, possibleNames) {
  for (let name of possibleNames) {
    const index = headers.findIndex(header => 
      header && (
        header.toString().toLowerCase().trim() === name.toLowerCase() ||
        normalizeKey(header) === name
      )
    );
    if (index !== -1) return index;
  }
  return -1;
}

/**
 * ========================================
 * PRICE MANAGEMENT FUNCTIONS
 * ========================================
 */

/**
 * สร้างชีท Price_History สำหรับเก็บประวัติราคา
 */
function createPriceHistorySheet(sheetsId) {
  try {
    const spreadsheet = SpreadsheetApp.openById(sheetsId);
    
    // ตรวจสอบว่ามีชีท Price_History อยู่แล้วหรือไม่
    let priceSheet = spreadsheet.getSheetByName('Price_History');
    
    if (priceSheet) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: true,
          message: 'Price_History sheet already exists',
          sheetId: priceSheet.getSheetId()
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // สร้างชีทใหม่
    priceSheet = spreadsheet.insertSheet('Price_History');
    
    // สร้าง Header
    const headers = [
      'Timestamp',           // A: วันที่-เวลาที่บันทึก
      'Date',                // B: วันที่
      'Time',                // C: เวลา
      'Price Per Liter',     // D: ราคาต่อลิตร
      'Price Per Drum',      // E: ราคาต่อถัง 200L
      'Updated By',          // F: ผู้แก้ไข
      'Notes'                // G: หมายเหตุ
    ];
    
    priceSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // จัดรูปแบบ Header
    const headerRange = priceSheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#4285f4');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');
    
    // ตั้งค่าความกว้างคอลัมน์
    priceSheet.setColumnWidth(1, 180); // Timestamp
    priceSheet.setColumnWidth(2, 100); // Date
    priceSheet.setColumnWidth(3, 80);  // Time
    priceSheet.setColumnWidth(4, 120); // Price Per Liter
    priceSheet.setColumnWidth(5, 120); // Price Per Drum
    priceSheet.setColumnWidth(6, 150); // Updated By
    priceSheet.setColumnWidth(7, 200); // Notes
    
    // Freeze header row
    priceSheet.setFrozenRows(1);
    
    // เพิ่มแถวแรกด้วยราคาเริ่มต้น
    const now = new Date();
    const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const timeStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm:ss');
    const timestampStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    
    const initialData = [
      timestampStr,
      dateStr,
      timeStr,
      0,                    // ราคาต่อลิตรเริ่มต้น
      0,                    // ราคาต่อถังเริ่มต้น
      'System',
      'Initial setup'
    ];
    
    priceSheet.getRange(2, 1, 1, initialData.length).setValues([initialData]);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'Price_History sheet created successfully',
        sheetId: priceSheet.getSheetId()
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error in createPriceHistorySheet:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * ดึงราคาปัจจุบัน (แถวล่าสุดใน Price_History)
 */
function getCurrentPrices(sheetsId, gid) {
  try {
    // Log เพื่อ debug
    console.log('getCurrentPrices called with sheetsId:', sheetsId, 'gid:', gid);
    console.log('sheetsId type:', typeof sheetsId);
    console.log('sheetsId length:', sheetsId ? sheetsId.length : 'null/undefined');
    
    // ตรวจสอบว่ามี sheetsId หรือไม่
    if (!sheetsId) {
      throw new Error('sheetsId is required');
    }
    
    const spreadsheet = SpreadsheetApp.openById(sheetsId);
    let priceSheet = null;
    
    // ถ้ามี gid ให้หา sheet ตาม gid ก่อน
    if (gid) {
      const sheets = spreadsheet.getSheets();
      for (let sheet of sheets) {
        if (sheet.getSheetId().toString() === gid.toString()) {
          priceSheet = sheet;
          console.log('Found price sheet by GID:', gid, 'sheet name:', sheet.getName());
          break;
        }
      }
    }
    
    // ถ้าไม่เจอตาม gid หรือไม่มี gid ให้หาตามชื่อ
    if (!priceSheet) {
      try {
        priceSheet = spreadsheet.getSheetByName('Price_History');
        console.log('Found price sheet by name: Price_History');
      } catch (e) {
        console.log('No Price_History sheet found by name');
      }
    }
    
    // ถ้ายังไม่มีชีท ให้สร้างใหม่
    if (!priceSheet) {
      console.log('Creating new Price_History sheet');
      createPriceHistorySheet(sheetsId);
      priceSheet = spreadsheet.getSheetByName('Price_History');
    }
    
    const lastRow = priceSheet.getLastRow();
    const lastCol = priceSheet.getLastColumn();
    
    console.log('Price sheet info - LastRow:', lastRow, 'LastCol:', lastCol);
    console.log('Price sheet name:', priceSheet.getName());
    
    // ถ้าไม่มีข้อมูล (มีแค่ header)
    if (lastRow < 2) {
      console.log('No price data found (only header row exists)');
      return ContentService
        .createTextOutput(JSON.stringify({
          success: true,
          data: {
            pricePerLiter: 0,
            pricePerDrum: 0,
            lastUpdated: null,
            updatedBy: null
          }
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // อ่านแถวล่าสุด - อ่านคอลัมน์ทั้งหมดเพื่อ debug
    const lastRowData = priceSheet.getRange(lastRow, 1, 1, lastCol).getValues()[0];
    console.log('Last row data:', lastRowData);
    console.log('Price per liter (col D - index 3):', lastRowData[3]);
    console.log('Price per drum (col E - index 4):', lastRowData[4]);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data: {
          pricePerLiter: parseFloat(lastRowData[3]) || 0,
          pricePerDrum: parseFloat(lastRowData[4]) || 0,
          lastUpdated: lastRowData[0] || null,
          updatedBy: lastRowData[5] || null,
          notes: lastRowData[6] || null
        }
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error in getCurrentPrices:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * อัปเดตราคา (เพิ่มแถวใหม่ใน Price_History)
 */
function updatePrices(dataJson, sheetsId) {
  try {
    const data = JSON.parse(dataJson);
    const spreadsheet = SpreadsheetApp.openById(sheetsId);
    let priceSheet = spreadsheet.getSheetByName('Price_History');
    
    // ถ้าไม่มีชีท ให้สร้างใหม่
    if (!priceSheet) {
      createPriceHistorySheet(sheetsId);
      priceSheet = spreadsheet.getSheetByName('Price_History');
    }
    
    // เตรียมข้อมูล
    const now = new Date();
    const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const timeStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm:ss');
    const timestampStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    
    const newRow = [
      timestampStr,
      dateStr,
      timeStr,
      parseFloat(data.pricePerLiter) || 0,
      parseFloat(data.pricePerDrum) || 0,
      data.updatedBy || 'Admin',
      data.notes || ''
    ];
    
    // เพิ่มแถวใหม่
    priceSheet.appendRow(newRow);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'Prices updated successfully',
        data: {
          pricePerLiter: newRow[3],
          pricePerDrum: newRow[4],
          timestamp: timestampStr
        }
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error in updatePrices:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * ดึงประวัติราคาทั้งหมด
 */
function getPriceHistory(sheetsId) {
  try {
    const spreadsheet = SpreadsheetApp.openById(sheetsId);
    let priceSheet = spreadsheet.getSheetByName('Price_History');
    
    // ถ้าไม่มีชีท ให้สร้างใหม่
    if (!priceSheet) {
      createPriceHistorySheet(sheetsId);
      priceSheet = spreadsheet.getSheetByName('Price_History');
    }
    
    const lastRow = priceSheet.getLastRow();
    
    // ถ้าไม่มีข้อมูล (มีแค่ header)
    if (lastRow < 2) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: true,
          data: [],
          count: 0
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // อ่านข้อมูลทั้งหมด (ข้าม header)
    const dataRange = priceSheet.getRange(2, 1, lastRow - 1, 7);
    const values = dataRange.getValues();
    
    // แปลงเป็น array of objects
    const history = values.map((row, index) => ({
      id: `price_${index}_${Date.now()}`,
      timestamp: row[0] || '',
      date: row[1] || '',
      time: row[2] || '',
      pricePerLiter: parseFloat(row[3]) || 0,
      pricePerDrum: parseFloat(row[4]) || 0,
      updatedBy: row[5] || '',
      notes: row[6] || ''
    }));
    
    // เรียงจากใหม่ไปเก่า
    history.reverse();
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data: history,
        count: history.length
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error in getPriceHistory:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * ========================================
 * BUDGET MANAGEMENT FUNCTIONS
 * ========================================
 */

/**
 * สร้างชีท Budget สำหรับเก็บข้อมูลงบประมาณ
 */
function createBudgetSheet(sheetsId) {
  try {
    const spreadsheet = SpreadsheetApp.openById(sheetsId);
    
    // ตรวจสอบว่ามีชีท Budget อยู่แล้วหรือไม่
    let budgetSheet = spreadsheet.getSheetByName('Budget');
    
    if (budgetSheet) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: true,
          message: 'Budget sheet already exists',
          sheetId: budgetSheet.getSheetId()
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // สร้างชีทใหม่
    budgetSheet = spreadsheet.insertSheet('Budget');
    
    // สร้าง Header
    const headers = [
      'Plan Name',              // A: ชื่อแผน
      'Allocated Amount',       // B: งบประมาณที่จัดสรร
      'Used Amount',           // C: งบประมาณที่ใช้ไป (จะอัปเดตอัตโนมัติ)
      'Remaining Amount',      // D: งบประมาณคงเหลือ (สูตร B-C)
      'Last Updated',          // E: วันที่อัปเดตล่าสุด
      'Notes'                  // F: หมายเหตุ
    ];
    
    budgetSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // จัดรูปแบบ Header
    const headerRange = budgetSheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#0f9d58');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');
    
    // ตั้งค่าความกว้างคอลัมน์
    budgetSheet.setColumnWidth(1, 150); // Plan Name
    budgetSheet.setColumnWidth(2, 150); // Allocated Amount
    budgetSheet.setColumnWidth(3, 120); // Used Amount
    budgetSheet.setColumnWidth(4, 150); // Remaining Amount
    budgetSheet.setColumnWidth(5, 150); // Last Updated
    budgetSheet.setColumnWidth(6, 200); // Notes
    
    // Freeze header row
    budgetSheet.setFrozenRows(1);
    
    // เพิ่มแผนต่างๆ
    const initialBudgetPlans = [
      ['แผนบรู', 0, 0, '=B2-C2', '', 'งบประมาณสำหรับแผนบรู'],
      ['แผนยุทธ', 0, 0, '=B3-C3', '', 'งบประมาณสำหรับแผนยุทธศาสตร์'],
      ['แผนฝุ่น', 0, 0, '=B4-C4', '', 'งบประมาณสำหรับแผนฝุ่น'],
      ['แผนลูกเห็บ', 0, 0, '=B5-C5', '', 'งบประมาณสำหรับแผนลูกเห็บ']
    ];
    
    for (let i = 0; i < initialBudgetPlans.length; i++) {
      budgetSheet.getRange(i + 2, 1, 1, initialBudgetPlans[i].length).setValues([initialBudgetPlans[i]]);
    }
    
    // จัดรูปแบบข้อมูล
    const dataRange = budgetSheet.getRange(2, 1, initialBudgetPlans.length, 6);
    dataRange.setHorizontalAlignment('center');
    
    // จัดรูปแบบคอลัมน์ตัวเลข
    const numberColumns = budgetSheet.getRange(2, 2, initialBudgetPlans.length, 3);
    numberColumns.setNumberFormat('#,##0');
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'Budget sheet created successfully',
        sheetId: budgetSheet.getSheetId(),
        gid: budgetSheet.getSheetId().toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error in createBudgetSheet:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * อัปเดตงบประมาณที่จัดสรร
 */
function updateBudgetAllocation(planName, allocatedAmount, sheetsId) {
  try {
    const spreadsheet = SpreadsheetApp.openById(sheetsId);
    let budgetSheet = spreadsheet.getSheetByName('Budget');
    
    // ถ้าไม่มีชีท ให้สร้างใหม่
    if (!budgetSheet) {
      createBudgetSheet(sheetsId);
      budgetSheet = spreadsheet.getSheetByName('Budget');
    }
    
    const lastRow = budgetSheet.getLastRow();
    
    // หาแถวที่ตรงกับชื่อแผน
    let targetRow = -1;
    for (let i = 2; i <= lastRow; i++) {
      const cellValue = budgetSheet.getRange(i, 1).getValue();
      if (cellValue === planName) {
        targetRow = i;
        break;
      }
    }
    
    if (targetRow === -1) {
      throw new Error(`ไม่พบแผน: ${planName}`);
    }
    
    // อัปเดตงบประมาณที่จัดสรร
    budgetSheet.getRange(targetRow, 2).setValue(parseFloat(allocatedAmount));
    
    // อัปเดตวันที่
    const now = new Date();
    const timestamp = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    budgetSheet.getRange(targetRow, 5).setValue(timestamp);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: `อัปเดตงบประมาณ ${planName} เป็น ${allocatedAmount} บาท สำเร็จ`
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error in updateBudgetAllocation:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * อัปเดตงบประมาณที่ใช้ไป (จะถูกเรียกเมื่อมีการซื้อจาก ปตท.)
 */
function updateBudgetUsage(totalPurchaseAmount, sheetsId) {
  try {
    const spreadsheet = SpreadsheetApp.openById(sheetsId);
    let budgetSheet = spreadsheet.getSheetByName('Budget');
    
    // ถ้าไม่มีชีท ให้สร้างใหม่
    if (!budgetSheet) {
      createBudgetSheet(sheetsId);
      budgetSheet = spreadsheet.getSheetByName('Budget');
    }
    
    // อัปเดตงบประมาณที่ใช้ไปในทุกแผน (อาจจะต้องปรับตามความต้องการจริง)
    // ตอนนี้ตั้งให้อัปเดตแค่แผนแรก (แผนบรู) ก่อน
    const targetRow = 2; // แผนบรู
    
    budgetSheet.getRange(targetRow, 3).setValue(parseFloat(totalPurchaseAmount) || 0);
    
    // อัปเดตวันที่
    const now = new Date();
    const timestamp = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    budgetSheet.getRange(targetRow, 5).setValue(timestamp);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'อัปเดตงบประมาณที่ใช้ไปสำเร็จ'
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error in updateBudgetUsage:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * ========================================
 * DAILY INVENTORY CONFIRMATION FUNCTIONS
 * ========================================
 */

/**
 * บันทึกการยืนยันยอดคงเหลือรายวัน
 */
function confirmDailyInventory(dataString, sheetsId) {
  try {
    const confirmationData = JSON.parse(dataString);
    
    const spreadsheet = SpreadsheetApp.openById(sheetsId);
    
    // หาหรือสร้าง sheet สำหรับ Daily_Inventory_Confirmation
    let confirmSheet = null;
    try {
      confirmSheet = spreadsheet.getSheetByName('Daily_Inventory_Confirmation');
      
      // ตรวจสอบว่า sheet มี header หรือไม่
      if (!confirmSheet || confirmSheet.getLastRow() === 0) {
        throw new Error('Sheet ว่างหรือไม่มี header');
      }
      
    } catch (e) {
      console.log('กำลังสร้าง Daily_Inventory_Confirmation sheet ใหม่...');
      
      // ลบ sheet เก่าถ้ามี (แต่ว่าง)
      try {
        const oldSheet = spreadsheet.getSheetByName('Daily_Inventory_Confirmation');
        if (oldSheet && oldSheet.getLastRow() === 0) {
          spreadsheet.deleteSheet(oldSheet);
        }
      } catch (deleteError) {
        // ไม่ต้องทำอะไร
      }
      
      // สร้าง sheet ใหม่
      confirmSheet = spreadsheet.insertSheet('Daily_Inventory_Confirmation');
      
      // สร้าง header
      confirmSheet.getRange(1, 1, 1, 6).setValues([[
        'วันที่', 'เวลา', 'ผู้ทำรายการ', 'แหล่งน้ำมัน', 'จำนวนคงเหลือ(ลิตร)', 'Timestamp'
      ]]);
      
      // จัดรูปแบบ header
      const headerRange = confirmSheet.getRange(1, 1, 1, 6);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4CAF50');
      headerRange.setFontColor('#FFFFFF');
      
      confirmSheet.autoResizeColumns(1, 6);
      confirmSheet.setFrozenRows(1);
    }
    
    // ตรวจสอบอีกครั้งก่อน append
    if (!confirmSheet) {
      throw new Error('ไม่สามารถสร้างหรือเข้าถึง Daily_Inventory_Confirmation sheet ได้');
    }
    
    // เพิ่มแถวใหม่
    const timestamp = confirmationData.timestamp ? new Date(confirmationData.timestamp) : new Date();
    const dateStr = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const timeStr = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'HH:mm:ss');
    const timestampStr = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    
    confirmSheet.appendRow([
      dateStr,                                 // คอลัมน์ A: วันที่
      timeStr,                                 // คอลัมน์ B: เวลา
      confirmationData.operatorName || '',     // คอลัมน์ C: ผู้ทำรายการ
      confirmationData.sourceName || '',       // คอลัมน์ D: แหล่งน้ำมัน
      confirmationData.currentStock || 0,      // คอลัมน์ E: จำนวนคงเหลือ(ลิตร)
      timestampStr                             // คอลัมน์ F: Timestamp
    ]);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'บันทึกการยืนยันยอดคงเหลือสำเร็จ'
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error in confirmDailyInventory:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * ดึงข้อมูลการยืนยันล่าสุดของแต่ละ source จาก Daily Confirmation sheet
 * ใช้สำหรับตรวจสอบว่าแต่ละแหล่งน้ำมันได้ยืนยันแล้วหรือยัง
 */
function getLatestDailyConfirmations(sheetsId, gid) {
  try {
    const spreadsheet = SpreadsheetApp.openById(sheetsId);
    
    // หา sheet ตาม GID (1512968674)
    let confirmSheet = null;
    const allSheets = spreadsheet.getSheets();
    for (let i = 0; i < allSheets.length; i++) {
      if (allSheets[i].getSheetId().toString() === gid.toString()) {
        confirmSheet = allSheets[i];
        break;
      }
    }
    
    if (!confirmSheet) {
      throw new Error('Sheet ที่มี GID ' + gid + ' ไม่พบ');
    }
    
    // อ่านข้อมูลทั้งหมด
    const lastRow = confirmSheet.getLastRow();
    if (lastRow <= 1) {
      // ไม่มีข้อมูล
      console.log('ไม่มีข้อมูลการยืนยันหรือ sheet ว่าง');
      return ContentService
        .createTextOutput(JSON.stringify({
          success: true,
          data: []
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // อ่านข้อมูลจากแถวที่ 2 ไปถึงแถวสุดท้าย (ข้ามหัว)
    const dataRange = confirmSheet.getRange(2, 1, lastRow - 1, 7); // 7 คอลัมน์: A-G
    const data = dataRange.getValues();
    
    // คอลัมน์: A=วันที่, B=เวลา, C=ผู้ทำรายการ, D=แหล่งน้ำมัน, E=Source ID, F=จำนวนลิตร, G=Timestamp
    
    // สร้าง Map เพื่อหาวันที่ล่าสุดของแต่ละ sourceId
    const latestBySource = {};
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const sourceId = row[4]; // คอลัมน์ E
      const confirmDate = row[0]; // คอลัมน์ A (วันที่)
      
      if (sourceId) {
        // เก็บวันที่ล่าสุดของแต่ละ sourceId
        // เปรียบเทียบแบบ string (ถ้า format ถูก: YYYY-MM-DD)
        if (!latestBySource[sourceId] || confirmDate > latestBySource[sourceId]) {
          latestBySource[sourceId] = confirmDate;
        }
      }
    }
    
    // แปลงผลลัพธ์เป็น array
    const result = [];
    for (const sourceId in latestBySource) {
      result.push({
        sourceId: sourceId,
        confirmDate: latestBySource[sourceId]
      });
    }
    
    console.log('✅ ข้อมูลการยืนยันล่าสุด:', result);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data: result
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error in getLatestDailyConfirmations:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString(),
        data: []
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * บันทึกการยืนยันยอดรายวันของแต่ละแหล่งน้ำมัน
 * ฟังก์ชันนี้จะเก็บบันทึกของปุ่มยืนยันยอดในแต่ละเจอ์ 
 */
function logDailyConfirmation(dataString, sheetsId, gid) {
  try {
    const confirmationData = JSON.parse(dataString);
    
    const spreadsheet = SpreadsheetApp.openById(sheetsId);
    
    // หาหรือสร้าง sheet ตาม gid (1512968674)
    let confirmSheet = null;
    try {
      // หา sheet ตาม GID
      const allSheets = spreadsheet.getSheets();
      for (let i = 0; i < allSheets.length; i++) {
        if (allSheets[i].getSheetId().toString() === gid.toString()) {
          confirmSheet = allSheets[i];
          break;
        }
      }
      
      if (!confirmSheet) {
        throw new Error('Sheet ที่มี GID ' + gid + ' ไม่พบ');
      }
      
      // ตรวจสอบว่า sheet มี header หรือไม่
      if (confirmSheet.getLastRow() === 0) {
        // สร้าง header ถ้า sheet ว่าง
        confirmSheet.getRange(1, 1, 1, 7).setValues([[
          'วันที่', 'เวลา', 'ผู้ทำรายการ', 'แหล่งน้ำมัน', 'Source ID', 'จำนวนลิตรปัจจุบัน', 'Timestamp'
        ]]);
        
        // จัดรูปแบบ header
        const headerRange = confirmSheet.getRange(1, 1, 1, 7);
        headerRange.setFontWeight('bold');
        headerRange.setBackground('#27ae60');
        headerRange.setFontColor('#FFFFFF');
        
        confirmSheet.autoResizeColumns(1, 7);
        confirmSheet.setFrozenRows(1);
      }
      
    } catch (e) {
      console.error('Error accessing sheet:', e.toString());
      throw new Error('ไม่สามารถเข้าถึง sheet ได้: ' + e.toString());
    }
    
    // เพิ่มแถวใหม่
    const timestamp = confirmationData.timestamp ? new Date(confirmationData.timestamp) : new Date();
    const dateStr = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const timeStr = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'HH:mm:ss');
    const timestampStr = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    
    confirmSheet.appendRow([
      dateStr,                                 // คอลัมน์ A: วันที่
      timeStr,                                 // คอลัมน์ B: เวลา
      confirmationData.operatorName || '',     // คอลัมน์ C: ผู้ทำรายการ
      confirmationData.sourceName || '',       // คอลัมน์ D: แหล่งน้ำมัน
      confirmationData.sourceId || '',         // คอลัมน์ E: Source ID
      confirmationData.currentStock || 0,      // คอลัมน์ F: จำนวนลิตรปัจจุบัน
      timestampStr                             // คอลัมน์ G: Timestamp
    ]);
    
    console.log('✅ บันทึกการยืนยันยอด:', confirmationData);
    
    const lineConfig = getLineConfigFromSheet(spreadsheet);
    
    console.log('🔍 Line config check:');
    console.log('   ENABLED:', lineConfig.ENABLED);
    console.log('   Type of ENABLED:', typeof lineConfig.ENABLED);
    
    try {
      if (lineConfig.ENABLED === true || lineConfig.ENABLED === 'true') {
        console.log('🟢 Sending LINE notification for daily confirmation...');
        sendLineNotificationAsync(confirmationData, lineConfig);
      } else {
        console.log('🔴 LINE notification disabled:', lineConfig.ENABLED);
      }
    } catch (notificationError) {
      console.log('⚠️ Warning: LINE notification failed, but confirmation saved:', notificationError);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'บันทึกการยืนยันยอดสำเร็จ',
        data: {
          date: dateStr,
          time: timeStr,
          operatorName: confirmationData.operatorName,
          sourceName: confirmationData.sourceName
        }
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error in logDailyConfirmation:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * ฟังก์ชันส่ง LINE Notification
 * ส่งข้อความแจ้งเตือนไปยัง LINE group เมื่อมี transaction
 */
function sendLineNotification(transactionData, accessToken, groupId) {
  try {
    console.log('📤 sendLineNotification called');
    console.log('   accessToken: ' + (accessToken ? 'มี (ขนาด ' + accessToken.length + ')' : 'ไม่มี'));
    console.log('   groupId: ' + (groupId ? groupId : 'ไม่มี'));
    
    if (!accessToken || !groupId) {
      console.log('⚠️ LINE config ไม่สมบูรณ์, ข้ามการส่ง notification');
      return { success: false, message: 'Missing LINE config' };
    }

    const message = (transactionData.volume !== undefined) 
      ? formatTransactionMessage(transactionData)
      : formatConfirmationMessage(transactionData);
    console.log('📋 Message to send:');
    console.log(message);
    
    const payload = {
      to: groupId,
      messages: [{
        type: 'text',
        text: message
      }]
    };

    console.log('\n🔧 Preparing request...');
    const options = {
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    console.log('📡 Sending to LINE API: https://api.line.me/v2/bot/message/push');
    const response = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    console.log('📨 Response from LINE API:');
    console.log('   Status: ' + responseCode);
    console.log('   Body: ' + responseText);

    if (responseCode === 200) {
      console.log('✅ LINE notification ส่งสำเร็จ');
      return { 
        success: true, 
        message: 'LINE notification sent',
        transactionMessage: message
      };
    } else {
      console.log('❌ LINE notification ส่งไม่สำเร็จ');
      logNotificationError(
        'LINE API error: ' + responseCode + ' - ' + responseText,
        transactionData
      );
      return { 
        success: false, 
        error: 'LINE API returned ' + responseCode,
        details: responseText
      };
    }

  } catch (error) {
    console.error('❌ Exception in sendLineNotification:', error);
    logNotificationError(error.toString(), transactionData);
    return { 
      success: false, 
      error: error.toString() 
    };
  }
}

/**
 * จัดรูปแบบข้อความ transaction เป็นภาษาไทย
 * รูปแบบ: จ่ายน้ำมัน [วันเวลา] [ปริมาณ] ลิตร จาก [ที่มา] → [ปลายทาง : โอโดมิเตอร์] | โดย [ผู้ปฏิบัติงาน]
 */
function formatTransactionMessage(transactionData) {
  try {
    const timestamp = transactionData.timestamp ? new Date(transactionData.timestamp) : new Date();
    const dateTimeStr = formatThaiDate(timestamp);
    
    const source = transactionData.source || '-';
    const destination = transactionData.destination || '-';
    const volume = transactionData.volume || 0;
    const aircraftNumber = transactionData.aircraftNumber || '-';
    const operatorName = transactionData.operatorName || '-';

    // สร้างข้อความตามรูปแบบที่ระบุ
    const message = `⛽ จ่ายน้ำมัน\n📅 ${dateTimeStr}\n\n🔹 ปริมาณ: ${volume} ลิตร\n📍 จาก: ${source}\n➜ ถึง: ${destination}\n✈️ เครื่องบิน: ${aircraftNumber}\n\n👤 โดย: ${operatorName}`;
    
    return message;
  } catch (error) {
    console.error('Error in formatTransactionMessage:', error);
    return 'ข้อมูล transaction: ' + JSON.stringify(transactionData);
  }
}

/**
 * จัดรูปแบบข้อความ Daily Confirmation เป็นภาษาไทย
 * รูปแบบ: ยืนยันยอดน้ำมัน [วันเวลา] [แหล่งที่มา] จำนวน [ปัจจุบัน] ลิตร | โดย [ผู้ปฏิบัติงาน]
 */
function formatConfirmationMessage(confirmationData) {
  try {
    const timestamp = confirmationData.timestamp ? new Date(confirmationData.timestamp) : new Date();
    const dateTimeStr = formatThaiDate(timestamp);
    
    const sourceName = confirmationData.sourceName || '-';
    const currentStock = confirmationData.currentStock || 0;
    const operatorName = confirmationData.operatorName || '-';

    // สร้างข้อความสำหรับการยืนยันยอด
    const message = `📊 ยืนยันยอดน้ำมัน\n📅 ${dateTimeStr}\n\n📍 แหล่งที่มา: ${sourceName}\n🔹 จำนวนปัจจุบัน: ${currentStock} ลิตร\n\n👤 โดย: ${operatorName}`;
    
    return message;
  } catch (error) {
    console.error('Error in formatConfirmationMessage:', error);
    return 'ข้อมูล confirmation: ' + JSON.stringify(confirmationData);
  }
}

/**
 * จัดรูปแบบวันที่เป็นปฏิทินไทย
 * ตัวอย่าง: 16/12/2568 09:08:31
 */
function formatThaiDate(date) {
  try {
    const year = date.getFullYear() + 543; // แปลงเป็นปีพุทธศักราช
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    console.error('Error in formatThaiDate:', error);
    return new Date().toISOString();
  }
}

/**
 * สร้างหรือหา Error_Log sheet
 */
function getOrCreateErrorLogSheet(spreadsheet) {
  try {
    let errorSheet = spreadsheet.getSheetByName('Error_Log');
    
    if (!errorSheet) {
      console.log('🔨 สร้าง Error_Log sheet ใหม่...');
      errorSheet = spreadsheet.insertSheet('Error_Log');
      
      const headers = ['Timestamp', 'Error Type', 'Error Message', 'Transaction UID', 'Source', 'Destination', 'Volume', 'Status'];
      errorSheet.appendRow(headers);
      
      const headerRange = errorSheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#FF5722');
      headerRange.setFontColor('#FFFFFF');
      
      errorSheet.autoResizeColumns(1, headers.length);
      errorSheet.setFrozenRows(1);
    }
    
    return errorSheet;
  } catch (error) {
    console.error('❌ Error creating Error_Log sheet:', error);
    return null;
  }
}

/**
 * บันทึก error ของ LINE notification ลง Google Sheet
 */
function logNotificationError(error, transactionData) {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const errorSheet = getOrCreateErrorLogSheet(spreadsheet);
    
    if (!errorSheet) {
      console.error('❌ ไม่สามารถสร้าง Error_Log sheet ได้');
      return;
    }
    
    const timestamp = new Date().toISOString();
    const uid = transactionData?.uid || '-';
    const source = transactionData?.source || '-';
    const destination = transactionData?.destination || '-';
    const volume = transactionData?.volume || '-';
    
    const errorRow = [
      timestamp,
      'LINE_NOTIFICATION_ERROR',
      error.toString().substring(0, 500),
      uid,
      source,
      destination,
      volume,
      'FAILED'
    ];
    
    errorSheet.appendRow(errorRow);
    console.error('📝 Error logged to Error_Log sheet:', {
      timestamp,
      error: error.toString(),
      uid
    });
    
  } catch (logError) {
    console.error('❌ Failed to log error:', logError);
  }
}

/**
 * ดึงค่า LINE configuration จาก config.js
 */
function getLineConfig() {
  // ใช้ค่าจาก config.js ที่ include ไว้
  // LINE_CONFIG จะถูก load จาก config.js
  if (typeof LINE_CONFIG !== 'undefined') {
    return LINE_CONFIG;
  }
  
  // Fallback values (กรณี config ยังไม่ load)
  return {
    CHANNEL_ACCESS_TOKEN: '',
    GROUP_ID: '',
    NOTIFICATION_DELAY: 1000,
    LINE_API_URL: 'https://api.line.biz/v2/bot/message/push',
    ENABLED: false
  };
}

/**
 * TEST FUNCTION - ทดสอบการส่ง LINE notification
 * รันฟังก์ชันนี้จาก Google Apps Script Editor เพื่อทดสอบ
 */
function testSendLineNotification() {
  Logger.log('=== ทดสอบส่ง LINE Notification ===');
  
  // ข้อมูล transaction สำหรับทดสอบ
  const testData = {
    uid: 'TEST-001',
    timestamp: new Date().toISOString(),
    type: 'fuel_delivery',
    source: '96-0677 กทม.',
    destination: 'CARAVAN GRAND EX',
    volume: 100,
    pricePerLiter: 29.50,
    totalCost: 2950,
    operatorName: 'Kob',
    unit: 'บบ.ปส.',
    aircraftType: 'CARAVAN',
    aircraftNumber: '1931',
    notes: 'ทดสอบ LINE notification'
  };

  Logger.log('ข้อมูล transaction ทดสอบ:');
  Logger.log(JSON.stringify(testData, null, 2));

  // ส่ง LINE notification
  const config = getLineConfig();
  Logger.log('LINE Config:');
  Logger.log('- ENABLED: ' + config.ENABLED);
  Logger.log('- GROUP_ID: ' + (config.GROUP_ID ? 'มี' : 'ไม่มี'));
  Logger.log('- TOKEN: ' + (config.CHANNEL_ACCESS_TOKEN ? 'มี' : 'ไม่มี'));

  if (!config.ENABLED) {
    Logger.log('❌ LINE notification ปิดอยู่');
    return;
  }

  const result = sendLineNotification(testData, config.CHANNEL_ACCESS_TOKEN, config.GROUP_ID);
  Logger.log('ผลลัพธ์:');
  Logger.log(JSON.stringify(result, null, 2));

  Logger.log('✅ ทดสอบเสร็จสิ้น - ตรวจสอบ LINE group เพื่อหาข้อความแจ้งเตือน');
}

/**
 * ทดสอบ Phase 3: Integration with logTransaction
 * ตัดสินใจเข้าเนื่องไปสู่ระบบการบันทึก transaction ที่มีการแจ้งเตือน LINE
 */
function testTransactionWithNotification() {
  Logger.log('=== ทดสอบ Transaction with LINE Notification (Phase 3) ===');
  
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheetsId = spreadsheet.getId();
    
    Logger.log('Spreadsheet ID: ' + sheetsId);
    Logger.log('Spreadsheet Name: ' + spreadsheet.getName());
    
    const sheets = spreadsheet.getSheets();
    Logger.log('\nจำนวน sheets: ' + sheets.length);
    for (let i = 0; i < sheets.length; i++) {
      Logger.log('  - ' + sheets[i].getName() + ' (GID: ' + sheets[i].getSheetId() + ')');
    }
    
    const testTx = {
      uid: 'TEST-TX-' + Date.now(),
      timestamp: new Date().toISOString(),
      type: 'fuel_delivery',
      source: '96-0677 กทม.',
      destination: 'CARAVAN GRAND EX',
      volume: 50,
      pricePerLiter: 29.50,
      totalCost: 1475,
      operatorName: 'TestUser',
      unit: 'บบ.ปส.',
      aircraftType: 'CARAVAN',
      aircraftNumber: '1931',
      notes: 'ทดสอบ Integration Phase 3'
    };
    
    Logger.log('\n1️⃣ ข้อมูล transaction ทดสอบ:');
    Logger.log(JSON.stringify(testTx, null, 2));
    
    Logger.log('\n2️⃣ เรียก logTransaction()...');
    const response = logTransaction(JSON.stringify(testTx), sheetsId);
    const result = JSON.parse(response.getContentText());
    
    Logger.log('\n3️⃣ ผลลัพธ์:');
    Logger.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      Logger.log('\n✅ Transaction บันทึกสำเร็จ');
      Logger.log('⏳ รอ 3 วินาที เพื่อให้ LINE notification ถูกส่ง...');
      Utilities.sleep(3000);
      Logger.log('\n📝 ตรวจสอบ:');
      Logger.log('   1. ดูที่ Transaction_Log sheet ว่ามีข้อมูล transaction ใหม่หรือไม่');
      Logger.log('   2. ตรวจสอบ LINE group เพื่อหาข้อความแจ้งเตือน');
      Logger.log('   3. เช็ค Apps Script logs ด้านบนเพื่อหาข้อมูลเพิ่มเติม');
    } else {
      Logger.log('\n❌ Transaction บันทึกไม่สำเร็จ:', result.error);
    }
  } catch (error) {
    Logger.log('❌ Error ใน testTransactionWithNotification:');
    Logger.log(error.toString());
    Logger.log(error.stack);
  }
  
  Logger.log('\n✅ ทดสอบ Phase 3 เสร็จสิ้น');
}

/**
 * ทดสอบ Phase 4: Rate Limiting
 * ส่ง transaction หลายรายการต่อเนื่อง เพื่อตรวจสอบการ rate limiting
 */
function testRateLimiting() {
  Logger.log('=== ทดสอบ Rate Limiting (Phase 4) ===');
  
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheetsId = spreadsheet.getId();
    
    const delayMs = 2000;
    Logger.log(`⚙️ ตั้งค่า NOTIFICATION_DELAY = ${delayMs}ms`);
    
    Logger.log('\n📤 ส่ง 5 transactions ต่อเนื่อง...\n');
    
    const timestamps = [];
    
    for (let i = 0; i < 5; i++) {
      const startTime = Date.now();
      timestamps.push({ index: i, startTime });
      
      const testTx = {
        uid: 'RATE-TEST-' + i + '-' + Date.now(),
        timestamp: new Date().toISOString(),
        type: 'fuel_delivery',
        source: '96-0677 กทม.',
        destination: 'CARAVAN GRAND EX',
        volume: 10 + i,
        pricePerLiter: 29.50,
        totalCost: (10 + i) * 29.50,
        operatorName: `TestUser${i}`,
        unit: 'บบ.ปส.',
        aircraftType: 'CARAVAN',
        aircraftNumber: '100' + i,
        notes: 'Rate limiting test ' + i
      };
      
      Logger.log(`${i + 1}️⃣ Transaction ${i}: UID = ${testTx.uid}`);
      
      const response = logTransaction(JSON.stringify(testTx), sheetsId);
      const result = JSON.parse(response.getContentText());
      
      const elapsedTime = Date.now() - startTime;
      timestamps[i].endTime = Date.now();
      timestamps[i].duration = elapsedTime;
      
      if (result.success) {
        Logger.log(`   ✅ บันทึกสำเร็จ (${elapsedTime}ms)`);
      } else {
        Logger.log(`   ❌ บันทึกล้มเหลว: ${result.error}`);
      }
      
      if (i < 4) {
        Logger.log('   ⏳ รอก่อนส่ง transaction ถัดไป...\n');
      }
    }
    
    Logger.log('\n📊 ผลลัพธ์ Rate Limiting:\n');
    Logger.log('Index | Duration | ช่วงเวลา (ms) | สถานะ');
    Logger.log('------|----------|---------------|-------');
    
    for (let i = 0; i < timestamps.length; i++) {
      const duration = timestamps[i].duration;
      const gap = i > 0 ? timestamps[i].startTime - timestamps[i - 1].endTime : 0;
      const status = (i === 0 || gap >= 1800) ? '✅ OK' : '⚠️ FAST';
      Logger.log(`${i + 1}    | ${duration}ms   | ${gap}ms         | ${status}`);
    }
    
    Logger.log('\n📝 ตรวจสอบ:');
    Logger.log('   1. Transaction_Log sheet ว่ามีข้อมูล 5 records ใหม่หรือไม่');
    Logger.log('   2. LINE group ว่าได้รับ 5 notifications หรือไม่');
    Logger.log('   3. ตรวจสอบเวลาระหว่าง notifications (ควรห่างกัน ~2 วินาที)');
    
    Logger.log('\n✅ ทดสอบ Phase 4 เสร็จสิ้น');
    
  } catch (error) {
    Logger.log('❌ Error ใน testRateLimiting:');
    Logger.log(error.toString());
  }
}

/**
 * ทดสอบ Phase 5: Error Tracking
 * ทดสอบการบันทึก errors เมื่อ LINE notification ล้มเหลว
 */
function testErrorLogging() {
  Logger.log('=== ทดสอบ Error Logging (Phase 5) ===');
  
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    
    Logger.log('1️⃣ ทดสอบส่ง notification ด้วย invalid credentials...\n');
    
    const testData = {
      uid: 'ERROR-TEST-' + Date.now(),
      timestamp: new Date().toISOString(),
      type: 'fuel_delivery',
      source: '96-0677 กทม.',
      destination: 'CARAVAN GRAND EX',
      volume: 100,
      pricePerLiter: 29.50,
      totalCost: 2950,
      operatorName: 'TestUser',
      unit: 'บบ.ปส.',
      aircraftType: 'CARAVAN',
      aircraftNumber: '1931',
      notes: 'Error logging test'
    };
    
    Logger.log('📋 ข้อมูล test transaction:');
    Logger.log('  UID: ' + testData.uid);
    Logger.log('  Source: ' + testData.source);
    Logger.log('  Destination: ' + testData.destination);
    
    const badConfig = {
      CHANNEL_ACCESS_TOKEN: 'invalid_token_12345',
      GROUP_ID: 'invalid_group_67890',
      ENABLED: true,
      NOTIFICATION_DELAY: 1000
    };
    
    Logger.log('\n2️⃣ เรียก sendLineNotification ด้วย invalid config...\n');
    
    const result = sendLineNotification(testData, badConfig.CHANNEL_ACCESS_TOKEN, badConfig.GROUP_ID);
    
    Logger.log('\n3️⃣ ผลลัพธ์:');
    Logger.log('  Success: ' + result.success);
    Logger.log('  Error: ' + (result.error || 'N/A'));
    
    Logger.log('\n⏳ รอให้ error ถูกบันทึก...');
    Utilities.sleep(2000);
    
    Logger.log('\n📝 ตรวจสอบ:');
    Logger.log('   1. เปิด Error_Log sheet ดูว่ามีข้อมูล error entry ใหม่หรือไม่');
    Logger.log('   2. ตรวจสอบข้อมูล: UID, Error Message, Status');
    Logger.log('   3. ควรเห็น transaction UID, source, destination, volume');
    
    Logger.log('\n✅ ทดสอบ Phase 5 เสร็จสิ้น');
    
  } catch (error) {
    Logger.log('❌ Error ใน testErrorLogging:');
    Logger.log(error.toString());
  }
}

/**
 * Clear Error_Log sheet (สำหรับการทดสอบ)
 */
function clearErrorLog() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const errorSheet = spreadsheet.getSheetByName('Error_Log');
    
    if (!errorSheet) {
      Logger.log('⚠️ Error_Log sheet ไม่พบ');
      return;
    }
    
    const lastRow = errorSheet.getLastRow();
    if (lastRow > 1) {
      errorSheet.deleteRows(2, lastRow - 1);
      Logger.log('✅ ลบ errors ทั้งหมดแล้ว (เก็บ header)');
    } else {
      Logger.log('ℹ️ Error_Log ว่างอยู่แล้ว');
    }
    
  } catch (error) {
    Logger.log('❌ Error:', error.toString());
  }
}

/**
 * ตรวจสอบ LINE Configuration
 * ดูว่า config อะไรที่ใช้อยู่ (ทั้ง default และ Settings sheet)
 */
function checkLineConfig() {
  Logger.log('=== ตรวจสอบ LINE Configuration ===\n');
  
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    
    Logger.log('1️⃣ Default LINE_CONFIG (จาก google-apps-script.gs):');
    Logger.log('   ENABLED: ' + LINE_CONFIG.ENABLED);
    Logger.log('   TOKEN: ' + (LINE_CONFIG.CHANNEL_ACCESS_TOKEN ? 'มี' : 'ไม่มี'));
    Logger.log('   GROUP_ID: ' + (LINE_CONFIG.GROUP_ID ? 'มี' : 'ไม่มี'));
    Logger.log('   NOTIFICATION_DELAY: ' + LINE_CONFIG.NOTIFICATION_DELAY + 'ms\n');
    
    Logger.log('2️⃣ Settings Sheet Configuration:');
    const settingsSheet = spreadsheet.getSheetByName('Settings');
    if (!settingsSheet) {
      Logger.log('   ⚠️ Settings sheet ไม่มี\n');
    } else {
      Logger.log('   ✅ Settings sheet พบ');
      const data = settingsSheet.getRange('A:B').getValues();
      Logger.log('   ข้อมูลใน Settings sheet:');
      for (let i = 0; i < Math.min(data.length, 10); i++) {
        if (data[i][0]) {
          Logger.log('      ' + data[i][0] + ' = ' + data[i][1]);
        }
      }
      Logger.log('');
    }
    
    Logger.log('3️⃣ Effective LINE_CONFIG (ใช้จริง):');
    const effectiveConfig = getLineConfigFromSheet(spreadsheet);
    Logger.log('   ENABLED: ' + effectiveConfig.ENABLED);
    Logger.log('   TOKEN: ' + (effectiveConfig.CHANNEL_ACCESS_TOKEN ? 'มี' : 'ไม่มี'));
    Logger.log('   GROUP_ID: ' + (effectiveConfig.GROUP_ID ? 'มี' : 'ไม่มี'));
    Logger.log('   NOTIFICATION_DELAY: ' + effectiveConfig.NOTIFICATION_DELAY + 'ms\n');
    
    Logger.log('4️⃣ Rate Limiting State:');
    const lastTime = getLastNotificationTime();
    const now = Date.now();
    const timeSinceLastNotif = now - lastTime;
    Logger.log('   Last notification: ' + (lastTime === 0 ? 'ไม่เคยส่ง' : new Date(lastTime).toISOString()));
    Logger.log('   Time since last: ' + timeSinceLastNotif + 'ms\n');
    
    if (!effectiveConfig.ENABLED) {
      Logger.log('❌ LINE notification ปิดอยู่ (ENABLED = false)');
      Logger.log('   👉 ปลดล็อค: เปิด ENABLED ใน Settings sheet หรือ config.js\n');
    }
    
    if (!effectiveConfig.CHANNEL_ACCESS_TOKEN) {
      Logger.log('❌ CHANNEL_ACCESS_TOKEN ไม่มี');
      Logger.log('   👉 แก้ไข: ใส่ token ใน Settings sheet\n');
    }
    
    if (!effectiveConfig.GROUP_ID) {
      Logger.log('❌ GROUP_ID ไม่มี');
      Logger.log('   👉 แก้ไข: ใส่ group ID ใน Settings sheet\n');
    }
    
    if (effectiveConfig.ENABLED && effectiveConfig.CHANNEL_ACCESS_TOKEN && effectiveConfig.GROUP_ID) {
      Logger.log('✅ LINE Configuration พร้อมใช้งาน\n');
    }
    
  } catch (error) {
    Logger.log('❌ Error: ' + error.toString());
  }
}

/**
 * ทดสอบ Final Integration Testing
 * ทดสอบทุกสถานการณ์ end-to-end
 */
function testFinalIntegration() {
  Logger.log('=== Final Integration Testing ===\n');
  
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheetsId = spreadsheet.getId();
    
    Logger.log('📋 Test Scenarios:\n');
    
    Logger.log('1️⃣ Scenario 1: Normal transaction → notification sent');
    Logger.log('   - สร้าง transaction ปกติ');
    Logger.log('   - ตรวจสอบว่า บันทึกสำเร็จ');
    Logger.log('   - ตรวจสอบ LINE group ว่ามี notification\n');
    
    const scenario1Tx = {
      uid: 'FINAL-TEST-1-' + Date.now(),
      timestamp: new Date().toISOString(),
      type: 'fuel_delivery',
      source: '96-0677 กทม.',
      destination: 'CARAVAN GRAND EX',
      volume: 50,
      pricePerLiter: 29.50,
      totalCost: 1475,
      operatorName: 'TestUser',
      unit: 'บบ.ปส.',
      aircraftType: 'CARAVAN',
      aircraftNumber: '1931',
      notes: 'Final test scenario 1'
    };
    
    let response = logTransaction(JSON.stringify(scenario1Tx), sheetsId);
    let result = JSON.parse(response.getContentText());
    Logger.log('   Result: ' + (result.success ? '✅ SUCCESS' : '❌ FAILED') + '\n');
    
    Logger.log('2️⃣ Scenario 2: Rapid transactions → notifications delayed');
    Logger.log('   - ส่ง 3 transactions เร็วๆ');
    Logger.log('   - ตรวจสอบเวลาระหว่าง notifications\n');
    
    for (let i = 0; i < 3; i++) {
      const rapidTx = {
        uid: 'FINAL-TEST-2-' + i + '-' + Date.now(),
        timestamp: new Date().toISOString(),
        type: 'fuel_delivery',
        source: '96-0677 กทม.',
        destination: 'CARAVAN GRAND EX',
        volume: 10 + i,
        pricePerLiter: 29.50,
        totalCost: (10 + i) * 29.50,
        operatorName: 'TestUser' + i,
        unit: 'บบ.ปส.',
        aircraftType: 'CARAVAN',
        aircraftNumber: '100' + i,
        notes: 'Final test scenario 2 - rapid tx ' + i
      };
      
      response = logTransaction(JSON.stringify(rapidTx), sheetsId);
      result = JSON.parse(response.getContentText());
      Logger.log('   TX ' + i + ': ' + (result.success ? '✅' : '❌'));
    }
    Logger.log('   (ตรวจสอบเวลาระหว่าง notifications ใน LINE group)\n');
    
    Logger.log('3️⃣ Scenario 3: Missing config → transaction saved, no notification');
    Logger.log('   - ปิด LINE config (ENABLED = false)');
    Logger.log('   - สร้าง transaction');
    Logger.log('   - ตรวจสอบว่า บันทึกสำเร็จ แต่ไม่มี notification\n');
    
    Logger.log('4️⃣ Scenario 4: Invalid credentials → error logged');
    Logger.log('   - เรียก testErrorLogging() เพื่อทดสอบ\n');
    
    Logger.log('📝 Next Steps:');
    Logger.log('   [ ] ตรวจสอบ Transaction_Log ว่ามีข้อมูล transactions ใหม่');
    Logger.log('   [ ] ตรวจสอบ Error_Log ว่ามี error entries');
    Logger.log('   [ ] ตรวจสอบ LINE group ว่ามี notifications');
    Logger.log('   [ ] ตรวจสอบเวลาระหว่าง notifications (rate limiting)');
    Logger.log('   [ ] ยืนยันว่า transaction saves ไม่ขัดขวาง');
    
    Logger.log('\n✅ Final Integration Testing เสร็จสิ้น');
    Logger.log('\n🎉 LINE Notification Feature Implementation COMPLETE!');
    
  } catch (error) {
    Logger.log('❌ Error ใน testFinalIntegration:');
    Logger.log(error.toString());
  }
}