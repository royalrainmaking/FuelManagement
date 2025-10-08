# ระบบจัดการน้ำมันเชื้อเพลิงอากาศยาน

## ไฟล์หลัก
- `inventory.html` - หน้าระบบจัดการ inventory น้ำมัน
- `inventory.js` - ตรรกะการทำงาน + Google Sheets integration
- `inventory-style.css` - CSS styling

## ไฟล์เสริม
- `google-apps-script.js` - โค้ดสำหรับ Google Apps Script Web App
- `GOOGLE_SHEETS_SETUP.md` - คำแนะนำการเชื่อมต่อ Google Sheets
- `index.html` - ระบบบันทึกข้อมูลเก่า (ไม่สมบูรณ์)

## การใช้งาน

### แบบ Standalone (ไม่ต้องเชื่อมต่อ)
1. เปิด `inventory.html` ในเบราว์เซอร์
2. ระบบจะใช้ localStorage เก็บข้อมูล

### แบบเชื่อมต่อ Google Sheets
1. ทำตามคำแนะนำใน `GOOGLE_SHEETS_SETUP.md`
2. ข้อมูลจะ sync กับ Google Sheets:
   - **อ่านข้อมูล inventory:** จาก gid=1942506251
   - **บันทึก transaction logs:** ไปยัง gid=0

## คุณสมบัติ
- ✅ จัดการ stock น้ำมัน 15 แหล่ง
- ✅ เติมเข้า/จ่ายออกพร้อมคำนวณต้นทุน  
- ✅ รองรับเครื่องบิน 44 ลำ
- ✅ Export CSV อัตโนมัติ
- ✅ Responsive design
- 🆕 Google Sheets integration
- 🆕 Real-time data sync
- 🆕 Cloud backup

## ข้อมูลที่เชื่อมต่อ
- **Google Sheets ID:** 18EaX2GwcZaPFXzcL0B9T4gFRAOhBXdHqZHm1bMJ8-sE
- **Inventory Sheet:** gid=1942506251
- **Transaction Log Sheet:** gid=0