from flask import Blueprint, request, jsonify, current_app, Response
from extensions import db
from models import Report, ReportImage, Engineer
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
import os
import base64
from werkzeug.utils import secure_filename
from flask import send_file
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Image, Table,
                                 TableStyle, HRFlowable, KeepTogether)
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, cm
from reportlab.pdfgen import canvas as rl_canvas
from io import BytesIO
from PIL import Image as PILImage
from routes.notification import broadcast_notification

report_bp = Blueprint('report', __name__)

REPORT_TYPES = ["commissioning", "investigation", "troubleshooting", "service"]

REPORT_TYPE_PREFIXES = {
    "commissioning":   "CR",
    "investigation":   "IR",
    "troubleshooting": "TR",
    "service":         "SR",
}

FLOTECH_INFO = {
    "name": "PT FLOTECH CONTROLS INDONESIA",
    "address": "Rukan Artha Gading Niaga, Blok F/7",
    "city": "Jl. Boulevard Artha Gading, Jakarta 14240",
    "telp": "Telp: +6221 45850778 / Fax: +6221 45850779",
    "email": "e-Mail: salesjkt@flotech.co.id / Website: www.flotech.com.sg",
}

# ─── Bilingual section/field labels ─────────────────────────────────────────
# Each report type maps to its sections with (section_title, [(field_key, field_label)])
# for both "en" and "id"

