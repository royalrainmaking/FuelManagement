/**
 * Monthly Province Summary Page - JavaScript
 */

let allTransactions = [];
let masterInventoryData = [];
let groupedData = {}; // Format: { "YYYY-MM": { "ProvinceName": { "Plan": { totalVolume: 0, totalCost: 0, machines: {} } } } }
let availableMonths = new Set();
let availableProvinces = new Set();

let currentMonthFilter = '';
let currentPlanFilter = 'all';
let currentProvinceFilter = 'all';

// DOM Elements
const loadingOverlay = document.getElementById('loadingOverlay');
const monthFilter = document.getElementById('monthFilter');
const planFilter = document.getElementById('planFilter');
const provinceFilter = document.getElementById('provinceFilter');
const resetFiltersBtn = document.getElementById('resetFiltersBtn');

let mapChart = null;
let mapGeoJson = null;
let mapBlinkInterval = null;
let dailyChart = null;
let currentSelectedProvinceData = null;
let globalActiveSources = new Set();

const planColors = {
    'แผนบรู': '#198754', // success
    'แผนยุทธศาสตร์': '#ffc107', // warning
    'ดัดแปลงสภาพอากาศ (ฝุ่น)': '#dc3545', // danger
    'ดัดแปลงสภาพอากาศ (ลูกเห็บ)': '#6f42c1' // purple
};

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    loadData();
    setupEventListeners();
});

function initMap() {
    const mapContainer = document.getElementById('thailandMap');
    if (!mapContainer) return;
    
    mapChart = echarts.init(mapContainer);
    mapChart.showLoading({ text: 'กำลังโหลดแผนที่...', color: '#0d6efd', maskColor: 'rgba(255, 255, 255, 0.8)' });
    document.getElementById('mapSection').style.display = 'flex';
    
    fetch('thailand.json')
        .then(response => response.json())
        .then(geoJson => {
            mapGeoJson = geoJson;
            echarts.registerMap('thailand', geoJson);
            mapChart.hideLoading();
            renderMapData();
        })
        .catch(err => {
            console.error('Error loading map:', err);
            mapChart.hideLoading();
        });
        
    const dailyChartContainer = document.getElementById('dailyChart');
    if (dailyChartContainer) {
        dailyChart = echarts.init(dailyChartContainer);
    }
        
    window.addEventListener('resize', () => {
        if (mapChart) mapChart.resize();
        if (dailyChart) dailyChart.resize();
    });
    
    mapChart.on('click', function (params) {
        if (params.data && params.data.thaiName) {
            currentSelectedProvinceData = params.data;
            showProvincePanel(params.data);
            renderDailyGraph(params.data);
        } else {
            currentSelectedProvinceData = null;
            showProvincePanel(null);
            renderDailyGraph(null);
        }
    });
    
    mapChart.getZr().on('click', function(event) {
        if (!event.target) {
            currentSelectedProvinceData = null;
            if (currentMonthFilter && currentMonthFilter !== 'all') {
                showMonthlySummaryPanel(currentMonthFilter);
            } else {
                showProvincePanel(null);
            }
            renderDailyGraph(null);
            renderFuelSources();
        }
    });
}

