# คำแนะนำการเชื่อมต่อ Google Sheets

## ขั้นตอนที่ 1: เตรียม Google Sheets

1. **เปิด Google Sheets ที่ให้มา:**
   - https://docs.google.com/spreadsheets/d/18EaX2GwcZaPFXzcL0B9T4gFRAOhBXdHqZHm1bMJ8-sE/edit

2. **ตรวจสอบ 2 sheets:**
   - **Sheet แรก (gid=0):** สำหรับบันทึก transaction logs
   - **Sheet ที่สอง (gid=1942506251):** สำหรับข้อมูล inventory

## ขั้นตอนที่ 2: สร้าง Google Apps Script

1. **เปิด Google Apps Script:**
   - ไปที่ https://script.google.com
   - คลิก "โครงการใหม่"

2. **คัดลอกโค้ดจากไฟล์ `google-apps-script.js`**

3. **บันทึกโครงการ:**
   - ตั้งชื่อเป็น "ระบบจัดการน้ำมัน API"
   - บันทึก (Ctrl+S)

## ขั้นตอนที่ 3: Deploy เป็น Web App

1. **คลิก "Deploy" > "New deployment"**

2. **เลือกประเภท:**
   - Type: Web app

3. **ตั้งค่า:**
   - Description: "Fuel Management API v1"
   - Execute as: Me (email ของคุณ)
   - Who has access: Anyone

4. **คลิก "Deploy"**

5. **คัดลอก Web App URL** (มีหน้าตาแบบนี้):
   ```
   https://script.google.com/macros/s/AKfycby.../exec
   ```

## ขั้นตอนที่ 4: อัพเดต JavaScript

1. **แก้ไขไฟล์ `inventory.js`**

2. **แทนที่บรรทัดที่ 2:**
   ```javascript
   const GOOGLE_SCRIPT_URL = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';
   ```
   
   **เป็น:**
   ```javascript
   const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby.../exec';
   ```

## ขั้นตอนที่ 5: ทดสอบระบบ

1. **เปิด `inventory.html` ในเบราว์เซอร์**

2. **เช็ค Console (F12) หาข้อความ:**
   - ✅ "โหลดข้อมูลจาก Google Sheets สำเร็จ"
   - ❌ "ใช้ข้อมูล local แทน Google Sheets"

3. **ทดสอบการทำรายการ:**
   - เติมน้ำมัน
   - จ่ายน้ำมัน
   - ตรวจสอบข้อมูลใน Google Sheets

## Structure ของ Google Sheets

### Sheet 1 (gid=0) - Transaction Logs
| Column | ชื่อฟิลด์ | ประเภทข้อมูล |
|--------|-----------|--------------|
| A | Timestamp | Date/Time |
| B | Transaction_Type | Text |
| C | Source | Text |
| D | Destination | Text |
| E | Volume_Liters | Number |
| F | Price_Per_Liter | Number |
| G | Total_Cost | Number |
| H | Operator_Name | Text |
| I | Unit | Text |
| J | Aircraft_Type | Text |
| K | Aircraft_Number | Text |
| L | Notes | Text |

### Sheet 2 (gid=1942506251) - Inventory Data
| Column | ชื่อฟิลด์ | ประเภทข้อมูล |
|--------|-----------|--------------|
| A | Source_Name | Text |
| B | Source_Type | Text |
| C | Capacity_Liters | Number |
| D | Current_Stock | Number |
| E | Last_Updated | Date/Time |
| F | Notes | Text |

## การแก้ไขปัญหา

### ปัญหา 1: CORS Error
```
Access to fetch at '...' from origin 'null' has been blocked by CORS policy
```
**วิธีแก้:** ให้เปิดไฟล์ผ่าน web server แทนการเปิดไฟล์โดยตรง

### ปัญหา 2: ไม่พบ Sheet
```
ไม่พบ sheet inventory (gid: 1942506251)
```
**วิธีแก้:** ตรวจสอบ gid ใน URL ของ Google Sheets

### ปัญหา 3: Permission Denied
```
Exception: You do not have permission to call...
```
**วิธีแก้:** 
1. ใน Apps Script เลือก "Execute as: Me"
2. Authorize permissions เมื่อ deploy ครั้งแรก

## หมายเหตุ

- ระบบจะทำงานได้โดยไม่ต้องเชื่อมต่อ Google Sheets (ใช้ localStorage แทน)
- การเชื่อมต่อ Google Sheets เป็นฟีเจอร์เสริม
- ข้อมูลจะ sync ทั้งสองทาง: Google Sheets ↔ localStorage