PDF_SECTIONS = {
    "en": {
        "commissioning": [
            ("SITE & EQUIPMENT INFORMATION", [
                ("site_location", "Site Location"),
                ("equipment_name", "Equipment Name"),
                ("equipment_model", "Equipment Model / Type"),
                ("serial_number", "Serial Number"),
                ("manufacturer", "Manufacturer"),
                ("installation_date", "Installation Date"),
            ]),
            ("PRE-COMMISSIONING CHECKS", [
                ("visual_inspection", "Visual Inspection Result"),
                ("safety_checks", "Safety Checks Performed"),
                ("electrical_checks", "Electrical Checks"),
                ("mechanical_checks", "Mechanical Checks"),
            ]),
            ("COMMISSIONING TEST RESULTS", [
                ("test_procedures", "Test Procedures Performed"),
                ("performance_parameters", "Performance Parameters (setpoints, values)"),
                ("test_results", "Test Results & Measurements"),
            ]),
            ("FINAL STATUS", [
                ("commissioning_result", "Commissioning Result"),
                ("issues_found", "Issues Found"),
                ("recommendations", "Recommendations"),
                ("client_acceptance", "Client Acceptance / Notes"),
            ]),
        ],
        "investigation": [
            ("INCIDENT INFORMATION", [
                ("incident_date", "Incident Date & Time"),
                ("incident_location", "Incident Location"),
                ("equipment_involved", "Equipment / System Involved"),
                ("reported_by", "Reported By"),
            ]),
            ("PROBLEM DESCRIPTION", [
                ("incident_description", "Incident Description"),
                ("symptoms_observed", "Symptoms Observed"),
                ("impact_severity", "Impact & Severity Level"),
            ]),
            ("INVESTIGATION FINDINGS", [
                ("investigation_method", "Investigation Method Used"),
                ("root_cause", "Root Cause Analysis"),
                ("contributing_factors", "Contributing Factors"),
                ("evidence_data", "Evidence & Supporting Data"),
            ]),
            ("CORRECTIVE ACTIONS", [
                ("immediate_actions", "Immediate Actions Taken"),
                ("long_term_actions", "Long-term Corrective Actions"),
                ("preventive_measures", "Preventive Measures"),
                ("follow_up", "Follow-up Required"),
                ("conclusion", "Conclusion"),
            ]),
        ],
        "troubleshooting": [
            ("PROBLEM IDENTIFICATION", [
                ("equipment_system", "Equipment / System"),
                ("location", "Location"),
                ("problem_reported_by", "Problem Reported By"),
                ("problem_date", "Date Problem Occurred"),
                ("problem_description", "Problem Description"),
            ]),
            ("DIAGNOSTIC PROCESS", [
                ("symptoms", "Symptoms Observed"),
                ("initial_assessment", "Initial Assessment"),
                ("diagnostic_steps", "Diagnostic Steps Taken"),
                ("tests_measurements", "Tests & Measurements Performed"),
                ("fault_found", "Fault / Root Cause Found"),
            ]),
            ("RESOLUTION", [
                ("solution_applied", "Solution Applied"),
                ("parts_replaced", "Parts / Components Replaced"),
                ("verification_tests", "Verification Tests After Fix"),
                ("result_after_fix", "Result After Fix"),
                ("recommendations", "Recommendations for Future"),
            ]),
        ],
        "service": [
            ("SERVICE INFORMATION", [
                ("equipment_asset", "Equipment / Asset Name"),
                ("asset_id", "Asset ID / Tag Number"),
                ("location", "Location"),
                ("service_type", "Service Type"),
                ("last_service_date", "Last Service Date"),
            ]),
            ("SERVICE PERFORMED", [
                ("work_description", "Work Description"),
                ("activities_performed", "Activities Performed (Detail)"),
                ("parts_used", "Parts / Materials Used"),
                ("calibration_data", "Calibration / Measurement Data"),
                ("service_duration", "Service Duration"),
            ]),
            ("FINDINGS & OBSERVATIONS", [
                ("condition_before", "Condition Before Service"),
                ("issues_found", "Issues / Anomalies Found"),
                ("condition_after", "Condition After Service"),
            ]),
            ("SERVICE OUTCOME", [
                ("service_result", "Service Result"),
                ("next_service_date", "Next Recommended Service Date"),
                ("recommendations", "Recommendations"),
                ("client_notes", "Client Notes / Sign-off"),
                ("follow_up", "Follow-up Required"),
            ]),
        ],
    },
    "id": {
        "commissioning": [
            ("INFORMASI LOKASI & PERALATAN", [
                ("site_location", "Lokasi Site"),
                ("equipment_name", "Nama Peralatan"),
                ("equipment_model", "Model / Tipe Peralatan"),
                ("serial_number", "Nomor Seri"),
                ("manufacturer", "Pabrikan / Manufaktur"),
                ("installation_date", "Tanggal Instalasi"),
            ]),
            ("PEMERIKSAAN PRA-KOMISIONING", [
                ("visual_inspection", "Hasil Inspeksi Visual"),
                ("safety_checks", "Pemeriksaan Keselamatan yang Dilakukan"),
                ("electrical_checks", "Pemeriksaan Kelistrikan"),
                ("mechanical_checks", "Pemeriksaan Mekanikal"),
            ]),
            ("HASIL PENGUJIAN KOMISIONING", [
                ("test_procedures", "Prosedur Pengujian yang Dilakukan"),
                ("performance_parameters", "Parameter Kinerja (setpoint, nilai)"),
                ("test_results", "Hasil Pengujian & Pengukuran"),
            ]),
            ("STATUS AKHIR", [
                ("commissioning_result", "Hasil Komisioning (Lulus/Gagal/Bersyarat)"),
                ("issues_found", "Temuan Masalah (jika ada)"),
                ("recommendations", "Rekomendasi"),
                ("client_acceptance", "Penerimaan / Catatan Klien"),
            ]),
        ],
        "investigation": [
            ("INFORMASI INSIDEN", [
                ("incident_date", "Tanggal & Waktu Insiden"),
                ("incident_location", "Lokasi Insiden"),
                ("equipment_involved", "Peralatan / Sistem yang Terlibat"),
                ("reported_by", "Dilaporkan Oleh"),
            ]),
            ("DESKRIPSI MASALAH", [
                ("incident_description", "Deskripsi Insiden"),
                ("symptoms_observed", "Gejala yang Teramati"),
                ("impact_severity", "Dampak & Tingkat Keparahan"),
            ]),
            ("TEMUAN INVESTIGASI", [
                ("investigation_method", "Metode Investigasi yang Digunakan"),
                ("root_cause", "Analisis Akar Penyebab (Root Cause Analysis)"),
                ("contributing_factors", "Faktor-faktor Penyebab"),
                ("evidence_data", "Bukti & Data Pendukung"),
            ]),
            ("TINDAKAN KOREKTIF", [
                ("immediate_actions", "Tindakan Segera yang Diambil"),
                ("long_term_actions", "Tindakan Korektif Jangka Panjang"),
                ("preventive_measures", "Langkah Pencegahan"),
                ("follow_up", "Tindak Lanjut yang Diperlukan"),
                ("conclusion", "Kesimpulan"),
            ]),
        ],
        "troubleshooting": [
            ("IDENTIFIKASI MASALAH", [
                ("equipment_system", "Peralatan / Sistem"),
                ("location", "Lokasi"),
                ("problem_reported_by", "Masalah Dilaporkan Oleh"),
                ("problem_date", "Tanggal Masalah Terjadi"),
                ("problem_description", "Deskripsi Masalah"),
            ]),
            ("PROSES DIAGNOSA", [
                ("symptoms", "Gejala yang Teramati"),
                ("initial_assessment", "Penilaian Awal"),
                ("diagnostic_steps", "Langkah-langkah Diagnosa"),
                ("tests_measurements", "Pengujian & Pengukuran yang Dilakukan"),
                ("fault_found", "Kerusakan / Akar Penyebab yang Ditemukan"),
            ]),
            ("PENYELESAIAN", [
                ("solution_applied", "Solusi yang Diterapkan"),
                ("parts_replaced", "Suku Cadang / Komponen yang Diganti"),
                ("verification_tests", "Pengujian Verifikasi Setelah Perbaikan"),
                ("result_after_fix", "Hasil Setelah Perbaikan"),
                ("recommendations", "Rekomendasi untuk ke Depan"),
            ]),
        ],
        "service": [
            ("INFORMASI SERVIS", [
                ("equipment_asset", "Nama Peralatan / Aset"),
                ("asset_id", "ID Aset / Nomor Tag"),
                ("location", "Lokasi"),
                ("service_type", "Jenis Servis (Preventif / Korektif / Berkala)"),
                ("last_service_date", "Tanggal Servis Terakhir"),
            ]),
            ("PEKERJAAN SERVIS", [
                ("work_description", "Deskripsi Pekerjaan"),
                ("activities_performed", "Kegiatan yang Dilakukan (Detail)"),
                ("parts_used", "Suku Cadang / Material yang Digunakan"),
                ("calibration_data", "Data Kalibrasi / Pengukuran"),
                ("service_duration", "Durasi Servis (jam)"),
            ]),
            ("TEMUAN & OBSERVASI", [
                ("condition_before", "Kondisi Sebelum Servis"),
                ("issues_found", "Masalah / Anomali yang Ditemukan"),
                ("condition_after", "Kondisi Setelah Servis"),
            ]),
            ("HASIL SERVIS", [
                ("service_result", "Hasil Servis (Lulus / Gagal / Bersyarat)"),
                ("next_service_date", "Tanggal Servis Berikutnya yang Direkomendasikan"),
                ("recommendations", "Rekomendasi"),
                ("client_notes", "Catatan Klien / Tanda Tangan"),
                ("follow_up", "Tindak Lanjut yang Diperlukan"),
            ]),
        ],
    },
}

