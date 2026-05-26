/**
 * 🎓ระบบเชื่อมต่อฐานข้อมูล Google Sheets อัจฉริยะแบบเรียลไทม์ (Real-time Cloud Database Backend)
 * สำหรับติดตั้งหลัง Google Sheets แผนข้อมูลนักเรียนแผนกช่างกลโรงงานและเทคนิคอุตสาหกรรม
 * 
 * วิธีการติดตั้ง:
 * 1. ใน Google Sheets ไปที่เมนู "ส่วนขยาย" (Extensions) > "Apps Script"
 * 2. ลบโค้ดเดิมในหน้าต่างออกทั้งหมด แล้ววางโค้ดชุดนี้ลงไป
 * 3. กดปุ่มบันทึก (Save) รูปแผ่นดิสก์
 * 4. คลิกปุ่มสีฟ้าขวาบน "การทำให้ใช้งานได้" (Deploy) > "การทำให้ใช้งานได้ใหม่" (New deployment)
 * 5. เลือกประเภทการทำงานเป็น "เว็บแอป" (Web app)
 * 6. ในช่อง "ผู้มีสิทธิ์เข้าถึง" (Who has access) ให้เปลี่ยนเป็น "ทุกคน" (Anyone) [สำคัญมาก เพื่อให้หน้าเว็บส่งข้อมูลเข้าได้]
 * 7. คลิกปุ่ม "การทำให้ใช้งานได้" (Deploy) แล้วกดอนุญาตสิทธิ์การเข้าถึงผ่านบัญชี Google ของท่าน
 * 8. คัดลอกลิงก์ "URL ของเว็บแอป" ที่ได้มา นำไปกรอกใส่ในหน้าตั้งค่าของเว็บไซต์เพื่อเปิดใช้ระบบคลาวด์ออนไลน์ครับ!
 */

// สำหรับส่งข้อมูลนักเรียนทั้งหมดกลับไปให้หน้าเว็บเพื่อนำไปแสดงผล (Read)
function doGet(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    var data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify([]))
        .setMimeType(ContentService.MimeType.JSON)
        .setHeader('Access-Control-Allow-Origin', '*');
    }
    
    var headers = data[0];
    var result = [];
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var obj = {};
      var hasData = false;
      
      for (var j = 0; j < headers.length; j++) {
        var hName = headers[j].toString().trim();
        if (hName === "") continue;
        
        var val = row[j];
        // แปลงค่าเวลา Google ให้เป็น String ปกติ
        if (val instanceof Date) {
          val = val.toLocaleString('th-TH');
        }
        obj[hName] = val;
        if (val !== "") hasData = true;
      }
      
      if (hasData) {
        result.push(obj);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader('Access-Control-Allow-Origin', '*');
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader('Access-Control-Allow-Origin', '*');
  }
}

