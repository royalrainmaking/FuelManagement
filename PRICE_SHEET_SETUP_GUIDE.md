# 📊 คู่มือการตั้งค่าระบบจัดการราคาผ่าน Google Sheets

## 🎯 ภาพรวม

ระบบจัดการราคาใหม่จะเก็บข้อมูลราคาและประวัติการเปลี่ยนแปลงใน Google Sheets ชื่อ **"Price_History"** 

### ✨ คุณสมบัติหลัก:
- ✅ **Real-time Pricing** - ดึงราคาจาก Google Sheets ทุกครั้งที่โหลดหน้า
- ✅ **Price History** - เก็บประวัติการเปลี่ยนแปลงราคาทั้งหมด
- ✅ **Dual Storage** - บันทึกทั้ง Google Sheets และ localStorage (Sync กัน)
- ✅ **Fallback System** - ถ้า Google Sheets ไม่พร้อมใช้งาน จะใช้ localStorage แทน
- ✅ **Auto-Create Sheet** - สร้างชีทอัตโนมัติถ้ายังไม่มี

---

## 📋 โครงสร้างชีท Price_History

ชีท **Price_History** จะมี 7 คอลัมน์:

| คอลัมน์ | ชื่อ | ประเภท | คำอธิบาย |
|---------|------|--------|----------|
| **A** | Timestamp | DateTime | วันที่-เวลาที่บันทึก (รูปแบบ: yyyy-MM-dd HH:mm:ss) |
| **B** | Date | Date | วันที่ (รูปแบบ: yyyy-MM-dd) |
| **C** | Time | Time | เวลา (รูปแบบ: HH:mm:ss) |
| **D** | Price Per Liter | Number | ราคาต่อลิตร (บาท) |
| **E** | Price Per Drum | Number | ราคาต่อถัง 200L (บาท) |
| **F** | Updated By | Text | ผู้แก้ไข (เช่น Admin, System) |
| **G** | Notes | Text | หมายเหตุ (เช่น "Updated via Price Management") |

### ตัวอย่างข้อมูล:

```
| Timestamp           | Date       | Time     | Price Per Liter | Price Per Drum | Updated By | Notes                        |
|---------------------|------------|----------|-----------------|----------------|------------|------------------------------|
| 2024-01-15 10:30:00 | 2024-01-15 | 10:30:00 | 35.50          | 7100.00        | Admin      | Updated via Price Management |
| 2024-01-14 09:15:00 | 2024-01-14 | 09:15:00 | 35.00          | 7000.00        | Admin      | Updated via Price Management |
| 2024-01-13 14:20:00 | 2024-01-13 | 14:20:00 | 34.50          | 6900.00        | System     | Initial setup                |
```

---

## 🚀 ขั้นตอนการตั้งค่า

### ขั้นตอนที่ 1: อัปเดต Google Apps Script

1. **เปิด Google Sheets** ของคุณ
2. ไปที่ **Extensions > Apps Script**
3. **คัดลอกโค้ดใหม่** จากไฟล์ `google-apps-script.gs` ทั้งหมด
4. **วางทับโค้ดเดิม** ใน Apps Script Editor
5. **บันทึก** (Ctrl+S หรือ Cmd+S)
6. **Deploy** โปรเจค:
   - คลิก **Deploy > New deployment**
   - เลือก **Web app**
   - ตั้งค่า:
     - **Execute as:** Me
     - **Who has access:** Anyone
   - คลิก **Deploy**
   - **คัดลอก Web app URL** (จะใช้ในขั้นตอนถัดไป)

### ขั้นตอนที่ 2: สร้างชีท Price_History (อัตโนมัติ)

ระบบจะสร้างชีท **Price_History** อัตโนมัติเมื่อคุณใช้งานครั้งแรก แต่ถ้าต้องการสร้างด้วยตนเอง:

