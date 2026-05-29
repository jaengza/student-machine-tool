/* ==========================================================================
   🎓 CORE APPLICATION LOGIC (app.js)
   ระบบฐานข้อมูลนักเรียนและการประเมินความเสี่ยง (Premium Version)
   ========================================================================== */

// ── DATA STATE & LOCAL STORAGE KEY ──
const STORAGE_KEY = 'dept_stu_v3';
const CLOUD_KEY = 'cstc_cloud_api';
const SUPABASE_URL = 'https://iapcotozckbhpcmyzoqd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Ylh3TU3WMMxcyGB7C6a-jA_mTZ0QavA';
let CLOUD_API_URL = SUPABASE_URL;
let DB = [];
let editId = null;
let currentPage = 1;
const ITEMS_PER_PAGE = 20;

// CSV/Sheets Import Temporal State
let importData = [];
let importHeaders = [];
let columnMap = {};

// Chart.js Instances
let riskChartInstance = null;
let classChartInstance = null;

// Definition of Fields
const FIELDS = [
  { k: 'id', l: 'รหัสนักเรียน', req: true },
  { k: 'fname', l: 'ชื่อจริง', req: true },
  { k: 'lname', l: 'นามสกุล', req: true },
  { k: 'nickname', l: 'ชื่อเล่น', req: false },
  { k: 'gender', l: 'เพศ', req: false },
  { k: 'photo', l: 'รูปภาพ / ลิงก์ Drive', req: false },
  { k: 'level', l: 'ระดับชั้น', req: false },
  { k: 'year', l: 'ชั้นปี', req: false },
  { k: 'room', l: 'กลุ่มเรียน / ห้อง', req: false },
  { k: 'status', l: 'สถานภาพการเรียน', req: false },
  { k: 'phone', l: 'เบอร์โทรนักเรียน', req: false },
  { k: 'social', l: 'ช่องทางโซเชียล', req: false },
  { k: 'parent', l: 'ชื่อผู้ปกครอง', req: false },
  { k: 'parentphone', l: 'เบอร์โทรผู้ปกครอง', req: false },
  { k: 'parentphone2', l: 'เบอร์ฉุกเฉิน', req: false },
  { k: 'prevschool', l: 'สถานศึกษาเดิม', req: false },
  { k: 'shirt', l: 'ไซส์เสื้อกิจกรรม', req: false },
  { k: 'health', l: 'ข้อมูลสุขภาพ/โรคประจำตัว', req: false },
  { k: 'transport', l: 'การเดินทางมาเรียน', req: false },
  { k: 'allowance', l: 'เงินได้รับมาเรียนต่อวัน', req: false },
  { k: 'smoke', l: 'พฤติกรรมเสี่ยงดื่ม/สูบ', req: false },
  { k: 'internship_place', l: 'สถานที่ฝึกงาน / สหกิจศึกษา', req: false },
  { k: 'internship_phone', l: 'เบอร์โทรสถานที่ฝึกงาน', req: false },
  
  // ที่อยู่และข้อมูลครอบครัวเพิ่มเติม (v11)
  { k: 'address_no', l: 'บ้านเลขที่', req: false },
  { k: 'address_road', l: 'ถนน', req: false },
  { k: 'address_subdistrict', l: 'ตำบล', req: false },
  { k: 'address_district', l: 'อำเภอ', req: false },
  { k: 'address_zipcode', l: 'รหัสไปรษณีย์', req: false },
  { k: 'needs_scholarship', l: 'ความต้องการทุนการศึกษา', req: false },
  { k: 'parent_job', l: 'อาชีพผู้ปกครอง', req: false },
  { k: 'parent_income', l: 'รายได้ครอบครัว', req: false },

  { k: 'risk_level', l: 'ระดับความเสี่ยงภาพรวม', req: false },
  { k: 'risk_academic', l: 'ความเสี่ยงด้านการเรียน', req: false },
  { k: 'risk_behavior', l: 'ความเสี่ยงด้านพฤติกรรม', req: false },
  { k: 'risk_family', l: 'ความเสี่ยงด้านครอบครัว', req: false },
  { k: 'risk_economic', l: 'ความเสี่ยงด้านเศรษฐกิจ', req: false },
  { k: 'risk_note', l: 'หมายเหตุ / แผนช่วยเหลือ', req: false }
];

const AUTH_HASH = 'f980353761341e9dc8f7b83ef504ac9eb0935200afc6698a0bda0ec4e538fa22'; // SHA-256 for 'cstc2026'
let isAuthorized = false;

// ── INITIALIZATION ──
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  
  // Set up CSV Drag and Drop Hover effects (only attaches listener)
  const dropBox = document.querySelector('.csv-upload-box');
  if (dropBox) {
    dropBox.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropBox.style.borderColor = 'var(--p)';
      dropBox.style.background = 'var(--pl)';
    });
    dropBox.addEventListener('dragleave', () => {
      dropBox.style.borderColor = 'var(--border-color)';
      dropBox.style.background = 'rgba(255, 255, 255, 0.01)';
    });
    dropBox.addEventListener('drop', (e) => {
      e.preventDefault();
      dropBox.style.borderColor = 'var(--border-color)';
      dropBox.style.background = 'rgba(255, 255, 255, 0.01)';
      
      if (e.dataTransfer.files.length) {
        document.getElementById('csv-file').files = e.dataTransfer.files;
        importCsvFile();
      }
    });
  }
});

// Check if user is logged in
function checkAuth() {
  // Load cloud URL configuration
  CLOUD_API_URL = SUPABASE_URL;
  const apiInput = document.getElementById('cloud-api-url');
  if (apiInput) apiInput.value = CLOUD_API_URL;
  
  const auth = sessionStorage.getItem('cstc_auth');
  const overlay = document.getElementById('login-overlay');
  
  if (auth === 'true') {
    isAuthorized = true;
    if (overlay) {
      overlay.classList.add('hidden');
    }
    initApp();
  } else {
    isAuthorized = false;
    if (overlay) {
      overlay.classList.remove('hidden');
    }
    // Block DB content in memory strictly
    DB = [];
    updateHeaderCount();
  }
}

// Complete application startup after login is successful
async function initApp() {
  // 1. ลองดึงรายชื่อและสถานะสดจาก Supabase คลาวด์
  const cloudActive = await loadDatabaseOnline();
  
  if (!cloudActive) {
    // 2. หากไม่สำเร็จ (ออฟไลน์) โหลดจาก LocalStorage สำรองภายในเครื่อง
    loadDatabase();
    updateSyncStatus('offline');
  } else {
    updateSyncStatus('online');
  }
  
  initializeCharts();
  updateDashboard();
  updateHeaderCount();
  
  // เรียกเปิดกลไกการซิงค์ข้อมูลให้เป็นปัจจุบันตลอดเวลา (Real-time Sync Engine)
  startAlwaysUpToDateEngine();
  
  // โหลดหน้าประวัติล็อกระบบ
  renderDiagnosticsLogsUI();
  logSystemActivity("APP_START", "", "เปิดแอปพลิเคชันและโหลดโครงสร้างสำเร็จ");
  
  // Refresh views
  const activePage = document.querySelector('.page.active') ? document.querySelector('.page.active').id : 'page-dashboard';
  if (activePage === 'page-students') renderStudents();
  else if (activePage === 'page-search') quickSearch();
}

// ฟังก์ชันแทรกรูปภาพจาก Mock Data แบบบังคับ (Hard Injection) เมื่อตรวจพบประวัติในเครื่องขาดหายไป (v13.1 เชิงรุกรายบุคคล)
function applyHardPhotoInjection() {
  if (!DB || DB.length === 0) return;
  
  const mockList = typeof getMockData === 'function' ? getMockData() : [];
  let updatedCount = 0;
  
  DB.forEach(s => {
    const mockS = mockList.find(m => String(m.id).trim() === String(s.id).trim());
    if (mockS && mockS.photo && (!s.photo || s.photo.trim() === '')) {
      // อัปเดตรูปภาพนักเรียน
      s.photo = normalizeDriveUrl(mockS.photo);
      // ทำความสะอาดสะกดชื่อที่ผิดพลาดไปด้วย
      if (mockS.fname) s.fname = mockS.fname;
      if (mockS.lname) s.lname = mockS.lname;
      updatedCount++;
    }
  });
  
  if (updatedCount > 0) {
    saveDatabase();
    console.log(`⚡ [Hard-Photo-Injection] กู้คืนรูปภาพนักเรียนที่ว่างเปล่าเชิงรุกสำเร็จ: ${updatedCount} คน`);
    
    // อัปเดต UI รายชื่อและหน้าค้นหา
    buildRoomFilter();
    updateDashboard();
    const activePage = document.querySelector('.page.active') ? document.querySelector('.page.active').id : 'page-dashboard';
    if (activePage === 'page-students') renderStudents();
    else if (activePage === 'page-search') quickSearch();
  }
}

function loadDatabase() {
  if (!isAuthorized) {
    DB = [];
    return;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    DB = raw ? JSON.parse(raw) : getMockData();
    
    // Force remove all ปวส. records from memory
    DB = DB.filter(x => x.level !== 'ปวส.');

    // Normalize room names from กช. to กลุ่ม and assign temporary ID for missing IDs to prevent click collision bugs
    let tempCounter = 1;
    DB.forEach(s => {
      if (s.room && s.room.includes('กช.')) {
        s.room = s.room.replace('กช.', 'กลุ่ม');
      }
      
      // Assign temporary ID if ID is missing or empty to allow editing and viewing
      if (!s.id || s.id.toString().trim() === '') {
        s.id = 'TEMP_' + (s.fname || 'student') + '_' + tempCounter++;
      }
    });
    
    if (!raw) {
      saveDatabase();
    }
  } catch (err) {
    console.error('Failed to load database from localStorage', err);
    DB = [];
    showToast('❌ ไม่สามารถอ่านข้อมูลระบบได้', 'err');
  }
}

// Save DB
function saveDatabase() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DB));
    updateHeaderCount();
  } catch (err) {
    console.error('Failed to save to localStorage', err);
    showToast('❌ ข้อมูลเต็มหรือเบราว์เซอร์ไม่รองรับการบันทึก', 'err');
  }
}

// Update count badges
function updateHeaderCount() {
  const badge = document.getElementById('hdr-count');
  if (badge) {
    badge.textContent = `ทั้งหมด ${DB.length} คน`;
  }
}

/* ==========================================================================
   🎨 MODULE 1: UI & VISUAL MODULE (ส่วนการแสดงผล แดชบอร์ด และสกรอลล์ฟิลเตอร์)
   ========================================================================== */

// ── NAVIGATION CONTROLS ──
const PAGE_TITLES = {
  dashboard: 'แดชบอร์ดสถิติและการคัดกรอง',
  students: 'รายชื่อนักเรียนในระบบ',
  search: 'ระบบค้นหาด่วนแบบอัจฉริยะ',
  import: 'ศูนย์นำเข้าและเชื่อมโยงข้อมูล',
  settings: 'ตั้งค่า & จัดการฐานข้อมูล'
};

function goPage(pageId) {
  // Sidebar Links Update
  document.querySelectorAll('.sb-item').forEach(item => {
    item.classList.remove('active');
    const attr = item.getAttribute('onclick');
    if (attr && attr.includes(`'${pageId}'`)) {
      item.classList.add('active');
    }
  });

  // Mobile Bottom Nav Update (ใหม่ v9.0)
  document.querySelectorAll('.mob-nav-item').forEach(btn => {
    btn.classList.remove('active');
  });
  const activeNavBtn = document.getElementById(`mob-nav-${pageId}`);
  if (activeNavBtn) activeNavBtn.classList.add('active');

  // Page Content Update
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });
  
  const activePage = document.getElementById(`page-${pageId}`);
  if (activePage) {
    activePage.classList.add('active');
  }

  // Header Title Update
  const titleElem = document.getElementById('page-title');
  if (titleElem) {
    titleElem.textContent = PAGE_TITLES[pageId] || 'ระบบสารสนเทศนักเรียน';
  }

  // View specific refresh
  if (pageId === 'dashboard') {
    updateDashboard();
  } else if (pageId === 'students') {
    currentPage = 1;
    buildRoomFilter();
    renderStudents();
  } else if (pageId === 'search') {
    setTimeout(() => {
      const input = document.getElementById('qs-input');
      if (input) input.focus();
    }, 150);
  } else if (pageId === 'settings') {
    renderDiagnosticsLogsUI();
  }

  closeSidebar();
}

function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const overlay = document.getElementById('mob-overlay');
  if (sb && overlay) {
    sb.classList.toggle('open');
    overlay.classList.toggle('show');
  }
}

function closeSidebar() {
  const sb = document.getElementById('sidebar');
  const overlay = document.getElementById('mob-overlay');
  if (sb && overlay) {
    sb.classList.remove('open');
    overlay.classList.remove('show');
  }
}

// ── MOBILE BOTTOM NAV FUNCTIONS (v9.0) ──

// นำทางจาก Mobile Bottom Nav (ซิงค์ active state)
function mobileNavGo(pageId) {
  goPage(pageId);
  // ถ้ากด search ใน Bottom Nav ที่ไม่ใช่ปุ่มกลาง ให้ focus search input ด้านบน
}

// เปิดหน้าต่างค้นหาลอยตัวบนมือถือ
function openMobileSearch() {
  const overlay = document.getElementById('mobile-search-overlay');
  const panel = document.getElementById('mobile-search-panel');
  if (overlay) overlay.classList.add('visible');
  if (panel) {
    panel.style.display = 'flex';
    // รอ 1 frame ก่อน add class เพื่อให้ animation ทำงานได้
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        panel.classList.add('open');
      });
    });
    // Focus input ค้นหา
    setTimeout(() => {
      const input = document.getElementById('mob-qs-input');
      if (input) input.focus();
    }, 300);
  }
  // ป้องกัน body scroll
  document.body.style.overflow = 'hidden';
}

// ปิดหน้าต่างค้นหาลอยตัวบนมือถือ
function closeMobileSearch() {
  const overlay = document.getElementById('mobile-search-overlay');
  const panel = document.getElementById('mobile-search-panel');
  if (overlay) overlay.classList.remove('visible');
  if (panel) {
    panel.classList.remove('open');
    setTimeout(() => {
      panel.style.display = 'none';
      // ล้างผลการค้นหาหลังปิด
      const results = document.getElementById('mob-qs-results');
      if (results) results.innerHTML = '';
      const input = document.getElementById('mob-qs-input');
      if (input) input.value = '';
      const clearBtn = document.getElementById('mob-clear-btn');
      if (clearBtn) clearBtn.style.display = 'none';
    }, 350);
  }
  document.body.style.overflow = '';
}

// ล้างช่องค้นหามือถือ
function clearMobileSearch() {
  const input = document.getElementById('mob-qs-input');
  const clearBtn = document.getElementById('mob-clear-btn');
  const results = document.getElementById('mob-qs-results');
  if (input) { input.value = ''; input.focus(); }
  if (clearBtn) clearBtn.style.display = 'none';
  if (results) results.innerHTML = '';
}

// ค้นหาข้อมูลนักเรียนในหน้าต่างลอยตัวมือถือ (Instant Search)
function mobileQuickSearch() {
  const input = document.getElementById('mob-qs-input');
  const clearBtn = document.getElementById('mob-clear-btn');
  const resultsEl = document.getElementById('mob-qs-results');
  if (!input || !resultsEl) return;

  const query = input.value.trim().toLowerCase();

  // แสดง/ซ่อน ปุ่มล้าง
  if (clearBtn) clearBtn.style.display = query ? 'flex' : 'none';

  if (!query) {
    resultsEl.innerHTML = '';
    return;
  }

  // กรองนักเรียนที่ตรงกับคำค้นหา
  const matched = DB.filter(s => {
    const fullName = `${s.fname || ''} ${s.lname || ''}`.toLowerCase();
    const nick = (s.nickname || '').toLowerCase();
    const id = String(s.id || '').toLowerCase();
    const phone = (s.phone || '').toLowerCase();
    return fullName.includes(query) || nick.includes(query) || id.includes(query) || phone.includes(query);
  }).slice(0, 20);

  if (matched.length === 0) {
    resultsEl.innerHTML = `
      <div class="mob-search-empty">
        <i class="fa-solid fa-user-slash"></i>
        <div>ไม่พบนักเรียนที่ตรงกับ "<strong>${query}</strong>"</div>
      </div>`;
    return;
  }

  // สร้าง Card ผลลัพธ์
  resultsEl.innerHTML = matched.map(s => {
    const avatarHtml = getAvatarHTML(s, 44);
    const riskBadge = getRiskBadgesHTML(s);
    const displayName = getDisplayName(s);
    const room = s.room ? ` · กลุ่ม ${s.room}` : '';
    const levelYear = s.level && s.year ? `${s.level} ปี ${s.year}${room}` : '';
    return `
      <div class="qs-result-item" onclick="closeMobileSearch(); setTimeout(()=>viewProfile('${s.id}'), 200);">
        ${avatarHtml}
        <div style="flex:1; min-width:0;">
          <div style="font-weight:600; font-size:14px; color:var(--c-text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            ${displayName}
          </div>
          <div style="font-size:11.5px; color:var(--c-text-muted); margin-top:2px;">${levelYear}</div>
          <div style="margin-top:4px;">${riskBadge}</div>
        </div>
        <i class="fa-solid fa-chevron-right" style="color:var(--c-text-muted); font-size:12px; flex-shrink:0;"></i>
      </div>`;
  }).join('');
}

// ── THEME LIGHT / DARK SWITCHER ──
function toggleTheme() {
  const body = document.body;
  const themeIcon = document.getElementById('theme-icon');
  
  if (body.classList.contains('theme-dark')) {
    body.classList.remove('theme-dark');
    body.classList.add('theme-light');
    themeIcon.className = 'fa-solid fa-moon';
    showToast('☀️ สลับเป็นโหมดสีสว่าง', 'ok');
  } else {
    body.classList.remove('theme-light');
    body.classList.add('theme-dark');
    themeIcon.className = 'fa-solid fa-sun';
    showToast('🌙 สลับเป็นโหมดสีเข้มแบบพรีเมียม', 'ok');
  }
  
  // Dynamic update chart fonts and colors to match the active theme
  updateChartsTheme();
  
  // Refresh charts to match theme text colors
  if (pageIdActive() === 'dashboard') {
    updateDashboard();
  }
}

// Update Chart theme settings dynamically (Font Colors, Borders and Grids)
function updateChartsTheme() {
  if (!riskChartInstance || !classChartInstance) return;
  
  const isDark = document.body.classList.contains('theme-dark');
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  
  // Update Legend Labels Color in Risk Chart
  riskChartInstance.options.plugins.legend.labels.color = textColor;
  if (riskChartInstance.data.datasets[0]) {
    riskChartInstance.data.datasets[0].borderColor = isDark ? '#1e293b' : '#ffffff';
  }
  riskChartInstance.update();
  
  // Update Grid & Label Colors in Class Chart
  classChartInstance.options.scales.y.grid.color = gridColor;
  classChartInstance.options.scales.y.ticks.color = textColor;
  classChartInstance.options.scales.x.ticks.color = textColor;
  classChartInstance.update();
}

function pageIdActive() {
  const activePage = document.querySelector('.page.active');
  return activePage ? activePage.id.replace('page-', '') : 'dashboard';
}

// ── Robust Google Drive Link Extractor ──
function normalizeDriveUrl(url) {
  if (!url) return '';
  url = strDriveUrlClean(url);

  // Standard regular expressions to grab Drive IDs (including from lh3 links)
  const regD = /\/file\/d\/([a-zA-Z0-9_-]{25,45})/;
  const regId = /[?&]id=([a-zA-Z0-9_-]{25,45})/;
  const regU = /\/uc\?id=([a-zA-Z0-9_-]{25,45})/;
  const regPreview = /\/file\/d\/([a-zA-Z0-9_-]{25,45})\/preview/;
  const regLh3 = /lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]{25,45})/;

  const matchD = url.match(regD);
  const matchId = url.match(regId);
  const matchU = url.match(regU);
  const matchPreview = url.match(regPreview);
  const matchLh3 = url.match(regLh3);

  const fileId = (matchD && matchD[1]) || 
                 (matchId && matchId[1]) || 
                 (matchU && matchU[1]) || 
                 (matchPreview && matchPreview[1]) ||
                 (matchLh3 && matchLh3[1]);

  if (fileId) {
    return `https://drive.google.com/thumbnail?sz=w500&id=${fileId}`;
  }

  // Detect if only File ID was pasted
  const isIdOnly = /^[a-zA-Z0-9_-]{25,45}$/.test(url);
  if (isIdOnly) {
    return `https://drive.google.com/thumbnail?sz=w500&id=${url}`;
  }

  return url;
}

// ฟังก์ชันทำความสะอาดข้อความประเภทสตริงและจัดการลิงก์ดิ่ง
function strDriveUrlClean(str) {
  if (!str) return '';
  return String(str).trim();
}

// ── NAME AND NICKNAME PARSERS ──
function getDisplayName(s) {
  const prefix = /^(นาย|น\.ส\.?|นางสาว|นาง|เด็กชาย|ด\.ช\.?|ด\.ญ\.?|เด็กหญิง|mr\.?|ms\.?|miss\.?)\s*/i;
  let fn = (s.fname || '').trim().replace(prefix, '');
  let ln = (s.lname || '').trim().replace(prefix, '');

  if (fn && ln) return { fn, ln };
  
  const src = fn || ln || '?';
  const parts = src.split(/\s+/);
  return parts.length >= 2 ? { fn: parts[0], ln: parts.slice(1).join(' ') } : { fn: src, ln: '' };
}

// Generate Avatar Element
function getAvatarHTML(s, size = 50) {
  const { fn } = getDisplayName(s);
  const initial = (fn[0] || '?').toUpperCase();
  
  const palette = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
  const bg = palette[(s.id || '').charCodeAt(0) % palette.length || 0];
  
  const driveImg = normalizeDriveUrl(s.photo);
  const sz = size;
  
  if (driveImg) {
    return `<img src="${driveImg}" alt="Avatar" class="student-avatar-circle" style="width:${sz}px; height:${sz}px;" onerror="imgLoadFallback(this, '${bg}', '${initial}', ${sz})">`;
  }
  
  return `<div class="student-avatar-circle" style="width:${sz}px; height:${sz}px; border-radius:50%; background:${bg}; color:white; display:inline-flex; align-items:center; justify-content:center; font-size:${Math.floor(sz * 0.42)}px; font-weight:700; flex-shrink:0;">${initial}</div>`;
}

// Image load fallback (if Google Drive sharing is disabled or link is broken)
function imgLoadFallback(img, bg, initial, sz) {
  img.style.display = 'none';
  const fallbackDiv = document.createElement('div');
  fallbackDiv.className = 'student-avatar-circle';
  fallbackDiv.style.width = `${sz}px`;
  fallbackDiv.style.height = `${sz}px`;
  fallbackDiv.style.borderRadius = '50%';
  fallbackDiv.style.background = bg;
  fallbackDiv.style.color = 'white';
  fallbackDiv.style.display = 'inline-flex';
  fallbackDiv.style.alignItems = 'center';
  fallbackDiv.style.justifyContent = 'center';
  fallbackDiv.style.fontSize = `${Math.floor(sz * 0.42)}px`;
  fallbackDiv.style.fontWeight = '700';
  fallbackDiv.style.flexShrink = '0';
  fallbackDiv.textContent = initial;
  img.parentNode.insertBefore(fallbackDiv, img.nextSibling);
}

// Render status badge
function getStatusBadgeHTML(status) {
  const mapping = {
    'กำลังศึกษา': 'b-green',
    'สำเร็จการศึกษา': 'b-blue',
    'พ้นสภาพ': 'b-red'
  };
  return `<span class="badge ${mapping[status] || 'b-gray'}">${status || 'ไม่ระบุ'}</span>`;
}

// Render risk level badges
function getRiskBadgesHTML(s) {
  const html = [];
  if (s.risk_level === 'สูง') {
    html.push('<span class="badge b-red"><i class="fa-solid fa-triangle-exclamation"></i> สูง</span>');
  } else if (s.risk_level === 'ปานกลาง') {
    html.push('<span class="badge b-yellow"><i class="fa-solid fa-circle-exclamation"></i> ปานกลาง</span>');
  } else if (s.risk_level === 'ต่ำ') {
    html.push('<span class="badge b-green"><i class="fa-solid fa-shield-halved"></i> ต่ำ</span>');
  }
  
  // Specific aspects triggers
  if (s.risk_behavior && s.risk_behavior !== 'ปกติ') {
    html.push(`<span class="badge b-purple" title="เสี่ยงพฤติกรรม: ${s.risk_behavior}"><i class="fa-solid fa-face-angry"></i> ${s.risk_behavior.split('/')[0].trim()}</span>`);
  }
  if (s.risk_academic && s.risk_academic !== 'ปกติ') {
    html.push(`<span class="badge b-blue" title="เสี่ยงการเรียน: ${s.risk_academic}"><i class="fa-solid fa-book"></i> การเรียน</span>`);
  }
  if (s.risk_economic && s.risk_economic !== 'ปกติ' && s.risk_economic !== 'ดี' && s.risk_economic !== 'ปานกลาง') {
    html.push(`<span class="badge b-yellow" title="เสี่ยงเศรษฐกิจ: ${s.risk_economic}"><i class="fa-solid fa-coins"></i> เศรษฐกิจ</span>`);
  }
  
  return html.join(' ') || '<span class="badge b-gray">ยังไม่ประเมิน</span>';
}

// ── TOAST ALERT CONTROLLER ──
function showToast(msg, type = 'ok') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = type === 'ok' ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-xmark';
  toast.innerHTML = `<i class="${icon}"></i> <span>${msg}</span>`;
  
  container.appendChild(toast);

  // Auto remove
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// ── MODAL UTILITIES ──
function openModal(modalId) {
  const backdrop = document.getElementById(modalId);
  if (backdrop) {
    backdrop.style.display = 'flex';
    setTimeout(() => {
      backdrop.classList.add('open');
    }, 10);
  }
}

function closeModal(modalId) {
  const backdrop = document.getElementById(modalId);
  if (backdrop) {
    backdrop.classList.remove('open');
    setTimeout(() => {
      backdrop.style.display = 'none';
    }, 200);
  }
}

// Modal Tab Switcher
function switchModalTab(evt, tabId) {
  const tabContent = document.querySelectorAll('.modal-tab-content');
  tabContent.forEach(content => content.classList.remove('active'));

  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => btn.classList.remove('active'));

  document.getElementById(tabId).classList.add('active');
  evt.currentTarget.classList.add('active');
}

// ── CHARTS INITIALIZATION ──
function initializeCharts() {
  const isDark = document.body.classList.contains('theme-dark');
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';

  // Risk Doughnut Chart
  const ctxRisk = document.getElementById('riskChart');
  if (ctxRisk) {
    riskChartInstance = new Chart(ctxRisk, {
      type: 'doughnut',
      data: {
        labels: ['ความเสี่ยงสูง', 'ความเสี่ยงปานกลาง', 'ความเสี่ยงต่ำ', 'ยังไม่คัดกรอง'],
        datasets: [{
          data: [0, 0, 0, 0],
          backgroundColor: ['#ef4444', '#f59e0b', '#10b981', '#64748b'],
          borderWidth: isDark ? 2 : 1,
          borderColor: isDark ? '#1e293b' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: textColor,
              font: { family: 'Prompt', size: 12 }
            }
          }
        },
        cutout: '65%'
      }
    });
  }

  // Class Bar Chart
  const ctxClass = document.getElementById('classChart');
  if (ctxClass) {
    classChartInstance = new Chart(ctxClass, {
      type: 'bar',
      data: {
        labels: ['ปวช. 1', 'ปวช. 2', 'ปวช. 3', 'ปวส. 1', 'ปวส. 2'],
        datasets: [{
          label: 'จำนวนนักเรียน (คน)',
          data: [0, 0, 0, 0, 0],
          backgroundColor: 'rgba(79, 70, 229, 0.75)',
          borderColor: '#4f46e5',
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            grid: { color: gridColor },
            ticks: { color: textColor, font: { family: 'Sarabun' } }
          },
          x: {
            grid: { display: false },
            ticks: { color: textColor, font: { family: 'Prompt' } }
          }
        }
      }
    });
  }
}

// Update charts with actual state
function updateChartsData() {
  const rH = DB.filter(s => s.status === 'กำลังศึกษา' && s.risk_level === 'สูง').length;
  const rM = DB.filter(s => s.status === 'กำลังศึกษา' && s.risk_level === 'ปานกลาง').length;
  const rL = DB.filter(s => s.status === 'กำลังศึกษา' && s.risk_level === 'ต่ำ').length;
  const rNone = DB.filter(s => s.status === 'กำลังศึกษา' && !s.risk_level).length;

  if (riskChartInstance) {
    riskChartInstance.data.datasets[0].data = [rH, rM, rL, rNone];
    
    // Update labels to include amounts
    riskChartInstance.data.labels = [
      `ความเสี่ยงสูง (${rH} คน)`,
      `ความเสี่ยงปานกลาง (${rM} คน)`,
      `ความเสี่ยงต่ำ (${rL} คน)`,
      `ยังไม่คัดกรอง (${rNone} คน)`
    ];
    riskChartInstance.update();
  }

  // Class Level amounts (Active students only)
  const activeStu = DB.filter(s => s.status === 'กำลังศึกษา');
  const p1 = activeStu.filter(s => s.level === 'ปวช.' && String(s.year) === '1').length;
  const p2 = activeStu.filter(s => s.level === 'ปวช.' && String(s.year) === '2').length;
  const p3 = activeStu.filter(s => s.level === 'ปวช.' && String(s.year) === '3').length;
  const s1 = activeStu.filter(s => s.level === 'ปวส.' && String(s.year) === '1').length;
  const s2 = activeStu.filter(s => s.level === 'ปวส.' && String(s.year) === '2').length;

  if (classChartInstance) {
    classChartInstance.data.datasets[0].data = [p1, p2, p3, s1, s2];
    classChartInstance.update();
  }
}

