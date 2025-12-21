﻿﻿// ⚠️ Configuration ถูกย้ายไปที่ config.js แล้ว
// ไฟล์นี้จะโหลด config จาก config.js ที่ include ไว้ใน HTML
// ตรวจสอบว่า config ถูกโหลดหรือยัง
if (typeof GOOGLE_SCRIPT_URL === 'undefined') {
    console.error('❌ config.js ยังไม่ถูกโหลด! กรุณาเพิ่ม <script src="config.js"></script> ใน HTML');
}

// สำหรับ backward compatibility (ถ้ามีการใช้ตัวแปรเก่า)
const INVENTORY_SHEET_GID = SHEET_GIDS.INVENTORY;
const TRANSACTION_LOG_SHEET_GID = SHEET_GIDS.TRANSACTION_HISTORY;

// ข้อมูลแหล่งน้ำมัน (จะถูกโหลดจาก Google Sheets)
let fuelSources = [];

// Default fuel sources template (fallback เมื่อไม่สามารถโหลดจาก Google Sheets ได้)
const defaultFuelSources = [
    {
        id: 'purchase',
        name: 'จัดซื้อจาก ปตท.',
        capacity: null, // ไม่จำกัด
        currentStock: 0,
        type: 'purchase'
    },
    {
        id: 'purchase_drum_200l',
        name: 'PTT Purchase - 200L',
        capacity: null, // ไม่จำกัด
        currentStock: 0,
        type: 'purchase'
    },
    {
        id: 'nakhonsawan_tank1',
        name: 'สนามบินนครสวรรค์ แท๊ง 1',
        capacity: 20000,
        currentStock: 0,
        type: 'tank'
    },
    {
        id: 'nakhonsawan_tank2',
        name: 'สนามบินนครสวรรค์ แท๊ง 2',
        capacity: 20000,
        currentStock: 0,
        type: 'tank'
    },
    {
        id: 'khlong_luang_tank1',
        name: 'สนามบินคลองหลวง แท๊ก 1',
        capacity: 15000,
        currentStock: 0,
        type: 'tank'
    },
    {
        id: 'truck_96_0677',
        name: '96-0677 กทม.',
        capacity: 7000,
        currentStock: 0,
        type: 'truck'
    },
    {
        id: 'truck_97_9769',
        name: '97-9769 กทม.',
        capacity: 12000,
        currentStock: 0,
        type: 'truck'
    },
    {
        id: 'truck_50_9109',
        name: '50-9109 กทม.',
        capacity: 16000,
        currentStock: 0,
        type: 'truck'
    },
    {
        id: 'truck_52_4018',
        name: '52-4018 กทม.',
        capacity: 16000,
        currentStock: 0,
        type: 'truck'
    },
    {
        id: 'truck_53_1224',
        name: '53-1224 กทม.',
        capacity: 16000,
        currentStock: 0,
        type: 'truck'
    },
    {
        id: 'truck_53_1225',
        name: '53-1225 กทม.',
        capacity: 16000,
        currentStock: 0,
        type: 'truck'
    },
    {
        id: 'truck_54_3780',
        name: '54-3780 กทม.',
        capacity: 16000,
        currentStock: 0,
        type: 'truck'
    },
    {
        id: 'truck_54_3781',
        name: '54-3781 กทม.',
        capacity: 16000,
        currentStock: 0,
        type: 'truck'
    },
    {
        id: 'truck_2320',
        name: 'สฝษ/บ. 2320-036-0001/001',
        capacity: 8000,
        currentStock: 0,
        type: 'truck'
    },
    {
        id: 'drum_nakhonsawan',
        name: 'สนามบินนครสวรรค์ - ถัง 200L',
        capacity: null, // ไม่จำกัด
        currentStock: 0,
        type: 'drum'
    },
    {
        id: 'drum_khlong_luang',
        name: 'สนามบินคลองหลวง - ถัง 200L',
        capacity: null, // ไม่จำกัด
        currentStock: 0,
        type: 'drum'
    }
];

// ข้อมูล log สำหรับการแสดงสรุป
let transactionLogs = [];
let currentSelectedSource = null;
let latestSummaryData = null;

// ค่าคงที่สำหรับถัง 200L
const DRUM_CAPACITY_LITERS = 200; // 1 ถัง = 200 ลิตร

// ===== UID Management =====
// ✅ ฟังก์ชันอัพเดท UID ล่าสุดจาก Google Sheets
function updateLastTransactionUIDFromSheets(transactionLogs) {
    if (!transactionLogs || transactionLogs.length === 0) {
        console.log('⚠️ ไม่มี Transaction Logs จาก Google Sheets, ข้ามการอัพเดท UID');
        return;
    }
    
    // หา UID ที่มีหมายเลขมากที่สุด
    let maxUIDNumber = 0;
    let maxUID = null;
    
    transactionLogs.forEach(log => {
        if (log.uid) {
            const match = log.uid.match(/FT(\d+)/);
            if (match) {
                const uidNumber = parseInt(match[1]);
                if (uidNumber > maxUIDNumber) {
                    maxUIDNumber = uidNumber;
                    maxUID = log.uid;
                }
            }
        }
    });
    
    // ถ้าหา UID ได้ ให้อัพเดท localStorage
    if (maxUID) {
        localStorage.setItem('lastTransactionUID', maxUID);
        console.log(`✅ อัพเดท UID ล่าสุดจาก Google Sheets: ${maxUID} (หมายเลข: ${maxUIDNumber})`);
    } else {
        console.log('⚠️ ไม่พบ UID ที่ถูกต้องในข้อมูลจาก Google Sheets');
    }
}

function populateProvinceSelects() {
    const selectIds = [
        'operatingUnit',
        'pttOperatingUnit',
        'returnOperatingUnit',
        'pttPurchase200LOperatingUnit',
        'transactionNakhonsawanOperatingUnit',
        'transactionKhlongLuangOperatingUnit',
        'removeNakhonsawanOperatingUnit',
        'removeKhlongLuangOperatingUnit'
    ];
    
    selectIds.forEach(selectId => {
        const selectElement = document.getElementById(selectId);
        if (selectElement && typeof THAI_PROVINCES !== 'undefined') {
            while (selectElement.options.length > 1) {
                selectElement.remove(1);
            }
            
            THAI_PROVINCES.forEach(province => {
                const option = document.createElement('option');
                option.value = province.nameThai;
                option.textContent = province.nameThai;
                selectElement.appendChild(option);
            });
            
            console.log(`✅ เพิ่มจังหวัดเข้า #${selectId} แล้ว (${THAI_PROVINCES.length} จังหวัด)`);
        }
    });
}

function getSelectedMissions() {
    const checkboxes = document.querySelectorAll('input[name="missions"]:checked');
    const missions = Array.from(checkboxes).map(cb => cb.value);
    return missions.length > 0 ? missions.join(',') : '';
}

// ฟังก์ชันสร้าง UID แบบ FT0001, FT0002, ...
function generateUID() {
    // โหลด UID ล่าสุดจาก localStorage
    let lastUID = localStorage.getItem('lastTransactionUID');
    let uidNumber = 1;
    
    if (lastUID) {
        // แยกเลขออกจาก UID (เช่น FT0001 -> 1)
        const match = lastUID.match(/FT(\d+)/);
        if (match) {
            uidNumber = parseInt(match[1]) + 1;
        }
    }
    
    // สร้าง UID ใหม่ในรูปแบบ FT0001 (4 หลัก)
    const newUID = `FT${String(uidNumber).padStart(4, '0')}`;
    
    // บันทึก UID ล่าสุด
    localStorage.setItem('lastTransactionUID', newUID);
    
    return newUID;
}

// ===== Price Management =====
// ราคาถูกจัดการโดยดึงจาก Google Sheet gid=1828300695 (PTT_PRICES) ตามจังหวัด
// ผ่านฟังก์ชัน fetchPTTPricesByProvince()

/**
 * Fetch PTT prices from Sheet gid=1828300695 by matching province
 * @param {string} province - Province name (จังหวัด) to search for
 * @returns {Promise<{pricePerLiter: number, pricePerDrum: number}>}
 */
async function fetchPTTPricesByProvince(province) {
    if (!province || province.trim() === '') {
        console.warn('⚠️ Province name is empty');
        return { pricePerLiter: 0, pricePerDrum: 0 };
    }
    
    const url = `${GOOGLE_SCRIPT_URL}?action=getPTTPricesByProvince&sheetsId=${GOOGLE_SHEETS_ID}&gid=${SHEET_GIDS.PTT_PRICES}&province=${encodeURIComponent(province)}`;
    
    console.log('🔍 Fetching PTT prices for province:', province);
    console.log('📡 Request URL:', url);
    
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('📦 Response from Google Sheets:', result);
        
        if (!result.success) {
            console.warn('⚠️ Failed to fetch prices:', result.error);
            return { pricePerLiter: 0, pricePerDrum: 0 };
        }
        
        if (!result.data) {
            console.warn('⚠️ No price data returned for province:', province);
            return { pricePerLiter: 0, pricePerDrum: 0 };
        }
        
        console.log('✅ Successfully fetched PTT prices:', result.data);
        return {
            pricePerLiter: parseFloat(result.data.pricePerLiter) || 0,
            pricePerDrum: parseFloat(result.data.pricePerDrum) || 0
        };
    } catch (error) {
        console.error('❌ Error in fetchPTTPricesByProvince:', error);
        return { pricePerLiter: 0, pricePerDrum: 0 };
    }
}

/**
 * Fetch PTT prices from Sheet gid=1828300695 by matching location name
 * @param {string} locationName - Location name (e.g., 'สนามบินนครสวรรค์ - ถัง 200L')
 * @returns {Promise<{pricePerDrum: number}>}
 */
async function fetchPTTPricesByLocationName(locationName) {
    if (!locationName || locationName.trim() === '') {
        console.warn('⚠️ Location name is empty');
        return { pricePerDrum: 0 };
    }
    
    const url = `${GOOGLE_SCRIPT_URL}?action=getPTTPricesByLocationName&sheetsId=${GOOGLE_SHEETS_ID}&gid=${SHEET_GIDS.PTT_PRICES}&locationName=${encodeURIComponent(locationName)}`;
    
    console.log('🔍 Fetching PTT prices for location:', locationName);
    console.log('📡 Request URL:', url);
    
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('📦 Response from Google Sheets:', result);
        
        if (!result.success) {
            console.warn('⚠️ Failed to fetch prices:', result.error);
            return { pricePerDrum: 0 };
        }
        
        if (!result.data) {
            console.warn('⚠️ No price data returned for location:', locationName);
            return { pricePerDrum: 0 };
        }
        
        console.log('✅ Successfully fetched PTT prices:', result.data);
        return {
            pricePerDrum: parseFloat(result.data.pricePerDrum) || 0
        };
    } catch (error) {
        console.error('❌ Error in fetchPTTPricesByLocationName:', error);
        return { pricePerDrum: 0 };
    }
}

// ===== Image Upload Management =====
const ImageUpload = {
    MAX_FILE_SIZE: 5 * 1024 * 1024,
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'],
    
    validateImageFile(file) {
        if (!file) {
            return { valid: false, error: 'ยังไม่ได้เลือกไฟล์' };
        }
        
        if (file.size > this.MAX_FILE_SIZE) {
            const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
            return { 
                valid: false, 
                error: `ไฟล์มีขนาดใหญ่เกิน 5MB (ไฟล์ปัจจุบัน: ${sizeMB}MB)` 
            };
        }
        
        if (!this.ALLOWED_TYPES.includes(file.type)) {
            return { 
                valid: false, 
                error: `ประเภทไฟล์ไม่รองรับ (${file.type}). รองรับเฉพาะ: JPG, PNG, GIF, WebP, BMP` 
            };
        }
        
        return { valid: true };
    },
    
    displayImagePreview(file) {
        const previewContainer = document.getElementById('imagePreview');
        const sizeInfo = document.getElementById('imageSizeInfo');
        const uploadLabel = document.querySelector('.upload-label');
        const errorElement = document.querySelector('.image-error');
        
        if (!file) {
            previewContainer.innerHTML = '';
            sizeInfo.textContent = '';
            uploadLabel.classList.remove('has-image');
            if (errorElement) errorElement.classList.remove('show');
            return;
        }
        
        const validation = this.validateImageFile(file);
        
        if (!validation.valid) {
            previewContainer.innerHTML = '';
            sizeInfo.textContent = '';
            uploadLabel.classList.remove('has-image');
            if (!errorElement) {
                const error = document.createElement('small');
                error.className = 'image-error show';
                error.textContent = validation.error;
                document.querySelector('.image-upload-container').appendChild(error);
            } else {
                errorElement.textContent = validation.error;
                errorElement.classList.add('show');
            }
            return;
        }
        
        if (errorElement) errorElement.classList.remove('show');
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.onload = () => {
                previewContainer.innerHTML = '';
                previewContainer.appendChild(img);
                
                const infoDiv = document.createElement('div');
                infoDiv.className = 'preview-info';
                infoDiv.innerHTML = `
                    <i class="fas fa-check-circle"></i>
                    <span>พร้อมสำหรับอัพโหลด</span>
                `;
                previewContainer.appendChild(infoDiv);
                
                const filenameDiv = document.createElement('div');
                filenameDiv.className = 'preview-filename';
                filenameDiv.textContent = `${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
                previewContainer.appendChild(filenameDiv);
                
                uploadLabel.classList.add('has-image');
            };
        };
        reader.readAsDataURL(file);
        
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        sizeInfo.textContent = `ขนาดไฟล์: ${sizeMB} MB`;
        sizeInfo.style.color = '#27ae60';
    },
    
    convertFileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    },
    
    getSelectedFile() {
        const fileInput = document.getElementById('transactionImage');
        return fileInput && fileInput.files.length > 0 ? fileInput.files[0] : null;
    },
    
    resetUpload() {
        const fileInput = document.getElementById('transactionImage');
        if (fileInput) fileInput.value = '';
        this.displayImagePreview(null);
    },
    
    async uploadImageToServer(base64Data, originalFilename) {
        try {
            if (!base64Data) {
                throw new Error('ไม่มีข้อมูลรูปภาพ');
            }
            
            const mimeTypeMatch = base64Data.match(/^data:([^;]+);base64,/);
            const detectedMimeType = mimeTypeMatch ? mimeTypeMatch[1] : '';
            
            if (!this.ALLOWED_TYPES.includes(detectedMimeType)) {
                throw new Error(`ประเภทไฟล์ไม่รองรับ (${detectedMimeType}). รองรับเฉพาะ: JPG, PNG, GIF, WebP, BMP`);
            }
            
            if (typeof GOOGLE_SCRIPT_URL === 'undefined') {
                throw new Error('GOOGLE_SCRIPT_URL ไม่ถูกตั้งค่า');
            }
            
            if (typeof GOOGLE_DRIVE_FOLDER_ID === 'undefined') {
                throw new Error('GOOGLE_DRIVE_FOLDER_ID ไม่ถูกตั้งค่า');
            }
            
            const timestamp = new Date().getTime();
            const randomStr = Math.random().toString(36).substring(2, 8);
            const fileExtension = originalFilename.split('.').pop() || 'jpg';
            const filename = `FM_${timestamp}_${randomStr}.${fileExtension}`;
            
            console.log('🔄 Uploading image to Google Drive...');
            console.log('   Filename:', filename);
            
            const payload = {
                action: 'uploadImage',
                base64ImageData: base64Data,
                filename: filename,
                folderId: GOOGLE_DRIVE_FOLDER_ID
            };
            
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain'
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'การอัพโหลดล้มเหลว');
            }
            
            console.log('✅ Image uploaded successfully:');
            console.log('   URL:', result.imageUrl);
            console.log('   File ID:', result.fileId);
            
            return {
                success: true,
                imageUrl: result.imageUrl,
                fileId: result.fileId,
                filename: result.filename,
                uploadDate: result.uploadDate
            };
            
        } catch (error) {
            console.error('❌ Error uploading image:', error);
            return {
                success: false,
                error: error.message || 'การอัพโหลดรูปภาพล้มเหลว'
            };
        }
    }
};

// ===== UID Modal Management =====
// ฟังก์ชันแสดง UID Modal หลังทำรายการสำเร็จ
function showUIDModal(transactionData) {
    const modal = document.getElementById('uidModal');
    
    // แสดง UID
    document.getElementById('transactionUID').textContent = transactionData.uid;
    
    // แสดงประเภทธุรกรรม - รองรับหลายรูปแบบ
    let transactionTypeText;
    if (transactionData.type) {
        transactionTypeText = transactionData.type;
    } else if (transactionData.transactionType === 'refill') {
        transactionTypeText = 'ซื้อเข้า';
    } else if (transactionData.transactionType === 'dispense') {
        transactionTypeText = 'เติมน้ำมัน';
    } else if (transactionData.transactionType === 'drain') {
        transactionTypeText = 'เดรนน้ำมัน';
    } else {
        transactionTypeText = transactionData.transactionType || '-';
    }
    document.getElementById('uidTransactionType').textContent = transactionTypeText;
    
    // แสดงแหล่ง - รองรับหลายรูปแบบ
    const sourceText = transactionData.source || transactionData.sourceName || '-';
    document.getElementById('uidSource').textContent = sourceText;
    
    // แสดงปลายทาง (ถ้ามี) - รองรับหลายรูปแบบ
    const destinationRow = document.getElementById('uidDestinationRow');
    const destinationText = transactionData.destination || transactionData.destinationName || null;
    if (destinationText) {
        document.getElementById('uidDestination').textContent = destinationText;
        destinationRow.style.display = 'flex';
    } else {
        destinationRow.style.display = 'none';
    }
    
    // แสดงปริมาณ - รองรับหลายรูปแบบ
    const volumeText = transactionData.volume || (transactionData.liters ? `${transactionData.liters} ลิตร` : '-');
    document.getElementById('uidVolume').textContent = volumeText;
    
    // แสดง Book No. และ Receipt No. (ถ้ามี)
    const bookNoRow = document.getElementById('uidBookNoRow');
    const receiptNoRow = document.getElementById('uidReceiptNoRow');
    
    if (transactionData.bookNo) {
        document.getElementById('uidBookNo').textContent = transactionData.bookNo;
        bookNoRow.style.display = 'flex';
    } else {
        bookNoRow.style.display = 'none';
    }
    
    if (transactionData.receiptNo) {
        document.getElementById('uidReceiptNo').textContent = transactionData.receiptNo;
        receiptNoRow.style.display = 'flex';
    } else {
        receiptNoRow.style.display = 'none';
    }
    
    // แสดงผู้ทำรายการ - รองรับหลายรูปแบบ
    const operatorText = transactionData.operator || transactionData.operatorName || '-';
    document.getElementById('uidOperator').textContent = operatorText;
    
    // แสดงเวลา - ใช้เวลาที่ส่งมา หรือเวลาปัจจุบัน
    const timestamp = transactionData.timestamp || new Date().toLocaleString('th-TH');
    document.getElementById('uidTimestamp').textContent = timestamp;
    
    // แสดง modal
    modal.style.display = 'block';
    
    // Setup event listeners
    setupUIDModalListeners(transactionData);
}

// ฟังก์ชัน setup event listeners สำหรับ UID Modal
function setupUIDModalListeners(transactionData) {
    // ปุ่มปิด
    const closeButtons = [
        document.getElementById('closeUidModal'),
        document.getElementById('closeUidBtn')
    ];
    
    closeButtons.forEach(btn => {
        if (btn) {
            btn.onclick = () => {
                document.getElementById('uidModal').style.display = 'none';
            };
        }
    });
    
    // ปุ่มคัดลอก UID
    const copyBtn = document.getElementById('copyUidBtn');
    if (copyBtn) {
        copyBtn.onclick = () => {
            const uid = transactionData.uid;
            navigator.clipboard.writeText(uid).then(() => {
                // เปลี่ยนข้อความปุ่มชั่วคราว
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="fas fa-check me-2"></i>คัดลอกแล้ว!';
                copyBtn.classList.add('btn-success');
                copyBtn.classList.remove('btn-primary');
                
                setTimeout(() => {
                    copyBtn.innerHTML = originalText;
                    copyBtn.classList.remove('btn-success');
                    copyBtn.classList.add('btn-primary');
                }, 2000);
            }).catch(err => {
                console.error('ไม่สามารถคัดลอกได้:', err);
                alert('ไม่สามารถคัดลอก UID ได้');
            });
        };
    }
    
    // ปุ่มพิมพ์
    const printBtn = document.getElementById('printUidBtn');
    if (printBtn) {
        printBtn.onclick = () => {
            // สร้างหน้าพิมพ์
            const printWindow = window.open('', '_blank');
            const printContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Transaction Receipt - ${transactionData.uid}</title>
                    <style>
                        body {
                            font-family: 'Sarabun', Arial, sans-serif;
                            padding: 40px;
                            max-width: 600px;
                            margin: 0 auto;
                        }
                        h1 {
                            text-align: center;
                            color: #333;
                            border-bottom: 3px solid #667eea;
                            padding-bottom: 15px;
                        }
                        .uid-box {
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            padding: 20px;
                            text-align: center;
                            border-radius: 10px;
                            margin: 20px 0;
                        }
                        .uid-box .label {
                            font-size: 14px;
                            opacity: 0.8;
                        }
                        .uid-box .uid {
                            font-size: 36px;
                            font-weight: bold;
                            letter-spacing: 3px;
                            font-family: 'Courier New', monospace;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin: 20px 0;
                        }
                        td {
                            padding: 12px;
                            border-bottom: 1px solid #ddd;
                        }
                        td:first-child {
                            color: #666;
                            width: 40%;
                        }
                        td:last-child {
                            font-weight: bold;
                        }
                        .footer {
                            text-align: center;
                            margin-top: 40px;
                            color: #666;
                            font-size: 12px;
                        }
                    </style>
                </head>
                <body>
                    <h1>ใบรับรองการทำรายการ</h1>
                    <div class="uid-box">
                        <div class="label">Transaction ID</div>
                        <div class="uid">${transactionData.uid}</div>
                    </div>
                    <table>
                        <tr>
                            <td>ประเภท:</td>
                            <td>${transactionData.transactionType === 'refill' ? 'ซื้อเข้า' : 'เติมน้ำมัน'}</td>
                        </tr>
                        <tr>
                            <td>แหล่ง:</td>
                            <td>${transactionData.sourceName || '-'}</td>
                        </tr>
                        <tr>
                            <td>ปริมาณ:</td>
                            <td>${transactionData.volume || '-'}</td>
                        </tr>
                        ${transactionData.bookNo ? `
                        <tr>
                            <td>Book No.:</td>
                            <td>${transactionData.bookNo}</td>
                        </tr>
                        ` : ''}
                        ${transactionData.receiptNo ? `
                        <tr>
                            <td>Receipt No./Ticket number:</td>
                            <td>${transactionData.receiptNo}</td>
                        </tr>
                        ` : ''}
                        <tr>
                            <td>ผู้ทำรายการ:</td>
                            <td>${transactionData.operatorName || '-'}</td>
                        </tr>
                        <tr>
                            <td>เวลา:</td>
                            <td>${new Date().toLocaleString('th-TH')}</td>
                        </tr>
                    </table>
                    <div class="footer">
                        <p>ระบบจัดการน้ำมัน - กองบริหารการบินเกษตร กรมฝนหลวงและการบินเกษตร</p>
                        <p>พิมพ์เมื่อ: ${new Date().toLocaleString('th-TH')}</p>
                    </div>
                </body>
                </html>
            `;
            
            printWindow.document.write(printContent);
            printWindow.document.close();
            
            // รอให้โหลดเสร็จแล้วพิมพ์
            printWindow.onload = () => {
                printWindow.print();
            };
        };
    }
}

// ฟังก์ชันช่วยสำหรับการจัดการถัง 200L
function isDrumSource(source) {
    return source && source.type === 'drum';
}

function drumsToLiters(drums) {
    return drums * DRUM_CAPACITY_LITERS;
}

function litersToDrums(liters) {
    return liters / DRUM_CAPACITY_LITERS;
}

function formatDrumDisplay(liters) {
    const drums = litersToDrums(liters);
    return `${drums.toLocaleString()} ถัง (${liters.toLocaleString()} ลิตร)`;
}

// Unified Loading utility functions
const LoadingManager = {
    show(text = 'กำลังโหลด...') {
        const overlay = document.getElementById('loadingOverlay');
        const loadingText = document.getElementById('loadingText');
        if (overlay && loadingText) {
            loadingText.textContent = text;
            overlay.classList.add('active');
        }
    },
    
    hide() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
        this.resetProgress();
    },
    
    updateProgress(percent, details = '') {
        const progressBar = document.getElementById('progressBar');
        const progressPercent = document.getElementById('progressPercent');
        const progressDetails = document.getElementById('progressDetails');
        const progressContainer = document.getElementById('progressContainer');
        
        if (progressContainer) {
            progressContainer.style.display = 'block';
        }
        
        if (progressBar) {
            progressBar.style.width = Math.min(percent, 100) + '%';
        }
        
        if (progressPercent) {
            progressPercent.textContent = Math.min(percent, 100);
        }
        
        if (progressDetails && details) {
            progressDetails.textContent = details;
        }
    },
    
    resetProgress() {
        this.updateProgress(0, '');
        const progressContainer = document.getElementById('progressContainer');
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
    },
    
    setButton(buttonId, isLoading = true) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.classList.toggle('loading', isLoading);
            button.disabled = isLoading;
        }
    }
};

// Unified Modal Manager
const ModalManager = {
    activeModals: new Set(),
    
    open(modalId, config = {}) {
        const modal = document.getElementById(modalId);
        if (!modal) return false;
        
        // Set title if provided
        if (config.title) {
            const titleElement = modal.querySelector('h2') || modal.querySelector('.modal-title');
            if (titleElement) titleElement.textContent = config.title;
        }
        
        // Reset form if it exists
        const form = modal.querySelector('form');
        if (form) form.reset();
        
        modal.style.display = 'block';
        this.activeModals.add(modalId);
        
        // Setup close handlers if not already set
        if (!modal.hasEventListeners) {
            this.setupModalHandlers(modalId);
            modal.hasEventListeners = true;
        }
        
        return true;
    },
    
    close(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            this.activeModals.delete(modalId);
        }
    },
    
    closeAll() {
        this.activeModals.forEach(modalId => this.close(modalId));
    },
    
    setupModalHandlers(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        // Close button handler
        const closeBtn = modal.querySelector('.close, .close-ptt');
        if (closeBtn) {
            closeBtn.onclick = () => this.close(modalId);
        }
        
        // Outside click handler
        modal.onclick = (event) => {
            if (event.target === modal) {
                this.close(modalId);
            }
        };
    }
};

