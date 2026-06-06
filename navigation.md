# 🧭 แผนผังนำทางโครงการฐานข้อมูลนักเรียน (Project Navigation Map)
สมุดสารบัญรวบรวมลิงก์เข้าถึงไฟล์และเอกสารข้อมูลทั้งหมดในโปรเจกต์สารสนเทศนักเรียน แผนกช่างกลโรงงาน & เทคนิคอุตสาหกรรม เพื่อให้คุณครูประจำชั้นคลิกสลับเปิดดูและทำงานต่อระหว่างเครื่องคอมพิวเตอร์และโน้ตบุ๊กได้อย่างสะดวกสบาย

---

## 📂 1. แฟ้มควบคุมหลักและตัวรันหน้าเว็บ (Root Directory)
ไฟล์หลักสามชิ้นสำหรับการรันและควบคุมการทำงานของแอปพลิเคชันระบบสารสนเทศนักเรียน:
* 🎓 **หน้าหลักเว็บไซต์**: [index.html](file:///G:/My%20Drive/student-database/index.html) (ดับเบิลคลิกเพื่อรันหน้าเว็บในเครื่อง หรือคลิกเปิดผ่าน VS Code)
* 🎨 **สไตล์และการออกแบบ**: [style.css](file:///G:/My%20Drive/student-database/style.css) (ไฟล์รวมโค้ดตกแต่ง สี แสง เงา และการจัดรูปหน้าตาเว็บ)
* 💻 **ระบบประมวลผลหลัก**: [app.js](file:///G:/My%20Drive/student-database/app.js) (ไฟล์ประมวลผล Logic ระบบกรองข้อมูล และ REST API ของ Supabase)
* 📖 **คู่มือภาพรวมโครงการ**: [README.md](file:///G:/My%20Drive/student-database/README.md) (รายละเอียดแนะนำระบบและสถาปัตยกรรมคลาวด์ฝั่งผู้ใช้งาน)

---

## 📖 2. เอกสารคู่มือและการวางระบบโครงการ (Project Documentation inside /docs)
ไฟล์ประวัติการพัฒนา แผนการวางโครงสร้างระบบ และคู่มือช่วยเหลือการใช้งาน:
* 💻 **[คู่มือด่วนติดตั้งและซิงค์ข้ามเครื่อง (project_sync_guide.md)](file:///G:/My%20Drive/student-database/project_sync_guide.md)**: คู่มือแนะนำขั้นละเอียดในการลงโปรแกรม VS Code / Live Server และการดึงสิทธิ์เพื่อสืบเนื่องทำงานต่อบนเครื่องโน้ตบุ๊กใหม่
* 🔑 **[คู่มืออัปโหลดโค้ดและบันทึกรหัสผ่านโครงการ (project_upload_and_credentials.md)](file:///G:/My%20Drive/student-database/docs/project_upload_and_credentials.md)**: อธิบายวิธีการอัปโหลดโค้ดขึ้นเว็บจริงและบันทึกรายชื่อบัญชีรหัสผ่านความปลอดภัยโครงการป้องกันการลืม
* 💾 **[สมุดบันทึกความจำและประวัติการพัฒนา (project_memory.md)](file:///G:/My%20Drive/student-database/docs/project_memory.md)**: รวบรวมข้อมูลเชิงลึกการอัปเกรดระบบ รายการแก้บั๊กสำคัญตั้งแต่เวอร์ชัน v14.0 ถึง v14.4 ล่าสุด เพื่อส่งต่อหน่วยความจำให้ระบบ AI หรือนักพัฒนาตัวอื่น
* 🛡️ **[แผนการติดตั้งคลาวด์และสิทธิ์การเข้าถึง (system_management_plan.md)](file:///G:/My%20Drive/student-database/docs/system_management_plan.md)**: บันทึกข้อมูลระบบความปลอดภัย การทดสอบการเข้าถึง และการจัดการเชื่อมต่อเครือข่ายความเร็วสูง
* 📊 **[คู่มือการผูกคอลัมน์ข้อมูล Excel / CSV (mapping.md)](file:///G:/My%20Drive/student-database/docs/mapping.md)**: อธิบายวิธีการนำเข้าข้อมูลนักเรียนรายชื่อจำนวนมากและการสแกนฟิลด์อัตโนมัติ
* 📋 **[รายงานสรุปการจัดหมวดหมู่แฟ้มล่าสุด (walkthrough.md)](file:///G:/My%20Drive/student-database/docs/walkthrough.md)**: สรุปความสำเร็จการย้ายโฟลเดอร์และการทดสอบระบบรันหลัก

---

## 🗄️ 3. แฟ้มข้อมูลสำรองและสคริปต์หลังบ้าน (Backups inside /data_backup)
ไฟล์สำหรับสำรองประวัตินักเรียนและสคริปต์ตั้งค่าโครงสร้างฐานข้อมูลฝั่งคลาวด์:
* 📂 **[ข้อมูลประวัตินักเรียนสำรองล่าสุด (students_backup.json)](file:///G:/My%20Drive/student-database/data_backup/students_backup.json)**: ไฟล์สำรองข้อมูลประวัติทั้งหมดของนักเรียน 76 คน ณ ปัจจุบัน สำหรับใช้กู้คืนระบบยามฉุกเฉิน
* 🛠️ **[สคริปต์ SQL ติดตั้งฝั่ง Supabase (supabase_setup.sql)](file:///G:/My%20Drive/student-database/data_backup/supabase_setup.sql)**: สคริปต์คำสั่งสร้างตาราง `students` และการนำเข้าประวัติผู้เรียนขึ้นคลาวด์ในคลิกเดียว
* ⚡ **[สคริปต์ Google Sheets เดิม (google_apps_script.js)](file:///G:/My%20Drive/student-database/data_backup/google_apps_script.js)**: สคริปต์ระบบ Google Apps Script ดั้งเดิมสำหรับใช้ในการศึกษาโครงสร้างอ้างอิง
* 📋 **[ไฟล์ชุดข้อมูลสำหรับการศึกษาโครงสร้าง (students_import.json)](file:///G:/My%20Drive/student-database/data_backup/students_import.json)**: ไฟล์บันทึกข้อมูลเชิงเปรียบเทียบในขั้นตอนก่อนการย้ายฐานข้อมูล

---

## 🌐 4. ลิงก์แดชบอร์ดภายนอกและคลังซอร์สโค้ด (External Links)
* ☁️ **[Supabase Project Dashboard](https://supabase.com/dashboard/project/iapcotozckbhpcmyzoqd)** : หน้าเว็บบริหารจัดการโครงการฐานข้อมูลออนไลน์ Supabase (สำหรับดูตารางนักเรียนและจัดการ RLS)
* 🐙 **[GitHub Repository Online](https://github.com/jaengza/student-machine-tool)** : คลังเก็บรักษาและอัปโหลดซอร์สโค้ดโปรเจกต์สารสนเทศของคุณครู