// ── DASHBOARD REFRESH ──
function updateDashboard() {
  const total = DB.length;
  const active = DB.filter(s => s.status === 'กำลังศึกษา').length;
  const grad = DB.filter(s => s.status === 'สำเร็จการศึกษา').length;
  const resigned = DB.filter(s => s.status === 'พ้นสภาพ').length;
  
  const rHigh = DB.filter(s => s.status === 'กำลังศึกษา' && s.risk_level === 'สูง').length;
  const rMed = DB.filter(s => s.status === 'กำลังศึกษา' && s.risk_level === 'ปานกลาง').length;

  // คำนวณพฤติกรรมเสี่ยงสารเสพติด / สูบ / ดื่ม ตามที่คุณครูขอ (ใช้ฟังก์ชันตรวจสอบอัจฉริยะเพื่อป้องกันข้อผิดพลาด)
  const rSubstance = DB.filter(s => 
    s.status === 'กำลังศึกษา' && checkSubstanceRisk(s.smoke, s.risk_behavior)
  ).length;

  // คำนวณการขับขี่รถมอเตอร์ไซค์มาเรียน ตามที่คุณครูขอ
  const rMotorcycle = DB.filter(s => 
    s.status === 'กำลังศึกษา' && 
    s.transport && (s.transport.includes('มอเตอร์') || s.transport.includes('มอไซค์') || s.transport.includes('มอเตอร์ไซค์') || s.transport.includes('มอเตอร์ไชล์') || s.transport.includes('มอไซ') || s.transport.includes('มอไซด์'))
  ).length;

  // คำนวณนักเรียนที่มีปัญหาการเงิน / ต้องการทุน ตามที่คุณครูขอ (v14.3 Upgrade - กรองเฉพาะคนระบุค่ากินต่อวัน)
  const rFinancial = DB.filter(s => 
    s.status === 'กำลังศึกษา' && checkFinancialRisk(s)
  ).length;

  // Stat Grid Inner HTML
  const statGrid = document.getElementById('stat-grid');
  if (statGrid) {
    statGrid.innerHTML = `
      <div class="stat-card clickable" onclick="filterByStatus('')" title="คลิกดูรายชื่อนักเรียนทั้งหมด">
        <div class="lbl" style="color: var(--p);"><i class="fa-solid fa-users"></i> นักเรียนทั้งหมดในระบบ</div>
        <div class="val font-accent">${total}</div>
        <div class="sub"><i class="fa-solid fa-users"></i> รวมประวัติสะสม (คลิกดู)</div>
      </div>
      <div class="stat-card stat-card-active clickable" onclick="filterByStatus('กำลังศึกษา')" title="คลิกดูรายชื่อเฉพาะนักเรียนกำลังศึกษา">
        <div class="lbl">กำลังศึกษาปัจจุบัน</div>
        <div class="val" style="color: var(--g);">${active}</div>
        <div class="sub" style="color: var(--g);"><i class="fa-solid fa-graduation-cap"></i> ทะเบียนกำลังศึกษา (คลิกดู)</div>
      </div>
      <div class="stat-card stat-card-grad clickable" onclick="filterByStatus('สำเร็จการศึกษา')" title="คลิกดูรายชื่อเฉพาะผู้สำเร็จการศึกษา">
        <div class="lbl">สำเร็จการศึกษา</div>
        <div class="val">${grad}</div>
        <div class="sub"><i class="fa-solid fa-award"></i> บัณฑิตแผนกวิชา (คลิกดู)</div>
      </div>
      <div class="stat-card stat-card-resigned clickable" onclick="filterByStatus('พ้นสภาพ')" title="คลิกดูรายชื่อเฉพาะนักเรียนที่พ้นสภาพ">
        <div class="lbl">พ้นสภาพ / ออกกลางคัน</div>
        <div class="val" style="color: var(--r);">${resigned}</div>
        <div class="sub" style="color: var(--r);"><i class="fa-solid fa-user-slash"></i> ย้าย / ตกออก / พ้นสภาพ (คลิกดู)</div>
      </div>
      <div class="stat-card stat-card-high clickable" onclick="openRiskModal('สูง')" title="คลิกดูรายชื่อเฝ้าระวังความเสี่ยงสูง">
        <div class="lbl">🔴 เสี่ยงสูงมาก (เฝ้าระวัง)</div>
        <div class="val" style="color: var(--r);">${rHigh}</div>
        <div class="sub"><i class="fa-solid fa-circle-exclamation"></i> รายชื่อเด็กเสี่ยงสูง (คลิกดู)</div>
      </div>
      <div class="stat-card stat-card-med clickable" onclick="openRiskModal('ปานกลาง')" title="คลิกดูรายชื่อความเสี่ยงปานกลาง">
        <div class="lbl">🟡 เสี่ยงปานกลาง</div>
        <div class="val" style="color: var(--y);">${rMed}</div>
        <div class="sub"><i class="fa-solid fa-triangle-exclamation"></i> มีปัจจัยความเสี่ยง (คลิกดู)</div>
      </div>
      
      <!-- Watchlist Cards เพิ่มพิเศษแบบพรีเมียมตามคำขอคุณครู -->
      <div class="stat-card clickable" onclick="filterBySubstance('risk')" style="border-color: rgba(139, 92, 246, 0.35); background: rgba(139, 92, 246, 0.03);" title="คลิกดูรายชื่อเด็กเสี่ยงดื่ม/สูบ/สารเสพติด">
        <div class="lbl" style="color: #a78bfa;"><i class="fa-solid fa-smoking"></i> อบายมุข & สารเสพติด</div>
        <div class="val" style="color: #c084fc;">${rSubstance}</div>
        <div class="sub" style="color: #c084fc;"><i class="fa-solid fa-triangle-exclamation"></i> เสี่ยงดื่ม/สูบ/สารเสพติด (คลิกดู)</div>
      </div>
      <div class="stat-card clickable" onclick="filterByTransport('motorcycle')" style="border-color: rgba(16, 185, 129, 0.35); background: rgba(16, 185, 129, 0.03);" title="คลิกดูรายชื่อเด็กขับมอเตอร์ไซค์มาเรียน">
        <div class="lbl" style="color: #34d399;"><i class="fa-solid fa-motorcycle"></i> การใช้จักรยานยนต์</div>
        <div class="val" style="color: #6ee7b7;">${rMotorcycle}</div>
        <div class="sub" style="color: #6ee7b7;"><i class="fa-solid fa-circle-info"></i> ขับขี่มอเตอร์ไซค์มาเรียน (คลิกดู)</div>
      </div>
      <div class="stat-card clickable" onclick="filterByFinancial('risk')" style="border-color: rgba(245, 158, 11, 0.35); background: rgba(245, 158, 11, 0.03);" title="คลิกดูรายชื่อเด็กต้องการทุนการศึกษา/มีปัญหาการเงิน">
        <div class="lbl" style="color: #f59e0b;"><i class="fa-solid fa-hand-holding-dollar"></i> ปัญหาการเงิน & ขอทุน</div>
        <div class="val" style="color: #fbbf24;">${rFinancial}</div>
        <div class="sub" style="color: #fbbf24;"><i class="fa-solid fa-circle-info"></i> ต้องการทุน / การเงินวิกฤต (คลิกดู)</div>
      </div>
    `;
  }

  // Group Breakdown List
  const tree = {};
  DB.forEach(s => {
    if (s.status !== 'กำลังศึกษา') return; // Active study only for class grouping
    const lv = `${s.level || '?'} ปี ${s.year || '?'}`;
    const room = s.room || 'ไม่ระบุกลุ่ม';
    if (!tree[lv]) tree[lv] = {};
    tree[lv][room] = (tree[lv][room] || 0) + 1;
  });

  let gHTML = '';
  Object.keys(tree).sort().forEach(lv => {
    const lvTotal = Object.values(tree[lv]).reduce((a, b) => a + b, 0);
    gHTML += `
      <div style="padding: 10px 4px 6px; border-bottom: 2px solid var(--border-color); display: flex; justify-content: space-between; font-weight: 700;">
        <span class="font-accent"><i class="fa-solid fa-bookmark"></i> ${lv}</span>
        <span style="font-size: 12px; color: var(--c5);">รวม ${lvTotal} คน</span>
      </div>
    `;
    Object.keys(tree[lv]).sort().forEach(room => {
      gHTML += `
        <div class="grp-row" onclick="jumpToGroup('${lv}', '${room}')">
          <span style="font-size: 13.5px;"><i class="fa-regular fa-folder-open font-accent" style="margin-right:6px;"></i>กลุ่มเรียน ${room}</span>
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="badge b-purple">${tree[lv][room]} คน</span>
            <span class="risk-arrow"><i class="fa-solid fa-chevron-right"></i></span>
          </div>
        </div>
      `;
    });
  });
  const grpContainer = document.getElementById('group-bd');
  if (grpContainer) {
    grpContainer.innerHTML = gHTML || '<div class="empty"><i class="fa-solid fa-face-meh"></i><p>ยังไม่มีข้อมูลนักเรียนกำลังศึกษา</p></div>';
  }

  // Risk Categories Breakdown List
  const riskCategories = [
    { k: 'risk_level', l: 'ระดับประเมินความเสี่ยงรวม', ico: '🛡️' },
    { k: 'risk_academic', l: 'ความเสี่ยงด้านการเรียน', ico: '📚' },
    { k: 'risk_behavior', l: 'ความเสี่ยงด้านพฤติกรรม', ico: '⚠️' },
    { k: 'risk_family', l: 'ความเสี่ยงด้านครอบครัว', ico: '🏠' },
    { k: 'risk_economic', l: 'ความเสี่ยงด้านเศรษฐกิจ', ico: '💰' }
  ];
  let rHTML = '';
  riskCategories.forEach(cat => {
    const counts = {};
    DB.forEach(s => {
      if (s.status !== 'กำลังศึกษา') return; // Active study only
      const v = s[cat.k];
      if (v && v !== 'ปกติ') counts[v] = (counts[v] || 0) + 1;
    });

    if (Object.keys(counts).length > 0) {
      rHTML += `
        <div style="margin-bottom: 12px;">
          <div style="font-size: 12px; font-weight: 700; color: var(--c5); padding: 8px 4px 6px; border-bottom: 1px solid var(--border-color);">${cat.ico} ${cat.l}</div>
      `;
      Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([val, cnt]) => {
        const isCritical = val === 'สูง' || val.includes('ยาเสพติด') || val.includes('ออกกลางคัน') || val.includes('ก้าวร้าว') || val.includes('ยากจน');
        const isWarning = val === 'ปานกลาง' || val.includes('เก็บตัว') || val.includes('ติดเพื่อน') || val.includes('ขาดเรียน');
        
        const badgeColor = isCritical ? 'b-red' : (isWarning ? 'b-yellow' : 'b-blue');
        
        rHTML += `
          <div class="risk-row" onclick="openRiskDetailModal('${cat.k}', '${cat.l}', '${val}')">
            <span style="font-weight: ${isCritical ? '700' : '500'}; font-size:13px;">${val}</span>
            <div style="display:flex; align-items:center;">
              <span class="badge ${badgeColor}">${cnt} คน</span>
              <span class="risk-arrow"><i class="fa-solid fa-chevron-right"></i></span>
            </div>
          </div>
        `;
      });
      rHTML += '</div>';
    }
  });
  const riskContainer = document.getElementById('risk-bd');
  if (riskContainer) {
    riskContainer.innerHTML = rHTML || '<div class="empty"><i class="fa-solid fa-square-check"></i><p>นักเรียนทุกคนอยู่ในสถานะปกติและปลอดภัย</p></div>';
  }

  // Recent 10 Edited list
  const recentList = document.getElementById('recent-list');
  if (recentList) {
    const recentData = [...DB].slice(-10).reverse();
    recentList.innerHTML = recentData.length > 0 ? recentData.map(s => {
      const dn = getDisplayName(s);
      let riskSign = '';
      if (s.risk_level === 'สูง') riskSign = '🔴';
      else if (s.risk_level === 'ปานกลาง') riskSign = '🟡';
      else if (s.risk_level === 'ต่ำ') riskSign = '🟢';
      
      const nicknameText = s.nickname ? `<span class="nickname-pill" style="color:var(--p); font-size:11.5px; font-weight:600; margin-left:4px;">(${s.nickname})</span>` : '';
      
      return `
        <div class="recent-student-card" onclick="viewProfile('${s.id}')">
          ${getAvatarHTML(s, 44)}
          <div style="flex:1; min-width:0;">
            <div style="font-weight: 600; font-size:13px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">
              ${dn.fn} ${dn.ln}${nicknameText}
            </div>
            <div style="font-size:11px; color: var(--c5); margin-top:2px;">
              ${s.level || ''} ปี ${s.year || ''} · กลุ่ม ${s.room || '-'}
            </div>
          </div>
          <span style="font-size: 12px; font-weight:700;">${riskSign}</span>
        </div>
      `;
    }).join('') : '<div class="empty" style="grid-column: 1 / -1;"><p>ไม่มีประวัติบันทึกข้อมูล</p></div>';
  }

  // Refresh Charts
  updateChartsData();
}

function jumpToGroup(lvYear, room) {
  const m = lvYear.match(/^(.+?)\s*ปี\s*(\S+)$/);
  if (m) {
    document.getElementById('filter-level').value = m[1].trim();
    document.getElementById('filter-year').value = m[2].trim();
  }
  buildRoomFilter();
  setTimeout(() => {
    document.getElementById('filter-room').value = room;
    renderStudents();
  }, 100);
  goPage('students');
}

// ── STUDENTS LIST CONTROLLER ──
function buildRoomFilter() {
  const sel = document.getElementById('filter-room');
  if (!sel) return;
  
  const selectedLevel = document.getElementById('filter-level').value;
  const selectedYear = document.getElementById('filter-year').value;
  
  const rooms = [...new Set(DB.filter(s => {
    const matchLevel = !selectedLevel || s.level === selectedLevel;
    const matchYear = !selectedYear || String(s.year) === selectedYear;
    return matchLevel && matchYear;
  }).map(s => s.room || '').filter(Boolean))].sort();
  
  const currentVal = sel.value;
  sel.innerHTML = '<option value="">ทุกกลุ่ม/ห้อง</option>' + rooms.map(r => `
    <option value="${r}" ${r === currentVal ? 'selected' : ''}>${r}</option>
  `).join('');
}

function renderStudents() {
  const query = (document.getElementById('stu-search').value || '').toLowerCase().trim();
  const fLevel = document.getElementById('filter-level').value;
  const fYear = document.getElementById('filter-year').value;
  const fRoom = document.getElementById('filter-room').value;
  const fStatus = document.getElementById('filter-status').value;
  const fSubstance = document.getElementById('filter-substance') ? document.getElementById('filter-substance').value : '';
  const fTransport = document.getElementById('filter-transport') ? document.getElementById('filter-transport').value : '';
  const fFinancial = document.getElementById('filter-financial') ? document.getElementById('filter-financial').value : '';

  // Filter query
  let filtered = DB.filter(s => {
    const dn = getDisplayName(s);
    // BUG FIX: Search from nickname correctly
    const matchQuery = !query || [
      s.id, 
      dn.fn, 
      dn.ln, 
      s.nickname, // Nickname included directly
      s.phone, 
      s.parentphone, 
      s.room
    ].some(v => (v || '').toLowerCase().includes(query));
    
    const matchLvl = !fLevel || s.level === fLevel;
    const matchYr = !fYear || String(s.year) === fYear;
    const matchRm = !fRoom || s.room === fRoom;
    const matchSt = !fStatus || s.status === fStatus;

    // กรองสารเสพติด / สูบ / ดื่ม (ตามคำขอคุณครู - ใช้ฟังก์ชันตรวจสอบอัจฉริยะป้องกันข้อผิดพลาด)
    const isSubstanceRisk = checkSubstanceRisk(s.smoke, s.risk_behavior);
    const matchSubstance = !fSubstance || (fSubstance === 'risk' ? isSubstanceRisk : !isSubstanceRisk);

    // กรองขับขี่มอเตอร์ไซค์มาวิทยาลัย
    const isMotorcycle = s.transport && (s.transport.includes('มอเตอร์') || s.transport.includes('มอไซค์') || s.transport.includes('มอเตอร์ไซค์') || s.transport.includes('มอเตอร์ไชล์') || s.transport.includes('มอไซ') || s.transport.includes('มอไซด์'));
    const matchTransport = !fTransport || (fTransport === 'motorcycle' ? isMotorcycle : !isMotorcycle);

    // กรองประเด็นปัญหาการเงินและการขอทุน (v14.3 Upgrade - กรองเฉพาะคนระบุค่ากินต่อวัน)
    const isFinancialRisk = checkFinancialRisk(s);
    const matchFinancial = !fFinancial || (fFinancial === 'risk' ? isFinancialRisk : !isFinancialRisk);

    return matchQuery && matchLvl && matchYr && matchRm && matchSt && matchSubstance && matchTransport && matchFinancial;
  });

  // เรียงลำดับนักเรียนตาม กลุ่มเรียน และ รหัสประจำตัวนักเรียน จากน้อยไปมาก (ตามคำขอคุณครู)
  filtered.sort((a, b) => {
    // 1. ระดับชั้น (ปวช. มาก่อน ปวส.)
    if ((a.level || '') !== (b.level || '')) {
      return (a.level || '') === 'ปวช.' ? -1 : 1;
    }
    // 2. ชั้นปี (ปี 1, ปี 2, ปี 3)
    if (String(a.year || '') !== String(b.year || '')) {
      return String(a.year || '').localeCompare(String(b.year || ''), 'th', { numeric: true });
    }
    // 3. กลุ่มเรียน / ห้องเรียน (กลุ่ม 1, กลุ่ม 2...)
    if (String(a.room || '') !== String(b.room || '')) {
      return String(a.room || '').localeCompare(String(b.room || ''), 'th', { numeric: true });
    }
    // 4. รหัสประจำตัวนักเรียน (เรียงจากน้อยไปมากเป็นหลักสำคัญที่สุด)
    return String(a.id || '').localeCompare(String(b.id || ''), 'th', { numeric: true });
  });

  const total = filtered.length;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE) || 1;
  if (currentPage > totalPages) currentPage = 1;

  const dataSlice = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Update header count if in list page
  const listCountPill = document.getElementById('hdr-count');
  if (listCountPill && pageIdActive() === 'students') {
    listCountPill.textContent = `พบ ${total} คน`;
  }

  // 1. Render Table (PC View)
  const tbody = document.getElementById('stu-tbody');
  let tableRows = '';

  if (dataSlice.length === 0) {
    tableRows = `
      <tr>
        <td colspan="9">
          <div class="empty">
            <i class="fa-solid fa-face-frown ei"></i>
            <p>ไม่พบรายชื่อนักเรียนตามคำค้นหาและตัวกรองดังกล่าว</p>
          </div>
        </td>
      </tr>
    `;
  } else {
    // Keep track of last group for aesthetic header division in tables
    let lastGroup = null;
    dataSlice.forEach(s => {
      const dn = getDisplayName(s);
      const groupKey = `${s.level || '?'} ปี ${s.year || '?'} กลุ่ม ${s.room || '-'}`;
      
      if (groupKey !== lastGroup) {
        const groupCount = filtered.filter(x => `${x.level || '?'} ปี ${x.year || '?'}` === `${s.level || '?'} ปี ${s.year || '?'}` && x.room === s.room).length;
        tableRows += `
          <tr class="group-divider">
            <td colspan="9" style="background: rgba(255, 255, 255, 0.02); font-weight: 700; font-size:12px; color: var(--p); border-top: 2px solid var(--border-color); padding: 8px 18px;">
              <i class="fa-solid fa-chalkboard-user"></i> ${groupKey} <span class="badge b-purple" style="margin-left:8px; padding:2px 8px; font-size:10px;">มีในกลุ่มนี้ ${groupCount} คน</span>
            </td>
          </tr>
        `;
        lastGroup = groupKey;
      }

      // Highlight Search Term inside names or nicknames
      let fullNameStr = `${dn.fn} ${dn.ln}`;
      let nicknameStr = s.nickname ? `(${s.nickname})` : '';

      if (query) {
        fullNameStr = highlightText(fullNameStr, query);
        if (s.nickname) {
          nicknameStr = `(${highlightText(s.nickname, query)})`;
        }
      }

      tableRows += `
        <tr class="student-table-row">
          <td>${getAvatarHTML(s, 48)}</td>
          <td>
            <div style="font-weight:600; color:var(--c9); cursor:pointer;" onclick="viewProfile('${s.id}')">
              ${fullNameStr} <span style="color:var(--p); font-size:12px; font-weight:700;">${nicknameStr}</span>
            </div>
          </td>
          <td><span style="font-family:monospace; color:var(--c5); font-weight:600;">${s.id}</span></td>
          <td>${s.level || '-'} ปี ${s.year || '-'}</td>
          <td><span class="badge b-purple">${s.room || '-'}</span></td>
          <td>${getStatusBadgeHTML(s.status)}</td>
          <td><span style="font-family:monospace;">${s.phone || '-'}</span></td>
          <td>${getRiskBadgesHTML(s)}</td>
          <td style="text-align: center;">
            <div style="display:flex; justify-content:center; gap:4px;">
              <button class="m-act-btn" onclick="viewProfile('${s.id}')" title="ดูโปรไฟล์"><i class="fa-solid fa-id-card"></i></button>
              <button class="m-act-btn" onclick="openEditModal('${s.id}')" title="แก้ไข"><i class="fa-solid fa-pen-to-square"></i></button>
              <button class="m-act-btn d" onclick="deleteStudent('${s.id}')" title="ลบถาวร"><i class="fa-solid fa-trash-can"></i></button>
            </div>
          </td>
        </tr>
      `;
    });
  }
  tbody.innerHTML = tableRows;

  // 2. Render Cards (Mobile View)
  const cardsContainer = document.getElementById('mob-card-list');
  let cardHTML = '';

  if (dataSlice.length === 0) {
    cardHTML = `
      <div class="empty">
        <i class="fa-solid fa-face-frown ei"></i>
        <p>ไม่พบรายชื่อนักเรียน</p>
      </div>
    `;
  } else {
    dataSlice.forEach(s => {
      const dn = getDisplayName(s);
      let fullNameStr = `${dn.fn} ${dn.ln}`;
      let nicknameStr = s.nickname ? `(${s.nickname})` : '';

      if (query) {
        fullNameStr = highlightText(fullNameStr, query);
        if (s.nickname) {
          nicknameStr = `(${highlightText(s.nickname, query)})`;
        }
      }

      const riskClass = s.risk_level === 'สูง' ? 'm-risk-high' : 
                        (s.risk_level === 'ปานกลาง' ? 'm-risk-med' : 
                        (s.risk_level === 'ต่ำ' ? 'm-risk-low' : 'm-risk-none'));

      // Check if student phone or parent phone is present for mobile active links
      const hasPhone = s.phone && s.phone.trim() ? true : false;
      const hasParentPhone = s.parentphone && s.parentphone.trim() ? true : false;

      const callStudentBtn = hasPhone ? 
        `<a href="tel:${s.phone.trim()}" class="m-card-btn m-btn-call" onclick="event.stopPropagation()"><i class="fa-solid fa-phone"></i> โทรนักเรียน</a>` :
        `<button class="m-card-btn m-btn-disabled" onclick="event.stopPropagation()" disabled><i class="fa-solid fa-phone"></i> โทรนักเรียน</button>`;

      const callParentBtn = hasParentPhone ? 
        `<a href="tel:${s.parentphone.trim()}" class="m-card-btn m-btn-parent" onclick="event.stopPropagation()"><i class="fa-solid fa-user-shield"></i> โทรผู้ปกครอง</a>` :
        `<button class="m-card-btn m-btn-disabled" onclick="event.stopPropagation()" disabled><i class="fa-solid fa-user-shield"></i> โทรผู้ปกครอง</button>`;

      cardHTML += `
        <div class="m-card ${riskClass}" onclick="viewProfile('${s.id}')">
          <div class="m-card-body">
            <div class="m-card-avatar-wrapper">
              ${getAvatarHTML(s, 64)}
            </div>
            <div class="m-card-info">
              <div class="m-card-name-row">
                <span class="m-card-name">${fullNameStr}</span>
                ${s.nickname ? `<span class="m-card-nickname">${nicknameStr}</span>` : ''}
              </div>
              <div class="m-card-id">รหัสประจำตัว: ${s.id}</div>
              <div class="m-card-classroom">
                <i class="fa-solid fa-graduation-cap"></i>
                <span>ระดับการศึกษา: ${s.level || ''} ${s.year || ''} · กลุ่มเรียน: ${s.room || '-'}</span>
              </div>
              <div class="m-card-badges">
                ${getStatusBadgeHTML(s.status)}
                ${getRiskBadgesHTML(s)}
              </div>
            </div>
          </div>
          <div class="m-card-actions-divider"></div>
          <div class="m-card-quick-actions">
            <button class="m-card-btn m-btn-profile" onclick="viewProfile('${s.id}'); event.stopPropagation();">
              <i class="fa-solid fa-address-card"></i> รายละเอียด
            </button>
            ${callStudentBtn}
            ${callParentBtn}
            <button class="m-card-btn m-btn-edit" onclick="openEditModal('${s.id}'); event.stopPropagation();">
              <i class="fa-solid fa-pen-to-square"></i> แก้ไข
            </button>
            <button class="m-card-btn m-btn-delete" onclick="deleteStudent('${s.id}'); event.stopPropagation();">
              <i class="fa-solid fa-trash-can"></i> ลบ
            </button>
          </div>
        </div>
      `;
    });
  }
  cardsContainer.innerHTML = cardHTML;

  // 3. Render Paginations
  renderPagination(total, totalPages, 'stu-pg');
  renderPagination(total, totalPages, 'mob-pg');
}

// Highlight word helper
function highlightText(text, term) {
  if (!term || !text) return text;
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return text;
  
  return text.substring(0, idx) + 
         `<span class="search-highlight">${text.substring(idx, idx + term.length)}</span>` + 
         highlightText(text.substring(idx + term.length), term);
}

// Render pagination links
function renderPagination(totalCount, totalPages, elementId) {
  const container = document.getElementById(elementId);
  if (!container) return;

  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = `<button class="pg-btn" onclick="changePage(1)" ${currentPage === 1 ? 'disabled style="opacity:0.3;"' : ''}><i class="fa-solid fa-angles-left"></i></button>`;
  html += `<button class="pg-btn" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled style="opacity:0.3;"' : ''}><i class="fa-solid fa-angle-left"></i></button>`;

  // Render around page list (max 5 pages shown)
  let start = Math.max(1, currentPage - 2);
  let end = Math.min(totalPages, start + 4);
  if (end - start < 4) {
    start = Math.max(1, end - 4);
  }

  for (let i = start; i <= end; i++) {
    html += `
      <button class="pg-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>
    `;
  }

  html += `<button class="pg-btn" onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled style="opacity:0.3;"' : ''}><i class="fa-solid fa-angle-right"></i></button>`;
  html += `<button class="pg-btn" onclick="changePage(${totalPages})" ${currentPage === totalPages ? 'disabled style="opacity:0.3;"' : ''}><i class="fa-solid fa-angles-right"></i></button>`;

  container.innerHTML = html;
}

function changePage(pageNum) {
  currentPage = pageNum;
  renderStudents();
  // Scroll main view top
  document.getElementById('main').scrollTop = 0;
}

// Handle Form Level Change (ปวช. vs ปวส.)
function handleLevelChange() {
  const levelSelect = document.getElementById('f-level');
  const yearSelect = document.getElementById('f-year');
  const internshipSection = document.getElementById('internship-form-section');
  
  if (!levelSelect || !yearSelect) return;
  
  const level = levelSelect.value;
  const currentYear = yearSelect.value;
  
  // Update year options based on level
  if (level === 'ปวช.') {
    yearSelect.innerHTML = `
      <option value="1">1</option>
      <option value="2">2</option>
      <option value="3">3</option>
    `;
    if (internshipSection) internshipSection.style.display = 'none';
  } else if (level === 'ปวส.') {
    yearSelect.innerHTML = `
      <option value="1">1</option>
      <option value="2">2</option>
    `;
    if (internshipSection) internshipSection.style.display = 'block';
  }
  
  // Restore year value if it exists in the new options list
  if (level === 'ปวส.' && currentYear === '3') {
    yearSelect.value = '1';
  } else {
    yearSelect.value = currentYear || '1';
  }
}

// ── CRUD SYSTEM: ADD / EDIT / DELETE ──
function openAddModal() {
  editId = null;
  document.getElementById('stu-form').reset();
  document.getElementById('f-edit-id').value = '';
  document.getElementById('f-id').removeAttribute('readonly');
  
  // Set tab active
  document.getElementById('modal-title').textContent = 'เพิ่มข้อมูลนักเรียนใหม่';
  
  const firstTabButton = document.querySelector('.tab-btn');
  if (firstTabButton) {
    firstTabButton.click(); // trigger basic tab active
  }

  handleLevelChange();
  openModal('add-modal');
}

function openEditModal(studentId) {
  editId = studentId;
  const s = DB.find(x => String(x.id) === String(studentId));
  if (!s) return;

  document.getElementById('f-edit-id').value = studentId;
  
    const idInput = document.getElementById('f-id');
  idInput.value = s.id;
  idInput.removeAttribute('readonly'); // [v12.9 ปลดล็อกเสรี] ให้คุณครูแก้ไขรหัสประจำตัวนักเรียนได้ทุกกรณีเสมอ

  // Load other inputs
  document.getElementById('f-fname').value = s.fname || '';
  document.getElementById('f-lname').value = s.lname || '';
  document.getElementById('f-nickname').value = s.nickname || '';
  document.getElementById('f-photo').value = s.photo || '';
  document.getElementById('f-level').value = s.level || 'ปวช.';
  
  // Call handleLevelChange to update year options and show/hide internship section
  handleLevelChange();
  
  document.getElementById('f-year').value = s.year || '1';
  document.getElementById('f-room').value = s.room || '';
  document.getElementById('f-status').value = s.status || 'กำลังศึกษา';
  document.getElementById('f-phone').value = s.phone || '';
  document.getElementById('f-social').value = s.social || '';
  document.getElementById('f-parent').value = s.parent || '';
  document.getElementById('f-parentphone').value = s.parentphone || '';
  document.getElementById('f-parentphone2').value = s.parentphone2 || '';
  document.getElementById('f-prevschool').value = s.prevschool || '';
  document.getElementById('f-shirt').value = s.shirt || '';
  document.getElementById('f-health').value = s.health || '';
  document.getElementById('f-transport').value = s.transport || '';
  document.getElementById('f-allowance').value = s.allowance || '';
  document.getElementById('f-smoke').value = s.smoke || '';
  
  // 9 Additional Fields (v11)
  document.getElementById('f-gender').value = s.gender || '';
  document.getElementById('f-address-no').value = s.address_no || '';
  document.getElementById('f-address-road').value = s.address_road || '';
  document.getElementById('f-address-subdistrict').value = s.address_subdistrict || '';
  document.getElementById('f-address-district').value = s.address_district || '';
  document.getElementById('f-address-zipcode').value = s.address_zipcode || '';
  document.getElementById('f-needs-scholarship').value = s.needs_scholarship || '';
  document.getElementById('f-parent-job').value = s.parent_job || '';
  document.getElementById('f-parent-income').value = s.parent_income || '';
  
  // Set internship values
  const intPlace = document.getElementById('f-internship-place');
  const intPhone = document.getElementById('f-internship-phone');
  if (intPlace) intPlace.value = s.internship_place || '';
  if (intPhone) intPhone.value = s.internship_phone || '';
  
  // Risks fields
  document.getElementById('f-risk-level').value = s.risk_level || '';
  document.getElementById('f-risk-academic').value = s.risk_academic || 'ปกติ';
  document.getElementById('f-risk-behavior').value = s.risk_behavior || 'ปกติ';
  document.getElementById('f-risk-family').value = s.risk_family || 'ปกติ';
  document.getElementById('f-risk-economic').value = s.risk_economic || 'ปกติ';
  document.getElementById('f-risk-note').value = s.risk_note || '';

  document.getElementById('modal-title').textContent = 'แก้ไขประวัตินักเรียน';
  
  // Set tab basic active
  const firstTabButton = document.querySelector('.tab-btn');
  if (firstTabButton) {
    firstTabButton.click();
  }

  openModal('add-modal');
}

function saveStudent(e) {
  e.preventDefault();

  const idVal = document.getElementById('f-id').value.trim();
  const fnameVal = document.getElementById('f-fname').value.trim();
  const lnameVal = document.getElementById('f-lname').value.trim();

  if (!idVal || !fnameVal) { // [v13.1 ยกระดับ JavaScript Validation ป้องกัน Chrome บล็อกโมดอลแท็บซ่อน]
    showToast('⚠️ กรุณากรอกรหัสประจำตัว และชื่อจริงของนักเรียน', 'err');
    
    // คืนค่าสลับกลับไปที่แท็บแรก (ข้อมูลพื้นฐาน) อัตโนมัติ เพื่อให้ผู้ใช้มองเห็นช่องกรอกข้อมูล
    const firstTabButton = document.querySelector('.tab-btn');
    if (firstTabButton) {
      firstTabButton.click();
    }
    
    // โฟกัสไปยังฟิลด์ที่เว้นว่างไว้ทันทีเพื่อให้ครูพิมพ์ต่อได้ง่าย
    if (!idVal) {
      document.getElementById('f-id').focus();
    } else if (!fnameVal) {
      document.getElementById('f-fname').focus();
    }
    return;
  }

  // Create student object
  const s = {
    id: idVal,
    fname: fnameVal,
    lname: lnameVal,
    nickname: document.getElementById('f-nickname').value.trim(),
    photo: document.getElementById('f-photo').value.trim(),
    level: document.getElementById('f-level').value,
    year: document.getElementById('f-year').value,
    room: document.getElementById('f-room').value.trim(),
    status: document.getElementById('f-status').value,
    phone: document.getElementById('f-phone').value.trim(),
    social: document.getElementById('f-social').value.trim(),
    parent: document.getElementById('f-parent').value.trim(),
    parentphone: document.getElementById('f-parentphone').value.trim(),
    parentphone2: document.getElementById('f-parentphone2').value.trim(),
    prevschool: document.getElementById('f-prevschool').value.trim(),
    shirt: document.getElementById('f-shirt').value,
    health: document.getElementById('f-health').value.trim(),
    transport: document.getElementById('f-transport').value,
    allowance: document.getElementById('f-allowance').value.trim(),
    smoke: document.getElementById('f-smoke').value.trim(),
    
    // 9 Additional Fields (v11)
    gender: document.getElementById('f-gender').value,
    address_no: document.getElementById('f-address-no').value.trim(),
    address_road: document.getElementById('f-address-road').value.trim(),
    address_subdistrict: document.getElementById('f-address-subdistrict').value.trim(),
    address_district: document.getElementById('f-address-district').value.trim(),
    address_zipcode: document.getElementById('f-address-zipcode').value.trim(),
    needs_scholarship: document.getElementById('f-needs-scholarship').value,
    parent_job: document.getElementById('f-parent-job').value.trim(),
    parent_income: document.getElementById('f-parent-income').value,
    
    // Risks
    risk_level: document.getElementById('f-risk-level').value,
    risk_academic: document.getElementById('f-risk-academic').value,
    risk_behavior: document.getElementById('f-risk-behavior').value,
    risk_family: document.getElementById('f-risk-family').value,
    risk_economic: document.getElementById('f-risk-economic').value,
    risk_note: document.getElementById('f-risk-note').value.trim(),
    
    // Internship
    internship_place: document.getElementById('f-internship-place') ? document.getElementById('f-internship-place').value.trim() : '',
    internship_phone: document.getElementById('f-internship-phone') ? document.getElementById('f-internship-phone').value.trim() : ''
  };

  const editIdVal = document.getElementById('f-edit-id').value;
  const isNew = !editIdVal;

  if (isNew) {
    // Check duplication
    const duplicate = DB.find(x => String(x.id) === String(idVal));
    if (duplicate) {
      showToast('❌ มีรหัสนักเรียนคนนี้อยู่ในระบบแล้ว!', 'err');
      return;
    }
    DB.push(s);
    showToast(`✅ บันทึกประวัติคุณ ${s.fname} เรียบร้อยแล้ว`, 'ok');
  } else {
    const targetId = editIdVal || editId;
    const idx = DB.findIndex(x => String(x.id) === String(targetId));
    if (idx !== -1) {
      DB[idx] = s;
      showToast(`✅ แก้ไขข้อมูลคุณ ${s.fname} เรียบร้อยแล้ว`, 'ok');
    } else {
      console.error("Could not find student with ID:", targetId);
    }
  }

  saveDatabase();
  if (CLOUD_API_URL) {
    saveToCloud(s);
  }
  closeModal('add-modal');
  
  // Rebuild and refresh ALL views to avoid caching or filter mismatch bugs
  buildRoomFilter();
  updateDashboard();
  renderStudents();
  quickSearch();
}

