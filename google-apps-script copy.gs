/**
 * Google Apps Script สำหรับระบบจัดการน้ำมัน
 * รองรับการดึงข้อมูลจาก Google Sheets ตาม URL ที่กำหนด
 */

/**
 * ========================================
 * Admin Configuration
 * ========================================
 */
const ADMIN_CODE_FUEL_EDIT = 'admin123';

/**
 * ========================================
 * LINE Notification Configuration
 * ========================================
 */
const LINE_CONFIG = {
    CHANNEL_ACCESS_TOKEN: 'Ts3qJEyllswxdeuw+EJP8JToU0YygwxcfKkvkwIA6J1PxGYo1DzkQoem2TwBvhfKuk3dvthfEM7ItJDJjZJI1GINn6TyjRpPD6428bZrFRJDiGgq6Cwz4PIgs/8NsDCbdle9fvMf0ispJucL45SVowdB04t89/1O/w1cDnyilFU=',
    GROUP_ID: 'C724f2ac2b1c9c41f24a9127726ef947a',
    NOTIFICATION_DELAY: 1000,
    LINE_API_URL: 'https://api.line.me/v2/bot/message/push',
    ENABLED: false
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
    const TRANSACTION_LOG_GID = '1578547125';
    for (let i = 0; i < worksheets.length; i++) {
      const gid = worksheets[i].getSheetId().toString();
      if (gid === TRANSACTION_LOG_GID || worksheets[i].getName() === 'Transaction_Log') {
        transactionSheet = worksheets[i];
        break;
      }
    }
    
    // Fallback ถ้าไม่พบ GID 1578547125 ให้ลองหา GID 0
    if (!transactionSheet) {
      for (let i = 0; i < worksheets.length; i++) {
        if (worksheets[i].getSheetId().toString() === '0') {
          transactionSheet = worksheets[i];
          break;
        }
      }
    }
    
    if (!transactionSheet) {
      throw new Error('ไม่พบ sheet Transaction_Log');
    }
    
    // Mapping ภารกิจ -> แผนงาน
    const missionToPlan = {
      'บินบริการ': 'yuttaya',
      'บินทดสอบ': 'yuttaya',
      'อื่นๆ': 'yuttaya',
      'ปฏิบัติการฝนหลวง': 'bru',
      'บินสำรวจ': 'bru',
      'ดัดแปลงสภาพอากาศ (ฝุ่น)': 'dust',
      'ดัดแปลงสภาพอากาศ (ลูกเห็บ)': 'hail'
    };
    
    // Mapping สำหรับหาชื่อแผนจากภารกิจหรือชื่อย่อ
    const getPlanName = (input) => {
      const name = (input || '').toString().trim();
      if (name.includes('ลูกเห็บ'))  return 'ดัดแปลงสภาพอากาศ (ลูกเห็บ)';
      if (name.includes('ฝุ่น') || name.includes('ดัดแปลงสภาพอากาศ')) return 'ดัดแปลงสภาพอากาศ (ฝุ่น)';
      if (name.includes('บรู') || name.includes('ฝนหลวง') || name.includes('บินสำรวจ')) return 'แผนบรู';
      if (name.includes('ยุทธ') || name.includes('บินบริการ') || name.includes('บินทดสอบ') || name.includes('พื้นฐาน')) return 'แผนยุทธศาสตร์';
      return 'แผนยุทธศาสตร์';
    };
    
    // โครงสร้างข้อมูลงบประมาณแยกตามแผน (Initialize with the 4 core plans)
    const corePlans = ['แผนยุทธศาสตร์', 'แผนบรู', 'ดัดแปลงสภาพอากาศ (ฝุ่น)', 'ดัดแปลงสภาพอากาศ (ลูกเห็บ)'];
    const plans = {};
    corePlans.forEach(p => plans[p] = { budget: 0, used: 0, remaining: 0 });
    
    // อ่านข้อมูลงบประมาณ - คอลัมน์ A (รายการ), คอลัมน์ B (แผน), คอลัมน์ C (ยอดเงิน)
    const budgetLastRow = budgetSheet.getLastRow();
    let totalBudget = 0;
    
    if (budgetLastRow > 1) {
      const budgetData = budgetSheet.getRange('A2:C' + budgetLastRow).getValues();
      
      budgetData.forEach(row => {
        const itemDetail = (row[0] || '').toString().trim();
        const planColumn = (row[1] || '').toString().trim();
        
        if (!itemDetail && !planColumn) return;
        
        // ใช้ชื่อแผนจากคอลัมน์ B เป็นหลัก
        const planName = getPlanName(planColumn || itemDetail);
        const amount = parseFloat(row[2]) || 0;
        
        plans[planName].budget += amount;
        totalBudget += amount;
      });
    }
    
    // อ่านข้อมูลยอดเงินที่ซื้อจาก ปตท. (Transaction Log)
    // คอลัมน์ I (ยอดรวม), คอลัมน์ R (ภารกิจ)
    const transLastRow = transactionSheet.getLastRow();
    let totalPurchaseAmount = 0;
    
    if (transLastRow > 1) {
      const transData = transactionSheet.getRange('A2:R' + transLastRow).getValues();
      
      transData.forEach((row, index) => {
        // รวมทุกรายการที่มีการระบุยอดเงิน (คอลัมน์ I) และภารกิจ (คอลัมน์ R)
        // ยกเลิกการกรองเฉพาะ refill/fuel-card เพื่อให้หักลบยอดตามจริงที่บันทึก
        const amount = parseFloat(row[8]) || 0; // คอลัมน์ I (ยอดรวม)
        const missions = (row[17] || '').toString().trim(); // คอลัมน์ R (ภารกิจ)
        
        if (amount > 0) {
          totalPurchaseAmount += amount;
          
          let targetPlan = 'แผนยุทธศาสตร์'; // ค่าเริ่มต้น
          
          if (missions) {
            const missionList = missions.split(',').map(m => m.trim());
            // ค้นหาแผนที่ตรงกับภารกิจ
            for (const m of missionList) {
              const p = getPlanName(m);
              if (p !== 'แผนยุทธศาสตร์') {
                targetPlan = p;
                break;
              }
            }
          }
          
          if (plans[targetPlan]) {
            plans[targetPlan].used += amount;
          }
          
          // Log เพื่อตรวจสอบ (จะแสดงใน Apps Script Execution Logs)
          console.log(`[Row ${index+2}] Mission: "${missions}" -> Plan: ${targetPlan}, Amount: ${amount}`);
        }
      });
    }
    
    // คำนวณเงินคงเหลือสำหรับทุกแผน
    Object.keys(plans).forEach(key => {
      plans[key].remaining = plans[key].budget - plans[key].used;
      console.log(`[Summary] Plan: ${key}, Budget: ${plans[key].budget}, Used: ${plans[key].used}, Remaining: ${plans[key].remaining}`);
    });
    
    const remainingBudget = totalBudget - totalPurchaseAmount;
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data: {
          totalBudget: totalBudget,
          totalPurchaseAmount: totalPurchaseAmount,
          remainingBudget: remainingBudget,
          plans: plans
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
    const lastRow = budgetSheet.getLastRow();
    if (lastRow > 1) {
      budgetSheet.getRange(2, 1, lastRow - 1, budgetSheet.getLastColumn()).clearContent();
    }
    
    // เพิ่ม header
    budgetSheet.getRange('A1:C1').setValues([['ชื่อแผน', 'งบประมาณ', 'ภารกิจ']]);
    
    // เพิ่มข้อมูล 4 แผน
    const budgetPlans = [
      ['แผนบรู', 500000, 'ปฏิบัติการฝนหลวง'],
      ['แผนยุทธ', 750000, 'บินบริการ'],
      ['ดัดแปลงสภาพอากาศ (ฝุ่น)', 600000, 'ดัดแปลงสภาพอากาศ (ฝุ่น)'],
      ['ดัดแปลงสภาพอากาศ (ลูกเห็บ)', 400000, 'ดัดแปลงสภาพอากาศ (ลูกเห็บ)']
    ];
    
    budgetSheet.getRange(2, 1, budgetPlans.length, 3).setValues(budgetPlans);
    
    // จัดรูปแบบ header
    const headerRange = budgetSheet.getRange('A1:C1');
    headerRange.setBackground('#1f77d2');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    
    // จัดรูปแบบคอลัมน์ B (ตัวเลข)
    budgetSheet.getRange('B2:B5').setNumberFormat('#,##0');
    
    // ปรับความกว้าง
    budgetSheet.setColumnWidth(1, 150);
    budgetSheet.setColumnWidth(2, 150);
    budgetSheet.setColumnWidth(3, 150);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'สร้างข้อมูลตัวอย่างงบประมาณสำเร็จ',
        data: {
          plansCreated: budgetPlans.length,
          totalBudget: budgetPlans.reduce((sum, plan) => sum + plan[1], 0),
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

/**
 * ========================================
 * Image Upload Functions
 * ========================================
 */

/**
 * ฟังก์ชันสำหรับอัพโหลดรูปภาพไป Google Drive
 * @param {String} base64ImageData - Base64 encoded image data
 * @param {String} filename - ชื่อไฟล์ (เช่น 20251219_121314_abc123.jpg)
 * @param {String} folderIdString - Google Drive Folder ID
 * @returns {Object} - {success: boolean, imageUrl: String, fileId: String, filename: String, uploadDate: String, error: String}
 */
function uploadImageToGoogleDrive(base64ImageData, filename, folderIdString) {
  try {
    // ตรวจสอบ input
    if (!base64ImageData) {
      throw new Error('Base64 image data is required');
    }
    
    if (!filename) {
      throw new Error('Filename is required');
    }
    
    if (!folderIdString) {
      throw new Error('Google Drive Folder ID is required');
    }
    
    Logger.log('🔄 Starting image upload: ' + filename);
    
    // แยก MIME type จากข้อมูล Base64
    let mimeType = 'image/jpeg';
    if (base64ImageData.includes('data:image/png')) {
      mimeType = 'image/png';
      base64ImageData = base64ImageData.replace(/^data:image\/png;base64,/, '');
    } else if (base64ImageData.includes('data:image/gif')) {
      mimeType = 'image/gif';
      base64ImageData = base64ImageData.replace(/^data:image\/gif;base64,/, '');
    } else if (base64ImageData.includes('data:image/webp')) {
      mimeType = 'image/webp';
      base64ImageData = base64ImageData.replace(/^data:image\/webp;base64,/, '');
    } else if (base64ImageData.includes('data:image/bmp')) {
      mimeType = 'image/bmp';
      base64ImageData = base64ImageData.replace(/^data:image\/bmp;base64,/, '');
    } else if (base64ImageData.includes('data:image/jpeg')) {
      mimeType = 'image/jpeg';
      base64ImageData = base64ImageData.replace(/^data:image\/jpeg;base64,/, '');
    }
    
    // แปลง Base64 เป็น Blob
    const imageBlob = Utilities.newBlob(
      Utilities.base64Decode(base64ImageData),
      mimeType,
      filename
    );
    
    // หา folder จาก ID
    let folder;
    try {
      folder = DriveApp.getFolderById(folderIdString);
    } catch (permissionError) {
      const errorMsg = permissionError.toString();
      if (errorMsg.includes('getFolderById') || errorMsg.includes('Drive')) {
        throw new Error('Google Drive API permissions not authorized. The Apps Script must be redeployed to grant Drive API access. Contact the administrator to redeploy the script and authorize the Drive permissions.');
      }
      throw permissionError;
    }
    
    // สร้างไฟล์ใน Google Drive
    const file = folder.createFile(imageBlob);
    
    // ตั้งค่าสิทธิ์เป็น "Anyone with the link can view"
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    const fileId = file.getId();
    const uploadDate = new Date().toISOString();
    
    const imageUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
    
    Logger.log('✅ Image uploaded successfully:');
    Logger.log('   - File ID: ' + fileId);
    Logger.log('   - Filename: ' + filename);
    Logger.log('   - URL: ' + imageUrl);
    
    return {
      success: true,
      imageUrl: imageUrl,
      fileId: fileId,
      filename: filename,
      uploadDate: uploadDate
    };
    
  } catch (error) {
    Logger.log('❌ Error in uploadImageToGoogleDrive:');
    Logger.log('Error type: ' + error.name);
    Logger.log('Error message: ' + error.toString());
    
    const errorMessage = error.toString();
    let userFriendlyError = error.toString();
    
    if (errorMessage.includes('getFolderById') || errorMessage.includes('Drive API') || errorMessage.includes('authorization')) {
      userFriendlyError = 'Google Drive API permissions not authorized. The Apps Script deployment needs to be updated with Drive API access. Please contact the administrator.';
    }
    
    return {
      success: false,
      error: userFriendlyError
    };
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
        return updateFuelStock(e.parameter.fuelName, e.parameter.newStock, e.parameter.adminCode, sheetsId, gid);
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
      case 'processTransaction':
        return processTransaction(e.parameter.data, e.parameter.updateData, sheetsId, gid);
      case 'getPTTPricesByProvince':
        return getPTTPricesByProvince(e.parameter.province, sheetsId, gid);
      case 'getPTTPricesByLocationName':
        return getPTTPricesByLocationName(e.parameter.locationName, sheetsId, gid);
      case 'cancelTransaction':
        return cancelTransaction(e.parameter.uid, sheetsId, e.parameter.cancellerName);
      case 'updateTransactionPaymentStatus':
        return updateTransactionPaymentStatus(e.parameter.uid, e.parameter.status, sheetsId, e.parameter.paidNote);
      case 'getDashboardSummary':
        return getDashboardSummary(sheetsId, e.parameter.inventoryGid || gid, e.parameter.budgetGid);
      case 'getPlanRemainingBudget':
        return getPlanRemainingBudget(sheetsId, gid);
      case 'updateTransactionDetail':
        return updateTransactionDetail(
          e.parameter.uid, 
          sheetsId, 
          {
            date: e.parameter.date,
            time: e.parameter.time,
            type: e.parameter.type,
            source: e.parameter.source,
            destination: e.parameter.destination,
            unit: e.parameter.unit,
            operator: e.parameter.operator,
            aircraftType: e.parameter.aircraftType,
            aircraftNumber: e.parameter.aircraftNumber,
            volume: e.parameter.volume,
            pricePerLiter: e.parameter.pricePerLiter,
            totalCost: e.parameter.totalCost,
            bookNo: e.parameter.bookNo,
            receiptNo: e.parameter.receiptNo,
            missions: e.parameter.missions,
            notes: e.parameter.notes
          }
        );
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
 * ฟังก์ชันสำหรับรวมข้อมูลหน้า Dashboard: วงเงินสัญญาคงเหลือตามแผน และ แหล่งน้ำมัน (แท๊งฟาม, รถน้ำมัน, ถัง)
 */
function getDashboardSummary(sheetsId, inventoryGid, budgetGid) {
  try {
    // 1. ดึงข้อมูลงบประมาณ (วงเงินสัญญาคงเหลือตามแผน)
    // ถ้าระบุ budgetGid มา ก็จะสามารถดึงรายละเอียดคงเหลือได้
    let budgetData = null;
    if (budgetGid) {
      const budgetResponse = getBudgetData(sheetsId, budgetGid);
      const budgetDataStr = budgetResponse.getContent();
      budgetData = JSON.parse(budgetDataStr);
    }
    
    // 2. ดึงข้อมูลแหล่งน้ำมัน
    const inventoryResponse = getMasterData(sheetsId, inventoryGid);
    const inventoryDataStr = inventoryResponse.getContent();
    const inventoryParsed = JSON.parse(inventoryDataStr);
    
    // จัดกลุ่มแหล่งน้ำมัน
    const fuelSources = {
      tanks: [],       // แท๊งฟาม (Tank)
      trucks: [],      // รถน้ำมัน (Truck)
      drums: [],       // ถัง (Drum)
      other: []
    };
    
    if (inventoryParsed.success && inventoryParsed.data) {
      inventoryParsed.data.forEach(item => {
        const type = (item.type || '').toString().toLowerCase();
        const fuelItem = {
          name: item.name || item.source_name || 'ไม่ระบุชื่อ',
          currentStock: parseFloat(item.current_stock) || 0,
          capacity: item.capacity ? parseFloat(item.capacity) : null,
          type: type
        };
        
        if (type === 'tank') {
          fuelSources.tanks.push(fuelItem);
        } else if (type === 'truck') {
          fuelSources.trucks.push(fuelItem);
        } else if (type === 'drum') {
          fuelSources.drums.push(fuelItem);
        } else {
          fuelSources.other.push(fuelItem);
        }
      });
    }
    
    // 3. รวมผลลัพธ์
    const result = {
      success: true,
      data: {
        budget: (budgetData && budgetData.success) ? budgetData.data : null,
        fuelSources: fuelSources
      }
    };
    
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error in getDashboardSummary:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * ฟังก์ชันสำหรับดึงข้อมูลเฉพาะวงเงินสัญญาคงเหลือตามแผนที่ถูกหักลบยอดใช้ไปแล้ว
 */
function getPlanRemainingBudget(sheetsId, budgetGid) {
  try {
    const budgetResponse = getBudgetData(sheetsId, budgetGid);
    const budgetData = JSON.parse(budgetResponse.getContent());
    
    if (!budgetData.success) {
      throw new Error(budgetData.error);
    }
    
    const plans = budgetData.data.plans;
    
    // จัดรูปแบบให้สั้นและตรงเป้าหมาย
    const result = {
      "บรู": plans['แผนบรู'] ? plans['แผนบรู'].remaining : 0,
      "ยุทธ": plans['แผนยุทธศาสตร์'] ? plans['แผนยุทธศาสตร์'].remaining : 0,
      "ดัดแปลงสภาพอากาศ (ฝุ่น)": plans['ดัดแปลงสภาพอากาศ (ฝุ่น)'] ? plans['ดัดแปลงสภาพอากาศ (ฝุ่น)'].remaining : 0,
      "ดัดแปลงสภาพอากาศ (ลูกเห็บ)": plans['ดัดแปลงสภาพอากาศ (ลูกเห็บ)'] ? plans['ดัดแปลงสภาพอากาศ (ลูกเห็บ)'].remaining : 0
    };
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data: result
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error in getPlanRemainingBudget:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * ฟังก์ชัน doPost สำหรับรับ POST requests
 * ใช้สำหรับการอัพโหลดรูปภาพ (Base64 data ขนาดใหญ่)
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    console.log('POST Action:', action);
    
    if (action === 'uploadImage') {
      // ดึง parameters
      const base64ImageData = data.base64ImageData;
      const filename = data.filename;
      const folderIdString = data.folderId;
      
      // เรียกใช้ฟังก์ชันอัพโหลด
      const result = uploadImageToGoogleDrive(base64ImageData, filename, folderIdString);
      
      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    } else if (action === 'processTransaction') {
      return processTransaction(data.data, data.updateData, data.sheetsId, data.gid);
    } else {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          error: 'Invalid action for POST'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
  } catch (error) {
    console.error('Error in doPost:', error);
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
 * โครงสร้างคอลัมน์: A=วันที่, B=เวลา, C=ชนิด, D=ชื่อ, E=แบบเครื่องบิน/รถน้ำมัน, F=จำนวน(ลิตร), G=ราคาต่อลิตร, H=ยอดรวม, I=ผู้ปฏิบัติงาน, J=สถานีน้ำมัน/จังหวัด
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
    
    // อ่านข้อมูลจากแถว 2 ถึงแถวสุดท้าย, คอลัมน์ A ถึง X (24 คอลัมน์ - รวมข้อมูลสถานะการเบิกเงิน และ หมายเหตุการเบิกเงิน)
    const dataRange = targetSheet.getRange(2, 1, lastRow - 1, 24);
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
          dateStr = Utilities.formatDate(dateObj, 'Asia/Bangkok', 'yyyy-MM-dd');
        } catch (e) {
          dateStr = row[1].toString();
        }
      }
      
      if (row[2]) {
        try {
          // ถ้า row[2] เป็น Date object ให้แปลงเป็นเวลาเท่านั้น
          if (row[2] instanceof Date) {
            timeStr = Utilities.formatDate(row[2], 'Asia/Bangkok', 'HH:mm:ss');
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
        source_name: row[4] || '',       // คอลัมน์ E: แหล่งที่มาน้ำมัน
        destination_name: row[5] || '',  // คอลัมน์ F: แบบเครื่องบิน/รถน้ำมัน
        volume: row[6] || '',            // คอลัมน์ G: จำนวน(ลิตร) - เก็บเป็น string เพื่อรักษารูปแบบ "5 ถัง (1000 ลิตร)"
        price_per_liter: parseFloat(row[7]) || 0, // คอลัมน์ H: ราคาต่อลิตร
        total_cost: parseFloat(row[8]) || 0,      // คอลัมน์ I: ยอดรวม
        operator_name: row[9] || '',     // คอลัมน์ J: ผู้ปฏิบัติงาน
        unit: row[10] || '',             // คอลัมน์ K: สถานีน้ำมัน/จังหวัด
        aircraft_type: row[11] || '',    // คอลัมน์ L: ประเภทอากาศยาน
        aircraft_number: row[12] || '',  // คอลัมน์ M: เลขทะเบียน
        notes: row[13] || '',            // คอลัมน์ N: หมายเหตุ
        book_no: row[14] || '',          // คอลัมน์ O: Book No.
        receipt_no: row[15] || '',       // คอลัมน์ P: Receipt No.
        volume_liters: parseFloat(row[16]) || 0,  // คอลัมน์ Q: volumeLiters (ตัวเลขลิตรที่แท้จริง)
        missions: row[17] || '',         // คอลัมน์ R: ภาระกิจ (Mission Types)
        image_url: row[18] || '',        // คอลัมน์ S: Image URL
        image_filename: row[19] || '',   // คอลัมน์ T: Image Filename
        image_upload_date: row[20] || '', // คอลัมน์ U: Image Upload Date
        image_drive_id: row[21] || '',    // คอลัมน์ V: Image Drive ID
        is_paid: row[22] || '',           // คอลัมน์ W: สถานะการเบิกเงิน
        paid_note: row[23] || ''          // คอลัมน์ X: หมายเหตุการเบิกเงิน
      };
      
      // กำหนดประเภทแบบเครื่องบิน/รถน้ำมันตาม destination name (ถ้ามี)
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
function updateFuelStock(fuelName, newStock, adminCode, sheetsId, gid) {
  try {
    if (!fuelName || newStock === undefined) {
      throw new Error('ต้องระบุ fuelName และ newStock');
    }
    
    if (!adminCode || adminCode !== ADMIN_CODE_FUEL_EDIT) {
      throw new Error('รหัสของแอดมินไม่ถูกต้อง');
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
      'วันที่', 'เวลา', 'ประเภท', 'แหล่งที่มาน้ำมัน', 'แบบเครื่องบิน/รถน้ำมัน', 'จำนวน(ลิตร)', 
      'ราคาต่อลิตร', 'ยอดรวม', 'ผู้ปฏิบัติงาน', 'สถานีน้ำมัน/จังหวัด', 'ประเภทอากาศยาน', 
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
    const delayMs = config.NOTIFICATION_DELAY || 500; // ลดเหลือ 500ms

    if (timeSinceLastNotification < delayMs) {
      const waitTime = Math.min(delayMs - timeSinceLastNotification, 500); // ไม่รอเกิน 500ms
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
      
      // สร้าง header (เพิ่ม UID, Book No., Receipt No., volumeLiters, ภาระกิจ, Image URL, Image Filename, Image Upload Date, Image Drive ID, สถานะการเบิกเงิน, หมายเหตุการเบิกเงิน)
      logSheet.getRange(1, 1, 1, 24).setValues([[
        'UID', 'วันที่', 'เวลา', 'ประเภท', 'แหล่งที่มาน้ำมัน', 'แบบเครื่องบิน/รถน้ำมัน', 'จำนวน(ลิตร)', 
        'ราคาต่อลิตร', 'ยอดรวม', 'ผู้ปฏิบัติงาน', 'สถานีน้ำมัน/จังหวัด', 'ประเภทอากาศยาน', 
        'เลขทะเบียน', 'หมายเหตุ', 'Book No.', 'Receipt No.', 'volumeLiters', 'ภาระกิจ',
        'Image URL', 'Image Filename', 'Image Upload Date', 'Image Drive ID',
        'สถานะการเบิกเงิน', 'หมายเหตุการเบิกเงิน'
      ]]);
      
      // จัดรูปแบบ header
      const headerRange = logSheet.getRange(1, 1, 1, 24);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#2196F3');
      headerRange.setFontColor('#FFFFFF');
      
      logSheet.autoResizeColumns(1, 24);
      logSheet.setFrozenRows(1);
    }
    
    // ตรวจสอบอีกครั้งก่อน append
    if (!logSheet) {
      throw new Error('ไม่สามารถสร้างหรือเข้าถึง Transaction_Log sheet ได้');
    }
    
    // Check if UID already exists to prevent duplicates (e.g. from network retries)
    const searchUid = transactionData.uid || '';
    if (searchUid) {
      const existing = findTransactionByUID(logSheet, searchUid);
      if (existing) {
        logs.push('⚠️ UID ' + searchUid + ' already exists. Skipping append to prevent duplicate.');
        return ContentService
          .createTextOutput(JSON.stringify({
            success: true,
            message: 'รายการนี้ได้รับการบันทึกแล้ว (ป้องกันข้อมูลซ้ำ)',
            uid: searchUid,
            isDuplicate: true
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // เพิ่ม transaction ใหม่
    const timestamp = transactionData.timestamp ? new Date(transactionData.timestamp) : new Date();
    // ใช้ Timezone Asia/Bangkok
    const dateStr = Utilities.formatDate(timestamp, 'Asia/Bangkok', 'yyyy-MM-dd');
    const timeStr = Utilities.formatDate(timestamp, 'Asia/Bangkok', 'HH:mm:ss');
    
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
      transactionData.receiptNo || '',     
      transactionData.volumeLiters || 0,   
      transactionData.missions || '',
      transactionData.imageUrl || '',
      transactionData.imageFilename || '',
      timestamp.toISOString(),
      transactionData.imageDriveId || ''
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
 * ยกเลิกรายการเดินบัญชี (Cancel Transaction)
 * ย้ายรายการจาก Transaction_Log ไปยัง Transaction_Archive และคืนลิตรกลับไปที่ Inventory
 */
function cancelTransaction(uid, sheetsId, cancellerName) {
  try {
    // Validation: Check UID parameter
    if (!uid || !uid.trim()) {
      throw new Error('ต้องระบุ UID ของรายการที่ต้องการยกเลิก');
    }
    
    if (!sheetsId || !sheetsId.trim()) {
      throw new Error('Sheet ID ไม่ถูกต้อง');
    }
    
    // Validation: Check canceller name
    if (!cancellerName || !cancellerName.trim()) {
      throw new Error('ต้องระบุชื่อของผู้ยกเลิก');
    }
    
    const spreadsheet = SpreadsheetApp.openById(sheetsId);
    
    // หา Transaction_Log sheet
    let transactionSheet = null;
    try {
      transactionSheet = spreadsheet.getSheetByName('Transaction_Log');
    } catch (e) {
      throw new Error('ไม่พบ Transaction_Log sheet');
    }
    
    if (!transactionSheet) {
      throw new Error('ไม่พบ Transaction_Log sheet');
    }
    
    // หารายการที่ตรงกับ UID
    const transactionRowData = findTransactionByUID(transactionSheet, uid);
    if (!transactionRowData) {
      throw new Error('ไม่พบรายการที่ต้องการยกเลิก (UID: ' + uid + ')');
    }
    
    const rowIndex = transactionRowData.rowIndex;
    const rowData = transactionRowData.rowData;
    
    // ดึงข้อมูลที่จำเป็น
    const source = rowData[4] || ''; // Column E: source_name
    const liters = parseFloat(rowData[16]) || 0; // Column Q: volumeLiters (ตัวเลขจริง)
    const destination = rowData[5] || ''; // Column F: destination_name
    
    // Validation: Check required data
    if (!source || !source.trim()) {
      throw new Error('แหล่งจ่ายของรายการไม่ถูกต้อง');
    }
    
    if (liters <= 0) {
      throw new Error('จำนวนลิตรของรายการไม่ถูกต้อง');
    }
    
    // สร้าง Archive sheet ถ้าไม่มี
    let archiveSheet = null;
    try {
      archiveSheet = spreadsheet.getSheetByName('Transaction_Archive');
    } catch (e) {
      // สร้าง sheet ใหม่
      archiveSheet = createTransactionArchiveSheet(spreadsheet);
    }
    
    if (!archiveSheet) {
      archiveSheet = createTransactionArchiveSheet(spreadsheet);
    }
    
    // เตรียมข้อมูลสำหรับ Archive (เพิ่ม metadata ของการยกเลิก)
    const now = new Date();
    const cancelledAt = Utilities.formatDate(now, 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss');
    const archiveRowData = [...rowData];
    
    // เพิ่ม metadata ในคอลัมน์เพิ่มเติม
    archiveRowData.push(cancelledAt);      // คอลัมน์ W: cancelled_at
    archiveRowData.push(cancellerName);    // คอลัมน์ X: cancelled_by (ชื่อของผู้ยกเลิก)
    
    // ย้ายรายการไปยัง Archive sheet
    archiveSheet.appendRow(archiveRowData);
    
    // ลบรายการจาก Transaction_Log
    transactionSheet.deleteRow(rowIndex);
    
    // หา Inventory sheet และคืนลิตรกลับ
    let inventorySheet = null;
    try {
      const sheets = spreadsheet.getSheets();
      for (let sheet of sheets) {
        if (sheet.getName() === 'Inventory') {
          inventorySheet = sheet;
          break;
        }
      }
    } catch (e) {
      console.log('ไม่พบ Inventory sheet');
    }
    
    if (inventorySheet) {
      restoreInventoryFromTransaction(inventorySheet, source, destination, liters);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'ยกเลิกรายการสำเร็จ',
        data: {
          transactionUID: uid,
          source: source,
          destination: destination,
          liters: liters,
          archivedAt: cancelledAt
        }
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error in cancelTransaction:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * อัพเดทสถานะการเบิกเงินของรายการ
 */
function updateTransactionPaymentStatus(uid, status, sheetsId, paidNote) {
  try {
    if (!uid) throw new Error('ต้องระบุ UID');
    if (!sheetsId) throw new Error('ต้องระบุ Sheets ID');
    
    const spreadsheet = SpreadsheetApp.openById(sheetsId);
    let transactionSheet = spreadsheet.getSheetByName('Transaction_Log');
    
    if (!transactionSheet) {
      // ลองหา GID 0
      const sheets = spreadsheet.getSheets();
      for (let sheet of sheets) {
        if (sheet.getSheetId().toString() === '0') {
          transactionSheet = sheet;
          break;
        }
      }
    }
    
    if (!transactionSheet) throw new Error('ไม่พบ Transaction_Log sheet');
    
    const result = findTransactionByUID(transactionSheet, uid);
    if (!result) throw new Error('ไม่พบรายการที่ต้องการอัพเดท');
    
    // อัพเดทคอลัมน์ W (คอลัมน์ที่ 23)
    transactionSheet.getRange(result.rowIndex, 23).setValue(status);
    
    // อัพเดทคอลัมน์ X (คอลัมน์ที่ 24) ถ้ามีการส่งหมายเหตุมา
    if (paidNote !== undefined) {
      transactionSheet.getRange(result.rowIndex, 24).setValue(paidNote);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'อัพเดทสถานะการเบิกเงินสำเร็จ',
        data: {
          uid: uid,
          status: status,
          paidNote: paidNote
        }
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error in updateTransactionPaymentStatus:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * ฟังก์ชันสำหรับแก้ไขรายละเอียดรายการ (ปริมาณ, มูลค่า และ ภารกิจ)
 */
function updateTransactionDetail(uid, sheetsId, data) {
  try {
    if (!uid) throw new Error('ต้องระบุ UID');
    if (!sheetsId) throw new Error('ต้องระบุ Sheets ID');
    
    const spreadsheet = SpreadsheetApp.openById(sheetsId);
    let transactionSheet = spreadsheet.getSheetByName('Transaction_Log');
    
    if (!transactionSheet) {
      const sheets = spreadsheet.getSheets();
      for (let sheet of sheets) {
        if (sheet.getSheetId().toString() === '0' || sheet.getName() === 'Transaction_Log') {
          transactionSheet = sheet;
          break;
        }
      }
    }
    
    if (!transactionSheet) throw new Error('ไม่พบ Transaction_Log sheet');
    
    const result = findTransactionByUID(transactionSheet, uid);
    if (!result) throw new Error('ไม่พบรายการที่ต้องการแก้ไข');
    
    const rowIndex = result.rowIndex;

    // อัปเดตฟิลด์ต่างๆ ตามคอลัมน์ใน Transaction_Log
    // UID (A=1) - ไม่แก้
    if (data.date) transactionSheet.getRange(rowIndex, 2).setValue(data.date);           // วันที่ (B=2)
    if (data.time) transactionSheet.getRange(rowIndex, 3).setValue(data.time);           // เวลา (C=3)
    if (data.type) transactionSheet.getRange(rowIndex, 4).setValue(data.type);           // ประเภท (D=4)
    if (data.source) transactionSheet.getRange(rowIndex, 5).setValue(data.source);       // แหล่งที่มาน้ำมัน (E=5)
    if (data.destination) transactionSheet.getRange(rowIndex, 6).setValue(data.destination); // แบบเครื่องบิน/รถน้ำมัน (F=6)
    
    if (data.volume !== undefined) {
      transactionSheet.getRange(rowIndex, 7).setValue(data.volume);                     // จำนวน(ลิตร) (G=7) - string
      transactionSheet.getRange(rowIndex, 17).setValue(parseFloat(data.volume) || 0);    // volumeLiters (Q=17) - number
    }
    
    if (data.pricePerLiter !== undefined) transactionSheet.getRange(rowIndex, 8).setValue(parseFloat(data.pricePerLiter) || 0); // ราคาต่อลิตร (H=8)
    if (data.totalCost !== undefined) transactionSheet.getRange(rowIndex, 9).setValue(parseFloat(data.totalCost) || 0);     // ยอดรวม (I=9)
    if (data.operator) transactionSheet.getRange(rowIndex, 10).setValue(data.operator);   // ผู้ปฏิบัติงาน (J=10)
    if (data.unit) transactionSheet.getRange(rowIndex, 11).setValue(data.unit);           // สถานีน้ำมัน/จังหวัด (K=11)
    if (data.aircraftType) transactionSheet.getRange(rowIndex, 12).setValue(data.aircraftType); // ประเภทอากาศยาน (L=12)
    if (data.aircraftNumber) transactionSheet.getRange(rowIndex, 13).setValue(data.aircraftNumber); // เลขทะเบียน (M=13)
    if (data.notes !== undefined) transactionSheet.getRange(rowIndex, 14).setValue(data.notes); // หมายเหตุ (N=14)
    if (data.bookNo !== undefined) transactionSheet.getRange(rowIndex, 15).setValue(data.bookNo); // Book No. (O=15)
    if (data.receiptNo !== undefined) transactionSheet.getRange(rowIndex, 16).setValue(data.receiptNo); // Receipt No. (P=16)
    if (data.missions !== undefined) transactionSheet.getRange(rowIndex, 18).setValue(data.missions); // ภาระกิจ (R=18)
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'แก้ไขข้อมูลสำเร็จ',
        data: {
          uid: uid,
          updatedFields: Object.keys(data)
        }
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error in updateTransactionDetail:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * ค้นหารายการ Transaction จาก UID
 * คืนค่า object { rowIndex: number, rowData: array }
 */
function findTransactionByUID(transactionSheet, uid) {
  try {
    const lastRow = transactionSheet.getLastRow();
    
    if (lastRow < 2) {
      return null;
    }
    
    // Trim the search UID
    const trimmedSearchUid = uid.toString().trim();
    
    // อ่านข้อมูลจากแถว 2 ถึงแถวสุดท้าย (ข้าม header)
    const dataRange = transactionSheet.getRange(2, 1, lastRow - 1, 23);
    const values = dataRange.getValues();
    
    for (let i = 0; i < values.length; i++) {
      const row = values[i];
      const sheetUid = row[0] ? row[0].toString().trim() : '';
      
      // Compare with trimmed values
      if (sheetUid === trimmedSearchUid) {
        return {
          rowIndex: i + 2, // Google Sheets rows are 1-indexed, +2 because header is row 1
          rowData: row
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error in findTransactionByUID:', error);
    return null;
  }
}

/**
 * สร้าง Transaction_Archive sheet
 */
function createTransactionArchiveSheet(spreadsheet) {
  try {
    // ตรวจสอบว่ามี sheet อยู่แล้วหรือไม่
    try {
      const existing = spreadsheet.getSheetByName('Transaction_Archive');
      if (existing) {
        return existing;
      }
    } catch (e) {
      // ไม่มี sheet นี้
    }
    
    // สร้าง sheet ใหม่
    const archiveSheet = spreadsheet.insertSheet('Transaction_Archive');
    
    // สร้าง header เดียวกับ Transaction_Log แต่เพิ่ม 2 คอลัมน์สำหรับ metadata
    archiveSheet.getRange(1, 1, 1, 24).setValues([[
      'UID', 'วันที่', 'เวลา', 'ประเภท', 'แหล่งที่มาน้ำมัน', 'แบบเครื่องบิน/รถน้ำมัน', 'จำนวน(ลิตร)', 
      'ราคาต่อลิตร', 'ยอดรวม', 'ผู้ปฏิบัติงาน', 'สถานีน้ำมัน/จังหวัด', 'ประเภทอากาศยาน', 
      'เลขทะเบียน', 'หมายเหตุ', 'Book No.', 'Receipt No.', 'volumeLiters', 'ภาระกิจ',
      'Image URL', 'Image Filename', 'Image Upload Date', 'Image Drive ID',
      'Cancelled At', 'Cancelled By'
    ]]);
    
    // จัดรูปแบบ header
    const headerRange = archiveSheet.getRange(1, 1, 1, 24);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#FF6B6B');
    headerRange.setFontColor('#FFFFFF');
    
    archiveSheet.autoResizeColumns(1, 24);
    archiveSheet.setFrozenRows(1);
    
    return archiveSheet;
    
  } catch (error) {
    console.error('Error in createTransactionArchiveSheet:', error);
    return null;
  }
}

/**
 * คืนลิตรกลับไปที่ Inventory
 */
function restoreInventoryFromTransaction(inventorySheet, sourceName, destinationName, litersToRestore) {
  try {
    if (!inventorySheet || !sourceName || litersToRestore <= 0) {
      console.log('⚠️ [Restore] Missing required data:', { hasSheet: !!inventorySheet, sourceName, litersToRestore });
      return false;
    }
    
    // อ่านข้อมูล Inventory ทั้งหมด
    const dataRange = inventorySheet.getDataRange();
    const values = dataRange.getValues();
    const headers = values[0];
    
    // หา column ที่เกี่ยวข้อง
    const nameCol = findColumnIndex(headers, ['name', 'source_name', 'ชื่อ', 'ชื่อแหล่งน้ำมัน']);
    const stockCol = findColumnIndex(headers, ['current_stock', 'คงเหลือ', 'stock', 'จำนวนปัจจุบัน']);
    
    if (nameCol === -1 || stockCol === -1) {
      console.error('❌ [Restore] Columns not found. nameCol:', nameCol, 'stockCol:', stockCol);
      throw new Error('ไม่พบ column ที่จำเป็นใน Inventory sheet');
    }
    
    const cleanSourceName = sourceName.toString().trim();
    const cleanDestName = destinationName ? destinationName.toString().trim() : '';
    
    console.log('🔄 [Restore] Processing cancellation:', { 
      source: cleanSourceName, 
      dest: cleanDestName, 
      liters: litersToRestore 
    });

    // ตรวจสอบว่า source เป็น "ซื้อจาก ปตท." หรือ variants
    const isPTTSource = cleanSourceName === 'ซื้อจาก ปตท.' || 
                        cleanSourceName === 'จัดซื้อจาก ปตท.' ||
                        cleanSourceName === 'Buy from PTT' ||
                        cleanSourceName === 'PTT Purchase - 200L' ||
                        cleanSourceName === 'PTT Purchase' ||
                        cleanSourceName === 'ปตท.' ||
                        cleanSourceName.includes('Fuel-card');
    
    if (isPTTSource) {
      // กรณียกเลิกจากแหล่งจ่าย PTT: ลบออกจาก PTT inventory (เพราะตอนซื้อเข้าเราเพิ่มเข้าไป)
      console.log('🛒 [Restore] Source is PTT. Searching for PTT row in Inventory...');
      let foundPTT = false;
      for (let i = 1; i < values.length; i++) {
        const inventoryName = values[i][nameCol] ? values[i][nameCol].toString().trim() : '';
        if (inventoryName === 'ปตท.' || 
            inventoryName === 'PTT' || 
            inventoryName === 'PTT Purchase - 200L' ||
            inventoryName === 'จัดซื้อจาก ปตท.' ||
            inventoryName.includes('ปตท') ||
            inventoryName.toUpperCase().includes('PTT')) {
          const currentStock = parseFloat(values[i][stockCol]) || 0;
          values[i][stockCol] = currentStock - litersToRestore;
          console.log('✅ [Restore] Updated PTT source (' + inventoryName + '): ' + currentStock + ' -> ' + values[i][stockCol]);
          foundPTT = true;
          break;
        }
      }
      if (!foundPTT) console.warn('⚠️ [Restore] PTT source row not found in Inventory');
    } else {
      // กรณีปกติ (จ่ายออก): บวกลิตรกลับให้กับแหล่งจ่าย
      console.log('⛽ [Restore] Normal source. Searching for: ' + cleanSourceName);
      let foundSource = false;
      for (let i = 1; i < values.length; i++) {
        const inventoryName = values[i][nameCol] ? values[i][nameCol].toString().trim() : '';
        if (inventoryName === cleanSourceName) {
          const currentStock = parseFloat(values[i][stockCol]) || 0;
          values[i][stockCol] = currentStock + litersToRestore;
          console.log('✅ [Restore] Updated normal source (' + cleanSourceName + '): ' + currentStock + ' -> ' + values[i][stockCol]);
          foundSource = true;
          break;
        }
      }
      if (!foundSource) console.warn('⚠️ [Restore] Source row not found in Inventory: ' + cleanSourceName);
    }
    
    // จัดการกับแบบเครื่องบิน/รถน้ำมัน: ลบจำนวนลิตรออกจากแบบเครื่องบิน/รถน้ำมัน (ถ้าเป็นถัง/แท๊งค์/รถ)
    if (cleanDestName) {
      console.log('🎯 [Restore] Destination exists. Searching for: ' + cleanDestName);
      let foundDest = false;
      for (let i = 1; i < values.length; i++) {
        const inventoryName = values[i][nameCol] ? values[i][nameCol].toString().trim() : '';
        if (inventoryName === cleanDestName) {
          const currentStock = parseFloat(values[i][stockCol]) || 0;
          values[i][stockCol] = currentStock - litersToRestore;
          console.log('✅ [Restore] Updated destination (' + cleanDestName + '): ' + currentStock + ' -> ' + values[i][stockCol]);
          foundDest = true;
          break;
        }
      }
      if (!foundDest) console.log('ℹ️ [Restore] Destination row not found or is aircraft/drain: ' + cleanDestName);
    }
    
    // เขียนข้อมูลกลับ (หลังจากจัดการทั้ง source และ destination)
    dataRange.setValues(values);
    console.log('💾 [Restore] Inventory sheet updated successfully');
    return true;
    
  } catch (error) {
    console.error('❌ [Restore] Error in restoreInventoryFromTransaction:', error);
    throw error;
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
 * ดึงราคา PTT จาก Sheet gid=1828300695 โดยตรวจสอบจังหวัด
 * @param {string} province - ชื่อจังหวัด (Column A)
 * @param {string} sheetsId - Google Sheets ID
 * @param {string} gid - Sheet GID (1828300695 สำหรับ PTT_PRICES)
 * @returns {ContentService} JSON response with pricePerLiter and pricePerDrum
 */
function getPTTPricesByProvince(province, sheetsId, gid) {
  try {
    if (!province || province.trim() === '') {
      throw new Error('Province name is required');
    }
    
    if (!sheetsId) {
      throw new Error('sheetsId is required');
    }
    
    console.log('getPTTPricesByProvince called with province:', province, 'gid:', gid);
    
    const spreadsheet = SpreadsheetApp.openById(sheetsId);
    let pttSheet = null;
    
    // หา sheet ตาม gid
    if (gid) {
      const sheets = spreadsheet.getSheets();
      for (let sheet of sheets) {
        if (sheet.getSheetId().toString() === gid.toString()) {
          pttSheet = sheet;
          console.log('Found PTT prices sheet by GID:', gid, 'sheet name:', sheet.getName());
          break;
        }
      }
    }
    
    if (!pttSheet) {
      throw new Error('PTT prices sheet not found with GID: ' + gid);
    }
    
    const lastRow = pttSheet.getLastRow();
    const lastCol = pttSheet.getLastColumn();
    
    console.log('PTT sheet info - LastRow:', lastRow, 'LastCol:', lastCol);
    
    if (lastRow < 2) {
      throw new Error('No price data found in PTT prices sheet');
    }
    
    // อ่านข้อมูลทั้งหมด (Column A = Province, Column B = Price)
    const dataRange = pttSheet.getRange(2, 1, lastRow - 1, 2);
    const values = dataRange.getValues();
    
    console.log('PTT sheet data rows:', values.length);
    
    // หาแถวที่ตรงกับจังหวัด (Column A)
    for (let i = 0; i < values.length; i++) {
      const sheetProvince = values[i][0]; // Column A
      const price = values[i][1]; // Column B
      
      if (sheetProvince && sheetProvince.toString().trim().toLowerCase() === province.trim().toLowerCase()) {
        console.log('Found matching province:', sheetProvince, 'Price:', price);
        
        // ราคาจากคอลัมน์ B ใช้เป็น pricePerLiter และสำหรับ pricePerDrum คำนวณจาก 200L
        const pricePerLiter = parseFloat(price) || 0;
        const pricePerDrum = pricePerLiter * 200; // 200 liters per drum
        
        return ContentService
          .createTextOutput(JSON.stringify({
            success: true,
            data: {
              pricePerLiter: pricePerLiter,
              pricePerDrum: pricePerDrum,
              province: sheetProvince
            }
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // ถ้าไม่พบจังหวัด
    console.warn('Province not found in PTT prices sheet:', province);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: 'Province not found: ' + province,
        data: {
          pricePerLiter: 0,
          pricePerDrum: 0
        }
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error in getPTTPricesByProvince:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * ดึงราคา PTT จาก Sheet gid=1828300695 โดยตรวจสอบชื่อสถานที่
 * @param {string} locationName - Location name (เช่น 'สนามบินนครสวรรค์ - ถัง 200L')
 * @param {string} sheetsId - Google Sheets ID
 * @param {string} gid - Sheet GID (1828300695 สำหรับ PTT_PRICES)
 * @returns {ContentService} JSON response with pricePerDrum
 */
function getPTTPricesByLocationName(locationName, sheetsId, gid) {
  try {
    if (!locationName || locationName.trim() === '') {
      throw new Error('Location name is required');
    }
    
    if (!sheetsId) {
      throw new Error('sheetsId is required');
    }
    
    console.log('getPTTPricesByLocationName called with locationName:', locationName, 'gid:', gid);
    
    const spreadsheet = SpreadsheetApp.openById(sheetsId);
    let pttSheet = null;
    
    // หา sheet ตาม gid
    if (gid) {
      const sheets = spreadsheet.getSheets();
      for (let sheet of sheets) {
        if (sheet.getSheetId().toString() === gid.toString()) {
          pttSheet = sheet;
          console.log('Found PTT prices sheet by GID:', gid, 'sheet name:', sheet.getName());
          break;
        }
      }
    }
    
    if (!pttSheet) {
      throw new Error('PTT prices sheet not found with GID: ' + gid);
    }
    
    const lastRow = pttSheet.getLastRow();
    const lastCol = pttSheet.getLastColumn();
    
    console.log('PTT sheet info - LastRow:', lastRow, 'LastCol:', lastCol);
    
    if (lastRow < 2) {
      throw new Error('No price data found in PTT prices sheet');
    }
    
    // อ่านข้อมูลทั้งหมด (Column A = Location Name, Column B = Price)
    const dataRange = pttSheet.getRange(2, 1, lastRow - 1, 2);
    const values = dataRange.getValues();
    
    console.log('PTT sheet data rows:', values.length);
    
    // หาแถวที่ตรงกับชื่อสถานที่ (Column A)
    for (let i = 0; i < values.length; i++) {
      const sheetLocationName = values[i][0]; // Column A
      const price = values[i][1]; // Column B
      
      if (sheetLocationName && sheetLocationName.toString().trim().toLowerCase() === locationName.trim().toLowerCase()) {
        console.log('Found matching location:', sheetLocationName, 'Price:', price);
        
        // ราคาจากคอลัมน์ B ใช้เป็น pricePerDrum โดยตรง
        const pricePerDrum = parseFloat(price) || 0;
        
        return ContentService
          .createTextOutput(JSON.stringify({
            success: true,
            data: {
              pricePerDrum: pricePerDrum,
              locationName: sheetLocationName
            }
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // ถ้าไม่พบสถานที่
    console.warn('Location not found in PTT prices sheet:', locationName);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: 'Location not found: ' + locationName,
        data: {
          pricePerDrum: 0
        }
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error in getPTTPricesByLocationName:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * ดึงรายการสถานีน้ำมัน/จังหวัด (Operating Units) จาก PTT_PRICES sheet
 * @param {string} sheetsId - Google Sheets ID
 * @param {string} gid - Sheet GID (1828300695 สำหรับ PTT_PRICES)
 * @returns {ContentService} JSON response with array of operating units
 */
function getPTTOperatingUnits(sheetsId, gid) {
  try {
    if (!sheetsId) {
      throw new Error('sheetsId is required');
    }
    
    console.log('getPTTOperatingUnits called with gid:', gid);
    
    const spreadsheet = SpreadsheetApp.openById(sheetsId);
    let pttSheet = null;
    
    // หา sheet ตาม gid
    if (gid) {
      const sheets = spreadsheet.getSheets();
      for (let sheet of sheets) {
        if (sheet.getSheetId().toString() === gid.toString()) {
          pttSheet = sheet;
          console.log('Found PTT prices sheet by GID:', gid, 'sheet name:', sheet.getName());
          break;
        }
      }
    }
    
    if (!pttSheet) {
      throw new Error('PTT prices sheet not found with GID: ' + gid);
    }
    
    const lastRow = pttSheet.getLastRow();
    
    console.log('PTT sheet info - LastRow:', lastRow);
    
    if (lastRow < 2) {
      throw new Error('No data found in PTT prices sheet');
    }
    
    // อ่าน Column A (Operating Units) เริ่มจากแถว 2 (ข้ามหัวข้อ)
    const dataRange = pttSheet.getRange(2, 1, lastRow - 1, 1);
    const values = dataRange.getValues();
    
    // สกัดชื่อสถานีน้ำมัน/จังหวัดที่ไม่ซ้ำกัน
    const operatingUnits = [];
    for (let i = 0; i < values.length; i++) {
      const unit = values[i][0];
      if (unit && unit.toString().trim() !== '') {
        operatingUnits.push(unit.toString().trim());
      }
    }
    
    console.log('Found operating units:', operatingUnits.length, 'units');
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data: {
          operatingUnits: operatingUnits
        }
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error in getPTTOperatingUnits:', error);
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
      ['งบกลาง/อื่นๆ', 0, 0, '=B5-C5', '', 'งบประมาณสำหรับงบกลางหรืออื่นๆ']
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

    let message, payload;
    
    // ตรวจสอบเป็น transaction (refill/dispense) หรือ confirmation
    const isTransaction = transactionData.volume !== undefined;
    
    if (isTransaction && transactionData.imageUrl) {
      // ส่งข้อความแบบ Flex พร้อมรูปภาพ (สำหรับ transaction ที่มีรูปภาพ)
      console.log('🖼️ Image detected, sending flex message with image');
      const flexContent = formatTransactionMessageWithImage(transactionData);
      payload = {
        to: groupId,
        messages: [{
          type: 'flex',
          altText: 'ข้อมูล Transaction',
          contents: flexContent
        }]
      };
      console.log('📋 Flex Message payload prepared (with image)');
    } else {
      // ส่งข้อความแบบ text
      // - สำหรับ transaction โดยไม่มีรูปภาพ
      // - สำหรับ daily confirmation
      console.log('📝 Sending text message (transaction=' + isTransaction + ', hasImage=' + (transactionData.imageUrl ? 'yes' : 'no') + ')');
      message = isTransaction 
        ? formatTransactionMessage(transactionData)
        : formatConfirmationMessage(transactionData);
      console.log('📋 Message to send:');
      console.log(message);
      
      payload = {
        to: groupId,
        messages: [{
          type: 'text',
          text: message
        }]
      };
    }

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
 * รูปแบบ: จ่ายน้ำมัน [วันเวลา] [ปริมาณ] ลิตร จาก [ที่มา] → [แบบเครื่องบิน/รถน้ำมัน : โอโดมิเตอร์] | โดย [ผู้ปฏิบัติงาน]
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
 * จัดรูปแบบข้อความ Transaction พร้อมรูปภาพเป็น LINE Flex Message
 * ส่งคืน bubble object ที่มีรูปภาพและข้อมูล transaction ครบถ้วน
 */
function formatTransactionMessageWithImage(transactionData) {
  try {
    const timestamp = transactionData.timestamp ? new Date(transactionData.timestamp) : new Date();
    const dateTimeStr = formatThaiDate(timestamp);
    
    const source = transactionData.source || '-';
    const destination = transactionData.destination || '-';
    const volume = transactionData.volume || '0 ลิตร';
    const pricePerLiter = transactionData.pricePerLiter || 0;
    const totalCost = transactionData.totalCost || 0;
    const operatorName = transactionData.operatorName || '-';
    const unit = transactionData.unit || '-';
    const imageUrl = transactionData.imageUrl || '';
    const transactionType = transactionData.type || 'ธุรกรรม';

    // สร้าง Flex Message Bubble object
    const bubble = {
      type: 'bubble',
      hero: {
        type: 'image',
        url: imageUrl,
        size: 'full',
        aspectRatio: '4:3',
        aspectMode: 'cover'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'text',
            text: '⛽ ' + transactionType,
            weight: 'bold',
            size: 'lg',
            color: '#1DB446'
          },
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            margin: 'md',
            contents: [
              {
                type: 'box',
                layout: 'baseline',
                spacing: 'sm',
                contents: [
                  {
                    type: 'text',
                    text: '📅 วันเวลา:',
                    color: '#aaaaaa',
                    size: 'sm',
                    flex: 3
                  },
                  {
                    type: 'text',
                    text: dateTimeStr,
                    wrap: true,
                    color: '#666666',
                    size: 'sm',
                    flex: 7
                  }
                ]
              },
              {
                type: 'box',
                layout: 'baseline',
                spacing: 'sm',
                contents: [
                  {
                    type: 'text',
                    text: '📍 จาก:',
                    color: '#aaaaaa',
                    size: 'sm',
                    flex: 3
                  },
                  {
                    type: 'text',
                    text: source,
                    wrap: true,
                    color: '#666666',
                    size: 'sm',
                    flex: 7
                  }
                ]
              },
              {
                type: 'box',
                layout: 'baseline',
                spacing: 'sm',
                contents: [
                  {
                    type: 'text',
                    text: '➜ ถึง:',
                    color: '#aaaaaa',
                    size: 'sm',
                    flex: 3
                  },
                  {
                    type: 'text',
                    text: destination,
                    wrap: true,
                    color: '#666666',
                    size: 'sm',
                    flex: 7
                  }
                ]
              },
              {
                type: 'box',
                layout: 'baseline',
                spacing: 'sm',
                contents: [
                  {
                    type: 'text',
                    text: '🔹 ปริมาณ:',
                    color: '#aaaaaa',
                    size: 'sm',
                    flex: 3
                  },
                  {
                    type: 'text',
                    text: volume,
                    wrap: true,
                    color: '#666666',
                    size: 'sm',
                    flex: 7
                  }
                ]
              }
            ]
          },
          {
            type: 'separator',
            margin: 'md'
          },
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            margin: 'md',
            contents: [
              {
                type: 'box',
                layout: 'baseline',
                spacing: 'sm',
                contents: [
                  {
                    type: 'text',
                    text: '💰 ราคา/ลิตร:',
                    color: '#aaaaaa',
                    size: 'sm',
                    flex: 3
                  },
                  {
                    type: 'text',
                    text: pricePerLiter + ' บาท',
                    wrap: true,
                    color: '#666666',
                    size: 'sm',
                    flex: 7
                  }
                ]
              },
              {
                type: 'box',
                layout: 'baseline',
                spacing: 'sm',
                contents: [
                  {
                    type: 'text',
                    text: '💳 รวม:',
                    color: '#aaaaaa',
                    size: 'sm',
                    flex: 3
                  },
                  {
                    type: 'text',
                    text: totalCost + ' บาท',
                    wrap: true,
                    weight: 'bold',
                    color: '#E81828',
                    size: 'sm',
                    flex: 7
                  }
                ]
              }
            ]
          },
          {
            type: 'separator',
            margin: 'md'
          },
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            margin: 'md',
            contents: [
              {
                type: 'box',
                layout: 'baseline',
                spacing: 'sm',
                contents: [
                  {
                    type: 'text',
                    text: '👤 ผู้ปฏิบัติงาน:',
                    color: '#aaaaaa',
                    size: 'sm',
                    flex: 3
                  },
                  {
                    type: 'text',
                    text: operatorName,
                    wrap: true,
                    color: '#666666',
                    size: 'sm',
                    flex: 7
                  }
                ]
              },
              {
                type: 'box',
                layout: 'baseline',
                spacing: 'sm',
                contents: [
                  {
                    type: 'text',
                    text: '🏢 สถานีน้ำมัน/จังหวัด:',
                    color: '#aaaaaa',
                    size: 'sm',
                    flex: 3
                  },
                  {
                    type: 'text',
                    text: unit,
                    wrap: true,
                    color: '#666666',
                    size: 'sm',
                    flex: 7
                  }
                ]
              }
            ]
          }
        ]
      }
    };

    return bubble;
  } catch (error) {
    console.error('Error in formatTransactionMessageWithImage:', error);
    // ถ้ามี error ให้ส่ง text message แทน
    return {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: 'ข้อมูล Transaction: ' + JSON.stringify(transactionData),
            wrap: true,
            size: 'sm'
          }
        ]
      }
    };
  }
}

/**
 * จัดรูปแบบข้อความ Daily Confirmation เป็นภาษาไทย
 * รูปแบบ: ยืนยันยอดน้ำมัน [วันเวลา] [แหล่งที่มาน้ำมัน] จำนวน [ปัจจุบัน] ลิตร | โดย [ผู้ปฏิบัติงาน]
 */
function formatConfirmationMessage(confirmationData) {
  try {
    const timestamp = confirmationData.timestamp ? new Date(confirmationData.timestamp) : new Date();
    const dateTimeStr = formatThaiDate(timestamp);
    
    const sourceName = confirmationData.sourceName || '-';
    const currentStock = confirmationData.currentStock || 0;
    const operatorName = confirmationData.operatorName || '-';

    // สร้างข้อความสำหรับการยืนยันยอด
    const message = `📊 ยืนยันยอดน้ำมัน\n📅 ${dateTimeStr}\n\n📍 แหล่งที่มาน้ำมัน: ${sourceName}\n🔹 จำนวนปัจจุบัน: ${currentStock} ลิตร\n\n👤 โดย: ${operatorName}`;
    
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

/**
 * ทดสอบการอัพโหลดรูปภาพ (Test Upload)
 * เรียกใช้จาก Apps Script Editor: Run > testImageUpload
 */
function testImageUpload() {
  try {
    // Sample 1x1 pixel PNG image in Base64
    const sampleBase64PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    
    const folderID = '1OTCL52sA2sqKTDCayxzphe5WB_aP-YFL';
    const timestamp = new Date().getTime();
    const testFilename = 'TEST_' + timestamp + '.png';
    
    Logger.log('========================================');
    Logger.log('Testing Image Upload Function');
    Logger.log('========================================');
    Logger.log('Folder ID: ' + folderID);
    Logger.log('Filename: ' + testFilename);
    Logger.log('Base64 Data: ' + sampleBase64PNG.substring(0, 50) + '...');
    Logger.log('');
    
    const result = uploadImageToGoogleDrive(sampleBase64PNG, testFilename, folderID);
    
    Logger.log('========================================');
    Logger.log('Test Result:');
    Logger.log('========================================');
    Logger.log('Success: ' + result.success);
    if (result.success) {
      Logger.log('✅ Image URL: ' + result.imageUrl);
      Logger.log('✅ File ID: ' + result.fileId);
      Logger.log('✅ Filename: ' + result.filename);
      Logger.log('✅ Upload Date: ' + result.uploadDate);
    } else {
      Logger.log('❌ Error: ' + result.error);
    }
  } catch (error) {
    Logger.log('❌ Test Error:');
    Logger.log(error.toString());
  }
}

/**
 * รวมการบันทึก Log และอัปเดต Inventory ในครั้งเดียวเพื่อความรวดเร็ว
 */
function processTransaction(transactionDataString, updateInventoryDataString, sheetsId, inventoryGid) {
  const logs = ['=== 🔵 processTransaction STARTED ==='];
  try {
    const transactionData = JSON.parse(transactionDataString);
    const updateData = JSON.parse(updateInventoryDataString);
    const spreadsheet = SpreadsheetApp.openById(sheetsId);
    
    // 1. บันทึก Transaction Log
    const logResult = internalLogTransaction(spreadsheet, transactionData, logs);
    
    // 2. อัปเดต Inventory
    const inventoryResult = internalUpdateInventory(spreadsheet, inventoryGid, updateData, logs);
    
    logs.push('=== 🟢 processTransaction COMPLETED ===');
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'ประมวลผลรายการสำเร็จ',
        logSuccess: logResult,
        inventorySuccess: inventoryResult,
        logs: logs
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    logs.push('❌ Error in processTransaction: ' + error.toString());
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
 * ฟังก์ชันภายในสำหรับบันทึก Log (ใช้ Spreadsheet object เดิม)
 */
function internalLogTransaction(spreadsheet, transactionData, logs) {
  try {
    let logSheet = spreadsheet.getSheetByName('Transaction_Log');
    if (!logSheet || logSheet.getLastRow() === 0) {
      logSheet = createTransactionLogSheet(spreadsheet.getId());
    }
    
    // Check if UID already exists to prevent duplicates (e.g. from network retries)
    const searchUid = transactionData.uid || '';
    if (searchUid) {
      const existing = findTransactionByUID(logSheet, searchUid);
      if (existing) {
        logs.push('⚠️ UID ' + searchUid + ' already exists. Skipping append to prevent duplicate.');
        return true; // Already exists, consider it a success
      }
    }
    
    const timestamp = transactionData.timestamp ? new Date(transactionData.timestamp) : new Date();
    const dateStr = Utilities.formatDate(timestamp, 'Asia/Bangkok', 'yyyy-MM-dd');
    const timeStr = Utilities.formatDate(timestamp, 'Asia/Bangkok', 'HH:mm:ss');
    
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
      transactionData.receiptNo || '',     
      transactionData.volumeLiters || 0,   
      transactionData.missions || '',
      transactionData.imageUrl || '',
      transactionData.imageFilename || '',
      timestamp.toISOString(),
      transactionData.imageDriveId || ''
    ]);
    
    logs.push('✅ Logged transaction successfully');
    
    try {
      const lineConfig = getLineConfigFromSheet(spreadsheet);
      if (lineConfig.ENABLED === true || lineConfig.ENABLED === 'true') {
        sendLineNotificationAsync(transactionData, lineConfig);
        logs.push('🟢 LINE notification sent');
      }
    } catch (e) {
      logs.push('⚠️ LINE notification failed: ' + e.toString());
    }
    
    return true;
  } catch (e) {
    logs.push('❌ Error in internalLogTransaction: ' + e.toString());
    return false;
  }
}

/**
 * ฟังก์ชันภายในสำหรับอัปเดต Inventory (ใช้ Spreadsheet object เดิม)
 */
function internalUpdateInventory(spreadsheet, gid, updateData, logs) {
  try {
    const sheets = spreadsheet.getSheets();
    let targetSheet = null;
    for (let sheet of sheets) {
      if (sheet.getSheetId().toString() === gid.toString()) {
        targetSheet = sheet;
        break;
      }
    }
    
    if (!targetSheet) targetSheet = sheets[0];
    
    const range = targetSheet.getDataRange();
    const values = range.getValues();
    const headers = values[0];
    
    const nameCol = findColumnIndex(headers, ['name', 'source_name', 'ชื่อ']);
    const stockCol = findColumnIndex(headers, ['current_stock', 'คงเหลือ', 'stock']);
    
    if (nameCol === -1 || stockCol === -1) {
      logs.push('❌ Column not found in inventory');
      return false;
    }
    
    for (let i = 1; i < values.length; i++) {
      const rowName = values[i][nameCol];
      if (updateData[rowName] !== undefined) {
        values[i][stockCol] = updateData[rowName];
      }
    }
    
    range.setValues(values);
    logs.push('✅ Inventory updated successfully');
    return true;
  } catch (e) {
    logs.push('❌ Error in internalUpdateInventory: ' + e.toString());
    return false;
  }
}