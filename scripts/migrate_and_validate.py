import json
import re
import os
from datetime import datetime

with open('ข้อมูลนักเรียน_รวมสมบูรณ์.json', encoding='utf-8') as f:
    raw_students = json.load(f)

# 1. สร้างตาราง Class_Groups (รองรับทั้งกลุ่มที่มีนักเรียนจริง และกลุ่ม 3, 4 ของ ปวส. เผื่อขยาย)
class_groups = [
    {
        "Class_ID": "V1-MECH-G1",
        "Level": "ปวช.",
        "Year": 1,
        "Major": "ช่างกลโรงงาน",
        "Group_No": 1,
        "Advisor_Name": "ครูที่ปรึกษา ปวช.1 กลุ่ม 1 (ระบุชื่อ)",
        "Note": "รหัสนำหน้า 6920102"
    },
    {
        "Class_ID": "V1-MECH-G2",
        "Level": "ปวช.",
        "Year": 1,
        "Major": "ช่างกลโรงงาน",
        "Group_No": 2,
        "Advisor_Name": "ครูที่ปรึกษา ปวช.1 กลุ่ม 2 (ระบุชื่อ)",
        "Note": "รหัสนำหน้า 6920102"
    },
    {
        "Class_ID": "V1-MECH-G3",
        "Level": "ปวช.",
        "Year": 1,
        "Major": "ช่างกลโรงงาน",
        "Group_No": 3,
        "Advisor_Name": "ครูที่ปรึกษา ปวช.1 กลุ่ม 3 (ระบุชื่อ)",
        "Note": "รหัสนำหน้า 6920102"
    },
    {
        "Class_ID": "V1-MECH-G4",
        "Level": "ปวช.",
        "Year": 1,
        "Major": "ช่างกลโรงงาน",
        "Group_No": 4,
        "Advisor_Name": "ครูที่ปรึกษา ปวช.1 กลุ่ม 4 (ระบุชื่อ)",
        "Note": "รหัสนำหน้า 6920102"
    },
    {
        "Class_ID": "V2-MECH-G4",
        "Level": "ปวช.",
        "Year": 2,
        "Major": "ช่างกลโรงงาน",
        "Group_No": 4,
        "Advisor_Name": "ครูที่ปรึกษา ปวช.2 กลุ่ม 4 (ระบุชื่อ)",
        "Note": "นักเรียนตกค้างรุ่น 68 (6820102)"
    },
    {
        "Class_ID": "H1-IND-G1",
        "Level": "ปวส.",
        "Year": 1,
        "Major": "เทคนิคอุตสาหกรรม",
        "Group_No": 1,
        "Advisor_Name": "ครูที่ปรึกษา ปวส.1 กลุ่ม 1 (ระบุชื่อ)",
        "Note": "รหัสนำหน้า 6930111"
    },
    {
        "Class_ID": "H1-IND-G2",
        "Level": "ปวส.",
        "Year": 1,
        "Major": "เทคนิคอุตสาหกรรม",
        "Group_No": 2,
        "Advisor_Name": "ครูที่ปรึกษา ปวส.1 กลุ่ม 2 (ระบุชื่อ)",
        "Note": "รหัสนำหน้า 6930111"
    },
    {
        "Class_ID": "H1-IND-G3",
        "Level": "ปวส.",
        "Year": 1,
        "Major": "เทคนิคอุตสาหกรรม",
        "Group_No": 3,
        "Advisor_Name": "ครูที่ปรึกษา ปวส.1 กลุ่ม 3 (สำรอง)",
        "Note": "เปิดสำรองตามโครงสร้างแผนก"
    },
    {
        "Class_ID": "H1-IND-G4",
        "Level": "ปวส.",
        "Year": 1,
        "Major": "เทคนิคอุตสาหกรรม",
        "Group_No": 4,
        "Advisor_Name": "ครูที่ปรึกษา ปวส.1 กลุ่ม 4 (สำรอง)",
        "Note": "เปิดสำรองตามโครงสร้างแผนก"
    },
    {
        "Class_ID": "H1-IND-G5",
        "Level": "ปวส.",
        "Year": 1,
        "Major": "เทคนิคอุตสาหกรรม",
        "Group_No": 5,
        "Advisor_Name": "ครูที่ปรึกษา ปวส.1 กลุ่ม 5 (ระบุชื่อ)",
        "Note": "รหัสนำหน้า 6930111"
    }
]

