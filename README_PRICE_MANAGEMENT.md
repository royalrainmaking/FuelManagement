# 💰 ระบบจัดการราคาผ่าน Google Sheets

## 📖 ภาพรวม

ระบบจัดการราคาเวอร์ชัน 2.1 ได้รับการอัปเกรดให้เก็บข้อมูลราคาและประวัติการเปลี่ยนแปลงใน **Google Sheets** แทนที่จะเก็บใน localStorage เพียงอย่างเดียว

### 🎯 จุดประสงค์

1. **Centralized Price Management** - จัดการราคาจากที่เดียว ใช้ได้ทุกเครื่อง
2. **Price History Tracking** - เก็บประวัติการเปลี่ยนแปลงราคาทั้งหมด
3. **Real-time Updates** - ราคาอัปเดตทันทีทุกครั้งที่โหลดหน้า
4. **Audit Trail** - ทราบว่าใครเปลี่ยนราคาเมื่อไหร่
5. **Reliability** - มี fallback เป็น localStorage เมื่อ Google Sheets ไม่พร้อมใช้งาน

---

## 🏗️ สถาปัตยกรรมระบบ

```
┌─────────────────────────────────────────────────────────────┐
│                    Google Sheets                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Price_History Sheet                      │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │ Timestamp | Date | Time | Price/L | Price/Drum │  │  │
│  │  │ Updated By | Notes                              │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕ (API Calls)
┌─────────────────────────────────────────────────────────────┐
│              Google Apps Script (Backend)                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ • createPriceHistorySheet()                           │  │
│  │ • getCurrentPrices()                                  │  │
│  │ • updatePrices()                                      │  │
│  │ • getPriceHistory()                                   │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕ (HTTPS)
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Browser)                       │
│  ┌──────────────────────┐    ┌──────────────────────────┐   │
│  │ price-management.html│    │     index.html           │   │
│  │ (Admin Interface)    │    │ (Operator Interface)     │   │
│  │                      │    │                          │   │
│  │ • Set Prices         │    │ • Load Prices            │   │
│  │ • Save to Sheets     │    │ • Use Prices             │   │
│  │ • Save to localStorage│   │ • Fallback to localStorage│  │
│  └──────────────────────┘    └──────────────────────────┘   │
│                            ↕                                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              localStorage (Fallback)                  │  │
│  │  { pricePerLiter, pricePerDrum, lastUpdated }        │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 โครงสร้างข้อมูล

### Price_History Sheet

| คอลัมน์ | ชื่อ | ประเภท | ตัวอย่าง | คำอธิบาย |
|---------|------|--------|----------|----------|
| **A** | Timestamp | DateTime | 2024-01-15 10:30:00 | วันที่-เวลาที่บันทึก |
| **B** | Date | Date | 2024-01-15 | วันที่ |
| **C** | Time | Time | 10:30:00 | เวลา |
| **D** | Price Per Liter | Number | 35.50 | ราคาต่อลิตร (บาท) |
| **E** | Price Per Drum | Number | 7100.00 | ราคาต่อถัง 200L (บาท) |
| **F** | Updated By | Text | Admin | ผู้แก้ไข |
| **G** | Notes | Text | Updated via Price Management | หมายเหตุ |

### localStorage Structure

```javascript
{
  "fuelPrices": {
    "pricePerLiter": 35.50,
    "pricePerDrum": 7100.00,
    "lastUpdated": "15/1/2567 10:30:00"
  }
}
```

---

## 🔄 ลำดับการทำงาน

### 1. แอดมินตั้งราคา (price-management.html)

```
1. แอดมินล็อกอิน (รหัสผ่าน: admin123)
2. กรอกราคาใหม่
3. คลิก "บันทึกราคา"
   ↓
4. บันทึกลง localStorage (เร็ว, ทันที)
   ↓
