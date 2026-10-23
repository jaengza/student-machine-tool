/**
 * ============================================================================
 * Main Application Controller V4 (Mobile-First, Anti-Overflow & 5-Dimension Screening)
 * - ระบบคัดกรองและติดตามพฤติกรรมนักเรียนแยก 5 หมวดหมู่สีชัดเจน
 * - รองรับ 3 มุมมองทำเนียบ + แผนที่ปักหมุดบ้านนักเรียนรวมทั้งแผนก (Interactive Map)
 * - ระบบพิมพ์ใบรายงานประวัตินักเรียน 1 หน้า A4 (Print One-Page Report)
 * - ศูนย์นำเข้าข้อมูลจาก Google Forms (CSV/Excel, ลิงก์ Google Sheets, ก๊อปปี้วาง)
 * ============================================================================
 */

window.AppState = {
  currentTab: 'dashboard',
  studentViewMode: 'grid', // 'grid' | 'compact' | 'table'
  screeningViewMode: 'cards', // 'cards' | 'table' | 'map'
  searchQuery: '',
  filterLevelYear: 'ALL',
  filterGroupLabel: 'ALL',
  filterClassId: 'ALL',
  filterDistrict: 'ALL',
  filterPhoto: 'ALL',
  filterRisk: 'ALL',
  filterProblemTag: 'ALL',
  filterFollowupStatus: 'ALL',
  filterIssueOnly: false,
  selectedStudentId: null,
  screeningZoneFilter: 'ALL',
  screeningRiskFilter: 'ALL',
  screeningCategoryFilter: 'ALL',
  screeningFollowupFilter: 'ALL',
  leafletMap: null,
  leafletMarkersLayer: null
};

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
  el.className = `${bg} px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs sm:text-sm font-medium animate-modal max-w-sm pointer-events-auto border border-white/20`;
  el.innerHTML = `
    <i data-lucide="${type === 'error' ? 'alert-circle' : 'check-circle-2'}" class="w-4 h-4 sm:w-5 sm:h-5 shrink-0"></i>
    <span class="leading-snug">${escapeHtml(message)}</span>
  `;
  container.appendChild(el);
  if (window.lucide) lucide.createIcons();
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.25s ease';
    setTimeout(() => el.remove(), 250);
  }, 3200);
}

