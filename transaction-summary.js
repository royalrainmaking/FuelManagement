/**
 * Transaction Summary Page - JavaScript
 * จัดการข้อมูลและแสดงผลสรุปรายการเดินบัญชี
 */

// ตัวแปรสำเหร็จ
let currentUserRole = 'admin'; // หน้าสรุปรายการให้เห็นทั้งหมด (Admin view)
let allTransactions = [];
let filteredTransactions = [];
let currentPage = 1;
let itemsPerPage = 10;
let isLoadingMore = false;

// DOM Elements
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText = document.getElementById('loadingText');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const transactionsTableBody = document.getElementById('transactionsTableBody');
const totalTransactionsEl = document.getElementById('totalTransactions');
const totalVolumeEl = document.getElementById('totalVolume');
const totalCostEl = document.getElementById('totalCost');
const searchInput = document.getElementById('searchInput');
const sortByFilter = document.getElementById('sortByFilter');
const resetFiltersBtn = document.getElementById('resetFiltersBtn');
const paginationContainer = document.getElementById('paginationContainer');
const paginationInfo = document.getElementById('paginationInfo');
const paginationNav = document.getElementById('paginationNav');
const detailModalContent = document.getElementById('detailModalContent');

// Advanced Filters
const toggleAdvancedFiltersBtn = document.getElementById('toggleAdvancedFilters');
const advancedFiltersPanel = document.getElementById('advancedFiltersPanel');
const sourceFilterContainer = document.getElementById('sourceFilterContainer');
const destinationFilterContainer = document.getElementById('destinationFilterContainer');
const unitFilterContainer = document.getElementById('unitFilterContainer');
const missionFilterContainer = document.getElementById('missionFilterContainer');
const startDateFilter = document.getElementById('startDateFilter');
const endDateFilter = document.getElementById('endDateFilter');

let detailModal = null;
let editModal = null;
let cancelConfirmationModal = null;
let currentTransactionForCancel = null;
let currentTransactionForEdit = null;

/**
 * Initialization
 */
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Bootstrap modal with proper options
    const modalElement = document.getElementById('detailModal');
    if (modalElement && typeof bootstrap !== 'undefined') {
        detailModal = new bootstrap.Modal(modalElement, {
            backdrop: true,
            keyboard: true,
            focus: true
        });
    }
    
    // Initialize Cancel Confirmation Modal
    const cancelConfirmElement = document.getElementById('cancelConfirmationModal');
    if (cancelConfirmElement && typeof bootstrap !== 'undefined') {
        cancelConfirmationModal = new bootstrap.Modal(cancelConfirmElement, {
            backdrop: 'static',
            keyboard: false,
            focus: true
        });
    }
    
    // Initialize Edit Modal
    const editModalElement = document.getElementById('editModal');
    if (editModalElement && typeof bootstrap !== 'undefined') {
        editModal = new bootstrap.Modal(editModalElement, {
            backdrop: 'static',
            keyboard: false,
            focus: true
        });
    }

    loadTransactionData();
    setupEventListeners();
    setupLazyLoading();
});

/**
 * Setup Lazy Loading - โหลดข้อมูลเพิ่มเมื่อสกรอลลงมา
 */
function setupLazyLoading() {
    const transactionTable = document.querySelector('.transaction-table');
    if (!transactionTable) return;
    
    transactionTable.addEventListener('scroll', function() {
        const scrollPosition = transactionTable.scrollTop + transactionTable.clientHeight;
        const isNearBottom = scrollPosition >= transactionTable.scrollHeight - 100;
        
        if (isNearBottom && !isLoadingMore) {
            const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
            if (currentPage < totalPages) {
                isLoadingMore = true;
                setTimeout(() => {
                    currentPage++;
                    renderTable(true);
                    updatePagination();
                    isLoadingMore = false;
                }, 300);
            }
        }
    });
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    searchInput.addEventListener('input', applyFilters);
    sortByFilter.addEventListener('change', applyFilters);
    
    const paymentStatusFilter = document.getElementById('paymentStatusFilter');
    if (paymentStatusFilter) {
        paymentStatusFilter.addEventListener('change', applyFilters);
    }
    
    const itemsPerPageFilter = document.getElementById('itemsPerPageFilter');
    if (itemsPerPageFilter) {
        itemsPerPageFilter.addEventListener('change', (e) => {
            itemsPerPage = parseInt(e.target.value);
            currentPage = 1;
            applyFilters();
        });
    }
    
    resetFiltersBtn.addEventListener('click', resetFilters);
    
    // Advanced Filters
    if (toggleAdvancedFiltersBtn) {
        toggleAdvancedFiltersBtn.addEventListener('click', () => {
            advancedFiltersPanel.style.display = advancedFiltersPanel.style.display === 'none' ? 'block' : 'none';
        });
    }
    
    // Advanced Filter Checkboxes
    sourceFilterContainer.addEventListener('change', applyFilters);
    destinationFilterContainer.addEventListener('change', applyFilters);
    unitFilterContainer.addEventListener('change', applyFilters);
    if (missionFilterContainer) {
        missionFilterContainer.addEventListener('change', applyFilters);
    }
    
    // Date Range Filters
    startDateFilter.addEventListener('change', applyFilters);
    endDateFilter.addEventListener('change', applyFilters);
    
    // Export buttons
    const exportFilteredBtn = document.getElementById('exportFilteredBtn');
    const exportAllBtn = document.getElementById('exportAllBtn');
    const exportInventoryBtn = document.getElementById('exportInventoryBtn');
    
    if (exportFilteredBtn) {
        exportFilteredBtn.addEventListener('click', () => exportToExcel(false));
    }
    if (exportAllBtn) {
        exportAllBtn.addEventListener('click', () => exportToExcel(true));
    }
    if (exportInventoryBtn) {
        exportInventoryBtn.addEventListener('click', exportInventoryToExcel);
    }
    
    // Cancel Transaction Button
    const cancelTransactionBtn = document.getElementById('cancelTransactionBtn');
    if (cancelTransactionBtn) {
        cancelTransactionBtn.addEventListener('click', () => {
            if (currentTransactionForCancel) {
                showCancelConfirmation(currentTransactionForCancel);
            }
        });
    }
    
    // Confirm Cancel Button
    const confirmCancelBtn = document.getElementById('confirmCancelBtn');
    if (confirmCancelBtn) {
        confirmCancelBtn.addEventListener('click', handleCancelConfirm);
    }

    // Save Edit Button
    const saveEditBtn = document.getElementById('saveEditBtn');
    if (saveEditBtn) {
        saveEditBtn.addEventListener('click', handleSaveEdit);
    }

    // Edit Other Mission Checkbox
    const editMissionOther = document.getElementById('editMissionOther');
    if (editMissionOther) {
        editMissionOther.addEventListener('change', function() {
            const otherContainer = document.getElementById('editOtherMissionContainer');
            if (otherContainer) {
                otherContainer.style.display = this.checked ? 'block' : 'none';
                if (this.checked) {
                    document.getElementById('editOtherMissionDetails').focus();
                }
            }
        });
    }
    
}

/**
 * Populate advanced filter options with checkboxes
 */
function populateFilterOptions() {
    const sources = new Set();
    const destinations = new Set();
    const units = new Set();
    const missions = new Set();
    
    allTransactions.forEach(transaction => {
        if (transaction.source_name) sources.add(transaction.source_name);
        if (transaction.destination_name) destinations.add(transaction.destination_name);
        if (transaction.unit) units.add(transaction.unit);
        if (transaction.missions) {
            // Missions can be a comma-separated string
            transaction.missions.split(',').forEach(m => {
                const trimmed = m.trim();
                if (trimmed) missions.add(trimmed);
            });
        }
    });
    
    // Helper function to create checkboxes
    const createCheckboxGroup = (values, containerId) => {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        Array.from(values).sort().forEach((value, index) => {
            const checkboxDiv = document.createElement('div');
            checkboxDiv.className = 'form-check';
            checkboxDiv.style.marginBottom = '8px';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'form-check-input';
            checkbox.id = `${containerId}_${index}`;
            checkbox.value = value;
            
            const label = document.createElement('label');
            label.className = 'form-check-label';
            label.htmlFor = `${containerId}_${index}`;
            label.textContent = value;
            label.style.marginBottom = '0';
            
            checkboxDiv.appendChild(checkbox);
            checkboxDiv.appendChild(label);
            container.appendChild(checkboxDiv);
        });
    };
    
    createCheckboxGroup(sources, 'sourceFilterContainer');
    createCheckboxGroup(destinations, 'destinationFilterContainer');
    createCheckboxGroup(units, 'unitFilterContainer');
    if (missionFilterContainer) {
        createCheckboxGroup(missions, 'missionFilterContainer');
    }
}

/**
 * Load transaction data from sessionStorage cache or Google Apps Script
 */
