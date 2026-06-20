/**
 * Monthly Province Summary Page - JavaScript
 */

let allTransactions = [];
let groupedData = {}; // Format: { "YYYY-MM": { "ProvinceName": { "Plan": { totalVolume: 0, totalCost: 0, machines: {} } } } }
let availableMonths = new Set();
let availableProvinces = new Set();

// DOM Elements
const loadingOverlay = document.getElementById('loadingOverlay');
const dataContainer = document.getElementById('dataContainer');
const emptyState = document.getElementById('emptyState');
const monthFilter = document.getElementById('monthFilter');
const planFilter = document.getElementById('planFilter');
const provinceFilter = document.getElementById('provinceFilter');
const resetFiltersBtn = document.getElementById('resetFiltersBtn');
const overallStats = document.getElementById('overallStats');
const overallVolumeEl = document.getElementById('overallVolume');
const overallCostEl = document.getElementById('overallCost');

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupEventListeners();
});

function showLoading(show) {
    if (show) {
        loadingOverlay.classList.add('active');
    } else {
        loadingOverlay.classList.remove('active');
    }
}

function loadData() {
    showLoading(true);
    
    const url = `${GOOGLE_SCRIPT_URL}?action=getTransactionLogs&sheetsId=${GOOGLE_SHEETS_ID}&gid=${SHEET_GIDS.TRANSACTION_HISTORY}`;
    
    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            if (data.success && data.data && Array.isArray(data.data)) {
                allTransactions = data.data;
                processData();
            } else {
                console.error('Invalid data format:', data);
                alert('ไม่สามารถโหลดข้อมูลได้: ' + (data.error || 'ข้อมูลไม่ถูกต้อง'));
            }
        })
        .catch(error => {
            console.error('Error loading transactions:', error);
            alert('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + error.message);
        })
        .finally(() => {
            showLoading(false);
        });
}

function isOut(t) {
    const ty = (t.transaction_type || '').toLowerCase();
    return ty.includes('จ่าย') || ty.includes('dispense') || ty.includes('เติมน้ำมัน') || ty.includes('ใช้งาน') ||
        (ty.includes('ซื้อ') && (t.destination_name || '').match(/เครื่องบิน|c208|casa|nc212|l410|bell|aw|h130|ska|caravan|skycourier/i));
}

function isAirplaneDest(t) {
    const dest = (t.destination_name || '').toLowerCase();
    const acNum = (t.aircraft_number || '').toString().trim();
    const acType = (t.aircraft_type || '').toString().trim();
    
    if (dest.includes('tank') || dest.includes('แท็งก์') || dest.includes('แทงค์') || dest.includes('รถ') || dest.includes('คลัง')) {
        return false;
    }
    if (acNum !== '' && acNum !== '-') return true;
    if (acType !== '' && acType !== '-') return true;
    if (dest.match(/เครื่องบิน|c208|casa|nc212|l410|bell|aw\d|h130|ska\d|caravan|skycourier/i)) return true;
    
    return false;
}

function getPlan(msn) {
    const m = (msn || '').toLowerCase();
    if (m.includes('บรู') || m.includes('ปฏิบัติการ')) return 'แผนบรู';
    if (m.includes('ยุทธ')) return 'แผนยุทธศาสตร์';
    if (m.includes('ฝุ่น')) return 'ดัดแปลงสภาพอากาศ (ฝุ่น)';
    if (m.includes('ลูกเห็บ') || m.includes('เห็บ')) return 'ดัดแปลงสภาพอากาศ (ลูกเห็บ)';
    if (m.includes('ฝึก') || m.includes('บินทดสอบ') || m.includes('ตรวจอากาศ')) return 'แผนบรู'; 
    return 'แผนบรู';
}