function getRiskBadge(riskLevel) {
  if (riskLevel === 'กลุ่มมีปัญหา') {
    return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-prompt font-bold bg-red-100 text-red-800 border border-red-300 shadow-sm"><span class="w-2 h-2 rounded-full bg-red-600 animate-pulse shrink-0"></span>กลุ่มมีปัญหา</span>`;
  }
  if (riskLevel === 'กลุ่มเสี่ยง') {
    return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-prompt font-bold bg-amber-100 text-amber-900 border border-amber-300"><span class="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>กลุ่มเสี่ยง</span>`;
  }
  return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-prompt font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200"><span class="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>กลุ่มปกติ</span>`;
}

function getFollowupBadge(status) {
  const st = status || 'ปกติ';
  const found = (window.FOLLOWUP_STATUS_LIST || []).find(item => item.id === st);
  const cls = found ? found.badgeClass : 'bg-slate-100 text-slate-700 border-slate-200';
  const icon = st === 'ส่งต่อผู้ปกครอง/ปกครอง'
    ? '🚨'
    : st === 'กำลังติดตาม'
      ? '🟠'
      : st === 'เฝ้าระวัง'
        ? '🟡'
        : st === 'ดูแลสำเร็จ/ดีขึ้นแล้ว'
          ? '✅'
          : '🟢';
  return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-prompt font-semibold border ${cls}">${icon} ติดตาม: ${escapeHtml(st)}</span>`;
}

function renderBehaviorBadges(stu) {
  const bTags = (stu.Screening && stu.Screening.Behavior_Tags) || [];
  if (bTags.length === 0) {
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">ยังไม่มีแท็กพฤติกรรมพิเศษ (กด + เพื่อคัดกรองเพิ่ม)</span>`;
  }
  const positiveIds = window.BEHAVIOR_CATALOG.positive.items.map(i => i.id);
  const highIds = ['ขาดเรียนบ่อย', 'หนีเรียน', 'เสี่ยงออกกลางคัน', 'เก็บตัว/ซึมเศร้า/เครียด', 'อารมณ์ร้อน/ก้าวร้าว'];

  return bTags.map(t => {
    if (positiveIds.includes(t)) {
      return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300">🌟 ${escapeHtml(t)}</span>`;
    }
    if (highIds.includes(t)) {
      return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-red-100 text-red-900 border border-red-300">🚨 ${escapeHtml(t)}</span>`;
    }
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-indigo-100 text-indigo-900 border border-indigo-300">📌 ${escapeHtml(t)}</span>`;
  }).join(' ');
}

function renderRiskReasonBadges(stu) {
  const reasons = (stu.Screening && stu.Screening.Risk_Reasons) || [];
  if (reasons.length === 0) {
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">✅ ไม่พบความเสี่ยง (ปลอดสารเสพติด • เศรษฐกิจปกติ)</span>`;
  }

  return reasons.map(r => {
    let color = 'bg-amber-50 text-amber-800 border-amber-200';
    let icon = '⚠️';
    if (r.includes('กัญชา') || r.includes('กระท่อม')) {
      color = 'bg-red-100 text-red-800 border-red-300 font-bold';
      icon = r.includes('กัญชา') ? '🍁' : '🌿';
    } else if (r.includes('พฤติกรรม:')) {
      color = 'bg-indigo-100 text-indigo-900 border-indigo-300 font-semibold';
      icon = '🧠';
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
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] border leading-snug ${color}">${icon} ${escapeHtml(r)}</span>`;
  }).join(' ');
}

function renderSubstanceBox(stu, compact = false) {
  const rawText = stu.Substance_Raw || 'ไม่ระบุ';
  const tags = stu.Substance_Tags || [];
  const hasRisk = tags.some(t => ['บุหรี่', 'เหล้า/เบียร์', 'น้ำกระท่อม', 'กัญชา'].includes(t));

  if (compact) {
    if (!hasRisk) {
      return `<div class="text-xs text-emerald-700 font-medium leading-snug">🛡️ ไม่ดื่ม/ไม่สูบ <span class="text-slate-500 font-normal">("${escapeHtml(rawText)}")</span></div>`;
    }
    return `
      <div class="text-xs leading-snug">
        <span class="font-bold text-rose-700">🚬 ${escapeHtml(tags.join(', '))}</span>
        <div class="text-[11px] text-slate-600">แจ้งว่า: "${escapeHtml(rawText)}"</div>
      </div>
    `;
  }

  if (!hasRisk) {
    return `
      <div class="cat-section bg-emerald-50/75 border border-emerald-200/90 flex flex-wrap items-center justify-between gap-1.5 text-xs">
        <span class="text-emerald-950 font-prompt font-semibold flex items-center gap-1.5">
          <span>🛡️</span> บุหรี่/สารเสพติด: <span class="text-emerald-700 font-bold">ไม่ดื่ม/ไม่สูบ</span>
        </span>
        <span class="text-[11px] text-emerald-900 bg-white px-2 py-0.5 rounded-lg border border-emerald-200">
          แจ้งว่า: "${escapeHtml(rawText)}"
        </span>
      </div>
    `;
  }

  const isSevere = tags.includes('น้ำกระท่อม') || tags.includes('กัญชา');
  const boxStyle = isSevere
    ? 'bg-red-50/90 border-red-300 text-red-950'
    : 'bg-orange-50/90 border-orange-200 text-orange-950';

  return `
    <div class="cat-section border ${boxStyle} text-xs space-y-1.5">
      <div class="flex flex-wrap items-center justify-between gap-1.5">
        <span class="font-prompt font-bold flex items-center gap-1">
          <span>${isSevere ? '🚨' : '🚬'}</span> บุหรี่/สารเสพติดที่พบ:
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
      <div class="text-[11px] bg-white/95 px-2.5 py-1.5 rounded-xl border border-black/5 text-slate-700 flex flex-wrap items-center justify-between gap-1">
        <span class="text-slate-500">คำตอบในแบบบันทึก:</span>
        <b class="text-slate-900">"${escapeHtml(rawText)}"</b>
      </div>
    </div>
  `;
}

function renderClassAndGroupBadges(stu) {
  const lvl = stu.ClassGroup?.Level_Year || stu.Level_Year || 'ปวช.1';
  const grp = stu.ClassGroup?.Group_Label || stu.Group_Label || `กลุ่ม${stu.Group_No || 1}`;
  const isPvs = lvl.startsWith('ปวส');
  const lvlBadge = isPvs
    ? 'bg-purple-100 text-purple-900 border-purple-200'
    : 'bg-blue-100 text-blue-900 border-blue-200';
  return `
    <span class="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] sm:text-xs font-prompt font-bold border ${lvlBadge}">${escapeHtml(lvl)}</span>
    <span class="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] sm:text-xs font-prompt font-bold bg-slate-800 text-white">${escapeHtml(grp)}</span>
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

function getAvatarHtml(stu, sizeClass = 'w-14 h-14 sm:w-16 sm:h-16', textClass = 'text-base sm:text-lg') {
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
  if (tabName === 'screening' && window.AppState.screeningViewMode === 'map') {
    setTimeout(() => renderDepartmentLeafletMap(), 150);
  }
}

function jumpToProblemFilter(problemTag, riskLevel = 'ALL', followupStatus = 'ALL') {
  window.AppState.currentTab = 'students';
  window.AppState.filterProblemTag = problemTag;
  window.AppState.filterRisk = riskLevel;
  window.AppState.filterFollowupStatus = followupStatus;
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
  window.AppState.filterFollowupStatus = 'ALL';

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
      dBtn.className = window.AppState.currentTab === t
        ? 'px-3 py-2 rounded-xl text-xs xl:text-sm font-semibold flex items-center gap-1.5 bg-white text-blue-950 shadow-sm transition'
        : 'px-3 py-2 rounded-xl text-xs xl:text-sm font-medium flex items-center gap-1.5 text-blue-100 hover:bg-white/10 transition';
    }
    const mBtn = document.getElementById(`mobile-nav-${t}`);
    if (mBtn) {
      mBtn.className = window.AppState.currentTab === t
        ? 'flex flex-col items-center justify-center py-2 px-0.5 text-blue-700 font-semibold relative'
        : 'flex flex-col items-center justify-center py-2 px-0.5 text-slate-500 hover:text-slate-800 font-medium relative';
    }
  });
}

function populateFilterDropdowns() {
  const groups = window.appDB.getClassGroups();
  const students = window.appDB.getStudents();

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

  const filterRiskSelect = document.getElementById('filterRiskSelect');
  if (filterRiskSelect) {
    filterRiskSelect.value = window.AppState.filterRisk;
  }
}

// ============================================================================
// TAB 1: DASHBOARD & ศูนย์คัดกรองแยก 5 หมวดหมู่ (พฤติกรรม / สารเสพติด / เศรษฐกิจ / ติดตาม)
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
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="px-2.5 py-0.5 rounded-lg text-xs font-prompt font-bold ${g.Level === 'ปวช.' ? 'bg-blue-100 text-blue-900' : 'bg-purple-100 text-purple-900'}">
                ${escapeHtml(g.Level_Year || (g.Level + g.Year))}
              </span>
              <span class="px-2.5 py-0.5 rounded-lg text-xs font-prompt font-bold bg-slate-800 text-white">
                ${escapeHtml(g.Group_Label || ('กลุ่ม' + g.Group_No))}
              </span>
            </div>
            <h4 class="font-prompt font-bold text-slate-900 text-sm sm:text-base mt-2 leading-snug">
              สาขา${escapeHtml(g.Major)}
            </h4>
            <p class="text-xs text-slate-500 mt-0.5 flex items-center gap-1 leading-snug">
              <i data-lucide="user-check" class="w-3.5 h-3.5 text-slate-400 shrink-0"></i>
              <span>${escapeHtml(g.Advisor_Name)}</span>
            </p>
          </div>
          <div class="text-right shrink-0 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
            <span class="text-xl font-bold font-prompt text-slate-900">${gStudents.length}</span>
            <span class="block text-[10px] text-slate-500">คน</span>
          </div>
        </div>
        <div class="pt-2.5 border-t border-slate-100 grid grid-cols-3 gap-1.5 text-[11px] text-center">
          <div class="bg-emerald-50 text-emerald-800 rounded-lg py-1 px-1 font-medium">รูป ${gPhoto}/${gStudents.length}</div>
          <div class="bg-orange-50 text-orange-800 rounded-lg py-1 px-1 font-semibold">ดื่ม/สูบ ${gSub}</div>
          <div class="bg-red-50 text-red-800 rounded-lg py-1 px-1 font-semibold">เสี่ยง ${gRisk + gProblem}</div>
        </div>
      </div>
    `;
  }).join('');

  const criticalRowsHtml = criticalIssueStudents.length === 0
    ? `<div class="p-5 text-center text-emerald-700 bg-emerald-50 rounded-2xl border border-emerald-200 text-sm font-medium">
         ✅ ข้อมูลหลัก (รหัสนักศึกษา, เบอร์โทรศัพท์ 10 หลัก, ที่อยู่/โซนอำเภอ) ครบถ้วนสมบูรณ์ 100%!
       </div>`
    : criticalIssueStudents.map(stu => {
        const nonPhotoIssues = (stu.Data_Issues || []).filter(i => i !== 'ยังไม่มีรูปถ่ายนักเรียน');
        return `
          <div class="p-3.5 bg-amber-50/70 hover:bg-amber-50 rounded-2xl border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition">
            <div class="flex items-start gap-3 min-w-0 flex-1">
              ${getAvatarHtml(stu, 'w-12 h-12', 'text-sm')}
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-1.5">
                  <span class="font-mono text-xs font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded-md">${escapeHtml(stu.Student_ID)}</span>
                  <span class="font-prompt font-bold text-slate-900 text-sm">${escapeHtml(stu.Full_Name)}</span>
                  ${stu.Nickname ? `<span class="text-xs text-slate-500">(${escapeHtml(stu.Nickname)})</span>` : ''}
                  ${renderClassAndGroupBadges(stu)}
                </div>
                <div class="flex flex-wrap gap-1.5 mt-1.5">
                  ${nonPhotoIssues.map(iss => `
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                      <i data-lucide="alert-triangle" class="w-3 h-3 shrink-0"></i> <span>${escapeHtml(iss)}</span>
                    </span>
                  `).join('')}
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button onclick="openEditStudentModal('${escapeHtml(stu.Student_ID)}')"
                      class="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-prompt font-semibold flex items-center gap-1.5 shadow-sm transition">
                <i data-lucide="edit-3" class="w-3.5 h-3.5"></i> แก้ไขทันที
              </button>
            </div>
          </div>
        `;
      }).join('');

  container.innerHTML = `
    <!-- 1. KPI Metric Cards (Responsive & Anti-overflow) -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 mb-5 sm:mb-6">
      <div onclick="resetStudentFilters(); switchMainTab('students')" class="interactive-card cursor-pointer bg-white p-3.5 sm:p-4 rounded-2xl shadow-sm border border-slate-200/90">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-medium text-slate-500">นักเรียนทั้งหมด</span>
          <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><i data-lucide="users" class="w-4 h-4"></i></div>
        </div>
        <div class="text-xl sm:text-2xl font-bold font-prompt text-slate-900">${total} <span class="text-xs font-normal text-slate-500">คน</span></div>
        <div class="text-[11px] text-slate-500 mt-1">ปวช. ${pvcCount} • ปวส. ${pvsCount}</div>
      </div>

      <div onclick="jumpToProblemFilter('ALL', 'กลุ่มมีปัญหา')" class="interactive-card cursor-pointer bg-white p-3.5 sm:p-4 rounded-2xl shadow-sm border-2 border-red-200 bg-red-50/20">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-bold text-red-700">🔴 กลุ่มมีปัญหา</span>
          <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0"><i data-lucide="flame" class="w-4 h-4"></i></div>
        </div>
        <div class="text-xl sm:text-2xl font-bold font-prompt text-red-600">${stats.riskProblem} <span class="text-xs font-normal text-slate-500">คน</span></div>
        <div class="text-[11px] text-red-700 mt-1 underline">เร่งด่วน/ซ้ำซ้อน</div>
      </div>

      <div onclick="jumpToProblemFilter('ALL', 'กลุ่มเสี่ยง')" class="interactive-card cursor-pointer bg-white p-3.5 sm:p-4 rounded-2xl shadow-sm border border-amber-300 bg-amber-50/20">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-bold text-amber-800">🟠 กลุ่มเสี่ยง</span>
          <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0"><i data-lucide="alert-triangle" class="w-4 h-4"></i></div>
        </div>
        <div class="text-xl sm:text-2xl font-bold font-prompt text-amber-600">${stats.riskWarning} <span class="text-xs font-normal text-slate-500">คน</span></div>
        <div class="text-[11px] text-amber-800 mt-1 underline">เฝ้าระวังใกล้ชิด</div>
      </div>

      <div onclick="switchMainTab('screening')" class="interactive-card cursor-pointer bg-white p-3.5 sm:p-4 rounded-2xl shadow-sm border border-indigo-200 bg-indigo-50/20">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-bold text-indigo-900">🧠 คัดกรองพฤติกรรม</span>
          <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0"><i data-lucide="activity" class="w-4 h-4"></i></div>
        </div>
        <div class="text-xl sm:text-2xl font-bold font-prompt text-indigo-700">${stats.followupCounts['เฝ้าระวัง'] + stats.followupCounts['กำลังติดตาม'] + stats.followupCounts['ส่งต่อผู้ปกครอง/ปกครอง']} <span class="text-xs font-normal text-slate-500">เคส</span></div>
        <div class="text-[11px] text-indigo-700 mt-1 underline">กดเพื่อติดตามเคส</div>
      </div>

      <div onclick="window.AppState.screeningViewMode='map'; switchMainTab('screening')" class="interactive-card cursor-pointer bg-white p-3.5 sm:p-4 rounded-2xl shadow-sm border border-emerald-200">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-bold text-emerald-800">🗺️ แผนที่เยี่ยมบ้าน</span>
          <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0"><i data-lucide="map-pin" class="w-4 h-4"></i></div>
        </div>
        <div class="text-base sm:text-lg font-bold font-prompt text-emerald-700 mt-1">ปักหมุด ${total} คน</div>
        <div class="text-[11px] text-emerald-700 mt-1 underline">เยี่ยมแล้ว ${stats.homeVisited} คน</div>
      </div>

      <div onclick="openBulkImportModal()" class="interactive-card cursor-pointer bg-gradient-to-br from-indigo-600 to-blue-700 text-white p-3.5 sm:p-4 rounded-2xl shadow-md">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-prompt font-semibold text-indigo-100">นำเข้า Google Form</span>
          <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0"><i data-lucide="file-spreadsheet" class="w-4 h-4"></i></div>
        </div>
        <div class="text-sm sm:text-base font-bold font-prompt mt-1">ปวช.1–3 / ปวส.1–2</div>
        <div class="text-[11px] text-indigo-100 mt-1 underline">กดเพื่อนำเข้าข้อมูล</div>
      </div>
    </div>

    <!-- 2. ศูนย์คัดกรองและติดตามนักเรียนแยก 5 หมวดหมู่ชัดเจน (5-Dimension Categorized Screening Center) -->
    <div class="bg-white rounded-3xl shadow-sm border border-slate-200/90 p-3.5 sm:p-6 mb-6 space-y-5">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-slate-100">
        <div>
          <h2 class="font-prompt font-bold text-sm sm:text-lg text-slate-900 flex items-center gap-2 leading-snug">
            <i data-lucide="layers" class="w-5 h-5 text-indigo-600 shrink-0"></i>
            <span>ศูนย์คัดกรองและติดตามพฤติกรรมนักเรียนแยก 5 หมวดหมู่ (แตะหมวดหมู่เพื่อดูรายชื่อทันที)</span>
          </h2>
          <p class="text-xs text-slate-500 mt-0.5 leading-snug">
            ออกแบบแยกสีตามหมวดหมู่เพื่อให้ครูที่ปรึกษาและงานปกครองคัดกรอง ติดตามเคส และช่วยเหลือเด็กได้ตรงจุด
          </p>
        </div>
        <button onclick="switchMainTab('screening')" class="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-prompt font-bold flex items-center gap-1.5 self-start sm:self-center shrink-0 border border-indigo-200">
          <i data-lucide="clipboard-check" class="w-4 h-4"></i> ไปหน้าบันทึกติดตามเคส & แผนที่
        </button>
      </div>

      <!-- หมวดหมู่ที่ 1 & 2: พฤติกรรมการเรียน และ พฤติกรรมอารมณ์/สังคม -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <!-- หมวด 1: พฤติกรรมการเรียน & การมาเรียน -->
        <div class="p-3.5 sm:p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200/90 space-y-2.5">
          <div class="flex items-center justify-between">
            <h3 class="font-prompt font-bold text-xs sm:text-sm text-indigo-950 flex items-center gap-1.5">
              <span class="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs shrink-0">1</span>
              หมวดพฤติกรรมการเรียน & การมาเรียน
            </h3>
            <span class="text-[11px] font-semibold text-indigo-700 bg-white px-2 py-0.5 rounded-lg border border-indigo-200">แตะเพื่อกรอง</span>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            ${window.BEHAVIOR_CATALOG.learning.items.map(it => {
              const cnt = stats.behaviorCounts[it.id] || 0;
              return `
                <button onclick="jumpToProblemFilter('${escapeHtml(it.id)}')"
                        class="p-2.5 rounded-xl bg-white hover:bg-indigo-100/70 border border-indigo-200/80 text-left flex items-center justify-between gap-1.5 transition shadow-sm">
                  <span class="text-xs font-prompt font-semibold text-slate-800 leading-tight">${escapeHtml(it.id)}</span>
                  <span class="px-2 py-0.5 rounded-lg text-xs font-prompt font-bold ${cnt > 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'} shrink-0">${cnt}</span>
                </button>
              `;
            }).join('')}
            <button onclick="jumpToProblemFilter('ถูกหักคะแนนความประพฤติ')"
                    class="p-2.5 rounded-xl bg-white hover:bg-rose-50 border border-rose-200 text-left flex items-center justify-between gap-1.5 transition shadow-sm">
              <span class="text-xs font-prompt font-semibold text-rose-900 leading-tight">🚨 ถูกตัดคะแนน</span>
              <span class="px-2 py-0.5 rounded-lg text-xs font-prompt font-bold bg-rose-100 text-rose-700 shrink-0">${stats.disciplineDeducted}</span>
            </button>
          </div>
        </div>

        <!-- หมวด 2: พฤติกรรมอารมณ์ สังคม & จุดแข็ง -->
        <div class="p-3.5 sm:p-4 rounded-2xl bg-purple-50/60 border border-purple-200/90 space-y-2.5">
          <div class="flex items-center justify-between">
            <h3 class="font-prompt font-bold text-xs sm:text-sm text-purple-950 flex items-center gap-1.5">
              <span class="w-6 h-6 rounded-lg bg-purple-600 text-white flex items-center justify-center text-xs shrink-0">2</span>
              หมวดอารมณ์ สังคม การใช้ชีวิต & จุดแข็ง
            </h3>
            <span class="text-[11px] font-semibold text-purple-700 bg-white px-2 py-0.5 rounded-lg border border-purple-200">แตะเพื่อกรอง</span>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            ${window.BEHAVIOR_CATALOG.emotional.items.map(it => {
              const cnt = stats.behaviorCounts[it.id] || 0;
              return `
                <button onclick="jumpToProblemFilter('${escapeHtml(it.id)}')"
                        class="p-2.5 rounded-xl bg-white hover:bg-purple-100/70 border border-purple-200/80 text-left flex items-center justify-between gap-1.5 transition shadow-sm">
                  <span class="text-xs font-prompt font-semibold text-slate-800 leading-tight">${escapeHtml(it.id)}</span>
                  <span class="px-2 py-0.5 rounded-lg text-xs font-prompt font-bold ${cnt > 0 ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-600'} shrink-0">${cnt}</span>
                </button>
              `;
            }).join('')}
            <button onclick="jumpToProblemFilter('POSITIVE_BEHAVIOR')"
                    class="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-left flex items-center justify-between gap-1.5 transition shadow-sm">
              <span class="text-xs font-prompt font-bold text-emerald-900 leading-tight">🌟 จุดแข็ง/ดีเด่น</span>
              <span class="px-2 py-0.5 rounded-lg text-xs font-prompt font-bold bg-white text-emerald-700 shrink-0">${stats.positiveBehavior}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- หมวดหมู่ที่ 3 & 4: สารเสพติด และ เศรษฐกิจ/ทุน/ครอบครัว -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <!-- หมวด 3: บุหรี่ สุรา และสารเสพติด -->
        <div class="p-3.5 sm:p-4 rounded-2xl bg-orange-50/60 border border-orange-200/90 space-y-2.5">
          <div class="flex items-center justify-between">
            <h3 class="font-prompt font-bold text-xs sm:text-sm text-orange-950 flex items-center gap-1.5">
              <span class="w-6 h-6 rounded-lg bg-orange-600 text-white flex items-center justify-center text-xs shrink-0">3</span>
              หมวดบุหรี่ สุรา & สารเสพติด (จากฟอร์มจริง)
            </h3>
            <span class="text-[11px] font-bold text-orange-800 bg-white px-2 py-0.5 rounded-lg border border-orange-200">พบ ${stats.anySubstance} คน</span>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <button onclick="jumpToProblemFilter('สูบบุหรี่')" class="p-2.5 rounded-xl bg-white hover:bg-orange-100 border border-orange-200 text-left flex flex-col justify-between shadow-sm">
              <span class="text-xs font-prompt font-bold text-orange-950">🚬 บุหรี่</span>
              <span class="text-base font-prompt font-bold text-orange-600 mt-1">${stats.smoke} <small class="text-[10px] text-slate-500">คน</small></span>
            </button>
            <button onclick="jumpToProblemFilter('ดื่มเหล้า/เบียร์')" class="p-2.5 rounded-xl bg-white hover:bg-purple-100 border border-purple-200 text-left flex flex-col justify-between shadow-sm">
              <span class="text-xs font-prompt font-bold text-purple-950">🍺 สุรา/เบียร์</span>
              <span class="text-base font-prompt font-bold text-purple-600 mt-1">${stats.alcohol} <small class="text-[10px] text-slate-500">คน</small></span>
            </button>
            <button onclick="jumpToProblemFilter('น้ำกระท่อม')" class="p-2.5 rounded-xl bg-white hover:bg-rose-100 border border-rose-300 text-left flex flex-col justify-between shadow-sm">
              <span class="text-xs font-prompt font-bold text-rose-950">🌿 กระท่อม</span>
              <span class="text-base font-prompt font-bold text-rose-600 mt-1">${stats.kratom} <small class="text-[10px] text-slate-500">คน</small></span>
            </button>
            <button onclick="jumpToProblemFilter('กัญชา')" class="p-2.5 rounded-xl bg-white hover:bg-red-100 border border-red-300 text-left flex flex-col justify-between shadow-sm">
              <span class="text-xs font-prompt font-bold text-red-950">🍁 กัญชา</span>
              <span class="text-base font-prompt font-bold text-red-600 mt-1">${stats.weed} <small class="text-[10px] text-slate-500">คน</small></span>
            </button>
            <button onclick="jumpToProblemFilter('NO_SUBSTANCE')" class="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-left flex flex-col justify-between shadow-sm">
              <span class="text-xs font-prompt font-bold text-emerald-950">🛡️ ไม่ดื่ม/สูบ</span>
              <span class="text-base font-prompt font-bold text-emerald-700 mt-1">${stats.cleanSubstance} <small class="text-[10px] text-emerald-700">คน</small></span>
            </button>
          </div>
        </div>

        <!-- หมวด 4: เศรษฐกิจ ครอบครัว & ทุนการศึกษา -->
        <div class="p-3.5 sm:p-4 rounded-2xl bg-blue-50/60 border border-blue-200/90 space-y-2.5">
          <div class="flex items-center justify-between">
            <h3 class="font-prompt font-bold text-xs sm:text-sm text-blue-950 flex items-center gap-1.5">
              <span class="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs shrink-0">4</span>
              หมวดเศรษฐกิจ ครอบครัว & ความต้องการทุนฯ
            </h3>
            <span class="text-[11px] font-semibold text-blue-800 bg-white px-2 py-0.5 rounded-lg border border-blue-200">คัดกรองทุนฯ</span>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button onclick="jumpToProblemFilter('รายได้ต่ำ (<10,000 บ.)')" class="p-2.5 rounded-xl bg-white hover:bg-amber-50 border border-amber-200 text-left flex flex-col justify-between shadow-sm">
              <span class="text-xs font-prompt font-bold text-amber-950">💰 รายได้ &lt;10k</span>
              <span class="text-base font-prompt font-bold text-amber-700 mt-1">${stats.lowIncome} <small class="text-[10px] text-slate-500">คน</small></span>
            </button>
            <button onclick="jumpToProblemFilter('ต้องการทุนการศึกษา')" class="p-2.5 rounded-xl bg-white hover:bg-blue-100 border border-blue-200 text-left flex flex-col justify-between shadow-sm">
              <span class="text-xs font-prompt font-bold text-blue-950">🎓 ต้องการทุนฯ</span>
              <span class="text-base font-prompt font-bold text-blue-700 mt-1">${stats.scholarship} <small class="text-[10px] text-slate-500">คน</small></span>
            </button>
            <button onclick="jumpToProblemFilter('ค่าขนมน้อย (<100 บ.)')" class="p-2.5 rounded-xl bg-white hover:bg-pink-50 border border-pink-200 text-left flex flex-col justify-between shadow-sm">
              <span class="text-xs font-prompt font-bold text-pink-950">💸 ค่าขนม &lt;100</span>
              <span class="text-base font-prompt font-bold text-pink-700 mt-1">${stats.lowAllowance} <small class="text-[10px] text-slate-500">คน</small></span>
            </button>
            <button onclick="jumpToProblemFilter('ครอบครัวหย่าร้าง/แยกกันอยู่')" class="p-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-left flex flex-col justify-between shadow-sm">
              <span class="text-xs font-prompt font-bold text-slate-800">🏠 ครอบครัวแยก</span>
              <span class="text-base font-prompt font-bold text-slate-700 mt-1">${stats.brokenFamily} <small class="text-[10px] text-slate-500">คน</small></span>
            </button>
          </div>
        </div>
      </div>

      <!-- หมวดหมู่ที่ 5: สถานะการติดตามดูแลเคส (Case Follow-up Tracking Pipeline) -->
      <div class="p-3.5 sm:p-4 rounded-2xl bg-slate-900 text-white space-y-2.5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h3 class="font-prompt font-bold text-xs sm:text-sm flex items-center gap-2">
            <span class="w-6 h-6 rounded-lg bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-xs shrink-0">5</span>
            สถานะการติดตามดูแลและช่วยเหลือนักเรียน (Case Follow-up Pipeline)
          </h3>
          <span class="text-[11px] text-blue-200">คลิกที่สถานะเพื่อกรองดูรายชื่อนักเรียนในแต่ละขั้นตอน</span>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
          ${window.FOLLOWUP_STATUS_LIST.map(st => {
            const cnt = stats.followupCounts[st.id] || 0;
            return `
              <button onclick="jumpToProblemFilter('ALL', 'ALL', '${escapeHtml(st.id)}')"
                      class="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-left flex items-center justify-between gap-2 transition">
                <span class="text-xs font-prompt font-medium text-white leading-snug">${escapeHtml(st.id)}</span>
                <span class="px-2 py-0.5 rounded-lg text-xs font-prompt font-bold bg-white text-slate-900 shrink-0">${cnt}</span>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    </div>

    <!-- 3. สรุปข้อมูลแยกตามกลุ่มเรียน (กลุ่ม1 - กลุ่ม5) -->
    <div class="mb-6">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <h2 class="font-prompt font-bold text-base sm:text-lg text-slate-900 flex items-center gap-2">
            <i data-lucide="users" class="w-5 h-5 text-blue-700"></i>
            ข้อมูลชั้นเรียนและกลุ่มเรียนทั้งหมด (${groups.length} กลุ่มเรียน)
          </h2>
          <p class="text-xs text-slate-500">แตะที่การ์ดกลุ่มเรียนเพื่อดูรายชื่อ หรือกดปุ่ม "+ นำเข้า Google Form / ชั้นปีอื่น" เพื่อเพิ่ม ปวช.2, ปวช.3, ปวส.2</p>
        </div>
        <button onclick="openBulkImportModal()" class="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-prompt font-semibold flex items-center gap-1.5 shadow-sm">
          <i data-lucide="file-spreadsheet" class="w-4 h-4"></i> + นำเข้า Google Form / ชั้นปีอื่น
        </button>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        ${groupCardsHtml}
      </div>
    </div>

    <!-- 4. กล่องคิวแก้ไขข้อมูลที่ผิดพลาด (Data Fix Queue) -->
    <div class="bg-white rounded-3xl shadow-sm border border-slate-200/90 p-4 sm:p-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div class="flex items-start sm:items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <i data-lucide="clipboard-check" class="w-5 h-5"></i>
          </div>
          <div>
            <h2 class="font-prompt font-bold text-sm sm:text-lg text-slate-900 leading-snug">
              รายการตรวจพบข้อมูลพื้นฐาน/เบอร์โทรศัพท์ไม่สมบูรณ์ (${criticalIssueStudents.length} รายการ)
            </h2>
            <p class="text-xs text-slate-500">
              กดปุ่ม <b>"แก้ไขทันที"</b> เพื่อซ่อมข้อมูลให้ถูกต้องสมบูรณ์
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
  window.AppState.filterFollowupStatus = 'ALL';
  renderAll();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================================