// Legacy functions for compatibility
const showLoading = LoadingManager.show.bind(LoadingManager);
const hideLoading = LoadingManager.hide.bind(LoadingManager);
const setButtonLoading = LoadingManager.setButton.bind(LoadingManager);

// แสดง/ซ่อน loading state สำหรับ summary section
function showSummaryLoading(isLoading = true, isFirstLoad = false) {
    const summaryCards = document.querySelectorAll('.summary-card');
    summaryCards.forEach(card => {
        if (isLoading) {
            card.classList.add('loading');
            if (isFirstLoad) {
                card.classList.add('first-load');
            }
        } else {
            card.classList.remove('loading', 'first-load');
        }
    });
}

// Cache functions สำหรับ Summary Data
function saveSummaryToCache(summaryData) {
    try {
        const cacheData = {
            data: summaryData,
            timestamp: Date.now()
        };
        localStorage.setItem('summaryCache', JSON.stringify(cacheData));
        console.log('💾 บันทึกข้อมูลสรุปลง cache');
    } catch (error) {
        console.warn('⚠️ ไม่สามารถบันทึก cache:', error);
    }
}

function loadSummaryFromCache() {
    try {
        const cached = localStorage.getItem('summaryCache');
        if (!cached) return null;
        
        const cacheData = JSON.parse(cached);
        const cacheAge = Date.now() - cacheData.timestamp;
        const maxAge = 5 * 60 * 1000; // 5 นาที
        
        // ถ้า cache เก่าเกิน 5 นาที ให้ลบทิ้ง
        if (cacheAge > maxAge) {
            localStorage.removeItem('summaryCache');
            console.log('🗑️ ลบ cache ที่หมดอายุ');
            return null;
        }
        
        console.log(`📦 โหลดข้อมูลจาก cache (อายุ ${Math.round(cacheAge / 1000)} วินาที)`);
        return cacheData.data;
    } catch (error) {
        console.warn('⚠️ ไม่สามารถโหลด cache:', error);
        return null;
    }
}

// โหลดข้อมูลจาก localStorage
function loadData() {
    const savedSources = localStorage.getItem('fuelSources');
    
    if (savedSources) {
        const parsedSources = JSON.parse(savedSources);
        // อัพเดท currentStock จากข้อมูลที่บันทึกไว้
        fuelSources.forEach((source, index) => {
            const savedSource = parsedSources.find(s => s.id === source.id);
            if (savedSource) {
                fuelSources[index].currentStock = savedSource.currentStock || 0;
            }
        });
    }
    
    // ไม่โหลด transactionLogs จาก localStorage - ใช้เฉพาะข้อมูลจาก Google Sheets
}

// ฟังก์ชั่นสำหรับลองใหม่เมื่อเชื่อมต่อล้มเหลว
async function fetchWithRetry(url, maxRetries = 3, delayMs = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                console.log(`✅ ลองครั้งที่ ${attempt} สำเร็จ`);
                return response;
            }
            
            if (attempt < maxRetries) {
                const delay = delayMs * attempt;
                console.log(`⏳ ลองใหม่ครั้งที่ ${attempt}/${maxRetries} ใน ${delay}ms...`);
                LoadingManager.updateProgress(
                    5 + (attempt * 2),
                    `ลองเชื่อมต่อใหม่ (${attempt}/${maxRetries})...`
                );
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        } catch (error) {
            console.warn(`❌ ครั้งที่ ${attempt} ล้มเหลว: ${error.message}`);
            if (attempt < maxRetries) {
                const delay = delayMs * attempt;
                console.warn(`⏳ ลองใหม่ใน ${delay}ms...`);
                LoadingManager.updateProgress(
                    5 + (attempt * 2),
                    `ลองเชื่อมต่อใหม่ (${attempt}/${maxRetries})...`
                );
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw error;
            }
        }
    }
}

// ฟังก์ชั่นเชื่อมต่อ Google Sheets
async function loadInventoryFromSheets() {
    try {
        showLoading('กำลังโหลดข้อมูลแหล่งน้ำมัน...');
        LoadingManager.updateProgress(10, 'เชื่อมต่อ Google Sheets...');
        
        // โหลดข้อมูล master data (structure และ current stock)
        const response = await fetchWithRetry(`${GOOGLE_SCRIPT_URL}?action=getMasterData&sheetsId=${GOOGLE_SHEETS_ID}&gid=${INVENTORY_SHEET_GID}`, 3, 1000);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.data && Array.isArray(result.data)) {
            // แปลงข้อมูลจาก Google Sheets มาเป็น fuelSources format
            fuelSources = result.data.map(row => {
                return {
                    id: row.id || generateId(row.name),
                    name: row.name || row.source_name || '',
                    capacity: row.capacity ? (row.capacity === 'ไม่จำกัด' ? null : parseInt(row.capacity)) : null,
                    currentStock: parseFloat(row.current_stock) || 0,
                    type: row.type || inferType(row.name || row.source_name || ''),
                    status: (row.status || 'active').toLowerCase() // เพิ่ม status field
                };
            }).filter(source => source.name); // กรองเอาเฉพาะที่มี name
            
            // เพิ่ม special sources ที่อยู่ในโค้ดเท่านั้น (เช่น purchase_drum_200l)
            const specialSources = defaultFuelSources.filter(defaultSource => 
                !fuelSources.some(loaded => loaded.id === defaultSource.id)
            );
            fuelSources = [...fuelSources, ...specialSources];
            
            console.log('✅ โหลดข้อมูลแหล่งน้ำมัน สำเร็จ:', fuelSources.length, 'รายการ');
            LoadingManager.updateProgress(30, 'โหลดข้อมูลแหล่งน้ำมัน สำเร็จ...');
        } else {
            // ถ้า Google Apps Script ส่ง error กลับมา
            const errorMsg = result.error || 'ไม่สามารถโหลดข้อมูลได้หรือข้อมูลไม่ถูกต้อง';
            console.warn('Google Apps Script Error:', errorMsg);
            
            // ถ้าเป็น "Invalid action" อาจหมายถึงต้องอัพเดต script deployment
            if (errorMsg === 'Invalid action') {
                console.warn('⚠️ Google Apps Script อาจต้องการการ deploy ใหม่เพื่อรองรับ getMasterData action');
                
                // ลองใช้ action เก่าแทน
                console.log('🔄 ลอง fallback เป็น getInventory action...');
                LoadingManager.updateProgress(25, 'ใช้ fallback method...');
                try {
                    const fallbackResponse = await fetchWithRetry(`${GOOGLE_SCRIPT_URL}?action=getInventory&sheetsId=${GOOGLE_SHEETS_ID}&gid=${INVENTORY_SHEET_GID}`);
                    const fallbackResult = await fallbackResponse.json();
                    
                    if (fallbackResult.success && fallbackResult.data) {
                        // แปลง format จาก getInventory เป็น fuelSources
                        fuelSources = defaultFuelSources.map(source => ({
                            ...source,
                            currentStock: fallbackResult.data[source.name]?.currentStock || 0
                        }));
                        
                        console.log('✅ โหลดข้อมูลจาก Google Sheets สำเร็จ (fallback):', fuelSources.length, 'รายการ');
                        LoadingManager.updateProgress(30, 'โหลดข้อมูลแหล่งน้ำมัน (fallback) สำเร็จ...');
                        return; // ออกจากฟังก์ชัน เพราะได้ข้อมูลแล้ว
                    }
                } catch (fallbackError) {
                    console.warn('❌ Fallback ก็ล้มเหลวเช่นกัน:', fallbackError);
                }
            }
            
            throw new Error(errorMsg);
        }
    } catch (error) {
        console.error('Error loading from Google Sheets:', error);
        
        // ใช้ข้อมูลสำรองแบบออฟไลน์โดยตรง (ไม่ถามผู้ใช้)
        console.log('⚠️ ใช้ข้อมูลสำรองแบบออฟไลน์');
        showLoading('กำลังโหลดข้อมูลสำรอง...');
        LoadingManager.updateProgress(30, 'ใช้ข้อมูลออฟไลน์...');
        
        // ใช้ default fuel sources แทน
        fuelSources = [...defaultFuelSources];
        
        // พยายามโหลดจาก localStorage ถ้ามี
        loadData(); // อัปเดต stock จาก localStorage
    }
}

// ฟังก์ชั่นสำหรับสร้าง ID จากชื่อ
function generateId(name) {
    if (!name) return 'unknown_' + Date.now();
    
    // ตรวจสอบว่าเป็น string จริงๆ
    const nameStr = typeof name === 'string' ? name : String(name);
    
    return nameStr
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^\w\u0E00-\u0E7F]/g, '')
        .substring(0, 50);
}

// ฟังก์ชั่นสำหรับคาดเดาประเภทจากชื่อ
function inferType(name) {
    if (!name) return 'unknown';
    
    // ตรวจสอบว่าเป็น string จริงๆ
    const nameStr = typeof name === 'string' ? name : String(name);
    const lowerName = nameStr.toLowerCase();
    
    if (lowerName.includes('จัดซื้อ') || lowerName.includes('ปตท')) return 'purchase';
    if (lowerName.includes('แท๊ง') || lowerName.includes('tank')) return 'tank';
    if (lowerName.includes('ถัง') && lowerName.includes('200')) return 'drum';
    // รถบรรทุกน้ำมัน: ทะเบียนรถ (XX-XXXX) หรือ กทม. หรือ สฝษ
    if (/\d{2}-\d{4}/.test(name) || lowerName.includes('กทม') || lowerName.includes('สฝษ')) return 'truck';
    
    return 'other';
}

// ฟังก์ชั่นโหลดข้อมูล Transaction Log จาก Google Sheets
async function loadTransactionLogsFromSheets(isBackground = true) {
    try {
        if (!isBackground) {
            showLoading('กำลังโหลดข้อมูลรายการ...');
            LoadingManager.updateProgress(40, 'เชื่อมต่อ Google Sheets (Transaction Logs)...');
        }
        
        console.log('กำลังโหลด Transaction Logs จาก Google Sheets...');
        
        const response = await fetchWithRetry(`${GOOGLE_SCRIPT_URL}?action=getTransactionLogs&sheetsId=${GOOGLE_SHEETS_ID}&gid=${TRANSACTION_LOG_SHEET_GID}`, 3, 1000);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.data && Array.isArray(result.data)) {
            console.log(`📥 ข้อมูลดิบจาก Google Sheets: ${result.data.length} แถว`);
            
            // Debug: ดูข้อมูลดิบแถวแรก
            if (result.data.length > 0) {
                console.log('🔍 ตัวอย่างข้อมูลดิบแถวแรก:');
                console.log(result.data[0]);
                console.log('🔍 Keys ที่มีในข้อมูล:');
                console.log(Object.keys(result.data[0]));
            }
            
            // แปลงข้อมูลจาก Google Sheets มาเป็น transactionLogs format
            const logsFromSheets = result.data.map((row, index) => {
                // ตรวจสอบว่า row มีข้อมูลหรือไม่ (skip header และแถวว่าง)
                if (!row.date && !row.time && !row.transaction_type) {
                    return null;
                }
                
                // แปลง transaction type จากภาษาไทยเป็น internal format
                let transactionType = 'unknown';
                if (row.transaction_type) {
                    if (row.transaction_type.includes('fuel-card') || row.transaction_type.includes('Fuel-card')) {
                        transactionType = 'fuel-card';
                    } else if (row.transaction_type.includes('ซื้อ') || row.transaction_type.includes('เติมเข้า') || row.transaction_type.includes('ซื้อ/เติมเข้า') || row.transaction_type.includes('ซื้อจาก ปตท.')) {
                        transactionType = 'refill';
                    } else if (row.transaction_type.includes('จ่าย') || row.transaction_type.includes('ออก')) {
                        transactionType = 'dispense';
                    }
                }
                
                // สร้าง unique ID ที่เสถียร (ไม่ใช้ Date.now())
                const uniqueId = row.id || `${row.date || 'no_date'}_${row.time || 'no_time'}_${row.transaction_type || 'no_type'}_${row.source_name || ''}_${row.volume || '0'}_${index}`;
                
                // ✅ ดึงลิตรจากคอลัมน์ volume_liters เป็นหลัก ถ้าไม่มี ให้ดึงจาก volume
                let litersValue = 0;
                if (row.volume_liters) {
                    litersValue = parseFloat(row.volume_liters);
                } else if (row.volume) {
                    // ถ้าเป็น string "5 ถัง (1000 ลิตร)" ให้ดึงตัวเลขที่อยู่ในวงเล็บ
                    const volumeStr = String(row.volume);
                    const match = volumeStr.match(/\((\d+(?:\.\d+)?)\s*ลิตร\)/);
                    if (match && match[1]) {
                        litersValue = parseFloat(match[1]);
                    } else {
                        litersValue = parseFloat(volumeStr);
                    }
                }
                
                return {
                    id: uniqueId,
                    uid: row.uid || row.transaction_uid || '', // ✅ เพิ่ม UID mapping
                    date: row.date || '',
                    time: row.time || '',
                    transactionType: transactionType,
                    sourceName: row.source_name || '',
                    destinationName: row.destination_name || '',
                    destinationType: row.destination_type || '',
                    liters: litersValue,
                    pricePerLiter: parseFloat(row.price_per_liter) || 0,
                    totalAmount: parseFloat(row.total_cost) || 0, // ใช้ row.total_cost แทน row.total_amount
                    operatorName: row.operator_name || '',
                    operatingUnit: row.unit || '', // ใช้ row.unit แทน row.operating_unit
                    timestamp: row.timestamp || Date.now()
                };
            }).filter(log => log !== null); // กรองเอาเฉพาะ log ที่มีข้อมูล
            
            console.log(`✅ แปลงข้อมูลสำเร็จ: ${logsFromSheets.length} รายการ`);
            if (!isBackground) {
                LoadingManager.updateProgress(60, 'กรองข้อมูลซ้ำ...');
            }
            
            // กำจัดข้อมูลซ้ำ ด้วย Map (เร็วกว่า Set + forEach) ⚡
            const seenLogSignatures = new Map();
            const uniqueLogsFromSheets = [];
            let duplicateCount = 0;
            
            logsFromSheets.forEach(log => {
                // สร้าง signature เพื่อระบุข้อมูลที่เหมือนกัน
                const signature = `${log.date}_${log.time}_${log.transactionType}_${log.sourceName}_${log.liters}_${log.pricePerLiter}`;
                
                if (!seenLogSignatures.has(signature)) {
                    seenLogSignatures.set(signature, true);
                    uniqueLogsFromSheets.push(log);
                } else {
                    duplicateCount++;
                }
            });
            
            const filteredCount = logsFromSheets.length - duplicateCount;
            console.log(`✨ หลังกรองข้อมูลซ้ำ: ${uniqueLogsFromSheets.length} รายการ (กรองออก ${duplicateCount} รายการซ้ำ)`);
            if (!isBackground) {
                LoadingManager.updateProgress(70, `โหลดข้อมูลรายการ ${uniqueLogsFromSheets.length} รายการ...`);
            }
            
            // ใช้เฉพาะข้อมูลจาก Google Sheets เท่านั้น (ไม่รวม localStorage)
            const oldTransactionLogsCount = transactionLogs ? transactionLogs.length : 0;
            transactionLogs = [...uniqueLogsFromSheets];
            
            console.log(`📊 สรุปข้อมูลสุดท้าย: ${uniqueLogsFromSheets.length} รายการจาก Google Sheets`);
            console.log(`📈 เปลี่ยนแปลง: จาก ${oldTransactionLogsCount} รายการ เป็น ${transactionLogs.length} รายการ`);
            
            // ✅ อัพเดท localStorage ด้วย UID ที่มากที่สุดจาก Google Sheets
            updateLastTransactionUIDFromSheets(uniqueLogsFromSheets);
            
            // เก็บเวลาล่าสุดจาก Google Sheets
            if (result.lastTimestamp) {
                window.lastTransactionTimestamp = result.lastTimestamp;
                console.log(`🕐 เวลาล่าสุดจาก Google Sheets: ${result.lastTimestamp}`);
            }
            
            // รีเฟรช Activity Logger เพื่อแสดงข้อมูลใหม่
            if (window.activityLogger) {
                console.log('🔄 รีเฟรช Activity Logger...');
                window.activityLogger.reloadLogs();
            }
            
            // 💾 บันทึกข้อมูลดิบลง sessionStorage เพื่อให้ transaction-summary.html สามารถใช้ได้
            try {
                const cacheData = {
                    success: true,
                    data: result.data,
                    timestamp: Date.now()
                };
                sessionStorage.setItem('transactionLogsCache', JSON.stringify(cacheData));
                console.log('💾 บันทึก Transaction Logs ลง sessionStorage สำเร็จ');
            } catch (cacheError) {
                console.warn('⚠️ ไม่สามารถบันทึก sessionStorage:', cacheError);
            }
            
            // ซ่อน loading overlay ถ้าไม่ใช่ background loading
            if (!isBackground) {
                LoadingManager.hide();
            }
        } else {
            throw new Error(result.error || 'ไม่สามารถโหลด Transaction Logs ได้');
        }
    } catch (error) {
        console.error('Error loading Transaction Logs from Google Sheets:', error);
        console.log('⚠️ ไม่สามารถโหลด Transaction Logs จาก Google Sheets ได้');
        
        // ไม่ใช้ข้อมูลจาก localStorage - ตั้งค่าเป็นอาร์เรย์ว่าง
        transactionLogs = [];
        if (!isBackground) {
            LoadingManager.updateProgress(70, 'ไม่พบข้อมูลรายการ (ใช้เฉพาะจาก Google Sheets เท่านั้น)');
            LoadingManager.hide();
        }
        console.log('ไม่มีข้อมูล Transaction Logs (ใช้เฉพาะข้อมูลจาก Google Sheets เท่านั้น)');
    }
}

async function saveInventoryToSheets() {
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE') {
        showLoading('กำลังบันทึกข้อมูลแบบ Local...');
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate loading
        saveData(); // fallback ไปใช้ localStorage
        return;
    }
    
    try {
        showLoading('กำลังบันทึกข้อมูลไปยัง Google Sheets...');
        
        // เตรียมข้อมูลสำหรับอัพเดต
        const updateData = {};
        fuelSources.forEach(source => {
            updateData[source.name] = source.currentStock;
        });
        
        // ใช้ GET request แทน POST เพื่อหลีกเลี่ยง CORS preflight
        const params = new URLSearchParams({
            action: 'updateInventory',
            data: JSON.stringify(updateData),
            sheetsId: GOOGLE_SHEETS_ID,
            gid: INVENTORY_SHEET_GID
        });
        
        const urlWithParams = `${GOOGLE_SCRIPT_URL}?${params.toString()}`;
        const response = await fetch(urlWithParams, {
            method: 'GET',
            mode: 'cors'
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('บันทึกข้อมูลไปยัง Google Sheets สำเร็จ');
        } else {
            throw new Error(result.error || 'ไม่สามารถบันทึกข้อมูลได้');
        }
        
        // บันทึกข้อมูล local ด้วย (สำหรับ backup)
        saveData();
        
    } catch (error) {
        console.error('Error saving to Google Sheets:', error);
        showLoading('กำลังบันทึกข้อมูลแบบ Local...');
        await new Promise(resolve => setTimeout(resolve, 300)); // Simulate loading
        saveData(); // fallback ไปใช้ localStorage
    }
}

async function logTransactionToSheets(logEntry) {
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE') {
        return; // ถ้าไม่มี URL ให้ข้าม
    }
    
    try {
        showLoading('กำลังบันทึก Transaction Log...');
        
        // เตรียมข้อมูลสำหรับ log
        let transactionType = '';
        let sourceName = '';
        let destinationName = '';
        
        if (logEntry.transactionType === 'refill') {
            transactionType = 'ซื้อจาก ปตท.';
            sourceName = String(logEntry.source || logEntry.sourceName || 'ปตท.');
            destinationName = String(logEntry.destination || logEntry.destinationName || '');
        } else if (logEntry.transactionType === 'fuel-card') {
            transactionType = 'Fuel-card จัดซื้อจาก ปตท.';
            sourceName = String(logEntry.source || logEntry.sourceName || 'ปตท. (Fuel-card)');
            destinationName = String(logEntry.destination || logEntry.destinationName || '');
        } else if (logEntry.transactionType === 'drain') {
            transactionType = 'เดรนน้ำมัน';
            sourceName = String(logEntry.source || logEntry.sourceName || '');
            destinationName = 'เดรนออก';
        } else {
            transactionType = 'จ่ายออก';
            sourceName = String(logEntry.source || logEntry.sourceName || '');
            destinationName = String(logEntry.destination || logEntry.destinationName || '');
        }
        
        // ดึงข้อมูลเครื่องบินจาก destination (รองรับทั้ง destination และ destinationName)
        let aircraftDestination = logEntry.destination || logEntry.destinationName || '';
        // ตรวจสอบว่าเป็น string จริงๆ
        if (typeof aircraftDestination !== 'string') {
            aircraftDestination = String(aircraftDestination || '');
        }
        const isAircraft = logEntry.destinationType === 'aircraft';
        
        // ตรวจสอบว่าเป็นถัง 200L หรือไม่
        const isDrum = logEntry.drums !== null && logEntry.drums !== undefined;
        
        // จัดรูปแบบ Volume: ถ้าเป็นถัง 200L แสดง "X ถัง (Y ลิตร)" ถ้าไม่ใช่แสดง "Y ลิตร"
        let volumeDisplay;
        if (isDrum) {
            volumeDisplay = `${logEntry.drums} ถัง (${logEntry.liters} ลิตร)`;
            console.log('📦 บันทึกถัง 200L:', volumeDisplay);
        } else {
            volumeDisplay = `${logEntry.liters} ลิตร`;
            console.log('📦 บันทึกลิตร:', volumeDisplay);
        }
        
        // ถ้า logEntry มี volume อยู่แล้ว ให้ใช้ค่านั้น (จาก handlePttPurchaseSubmit, handleRefillSubmit, handleDispenseSubmit)
        if (logEntry.volume) {
            volumeDisplay = logEntry.volume;
            console.log('📦 ใช้ volume ที่ส่งมา:', volumeDisplay);
        }
        
        const transactionData = {
            uid: logEntry.uid || '',
            timestamp: logEntry.timestamp,
            type: transactionType,
            source: sourceName,
            destination: destinationName,
            volume: volumeDisplay, // แสดง "5 ถัง (1000 ลิตร)" หรือ "1000 ลิตร"
            volumeLiters: logEntry.liters, // เก็บค่าลิตรไว้คำนวณ
            drums: logEntry.drums || null, // เก็บจำนวนถัง (null ถ้าไม่ใช่ถัง)
            pricePerLiter: logEntry.pricePerLiter || 0,
            pricePerDrum: logEntry.pricePerDrum || null, // ✅ เพิ่มราคาต่อถัง (null ถ้าไม่ใช่ถัง)
            totalCost: logEntry.totalAmount || 0,
            operatorName: logEntry.operatorName || '',
            unit: logEntry.operatingUnit || '',
            missions: logEntry.missions || '',
            aircraftType: isAircraft && aircraftDestination ? aircraftDestination.split(' : ')[0] || '' : '',
            aircraftNumber: isAircraft && aircraftDestination ? aircraftDestination.split(' : ')[1] || '' : '',
            notes: logEntry.notes || '',
            bookNo: logEntry.bookNo || '',
            receiptNo: logEntry.receiptNo || '',
            imageUrl: logEntry.imageUrl || '',
            imageFilename: logEntry.imageFilename || '',
            imageDriveId: logEntry.imageDriveId || '',
            imageUploadDate: logEntry.imageUploadDate || ''
        };
        
        // ใช้ GET request แทน POST เพื่อหลีกเลี่ยง CORS preflight
        const params = new URLSearchParams({
            action: 'logTransaction',
            data: JSON.stringify(transactionData),
            sheetsId: GOOGLE_SHEETS_ID
        });
        
        const urlWithParams = `${GOOGLE_SCRIPT_URL}?${params.toString()}`;
        console.log('🔗 Calling Google Apps Script URL:', urlWithParams.substring(0, 100) + '...');
        
        const response = await fetch(urlWithParams, {
            method: 'GET',
            mode: 'cors'
        });
        
        console.log('📡 Response status:', response.status);
        console.log('📡 Response type:', response.type);
        
        const responseText = await response.text();
        console.log('📡 Response text:', responseText);
        
        if (!responseText) {
            throw new Error('⚠️ Response is empty from Google Apps Script - ตรวจสอบว่า GOOGLE_SCRIPT_URL ถูกต้องหรือไม่ หรือ Deployment ยังไม่เสร็จ');
        }
        
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (parseError) {
            console.error('❌ Failed to parse JSON:', parseError);
            console.error('❌ Raw response:', responseText);
            throw new Error('Invalid JSON response from Google Apps Script: ' + responseText);
        }
        
        if (result.logs && Array.isArray(result.logs)) {
            console.log('%c📊 Google Apps Script Logs:', 'color: #4CAF50; font-weight: bold;');
            result.logs.forEach(log => {
                console.log('%c' + log, 'color: #2196F3;');
            });
        }
        
        if (result.success) {
            console.log('✅ บันทึก log ไปยัง Google Sheets สำเร็จ');
        } else {
            throw new Error(result.error || 'ไม่สามารถบันทึก log ได้');
        }
        
    } catch (error) {
        console.error('Error logging to Google Sheets:', error);
    }
}

