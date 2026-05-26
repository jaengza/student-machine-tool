/* ==========================================================================
   🎓 CORE APPLICATION LOGIC (app.js)
   ระบบฐานข้อมูลนักเรียนและการประเมินความเสี่ยง (Premium Version)
   ========================================================================== */

// ── DATA STATE & LOCAL STORAGE KEY ──
const STORAGE_KEY = 'dept_stu_v3';
const CLOUD_KEY = 'cstc_cloud_api';
let CLOUD_API_URL = '';
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
  CLOUD_API_URL = localStorage.getItem(CLOUD_KEY) || '';
  const apiInput = document.getElementById('cloud-api-url');
  if (apiInput) apiInput.value = CLOUD_API_URL;
  updateCloudStatusUI();

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
  // 1. ลองดึงจากคลาวด์ Apps Script ก่อน (ถ้ามี URL)
  const cloudActive = await loadDatabaseOnline();
  
  if (!cloudActive) {
    // 2. ถ้าไม่มี Apps Script URL → โหลดจาก LocalStorage
    loadDatabase();
    
    // 3. ถ้า Local ว่างหรือมีแค่ข้อมูลตัวอย่าง → ซิงค์จาก Google Sheets อัตโนมัติทันที!
    const localRaw = localStorage.getItem(STORAGE_KEY);
    const isEmpty = !localRaw || DB.length === 0 || DB.length <= 11;
    
    if (isEmpty) {
      // แสดงแถบแจ้งเตือนการซิงค์อัตโนมัติ
      showToast('🔄 ไม่พบข้อมูลในเครื่อง กำลังซิงค์ข้อมูลนักเรียนจาก Google Sheets อัตโนมัติ...', 'ok');
      // รอ UI โหลดก่อนแล้วค่อย sync
      setTimeout(async () => {
        await syncGoogleSheetsFast();
      }, 800);
    }
  }
  
  initializeCharts();
  updateDashboard();
  updateHeaderCount();
  
  // เรียกเปิดกลไกการซิงค์ข้อมูลให้เป็นปัจจุบันตลอดเวลา (Real-time Sync Engine)
  startAlwaysUpToDateEngine();
  
  // Refresh views
  const activePage = document.querySelector('.page.active') ? document.querySelector('.page.active').id : 'page-dashboard';
  if (activePage === 'page-students') renderStudents();
  else if (activePage === 'page-search') doQuickSearch();
}

