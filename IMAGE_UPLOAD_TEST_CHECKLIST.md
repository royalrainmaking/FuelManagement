# Image Upload Feature - Test Checklist

## ✅ Pre-Deployment Checklist

### Configuration Verification
- [ ] `config.js` มี `GOOGLE_DRIVE_CONFIG` object
- [ ] `GOOGLE_DRIVE_CONFIG.TARGET_FOLDER_ID` ถูกตั้งค่า
- [ ] `GOOGLE_SCRIPT_URL` ถูกตั้งค่าให้ชี้ไปยัง Apps Script deployment
- [ ] Google Sheets columns K, L, M, N มีอยู่
- [ ] Google Apps Script deploy as Web App สำเร็จ

### File Structure
- [ ] `index.html` มี `uploadImageModal` element
- [ ] `inventory.js` มี functions:
  - [ ] `openUploadImageModal()`
  - [ ] `closeUploadImageModal()`
  - [ ] `performImageUpload()`
  - [ ] `validateFile()`
  - [ ] `displayImagePreview()`
  - [ ] `fileToBase64()`
- [ ] `google-apps-script.gs` มี functions:
  - [ ] `doPost()`
  - [ ] `uploadFileToGoogleDrive()`
  - [ ] `saveImageDataToSheets()`
  - [ ] `deleteImageDataFromSheets()`
  - [ ] `deleteFileFromGoogleDrive()`

---

## 🧪 Functional Testing

### Test 1: Open Modal
**Steps:**
1. เปิด index.html
2. หาปุ่ม "อัพโหลดเอกสาร"
3. คลิกปุ่ม

**Expected Result:**
- [ ] Modal ปรากฏขึ้น
- [ ] Modal มีหัวข้อ "อัพโหลดเอกสาร/ใบสรุป"
- [ ] มีพื้นที่ drag-drop
- [ ] มีปุ่ม "ปิด"

---

### Test 2: File Selection - Click
**Steps:**
1. เปิด Modal
2. คลิก "คลิกเพื่อเลือกไฟล์"
3. เลือกไฟล์ JPG/PNG จากเครื่อง

**Expected Result:**
- [ ] File input dialog ปรากฏ
- [ ] ไฟล์ถูกเลือก
- [ ] Preview ของรูปแสดงขึ้น
- [ ] ปุ่ม "อัพโหลด" และ "ล้าง" ปรากฏ
- [ ] ชื่อไฟล์และขนาดแสดงใน preview section

---

### Test 3: File Selection - Drag & Drop
**Steps:**
1. เปิด Modal
2. ลากไฟล์ (JPG/PNG) มาวางที่พื้นที่ drag-drop

**Expected Result:**
- [ ] Drop zone เปลี่ยนสี
- [ ] ไฟล์ถูกเลือก
- [ ] Preview ปรากฏ
- [ ] ปุ่ม "อัพโหลด" ปรากฏ

---

### Test 4: File Validation - Large File
**Steps:**
1. เปิด Modal
2. พยายามเลือกไฟล์ที่ > 50 MB

**Expected Result:**
- [ ] Error message: "ขนาดไฟล์เกิน 50 MB"
- [ ] ไฟล์ไม่ถูกเลือก
- [ ] ไม่มีปุ่ม "อัพโหลด"

---

### Test 5: File Validation - Invalid Type
**Steps:**
1. เปิด Modal
2. พยายามเลือกไฟล์ .exe, .txt, หรือประเภทอื่น

**Expected Result:**
- [ ] Error message: "ประเภทไฟล์ไม่สนับสนุน"
- [ ] ไฟล์ไม่ถูกเลือก
- [ ] ไม่มีปุ่ม "อัพโหลด"

---

### Test 6: Upload - Successful
**Steps:**
1. เลือกไฟล์ JPG/PNG (< 5 MB)
2. คลิก "อัพโหลด"
3. รอให้ progress bar ถึง 100%
4. ตรวจสอบข้อความ success