function deleteStudent(studentId) {
  const s = DB.find(x => String(x.id) === String(studentId));
  if (!s) return;

  if (confirm(`🗑️ คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลประวัติของ "คุณ ${s.fname} ${s.lname}" ออกจากระบบอย่างถาวร?`)) {
    DB = DB.filter(x => String(x.id) !== String(studentId));
    saveDatabase();
    showToast(`🗑️ ลบข้อมูลนักเรียนเรียบร้อยแล้ว`, 'ok');
    
    // สั่งลบข้อมูลบนคลาวด์ Google Sheets
    if (CLOUD_API_URL) {
      deleteFromCloud(studentId);
    }
    
    // Thorough refresh of all UI components
    buildRoomFilter();
    updateDashboard();
    renderStudents();
    quickSearch();
  }
}

// ── QUICK SEARCH FUNCTION ──
function quickSearch() {
  const query = (document.getElementById('qs-input').value || '').toLowerCase().trim();
  const resultsContainer = document.getElementById('qs-results');
  
  if (!query) {
    resultsContainer.innerHTML = '';
    return;
  }

  // Filter based on nickname too (BUG FIX)
  const matches = DB.filter(s => {
    const dn = getDisplayName(s);
    return [
      s.id, 
      dn.fn, 
      dn.ln, 
      s.nickname, // Direct nickname matching support
      s.phone, 
      s.room
    ].some(v => (v || '').toLowerCase().includes(query));
  });

  if (matches.length === 0) {
    resultsContainer.innerHTML = `
      <div class="empty">
        <i class="fa-solid fa-magnifying-glass-minus ei"></i>
        <p>ไม่พบนักเรียนรหัสหรือชื่อดังกล่าวในระบบ</p>
      </div>
    `;
    return;
  }

  let html = '';
  matches.slice(0, 15).forEach(s => {
    const dn = getDisplayName(s);
    
    // Highlight queried text
    let nameStr = `${dn.fn} ${dn.ln}`;
    let nicknameStr = s.nickname ? `(${s.nickname})` : '';

    nameStr = highlightText(nameStr, query);
    if (s.nickname) {
      nicknameStr = `(${highlightText(s.nickname, query)})`;
    }

    const riskColor = s.risk_level === 'สูง' ? 'red' : (s.risk_level === 'ปานกลาง' ? 'orange' : 'green');
    const riskSign = s.risk_level ? `<span style="font-size:18px; color:${riskColor};">●</span>` : '';

    html += `
      <div class="quick-search-item" onclick="viewProfile('${s.id}'); document.getElementById('qs-input').value=''; quickSearch();">
        <div style="display:flex; align-items:center; gap:12px;">
          ${getAvatarHTML(s, 48)}
          <div>
            <div style="font-weight:700; color:var(--c9); font-size:14.5px;">${nameStr} ${nicknameStr}</div>
            <div style="font-size:12px; color:var(--c5); margin-top:2px;">
              รหัส: <span style="font-family:monospace; font-weight:600;">${s.id}</span> · ${s.level || ''} ปี ${s.year || ''} (กลุ่ม ${s.room || '-'})
            </div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          ${getStatusBadgeHTML(s.status)}
          ${riskSign}
          <i class="fa-solid fa-chevron-right" style="color:var(--c3); font-size:12px;"></i>
        </div>
      </div>
    `;
  });
  resultsContainer.innerHTML = html;
}

// ── PROFILE VIEW MODAL ──
let currentViewingId = null;
function viewProfile(studentId) {
  const s = DB.find(x => String(x.id) === String(studentId));
  if (!s) return;
  
  currentViewingId = studentId;
  const dn = getDisplayName(s);
  const profileDiv = document.getElementById('profile-content');
  
  const driveImg = normalizeDriveUrl(s.photo);
  const hasImg = driveImg ? true : false;

  // ตรวจประเมินปัญหาทางการเงินและการขอทุนเพื่อคัดวิเคราะห์ความช่วยเหลือ (v14.3 Upgrade - กรองเฉพาะคนระบุค่ากินต่อวัน)
  const isFinancialRisk = checkFinancialRisk(s);

  let financialAlertHTML = '';
  if (isFinancialRisk) {
    const reasons = [];
    if (s.needs_scholarship === 'ต้องการ') reasons.push('✍️ <strong>ยื่นความประสงค์ต้องการทุนการศึกษา</strong> ในระดับแผนกวิชา');
    if (s.risk_economic && s.risk_economic !== 'ปกติ') reasons.push(`⚠️ <strong>ผลการประเมินจากครูประจำชั้น</strong>: ด้านเศรษฐกิจการเงินมีภาวะ "${s.risk_economic}"`);
    if (s.parent_income && s.parent_income.includes('ต่ำกว่า 10000')) reasons.push(`📉 <strong>รายได้เฉลี่ยครอบครัววิกฤต</strong>: ต่ำกว่า 10,000 บาทต่อเดือน (${s.parent_income})`);
    if (s.allowance && !isNaN(Number(s.allowance)) && Number(s.allowance) > 0 && Number(s.allowance) <= 100) reasons.push(`🪙 <strong>ค่าใช้จ่ายเดินทางมาเรียนจำกัด</strong>: ได้รับเงินมาเรียนเพียงวันละ ${s.allowance} บาท`);
    
    financialAlertHTML = `
      <div class="financial-hardship-alert animate-fade-in" style="margin: 15px 0; background: rgba(245, 158, 11, 0.08); border: 1.5px solid rgba(245, 158, 11, 0.35); border-radius: 12px; padding: 16px; color: #fbbf24; font-size: 13.5px; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.15);">
        <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 14.5px; margin-bottom: 8px; color: #f59e0b;">
          <i class="fa-solid fa-hand-holding-dollar" style="font-size: 20px;"></i>
          <span>💰 กล่องวิเคราะห์ความเดือดร้อนทางการเงินฉุกเฉิน (Financial Hardship Alert Box)</span>
        </div>
        <p style="color: var(--c8); line-height: 1.6; margin-bottom: 8px;">
          นักเรียนคนนี้ผ่านเกณฑ์ประเมินความเดือดร้อนทางบ้าน และสมควรได้รับการพิจารณารับทุนการศึกษาเร่งด่วน เนื่องจากประเด็นขัดสนดังต่อไปนี้:
        </p>
        <ul style="margin: 0 0 12px 20px; padding: 0; line-height: 1.6; color: var(--c9);">
          ${reasons.map(r => `<li style="margin-bottom: 5px;">${r}</li>`).join('')}
        </ul>
        <div style="background: rgba(0, 0, 0, 0.2); border-left: 3px solid #f59e0b; padding: 8px 12px; border-radius: 4px; font-size: 12px; color: var(--c7); line-height: 1.5;">
          <strong style="color: #fbbf24;"><i class="fa-solid fa-lightbulb"></i> ข้อเสนอแนะช่วยเหลือ:</strong> 
          แนะนำให้คุณครูประจำชั้นทำการคัดกรองส่งชื่อเข้ารับ <strong>ทุนการศึกษาประเภทขัดสนพิเศษ</strong> ของแผนกวิชาช่างกล/เทคนิคอุตสาหกรรม และดำเนินการบันทึกภาพถ่ายสภาพบ้านของนักเรียนเพื่อใช้ประกอบเป็นเอกสารขอทุนการศึกษารอบถัดไป
        </div>
      </div>
    `;
  }
  
  let headerPhotoHTML = '';
  if (hasImg) {
    headerPhotoHTML = `
      <div class="profile-photo-wrap" onclick="openLightbox('${driveImg}', 'คุณ${dn.fn} ${dn.ln}${s.nickname ? ' (' + s.nickname + ')' : ''}')">
        <img src="${driveImg}" alt="Student Image" class="profile-big-avatar"
          onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22><rect width=%22100%22 height=%22100%22 fill=%22%23334155%22/><text x=%2250%25%22 y=%2255%25%22 font-size=%2228%22 fill=%22white%22 font-family=%22Prompt%22 font-weight=%22bold%22 text-anchor=%22middle%22>${dn.fn[0]}</text></svg>';">
        <div class="photo-zoom-hint"><i class="fa-solid fa-magnifying-glass-plus"></i> กดดูรูปเต็ม</div>
      </div>`;
  } else {
    const palette = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    const bg = palette[(s.id || '').charCodeAt(0) % palette.length || 0];
    headerPhotoHTML = `
      <div class="profile-big-avatar" style="background:${bg}; display:flex; align-items:center; justify-content:center; color:white; font-size:36px; font-weight:800; font-family:var(--fh); cursor:default;">
        ${(dn.fn[0] || '?').toUpperCase()}
      </div>
    `;
  }

  profileDiv.innerHTML = `
    <!-- Card Header -->
    <div class="profile-card-hdr">
      ${headerPhotoHTML}
      <div class="profile-hdr-meta">
        <h2>คุณ${dn.fn} ${dn.ln} ${s.nickname ? `<span style="color:var(--p);">(${s.nickname})</span>` : ''}</h2>
        <p style="font-size: 13px; color: var(--c5); margin-top: 4px;">
          รหัสประจำตัวนักเรียน: <span style="font-family:monospace; font-weight:700;">${s.id}</span> · กลุ่มการเรียน: <span class="badge b-purple">${s.room || 'ไม่ระบุ'}</span>
        </p>
        <div style="margin-top: 10px; display:flex; gap:6px; flex-wrap:wrap;">
          ${getStatusBadgeHTML(s.status)}
          ${getRiskBadgesHTML(s)}
        </div>
      </div>
    </div>

    ${financialAlertHTML}

    <!-- Dual Column Sections -->
    <div class="profile-grid-sections">
      
      <!-- Section 1: Academic -->
      <div class="profile-sect animate-fade-in">
        <div class="profile-sect-title"><i class="fa-solid fa-graduation-cap"></i> ประวัติการเรียนและทั่วไป</div>
        <div class="info-row"><div class="ir-lbl">ระดับการศึกษา</div><div class="ir-val">${s.level || '-'}</div></div>
        <div class="info-row"><div class="ir-lbl">ชั้นปีการศึกษา</div><div class="ir-val">ปีที่ ${s.year || '-'}</div></div>
        <div class="info-row"><div class="ir-lbl">กลุ่มการเรียน</div><div class="ir-val">${s.room || '-'}</div></div>
        <div class="info-row"><div class="ir-lbl">สถานภาพปัจจุบัน</div><div class="ir-val">${s.status || '-'}</div></div>
        <div class="info-row"><div class="ir-lbl">เพศ</div><div class="ir-val">${s.gender || '-'}</div></div>
        <div class="info-row"><div class="ir-lbl">ไซส์เสื้อกิจกรรม</div><div class="ir-val"><span class="badge b-blue" style="font-size:12px;">${s.shirt || '-'}</span></div></div>
        <div class="info-row"><div class="ir-lbl">สถานศึกษาเดิม</div><div class="ir-val">${s.prevschool || '-'}</div></div>
        <div class="info-row"><div class="ir-lbl">การเดินทางมาเรียน</div><div class="ir-val">${s.transport || '-'}</div></div>
      </div>
      
      <!-- Section 1.5: Internship (ปวส. เทคนิคอุตสาหกรรม เท่านั้น) -->
      ${s.level === 'ปวส.' ? `
      <div class="profile-sect animate-fade-in" style="grid-column: 1 / -1; border-color: rgba(139, 92, 246, 0.25);">
        <div class="profile-sect-title" style="color: var(--pu); border-bottom-color: var(--pu);"><i class="fa-solid fa-industry"></i> ข้อมูลการฝึกประสบการณ์วิชาชีพ / สหกิจศึกษา (เฉพาะ ปวส.)</div>
        <div class="info-row"><div class="ir-lbl">สถานที่ฝึกงาน</div><div class="ir-val" style="font-weight:700; color:var(--pu);">${s.internship_place || '<span style="color:var(--c4);">ยังไม่ได้เข้าฝึกงาน</span>'}</div></div>
        <div class="info-row">
          <div class="ir-lbl">เบอร์ติดต่อสถานที่ฝึกงาน</div>
          <div class="ir-val">
            ${s.internship_phone ? `<a href="tel:${s.internship_phone}" style="color:var(--p); font-weight:600; text-decoration:none;"><i class="fa-solid fa-phone"></i> ${s.internship_phone}</a>` : '-'}
          </div>
        </div>
      </div>
      ` : ''}

      <!-- Section 2: Contact -->
      <div class="profile-sect animate-fade-in">
        <div class="profile-sect-title"><i class="fa-solid fa-address-book"></i> การติดต่อ & ผู้ปกครอง</div>
        <div class="info-row">
          <div class="ir-lbl">เบอร์โทรนักเรียน</div>
          <div class="ir-val">
            ${s.phone ? `<a href="tel:${s.phone}" style="color:var(--p); font-weight:700; text-decoration:none;"><i class="fa-solid fa-phone"></i> ${s.phone}</a>` : '-'}
          </div>
        </div>
        <div class="info-row"><div class="ir-lbl">ช่องทางโซเชียล</div><div class="ir-val">${s.social || '-'}</div></div>
        <div class="info-row"><div class="ir-lbl">ชื่อผู้ปกครอง</div><div class="ir-val">${s.parent || '-'}</div></div>
        <div class="info-row">
          <div class="ir-lbl">เบอร์โทรผู้ปกครอง</div>
          <div class="ir-val">
            ${s.parentphone ? `<a href="tel:${s.parentphone}" style="color:var(--p); font-weight:600; text-decoration:none;"><i class="fa-solid fa-phone"></i> ${s.parentphone}</a>` : '-'}
          </div>
        </div>
        <div class="info-row">
          <div class="ir-lbl">เบอร์ฉุกเฉินสำรอง</div>
          <div class="ir-val">
            ${s.parentphone2 ? `<a href="tel:${s.parentphone2}" style="color:var(--r); font-weight:600; text-decoration:none;"><i class="fa-solid fa-triangle-exclamation"></i> ${s.parentphone2}</a>` : '-'}
          </div>
        </div>
        <div class="info-row"><div class="ir-lbl">เงินได้รับต่อวัน</div><div class="ir-val">${s.allowance ? `${s.allowance} บาท` : '-'}</div></div>
        <div class="info-row"><div class="ir-lbl">อาชีพผู้ปกครอง</div><div class="ir-val">${s.parent_job || '-'}</div></div>
        <div class="info-row"><div class="ir-lbl">รายได้ครอบครัว</div><div class="ir-val">${s.parent_income || '-'}</div></div>
        <div class="info-row"><div class="ir-lbl">ความต้องการทุน</div><div class="ir-val">${s.needs_scholarship || '-'}</div></div>
      </div>

      <!-- Section 2.5: Address -->
      <div class="profile-sect animate-fade-in" style="grid-column: 1 / -1; border-color: rgba(16, 185, 129, 0.25);">
        <div class="profile-sect-title" style="color: var(--g); border-bottom-color: var(--g);"><i class="fa-solid fa-house-user"></i> ที่อยู่ตามทะเบียนบ้านของนักเรียน</div>
        <div class="info-row">
          <div class="ir-lbl">ที่อยู่ปัจจุบัน</div>
          <div class="ir-val" style="font-weight:600;">
            ${[
              s.address_no ? `บ้านเลขที่ ${s.address_no}` : '',
              s.address_road ? `ถนน ${s.address_road}` : '',
              s.address_subdistrict ? `ตำบล ${s.address_subdistrict}` : '',
              s.address_district ? `อำเภอ ${s.address_district}` : '',
              s.address_zipcode ? `รหัสไปรษณีย์ ${s.address_zipcode}` : ''
            ].filter(Boolean).join(' ') || '<span style="color:var(--c4);">ไม่ระบุข้อมูลที่อยู่</span>'}
          </div>
        </div>
      </div>

      <!-- Section 3: Health & Behavior -->
      <div class="profile-sect animate-fade-in" style="grid-column: 1 / -1;">
        <div class="profile-sect-title" style="color: var(--g); border-bottom-color: var(--g);"><i class="fa-solid fa-heart-pulse"></i> ข้อมูลสุขภาพ พฤติกรรม และสภาพจิตใจ</div>
        <div class="info-row"><div class="ir-lbl">โรคประจำตัว/แพ้ยา</div><div class="ir-val">${s.health || '<span style="color:var(--c4);">ปกติ (ไม่มี)</span>'}</div></div>
        <div class="info-row"><div class="ir-lbl">ความเสี่ยงเหล้า/บุหรี่</div><div class="ir-val">${s.smoke || '<span style="color:var(--c4);">ปกติ (ไม่ระบุพฤติกรรมสุ่มเสี่ยง)</span>'}</div></div>
      </div>

      <!-- Section 4: SDQ Risk Screen -->
      <div class="profile-sect animate-fade-in" style="grid-column: 1 / -1; border-color: rgba(239, 68, 68, 0.25);">
        <div class="profile-sect-title" style="color: var(--r); border-bottom-color: var(--r);"><i class="fa-solid fa-shield-halved"></i> ผลการประเมินการคัดกรองความเสี่ยงรายบุคคล</div>
        <div class="info-row"><div class="ir-lbl">ระดับผลประเมินรวม</div><div class="ir-val" style="font-weight:700;">${s.risk_level ? `${s.risk_level === 'สูง' ? '🔴 เสี่ยงสูงมาก' : (s.risk_level === 'ปานกลาง' ? '🟡 เสี่ยงปานกลาง' : '🟢 เสี่ยงต่ำ/ปกติ')}` : 'ยังไม่ได้รับการประเมิน'}</div></div>
        <div class="info-row"><div class="ir-lbl">ปัจจัยด้านการเรียน</div><div class="ir-val">${s.risk_academic || 'ปกติ'}</div></div>
        <div class="info-row"><div class="ir-lbl">ปัจจัยด้านพฤติกรรม</div><div class="ir-val">${s.risk_behavior || 'ปกติ'}</div></div>
        <div class="info-row"><div class="ir-lbl">ปัจจัยสภาพครอบครัว</div><div class="ir-val">${s.risk_family || 'ปกติ'}</div></div>
        <div class="info-row"><div class="ir-lbl">ปัจจัยภาวะการเงิน</div><div class="ir-val">${s.risk_economic || 'ปกติ'}</div></div>
        <div class="info-row"><div class="ir-lbl">แผนความช่วยเหลือครู</div><div class="ir-val" style="color: var(--y); font-weight:600;">${s.risk_note || 'ยังไม่มีบันทึกแผนเผชิญเหตุเพื่อช่วยเหลือนักเรียน'}</div></div>
      </div>

    </div>
  `;
  openModal('profile-modal');
}

// ── PHOTO LIGHTBOX FUNCTIONS (v10.0) ──

// เปิด Lightbox ดูรูปภาพเต็มจอ
function openLightbox(imgUrl, caption) {
  const lightbox = document.getElementById('photo-lightbox');
  const img = document.getElementById('lightbox-img');
  const cap = document.getElementById('lightbox-caption');
  if (!lightbox || !img) return;

  img.src = imgUrl;
  if (cap) cap.textContent = caption || '';

  lightbox.classList.add('active');
  document.body.style.overflow = 'hidden';

  // ปิดด้วยปุ่ม ESC บน PC
  document.addEventListener('keydown', _lightboxEscHandler);
}

// ปิด Lightbox
function closeLightbox() {
  const lightbox = document.getElementById('photo-lightbox');
  const img = document.getElementById('lightbox-img');
  if (!lightbox) return;

  lightbox.classList.remove('active');
  document.body.style.overflow = '';
  document.removeEventListener('keydown', _lightboxEscHandler);

  // ล้าง src หลังปิดเพื่อไม่โหลดค้าง
  setTimeout(() => { if (img) img.src = ''; }, 300);
}

// ESC handler
function _lightboxEscHandler(e) {
  if (e.key === 'Escape') closeLightbox();
}



// Print profile window
function printProfile() {
  if (!currentViewingId) return;
  const s = DB.find(x => String(x.id) === String(currentViewingId));
  if (!s) return;

  const w = window.open('', '_blank');
  const dn = getDisplayName(s);
  const driveImg = normalizeDriveUrl(s.photo);
  const avatarPart = driveImg ? `<img src="${driveImg}" style="width:100px; height:100px; object-fit:cover; border-radius:10px; border:2px solid #ccc;">` : `<div style="width:100px; height:100px; background:#ddd; display:flex; align-items:center; justify-content:center; font-size:32px; font-weight:bold;">${dn.fn[0]}</div>`;

  w.document.write(`
    <html>
      <head>
        <title>ระเบียนนักเรียนรายบุคคล - ${dn.fn} ${dn.ln}</title>
        <style>
          body { font-family: 'Sarabun', sans-serif; padding: 40px; color: #333; line-height:1.5; }
          h2 { font-family: 'Prompt', sans-serif; border-bottom:2px solid #000; padding-bottom:10px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top:20px; }
          .sect { border: 1px solid #ccc; border-radius:8px; padding:15px; page-break-inside: avoid; }
          .sect-title { font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom:5px; margin-bottom:10px; color: #4f46e5; }
          .row { display: flex; font-size:13px; margin: 6px 0; }
          .lbl { width:150px; font-weight:bold; }
          .val { flex:1; }
        </style>
      </head>
      <body>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
          <div>
            <h2>ระเบียนนักเรียนรายบุคคล (ระบบประเมินความเสี่ยง)</h2>
            <p><strong>ชื่อ-สกุล:</strong> คุณ${dn.fn} ${dn.ln} ${s.nickname ? `(${s.nickname})` : ''}</p>
            <p><strong>รหัสประจำตัว:</strong> ${s.id} · <strong>ห้องเรียน:</strong> ${s.room || '-'}</p>
          </div>
          ${avatarPart}
        </div>
        <div class="grid">
          <div class="sect">
            <div class="sect-title">ข้อมูลประวัติการศึกษา</div>
            <div class="row"><div class="lbl">ระดับชั้น</div><div class="val">${s.level || '-'}</div></div>
            <div class="row"><div class="lbl">ชั้นปี</div><div class="val">ปีที่ ${s.year || '-'}</div></div>
            <div class="row"><div class="lbl">สถานภาพ</div><div class="val">${s.status || '-'}</div></div>
            <div class="row"><div class="lbl">สถานศึกษาเดิม</div><div class="val">${s.prevschool || '-'}</div></div>
          </div>
          <div class="sect">
            <div class="sect-title">ข้อมูลช่องทางติดต่อ</div>
            <div class="row"><div class="lbl">เบอร์โทร</div><div class="val">${s.phone || '-'}</div></div>
            <div class="row"><div class="lbl">โซเชียลมีเดีย</div><div class="val">${s.social || '-'}</div></div>
            <div class="row"><div class="lbl">ผู้ปกครอง</div><div class="val">${s.parent || '-'}</div></div>
            <div class="row"><div class="lbl">เบอร์ผู้ปกครอง</div><div class="val">${s.parentphone || '-'}</div></div>
          </div>
          <div class="sect" style="grid-column:1 / -1;">
            <div class="sect-title">ผลการประเมินการคัดกรองความเสี่ยง</div>
            <div class="row"><div class="lbl">ระดับประเมินภาพรวม</div><div class="val"><strong>${s.risk_level || 'ปกติ'}</strong></div></div>
            <div class="row"><div class="lbl">ความเสี่ยงการเรียน</div><div class="val">${s.risk_academic || 'ปกติ'}</div></div>
            <div class="row"><div class="lbl">ความเสี่ยงพฤติกรรม</div><div class="val">${s.risk_behavior || 'ปกติ'}</div></div>
            <div class="row"><div class="lbl">สภาพครอบครัว</div><div class="val">${s.risk_family || 'ปกติ'}</div></div>
            <div class="row"><div class="lbl">ระดับฐานะการเงิน</div><div class="val">${s.risk_economic || 'ปกติ'}</div></div>
            <div class="row"><div class="lbl">แผนเผชิญเหตุและประเมินครู</div><div class="val">${s.risk_note || '-'}</div></div>
          </div>
        </div>
      </body>
    </html>
  `);
  w.document.close();
  w.print();
}

// ── RISK LIST MODALS (Dashboard Clicks) ──
function openRiskModal(level) {
  const list = DB.filter(s => s.status === 'กำลังศึกษา' && s.risk_level === level);
  const title = document.getElementById('risk-modal-title');
  const content = document.getElementById('risk-modal-content');
  
  title.innerHTML = `<span style="color:${level === 'สูง' ? 'var(--r)' : 'var(--y)'};"><i class="fa-solid fa-circle-exclamation"></i> รายชื่อเด็กความเสี่ยงระดับ "${level}"</span>`;

  if (list.length === 0) {
    content.innerHTML = `<div class="empty"><i class="fa-solid fa-face-smile ei"></i><p>ไม่มีรายชื่อนักเรียนกำลังศึกษาที่มีความเสี่ยงระดับนี้</p></div>`;
    openModal('risk-modal');
    return;
  }

  let tableRows = '';
  list.forEach(s => {
    const dn = getDisplayName(s);
    tableRows += `
      <tr class="student-table-row">
        <td>${getAvatarHTML(s, 44)}</td>
        <td>
          <div style="font-weight:600; color:var(--c9);">
            ${dn.fn} ${dn.ln} ${s.nickname ? `<span style="color:var(--p)">(${s.nickname})</span>` : ''}
          </div>
          <div style="font-size:11px; color:var(--c4)">รหัส: ${s.id}</div>
        </td>
        <td>${s.level || ''} ปี ${s.year || ''} / กลุ่ม ${s.room || '-'}</td>
        <td>
          <div style="display:flex; flex-direction:column; gap:2px; font-size:11.5px;">
            ${s.risk_academic && s.risk_academic !== 'ปกติ' ? `<span>📚 ${s.risk_academic}</span>` : ''}
            ${s.risk_behavior && s.risk_behavior !== 'ปกติ' ? `<span>⚠️ ${s.risk_behavior}</span>` : ''}
            ${s.risk_family && s.risk_family !== 'ปกติ' ? `<span>🏠 ${s.risk_family}</span>` : ''}
            ${s.risk_economic && s.risk_economic !== 'ปกติ' && s.risk_economic !== 'ดี' && s.risk_economic !== 'ปานกลาง' ? `<span>💰 ${s.risk_economic}</span>` : ''}
          </div>
        </td>
        <td>
          <button class="btn btn-s btn-sm" onclick="closeModal('risk-modal'); setTimeout(()=>viewProfile('${s.id}'),150)">
            <i class="fa-solid fa-address-card"></i> ดูอย่างละเอียด
          </button>
        </td>
      </tr>
    `;
  });

  content.innerHTML = `
    <table class="premium-table">
      <thead>
        <tr>
          <th style="width:50px;">รูป</th>
          <th>นักเรียน</th>
          <th>กลุ่ม/ชั้นปี</th>
          <th>ปัจจัยย่อยเสี่ยง</th>
          <th>รายละเอียด</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  `;

  openModal('risk-modal');
}

// Risk Detail Aspect Click
function openRiskDetailModal(categoryField, categoryLabel, categoryValue) {
  const list = DB.filter(s => s.status === 'กำลังศึกษา' && s[categoryField] === categoryValue);
  const title = document.getElementById('risk-modal-title');
  const content = document.getElementById('risk-modal-content');
  
  title.innerHTML = `<span><i class="fa-solid fa-circle-nodes font-accent"></i> ปัจจัย: ${categoryLabel} (${categoryValue})</span>`;

  if (list.length === 0) {
    content.innerHTML = `<div class="empty"><p>ไม่พบรายชื่อในระบบ</p></div>`;
    openModal('risk-modal');
    return;
  }

  let tableRows = '';
  list.forEach(s => {
    const dn = getDisplayName(s);
    tableRows += `
      <tr class="student-table-row">
        <td>${getAvatarHTML(s, 44)}</td>
        <td>
          <div style="font-weight:600; color:var(--c9);">
            ${dn.fn} ${dn.ln} ${s.nickname ? `<span style="color:var(--p)">(${s.nickname})</span>` : ''}
          </div>
          <div style="font-size:11px; color:var(--c4)">รหัส: ${s.id}</div>
        </td>
        <td>${s.level || ''} ปี ${s.year || ''} / กลุ่ม ${s.room || '-'}</td>
        <td>${getRiskBadgesHTML(s)}</td>
        <td>
          <button class="btn btn-s btn-sm" onclick="closeModal('risk-modal'); setTimeout(()=>viewProfile('${s.id}'),150)">
            <i class="fa-solid fa-address-card"></i> ประวัติ
          </button>
        </td>
      </tr>
    `;
  });

  content.innerHTML = `
    <table class="premium-table">
      <thead>
        <tr>
          <th style="width:50px;">รูป</th>
          <th>นักเรียน</th>
          <th>กลุ่ม/ชั้นปี</th>
          <th>ผลคัดกรองทั้งหมด</th>
          <th>ประวัติ</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  `;

  openModal('risk-modal');
}