function processData() {
    groupedData = {};
    availableMonths.clear();
    availableProvinces.clear();

    // คำนวณราคาเฉลี่ยต่อลิตรของแต่ละจังหวัดแยกตามเดือน จากประวัติการซื้อทั้งหมด
    let monthlyTotals = {};
    let globalSumC = 0, globalSumV = 0;
    allTransactions.forEach(t => {
        if (!t.date) return;
        let m = t.date.substring(0, 7);
        let v = parseFloat(t.volume_liters || t.volume) || 0;
        let c = parseFloat(t.total_cost) || 0;
        let u = (t.unit || '').trim();
        if (v > 0 && c > 0 && u) {
            if (!monthlyTotals[m]) monthlyTotals[m] = { provs: {}, sumV: 0, sumC: 0 };
            if (!monthlyTotals[m].provs[u]) monthlyTotals[m].provs[u] = {v: 0, c: 0};
            monthlyTotals[m].provs[u].v += v;
            monthlyTotals[m].provs[u].c += c;
            monthlyTotals[m].sumV += v;
            monthlyTotals[m].sumC += c;
            globalSumC += c;
            globalSumV += v;
        }
    });
    
    let pttPrices = {};
    let avgPttPrice = {};
    for (let m in monthlyTotals) {
        avgPttPrice[m] = monthlyTotals[m].sumC / monthlyTotals[m].sumV;
        for (let p in monthlyTotals[m].provs) {
            pttPrices[`${m}_${p}`] = monthlyTotals[m].provs[p].c / monthlyTotals[m].provs[p].v;
        }
    }
    pttPrices['__GLOBAL_AVG'] = globalSumV > 0 ? globalSumC / globalSumV : 0;

    // กรองเฉพาะรายการนำน้ำมันออกไปใช้งานที่เครื่องบิน
    const usageTransactions = allTransactions.filter(t => isOut(t) && isAirplaneDest(t));

    usageTransactions.forEach(t => {
        // ดึงจังหวัด (unit)
        const province = t.unit ? t.unit.trim() : 'ไม่ระบุจังหวัด';
        
        // ดึงเดือนจากวันที่ YYYY-MM-DD
        let monthKey = 'ไม่ระบุวันที่';
        if (t.date && typeof t.date === 'string' && t.date.length >= 7) {
            monthKey = t.date.substring(0, 7); // YYYY-MM
        }
        
        // ดึงแผน
        const msn = (t.missions || t.mission || t.mission_type || 'ไม่ระบุ').toString();
        const plan = getPlan(msn);

        // ดึงหมายเลขเครื่องให้ตรงกับ Dashboard (Type : Number)
        let machineNumber = 'ไม่ระบุเครื่อง';
        const acNum = (t.aircraft_number || '').toString().trim();
        const acType = (t.aircraft_type || '').toString().trim();
        if (acType && acType !== '-' && acType !== 'ไม่ระบุ' && acNum && acNum !== '-' && acNum !== 'ไม่ระบุ') {
            machineNumber = `${acType} : ${acNum}`;
        } else if (acNum && acNum !== '-' && acNum !== 'ไม่ระบุ') {
            machineNumber = acNum;
        } else if (acType && acType !== '-' && acType !== 'ไม่ระบุ') {
            machineNumber = acType;
        }

        const volume = parseFloat(t.volume_liters) || parseFloat(t.volume) || 0;
        
        // คำนวณราคาแบบเดียวกับ dashboard
        let cost = 0;
        const pttKey = `${monthKey}_${province}`;
        if (province && pttPrices[pttKey]) {
            cost = volume * pttPrices[pttKey];
        } else if (avgPttPrice[monthKey] > 0) {
            cost = volume * avgPttPrice[monthKey];
        } else if (pttPrices['__GLOBAL_AVG'] > 0) {
            cost = volume * pttPrices['__GLOBAL_AVG'];
        } else {
            cost = parseFloat(t.total_cost) || 0;
        }

        availableMonths.add(monthKey);
        availableProvinces.add(province);

        // จัดกลุ่มข้อมูล
        if (!groupedData[monthKey]) groupedData[monthKey] = {};
        if (!groupedData[monthKey][province]) groupedData[monthKey][province] = {};
        if (!groupedData[monthKey][province][plan]) {
            groupedData[monthKey][province][plan] = {
                totalVolume: 0,
                totalCost: 0,
                machines: {}
            };
        }
        if (!groupedData[monthKey][province][plan].machines[machineNumber]) {
            groupedData[monthKey][province][plan].machines[machineNumber] = {
                volume: 0,
                cost: 0
            };
        }

        groupedData[monthKey][province][plan].totalVolume += volume;
        groupedData[monthKey][province][plan].totalCost += cost;
        groupedData[monthKey][province][plan].machines[machineNumber].volume += volume;
        groupedData[monthKey][province][plan].machines[machineNumber].cost += cost;
    });

    populateFilters();
    renderData();
}