**Expected Result:**
- [ ] Progress bar ปรากฏ
- [ ] Progress ขยับจาก 0% ถึง 100%
- [ ] Message: "อัพโหลดสำเร็จ!"
- [ ] Modal ปิดอัตโนมัติหลังจาก 2-3 วินาที
- [ ] ไฟล์ปรากฏใน Google Drive Folder ภายใน 5 วินาที

---

### Test 7: Upload - Network Error
**Steps:**
1. ตัด Internet connection
2. เลือกไฟล์
3. คลิก "อัพโหลด"
4. รอสักครู่

**Expected Result:**
- [ ] Progress bar ปรากฏ
- [ ] Progress หยุด (ไม่ถึง 100%)
- [ ] Error message ปรากฏ
- [ ] ไม่มีไฟล์ใน Google Drive
- [ ] Modal ไม่ปิดอัตโนมัติ

---

### Test 8: Upload - Timeout
**Steps:**
1. ลดแบนวิดท์ (ใช้ DevTools Network Throttling)
2. เลือกไฟล์ที่ใหญ่ (3-5 MB)
3. คลิก "อัพโหลด"
4. รอเกิน 30 วินาที

**Expected Result:**
- [ ] Progress bar ปรากฏ
- [ ] หลังจาก ~30s, error message ปรากฏ
- [ ] Message: "timeout" หรือ "connection failed"

---

### Test 9: Clear Button
**Steps:**
1. เลือกไฟล์
2. คลิก "ล้าง"

**Expected Result:**
- [ ] Preview หายไป
- [ ] File name หายไป
- [ ] ปุ่ม "อัพโหลด" และ "ล้าง" หายไป
- [ ] File input reset
- [ ] สามารถเลือกไฟล์ใหม่ได้

---

### Test 10: Close Modal
**Steps:**
1. เปิด Modal
2. คลิก "ปิด" หรือ X button

**Expected Result:**
- [ ] Modal ปิด
- [ ] Page ด้านหลัง ยังสามารถ scroll ได้

---

## 🌐 Cross-Browser Testing

| Browser | Version | Desktop | Mobile | Result | Notes |
|---------|---------|---------|--------|--------|-------|
| Chrome | Latest | [ ] | [ ] | ✓/✗ | |
| Firefox | Latest | [ ] | [ ] | ✓/✗ | |
| Safari | Latest | [ ] | [ ] | ✓/✗ | |
| Edge | Latest | [ ] | [ ] | ✓/✗ | |
| Chrome Mobile | Latest | - | [ ] | ✓/✗ | |
| Safari Mobile | Latest | - | [ ] | ✓/✗ | |

---

## 📱 Responsive Testing

### Desktop (1920x1080)
- [ ] Modal กลาง screen
- [ ] ปุ่มและ input visible
- [ ] Preview ขนาด 200px max
- [ ] ไม่มี scroll ไม่จำเป็น

### Tablet (768x1024)
- [ ] Modal ปรับขนาด width: 95%
- [ ] ปุ่มเรียง vertical
- [ ] Touch interactions ทำงาน
- [ ] Drag & drop ทำงาน (บางอย่าง)

### Mobile (375x667)
- [ ] Modal เต็มความกว้าง (ขอบ padding)
- [ ] ปุ่มเรียง stack
- [ ] Text readable (font size >= 14px)
- [ ] File input ทำงาน

**Test Command:**
```
DevTools > Toggle Device Toolbar (Ctrl+Shift+M)
เลือก Responsive > Custom 375x667
```

---

## 🔍 Console & Error Testing

### F12 Console Checks
- [ ] ไม่มี JavaScript errors
- [ ] ไม่มี warnings ที่ critical
- [ ] Fetch requests สำเร็จ (status 200)
- [ ] API responses ถูกต้อง

**Check logs:**
```javascript
// DevTools > Console > ค้นหา:
// ✅ ไฟล์อัพโหลดสำเร็จ
// ✅ บันทึกข้อมูลรูปภาพสำเร็จ
// ❌ ไม่ควรมี "Uncaught Error"
```

