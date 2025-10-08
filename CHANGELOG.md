# Changelog - ระบบจัดการน้ำมัน

## Version 2.1 - Price Management via Google Sheets (2024)

### 🎯 ฟีเจอร์ใหม่

#### 1. ระบบจัดการราคาผ่าน Google Sheets
- ✅ สร้างชีท **Price_History** สำหรับเก็บประวัติราคา
- ✅ ดึงราคาจาก Google Sheets แบบ Real-time
- ✅ บันทึกประวัติการเปลี่ยนแปลงราคาทั้งหมด
- ✅ Dual Storage: บันทึกทั้ง Google Sheets และ localStorage
- ✅ Fallback System: ถ้า Sheets ไม่พร้อมใช้งาน จะใช้ localStorage แทน
- ✅ Auto-Create Sheet: สร้างชีทอัตโนมัติถ้ายังไม่มี

#### 2. โครงสร้างชีท Price_History (7 คอลัมน์)
| คอลัมน์ | ชื่อ | คำอธิบาย |
|---------|------|----------|
| A | Timestamp | วันที่-เวลาที่บันทึก |
| B | Date | วันที่ |
| C | Time | เวลา |
| D | Price Per Liter | ราคาต่อลิตร |
| E | Price Per Drum | ราคาต่อถัง 200L |
| F | Updated By | ผู้แก้ไข |
| G | Notes | หมายเหตุ |

### 🔧 การเปลี่ยนแปลงหลัก

#### Google Apps Script (google-apps-script.gs)
- ✅ เพิ่มฟังก์ชัน `createPriceHistorySheet()` - สร้างชีท Price_History
- ✅ เพิ่มฟังก์ชัน `getCurrentPrices()` - ดึงราคาปัจจุบัน
- ✅ เพิ่มฟังก์ชัน `updatePrices()` - อัปเดตราคา
- ✅ เพิ่มฟังก์ชัน `getPriceHistory()` - ดึงประวัติราคาทั้งหมด
- ✅ เพิ่ม API endpoints ใหม่ 4 ตัว:
  - `createPriceSheet` - สร้างชีทราคา
  - `getCurrentPrices` - ดึงราคาปัจจุบัน
  - `updatePrices` - บันทึกราคาใหม่
  - `getPriceHistory` - ดึงประวัติราคา

#### Frontend (price-management.html)
- ✅ แก้ไขฟังก์ชัน `savePrices()` - บันทึกทั้ง Sheets และ localStorage
- ✅ แก้ไขฟังก์ชัน `loadCurrentPrices()` - ดึงจาก Sheets ก่อน fallback ไป localStorage
- ✅ เพิ่มฟังก์ชัน `savePricesToSheets()` - บันทึกราคาไป Sheets
- ✅ เพิ่มฟังก์ชัน `fetchCurrentPricesFromSheets()` - ดึงราคาจาก Sheets
- ✅ เพิ่ม Loading indicator ขณะบันทึก
- ✅ แสดงข้อความยืนยันว่าบันทึกที่ไหนบ้าง

#### Backend (inventory.js)
- ✅ แก้ไขฟังก์ชัน `loadFuelPrices()` - เปลี่ยนเป็น async และดึงจาก Sheets
- ✅ เพิ่มฟังก์ชัน `fetchCurrentPricesFromSheets()` - ดึงราคาจาก Sheets
- ✅ แก้ไข `handleRefillSubmit()` - รองรับ async price loading
- ✅ แก้ไข `handlePttPurchaseSubmit()` - รองรับ async price loading
- ✅ เพิ่ม Console logging เพื่อ debug

### 🗂️ ไฟล์ที่สร้างใหม่

1. **PRICE_SHEET_SETUP_GUIDE.md** (300+ บรรทัด)
   - คู่มือการตั้งค่าระบบจัดการราคา
   - อธิบายโครงสร้างชีท Price_History
   - ขั้นตอนการตั้งค่าทีละขั้น
   - API Documentation
   - Troubleshooting Guide
   - Best Practices

### 🗂️ ไฟล์ที่แก้ไข

