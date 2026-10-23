/**
 * ============================================================================
 * Export, Backup & One-Page A4 Print Utility V4
 * - Space-Optimized GitHub Sync (initial_db.js)
 * - Google Form Compatible CSV Template
 * - 4-Sheet Excel (.xlsx) & 360° CSV Export (including Behavior & Follow-up)
 * - Official 1-Page A4 Student Profile & Behavior Report Print
 * ============================================================================
 */

window.ExportManager = {
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
   * ดาวน์โหลดไฟล์แม่แบบ (Template CSV) ที่ตรงกับหัวคอลัมน์ Google Form ของแผนก 100%
   */
  downloadImportTemplateCSV() {
    const headers = [
      'รหัสประจำตัวนักเรียนนักศึกษา',
      'ระดับชั้น',
      'ชั้นปี',
      'กลุ่มเรียน',
      'สาขาวิชา',
      'เพศ',
      'ชื่อ-นามสกุล',
      'ชื่อเล่น',
      'นักเรียนเดินทางมาวิทยาลัยอย่างไร',
      'เบอร์โทรศัพท์มือถือ ของนักเรียน',
      'ข้อมูลการติดต่ออื่นๆ IG หรือ Facebook',
      'ดิ่มหรือสูบไหม',
      'ชื่อ-นามสกุล ผู้ปกครอง',
      'เบอร์โทรศัพท์มือถือ ของผู้ปกครอง',
      'เบอร์โทรศัพท์มือถือ ของผู้ปกครอง (กรณีฉุกเฉิน)',
      'สถานศึกษาเดิมที่นักเรียนจบมา',
      'บ้านเลขที่',
      'ถนน',
      'ตำบล',
      'อำเภอ',
      'รหัสไปรษณีย์',
      'นักเรียนมีความต้องการทุนการศึกษาไหมในอนาคต',
      'อาชีพของผู้ปกครอง',
      'รายได้โดยเฉลี่ยของครอบครัว',
      'นักเรียนได้เงินมากินวันละกี่บาท',
      'ลิงก์แสดงรูปภาพ_Direct'
    ];
    const sampleRows = [
      ['68201020001', 'ปวช.', 'ปวช.2', '1', 'ช่างกลโรงงาน', 'ชาย', 'นาย สมชาย ใจดี', 'ชาย', 'รถมอเตอร์ไซค์ส่วนตัว', '0812345678', 'FB: Somchai', 'ไม่สูบ ไม่ดื่ม', 'นาง สมศรี ใจดี (แม่)', '0898765432', '-', 'โรงเรียนเบญจมราชรังสฤษฎิ์', '99/1', '-', 'หน้าเมือง', 'เมืองฉะเชิงเทรา', '24000', 'ไม่ต้องการ', 'ทำงานโรงงาน', '10000-15000 บาท', '100 บาท', ''],
      ['67201020001', 'ปวช.', 'ปวช.3', '1', 'ช่างกลโรงงาน', 'ชาย', 'นาย วีรภัทร รักเรียน', 'พีท', 'รถโดยสารสาธารณะ', '0823456789', 'IG: peet_67', 'บุหรี่', 'นาย วิชัย รักเรียน (พ่อ)', '0811112222', '-', 'โรงเรียนบางคล้าพิทยาคม', '12/4', '-', 'ปากน้ำ', 'บางคล้า', '24110', 'ต้องการ', 'รับจ้างทั่วไป', 'ต่ำกว่า 10000 บาท', '100 บาท', ''],
      ['68301110001', 'ปวส.', 'ปวส.2', '1', 'เทคนิคอุตสาหกรรม', 'ชาย', 'นาย ธนกร ช่างกล', 'กร', 'รถมอเตอร์ไซค์ส่วนตัว', '0834567890', '-', 'ไม่เคย', 'นาง วันดี ช่างกล', '0899998888', '-', 'วิทยาลัยเทคนิคฉะเชิงเทรา', '55', '-', 'แปลงยาว', 'แปลงยาว', '24190', 'ยังไม่ตัดสินใจ', 'ค้าขาย', '15000-20000 บาท', '150 บาท', '']
    ];
    const csvContent = '\uFEFF' + [headers.join(','), ...sampleRows.map(r => r.map(v => `"${v}"`).join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'แม่แบบ_Google_Form_นักเรียนทุกชั้นปี_Template.csv';
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
      'สถานะการติดตามดูแล (Follow-up)',
      'พฤติกรรมที่ตรวจพบ (Behavior Screening)',
      'สาเหตุความเสี่ยง/ปัญหาทั้งหมด',
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
      stu.Screening.Followup_Status || 'ปกติ',
      (stu.Screening.Behavior_Tags || []).join(', ') || 'ปกติ',
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
    a.download = `รายงานข้อมูลและพฤติกรรมนักเรียน_360องศา_${datePart}.csv`;
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
      Followup_Status: sc.Followup_Status || 'ปกติ',
      Behavior_Tags: (sc.Behavior_Tags || []).join(', '),
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
      Home_Visit_Summary: sc.Home_Visit_Summary,
      Followup_Logs_Count: (sc.Followup_History || []).length
    }));
    const ws4 = XLSX.utils.json_to_sheet(scrData);
    XLSX.utils.book_append_sheet(wb, ws4, '4_Screening_And_Behavior');

    const datePart = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `ฐานข้อมูลนักเรียน_ช่างกลและเทคนิค_${datePart}.xlsx`);
  },

  /**
   * สั่งพิมพ์ใบสรุปประวัติและผลคัดกรองพฤติกรรมนักเรียนรายบุคคล 1 หน้า A4
   */
  printOnePageStudentReport(studentId) {
    const stu = window.appDB.getStudent360(studentId);
    if (!stu) return;
    const sc = stu.Screening;
    const printEl = document.getElementById('printReportArea');
    if (!printEl) return;

    const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const todayStr = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
    const bTags = (sc.Behavior_Tags || []).length > 0 ? sc.Behavior_Tags.join(', ') : 'ปกติ (ไม่พบพฤติกรรมเสี่ยง)';
    const rReasons = (sc.Risk_Reasons || []).length > 0 ? sc.Risk_Reasons.join(', ') : 'ปกติ (ไม่พบปัจจัยเสี่ยง)';
    const followHistory = sc.Followup_History || [];

    printEl.innerHTML = `
      <div style="border: 2px solid #0f172a; padding: 18px; border-radius: 12px; font-family: 'Sarabun', sans-serif; color: #0f172a;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1e3a8a; padding-bottom: 12px; margin-bottom: 14px;">
          <div>
            <h1 style="font-family: 'Prompt', sans-serif; font-size: 16pt; font-weight: bold; margin: 0; color: #1e3a8a;">
              แบบรายงานประวัติและการคัดกรองพฤติกรรมนักเรียนรายบุคคล (360°)
            </h1>
            <p style="margin: 4px 0 0 0; font-size: 11pt; color: #334155;">
              แผนกวิชาช่างกลโรงงานและเทคนิคอุตสาหกรรม | ปีการศึกษา 2569 | วันที่พิมพ์: ${esc(todayStr)}
            </p>
          </div>
          <div style="text-align: right; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 8px; background: #f8fafc;">
            <div style="font-size: 9pt; color: #64748b;">ระดับการคัดกรองรวม</div>
            <div style="font-family: 'Prompt', sans-serif; font-size: 12pt; font-weight: bold; color: ${sc.Overall_Risk_Level === 'กลุ่มมีปัญหา' ? '#dc2626' : sc.Overall_Risk_Level === 'กลุ่มเสี่ยง' ? '#d97706' : '#059669'};">
              ${esc(sc.Overall_Risk_Level)}
            </div>
          </div>
        </div>

        <!-- Section 1: ข้อมูลประจำตัว + รูปถ่าย -->
        <div style="display: flex; gap: 16px; margin-bottom: 14px;">
          <div style="width: 110px; height: 135px; border: 1px solid #94a3b8; border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #f1f5f9; flex-shrink: 0;">
            ${stu.Photo_URL ? `<img src="${esc(stu.Photo_URL)}" style="width: 100%; height: 100%; object-fit: cover;" />` : `<span style="font-size: 10pt; color: #64748b;">ติดรูปถ่าย</span>`}
          </div>
          <div style="flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 6px 14px; font-size: 10.5pt;">
            <div><b>รหัสนักศึกษา:</b> ${esc(stu.Student_ID)}</div>
            <div><b>ระดับชั้น / กลุ่ม:</b> ${esc(stu.ClassGroup.Level_Year)} ${esc(stu.ClassGroup.Group_Label)}</div>
            <div><b>ชื่อ-นามสกุล:</b> ${esc(stu.Prefix || '')}${esc(stu.Full_Name)} ${stu.Nickname ? `(${esc(stu.Nickname)})` : ''}</div>
            <div><b>สาขาวิชา:</b> ${esc(stu.ClassGroup.Major)}</div>
            <div><b>เบอร์โทรนักเรียน:</b> ${esc(stu.Phone_Number || '-')}</div>
            <div><b>ครูที่ปรึกษา:</b> ${esc(stu.ClassGroup.Advisor_Name)}</div>
            <div><b>ชื่อผู้ปกครอง:</b> ${esc(stu.Parent_Name || '-')}</div>
            <div><b>เบอร์โทรผู้ปกครอง:</b> ${esc(stu.Parent_Phone || '-')}</div>
            <div style="grid-column: span 2;"><b>ที่อยู่ปัจจุบัน:</b> ${esc(stu.Address)} (โซน อ.${esc(stu.Zone_District)} | พิกัด: ${esc(stu.Home_Location || '-')})</div>
          </div>
        </div>

        <!-- Section 2: ผลการคัดกรอง 5 มิติ -->
        <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px; background: #f8fafc;">
          <h3 style="font-family: 'Prompt', sans-serif; font-size: 11.5pt; margin: 0 0 8px 0; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
            1. สรุปผลการคัดกรองความเสี่ยง พฤติกรรม และสารเสพติด
          </h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px 14px; font-size: 10pt;">
            <div style="grid-column: span 2;"><b>• สาเหตุความเสี่ยงที่พบ:</b> ${esc(rReasons)}</div>
            <div style="grid-column: span 2;"><b>• พฤติกรรมการเรียน/อารมณ์/สังคม:</b> ${esc(bTags)}</div>
            <div><b>• ข้อมูลดื่ม/สูบ (ตามที่แจ้ง):</b> "${esc(stu.Substance_Raw)}" (${esc(stu.Substance_Clean)})</div>
            <div><b>• สถานะการติดตามดูแล:</b> ${esc(sc.Followup_Status || 'ปกติ')}</div>
            <div><b>• รายได้ครอบครัว / เศรษฐกิจ:</b> ${esc(sc.Family_Income_Range)} (${esc(sc.Financial_Status)})</div>
            <div><b>• ค่าขนมรายวัน / ขอรับทุนฯ:</b> ${esc(sc.Daily_Allowance)} | ทุนฯ: ${esc(sc.Scholarship_Need)}</div>
            <div><b>• สถานภาพบิดามารดา:</b> ${esc(sc.Family_Status || 'อยู่ร่วมกัน')}</div>
            <div><b>• คะแนนความประพฤติคงเหลือ:</b> ${esc(stu.BehaviorScore)} / 100 คะแนน</div>
          </div>
        </div>

        <!-- Section 3: ประวัติการติดตามดูแล & เยี่ยมบ้าน -->
        <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px;">
          <h3 style="font-family: 'Prompt', sans-serif; font-size: 11.5pt; margin: 0 0 8px 0; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
            2. บันทึกการติดตามดูแลพฤติกรรม และการเยี่ยมบ้าน
          </h3>
          <div style="font-size: 10pt; margin-bottom: 8px;">
            <b>สถานะการเยี่ยมบ้าน:</b> ${esc(sc.Home_Visit_Status)} ${sc.Home_Visit_Date ? `(วันที่: ${esc(sc.Home_Visit_Date)})` : ''}
            <br/><b>สรุปผลการเยี่ยมบ้าน:</b> ${esc(sc.Home_Visit_Summary || '........................................................................................................................................')}
          </div>
          ${followHistory.length > 0 ? `
            <div style="font-size: 9.5pt; border-top: 1px dashed #cbd5e1; padding-top: 6px;">
              <b>ประวัติการติดตามเคสล่าสุด:</b>
              ${followHistory.slice(0, 4).map(fh => `
                <div style="margin-top: 3px;">- [${esc(new Date(fh.Date_Time).toLocaleDateString('th-TH'))}] <b>${esc(fh.Action_Type)}:</b> ${esc(fh.Note)} (${esc(fh.Teacher_Name)})</div>
              `).join('')}
            </div>
          ` : `
            <div style="font-size: 9.5pt; color: #475569;">
              <b>บันทึกความเห็นครูที่ปรึกษาเพิ่มเติม:</b><br/>
              ............................................................................................................................................................................................................................<br/>
              ............................................................................................................................................................................................................................
            </div>
          `}
        </div>

        <!-- Section 4: ช่องลงนาม -->
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 26px; text-align: center; font-size: 10pt;">
          <div>
            <div>ลงชื่อ.......................................................</div>
            <div style="margin-top: 4px;">(${esc(stu.ClassGroup.Advisor_Name || '................................................')})</div>
            <div style="font-weight: bold; margin-top: 2px;">ครูที่ปรึกษาประจำกลุ่ม</div>
          </div>
          <div>
            <div>ลงชื่อ.......................................................</div>
            <div style="margin-top: 4px;">(${esc(stu.Parent_Name || '................................................')})</div>
            <div style="font-weight: bold; margin-top: 2px;">ผู้ปกครองนักเรียน</div>
          </div>
          <div>
            <div>ลงชื่อ.......................................................</div>
            <div style="margin-top: 4px;">(.......................................................)</div>
            <div style="font-weight: bold; margin-top: 2px;">หัวหน้าแผนกวิชา / งานปกครอง</div>
          </div>
        </div>
      </div>
    `;

    setTimeout(() => {
      window.print();
    }, 120);
  }
};
