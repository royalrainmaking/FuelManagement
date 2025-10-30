# 📚 Code Reference - Daily Confirmation Feature

## JavaScript - Key Code Snippets

### 1. Button HTML in Fuel Card
```javascript
// Location: createFuelCards() function in inventory.js (line ~1234)

card.innerHTML = `
    <div class="card-content-wrapper">
        <div class="card-header">
            <!-- ... existing header code ... -->
        </div>
        <div class="fuel-info-section">
            <!-- ... existing info section ... -->
        </div>
        <!-- NEW: Footer with confirmation button -->
        <div class="card-footer-section">
            <button class="btn-confirm-daily" 
                    data-source-id="${source.id}" 
                    data-source-name="${source.name}" 
                    style="display: none;">
                <i class="fas fa-check-circle me-1"></i>ยืนยันยอด
            </button>
        </div>
    </div>
`;

// Setup event listener for the button
const confirmBtn = card.querySelector('.btn-confirm-daily');
confirmBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent opening transaction modal
    openDailyConfirmationModal(source.id, source.name);
});
```

### 2. Button Visibility Function
```javascript
// Location: inventory.js (line ~3380)

function updateDailyConfirmationButtons() {
    const confirmButtons = document.querySelectorAll('.btn-confirm-daily');
    const today = getDateString(new Date());  // e.g., "2024-01-15"
    
    confirmButtons.forEach(btn => {
        const sourceId = btn.getAttribute('data-source-id');
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

// Call on page load and every 60 seconds
setInterval(updateDailyConfirmationButtons, 60000);
```

### 3. Date String Helper
```javascript
// Location: inventory.js (line ~3400)

function getDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;  // Returns: "2024-01-15"
}
```

### 4. Midnight Transition Check
```javascript
// Location: inventory.js (line ~3411)

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

// Check every 60 seconds for midnight
setInterval(checkMidnightTransition, 60000);
```

### 5. Open Modal Dialog
```javascript
// Location: inventory.js (line ~3431)

function openDailyConfirmationModal(sourceId, sourceName) {
    let modal = document.getElementById('dailyConfirmationModal');
    
    if (!modal) {
        // Create modal dynamically
        modal = document.createElement('div');
        modal.id = 'dailyConfirmationModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px;">
                <span class="close" onclick="closeDailyConfirmationModal()">&times;</span>
                <h3 style="margin-bottom: 1.5rem;">ยืนยันยอด</h3>
                
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label for="dailyConfirmOperator" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">
                        ชื่อผู้ทำรายการ:
                    </label>
                    <input type="text" id="dailyConfirmOperator" placeholder="กรุณากรอกชื่อ" 
                           style="width: 100%; padding: 0.75rem; border: 1px solid #ccc; border-radius: 4px;">
                </div>
                
                <div id="dailyConfirmSourceInfo" style="background: #f5f5f5; padding: 1rem; border-radius: 4px; margin-bottom: 1rem;">
                    <small style="color: #666;">แหล่งน้ำมัน: <strong id="dailyConfirmSourceName">-</strong></small>
                </div>
                
                <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                    <button onclick="closeDailyConfirmationModal()" class="btn btn-secondary">ยกเลิก</button>
                    <button onclick="submitDailyConfirmation()" class="btn btn-primary">
                        <i class="fas fa-check me-1"></i>ยืนยัน
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeDailyConfirmationModal();
        });
    }
    
    // Store current data globally
    window.currentDailyConfirmation = {
        sourceId: sourceId,
        sourceName: sourceName
    };
    
    // Update modal content
    document.getElementById('dailyConfirmSourceName').textContent = sourceName;
    document.getElementById('dailyConfirmOperator').value = '';
    document.getElementById('dailyConfirmOperator').focus();
    
    // Show modal
    modal.style.display = 'block';
}
```

