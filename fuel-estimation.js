let currentPricePerLiter = 0;
let allTransactions = [];

const aircraftData = {
    "CARAVAN": { name: "CARAVAN C208 / GRAND / EX", fuel: 215 },
    "CASA": { name: "CASA - 300 / 400", fuel: 265 },
    "NC212i": { name: "NC212i", fuel: 370 },
    "SKYCOURIER": { name: "SKYCOURIER", fuel: 660 },
    "L410": { name: "L410", fuel: 300 },
    "SKA": { name: "SKA - 350", fuel: 475 },
    "CN235": { name: "CN - 235", fuel: 750 },
    "BELL206": { name: "BELL 206B3", fuel: 110 },
    "BELL407": { name: "BELL 407 / 407GXP", fuel: 190 },
    "BELL412": { name: "BELL 412 EP", fuel: 425 },
    "AS350": { name: "AS350 B2", fuel: 180 },
    "H130": { name: "H130 T2", fuel: 190 },
    "AW139": { name: "AW139", fuel: 500 }
};

document.addEventListener('DOMContentLoaded', () => {
    init();
    setupEventListeners();
});

async function init() {
    // Try to load price from localStorage first (for speed)
    const savedPrices = localStorage.getItem('fuelPrices');
    if (savedPrices) {
        try {
            const priceData = JSON.parse(savedPrices);
            currentPricePerLiter = parseFloat(priceData.pricePerLiter) || 0;
            updatePriceDisplay();
        } catch (e) {
            console.error('Error parsing localStorage price data', e);
        }
    }
    
    // Fetch latest price from Google Sheets
    try {
        if (typeof GOOGLE_SCRIPT_URL !== 'undefined' && typeof GOOGLE_SHEETS_ID !== 'undefined' && typeof SHEET_GIDS !== 'undefined') {
            const url = `${GOOGLE_SCRIPT_URL}?action=getCurrentPrices&sheetsId=${GOOGLE_SHEETS_ID}&gid=${SHEET_GIDS.PRICE_HISTORY}`;
            const response = await fetch(url);
            const result = await response.json();
            
            if (result.success) {
                currentPricePerLiter = parseFloat(result.data.pricePerLiter) || 0;
                
                // Update localStorage
                const priceData = {
                    pricePerLiter: result.data.pricePerLiter,
                    pricePerDrum: result.data.pricePerDrum,
                    lastUpdated: result.data.lastUpdated
                };
                localStorage.setItem('fuelPrices', JSON.stringify(priceData));
                
                updatePriceDisplay();
            }
        }
    } catch (error) {
        console.warn('Failed to fetch latest price, using cached price if available.', error);
    }
    
    // Fetch transactions for statistics and province dropdown
    try {
        if (typeof GOOGLE_SCRIPT_URL !== 'undefined' && typeof GOOGLE_SHEETS_ID !== 'undefined' && typeof SHEET_GIDS !== 'undefined') {
            const transUrl = `${GOOGLE_SCRIPT_URL}?action=getTransactionLogs&sheetsId=${GOOGLE_SHEETS_ID}&gid=${SHEET_GIDS.TRANSACTION_HISTORY}`;
            const transResponse = await fetch(transUrl);
            const transResult = await transResponse.json();
            
            if (transResult.success && transResult.data) {
                allTransactions = transResult.data;
                populateProvinceDropdown();
            }
        }
    } catch (error) {
        console.warn('Failed to fetch transactions', error);
    }
    
    populateAircraftDropdown();
}

function populateAircraftDropdown() {
    const aircraftSelect = document.getElementById('aircraftType');
    if (!aircraftSelect) return;
    
    for (const [key, data] of Object.entries(aircraftData)) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = data.name;
        option.setAttribute('data-fuel', data.fuel);
        aircraftSelect.appendChild(option);
    }
}

