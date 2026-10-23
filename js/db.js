/**
 * ============================================================================
 * Relational Database Engine V4
 * - 4 Core Relational Tables (Class_Groups, Students, Discipline_Records, Screening_Records)
 * - 5-Dimension Behavioral & Risk Screening + Case Follow-up Tracking System
 * - Smart Google Forms Importer (Main Survey + Photo Form + Google Sheets CSV URL)
 * ============================================================================
 */

const STORAGE_KEY = 'STUDENT_MACHINE_TOOL_DB_V3';
const CLOUD_URL_KEY = 'STUDENT_MACHINE_TOOL_CLOUD_URL';
const PIN_CODE_KEY = 'STUDENT_MACHINE_TOOL_PIN_CODE';
const PIN_ENABLED_KEY = 'STUDENT_MACHINE_TOOL_PIN_ENABLED';
const PIN_AUTH_KEY = 'STUDENT_MACHINE_TOOL_PIN_AUTH';

const DISTRICT_COORDS_MAP = {
  'เมืองฉะเชิงเทรา': '13.6904, 101.0779',
  'บางน้ำเปรี้ยว': '13.8466, 101.0536',
  'แปลงยาว': '13.5855, 101.2872',
  'บางคล้า': '13.7297, 101.2081',
  'บ้านโพธิ์': '13.5997, 101.0789',
  'ราชสาส์น': '13.7806, 101.2819',
  'สนามชัยเขต': '13.6592, 101.4394',
  'พนมสารคาม': '13.7483, 101.3486',
  'คลองเขื่อน': '13.7900, 101.1633',
  'บางปะกง': '13.5422, 100.9936',
  'บ้านสร้าง': '13.9961, 101.2217',
  'ศรีมโหสถ': '13.8869, 101.4119',
  'บางบ่อ': '13.5839, 100.8683',
  'หนองจอก': '13.8556, 100.8625',
  'พนัสนิคม': '13.4528, 101.1794',
  'พานทอง': '13.4683, 101.0953',
  'องครักษ์': '14.1206, 101.0028'
};

/**
 * โครงสร้างหมวดหมู่พฤติกรรมนักเรียนสำหรับการคัดกรองและติดตามผล
 */
window.BEHAVIOR_CATALOG = {
  learning: {
    title: 'หมวดที่ 1: พฤติกรรมการเรียน & การมาเรียน',
    icon: 'book-open',
    color: 'indigo',
    items: [
      { id: 'ขาดเรียนบ่อย', label: 'ขาดเรียนบ่อย / เสี่ยงหมดสิทธิ์สอบ', severity: 'high', icon: 'calendar-x' },
      { id: 'มาสายบ่อย', label: 'มาสายประจำ / ไม่ทันเข้าแถว', severity: 'medium', icon: 'clock' },
      { id: 'หนีเรียน', label: 'โดดเรียน / ออกนอกวิทยาลัย', severity: 'high', icon: 'log-out' },
      { id: 'เสี่ยงติด 0/ร/มส', label: 'ค้างส่งงาน / เสี่ยงติด 0, ร, มส', severity: 'medium', icon: 'file-warning' },
      { id: 'เสี่ยงออกกลางคัน', label: 'เสี่ยงออกกลางคัน (Drop-out Risk)', severity: 'high', icon: 'user-x' }
    ]
  },
  emotional: {
    title: 'หมวดที่ 2: พฤติกรรมอารมณ์ สังคม & การใช้ชีวิต',
    icon: 'heart-handshake',
    color: 'purple',
    items: [
      { id: 'ติดเกม/มือถือ', label: 'ติดเกม / เล่นมือถือในเวลาเรียน', severity: 'medium', icon: 'gamepad-2' },
      { id: 'เก็บตัว/ซึมเศร้า/เครียด', label: 'เก็บตัว / เครียดสะสม / ซึมเศร้า', severity: 'high', icon: 'cloud-rain' },
      { id: 'อารมณ์ร้อน/ก้าวร้าว', label: 'อารมณ์ร้อน / ก้าวร้าว / เสี่ยงวิวาท', severity: 'high', icon: 'zap' },
      { id: 'ผิดระเบียบการแต่งกาย', label: 'ผิดระเบียบการแต่งกาย / ทรงผมซ้ำ', severity: 'medium', icon: 'shirt' },
      { id: 'ทำงานพิเศษเลิกดึก', label: 'ทำงานพาร์ทไทม์เลิกดึก / อ่อนเพลีย', severity: 'medium', icon: 'moon' }
    ]
  },
  positive: {
    title: 'หมวดที่ 3: พฤติกรรมเชิงบวก / จุดแข็ง',
    icon: 'award',
    color: 'emerald',
    items: [
      { id: 'จิตอาสา/ช่วยงานแผนก', label: 'จิตอาสา / ช่วยงานครูและแผนกดีเยี่ยม', severity: 'positive', icon: 'sparkles' },
      { id: 'ทักษะฝีมือช่างดีเด่น', label: 'ทักษะปฏิบัติงานช่างกล/อุตสาหกรรมดีเด่น', severity: 'positive', icon: 'wrench' },
      { id: 'มีความรับผิดชอบ/ผู้นำ', label: 'มีความรับผิดชอบสูง / หัวหน้ากลุ่ม', severity: 'positive', icon: 'star' }
    ]
  }
};