# Bilingual report type labels for header
REPORT_TYPE_HEADER_LABELS = {
    "en": {
        "commissioning":   "COMMISSIONING REPORT",
        "investigation":   "INVESTIGATION REPORT",
        "troubleshooting": "TROUBLESHOOTING REPORT",
        "service":         "SERVICE REPORT",
    },
    "id": {
        "commissioning":   "LAPORAN KOMISIONING",
        "investigation":   "LAPORAN INVESTIGASI",
        "troubleshooting": "LAPORAN TROUBLESHOOTING",
        "service":         "LAPORAN SERVIS",
    },
}

# Bilingual info row labels (Date, Client, Engineer, Type)
INFO_ROW_LABELS = {
    "en": {
        "report_no": "Report No.",
        "date":      "Date",
        "client":    "Client",
        "engineer":  "Engineer",
        "project":   "Project",
        "type":      "Type",
    },
    "id": {
        "report_no": "No. Laporan",
        "date":      "Tanggal",
        "client":    "Klien",
        "engineer":  "Engineer",
        "project":   "Proyek",
        "type":      "Tipe",
    },
}

# Bilingual section/signature labels
SIGNATURE_LABELS = {
    "en": {
        "engineer":    "ENGINEER",
        "client":      "CLIENT / CUSTOMER",
        "name_stamp":  "Name & Stamp",
        "date_line":   "Date: ________________",
        "photos":      "DOCUMENTATION & PHOTOS",
        "signatures":  "SIGNATURES",
        "photo_prefix": "Photo",
        "digital_notice": "This document is digitally generated by the system of PT Flotech Controls Indonesia",
        "issued":      "Issued",
        "doc_number":  "Document number",
        "valid_note":  "This digital document is valid without a wet signature.",
        "generated":   "Generated",
        "page_of":     "Page {page} of {total}",
    },
    "id": {
        "engineer":    "ENGINEER / TEKNISI",
        "client":      "PELANGGAN / KLIEN",
        "name_stamp":  "Nama & Stempel",
        "date_line":   "Tanggal: ________________",
        "photos":      "DOKUMENTASI & FOTO",
        "signatures":  "TANDA TANGAN",
        "photo_prefix": "Foto",
        "digital_notice": "Dokumen ini dibuat secara digital oleh sistem PT Flotech Controls Indonesia",
        "issued":      "Diterbitkan",
        "doc_number":  "Nomor dokumen",
        "valid_note":  "Dokumen digital ini sah tanpa tanda tangan basah.",
        "generated":   "Dibuat",
        "page_of":     "Halaman {page} dari {total}",
    },
}


@report_bp.route('/create', methods=['POST'])
@jwt_required()
def create_report():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    report_type = data.get("report_type", "").lower()
    if report_type not in REPORT_TYPES:
        return jsonify({"error": f"Invalid report type. Must be one of: {REPORT_TYPES}"}), 400

    report_date = None
    if data.get("report_date"):
        try: report_date = datetime.strptime(data["report_date"], "%Y-%m-%d").date()
        except: pass

    prefix = REPORT_TYPE_PREFIXES.get(report_type, "RPT")
    now = datetime.utcnow()
    year_str = now.strftime("%Y")
    date_str = now.strftime("%Y%m%d")
    report_number = data.get("report_number") or ""
    if not report_number:
        year_reports = Report.query.filter(
            Report.report_type == report_type,
            Report.report_number.like(f"{prefix}-{year_str}%")
        ).all()
        seqs = []
        for rpt in year_reports:
            try:
                seqs.append(int((rpt.report_number or "").split("-")[-1]))
            except:
                pass
        next_seq = max(seqs) + 1 if seqs else 1
        report_number = f"{prefix}-{date_str}-{str(next_seq).zfill(3)}"

    report = Report(
        report_number=report_number,
        report_type=report_type,
        client_name=data.get("client_name"),
        project_name=data.get("project_name"),
        engineer_id=data.get("engineer_id"),
        report_date=report_date,
        status=data.get("status", "draft"),
        data_json=data.get("data_json", {}),
        created_by=user_id,
    )
    db.session.add(report)
    db.session.commit()

    type_labels = {
        "commissioning": "Commissioning Report",
        "investigation": "Investigation Report",
        "troubleshooting": "Troubleshooting Report",
        "service": "Service Report",
    }
    rtype_label = type_labels.get(report_type, "Field Report")
    broadcast_notification(
        exclude_user_id=user_id,
        type="report_created",
        title=f"New {rtype_label} Created",
        message=f"{report.report_number} — Client: {report.client_name or '-'}",
        link=f"/reports/{report.id}",
        actor_id=user_id,
    )

    return jsonify({"message": "Report created", "id": report.id, "report_id": report.id}), 201


