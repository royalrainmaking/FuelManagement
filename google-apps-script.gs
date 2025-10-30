/**
 * Google Apps Script สำหรับระบบจัดการน้ำมัน
 * รองรับการดึงข้อมูลจาก Google Sheets ตาม URL ที่กำหนด
 */

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
function logTransaction(dataString, sheetsId) {
  try {
    const transactionData = JSON.parse(dataString);
    
    const spreadsheet = SpreadsheetApp.openById(sheetsId);
    
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
      transactionData.uid || '',           // คอลัมน์ A: UID
      dateStr,                             // คอลัมน์ B: วันที่
      timeStr,                             // คอลัมน์ C: เวลา
      transactionData.type || '',          // คอลัมน์ D: ประเภท
      transactionData.source || '',        // คอลัมน์ E: แหล่งที่มา
      transactionData.destination || '',   // คอลัมน์ F: ปลายทาง
      transactionData.volume || 0,         // คอลัมน์ G: จำนวน(ลิตร)
      transactionData.pricePerLiter || 0,  // คอลัมน์ H: ราคาต่อลิตร
      transactionData.totalCost || 0,      // คอลัมน์ I: ยอดรวม
      transactionData.operatorName || '',  // คอลัมน์ J: ผู้ปฏิบัติงาน
      transactionData.unit || '',          // คอลัมน์ K: หน่วย
      transactionData.aircraftType || '',  // คอลัมน์ L: ประเภทอากาศยาน
      transactionData.aircraftNumber || '',// คอลัมน์ M: เลขทะเบียน
      transactionData.notes || '',         // คอลัมน์ N: หมายเหตุ
      transactionData.bookNo || '',        // คอลัมน์ O: Book No.
      transactionData.receiptNo || ''      // คอลัมน์ P: Receipt No.
    ]);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'บันทึก transaction สำเร็จ'
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error in logTransaction:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
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
    'id': 'id'
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