# ฟังก์ชันจัดมาตรฐานชื่ออำเภอ (Zone_District)
def normalize_district(raw_dist):
    if not raw_dist:
        return "ไม่ระบุ"
    d = str(raw_dist).strip()
    d = d.replace("อำเภอ", "").replace("จังหวัดฉะเชิงเทรา", "").replace("ฉะเชิงเทรา", "").replace("ฉะเฉิงเทรา", "").replace("ฮะเชิงเทรา", "").strip()
    # แก้สระเอสองตัวและคำผิด
    d = d.replace("เเปลงยาว", "แปลงยาว").replace("เมื่อง", "เมือง").replace("บางคบ้า", "บางคล้า")
    d = d.replace("บางนํ้าเปรี้ยว", "บางน้ำเปรี้ยว").replace("ราชสาสน์", "ราชสาส์น").replace("สยามชัยเขต", "สนามชัยเขต")
    if d in ["", "-", "."]:
        return "ไม่ระบุ"
    if d == "เมือง":
        return "เมืองฉะเชิงเทรา"
    return d

# พิกัดกลางของแต่ละอำเภอ (สำหรับแผนที่โซนเยี่ยมบ้านกรณีนักเรียนยังไม่ได้ปักหมุดบ้านรายบุคคล)
DISTRICT_COORDS = {
    "เมืองฉะเชิงเทรา": "13.6904, 101.0779",
    "บางน้ำเปรี้ยว": "13.8466, 101.0536",
    "แปลงยาว": "13.5855, 101.2872",
    "บางคล้า": "13.7297, 101.2081",
    "บ้านโพธิ์": "13.5997, 101.0789",
    "ราชสาส์น": "13.7806, 101.2819",
    "สนามชัยเขต": "13.6592, 101.4394",
    "พนมสารคาม": "13.7483, 101.3486",
    "คลองเขื่อน": "13.7900, 101.1633",
    "บางปะกง": "13.5422, 100.9936",
    "บ้านสร้าง": "13.9961, 101.2217",
    "ศรีมโหสถ": "13.8869, 101.4119",
    "บางบ่อ": "13.5839, 100.8683",
    "หนองจอก": "13.8556, 100.8625",
    "พนัสนิคม": "13.4528, 101.1794",
    "พานทอง": "13.4683, 101.0953",
    "องครักษ์": "14.1206, 101.0028"
}

def clean_phone(raw_phone):
    if not raw_phone:
        return "", ""
    s = str(raw_phone).strip()
    if s in ["-", "ไม่มี", "."]:
        return "", s
    # ค้นหาตัวเลข 9-10 หลัก
    digits_matches = re.findall(r'0\d[\d\s\-]{7,10}\d|\b[689]\d{8}\b', s)
    if digits_matches:
        first_num = re.sub(r'[\s\-]', '', digits_matches[0])
        if len(first_num) == 9 and first_num[0] in ['6', '8', '9']:
            first_num = '0' + first_num # เติม 0 ข้างหน้ากรณีตกเลข 0 เช่น 819368857
        note = s.replace(digits_matches[0], '').strip(' ()-/,')
        return first_num, note
    # กรณีไม่มี match ข้างต้น ดึงตัวเลขล้วน
    only_digits = re.sub(r'\D', '', s)
    return only_digits, s