5. บันทึกลง Google Sheets (ช้ากว่า, 1-2 วินาที)
   ├─ สำเร็จ → แสดง "✅ บันทึกทั้ง localStorage และ Google Sheets"
   └─ ไม่สำเร็จ → แสดง "⚠️ บันทึกใน localStorage เท่านั้น"
   ↓
6. อัปเดตแสดงผล "อัพเดทล่าสุด"
```

### 2. ผู้เติมน้ำมันใช้ราคา (index.html)

```
1. เปิดหน้า index.html
   ↓
2. ระบบเรียก loadFuelPrices()
   ↓
3. พยายามดึงราคาจาก Google Sheets
   ├─ สำเร็จ (1-2 วินาที)
   │  ├─ ใช้ราคาจาก Sheets
   │  ├─ อัปเดต localStorage
   │  └─ Console: "✅ Loaded prices from Google Sheets"
   │
   └─ ไม่สำเร็จ (timeout, no internet, etc.)
      ├─ ใช้ราคาจาก localStorage
      └─ Console: "⚠️ Failed to load prices from Google Sheets, using localStorage"
   ↓
4. ทำรายการด้วยราคาที่ได้
   ↓
5. บันทึกธุรกรรมพร้อมราคา
```

---

## 🚀 การติดตั้งและตั้งค่า

### ขั้นตอนที่ 1: อัปเดต Google Apps Script

1. เปิด Google Sheets
2. Extensions > Apps Script
3. คัดลอกโค้ดจาก `google-apps-script.gs`
4. วางทับโค้ดเดิม
5. บันทึก (Ctrl+S)
6. Deploy:
   - Deploy > New deployment
   - Web app
   - Execute as: Me
   - Who has access: Anyone
   - Deploy
   - คัดลอก Web app URL

### ขั้นตอนที่ 2: ตั้งค่าราคาครั้งแรก

1. เปิด `price-management.html`
2. ล็อกอิน (รหัสผ่าน: `admin123`)
3. กรอกราคา
4. บันทึก
5. ระบบจะสร้างชีท Price_History อัตโนมัติ

### ขั้นตอนที่ 3: ทดสอบ

1. เปิด `index.html`
2. เปิด Console (F12)
3. ดูข้อความ: `✅ Loaded prices from Google Sheets`
4. ทำรายการทดสอบ

---

## 📚 เอกสารประกอบ

| ไฟล์ | คำอธิบาย |
|------|----------|
| **PRICE_SHEET_SETUP_GUIDE.md** | คู่มือการตั้งค่าฉบับเต็ม (300+ บรรทัด) |
| **PRICE_SHEET_QUICK_START.md** | Quick Start Guide (เริ่มใช้งานใน 5 นาที) |
| **TESTING_CHECKLIST.md** | รายการทดสอบระบบ |
| **CHANGELOG.md** | บันทึกการเปลี่ยนแปลง Version 2.1 |
| **README_PRICE_MANAGEMENT.md** | ไฟล์นี้ |

---

## 🔧 API Reference

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

**JSON_DATA:**
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

### 4. ดึงประวัติราคา

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
    }
  ],
  "count": 1
}
```

---

## 🔍 การแก้ปัญหา

### ปัญหา: ไม่สามารถดึงราคาจาก Google Sheets

**อาการ:**
```
⚠️ Failed to load prices from Google Sheets, using localStorage: ...
```

**สาเหตุที่เป็นไปได้:**
1. ยังไม่ได้ตั้งค่า `googleScriptUrl` และ `sheetsId`
2. Google Apps Script ยังไม่ได้ Deploy
3. ไม่มีชีท Price_History
4. ไม่มีอินเทอร์เน็ต

**วิธีแก้:**

1. ตรวจสอบ localStorage:
```javascript
console.log(localStorage.getItem('googleScriptUrl'));
console.log(localStorage.getItem('sheetsId'));
```

2. ตรวจสอบ Deploy:
- Apps Script > Deploy > Manage deployments
- ตรวจสอบว่ามี Active deployment