1. **google-apps-script.gs**
   - เพิ่ม 4 ฟังก์ชันใหม่สำหรับจัดการราคา
   - เพิ่ม 4 API endpoints ใหม่

2. **price-management.html**
   - แก้ไขให้บันทึกทั้ง Sheets และ localStorage
   - เพิ่มระบบ fallback
   - เพิ่ม loading indicator

3. **inventory.js**
   - แก้ไขให้ดึงราคาจาก Sheets แบบ Real-time
   - เพิ่มระบบ fallback
   - รองรับ async operations

4. **CHANGELOG.md** (ไฟล์นี้)
   - เพิ่มบันทึกการเปลี่ยนแปลง Version 2.1

### 🔄 ลำดับการทำงาน

#### เมื่อแอดมินบันทึกราคา:
1. กรอกราคาใน `price-management.html`
2. บันทึกลง localStorage (เร็ว)
3. บันทึกลง Google Sheets (Price_History)
4. แสดงข้อความยืนยัน

#### เมื่อผู้เติมน้ำมันทำรายการ:
1. เปิดหน้า `index.html`
2. ระบบเรียก `loadFuelPrices()`
3. พยายามดึงราคาจาก Google Sheets
   - สำเร็จ → ใช้ราคาจาก Sheets + อัปเดต localStorage
   - ไม่สำเร็จ → ใช้ราคาจาก localStorage (fallback)
4. ทำรายการด้วยราคาที่ได้

### 📊 ข้อดีของระบบใหม่

- ✅ **Real-time Pricing** - ราคาอัปเดตทันทีทุกครั้งที่โหลดหน้า
- ✅ **Price History** - เก็บประวัติการเปลี่ยนแปลงราคาทั้งหมด
- ✅ **Audit Trail** - ทราบว่าใครเปลี่ยนราคาเมื่อไหร่
- ✅ **Reliable** - มี fallback เป็น localStorage
- ✅ **Traceable** - ตรวจสอบย้อนหลังได้
- ✅ **Centralized** - จัดการราคาจากที่เดียว

### ⚠️ ข้อควรระวัง

- ⚠️ การดึงข้อมูลจาก Google Sheets ช้ากว่า localStorage (1-2 วินาที)
- ⚠️ ต้องมีอินเทอร์เน็ตเพื่อดึงราคาจาก Sheets
- ⚠️ ถ้า Google Sheets ล่ม ระบบจะใช้ localStorage แทน

### 🔐 ความปลอดภัย

- ✅ ชีท Price_History เก็บประวัติทั้งหมด (ไม่สามารถแก้ไขย้อนหลังได้ง่าย)
- ✅ บันทึกผู้แก้ไขทุกครั้ง (Updated By)
- ✅ บันทึก Timestamp ทุกครั้ง
- ⚠️ แนะนำให้ตั้งสิทธิ์ Google Sheets เป็น "View only" สำหรับผู้ใช้ทั่วไป

### 📝 TODO / Future Improvements

- [ ] สร้างหน้า `price-history.html` เพื่อดูประวัติราคา
- [ ] เพิ่มกราฟแสดงการเปลี่ยนแปลงราคา
- [ ] เพิ่มระบบแจ้งเตือนเมื่อราคาเปลี่ยน
- [ ] เพิ่มการ Export ประวัติราคาเป็น PDF
- [ ] เพิ่มการค้นหาราคาตามช่วงเวลา
- [ ] เพิ่มการเปรียบเทียบราคาระหว่างช่วงเวลา
- [ ] เพิ่ม API สำหรับดึงราคาเฉลี่ยต่อเดือน/ปี

### 📞 Support

หากพบปัญหาหรือต้องการความช่วยเหลือ:
1. ตรวจสอบ `PRICE_SHEET_SETUP_GUIDE.md`
2. ตรวจสอบ Console ใน Browser (F12)
3. ตรวจสอบ Logs ใน Google Apps Script
4. ตรวจสอบชีท Price_History ใน Google Sheets

---

## Version 2.0 - Major Update (2024)

### 🎯 ฟีเจอร์ใหม่