function populateProvinceDropdown() {
    const provinceSelect = document.getElementById('province');
    if (!provinceSelect) return;
    
    const provinces = new Set();
    allTransactions.forEach(t => {
        if (t.unit && t.unit.trim() !== '') {
            provinces.add(t.unit.trim());
        }
    });
    
    // Fallback if no transactions loaded
    if (provinces.size === 0 && typeof THAI_PROVINCES !== 'undefined') {
        THAI_PROVINCES.forEach(p => provinces.add(p.nameThai));
    }
    
    const sortedProvinces = Array.from(provinces).sort();
    sortedProvinces.forEach(p => {
        const option = document.createElement('option');
        option.value = p;
        option.textContent = p;
        provinceSelect.appendChild(option);
    });
}

const pttPriceCache = {};

async function fetchPTTPrice(provinceName) {
    if (!provinceName) return 0;
    const cacheKey = provinceName.trim().toLowerCase();
    if (pttPriceCache[cacheKey]) return pttPriceCache[cacheKey];
    
    try {
        const url = `${GOOGLE_SCRIPT_URL}?action=getPTTPricesByProvince&sheetsId=${GOOGLE_SHEETS_ID}&gid=${SHEET_GIDS.PTT_PRICES}&province=${encodeURIComponent(provinceName.trim())}`;
        const response = await fetch(url);
        const result = await response.json();
        if (result.success && result.data && parseFloat(result.data.pricePerLiter) > 0) {
            const price = parseFloat(result.data.pricePerLiter);
            pttPriceCache[cacheKey] = price;
            return price;
        }
    } catch (e) {
        console.warn("Error fetching price for", provinceName, e);
    }
    return 0;
}

function updatePriceDisplay(provinceName = 'ราคาเฉลี่ย') {
    document.getElementById('currentPriceText').textContent = `อ้างอิงราคาน้ำมัน (${provinceName}): ${currentPricePerLiter.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} บาท/ลิตร`;
}