// ── EXCEL / CSV EXPORT ──
function exportCSV() {
  if (DB.length === 0) {
    showToast('⚠️ ไม่มีข้อมูลในระบบสำหรับใช้ส่งออก', 'err');
    return;
  }

  // Create columns headers
  const csvHeaders = FIELDS.map(f => f.l);
  
  const csvRows = [csvHeaders.join(',')];

  DB.forEach(s => {
    const rowValues = FIELDS.map(f => {
      let val = s[f.k] || '';
      // Escape commas and double quotes for CSV
      val = val.toString().replace(/"/g, '""');
      if (val.includes(',') || val.includes('\n') || val.includes('"')) {
        val = `"${val}"`;
      }
      return val;
    });
    csvRows.push(rowValues.join(','));
  });

  // Include UTF-8 BOM to prevent Excel breaking Thai letters
  const csvString = '\uFEFF' + csvRows.join('\r\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `ฐานข้อมูลนักเรียน_ส่งออก_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast('📥 ส่งออกไฟล์ตาราง CSV เรียบร้อยแล้ว', 'ok');
}

// ── SYSTEM CONFIGURATION BACKUP (JSON) ──
function backupData() {
  if (DB.length === 0) {
    showToast('⚠️ ไม่มีข้อมูลสำหรับการทำสำรอง', 'err');
    return;
  }
  
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(DB, null, 2));
  const link = document.createElement('a');
  link.setAttribute("href", dataStr);
  link.setAttribute("download", `สำรองฐานข้อมูล_นักเรียน_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('💾 ดาวน์โหลดไฟล์สำรอง .json เรียบร้อยแล้ว', 'ok');
}

function restoreData(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const parsed = JSON.parse(evt.target.result);
      if (Array.isArray(parsed)) {
        // Simple verification that it contains student id or fname
        if (parsed.length > 0 && !parsed[0].id) {
          throw new Error('โครงสร้างไฟล์ไม่ถูกต้อง');
        }
        
        if (confirm(`⚠️ ยืนยันการนำเข้าข้อมูลกู้คืน? การทำเช่นนี้จะ "ลบข้อมูลทั้งหมดที่แสดงผลอยู่ปัจจุบัน" และนำเข้าข้อมูลจำนวน ${parsed.length} รายการจากไฟล์เข้ามาแทนที่`)) {
          DB = parsed;
          saveDatabase();
          showToast('📂 กู้คืนฐานข้อมูลสมบูรณ์แบบเรียบร้อย!', 'ok');
          
          buildRoomFilter();
          updateDashboard();
          renderStudents();
          quickSearch();
        }
      } else {
        showToast('❌ รูปแบบไฟล์ JSON ไม่ถูกต้องสำหรับฐานข้อมูลนี้', 'err');
      }
    } catch(err) {
      showToast('❌ เกิดข้อผิดพลาดในการโหลดไฟล์กู้คืน', 'err');
    }
  };
  reader.readAsText(file);
}

function clearAll() {
  const choice = confirm('🚨 ยืนยันจัดการฐานข้อมูล!:\n\n- กด OK เพื่อรีเซ็ตเป็น "ข้อมูลตัวอย่างเริ่มต้นระดับ ปวช. 1 และ ปวส. 1" เพื่อทดสอบระบบ\n- กด Cancel หากต้องการลบข้อมูลทั้งหมดในเครื่องออกอย่างถาวร (ฐานข้อมูลว่างเปล่า)');
  if (choice) {
    DB = getMockData();
    saveDatabase();
    showToast('🔄 กู้คืนข้อมูลตัวอย่างระดับ ปวช.1 และ ปวส.1 แล้ว', 'ok');
    
    buildRoomFilter();
    updateDashboard();
    renderStudents();
    quickSearch();
  } else {
    if (confirm('⚠️ ยืนยันอีกครั้ง!: คุณต้องการลบฐานข้อมูลทั้งหมดเป็นค่าว่างเปล่าอย่างเด็ดขาดหรือไม่?')) {
      DB = [];
      saveDatabase();
      showToast('🗑️ ล้างฐานข้อมูลในเบราว์เซอร์เครื่องนี้เรียบร้อยแล้ว', 'ok');
      
      buildRoomFilter();
      updateDashboard();
      renderStudents();
      quickSearch();
    }
  }
}

// ฟังก์ชันวิเคราะห์จับคู่นักเรียนเพื่อผูกรูปภาพอย่างยืดหยุ่นและชาญฉลาด (v12.6)
function findStudentForPhotoSync(rawId, rawName) {
  rawId = String(rawId || '').trim();
  rawName = String(rawName || '').trim();
  
  if (!rawId && !rawName) return null;
  
  let matchedStudent = null;
  
  // 1. จับคู่ด้วยรหัสประจำตัวแบบยาว (11 หลัก)
  if (rawId && rawId.length >= 11) {
    matchedStudent = DB.find(s => String(s.id).trim() === rawId);
  }
  
  // 2. จับคู่ด้วยรหัสประจำตัวแบบย่อ (3 หลักท้าย)
  if (!matchedStudent && rawId && rawId.length <= 4) {
    matchedStudent = DB.find(s => {
      const sId = String(s.id).trim();
      return sId.endsWith(rawId);
    });
  }
  
  // ฟังก์ชันคลีนชื่อตัวสะกดและคำนำหน้าเพื่อลดโอกาสจับคู่ผิดพลาด
  const cleanName = (name) => {
    return name.replace(/^(นาย|นางสาว|น\.ส\.?|นาง|เด็กชาย|ด\.ช\.?|ด\.ญ\.?|เด็กหญิง)\s*/, '')
               .replace(/\s+/g, '')
               .trim();
  };
  
  const cleanCsvName = cleanName(rawName);
  
  // 3. จับคู่ด้วยชื่อและนามสกุลตรงกัน (Fuzzy Match / คลีนอักขระ)
  if (!matchedStudent && cleanCsvName) {
    matchedStudent = DB.find(s => {
      const mockName = cleanName(`${s.fname || ''}${s.lname || ''}`);
      return mockName === cleanCsvName || mockName.includes(cleanCsvName) || cleanCsvName.includes(mockName);
    });
  }
  
  // 4. จับคู่ด้วยชื่อจริงอย่างเดียว (หากไม่มีชื่อซ้ำในระบบ)
  if (!matchedStudent && cleanCsvName) {
    const csvFn = cleanName(rawName.split(/\s+/)[0]);
    if (csvFn && csvFn.length >= 2) {
      const potentials = DB.filter(s => cleanName(s.fname || '') === csvFn);
      if (potentials.length === 1) {
        matchedStudent = potentials[0];
      }
    }
  }
  
  return matchedStudent;
}

// ดึงรูปภาพนักเรียนและซิงค์เชื่อมโยงเข้ากับฐานข้อมูลตามชื่อและรหัสประจำตัว
function syncPhotosFromSheets() {
  const url = document.getElementById('photo-sheets-url').value.trim();
  if (!url) {
    showToast('⚠️ กรุณาระบุลิงก์ Google Sheets ของรูปภาพนักเรียน', 'err');
    return;
  }

  // Convert to CSV download URL if needed
  let csvUrl = url;
  if (url.includes('docs.google.com/spreadsheets') && !url.includes('export?format=csv')) {
    const m = url.match(/\/d\/([\w-]+)/);
    if (m) {
      csvUrl = `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv`;
    }
  }

  showToast('📥 กำลังดึงตารางรูปภาพนักเรียน...', 'ok');

  Papa.parse(csvUrl, {
    download: true,
    complete: function(results) {
      if (results.data && results.data.length > 0) {
        const rows = results.data;
        const headers = rows[0]; // Get raw headers
        
        let idColIdx = -1;
        let nameColIdx = -1;
        let photoColIdx = -1;

        // 1. Find columns by typical header terms
        headers.forEach((h, idx) => {
          const hn = String(h).trim();
          if (hn.includes('รหัสประจำตัวนักเรียน') || hn.includes('รหัสนักเรียน') || hn.includes('รหัส')) {
            idColIdx = idx;
          }
          if (hn.includes('ชื่อนาม-นามสกุล') || hn.includes('ชื่อ-นามสกุล') || hn.includes('ชื่อจริง') || hn.includes('ชื่อ')) {
            nameColIdx = idx;
          }
        });

        // 2. Intelligent scan of actual rows to find the Drive link column (useful for duplicate names like 'กลุ่มเรียน')
        for (let r = 1; r < Math.min(10, rows.length); r++) {
          const row = rows[r];
          if (!row) continue;
          row.forEach((cell, idx) => {
            const val = String(cell).trim();
            if (val.includes('drive.google.com') || val.includes('lh3.googleusercontent.com')) {
              photoColIdx = idx;
            }
          });
          if (photoColIdx !== -1) break;
        }

        // 3. Fallbacks if automatic scans failed
        if (idColIdx === -1) idColIdx = 2; // default: 3rd column
        if (nameColIdx === -1) nameColIdx = 1; // default: 2nd column
        if (photoColIdx === -1) photoColIdx = 5; // default: 6th column (has image links)

        let matchCount = 0;
        let skipCount = 0;

        // Loop rows (row 0 is header)
        for (let r = 1; r < rows.length; r++) {
          const row = rows[r];
          if (!row || row.length <= 1) continue;

          const rawId = String(row[idColIdx] || '').trim();
          const rawName = String(row[nameColIdx] || '').trim();
          const rawPhoto = String(row[photoColIdx] || '').trim();

          if (!rawPhoto) continue;

          let matchedStudent = findStudentForPhotoSync(rawId, rawName);

          if (matchedStudent) {
            // Normalize Drive Link to load directly
            matchedStudent.photo = normalizeDriveUrl(rawPhoto);
            matchCount++;
          } else {
            skipCount++;
          }
        }

        if (matchCount > 0) {
          saveDatabase();
          showToast(`📸 ซิงค์รูปภาพนักเรียนสำเร็จ ${matchCount} คน! (ข้าม ${skipCount} คน)`, 'ok');
          updateDashboard();
          renderStudents();
        } else {
          showToast('⚠️ ไม่พบชื่อหรือรหัสนักเรียนที่ตรงกับชีตรูปภาพนี้เลย', 'err');
        }
      } else {
        showToast('❌ ข้อมูลในไฟล์รูปภาพว่างเปล่า', 'err');
      }
    },
    error: function() {
      showToast('❌ ดึงรูปภาพล้มเหลว ลิงก์อาจจะไม่เป็นสาธารณะ', 'err');
    }
  });
}

// ซิงค์รูปภาพจับคู่เข้าตัวนักเรียนจากไฟล์ CSV ท้องถิ่น (Local CSV File Upload) เพื่อความคงทนต่อ CORS
function syncPhotosFromLocalCsv() {
  const file = document.getElementById('photo-csv-file').files[0];
  if (!file) return;

  showToast('📥 กำลังโหลดและประมวลผลไฟล์ CSV รูปภาพ...', 'ok');

  Papa.parse(file, {
    complete: function(results) {
      if (results.data && results.data.length > 0) {
        const rows = results.data;
        const headers = rows[0]; // Get raw headers
        
        let idColIdx = -1;
        let nameColIdx = -1;
        let photoColIdx = -1;

        // 1. Find columns by typical header terms
        headers.forEach((h, idx) => {
          const hn = String(h).trim();
          if (hn.includes('รหัสประจำตัวนักเรียน') || hn.includes('รหัสนักเรียน') || hn.includes('รหัส')) {
            idColIdx = idx;
          }
          if (hn.includes('ชื่อนาม-นามสกุล') || hn.includes('ชื่อ-นามสกุล') || hn.includes('ชื่อจริง') || hn.includes('ชื่อ')) {
            nameColIdx = idx;
          }
        });

        // 2. Intelligent scan of actual rows to find the Drive link column (useful for duplicate names like 'กลุ่มเรียน')
        for (let r = 1; r < Math.min(10, rows.length); r++) {
          const row = rows[r];
          if (!row) continue;
          row.forEach((cell, idx) => {
            const val = String(cell).trim();
            if (val.includes('drive.google.com') || val.includes('lh3.googleusercontent.com')) {
              photoColIdx = idx;
            }
          });
          if (photoColIdx !== -1) break;
        }

        // 3. Fallbacks if automatic scans failed
        if (idColIdx === -1) idColIdx = 2; // default: 3rd column
        if (nameColIdx === -1) nameColIdx = 1; // default: 2nd column
        if (photoColIdx === -1) photoColIdx = 5; // default: 6th column (has image links)

        let matchCount = 0;
        let skipCount = 0;

        // Loop rows (row 0 is header)
        for (let r = 1; r < rows.length; r++) {
          const row = rows[r];
          if (!row || row.length <= 1) continue;

          const rawId = String(row[idColIdx] || '').trim();
          const rawName = String(row[nameColIdx] || '').trim();
          const rawPhoto = String(row[photoColIdx] || '').trim();

          if (!rawPhoto) continue;

          let matchedStudent = findStudentForPhotoSync(rawId, rawName);

          if (matchedStudent) {
            // Normalize Drive Link to load directly
            matchedStudent.photo = normalizeDriveUrl(rawPhoto);
            matchCount++;
          } else {
            skipCount++;
          }
        }

        if (matchCount > 0) {
          saveDatabase();
          showToast(`📸 ซิงค์รูปภาพนักเรียนสำเร็จ ${matchCount} คน! (ข้าม ${skipCount} คน)`, 'ok');
          updateDashboard();
          renderStudents();
          // Reset file input
          document.getElementById('photo-csv-file').value = '';
        } else {
          showToast('⚠️ ไม่พบชื่อหรือรหัสนักเรียนที่ตรงกับชีตรูปภาพนี้เลย', 'err');
        }
      } else {
        showToast('❌ ข้อมูลในไฟล์รูปภาพว่างเปล่า', 'err');
      }
    },
    error: function() {
      showToast('❌ อ่านไฟล์ CSV รูปภาพล้มเหลว', 'err');
    }
  });
}

// ── PAPAPARSE CSV IMPORT & GOOGLE SHEETS SYNC ──
function importSheets() {
  const url = document.getElementById('sheets-url').value.trim();
  if (!url) {
    showToast('⚠️ กรุณาระบุลิงก์ CSV สาธารณะของ Google Sheets', 'err');
    return;
  }

  // Support direct sheet views parsing and auto conversion into raw csv output
  let csvUrl = url;
  if (url.includes('docs.google.com/spreadsheets') && !url.includes('export?format=csv')) {
    const m = url.match(/\/d\/([\w-]+)/);
    if (m) {
      csvUrl = `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv`;
    }
  }

  showToast('📥 กำลังติดต่อและดึงข้อมูลจากอินเทอร์เน็ต...', 'ok');
  
  Papa.parse(csvUrl, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function(results) {
      if (results.data && results.data.length > 0) {
        importData = results.data;
        importHeaders = Object.keys(importData[0]);
        showMappingSetup();
        showToast(`📋 ดึงหัวตารางพบจำนวนคอลัมน์ ${importHeaders.length} คอลัมน์`, 'ok');
      } else {
        showToast('❌ ไม่สามารถอ่านตารางหรือแชร์แบบสาธารณะไม่ได้', 'err');
      }
    },
    error: function(err) {
      showToast('❌ ไม่สามารถเข้าถึงหรือลิงก์ไม่สาธารณะพอ', 'err');
    }
  });
}

function importCsvFile() {
  const file = document.getElementById('csv-file').files[0];
  if (!file) return;

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: function(results) {
      if (results.data && results.data.length > 0) {
        importData = results.data;
        importHeaders = Object.keys(importData[0]);
        showMappingSetup();
        showToast('📁 โหลดไฟล์ตารางประมวลผลเสร็จสิ้น', 'ok');
      } else {
        showToast('❌ โครงสร้างข้อมูลในไฟล์ CSV ว่างเปล่า', 'err');
      }
    },
    error: function() {
      showToast('❌ อ่านไฟล์ CSV ล้มเหลว', 'err');
    }
  });
}

// Show Setup Mapping GUI
function showMappingSetup() {
  const previewDiv = document.getElementById('import-preview');
  const area = document.getElementById('mapping-area');
  
  if (!previewDiv || !area) return;

  // Auto matching dictionary for Thai sheets
  const THAI_MAP = {
    id: ['รหัสประจำตัวนักเรียนนักศึกษา', 'รหัสประจำตัว', 'รหัสนักเรียน', 'รหัส'],
    fname: ['ชื่อ-นามสกุล', 'ชื่อจริง', 'ชื่อ', 'ชื่อผู้เรียน'],
    lname: ['ชื่อ-นามสกุล', 'นามสกุล', 'สกุล'],
    nickname: ['ชื่อเล่น'],
    level: ['ระดับชั้น', 'ระดับการศึกษา', 'ระดับ'],
    year: ['ชั้นปี', 'ชั้นปีที่', 'ปี'],
    room: ['กลุ่มเรียน', 'กลุ่มเรียน / ห้อง', 'ห้อง', 'กลุ่ม'],
    phone: ['เบอร์โทรศัพท์มือถือ ของนักเรียน', 'เบอร์โทรนักเรียน', 'เบอร์โทรศัพท์นักเรียน', 'เบอร์โทร', 'โทรศัพท์'],
    social: ['ข้อมูลการติดต่ออื่นๆ IG หรือ Facebook', 'ช่องทางโซเชียล', 'social', 'ig', 'facebook', 'line'],
    parent: ['ชื่อ-นามสกุล ผู้ปกครอง', 'ชื่อผู้ปกครอง', 'ผู้ปกครอง'],
    parentphone: ['เบอร์โทรศัพท์มือถือ ของผู้ปกครอง', 'เบอร์โทรผู้ปกครอง', 'เบอร์โทรศัพท์ผู้ปกครอง'],
    parentphone2: ['เบอร์โทรศัพท์มือถือ ของผู้ปกครอง (กรณีฉุกเฉิน)', 'เบอร์ฉุกเฉิน', 'เบอร์ติดต่อฉุกเฉินญาติ'],
    prevschool: ['สถานศึกษาเดิมที่นักเรียนจบมา', 'สถานศึกษาเดิม', 'โรงเรียนเดิม'],
    transport: ['นักเรียนเดินทางมาวิทยาลัยอย่างไร', 'การเดินทางมาเรียน', 'เดินทาง'],
    allowance: ['นักเรียนได้เงินมากินวันละกี่บาท', 'เงินได้รับมาเรียนต่อวัน', 'เงินรายวัน', 'ค่าขนม'],
    smoke: ['ดิ่มหรือสูบไหม', 'พฤติกรรมเสี่ยงดื่ม/สูบ', 'สูบบุหรี่']
  };

  columnMap = {};
  
  let html = '';
  FIELDS.forEach(f => {
    // Attempt auto-match
    let matchedCol = '';
    
    // 1. Try exact or alias match from THAI_MAP
    if (THAI_MAP[f.k]) {
      matchedCol = importHeaders.find(h => {
        const hn = h.trim();
        return THAI_MAP[f.k].some(alias => hn === alias || hn.toLowerCase() === alias.toLowerCase());
      }) || '';
    }

    // 2. Fallback to substring match
    if (!matchedCol) {
      importHeaders.forEach(h => {
        const headerNorm = h.toLowerCase().trim();
        const fieldLabelNorm = f.l.toLowerCase().trim();
        const fieldKeyNorm = f.k.toLowerCase().trim();
        
        if (headerNorm === fieldLabelNorm || 
            headerNorm === fieldKeyNorm || 
            headerNorm.includes(fieldLabelNorm) || 
            fieldLabelNorm.includes(headerNorm)) {
          matchedCol = h;
        }
      });
    }

    columnMap[f.k] = matchedCol;

    const selectOptions = importHeaders.map(h => `
      <option value="${h}" ${h === matchedCol ? 'selected' : ''}>${h}</option>
    `).join('');

    html += `
      <div class="map-grid">
        <span style="font-weight:600; color:var(--c8); font-size:12.5px;">${f.req ? `<span style="color:var(--r);">*</span> ` : ''}${f.l}</span>
        <span style="color:var(--c3); text-align:center;"><i class="fa-solid fa-arrow-right"></i></span>
        <select onchange="updateColumnMapping('${f.k}', this.value)" style="width:100%;">
          <option value="">-- ไม่จับคู่ (ข้าม) --</option>
          ${selectOptions}
        </select>
        <span id="map-preview-${f.k}" style="font-size:11.5px; color:var(--c5); font-family:monospace; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">
          ตัวอย่าง: ${matchedCol && importData[0] ? importData[0][matchedCol] : '-'}
        </span>
      </div>
    `;
  });

  area.innerHTML = html;
  previewDiv.style.display = 'block';
  // Scroll down
  previewDiv.scrollIntoView({ behavior: 'smooth' });
}

function updateColumnMapping(fieldKey, selectedHeader) {
  columnMap[fieldKey] = selectedHeader;
  
  // Update preview row
  const previewSpan = document.getElementById(`map-preview-${fieldKey}`);
  if (previewSpan) {
    previewSpan.textContent = `ตัวอย่าง: ${selectedHeader && importData[0] ? importData[0][selectedHeader] : '-'}`;
  }
}

function applyImport() {
  // Verify required fields (id, fname, lname)
  const reqFields = ['id', 'fname', 'lname'];
  const missing = reqFields.filter(k => !columnMap[k]);
  
  if (missing.length > 0) {
    const missingLabels = missing.map(k => FIELDS.find(f => f.k === k).l).join(', ');
    showToast(`⚠️ กรุณาจับคู่คอลัมน์ที่จำเป็นให้ครบ: [${missingLabels}]`, 'err');
    return;
  }

  if (confirm(`✅ ยืนยันการนำเข้าข้อมูลนักเรียนจำนวน ${importData.length} รายการ? ระบบจะเพิ่มข้อมูลเฉพาะรหัสที่ไม่ซ้ำ และอัปเดตข้อมูลถ้ารหัสซ้ำกัน`)) {
    let addedCount = 0;
    let updatedCount = 0;

    importData.forEach(row => {
      const idVal = String(row[columnMap['id']] || '').trim();
      if (!idVal) return; // skip empty IDs

      const student = {};
      
      // Smart Name Splitting logic if fname and lname map to the SAME column (e.g. ชื่อ-นามสกุล)
      let fnameVal = '';
      let lnameVal = '';
      const fnameCol = columnMap['fname'];
      const lnameCol = columnMap['lname'];
      
      if (fnameCol && lnameCol && fnameCol === lnameCol) {
        const fullName = String(row[fnameCol] || '').trim();
        const parts = fullName.split(/\s+/);
        if (parts.length >= 2) {
          fnameVal = parts[0];
          lnameVal = parts.slice(1).join(' ');
        } else {
          fnameVal = fullName;
          lnameVal = '';
        }
      } else {
        fnameVal = fnameCol ? String(row[fnameCol] || '').trim() : '';
        lnameVal = lnameCol ? String(row[lnameCol] || '').trim() : '';
      }

      FIELDS.forEach(f => {
        if (f.k === 'fname') {
          student.fname = fnameVal;
        } else if (f.k === 'lname') {
          student.lname = lnameVal;
        } else {
          const csvHeader = columnMap[f.k];
          let val = csvHeader ? (row[csvHeader] || '') : '';
          
          if (f.k === 'id') val = String(val).trim();
          student[f.k] = val;
        }
      });

      // Match status default if empty
      if (!student.status) student.status = 'กำลังศึกษา';

      // Intelligence parsing for Level & Year & Room
      if (student.level) {
        const lvlClean = String(student.level).trim();
        const m = lvlClean.match(/^(ปวช|ปวส)/i);
        if (m) {
          student.level = m[1] === 'ปวช' ? 'ปวช.' : 'ปวส.';
        }
      }
      
      // Default to Year 1, but attempt intelligent year parsing based on Thai Student ID convention (BE Prefix)
      if (!student.year) {
        let parsedYear = '1';
        const rawId = String(student.id || '').trim();
        // Thai Student IDs usually have 10-11 digits (e.g. 69201020001 or 68201020061)
        if (rawId && (rawId.length === 10 || rawId.length === 11)) {
          const prefixStr = rawId.substring(0, 2);
          const prefixVal = parseInt(prefixStr, 10);
          if (!isNaN(prefixVal) && prefixVal >= 60 && prefixVal <= 69) {
            // Current BE year is 2569 (2026 AD)
            const calcYear = 69 - prefixVal + 1;
            if (calcYear >= 1 && calcYear <= 3) {
              parsedYear = String(calcYear);
            }
          }
        }
        student.year = parsedYear;
      } else {
        student.year = String(student.year).trim();
      }

      if (!student.level) {
        student.level = 'ปวช.';
      }

      // Clean up Drive photo URL on import
      if (student.photo) {
            student.photo = normalizeDriveUrl(student.photo);
          }
          
          // [v12.6 Cloud Photo Fallback] ป้องกันรูปภาพหายหากข้อมูลรูปภาพใน Google Sheets หลักเป็นค่าว่างเปล่า
          if (!student.photo || student.photo.trim() === '') {
            const currentStu = typeof DB !== 'undefined' ? DB.find(s => String(s.id).trim() === String(student.id).trim()) : null;
            if (currentStu && currentStu.photo && currentStu.photo.trim() !== '') {
              student.photo = currentStu.photo;
            } else {
              const mockList = typeof getMockData === 'function' ? getMockData() : [];
              const mockStu = mockList.find(m => String(m.id).trim() === String(student.id).trim());
              if (mockStu && mockStu.photo && mockStu.photo.trim() !== '') {
                student.photo = mockStu.photo;
              }
            }
          }

      const existingIndex = DB.findIndex(x => x.id === idVal);
      if (existingIndex !== -1) {
        // Update existing details (keep photo if not provided in sheet)
        if (!student.photo && DB[existingIndex].photo) {
          student.photo = DB[existingIndex].photo;
        }
        DB[existingIndex] = student;
        updatedCount++;
      } else {
        DB.push(student);
        addedCount++;
      }
    });

    saveDatabase();
    showToast(`🎉 สำเร็จ! นำเข้าใหม่ ${addedCount} รายการ / อัปเดต ${updatedCount} รายการ`, 'ok');
    document.getElementById('import-preview').style.display = 'none';
    
    // Clear forms
    document.getElementById('sheets-url').value = 'https://docs.google.com/spreadsheets/d/16ly2qP4dXzQBPQo3gKJTQY9-Pxp9bMGtgAOMwSamPgA/edit?usp=sharing';
    document.getElementById('csv-file').value = '';
    
    goPage('dashboard');
  }
}

function cancelImport() {
  document.getElementById('import-preview').style.display = 'none';
  document.getElementById('sheets-url').value = '';
  document.getElementById('csv-file').value = '';
  showToast('❌ ยกเลิกการนำเข้าตารางข้อมูล', 'err');
}

function showHeaders() {
  if (importHeaders.length === 0) {
    showToast('⚠️ กรุณาดึงข้อมูลจากตารางหรือไฟล์ก่อน', 'err');
    return;
  }
  alert(`📋 รายการหัวคอลัมน์ที่พบในตารางนำเข้า:\n\n${importHeaders.map((h, i) => `${i+1}. ${h}`).join('\n')}`);
}

function showImportHelp() {
  alert(`🎓 วิธีแชร์ลิงก์ Google Sheets นำเข้าข้อมูลระบบ:\n\n1. เปิดไฟล์ Google Sheets ของคุณ\n2. คลิกปุ่ม "แชร์" (Share) ที่มุมขวาบน\n3. ในหัวข้อทั่วไป เปลี่ยนสถานะเป็น "ทุกคนที่มีลิงก์มีสิทธิ์อ่าน" (Anyone with the link can view)\n4. คัดลอกลิงก์ของ Google Sheets มาวางในช่อง หรือปรับแต่งเป็น CSV\n5. วางลิงก์ลงในกล่องและคลิก "ดึงข้อมูล"\n\n**ข้อแนะนำ**: ควรตั้งชื่อหัวคอลัมน์ใน Excel ให้ตรงหรือใกล้เคียงกับข้อมูลระบบ เช่น "รหัสนักเรียน", "ชื่อจริง", "นามสกุล", "ชื่อเล่น", "เบอร์โทร", "ความเสี่ยง" ระบบจะจับคู่ให้อัตโนมัติ!`);
}

// ── STATIC MOCKUP DATA (Wow presentation default tailored to ปวช. 1 [1-4] & ปวส. 1 [1, 2, 5]) ──
function getMockData() {
  return [
    {
      "id": "69201020003",
      "fname": "ไชยพสิษฐ์",
      "lname": "เนตรายนต์",
      "nickname": "กั้ง",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม1",
      "gender": "ชาย",
      "transport": "รถโดยสารสาธารณะ",
      "phone": "0937484827",
      "social": "คุณ ไชยพสิษฐ์",
      "smoke": "ไม่เคย",
      "parent": "นางสาว วาสนา เนตรายนต์ (แม่)",
      "parentphone": "0930504087",
      "parentphone2": "-",
      "prevschool": "โรงเรียนวัดโสธรวรารามวรวิหาร",
      "address_no": "48/1",
      "address_road": "-",
      "address_subdistrict": "คลองสวน",
      "address_district": "บางบ่อ",
      "address_zipcode": "10560",
      "needs_scholarship": "ยังไม่ตัดสินใจ",
      "parent_job": "ทำงานโรงงาน",
      "parent_income": "10000-15000 บาท",
      "allowance": "150 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1e2NwIZIWGmWYWwW6VcbJamknIYmxnqqM",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020015",
      "fname": "วัชรินทร์",
      "lname": "พุ่มนิคม",
      "nickname": "กัส",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม1",
      "gender": "ชาย",
      "transport": "รถโดยสารสาธารณะ",
      "phone": "0832787498",
      "social": "@wat_charin_",
      "smoke": "ม่ายมี",
      "parent": "เพ็ญนภา เปรืองเจริญ(แม่)",
      "parentphone": "0632278122",
      "parentphone2": "0632278144",
      "prevschool": "ดาราจรัส",
      "address_no": "123หมู่4",
      "address_road": "ม่ายมี",
      "address_subdistrict": "หัวไทร",
      "address_district": "บางคล้า",
      "address_zipcode": "22144",
      "needs_scholarship": "ยังไม่ตัดสินใจ",
      "parent_job": "ทำงานโรงงาน",
      "parent_income": "10000-15000 บาท",
      "allowance": "200 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1fkcbrbuaJP41SMRgnLEzbKX32dlLuh5f",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020011",
      "fname": "ภัทรพล",
      "lname": "ศรีสวัสดิ์",
      "nickname": "คุน",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม1",
      "gender": "ชาย",
      "transport": "รถมอเตอร์ไชล์ส่วนตัว",
      "phone": "0906367752",
      "social": "phattarapon_93",
      "smoke": "บุหรี่",
      "parent": "ลักษิกา ศรีสวัสดิ์ (เเม่)",
      "parentphone": "0620324332",
      "parentphone2": "0906367752(ตาโต้ง)",
      "prevschool": "โรงเรียนวัดปากน้ำโจ้โล้",
      "address_no": "54",
      "address_road": "สุขาภิบาล1",
      "address_subdistrict": "ปากน้ำ",
      "address_district": "บางคล้า",
      "address_zipcode": "24110",
      "needs_scholarship": "ต้องการ",
      "parent_job": "ทำงานโรงงาน",
      "parent_income": "ต่ำกว่า 10000 บาท",
      "allowance": "น้อยกว่า 100 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1QpjYJ27xtLACrSRM8SxjAr62PBBF9xoj",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020002",
      "fname": "ชาญวิทย์",
      "lname": "วงษ์ทอง",
      "nickname": "ชาญ",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม1",
      "gender": "ชาย",
      "transport": "รถมอเตอร์ไชล์ส่วนตัว",
      "phone": "0633601704",
      "social": "Chanwit",
      "smoke": "ไม่สูบ ไม่ดื่ม",
      "parent": "นางสาว อัญชลี แก้วเนตร (แม่)",
      "parentphone": "0989830696",
      "parentphone2": "0657478209 (พี่สาว)",
      "prevschool": "ศรีรักษ์ราษฎร์บำรุง",
      "address_no": "24",
      "address_road": "-",
      "address_subdistrict": "บางแตน",
      "address_district": "บ้านสร้าง",
      "address_zipcode": "25150",
      "needs_scholarship": "ยังไม่ตัดสินใจ",
      "parent_job": "ทำงานโรงงาน",
      "parent_income": "10000-15000 บาท",
      "allowance": "100 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1yBXZvQaQESbyjzC1QhBo3IraRtvTRgz2",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020001",
      "fname": "กิตติพงษ์",
      "lname": "วงไกร",
      "nickname": "ตูน",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม1",
      "gender": "ชาย",
      "transport": "รถมอเตอร์ไชล์ส่วนตัว",
      "phone": "0983844332",
      "social": "Kittiphong",
      "smoke": "บุหรี่",
      "parent": "สุนิสา วงสุวรรณ์",
      "parentphone": "0985822892",
      "parentphone2": "0985822892",
      "prevschool": "หนองแหนวิทยา",
      "address_no": "119/31",
      "address_road": "",
      "address_subdistrict": "หัวสำโรง",
      "address_district": "แปลงยาว",
      "address_zipcode": "24110",
      "needs_scholarship": "ไม่ต้องการ",
      "parent_job": "ทำงานโรงงาน",
      "parent_income": "10000-15000 บาท",
      "allowance": "150 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1-7lnoq7iA0MTqEVDjaG3BSuAF5mmrD-M",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020013",
      "fname": "รัฐพล",
      "lname": "สิริรอง",
      "nickname": "นัส",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม1",
      "gender": "ชาย",
      "transport": "รถมอเตอร์ไชล์ส่วนตัว",
      "phone": "064282796",
      "social": "Rattapon Sirirong",
      "smoke": "เหล้า เบียร",
      "parent": "กนกวรรณ สิริรอง",
      "parentphone": "0804624217",
      "parentphone2": "0632439658",
      "prevschool": "โรงเรียนวัดปากน้ำโจ้โล้",
      "address_no": "27 หมู่8",
      "address_road": "",
      "address_subdistrict": "ปากน้ำ",
      "address_district": "บางคล้า",
      "address_zipcode": "24110",
      "needs_scholarship": "ยังไม่ตัดสินใจ",
      "parent_job": "รับจ้างทั่วไป",
      "parent_income": "ต่ำกว่า 10000 บาท",
      "allowance": "100 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1GTKVQqXA6nW1f_J4bNCR0PjMy1Zxio4o",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020064",
      "fname": "จีรวัฒน์",
      "lname": "อินทะสร",
      "nickname": "ไนท์",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม1",
      "gender": "ชาย",
      "transport": "รถมอเตอร์ไชล์ส่วนตัว",
      "phone": "0661365810",
      "social": "จีรวัฒน์ อินทะสร",
      "smoke": "บุหรี่",
      "parent": "วิภาวดี เหรียญทอง",
      "parentphone": "0628195810",
      "parentphone2": "0628195810",
      "prevschool": "พนมสารคามพนมอดุลย์วิทยา",
      "address_no": "64",
      "address_road": "-",
      "address_subdistrict": "เขาหินซ้อน",
      "address_district": "พนมสารคาม",
      "address_zipcode": "241120",
      "needs_scholarship": "ยังไม่ตัดสินใจ",
      "parent_job": "ทำงานโรงงาน",
      "parent_income": "10000-15000 บาท",
      "allowance": "150 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1MRBI0zr29FTZ0-b23twSvJNEa5s0EF8g",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020006",
      "fname": "ธนพงษ์",
      "lname": "คงสวัสดิ์",
      "nickname": "บั้ม",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม1",
      "gender": "ชาย",
      "transport": "รถมอเตอร์ไชล์ส่วนตัว",
      "phone": "0970810635",
      "social": "ig thanapong.k_",
      "smoke": "ไม่ดื่มไม่สูบ",
      "parent": "นางสาวรัชดาภร เผือกบุญนาค(อา)",
      "parentphone": "0932634168",
      "parentphone2": "0932634168(อา)",
      "prevschool": "โรงเรียนวัดเขาดิน",
      "address_no": "59/2",
      "address_road": "-",
      "address_subdistrict": "เขาดิน",
      "address_district": "บางปะกง",
      "address_zipcode": "24130",
      "needs_scholarship": "ยังไม่ตัดสินใจ",
      "parent_job": "รับจ้างทั่วไป",
      "parent_income": "10000-15000 บาท",
      "allowance": "100 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1z4Rl5aJo_xPkv1tCEBpza5V8hEN663N_",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020016",
      "fname": "สิทธิพร",
      "lname": "พิมพัฒน์",
      "nickname": "บาส",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม1",
      "gender": "ชาย",
      "transport": "รถมอเตอร์ไชล์ส่วนตัว",
      "phone": "0948380919",
      "social": "ไม่มี",
      "smoke": "ไม่กินอะไรเลย",
      "parent": "สมจิตร น้อยมณี",
      "parentphone": "0948826709",
      "parentphone2": "0861552077",
      "prevschool": "โรงเรียนวัดลำต้อยติ่ง",
      "address_no": "42/1 หมู่9",
      "address_road": "-",
      "address_subdistrict": "ครงหลวงแพ่ง",
      "address_district": "เมื่องฮะเชิงเทรา",
      "address_zipcode": "24000",
      "needs_scholarship": "ไม่ต้องการ",
      "parent_job": "รับจ้างทั่วไป",
      "parent_income": "15000-20000 บาท",
      "allowance": "200 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1obStRKgvYrt_NlZhQ8zkJLTMqriqpQD3",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020106",
      "fname": "ภาณุพงษ์",
      "lname": "ใหม่ผึ้ง",
      "nickname": "บาส",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม1",
      "gender": "ชาย",
      "transport": "รถโดยสารสาธารณะ",
      "phone": "0982843751",
      "social": "Panupong Maipueng",
      "smoke": "ไม่สูบไม่ดื่ม",
      "parent": "นางสาววรรณาทใหม่ผึ้ง",
      "parentphone": "0806362851",
      "parentphone2": "0614452061 (พ่อ)",
      "prevschool": "บางคล้าพิทยาคม",
      "address_no": "47/1",
      "address_road": "",
      "address_subdistrict": "เมืองใหม่",
      "address_district": "ราชสาสน์",
      "address_zipcode": "24120",
      "needs_scholarship": "ยังไม่ตัดสินใจ",
      "parent_job": "ทำงานโรงงาน",
      "parent_income": "ต่ำกว่า 10000 บาท",
      "allowance": "150 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1VFJq30cmpo_lVF90Xow96Bjyo38YGk4l",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020018",
      "fname": "อนุชิต",
      "lname": "อุบลรัตน์",
      "nickname": "แป๊ะ",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม1",
      "gender": "ชาย",
      "transport": "รถโดยสารสาธารณะ",
      "phone": "0908866092",
      "social": "Anuchit",
      "smoke": "ไม่สูบ",
      "parent": "ขวัญเรือน กรุดตรีฑา",
      "parentphone": "0964120715",
      "parentphone2": "0964120715",
      "prevschool": "โรงเรียนบ้านหนองโสน",
      "address_no": "62/8",
      "address_road": "",
      "address_subdistrict": "เสม็ดใต้",
      "address_district": "บางคล้า",
      "address_zipcode": "24110",
      "needs_scholarship": "ยังไม่ตัดสินใจ",
      "parent_job": "ทำงานโรงงาน",
      "parent_income": "ต่ำกว่า 10000 บาท",
      "allowance": "100 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1a-t7eIFyDZ-xlKYxBqGj-qYPSsPnJzk7",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020010",
      "fname": "ภัทรพงศ์",
      "lname": "",
      "nickname": "พุทธพงษ์",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม1",
      "gender": "ชาย",
      "transport": "รถโดยสารสาธารณะ",
      "phone": "0829920635",
      "social": "IG stxm_x53",
      "smoke": "ไม่มีครับ",
      "parent": "นาง วลี เสาวรส",
      "parentphone": "0871507782",
      "parentphone2": "0871507782",
      "prevschool": "เบญจมราชรังสฤษฎิ์2",
      "address_no": "164/4",
      "address_road": "-",
      "address_subdistrict": "แปลงยาว",
      "address_district": "อำเภอแปลงยาว",
      "address_zipcode": "24190",
      "needs_scholarship": "ไม่ต้องการ",
      "parent_job": "ทำงานโรงงาน",
      "parent_income": "15000-20000 บาท",
      "allowance": "150 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1TJKifiq6A-yp9IKK60U8FRHILwonhd8k",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020008",
      "fname": "ภคนันท์",
      "lname": "ขวัญยัง",
      "nickname": "ฟลุ๊ค",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม1",
      "gender": "ชาย",
      "transport": "รถมอเตอร์ไชล์ส่วนตัว",
      "phone": "0652249299",
      "social": "Phakanan KwanYoung",
      "smoke": "ไม่ยุ่งอะไรเลย",
      "parent": "นางสาว สายฝน ยิ้มวิไล (แม่)",
      "parentphone": "0617245605",
      "parentphone2": "0617245605",
      "prevschool": "โรงเรียนวัดคลองสวน",
      "address_no": "76/4 หมู่1",
      "address_road": "-",
      "address_subdistrict": "เกาะไร่",
      "address_district": "บ้านโพธิ์",
      "address_zipcode": "24140",
      "needs_scholarship": "ต้องการ",
      "parent_job": "ทำงานโรงงาน",
      "parent_income": "ต่ำกว่า 10000 บาท",
      "allowance": "น้อยกว่า 100 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1DeC5owv9jTGqnPW2djx3MpwkMCuQe1Tp",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020007",
      "fname": "นพกร",
      "lname": "โสดก",
      "nickname": "ภัทร",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม1",
      "gender": "ชาย",
      "transport": "รถไฟ",
      "phone": "0639981774",
      "social": "Nopakorn",
      "smoke": "ไม่มี",
      "parent": "นางสาว ปริญญา กาจนารักษ์",
      "parentphone": "0633267123",
      "parentphone2": "0633267123",
      "prevschool": "โรงเรียนวัดโสธรวรารามวรวิหาร",
      "address_no": "เลขที่29หมู่11",
      "address_road": "ไม่มี",
      "address_subdistrict": "โยธะกา",
      "address_district": "บางน้ำเปรี้ยว",
      "address_zipcode": "24150",
      "needs_scholarship": "ยังไม่ตัดสินใจ",
      "parent_job": "อาชีพเกษตรกรรม",
      "parent_income": "10000-15000 บาท",
      "allowance": "150 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1xlRqChMszuQO02sahB9C0c1KFRGxn7my",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020012",
      "fname": "ภาคภูมิ",
      "lname": "ถีถาวร",
      "nickname": "ภูมิ",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม1",
      "gender": "ชาย",
      "transport": "ผู้ปกครองมาส่ง",
      "phone": "0804023699",
      "social": "Phakpoom Theethaworn *Facebook",
      "smoke": "ไม่มี",
      "parent": "อนุพงษ์ ถีถาวร (พ่อ)",
      "parentphone": "0931177168",
      "parentphone2": "0931177168",
      "prevschool": "โรงเรียนวัดนครเนื่องเขต(ศรีไพจิตร)",
      "address_no": "80/83",
      "address_road": "วัดต้นตาล",
      "address_subdistrict": "วังตะเคียน",
      "address_district": "เมือง",
      "address_zipcode": "24000",
      "needs_scholarship": "ยังไม่ตัดสินใจ",
      "parent_job": "ค้าขาย",
      "parent_income": "15000-20000 บาท",
      "allowance": "100 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1sg0RxDLK_kKMDfzIIKKV94gnI-ALhYtG",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020020",
      "fname": "อิทธิกร",
      "lname": "คงศรี",
      "nickname": "มาร์ค",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม1",
      "gender": "ชาย",
      "transport": "รถมอเตอร์ไชล์ส่วนตัว",
      "phone": "0653402314",
      "social": "ittikorn konsee",
      "smoke": "บุหรี่",
      "parent": "อรุณี ทองสวัสดิ์ เเม่",
      "parentphone": "0631293986",
      "parentphone2": "0613242473 พ่อ",
      "prevschool": "วัดปากน้ำโจ้โล้",
      "address_no": "24/39",
      "address_road": "",
      "address_subdistrict": "ปากน้ำ",
      "address_district": "บางคบ้า",
      "address_zipcode": "24110",
      "needs_scholarship": "ไม่ต้องการ",
      "parent_job": "ค้าขาย",
      "parent_income": "10000-15000 บาท",
      "allowance": "150 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1IZauCTVssWW7XTwpUnzgmCiMrUVpY_pO",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020017",
      "fname": "สุทธิมนต์",
      "lname": "หนุนพิทักษ์สกุล",
      "nickname": "ยูโร",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม1",
      "gender": "ชาย",
      "transport": "เดินมาหออยู่ซอยจักรพรรดิ5ครับ",
      "phone": "0633630434",
      "social": "IG: korn_of999",
      "smoke": "เหล้า เบียร",
      "parent": "นางสาว ชุติกาญจน์ ทัดเทียม",
      "parentphone": "0814975685",
      "parentphone2": "0992719138 (พี่ชาย)",
      "prevschool": "โรงเรียนสนามชัยเขต",
      "address_no": "614หมู่4",
      "address_road": "",
      "address_subdistrict": "คู้ยายหมี",
      "address_district": "สนามชัยเขต",
      "address_zipcode": "24160",
      "needs_scholarship": "ต้องการ",
      "parent_job": "ค้าขาย",
      "parent_income": "20000-30000 บาท",
      "allowance": "100 บาท",
      "photo": "https://lh3.googleusercontent.com/d/19vAP58xAQ_jl02JFTsJyjboGY3zJtyxd",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020014",
      "fname": "วรวุฒิ",
      "lname": "วงค์คำจันทร์",
      "nickname": "วี",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม1",
      "gender": "ชาย",
      "transport": "รถมอเตอร์ไชล์ส่วนตัว",
      "phone": "0613630537",
      "social": "WORAWUT",
      "smoke": "ไม่ดูด",
      "parent": "สรวีย์ ภิสิทโชติ์สิน(แม่)",
      "parentphone": "0843594162",
      "parentphone2": "0843594162(แม่ชื่อเก๋)",
      "prevschool": "เบญจมราชรังสฤษฎิ์2",
      "address_no": "3/75",
      "address_road": "304",
      "address_subdistrict": "บางกรูด",
      "address_district": "บ้านโพธิ์",
      "address_zipcode": "24140",
      "needs_scholarship": "ต้องการ",
      "parent_job": "ค้าขาย",
      "parent_income": "10000-15000 บาท",
      "allowance": "100 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1QwsRvC5HQPnBwywj9QFcs7j5TNU4dCNB",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020004",
      "fname": "ณัฐภัทร",
      "lname": "พรหมเมือง",
      "nickname": "ออม",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม1",
      "gender": "ชาย",
      "transport": "รถมอเตอร์ไชล์ส่วนตัว",
      "phone": "0805243462",
      "social": "ณัฐภัทร พรหมเมือง",
      "smoke": "ไม่เอาหมด",
      "parent": "นาง สุพัตรา  มะอินทร์",
      "parentphone": "0986404616",
      "parentphone2": "0986404616",
      "prevschool": "โรงเรียนวัดลำต้อยติ่ง",
      "address_no": "9/3",
      "address_road": "304",
      "address_subdistrict": "ลำต้องติ่ง",
      "address_district": "หนองจอก",
      "address_zipcode": "10530",
      "needs_scholarship": "ยังไม่ตัดสินใจ",
      "parent_job": "รับจ้างทั่วไป",
      "parent_income": "ต่ำกว่า 10000 บาท",
      "allowance": "150 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1Mp5l9syvU-qfWWzQYCuTKsCBZ8ml9mn-",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020009",
      "fname": "ภัทรดนัย",
      "lname": "ปิ่นไชโย",
      "nickname": "เเสตมป์",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม1",
      "gender": "ชาย",
      "transport": "2เเถว-มอไซค์ส่วนตัว",
      "phone": "0631762246",
      "social": "-",
      "smoke": "บุหรี่",
      "parent": "นาย ธเนตร ปิ่นไชโย",
      "parentphone": "0989202125",
      "parentphone2": "0989202125 นาย ธเนตร",
      "prevschool": "เบญ2",
      "address_no": "88/32",
      "address_road": "-",
      "address_subdistrict": "เเปลงยาว",
      "address_district": "เเปลงยาว",
      "address_zipcode": "24190",
      "needs_scholarship": "ไม่ต้องการ",
      "parent_job": "งานราชการ",
      "parent_income": "20000-30000 บาท",
      "allowance": "200 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1eOmcWu01lTZpAf_4NVBsOgLRV1erQHWl",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020075",
      "fname": "เศรษฐพงศ์",
      "lname": "คงเพชร",
      "nickname": "เท็น",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม1",
      "gender": "ชาย",
      "transport": "รถโดยสารสาธารณะ",
      "phone": "0952864176",
      "social": "Tenn_Xx",
      "smoke": "บุหรี่",
      "parent": "นางสาว ชลธิกา คงเพชร (แม่)",
      "parentphone": "0644010180",
      "parentphone2": "0953350514 พี่สาว",
      "prevschool": "โรงเรียนคิชฌกูฏวิทยา",
      "address_no": "1/8",
      "address_road": "",
      "address_subdistrict": "แหลมประดู่",
      "address_district": "บ้านโพธิ์",
      "address_zipcode": "2011",
      "needs_scholarship": "ยังไม่ตัดสินใจ",
      "parent_job": "รับจ้างทั่วไป",
      "parent_income": "ต่ำกว่า 10000 บาท",
      "allowance": "150 บาท",
      "photo": "https://lh3.googleusercontent.com/d/144Z9iqv1u2bhDme9d4DlLZQwzbgf30Kv",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020033",
      "fname": "วงศกร",
      "lname": "สอนสมนึก",
      "nickname": "กาฟิวส์",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม2",
      "gender": "ชาย",
      "transport": "รถโดยสารสาธารณะ",
      "phone": "0822963741",
      "social": "_wongsakron.0",
      "smoke": "บุหรี่, เหล้า เบียร, น้ำกระท่อม",
      "parent": "กอนไสย สอนสมนึก",
      "parentphone": "0885280324",
      "parentphone2": "0640250834",
      "prevschool": "ดาราสมุทร ฉะเชิงเทรา",
      "address_no": "เค.ซี.สุวินทวงศ์2 สำนักงานขายโครงการเค.ซี 2 51 หมู่ 6 ถ. สุวินทวงศ์ ตำบล คลองหลวงแพ่ง เมือง ฉะเชิงเทรา 24000",
      "address_road": "สุวินทวงศ์2",
      "address_subdistrict": "คลองหลวงแพ่ง",
      "address_district": "เมือง",
      "address_zipcode": "240000",
      "needs_scholarship": "ต้องการ",
      "parent_job": "ทำงานโรงงาน",
      "parent_income": "20000-30000 บาท",
      "allowance": "200 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1iHnF5OhjSVE3V11yvuD_PhS_LY2jLzc1",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020024",
      "fname": "ตถตา",
      "lname": "จันทร์บาง",
      "nickname": "เจ๋ง",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม2",
      "gender": "ชาย",
      "transport": "รถมอเตอร์ไชล์ส่วนตัว",
      "phone": "0624086788",
      "social": "__tathata",
      "smoke": "ไม่มี",
      "parent": "ศศิธร สัตยากูล",
      "parentphone": "0923242354",
      "parentphone2": "0923242354",
      "prevschool": "วัดเที่ยงพิมลมุข",
      "address_no": "69/8",
      "address_road": "-",
      "address_subdistrict": "บางขวัญ",
      "address_district": "เมือง",
      "address_zipcode": "24000",
      "needs_scholarship": "ยังไม่ตัดสินใจ",
      "parent_job": "ทำงานโรงงาน",
      "parent_income": "ต่ำกว่า 10000 บาท",
      "allowance": "100 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1vSvS72xzIZQRxDvvv4m6_J0H5xZgYWel",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020031",
      "fname": "ภานุรุจ",
      "lname": "กุ่งแก้ว",
      "nickname": "เจแปน",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม2",
      "gender": "ชาย",
      "transport": "รถโดยสารสาธารณะ",
      "phone": "0993811939",
      "social": "Ja pan",
      "smoke": "เหล้า เบียร",
      "parent": "นางสุวรรณา บุญปลั่ง",
      "parentphone": "0611785988",
      "parentphone2": "0611785988",
      "prevschool": "เบญจมราชรังสฤษฎิ์2",
      "address_no": "24/2",
      "address_road": "-",
      "address_subdistrict": "หนองตีนนก",
      "address_district": "บ้านโพธิ์",
      "address_zipcode": "-",
      "needs_scholarship": "ไม่ต้องการ",
      "parent_job": "ค้าขาย",
      "parent_income": "10000-15000 บาท",
      "allowance": "200 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1gtuzP8DGbA1t7Aig2JoSSCBaef-kwv6U",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020037",
      "fname": "อัครพนธ์",
      "lname": "ศิลาภรพรรณ",
      "nickname": "โซ่",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม2",
      "gender": "ชาย",
      "transport": "รถโดยสารสาธารณะ",
      "phone": "0945096421",
      "social": "Lxks_5 (IG)",
      "smoke": "บุหรี่,",
      "parent": "นาย สรพล ศิลาภรพรรณ (พ่อ) นาง รักคณา ศิลาภรพรรณ (แม่)",
      "parentphone": "0832381351 (พ่อ) 0929083155 (แม่)",
      "parentphone2": "0832381351 (พ่อ) 0929083155 (แม่)",
      "prevschool": "สุตะบำรุงพิทยาคาร",
      "address_no": "156/1",
      "address_road": "",
      "address_subdistrict": "เมืองใหม่",
      "address_district": "ราชสาส์น",
      "address_zipcode": "24120",
      "needs_scholarship": "ต้องการ",
      "parent_job": "ค้าขาย",
      "parent_income": "15000-20000 บาท",
      "allowance": "200 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1cKLc7iWmpWfVKuaMYwF_6HyQKVTGtJrM",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020035",
      "fname": "อภิชิต",
      "lname": "พิมพา",
      "nickname": "ดรีม",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม2",
      "gender": "ชาย",
      "transport": "ผู้ปกครองมาส่ง",
      "phone": "0994745306",
      "social": "Drem Abhijit",
      "smoke": "บุหรี่",
      "parent": "นางสาว อารีรัตน์ ประทุมมา (แม่)",
      "parentphone": "083-598-1320",
      "parentphone2": "0994745306",
      "prevschool": "โรงเรียนวัดโสธรวรารามวรวิหาร",
      "address_no": "6/7",
      "address_road": "ศรีโสธร",
      "address_subdistrict": "บางพระ",
      "address_district": "เมือง",
      "address_zipcode": "2440",
      "needs_scholarship": "ต้องการ",
      "parent_job": "เจ้าของกิจการ",
      "parent_income": "15000-20000 บาท",
      "allowance": "100 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1IuFw_VZiyad5esZ7iP7QgmK-1V5j4z3t",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020029",
      "fname": "บูรพา",
      "lname": "ริดมัด",
      "nickname": "ตี๋",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม2",
      "gender": "ชาย",
      "transport": "รถมอเตอร์ไชล์ส่วนตัว",
      "phone": "0813327574",
      "social": "Burpar ridmad",
      "smoke": "ไม่ยุ่งเกี่ยวทุกชนิด",
      "parent": "ราตรี ริดมัด",
      "parentphone": "0840684637",
      "parentphone2": "0980870594",
      "prevschool": "เบญจมราชรังสฤษฎิ์3",
      "address_no": "95/3",
      "address_road": "เลียบคลองเจ้า",
      "address_subdistrict": "คลองหลวงเเพ่ง",
      "address_district": "เมือง",
      "address_zipcode": "24000",
      "needs_scholarship": "ไม่ต้องการ",
      "parent_job": "ทำงานโรงงาน",
      "parent_income": "10000-15000 บาท",
      "allowance": "150 บาท",
      "photo": "https://lh3.googleusercontent.com/d/13Tz7LkLkCtfmeUI1cspKF2Xr3dLrBaFH",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020038",
      "fname": "อาทิตย์",
      "lname": "หาญณรงค์",
      "nickname": "ทิต",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม2",
      "gender": "ชาย",
      "transport": "รถโดยสารสาธารณะ",
      "phone": "0614988815",
      "social": "IG _zzziixx",
      "smoke": "ไม่",
      "parent": "สมชาย หาญณรงค์ พ่อ",
      "parentphone": "0979844938",
      "parentphone2": "0623869907",
      "prevschool": "พนมสารคามพนมอดุลย์วิทยา",
      "address_no": "50",
      "address_road": "",
      "address_subdistrict": "หนองแหน",
      "address_district": "พนมสารคาม",
      "address_zipcode": "24120",
      "needs_scholarship": "ไม่ต้องการ",
      "parent_job": "ทำงานโรงงาน",
      "parent_income": "10000-15000 บาท",
      "allowance": "200 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1qGD5WbtvSTihL7CSTen9MxVRRcOfzxxu",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020030",
      "fname": "ภัคพล",
      "lname": "ทองก้อน",
      "nickname": "ธันวา",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม2",
      "gender": "ชาย",
      "transport": "เดินมา",
      "phone": "0923529369",
      "social": "Phakphon Thongkon",
      "smoke": "ไม่สูบ",
      "parent": "นายนเรศ  ทองก้อน(พ่อ)",
      "parentphone": "0628274031",
      "parentphone2": "0629375989(แม่)",
      "prevschool": "โรงเรียนวัดประตูน้ำท่าไข่",
      "address_no": "35/6ค",
      "address_road": "มหาจักรพรรดิ์",
      "address_subdistrict": "หน้าเมือง",
      "address_district": "เมืองฉะเชิงเทรา",
      "address_zipcode": "2400",
      "needs_scholarship": "ต้องการ",
      "parent_job": "รับจ้างทั่วไป",
      "parent_income": "ต่ำกว่า 10000 บาท",
      "allowance": "100 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1e4IVOzd5NJVZqvDQ3ExaGEW5JqC8dWn4",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020040",
      "fname": "อารักษ์",
      "lname": "ใหม่โสภา",
      "nickname": "นกฮูก",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม2",
      "gender": "ชาย",
      "transport": "รถโดยสารสาธารณะ",
      "phone": "0961248115",
      "social": "nokhook_53",
      "smoke": "ไม่เอาครับ",
      "parent": "กัลยา ปรีชา",
      "parentphone": "0982951053",
      "parentphone2": "0852767357 (ย่า)",
      "prevschool": "บางคล้าพิทยาคม",
      "address_no": "15 หมู่ 6",
      "address_road": "-",
      "address_subdistrict": "เมืองใหม่",
      "address_district": "ราชสาส์น",
      "address_zipcode": "24120",
      "needs_scholarship": "ยังไม่ตัดสินใจ",
      "parent_job": "รับจ้างทั่วไป",
      "parent_income": "10000-15000 บาท",
      "allowance": "150 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1I39v5N0i_lRQekP1lp0C37Q__yeu4AVe",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020025",
      "fname": "ทศวรรธ",
      "lname": "รอดทุกข์",
      "nickname": "ไนท์",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม2",
      "gender": "ชาย",
      "transport": "รถมอเตอร์ไชล์ส่วนตัว",
      "phone": "0963029892",
      "social": "IG.Thodwawat_2010",
      "smoke": "-",
      "parent": "นางสาวสุพรรณษา ทรัพย์แก้ว (แม่)",
      "parentphone": "0889086489",
      "parentphone2": "0835463884",
      "prevschool": "ไผ่ดำพิทยาคม รัชมังคลาภิเษก",
      "address_no": "17/12หมู่12",
      "address_road": "-",
      "address_subdistrict": "ดอนฉิมพลี",
      "address_district": "บางนํ้าเปรี้ยว",
      "address_zipcode": "24170",
      "needs_scholarship": "ยังไม่ตัดสินใจ",
      "parent_job": "ทำงานโรงงาน",
      "parent_income": "15000-20000 บาท",
      "allowance": "150 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1mC0NtNDJD9G6JMKub2XJu3mOTP1rdCNV",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020022",
      "fname": "ชิษณุพงศ์",
      "lname": "ซื่อตรง",
      "nickname": "บอส",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม2",
      "gender": "ชาย",
      "transport": "รถโดยสารสาธารณะ",
      "phone": "0858120327",
      "social": "Chitsan Uphong",
      "smoke": "ไม่ยุ่งเกี่ยว",
      "parent": "นางภิญญาพัชญ์ สุขศิริโชติหิรัญ(แม่)",
      "parentphone": "0612961939",
      "parentphone2": "0821085239(พ่อ)",
      "prevschool": "รถเรียนเบญจมราชรังฏิ์3ชนะสงสารวิทยา",
      "address_no": "67/1",
      "address_road": "",
      "address_subdistrict": "คลองหวงแพ่ง",
      "address_district": "เมือง",
      "address_zipcode": "24000",
      "needs_scholarship": "ไม่ต้องการ",
      "parent_job": "รับจ้างทั่วไป",
      "parent_income": "10000-15000 บาท",
      "allowance": "200 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1jEVg4ldbklLBcYQHyXcQRZpmyHpjskBF",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020023",
      "fname": "ญาณศรณ์",
      "lname": "ด้วงเงิน",
      "nickname": "พอส",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม2",
      "gender": "ชาย",
      "transport": "รถตู้รับส่ง",
      "phone": "0627591740",
      "social": "ญาณศรณ์ ด้วงเงิน",
      "smoke": "เหล้า เบียร",
      "parent": "นางสาวเบญจพร ด้วงเงิน (พี่สาว)",
      "parentphone": "0851696592",
      "parentphone2": "0868207703 (พ่อ ชื่อประจวบ)",
      "prevschool": "เบญ 2",
      "address_no": "25/1",
      "address_road": "-",
      "address_subdistrict": "หนองบัว",
      "address_district": "บ้านโพธิ์",
      "address_zipcode": "24140",
      "needs_scholarship": "ยังไม่ตัดสินใจ",
      "parent_job": "งานราชการ",
      "parent_income": "10000-15000 บาท",
      "allowance": "100 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1TKWpiFMr87UBU6uCN_Nc-iy_OejgxkRB",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020027",
      "fname": "ธนภูมิ",
      "lname": "โสดาตา",
      "nickname": "ภูมิ",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม2",
      "gender": "ชาย",
      "transport": "รถโดยสารสาธารณะ",
      "phone": "0659571147",
      "social": "Thanaphum sodata",
      "smoke": "ไม่ยุ่งเกี่ยว",
      "parent": "นายวีรกุล โสดาตา พ่อ",
      "parentphone": "0987964399",
      "parentphone2": "0861491408",
      "prevschool": "โรงเรียนวัดคลอง18",
      "address_no": "92/1",
      "address_road": "ซอยกลาง",
      "address_subdistrict": "หมอนทอง",
      "address_district": "บางนํ้าเปรี้ยว",
      "address_zipcode": "24150",
      "needs_scholarship": "ยังไม่ตัดสินใจ",
      "parent_job": "ทำงานโรงงาน",
      "parent_income": "ต่ำกว่า 10000 บาท",
      "allowance": "200 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1R1P1sEH39CmoDYlcshcdoU8sOa5-EB38",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020021",
      "fname": "ชัยมงคล",
      "lname": "ฉิมแก้ว",
      "nickname": "ม่อน",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม2",
      "gender": "ชาย",
      "transport": "รถไฟ",
      "phone": "0952830603",
      "social": "Chaimongkol Chimkaew",
      "smoke": "ไม่",
      "parent": "นางสมวงษ์ ฉิมแก้ว (แม่)",
      "parentphone": "0815700992",
      "parentphone2": "0814294547",
      "prevschool": "โรงเรียนศรีรักษ์ราษฎร์บำรุง",
      "address_no": "28 หมู่11",
      "address_road": "-",
      "address_subdistrict": "บางแตน",
      "address_district": "บ้านสร้าง",
      "address_zipcode": "25150",
      "needs_scholarship": "ต้องการ",
      "parent_job": "อาชีพเกษตรกรรม",
      "parent_income": "10000-15000 บาท",
      "allowance": "150 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1jbGRTueNjRll_lITB-Z-Au4Emx37NDJl",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020028",
      "fname": "ธาวิน",
      "lname": "มิดยิ้ม",
      "nickname": "มะดี",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม2",
      "gender": "ชาย",
      "transport": "ผู้ปกครองมาส่ง",
      "phone": "0910702750",
      "social": "madee  Midyim",
      "smoke": "บุหรี่",
      "parent": "ธีรดา สมันเลาะ",
      "parentphone": "0805615170",
      "parentphone2": "0805615170",
      "prevschool": "ผดุงอิสลาม",
      "address_no": "8/1",
      "address_road": "",
      "address_subdistrict": "ดอนเกาะกา",
      "address_district": "บางน้ำเปรี้ยว",
      "address_zipcode": "24170",
      "needs_scholarship": "ยังไม่ตัดสินใจ",
      "parent_job": "ทำงานโรงงาน",
      "parent_income": "ต่ำกว่า 10000 บาท",
      "allowance": "มากกว่า 200 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1JzH8hphWToUIX-LKD6qjW9CoeeHWxVVJ",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020026",
      "fname": "ธนพัฒน์",
      "lname": "พึ่งพันธ์",
      "nickname": "อ๊อฟ",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม2",
      "gender": "ชาย",
      "transport": "รถตู้รับส่ง",
      "phone": "0639103322",
      "social": "ig:thanaphat_2",
      "smoke": "บุหรี่",
      "parent": "สัมฤทธิ์ เอี่ยมละออ",
      "parentphone": "0845538528",
      "parentphone2": "0845538528",
      "prevschool": "สุตะบำรุงพิทยาคาร",
      "address_no": "33",
      "address_road": "ไม่มี",
      "address_subdistrict": "บางกระเจ็ด",
      "address_district": "บางคล้า",
      "address_zipcode": "24110",
      "needs_scholarship": "ยังไม่ตัดสินใจ",
      "parent_job": "อาชีพเกษตรกรรม",
      "parent_income": "15000-20000 บาท",
      "allowance": "150 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1lHXCY6W75lVTWLb6yRdnj_mfBCXXCw2l",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020036",
      "fname": "ออมสิน",
      "lname": "มีมาก",
      "nickname": "ออม",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม2",
      "gender": "ชาย",
      "transport": "มารถมอเตอร์ไซล์กับเพื่อน",
      "phone": "0966315393",
      "social": "ig aommm_.10",
      "smoke": "ไม่มี",
      "parent": "นางกิ่งมณี มีมาก(แม่)",
      "parentphone": "0803170021",
      "parentphone2": "ไม่มี",
      "prevschool": "วัดคลองสวน(พิบูลธรรมขันธ์)",
      "address_no": "165/7",
      "address_road": "อ่อนนุช",
      "address_subdistrict": "คลองสวน",
      "address_district": "บางบ่อ",
      "address_zipcode": "10560",
      "needs_scholarship": "ต้องการ",
      "parent_job": "รับจ้างทั่วไป",
      "parent_income": "ต่ำกว่า 10000 บาท",
      "allowance": "150 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1YL15CR1lmevbvU3RQgPad6rr1OAKJqVL",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020032",
      "fname": "ฤทธิรงค์",
      "lname": "ฉานุ",
      "nickname": "ไอซ์",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม2",
      "gender": "ชาย",
      "transport": "รถมอเตอร์ไชล์ส่วนตัว",
      "phone": "0828893128",
      "social": "Fb Rittirong Chanu",
      "smoke": "บุหรี่",
      "parent": "ภาสกร ฉานุ",
      "parentphone": "0633854031",
      "parentphone2": "0948691384 (เเม่)",
      "prevschool": "วัดปากน้ำโจ้โล้",
      "address_no": "46/10/7",
      "address_road": "-",
      "address_subdistrict": "ปากน้ำ",
      "address_district": "บางคล้า",
      "address_zipcode": "24110",
      "needs_scholarship": "ยังไม่ตัดสินใจ",
      "parent_job": "รับจ้างทั่วไป",
      "parent_income": "ต่ำกว่า 10000 บาท",
      "allowance": "100 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1qSiYlyXgQ7E4vG98fHqZHJJPCxT04SEK",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020085",
      "fname": "อัครพล",
      "lname": "คลังกลาง",
      "nickname": "กัส",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม3",
      "gender": "ชาย",
      "transport": "รถโดยสารสาธารณะ",
      "phone": "0946629772",
      "social": "_akkharaphon._",
      "smoke": "เหล้า เบียร",
      "parent": "สุภาวรรณ   ดอนภัคดี",
      "parentphone": "0824750864",
      "parentphone2": "0824750864  แม่  ชื่อนัส",
      "prevschool": "สุตะบำรุงพิทยาคาร",
      "address_no": "207/45",
      "address_road": "บางบ่อ",
      "address_subdistrict": "แแลงยาว",
      "address_district": "แปลงยาว",
      "address_zipcode": "20240",
      "needs_scholarship": "ไม่ต้องการ",
      "parent_job": "ทำงานโรงงาน",
      "parent_income": "20000-30000 บาท",
      "allowance": "130 บาท",
      "photo": "https://lh3.googleusercontent.com/d/109okgH6ObzNtSLYCF_Ll9aaVBbTOCBiF",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020044",
      "fname": "ณัฐดนัย",
      "lname": "วงษ์ประภา",
      "nickname": "เกมส์",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม3",
      "gender": "ชาย",
      "transport": "รถโดยสารสาธารณะ",
      "phone": "0610053000",
      "social": "ไอจีnatthanai_0704",
      "smoke": "ไม่ดืมแหละไม่สูบครับ",
      "parent": "สุพัตรา วงษ์ประภา  แม่",
      "parentphone": "0987681872",
      "parentphone2": "0868133481  พ่อ",
      "prevschool": "กสน ระดับตำบลมาบข่า จ.ระยอง",
      "address_no": "109หมู่4",
      "address_road": "",
      "address_subdistrict": "เมืองไหม่",
      "address_district": "ราชสาส์น",
      "address_zipcode": "24120",
      "needs_scholarship": "ยังไม่ตัดสินใจ",
      "parent_job": "ทำงานโรงงาน",
      "parent_income": "20000-30000 บาท",
      "allowance": "150 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1gexQfwS6mebScMIXvAMsjmKfzqDbtE2u",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020047",
      "fname": "ธรรมรัตน์",
      "lname": "หลวงชัย",
      "nickname": "คอปเตอร์",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม3",
      "gender": "ชาย",
      "transport": "ผู้ปกครองมาส่ง",
      "phone": "0925474310",
      "social": "เตอร์  ดุ๊ก",
      "smoke": "ไม่เอาอะไรเลย",
      "parent": "วิรัตน์  หลวงชัย พ่อ",
      "parentphone": "0817654085",
      "parentphone2": "0614753419",
      "prevschool": "โรงเรียนชำป่างามวิทยาคม",
      "address_no": "77/450",
      "address_road": "",
      "address_subdistrict": "หน้าเมือง",
      "address_district": "เมือง",
      "address_zipcode": "24000",
      "needs_scholarship": "ต้องการ",
      "parent_job": "ทำงานโรงงาน",
      "parent_income": "10000-15000 บาท",
      "allowance": "100 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1Yl-tLhVu8kqTwWJ5FmxNM1b9PdVDaLRP",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020060",
      "fname": "อุดมทรัพย์",
      "lname": "ศรีคัชชะ",
      "nickname": "ทรัพย์",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม3",
      "gender": "ชาย",
      "transport": "รถตู้รับส่ง",
      "phone": "0992745288",
      "social": "start_over_54",
      "smoke": "ไม่มี",
      "parent": "สันติพงษ์ ศรีคัชชะ",
      "parentphone": "0972640108",
      "parentphone2": "0992745288",
      "prevschool": "ไผ่แก้ววิทยา",
      "address_no": "319/32",
      "address_road": "",
      "address_subdistrict": "แปลงยาว",
      "address_district": "แปลงยาว",
      "address_zipcode": "24000",
      "needs_scholarship": "ยังไม่ตัดสินใจ",
      "parent_job": "รับจ้างทั่วไป",
      "parent_income": "10000-15000 บาท",
      "allowance": "100 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1z1Bz54iip7AWqVWuY_VQK-MijPj9cUWr",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020048",
      "fname": "ธีรเดช",
      "lname": "ทิพวรรณ์",
      "nickname": "โทพาส",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม3",
      "gender": "ชาย",
      "transport": "รถโดยสารสาธารณะ",
      "phone": "086-367-1858",
      "social": "Topaz Tippawan",
      "smoke": "ไม่มี",
      "parent": "นางสาว กิตติยาภรณ์ ทิพวรรณ์ (แม่)",
      "parentphone": "0982527331",
      "parentphone2": "0835840070 ตา ชื่อเอ๋",
      "prevschool": "โรงเรียน วัดสว่างอารมณ์",
      "address_no": "35/107 หมู่ 14",
      "address_road": "",
      "address_subdistrict": "คลองหลวงแพ่ง",
      "address_district": "เมืองฉะเชิงเทรา",
      "address_zipcode": "24000",
      "needs_scholarship": "ยังไม่ตัดสินใจ",
      "parent_job": "ทำงานโรงงาน",
      "parent_income": "15000-20000 บาท",
      "allowance": "170 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1A5t1GEygF-YVKoJtkQrTNvOnPcwJUZuA",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020057",
      "fname": "ศุภกร",
      "lname": "พรมทอง",
      "nickname": "บิ๊กซี",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม3",
      "gender": "ชาย",
      "transport": "รถมอเตอร์ไชล์ส่วนตัว",
      "phone": "0660811864",
      "social": "Bigcsaleng Promthong",
      "smoke": "บุหรี่",
      "parent": "สมาน พรมทอง",
      "parentphone": "0626499778",
      "parentphone2": "0626499778",
      "prevschool": "โรงเรียนดาราจรัส",
      "address_no": "59",
      "address_road": "ราษฎรอุทิศ",
      "address_subdistrict": "บองคล้า",
      "address_district": "บางคล้า",
      "address_zipcode": "24110",
      "needs_scholarship": "ไม่ต้องการ",
      "parent_job": "เจ้าของกิจการ",
      "parent_income": "10000-15000 บาท",
      "allowance": "100 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1Hu71olO2NEBHJNnwqOmzbQafkoZnrrgr",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020055",
      "fname": "วันณุวัฒน์",
      "lname": "ดำรงศรี",
      "nickname": "แบงค์",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม3",
      "gender": "ชาย",
      "transport": "รถไฟ",
      "phone": "0832489460",
      "social": "วันณุวัฒน์ ดำรงศรี",
      "smoke": "ไม่สูบ",
      "parent": "บุญนำ ดำรงศรี",
      "parentphone": "0924583762",
      "parentphone2": "0924583762",
      "prevschool": "เตรียมอุดศึกษาพัฒนาการฉะเชิงเทรา",
      "address_no": "58/2",
      "address_road": "คลองหลวงแพ่ง",
      "address_subdistrict": "คลองหลวงแพ่ง",
      "address_district": "เมืองฉะเชิงเทรา",
      "address_zipcode": "24000",
      "needs_scholarship": "ยังไม่ตัดสินใจ",
      "parent_job": "ทำงานโรงงาน",
      "parent_income": "10000-15000 บาท",
      "allowance": "200 บาท",
      "photo": "https://lh3.googleusercontent.com/d/10KGPZRz8FOSGx0iGC_6ggjGueHGiQ8M2",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020046",
      "fname": "ธนพัฒน์",
      "lname": "พละศรี",
      "nickname": "ไบทร์",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม3",
      "gender": "ชาย",
      "transport": "ผู้ปกครองมาส่ง",
      "phone": "0951392340",
      "social": "Thanaphat plasri",
      "smoke": "ไม่ดูดไม่กิน",
      "parent": "สุชาติ พละศรี (พ่อ)",
      "parentphone": "0653541631",
      "parentphone2": "0653541631 (น้า)",
      "prevschool": "หนองแหนวิทยา",
      "address_no": "30/1",
      "address_road": "",
      "address_subdistrict": "หนองแหน",
      "address_district": "พนมสารคาม",
      "address_zipcode": "24120",
      "needs_scholarship": "ไม่ต้องการ",
      "parent_job": "ค้าขาย",
      "parent_income": "15000-20000 บาท",
      "allowance": "100 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1lHXCY6W75lVTWLb6yRdnj_mfBCXXCw2l",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020052",
      "fname": "ปรินทร",
      "lname": "มาเจริญ",
      "nickname": "ปริ้น",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม3",
      "gender": "ชาย",
      "transport": "ผู้ปกครองมาส่ง",
      "phone": "06-5061-1125",
      "social": "IG p1prieiei",
      "smoke": "ไม่เคย",
      "parent": "ปัทมา มาเจริญ",
      "parentphone": "062-4645861",
      "parentphone2": "063-3522034",
      "prevschool": "โรงเรียนเทศบาล 1 วัดแหลมใต้(สุตสุนทร)",
      "address_no": "91/17",
      "address_road": "",
      "address_subdistrict": "บ้านไหม่",
      "address_district": "เมืองฉะเชิงเทรา",
      "address_zipcode": "24000",
      "needs_scholarship": "ยังไม่ตัดสินใจ",
      "parent_job": "รับจ้างทั่วไป",
      "parent_income": "10000-15000 บาท",
      "allowance": "100 บาท",
      "photo": "",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020041",
      "fname": "กรินทร์",
      "lname": "คงบุญญา",
      "nickname": "ปังปอนด์",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม3",
      "gender": "ชาย",
      "transport": "ผู้ปกครองมาส่ง",
      "phone": "0661520257",
      "social": "ปอม มี่",
      "smoke": "ไม่สูบไม่ดิ่ม",
      "parent": "วรรณพร อิศรางกูร ณ อยุธยา",
      "parentphone": "0828283772",
      "parentphone2": "0828283772",
      "prevschool": "ดาราสมุทร ฉะเชิงเทรา",
      "address_no": "27/1 ม.17",
      "address_road": "",
      "address_subdistrict": "คลองนครเนื่องเขต",
      "address_district": "เมือง",
      "address_zipcode": "24000",
      "needs_scholarship": "ไม่ต้องการ",
      "parent_job": "ทำงานโรงงาน",
      "parent_income": "20000-30000 บาท",
      "allowance": "150 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1t0h9z23nL-qBfyczJgWE19eHsL7FDA0k",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020059",
      "fname": "อัสนัย",
      "lname": "วันสตอน",
      "nickname": "เปา",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม3",
      "gender": "ชาย",
      "transport": "รถมอเตอร์ไชล์ส่วนตัว",
      "phone": "064752734",
      "social": "Pao_2553422",
      "smoke": "บุหรี่",
      "parent": "แสงดาว ตันโป้ย (แม่)",
      "parentphone": "099-1489640",
      "parentphone2": "099-1489640",
      "prevschool": "โรงเรียนวัดสัมปทวน",
      "address_no": "36/2",
      "address_road": "-",
      "address_subdistrict": "บางแก้ว",
      "address_district": "เมืองฉะเชิงเทรา",
      "address_zipcode": "24000",
      "needs_scholarship": "ยังไม่ตัดสินใจ",
      "parent_job": "ค้าขาย",
      "parent_income": "10000-15000 บาท",
      "allowance": "100 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1F2vTe1KtGRppVtFMX8gp18pbaGIcEE9l",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020045",
      "fname": "ถิรศักดิ์",
      "lname": "ชะฎาทอง",
      "nickname": "พีม",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม3",
      "gender": "ชาย",
      "transport": "รถโดยสารสาธารณะ",
      "phone": "0983069357",
      "social": "Thirasak Chadathiw",
      "smoke": "บุหรี่",
      "parent": "ขนิษฐา ทองคำพันธุ์",
      "parentphone": "0983069357",
      "parentphone2": "819368857",
      "prevschool": "โรงเรียน วัดสว่างอารมณ์",
      "address_no": "25/1",
      "address_road": "",
      "address_subdistrict": "ศาลาเเดง",
      "address_district": "บางน้ำเปรี้ยว",
      "address_zipcode": "25/1",
      "needs_scholarship": "ต้องการ",
      "parent_job": "ทำงานโรงงาน",
      "parent_income": "10000-15000 บาท",
      "allowance": "100 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1MBjwqOMO9cFVv0m0AjZbOPUxkHkN3Hyq",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020050",
      "fname": "นิติพงษ์",
      "lname": "สุนาวงษ์",
      "nickname": "ฟลุ๊ค",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม3",
      "gender": "ชาย",
      "transport": "รถมอเตอร์ไชล์ส่วนตัว",
      "phone": "0983458762",
      "social": "ig i5xqfluke",
      "smoke": ".",
      "parent": "จิราภรณ์ สุนาวงษ์",
      "parentphone": "0613709130",
      "parentphone2": "0613709130 พี่สาว ชื่อเฟิร์น",
      "prevschool": "เบญจมราชรังสฤษฎิ์2",
      "address_no": "82/1",
      "address_road": "-",
      "address_subdistrict": "เสม็ดใต้",
      "address_district": "บางคล้า",
      "address_zipcode": "24110",
      "needs_scholarship": "ยังไม่ตัดสินใจ",
      "parent_job": "ทำงานโรงงาน",
      "parent_income": "10000-15000 บาท",
      "allowance": "100 บาท",
      "photo": "",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020054",
      "fname": "ภูมินทร์",
      "lname": "ศรีมาลัย",
      "nickname": "ภูมินทร์",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม3",
      "gender": "ชาย",
      "transport": "รถโดยสารสาธารณะ",
      "phone": "0625951113",
      "social": "phumin_.7",
      "smoke": "ไม่มี",
      "parent": "นาย ธีรศักดิ์ ศรีมาลัย (พ่อ)",
      "parentphone": "0818612304",
      "parentphone2": "0818612304",
      "prevschool": "ไผ่แก้ววิทยา",
      "address_no": "249/63",
      "address_road": "",
      "address_subdistrict": "วังเย็น",
      "address_district": "แปลงยาว",
      "address_zipcode": "24190",
      "needs_scholarship": "ยังไม่ตัดสินใจ",
      "parent_job": "ทำงานโรงงาน",
      "parent_income": "15000-20000 บาท",
      "allowance": "150 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1vCZEhafM5R2zUmM2wethjGM2QD63R_Xn",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020049",
      "fname": "นันทิภาคย์",
      "lname": "ไชยดำ",
      "nickname": "ลีซอ",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม3",
      "gender": "ชาย",
      "transport": "รถมอเตอร์ไชล์ส่วนตัว",
      "phone": "0949304476",
      "social": "https://www.facebook.com/share/1DEEm95K5f/?mibextid=wwXIfr",
      "smoke": "บุหรี่",
      "parent": "นางสาวพรพรรณ สาริยะ",
      "parentphone": "0874292635",
      "parentphone2": "0874292635",
      "prevschool": "โรงเรียนดาราจรัส",
      "address_no": "14/22",
      "address_road": "-",
      "address_subdistrict": "วังเย็น",
      "address_district": "แปลงยาว",
      "address_zipcode": "24190",
      "needs_scholarship": "ไม่ต้องการ",
      "parent_job": "ทำงานโรงงาน",
      "parent_income": "20000-30000 บาท",
      "allowance": "100 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1aZMabTIXqhfBNeEDZdrwFWSr8F5_kUvv",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020053",
      "fname": "พงควินท์",
      "lname": "ฉิมวิเศษ",
      "nickname": "อีส",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม3",
      "gender": "ชาย",
      "transport": "รถโดยสารสาธารณะ",
      "phone": "0808308781",
      "social": "ไม่ยึดติด ไม่ผิดหวัง",
      "smoke": "ไม่ดูด",
      "parent": "นางจุฑารัตน์ เเดงยิ้ม (เเม่)",
      "parentphone": "0852783207",
      "parentphone2": "0861386196(ป้า)",
      "prevschool": "โรงเรียนดอนฉิมพลีพิทยาคม",
      "address_no": "19",
      "address_road": "",
      "address_subdistrict": "ดอนเกาะกา",
      "address_district": "บางน้ำเปรี้ยว",
      "address_zipcode": "24170",
      "needs_scholarship": "ต้องการ",
      "parent_job": "ทำงานโรงงาน",
      "parent_income": "ต่ำกว่า 10000 บาท",
      "allowance": "200 บาท",
      "photo": "https://lh3.googleusercontent.com/d/16xChf9KoSUhHwN_3Azan_pVP7Xd_Fzh9",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020043",
      "fname": "ชนัญญู",
      "lname": "ศรีสมวงศ์",
      "nickname": "เอิร์ท",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม3",
      "gender": "ชาย",
      "transport": "รถมอเตอร์ไชล์ส่วนตัว",
      "phone": "0942933340",
      "social": "annyx1718",
      "smoke": "เหล้า เบียร",
      "parent": "ยุพิน นินทนนท์",
      "parentphone": "0868292824",
      "parentphone2": "0980066759",
      "prevschool": "ดาราจรัส",
      "address_no": "62/18",
      "address_road": "-",
      "address_subdistrict": "หัวสำโรง",
      "address_district": "เเปลงยาว",
      "address_zipcode": "24190",
      "needs_scholarship": "ยังไม่ตัดสินใจ",
      "parent_job": "งานราชการ",
      "parent_income": "15000-20000 บาท",
      "allowance": "150 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1-k3gUIB8iRZdud6C1598_aO6s0b2uMUb",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020051",
      "fname": "ประกาศิต",
      "lname": "แสนหิน",
      "nickname": "โอชิ",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม3",
      "gender": "ชาย",
      "transport": "รถมอเตอร์ไชล์ส่วนตัว",
      "phone": "0623248661",
      "social": "Prakasit Saenhin",
      "smoke": "ไม่",
      "parent": "ประนอม แสนหิน (แม่)",
      "parentphone": "0879175639",
      "parentphone2": "0812682771 (พ่อ ชื่อหลอด)",
      "prevschool": "กศน.คลองจุกเฌอ",
      "address_no": "123/67",
      "address_road": "ถนน304พนมสารคาร-ฉะเชิงเทรา",
      "address_subdistrict": "บางไผ่",
      "address_district": "เมือง",
      "address_zipcode": "24000",
      "needs_scholarship": "ไม่ต้องการ",
      "parent_job": "ทำงานโรงงาน",
      "parent_income": "20000-30000 บาท",
      "allowance": "100 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1h9s4nOkOhusbmgc4HXXGJolsfSc8GMt0",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020056",
      "fname": "วีรภาพ",
      "lname": "พบบุญ",
      "nickname": "ฮา",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม3",
      "gender": "ชาย",
      "transport": "รถโดยสารสาธารณะ",
      "phone": "0969867374",
      "social": "วีรภาพ พบบุญ  ig หรือ เฟส",
      "smoke": "ฉันไม่เสพของมึนเมา",
      "parent": "ชิดชนก โมราวรรณ (แม่)",
      "parentphone": "0909479124",
      "parentphone2": "0909479124 (แม่ ชิดชนก)",
      "prevschool": "วัดสว่างอารมณ์",
      "address_no": "23/29",
      "address_road": "-",
      "address_subdistrict": "คลองหลวงแพ่ง",
      "address_district": "เมืองจังหวัดฉะเชิงเทรา",
      "address_zipcode": "24000",
      "needs_scholarship": "ยังไม่ตัดสินใจ",
      "parent_job": "ทำงานโรงงาน",
      "parent_income": "15000-20000 บาท",
      "allowance": "150 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1udMh-HCN9PuOrtYW2BmU0URfUKneygxc",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020066",
      "fname": "ชินวัตร",
      "lname": "จุ่นเจริญ",
      "nickname": "แชมป์",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม4",
      "gender": "ชาย",
      "transport": "รถตู้รับส่ง",
      "phone": "0660652044",
      "social": "Facebook",
      "smoke": "ไม่ครับ",
      "parent": "ปฎิมาพร จุ่นเจริญ",
      "parentphone": "0950498947",
      "parentphone2": "0950498947เบอร์แม่",
      "prevschool": "โรงเรียนวัดโสธรวรารามวรวิหาร",
      "address_no": "88",
      "address_road": "-",
      "address_subdistrict": "วังตะเคียน",
      "address_district": "เมืองฉะเชิงเทรา",
      "address_zipcode": "24000",
      "needs_scholarship": "ไม่ต้องการ",
      "parent_job": "ทำงานโรงงาน",
      "parent_income": "10000-15000 บาท",
      "allowance": "150 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1ItxOQr4mATvAokJ9K8b4VBQZb0Gg1Fc0",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020068",
      "fname": "ณัฐกรณ์",
      "lname": "สุดาเทพ",
      "nickname": "ตี๋",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม4",
      "gender": "ชาย",
      "transport": "รถโดยสารสาธารณะ",
      "phone": "0637596051",
      "social": "0637596051",
      "smoke": "ไม่มี",
      "parent": "เกตนภา  แซ่ลิ้ม",
      "parentphone": "0637596051",
      "parentphone2": "0637596051",
      "prevschool": "วัดอ่าวช้างไล่",
      "address_no": "54/",
      "address_road": "หัวสำโรง",
      "address_subdistrict": "หัวสำโรง",
      "address_district": "แปลงยาว",
      "address_zipcode": "24190",
      "needs_scholarship": "ยังไม่ตัดสินใจ",
      "parent_job": "ทำงานโรงงาน",
      "parent_income": "15000-20000 บาท",
      "allowance": "150 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1GEy0dBUiheoBHRtKKBsSVs14kBcoz5X8",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020071",
      "fname": "ปรมินทร์",
      "lname": "สาวสวย",
      "nickname": "เติ้ล",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม4",
      "gender": "ชาย",
      "transport": "รถไฟ",
      "phone": "098541532",
      "social": "Poramin saosuai",
      "smoke": "น้ำกระท่อม",
      "parent": "นายเจนสาวสวย (พ่อ)",
      "parentphone": "0863187233",
      "parentphone2": "0863187233",
      "prevschool": "เตรียมอุดมศึกษาเปร็งวิสุทธบดี",
      "address_no": "14/2",
      "address_road": "ไม่มี",
      "address_subdistrict": "เปร็ง",
      "address_district": "เมือง",
      "address_zipcode": "24000",
      "needs_scholarship": "ยังไม่ตัดสินใจ",
      "parent_job": "เกี่ยวกับติดตั้งกล้องวงจร",
      "parent_income": "10000-15000 บาท",
      "allowance": "150 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1TvdBql29GGN9krtWRvvYVT_rlJbsIJc1",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020077",
      "fname": "อนุชิต",
      "lname": "คะระนันท์",
      "nickname": "โต๊ด",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม4",
      "gender": "ชาย",
      "transport": "รถตู้รับส่ง",
      "phone": "0812784949",
      "social": "นคร นอนยาว",
      "smoke": "บุหรี่, เหล้า เบียร",
      "parent": "ประนอม เเสนสุข",
      "parentphone": "0814372525",
      "parentphone2": "0812784949",
      "prevschool": "โรงเรียนเซนต์เดินโทนี",
      "address_no": "21/1",
      "address_road": "ไม่มี",
      "address_subdistrict": "ดอนเกาะกา",
      "address_district": "บางน้ำเปรี้ยว",
      "address_zipcode": "24170",
      "needs_scholarship": "ยังไม่ตัดสินใจ",
      "parent_job": "งานราชการ",
      "parent_income": "15000-20000 บาท",
      "allowance": "150 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1BFQWjyQD6SYQk6QyDELmgFBH-N4W846M",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020062",
      "fname": "กิตติพงษ์",
      "lname": "แพวกิ่ง",
      "nickname": "ท็อป",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม4",
      "gender": "ชาย",
      "transport": "รถสองแถว",
      "phone": "0612207613",
      "social": "กิตติพงษ์ ฯ.",
      "smoke": "ไม่ครับ",
      "parent": "นายชาญชัย แพวกิ่ง  เป็นพ่อ",
      "parentphone": "0930955201",
      "parentphone2": "0930955201 (พ่อ)",
      "prevschool": "โรงเรียนวัดจุกเฌอ",
      "address_no": "53/12หมู่4",
      "address_road": "-",
      "address_subdistrict": "คลองจุกเฌอ",
      "address_district": "อำเภอเมือง",
      "address_zipcode": "24000",
      "needs_scholarship": "ยังไม่ตัดสินใจ",
      "parent_job": "รับจ้างทั่วไป",
      "parent_income": "10000-15000 บาท",
      "allowance": "150 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1Q8KcZi_BmCGYEAO2r_JQwRivFvMQzFzy",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020065",
      "fname": "ชัชวาล",
      "lname": "เหลือเริ่มวงศ์",
      "nickname": "นนท์",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม4",
      "gender": "ชาย",
      "transport": "รถตู้รับส่ง",
      "phone": "0995351548",
      "social": "ig.nn._00088",
      "smoke": "บุหรี่, น้ำกระท่อม",
      "parent": "นาง เนตรดาว ซิ้มจี๋",
      "parentphone": "0875502234",
      "parentphone2": "0875502234",
      "prevschool": "กศน.",
      "address_no": "74/4",
      "address_road": "ซอยสีโสภา4",
      "address_subdistrict": "บางสวน",
      "address_district": "บางคล้า",
      "address_zipcode": "24110",
      "needs_scholarship": "ไม่ต้องการ",
      "parent_job": "ค้าขาย",
      "parent_income": "20000-30000 บาท",
      "allowance": "200 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1lyal__hgo83SOB0Ny4tTuR-FiTIenGbo",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020073",
      "fname": "พรญาณี",
      "lname": "พรมการ",
      "nickname": "แนท",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม4",
      "gender": "หญิง",
      "transport": "รถมอเตอร์ไชล์ส่วนตัว",
      "phone": "0980034409",
      "social": "18_nat_11",
      "smoke": "บุหรี่, เหล้า เบียร",
      "parent": "แอน แดงเจริญ",
      "parentphone": "0969627786",
      "parentphone2": "0980034409",
      "prevschool": "อาชีวะศึกษาฉะเชิงเทรา",
      "address_no": "62/9 ม.2",
      "address_road": "",
      "address_subdistrict": "ต.เสม็ดใต้",
      "address_district": "บางคล้า",
      "address_zipcode": "24110",
      "needs_scholarship": "ไม่ต้องการ",
      "parent_job": "อาชีพเกษตรกรรม",
      "parent_income": "10000-15000 บาท",
      "allowance": "200 บาท",
      "photo": "",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020105",
      "fname": "พูลพิพัฒน์",
      "lname": "ทิมสุกใส",
      "nickname": "ปีเตอร์",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม4",
      "gender": "ชาย",
      "transport": "รถมอเตอร์ไชล์ส่วนตัว",
      "phone": "0945035939",
      "social": "Poolpipat Timsuksai",
      "smoke": "บุหรี่, กัญชา",
      "parent": "นายพีระพงศ์ ทิมสุกใส(พ่อ)",
      "parentphone": "0900835939",
      "parentphone2": "0900835939(แม่)",
      "prevschool": "โรงเรียนเซนต์หลุยส์ ฉะเชิงเทรา",
      "address_no": "172/2",
      "address_road": "วรรณยิ่ง",
      "address_subdistrict": "หน้าเมือง",
      "address_district": "เมือง",
      "address_zipcode": "24000",
      "needs_scholarship": "ยังไม่ตัดสินใจ",
      "parent_job": "รับจ้างทั่วไป",
      "parent_income": "10000-15000 บาท",
      "allowance": "100 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1K_gB4i7pUzQD5hzI9vy93n4H8MxpSfmW",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020070",
      "fname": "ปธานิน",
      "lname": "พันงาม",
      "nickname": "พอตเตอร์",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม4",
      "gender": "ชาย",
      "transport": "รถโดยสารสาธารณะ",
      "phone": "0945605001",
      "social": "patanin_pot",
      "smoke": "บุหรี่, เหล้า เบียร",
      "parent": "นางสาว ณฤดี ตันทะนันท์ (แม่)",
      "parentphone": "0877435736",
      "parentphone2": "0877435736 (แม่ ชื่อหวาน)",
      "prevschool": "โรงเรียนเบญจมราชรังสฤษฎิ์2",
      "address_no": "16/1",
      "address_road": "-",
      "address_subdistrict": "หัวสำโนง",
      "address_district": "แปลงยาว",
      "address_zipcode": "24190",
      "needs_scholarship": "ไม่ต้องการ",
      "parent_job": "ทำงานโรงงาน",
      "parent_income": "15000-20000 บาท",
      "allowance": "150 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1R_KMsb63kroZfLordn2Xg1k-SejfntRD",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020076",
      "fname": "อธีรเดช",
      "lname": "",
      "nickname": "เพชร",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม4",
      "gender": "ชาย",
      "transport": "ผู้ปกครองมาส่ง",
      "phone": "0963470100",
      "social": "-",
      "smoke": "ไม่สูบ",
      "parent": "บุญเรียม รุ่งแสง (แม่)",
      "parentphone": "0910490683",
      "parentphone2": "0910490683",
      "prevschool": "โรงเรียน ยางคำวิทยา",
      "address_no": "75",
      "address_road": "หน้าเมือง เอ็มอีอุทิศ1",
      "address_subdistrict": "หน้าเมือง",
      "address_district": "-",
      "address_zipcode": "-",
      "needs_scholarship": "ยังไม่ตัดสินใจ",
      "parent_job": "ค้าขาย",
      "parent_income": "แล้วแต่วัน",
      "allowance": "100 บาท",
      "photo": "",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020067",
      "fname": "ณฐนนท์",
      "lname": "โสภา",
      "nickname": "ไฟท์",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม4",
      "gender": "ชาย",
      "transport": "รถโดยสารสาธารณะ",
      "phone": "0928359725",
      "social": "Natanon Sopa",
      "smoke": "บุหรี่, น้ำกระท่อม",
      "parent": "รัฏา สุนาวงค์ (แม่)",
      "parentphone": "0912404821 (แม่)",
      "parentphone2": "0912404821(แม่)",
      "prevschool": "กศน.",
      "address_no": "84/1",
      "address_road": "",
      "address_subdistrict": "หัวสำโรง",
      "address_district": "แปลงยาว",
      "address_zipcode": "24190",
      "needs_scholarship": "ยังไม่ตัดสินใจ",
      "parent_job": "ทำงานโรงงาน",
      "parent_income": "10000-15000 บาท",
      "allowance": "200 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1hCkU4kJ7uZKcx0gFMndmfn1SRq9ZhTiv",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020074",
      "fname": "รัฐศาสตร์",
      "lname": "ยูซบ",
      "nickname": "มะดี",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม4",
      "gender": "ชาย",
      "transport": "มามอไซล์กับพี่ชายเรียน ป.ว.ส",
      "phone": "0824477782",
      "social": "Tee Ratthasat",
      "smoke": "บุหรี่",
      "parent": "พัชรินทร์ ยูซบ (เเม่)",
      "parentphone": "0944848892",
      "parentphone2": "0988311239 (พี่ชาย)",
      "prevschool": "ศาสนวิทยา",
      "address_no": "2/1 หมู่2",
      "address_road": "เทพราช",
      "address_subdistrict": "เกาะไร่",
      "address_district": "บ้านโพธิ์",
      "address_zipcode": "24140",
      "needs_scholarship": "ต้องการ",
      "parent_job": "ทำงานโรงงาน",
      "parent_income": "10000-15000 บาท",
      "allowance": "120 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1caRRR0gBD1FrV0T5AjHbTWuMNtlvpAEX",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020103",
      "fname": "ภาณุ",
      "lname": "เลี่ยวกุล",
      "nickname": "เลิฟ",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม4",
      "gender": "ชาย",
      "transport": "รถมอเตอร์ไชล์ส่วนตัว",
      "phone": "0956548835",
      "social": "IG _.pxa3nuq",
      "smoke": "ไม่สูบไม่ดื่ม",
      "parent": "นางจรีรัตน์ พ่วงแพ (แม่)",
      "parentphone": "096 737 2506",
      "parentphone2": "095 731 9423 (พ่อ ชื่อนนต์)",
      "prevschool": "โรงเรียนเทศบาล2พระยาศรีสุนทรโวหาร(น้อย อาจารยางกูร)",
      "address_no": "60 หมู่4",
      "address_road": "-",
      "address_subdistrict": "คลองเปรง",
      "address_district": "เมือง",
      "address_zipcode": "24000",
      "needs_scholarship": "ยังไม่ตัดสินใจ",
      "parent_job": "ทำงานโรงงาน",
      "parent_income": "15000-20000 บาท",
      "allowance": "200 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1axL77MCtpoV8xRZKHsrDYBtWpLi6-SwW",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020104",
      "fname": "ณัฐวุฒิ",
      "lname": "อายทอง",
      "nickname": "วัน",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม4",
      "gender": "ชาย",
      "transport": "รถโดยสารสาธารณะ",
      "phone": "0967192505",
      "social": "IGnattawut_soybad กับเฟลnattawut soybad",
      "smoke": "ไม่",
      "parent": "น.ส ไพรวัลย์ อุทธศรี",
      "parentphone": "0946109270",
      "parentphone2": "0946109270 แม่เตี้ย",
      "prevschool": "สมาคมสงเคราะห์วิทยา",
      "address_no": "344",
      "address_road": "มหาจักรพรรดิ์",
      "address_subdistrict": "หน้าเมือง",
      "address_district": "เมืองฉะเชิงเทรา",
      "address_zipcode": "24000",
      "needs_scholarship": "ต้องการ",
      "parent_job": "รับจ้างทั่วไป",
      "parent_income": "ต่ำกว่า 10000 บาท",
      "allowance": "ไม่รู้แล้วแต่แม่",
      "photo": "https://lh3.googleusercontent.com/d/1qPN5DeyG75XGpV5m_Pvlx-a8ha0TN-Nt",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "68201020061",
      "fname": "กศิดิษ",
      "lname": "รักซ้อน",
      "nickname": "สกาย",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม4",
      "gender": "ชาย",
      "transport": "รถโดยสารสาธารณะ",
      "phone": "0651145239",
      "social": "ksd151053",
      "smoke": "บุหรี่, เหล้า เบียร",
      "parent": "จรรยา อรุณรัมย์(แม่)",
      "parentphone": "0616234649",
      "parentphone2": "0946901694(พ่อ)",
      "prevschool": "เบญจมราชรังสฤษฎิ์1",
      "address_no": "46/4",
      "address_road": "วงแหวน",
      "address_subdistrict": "ท่าไขา",
      "address_district": "เมือง",
      "address_zipcode": "24000",
      "needs_scholarship": "ต้องการ",
      "parent_job": "รับจ้างทั่วไป",
      "parent_income": "10000-15000 บาท",
      "allowance": "100 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1FqSMuTOYa8N1Y4NwobwOuG_KaMDkofgw",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020063",
      "fname": "จิรันธนิน",
      "lname": "ทวีพงษ์",
      "nickname": "ออม",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม4",
      "gender": "ชาย",
      "transport": "รถโดยสารสาธารณะ",
      "phone": "0952503618",
      "social": "Chiranthanin Taweepong",
      "smoke": "บุหรี่",
      "parent": "นางสาวพลอยนิศา จันทร์ศรี (แม่)",
      "parentphone": "0611693063",
      "parentphone2": "0611693063 (แม่)",
      "prevschool": "โรงเรียนมารีวิทย์ศรีมโหสถ",
      "address_no": "20หมู่2",
      "address_road": "",
      "address_subdistrict": "โคกไทย",
      "address_district": "ศรีมโหสถ",
      "address_zipcode": "25190",
      "needs_scholarship": "ไม่ต้องการ",
      "parent_job": "รับจ้างทั่วไป",
      "parent_income": "15000-20000 บาท",
      "allowance": "มากกว่า 200 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1j_mVjEhvtkiobzxKan1MNvF7cyKGrfri",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020069",
      "fname": "ธนวัตน์",
      "lname": "สะหะมาน",
      "nickname": "อามิต",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม4",
      "gender": "ชาย",
      "transport": "ผู้ปกครองมาส่ง",
      "phone": "0840185662",
      "social": "amir____0703",
      "smoke": "บุหรี่",
      "parent": "นาง รุ่งอรุณ ประชา",
      "parentphone": "0801004630",
      "parentphone2": "0801004630",
      "prevschool": "โรงเรียน ผดุงอิสลาม",
      "address_no": "59/144",
      "address_road": "",
      "address_subdistrict": "บางพระ",
      "address_district": "เมืองฉะเชิงเทรา",
      "address_zipcode": "24000",
      "needs_scholarship": "ต้องการ",
      "parent_job": "ทำงานโรงงาน",
      "parent_income": "15000-20000 บาท",
      "allowance": "100 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1BSLBZIqH3cqmOZrvXqyitIb8Nmbe8zDb",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    },
    {
      "id": "69201020072",
      "fname": "ประพล",
      "lname": "ศรีใส",
      "nickname": "ปลาย",
      "level": "ปวช.",
      "year": "1",
      "room": "กลุ่ม4",
      "gender": "ชาย",
      "transport": "รถโดยสารสาธารณะ",
      "phone": "0841372831",
      "social": "Praphon. Stisai",
      "smoke": "บุหรี่",
      "parent": "รำไพ  นันกาสี",
      "parentphone": "0638283297",
      "parentphone2": "0638283297",
      "prevschool": "บางน้ำเปรี",
      "address_no": "44/3",
      "address_road": "9",
      "address_subdistrict": "บางน้ำเปรี้ยว",
      "address_district": "บางน้ำเปรี้ยว",
      "address_zipcode": "2115",
      "needs_scholarship": "ไม่ต้องการ",
      "parent_job": "รับจ้างทั่วไป",
      "parent_income": "15000-20000 บาท",
      "allowance": "มากกว่า 200 บาท",
      "photo": "https://lh3.googleusercontent.com/d/1BvsrJ6XELsCMMYvN7Yf3ekNKRR-DPK7Q",
      "status": "กำลังศึกษา",
      "risk_level": "",
      "risk_academic": "ปกติ",
      "risk_behavior": "ปกติ",
      "risk_family": "ปกติ",
      "risk_economic": "ปกติ",
      "risk_note": "",
      "internship_place": "",
      "internship_phone": ""
    }
  ];
}

// ── MOBILE FILTER CHIPS INTERACTION HANDLERS ──
function selectMobileLevel(level, year, event) {
  if (event) event.preventDefault();

  const chips = document.querySelectorAll('#mob-level-chips .filter-chip');
  chips.forEach(chip => chip.classList.remove('active'));
  
  if (event && event.currentTarget) {
    event.currentTarget.classList.add('active');
  } else {
    chips.forEach(chip => {
      const txt = chip.textContent.trim();
      if (level === '' && txt === 'ทั้งหมด') chip.classList.add('active');
      if (level === 'ปวช.' && txt === `ปวช. ${year}`) chip.classList.add('active');
      if (level === 'ปวส.' && txt === `ปวส. ${year}`) chip.classList.add('active');
    });
  }

  const fLvl = document.getElementById('filter-level');
  const fYr = document.getElementById('filter-year');
  if (fLvl && fYr) {
    fLvl.value = level;
    fYr.value = year; 
  }

  buildRoomFilter();

  const roomChips = document.querySelectorAll('#mob-room-chips .filter-chip');
  roomChips.forEach(chip => chip.classList.remove('active'));
  if (roomChips.length > 0) roomChips[0].classList.add('active');

  const fRm = document.getElementById('filter-room');
  if (fRm) fRm.value = '';

  currentPage = 1;
  renderStudents();
}

function selectMobileRoom(room, event) {
  if (event) event.preventDefault();

  const chips = document.querySelectorAll('#mob-room-chips .filter-chip');
  chips.forEach(chip => chip.classList.remove('active'));
  
  if (event && event.currentTarget) {
    event.currentTarget.classList.add('active');
  } else {
    chips.forEach(chip => {
      const txt = chip.textContent.trim();
      if (room === '' && txt === 'ทั้งหมด') chip.classList.add('active');
      if (room && txt === `กลุ่ม ${room}`) chip.classList.add('active');
    });
  }

  const fRm = document.getElementById('filter-room');
  if (fRm) {
    if (room === '') {
      fRm.value = '';
    } else {
      // กลไกแมปตัวเลขชิปในมือถือ (เช่น '1') เข้ากับตัวเลือกกลุ่มเรียนจริงในระบบ (เช่น 'กลุ่ม 1' หรือ 'กลุ่ม1')
      let matchedValue = '';
      for (let i = 0; i < fRm.options.length; i++) {
        const optVal = fRm.options[i].value;
        // สกัดดึงเฉพาะตัวเลขออกจากข้อความ
        const optNum = optVal.replace(/\D/g, '');
        if (optNum === String(room)) {
          matchedValue = optVal;
          break;
        }
      }
      
      if (matchedValue) {
        fRm.value = matchedValue;
      } else {
        // Fallback กรณีไม่พบตัวเลือกตรงเป๊ะ
        const fallbackVal = [...fRm.options].map(o => o.value).find(v => v.includes(room));
        fRm.value = fallbackVal || room;
      }
    }
  }

  currentPage = 1;
  renderStudents();
}

function editFromProfile() {
  if (!currentViewingId) return;
  const sId = currentViewingId;
  closeModal('profile-modal');
  setTimeout(() => {
    openEditModal(sId);
  }, 200);
}

/* ==========================================================================
   🔒 MODULE 2: SECURITY & AUTH MODULE (ระบบรักษาความปลอดภัยและการเข้าถึง)
   ========================================================================== */

// ── SECURITY & PASSWORD PROTECTION LOGIC ──

// Toggle visible text inside login password input
function toggleLoginPasswordVisible() {
  const passInput = document.getElementById('login-password');
  const eyeIcon = document.getElementById('login-eye-icon');
  if (passInput && eyeIcon) {
    if (passInput.type === 'password') {
      passInput.type = 'text';
      eyeIcon.className = 'fa-solid fa-eye';
    } else {
      passInput.type = 'password';
      eyeIcon.className = 'fa-solid fa-eye-slash';
    }
  }
}

// Process login attempt with SHA-256 validation
async function handleLogin(e) {
  if (e) e.preventDefault();
  
  const passwordInput = document.getElementById('login-password');
  const errorMsg = document.getElementById('login-error');
  const card = document.querySelector('.login-card');
  
  if (!passwordInput) return;
  
  const enteredPass = passwordInput.value.trim();
  const hashed = await sha256(enteredPass);
  
  if (hashed === AUTH_HASH) {
    // Save authentication state to session storage (closed when tab is closed)
    sessionStorage.setItem('cstc_auth', 'true');
    isAuthorized = true;
    
    // Animate and hide login screen
    const overlay = document.getElementById('login-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
    }
    
    // Reset login inputs
    passwordInput.value = '';
    if (errorMsg) errorMsg.classList.remove('visible');
    
    // Initialize full app data and render stats
    initApp();
    showToast('🔓 เข้าสู่ระบบเรียบร้อย ยินดีต้อนรับครับ', 'ok');
    logSystemActivity("LOGIN_SUCCESS", "", "เข้าสู่ระบบสำเร็จ");
  } else {
    // Show premium error styling and card shaking effect
    if (errorMsg) errorMsg.classList.add('visible');
    if (card) {
      card.classList.add('shake');
      setTimeout(() => {
        card.classList.remove('shake');
      }, 450);
    }
    passwordInput.value = '';
    passwordInput.focus();
    logSystemActivity("LOGIN_FAIL", "", "ความพยายามเข้าสู่ระบบไม่ถูกต้อง");
  }
}

// Log out and completely reload environment to wipe out sensitive memory
function handleLogout() {
  sessionStorage.removeItem('cstc_auth');
  isAuthorized = false;
  DB = [];
  
  showToast('🔒 ออกจากระบบสำเร็จ กำลังรีเซ็ตหน่วยความจำ...', 'ok');
  logSystemActivity("LOGOUT", "", "ออกจากระบบ");
  
  setTimeout(() => {
    window.location.reload();
  }, 800);
}

// Utility to calculate SHA-256 hex string using browser-native subtle crypto
/* ==========================================================================
   💾 MODULE 4: LOCAL CACHE & SYNC CONTROLLER (ระบบหน่วยความจำสำรองและการซิงค์สด)
   ========================================================================== */

// ── REAL-TIME CLOUD DATABASE STORAGE INTEGRATIONS ──

// Load database from cloud (Google Sheets Apps Script API)
// Load database from Supabase Cloud
async function loadDatabaseOnline() {
  try {
    updateSyncStatus('syncing');
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/students?select=*&order=room,fname`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const cloudData = await response.json();
    
    if (cloudData && Array.isArray(cloudData)) {
      // ดึงข้อมูลตรงๆ จากโครงสร้าง Supabase
      const parsedDB = cloudData.map(row => {
        const student = {};
        FIELDS.forEach(f => {
          student[f.k] = row[f.k] !== undefined && row[f.k] !== null ? String(row[f.k]).trim() : '';
        });
        
        if (student.photo) {
          student.photo = normalizeDriveUrl(student.photo);
        }
        
        // ฟันธงฟิลด์พื้นฐาน
        if (!student.level) student.level = student.id.startsWith('6') ? 'ปวช.' : 'ปวส.';
        if (!student.year) student.year = '1';
        if (!student.status) student.status = 'กำลังศึกษา';
        
        return student;
      });
      
      if (parsedDB.length > 0) {
        DB = parsedDB;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DB));
        
        if (typeof applyHardPhotoInjection === 'function') {
          applyHardPhotoInjection();
        }
        
        updateSyncStatus('online');
        logSystemActivity("SYNC_BACKGROUND", "", `ดึงประวัติสดสำเร็จ โหลดข้อมูลนักเรียน ${parsedDB.length} คน`);
        return true;
      }
    }
  } catch (err) {
    console.error('Supabase load failed:', err);
    logSystemActivity("SYNC_BACKGROUND_FAIL", "", `ดึงประวัติสดล้มเหลว: ${err.message || err}`);
  }
  return false;
}