def classify_substance(raw_sub):
    if not raw_sub:
        return "ไม่ระบุ", False
    s = str(raw_sub).strip()
    negatives = [
        'ไม่มี', 'ไม่', 'ไม่สูบ', 'ไม่ครับ', 'ไม่สูบ ไม่ดื่ม', 'ไม่ดูด',
        'ไม่สูบไม่ดื่ม', 'ไม่ดื่ม ไม่สูบ', 'ไม่เคย', 'ไม่ยุ่งเกี่ยว', 'ไม่เอาหมด',
        'ไม่ดื่มไม่สูบ', 'ไม่ยุ่งอะไรเลย', 'ไม่มีครับ', 'ม่ายมี', 'ไม่กินอะไรเลย',
        '-', 'ไม่ยุ่งเกี่ยวทุกชนิด', 'ไม่เอาครับ', 'ไม่สูบไม่ดิ่ม', 'ไม่ดืมแหละไม่สูบครับ',
        'ไม่ดูดไม่กิน', 'ไม่เอาอะไรเลย', '.', 'ฉันไม่เสพของมึนเมา', 'เลิกแล้ว', 'ไม่ได้ดื่มหรือสูบ'
    ]
    if s in negatives:
        return "ไม่ดื่ม/ไม่สูบ", False
    items = []
    if "บุหรี่" in s:
        items.append("บุหรี่")
    if "เหล้า" in s or "เบียร" in s:
        items.append("เหล้า/เบียร์")
    if "กระท่อม" in s:
        items.append("น้ำกระท่อม")
    if "กัญชา" in s:
        items.append("กัญชา")
    if items:
        return ", ".join(items), True
    return s, True

students_table = []
discipline_table = []
screening_table = []