function setupEventListeners() {
    const aircraftTypeSelect = document.getElementById('aircraftType');
    const fuelRateInput = document.getElementById('fuelRate');
    const planeIcon = document.getElementById('planeIcon');
    const aircraftImage = document.getElementById('aircraftImage');
    
    // Aircraft selection change
    aircraftTypeSelect.addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        const baseFuelRate = parseFloat(selectedOption.getAttribute('data-fuel')) || 0;
        const type = this.value;
        
        if (type && allTransactions.length > 0) {
            // Find stats for this aircraft type in Transaction_Log
            const typeTransactions = allTransactions.filter(t => 
                t.transaction_type === 'จ่ายออก' && 
                (
                    (t.aircraft_type && String(t.aircraft_type).toUpperCase().includes(String(type).toUpperCase())) ||
                    (t.destination_name && String(t.destination_name).toUpperCase().includes(String(type).toUpperCase()))
                )
            );
            
            if (typeTransactions.length > 0) {
                // Sum volume and find unique dates to get avg liters/day
                let totalVolume = 0;
                const uniqueDates = new Set();
                
                typeTransactions.forEach(t => {
                    const vol = parseFloat(t.volume_liters) || 0;
                    if (vol > 0) {
                        totalVolume += vol;
                        if(t.date) uniqueDates.add(t.date);
                    }
                });
                
                const days = uniqueDates.size || 1;
                const avgLitersPerDay = totalVolume / days;
                
                if (baseFuelRate > 0 && avgLitersPerDay > 0) {
                    let avgHoursPerDay = avgLitersPerDay / baseFuelRate;
                    if (avgHoursPerDay > 12) avgHoursPerDay = 12; // cap to reasonable hours
                    
                    document.getElementById('hoursPerDay').value = avgHoursPerDay.toFixed(1);
                    document.getElementById('fuelRate').value = baseFuelRate;
                } else {
                    document.getElementById('hoursPerDay').value = 3.5;
                    document.getElementById('fuelRate').value = baseFuelRate;
                }
            } else {
                document.getElementById('hoursPerDay').value = 3.5;
                document.getElementById('fuelRate').value = baseFuelRate;
            }
        } else {
            document.getElementById('hoursPerDay').value = 3.5;
            document.getElementById('fuelRate').value = baseFuelRate || 0;
        }
        
        // Auto-calculate ferry flight hours if province is already selected
        updateFerryFlightHours();
    });

    // Mission type radio toggle
    const missionRadios = document.querySelectorAll('input[name="missionType"]');
    const rainmakingLocation = document.getElementById('rainmakingLocation');
    const supportRoute = document.getElementById('supportRoute');
    
    missionRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'ฝนหลวง') {
                rainmakingLocation.classList.remove('d-none');
                supportRoute.classList.add('d-none');
            } else {
                rainmakingLocation.classList.add('d-none');
                supportRoute.classList.remove('d-none');
            }
        });
    });

    // Price auto-update on location change
    const updateLocationPrice = async function() {
        const selectedProvince = this.value;
        if (!selectedProvince) return;
        
        document.getElementById('currentPriceText').innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังดึงราคาน้ำมัน...';
        
        let priceToUse = await fetchPTTPrice(selectedProvince);
        let provinceDisplay = selectedProvince;
        
        if (priceToUse === 0) {
            priceToUse = await fetchPTTPrice('นครสวรรค์');
            provinceDisplay = 'นครสวรรค์ (ราคาอ้างอิง)';
        }
        
        currentPricePerLiter = priceToUse;
        updatePriceDisplay(provinceDisplay);
        
        // Estimate bus fare based on selected province
        const busFareInput = document.getElementById('busFarePerPerson');
        if (busFareInput && selectedProvince) {
            busFareInput.value = estimateBusFare(selectedProvince);
        }
        
        // Auto-calculate ferry flight hours when province changes
        updateFerryFlightHours();
    };

    document.getElementById('province').addEventListener('change', updateLocationPrice);
    document.getElementById('origin').addEventListener('change', updateLocationPrice);

    // Calculate Button
    document.getElementById('calculateBtn').addEventListener('click', async function() {
        // Validate
        const form = document.getElementById('estimationForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const calcBtn = this;
        const originalHtml = calcBtn.innerHTML;
        calcBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>กำลังคำนวณ...';
        calcBtn.disabled = true;

        try {
            const missionType = document.querySelector('input[name="missionType"]:checked').value;
            let selectedProvince = '';
            
            if (missionType === 'ฝนหลวง') {
                selectedProvince = document.getElementById('province').value;
            } else {
                selectedProvince = document.getElementById('origin').value;
            }

            let priceToUse = 0;
            if (selectedProvince) {
                priceToUse = await fetchPTTPrice(selectedProvince);
            }
            
            // Fallback to นครสวรรค์
            if (priceToUse === 0) {
                priceToUse = await fetchPTTPrice('นครสวรรค์');
            }
            
            if (priceToUse === 0 && currentPricePerLiter > 0) {
                priceToUse = currentPricePerLiter;
            }

            currentPricePerLiter = priceToUse;
            
            // Update UI
            let provinceDisplay = selectedProvince || 'นครสวรรค์';
            if (priceToUse === 0) provinceDisplay = 'ไม่ทราบ';
            else if (priceToUse > 0 && selectedProvince && await fetchPTTPrice(selectedProvince) === 0) {
                provinceDisplay = 'นครสวรรค์ (ราคาอ้างอิง)';
            }

            updatePriceDisplay(provinceDisplay);

            const type = document.getElementById('aircraftType').value;
            const aircraftCount = parseFloat(document.getElementById('aircraftCount').value) || 0;
            const daysCount = parseFloat(document.getElementById('daysCount').value) || 0;
            const hoursPerDay = parseFloat(document.getElementById('hoursPerDay').value) || 0;
            const ferryFlightHours = parseFloat(document.getElementById('ferryFlightHours').value) || 0;
            const fuelRate = parseFloat(document.getElementById('fuelRate').value) || 0;
            const busFarePerPerson = parseFloat(document.getElementById('busFarePerPerson').value) || 0;
            
            const totalWorkHours = aircraftCount * daysCount * hoursPerDay;
            const totalFerryHours = aircraftCount * ferryFlightHours;
            const totalHours = totalWorkHours + totalFerryHours;
            const totalLiters = totalHours * fuelRate;
            const totalCost = totalLiters * priceToUse;
            const totalDrums = Math.ceil(totalLiters / 200);
            
            // Personnel Calculations
            let unitTotal = 0;
            let allowanceCost = 0;
            let flightPayCost = 0;
            let travelCost = 0;
            
            if (type && aircraftCount > 0) {
                const staff = getUnitStaff(type, aircraftCount);
                unitTotal = staff.total;
                allowanceCost = unitTotal * 1080 * daysCount; // เบี้ยเลี้ยง 280 + ที่พัก 800 = 1080 บ./วัน
                travelCost = unitTotal * busFarePerPerson;
                
                const crew = getFlightCrew(type, missionType);
                const ferryCrew = getFlightCrew(type, 'สนับสนุน');
                
                const workFlightPay = (crew.techs * 500 + crew.comms * 250) * totalWorkHours;
                const ferryFlightPay = (ferryCrew.techs * 500 + ferryCrew.comms * 250) * totalFerryHours;
                flightPayCost = workFlightPay + ferryFlightPay;
            }
            
            const totalPersonnelCost = allowanceCost + flightPayCost + travelCost;
            const grandTotalCost = totalCost + totalPersonnelCost;
            
            // Animate numbers
            animateValue("workHoursDetail", 0, totalWorkHours, 800, 1);
            animateValue("ferryHoursDetail", 0, totalFerryHours, 800, 1);
            animateValue("totalHoursDetail", 0, totalHours, 800, 1);
            animateValue("totalLitersResult", 0, totalLiters, 800, 0);
            animateValue("totalCostDetail", 0, totalCost, 800, 2);
            animateValue("totalDrumsDetail", 0, totalDrums, 800, 0);
            
            animateValue("unitStaffCount", 0, unitTotal, 800, 0);
            animateValue("travelCostDetail", 0, travelCost, 800, 2);
            animateValue("allowanceCostDetail", 0, allowanceCost, 800, 2);
            animateValue("flightPayCostDetail", 0, flightPayCost, 800, 2);
            animateValue("totalPersonnelCost", 0, totalPersonnelCost, 800, 2);
            animateValue("grandTotalCost", 0, grandTotalCost, 800, 2);
        } finally {
            calcBtn.innerHTML = originalHtml;
            calcBtn.disabled = false;
        }
    });
}