function showMonthlySummaryPanel(monthKey) {
    const panel = document.getElementById('provinceDetailPanel');
    if (!panel) return;
    
    if (!monthKey || monthKey === 'all' || !groupedData[monthKey]) {
        panel.style.display = 'none';
        return;
    }
    
    const monthData = groupedData[monthKey];
    const planStats = {};
    let totalVol = 0;
    let totalCost = 0;
    
    Object.keys(monthData).forEach(prov => {
        const plans = monthData[prov].planData;
        Object.keys(plans).forEach(plan => {
            if (!planStats[plan]) planStats[plan] = { vol: 0, cost: 0, provinces: {} };
            planStats[plan].vol += plans[plan].totalVolume;
            planStats[plan].cost += plans[plan].totalCost;
            totalVol += plans[plan].totalVolume;
            totalCost += plans[plan].totalCost;
            
            if (!planStats[plan].provinces[prov]) planStats[plan].provinces[prov] = { vol: 0 };
            planStats[plan].provinces[prov].vol += plans[plan].totalVolume;
        });
    });
    
    panel.style.display = 'block';
    
    let html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:2px solid rgba(0,0,0,0.1); padding-bottom:10px;">
            <h5 style="margin:0; font-weight:900; color:#1e293b; font-size:1.4rem; text-shadow: 0 1px 3px rgba(255,255,255,0.9), 0 0 10px rgba(255,255,255,1);"><i class="fas fa-calendar-check me-2 text-primary"></i>สรุปภาพรวมรายเดือน</h5>
        </div>
        <div style="margin-bottom: 20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:1rem; margin-bottom:8px;">
                <span style="color:#334155; font-weight:800; text-shadow: 0 1px 2px rgba(255,255,255,0.9);"><i class="fas fa-gas-pump me-2"></i>ปริมาณรวมทั้งประเทศ:</span>
                <span style="color:#059669; font-weight:900; font-size:1.1rem; text-shadow: 0 1px 2px rgba(255,255,255,0.9);">${formatNumber(totalVol)} <span style="font-size:0.75rem; color:#475569;">L</span></span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:1rem; margin-bottom:12px;">
                <span style="color:#334155; font-weight:800; text-shadow: 0 1px 2px rgba(255,255,255,0.9);"><i class="fas fa-coins me-2"></i>มูลค่ารวมโดยประมาณ:</span>
                <span style="color:#d97706; font-weight:900; font-size:1.1rem; text-shadow: 0 1px 2px rgba(255,255,255,0.9);">${formatNumber(totalCost)} <span style="font-size:0.75rem; color:#475569;">฿</span></span>
            </div>
        </div>
    `;

    const plans = Object.keys(planStats).sort((a,b) => planStats[b].vol - planStats[a].vol);
    
    plans.forEach(p => {
        const stats = planStats[p];
        const c = planColors[p] || '#0369a1';
        
        let provsHtml = Object.keys(stats.provinces)
            .sort((a,b) => stats.provinces[b].vol - stats.provinces[a].vol)
            .slice(0, 5) // Show top 5 provinces per plan
            .map(prov => {
                return `
                    <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.85rem; padding:4px 0; border-bottom:1px dashed rgba(0,0,0,0.1);">
                        <span style="color:#334155; font-weight:700; text-shadow: 0 1px 2px rgba(255,255,255,0.9);"><i class="fas fa-map-marker-alt text-secondary me-2"></i>${prov}</span>
                        <span style="font-weight:900; color:#0f172a; text-shadow: 0 1px 2px rgba(255,255,255,0.9);">${formatNumber(stats.provinces[prov].vol)} <span style="font-size:0.7rem; color:#475569;">L</span></span>
                    </div>
                `;
            }).join('');
        
        html += `
            <div style="margin-bottom:20px; padding-left:12px; border-left:4px solid ${c};">
                <div style="font-size:1.1rem; font-weight:900; color:#0f172a; margin-bottom:8px; text-shadow: 0 1px 3px rgba(255,255,255,0.9), 0 0 10px rgba(255,255,255,1);">${p}</div>
                
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.9rem; margin-bottom:12px;">
                    <span style="color:#334155; font-weight:800; text-shadow: 0 1px 2px rgba(255,255,255,0.9);"><i class="fas fa-gas-pump me-2"></i>ปริมาณรวมแผน:</span>
                    <span style="color:#059669; font-weight:900; text-shadow: 0 1px 2px rgba(255,255,255,0.9);">${formatNumber(stats.vol)} <span style="font-size:0.75rem; color:#475569;">L</span></span>
                </div>
                
                <div style="font-size:0.8rem; font-weight:800; color:#475569; text-transform:uppercase; margin-bottom:6px; letter-spacing:0.5px; text-shadow: 0 1px 2px rgba(255,255,255,0.9);">จังหวัดที่ใช้เยอะสุด 5 อันดับแรก</div>
                <div style="padding-top:4px;">
                    ${provsHtml || '<div class="text-muted" style="font-size:0.8rem; font-weight:700; text-shadow: 0 1px 2px rgba(255,255,255,0.9);">ไม่มีข้อมูลจังหวัด</div>'}
                </div>
            </div>
        `;
    });
    
    panel.innerHTML = html;
}

function showProvincePanel(data) {
    const panel = document.getElementById('provinceDetailPanel');
    if (!panel) return;
    
    if (!data) {
        panel.style.display = 'none';
        return;
    }
    
    panel.style.display = 'block';
    
    let html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:2px solid rgba(0,0,0,0.1); padding-bottom:10px;">
            <h5 style="margin:0; font-weight:900; color:#1e293b; font-size:1.4rem; text-shadow: 0 1px 3px rgba(255,255,255,0.9), 0 0 10px rgba(255,255,255,1);"><i class="fas fa-map-marker-alt me-2 text-primary"></i>${data.thaiName}</h5>
            <button class="btn-close" style="font-size:0.8rem; background-color: rgba(255,255,255,0.5); border-radius: 50%;" onclick="document.getElementById('provinceDetailPanel').style.display='none'"></button>
        </div>
    `;

    if (!data.planStats) {
        html += `<div class="text-center text-muted my-4 py-4" style="text-shadow: 0 1px 2px rgba(255,255,255,0.9);"><i class="fas fa-info-circle mb-2" style="font-size:2rem; color:#94a3b8;"></i><br/>ไม่มีข้อมูลในเงื่อนไขที่เลือก</div>`;
    } else {
        const plans = Object.keys(data.planStats).sort((a,b) => data.planStats[b].vol - data.planStats[a].vol);
        
        plans.forEach(p => {
            const stats = data.planStats[p];
            const c = planColors[p] || '#0369a1';
            
            let machinesHtml = Object.keys(stats.machines)
                .sort((a,b) => stats.machines[b].vol - stats.machines[a].vol)
                .map(m => {
                    return `
                        <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.85rem; padding:4px 0; border-bottom:1px dashed rgba(0,0,0,0.1);">
                            <span style="color:#334155; font-weight:700; text-shadow: 0 1px 2px rgba(255,255,255,0.9);"><i class="fas fa-plane text-secondary me-2"></i>${m}</span>
                            <span style="font-weight:900; color:#0f172a; text-shadow: 0 1px 2px rgba(255,255,255,0.9);">${formatNumber(stats.machines[m].vol)} <span style="font-size:0.7rem; color:#475569;">L</span></span>
                        </div>
                    `;
                }).join('');
            
            html += `
                <div style="margin-bottom:20px; padding-left:12px; border-left:4px solid ${c};">
                    <div style="font-size:1.1rem; font-weight:900; color:#0f172a; margin-bottom:8px; text-shadow: 0 1px 3px rgba(255,255,255,0.9), 0 0 10px rgba(255,255,255,1);">${p}</div>
                    
                    <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.9rem; margin-bottom:4px;">
                        <span style="color:#334155; font-weight:800; text-shadow: 0 1px 2px rgba(255,255,255,0.9);"><i class="fas fa-gas-pump me-2"></i>ปริมาณรวม:</span>
                        <span style="color:#059669; font-weight:900; text-shadow: 0 1px 2px rgba(255,255,255,0.9);">${formatNumber(stats.vol)} <span style="font-size:0.75rem; color:#475569;">L</span></span>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.9rem; margin-bottom:12px;">
                        <span style="color:#334155; font-weight:800; text-shadow: 0 1px 2px rgba(255,255,255,0.9);"><i class="fas fa-coins me-2"></i>มูลค่าประมาณ:</span>
                        <span style="color:#d97706; font-weight:900; text-shadow: 0 1px 2px rgba(255,255,255,0.9);">${formatNumber(stats.cost)} <span style="font-size:0.75rem; color:#475569;">฿</span></span>
                    </div>
                    
                    <div style="font-size:0.8rem; font-weight:800; color:#475569; text-transform:uppercase; margin-bottom:6px; letter-spacing:0.5px; text-shadow: 0 1px 2px rgba(255,255,255,0.9);">แยกตามอากาศยาน</div>
                    <div style="padding-top:4px;">
                        ${machinesHtml || '<div class="text-muted" style="font-size:0.8rem; font-weight:700; text-shadow: 0 1px 2px rgba(255,255,255,0.9);">ไม่มีข้อมูลอากาศยาน</div>'}
                    </div>
                </div>
            `;
        });
    }
        
    panel.innerHTML = html;
    renderFuelSources();
}

