# ฟีเจอร์ปุ่มยืนยันยอดรายวัน

## 📋 คำอธิบาย
ฟีเจอร์นี้เพิ่มปุ่ม "ยืนยันยอด" ในทุก ๆ fuel-card เพื่อให้ผู้ใช้สามารถยืนยันและบันทึกข้อมูลเอกสารรายวัน

## ✨ ฟีเจอร์หลัก

### 1. ปุ่มยืนยันยอด
- ✅ ปุ่มสีเขียวที่มี animation มีอยู่ที่ด้านล่างของทุก fuel-card
- ✅ ต้องกรอกเพียงชื่อผู้ทำรายการเท่านั้น
- ✅ โอนไปยัง sheet ID: **1512968674**

### 2. พฤติกรรมปุ่ม
| สถานะ | อธิบาย |
|------|--------|
| **ปรากฏ** | ปุ่มแสดงเมื่อยังไม่ได้ยืนยันในวันนี้ |
| **หายไป** | หลังจากคลิก/ยืนยัน ปุ่มจะหายไปทันที |
| **กลับมา** | หลังเที่ยงคืน (00:00) ของวันถัดไป ปุ่มจะกลับมาใหม่ |

### 3. การจัดเก็บข้อมูล
- **Location**: Sheet ID `1512968674` (ที่กำหนด)
- **Columns**:
  - A: วันที่ (YYYY-MM-DD)
  - B: เวลา (HH:MM:SS)
  - C: ชื่อผู้ทำรายการ
  - D: ชื่อแหล่งน้ำมัน
  - E: Source ID
  - F: Timestamp

## 🛠️ เทคนิคการทำงาน

### Frontend (JavaScript/HTML)
```javascript
// ปุ่มแสดง/ซ่อนตามวันที่
updateDailyConfirmationButtons()  // ตรวจสอบวันที่และ localStorage

// แสดง Modal สำหรับกรอกชื่อ
openDailyConfirmationModal(sourceId, sourceName)

// ส่งข้อมูลไปยัง Google Sheets
submitDailyConfirmation()
```

### Backend (Google Apps Script)
```javascript
function logDailyConfirmation(dataString, sheetsId, gid)
// - รับข้อมูลจาก frontend
// - สร้าง header หากต้องการ
// - บันทึกข้อมูลลงใน sheet
```

### Storage (localStorage)
```javascript
// เก็บสถานะการยืนยัน
localStorage.setItem(`confirmed_${sourceId}`, dateString)
// เช่น: confirmed_purchase = "2024-01-15"

// เก็บวันที่ล่าสุดที่ตรวจสอบ
localStorage.setItem('lastCheckedDate', dateString)
```

## 📱 User Interface

### ปุ่มยืนยันยอด
- **สี**: เขียว (#27ae60 - #229954)
- **ตำแหน่ง**: ด้านล่างของแต่ละ fuel-card
- **Icon**: ✓ Check Circle
- **Text**: "ยืนยันยอด"

### Modal
- **ส่วนประกอบ**:
  - ชื่อแหล่งน้ำมัน (แสดงสำหรับอ้างอิง)
  - ช่องกรอก "ชื่อผู้ทำรายการ" (required)
  - ปุ่ม "ยืนยัน" และ "ยกเลิก"

## ⏰ การตรวจสอบเที่ยงคืน

- **ความถี่**: ตรวจสอบทุก 1 นาที
- **การทำงาน**: 
  1. เปรียบเทียบวันที่ปัจจุบันกับ localStorage
  2. หากวันที่เปลี่ยน → รีเซ็ตปุ่มให้แสดงใหม่
  3. อัพเดท localStorage ด้วยวันที่ปัจจุบัน

## 📝 ไฟล์ที่แก้ไข

### 1. `inventory.js`
- เพิ่มปุ่มยืนยันยอดลงใน HTML ของ fuel card
- ฟังก์ชันแสดง/ซ่อนปุ่ม: `updateDailyConfirmationButtons()`
- ฟังก์ชันเปิด Modal: `openDailyConfirmationModal()`
- ฟังก์ชันส่งข้อมูล: `submitDailyConfirmation()`
- ฟังก์ชันตรวจสอบเที่ยงคืน: `checkMidnightTransition()`

### 2. `inventory-style.css`
- `.card-footer-section` - ส่วนท้ายของ card สำหรับปุ่ม
- `.btn-confirm-daily` - สไตล์ปุ่มยืนยัน
- Animation และ hover effects

### 3. `google-apps-script.gs`
- เพิ่ม case ใน `doGet()`: `logDailyConfirmation`
- ฟังก์ชันใหม่: `logDailyConfirmation()`

## 🔧 การใช้งาน

### สำหรับผู้ใช้
1. เมื่อมี fuel-card จะเห็นปุ่ม "ยืนยันยอด" สีเขียวที่ด้านล่าง
2. คลิกปุ่มเพื่อเปิด Modal
3. กรอกชื่อผู้ทำรายการ
4. คลิก "ยืนยัน"
5. ปุ่มจะหายไป
6. ในวันถัดไปเมื่อเวลา 00:00 ขึ้นไป ปุ่มจะกลับมาปรากฏใหม่

### สำหรับ Admin
1. เปิด Google Sheets ไปยัง Sheet ID: `1512968674`
2. ตรวจสอบบันทึก "ยืนยันยอด" ในแต่ละวัน
3. ข้อมูลจะบันทึกอัตโนมัติพร้อมวันที่ เวลา ชื่อผู้ทำรายการ และแหล่งน้ำมัน

## ⚙️ Configuration

**Sheet ID สำหรับบันทึกยืนยันยอด**: `1512968674`

การเปลี่ยนแปลงใน `submitDailyConfirmation()`:
```javascript
const url = `${GOOGLE_SCRIPT_URL}?action=logDailyConfirmation&sheetsId=${GOOGLE_SHEETS_ID}&gid=1512968674&...`
```

## 🐛 Troubleshooting

### ปุ่มไม่แสดง
- ✓ ตรวจสอบ Console (F12) ว่า JavaScript มี error หรือไม่
- ✓ ลบ localStorage: `localStorage.clear()` แล้ว reload
- ✓ ตรวจสอบว่า fuel cards ถูกสร้างสำเร็จหรือไม่

### ข้อมูลไม่บันทึก
- ✓ ตรวจสอบ Google Apps Script URL ใน `config.js`
- ✓ ตรวจสอบ Sheet ID `1512968674` มีอยู่ในไฟล์ Sheets หรือไม่
- ✓ ดู Console ใน Google Apps Script เพื่อดู error details

### ปุ่มหลังจากเที่ยงคืนยังไม่แสดง
- ✓ Refresh หน้าเว็บ
- ✓ localStorage อาจมี date เก่า ให้ลบและ refresh

## 📊 ตัวอย่างข้อมูล

**Google Sheets Row**:
```
วันที่: 2024-01-15
เวลา: 14:30:45
ผู้ทำรายการ: นาย สมชาย
แหล่งน้ำมัน: สนามบินนครสวรรค์ แท๊ง 1
Source ID: nakhonsawan_tank1
Timestamp: 2024-01-15 14:30:45
```

## 🎯 Future Improvements

- [ ] ลบเมนูเลือกวันที่ (date picker) สำหรับ backdate entries
- [ ] นำเข้า Data Validation สำหรับการตรวจสอบข้อมูล
- [ ] ระบบ Notification เมื่อบันทึกสำเร็จ
- [ ] Export รายงานรายวัน

---

**Version**: 1.0.0  
**Updated**: 2024  
**Status**: ✅ Active