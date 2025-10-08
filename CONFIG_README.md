# 📋 คู่มือการตั้งค่า Configuration

## 📁 ไฟล์ `config.js`

ไฟล์นี้เป็นศูนย์กลางการตั้งค่าทั้งหมดของระบบจัดการน้ำมัน

---

## 🔧 การตั้งค่าที่สำคัญ

### 1. Google Apps Script URL

```javascript
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
```

**วิธีหา URL:**
1. เปิด Google Apps Script Editor
2. คลิก **Deploy** > **Manage deployments**
3. คัดลอก **Web app URL**
4. นำมาใส่ใน `config.js`

---

### 2. Google Sheets ID

```javascript
const GOOGLE_SHEETS_ID = 'YOUR_SHEETS_ID';
```

**วิธีหา Sheets ID:**
1. เปิด Google Sheets ของคุณ
2. ดู URL: `https://docs.google.com/spreadsheets/d/{SHEETS_ID}/edit`
3. คัดลอกส่วน `{SHEETS_ID}`
4. นำมาใส่ใน `config.js`

---

### 3. Sheet GIDs

```javascript
const SHEET_GIDS = {
    INVENTORY: '1942506251',
    PRICE_HISTORY: '1959869787',
    TRANSACTION_HISTORY: '0'
};
```

**วิธีหา GID:**
1. เปิด Sheet ที่ต้องการ (คลิกที่ tab ด้านล่าง)
2. ดู URL: `https://docs.google.com/spreadsheets/d/{SHEETS_ID}/edit#gid={GID}`
3. คัดลอกส่วน `{GID}`
4. นำมาใส่ใน `config.js`

**หมายเหตุ:** Sheet แรกจะมี GID = `0`

---

### 4. รหัสผ่าน Admin

```javascript
const ADMIN_PASSWORD = 'admin123';
```

**⚠️ คำเตือน:**
- เปลี่ยนรหัสผ่านเป็นของคุณเอง
- ในระบบจริงควรเก็บไว้ที่ server-side
- อย่าแชร์รหัสผ่านนี้กับผู้อื่น

---

## 📝 ไฟล์ที่ใช้ `config.js`

ไฟล์ทั้งหมดที่ต้องโหลด `config.js`:

1. ✅ `index.html` - หน้าหลักของระบบ
2. ✅ `price-management.html` - หน้าจัดการราคา
3. ✅ `test-google-connection.html` - หน้าทดสอบการเชื่อมต่อ

**การโหลด config.js:**
```html
<!-- Load Configuration -->
<script src="config.js"></script>

<!-- Custom Scripts -->
<script src="inventory.js"></script>
```

⚠️ **สำคัญ:** ต้องโหลด `config.js` **ก่อน** `inventory.js` เสมอ!

---

## 🔄 วิธีอัพเดท Configuration

### กรณีที่ 1: เปลี่ยน Google Apps Script URL (Deploy ใหม่)

1. เปิดไฟล์ `config.js`
2. แก้ไขบรรทัด:
   ```javascript
   const GOOGLE_SCRIPT_URL = 'URL_ใหม่ของคุณ';
   ```
3. บันทึกไฟล์
4. Refresh หน้าเว็บ (Ctrl + Shift + R)

### กรณีที่ 2: เปลี่ยน Google Sheets

1. เปิดไฟล์ `config.js`
2. แก้ไขบรรทัด:
   ```javascript
   const GOOGLE_SHEETS_ID = 'SHEETS_ID_ใหม่';
   ```
3. อัพเดท GID ของแต่ละ Sheet (ถ้าจำเป็น)
4. บันทึกไฟล์
5. Refresh หน้าเว็บ (Ctrl + Shift + R)

### กรณีที่ 3: เปลี่ยนรหัสผ่าน Admin

1. เปิดไฟล์ `config.js`
2. แก้ไขบรรทัด:
   ```javascript
   const ADMIN_PASSWORD = 'รหัสผ่านใหม่';
   ```
3. บันทึกไฟล์
4. Refresh หน้าเว็บ (Ctrl + Shift + R)

---

## ✅ การตรวจสอบว่า Config ถูกโหลดหรือไม่

เปิด Console (F12) แล้วพิมพ์:

```javascript
console.log('GOOGLE_SCRIPT_URL:', GOOGLE_SCRIPT_URL);
console.log('GOOGLE_SHEETS_ID:', GOOGLE_SHEETS_ID);
console.log('SHEET_GIDS:', SHEET_GIDS);
```

ถ้าแสดงค่าออกมาถูกต้อง แสดงว่า config ถูกโหลดแล้ว ✅

---

## 🚨 Troubleshooting

### ปัญหา: ไม่สามารถโหลด config.js ได้

**อาการ:**
- Console แสดง error: `config.js:1 Failed to load resource`
- หรือ: `GOOGLE_SCRIPT_URL is not defined`

**วิธีแก้:**
1. ตรวจสอบว่าไฟล์ `config.js` อยู่ในโฟลเดอร์เดียวกับ `index.html`
2. ตรวจสอบชื่อไฟล์ว่าถูกต้อง (ต้องเป็น `config.js` ตัวพิมพ์เล็กทั้งหมด)
3. ตรวจสอบว่า HTML มีการโหลด config.js หรือไม่:
   ```html
   <script src="config.js"></script>
   ```

### ปัญหา: ไม่สามารถเชื่อมต่อ Google Sheets ได้

**อาการ:**
- Console แสดง error: `Failed to fetch prices from Sheets`
- หรือ: `HTTP Error: 404`

**วิธีแก้:**
1. ตรวจสอบว่า `GOOGLE_SCRIPT_URL` ถูกต้อง
2. ตรวจสอบว่า Google Apps Script ถูก Deploy แล้ว
3. ตรวจสอบว่า Deployment เป็น **Web app** และ **Anyone** สามารถเข้าถึงได้
4. ลองเปิด URL ใน browser ดูว่าทำงานหรือไม่

### ปัญหา: ไม่พบข้อมูลราคา

**อาการ:**
- Alert: `ไม่พบข้อมูลราคาใน Google Sheets`

**วิธีแก้:**
1. ไปที่หน้า **จัดการราคา** (price-management.html)
2. Login ด้วยรหัสผ่าน admin
3. กรอกราคาและบันทึก
4. ลองทำรายการใหม่อีกครั้ง

---

## 📚 เอกสารเพิ่มเติม

- [Google Apps Script Documentation](https://developers.google.com/apps-script)
- [Google Sheets API](https://developers.google.com/sheets/api)

---

## 📞 ติดต่อ

หากมีปัญหาหรือข้อสงสัย กรุณาติดต่อผู้ดูแลระบบ

---

**อัพเดทล่าสุด:** 2024
**เวอร์ชัน:** 1.0.0