#### วิธีที่ 1: ให้ระบบสร้างอัตโนมัติ (แนะนำ)
- เปิดหน้า `price-management.html`
- ล็อกอินด้วยรหัสผ่าน
- บันทึกราคาครั้งแรก
- ระบบจะสร้างชีท Price_History อัตโนมัติ

#### วิธีที่ 2: เรียกใช้ฟังก์ชันใน Apps Script
1. เปิด **Apps Script Editor**
2. เลือกฟังก์ชัน `createPriceHistorySheet` จาก dropdown
3. คลิก **Run**
4. อนุญาตสิทธิ์ตามที่ระบบขอ

#### วิธีที่ 3: สร้างด้วย API Call
เปิด URL นี้ในเบราว์เซอร์ (แทนที่ค่าตามจริง):
```
https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?action=createPriceSheet&sheetsId=YOUR_SHEETS_ID
```

### ขั้นตอนที่ 3: ตรวจสอบการตั้งค่า

1. **ตรวจสอบว่ามีชีท Price_History** ใน Google Sheets แล้ว
2. **ตรวจสอบ Header** ว่าถูกต้อง (7 คอลัมน์)
3. **ตรวจสอบแถวแรก** ควรมีข้อมูลเริ่มต้น (ราคา 0, Updated By: System)

---

## 🔧 การใช้งาน

### สำหรับแอดมิน (จัดการราคา)

1. **เปิดหน้า Price Management:**
   ```
   price-management.html
   ```

2. **ล็อกอิน:**
   - รหัสผ่านเริ่มต้น: `admin123`
   - (แนะนำให้เปลี่ยนรหัสผ่านในโค้ด)

3. **ตั้งราคา:**
   - กรอก **ราคาต่อลิตร** (สำหรับแท๊งและรถ)
   - กรอก **ราคาต่อถัง 200L**
   - คลิก **บันทึกราคา**

4. **ระบบจะบันทึก:**
   - ✅ บันทึกลง **Google Sheets** (Price_History)
   - ✅ บันทึกลง **localStorage** (สำหรับ fallback)
   - ✅ แสดงข้อความยืนยัน

### สำหรับผู้เติมน้ำมัน (ใช้ราคา)

1. **เปิดหน้าหลัก:**
   ```
   index.html
   ```

2. **ระบบจะโหลดราคาอัตโนมัติ:**
   - ดึงจาก **Google Sheets** (Real-time)
   - ถ้าไม่สำเร็จ จะใช้ **localStorage** แทน

3. **ทำรายการตามปกติ:**
   - เติมน้ำมัน (Refill)
   - จ่ายน้ำมัน (Dispense)
   - ซื้อจาก ปตท.
   - ระบบจะใช้ราคาล่าสุดจาก Google Sheets

---

## 🔍 API Endpoints ใหม่

### 1. สร้างชีท Price_History
```
GET {SCRIPT_URL}?action=createPriceSheet&sheetsId={SHEETS_ID}
```

**Response:**
```json
{
  "success": true,
  "message": "Price_History sheet created successfully",
  "sheetId": 123456789
}
```

### 2. ดึงราคาปัจจุบัน
```
GET {SCRIPT_URL}?action=getCurrentPrices&sheetsId={SHEETS_ID}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "pricePerLiter": 35.50,
    "pricePerDrum": 7100.00,
    "lastUpdated": "2024-01-15 10:30:00",
    "updatedBy": "Admin",
    "notes": "Updated via Price Management"
  }
}
```

### 3. อัปเดตราคา
```
GET {SCRIPT_URL}?action=updatePrices&sheetsId={SHEETS_ID}&data={JSON_DATA}
```

**JSON_DATA Format:**
```json
{
  "pricePerLiter": 35.50,
  "pricePerDrum": 7100.00,
  "updatedBy": "Admin",
  "notes": "Updated via Price Management"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Prices updated successfully",
  "data": {
    "pricePerLiter": 35.50,
    "pricePerDrum": 7100.00,
    "timestamp": "2024-01-15 10:30:00"
  }
}
```

