# คู่มือตั้งค่า Image Upload Feature

## ภาพรวม
ระบบนี้ให้ผู้ใช้สามารถอัพโหลดรูปภาพและเอกสาร (JPG, PNG, GIF, PDF) ไปยัง Google Drive และเก็บ URL ลงใน Google Sheets

---

## ขั้นตอนการตั้งค่า

### ขั้นที่ 1: ตั้งค่า Google Cloud Project

**1.1 สร้าง/เปิด Google Cloud Project**
- ไปที่ https://console.cloud.google.com
- สร้าง project ใหม่ หรือเลือก project ที่มีอยู่

**1.2 เปิดใช้ Drive API**
- ไปที่ APIs & Services > Library
- ค้นหา "Google Drive API"
- คลิก Enable

**1.3 สร้าง OAuth 2.0 Credentials (ถ้าต้องการ)**
- ไปที่ APIs & Services > Credentials
- คลิก "Create Credentials" > "OAuth 2.0 Client ID"
- เลือก "Web application"
- ใส่ Authorized redirect URIs:
  - `http://localhost:8000`
  - `http://localhost:3000`
  - URL จริงของเซิร์ฟเวอร์ (เช่น `https://your-domain.com`)
- คัดลอก **Client ID**

### ขั้นที่ 2: อัพเดท config.js

```javascript
const GOOGLE_DRIVE_CONFIG = {
    TARGET_FOLDER_ID: '1OTCL52sA2sqKTDCayxzphe5WB_aP-YFL',
    OAUTH_CLIENT_ID: 'your-client-id-here.apps.googleusercontent.com', // ไส่ Client ID ที่ได้มา
    // ... other config
};
```

### ขั้นที่ 3: เตรียม Google Sheets

**3.1 เพิ่มคอลัมน์ใหม่ใน Transaction_History sheet**

| Column | Header | ประเภท | หมายเหตุ |
|--------|--------|--------|----------|
| K | image_url | Text | URL ของรูปใน Google Drive |
| L | image_filename | Text | ชื่อไฟล์ต้นฉบับ |
| M | image_upload_date | Timestamp | วันที่อัพโหลด |
| N | image_drive_id | Text | File ID ใน Google Drive |

**3.2 ตั้งค่า Sheet (ตัวเลือก)**
```
A1:J100 = ข้อมูล transaction ที่มีอยู่แล้ว
K:N = ข้อมูลรูปภาพใหม่
```

### ขั้นที่ 4: Deploy Google Apps Script

**4.1 เปิด Google Apps Script**
- เปิด Google Sheets ของคุณ
- ไปที่ Extensions > Apps Script

**4.2 คัดลอกและวาง Functions**
- คัดลอกฟังก์ชันต่อไปนี้จาก `google-apps-script.gs`:
  - `doPost()`
  - `uploadFileToGoogleDrive()`
  - `deleteFileFromGoogleDrive()`
  - `saveImageDataToSheets()`
  - `deleteImageDataFromSheets()`

**4.3 Deploy as Web App**
- คลิก "Deploy" > "New Deployment"
- Type: "Web app"
- Execute as: (Google Account ของคุณ)
- Who has access: "Anyone"
- คลิก "Deploy"
- คัดลอก Deployment URL

### ขั้นที่ 5: อัพเดท URL ใน config.js

```javascript
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/[DEPLOYMENT_ID]/exec';
// ตัวอย่าง:
// const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwwGTXgoyNERXX6tKrfX1q7KLuI-LTyQ7Kc7ZUO-x53tfgN2Whk0PZpXY5pSELs2UZn/exec';
```

### ขั้นที่ 6: ตั้งค่า Google Drive Folder Permission

**ให้ Service Account สิทธิ์**
- เปิด Google Drive Folder: https://drive.google.com/drive/folders/1OTCL52sA2sqKTDCayxzphe5WB_aP-YFL
- Share > Advanced
- ดูส่วน "Service Account":
  - หากไม่มี: ให้ Editor access กับ Google Apps Script service account

---

## วิธีใช้งาน

### สำหรับผู้ใช้ปลายทาง

**1. เปิด Modal**
```
- ค้นหาปุ่ม "อัพโหลดเอกสาร" หรือ "Upload Documents"
- คลิกเพื่อเปิด modal
```

**2. เลือกไฟล์**
```
Option A: ลากไฟล์มาวาง (Drag & Drop)
Option B: คลิก "คลิกเพื่อเลือกไฟล์" 
```

**3. ตรวจสอบ Preview**
```
- ดูรูปภาพ preview (สำหรับรูป)
- ดูชื่อไฟล์และขนาด
```