function showLoading(show) {
    if (show) {
        loadingOverlay.classList.add('active');
    } else {
        loadingOverlay.classList.remove('active');
    }
}

function loadData() {
    showLoading(true);
    
    const transUrl = `${GOOGLE_SCRIPT_URL}?action=getTransactionLogs&sheetsId=${GOOGLE_SHEETS_ID}&gid=${SHEET_GIDS.TRANSACTION_HISTORY}`;
    const invUrl = `${GOOGLE_SCRIPT_URL}?action=getMasterData&sheetsId=${GOOGLE_SHEETS_ID}&gid=${SHEET_GIDS.INVENTORY}`;
    
    Promise.all([
        fetch(transUrl).then(r => r.json()),
        fetch(invUrl).then(r => r.json())
    ])
    .then(([transData, invData]) => {
        let hasError = false;
        
        if (transData.success && transData.data && Array.isArray(transData.data)) {
            allTransactions = transData.data;
        } else {
            console.error('Invalid transaction data format:', transData);
            hasError = true;
        }
        
        if (invData.success && invData.data && Array.isArray(invData.data)) {
            masterInventoryData = invData.data;
        } else {
            console.warn('Could not load inventory data:', invData);
            // Non-critical, just means we can't show real-time stock
        }
        
        if (hasError) {
            alert('ไม่สามารถโหลดข้อมูลการใช้น้ำมันได้');
        } else {
            processData();
        }
    })
    .catch(error => {
        console.error('Error loading data:', error);
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

function getPlan(missions) {
    const s = (missions || '').toString();
    if (s.includes('ลูกเห็บ')) return 'ดัดแปลงสภาพอากาศ (ลูกเห็บ)';
    if (s.includes('ฝุ่น') || s.includes('ดัดแปลงสภาพอากาศ')) return 'ดัดแปลงสภาพอากาศ (ฝุ่น)';
    if (s.includes('บรู') || s.includes('ฝนหลวง') || s.includes('บินสำรวจ')) return 'แผนบรู';
    return 'แผนยุทธศาสตร์';
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
        if (!groupedData[monthKey][province]) {
            groupedData[monthKey][province] = {
                planData: {},
                sources: new Set()
            };
        }
        
        // Track the fuel source used in this province
        const sourceName = (t.source_name || '').toString().trim();
        if (sourceName && isOut(t) && isAirplaneDest(t)) {
            groupedData[monthKey][province].sources.add(sourceName);
        }

        if (!groupedData[monthKey][province].planData[plan]) {
            groupedData[monthKey][province].planData[plan] = {
                totalVolume: 0,
                totalCost: 0,
                machines: {}
            };
        }
        if (!groupedData[monthKey][province].planData[plan].machines[machineNumber]) {
            groupedData[monthKey][province].planData[plan].machines[machineNumber] = {
                volume: 0,
                cost: 0
            };
        }

        groupedData[monthKey][province].planData[plan].totalVolume += volume;
        groupedData[monthKey][province].planData[plan].totalCost += cost;
        groupedData[monthKey][province].planData[plan].machines[machineNumber].volume += volume;
        groupedData[monthKey][province].planData[plan].machines[machineNumber].cost += cost;
    });

    populateFilters();
    renderData();
}

function populateFilters() {
    const sortedMonths = Array.from(availableMonths).sort((a, b) => b.localeCompare(a));
    monthFilter.innerHTML = '';
    
    const miniMonthFilter = document.getElementById('miniMonthFilter');
    if (miniMonthFilter) miniMonthFilter.innerHTML = '';

    sortedMonths.forEach(month => {
        let displayMonth = month;
        if (month !== 'ไม่ระบุวันที่') {
            const [year, monthNum] = month.split('-');
            const thaiYear = parseInt(year) + 543;
            const thaiMonths = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
            displayMonth = `${thaiMonths[parseInt(monthNum)] || monthNum} ${thaiYear}`;
        }
        
        // Populate hidden original filter (for backward compatibility if needed)
        monthFilter.insertAdjacentHTML('beforeend', `<button class="btn btn-outline-primary" data-value="${month}">${displayMonth}</button>`);
        
        // Populate mini filter
        if (miniMonthFilter) {
            const miniBtn = document.createElement('button');
            miniBtn.dataset.value = month;
            miniBtn.textContent = displayMonth;
            miniBtn.onclick = () => {
                currentMonthFilter = month;
                updateMiniMonthStyles();
                
                // Clear selected province and hide panels
                currentSelectedProvinceData = null;
                showProvincePanel(null);
                renderDailyGraph(null);
                
                renderData();
            };
            miniMonthFilter.appendChild(miniBtn);
        }
    });

    if (sortedMonths.length > 0 && (!currentMonthFilter || currentMonthFilter === 'all')) {
        currentMonthFilter = sortedMonths[0];
    }
    
    updateMiniMonthStyles();
    updateProvinceFilter();
}

function updateMiniMonthStyles() {
    const miniMonthFilter = document.getElementById('miniMonthFilter');
    if (miniMonthFilter) {
        Array.from(miniMonthFilter.children).forEach(btn => {
            if (btn.dataset.value === currentMonthFilter) {
                btn.className = 'btn btn-sm rounded-pill btn-primary fw-bold shadow-sm';
            } else {
                btn.className = 'btn btn-sm rounded-pill btn-outline-secondary border-0 text-muted';
                btn.style.backgroundColor = 'transparent';
            }
        });
    }
}

function updateProvinceFilter() {
    let availableProvsForMonth = new Set();
    
    if (currentMonthFilter && currentMonthFilter !== 'all' && groupedData[currentMonthFilter]) {
        Object.keys(groupedData[currentMonthFilter]).forEach(p => availableProvsForMonth.add(p));
    } else if (!currentMonthFilter || currentMonthFilter === 'all') {
        availableProvsForMonth = availableProvinces;
    }
    
    const sortedProvinces = Array.from(availableProvsForMonth).sort();
    
    if (currentProvinceFilter !== 'all' && !availableProvsForMonth.has(currentProvinceFilter)) {
        currentProvinceFilter = 'all';
    }

    provinceFilter.innerHTML = `<button class="btn btn-outline-primary ${currentProvinceFilter === 'all' ? 'active' : ''}" data-value="all">ทั้งหมด</button>`;
    sortedProvinces.forEach(province => {
        const isActive = (currentProvinceFilter === province) ? 'active' : '';
        provinceFilter.insertAdjacentHTML('beforeend', `<button class="btn btn-outline-primary ${isActive}" data-value="${province}">${province}</button>`);
    });
}

function setupEventListeners() {
    function setupButtonGroup(containerId, callback) {
        const container = document.getElementById(containerId);
        container.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                container.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                callback(e.target.dataset.value);
            }
        });
    }

    setupButtonGroup('monthFilter', (val) => { 
        currentMonthFilter = val; 
        currentSelectedProvinceData = null;
        updateProvinceFilter();
        renderData(); 
    });
    setupButtonGroup('planFilter', (val) => { currentPlanFilter = val; renderData(); });
    setupButtonGroup('provinceFilter', (val) => { currentProvinceFilter = val; renderData(); });

    resetFiltersBtn.addEventListener('click', () => {
        if (monthFilter.querySelector('button')) {
            monthFilter.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            const firstMonthBtn = monthFilter.querySelector('button');
            firstMonthBtn.classList.add('active');
            currentMonthFilter = firstMonthBtn.dataset.value;
        }
        
        planFilter.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        const allPlanBtn = planFilter.querySelector('[data-value="all"]');
        if (allPlanBtn) allPlanBtn.classList.add('active');
        currentPlanFilter = 'all';

        currentProvinceFilter = 'all';
        currentSelectedProvinceData = null;
        updateProvinceFilter();

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
    renderMapData();
    renderDailyGraph();
    renderFuelSources();
    
    if (!currentSelectedProvinceData) {
        if (currentMonthFilter && currentMonthFilter !== 'all') {
            showMonthlySummaryPanel(currentMonthFilter);
        } else {
            showProvincePanel(null);
        }
    }
}

function renderMapData() {
    if (mapBlinkInterval) {
        clearInterval(mapBlinkInterval);
        mapBlinkInterval = null;
    }
    if (!mapChart || !mapGeoJson) return;
    const selectedMonth = currentMonthFilter;
    const selectedPlan = currentPlanFilter;
    
    const provinceUsage = {};
    let maxVolume = 0;
    
    globalActiveSources.clear();
    
    let latestMonthForSources = selectedMonth;
    if (selectedMonth === 'all') {
        const availableMonthsArr = Object.keys(groupedData).filter(m => m !== 'ไม่ระบุวันที่').sort((a,b) => b.localeCompare(a));
        latestMonthForSources = availableMonthsArr.length > 0 ? availableMonthsArr[0] : 'all';
    }
    
    let monthsToProcess = selectedMonth !== 'all' ? [selectedMonth] : Object.keys(groupedData);
    
    monthsToProcess.forEach(mKey => {
        if (!groupedData[mKey]) return;
        const provincesData = groupedData[mKey];
        Object.keys(provincesData).forEach(province => {
            let vol = 0;
            let cost = 0;
            let machinesHtmlList = [];
            let sources = new Set(provincesData[province].sources || []);
            
            const provincePlans = provincesData[province].planData;
            Object.keys(provincePlans).forEach(plan => {
                if (selectedPlan !== 'all' && plan !== selectedPlan) return;
                vol += provincePlans[plan].totalVolume;
                cost += provincePlans[plan].totalCost;
                
                const pMachines = provincePlans[plan].machines;
                Object.keys(pMachines).forEach(m => {
                    machinesHtmlList.push({ name: m, vol: pMachines[m].volume, cost: pMachines[m].cost, plan: plan });
                });
            });
            
            if (vol > 0) {
                if (!provinceUsage[province]) provinceUsage[province] = { volume: 0, cost: 0, machines: [], sources: new Set() };
                provinceUsage[province].volume += vol;
                provinceUsage[province].cost += cost;
                provinceUsage[province].machines.push(...machinesHtmlList);
                
                if (selectedMonth !== 'all' || mKey === latestMonthForSources) {
                    sources.forEach(s => {
                        provinceUsage[province].sources.add(s);
                        globalActiveSources.add(s);
                    });
                }
                
                if (provinceUsage[province].volume > maxVolume) maxVolume = provinceUsage[province].volume;
            }
        });
    });
    const mapSeriesData = [];
    Object.keys(provinceUsage).forEach(thaiProv => {
        const engName = typeof getEngProvince === 'function' ? getEngProvince(thaiProv) : null;
        if (engName) {
            const planStats = {};

            provinceUsage[thaiProv].machines.forEach(m => {
                if (!planStats[m.plan]) planStats[m.plan] = { vol: 0, cost: 0, machines: {} };
                planStats[m.plan].vol += m.vol;
                planStats[m.plan].cost += (m.cost || 0);
                
                if (!planStats[m.plan].machines[m.name]) planStats[m.plan].machines[m.name] = { vol: 0 };
                planStats[m.plan].machines[m.name].vol += m.vol;
            });

            const plans = Object.keys(planStats).sort((a,b) => planStats[b].vol - planStats[a].vol);
            let dominantPlan = plans[0] || '';
            let areaColor = plans.length > 0 ? (planColors[plans[0]] || '#0369a1') : '#ffffff';

            mapSeriesData.push({
                name: engName,
                thaiName: thaiProv,
                plans: plans,
                planStats: planStats,
                sources: Array.from(provinceUsage[thaiProv].sources),
                value: provinceUsage[thaiProv].volume,
                cost: provinceUsage[thaiProv].cost,
                dominantPlan: dominantPlan,
                itemStyle: {
                    areaColor: areaColor,
                    borderColor: '#ffffff',
                    borderWidth: 1
                }
            });
        }
    });

    let selectedRegions = [];
    if (currentProvinceFilter !== 'all') {
        const engProv = typeof getEngProvince === 'function' ? getEngProvince(currentProvinceFilter) : null;
        if (engProv) {
            selectedRegions.push({ name: engProv, itemStyle: { areaColor: '#fde047', borderColor: '#d97706', borderWidth: 2, shadowColor: 'rgba(245, 158, 11, 0.4)', shadowBlur: 15 } });
        }
    }

    const option = {
        tooltip: {
            show: false
        },
        series: [
            {
                name: 'ปริมาณน้ำมัน',
                type: 'map',
                map: 'thailand',
                roam: true,
                zoom: 1,
                layoutCenter: ['50%', '50%'],
                layoutSize: '95%',
                scaleLimit: { min: 1, max: 10 },
                itemStyle: {
                    borderColor: '#cbd5e1',
                    borderWidth: 1.5,
                    areaColor: '#ffffff'
                },
                emphasis: {
                    itemStyle: {
                        areaColor: '#e2e8f0',
                        shadowBlur: 10,
                        shadowColor: 'rgba(0, 0, 0, 0.1)'
                    },
                    label: {
                        show: false
                    }
                },
                selectedMode: false,
                data: mapSeriesData
            }
        ]
    };

    if (selectedRegions.length > 0) {
        option.series[0].data = option.series[0].data.map(d => {
            if (d.name === selectedRegions[0].name) {
                return { ...d, itemStyle: selectedRegions[0].itemStyle };
            }
            return d;
        });
        
        if (!option.series[0].data.find(d => d.name === selectedRegions[0].name)) {
            option.series[0].data.push({
                name: selectedRegions[0].name,
                value: 0,
                itemStyle: selectedRegions[0].itemStyle
            });
        }
    }
    
    mapChart.setOption(option, true);
    mapChart.resize();

    // Setup blinking for multi-plan provinces
    const multiPlanProvs = mapSeriesData.filter(d => d.plans && d.plans.length > 1);
    if (multiPlanProvs.length > 0) {
        let blinkStep = 0;
        mapBlinkInterval = setInterval(() => {
            blinkStep++;
            const newData = option.series[0].data.map(d => {
                if (d.plans && d.plans.length > 1) {
                    const colorIndex = blinkStep % d.plans.length;
                    const c = planColors[d.plans[colorIndex]] || '#0369a1';
                    return {
                        ...d,
                        itemStyle: {
                            ...d.itemStyle,
                            areaColor: c
                        }
                    };
                }
                return d;
            });
            
            mapChart.setOption({
                series: [{
                    data: newData
                }]
            });
        }, 1200); // Blink every 1.2s
    }
}

function renderDailyGraph(provinceData = undefined) {
    if (!dailyChart) return;
    
    if (provinceData !== undefined) {
        currentSelectedProvinceData = provinceData;
    }
    
    const panel = document.getElementById('dailyGraphPanel');
    const selectedMonth = currentMonthFilter;
    const isMonthly = (!selectedMonth || selectedMonth === 'all');
    
    if (panel) {
        const wasHidden = panel.style.display === 'none';
        panel.style.display = 'block';
        if (wasHidden && dailyChart) {
            setTimeout(() => dailyChart.resize(), 50);
        }
    }
    
    const titleObj = document.getElementById('dailyGraphTitle');
    if (titleObj) {
        const scopeName = currentSelectedProvinceData ? currentSelectedProvinceData.thaiName : 'ภาพรวมทั้งประเทศ';
        titleObj.innerHTML = isMonthly ? `แนวโน้มการใช้น้ำมันรายเดือน: ${scopeName}` : `แนวโน้มการใช้น้ำมันรายวัน: ${scopeName}`;
    }
    
    const monthLabel = document.getElementById('dailyGraphMonthLabel');
    if (monthLabel) monthLabel.textContent = isMonthly ? 'ทุกเดือน' : formatMonthYear(selectedMonth);
    
    // Filter transactions
    const trendData = {}; // Format: { timeStr: { plan: volume } }
    const groupKeysSet = new Set();
    const usageTxs = allTransactions.filter(t => isOut(t) && isAirplaneDest(t));
    
    usageTxs.forEach(t => {
        if (!t.date || typeof t.date !== 'string') return;
        
        if (!isMonthly && t.date.substring(0, 7) !== selectedMonth) return;
        
        // Filter by selected plan if not 'all'
        const plan = getPlan(t.missions);
        if (currentPlanFilter !== 'all' && plan !== currentPlanFilter) return;
        
        const prov = t.unit ? t.unit.trim() : 'ไม่ระบุ';
        if (currentSelectedProvinceData && prov !== currentSelectedProvinceData.thaiName) return;
        
        let timeStr = isMonthly ? t.date.substring(0, 7) : t.date.split(' ')[0]; // YYYY-MM or YYYY-MM-DD
        const vol = parseFloat(t.volume_liters || t.volume) || 0;
        
        if (vol > 0) {
            let groupKey = plan; // ALWAYS group by plan
            
            if (!trendData[timeStr]) trendData[timeStr] = {};
            if (!trendData[timeStr][groupKey]) trendData[timeStr][groupKey] = 0;
            trendData[timeStr][groupKey] += vol;
            groupKeysSet.add(groupKey);
        }
    });
    
    const sortedDates = Object.keys(trendData).sort();
    
    if (sortedDates.length === 0) {
        if (panel) panel.style.display = 'none';
        return;
    }
    
    const xData = sortedDates.map(d => {
        if (isMonthly) {
            const parts = d.split('-');
            const thMonths = ['', 'ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
            return thMonths[parseInt(parts[1])] + ' ' + parts[0].substring(2);
        } else {
            const parts = d.split('-');
            return parseInt(parts[2]) + '/' + parseInt(parts[1]);
        }
    });
    
    const topKeys = Array.from(groupKeysSet).sort();

    const seriesData = topKeys.map(key => {
        const seriesItem = {
            name: key,
            type: 'line',
            smooth: true,
            symbol: 'circle',
            symbolSize: 5,
            lineStyle: { width: 3 },
            data: sortedDates.map(d => trendData[d][key] || 0)
        };
        
        // Always use theme colors for plans
        if (planColors[key]) {
            seriesItem.itemStyle = { color: planColors[key] };
            seriesItem.lineStyle = { width: 3, color: planColors[key] };
        }
        
        return seriesItem;
    });
    
    const option = {
        tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(255,255,255,0.95)',
            borderColor: '#e2e8f0',
            textStyle: { color: '#1e293b' },
            formatter: function(params) {
                let html = `<div style="font-weight:800; margin-bottom:6px; border-bottom:1px solid #e2e8f0; padding-bottom:4px;">วันที่ ${params[0].name}</div>`;
                // Sort tooltip by value descending
                const sortedParams = params.sort((a,b) => b.value - a.value);
                sortedParams.forEach(p => {
                    if (p.value > 0) {
                        html += `<div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                                    <span style="color:#64748b; font-size:0.8rem; margin-right:15px;">${p.marker} ${p.seriesName}</span>
                                    <span style="color:#0f172a; font-weight:800;">${formatNumber(p.value)} L</span>
                                 </div>`;
                    }
                });
                return html;
            }
        },
        legend: {
            data: topKeys,
            top: 0,
            type: 'scroll',
            textStyle: { color: '#475569', fontWeight: 600, textShadowColor: 'rgba(255,255,255,0.8)', textShadowBlur: 2 }
        },
        grid: {
            top: 35,
            right: 15,
            bottom: 20,
            left: 45,
            containLabel: true
        },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: xData,
            axisLine: { lineStyle: { color: 'rgba(0,0,0,0.1)' } },
            axisLabel: { color: '#475569', fontSize: 10, fontWeight: 700, textShadowColor: 'rgba(255,255,255,0.8)', textShadowBlur: 2 }
        },
        yAxis: {
            type: 'value',
            splitLine: { lineStyle: { color: 'rgba(0,0,0,0.05)', type: 'dashed' } },
            axisLabel: { 
                color: '#475569', 
                fontSize: 10,
                fontWeight: 700,
                textShadowColor: 'rgba(255,255,255,0.8)',
                textShadowBlur: 2,
                formatter: (val) => val >= 1000 ? (val/1000) + 'k' : val
            }
        },
        series: seriesData
    };
    
    dailyChart.setOption(option, true);
    setTimeout(() => {
        if (dailyChart && document.getElementById('dailyGraphPanel').style.display !== 'none') {
            dailyChart.resize();
        }
    }, 100);
}