// สำหรับรับข้อมูลการแก้ไขนักเรียนจากหน้าเว็บมาทำการอัปเดตลง Sheets (Write & Update)
function doPost(e) {
  try {
    var params = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    
    // 1. ค้นหาคอลัมน์รหัสประจำตัวนักเรียน
    var idColIdx = -1;
    var idHeaderName = "";
    
    for (var j = 0; j < headers.length; j++) {
      var h = headers[j].toString().trim().toLowerCase();
      if (h === "รหัสประจำตัวนักเรียน" || h === "รหัสนักเรียน" || h === "รหัสประจำตัว" || h === "รหัส" || h === "id") {
        idColIdx = j;
        idHeaderName = headers[j];
        break;
      }
    }
    
    // หากไม่พบหัวคอลัมน์รหัสเลย ให้ถือเป็นคอลัมน์ที่ 3 (ดั้งเดิมของคุณครูคือคอลัมน์ 3)
    if (idColIdx === -1) {
      idColIdx = 2; 
      idHeaderName = headers[2] || "รหัสประจำตัวนักเรียน";
    }
    
    var studentId = params.id.toString().trim();
    var targetRowIdx = -1;
    
    // 2. ค้นหาแถวของนักเรียนตาม ID (รองรับรหัสสั้น/ยาวตรงกัน)
    for (var i = 1; i < data.length; i++) {
      var cellVal = data[i][idColIdx].toString().trim();
      if (cellVal === studentId || 
          (studentId.length >= 3 && cellVal.endsWith(studentId)) || 
          (cellVal.length >= 3 && studentId.endsWith(cellVal))) {
        targetRowIdx = i + 1; // 1-indexed สำหรับ Apps Script
        break;
      }
    }
    
    // 3. หากเป็นนักเรียนคนใหม่ (ยังไม่มีประวัติในชีต) ให้กดต่อท้ายแถวใหม่ให้ทันที!
    if (targetRowIdx === -1) {
      var newRow = [];
      for (var k = 0; k < headers.length; k++) {
        if (k === 0) newRow.push(new Date().toLocaleString('th-TH')); // ประทับเวลา
        else if (k === idColIdx) newRow.push(studentId); // รหัส
        else newRow.push("");
      }
      sheet.appendRow(newRow);
      
      // ดึงข้อมูลแถวใหม่เพื่ออัปเดตดัชนี
      data = sheet.getDataRange().getValues();
      targetRowIdx = data.length;
    }
    
    // 4. บันทึกข้อมูลคอลัมน์ต่าง ๆ (และขยายตารางเพิ่มหัวคอลัมน์ให้อัตโนมัติหากไม่มี!)
    for (var key in params) {
      if (key === "id") continue;
      
      var colIdx = -1;
      
      // ค้นหาคอลัมน์ที่ตรงกับ key หรือสะกดใกล้เคียงตามพจนานุกรมของเรา
      var MAPPING_KEYS = {
        fname: ["ชื่อนาม-นามสกุล", "ชื่อ-นามสกุล", "ชื่อจริง", "ชื่อ"],
        lname: ["ชื่อนาม-นามสกุล", "ชื่อ-นามสกุล", "นามสกุล", "สกุล"],
        nickname: ["ชื่อเล่น"],
        level: ["ระดับชั้นปี", "ระดับชั้น", "ระดับ"],
        year: ["ชั้นปี"],
        room: ["กลุ่มเรียน", "ห้อง"],
        phone: ["เบอร์โทรศัพท์มือถือ ของนักเรียน", "เบอร์โทรนักเรียน", "เบอร์โทร"],
        social: ["ข้อมูลการติดต่ออื่นๆ", "โซเชียล", "line", "facebook"],
        photo: ["รูป", "รูปถ่าย", "รูปภาพ", "photo"],
        internship_place: ["สถานที่ฝึกงาน", "ฝึกงาน"],
        internship_phone: ["เบอร์โทรสถานที่ฝึกงาน"],
        risk_level: ["ระดับความเสี่ยงภาพรวม", "ระดับความเสี่ยง", "ความเสี่ยง"],
        risk_note: ["หมายเหตุ / แผนช่วยเหลือ", "หมายเหตุ", "แผนช่วยเหลือ"]
      };
      
      // ค้นหาคอลัมน์จริงใน Google Sheets
      for (var c = 0; c < headers.length; c++) {
        var hName = headers[c].toString().trim();
        var hLower = hName.toLowerCase();
        
        // ลองเทียบตรง ๆ หรือเทียบตามพจนานุกรม
        if (hName === key || hLower === key.toLowerCase()) {
          colIdx = c;
          break;
        }
        if (MAPPING_KEYS[key]) {
          var matched = MAPPING_KEYS[key].some(function(opt) {
            return hLower.includes(opt.toLowerCase()) || opt.toLowerCase().includes(hLower);
          });
          if (matched) {
            colIdx = c;
            break;
          }
        }
      }
      
      // เกราะป้องกันคอลัมน์ใหม่! หากไม่มีหัวคอลัมน์นี้ในชีตเลย ให้สร้างหัวคอลัมน์ใหม่ต่อท้ายชีตให้อัตโนมัติ!
      if (colIdx === -1) {
        // อิงตามชื่อคีย์ดั้งเดิมเพื่อสร้างหัวตารางใหม่สวยงาม
        var newHeaderName = key;
        var labels = {
          nickname: "ชื่อเล่น", phone: "เบอร์โทรนักเรียน", social: "โซเชียล",
          parent: "ชื่อผู้ปกครอง", parentphone: "เบอร์โทรผู้ปกครอง", parentphone2: "เบอร์ฉุกเฉิน",
          prevschool: "สถานศึกษาเดิม", shirt: "ไซส์เสื้อ", health: "โรคประจำตัว",
          transport: "การเดินทาง", allowance: "เงินมาเรียนต่อวัน", smoke: "พฤติกรรมเสี่ยง",
          internship_place: "สถานที่ฝึกงาน", internship_phone: "เบอร์โทรสถานที่ฝึกงาน",
          risk_level: "ระดับความเสี่ยงภาพรวม", risk_academic: "เสี่ยงด้านการเรียน",
          risk_behavior: "เสี่ยงด้านพฤติกรรม", risk_family: "เสี่ยงด้านครอบครัว",
          risk_economic: "เสี่ยงด้านเศรษฐกิจ", risk_note: "หมายเหตุช่วยเหลือ"
        };
        if (labels[key]) newHeaderName = labels[key];
        
        sheet.getRange(1, headers.length + 1).setValue(newHeaderName);
        headers.push(newHeaderName);
        colIdx = headers.length - 1;
      }
      
      // พิเศษ: หากเป็นคอลัมน์ที่ทับซ้อนกัน เช่น ชื่อ-นามสกุล รวมกัน (fname และ lname ชี้ไปคอลัมน์ร่วมกัน)
      if (key === "fname" || key === "lname") {
        var colName = headers[colIdx].toString();
        if (colName.includes("นามสกุล") || colName.includes("-")) {
          // คอลัมน์ร่วม: จัดการผสานชื่อและนามสกุลก่อนบันทึกกลับลงชีต
          var currentVal = sheet.getRange(targetRowIdx, colIdx + 1).getValue().toString().trim();
          var parts = currentVal.split(/\s+/);
          
          var fVal = key === "fname" ? params.fname : (parts[0] || "");
          var lVal = key === "lname" ? params.lname : (parts.slice(1).join(" ") || "");
          
          sheet.getRange(targetRowIdx, colIdx + 1).setValue(fVal + " " + lVal);
          continue;
        }
      }
      
      // บันทึกค่าลงในช่องของเซลล์นักเรียนคนนั้นในชีต
      sheet.getRange(targetRowIdx, colIdx + 1).setValue(params[key]);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "บันทึกและซิงค์ข้อมูลเรียบร้อย!" }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader('Access-Control-Allow-Origin', '*');
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader('Access-Control-Allow-Origin', '*');
  }
}