---

## 📊 Google Sheets Verification

### Check after Upload
1. เปิด Google Sheets: https://docs.google.com/spreadsheets/d/18EaX2GwcZaPFXzcL0B9T4gFRAOhBXdHqZHm1bMJ8-sE
2. ไปที่ sheet "Transaction_History"
3. ตรวจสอบคอลัมน์ K-N

**Expected:**
- [ ] Column K (image_url): มี URL
- [ ] Column L (image_filename): มีชื่อไฟล์
- [ ] Column M (image_upload_date): มีวันที่
- [ ] Column N (image_drive_id): มี File ID

---

## 🗂️ Google Drive Verification

### Check Upload Folder
1. เปิด Google Drive: https://drive.google.com/drive/folders/1OTCL52sA2sqKTDCayxzphe5WB_aP-YFL
2. ตรวจสอบไฟล์ที่อัพโหลด

**Expected:**
- [ ] ไฟล์มีชื่อเดียวกับที่อัพโหลด
- [ ] ไฟล์ได้รับ description: "อัพโหลดโดย ระบบจัดการน้ำมัน เมื่อ [วันที่]"
- [ ] ไฟล์สามารถเปิดได้
- [ ] Preview ทำงาน

---

## 🧠 Edge Cases

### Test 11: Duplicate Upload
**Steps:**
1. อัพโหลดไฟล์เดียวกัน 2 ครั้ง

**Expected Result:**
- [ ] ไฟล์ทั้ง 2 อัพโหลดสำเร็จ
- [ ] มี timestamp ต่างกัน
- [ ] ไม่มี conflict

---

### Test 12: Special Characters in Filename
**Steps:**
1. เลือกไฟล์ชื่อ: "test_ไฟล์_#@!.jpg"
2. อัพโหลด

**Expected Result:**
- [ ] อัพโหลดสำเร็จ
- [ ] ชื่อไฟล์เก็บถูกต้อง
- [ ] URL สามารถเปิดได้

---

### Test 13: Rapid Multiple Uploads
**Steps:**
1. อัพโหลดไฟล์ 3 ไฟล์เรียงต่อกัน (ไม่รอให้เสร็จ)

**Expected Result:**
- [ ] ทั้ง 3 ไฟล์อัพโหลดสำเร็จ
- [ ] ไม่มี conflict
- [ ] ไม่มี errors

---

## 📝 Final Checklist

### Before Going Live
- [ ] ทดสอบทั้ง 13 test cases
- [ ] Cross-browser testing สำเร็จ
- [ ] Responsive testing สำเร็จ
- [ ] Console ไม่มี errors
- [ ] Google Sheets มีข้อมูล
- [ ] Google Drive มีไฟล์
- [ ] ไม่มี security issues
- [ ] Documentation อ่านรู้เรื่อง
- [ ] User can upload และ use feature

### Known Issues / Limitations
- [ ] Drag & drop ใน iPad ไม่เสถียร
- [ ] PDF preview ไม่แสดง thumbnail
- [ ] Large files (>10MB) ช้า

### Sign-off
- Tested by: ________________
- Date: ________________
- Status: [ ] PASS [ ] FAIL
- Notes: ___________________

---

## 📋 Test Report Template

```
Test Case: [Test Name]
Date: [YYYY-MM-DD]
Browser: [Browser Name] v[Version]
Device: [Desktop/Tablet/Mobile]

Steps Performed:
1. ...
2. ...

Expected Result:
...

Actual Result:
...

Status: [ ] PASS [ ] FAIL

Notes:
...

Tested By: [Name]
```

---

## 🎯 Performance Notes

### Expected Performance
- Modal open: < 100ms
- File preview (image): < 500ms
- Upload (1-5MB): 5-15 seconds
- Save to Sheets: 2-5 seconds

### Optimize if slower
- Check network bandwidth
- Reduce image quality before upload
- Enable server compression
- Use CDN for assets