function getUnitStaff(type, count) {
    let p = 0, t = 0, c = 0;
    const n = Math.max(1, Math.floor(count));
    
    if (['BELL206', 'BELL407', 'BELL412', 'AS350', 'H130', 'AW139'].includes(type)) {
        p = 3 * n; t = 3 * n; c = 2 * n;
    } else if (type === 'CN235') {
        p = 3 * n; t = 6 * n; c = 2 * n;
    } else if (['CASA', 'NC212i'].includes(type)) {
        if (n === 1) { p = 3; t = 4; c = 2; }
        else if (n === 2) { p = 6; t = 8; c = 3; }
        else { p = 3 * n; t = 4 * n; c = Math.ceil(1.5 * n); }
    } else if (['CARAVAN', 'SKYCOURIER', 'L410'].includes(type)) {
        if (n === 1) { p = 3; t = 4; c = 2; }
        else if (n === 2) { p = 6; t = 6; c = 3; }
        else if (n === 3) { p = 9; t = 8; c = 4; }
        else { p = 3 * n; t = Math.ceil((8/3) * n); c = Math.ceil((4/3) * n); }
    } else if (type === 'SKA') {
        if (n === 1) { p = 3; t = 4; c = 2; }
        else if (n === 2) { p = 6; t = 7; c = 3; }
        else { p = 3 * n; t = Math.ceil(3.5 * n); c = Math.ceil(1.5 * n); }
    }
    
    return { pilots: p, techs: t, comms: c, total: p + t + c };
}