@report_bp.route('/list', methods=['GET'])
@jwt_required()
def list_reports():
    query = Report.query
    search = request.args.get("search")
    if search:
        query = query.filter(db.or_(
            Report.report_number.ilike(f"%{search}%"),
            Report.client_name.ilike(f"%{search}%"),
            Report.project_name.ilike(f"%{search}%"),
        ))
    if request.args.get("type"): query = query.filter(Report.report_type == request.args.get("type"))
    if request.args.get("status"): query = query.filter(Report.status == request.args.get("status"))
    if request.args.get("engineer_id"): query = query.filter(Report.engineer_id == int(request.args.get("engineer_id")))
    if request.args.get("date_from"):
        try: query = query.filter(Report.report_date >= datetime.strptime(request.args.get("date_from"), "%Y-%m-%d").date())
        except: pass
    if request.args.get("date_to"):
        try: query = query.filter(Report.report_date <= datetime.strptime(request.args.get("date_to"), "%Y-%m-%d").date())
        except: pass
    reports = query.order_by(Report.created_at.desc()).all()
    result = []
    for r in reports:
        engineer_name = None
        if r.engineer_id:
            eng = Engineer.query.get(r.engineer_id)
            if eng: engineer_name = eng.name
        result.append({
            "id": r.id, "report_number": r.report_number, "report_type": r.report_type,
            "client_name": r.client_name, "project_name": r.project_name,
            "engineer_id": r.engineer_id,
            "engineer_name": engineer_name,
            "report_date": r.report_date.isoformat() if r.report_date else None,
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None
        })
    return jsonify(result), 200


@report_bp.route('/upload/<int:report_id>', methods=['POST'])
@jwt_required()
def upload_images(report_id):
    report = Report.query.get(report_id)
    if not report:
        return jsonify({"error": "Report not found"}), 404

    files = request.files.getlist("images")
    if not files:
        return jsonify({"error": "No files uploaded"}), 400

    saved_files = []
    MAX_DIMENSION = 1280
    JPEG_QUALITY  = 80
    SIZE_THRESHOLD = 500 * 1024

    for file in files:
        if not file.filename:
            continue

        base = secure_filename(file.filename)
        base_no_ext = base.rsplit(".", 1)[0] if "." in base else base
        filename = f"{base_no_ext}.jpg"

        dest_path = os.path.join(current_app.config["UPLOAD_FOLDER"], filename)
        if os.path.exists(dest_path):
            import uuid
            filename = f"{base_no_ext}_{uuid.uuid4().hex[:8]}.jpg"
            dest_path = os.path.join(current_app.config["UPLOAD_FOLDER"], filename)

        try:
            img = PILImage.open(file.stream).convert("RGB")
            w, h = img.size
            if w > MAX_DIMENSION or h > MAX_DIMENSION:
                ratio = min(MAX_DIMENSION / w, MAX_DIMENSION / h)
                img = img.resize((int(w * ratio), int(h * ratio)), PILImage.LANCZOS)
            buf = BytesIO()
            img.save(buf, format="JPEG", quality=JPEG_QUALITY, optimize=True)
            buf.seek(0)
            with open(dest_path, "wb") as f_out:
                f_out.write(buf.read())
        except Exception as e:
            file.stream.seek(0)
            with open(dest_path, "wb") as f_out:
                f_out.write(file.stream.read())

        db.session.add(ReportImage(report_id=report_id, file_path=filename))
        saved_files.append(filename)

    db.session.commit()
    return jsonify({"message": "Images uploaded", "files": saved_files}), 201


@report_bp.route('/image/delete/<int:image_id>', methods=['DELETE'])
@jwt_required()
def delete_image(image_id):
    img = ReportImage.query.get(image_id)
    if not img: return jsonify({"error": "Image not found"}), 404
    try:
        fp = os.path.join(current_app.config["UPLOAD_FOLDER"], img.file_path) if not os.path.isabs(img.file_path) else img.file_path
        if os.path.exists(fp): os.remove(fp)
    except: pass
    db.session.delete(img)
    db.session.commit()
    return jsonify({"message": "Image deleted"}), 200


@report_bp.route('/image/caption/<int:image_id>', methods=['PUT'])
@jwt_required()
def update_image_caption(image_id):
    img = ReportImage.query.get(image_id)
    if not img: return jsonify({"error": "Image not found"}), 404
    data = request.get_json()
    img.caption = data.get("caption", "")
    db.session.commit()
    return jsonify({"message": "Caption updated"}), 200


