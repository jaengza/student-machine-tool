/**
 * ============================================================================
 * Main Application Controller V2 (Mobile-First & PC Responsive UI)
 * - ระบบกลุ่มภาษาไทย ("กลุ่ม1", "กลุ่ม2", ...) แทนรหัส Code
 * - แสดงข้อมูลการใช้บุหรี่/สุรา/สารเสพติด ตามที่นักเรียนแจ้งในแบบบันทึกจริง
 * - แสดงสาเหตุของกลุ่มเสี่ยง/มีปัญหาชัดเจน และกดกรองค้นหาตามสาเหตุปัญหาได้ทันที
 * ============================================================================
 */

window.AppState = {
  currentTab: 'dashboard', // 'dashboard' | 'students' | 'discipline' | 'screening' | 'settings'
  studentViewMode: 'grid', // 'grid' | 'table'
  searchQuery: '',
  filterLevelYear: 'ALL',  // 'ALL' | 'ปวช.1' | 'ปวช.2' | 'ปวส.1'
  filterGroupLabel: 'ALL', // 'ALL' | 'กลุ่ม1' | 'กลุ่ม2' | 'กลุ่ม3' | 'กลุ่ม4' | 'กลุ่ม5'
  filterClassId: 'ALL',    // 'ALL' | 'ปวช.1 กลุ่ม1' ...
  filterDistrict: 'ALL',
  filterPhoto: 'ALL',
  filterRisk: 'ALL',       // 'ALL' | 'กลุ่มมีปัญหา' | 'กลุ่มเสี่ยง' | 'กลุ่มปกติ'
  filterProblemTag: 'ALL', // 'ALL' | 'สูบบุหรี่' | 'ดื่มเหล้า/เบียร์' | 'น้ำกระท่อม' | 'กัญชา' | 'ANY_SUBSTANCE' | 'NO_SUBSTANCE' | 'รายได้ต่ำ (<10,000 บ.)' | 'ต้องการทุนการศึกษา' | 'ค่าขนมน้อย (<100 บ.)' | 'ครอบครัวหย่าร้าง/แยกกันอยู่' | 'ถูกหักคะแนนความประพฤติ'
  filterIssueOnly: false,
  selectedStudentId: null,
  screeningZoneFilter: 'ALL',
  screeningRiskFilter: 'ALL',
  screeningProblemFilter: 'ALL'
};

// ============================================================================
// Helper Functions & Visual Badges
// ============================================================================
function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const el = document.createElement('div');
  const bg = type === 'error'
    ? 'bg-red-600 text-white'
    : type === 'warning'
      ? 'bg-amber-500 text-white'
      : 'bg-emerald-600 text-white';
  el.className = `${bg} px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-sm font-medium animate-modal max-w-sm pointer-events-auto`;
  el.innerHTML = `
    <i data-lucide="${type === 'error' ? 'alert-circle' : 'check-circle-2'}" class="w-5 h-5 shrink-0"></i>
    <span>${escapeHtml(message)}</span>
  `;
  container.appendChild(el);
  if (window.lucide) lucide.createIcons();
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.25s ease';
    setTimeout(() => el.remove(), 250);
  }, 3000);
}

function getRiskBadge(riskLevel) {
  if (riskLevel === 'กลุ่มมีปัญหา') {
    return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-prompt font-bold bg-red-100 text-red-800 border border-red-300 shadow-sm"><span class="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>กลุ่มมีปัญหา</span>`;
  }
  if (riskLevel === 'กลุ่มเสี่ยง') {
    return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-prompt font-bold bg-amber-100 text-amber-900 border border-amber-300"><span class="w-2 h-2 rounded-full bg-amber-500"></span>กลุ่มเสี่ยง</span>`;
  }
  return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-prompt font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200"><span class="w-2 h-2 rounded-full bg-emerald-500"></span>กลุ่มปกติ</span>`;
}

/**
 * แสดงป้ายสาเหตุความเสี่ยง/ปัญหาแต่ละด้านอย่างชัดเจน (ให้รู้ว่าเสี่ยงเรื่องอะไร)
 */
function renderRiskReasonBadges(stu) {
  const reasons = (stu.Screening && stu.Screening.Risk_Reasons) || [];
  if (reasons.length === 0) {
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">✅ ไม่พบความเสี่ยง (ไม่ดื่ม/ไม่สูบ • เศรษฐกิจปกติ)</span>`;
  }

  return reasons.map(r => {
    let color = 'bg-amber-50 text-amber-800 border-amber-200';
    let icon = '⚠️';
    if (r.includes('กัญชา') || r.includes('กระท่อม')) {
      color = 'bg-red-100 text-red-800 border-red-300 font-bold';
      icon = r.includes('กัญชา') ? '🍁' : '🌿';
    } else if (r.includes('บุหรี่')) {
      color = 'bg-orange-100 text-orange-800 border-orange-300 font-semibold';
      icon = '🚬';
    } else if (r.includes('เหล้า') || r.includes('เบียร์')) {
      color = 'bg-purple-100 text-purple-800 border-purple-300 font-semibold';
      icon = '🍺';
    } else if (r.includes('รายได้') || r.includes('เศรษฐกิจ') || r.includes('ค่าขนม')) {
      color = 'bg-rose-50 text-rose-700 border-rose-200 font-semibold';
      icon = '💰';
    } else if (r.includes('ทุนการศึกษา')) {
      color = 'bg-blue-50 text-blue-700 border-blue-200 font-semibold';
      icon = '🎓';
    } else if (r.includes('คะแนนความประพฤติ')) {
      color = 'bg-red-100 text-red-800 border-red-300 font-bold';
      icon = '🚨';
    }
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] border ${color}">${icon} ${escapeHtml(r)}</span>`;
  }).join(' ');
}

/**
 * แสดงข้อมูลการใช้บุหรี่/สุรา/สารเสพติด ตามที่นักเรียนแจ้งในแบบบันทึกจริง
 */
function renderSubstanceBox(stu, compact = false) {
  const rawText = stu.Substance_Raw || 'ไม่ระบุ';
  const tags = stu.Substance_Tags || [];
  const hasRisk = tags.some(t => ['บุหรี่', 'เหล้า/เบียร์', 'น้ำกระท่อม', 'กัญชา'].includes(t));

  if (compact) {
    if (!hasRisk) {
      return `<div class="text-xs text-emerald-700 font-medium">✅ ไม่ดื่ม/ไม่สูบ <span class="text-slate-400 font-normal">(แจ้งว่า: "${escapeHtml(rawText)}")</span></div>`;
    }
    return `
      <div class="text-xs">
        <span class="font-bold text-rose-700">🚬 ${escapeHtml(tags.join(', '))}</span>
        <div class="text-[11px] text-slate-500">แจ้งในแบบบันทึก: "${escapeHtml(rawText)}"</div>
      </div>
    `;
  }

  if (!hasRisk) {
    return `
      <div class="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between gap-2 text-xs">
        <span class="text-emerald-900 font-semibold flex items-center gap-1.5">
          <span class="text-sm">🛡️</span> การใช้บุหรี่/สารเสพติด: <span class="text-emerald-700">ปลอดสารเสพติด</span>
        </span>
        <span class="text-[11px] text-emerald-800 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
          นร.แจ้งว่า: "${escapeHtml(rawText)}"
        </span>
      </div>
    `;
  }

  const isSevere = tags.includes('น้ำกระท่อม') || tags.includes('กัญชา');
  const boxStyle = isSevere
    ? 'bg-red-50/90 border-red-300 text-red-900'
    : 'bg-orange-50/90 border-orange-200 text-orange-950';

  return `
    <div class="p-2.5 rounded-xl border ${boxStyle} text-xs space-y-1.5">
      <div class="flex flex-wrap items-center justify-between gap-1">
        <span class="font-prompt font-bold flex items-center gap-1">
          <span>${isSevere ? '🚨' : '🚬'}</span> ข้อมูลบุหรี่/สารเสพติด:
        </span>
        <div class="flex flex-wrap gap-1">
          ${tags.map(t => {
            if (t === 'กัญชา') return `<span class="px-2 py-0.5 rounded-md bg-red-600 text-white font-bold text-[11px]">🍁 กัญชา</span>`;
            if (t === 'น้ำกระท่อม') return `<span class="px-2 py-0.5 rounded-md bg-rose-600 text-white font-bold text-[11px]">🌿 น้ำกระท่อม</span>`;
            if (t === 'เหล้า/เบียร์') return `<span class="px-2 py-0.5 rounded-md bg-purple-600 text-white font-semibold text-[11px]">🍺 เหล้า/เบียร์</span>`;
            return `<span class="px-2 py-0.5 rounded-md bg-amber-600 text-white font-semibold text-[11px]">🚬 บุหรี่</span>`;
          }).join('')}
        </div>
      </div>
      <div class="text-[11px] bg-white/80 px-2.5 py-1 rounded-lg border border-black/5 text-slate-700 flex items-center justify-between">
        <span class="text-slate-500">ข้อมูลที่นักเรียนแจ้งในแบบบันทึก:</span>
        <b class="text-slate-900">"${escapeHtml(rawText)}"</b>
      </div>
    </div>
  `;
}

/**
 * แสดงป้ายระดับชั้นและกลุ่มเรียนภาษาไทยสวยงาม ("ปวช.1" + "กลุ่ม1") แทนรหัส Code
 */
function renderClassAndGroupBadges(stu) {
  const lvl = stu.ClassGroup?.Level_Year || stu.Level_Year || 'ปวช.1';
  const grp = stu.ClassGroup?.Group_Label || stu.Group_Label || `กลุ่ม${stu.Group_No || 1}`;
  const isPvs = lvl.startsWith('ปวส');
  const lvlBadge = isPvs
    ? 'bg-purple-100 text-purple-900 border-purple-200'
    : 'bg-blue-100 text-blue-900 border-blue-200';
  return `
    <span class="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-prompt font-bold border ${lvlBadge}">${escapeHtml(lvl)}</span>
    <span class="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-prompt font-bold bg-slate-800 text-white">${escapeHtml(grp)}</span>
  `;
}

function getStatusBadge(status) {
  if (status === 'พ้นสภาพ') {
    return `<span class="px-2 py-0.5 rounded-md text-xs font-semibold bg-red-100 text-red-700">พ้นสภาพ</span>`;
  }
  if (status === 'พักการเรียน') {
    return `<span class="px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-100 text-amber-700">พักการเรียน</span>`;
  }
  return `<span class="px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">ปกติ</span>`;
}

function getAvatarHtml(stu, sizeClass = 'w-16 h-16', textClass = 'text-lg') {
  const initials = (stu.Full_Name || 'นร').trim().slice(0, 2);
  if (stu.Photo_URL && stu.Photo_Status === 'มีรูปแล้ว') {
    return `
      <div class="${sizeClass} rounded-2xl overflow-hidden bg-slate-100 border-2 border-white shadow-md shrink-0 relative avatar-wrapper">
        <img src="${escapeHtml(stu.Photo_URL)}" alt="${escapeHtml(stu.Full_Name)}" class="w-full h-full object-cover"
          onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" loading="lazy" />
        <div style="display:none" class="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-prompt font-bold ${textClass} items-center justify-center">
          ${escapeHtml(initials)}
        </div>
      </div>
    `;
  }
  return `
    <div class="${sizeClass} rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 text-slate-600 border-2 border-white shadow-sm shrink-0 flex flex-col items-center justify-center font-prompt font-bold ${textClass}">
      <span>${escapeHtml(initials)}</span>
      <span class="text-[9px] font-normal text-slate-500 -mt-1">ไม่มีรูป</span>
    </div>
  `;
}