#### 1. ระบบจัดการราคาแบบ Backend (Price Management)
- ✅ สร้างหน้า `price-management.html` สำหรับแอดมินจัดการราคา
- ✅ ป้องกันด้วยรหัสผ่าน (Password: `admin123`)
- ✅ แยกการจัดการราคาออกจากหน้าหลัก
- ✅ บันทึกราคาลง localStorage
- ✅ ราคาที่ตั้งค่า:
  - ราคาต่อลิตร (สำหรับแท๊งและรถ)
  - ราคาต่อถัง 200L

#### 2. ระบบ UID (Transaction ID)
- ✅ สร้าง UID อัตโนมัติสำหรับทุกธุรกรรม
- ✅ รูปแบบ: `FT0001`, `FT0002`, `FT0003`, ...
- ✅ UID เป็นเลขลำดับต่อเนื่อง (Sequential)
- ✅ บันทึก UID ลง localStorage และ Google Sheets
- ✅ แสดง UID ใน Modal หลังทำรายการสำเร็จ

#### 3. ฟิลด์ใหม่: Book No. และ Receipt No.
- ✅ เพิ่มช่องกรอก Book No. (เลขที่หนังสือ)
- ✅ เพิ่มช่องกรอก Receipt No. (เลขที่ใบเสร็จ)
- ✅ แสดงเฉพาะในการซื้อจาก ปตท.
- ✅ เป็นฟิลด์ optional (ไม่บังคับกรอก)
- ✅ บันทึกลง Google Sheets

#### 4. UID Modal (Transaction Success Popup)
- ✅ แสดง Modal หลังทำรายการสำเร็จ
- ✅ แสดงข้อมูล:
  - UID (รหัสธุรกรรม)
  - ประเภทธุรกรรม
  - แหล่งที่มา
  - ปลายทาง
  - ปริมาณ
  - Book No. (ถ้ามี)
  - Receipt No. (ถ้ามี)
  - ผู้ทำรายการ
  - เวลา
- ✅ ปุ่ม **คัดลอก UID** - คัดลอกไปยัง Clipboard
- ✅ ปุ่ม **พิมพ์ใบเสร็จ** - พิมพ์รายละเอียดธุรกรรม
- ✅ ปุ่ม **ปิด** - ปิด Modal

### 🔧 การเปลี่ยนแปลงหลัก

#### Frontend (index.html)
- ❌ ลบช่องกรอกราคาต่อลิตรออกจากฟอร์มเติมน้ำมัน
- ❌ ลบช่องกรอกราคาต่อถังออกจากฟอร์มเติมน้ำมัน
- ❌ ลบการแสดงจำนวนเงินรวมออกจากทุกฟอร์ม
- ✅ เพิ่มช่อง Book No. ในฟอร์มเติมน้ำมัน
- ✅ เพิ่มช่อง Receipt No. ในฟอร์มเติมน้ำมัน
- ✅ เพิ่มช่อง Book No. ใน PTT Purchase Modal
- ✅ เพิ่มช่อง Receipt No. ใน PTT Purchase Modal
- ✅ เพิ่ม UID Modal component

#### Backend (inventory.js)
- ✅ เพิ่มฟังก์ชัน `generateUID()` - สร้าง UID
- ✅ เพิ่มฟังก์ชัน `loadFuelPrices()` - โหลดราคาจาก localStorage
- ✅ เพิ่มฟังก์ชัน `showUIDModal()` - แสดง UID Modal
- ✅ เพิ่มฟังก์ชัน `setupUIDModalListeners()` - จัดการ Modal events
- ✅ แก้ไข `handleRefillSubmit()`:
  - ดึงราคาจาก localStorage แทนฟอร์ม
  - รับค่า Book No. และ Receipt No.
  - สร้าง UID
  - แสดง UID Modal แทน alert
- ✅ แก้ไข `handlePttPurchaseSubmit()`:
  - ดึงราคาจาก localStorage แทนฟอร์ม
  - รับค่า Book No. และ Receipt No.
  - สร้าง UID
  - แสดง UID Modal แทน alert

#### Google Apps Script (google-apps-script.gs)
- ✅ แก้ไข `logTransaction()`:
  - เพิ่มคอลัมน์ UID (A)
  - เพิ่มคอลัมน์ Book No. (O)
  - เพิ่มคอลัมน์ Receipt No. (P)
  - เปลี่ยนจาก 13 คอลัมน์เป็น 16 คอลัมน์
