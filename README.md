# ระบบจัดการนักเรียน แผนกช่างกลโรงงาน & แผนกเทคนิคอุตสาหกรรม (Student Machine Tool Web App)

เว็บแอปพลิเคชันสำหรับบริหารจัดการข้อมูลนักเรียน งานปกครอง และระบบดูแลช่วยเหลือนักเรียน (SDQ & เยี่ยมบ้าน) ออกแบบด้วยโครงสร้าง **Relational Database 4 ตารางหลัก** รองรับการใช้งานแบบ **Mobile-First** บนสมาร์ทโฟนและ **Responsive Dashboard** บนคอมพิวเตอร์ (PC)

## 🗄️ โครงสร้างฐานข้อมูลเชิงสัมพันธ์ (4 Core Relational Tables)
1. **`Class_Groups` (ข้อมูลชั้นเรียนและกลุ่มเรียน - Master Data):**
   - `Class_ID` (PK), `Level` (ปวช./ปวส.), `Year`, `Major` (ช่างกลโรงงาน/เทคนิคอุตสาหกรรม), `Group_No`, `Advisor_Name`
2. **`Students` (ข้อมูลประวัตินักเรียนและพิกัดบ้าน):**
   - `Student_ID` (PK 11 หลัก), `Full_Name`, `Nickname`, `Class_ID` (FK -> ตาราง 1), `Status`, `Phone_Number`, `Parent_Phone`, `Address`, `Zone_District` (โซนอำเภอมาตรฐาน), `Home_Location` (Lat, Long), `Photo_URL`
3. **`Discipline_Records` (บันทึกพฤติกรรมและการตัดคะแนนงานปกครอง แบบ One-to-Many):**
   - `Record_ID` (PK), `Date_Time`, `Student_ID` (FK -> ตาราง 2), `Violation_Category`, `Description`, `Points_Deducted`, `Action_Taken`, `Teacher_Reported`
4. **`Screening_Records` (การคัดกรอง SDQ และการเยี่ยมบ้าน):**
   - `Screening_ID` (PK), `Academic_Term`, `Student_ID` (FK -> ตาราง 2), `Family_Status`, `Financial_Status`, `Overall_Risk_Level`, `Home_Visit_Date`, `Home_Visit_Photo`

## ✨ ฟีเจอร์เด่น
- **โปรไฟล์นักเรียน 360 องศา:** คลิกที่รายชื่อนักเรียนเพื่อดูข้อมูลเชื่อมโยงครบทั้ง 4 ตารางในหน้าเดียว
- **ศูนย์ตรวจสอบความถูกต้องข้อมูล (Data Fix Queue):** แจ้งเตือนรายชื่อนักเรียนที่ข้อมูลไม่ครบ (เช่น เบอร์โทรไม่ครบ 10 หลัก, ยังไม่กรอกแบบสอบถามหลัก, ยังไม่มีรูปถ่าย) พร้อมปุ่มกดแก้ไขได้ทันที
- **รองรับหน้าจอมือถือเต็มรูปแบบ:** มีแถบเมนูด้านล่าง (Bottom Navigation Bar), ปุ่มกดโทรออกหาเด็ก/ผู้ปกครอง (`tel:`), ปุ่มเปิด Google Maps นำทางไปบ้านนักเรียน, ปุ่มจับพิกัด GPS ปัจจุบันจากมือถือ และอัปโหลดรูปถ่ายเยี่ยมบ้านจากกล้องมือถือพร้อมย่อขนาดอัตโนมัติ
- **ระบบสำรองและส่งออกข้อมูล:** ส่งออกเป็นไฟล์ **Excel (`.xlsx` แยก 4 แผ่นงานตามตาราง)**, **CSV (360°)**, และ **JSON** รวมถึงรองรับการซิงก์ออนไลน์ผ่าน Google Apps Script