// Send single student update request to Supabase (UPSERT)
async function saveToCloud(student) {
  const editIdVal = document.getElementById('f-edit-id').value;
  const oldId = editIdVal || student.id;
  
  try {
    updateSyncStatus('syncing');
    
    // [v12.9 อัปเดตรหัสคลาวด์] กรณีรหัสเปลี่ยนไป (Primary Key เปลี่ยน)
    // ลบระเบียนเดิมออกก่อนป้องกันข้อมูลขยะค้างในระบบ
    if (oldId && String(oldId) !== String(student.id)) {
      await fetch(`${SUPABASE_URL}/rest/v1/students?id=eq.${oldId}`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      logSystemActivity("DELETE_OLD_ID", oldId, `ลบระเบียนรหัสเดิมเนื่องจากมีการแก้ไขรหัสเป็น ${student.id}`);
    }
    
    // สร้าง payload
    const payload = {};
    FIELDS.forEach(f => {
      payload[f.k] = student[f.k];
    });
    payload.updated_at = new Date().toISOString();
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/students`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=representation'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    showToast('🟢 บันทึกและซิงค์ข้อมูล Supabase สำเร็จ!', 'ok');
    updateSyncStatus('online');
    logSystemActivity("SAVE_STUDENT", student.id, `บันทึกประวัตินักเรียนคุณ ${student.fname} ขึ้น Supabase`);
  } catch (err) {
    console.error('Failed to sync to Supabase:', err);
    showToast('⚠️ ออฟไลน์: ข้อมูลได้รับการบันทึกในเครื่องเรียบร้อยแล้ว', 'err');
    updateSyncStatus('offline');
    logSystemActivity("SAVE_STUDENT_FAIL", student.id, `ส่งขึ้นคลาวด์ล้มเหลว: ${err.message || err}`);
  }
}

// Send delete student request to Supabase
async function deleteFromCloud(studentId) {
  try {
    updateSyncStatus('syncing');
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/students?id=eq.${studentId}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    showToast('🗑️ ลบประวัตินักเรียนออกจาก Supabase สำเร็จ!', 'ok');
    updateSyncStatus('online');
    logSystemActivity("DELETE_STUDENT", studentId, "ส่งคำสั่งลบประวัตินักเรียนไปบนคลาวด์สำเร็จ");
  } catch (err) {
    console.error('Failed to delete from Supabase:', err);
    showToast('⚠️ ไม่สามารถสั่งลบออนไลน์ได้ ข้อมูลจะอัปเดตเมื่อเชื่อมต่อเน็ตอีกครั้ง', 'err');
    updateSyncStatus('offline');
    logSystemActivity("DELETE_STUDENT_FAIL", studentId, `สั่งลบบนคลาวด์ล้มเหลว: ${err.message || err}`);
  }
}

// Silent Background Cloud Synchronization Engine (Silent Auto-Sync)
async function syncDatabaseBackground() {
  if (!isAuthorized) return;
  
  const addModal = document.getElementById('add-modal');
  const riskModal = document.getElementById('risk-modal');
  if ((addModal && addModal.classList.contains('active')) || (riskModal && riskModal.classList.contains('active'))) {
    console.log('Background Sync deferred: User is actively editing a form.');
    return;
  }
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/students?select=*`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    
    if (!response.ok) throw new Error('Network response was not ok');
    
    const cloudData = await response.json();
    
    if (cloudData && Array.isArray(cloudData)) {
      const parsedDB = cloudData.map(row => {
        const student = {};
        FIELDS.forEach(f => {
          student[f.k] = row[f.k] !== undefined && row[f.k] !== null ? String(row[f.k]).trim() : '';
        });
        
        if (student.photo) {
          student.photo = normalizeDriveUrl(student.photo);
        }
        
        if (!student.level) student.level = student.id.startsWith('6') ? 'ปวช.' : 'ปวส.';
        if (!student.year) student.year = '1';
        if (!student.status) student.status = 'กำลังศึกษา';
        
        return student;
      });
      
      const isDifferent = JSON.stringify(DB) !== JSON.stringify(parsedDB);
      
      if (isDifferent && parsedDB.length > 0) {
        console.log('Background Sync: Changes detected on Supabase. Updating Local Database...');
        DB = parsedDB;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DB));
        
        if (typeof applyHardPhotoInjection === 'function') {
          applyHardPhotoInjection();
        }
        
        buildRoomFilter();
        updateDashboard();
        updateHeaderCount();
        
        const activePage = document.querySelector('.page.active') ? document.querySelector('.page.active').id : 'page-dashboard';
        if (activePage === 'page-students') renderStudents();
        else if (activePage === 'page-search') quickSearch();
        
        showToast('🔄 อัปเดตรายชื่อนักเรียนเป็นปัจจุบันจากคลาวด์แล้ว!', 'ok');
        updateSyncStatus('online');
      } else {
        updateSyncStatus('online');
      }
    }
  } catch (err) {
    console.error('Silent Background Sync failed:', err);
    updateSyncStatus('offline');
  }
}

