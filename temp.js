
        // ==================== GLOBALS ====================
        let allTx = [], filteredTx = [], budgetData = {}, inventorySources = [];
        let dailyChartI = null, pieI = null, costI = null;
        let tankChartInstances = {};
        let chartType = 'bar';
        let selectedPlan = null; // null = ทั้งหมด
        const BURN_DAYS = 14;

        const PLANS = [
            { key: 'แผนบรู', label: 'แผนบรู', color: '#f59e0b', style: 'yellow', icon: 'fa-cloud-rain' },
            { key: 'แผนยุทธศาสตร์', label: 'แผนยุทธ', color: '#3b82f6', style: 'blue', icon: 'fa-shield-alt' },
            { key: 'ดัดแปลงสภาพอากาศ (ฝุ่น)', label: 'ดัดแปลง (ฝุ่น)', color: '#06b6d4', style: 'cyan', icon: 'fa-smog' },
            { key: 'ดัดแปลงสภาพอากาศ (ลูกเห็บ)', label: 'ดัดแปลง (ลูกเห็บ)', color: '#ef4444', style: 'red', icon: 'fa-gem' },
        ];

        const planBadgeColor = {
            'แผนบรู': '#10b981', 'แผนยุทธศาสตร์': '#eab308',
            'ดัดแปลงสภาพอากาศ (ฝุ่น)': '#ef4444', 'ดัดแปลงสภาพอากาศ (ลูกเห็บ)': '#8b5cf6'
        };
        const planShort = { 'แผนบรู': 'บรู', 'แผนยุทธศาสตร์': 'ยุทธ', 'ดัดแปลงสภาพอากาศ (ฝุ่น)': 'ฝุ่น', 'ดัดแปลงสภาพอากาศ (ลูกเห็บ)': 'ลูกเห็บ' };

        function getPlan(missions) {
            const s = (missions || '').toString();
            if (s.includes('ลูกเห็บ')) return 'ดัดแปลงสภาพอากาศ (ลูกเห็บ)';
            if (s.includes('ฝุ่น') || s.includes('ดัดแปลงสภาพอากาศ')) return 'ดัดแปลงสภาพอากาศ (ฝุ่น)';
            if (s.includes('บรู') || s.includes('ฝนหลวง') || s.includes('บินสำรวจ')) return 'แผนบรู';
            return 'แผนยุทธศาสตร์';
        }
        function fmt(n, d = 0) { if (n == null || isNaN(n)) return '0'; return Number(n).toLocaleString('th-TH', { minimumFractionDigits: d, maximumFractionDigits: d }); }
        function fmtD(d) { if (!d) return '-'; const p = d.split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${+p[0] + 543}` : d; }
        function fmtDShort(d) { if (!d) return ''; const p = d.split('-'); return p.length === 3 ? `${p[2]}/${p[1]}` : d; }
        function getVol(t) { return parseFloat(t.volume_liters) || parseFloat(t.volume) || 0; }
        function isOut(t) {
            const ty = (t.transaction_type || '').toLowerCase();
            return ty.includes('จ่าย') || ty.includes('dispense') || ty.includes('เติมน้ำมัน') ||
                (ty.includes('ซื้อ') && (t.destination_name || '').match(/เครื่องบิน|c208|casa|nc212|l410|bell|aw|h130|ska|caravan|skycourier/i));
        }
        function isIn(t) {
            const ty = (t.transaction_type || '').toLowerCase();
            return ty.includes('ซื้อ') || ty.includes('เติมเข้า') || ty.includes('purchase');
        }
        // ตัดเฉพาะปรับยอด — ไม่ตัดโอนย้าย (โอนย้ายยังเป็นการเคลื่อนไหวของน้ำมัน)
        function isAdjustment(t) {
            const ty = (t.transaction_type || '').toLowerCase();
            return ty.includes('ปรับยอด') || (ty.includes('adjust') && !ty.includes('โอน'));
        }
        // fuzzy หา budget plan key ให้ match แม้ key ใน Google Sheets จะต่างกันนิดหน่อย
        function findBudgetPlan(planKey) {
            if (!budgetData.plans) return null;
            if (budgetData.plans[planKey]) return budgetData.plans[planKey];
            const keys = Object.keys(budgetData.plans);
            let found = null;
            if (planKey.includes('ลูกเห็บ'))
                found = keys.find(k => k.includes('ลูกเห็บ'));
            else if (planKey.includes('ฝุ่น'))
                found = keys.find(k => k.includes('ฝุ่น') && !k.includes('ลูกเห็บ'));
            else if (planKey.includes('บรู'))
                found = keys.find(k => k.includes('บรู'));
            else if (planKey.includes('ยุทธ'))
                found = keys.find(k => k.includes('ยุทธ'));
            return found ? budgetData.plans[found] : null;
        }
        function groupByDate(arr) { const m = {}; arr.forEach(t => { if (t.date) m[t.date] = (m[t.date] || []).concat(t); }); return m; }
        function trunc(s, n) { return s && s.length > n ? s.slice(0, n) + '…' : s; }

        // ==================== INIT ====================
        document.addEventListener('DOMContentLoaded', () => {
            setDefaultDates();
            loadData();
            document.getElementById('refreshBtn').addEventListener('click', loadData);
        });

        function setDefaultDates() {
            const today = new Date();
            // เริ่มต้นปีงบประมาณ 1 ต.ค. (ปีปัจจุบันถ้าเดือน < ต.ค. ใช้ปีก่อน)
            const fiscalYear = today.getMonth() >= 9 ? today.getFullYear() : today.getFullYear() - 1;
            document.getElementById('filterStart').value = `${fiscalYear}-10-01`;
            document.getElementById('filterEnd').value = today.toISOString().slice(0, 10);
        }

        // ==================== LOAD ====================
        async function loadData() {
            showLoad(true);
            try {
                document.getElementById('loadingText').textContent = 'เชื่อมต่อ Google Sheets...';
                const [txR, bdR, invR] = await Promise.all([
                    fetch(`${GOOGLE_SCRIPT_URL}?action=getTransactionLogs&sheetsId=${GOOGLE_SHEETS_ID}&gid=${SHEET_GIDS.TRANSACTION_HISTORY}`),
                    fetch(`${GOOGLE_SCRIPT_URL}?action=getBudgetData&sheetsId=${GOOGLE_SHEETS_ID}&gid=${SHEET_GIDS.BUDGET}`),
                    fetch(`${GOOGLE_SCRIPT_URL}?action=getMasterData&sheetsId=${GOOGLE_SHEETS_ID}&gid=${SHEET_GIDS.INVENTORY}`)
                ]);
                const txD = await txR.json(), bdD = await bdR.json(), invD = await invR.json();
                if (txD.success && Array.isArray(txD.data)) allTx = txD.data;
                if (bdD.success && bdD.data) budgetData = bdD.data;
                if (invD.success && Array.isArray(invD.data)) inventorySources = invD.data;
                document.getElementById('lastUpdatedText').textContent = 'อัปเดต ' + new Date().toLocaleTimeString('th-TH');
                applyDateFilter();
            } catch (e) {
                console.error(e);
                document.getElementById('lastUpdatedText').textContent = 'โหลดล้มเหลว';
            }
            showLoad(false);
        }
        function showLoad(on) { document.getElementById('loadingOverlay').classList.toggle('active', on); }

        // ==================== FILTER ====================
        function setPlanFilter(plan, btn) {
            selectedPlan = plan;
            document.querySelectorAll('#planFilterPills .tab-pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyDateFilter();
        }

        function applyDateFilter() {
            const s = document.getElementById('filterStart').value;
            const e = document.getElementById('filterEnd').value;
            filteredTx = allTx.filter(t => {
                if (!t.date) return false;
                if (s && t.date < s) return false;
                if (e && t.date > e) return false;
                // plan filter: applies only to dispense transactions (in-transactions don't have plan)
                if (selectedPlan && isOut(t) && getPlan(t.missions) !== selectedPlan) return false;
                return true;
            });
            document.getElementById('filterCount').textContent = filteredTx.length;
            renderAll();
        }
        function resetFilter() { setDefaultDates(); selectedPlan = null; document.querySelectorAll('#planFilterPills .tab-pill').forEach((b, i) => b.classList.toggle('active', i === 0)); applyDateFilter(); }

        // ==================== RENDER ALL ====================
        function renderAll() {
            const out = filteredTx.filter(isOut);
            const inp = filteredTx.filter(t => isIn(t) && !isOut(t));
            renderAlerts();
            renderDetailedMonthlySummary(out, inp);
        }

        // ==================== ALERTS ====================
        function renderAlerts() {
            const c = document.getElementById('alertBanners');
            c.innerHTML = '';
            if (!budgetData.plans) return;
            PLANS.forEach(plan => {
                const p = budgetData.plans[plan.key];
                if (!p || p.budget <= 0) return;
                const pct = (p.remaining / p.budget) * 100;
                if (pct <= 10) c.innerHTML += `<div class="abanner r"><i class="fas fa-exclamation-triangle"></i>งบประมาณ <strong>${plan.label}</strong> เหลือน้อยมาก! (${fmt(p.remaining)} บาท · ${fmt(pct, 1)}%)</div>`;
                else if (pct <= 25) c.innerHTML += `<div class="abanner y"><i class="fas fa-exclamation-circle"></i>งบประมาณ <strong>${plan.label}</strong> ใกล้หมด (${fmt(p.remaining)} บาท · ${fmt(pct, 1)}%)</div>`;
            });
        }

        let globalChartI = null;
        const monthlyChartInstances = {};

        // ==================== DETAILED MONTHLY ====================
        function renderDetailedMonthlySummary(out, inp) {
            // Clean up old charts
            if (globalChartI) { globalChartI.destroy(); globalChartI = null; }
            Object.values(monthlyChartInstances).forEach(c => c.destroy());
            for (let k in monthlyChartInstances) delete monthlyChartInstances[k];

            const monthMap = {};
            // Gather data for IN transactions (purchases/refills)
            inp.forEach(t => {
                if (!t.date) return;
                const m = t.date.substring(0, 7);
                if (!monthMap[m]) monthMap[m] = {
                    key: m, liters: 0, cost: 0,
                    days: {}, sources: {}, aircrafts: {}, missions: {}, provinces: {}
                };
                const vol = getVol(t);
                const cost = parseFloat(t.total_cost) || 0;
                
                // The user explicitly requested: "แยกตามต้นทาง (รับเข้า/จ่ายออก) อันนี้ให้เอามาจาก คอลั่ม E"
                // So ONLY use t.source_name (Column E) for this table. Do not add t.destination_name to sources!
                const srcRaw = (t.source_name || 'ไม่ระบุ').trim();
                const destRaw = (t.destination_name || 'ไม่ระบุ').trim();
                
                let srcLabel = srcRaw;
                if (srcRaw.includes('ปตท') || srcRaw.includes('PTT') || (t.transaction_type && t.transaction_type.includes('ซื้อ'))) {
                    if (destRaw && destRaw !== 'ไม่ระบุ') {
                        srcLabel = `${srcRaw} ➡️ ${destRaw}`;
                    }
                }
                
                // For Sources table, ONLY use the original raw source name (srcRaw) to group them all together
                if (srcRaw && srcRaw !== 'ไม่ระบุ') {
                    monthMap[m].sources[srcRaw] = (monthMap[m].sources[srcRaw] || {liters: 0, cost: 0, inLiters: 0, outLiters: 0});
                    
                    if (srcRaw.includes('ปตท') || srcRaw.includes('PTT') || (t.transaction_type && t.transaction_type.includes('ซื้อ'))) {
                        monthMap[m].sources[srcRaw].outLiters += vol;
                        monthMap[m].sources[srcRaw].liters += vol;
                        monthMap[m].sources[srcRaw].cost += cost;
                    } else {
                        monthMap[m].sources[srcRaw].inLiters += vol;
                    }
                }
                
                const dest = (t.destination_name || 'ไม่ระบุ').trim();
                
                // Add to aircrafts table as requested (to show the purchase cost and item)
                let aircraftName = '';
                const acNum = (t.aircraft_number && String(t.aircraft_number).trim() !== '' && String(t.aircraft_number).trim() !== '-') ? String(t.aircraft_number).trim() : '';
                const acType = (t.aircraft_type && String(t.aircraft_type).trim() !== '') ? String(t.aircraft_type).trim() : '';
                
                if (acNum) {
                    if (acType) {
                        aircraftName = `${acType} : ${acNum}`;
                    } else {
                        if (acNum === '1615') aircraftName = 'BELL 206B3 : 1615';
                        else if (['1916', '1922', '1933', '1934'].includes(acNum)) aircraftName = 'CARAVAN C208 : ' + acNum;
                        else aircraftName = acNum;
                    }
                }
                
                if (!aircraftName) {
                    aircraftName = srcLabel;
                }
                
                const msn = getPlan(t.missions);
                const unitProv = (t.unit || 'ไม่ระบุ').trim();
                const aircraftKey = `${aircraftName}|||${msn}|||${unitProv}|||${dest}`;
                monthMap[m].aircrafts[aircraftKey] = (monthMap[m].aircrafts[aircraftKey] || {liters: 0, cost: 0});
                monthMap[m].aircrafts[aircraftKey].liters += vol;
                monthMap[m].aircrafts[aircraftKey].cost += cost;
                
                // Track missions for IN transactions
                monthMap[m].missions[msn] = (monthMap[m].missions[msn] || {liters: 0, cost: 0});
                monthMap[m].missions[msn].liters += vol;
                monthMap[m].missions[msn].cost += cost;
                
                // Track provinces for IN transactions
                if (unitProv && unitProv !== 'ไม่ระบุ' && unitProv !== '') {
                    const provKey = `${unitProv}|||${msn}`;
                    monthMap[m].provinces[provKey] = (monthMap[m].provinces[provKey] || {liters: 0, cost: 0});
                    monthMap[m].provinces[provKey].liters += vol;
                    monthMap[m].provinces[provKey].cost += cost;
                }
                
                // Add to total cost and volume
                monthMap[m].liters += vol;
                monthMap[m].cost += cost;
                
                // Track daily usage within month
                // Removed days mapping from inp
            });
            
            // Gather data for all out transactions (dispenses)
            out.forEach(t => {
                if (!t.date) return;
                const m = t.date.substring(0, 7); // YYYY-MM
                if (!monthMap[m]) monthMap[m] = {
                    key: m,
                    liters: 0, cost: 0,
                    days: {}, sources: {}, aircrafts: {}, missions: {}, provinces: {}
                };
                
                const vol = getVol(t);
                const cost = parseFloat(t.total_cost) || 0;
                
                monthMap[m].liters += vol;
                monthMap[m].cost += cost;
                
                // Track daily usage within month
                if (!monthMap[m].days[t.date]) monthMap[m].days[t.date] = {};
                const planName = getPlan(t.missions);
                monthMap[m].days[t.date][planName] = (monthMap[m].days[t.date][planName] || 0) + vol;
                
                // Track source
                const src = (t.source_name || 'ไม่ระบุ').trim();
                monthMap[m].sources[src] = (monthMap[m].sources[src] || {liters: 0, cost: 0, inLiters: 0, outLiters: 0});
                monthMap[m].sources[src].liters += vol;
                monthMap[m].sources[src].outLiters += vol;
                monthMap[m].sources[src].cost += cost;
                
                const destName = (t.destination_name || '').trim();
                
                let aircraft = null;
                const acNum = (t.aircraft_number && String(t.aircraft_number).trim() !== '' && String(t.aircraft_number).trim() !== '-') ? String(t.aircraft_number).trim() : '';
                const acType = (t.aircraft_type && String(t.aircraft_type).trim() !== '') ? String(t.aircraft_type).trim() : '';
                
                if (acNum) {
                    if (acType) {
                        aircraft = `${acType} : ${acNum}`;
                    } else {
                        if (acNum === '1615') aircraft = 'BELL 206B3 : 1615';
                        else if (['1916', '1922', '1933', '1934'].includes(acNum)) aircraft = 'CARAVAN C208 : ' + acNum;
                        else aircraft = acNum;
                    }
                } else if (destName.match(/c208|casa|nc212|l410|bell|aw\d|h130|ska\d|caravan|skycourier/i)) {
                    aircraft = destName;
                }
                
                let prov = (t.unit && String(t.unit).trim() !== '') ? String(t.unit).trim() : (destName || 'ไม่ระบุ');
                const destF = (t.destination_name || 'ไม่ระบุ').trim();
                
                const msn = getPlan(t.missions);
                
                if (aircraft && aircraft !== 'ไม่ระบุ') {
                    const acKey = `${aircraft}|||${msn}|||${prov}|||${destF}`;
                    monthMap[m].aircrafts[acKey] = (monthMap[m].aircrafts[acKey] || {liters: 0, cost: 0});
                    monthMap[m].aircrafts[acKey].liters += vol;
                    monthMap[m].aircrafts[acKey].cost += cost;
                }
                
                monthMap[m].missions[msn] = (monthMap[m].missions[msn] || {liters: 0, cost: 0});
                monthMap[m].missions[msn].liters += vol;
                monthMap[m].missions[msn].cost += cost;
                
                if (prov && prov !== 'ไม่ระบุ' && prov !== '') {
                    const provKey = `${prov}|||${msn}`;
                    monthMap[m].provinces[provKey] = (monthMap[m].provinces[provKey] || {liters: 0, cost: 0});
                    monthMap[m].provinces[provKey].liters += vol;
                    monthMap[m].provinces[provKey].cost += cost;
                }
            });
            
            const months = Object.keys(monthMap).sort().reverse();
            const container = document.getElementById('detailedMonthlyContainer');
            
            if (!months.length) {
                container.innerHTML = '<div style="text-align:center;color:var(--muted);padding:2rem;background:#fff;border-radius:12px;border:1px solid var(--border);">ไม่มีข้อมูลในรอบเวลาที่เลือก</div>';
                
                // Clear global chart
                const ctxG = document.getElementById('globalMonthlyChart');
                if(ctxG) {
                   const cG = ctxG.getContext('2d');
                   cG.clearRect(0, 0, ctxG.width, ctxG.height);
                }
                return;
            }

            const monthNames = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
            
            // 1. Render Global Monthly Bar Chart
            const sortedMonthsAsc = [...months].reverse();
            const gLabels = sortedMonthsAsc.map(m => {
                const parts = m.split('-');
                return monthNames[parseInt(parts[1])-1] + ' ' + (parseInt(parts[0])+543).toString().slice(-2);
            });
            const gData = sortedMonthsAsc.map(m => monthMap[m].liters);
            
            const ctxGlobal = document.getElementById('globalMonthlyChart').getContext('2d');
            const grad = ctxGlobal.createLinearGradient(0, 0, 0, 300);
            grad.addColorStop(0, 'rgba(37, 99, 235, 0.8)');
            grad.addColorStop(1, 'rgba(37, 99, 235, 0.2)');

            globalChartI = new Chart(ctxGlobal, {
                type: 'bar',
                data: {
                    labels: gLabels,
                    datasets: [{
                        label: 'ปริมาณรวม (L)',
                        data: gData,
                        backgroundColor: grad,
                        borderColor: '#2563eb',
                        borderWidth: 1,
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: { label: c => ` ${fmt(c.raw, 1)} L` },
                            titleFont: { family: 'Sarabun' }, bodyFont: { family: 'Sarabun' }
                        }
                    },
                    scales: {
                        x: { grid: { display: false }, ticks: { font: { family: 'Sarabun', size: 12 } } },
                        y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { family: 'Sarabun', size: 12 }, callback: v => fmt(v) } }
                    }
                }
            });

            // 2. Render Cards for each Month
            let html = '';
            months.forEach(m => {
                const data = monthMap[m];
                const parts = m.split('-');
                const mLabel = monthNames[parseInt(parts[1])-1] + ' ' + (parseInt(parts[0])+543);
                


                const renderTable = (obj, icon, title, isPlan=false, extraClass='') => {
                    const sorted = Object.entries(obj).sort((a,b)=>b[1].liters-a[1].liters);
                    if(!sorted.length) return `<div class="text-muted text-center py-4" style="font-size:.85rem;">ไม่มีข้อมูล</div>`;
                    
                    const maxL = sorted.length ? sorted[0][1].liters : 1;
                    
                    let rows = sorted.map(([name, vals], i) => {
                        const pct = (vals.liters / data.liters) * 100;
                        const w = (vals.liters / maxL) * 100;
                        
                        let badgeHtml = ``;
                        if(isPlan) {
                           badgeHtml = `<span class="bp" style="background:${planBadgeColor[name]}22;color:${planBadgeColor[name]};border:1px solid ${planBadgeColor[name]}44;font-size:0.7rem;">${planShort[name] || name}</span>`;
                        }
                        
                        let nameHtml = isPlan ? badgeHtml : name;
                        if (name.includes('|||')) {
                            const parts = name.split('|||');
                            const acName = parts[0];
                            const fullPlan = parts[1];
                            const provK = parts[2] || '';
                            let destF = parts[3] || '';
                            
                            // Prevent duplicate destination text if it's already in the name or province
                            if (destF && (acName.includes(destF) || provK.includes(destF))) {
                                destF = '';
                            }
                            
                            const pColor = typeof planBadgeColor !== 'undefined' && planBadgeColor[fullPlan] ? planBadgeColor[fullPlan] : '#475569';
                            const pBg = pColor + '22';
                            const pBorder = pColor + '44';
                            const pShort = (typeof planShort !== 'undefined' && planShort[fullPlan]) ? planShort[fullPlan] : fullPlan;
                            
                            let detailsHtml = '';
                            if (fullPlan && fullPlan !== 'ไม่ระบุ') {
                                detailsHtml += `<span class="bp" style="background:${pBg};color:${pColor};border:1px solid ${pBorder};font-size:0.65rem;padding:1px 4px;">${pShort}</span>`;
                            }
                            if (provK && provK !== 'ไม่ระบุ' && provK !== '') {
                                detailsHtml += `<span style="font-size:0.75rem;color:var(--muted);"><i class="fas fa-map-marker-alt" style="color:#94a3b8;"></i> ${provK}</span>`;
                            }
                            if (destF && destF !== 'ไม่ระบุ' && destF !== '') {
                                detailsHtml += `<span style="font-size:0.75rem;color:var(--muted);"><i class="fas fa-plane-arrival" style="color:#94a3b8;"></i> ${destF}</span>`;
                            }

                            nameHtml = `<div style="display:flex;align-items:center;flex-wrap:wrap;gap:6px;padding:2px 0;">
                                            <span style="font-weight:700;color:#1e293b;font-size:0.85rem;">${acName}</span>
                                            ${detailsHtml}
                                        </div>`;
                        }
                        
                        return `
                        <tr>
                            <td style="width:30px;text-align:center;color:var(--muted);font-weight:600;padding:0.4rem;">${i+1}</td>
                            <td style="padding:0.4rem;">${nameHtml}</td>
                            <td class="text-end" style="font-weight:700;padding:0.4rem;">${fmt(vals.liters, 1)} L</td>
                            <td style="width:70px;vertical-align:middle;padding:0.4rem;">
                                <div style="height:5px;background:#e2e8f0;border-radius:3px;overflow:hidden;width:100%;">
                                    <div style="height:100%;width:${w}%;background:var(--primary);border-radius:3px;"></div>
                                </div>
                            </td>
                            <td class="text-end" style="color:var(--muted);font-size:.75rem;padding:0.4rem;">${fmt(pct,1)}%</td>
                            <td class="text-end" style="color:var(--green);font-size:.8rem;padding:0.4rem;">${fmt(vals.cost)} ฿</td>
                        </tr>`;
                    }).join('');
                    
                    return `
                    <div class="${extraClass}" style="background:#fff;border:1px solid var(--border);border-radius:8px;margin-bottom:0.75rem;overflow:hidden;">
                        <div style="background:#f8fafc;padding:.5rem .75rem;font-size:.85rem;font-weight:700;color:#1e293b;border-bottom:1px solid var(--border);">
                            <i class="${icon} me-2" style="color:var(--muted);"></i>${title}
                        </div>
                        <div style="overflow-x:auto;">
                            <table class="table table-sm table-hover mb-0" style="font-size:.8rem;">
                                <tbody>${rows}</tbody>
                            </table>
                        </div>
                    </div>`;
                };
                
                html += `
                <div class="dash-card mb-4" style="border:1px solid #cbd5e1; box-shadow:0 10px 15px -3px rgba(0,0,0,.05);">
                    <div class="dc-head" style="background:#f8fafc;border-bottom:1px solid var(--border);padding:1.5rem;">
                        <div class="d-flex w-100 justify-content-between align-items-center flex-wrap gap-3">
                            <div style="font-size:1.4rem;font-weight:800;color:#1e293b;">
                                <i class="far fa-calendar-alt me-2" style="color:#2563eb;"></i>${mLabel}
                            </div>
                            <div class="d-flex gap-4 text-end">
                                <div>
                                    <div style="font-size:.8rem;color:var(--muted);font-weight:600;">ปริมาณรวม</div>
                                    <div style="font-size:1.5rem;font-weight:900;color:var(--primary);line-height:1;">${fmt(data.liters, 1)} <small style="font-size:1rem;">L</small></div>
                                </div>
                                <div>
                                    <div style="font-size:.8rem;color:var(--muted);font-weight:600;">มูลค่ารวม</div>
                                    <div style="font-size:1.5rem;font-weight:900;color:var(--green);line-height:1;">${fmt(data.cost)} <small style="font-size:1rem;">฿</small></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="dc-body" style="padding:1.5rem;">
                        <div class="row g-4">
                            <!-- Left Col: Chart -->
                            <div class="col-xl-5">
                                <div style="font-weight:700;color:#1e293b;margin-bottom:1rem;"><i class="fas fa-chart-bar me-2" style="color:#64748b;"></i>การใช้งานรายวัน</div>
                                <div style="height:320px;margin-bottom:2rem;"><canvas id="monthChart_${m}"></canvas></div>
                                
                                ${renderTable(data.provinces, 'fas fa-map', 'สรุปการใช้งานรายจังหวัด (ระบุแผน)')}
                            </div>
                            
                            <!-- Right Col: Tables -->
                            <div class="col-xl-7">
                                ${renderTable(data.missions, 'fas fa-tasks', 'แยกตามภารกิจ (แผน)', true)}
                                ${renderTable(data.sources, 'fas fa-gas-pump', 'แยกตามต้นทาง (ยอดเบิกจ่าย)', false, 'hide-on-print')}
                                ${renderTable(data.aircrafts, 'fas fa-plane', 'แยกตามเครื่องบิน (ระบุแผนและจังหวัด)', false, 'hide-on-print')}
                            </div>
                        </div>
                    </div>
                </div>`;
            });
            
            container.innerHTML = html;
            
            // 3. Render Daily Charts for each month
            months.forEach(m => {
                const cEl = document.getElementById('monthChart_' + m);
                if(!cEl) return;
                
                const daysMap = monthMap[m].days;
                const dKeys = Object.keys(daysMap).sort(); // YYYY-MM-DD
                const labels = dKeys.map(d => parseInt(d.split('-')[2], 10).toString()); // Just the day number
                
                // Get all unique plans across this month
                const allPlans = new Set();
                dKeys.forEach(d => {
                    if (typeof daysMap[d] === 'object') {
                        Object.keys(daysMap[d]).forEach(p => allPlans.add(p));
                    }
                });
                
                const planColors = {
                    'แผนยุทธศาสตร์': '#eab308', // yellow
                    'แผนปฏิบัติการ': '#10b981', // green
                    'สนับสนุน': '#8b5cf6', // purple
                    'ดัดแปลงสภาพอากาศ (ลูกเห็บ)': '#8b5cf6', // purple
                    'ดัดแปลงสภาพอากาศ (ฝุ่น)': '#ef4444', // red
                    'แผนบรู': '#10b981', // green
                    'ไม่ระบุ': '#94a3b8' // gray
                };
                
                const planColorsBg = {
                    'แผนยุทธศาสตร์': 'rgba(234, 179, 8, 0.1)',
                    'แผนปฏิบัติการ': 'rgba(16, 185, 129, 0.1)',
                    'สนับสนุน': 'rgba(139, 92, 246, 0.1)',
                    'ดัดแปลงสภาพอากาศ (ลูกเห็บ)': 'rgba(139, 92, 246, 0.1)',
                    'ดัดแปลงสภาพอากาศ (ฝุ่น)': 'rgba(239, 68, 68, 0.1)',
                    'แผนบรู': 'rgba(16, 185, 129, 0.1)',
                    'ไม่ระบุ': 'rgba(148, 163, 184, 0.1)'
                };

                const datasets = Array.from(allPlans).map(plan => {
                    const dataVals = dKeys.map(d => {
                        return (typeof daysMap[d] === 'object') ? (daysMap[d][plan] || 0) : 0;
                    });
                    const color = planColors[plan] || '#0ea5e9';
                    const bgColor = planColorsBg[plan] || 'rgba(14, 165, 233, 0.1)';
                    return {
                        label: plan,
                        data: dataVals,
                        backgroundColor: bgColor,
                        borderColor: color,
                        borderWidth: 2,
                        fill: false,
                        tension: 0.3,
                        pointRadius: 3,
                        pointBackgroundColor: '#fff',
                        pointBorderColor: color
                    };
                });
                
                const ctx = cEl.getContext('2d');
                monthlyChartInstances[m] = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: datasets
                    },
                    options: {
                        responsive: true, maintainAspectRatio: false,
                        plugins: { legend: { display: true, position: 'bottom', labels: { font: { family: 'Sarabun', size: 10 } } } },
                        scales: {
                            x: { grid: { display: false }, title: { display:true, text:'วันที่', font:{family:'Sarabun',size:10} } },
                            y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { family: 'Sarabun', size: 10 } } }
                        }
                    }
                });
            });
        }
    
    
        function printDashboard() {
            const printContent = document.getElementById('dashboardContent').innerHTML;
            const printWindow = window.open('', '_blank');
            printWindow.document.open();
            
            const htmlSafe = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>พิมพ์รายงานการใช้งานน้ำมัน</title>
                    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
                    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
                    <style>
                        @page { size: A4 portrait; margin: 10mm; }
                        body {
                            font-family: 'Sarabun', sans-serif;
                            background: #fff !important;
                            color: #000 !important;
                            margin: 0;
                            padding: 0;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        .navbar, .hero, .btn, #refreshBtn, .hide-on-print, #loadingOverlay { 
                            display: none !important; 
                        }
                        .container-fluid, .row, .col-xl-5, .col-xl-7 {
                            display: block !important;
                            width: 100% !important;
                            margin: 0 !important;
                            padding: 0 !important;
                        }
                        .dash-card { 
                            border: none !important; 
                            box-shadow: none !important; 
                            padding: 0 !important; 
                            margin: 0 0 10mm 0 !important; 
                            page-break-inside: avoid !important;
                            page-break-after: always !important; 
                        }
                        .dash-card:last-child { 
                            page-break-after: auto !important; 
                        }
                        .table { 
                            font-size: 11px !important; 
                            width: 100% !important; 
                            border-collapse: collapse !important; 
                            margin-bottom: 10px !important; 
                        }
                        .table th { 
                            background: #1e293b !important; 
                            color: #fff !important; 
                        }
                        .table th, .table td { 
                            padding: 4px !important; 
                            border: 1px solid #ddd !important; 
                        }
                        .bp {
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        .dc-head { padding: 10px 0 !important; border-bottom: 2px solid #000 !important; }
                        .dc-title { font-size: 14px !important; color: #000 !important; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <div class="container-fluid" style="padding:0; margin:0;">
                        ${printContent}
                    </div>
                    ` + '<scr' + 'ipt>' + `
                        window.onload = function() {
                            setTimeout(() => {
                                window.print();
                                window.onafterprint = function() { window.close(); };
                            }, 500);
                        };
                    ` + '</scr' + 'ipt>' + `
                </body>
                </html>
            `;
            
            printWindow.document.write(htmlSafe);
            printWindow.document.close();
        }
    