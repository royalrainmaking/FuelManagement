import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

nav_start = content.find('<nav class="navbar')
if nav_start == -1:
    print("Nav not found")

budget_plans_start = content.find('<!-- งบประมาณแต่ละแผน -->')

head_part = content[:nav_start]
tail_part = content[budget_plans_start:]

new_middle = """    <nav class="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm">
        <div class="container-fluid">
            <a class="navbar-brand d-flex align-items-center" href="index.html">
                <img src="img/logo.png" alt="Logo" class="navbar-logo me-2">
                <div>
                    <div class="fw-bold">ระบบจัดการน้ำมัน</div>
                    <small class="opacity-75">กองบริหารการบินเกษตร กรมฝนหลวงและการบินเกษตร</small>
                </div>
            </a>
            <div class="navbar-nav ms-auto d-flex flex-row align-items-center gap-2">
                <!-- Role Badge -->
                <div id="roleBadge" class="badge bg-warning text-dark me-2" style="display: none; cursor: pointer;"
                    onclick="switchRole()" title="คลิกเพื่อเปลี่ยนสิทธิ์">
                    -
                </div>

                <a href="https://royalrainmaking.github.io/AircraftData/index.html" class="btn btn-light btn-sm"
                    title="ข้อมูลอากาศยาน">
                    <i class="fas fa-plane me-1"></i> ข้อมูลอากาศยาน
                </a>
                <button class="btn btn-light btn-sm" id="refreshDataBtn" type="button">
                    <i class="fas fa-sync-alt me-1"></i> รีเฟรช
                </button>
                <a href="dashboard.html" class="btn btn-warning btn-sm fw-bold" title="Dashboard">
                    <i class="fas fa-tachometer-alt me-1"></i> Dashboard
                </a>
                <a href="monthly-province-summary.html" class="btn btn-info btn-sm text-white" title="สรุปรายจังหวัด/เดือน">
                    <i class="fas fa-map-marked-alt me-1"></i> สรุปรายจังหวัด
                </a>
                <a href="transaction-summary.html" class="btn btn-light btn-sm" title="สรุปรายการเดินบัญชี">
                    <i class="fas fa-chart-bar me-1"></i> สรุปรายการ
                </a>
                <a href="budget-print.html" class="btn btn-warning btn-sm fw-bold"
                    title="สรุปงบประมาณ/น้ำมัน พร้อมพิมพ์">
                    <i class="fas fa-print me-1"></i> สรุปงบ/น้ำมัน
                </a>
            </div>
        </div>
    </nav>

    <!-- Loading Overlay -->
    <div id="loadingOverlay" class="loading-overlay">
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <div class="loading-text" id="loadingText">กำลังโหลด...</div>
            <div class="progress-container" id="progressContainer"
                style="width: 300px; margin-top: 20px; display: none;">
                <div class="progress" style="height: 6px; background: #e9ecef; border-radius: 3px; overflow: hidden;">
                    <div id="progressBar"
                        style="width: 0%; height: 100%; background: linear-gradient(90deg, #0d6efd 0%, #0dcaf0 100%); transition: width 0.3s ease;">
                    </div>
                </div>
                <div style="text-align: center; margin-top: 8px; font-size: 0.9rem; color: #6c757d;">
                    <span id="progressPercent">0</span>%
                </div>
                <div style="text-align: center; margin-top: 8px; font-size: 0.85rem; color: #6c757d;">
                    <span id="progressDetails">เตรียมเริ่มต้น...</span>
                </div>
            </div>
        </div>
    </div>

    <!-- Role Selection Modal -->
    <div id="roleModal">
        <div class="role-container">
            <h2 class="fw-bold mb-2">ยินดีต้อนรับ</h2>
            <p class="text-muted mb-4" style="font-size: 1rem;">กรุณาเลือกสิทธิ์การเข้าใช้งานระบบ</p>

            <div class="role-grid">
                <!-- ผู้ดูแล -->
                <div class="role-option" onclick="selectRole('admin')">
                    <i class="fas fa-user-shield"></i>
                    <span>ผู้ดูแลระบบ</span>
                    <small>เข้าถึงข้อมูลทั้งหมด</small>
                </div>

                <!-- ซื้อจาก ปตท. -->
                <div class="role-option" onclick="selectRole('ptt')">
                    <img src="img/ptt.png" alt="PTT" style="height: 40px; width: auto; object-fit: contain;">
                    <span>เติมจาก ปตท.</span>
                    <small>เติมจาก ปตท. / ถัง 200L</small>
                </div>

                <!-- สนามบินคลองหลวง -->
                <div class="role-option" onclick="selectRole('khlong_luang')">
                    <i class="fas fa-helicopter"></i>
                    <span>สนามบินคลองหลวง</span>
                    <small>คลังคลองหลวง / รถเติม / ถัง 200L</small>
                </div>

                <!-- สนามบินนครสวรรค์ -->
                <div class="role-option" onclick="selectRole('nakhonsawan')">
                    <i class="fas fa-plane"></i>
                    <span>สนามบินนครสวรรค์</span>
                    <small>คลังนครสวรรค์ / รถเติม / ถัง 200L</small>
                </div>
            </div>
        </div>
    </div>

    <!-- Main Dashboard Container -->
    <div class="container-fluid mt-3">
        <div class="row">
            <!-- Main Content Area -->
            <div class="col-lg-8 col-xl-9">
                <!-- สรุปภาพรวม -->
                <div class="row mb-3 g-3">
                    <!-- การ์ดที่ 1: วงเงินสัญญาคงเหลือตามแผน -->
                    <div class="col-lg-5 col-md-12">
                        <div class="card border-0 shadow-sm overview-card h-100"
                            style="background: #ffffff; border-radius: 16px; overflow: hidden; position: relative;">
                            <div style="position: absolute; top: 0; left: 0; width: 100%; height: 5px; background: linear-gradient(90deg, #28a745, #20c997);"></div>
                            <div class="card-body p-3">
                                <div class="d-flex align-items-center mb-3">
                                    <div class="bg-success bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 40px; height: 40px;">
                                        <i class="fas fa-wallet text-success fs-5"></i>
                                    </div>
                                    <div>
                                        <h6 class="mb-0 fw-bold text-dark" style="font-size: 1rem;">วงเงินสัญญาคงเหลือตามแผน</h6>
                                    </div>
                                </div>
                                <div id="quickBudgetStatus" class="row g-2">
                                    <!-- แผนบรู -->
                                    <div class="col-6">
                                        <div class="p-2 rounded h-100" style="background: linear-gradient(145deg, #fff8e1, #ffffff); border: 1px solid #ffecb3; transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                                            <div class="d-flex align-items-center mb-1">
                                                <i class="fas fa-cloud-rain text-warning me-2" style="font-size: 0.8rem;"></i>
                                                <span class="fw-bold text-secondary" style="font-size: 0.8rem;">บรู</span>
                                            </div>
                                            <div class="d-flex flex-wrap align-items-baseline">
                                                <span class="fw-bold text-dark" id="quickRemainingBru" style="font-size: 1.1rem; letter-spacing: -0.5px;">0</span>
                                                <small class="text-muted ms-1" style="font-size: 0.7rem;">บาท</small>
                                            </div>
                                        </div>
                                    </div>
                                    <!-- แผนยุทธ -->
                                    <div class="col-6">
                                        <div class="p-2 rounded h-100" style="background: linear-gradient(145deg, #e3f2fd, #ffffff); border: 1px solid #bbdefb; transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                                            <div class="d-flex align-items-center mb-1">
                                                <i class="fas fa-shield-alt text-primary me-2" style="font-size: 0.8rem;"></i>
                                                <span class="fw-bold text-secondary" style="font-size: 0.8rem;">ยุทธ</span>
                                            </div>
                                            <div class="d-flex flex-wrap align-items-baseline">
                                                <span class="fw-bold text-dark" id="quickRemainingYuttaya" style="font-size: 1.1rem; letter-spacing: -0.5px;">0</span>
                                                <small class="text-muted ms-1" style="font-size: 0.7rem;">บาท</small>
                                            </div>
                                        </div>
                                    </div>
                                    <!-- แผนฝุ่น -->
                                    <div class="col-6">
                                        <div class="p-2 rounded h-100" style="background: linear-gradient(145deg, #e0f7fa, #ffffff); border: 1px solid #b2ebf2; transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                                            <div class="d-flex align-items-start mb-1">
                                                <i class="fas fa-smog text-info me-2 mt-1" style="font-size: 0.8rem;"></i>
                                                <span class="fw-bold text-secondary" style="font-size: 0.75rem; line-height: 1.2;">ดัดแปลงสภาพอากาศ<br/>(ฝุ่น)</span>
                                            </div>
                                            <div class="d-flex flex-wrap align-items-baseline">
                                                <span class="fw-bold text-dark" id="quickRemainingDust" style="font-size: 1.1rem; letter-spacing: -0.5px;">0</span>
                                                <small class="text-muted ms-1" style="font-size: 0.7rem;">บาท</small>
                                            </div>
                                        </div>
                                    </div>
                                    <!-- แผนลูกเห็บ -->
                                    <div class="col-6">
                                        <div class="p-2 rounded h-100" style="background: linear-gradient(145deg, #ffebee, #ffffff); border: 1px solid #ffcdd2; transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                                            <div class="d-flex align-items-start mb-1">
                                                <i class="fas fa-gem text-danger me-2 mt-1" style="font-size: 0.8rem;"></i>
                                                <span class="fw-bold text-secondary" style="font-size: 0.75rem; line-height: 1.2;">ดัดแปลงสภาพอากาศ<br/>(ลูกเห็บ)</span>
                                            </div>
                                            <div class="d-flex flex-wrap align-items-baseline">
                                                <span class="fw-bold text-dark" id="quickRemainingCentral" style="font-size: 1.1rem; letter-spacing: -0.5px;">0</span>
                                                <small class="text-muted ms-1" style="font-size: 0.7rem;">บาท</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- การ์ดที่ 2: ความจุคงเหลือทั้งหมด -->
                    <div class="col-lg-4 col-md-6">
                        <div class="card border-0 shadow-sm overview-card h-100"
                            style="background: #ffffff; border-radius: 16px; overflow: hidden; position: relative;">
                            <div style="position: absolute; top: 0; left: 0; width: 100%; height: 5px; background: linear-gradient(90deg, #17a2b8, #0dcaf0);"></div>
                            <div class="card-body p-3 d-flex flex-column justify-content-center">
                                <div class="d-flex align-items-center mb-3">
                                    <div class="bg-info bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 40px; height: 40px;">
                                        <i class="fas fa-tachometer-alt text-info fs-5"></i>
                                    </div>
                                    <div>
                                        <h6 class="mb-0 fw-bold text-dark" style="font-size: 1rem;">ความจุคงเหลือทั้งหมด</h6>
                                    </div>
                                </div>
                                <div class="d-flex align-items-center justify-content-center gap-3 mt-2">
                                    <div class="position-relative flex-shrink-0" style="width: 90px; height: 90px;">
                                        <svg viewBox="0 0 36 36" class="circular-chart info" style="width: 100%; height: 100%;">
                                            <path class="circle-bg" stroke="#eee" stroke-width="3" fill="none"
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                            <path class="circle" id="fuelGaugePath" stroke="#0dcaf0" stroke-width="3" stroke-dasharray="0, 100" stroke-linecap="round" fill="none"
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" style="transition: stroke-dasharray 1s ease-out;" />
                                            <text x="18" y="21" class="percentage"
                                                id="fuelGaugePercentage" text-anchor="middle" style="font-size: 0.6rem; font-weight: 700; fill: #2c3e50;">0%</text>
                                        </svg>
                                    </div>
                                    <div class="flex-grow-1">
                                        <p class="text-muted mb-1 fw-semibold" style="font-size: 0.8rem;">สถานะคลังน้ำมัน</p>
                                        <div class="d-flex flex-column">
                                            <span class="fw-bold text-dark" id="totalFuelInfo" style="font-size: 1.1rem; line-height: 1.2; word-break: break-word;">0/0</span>
                                            <span class="text-muted" style="font-size: 0.8rem;">ลิตร</span>
                                            <div id="fuelProgressFill" style="display:none;"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- การ์ดที่ 3: ยอดเงินที่ซื้อจาก ปตท. -->
                    <div class="col-lg-3 col-md-6">
                        <div class="card border-0 shadow-sm overview-card h-100"
                            style="background: #ffffff; border-radius: 16px; overflow: hidden; position: relative;">
                            <div style="position: absolute; top: 0; left: 0; width: 100%; height: 5px; background: linear-gradient(90deg, #ffc107, #ffca2c);"></div>
                            <div class="card-body p-3 d-flex flex-column justify-content-center align-items-center text-center">
                                <div class="bg-warning bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center mb-3" style="width: 48px; height: 48px;">
                                    <i class="fas fa-gas-pump text-warning fs-4"></i>
                                </div>
                                <h6 class="text-muted fw-bold mb-2" style="font-size: 0.9rem;">ยอดเงินที่ซื้อจาก ปตท.</h6>
                                <div class="d-flex align-items-baseline justify-content-center flex-wrap">
                                    <span class="fw-bold text-dark" id="totalPurchaseAmount"
                                        style="font-size: 1.8rem; letter-spacing: -0.5px;">0</span>
                                    <span class="text-muted ms-1 fw-semibold" style="font-size: 0.9rem;">บาท</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

"""

final_content = head_part + new_middle + tail_part

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(final_content)

print("Done")