// Start Always-Up-To-Date Synchronization Engine (Focus + Polling)
function startAlwaysUpToDateEngine() {
  window.removeEventListener('focus', syncDatabaseBackground);
  window.addEventListener('focus', syncDatabaseBackground);
  
  if (window.backgroundSyncInterval) {
    clearInterval(window.backgroundSyncInterval);
  }
  window.backgroundSyncInterval = setInterval(syncDatabaseBackground, 60000);
  
  console.log('🚀 Real-time Supabase Cloud Engine started successfully!');
}

// Save cloud settings (Unused in Supabase mode since it is pre-configured, kept for backward compatibility)
function saveCloudConfig() {
  localStorage.setItem(CLOUD_KEY, SUPABASE_URL);
  updateSyncStatus('online');
}

// Update status text on Settings panel & Data Hub Center
function updateSyncStatus(status) {
  const syncStatusEl = document.getElementById('sync-status');
  const centerStatusEl = document.getElementById('cloud-center-status');
  const statusTextEl = document.getElementById('cloud-status-text');
  const countEl = document.getElementById('cloud-student-count');
  
  if (countEl && DB) {
    countEl.textContent = `${DB.length} คน`;
  }
  
  if (status === 'online') {
    if (syncStatusEl) {
      syncStatusEl.className = 'sync-status-pill online';
      syncStatusEl.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> <span>ซิงค์สด</span>';
      syncStatusEl.title = 'เชื่อมต่อฐานข้อมูลคลาวด์ Supabase สำเร็จ ข้อมูลจะได้รับการซิงค์แบบเรียลไทม์';
    }
    
    if (centerStatusEl) {
      centerStatusEl.className = 'badge b-green';
      centerStatusEl.innerHTML = '<i class="fa-solid fa-cloud"></i> เชื่อมต่อแล้ว';
    }
    
    if (statusTextEl) {
      statusTextEl.innerHTML = '🟢 เชื่อมต่อ: <strong>ฐานข้อมูลคลาวด์ Supabase (ซิงค์สดออนไลน์)</strong>';
      statusTextEl.style.color = '#34d399';
    }
  } else if (status === 'syncing') {
    if (syncStatusEl) {
      syncStatusEl.className = 'sync-status-pill syncing';
      syncStatusEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>กำลังซิงค์...</span>';
    }
    
    if (centerStatusEl) {
      centerStatusEl.className = 'badge b-yellow';
      centerStatusEl.innerHTML = '<i class="fa-solid fa-arrows-spin fa-spin"></i> กำลังซิงค์...';
    }
    
    if (statusTextEl) {
      statusTextEl.innerHTML = '🟡 กำลังประมวลผล: <strong>กำลังติดต่อฐานข้อมูล Supabase...</strong>';
      statusTextEl.style.color = '#fbbf24';
    }
  } else { // offline
    if (syncStatusEl) {
      syncStatusEl.className = 'sync-status-pill offline';
      syncStatusEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> <span>ออฟไลน์</span>';
      syncStatusEl.title = 'ไม่พบการเชื่อมต่อกับ Supabase ระบบใช้ฐานข้อมูลสำรองภายในเครื่อง';
    }
    
    if (centerStatusEl) {
      centerStatusEl.className = 'badge b-red';
      centerStatusEl.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> ออฟไลน์';
    }
    
    if (statusTextEl) {
      statusTextEl.innerHTML = '🔴 ผิดพลาด: <strong>ออฟไลน์ (ใช้ LocalStorage สำรองภายในเครื่อง)</strong>';
      statusTextEl.style.color = '#f87171';
    }
  }
}

