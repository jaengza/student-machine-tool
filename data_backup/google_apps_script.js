/**
 * 🎓 Google Apps Script Web App API for Student Database (v11.0)
 * ระบบหลังบ้านอัจฉริยะ ซิงค์ข้อมูลสดอัตโนมัติ 100% ข้ามอุปกรณ์
 * ทำหน้าที่:
 *  1. อ่านข้อมูลนักเรียนทั้งหมดจากชีตหลัก พร้อมดึงและผสานรูปภาพจากชีตส่งรูปถ่ายแบบเรียลไทม์ (Smart Matching)
 *  2. บันทึกและอัปเดตข้อมูลทุกอย่าง (การแก้ไขประวัติ, พฤติกรรมเสี่ยง) กลับลงกูเกิลชีตอัตโนมัติทันทีเมื่อครูแก้ไขบนหน้าเว็บ
 *  3. รองรับการลบข้อมูล
 */

// ── ⚙️ ตั้งค่าลิงก์ชีตรูปภาพนักเรียน ──
// ไฟล์รูปภาพเด็กนักเรียน (ที่ส่งแยก) เพื่อนำมารวมข้อมูลแบบเรียลไทม์
const PHOTO_SPREADSHEET_ID = "16ly2qP4dXzQBPQo3gKJTQY9-Pxp9bMGtgAOMwSamPgA"; 

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheets()[0]; // ชีตหลักแผนกวิชา
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify([]))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const headers = data[0].map(h => String(h || '').trim());
    const students = [];
    
    // 1. ดึงประวัติหลักทั้งหมด
    for (let r = 1; r < data.length; r++) {
      const row = data[r];
      if (!row || row.length === 0 || !row[1]) continue; // ข้ามถ้ารหัสประจำตัวว่าง
      
      const student = {};
      headers.forEach((h, idx) => {
        student[h] = row[idx] !== undefined ? String(row[idx]).trim() : "";
      });
      
      // กำหนดฟิลด์เริ่มต้นเพื่อแสดงรูปภาพ
      student["รูปถ่าย"] = ""; 
      students.push(student);
    }
    
    // 2. ดึงข้อมูลรูปภาพจากชีตที่สองแบบเรียลไทม์
    let matchedCount = 0;
    try {
      const photoSs = SpreadsheetApp.openById(PHOTO_SPREADSHEET_ID);
      const photoSheet = photoSs.getSheets()[0];
      const photoData = photoSheet.getDataRange().getValues();
      
      if (photoData.length > 1) {
        const photoHeaders = photoData[0].map(h => String(h || '').trim().toLowerCase());
        
        let photoIdColIdx = -1;
        let photoNameColIdx = -1;
        let photoLinkColIdx = -1;
        
        photoHeaders.forEach((h, idx) => {
          if (h.includes("รหัส") || h.includes("id")) photoIdColIdx = idx;
          if (h.includes("ชื่อ") || h.includes("นามสกุล")) photoNameColIdx = idx;
        });
        
        // ค้นหาคอลัมน์ลิงก์รูปภาพ (ช่องที่ลิงก์เป็น Google Drive)
        for (let r = 1; r < Math.min(6, photoData.length); r++) {
          const row = photoData[r];
          row.forEach((cell, idx) => {
            const val = String(cell || '').trim();
            if (val.includes("drive.google.com") || val.includes("lh3.googleusercontent.com") || val.startsWith("http")) {
              photoLinkColIdx = idx;
            }
          });
          if (photoLinkColIdx !== -1) break;
        }
        
        if (photoLinkColIdx === -1) photoLinkColIdx = photoHeaders.length - 2; // สำรองคอลัมน์ท้ายๆ
        
        // วนลูปรูปภาพเพื่อมาจับคู่กับนักเรียนหลักแบบครอบคลุม (Smart Matching Engine)
        for (let pr = 1; pr < photoData.length; pr++) {
          const pRow = photoData[pr];
          if (!pRow || pRow.length <= 1) continue;
          
          const rawPhotoId = photoIdColIdx !== -1 ? String(pRow[photoIdColIdx] || '').trim() : '';
          const rawPhotoName = photoNameColIdx !== -1 ? String(pRow[photoNameColIdx] || '').trim().replace(/^(นาย|นางสาว|เด็กชาย|เด็กหญิง|นาง|ด\.ช\.|ด\.ญ\.)\s*/, '').replace(/\s+/g, '') : '';
          const rawPhotoUrl = photoLinkColIdx !== -1 ? String(pRow[photoLinkColIdx] || '').trim() : '';
          
          if (!rawPhotoUrl) continue;
          const directUrl = normalizeDriveUrl(rawPhotoUrl);
          
          students.forEach(student => {
            let isMatch = false;
            const stuId = String(student["รหัสประจำตัวนักเรียนนักศึกษา"] || student["รหัสนักเรียน"] || student["id"] || '').trim();
            
            // 2.1 จับคู่ผ่านรหัสประจำตัว (ตรงกัน หรือลงท้ายด้วย 3 หลัก)
            if (rawPhotoId && stuId) {
              if (stuId === rawPhotoId) {
                isMatch = true;
              } else if (rawPhotoId.length >= 3 && stuId.endsWith(rawPhotoId)) {
                isMatch = true;
              } else if (stuId.length >= 3 && rawPhotoId.endsWith(stuId)) {
                isMatch = true;
              }
            }
            
            // 2.2 จับคู่ผ่านชื่อ-นามสกุลยืดหยุ่นสะกดเป๊ะ
            const rawStuName = String(student["ชื่อ-นามสกุล"] || student["ชื่อจริง"] || "").trim();
            const stuCleanName = rawStuName.replace(/^(นาย|นางสาว|เด็กชาย|เด็กหญิง|นาง|ด\.ช\.|ด\.ญ\.)\s*/, '').replace(/\s+/g, '');
            
            if (!isMatch && rawPhotoName) {
              if (stuCleanName.includes(rawPhotoName) || rawPhotoName.includes(stuCleanName)) {
                isMatch = true;
              }
            }
            
            // 2.3 จับคู่ผ่านความคล้ายคลึงของข้อความ (สะกดผิดพลาด Levenshtein Similarity 75%+)
            if (!isMatch && rawPhotoName && stuCleanName) {
              const dist = getLevenshteinDistance(stuCleanName, rawPhotoName);
              const maxLength = Math.max(stuCleanName.length, rawPhotoName.length);
              const similarity = (maxLength - dist) / maxLength;
              if (similarity >= 0.75) {
                isMatch = true;
              }
            }
            
            // 2.4 จับคู่ชื่อจริงอย่างเดียวร่วมกับระดับชั้นตรงกัน
            if (!isMatch && rawPhotoName && stuCleanName) {
              const cleanPhotoFname = rawPhotoName.substring(0, 3);
              const cleanStuFname = stuCleanName.substring(0, 3);
              if (cleanPhotoFname === cleanStuFname) {
                const pLvl = String(pRow[3] || '').toLowerCase();
                const sLvl = String(student["ระดับชั้น"] || '').toLowerCase();
                const pLvlClean = pLvl.includes('ปวช') ? 'ปวช' : (pLvl.includes('ปวส') ? 'ปวส' : '');
                const sLvlClean = sLvl.includes('ปวช') ? 'ปวช' : (sLvl.includes('ปวส') ? 'ปวส' : '');
                if (!pLvlClean || !sLvlClean || pLvlClean === sLvlClean) {
                  isMatch = true;
                }
              }
            }
            
            if (isMatch) {
              student["รูปถ่าย"] = directUrl;
              matchedCount++;
            }
          });
        }
      }
    } catch (e) {
      Logger.log("Failed to sync photo spreadsheet: " + e.toString());
    }
    
    // แปลงผลลัพธ์ส่งออกเป็น JSON
    return ContentService.createTextOutput(JSON.stringify(students))
      .setMimeType(ContentService.MimeType.JSON); // ป้องกัน CORS บล็อก
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheets()[0];
    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => String(h || '').trim());
    
    const studentId = String(postData.id || '').trim();
    if (!studentId) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Missing student ID" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // ค้นหาคอลัมน์สำคัญ
    const idColIdx = headers.findIndex(h => h.includes("รหัสประจำตัวนักเรียนนักศึกษา") || h.includes("รหัสนักเรียน") || h === "id");
    
    if (idColIdx === -1) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "ID Column not found in Sheet" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // ตรวจสอบแอ็กชันลบประวัติ
    if (postData.action === "delete") {
      let foundRow = -1;
      for (let r = 1; r < data.length; r++) {
        if (String(data[r][idColIdx]).trim() === studentId) {
          foundRow = r + 1; // +1 สำหรับแถวในชีต 1-indexed
          break;
        }
      }
      
      if (foundRow !== -1) {
        sheet.deleteRow(foundRow);
        return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Deleted successfully" }))
          .setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Student not found" }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // พจนานุกรมคอลัมน์ในชีตภาษาไทย แปรรวมข้อมูลส่งจากฟิลด์เว็บหลังบ้าน
    const MAP_FIELDS_REVERSE = {
      "รหัสประจำตัวนักเรียนนักศึกษา": "id", "รหัสนักเรียน": "id", "id": "id",
      "ระดับชั้น": "level",
      "กลุ่มเรียน": "room",
      "ชื่อ-นามสกุล": "fullNameConcat",
      "ชื่อเล่น": "nickname",
      "รูปถ่าย": "photo",
      "เบอร์โทรศัพท์มือถือ ของนักเรียน": "phone",
      "ข้อมูลการติดต่ออื่นๆ IG หรือ Facebook ": "social",
      "ชื่อ-นามสกุล ผู้ปกครอง ": "parent",
      "เบอร์โทรศัพท์มือถือ ของผู้ปกครอง": "parentphone",
      "เบอร์โทรศัพท์มือถือ ของผู้ปกครอง (กรณีฉุกเฉิน)": "parentphone2",
      "สถานศึกษาเดิมที่นักเรียนจบมา": "prevschool",
      "ไซส์เสื้อกิจกรรม": "shirt",
      "ข้อมูลสุขภาพ/โรคประจำตัว": "health",
      "นักเรียนเดินทางมาวิทยาลัยอย่างไร": "transport",
      "เงินได้รับมาเรียนต่อวัน": "allowance",
      "พฤติกรรมเสี่ยงดื่ม/สูบ": "smoke",
      "สถานที่ฝึกงาน / สหกิจศึกษา": "internship_place",
      "เบอร์โทรสถานที่ฝึกงาน": "internship_phone",
      
      // 9 ฟิลด์เพิ่มเติม (v11)
      "เพศ": "gender",
      "บ้านเลขที่": "address_no",
      "ถนน": "address_road",
      "ตำบล": "address_subdistrict",
      "อำเภอ": "address_district",
      "รหัสไปรษณีย์": "address_zipcode",
      "นักเรียนมีความต้องกาารทุนการศึกษาไหมในอนาคต": "needs_scholarship",
      "ความต้องการทุนการศึกษา": "needs_scholarship",
      "อาชีพของผู้ปกครอง": "parent_job",
      "รายได้โดยเฉลี่ยของครอบครัว": "parent_income",
      
      "ระดับความเสี่ยงภาพรวม": "risk_level",
      "ความเสี่ยงด้านการเรียน": "risk_academic",
      "ความเสี่ยงด้านพฤติกรรม": "risk_behavior",
      "ความเสี่ยงด้านครอบครัว": "risk_family",
      "ความเสี่ยงด้านเศรษฐกิจ": "risk_economic",
      "หมายเหตุ / แผนช่วยเหลือ": "risk_note"
    };
    
    // ค้นหาแถวของนักเรียนตาม ID
    let studentRowIndex = -1;
    for (let r = 1; r < data.length; r++) {
      if (String(data[r][idColIdx]).trim() === studentId) {
        studentRowIndex = r + 1; // +1 เพราะ 1-indexed
        break;
      }
    }
    
    // รวบรวมข้อมูลสำหรับเขียนลงเซลล์
    const rowValues = [];
    
    if (studentRowIndex !== -1) {
      // 📝 กรณีแก้ไข: อัปเดตเฉพาะคอลัมน์ที่มีข้อมูลส่งมาจากเว็บ
      headers.forEach((header, colIdx) => {
        const fieldKey = MAP_FIELDS_REVERSE[header];
        if (fieldKey === "fullNameConcat") {
          // ผสมชื่อและนามสกุลสำหรับเขียนลงคอลัมน์ชื่อเต็ม
          const prefix = postData.level.includes("ปวช") ? "นาย " : "นาย "; // ปรับเพศเบื้องต้น
          const fn = postData.fname || "";
          const ln = postData.lname || "";
          sheet.getRange(studentRowIndex, colIdx + 1).setValue(`${fn} ${ln}`.trim());
        } else if (fieldKey && postData[fieldKey] !== undefined) {
          sheet.getRange(studentRowIndex, colIdx + 1).setValue(String(postData[fieldKey]).trim());
        }
      });
    } else {
      // 🆕 กรณีเพิ่มนักเรียนใหม่: สร้างแถวใหม่ท้ายตาราง
      const newRowData = new Array(headers.length).fill("");
      
      headers.forEach((header, colIdx) => {
        const fieldKey = MAP_FIELDS_REVERSE[header];
        if (fieldKey === "fullNameConcat") {
          const fn = postData.fname || "";
          const ln = postData.lname || "";
          newRowData[colIdx] = `${fn} ${ln}`.trim();
        } else if (fieldKey && postData[fieldKey] !== undefined) {
          newRowData[colIdx] = String(postData[fieldKey]).trim();
        }
      });
      
      sheet.appendRow(newRowData);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Saved successfully" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── Robust Google Drive Link Extractor ──
function normalizeDriveUrl(url) {
  if (!url) return '';
  url = url.trim();
  if (url.includes('lh3.googleusercontent.com/d/')) return url;
  
  const isIdOnly = /^[a-zA-Z0-9_-]{25,45}$/.test(url);
  if (isIdOnly) return "https://lh3.googleusercontent.com/d/" + url;

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

  if (fileId) return "https://lh3.googleusercontent.com/d/" + fileId;
  return url;
}

// ── Text Similarity Distance Utility (Levenshtein) ──
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
