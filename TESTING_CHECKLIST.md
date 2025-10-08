# ✅ Testing Checklist - ระบบจัดการราคาผ่าน Google Sheets

## 📋 รายการทดสอบ

### 1️⃣ ทดสอบ Google Apps Script

#### 1.1 ทดสอบสร้างชีท Price_History
- [ ] เปิด Apps Script Editor
- [ ] เลือกฟังก์ชัน `createPriceHistorySheet`
- [ ] คลิก Run
- [ ] ตรวจสอบว่ามีชีท **Price_History** ใน Google Sheets
- [ ] ตรวจสอบว่ามี Header 7 คอลัมน์
- [ ] ตรวจสอบว่ามีข้อมูลแถวแรก (ราคา 0, Updated By: System)

**ผลลัพธ์ที่คาดหวัง:**
```
✅ ชีท Price_History ถูกสร้างสำเร็จ
✅ Header: Timestamp, Date, Time, Price Per Liter, Price Per Drum, Updated By, Notes
✅ แถวแรก: [timestamp], [date], [time], 0, 0, "System", "Initial setup"
```

#### 1.2 ทดสอบดึงราคาปัจจุบัน
- [ ] เปิด Browser
- [ ] เปิด Console (F12)
- [ ] รันคำสั่ง:
```javascript
const url = `${localStorage.getItem('googleScriptUrl')}?action=getCurrentPrices&sheetsId=${localStorage.getItem('sheetsId')}`;
fetch(url).then(r => r.json()).then(data => console.log(data));
```
- [ ] ตรวจสอบ Response

**ผลลัพธ์ที่คาดหวัง:**
```json
{
  "success": true,
  "data": {
    "pricePerLiter": 0,
    "pricePerDrum": 0,
    "lastUpdated": "2024-01-15 10:30:00",
    "updatedBy": "System",
    "notes": "Initial setup"
  }
}
```

#### 1.3 ทดสอบอัปเดตราคา
- [ ] รันคำสั่งใน Console:
```javascript
const data = JSON.stringify({
  pricePerLiter: 35.50,
  pricePerDrum: 7100.00,
  updatedBy: 'Test',
  notes: 'Testing update'
});
const url = `${localStorage.getItem('googleScriptUrl')}?action=updatePrices&sheetsId=${localStorage.getItem('sheetsId')}&data=${encodeURIComponent(data)}`;
fetch(url).then(r => r.json()).then(data => console.log(data));
```
- [ ] ตรวจสอบ Response
- [ ] ตรวจสอบใน Google Sheets ว่ามีแถวใหม่

**ผลลัพธ์ที่คาดหวัง:**
```json
{
  "success": true,
  "message": "Prices updated successfully",
  "data": {
    "pricePerLiter": 35.5,
    "pricePerDrum": 7100,
    "timestamp": "2024-01-15 10:35:00"
  }
}
```

#### 1.4 ทดสอบดึงประวัติราคา
- [ ] รันคำสั่งใน Console:
```javascript
const url = `${localStorage.getItem('googleScriptUrl')}?action=getPriceHistory&sheetsId=${localStorage.getItem('sheetsId')}`;
fetch(url).then(r => r.json()).then(data => console.log(data));
```
- [ ] ตรวจสอบว่าได้ข้อมูลทั้งหมด

**ผลลัพธ์ที่คาดหวัง:**
```json
{
  "success": true,
  "data": [
    {
      "id": "price_0_...",
      "timestamp": "2024-01-15 10:35:00",
      "pricePerLiter": 35.5,
      "pricePerDrum": 7100,
      ...
    },
    ...
  ],
  "count": 2
}
```

---

### 2️⃣ ทดสอบ price-management.html

#### 2.1 ทดสอบการล็อกอิน
- [ ] เปิด `price-management.html`
- [ ] กรอกรหัสผ่านผิด → ควรแสดง error
- [ ] กรอกรหัสผ่านถูก (`admin123`) → ควรเข้าสู่หน้าจัดการ

**ผลลัพธ์ที่คาดหวัง:**
```
✅ รหัสผ่านผิด → แสดง "รหัสผ่านไม่ถูกต้อง"
✅ รหัสผ่านถูก → เข้าสู่หน้าจัดการราคา
```

#### 2.2 ทดสอบโหลดราคาปัจจุบัน
- [ ] เปิด Console (F12)
- [ ] ดูว่ามีการเรียก `fetchCurrentPricesFromSheets()`
- [ ] ตรวจสอบว่าฟิลด์ราคาถูกกรอกอัตโนมัติ

