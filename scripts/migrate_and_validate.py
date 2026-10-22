import json
import re
import os

with open('ข้อมูลนักเรียน_รวมสมบูรณ์.json', encoding='utf-8') as f:
    raw_students = json.load(f)

# 1. ตารางที่ 1: Class_Groups ใช้ชื่อกลุ่มภาษาไทยเข้าใจง่าย ("กลุ่ม1", "กลุ่ม2", ...) แทนรหัส Code ภาษาอังกฤษ
class_groups = [
    {
        "Class_ID": "ปวช.1 กลุ่ม1",
        "Group_Label": "กลุ่ม1",
        "Level": "ปวช.",
        "Level_Year": "ปวช.1",
        "Year": 1,
        "Major": "ช่างกลโรงงาน",
        "Group_No": 1,
        "Advisor_Name": "ครูที่ปรึกษา ปวช.1 กลุ่ม1 (คลิกเพื่อระบุชื่อ)",
        "Note": "รหัสนำหน้า 6920102"
    },
    {
        "Class_ID": "ปวช.1 กลุ่ม2",
        "Group_Label": "กลุ่ม2",
        "Level": "ปวช.",
        "Level_Year": "ปวช.1",
        "Year": 1,
        "Major": "ช่างกลโรงงาน",
        "Group_No": 2,
        "Advisor_Name": "ครูที่ปรึกษา ปวช.1 กลุ่ม2 (คลิกเพื่อระบุชื่อ)",
        "Note": "รหัสนำหน้า 6920102"
    },
    {
        "Class_ID": "ปวช.1 กลุ่ม3",
        "Group_Label": "กลุ่ม3",
        "Level": "ปวช.",
        "Level_Year": "ปวช.1",
        "Year": 1,
        "Major": "ช่างกลโรงงาน",
        "Group_No": 3,
        "Advisor_Name": "ครูที่ปรึกษา ปวช.1 กลุ่ม3 (คลิกเพื่อระบุชื่อ)",
        "Note": "รหัสนำหน้า 6920102"
    },
    {
        "Class_ID": "ปวช.1 กลุ่ม4",
        "Group_Label": "กลุ่ม4",
        "Level": "ปวช.",
        "Level_Year": "ปวช.1",
        "Year": 1,
        "Major": "ช่างกลโรงงาน",
        "Group_No": 4,
        "Advisor_Name": "ครูที่ปรึกษา ปวช.1 กลุ่ม4 (คลิกเพื่อระบุชื่อ)",
        "Note": "รหัสนำหน้า 6920102"
    },
    {
        "Class_ID": "ปวช.2 กลุ่ม4",
        "Group_Label": "กลุ่ม4",
        "Level": "ปวช.",
        "Level_Year": "ปวช.2",
        "Year": 2,
        "Major": "ช่างกลโรงงาน",
        "Group_No": 4,
        "Advisor_Name": "ครูที่ปรึกษา ปวช.2 กลุ่ม4 (คลิกเพื่อระบุชื่อ)",
        "Note": "นักเรียนรุ่น 68 (6820102)"
    },
    {
        "Class_ID": "ปวส.1 กลุ่ม1",
        "Group_Label": "กลุ่ม1",
        "Level": "ปวส.",
        "Level_Year": "ปวส.1",
        "Year": 1,
        "Major": "เทคนิคอุตสาหกรรม",
        "Group_No": 1,
        "Advisor_Name": "ครูที่ปรึกษา ปวส.1 กลุ่ม1 (คลิกเพื่อระบุชื่อ)",
        "Note": "รหัสนำหน้า 6930111"
    },
    {
        "Class_ID": "ปวส.1 กลุ่ม2",
        "Group_Label": "กลุ่ม2",
        "Level": "ปวส.",
        "Level_Year": "ปวส.1",
        "Year": 1,
        "Major": "เทคนิคอุตสาหกรรม",
        "Group_No": 2,
        "Advisor_Name": "ครูที่ปรึกษา ปวส.1 กลุ่ม2 (คลิกเพื่อระบุชื่อ)",
        "Note": "รหัสนำหน้า 6930111"
    },
    {
        "Class_ID": "ปวส.1 กลุ่ม5",
        "Group_Label": "กลุ่ม5",
        "Level": "ปวส.",
        "Level_Year": "ปวส.1",
        "Year": 1,
        "Major": "เทคนิคอุตสาหกรรม",
        "Group_No": 5,
        "Advisor_Name": "ครูที่ปรึกษา ปวส.1 กลุ่ม5 (คลิกเพื่อระบุชื่อ)",
        "Note": "รหัสนำหน้า 6930111"
    }
]

