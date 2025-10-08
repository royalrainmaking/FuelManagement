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
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxne2hk6ZH7crHUPHcB2ONYrm6rVr_031Q3I2wSj-Rh5j9vHSlqoexVdIayRRAR7ZNE/exec';

/**
 * Google Sheets ID (ได้จาก URL ของ Google Sheets)
 * Format: https://docs.google.com/spreadsheets/d/{SHEETS_ID}/edit
 */
const GOOGLE_SHEETS_ID = '18EaX2GwcZaPFXzcL0B9T4gFRAOhBXdHqZHm1bMJ8-sE';

/**
 * GID ของแต่ละ Sheet (ได้จาก URL เมื่อเปิด Sheet นั้นๆ)
 * Format: https://docs.google.com/spreadsheets/d/{SHEETS_ID}/edit#gid={GID}
 */
const SHEET_GIDS = {
    // Sheet สำหรับเก็บข้อมูล Inventory (แหล่งน้ำมัน)
    INVENTORY: '1942506251',
    
    // Sheet สำหรับเก็บประวัติราคา
    PRICE_HISTORY: '1959869787',
    
    // Sheet สำหรับเก็บ Transaction History
    TRANSACTION_HISTORY: '0' // GID 0 คือ Sheet แรก
};

/**
 * ชื่อของแต่ละ Sheet ใน Google Sheets
 */
const SHEET_NAMES = {
    INVENTORY: 'Inventory',
    PRICE_HISTORY: 'Price_History',
    TRANSACTION_HISTORY: 'Transaction_History'
};

// ========================================
// Admin Configuration
// ========================================

/**
 * รหัสผ่านสำหรับเข้าถึงหน้า Price Management
 * ⚠️ ในระบบจริงควรเก็บไว้ที่ server-side
 */
const ADMIN_PASSWORD = 'admin123';

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
// Export Configuration
// ========================================
// ทำให้ตัวแปรเหล่านี้สามารถใช้งานได้ในไฟล์อื่นๆ
if (typeof module !== 'undefined' && module.exports) {
    // สำหรับ Node.js environment
    module.exports = {
        GOOGLE_SCRIPT_URL,
        GOOGLE_SHEETS_ID,
        SHEET_GIDS,
        SHEET_NAMES,
        ADMIN_PASSWORD,
        APP_CONFIG
    };
}