for idx, r in enumerate(raw_students, start=1):
    sid = str(r.get("รหัสประจำตัวนักเรียน", "")).strip()
    level = str(r.get("ระดับชั้น", "")).strip()
    year_str = str(r.get("ชั้นปี", "")).strip()
    grp = int(str(r.get("กลุ่มเรียน", "1")).strip())

    if "ปวช.2" in year_str or sid.startswith("682"):
        class_id = f"V2-MECH-G{grp}"
    elif level == "ปวช." or sid.startswith("692"):
        class_id = f"V1-MECH-G{grp}"
    else:
        class_id = f"H1-IND-G{grp}"

    # Phone parsing
    stu_phone, stu_phone_note = clean_phone(r.get("เบอร์โทรศัพท์มือถือ_นักเรียน", ""))
    par_phone, par_phone_note = clean_phone(r.get("เบอร์โทรศัพท์มือถือ_ผู้ปกครอง", ""))
    emg_phone, emg_phone_note = clean_phone(r.get("เบอร์โทรศัพท์มือถือ_ผู้ปกครอง_ฉุกเฉิน", ""))

    # Address assembly
    house_no = str(r.get("บ้านเลขที่", "")).strip()
    road = str(r.get("ถนน", "")).strip()
    subdist = str(r.get("ตำบล", "")).strip()
    raw_dist = str(r.get("อำเภอ", "")).strip()
    zipcode = str(r.get("รหัสไปรษณีย์", "")).strip()

    zone_district = normalize_district(raw_dist)
    addr_parts = []
    if house_no and house_no != "-": addr_parts.append(f"บ้านเลขที่ {house_no}")
    if road and road != "-": addr_parts.append(f"ถ.{road}")
    if subdist and subdist != "-": addr_parts.append(f"ต.{subdist}")
    if zone_district != "ไม่ระบุ": addr_parts.append(f"อ.{zone_district}")
    if zipcode and zipcode != "-": addr_parts.append(zipcode)
    full_address = " ".join(addr_parts) if addr_parts else "ยังไม่ได้กรอกที่อยู่"

    # Default coordinates from district center (with flag so user knows it's district-level until pinned)
    home_loc = DISTRICT_COORDS.get(zone_district, "")

    # Detect data issues for this student
    issues = []
    if sid == "69201020042" or full_address == "ยังไม่ได้กรอกที่อยู่":
        issues.append("ยังไม่ได้กรอกแบบสอบถามข้อมูลหลัก (มีเฉพาะรูปถ่าย)")
    if not stu_phone:
        issues.append("ไม่มีเบอร์โทรศัพท์นักเรียน")
    elif len(stu_phone) != 10:
        issues.append(f"เบอร์โทรนักเรียนมี {len(stu_phone)} หลัก ({stu_phone})")
    if not par_phone:
        issues.append("ไม่มีเบอร์โทรศัพท์ผู้ปกครอง")
    elif len(par_phone) != 10:
        issues.append(f"เบอร์โทรผู้ปกครองไม่ครบ 10 หลัก ({par_phone})")
    if r.get("สถานะรูปภาพ") != "มีรูปแล้ว":
        issues.append("ยังไม่มีรูปถ่ายนักเรียน")
    if zone_district == "ไม่ระบุ":
        issues.append("ไม่ระบุอำเภอ/โซนพื้นที่")

    sub_clean, has_sub_risk = classify_substance(r.get("ดิ่มหรือสูบไหม", ""))

    student_obj = {
        "Student_ID": sid,
        "Prefix": str(r.get("คำนำหน้า", "")).strip() or "นาย",
        "Full_Name": str(r.get("ชื่อ-นามสกุล", "")).strip(),
        "Nickname": str(r.get("ชื่อเล่น", "")).strip(),
        "Gender": str(r.get("เพศ", "ชาย")).strip(),
        "Class_ID": class_id,
        "Status": "ปกติ",
        "Phone_Number": stu_phone,
        "Phone_Raw": str(r.get("เบอร์โทรศัพท์มือถือ_นักเรียน", "")).strip(),
        "Parent_Name": str(r.get("ชื่อ-นามสกุล_ผู้ปกครอง", "")).strip(),
        "Parent_Phone": par_phone,
        "Parent_Phone_Raw": str(r.get("เบอร์โทรศัพท์มือถือ_ผู้ปกครอง", "")).strip(),
        "Emergency_Phone": emg_phone,
        "Emergency_Contact_Note": emg_phone_note or str(r.get("เบอร์โทรศัพท์มือถือ_ผู้ปกครอง_ฉุกเฉิน", "")).strip(),
        "Social_Contact": str(r.get("ข้อมูลการติดต่ออื่นๆ_IG_Facebook", "")).strip(),
        "Address": full_address,
        "House_No": house_no,
        "Road": road,
        "Subdistrict": subdist,
        "Zone_District": zone_district,
        "Raw_District": raw_dist,
        "Zipcode": zipcode,
        "Home_Location": home_loc,
        "Location_Precision": "อำเภอ (รอปักหมุดบ้าน)" if home_loc else "ยังไม่ระบุพิกัด",
        "Photo_Status": str(r.get("สถานะรูปภาพ", "")).strip(),
        "Photo_URL": str(r.get("ลิงก์แสดงรูปภาพ_Direct", "")).strip(),
        "Photo_Drive_Link": str(r.get("ลิงก์รูปภาพ_Drive", "")).strip(),
        "Commute_Method": str(r.get("นักเรียนเดินทางมาวิทยาลัยอย่างไร", "")).strip(),
        "Previous_School": str(r.get("สถานศึกษาเดิมที่นักเรียนจบมา", "")).strip(),
        "Data_Note": str(r.get("หมายเหตุการจัดการข้อมูล", "")).strip(),
        "Data_Issues": issues,
        "Updated_At": "2026-10-22T10:20:00+07:00"
    }
    students_table.append(student_obj)

    # สร้างข้อมูลตารางที่ 4 (Screening_Records) ตั้งต้นจากแบบสอบถามจริง
    income = str(r.get("รายได้โดยเฉลี่ยของครอบครัว", "")).strip()
    scholarship = str(r.get("นักเรียนมีความต้องการทุนการศึกษาไหมในอนาคต", "")).strip()
    allowance = str(r.get("นักเรียนได้เงินมากินวันละกี่บาท", "")).strip()
    parent_job = str(r.get("อาชีพของผู้ปกครอง", "")).strip()

    # ประเมิน Financial_Status ตาม Schema (เพียงพอ, ขัดสน, ต้องทำงานพิเศษ)
    if "ต่ำกว่า 10000" in income or (scholarship == "ต้องการ" and "10000-15000" in income):
        fin_status = "ขัดสน"
    elif "น้อยกว่า 100" in allowance:
        fin_status = "ขัดสน"
    else:
        fin_status = "เพียงพอ"

    # ประเมิน Overall_Risk_Level ตาม Schema (กลุ่มปกติ, กลุ่มเสี่ยง, กลุ่มมีปัญหา)
    risk_factors = []
    if has_sub_risk:
        risk_factors.append(f"พฤติกรรมดื่ม/สูบ ({sub_clean})")
    if fin_status == "ขัดสน":
        risk_factors.append("รายได้ครอบครัวต่ำ/ต้องการทุน")
    if sid == "69201020042":
        risk_factors.append("ข้อมูลพื้นฐานยังไม่ครบ")

    if ("กระท่อม" in sub_clean or "กัญชา" in sub_clean) or (has_sub_risk and fin_status == "ขัดสน"):
        risk_level = "กลุ่มเสี่ยง"
    elif has_sub_risk or fin_status == "ขัดสน":
        risk_level = "กลุ่มเสี่ยง"
    else:
        risk_level = "กลุ่มปกติ"

    screening_obj = {
        "Screening_ID": f"SCR-2569-{idx:03d}",
        "Academic_Term": "1/2569",
        "Student_ID": sid,
        "Family_Status": "อยู่ร่วมกัน", # ค่าเริ่มต้น ให้ครูแก้ไขเมื่อสัมภาษณ์/เยี่ยมบ้าน
        "Parent_Occupation": parent_job,
        "Family_Income_Range": income,
        "Daily_Allowance": allowance,
        "Scholarship_Need": scholarship,
        "Financial_Status": fin_status,
        "Substance_History": sub_clean,
        "Risk_Factors_Note": ", ".join(risk_factors) if risk_factors else "ปกติ",
        "Overall_Risk_Level": risk_level,
        "Home_Visit_Status": "ยังไม่เยี่ยมบ้าน",
        "Home_Visit_Date": "",
        "Home_Visit_Photo": "",
        "Home_Visit_Summary": "",
        "Updated_At": "2026-10-22T10:20:00+07:00"
    }
    screening_table.append(screening_obj)