def normalize_district(raw_dist):
    if not raw_dist:
        return "ไม่ระบุ"
    d = str(raw_dist).strip()
    d = d.replace("อำเภอ", "").replace("จังหวัดฉะเชิงเทรา", "").replace("ฉะเชิงเทรา", "").replace("ฉะเฉิงเทรา", "").replace("ฮะเชิงเทรา", "").strip()
    d = d.replace("เเปลงยาว", "แปลงยาว").replace("เมื่อง", "เมือง").replace("บางคบ้า", "บางคล้า")
    d = d.replace("บางนํ้าเปรี้ยว", "บางน้ำเปรี้ยว").replace("ราชสาสน์", "ราชสาส์น").replace("สยามชัยเขต", "สนามชัยเขต")
    if d in ["", "-", "."]:
        return "ไม่ระบุ"
    if d == "เมือง":
        return "เมืองฉะเชิงเทรา"
    return d

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
    digits_matches = re.findall(r'0\d[\d\s\-]{7,10}\d|\b[689]\d{8}\b', s)
    if digits_matches:
        first_num = re.sub(r'[\s\-]', '', digits_matches[0])
        if len(first_num) == 9 and first_num[0] in ['6', '8', '9']:
            first_num = '0' + first_num
        note = s.replace(digits_matches[0], '').strip(' ()-/,')
        return first_num, note
    only_digits = re.sub(r'\D', '', s)
    return only_digits, s

def analyze_substance(raw_sub):
    raw_str = str(raw_sub or "").strip()
    if not raw_str:
        return "ยังไม่ได้กรอกข้อมูล", "ไม่ระบุ", [], False

    tags = []
    if "บุหรี่" in raw_str:
        tags.append("บุหรี่")
    if "เหล้า" in raw_str or "เบียร" in raw_str:
        tags.append("เหล้า/เบียร์")
    if "กระท่อม" in raw_str:
        tags.append("น้ำกระท่อม")
    if "กัญชา" in raw_str:
        tags.append("กัญชา")

    if tags:
        return raw_str, ", ".join(tags), tags, True

    return raw_str, "ไม่ดื่ม/ไม่สูบ", ["ไม่ดื่ม/ไม่สูบ"], False

students_table = []
screening_table = []

