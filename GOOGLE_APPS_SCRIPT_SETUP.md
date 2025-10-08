# คำแนะนำการตั้งค่า Google Apps Script สำหรับ Transaction Log

## ปัญหาที่พบ
Activity Log แสดงข้อความ "unknown" แทนที่จะแสดงข้อความที่มีความหมาย เช่น "ซื้อน้ำมันจาก ปตท." หรือ "จ่ายน้ำมัน"

## สาเหตุ
Google Apps Script ยังไม่มีฟังก์ชัน `getTransactionLogs` หรือฟังก์ชันที่มีส่งข้อมูลกลับมาในรูปแบบที่ไม่ถูกต้อง

## วิธีแก้ไข

### ขั้นตอนที่ 1: เปิด Google Apps Script Editor

1. เปิด Google Sheets: https://docs.google.com/spreadsheets/d/18EaX2GwcZaPFXzcL0B9T4gFRAOhBXdHqZHm1bMJ8-sE/edit
2. คลิกที่เมนู **ส่วนขยาย** (Extensions) > **Apps Script**

### ขั้นตอนที่ 2: เพิ่มฟังก์ชัน getTransactionLogs

คัดลอกโค้ดด้านล่างนี้และวางลงใน Google Apps Script Editor:

```javascript
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
        date: row[0] ? Utilities.formatDate(new Date(row[0]), Session.getScriptTimeZone(), 'yyyy-MM-dd') : '',
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
```

### ขั้นตอนที่ 3: อัพเดทฟังก์ชัน doGet

หาฟังก์ชัน `doGet` ใน Google Apps Script Editor และเพิ่ม case สำหรับ `getTransactionLogs`:

```javascript
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
```

### ขั้นตอนที่ 4: Deploy

1. คลิกปุ่ม **Deploy** > **Manage deployments**
2. คลิกไอคอน **Edit** (รูปดินสอ) ที่ deployment ปัจจุบัน
3. เลือก **New version** ใน Version dropdown
4. คลิก **Deploy**
5. คัดลอก **Web app URL** (ถ้ามีการเปลี่ยนแปลง)

### ขั้นตอนที่ 5: ทดสอบ

1. เปิดหน้าเว็บระบบจัดการน้ำมัน (index.html)
2. กด F5 เพื่อ Refresh หน้าเว็บ
3. ตรวจสอบ Activity Log ว่าแสดงข้อความที่ถูกต้องหรือไม่

## โครงสร้างข้อมูลที่ส่งกลับ

ฟังก์ชัน `getTransactionLogs` จะส่งข้อมูลกลับมาในรูปแบบ:

```json
{
  "success": true,
  "data": [
    {
      "date": "2025-10-02",
      "time": "22:36:26",
      "transaction_type": "ซื้อจาก ปตท.",
      "source_name": "ปตท.",
      "destination_name": "",
      "volume": 10000,
      "price_per_liter": 30.04,
      "total_cost": 300400,
      "operator_name": "กฤษฎา ลุนาบุตร",
      "unit": "สนามบินเสรรวรรค์"
    }
  ]
}
```

## การ Map ข้อมูลใน inventory.js

ระบบจะแปลง `transaction_type` จากภาษาไทยเป็น internal format:

- `"ซื้อจาก ปตท."` → `transactionType: "refill"`
- `"จ่ายออก"` → `transactionType: "dispense"`
- `"รับซื้อจาก ปตท."` → `transactionType: "refill"`

จากนั้น ActivityLogger จะแปลง `transactionType` เป็นข้อความแสดงผล:

- `"refill"` → "ซื้อน้ำมันจาก {sourceName}"
- `"dispense"` → "จ่ายน้ำมัน"
- `"transfer"` → "โอนน้ำมัน"

## หมายเหตุ

- ตรวจสอบให้แน่ใจว่า Google Apps Script มีสิทธิ์เข้าถึง Google Sheets
- ตรวจสอบว่า GOOGLE_SCRIPT_URL ใน inventory.js ตรงกับ Web app URL ที่ deploy แล้ว
- ตรวจสอบว่า TRANSACTION_LOG_SHEET_GID ตรงกับ gid ของ Transaction_Log sheet (1578547125)