# สร้างข้อมูลตัวอย่างตารางที่ 3 (Discipline_Records) เตรียมโครงสร้างพร้อมใช้งาน (เริ่มต้นเป็นรายการว่าง หรือมีตัวอย่างที่ลบออกได้)
# เพื่อความถูกต้อง 100% ของข้อมูลจริง เราจะเริ่มตาราง Discipline_Records เป็นลิสต์ว่าง `[]` เพื่อให้นักเรียนทุกคนมีคะแนนเต็ม 100 คะแนนและให้ครูบันทึกจริง
db_bundle = {
    "metadata": {
        "app_name": "ระบบจัดการนักเรียนแผนกช่างกลโรงงานและเทคนิคอุตสาหกรรม",
        "schema_version": "1.0.0",
        "academic_year": "2569",
        "generated_at": "2026-10-22T10:20:00+07:00",
        "total_students": len(students_table)
    },
    "Class_Groups": class_groups,
    "Students": students_table,
    "Discipline_Records": [],
    "Screening_Records": screening_table,
    "Audit_Logs": [
        {
            "Log_ID": "LOG-INIT-001",
            "Timestamp": "2026-10-22T10:20:00+07:00",
            "Action": "นำเข้าและจัดโครงสร้างฐานข้อมูลเริ่มต้น (4 ตารางหลัก)",
            "Details": f"แปลงข้อมูลนักเรียน {len(students_table)} คน, จัดมาตรฐานชื่ออำเภอ, แยกเบอร์โทรศัพท์ฉุกเฉิน และประเมินคัดกรองเบื้องต้น"
        }
    ]
}

os.makedirs('data', exist_ok=True)
with open('data/initial_db.json', 'w', encoding='utf-8') as f:
    json.dump(db_bundle, f, ensure_ascii=False, indent=2)

with open('data/initial_db.js', 'w', encoding='utf-8') as f:
    f.write("// ฐานข้อมูลเริ่มต้น 4 ตารางหลัก (Relational Schema)\n")
    f.write("window.INITIAL_RELATIONAL_DB = ")
    json.dump(db_bundle, f, ensure_ascii=False, indent=2)
    f.write(";\n")

print(f"Successfully generated data/initial_db.json and data/initial_db.js with {len(students_table)} students!")