// Update status text on Settings panel (Compatibility)
function updateCloudStatusUI() {
  const isOnline = document.getElementById('sync-status') && document.getElementById('sync-status').classList.contains('online');
  updateSyncStatus(isOnline ? 'online' : 'offline');
}

// Test cloud API connection manually
async function testCloudConnection() {
  const testBtn = document.getElementById('cloud-test-btn');
  if (testBtn) {
    testBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังตรวจสอบ...';
    testBtn.disabled = true;
  }
  
  showToast('🔍 กำลังทดสอบการเชื่อมต่อกับ Supabase Cloud...', 'ok');
  updateSyncStatus('syncing');
  
  try {
    const startTime = Date.now();
    const response = await fetch(`${SUPABASE_URL}/rest/v1/students?select=id`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const duration = Date.now() - startTime;
    
    showToast(`🟢 เชื่อมต่อ Supabase สำเร็จ! (ความเร็ว: ${duration}ms) พบนักเรียน ${data.length} คน`, "ok");
    logSystemActivity("CLOUD_TEST_SUCCESS", "", `ทดสอบเชื่อมต่อ Supabase สำเร็จ ในเวลา ${duration}ms พบ ${data.length} รายการ`);
    
    updateSyncStatus('online');
    initApp();
  } catch (err) {
    console.error(err);
    showToast('❌ การทดสอบล้มเหลว: ไม่สามารถติดต่อฐานข้อมูลได้ หรือยังไม่ได้สร้างตาราง students', 'err');
    updateSyncStatus('offline');
    logSystemActivity("CLOUD_TEST_FAIL", "", `ทดสอบเชื่อมต่อ Supabase ล้มเหลว: ${err.message || err}`);
  } finally {
    if (testBtn) {
      testBtn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> บังคับรีเฟรชซิงค์สด';
      testBtn.disabled = false;
    }
  }
}

async function sha256(message) {
  if (window.crypto && window.crypto.subtle) {
    try {
      const msgBuffer = new TextEncoder().encode(message);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex;
    } catch (e) {
      console.warn("crypto.subtle failed, falling back to pure JS", e);
    }
  }
  return pureJsSha256(message);
}

function pureJsSha256(str) {
  function rotateRight(n, x) {
    return (x >>> n) | (x << (32 - n));
  }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const result = [];
  const words = [];
  const ascii = str;
  let asciiLength = ascii.length * 8;
  const hash = [];
  const k = [];
  let primeCounter = 0;
  const isPrime = {};
  let candidate = 2;
  while (primeCounter < 64) {
    if (!isPrime[candidate]) {
      for (let i = candidate * candidate; i < 312; i += candidate) {
        isPrime[i] = true;
      }
      hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
      k[primeCounter] = (mathPow(candidate, 1/3) * maxWord) | 0;
      primeCounter++;
    }
    candidate++;
  }
  str += String.fromCharCode(0x80);
  while (str.length % 64 - 56) {
    str += String.fromCharCode(0);
  }
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    words[i >> 2] |= charCode << ((3 - i % 4) * 8);
  }
  words[words.length] = ((asciiLength / maxWord) | 0);
  words[words.length] = (asciiLength | 0);
  for (let j = 0; j < words.length; ) {
    const w = words.slice(j, j += 16);
    const oldHash = hash.slice(0);
    for (let i = 0; i < 64; i++) {
      const w16 = w[i - 16] || 0;
      const w7 = w[i - 7] || 0;
      const w15 = w[i - 15] || 0;
      const w2 = w[i - 2] || 0;
      const s0 = rotateRight(7, w15) ^ rotateRight(18, w15) ^ (w15 >>> 3);
      const s1 = rotateRight(17, w2) ^ rotateRight(19, w2) ^ (w2 >>> 10);
      const register = w[i] = (i < 16) ? (w[i] || 0) : (
        w16 + s0 + w7 + s1
      ) | 0;
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const S0 = rotateRight(2, hash[0]) ^ rotateRight(13, hash[0]) ^ rotateRight(22, hash[0]);
      const S1 = rotateRight(6, hash[4]) ^ rotateRight(11, hash[4]) ^ rotateRight(25, hash[4]);
      const temp1 = hash[7] + S1 + ch + k[i] + register;
      const temp2 = S0 + maj;
      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + temp1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (temp1 + temp2) | 0;
    }
    for (let i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }
  for (let i = 0; i < 8; i++) {
    let word = hash[i];
    if (word < 0) word += maxWord;
    result.push(word.toString(16).padStart(8, '0'));
  }
  return result.join('');
}

/* ==========================================================================
   🧬 MODULE 3: DUAL-SOURCE MERGE ENGINE (ตัวผสานกูเกิลชีตและรูปภาพอัจฉริยะ)
   ========================================================================== */

// ── FAST MOBILE-DASHBOARD SYNCRONIZATION ENGINE ──

// One-click background synchronization for mobile dashboard button
async function syncGoogleSheetsFast() {
  showToast('📥 กำลังดาวน์โหลดรายชื่อนักเรียนหลักจาก Google Sheets (100 กว่าคน)...', 'ok');
  
  // 1. ลิงก์ไฟล์รายชื่อนักเรียนและประวัติหลัก (Main Student Database) ของแผนกวิชา
  const mainSheetsUrl = 'https://docs.google.com/spreadsheets/d/1cGtBSblVKDqTyFCq8LUf0Yr6XpYLzHbPW_hKtG2i_tQ/edit?usp=sharing';
  const mainCsvUrl = `https://docs.google.com/spreadsheets/d/1cGtBSblVKDqTyFCq8LUf0Yr6XpYLzHbPW_hKtG2i_tQ/export?format=csv`;
  
  // 2. ลิงก์ไฟล์ส่งรูปภาพนักเรียน (Photos Database)
  const photoSheetsUrl = 'https://docs.google.com/spreadsheets/d/16ly2qP4dXzQBPQo3gKJTQY9-Pxp9bMGtgAOMwSamPgA/edit?usp=sharing';
  const photoCsvUrl = `https://docs.google.com/spreadsheets/d/16ly2qP4dXzQBPQo3gKJTQY9-Pxp9bMGtgAOMwSamPgA/export?format=csv`;
  
  // บันทึก URL หลักลงความจำเครื่องเพื่อป้องกันการสลับกลับ
  localStorage.setItem('cstc_sheets_url', mainSheetsUrl);
  localStorage.setItem('cstc_photo_sheets_url', photoSheetsUrl);
  
  const sheetsUrlInput = document.getElementById('sheets-url');
  if (sheetsUrlInput) sheetsUrlInput.value = mainSheetsUrl;
  
  const photoSheetsUrlInput = document.getElementById('photo-sheets-url');
  if (photoSheetsUrlInput) photoSheetsUrlInput.value = photoSheetsUrl;

  // ขั้นที่ 1: ดึงรายชื่อประวัตินักเรียนหลักทั้งหมด (100 กว่าคน)
  Papa.parse(mainCsvUrl, {
    download: true,
    header: false, // ใช้ false เพื่อแก้ปัญหาชื่อคอลัมน์ซ้ำซ้อนพัง
    skipEmptyLines: true,
    complete: function(results) {
      if (results.data && results.data.length > 0) {
        const rows = results.data;
        const headers = rows[0]; // แถวหัวข้อคอลัมน์
        
        // ตัวแปรค้นหาดัชนีคอลัมน์ระบบ
        let idColIdx = -1;
        let fnameColIdx = -1;
        let lnameColIdx = -1;
        let nicknameColIdx = -1;
        let levelColIdx = -1;
        let yearColIdx = -1;
        let roomColIdx = -1;
        let phoneColIdx = -1;
        let socialColIdx = -1;
        let parentColIdx = -1;
        let parentPhoneColIdx = -1;
        let parentPhone2ColIdx = -1;
        let prevSchoolColIdx = -1;
        let shirtColIdx = -1;
        let healthColIdx = -1;
        let transportColIdx = -1;
        let allowanceColIdx = -1;
        let smokeColIdx = -1;
        let internshipPlaceColIdx = -1;
        let internshipPhoneColIdx = -1;
        let riskLevelColIdx = -1;
        let riskAcademicColIdx = -1;
        let riskBehaviorColIdx = -1;
        let riskFamilyColIdx = -1;
        let riskEconomicColIdx = -1;
        let riskNoteColIdx = -1;
        
        // คำสำคัญคอลัมน์ประวัติหลัก
        const MAP_PATTERNS = {
          id: ['รหัสประจำตัวนักเรียนนักศึกษา', 'รหัสประจำตัวนักเรียน', 'รหัสประจำตัว', 'รหัสนักเรียน', 'รหัส'],
          fname: ['ชื่อนาม-นามสกุล', 'ชื่อ-นามสกุล', 'ชื่อจริง', 'ชื่อ', 'ชื่อผู้เรียน'],
          lname: ['ชื่อนาม-นามสกุล', 'ชื่อ-นามสกุล', 'นามสกุล', 'สกุล'],
          nickname: ['ชื่อเล่น'],
          gender: ['เพศ'],
          level: ['ระดับชั้นปี', 'ระดับชั้น', 'ระดับการศึกษา', 'ระดับ'],
          year: ['ชั้นปี', 'ชั้นปีที่', 'ปี'],
          phone: ['เบอร์โทรศัพท์มือถือ ของนักเรียน', 'เบอร์โทรนักเรียน', 'เบอร์โทรศัพท์นักเรียน', 'เบอร์โทร', 'โทรศัพท์'],
          social: ['ข้อมูลการติดต่ออื่นๆ IG หรือ Facebook', 'ช่องทางโซเชียล', 'social', 'ig', 'facebook', 'line'],
          parent: ['ชื่อ-นามสกุล ผู้ปกครอง', 'ชื่อผู้ปกครอง', 'ผู้ปกครอง'],
          parentphone: ['เบอร์โทรผู้ปกครอง', 'เบอร์โทรศัพท์ผู้ปกครอง'],
          parentphone2: ['เบอร์ฉุกเฉิน', 'เบอร์โทรศัพท์มือถือ ของผู้ปกครอง (กรณีฉุกเฉิน)'],
          prevschool: ['สถานศึกษาเดิม', 'สถานศึกษาเดิมที่นักเรียนจบมา'],
          shirt: ['ไซส์เสื้อกิจกรรม'],
          health: ['ข้อมูลสุขภาพ/โรคประจำตัว'],
          transport: ['การเดินทางมาเรียน', 'นักเรียนเดินทางมาวิทยาลัยอย่างไร'],
          allowance: ['เงินได้รับมาเรียนต่อวัน', 'นักเรียนได้เงินมากินวันละกี่บาท'],
          smoke: ['พฤติกรรมเสี่ยงดื่ม/สูบ', 'ดิ่มหรือสูบไหม'],
          internship_place: ['สถานที่ฝึกงาน / สหกิจศึกษา'],
          internship_phone: ['เบอร์โทรสถานที่ฝึกงาน'],
          address_no: ['บ้านเลขที่'],
          address_road: ['ถนน'],
          address_subdistrict: ['ตำบล'],
          address_district: ['อำเภอ'],
          address_zipcode: ['รหัสไปรษณีย์'],
          needs_scholarship: ['นักเรียนมีความต้องกาารทุนการศึกษาไหมในอนาคต', 'ความต้องการทุนการศึกษา', 'ต้องการทุน'],
          parent_job: ['อาชีพของผู้ปกครอง'],
          parent_income: ['รายได้โดยเฉลี่ยของครอบครัว', 'รายได้ครอบครัว'],
          risk_level: ['ระดับความเสี่ยงภาพรวม'],
          risk_academic: ['ความเสี่ยงด้านการเรียน'],
          risk_behavior: ['ความเสี่ยงด้านพฤติกรรม'],
          risk_family: ['ความเสี่ยงด้านครอบครัว'],
          risk_economic: ['ความเสี่ยงด้านเศรษฐกิจ'],
          risk_note: ['หมายเหตุ / แผนช่วยเหลือ']
        };
        
        headers.forEach((h, idx) => {
          const cleanH = String(h || '').trim().toLowerCase();
          if (!cleanH) return;
          
          if (MAP_PATTERNS.id.some(p => cleanH.includes(p.toLowerCase()))) {
            if (idColIdx === -1) idColIdx = idx;
          }
          if (MAP_PATTERNS.fname.some(p => cleanH.includes(p.toLowerCase()))) {
            if (fnameColIdx === -1) fnameColIdx = idx;
          }
          if (MAP_PATTERNS.lname.some(p => cleanH.includes(p.toLowerCase()))) {
            if (lnameColIdx === -1) lnameColIdx = idx;
          }
          if (MAP_PATTERNS.nickname.some(p => cleanH.includes(p.toLowerCase()))) {
            if (nicknameColIdx === -1) nicknameColIdx = idx;
          }
          if (MAP_PATTERNS.gender.some(p => cleanH.includes(p.toLowerCase()))) {
            if (genderColIdx === -1) genderColIdx = idx;
          }
          if (MAP_PATTERNS.level.some(p => cleanH.includes(p.toLowerCase()))) {
            if (levelColIdx === -1) levelColIdx = idx;
          }
          if (MAP_PATTERNS.year.some(p => cleanH.includes(p.toLowerCase()))) {
            if (yearColIdx === -1) yearColIdx = idx;
          }
          if (MAP_PATTERNS.phone.some(p => cleanH.includes(p.toLowerCase()))) {
            if (phoneColIdx === -1) phoneColIdx = idx;
          }
          if (MAP_PATTERNS.social.some(p => cleanH.includes(p.toLowerCase()))) {
            if (socialColIdx === -1) socialColIdx = idx;
          }
          if (MAP_PATTERNS.parent.some(p => cleanH.includes(p.toLowerCase()))) {
            if (parentColIdx === -1) parentColIdx = idx;
          }
          if (MAP_PATTERNS.parentphone.some(p => cleanH.includes(p.toLowerCase()))) {
            if (parentPhoneColIdx === -1) parentPhoneColIdx = idx;
          }
          if (MAP_PATTERNS.parentphone2.some(p => cleanH.includes(p.toLowerCase()))) {
            if (parentPhone2ColIdx === -1) parentPhone2ColIdx = idx;
          }
          if (MAP_PATTERNS.prevschool.some(p => cleanH.includes(p.toLowerCase()))) {
            if (prevSchoolColIdx === -1) prevSchoolColIdx = idx;
          }
          if (MAP_PATTERNS.shirt.some(p => cleanH.includes(p.toLowerCase()))) {
            if (shirtColIdx === -1) shirtColIdx = idx;
          }
          if (MAP_PATTERNS.health.some(p => cleanH.includes(p.toLowerCase()))) {
            if (healthColIdx === -1) healthColIdx = idx;
          }
          if (MAP_PATTERNS.transport.some(p => cleanH.includes(p.toLowerCase()))) {
            if (transportColIdx === -1) transportColIdx = idx;
          }
          if (MAP_PATTERNS.allowance.some(p => cleanH.includes(p.toLowerCase()))) {
            if (allowanceColIdx === -1) allowanceColIdx = idx;
          }
          if (MAP_PATTERNS.smoke.some(p => cleanH.includes(p.toLowerCase()))) {
            if (smokeColIdx === -1) smokeColIdx = idx;
          }
          if (MAP_PATTERNS.internship_place.some(p => cleanH.includes(p.toLowerCase()))) {
            if (internshipPlaceColIdx === -1) internshipPlaceColIdx = idx;
          }
          if (MAP_PATTERNS.internship_phone.some(p => cleanH.includes(p.toLowerCase()))) {
            if (internshipPhoneColIdx === -1) internshipPhoneColIdx = idx;
          }
          if (MAP_PATTERNS.address_no.some(p => cleanH.includes(p.toLowerCase()))) {
            if (addressNoColIdx === -1) addressNoColIdx = idx;
          }
          if (MAP_PATTERNS.address_road.some(p => cleanH.includes(p.toLowerCase()))) {
            if (addressRoadColIdx === -1) addressRoadColIdx = idx;
          }
          if (MAP_PATTERNS.address_subdistrict.some(p => cleanH.includes(p.toLowerCase()))) {
            if (addressSubdistrictColIdx === -1) addressSubdistrictColIdx = idx;
          }
          if (MAP_PATTERNS.address_district.some(p => cleanH.includes(p.toLowerCase()))) {
            if (addressDistrictColIdx === -1) addressDistrictColIdx = idx;
          }
          if (MAP_PATTERNS.address_zipcode.some(p => cleanH.includes(p.toLowerCase()))) {
            if (addressZipcodeColIdx === -1) addressZipcodeColIdx = idx;
          }
          if (MAP_PATTERNS.needs_scholarship.some(p => cleanH.includes(p.toLowerCase()))) {
            if (needsScholarshipColIdx === -1) needsScholarshipColIdx = idx;
          }
          if (MAP_PATTERNS.parent_job.some(p => cleanH.includes(p.toLowerCase()))) {
            if (parentJobColIdx === -1) parentJobColIdx = idx;
          }
          if (MAP_PATTERNS.parent_income.some(p => cleanH.includes(p.toLowerCase()))) {
            if (parentIncomeColIdx === -1) parentIncomeColIdx = idx;
          }
          if (MAP_PATTERNS.risk_level.some(p => cleanH.includes(p.toLowerCase()))) {
            if (riskLevelColIdx === -1) riskLevelColIdx = idx;
          }
          if (MAP_PATTERNS.risk_academic.some(p => cleanH.includes(p.toLowerCase()))) {
            if (riskAcademicColIdx === -1) riskAcademicColIdx = idx;
          }
          if (MAP_PATTERNS.risk_behavior.some(p => cleanH.includes(p.toLowerCase()))) {
            if (riskBehaviorColIdx === -1) riskBehaviorColIdx = idx;
          }
          if (MAP_PATTERNS.risk_family.some(p => cleanH.includes(p.toLowerCase()))) {
            if (riskFamilyColIdx === -1) riskFamilyColIdx = idx;
          }
          if (MAP_PATTERNS.risk_economic.some(p => cleanH.includes(p.toLowerCase()))) {
            if (riskEconomicColIdx === -1) riskEconomicColIdx = idx;
          }
          if (MAP_PATTERNS.risk_note.some(p => cleanH.includes(p.toLowerCase()))) {
            if (riskNoteColIdx === -1) riskNoteColIdx = idx;
          }
        });
        
        // ดึงดัชนีกลุ่มเรียน
        headers.forEach((h, idx) => {
          const cleanH = String(h || '').trim().toLowerCase();
          if (cleanH.includes('กลุ่มเรียน') || cleanH.includes('ห้อง') || cleanH.includes('กลุ่ม')) {
            roomColIdx = idx;
          }
        });
        
        let parsedStudents = [];
        
        for (let r = 1; r < rows.length; r++) {
          const row = rows[r];
          if (!row || row.length <= 1) continue;
          
          const student = {};
          
          student.id = idColIdx !== -1 ? String(row[idColIdx] || '').trim() : '';
          if (!student.id) continue; // ข้ามถ้ารหัสประจำตัวนักเรียนว่าง
          
          // ชื่อนาม-นามสกุล
          let fnameVal = '';
          let lnameVal = '';
          if (fnameColIdx !== -1) {
            const fullName = String(row[fnameColIdx] || '').trim();
            const cleanFullName = fullName.replace(/^(นาย|นางสาว|เด็กชาย|เด็กหญิง|นาง|ด\.ช\.|ด\.ญ\.)\s*/, '').trim();
            
            if (fnameColIdx === lnameColIdx) {
              const parts = cleanFullName.split(/\s+/);
              if (parts.length >= 2) {
                fnameVal = parts[0];
                lnameVal = parts.slice(1).join(' ');
              } else {
                fnameVal = cleanFullName;
                lnameVal = '';
              }
            } else {
              fnameVal = cleanFullName;
              lnameVal = lnameColIdx !== -1 ? String(row[lnameColIdx] || '').trim().replace(/^(นาย|นางสาว|เด็กชาย|เด็กหญิง|นาง|ด\.ช\.|ด\.ญ\.)\s*/, '').trim() : '';
            }
          }
          
          student.fname = fnameVal;
          student.lname = lnameVal;
          student.nickname = nicknameColIdx !== -1 ? String(row[nicknameColIdx] || '').trim() : '';
          student.gender = genderColIdx !== -1 ? String(row[genderColIdx] || '').trim() : '';
          student.level = levelColIdx !== -1 ? String(row[levelColIdx] || '').trim() : '';
          student.year = yearColIdx !== -1 ? String(row[yearColIdx] || '').trim() : '';
          student.room = roomColIdx !== -1 ? String(row[roomColIdx] || '').trim() : '';
          student.photo = ''; // รอเชื่อมโยงจากชีตย่อยที่สอง
          student.phone = phoneColIdx !== -1 ? String(row[phoneColIdx] || '').trim() : '';
          student.social = socialColIdx !== -1 ? String(row[socialColIdx] || '').trim() : '';
          student.parent = parentColIdx !== -1 ? String(row[parentColIdx] || '').trim() : '';
          student.parentphone = parentPhoneColIdx !== -1 ? String(row[parentPhoneColIdx] || '').trim() : '';
          student.parentphone2 = parentPhone2ColIdx !== -1 ? String(row[parentPhone2ColIdx] || '').trim() : '';
          student.prevschool = prevSchoolColIdx !== -1 ? String(row[prevSchoolColIdx] || '').trim() : '';
          student.shirt = shirtColIdx !== -1 ? String(row[shirtColIdx] || '').trim() : '';
          student.health = healthColIdx !== -1 ? String(row[healthColIdx] || '').trim() : '';
          student.transport = transportColIdx !== -1 ? String(row[transportColIdx] || '').trim() : '';
          student.allowance = allowanceColIdx !== -1 ? String(row[allowanceColIdx] || '').trim() : '';
          student.smoke = smokeColIdx !== -1 ? String(row[smokeColIdx] || '').trim() : '';
          student.internship_place = internshipPlaceColIdx !== -1 ? String(row[internshipPlaceColIdx] || '').trim() : '';
          student.internship_phone = internshipPhoneColIdx !== -1 ? String(row[internshipPhoneColIdx] || '').trim() : '';
          
          // ที่อยู่และข้อมูลครอบครัวเพิ่มเติม (v11)
          student.address_no = addressNoColIdx !== -1 ? String(row[addressNoColIdx] || '').trim() : '';
          student.address_road = addressRoadColIdx !== -1 ? String(row[addressRoadColIdx] || '').trim() : '';
          student.address_subdistrict = addressSubdistrictColIdx !== -1 ? String(row[addressSubdistrictColIdx] || '').trim() : '';
          student.address_district = addressDistrictColIdx !== -1 ? String(row[addressDistrictColIdx] || '').trim() : '';
          student.address_zipcode = addressZipcodeColIdx !== -1 ? String(row[addressZipcodeColIdx] || '').trim() : '';
          student.needs_scholarship = needsScholarshipColIdx !== -1 ? String(row[needsScholarshipColIdx] || '').trim() : '';
          student.parent_job = parentJobColIdx !== -1 ? String(row[parentJobColIdx] || '').trim() : '';
          student.parent_income = parentIncomeColIdx !== -1 ? String(row[parentIncomeColIdx] || '').trim() : '';

          student.risk_level = riskLevelColIdx !== -1 ? String(row[riskLevelColIdx] || '').trim() : '';
          student.risk_academic = riskAcademicColIdx !== -1 ? String(row[riskAcademicColIdx] || '').trim() : 'ปกติ';
          student.risk_behavior = riskBehaviorColIdx !== -1 ? String(row[riskBehaviorColIdx] || '').trim() : 'ปกติ';
          student.risk_family = riskFamilyColIdx !== -1 ? String(row[riskFamilyColIdx] || '').trim() : 'ปกติ';
          student.risk_economic = riskEconomicColIdx !== -1 ? String(row[riskEconomicColIdx] || '').trim() : 'ปกติ';
          student.risk_note = riskNoteColIdx !== -1 ? String(row[riskNoteColIdx] || '').trim() : '';
          
          student.status = 'กำลังศึกษา';
          
          // คลีนระดับการเรียน
          if (student.level) {
            const lvlClean = String(student.level).trim();
            const m = lvlClean.match(/^(ปวช|ปวส)/i);
            if (m) {
              student.level = m[1] === 'ปวช' ? 'ปวช.' : 'ปวส.';
            }
          }
          if (!student.level) {
            student.level = student.id.startsWith('6') ? 'ปวช.' : 'ปวส.';
          }
          
          // คลีนปีการศึกษา
          if (!student.year) {
            let parsedYear = '1';
            const idVal = student.id;
            if (idVal.length === 10 || idVal.length === 11) {
              const prefixStr = idVal.substring(0, 2);
              const prefixVal = parseInt(prefixStr, 10);
              if (!isNaN(prefixVal) && prefixVal >= 60 && prefixVal <= 69) {
                const calcYear = 69 - prefixVal + 1;
                if (calcYear >= 1 && calcYear <= 3) parsedYear = String(calcYear);
              }
            }
            student.year = parsedYear;
          } else {
            student.year = String(student.year).replace(/[^0-9]/g, '').trim();
          }
          
          // คลีนห้อง/กลุ่ม
          if (student.room) {
            student.room = student.room.replace(/^กลุ่ม\s*/, '').trim();
          }
          
          if (!student.risk_level) student.risk_level = 'ต่ำ';
          
          parsedStudents.push(student);
        }
        
        // ขั้นที่ 2: ดึงข้อมูลไฟล์รูปภาพนักเรียน (Photos File) และทำการจับคู่ข้ามไฟล์ในเบื้องหลัง
        showToast(`📸 ดึงประวัติ 100 กว่าคนเรียบร้อย กำลังซิงค์รูปภาพจาก Google Sheet อีกไฟล์...`, 'ok');
        
        Papa.parse(photoCsvUrl, {
          download: true,
          header: false,
          skipEmptyLines: true,
          complete: function(photoResults) {
            let matchedPhotosCount = 0;
            
            if (photoResults.data && photoResults.data.length > 0) {
              const photoRows = photoResults.data;
              const photoHeaders = photoRows[0];
              
              let photoIdColIdx = -1;
              let photoNameColIdx = -1;
              let photoLinkColIdx = -1;
              
              // ค้นหาหัวคอลัมน์ไฟล์รูปภาพ
              photoHeaders.forEach((h, idx) => {
                const cleanH = String(h || '').trim().toLowerCase();
                if (cleanH.includes('รหัส') || cleanH.includes('id')) {
                  if (photoIdColIdx === -1) photoIdColIdx = idx;
                }
                if (cleanH.includes('ชื่อ') || cleanH.includes('นามสกุล')) {
                  if (photoNameColIdx === -1) photoNameColIdx = idx;
                }
              });
              
              // ตรวจหาคอลัมน์ลิงก์รูปจริง
              for (let r = 1; r < Math.min(6, photoRows.length); r++) {
                if (!photoRows[r]) continue;
                photoRows[r].forEach((cell, idx) => {
                  const val = String(cell || '').trim();
                  if (val.includes('drive.google.com') || val.includes('lh3.googleusercontent.com') || val.startsWith('http')) {
                    photoLinkColIdx = idx;
                  }
                });
                if (photoLinkColIdx !== -1) break;
              }
              
              // หากล้องคอลัมน์รูปสำรอง
              if (photoLinkColIdx === -1) {
                photoLinkColIdx = photoHeaders.length - 2; // สุ่มคอลัมน์หลังๆ
              }
              
              // วนลูปรูปภาพมาผสานจับคู่กับนักเรียนหลัก
              for (let pr = 1; pr < photoRows.length; pr++) {
                const pRow = photoRows[pr];
                if (!pRow || pRow.length <= 1) continue;
                
                const rawPhotoId = photoIdColIdx !== -1 ? String(pRow[photoIdColIdx] || '').trim() : '';
                const rawPhotoName = photoNameColIdx !== -1 ? String(pRow[photoNameColIdx] || '').trim().replace(/^(นาย|นางสาว|เด็กชาย|เด็กหญิง|นาง)\s*/, '').replace(/\s+/g, '') : '';
                const rawPhotoUrl = photoLinkColIdx !== -1 ? String(pRow[photoLinkColIdx] || '').trim() : '';
                
                if (!rawPhotoUrl) continue;
                
                const directUrl = normalizeDriveUrl(rawPhotoUrl);
                
                // ค้นหาเด็กใน 100 กว่าคนนั้น
                parsedStudents.forEach(student => {
                  let isMatch = false;
                  
                  // 1. จับคู่ผ่านรหัสนักเรียน (ตรงกันหรือลงท้ายด้วย 3 ตัว)
                  if (rawPhotoId && student.id) {
                    const cleanPId = rawPhotoId.trim();
                    const cleanSId = String(student.id).trim();
                    
                    if (cleanSId === cleanPId) {
                      isMatch = true;
                    } else if (cleanPId.length >= 3 && cleanSId.endsWith(cleanPId)) {
                      isMatch = true;
                    } else if (cleanSId.length >= 3 && cleanPId.endsWith(cleanSId)) {
                      isMatch = true;
                    }
                  }
                  
                  // 2. จับคู่ผ่านชื่อ-นามสกุลแบบเป๊ะ (ตัดคำนำหน้าและช่องว่าง)
                  if (!isMatch && rawPhotoName) {
                    const stuCleanName = (String(student.fname || '') + String(student.lname || '')).replace(/^(นาย|นางสาว|เด็กชาย|เด็กหญิง|นาง|ด\.ช\.|ด\.ญ\.)\s*/, '').replace(/\s+/g, '');
                    if (stuCleanName.includes(rawPhotoName) || rawPhotoName.includes(stuCleanName)) {
                      isMatch = true;
                    }
                  }

                  // 3. จับคู่ผ่านความคล้ายคลึงของชื่อ (Levenshtein Distance) ป้องกันเด็กสะกดชื่อ/นามสกุลผิดพลาด (เช่น พุ่นิคม vs พุ่มนิคม)
                  if (!isMatch && rawPhotoName && student.fname) {
                    const stuCleanName = (String(student.fname || '') + String(student.lname || '')).replace(/^(นาย|นางสาว|เด็กชาย|เด็กหญิง|นาง|ด\.ช\.|ด\.ญ\.)\s*/, '').replace(/\s+/g, '');
                    const dist = getLevenshteinDistance(stuCleanName, rawPhotoName);
                    const maxLength = Math.max(stuCleanName.length, rawPhotoName.length);
                    const similarity = (maxLength - dist) / maxLength;
                    if (similarity >= 0.75) { // คล้ายกันเกิน 75% ถือเป็นคนเดียวกัน
                      isMatch = true;
                    }
                  }

                  // 4. จับคู่ผ่านชื่อจริงอย่างเดียว (หากมีความยาวอย่างน้อย 3 ตัว) และระดับชั้นตรงกัน (ป้องกันการซ้ำห้อง)
                  if (!isMatch && rawPhotoName && student.fname) {
                    const cleanSFname = String(student.fname).trim().replace(/^(นาย|นางสาว|เด็กชาย|เด็กหญิง|นาง|ด\.ช\.|ด\.ญ\.)\s*/, '').replace(/\s+/g, '');
                    const cleanPhotoFname = rawPhotoName.substring(0, cleanSFname.length);
                    if (cleanSFname.length >= 3 && cleanSFname === cleanPhotoFname) {
                      const pLvl = String(pRow[3] || '').toLowerCase();
                      const sLvl = String(student.level || '').toLowerCase();
                      const pLvlClean = pLvl.includes('ปวช') ? 'ปวช' : (pLvl.includes('ปวส') ? 'ปวส' : '');
                      const sLvlClean = sLvl.includes('ปวช') ? 'ปวช' : (sLvl.includes('ปวส') ? 'ปวส' : '');
                      
                      if (!pLvlClean || !sLvlClean || pLvlClean === sLvlClean) {
                        isMatch = true;
                      }
                    }
                  }
                  
                  if (isMatch) {
                    student.photo = directUrl;
                    
                    // 🌟 AUTOMATIC DATA REPAIR: ซ่อมแซมรหัสประจำตัวของนักเรียนที่ว่างเปล่าในระบบหลัก
                    if (!student.id && rawPhotoId) {
                      let repairedId = rawPhotoId.trim();
                      if (repairedId.length === 3) {
                        const lvl = String(student.level || '').trim();
                        if (lvl.includes('ปวช')) {
                          student.id = `69201020${repairedId}`;
                        } else if (lvl.includes('ปวส')) {
                          student.id = `69301110${repairedId}`;
                        } else {
                          student.id = repairedId;
                        }
                      } else {
                        student.id = repairedId;
                      }
                    }
                    
                    matchedPhotosCount++;
                  }
                });
              }
            }
            
            // ขั้นที่ 3: ผสานข้อมูล (Smart Merge) เข้า LocalStorage เพื่อคุ้มครองฟิลด์ประเมินครูที่เคยกรอก
            let addedCount = 0;
            let updatedCount = 0;
            
            parsedStudents.forEach(newStu => {
              const existingIdx = DB.findIndex(x => String(x.id).trim() === String(newStu.id).trim());
              
              if (existingIdx !== -1) {
                const ext = DB[existingIdx];
                
                if (newStu.fname) ext.fname = newStu.fname;
                if (newStu.lname) ext.lname = newStu.lname;
                if (newStu.nickname) ext.nickname = newStu.nickname;
                if (newStu.level) ext.level = newStu.level;
                if (newStu.year) ext.year = newStu.year;
                if (newStu.room) ext.room = newStu.room;
                if (newStu.status) ext.status = newStu.status;
                if (newStu.phone) ext.phone = newStu.phone;
                if (newStu.social) ext.social = newStu.social;
                if (newStu.photo) ext.photo = newStu.photo;
                if (newStu.parent) ext.parent = newStu.parent;
                if (newStu.parentphone) ext.parentphone = newStu.parentphone;
                if (newStu.parentphone2) ext.parentphone2 = newStu.parentphone2;
                if (newStu.prevschool) ext.prevschool = newStu.prevschool;
                if (newStu.shirt) ext.shirt = newStu.shirt;
                if (newStu.health) ext.health = newStu.health;
                if (newStu.transport) ext.transport = newStu.transport;
                if (newStu.allowance) ext.allowance = newStu.allowance;
                if (newStu.smoke) ext.smoke = newStu.smoke;
                
                // รักษาฟิลด์คัดกรองความเสี่ยง
                if (newStu.risk_level) ext.risk_level = newStu.risk_level;
                if (newStu.risk_academic) ext.risk_academic = newStu.risk_academic;
                if (newStu.risk_behavior) ext.risk_behavior = newStu.risk_behavior;
                if (newStu.risk_family) ext.risk_family = newStu.risk_family;
                if (newStu.risk_economic) ext.risk_economic = newStu.risk_economic;
                if (newStu.risk_note) ext.risk_note = newStu.risk_note;
                
                updatedCount++;
              } else {
                DB.push(newStu);
                addedCount++;
              }
            });
            
            saveDatabase();
            updateDashboard();
            updateHeaderCount();
            
            // รีเฟรชแผงควบคุมตามหน้าเพจ
            const activePage = document.querySelector('.page.active') ? document.querySelector('.page.active').id : 'page-dashboard';
            if (activePage === 'page-students') renderStudents();
            else if (activePage === 'page-search') quickSearch();
            
            showToast(`🎉 สำเร็จ! ดึงข้อมูลนักเรียนหลักเข้ามา ${parsedStudents.length} คน พร้อมตรวจจับซิงค์รูปถ่ายได้สำเร็จ ${matchedPhotosCount} คน!`, 'ok');
            logSystemActivity("SYNC_FAST_SUCCESS", "", `ซิงค์ด่วนเสร็จสิ้น ดึงข้อมูลหลัก ${parsedStudents.length} คน ซิงค์รูปภาพ ${matchedPhotosCount} คน`);
          }
        });
        
      } else {
        showToast('❌ โครงสร้างใน Google Sheets หลักว่างเปล่า', 'err');
        logSystemActivity("SYNC_FAST_FAIL", "", "โครงสร้างใน Google Sheets หลักว่างเปล่า");
      }
    },
    error: function() {
      showToast('❌ ดาวน์โหลดรายชื่อหลักล้มเหลว กรุณาตรวจสอบการแชร์ไฟล์ชีตหลักเป็นสาธารณะ', 'err');
      logSystemActivity("SYNC_FAST_FAIL", "", "ดาวน์โหลดรายชื่อหลักล้มเหลว (ตรวจสอบการแชร์ไฟล์ชีต)");
    }
  });
}

// ── HELPER UTILITY FOR TEXT SIMILARITY MATCHING (v10.0) ──
function getLevenshteinDistance(s1, s2) {
  if (!s1) return s2 ? s2.length : 0;
  if (!s2) return s1 ? s1.length : 0;
  
  const track = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));
  for (let i = 0; i <= s1.length; i += 1) track[0][i] = i;
  for (let j = 0; j <= s2.length; j += 1) track[j][0] = j;
  
  for (let j = 1; j <= s2.length; j += 1) {
    for (let i = 1; i <= s1.length; i += 1) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1, // deletion
        track[j - 1][i] + 1, // insertion
        track[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  return track[s2.length][s1.length];
}

/* ==========================================================================
   🧠 MODULE 5: DIAGNOSTICS & LOGGING MODULE (ระบบประวัติกิจกรรมและการดักจับบั๊ก)
   ========================================================================== */

// Global Error Catchers for Browser-level Issues
window.addEventListener('error', function(e) {
  logSystemActivity("SYSTEM_ERROR", "", `${e.message} ที่ ${e.filename ? e.filename.split('/').pop() : 'unknown'}:${e.lineno || 0}`);
});

window.addEventListener('unhandledrejection', function(e) {
  logSystemActivity("PROMISE_ERROR", "", `Promise rejection ตกหล่น: ${e.reason}`);
});

// Primary System Logger Engine
function logSystemActivity(action, studentId, details) {
  try {
    let logs = [];
    try {
      const rawLogs = localStorage.getItem('app_system_logs');
      logs = rawLogs ? JSON.parse(rawLogs) : [];
      if (!Array.isArray(logs)) logs = [];
    } catch (e) {
      logs = [];
    }
    
    const newLog = {
      timestamp: new Date().toISOString(),
      action: action,
      studentId: studentId || '',
      details: details || '',
      device: getSimpleBrowserInfo()
    };
    
    logs.unshift(newLog); // Add to beginning of array (latest first)
    
    // Keep quota limit (max 100 entries to prevent LocalStorage bloat)
    if (logs.length > 100) {
      logs = logs.slice(0, 100);
    }
    
    localStorage.setItem('app_system_logs', JSON.stringify(logs));
    
    // Auto-update UI if settings page is active
    const activePage = document.querySelector('.page.active') ? document.querySelector('.page.active').id : '';
    if (activePage === 'page-settings') {
      renderDiagnosticsLogsUI();
    }
  } catch (err) {
    console.error('System logger failed:', err);
  }
}

// Helper to extract simple browser info for reports
function getSimpleBrowserInfo() {
  const ua = navigator.userAgent;
  let browser = "Unknown Browser";
  if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edge")) browser = "Microsoft Edge";
  
  let os = "Unknown OS";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Macintosh")) os = "macOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  
  return `${browser} (${os})`;
}

// Render Diagnostics List in Glassmorphism Container on Settings Page
function renderDiagnosticsLogsUI() {
  const container = document.getElementById('diagnostics-logs-container');
  if (!container) return;
  
  let logs = [];
  try {
    const rawLogs = localStorage.getItem('app_system_logs');
    logs = rawLogs ? JSON.parse(rawLogs) : [];
    if (!Array.isArray(logs)) logs = [];
  } catch (e) {
    logs = [];
  }
  
  if (logs.length === 0) {
    container.innerHTML = `<span style="color: var(--c4); font-style: italic;">⚪ ไม่มีประวัติกิจกรรมระบบในขณะนี้</span>`;
    return;
  }
  
  let html = '';
  // Show only up to 15 entries on settings screen
  const displayLogs = logs.slice(0, 15);
  
  displayLogs.forEach(l => {
    // Format timestamp nicely: hh:mm:ss
    let timeStr = '00:00:00';
    try {
      const dt = new Date(l.timestamp);
      timeStr = dt.toTimeString().split(' ')[0];
    } catch (e) {}
    
    // Choose status color
    let color = '#34d399'; // Emerald Green
    let actionLabel = l.action;
    
    if (l.action.includes('ERROR') || l.action.includes('FAIL')) {
      color = '#f87171'; // Red
    } else if (l.action.includes('LOGIN')) {
      color = '#60a5fa'; // Light Blue
    } else if (l.action.includes('DELETE')) {
      color = '#f97316'; // Orange
    }
    
    const stuPart = l.studentId ? ` [รหัส: ${l.studentId}]` : '';
    html += `
      <div style="margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 4px; word-break: break-all;">
        <span style="color: var(--c4); font-size: 11px;">[${timeStr}]</span>
        <strong style="color: ${color}; text-transform: uppercase;">[${actionLabel}]</strong>${stuPart}
        <span style="color: var(--c7); margin-left: 4px;">${l.details}</span>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

// Generate text Debug Report and Copy to Clipboard
function copyDebugReport() {
  try {
    let logs = [];
    try {
      const rawLogs = localStorage.getItem('app_system_logs');
      logs = rawLogs ? JSON.parse(rawLogs) : [];
    } catch (e) {}
    
    const reportDate = new Date().toLocaleString('th-TH');
    const cloudUrlVal = localStorage.getItem(CLOUD_KEY) || 'ไม่ได้ระบุ';
    const totalStudents = DB.length;
    
    let report = `==================================================\n`;
    report += `🎓 REPORT: SYSTEM DIAGNOSTICS & STATUS REPORT\n`;
    report += `==================================================\n`;
    report += `📅 วันเวลาที่ออกรายงาน: ${reportDate}\n`;
    report += `💻 ข้อมูลอุปกรณ์ผู้ใช้งาน: ${navigator.userAgent}\n`;
    report += `🟢 Status การเชื่อมต่อ: ${navigator.onLine ? 'ออนไลน์ (ONLINE)' : 'ออฟไลน์ (OFFLINE)'}\n`;
    report += `🔐 การเข้าระบบผู้ดูแล: ${isAuthorized ? 'ล็อกอินเข้าระบบเรียบร้อย' : 'ยังไม่ได้ล็อกอิน'}\n`;
    report += `📊 ขนาดฐานข้อมูลในเครื่อง: ${totalStudents} รายชื่อนักเรียน\n`;
    report += `☁️ API Google Apps Script: ${cloudUrlVal}\n\n`;
    
    report += `==================================================\n`;
    report += `📝 ประวัติกิจกรรมระบบล่าสุด (20 รายการหลังสุด)\n`;
    report += `==================================================\n`;
    
    const logs20 = logs.slice(0, 20);
    if (logs20.length === 0) {
      report += `(ไม่มีประวัติกิจกรรมเก็บไว้ใน LocalStorage)\n`;
    } else {
      logs20.forEach((l, idx) => {
        report += `${idx + 1}. [${l.timestamp}] [${l.action}] ${l.studentId ? 'Student ID: ' + l.studentId + ' | ' : ''}${l.details} (${l.device})\n`;
      });
    }
    report += `==================================================\n`;
    report += `🎓 END OF SYSTEM DIAGNOSTICS REPORT\n`;
    report += `==================================================\n`;
    
    // Copy using modern Clipboard API or fallback
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(report).then(() => {
        showToast('📋 คัดลอกรายงานดีบักระบบเข้าสู่ Clipboard เรียบร้อยแล้ว!', 'ok');
      }).catch(err => {
        fallbackCopyText(report);
      });
    } else {
      fallbackCopyText(report);
    }
    
    logSystemActivity("REPORT_EXPORT", "", "คัดลอกรายงานดีบักระบบออกเป็นข้อความสำเร็จ");
  } catch (err) {
    console.error(err);
    showToast('❌ ไม่สามารถสร้างรายงานดีบักได้', 'err');
  }
}

function fallbackCopyText(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed"; // Avoid scrolling to bottom
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
    showToast('📋 คัดลอกรายงานดีบักระบบเรียบร้อย (Fallback)!', 'ok');
  } catch (err) {
    showToast('❌ คัดลอกรายงานล้มเหลว กรุณาคลุมดำคัดลอกเองจาก F12', 'err');
  }
  document.body.removeChild(textArea);
}

// Clear all logs inside LocalStorage
function clearDiagnosticsLogs() {
  if (confirm('🗑️ คุณแน่ใจหรือไม่ว่าต้องการล้างประวัติกิจกรรมและข้อผิดพลาดระบบทั้งหมดบนเครื่องนี้?')) {
    localStorage.removeItem('app_system_logs');
    renderDiagnosticsLogsUI();
    showToast('🧹 ล้างประวัติล็อกข้อผิดพลาดเรียบร้อยแล้ว!', 'ok');
  }
}

// Trigger Simulation Error for testing global error listener
function triggerTestError() {
  showToast('💥 กำลังจำลองสคริปต์ขัดข้อง (Simulating crash)...', 'err');
  setTimeout(() => {
    // Throws intentional crash to test system diagnostics catcher (Window Error Listener)
    throw new Error("Test diagnostic error triggered by technical admin user.");
  }, 300);
}

// ฟังก์ชันตรวจวิเคราะห์พฤติกรรมเสี่ยงสารเสพติดอัจฉริยะ ป้องกัน False Positive และ TypeError (v14.3 Upgrade)
function checkSubstanceRisk(smokeVal, behaviorVal) {
  const smoke = String(smokeVal || '').trim();
  const behavior = String(behaviorVal || '').trim();
  
  if (!smoke && !behavior) return false;
  
  // คำที่ระบุชัดเจนว่าไม่มีความเสี่ยง
  const normalTerms = ['ไม่มี', 'ไม่สูบ', 'ไม่เสพ', 'ไม่ดื่ม', 'ปกติ', 'เลิกแล้ว', 'ไม่มีประวัติ', 'ปฏิเสธ', 'ไม่พบ', 'ปลอดภัย'];
  
  // คำที่เป็นประเด็นความเสี่ยง
  const riskTerms = ['บุหรี่', 'เหล้า', 'เบีย', 'กระท่อม', 'กัญชา', 'ยา', 'สูบ', 'ดื่ม', 'เสพ', 'น้ำท่อม', 'แอลกอฮอล์', 'สารเสพติด'];
  
  let smokeRisk = false;
  if (smoke) {
    const hasRisk = riskTerms.some(t => smoke.includes(t));
    const hasNormal = normalTerms.some(t => smoke.includes(t));
    if (hasRisk && !hasNormal) {
      smokeRisk = true;
    }
  }
  
  let behaviorRisk = false;
  if (behavior) {
    const hasRisk = riskTerms.some(t => behavior.includes(t));
    const hasNormal = normalTerms.some(t => behavior.includes(t));
    if (hasRisk && !hasNormal) {
      behaviorRisk = true;
    }
  }
  
  return smokeRisk || behaviorRisk;
}

// ฟังก์ชันตรวจวิเคราะห์ความเดือดร้อนทางการเงินและยื่นขอทุนการเรียนอัจฉริยะ (v14.3 Upgrade - กรองเฉพาะคนระบุค่ากินต่อวันและต้องการทุนเท่านั้น)
function checkFinancialRisk(s) {
  if (!s) return false;
  
  // 1. กรองเฉพาะนักเรียนที่ให้ข้อมูลเงินได้รับต่อวันมากินวิทยาลัยเท่านั้น (allowance > 0)
  const hasAllowance = s.allowance && !isNaN(Number(s.allowance)) && Number(s.allowance) > 0;
  if (!hasAllowance) return false;
  
  // 2. และต้องระบุความต้องการทุนการศึกษาเป็น "ต้องการ" เท่านั้น! (needs_scholarship === 'ต้องการ')
  const needsScholarship = s.needs_scholarship === 'ต้องการ';
  if (!needsScholarship) return false;
  
  return true;
}

// ── HELPER NAVIGATION FUNCTIONS (v14.1) ──

// กรองสถานะอัจฉริยะแล้วเปิดหน้ารายชื่อนักเรียนอัตโนมัติ
function filterByStatus(status) {
  const statusFilter = document.getElementById('filter-status');
  if (statusFilter) {
    statusFilter.value = status;
  }
  
  // รีเซ็ตตัวกรองพิเศษอื่นๆ เพื่อไม่ให้ขัดแย้งกัน
  if (document.getElementById('filter-substance')) document.getElementById('filter-substance').value = '';
  if (document.getElementById('filter-transport')) document.getElementById('filter-transport').value = '';
  if (document.getElementById('filter-financial')) document.getElementById('filter-financial').value = '';
  
  goPage('students');
  renderStudents();
}

// กรองสารเสพติดอัจฉริยะแล้วเปิดหน้ารายชื่อนักเรียนอัตโนมัติ
function filterBySubstance(type) {
  const substanceFilter = document.getElementById('filter-substance');
  if (substanceFilter) {
    substanceFilter.value = type;
  }
  
  // รีเซ็ตตัวกรองขัดแย้งอื่นๆ
  if (document.getElementById('filter-status')) document.getElementById('filter-status').value = 'กำลังศึกษา'; // กรองเฉพาะที่ยังศึกษาอยู่
  if (document.getElementById('filter-transport')) document.getElementById('filter-transport').value = '';
  if (document.getElementById('filter-financial')) document.getElementById('filter-financial').value = '';
  
  goPage('students');
  renderStudents();
}

// กรองการเดินทาง (รถจักรยานยนต์) แล้วเปิดหน้ารายชื่อนักเรียนอัตโนมัติ
function filterByTransport(type) {
  const transportFilter = document.getElementById('filter-transport');
  if (transportFilter) {
    transportFilter.value = type;
  }
  
  // รีเซ็ตตัวกรองขัดแย้งอื่นๆ
  if (document.getElementById('filter-status')) document.getElementById('filter-status').value = 'กำลังศึกษา'; // กรองเฉพาะที่ยังศึกษาอยู่
  if (document.getElementById('filter-substance')) document.getElementById('filter-substance').value = '';
  if (document.getElementById('filter-financial')) document.getElementById('filter-financial').value = '';
  
  goPage('students');
  renderStudents();
}

// กรองปัญหาทางการเงินการขอทุน แล้วเปิดหน้ารายชื่อนักเรียนอัตโนมัติ (v14.3 Upgrade)
function filterByFinancial(type) {
  const financialFilter = document.getElementById('filter-financial');
  if (financialFilter) {
    financialFilter.value = type;
  }
  
  // รีเซ็ตตัวกรองขัดแย้งอื่นๆ
  if (document.getElementById('filter-status')) document.getElementById('filter-status').value = 'กำลังศึกษา'; // กรองเฉพาะที่ยังศึกษาอยู่
  if (document.getElementById('filter-substance')) document.getElementById('filter-substance').value = '';
  if (document.getElementById('filter-transport')) document.getElementById('filter-transport').value = '';
  
  goPage('students');
  renderStudents();
}


