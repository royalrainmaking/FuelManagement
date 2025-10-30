# Manual Testing Guide - Daily Balance Confirmation Feature

## Overview
This guide provides step-by-step instructions for manually testing the Daily Balance Confirmation feature to verify that data is properly saved to Google Sheets (gid=1512968674).

---

## Prerequisites
- Development server running on `http://localhost:3000`
- Access to the Google Sheets with ID: `18EaX2GwcZaPFXzcL0B9T4gFRAOhBXdHqZHm1bMJ8-sE`
- Sheet with GID `1512968674` exists (Daily Confirmation sheet)
- Browser with Developer Tools (F12)

---

## Testing Steps

### Step 1: Start the Application
```bash
npm start
# Server should run on http://localhost:3000
```

### Step 2: Open Application in Browser
1. Navigate to `http://localhost:3000`
2. Wait for the page to fully load (inventory table should be visible)

### Step 3: Open Browser Developer Console
1. Press `F12` to open Developer Tools
2. Go to the **Console** tab
3. Keep this open to monitor API requests and logs

### Step 4: Locate Daily Confirmation Button
1. In the inventory table, look for buttons labeled **"ยืนยันยอดคงเหลือรายวัน"** (Confirm Daily Balance)
2. Each fuel source should have a corresponding button
3. Note the button should be visible if not already confirmed today

### Step 5: Click the Confirmation Button
1. Click on the **"ยืนยันยอดคงเหลือรายวัน"** button for any fuel source
2. A modal dialog should appear with the title **"ยืนยันยอดคงเหลือรายวัน"**

### Step 6: Fill in Operator Name
1. In the modal, find the text input field for **"ชื่อผู้ปฏิบัติการ"** (Operator Name)
2. Enter an operator name (e.g., "ผู้ทดสอบระบบ")
3. Click the **"บันทึก"** (Save) button

### Step 7: Verify Console Output
In the Developer Console, you should see:
```
📤 ส่งข้อมูลการยืนยัน: {
  date: "Tue Oct 29 2024",
  time: "15:30:45",
  operatorName: "ผู้ทดสอบระบบ",
  sourceName: "PTT",
  sourceId: 1,
  timestamp: 1730210445000
}
```

And:
```
✅ ส่งข้อมูลไปยัง Google Apps Script สำเร็จ
```

### Step 8: Verify API Request in Network Tab
1. Go to the **Network** tab in Developer Tools
2. Refresh the page or look for recent requests
3. Find a request to `script.google.com/macros/s/...`
4. Click on it to view details
5. Check the **URL** contains these parameters:
   - `action=logDailyConfirmation`
   - `sheetsId=18EaX2GwcZaPFXzcL0B9T4gFRAOhBXdHqZHm1bMJ8-sE`
   - `gid=1512968674`
   - `data={...}` (JSON encoded confirmation data)

### Step 9: Check Modal Behavior
After clicking Save:
1. Success alert should appear: **"✅ บันทึกการยืนยันเสร็จแล้ว"**
2. Modal should close automatically
3. The confirmation button should disappear

### Step 10: Verify localStorage
In the Developer Console, run:
```javascript
// Check stored confirmation
localStorage.getItem('confirmed_1')  // 1 = sourceId
localStorage.getItem('lastConfirmationDate')

// You should see today's date in the format: "Tue Oct 29 2024"
```