// ============================================================================
// Navigation & Main Render Loop
// ============================================================================
function switchMainTab(tabName) {
  window.AppState.currentTab = tabName;
  renderAll();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function jumpToProblemFilter(problemTag, riskLevel = 'ALL') {
  window.AppState.currentTab = 'students';
  window.AppState.filterProblemTag = problemTag;
  window.AppState.filterRisk = riskLevel;
  window.AppState.filterIssueOnly = false;
  window.AppState.filterPhoto = 'ALL';
  renderAll();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function jumpToStudentIssueFilter(issueFilterType) {
  window.AppState.currentTab = 'students';
  window.AppState.searchQuery = '';
  window.AppState.filterClassId = 'ALL';
  window.AppState.filterLevelYear = 'ALL';
  window.AppState.filterGroupLabel = 'ALL';
  window.AppState.filterDistrict = 'ALL';
  window.AppState.filterRisk = 'ALL';
  window.AppState.filterProblemTag = 'ALL';

  if (issueFilterType === 'NO_PHOTO') {
    window.AppState.filterPhoto = 'ยังไม่มีรูป';
    window.AppState.filterIssueOnly = false;
  } else if (issueFilterType === 'CRITICAL_DATA') {
    window.AppState.filterPhoto = 'ALL';
    window.AppState.filterIssueOnly = true;
  }
  renderAll();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderAll() {
  updateNavActiveState();
  populateFilterDropdowns();
  renderDashboardTab();
  renderStudentsTab();
  renderDisciplineTab();
  renderScreeningTab();
  renderSettingsTab();
  if (window.lucide) lucide.createIcons();
}

function updateNavActiveState() {
  const tabs = ['dashboard', 'students', 'discipline', 'screening', 'settings'];
  tabs.forEach(t => {
    const section = document.getElementById(`tab-${t}`);
    if (section) {
      section.classList.toggle('hidden', window.AppState.currentTab !== t);
    }
    const dBtn = document.getElementById(`desktop-nav-${t}`);
    if (dBtn) {
      if (window.AppState.currentTab === t) {
        dBtn.className = 'px-3.5 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 bg-white text-blue-950 shadow-sm transition';
      } else {
        dBtn.className = 'px-3.5 py-2 rounded-xl text-sm font-medium flex items-center gap-2 text-blue-100 hover:bg-white/10 transition';
      }
    }
    const mBtn = document.getElementById(`mobile-nav-${t}`);
    if (mBtn) {
      if (window.AppState.currentTab === t) {
        mBtn.className = 'flex flex-col items-center justify-center py-2 px-1 text-blue-700 font-semibold relative';
      } else {
        mBtn.className = 'flex flex-col items-center justify-center py-2 px-1 text-slate-500 hover:text-slate-800 font-medium relative';
      }
    }
  });
}

function populateFilterDropdowns() {
  const groups = window.appDB.getClassGroups();
  const students = window.appDB.getStudents();

  // Class Group Select (ใช้คำว่า ปวช.1 กลุ่ม1 แทนรหัส Code)
  const classSelect = document.getElementById('filterClassSelect');
  if (classSelect) {
    const currentVal = window.AppState.filterClassId;
    classSelect.innerHTML = `<option value="ALL">ทุกระดับชั้น / ทุกกลุ่ม (${students.length} คน)</option>` +
      groups.map(g => {
        const cnt = students.filter(s => s.Class_ID === g.Class_ID).length;
        return `<option value="${escapeHtml(g.Class_ID)}">${escapeHtml(g.Class_ID)} - ${escapeHtml(g.Major)} (${cnt} คน)</option>`;
      }).join('');
    classSelect.value = currentVal;
  }

  // District Select
  const distCounts = {};
  students.forEach(s => {
    const d = s.Zone_District || 'ไม่ระบุ';
    distCounts[d] = (distCounts[d] || 0) + 1;
  });
  const sortedDistricts = Object.keys(distCounts).sort((a, b) => distCounts[b] - distCounts[a]);

  const distSelect = document.getElementById('filterDistrictSelect');
  if (distSelect) {
    const currentDist = window.AppState.filterDistrict;
    distSelect.innerHTML = `<option value="ALL">ทุกโซนอำเภอ (${sortedDistricts.length} โซน)</option>` +
      sortedDistricts.map(d => `<option value="${escapeHtml(d)}">โซน อ.${escapeHtml(d)} (${distCounts[d]} คน)</option>`).join('');
    distSelect.value = currentDist;
  }

  const scrZoneSelect = document.getElementById('screeningZoneSelect');
  if (scrZoneSelect) {
    const curZ = window.AppState.screeningZoneFilter;
    scrZoneSelect.innerHTML = `<option value="ALL">ทุกโซนพื้นที่เยี่ยมบ้าน (${students.length} คน)</option>` +
      sortedDistricts.map(d => `<option value="${escapeHtml(d)}">โซน อ.${escapeHtml(d)} (${distCounts[d]} คน)</option>`).join('');
    scrZoneSelect.value = curZ;
  }

  const filterRiskSelect = document.getElementById('filterRiskSelect');
  if (filterRiskSelect) {
    filterRiskSelect.value = window.AppState.filterRisk;
  }
}

// ============================================================================
// TAB 1: DASHBOARD, สรุปจำนวนเด็กที่มีปัญหาตามสาเหตุ & คิวตรวจข้อมูล
// ============================================================================
function renderDashboardTab() {
  const all360 = window.appDB.getAllStudents360();
  const groups = window.appDB.getClassGroups();
  const stats = window.appDB.getProblemAndSubstanceSummary();

  const total = all360.length;
  const pvcCount = all360.filter(s => s.ClassGroup.Level === 'ปวช.').length;
  const pvsCount = all360.filter(s => s.ClassGroup.Level === 'ปวส.').length;
  const hasPhoto = all360.filter(s => s.Photo_Status === 'มีรูปแล้ว').length;
  const noPhoto = total - hasPhoto;

  const criticalIssueStudents = all360.filter(s => {
    const nonPhotoIssues = (s.Data_Issues || []).filter(i => i !== 'ยังไม่มีรูปถ่ายนักเรียน');
    return nonPhotoIssues.length > 0;
  });

  const container = document.getElementById('dashboardContent');
  if (!container) return;

  // Group breakdown cards (แสดง "กลุ่ม1", "กลุ่ม2", ... ชัดเจน)
  const groupCardsHtml = groups.map(g => {
    const gStudents = all360.filter(s => s.Class_ID === g.Class_ID);
    const gPhoto = gStudents.filter(s => s.Photo_Status === 'มีรูปแล้ว').length;
    const gSub = gStudents.filter(s => (s.Substance_Tags || []).some(t => ['บุหรี่', 'เหล้า/เบียร์', 'น้ำกระท่อม', 'กัญชา'].includes(t))).length;
    const gProblem = gStudents.filter(s => s.Screening.Overall_Risk_Level === 'กลุ่มมีปัญหา').length;
    const gRisk = gStudents.filter(s => s.Screening.Overall_Risk_Level === 'กลุ่มเสี่ยง').length;

    return `
      <div onclick="filterByClassFromDashboard('${escapeHtml(g.Class_ID)}')"
           class="interactive-card cursor-pointer bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between gap-3 hover:border-blue-400">
        <div class="flex items-start justify-between gap-2">
          <div>
            <div class="flex items-center gap-1.5">
              <span class="px-2.5 py-0.5 rounded-lg text-xs font-prompt font-bold ${g.Level === 'ปวช.' ? 'bg-blue-100 text-blue-900' : 'bg-purple-100 text-purple-900'}">
                ${escapeHtml(g.Level_Year || (g.Level + g.Year))}
              </span>
              <span class="px-2.5 py-0.5 rounded-lg text-xs font-prompt font-bold bg-slate-800 text-white">
                ${escapeHtml(g.Group_Label || ('กลุ่ม' + g.Group_No))}
              </span>
            </div>
            <h4 class="font-prompt font-bold text-slate-900 text-sm sm:text-base mt-2">
              สาขา${escapeHtml(g.Major)}
            </h4>
            <p class="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
              <i data-lucide="user-check" class="w-3.5 h-3.5 text-slate-400"></i>
              ${escapeHtml(g.Advisor_Name)}
            </p>
          </div>
          <div class="text-right shrink-0 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
            <span class="text-xl font-bold font-prompt text-slate-900">${gStudents.length}</span>
            <span class="block text-[10px] text-slate-500">คน</span>
          </div>
        </div>
        <div class="pt-2.5 border-t border-slate-100 grid grid-cols-3 gap-1 text-[11px] text-center">
          <div class="bg-emerald-50 text-emerald-800 rounded-lg py-1 font-medium">รูปครบ ${gPhoto}/${gStudents.length}</div>
          <div class="bg-orange-50 text-orange-800 rounded-lg py-1 font-semibold">ดื่ม/สูบ ${gSub} คน</div>
          <div class="bg-red-50 text-red-800 rounded-lg py-1 font-semibold">เสี่ยง/ปัญหา ${gRisk + gProblem}</div>
        </div>
      </div>
    `;
  }).join('');

  // Critical Data Fix Queue Rows
  const criticalRowsHtml = criticalIssueStudents.length === 0
    ? `<div class="p-5 text-center text-emerald-700 bg-emerald-50 rounded-2xl border border-emerald-200 text-sm font-medium">
         ✅ ข้อมูลหลัก (รหัสนักศึกษา, เบอร์โทรศัพท์ 10 หลัก, ที่อยู่/โซนอำเภอ) ครบถ้วนสมบูรณ์ 100%!
       </div>`
    : criticalIssueStudents.map(stu => {
        const nonPhotoIssues = (stu.Data_Issues || []).filter(i => i !== 'ยังไม่มีรูปถ่ายนักเรียน');
        return `
          <div class="p-3.5 bg-amber-50/70 hover:bg-amber-50 rounded-2xl border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition">
            <div class="flex items-start gap-3">
              ${getAvatarHtml(stu, 'w-12 h-12', 'text-sm')}
              <div>
                <div class="flex flex-wrap items-center gap-1.5">
                  <span class="font-mono text-xs font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded-md">${escapeHtml(stu.Student_ID)}</span>
                  <span class="font-prompt font-bold text-slate-900 text-sm">${escapeHtml(stu.Full_Name)}</span>
                  ${stu.Nickname ? `<span class="text-xs text-slate-500">(${escapeHtml(stu.Nickname)})</span>` : ''}
                  ${renderClassAndGroupBadges(stu)}
                </div>
                <div class="flex flex-wrap gap-1.5 mt-1.5">
                  ${nonPhotoIssues.map(iss => `
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                      <i data-lucide="alert-triangle" class="w-3 h-3"></i> ${escapeHtml(iss)}
                    </span>
                  `).join('')}
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button onclick="openEditStudentModal('${escapeHtml(stu.Student_ID)}')"
                      class="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-prompt font-semibold flex items-center gap-1.5 shadow-sm transition">
                <i data-lucide="edit-3" class="w-3.5 h-3.5"></i> แก้ไขข้อมูลทันที
              </button>
              <button onclick="openStudent360Modal('${escapeHtml(stu.Student_ID)}')"
                      class="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-medium transition">
                ดูโปรไฟล์
              </button>
            </div>
          </div>
        `;
      }).join('');

  container.innerHTML = `
    <!-- 1. KPI Metric Cards ด้านบนสุด -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      <div onclick="resetStudentFilters(); switchMainTab('students')" class="interactive-card cursor-pointer bg-white p-4 rounded-2xl shadow-sm border border-slate-200/90">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-medium text-slate-500">นักเรียนทั้งหมด</span>
          <div class="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><i data-lucide="users" class="w-4 h-4"></i></div>
        </div>
        <div class="text-2xl font-bold font-prompt text-slate-900">${total} <span class="text-xs font-normal text-slate-500">คน</span></div>
        <div class="text-[11px] text-slate-500 mt-1">ปวช. ${pvcCount} • ปวส. ${pvsCount}</div>
      </div>

      <div onclick="jumpToProblemFilter('ALL', 'กลุ่มมีปัญหา')" class="interactive-card cursor-pointer bg-white p-4 rounded-2xl shadow-sm border-2 border-red-200 bg-red-50/20">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-bold text-red-700">🔴 กลุ่มมีปัญหา</span>
          <div class="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center"><i data-lucide="flame" class="w-4 h-4"></i></div>
        </div>
        <div class="text-2xl font-bold font-prompt text-red-600">${stats.riskProblem} <span class="text-xs font-normal text-slate-500">คน</span></div>
        <div class="text-[11px] text-red-700 mt-1 underline">กระท่อม/กัญชา/ปัญหาซ้ำซ้อน</div>
      </div>

      <div onclick="jumpToProblemFilter('ALL', 'กลุ่มเสี่ยง')" class="interactive-card cursor-pointer bg-white p-4 rounded-2xl shadow-sm border border-amber-300 bg-amber-50/20">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-bold text-amber-800">🟠 กลุ่มเสี่ยง</span>
          <div class="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center"><i data-lucide="alert-triangle" class="w-4 h-4"></i></div>
        </div>
        <div class="text-2xl font-bold font-prompt text-amber-600">${stats.riskWarning} <span class="text-xs font-normal text-slate-500">คน</span></div>
        <div class="text-[11px] text-amber-800 mt-1 underline">บุหรี่/สุรา/รายได้ต่ำ/ขอทุน</div>
      </div>

      <div onclick="jumpToProblemFilter('ANY_SUBSTANCE', 'ALL')" class="interactive-card cursor-pointer bg-white p-4 rounded-2xl shadow-sm border border-orange-200">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-semibold text-orange-800">🚬 ดื่ม/สูบ/สารเสพติด</span>
          <div class="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center"><i data-lucide="cigarette" class="w-4 h-4"></i></div>
        </div>
        <div class="text-2xl font-bold font-prompt text-orange-600">${stats.anySubstance} <span class="text-xs font-normal text-slate-500">คน</span></div>
        <div class="text-[11px] text-orange-700 mt-1 underline">ตามที่นักเรียนแจ้งในฟอร์ม</div>
      </div>

      <div onclick="jumpToStudentIssueFilter('NO_PHOTO')" class="interactive-card cursor-pointer bg-white p-4 rounded-2xl shadow-sm border border-slate-200/90">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-medium text-slate-600">รูปถ่ายนักเรียน</span>
          <div class="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><i data-lucide="camera" class="w-4 h-4"></i></div>
        </div>
        <div class="text-2xl font-bold font-prompt text-emerald-600">${hasPhoto}<span class="text-sm text-slate-400">/${total}</span></div>
        <div class="text-[11px] text-amber-600 mt-1 underline">ยังไม่มีรูป ${noPhoto} คน (กดดู)</div>
      </div>

      <div onclick="jumpToStudentIssueFilter('CRITICAL_DATA')" class="interactive-card cursor-pointer bg-white p-4 rounded-2xl shadow-sm border border-slate-200/90">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-semibold text-rose-700">ข้อมูลรอแก้ไข</span>
          <div class="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center"><i data-lucide="wrench" class="w-4 h-4"></i></div>
        </div>
        <div class="text-2xl font-bold font-prompt text-rose-600">${criticalIssueStudents.length} <span class="text-xs font-normal text-slate-500">คน</span></div>
        <div class="text-[11px] text-rose-600 mt-1 underline">เบอร์ผิด/ยังไม่กรอกฟอร์ม</div>
      </div>
    </div>

    <!-- 2. ศูนย์วิเคราะห์และค้นหานักเรียนที่มีปัญหาแยกตามสาเหตุ (กดเพื่อดูรายชื่อทันที) -->
    <div class="bg-white rounded-3xl shadow-sm border border-slate-200/90 p-5 sm:p-6 mb-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
        <div>
          <h2 class="font-prompt font-bold text-base sm:text-lg text-slate-900 flex items-center gap-2">
            <i data-lucide="search-check" class="w-5 h-5 text-indigo-600"></i>
            สรุปจำนวนนักเรียนแยกตามสาเหตุปัญหา & การใช้บุหรี่/สารเสพติด (คลิกที่กล่องเพื่อดูรายชื่อทันที)
          </h2>
          <p class="text-xs text-slate-500 mt-0.5">
            จำแนกจากข้อมูลที่นักเรียนแจ้งจริงในแบบสอบถาม เพื่อให้ครูที่ปรึกษาและงานปกครองรู้ทันทีว่ามีเด็กมีปัญหากี่คน จากเรื่องอะไรบ้าง
          </p>
        </div>
        <button onclick="resetStudentFilters(); switchMainTab('students')" class="self-start sm:self-center px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-prompt font-semibold flex items-center gap-1.5 shrink-0">
          ดูรายชื่อทั้งหมด (${total} คน) <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
        </button>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 mt-4">
        <!-- บุหรี่ -->
        <div onclick="jumpToProblemFilter('สูบบุหรี่')" class="interactive-card cursor-pointer p-3.5 rounded-2xl bg-orange-50/80 hover:bg-orange-100/80 border border-orange-200 flex items-center justify-between">
          <div>
            <div class="text-xs font-prompt font-bold text-orange-900">🚬 สูบบุหรี่</div>
            <div class="text-[11px] text-orange-700 mt-0.5">แจ้งในแบบบันทึก</div>
          </div>
          <div class="text-xl font-prompt font-bold text-orange-700 bg-white px-2.5 py-1 rounded-xl border border-orange-200">${stats.smoke} คน</div>
        </div>

        <!-- เหล้า/เบียร์ -->
        <div onclick="jumpToProblemFilter('ดื่มเหล้า/เบียร์')" class="interactive-card cursor-pointer p-3.5 rounded-2xl bg-purple-50/80 hover:bg-purple-100/80 border border-purple-200 flex items-center justify-between">
          <div>
            <div class="text-xs font-prompt font-bold text-purple-900">🍺 ดื่มเหล้า/เบียร์</div>
            <div class="text-[11px] text-purple-700 mt-0.5">แจ้งในแบบบันทึก</div>
          </div>
          <div class="text-xl font-prompt font-bold text-purple-700 bg-white px-2.5 py-1 rounded-xl border border-purple-200">${stats.alcohol} คน</div>
        </div>

        <!-- น้ำกระท่อม -->
        <div onclick="jumpToProblemFilter('น้ำกระท่อม')" class="interactive-card cursor-pointer p-3.5 rounded-2xl bg-rose-50/90 hover:bg-rose-100/80 border border-rose-300 flex items-center justify-between">
          <div>
            <div class="text-xs font-prompt font-bold text-rose-900">🌿 ดื่มน้ำกระท่อม</div>
            <div class="text-[11px] text-rose-700 mt-0.5">เฝ้าระวังเข้มงวด</div>
          </div>
          <div class="text-xl font-prompt font-bold text-rose-700 bg-white px-2.5 py-1 rounded-xl border border-rose-300">${stats.kratom} คน</div>
        </div>

        <!-- กัญชา -->
        <div onclick="jumpToProblemFilter('กัญชา')" class="interactive-card cursor-pointer p-3.5 rounded-2xl bg-red-50 hover:bg-red-100 border border-red-300 flex items-center justify-between">
          <div>
            <div class="text-xs font-prompt font-bold text-red-900">🍁 ใช้กัญชา</div>
            <div class="text-[11px] text-red-700 mt-0.5">กลุ่มมีปัญหาเร่งด่วน</div>
          </div>
          <div class="text-xl font-prompt font-bold text-red-700 bg-white px-2.5 py-1 rounded-xl border border-red-300">${stats.weed} คน</div>
        </div>

        <!-- ปลอดสารเสพติด -->
        <div onclick="jumpToProblemFilter('NO_SUBSTANCE')" class="interactive-card cursor-pointer p-3.5 rounded-2xl bg-emerald-50/80 hover:bg-emerald-100/80 border border-emerald-200 flex items-center justify-between">
          <div>
            <div class="text-xs font-prompt font-bold text-emerald-900">✅ ไม่ดื่ม/ไม่สูบ</div>
            <div class="text-[11px] text-emerald-700 mt-0.5">ปลอดสารเสพติด</div>
          </div>
          <div class="text-xl font-prompt font-bold text-emerald-700 bg-white px-2.5 py-1 rounded-xl border border-emerald-200">${stats.cleanSubstance} คน</div>
        </div>

        <!-- รายได้ต่ำกว่า 10,000 -->
        <div onclick="jumpToProblemFilter('รายได้ต่ำ (<10,000 บ.)')" class="interactive-card cursor-pointer p-3.5 rounded-2xl bg-amber-50/80 hover:bg-amber-100/80 border border-amber-200 flex items-center justify-between">
          <div>
            <div class="text-xs font-prompt font-bold text-amber-900">💰 รายได้ต่ำ</div>
            <div class="text-[11px] text-amber-700 mt-0.5">ต่ำกว่า 10,000 บ./เดือน</div>
          </div>
          <div class="text-xl font-prompt font-bold text-amber-800 bg-white px-2.5 py-1 rounded-xl border border-amber-200">${stats.lowIncome} คน</div>
        </div>

        <!-- ต้องการทุนการศึกษา -->
        <div onclick="jumpToProblemFilter('ต้องการทุนการศึกษา')" class="interactive-card cursor-pointer p-3.5 rounded-2xl bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200 flex items-center justify-between">
          <div>
            <div class="text-xs font-prompt font-bold text-blue-900">🎓 ต้องการทุนฯ</div>
            <div class="text-[11px] text-blue-700 mt-0.5">แจ้งความประสงค์ขอทุน</div>
          </div>
          <div class="text-xl font-prompt font-bold text-blue-700 bg-white px-2.5 py-1 rounded-xl border border-blue-200">${stats.scholarship} คน</div>
        </div>

        <!-- เงินมาเรียนน้อย (<100 บ.) -->
        <div onclick="jumpToProblemFilter('ค่าขนมน้อย (<100 บ.)')" class="interactive-card cursor-pointer p-3.5 rounded-2xl bg-pink-50/80 hover:bg-pink-100/80 border border-pink-200 flex items-center justify-between">
          <div>
            <div class="text-xs font-prompt font-bold text-pink-900">💸 ค่าขนมน้อย</div>
            <div class="text-[11px] text-pink-700 mt-0.5">น้อยกว่า 100 บาท/วัน</div>
          </div>
          <div class="text-xl font-prompt font-bold text-pink-700 bg-white px-2.5 py-1 rounded-xl border border-pink-200">${stats.lowAllowance} คน</div>
        </div>

        <!-- ถูกหักคะแนนความประพฤติ -->
        <div onclick="jumpToProblemFilter('ถูกหักคะแนนความประพฤติ')" class="interactive-card cursor-pointer p-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-300 flex items-center justify-between">
          <div>
            <div class="text-xs font-prompt font-bold text-slate-900">🚨 ถูกตัดคะแนน</div>
            <div class="text-[11px] text-slate-600 mt-0.5">มีประวัติงานปกครอง</div>
          </div>
          <div class="text-xl font-prompt font-bold text-slate-800 bg-white px-2.5 py-1 rounded-xl border border-slate-300">${stats.disciplineDeducted} คน</div>
        </div>

        <!-- กลุ่มปกติ -->
        <div onclick="jumpToProblemFilter('ALL', 'กลุ่มปกติ')" class="interactive-card cursor-pointer p-3.5 rounded-2xl bg-teal-50/80 hover:bg-teal-100/80 border border-teal-200 flex items-center justify-between">
          <div>
            <div class="text-xs font-prompt font-bold text-teal-900">🟢 กลุ่มปกติ</div>
            <div class="text-[11px] text-teal-700 mt-0.5">ไม่พบความเสี่ยงใดๆ</div>
          </div>
          <div class="text-xl font-prompt font-bold text-teal-700 bg-white px-2.5 py-1 rounded-xl border border-teal-200">${stats.riskNormal} คน</div>
        </div>
      </div>
    </div>

    <!-- 3. สรุปข้อมูลแยกตามกลุ่มเรียน (ใช้คำว่า กลุ่ม1 - กลุ่ม5) -->
    <div class="mb-6">
      <div class="flex items-center justify-between mb-3">
        <div>
          <h2 class="font-prompt font-bold text-base sm:text-lg text-slate-900 flex items-center gap-2">
            <i data-lucide="layers" class="w-5 h-5 text-blue-700"></i>
            ข้อมูลชั้นเรียนและกลุ่มเรียน (ปวช.1 กลุ่ม1–4 • ปวช.2 กลุ่ม4 • ปวส.1 กลุ่ม1, 2, 5)
          </h2>
          <p class="text-xs text-slate-500">แตะที่การ์ดกลุ่มเรียนเพื่อดูรายชื่อนักเรียนเฉพาะกลุ่มนั้น</p>
        </div>
        <button onclick="switchMainTab('settings')" class="text-xs font-prompt font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1">
          <i data-lucide="settings" class="w-3.5 h-3.5"></i> แก้ไขชื่อครูที่ปรึกษา
        </button>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        ${groupCardsHtml}
      </div>
    </div>

    <!-- 4. กล่องคิวแก้ไขข้อมูลที่ผิดพลาด (Data Fix Queue) -->
    <div class="bg-white rounded-3xl shadow-sm border border-slate-200/90 p-5 sm:p-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div class="flex items-start sm:items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <i data-lucide="clipboard-check" class="w-5 h-5"></i>
          </div>
          <div>
            <h2 class="font-prompt font-bold text-base sm:text-lg text-slate-900">
              รายการตรวจพบข้อมูลพื้นฐาน/เบอร์โทรศัพท์ไม่สมบูรณ์ (${criticalIssueStudents.length} รายการ)
            </h2>
            <p class="text-xs text-slate-500">
              สามารถกดปุ่ม <b>"แก้ไขข้อมูลทันที"</b> เพื่อซ่อมข้อมูลให้ถูกต้องสมบูรณ์ได้เลย
            </p>
          </div>
        </div>
      </div>
      <div class="mt-4 space-y-2.5">
        ${criticalRowsHtml}
      </div>
    </div>
  `;
}

function filterByClassFromDashboard(classId) {
  window.AppState.currentTab = 'students';
  window.AppState.filterClassId = classId;
  window.AppState.filterLevelYear = 'ALL';
  window.AppState.filterGroupLabel = 'ALL';
  window.AppState.filterIssueOnly = false;
  window.AppState.filterPhoto = 'ALL';
  window.AppState.filterRisk = 'ALL';
  window.AppState.filterProblemTag = 'ALL';
  renderAll();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================================
// TAB 2: ทำเนียบนักเรียน & ค้นหาตามกลุ่ม/สารเสพติด/สาเหตุความเสี่ยง
// ============================================================================
function getFilteredStudents360() {
  const all = window.appDB.getAllStudents360();
  const q = (window.AppState.searchQuery || '').trim().toLowerCase();

  return all.filter(s => {
    if (window.AppState.filterClassId !== 'ALL' && s.Class_ID !== window.AppState.filterClassId) return false;
    if (window.AppState.filterLevelYear !== 'ALL' && s.ClassGroup.Level_Year !== window.AppState.filterLevelYear) return false;
    if (window.AppState.filterGroupLabel !== 'ALL' && s.ClassGroup.Group_Label !== window.AppState.filterGroupLabel) return false;
    if (window.AppState.filterDistrict !== 'ALL' && s.Zone_District !== window.AppState.filterDistrict) return false;
    if (window.AppState.filterPhoto !== 'ALL' && s.Photo_Status !== window.AppState.filterPhoto) return false;
    if (window.AppState.filterRisk !== 'ALL' && s.Screening.Overall_Risk_Level !== window.AppState.filterRisk) return false;

    // กรองตามสาเหตุปัญหา / การใช้สารเสพติด
    const pTag = window.AppState.filterProblemTag;
    if (pTag !== 'ALL') {
      const subTags = s.Substance_Tags || [];
      const riskTags = (s.Screening && s.Screening.Risk_Tags) || [];
      if (pTag === 'ANY_SUBSTANCE') {
        if (!subTags.some(t => ['บุหรี่', 'เหล้า/เบียร์', 'น้ำกระท่อม', 'กัญชา'].includes(t))) return false;
      } else if (pTag === 'NO_SUBSTANCE') {
        if (!subTags.includes('ไม่ดื่ม/ไม่สูบ')) return false;
      } else {
        if (!subTags.includes(pTag) && !riskTags.includes(pTag)) return false;
      }
    }

    if (window.AppState.filterIssueOnly) {
      const nonPhotoIssues = (s.Data_Issues || []).filter(i => i !== 'ยังไม่มีรูปถ่ายนักเรียน');
      if (nonPhotoIssues.length === 0) return false;
    }

    if (q) {
      const hay = [
        s.Student_ID,
        s.Full_Name,
        s.Nickname,
        s.Class_ID,
        s.Group_Label,
        s.Phone_Number,
        s.Parent_Name,
        s.Parent_Phone,
        s.Zone_District,
        s.Subdistrict,
        s.Previous_School,
        s.Substance_Raw,
        s.Substance_Clean,
        (s.Screening && s.Screening.Risk_Factors_Note) || ''
      ].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function renderStudentsTab() {
  const all360 = window.appDB.getAllStudents360();
  const stats = window.appDB.getProblemAndSubstanceSummary();

  // 1. Render Quick Group Filter Bar (ระดับชั้น + กลุ่ม1 ถึง กลุ่ม5)
  const groupBar = document.getElementById('quickGroupFilterBar');
  if (groupBar) {
    const levels = ['ALL', 'ปวช.1', 'ปวช.2', 'ปวส.1'];
    const groupLabels = ['ALL', 'กลุ่ม1', 'กลุ่ม2', 'กลุ่ม3', 'กลุ่ม4', 'กลุ่ม5'];

    groupBar.innerHTML = `
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span class="text-xs font-prompt font-bold text-slate-500 mr-1 shrink-0">ระดับชั้น:</span>
          ${levels.map(lv => {
            const active = window.AppState.filterLevelYear === lv && window.AppState.filterClassId === 'ALL';
            const cnt = lv === 'ALL' ? all360.length : all360.filter(s => s.ClassGroup.Level_Year === lv).length;
            return `
              <button onclick="setQuickLevelFilter('${lv}')"
                      class="px-3 py-1.5 rounded-xl text-xs font-prompt font-semibold whitespace-nowrap transition ${active ? 'bg-blue-700 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">
                ${lv === 'ALL' ? `ทุกระดับชั้น (${cnt})` : `${lv} (${cnt})`}
              </button>
            `;
          }).join('')}
        </div>

        <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span class="text-xs font-prompt font-bold text-slate-500 mr-1 shrink-0">เลือกกลุ่มเรียน:</span>
          ${groupLabels.map(gl => {
            const active = window.AppState.filterGroupLabel === gl && window.AppState.filterClassId === 'ALL';
            const cnt = gl === 'ALL'
              ? all360.length
              : all360.filter(s => (window.AppState.filterLevelYear === 'ALL' || s.ClassGroup.Level_Year === window.AppState.filterLevelYear) && s.ClassGroup.Group_Label === gl).length;
            return `
              <button onclick="setQuickGroupLabelFilter('${gl}')"
                      class="px-3 py-1.5 rounded-xl text-xs font-prompt font-semibold whitespace-nowrap transition ${active ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">
                ${gl === 'ALL' ? `ทุกกลุ่ม` : `${gl} (${cnt})`}
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  // 2. Render Quick Problem & Substance Filter Bar (ค้นหาได้ง่ายว่ามีเด็กมีปัญหากี่คนจากเรื่องอะไร)
  const problemBar = document.getElementById('quickProblemFilterBar');
  if (problemBar) {
    const problemPills = [
      { id: 'ALL', label: `ทั้งหมด (${stats.total})` },
      { id: 'สูบบุหรี่', label: `🚬 สูบบุหรี่ (${stats.smoke})` },
      { id: 'ดื่มเหล้า/เบียร์', label: `🍺 ดื่มเหล้า/เบียร์ (${stats.alcohol})` },
      { id: 'น้ำกระท่อม', label: `🌿 น้ำกระท่อม (${stats.kratom})` },
      { id: 'กัญชา', label: `🍁 กัญชา (${stats.weed})` },
      { id: 'ANY_SUBSTANCE', label: `🔥 ดื่ม/สูบทุกชนิด (${stats.anySubstance})` },
      { id: 'NO_SUBSTANCE', label: `✅ ไม่ดื่ม/ไม่สูบ (${stats.cleanSubstance})` },
      { id: 'รายได้ต่ำ (<10,000 บ.)', label: `💰 รายได้ต่ำ <10,000 (${stats.lowIncome})` },
      { id: 'ต้องการทุนการศึกษา', label: `🎓 ต้องการทุนฯ (${stats.scholarship})` },
      { id: 'ค่าขนมน้อย (<100 บ.)', label: `💸 ค่าขนม <100 บ. (${stats.lowAllowance})` }
    ];

    problemBar.innerHTML = `
      <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <span class="text-xs font-prompt font-bold text-rose-700 mr-1 shrink-0 flex items-center gap-1">
          <i data-lucide="filter" class="w-3.5 h-3.5"></i> กรองตามปัญหา/สารเสพติด:
        </span>
        ${problemPills.map(p => {
          const active = window.AppState.filterProblemTag === p.id;
          return `
            <button onclick="setQuickProblemTag('${p.id}')"
                    class="px-3 py-1.5 rounded-xl text-xs font-prompt font-semibold whitespace-nowrap transition ${active ? 'bg-rose-600 text-white shadow-sm' : 'bg-rose-50/70 text-rose-900 border border-rose-200 hover:bg-rose-100'}">
              ${p.label}
            </button>
          `;
        }).join('')}
      </div>
    `;
  }

  const filtered = getFilteredStudents360();
  const countEl = document.getElementById('filteredStudentCount');
  if (countEl) countEl.textContent = `${filtered.length} คน`;

  // Update view mode buttons
  const btnGrid = document.getElementById('btnViewGrid');
  const btnTable = document.getElementById('btnViewTable');
  if (btnGrid && btnTable) {
    if (window.AppState.studentViewMode === 'grid') {
      btnGrid.className = 'px-2.5 py-1 rounded-lg text-xs font-prompt font-semibold flex items-center gap-1 bg-white text-slate-900 shadow-sm';
      btnTable.className = 'px-2.5 py-1 rounded-lg text-xs font-prompt font-medium flex items-center gap-1 text-slate-600';
    } else {
      btnTable.className = 'px-2.5 py-1 rounded-lg text-xs font-prompt font-semibold flex items-center gap-1 bg-white text-slate-900 shadow-sm';
      btnGrid.className = 'px-2.5 py-1 rounded-lg text-xs font-prompt font-medium flex items-center gap-1 text-slate-600';
    }
  }

  const issueBtn = document.getElementById('toggleIssueOnlyBtn');
  if (issueBtn) {
    if (window.AppState.filterIssueOnly) {
      issueBtn.className = 'px-3 py-1.5 rounded-xl text-xs font-prompt font-semibold flex items-center gap-1.5 bg-red-600 text-white shadow-sm transition shrink-0';
    } else {
      issueBtn.className = 'px-3 py-1.5 rounded-xl text-xs font-prompt font-medium flex items-center gap-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 transition shrink-0';
    }
  }

  const gridContainer = document.getElementById('studentsGridContainer');
  const tableContainer = document.getElementById('studentsTableContainer');
  if (!gridContainer || !tableContainer) return;

  if (window.AppState.studentViewMode === 'grid') {
    gridContainer.classList.remove('hidden');
    tableContainer.classList.add('hidden');
  } else {
    gridContainer.classList.add('hidden');
    tableContainer.classList.remove('hidden');
  }

  if (filtered.length === 0) {
    const emptyHtml = `
      <div class="col-span-full bg-white rounded-3xl p-10 text-center border border-slate-200">
        <div class="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
          <i data-lucide="search-x" class="w-6 h-6"></i>
        </div>
        <h3 class="font-prompt font-bold text-slate-800">ไม่พบข้อมูลนักเรียนตามเงื่อนไขที่เลือก</h3>
        <p class="text-xs text-slate-500 mt-1">ลองกดปุ่ม "ล้างตัวกรองทั้งหมด" เพื่อดูรายชื่อทั้งหมด 125 คน</p>
        <button onclick="resetStudentFilters()" class="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-prompt font-semibold">
          ล้างตัวกรองทั้งหมด
        </button>
      </div>
    `;
    gridContainer.innerHTML = emptyHtml;
    tableContainer.innerHTML = emptyHtml;
    return;
  }

  // Render Polished Mobile-First & PC Cards
  gridContainer.innerHTML = filtered.map(stu => {
    const nonPhotoIssues = (stu.Data_Issues || []).filter(i => i !== 'ยังไม่มีรูปถ่ายนักเรียน');
    const riskLvl = stu.Screening.Overall_Risk_Level;
    const borderAccent = riskLvl === 'กลุ่มมีปัญหา'
      ? 'border-l-4 border-l-red-500 border-slate-200'
      : riskLvl === 'กลุ่มเสี่ยง'
        ? 'border-l-4 border-l-amber-500 border-slate-200'
        : 'border-l-4 border-l-emerald-500 border-slate-200';

    return `
      <div class="interactive-card bg-white rounded-3xl border ${borderAccent} shadow-sm p-4 sm:p-5 flex flex-col justify-between gap-3.5">
        <div class="space-y-3">
          <!-- 1. Card Header: Photo, ID, Name, Level & "กลุ่ม1" Badge -->
          <div class="flex items-start gap-3.5">
            <div onclick="openStudent360Modal('${escapeHtml(stu.Student_ID)}')" class="cursor-pointer">
              ${getAvatarHtml(stu, 'w-16 h-16', 'text-lg')}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-1">
                <span class="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                  ${escapeHtml(stu.Student_ID)}
                </span>
                ${getRiskBadge(riskLvl)}
              </div>
              <h3 onclick="openStudent360Modal('${escapeHtml(stu.Student_ID)}')"
                  class="font-prompt font-bold text-slate-900 text-base mt-1 truncate cursor-pointer hover:text-blue-700">
                ${escapeHtml(stu.Full_Name)}
                ${stu.Nickname ? `<span class="text-xs font-normal text-slate-500">(${escapeHtml(stu.Nickname)})</span>` : ''}
              </h3>
              <div class="flex flex-wrap items-center gap-1.5 mt-1.5">
                ${renderClassAndGroupBadges(stu)}
                <span class="text-[11px] text-slate-500 truncate">${escapeHtml(stu.ClassGroup.Major)}</span>
              </div>
            </div>
          </div>

          <!-- 2. กล่องแสดงข้อมูลบุหรี่/สารเสพติด ตามที่นักเรียนแจ้งในแบบบันทึกจริง -->
          ${renderSubstanceBox(stu, false)}

          <!-- 3. กล่องระบุสาเหตุความเสี่ยง/ปัญหาชัดเจน (รู้ทันทีว่าเสี่ยงเรื่องอะไร) -->
          <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div class="text-[11px] font-prompt font-bold text-slate-600 flex items-center justify-between">
              <span>📌 สาเหตุความเสี่ยง / เรื่องที่ต้องดูแล:</span>
              <span class="text-slate-500 font-normal">คะแนนความประพฤติ: <b class="${stu.BehaviorScore < 80 ? 'text-red-600' : 'text-emerald-700'}">${stu.BehaviorScore}</b></span>
            </div>
            <div class="flex flex-wrap gap-1">
              ${renderRiskReasonBadges(stu)}
            </div>
          </div>

          <!-- 4. ข้อมูลติดต่อและโซนอำเภอ -->
          <div class="pt-1 space-y-1.5 text-xs text-slate-600">
            <div class="flex items-center justify-between">
              <span class="text-slate-400 flex items-center gap-1"><i data-lucide="map-pin" class="w-3.5 h-3.5"></i> โซนบ้านพัก:</span>
              <span class="font-semibold text-slate-800">อ.${escapeHtml(stu.Zone_District)} ${stu.Subdistrict ? `(ต.${escapeHtml(stu.Subdistrict)})` : ''}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-400 flex items-center gap-1"><i data-lucide="phone" class="w-3.5 h-3.5"></i> เบอร์นักเรียน:</span>
              ${stu.Phone_Number
                ? `<a href="tel:${escapeHtml(stu.Phone_Number)}" class="font-bold text-blue-700 hover:underline flex items-center gap-1">${escapeHtml(stu.Phone_Number)}</a>`
                : `<span class="text-red-500 font-medium">ยังไม่ระบุ</span>`}
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-400 flex items-center gap-1"><i data-lucide="heart-handshake" class="w-3.5 h-3.5"></i> เบอร์ผู้ปกครอง:</span>
              ${stu.Parent_Phone
                ? `<a href="tel:${escapeHtml(stu.Parent_Phone)}" class="font-bold text-emerald-700 hover:underline">${escapeHtml(stu.Parent_Phone)} (${escapeHtml(stu.Parent_Name || 'ผปก.')})</a>`
                : `<span class="text-red-500 font-medium">ยังไม่ระบุ</span>`}
            </div>
          </div>

          ${nonPhotoIssues.length > 0 ? `
            <div class="p-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-1.5">
              <i data-lucide="alert-triangle" class="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5"></i>
              <span>ข้อมูลรอแก้ไข: ${escapeHtml(nonPhotoIssues.join(', '))}</span>
            </div>
          ` : ''}
        </div>

        <!-- Mobile-Friendly Action Bar -->
        <div class="pt-3 border-t border-slate-100 grid grid-cols-3 gap-1.5">
          <button onclick="openStudent360Modal('${escapeHtml(stu.Student_ID)}')"
                  class="py-2 px-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-prompt font-semibold flex items-center justify-center gap-1 shadow-sm transition">
            <i data-lucide="eye" class="w-3.5 h-3.5"></i> โปรไฟล์ 360°
          </button>
          <button onclick="openEditStudentModal('${escapeHtml(stu.Student_ID)}')"
                  class="py-2 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-prompt font-semibold flex items-center justify-center gap-1 transition">
            <i data-lucide="edit-3" class="w-3.5 h-3.5"></i> แก้ไขข้อมูล
          </button>
          <button onclick="openDisciplineModal('${escapeHtml(stu.Student_ID)}')"
                  class="py-2 px-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-prompt font-semibold flex items-center justify-center gap-1 transition">
            <i data-lucide="shield-alert" class="w-3.5 h-3.5"></i> ตัดคะแนน
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Render PC Table View (แสดงกลุ่ม1-5, ข้อมูลบุหรี่ที่แจ้ง และสาเหตุความเสี่ยงครบถ้วน)
  tableContainer.innerHTML = `
    <div class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr class="bg-slate-900 text-white font-prompt text-xs">
              <th class="py-3.5 px-3">รูป</th>
              <th class="py-3.5 px-3">รหัสนักศึกษา</th>
              <th class="py-3.5 px-3">ชื่อ-นามสกุล (ชื่อเล่น)</th>
              <th class="py-3.5 px-3">ระดับชั้น / กลุ่ม</th>
              <th class="py-3.5 px-3">บุหรี่/สารเสพติด (ตามที่แจ้ง)</th>
              <th class="py-3.5 px-3">ระดับความเสี่ยง & สาเหตุ</th>
              <th class="py-3.5 px-3">โซนอำเภอ / เบอร์โทร</th>
              <th class="py-3.5 px-3 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            ${filtered.map(stu => `
              <tr class="hover:bg-blue-50/40 transition">
                <td class="py-3 px-3 cursor-pointer" onclick="openStudent360Modal('${escapeHtml(stu.Student_ID)}')">
                  ${getAvatarHtml(stu, 'w-11 h-11', 'text-xs')}
                </td>
                <td class="py-3 px-3 font-mono font-bold text-blue-900 whitespace-nowrap">${escapeHtml(stu.Student_ID)}</td>
                <td class="py-3 px-3 font-medium text-slate-900">
                  <div class="font-prompt font-bold cursor-pointer hover:text-blue-700" onclick="openStudent360Modal('${escapeHtml(stu.Student_ID)}')">
                    ${escapeHtml(stu.Full_Name)} ${stu.Nickname ? `<span class="text-slate-500 font-normal">(${escapeHtml(stu.Nickname)})</span>` : ''}
                  </div>
                  <div class="text-[11px] text-slate-500">ความประพฤติ: <b>${stu.BehaviorScore}</b> คะแนน</div>
                </td>
                <td class="py-3 px-3 whitespace-nowrap">
                  <div class="flex items-center gap-1">${renderClassAndGroupBadges(stu)}</div>
                  <div class="text-[11px] text-slate-500 mt-0.5">${escapeHtml(stu.ClassGroup.Major)}</div>
                </td>
                <td class="py-3 px-3">
                  ${renderSubstanceBox(stu, true)}
                </td>
                <td class="py-3 px-3">
                  <div class="mb-1">${getRiskBadge(stu.Screening.Overall_Risk_Level)}</div>
                  <div class="flex flex-wrap gap-1">${renderRiskReasonBadges(stu)}</div>
                </td>
                <td class="py-3 px-3 whitespace-nowrap text-xs">
                  <div class="font-semibold text-slate-800">อ.${escapeHtml(stu.Zone_District)}</div>
                  <div>นร: ${stu.Phone_Number ? `<a href="tel:${escapeHtml(stu.Phone_Number)}" class="text-blue-700 font-semibold">${escapeHtml(stu.Phone_Number)}</a>` : '<span class="text-red-500">-</span>'}</div>
                  <div>ผปก: ${stu.Parent_Phone ? `<a href="tel:${escapeHtml(stu.Parent_Phone)}" class="text-emerald-700 font-semibold">${escapeHtml(stu.Parent_Phone)}</a>` : '<span class="text-red-500">-</span>'}</div>
                </td>
                <td class="py-3 px-3 text-right whitespace-nowrap">
                  <div class="inline-flex items-center gap-1">
                    <button onclick="openStudent360Modal('${escapeHtml(stu.Student_ID)}')" class="px-2.5 py-1.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-xs font-prompt font-semibold">ดู 360°</button>
                    <button onclick="openEditStudentModal('${escapeHtml(stu.Student_ID)}')" class="px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-800 hover:bg-slate-200 text-xs font-prompt font-semibold">แก้ไข</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function setQuickLevelFilter(lv) {
  window.AppState.filterLevelYear = lv;
  window.AppState.filterClassId = 'ALL';
  renderStudentsTab();
  if (window.lucide) lucide.createIcons();
}

function setQuickGroupLabelFilter(gl) {
  window.AppState.filterGroupLabel = gl;
  window.AppState.filterClassId = 'ALL';
  renderStudentsTab();
  if (window.lucide) lucide.createIcons();
}

function setQuickProblemTag(tag) {
  window.AppState.filterProblemTag = tag;
  renderStudentsTab();
  if (window.lucide) lucide.createIcons();
}

function resetStudentFilters() {
  window.AppState.searchQuery = '';
  window.AppState.filterLevelYear = 'ALL';
  window.AppState.filterGroupLabel = 'ALL';
  window.AppState.filterClassId = 'ALL';
  window.AppState.filterDistrict = 'ALL';
  window.AppState.filterPhoto = 'ALL';
  window.AppState.filterRisk = 'ALL';
  window.AppState.filterProblemTag = 'ALL';
  window.AppState.filterIssueOnly = false;
  const searchInput = document.getElementById('studentSearchInput');
  if (searchInput) searchInput.value = '';
  renderAll();
}

// ============================================================================
// TAB 3: DISCIPLINE RECORDS (ตารางที่ 3: งานปกครองและบันทึกคะแนนความประพฤติ)
// ============================================================================
function renderDisciplineTab() {
  const container = document.getElementById('disciplineContent');
  if (!container) return;

  const records = window.appDB.db.Discipline_Records || [];
  const all360 = window.appDB.getAllStudents360();

  container.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-1">
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-5 sticky top-20">
          <div class="flex items-center gap-2.5 pb-3 border-b border-slate-100 mb-4">
            <div class="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <i data-lucide="shield-alert" class="w-5 h-5"></i>
            </div>
            <div>
              <h3 class="font-prompt font-bold text-slate-900 text-base">บันทึกพฤติกรรม / ตัดคะแนน</h3>
              <p class="text-xs text-slate-500">ตารางที่ 3: Discipline_Records</p>
            </div>
          </div>

          <form onsubmit="submitQuickDisciplineForm(event)" class="space-y-3.5 text-sm">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">เลือกนักเรียนที่กระทำผิด *</label>
              <select id="discFormStudentId" required class="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">-- ค้นหา/เลือกนักเรียน (125 คน) --</option>
                ${all360.map(s => `<option value="${escapeHtml(s.Student_ID)}">${escapeHtml(s.Student_ID)} - ${escapeHtml(s.Full_Name)} (${escapeHtml(s.Class_ID)})</option>`).join('')}
              </select>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">หมวดความผิด *</label>
                <select id="discFormCategory" required onchange="autoSetDisciplinePoints(this.value)" class="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none">
                  <option value="มาสาย">มาสาย (-5)</option>
                  <option value="การแต่งกาย">การแต่งกาย/ทรงผม (-5)</option>
                  <option value="หนีเรียน">ขาดเรียน/หนีเรียน (-10)</option>
                  <option value="บุหรี่/สารเสพติด">บุหรี่/บุหรี่ไฟฟ้า/สารเสพติด (-20)</option>
                  <option value="ทะเลาะวิวาท">ทะเลาะวิวาท (-30)</option>
                  <option value="อื่นๆ">อื่นๆ (-5)</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">คะแนนที่หัก (ติดลบ) *</label>
                <input type="number" id="discFormPoints" value="-5" max="0" min="-100" required
                       class="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-bold text-red-600 outline-none" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">การดำเนินการ (Action_Taken) *</label>
              <select id="discFormAction" required class="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none">
                <option value="ตักเตือนด้วยวาจา">ตักเตือนด้วยวาจา</option>
                <option value="บำเพ็ญประโยชน์">บำเพ็ญประโยชน์</option>
                <option value="ทำทัณฑ์บน">ทำทัณฑ์บน</option>
                <option value="เชิญผู้ปกครอง">เชิญผู้ปกครอง</option>
                <option value="พักการเรียน">เสนอพักการเรียน</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">รายละเอียดพฤติกรรม (Description)</label>
              <textarea id="discFormDesc" rows="2" placeholder="ระบุสถานที่ เวลา หรือรายละเอียดเหตุการณ์..."
                        class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none"></textarea>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">ครูผู้รายงาน (Teacher_Reported)</label>
              <input type="text" id="discFormTeacher" value="ครูที่ปรึกษา / งานปกครอง" required
                     class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none" />
            </div>

            <button type="submit" class="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-prompt font-semibold text-sm shadow-md flex items-center justify-center gap-2 transition">
              <i data-lucide="save" class="w-4 h-4"></i> บันทึกการตัดคะแนน
            </button>
          </form>
        </div>
      </div>

      <div class="lg:col-span-2 space-y-6">
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-5">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="font-prompt font-bold text-slate-900 text-base">ประวัติการบันทึกพฤติกรรมล่าสุด (${records.length} รายการ)</h3>
              <p class="text-xs text-slate-500">เมื่อบันทึกแล้ว ระบบจะอัปเดตสาเหตุความเสี่ยงของนักเรียนคนนั้นให้อัตโนมัติ</p>
            </div>
          </div>

          ${records.length === 0 ? `
            <div class="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <i data-lucide="check-circle" class="w-8 h-8 text-emerald-500 mx-auto mb-2"></i>
              <p class="font-prompt font-semibold text-slate-700 text-sm">ยังไม่มีประวัติการตัดคะแนนความประพฤติ</p>
              <p class="text-xs text-slate-500 mt-0.5">นักเรียนทั้ง 125 คนมีคะแนนความประพฤติตั้งต้น 100 คะแนน</p>
            </div>
          ` : `
            <div class="space-y-3">
              ${records.map(r => {
                const stu = window.appDB.getStudent360(r.Student_ID);
                const dateStr = new Date(r.Date_Time).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
                return `
                  <div class="p-3.5 rounded-2xl border border-slate-200 hover:border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div class="flex items-start gap-3">
                      <div class="px-2.5 py-1.5 rounded-xl bg-rose-100 text-rose-700 font-prompt font-bold text-sm shrink-0">
                        ${r.Points_Deducted}
                      </div>
                      <div>
                        <div class="flex flex-wrap items-center gap-1.5">
                          <span onclick="openStudent360Modal('${escapeHtml(r.Student_ID)}')" class="font-prompt font-bold text-slate-900 text-sm cursor-pointer hover:text-blue-700">
                            ${stu ? escapeHtml(stu.Full_Name) : escapeHtml(r.Student_ID)}
                          </span>
                          ${stu ? renderClassAndGroupBadges(stu) : ''}
                          <span class="text-xs px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-semibold border border-rose-200">${escapeHtml(r.Violation_Category)}</span>
                          <span class="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">${escapeHtml(r.Action_Taken)}</span>
                        </div>
                        ${r.Description ? `<p class="text-xs text-slate-600 mt-1">${escapeHtml(r.Description)}</p>` : ''}
                        <div class="text-[11px] text-slate-400 mt-1">
                          🕒 ${escapeHtml(dateStr)} | ผู้รายงาน: ${escapeHtml(r.Teacher_Reported)} | คะแนนคงเหลือ: <b>${stu ? stu.BehaviorScore : '-'}</b>
                        </div>
                      </div>
                    </div>
                    <button onclick="removeDisciplineRecord('${escapeHtml(r.Record_ID)}')" class="self-end sm:self-center text-xs text-slate-400 hover:text-red-600 px-2 py-1">
                      ลบรายการ
                    </button>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      </div>
    </div>
  `;
}

function autoSetDisciplinePoints(category) {
  const map = {
    'มาสาย': -5,
    'การแต่งกาย': -5,
    'หนีเรียน': -10,
    'บุหรี่/สารเสพติด': -20,
    'ทะเลาะวิวาท': -30,
    'อื่นๆ': -5
  };
  const input = document.getElementById('discFormPoints');
  if (input && map[category] !== undefined) {
    input.value = map[category];
  }
}

function submitQuickDisciplineForm(e) {
  e.preventDefault();
  const sid = document.getElementById('discFormStudentId').value;
  if (!sid) return;
  const cat = document.getElementById('discFormCategory').value;
  const pts = Number(document.getElementById('discFormPoints').value || -5);
  const act = document.getElementById('discFormAction').value;
  const desc = document.getElementById('discFormDesc').value.trim();
  const teacher = document.getElementById('discFormTeacher').value.trim();

  window.appDB.addDisciplineRecord({
    Student_ID: sid,
    Violation_Category: cat,
    Points_Deducted: pts,
    Action_Taken: act,
    Description: desc,
    Teacher_Reported: teacher
  });
  showToast('บันทึกประวัติพฤติกรรมและการตัดคะแนนเรียบร้อยแล้ว');
  renderAll();
}

function removeDisciplineRecord(recordId) {
  if (!confirm('ต้องการลบรายการตัดคะแนนนี้ใช่หรือไม่? (คะแนนจะถูกคืนให้นักเรียนอัตโนมัติ)')) return;
  window.appDB.deleteDisciplineRecord(recordId);
  showToast('ลบรายการบันทึกคะแนนเรียบร้อยแล้ว');
  renderAll();
}

// ============================================================================
// TAB 4: SCREENING SDQ & HOME VISIT BY ZONE (ตารางที่ 4: Screening_Records)
// ============================================================================
function renderScreeningTab() {
  const container = document.getElementById('screeningListContainer');
  const zoneSummaryContainer = document.getElementById('zoneSummaryPills');
  if (!container || !zoneSummaryContainer) return;

  const all360 = window.appDB.getAllStudents360();

  const zoneCounts = {};
  all360.forEach(s => {
    const z = s.Zone_District || 'ไม่ระบุ';
    zoneCounts[z] = (zoneCounts[z] || 0) + 1;
  });
  const sortedZones = Object.keys(zoneCounts).sort((a, b) => zoneCounts[b] - zoneCounts[a]);

  zoneSummaryContainer.innerHTML = `
    <button onclick="setScreeningZone('ALL')"
            class="px-3 py-1.5 rounded-xl text-xs font-prompt font-semibold whitespace-nowrap transition ${window.AppState.screeningZoneFilter === 'ALL' ? 'bg-blue-700 text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-200'}">
      ทุกโซนอำเภอ (${all360.length})
    </button>
    ${sortedZones.map(z => `
      <button onclick="setScreeningZone('${escapeHtml(z)}')"
              class="px-3 py-1.5 rounded-xl text-xs font-prompt font-semibold whitespace-nowrap transition ${window.AppState.screeningZoneFilter === z ? 'bg-blue-700 text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}">
        อ.${escapeHtml(z)} (${zoneCounts[z]})
      </button>
    `).join('')}
  `;

  const filtered = all360.filter(s => {
    if (window.AppState.screeningZoneFilter !== 'ALL' && s.Zone_District !== window.AppState.screeningZoneFilter) return false;
    if (window.AppState.screeningRiskFilter !== 'ALL' && s.Screening.Overall_Risk_Level !== window.AppState.screeningRiskFilter) return false;
    return true;
  });

  container.innerHTML = filtered.map(stu => {
    const sc = stu.Screening;
    const mapsQuery = encodeURIComponent(stu.Home_Location || `${stu.Address} ฉะเชิงเทรา`);
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

    return `
      <div class="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-5 flex flex-col justify-between gap-3.5">
        <div class="space-y-3">
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-3">
              ${getAvatarHtml(stu, 'w-12 h-12', 'text-sm')}
              <div>
                <div class="flex flex-wrap items-center gap-1">
                  <span class="font-mono text-[11px] font-bold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded">${escapeHtml(stu.Student_ID)}</span>
                  ${renderClassAndGroupBadges(stu)}
                </div>
                <h4 onclick="openStudent360Modal('${escapeHtml(stu.Student_ID)}')" class="font-prompt font-bold text-slate-900 text-sm mt-1 cursor-pointer hover:text-blue-700">
                  ${escapeHtml(stu.Full_Name)} ${stu.Nickname ? `(${escapeHtml(stu.Nickname)})` : ''}
                </h4>
              </div>
            </div>
            ${getRiskBadge(sc.Overall_Risk_Level)}
          </div>

          <!-- สาเหตุความเสี่ยงชัดเจน -->
          <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div class="text-[11px] font-prompt font-bold text-slate-600">📌 สาเหตุความเสี่ยง / เรื่องที่พบ:</div>
            <div class="flex flex-wrap gap-1">
              ${renderRiskReasonBadges(stu)}
            </div>
          </div>

          <!-- ข้อมูลบุหรี่/สารเสพติดที่แจ้ง -->
          ${renderSubstanceBox(stu, false)}

          <div class="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 text-xs space-y-1">
            <div class="flex items-start justify-between gap-2">
              <span class="text-slate-500 shrink-0">โซนเยี่ยมบ้าน:</span>
              <span class="font-semibold text-blue-900 text-right">อ.${escapeHtml(stu.Zone_District)} (${escapeHtml(stu.Address)})</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-500">รายได้ครอบครัว / ค่าขนม:</span>
              <span class="font-semibold text-slate-800">${escapeHtml(sc.Family_Income_Range || '-')} (วันละ ${escapeHtml(sc.Daily_Allowance || '-')})</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-500">ความต้องการทุน:</span>
              <span class="font-semibold ${sc.Scholarship_Need === 'ต้องการ' ? 'text-blue-700' : 'text-slate-700'}">${escapeHtml(sc.Scholarship_Need || '-')}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-500">สถานะเยี่ยมบ้าน:</span>
              <span class="font-bold ${sc.Home_Visit_Status === 'เยี่ยมบ้านแล้ว' ? 'text-emerald-600' : 'text-slate-500'}">
                ${escapeHtml(sc.Home_Visit_Status || 'ยังไม่เยี่ยมบ้าน')} ${sc.Home_Visit_Date ? `(${escapeHtml(sc.Home_Visit_Date)})` : ''}
              </span>
            </div>
          </div>

          ${sc.Home_Visit_Photo ? `
            <div class="rounded-2xl overflow-hidden border border-slate-200 h-36 bg-slate-100">
              <img src="${escapeHtml(sc.Home_Visit_Photo)}" class="w-full h-full object-cover" alt="รูปเยี่ยมบ้าน" />
            </div>
          ` : ''}
        </div>

        <div class="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
          <a href="${mapsUrl}" target="_blank" rel="noopener"
             class="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-prompt font-semibold flex items-center justify-center gap-1.5 transition">
            <i data-lucide="navigation" class="w-3.5 h-3.5 text-blue-600"></i> นำทางไปบ้าน
          </a>
          <button onclick="openScreeningModal('${escapeHtml(stu.Student_ID)}')"
                  class="py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-prompt font-semibold flex items-center justify-center gap-1.5 shadow-sm transition">
            <i data-lucide="camera" class="w-3.5 h-3.5"></i> บันทึกเยี่ยมบ้าน/SDQ
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function setScreeningZone(zone) {
  window.AppState.screeningZoneFilter = zone;
  const sel = document.getElementById('screeningZoneSelect');
  if (sel) sel.value = zone;
  renderScreeningTab();
  if (window.lucide) lucide.createIcons();
}

// ============================================================================
// TAB 5: SETTINGS, CLASS_GROUPS EDITOR & CLOUD/BACKUP SYNC
// ============================================================================
function renderSettingsTab() {
  const container = document.getElementById('settingsContent');
  if (!container) return;

  const groups = window.appDB.getClassGroups();
  const logs = (window.appDB.db.Audit_Logs || []).slice(0, 30);
  const cloudUrl = window.appDB.getCloudUrl();

  container.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Manage Table 1: Class_Groups -->
      <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-5">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div>
            <h3 class="font-prompt font-bold text-slate-900 text-base">จัดการตารางที่ 1: กลุ่มเรียนและครูที่ปรึกษา (Class_Groups)</h3>
            <p class="text-xs text-slate-500">ใช้ระบบชื่อกลุ่มเข้าใจง่าย (กลุ่ม1 - กลุ่ม5) สามารถระบุชื่อครูที่ปรึกษาประจำกลุ่มได้ทันที</p>
          </div>
          <button onclick="openClassGroupModal(null)" class="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-prompt font-semibold flex items-center gap-1">
            <i data-lucide="plus" class="w-3.5 h-3.5"></i> เพิ่มกลุ่มเรียน
          </button>
        </div>

        <div class="space-y-2.5">
          ${groups.map(g => {
            const count = window.appDB.getStudents().filter(s => s.Class_ID === g.Class_ID).length;
            return `
              <div class="p-3.5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-prompt text-xs font-bold px-2.5 py-0.5 rounded-lg bg-blue-100 text-blue-900">${escapeHtml(g.Level_Year || (g.Level + g.Year))}</span>
                    <span class="font-prompt text-xs font-bold px-2.5 py-0.5 rounded-lg bg-slate-800 text-white">${escapeHtml(g.Group_Label || ('กลุ่ม' + g.Group_No))}</span>
                    <span class="font-prompt font-bold text-sm text-slate-900">สาขา${escapeHtml(g.Major)}</span>
                    <span class="text-xs text-slate-500">(${count} คน)</span>
                  </div>
                  <div class="text-xs text-slate-600 mt-1.5">
                    👨‍🏫 ครูที่ปรึกษา: <b class="text-slate-900">${escapeHtml(g.Advisor_Name)}</b>
                  </div>
                </div>
                <div class="flex items-center gap-1.5 self-end sm:self-center">
                  <button onclick="openClassGroupModal('${escapeHtml(g.Class_ID)}')" class="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-prompt font-semibold">
                    แก้ไขชื่อครู/กลุ่ม
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Backup, Import/Export & Cloud Sync -->
      <div class="space-y-6">
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-5">
          <h3 class="font-prompt font-bold text-slate-900 text-base mb-1">ส่งออกและสำรองฐานข้อมูล (Export & Backup)</h3>
          <p class="text-xs text-slate-500 mb-4">ส่งออกข้อมูลทั้ง 4 ตารางพร้อมข้อมูลการใช้สารเสพติดและสาเหตุความเสี่ยงเป็นไฟล์ Excel (.xlsx), CSV หรือ JSON</p>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button onclick="window.ExportManager.exportExcel4Sheets()" class="p-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-prompt font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition">
              <i data-lucide="file-spreadsheet" class="w-4 h-4"></i> ส่งออก Excel (4 ตาราง)
            </button>
            <button onclick="window.ExportManager.exportStudentsCSV()" class="p-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-prompt font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition">
              <i data-lucide="file-text" class="w-4 h-4"></i> ส่งออก CSV (360°)
            </button>
            <button onclick="window.ExportManager.exportFullJSON()" class="p-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-prompt font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition">
              <i data-lucide="download" class="w-4 h-4"></i> สำรองไฟล์ JSON
            </button>
          </div>

          <div class="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            <label class="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-prompt font-semibold cursor-pointer text-center flex items-center justify-center gap-1.5">
              <i data-lucide="upload" class="w-4 h-4"></i> นำเข้าไฟล์ฐานข้อมูล (.json)
              <input type="file" accept=".json" onchange="handleImportJSONFile(event)" class="hidden" />
            </label>
            <button onclick="confirmResetDatabase()" class="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-prompt font-medium">
              รีเซ็ตกลับเป็นข้อมูลเริ่มต้น (125 คน)
            </button>
          </div>
        </div>

        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-5">
          <h3 class="font-prompt font-bold text-slate-900 text-base mb-1">เชื่อมต่อออนไลน์ข้ามเครื่อง (Google Sheets Cloud Sync)</h3>
          <p class="text-xs text-slate-500 mb-3">วาง URL ของ Google Apps Script Web App เพื่อซิงก์ข้อมูลระหว่างมือถือและคอมพิวเตอร์</p>
          <div class="flex gap-2 mb-2.5">
            <input type="url" id="cloudSyncUrlInput" value="${escapeHtml(cloudUrl)}" placeholder="https://script.google.com/macros/s/.../exec"
                   class="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs outline-none" />
            <button onclick="saveCloudUrlSetting()" class="px-3 py-2 rounded-xl bg-slate-800 text-white text-xs font-prompt font-semibold">บันทึก URL</button>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <button onclick="triggerCloudSyncUp()" class="py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-prompt font-semibold flex items-center justify-center gap-1.5">
              <i data-lucide="cloud-upload" class="w-4 h-4"></i> อัปโหลดขึ้น Cloud
            </button>
            <button onclick="triggerCloudSyncDown()" class="py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-prompt font-semibold flex items-center justify-center gap-1.5">
              <i data-lucide="cloud-download" class="w-4 h-4"></i> ดึงข้อมูลจาก Cloud
            </button>
          </div>
        </div>

        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-5">
          <h3 class="font-prompt font-bold text-slate-900 text-base mb-2">ประวัติการแก้ไขข้อมูลล่าสุด (Audit Log)</h3>
          <div class="max-h-56 overflow-y-auto space-y-2 text-xs">
            ${logs.map(l => `
              <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div class="flex items-center justify-between font-semibold text-slate-800">
                  <span>${escapeHtml(l.Action)}</span>
                  <span class="text-[10px] text-slate-400">${escapeHtml(new Date(l.Timestamp).toLocaleString('th-TH'))}</span>
                </div>
                <p class="text-slate-600 mt-0.5">${escapeHtml(l.Details)}</p>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

function handleImportJSONFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const parsed = JSON.parse(evt.target.result);
      window.appDB.importJSON(parsed);
      showToast('นำเข้าไฟล์ฐานข้อมูลสำเร็จ!');
      renderAll();
    } catch (err) {
      showToast('ไฟล์ JSON ไม่ถูกต้อง: ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
}

function confirmResetDatabase() {
  if (!confirm('ยืนยันการรีเซ็ตข้อมูลกลับเป็นค่าเริ่มต้นจากไฟล์ต้นฉบับ?')) return;
  window.appDB.resetToInitial(true);
  showToast('รีเซ็ตฐานข้อมูลกลับเป็นค่าเริ่มต้นเรียบร้อยแล้ว');
  renderAll();
}

function saveCloudUrlSetting() {
  const val = document.getElementById('cloudSyncUrlInput').value;
  window.appDB.setCloudUrl(val);
  showToast('บันทึก URL สำหรับ Cloud Sync เรียบร้อยแล้ว');
}

async function triggerCloudSyncUp() {
  try {
    await window.appDB.syncToCloud();
    showToast('ซิงก์ข้อมูลขึ้น Cloud สำเร็จ!');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function triggerCloudSyncDown() {
  try {
    await window.appDB.pullFromCloud();
    showToast('ดึงข้อมูลล่าสุดจาก Cloud สำเร็จ!');
    renderAll();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ============================================================================
// MODALS: 1. โปรไฟล์นักเรียน 360° (ดึงข้อมูลครบทั้ง 4 ตาราง + ข้อมูลสารเสพติด + สาเหตุความเสี่ยง)
// ============================================================================
function openStudent360Modal(studentId) {
  window.AppState.selectedStudentId = studentId;
  const stu = window.appDB.getStudent360(studentId);
  if (!stu) return;

  const modal = document.getElementById('student360Modal');
  const body = document.getElementById('student360ModalBody');
  if (!modal || !body) return;

  const sc = stu.Screening;
  const mapsQuery = encodeURIComponent(stu.Home_Location || `${stu.Address} ฉะเชิงเทรา`);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

  body.innerHTML = `
    <div class="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-5 sm:p-6">
      <div class="flex items-start justify-between gap-4">
        <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          ${getAvatarHtml(stu, 'w-20 h-20', 'text-2xl')}
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-mono text-xs font-bold bg-blue-500/30 border border-blue-400/40 px-2.5 py-0.5 rounded-lg text-blue-100">
                รหัส: ${escapeHtml(stu.Student_ID)}
              </span>
              <span class="text-xs font-prompt font-bold bg-white text-slate-900 px-2.5 py-0.5 rounded-lg">
                ${escapeHtml(stu.ClassGroup.Level_Year)} ${escapeHtml(stu.ClassGroup.Group_Label)}
              </span>
              ${getStatusBadge(stu.Status)}
            </div>
            <h2 class="font-prompt font-bold text-xl sm:text-2xl mt-1.5">
              ${escapeHtml(stu.Full_Name)} ${stu.Nickname ? `<span class="text-base font-normal text-blue-200">(${escapeHtml(stu.Nickname)})</span>` : ''}
            </h2>
            <p class="text-xs text-blue-200 mt-0.5">
              สาขาวิชา${escapeHtml(stu.ClassGroup.Major)} | ครูที่ปรึกษา: ${escapeHtml(stu.ClassGroup.Advisor_Name)}
            </p>
          </div>
        </div>
        <button onclick="closeModal('student360Modal')" class="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5 pt-4 border-t border-white/10">
        <button onclick="closeModal('student360Modal'); openEditStudentModal('${escapeHtml(stu.Student_ID)}')"
                class="py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-prompt font-semibold flex items-center justify-center gap-1.5 shadow">
          <i data-lucide="edit-3" class="w-4 h-4"></i> แก้ไขประวัติ/ข้อมูลดื่ม-สูบ
        </button>
        <button onclick="closeModal('student360Modal'); openDisciplineModal('${escapeHtml(stu.Student_ID)}')"
                class="py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-prompt font-semibold flex items-center justify-center gap-1.5 shadow">
          <i data-lucide="shield-alert" class="w-4 h-4"></i> ตัดคะแนน (${stu.BehaviorScore})
        </button>
        <button onclick="closeModal('student360Modal'); openScreeningModal('${escapeHtml(stu.Student_ID)}')"
                class="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-prompt font-semibold flex items-center justify-center gap-1.5 shadow">
          <i data-lucide="home" class="w-4 h-4"></i> คัดกรอง/เยี่ยมบ้าน
        </button>
        <a href="${mapsUrl}" target="_blank" rel="noopener"
           class="py-2 px-3 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-prompt font-semibold flex items-center justify-center gap-1.5">
          <i data-lucide="map-pin" class="w-4 h-4"></i> นำทาง Google Maps
        </a>
      </div>
    </div>

    <div class="p-5 sm:p-6 space-y-5 bg-slate-50 max-h-[72vh] overflow-y-auto">
      <!-- กล่องสรุปความเสี่ยง + ข้อมูลการใช้บุหรี่/สารเสพติดที่นักเรียนแจ้ง -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
          <h3 class="font-prompt font-bold text-slate-900 text-sm flex items-center gap-2">
            <i data-lucide="activity" class="w-4 h-4 text-rose-600"></i>
            สรุปผลการคัดกรองความเสี่ยง & ข้อมูลการใช้บุหรี่/สารเสพติด (จากแบบบันทึก)
          </h3>
          ${getRiskBadge(sc.Overall_Risk_Level)}
        </div>

        ${renderSubstanceBox(stu, false)}

        <div>
          <span class="block text-xs font-prompt font-bold text-slate-600 mb-1.5">สาเหตุความเสี่ยง / ปัจจัยที่พบทั้งหมด:</span>
          <div class="flex flex-wrap gap-1.5">
            ${renderRiskReasonBadges(stu)}
          </div>
        </div>
      </div>

      <!-- 1. ข้อมูลส่วนตัว การติดต่อ และพิกัดบ้าน (ตาราง Students) -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <h3 class="font-prompt font-bold text-slate-900 text-sm flex items-center gap-2 pb-2.5 border-b border-slate-100">
          <i data-lucide="user" class="w-4 h-4 text-blue-600"></i>
          1. ข้อมูลประวัตินักเรียนและการติดต่อ (ตาราง Students)
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-xs sm:text-sm">
          <div><span class="text-slate-400">ระดับชั้น / กลุ่มเรียน:</span> <span class="font-bold text-slate-900 ml-1">${escapeHtml(stu.ClassGroup.Level_Year)} ${escapeHtml(stu.ClassGroup.Group_Label)}</span></div>
          <div><span class="text-slate-400">เบอร์โทรนักเรียน:</span> ${stu.Phone_Number ? `<a href="tel:${escapeHtml(stu.Phone_Number)}" class="font-bold text-blue-700 underline ml-1">${escapeHtml(stu.Phone_Number)}</a>` : '<span class="text-red-500 ml-1">ยังไม่ระบุ</span>'}</div>
          <div><span class="text-slate-400">FB / IG:</span> <span class="font-medium text-slate-800 ml-1">${escapeHtml(stu.Social_Contact || '-')}</span></div>
          <div><span class="text-slate-400">ชื่อผู้ปกครอง:</span> <span class="font-medium text-slate-800 ml-1">${escapeHtml(stu.Parent_Name || '-')}</span></div>
          <div><span class="text-slate-400">เบอร์ผู้ปกครอง:</span> ${stu.Parent_Phone ? `<a href="tel:${escapeHtml(stu.Parent_Phone)}" class="font-bold text-emerald-700 underline ml-1">${escapeHtml(stu.Parent_Phone)}</a>` : '<span class="text-red-500 ml-1">ยังไม่ระบุ</span>'}</div>
          <div><span class="text-slate-400">เบอร์ติดต่อฉุกเฉิน:</span> <span class="font-medium text-slate-800 ml-1">${escapeHtml(stu.Emergency_Phone || '-')} ${stu.Emergency_Contact_Note ? `(${escapeHtml(stu.Emergency_Contact_Note)})` : ''}</span></div>
          <div class="sm:col-span-2"><span class="text-slate-400">ที่อยู่ปัจจุบัน:</span> <span class="font-medium text-slate-800 ml-1">${escapeHtml(stu.Address)}</span></div>
          <div><span class="text-slate-400">โซนพื้นที่ (Zone_District):</span> <span class="font-bold text-indigo-700 ml-1">อ.${escapeHtml(stu.Zone_District)}</span></div>
          <div><span class="text-slate-400">พิกัด GPS (Home_Location):</span> <span class="font-mono text-xs text-slate-700 ml-1">${escapeHtml(stu.Home_Location || 'ยังไม่ปักหมุด')}</span></div>
          <div><span class="text-slate-400">การเดินทางมาวิทยาลัย:</span> <span class="font-medium text-slate-800 ml-1">${escapeHtml(stu.Commute_Method || '-')}</span></div>
          <div><span class="text-slate-400">สถานศึกษาเดิม:</span> <span class="font-medium text-slate-800 ml-1">${escapeHtml(stu.Previous_School || '-')}</span></div>
        </div>
      </div>

      <!-- 2. ประวัติพฤติกรรมและการตัดคะแนน (ตาราง Discipline_Records) -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div class="flex items-center justify-between pb-2.5 border-b border-slate-100">
          <h3 class="font-prompt font-bold text-slate-900 text-sm flex items-center gap-2">
            <i data-lucide="shield-alert" class="w-4 h-4 text-rose-600"></i>
            2. ประวัติพฤติกรรมและการตัดคะแนน (ตาราง Discipline_Records)
          </h3>
          <span class="font-prompt font-bold text-sm ${stu.BehaviorScore < 80 ? 'text-red-600' : 'text-emerald-700'}">
            คะแนนคงเหลือ: ${stu.BehaviorScore}/100
          </span>
        </div>
        <div class="mt-3">
          ${stu.DisciplineRecords.length === 0 ? `
            <p class="text-xs text-slate-500 py-2">ไม่มีประวัติการกระทำผิดระเบียบ (คะแนนเต็ม 100)</p>
          ` : `
            <div class="space-y-2">
              ${stu.DisciplineRecords.map(d => `
                <div class="p-2.5 rounded-xl bg-rose-50/60 border border-rose-200 flex items-center justify-between text-xs">
                  <div>
                    <span class="font-bold text-rose-700">${escapeHtml(d.Violation_Category)} (${d.Points_Deducted} คะแนน)</span>
                    <span class="text-slate-600 ml-1">- ${escapeHtml(d.Description || d.Action_Taken)}</span>
                    <div class="text-[10px] text-slate-400">${escapeHtml(new Date(d.Date_Time).toLocaleString('th-TH'))} | โดย ${escapeHtml(d.Teacher_Reported)}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>

      <!-- 3. ข้อมูลเศรษฐกิจครอบครัวและเยี่ยมบ้าน (ตาราง Screening_Records) -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <h3 class="font-prompt font-bold text-slate-900 text-sm flex items-center gap-2 pb-2.5 border-b border-slate-100">
          <i data-lucide="heart-handshake" class="w-4 h-4 text-emerald-600"></i>
          3. ข้อมูลครอบครัว เศรษฐกิจ และการเยี่ยมบ้าน (ตาราง Screening_Records)
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-xs sm:text-sm">
          <div><span class="text-slate-400">สถานภาพบิดามารดา:</span> <span class="font-semibold text-slate-800 ml-1">${escapeHtml(sc.Family_Status)}</span></div>
          <div><span class="text-slate-400">ฐานะทางเศรษฐกิจ:</span> <span class="font-semibold text-slate-800 ml-1">${escapeHtml(sc.Financial_Status)}</span></div>
          <div><span class="text-slate-400">อาชีพผู้ปกครอง:</span> <span class="font-medium text-slate-800 ml-1">${escapeHtml(sc.Parent_Occupation || '-')}</span></div>
          <div><span class="text-slate-400">รายได้ครอบครัวเฉลี่ย:</span> <span class="font-medium text-slate-800 ml-1">${escapeHtml(sc.Family_Income_Range || '-')}</span></div>
          <div><span class="text-slate-400">เงินมาวิทยาลัย/วัน:</span> <span class="font-medium text-slate-800 ml-1">${escapeHtml(sc.Daily_Allowance || '-')}</span></div>
          <div><span class="text-slate-400">ความต้องการทุนการศึกษา:</span> <span class="font-semibold text-blue-700 ml-1">${escapeHtml(sc.Scholarship_Need || '-')}</span></div>
          <div><span class="text-slate-400">สถานะเยี่ยมบ้าน:</span> <span class="font-bold text-slate-800 ml-1">${escapeHtml(sc.Home_Visit_Status)} ${sc.Home_Visit_Date ? `(${escapeHtml(sc.Home_Visit_Date)})` : ''}</span></div>
          <div class="sm:col-span-2"><span class="text-slate-400">สรุปผลเยี่ยมบ้าน:</span> <span class="font-medium text-slate-800 ml-1">${escapeHtml(sc.Home_Visit_Summary || 'ยังไม่มีบันทึกเพิ่มเติม')}</span></div>
        </div>
        ${sc.Home_Visit_Photo ? `
          <div class="mt-3">
            <span class="block text-xs text-slate-400 mb-1">รูปถ่ายการเยี่ยมบ้าน:</span>
            <img src="${escapeHtml(sc.Home_Visit_Photo)}" class="max-h-56 rounded-xl border border-slate-200 object-cover" />
          </div>
        ` : ''}
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

// ============================================================================
// MODALS: 2. แก้ไข/เพิ่มข้อมูลนักเรียน (Edit Student Modal)
// ============================================================================
function openEditStudentModal(studentId = null) {
  const isEdit = Boolean(studentId);
  const stu = isEdit ? window.appDB.getStudentById(studentId) : {
    Student_ID: '',
    Full_Name: '',
    Nickname: '',
    Class_ID: 'ปวช.1 กลุ่ม1',
    Status: 'ปกติ',
    Phone_Number: '',
    Parent_Name: '',
    Parent_Phone: '',
    Emergency_Phone: '',
    Emergency_Contact_Note: '',
    Social_Contact: '',
    Substance_Raw: 'ไม่สูบ ไม่ดื่ม',
    House_No: '',
    Road: '',
    Subdistrict: '',
    Zone_District: 'เมืองฉะเชิงเทรา',
    Zipcode: '24000',
    Home_Location: '',
    Photo_URL: '',
    Commute_Method: 'รถมอเตอร์ไซค์ส่วนตัว',
    Previous_School: '',
    Data_Note: ''
  };

  const groups = window.appDB.getClassGroups();
  const modal = document.getElementById('editStudentModal');
  const body = document.getElementById('editStudentModalBody');
  if (!modal || !body) return;

  body.innerHTML = `
    <form onsubmit="submitEditStudentForm(event, '${isEdit ? escapeHtml(stu.Student_ID) : ''}')" class="space-y-4 text-xs sm:text-sm">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">รหัสนักศึกษา (11 หลัก) *</label>
          <input type="text" id="editStuId" value="${escapeHtml(stu.Student_ID)}" required pattern="\\d{11}" title="กรุณากรอกตัวเลข 11 หลัก"
                 class="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono font-bold text-blue-900" />
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">ชื่อ-นามสกุล *</label>
          <input type="text" id="editStuName" value="${escapeHtml(stu.Full_Name)}" required
                 class="w-full rounded-xl border border-slate-300 px-3 py-2 font-semibold" />
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">ชื่อเล่น</label>
          <input type="text" id="editStuNick" value="${escapeHtml(stu.Nickname)}"
                 class="w-full rounded-xl border border-slate-300 px-3 py-2" />
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">ระดับชั้นและกลุ่มเรียน *</label>
          <select id="editStuClassId" required class="w-full rounded-xl border border-slate-300 px-3 py-2 font-semibold">
            ${groups.map(g => `<option value="${escapeHtml(g.Class_ID)}" ${stu.Class_ID === g.Class_ID ? 'selected' : ''}>${escapeHtml(g.Class_ID)} (${escapeHtml(g.Major)})</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">สถานภาพ (Status) *</label>
          <select id="editStuStatus" class="w-full rounded-xl border border-slate-300 px-3 py-2">
            <option value="ปกติ" ${stu.Status === 'ปกติ' ? 'selected' : ''}>ปกติ</option>
            <option value="พักการเรียน" ${stu.Status === 'พักการเรียน' ? 'selected' : ''}>พักการเรียน</option>
            <option value="พ้นสภาพ" ${stu.Status === 'พ้นสภาพ' ? 'selected' : ''}>พ้นสภาพ</option>
          </select>
        </div>
      </div>

      <!-- ข้อมูลการใช้บุหรี่/สุรา/สารเสพติด ตามแบบบันทึก -->
      <div class="p-3.5 rounded-2xl bg-orange-50/70 border border-orange-200">
        <label class="block font-prompt font-bold text-orange-950 mb-1">
          🚬 ข้อมูลการดื่มหรือสูบ / สารเสพติด (ตามที่นักเรียนแจ้งในแบบบันทึก)
        </label>
        <input type="text" id="editStuSubstanceRaw" value="${escapeHtml(stu.Substance_Raw || '')}"
               placeholder="เช่น บุหรี่, เหล้า เบียร, น้ำกระท่อม, กัญชา หรือ ไม่สูบ ไม่ดื่ม"
               class="w-full rounded-xl border border-orange-300 bg-white px-3 py-2 font-semibold text-slate-900" />
        <p class="text-[11px] text-orange-800 mt-1">
          * ระบบจะวิเคราะห์คำสำคัญ (บุหรี่, เหล้า/เบียร์, น้ำกระท่อม, กัญชา) จากช่องนี้เพื่อจัดกลุ่มเสี่ยงให้อัตโนมัติ
        </p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">เบอร์โทรนักเรียน (10 หลัก)</label>
          <input type="tel" id="editStuPhone" value="${escapeHtml(stu.Phone_Number)}" placeholder="08xxxxxxxx"
                 class="w-full rounded-xl border border-slate-300 px-3 py-2" />
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">ชื่อ-นามสกุล ผู้ปกครอง</label>
          <input type="text" id="editStuParentName" value="${escapeHtml(stu.Parent_Name)}"
                 class="w-full rounded-xl border border-slate-300 px-3 py-2" />
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">เบอร์โทรผู้ปกครอง (10 หลัก)</label>
          <input type="tel" id="editStuParentPhone" value="${escapeHtml(stu.Parent_Phone)}" placeholder="08xxxxxxxx"
                 class="w-full rounded-xl border border-slate-300 px-3 py-2" />
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">เบอร์ติดต่อฉุกเฉิน</label>
          <input type="tel" id="editStuEmgPhone" value="${escapeHtml(stu.Emergency_Phone)}"
                 class="w-full rounded-xl border border-slate-300 px-3 py-2" />
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">ความสัมพันธ์/หมายเหตุผู้ติดต่อฉุกเฉิน</label>
          <input type="text" id="editStuEmgNote" value="${escapeHtml(stu.Emergency_Contact_Note)}" placeholder="เช่น พ่อ, แม่, ยาย"
                 class="w-full rounded-xl border border-slate-300 px-3 py-2" />
        </div>
      </div>

      <!-- ที่อยู่และพิกัด GPS -->
      <div class="pt-2 border-t border-slate-100">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">บ้านเลขที่ / หมู่</label>
            <input type="text" id="editStuHouse" value="${escapeHtml(stu.House_No)}"
                   class="w-full rounded-xl border border-slate-300 px-3 py-2" />
          </div>
          <div>
            <label class="block font-semibold text-slate-700 mb-1">ตำบล</label>
            <input type="text" id="editStuSubdist" value="${escapeHtml(stu.Subdistrict)}"
                   class="w-full rounded-xl border border-slate-300 px-3 py-2" />
          </div>
          <div>
            <label class="block font-semibold text-slate-700 mb-1">โซนอำเภอ (Zone_District)</label>
            <input type="text" id="editStuDistrict" value="${escapeHtml(stu.Zone_District)}" placeholder="เช่น เมืองฉะเชิงเทรา, บางคล้า"
                   class="w-full rounded-xl border border-slate-300 px-3 py-2 font-semibold text-blue-900" />
          </div>
          <div>
            <label class="block font-semibold text-slate-700 mb-1">รหัสไปรษณีย์</label>
            <input type="text" id="editStuZip" value="${escapeHtml(stu.Zipcode)}"
                   class="w-full rounded-xl border border-slate-300 px-3 py-2" />
          </div>
        </div>
        <div class="mt-3 flex flex-col sm:flex-row gap-2 sm:items-end">
          <div class="flex-1">
            <label class="block font-semibold text-slate-700 mb-1">พิกัด GPS บ้านพัก (Home_Location: Lat, Long)</label>
            <input type="text" id="editStuLatLong" value="${escapeHtml(stu.Home_Location)}" placeholder="เช่น 13.6904, 101.0779"
                   class="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono" />
          </div>
          <button type="button" onclick="captureCurrentGPS('editStuLatLong')"
                  class="px-3.5 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-prompt font-semibold text-xs flex items-center justify-center gap-1.5 shrink-0">
            <i data-lucide="locate-fixed" class="w-4 h-4"></i> ดึงพิกัด GPS ปัจจุบันจากมือถือ
          </button>
        </div>
      </div>

      <!-- รูปถ่ายนักเรียน -->
      <div class="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">ลิงก์รูปภาพนักเรียน (URL หรือ Google Drive Direct)</label>
          <input type="text" id="editStuPhotoUrl" value="${escapeHtml(stu.Photo_URL)}" placeholder="https://..."
                 class="w-full rounded-xl border border-slate-300 px-3 py-2" />
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">หรืออัปโหลดรูปถ่ายจากมือถือ/คอมพิวเตอร์</label>
          <input type="file" accept="image/*" onchange="handlePhotoUploadToInput(event, 'editStuPhotoUrl')"
                 class="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700" />
        </div>
      </div>

      <div class="flex items-center justify-between pt-4 border-t border-slate-200">
        ${isEdit ? `
          <button type="button" onclick="confirmDeleteStudent('${escapeHtml(stu.Student_ID)}')"
                  class="px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold">
            ลบรายชื่อนี้
          </button>
        ` : '<div></div>'}
        <div class="flex items-center gap-2">
          <button type="button" onclick="closeModal('editStudentModal')" class="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-prompt font-medium text-xs">ยกเลิก</button>
          <button type="submit" class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-prompt font-semibold text-xs shadow-md">
            บันทึกการแก้ไขข้อมูล
          </button>
        </div>
      </div>
    </form>
  `;

  modal.classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function submitEditStudentForm(e, oldStudentId) {
  e.preventDefault();
  const payload = {
    Student_ID: document.getElementById('editStuId').value.trim(),
    Full_Name: document.getElementById('editStuName').value.trim(),
    Nickname: document.getElementById('editStuNick').value.trim(),
    Class_ID: document.getElementById('editStuClassId').value,
    Status: document.getElementById('editStuStatus').value,
    Substance_Raw: document.getElementById('editStuSubstanceRaw').value.trim(),
    Phone_Number: document.getElementById('editStuPhone').value.replace(/\D/g, ''),
    Parent_Name: document.getElementById('editStuParentName').value.trim(),
    Parent_Phone: document.getElementById('editStuParentPhone').value.replace(/\D/g, ''),
    Emergency_Phone: document.getElementById('editStuEmgPhone').value.replace(/\D/g, ''),
    Emergency_Contact_Note: document.getElementById('editStuEmgNote').value.trim(),
    House_No: document.getElementById('editStuHouse').value.trim(),
    Subdistrict: document.getElementById('editStuSubdist').value.trim(),
    Zone_District: document.getElementById('editStuDistrict').value.trim() || 'ไม่ระบุ',
    Zipcode: document.getElementById('editStuZip').value.trim(),
    Home_Location: document.getElementById('editStuLatLong').value.trim(),
    Photo_URL: document.getElementById('editStuPhotoUrl').value.trim()
  };

  window.appDB.upsertStudent(payload, oldStudentId || null);
  closeModal('editStudentModal');
  showToast(`บันทึกข้อมูลของ ${payload.Full_Name} เรียบร้อยแล้ว`);
  renderAll();
}

function confirmDeleteStudent(studentId) {
  if (!confirm(`ยืนยันการลบข้อมูลนักเรียนรหัส ${studentId} หรือไม่?`)) return;
  window.appDB.deleteStudent(studentId);
  closeModal('editStudentModal');
  showToast('ลบข้อมูลนักเรียนเรียบร้อยแล้ว');
  renderAll();
}

// ============================================================================
// MODALS: 3. บันทึกการคัดกรอง SDQ และเยี่ยมบ้าน (Screening & Home Visit Modal)
// ============================================================================
function openScreeningModal(studentId) {
  const stu = window.appDB.getStudent360(studentId);
  if (!stu) return;
  const sc = stu.Screening;

  const modal = document.getElementById('screeningModal');
  const body = document.getElementById('screeningModalBody');
  if (!modal || !body) return;

  body.innerHTML = `
    <form onsubmit="submitScreeningForm(event, '${escapeHtml(studentId)}')" class="space-y-4 text-xs sm:text-sm">
      <div class="p-3.5 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-between">
        <div>
          <div class="flex items-center gap-1.5">
            <span class="font-mono text-xs font-bold text-blue-800">${escapeHtml(stu.Student_ID)}</span>
            ${renderClassAndGroupBadges(stu)}
          </div>
          <h4 class="font-prompt font-bold text-slate-900 text-sm mt-1">${escapeHtml(stu.Full_Name)}</h4>
        </div>
        <span class="text-xs font-semibold text-blue-800">โซน: อ.${escapeHtml(stu.Zone_District)}</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">สถานภาพบิดามารดา</label>
          <select id="scrFamilyStatus" class="w-full rounded-xl border border-slate-300 px-3 py-2">
            <option value="อยู่ร่วมกัน" ${sc.Family_Status === 'อยู่ร่วมกัน' ? 'selected' : ''}>อยู่ร่วมกัน</option>
            <option value="หย่าร้าง" ${sc.Family_Status === 'หย่าร้าง' ? 'selected' : ''}>หย่าร้าง</option>
            <option value="แยกกันอยู่" ${sc.Family_Status === 'แยกกันอยู่' ? 'selected' : ''}>แยกกันอยู่</option>
            <option value="บิดาหรือมารดาเสียชีวิต" ${sc.Family_Status === 'บิดาหรือมารดาเสียชีวิต' ? 'selected' : ''}>บิดาหรือมารดาเสียชีวิต</option>
          </select>
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">ฐานะทางเศรษฐกิจ</label>
          <select id="scrFinStatus" class="w-full rounded-xl border border-slate-300 px-3 py-2">
            <option value="เพียงพอ" ${sc.Financial_Status === 'เพียงพอ' ? 'selected' : ''}>เพียงพอ</option>
            <option value="ขัดสน" ${sc.Financial_Status === 'ขัดสน' ? 'selected' : ''}>ขัดสน</option>
            <option value="ต้องทำงานพิเศษ" ${sc.Financial_Status === 'ต้องทำงานพิเศษ' ? 'selected' : ''}>ต้องทำงานพิเศษ</option>
          </select>
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">ระดับความเสี่ยงรวม</label>
          <select id="scrRiskLevel" class="w-full rounded-xl border border-slate-300 px-3 py-2 font-bold">
            <option value="กลุ่มปกติ" ${sc.Overall_Risk_Level === 'กลุ่มปกติ' ? 'selected' : ''}>🟢 กลุ่มปกติ</option>
            <option value="กลุ่มเสี่ยง" ${sc.Overall_Risk_Level === 'กลุ่มเสี่ยง' ? 'selected' : ''}>🟠 กลุ่มเสี่ยง</option>
            <option value="กลุ่มมีปัญหา" ${sc.Overall_Risk_Level === 'กลุ่มมีปัญหา' ? 'selected' : ''}>🔴 กลุ่มมีปัญหา</option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">ข้อมูลดื่ม/สูบ/สารเสพติด (ตามแบบบันทึก)</label>
          <input type="text" id="scrSubstanceRaw" value="${escapeHtml(stu.Substance_Raw || '')}"
                 class="w-full rounded-xl border border-slate-300 px-3 py-2 font-semibold" />
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">ความต้องการทุนการศึกษา</label>
          <select id="scrScholarship" class="w-full rounded-xl border border-slate-300 px-3 py-2">
            <option value="ไม่ต้องการ" ${sc.Scholarship_Need === 'ไม่ต้องการ' ? 'selected' : ''}>ไม่ต้องการ</option>
            <option value="ต้องการ" ${sc.Scholarship_Need === 'ต้องการ' ? 'selected' : ''}>ต้องการ</option>
            <option value="ยังไม่ตัดสินใจ" ${sc.Scholarship_Need === 'ยังไม่ตัดสินใจ' ? 'selected' : ''}>ยังไม่ตัดสินใจ</option>
          </select>
        </div>
      </div>

      <div class="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">วันที่ลงพื้นที่เยี่ยมบ้าน</label>
          <input type="date" id="scrVisitDate" value="${escapeHtml(sc.Home_Visit_Date || new Date().toISOString().slice(0, 10))}"
                 class="w-full rounded-xl border border-slate-300 px-3 py-2" />
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">พิกัด GPS บ้านพักขณะเยี่ยมบ้าน</label>
          <div class="flex gap-1.5">
            <input type="text" id="scrHomeGps" value="${escapeHtml(stu.Home_Location || '')}"
                   class="flex-1 rounded-xl border border-slate-300 px-3 py-2 font-mono text-xs" />
            <button type="button" onclick="captureCurrentGPS('scrHomeGps')" class="px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 font-semibold text-xs shrink-0">
              จับพิกัด
            </button>
          </div>
        </div>
      </div>

      <div>
        <label class="block font-semibold text-slate-700 mb-1">อัปโหลดรูปถ่ายจากการเยี่ยมบ้าน (ถ่ายจากมือถือได้ทันที)</label>
        <input type="file" accept="image/*" capture="environment" onchange="handlePhotoUploadToInput(event, 'scrVisitPhotoData')"
               class="w-full text-xs text-slate-600 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700" />
        <input type="hidden" id="scrVisitPhotoData" value="${escapeHtml(sc.Home_Visit_Photo || '')}" />
      </div>

      <div>
        <label class="block font-semibold text-slate-700 mb-1">สรุปผลการเยี่ยมบ้าน / ข้อสังเกตของครูที่ปรึกษา</label>
        <textarea id="scrVisitSummary" rows="2" placeholder="บันทึกสภาพครอบครัว ความเป็นอยู่ หรือเรื่องที่ต้องช่วยเหลือพิเศษ..."
                  class="w-full rounded-xl border border-slate-300 px-3 py-2">${escapeHtml(sc.Home_Visit_Summary || '')}</textarea>
      </div>

      <div class="flex justify-end gap-2 pt-3 border-t border-slate-200">
        <button type="button" onclick="closeModal('screeningModal')" class="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-prompt font-medium text-xs">ยกเลิก</button>
        <button type="submit" class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-prompt font-semibold text-xs shadow-md">
          บันทึกผลคัดกรองและเยี่ยมบ้าน
        </button>
      </div>
    </form>
  `;

  modal.classList.remove('hidden');
}

function submitScreeningForm(e, studentId) {
  e.preventDefault();
  const gps = document.getElementById('scrHomeGps').value.trim();
  const stu = window.appDB.getStudentById(studentId);
  if (stu && gps) {
    stu.Home_Location = gps;
    stu.Location_Precision = 'ปักหมุดบ้านพักแล้ว';
  }

  window.appDB.upsertScreeningRecord(studentId, {
    Family_Status: document.getElementById('scrFamilyStatus').value,
    Financial_Status: document.getElementById('scrFinStatus').value,
    Overall_Risk_Level: document.getElementById('scrRiskLevel').value,
    Manual_Risk_Override: true,
    Substance_Raw: document.getElementById('scrSubstanceRaw').value.trim(),
    Scholarship_Need: document.getElementById('scrScholarship').value,
    Home_Visit_Date: document.getElementById('scrVisitDate').value,
    Home_Visit_Photo: document.getElementById('scrVisitPhotoData').value,
    Home_Visit_Summary: document.getElementById('scrVisitSummary').value.trim(),
    Home_Visit_Status: 'เยี่ยมบ้านแล้ว'
  });

  closeModal('screeningModal');
  showToast('บันทึกข้อมูลการคัดกรองและเยี่ยมบ้านสำเร็จ!');
  renderAll();
}

// ============================================================================
// MODALS: 4. บันทึกคะแนนความประพฤติด่วนรายบุคคล & แก้ไขกลุ่มเรียน
// ============================================================================
function openDisciplineModal(studentId) {
  switchMainTab('discipline');
  setTimeout(() => {
    const sel = document.getElementById('discFormStudentId');
    if (sel) {
      sel.value = studentId;
      sel.focus();
    }
  }, 100);
}

function openClassGroupModal(classId = null) {
  const isEdit = Boolean(classId);
  const grp = isEdit ? window.appDB.getClassGroupById(classId) : {
    Class_ID: 'ปวช.1 กลุ่ม1',
    Group_Label: 'กลุ่ม1',
    Level: 'ปวช.',
    Level_Year: 'ปวช.1',
    Year: 1,
    Major: 'ช่างกลโรงงาน',
    Group_No: 1,
    Advisor_Name: ''
  };

  const modal = document.getElementById('classGroupModal');
  const body = document.getElementById('classGroupModalBody');
  if (!modal || !body) return;

  body.innerHTML = `
    <form onsubmit="submitClassGroupForm(event)" class="space-y-3.5 text-xs sm:text-sm">
      <div>
        <label class="block font-semibold text-slate-700 mb-1">ชื่อกลุ่มเรียน (เช่น ปวช.1 กลุ่ม1) *</label>
        <input type="text" id="cgId" value="${escapeHtml(grp.Class_ID)}" ${isEdit ? 'readonly' : 'required'} placeholder="เช่น ปวช.1 กลุ่ม1"
               class="w-full rounded-xl border border-slate-300 px-3 py-2 font-prompt font-bold ${isEdit ? 'bg-slate-100' : ''}" />
      </div>
      <div class="grid grid-cols-3 gap-2.5">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">ระดับชั้น</label>
          <select id="cgLevel" class="w-full rounded-xl border border-slate-300 px-3 py-2">
            <option value="ปวช." ${grp.Level === 'ปวช.' ? 'selected' : ''}>ปวช.</option>
            <option value="ปวส." ${grp.Level === 'ปวส.' ? 'selected' : ''}>ปวส.</option>
          </select>
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">ชั้นปี</label>
          <input type="number" id="cgYear" value="${grp.Year}" min="1" max="3" required class="w-full rounded-xl border border-slate-300 px-3 py-2" />
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">กลุ่มที่</label>
          <input type="number" id="cgGroupNo" value="${grp.Group_No}" min="1" max="10" required class="w-full rounded-xl border border-slate-300 px-3 py-2" />
        </div>
      </div>
      <div>
        <label class="block font-semibold text-slate-700 mb-1">สาขาวิชา (Major)</label>
        <select id="cgMajor" class="w-full rounded-xl border border-slate-300 px-3 py-2">
          <option value="ช่างกลโรงงาน" ${grp.Major === 'ช่างกลโรงงาน' ? 'selected' : ''}>ช่างกลโรงงาน</option>
          <option value="เทคนิคอุตสาหกรรม" ${grp.Major === 'เทคนิคอุตสาหกรรม' ? 'selected' : ''}>เทคนิคอุตสาหกรรม</option>
        </select>
      </div>
      <div>
        <label class="block font-semibold text-slate-700 mb-1">ชื่อครูที่ปรึกษาประจำกลุ่ม (Advisor_Name) *</label>
        <input type="text" id="cgAdvisor" value="${escapeHtml(grp.Advisor_Name)}" required placeholder="ระบุชื่อ-นามสกุลครูที่ปรึกษา"
               class="w-full rounded-xl border border-slate-300 px-3 py-2 font-semibold" />
      </div>
      <div class="flex justify-end gap-2 pt-3 border-t border-slate-200">
        <button type="button" onclick="closeModal('classGroupModal')" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-medium">ยกเลิก</button>
        <button type="submit" class="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-prompt font-semibold">บันทึกข้อมูลกลุ่มเรียน</button>
      </div>
    </form>
  `;
  modal.classList.remove('hidden');
}

function submitClassGroupForm(e) {
  e.preventDefault();
  const lvl = document.getElementById('cgLevel').value;
  const yr = Number(document.getElementById('cgYear').value);
  const gNo = Number(document.getElementById('cgGroupNo').value);
  window.appDB.upsertClassGroup({
    Class_ID: document.getElementById('cgId').value.trim(),
    Group_Label: `กลุ่ม${gNo}`,
    Level: lvl,
    Level_Year: `${lvl}${yr}`,
    Year: yr,
    Major: document.getElementById('cgMajor').value,
    Group_No: gNo,
    Advisor_Name: document.getElementById('cgAdvisor').value.trim()
  });
  closeModal('classGroupModal');
  showToast('อัปเดตข้อมูลกลุ่มเรียนและครูที่ปรึกษาเรียบร้อยแล้ว');
  renderAll();
}

// ============================================================================
// GPS & Image Compression Helpers for Mobile
// ============================================================================
function captureCurrentGPS(targetInputId) {
  if (!navigator.geolocation) {
    showToast('เบราว์เซอร์ของคุณไม่รองรับการดึงพิกัด GPS', 'error');
    return;
  }
  showToast('กำลังดึงพิกัด GPS ปัจจุบันจากอุปกรณ์...');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const coords = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
      const el = document.getElementById(targetInputId);
      if (el) el.value = coords;
      showToast(`ดึงพิกัดสำเร็จ: ${coords}`);
    },
    (err) => {
      showToast('ไม่สามารถดึงพิกัดได้ กรุณาอนุญาตการเข้าถึงตำแหน่งบนมือถือ', 'error');
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

function handlePhotoUploadToInput(event, targetInputId) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 720;
      const scale = Math.min(1, MAX_WIDTH / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.78);
      const input = document.getElementById(targetInputId);
      if (input) input.value = dataUrl;
      showToast('ย่อขนาดและแนบรูปถ่ายเรียบร้อยแล้ว');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function closeModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) m.classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
  renderAll();
});
