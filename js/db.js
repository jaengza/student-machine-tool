/**
 * ============================================================================
 * Relational Database Engine (4 Core Tables + Audit Log + Cloud Sync Support)
 * ============================================================================
 * ตารางที่ 1: Class_Groups (PK: Class_ID)
 * ตารางที่ 2: Students (PK: Student_ID, FK: Class_ID)
 * ตารางที่ 3: Discipline_Records (PK: Record_ID, FK: Student_ID)
 * ตารางที่ 4: Screening_Records (PK: Screening_ID, FK: Student_ID)
 */

const STORAGE_KEY = 'STUDENT_MACHINE_TOOL_DB_V1';
const CLOUD_URL_KEY = 'STUDENT_MACHINE_TOOL_CLOUD_URL';

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
        // Ensure all 4 tables exist
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
    this.recomputeAllIssues();
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
    this.recomputeAllIssues();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db));
    window.dispatchEvent(new CustomEvent('db-updated'));
  }

  // --------------------------------------------------------------------------
  // ระบบตรวจสอบความถูกต้องของข้อมูลอัตโนมัติ (Data Accuracy & Validation)
  // --------------------------------------------------------------------------
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

    if (!stu.Address || stu.Address === 'ยังไม่ได้กรอกที่อยู่' || (!stu.House_No && !stu.Subdistrict)) {
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

  recomputeAllIssues() {
    if (!this.db || !this.db.Students) return;
    this.db.Students.forEach(stu => {
      stu.Data_Issues = this.computeStudentIssues(stu);
    });
  }

  // --------------------------------------------------------------------------
  // Relational Queries & 360-Degree Student Join
  // --------------------------------------------------------------------------
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

  /**
   * ดึงข้อมูลโปรไฟล์นักเรียน 360 องศา โดยเชื่อม (JOIN) ทั้ง 4 ตารางด้วย Student_ID
   */
  getStudent360(studentId) {
    const student = this.getStudentById(studentId);
    if (!student) return null;

    const classGroup = this.getClassGroupById(student.Class_ID) || {
      Class_ID: student.Class_ID,
      Level: '-',
      Year: '-',
      Major: 'ไม่ระบุ',
      Group_No: '-',
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
      Home_Visit_Status: 'ยังไม่เยี่ยมบ้าน',
      Home_Visit_Date: '',
      Home_Visit_Photo: '',
      Substance_History: 'ไม่ระบุ',
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

  // --------------------------------------------------------------------------
  // CRUD ตารางที่ 1: Class_Groups
  // --------------------------------------------------------------------------
  upsertClassGroup(groupObj) {
    const idx = this.db.Class_Groups.findIndex(c => c.Class_ID === groupObj.Class_ID);
    if (idx >= 0) {
      this.db.Class_Groups[idx] = { ...this.db.Class_Groups[idx], ...groupObj };
      this.addAuditLog('แก้ไขกลุ่มเรียน', `อัปเดตกลุ่ม ${groupObj.Class_ID} (ครูที่ปรึกษา: ${groupObj.Advisor_Name})`);
    } else {
      this.db.Class_Groups.push(groupObj);
      this.addAuditLog('เพิ่มกลุ่มเรียนใหม่', `สร้างกลุ่ม ${groupObj.Class_ID} (${groupObj.Level}${groupObj.Year} ${groupObj.Major} กลุ่ม ${groupObj.Group_No})`);
    }
    this.save();
  }

  deleteClassGroup(classId) {
    const count = this.db.Students.filter(s => s.Class_ID === classId).length;
    if (count > 0) {
      throw new Error(`ไม่สามารถลบกลุ่ม ${classId} ได้ เนื่องจากมีนักเรียนสังกัดอยู่ ${count} คน`);
    }
    this.db.Class_Groups = this.db.Class_Groups.filter(c => c.Class_ID !== classId);
    this.addAuditLog('ลบกลุ่มเรียน', `ลบกลุ่มเรียนรหัส ${classId}`);
    this.save();
  }

  // --------------------------------------------------------------------------
  // CRUD ตารางที่ 2: Students
  // --------------------------------------------------------------------------
  upsertStudent(studentData, oldStudentId = null) {
    const targetId = oldStudentId || studentData.Student_ID;
    const idx = this.db.Students.findIndex(s => s.Student_ID === targetId);

    // ประกอบที่อยู่รวมอัตโนมัติหากมีการแก้ไขบ้านเลขที่/ตำบล/อำเภอ
    const parts = [];
    if (studentData.House_No && studentData.House_No !== '-') parts.push(`บ้านเลขที่ ${studentData.House_No}`);
    if (studentData.Road && studentData.Road !== '-') parts.push(`ถ.${studentData.Road}`);
    if (studentData.Subdistrict && studentData.Subdistrict !== '-') parts.push(`ต.${studentData.Subdistrict}`);
    if (studentData.Zone_District && studentData.Zone_District !== 'ไม่ระบุ') parts.push(`อ.${studentData.Zone_District}`);
    if (studentData.Zipcode && studentData.Zipcode !== '-') parts.push(studentData.Zipcode);
    if (parts.length > 0) {
      studentData.Address = parts.join(' ');
    }

    studentData.Photo_Status = (studentData.Photo_URL && studentData.Photo_URL.trim() !== '') ? 'มีรูปแล้ว' : 'ยังไม่มีรูป';
    studentData.Updated_At = new Date().toISOString();

    if (idx >= 0) {
      // กรณีเปลี่ยนรหัสนักศึกษา ให้เปลี่ยน Foreign Key ในตาราง 3 และ 4 ตามด้วย (Cascade Update)
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
      // สร้างเรคคอร์ดคัดกรองเริ่มต้นให้ทันที
      this.db.Screening_Records.push({
        Screening_ID: `SCR-2569-${Date.now().toString().slice(-4)}`,
        Academic_Term: '1/2569',
        Student_ID: studentData.Student_ID,
        Family_Status: 'อยู่ร่วมกัน',
        Parent_Occupation: '',
        Family_Income_Range: '10000-15000 บาท',
        Daily_Allowance: '100 บาท',
        Scholarship_Need: 'ยังไม่ตัดสินใจ',
        Financial_Status: 'เพียงพอ',
        Substance_History: 'ไม่ดื่ม/ไม่สูบ',
        Risk_Factors_Note: 'ปกติ',
        Overall_Risk_Level: 'กลุ่มปกติ',
        Home_Visit_Status: 'ยังไม่เยี่ยมบ้าน',
        Home_Visit_Date: '',
        Home_Visit_Photo: '',
        Home_Visit_Summary: '',
        Updated_At: new Date().toISOString()
      });
      this.addAuditLog('เพิ่มนักเรียนใหม่', `เพิ่มรหัส ${studentData.Student_ID} (${studentData.Full_Name}) กลุ่ม ${studentData.Class_ID}`);
    }
    this.save();
  }

  deleteStudent(studentId) {
    const stu = this.getStudentById(studentId);
    if (!stu) return;
    this.db.Students = this.db.Students.filter(s => s.Student_ID !== studentId);
    this.db.Discipline_Records = this.db.Discipline_Records.filter(d => d.Student_ID !== studentId);
    this.db.Screening_Records = this.db.Screening_Records.filter(sc => sc.Student_ID !== studentId);
    this.addAuditLog('ลบข้อมูลนักเรียน', `ลบรหัส ${studentId} (${stu.Full_Name}) และประวัติที่เกี่ยวข้อง`);
    this.save();
  }

  // --------------------------------------------------------------------------
  // CRUD ตารางที่ 3: Discipline_Records
  // --------------------------------------------------------------------------
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
      `${stu ? stu.Full_Name : newRecord.Student_ID}: ${newRecord.Violation_Category} (${newRecord.Points_Deducted} คะแนน) - ${newRecord.Action_Taken}`
    );
    this.save();
    return newRecord;
  }

  deleteDisciplineRecord(recordId) {
    const rec = this.db.Discipline_Records.find(d => d.Record_ID === recordId);
    this.db.Discipline_Records = this.db.Discipline_Records.filter(d => d.Record_ID !== recordId);
    if (rec) {
      this.addAuditLog('ลบบันทึกคะแนนความประพฤติ', `ลบรหัสบันทึก ${recordId} ของรหัสนักศึกษา ${rec.Student_ID}`);
    }
    this.save();
  }

  // --------------------------------------------------------------------------
  // CRUD ตารางที่ 4: Screening_Records (SDQ & เยี่ยมบ้าน)
  // --------------------------------------------------------------------------
  upsertScreeningRecord(studentId, screeningData) {
    const idx = this.db.Screening_Records.findIndex(sc => sc.Student_ID === studentId);
    screeningData.Updated_At = new Date().toISOString();
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
    const stu = this.getStudentById(studentId);
    this.addAuditLog(
      'อัปเดตผลคัดกรอง/เยี่ยมบ้าน',
      `${stu ? stu.Full_Name : studentId} -> ความเสี่ยง: ${screeningData.Overall_Risk_Level || '-'}, สถานะเยี่ยมบ้าน: ${screeningData.Home_Visit_Status || '-'}`
    );
    this.save();
  }

  // --------------------------------------------------------------------------
  // Audit Log & Import / Export / Cloud Sync
  // --------------------------------------------------------------------------
  addAuditLog(action, details) {
    if (!this.db.Audit_Logs) this.db.Audit_Logs = [];
    this.db.Audit_Logs.unshift({
      Log_ID: `LOG-${Date.now()}`,
      Timestamp: new Date().toISOString(),
      Action: action,
      Details: details
    });
    if (this.db.Audit_Logs.length > 200) {
      this.db.Audit_Logs = this.db.Audit_Logs.slice(0, 200);
    }
  }

  importJSON(jsonObj) {
    if (!jsonObj.Class_Groups || !jsonObj.Students) {
      throw new Error('ไฟล์ JSON ไม่มีโครงสร้างตาราง Class_Groups และ Students ที่ถูกต้อง');
    }
    this.db = {
      metadata: jsonObj.metadata || { app_name: 'Student Machine Tool DB', updated_at: new Date().toISOString() },
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