- ✅ แก้ไข `getTransactionLogs()`:
  - อ่าน 16 คอลัมน์แทน 10 คอลัมน์
  - เพิ่มฟิลด์ uid, book_no, receipt_no ใน response

### 📊 โครงสร้าง Google Sheets ใหม่

#### Transaction_Log Sheet (16 คอลัมน์)
| คอลัมน์ | ชื่อ | เดิม | ใหม่ |
|---------|------|------|------|
| A | UID | - | ✅ ใหม่ |
| B | วันที่ | A | เลื่อน |
| C | เวลา | B | เลื่อน |
| D | ประเภท | C | เลื่อน |
| E | แหล่งที่มา | D | เลื่อน |
| F | ปลายทาง | E | เลื่อน |
| G | จำนวน(ลิตร) | F | เลื่อน |
| H | ราคาต่อลิตร | G | เลื่อน |
| I | ยอดรวม | H | เลื่อน |
| J | ผู้ปฏิบัติงาน | I | เลื่อน |
| K | หน่วย | J | เลื่อน |
| L | ประเภทอากาศยาน | K | เลื่อน |
| M | เลขทะเบียน | L | เลื่อน |
| N | หมายเหตุ | M | เลื่อน |
| O | Book No. | - | ✅ ใหม่ |
| P | Receipt No. | - | ✅ ใหม่ |

### 🗂️ ไฟล์ที่สร้างใหม่

1. **price-management.html** (434 บรรทัด)
   - หน้า Backend สำหรับจัดการราคา
   - ป้องกันด้วยรหัสผ่าน
   - UI สวยงามด้วย Gradient

2. **GOOGLE_APPS_SCRIPT_UPDATE_GUIDE.md**
   - คำแนะนำการอัปเดต Google Apps Script
   - ขั้นตอนการ Deploy
   - Test Cases

3. **CHANGELOG.md** (ไฟล์นี้)
   - บันทึกการเปลี่ยนแปลงทั้งหมด

### 🗂️ ไฟล์ที่แก้ไข

1. **index.html**
   - ลบฟิลด์ราคาออกจากฟอร์ม
   - เพิ่มฟิลด์ Book No. และ Receipt No.
   - เพิ่ม UID Modal component

2. **inventory.js**
   - เพิ่มระบบ UID Management
   - เพิ่มระบบ Price Management
   - เพิ่มระบบ UID Modal
   - แก้ไขฟังก์ชันการบันทึกธุรกรรม

3. **google-apps-script.gs**
   - เพิ่มคอลัมน์ใหม่ใน Transaction_Log
   - แก้ไขการอ่าน/เขียนข้อมูล

### 🔐 ความปลอดภัย

- ✅ หน้า Price Management ป้องกันด้วยรหัสผ่าน
- ✅ Session-based authentication (sessionStorage)
- ✅ ผู้เติมน้ำมันไม่เห็นราคาและยอดเงิน
- ⚠️ **แนะนำ:** เปลี่ยนรหัสผ่านจาก `admin123` เป็นรหัสที่ปลอดภัยกว่า

### 📱 User Experience

#### สำหรับแอดมิน:
1. เปิด `price-management.html`
2. ใส่รหัสผ่าน
3. ตั้งราคา
4. บันทึก

#### สำหรับผู้เติมน้ำมัน:
1. เปิด `index.html`
2. กรอกข้อมูลการเติม (ไม่ต้องกรอกราคา)
3. กรอก Book No. และ Receipt No. (ถ้ามี)
4. บันทึก
5. ได้รับ UID และสามารถคัดลอกหรือพิมพ์ได้

### 🐛 Bug Fixes

- ✅ แก้ไขปัญหาการแสดงราคาที่ผู้เติมน้ำมันไม่ควรเห็น
- ✅ แก้ไขปัญหาการคำนวณราคาที่ไม่สอดคล้องกัน
- ✅ เพิ่มการตรวจสอบข้อมูลก่อนบันทึก
- ✅ แก้ไข TypeError: `destination_name.toLowerCase is not a function`
  - เพิ่มการตรวจสอบ type ใน `google-apps-script.gs` (บรรทัด 397)
  - เพิ่มการตรวจสอบ type ใน `inventory.js` ฟังก์ชัน `generateId()`, `inferType()`, `logTransactionToSheets()`
  - ป้องกัน runtime error จากข้อมูล null/undefined ที่มาจาก Google Sheets