for idx, r in enumerate(raw_students, start=1):
    sid = str(r.get("รหัสประจำตัวนักเรียน", "")).strip()
    level = str(r.get("ระดับชั้น", "")).strip()
    year_str = str(r.get("ชั้นปี", "")).strip()
    grp = int(str(r.get("กลุ่มเรียน", "1")).strip())

    if "ปวช.2" in year_str or sid.startswith("682"):
        class_id = f"ปวช.2 กลุ่ม{grp}"
        level_year = "ปวช.2"
    elif level == "ปวช." or sid.startswith("692"):
        class_id = f"ปวช.1 กลุ่ม{grp}"
        level_year = "ปวช.1"
    else:
        class_id = f"ปวส.1 กลุ่ม{grp}"
        level_year = "ปวส.1"

    group_label = f"กลุ่ม{grp}"

    stu_phone, _ = clean_phone(r.get("เบอร์โทรศัพท์มือถือ_นักเรียน", ""))
    par_phone, _ = clean_phone(r.get("เบอร์โทรศัพท์มือถือ_ผู้ปกครอง", ""))
    emg_phone, emg_phone_note = clean_phone(r.get("เบอร์โทรศัพท์มือถือ_ผู้ปกครอง_ฉุกเฉิน", ""))

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

    home_loc = DISTRICT_COORDS.get(zone_district, "")
    sub_raw, sub_clean, sub_tags, has_sub_risk = analyze_substance(r.get("ดิ่มหรือสูบไหม", ""))

    income = str(r.get("รายได้โดยเฉลี่ยของครอบครัว", "")).strip()
    scholarship = str(r.get("นักเรียนมีความต้องการทุนการศึกษาไหมในอนาคต", "")).strip()
    allowance = str(r.get("นักเรียนได้เงินมากินวันละกี่บาท", "")).strip()
    parent_job = str(r.get("อาชีพของผู้ปกครอง", "")).strip()

    risk_reasons = []
    risk_tags = []

    if "บุหรี่" in sub_tags:
        risk_reasons.append("สูบบุหรี่")
        risk_tags.append("สูบบุหรี่")
    if "เหล้า/เบียร์" in sub_tags:
        risk_reasons.append("ดื่มเหล้า/เบียร์")
        risk_tags.append("ดื่มเหล้า/เบียร์")
    if "น้ำกระท่อม" in sub_tags:
        risk_reasons.append("ดื่มน้ำกระท่อม")
        risk_tags.append("น้ำกระท่อม")
    if "กัญชา" in sub_tags:
        risk_reasons.append("ใช้กัญชา")
        risk_tags.append("กัญชา")

    is_low_income = "ต่ำกว่า 10000" in income
    is_low_allowance = "น้อยกว่า 100" in allowance
    needs_scholarship = scholarship == "ต้องการ"

    if is_low_income:
        risk_reasons.append("รายได้ครอบครัวต่ำ (<10,000 บ.)")
        risk_tags.append("รายได้ต่ำ (<10,000 บ.)")
    if is_low_allowance:
        risk_reasons.append("ได้เงินมาเรียนน้อย (<100 บ./วัน)")
        risk_tags.append("ค่าขนมน้อย (<100 บ.)")
    if needs_scholarship:
        risk_reasons.append("ต้องการทุนการศึกษา")
        risk_tags.append("ต้องการทุนการศึกษา")
    if sid == "69201020042":
        risk_reasons.append("ยังไม่กรอกข้อมูลพื้นฐาน")
        risk_tags.append("ข้อมูลไม่ครบ")

    if is_low_income or is_low_allowance or (needs_scholarship and "10000-15000" in income):
        fin_status = "ขัดสน"
    else:
        fin_status = "เพียงพอ"

    if ("น้ำกระท่อม" in sub_tags or "กัญชา" in sub_tags) or (has_sub_risk and (is_low_income or is_low_allowance)):
        risk_level = "กลุ่มมีปัญหา"
    elif len(risk_reasons) > 0:
        risk_level = "กลุ่มเสี่ยง"
    else:
        risk_level = "กลุ่มปกติ"

    student_obj = {
        "Student_ID": sid,
        "Prefix": str(r.get("คำนำหน้า", "")).strip() or "นาย",
        "Full_Name": str(r.get("ชื่อ-นามสกุล", "")).strip(),
        "Nickname": str(r.get("ชื่อเล่น", "")).strip(),
        "Gender": str(r.get("เพศ", "ชาย")).strip(),
        "Class_ID": class_id,
        "Level_Year": level_year,
        "Group_Label": group_label,
        "Group_No": grp,
        "Status": "ปกติ",
        "Phone_Number": stu_phone,
        "Parent_Name": str(r.get("ชื่อ-นามสกุล_ผู้ปกครอง", "")).strip(),
        "Parent_Phone": par_phone,
        "Emergency_Phone": emg_phone,
        "Emergency_Contact_Note": emg_phone_note or str(r.get("เบอร์โทรศัพท์มือถือ_ผู้ปกครอง_ฉุกเฉิน", "")).strip(),
        "Social_Contact": str(r.get("ข้อมูลการติดต่ออื่นๆ_IG_Facebook", "")).strip(),
        "Address": full_address,
        "House_No": house_no,
        "Road": road,
        "Subdistrict": subdist,
        "Zone_District": zone_district,
        "Zipcode": zipcode,
        "Home_Location": home_loc,
        "Photo_Status": str(r.get("สถานะรูปภาพ", "")).strip(),
        "Photo_URL": str(r.get("ลิงก์แสดงรูปภาพ_Direct", "")).strip(),
        "Commute_Method": str(r.get("นักเรียนเดินทางมาวิทยาลัยอย่างไร", "")).strip(),
        "Previous_School": str(r.get("นักเรียนจบมาจากโรงเรียนอะไร", r.get("สถานศึกษาเดิมที่นักเรียนจบมา", ""))).strip(),
        "Substance_Raw": sub_raw,
        "Substance_Clean": sub_clean,
        "Substance_Tags": sub_tags,
        "Data_Note": str(r.get("หมายเหตุการจัดการข้อมูล", "")).strip()
    }
    students_table.append(student_obj)

    screening_obj = {
        "Screening_ID": f"SCR-2569-{idx:03d}",
        "Academic_Term": "1/2569",
        "Student_ID": sid,
        "Family_Status": "อยู่ร่วมกัน",
        "Parent_Occupation": parent_job,
        "Family_Income_Range": income or "ไม่ระบุ",
        "Daily_Allowance": allowance or "ไม่ระบุ",
        "Scholarship_Need": scholarship or "ไม่ระบุ",
        "Financial_Status": fin_status,
        "Substance_Raw": sub_raw,
        "Substance_History": sub_clean,
        "Substance_Tags": sub_tags,
        "Risk_Reasons": risk_reasons,
        "Risk_Tags": risk_tags,
        "Risk_Factors_Note": ", ".join(risk_reasons) if risk_reasons else "ปกติ (ไม่พบความเสี่ยง)",
        "Overall_Risk_Level": risk_level,
        "Home_Visit_Status": "ยังไม่เยี่ยมบ้าน",
        "Home_Visit_Date": "",
        "Home_Visit_Photo": "",
        "Home_Visit_Summary": ""
    }
    screening_table.append(screening_obj)