// Load DB with strict authorization checks
function loadDatabase() {
  if (!isAuthorized) {
    DB = [];
    return;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    DB = raw ? JSON.parse(raw) : getMockData();
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
  url = url.trim();

  // If it's a direct Google UserContent hosting link, return as is
  if (url.includes('lh3.googleusercontent.com/d/')) {
    return url;
  }

  // Detect if only File ID was pasted
  const isIdOnly = /^[a-zA-Z0-9_-]{25,45}$/.test(url);
  if (isIdOnly) {
    return `https://lh3.googleusercontent.com/d/${url}`;
  }

  // Standard regular expressions to grab Drive IDs
  const regD = /\/file\/d\/([a-zA-Z0-9_-]{25,45})/;
  const regId = /[?&]id=([a-zA-Z0-9_-]{25,45})/;
  const regU = /\/uc\?id=([a-zA-Z0-9_-]{25,45})/;
  const regPreview = /\/file\/d\/([a-zA-Z0-9_-]{25,45})\/preview/;

  const matchD = url.match(regD);
  const matchId = url.match(regId);
  const matchU = url.match(regU);
  const matchPreview = url.match(regPreview);

  const fileId = (matchD && matchD[1]) || 
                 (matchId && matchId[1]) || 
                 (matchU && matchU[1]) || 
                 (matchPreview && matchPreview[1]);

  if (fileId) {
    // Return high speed public usercontent link
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }

  return url; // fallback to original input if none matched
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

  // Stat Grid Inner HTML
  const statGrid = document.getElementById('stat-grid');
  if (statGrid) {
    statGrid.innerHTML = `
      <div class="stat-card">
        <div class="lbl">นักเรียนทั้งหมดในระบบ</div>
        <div class="val font-accent">${total}</div>
        <div class="sub"><i class="fa-solid fa-users"></i> รวมประวัติสะสม</div>
      </div>
      <div class="stat-card stat-card-active">
        <div class="lbl">กำลังศึกษาปัจจุบัน</div>
        <div class="val" style="color: var(--g);">${active}</div>
        <div class="sub" style="color: var(--g);"><i class="fa-solid fa-graduation-cap"></i> ทะเบียนกำลังศึกษา</div>
      </div>
      <div class="stat-card stat-card-grad">
        <div class="lbl">สำเร็จการศึกษา</div>
        <div class="val">${grad}</div>
        <div class="sub"><i class="fa-solid fa-award"></i> บัณฑิตแผนกวิชา</div>
      </div>
      <div class="stat-card stat-card-resigned">
        <div class="lbl">พ้นสภาพ / ออกกลางคัน</div>
        <div class="val" style="color: var(--r);">${resigned}</div>
        <div class="sub" style="color: var(--r);"><i class="fa-solid fa-user-slash"></i> ย้าย / ตกออก / พ้นสภาพ</div>
      </div>
      <div class="stat-card stat-card-high clickable" onclick="openRiskModal('สูง')">
        <div class="lbl">🔴 เสี่ยงสูงมาก (เฝ้าระวัง)</div>
        <div class="val" style="color: var(--r);">${rHigh}</div>
        <div class="sub"><i class="fa-solid fa-circle-exclamation"></i> รายชื่อเด็กเสี่ยงสูง (คลิกดู)</div>
      </div>
      <div class="stat-card stat-card-med clickable" onclick="openRiskModal('ปานกลาง')">
        <div class="lbl">🟡 เสี่ยงปานกลาง</div>
        <div class="val" style="color: var(--y);">${rMed}</div>
        <div class="sub"><i class="fa-solid fa-triangle-exclamation"></i> มีปัจจัยความเสี่ยง (คลิกดู)</div>
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

    return matchQuery && matchLvl && matchYr && matchRm && matchSt;
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
  idInput.setAttribute('readonly', 'true'); // Prevents changing primary ID

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

  if (!idVal || !fnameVal || !lnameVal) {
    showToast('⚠️ กรุณากรอกรหัสประจำตัว ชื่อ และนามสกุลนักเรียน', 'err');
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

    <!-- Dual Column Sections -->
    <div class="profile-grid-sections">
      
      <!-- Section 1: Academic -->
      <div class="profile-sect animate-fade-in">
        <div class="profile-sect-title"><i class="fa-solid fa-graduation-cap"></i> ประวัติการเรียนและทั่วไป</div>
        <div class="info-row"><div class="ir-lbl">ระดับการศึกษา</div><div class="ir-val">${s.level || '-'}</div></div>
        <div class="info-row"><div class="ir-lbl">ชั้นปีการศึกษา</div><div class="ir-val">ปีที่ ${s.year || '-'}</div></div>
        <div class="info-row"><div class="ir-lbl">กลุ่มการเรียน</div><div class="ir-val">${s.room || '-'}</div></div>
        <div class="info-row"><div class="ir-lbl">สถานภาพปัจจุบัน</div><div class="ir-val">${s.status || '-'}</div></div>
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

          let matchedStudent = null;
          
          // Match by Student ID
          if (rawId) {
            matchedStudent = DB.find(s => String(s.id) === String(rawId));
          }

          // Fallback Match by Name
          if (!matchedStudent && rawName) {
            const cleanSearchName = rawName.replace(/^(นาย|นางสาว|น\.ส\.?|นาง|เด็กชาย|ด\.ช\.?|ด\.ญ\.?|เด็กหญิง)\s*/, '').trim();
            matchedStudent = DB.find(s => {
              const dn = getDisplayName(s);
              const fullName = `${dn.fn}${dn.ln}`.replace(/\s+/g, '');
              const sNameClean = cleanSearchName.replace(/\s+/g, '');
              return fullName.includes(sNameClean) || sNameClean.includes(fullName);
            });
          }

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

          let matchedStudent = null;
          
          // Match by Student ID
          if (rawId) {
            matchedStudent = DB.find(s => String(s.id) === String(rawId));
          }

          // Fallback Match by Name
          if (!matchedStudent && rawName) {
            const cleanSearchName = rawName.replace(/^(นาย|นางสาว|น\.ส\.?|นาง|เด็กชาย|ด\.ช\.?|ด\.ญ\.?|เด็กหญิง)\s*/, '').trim();
            matchedStudent = DB.find(s => {
              const dn = getDisplayName(s);
              const fullName = `${dn.fn}${dn.ln}`.replace(/\s+/g, '');
              const sNameClean = cleanSearchName.replace(/\s+/g, '');
              return fullName.includes(sNameClean) || sNameClean.includes(fullName);
            });
          }

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
      id: "662010101", fname: "นายสมเกียรติ", lname: "รักความดี", nickname: "เกียรติ",
      photo: "", level: "ปวช.", year: "1", room: "1",
      status: "กำลังศึกษา", phone: "081-456-7890", social: "kiat.good",
      parent: "นายสมเจตน์ รักความดี", parentphone: "089-123-4567", parentphone2: "",
      prevschool: "โรงเรียนศรีราชา", shirt: "M", health: "ไม่มี", transport: "รถมอเตอร์ไซค์ส่วนตัว",
      allowance: "100", smoke: "ไม่มี", risk_level: "ต่ำ", risk_academic: "ปกติ",
      risk_behavior: "ปกติ", risk_family: "ปกติ", risk_economic: "ปกติ",
      risk_note: "", internship_place: "", internship_phone: ""
    },
    {
      id: "662010202", fname: "นางสาวดวงพร", lname: "แก้วมณี", nickname: "ดวง",
      photo: "", level: "ปวช.", year: "1", room: "2",
      status: "กำลังศึกษา", phone: "082-345-6789", social: "duangporn_k",
      parent: "นางพรทิพย์ แก้วมณี", parentphone: "089-876-5432", parentphone2: "",
      prevschool: "โรงเรียนอรุณวิทยา", shirt: "S", health: "ภูมิแพ้อากาศ", transport: "รถรับส่งนักเรียน",
      allowance: "120", smoke: "ไม่มี", risk_level: "ปานกลาง", risk_academic: "ปกติ",
      risk_behavior: "เก็บตัว ไม่ค่อยคุยกับใคร", risk_family: "ปกติ", risk_economic: "ปกติ",
      risk_note: "คุณครูพูดคุยเพื่อให้คำปรึกษาและจับคู่บัดดี้ในห้องช่วยประคับประคอง", internship_place: "", internship_phone: ""
    },
    {
      id: "652010303", fname: "นายอนันต์", lname: "ยอดแก้ว", nickname: "นัน",
      photo: "", level: "ปวช.", year: "2", room: "1",
      status: "กำลังศึกษา", phone: "083-456-7890", social: "nan_yodkaew",
      parent: "นายอำนาจ ยอดแก้ว", parentphone: "084-567-8901", parentphone2: "",
      prevschool: "โรงเรียนวัดเขาแดง", shirt: "L", health: "ไม่มี", transport: "เดินเท้า",
      allowance: "60", smoke: "ไม่มี", risk_level: "สูง", risk_academic: "ปกติ",
      risk_behavior: "ปกติ", risk_family: "อาศัยอยู่กับปู่ย่า", risk_economic: "ยากจน ขาดแคลนทุนทรัพย์",
      risk_note: "ครอบครัวยากจนมาก ขาดทุนทรัพย์ ได้ส่งเรื่องขอรับทุนอาหารกลางวันและทุนเรียนฟรีของวิทยาลัยแล้ว", internship_place: "", internship_phone: ""
    },
    {
      id: "652010404", fname: "นายเกียรติศักดิ์", lname: "ใจดี", nickname: "pop",
      photo: "", level: "ปวช.", year: "2", room: "3",
      status: "กำลังศึกษา", phone: "084-567-8901", social: "pop_jaidee",
      parent: "นางดวงใจ ใจดี", parentphone: "085-678-9012", parentphone2: "",
      prevschool: "โรงเรียนชุมชนบ้านสองแพรก", shirt: "XL", health: "ไม่มี", transport: "รถจักรยานยนต์ส่วนตัว",
      allowance: "150", smoke: "ไม่มี", risk_level: "ต่ำ", risk_academic: "ปกติ",
      risk_behavior: "ปกติ", risk_family: "ปกติ", risk_economic: "ปกติ",
      risk_note: "", internship_place: "", internship_phone: ""
    },
    {
      id: "642010505", fname: "นายพิพัฒน์พงศ์", lname: "พรหมสร", nickname: "ตูน",
      photo: "", level: "ปวช.", year: "3", room: "2",
      status: "กำลังศึกษา", phone: "089-111-2222", social: "toon.pipat",
      parent: "นายสมบัติ พรหมสร", parentphone: "089-333-4444", parentphone2: "",
      prevschool: "โรงเรียนสระแก้ววิทยา", shirt: "L", health: "ไม่มี", transport: "รถมอเตอร์ไซค์ส่วนตัว",
      allowance: "130", smoke: "ไม่มี", risk_level: "ต่ำ", risk_academic: "ปกติ",
      risk_behavior: "ปกติ", risk_family: "ปกติ", risk_economic: "ปกติ",
      risk_note: "", internship_place: "", internship_phone: ""
    },
    {
      id: "642010606", fname: "นายณัฐพล", lname: "บุญส่ง", nickname: "แบงก์",
      photo: "", level: "ปวช.", year: "3", room: "4",
      status: "กำลังศึกษา", phone: "087-555-6666", social: "bank_bns",
      parent: "นางประนอม บุญส่ง", parentphone: "087-777-8888", parentphone2: "",
      prevschool: "โรงเรียนท่าตะเกียบวิทยา", shirt: "M", health: "ไม่มี", transport: "พักหอพัก",
      allowance: "100", smoke: "สังสรรค์สุรากลุ่มเพื่อนบางครั้ง", risk_level: "ปานกลาง", risk_academic: "ผลการเรียนตกต่ำกว่า 2.00",
      risk_behavior: "ปกติ", risk_family: "ปกติ", risk_economic: "ปกติ",
      risk_note: "ได้ติดตามผลการเรียนอย่างใกล้ชิดและส่งซ่อมวิชาที่มีปัญหาเพื่อป้องกันการพ้นสภาพ", internship_place: "", internship_phone: ""
    },
    {
      id: "663010101", fname: "นายธีรวัฒน์", lname: "ชูศรี", nickname: "นิว",
      photo: "", level: "ปวส.", year: "1", room: "1",
      status: "กำลังศึกษา", phone: "085-678-9012", social: "new_teerawat",
      parent: "นายวิชัย ชูศรี", parentphone: "086-789-0123", parentphone2: "",
      prevschool: "วิทยาลัยเทคนิคเดิม", shirt: "XL", health: "ไม่มี", transport: "รถยนต์ส่วนตัว",
      allowance: "200", smoke: "ไม่มี", risk_level: "ต่ำ", risk_academic: "ปกติ",
      risk_behavior: "ปกติ", risk_family: "ปกติ", risk_economic: "ปกติ",
      risk_note: "", internship_place: "", internship_phone: ""
    },
    {
      id: "663010202", fname: "นางสาวศิรินทรา", lname: "ศิริบุตร", nickname: "ฟ้า",
      photo: "", level: "ปวส.", year: "1", room: "2",
      status: "กำลังศึกษา", phone: "086-789-0123", social: "fah_sirintra",
      parent: "นางสิริพร ศิริบุตร", parentphone: "087-890-1234", parentphone2: "",
      prevschool: "วิทยาลัยอาชีวศึกษาเดิม", shirt: "M", health: "ไม่มี", transport: "รถจักรยานยนต์ส่วนตัว",
      allowance: "150", smoke: "ไม่มี", risk_level: "ต่ำ", risk_academic: "ปกติ",
      risk_behavior: "ปกติ", risk_family: "ปกติ", risk_economic: "ปกติ",
      risk_note: "", internship_place: "", internship_phone: ""
    },
    {
      id: "653010505", fname: "นายชินดนัย", lname: "สิริโชติ", nickname: "ชิน",
      photo: "", level: "ปวส.", year: "2", room: "1",
      status: "กำลังศึกษา", phone: "087-890-1234", social: "chin_danai",
      parent: "นายปกรณ์ สิริโชติ", parentphone: "088-901-2345", parentphone2: "",
      prevschool: "วิทยาลัยการอาชีพเดิม", shirt: "XXL", health: "ไม่มี", transport: "รถจักรยานยนต์ส่วนตัว",
      allowance: "180", smoke: "บุหรี่ไฟฟ้า/สังสรรค์สุราไฟฟ้าบ้าง", risk_level: "ปานกลาง", risk_academic: "เริ่มขาดเรียนในคาบเช้า",
      risk_behavior: "ปกติ", risk_family: "ปกติ", risk_economic: "ปกติ",
      risk_note: "ปรึกษาหารือกับคุณพ่อเรื่องเวลาการตื่นนอนและการพักผ่อน ติดตามพฤติกรรมการมาเรียนคาบเช้าใกล้ชิด",
      internship_place: "บริษัท ยานยนต์เอเชีย จำกัด (นิคมเกตเวย์)", internship_phone: "038-575-123"
    },
    {
      id: "653010506", fname: "นายกฤษณะ", lname: "แสงสุข", nickname: "กฤษ",
      photo: "", level: "ปวส.", year: "2", room: "1",
      status: "กำลังศึกษา", phone: "088-901-2345", social: "kritsana_s",
      parent: "นางวรรณา แสงสุข", parentphone: "089-012-3456", parentphone2: "",
      prevschool: "วิทยาลัยอาชีวศึกษาเดิม", shirt: "L", health: "ไม่มี", transport: "รถสาธารณะ",
      allowance: "120", smoke: "ไม่มี", risk_level: "สูง", risk_academic: "ผลการเรียนตกต่ำอย่างมาก",
      risk_behavior: "ขาดความรับผิดชอบบ่อยครั้ง", risk_family: "บิดามารดาแยกทางกัน", risk_economic: "ปานกลาง",
      risk_note: "บิดามารดาแยกทาง พักอยู่กับเพื่อนร่วมแผนกวิชา ทำให้ละเลยการเรียน ครูได้เรียกพบและพูดคุยทำข้อตกลงช่วยเหลือร่วมกัน",
      internship_place: "บริษัท เหล็กกล้าไทย จำกัด (นิคมอมตะนคร)", internship_phone: "038-456-789"
    },
    {
      id: "653010707", fname: "นางสาวกนกวรรณ", lname: "ปิ่นแก้ว", nickname: "ก้อย",
      photo: "", level: "ปวส.", year: "2", room: "2",
      status: "กำลังศึกษา", phone: "081-333-5555", social: "koy.pin",
      parent: "นายธนา ปิ่นแก้ว", parentphone: "081-444-6666", parentphone2: "",
      prevschool: "วิทยาลัยเทคนิคเดิม", shirt: "S", health: "ไม่มี", transport: "รถยนต์ส่วนตัว",
      allowance: "200", smoke: "ไม่มี", risk_level: "ต่ำ", risk_academic: "ปกติ",
      risk_behavior: "ปกติ", risk_family: "ปกติ", risk_economic: "ปกติ",
      risk_note: "", internship_place: "บริษัท สหวิริยา สตีล จำกัด (มหาชน)", internship_phone: "02-234-5678"
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
    fRm.value = room;
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
  }
}

// Log out and completely reload environment to wipe out sensitive memory
function handleLogout() {
  sessionStorage.removeItem('cstc_auth');
  isAuthorized = false;
  DB = [];
  
  showToast('🔒 ออกจากระบบสำเร็จ กำลังรีเซ็ตหน่วยความจำ...', 'ok');
  
  setTimeout(() => {
    window.location.reload();
  }, 800);
}

// Utility to calculate SHA-256 hex string using browser-native subtle crypto
// ── REAL-TIME CLOUD DATABASE STORAGE INTEGRATIONS ──

// Load database from cloud (Google Sheets Apps Script API)
async function loadDatabaseOnline() {
  if (!CLOUD_API_URL || !CLOUD_API_URL.startsWith('http')) return false;
  
  try {
    showToast('🌐 กำลังเชื่อมต่อซิงค์ประวัติสดกับ Google Sheets...', 'ok');
    const response = await fetch(CLOUD_API_URL);
    const cloudData = await response.json();
    
    if (cloudData && Array.isArray(cloudData)) {
      // พจนานุกรมแปลงหัวคอลัมน์ภาษาไทยจาก Sheets กลับเป็นฟิลด์ระบบ
      const THAI_MAP_REVERSE = {
        "รหัสประจำตัวนักเรียน": "id", "รหัสนักเรียน": "id", "รหัสประจำตัว": "id", "รหัส": "id", "id": "id",
        "ชื่อจริง": "fname", "ชื่อ": "fname", "ชื่อนาม-นามสกุล": "fname", "ชื่อ-นามสกุล": "fname",
        "นามสกุล": "lname", "สกุล": "lname",
        "ชื่อเล่น": "nickname", "รูป": "photo", "รูปถ่าย": "photo", "รูปภาพ": "photo", "photo": "photo",
        "ระดับชั้น": "level", "ระดับ": "level", "ระดับชั้นปี": "level",
        "ชั้นปี": "year", "กลุ่มเรียน": "room", "ห้อง": "room", "เบอร์โทรนักเรียน": "phone", "เบอร์โทร": "phone",
        "โซเชียล": "social", "line": "social", "facebook": "social",
        "ชื่อผู้ปกครอง": "parent", "เบอร์โทรผู้ปกครอง": "parentphone", "เบอร์ฉุกเฉิน": "parentphone2",
        "สถานศึกษาเดิม": "prevschool", "ไซส์เสื้อ": "shirt", "โรคประจำตัว": "health",
        "การเดินทาง": "transport", "เงินมาเรียนต่อวัน": "allowance", "พฤติกรรมเสี่ยง": "smoke",
        "สถานที่ฝึกงาน": "internship_place", "เบอร์โทรสถานที่ฝึกงาน": "internship_phone",
        "ระดับความเสี่ยงภาพรวม": "risk_level", "เสี่ยงด้านการเรียน": "risk_academic",
        "เสี่ยงด้านพฤติกรรม": "risk_behavior", "เสี่ยงด้านครอบครัว": "risk_family",
        "เสี่ยงด้านเศรษฐกิจ": "risk_economic", "หมายเหตุช่วยเหลือ": "risk_note"
      };
      
      let parsedDB = [];
      cloudData.forEach(row => {
        const student = {};
        let fnameVal = '';
        let lnameVal = '';
        let fullName = '';
        
        // ค้นหาคอลัมน์ชื่อจริง
        for (var key in row) {
          var cleanK = key.trim();
          if (cleanK === "ชื่อนาม-นามสกุล" || cleanK === "ชื่อ-นามสกุล") {
            fullName = String(row[key] || '').trim();
            break;
          }
        }
        
        if (fullName !== '') {
          // ล้างคำนำหน้า
          const cleanFullName = fullName.replace(/^(นาย|นางสาว|เด็กชาย|เด็กหญิง|นาง|ด\.ช\.|ด\.ญ\.)\s*/, '').trim();
          const parts = cleanFullName.split(/\s+/);
          if (parts.length >= 2) {
            fnameVal = parts[0];
            lnameVal = parts.slice(1).join(' ');
          } else {
            fnameVal = cleanFullName;
            lnameVal = '';
          }
        }
        
        // กำหนดค่าเริ่มต้นทุกฟิลด์ป้องกัน undefined
        FIELDS.forEach(f => {
          student[f.k] = '';
        });
        
        // แมปข้อมูลจากคอลัมน์ของชีต
        for (var sheetKey in row) {
          var cleanSK = sheetKey.trim();
          var mappedField = THAI_MAP_REVERSE[cleanSK];
          if (mappedField) {
            student[mappedField] = String(row[sheetKey] || '').trim();
          }
        }
        
        if (fnameVal !== '') student.fname = fnameVal;
        if (lnameVal !== '') student.lname = lnameVal;
        
        if (student.id) {
          student.id = String(student.id).trim();
          
          // คัดกรองและสแกน Fallbacks สำหรับระดับและชั้นปี
          if (!student.level) student.level = student.id.startsWith('6') ? 'ปวช.' : 'ปวส.';
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
          }
          
          // ลบกลุ่มเรียนถ้าห้องเรียนถูกทับด้วยลิงก์รูป
          if (student.room && (student.room.includes('drive.google.com') || student.room.includes('lh3.googleusercontent.com') || student.room.includes('http'))) {
            if (!student.photo) student.photo = student.room;
            student.room = '';
          }
          
          if (student.photo) {
            student.photo = normalizeDriveUrl(student.photo);
          }
          
          parsedDB.push(student);
        }
      });
      
      if (parsedDB.length > 0) {
        DB = parsedDB;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DB)); // เซฟสำรองในเครื่องเผื่อออฟไลน์
        showToast('🟢 ดึงประวัติเชื่อมโยงสดสำเร็จ!', 'ok');
        return true;
      }
    }
  } catch (err) {
    console.error('Cloud Sync failed, falling back to Local Storage', err);
    showToast('⚠️ เชื่อมต่อออนไลน์ไม่ได้ กำลังใช้ข้อมูลประวัติสำรองในเครื่องแทน', 'err');
  }
  return false;
}

// Send single student update request to Google Sheets Cloud Web App API (CORS-friendly POST)
async function saveToCloud(student) {
  if (!CLOUD_API_URL || !CLOUD_API_URL.startsWith('http')) return;
  
  const payload = {
    id: student.id,
    fname: student.fname,
    lname: student.lname,
    nickname: student.nickname,
    photo: student.photo,
    level: student.level,
    year: student.year,
    room: student.room,
    status: student.status,
    phone: student.phone,
    social: student.social,
    parent: student.parent,
    parentphone: student.parentphone,
    parentphone2: student.parentphone2,
    prevschool: student.prevschool,
    shirt: student.shirt,
    health: student.health,
    transport: student.transport,
    allowance: student.allowance,
    smoke: student.smoke,
    internship_place: student.internship_place,
    internship_phone: student.internship_phone,
    risk_level: student.risk_level,
    risk_academic: student.risk_academic,
    risk_behavior: student.risk_behavior,
    risk_family: student.risk_family,
    risk_economic: student.risk_economic,
    risk_note: student.risk_note
  };
  
  try {
    showToast('📤 กำลังส่งข้อมูลประวัติขึ้น Google Sheets...', 'ok');
    
    // mode: 'no-cors' ช่วยเลี่ยง CORS บล็อกของกูเกิลได้อย่างสมบูรณ์แบบ 
    await fetch(CLOUD_API_URL, {
      method: 'POST',
      mode: 'no-cors', 
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    showToast('🟢 บันทึกและซิงค์คลาวด์ออนไลน์สำเร็จ!', 'ok');
  } catch (err) {
    console.error('Failed to sync to cloud', err);
    showToast('⚠️ ไม่สามารถส่งขึ้นคลาวด์ได้ทันที ข้อมูลจะเซฟไว้ในเครื่องนี้ก่อน', 'err');
  }
}

// Send delete student request to Google Sheets Cloud Web App API
async function deleteFromCloud(studentId) {
  if (!CLOUD_API_URL || !CLOUD_API_URL.startsWith('http')) return;
  
  const payload = {
    id: studentId,
    action: "delete"
  };
  
  try {
    showToast('🗑️ กำลังส่งคำสั่งลบประวัติไปที่ Google Sheets...', 'ok');
    await fetch(CLOUD_API_URL, {
      method: 'POST',
      mode: 'no-cors', 
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    showToast('🟢 ลบประวัติบนคลาวด์ออนไลน์สำเร็จ!', 'ok');
  } catch (err) {
    console.error('Failed to delete from cloud', err);
    showToast('⚠️ ไม่สามารถสั่งลบออนไลน์ได้ทันที ข้อมูลอาจยังค้างอยู่ในกูเกิลชีต', 'err');
  }
}

// Background Cloud Synchronization Engine (Silent Auto-Sync)
async function syncDatabaseBackground() {
  if (!CLOUD_API_URL || !CLOUD_API_URL.startsWith('http')) return;
  if (!isAuthorized) return; // Only sync if logged in
  
  // เกราะกันฟอร์มสะดุด (Active Form Guard): ห้ามดึงข้อมูลใหม่มาทับ หากคุณครูกำลังพิมพ์คีย์ข้อมูลอยู่!
  const addModal = document.getElementById('add-modal');
  const riskModal = document.getElementById('risk-modal');
  if ((addModal && addModal.classList.contains('active')) || (riskModal && riskModal.classList.contains('active'))) {
    console.log('Background Sync deferred: User is actively editing a form.');
    return;
  }
  
  try {
    console.log('Running silent background cloud database sync...');
    const response = await fetch(CLOUD_API_URL);
    const cloudData = await response.json();
    
    if (cloudData && Array.isArray(cloudData)) {
      const THAI_MAP_REVERSE = {
        "รหัสประจำตัวนักเรียน": "id", "รหัสนักเรียน": "id", "รหัสประจำตัว": "id", "รหัส": "id", "id": "id",
        "ชื่อจริง": "fname", "ชื่อ": "fname", "ชื่อนาม-นามสกุล": "fname", "ชื่อ-นามสกุล": "fname",
        "นามสกุล": "lname", "สกุล": "lname",
        "ชื่อเล่น": "nickname", "รูป": "photo", "รูปถ่าย": "photo", "รูปภาพ": "photo", "photo": "photo",
        "ระดับชั้น": "level", "ระดับ": "level", "ระดับชั้นปี": "level",
        "ชั้นปี": "year", "กลุ่มเรียน": "room", "ห้อง": "room", "เบอร์โทรนักเรียน": "phone", "เบอร์โทร": "phone",
        "โซเชียล": "social", "line": "social", "facebook": "social",
        "ชื่อผู้ปกครอง": "parent", "เบอร์โทรผู้ปกครอง": "parentphone", "เบอร์ฉุกเฉิน": "parentphone2",
        "สถานศึกษาเดิม": "prevschool", "ไซส์เสื้อ": "shirt", "โรคประจำตัว": "health",
        "การเดินทาง": "transport", "เงินมาเรียนต่อวัน": "allowance", "พฤติกรรมเสี่ยง": "smoke",
        "สถานที่ฝึกงาน": "internship_place", "เบอร์โทรสถานที่ฝึกงาน": "internship_phone",
        "ระดับความเสี่ยงภาพรวม": "risk_level", "เสี่ยงด้านการเรียน": "risk_academic",
        "เสี่ยงด้านพฤติกรรม": "risk_behavior", "เสี่ยงด้านครอบครัว": "risk_family",
        "เสี่ยงด้านเศรษฐกิจ": "risk_economic", "หมายเหตุช่วยเหลือ": "risk_note"
      };
      
      let parsedDB = [];
      cloudData.forEach(row => {
        const student = {};
        let fnameVal = '';
        let lnameVal = '';
        let fullName = '';
        
        for (var key in row) {
          var cleanK = key.trim();
          if (cleanK === "ชื่อนาม-นามสกุล" || cleanK === "ชื่อ-นามสกุล") {
            fullName = String(row[key] || '').trim();
            break;
          }
        }
        
        if (fullName !== '') {
          const cleanFullName = fullName.replace(/^(นาย|นางสาว|เด็กชาย|เด็กหญิง|นาง|ด\.ช\.|ด\.ญ\.)\s*/, '').trim();
          const parts = cleanFullName.split(/\s+/);
          if (parts.length >= 2) {
            fnameVal = parts[0];
            lnameVal = parts.slice(1).join(' ');
          } else {
            fnameVal = cleanFullName;
            lnameVal = '';
          }
        }
        
        FIELDS.forEach(f => {
          student[f.k] = '';
        });
        
        for (var sheetKey in row) {
          var cleanSK = sheetKey.trim();
          var mappedField = THAI_MAP_REVERSE[cleanSK];
          if (mappedField) {
            student[mappedField] = String(row[sheetKey] || '').trim();
          }
        }
        
        if (fnameVal !== '') student.fname = fnameVal;
        if (lnameVal !== '') student.lname = lnameVal;
        
        if (student.id) {
          student.id = String(student.id).trim();
          if (!student.level) student.level = student.id.startsWith('6') ? 'ปวช.' : 'ปวส.';
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
          }
          if (student.room && (student.room.includes('drive.google.com') || student.room.includes('lh3.googleusercontent.com') || student.room.includes('http'))) {
            if (!student.photo) student.photo = student.room;
            student.room = '';
          }
          if (student.photo) student.photo = normalizeDriveUrl(student.photo);
          parsedDB.push(student);
        }
      });
      
      const isDifferent = JSON.stringify(DB) !== JSON.stringify(parsedDB);
      
      if (isDifferent && parsedDB.length > 0) {
        console.log('Background Sync: Changes detected on Google Sheets. Updating Local Database...');
        DB = parsedDB;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DB));
        
        buildRoomFilter();
        updateDashboard();
        updateHeaderCount();
        
        const activePage = document.querySelector('.page.active') ? document.querySelector('.page.active').id : 'page-dashboard';
        if (activePage === 'page-students') renderStudents();
        else if (activePage === 'page-search') doQuickSearch();
        
        showToast('🔄 อัปเดตฐานข้อมูลนักเรียนเป็นปัจจุบันจาก Google Sheets แล้ว!', 'ok');
      } else {
        console.log('Background Sync: Database is already up to date.');
      }
    }
  } catch (err) {
    console.error('Silent Background Sync failed:', err);
  }
}

// Start Always-Up-To-Date Synchronization Engine (Focus + Polling)
function startAlwaysUpToDateEngine() {
  if (!CLOUD_API_URL || !CLOUD_API_URL.startsWith('http')) return;
  
  // 1. ซิงค์สดเบื้องหลังทันทีที่คุณครูสลับหน้าต่างกลับมาที่หน้านี้ (Window Focus Event)
  window.removeEventListener('focus', syncDatabaseBackground);
  window.addEventListener('focus', syncDatabaseBackground);
  
  // 2. ตั้งเวลาซิงค์อัตโนมัติเบื้องหลังทุกๆ 60 วินาที (Polling Event)
  if (window.backgroundSyncInterval) {
    clearInterval(window.backgroundSyncInterval);
  }
  window.backgroundSyncInterval = setInterval(syncDatabaseBackground, 60000);
  
  console.log('🚀 Real-time Always Up-to-Date Engine (v8.0) started successfully!');
}

// Save cloud settings configuration
function saveCloudConfig() {
  const urlInput = document.getElementById('cloud-api-url');
  if (urlInput) {
    CLOUD_API_URL = urlInput.value.trim();
    localStorage.setItem(CLOUD_KEY, CLOUD_API_URL);
    updateCloudStatusUI();
  }
}

// Update status text on Settings panel
function updateCloudStatusUI() {
  const statusText = document.getElementById('cloud-status-text');
  const cloudUrl = localStorage.getItem(CLOUD_KEY) || '';
  
  if (statusText) {
    if (cloudUrl && cloudUrl.startsWith('http')) {
      statusText.innerHTML = '🟢 โหมดปัจจุบัน: <strong>คลาวด์ออนไลน์ซิงค์สด (Google Sheets Cloud Mode)</strong>';
      statusText.style.color = '#34d399'; // Emerald สีเขียว
    } else {
      statusText.innerHTML = '⚪ โหมดปัจจุบัน: <strong>ความจำเฉพาะเครื่อง (LocalStorage Mode)</strong>';
      statusText.style.color = 'var(--c5)';
    }
  }
}

// Test cloud API connection manually
async function testCloudConnection() {
  const urlInput = document.getElementById('cloud-api-url');
  if (!urlInput) return;
  
  const testUrl = urlInput.value.trim();
  if (!testUrl || !testUrl.startsWith('http')) {
    showToast('⚠️ กรุณากรอกลิงก์ Web App API ที่ถูกต้องก่อนทดสอบ', 'err');
    return;
  }
  
  const testBtn = document.getElementById('cloud-test-btn');
  if (testBtn) {
    testBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังทดสอบ...';
    testBtn.disabled = true;
  }
  
  showToast('🔍 กำลังทดสอบเชื่อมต่อและดึงตารางข้อมูล...', 'ok');
  
  try {
    const response = await fetch(testUrl);
    const data = await response.json();
    
    if (data && Array.isArray(data)) {
      showToast("🟢 เชื่อมต่อคลาวด์สำเร็จ! พบประวัตินักเรียน " + data.length + " รายการในชีต", "ok");
      
      // Auto save and activate
      CLOUD_API_URL = testUrl;
      localStorage.setItem(CLOUD_KEY, testUrl);
      updateCloudStatusUI();
      
      // Sync DB
      initApp();
    } else {
      showToast('⚠️ ผลลัพธ์ชีตว่างเปล่า หรือเกิดข้อผิดพลาดในการดึงข้อมูล', 'err');
    }
  } catch (err) {
    console.error(err);
    showToast('❌ เชื่อมต่อล้มเหลว ลิงก์ไม่ถูกต้อง หรือยังไม่ได้เปิดแชร์สาธารณะ (Anyone)', 'err');
  } finally {
    if (testBtn) {
      testBtn.innerHTML = '<i class="fa-solid fa-circle-nodes"></i> ทดสอบการซิงค์สด';
      testBtn.disabled = false;
    }
  }
}

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

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
                  
                  // จับคู่ผ่านรหัสนักเรียน (ตรงกันหรือลงท้ายด้วย 3 ตัว)
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
                  
                  // จับคู่ผ่านชื่อ-นามสกุลยืดหยุ่นสำรอง
                  if (!isMatch && rawPhotoName) {
                    const stuCleanName = (String(student.fname || '') + String(student.lname || '')).replace(/^(นาย|นางสาว|เด็กชาย|เด็กหญิง|นาง)\s*/, '').replace(/\s+/g, '');
                    if (stuCleanName.includes(rawPhotoName) || rawPhotoName.includes(stuCleanName)) {
                      isMatch = true;
                    }
                  }
                  
                  if (isMatch) {
                    student.photo = directUrl;
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
          }
        });
        
      } else {
        showToast('❌ โครงสร้างใน Google Sheets หลักว่างเปล่า', 'err');
      }
    },
    error: function() {
      showToast('❌ ดาวน์โหลดรายชื่อหลักล้มเหลว กรุณาตรวจสอบการแชร์ไฟล์ชีตหลักเป็นสาธารณะ', 'err');
    }
  });
}