function estimateBusFare(province) {
    if (!province || province.includes('นครสวรรค์')) return 0;
    
    const north = ['เชียงใหม่', 'เชียงราย', 'แม่ฮ่องสอน', 'พะเยา', 'แพร่', 'น่าน', 'ลำปาง', 'ลำพูน', 'อุตรดิตถ์'];
    const centralUpper = ['พิษณุโลก', 'พิจิตร', 'กำแพงเพชร', 'สุโขทัย', 'ตาก', 'เพชรบูรณ์'];
    const centralLower = ['กรุงเทพมหานคร', 'อยุธยา', 'ปทุมธานี', 'นนทบุรี', 'สมุทรปราการ', 'สมุทรสาคร', 'สมุทรสงคราม', 'นครปฐม', 'สระบุรี', 'ลพบุรี', 'สิงห์บุรี', 'อ่างทอง', 'ชัยนาท', 'อุทัยธานี', 'สุพรรณบุรี', 'นครนายก'];
    const northeast = ['นครราชสีมา', 'ขอนแก่น', 'อุดรธานี', 'หนองคาย', 'บึงกาฬ', 'หนองบัวลำภู', 'เลย', 'ชัยภูมิ', 'บุรีรัมย์', 'สุรินทร์', 'ศรีสะเกษ', 'อุบลราชธานี', 'อำนาจเจริญ', 'ยโสธร', 'ร้อยเอ็ด', 'มหาสารคาม', 'กาฬสินธุ์', 'มุกดาหาร', 'นครพนม', 'สกลนคร'];
    const south = ['ชุมพร', 'ระนอง', 'สุราษฎร์ธานี', 'พังงา', 'ภูเก็ต', 'กระบี่', 'นครศรีธรรมราช', 'ตรัง', 'พัทลุง', 'สตูล', 'สงขลา', 'ปัตตานี', 'ยะลา', 'นราธิวาส'];
    const east = ['ชลบุรี', 'ระยอง', 'จันทบุรี', 'ตราด', 'ฉะเชิงเทรา', 'ปราจีนบุรี', 'สระแก้ว'];
    const west = ['กาญจนบุรี', 'ราชบุรี', 'เพชรบุรี', 'ประจวบคีรีขันธ์'];
    
    const isMatch = (arr) => arr.some(p => province.includes(p));
    
    // Return estimated round-trip fare
    if (isMatch(centralUpper)) return 400;
    if (isMatch(centralLower)) return 600;
    if (isMatch(east)) return 1000;
    if (isMatch(west)) return 800;
    if (isMatch(north)) return 1200;
    if (isMatch(northeast)) return 1400;
    if (isMatch(south)) return 2400;
    
    return 1000; // default round-trip fare
}

function getFlightCrew(type, missionType) {
    let t = 0, c = 0;
    
    if (missionType === 'ฝนหลวง') {
        if (type === 'CN235') { t = 2; c = 1; }
        else { t = 1; c = 1; }
    } else {
        if (['BELL206', 'BELL407', 'BELL412', 'AS350', 'H130', 'AW139'].includes(type)) {
            t = 1; c = 1;
        } else {
            t = 2; c = 1;
        }
    }
    return { techs: t, comms: c };
}