@report_bp.route('/detail/<int:report_id>', methods=['GET'])
@jwt_required()
def get_report_detail(report_id):
    report = Report.query.get(report_id)
    if not report: return jsonify({"error": "Report not found"}), 404
    engineer_data = None
    if report.engineer_id:
        eng = Engineer.query.get(report.engineer_id)
        if eng:
            engineer_data = {"id": eng.id, "name": eng.name, "employee_id": eng.employee_id,
                             "position": eng.position, "department": eng.department,
                             "certification": eng.certification, "signature_data": eng.signature_data}
    images = [{"id": img.id, "file_path": img.file_path,
                "caption": getattr(img, 'caption', '') or "",
                "uploaded_at": img.uploaded_at.isoformat() if img.uploaded_at else None}
              for img in report.images]
    return jsonify({
        "id": report.id, "report_number": report.report_number, "report_type": report.report_type,
        "client_name": report.client_name, "project_name": report.project_name,
        "engineer": engineer_data,
        "report_date": report.report_date.isoformat() if report.report_date else None,
        "status": report.status, "data_json": report.data_json, "images": images
    }), 200


@report_bp.route('/update/<int:report_id>', methods=['PUT'])
@jwt_required()
def update_report(report_id):
    report = Report.query.get(report_id)
    if not report: return jsonify({"error": "Report not found"}), 404
    data = request.get_json()
    if data.get("report_number"): report.report_number = data["report_number"]
    if data.get("client_name") is not None: report.client_name = data["client_name"]
    if data.get("project_name") is not None: report.project_name = data["project_name"]
    if data.get("report_date"):
        try: report.report_date = datetime.strptime(data["report_date"], "%Y-%m-%d").date()
        except: pass
    if "engineer_id" in data: report.engineer_id = data["engineer_id"] if data["engineer_id"] else None
    if data.get("status"): report.status = data["status"]
    if data.get("data_json") is not None: report.data_json = data["data_json"]
    db.session.commit()
    return jsonify({"message": "Report updated"}), 200


@report_bp.route('/status/<int:report_id>', methods=['PUT'])
@jwt_required()
def update_status(report_id):
    report = Report.query.get(report_id)
    if not report: return jsonify({"error": "Report not found"}), 404
    report.status = request.get_json().get("status", report.status)
    db.session.commit()
    return jsonify({"message": "Status updated"}), 200


@report_bp.route('/delete/<int:report_id>', methods=['DELETE'])
@jwt_required()
def delete_report(report_id):
    report = Report.query.get(report_id)
    if not report: return jsonify({"error": "Report not found"}), 404
    for img in report.images:
        try:
            fp = os.path.join(current_app.config["UPLOAD_FOLDER"], img.file_path) if not os.path.isabs(img.file_path) else img.file_path
            if os.path.exists(fp): os.remove(fp)
        except: pass
        db.session.delete(img)
    db.session.delete(report)
    db.session.commit()
    return jsonify({"message": "Report deleted"}), 200