window.FOLLOWUP_STATUS_LIST = [
  { id: 'ปกติ', label: '🟢 ปกติ (ไม่ต้องติดตามพิเศษ)', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { id: 'เฝ้าระวัง', label: '🟡 เฝ้าระวัง / รอครูที่ปรึกษาพูดคุย', badgeClass: 'bg-amber-100 text-amber-900 border-amber-300' },
  { id: 'กำลังติดตาม', label: '🟠 กำลังติดตามดูแล / ทำข้อตกลงแล้ว', badgeClass: 'bg-orange-100 text-orange-900 border-orange-300' },
  { id: 'ส่งต่อผู้ปกครอง/ปกครอง', label: '🔴 เชิญผู้ปกครอง / ส่งงานปกครอง-แนะแนว', badgeClass: 'bg-red-100 text-red-900 border-red-300' },
  { id: 'ดูแลสำเร็จ/ดีขึ้นแล้ว', label: '✅ ปรับพฤติกรรมสำเร็จ / ดีขึ้นแล้ว', badgeClass: 'bg-teal-100 text-teal-900 border-teal-300' }
];

class RelationalDatabase {
  constructor() {
    this.db = null;
    this.init();
  }

  init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        this.db = JSON.parse(saved);
        if (!this.db.Class_Groups || !this.db.Students || !this.db.Discipline_Records || !this.db.Screening_Records) {
          throw new Error('Invalid schema in localStorage');
        }
      } catch (e) {
        console.warn('Fallback to initial DB:', e);
        this.resetToInitial(false);
      }
    } else {
      this.resetToInitial(false);
    }
    this.recomputeAllIssuesAndRisks();
  }

  resetToInitial(logAction = true) {
    if (window.INITIAL_RELATIONAL_DB) {
      this.db = JSON.parse(JSON.stringify(window.INITIAL_RELATIONAL_DB));
      if (logAction) {
        this.addAuditLog('รีเซ็ตฐานข้อมูลกลับเป็นค่าเริ่มต้น', 'คืนค่าข้อมูลจากไฟล์ต้นฉบับทั้งหมด 125 รายการ');
      }
      this.save();
    }
  }

  save() {
    this.recomputeAllIssuesAndRisks();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db));
    window.dispatchEvent(new CustomEvent('db-updated'));
  }

  normalizeDistrictName(rawDist) {
    if (!rawDist) return 'ไม่ระบุ';
    let d = String(rawDist).trim();
    d = d.replace(/อำเภอ|อ\.|จังหวัดฉะเชิงเทรา|จ\.ฉะเชิงเทรา|ฉะเชิงเทรา|ฉะเฉิงเทรา|ฮะเชิงเทรา/g, '').trim();
    d = d.replace('เเปลงยาว', 'แปลงยาว')
         .replace('เมื่อง', 'เมือง')
         .replace('บางคบ้า', 'บางคล้า')
         .replace('บางนํ้าเปรี้ยว', 'บางน้ำเปรี้ยว')
         .replace('ราชสาสน์', 'ราชสาส์น')
         .replace('สยามชัยเขต', 'สนามชัยเขต');
    if (!d || d === '-' || d === '.') return 'ไม่ระบุ';
    if (d === 'เมือง') return 'เมืองฉะเชิงเทรา';
    return d;
  }

  /**
   * แปลงลิงก์ Google Drive จาก Google Form (เช่น open?id=... หรือ file/d/...) ให้เป็น Direct Thumbnail URL
   */
  normalizePhotoUrl(rawUrl) {
    const s = String(rawUrl || '').trim();
    if (!s || s === '-') return '';
    if (s.startsWith('data:image/')) return s;
    const idMatch = s.match(/(?:id=|\/d\/)([a-zA-Z0-9_-]{20,})/);
    if (idMatch && idMatch[1]) {
      return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w800`;
    }
    if (s.startsWith('http://') || s.startsWith('https://')) {
      return s;
    }
    return '';
  }

  cleanPhoneNumber(rawPhone) {
    if (!rawPhone) return { phone: '', note: '' };
    const s = String(rawPhone).trim();
    if (['-', 'ไม่มี', '.'].includes(s)) return { phone: '', note: '' };
    const m = s.match(/0\d[\d\s\-]{7,10}\d|\b[689]\d{8}\b/);
    if (m) {
      let num = m[0].replace(/[\s\-]/g, '');
      if (num.length === 9 && ['6', '8', '9'].includes(num[0])) {
        num = '0' + num;
      }
      const note = s.replace(m[0], '').replace(/^[()\s\-/,]+|[()\s\-/,]+$/g, '').trim();
      return { phone: num, note };
    }
    return { phone: s.replace(/\D/g, ''), note: s };
  }

  parseSubstanceString(rawSub) {
    const rawStr = String(rawSub || '').trim();
    if (!rawStr || rawStr === 'ยังไม่ได้กรอกข้อมูล') {
      return {
        rawDisplay: 'ยังไม่ได้กรอกข้อมูล',
        cleanSummary: 'ไม่ระบุ',
        tags: [],
        hasSubstanceRisk: false
      };
    }

    const tags = [];
    if (rawStr.includes('บุหรี่')) tags.push('บุหรี่');
    if (rawStr.includes('เหล้า') || rawStr.includes('เบียร') || rawStr.includes('สุรา')) tags.push('เหล้า/เบียร์');
    if (rawStr.includes('กระท่อม')) tags.push('น้ำกระท่อม');
    if (rawStr.includes('กัญชา')) tags.push('กัญชา');

    if (tags.length > 0) {
      return {
        rawDisplay: rawStr,
        cleanSummary: tags.join(', '),
        tags,
        hasSubstanceRisk: true
      };
    }

    return {
      rawDisplay: rawStr,
      cleanSummary: 'ไม่ดื่ม/ไม่สูบ',
      tags: ['ไม่ดื่ม/ไม่สูบ'],
      hasSubstanceRisk: false
    };
  }

  computeStudentIssues(stu) {
    const issues = [];
    const sid = String(stu.Student_ID || '').trim();
    if (!/^\d{11}$/.test(sid)) {
      issues.push('รหัสนักศึกษาไม่ครบ 11 หลัก');
    }
    if (!stu.Full_Name || stu.Full_Name.trim() === '') {
      issues.push('ไม่มีชื่อ-นามสกุล');
    }
    const cleanStuPhone = String(stu.Phone_Number || '').replace(/\D/g, '');
    if (!cleanStuPhone) {
      issues.push('ไม่มีเบอร์โทรศัพท์นักเรียน');
    } else if (cleanStuPhone.length !== 10) {
      issues.push(`เบอร์โทรนักเรียนมี ${cleanStuPhone.length} หลัก (${stu.Phone_Number})`);
    }

    const cleanParPhone = String(stu.Parent_Phone || '').replace(/\D/g, '');
    if (!cleanParPhone) {
      issues.push('ไม่มีเบอร์โทรศัพท์ผู้ปกครอง');
    } else if (cleanParPhone.length !== 10) {
      issues.push(`เบอร์โทรผู้ปกครองมี ${cleanParPhone.length} หลัก (${stu.Parent_Phone})`);
    }

    if (!stu.Address || stu.Address === 'ยังไม่ได้กรอกที่อยู่' || (!stu.House_No && !stu.Subdistrict && stu.Address.length < 5)) {
      issues.push('ยังไม่ได้กรอกที่อยู่/ข้อมูลพื้นฐานไม่ครบ');
    }
    if (!stu.Zone_District || stu.Zone_District === 'ไม่ระบุ') {
      issues.push('ไม่ระบุอำเภอ/โซนพื้นที่');
    }
    if (!stu.Photo_URL || stu.Photo_Status !== 'มีรูปแล้ว') {
      issues.push('ยังไม่มีรูปถ่ายนักเรียน');
    }
    return issues;
  }

  ensureClassGroupExists(levelYear, groupNo, major = null) {
    let cleanLvlYear = String(levelYear || 'ปวช.1').trim().replace(/\s+/g, '');
    if (/^ปวช(\d)$/.test(cleanLvlYear)) cleanLvlYear = cleanLvlYear.replace('ปวช', 'ปวช.');
    if (/^ปวส(\d)$/.test(cleanLvlYear)) cleanLvlYear = cleanLvlYear.replace('ปวส', 'ปวส.');
    if (cleanLvlYear === 'ปวช.') cleanLvlYear = 'ปวช.1';
    if (cleanLvlYear === 'ปวส.') cleanLvlYear = 'ปวส.1';

    const gNum = Number(String(groupNo || '1').replace(/\D/g, '')) || 1;
    const classId = `${cleanLvlYear} กลุ่ม${gNum}`;
    const existing = (this.db.Class_Groups || []).find(c => c.Class_ID === classId);
    if (existing) return existing;

    const isPvs = cleanLvlYear.startsWith('ปวส');
    const levelPrefix = isPvs ? 'ปวส.' : 'ปวช.';
    const yrMatch = cleanLvlYear.match(/\d+/);
    const yr = yrMatch ? Number(yrMatch[0]) : 1;
    const defaultMajor = major || (isPvs ? 'เทคนิคอุตสาหกรรม' : 'ช่างกลโรงงาน');

    const newGroup = {
      Class_ID: classId,
      Group_Label: `กลุ่ม${gNum}`,
      Level: levelPrefix,
      Level_Year: cleanLvlYear,
      Year: yr,
      Major: defaultMajor,
      Group_No: gNum,
      Advisor_Name: `ครูที่ปรึกษา ${classId} (คลิกเพื่อระบุชื่อ)`,
      Note: 'สร้างอัตโนมัติจากระบบนำเข้าข้อมูล'
    };
    this.db.Class_Groups.push(newGroup);
    this.db.Class_Groups.sort((a, b) => a.Class_ID.localeCompare(b.Class_ID, 'th'));
    return newGroup;
  }

  recomputeAllIssuesAndRisks() {
    if (!this.db || !this.db.Students) return;

    const highSeverityBehaviors = ['ขาดเรียนบ่อย', 'หนีเรียน', 'เสี่ยงออกกลางคัน', 'เก็บตัว/ซึมเศร้า/เครียด', 'อารมณ์ร้อน/ก้าวร้าว'];
    const allRiskBehaviorIds = [
      ...window.BEHAVIOR_CATALOG.learning.items.map(i => i.id),
      ...window.BEHAVIOR_CATALOG.emotional.items.map(i => i.id)
    ];

    this.db.Students.forEach(stu => {
      const cg = (this.db.Class_Groups || []).find(c => c.Class_ID === stu.Class_ID);
      if (cg) {
        stu.Group_Label = cg.Group_Label || `กลุ่ม${cg.Group_No}`;
        stu.Level_Year = cg.Level_Year || `${cg.Level}${cg.Year}`;
        stu.Group_No = cg.Group_No;
      } else {
        const parts = String(stu.Class_ID || 'ปวช.1 กลุ่ม1').split(' ');
        const ly = parts[0] || 'ปวช.1';
        const gMatch = String(stu.Class_ID || '').match(/กลุ่ม\s*(\d+)/);
        const gNo = gMatch ? Number(gMatch[1]) : (stu.Group_No || 1);
        const createdCg = this.ensureClassGroupExists(ly, gNo);
        stu.Class_ID = createdCg.Class_ID;
        stu.Level_Year = createdCg.Level_Year;
        stu.Group_Label = createdCg.Group_Label;
        stu.Group_No = createdCg.Group_No;
      }

      if (stu.Photo_URL) {
        stu.Photo_URL = this.normalizePhotoUrl(stu.Photo_URL);
        stu.Photo_Status = stu.Photo_URL ? 'มีรูปแล้ว' : 'ยังไม่มีรูป';
      }

      stu.Data_Issues = this.computeStudentIssues(stu);

      let sc = (this.db.Screening_Records || []).find(r => r.Student_ID === stu.Student_ID);
      if (!sc) {
        sc = {
          Screening_ID: `SCR-2569-${stu.Student_ID.slice(-4)}`,
          Academic_Term: '1/2569',
          Student_ID: stu.Student_ID,
          Family_Status: 'อยู่ร่วมกัน',
          Parent_Occupation: '',
          Family_Income_Range: 'ไม่ระบุ',
          Daily_Allowance: 'ไม่ระบุ',
          Scholarship_Need: 'ไม่ระบุ',
          Financial_Status: 'เพียงพอ',
          Substance_Raw: stu.Substance_Raw || 'ยังไม่ได้กรอกข้อมูล',
          Behavior_Tags: [],
          Followup_Status: '',
          Followup_History: [],
          Home_Visit_Status: 'ยังไม่เยี่ยมบ้าน',
          Home_Visit_Date: '',
          Home_Visit_Photo: '',
          Home_Visit_Summary: ''
        };
        this.db.Screening_Records.push(sc);
      }

      if (!Array.isArray(sc.Behavior_Tags)) sc.Behavior_Tags = [];
      if (!Array.isArray(sc.Followup_History)) sc.Followup_History = [];

      const rawSubSource = stu.Substance_Raw || sc.Substance_Raw || '';
      const subInfo = this.parseSubstanceString(rawSubSource);
      stu.Substance_Raw = subInfo.rawDisplay;
      stu.Substance_Clean = subInfo.cleanSummary;
      stu.Substance_Tags = subInfo.tags;

      sc.Substance_Raw = subInfo.rawDisplay;
      sc.Substance_History = subInfo.cleanSummary;
      sc.Substance_Tags = subInfo.tags;

      const reasons = [];
      const rTags = [];

      // 1. พฤติกรรมนักเรียน (Learning & Emotional Behavior Tags)
      const stuBehaviorRiskTags = sc.Behavior_Tags.filter(b => allRiskBehaviorIds.includes(b));
      const stuPositiveTags = sc.Behavior_Tags.filter(b => !allRiskBehaviorIds.includes(b));
      stu.Behavior_Tags = sc.Behavior_Tags;
      stu.Positive_Behavior_Tags = stuPositiveTags;

      stuBehaviorRiskTags.forEach(bTag => {
        reasons.push(`พฤติกรรม: ${bTag}`);
        rTags.push(bTag);
      });

      // 2. สารเสพติด
      if (subInfo.tags.includes('บุหรี่')) {
        reasons.push('สูบบุหรี่');
        rTags.push('สูบบุหรี่');
      }
      if (subInfo.tags.includes('เหล้า/เบียร์')) {
        reasons.push('ดื่มเหล้า/เบียร์');
        rTags.push('ดื่มเหล้า/เบียร์');
      }
      if (subInfo.tags.includes('น้ำกระท่อม')) {
        reasons.push('ดื่มน้ำกระท่อม');
        rTags.push('น้ำกระท่อม');
      }
      if (subInfo.tags.includes('กัญชา')) {
        reasons.push('ใช้กัญชา');
        rTags.push('กัญชา');
      }

      // 3. เศรษฐกิจ & ครอบครัว
      const income = String(sc.Family_Income_Range || '');
      const allowance = String(sc.Daily_Allowance || '');
      const schol = String(sc.Scholarship_Need || '');
      const fam = String(sc.Family_Status || '');

      const isLowAlw = allowance.includes('น้อยกว่า 100');
      const needSchol = schol === 'ต้องการ';
      const brokenFam = fam === 'หย่าร้าง' || fam === 'แยกกันอยู่' || fam === 'บิดาหรือมารดาเสียชีวิต';

      if (income.includes('ต่ำกว่า 10000')) {
        reasons.push('รายได้ครอบครัวต่ำ (<10,000 บ.)');
        rTags.push('รายได้ต่ำ (<10,000 บ.)');
      } else if (sc.Financial_Status === 'ขัดสน' || sc.Financial_Status === 'ต้องทำงานพิเศษ') {
        reasons.push(`เศรษฐกิจครอบครัว (${sc.Financial_Status})`);
        rTags.push('รายได้ต่ำ (<10,000 บ.)');
      }

      if (isLowAlw) {
        reasons.push('ได้เงินมาเรียนน้อย (<100 บ./วัน)');
        rTags.push('ค่าขนมน้อย (<100 บ.)');
      }

      if (needSchol) {
        reasons.push('ต้องการทุนการศึกษา');
        rTags.push('ต้องการทุนการศึกษา');
      }

      if (brokenFam) {
        reasons.push(`ครอบครัว (${fam})`);
        rTags.push('ครอบครัวหย่าร้าง/แยกกันอยู่');
      }

      // 4. งานปกครอง
      const discList = (this.db.Discipline_Records || []).filter(d => d.Student_ID === stu.Student_ID);
      const deducted = discList.reduce((acc, cur) => acc + Math.abs(Number(cur.Points_Deducted || 0)), 0);
      if (deducted > 0) {
        reasons.push(`ถูกหักคะแนนความประพฤติ (-${deducted})`);
        rTags.push('ถูกหักคะแนนความประพฤติ');
      }

      if (stu.Address === 'ยังไม่ได้กรอกที่อยู่') {
        reasons.push('ยังไม่กรอกข้อมูลพื้นฐาน');
        rTags.push('ข้อมูลไม่ครบ');
      }

      sc.Risk_Reasons = reasons;
      sc.Risk_Tags = rTags;
      sc.Risk_Factors_Note = reasons.length > 0 ? reasons.join(', ') : 'ปกติ (ไม่พบความเสี่ยง)';

      const hasHighBehavior = stuBehaviorRiskTags.some(b => highSeverityBehaviors.includes(b));

      if (!sc.Manual_Risk_Override) {
        if (
          subInfo.tags.includes('น้ำกระท่อม') ||
          subInfo.tags.includes('กัญชา') ||
          hasHighBehavior ||
          deducted >= 20 ||
          (subInfo.hasSubstanceRisk && (income.includes('ต่ำกว่า 10000') || isLowAlw || stuBehaviorRiskTags.length > 0))
        ) {
          sc.Overall_Risk_Level = 'กลุ่มมีปัญหา';
        } else if (reasons.length > 0) {
          sc.Overall_Risk_Level = 'กลุ่มเสี่ยง';
        } else {
          sc.Overall_Risk_Level = 'กลุ่มปกติ';
        }
      }

      if (!sc.Followup_Status) {
        if (sc.Overall_Risk_Level === 'กลุ่มมีปัญหา' || sc.Overall_Risk_Level === 'กลุ่มเสี่ยง') {
          sc.Followup_Status = 'เฝ้าระวัง';
        } else {
          sc.Followup_Status = 'ปกติ';
        }
      }
    });
  }

  getClassGroups() {
    return this.db.Class_Groups || [];
  }

  getClassGroupById(classId) {
    return (this.db.Class_Groups || []).find(c => c.Class_ID === classId) || null;
  }

  getStudents() {
    return this.db.Students || [];
  }

  getStudentById(studentId) {
    return (this.db.Students || []).find(s => s.Student_ID === studentId) || null;
  }

  getStudent360(studentId) {
    const student = this.getStudentById(studentId);
    if (!student) return null;

    const classGroup = this.getClassGroupById(student.Class_ID) || {
      Class_ID: student.Class_ID,
      Group_Label: student.Group_Label || `กลุ่ม${student.Group_No || 1}`,
      Level: student.Level_Year && student.Level_Year.startsWith('ปวส') ? 'ปวส.' : 'ปวช.',
      Level_Year: student.Level_Year || 'ปวช.1',
      Year: 1,
      Major: student.Level_Year && student.Level_Year.startsWith('ปวส') ? 'เทคนิคอุตสาหกรรม' : 'ช่างกลโรงงาน',
      Group_No: student.Group_No || 1,
      Advisor_Name: '-'
    };

    const disciplineList = (this.db.Discipline_Records || [])
      .filter(d => d.Student_ID === studentId)
      .sort((a, b) => new Date(b.Date_Time) - new Date(a.Date_Time));

    const totalDeducted = disciplineList.reduce((acc, cur) => acc + Math.abs(Number(cur.Points_Deducted || 0)), 0);
    const currentScore = Math.max(0, 100 - totalDeducted);

    const screenings = (this.db.Screening_Records || [])
      .filter(sc => sc.Student_ID === studentId);
    const latestScreening = screenings.length > 0 ? screenings[screenings.length - 1] : {
      Screening_ID: `SCR-2569-NEW`,
      Academic_Term: '1/2569',
      Student_ID: studentId,
      Family_Status: 'อยู่ร่วมกัน',
      Financial_Status: 'เพียงพอ',
      Overall_Risk_Level: 'กลุ่มปกติ',
      Behavior_Tags: [],
      Followup_Status: 'ปกติ',
      Followup_History: [],
      Risk_Reasons: [],
      Risk_Tags: [],
      Risk_Factors_Note: 'ปกติ',
      Home_Visit_Status: 'ยังไม่เยี่ยมบ้าน',
      Home_Visit_Date: '',
      Home_Visit_Photo: '',
      Substance_Raw: student.Substance_Raw || 'ไม่ระบุ',
      Substance_History: student.Substance_Clean || 'ไม่ระบุ',
      Substance_Tags: student.Substance_Tags || [],
      Scholarship_Need: 'ไม่ระบุ'
    };

    return {
      ...student,
      ClassGroup: classGroup,
      DisciplineRecords: disciplineList,
      TotalPointsDeducted: totalDeducted,
      BehaviorScore: currentScore,
      Screening: latestScreening,
      AllScreenings: screenings
    };
  }

  getAllStudents360() {
    return this.getStudents().map(s => this.getStudent360(s.Student_ID));
  }

  getProblemAndSubstanceSummary() {
    const all = this.getAllStudents360();
    const counts = {
      total: all.length,
      riskNormal: 0,
      riskWarning: 0,
      riskProblem: 0,
      anySubstance: 0,
      cleanSubstance: 0,
      smoke: 0,
      alcohol: 0,
      kratom: 0,
      weed: 0,
      lowIncome: 0,
      scholarship: 0,
      lowAllowance: 0,
      brokenFamily: 0,
      disciplineDeducted: 0,
      dataIncomplete: 0,
      // Behavior & Follow-up counts
      anyBehaviorIssue: 0,
      positiveBehavior: 0,
      behaviorCounts: {},
      followupCounts: {
        'ปกติ': 0,
        'เฝ้าระวัง': 0,
        'กำลังติดตาม': 0,
        'ส่งต่อผู้ปกครอง/ปกครอง': 0,
        'ดูแลสำเร็จ/ดีขึ้นแล้ว': 0
      },
      homeVisited: 0
    };

    Object.values(window.BEHAVIOR_CATALOG).forEach(cat => {
      cat.items.forEach(it => { counts.behaviorCounts[it.id] = 0; });
    });

    const riskBehaviorIds = [
      ...window.BEHAVIOR_CATALOG.learning.items.map(i => i.id),
      ...window.BEHAVIOR_CATALOG.emotional.items.map(i => i.id)
    ];

    all.forEach(s => {
      const sc = s.Screening;
      if (sc.Overall_Risk_Level === 'กลุ่มมีปัญหา') counts.riskProblem++;
      else if (sc.Overall_Risk_Level === 'กลุ่มเสี่ยง') counts.riskWarning++;
      else counts.riskNormal++;

      const subTags = s.Substance_Tags || [];
      if (subTags.includes('บุหรี่')) counts.smoke++;
      if (subTags.includes('เหล้า/เบียร์')) counts.alcohol++;
      if (subTags.includes('น้ำกระท่อม')) counts.kratom++;
      if (subTags.includes('กัญชา')) counts.weed++;

      if (subTags.some(t => ['บุหรี่', 'เหล้า/เบียร์', 'น้ำกระท่อม', 'กัญชา'].includes(t))) {
        counts.anySubstance++;
      } else if (subTags.includes('ไม่ดื่ม/ไม่สูบ')) {
        counts.cleanSubstance++;
      }

      const rTags = sc.Risk_Tags || [];
      if (rTags.includes('รายได้ต่ำ (<10,000 บ.)')) counts.lowIncome++;
      if (rTags.includes('ต้องการทุนการศึกษา')) counts.scholarship++;
      if (rTags.includes('ค่าขนมน้อย (<100 บ.)')) counts.lowAllowance++;
      if (rTags.includes('ครอบครัวหย่าร้าง/แยกกันอยู่')) counts.brokenFamily++;
      if (s.TotalPointsDeducted > 0) counts.disciplineDeducted++;

      const bTags = sc.Behavior_Tags || [];
      bTags.forEach(bt => {
        counts.behaviorCounts[bt] = (counts.behaviorCounts[bt] || 0) + 1;
      });
      if (bTags.some(bt => riskBehaviorIds.includes(bt))) counts.anyBehaviorIssue++;
      if (bTags.some(bt => !riskBehaviorIds.includes(bt))) counts.positiveBehavior++;

      const fStat = sc.Followup_Status || 'ปกติ';
      counts.followupCounts[fStat] = (counts.followupCounts[fStat] || 0) + 1;

      if (sc.Home_Visit_Status === 'เยี่ยมบ้านแล้ว') counts.homeVisited++;

      const nonPhotoIssues = (s.Data_Issues || []).filter(i => i !== 'ยังไม่มีรูปถ่ายนักเรียน');
      if (nonPhotoIssues.length > 0) counts.dataIncomplete++;
    });

    return counts;
  }

  /**
   * บันทึกการคัดกรองพฤติกรรมนักเรียนและประวัติการติดตามเคส (Follow-up)
   */
  saveBehaviorAndFollowup(studentId, payload) {
    let sc = (this.db.Screening_Records || []).find(r => r.Student_ID === studentId);
    const stu = this.getStudentById(studentId);
    if (!sc) return;

    sc.Behavior_Tags = Array.isArray(payload.Behavior_Tags) ? payload.Behavior_Tags : (sc.Behavior_Tags || []);
    if (payload.Followup_Status) sc.Followup_Status = payload.Followup_Status;
    if (payload.Substance_Raw !== undefined) {
      sc.Substance_Raw = payload.Substance_Raw;
      if (stu) stu.Substance_Raw = payload.Substance_Raw;
    }
    if (payload.Scholarship_Need !== undefined) sc.Scholarship_Need = payload.Scholarship_Need;
    if (payload.Family_Status !== undefined) sc.Family_Status = payload.Family_Status;
    if (payload.Financial_Status !== undefined) sc.Financial_Status = payload.Financial_Status;

    if (payload.Manual_Risk_Level && payload.Manual_Risk_Level !== 'AUTO') {
      sc.Overall_Risk_Level = payload.Manual_Risk_Level;
      sc.Manual_Risk_Override = true;
    } else {
      sc.Manual_Risk_Override = false;
    }

    if (payload.Followup_Note && payload.Followup_Note.trim() !== '') {
      if (!Array.isArray(sc.Followup_History)) sc.Followup_History = [];
      sc.Followup_History.unshift({
        Followup_ID: `FLW-${Date.now()}`,
        Date_Time: new Date().toISOString(),
        Action_Type: payload.Followup_Action_Type || 'ครูที่ปรึกษาพูดคุย/ให้คำปรึกษา',
        Note: payload.Followup_Note.trim(),
        Teacher_Name: payload.Teacher_Name || 'ครูที่ปรึกษา'
      });
    }

    this.addAuditLog(
      'บันทึกคัดกรองพฤติกรรม/ติดตามเคส',
      `${stu ? stu.Full_Name : studentId} -> สถานะ: ${sc.Followup_Status} (${sc.Behavior_Tags.join(', ') || 'ไม่มีแท็กพฤติกรรม'})`
    );
    this.save();
  }

  upsertClassGroup(groupObj) {
    groupObj.Group_Label = groupObj.Group_Label || `กลุ่ม${groupObj.Group_No}`;
    groupObj.Level_Year = groupObj.Level_Year || `${groupObj.Level}${groupObj.Year}`;
    groupObj.Class_ID = `${groupObj.Level_Year} ${groupObj.Group_Label}`;
    const idx = this.db.Class_Groups.findIndex(c => c.Class_ID === groupObj.Class_ID);
    if (idx >= 0) {
      this.db.Class_Groups[idx] = { ...this.db.Class_Groups[idx], ...groupObj };
      this.addAuditLog('แก้ไขกลุ่มเรียน', `อัปเดต ${groupObj.Class_ID} (ครูที่ปรึกษา: ${groupObj.Advisor_Name})`);
    } else {
      this.db.Class_Groups.push(groupObj);
      this.db.Class_Groups.sort((a, b) => a.Class_ID.localeCompare(b.Class_ID, 'th'));
      this.addAuditLog('เพิ่มกลุ่มเรียนใหม่', `สร้าง ${groupObj.Class_ID} (${groupObj.Major})`);
    }
    this.save();
  }

  upsertStudent(studentData, oldStudentId = null) {
    const targetId = oldStudentId || studentData.Student_ID;
    const idx = this.db.Students.findIndex(s => s.Student_ID === targetId);

    if (studentData.Level_Year && studentData.Group_No) {
      const cg = this.ensureClassGroupExists(studentData.Level_Year, studentData.Group_No, studentData.Major);
      studentData.Class_ID = cg.Class_ID;
      studentData.Level_Year = cg.Level_Year;
      studentData.Group_Label = cg.Group_Label;
    }

    studentData.Zone_District = this.normalizeDistrictName(studentData.Zone_District);
    if (!studentData.Home_Location && DISTRICT_COORDS_MAP[studentData.Zone_District]) {
      studentData.Home_Location = DISTRICT_COORDS_MAP[studentData.Zone_District];
    }

    const parts = [];
    if (studentData.House_No && studentData.House_No !== '-') parts.push(`บ้านเลขที่ ${studentData.House_No}`);
    if (studentData.Road && studentData.Road !== '-') parts.push(`ถ.${studentData.Road}`);
    if (studentData.Subdistrict && studentData.Subdistrict !== '-') parts.push(`ต.${studentData.Subdistrict}`);
    if (studentData.Zone_District && studentData.Zone_District !== 'ไม่ระบุ') parts.push(`อ.${studentData.Zone_District}`);
    if (studentData.Zipcode && studentData.Zipcode !== '-') parts.push(studentData.Zipcode);
    if (parts.length > 0) {
      studentData.Address = parts.join(' ');
    } else if (!studentData.Address) {
      studentData.Address = 'ยังไม่ได้กรอกที่อยู่';
    }

    studentData.Photo_URL = this.normalizePhotoUrl(studentData.Photo_URL);
    studentData.Photo_Status = studentData.Photo_URL ? 'มีรูปแล้ว' : 'ยังไม่มีรูป';

    if (idx >= 0) {
      if (oldStudentId && oldStudentId !== studentData.Student_ID) {
        this.db.Discipline_Records.forEach(d => {
          if (d.Student_ID === oldStudentId) d.Student_ID = studentData.Student_ID;
        });
        this.db.Screening_Records.forEach(sc => {
          if (sc.Student_ID === oldStudentId) sc.Student_ID = studentData.Student_ID;
        });
      }
      this.db.Students[idx] = { ...this.db.Students[idx], ...studentData };
      this.addAuditLog('แก้ไขข้อมูลนักเรียน', `อัปเดตข้อมูล ${studentData.Student_ID} (${studentData.Full_Name})`);
    } else {
      this.db.Students.push(studentData);
      this.db.Screening_Records.push({
        Screening_ID: `SCR-2569-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 90 + 10)}`,
        Academic_Term: '1/2569',
        Student_ID: studentData.Student_ID,
        Family_Status: 'อยู่ร่วมกัน',
        Parent_Occupation: studentData.Parent_Occupation || '',
        Family_Income_Range: studentData.Family_Income_Range || '10000-15000 บาท',
        Daily_Allowance: studentData.Daily_Allowance || '100 บาท',
        Scholarship_Need: studentData.Scholarship_Need || 'ไม่ต้องการ',
        Financial_Status: 'เพียงพอ',
        Substance_Raw: studentData.Substance_Raw || 'ไม่สูบ ไม่ดื่ม',
        Substance_History: 'ไม่ดื่ม/ไม่สูบ',
        Behavior_Tags: [],
        Followup_Status: 'ปกติ',
        Followup_History: [],
        Overall_Risk_Level: 'กลุ่มปกติ',
        Home_Visit_Status: 'ยังไม่เยี่ยมบ้าน',
        Home_Visit_Date: '',
        Home_Visit_Photo: '',
        Home_Visit_Summary: ''
      });
      this.addAuditLog('เพิ่มนักเรียนใหม่', `เพิ่มรหัส ${studentData.Student_ID} (${studentData.Full_Name}) เข้า ${studentData.Class_ID}`);
    }
    this.save();
  }

  /**
   * ตรวจจับระดับชั้นปีอัตโนมัติจากข้อมูลใน Google Form หรือรหัสนักศึกษา 11 หลัก
   */
  detectLevelYearFromStudent(rawLevelCol, sid, fallbackLevelYear = 'ปวช.1') {
    const raw = String(rawLevelCol || '').trim().replace(/\s+/g, '');
    if (/ปวช\.?1/.test(raw)) return 'ปวช.1';
    if (/ปวช\.?2/.test(raw)) return 'ปวช.2';
    if (/ปวช\.?3/.test(raw)) return 'ปวช.3';
    if (/ปวส\.?1/.test(raw)) return 'ปวส.1';
    if (/ปวส\.?2/.test(raw)) return 'ปวส.2';

    const cleanSid = String(sid || '').trim();
    if (cleanSid.startsWith('692')) return 'ปวช.1';
    if (cleanSid.startsWith('682')) return 'ปวช.2';
    if (cleanSid.startsWith('672')) return 'ปวช.3';
    if (cleanSid.startsWith('693')) return 'ปวส.1';
    if (cleanSid.startsWith('683')) return 'ปวส.2';

    if (raw.startsWith('ปวส')) {
      return fallbackLevelYear.startsWith('ปวส') ? fallbackLevelYear : 'ปวส.1';
    }
    if (raw.startsWith('ปวช')) {
      return fallbackLevelYear.startsWith('ปวช') ? fallbackLevelYear : 'ปวช.1';
    }
    return fallbackLevelYear || 'ปวช.1';
  }

  /**
   * ระบบนำเข้าข้อมูลอัจฉริยะจาก Google Forms (รองรับทั้งฟอร์มข้อมูลหลัก 24 คอลัมน์ และฟอร์มส่งรูปถ่าย Google Drive)
   */
  importFromGoogleFormRows(rows, options = {}) {
    const {
      levelMode = 'AUTO', // 'AUTO' หรือระบุชั้นปี เช่น 'ปวช.2'
      defaultLevelYear = 'ปวช.2',
      defaultGroupNo = 1,
      defaultMajor = 'ช่างกลโรงงาน'
    } = options;

    let addedCount = 0;
    let updatedCount = 0;
    let photoMatchedCount = 0;
    const touchedGroups = new Set();

    rows.forEach(r => {
      // ค้นหาค่าจากหัวคอลัมน์ทุกแบบที่ Google Form อาจตั้งชื่อ
      const getVal = (...keys) => {
        for (const k of keys) {
          if (r[k] !== undefined && String(r[k]).trim() !== '') return String(r[k]).trim();
        }
        // ลองค้นหาแบบไม่สนใจช่องว่างหัวท้ายของชื่อคอลัมน์
        const rowKeys = Object.keys(r);
        for (const k of keys) {
          const foundKey = rowKeys.find(rk => rk.trim() === k.trim() || rk.includes(k));
          if (foundKey && r[foundKey] !== undefined && String(r[foundKey]).trim() !== '') {
            return String(r[foundKey]).trim();
          }
        }
        return '';
      };

      let rawSid = getVal('รหัสประจำตัวนักเรียนนักศึกษา', 'รหัสประจำตัวนักเรียน', 'รหัสนักศึกษา', 'Student_ID');
      let rawName = getVal('ชื่อ-นามสกุล', 'ชื่อนาม-นามสกุล', 'ชื่อ - นามสกุล', 'Full_Name');

      let prefix = 'นาย';
      const prefixMatch = rawName.match(/^(นาย|นางสาว|น\.ส\.|นาง)\s*/);
      if (prefixMatch) {
        prefix = prefixMatch[1] === 'น.ส.' ? 'นางสาว' : prefixMatch[1];
        rawName = rawName.replace(/^(นาย|นางสาว|น\.ส\.|นาง)\s*/, '').trim();
      }

      // ตรวจหาลิงก์รูปภาพ Google Drive จากทุกคอลัมน์ในแถวนี้
      let detectedPhotoUrl = getVal('ลิงก์แสดงรูปภาพ_Direct', 'Photo_URL', 'รูปถ่าย', 'รูปภาพ');
      if (!detectedPhotoUrl) {
        for (const val of Object.values(r)) {
          const sVal = String(val || '').trim();
          if (sVal.includes('drive.google.com') || sVal.startsWith('data:image/')) {
            detectedPhotoUrl = sVal;
            break;
          }
        }
      }
      const cleanPhotoUrl = this.normalizePhotoUrl(detectedPhotoUrl);

      // กรณีเป็นฟอร์มส่งรูปภาพที่เด็กกรอกรหัสแค่ 3 ตัวท้าย (เช่น "020") หรือกรอกแค่ชื่อ
      let matchedStudent = null;
      const digitsSid = rawSid.replace(/\D/g, '');
      if (digitsSid.length === 11) {
        matchedStudent = this.db.Students.find(s => s.Student_ID === digitsSid);
      } else if (digitsSid.length > 0 && digitsSid.length <= 4) {
        matchedStudent = this.db.Students.find(s => s.Student_ID.endsWith(digitsSid.padStart(3, '0')) || (rawName && s.Full_Name === rawName));
      } else if (rawName) {
        matchedStudent = this.db.Students.find(s => s.Full_Name === rawName);
      }

      // ถ้าแถวนี้เป็นแถวจาก "ฟอร์มส่งรูปภาพ" (มีรูป + เจอนักเรียนในระบบแล้ว และไม่มีคอลัมน์ที่อยู่/ผู้ปกครอง)
      const hasMainSurveyCols = Boolean(getVal('เบอร์โทรศัพท์มือถือ ของผู้ปกครอง', 'เบอร์โทรศัพท์มือถือ_ผู้ปกครอง', 'บ้านเลขที่', 'ดิ่มหรือสูบไหม', 'รายได้โดยเฉลี่ยของครอบครัว'));
      if (matchedStudent && cleanPhotoUrl && !hasMainSurveyCols) {
        matchedStudent.Photo_URL = cleanPhotoUrl;
        matchedStudent.Photo_Status = 'มีรูปแล้ว';
        photoMatchedCount++;
        touchedGroups.add(matchedStudent.Class_ID);
        return;
      }

      if (!rawName && !matchedStudent) return;

      const finalSid = digitsSid.length === 11
        ? digitsSid
        : (matchedStudent ? matchedStudent.Student_ID : (digitsSid || `690000${Math.floor(Math.random() * 90000 + 10000)}`));

      const rawLvlCol = getVal('ชั้นปี', 'ระดับชั้นปี', 'ระดับชั้น', 'Level_Year');
      const resolvedLevelYear = levelMode === 'AUTO'
        ? this.detectLevelYearFromStudent(rawLvlCol, finalSid, defaultLevelYear)
        : defaultLevelYear;

      const rawGrpCol = getVal('กลุ่มเรียน', 'กลุ่ม', 'Group_No');
      const grpNo = Number(String(rawGrpCol || defaultGroupNo).replace(/\D/g, '')) || defaultGroupNo;

      const isPvs = resolvedLevelYear.startsWith('ปวส');
      const resolvedMajor = getVal('สาขาวิชา', 'Major') || (isPvs ? 'เทคนิคอุตสาหกรรม' : defaultMajor);
      const targetCg = this.ensureClassGroupExists(resolvedLevelYear, grpNo, resolvedMajor);
      touchedGroups.add(targetCg.Class_ID);

      const stuPhoneObj = this.cleanPhoneNumber(getVal('เบอร์โทรศัพท์มือถือ ของนักเรียน', 'เบอร์โทรศัพท์มือถือ_นักเรียน', 'Phone_Number'));
      const parPhoneObj = this.cleanPhoneNumber(getVal('เบอร์โทรศัพท์มือถือ ของผู้ปกครอง', 'เบอร์โทรศัพท์มือถือ_ผู้ปกครอง', 'Parent_Phone'));
      const emgPhoneObj = this.cleanPhoneNumber(getVal('เบอร์โทรศัพท์มือถือ ของผู้ปกครอง (กรณีฉุกเฉิน)', 'เบอร์โทรศัพท์มือถือ_ผู้ปกครอง_ฉุกเฉิน', 'Emergency_Phone'));

      const houseNo = getVal('บ้านเลขที่', 'House_No');
      const road = getVal('ถนน', 'Road');
      const subdist = getVal('ตำบล', 'Subdistrict');
      const rawDist = getVal('อำเภอ', 'Zone_District');
      const zipcode = getVal('รหัสไปรษณีย์', 'Zipcode');
      const zoneDist = this.normalizeDistrictName(rawDist || (matchedStudent ? matchedStudent.Zone_District : 'ไม่ระบุ'));

      const addrParts = [];
      if (houseNo && houseNo !== '-') addrParts.push(`บ้านเลขที่ ${houseNo}`);
      if (road && road !== '-') addrParts.push(`ถ.${road}`);
      if (subdist && subdist !== '-') addrParts.push(`ต.${subdist}`);
      if (zoneDist && zoneDist !== 'ไม่ระบุ') addrParts.push(`อ.${zoneDist}`);
      if (zipcode && zipcode !== '-') addrParts.push(zipcode);

      const stuPayload = {
        Student_ID: finalSid,
        Prefix: prefix,
        Full_Name: rawName || (matchedStudent ? matchedStudent.Full_Name : ''),
        Nickname: getVal('ชื่อเล่น', 'Nickname') || (matchedStudent ? matchedStudent.Nickname : ''),
        Gender: getVal('เพศ', 'Gender') || 'ชาย',
        Class_ID: targetCg.Class_ID,
        Level_Year: targetCg.Level_Year,
        Group_Label: targetCg.Group_Label,
        Group_No: targetCg.Group_No,
        Status: 'ปกติ',
        Phone_Number: stuPhoneObj.phone || (matchedStudent ? matchedStudent.Phone_Number : ''),
        Parent_Name: getVal('ชื่อ-นามสกุล ผู้ปกครอง', 'ชื่อ-นามสกุล_ผู้ปกครอง', 'Parent_Name') || (matchedStudent ? matchedStudent.Parent_Name : ''),
        Parent_Phone: parPhoneObj.phone || (matchedStudent ? matchedStudent.Parent_Phone : ''),
        Emergency_Phone: emgPhoneObj.phone || (matchedStudent ? matchedStudent.Emergency_Phone : ''),
        Emergency_Contact_Note: emgPhoneObj.note || (matchedStudent ? matchedStudent.Emergency_Contact_Note : ''),
        Social_Contact: getVal('ข้อมูลการติดต่ออื่นๆ IG หรือ Facebook', 'ข้อมูลการติดต่ออื่นๆ_IG_Facebook') || (matchedStudent ? matchedStudent.Social_Contact : ''),
        House_No: houseNo || (matchedStudent ? matchedStudent.House_No : ''),
        Road: road || (matchedStudent ? matchedStudent.Road : ''),
        Subdistrict: subdist || (matchedStudent ? matchedStudent.Subdistrict : ''),
        Zone_District: zoneDist,
        Zipcode: zipcode || (matchedStudent ? matchedStudent.Zipcode : ''),
        Address: addrParts.length > 0 ? addrParts.join(' ') : (matchedStudent ? matchedStudent.Address : 'ยังไม่ได้กรอกที่อยู่'),
        Home_Location: DISTRICT_COORDS_MAP[zoneDist] || (matchedStudent ? matchedStudent.Home_Location : ''),
        Photo_URL: cleanPhotoUrl || (matchedStudent ? matchedStudent.Photo_URL : ''),
        Photo_Status: (cleanPhotoUrl || (matchedStudent && matchedStudent.Photo_URL)) ? 'มีรูปแล้ว' : 'ยังไม่มีรูป',
        Commute_Method: getVal('นักเรียนเดินทางมาวิทยาลัยอย่างไร', 'Commute_Method') || (matchedStudent ? matchedStudent.Commute_Method : ''),
        Previous_School: getVal('สถานศึกษาเดิมที่นักเรียนจบมา', 'นักเรียนจบมาจากโรงเรียนอะไร', 'Previous_School') || (matchedStudent ? matchedStudent.Previous_School : ''),
        Substance_Raw: getVal('ดิ่มหรือสูบไหม', 'ดื่มหรือสูบไหม', 'Substance_Reported_Raw', 'Substance_Raw') || (matchedStudent ? matchedStudent.Substance_Raw : 'ไม่สูบ ไม่ดื่ม'),
        Data_Note: 'นำเข้าจากระบบ Google Forms / Bulk Import'
      };

      const existingIdx = this.db.Students.findIndex(s => s.Student_ID === finalSid);
      if (existingIdx >= 0) {
        this.db.Students[existingIdx] = { ...this.db.Students[existingIdx], ...stuPayload };
        updatedCount++;
      } else {
        this.db.Students.push(stuPayload);
        addedCount++;
      }

      // อัปเดตตารางที่ 4 (Screening_Records)
      const incomeVal = getVal('รายได้โดยเฉลี่ยของครอบครัว', 'Family_Income_Range');
      const allowVal = getVal('นักเรียนได้เงินมากินวันละกี่บาท', 'Daily_Allowance');
      const scholVal = getVal('นักเรียนมีความต้องกาารทุนการศึกษาไหมในอนาคต', 'นักเรียนมีความต้องการทุนการศึกษาไหมในอนาคต', 'Scholarship_Need');
      const jobVal = getVal('อาชีพของผู้ปกครอง', 'Parent_Occupation');

      let sc = (this.db.Screening_Records || []).find(x => x.Student_ID === finalSid);
      const isLowInc = incomeVal.includes('ต่ำกว่า 10000');
      const isLowAlw = allowVal.includes('น้อยกว่า 100');

      if (sc) {
        if (jobVal) sc.Parent_Occupation = jobVal;
        if (incomeVal) sc.Family_Income_Range = incomeVal;
        if (allowVal) sc.Daily_Allowance = allowVal;
        if (scholVal) sc.Scholarship_Need = scholVal;
        if (isLowInc || isLowAlw) sc.Financial_Status = 'ขัดสน';
        sc.Substance_Raw = stuPayload.Substance_Raw;
      } else {
        this.db.Screening_Records.push({
          Screening_ID: `SCR-2569-${finalSid.slice(-4)}`,
          Academic_Term: '1/2569',
          Student_ID: finalSid,
          Family_Status: 'อยู่ร่วมกัน',
          Parent_Occupation: jobVal || '',
          Family_Income_Range: incomeVal || 'ไม่ระบุ',
          Daily_Allowance: allowVal || 'ไม่ระบุ',
          Scholarship_Need: scholVal || 'ไม่ระบุ',
          Financial_Status: (isLowInc || isLowAlw) ? 'ขัดสน' : 'เพียงพอ',
          Substance_Raw: stuPayload.Substance_Raw,
          Behavior_Tags: [],
          Followup_Status: 'ปกติ',
          Followup_History: [],
          Home_Visit_Status: 'ยังไม่เยี่ยมบ้าน',
          Home_Visit_Date: '',
          Home_Visit_Photo: '',
          Home_Visit_Summary: ''
        });
      }
    });

    const groupSummary = Array.from(touchedGroups).join(', ') || `${defaultLevelYear} กลุ่ม${defaultGroupNo}`;
    this.addAuditLog(
      'นำเข้าข้อมูลจาก Google Forms / Excel',
      `เพิ่มใหม่ ${addedCount} คน, อัปเดตข้อมูล ${updatedCount} คน, จับคู่รูปถ่าย ${photoMatchedCount} คน (${groupSummary})`
    );
    this.save();
    return {
      addedCount,
      updatedCount,
      photoMatchedCount,
      classId: Array.from(touchedGroups)[0] || `${defaultLevelYear} กลุ่ม${defaultGroupNo}`
    };
  }

  bulkUpsertStudents(recordsList, defaultLevelYear, defaultGroupNo, defaultMajor, levelMode = 'FORCE') {
    return this.importFromGoogleFormRows(recordsList, {
      levelMode,
      defaultLevelYear,
      defaultGroupNo,
      defaultMajor
    });
  }

  deleteStudent(studentId) {
    const stu = this.getStudentById(studentId);
    if (!stu) return;
    this.db.Students = this.db.Students.filter(s => s.Student_ID !== studentId);
    this.db.Discipline_Records = this.db.Discipline_Records.filter(d => d.Student_ID !== studentId);
    this.db.Screening_Records = this.db.Screening_Records.filter(sc => sc.Student_ID !== studentId);
    this.addAuditLog('ลบข้อมูลนักเรียน', `ลบรหัส ${studentId} (${stu.Full_Name})`);
    this.save();
  }

  addDisciplineRecord(record) {
    const newRecord = {
      Record_ID: record.Record_ID || `DISC-${Date.now()}`,
      Date_Time: record.Date_Time || new Date().toISOString(),
      Student_ID: record.Student_ID,
      Violation_Category: record.Violation_Category || 'มาสาย',
      Description: record.Description || '',
      Points_Deducted: -Math.abs(Number(record.Points_Deducted || 5)),
      Action_Taken: record.Action_Taken || 'ตักเตือนด้วยวาจา',
      Teacher_Reported: record.Teacher_Reported || 'ครูเวร/งานปกครอง'
    };
    this.db.Discipline_Records.unshift(newRecord);
    const stu = this.getStudentById(newRecord.Student_ID);
    this.addAuditLog(
      'บันทึกพฤติกรรม/ตัดคะแนน',
      `${stu ? stu.Full_Name : newRecord.Student_ID}: ${newRecord.Violation_Category} (${newRecord.Points_Deducted} คะแนน)`
    );
    this.save();
    return newRecord;
  }

  deleteDisciplineRecord(recordId) {
    const rec = this.db.Discipline_Records.find(d => d.Record_ID === recordId);
    this.db.Discipline_Records = this.db.Discipline_Records.filter(d => d.Record_ID !== recordId);
    if (rec) {
      this.addAuditLog('ลบบันทึกคะแนนความประพฤติ', `ลบรหัสบันทึก ${recordId} ของรหัส ${rec.Student_ID}`);
    }
    this.save();
  }

  upsertScreeningRecord(studentId, screeningData) {
    const idx = this.db.Screening_Records.findIndex(sc => sc.Student_ID === studentId);
    const stu = this.getStudentById(studentId);
    if (stu && screeningData.Substance_Raw !== undefined) {
      stu.Substance_Raw = screeningData.Substance_Raw;
    }

    if (screeningData.Home_Visit_Date || screeningData.Home_Visit_Photo) {
      screeningData.Home_Visit_Status = 'เยี่ยมบ้านแล้ว';
    }
    if (idx >= 0) {
      this.db.Screening_Records[idx] = {
        ...this.db.Screening_Records[idx],
        ...screeningData,
        Student_ID: studentId
      };
    } else {
      this.db.Screening_Records.push({
        Screening_ID: `SCR-2569-${Date.now().toString().slice(-4)}`,
        Academic_Term: '1/2569',
        Student_ID: studentId,
        Behavior_Tags: [],
        Followup_Status: 'ปกติ',
        Followup_History: [],
        ...screeningData
      });
    }
    this.addAuditLog(
      'อัปเดตผลคัดกรอง/เยี่ยมบ้าน',
      `${stu ? stu.Full_Name : studentId} -> ${screeningData.Overall_Risk_Level || '-'}`
    );
    this.save();
  }

  addAuditLog(action, details) {
    if (!this.db.Audit_Logs) this.db.Audit_Logs = [];
    this.db.Audit_Logs.unshift({
      Log_ID: `LOG-${Date.now()}`,
      Timestamp: new Date().toISOString(),
      Action: action,
      Details: details
    });
    if (this.db.Audit_Logs.length > 100) {
      this.db.Audit_Logs = this.db.Audit_Logs.slice(0, 100);
    }
  }

  importJSON(jsonObj) {
    if (!jsonObj.Class_Groups || !jsonObj.Students) {
      throw new Error('ไฟล์ JSON ไม่มีโครงสร้างตาราง Class_Groups และ Students ที่ถูกต้อง');
    }
    this.db = {
      metadata: jsonObj.metadata || { app_name: 'Student Machine Tool DB V4', updated_at: new Date().toISOString() },
      Class_Groups: jsonObj.Class_Groups,
      Students: jsonObj.Students,
      Discipline_Records: jsonObj.Discipline_Records || [],
      Screening_Records: jsonObj.Screening_Records || [],
      Audit_Logs: jsonObj.Audit_Logs || []
    };
    this.addAuditLog('นำเข้าฐานข้อมูล (Import JSON)', `นำเข้าข้อมูลนักเรียน ${this.db.Students.length} คน สำเร็จ`);
    this.save();
  }

  getPinCode() {
    return localStorage.getItem(PIN_CODE_KEY) || '2569';
  }

  setPinCode(newPin) {
    localStorage.setItem(PIN_CODE_KEY, String(newPin).trim());
  }

  isPinEnabled() {
    const val = localStorage.getItem(PIN_ENABLED_KEY);
    return val === null ? true : val === 'true';
  }

  setPinEnabled(enabled) {
    localStorage.setItem(PIN_ENABLED_KEY, enabled ? 'true' : 'false');
  }

  isAuthenticated() {
    if (!this.isPinEnabled()) return true;
    return sessionStorage.getItem(PIN_AUTH_KEY) === 'true';
  }

  setAuthenticated(auth) {
    sessionStorage.setItem(PIN_AUTH_KEY, auth ? 'true' : 'false');
  }

  isPinLocked() {
    return !this.isAuthenticated();
  }

  setPinLocked(locked) {
    this.setAuthenticated(!locked);
  }

  verifyPin(inputPin) {
    const entered = String(inputPin || '').trim();
    const correct = this.getPinCode();
    if (entered === correct) {
      this.setAuthenticated(true);
      return true;
    }
    return false;
  }

  getCloudUrl() {
    return localStorage.getItem(CLOUD_URL_KEY) || '';
  }

  setCloudUrl(url) {
    localStorage.setItem(CLOUD_URL_KEY, url.trim());
  }

  async syncToCloud() {
    const url = this.getCloudUrl();
    if (!url) throw new Error('กรุณาตั้งค่า URL ของ Google Apps Script Web App ก่อนซิงก์ข้อมูล');
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'SAVE_ALL', payload: this.db })
    });
    if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
    this.addAuditLog('ซิงก์ข้อมูลขึ้น Cloud', 'ส่งข้อมูลทั้ง 4 ตารางไปยัง Google Sheets สำเร็จ');
    this.save();
    return await res.json().catch(() => ({ status: 'ok' }));
  }

  async pullFromCloud() {
    const url = this.getCloudUrl();
    if (!url) throw new Error('กรุณาตั้งค่า URL ของ Google Apps Script Web App ก่อนดึงข้อมูล');
    const res = await fetch(`${url}?action=LOAD_ALL`);
    if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
    const data = await res.json();
    if (data && data.Students) {
      this.importJSON(data);
      return true;
    }
    throw new Error('ไม่พบข้อมูลโครงสร้าง 4 ตารางจาก Cloud');
  }
}

window.appDB = new RelationalDatabase();
