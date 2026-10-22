/**
 * ============================================================================
 * Relational Database Engine V3 (4 Core Tables + Bulk Import for Other Years)
 * ============================================================================
 * ตารางที่ 1: Class_Groups (PK: Class_ID เช่น "ปวช.1 กลุ่ม1", Group_Label: "กลุ่ม1")
 * ตารางที่ 2: Students (PK: Student_ID, FK: Class_ID)
 * ตารางที่ 3: Discipline_Records (PK: Record_ID, FK: Student_ID)
 * ตารางที่ 4: Screening_Records (PK: Screening_ID, FK: Student_ID)
 */

const STORAGE_KEY = 'STUDENT_MACHINE_TOOL_DB_V3';
const CLOUD_URL_KEY = 'STUDENT_MACHINE_TOOL_CLOUD_URL';

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
        console.warn('Fallback to initial DB V3:', e);
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
    d = d.replace(/อำเภอ|จังหวัดฉะเชิงเทรา|ฉะเชิงเทรา|ฉะเฉิงเทรา|ฮะเชิงเทรา/g, '').trim();
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

  /**
   * ตรวจสอบและสร้างกลุ่มเรียนในตาราง Class_Groups อัตโนมัติ เมื่อเพิ่มนักเรียนชั้นปีอื่น (เช่น ปวช.2, ปวช.3, ปวส.2)
   */
  ensureClassGroupExists(levelYear, groupNo, major = null) {
    const cleanLvlYear = String(levelYear || 'ปวช.1').trim();
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
      Note: 'สร้างอัตโนมัติจากการเพิ่มข้อมูลนักเรียน'
    };
    this.db.Class_Groups.push(newGroup);
    // เรียงลำดับกลุ่มเรียนให้สวยงาม (ปวช.1 -> ปวช.2 -> ปวช.3 -> ปวส.1 -> ปวส.2)
    this.db.Class_Groups.sort((a, b) => a.Class_ID.localeCompare(b.Class_ID, 'th'));
    return newGroup;
  }

  recomputeAllIssuesAndRisks() {
    if (!this.db || !this.db.Students) return;

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
          Home_Visit_Status: 'ยังไม่เยี่ยมบ้าน',
          Home_Visit_Date: '',
          Home_Visit_Photo: '',
          Home_Visit_Summary: ''
        };
        this.db.Screening_Records.push(sc);
      }

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

      if (!sc.Manual_Risk_Override) {
        if (
          subInfo.tags.includes('น้ำกระท่อม') ||
          subInfo.tags.includes('กัญชา') ||
          deducted >= 20 ||
          (subInfo.hasSubstanceRisk && (income.includes('ต่ำกว่า 10000') || isLowAlw))
        ) {
          sc.Overall_Risk_Level = 'กลุ่มมีปัญหา';
        } else if (reasons.length > 0) {
          sc.Overall_Risk_Level = 'กลุ่มเสี่ยง';
        } else {
          sc.Overall_Risk_Level = 'กลุ่มปกติ';
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
      dataIncomplete: 0
    };

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

      const nonPhotoIssues = (s.Data_Issues || []).filter(i => i !== 'ยังไม่มีรูปถ่ายนักเรียน');
      if (nonPhotoIssues.length > 0) counts.dataIncomplete++;
    });

    return counts;
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

    // หากระบุ Level_Year และ Group_No มา ให้สร้างกลุ่มเรียนในตาราง 1 อัตโนมัติถ้ายังไม่มี
    if (studentData.Level_Year && studentData.Group_No) {
      const cg = this.ensureClassGroupExists(studentData.Level_Year, studentData.Group_No, studentData.Major);
      studentData.Class_ID = cg.Class_ID;
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

    studentData.Photo_Status = (studentData.Photo_URL && studentData.Photo_URL.trim() !== '') ? 'มีรูปแล้ว' : 'ยังไม่มีรูป';

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
        Screening_ID: `SCR-2569-${Date.now().toString().slice(-4)}-${Math.floor(Math.random()*90+10)}`,
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
   * นำเข้ารายชื่อนักเรียนชั้นปีอื่นแบบยกกลุ่ม (Bulk Import)
   */
  bulkUpsertStudents(recordsList, defaultLevelYear, defaultGroupNo, defaultMajor) {
    const cg = this.ensureClassGroupExists(defaultLevelYear, defaultGroupNo, defaultMajor);
    let addedCount = 0;
    let updatedCount = 0;

    recordsList.forEach(item => {
      const sid = String(item.Student_ID || '').trim();
      const name = String(item.Full_Name || '').trim();
      if (!sid || !name) return;

      const existingIdx = this.db.Students.findIndex(s => s.Student_ID === sid);
      const stuLvlYear = item.Level_Year || cg.Level_Year;
      const stuGrpNo = item.Group_No || cg.Group_No;
      const targetCg = this.ensureClassGroupExists(stuLvlYear, stuGrpNo, item.Major || defaultMajor);

      const zoneDist = this.normalizeDistrictName(item.Zone_District || 'ไม่ระบุ');
      const stuPayload = {
        Student_ID: sid,
        Prefix: item.Prefix || 'นาย',
        Full_Name: name,
        Nickname: item.Nickname || '',
        Gender: item.Gender || 'ชาย',
        Class_ID: targetCg.Class_ID,
        Level_Year: targetCg.Level_Year,
        Group_Label: targetCg.Group_Label,
        Group_No: targetCg.Group_No,
        Status: 'ปกติ',
        Phone_Number: String(item.Phone_Number || '').replace(/\D/g, ''),
        Parent_Name: item.Parent_Name || '',
        Parent_Phone: String(item.Parent_Phone || '').replace(/\D/g, ''),
        Emergency_Phone: String(item.Emergency_Phone || '').replace(/\D/g, ''),
        Emergency_Contact_Note: item.Emergency_Contact_Note || '',
        Social_Contact: item.Social_Contact || '',
        House_No: item.House_No || '',
        Road: item.Road || '',
        Subdistrict: item.Subdistrict || '',
        Zone_District: zoneDist,
        Zipcode: item.Zipcode || '',
        Address: item.Address || (zoneDist !== 'ไม่ระบุ' ? `อ.${zoneDist}` : 'ยังไม่ได้กรอกที่อยู่'),
        Home_Location: DISTRICT_COORDS_MAP[zoneDist] || '',
        Photo_URL: item.Photo_URL || '',
        Photo_Status: item.Photo_URL ? 'มีรูปแล้ว' : 'ยังไม่มีรูป',
        Commute_Method: item.Commute_Method || '',
        Previous_School: item.Previous_School || '',
        Substance_Raw: item.Substance_Raw || 'ไม่สูบ ไม่ดื่ม',
        Data_Note: item.Data_Note || 'นำเข้าผ่านระบบ Bulk Import'
      };

      if (existingIdx >= 0) {
        this.db.Students[existingIdx] = { ...this.db.Students[existingIdx], ...stuPayload };
        updatedCount++;
      } else {
        this.db.Students.push(stuPayload);
        this.db.Screening_Records.push({
          Screening_ID: `SCR-2569-${sid.slice(-4)}`,
          Academic_Term: '1/2569',
          Student_ID: sid,
          Family_Status: 'อยู่ร่วมกัน',
          Parent_Occupation: item.Parent_Occupation || '',
          Family_Income_Range: item.Family_Income_Range || 'ไม่ระบุ',
          Daily_Allowance: item.Daily_Allowance || 'ไม่ระบุ',
          Scholarship_Need: item.Scholarship_Need || 'ไม่ระบุ',
          Financial_Status: 'เพียงพอ',
          Substance_Raw: stuPayload.Substance_Raw,
          Home_Visit_Status: 'ยังไม่เยี่ยมบ้าน',
          Home_Visit_Date: '',
          Home_Visit_Photo: '',
          Home_Visit_Summary: ''
        });
        addedCount++;
      }
    });

    this.addAuditLog(
      'นำเข้าข้อมูลนักเรียนยกกลุ่ม (Bulk Import)',
      `ชั้น ${cg.Class_ID}: เพิ่มใหม่ ${addedCount} คน, อัปเดต ${updatedCount} คน`
    );
    this.save();
    return { addedCount, updatedCount, classId: cg.Class_ID };
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
      metadata: jsonObj.metadata || { app_name: 'Student Machine Tool DB V3', updated_at: new Date().toISOString() },
      Class_Groups: jsonObj.Class_Groups,
      Students: jsonObj.Students,
      Discipline_Records: jsonObj.Discipline_Records || [],
      Screening_Records: jsonObj.Screening_Records || [],
      Audit_Logs: jsonObj.Audit_Logs || []
    };
    this.addAuditLog('นำเข้าฐานข้อมูล (Import JSON)', `นำเข้าข้อมูลนักเรียน ${this.db.Students.length} คน สำเร็จ`);
    this.save();
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
