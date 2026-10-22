/**
 * ============================================================================
 * Export & Backup Utility (JSON, CSV, Excel .xlsx, Google Apps Script Code)
 * ============================================================================
 */

window.ExportManager = {
  /**
   * ส่งออกฐานข้อมูลทั้งหมดเป็นไฟล์ .json (4 ตารางหลัก + ประวัติการแก้ไข)
   */
  exportFullJSON() {
    const dataStr = JSON.stringify(window.appDB.db, null, 2);
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
   * ส่งออกตารางสรุปข้อมูลนักเรียน 360 องศาเป็นไฟล์ CSV (เปิดใน Excel ภาษาไทยไม่เพี้ยนด้วย UTF-8 BOM)
   */
  exportStudentsCSV() {
    const list = window.appDB.getAllStudents360();
    const headers = [
      'Student_ID',
      'Full_Name',
      'Nickname',
      'Class_ID',
      'Level',
      'Year',
      'Major',
      'Group_No',
      'Advisor_Name',
      'Status',
      'Behavior_Score',
      'Phone_Number',
      'Parent_Name',
      'Parent_Phone',
      'Emergency_Phone',
      'Emergency_Note',
      'Address',
      'Zone_District',
      'Home_Location',
      'Overall_Risk_Level',
      'Financial_Status',
      'Substance_History',
      'Scholarship_Need',
      'Home_Visit_Status',
      'Home_Visit_Date',
      'Photo_Status',
      'Photo_URL',
      'Data_Issues'
    ];

    const escapeCSV = (val) => {
      const s = String(val ?? '').replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = list.map(stu => [
      stu.Student_ID,
      stu.Full_Name,
      stu.Nickname,
      stu.Class_ID,
      stu.ClassGroup.Level,
      stu.ClassGroup.Year,
      stu.ClassGroup.Major,
      stu.ClassGroup.Group_No,
      stu.ClassGroup.Advisor_Name,
      stu.Status,
      stu.BehaviorScore,
      stu.Phone_Number,
      stu.Parent_Name,
      stu.Parent_Phone,
      stu.Emergency_Phone,
      stu.Emergency_Contact_Note,
      stu.Address,
      stu.Zone_District,
      stu.Home_Location,
      stu.Screening.Overall_Risk_Level,
      stu.Screening.Financial_Status,
      stu.Screening.Substance_History,
      stu.Screening.Scholarship_Need,
      stu.Screening.Home_Visit_Status,
      stu.Screening.Home_Visit_Date,
      stu.Photo_Status,
      stu.Photo_URL,
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

  /**
   * ส่งออกไฟล์ Excel (.xlsx) แยก 4 แผ่นงาน (Sheets) ตามโครงสร้าง Relational Database
   */
  exportExcel4Sheets() {
    if (typeof XLSX === 'undefined') {
      alert('กำลังโหลดไลบรารีสร้างไฟล์ Excel กรุณาลองอีกครั้ง หรือใช้ปุ่มส่งออก CSV แทน');
      return;
    }
    const wb = XLSX.utils.book_new();

    // Sheet 1: Class_Groups
    const ws1 = XLSX.utils.json_to_sheet(window.appDB.db.Class_Groups);
    XLSX.utils.book_append_sheet(wb, ws1, '1_Class_Groups');

    // Sheet 2: Students
    const cleanStudents = window.appDB.db.Students.map(s => ({
      Student_ID: s.Student_ID,
      Full_Name: s.Full_Name,
      Nickname: s.Nickname,
      Class_ID: s.Class_ID,
      Status: s.Status,
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

    // Sheet 3: Discipline_Records
    const discData = window.appDB.db.Discipline_Records.length > 0
      ? window.appDB.db.Discipline_Records
      : [{ Record_ID: '-', Date_Time: '-', Student_ID: '-', Violation_Category: '-', Description: 'ยังไม่มีประวัติการตัดคะแนน', Points_Deducted: 0, Action_Taken: '-', Teacher_Reported: '-' }];
    const ws3 = XLSX.utils.json_to_sheet(discData);
    XLSX.utils.book_append_sheet(wb, ws3, '3_Discipline_Records');

    // Sheet 4: Screening_Records
    const scrData = window.appDB.db.Screening_Records.map(sc => ({
      Screening_ID: sc.Screening_ID,
      Academic_Term: sc.Academic_Term,
      Student_ID: sc.Student_ID,
      Family_Status: sc.Family_Status,
      Financial_Status: sc.Financial_Status,
      Overall_Risk_Level: sc.Overall_Risk_Level,
      Substance_History: sc.Substance_History,
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
  },

  /**
   * โค้ด Google Apps Script สำเร็จรูปเผื่อผู้ใช้ต้องการนำไปวางใน Google Sheets เพื่อซิงก์ออนไลน์
   */
  getGoogleAppsScriptTemplate() {
    return `// นำโค้ดนี้ไปวางใน Extensions > Apps Script ของ Google Sheets แล้วกด Deploy > New deployment (Web app: Anyone)
function doGet(e) {
  const prop = PropertiesService.getScriptProperties().getProperty('DB_JSON');
  const out = prop ? prop : JSON.stringify({ error: 'Empty DB' });
  return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  if (body.action === 'SAVE_ALL' && body.payload) {
    PropertiesService.getScriptProperties().setProperty('DB_JSON', JSON.stringify(body.payload));
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok', updated: new Date() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(JSON.stringify({ status: 'invalid' })).setMimeType(ContentService.MimeType.JSON);
}`;
  }
};