# ─────────────────────────────────────────────────────────────────────────────
# PDF BUILDER — bilingual, client signature toggle
# ─────────────────────────────────────────────────────────────────────────────
def build_report_pdf(report_id):
    report = Report.query.get(report_id)
    if not report: return None
    engineer = Engineer.query.get(report.engineer_id) if report.engineer_id else None
    data = report.data_json or {}

    # ── Read settings stored in data_json ────────────────────────────────────
    lang = data.get("_lang", "en")
    if lang not in ("en", "id"):
        lang = "en"
    include_client_sig = bool(data.get("_include_client_signature", True))

    lbl = SIGNATURE_LABELS[lang]
    info_lbl = INFO_ROW_LABELS[lang]

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
        topMargin=2*cm, bottomMargin=3.5*cm, leftMargin=2*cm, rightMargin=2*cm)

    primary_color   = colors.HexColor("#0B3D91")
    secondary_color = colors.HexColor("#1E5CC6")
    accent_color    = colors.HexColor("#EEF3FB")
    dark_color      = colors.HexColor("#1a1a2e")
    text_color      = colors.HexColor("#374151")
    light_gray      = colors.HexColor("#F3F4F6")
    border_gray     = colors.HexColor("#D1D5DB")
    gray_color      = colors.HexColor("#6B7280")

    def ps(name, **kw):
        d = dict(fontName='Helvetica', fontSize=10, textColor=text_color, leading=14)
        d.update(kw); return ParagraphStyle(name, **d)

    title_style          = ps('Title', fontSize=18, fontName='Helvetica-Bold', textColor=primary_color, alignment=2)
    subtitle_style       = ps('Subtitle', fontSize=9, textColor=colors.HexColor("#1a1a2e"), alignment=2)
    section_header_style = ps('SH', fontSize=10, fontName='Helvetica-Bold', textColor=primary_color, spaceBefore=12, spaceAfter=4)
    label_style          = ps('Label', fontSize=9, fontName='Helvetica-Bold', textColor=gray_color)
    value_style          = ps('Value', fontSize=10, textColor=dark_color)
    body_style           = ps('Body', fontSize=10, textColor=text_color, spaceAfter=4, leading=15, wordWrap='LTR')
    caption_style        = ps('Caption', fontSize=8, textColor=gray_color, alignment=1, leading=11, spaceBefore=3, spaceAfter=6)

    elements = []

    # ─── HEADER ──────────────────────────────────────────────────
    logo_path = os.path.join(current_app.root_path, "assets", "logo.png")
    if os.path.exists(logo_path):
        try:
            pil_logo = PILImage.open(logo_path)
            lw, lh = pil_logo.size
            target_h = 1.8*cm
            target_w = target_h * lw / lh
            logo_img = Image(logo_path, width=target_w, height=target_h)
        except:
            logo_img = Paragraph("<b>FLOTECH</b>", ps('LF', fontName='Helvetica-Bold', fontSize=16, textColor=primary_color))
    else:
        logo_img = Paragraph("<b>FLOTECH</b>", ps('LF2', fontName='Helvetica-Bold', fontSize=16, textColor=primary_color))

    header_title = REPORT_TYPE_HEADER_LABELS.get(lang, {}).get(report.report_type or "", "FIELD REPORT")
    header_right_block = Table(
        [[Paragraph(header_title, title_style)],
         [Paragraph(FLOTECH_INFO["name"], subtitle_style)],
         [Paragraph(f"{FLOTECH_INFO['address']} · {FLOTECH_INFO['city']}", subtitle_style)]],
        colWidths=[10*cm])
    header_right_block.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'RIGHT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 2),
    ]))

    header_t = Table([[logo_img, header_right_block]], colWidths=[7*cm, 10*cm])
    header_t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), accent_color),
        ('PADDING', (0,0), (-1,-1), 12),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ALIGN', (0,0), (0,0), 'LEFT'),
        ('ALIGN', (1,0), (1,0), 'RIGHT'),
        ('ROUNDEDCORNERS', [8]),
    ]))
    elements.append(header_t)
    elements.append(Spacer(1, 0.5*cm))

    # ─── INFO TABLE ──────────────────────────────────────────────
    rdate = report.report_date.strftime("%d %B %Y") if report.report_date else "-"
    eng_name = engineer.name if engineer else "-"
    report_type_label = (report.report_type or "FIELD").upper()

    info_table_data = [
        [Paragraph(f"<b>{info_lbl['report_no']}</b>", label_style),
         Paragraph(report.report_number or "-", ps('RN', fontSize=11, fontName='Helvetica-Bold', textColor=primary_color)),
         Paragraph(f"<b>{info_lbl['date']}</b>", label_style),
         Paragraph(rdate, value_style)],
        [Paragraph(f"<b>{info_lbl['client']}</b>", label_style),
         Paragraph(report.client_name or "-", value_style),
         Paragraph(f"<b>{info_lbl['engineer']}</b>", label_style),
         Paragraph(eng_name, value_style)],
        [Paragraph(f"<b>{info_lbl['project']}</b>", label_style),
         Paragraph(report.project_name or "-", value_style),
         Paragraph(f"<b>{info_lbl['type']}</b>", label_style),
         Paragraph(report_type_label, ps('T', fontSize=10, fontName='Helvetica-Bold', textColor=secondary_color))],
    ]
    info_table = Table(info_table_data, colWidths=[3*cm, 6*cm, 3*cm, 5*cm])
    info_table.setStyle(TableStyle([
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [accent_color, colors.white, accent_color]),
        ('BOX', (0, 0), (-1, -1), 0.5, border_gray),
        ('LINEAFTER', (1, 0), (1, -1), 0.5, border_gray),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 0.5*cm))

    # ─── Section visibility ───────────────────────────────────────
    _sv = data.get("_section_visibility", {})
    def _sv_key(idx):
        return bool(_sv.get(str(idx), _sv.get(idx, True)))

    def section_title(text):
        elements.append(Paragraph(f"▌ {text}", section_header_style))
        elements.append(HRFlowable(width="100%", thickness=0.5, color=border_gray))
        elements.append(Spacer(1, 0.2*cm))

    def info_row(label, value):
        if not value: return
        safe_value = str(value).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        row = [[Paragraph(label, label_style), Paragraph(safe_value, value_style)]]
        t = Table(row, colWidths=[5*cm, 12*cm])
        t.setStyle(TableStyle([('PADDING', (0, 0), (-1, -1), 6), ('LINEBELOW', (0, 0), (-1, 0), 0.3, border_gray), ('VALIGN', (0, 0), (-1, -1), 'TOP')]))
        elements.append(t)

    def text_block(label, text):
        if not text: return
        safe_text = str(text).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        safe_text = safe_text.replace("\n", "<br/>")
        bd = [[Paragraph(f"<b>{label}</b>", label_style)], [Paragraph(safe_text, body_style)]]
        t = Table(bd, colWidths=[17*cm])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), accent_color),
            ('BOX', (0, 0), (-1, -1), 0.3, border_gray),
            ('PADDING', (0, 0), (-1, -1), 7),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        elements.append(t)
        elements.append(Spacer(1, 0.2*cm))

    # ─── Determine field type for a key ──────────────────────────
    # Keys that are typically "short" info rows (not full text blocks)
    SHORT_KEYS = {
        "site_location", "equipment_name", "equipment_model", "serial_number",
        "manufacturer", "installation_date", "commissioning_result",
        "incident_date", "incident_location", "equipment_involved", "reported_by",
        "equipment_system", "location", "problem_reported_by", "problem_date",
        "result_after_fix",
        "equipment_asset", "asset_id", "service_type", "last_service_date",
        "service_duration", "service_result", "next_service_date",
    }

    # ─── Build body using bilingual section map ───────────────────
    rtype = (report.report_type or "").lower()
    lang_sections = PDF_SECTIONS.get(lang, PDF_SECTIONS["en"]).get(rtype)

    if lang_sections:
        for si, (section_name, fields) in enumerate(lang_sections):
            if not _sv_key(si):
                continue
            section_title(section_name)
            for key, field_label in fields:
                val = data.get(key)
                if not val:
                    continue
                if key in SHORT_KEYS:
                    info_row(field_label, val)
                else:
                    text_block(field_label, val)
            elements.append(Spacer(1, 0.3*cm))
    else:
        # Generic fallback
        if data:
            section_title("REPORT DATA" if lang == "en" else "DATA LAPORAN")
            for k, v in data.items():
                if k.startswith("_"): continue
                if v: text_block(k.replace("_", " ").title(), v)

    # ─── IMAGES ──────────────────────────────────────────────────
    if report.images:
        elements.append(Spacer(1, 0.3*cm))
        section_title(lbl["photos"])
        img_table_data = []
        row_imgs = []
        row_caps = []
        for i, img_obj in enumerate(report.images):
            try:
                upload_folder = current_app.config["UPLOAD_FOLDER"]
                img_path = os.path.join(upload_folder, img_obj.file_path) if not os.path.isabs(img_obj.file_path) else img_obj.file_path
                if not os.path.exists(img_path): img_path = img_obj.file_path
                if os.path.exists(img_path):
                    pil_img = PILImage.open(img_path)
                    w, h = pil_img.size
                    max_w, max_h = 8*cm, 6*cm
                    ratio = min(max_w / w, max_h / h)
                    rl_img = Image(img_path, width=w*ratio, height=h*ratio)
                    rl_img.hAlign = 'CENTER'
                    row_imgs.append(rl_img)
                else:
                    row_imgs.append(Paragraph("Image not found", body_style))
            except:
                row_imgs.append(Paragraph("Image error", body_style))

            caption_text = getattr(img_obj, 'caption', '') or ""
            safe_caption = caption_text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            row_caps.append(Paragraph(
                f"{lbl['photo_prefix']} {i+1}" + (f": {safe_caption}" if safe_caption else ""),
                caption_style
            ))

            if len(row_imgs) == 2 or i == len(report.images) - 1:
                while len(row_imgs) < 2: row_imgs.append(""); row_caps.append("")
                img_table_data.append(row_imgs)
                img_table_data.append(row_caps)
                row_imgs, row_caps = [], []

        if img_table_data:
            img_t = Table(img_table_data, colWidths=[8.5*cm, 8.5*cm])
            img_t.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('PADDING', (0, 0), (-1, -1), 6),
                ('BOX', (0, 0), (0, -1), 0.3, border_gray),
                ('BOX', (1, 0), (1, -1), 0.3, border_gray),
                ('LINEBELOW', (0, 0), (-1, -1), 0.2, border_gray),
            ]))
            elements.append(img_t)

    # ─── SIGNATURE ───────────────────────────────────────────────
    sig_col_w = 8.5*cm
    sig_label_style = ps('SigLabel', fontSize=9, fontName='Helvetica-Bold', textColor=primary_color, alignment=1)
    sig_sub_style   = ps('SigSub', fontSize=8, textColor=gray_color, alignment=1)

    eng_sig_cell = Spacer(1, 1.5*cm)
    if engineer and engineer.signature_data:
        try:
            sig_b64 = engineer.signature_data
            if "base64," in sig_b64: sig_b64 = sig_b64.split("base64,")[1]
            sig_bytes = base64.b64decode(sig_b64)
            sig_pil = PILImage.open(BytesIO(sig_bytes)).convert("RGBA")
            sig_buf = BytesIO()
            sig_pil.save(sig_buf, format="PNG")
            sig_buf.seek(0)
            eng_sig_cell = Image(sig_buf, width=4*cm, height=1.5*cm)
            eng_sig_cell.hAlign = 'CENTER'
        except: pass

    if include_client_sig:
        # Two-column signature: Engineer | Client
        sig_rows = [
            [Paragraph(lbl["engineer"], sig_label_style), Paragraph(lbl["client"], sig_label_style)],
            [eng_sig_cell, Spacer(1, 1.5*cm)],
            [HRFlowable(width=6*cm, thickness=0.5, color=border_gray), HRFlowable(width=6*cm, thickness=0.5, color=border_gray)],
            [Paragraph(engineer.name if engineer else "Engineer", sig_sub_style), Paragraph(lbl["name_stamp"], sig_sub_style)],
        ]
        if engineer:
            sig_rows.append([
                Paragraph(f"{engineer.position or ''}{' | ' + engineer.employee_id if engineer.employee_id else ''}", sig_sub_style),
                Paragraph(lbl["date_line"], sig_sub_style)
            ])
        sig_col_widths = [sig_col_w, sig_col_w]
        sig_t = Table(sig_rows, colWidths=sig_col_widths)
        sig_t.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('PADDING', (0, 0), (-1, -1), 8),
            ('BOX', (0, 0), (0, -1), 0.5, border_gray),
            ('BOX', (1, 0), (1, -1), 0.5, border_gray),
            ('BACKGROUND', (0, 0), (0, 0), accent_color),
            ('BACKGROUND', (1, 0), (1, 0), accent_color),
        ]))
    else:
        # Single-column: Engineer only, centred
        full_w = 17*cm
        sig_rows = [
            [Paragraph(lbl["engineer"], sig_label_style)],
            [eng_sig_cell],
            [HRFlowable(width=8*cm, thickness=0.5, color=border_gray)],
            [Paragraph(engineer.name if engineer else "Engineer", sig_sub_style)],
        ]
        if engineer:
            sig_rows.append([
                Paragraph(f"{engineer.position or ''}{' | ' + engineer.employee_id if engineer.employee_id else ''}", sig_sub_style)
            ])
        sig_t = Table(sig_rows, colWidths=[full_w])
        sig_t.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('PADDING', (0, 0), (-1, -1), 8),
            ('BOX', (0, 0), (-1, -1), 0.5, border_gray),
            ('BACKGROUND', (0, 0), (-1, 0), accent_color),
        ]))

    # ─── DIGITAL DOCUMENT NOTICE ──────────────────────────────────
    gen_ts = datetime.now().strftime("%d %B %Y, %H:%M WIB")
    digital_notice = Table([[
        Paragraph(
            f'<font color="#6B7280" size="7.5">'
            f'&#128274;  {lbl["digital_notice"]}'
            f'  \xb7  {lbl["issued"]}: {gen_ts}'
            f'  \xb7  {lbl["doc_number"]}: {report.report_number or "-"}'
            f'  \xb7  {lbl["valid_note"]}</font>',
            ps('DN', fontSize=7.5, textColor=colors.HexColor("#6B7280"), alignment=1, leading=11)
        )
    ]], colWidths=[17*cm])
    digital_notice.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFF")),
        ('BOX',        (0, 0), (-1, -1), 0.5, colors.HexColor("#DBEAFE")),
        ('TOPPADDING',    (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING',   (0, 0), (-1, -1), 10),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 10),
    ]))

    sig_block = KeepTogether([
        Spacer(1, 0.6*cm),
        Paragraph(f"▌ {lbl['signatures']}", section_header_style),
        HRFlowable(width="100%", thickness=0.5, color=border_gray),
        Spacer(1, 0.15*cm),
        sig_t,
        Spacer(1, 0.3*cm),
        digital_notice,
    ])
    elements.append(sig_block)

    # ─── FOOTER ──────────────────────────────────────────────────
    class NumberedCanvas(rl_canvas.Canvas):
        def __init__(self, *args, **kwargs):
            rl_canvas.Canvas.__init__(self, *args, **kwargs)
            self._saved_page_states = []

        def showPage(self):
            self._saved_page_states.append(dict(self.__dict__))
            self._startPage()

        def save(self):
            total = len(self._saved_page_states)
            for state in self._saved_page_states:
                self.__dict__.update(state)
                self._draw_footer(self._pageNumber, total)
                rl_canvas.Canvas.showPage(self)
            rl_canvas.Canvas.save(self)

        def _draw_footer(self, page_num, total):
            self.saveState()
            pw, ph = A4
            self.setStrokeColor(primary_color)
            self.setLineWidth(1)
            self.line(2*cm, 2.8*cm, pw - 2*cm, 2.8*cm)
            self.setFont("Helvetica-Bold", 9)
            self.setFillColor(primary_color)
            self.drawCentredString(pw/2, 2.3*cm, FLOTECH_INFO["name"])
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#6B7280"))
            self.drawCentredString(pw/2, 2.0*cm, f"{FLOTECH_INFO['address']}  |  {FLOTECH_INFO['city']}")
            self.drawCentredString(pw/2, 1.7*cm, FLOTECH_INFO["telp"])
            self.drawCentredString(pw/2, 1.4*cm, FLOTECH_INFO["email"])
            self.setFillColor(colors.HexColor("#9CA3AF"))
            page_label = lbl["page_of"].format(page=page_num, total=total)
            gen_label = lbl["generated"]
            self.drawCentredString(pw/2, 1.0*cm,
                f"{gen_label}: {datetime.now().strftime('%d %B %Y %H:%M')}  \xb7  {page_label}")
            self.restoreState()

    doc.build(elements, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    return buffer


@report_bp.route('/pdf/<int:report_id>', methods=['GET'])
@jwt_required()
def generate_pdf(report_id):
    report = Report.query.get(report_id)
    if not report: return jsonify({"error": "Report not found"}), 404
    buf = build_report_pdf(report_id)
    if not buf: return jsonify({"error": "PDF generation failed"}), 500
    return send_file(buf, as_attachment=True,
        download_name=f"{report.report_number or 'report'}_{report.report_type}.pdf",
        mimetype="application/pdf")


@report_bp.route('/pdf/preview/<int:report_id>', methods=['GET'])
@jwt_required()
def preview_pdf(report_id):
    report = Report.query.get(report_id)
    if not report: return jsonify({"error": "Report not found"}), 404
    buf = build_report_pdf(report_id)
    if not buf: return jsonify({"error": "PDF generation failed"}), 500
    return Response(buf, mimetype="application/pdf",
        headers={"Content-Disposition": f"inline; filename={report.report_number}_{report.report_type}.pdf"})