**4. อัพโหลด**
```
- คลิกปุ่ม "อัพโหลด"
- รอ progress bar ถึง 100%
- ตรวจสอบข้อความ "อัพโหลดสำเร็จ"
```

**5. บันทึกรายการ**
```
- ข้อมูลรูปจะบันทึกเมื่อคุณบันทึกรายการเดินบัญชี
- ตรวจสอบใน Google Sheets columns K, L, M, N
```

---

## File Size Limits

| หมายเลข | คำอธิบาย | ค่า |
|--------|---------|-----|
| Max File Size | ขนาดไฟล์สูงสุด | 50 MB |
| Timeout | timeout การ upload | 30 seconds |
| Max Retries | จำนวน retries | 3 times |

---

## Supported File Types

| ประเภท | MIME Type | ตัวอย่าง |
|--------|-----------|--------|
| JPEG | image/jpeg | .jpg, .jpeg |
| PNG | image/png | .png |
| GIF | image/gif | .gif |
| PDF | application/pdf | .pdf |

---

## Troubleshooting

### ❌ Error: "อัพโหลดล้มเหลว"

**สาเหตุที่เป็นไปได้:**
1. ไฟล์ขนาดใหญ่เกิน 50 MB
2. ประเภทไฟล์ไม่รองรับ
3. ไม่มี Internet connection
4. Google Apps Script deployment ล้มเหลว

**วิธีแก้:**
```
1. ตรวจสอบ console: F12 > Console
2. ดูข้อมูล error message
3. ลองเลือกไฟล์อื่น
4. Redeploy Google Apps Script
```

### ❌ Error: "ไม่พบ sheet"

**สาเหตุ:**
- Sheet ID หรือ GID ไม่ถูกต้อง
- Sheet ถูกลบหรือเปลี่ยนชื่อ

**วิธีแก้:**
```
1. ตรวจสอบ config.js:
   - GOOGLE_SHEETS_ID ถูกต้องหรือไม่
   - SHEET_GIDS.TRANSACTION_HISTORY ถูกต้องหรือไม่
2. ตรวจสอบ Google Sheets:
   - Sheet "Transaction_History" มีอยู่หรือไม่
   - GID ตรงกับ URL หรือไม่
```

### ❌ Error: "Permission denied"

**สาเหตุ:**
- Google Drive Folder ไม่มี permission
- Service Account ไม่มีสิทธิ์

**วิธีแก้:**
```
1. เปิด Google Drive Folder
2. Share กับ Apps Script service account
3. ให้ "Editor" access
4. Redeploy Apps Script
```

---

## Verification

### ตรวจสอบว่าระบบพร้อม

```bash
# 1. ตรวจสอบ config.js
grep -n "GOOGLE_DRIVE_CONFIG\|TARGET_FOLDER_ID" config.js

# 2. ตรวจสอบ HTML Modal
grep -n "uploadImageModal\|performImageUpload" index.html

# 3. ตรวจสอบ JavaScript Functions
grep -n "function performImageUpload\|function openUploadImageModal" inventory.js

# 4. ตรวจสอบ Google Sheets Columns
# เปิด Google Sheets และดูคอลัมน์ K, L, M, N
```

### Test Upload

1. เปิด index.html ในเบราว์เซอร์
2. คลิก "อัพโหลดเอกสาร"
3. เลือกไฟล์ทดสอบ (JPG หรือ PNG)
4. คลิก "อัพโหลด"
5. ตรวจสอบ:
   - [ ] ไฟล์ปรากฏใน Google Drive Folder
   - [ ] URL เก็บใน Google Sheets (Column K)
   - [ ] ไม่มี errors ใน Console (F12)

---

## Security Notes

### ⚠️ สิ่งสำคัญ

1. **ไม่เก็บ Credentials ใน Client-side Code**
   - Google Apps Script จัดการ authentication
   - ไม่ต้องเก็บAPI keys ใน JavaScript

2. **Folder Sharing**
   - ใช้ specific Google Drive Folder เท่านั้น
   - ไม่ให้ access root folder

3. **File Validation**
   - ตรวจสอบ MIME type
   - ตรวจสอบขนาด
   - ไม่อนุญาต executable files

---

## Support & Help

หากมีปัญหา:
1. ตรวจสอบ Console (F12 > Console Tab)
2. ดูข้อมูลใน Apps Script Logs
3. ตรวจสอบ Google Drive Folder permissions
4. ตรวจสอบ Google Sheets schema

---

## Version Info

- Feature Version: 1.0.0
- Release Date: December 2025
- Tested Browsers: Chrome, Firefox, Safari, Edge
