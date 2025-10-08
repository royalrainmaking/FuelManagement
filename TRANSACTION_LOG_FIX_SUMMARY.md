# สรุปการแก้ไขปัญหา Activity Log แสดง "unknown"

## ปัญหาที่พบ
Activity Log ในหน้าเว็บแสดงข้อความ "unknown" แทนที่จะแสดงข้อความที่มีความหมาย เช่น:
- ❌ "unknown 3,000 ลิตร | โดย กฤษฎา ลุนาบุตร"
- ✅ "ซื้อน้ำมันจาก ปตท. 3,000 ลิตร | โดย กฤษฎา ลุนาบุตร"

## การวินิจฉัยปัญหา

### 1. ตรวจสอบข้อมูลจาก Google Sheets
- เปิด Google Sheets และตรวจสอบโครงสร้างข้อมูลใน Transaction_Log sheet
- พบว่ามีคอลัมน์:
  - A: วันที่
  - B: เวลา
  - C: ชนิด (เช่น "ซื้อจาก ปตท.", "จ่ายออก")
  - D: ชื่อ (เช่น "ปตท.")
  - E: ปลายทาง
  - F: จำนวน(ลิตร)
  - G: ราคาต่อลิตร
  - H: ยอดรวม
  - I: ผู้ปฏิบัติงาน
  - J: หน่วย

### 2. ตรวจสอบ Code
- ตรวจสอบ `inventory.js` พบว่า code พยายามอ่าน field names ที่ถูกต้อง:
  - `row.transaction_type` ✅
  - `row.source_name` ✅
  - `row.destination_name` ✅
  - `row.volume` ✅
  - `row.price_per_liter` ✅
  - `row.total_cost` ✅
  - `row.operator_name` ✅
  - `row.unit` ✅

### 3. ระบุสาเหตุ
- **Google Apps Script ยังไม่มีฟังก์ชัน `getTransactionLogs`** หรือฟังก์ชันที่มีส่งข้อมูลกลับมาในรูปแบบที่ไม่ถูกต้อง
- ทำให้ `row.transaction_type` เป็น `undefined` หรือ empty string
- ส่งผลให้ `transactionType` ถูกกำหนดเป็น `"unknown"`

## วิธีแก้ไข

### ขั้นตอนที่ 1: เพิ่มฟังก์ชันใน Google Apps Script

1. เปิด Google Sheets: https://docs.google.com/spreadsheets/d/18EaX2GwcZaPFXzcL0B9T4gFRAOhBXdHqZHm1bMJ8-sE/edit
2. ไปที่ **ส่วนขยาย** > **Apps Script**
3. เพิ่มฟังก์ชัน `getTransactionLogs` (ดูรายละเอียดใน `GOOGLE_APPS_SCRIPT_SETUP.md`)
4. อัพเดทฟังก์ชัน `doGet` เพื่อรองรับ action `getTransactionLogs`
5. Deploy เวอร์ชันใหม่

### ขั้นตอนที่ 2: ทดสอบ

1. เปิดหน้าเว็บระบบจัดการน้ำมัน
2. กด F5 เพื่อ Refresh
3. ตรวจสอบ Activity Log

## ไฟล์ที่เกี่ยวข้อง

1. **GOOGLE_APPS_SCRIPT_SETUP.md** - คำแนะนำการตั้งค่า Google Apps Script แบบละเอียด
2. **google-apps-script-transaction-log.js** - โค้ด Google Apps Script ที่ต้องเพิ่ม
3. **inventory.js** - ไฟล์หลักที่มี logic การดึงและแปลงข้อมูล (ไม่ต้องแก้ไข)

## การทำงานของระบบ

### 1. Google Apps Script (Backend)
```
Transaction_Log Sheet
  ↓ (อ่านข้อมูล)
getTransactionLogs()
  ↓ (แปลงเป็น JSON)
{
  "transaction_type": "ซื้อจาก ปตท.",
  "source_name": "ปตท.",
  ...
}
```

### 2. inventory.js (Frontend)
```
API Response
  ↓ (แปลง transaction_type)
"ซื้อจาก ปตท." → transactionType: "refill"
  ↓ (ส่งไปยัง ActivityLogger)
ActivityLogger.addTransactionLog()
```

### 3. ActivityLogger (Display)
```
transactionType: "refill"
sourceName: "ปตท."
  ↓ (สร้างข้อความ)
"ซื้อน้ำมันจาก ปตท."
```

## การตรวจสอบว่าแก้ไขสำเร็จ

✅ Activity Log แสดงข้อความที่มีความหมาย:
- "ซื้อน้ำมันจาก ปตท. 10,000 ลิตร | โดย กฤษฎา ลุนาบุตร"
- "จ่ายน้ำมัน 200 ลิตร | โดย กฤษฎา ลุนาบุตร"

✅ ไม่มีข้อความ "unknown" ปรากฏใน Activity Log

## หมายเหตุ

- ระบบจะโหลดข้อมูลจาก Google Sheets ทุกครั้งที่เปิดหน้าเว็บ
- ข้อมูลจะถูก cache ไว้ใน localStorage เพื่อความเร็ว
- การแก้ไขนี้ไม่กระทบกับฟังก์ชันอื่นๆ ของระบบ