**ผลลัพธ์ที่คาดหวัง:**
```
✅ ฟิลด์ "ราคาต่อลิตร" แสดงราคาล่าสุดจาก Sheets
✅ ฟิลด์ "ราคาต่อถัง 200L" แสดงราคาล่าสุดจาก Sheets
✅ แสดง "อัพเดทล่าสุด: [timestamp]"
```

#### 2.3 ทดสอบบันทึกราคา
- [ ] กรอกราคาใหม่:
  - ราคาต่อลิตร: 36.00
  - ราคาต่อถัง: 7200.00
- [ ] คลิก "บันทึกราคา"
- [ ] ดูข้อความยืนยัน
- [ ] เปิด Console ดู log
- [ ] ตรวจสอบใน Google Sheets

**ผลลัพธ์ที่คาดหวัง:**
```
✅ แสดงข้อความ: "✅ บันทึกราคาสำเร็จ! (บันทึกทั้ง localStorage และ Google Sheets)"
✅ Console แสดง: Success response
✅ Google Sheets มีแถวใหม่ด้วยราคา 36.00 และ 7200.00
✅ localStorage มีข้อมูลราคาใหม่
```

#### 2.4 ทดสอบ Loading Indicator
- [ ] กรอกราคาใหม่
- [ ] คลิก "บันทึกราคา"
- [ ] สังเกตปุ่ม

**ผลลัพธ์ที่คาดหวัง:**
```
✅ ปุ่มเปลี่ยนเป็น "กำลังบันทึก..." พร้อม spinner
✅ ปุ่ม disabled ขณะบันทึก
✅ หลังบันทึกเสร็จ ปุ่มกลับมาเป็นปกติ
```

#### 2.5 ทดสอบ Fallback (ไม่มี Google Sheets)
- [ ] ลบ `googleScriptUrl` จาก localStorage:
```javascript
localStorage.removeItem('googleScriptUrl');
```
- [ ] รีเฟรชหน้า
- [ ] กรอกราคาและบันทึก

**ผลลัพธ์ที่คาดหวัง:**
```
✅ แสดงข้อความ: "✅ บันทึกราคาสำเร็จ! (บันทึกใน localStorage เท่านั้น - ยังไม่ได้ตั้งค่า Google Sheets)"
✅ ราคาถูกบันทึกใน localStorage
```

---

### 3️⃣ ทดสอบ inventory.js (index.html)

#### 3.1 ทดสอบโหลดราคาจาก Google Sheets
- [ ] เปิด `index.html`
- [ ] เปิด Console (F12)
- [ ] ดูข้อความ log

**ผลลัพธ์ที่คาดหวัง:**
```
✅ Console แสดง: "✅ Loaded prices from Google Sheets: {pricePerLiter: 36, pricePerDrum: 7200}"
```

#### 3.2 ทดสอบเติมน้ำมัน (Refill) - ลิตร
- [ ] คลิก "เติมน้ำมัน"
- [ ] เลือกแหล่งน้ำมัน: แท๊ง 1
- [ ] กรอกข้อมูล:
  - ผู้ปฏิบัติงาน: Test User
  - หน่วย: Test Unit
  - จำนวนลิตร: 100
- [ ] คลิก "บันทึก"
- [ ] ดู UID Modal

**ผลลัพธ์ที่คาดหวัง:**
```
✅ Modal แสดง UID
✅ แสดงจำนวน: 100 ลิตร
✅ ราคาที่ใช้คือ 36.00 บาท/ลิตร (จาก Google Sheets)
✅ ยอดรวม: 3,600 บาท
```

#### 3.3 ทดสอบเติมน้ำมัน (Refill) - ถัง
- [ ] คลิก "เติมน้ำมัน"
- [ ] เลือกแหล่งน้ำมัน: ถัง 200L #1
- [ ] กรอกข้อมูล:
  - ผู้ปฏิบัติงาน: Test User
  - หน่วย: Test Unit
  - จำนวนถัง: 2
- [ ] คลิก "บันทึก"
- [ ] ดู UID Modal

**ผลลัพธ์ที่คาดหวัง:**
```
✅ Modal แสดง UID
✅ แสดงจำนวน: 2 ถัง (400 ลิตร)
✅ ราคาที่ใช้คือ 7,200 บาท/ถัง (จาก Google Sheets)
✅ ยอดรวม: 14,400 บาท
```

#### 3.4 ทดสอบซื้อจาก ปตท. (PTT Purchase)
- [ ] คลิก "ซื้อจาก ปตท."
- [ ] กรอกข้อมูล:
  - ผู้ปฏิบัติงาน: Test User
  - หน่วย: Test Unit
  - ปลายทาง: แท๊ง 1
  - จำนวนลิตร: 500
- [ ] คลิก "บันทึก"
- [ ] ดู UID Modal