### 4. ดึงประวัติราคาทั้งหมด
```
GET {SCRIPT_URL}?action=getPriceHistory&sheetsId={SHEETS_ID}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "price_0_1705294200000",
      "timestamp": "2024-01-15 10:30:00",
      "date": "2024-01-15",
      "time": "10:30:00",
      "pricePerLiter": 35.50,
      "pricePerDrum": 7100.00,
      "updatedBy": "Admin",
      "notes": "Updated via Price Management"
    },
    ...
  ],
  "count": 10
}
```

---

## 🔄 ลำดับการทำงาน

### เมื่อแอดมินบันทึกราคา:

```
1. แอดมินกรอกราคาใน price-management.html
2. กด "บันทึกราคา"
3. ระบบบันทึกลง localStorage (เร็ว)
4. ระบบบันทึกลง Google Sheets (Price_History)
5. แสดงข้อความยืนยัน
```

### เมื่อผู้เติมน้ำมันทำรายการ:

```
1. เปิดหน้า index.html
2. ระบบเรียก loadFuelPrices()
3. พยายามดึงราคาจาก Google Sheets
   ├─ สำเร็จ → ใช้ราคาจาก Sheets + อัปเดต localStorage
   └─ ไม่สำเร็จ → ใช้ราคาจาก localStorage (fallback)
4. ทำรายการด้วยราคาที่ได้
```

---

## ⚠️ การแก้ปัญหา

### ปัญหา: ไม่สามารถดึงราคาจาก Google Sheets

**สาเหตุที่เป็นไปได้:**
1. ยังไม่ได้ตั้งค่า `googleScriptUrl` และ `sheetsId` ใน localStorage
2. Google Apps Script ยังไม่ได้ Deploy
3. ไม่มีชีท Price_History

**วิธีแก้:**
1. ตรวจสอบ localStorage:
   ```javascript
   console.log(localStorage.getItem('googleScriptUrl'));
   console.log(localStorage.getItem('sheetsId'));
   ```

2. ตรวจสอบว่า Deploy แล้ว:
   - เปิด Apps Script Editor
   - ไปที่ Deploy > Manage deployments
   - ตรวจสอบว่ามี Active deployment

3. สร้างชีท Price_History:
   - เรียกใช้ฟังก์ชัน `createPriceHistorySheet` ใน Apps Script

### ปัญหา: บันทึกราคาไม่สำเร็จ

**ตรวจสอบ:**
1. เปิด Console (F12) ดู error message
2. ตรวจสอบว่า Apps Script มีสิทธิ์เข้าถึง Sheets
3. ตรวจสอบว่า URL ถูกต้อง

**วิธีแก้:**
```javascript
// ทดสอบ API ใน Console
const testUrl = `${localStorage.getItem('googleScriptUrl')}?action=getCurrentPrices&sheetsId=${localStorage.getItem('sheetsId')}`;
fetch(testUrl)
  .then(r => r.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));
```

### ปัญหา: ราคาไม่อัปเดต

**สาเหตุ:**
- Browser cache
- localStorage ยังเก็บราคาเก่า

**วิธีแก้:**
1. รีเฟรชหน้าแบบ Hard Refresh:
   - Windows: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

2. ลบ localStorage:
   ```javascript
   localStorage.removeItem('fuelPrices');
   location.reload();
   ```

---

## 📊 การดูประวัติราคา

### วิธีที่ 1: ดูใน Google Sheets
1. เปิด Google Sheets
2. ไปที่ชีท **Price_History**
3. ดูข้อมูลทั้งหมด (เรียงจากเก่าไปใหม่)

### วิธีที่ 2: ใช้ API
```javascript
// เรียกดูประวัติราคา
const url = `${SCRIPT_URL}?action=getPriceHistory&sheetsId=${SHEETS_ID}`;
fetch(url)
  .then(r => r.json())
  .then(data => {
    console.log('Price History:', data.data);
    console.log('Total records:', data.count);
  });
```