function populateFilters() {
    const sortedMonths = Array.from(availableMonths).sort((a, b) => b.localeCompare(a));
    monthFilter.innerHTML = '<option value="all">ทุกเดือน</option>';
    sortedMonths.forEach(month => {
        if (month === 'ไม่ระบุวันที่') {
            monthFilter.insertAdjacentHTML('beforeend', `<option value="${month}">${month}</option>`);
            return;
        }
        const [year, monthNum] = month.split('-');
        const thaiYear = parseInt(year) + 543;
        const thaiMonths = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
        const monthName = thaiMonths[parseInt(monthNum)] || monthNum;
        const displayMonth = `${monthName} ${thaiYear}`;
        monthFilter.insertAdjacentHTML('beforeend', `<option value="${month}">${displayMonth}</option>`);
    });

    const sortedProvinces = Array.from(availableProvinces).sort();
    provinceFilter.innerHTML = '<option value="all">ทั้งหมด</option>';
    sortedProvinces.forEach(province => {
        provinceFilter.insertAdjacentHTML('beforeend', `<option value="${province}">${province}</option>`);
    });
}

function setupEventListeners() {
    monthFilter.addEventListener('change', renderData);
    provinceFilter.addEventListener('change', renderData);
    planFilter.addEventListener('change', renderData);
    resetFiltersBtn.addEventListener('click', () => {
        monthFilter.value = 'all';
        provinceFilter.value = 'all';
        planFilter.value = 'all';
        renderData();
    });
}

function formatNumber(number, decimals = 2) {
    if (number === null || number === undefined || isNaN(number)) return "0";
    if (Number.isInteger(number)) decimals = 0;
    return Number(number).toLocaleString('th-TH', { 
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals 
    });
}

function formatMonthYear(monthKey) {
    if (monthKey === 'ไม่ระบุวันที่') return monthKey;
    const [year, monthNum] = monthKey.split('-');
    const thaiYear = parseInt(year) + 543;
    const thaiMonths = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    return `${thaiMonths[parseInt(monthNum)] || monthNum} ${thaiYear}`;
}