3. สร้างชีท Price_History:
```javascript
// ใน Apps Script Editor
// เลือกฟังก์ชัน createPriceHistorySheet > Run
```

4. ทดสอบ API:
```javascript
const url = `${localStorage.getItem('googleScriptUrl')}?action=getCurrentPrices&sheetsId=${localStorage.getItem('sheetsId')}`;
fetch(url)
  .then(r => r.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));
```

### ปัญหา: บันทึกราคาไม่สำเร็จ

**อาการ:**
```
⚠️ บันทึกใน localStorage สำเร็จ แต่บันทึกไป Google Sheets ไม่สำเร็จ: ...
```

**วิธีแก้:**

1. เปิด Console (F12) ดู error message
2. ตรวจสอบว่า Apps Script มีสิทธิ์เข้าถึง Sheets
3. ตรวจสอบว่า URL ถูกต้อง
4. ลองบันทึกอีกครั้ง

### ปัญหา: ราคาไม่อัปเดต

**วิธีแก้:**

1. Hard Refresh:
   - Windows: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

2. ลบ localStorage:
```javascript
localStorage.removeItem('fuelPrices');
location.reload();
```

3. ตรวจสอบใน Google Sheets ว่ามีข้อมูลล่าสุด

---

## 📊 ข้อดีและข้อเสีย

### ✅ ข้อดี

1. **Real-time Updates** - ราคาอัปเดตทันทีทุกครั้งที่โหลดหน้า
2. **Centralized Management** - จัดการราคาจากที่เดียว ใช้ได้ทุกเครื่อง
3. **Price History** - เก็บประวัติการเปลี่ยนแปลงราคาทั้งหมด
4. **Audit Trail** - ทราบว่าใครเปลี่ยนราคาเมื่อไหร่
5. **Reliable** - มี fallback เป็น localStorage
6. **Traceable** - ตรวจสอบย้อนหลังได้
7. **No Database Required** - ใช้ Google Sheets เป็น database

### ⚠️ ข้อเสีย

1. **Slower** - ดึงข้อมูลจาก Google Sheets ช้ากว่า localStorage (1-2 วินาที)
2. **Internet Required** - ต้องมีอินเทอร์เน็ตเพื่อดึงราคาจาก Sheets
3. **Google Dependency** - พึ่งพา Google Sheets และ Apps Script
4. **Rate Limits** - Google Apps Script มี rate limits (แต่ไม่น่าจะเป็นปัญหา)

---

## 🔐 ความปลอดภัย

### การป้องกันข้อมูล

1. **Price History** - เก็บประวัติทั้งหมด ไม่สามารถแก้ไขย้อนหลังได้ง่าย
2. **Audit Trail** - บันทึกผู้แก้ไขและ Timestamp ทุกครั้ง
3. **Password Protection** - หน้า price-management.html ป้องกันด้วยรหัสผ่าน
4. **Session-based Auth** - ใช้ sessionStorage สำหรับ authentication

### คำแนะนำ

1. **เปลี่ยนรหัสผ่าน** - เปลี่ยนจาก `admin123` เป็นรหัสที่ปลอดภัยกว่า
2. **ตั้งสิทธิ์ Google Sheets** - ตั้งเป็น "View only" สำหรับผู้ใช้ทั่วไป
3. **Backup ข้อมูล** - Export ชีท Price_History เป็น CSV เป็นระยะ
4. **Monitor การใช้งาน** - ตรวจสอบ Console และ Logs เป็นระยะ

---

## 📈 Performance

### Benchmarks

| การดำเนินการ | เวลา (โดยประมาณ) |
|--------------|-------------------|
| โหลดราคาจาก Google Sheets | 1-2 วินาที |
| โหลดราคาจาก localStorage | < 0.1 วินาที |
| บันทึกราคาไป Google Sheets | 2-3 วินาที |
| บันทึกราคาไป localStorage | < 0.1 วินาที |

### Optimization Tips