// TAB 2: ทำเนียบนักเรียน (3 มุมมอง: การ์ดแยกหมวดไม่ตกขอบ / รายการมือถือ / ตาราง PC)
// ============================================================================
function getFilteredStudents360() {
  const all = window.appDB.getAllStudents360();
  const q = (window.AppState.searchQuery || '').trim().toLowerCase();

  const positiveIds = window.BEHAVIOR_CATALOG.positive.items.map(i => i.id);

  return all.filter(s => {
    if (window.AppState.filterClassId !== 'ALL' && s.Class_ID !== window.AppState.filterClassId) return false;
    if (window.AppState.filterLevelYear !== 'ALL' && s.ClassGroup.Level_Year !== window.AppState.filterLevelYear) return false;
    if (window.AppState.filterGroupLabel !== 'ALL' && s.ClassGroup.Group_Label !== window.AppState.filterGroupLabel) return false;
    if (window.AppState.filterDistrict !== 'ALL' && s.Zone_District !== window.AppState.filterDistrict) return false;
    if (window.AppState.filterPhoto !== 'ALL' && s.Photo_Status !== window.AppState.filterPhoto) return false;
    if (window.AppState.filterRisk !== 'ALL' && s.Screening.Overall_Risk_Level !== window.AppState.filterRisk) return false;
    if (window.AppState.filterFollowupStatus !== 'ALL' && (s.Screening.Followup_Status || 'ปกติ') !== window.AppState.filterFollowupStatus) return false;

    const pTag = window.AppState.filterProblemTag;
    if (pTag !== 'ALL') {
      const subTags = s.Substance_Tags || [];
      const riskTags = (s.Screening && s.Screening.Risk_Tags) || [];
      const bTags = (s.Screening && s.Screening.Behavior_Tags) || [];
      if (pTag === 'ANY_SUBSTANCE') {
        if (!subTags.some(t => ['บุหรี่', 'เหล้า/เบียร์', 'น้ำกระท่อม', 'กัญชา'].includes(t))) return false;
      } else if (pTag === 'NO_SUBSTANCE') {
        if (!subTags.includes('ไม่ดื่ม/ไม่สูบ')) return false;
      } else if (pTag === 'POSITIVE_BEHAVIOR') {
        if (!bTags.some(t => positiveIds.includes(t))) return false;
      } else {
        if (!subTags.includes(pTag) && !riskTags.includes(pTag) && !bTags.includes(pTag)) return false;
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
        (s.Screening && s.Screening.Risk_Factors_Note) || '',
        ((s.Screening && s.Screening.Behavior_Tags) || []).join(' '),
        (s.Screening && s.Screening.Followup_Status) || ''
      ].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function renderStudentsTab() {
  const all360 = window.appDB.getAllStudents360();
  const stats = window.appDB.getProblemAndSubstanceSummary();

  const groupBar = document.getElementById('quickGroupFilterBar');
  if (groupBar) {
    const uniqueLevels = ['ALL', ...Array.from(new Set(all360.map(s => s.ClassGroup.Level_Year))).sort((a, b) => a.localeCompare(b, 'th'))];
    const groupLabels = ['ALL', 'กลุ่ม1', 'กลุ่ม2', 'กลุ่ม3', 'กลุ่ม4', 'กลุ่ม5'];

    groupBar.innerHTML = `
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          <span class="text-xs font-prompt font-bold text-slate-500 mr-1 shrink-0">ระดับชั้น:</span>
          ${uniqueLevels.map(lv => {
            const active = window.AppState.filterLevelYear === lv && window.AppState.filterClassId === 'ALL';
            const cnt = lv === 'ALL' ? all360.length : all360.filter(s => s.ClassGroup.Level_Year === lv).length;
            return `
              <button onclick="setQuickLevelFilter('${lv}')"
                      class="px-2.5 py-1.5 rounded-xl text-xs font-prompt font-semibold whitespace-nowrap transition shrink-0 ${active ? 'bg-blue-700 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">
                ${lv === 'ALL' ? `ทั้งหมด (${cnt})` : `${lv} (${cnt})`}
              </button>
            `;
          }).join('')}
        </div>

        <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          <span class="text-xs font-prompt font-bold text-slate-500 mr-1 shrink-0">กลุ่ม:</span>
          ${groupLabels.map(gl => {
            const active = window.AppState.filterGroupLabel === gl && window.AppState.filterClassId === 'ALL';
            const cnt = gl === 'ALL'
              ? all360.length
              : all360.filter(s => (window.AppState.filterLevelYear === 'ALL' || s.ClassGroup.Level_Year === window.AppState.filterLevelYear) && s.ClassGroup.Group_Label === gl).length;
            return `
              <button onclick="setQuickGroupLabelFilter('${gl}')"
                      class="px-2.5 py-1.5 rounded-xl text-xs font-prompt font-semibold whitespace-nowrap transition shrink-0 ${active ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">
                ${gl === 'ALL' ? `ทุกกลุ่ม` : `${gl} (${cnt})`}
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  const problemBar = document.getElementById('quickProblemFilterBar');
  if (problemBar) {
    const problemPills = [
      { id: 'ALL', label: `ทั้งหมด (${stats.total})` },
      { id: 'ขาดเรียนบ่อย', label: `📌 ขาดเรียนบ่อย (${stats.behaviorCounts['ขาดเรียนบ่อย'] || 0})` },
      { id: 'มาสายบ่อย', label: `⏰ มาสายบ่อย (${stats.behaviorCounts['มาสายบ่อย'] || 0})` },
      { id: 'เสี่ยงติด 0/ร/มส', label: `📉 เสี่ยง 0/ร/มส (${stats.behaviorCounts['เสี่ยงติด 0/ร/มส'] || 0})` },
      { id: 'ติดเกม/มือถือ', label: `🎮 ติดเกม/มือถือ (${stats.behaviorCounts['ติดเกม/มือถือ'] || 0})` },
      { id: 'สูบบุหรี่', label: `🚬 บุหรี่ (${stats.smoke})` },
      { id: 'ดื่มเหล้า/เบียร์', label: `🍺 สุรา/เบียร์ (${stats.alcohol})` },
      { id: 'น้ำกระท่อม', label: `🌿 กระท่อม (${stats.kratom})` },
      { id: 'กัญชา', label: `🍁 กัญชา (${stats.weed})` },
      { id: 'NO_SUBSTANCE', label: `🛡️ ไม่ดื่ม/สูบ (${stats.cleanSubstance})` },
      { id: 'รายได้ต่ำ (<10,000 บ.)', label: `💰 รายได้ต่ำ (${stats.lowIncome})` },
      { id: 'ต้องการทุนการศึกษา', label: `🎓 ขอทุนฯ (${stats.scholarship})` }
    ];

    problemBar.innerHTML = `
      <div class="flex flex-col gap-2">
        <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          <span class="text-xs font-prompt font-bold text-rose-700 mr-1 shrink-0 flex items-center gap-1">
            <i data-lucide="filter" class="w-3.5 h-3.5"></i> หมวดคัดกรอง:
          </span>
          ${problemPills.map(p => {
            const active = window.AppState.filterProblemTag === p.id;
            return `
              <button onclick="setQuickProblemTag('${p.id}')"
                      class="px-2.5 py-1.5 rounded-xl text-xs font-prompt font-semibold whitespace-nowrap transition shrink-0 ${active ? 'bg-rose-600 text-white shadow-sm' : 'bg-rose-50/70 text-rose-900 border border-rose-200 hover:bg-rose-100'}">
                ${p.label}
              </button>
            `;
          }).join('')}
        </div>
        <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          <span class="text-xs font-prompt font-bold text-indigo-800 mr-1 shrink-0">สถานะติดตาม:</span>
          <button onclick="setQuickFollowupFilter('ALL')"
                  class="px-2.5 py-1 rounded-xl text-xs font-prompt font-semibold whitespace-nowrap transition shrink-0 ${window.AppState.filterFollowupStatus === 'ALL' ? 'bg-indigo-700 text-white' : 'bg-indigo-50 text-indigo-900 border border-indigo-200'}">
            ทุกสถานะ
          </button>
          ${window.FOLLOWUP_STATUS_LIST.map(st => {
            const active = window.AppState.filterFollowupStatus === st.id;
            const cnt = stats.followupCounts[st.id] || 0;
            return `
              <button onclick="setQuickFollowupFilter('${escapeHtml(st.id)}')"
                      class="px-2.5 py-1 rounded-xl text-xs font-prompt font-semibold whitespace-nowrap transition shrink-0 ${active ? 'bg-indigo-700 text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'}">
                ${escapeHtml(st.id)} (${cnt})
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  const filtered = getFilteredStudents360();
  const countEl = document.getElementById('filteredStudentCount');
  if (countEl) countEl.textContent = `${filtered.length} คน`;

  ['Grid', 'Compact', 'Table'].forEach(mode => {
    const btn = document.getElementById(`btnView${mode}`);
    if (btn) {
      const isMatch = window.AppState.studentViewMode === mode.toLowerCase();
      btn.className = isMatch
        ? 'px-2.5 py-1 rounded-lg text-xs font-prompt font-semibold flex items-center gap-1 bg-white text-slate-900 shadow-sm'
        : 'px-2.5 py-1 rounded-lg text-xs font-prompt font-medium flex items-center gap-1 text-slate-600';
    }
  });

  const issueBtn = document.getElementById('toggleIssueOnlyBtn');
  if (issueBtn) {
    issueBtn.className = window.AppState.filterIssueOnly
      ? 'px-2.5 py-1.5 rounded-xl text-xs font-prompt font-semibold flex items-center gap-1.5 bg-red-600 text-white shadow-sm transition shrink-0'
      : 'px-2.5 py-1.5 rounded-xl text-xs font-prompt font-medium flex items-center gap-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 transition shrink-0';
  }

  const gridContainer = document.getElementById('studentsGridContainer');
  const compactContainer = document.getElementById('studentsCompactContainer');
  const tableContainer = document.getElementById('studentsTableContainer');
  if (!gridContainer || !compactContainer || !tableContainer) return;

  gridContainer.classList.toggle('hidden', window.AppState.studentViewMode !== 'grid');
  compactContainer.classList.toggle('hidden', window.AppState.studentViewMode !== 'compact');
  tableContainer.classList.toggle('hidden', window.AppState.studentViewMode !== 'table');

  if (filtered.length === 0) {
    const emptyHtml = `
      <div class="col-span-full bg-white rounded-3xl p-8 sm:p-10 text-center border border-slate-200">
        <div class="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
          <i data-lucide="search-x" class="w-6 h-6"></i>
        </div>
        <h3 class="font-prompt font-bold text-slate-800 text-sm sm:text-base">ไม่พบข้อมูลนักเรียนตามเงื่อนไขที่เลือก</h3>
        <button onclick="resetStudentFilters()" class="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-prompt font-semibold">
          ล้างตัวกรองทั้งหมด
        </button>
      </div>
    `;
    gridContainer.innerHTML = emptyHtml;
    compactContainer.innerHTML = emptyHtml;
    tableContainer.innerHTML = emptyHtml;
    return;
  }

  // 1. Render Categorized Grid Cards (แยก 4 หมวดสีชัดเจน ตัวหนังสือไม่ตกขอบบนมือถือ)
  gridContainer.innerHTML = filtered.map(stu => {
    const nonPhotoIssues = (stu.Data_Issues || []).filter(i => i !== 'ยังไม่มีรูปถ่ายนักเรียน');
    const riskLvl = stu.Screening.Overall_Risk_Level;
    const borderAccent = riskLvl === 'กลุ่มมีปัญหา'
      ? 'border-t-4 border-t-red-500 border-slate-200'
      : riskLvl === 'กลุ่มเสี่ยง'
        ? 'border-t-4 border-t-amber-500 border-slate-200'
        : 'border-t-4 border-t-emerald-500 border-slate-200';

    return `
      <div class="interactive-card bg-white rounded-3xl border ${borderAccent} shadow-sm p-3.5 sm:p-5 flex flex-col justify-between gap-3 overflow-hidden">
        <div class="space-y-2.5">
          <!-- หมวดที่ 1: ข้อมูลประจำตัว, กลุ่มเรียน & สถานะการติดตาม -->
          <div class="flex items-start gap-3">
            <div onclick="openStudent360Modal('${escapeHtml(stu.Student_ID)}')" class="cursor-pointer shrink-0">
              ${getAvatarHtml(stu, 'w-14 h-14 sm:w-16 sm:h-16', 'text-base sm:text-lg')}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex flex-wrap items-center justify-between gap-1">
                <span class="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                  ${escapeHtml(stu.Student_ID)}
                </span>
                ${getRiskBadge(riskLvl)}
              </div>
              <h3 onclick="openStudent360Modal('${escapeHtml(stu.Student_ID)}')"
                  class="font-prompt font-bold text-slate-900 text-sm sm:text-base mt-1 leading-snug cursor-pointer hover:text-blue-700">
                ${escapeHtml(stu.Full_Name)}
                ${stu.Nickname ? `<span class="text-xs font-normal text-slate-500">(${escapeHtml(stu.Nickname)})</span>` : ''}
              </h3>
              <div class="flex flex-wrap items-center gap-1 mt-1.5">
                ${renderClassAndGroupBadges(stu)}
                ${getFollowupBadge(stu.Screening.Followup_Status)}
              </div>
            </div>
          </div>

          <!-- หมวดที่ 2: พฤติกรรมนักเรียน & การติดตามเคส -->
          <div class="cat-section bg-indigo-50/55 border border-indigo-200/80 space-y-1.5">
            <div class="flex flex-wrap items-center justify-between gap-1">
              <span class="text-[11px] font-prompt font-bold text-indigo-950 flex items-center gap-1">
                <i data-lucide="activity" class="w-3.5 h-3.5 text-indigo-600 shrink-0"></i> พฤติกรรม & การเรียน:
              </span>
              <button onclick="openBehaviorFollowupModal('${escapeHtml(stu.Student_ID)}')"
                      class="px-2 py-0.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-prompt font-semibold flex items-center gap-1 shadow-sm transition">
                <i data-lucide="plus-circle" class="w-3 h-3"></i> คัดกรอง/ติดตาม
              </button>
            </div>
            <div class="flex flex-wrap gap-1">
              ${renderBehaviorBadges(stu)}
            </div>
          </div>

          <!-- หมวดที่ 3: ข้อมูลการใช้บุหรี่/สารเสพติด & สาเหตุความเสี่ยง -->
          ${renderSubstanceBox(stu, false)}

          <div class="cat-section bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div class="text-[11px] font-prompt font-bold text-slate-700 flex flex-wrap items-center justify-between gap-1">
              <span>📌 สาเหตุความเสี่ยงรวม:</span>
              <span class="text-slate-600 font-normal">คะแนนความประพฤติ: <b class="${stu.BehaviorScore < 80 ? 'text-red-600' : 'text-emerald-700'}">${stu.BehaviorScore}</b></span>
            </div>
            <div class="flex flex-wrap gap-1">
              ${renderRiskReasonBadges(stu)}
            </div>
            <div class="pt-1 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-600">
              <span>รายได้: <b class="text-slate-800">${escapeHtml(stu.Screening.Family_Income_Range || '-')}</b></span>
              <span>ทุนฯ: <b class="${stu.Screening.Scholarship_Need === 'ต้องการ' ? 'text-blue-700' : 'text-slate-800'}">${escapeHtml(stu.Screening.Scholarship_Need || '-')}</b></span>
            </div>
          </div>

          <!-- หมวดที่ 4: โซนพื้นที่ & ปุ่มกดโทรด่วนสำหรับมือถือ -->
          <div class="cat-section bg-blue-50/40 border border-blue-100/90 space-y-2 text-xs">
            <div class="flex flex-wrap items-center justify-between gap-1">
              <span class="text-slate-600 flex items-center gap-1"><i data-lucide="map-pin" class="w-3.5 h-3.5 text-indigo-600 shrink-0"></i> โซนบ้านพัก:</span>
              <span class="font-prompt font-bold text-indigo-950">อ.${escapeHtml(stu.Zone_District)} ${stu.Subdistrict ? `(ต.${escapeHtml(stu.Subdistrict)})` : ''}</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              ${stu.Phone_Number
                ? `<a href="tel:${escapeHtml(stu.Phone_Number)}" class="py-2 px-2.5 rounded-xl bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 font-prompt font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm">
                     <i data-lucide="phone-call" class="w-3.5 h-3.5 shrink-0"></i> <span>โทร นร: ${escapeHtml(stu.Phone_Number)}</span>
                   </a>`
                : `<span class="py-2 px-2.5 rounded-xl bg-red-50 text-red-600 text-xs text-center font-medium">ไม่มีเบอร์ นร.</span>`}
              ${stu.Parent_Phone
                ? `<a href="tel:${escapeHtml(stu.Parent_Phone)}" class="py-2 px-2.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 font-prompt font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm">
                     <i data-lucide="phone" class="w-3.5 h-3.5 shrink-0"></i> <span>ผปก: ${escapeHtml(stu.Parent_Phone)}</span>
                   </a>`
                : `<span class="py-2 px-2.5 rounded-xl bg-red-50 text-red-600 text-xs text-center font-medium">ไม่มีเบอร์ ผปก.</span>`}
            </div>
          </div>

          ${nonPhotoIssues.length > 0 ? `
            <div class="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-1.5">
              <i data-lucide="alert-triangle" class="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5"></i>
              <span class="leading-snug">รอแก้ไข: ${escapeHtml(nonPhotoIssues.join(', '))}</span>
            </div>
          ` : ''}
        </div>

        <!-- Bottom Action Buttons -->
        <div class="pt-2.5 border-t border-slate-100 grid grid-cols-3 gap-1.5">
          <button onclick="openStudent360Modal('${escapeHtml(stu.Student_ID)}')"
                  class="py-2 px-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-prompt font-semibold flex items-center justify-center gap-1 shadow-sm transition">
            <i data-lucide="eye" class="w-3.5 h-3.5 shrink-0"></i> <span>โปรไฟล์</span>
          </button>
          <button onclick="openBehaviorFollowupModal('${escapeHtml(stu.Student_ID)}')"
                  class="py-2 px-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-prompt font-semibold flex items-center justify-center gap-1 transition">
            <i data-lucide="clipboard-check" class="w-3.5 h-3.5 shrink-0"></i> <span>พฤติกรรม</span>
          </button>
          <button onclick="openEditStudentModal('${escapeHtml(stu.Student_ID)}')"
                  class="py-2 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-prompt font-semibold flex items-center justify-center gap-1 transition">
            <i data-lucide="edit-3" class="w-3.5 h-3.5 shrink-0"></i> <span>แก้ไข</span>
          </button>
        </div>
      </div>
    `;
  }).join('');

  // 2. Render Mobile Compact List View (ไม่ตัดชื่อตกขอบ)
  compactContainer.innerHTML = filtered.map(stu => `
    <div class="bg-white rounded-2xl border border-slate-200/90 p-3 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
      <div onclick="openStudent360Modal('${escapeHtml(stu.Student_ID)}')" class="flex items-start sm:items-center gap-3 min-w-0 flex-1 cursor-pointer">
        ${getAvatarHtml(stu, 'w-12 h-12', 'text-sm')}
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-1">
            <span class="font-mono text-[11px] font-bold text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded">${escapeHtml(stu.Student_ID)}</span>
            ${renderClassAndGroupBadges(stu)}
            ${getRiskBadge(stu.Screening.Overall_Risk_Level)}
          </div>
          <div class="font-prompt font-bold text-slate-900 text-sm leading-snug mt-1">
            ${escapeHtml(stu.Full_Name)} ${stu.Nickname ? `<span class="text-xs font-normal text-slate-500">(${escapeHtml(stu.Nickname)})</span>` : ''}
          </div>
          <div class="text-[11px] text-slate-600 mt-0.5 leading-snug">
            อ.${escapeHtml(stu.Zone_District)} • ดื่ม/สูบ: <b>"${escapeHtml(stu.Substance_Raw)}"</b> • ${escapeHtml(stu.Screening.Followup_Status || 'ปกติ')}
          </div>
        </div>
      </div>
      <div class="flex items-center justify-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
        ${stu.Phone_Number ? `<a href="tel:${escapeHtml(stu.Phone_Number)}" class="px-2.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-semibold flex items-center gap-1"><i data-lucide="phone" class="w-3.5 h-3.5"></i> โทร</a>` : ''}
        <button onclick="openBehaviorFollowupModal('${escapeHtml(stu.Student_ID)}')" class="px-2.5 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-prompt font-semibold">พฤติกรรม</button>
        <button onclick="openStudent360Modal('${escapeHtml(stu.Student_ID)}')" class="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-prompt font-semibold">ดู 360°</button>
      </div>
    </div>
  `).join('');

  // 3. Render PC Table View
  tableContainer.innerHTML = `
    <div class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr class="bg-slate-900 text-white font-prompt text-xs">
              <th class="py-3.5 px-3">รูป</th>
              <th class="py-3.5 px-3">รหัสนักศึกษา</th>
              <th class="py-3.5 px-3">ชื่อ-นามสกุล (ชื่อเล่น)</th>
              <th class="py-3.5 px-3">ชั้น / กลุ่ม</th>
              <th class="py-3.5 px-3">พฤติกรรม & การติดตาม</th>
              <th class="py-3.5 px-3">บุหรี่/สารเสพติด (ตามฟอร์ม)</th>
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
                  <div class="mb-1">${getFollowupBadge(stu.Screening.Followup_Status)}</div>
                  <div class="flex flex-wrap gap-1">${renderBehaviorBadges(stu)}</div>
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
                    <button onclick="openBehaviorFollowupModal('${escapeHtml(stu.Student_ID)}')" class="px-2.5 py-1.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-prompt font-semibold">พฤติกรรม</button>
                    <button onclick="openStudent360Modal('${escapeHtml(stu.Student_ID)}')" class="px-2.5 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-prompt font-semibold">360°</button>
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

function setQuickFollowupFilter(status) {
  window.AppState.filterFollowupStatus = status;
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
  window.AppState.filterFollowupStatus = 'ALL';
  window.AppState.filterIssueOnly = false;
  const searchInput = document.getElementById('studentSearchInput');
  if (searchInput) searchInput.value = '';
  renderAll();
}

// ============================================================================
// SMART GOOGLE FORMS IMPORTER & BULK IMPORT FOR OTHER ACADEMIC YEARS
// ============================================================================
function openBulkImportModal() {
  const modal = document.getElementById('bulkImportModal');
  const body = document.getElementById('bulkImportModalBody');
  if (!modal || !body) return;

  const savedSheetCsvUrl = localStorage.getItem('STUDENT_GOOGLE_SHEET_CSV_URL') || '';

  body.innerHTML = `
    <div class="space-y-4 text-xs sm:text-sm">
      <!-- คู่มือการใช้ Google Form เก็บข้อมูลชั้นปีอื่นแบบเข้าใจง่าย -->
      <div class="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 space-y-2">
        <h4 class="font-prompt font-bold text-blue-950 text-xs sm:text-sm flex items-center gap-1.5">
          <i data-lucide="help-circle" class="w-4 h-4 text-blue-600 shrink-0"></i>
          <span>วิธีนำข้อมูลนักเรียนชั้นปีอื่น (ปวช.2, ปวช.3, ปวส.2) จาก Google Form เข้าสู่ระบบ</span>
        </h4>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-700">
          <div class="bg-white/90 p-2.5 rounded-xl border border-blue-100">
            <b class="text-blue-900 font-prompt block mb-0.5">ขั้นตอนที่ 1: ใช้ฟอร์มเดิมได้เลย</b>
            ส่งลิงก์ Google Form เดิมให้นักเรียนชั้นปีอื่นกรอก (ระบบแยกชั้นปีจากรหัส <code>682..=ปวช.2</code>, <code>672..=ปวช.3</code>, <code>683..=ปวส.2</code> อัตโนมัติ หรือเลือกชั้นปีด้านล่างได้)
          </div>
          <div class="bg-white/90 p-2.5 rounded-xl border border-blue-100">
            <b class="text-blue-900 font-prompt block mb-0.5">ขั้นตอนที่ 2: โหลดไฟล์หรือใช้ลิงก์</b>
            ในหน้า Google Sheets ของฟอร์ม กด <b>ไฟล์ &gt; ดาวน์โหลด &gt; .csv หรือ .xlsx</b> (หรือก๊อปปี้ตารางมาวาง)
          </div>
          <div class="bg-white/90 p-2.5 rounded-xl border border-blue-100">
            <b class="text-blue-900 font-prompt block mb-0.5">ขั้นตอนที่ 3: อัปโหลดเข้าเว็บทันที</b>
            ระบบจะสร้างกลุ่มเรียนใหม่ แปลงลิงก์รูป Google Drive และคัดกรองความเสี่ยงให้อัตโนมัติ 100%
          </div>
        </div>
      </div>

      <!-- ตั้งค่าชั้นปีและกลุ่มเรียนเริ่มต้น -->
      <div class="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200">
        <h4 class="font-prompt font-bold text-slate-900 text-xs sm:text-sm mb-2.5 flex items-center gap-1.5">
          <span>⚙️</span> ตั้งค่าการระบุชั้นปีและกลุ่มเรียนสำหรับข้อมูลที่จะนำเข้า
        </h4>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div>
            <label class="block font-semibold text-slate-700 mb-1 text-xs">โหมดระบุระดับชั้นปี *</label>
            <select id="bulkLevelMode" class="w-full rounded-xl border border-indigo-300 bg-white px-2.5 py-2 font-prompt font-bold text-indigo-950 text-xs sm:text-sm">
              <option value="AUTO" selected>✨ ตรวจจับอัตโนมัติ (จากคอลัมน์/รหัสนักศึกษา)</option>
              <option value="ปวช.1">บังคับเป็น ปวช.1 ทั้งหมด</option>
              <option value="ปวช.2">บังคับเป็น ปวช.2 ทั้งหมด</option>
              <option value="ปวช.3">บังคับเป็น ปวช.3 ทั้งหมด</option>
              <option value="ปวส.1">บังคับเป็น ปวส.1 ทั้งหมด</option>
              <option value="ปวส.2">บังคับเป็น ปวส.2 ทั้งหมด</option>
            </select>
          </div>
          <div>
            <label class="block font-semibold text-slate-700 mb-1 text-xs">กลุ่มเรียนเริ่มต้น (กรณีฟอร์มไม่ระบุ) *</label>
            <select id="bulkGroupNo" class="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 font-prompt font-bold text-slate-900 text-xs sm:text-sm">
              <option value="1">กลุ่ม1</option>
              <option value="2">กลุ่ม2</option>
              <option value="3">กลุ่ม3</option>
              <option value="4">กลุ่ม4</option>
              <option value="5">กลุ่ม5</option>
              <option value="6">กลุ่ม6</option>
            </select>
          </div>
          <div>
            <label class="block font-semibold text-slate-700 mb-1 text-xs">สาขาวิชาเริ่มต้น *</label>
            <select id="bulkMajor" class="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 font-semibold text-xs sm:text-sm">
              <option value="ช่างกลโรงงาน">ช่างกลโรงงาน</option>
              <option value="เทคนิคอุตสาหกรรม">เทคนิคอุตสาหกรรม</option>
            </select>
          </div>
        </div>
      </div>

      <!-- วิธีที่ 1: อัปโหลดไฟล์ CSV / Excel จาก Google Forms โดยตรง -->
      <div class="p-3.5 sm:p-4 rounded-2xl bg-emerald-50/60 border-2 border-emerald-300 space-y-2.5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span class="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-prompt font-bold text-[10px]">วิธีที่ 1 • แนะนำสำหรับ Google Form</span>
            <h4 class="font-prompt font-bold text-emerald-950 text-xs sm:text-sm mt-1">
              อัปโหลดไฟล์การตอบกลับจาก Google Form (.csv หรือ .xlsx)
            </h4>
            <p class="text-xs text-slate-600">รองรับทั้ง <b>"ไฟล์แบบสอบถามข้อมูลนักเรียนหลัก"</b> และ <b>"ไฟล์ฟอร์มส่งรูปถ่าย Google Drive"</b></p>
          </div>
          <button type="button" onclick="window.ExportManager.downloadImportTemplateCSV()"
                  class="px-3 py-1.5 rounded-xl bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-900 font-prompt font-semibold text-xs shrink-0 shadow-sm">
            ⬇️ โหลดไฟล์แม่แบบ (.csv)
          </button>
        </div>
        <input type="file" accept=".xlsx,.xls,.csv" onchange="handleBulkFileUpload(event)"
               class="w-full text-xs text-slate-700 bg-white p-2 rounded-xl border border-emerald-200 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-prompt file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer" />
      </div>

      <!-- วิธีที่ 2: ดึงข้อมูลออนไลน์จากลิงก์ Google Sheets (Publish to web CSV) -->
      <div class="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2.5">
        <div>
          <span class="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-prompt font-bold text-[10px]">วิธีที่ 2 • ดึงข้อมูลออนไลน์จาก Google Sheets</span>
          <h4 class="font-prompt font-bold text-slate-900 text-xs sm:text-sm mt-1">
            วางลิงก์ Google Sheets ของ Google Form (ไฟล์ &gt; แชร์ &gt; เผยแพร่ทางเว็บ &gt; เลือกแบบ CSV)
          </h4>
        </div>
        <div class="flex flex-col sm:flex-row gap-2">
          <input type="url" id="googleSheetCsvUrlInput" value="${escapeHtml(savedSheetCsvUrl)}"
                 placeholder="วางลิงก์ https://docs.google.com/spreadsheets/d/.../pub?output=csv"
                 class="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500" />
          <button type="button" onclick="handleGoogleSheetUrlImport()"
                  class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-prompt font-semibold text-xs flex items-center justify-center gap-1.5 shrink-0 shadow-sm">
            <i data-lucide="cloud-download" class="w-4 h-4"></i> ดึงข้อมูลจาก Google Form
          </button>
        </div>
      </div>

      <!-- วิธีที่ 3: ก๊อปปี้รายชื่อจาก Excel / Google Sheets มาวางทีละหลายคน -->
      <div class="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2.5">
        <div>
          <span class="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-prompt font-bold text-[10px]">วิธีที่ 3 • ก๊อปปี้และวาง (Copy & Paste)</span>
          <h4 class="font-prompt font-bold text-slate-900 text-xs sm:text-sm mt-1">
            ก๊อปปี้แถวรายชื่อจาก Excel หรือใบรายชื่อมาวางได้ทันที
          </h4>
          <p class="text-xs text-slate-500">
            ลำดับคอลัมน์: <b>รหัสนักศึกษา, ชื่อ-นามสกุล, ชื่อเล่น, เบอร์โทรนักเรียน, อำเภอ, ดื่มหรือสูบไหม</b>
          </p>
        </div>
        <textarea id="bulkPasteTextarea" rows="4"
                  placeholder="ตัวอย่าง:&#10;68201020001&#9;สมชาย ใจดี&#9;ชาย&#9;0812345678&#9;เมืองฉะเชิงเทรา&#9;ไม่สูบ&#10;67201020002&#9;วีรภัทร รักเรียน&#9;พีท&#9;0898765432&#9;บางคล้า&#9;บุหรี่"
                  class="w-full rounded-xl border border-slate-300 p-3 font-mono text-xs focus:ring-2 focus:ring-indigo-500 outline-none"></textarea>
        <div class="flex justify-end">
          <button type="button" onclick="handleBulkPasteSubmit()"
                  class="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-prompt font-semibold text-xs flex items-center gap-1.5 shadow-md transition">
            <i data-lucide="check-circle-2" class="w-4 h-4"></i> นำเข้ารายชื่อที่วางทั้งหมด
          </button>
        </div>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function getBulkImportOptionsFromModal() {
  const modeVal = document.getElementById('bulkLevelMode')?.value || 'AUTO';
  const grpNo = Number(document.getElementById('bulkGroupNo')?.value || 1);
  const major = document.getElementById('bulkMajor')?.value || 'ช่างกลโรงงาน';
  return {
    levelMode: modeVal === 'AUTO' ? 'AUTO' : 'FORCE',
    defaultLevelYear: modeVal === 'AUTO' ? 'ปวช.2' : modeVal,
    defaultGroupNo: grpNo,
    defaultMajor: major
  };
}

function handleBulkFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const opts = getBulkImportOptionsFromModal();

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

      if (!rows || rows.length === 0) {
        showToast('ไม่พบข้อมูลในไฟล์ที่เลือก', 'error');
        return;
      }

      const res = window.appDB.importFromGoogleFormRows(rows, opts);
      closeModal('bulkImportModal');
      showToast(`นำเข้าสำเร็จ! เพิ่มใหม่ ${res.addedCount} คน, อัปเดต ${res.updatedCount} คน, จับคู่รูปถ่าย ${res.photoMatchedCount} คน`);
      renderAll();
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการอ่านไฟล์: ' + err.message, 'error');
    }
  };
  reader.readAsArrayBuffer(file);
}

async function handleGoogleSheetUrlImport() {
  const urlInput = document.getElementById('googleSheetCsvUrlInput');
  let rawUrl = (urlInput?.value || '').trim();
  if (!rawUrl) {
    showToast('กรุณาวางลิงก์ Google Sheets CSV ก่อนกดดึงข้อมูล', 'error');
    return;
  }

  // แปลงลิงก์ Google Sheets ปกติ (/edit...) ให้เป็นลิงก์ดาวน์โหลด CSV อัตโนมัติถ้าผู้ใช้ก๊อปปี้ลิงก์แชร์มา
  const sheetIdMatch = rawUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (sheetIdMatch && !rawUrl.includes('output=csv') && !rawUrl.includes('export?format=csv')) {
    rawUrl = `https://docs.google.com/spreadsheets/d/${sheetIdMatch[1]}/export?format=csv`;
  }

  localStorage.setItem('STUDENT_GOOGLE_SHEET_CSV_URL', rawUrl);
  const opts = getBulkImportOptionsFromModal();

  try {
    showToast('กำลังดึงข้อมูลจาก Google Sheets...');
    const response = await fetch(rawUrl);
    if (!response.ok) throw new Error(`ไม่สามารถเข้าถึงลิงก์ได้ (HTTP ${response.status})`);
    const csvText = await response.text();
    const workbook = XLSX.read(csvText, { type: 'string' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

    const res = window.appDB.importFromGoogleFormRows(rows, opts);
    closeModal('bulkImportModal');
    showToast(`ซิงก์จาก Google Form สำเร็จ! เพิ่มใหม่ ${res.addedCount} คน, อัปเดต ${res.updatedCount} คน, รูปถ่าย ${res.photoMatchedCount} คน`);
    renderAll();
  } catch (err) {
    showToast('ดึงข้อมูลไม่สำเร็จ กรุณาตรวจสอบว่าเปิดเผยแพร่ทางเว็บ (CSV) หรือแชร์ลิงก์แล้ว: ' + err.message, 'error');
  }
}

function handleBulkPasteSubmit() {
  const rawText = (document.getElementById('bulkPasteTextarea')?.value || '').trim();
  if (!rawText) {
    showToast('กรุณาวางรายชื่อนักเรียนอย่างน้อย 1 บรรทัด', 'error');
    return;
  }
  const opts = getBulkImportOptionsFromModal();
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const parsedRows = [];

  lines.forEach(line => {
    const cols = line.includes('\t') ? line.split('\t') : line.split(',');
    const cleanCols = cols.map(c => c.trim());
    if (cleanCols.length >= 2) {
      // ข้ามบรรทัดหัวตารางถ้าเผลอก๊อปปี้ติดมา
      if (cleanCols[0].includes('รหัส') && cleanCols[1].includes('ชื่อ')) return;
      parsedRows.push({
        'รหัสประจำตัวนักเรียนนักศึกษา': cleanCols[0],
        'ชื่อ-นามสกุล': cleanCols[1],
        'ชื่อเล่น': cleanCols[2] || '',
        'เบอร์โทรศัพท์มือถือ ของนักเรียน': cleanCols[3] || '',
        'อำเภอ': cleanCols[4] || 'ไม่ระบุ',
        'ดิ่มหรือสูบไหม': cleanCols[5] || 'ไม่สูบ ไม่ดื่ม'
      });
    }
  });

  if (parsedRows.length === 0) {
    showToast('ไม่พบรูปแบบข้อมูลที่ถูกต้อง (ต้องมีอย่างน้อย รหัสนักศึกษา และ ชื่อ-นามสกุล)', 'error');
    return;
  }

  const res = window.appDB.importFromGoogleFormRows(parsedRows, opts);
  closeModal('bulkImportModal');
  showToast(`นำเข้าสำเร็จ! เพิ่มใหม่ ${res.addedCount} คน, อัปเดต ${res.updatedCount} คน`);
  window.AppState.currentTab = 'students';
  window.AppState.filterClassId = res.classId;
  renderAll();
}

// ============================================================================
// TAB 3: ระบบงานปกครอง & บันทึกการตัดคะแนน (ตารางที่ 3)
// ============================================================================
function renderDisciplineTab() {
  const container = document.getElementById('disciplineContent');
  if (!container) return;

  const records = window.appDB.db.Discipline_Records || [];
  const all360 = window.appDB.getAllStudents360();

  container.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
      <div class="lg:col-span-1">
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-4 sm:p-5 lg:sticky lg:top-20">
          <div class="flex items-center gap-2.5 pb-3 border-b border-slate-100 mb-4">
            <div class="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <i data-lucide="shield-alert" class="w-5 h-5"></i>
            </div>
            <div>
              <h3 class="font-prompt font-bold text-slate-900 text-sm sm:text-base">บันทึกพฤติกรรม / ตัดคะแนน</h3>
              <p class="text-xs text-slate-500">ตารางที่ 3: Discipline_Records</p>
            </div>
          </div>

          <form onsubmit="submitQuickDisciplineForm(event)" class="space-y-3.5 text-xs sm:text-sm">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">เลือกนักเรียนที่กระทำผิด *</label>
              <select id="discFormStudentId" required class="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">-- ค้นหา/เลือกนักเรียน (${all360.length} คน) --</option>
                ${all360.map(s => `<option value="${escapeHtml(s.Student_ID)}">${escapeHtml(s.Student_ID)} - ${escapeHtml(s.Full_Name)} (${escapeHtml(s.Class_ID)})</option>`).join('')}
              </select>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">หมวดความผิด *</label>
                <select id="discFormCategory" required onchange="autoSetDisciplinePoints(this.value)" class="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-xs sm:text-sm outline-none">
                  <option value="มาสาย">มาสาย (-5)</option>
                  <option value="การแต่งกาย">การแต่งกาย/ทรงผม (-5)</option>
                  <option value="หนีเรียน">ขาดเรียน/หนีเรียน (-10)</option>
                  <option value="บุหรี่/สารเสพติด">บุหรี่/บุหรี่ไฟฟ้า/สารเสพติด (-20)</option>
                  <option value="ทะเลาะวิวาท">ทะเลาะวิวาท (-30)</option>
                  <option value="อื่นๆ">อื่นๆ (-5)</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">คะแนนที่หัก *</label>
                <input type="number" id="discFormPoints" value="-5" max="0" min="-100" required
                       class="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-xs sm:text-sm font-bold text-red-600 outline-none" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">การดำเนินการ (Action_Taken) *</label>
              <select id="discFormAction" required class="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-xs sm:text-sm outline-none">
                <option value="ตักเตือนด้วยวาจา">ตักเตือนด้วยวาจา</option>
                <option value="บำเพ็ญประโยชน์">บำเพ็ญประโยชน์</option>
                <option value="ทำทัณฑ์บน">ทำทัณฑ์บน</option>
                <option value="เชิญผู้ปกครอง">เชิญผู้ปกครอง</option>
                <option value="พักการเรียน">เสนอพักการเรียน</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">รายละเอียดพฤติกรรม</label>
              <textarea id="discFormDesc" rows="2" placeholder="ระบุสถานที่ เวลา หรือรายละเอียดเหตุการณ์..."
                        class="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm outline-none"></textarea>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">ครูผู้รายงาน</label>
              <input type="text" id="discFormTeacher" value="ครูที่ปรึกษา / งานปกครอง" required
                     class="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm outline-none" />
            </div>

            <button type="submit" class="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-prompt font-semibold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition">
              <i data-lucide="save" class="w-4 h-4"></i> บันทึกการตัดคะแนน
            </button>
          </form>
        </div>
      </div>

      <div class="lg:col-span-2 space-y-5">
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-4 sm:p-5">
          <h3 class="font-prompt font-bold text-slate-900 text-sm sm:text-base mb-4">ประวัติการบันทึกพฤติกรรม/ตัดคะแนนล่าสุด (${records.length} รายการ)</h3>
          ${records.length === 0 ? `
            <div class="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <i data-lucide="check-circle" class="w-8 h-8 text-emerald-500 mx-auto mb-2"></i>
              <p class="font-prompt font-semibold text-slate-700 text-sm">ยังไม่มีประวัติการตัดคะแนนความประพฤติ</p>
              <p class="text-xs text-slate-500 mt-1">หากต้องการบันทึกพฤติกรรมการเรียน/อารมณ์โดยไม่หักคะแนน สามารถใช้เมนู "คัดกรอง/ติดตาม" ได้เลย</p>
            </div>
          ` : `
            <div class="space-y-3">
              ${records.map(r => {
                const stu = window.appDB.getStudent360(r.Student_ID);
                const dateStr = new Date(r.Date_Time).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
                return `
                  <div class="p-3.5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div class="flex items-start gap-3">
                      <div class="px-2.5 py-1.5 rounded-xl bg-rose-100 text-rose-700 font-prompt font-bold text-sm shrink-0">
                        ${r.Points_Deducted}
                      </div>
                      <div class="min-w-0 flex-1">
                        <div class="flex flex-wrap items-center gap-1.5">
                          <span onclick="openStudent360Modal('${escapeHtml(r.Student_ID)}')" class="font-prompt font-bold text-slate-900 text-sm cursor-pointer hover:text-blue-700">
                            ${stu ? escapeHtml(stu.Full_Name) : escapeHtml(r.Student_ID)}
                          </span>
                          ${stu ? renderClassAndGroupBadges(stu) : ''}
                          <span class="text-xs px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-semibold border border-rose-200">${escapeHtml(r.Violation_Category)}</span>
                        </div>
                        ${r.Description ? `<p class="text-xs text-slate-600 mt-1">${escapeHtml(r.Description)}</p>` : ''}
                        <div class="text-[11px] text-slate-500 mt-1">🕒 ${escapeHtml(dateStr)} | การดำเนินการ: ${escapeHtml(r.Action_Taken)} | คะแนนคงเหลือ: <b>${stu ? stu.BehaviorScore : '-'}</b></div>
                      </div>
                    </div>
                    <button onclick="removeDisciplineRecord('${escapeHtml(r.Record_ID)}')" class="text-xs text-red-600 hover:bg-red-50 px-2.5 py-1 rounded-lg self-end sm:self-center">ลบ</button>
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
  const map = { 'มาสาย': -5, 'การแต่งกาย': -5, 'หนีเรียน': -10, 'บุหรี่/สารเสพติด': -20, 'ทะเลาะวิวาท': -30, 'อื่นๆ': -5 };
  const input = document.getElementById('discFormPoints');
  if (input && map[category] !== undefined) input.value = map[category];
}

function submitQuickDisciplineForm(e) {
  e.preventDefault();
  const sid = document.getElementById('discFormStudentId').value;
  if (!sid) return;
  window.appDB.addDisciplineRecord({
    Student_ID: sid,
    Violation_Category: document.getElementById('discFormCategory').value,
    Points_Deducted: Number(document.getElementById('discFormPoints').value || -5),
    Action_Taken: document.getElementById('discFormAction').value,
    Description: document.getElementById('discFormDesc').value.trim(),
    Teacher_Reported: document.getElementById('discFormTeacher').value.trim()
  });
  showToast('บันทึกการตัดคะแนนเรียบร้อยแล้ว');
  renderAll();
}

function removeDisciplineRecord(recordId) {
  if (!confirm('ต้องการลบรายการตัดคะแนนนี้ใช่หรือไม่?')) return;
  window.appDB.deleteDisciplineRecord(recordId);
  showToast('ลบรายการบันทึกคะแนนเรียบร้อยแล้ว');
  renderAll();
}

// ============================================================================
// TAB 4: ระบบติดตามพฤติกรรม, คัดกรองแยกหมวดหมู่, เยี่ยมบ้าน & แผนที่รวมทั้งแผนก
// ============================================================================
function renderScreeningTab() {
  const headerContainer = document.getElementById('screeningHeaderContainer');
  const mapWrapper = document.getElementById('screeningMapWrapper');
  const listContainer = document.getElementById('screeningListContainer');
  if (!headerContainer || !listContainer || !mapWrapper) return;

  const all360 = window.appDB.getAllStudents360();
  const stats = window.appDB.getProblemAndSubstanceSummary();

  const zoneCounts = {};
  all360.forEach(s => {
    const z = s.Zone_District || 'ไม่ระบุ';
    zoneCounts[z] = (zoneCounts[z] || 0) + 1;
  });
  const sortedZones = Object.keys(zoneCounts).sort((a, b) => zoneCounts[b] - zoneCounts[a]);

  const categoryButtons = [
    { id: 'ALL', label: `ทั้งหมด (${all360.length})`, color: 'slate' },
    { id: 'CAT_LEARNING', label: `📘 พฤติกรรมการเรียน/ขาดเรียน`, color: 'indigo' },
    { id: 'CAT_EMOTIONAL', label: `💜 อารมณ์/สังคม/ติดเกม`, color: 'purple' },
    { id: 'CAT_SUBSTANCE', label: `🚬 บุหรี่/สุรา/กระท่อม (${stats.anySubstance})`, color: 'orange' },
    { id: 'CAT_ECONOMIC', label: `💰 รายได้ต่ำ/ขอทุนฯ`, color: 'blue' },
    { id: 'CAT_POSITIVE', label: `🌟 จุดแข็ง/จิตอาสา (${stats.positiveBehavior})`, color: 'emerald' }
  ];

  headerContainer.innerHTML = `
    <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-3.5 sm:p-5 mb-4 sm:mb-5 space-y-3.5">
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 class="font-prompt font-bold text-slate-900 text-sm sm:text-lg flex items-center gap-2 leading-snug">
            <i data-lucide="activity" class="w-5 h-5 text-indigo-600 shrink-0"></i>
            <span>ระบบติดตามพฤติกรรม คัดกรองแยกหมวดหมู่ & แผนที่เยี่ยมบ้าน</span>
          </h2>
          <p class="text-xs text-slate-500 mt-0.5">
            กดปุ่ม <b>"คัดกรอง/ติดตามพฤติกรรม"</b> ในการ์ดนักเรียนเพื่อติ๊กพฤติกรรมที่พบ และบันทึกประวัติการดูแลรายบุคคล
          </p>
        </div>

        <!-- View Mode Switcher: Cards / Follow-up Table / Department Map -->
        <div class="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-2xl self-start lg:self-center">
          <button onclick="setScreeningViewMode('cards')"
                  class="px-3 py-1.5 rounded-xl text-xs font-prompt font-semibold flex items-center gap-1.5 transition ${window.AppState.screeningViewMode === 'cards' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}">
            <i data-lucide="layout-grid" class="w-3.5 h-3.5"></i> การ์ดติดตาม
          </button>
          <button onclick="setScreeningViewMode('table')"
                  class="px-3 py-1.5 rounded-xl text-xs font-prompt font-semibold flex items-center gap-1.5 transition ${window.AppState.screeningViewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}">
            <i data-lucide="table" class="w-3.5 h-3.5"></i> ตารางติดตามเคส
          </button>
          <button onclick="setScreeningViewMode('map')"
                  class="px-3 py-1.5 rounded-xl text-xs font-prompt font-semibold flex items-center gap-1.5 transition ${window.AppState.screeningViewMode === 'map' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-800 hover:bg-emerald-50'}">
            <i data-lucide="map" class="w-3.5 h-3.5"></i> 🗺️ แผนที่รวมทั้งแผนก
          </button>
        </div>
      </div>

      <!-- แถวที่ 1: เลือกหมวดหมู่การคัดกรองหลัก 5 มิติ -->
      <div class="pt-3 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
        <span class="text-xs font-prompt font-bold text-slate-600 mr-1 shrink-0">หมวดหมู่:</span>
        ${categoryButtons.map(cb => {
          const active = window.AppState.screeningCategoryFilter === cb.id;
          return `
            <button onclick="window.AppState.screeningCategoryFilter='${cb.id}'; renderScreeningTab(); if(window.lucide) lucide.createIcons();"
                    class="px-3 py-1.5 rounded-xl text-xs font-prompt font-semibold whitespace-nowrap transition shrink-0 ${active ? 'bg-indigo-700 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">
              ${cb.label}
            </button>
          `;
        }).join('')}
      </div>

      <!-- แถวที่ 2: ตัวกรองสถานะการติดตามดูแล + ระดับความเสี่ยง + โซนอำเภอ -->
      <div class="pt-2.5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <select onchange="window.AppState.screeningFollowupFilter = this.value; renderScreeningTab(); if(window.lucide) lucide.createIcons();"
                class="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm bg-white font-medium text-slate-800 outline-none">
          <option value="ALL" ${window.AppState.screeningFollowupFilter === 'ALL' ? 'selected' : ''}>สถานะการติดตาม: ทุกสถานะ</option>
          ${window.FOLLOWUP_STATUS_LIST.map(st => `
            <option value="${escapeHtml(st.id)}" ${window.AppState.screeningFollowupFilter === st.id ? 'selected' : ''}>
              ${escapeHtml(st.label)} (${stats.followupCounts[st.id] || 0} คน)
            </option>
          `).join('')}
        </select>

        <select onchange="window.AppState.screeningRiskFilter = this.value; renderScreeningTab(); if(window.lucide) lucide.createIcons();"
                class="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm bg-white font-medium text-slate-800 outline-none">
          <option value="ALL" ${window.AppState.screeningRiskFilter === 'ALL' ? 'selected' : ''}>ระดับความเสี่ยง: ทั้งหมด</option>
          <option value="กลุ่มมีปัญหา" ${window.AppState.screeningRiskFilter === 'กลุ่มมีปัญหา' ? 'selected' : ''}>🔴 กลุ่มมีปัญหา (${stats.riskProblem} คน)</option>
          <option value="กลุ่มเสี่ยง" ${window.AppState.screeningRiskFilter === 'กลุ่มเสี่ยง' ? 'selected' : ''}>🟠 กลุ่มเสี่ยง (${stats.riskWarning} คน)</option>
          <option value="กลุ่มปกติ" ${window.AppState.screeningRiskFilter === 'กลุ่มปกติ' ? 'selected' : ''}>🟢 กลุ่มปกติ (${stats.riskNormal} คน)</option>
        </select>

        <select onchange="window.AppState.screeningZoneFilter = this.value; renderScreeningTab(); if(window.lucide) lucide.createIcons();"
                class="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm bg-white font-medium text-slate-800 outline-none">
          <option value="ALL" ${window.AppState.screeningZoneFilter === 'ALL' ? 'selected' : ''}>ทุกโซนพื้นที่เยี่ยมบ้าน (${all360.length} คน)</option>
          ${sortedZones.map(z => `<option value="${escapeHtml(z)}" ${window.AppState.screeningZoneFilter === z ? 'selected' : ''}>โซน อ.${escapeHtml(z)} (${zoneCounts[z]} คน)</option>`).join('')}
        </select>
      </div>

      <!-- แถวที่ 3: ปุ่มเลือกโซนอำเภอด่วน -->
      <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2 border-t border-slate-100 pb-0.5">
        <span class="text-xs font-prompt font-bold text-slate-500 mr-1 shrink-0">โซนบ้านพัก:</span>
        <button onclick="setScreeningZone('ALL')"
                class="px-2.5 py-1 rounded-xl text-xs font-prompt font-semibold whitespace-nowrap transition shrink-0 ${window.AppState.screeningZoneFilter === 'ALL' ? 'bg-blue-700 text-white shadow-sm' : 'bg-slate-100 text-slate-700'}">
          ทุกอำเภอ (${all360.length})
        </button>
        ${sortedZones.map(z => `
          <button onclick="setScreeningZone('${escapeHtml(z)}')"
                  class="px-2.5 py-1 rounded-xl text-xs font-prompt font-semibold whitespace-nowrap transition shrink-0 ${window.AppState.screeningZoneFilter === z ? 'bg-blue-700 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">
            อ.${escapeHtml(z)} (${zoneCounts[z]})
          </button>
        `).join('')}
      </div>
    </div>
  `;

  const learningIds = window.BEHAVIOR_CATALOG.learning.items.map(i => i.id);
  const emotionalIds = window.BEHAVIOR_CATALOG.emotional.items.map(i => i.id);
  const positiveIds = window.BEHAVIOR_CATALOG.positive.items.map(i => i.id);

  const filtered = all360.filter(s => {
    if (window.AppState.screeningZoneFilter !== 'ALL' && s.Zone_District !== window.AppState.screeningZoneFilter) return false;
    if (window.AppState.screeningRiskFilter !== 'ALL' && s.Screening.Overall_Risk_Level !== window.AppState.screeningRiskFilter) return false;
    if (window.AppState.screeningFollowupFilter !== 'ALL' && (s.Screening.Followup_Status || 'ปกติ') !== window.AppState.screeningFollowupFilter) return false;

    const cat = window.AppState.screeningCategoryFilter;
    const bTags = s.Screening.Behavior_Tags || [];
    const subTags = s.Substance_Tags || [];
    const rTags = s.Screening.Risk_Tags || [];

    if (cat === 'CAT_LEARNING') {
      if (!bTags.some(t => learningIds.includes(t)) && s.TotalPointsDeducted === 0) return false;
    } else if (cat === 'CAT_EMOTIONAL') {
      if (!bTags.some(t => emotionalIds.includes(t))) return false;
    } else if (cat === 'CAT_SUBSTANCE') {
      if (!subTags.some(t => ['บุหรี่', 'เหล้า/เบียร์', 'น้ำกระท่อม', 'กัญชา'].includes(t))) return false;
    } else if (cat === 'CAT_ECONOMIC') {
      if (!rTags.some(t => ['รายได้ต่ำ (<10,000 บ.)', 'ต้องการทุนการศึกษา', 'ค่าขนมน้อย (<100 บ.)', 'ครอบครัวหย่าร้าง/แยกกันอยู่'].includes(t))) return false;
    } else if (cat === 'CAT_POSITIVE') {
      if (!bTags.some(t => positiveIds.includes(t))) return false;
    }
    return true;
  });

  mapWrapper.classList.toggle('hidden', window.AppState.screeningViewMode !== 'map');
  if (window.AppState.screeningViewMode === 'map') {
    setTimeout(() => renderDepartmentLeafletMap(filtered), 80);
  }

  if (window.AppState.screeningViewMode === 'table') {
    listContainer.className = 'block';
    listContainer.innerHTML = `
      <div class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr class="bg-indigo-950 text-white font-prompt text-xs">
                <th class="py-3.5 px-3">นักเรียน</th>
                <th class="py-3.5 px-3">ระดับความเสี่ยง</th>
                <th class="py-3.5 px-3">สถานะติดตามเคส</th>
                <th class="py-3.5 px-3">พฤติกรรมที่พบ</th>
                <th class="py-3.5 px-3">สาเหตุความเสี่ยง & สารเสพติด</th>
                <th class="py-3.5 px-3">การเยี่ยมบ้าน / โซน</th>
                <th class="py-3.5 px-3 text-right">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              ${filtered.map(stu => {
                const sc = stu.Screening;
                const latestLog = (sc.Followup_History || [])[0];
                return `
                  <tr class="hover:bg-indigo-50/40 transition">
                    <td class="py-3 px-3">
                      <div class="font-prompt font-bold text-slate-900 cursor-pointer hover:text-blue-700" onclick="openStudent360Modal('${escapeHtml(stu.Student_ID)}')">
                        ${escapeHtml(stu.Full_Name)} ${stu.Nickname ? `(${escapeHtml(stu.Nickname)})` : ''}
                      </div>
                      <div class="flex flex-wrap items-center gap-1 mt-0.5">
                        <span class="font-mono text-[11px] text-blue-800">${escapeHtml(stu.Student_ID)}</span>
                        ${renderClassAndGroupBadges(stu)}
                      </div>
                    </td>
                    <td class="py-3 px-3 whitespace-nowrap">${getRiskBadge(sc.Overall_Risk_Level)}</td>
                    <td class="py-3 px-3">
                      ${getFollowupBadge(sc.Followup_Status)}
                      ${latestLog ? `<div class="text-[11px] text-slate-500 mt-1">ล่าสุด: ${escapeHtml(latestLog.Action_Type)} (${escapeHtml(latestLog.Note)})</div>` : ''}
                    </td>
                    <td class="py-3 px-3"><div class="flex flex-wrap gap-1">${renderBehaviorBadges(stu)}</div></td>
                    <td class="py-3 px-3"><div class="flex flex-wrap gap-1">${renderRiskReasonBadges(stu)}</div></td>
                    <td class="py-3 px-3 text-xs">
                      <div class="font-bold text-indigo-950">อ.${escapeHtml(stu.Zone_District)}</div>
                      <div class="${sc.Home_Visit_Status === 'เยี่ยมบ้านแล้ว' ? 'text-emerald-700 font-bold' : 'text-slate-500'}">${escapeHtml(sc.Home_Visit_Status)}</div>
                    </td>
                    <td class="py-3 px-3 text-right whitespace-nowrap">
                      <div class="inline-flex gap-1">
                        <button onclick="openBehaviorFollowupModal('${escapeHtml(stu.Student_ID)}')" class="px-2.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-prompt font-semibold">คัดกรอง/ติดตาม</button>
                        <button onclick="openScreeningModal('${escapeHtml(stu.Student_ID)}')" class="px-2.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-prompt font-semibold">เยี่ยมบ้าน</button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    return;
  }

  // Cards Mode
  listContainer.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4';
  listContainer.innerHTML = filtered.map(stu => {
    const sc = stu.Screening;
    const mapsQuery = encodeURIComponent(stu.Home_Location || `${stu.Address} ฉะเชิงเทรา`);
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
    const latestFollow = (sc.Followup_History || [])[0];

    return `
      <div class="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-3.5 sm:p-5 flex flex-col justify-between gap-3 overflow-hidden">
        <div class="space-y-2.5">
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              ${getAvatarHtml(stu, 'w-12 h-12', 'text-sm')}
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-1">
                  <span class="font-mono text-[11px] font-bold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded">${escapeHtml(stu.Student_ID)}</span>
                  ${renderClassAndGroupBadges(stu)}
                </div>
                <h4 onclick="openStudent360Modal('${escapeHtml(stu.Student_ID)}')" class="font-prompt font-bold text-slate-900 text-sm sm:text-base mt-1 leading-snug cursor-pointer hover:text-blue-700">
                  ${escapeHtml(stu.Full_Name)} ${stu.Nickname ? `(${escapeHtml(stu.Nickname)})` : ''}
                </h4>
              </div>
            </div>
            <div class="shrink-0">${getRiskBadge(sc.Overall_Risk_Level)}</div>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-1.5 pt-1">
            ${getFollowupBadge(sc.Followup_Status)}
            <span class="text-[11px] font-semibold ${sc.Home_Visit_Status === 'เยี่ยมบ้านแล้ว' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-slate-600 bg-slate-100 border-slate-200'} px-2 py-0.5 rounded-lg border">
              🏠 ${escapeHtml(sc.Home_Visit_Status || 'ยังไม่เยี่ยมบ้าน')}
            </span>
          </div>

          <!-- หมวดพฤติกรรมและการติดตาม -->
          <div class="cat-section bg-indigo-50/60 border border-indigo-200/80 space-y-1.5">
            <div class="text-[11px] font-prompt font-bold text-indigo-950">🧠 พฤติกรรมการเรียน & อารมณ์/สังคม:</div>
            <div class="flex flex-wrap gap-1">${renderBehaviorBadges(stu)}</div>
            ${latestFollow ? `
              <div class="mt-1.5 pt-1.5 border-t border-indigo-200/60 text-[11px] text-indigo-950">
                <b>บันทึกติดตามล่าสุด:</b> ${escapeHtml(latestFollow.Action_Type)} — "${escapeHtml(latestFollow.Note)}"
              </div>
            ` : ''}
          </div>

          <!-- หมวดสาเหตุความเสี่ยง & สารเสพติด -->
          <div class="cat-section bg-slate-50 border border-slate-200/80 space-y-1">
            <div class="text-[11px] font-prompt font-bold text-slate-700">📌 สาเหตุความเสี่ยงรวม:</div>
            <div class="flex flex-wrap gap-1">${renderRiskReasonBadges(stu)}</div>
          </div>

          ${renderSubstanceBox(stu, false)}

          <!-- ที่อยู่และพิกัด -->
          <div class="cat-section bg-blue-50/40 border border-blue-100 text-xs space-y-1">
            <div class="flex flex-wrap items-start justify-between gap-1">
              <span class="text-slate-500">ที่อยู่/โซนเยี่ยมบ้าน:</span>
              <span class="font-semibold text-blue-950">อ.${escapeHtml(stu.Zone_District)} (${escapeHtml(stu.Address)})</span>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-1.5 pt-2.5 border-t border-slate-100">
          <button onclick="openBehaviorFollowupModal('${escapeHtml(stu.Student_ID)}')"
                  class="py-2 px-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-prompt font-semibold flex items-center justify-center gap-1 shadow-sm transition">
            <i data-lucide="clipboard-check" class="w-3.5 h-3.5 shrink-0"></i> <span>พฤติกรรม</span>
          </button>
          <button onclick="openScreeningModal('${escapeHtml(stu.Student_ID)}')"
                  class="py-2 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-prompt font-semibold flex items-center justify-center gap-1 shadow-sm transition">
            <i data-lucide="camera" class="w-3.5 h-3.5 shrink-0"></i> <span>เยี่ยมบ้าน</span>
          </button>
          <a href="${mapsUrl}" target="_blank" rel="noopener"
             class="py-2 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-prompt font-semibold flex items-center justify-center gap-1 transition">
            <i data-lucide="navigation" class="w-3.5 h-3.5 text-blue-600 shrink-0"></i> <span>นำทาง</span>
          </a>
        </div>
      </div>
    `;
  }).join('');
}

function setScreeningViewMode(mode) {
  window.AppState.screeningViewMode = mode;
  renderScreeningTab();
  if (window.lucide) lucide.createIcons();
}

function setScreeningZone(zone) {
  window.AppState.screeningZoneFilter = zone;
  renderScreeningTab();
  if (window.lucide) lucide.createIcons();
}

/**
 * แผนที่ปักหมุดบ้านพักนักเรียนรวมทั้งแผนก (Interactive Leaflet Map)
 */
function renderDepartmentLeafletMap(studentList = null) {
  if (typeof L === 'undefined') return;
  const mapEl = document.getElementById('departmentMapContainer');
  if (!mapEl) return;

  const list = studentList || window.appDB.getAllStudents360();

  if (!window.AppState.leafletMap) {
    window.AppState.leafletMap = L.map('departmentMapContainer').setView([13.6904, 101.0779], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap'
    }).addTo(window.AppState.leafletMap);
    window.AppState.leafletMarkersLayer = L.layerGroup().addTo(window.AppState.leafletMap);
  }

  window.AppState.leafletMap.invalidateSize();
  window.AppState.leafletMarkersLayer.clearLayers();

  const bounds = [];

  list.forEach((stu, idx) => {
    const rawLoc = stu.Home_Location || '13.6904, 101.0779';
    const parts = rawLoc.split(',').map(n => parseFloat(n.trim()));
    if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return;

    // กระจายหมุดแบบ Golden-angle spiral เล็กน้อยสำหรับนักเรียนที่อยู่ในอำเภอเดียวกันเพื่อไม่ให้หมุดทับกันสนิท
    const angle = idx * 2.39996;
    const radius = 0.0018 * Math.sqrt((idx % 25) + 1);
    const lat = parts[0] + radius * Math.cos(angle);
    const lng = parts[1] + radius * Math.sin(angle);
    bounds.push([lat, lng]);

    const risk = stu.Screening.Overall_Risk_Level;
    const fillColor = risk === 'กลุ่มมีปัญหา'
      ? '#dc2626'
      : risk === 'กลุ่มเสี่ยง'
        ? '#f59e0b'
        : '#10b981';

    const marker = L.circleMarker([lat, lng], {
      radius: 9,
      fillColor,
      color: '#ffffff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.92
    });

    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stu.Home_Location || stu.Address)}`;
    marker.bindPopup(`
      <div style="font-family: 'Sarabun', sans-serif; min-width: 210px; line-height: 1.4;">
        <div style="font-weight: bold; font-size: 13px; color: #0f172a;">${escapeHtml(stu.Full_Name)} ${stu.Nickname ? `(${escapeHtml(stu.Nickname)})` : ''}</div>
        <div style="font-size: 11px; color: #475569; margin-bottom: 4px;">${escapeHtml(stu.Class_ID)} | โซน อ.${escapeHtml(stu.Zone_District)}</div>
        <div style="font-size: 11px; margin-bottom: 4px;"><b>ความเสี่ยง:</b> ${escapeHtml(risk)} (${escapeHtml(stu.Screening.Followup_Status || 'ปกติ')})</div>
        <div style="font-size: 11px; margin-bottom: 8px; color: #334155;"><b>สาเหตุ:</b> ${escapeHtml(stu.Screening.Risk_Factors_Note)}</div>
        <div style="display: flex; gap: 6px;">
          <button onclick="openStudent360Modal('${escapeHtml(stu.Student_ID)}')" style="background:#1e3a8a;color:#fff;border:none;padding:4px 8px;border-radius:6px;font-size:11px;cursor:pointer;">ดูโปรไฟล์ 360°</button>
          <a href="${mapsUrl}" target="_blank" style="background:#059669;color:#fff;text-decoration:none;padding:4px 8px;border-radius:6px;font-size:11px;">นำทาง Maps</a>
        </div>
      </div>
    `);

    window.AppState.leafletMarkersLayer.addLayer(marker);
  });

  if (bounds.length > 0) {
    window.AppState.leafletMap.fitBounds(bounds, { padding: [30, 30], maxZoom: 13 });
  }
}

// ============================================================================
// MODAL ใหม่: คัดกรองพฤติกรรมนักเรียนแยกหมวดหมู่ & บันทึกการติดตามเคส (Follow-up)
// ============================================================================
function openBehaviorFollowupModal(studentId) {
  const stu = window.appDB.getStudent360(studentId);
  if (!stu) return;
  const sc = stu.Screening;
  const currentTags = sc.Behavior_Tags || [];
  const followHistory = sc.Followup_History || [];

  const modal = document.getElementById('behaviorFollowupModal');
  const body = document.getElementById('behaviorFollowupModalBody');
  if (!modal || !body) return;

  const renderChecklistCategory = (catKey) => {
    const cat = window.BEHAVIOR_CATALOG[catKey];
    const borderCls = cat.color === 'indigo'
      ? 'border-indigo-200 bg-indigo-50/50'
      : cat.color === 'purple'
        ? 'border-purple-200 bg-purple-50/50'
        : 'border-emerald-200 bg-emerald-50/50';
    return `
      <div class="p-3.5 rounded-2xl border ${borderCls} space-y-2.5">
        <h4 class="font-prompt font-bold text-slate-900 text-xs sm:text-sm">${escapeHtml(cat.title)}</h4>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          ${cat.items.map(it => {
            const checked = currentTags.includes(it.id) ? 'checked' : '';
            return `
              <label class="flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 cursor-pointer transition shadow-sm">
                <input type="checkbox" name="behaviorTagCheckbox" value="${escapeHtml(it.id)}" ${checked}
                       class="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 shrink-0" />
                <span class="text-xs font-medium text-slate-800 leading-snug">${escapeHtml(it.label)}</span>
              </label>
            `;
          }).join('')}
        </div>
      </div>
    `;
  };

  body.innerHTML = `
    <form onsubmit="submitBehaviorFollowupForm(event, '${escapeHtml(studentId)}')" class="space-y-4 text-xs sm:text-sm">
      <!-- Header Student Summary -->
      <div class="p-3.5 rounded-2xl bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-3 min-w-0">
          ${getAvatarHtml(stu, 'w-12 h-12', 'text-sm')}
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="font-mono text-xs font-bold text-blue-300">${escapeHtml(stu.Student_ID)}</span>
              <span class="px-2 py-0.5 rounded bg-white/15 text-white text-xs font-prompt font-semibold">${escapeHtml(stu.Class_ID)}</span>
            </div>
            <h4 class="font-prompt font-bold text-sm sm:text-base mt-0.5">${escapeHtml(stu.Full_Name)} ${stu.Nickname ? `(${escapeHtml(stu.Nickname)})` : ''}</h4>
          </div>
        </div>
        <div>${getRiskBadge(sc.Overall_Risk_Level)}</div>
      </div>

      <!-- 3 หมวดหมู่พฤติกรรมสำหรับติ๊กคัดกรอง -->
      ${renderChecklistCategory('learning')}
      ${renderChecklistCategory('emotional')}
      ${renderChecklistCategory('positive')}

      <!-- ข้อมูลบุหรี่/สารเสพติด & สถานะการติดตามดูแล -->
      <div class="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="block font-prompt font-bold text-amber-950 mb-1 text-xs">🚬 ข้อมูลบุหรี่/สุรา/สารเสพติด (ตามจริง)</label>
          <input type="text" id="bfSubstanceRaw" value="${escapeHtml(stu.Substance_Raw || '')}"
                 placeholder="เช่น บุหรี่, เหล้า เบียร, น้ำกระท่อม, ไม่สูบ"
                 class="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 font-semibold text-slate-900" />
        </div>
        <div>
          <label class="block font-prompt font-bold text-amber-950 mb-1 text-xs">🩺 สถานะการติดตามดูแล (Follow-up Status) *</label>
          <select id="bfFollowupStatus" class="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 font-prompt font-bold text-slate-900">
            ${window.FOLLOWUP_STATUS_LIST.map(st => `
              <option value="${escapeHtml(st.id)}" ${(sc.Followup_Status || 'ปกติ') === st.id ? 'selected' : ''}>${escapeHtml(st.label)}</option>
            `).join('')}
          </select>
        </div>
      </div>

      <!-- บันทึกการพูดคุย / การติดตามเคสครั้งใหม่ -->
      <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
        <h4 class="font-prompt font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
          <i data-lucide="message-square-plus" class="w-4 h-4 text-blue-600"></i>
          บันทึกผลการติดตาม / การให้คำปรึกษา / การติดต่อผู้ปกครอง (เพิ่มลงไทม์ไลน์)
        </h4>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">รูปแบบการดูแลช่วยเหลือ</label>
            <select id="bfActionType" class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2">
              <option value="ครูที่ปรึกษาพูดคุย/ให้คำปรึกษา">ครูที่ปรึกษาพูดคุย/ให้คำปรึกษา</option>
              <option value="ตักเตือนและทำข้อตกลงพฤติกรรม">ตักเตือนและทำข้อตกลงพฤติกรรม</option>
              <option value="โทรศัพท์แจ้ง/ปรึกษาผู้ปกครอง">โทรศัพท์แจ้ง/ปรึกษาผู้ปกครอง</option>
              <option value="ลงพื้นที่เยี่ยมบ้านนักเรียน">ลงพื้นที่เยี่ยมบ้านนักเรียน</option>
              <option value="ส่งต่องานแนะแนว / งานปกครอง">ส่งต่องานแนะแนว / งานปกครอง</option>
              <option value="ชมเชย / ส่งเสริมความสามารถพิเศษ">ชมเชย / ส่งเสริมความสามารถพิเศษ</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">ผู้บันทึกการติดตาม</label>
            <input type="text" id="bfTeacherName" value="${escapeHtml(stu.ClassGroup.Advisor_Name || 'ครูที่ปรึกษา')}"
                   class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2" />
          </div>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">รายละเอียดผลการติดตาม (เว้นว่างได้หากต้องการอัปเดตเฉพาะป้ายพฤติกรรม)</label>
          <textarea id="bfFollowupNote" rows="2" placeholder="เช่น พูดคุยกับนักเรียนเรื่องการมาสายและโทรแจ้งคุณแม่เรียบร้อยแล้ว นักเรียนรับปากจะปรับปรุงตัว..."
                    class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2"></textarea>
        </div>

        ${followHistory.length > 0 ? `
          <div class="pt-2 border-t border-slate-200 space-y-1.5">
            <div class="text-xs font-prompt font-bold text-slate-700">ประวัติการติดตามเคสที่ผ่านมา (${followHistory.length} ครั้ง):</div>
            <div class="max-h-32 overflow-y-auto space-y-1.5">
              ${followHistory.map(fh => `
                <div class="p-2 rounded-xl bg-white border border-slate-200 text-xs">
                  <div class="flex items-center justify-between font-semibold text-indigo-900">
                    <span>${escapeHtml(fh.Action_Type)}</span>
                    <span class="text-[10px] text-slate-400">${escapeHtml(new Date(fh.Date_Time).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }))}</span>
                  </div>
                  <p class="text-slate-700 mt-0.5">${escapeHtml(fh.Note)}</p>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>

      <div class="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200">
        <button type="button" onclick="window.ExportManager.printOnePageStudentReport('${escapeHtml(studentId)}')"
                class="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-prompt font-semibold text-xs flex items-center gap-1.5">
          <i data-lucide="printer" class="w-4 h-4"></i> พิมพ์ใบรายงาน A4
        </button>
        <div class="flex items-center gap-2 ml-auto">
          <button type="button" onclick="closeModal('behaviorFollowupModal')" class="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-prompt font-medium text-xs">ยกเลิก</button>
          <button type="submit" class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-prompt font-semibold text-xs shadow-md flex items-center gap-1.5">
            <i data-lucide="save" class="w-4 h-4"></i> บันทึกผลคัดกรอง & ติดตาม
          </button>
        </div>
      </div>
    </form>
  `;

  modal.classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function submitBehaviorFollowupForm(e, studentId) {
  e.preventDefault();
  const checkedBoxes = Array.from(document.querySelectorAll('input[name="behaviorTagCheckbox"]:checked'));
  const selectedTags = checkedBoxes.map(cb => cb.value);

  window.appDB.saveBehaviorAndFollowup(studentId, {
    Behavior_Tags: selectedTags,
    Substance_Raw: document.getElementById('bfSubstanceRaw').value.trim(),
    Followup_Status: document.getElementById('bfFollowupStatus').value,
    Followup_Action_Type: document.getElementById('bfActionType').value,
    Followup_Note: document.getElementById('bfFollowupNote').value.trim(),
    Teacher_Name: document.getElementById('bfTeacherName').value.trim()
  });

  closeModal('behaviorFollowupModal');
  showToast('บันทึกผลการคัดกรองพฤติกรรมและการติดตามเคสเรียบร้อยแล้ว!');
  renderAll();
}

// ============================================================================
// TAB 5: ตั้งค่ากลุ่มเรียน, ซิงก์ข้อมูล GitHub / Cloud & รหัส PIN
// ============================================================================
function renderSettingsTab() {
  const container = document.getElementById('settingsContent');
  if (!container) return;

  const groups = window.appDB.getClassGroups();
  const logs = (window.appDB.db.Audit_Logs || []).slice(0, 25);
  const cloudUrl = window.appDB.getCloudUrl();

  container.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
      <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-4 sm:p-5">
        <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 mb-4">
          <div>
            <h3 class="font-prompt font-bold text-slate-900 text-sm sm:text-base">จัดการกลุ่มเรียนและครูที่ปรึกษา (Class_Groups)</h3>
            <p class="text-xs text-slate-500">เพิ่มกลุ่มเรียนชั้นปีอื่น (ปวช.2, ปวช.3, ปวส.2) หรือระบุชื่อครูที่ปรึกษาจริง</p>
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
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-1.5">
                    <span class="font-prompt text-xs font-bold px-2.5 py-0.5 rounded-lg bg-blue-100 text-blue-900">${escapeHtml(g.Level_Year)}</span>
                    <span class="font-prompt text-xs font-bold px-2.5 py-0.5 rounded-lg bg-slate-800 text-white">${escapeHtml(g.Group_Label)}</span>
                    <span class="font-prompt font-bold text-sm text-slate-900">สาขา${escapeHtml(g.Major)}</span>
                    <span class="text-xs text-slate-500">(${count} คน)</span>
                  </div>
                  <div class="text-xs text-slate-600 mt-1.5">👨‍🏫 ครูที่ปรึกษา: <b class="text-slate-900">${escapeHtml(g.Advisor_Name)}</b></div>
                </div>
                <button onclick="openClassGroupModal('${escapeHtml(g.Class_ID)}')" class="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-prompt font-semibold self-end sm:self-center shrink-0">
                  แก้ไขชื่อครู
                </button>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div class="space-y-5">
        <!-- บันทึกสำหรับทำงานต่อบน Notebook เครื่องอื่นผ่าน GitHub -->
        <div class="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl shadow-md p-4 sm:p-5">
          <h3 class="font-prompt font-bold text-sm sm:text-base mb-1 flex items-center gap-2">
            <i data-lucide="github" class="w-5 h-5 text-blue-400 shrink-0"></i>
            <span>บันทึกข้อมูลเพื่ออัปเดตขึ้น GitHub / ทำต่อเครื่องอื่น</span>
          </h3>
          <p class="text-xs text-blue-200 mb-4 leading-relaxed">
            เมื่อคุณแก้ไขข้อมูล คัดกรองพฤติกรรม หรือนำเข้านักเรียนชั้นปีอื่นเสร็จแล้ว กดปุ่มด้านล่างเพื่อดาวน์โหลดไฟล์ <code>initial_db.js</code> นำไปวางทับในโฟลเดอร์ <code>data/initial_db.js</code> แล้ว Push ขึ้น GitHub ได้เลย
          </p>
          <button onclick="window.ExportManager.exportMinifiedInitialDbJs()"
                  class="w-full py-3 px-4 rounded-2xl bg-blue-500 hover:bg-blue-400 text-white font-prompt font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition">
            <i data-lucide="save" class="w-4 h-4 shrink-0"></i> <span>ดาวน์โหลดไฟล์ initial_db.js (สำหรับอัปเดต GitHub)</span>
          </button>
        </div>

        <!-- ส่งออกรายงาน Excel / CSV / JSON -->
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-4 sm:p-5">
          <h3 class="font-prompt font-bold text-slate-900 text-sm sm:text-base mb-1">ส่งออกรายงาน Excel (4 ตาราง) / CSV (360°) / JSON</h3>
          <p class="text-xs text-slate-500 mb-3.5">รวมข้อมูลประวัตินักเรียน ผลคัดกรองพฤติกรรม สารเสพติด และการติดตามเคสครบถ้วน</p>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button onclick="window.ExportManager.exportExcel4Sheets()" class="p-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-prompt font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm">
              <i data-lucide="file-spreadsheet" class="w-4 h-4 shrink-0"></i> <span>Excel (4 ตาราง)</span>
            </button>
            <button onclick="window.ExportManager.exportStudentsCSV()" class="p-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-prompt font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm">
              <i data-lucide="file-text" class="w-4 h-4 shrink-0"></i> <span>CSV (360°)</span>
            </button>
            <button onclick="window.ExportManager.exportFullJSON()" class="p-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-prompt font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm">
              <i data-lucide="download" class="w-4 h-4 shrink-0"></i> <span>สำรอง JSON</span>
            </button>
          </div>

          <div class="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            <label class="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-prompt font-semibold cursor-pointer text-center flex items-center justify-center gap-1.5">
              <i data-lucide="upload" class="w-4 h-4"></i> นำเข้าไฟล์ฐานข้อมูล (.json)
              <input type="file" accept=".json" onchange="handleImportJSONFile(event)" class="hidden" />
            </label>
            <button onclick="confirmResetDatabase()" class="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-prompt font-medium">
              รีเซ็ตกลับเป็นค่าเริ่มต้น
            </button>
          </div>
        </div>

        <!-- ตั้งค่า Cloud Sync & รหัส PIN -->
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-4 sm:p-5 space-y-3">
          <h3 class="font-prompt font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
            <i data-lucide="shield" class="w-4 h-4 text-indigo-600"></i>
            ตั้งค่ารหัสผ่าน PIN สำหรับครู & ซิงก์ Google Sheets อัตโนมัติ
          </h3>
          <div class="flex flex-col sm:flex-row gap-2">
            <input type="password" id="settingPinInput" placeholder="ตั้งรหัส PIN ใหม่ (ค่าเริ่มต้น: 2569)"
                   class="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs" />
            <button onclick="saveNewPinCode()" class="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-prompt font-semibold shrink-0">
              บันทึกรหัส PIN
            </button>
            <button onclick="openPinLockModal()" class="px-3.5 py-2 rounded-xl bg-amber-100 text-amber-900 text-xs font-prompt font-semibold shrink-0">
              🔒 ล็อกหน้าจอทันที
            </button>
          </div>

          <div class="pt-2 border-t border-slate-100 space-y-2">
            <label class="block text-xs font-semibold text-slate-700">Google Apps Script Web App URL (สำหรับซิงก์ข้อมูลออนไลน์):</label>
            <div class="flex flex-col sm:flex-row gap-2">
              <input type="url" id="cloudScriptUrlInput" value="${escapeHtml(cloudUrl)}" placeholder="https://script.google.com/macros/s/.../exec"
                     class="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs" />
              <button onclick="saveAndSyncCloud()" class="px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-prompt font-semibold shrink-0">
                บันทึก & ซิงก์ขึ้น Cloud
              </button>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-4 sm:p-5">
          <h3 class="font-prompt font-bold text-slate-900 text-sm sm:text-base mb-2">ประวัติการแก้ไขข้อมูลล่าสุด (Audit Log)</h3>
          <div class="max-h-48 overflow-y-auto space-y-2 text-xs">
            ${logs.map(l => `
              <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div class="flex flex-wrap items-center justify-between gap-1 font-semibold text-slate-800">
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

function saveNewPinCode() {
  const val = (document.getElementById('settingPinInput')?.value || '').trim();
  if (!val || val.length < 4) {
    showToast('กรุณาตั้งรหัส PIN อย่างน้อย 4 หลัก', 'error');
    return;
  }
  window.appDB.setPinCode(val);
  showToast('บันทึกรหัสผ่าน PIN ใหม่เรียบร้อยแล้ว');
}

async function saveAndSyncCloud() {
  const url = (document.getElementById('cloudScriptUrlInput')?.value || '').trim();
  window.appDB.setCloudUrl(url);
  if (!url) {
    showToast('บันทึกค่าว่างสำหรับ Cloud URL แล้ว');
    return;
  }
  try {
    showToast('กำลังซิงก์ข้อมูลขึ้น Cloud...');
    await window.appDB.syncToCloud();
    showToast('ซิงก์ข้อมูลทั้ง 4 ตารางขึ้น Cloud สำเร็จ!');
  } catch (err) {
    showToast('ซิงก์ไม่สำเร็จ: ' + err.message, 'error');
  }
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

// ============================================================================
// MODALS: โปรไฟล์ 360° (พร้อมปุ่มพิมพ์รายงาน A4), แก้ไขรายคน, เยี่ยมบ้าน, กลุ่มเรียน, PIN
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
  const followHistory = sc.Followup_History || [];

  body.innerHTML = `
    <div class="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-4 sm:p-6">
      <div class="flex items-start justify-between gap-3">
        <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3.5 min-w-0 flex-1">
          ${getAvatarHtml(stu, 'w-16 h-16 sm:w-20 sm:h-20', 'text-xl sm:text-2xl')}
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="font-mono text-xs font-bold bg-blue-500/30 border border-blue-400/40 px-2.5 py-0.5 rounded-lg text-blue-100">
                รหัส: ${escapeHtml(stu.Student_ID)}
              </span>
              <span class="text-xs font-prompt font-bold bg-white text-slate-900 px-2.5 py-0.5 rounded-lg">
                ${escapeHtml(stu.ClassGroup.Level_Year)} ${escapeHtml(stu.ClassGroup.Group_Label)}
              </span>
              ${getStatusBadge(stu.Status)}
            </div>
            <h2 class="font-prompt font-bold text-lg sm:text-2xl mt-1.5 leading-snug">
              ${escapeHtml(stu.Full_Name)} ${stu.Nickname ? `<span class="text-sm sm:text-base font-normal text-blue-200">(${escapeHtml(stu.Nickname)})</span>` : ''}
            </h2>
            <p class="text-xs text-blue-200 mt-0.5 leading-snug">
              สาขาวิชา${escapeHtml(stu.ClassGroup.Major)} | ครูที่ปรึกษา: ${escapeHtml(stu.ClassGroup.Advisor_Name)}
            </p>
          </div>
        </div>
        <button onclick="closeModal('student360Modal')" class="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white shrink-0">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4 pt-4 border-t border-white/10">
        <button onclick="closeModal('student360Modal'); openBehaviorFollowupModal('${escapeHtml(stu.Student_ID)}')"
                class="py-2 px-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-prompt font-semibold flex items-center justify-center gap-1.5 shadow">
          <i data-lucide="clipboard-check" class="w-4 h-4 shrink-0"></i> <span>พฤติกรรม/ติดตาม</span>
        </button>
        <button onclick="closeModal('student360Modal'); openEditStudentModal('${escapeHtml(stu.Student_ID)}')"
                class="py-2 px-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-prompt font-semibold flex items-center justify-center gap-1.5 shadow">
          <i data-lucide="edit-3" class="w-4 h-4 shrink-0"></i> <span>แก้ไขประวัติ</span>
        </button>
        <button onclick="closeModal('student360Modal'); openScreeningModal('${escapeHtml(stu.Student_ID)}')"
                class="py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-prompt font-semibold flex items-center justify-center gap-1.5 shadow">
          <i data-lucide="home" class="w-4 h-4 shrink-0"></i> <span>เยี่ยมบ้าน</span>
        </button>
        <button onclick="window.ExportManager.printOnePageStudentReport('${escapeHtml(stu.Student_ID)}')"
                class="py-2 px-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-prompt font-bold flex items-center justify-center gap-1.5 shadow">
          <i data-lucide="printer" class="w-4 h-4 shrink-0"></i> <span>พิมพ์รายงาน A4</span>
        </button>
        <a href="${mapsUrl}" target="_blank" rel="noopener"
           class="col-span-2 sm:col-span-1 py-2 px-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-prompt font-semibold flex items-center justify-center gap-1.5">
          <i data-lucide="map-pin" class="w-4 h-4 shrink-0"></i> <span>นำทาง Maps</span>
        </a>
      </div>
    </div>

    <div class="p-4 sm:p-6 space-y-4 bg-slate-50">
      <!-- กล่องสรุปการคัดกรอง 5 มิติ & พฤติกรรม -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
          <h3 class="font-prompt font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
            <i data-lucide="activity" class="w-4 h-4 text-rose-600 shrink-0"></i>
            <span>ผลการคัดกรองความเสี่ยง พฤติกรรม และการติดตามดูแล</span>
          </h3>
          <div class="flex flex-wrap items-center gap-1.5">
            ${getFollowupBadge(sc.Followup_Status)}
            ${getRiskBadge(sc.Overall_Risk_Level)}
          </div>
        </div>
        ${renderSubstanceBox(stu, false)}
        <div>
          <span class="block text-xs font-prompt font-bold text-indigo-950 mb-1">🧠 พฤติกรรมการเรียน อารมณ์ สังคม & จุดแข็ง:</span>
          <div class="flex flex-wrap gap-1.5">${renderBehaviorBadges(stu)}</div>
        </div>
        <div>
          <span class="block text-xs font-prompt font-bold text-slate-700 mb-1">📌 สาเหตุความเสี่ยงรวมทั้งหมด:</span>
          <div class="flex flex-wrap gap-1.5">${renderRiskReasonBadges(stu)}</div>
        </div>
      </div>

      <!-- ประวัติการติดตามเคส (Follow-up History) -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
        <div class="flex items-center justify-between">
          <h3 class="font-prompt font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
            <i data-lucide="message-square" class="w-4 h-4 text-indigo-600"></i>
            <span>ประวัติการติดตามดูแลและให้คำปรึกษา (${followHistory.length} ครั้ง)</span>
          </h3>
          <button onclick="closeModal('student360Modal'); openBehaviorFollowupModal('${escapeHtml(stu.Student_ID)}')"
                  class="text-xs font-prompt font-semibold text-indigo-600 hover:underline">+ เพิ่มบันทึกติดตาม</button>
        </div>
        ${followHistory.length === 0 ? `
          <p class="text-xs text-slate-500">ยังไม่มีบันทึกการติดตามรายบุคคล กดปุ่ม "+ เพิ่มบันทึกติดตาม" เพื่อบันทึกการพูดคุยหรือการแจ้งผู้ปกครอง</p>
        ` : `
          <div class="space-y-2">
            ${followHistory.map(fh => `
              <div class="p-2.5 rounded-xl bg-indigo-50/50 border border-indigo-100 text-xs">
                <div class="flex flex-wrap items-center justify-between gap-1 font-bold text-indigo-950">
                  <span>${escapeHtml(fh.Action_Type)}</span>
                  <span class="text-[11px] font-normal text-slate-500">${escapeHtml(new Date(fh.Date_Time).toLocaleString('th-TH'))} โดย ${escapeHtml(fh.Teacher_Name)}</span>
                </div>
                <p class="text-slate-700 mt-1">${escapeHtml(fh.Note)}</p>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <!-- ข้อมูลประวัตินักเรียนและการติดต่อ -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <h3 class="font-prompt font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2 pb-2.5 border-b border-slate-100">
          <i data-lucide="user" class="w-4 h-4 text-blue-600"></i>
          <span>ข้อมูลประวัตินักเรียน ครอบครัว และการติดต่อ</span>
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3 text-xs sm:text-sm">
          <div><span class="text-slate-500">ระดับชั้น / กลุ่มเรียน:</span> <span class="font-bold text-slate-900 ml-1">${escapeHtml(stu.ClassGroup.Level_Year)} ${escapeHtml(stu.ClassGroup.Group_Label)}</span></div>
          <div><span class="text-slate-500">เบอร์โทรนักเรียน:</span> ${stu.Phone_Number ? `<a href="tel:${escapeHtml(stu.Phone_Number)}" class="font-bold text-blue-700 underline ml-1">${escapeHtml(stu.Phone_Number)}</a>` : '<span class="text-red-500 ml-1">ยังไม่ระบุ</span>'}</div>
          <div><span class="text-slate-500">ชื่อผู้ปกครอง:</span> <span class="font-medium text-slate-800 ml-1">${escapeHtml(stu.Parent_Name || '-')}</span></div>
          <div><span class="text-slate-500">เบอร์ผู้ปกครอง:</span> ${stu.Parent_Phone ? `<a href="tel:${escapeHtml(stu.Parent_Phone)}" class="font-bold text-emerald-700 underline ml-1">${escapeHtml(stu.Parent_Phone)}</a>` : '<span class="text-red-500 ml-1">ยังไม่ระบุ</span>'}</div>
          <div><span class="text-slate-500">รายได้ครอบครัว:</span> <span class="font-semibold text-slate-800 ml-1">${escapeHtml(sc.Family_Income_Range || '-')}</span></div>
          <div><span class="text-slate-500">เงินมาเรียน / ขอทุนฯ:</span> <span class="font-semibold text-slate-800 ml-1">${escapeHtml(sc.Daily_Allowance || '-')} | ทุนฯ: ${escapeHtml(sc.Scholarship_Need || '-')}</span></div>
          <div class="sm:col-span-2"><span class="text-slate-500">ที่อยู่ปัจจุบัน:</span> <span class="font-medium text-slate-800 ml-1">${escapeHtml(stu.Address)} (โซน อ.${escapeHtml(stu.Zone_District)})</span></div>
        </div>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function openEditStudentModal(studentId = null) {
  const isEdit = Boolean(studentId);
  const stu = isEdit ? window.appDB.getStudentById(studentId) : {
    Student_ID: '',
    Full_Name: '',
    Nickname: '',
    Level_Year: 'ปวช.1',
    Group_No: 1,
    Status: 'ปกติ',
    Phone_Number: '',
    Parent_Name: '',
    Parent_Phone: '',
    Emergency_Phone: '',
    Emergency_Contact_Note: '',
    Substance_Raw: 'ไม่สูบ ไม่ดื่ม',
    House_No: '',
    Subdistrict: '',
    Zone_District: 'เมืองฉะเชิงเทรา',
    Zipcode: '24000',
    Home_Location: '',
    Photo_URL: ''
  };

  const modal = document.getElementById('editStudentModal');
  const body = document.getElementById('editStudentModalBody');
  if (!modal || !body) return;

  const allLevels = ['ปวช.1', 'ปวช.2', 'ปวช.3', 'ปวส.1', 'ปวส.2'];
  const allGroups = [1, 2, 3, 4, 5, 6];

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

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-2xl bg-blue-50/60 border border-blue-200">
        <div>
          <label class="block font-semibold text-blue-950 mb-1">ระดับชั้นปี (ปวช.1–3 / ปวส.1–2) *</label>
          <select id="editStuLevelYear" required class="w-full rounded-xl border border-blue-300 bg-white px-3 py-2 font-prompt font-bold text-blue-950">
            ${allLevels.map(ly => `<option value="${ly}" ${(stu.Level_Year || 'ปวช.1') === ly ? 'selected' : ''}>${ly}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block font-semibold text-blue-950 mb-1">กลุ่มเรียน *</label>
          <select id="editStuGroupNo" required class="w-full rounded-xl border border-blue-300 bg-white px-3 py-2 font-prompt font-bold text-slate-900">
            ${allGroups.map(gn => `<option value="${gn}" ${Number(stu.Group_No || 1) === gn ? 'selected' : ''}>กลุ่ม${gn}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block font-semibold text-blue-950 mb-1">สถานภาพ *</label>
          <select id="editStuStatus" class="w-full rounded-xl border border-blue-300 bg-white px-3 py-2 font-semibold">
            <option value="ปกติ" ${stu.Status === 'ปกติ' ? 'selected' : ''}>ปกติ</option>
            <option value="พักการเรียน" ${stu.Status === 'พักการเรียน' ? 'selected' : ''}>พักการเรียน</option>
            <option value="พ้นสภาพ" ${stu.Status === 'พ้นสภาพ' ? 'selected' : ''}>พ้นสภาพ</option>
          </select>
        </div>
      </div>

      <div class="p-3.5 rounded-2xl bg-orange-50/70 border border-orange-200">
        <label class="block font-prompt font-bold text-orange-950 mb-1">
          🚬 ข้อมูลการดื่มหรือสูบ / สารเสพติด (ตามที่นักเรียนแจ้งในแบบบันทึก)
        </label>
        <input type="text" id="editStuSubstanceRaw" value="${escapeHtml(stu.Substance_Raw || '')}"
               placeholder="เช่น บุหรี่, เหล้า เบียร, น้ำกระท่อม, กัญชา หรือ ไม่สูบ ไม่ดื่ม"
               class="w-full rounded-xl border border-orange-300 bg-white px-3 py-2 font-semibold text-slate-900" />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">เบอร์โทรนักเรียน (10 หลัก)</label>
          <input type="tel" id="editStuPhone" value="${escapeHtml(stu.Phone_Number)}" class="w-full rounded-xl border border-slate-300 px-3 py-2" />
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">ชื่อ-นามสกุล ผู้ปกครอง</label>
          <input type="text" id="editStuParentName" value="${escapeHtml(stu.Parent_Name)}" class="w-full rounded-xl border border-slate-300 px-3 py-2" />
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">เบอร์โทรผู้ปกครอง (10 หลัก)</label>
          <input type="tel" id="editStuParentPhone" value="${escapeHtml(stu.Parent_Phone)}" class="w-full rounded-xl border border-slate-300 px-3 py-2" />
        </div>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">บ้านเลขที่</label>
          <input type="text" id="editStuHouse" value="${escapeHtml(stu.House_No)}" class="w-full rounded-xl border border-slate-300 px-3 py-2" />
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">ตำบล</label>
          <input type="text" id="editStuSubdist" value="${escapeHtml(stu.Subdistrict)}" class="w-full rounded-xl border border-slate-300 px-3 py-2" />
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">โซนอำเภอ</label>
          <input type="text" id="editStuDistrict" value="${escapeHtml(stu.Zone_District)}" class="w-full rounded-xl border border-slate-300 px-3 py-2 font-semibold text-blue-900" />
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">รหัสไปรษณีย์</label>
          <input type="text" id="editStuZip" value="${escapeHtml(stu.Zipcode)}" class="w-full rounded-xl border border-slate-300 px-3 py-2" />
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">ลิงก์รูปภาพนักเรียน (วางลิงก์ Google Drive ได้เลย)</label>
          <input type="text" id="editStuPhotoUrl" value="${escapeHtml(stu.Photo_URL)}" placeholder="https://drive.google.com/open?id=..." class="w-full rounded-xl border border-slate-300 px-3 py-2" />
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">หรืออัปโหลดรูปจากมือถือ</label>
          <input type="file" accept="image/*" onchange="handlePhotoUploadToInput(event, 'editStuPhotoUrl')"
                 class="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700" />
        </div>
      </div>

      <div class="flex items-center justify-between pt-4 border-t border-slate-200">
        ${isEdit ? `
          <button type="button" onclick="confirmDeleteStudent('${escapeHtml(stu.Student_ID)}')"
                  class="px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold">ลบรายชื่อนี้</button>
        ` : '<div></div>'}
        <div class="flex items-center gap-2">
          <button type="button" onclick="closeModal('editStudentModal')" class="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-prompt font-medium text-xs">ยกเลิก</button>
          <button type="submit" class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-prompt font-semibold text-xs shadow-md">บันทึกข้อมูล</button>
        </div>
      </div>
    </form>
  `;

  modal.classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function submitEditStudentForm(e, oldStudentId) {
  e.preventDefault();
  const lvlYear = document.getElementById('editStuLevelYear').value;
  const grpNo = Number(document.getElementById('editStuGroupNo').value);
  const payload = {
    Student_ID: document.getElementById('editStuId').value.trim(),
    Full_Name: document.getElementById('editStuName').value.trim(),
    Nickname: document.getElementById('editStuNick').value.trim(),
    Level_Year: lvlYear,
    Group_No: grpNo,
    Class_ID: `${lvlYear} กลุ่ม${grpNo}`,
    Group_Label: `กลุ่ม${grpNo}`,
    Status: document.getElementById('editStuStatus').value,
    Substance_Raw: document.getElementById('editStuSubstanceRaw').value.trim(),
    Phone_Number: document.getElementById('editStuPhone').value.replace(/\D/g, ''),
    Parent_Name: document.getElementById('editStuParentName').value.trim(),
    Parent_Phone: document.getElementById('editStuParentPhone').value.replace(/\D/g, ''),
    House_No: document.getElementById('editStuHouse').value.trim(),
    Subdistrict: document.getElementById('editStuSubdist').value.trim(),
    Zone_District: document.getElementById('editStuDistrict').value.trim() || 'ไม่ระบุ',
    Zipcode: document.getElementById('editStuZip').value.trim(),
    Photo_URL: document.getElementById('editStuPhotoUrl').value.trim()
  };

  window.appDB.upsertStudent(payload, oldStudentId || null);
  closeModal('editStudentModal');
  showToast(`บันทึกข้อมูลของ ${payload.Full_Name} (${payload.Class_ID}) เรียบร้อยแล้ว`);
  renderAll();
}

function confirmDeleteStudent(studentId) {
  if (!confirm(`ยืนยันการลบข้อมูลนักเรียนรหัส ${studentId} หรือไม่?`)) return;
  window.appDB.deleteStudent(studentId);
  closeModal('editStudentModal');
  showToast('ลบข้อมูลนักเรียนเรียบร้อยแล้ว');
  renderAll();
}

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
        <span class="text-xs font-semibold text-blue-800">อ.${escapeHtml(stu.Zone_District)}</span>
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
          <input type="text" id="scrSubstanceRaw" value="${escapeHtml(stu.Substance_Raw || '')}" class="w-full rounded-xl border border-slate-300 px-3 py-2 font-semibold" />
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
          <input type="date" id="scrVisitDate" value="${escapeHtml(sc.Home_Visit_Date || new Date().toISOString().slice(0, 10))}" class="w-full rounded-xl border border-slate-300 px-3 py-2" />
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">พิกัด GPS บ้านพักขณะเยี่ยมบ้าน</label>
          <div class="flex gap-1.5">
            <input type="text" id="scrHomeGps" value="${escapeHtml(stu.Home_Location || '')}" class="flex-1 rounded-xl border border-slate-300 px-3 py-2 font-mono text-xs" />
            <button type="button" onclick="captureCurrentGPS('scrHomeGps')" class="px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 font-semibold text-xs shrink-0">จับพิกัด</button>
          </div>
        </div>
      </div>

      <div>
        <label class="block font-semibold text-slate-700 mb-1">อัปโหลดรูปถ่ายจากการเยี่ยมบ้าน</label>
        <input type="file" accept="image/*" capture="environment" onchange="handlePhotoUploadToInput(event, 'scrVisitPhotoData')"
               class="w-full text-xs text-slate-600 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700" />
        <input type="hidden" id="scrVisitPhotoData" value="${escapeHtml(sc.Home_Visit_Photo || '')}" />
      </div>

      <div>
        <label class="block font-semibold text-slate-700 mb-1">สรุปผลการเยี่ยมบ้าน</label>
        <textarea id="scrVisitSummary" rows="2" class="w-full rounded-xl border border-slate-300 px-3 py-2">${escapeHtml(sc.Home_Visit_Summary || '')}</textarea>
      </div>

      <div class="flex justify-end gap-2 pt-3 border-t border-slate-200">
        <button type="button" onclick="closeModal('screeningModal')" class="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-prompt font-medium text-xs">ยกเลิก</button>
        <button type="submit" class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-prompt font-semibold text-xs shadow-md">บันทึกผลเยี่ยมบ้าน</button>
      </div>
    </form>
  `;

  modal.classList.remove('hidden');
}

function submitScreeningForm(e, studentId) {
  e.preventDefault();
  const gps = document.getElementById('scrHomeGps').value.trim();
  const stu = window.appDB.getStudentById(studentId);
  if (stu && gps) stu.Home_Location = gps;

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
  showToast('บันทึกข้อมูลการเยี่ยมบ้านและพิกัด GPS สำเร็จ!');
  renderAll();
}

function openDisciplineModal(studentId) {
  switchMainTab('discipline');
  setTimeout(() => {
    const sel = document.getElementById('discFormStudentId');
    if (sel) { sel.value = studentId; sel.focus(); }
  }, 100);
}

function openClassGroupModal(classId = null) {
  const isEdit = Boolean(classId);
  const grp = isEdit ? window.appDB.getClassGroupById(classId) : {
    Class_ID: 'ปวช.2 กลุ่ม1',
    Group_Label: 'กลุ่ม1',
    Level: 'ปวช.',
    Level_Year: 'ปวช.2',
    Year: 2,
    Major: 'ช่างกลโรงงาน',
    Group_No: 1,
    Advisor_Name: ''
  };

  const modal = document.getElementById('classGroupModal');
  const body = document.getElementById('classGroupModalBody');
  if (!modal || !body) return;

  body.innerHTML = `
    <form onsubmit="submitClassGroupForm(event)" class="space-y-3.5 text-xs sm:text-sm">
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
    Class_ID: `${lvl}${yr} กลุ่ม${gNo}`,
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

function openPinLockModal() {
  window.appDB.setPinLocked(true);
  const modal = document.getElementById('pinLockModal');
  const body = document.getElementById('pinLockModalBody');
  if (!modal || !body) return;

  body.innerHTML = `
    <div class="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto mb-3 shadow-lg">
      <i data-lucide="lock" class="w-7 h-7"></i>
    </div>
    <h3 class="font-prompt font-bold text-slate-900 text-lg">ล็อกหน้าจอสำหรับครูผู้สอน</h3>
    <p class="text-xs text-slate-500 mt-1 mb-4">กรุณากรอกรหัส PIN เพื่อเข้าถึงข้อมูลการคัดกรองและเบอร์ผู้ปกครอง (รหัสเริ่มต้น: <b>2569</b>)</p>
    <form onsubmit="verifyPinUnlock(event)" class="space-y-3">
      <input type="password" id="pinUnlockInput" inputmode="numeric" placeholder="••••" required autofocus
             class="w-full text-center text-2xl tracking-widest font-mono font-bold rounded-2xl border-2 border-slate-300 px-4 py-3 focus:border-blue-600 outline-none" />
      <button type="submit" class="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-prompt font-bold text-sm shadow-md">
        ปลดล็อกเข้าสู่ระบบ
      </button>
    </form>
  `;
  modal.classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function verifyPinUnlock(e) {
  e.preventDefault();
  const input = document.getElementById('pinUnlockInput')?.value || '';
  if (input.trim() === window.appDB.getPinCode()) {
    window.appDB.setPinLocked(false);
    closeModal('pinLockModal');
    showToast('ปลดล็อกระบบเรียบร้อยแล้ว');
  } else {
    showToast('รหัส PIN ไม่ถูกต้อง (ค่าเริ่มต้นคือ 2569)', 'error');
  }
}

function captureCurrentGPS(targetInputId) {
  if (!navigator.geolocation) {
    showToast('เบราว์เซอร์ของคุณไม่รองรับการดึงพิกัด GPS', 'error');
    return;
  }
  showToast('กำลังดึงพิกัด GPS ปัจจุบัน...');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const coords = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
      const el = document.getElementById(targetInputId);
      if (el) el.value = coords;
      showToast(`ดึงพิกัดสำเร็จ: ${coords}`);
    },
    () => showToast('ไม่สามารถดึงพิกัดได้ กรุณาอนุญาตการเข้าถึงตำแหน่ง', 'error'),
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
      const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
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
  if (window.appDB.isPinLocked()) {
    openPinLockModal();
  }
});
