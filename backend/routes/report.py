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

    # ── Auto report number: PREFIX-YYYYMMDD-NNN, reset tiap tahun ────────────
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
    if not report: return jsonify({"error": "Report not found"}), 404
    files = request.files.getlist("images")
    if not files: return jsonify({"error": "No files uploaded"}), 400
    saved_files = []
    for file in files:
        if file.filename == "": continue
        filename = secure_filename(file.filename)
        file_path = os.path.join(current_app.config["UPLOAD_FOLDER"], filename)
        file.save(file_path)
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
# PDF BUILDER
# ─────────────────────────────────────────────────────────────────────────────
def build_report_pdf(report_id):
    report = Report.query.get(report_id)
    if not report: return None
    engineer = Engineer.query.get(report.engineer_id) if report.engineer_id else None

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
    body_style           = ps('Body', fontSize=10, textColor=text_color, spaceAfter=4, leading=14)
    caption_style        = ps('Caption', fontSize=8, textColor=gray_color, alignment=1, leading=11, spaceBefore=3, spaceAfter=6)

    elements = []

    report_type_label = (report.report_type or "FIELD").upper()

    # ─── HEADER: logo + report type title block ──────────────────
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

    type_labels = {
        "commissioning": "COMMISSIONING REPORT",
        "investigation": "INVESTIGATION REPORT",
        "troubleshooting": "TROUBLESHOOTING REPORT",
        "service": "SERVICE REPORT",
    }
    header_title = type_labels.get(report.report_type or "", "FIELD REPORT")
    header_right = Table([[
        Paragraph(header_title, title_style),
        Paragraph(FLOTECH_INFO["name"], subtitle_style),
        Paragraph(FLOTECH_INFO["city"], subtitle_style),
    ]], colWidths=[None])
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
    info_table_data = [
        [Paragraph("<b>Report No.</b>", label_style), Paragraph(report.report_number or "-", ps('RN', fontSize=11, fontName='Helvetica-Bold', textColor=primary_color)),
         Paragraph("<b>Date</b>", label_style), Paragraph(rdate, value_style)],
        [Paragraph("<b>Client</b>", label_style), Paragraph(report.client_name or "-", value_style),
         Paragraph("<b>Engineer</b>", label_style), Paragraph(eng_name, value_style)],
        [Paragraph("<b>Project</b>", label_style), Paragraph(report.project_name or "-", value_style),
         Paragraph("<b>Type</b>", label_style), Paragraph(report_type_label, ps('T', fontSize=10, fontName='Helvetica-Bold', textColor=secondary_color))],
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

    data = report.data_json or {}
    rtype = (report.report_type or "").lower()

    # ── Section visibility from _section_visibility stored in data_json ──────
    _sv = data.get("_section_visibility", {})
    def _sv_key(idx):
        """Check if section index idx should appear in PDF (default True)."""
        return bool(_sv.get(str(idx), _sv.get(idx, True)))

    def section_title(text):
        elements.append(Paragraph(f"▌ {text}", section_header_style))
        elements.append(HRFlowable(width="100%", thickness=0.5, color=border_gray))
        elements.append(Spacer(1, 0.2*cm))

    def info_row(label, value):
        if not value: return
        row = [[Paragraph(label, label_style), Paragraph(str(value), value_style)]]
        t = Table(row, colWidths=[5*cm, 12*cm])
        t.setStyle(TableStyle([('PADDING', (0, 0), (-1, -1), 6), ('LINEBELOW', (0, 0), (-1, 0), 0.3, border_gray), ('VALIGN', (0, 0), (-1, -1), 'TOP')]))
        elements.append(t)

    def text_block(label, text):
        if not text: return
        bd = [[Paragraph(f"<b>{label}</b>", label_style)], [Paragraph(str(text), body_style)]]
        t = Table(bd, colWidths=[17*cm])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), accent_color),
            ('BOX', (0, 0), (-1, -1), 0.3, border_gray),
            ('PADDING', (0, 0), (-1, -1), 7),
        ]))
        elements.append(t)
        elements.append(Spacer(1, 0.2*cm))

    if rtype == "commissioning":
        # Section 0: Site & Equipment Information
        if _sv_key(0):
            section_title("SITE & EQUIPMENT INFORMATION")
            for k, l in [("site_location","Site Location"),("equipment_name","Equipment Name"),
                         ("equipment_model","Equipment Model"),("serial_number","Serial Number"),
                         ("manufacturer","Manufacturer"),("installation_date","Installation Date")]:
                info_row(l, data.get(k))
            elements.append(Spacer(1, 0.3*cm))
        # Section 1: Pre-Commissioning Checks
        if _sv_key(1):
            section_title("PRE-COMMISSIONING CHECKS")
            for k, l in [("visual_inspection","Visual Inspection"),("safety_checks","Safety Checks"),
                         ("electrical_checks","Electrical Checks"),("mechanical_checks","Mechanical Checks")]:
                text_block(l, data.get(k))
        # Section 2: Commissioning Test Results
        if _sv_key(2):
            section_title("COMMISSIONING TEST RESULTS")
            for k, l in [("test_procedures","Test Procedures"),("performance_parameters","Performance Parameters"),
                         ("test_results","Test Results")]:
                text_block(l, data.get(k))
        # Section 3: Final Status
        if _sv_key(3):
            section_title("FINAL STATUS")
            info_row("Commissioning Result", data.get("commissioning_result"))
            for k, l in [("issues_found","Issues Found"),("recommendations","Recommendations"),
                         ("client_acceptance","Client Acceptance")]:
                text_block(l, data.get(k))

    elif rtype == "investigation":
        # Section 0: Incident Information
        if _sv_key(0):
            section_title("INCIDENT INFORMATION")
            for k, l in [("incident_date","Incident Date"),("incident_location","Location"),
                         ("equipment_involved","Equipment Involved"),("reported_by","Reported By")]:
                info_row(l, data.get(k))
            elements.append(Spacer(1, 0.3*cm))
        # Section 1: Problem Description
        if _sv_key(1):
            section_title("PROBLEM DESCRIPTION")
            text_block("Incident Description", data.get("incident_description"))
            text_block("Symptoms Observed", data.get("symptoms_observed"))
            text_block("Impact & Severity", data.get("impact_severity"))
        # Section 2: Investigation Findings
        if _sv_key(2):
            section_title("INVESTIGATION FINDINGS")
            for k, l in [("investigation_method","Investigation Method"),("root_cause","Root Cause"),
                         ("contributing_factors","Contributing Factors"),("evidence_data","Evidence & Data")]:
                text_block(l, data.get(k))
        # Section 3: Corrective Actions
        if _sv_key(3):
            section_title("CORRECTIVE ACTIONS")
            for k, l in [("immediate_actions","Immediate Actions"),("long_term_actions","Long Term Actions"),
                         ("preventive_measures","Preventive Measures"),("follow_up","Follow-up"),
                         ("conclusion","Conclusion")]:
                text_block(l, data.get(k))

    elif rtype == "troubleshooting":
        # Section 0: Problem Identification
        if _sv_key(0):
            section_title("PROBLEM IDENTIFICATION")
            text_block("Problem Description", data.get("problem_description"))
            for k, l in [("equipment_system","Equipment / System"),("location","Location"),
                         ("problem_reported_by","Reported By"),("problem_date","Date Occurred")]:
                info_row(l, data.get(k))
            elements.append(Spacer(1, 0.3*cm))
        # Section 1: Diagnostic Process
        if _sv_key(1):
            section_title("DIAGNOSTIC PROCESS")
            for k, l in [("symptoms","Symptoms Observed"),("initial_assessment","Initial Assessment"),
                         ("diagnostic_steps","Diagnostic Steps"),("tests_measurements","Tests & Measurements"),
                         ("fault_found","Fault / Root Cause")]:
                text_block(l, data.get(k))
        # Section 2: Resolution
        if _sv_key(2):
            section_title("RESOLUTION")
            for k, l in [("solution_applied","Solution Applied"),("parts_replaced","Parts Replaced"),
                         ("verification_tests","Verification Tests"),("recommendations","Recommendations")]:
                text_block(l, data.get(k))
            info_row("Result After Fix", data.get("result_after_fix"))

    elif rtype == "service":
        # Section 0: Service Information
        if _sv_key(0):
            section_title("SERVICE INFORMATION")
            for k, l in [("equipment_asset","Equipment / Asset"),("asset_id","Asset ID / Tag"),
                         ("location","Location"),("service_type","Service Type"),
                         ("last_service_date","Last Service Date")]:
                info_row(l, data.get(k))
            elements.append(Spacer(1, 0.3*cm))
        # Section 1: Service Performed
        if _sv_key(1):
            section_title("SERVICE PERFORMED")
            for k, l in [("work_description","Work Description"),("activities_performed","Activities Performed"),
                         ("parts_used","Parts / Materials Used"),("calibration_data","Calibration Data"),
                         ("service_duration","Service Duration")]:
                text_block(l, data.get(k))
        # Section 2: Findings & Observations
        if _sv_key(2):
            section_title("FINDINGS & OBSERVATIONS")
            for k, l in [("condition_before","Condition Before"),("issues_found","Issues Found"),
                         ("condition_after","Condition After")]:
                text_block(l, data.get(k))
        # Section 3: Next Service
        if _sv_key(3):
            section_title("NEXT SERVICE")
            info_row("Next Recommended Service Date", data.get("next_service_date"))
            for k, l in [("recommendations","Recommendations"),("client_notes","Client Notes")]:
                text_block(l, data.get(k))
    else:
        if data:
            section_title("REPORT DATA")
            for k, v in data.items():
                if k == "_section_visibility": continue
                if v: text_block(k.replace("_", " ").title(), v)

    # ─── IMAGES (before signatures) ────────────────────────────
    if report.images:
        elements.append(Spacer(1, 0.6*cm))
        section_title("DOCUMENTATION & PHOTOS")
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
            row_caps.append(Paragraph(f"Foto {i+1}" + (f": {caption_text}" if caption_text else ""), caption_style))

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

    # ─── SIGNATURE ─────────────────────────────────────────────
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

    sig_rows = [
        [Paragraph("ENGINEER", sig_label_style), Paragraph("CLIENT / CUSTOMER", sig_label_style)],
        [eng_sig_cell, Spacer(1, 1.5*cm)],
        [HRFlowable(width=6*cm, thickness=0.5, color=border_gray), HRFlowable(width=6*cm, thickness=0.5, color=border_gray)],
        [Paragraph(engineer.name if engineer else "Engineer", sig_sub_style), Paragraph("Name & Stamp", sig_sub_style)],
    ]
    if engineer:
        sig_rows.append([
            Paragraph(f"{engineer.position or ''}{' | ' + engineer.employee_id if engineer.employee_id else ''}", sig_sub_style),
            Paragraph("Date: ________________", sig_sub_style)
        ])

    sig_t = Table(sig_rows, colWidths=[sig_col_w, sig_col_w])
    sig_t.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('BOX', (0, 0), (0, -1), 0.5, border_gray),
        ('BOX', (1, 0), (1, -1), 0.5, border_gray),
        ('BACKGROUND', (0, 0), (0, 0), accent_color),
        ('BACKGROUND', (1, 0), (1, 0), accent_color),
    ]))

    # ─── DIGITAL DOCUMENT NOTICE ────────────────────────────────
    gen_ts = datetime.now().strftime("%d %B %Y, %H:%M WIB")
    digital_notice = Table([[
        Paragraph(
            f'<font color="#6B7280" size="7.5">'
            f'&#128274;  This document is digitally generated by the system of PT Flotech Controls Indonesia'
            f'  \xb7  Issued: {gen_ts}'
            f'  \xb7  Document number: {report.report_number or "-"}'
            f'  \xb7  This digital document is valid without a wet signature.</font>',
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

    # Wrap signature block + digital notice in KeepTogether
    sig_block = KeepTogether([
        Spacer(1, 0.6*cm),
        Paragraph("▌ SIGNATURES", section_header_style),
        HRFlowable(width="100%", thickness=0.5, color=border_gray),
        Spacer(1, 0.15*cm),
        sig_t,
        Spacer(1, 0.3*cm),
        digital_notice,
    ])
    elements.append(sig_block)

    # ─── FOOTER — Page X of Y via NumberedCanvas ────────────────
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
            self.drawCentredString(pw/2, 1.0*cm,
                f"Generated: {datetime.now().strftime('%d %B %Y %H:%M')}  \xb7  Page {page_num} of {total}")
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