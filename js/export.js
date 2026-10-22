/**
 * ============================================================================
 * Export & Backup Utility V3 (Space-Optimized GitHub Sync + Excel/CSV/JSON)
 * ============================================================================
 */

window.ExportManager = {
  /**
   * ส่งออกไฟล์ initial_db.js แบบบีบอัดขนาดเล็กที่สุด (Minified)
   * สำหรับนำไปวางทับในโฟลเดอร์ data/initial_db.js แล้วอัปขึ้น GitHub เพื่อเปิดใช้ใน Notebook เครื่องอื่น
   */
  exportMinifiedInitialDbJs() {
    const compactJson = JSON.stringify(window.appDB.db);
    const jsContent = `window.INITIAL_RELATIONAL_DB=${compactJson};\n`;
    const blob = new Blob([jsContent], { type: 'application/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'initial_db.js';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  exportFullJSON() {
    const dataStr = JSON.stringify(window.appDB.db);
    const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const datePart = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `ฐานข้อมูลนักเรียน_4ตาราง_${datePart}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * ดาวน์โหลดไฟล์แม่แบบ (Template CSV) สำหรับกรอกข้อมูลนักเรียนชั้นปีอื่น (เช่น ปวช.2, ปวช.3, ปวส.2)
   */
  downloadImportTemplateCSV() {
    const headers = [
      'รหัสประจำตัวนักเรียน',
      'ชื่อ-นามสกุล',
      'ชื่อเล่น',
      'ชั้นปี',
      'กลุ่มเรียน',
      'สาขาวิชา',
      'เบอร์โทรศัพท์มือถือ_นักเรียน',
      'ชื่อ-นามสกุล_ผู้ปกครอง',
      'เบอร์โทรศัพท์มือถือ_ผู้ปกครอง',
      'ตำบล',
      'อำเภอ',
      'ดิ่มหรือสูบไหม',
      'รายได้โดยเฉลี่ยของครอบครัว',
      'นักเรียนได้เงินมากินวันละกี่บาท',
      'นักเรียนมีความต้องการทุนการศึกษาไหมในอนาคต',
      'ลิงก์แสดงรูปภาพ_Direct'
    ];
    const sampleRows = [
      ['68201020001', 'สมชาย ใจดี', 'ชาย', 'ปวช.2', '1', 'ช่างกลโรงงาน', '0812345678', 'สมศรี ใจดี', '0898765432', 'หน้าเมือง', 'เมืองฉะเชิงเทรา', 'ไม่สูบ ไม่ดื่ม', '10000-15000 บาท', '100 บาท', 'ไม่ต้องการ', ''],
      ['67201020001', 'วีรภัทร รักเรียน', 'พีท', 'ปวช.3', '1', 'ช่างกลโรงงาน', '0823456789', 'วิชัย รักเรียน', '0811112222', 'บางคล้า', 'บางคล้า', 'บุหรี่', 'ต่ำกว่า 10000 บาท', '100 บาท', 'ต้องการ', '']
    ];
    const csvContent = '\uFEFF' + [headers.join(','), ...sampleRows.map(r => r.map(v => `"${v}"`).join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'แม่แบบนำเข้าข้อมูลนักเรียนชั้นปีอื่น_Template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  exportStudentsCSV() {
    const list = window.appDB.getAllStudents360();
    const headers = [
      'รหัสนักศึกษา',
      'ชื่อ-นามสกุล',
      'ชื่อเล่น',
      'ระดับชั้น',
      'กลุ่มเรียน',
      'สาขาวิชา',
      'ครูที่ปรึกษา',
      'สถานภาพ',
      'คะแนนความประพฤติ',
      'ระดับความเสี่ยงรวม',
      'สาเหตุความเสี่ยง/ปัญหา',
      'ข้อมูลบุหรี่/สารเสพติด (ตามที่แจ้งในแบบบันทึก)',
      'ประเภทบุหรี่/สารเสพติดที่พบ',
      'ฐานะเศรษฐกิจ',
      'รายได้ครอบครัว',
      'เงินมาเรียนต่อวัน',
      'ความต้องการทุนการศึกษา',
      'เบอร์โทรนักเรียน',
      'ชื่อผู้ปกครอง',
      'เบอร์โทรผู้ปกครอง',
      'เบอร์ติดต่อฉุกเฉิน',
      'ที่อยู่',
      'โซนอำเภอ',
      'พิกัด_GPS',
      'สถานะเยี่ยมบ้าน',
      'วันที่เยี่ยมบ้าน',
      'สถานะรูปถ่าย',
      'รายการข้อมูลไม่สมบูรณ์'
    ];

    const escapeCSV = (val) => {
      const s = String(val ?? '').replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = list.map(stu => [
      stu.Student_ID,
      stu.Full_Name,
      stu.Nickname,
      stu.ClassGroup.Level_Year || `${stu.ClassGroup.Level}${stu.ClassGroup.Year}`,
      stu.ClassGroup.Group_Label || `กลุ่ม${stu.ClassGroup.Group_No}`,
      stu.ClassGroup.Major,
      stu.ClassGroup.Advisor_Name,
      stu.Status,
      stu.BehaviorScore,
      stu.Screening.Overall_Risk_Level,
      stu.Screening.Risk_Factors_Note || (stu.Screening.Risk_Reasons || []).join(', '),
      stu.Substance_Raw,
      stu.Substance_Clean,
      stu.Screening.Financial_Status,
      stu.Screening.Family_Income_Range,
      stu.Screening.Daily_Allowance,
      stu.Screening.Scholarship_Need,
      stu.Phone_Number,
      stu.Parent_Name,
      stu.Parent_Phone,
      `${stu.Emergency_Phone || ''} ${stu.Emergency_Contact_Note ? '(' + stu.Emergency_Contact_Note + ')' : ''}`.trim(),
      stu.Address,
      stu.Zone_District,
      stu.Home_Location,
      stu.Screening.Home_Visit_Status,
      stu.Screening.Home_Visit_Date,
      stu.Photo_Status,
      (stu.Data_Issues || []).join('; ')
    ].map(escapeCSV).join(','));

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const datePart = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `รายงานข้อมูลนักเรียน_360องศา_${datePart}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  exportExcel4Sheets() {
    if (typeof XLSX === 'undefined') {
      alert('กำลังโหลดไลบรารีสร้างไฟล์ Excel กรุณาลองอีกครั้ง หรือใช้ปุ่มส่งออก CSV แทน');
      return;
    }
    const wb = XLSX.utils.book_new();

    const ws1 = XLSX.utils.json_to_sheet(window.appDB.db.Class_Groups);
    XLSX.utils.book_append_sheet(wb, ws1, '1_Class_Groups');

    const cleanStudents = window.appDB.db.Students.map(s => ({
      Student_ID: s.Student_ID,
      Full_Name: s.Full_Name,
      Nickname: s.Nickname,
      Level_Year: s.Level_Year,
      Group_Label: s.Group_Label,
      Class_ID: s.Class_ID,
      Status: s.Status,
      Substance_Reported_Raw: s.Substance_Raw,
      Substance_Summary: s.Substance_Clean,
      Phone_Number: s.Phone_Number,
      Parent_Name: s.Parent_Name,
      Parent_Phone: s.Parent_Phone,
      Emergency_Phone: s.Emergency_Phone,
      Emergency_Contact_Note: s.Emergency_Contact_Note,
      Address: s.Address,
      Zone_District: s.Zone_District,
      Home_Location: s.Home_Location,
      Photo_Status: s.Photo_Status,
      Photo_URL: s.Photo_URL,
      Commute_Method: s.Commute_Method,
      Previous_School: s.Previous_School,
      Data_Note: s.Data_Note,
      Data_Issues: (s.Data_Issues || []).join(', ')
    }));
    const ws2 = XLSX.utils.json_to_sheet(cleanStudents);
    XLSX.utils.book_append_sheet(wb, ws2, '2_Students');

    const discData = window.appDB.db.Discipline_Records.length > 0
      ? window.appDB.db.Discipline_Records
      : [{ Record_ID: '-', Date_Time: '-', Student_ID: '-', Violation_Category: '-', Description: 'ยังไม่มีประวัติการตัดคะแนน', Points_Deducted: 0, Action_Taken: '-', Teacher_Reported: '-' }];
    const ws3 = XLSX.utils.json_to_sheet(discData);
    XLSX.utils.book_append_sheet(wb, ws3, '3_Discipline_Records');

    const scrData = window.appDB.db.Screening_Records.map(sc => ({
      Screening_ID: sc.Screening_ID,
      Academic_Term: sc.Academic_Term,
      Student_ID: sc.Student_ID,
      Overall_Risk_Level: sc.Overall_Risk_Level,
      Risk_Reasons_Detail: sc.Risk_Factors_Note || (sc.Risk_Reasons || []).join(', '),
      Substance_Reported_Raw: sc.Substance_Raw,
      Substance_Category: sc.Substance_History,
      Family_Status: sc.Family_Status,
      Financial_Status: sc.Financial_Status,
      Parent_Occupation: sc.Parent_Occupation,
      Family_Income_Range: sc.Family_Income_Range,
      Daily_Allowance: sc.Daily_Allowance,
      Scholarship_Need: sc.Scholarship_Need,
      Home_Visit_Status: sc.Home_Visit_Status,
      Home_Visit_Date: sc.Home_Visit_Date,
      Home_Visit_Summary: sc.Home_Visit_Summary
    }));
    const ws4 = XLSX.utils.json_to_sheet(scrData);
    XLSX.utils.book_append_sheet(wb, ws4, '4_Screening_Records');

    const datePart = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `ฐานข้อมูลนักเรียน_ช่างกลและเทคนิค_${datePart}.xlsx`);
  }
};