function renderData() {
    const selectedMonth = monthFilter.value;
    const selectedProvince = provinceFilter.value;
    const selectedPlan = planFilter.value;
    
    dataContainer.innerHTML = '';
    let hasData = false;
    let totalVolumeOverall = 0;
    let totalCostOverall = 0;

    const planBadgeColor = {
        'แผนบรู': '#10b981', 'แผนยุทธศาสตร์': '#eab308',
        'ดัดแปลงสภาพอากาศ (ฝุ่น)': '#ef4444', 'ดัดแปลงสภาพอากาศ (ลูกเห็บ)': '#8b5cf6'
    };
    const planShort = {
        'แผนบรู': 'บรู', 'แผนยุทธศาสตร์': 'ยุทธ',
        'ดัดแปลงสภาพอากาศ (ฝุ่น)': 'ฝุ่น', 'ดัดแปลงสภาพอากาศ (ลูกเห็บ)': 'ลูกเห็บ'
    };

    let htmlContent = '<div class="row row-cols-1 row-cols-md-2 row-cols-xl-4 g-4">';

    const sortedMonths = Object.keys(groupedData).sort((a, b) => b.localeCompare(a));

    sortedMonths.forEach(monthKey => {
        if (selectedMonth !== 'all' && monthKey !== selectedMonth) return;

        const provincesData = groupedData[monthKey];
        const sortedProvinces = Object.keys(provincesData).sort();

        sortedProvinces.forEach(province => {
            if (selectedProvince !== 'all' && province !== selectedProvince) return;

            const provincePlans = provincesData[province];
            
            Object.keys(provincePlans).forEach(plan => {
                if (selectedPlan !== 'all' && plan !== selectedPlan) return;
                const pData = provincePlans[plan];
                hasData = true;
                
                totalVolumeOverall += pData.totalVolume;
                totalCostOverall += pData.totalCost;

                const sortedMachines = Object.keys(pData.machines).sort((a, b) => pData.machines[b].volume - pData.machines[a].volume);

                let machinesHTML = '';
                sortedMachines.forEach(machine => {
                    const mData = pData.machines[machine];
                    machinesHTML += `
                        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f1f5f9; padding:0.5rem 0; font-size:0.85rem;">
                            <div style="font-weight:600; color:#334155;"><i class="fas fa-plane text-muted me-1" style="font-size:0.75rem;"></i>${machine}</div>
                            <div class="text-end">
                                <div style="font-weight:700; color:#0f172a;">${formatNumber(mData.volume)} L</div>
                                <div style="color:#64748b; font-size:0.75rem;">${formatNumber(mData.cost)} ฿</div>
                            </div>
                        </div>
                    `;
                });

                const color = planBadgeColor[plan] || '#0d6efd';
                const shortPlan = planShort[plan] || plan;
                
                htmlContent += `
                    <div class="col">
                        <div class="card h-100" style="border:1px solid ${color}33; box-shadow:0 4px 6px -1px rgba(0,0,0,0.05); border-radius:12px; overflow:hidden;">
                            <div class="card-header" style="background:linear-gradient(135deg, ${color}ee, ${color}); color:white; border-bottom:none; border-radius:12px 12px 0 0; padding:1rem;">
                                <div class="d-flex justify-content-between align-items-center mb-1">
                                    <h6 class="mb-0 fw-bold"><i class="fas fa-map-marker-alt me-1"></i>${province}</h6>
                                    <span style="background:rgba(255,255,255,0.25); padding:2px 8px; border-radius:12px; font-size:0.75rem; font-weight:600;">${shortPlan}</span>
                                </div>
                                <div style="font-size:0.8rem; opacity:0.9;"><i class="far fa-calendar-alt me-1"></i>${formatMonthYear(monthKey)}</div>
                            </div>
                            <div class="card-body p-0 d-flex flex-column">
                                <div style="display:grid; grid-template-columns:1fr 1fr; background:#f8fafc; border-bottom:1px solid #e2e8f0;">
                                    <div style="padding:0.75rem; text-align:center; border-right:1px solid #e2e8f0;">
                                        <div style="font-size:0.7rem; color:#64748b; font-weight:600; text-transform:uppercase;">รวมน้ำมัน (L)</div>
                                        <div style="font-size:1.1rem; font-weight:800; color:#10b981;">${formatNumber(pData.totalVolume)}</div>
                                    </div>
                                    <div style="padding:0.75rem; text-align:center;">
                                        <div style="font-size:0.7rem; color:#64748b; font-weight:600; text-transform:uppercase;">มูลค่า (฿)</div>
                                        <div style="font-size:1.1rem; font-weight:800; color:#f59e0b;">${formatNumber(pData.totalCost)}</div>
                                    </div>
                                </div>
                                <div style="padding:0.5rem 1rem; flex-grow: 1;">
                                    ${machinesHTML}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
        });
    });

    htmlContent += '</div>';

    if (hasData) {
        emptyState.style.display = 'none';
        overallStats.style.display = 'flex';
        dataContainer.innerHTML = htmlContent;
        overallVolumeEl.innerHTML = `${formatNumber(totalVolumeOverall)} <small class="fs-5" style="opacity: 0.8;">L</small>`;
        overallCostEl.innerHTML = `${formatNumber(totalCostOverall)} <small class="fs-5" style="opacity: 0.8;">฿</small>`;
    } else {
        emptyState.style.display = 'block';
        overallStats.style.display = 'none';
        dataContainer.innerHTML = '';
    }
}