### วิธีที่ 3: สร้างหน้าดูประวัติ (Future Enhancement)
- สามารถสร้างหน้า `price-history.html` เพื่อแสดงประวัติราคาในรูปแบบตาราง
- แสดงกราฟการเปลี่ยนแปลงราคา
- ค้นหาราคาตามช่วงเวลา

---

## 🔐 ความปลอดภัย

### การป้องกันข้อมูล:
- ✅ ชีท Price_History เก็บประวัติทั้งหมด (ไม่สามารถแก้ไขย้อนหลังได้ง่าย)
- ✅ บันทึกผู้แก้ไขทุกครั้ง (Updated By)
- ✅ บันทึก Timestamp ทุกครั้ง
- ⚠️ แนะนำให้ตั้งสิทธิ์ Google Sheets เป็น "View only" สำหรับผู้ใช้ทั่วไป

### การเปลี่ยนรหัสผ่าน:
แก้ไขในไฟล์ `price-management.html`:
```javascript
const ADMIN_PASSWORD = 'your_new_password_here';
```

---

## 📈 Performance

### ข้อดี:
- ✅ **Real-time** - ราคาอัปเดตทันทีทุกครั้งที่โหลดหน้า
- ✅ **Reliable** - มี fallback เป็น localStorage
- ✅ **Traceable** - เก็บประวัติทุกการเปลี่ยนแปลง

### ข้อควรระวัง:
- ⚠️ การดึงข้อมูลจาก Google Sheets ช้ากว่า localStorage (ประมาณ 1-2 วินาที)
- ⚠️ ถ้า Google Sheets ล่ม ระบบจะใช้ localStorage แทน
- ⚠️ ต้องมีอินเทอร์เน็ตเพื่อดึงราคาจาก Sheets

---

## 🎯 Best Practices

1. **ตั้งราคาผ่าน price-management.html เท่านั้น**
   - อย่าแก้ไขใน Google Sheets โดยตรง
   - ใช้ระบบเพื่อให้มีการบันทึกประวัติ

2. **ตรวจสอบราคาก่อนทำรายการ**
   - เปิด Console (F12) ดูว่าดึงราคาจาก Sheets หรือ localStorage
   - ดูข้อความ "✅ Loaded prices from Google Sheets"

3. **Backup ข้อมูล**
   - Export ชีท Price_History เป็น CSV เป็นระยะ
   - เก็บ backup ของ localStorage

4. **Monitor การใช้งาน**
   - ตรวจสอบ Console เป็นระยะ
   - ดูว่ามี error หรือไม่

---

## 📝 TODO / Future Enhancements

- [ ] สร้างหน้า `price-history.html` เพื่อดูประวัติราคา
- [ ] เพิ่มกราฟแสดงการเปลี่ยนแปลงราคา
- [ ] เพิ่มระบบแจ้งเตือนเมื่อราคาเปลี่ยน
- [ ] เพิ่มการ Export ประวัติราคาเป็น PDF
- [ ] เพิ่มการค้นหาราคาตามช่วงเวลา
- [ ] เพิ่มการเปรียบเทียบราคาระหว่างช่วงเวลา
- [ ] เพิ่ม API สำหรับดึงราคาเฉลี่ยต่อเดือน/ปี

---

## 📞 Support

หากพบปัญหาหรือต้องการความช่วยเหลือ:

1. **ตรวจสอบ Console (F12)** - ดู error message
2. **ตรวจสอบ Apps Script Logs** - ดู execution logs
3. **ตรวจสอบ Google Sheets** - ดูว่ามีชีท Price_History หรือไม่
4. **ตรวจสอบ localStorage** - ดูว่ามีการตั้งค่าหรือไม่

---

**เอกสารนี้อัปเดตล่าสุด:** 2024-01-15  
**เวอร์ชัน:** 2.1  
**ผู้จัดทำ:** ระบบจัดการน้ำมัน - Price Management Module