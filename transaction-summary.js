/**
 * Transaction Summary Page - JavaScript
 * จัดการข้อมูลและแสดงผลสรุปรายการเดินบัญชี
 */

// ตัวแปรสำเหร็จ
let allTransactions = [];
let filteredTransactions = [];
let currentPage = 1;
const itemsPerPage = 10;

// DOM Elements
const loadingOverlay = document.getElementById('loadingOverlay');
const transactionsTableBody = document.getElementById('transactionsTableBody');
const totalTransactionsEl = document.getElementById('totalTransactions');
const totalVolumeEl = document.getElementById('totalVolume');
const totalCostEl = document.getElementById('totalCost');
const averagePriceEl = document.getElementById('averagePrice');
const searchInput = document.getElementById('searchInput');
const transactionTypeFilter = document.getElementById('transactionTypeFilter');
const sortByFilter = document.getElementById('sortByFilter');
const resetFiltersBtn = document.getElementById('resetFiltersBtn');
const paginationContainer = document.getElementById('paginationContainer');
const paginationInfo = document.getElementById('paginationInfo');
const paginationNav = document.getElementById('paginationNav');
const detailModalBody = document.getElementById('detailModalBody');
let detailModal = null;

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
    
    loadTransactionData();
    setupEventListeners();
});

/**
 * Setup event listeners
 */
function setupEventListeners() {
    searchInput.addEventListener('input', applyFilters);
    transactionTypeFilter.addEventListener('change', applyFilters);
    sortByFilter.addEventListener('change', applyFilters);
    resetFiltersBtn.addEventListener('click', resetFilters);
    
    // Export buttons
    const exportFilteredBtn = document.getElementById('exportFilteredBtn');
    const exportAllBtn = document.getElementById('exportAllBtn');
    
    if (exportFilteredBtn) {
        exportFilteredBtn.addEventListener('click', () => exportToExcel(false));
    }
    if (exportAllBtn) {
        exportAllBtn.addEventListener('click', () => exportToExcel(true));
    }
}

/**
 * Load transaction data from Google Apps Script
 */