db_bundle = {
    "metadata": {
        "app_name": "ระบบจัดการนักเรียนแผนกช่างกลโรงงานและเทคนิคอุตสาหกรรม",
        "schema_version": "3.0.0",
        "academic_year": "2569",
        "total_students": len(students_table)
    },
    "Class_Groups": class_groups,
    "Students": students_table,
    "Discipline_Records": [],
    "Screening_Records": screening_table,
    "Audit_Logs": [
        {
            "Log_ID": "LOG-INIT-003",
            "Timestamp": "2026-10-22T11:30:00+07:00",
            "Action": "อัปเกรดฐานข้อมูล V3 (บีบอัดขนาดไฟล์ประหยัดพื้นที่ + รองรับการนำเข้าชั้นปีอื่น ปวช.1-3 และ ปวส.1-2)",
            "Details": f"ฐานข้อมูลเริ่มต้น {len(students_table)} คน พร้อมระบบเพิ่มนักเรียนรายบุคคลและนำเข้ายกกลุ่ม"
        }
    ]
}

os.makedirs('data', exist_ok=True)
# บันทึกแบบ Minified JSON (ประหยัดพื้นที่สูงสุดสำหรับ GitHub และการโคลนข้ามเครื่อง)
with open('data/initial_db.json', 'w', encoding='utf-8') as f:
    json.dump(db_bundle, f, ensure_ascii=False, separators=(',', ':'))

with open('data/initial_db.js', 'w', encoding='utf-8') as f:
    f.write("window.INITIAL_RELATIONAL_DB=")
    json.dump(db_bundle, f, ensure_ascii=False, separators=(',', ':'))
    f.write(";\n")

# บีบอัดไฟล์ข้อมูลนักเรียน_รวมสมบูรณ์.json ให้ประหยัดพื้นที่เช่นกัน
with open('ข้อมูลนักเรียน_รวมสมบูรณ์.json', 'w', encoding='utf-8') as f:
    json.dump(raw_students, f, ensure_ascii=False, separators=(',', ':'))

# แทนที่ไฟล์ HTML เก่าขนาด 361KB ด้วยไฟล์ Redirect ขนาดจิ๋วไปยัง index.html
with open('ระบบดูข้อมูลและรูปภาพนักเรียน.html', 'w', encoding='utf-8') as f:
    f.write('<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><meta http-equiv="refresh" content="0; url=index.html"><title>กำลังเปลี่ยนเส้นทาง...</title></head><body><script>window.location.replace("index.html");</script></body></html>')

print("Optimized files generated successfully!")
for path in ['data/initial_db.js', 'data/initial_db.json', 'ข้อมูลนักเรียน_รวมสมบูรณ์.json', 'ระบบดูข้อมูลและรูปภาพนักเรียน.html']:
    print(f" - {path}: {os.path.getsize(path):,} bytes")