function loadTransactionData() {
    showLoading(true);
    
    // 💡 ล้าง cache ก่อนเสมอเพื่อให้ได้ข้อมูลล่าสุด (Real-time)
    // หรือตรวจสอบ timestamp ถ้าต้องการประหยัด bandwidth
    // ในที่นี้เราล้างออกเพื่อให้ข้อมูลตรงกับความต้องการ "Real-time" ของผู้ใช้
    sessionStorage.removeItem('transactionLogsCache');
    
    // ดึงข้อมูลจาก API โดยตรง
    const url = `${GOOGLE_SCRIPT_URL}?action=getTransactionLogs&sheetsId=${GOOGLE_SHEETS_ID}&gid=${SHEET_GIDS.TRANSACTION_HISTORY}`;
    
    console.log('Loading transactions from API:', url);
    
    fetch(url)
        .then(response => {
            console.log('Response status:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Data received from API:', data);
            if (data.success && data.data && Array.isArray(data.data)) {
                console.log('Successfully loaded', data.data.length, 'transactions from API');
                allTransactions = data.data;
                filteredTransactions = [...allTransactions];
                populateFilterOptions();
                applyFilters();
            } else {
                console.error('Invalid data format:', data);
                showError('ไม่สามารถโหลดข้อมูลได้: ' + (data.error || 'ข้อมูลไม่ถูกต้อง'));
            }
        })
        .catch(error => {
            console.error('Error loading transactions:', error);
            showError('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + error.message);
        })
        .finally(() => {
            showLoading(false);
        });
}

/**
 * Apply filters and sorting
 */
function applyFilters() {
    // Get all filter values
    const searchText = searchInput.value.toLowerCase();
    const selectedSources = Array.from(sourceFilterContainer.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
    const selectedDestinations = Array.from(destinationFilterContainer.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
    const selectedUnits = Array.from(unitFilterContainer.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
    const selectedMissions = missionFilterContainer ? Array.from(missionFilterContainer.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value) : [];
    const startDate = startDateFilter.value;
    const endDate = endDateFilter.value;
    const sortBy = sortByFilter.value;
    const paymentStatus = document.getElementById('paymentStatusFilter').value;

    filteredTransactions = allTransactions.filter(transaction => {
        // Payment status filter
        let matchesPaymentStatus = true;
        
        // Auto-check logic: non-PTT purchase is considered paid
        const type = transaction.transaction_type || '';
        const isPTTPurchase = type.includes('ซื้อจาก ปตท.') || type.includes('จัดซื้อจาก ปตท.');
        const isActuallyPaid = transaction.is_paid === true || transaction.is_paid === 'true' || transaction.is_paid === 'YES';
        const effectivePaidStatus = !isPTTPurchase || isActuallyPaid;

        if (paymentStatus === 'paid') {
            matchesPaymentStatus = effectivePaidStatus;
        } else if (paymentStatus === 'unpaid') {
            matchesPaymentStatus = !effectivePaidStatus;
        }

        // Search filter
        const paidStatusText = effectivePaidStatus ? 'เบิกจ่ายแล้ว' : 'ยังไม่เบิกจ่าย';
        const matchesSearch = !searchText || 
            transaction.source_name.toLowerCase().includes(searchText) ||
            transaction.destination_name.toLowerCase().includes(searchText) ||
            transaction.operator_name.toLowerCase().includes(searchText) ||
            transaction.transaction_type.toLowerCase().includes(searchText) ||
            paidStatusText.includes(searchText) ||
            (transaction.missions && transaction.missions.toLowerCase().includes(searchText)) ||
            (transaction.uid && transaction.uid.toString().toLowerCase().includes(searchText)) ||
            (transaction.book_no && transaction.book_no.toString().toLowerCase().includes(searchText)) ||
            (transaction.receipt_no && transaction.receipt_no.toString().toLowerCase().includes(searchText));

        // Source filter (multiple selection)
        const matchesSource = selectedSources.length === 0 || 
            selectedSources.includes(transaction.source_name);

        // Destination filter (multiple selection)
        const matchesDestination = selectedDestinations.length === 0 || 
            selectedDestinations.includes(transaction.destination_name);

        // Unit filter (multiple selection)
        const matchesUnit = selectedUnits.length === 0 || 
            selectedUnits.includes(transaction.unit);

        // Mission filter (multiple selection)
        let matchesMission = selectedMissions.length === 0;
        if (!matchesMission && transaction.missions) {
            const rowMissions = transaction.missions.split(',').map(m => m.trim());
            matchesMission = selectedMissions.some(m => rowMissions.includes(m));
        }

        // Date range filter
        const matchesDateRange = (!startDate || !endDate || (transaction.date >= startDate && transaction.date <= endDate));

        return matchesSearch && matchesSource && matchesDestination && matchesUnit && matchesMission && matchesDateRange && matchesPaymentStatus;
    });

    // Apply sorting
    sortTransactions(filteredTransactions, sortBy);

    // Reset to first page
    currentPage = 1;

    // Update display
    updateSummaryStatistics();
    renderTable(false);
    updatePagination();
}

/**
 * Helper function to create datetime string for sorting
 */
function getDateTimeString(transaction) {
    const date = transaction.date || '1900-01-01';
    const time = transaction.time || '00:00:00';
    return `${date} ${time}`;
}

/**
 * Sort transactions (by date and time)
 */
function sortTransactions(transactions, sortBy) {
    switch(sortBy) {
        case 'date_asc':
            transactions.sort((a, b) => new Date(getDateTimeString(a)) - new Date(getDateTimeString(b)));
            break;
        case 'date_desc':
            transactions.sort((a, b) => new Date(getDateTimeString(b)) - new Date(getDateTimeString(a)));
            break;
        case 'volume_asc':
            transactions.sort((a, b) => (parseFloat(a.volume_liters) || 0) - (parseFloat(b.volume_liters) || 0));
            break;
        case 'volume_desc':
            transactions.sort((a, b) => (parseFloat(b.volume_liters) || 0) - (parseFloat(a.volume_liters) || 0));
            break;
        case 'cost_desc':
            transactions.sort((a, b) => b.total_cost - a.total_cost);
            break;
        default:
            transactions.sort((a, b) => new Date(getDateTimeString(b)) - new Date(getDateTimeString(a)));
    }
}

/**
 * Update summary statistics
 */
function updateSummaryStatistics() {
    const totalCount = filteredTransactions.length;
    const totalVolume = filteredTransactions.reduce((sum, t) => sum + (parseFloat(t.volume_liters) || 0), 0);
    const totalCost = filteredTransactions.reduce((sum, t) => sum + t.total_cost, 0);
    
    // Calculate paid/unpaid status
    let paidCount = 0;
    let unpaidCount = 0;
    let paidCost = 0;
    let unpaidCost = 0;

    filteredTransactions.forEach(t => {
        const type = t.transaction_type || '';
        const isPTTPurchase = type.includes('ซื้อจาก ปตท.') || type.includes('จัดซื้อจาก ปตท.');
        const isActuallyPaid = t.is_paid === true || t.is_paid === 'true' || t.is_paid === 'YES';
        const isPaid = !isPTTPurchase || isActuallyPaid;

        if (isPaid) {
            paidCount++;
            paidCost += t.total_cost || 0;
        } else {
            unpaidCount++;
            unpaidCost += t.total_cost || 0;
        }
    });

    totalTransactionsEl.textContent = formatNumber(totalCount);
    totalVolumeEl.textContent = formatNumber(totalVolume);
    totalCostEl.textContent = formatNumber(totalCost);
    
    // Update paid/unpaid elements if they exist
    const totalPaidEl = document.getElementById('totalPaid');
    const totalUnpaidEl = document.getElementById('totalUnpaid');
    
    if (totalPaidEl) {
        totalPaidEl.innerHTML = `<span class="text-primary">${formatNumber(paidCount)}</span> <small class="text-muted" style="font-size: 0.6em;">รายการ</small><br><span class="text-success" style="font-size: 0.8em;">${formatNumber(paidCost)}</span> <small class="text-muted" style="font-size: 0.5em;">บาท</small>`;
    }
    
    if (totalUnpaidEl) {
        totalUnpaidEl.innerHTML = `<span class="text-primary">${formatNumber(unpaidCount)}</span> <small class="text-muted" style="font-size: 0.6em;">รายการ</small><br><span class="text-danger" style="font-size: 0.8em;">${formatNumber(unpaidCost)}</span> <small class="text-muted" style="font-size: 0.5em;">บาท</small>`;
    }
}

// Store transactions for detail view
const transactionStore = {};

/**
 * Render transactions table
 */
function renderTable(isAppend = false) {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageTransactions = filteredTransactions.slice(startIndex, endIndex);

    if (pageTransactions.length === 0 && currentPage === 1) {
        transactionsTableBody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center text-muted py-5">
                    <div class="empty-state">
                        <div class="empty-state-icon">
                            <i class="fas fa-inbox"></i>
                        </div>
                        <p>ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    const rowsHTML = pageTransactions.map((transaction, index) => {
        const transactionId = `trans_${Date.now()}_${index}`;
        transactionStore[transactionId] = transaction;
        
        // Auto-check logic: non-PTT purchase is considered paid
        const type = transaction.transaction_type || '';
        const isPTTPurchase = type.includes('ซื้อจาก ปตท.') || type.includes('จัดซื้อจาก ปตท.');
        const isActuallyPaid = transaction.is_paid === true || transaction.is_paid === 'true' || transaction.is_paid === 'YES';
        const isPaid = !isPTTPurchase || isActuallyPaid;
        const isDisabled = !isPTTPurchase;
        
        return `
            <tr class="${isPaid ? 'row-paid' : ''}">
                <td class="text-center">
                    <input type="checkbox" class="form-check-input payment-status-checkbox" 
                        data-uid="${transaction.uid}" 
                        ${isPaid ? 'checked' : ''} 
                        ${isDisabled ? 'disabled' : ''}
                        onchange="togglePaymentStatus(this, '${transaction.uid}')">
                </td>
                <td><small style="font-family: 'Courier New', monospace; color: #dc3545; font-weight: 600;">${transaction.uid || '-'}</small></td>
                <td><small class="text-muted">${formatDate(transaction.date)}</small></td>
                <td>
                    ${getTransactionTypeBadge(transaction.transaction_type)}
                </td>
                <td><small>${transaction.source_name}</small></td>
                <td><small>${transaction.destination_name}</small></td>
                <td><small class="text-truncate d-inline-block" style="max-width: 120px;" title="${transaction.missions || '-'}">${transaction.missions || '-'}</small></td>
                <td class="text-end">
                    <strong>${formatNumber(transaction.volume)}</strong>
                </td>
                <td class="text-end">
                    <strong>${formatNumber(transaction.total_cost)}</strong>
                </td>
                <td class="table-cell-action">
                    <div style="display: flex; gap: 4px;">
                        <button class="btn btn-sm btn-info btn-detail" onclick="showDetailModal('${transactionId}')" title="ดูรายละเอียด" style="width: 36px; padding: 0.25rem;">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-warning btn-detail" onclick="openEditModal('${transactionId}')" title="แก้ไขรายการ" style="width: 36px; padding: 0.25rem;">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${transaction.image_url ? `
                        <button class="btn btn-sm btn-success btn-detail" onclick="viewImageModal('${transaction.image_url}', '${(transaction.image_filename || '').replace(/'/g, "\\'")}', '${transactionId}')" title="ดูรูปภาพ" style="width: 36px; padding: 0.25rem;">
                            <i class="fas fa-image"></i>
                        </button>
                        ` : ''}
                        <button class="btn btn-sm btn-danger btn-detail" onclick="cancelTransactionByUID('${transaction.uid}')" title="ยกเลิกรายการ" style="width: 36px; padding: 0.25rem;">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    if (isAppend && currentPage > 1) {
        transactionsTableBody.innerHTML += rowsHTML;
    } else {
        transactionsTableBody.innerHTML = rowsHTML;
    }
}

/**
 * Get transaction type badge HTML
 */
function getTransactionTypeBadge(type) {
    const badges = {
        'ซื้อจาก ปตท.': { class: 'badge-purchase', icon: 'fa-shopping-cart' },
        'โอนย้าย': { class: 'badge-transfer', icon: 'fa-exchange-alt' },
        'ใช้งาน': { class: 'badge-usage', icon: 'fa-gas-pump' },
        'อื่นๆ': { class: 'badge-other', icon: 'fa-ellipsis-h' }
    };

    const badge = badges[type] || badges['อื่นๆ'];
    return `<span class="transaction-type-badge ${badge.class}">
        <i class="fas ${badge.icon} me-1"></i>${type}
    </span>`;
}

/**
 * Open edit modal and populate data
 */
function openEditModal(transactionId) {
    const transaction = transactionStore[transactionId];
    if (!transaction) return;

    currentTransactionForEdit = transaction;
    
    // Set UID and Cost
    document.getElementById('editUid').value = transaction.uid;
    document.getElementById('editUidDisplay').textContent = transaction.uid;
    document.getElementById('editVolume').value = parseFloat(transaction.volume_liters) || parseFloat(transaction.volume) || 0;
    document.getElementById('editTotalCost').value = transaction.total_cost || 0;
    
    // Set Missions
    const missions = (transaction.missions || '').split(',').map(m => m.trim());
    const checkboxes = document.querySelectorAll('.mission-checkbox');
    const otherMissionDetails = document.getElementById('editOtherMissionDetails');
    const otherMissionContainer = document.getElementById('editOtherMissionContainer');
    
    let otherMissions = [];
    
    // Reset all checkboxes first
    checkboxes.forEach(cb => cb.checked = false);
    if (otherMissionContainer) otherMissionContainer.style.display = 'none';
    if (otherMissionDetails) otherMissionDetails.value = '';

    // Standard missions defined in checkboxes
    const standardMissions = ['บินบริการ', 'ปฏิบัติการฝนหลวง', 'ดัดแปลงสภาพอากาศ (ฝุ่น)', 'ดัดแปลงสภาพอากาศ (ลูกเห็บ)', 'บินสำรวจ', 'บินทดสอบ'];

    missions.forEach(mission => {
        if (!mission) return;
        
        let matched = false;
        checkboxes.forEach(cb => {
            if (cb.value === mission) {
                cb.checked = true;
                matched = true;
            }
        });
        
        if (!matched && mission) {
            otherMissions.push(mission);
        }
    });

    if (otherMissions.length > 0) {
        document.getElementById('editMissionOther').checked = true;
        if (otherMissionContainer) otherMissionContainer.style.display = 'block';
        if (otherMissionDetails) otherMissionDetails.value = otherMissions.join(', ');
    }

    if (editModal) {
        editModal.show();
    }
}

/**
 * Handle saving edited transaction
 */
function handleSaveEdit() {
    const uid = document.getElementById('editUid').value;
    const volume = parseFloat(document.getElementById('editVolume').value) || 0;
    const totalCost = parseFloat(document.getElementById('editTotalCost').value) || 0;
    
    // Collect missions
    const selectedMissions = [];
    document.querySelectorAll('.mission-checkbox:checked').forEach(cb => {
        if (cb.value !== 'อื่นๆ') {
            selectedMissions.push(cb.value);
        }
    });
    
    const otherMissionChecked = document.getElementById('editMissionOther').checked;
    const otherDetails = document.getElementById('editOtherMissionDetails').value.trim();
    if (otherMissionChecked && otherDetails) {
        selectedMissions.push(otherDetails);
    }
    
    const missionsString = selectedMissions.join(', ');

    // Hide edit modal immediately
    if (editModal) editModal.hide();

    // Show loading with progress
    showLoading(true, 'กำลังบันทึกข้อมูล...', 30);

    // Call API to update
    const url = `${GOOGLE_SCRIPT_URL}?action=updateTransactionDetail&sheetsId=${GOOGLE_SHEETS_ID}&uid=${uid}&volume=${volume}&totalCost=${totalCost}&missions=${encodeURIComponent(missionsString)}`;

    console.log('Updating transaction detail:', url);

    // Simulated progress jump
    setTimeout(() => showLoading(true, 'กำลังส่งข้อมูลไปที่ Google Sheets...', 60), 500);

    fetch(url)
        .then(response => response.json())
        .then(data => {
            showLoading(true, 'ประมวลผลสำเร็จ...', 100);
            setTimeout(() => {
                if (data.success) {
                // Update local data
                const index = allTransactions.findIndex(t => t.uid === uid);
                if (index !== -1) {
                    allTransactions[index].volume = volume;
                    allTransactions[index].volume_liters = volume;
                    allTransactions[index].total_cost = totalCost;
                    allTransactions[index].missions = missionsString;
                }
                
                // Refresh table
                applyFilters();
                
                // Hide loading overlay
                showLoading(false);
            } else {
                showLoading(false);
                alert('เกิดข้อผิดพลาด: ' + (data.error || 'ไม่สามารถบันทึกข้อมูลได้'));
            }
        }, 500);
        })
        .catch(error => {
            console.error('Error updating transaction:', error);
            showLoading(false);
            alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + error.message);
        });
}

/**
 * Show detail modal
 */
function showDetailModal(transactionId) {
    try {
        // Get transaction from store
        let transaction = transactionStore[transactionId];
        
        if (!transaction) {
            console.error('Transaction not found:', transactionId);
            alert('ไม่พบข้อมูลรายการนี้');
            return;
        }
        
        // Store current transaction for cancel functionality
        currentTransactionForCancel = transaction;

        const detailsHTML = `
            <div style="position: relative; text-align: center; padding: 10px 20px 20px 20px; background: #fafbfc; overflow-y: auto; max-height: 90vh;">
                <!-- Close Button -->
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" style="position: absolute; right: 20px; top: 20px; z-index: 10;"></button>

                <!-- Transaction ID Display - Styled like Success Modal -->
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 15px; margin-bottom: 25px; margin-top: 20px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.25);">
                    <div style="color: rgba(255,255,255,0.8); font-size: 0.9rem; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px;">Transaction ID</div>
                    <div style="color: white; font-size: 2.2rem; font-weight: bold; letter-spacing: 3px; font-family: 'Courier New', monospace;">
                        ${transaction.uid || '-'}
                    </div>
                </div>
                
                <!-- Transaction Summary Details - Structured Rows -->
                <div style="background: white; padding: 20px; border-radius: 12px; text-align: left; border: 1px solid #e9ecef; box-shadow: 0 2px 10px rgba(0,0,0,0.02);">
                    <h5 style="margin-bottom: 20px; color: #2c3e50; font-weight: 700; display: flex; align-items: center; gap: 10px; border-bottom: 2px solid #f8f9fa; padding-bottom: 12px;">
                        <i class="fas fa-file-alt text-primary"></i>รายละเอียดรายการ
                    </h5>
                    
                    <div style="display: grid; gap: 2px;">
                        <!-- Row: Date & Time -->
                        <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f1f3f5;">
                            <span style="color: #6c757d; font-weight: 500;"><i class="fas fa-calendar-alt me-2" style="width: 18px;"></i>วันที่/เวลา:</span>
                            <strong style="color: #2c3e50;">${formatDate(transaction.date)} ${transaction.time || ''}</strong>
                        </div>

                        <!-- Row: Type -->
                        <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f1f3f5;">
                            <span style="color: #6c757d; font-weight: 500;"><i class="fas fa-tag me-2" style="width: 18px;"></i>ประเภท:</span>
                            <strong>${getTransactionTypeBadge(transaction.transaction_type)}</strong>
                        </div>

                        <!-- Row: Source -->
                        <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f1f3f5;">
                            <span style="color: #6c757d; font-weight: 500;"><i class="fas fa-sign-out-alt me-2" style="width: 18px;"></i>แหล่งที่มา/ต้นทาง:</span>
                            <strong style="color: #2c3e50;">${transaction.source_name}</strong>
                        </div>

                        <!-- Row: Destination -->
                        <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f1f3f5;">
                            <span style="color: #6c757d; font-weight: 500;"><i class="fas fa-sign-in-alt me-2" style="width: 18px;"></i>ปลายทาง:</span>
                            <strong style="color: #2c3e50;">${transaction.destination_name}</strong>
                        </div>

                        <!-- Row: Volume -->
                        <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f1f3f5; background: #f8fbff; margin: 4px -10px; padding: 12px 10px; border-radius: 8px;">
                            <span style="color: #0d6efd; font-weight: 600;"><i class="fas fa-gas-pump me-2" style="width: 18px;"></i>ปริมาณ:</span>
                            <strong style="color: #0d6efd; font-size: 1.2rem;">${formatNumber(transaction.volume_liters)} <span style="font-size: 0.9rem; font-weight: 500;">ลิตร</span></strong>
                        </div>

                        <!-- Row: Price/Liter -->
                        ${transaction.price_per_liter ? `
                        <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f1f3f5;">
                            <span style="color: #6c757d; font-weight: 500;"><i class="fas fa-coins me-2" style="width: 18px;"></i>ราคาต่อลิตร:</span>
                            <strong style="color: #2c3e50;">${formatNumber(transaction.price_per_liter)} บาท</strong>
                        </div>
                        ` : ''}

                        <!-- Row: Total Cost -->
                        <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f1f3f5; background: #fffaf0; margin: 4px -10px; padding: 12px 10px; border-radius: 8px;">
                            <span style="color: #b8860b; font-weight: 600;"><i class="fas fa-money-bill-wave me-2" style="width: 18px;"></i>มูลค่ารวม:</span>
                            <strong style="color: #b8860b; font-size: 1.2rem;">${formatNumber(transaction.total_cost)} <span style="font-size: 0.9rem; font-weight: 500;">บาท</span></strong>
                        </div>

                        <!-- Row: Operator -->
                        <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f1f3f5;">
                            <span style="color: #6c757d; font-weight: 500;"><i class="fas fa-user-edit me-2" style="width: 18px;"></i>ผู้บันทึก:</span>
                            <strong style="color: #2c3e50;">${transaction.operator_name || '-'}</strong>
                        </div>

                        <!-- Row: Unit -->
                        ${transaction.unit ? `
                        <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f1f3f5;">
                            <span style="color: #6c757d; font-weight: 500;"><i class="fas fa-building me-2" style="width: 18px;"></i>หน่วย:</span>
                            <strong style="color: #2c3e50;">${transaction.unit}</strong>
                        </div>
                        ` : ''}

                        <!-- Row: Mission -->
                        ${transaction.missions ? `
                        <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f1f3f5;">
                            <span style="color: #6c757d; font-weight: 500;"><i class="fas fa-tasks me-2" style="width: 18px;"></i>ภารกิจ:</span>
                            <strong style="color: #2c3e50;">${transaction.missions}</strong>
                        </div>
                        ` : ''}

                        <!-- Row: Book/Receipt -->
                        ${(transaction.book_no || transaction.receipt_no) ? `
                        <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f1f3f5;">
                            <span style="color: #6c757d; font-weight: 500;"><i class="fas fa-file-invoice me-2" style="width: 18px;"></i>เลขเอกสาร:</span>
                            <strong style="color: #2c3e50;">${transaction.book_no ? 'เล่มที่ ' + transaction.book_no : ''} ${transaction.receipt_no ? 'เลขที่ ' + transaction.receipt_no : ''}</strong>
                        </div>
                        ` : ''}

                        <!-- Row: Notes -->
                        ${transaction.notes ? `
                        <div style="display: flex; flex-direction: column; padding: 12px 0;">
                            <span style="color: #6c757d; font-weight: 500; margin-bottom: 5px;"><i class="fas fa-sticky-note me-2" style="width: 18px;"></i>หมายเหตุ:</span>
                            <div style="background: #f8f9fa; padding: 10px; border-radius: 6px; color: #495057; font-size: 0.95rem; border-left: 3px solid #dee2e6;">${transaction.notes}</div>
                        </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Image Section if available -->
                ${transaction.image_url ? `
                <div style="margin-top: 25px; background: white; padding: 20px; border-radius: 12px; border: 1px solid #e9ecef; text-align: left;">
                    <h5 style="margin-bottom: 15px; color: #2c3e50; font-weight: 700; display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-image text-success"></i>รูปภาพหลักฐาน
                    </h5>
                    <div style="border-radius: 10px; overflow: hidden; border: 1px solid #f1f3f5;">
                        <img src="${convertGoogleDriveUrl(transaction.image_url)}" alt="เอกสาร" style="width: 100%; height: auto; display: block; cursor: pointer;" onclick="viewImageModal('${transaction.image_url}', '${(transaction.image_filename || '').replace(/'/g, "\\'")}', '${transactionId}')">
                    </div>
                    <div style="margin-top: 10px; font-size: 0.85rem; color: #6c757d; display: flex; justify-content: space-between;">
                        <span><i class="fas fa-file me-1"></i>${transaction.image_filename || 'image.jpg'}</span>
                        <span><i class="fas fa-clock me-1"></i>${transaction.image_upload_date ? new Date(transaction.image_upload_date).toLocaleDateString('th-TH') : ''}</span>
                    </div>
                </div>
                ` : ''}

                <!-- Action Buttons - Matching UID Modal -->
                <div style="display: flex; gap: 10px; justify-content: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #f1f3f5;">
                    <button class="btn btn-primary" style="padding: 10px 20px; border-radius: 10px; font-weight: 600;" onclick="copyToClipboard('${transaction.uid}')">
                        <i class="fas fa-copy me-2"></i>คัดลอก UID
                    </button>
                    <button class="btn btn-secondary" style="padding: 10px 20px; border-radius: 10px; font-weight: 600;" onclick="printTransactionReceipt('${transactionId}')">
                        <i class="fas fa-print me-2"></i>พิมพ์
                    </button>
                    <button class="btn btn-success" style="padding: 10px 20px; border-radius: 10px; font-weight: 600;" data-bs-dismiss="modal">
                        <i class="fas fa-check me-2"></i>เสร็จสิ้น
                    </button>
                    
                    <!-- Cancel Button -->
                    <button class="btn btn-danger" id="modalCancelBtn" style="display: inline-block; padding: 10px 20px; border-radius: 10px; font-weight: 600;" onclick="cancelTransactionByUID('${transaction.uid}')">
                        <i class="fas fa-trash-alt me-2"></i>ยกเลิก
                    </button>
                </div>
            </div>
        `;

        const modalContent = document.getElementById('detailModalContent');
        modalContent.innerHTML = detailsHTML;
        
        // Show modal using Bootstrap
        if (detailModal && typeof detailModal.show === 'function') {
            console.log('Showing modal using existing instance');
            detailModal.show();
        } else if (typeof bootstrap !== 'undefined') {
            console.log('Creating new modal instance');
            const modalElement = document.getElementById('detailModal');
            if (modalElement) {
                detailModal = new bootstrap.Modal(modalElement, {
                    backdrop: true,
                    keyboard: true,
                    focus: true
                });
                detailModal.show();
            }
        } else {
            console.error('Bootstrap is not available');
            alert('เกิดข้อผิดพลาดในการแสดงข้อมูล');
        }
    } catch (error) {
        console.error('Error showing detail modal:', error);
        alert('เกิดข้อผิดพลาด: ' + error.message);
    }
}

/**
 * Toggle payment status (เบิกเงินแล้ว)
 */
async function togglePaymentStatus(checkbox, uid) {
    const isChecked = checkbox.checked;
    const statusValue = isChecked ? 'YES' : 'NO';
    
    // Show loading state on the checkbox if possible or use global loading
    checkbox.disabled = true;
    
    try {
        const url = `${GOOGLE_SCRIPT_URL}?action=updateTransactionPaymentStatus&uid=${uid}&status=${statusValue}&sheetsId=${GOOGLE_SHEETS_ID}`;
        
        console.log('Updating payment status:', url);
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            // Update local data
            const transaction = allTransactions.find(t => t.uid === uid);
            if (transaction) {
                transaction.is_paid = statusValue;
            }
            
            // Update row color
            const row = checkbox.closest('tr');
            if (isChecked) {
                row.classList.add('row-paid');
            } else {
                row.classList.remove('row-paid');
            }
            
            console.log('Payment status updated successfully');
        } else {
            throw new Error(data.error || 'Unknown error');
        }
    } catch (error) {
        console.error('Error updating payment status:', error);
        alert('ไม่สามารถบันทึกข้อมูลได้: ' + error.message);
        // Revert checkbox state
        checkbox.checked = !isChecked;
    } finally {
        checkbox.disabled = false;
    }
}

/**
 * Update pagination
 */
function updatePagination() {
    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage + 1;
    const endIndex = Math.min(currentPage * itemsPerPage, filteredTransactions.length);

    paginationInfo.textContent = `แสดงรายการ ${startIndex} - ${endIndex} จาก ${filteredTransactions.length} รายการ`;

    // Generate pagination buttons
    let paginationHTML = '';

    // Previous button
    if (currentPage > 1) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="goToPage(${currentPage - 1}); return false;">
                    <i class="fas fa-chevron-left"></i>
                </a>
            </li>
        `;
    } else {
        paginationHTML += `
            <li class="page-item disabled">
                <a class="page-link" href="#">
                    <i class="fas fa-chevron-left"></i>
                </a>
            </li>
        `;
    }

    // Page numbers
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        if (i === currentPage) {
            paginationHTML += `<li class="page-item active"><a class="page-link" href="#">${i}</a></li>`;
        } else {
            paginationHTML += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="goToPage(${i}); return false;">${i}</a>
                </li>
            `;
        }
    }

    // Next button
    if (currentPage < totalPages) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="goToPage(${currentPage + 1}); return false;">
                    <i class="fas fa-chevron-right"></i>
                </a>
            </li>
        `;
    } else {
        paginationHTML += `
            <li class="page-item disabled">
                <a class="page-link" href="#">
                    <i class="fas fa-chevron-right"></i>
                </a>
            </li>
        `;
    }

    paginationNav.innerHTML = paginationHTML;
}

/**
 * Go to specific page
 */
function goToPage(page) {
    currentPage = page;
    renderTable(false);
    updatePagination();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Reset filters
 */
function resetFilters() {
    searchInput.value = '';
    sortByFilter.value = 'date_desc';
    startDateFilter.value = '';
    endDateFilter.value = '';
    
    const paymentStatusFilter = document.getElementById('paymentStatusFilter');
    if (paymentStatusFilter) {
        paymentStatusFilter.value = 'all';
    }
    
    const itemsPerPageFilter = document.getElementById('itemsPerPageFilter');
    if (itemsPerPageFilter) {
        itemsPerPageFilter.value = '10';
        itemsPerPage = 10;
    }
    
    // Uncheck all checkboxes
    sourceFilterContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    destinationFilterContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    unitFilterContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    if (missionFilterContainer) {
        missionFilterContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    }
    
    currentPage = 1;
    applyFilters();
}

/**
 * Show loading overlay
 */
function showLoading(show, message = 'กำลังโหลด...', progress = null) {
    if (show) {
        loadingOverlay.classList.add('active');
        if (loadingText) loadingText.textContent = message;
        
        if (progress !== null && progressContainer && progressBar) {
            progressContainer.style.display = 'flex';
            progressBar.style.width = progress + '%';
        } else if (progressContainer) {
            progressContainer.style.display = 'none';
        }
    } else {
        loadingOverlay.classList.remove('active');
    }
}

/**
 * Show error message
 */
function showError(message) {
    transactionsTableBody.innerHTML = `
        <tr>
            <td colspan="8" class="text-center text-danger py-4">
                <i class="fas fa-exclamation-circle me-2"></i>
                ${message}
            </td>
        </tr>
    `;
}

/**
 * Format number with thousands separator
 */
function formatNumber(number) {
    if (typeof number !== 'number') {
        number = parseFloat(number) || 0;
    }
    return number.toLocaleString('th-TH', {
        minimumFractionDigits: number % 1 !== 0 ? 2 : 0,
        maximumFractionDigits: 2
    });
}

/**
 * Format date
 */
function formatDate(dateStr) {
    if (!dateStr) return '-';
    
    const date = new Date(dateStr);
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    
    return date.toLocaleDateString('th-TH', options);
}

/**
 * Export transactions to Excel
 * @param {boolean} exportAll - true to export all, false to export filtered only
 */
function exportToExcel(exportAll) {
    try {
        // Determine which data to export
        const dataToExport = exportAll ? allTransactions : filteredTransactions;
        
        if (dataToExport.length === 0) {
            alert('ไม่มีข้อมูลสำหรับการส่งออก');
            return;
        }
        
        // Create header row with all available fields
        const headers = [
            'วันที่',
            'เวลา',
            'ประเภทรายการ',
            'แหล่งน้ำมัน',
            'ปลายทาง',
            'ปริมาณ (ลิตร)',
            'ราคา/ลิตร (บาท)',
            'มูลค่ารวม (บาท)',
            'ผู้บันทึก',
            'หน่วย',
            'สถานะเบิกจ่าย',
            'ประเภทอากาศยาน',
            'เลขทะเบียน',
            'Book No.',
            'Receipt No.',
            'ภารกิจ',
            'หมายเหตุ'
        ];
        
        // Map transaction data to rows (include all detail fields)
        const rows = dataToExport.map(transaction => {
            const type = transaction.transaction_type || '';
            const isPTTPurchase = type.includes('ซื้อจาก ปตท.') || type.includes('จัดซื้อจาก ปตท.');
            const isActuallyPaid = transaction.is_paid === true || transaction.is_paid === 'true' || transaction.is_paid === 'YES';
            const isPaid = !isPTTPurchase || isActuallyPaid;
            
            return [
                formatDate(transaction.date),
                transaction.time || '-',
                transaction.transaction_type,
                transaction.source_name,
                transaction.destination_name,
                transaction.volume,
                transaction.price_per_liter || '-',
                transaction.total_cost,
                transaction.operator_name || '-',
                transaction.unit || '-',
                isPaid ? 'เบิกจ่ายแล้ว' : 'ยังไม่เบิกจ่าย',
                transaction.aircraft_type || '-',
                transaction.aircraft_number || '-',
                transaction.book_no || '-',
                transaction.receipt_no || '-',
                transaction.missions || '-',
                transaction.notes || '-'
            ];
        });
        
        // Add summary row
        const totalVolume = dataToExport.reduce((sum, t) => sum + (parseFloat(t.volume_liters) || 0), 0);
        const totalCost = dataToExport.reduce((sum, t) => sum + t.total_cost, 0);
        const averagePrice = totalVolume > 0 ? (totalCost / totalVolume).toFixed(2) : 0;
        
        let paidCount = 0;
        let unpaidCount = 0;
        let paidCost = 0;
        let unpaidCost = 0;
        
        dataToExport.forEach(t => {
            const type = t.transaction_type || '';
            const isPTTPurchase = type.includes('ซื้อจาก ปตท.') || type.includes('จัดซื้อจาก ปตท.');
            const isActuallyPaid = t.is_paid === true || t.is_paid === 'true' || t.is_paid === 'YES';
            const isPaid = !isPTTPurchase || isActuallyPaid;
            
            if (isPaid) {
                paidCount++;
                paidCost += t.total_cost || 0;
            } else {
                unpaidCount++;
                unpaidCost += t.total_cost || 0;
            }
        });
        
        // Create workbook
        const workbook = XLSX.utils.book_new();
        
        // Create main data sheet
        const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        
        // Add summary section
        const emptyRow = [''];
        const summaryData = [
            emptyRow,
            ['สรุป'],
            ['จำนวนรายการทั้งหมด', dataToExport.length],
            ['ปริมาณรวม (ลิตร)', totalVolume],
            ['มูลค่ารวม (บาท)', totalCost],
            ['เบิกจ่ายแล้ว (รายการ)', paidCount],
            ['เบิกจ่ายแล้ว (บาท)', paidCost],
            ['ยังไม่เบิกจ่าย (รายการ)', unpaidCount],
            ['ยังไม่เบิกจ่าย (บาท)', unpaidCost],
            ['ราคาเฉลี่ย/ลิตร (บาท)', averagePrice]
        ];
        
        // Merge data with summary
        const allRows = [headers, ...rows, ...summaryData];
        const worksheetFinal = XLSX.utils.aoa_to_sheet(allRows);
        
        // Set column widths
        const colWidths = [
            { wch: 12 },  // วันที่
            { wch: 10 },  // เวลา
            { wch: 15 },  // ประเภทรายการ
            { wch: 15 },  // แหล่งน้ำมัน
            { wch: 15 },  // ปลายทาง
            { wch: 15 },  // ปริมาณ
            { wch: 15 },  // ราคา/ลิตร
            { wch: 15 },  // มูลค่ารวม
            { wch: 15 },  // ผู้บันทึก
            { wch: 12 },  // หน่วย
            { wch: 15 },  // สถานะเบิกจ่าย
            { wch: 18 },  // ประเภทอากาศยาน
            { wch: 15 },  // เลขทะเบียน
            { wch: 15 },  // Book No.
            { wch: 15 },  // Receipt No.
            { wch: 30 },  // ภารกิจ
            { wch: 20 }   // หมายเหตุ
        ];
        worksheetFinal['!cols'] = colWidths;
        
        // Add borders and formatting to summary rows
        const summaryStartRow = rows.length + 2;
        for (let i = 0; i < summaryData.length; i++) {
            const rowNum = summaryStartRow + i;
            for (let j = 0; j < 2; j++) {
                const cellAddress = XLSX.utils.encode_cell({ r: rowNum, c: j });
                if (!worksheetFinal[cellAddress]) continue;
                
                // Bold the summary section
                if (worksheetFinal[cellAddress].f === undefined) {
                    worksheetFinal[cellAddress].s = {
                        font: { bold: true },
                        bg: { indexed: 42 }
                    };
                }
            }
        }
        
        // Add sheet to workbook
        XLSX.utils.book_append_sheet(workbook, worksheetFinal, 'Transaction Log');
        
        // Generate filename
        const fileName = exportAll 
            ? `Transaction_All_${new Date().getTime()}.xlsx`
            : `Transaction_Filtered_${new Date().getTime()}.xlsx`;
        
        // Write file
        XLSX.writeFile(workbook, fileName);
        
        console.log(`Export successful: ${fileName}`);
        
    } catch (error) {
        console.error('Export error:', error);
        alert('เกิดข้อผิดพลาดในการส่งออก: ' + error.message);
    }
}

/**
 * Export Fuel Sources (Inventory) to Excel
 */
function exportInventoryToExcel() {
    showLoading(true);
    
    // ดึงข้อมูลจาก API Master Data (แหล่งน้ำมัน)
    const url = `${GOOGLE_SCRIPT_URL}?action=getMasterData&sheetsId=${GOOGLE_SHEETS_ID}&gid=${SHEET_GIDS.INVENTORY}`;
    
    console.log('Fetching inventory data for export:', url);
    
    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            if (data.success && data.data) {
                const inventoryData = data.data;
                
                if (inventoryData.length === 0) {
                    alert('ไม่มีข้อมูลแหล่งน้ำมันสำหรับการส่งออก');
                    return;
                }
                
                // คอลัมน์ B, C, D (ชื่อแหล่งน้ำมัน, ความจุ, ปริมาณคงเหลือ)
                const headers = [
                    'ชื่อแหล่งน้ำมัน',
                    'ความจุ (ลิตร)',
                    'ปริมาณคงเหลือ (ลิตร)'
                ];
                
                // Map data to rows - คัดเลือกเฉพาะ Name, Capacity, Stock
                const rows = inventoryData.map(source => [
                    source.name || source.source_name || '-',
                    source.capacity || '-',
                    parseFloat(source.current_stock) || 0
                ]);
                
                // Create workbook
                const workbook = XLSX.utils.book_new();
                
                // Create worksheet
                const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
                
                // Set column widths
                const colWidths = [
                    { wch: 35 }, // ชื่อแหล่งน้ำมัน
                    { wch: 15 }, // ความจุ
                    { wch: 20 }  // ปริมาณคงเหลือ
                ];
                worksheet['!cols'] = colWidths;
                
                // Add sheet to workbook
                XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');
                
                // Generate filename
                const fileName = `Fuel_Inventory_${new Date().getTime()}.xlsx`;
                
                // Write file
                XLSX.writeFile(workbook, fileName);
                
                console.log(`Inventory export successful: ${fileName}`);
            } else {
                throw new Error(data.error || 'ข้อมูลไม่ถูกต้อง');
            }
        })
        .catch(error => {
            console.error('Inventory export error:', error);
            alert('เกิดข้อผิดพลาดในการส่งออกข้อมูลแหล่งน้ำมัน: ' + error.message);
        })
        .finally(() => {
            showLoading(false);
        });
}

/**
 * View image in fullscreen modal
 */
function viewImageModal(imageUrl, filename, transactionId) {
    try {
        const imageModalImage = document.getElementById('imageModalImage');
        const imageModalTitle = document.getElementById('imageModalTitle');
        const imageModalInfo = document.getElementById('imageModalInfo');
        const imageModalDownloadBtn = document.getElementById('imageModalDownloadBtn');
        
        if (!imageModalImage || !imageModalTitle) {
            console.error('Image modal elements not found');
            return;
        }
        
        // Determine the display URL
        let displayUrl = convertGoogleDriveUrl(imageUrl);
        const transaction = transactionStore[transactionId];
        
        imageModalImage.src = displayUrl;
        imageModalImage.alt = filename || 'รูปภาพรายการ';
        
        imageModalTitle.textContent = filename || 'รูปภาพรายการ';
        
        if (transaction && transaction.image_upload_date) {
            const uploadDate = new Date(transaction.image_upload_date).toLocaleString('th-TH');
            imageModalInfo.textContent = `อัพโหลดเมื่อ: ${uploadDate}`;
        } else {
            imageModalInfo.textContent = '';
        }
        
        imageModalDownloadBtn.href = imageUrl;
        imageModalDownloadBtn.download = filename || 'image.jpg';
        
        const imageModal = new bootstrap.Modal(document.getElementById('imageModal'), {
            backdrop: true,
            keyboard: true
        });
        
        // Setup fullscreen toggle
        const fullscreenToggleBtn = document.getElementById('fullscreenToggleBtn');
        const modalDialog = document.querySelector('#imageModal .modal-dialog');
        const modalBody = document.querySelector('#imageModal .modal-body');
        
        if (fullscreenToggleBtn) {
            // Reset state when modal opens
            modalDialog.classList.remove('modal-fullscreen');
            imageModalImage.style.maxHeight = '70vh';
            fullscreenToggleBtn.innerHTML = '<i class="fas fa-expand"></i>';
            fullscreenToggleBtn.title = 'ขยายเต็มจอ';
            
            // Remove existing event listeners to prevent duplicates
            const newBtn = fullscreenToggleBtn.cloneNode(true);
            fullscreenToggleBtn.parentNode.replaceChild(newBtn, fullscreenToggleBtn);
            
            newBtn.addEventListener('click', function() {
                const isFullscreen = modalDialog.classList.contains('modal-fullscreen');
                
                if (isFullscreen) {
                    modalDialog.classList.remove('modal-fullscreen');
                    imageModalImage.style.maxHeight = '70vh';
                    this.innerHTML = '<i class="fas fa-expand"></i>';
                    this.title = 'ขยายเต็มจอ';
                } else {
                    modalDialog.classList.add('modal-fullscreen');
                    imageModalImage.style.maxHeight = '90vh';
                    this.innerHTML = '<i class="fas fa-compress"></i>';
                    this.title = 'ย่อขนาด';
                }
            });
        }
        
        imageModal.show();
        
    } catch (error) {
        console.error('Error viewing image:', error);
        alert('เกิดข้อผิดพลาดในการแสดงรูปภาพ: ' + error.message);
    }
}



/**
 * Cancel Transaction by UID - finds transaction and shows confirmation modal
 */
function cancelTransactionByUID(uid) {
    try {
        if (!uid || !uid.trim()) {
            showNotification('UID ไม่ถูกต้อง', 'error');
            return;
        }
        
        // Find transaction in allTransactions by UID
        const transaction = allTransactions.find(t => 
            t.uid && t.uid.toString().trim() === uid.trim()
        );
        
        if (!transaction) {
            showNotification('ไม่พบข้อมูลรายการที่ต้องการยกเลิก (UID: ' + uid + ')', 'error');
            return;
        }
        
        // Store for later use and show confirmation
        currentTransactionForCancel = transaction;
        showCancelConfirmation(transaction);
    } catch (error) {
        console.error('Error in cancelTransactionByUID:', error);
        showNotification('เกิดข้อผิดพลาด: ' + error.message, 'error');
    }
}

/**
 * Show Cancel Confirmation Modal
 */
function showCancelConfirmation(transaction) {
    try {
        if (!transaction) {
            alert('ไม่สามารถยกเลิกรายการนี้ได้');
            return;
        }
        
        const detailsHTML = `
            <!-- UID Display -->
            <div class="uid-display">
                <div class="detail-label"><i class="fas fa-fingerprint"></i>UID</div>
                <div class="uid-value">${transaction.uid || '-'}</div>
            </div>

            <!-- Section 1: Basic Information -->
            <div class="detail-section">
                <div class="detail-section-title">
                    <i class="fas fa-info-circle"></i> ข้อมูลพื้นฐาน
                </div>
                
                <div class="detail-row">
                    <div class="detail-item">
                        <div class="detail-label"><i class="fas fa-calendar-alt"></i>วันที่</div>
                        <div class="detail-value">${formatDate(transaction.date)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label"><i class="fas fa-clock"></i>เวลา</div>
                        <div class="detail-value">${transaction.time || '-'}</div>
                    </div>
                </div>

                <div class="detail-row">
                    <div class="detail-item">
                        <div class="detail-label"><i class="fas fa-tag"></i>ประเภท</div>
                        <div class="detail-value">${transaction.transaction_type}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label"><i class="fas fa-user"></i>ผู้บันทึก</div>
                        <div class="detail-value">${transaction.operator_name || '-'}</div>
                    </div>
                </div>
            </div>

            <!-- Section 2: Source & Destination -->
            <div class="detail-section">
                <div class="detail-section-title">
                    <i class="fas fa-route"></i> ต้นทางและปลายทาง
                </div>
                
                <div class="detail-row">
                    <div class="detail-item">
                        <div class="detail-label"><i class="fas fa-location-dot"></i>แหล่งที่มา</div>
                        <div class="detail-value">${transaction.source_name}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label"><i class="fas fa-location-dot"></i>ปลายทาง</div>
                        <div class="detail-value">${transaction.destination_name}</div>
                    </div>
                </div>
            </div>

            <!-- Section 3: Volume & Pricing -->
            <div class="detail-section">
                <div class="detail-section-title">
                    <i class="fas fa-calculator"></i> ปริมาณและราคา
                </div>
                
                <div class="detail-row">
                    <div class="detail-item">
                        <div class="detail-label"><i class="fas fa-droplet"></i>ปริมาณ</div>
                        <div class="detail-value">${formatNumber(transaction.volume_liters)}<span class="detail-value-unit">ลิตร</span></div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label"><i class="fas fa-cube"></i>หน่วย</div>
                        <div class="detail-value">${transaction.unit || '-'}</div>
                    </div>
                </div>

                <div class="detail-row">
                    <div class="detail-item highlight">
                        <div class="detail-label"><i class="fas fa-money-bill-wave"></i>ราคา/ลิตร</div>
                        <div class="detail-value">${formatNumber(transaction.price_per_liter)}<span class="detail-value-unit">บาท</span></div>
                    </div>
                    <div class="detail-item highlight">
                        <div class="detail-label"><i class="fas fa-receipt"></i>มูลค่ารวม</div>
                        <div class="detail-value" style="font-size: 1.15rem;">${formatNumber(transaction.total_cost)}<span class="detail-value-unit">บาท</span></div>
                    </div>
                </div>
            </div>

            <!-- Section 4: Aircraft Info (if available) -->
            ${(transaction.aircraft_type || transaction.aircraft_number) ? `
            <div class="detail-section">
                <div class="detail-section-title">
                    <i class="fas fa-plane"></i> ข้อมูลอากาศยาน
                </div>
                
                <div class="detail-row">
                    ${transaction.aircraft_type ? `
                    <div class="detail-item">
                        <div class="detail-label"><i class="fas fa-plane"></i>ประเภท</div>
                        <div class="detail-value">${transaction.aircraft_type}</div>
                    </div>
                    ` : ''}
                    ${transaction.aircraft_number ? `
                    <div class="detail-item">
                        <div class="detail-label"><i class="fas fa-id-card"></i>เลขทะเบียน</div>
                        <div class="detail-value">${transaction.aircraft_number}</div>
                    </div>
                    ` : ''}
                </div>
            </div>
            ` : ''}

            <!-- Section 5: Document Info (if available) -->
            ${(transaction.book_no || transaction.receipt_no) ? `
            <div class="detail-section">
                <div class="detail-section-title">
                    <i class="fas fa-file-invoice"></i> เลขเอกสาร
                </div>
                
                <div class="detail-row">
                    ${transaction.book_no ? `
                    <div class="detail-item">
                        <div class="detail-label"><i class="fas fa-book"></i>Book No.</div>
                        <div class="detail-value">${transaction.book_no}</div>
                    </div>
                    ` : ''}
                    ${transaction.receipt_no ? `
                    <div class="detail-item">
                        <div class="detail-label"><i class="fas fa-receipt"></i>Receipt No.</div>
                        <div class="detail-value">${transaction.receipt_no}</div>
                    </div>
                    ` : ''}
                </div>
            </div>
            ` : ''}

            <!-- Section 6: Additional Info -->
            ${transaction.missions ? `
            <div class="detail-section">
                <div class="detail-section-title">
                    <i class="fas fa-tasks"></i> ภารกิจ
                </div>
                
                <div class="detail-row full">
                    <div class="detail-item">
                        <div class="detail-label"><i class="fas fa-tasks"></i>ประเภทภารกิจ</div>
                        <div class="detail-value">${transaction.missions}</div>
                    </div>
                </div>
            </div>
            ` : ''}
            
            ${transaction.notes ? `
            <div class="detail-section">
                <div class="detail-section-title">
                    <i class="fas fa-note-sticky"></i> หมายเหตุ
                </div>
                
                <div class="detail-row full">
                    <div class="detail-item">
                        <div class="detail-label"><i class="fas fa-note-sticky"></i>บันทึก</div>
                        <div class="detail-value">${transaction.notes}</div>
                    </div>
                </div>
            </div>
            ` : ''}
        `;
        
        // Populate full details
        const detailsContainer = document.getElementById('cancelConfirmationDetails');
        if (detailsContainer) {
            detailsContainer.innerHTML = detailsHTML;
        }
        
        // Clear and focus on canceller name input
        const cancellerNameInput = document.getElementById('cancellerName');
        if (cancellerNameInput) {
            cancellerNameInput.value = '';
            // Auto-focus for better UX
            setTimeout(() => {
                cancellerNameInput.focus();
            }, 300);
        }
        
        // Hide detail modal and show confirmation modal
        if (detailModal) {
            detailModal.hide();
        }
        
        if (cancelConfirmationModal) {
            cancelConfirmationModal.show();
        }
    } catch (error) {
        console.error('Error showing cancel confirmation:', error);
        alert('เกิดข้อผิดพลาด: ' + error.message);
    }
}

/**
 * Handle Cancel Confirmation
 */
function handleCancelConfirm() {
    try {
        // Validation: Check if transaction data exists
        if (!currentTransactionForCancel) {
            showNotification('ไม่พบข้อมูลรายการที่ต้องการยกเลิก', 'error');
            return;
        }
        
        const uid = currentTransactionForCancel.uid;
        const source = currentTransactionForCancel.source_name;
        const liters = currentTransactionForCancel.volume_liters;
        
        // Validation: Check required fields
        if (!uid || !uid.trim()) {
            showNotification('UID ของรายการไม่ถูกต้อง', 'error');
            return;
        }
        
        if (!source || !source.trim()) {
            showNotification('แหล่งจ่ายของรายการไม่ถูกต้อง', 'error');
            return;
        }
        
        if (!liters || liters <= 0) {
            showNotification('จำนวนลิตรของรายการไม่ถูกต้อง', 'error');
            return;
        }
        
        // Validation: Check if UID already contains cancelled marker (simple check)
        if (uid.toLowerCase().includes('cancelled') || uid.toLowerCase().includes('archive')) {
            showNotification('รายการนี้ถูกยกเลิกแล้ว', 'error');
            return;
        }
        
        // Validation: Get and validate canceller name
        const cancellerNameInput = document.getElementById('cancellerName');
        if (!cancellerNameInput) {
            showNotification('เกิดข้อผิดพลาดในการได้รับข้อมูลผู้ยกเลิก', 'error');
            return;
        }
        
        const cancellerName = cancellerNameInput.value.trim();
        if (!cancellerName) {
            showNotification('โปรดกรอกชื่อของคุณเพื่อยืนยันการยกเลิกรายการ', 'error');
            cancellerNameInput.focus();
            return;
        }
        
        if (cancellerName.length < 2) {
            showNotification('โปรดกรอกชื่อให้ถูกต้อง (อย่างน้อย 2 ตัวอักษร)', 'error');
            cancellerNameInput.focus();
            return;
        }
        
        // Show loading spinner in modal
        const loadingSpinner = document.getElementById('cancelLoadingSpinner');
        const confirmBtn = document.getElementById('confirmCancelBtn');
        const closeBtn = document.getElementById('cancelModalCloseBtn');
        
        if (loadingSpinner) loadingSpinner.style.display = 'flex';
        if (confirmBtn) confirmBtn.disabled = true;
        if (closeBtn) closeBtn.disabled = true;
        
        // Show loading overlay (page-wide)
        if (loadingOverlay) {
            loadingOverlay.classList.add('active');
        }
        
        // Call backend API to cancel transaction
        const apiUrl = `${GOOGLE_SCRIPT_URL}?action=cancelTransaction&sheetsId=${GOOGLE_SHEETS_ID}&uid=${encodeURIComponent(uid)}&cancellerName=${encodeURIComponent(cancellerName)}`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), APP_CONFIG.API_TIMEOUT);
        
        fetch(apiUrl, {
            method: 'GET',
            signal: controller.signal
        })
        .then(response => {
            clearTimeout(timeoutId);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Hide loading indicators
            if (loadingSpinner) loadingSpinner.style.display = 'none';
            if (confirmBtn) confirmBtn.disabled = false;
            if (closeBtn) closeBtn.disabled = false;
            if (loadingOverlay) {
                loadingOverlay.classList.remove('active');
            }
            
            if (data.success) {
                // Show success notification
                showNotification('ยกเลิกรายการสำเร็จ (' + uid + ')', 'success');
                
                // Hide confirmation modal
                if (cancelConfirmationModal) {
                    cancelConfirmationModal.hide();
                }
                
                // Clear current transaction
                currentTransactionForCancel = null;
                
                // Clear the canceller name input
                if (cancellerNameInput) {
                    cancellerNameInput.value = '';
                }
                
                // Refresh transaction data after a short delay
                setTimeout(() => {
                    loadTransactionData();
                }, 800);
            } else {
                // Server returned error
                const errorMessage = data.error || 'เกิดข้อผิดพลาดในการยกเลิกรายการ';
                throw new Error(errorMessage);
            }
        })
        .catch(error => {
            // Hide loading indicators
            if (loadingSpinner) loadingSpinner.style.display = 'none';
            if (confirmBtn) confirmBtn.disabled = false;
            if (closeBtn) closeBtn.disabled = false;
            if (loadingOverlay) {
                loadingOverlay.classList.remove('active');
            }
            
            // Handle abort/timeout errors
            if (error.name === 'AbortError') {
                console.error('Request timeout');
                showNotification('หมดเวลาการรอ - กรุณาลองใหม่', 'error');
            } else {
                console.error('Error cancelling transaction:', error);
                const errorMsg = error.message || 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ';
                showNotification('เกิดข้อผิดพลาด: ' + errorMsg, 'error');
            }
        });
    } catch (error) {
        // Hide loading indicators
        const loadingSpinner = document.getElementById('cancelLoadingSpinner');
        const confirmBtn = document.getElementById('confirmCancelBtn');
        const closeBtn = document.getElementById('cancelModalCloseBtn');
        
        if (loadingSpinner) loadingSpinner.style.display = 'none';
        if (confirmBtn) confirmBtn.disabled = false;
        if (closeBtn) closeBtn.disabled = false;
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
        }
        
        console.error('Error in handleCancelConfirm:', error);
        showNotification('เกิดข้อผิดพลาด: ' + error.message, 'error');
    }
}

/**
 * Show notification toast
 */
function showNotification(message, type = 'success') {
    try {
        // Create toast element if not exists
        let toastContainer = document.getElementById('notificationToastContainer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'notificationToastContainer';
            toastContainer.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; max-width: 400px;';
            document.body.appendChild(toastContainer);
        }
        
        // Determine color based on type
        const bgColor = type === 'success' ? '#28a745' : (type === 'error' ? '#dc3545' : '#0d6efd');
        const icon = type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle');
        
        // Create toast HTML
        const toastId = 'toast_' + Date.now();
        const toastHTML = `
            <div id="${toastId}" style="
                background-color: ${bgColor};
                color: white;
                padding: 1rem 1.5rem;
                border-radius: 8px;
                margin-bottom: 10px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                display: flex;
                align-items: center;
                gap: 1rem;
                animation: slideIn 0.3s ease-out;
            ">
                <i class="fas ${icon}" style="font-size: 1.2rem;"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Add CSS animation if not exists
        if (!document.getElementById('notificationStyles')) {
            const style = document.createElement('style');
            style.id = 'notificationStyles';
            style.textContent = `
                @keyframes slideIn {
                    from {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOut {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        toastContainer.insertAdjacentHTML('beforeend', toastHTML);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            const toastElement = document.getElementById(toastId);
            if (toastElement) {
                toastElement.style.animation = 'slideOut 0.3s ease-out';
                setTimeout(() => {
                    toastElement.remove();
                }, 300);
            }
        }, 3000);
    } catch (error) {
        console.error('Error showing notification:', error);
    }
}

/**
 * Copy text to clipboard
 */
function copyToClipboard(text) {
    if (!text) return;
    
    navigator.clipboard.writeText(text).then(() => {
        showNotification('คัดลอก UID: ' + text + ' เรียบร้อยแล้ว');
    }).catch(err => {
        console.error('Could not copy text: ', err);
        
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showNotification('คัดลอก UID: ' + text + ' เรียบร้อยแล้ว');
        } catch (err) {
            alert('ไม่สามารถคัดลอกได้: ' + text);
        }
        document.body.removeChild(textArea);
    });
}

/**
 * Print transaction receipt
 */
function printTransactionReceipt(transactionId) {
    const transaction = transactionStore[transactionId];
    if (!transaction) return;
    
    // สร้างหน้าพิมพ์
    const printWindow = window.open('', '_blank');
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Transaction Receipt - ${transaction.uid}</title>
            <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
            <style>
                body {
                    font-family: 'Sarabun', Arial, sans-serif;
                    padding: 40px;
                    max-width: 650px;
                    margin: 0 auto;
                    color: #333;
                }
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    border-bottom: 3px solid #0d6efd;
                    padding-bottom: 20px;
                }
                .header h1 {
                    margin: 0;
                    color: #0d6efd;
                    font-size: 28px;
                }
                .header p {
                    margin: 5px 0 0 0;
                    color: #666;
                }
                .uid-box {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 25px;
                    text-align: center;
                    border-radius: 15px;
                    margin: 30px 0;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.1);
                }
                .uid-box .label {
                    font-size: 14px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    margin-bottom: 10px;
                    opacity: 0.9;
                }
                .uid-box .uid {
                    font-size: 40px;
                    font-weight: bold;
                    letter-spacing: 4px;
                    font-family: 'Courier New', monospace;
                }
                .section-title {
                    font-weight: bold;
                    font-size: 18px;
                    margin-top: 25px;
                    margin-bottom: 15px;
                    color: #2c3e50;
                    border-left: 5px solid #0d6efd;
                    padding-left: 10px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                }
                td {
                    padding: 12px 15px;
                    border-bottom: 1px solid #eee;
                }
                td:first-child {
                    width: 40%;
                    color: #666;
                    font-weight: 500;
                }
                td:last-child {
                    font-weight: bold;
                    text-align: right;
                }
                .highlight-row {
                    background-color: #f8fbff;
                }
                .highlight-row td:last-child {
                    color: #0d6efd;
                    font-size: 20px;
                }
                .footer {
                    margin-top: 50px;
                    text-align: center;
                    color: #999;
                    font-size: 12px;
                    border-top: 1px solid #eee;
                    padding-top: 20px;
                }
                @media print {
                    body { padding: 0; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>ใบยืนยันรายการน้ำมัน</h1>
                <p>กองบริหารการบินเกษตร กรมฝนหลวงและการบินเกษตร</p>
            </div>
            
            <div class="uid-box">
                <div class="label">Transaction ID</div>
                <div class="uid">${transaction.uid}</div>
            </div>
            
            <div class="section-title">รายละเอียดรายการ</div>
            <table>
                <tr>
                    <td>วันที่/เวลา</td>
                    <td>${formatDate(transaction.date)} ${transaction.time || ''}</td>
                </tr>
                <tr>
                    <td>ประเภทรายการ</td>
                    <td>${transaction.transaction_type}</td>
                </tr>
                <tr>
                    <td>แหล่งที่มา/ต้นทาง</td>
                    <td>${transaction.source_name}</td>
                </tr>
                <tr>
                    <td>ปลายทาง</td>
                    <td>${transaction.destination_name}</td>
                </tr>
                <tr class="highlight-row">
                    <td>ปริมาณ</td>
                    <td>${formatNumber(transaction.volume_liters)} ลิตร</td>
                </tr>
                ${transaction.price_per_liter ? `
                <tr>
                    <td>ราคาต่อลิตร</td>
                    <td>${formatNumber(transaction.price_per_liter)} บาท</td>
                </tr>
                ` : ''}
                <tr style="background-color: #fffaf0;">
                    <td>มูลค่ารวม</td>
                    <td style="color: #b8860b; font-size: 20px;">${formatNumber(transaction.total_cost)} บาท</td>
                </tr>
                <tr>
                    <td>ผู้บันทึกรายการ</td>
                    <td>${transaction.operator_name || '-'}</td>
                </tr>
                ${transaction.unit ? `
                <tr>
                    <td>หน่วยงาน</td>
                    <td>${transaction.unit}</td>
                </tr>
                ` : ''}
                ${(transaction.aircraft_type || transaction.aircraft_number) ? `
                <tr>
                    <td>อากาศยาน/พาหนะ</td>
                    <td>${transaction.aircraft_type || ''} ${transaction.aircraft_number || ''}</td>
                </tr>
                ` : ''}
                ${transaction.missions ? `
                <tr>
                    <td>ภารกิจ</td>
                    <td>${transaction.missions}</td>
                </tr>
                ` : ''}
            </table>
            
            <div class="footer">
                <p>พิมพ์เมื่อ: ${new Date().toLocaleString('th-TH')}</p>
                <p>เอกสารฉบับนี้พิมพ์จากระบบจัดการน้ำมันอัตโนมัติ</p>
            </div>
            
            <script>
                window.onload = () => {
                    setTimeout(() => {
                        window.print();
                        // window.close(); // นำออกเพื่อให้ผู้ใช้ดูได้ก่อนถ้าต้องการ
                    }, 500);
                };
            </script>
        </body>
        </html>
    `;
    
    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
}