### 6. Submit Confirmation
```javascript
// Location: inventory.js (line ~3484)

async function submitDailyConfirmation() {
    const operatorName = document.getElementById('dailyConfirmOperator').value.trim();
    
    if (!operatorName) {
        alert('กรุณากรอกชื่อผู้ทำรายการ');
        return;
    }
    
    try {
        // Prepare data
        const confirmData = {
            sourceId: window.currentDailyConfirmation.sourceId,
            sourceName: window.currentDailyConfirmation.sourceName,
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
            
            // Update buttons (hide the button)
            updateDailyConfirmationButtons();
            
            // Show success message
            alert('✅ ยืนยันยอดสำเร็จ!');
        } else {
            console.error('❌ Error:', result.error);
            alert('เกิดข้อผิดพลาด: ' + result.error);
        }
    } catch (error) {
        console.error('❌ Error sending data:', error);
        alert('เกิดข้อผิดพลาดในการส่งข้อมูล');
    }
}
```

---

## CSS - Styling

### 1. Card Footer Section
```css
/* Location: inventory-style.css (line ~922) */

.card-footer-section {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid rgba(227, 232, 237, 0.5);
}
```

### 2. Confirmation Button
```css
/* Location: inventory-style.css (line ~930) */

.btn-confirm-daily {
    flex: 1;
    padding: 0.65rem 0.75rem;
    border: none;
    border-radius: 8px;
    background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
    color: white;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    box-shadow: 0 2px 8px rgba(39, 174, 96, 0.3);
    letter-spacing: 0.2px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    position: relative;
    overflow: hidden;
}

/* Shimmer effect on hover */
.btn-confirm-daily::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    transform: rotate(45deg);
    transition: all 0.6s ease;
}

/* Hover state */
.btn-confirm-daily:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(39, 174, 96, 0.4);
    background: linear-gradient(135deg, #229954 0%, #1e8449 100%);
}

.btn-confirm-daily:hover::before {
    left: 100%;
}

/* Active state */
.btn-confirm-daily:active {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(39, 174, 96, 0.2);
}

/* Icon styling */
.btn-confirm-daily i {
    font-size: 0.8rem;
}
```

---

## Google Apps Script

### 1. Add to doGet Switch
```javascript
// Location: google-apps-script.gs (line ~349)

case 'logDailyConfirmation':
    return logDailyConfirmation(e.parameter.data, sheetsId, gid);
```