// บันทึกข้อมูลลง localStorage (เก็บไว้เป็น fallback)
function saveData() {
    localStorage.setItem('fuelSources', JSON.stringify(fuelSources));
    // ไม่บันทึก transactionLogs ลง localStorage - ใช้เฉพาะข้อมูลจาก Google Sheets
}

// ฟังก์ชันเลือกไอคอนตาม type
function getIconForType(type) {
    const iconMap = {
        'purchase': 'img/ptt.png',
        'tank': 'img/tankfarm.png',
        'truck': 'img/truck.png',
        'drum': 'img/drum.png',
        'other': 'img/tankfarm.png'
    };
    
    return iconMap[type] || 'img/tankfarm.png';
}

// ฟังก์ชันเลือกสีตาม type สำหรับธีม iOS
function getColorForType(type) {
    const colorMap = {
        'purchase': '#007AFF', // iOS Blue
        'tank': '#34C759', // iOS Green  
        'truck': '#FF9500', // iOS Orange
        'drum': '#FF2D92', // iOS Pink
        'other': '#8E8E93' // iOS Gray
    };
    
    return colorMap[type] || '#8E8E93';
}

function requiresConfirmationForSource(source) {
    if (!source) {
        return false;
    }
    return source.type !== 'purchase';
}

function isSourceConfirmedToday(sourceId) {
    const today = getDateString(new Date());
    return localStorage.getItem(`confirmed_${sourceId}`) === today;
}

// สร้าง fuel cards แบบแบ่งหมวดหมู่
function createFuelCards() {
    const container = document.getElementById('fuelCards');
    container.innerHTML = '';
    
    // แบ่งหมวดหมู่
    const categories = {
        'purchase': { title: '<span class="material-symbols-outlined" style="vertical-align: middle; font-size: 1.2em;">shopping_cart</span> จัดซื้อจาก ปตท.', sources: [] },
        'tank': { title: '<span class="material-symbols-outlined" style="vertical-align: middle; font-size: 1.2em;">propane_tank</span> แท๊งค์น้ำมัน', sources: [] },
        'truck': { title: '<span class="material-symbols-outlined" style="vertical-align: middle; font-size: 1.2em;">local_shipping</span> รถบรรทุกน้ำมัน', sources: [] },
        'drum': { title: '<span class="material-symbols-outlined" style="vertical-align: middle; font-size: 1.2em;">water_bottle_large</span> ถัง 200 ลิตร', sources: [] }
    };
    
    // จัดกลุ่มแหล่งน้ำมันตามประเภท
    fuelSources.forEach(source => {
        if (categories[source.type]) {
            categories[source.type].sources.push(source);
        }
    });
    
    // สร้าง cards แยกตามหมวดหมู่
    Object.keys(categories).forEach(categoryKey => {
        const category = categories[categoryKey];
        
        if (category.sources.length === 0) return; // ข้ามหมวดที่ไม่มีข้อมูล
        
        // สร้าง category header
        const categoryHeader = document.createElement('div');
        categoryHeader.className = 'category-header';
        let headerHTML = `<h3>${category.title}</h3>`;
        
        // เพิ่มปุ่มพิเศษสำหรับหมวด "ถัง 200 ลิตร"
        if (categoryKey === 'drum') {
            headerHTML += `
                <div class="button-group ms-auto" style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-info btn-sm" onclick="openPTTPurchase200LModal()" title="ซื้อถัง 200L จาก ปตท." style="display: none;">
                        <i class="fas fa-shopping-cart me-1"></i> ซื้อถัง ปตท.
                    </button>
                    <button class="btn btn-success btn-sm" onclick="openReturnDrumModal()" title="คืนถังน้ำมัน">
                        <i class="fas fa-arrow-left me-1"></i> คืนถัง
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="openRemoveDrumNakhonsawanModal()" title="ลบถังน้ำมัน - สนามบินนครสวรรค์" style="display: none;">
                        <i class="fas fa-minus me-1"></i> ลบ นครสวรรค์
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="openRemoveDrumKhlongLuangModal()" title="ลบถังน้ำมัน - สนามบินคลองหลวง" style="display: none;">
                        <i class="fas fa-minus me-1"></i> ลบ คลองหลวง
                    </button>
                </div>
            `;
        }
        
        categoryHeader.innerHTML = headerHTML;
        container.appendChild(categoryHeader);
        
        // สร้าง category grid
        const categoryGrid = document.createElement('div');
        categoryGrid.className = 'category-grid';
        
        category.sources.forEach(source => {
            const card = document.createElement('div');
            card.className = 'fuel-card';
            if (source.status !== 'deactivate') {
                card.onclick = () => {
                    if (source.id === 'drum_nakhonsawan') {
                        openTransactionNakhonsawanModal();
                    } else if (source.id === 'drum_khlong_luang') {
                        openTransactionKhlongLuangModal();
                    } else if (source.id === 'purchase_drum_200l') {
                        openPTTPurchase200LModal();
                    } else {
                        openTransactionModal(source);
                    }
                };
            }
            
            const capacityText = source.capacity ? source.capacity.toLocaleString() : 'ไม่จำกัด';
            const stockPercentage = source.capacity ? (source.currentStock / source.capacity * 100) : 0;
            const iconSrc = getIconForType(source.type);
            const themeColor = getColorForType(source.type);
            
            // สำหรับ ปตท. แสดง "ซื้อไปแล้วทั้งหมด" แต่ใช้ค่าจาก currentStock
            let stockLabel, stockValue, capacityDisplay;
            
            if (source.type === 'purchase') {
                stockLabel = 'ซื้อไปแล้วทั้งหมด';
                stockValue = source.currentStock.toLocaleString();
                capacityDisplay = '';
            } else if (isDrumSource(source)) {
                // สำหรับถัง 200L แสดงเป็นถังและลิตร
                stockLabel = 'คงเหลือ';
                const drums = litersToDrums(source.currentStock);
                stockValue = `${drums.toLocaleString()} ถัง`;
                capacityDisplay = source.capacity ? source.capacity.toLocaleString() : '';
            } else {
                stockLabel = 'คงเหลือ';
                stockValue = source.currentStock.toLocaleString();
                capacityDisplay = source.capacity ? source.capacity.toLocaleString() : '';
            }
            
            // สร้าง progress tank HTML (แนวตั้ง)
            let progressTankHTML = '';
            if (source.capacity && source.type !== 'purchase') {
                const percentage = Math.min(stockPercentage, 100);
                const statusClass = percentage > 70 ? 'high' : percentage > 30 ? 'medium' : 'low';
                
                progressTankHTML = `
                    <div class="stock-progress">
                        <div class="progress-tank ${statusClass}">
                            <div class="progress-fill" style="height: ${percentage}%"></div>
                        </div>
                        <div class="progress-label">
                            <span class="percentage">${percentage.toFixed(1)}%</span>
                            <span class="status-text">${getStatusText(percentage)}</span>
                        </div>
                    </div>
                `;
            }
            
            // สร้าง HTML สำหรับแสดงคงเหลือ/ความจุ
            let stockDisplayHTML;
            if (source.id === 'purchase_drum_200l') {
                stockDisplayHTML = `<div class="stock-display" style="display: none;"></div>`;
            } else if (source.type === 'purchase') {
                stockDisplayHTML = `
                    <div class="stock-display">
                        <span class="stock-label">${stockLabel}</span>
                        <span class="stock-value">${stockValue} <span style="font-size: 0.6em;">ลิตร</span></span>
                    </div>
                `;
            } else {
                stockDisplayHTML = `
                    <div class="stock-display">
                        <span class="stock-label">${stockLabel}</span>
                        <span class="stock-value">${stockValue}</span>
                        ${capacityDisplay ? `<span class="stock-capacity"><span class="stock-separator">/</span>${capacityDisplay} <span style="font-size: 0.9em;">ลิตร</span></span>` : ''}
                    </div>
                `;
            }
            
            card.innerHTML = `
                <div class="card-content-wrapper">
                    <div class="card-header">
                        <div style="display: flex; align-items: center; gap: 0.75rem; flex: 1; min-width: 0;">
                            <div class="card-icon">
                                <img src="${iconSrc}" alt="${source.type}" />
                            </div>
                            <div class="card-title">
                                <h3>${source.name}</h3>
                                <span class="card-type">${getTypeDisplayName(source.type)}</span>
                            </div>
                        </div>
                        ${source.id !== 'purchase' && source.id !== 'purchase_drum_200l' ? `
                        <button class="btn-edit-fuel-small" onclick="event.stopPropagation(); openEditFuelModal('${source.id}', '${source.name}', ${source.currentStock})" title="แก้ไขยอด">
                            <i class="fas fa-edit"></i>
                        </button>
                        ` : ''}
                    </div>
                    <div class="fuel-info-section">
                        <div class="fuel-info">
                            ${stockDisplayHTML}
                        </div>
                        ${progressTankHTML}
                    </div>
                    ${source.id !== 'purchase' && source.id !== 'purchase_drum_200l' ? `
                    <div class="card-footer-section" id="footer-${source.id}">
                        <button class="btn-confirm-daily" onclick="event.stopPropagation(); openDailyConfirmationModal('${source.id}', '${source.name}')" id="btn-${source.id}">
                            <i class="fas fa-check-circle"></i> ยืนยันยอด
                        </button>
                    </div>
                    ` : ''}
                </div>
            `;
            
            // ใส่สี accent สำหรับ card border
            card.style.setProperty('--accent-color', themeColor);
            
            // ถ้า deactivate ให้ทำให้เป็นสีเท่า (grayscale)
            if (source.status === 'deactivate') {
                card.classList.add('deactivate-card');
                card.style.filter = 'grayscale(100%) opacity(0.6)';
                card.style.pointerEvents = 'none';
                
                // สร้าง overlay overlay text
                const overlay = document.createElement('div');
                overlay.className = 'deactivate-overlay';
                overlay.innerHTML = '<div class="deactivate-text">ไม่พร้อมใช้งาน</div>';
                card.appendChild(overlay);
            }
            // ถ้ายังไม่ยืนยันยอด (และไม่ใช่ purchase) ให้เปลี่ยนพื้นหลังเป็นสีแดง
            else if (source.id !== 'purchase' && !isSourceConfirmedToday(source.id)) {
                card.style.backgroundColor = '#ffebee'; // สีแดงอ่อน
                card.style.borderColor = '#ef5350'; // สีแดงเข้ม
                card.style.border = '2px solid #ef5350';
            }
            
            categoryGrid.appendChild(card);
        });
        
        container.appendChild(categoryGrid);
    });
}

// ฟังก์ชันเปิด Modal สำหรับยืนยันยอด
function openDailyConfirmationModal(sourceId, sourceName) {
    try {
        let modal = document.getElementById('dailyConfirmationModal');
        
        if (!modal) {
            console.error('❌ dailyConfirmationModal not found in HTML');
            throw new Error('Modal container not found');
        }
        
        // Store current data globally
        window.currentDailyConfirmation = {
            sourceId: sourceId,
            sourceName: sourceName
        };
        
        // Update modal content - using correct element IDs from HTML
        const sourceNameElement = document.getElementById('confirmationSourceName');
        const operatorInput = document.getElementById('confirmationOperatorName');
        
        if (!sourceNameElement || !operatorInput) {
            console.error('❌ Modal elements not found. sourceNameElement:', sourceNameElement, 'operatorInput:', operatorInput);
            throw new Error('Modal elements not properly created');
        }
        
        sourceNameElement.textContent = sourceName;
        operatorInput.value = '';
        operatorInput.focus();
        
        // Show modal
        modal.style.display = 'block';
    } catch (error) {
        console.error('❌ Error in openDailyConfirmationModal:', error);
        alert('เกิดข้อผิดพลาดในการเปิด Modal กรุณารีเฟรชหน้าจอ');
    }
}

// ฟังก์ชันปิด Modal
function closeDailyConfirmationModal() {
    const modal = document.getElementById('dailyConfirmationModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// ฟังก์ชันส่งข้อมูลยืนยันยอด
async function submitDailyConfirmation() {
    const operatorName = document.getElementById('confirmationOperatorName').value.trim();
    
    if (!operatorName) {
        alert('กรุณากรอกชื่อผู้ทำรายการ');
        return;
    }
    
    try {
        // แสดง loading indicator
        showLoading('กำลังยืนยันยอด...');
        setButtonLoading('submitDailyConfirmationBtn', true);
        
        // Get current fuel amount
        const sourceId = window.currentDailyConfirmation.sourceId;
        const fuelSource = fuelSources.find(source => source.id === sourceId);
        const currentStock = fuelSource ? fuelSource.currentStock : 0;
        
        // Prepare data
        const confirmData = {
            sourceId: sourceId,
            sourceName: window.currentDailyConfirmation.sourceName,
            currentStock: currentStock, // บันทึกจำนวนลิตรปัจจุบัน
            operatorName: operatorName,
            confirmDate: new Date().toLocaleString('th-TH'),
            timestamp: new Date().toISOString()
        };
        
        // Send to Google Apps Script
        const url = `${GOOGLE_SCRIPT_URL}?action=logDailyConfirmation&sheetsId=${GOOGLE_SHEETS_ID}&gid=1512968674&data=${encodeURIComponent(JSON.stringify(confirmData))}`;
        
        console.log('📤 Sending daily confirmation:', confirmData);
        
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success) {
            // Save confirmation status
            const today = getDateString(new Date());
            localStorage.setItem(`confirmed_${window.currentDailyConfirmation.sourceId}`, today);
            
            console.log('✅ Daily confirmation saved');
            
            // Close modal
            closeDailyConfirmationModal();
            
            // Refresh cards to update colors and hide button
            createFuelCards();
            updateDailyConfirmationButtons();
            
            // Hide loading indicator
            hideLoading();
            
            // Show success message
            alert('✅ ยืนยันยอดสำเร็จ!');
        } else {
            console.error('❌ Error:', result.error);
            hideLoading();
            alert('เกิดข้อผิดพลาด: ' + result.error);
        }
    } catch (error) {
        console.error('❌ Error sending data:', error);
        hideLoading();
        alert('เกิดข้อผิดพลาดในการส่งข้อมูล');
    } finally {
        setButtonLoading('submitDailyConfirmationBtn', false);
    }
}

// ฟังก์ชันอัพเดทการแสดง/ซ่อนปุ่มยืนยันยอด
function updateDailyConfirmationButtons() {
    const confirmButtons = document.querySelectorAll('.btn-confirm-daily');
    const today = getDateString(new Date());
    
    confirmButtons.forEach(btn => {
        // Extract sourceId from button ID (format: btn-${source.id})
        const sourceId = btn.id.replace('btn-', '') || btn.getAttribute('data-source-id');
        
        if (!sourceId) {
            console.warn('⚠️ Cannot find sourceId for button:', btn);
            return;
        }
        
        const lastConfirmedDate = localStorage.getItem(`confirmed_${sourceId}`);
        
        // Show button only if not confirmed today
        if (lastConfirmedDate !== today) {
            btn.style.display = 'block';
        } else {
            btn.style.display = 'none';
        }
    });
    console.log('✅ ปุ่มยืนยันยอดอัพเดตแล้ว');
}

function openEditFuelModal(sourceId, sourceName, currentStock) {
    try {
        const modal = document.getElementById('editFuelModal');
        if (!modal) {
            console.error('❌ editFuelModal not found in HTML');
            return;
        }
        
        window.currentEditFuel = {
            sourceId: sourceId,
            sourceName: sourceName,
            currentStock: currentStock
        };
        
        document.getElementById('editFuelSourceName').textContent = sourceName;
        document.getElementById('editFuelRemaining').value = currentStock;
        
        modal.style.display = 'block';
    } catch (error) {
        console.error('Error in openEditFuelModal:', error);
        alert('เกิดข้อผิดพลาดในการเปิด Modal');
    }
}

function closeEditFuelModal() {
    const modal = document.getElementById('editFuelModal');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('editFuelRemaining').value = '';
        document.getElementById('editFuelAdminCode').value = '';
    }
}

async function submitEditFuel() {
    const remaining = document.getElementById('editFuelRemaining').value.trim();
    const adminCode = document.getElementById('editFuelAdminCode').value.trim();
    
    if (!remaining || isNaN(remaining) || parseFloat(remaining) < 0) {
        alert('กรุณากรอกจำนวนลิตรใหม่ที่ถูกต้อง');
        return;
    }
    
    if (!adminCode) {
        alert('กรุณากรอกรหัสของแอดมิน');
        return;
    }
    
    try {
        showLoading('กำลังอัพเดตข้อมูล...');
        setButtonLoading('submitEditFuelBtn', true);
        
        const sourceId = window.currentEditFuel.sourceId;
        const sourceName = window.currentEditFuel.sourceName;
        const remainingValue = parseFloat(remaining);
        
        const url = `${GOOGLE_SCRIPT_URL}?action=updateFuelStock&sheetsId=${GOOGLE_SHEETS_ID}&gid=${SHEET_GIDS.INVENTORY}&fuelName=${encodeURIComponent(sourceName)}&newStock=${remainingValue}&adminCode=${encodeURIComponent(adminCode)}`;
        
        console.log('📤 Updating fuel stock:', { fuelName: sourceName, newStock: remainingValue, adminCode: adminCode });
        
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Fuel data updated successfully');
            
            const fuelSource = fuelSources.find(source => source.id === sourceId);
            if (fuelSource) {
                fuelSource.currentStock = remainingValue;
            }
            
            closeEditFuelModal();
            createFuelCards();
            updateDailyConfirmationButtons();
            hideLoading();
            alert('✅ อัพเดตข้อมูลสำเร็จ!');
        } else {
            console.error('❌ Error:', result.error);
            hideLoading();
            alert('เกิดข้อผิดพลาด: ' + result.error);
        }
    } catch (error) {
        console.error('Error in submitEditFuel:', error);
        hideLoading();
        alert('เกิดข้อผิดพลาดในการส่งข้อมูล');
    } finally {
        setButtonLoading('submitEditFuelBtn', false);
    }
}

