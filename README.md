# 🎓 ระบบฐานข้อมูลนักเรียน แผนกช่างกลโรงงาน & เทคนิคอุตสาหกรรม (v14.4)
ระบบสารสนเทศประวัตินักเรียน คัดกรองความเสี่ยง (SDQ) และประเมินความช่วยเหลือด้านทุนการศึกษา สำหรับนักเรียนแผนกช่างกลโรงงาน (ปวช.) และแผนกเทคนิคอุตสาหกรรม (ปวส.) วิทยาลัยเทคนิคฉะเชิงเทรา

ระบบได้รับการอัปเกรดเป็นสถาปัตยกรรม **Supabase Cloud Sync (PostgreSQL)** เรียบร้อยแล้ว ซึ่งช่วยให้คุณครูสามารถประเมินความเสี่ยง บันทึก และแก้ไขข้อมูลนักเรียนข้ามอุปกรณ์ (คอมพิวเตอร์และโทรศัพท์มือถือ) ได้อย่างสะดวกรวดเร็วและอัปเดตตรงกันเรียลไทม์

---

## 📂 โครงสร้างโปรเจกต์ที่จัดระเบียบใหม่ (Project Structure)
เพื่อความสะอาดและสะดวกในการพัฒนา ไฟล์เอกสารและสคริปต์สำรองข้อมูลได้รับการจัดเก็บอย่างเป็นหมวดหมู่ดังนี้:

* **ไฟล์หลักของระบบหน้าบ้าน (Root Directory)**:
  - `index.html` : ไฟล์หน้าตาโครงสร้างเว็บไซต์หลัก
  - `style.css` : ไฟล์ตกแต่งดีไซน์ Premium Dark Theme
  - `app.js` : ไฟล์ระบบการคำนวณและเชื่อมโยง API ของ Supabase
  - `README.md` : ไฟล์แนะนำโครงการหน้าแรกนี้
  - `project_sync_guide.md` : **[คู่มือการซิงค์ข้อมูลและทำต่อบนโน้ตบุ๊กเครื่องใหม่]** (แนะแนวทางติดตั้งและซิงค์ข้อมูลอย่างละเอียดเข้าใจง่าย)

* **📂 โฟลเดอร์ [docs/](file:///G:/My%20Drive/student-database/docs) (เอกสารและการพัฒนา)**:
  - เก็บเอกสารรายละเอียดแผนงานพัฒนาและสรุปประวัติของระบบ: `walkthrough.md`, `project_memory.md`, `mapping.md`

* **📂 โฟลเดอร์ [data_backup/](file:///G:/My%20Drive/student-database/data_backup) (ข้อมูลสำรองฝั่งคลาวด์)**:
  - เก็บไฟล์ SQL Script สำหรับติดตั้ง Supabase: `supabase_setup.sql`
  - เก็บไฟล์แบ็คอัพข้อมูลประวัตินักเรียน: `students_backup.json`
  - เก็บไฟล์ Apps Script และข้อมูลนำเข้า Excel เก่า: `google_apps_script.js`, `students_import.json`

---

## 💻 คู่มือซิงค์ข้ามโน้ตบุ๊กเครื่องอื่น
คุณครูสามารถอ่านคำแนะนำอย่างละเอียดในการติดตั้งโปรแกรมช่วยจำลองระบบ (VS Code & Live Server) และการติดตั้ง Google Drive Desktop เพื่อดึงระบบไปทำต่อบนโน้ตบุ๊กเครื่องใหม่ได้ทันทีที่ไฟล์:
👉 **[คู่มือการติดตั้งและการซิงค์ข้อมูลข้ามเครื่อง (project_sync_guide.md)](file:///G:/My%20Drive/student-database/project_sync_guide.md)**

---

## 🚀 ช่องทางการเชื่อมต่อ & คลาวด์จริง
* **Supabase Project Dashboard**: [Supabase Project iapcotozckbhpcmyzoqd](https://supabase.com/dashboard/project/iapcotozckbhpcmyzoqd)
* **GitHub Repository**: [GitHub student-machine-tool](https://github.com/jaengza/student-machine-tool)
