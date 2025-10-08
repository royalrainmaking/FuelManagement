# 🚀 Quick Start: ระบบจัดการราคาผ่าน Google Sheets

## ⚡ เริ่มใช้งานใน 5 นาที

### ขั้นตอนที่ 1: อัปเดต Google Apps Script (2 นาที)

1. เปิด Google Sheets ของคุณ
2. ไปที่ **Extensions > Apps Script**
3. คัดลอกโค้ดทั้งหมดจาก `google-apps-script.gs`
4. วางทับโค้ดเดิม
5. บันทึก (Ctrl+S)
6. Deploy:
   - **Deploy > New deployment**
   - เลือก **Web app**
   - **Execute as:** Me
   - **Who has access:** Anyone
   - คลิก **Deploy**
   - **คัดลอก Web app URL**

### ขั้นตอนที่ 2: ตั้งค่าราคาครั้งแรก (2 นาที)

1. เปิด `price-management.html`
2. ล็อกอิน (รหัสผ่าน: `admin123`)
3. กรอกราคา:
   - **ราคาต่อลิตร:** เช่น 35.50
   - **ราคาต่อถัง 200L:** เช่น 7100.00
4. คลิก **บันทึกราคา**
5. ✅ ระบบจะสร้างชีท **Price_History** อัตโนมัติ

### ขั้นตอนที่ 3: ทดสอบระบบ (1 นาที)

1. เปิด `index.html`
2. เปิด Console (F12)
3. ดูข้อความ: `✅ Loaded prices from Google Sheets`
4. ทำรายการทดสอบ (เติมน้ำมัน/จ่ายน้ำมัน)
5. ✅ เสร็จสิ้น!

---

## 📊 ตรวจสอบว่าทำงานถูกต้อง

### ใน Google Sheets:
- ✅ มีชีท **Price_History**
- ✅ มี Header 7 คอลัมน์: Timestamp, Date, Time, Price Per Liter, Price Per Drum, Updated By, Notes
- ✅ มีข้อมูลแถวแรก (ราคาที่คุณตั้ง)

### ใน Browser Console (F12):
```
✅ Loaded prices from Google Sheets: {pricePerLiter: 35.5, pricePerDrum: 7100}
```

### ใน price-management.html:
- ✅ แสดงข้อความ: "✅ บันทึกราคาสำเร็จ! (บันทึกทั้ง localStorage และ Google Sheets)"

---

## 🔧 ถ้ามีปัญหา

### ปัญหา: ไม่มีชีท Price_History
**แก้ไข:** เปิด Apps Script > เลือกฟังก์ชัน `createPriceHistorySheet` > Run

### ปัญหา: บันทึกไม่สำเร็จ
**แก้ไข:** ตรวจสอบว่า Deploy แล้ว และ URL ถูกต้อง

### ปัญหา: ดึงราคาไม่ได้
**แก้ไข:** 
```javascript
// ทดสอบใน Console
console.log(localStorage.getItem('googleScriptUrl'));
console.log(localStorage.getItem('sheetsId'));
```

---

## 📖 เอกสารเพิ่มเติม

- **คู่มือฉบับเต็ม:** `PRICE_SHEET_SETUP_GUIDE.md`
- **บันทึกการเปลี่ยนแปลง:** `CHANGELOG.md`
- **คู่มือ Google Apps Script:** `GOOGLE_APPS_SCRIPT_UPDATE_GUIDE.md`

---

## 🎯 สิ่งที่เปลี่ยนแปลง

### ก่อน (Version 2.0):
- ❌ ราคาเก็บใน localStorage เท่านั้น
- ❌ ไม่มีประวัติการเปลี่ยนแปลง
- ❌ ต้องตั้งราคาใหม่ทุกเครื่อง

### หลัง (Version 2.1):
- ✅ ราคาเก็บใน Google Sheets (Real-time)
- ✅ มีประวัติการเปลี่ยนแปลงทั้งหมด
- ✅ ตั้งราคาครั้งเดียว ใช้ได้ทุกเครื่อง
- ✅ มี fallback เป็น localStorage

---

## 💡 Tips

1. **ตั้งราคาผ่าน price-management.html เท่านั้น** - อย่าแก้ไขใน Google Sheets โดยตรง
2. **ตรวจสอบ Console เป็นระยะ** - ดูว่าดึงราคาจาก Sheets หรือ localStorage
3. **Backup ชีท Price_History** - Export เป็น CSV เป็นระยะ

---

**เวอร์ชัน:** 2.1  
**อัปเดตล่าสุด:** 2024-01-15