### Step 11: Verify Google Sheets Data
1. Open Google Sheets: [Daily Confirmation Sheet](https://docs.google.com/spreadsheets/d/18EaX2GwcZaPFXzcL0B9T4gFRAOhBXdHqZHm1bMJ8-sE/edit#gid=1512968674)
2. Look at the sheet with GID 1512968674
3. You should see a new row with:
   - **Column A (วันที่)**: Today's date
   - **Column B (เวลา)**: Confirmation time
   - **Column C (ผู้ทำรายการ)**: Operator name you entered
   - **Column D (แหล่งน้ำมัน)**: Fuel source name (e.g., "PTT")
   - **Column E (Source ID)**: Fuel source ID
   - **Column F (Timestamp)**: Complete timestamp with date and time

---

## Expected API Request Format

The function `submitDailyConfirmation()` should send a GET request with the following structure:

```
GET https://script.google.com/macros/s/AKfycbyNH6R4RwoEJ9sn2tFPBpF_RKBpHlAjdzNQ29Ty4lHb3lI3MgyrOhhmui6LuJuSg3zF/exec?
    action=logDailyConfirmation&
    sheetsId=18EaX2GwcZaPFXzcL0B9T4gFRAOhBXdHqZHm1bMJ8-sE&
    gid=1512968674&
    data={"date":"Tue Oct 29 2024","time":"15:30:45 น.","operatorName":"ผู้ทดสอบระบบ","sourceName":"PTT","sourceId":"1","timestamp":1730210445000}
```

---

## Troubleshooting

### Issue: Button is not visible
**Solution:** The button only appears if:
- The confirmation hasn't been done today
- Check localStorage: if `confirmed_[sourceId]` is set to today's date, the button is hidden
- Clear localStorage and refresh: `localStorage.clear()`

### Issue: Modal doesn't open
**Solution:**
- Check browser console for JavaScript errors
- Verify the button ID matches `btn-[sourceId]`
- Ensure all required DOM elements exist

### Issue: Console shows error connecting to Google Sheets
**Solution:**
- Verify `GOOGLE_SCRIPT_URL` in config.js is correct
- Ensure the Google Apps Script is deployed
- Check that the sheet GID (1512968674) exists in the spreadsheet

### Issue: Modal closes but no data appears in Google Sheets
**Solution:**
- Check browser console for errors
- Verify the API request was sent (Network tab)
- Check Google Apps Script logs for errors
- Ensure the sheet with GID 1512968674 exists

### Issue: "no-cors" request error
**Solution:**
- This is expected behavior - the error in console doesn't prevent the request from being sent
- The backend processes the request successfully despite the CORS limitation
- Verify data in Google Sheets to confirm the request was processed

---

## Testing Multiple Confirmations

1. Clear localStorage: `localStorage.clear()`
2. Refresh the page
3. Repeat Steps 4-11 for different fuel sources
4. Each confirmation should create a new row in the Google Sheet

---

## Automated E2E Testing

To run comprehensive automated tests:

```bash
# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run tests in debug mode
npm run test:debug
```

The E2E tests verify:
- ✅ Modal opens correctly
- ✅ Form validation works
- ✅ API request is sent with correct parameters
- ✅ Data is saved to localStorage
- ✅ Confirmation button is hidden after submission
- ✅ Form is cleared after submission

---

## Success Criteria

✅ Confirmation button appears for each fuel source  
✅ Modal opens when button is clicked  
✅ Operator name input field is present  
✅ Console logs show confirmation data  
✅ API request is sent to Google Apps Script  
✅ No JavaScript errors in console  
✅ Success alert appears after submission  
✅ Modal closes after submission  
✅ Confirmation button disappears  
✅ Data appears in Google Sheets within 1-2 seconds  
✅ localStorage is updated with confirmation date  

---

## Key Files

- **Frontend Logic**: `inventory.js` - `submitDailyConfirmation()` function (lines 3433-3502)
- **Backend Handler**: `google-apps-script.gs` - `logDailyConfirmation()` function (lines 1611-1694)
- **Configuration**: `config.js` - Contains API URLs and Sheet IDs
- **E2E Tests**: `tests/daily-confirmation.spec.js` - Comprehensive test suite
- **Verification Script**: `tests/verify-implementation.js` - Code structure validation

---

## Notes

- The feature uses GET requests with query parameters (no POST body)
- Data is sent as a JSON string in the `data` parameter
- The backend parses the JSON and appends it to the sheet
- Sheet GID (1512968674) is hardcoded and must exist
- Daily confirmation state is tracked in localStorage
- The same operator can confirm multiple sources on the same day