# วิธีการเชื่อมต่อระบบจัดการน้ำมันกับ Google Sheets

## ภาพรวม
ระบบได้รับการปรับปรุงให้สามารถใช้ข้อมูลจาก Google Sheets โดยตรง แทนการใช้ข้อมูล hard-coded

## ขั้นตอนการตั้งค่า

### 1. เตรียม Google Sheets
- เปิด Google Sheets: https://docs.google.com/spreadsheets/d/18EaX2GwcZaPFXzcL0B9T4gFRAOhBXdHqZHm1bMJ8-sE/edit?gid=1942506251#gid=1942506251
- ตรวจสอบให้แน่ใจว่ามี sheet ที่มี GID = 1942506251
- จัดโครงสร้างข้อมูลให้เป็นดังนี้:

**Column Headers (แถวแรก):**
- `ชื่อ` หรือ `name` - ชื่อแหล่งน้ำมัน
- `ความจุ` หรือ `capacity` - ความจุสูงสุด (ใส่ "ไม่จำกัด" สำหรับแหล่งที่ไม่จำกัด)
- `คงเหลือ` หรือ `current_stock` - จำนวนน้ำมันปัจจุบัน
- `ประเภท` หรือ `type` - ประเภทแหล่งน้ำมัน (purchase/tank/truck/special/drum)
- `id` - รหัสเฉพาะ (ถ้าไม่มีระบบจะสร้างให้อัตโนมัติ)

### 2. สร้าง Google Apps Script
1. เข้าไปที่ https://script.google.com
2. สร้าง New Project
3. คัดลอกโค้ดจากไฟล์ `google-apps-script.gs` ไปวาง
4. บันทึกโครงการ

### 3. Deploy Web App
1. คลิก Deploy > New deployment
2. เลือก Type: Web app
3. Execute as: Me
4. Who has access: Anyone
5. คลิก Deploy
6. คัดลอก Web app URL

### 4. อัปเดต URL ในระบบ
แก้ไขไฟล์ `inventory.js` ที่บรรทัดที่ 2:
```javascript
const GOOGLE_SCRIPT_URL = 'YOUR_NEW_WEB_APP_URL_HERE';
```

## โครงสร้างข้อมูลตัวอย่าง

| ชื่อ | ความจุ | คงเหลือ | ประเภท | id |
|------|---------|---------|---------|-----|
| จัดซื้อจาก ปตท. | ไม่จำกัด | 0 | purchase | purchase |
| สนามบินนครสวรรค์ แท๊ง 1 | 20000 | 0 | tank | nakhonsawan_tank1 |
| 96-0677 กทม. | 7000 | 0 | truck | truck_96_0677 |

## คุณสมบัติที่รองรับ

### 1. การโหลดข้อมูล Master Data
- ระบบจะดึงข้อมูลโครงสร้างและจำนวนคงเหลือจาก Google Sheets
- รองรับการใช้ชื่อ column ภาษาไทยและอังกฤษ
- มี Auto-mapping สำหรับ column headers ที่หลากหลาย

### 2. การอัปเดตข้อมูล Inventory
- อัปเดตจำนวนคงเหลือกลับไปยัง Google Sheets อัตโนมัติ
- มี fallback เป็น localStorage เมื่อไม่สามารถเชื่อมต่อได้

### 3. การบันทึก Transaction Log
- สร้าง sheet "Transaction_Log" อัตโนมัติถ้ายังไม่มี
- บันทึกรายการทำรายการทั้งหมดพร้อม timestamp

### 4. Fallback Mechanism
- ถ้าไม่สามารถเชื่อมต่อ Google Sheets ได้ จะใช้ข้อมูล default
- บันทึกข้อมูลใน localStorage เป็น backup
- แสดง loading states ที่ชัดเจนในแต่ละขั้นตอน

## การทดสอบการเชื่อมต่อ

1. เปิด Developer Console (F12)
2. ดูข้อความ log เมื่อโหลดหน้าเว็บ:
   - ✅ "โหลดข้อมูลจาก Google Sheets สำเร็จ" = เชื่อมต่อได้
   - ❌ "ใช้ข้อมูล default แทน" = เชื่อมต่อไม่ได้

## หมายเหตุสำคัญ

- ระบบจะ Auto-detect ประเภทแหล่งน้ำมันจากชื่อถ้าไม่มี type column
- รองรับการใช้ภาษาไทยในชื่อ column
- ข้อมูลจะถูก sync ทั้งสองทิศทาง (อ่านและเขียน)
- มี error handling ที่ครอบคลุมเพื่อความเสถียร

## การแก้ไขปัญหา

1. **ไม่สามารถโหลดข้อมูลได้**
   - ตรวจสอบ URL และสิทธิ์การเข้าถึง Google Sheets
   - ตรวจสอบ Web app deployment settings

2. **ข้อมูลไม่อัปเดต**
   - ตรวจสอบโครงสร้าง column headers
   - ดูข้อความ error ใน console

3. **Performance ช้า**
   - ลดจำนวนข้อมูลใน sheet
   - ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต