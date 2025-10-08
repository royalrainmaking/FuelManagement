# คำแนะนำการอัปเดต Google Apps Script

## 📋 ภาพรวม
เอกสารนี้อธิบายวิธีการอัปเดต Google Apps Script เพื่อรองรับฟีเจอร์ใหม่:
- **UID** (Transaction ID) - รหัสธุรกรรมแบบ FT0001, FT0002, ...
- **Book No.** - เลขที่หนังสือสำหรับการซื้อจาก ปตท.
- **Receipt No.** - เลขที่ใบเสร็จสำหรับการซื้อจาก ปตท.

---

## 🚀 ขั้นตอนการอัปเดต

### 1. เปิด Google Apps Script Editor

1. เปิด Google Sheets ของคุณ: [https://docs.google.com/spreadsheets/d/18EaX2GwcZaPFXzcL0B9T4gFRAOhBXdHqZHm1bMJ8-sE/edit](https://docs.google.com/spreadsheets/d/18EaX2GwcZaPFXzcL0B9T4gFRAOhBXdHqZHm1bMJ8-sE/edit)
2. คลิกเมนู **Extensions** > **Apps Script**
3. จะเปิดหน้าต่าง Google Apps Script Editor

### 2. แทนที่โค้ดเดิมด้วยโค้ดใหม่

1. ในหน้า Apps Script Editor ให้เลือกไฟล์ `Code.gs` (หรือไฟล์หลักที่มีโค้ด)
2. **ลบโค้ดเดิมทั้งหมด**
3. **คัดลอกโค้ดใหม่** จากไฟล์ `google-apps-script.gs` ในโปรเจกต์นี้
4. **วางโค้ดใหม่** ลงในตัวแก้ไข

### 3. บันทึกและ Deploy

1. คลิกปุ่ม **💾 Save** (หรือกด `Ctrl+S` / `Cmd+S`)
2. คลิกปุ่ม **Deploy** > **Manage deployments**
3. คลิกไอคอน **⚙️ (Edit)** ที่ deployment ปัจจุบัน
4. เลือก **New version** ในส่วน "Version"
5. คลิก **Deploy**
6. คัดลอก **Web app URL** (ถ้ามีการเปลี่ยนแปลง)

### 4. ทดสอบการทำงาน

1. กลับไปที่หน้าเว็บแอปพลิเคชัน (`index.html`)
2. ทดสอบการเติมน้ำมันหรือซื้อจาก ปตท.
3. ตรวจสอบว่า:
   - ✅ UID ถูกสร้างและแสดงใน Modal
   - ✅ Book No. และ Receipt No. ถูกบันทึก (ถ้ากรอก)
   - ✅ ข้อมูลถูกบันทึกลง Google Sheets ครบถ้วน

---

## 📊 โครงสร้างคอลัมน์ใหม่ใน Transaction_Log Sheet

| คอลัมน์ | ชื่อ | ประเภทข้อมูล | คำอธิบาย |
|---------|------|--------------|----------|
| **A** | UID | Text | รหัสธุรกรรม (FT0001, FT0002, ...) |
| **B** | วันที่ | Date | วันที่ทำรายการ |
| **C** | เวลา | Time | เวลาที่ทำรายการ |
| **D** | ประเภท | Text | ประเภทธุรกรรม (ซื้อเข้า, จ่ายออก) |
| **E** | แหล่งที่มา | Text | แหล่งที่มาของน้ำมัน |
| **F** | ปลายทาง | Text | ปลายทางของน้ำมัน |
| **G** | จำนวน(ลิตร) | Number | ปริมาณน้ำมัน (ลิตร) |
| **H** | ราคาต่อลิตร | Number | ราคาต่อลิตร (บาท) |
| **I** | ยอดรวม | Number | ยอดเงินรวม (บาท) |
| **J** | ผู้ปฏิบัติงาน | Text | ชื่อผู้ทำรายการ |
| **K** | หน่วย | Text | หน่วยงาน |
| **L** | ประเภทอากาศยาน | Text | ประเภทอากาศยาน (ถ้ามี) |
| **M** | เลขทะเบียน | Text | เลขทะเบียนอากาศยาน (ถ้ามี) |
| **N** | หมายเหตุ | Text | หมายเหตุเพิ่มเติม |
| **O** | Book No. | Text | **ใหม่!** เลขที่หนังสือ (สำหรับ ปตท.) |
| **P** | Receipt No. | Text | **ใหม่!** เลขที่ใบเสร็จ (สำหรับ ปตท.) |

---

## 🔧 การเปลี่ยนแปลงหลักในโค้ด

### 1. ฟังก์ชัน `logTransaction()`

**เดิม:** บันทึก 13 คอลัมน์ (A-M)
```javascript
logSheet.getRange(1, 1, 1, 13).setValues([...]);
```

**ใหม่:** บันทึก 16 คอลัมน์ (A-P) รวม UID, Book No., Receipt No.
```javascript
logSheet.getRange(1, 1, 1, 16).setValues([...]);
```

### 2. ฟังก์ชัน `getTransactionLogs()`

**เดิม:** อ่าน 10 คอลัมน์
```javascript
const dataRange = targetSheet.getRange(2, 1, lastRow - 1, 10);
```

**ใหม่:** อ่าน 16 คอลัมน์
```javascript
const dataRange = targetSheet.getRange(2, 1, lastRow - 1, 16);
```

### 3. การเพิ่มฟิลด์ใหม่ใน logEntry object

```javascript
const logEntry = {
  uid: row[0] || '',           // ใหม่!
  date: dateStr,
  time: timeStr,
  // ... ฟิลด์อื่นๆ
  book_no: row[14] || '',      // ใหม่!
  receipt_no: row[15] || ''    // ใหม่!
};
```

---

## ⚠️ หมายเหตุสำคัญ

### 1. Backward Compatibility
- โค้ดใหม่รองรับทั้ง sheet เก่าและใหม่
- ถ้า sheet เก่ามีเพียง 13 คอลัมน์ ระบบจะสร้าง sheet ใหม่อัตโนมัติ
- ข้อมูลเก่าจะไม่สูญหาย (แต่จะไม่มี UID, Book No., Receipt No.)

### 2. การสร้าง Sheet ใหม่
- ถ้า Transaction_Log sheet ไม่มี header หรือว่างเปล่า
- ระบบจะสร้าง sheet ใหม่พร้อม header 16 คอลัมน์อัตโนมัติ

### 3. การ Migrate ข้อมูลเก่า
ถ้าต้องการเก็บข้อมูลเก่า:
1. **Backup sheet เดิม**: คัดลอก Transaction_Log sheet เดิมไว้
2. **เพิ่มคอลัมน์ใหม่**: เพิ่มคอลัมน์ O (Book No.) และ P (Receipt No.) ใน sheet เดิม
3. **เพิ่ม header**: ใส่ "UID" ในคอลัมน์ A และเลื่อนข้อมูลเดิมไปทางขวา

---

## 🧪 การทดสอบ

### Test Case 1: การซื้อจาก ปตท. (มี Book No. และ Receipt No.)
1. เปิดหน้าเว็บแอป
2. คลิก "ซื้อจาก ปตท."
3. กรอกข้อมูล:
   - ปลายทาง: เลือกแท๊งหรือรถ
   - จำนวน: 1000 ลิตร
   - Book No.: TEST-001
   - Receipt No.: REC-001
   - ผู้ปฏิบัติงาน: ทดสอบ
   - หน่วย: ทดสอบ
4. กดบันทึก
5. **ตรวจสอบ:**
   - ✅ แสดง UID Modal (เช่น FT0001)
   - ✅ แสดง Book No. และ Receipt No. ใน Modal
   - ✅ ข้อมูลบันทึกลง Google Sheets ครบถ้วน

### Test Case 2: การเติมน้ำมันทั่วไป (ไม่มี Book No. และ Receipt No.)
1. เปิดหน้าเว็บแอป
2. คลิก "เติมน้ำมัน" ที่การ์ดแท๊งหรือรถ
3. กรอกข้อมูล (ไม่ต้องกรอก Book No. และ Receipt No.)
4. กดบันทึก
5. **ตรวจสอบ:**
   - ✅ แสดง UID Modal
   - ✅ ไม่แสดงแถว Book No. และ Receipt No. ใน Modal
   - ✅ ข้อมูลบันทึกลง Google Sheets (คอลัมน์ O และ P ว่าง)

---

## 📞 การแก้ไขปัญหา

### ปัญหา: ข้อมูลไม่บันทึกลง Google Sheets

**วิธีแก้:**
1. ตรวจสอบว่า Deploy แล้วหรือยัง
2. ตรวจสอบ Console ใน Browser (F12) หาข้อผิดพลาด
3. ตรวจสอบว่า URL ใน `inventory.js` ตรงกับ Web App URL หรือไม่

### ปัญหา: UID ไม่แสดงใน Modal

**วิธีแก้:**
1. ตรวจสอบว่า `generateUID()` ทำงานหรือไม่ (เปิด Console แล้วพิมพ์ `generateUID()`)
2. ตรวจสอบว่า localStorage ทำงานหรือไม่
3. ลอง Clear localStorage แล้วทดสอบใหม่

### ปัญหา: Book No. และ Receipt No. ไม่บันทึก

**วิธีแก้:**
1. ตรวจสอบว่าฟิลด์ใน HTML มี `id="bookNo"` และ `id="receiptNo"` หรือไม่
2. ตรวจสอบว่า JavaScript ดึงค่าจากฟิลด์ถูกต้องหรือไม่
3. ตรวจสอบ Network tab ใน Browser ว่าข้อมูลถูกส่งไปหรือไม่

---

## ✅ Checklist การอัปเดต

- [ ] คัดลอกโค้ดใหม่จาก `google-apps-script.gs`
- [ ] วางโค้ดใน Google Apps Script Editor
- [ ] บันทึกโค้ด (Save)
- [ ] Deploy version ใหม่
- [ ] ทดสอบการซื้อจาก ปตท. (มี Book No. และ Receipt No.)
- [ ] ทดสอบการเติมน้ำมันทั่วไป (ไม่มี Book No. และ Receipt No.)
- [ ] ตรวจสอบข้อมูลใน Google Sheets
- [ ] ตรวจสอบว่า UID แสดงใน Modal
- [ ] ทดสอบปุ่ม Copy UID
- [ ] ทดสอบปุ่ม Print Receipt

---

## 📚 เอกสารเพิ่มเติม

- [Google Apps Script Documentation](https://developers.google.com/apps-script)
- [Google Sheets API](https://developers.google.com/sheets/api)
- [localStorage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)

---

**อัปเดตล่าสุด:** 2024
**เวอร์ชัน:** 2.0 (รองรับ UID, Book No., Receipt No.)