1. **ใช้ localStorage เป็น Cache** - ระบบทำอยู่แล้ว
2. **Lazy Loading** - โหลดราคาเมื่อจำเป็นเท่านั้น
3. **Error Handling** - จัดการ error และ fallback อย่างเหมาะสม
4. **Timeout** - ตั้ง timeout สำหรับ API calls

---

## 🎯 Best Practices

### สำหรับแอดมิน

1. **ตั้งราคาผ่าน price-management.html เท่านั้น** - อย่าแก้ไขใน Google Sheets โดยตรง
2. **ตรวจสอบราคาก่อนบันทึก** - ตรวจสอบให้แน่ใจว่าราคาถูกต้อง
3. **Backup ข้อมูล** - Export ชีท Price_History เป็นระยะ
4. **Monitor Logs** - ตรวจสอบ Console และ Apps Script Logs

### สำหรับผู้เติมน้ำมัน

1. **ตรวจสอบราคาก่อนทำรายการ** - เปิด Console ดูว่าดึงราคาจากไหน
2. **รีเฟรชหน้าเป็นระยะ** - เพื่อให้ได้ราคาล่าสุด
3. **รายงานปัญหา** - ถ้าพบราคาผิดปกติ ให้รายงานทันที

### สำหรับ Developer

1. **ทดสอบทุกครั้งหลังแก้ไข** - ใช้ TESTING_CHECKLIST.md
2. **เก็บ Logs** - บันทึก logs สำหรับ debugging
3. **Handle Errors** - จัดการ error ทุกกรณี
4. **Document Changes** - อัปเดต CHANGELOG.md ทุกครั้ง

---

## 📝 TODO / Future Enhancements

- [ ] สร้างหน้า `price-history.html` เพื่อดูประวัติราคา
- [ ] เพิ่มกราฟแสดงการเปลี่ยนแปลงราคา
- [ ] เพิ่มระบบแจ้งเตือนเมื่อราคาเปลี่ยน
- [ ] เพิ่มการ Export ประวัติราคาเป็น PDF
- [ ] เพิ่มการค้นหาราคาตามช่วงเวลา
- [ ] เพิ่มการเปรียบเทียบราคาระหว่างช่วงเวลา
- [ ] เพิ่ม API สำหรับดึงราคาเฉลี่ยต่อเดือน/ปี
- [ ] เพิ่มระบบ Multi-user authentication
- [ ] เพิ่มการ Validate ราคา (ป้องกันราคาผิดปกติ)
- [ ] เพิ่ม Caching strategy ที่ดีกว่า

---

## 📞 Support

หากพบปัญหาหรือต้องการความช่วยเหลือ:

1. **อ่านเอกสาร:**
   - `PRICE_SHEET_SETUP_GUIDE.md` - คู่มือฉบับเต็ม
   - `PRICE_SHEET_QUICK_START.md` - Quick Start
   - `TESTING_CHECKLIST.md` - รายการทดสอบ

2. **ตรวจสอบ:**
   - Console ใน Browser (F12)
   - Logs ใน Google Apps Script
   - ชีท Price_History ใน Google Sheets

3. **Debug:**
   ```javascript
   // ตรวจสอบ localStorage
   console.log(localStorage.getItem('googleScriptUrl'));
   console.log(localStorage.getItem('sheetsId'));
   console.log(localStorage.getItem('fuelPrices'));
   
   // ทดสอบ API
   const url = `${localStorage.getItem('googleScriptUrl')}?action=getCurrentPrices&sheetsId=${localStorage.getItem('sheetsId')}`;
   fetch(url).then(r => r.json()).then(console.log);
   ```

---

## 📄 License

ระบบจัดการน้ำมัน - Price Management Module  
Version 2.1  
© 2024

---

**เอกสารนี้อัปเดตล่าสุด:** 2024-01-15  
**ผู้จัดทำ:** ระบบจัดการน้ำมัน Development Team