function updateFerryFlightHours() {
    const type = document.getElementById('aircraftType').value;
    const missionType = document.querySelector('input[name="missionType"]:checked').value;
    let province = '';
    
    if (missionType === 'ฝนหลวง') {
        province = document.getElementById('province').value;
    } else {
        province = document.getElementById('origin').value || document.getElementById('destination').value;
    }
    
    const ferryInput = document.getElementById('ferryFlightHours');
    
    if (!type || !province || !ferryInput || province.includes('นครสวรรค์')) {
        return; // Don't override if missing data or same province
    }
    
    // 1. Estimate distance (km) from Nakhon Sawan
    let distance = 0;
    const isMatch = (arr) => arr.some(p => province.includes(p));
    
    const north = ['เชียงใหม่', 'เชียงราย', 'แม่ฮ่องสอน', 'พะเยา', 'แพร่', 'น่าน', 'ลำปาง', 'ลำพูน', 'อุตรดิตถ์'];
    const centralUpper = ['พิษณุโลก', 'พิจิตร', 'กำแพงเพชร', 'สุโขทัย', 'ตาก', 'เพชรบูรณ์'];
    const centralLower = ['กรุงเทพมหานคร', 'อยุธยา', 'ปทุมธานี', 'นนทบุรี', 'สมุทรปราการ', 'สมุทรสาคร', 'สมุทรสงคราม', 'นครปฐม', 'สระบุรี', 'ลพบุรี', 'สิงห์บุรี', 'อ่างทอง', 'ชัยนาท', 'อุทัยธานี', 'สุพรรณบุรี', 'นครนายก'];
    const northeast = ['นครราชสีมา', 'ขอนแก่น', 'อุดรธานี', 'หนองคาย', 'บึงกาฬ', 'หนองบัวลำภู', 'เลย', 'ชัยภูมิ', 'บุรีรัมย์', 'สุรินทร์', 'ศรีสะเกษ', 'อุบลราชธานี', 'อำนาจเจริญ', 'ยโสธร', 'ร้อยเอ็ด', 'มหาสารคาม', 'กาฬสินธุ์', 'มุกดาหาร', 'นครพนม', 'สกลนคร'];
    const south = ['ชุมพร', 'ระนอง', 'สุราษฎร์ธานี', 'พังงา', 'ภูเก็ต', 'กระบี่', 'นครศรีธรรมราช', 'ตรัง', 'พัทลุง', 'สตูล', 'สงขลา', 'ปัตตานี', 'ยะลา', 'นราธิวาส'];
    const east = ['ชลบุรี', 'ระยอง', 'จันทบุรี', 'ตราด', 'ฉะเชิงเทรา', 'ปราจีนบุรี', 'สระแก้ว'];
    const west = ['กาญจนบุรี', 'ราชบุรี', 'เพชรบุรี', 'ประจวบคีรีขันธ์'];

    if (isMatch(centralUpper)) distance = 150;
    else if (isMatch(centralLower)) distance = 200;
    else if (isMatch(west)) distance = 300;
    else if (isMatch(north) || isMatch(east)) distance = 400;
    else if (isMatch(northeast)) distance = 450;
    else if (isMatch(south)) distance = 800;
    else distance = 300; // default
    
    // 2. Aircraft speed (km/h)
    let speed = 0;
    if (type === 'CARAVAN') speed = 320;
    else if (['CASA', 'NC212i'].includes(type)) speed = 350;
    else if (['SKYCOURIER', 'L410'].includes(type)) speed = 380;
    else if (type === 'CN235') speed = 450;
    else if (type === 'SKA') speed = 570;
    else if (type === 'AW139') speed = 300;
    else speed = 220; // Light Helicopters
    
    // 3. Calculate hours: (Distance / Speed) * 2 legs + (0.5 hr buffer per leg * 2 legs)
    const hoursOneWay = distance / speed;
    const hoursRoundTrip = (hoursOneWay * 2) + 1.0;
    
    // Round to nearest 0.5 for cleaner UI
    ferryInput.value = (Math.round(hoursRoundTrip * 2) / 2).toFixed(1);
}

// Animation helper for numbers
function animateValue(id, start, end, duration, decimals = 0) {
    if (start === end) {
        updateDOMValue(id, end, decimals);
        return;
    }
    const obj = document.getElementById(id);
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const currentVal = progress * (end - start) + start;
        
        updateDOMValue(id, currentVal, decimals);
        
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            updateDOMValue(id, end, decimals); // ensure exact end value
        }
    };
    window.requestAnimationFrame(step);
}

function updateDOMValue(id, value, decimals) {
    const obj = document.getElementById(id);
    if (decimals > 0) {
        obj.innerHTML = value.toLocaleString('th-TH', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    } else {
        obj.innerHTML = Math.round(value).toLocaleString('th-TH');
    }
}