// ==========================================
// Render Fuel Sources (Trucks if province selected)
// ==========================================
function renderFuelSources() {
    const fuelSourcesContainer = document.getElementById('fuelSourcesUnderGraph');
    
    // Hide trucks if viewing a past month
    const availableMonthsArr = Object.keys(groupedData).filter(m => m !== 'ไม่ระบุวันที่').sort((a,b) => b.localeCompare(a));
    const latestMonth = availableMonthsArr.length > 0 ? availableMonthsArr[0] : null;
    
    if (currentMonthFilter !== 'all' && currentMonthFilter !== latestMonth) {
        if (fuelSourcesContainer) fuelSourcesContainer.style.display = 'none';
        return;
    }

    let sourcesToRender = [];
    
    // 1. Trucks from selected province or global active sources
    if (typeof currentSelectedProvinceData !== 'undefined' && currentSelectedProvinceData && currentSelectedProvinceData.sources && currentSelectedProvinceData.sources.length > 0) {
        currentSelectedProvinceData.sources.forEach(sourceName => {
            const invItem = masterInventoryData.find(item => item.name === sourceName || item.source_name === sourceName);
            const isTruck = invItem && (invItem.type === 'truck' || sourceName.includes('รถ') || /^\d{2}-\d{4}/.test(sourceName));
            
            if (isTruck && !sourcesToRender.find(s => s.name === sourceName)) {
                sourcesToRender.push({ name: sourceName, isTruck: true, item: invItem });
            }
        });
    } else {
        // No province selected -> Show relevant active trucks based on filters
        globalActiveSources.forEach(sourceName => {
            const invItem = masterInventoryData.find(item => item.name === sourceName || item.source_name === sourceName);
            const isTruck = invItem && (invItem.type === 'truck' || sourceName.includes('รถ') || /^\d{2}-\d{4}/.test(sourceName));
            
            if (isTruck && !sourcesToRender.find(s => s.name === sourceName)) {
                sourcesToRender.push({ name: sourceName, isTruck: true, item: invItem });
            }
        });
    }
    
    if (sourcesToRender.length > 0) {
        let sourcesHtml = '';
        sourcesToRender.forEach(source => {
            const invItem = source.item;
            const currentStock = invItem ? (parseFloat(invItem.current_stock) || 0) : 0;
            const capacity = parseFloat(invItem.capacity) || 12000;
            const percent = Math.min(100, Math.max(0, (currentStock / capacity) * 100));
            
            let barColor = '#10b981'; // Green
            if (percent < 20) barColor = '#ef4444'; // Red
            else if (percent < 50) barColor = '#f59e0b'; // Orange
            
            const icon = '<i class="fas fa-truck-moving me-2 text-primary"></i>';
            
            sourcesHtml += `
                <div style="margin-bottom:8px;">
                    <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:2px; font-weight:800; color:#1e293b; text-shadow: 0 1px 2px rgba(255,255,255,0.9);">
                        <span>${icon}${source.name}</span>
                    </div>
                    
                    <div class="css-truck" style="position: relative; width: 160px; height: 28px; margin-top: 2px;">
                        <!-- Tank (Progress Bar) -->
                        <div style="position: absolute; left: 26px; right: 0; bottom: 6px; height: 20px; background: rgba(255,255,255,0.7); backdrop-filter: blur(4px); border-radius: 0 8px 8px 0; border: 1px solid rgba(255,255,255,0.8); box-shadow: inset 0 1px 4px rgba(0,0,0,0.1); overflow: hidden; z-index: 1;">
                            <!-- Liquid -->
                            <div style="position: absolute; top: 0; left: 0; height: 100%; width: ${percent}%; background: linear-gradient(90deg, ${barColor}aa, ${barColor}); transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);">
                                <div style="position: absolute; top: 0; left: 0; right: 0; height: 50%; background: linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 100%);"></div>
                            </div>
                            <!-- Text Overlay inside Tank -->
                            <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 0.6rem; font-weight: 800; color: #0f172a; text-shadow: 0 0 3px rgba(255,255,255,0.9), 0 1px 1px rgba(255,255,255,1); z-index: 2;">
                                ${formatNumber(currentStock)} / ${formatNumber(capacity)} L
                            </div>
                        </div>
                        
                        <!-- Cabin -->
                        <div style="position: absolute; left: 0; bottom: 6px; width: 28px; height: 22px; background: linear-gradient(135deg, #f8fafc, #cbd5e1); border-radius: 8px 3px 3px 4px; border: 1px solid #94a3b8; box-shadow: -1px 1px 3px rgba(0,0,0,0.15); z-index: 2;">
                            <!-- Window -->
                            <div style="position: absolute; top: 3px; left: 3px; width: 14px; height: 8px; background: linear-gradient(135deg, #bae6fd, #38bdf8); border-radius: 4px 2px 2px 2px; border: 1px solid #0284c7;"></div>
                            <!-- Headlight -->
                            <div style="position: absolute; bottom: 3px; left: 2px; width: 4px; height: 4px; background: #fef08a; border-radius: 50%; box-shadow: 0 0 3px #fef08a, 0 0 6px #fef08a;"></div>
                        </div>
                        
                        <!-- Wheels -->
                        <div style="position: absolute; left: 6px; bottom: 0; width: 10px; height: 10px; background: #1e293b; border-radius: 50%; border: 1px solid #cbd5e1; box-shadow: 0 1px 2px rgba(0,0,0,0.3); z-index: 3; display: flex; align-items: center; justify-content: center;">
                            <div style="width: 3px; height: 3px; background: #94a3b8; border-radius: 50%;"></div>
                        </div>
                        <div style="position: absolute; right: 10px; bottom: 0; width: 10px; height: 10px; background: #1e293b; border-radius: 50%; border: 1px solid #cbd5e1; box-shadow: 0 1px 2px rgba(0,0,0,0.3); z-index: 3; display: flex; align-items: center; justify-content: center;">
                            <div style="width: 3px; height: 3px; background: #94a3b8; border-radius: 50%;"></div>
                        </div>
                        <div style="position: absolute; right: 24px; bottom: 0; width: 10px; height: 10px; background: #1e293b; border-radius: 50%; border: 1px solid #cbd5e1; box-shadow: 0 1px 2px rgba(0,0,0,0.3); z-index: 3; display: flex; align-items: center; justify-content: center;">
                            <div style="width: 3px; height: 3px; background: #94a3b8; border-radius: 50%;"></div>
                        </div>
                    </div>
                </div>
            `;

        });
        
        if (fuelSourcesContainer) {
            fuelSourcesContainer.innerHTML = `
                <div style="margin-top:10px; padding-top:10px;">
                    <h6 style="margin-top: 0; margin-bottom: 12px; font-weight: 900; color: #1e293b; font-size: 1rem; text-shadow: 0 1px 3px rgba(255,255,255,0.9), 0 0 10px rgba(255,255,255,1);">
                        <i class="fas fa-oil-can me-2 text-primary"></i>สถานะความจุน้ำมันคงเหลือ
                    </h6>
                    ${sourcesHtml}
                </div>
            `;
            fuelSourcesContainer.style.display = 'block';
        }
    } else {
        if (fuelSourcesContainer) fuelSourcesContainer.style.display = 'none';
    }
}