**ผลลัพธ์ที่คาดหวัง:**
```
✅ Modal แสดง UID
✅ แสดงจำนวน: 500 ลิตร
✅ ราคาที่ใช้คือ 36.00 บาท/ลิตร (จาก Google Sheets)
✅ ยอดรวม: 18,000 บาท
```

#### 3.5 ทดสอบ Fallback (ไม่มี Google Sheets)
- [ ] ปิดอินเทอร์เน็ต หรือ ลบ `googleScriptUrl`
- [ ] รีเฟรชหน้า
- [ ] เปิด Console ดู log
- [ ] ทำรายการเติมน้ำมัน

**ผลลัพธ์ที่คาดหวัง:**
```
✅ Console แสดง: "⚠️ Failed to load prices from Google Sheets, using localStorage: ..."
✅ ระบบใช้ราคาจาก localStorage แทน
✅ ทำรายการได้ปกติ
```

---

### 4️⃣ ทดสอบ Integration (End-to-End)

#### 4.1 Scenario: แอดมินเปลี่ยนราคา → ผู้เติมน้ำมันใช้ราคาใหม่
1. [ ] แอดมินเปิด `price-management.html`
2. [ ] เปลี่ยนราคาเป็น 37.00 และ 7400.00
3. [ ] บันทึก
4. [ ] ผู้เติมน้ำมันเปิด `index.html` (หรือรีเฟรช)
5. [ ] ทำรายการเติมน้ำมัน
6. [ ] ตรวจสอบว่าใช้ราคา 37.00

**ผลลัพธ์ที่คาดหวัง:**
```
✅ ผู้เติมน้ำมันได้ราคาใหม่ทันที (37.00)
✅ UID Modal แสดงราคา 37.00
✅ Google Sheets บันทึกราคา 37.00
```

#### 4.2 Scenario: ดูประวัติการเปลี่ยนแปลงราคา
1. [ ] เปิด Google Sheets
2. [ ] ไปที่ชีท **Price_History**
3. [ ] ดูข้อมูลทั้งหมด

**ผลลัพธ์ที่คาดหวัง:**
```
✅ มีข้อมูลทุกครั้งที่เปลี่ยนราคา
✅ แสดง Timestamp, ราคา, ผู้แก้ไข
✅ เรียงจากเก่าไปใหม่
```

#### 4.3 Scenario: ระบบทำงานโดยไม่มีอินเทอร์เน็ต
1. [ ] ตั้งราคาใน `price-management.html` (มีอินเทอร์เน็ต)
2. [ ] ปิดอินเทอร์เน็ต
3. [ ] เปิด `index.html`
4. [ ] ทำรายการเติมน้ำมัน

**ผลลัพธ์ที่คาดหวัง:**
```
✅ ระบบใช้ราคาจาก localStorage
✅ ทำรายการได้ปกติ
✅ Console แสดง warning แต่ไม่ error
```

---

## 📊 สรุปผลการทดสอบ

### ✅ ผ่านทั้งหมด
- [ ] Google Apps Script ทำงานถูกต้อง
- [ ] price-management.html บันทึกราคาได้
- [ ] index.html ดึงราคาจาก Sheets ได้
- [ ] Fallback ทำงานเมื่อไม่มี Sheets
- [ ] ประวัติราคาถูกบันทึกครบถ้วน

### ⚠️ พบปัญหา
- [ ] ระบุปัญหา: _______________________
- [ ] วิธีแก้: _______________________

---

## 🔍 Performance Testing

### ทดสอบความเร็ว
- [ ] วัดเวลาโหลดราคาจาก Google Sheets: _____ วินาที
- [ ] วัดเวลาโหลดราคาจาก localStorage: _____ วินาที
- [ ] วัดเวลาบันทึกราคาไป Google Sheets: _____ วินาที

**เป้าหมาย:**
- ⏱️ โหลดจาก Sheets: < 2 วินาที
- ⏱️ โหลดจาก localStorage: < 0.1 วินาที
- ⏱️ บันทึกไป Sheets: < 3 วินาที

---

## 📝 หมายเหตุ

- ทดสอบทุกครั้งหลังอัปเดตโค้ด
- ทดสอบใน Browser หลายตัว (Chrome, Firefox, Edge)
- ทดสอบทั้งบนคอมพิวเตอร์และมือถือ
- เก็บ log ของการทดสอบไว้

---

**ผู้ทดสอบ:** _______________________  
**วันที่:** _______________________  
**เวอร์ชัน:** 2.1  
**ผลการทดสอบ:** ✅ ผ่าน / ⚠️ มีปัญหา / ❌ ไม่ผ่าน