function loadTransactionData() {
    showLoading(true);
    
    const url = `${GOOGLE_SCRIPT_URL}?action=getTransactionLogs&sheetsId=${GOOGLE_SHEETS_ID}&gid=${SHEET_GIDS.TRANSACTION_HISTORY}`;
    
    console.log('Loading transactions from URL:', url);
    
    fetch(url)
        .then(response => {
            console.log('Response status:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Data received:', data);
            if (data.success && data.data && Array.isArray(data.data)) {
                console.log('Successfully loaded', data.data.length, 'transactions');
                allTransactions = data.data;
                filteredTransactions = [...allTransactions];
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
    // Search filter
    const searchText = searchInput.value.toLowerCase();
    const transactionType = transactionTypeFilter.value;
    const sortBy = sortByFilter.value;

    filteredTransactions = allTransactions.filter(transaction => {
        const matchesSearch = !searchText || 
            transaction.source_name.toLowerCase().includes(searchText) ||
            transaction.destination_name.toLowerCase().includes(searchText) ||
            transaction.operator_name.toLowerCase().includes(searchText) ||
            transaction.transaction_type.toLowerCase().includes(searchText);

        const matchesType = !transactionType || 
            transaction.transaction_type === transactionType;

        return matchesSearch && matchesType;
    });

    // Apply sorting
    sortTransactions(filteredTransactions, sortBy);

    // Reset to first page
    currentPage = 1;

    // Update display
    updateSummaryStatistics();
    renderTable();
    updatePagination();
}

/**
 * Sort transactions
 */
function sortTransactions(transactions, sortBy) {
    switch(sortBy) {
        case 'date_asc':
            transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
            break;
        case 'date_desc':
            transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
            break;
        case 'volume_asc':
            transactions.sort((a, b) => a.volume - b.volume);
            break;
        case 'volume_desc':
            transactions.sort((a, b) => b.volume - a.volume);
            break;
        case 'cost_desc':
            transactions.sort((a, b) => b.total_cost - a.total_cost);
            break;
        default:
            transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
}

/**
 * Update summary statistics
 */
function updateSummaryStatistics() {
    const totalCount = filteredTransactions.length;
    const totalVolume = filteredTransactions.reduce((sum, t) => sum + t.volume, 0);
    const totalCost = filteredTransactions.reduce((sum, t) => sum + t.total_cost, 0);
    const averagePrice = totalVolume > 0 ? (totalCost / totalVolume).toFixed(2) : 0;

    totalTransactionsEl.textContent = formatNumber(totalCount);
    totalVolumeEl.textContent = formatNumber(totalVolume);
    totalCostEl.textContent = formatNumber(totalCost);
    averagePriceEl.textContent = formatNumber(averagePrice);
}

// Store transactions for detail view
const transactionStore = {};

/**
 * Render transactions table
 */
function renderTable() {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageTransactions = filteredTransactions.slice(startIndex, endIndex);

    if (pageTransactions.length === 0) {
        transactionsTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted py-5">
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

    transactionsTableBody.innerHTML = pageTransactions.map((transaction, index) => {
        const transactionId = `trans_${Date.now()}_${index}`;
        transactionStore[transactionId] = transaction;
        
        return `
            <tr>
                <td><small class="text-muted">${formatDate(transaction.date)}</small></td>
                <td><small class="text-muted">${transaction.time || '-'}</small></td>
                <td>
                    ${getTransactionTypeBadge(transaction.transaction_type)}
                </td>
                <td><small>${transaction.source_name}</small></td>
                <td><small>${transaction.destination_name}</small></td>
                <td class="text-end">
                    <strong>${formatNumber(transaction.volume)}</strong>
                </td>
                <td class="text-end">
                    <strong>${formatNumber(transaction.total_cost)}</strong>
                </td>
                <td class="table-cell-action">
                    <button class="btn btn-sm btn-info btn-detail" onclick="showDetailModal('${transactionId}')">
                        <i class="fas fa-eye"></i> ดู
                    </button>
                </td>
            </tr>
        `;
    }).join('');
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

        const detailsHTML = `
            <!-- Row 1: Date & Time -->
            <div class="detail-row">
                <div class="detail-item">
                    <div class="detail-label"><i class="fas fa-calendar-alt me-1"></i>วันที่</div>
                    <div class="detail-value">${formatDate(transaction.date)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label"><i class="fas fa-clock me-1"></i>เวลา</div>
                    <div class="detail-value">${transaction.time || '-'}</div>
                </div>
            </div>

            <!-- Row 2: Transaction Type & Operator -->
            <div class="detail-row">
                <div class="detail-item">
                    <div class="detail-label"><i class="fas fa-tag me-1"></i>ประเภท</div>
                    <div class="detail-value">${transaction.transaction_type}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label"><i class="fas fa-user me-1"></i>ผู้บันทึก</div>
                    <div class="detail-value">${transaction.operator_name || '-'}</div>
                </div>
            </div>

            <!-- Row 3: Source & Destination -->
            <div class="detail-row">
                <div class="detail-item">
                    <div class="detail-label"><i class="fas fa-location-dot me-1"></i>แหล่ง</div>
                    <div class="detail-value">${transaction.source_name}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label"><i class="fas fa-location-dot me-1"></i>ปลายทาง</div>
                    <div class="detail-value">${transaction.destination_name}</div>
                </div>
            </div>

            <!-- Row 4: Volume & Unit -->
            <div class="detail-row">
                <div class="detail-item">
                    <div class="detail-label"><i class="fas fa-droplet me-1"></i>ปริมาณ</div>
                    <div class="detail-value">${formatNumber(transaction.volume)} <span style="font-size: 0.85rem; color: #6c757d; font-weight: 500;">ลิตร</span></div>
                </div>
                <div class="detail-item">
                    <div class="detail-label"><i class="fas fa-cube me-1"></i>หน่วย</div>
                    <div class="detail-value">${transaction.unit || '-'}</div>
                </div>
            </div>

            <!-- Row 5: Price & Total Cost (Highlight) -->
            <div class="detail-row">
                <div class="detail-item" style="border-left-color: #198754; background: #f0f9f4;">
                    <div class="detail-label"><i class="fas fa-tag me-1" style="color: #198754;"></i>ราคา/ลิตร</div>
                    <div class="detail-value" style="color: #198754;">${formatNumber(transaction.price_per_liter)} <span style="font-size: 0.85rem; color: #6c757d; font-weight: 500;">บาท</span></div>
                </div>
                <div class="detail-item" style="border-left-color: #0d6efd; background: #f0f7ff;">
                    <div class="detail-label"><i class="fas fa-money-bill me-1" style="color: #0d6efd;"></i>มูลค่ารวม</div>
                    <div class="detail-value" style="color: #0d6efd; font-size: 1.15rem;">${formatNumber(transaction.total_cost)} <span style="font-size: 0.85rem; color: #6c757d; font-weight: 500;">บาท</span></div>
                </div>
            </div>

            <!-- Additional Info (if available) -->
            ${transaction.notes ? `
            <div class="detail-row">
                <div class="detail-item" style="grid-column: 1 / -1;">
                    <div class="detail-label"><i class="fas fa-note-sticky me-1"></i>หมายเหตุ</div>
                    <div class="detail-value">${transaction.notes}</div>
                </div>
            </div>
            ` : ''}
        `;

        detailModalBody.innerHTML = detailsHTML;
        
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
    renderTable();
    updatePagination();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Reset filters
 */
function resetFilters() {
    searchInput.value = '';
    transactionTypeFilter.value = '';
    sortByFilter.value = 'date_desc';
    applyFilters();
}

/**
 * Show loading overlay
 */
function showLoading(show) {
    console.log('showLoading called with:', show);
    if (show) {
        loadingOverlay.classList.add('active');
        console.log('Loading overlay shown');
    } else {
        loadingOverlay.classList.remove('active');
        console.log('Loading overlay hidden');
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
        
        // Create header row
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
            'หมายเหตุ'
        ];
        
        // Map transaction data to rows
        const rows = dataToExport.map(transaction => [
            formatDate(transaction.date),
            transaction.time || '-',
            transaction.transaction_type,
            transaction.source_name,
            transaction.destination_name,
            transaction.volume,
            transaction.price_per_liter || '-',
            transaction.total_cost,
            transaction.operator_name || '-',
            transaction.notes || '-'
        ]);
        
        // Add summary row
        const totalVolume = dataToExport.reduce((sum, t) => sum + t.volume, 0);
        const totalCost = dataToExport.reduce((sum, t) => sum + t.total_cost, 0);
        const averagePrice = totalVolume > 0 ? (totalCost / totalVolume).toFixed(2) : 0;
        
        // Create workbook
        const workbook = XLSX.utils.book_new();
        
        // Create main data sheet
        const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        
        // Add summary section
        const emptyRow = [''];
        const summaryData = [
            emptyRow,
            ['สรุป'],
            ['จำนวนรายการ', dataToExport.length],
            ['ปริมาณรวม (ลิตร)', totalVolume],
            ['มูลค่ารวม (บาท)', totalCost],
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