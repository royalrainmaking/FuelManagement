/**
 * ========================================
 * ไฟล์ Configuration สำหรับระบบจัดการน้ำมัน
 * ========================================
 * 
 * ไฟล์นี้เก็บการตั้งค่าทั้งหมดของระบบไว้ที่เดียว
 * เพื่อให้ง่ายต่อการจัดการและแก้ไข
 */

// ========================================
// Google Apps Script & Google Sheets Configuration
// ========================================

/**
 * URL ของ Google Apps Script Web App
 * ได้จากการ Deploy Google Apps Script
 */
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx6YNMHhIaMnZhIAsg8GiVxDxnvKymw9PXLchFEEsHsP_Wdc_NWoxKqWFAV1_cqgcy4/exec';

/**
 * Google Sheets ID (ได้จาก URL ของ Google Sheets)
 * Format: https://docs.google.com/spreadsheets/d/{SHEETS_ID}/edit
 */
const GOOGLE_SHEETS_ID = '18EaX2GwcZaPFXzcL0B9T4gFRAOhBXdHqZHm1bMJ8-sE';

/**
 * Google Drive Folder ID สำหรับเก็บรูปภาพ
 * Format: https://drive.google.com/drive/folders/{FOLDER_ID}
 */
const GOOGLE_DRIVE_FOLDER_ID = '14TH9RLs8F1VTewGcc5DWsmWdafmKOjLN';

/**
 * GID ของแต่ละ Sheet (ได้จาก URL เมื่อเปิด Sheet นั้นๆ)
 * Format: https://docs.google.com/spreadsheets/d/{SHEETS_ID}/edit#gid={GID}
 */
const SHEET_GIDS = {
    // Sheet สำหรับเก็บข้อมูล Inventory (แหล่งน้ำมัน)
    INVENTORY: '1942506251',

    // Sheet สำหรับเก็บข้อมูลราคา PTT (จังหวัด-ราคา)
    PTT_PRICES: '1828300695',

    // Sheet สำหรับเก็บ Transaction History
    TRANSACTION_HISTORY: '0', // GID 0 คือ Sheet แรก

    // Sheet สำหรับเก็บข้อมูลงบประมาณที่ได้รับ
    BUDGET: '1669222330' // Sheet "แผนบรู" และแผนอื่นๆ
};

/**
 * ชื่อของแต่ละ Sheet ใน Google Sheets
 */
const SHEET_NAMES = {
    INVENTORY: 'Inventory',
    PRICE_HISTORY: 'Price_History',
    TRANSACTION_HISTORY: 'Transaction_History',
    BUDGET: 'Budget'
};

// ========================================
// Admin Configuration
// ========================================

/**
 * รหัสผ่านสำหรับเข้าถึงหน้า Price Management
 * ⚠️ ในระบบจริงควรเก็บไว้ที่ server-side
 */
const ADMIN_PASSWORD = 'admin123';

/**
 * รหัสของแอดมินสำหรับการแก้ไขยอดน้ำมัน
 * ⚠️ ในระบบจริงควรเก็บไว้ที่ server-side
 */
const ADMIN_CODE_FUEL_EDIT = 'admin123';

// ========================================
// Application Settings
// ========================================

/**
 * การตั้งค่าทั่วไปของระบบ
 */
const APP_CONFIG = {
    // ชื่อแอปพลิเคชัน
    APP_NAME: 'ระบบจัดการน้ำมัน',

    // เวอร์ชัน
    VERSION: '1.0.0',

    // จำนวนลิตรต่อถัง 200L
    LITERS_PER_DRUM: 200,

    // Timeout สำหรับการเรียก API (milliseconds)
    API_TIMEOUT: 30000,

    // จำนวนรายการต่อหน้าในตาราง
    ITEMS_PER_PAGE: 10
};

// ========================================
// LINE Notification Configuration
// ========================================

const LINE_CONFIG = {
    // LINE Channel Access Token
    // ได้จาก https://developers.line.biz/console/
    CHANNEL_ACCESS_TOKEN: 'Ts3qJEyllswxdeuw+EJP8JToU0YygwxcfKkvkwIA6J1PxGYo1DzkQoem2TwBvhfKuk3dvthfEM7ItJDJjZJI1GINn6TyjRpPD6428bZrFRJDiGgq6Cwz4PIgs/8NsDCbdle9fvMf0ispJucL45SVowdB04t89/1O/w1cDnyilFU=',

    // LINE Group ID - กลุ่มที่จะส่งแจ้งเตือน
    GROUP_ID: 'C724f2ac2b1c9c41f24a9127726ef947a',

    // Delay ระหว่าง notification (milliseconds)
    // เพื่อป้องกัน spam
    NOTIFICATION_DELAY: 1000,  // 1 วินาที

    // LINE Messaging API Endpoint
    LINE_API_URL: 'https://api.line.me/v2/bot/message/push',

    // เปิด/ปิดการส่ง notification
    ENABLED: false
};

/**
 * ฟังก์ชันสำหรับแปลง URL ของ Google Drive เป็น URL สำหรับแสดงผลรูปภาพ
 * @param {string} googleDriveUrl - URL เดิมจาก Google Drive
 * @returns {string} - URL ที่แปลงแล้วสำหรับแสดงผล
 */
function convertGoogleDriveUrl(googleDriveUrl) {
    if (!googleDriveUrl) return '';

    // หากเป็น URL ที่ถูกต้องอยู่แล้วไม่ต้องแปลง
    if (googleDriveUrl.includes('lh3.googleusercontent.com')) return googleDriveUrl;

    let fileId = '';

    if (googleDriveUrl.includes('/d/')) {
        const match = googleDriveUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
        fileId = match ? match[1] : '';
    } else if (googleDriveUrl.includes('id=')) {
        const match = googleDriveUrl.match(/id=([a-zA-Z0-9-_]+)/);
        fileId = match ? match[1] : '';
    }

    if (!fileId) {
        return googleDriveUrl;
    }

    // Use lh3.googleusercontent.com for better image embedding support
    return `https://lh3.googleusercontent.com/d/${fileId}`;
}

// ========================================
// Export Configuration
// ========================================
// ทำให้ตัวแปรเหล่านี้สามารถใช้งานได้ในไฟล์อื่นๆ
if (typeof module !== 'undefined' && module.exports) {
    // สำหรับ Node.js environment
    module.exports = {
        GOOGLE_SCRIPT_URL,
        GOOGLE_SHEETS_ID,
        GOOGLE_DRIVE_FOLDER_ID,
        SHEET_GIDS,
        SHEET_NAMES,
        ADMIN_PASSWORD,
        APP_CONFIG,
        LINE_CONFIG
    };
}