// ฟังก์ชันแปลงวันที่เป็น string (YYYY-MM-DD)
function getDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getThailandISO8601(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+07:00`;
}

// ฟังก์ชันตรวจสอบการเปลี่ยนแปลงเวลาเที่ยงคืน
function checkMidnightTransition() {
    const currentDate = getDateString(new Date());
    const storedDate = localStorage.getItem('lastCheckedDate');
    
    // If date changed, reset buttons
    if (storedDate && storedDate !== currentDate) {
        console.log(`🌙 Midnight transition detected: ${storedDate} → ${currentDate}`);
        updateDailyConfirmationButtons();
    }
    
    // Update stored date
    localStorage.setItem('lastCheckedDate', currentDate);
}

// ฟังก์ชันเริ่มต้นระบบ
async function initializeSystem() {
    try {
        showLoading('กำลังเริ่มต้นระบบ...');
        LoadingManager.updateProgress(5, 'ตั้งค่าระบบ...');
        
        // เริ่มต้น event listeners ก่อน
        initializeEventListeners();
        LoadingManager.updateProgress(8, 'โหลดข้อมูลจาก Google Sheets...');
        
        // โหลดข้อมูล Inventory เพื่อแสดงหน้าจอหลัก
        await loadInventoryFromSheets();
        LoadingManager.updateProgress(70, 'โหลดข้อมูลแหล่งน้ำมัน สำเร็จ...');
        
        // ซ่อนหน้าโหลดทันที ให้หน้า index ใช้งานได้
        hideLoading();
        
        // สร้างหน้าจอหลัก (ทำงานหลังซ่อนหน้าโหลด)
        createFuelCards();
        updateSummary();
        
        // เริ่มต้นฟีเจอร์ Daily Confirmation
        updateDailyConfirmationButtons();
        setInterval(checkMidnightTransition, 60000); // ตรวจสอบเที่ยงคืนทุก 60 วินาที
        
        console.log('✅ ระบบเริ่มต้นสำเร็จ');
        
        // โหลด Transaction Logs ในพื้นหลัง (ไม่บล็อกหน้าจอหลัก)
        loadTransactionLogsFromSheets(true)
            .then(() => console.log('✅ Transaction Logs โหลดสำเร็จ'))
            .catch(error => console.warn('⚠️ การโหลด Transaction Logs ล้มเหลว:', error));
            
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการเริ่มต้นระบบ:', error);
        hideLoading();
        alert('เกิดข้อผิดพลาดในการเริ่มต้นระบบ กรุณารีเฟรชหน้าจอ');
    }
}

// ฟังก์ชันแสดงสถานะตาม %
function getStatusText(percentage) {
    if (percentage > 70) return 'เต็ม';
    if (percentage > 30) return 'ปานกลาง';
    return 'ต่ำ';
}

// ฟังก์ชันแสดงชื่อประเภทภาษาไทย
function getTypeDisplayName(type) {
    const nameMap = {
        'purchase': 'จัดซื้อ',
        'tank': 'แท๊งค์',
        'truck': 'รถบรรทุก',
        'drum': 'ถัง 200L',
        'other': 'อื่นๆ'
    };
    
    return nameMap[type] || 'อื่นๆ';
}

// อัพเดทสรุปภาพรวม (ใช้ logic แบบใหม่ + Cache)
async function updateSummary() {
    console.log('🔄 เริ่มอัพเดทสรุปภาพรวม...');
    
    // โหลดข้อมูลจาก cache ก่อน (ถ้ามี) เพื่อแสดงทันที
    const cachedData = loadSummaryFromCache();
    const isFirstLoad = !cachedData;
    
    if (cachedData) {
        console.log('📦 แสดงข้อมูลจาก cache ก่อน');
        updateSummaryUI(cachedData);
    }
    
    // แสดง loading state (แบบ subtle ถ้ามี cache, แบบเต็มถ้าไม่มี)
    showSummaryLoading(true, isFirstLoad);
    
    try {
        // ขั้นตอนที่ 1: รวบรวมข้อมูลจากหลายแหล่ง
        const summaryData = await calculateComprehensiveSummary();

        // เก็บข้อมูลสรุปล่าสุดสำหรับใช้ในฟังก์ชันอื่น
        latestSummaryData = summaryData;
        
        // บันทึกลง cache
        saveSummaryToCache(summaryData);

        // ขั้นตอนที่ 2: อัพเดท UI พร้อมการแสดงสถานะ
        updateSummaryUI(summaryData);

        // ขั้นตอนที่ 3: แสดงรายละเอียดใน console สำหรับการตรวจสอบ
        displaySummaryDetails(summaryData);
        
    } catch (error) {
        console.error('❌ Error updating summary:', error);
        console.error('Stack trace:', error.stack);
        // ถ้ามี cache ให้ใช้ต่อ ไม่แสดง error
        if (!cachedData) {
            displayErrorState();
        }
    } finally {
        // ซ่อน loading state
        showSummaryLoading(false);
    }
}

// ฟังก์ชันคำนวณสรุปแบบครอบคลุม
async function calculateComprehensiveSummary() {
    console.log('📊 กำลังคำนวณสรุปข้อมูลแบบครอบคลุม...');
    
    // เก็บข้อมูลจากหลายแหล่ง
    const dataSources = {
        sheets: null,
        transactions: null,
        inventory: null
    };
    
    // พยายามอ่านจาก Google Sheets
    try {
        dataSources.sheets = await getSummaryFromSheets();
        console.log('✅ ข้อมูลจาก Google Sheets:', dataSources.sheets);
    } catch (error) {
        console.warn('⚠️ ไม่สามารถอ่านจาก Google Sheets:', error.message);
    }
    
    // คำนวณจาก Transaction Logs
    dataSources.transactions = calculateFromTransactions();
    console.log('✅ ข้อมูลจาก Transactions:', dataSources.transactions);
    
    // คำนวณจาก Inventory Sources
    dataSources.inventory = calculateFromInventory();
    console.log('✅ ข้อมูลจาก Inventory:', dataSources.inventory);
    
    // รวมและเลือกข้อมูลที่เชื่อถือได้ที่สุด
    return selectBestData(dataSources);
}

// คำนวณจาก Transaction Logs
function calculateFromTransactions() {
    // กรองรายการซื้อจาก ปตท.
    const pttTransactions = transactionLogs.filter(log => 
        (log.transactionType === 'refill' || log.transactionType === 'fuel-card') &&
        (log.sourceName === 'จัดซื้อจาก ปตท.' || log.sourceName?.includes('ปตท'))
    );
    
    console.log(`📝 พบรายการซื้อจาก ปตท. ${pttTransactions.length} รายการ`);
    
    // คำนวณยอดเงิน
    const totalAmount = pttTransactions.reduce((sum, log) => {
        const amount = log.totalAmount || (log.liters * log.pricePerLiter) || 0;
        return sum + amount;
    }, 0);
    
    // คำนวณจำนวนลิตร
    const totalVolume = pttTransactions.reduce((sum, log) => {
        return sum + (log.liters || 0);
    }, 0);
    
    return {
        totalPurchaseAmount: totalAmount,
        totalPurchaseVolume: totalVolume,
        transactionCount: pttTransactions.length,
        averagePrice: totalVolume > 0 ? totalAmount / totalVolume : 0
    };
}

// คำนวณ Total Capacity ของระบบ
function calculateTotalCapacity() {
    return fuelSources.reduce((sum, source) => {
        // รวมเฉพาะแหล่งที่มี capacity ไม่เป็น null (แหล่งที่มีความจุจำกัด)
        // และข้ามแหล่งที่ถูก deactivate
        if (source.capacity !== null && source.status !== 'deactivate') {
            return sum + source.capacity;
        }
        return sum;
    }, 0);
}

// คำนวณจาก Inventory Sources
function calculateFromInventory() {
    // คำนวณความจุคงเหลือ (รวมเฉพาะแหล่งที่มีความจุจำกัด - rows 3-14 และไม่ใช่ deactivate)
    const totalStock = fuelSources.reduce((sum, source) => {
        // รวมเฉพาะแหล่งที่มี capacity ไม่เป็น null (แหล่งที่มีความจุจำกัด)
        // และข้ามแหล่งที่ถูก deactivate
        if (source.capacity !== null && source.status !== 'deactivate') {
            return sum + (source.currentStock || 0);
        }
        return sum;
    }, 0);
    
    // คำนวณ total capacity
    const totalCapacity = calculateTotalCapacity();
    
    // หา PTT Purchase Source (ข้ามแหล่ง deactivate)
    const pttSource = fuelSources.find(source => 
        (source.id === 'purchase' || source.name?.includes('ปตท')) &&
        source.status !== 'deactivate'
    );
    
    // นับจำนวนแหล่งที่ active (ไม่ใช่ deactivate)
    const activeSources = fuelSources.filter(source => source.status !== 'deactivate').length;
    
    return {
        totalCurrentStock: totalStock,
        totalCapacity: totalCapacity,
        capacityPercentage: totalCapacity > 0 ? (totalStock / totalCapacity * 100) : 0,
        pttSourceStock: pttSource?.currentStock || 0,
        totalSources: activeSources
    };
}

// เลือกข้อมูลที่เชื่อถือได้ที่สุด
function selectBestData(dataSources) {
    const result = {
        totalPurchaseAmount: 0,
        totalPurchaseVolume: 0,
        totalCurrentStock: 0,
        totalCapacity: 0,
        capacityPercentage: 0,
        dataQuality: 'unknown',
        sources: []
    };
    
    // สำหรับ Purchase Amount: ลำดับความน่าเชื่อถือ Sheets > Transactions
    if (dataSources.sheets?.totalPurchaseAmount > 0) {
        result.totalPurchaseAmount = dataSources.sheets.totalPurchaseAmount;
        result.sources.push('sheets-amount');
    } else if (dataSources.transactions?.totalPurchaseAmount > 0) {
        result.totalPurchaseAmount = dataSources.transactions.totalPurchaseAmount;
        result.sources.push('transactions-amount');
    }
    
    // สำหรับ Purchase Volume: ลำดับความน่าเชื่อถือ Sheets > Transactions
    if (dataSources.sheets?.totalPurchaseVolume > 0) {
        result.totalPurchaseVolume = dataSources.sheets.totalPurchaseVolume;
        result.sources.push('sheets-volume');
    } else if (dataSources.transactions?.totalPurchaseVolume > 0) {
        result.totalPurchaseVolume = dataSources.transactions.totalPurchaseVolume;
        result.sources.push('transactions-volume');
    }
    
    // สำหรับ Current Stock & Capacity: ลำดับความน่าเชื่อถือ Sheets > Inventory
    if (dataSources.sheets?.totalCurrentStock >= 0) {
        result.totalCurrentStock = dataSources.sheets.totalCurrentStock;
        result.sources.push('sheets-stock');
    } else if (dataSources.inventory?.totalCurrentStock >= 0) {
        result.totalCurrentStock = dataSources.inventory.totalCurrentStock;
        result.totalCapacity = dataSources.inventory.totalCapacity || 0;
        result.capacityPercentage = dataSources.inventory.capacityPercentage || 0;
        result.sources.push('inventory-stock');
    }
    
    // กำหนด Data Quality
    if (result.sources.some(s => s.startsWith('sheets'))) {
        result.dataQuality = dataSources.sheets ? 'high' : 'medium';
    } else {
        result.dataQuality = 'medium';
    }
    
    // เก็บข้อมูลดิบสำหรับการตรวจสอบ
    result.rawData = dataSources;
    
    return result;
}

// อัพเดท UI
function updateSummaryUI(summaryData) {
    // อัพเดทตัวเลข
    document.getElementById('totalPurchaseAmount').textContent = 
        (summaryData.totalPurchaseAmount || 0).toLocaleString();
    
    // อัพเดท Total Fuel Info และ Liquid Fill Gauge visualization
    const totalFuelInfoElement = document.getElementById('totalFuelInfo');
    const liquidWave = document.getElementById('liquidWave');
    const liquidPercentage = document.getElementById('liquidPercentage');
    const fuelGaugePercentage = document.getElementById('fuelGaugePercentage');
    const fuelProgressFill = document.getElementById('fuelProgressFill');
    
    const totalCapacity = summaryData.totalCapacity || 0;
    const currentStock = summaryData.totalCurrentStock || 0;
    const capacityPercentage = summaryData.capacityPercentage || 0;
    
    if (totalCapacity > 0) {
        // อัพเดทรูปแบบ: currentStock/totalCapacity ลิตร
        if (totalFuelInfoElement) {
            totalFuelInfoElement.textContent = `${currentStock.toLocaleString()}/${totalCapacity.toLocaleString()} ลิตร`;
        }
        
        // อัพเดท Liquid Fill Gauge visualization
        if (liquidWave) {
            // คำนวณความสูงของน้ำจาก 0-200 (เมื่อ 0% ที่ y=200, 100% ที่ y=0)
            const fillHeight = 200 - (capacityPercentage / 100) * 200;
            // สร้าง wave path ที่ตามระดับน้ำ
            liquidWave.setAttribute('d', 
                `M0,${fillHeight} Q50,${fillHeight - 10} 100,${fillHeight} T200,${fillHeight} L200,200 L0,200 Z`
            );
        }
        if (liquidPercentage) {
            liquidPercentage.textContent = `${capacityPercentage.toFixed(0)}%`;
        }
        if (fuelGaugePercentage) {
            fuelGaugePercentage.textContent = `${capacityPercentage.toFixed(0)}%`;
        }
        
        // อัพเดท Progress Bar
        if (fuelProgressFill) {
            fuelProgressFill.style.width = `${capacityPercentage}%`;
            // อัพเดท progress bar color based on status
            fuelProgressFill.classList.remove('low', 'medium');
            if (capacityPercentage < 30) {
                fuelProgressFill.classList.add('low');
            } else if (capacityPercentage < 70) {
                fuelProgressFill.classList.add('medium');
            }
        }
    } else {
        if (totalFuelInfoElement) {
            totalFuelInfoElement.textContent = `${currentStock.toLocaleString()}/0 ลิตร`;
        }
        if (liquidWave) {
            liquidWave.setAttribute('d', 'M0,200 Q50,190 100,200 T200,200 L200,200 L0,200 Z');
        }
        if (liquidPercentage) {
            liquidPercentage.textContent = '0%';
        }
        if (fuelGaugePercentage) {
            fuelGaugePercentage.textContent = '0%';
        }
        if (fuelProgressFill) {
            fuelProgressFill.style.width = '0%';
        }
    }
    
    // เพิ่ม indicator สำหรับ data quality
    updateDataQualityIndicators(summaryData);
    
    // อัพเดตการแสดงงบประมาณ
    if (typeof updateBudgetDisplay === 'function') {
        updateBudgetDisplay();
    }
}

/**
 * ฟังก์ชันสำหรับอัพเดตการแสดงผลงบประมาณ
 * โหลดข้อมูลจาก Google Sheets และคำนวณเงินคงเหลือ
 */
async function updateBudgetDisplay() {
    try {
        // เรียก API เพื่อดึงข้อมูลงบประมาณ
        const response = await fetch(
            `${GOOGLE_SCRIPT_URL}?action=getBudgetData&sheetsId=${GOOGLE_SHEETS_ID}&gid=${SHEET_GIDS.BUDGET}`
        );
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.data) {
            const { totalBudget, totalPurchaseAmount, remainingBudget } = result.data;
            
            // อัพเดตการแสดงผล
            const remainingBudgetEl = document.getElementById('remainingBudget');
            const budgetDetailsEl = document.getElementById('budgetDetails');
            const totalBudgetEl = document.getElementById('totalBudgetAmount');
            
            if (remainingBudgetEl) {
                remainingBudgetEl.textContent = remainingBudget.toLocaleString('th-TH', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                });
                
                // เปลี่ยนสีตามสถานะ
                if (remainingBudget < 0) {
                    remainingBudgetEl.classList.add('text-danger');
                    remainingBudgetEl.classList.remove('text-success');
                } else if (remainingBudget < totalBudget * 0.2) {
                    remainingBudgetEl.classList.add('text-warning');
                    remainingBudgetEl.classList.remove('text-danger', 'text-success');
                } else {
                    remainingBudgetEl.classList.add('text-success');
                    remainingBudgetEl.classList.remove('text-danger', 'text-warning');
                }
            }
            
            if (budgetDetailsEl) {
                budgetDetailsEl.textContent = 
                    `งบรวม: ${totalBudget.toLocaleString('th-TH')} บาท | ใช้ไป: ${totalPurchaseAmount.toLocaleString('th-TH')} บาท`;
            }
            
            if (totalBudgetEl) {
                totalBudgetEl.textContent = totalBudget.toLocaleString('th-TH', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                });
            }
            
            console.log('✅ อัพเดตงบประมาณสำเร็จ:', {
                totalBudget,
                totalPurchaseAmount,
                remainingBudget
            });
        } else {
            console.warn('⚠️ ไม่สามารถดึงข้อมูลงบประมาณ:', result.error);
        }
    } catch (error) {
        console.error('❌ Error updating budget display:', error);
    }
}

// อัพเดท Data Quality Indicators
function updateDataQualityIndicators(summaryData) {
    const cards = document.querySelectorAll('.summary-card');
    
    cards.forEach(card => {
        // ลบ class เดิมทั้งหมด
        card.classList.remove('data-high', 'data-medium', 'data-low');
        
        // เพิ่ม class ใหม่ตาม data quality
        card.classList.add(`data-${summaryData.dataQuality}`);
        
        // เพิ่มหรืออัพเดท tooltip
        let tooltip = card.querySelector('.data-source-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.className = 'data-source-tooltip';
            card.appendChild(tooltip);
        }
        
        tooltip.textContent = `แหล่งข้อมูล: ${summaryData.sources.join(', ')}`;
    });
}

// แสดงรายละเอียดใน Console
function displaySummaryDetails(summaryData) {
    console.log(`📋 สรุปข้อมูลระบบจัดการน้ำมัน:
    
💰 ยอดเงินที่ซื้อจาก ปตท.: ${summaryData.totalPurchaseAmount.toLocaleString()} บาท
⛽ จำนวนลิตรที่ซื้อ: ${summaryData.totalPurchaseVolume.toLocaleString()} ลิตร
📦 ความจุคงเหลือ: ${summaryData.totalCurrentStock.toLocaleString()} ลิตร

📊 ข้อมูลเพิ่มเติม:
- ราคาเฉลี่ย: ${summaryData.totalPurchaseVolume > 0 ? 
    (summaryData.totalPurchaseAmount / summaryData.totalPurchaseVolume).toFixed(2) : 'N/A'} บาท/ลิตร
- คุณภาพข้อมูล: ${summaryData.dataQuality}
- แหล่งข้อมูล: ${summaryData.sources.join(', ')}

🔍 ข้อมูลดิบ:`, summaryData.rawData);
}

// แสดง Error State
function displayErrorState() {
    document.getElementById('totalPurchaseAmount').textContent = 'ข้อผิดพลาด';
    document.getElementById('totalCurrentStock').textContent = 'ข้อผิดพลาด';
    
    const cards = document.querySelectorAll('.summary-card');
    cards.forEach(card => {
        card.classList.add('data-error');
    });
}



// ฟังก์ชันตรวจสอบและแก้ไขความไม่สอดคล้องของข้อมูล
function validateAndFixTransactionData() {
    console.log('🔍 กำลังตรวจสอบความถูกต้องของข้อมูลการซื้อน้ำมัน...');
    
    // แสดงสถิติข้อมูลทั้งหมดก่อน
    console.log(`📊 สถิติข้อมูลปัจจุบัน:
        - ข้อมูลธุรกรรมทั้งหมด: ${transactionLogs.length} รายการ
        - ข้อมูลการซื้อ/เติม (refill): ${transactionLogs.filter(log => log.transactionType === 'refill').length} รายการ
        - ข้อมูล fuel-card: ${transactionLogs.filter(log => log.transactionType === 'fuel-card').length} รายการ
        - ข้อมูลการจ่าย (dispense): ${transactionLogs.filter(log => log.transactionType === 'dispense').length} รายการ
        - ข้อมูลอื่นๆ: ${transactionLogs.filter(log => !['refill', 'fuel-card', 'dispense'].includes(log.transactionType)).length} รายการ`);
    
    const pttTransactions = transactionLogs.filter(log => 
        log.transactionType === 'refill' || log.transactionType === 'fuel-card'
    );
    
    // ตรวจสอบข้อมูลซ้ำ
    const transactionSignatures = {};
    const duplicateTransactions = [];
    
    pttTransactions.forEach((log, index) => {
        const signature = `${log.date}_${log.time}_${log.transactionType}_${log.sourceName}_${log.liters}_${log.pricePerLiter}`;
        
        if (transactionSignatures[signature]) {
            duplicateTransactions.push({
                index: index,
                signature: signature,
                transaction: log,
                originalIndex: transactionSignatures[signature].index
            });
        } else {
            transactionSignatures[signature] = { index, transaction: log };
        }
    });
    
    if (duplicateTransactions.length > 0) {
        console.warn(`🚨 พบข้อมูลซ้ำ ${duplicateTransactions.length} รายการ:`);
        duplicateTransactions.forEach(item => {
            console.log(`- ข้อมูลซ้ำ: ${item.signature}`);
        });
    }
    
    let fixedCount = 0;
    const inconsistentTransactions = [];
    
    pttTransactions.forEach((log, index) => {
        const expectedTotalAmount = log.liters * log.pricePerLiter;
        const actualTotalAmount = log.totalAmount || 0;
        const difference = Math.abs(expectedTotalAmount - actualTotalAmount);
        
        // หากผลต่างมากกว่า 0.01 บาท แสดงว่าไม่สอดคล้อง
        if (difference > 0.01) {
            inconsistentTransactions.push({
                index: index,
                transaction: log,
                expected: expectedTotalAmount,
                actual: actualTotalAmount,
                difference: difference
            });
            
            // แก้ไขข้อมูลโดยคำนวณ totalAmount ใหม่
            if (log.liters && log.pricePerLiter) {
                log.totalAmount = expectedTotalAmount;
                fixedCount++;
            }
        }
    });
    
    if (inconsistentTransactions.length > 0) {
        console.warn(`⚠️ พบข้อมูลไม่สอดคล้อง ${inconsistentTransactions.length} รายการ:`);
        inconsistentTransactions.forEach(item => {
            console.log(`- รายการที่ ${item.index + 1}: คาดหวัง ${item.expected.toFixed(2)} บาท, ได้ ${item.actual.toFixed(2)} บาท (ผลต่าง: ${item.difference.toFixed(2)} บาท)`);
        });
        
        if (fixedCount > 0) {
            console.log(`✅ แก้ไขข้อมูลแล้ว ${fixedCount} รายการ`);
            // ไม่บันทึกลง localStorage - ข้อมูลจะถูกบันทึกไปยัง Google Sheets เท่านั้น
            // อัปเดตการแสดงผล
            updateSummaryFromLocal();
        }
    } else {
        console.log('✅ ข้อมูลทั้งหมดสอดคล้องกัน');
    }
    
    return {
        totalTransactions: pttTransactions.length,
        inconsistentCount: inconsistentTransactions.length,
        fixedCount: fixedCount,
        inconsistentTransactions: inconsistentTransactions,
        duplicateCount: duplicateTransactions.length
    };
}

// ฟังก์ชันลบข้อมูลซ้ำ
function removeDuplicateTransactions() {
    console.log('🧹 กำลังลบข้อมูลซ้ำ...');
    
    const originalCount = transactionLogs.length;
    const seenSignatures = new Set();
    const uniqueTransactions = [];
    
    transactionLogs.forEach(log => {
        const signature = `${log.date}_${log.time}_${log.transactionType}_${log.sourceName}_${log.liters}_${log.pricePerLiter}_${log.totalAmount}`;
        
        if (!seenSignatures.has(signature)) {
            seenSignatures.add(signature);
            uniqueTransactions.push(log);
        }
    });
    
    const removedCount = originalCount - uniqueTransactions.length;
    
    if (removedCount > 0) {
        transactionLogs = uniqueTransactions;
        
        // ไม่บันทึกลง localStorage - ข้อมูลจะถูกบันทึกไปยัง Google Sheets เท่านั้น
        
        console.log(`🧹 ลบข้อมูลซ้ำเสร็จสิ้น: ลบออก ${removedCount} รายการ, เหลือ ${uniqueTransactions.length} รายการ`);
        
        // อัปเดตการแสดงผล
        updateSummaryFromLocal();
        
        return { removed: removedCount, remaining: uniqueTransactions.length };
    } else {
        console.log('✨ ไม่มีข้อมูลซ้ำ');
        return { removed: 0, remaining: originalCount };
    }
}

// ฟังก์ชันสำหรับตรวจสอบการอ่านข้อมูลซ้ำ - เครื่องมือ Debug
function debugDataDuplication() {
    console.log('🔍 === การตรวจสอบการอ่านข้อมูลซ้ำ ===');
    
    // ตรวจสอบข้อมูลปัจจุบันใน transactionLogs
    const pttTransactions = transactionLogs.filter(log => 
        (log.transactionType === 'refill' || log.transactionType === 'fuel-card') &&
        (log.sourceName.includes('ปตท') || log.sourceName.includes('PTT'))
    );
    
    console.log(`📊 ข้อมูลการซื้อจาก ปตท. ปัจจุบัน: ${pttTransactions.length} รายการ`);
    
    // วิเคราะห์ signature และหาข้อมูลซ้ำ
    const signatureCount = {};
    const duplicateGroups = {};
    
    pttTransactions.forEach((log, index) => {
        const signature = `${log.date}_${log.time}_${log.transactionType}_${log.sourceName}_${log.liters}_${log.pricePerLiter}`;
        
        if (!signatureCount[signature]) {
            signatureCount[signature] = 0;
            duplicateGroups[signature] = [];
        }
        
        signatureCount[signature]++;
        duplicateGroups[signature].push({
            index,
            id: log.id,
            timestamp: log.timestamp,
            totalAmount: log.totalAmount
        });
    });
    
    // แสดงผลการวิเคราะห์
    console.log('\n📋 รายละเอียดข้อมูลการซื้อน้ำมัน:');
    let duplicateFound = false;
    let totalDuplicates = 0;
    
    Object.entries(signatureCount).forEach(([signature, count]) => {
        console.log(`\n🔹 Signature: ${signature}`);
        console.log(`   จำนวนครั้ง: ${count} รายการ`);
        
        if (count > 1) {
            duplicateFound = true;
            totalDuplicates += (count - 1); // นับเฉพาะรายการซ้ำ (ไม่นับรายการแรก)
            
            console.log(`   🚨 มีข้อมูลซ้ำ! รายละเอียด:`);
            duplicateGroups[signature].forEach(item => {
                console.log(`      - ID: ${item.id}, Index: ${item.index}, Timestamp: ${item.timestamp}, Amount: ${item.totalAmount}`);
            });
        }
    });
    
    if (!duplicateFound) {
        console.log('✅ ไม่พบข้อมูลซ้ำในรายการการซื้อน้ำมัน');
    } else {
        console.log(`\n🚨 สรุป: พบข้อมูลซ้ำทั้งหมด ${totalDuplicates} รายการ`);
        console.log(`📊 จำนวนรายการที่ไม่ซ้ำจริง: ${Object.keys(signatureCount).length} รายการ`);
        console.log(`📊 จำนวนรายการทั้งหมด (รวมซ้ำ): ${pttTransactions.length} รายการ`);
    }
    
    // ไม่ตรวจสอบข้อมูลใน localStorage - ใช้เฉพาะข้อมูลจาก Google Sheets
    console.log(`\n📊 ข้อมูลทั้งหมดมาจาก Google Sheets เท่านั้น`);
    
    return {
        currentPttTransactions: pttTransactions.length,
        uniqueSignatures: Object.keys(signatureCount).length,
        duplicatesFound: totalDuplicates,
        signatureAnalysis: signatureCount
    };
}

// ฟังก์ชันสำหรับการตรวจสอบรายละเอียดข้อมูลการซื้อ ปตท.
function generatePTTPurchaseReport() {
    const pttTransactions = transactionLogs.filter(log => 
        log.transactionType === 'refill' || log.transactionType === 'fuel-card'
    );
    
    console.log('📋 รายงานการซื้อน้ำมันจาก ปตท.:');
    console.log('=====================================');
    
    let totalAmount = 0;
    let totalVolume = 0;
    
    pttTransactions.forEach((log, index) => {
        const amount = log.totalAmount || (log.liters * log.pricePerLiter) || 0;
        totalAmount += amount;
        totalVolume += log.liters || 0;
        
        console.log(`${index + 1}. ${log.timestamp || 'ไม่ระบุวันที่'}
           ประเภท: ${log.transactionType}
           จำนวน: ${(log.liters || 0).toLocaleString()} ลิตร
           ราคา/ลิตร: ${(log.pricePerLiter || 0).toFixed(4)} บาท
           ยอดรวม: ${amount.toFixed(2)} บาท`);
    });
    
    console.log('=====================================');
    console.log(`รวม: ${totalAmount.toLocaleString()} บาท, ${totalVolume.toLocaleString()} ลิตร`);
    console.log(`ราคาเฉลี่ย: ${totalVolume > 0 ? (totalAmount / totalVolume).toFixed(4) : 'N/A'} บาท/ลิตร`);
    
    return {
        totalAmount,
        totalVolume,
        transactionCount: pttTransactions.length,
        averagePrice: totalVolume > 0 ? totalAmount / totalVolume : 0
    };
}

// ฟังก์ชันอ่านข้อมูลสรุปจาก Google Sheets ตามตำแหน่งที่กำหนด
async function getSummaryFromSheets() {
    try {
        // เรียกข้อมูลจาก 2 sheets พร้อมกัน (Parallel) เพื่อลดเวลารอ
        const [transactionResponse, inventoryResponse] = await Promise.all([
            fetch(`${GOOGLE_SCRIPT_URL}?action=getSummaryData&sheetsId=${GOOGLE_SHEETS_ID}&gid=${TRANSACTION_LOG_SHEET_GID}`),
            fetch(`${GOOGLE_SCRIPT_URL}?action=getSummaryData&sheetsId=${GOOGLE_SHEETS_ID}&gid=${INVENTORY_SHEET_GID}`)
        ]);
        
        if (!transactionResponse.ok || !inventoryResponse.ok) {
            throw new Error(`HTTP error! Transaction: ${transactionResponse.status}, Inventory: ${inventoryResponse.status}`);
        }
        
        // แปลง response เป็น JSON พร้อมกัน
        const [transactionResult, inventoryResult] = await Promise.all([
            transactionResponse.json(),
            inventoryResponse.json()
        ]);
        
        // รวมข้อมูลจาก 2 sheets
        if (transactionResult.success && inventoryResult.success) {
            return {
                totalPurchaseAmount: parseFloat(transactionResult.data.totalPurchaseAmount) || 0, // จาก Transaction Log Sheet - column G
                totalPurchaseVolume: parseFloat(inventoryResult.data.totalPurchaseVolume) || 0, // จาก Inventory Sheet - D2
                totalCurrentStock: parseFloat(inventoryResult.data.totalCurrentStock) || 0 // จาก Inventory Sheet - ผลรวม D3:D14
            };
        }
        
        return null;
    } catch (error) {
        console.error('Error getting summary from sheets:', error);
        return null;
    }
}

// ฟังก์ชันอัพเดท D2 (จำนวนลิตรที่ซื้อจาก ปตท.) ใน Google Sheets
async function updatePTTPurchaseVolume(additionalLiters) {
    try {
        console.log(`กำลังอัพเดท PTT Purchase Volume: +${additionalLiters} ลิตร`);
        
        // หา PTT Purchase source และอัพเดท currentStock
        const pttSource = fuelSources.find(source => source.id === 'purchase' || source.name.includes('ปตท'));
        if (pttSource) {
            pttSource.currentStock += additionalLiters;
            console.log(`PTT Source ใหม่: ${pttSource.currentStock} ลิตร`);
        } else {
            console.warn('ไม่พบ PTT Purchase source');
        }
        
        // เตรียมข้อมูลสำหรับอัพเดต
        const updateData = {};
        fuelSources.forEach(source => {
            updateData[source.name] = source.currentStock;
        });
        
        // ใช้ updateInventory action ที่มีอยู่แล้ว
        const params = new URLSearchParams({
            action: 'updateInventory',
            data: JSON.stringify(updateData),
            sheetsId: GOOGLE_SHEETS_ID,
            gid: INVENTORY_SHEET_GID
        });
        
        const urlWithParams = `${GOOGLE_SCRIPT_URL}?${params.toString()}`;
        const response = await fetch(urlWithParams, {
            method: 'GET',
            mode: 'cors'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            console.log('อัพเดท PTT Purchase Volume สำเร็จ:', result.data);
            
            // บันทึกข้อมูล local ด้วย (สำหรับ backup)
            saveData();
            
            return true;
        } else {
            console.error('Error updating PTT purchase volume:', result.error);
            return false;
        }
    } catch (error) {
        console.error('Error updating PTT purchase volume:', error);
        return false;
    }
}

// เปิด modal สำหรับทำรายการ
function openTransactionModal(source) {
    // ตรวจสอบว่าได้ยืนยันยอดแล้วหรือไม่ (ยกเว้น purchase sources)
    if (source.id !== 'purchase' && source.id !== 'purchase_drum_200l' && !isSourceConfirmedToday(source.id)) {
        alert(`⚠️ ต้องยืนยันยอดก่อน\n\nกรุณายืนยันยอด "${source.name}" ก่อนทำรายการอื่นๆ`);
        return; // ไม่เปิด modal
    }
    
    currentSelectedSource = source;
    const modal = document.getElementById('transactionModal');
    const modalTitle = document.getElementById('modalTitle');
    
    modalTitle.textContent = `การทำรายการ - ${source.name}`;
    
    // Reset form
    document.getElementById('transactionForm').reset();
    ImageUpload.resetUpload();
    document.getElementById('refillForm').style.display = 'none';
    document.getElementById('dispenseForm').style.display = 'none';
    
    const imageUploadGroup = document.querySelector('.image-upload-group');
    if (imageUploadGroup) {
        imageUploadGroup.style.display = 'none';
    }
    
    const refillTypeField = document.getElementById('refillType');
    if (refillTypeField) {
        refillTypeField.value = 'ptt';
    }

    // อัตโนมัติแสดง dispense form หรือ refill form ตามแหล่งน้ำมัน
    if (source.name.includes('ปตท')) {
        showRefillForm();
    } else {
        showDispenseForm();
    }
    updateRefillTypeVisibility();
    
    // Populate destination options
    populateDestinationOptions();
    
    modal.style.display = 'block';
}

// Populate ตัวเลือกปลายทาง
function populateDestinationOptions() {
    const tankSelect = document.getElementById('tankSelect');
    tankSelect.innerHTML = '<option value="">เลือกแหล่งน้ำมัน</option>';
    
    const hiddenSources = ['drum_nakhonsawan', 'drum_khlong_luang', 'purchase_drum_200l', 'nakhonsawan_tank2'];
    
    fuelSources
        .filter(source => source.id !== currentSelectedSource.id && !hiddenSources.includes(source.id))
        .forEach(source => {
            const option = document.createElement('option');
            option.value = source.id;
            option.textContent = source.name;
            tankSelect.appendChild(option);
        });
}

// ========== Return Drum Functions ==========

// เปิด modal สำหรับคืนถังน้ำมัน
function openReturnDrumModal() {
    const modal = document.getElementById('returnDrumModal');
    const form = document.getElementById('returnDrumForm');
    
    // Reset form
    form.reset();
    
    // เติมข้อมูลถัง 200L
    populateReturnDrumOptions();
    
    // อัปเดตการแสดงผลลิตรรวม
    updateReturnDrumLiterDisplay();
    
    modal.style.display = 'block';
    
    // สำหรับการแสดง summary
    console.log('🥁 เปิด modal การคืนถังน้ำมัน');
}

// ปิด modal สำหรับคืนถังน้ำมัน
function closeBudgetModal() {
    document.getElementById('budgetManagementModal').style.display = 'none';
}

function closeReturnDrumModal() {
    const modal = document.getElementById('returnDrumModal');
    modal.style.display = 'none';
}

// เติมตัวเลือกของถัง 200L ที่มีอยู่
function populateReturnDrumOptions() {
    const select = document.getElementById('returnDrumSource');
    select.innerHTML = '<option value="">-- เลือกแหล่งถัง --</option>';
    
    // หา drum sources จาก fuelSources
    const drumSources = fuelSources.filter(source => isDrumSource(source));
    
    if (drumSources.length === 0) {
        select.innerHTML += '<option value="" disabled>ไม่มีถัง 200L ในระบบ</option>';
        return;
    }
    
    drumSources.forEach(source => {
        const option = document.createElement('option');
        option.value = source.id;
        const drums = litersToDrums(source.currentStock);
        option.textContent = `${source.name} (คงเหลือ: ${drums} ถัง)`;
        select.appendChild(option);
    });
}

// อัปเดตการแสดงผลจำนวนลิตรรวม
function updateReturnDrumLiterDisplay() {
    const drumCount = document.getElementById('returnDrumCount').value;
    const totalLiters = (drumCount || 0) * DRUM_CAPACITY_LITERS;
    document.getElementById('returnDrumTotalLiters').textContent = totalLiters.toLocaleString() + ' ลิตร';
}

// จัดการการคืนถังน้ำมัน
async function handleReturnDrumSubmit() {
    const operatorName = document.getElementById('returnOperatorName').value.trim();
    const operatingUnit = document.getElementById('returnOperatingUnit').value.trim();
    const sourceId = document.getElementById('returnDrumSource').value;
    const drumCount = parseFloat(document.getElementById('returnDrumCount').value);
    const notes = document.getElementById('returnDrumNotes').value.trim();
    
    try {
        // ตรวจสอบข้อมูล
        if (!operatorName || !operatingUnit || !sourceId || !drumCount) {
            throw new Error('กรุณากรอกข้อมูลให้ครบถ้วน');
        }
        
        if (drumCount <= 0) {
            throw new Error('จำนวนถังต้องมากกว่า 0');
        }
        
        setButtonLoading('submitReturnDrum', true);
        showLoading('กำลังบันทึกการคืนถังน้ำมัน...');
        
        // หาแหล่งถัง
        const drumSource = fuelSources.find(s => s.id === sourceId);
        if (!drumSource) {
            throw new Error('ไม่พบแหล่งถัง 200L ที่เลือก');
        }
        
        // คำนวณลิตร
        const liters = drumCount * DRUM_CAPACITY_LITERS;
        
        // ตรวจสอบว่าไม่เกินความจุขีดจำกัดหรือไม่
        if (drumSource.capacity !== null && (liters + drumSource.currentStock) > drumSource.capacity) {
            const maxDrums = litersToDrums(drumSource.capacity - drumSource.currentStock);
            throw new Error(`จำนวนถังเกินกว่าความจุ (ความจุเหลือ: ${maxDrums} ถัง = ${drumSource.capacity - drumSource.currentStock} ลิตร)`);
        }
        
        // เพิ่มจำนวนลิตรไปยังถัง
        drumSource.currentStock += liters;
        
        // สร้าง UID สำหรับธุรกรรมนี้
        const transactionUID = generateUID();
        
        // สร้าง log entry สำหรับการคืนถัง
        const logEntry = {
            id: Date.now(),
            uid: transactionUID,
            timestamp: new Date().toISOString(),
            date: new Date().toLocaleDateString('th-TH'),
            time: new Date().toLocaleTimeString('th-TH'),
            transactionType: 'return_drum', // ประเภทใหม่สำหรับการคืนถัง
            sourceId: sourceId, // แหล่งที่คืนจาก
            sourceName: drumSource.name,
            sourceType: drumSource.type,
            destinationId: null, // ไม่มีปลายทางสำหรับการคืน
            destinationName: null,
            destinationType: null,
            liters: liters,
            volume: `${drumCount} ถัง (${liters} ลิตร)`,
            pricePerLiter: null,
            pricePerDrum: null,
            totalAmount: null,
            operatorName: operatorName,
            operatingUnit: operatingUnit,
            missions: getSelectedMissions(),
            bookNo: null,
            receiptNo: null,
            drums: drumCount,
            notes: notes || null
        };
        
        transactionLogs.push(logEntry);
        
        // บันทึกข้อมูล แบบขนาน (Parallel) เพื่อให้เร็ว
        await Promise.all([
            saveInventoryToSheets(),
            logTransactionToSheets(logEntry)
        ]);
        
        // อัพเดท UI
        showLoading('กำลังอัปเดตหน้าจอ...');
        createFuelCards();
        updateSummary();
        
        // ปิด modal
        closeReturnDrumModal();
        hideLoading();
        
        // แสดง UID Modal
        showUIDModal(logEntry);
        
        console.log('✅ คืนถังสำเร็จ', logEntry);
        
    } catch (error) {
        console.error('Error in return drum transaction:', error);
        alert(error.message || 'เกิดข้อผิดพลาดในการคืนถัง กรุณาลองใหม่');
        hideLoading();
    } finally {
        setButtonLoading('submitReturnDrum', false);
    }
}

// ===== PTT Purchase 200L Functions =====
async function openPTTPurchase200LModal() {
    const modal = document.getElementById('pttPurchase200LModal');
    const form = document.getElementById('pttPurchase200LForm');
    
    form.reset();
    
    populatePTTPurchase200LOptions();
    updatePTTPurchase200LDisplay();
    
    modal.style.display = 'block';
    
    console.log('🛒 เปิด modal ซื้อถัง 200L จาก ปตท.');
}

async function updatePTTPurchase200LPrice() {
    const destinationId = document.getElementById('pttPurchase200LDestination').value;
    
    if (!destinationId) {
        document.getElementById('pttPurchase200LPricePerDrum').textContent = '0 บาท';
        window.pttPurchase200LPricePerDrum = 0;
        updatePTTPurchase200LDisplay();
        return;
    }
    
    const destinationSource = fuelSources.find(s => s.id === destinationId);
    if (!destinationSource) {
        console.warn('⚠️ Destination source not found:', destinationId);
        document.getElementById('pttPurchase200LPricePerDrum').textContent = '0 บาท';
        window.pttPurchase200LPricePerDrum = 0;
        updatePTTPurchase200LDisplay();
        return;
    }
    
    try {
        const prices = await fetchPTTPricesByLocationName(destinationSource.name);
        if (prices && prices.pricePerDrum) {
            document.getElementById('pttPurchase200LPricePerDrum').textContent = prices.pricePerDrum.toLocaleString() + ' บาท';
            window.pttPurchase200LPricePerDrum = prices.pricePerDrum;
            console.log('✅ Fetched price for', destinationSource.name, ':', prices.pricePerDrum);
        } else {
            document.getElementById('pttPurchase200LPricePerDrum').textContent = '0 บาท';
            window.pttPurchase200LPricePerDrum = 0;
        }
    } catch (error) {
        console.warn('⚠️ Could not fetch price for', destinationSource.name, ':', error);
        document.getElementById('pttPurchase200LPricePerDrum').textContent = '0 บาท';
        window.pttPurchase200LPricePerDrum = 0;
    }
    
    updatePTTPurchase200LDisplay();
}

function closePTTPurchase200LModal() {
    const modal = document.getElementById('pttPurchase200LModal');
    modal.style.display = 'none';
}

function populatePTTPurchase200LOptions() {
    const select = document.getElementById('pttPurchase200LDestination');
    select.innerHTML = '<option value="">-- เลือกแหล่งถัง --</option>';
    
    const drumSources = fuelSources.filter(source => isDrumSource(source));
    
    if (drumSources.length === 0) {
        select.innerHTML += '<option value="" disabled>ไม่มีถัง 200L ในระบบ</option>';
        return;
    }
    
    drumSources.forEach(source => {
        const option = document.createElement('option');
        option.value = source.id;
        const drums = litersToDrums(source.currentStock);
        option.textContent = `${source.name} (คงเหลือ: ${drums} ถัง)`;
        select.appendChild(option);
    });
}

function updatePTTPurchase200LDisplay() {
    const drumCount = document.getElementById('pttPurchase200LDrumCount').value || 0;
    const pricePerDrum = window.pttPurchase200LPricePerDrum || 0;
    
    const totalLiters = drumCount * DRUM_CAPACITY_LITERS;
    const totalAmount = drumCount * pricePerDrum;
    
    document.getElementById('pttPurchase200LTotalLiters').textContent = totalLiters.toLocaleString() + ' ลิตร';
    document.getElementById('pttPurchase200LTotalAmount').textContent = totalAmount.toLocaleString() + ' บาท';
}

async function handlePTTPurchase200LSubmit() {
    const operatorName = document.getElementById('pttPurchase200LOperatorName').value.trim();
    const operatingUnit = document.getElementById('pttPurchase200LOperatingUnit').value.trim();
    const destinationId = document.getElementById('pttPurchase200LDestination').value;
    const drumCount = parseFloat(document.getElementById('pttPurchase200LDrumCount').value);
    const notes = document.getElementById('pttPurchase200LNotes').value.trim();
    
    try {
        if (!operatorName || !destinationId || !drumCount) {
            throw new Error('กรุณากรอกข้อมูลให้ครบถ้วน');
        }
        
        if (drumCount <= 0) {
            throw new Error('จำนวนถังต้องมากกว่า 0');
        }
        
        setButtonLoading('submitPTTPurchase200L', true);
        showLoading('กำลังบันทึกการซื้อถัง...');
        
        const destinationSource = fuelSources.find(s => s.id === destinationId);
        if (!destinationSource) {
            throw new Error('ไม่พบแหล่งถัง 200L ที่เลือก');
        }
        
        const pricePerDrum = window.pttPurchase200LPricePerDrum || 0;
        if (pricePerDrum > 0) {
            console.log('✅ ใช้ราคา PTT Purchase 200L:', pricePerDrum);
        } else {
            console.warn('⚠️ ไม่พบราคา PTT Purchase 200L, บันทึกโดยไม่มีราคา');
        }
        
        const liters = drumCount * DRUM_CAPACITY_LITERS;
        const totalAmount = drumCount * pricePerDrum;
        
        const pttPurchaseSource = fuelSources.find(s => s.id === 'purchase_drum_200l');
        if (!pttPurchaseSource) {
            throw new Error('ไม่พบแหล่ง PTT Purchase 200L ในระบบ');
        }
        
        pttPurchaseSource.currentStock += liters;
        destinationSource.currentStock += liters;
        
        const transactionUID = generateUID();
        const logEntry = {
            id: Date.now(),
            uid: transactionUID,
            timestamp: new Date().toISOString(),
            date: new Date().toLocaleDateString('th-TH'),
            time: new Date().toLocaleTimeString('th-TH'),
            transactionType: 'purchase_drum_200l',
            sourceId: 'purchase_drum_200l',
            sourceName: 'PTT Purchase - 200L',
            sourceType: 'purchase',
            destinationId: destinationId,
            destinationName: destinationSource.name,
            destinationType: 'tank',
            liters: liters,
            volume: `${drumCount} ถัง (${liters} ลิตร)`,
            pricePerLiter: pricePerDrum ? (totalAmount / liters) : null,
            pricePerDrum: pricePerDrum,
            totalAmount: totalAmount,
            operatorName: operatorName,
            operatingUnit: operatingUnit,
            missions: getSelectedMissions(),
            bookNo: null,
            receiptNo: null,
            drums: drumCount,
            notes: notes || null
        };
        
        transactionLogs.push(logEntry);
        
        await Promise.all([
            saveInventoryToSheets(),
            logTransactionToSheets(logEntry)
        ]);
        
        showLoading('กำลังอัปเดตหน้าจอ...');
        createFuelCards();
        updateSummary();
        
        closePTTPurchase200LModal();
        hideLoading();
        
        showUIDModal(logEntry);
        
        console.log('✅ ซื้อถัง 200L จาก ปตท. สำเร็จ', logEntry);
        
    } catch (error) {
        console.error('Error in PTT Purchase 200L transaction:', error);
        alert(error.message || 'เกิดข้อผิดพลาดในการซื้อถัง กรุณาลองใหม่');
        hideLoading();
    } finally {
        setButtonLoading('submitPTTPurchase200L', false);
    }
}

// ===== Remove Drum - Nakhon Sawan Functions =====
function openRemoveDrumNakhonsawanModal() {
    document.getElementById('removeDrumNakhonsawanModal').style.display = 'block';
}

function closeRemoveDrumNakhonsawanModal() {
    document.getElementById('removeNakhonsawanOperatorName').value = '';
    document.getElementById('removeNakhonsawanOperatingUnit').value = '';
    document.getElementById('removeNakhonsawanDrumCount').value = '';
    document.getElementById('removeNakhonsawanNotes').value = '';
    document.getElementById('removeNakhonsawanDrumTotalLiters').textContent = '0 ลิตร';
    const modal = document.getElementById('removeDrumNakhonsawanModal');
    modal.style.display = 'none';
}

function updateRemoveDrumNakhonsawanLiterDisplay() {
    const drumCount = document.getElementById('removeNakhonsawanDrumCount').value;
    const totalLiters = (drumCount || 0) * DRUM_CAPACITY_LITERS;
    document.getElementById('removeNakhonsawanDrumTotalLiters').textContent = totalLiters.toLocaleString() + ' ลิตร';
}

async function handleRemoveDrumNakhonsawanSubmit() {
    const operatorName = document.getElementById('removeNakhonsawanOperatorName').value.trim();
    const operatingUnit = document.getElementById('removeNakhonsawanOperatingUnit').value.trim();
    const drumCount = parseFloat(document.getElementById('removeNakhonsawanDrumCount').value);
    const notes = document.getElementById('removeNakhonsawanNotes').value.trim();
    const sourceId = 'drum_nakhonsawan';
    
    try {
        if (!operatorName || !operatingUnit || !drumCount) {
            throw new Error('กรุณากรอกข้อมูลให้ครบถ้วน');
        }
        
        if (drumCount <= 0) {
            throw new Error('จำนวนถังต้องมากกว่า 0');
        }
        
        setButtonLoading('submitRemoveNakhonsawan', true);
        showLoading('กำลังบันทึกการลบถังน้ำมัน...');
        
        const drumSource = fuelSources.find(s => s.id === sourceId);
        if (!drumSource) {
            throw new Error('ไม่พบแหล่งถัง 200L ที่เลือก');
        }
        
        const liters = drumCount * DRUM_CAPACITY_LITERS;
        
        if (liters > drumSource.currentStock) {
            const maxDrums = litersToDrums(drumSource.currentStock);
            throw new Error(`จำนวนถังเกินกว่าที่มีอยู่ (คงเหลือ: ${maxDrums} ถัง = ${drumSource.currentStock} ลิตร)`);
        }
        
        drumSource.currentStock -= liters;
        
        const transactionUID = generateUID();
        
        const logEntry = {
            id: Date.now(),
            uid: transactionUID,
            timestamp: new Date().toISOString(),
            date: new Date().toLocaleDateString('th-TH'),
            time: new Date().toLocaleTimeString('th-TH'),
            transactionType: 'remove_drum_nakhonsawan',
            sourceId: sourceId,
            sourceName: drumSource.name,
            sourceType: drumSource.type,
            destinationId: null,
            destinationName: null,
            destinationType: null,
            liters: liters,
            volume: `${drumCount} ถัง (${liters} ลิตร)`,
            pricePerLiter: null,
            pricePerDrum: null,
            totalAmount: null,
            operatorName: operatorName,
            operatingUnit: operatingUnit,
            missions: getSelectedMissions(),
            bookNo: null,
            receiptNo: null,
            drums: drumCount,
            notes: notes || null
        };
        
        transactionLogs.push(logEntry);
        
        await Promise.all([
            saveInventoryToSheets(),
            logTransactionToSheets(logEntry)
        ]);
        
        showLoading('กำลังอัปเดตหน้าจอ...');
        createFuelCards();
        updateSummary();
        
        closeRemoveDrumNakhonsawanModal();
        hideLoading();
        
        showUIDModal(logEntry);
        
        console.log('✅ ลบถังสำเร็จ', logEntry);
        
    } catch (error) {
        console.error('Error in remove drum transaction:', error);
        alert(error.message || 'เกิดข้อผิดพลาดในการลบถัง กรุณาลองใหม่');
        hideLoading();
    } finally {
        setButtonLoading('submitRemoveNakhonsawan', false);
    }
}

// ===== Remove Drum - Khlong Luang Functions =====
function openRemoveDrumKhlongLuangModal() {
    document.getElementById('removeDrumKhlongLuangModal').style.display = 'block';
}

function closeRemoveDrumKhlongLuangModal() {
    document.getElementById('removeKhlongLuangOperatorName').value = '';
    document.getElementById('removeKhlongLuangOperatingUnit').value = '';
    document.getElementById('removeKhlongLuangDrumCount').value = '';
    document.getElementById('removeKhlongLuangNotes').value = '';
    document.getElementById('removeKhlongLuangDrumTotalLiters').textContent = '0 ลิตร';
    const modal = document.getElementById('removeDrumKhlongLuangModal');
    modal.style.display = 'none';
}

function updateRemoveDrumKhlongLuangLiterDisplay() {
    const drumCount = document.getElementById('removeKhlongLuangDrumCount').value;
    const totalLiters = (drumCount || 0) * DRUM_CAPACITY_LITERS;
    document.getElementById('removeKhlongLuangDrumTotalLiters').textContent = totalLiters.toLocaleString() + ' ลิตร';
}

async function handleRemoveDrumKhlongLuangSubmit() {
    const operatorName = document.getElementById('removeKhlongLuangOperatorName').value.trim();
    const operatingUnit = document.getElementById('removeKhlongLuangOperatingUnit').value.trim();
    const drumCount = parseFloat(document.getElementById('removeKhlongLuangDrumCount').value);
    const notes = document.getElementById('removeKhlongLuangNotes').value.trim();
    const sourceId = 'drum_khlong_luang';
    
    try {
        if (!operatorName || !operatingUnit || !drumCount) {
            throw new Error('กรุณากรอกข้อมูลให้ครบถ้วน');
        }
        
        if (drumCount <= 0) {
            throw new Error('จำนวนถังต้องมากกว่า 0');
        }
        
        setButtonLoading('submitRemoveKhlongLuang', true);
        showLoading('กำลังบันทึกการลบถังน้ำมัน...');
        
        const drumSource = fuelSources.find(s => s.id === sourceId);
        if (!drumSource) {
            throw new Error('ไม่พบแหล่งถัง 200L ที่เลือก');
        }
        
        const liters = drumCount * DRUM_CAPACITY_LITERS;
        
        if (liters > drumSource.currentStock) {
            const maxDrums = litersToDrums(drumSource.currentStock);
            throw new Error(`จำนวนถังเกินกว่าที่มีอยู่ (คงเหลือ: ${maxDrums} ถัง = ${drumSource.currentStock} ลิตร)`);
        }
        
        drumSource.currentStock -= liters;
        
        const transactionUID = generateUID();
        
        const logEntry = {
            id: Date.now(),
            uid: transactionUID,
            timestamp: new Date().toISOString(),
            date: new Date().toLocaleDateString('th-TH'),
            time: new Date().toLocaleTimeString('th-TH'),
            transactionType: 'remove_drum_khlong_luang',
            sourceId: sourceId,
            sourceName: drumSource.name,
            sourceType: drumSource.type,
            destinationId: null,
            destinationName: null,
            destinationType: null,
            liters: liters,
            volume: `${drumCount} ถัง (${liters} ลิตร)`,
            pricePerLiter: null,
            pricePerDrum: null,
            totalAmount: null,
            operatorName: operatorName,
            operatingUnit: operatingUnit,
            missions: getSelectedMissions(),
            bookNo: null,
            receiptNo: null,
            drums: drumCount,
            notes: notes || null
        };
        
        transactionLogs.push(logEntry);
        
        await Promise.all([
            saveInventoryToSheets(),
            logTransactionToSheets(logEntry)
        ]);
        
        showLoading('กำลังอัปเดตหน้าจอ...');
        createFuelCards();
        updateSummary();
        
        closeRemoveDrumKhlongLuangModal();
        hideLoading();
        
        showUIDModal(logEntry);
        
        console.log('✅ ลบถังสำเร็จ', logEntry);
        
    } catch (error) {
        console.error('Error in remove drum transaction:', error);
        alert(error.message || 'เกิดข้อผิดพลาดในการลบถัง กรุณาลองใหม่');
        hideLoading();
    } finally {
        setButtonLoading('submitRemoveKhlongLuang', false);
    }
}

// ===== Transaction Modal - Nakhon Sawan Functions =====
window.nakhonsawanPttRefillData = null;

let isLoadingNakhonsawan = false;

async function openTransactionNakhonsawanModal(pttRefillData = null) {
    // ตรวจสอบว่าได้ยืนยันยอดแล้วหรือไม่
    if (!isSourceConfirmedToday('drum_nakhonsawan')) {
        alert(`⚠️ ต้องยืนยันยอดก่อน\n\nกรุณายืนยันยอด "สนามบินนครสวรรค์ - ถัง 200L" ก่อนทำรายการ`);
        return;
    }
    
    if (isLoadingNakhonsawan) return;
    
    isLoadingNakhonsawan = true;
    showLoading('กำลังเตรียมข้อมูล...');
    
    try {
        // ดึงราคาจาก location name
        if (!pttRefillData) {
            const prices = await fetchPTTPricesByLocationName('สนามบินนครสวรรค์ - ถัง 200L');
            pttRefillData = {
                sourceId: 'purchase',
                pricePerDrum: prices.pricePerDrum
            };
        }
        
        window.nakhonsawanPttRefillData = pttRefillData;
        document.getElementById('transactionNakhonsawanModal').style.display = 'block';
        
        if (pttRefillData) {
            if (pttRefillData.operatorName) {
                document.getElementById('transactionNakhonsawanOperatorName').value = pttRefillData.operatorName;
            }
            if (pttRefillData.operatingUnit) {
                document.getElementById('transactionNakhonsawanOperatingUnit').value = pttRefillData.operatingUnit;
            }
        }
    } catch (error) {
        console.error('Error opening Nakhonsawan modal:', error);
        alert('เกิดข้อผิดพลาดในการเตรียมข้อมูล');
    } finally {
        hideLoading();
        isLoadingNakhonsawan = false;
    }
}

function closeTransactionNakhonsawanModal() {
    document.getElementById('transactionNakhonsawanOperatorName').value = '';
    document.getElementById('transactionNakhonsawanOperatingUnit').value = '';
    document.getElementById('transactionNakhonsawanDrumCount').value = '';
    document.getElementById('transactionNakhonsawanNotes').value = '';
    document.getElementById('transactionNakhonsawanDrumTotalLiters').textContent = '0 ลิตร';
    const modal = document.getElementById('transactionNakhonsawanModal');
    modal.style.display = 'none';
}

function updateTransactionNakhonsawanLiterDisplay() {
    const drumCount = document.getElementById('transactionNakhonsawanDrumCount').value;
    const totalLiters = (drumCount || 0) * DRUM_CAPACITY_LITERS;
    document.getElementById('transactionNakhonsawanDrumTotalLiters').textContent = totalLiters.toLocaleString() + ' ลิตร';
}

async function handleTransactionNakhonsawanSubmit() {
    const operatorName = document.getElementById('transactionNakhonsawanOperatorName').value.trim();
    const operatingUnit = document.getElementById('transactionNakhonsawanOperatingUnit').value.trim();
    const destinationType = document.getElementById('transactionNakhonsawanDestinationType').value;
    const sourceId = 'drum_nakhonsawan';
    
    try {
        if (!operatorName || !operatingUnit) {
            throw new Error('กรุณากรอกข้อมูลให้ครบถ้วน');
        }
        
        // ===== Handle DRAIN Transaction =====
        if (destinationType === 'drain') {
            setButtonLoading('submitTransactionNakhonsawan', true);
            showLoading('กำลังบันทึกการเดรนน้ำมัน...');
            
            const drainLitersInput = document.getElementById('transactionNakhonsawanDrainLiters');
            
            if (!drainLitersInput) {
                throw new Error('ไม่พบฟิลด์การเดรนน้ำมัน');
            }
            
            const drainAmount = parseFloat(drainLitersInput.value);
            
            if (!drainAmount || drainAmount <= 0) {
                throw new Error('กรุณากรอกจำนวนลิตรที่ต้องการเดรน');
            }
            
            const drumSource = fuelSources.find(s => s.id === sourceId);
            if (!drumSource) {
                throw new Error('ไม่พบแหล่งถัง 200L');
            }
            
            const liters = drainAmount;
            
            if (liters > drumSource.currentStock) {
                throw new Error(`จำนวนลิตรเกินกว่าที่มีอยู่ (คงเหลือ: ${drumSource.currentStock} ลิตร)`);
            }
            
            drumSource.currentStock -= liters;
            
            const transactionUID = generateUID();
            const logEntry = {
                id: Date.now(),
                uid: transactionUID,
                timestamp: new Date().toISOString(),
                date: new Date().toLocaleDateString('th-TH'),
                time: new Date().toLocaleTimeString('th-TH'),
                transactionType: 'drain',
                sourceId: sourceId,
                sourceName: drumSource.name,
                sourceType: drumSource.type,
                destinationType: 'drain',
                liters: liters,
                volume: `${liters} ลิตร`,
                operatorName: operatorName,
                operatingUnit: operatingUnit,
                missions: getSelectedMissions()
            };
            
            transactionLogs.push(logEntry);
            
            await Promise.all([
                saveInventoryToSheets(),
                logTransactionToSheets(logEntry)
            ]);
            
            showLoading('กำลังอัปเดตหน้าจอ...');
            createFuelCards();
            updateSummary();
            
            closeTransactionNakhonsawanModal();
            hideLoading();
            
            showUIDModal(logEntry);
            
            console.log('✅ บันทึกการเดรนน้ำมันสำเร็จ', logEntry);
            
            return;
        }
        
        // ===== Handle Normal Transaction (aircraft/tank) =====
        const drumCount = parseFloat(document.getElementById('transactionNakhonsawanDrumCount').value);
        
        if (!drumCount || drumCount <= 0) {
            throw new Error('จำนวนถังต้องมากกว่า 0');
        }
        
        const pttData = window.nakhonsawanPttRefillData;
        let destinationId = null;
        let destinationName = null;
        let pricePerDrum = null;
        let totalAmount = null;
        
        // ถ้าเป็นการเติมจาก PTT
        if (pttData && pttData.sourceId === 'purchase') {
            destinationId = 'purchase';
            destinationName = 'ปตท.';
            pricePerDrum = pttData.pricePerDrum;
            totalAmount = drumCount * pricePerDrum;
        } else {
            // Normal transaction
            if (destinationType === 'aircraft') {
                destinationId = document.getElementById('transactionNakhonsawanAircraftSelect').value;
                destinationName = destinationId;
                if (!destinationId) {
                    throw new Error('กรุณาเลือกเครื่องบิน');
                }
            } else if (destinationType === 'tank') {
                destinationId = document.getElementById('transactionNakhonsawanTankSelect').value;
                if (!destinationId) {
                    throw new Error('กรุณาเลือกแหล่งน้ำมัน');
                }
                
                const selectedSource = fuelSources.find(s => s.id === destinationId);
                destinationName = selectedSource ? selectedSource.name : destinationId;
                
                if (destinationName.includes('สนามบิน')) {
                    const prices = await fetchPTTPricesByLocationName(destinationName);
                    if (prices && prices.pricePerDrum) {
                        pricePerDrum = prices.pricePerDrum;
                        totalAmount = drumCount * pricePerDrum;
                        console.log('✅ Fetched airport fuel price:', { destinationName, pricePerDrum, totalAmount });
                    } else {
                        console.warn('⚠️ Could not fetch price for airport fuel source:', destinationName);
                    }
                }
            }
        }
        
        setButtonLoading('submitTransactionNakhonsawan', true);
        showLoading('กำลังบันทึกการทำรายการ...');
        
        const drumSource = fuelSources.find(s => s.id === sourceId);
        if (!drumSource) {
            throw new Error('ไม่พบแหล่งถัง 200L ที่เลือก');
        }
        
        const liters = drumCount * DRUM_CAPACITY_LITERS;
        
        if (liters > drumSource.currentStock) {
            const maxDrums = litersToDrums(drumSource.currentStock);
            throw new Error(`จำนวนถังเกินกว่าที่มีอยู่ (คงเหลือ: ${maxDrums} ถัง = ${drumSource.currentStock} ลิตร)`);
        }
        
        drumSource.currentStock -= liters;
        
        // ถ้าเป็นการเติมจาก PTT อัพเดต stock ด้วย
        if (pttData && pttData.sourceId === 'purchase') {
            const pttIndex = fuelSources.findIndex(s => s.id === 'purchase');
            if (pttIndex !== -1) {
                fuelSources[pttIndex].currentStock += liters;
            }
        }
        
        const transactionUID = generateUID();
        const transactionType = pttData ? 'refill_drum_nakhonsawan' : 'transaction_drum_nakhonsawan';
        
        const logEntry = {
            id: Date.now(),
            uid: transactionUID,
            timestamp: new Date().toISOString(),
            date: new Date().toLocaleDateString('th-TH'),
            time: new Date().toLocaleTimeString('th-TH'),
            transactionType: transactionType,
            sourceId: pttData ? 'purchase' : sourceId,
            sourceName: pttData ? 'ปตท.' : drumSource.name,
            sourceType: pttData ? 'purchase' : drumSource.type,
            destinationId: sourceId,
            destinationName: drumSource.name,
            destinationType: 'tank',
            liters: liters,
            volume: `${drumCount} ถัง (${liters} ลิตร)`,
            pricePerLiter: pricePerDrum ? (totalAmount / liters) : null,
            pricePerDrum: pricePerDrum,
            totalAmount: totalAmount,
            operatorName: operatorName,
            operatingUnit: operatingUnit,
            missions: getSelectedMissions(),
            bookNo: pttData ? pttData.bookNo : null,
            receiptNo: pttData ? pttData.receiptNo : null,
            drums: drumCount,
            notes: notes || null
        };
        
        transactionLogs.push(logEntry);
        
        await Promise.all([
            saveInventoryToSheets(),
            logTransactionToSheets(logEntry)
        ]);
        
        showLoading('กำลังอัปเดตหน้าจอ...');
        createFuelCards();
        updateSummary();
        
        closeTransactionNakhonsawanModal();
        hideLoading();
        
        showUIDModal(logEntry);
        
        console.log('✅ บันทึกการทำรายการสำเร็จ', logEntry);
        
    } catch (error) {
        console.error('Error in transaction:', error);
        alert(error.message || 'เกิดข้อผิดพลาดในการทำรายการ กรุณาลองใหม่');
        hideLoading();
    } finally {
        setButtonLoading('submitTransactionNakhonsawan', false);
    }
}

// ===== Transaction Modal - Khlong Luang Functions =====
window.khlongluangPttRefillData = null;

let isLoadingKhlongLuang = false;

async function openTransactionKhlongLuangModal(pttRefillData = null) {
    // ตรวจสอบว่าได้ยืนยันยอดแล้วหรือไม่
    if (!isSourceConfirmedToday('drum_khlong_luang')) {
        alert(`⚠️ ต้องยืนยันยอดก่อน\n\nกรุณายืนยันยอด "สนามบินคลองหลวง - ถัง 200L" ก่อนทำรายการ`);
        return;
    }
    
    if (isLoadingKhlongLuang) return;
    
    isLoadingKhlongLuang = true;
    showLoading('กำลังเตรียมข้อมูล...');
    
    try {
        // ดึงราคาจาก location name
        if (!pttRefillData) {
            const prices = await fetchPTTPricesByLocationName('สนามบินคลองหลวง - ถัง 200L');
            pttRefillData = {
                sourceId: 'purchase',
                pricePerDrum: prices.pricePerDrum
            };
        }
        
        window.khlongluangPttRefillData = pttRefillData;
        document.getElementById('transactionKhlongLuangModal').style.display = 'block';
        
        if (pttRefillData) {
            if (pttRefillData.operatorName) {
                document.getElementById('transactionKhlongLuangOperatorName').value = pttRefillData.operatorName;
            }
            if (pttRefillData.operatingUnit) {
                document.getElementById('transactionKhlongLuangOperatingUnit').value = pttRefillData.operatingUnit;
            }
        }
    } catch (error) {
        console.error('Error opening Khlong Luang modal:', error);
        alert('เกิดข้อผิดพลาดในการเตรียมข้อมูล');
    } finally {
        hideLoading();
        isLoadingKhlongLuang = false;
    }
}

function closeTransactionKhlongLuangModal() {
    document.getElementById('transactionKhlongLuangOperatorName').value = '';
    document.getElementById('transactionKhlongLuangOperatingUnit').value = '';
    document.getElementById('transactionKhlongLuangDrumCount').value = '';
    document.getElementById('transactionKhlongLuangNotes').value = '';
    document.getElementById('transactionKhlongLuangDrumTotalLiters').textContent = '0 ลิตร';
    const modal = document.getElementById('transactionKhlongLuangModal');
    modal.style.display = 'none';
}

function updateTransactionKhlongLuangLiterDisplay() {
    const drumCount = document.getElementById('transactionKhlongLuangDrumCount').value;
    const totalLiters = (drumCount || 0) * DRUM_CAPACITY_LITERS;
    document.getElementById('transactionKhlongLuangDrumTotalLiters').textContent = totalLiters.toLocaleString() + ' ลิตร';
}

async function handleTransactionKhlongLuangSubmit() {
    const operatorName = document.getElementById('transactionKhlongLuangOperatorName').value.trim();
    const operatingUnit = document.getElementById('transactionKhlongLuangOperatingUnit').value.trim();
    const destinationType = document.getElementById('transactionKhlongLuangDestinationType').value;
    const sourceId = 'drum_khlong_luang';
    
    try {
        if (!operatorName || !operatingUnit) {
            throw new Error('กรุณากรอกข้อมูลให้ครบถ้วน');
        }
        
        // ===== Handle DRAIN Transaction =====
        if (destinationType === 'drain') {
            setButtonLoading('submitTransactionKhlongLuang', true);
            showLoading('กำลังบันทึกการเดรนน้ำมัน...');
            
            const drainLitersInput = document.getElementById('transactionKhlongLuangDrainLiters');
            
            if (!drainLitersInput) {
                throw new Error('ไม่พบฟิลด์การเดรนน้ำมัน');
            }
            
            const drainAmount = parseFloat(drainLitersInput.value);
            
            if (!drainAmount || drainAmount <= 0) {
                throw new Error('กรุณากรอกจำนวนลิตรที่ต้องการเดรน');
            }
            
            const drumSource = fuelSources.find(s => s.id === sourceId);
            if (!drumSource) {
                throw new Error('ไม่พบแหล่งถัง 200L');
            }
            
            const liters = drainAmount;
            
            if (liters > drumSource.currentStock) {
                throw new Error(`จำนวนลิตรเกินกว่าที่มีอยู่ (คงเหลือ: ${drumSource.currentStock} ลิตร)`);
            }
            
            drumSource.currentStock -= liters;
            
            const transactionUID = generateUID();
            const logEntry = {
                id: Date.now(),
                uid: transactionUID,
                timestamp: new Date().toISOString(),
                date: new Date().toLocaleDateString('th-TH'),
                time: new Date().toLocaleTimeString('th-TH'),
                transactionType: 'drain',
                sourceId: sourceId,
                sourceName: drumSource.name,
                sourceType: drumSource.type,
                destinationType: 'drain',
                liters: liters,
                volume: `${liters} ลิตร`,
                operatorName: operatorName,
                operatingUnit: operatingUnit,
                missions: getSelectedMissions()
            };
            
            transactionLogs.push(logEntry);
            
            await Promise.all([
                saveInventoryToSheets(),
                logTransactionToSheets(logEntry)
            ]);
            
            showLoading('กำลังอัปเดตหน้าจอ...');
            createFuelCards();
            updateSummary();
            
            closeTransactionKhlongLuangModal();
            hideLoading();
            
            showUIDModal(logEntry);
            
            console.log('✅ บันทึกการเดรนน้ำมันสำเร็จ', logEntry);
            
            return;
        }
        
        // ===== Handle Normal Transaction (aircraft/tank) =====
        const drumCount = parseFloat(document.getElementById('transactionKhlongLuangDrumCount').value);
        
        if (!drumCount || drumCount <= 0) {
            throw new Error('จำนวนถังต้องมากกว่า 0');
        }
        
        const pttData = window.khlongluangPttRefillData;
        let destinationId = null;
        let destinationName = null;
        let pricePerDrum = null;
        let totalAmount = null;
        
        // ถ้าเป็นการเติมจาก PTT
        if (pttData && pttData.sourceId === 'purchase') {
            destinationId = 'purchase';
            destinationName = 'ปตท.';
            pricePerDrum = pttData.pricePerDrum;
            totalAmount = drumCount * pricePerDrum;
        } else {
            // Normal transaction
            if (destinationType === 'aircraft') {
                destinationId = document.getElementById('transactionKhlongLuangAircraftSelect').value;
                destinationName = destinationId;
                if (!destinationId) {
                    throw new Error('กรุณาเลือกเครื่องบิน');
                }
            } else if (destinationType === 'tank') {
                destinationId = document.getElementById('transactionKhlongLuangTankSelect').value;
                if (!destinationId) {
                    throw new Error('กรุณาเลือกแหล่งน้ำมัน');
                }
                
                const selectedSource = fuelSources.find(s => s.id === destinationId);
                destinationName = selectedSource ? selectedSource.name : destinationId;
                
                if (destinationName.includes('สนามบิน')) {
                    const prices = await fetchPTTPricesByLocationName(destinationName);
                    if (prices && prices.pricePerDrum) {
                        pricePerDrum = prices.pricePerDrum;
                        totalAmount = drumCount * pricePerDrum;
                        console.log('✅ Fetched airport fuel price:', { destinationName, pricePerDrum, totalAmount });
                    } else {
                        console.warn('⚠️ Could not fetch price for airport fuel source:', destinationName);
                    }
                }
            }
        }
        
        setButtonLoading('submitTransactionKhlongLuang', true);
        showLoading('กำลังบันทึกการทำรายการ...');
        
        const drumSource = fuelSources.find(s => s.id === sourceId);
        if (!drumSource) {
            throw new Error('ไม่พบแหล่งถัง 200L ที่เลือก');
        }
        
        const liters = drumCount * DRUM_CAPACITY_LITERS;
        
        if (liters > drumSource.currentStock) {
            const maxDrums = litersToDrums(drumSource.currentStock);
            throw new Error(`จำนวนถังเกินกว่าที่มีอยู่ (คงเหลือ: ${maxDrums} ถัง = ${drumSource.currentStock} ลิตร)`);
        }
        
        drumSource.currentStock -= liters;
        
        // ถ้าเป็นการเติมจาก PTT อัพเดต stock ด้วย
        if (pttData && pttData.sourceId === 'purchase') {
            const pttIndex = fuelSources.findIndex(s => s.id === 'purchase');
            if (pttIndex !== -1) {
                fuelSources[pttIndex].currentStock += liters;
            }
        }
        
        const transactionUID = generateUID();
        const transactionType = pttData ? 'refill_drum_khlong_luang' : 'transaction_drum_khlong_luang';
        
        const logEntry = {
            id: Date.now(),
            uid: transactionUID,
            timestamp: new Date().toISOString(),
            date: new Date().toLocaleDateString('th-TH'),
            time: new Date().toLocaleTimeString('th-TH'),
            transactionType: transactionType,
            sourceId: pttData ? 'purchase' : sourceId,
            sourceName: pttData ? 'ปตท.' : drumSource.name,
            sourceType: pttData ? 'purchase' : drumSource.type,
            destinationId: sourceId,
            destinationName: drumSource.name,
            destinationType: 'tank',
            liters: liters,
            volume: `${drumCount} ถัง (${liters} ลิตร)`,
            pricePerLiter: pricePerDrum ? (totalAmount / liters) : null,
            pricePerDrum: pricePerDrum,
            totalAmount: totalAmount,
            operatorName: operatorName,
            operatingUnit: operatingUnit,
            missions: getSelectedMissions(),
            bookNo: pttData ? pttData.bookNo : null,
            receiptNo: pttData ? pttData.receiptNo : null,
            drums: drumCount,
            notes: notes || null
        };
        
        transactionLogs.push(logEntry);
        
        await Promise.all([
            saveInventoryToSheets(),
            logTransactionToSheets(logEntry)
        ]);
        
        showLoading('กำลังอัปเดตหน้าจอ...');
        createFuelCards();
        updateSummary();
        
        closeTransactionKhlongLuangModal();
        hideLoading();
        
        showUIDModal(logEntry);
        
        console.log('✅ บันทึกการทำรายการสำเร็จ', logEntry);
        
    } catch (error) {
        console.error('Error in transaction:', error);
        alert(error.message || 'เกิดข้อผิดพลาดในการทำรายการ กรุณาลองใหม่');
        hideLoading();
    } finally {
        setButtonLoading('submitTransactionKhlongLuang', false);
    }
}

// Event Listeners สำหรับ Modal และ Form controls
function initializeEventListeners() {
    // ===== Universal Modal Close Handler =====
    // Close modals by clicking on the backdrop (outside modal-content)
    window.addEventListener('click', function(event) {
        // Close modal if click is directly on the modal backdrop (not on modal-content)
        if (event.target.classList && event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
    
    // ===== Close Button Event Listeners =====
    // Main transaction modal
    const modal = document.getElementById('transactionModal');
    const closeBtnTransaction = modal.querySelector('.close');
    if (closeBtnTransaction) {
        closeBtnTransaction.onclick = function() {
            modal.style.display = 'none';
        };
    }
    
    // PTT Purchase modal close button
    const closePttBtn = document.querySelector('.close-ptt');
    if (closePttBtn) {
        closePttBtn.onclick = function() {
            document.getElementById('pttPurchaseModal').style.display = 'none';
        };
    }
    
    // UID Modal close button
    const closeUidBtn = document.getElementById('closeUidModal');
    if (closeUidBtn) {
        closeUidBtn.onclick = function() {
            document.getElementById('uidModal').style.display = 'none';
        };
    }
    
    // Window click handler จะถูกจัดการใน initializeBudgetSystem
    
    // Destination type change
    document.getElementById('destinationType').onchange = function() {
        const aircraftDestination = document.getElementById('aircraftDestination');
        const tankDestination = document.getElementById('tankDestination');
        
        if (this.value === 'aircraft') {
            aircraftDestination.style.display = 'block';
            tankDestination.style.display = 'none';
        } else if (this.value === 'drain') {
            aircraftDestination.style.display = 'none';
            tankDestination.style.display = 'none';
        } else {
            aircraftDestination.style.display = 'none';
            tankDestination.style.display = 'block';
        }
    };
    
    // Note: Price calculation is now handled automatically from localStorage
    // No need for manual price input event listeners
    
    // Form submission
    document.getElementById('transactionForm').onsubmit = function(e) {
        e.preventDefault();
        if (document.getElementById('refillForm').style.display !== 'none') {
            handleRefillSubmit();
        } else if (document.getElementById('dispenseForm').style.display !== 'none') {
            handleDispenseSubmit();
        }
    };
    
    // Image Upload Event Listener
    const transactionImageInput = document.getElementById('transactionImage');
    if (transactionImageInput) {
        transactionImageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                ImageUpload.displayImagePreview(file);
            }
        });
        
        const uploadLabel = document.querySelector('.upload-label');
        if (uploadLabel) {
            uploadLabel.addEventListener('dragover', function(e) {
                e.preventDefault();
                uploadLabel.style.borderColor = '#1e3c72';
                uploadLabel.style.background = '#e8f1f8';
            });
            
            uploadLabel.addEventListener('dragleave', function(e) {
                e.preventDefault();
                uploadLabel.style.borderColor = '#d0d7de';
                uploadLabel.style.background = '#fafbfc';
            });
            
            uploadLabel.addEventListener('drop', function(e) {
                e.preventDefault();
                uploadLabel.style.borderColor = '#d0d7de';
                uploadLabel.style.background = '#fafbfc';
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    transactionImageInput.files = files;
                    ImageUpload.displayImagePreview(files[0]);
                }
            });
        }
    }
    
    // Admin buttons
    document.getElementById('refreshDataBtn').onclick = async function() {
        handleRefreshDataClick();
    };
    
    const pttPurchaseBtn = document.getElementById('pttPurchaseBtn');
    if (pttPurchaseBtn) {
        pttPurchaseBtn.onclick = function() {
            openPttPurchaseModal();
        };
    }



    const validateDataBtn = document.getElementById('validateDataBtn');
    if (validateDataBtn) {
        validateDataBtn.onclick = function() {
            handleValidateDataClick();
        };
    }

    const debugDuplicateBtn = document.getElementById('debugDuplicateBtn');
    if (debugDuplicateBtn) {
        debugDuplicateBtn.onclick = function() {
            handleDebugDuplicateClick();
        };
    }

    // Budget management
    const manageBudgetBtn = document.getElementById('manageBudgetBtn');
    if (manageBudgetBtn) {
        manageBudgetBtn.onclick = function() {
            openBudgetModal();
        };
    }

    // Budget form submission
    const budgetForm = document.getElementById('budgetForm');
    if (budgetForm) {
        budgetForm.onsubmit = function(e) {
            e.preventDefault();
            saveBudget();
        };
    }
    
    // Return Drum Form Events
    const returnDrumForm = document.getElementById('returnDrumForm');
    if (returnDrumForm) {
        // Event listener สำหรับการเปลี่ยนจำนวนถัง
        document.getElementById('returnDrumCount').addEventListener('input', function() {
            updateReturnDrumLiterDisplay();
        });
        
        // Event listener สำหรับ form submission
        returnDrumForm.onsubmit = function(e) {
            e.preventDefault();
            handleReturnDrumSubmit();
        };
    }
    
    // Modal close button สำหรับ returnDrumModal
    const returnDrumModal = document.getElementById('returnDrumModal');
    if (returnDrumModal) {
        const returnDrumCloseBtn = returnDrumModal.querySelector('.close');
        if (returnDrumCloseBtn) {
            returnDrumCloseBtn.onclick = function() {
                closeReturnDrumModal();
            };
        }
    }
    
    // PTT Purchase 200L Form Events
    const pttPurchase200LForm = document.getElementById('pttPurchase200LForm');
    if (pttPurchase200LForm) {
        document.getElementById('pttPurchase200LDrumCount').addEventListener('input', function() {
            updatePTTPurchase200LDisplay();
        });
        
        document.getElementById('pttPurchase200LDestination').addEventListener('change', function() {
            updatePTTPurchase200LPrice();
        });
        
        pttPurchase200LForm.onsubmit = function(e) {
            e.preventDefault();
            handlePTTPurchase200LSubmit();
        };
    }
    
    // Modal close button สำหรับ pttPurchase200LModal
    const pttPurchase200LModal = document.getElementById('pttPurchase200LModal');
    if (pttPurchase200LModal) {
        const pttPurchase200LCloseBtn = pttPurchase200LModal.querySelector('.close');
        if (pttPurchase200LCloseBtn) {
            pttPurchase200LCloseBtn.onclick = function() {
                closePTTPurchase200LModal();
            };
        }
    }
    
    // Remove Drum Nakhon Sawan Form Events
    const removeDrumNakhonsawanForm = document.getElementById('removeDrumNakhonsawanForm');
    if (removeDrumNakhonsawanForm) {
        document.getElementById('removeNakhonsawanDrumCount').addEventListener('input', function() {
            updateRemoveDrumNakhonsawanLiterDisplay();
        });
        
        document.getElementById('removeNakhonsawanDestinationType').addEventListener('change', function() {
            const aircraftDestination = document.getElementById('removeNakhonsawanAircraftDestination');
            const tankDestination = document.getElementById('removeNakhonsawanTankDestination');
            const drainFields = document.getElementById('removeNakhonsawanDrainFields');
            
            if (this.value === 'aircraft') {
                aircraftDestination.style.display = 'block';
                tankDestination.style.display = 'none';
                if (drainFields) drainFields.style.display = 'none';
            } else if (this.value === 'drain') {
                aircraftDestination.style.display = 'none';
                tankDestination.style.display = 'none';
                if (drainFields) drainFields.style.display = 'block';
            } else {
                aircraftDestination.style.display = 'none';
                tankDestination.style.display = 'block';
                if (drainFields) drainFields.style.display = 'none';
            }
        });
        
        removeDrumNakhonsawanForm.onsubmit = function(e) {
            e.preventDefault();
            handleRemoveDrumNakhonsawanSubmit();
        };
    }
    
    const removeDrumKhlongLuangForm = document.getElementById('removeDrumKhlongLuangForm');
    if (removeDrumKhlongLuangForm) {
        document.getElementById('removeKhlongLuangDrumCount').addEventListener('input', function() {
            updateRemoveDrumKhlongLuangLiterDisplay();
        });
        
        document.getElementById('removeKhlongLuangDestinationType').addEventListener('change', function() {
            const aircraftDestination = document.getElementById('removeKhlongLuangAircraftDestination');
            const tankDestination = document.getElementById('removeKhlongLuangTankDestination');
            const drainFields = document.getElementById('removeKhlongLuangDrainFields');
            
            if (this.value === 'aircraft') {
                aircraftDestination.style.display = 'block';
                tankDestination.style.display = 'none';
                if (drainFields) drainFields.style.display = 'none';
            } else if (this.value === 'drain') {
                aircraftDestination.style.display = 'none';
                tankDestination.style.display = 'none';
                if (drainFields) drainFields.style.display = 'block';
            } else {
                aircraftDestination.style.display = 'none';
                tankDestination.style.display = 'block';
                if (drainFields) drainFields.style.display = 'none';
            }
        });
        
        removeDrumKhlongLuangForm.onsubmit = function(e) {
            e.preventDefault();
            handleRemoveDrumKhlongLuangSubmit();
        };
    }
    
    // Transaction Nakhon Sawan Form Events
    const transactionNakhonsawanForm = document.getElementById('transactionNakhonsawanForm');
    if (transactionNakhonsawanForm) {
        document.getElementById('transactionNakhonsawanDrumCount').addEventListener('input', function() {
            updateTransactionNakhonsawanLiterDisplay();
        });
        
        document.getElementById('transactionNakhonsawanDestinationType').addEventListener('change', function() {
            const aircraftDestination = document.getElementById('transactionNakhonsawanAircraftDestination');
            const tankDestination = document.getElementById('transactionNakhonsawanTankDestination');
            const drainFields = document.getElementById('transactionNakhonsawanDrainFields');
            
            if (this.value === 'aircraft') {
                aircraftDestination.style.display = 'block';
                tankDestination.style.display = 'none';
                if (drainFields) drainFields.style.display = 'none';
            } else if (this.value === 'drain') {
                aircraftDestination.style.display = 'none';
                tankDestination.style.display = 'none';
                if (drainFields) drainFields.style.display = 'block';
            } else {
                aircraftDestination.style.display = 'none';
                tankDestination.style.display = 'block';
                if (drainFields) drainFields.style.display = 'none';
            }
        });
        
        transactionNakhonsawanForm.onsubmit = function(e) {
            e.preventDefault();
            handleTransactionNakhonsawanSubmit();
        };
    }
    
    // Transaction Khlong Luang Form Events
    const transactionKhlongLuangForm = document.getElementById('transactionKhlongLuangForm');
    if (transactionKhlongLuangForm) {
        document.getElementById('transactionKhlongLuangDrumCount').addEventListener('input', function() {
            updateTransactionKhlongLuangLiterDisplay();
        });
        
        document.getElementById('transactionKhlongLuangDestinationType').addEventListener('change', function() {
            const aircraftDestination = document.getElementById('transactionKhlongLuangAircraftDestination');
            const tankDestination = document.getElementById('transactionKhlongLuangTankDestination');
            const drainFields = document.getElementById('transactionKhlongLuangDrainFields');
            
            if (this.value === 'aircraft') {
                aircraftDestination.style.display = 'block';
                tankDestination.style.display = 'none';
                if (drainFields) drainFields.style.display = 'none';
            } else if (this.value === 'drain') {
                aircraftDestination.style.display = 'none';
                tankDestination.style.display = 'none';
                if (drainFields) drainFields.style.display = 'block';
            } else {
                aircraftDestination.style.display = 'none';
                tankDestination.style.display = 'block';
                if (drainFields) drainFields.style.display = 'none';
            }
        });
        
        transactionKhlongLuangForm.onsubmit = function(e) {
            e.preventDefault();
            handleTransactionKhlongLuangSubmit();
        };
    }
}

function updateRefillTypeVisibility() {
    const pttFields = document.getElementById('pttPurchaseFields');
    const pttDocumentFields = document.getElementById('pttDocumentFields');

    if (pttFields) {
        pttFields.style.display = 'block';
    }
    if (pttDocumentFields) {
        pttDocumentFields.style.display = 'block';
    }

    const drumRefillFields = document.getElementById('drumRefillFields');
    const isCurrentSourceDrum = currentSelectedSource ? isDrumSource(currentSelectedSource) : false;

    if (drumRefillFields) {
        drumRefillFields.style.display = isCurrentSourceDrum ? 'block' : 'none';
    }

    if (isCurrentSourceDrum) {
        const refillDrumsInput = document.getElementById('refillDrums');
        const drumTotalLitersDisplay = document.getElementById('drumTotalLiters');

        if (refillDrumsInput && drumTotalLitersDisplay) {
            const updateDrumTotalLiters = () => {
                const drums = parseFloat(refillDrumsInput.value) || 0;
                const totalLiters = drumsToLiters(drums);
                drumTotalLitersDisplay.textContent = `${totalLiters.toLocaleString()} ลิตร`;
            };

            if (!refillDrumsInput.dataset.hasDrumListener) {
                refillDrumsInput.addEventListener('input', updateDrumTotalLiters);
                refillDrumsInput.addEventListener('change', updateDrumTotalLiters);
                refillDrumsInput.dataset.hasDrumListener = 'true';
            }

            updateDrumTotalLiters();
        }
    }


    const destinationTypeSelect = document.getElementById('pttDestinationType');
    const aircraftDestinationSection = document.getElementById('pttAircraftDestination');
    const tankDestinationSection = document.getElementById('pttTankDestination');
    const tankSelect = document.getElementById('pttTankSelect');

    const applyDestinationVisibility = () => {
        const destinationType = destinationTypeSelect ? destinationTypeSelect.value : 'aircraft';
        const drainFieldsSection = document.getElementById('pttDrainFields');
        if (aircraftDestinationSection) {
            aircraftDestinationSection.style.display = destinationType === 'aircraft' ? 'block' : 'none';
        }
        if (tankDestinationSection) {
            tankDestinationSection.style.display = destinationType === 'tank' ? 'block' : 'none';
        }
        if (drainFieldsSection) {
            drainFieldsSection.style.display = destinationType === 'drain' ? 'block' : 'none';
        }
    };

    if (destinationTypeSelect) {
        destinationTypeSelect.onchange = applyDestinationVisibility;
        applyDestinationVisibility();
    }

    if (tankSelect) {
        const previousValue = tankSelect.value;
        tankSelect.innerHTML = '<option value="">เลือกแหล่งน้ำมัน</option>';

        const hiddenSources = ['drum_nakhonsawan', 'drum_khlong_luang', 'purchase_drum_200l', 'nakhonsawan_tank2'];
        
        fuelSources
            .filter(source => source.id !== (currentSelectedSource ? currentSelectedSource.id : null) && !hiddenSources.includes(source.id))
            .forEach(source => {
                const option = document.createElement('option');
                option.value = source.id;
                option.textContent = source.name;
                tankSelect.appendChild(option);
            });

        if (previousValue && fuelSources.some(source => source.id === previousValue && source.id !== (currentSelectedSource ? currentSelectedSource.id : null) && !hiddenSources.includes(source.id))) {
            tankSelect.value = previousValue;
        } else {
            tankSelect.value = '';
        }

        tankSelect.onchange = () => {
            if (destinationTypeSelect) {
                destinationTypeSelect.value = 'tank';
                applyDestinationVisibility();
            }
            updatePttRefillFieldsBasedOnDestination();
        };
    }
    
    updatePttRefillFieldsBasedOnDestination();
}

function updatePttRefillFieldsBasedOnDestination() {
    const tankSelect = document.getElementById('pttTankSelect');
    const drumRefillFields = document.getElementById('drumRefillFields');
    const pttDispenseLitersLabel = document.querySelector('[for="pttDispenseLiters"]');
    const pttDispenseLitersField = pttDispenseLitersLabel ? pttDispenseLitersLabel.parentElement : null;
    
    if (!tankSelect || !drumRefillFields || !pttDispenseLitersField) return;
    
    const selectedDestinationId = tankSelect.value;
    const destinationSource = fuelSources.find(s => s.id === selectedDestinationId);
    const isDestinationDrum = destinationSource && isDrumSource(destinationSource);
    
    if (isDestinationDrum) {
        drumRefillFields.style.display = 'block';
        pttDispenseLitersField.style.display = 'none';
        
        const refillDrumsInput = document.getElementById('refillDrums');
        const drumTotalLitersDisplay = document.getElementById('drumTotalLiters');
        
        if (refillDrumsInput && drumTotalLitersDisplay) {
            const updateDrumTotalLiters = () => {
                const drums = parseFloat(refillDrumsInput.value) || 0;
                const totalLiters = drumsToLiters(drums);
                drumTotalLitersDisplay.textContent = `${totalLiters.toLocaleString()} ลิตร`;
            };
            
            if (!refillDrumsInput.dataset.hasPttDrumListener) {
                refillDrumsInput.addEventListener('input', updateDrumTotalLiters);
                refillDrumsInput.addEventListener('change', updateDrumTotalLiters);
                refillDrumsInput.dataset.hasPttDrumListener = 'true';
            }
            
            updateDrumTotalLiters();
        }
    } else {
        drumRefillFields.style.display = 'none';
        pttDispenseLitersField.style.display = 'block';
    }
}

function showRefillForm() {
    const refillForm = document.getElementById('refillForm');
    const dispenseForm = document.getElementById('dispenseForm');
    const refillTypeSelect = document.getElementById('refillType');
    const imageUploadGroup = document.querySelector('.image-upload-group');

    if (refillForm) {
        refillForm.style.display = 'block';
    }
    if (dispenseForm) {
        dispenseForm.style.display = 'none';
    }
    if (imageUploadGroup) {
        imageUploadGroup.style.display = 'block';
    }

    updateRefillTypeVisibility();
}

function showDispenseForm() {
    document.getElementById('refillForm').style.display = 'none';
    document.getElementById('dispenseForm').style.display = 'block';
    
    const imageUploadGroup = document.querySelector('.image-upload-group');
    if (imageUploadGroup) {
        imageUploadGroup.style.display = 'none';
    }
    
    // แสดง/ซ่อนฟิลด์ตามประเภทของแหล่งน้ำมัน
    const drumDispenseFields = document.getElementById('drumDispenseFields');
    const literDispenseFields = document.getElementById('literDispenseFields');
    const tankSelect = document.getElementById('tankSelect');
    
    // ฟังก์ชันตรวจสอบและอัพเดทฟิลด์ตามปลายทาง
    const updateFieldsBasedOnDestination = () => {
        const destinationType = document.getElementById('destinationType').value;
        const destinationId = tankSelect.value;
        
        // แสดง/ซ่อนฟิลด์ปลายทางตามประเภท
        const aircraftDestination = document.getElementById('aircraftDestination');
        const tankDestination = document.getElementById('tankDestination');
        
        if (destinationType === 'aircraft') {
            aircraftDestination.style.display = 'block';
            tankDestination.style.display = 'none';
        } else if (destinationType === 'drain') {
            aircraftDestination.style.display = 'none';
            tankDestination.style.display = 'none';
        } else {
            aircraftDestination.style.display = 'none';
            tankDestination.style.display = 'block';
        }
        
        // ตรวจสอบว่าปลายทางเป็นถัง 200L หรือไม่
        let isDestinationDrum = false;
        if (destinationType === 'tank' && destinationId) {
            const destSource = fuelSources.find(s => s.id === destinationId);
            isDestinationDrum = isDrumSource(destSource);
        }
        
        if (isDestinationDrum) {
            // ถ้าปลายทางเป็นถัง 200L ให้แสดงฟิลด์ถัง
            drumDispenseFields.style.display = 'block';
            literDispenseFields.style.display = 'none';
            
            // หมายเหตุ: ฟิลด์ราคาถูกลบออกไปแล้ว (ใช้ราคาจาก localStorage แทน)
            // ไม่ต้องแสดง/ซ่อนฟิลด์ราคาอีกต่อไป
            
            // ตั้งค่า event listener สำหรับคำนวณลิตรอัตโนมัติ
            const dispenseDrumsInput = document.getElementById('dispenseDrums');
            
            const calculateDrumDispense = () => {
                const drums = parseFloat(dispenseDrumsInput.value) || 0;
                const totalLiters = drumsToLiters(drums);
                
                const drumLitersDisplay = document.getElementById('drumDispenseLiters');
                if (drumLitersDisplay) {
                    drumLitersDisplay.textContent = `${totalLiters.toLocaleString()} ลิตร`;
                }
            };
            
            if (dispenseDrumsInput) {
                dispenseDrumsInput.oninput = calculateDrumDispense;
                
                // Reset ค่า
                dispenseDrumsInput.value = '';
                calculateDrumDispense();
            }
        } else {
            // ถ้าไม่ใช่ถัง 200L ให้แสดงฟิลด์ลิตรปกติ
            drumDispenseFields.style.display = 'none';
            literDispenseFields.style.display = 'block';
            
            // หมายเหตุ: ฟิลด์ราคาถูกลบออกไปแล้ว (ใช้ราคาจาก localStorage แทน)
            // ไม่ต้องแสดง/ซ่อนฟิลด์ราคาอีกต่อไป
        }
    };
    
    // เรียกใช้ครั้งแรกเมื่อเปิดฟอร์ม
    updateFieldsBasedOnDestination();
    
    // ตั้งค่า event listener สำหรับเปลี่ยนปลายทาง
    document.getElementById('destinationType').onchange = updateFieldsBasedOnDestination;
    tankSelect.onchange = updateFieldsBasedOnDestination;
}

// หมายเหตุ: ฟังก์ชันเหล่านี้ไม่ได้ใช้งานอีกต่อไป
// ราคาถูกจัดการโดย Admin ผ่าน Google Sheet (gid=1828300695 PTT_PRICES) และดึงข้อมูลตามจังหวัด
// function calculateRefillAmount() {
//     const liters = parseFloat(document.getElementById('refillLiters').value) || 0;
//     const pricePerLiter = parseFloat(document.getElementById('pricePerLiter').value) || 0;
//     const totalAmount = liters * pricePerLiter;
//     
//     document.getElementById('totalAmount').textContent = totalAmount.toFixed(2) + ' บาท';
// }

// function calculateDispenseAmount() {
//     const liters = parseFloat(document.getElementById('dispenseLiters').value) || 0;
//     const pricePerLiter = parseFloat(document.getElementById('dispensePricePerLiter').value) || 0;
//     const totalAmount = liters * pricePerLiter;
//     
//     document.getElementById('dispenseTotalAmount').textContent = totalAmount.toFixed(2) + ' บาท';
// }

async function handleRefillSubmit() {
    const operatorName = document.getElementById('operatorName').value.trim();
    const operatingUnit = document.getElementById('operatingUnit').value.trim();
    
    // ดึง Book No. และ Receipt No.
    const bookNo = document.getElementById('bookNo').value.trim();
    const receiptNo = document.getElementById('receiptNo').value.trim();
    
    // ✅ ดึงปลายทาง (destination) จากฟอร์ม
    const pttDestinationType = document.getElementById('pttDestinationType') ? document.getElementById('pttDestinationType').value : 'aircraft';
    let destinationId = null;
    let destinationName = null;
    let destinationType = pttDestinationType;
    
    // Handle DRAIN transaction specially (no destination required)
    if (destinationType === 'drain') {
        try {
            setButtonLoading('submitRefill', true);
            showLoading('กำลังประมวลผลการเดรนน้ำมัน...');
            
            const drainLiters = parseFloat(document.getElementById('pttDrainLiters').value);
            
            if (!operatorName || !operatingUnit || !drainLiters) {
                alert('กรุณากรอกข้อมูลให้ครบถ้วน');
                return;
            }
            
            // For drain from PTT purchase, we don't reduce PTT stock (it's where we buy from)
            // We just record the drain action
            const liters = drainLiters;
            
            // Create transaction log
            const transactionUID = generateUID();
            const volumeDisplay = `${liters} ลิตร`;
            const now = new Date();
            const logEntry = {
                id: Date.now(),
                uid: transactionUID,
                timestamp: getThailandISO8601(now),
                date: now.toLocaleDateString('th-TH'),
                time: now.toLocaleTimeString('th-TH'),
                transactionType: 'drain',
                sourceId: 'purchase', // drain from PTT
                sourceName: 'จัดซื้อจาก ปตท.',
                destinationType: 'drain',
                liters: liters,
                volume: volumeDisplay,
                operatorName: operatorName,
                operatingUnit: operatingUnit,
                missions: getSelectedMissions()
            };
            
            transactionLogs.push(logEntry);
            
            // บันทึกข้อมูล แบบขนาน (Parallel) เพื่อให้เร็ว
            await Promise.all([
                saveInventoryToSheets(),
                logTransactionToSheets(logEntry)
            ]);
            
            // อัพเดท UI
            showLoading('กำลังอัปเดตหน้าจอ...');
            createFuelCards();
            updateSummary();
            
            // ปิด modal
            document.getElementById('transactionModal').style.display = 'none';
            hideLoading();
            
            // แสดง UID Modal แทน alert
            showUIDModal(logEntry);
            
        } catch (error) {
            console.error('Error in drain transaction:', error);
            alert(error.message || 'เกิดข้อผิดพลาดในการทำรายการ กรุณาลองใหม่');
            hideLoading();
        } finally {
            setButtonLoading('submitRefill', false);
        }
        return;
    }
    
    if (pttDestinationType === 'aircraft') {
        destinationId = document.getElementById('pttAircraftSelect').value;
        destinationName = destinationId; // สำหรับเครื่องบิน ใช้ชื่อโดยตรง
    } else {
        destinationId = document.getElementById('pttTankSelect').value;
        const destSource = fuelSources.find(s => s.id === destinationId);
        destinationName = destSource ? destSource.name : null;
    }
    
    // ✅ ตรวจสอบว่าเลือกปลายทางแล้ว
    if (!destinationId || !destinationName) {
        alert('กรุณาเลือกปลายทาง');
        return;
    }
    
    let liters, pricePerLiter, totalAmount, drums = null, pricePerDrum = null;
    
    try {
        setButtonLoading('submitRefill', true);
        showLoading('กำลังประมวลผลการซื้อจาก ปตท....');

        // ดึงราคาจากจังหวัด (operatingUnit)
        const prices = await fetchPTTPricesByProvince(operatingUnit);
        
        if (!prices || (prices.pricePerLiter === 0 && prices.pricePerDrum === 0)) {
            throw new Error('ไม่พบข้อมูลราคาสำหรับจังหวัด: ' + operatingUnit);
        }
        
        // ✅ ตรวจสอบว่าปลายทางเป็นถัง 200L หรือไม่
        const destSource = fuelSources.find(s => s.id === destinationId);
        const isDestinationDrum = destSource && isDrumSource(destSource);
        
        if (isDestinationDrum) {
            // สำหรับถัง 200L
            drums = parseFloat(document.getElementById('refillDrums').value);
            pricePerDrum = prices.pricePerDrum; // ใช้ราคาจากจังหวัด
            
            if (!operatorName || !operatingUnit || !drums) {
                throw new Error('กรุณากรอกข้อมูลให้ครบถ้วน');
            }

            // คำนวณลิตรและราคาต่อลิตร
            liters = drumsToLiters(drums);
            totalAmount = drums * pricePerDrum;
            pricePerLiter = totalAmount / liters; // คำนวณราคาต่อลิตรจากราคาต่อถัง (สำหรับคำนวณเท่านั้น)
        } else {
            // สำหรับลิตรปกติ
            const pttDispenseLitersInput = document.getElementById('pttDispenseLiters');
            liters = pttDispenseLitersInput ? parseFloat(pttDispenseLitersInput.value) : 0;
            pricePerLiter = prices.pricePerLiter; // ใช้ราคาจากจังหวัด

            if (!operatorName || !operatingUnit || !liters) {
                throw new Error('กรุณากรอกข้อมูลให้ครบถ้วน');
            }

            totalAmount = liters * pricePerLiter;
        }
        
        // ✅ อัพเดท current stock ของปลายทาง (จากฟอร์ม ไม่ใช่ currentSelectedSource)
        const destIndex = fuelSources.findIndex(s => s.id === destinationId);
        if (destIndex !== -1) {
            fuelSources[destIndex].currentStock += liters;
        }
        
        // อัพเดท current stock ของ ปตท. (id = 'purchase') ด้วย
        const pttIndex = fuelSources.findIndex(s => s.id === 'purchase');
        if (pttIndex !== -1) {
            fuelSources[pttIndex].currentStock += liters;
        }
        
        // จัดรูปแบบ volume สำหรับแสดงผล
        let volumeDisplay;
        if (drums) {
            volumeDisplay = `${drums} ถัง (${liters} ลิตร)`;
        } else {
            volumeDisplay = `${liters} ลิตร`;
        }
        
        // สร้าง UID สำหรับธุรกรรมนี้
        const transactionUID = generateUID();
        
        // บันทึก log - ระบุว่าเป็นการซื้อจาก ปตท. เสมอ
        const now = new Date();
        const logEntry = {
            id: Date.now(),
            uid: transactionUID, // ✅ เพิ่ม UID
            timestamp: getThailandISO8601(now),
            date: now.toLocaleDateString('th-TH'),
            time: now.toLocaleTimeString('th-TH'),
            transactionType: 'refill',
            sourceId: 'purchase', // แหล่งที่มาคือ ปตท. เสมอ
            sourceName: 'จัดซื้อจาก ปตท.', // แหล่งที่มาคือ ปตท.
            destinationId: destinationId, // ✅ ปลายทางจากฟอร์ม ไม่ใช่ currentSelectedSource
            destinationName: destinationName, // ✅ ชื่อปลายทางจากฟอร์ม
            destinationType: destinationType, // ✅ ประเภทปลายทางจากฟอร์ม
            liters: liters,
            volume: volumeDisplay, // ✅ ส่งข้อมูลที่จัดรูปแบบแล้ว เช่น "5 ถัง (1000 ลิตร)"
            pricePerLiter: pricePerLiter,
            pricePerDrum: pricePerDrum, // ✅ เพิ่มราคาต่อถัง (null ถ้าไม่ใช่ถัง)
            totalAmount: totalAmount,
            operatorName: operatorName,
            operatingUnit: operatingUnit,
            missions: getSelectedMissions(),
            bookNo: bookNo || null, // ✅ เพิ่ม Book No.
            receiptNo: receiptNo || null, // ✅ เพิ่ม Receipt No.
            drums: drums // เก็บจำนวนถังถ้าเป็นถัง 200L
        };
        
        transactionLogs.push(logEntry);
        
        // 📸 Image Upload Section
        const selectedImage = ImageUpload.getSelectedFile();
        if (selectedImage) {
            try {
                showLoading('กำลังอัพโหลดรูปภาพ...');
                const base64Data = await ImageUpload.convertFileToBase64(selectedImage);
                const uploadResult = await ImageUpload.uploadImageToServer(base64Data, selectedImage.name);
                
                if (uploadResult.success) {
                    logEntry.imageUrl = uploadResult.imageUrl;
                    logEntry.imageFilename = uploadResult.filename;
                    logEntry.imageDriveId = uploadResult.fileId;
                    logEntry.imageUploadDate = uploadResult.uploadDate;
                    
                    console.log('✅ Image uploaded and attached to transaction:', logEntry.uid);
                } else {
                    console.warn('⚠️ Image upload failed, but transaction will continue:', uploadResult.error);
                }
            } catch (error) {
                console.error('❌ Error uploading image:', error);
                alert('การอัพโหลดรูปภาพล้มเหลว แต่การทำรายการจะดำเนินต่อ');
            }
        }
        
        // บันทึกข้อมูล แบบขนาน (Parallel) เพื่อให้เร็ว
        await Promise.all([
            saveInventoryToSheets(),
            logTransactionToSheets(logEntry),
            updatePTTPurchaseVolume(liters)
        ]);
        
        // อัพเดท UI
        showLoading('กำลังอัปเดตหน้าจอ...');
        createFuelCards();
        updateSummary();
        
        // ปิด modal
        document.getElementById('transactionModal').style.display = 'none';
        hideLoading();
        
        // แสดง UID Modal แทน alert
        showUIDModal(logEntry);
    
    } catch (error) {
        console.error('Error in refill transaction:', error);
        alert(error.message || 'เกิดข้อผิดพลาดในการทำรายการ กรุณาลองใหม่');
        hideLoading();
    } finally {
        setButtonLoading('submitRefill', false);
    }
}

async function handleDispenseSubmit() {
    const operatorName = document.getElementById('operatorName').value.trim();
    const operatingUnit = document.getElementById('operatingUnit').value.trim();
    const destinationType = document.getElementById('destinationType').value;
    
    let liters, pricePerLiter = null, totalAmount = null, drums = null, pricePerDrum = null;
    
    // Handle DRAIN transaction specially (no destination required)
    if (destinationType === 'drain') {
        try {
            setButtonLoading('submitDispense', true);
            showLoading('กำลังประมวลผลการเดรนน้ำมัน...');
            
            liters = parseFloat(document.getElementById('dispenseLiters').value);
            
            if (!operatorName || !operatingUnit || !liters) {
                alert('กรุณากรอกข้อมูลให้ครบถ้วน');
                return;
            }
            
            // Check stock
            if (currentSelectedSource.currentStock < liters) {
                alert(`น้ำมันไม่เพียงพอ\nคงเหลือ: ${currentSelectedSource.currentStock.toLocaleString()} ลิตร\nต้องการ: ${liters.toLocaleString()} ลิตร`);
                return;
            }
            
            // Update source stock (drain removes fuel)
            const sourceIndex = fuelSources.findIndex(s => s.id === currentSelectedSource.id);
            if (sourceIndex !== -1) {
                fuelSources[sourceIndex].currentStock -= liters;
            }
            
            // Create transaction log
            const transactionUID = generateUID();
            const volumeDisplay = `${liters} ลิตร`;
            const now = new Date();
            const logEntry = {
                id: Date.now(),
                uid: transactionUID,
                timestamp: getThailandISO8601(now),
                date: now.toLocaleDateString('th-TH'),
                time: now.toLocaleTimeString('th-TH'),
                transactionType: 'drain',
                sourceId: currentSelectedSource.id,
                sourceName: currentSelectedSource.name,
                destinationType: 'drain',
                liters: liters,
                volume: volumeDisplay,
                operatorName: operatorName,
                operatingUnit: operatingUnit,
                missions: getSelectedMissions()
            };
            
            transactionLogs.push(logEntry);
            
            // บันทึกข้อมูล แบบขนาน (Parallel) เพื่อให้เร็ว
            await Promise.all([
                saveInventoryToSheets(),
                logTransactionToSheets(logEntry)
            ]);
            
            // อัพเดท UI
            showLoading('กำลังอัปเดตหน้าจอ...');
            createFuelCards();
            updateSummary();
            
            // ปิด modal
            document.getElementById('transactionModal').style.display = 'none';
            hideLoading();
            
            // อัพเดท lastLogCount เพื่อให้ระบบรู้ว่ามี transaction ใหม่
            if (window.activityLogger && window.activityLogger.lastLogCount !== undefined) {
                window.activityLogger.lastLogCount = transactionLogs.length;
            }
            
            // แสดง UID Modal แทน alert
            showUIDModal(logEntry);
            
        } catch (error) {
            console.error('Error in drain transaction:', error);
            alert(error.message || 'เกิดข้อผิดพลาดในการทำรายการ กรุณาลองใหม่');
            hideLoading();
        } finally {
            setButtonLoading('submitDispense', false);
        }
        return;
    }
    
    // ตรวจสอบปลายทางว่าเป็นถัง 200L หรือไม่
    let destinationId = null;
    if (destinationType === 'aircraft') {
        destinationId = document.getElementById('aircraftSelect').value;
    } else {
        destinationId = document.getElementById('tankSelect').value;
    }
    
    const destSource = fuelSources.find(s => s.id === destinationId);
    const isDestinationDrum = destSource && isDrumSource(destSource);
    
    // ดึงราคาจาก Google Sheets ถ้าแหล่งเป็น ปตท.
    if (currentSelectedSource.type === 'purchase') {
        try {
            console.log('🔍 กำลังดึงราคาจาก Google Sheets...');
            const prices = await fetchCurrentPricesFromSheets();
            
            if (!prices || (prices.pricePerLiter === undefined && prices.pricePerDrum === undefined)) {
                throw new Error('ไม่พบข้อมูลราคาใน Google Sheets');
            }
            
            // ตรวจสอบว่าราคาเป็น 0 (ยังไม่ได้ตั้งค่า)
            if (prices.pricePerLiter === 0 && prices.pricePerDrum === 0) {
                alert('ยังไม่มีการตั้งค่าราคาใน Google Sheets\nกรุณาไปที่หน้า "จัดการราคา" เพื่อตั้งค่าราคาก่อน');
                return;
            }
            
            pricePerLiter = prices.pricePerLiter || 0;
            pricePerDrum = prices.pricePerDrum || 0;
            
            console.log('✅ ดึงราคาสำเร็จ:', { pricePerLiter, pricePerDrum });
        } catch (error) {
            console.error('❌ ไม่สามารถดึงราคาจาก Google Sheets:', error);
            alert('ไม่สามารถดึงราคาจาก Google Sheets ได้\nกรุณาตรวจสอบการเชื่อมต่อและลองใหม่อีกครั้ง\n\nError: ' + error.message);
            return;
        }
    }
    
    // ตรวจสอบว่าปลายทางเป็นถัง 200L หรือไม่
    if (isDestinationDrum) {
        // สำหรับถัง 200L
        drums = parseFloat(document.getElementById('dispenseDrums').value);
        
        if (!operatorName || !operatingUnit || !drums) {
            alert('กรุณากรอกข้อมูลให้ครบถ้วน');
            return;
        }
        
        // คำนวณลิตร
        liters = drumsToLiters(drums);
        
        // ถ้าจ่ายจาก ปตท. คำนวณราคา
        if (currentSelectedSource.type === 'purchase') {
            if (!pricePerDrum || pricePerDrum <= 0) {
                alert('ไม่พบราคาต่อถังใน Google Sheets\nกรุณาตั้งค่าราคาในหน้า "จัดการราคา" ก่อน');
                return;
            }
            totalAmount = drums * pricePerDrum;
            pricePerLiter = totalAmount / liters; // คำนวณราคาต่อลิตรจากราคาต่อถัง
            console.log(`💰 คำนวณราคา: ${drums} ถัง × ${pricePerDrum} บาท = ${totalAmount} บาท`);
        }
    } else {
        // สำหรับลิตรปกติ
        liters = parseFloat(document.getElementById('dispenseLiters').value);
        
        if (!operatorName || !operatingUnit || !liters) {
            alert('กรุณากรอกข้อมูลให้ครบถ้วน');
            return;
        }
        
        // ถ้าจ่ายจาก ปตท. คำนวณราคา
        if (currentSelectedSource.type === 'purchase') {
            if (!pricePerLiter || pricePerLiter <= 0) {
                alert('ไม่พบราคาต่อลิตรใน Google Sheets\nกรุณาตั้งค่าราคาในหน้า "จัดการราคา" ก่อน');
                return;
            }
            totalAmount = liters * pricePerLiter;
            console.log(`💰 คำนวณราคา: ${liters} ลิตร × ${pricePerLiter} บาท = ${totalAmount} บาท`);
        }
    }
    
    // หา destinationName
    let destinationName = null;
    if (destinationType === 'aircraft') {
        destinationName = destinationId;
    } else {
        destinationName = destSource ? destSource.name : null;
    }
    
    if (!destinationId) {
        alert('กรุณาเลือกปลายทาง');
        return;
    }
    
    // ตรวจสอบ stock (เฉพาะแหล่งที่ไม่ใช่ ปตท.)
    // หมายเหตุ: ปตท. ไม่ต้องเช็ค stock เพราะเป็นการบันทึกว่าซื้อไปทั้งหมดเท่าไหร่
    if (currentSelectedSource.type !== 'purchase') {
        // สำหรับแหล่งน้ำมันทั่วไป (แท๊งค์, รถ, ถัง 200L)
        if (currentSelectedSource.currentStock < liters) {
            alert(`น้ำมันไม่เพียงพอ\nคงเหลือ: ${currentSelectedSource.currentStock.toLocaleString()} ลิตร\nต้องการ: ${liters.toLocaleString()} ลิตร`);
            return;
        }
    }
    
    try {
        setButtonLoading('submitDispense', true);
        showLoading('กำลังประมวลผลการจ่ายออก...');
        
        // อัพเดท stock ของแหล่งต้นทาง
        if (currentSelectedSource.type === 'purchase') {
            // ถ้าเป็น ปตท. ให้เพิ่ม stock (บันทึกว่าซื้อไปทั้งหมดเท่าไหร่)
            const pttIndex = fuelSources.findIndex(s => s.id === 'purchase');
            if (pttIndex !== -1) {
                fuelSources[pttIndex].currentStock += liters;
            }
        } else {
            // ถ้าไม่ใช่ ปตท. ให้ลด stock ปกติ (เช่น แท๊งค์, รถ, ถัง 200L)
            const sourceIndex = fuelSources.findIndex(s => s.id === currentSelectedSource.id);
            if (sourceIndex !== -1) {
                fuelSources[sourceIndex].currentStock -= liters;
            }
        }
        
        // อัพเดท stock ของปลายทาง (ถ้าเป็นแหล่งน้ำมัน)
        if (destinationType === 'tank') {
            const destIndex = fuelSources.findIndex(s => s.id === destinationId);
            if (destIndex !== -1) {
                fuelSources[destIndex].currentStock += liters;
            }
        }
        
        // จัดรูปแบบ volume สำหรับแสดงผล
        let volumeDisplay;
        if (drums) {
            volumeDisplay = `${drums} ถัง (${liters} ลิตร)`;
        } else {
            volumeDisplay = `${liters} ลิตร`;
        }
        
        // สร้าง UID สำหรับธุรกรรมนี้
        const transactionUID = generateUID();
        
        // บันทึก log
        const logEntry = {
            id: Date.now(),
            uid: transactionUID, // ✅ เพิ่ม UID
            timestamp: new Date().toISOString(),
            date: new Date().toLocaleDateString('th-TH'),
            time: new Date().toLocaleTimeString('th-TH'),
            transactionType: 'dispense',
            sourceId: currentSelectedSource.id,
            sourceName: currentSelectedSource.name,
            destinationId: destinationId,
            destinationName: destinationName,
            destinationType: destinationType,
            liters: liters,
            volume: volumeDisplay, // ✅ ส่งข้อมูลที่จัดรูปแบบแล้ว เช่น "5 ถัง (1000 ลิตร)"
            pricePerLiter: pricePerLiter,
            pricePerDrum: pricePerDrum, // ✅ เพิ่มราคาต่อถัง (null ถ้าไม่ใช่ถัง)
            totalAmount: totalAmount,
            operatorName: operatorName,
            operatingUnit: operatingUnit,
            missions: getSelectedMissions(),
            drums: drums // เก็บจำนวนถังถ้าเป็นถัง 200L
        };
        
        transactionLogs.push(logEntry);
        
        // 📸 Image Upload Section
        const selectedImage = ImageUpload.getSelectedFile();
        if (selectedImage) {
            try {
                showLoading('กำลังอัพโหลดรูปภาพ...');
                const base64Data = await ImageUpload.convertFileToBase64(selectedImage);
                const uploadResult = await ImageUpload.uploadImageToServer(base64Data, selectedImage.name);
                
                if (uploadResult.success) {
                    logEntry.imageUrl = uploadResult.imageUrl;
                    logEntry.imageFilename = uploadResult.filename;
                    logEntry.imageDriveId = uploadResult.fileId;
                    logEntry.imageUploadDate = uploadResult.uploadDate;
                    
                    console.log('✅ Image uploaded and attached to transaction:', logEntry.uid);
                } else {
                    console.warn('⚠️ Image upload failed, but transaction will continue:', uploadResult.error);
                }
            } catch (error) {
                console.error('❌ Error uploading image:', error);
                alert('การอัพโหลดรูปภาพล้มเหลว แต่การทำรายการจะดำเนินต่อ');
            }
        }
        
        // บันทึกข้อมูล แบบขนาน (Parallel) เพื่อให้เร็ว
        await Promise.all([
            saveInventoryToSheets(),
            logTransactionToSheets(logEntry)
        ]);
        
        // อัพเดท UI
        showLoading('กำลังอัปเดตหน้าจอ...');
        createFuelCards();
        updateSummary();
        
        // ปิด modal
        document.getElementById('transactionModal').style.display = 'none';
        hideLoading();
        
        // อัพเดท lastLogCount เพื่อให้ระบบรู้ว่ามี transaction ใหม่ (ไม่แสดงข้อความระบบ)
        if (window.activityLogger && window.activityLogger.lastLogCount !== undefined) {
            window.activityLogger.lastLogCount = transactionLogs.length;
        }
        
        // แสดง UID Modal แทน alert
        showUIDModal(logEntry);
    
    } catch (error) {
        console.error('Error in dispense transaction:', error);
        alert('เกิดข้อผิดพลาดในการทำรายการ กรุณาลองใหม่');
        hideLoading();
    } finally {
        setButtonLoading('submitDispense', false);
    }
}

// ฟังก์ชันสำหรับดาวน์โหลดข้อมูลทั้งหมด (ถ้าต้องการในอนาคต)
function downloadAllTransactions() {
    if (transactionLogs.length === 0) {
        alert('ไม่มีข้อมูลการทำรายการ');
        return;
    }
    
    // สร้าง CSV content
    const headers = [
        'ID',
        'วันที่',
        'เวลา',
        'ประเภทรายการ',
        'แหล่งต้นทาง',
        'ปลายทาง',
        'ประเภทปลายทาง',
        'จำนวนลิตร',
        'ราคาต่อลิตร',
        'จำนวนเงิน',
        'ผู้ทำรายการ',
        'หน่วยปฏิบัติการ',
        'Timestamp'
    ];
    
    let csvContent = headers.join(',') + '\n';
    
    transactionLogs.forEach(log => {
        const row = [
            log.id,
            log.date,
            log.time,
            log.transactionType === 'refill' ? 'ซื้อจาก ปตท.' : 'จ่ายออก',
            log.sourceName,
            log.destinationName || '',
            log.destinationType || '',
            log.liters,
            log.pricePerLiter || '',
            log.totalAmount || '',
            log.operatorName,
            log.operatingUnit,
            log.timestamp
        ];
        csvContent += row.join(',') + '\n';
    });
    
    // ดาวน์โหลดไฟล์
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const now = new Date();
    const filename = `fuel_transactions_${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// เปิดใช้งานฟังก์ชันนี้ผ่าน console (เรียกใช้เมื่อต้องการเท่านั้น)
window.downloadAllTransactions = downloadAllTransactions;

// ฟังก์ชันสำหรับ PTT Purchase Modal
function openPttPurchaseModal() {
    const modal = document.getElementById('pttPurchaseModal');
    
    // Reset form
    document.getElementById('pttPurchaseForm').reset();
    document.getElementById('pttTotalAmount').textContent = '0.00 บาท';
    
    // Clear price fields
    document.getElementById('pttPricePerLiter').value = '';
    document.getElementById('pttPricePerDrum').value = '';
    
    // Event listener for pttOperatingUnit - fetch prices when province is selected
    const operatingUnitSelect = document.getElementById('pttOperatingUnit');
    operatingUnitSelect.onchange = async function() {
        const selectedProvince = this.value.trim();
        if (selectedProvince === '') {
            document.getElementById('pttPricePerLiter').value = '';
            document.getElementById('pttPricePerDrum').value = '';
            return;
        }
        
        console.log('🔍 Selected province:', selectedProvince);
        const prices = await fetchPTTPricesByProvince(selectedProvince);
        
        if (prices.pricePerLiter > 0 || prices.pricePerDrum > 0) {
            document.getElementById('pttPricePerLiter').value = prices.pricePerLiter;
            document.getElementById('pttPricePerDrum').value = prices.pricePerDrum;
            console.log('✅ Prices loaded:', prices);
            calculatePttAmount();
        } else {
            console.warn('⚠️ No prices found for province:', selectedProvince);
            alert('ไม่พบข้อมูลราคาสำหรับจังหวัด: ' + selectedProvince);
        }
    };
    
    // Populate destination dropdown (แท๊งก์, รถ, ถัง 200L)
    const destinationSelect = document.getElementById('pttDestinationSelect');
    destinationSelect.innerHTML = '<option value="">เลือกแหล่งเก็บ</option>';
    
    // กรองเฉพาะแหล่งที่สามารถซื้อเข้าได้ (tank, truck, drum)
    const validDestinations = fuelSources.filter(source => 
        source.type === 'tank' || source.type === 'truck' || source.type === 'drum'
    );
    
    validDestinations.forEach(source => {
        const option = document.createElement('option');
        option.value = source.id;
        option.textContent = source.name;
        option.dataset.type = source.type;
        destinationSelect.appendChild(option);
    });
    
    // ซ่อนฟอร์มทั้งหมดตอนเปิด modal (จนกว่าจะเลือกปลายทาง)
    document.getElementById('pttLitersGroup').style.display = 'none';
    document.getElementById('pttPricePerLiterGroup').style.display = 'none';
    document.getElementById('pttDrumsGroup').style.display = 'none';
    document.getElementById('pttPricePerDrumGroup').style.display = 'none';
    
    // เมื่อเลือกปลายทาง ให้แสดง/ซ่อน input ตามประเภท (ตั้งค่าทุกครั้งที่เปิด modal)
    destinationSelect.onchange = async function() {
        const selectedOption = this.options[this.selectedIndex];
        const destinationType = selectedOption.dataset.type;
        const destinationName = selectedOption.textContent;
        
        console.log('เลือกปลายทาง:', destinationName, 'ประเภท:', destinationType);
        
        // แสดง/ซ่อน input groups
        const litersGroup = document.getElementById('pttLitersGroup');
        const pricePerLiterGroup = document.getElementById('pttPricePerLiterGroup');
        const drumsGroup = document.getElementById('pttDrumsGroup');
        const pricePerDrumGroup = document.getElementById('pttPricePerDrumGroup');
        
        if (destinationType === 'drum') {
            // แสดงฟอร์มสำหรับถัง 200L
            console.log('แสดงฟอร์มถัง 200L');
            litersGroup.style.display = 'none';
            pricePerLiterGroup.style.display = 'none';
            drumsGroup.style.display = 'block';
            pricePerDrumGroup.style.display = 'block';
            
            // ล้างค่า input ลิตร
            document.getElementById('pttLiters').value = '';
            document.getElementById('pttPricePerLiter').value = '';
            document.getElementById('pttLiters').removeAttribute('required');
            document.getElementById('pttPricePerLiter').removeAttribute('required');
            
            // เพิ่ม required สำหรับถัง
            document.getElementById('pttDrums').setAttribute('required', 'required');
            document.getElementById('pttPricePerDrum').setAttribute('required', 'required');
            
            // ดึงราคาจาก location name เมื่อเลือกปลายทาง drum
            console.log('ดึงราคาสำหรับ location:', destinationName);
            const prices = await fetchPTTPricesByLocationName(destinationName);
            if (prices.pricePerDrum > 0) {
                document.getElementById('pttPricePerDrum').value = prices.pricePerDrum.toFixed(2);
                console.log('✅ โหลดราคาสำเร็จ:', prices.pricePerDrum);
            } else {
                console.warn('⚠️ ไม่สามารถดึงราคาสำหรับ:', destinationName);
                document.getElementById('pttPricePerDrum').value = '';
            }
        } else {
            // แสดงฟอร์มสำหรับลิตรปกติ
            console.log('แสดงฟอร์มลิตรปกติ');
            litersGroup.style.display = 'block';
            pricePerLiterGroup.style.display = 'block';
            drumsGroup.style.display = 'none';
            pricePerDrumGroup.style.display = 'none';
            
            // ล้างค่า input ถัง
            document.getElementById('pttDrums').value = '';
            document.getElementById('pttPricePerDrum').value = '';
            document.getElementById('pttDrums').removeAttribute('required');
            document.getElementById('pttPricePerDrum').removeAttribute('required');
            
            // เพิ่ม required สำหรับลิตร
            document.getElementById('pttLiters').setAttribute('required', 'required');
            document.getElementById('pttPricePerLiter').setAttribute('required', 'required');
        }
        
        // คำนวณใหม่
        calculatePttAmount();
    };
    
    modal.style.display = 'block';
    
    // Setup modal controls if not already set
    if (!modal.hasEventListener) {
        const closeBtn = document.querySelector('.close-ptt');
        closeBtn.onclick = function() {
            modal.style.display = 'none';
        };
        
        window.onclick = function(event) {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        };
        
        // Calculate total amount for PTT purchase
        document.getElementById('pttLiters').oninput = calculatePttAmount;
        document.getElementById('pttPricePerLiter').oninput = calculatePttAmount;
        document.getElementById('pttDrums').oninput = calculatePttAmount;
        document.getElementById('pttPricePerDrum').oninput = calculatePttAmount;
        
        // Form submission
        document.getElementById('pttPurchaseForm').onsubmit = function(e) {
            e.preventDefault();
            handlePttPurchaseSubmit();
        };
        
        modal.hasEventListener = true;
    }
}

function calculatePttAmount() {
    const destinationSelect = document.getElementById('pttDestinationSelect');
    const selectedOption = destinationSelect.options[destinationSelect.selectedIndex];
    const destinationType = selectedOption.dataset.type;
    
    let totalAmount = 0;
    
    if (destinationType === 'drum') {
        // คำนวณจากถัง
        const drums = parseFloat(document.getElementById('pttDrums').value) || 0;
        const pricePerDrum = parseFloat(document.getElementById('pttPricePerDrum').value) || 0;
        totalAmount = drums * pricePerDrum;
    } else {
        // คำนวณจากลิตร
        const liters = parseFloat(document.getElementById('pttLiters').value) || 0;
        const pricePerLiter = parseFloat(document.getElementById('pttPricePerLiter').value) || 0;
        totalAmount = liters * pricePerLiter;
    }
    
    document.getElementById('pttTotalAmount').textContent = totalAmount.toFixed(2) + ' บาท';
}

async function handlePttPurchaseSubmit() {
    const operatorName = document.getElementById('pttOperatorName').value.trim();
    const operatingUnit = document.getElementById('pttOperatingUnit').value.trim();
    const destinationId = document.getElementById('pttDestinationSelect').value;
    
    // ดึง Book No. และ Receipt No.
    const bookNo = document.getElementById('pttBookNo').value.trim();
    const receiptNo = document.getElementById('pttReceiptNo').value.trim();
    
    if (!operatorName || !operatingUnit || !destinationId) {
        alert('กรุณากรอกข้อมูลให้ครบถ้วน');
        return;
    }
    
    try {
        setButtonLoading('submitPttPurchase', true);
        showLoading('กำลังบันทึกการซื้อน้ำมัน ปตท...');
        
        // หาแหล่งน้ำมัน ปตท.
        const pttSource = fuelSources.find(source => source.type === 'purchase');
        if (!pttSource) {
            throw new Error('ไม่พบข้อมูลแหล่งน้ำมัน ปตท.');
        }
        
        // หาปลายทาง
        const destination = fuelSources.find(source => source.id === destinationId);
        if (!destination) {
            throw new Error('ไม่พบข้อมูลแหล่งเก็บปลายทาง');
        }
        
        // ดึงราคาจากฟอร์ม (ราคาที่โหลดมาจาก gid=1828300695 ตามจังหวัด)
        const pricePerLiterFromForm = parseFloat(document.getElementById('pttPricePerLiter').value) || 0;
        const pricePerDrumFromForm = parseFloat(document.getElementById('pttPricePerDrum').value) || 0;
        
        // ตรวจสอบว่าราคาถูกโหลดมาแล้ว
        if (pricePerLiterFromForm === 0 && pricePerDrumFromForm === 0) {
            alert('ยังไม่ได้โหลดราคาจากจังหวัด\nกรุณาเลือกจังหวัด (หน่วยปฏิบัติการ) ใหม่');
            return;
        }
        
        let liters, pricePerLiter, totalAmount, drums = null, pricePerDrum = null;
        let displayQuantity, displayPrice;
        
        // ตรวจสอบว่าเป็นถัง 200L หรือไม่
        if (isDrumSource(destination)) {
            // สำหรับถัง 200L
            drums = parseFloat(document.getElementById('pttDrums').value);
            pricePerDrum = pricePerDrumFromForm; // ใช้ราคาจากฟอร์ม (โหลดจากจังหวัด)
            
            if (!drums) {
                alert('กรุณากรอกข้อมูลให้ครบถ้วน');
                return;
            }
            
            // คำนวณลิตรและราคาต่อลิตร
            liters = drumsToLiters(drums);
            totalAmount = drums * pricePerDrum;
            pricePerLiter = totalAmount / liters; // คำนวณราคาต่อลิตรจากราคาต่อถัง (สำหรับคำนวณเท่านั้น)
            
            displayQuantity = `${drums.toLocaleString()} ถัง (${liters.toLocaleString()} ลิตร)`;
            displayPrice = `ราคาต่อถัง: ${pricePerDrum.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} บาท`;
        } else {
            // สำหรับลิตรปกติ
            liters = parseFloat(document.getElementById('pttLiters').value);
            pricePerLiter = pricePerLiterFromForm; // ใช้ราคาจากฟอร์ม (โหลดจากจังหวัด)
            
            if (!liters) {
                alert('กรุณากรอกข้อมูลให้ครบถ้วน');
                return;
            }
            
            totalAmount = liters * pricePerLiter;
            displayQuantity = `${liters.toLocaleString()} ลิตร`;
            displayPrice = `ราคาต่อลิตร: ${pricePerLiter.toLocaleString()} บาท`;
        }
        
        // ตรวจสอบความจุ (ถ้ามี)
        if (destination.capacity !== null) {
            const newStock = destination.currentStock + liters;
            if (newStock > destination.capacity) {
                const available = destination.capacity - destination.currentStock;
                const availableDisplay = isDrumSource(destination) 
                    ? `${litersToDrums(available).toLocaleString()} ถัง (${available.toLocaleString()} ลิตร)`
                    : `${available.toLocaleString()} ลิตร`;
                    
                alert(`ไม่สามารถซื้อเข้าได้\nความจุคงเหลือ: ${availableDisplay}`);
                return;
            }
        }
        
        // อัปเดตสต็อกปลายทาง
        destination.currentStock += liters;
        
        // สร้าง UID สำหรับธุรกรรมนี้
        const transactionUID = generateUID();
        
        // บันทึก log การซื้อ
        const currentDateTime = new Date();
        const logEntry = {
            id: Date.now(),
            uid: transactionUID, // ✅ เพิ่ม UID
            timestamp: currentDateTime.toISOString(),
            date: currentDateTime.toLocaleDateString('th-TH'),
            time: currentDateTime.toLocaleTimeString('th-TH'),
            transactionType: 'refill',
            sourceId: pttSource.id,
            sourceName: pttSource.name,
            source: pttSource.name,
            destinationId: destination.id,
            destinationName: destination.name,
            destination: destination.name,
            destinationType: destination.type,
            liters: liters,
            volume: displayQuantity, // ✅ ส่งข้อมูลที่จัดรูปแบบแล้ว เช่น "5 ถัง (1000 ลิตร)"
            pricePerLiter: pricePerLiter,
            pricePerDrum: pricePerDrum, // ✅ เพิ่มราคาต่อถัง (null ถ้าไม่ใช่ถัง)
            totalAmount: totalAmount,
            operatorName: operatorName,
            operatingUnit: operatingUnit,
            missions: getSelectedMissions(),
            bookNo: bookNo || null, // ✅ เพิ่ม Book No.
            receiptNo: receiptNo || null, // ✅ เพิ่ม Receipt No.
            drums: drums // เก็บจำนวนถังถ้าเป็นถัง 200L
        };
        
        transactionLogs.push(logEntry);
        
        // บันทึกข้อมูล แบบขนาน (Parallel) เพื่อให้เร็ว
        await Promise.all([
            saveInventoryToSheets(),
            logTransactionToSheets(logEntry),
            updatePTTPurchaseVolume(liters)
        ]);
        
        // อัพเดท UI
        showLoading('กำลังอัปเดตหน้าจอ...');
        createFuelCards();
        updateSummary();
        
        // ปิด modal
        document.getElementById('pttPurchaseModal').style.display = 'none';
        hideLoading();
        
        
        // แสดง UID Modal พร้อมข้อมูลธุรกรรม
        showUIDModal({
            uid: transactionUID,
            type: 'ซื้อจาก ปตท.',
            source: pttSource.name,
            destination: destination.name,
            volume: displayQuantity,
            bookNo: bookNo,
            receiptNo: receiptNo,
            operator: operatorName
        });
        
        console.log('✅ ซื้อจาก ปตท. สำเร็จ', logEntry);
        
    } catch (error) {
        console.error('Error in PTT purchase transaction:', error);
        alert(error.message || 'เกิดข้อผิดพลาดในการซื้อจาก ปตท. กรุณาลองใหม่');
        hideLoading();
    } finally {
        setButtonLoading('submitPTTPurchase', false);
    }
}
