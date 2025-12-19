# Transaction Log Date Fix Summary

## Issue
The date recorded in `Transaction_Log` was not matching Thailand time (UTC+7). It was likely using the script's default timezone (often UTC or PDT) or UTC from `toISOString()`.

## Fix Implementation
Modified `google-apps-script.gs` to explicitly use 'Asia/Bangkok' timezone when formatting dates and times.

### Changes
1.  **`logTransaction` function**:
    - Changed date formatting from `toISOString()` (UTC) to `Utilities.formatDate(..., 'Asia/Bangkok', 'yyyy-MM-dd')`.
    - Changed time formatting from `toTimeString()` (Script TZ) to `Utilities.formatDate(..., 'Asia/Bangkok', 'HH:mm:ss')`.

2.  **`getTransactionLogs` function**:
    - Updated date and time parsing to use 'Asia/Bangkok' timezone when reading back from the sheet, ensuring consistency.

3.  **`google-apps-script-transaction-log.js`**:
    - Updated `getTransactionLogs` to use 'Asia/Bangkok' timezone.

## Verification
- When a new transaction is logged, the 'วันที่' (Date) and 'เวลา' (Time) columns will now reflect Thailand time.
- Existing data is not modified, but new entries will be correct.
- Reading data back via the API will also respect Thailand time.