- ✅ แก้ไข JavaScript initialization error
  - ลบ event listeners ที่อ้างอิงถึง DOM elements ที่ถูกลบออกไปแล้ว
  - แก้ไขปัญหา `Cannot set properties of null (setting 'oninput')` ที่บรรทัด 1753
- ✅ แก้ไข TypeError: `Cannot read properties of null (reading 'style')`
  - ลบการอ้างอิง DOM elements ที่ไม่มีอยู่ (`dispensePriceGroup`, `dispenseTotalAmountGroup`)
  - คอมเมนต์ฟังก์ชัน `calculateRefillAmount()` และ `calculateDispenseAmount()` ที่ไม่ได้ใช้งาน
  - แก้ไขฟังก์ชัน `calculateDrumDispense()` ให้ตรวจสอบ element ก่อนใช้งาน
  - เพิ่มการตรวจสอบ null safety ในฟังก์ชัน `updateFieldsBasedOnDestination()`

### 📈 Performance

- ✅ ใช้ localStorage สำหรับเก็บราคา (ไม่ต้องโหลดจาก server ทุกครั้ง)
- ✅ ใช้ sessionStorage สำหรับ authentication (ปลอดภัยกว่า)
- ✅ Modal ใช้ vanilla JavaScript (ไม่ต้องพึ่ง library)

### 🔄 Backward Compatibility

- ✅ รองรับข้อมูลเก่าใน Google Sheets
- ✅ ถ้า sheet เก่าไม่มีคอลัมน์ใหม่ จะสร้างอัตโนมัติ
- ✅ ข้อมูลเก่าจะไม่สูญหาย (แต่จะไม่มี UID, Book No., Receipt No.)

### 📝 TODO / Future Improvements

- [ ] เพิ่มหน้าค้นหาธุรกรรมด้วย UID
- [ ] เพิ่มระบบ Export ข้อมูลเป็น PDF
- [ ] เพิ่มการแจ้งเตือนเมื่อราคาไม่ได้ตั้งค่า
- [ ] เพิ่มระบบ Multi-user authentication
- [ ] เพิ่มการ Validate Book No. และ Receipt No.
- [ ] เพิ่ม Dashboard สำหรับดูสถิติ UID
- [ ] เพิ่มการ Backup UID ไปยัง server
- [ ] เพิ่ม QR Code สำหรับ UID
- [ ] เพิ่มระบบ Audit Log สำหรับการเปลี่ยนราคา

### ⚠️ Breaking Changes

- ❌ ฟอร์มเติมน้ำมันไม่มีช่องกรอกราคาอีกต่อไป
- ❌ ไม่แสดงจำนวนเงินรวมให้ผู้เติมน้ำมันเห็น
- ⚠️ ต้องอัปเดต Google Apps Script เพื่อรองรับคอลัมน์ใหม่

### 📞 Support

หากพบปัญหาหรือต้องการความช่วยเหลือ:
1. ตรวจสอบ `GOOGLE_APPS_SCRIPT_UPDATE_GUIDE.md`
2. ตรวจสอบ Console ใน Browser (F12)
3. ตรวจสอบ Logs ใน Google Apps Script

---

## Version 1.0 - Initial Release

### ฟีเจอร์หลัก
- ✅ ระบบจัดการสต็อกน้ำมัน
- ✅ ระบบเติมน้ำมัน (Refill)
- ✅ ระบบจ่ายน้ำมัน (Dispense)
- ✅ ระบบซื้อจาก ปตท.
- ✅ เชื่อมต่อ Google Sheets
- ✅ Transaction Log
- ✅ Summary Dashboard
- ✅ รองรับถัง 200L

---

**หมายเหตุ:** เอกสารนี้จะถูกอัปเดตเมื่อมีการเปลี่ยนแปลงในอนาคต