### 2. Main Function
```javascript
// Location: google-apps-script.gs (line ~1611)

function logDailyConfirmation(dataString, sheetsId, gid) {
  try {
    const confirmationData = JSON.parse(dataString);
    const spreadsheet = SpreadsheetApp.openById(sheetsId);
    
    // Find sheet by GID
    let confirmSheet = null;
    const allSheets = spreadsheet.getSheets();
    for (let i = 0; i < allSheets.length; i++) {
      if (allSheets[i].getSheetId().toString() === gid.toString()) {
        confirmSheet = allSheets[i];
        break;
      }
    }
    
    if (!confirmSheet) {
      throw new Error('Sheet with GID ' + gid + ' not found');
    }
    
    // Create header if sheet is empty
    if (confirmSheet.getLastRow() === 0) {
      confirmSheet.getRange(1, 1, 1, 6).setValues([[
        'วันที่', 'เวลา', 'ผู้ทำรายการ', 'แหล่งน้ำมัน', 'Source ID', 'Timestamp'
      ]]);
      
      const headerRange = confirmSheet.getRange(1, 1, 1, 6);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#27ae60');
      headerRange.setFontColor('#FFFFFF');
      
      confirmSheet.autoResizeColumns(1, 6);
      confirmSheet.setFrozenRows(1);
    }
    
    // Format timestamp
    const timestamp = confirmationData.timestamp ? new Date(confirmationData.timestamp) : new Date();
    const dateStr = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const timeStr = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'HH:mm:ss');
    const timestampStr = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    
    // Append new row
    confirmSheet.appendRow([
      dateStr,                                 // A: Date
      timeStr,                                 // B: Time
      confirmationData.operatorName || '',     // C: Operator
      confirmationData.sourceName || '',       // D: Source
      confirmationData.sourceId || '',         // E: Source ID
      timestampStr                             // F: Timestamp
    ]);
    
    console.log('✅ Saved confirmation:', confirmationData);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'บันทึกการยืนยันยอดสำเร็จ',
        data: {
          date: dateStr,
          time: timeStr,
          operatorName: confirmationData.operatorName,
          sourceName: confirmationData.sourceName
        }
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error in logDailyConfirmation:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Fuel Card                            │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Header: Icon, Name, Type                         │  │
│  │ Info: Stock Display, Progress Tank               │  │
│  │ Footer:                                          │  │
│  │ ┌──────────────────────────────────────────────┐ │  │
│  │ │  [✓ ยืนยันยอด]  ← NEW BUTTON                │ │  │
│  │ └──────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           ↓ (Click)
┌─────────────────────────────────────────────────────────┐
│            Daily Confirmation Modal                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │ ยืนยันยอด                                   [X]  │  │
│  │                                                 │  │
│  │ ชื่อผู้ทำรายการ:                           │  │
│  │ [___________________]                           │  │
│  │                                                 │  │
│  │ แหล่งน้ำมัน: สนามบินนครสวรรค์ แท๊ง 1        │  │
│  │                                                 │  │
│  │ [ยกเลิก]  [ยืนยัน]                           │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           ↓ (Submit)
┌─────────────────────────────────────────────────────────┐
│         Google Apps Script: logDailyConfirmation()      │
│  1. Parse JSON data                                     │
│  2. Find sheet by GID (1512968674)                      │
│  3. Create header if needed                             │
│  4. Format date/time                                    │
│  5. Append new row                                      │
│  6. Return success response                             │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│      Google Sheet (ID: 1512968674)                      │
│  ┌──────────────────────────────────────────────────┐  │
│  │ วันที่ │ เวลา │ ผู้ทำรายการ │ แหล่งน้ำมัน │...│  │
│  ├──────────────────────────────────────────────────┤  │
│  │ 2024-01-15 │ 14:30 │ นาย สมชาย │ แท๊ง 1 │...│  │
│  │ 2024-01-16 │ 09:15 │ นางสาว ณัชชา │ รถบรรทุก │...│  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│           Browser localStorage                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ confirmed_nakhonsawan_tank1: "2024-01-15"       │  │
│  │ lastCheckedDate: "2024-01-15"                   │  │
│  │ ...                                             │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│        Update Button Visibility                         │
│  - Hide button (button.style.display = 'none')         │
│  - Show alert: ✅ ยืนยันยอดสำเร็จ!                  │
│  - Close modal                                         │
└─────────────────────────────────────────────────────────┘
                           ↓
             Button disappears until midnight!
```

---

## Constants Used

### In Frontend (config.js)
```javascript
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/[DEPLOYMENT_ID]/exec';
const GOOGLE_SHEETS_ID = '18EaX2GwcZaPFXzcL0B9T4gFRAOhBXdHqZHm1bMJ8-sE';
const SHEET_GIDS = { ... };
```

### In API Call
```javascript
// Sheet ID for daily confirmations
gid=1512968674

// Action
action=logDailyConfirmation
```

### Date Formats
```javascript
localStorage keys: "YYYY-MM-DD" (e.g., "2024-01-15")
Google Sheets: "YYYY-MM-DD" and "HH:MM:SS"
```

---

## Error Handling

### JavaScript Errors
```javascript
// Missing operator name
if (!operatorName) {
    alert('กรุณากรอกชื่อผู้ทำรายการ');
    return;
}

// Network/API errors
catch (error) {
    console.error('❌ Error sending data:', error);
    alert('เกิดข้อผิดพลาดในการส่งข้อมูล');
}
```

### Google Apps Script Errors
```javascript
try {
    // Find sheet
    if (!confirmSheet) {
        throw new Error('Sheet with GID ' + gid + ' not found');
    }
    
    // Append data
    confirmSheet.appendRow([...]);
} catch (error) {
    console.error('Error:', error);
    return { success: false, error: error.toString() };
}
```

---

**End of Code Reference**