from flask import Blueprint, request, jsonify, current_app
from extensions import db
from models import Report, ReportImage, Engineer
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
import os
import base64
from werkzeug.utils import secure_filename
from flask import send_file
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle, HRFlowable
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, cm
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from io import BytesIO
from PIL import Image as PILImage

report_bp = Blueprint('report', __name__)

REPORT_TYPES = ["commissioning", "investigation", "troubleshooting", "service"]


# CREATE REPORT
@report_bp.route('/create', methods=['POST'])
@jwt_required()
def create_report():
    user_id = int(get_jwt_identity())
    data = request.get_json()

    report_type = data.get("report_type", "").lower()
    if report_type not in REPORT_TYPES:
        return jsonify({"error": f"Invalid report type. Must be one of: {', '.join(REPORT_TYPES)}"}), 400

    report_date_str = data.get("report_date")
    report_date = datetime.strptime(report_date_str, "%Y-%m-%d") if report_date_str else datetime.utcnow()

    new_report = Report(
        report_number=data.get("report_number"),
        report_type=report_type,
        client_name=data.get("client_name"),
        project_name=data.get("project_name"),
        engineer_id=data.get("engineer_id"),
        report_date=report_date,
        data_json=data.get("data_json", {})
    )

    db.session.add(new_report)
    db.session.commit()

    return jsonify({
        "message": "Report created successfully",
        "report_id": new_report.id
    }), 201


# LIST REPORTS WITH FILTER
@report_bp.route('/list', methods=['GET'])
@jwt_required()
def list_reports():
    query = Report.query

    report_type = request.args.get("type")
    status = request.args.get("status")
    client = request.args.get("client")
    search = request.args.get("search")
    engineer_id = request.args.get("engineer_id")
    date_from = request.args.get("date_from")
    date_to = request.args.get("date_to")

    if report_type:
        query = query.filter(Report.report_type == report_type.lower())
    if status:
        query = query.filter(Report.status == status)
    if client:
        query = query.filter(Report.client_name.ilike(f"%{client}%"))
    if engineer_id:
        query = query.filter(Report.engineer_id == int(engineer_id))
    if date_from:
        query = query.filter(Report.report_date >= datetime.strptime(date_from, "%Y-%m-%d").date())
    if date_to:
        query = query.filter(Report.report_date <= datetime.strptime(date_to, "%Y-%m-%d").date())
    if search:
        query = query.filter(
            db.or_(
                Report.report_number.ilike(f"%{search}%"),
                Report.client_name.ilike(f"%{search}%"),
                Report.project_name.ilike(f"%{search}%")
            )
        )

    reports = query.order_by(Report.created_at.desc()).all()

    result = []
    for r in reports:
        engineer_name = None
        if r.engineer_id:
            eng = Engineer.query.get(r.engineer_id)
            engineer_name = eng.name if eng else None
        result.append({
            "id": r.id,
            "report_number": r.report_number,
            "report_type": r.report_type,
            "client_name": r.client_name,
            "project_name": r.project_name,
            "engineer_name": engineer_name,
            "report_date": r.report_date.isoformat() if r.report_date else None,
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None
        })

    return jsonify(result), 200


# UPLOAD IMAGES
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
    for file in files:
        if file.filename == "":
            continue
        filename = secure_filename(file.filename)
        file_path = os.path.join(current_app.config["UPLOAD_FOLDER"], filename)
        file.save(file_path)
        image = ReportImage(report_id=report_id, file_path=filename)
        db.session.add(image)
        saved_files.append(filename)

    db.session.commit()
    return jsonify({"message": "Images uploaded successfully", "files": saved_files}), 201


# GET REPORT DETAIL
@report_bp.route('/detail/<int:report_id>', methods=['GET'])
@jwt_required()
def get_report_detail(report_id):
    report = Report.query.get(report_id)
    if not report:
        return jsonify({"error": "Report not found"}), 404

    engineer_data = None
    if report.engineer_id:
        eng = Engineer.query.get(report.engineer_id)
        if eng:
            engineer_data = {
                "id": eng.id,
                "name": eng.name,
                "employee_id": eng.employee_id,
                "position": eng.position,
                "department": eng.department,
                "certification": eng.certification,
                "signature_data": eng.signature_data
            }

    images = [{"id": img.id, "file_path": img.file_path, "uploaded_at": img.uploaded_at.isoformat()} for img in report.images]

    return jsonify({
        "id": report.id,
        "report_number": report.report_number,
        "report_type": report.report_type,
        "client_name": report.client_name,
        "project_name": report.project_name,
        "engineer": engineer_data,
        "report_date": report.report_date.isoformat() if report.report_date else None,
        "status": report.status,
        "data_json": report.data_json,
        "images": images
    }), 200


# UPDATE REPORT STATUS
@report_bp.route('/status/<int:report_id>', methods=['PUT'])
@jwt_required()
def update_status(report_id):
    report = Report.query.get(report_id)
    if not report:
        return jsonify({"error": "Report not found"}), 404
    data = request.get_json()
    report.status = data.get("status", report.status)
    db.session.commit()
    return jsonify({"message": "Status updated"}), 200


# DELETE REPORT
@report_bp.route('/delete/<int:report_id>', methods=['DELETE'])
@jwt_required()
def delete_report(report_id):
    report = Report.query.get(report_id)
    if not report:
        return jsonify({"error": "Report not found"}), 404
    for img in report.images:
        db.session.delete(img)
    db.session.delete(report)
    db.session.commit()
    return jsonify({"message": "Report deleted"}), 200


def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16)/255 for i in (0, 2, 4))


# GENERATE PDF
@report_bp.route('/pdf/<int:report_id>', methods=['GET'])
@jwt_required()
def generate_pdf(report_id):
    report = Report.query.get(report_id)
    if not report:
        return jsonify({"error": "Report not found"}), 404

    engineer = None
    if report.engineer_id:
        engineer = Engineer.query.get(report.engineer_id)

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=1.5*cm,
        bottomMargin=2*cm,
        leftMargin=2*cm,
        rightMargin=2*cm
    )

    styles = getSampleStyleSheet()

    # Color palette
    primary_color = colors.HexColor("#0B3D91")
    secondary_color = colors.HexColor("#1E5CC6")
    accent_color = colors.HexColor("#E8F0FE")
    dark_color = colors.HexColor("#1a1a2e")
    text_color = colors.HexColor("#374151")
    light_gray = colors.HexColor("#F3F4F6")
    border_gray = colors.HexColor("#D1D5DB")

    # Styles
    title_style = ParagraphStyle('Title', fontSize=22, fontName='Helvetica-Bold', textColor=primary_color, spaceAfter=4)
    subtitle_style = ParagraphStyle('Subtitle', fontSize=11, fontName='Helvetica', textColor=text_color, spaceAfter=2)
    section_header_style = ParagraphStyle('SectionHeader', fontSize=12, fontName='Helvetica-Bold', textColor=primary_color, spaceBefore=12, spaceAfter=6, borderPad=4)
    body_style = ParagraphStyle('Body', fontSize=10, fontName='Helvetica', textColor=text_color, spaceAfter=4, leading=14)
    label_style = ParagraphStyle('Label', fontSize=9, fontName='Helvetica-Bold', textColor=colors.HexColor("#6B7280"), spaceAfter=2)
    value_style = ParagraphStyle('Value', fontSize=10, fontName='Helvetica', textColor=dark_color, spaceAfter=6)

    elements = []

    # ===== HEADER =====
    report_type_label = report.report_type.upper() if report.report_type else "FIELD"

    # Try to load logo
    logo_path = os.path.join(current_app.root_path, "assets", "logo.png")
    logo_cell = None
    if os.path.exists(logo_path):
        try:
            logo_cell = Image(logo_path, width=3.5*cm, height=2*cm)
            logo_cell.hAlign = 'LEFT'
        except Exception:
            logo_cell = None

    if logo_cell is None:
        logo_cell = Paragraph("<b>FLOTECH</b>", ParagraphStyle('Logo', fontSize=24, fontName='Helvetica-Bold', textColor=primary_color))

    header_data = [
        [
            logo_cell,
            Paragraph(f"<b>{report_type_label} REPORT</b>", ParagraphStyle('ReportType', fontSize=16, fontName='Helvetica-Bold', textColor=colors.white, alignment=2))
        ]
    ]
    header_table = Table(header_data, colWidths=[9*cm, 8*cm])
    header_table.setStyle(TableStyle([
        ('BACKGROUND', (1, 0), (1, 0), primary_color),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('PADDING', (0, 0), (0, 0), 8),
        ('PADDING', (1, 0), (1, 0), 12),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 0.3*cm))
    elements.append(HRFlowable(width="100%", thickness=2, color=primary_color))
    elements.append(Spacer(1, 0.4*cm))

    # ===== REPORT INFO BLOCK =====
    report_date_str = report.report_date.strftime("%d %B %Y") if report.report_date else "-"
    info_data = [
        [
            Paragraph("<b>Report Number</b>", label_style), Paragraph(str(report.report_number or "-"), value_style),
            Paragraph("<b>Date</b>", label_style), Paragraph(report_date_str, value_style)
        ],
        [
            Paragraph("<b>Client</b>", label_style), Paragraph(str(report.client_name or "-"), value_style),
            Paragraph("<b>Status</b>", label_style), Paragraph(str(report.status or "-").upper(), ParagraphStyle('Status', fontSize=10, fontName='Helvetica-Bold', textColor=secondary_color))
        ],
        [
            Paragraph("<b>Project</b>", label_style), Paragraph(str(report.project_name or "-"), value_style),
            Paragraph("<b>Report Type</b>", label_style), Paragraph(report_type_label, value_style)
        ]
    ]
    info_table = Table(info_data, colWidths=[3*cm, 6*cm, 3*cm, 5*cm])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), accent_color),
        ('BOX', (0, 0), (-1, -1), 0.5, border_gray),
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [accent_color, colors.white]),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LINEAFTER', (1, 0), (1, -1), 0.5, border_gray),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 0.5*cm))

    # ===== TYPE-SPECIFIC CONTENT =====
    data = report.data_json or {}
    rtype = (report.report_type or "").lower()

    def section_title(text):
        elements.append(Paragraph(f"▌ {text}", section_header_style))
        elements.append(HRFlowable(width="100%", thickness=0.5, color=border_gray))
        elements.append(Spacer(1, 0.2*cm))

    def info_row(label, value):
        row_data = [[
            Paragraph(label, label_style),
            Paragraph(str(value) if value else "-", value_style)
        ]]
        t = Table(row_data, colWidths=[5*cm, 12*cm])
        t.setStyle(TableStyle([
            ('PADDING', (0, 0), (-1, -1), 6),
            ('LINEBELOW', (0, 0), (-1, 0), 0.3, border_gray),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        elements.append(t)

    def text_block(label, text):
        elements.append(Paragraph(f"<b>{label}</b>", label_style))
        elements.append(Paragraph(str(text) if text else "-", body_style))
        elements.append(Spacer(1, 0.2*cm))

    if rtype == "commissioning":
        section_title("SITE & EQUIPMENT INFORMATION")
        info_row("Site Location", data.get("site_location"))
        info_row("Equipment Name", data.get("equipment_name"))
        info_row("Equipment Model", data.get("equipment_model"))
        info_row("Serial Number", data.get("serial_number"))
        info_row("Manufacturer", data.get("manufacturer"))
        info_row("Installation Date", data.get("installation_date"))

        section_title("PRE-COMMISSIONING CHECKS")
        text_block("Visual Inspection", data.get("visual_inspection"))
        text_block("Safety Checks", data.get("safety_checks"))
        text_block("Electrical Checks", data.get("electrical_checks"))
        text_block("Mechanical Checks", data.get("mechanical_checks"))

        section_title("COMMISSIONING TEST RESULTS")
        text_block("Test Procedures Performed", data.get("test_procedures"))
        text_block("Performance Parameters", data.get("performance_parameters"))
        text_block("Test Results", data.get("test_results"))

        section_title("FINAL STATUS")
        text_block("Commissioning Result", data.get("commissioning_result"))
        text_block("Issues Found", data.get("issues_found"))
        text_block("Recommendations", data.get("recommendations"))
        text_block("Client Acceptance", data.get("client_acceptance"))

    elif rtype == "investigation":
        section_title("INCIDENT INFORMATION")
        info_row("Incident Date", data.get("incident_date"))
        info_row("Location", data.get("incident_location"))
        info_row("Equipment Involved", data.get("equipment_involved"))
        info_row("Reported By", data.get("reported_by"))

        section_title("PROBLEM DESCRIPTION")
        text_block("Incident Description", data.get("incident_description"))
        text_block("Symptoms Observed", data.get("symptoms_observed"))
        text_block("Impact / Severity", data.get("impact_severity"))

        section_title("INVESTIGATION FINDINGS")
        text_block("Investigation Method", data.get("investigation_method"))
        text_block("Root Cause Analysis", data.get("root_cause"))
        text_block("Contributing Factors", data.get("contributing_factors"))
        text_block("Evidence & Data", data.get("evidence_data"))

        section_title("CORRECTIVE ACTIONS")
        text_block("Immediate Actions Taken", data.get("immediate_actions"))
        text_block("Long-term Corrective Actions", data.get("long_term_actions"))
        text_block("Preventive Measures", data.get("preventive_measures"))
        text_block("Follow-up Required", data.get("follow_up"))
        text_block("Conclusion", data.get("conclusion"))

    elif rtype == "troubleshooting":
        section_title("PROBLEM IDENTIFICATION")
        info_row("Equipment / System", data.get("equipment_system"))
        info_row("Location", data.get("location"))
        info_row("Problem Reported By", data.get("problem_reported_by"))
        info_row("Date Problem Occurred", data.get("problem_date"))
        text_block("Problem Description", data.get("problem_description"))

        section_title("DIAGNOSTIC PROCESS")
        text_block("Symptoms", data.get("symptoms"))
        text_block("Initial Assessment", data.get("initial_assessment"))
        text_block("Diagnostic Steps", data.get("diagnostic_steps"))
        text_block("Test & Measurements", data.get("tests_measurements"))
        text_block("Fault Found", data.get("fault_found"))

        section_title("RESOLUTION")
        text_block("Solution Applied", data.get("solution_applied"))
        text_block("Parts Replaced", data.get("parts_replaced"))
        text_block("Verification Tests", data.get("verification_tests"))
        text_block("Result After Fix", data.get("result_after_fix"))
        text_block("Recommendations", data.get("recommendations"))

    elif rtype == "service":
        section_title("SERVICE INFORMATION")
        info_row("Equipment / Asset", data.get("equipment_asset"))
        info_row("Asset ID / Tag", data.get("asset_id"))
        info_row("Location", data.get("location"))
        info_row("Service Type", data.get("service_type"))
        info_row("Last Service Date", data.get("last_service_date"))

        section_title("SERVICE PERFORMED")
        text_block("Work Description", data.get("work_description"))
        text_block("Activities Performed", data.get("activities_performed"))
        text_block("Parts / Materials Used", data.get("parts_used"))
        text_block("Calibration Data", data.get("calibration_data"))
        text_block("Service Duration", data.get("service_duration"))

        section_title("FINDINGS & OBSERVATIONS")
        text_block("Condition Before Service", data.get("condition_before"))
        text_block("Issues Found", data.get("issues_found"))
        text_block("Condition After Service", data.get("condition_after"))

        section_title("NEXT SERVICE")
        text_block("Next Service Date", data.get("next_service_date"))
        text_block("Recommendations", data.get("recommendations"))
        text_block("Client Notes", data.get("client_notes"))

    else:
        section_title("REPORT CONTENT")
        if data:
            for k, v in data.items():
                text_block(k.replace("_", " ").title(), v)
        else:
            elements.append(Paragraph("No content available.", body_style))

    # ===== IMAGES =====
    if report.images:
        section_title("DOCUMENTATION & PHOTOS")
        img_table_data = []
        row = []
        for i, img_obj in enumerate(report.images):
            try:
                upload_folder = current_app.config["UPLOAD_FOLDER"]
                img_path = os.path.join(upload_folder, img_obj.file_path) if not os.path.isabs(img_obj.file_path) else img_obj.file_path
                # Handle old records that stored full path
                if not os.path.exists(img_path):
                    img_path = img_obj.file_path
                if os.path.exists(img_path):
                    img = Image(img_path, width=7.5*cm, height=5.5*cm)
                    img.hAlign = 'CENTER'
                    row.append(img)
                else:
                    row.append(Paragraph("Image not found", body_style))
            except Exception:
                row.append(Paragraph("Image error", body_style))
            if len(row) == 2 or i == len(report.images) - 1:
                while len(row) < 2:
                    row.append("")
                img_table_data.append(row)
                row = []
        if img_table_data:
            img_table = Table(img_table_data, colWidths=[8.5*cm, 8.5*cm])
            img_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('PADDING', (0, 0), (-1, -1), 6),
                ('BOX', (0, 0), (0, -1), 0.3, border_gray),
                ('BOX', (1, 0), (1, -1), 0.3, border_gray),
                ('ROWBACKGROUNDS', (0, 0), (-1, -1), [light_gray, colors.white]),
            ]))
            elements.append(img_table)

    # ===== SIGNATURE BLOCK =====
    elements.append(Spacer(1, 1*cm))
    elements.append(HRFlowable(width="100%", thickness=1, color=primary_color))
    elements.append(Spacer(1, 0.3*cm))

    sig_col_width = 8.5*cm

    if engineer:
        sig_content = []
        sig_content.append(Paragraph("<b>ENGINEER SIGNATURE</b>", ParagraphStyle('SigTitle', fontSize=9, fontName='Helvetica-Bold', textColor=primary_color)))
        sig_content.append(Spacer(1, 0.2*cm))

        if engineer.signature_data:
            try:
                # decode base64 signature
                sig_b64 = engineer.signature_data
                if ',' in sig_b64:
                    sig_b64 = sig_b64.split(',', 1)[1]
                sig_bytes = base64.b64decode(sig_b64)
                sig_buf = BytesIO(sig_bytes)
                sig_img = Image(sig_buf, width=5*cm, height=2*cm)
                sig_img.hAlign = 'LEFT'
                sig_content.append(sig_img)
            except Exception:
                sig_content.append(Spacer(1, 1.5*cm))
        else:
            sig_content.append(Spacer(1, 1.5*cm))

        sig_content.append(HRFlowable(width=5*cm, thickness=0.5, color=border_gray))
        sig_content.append(Paragraph(f"<b>{engineer.name}</b>", ParagraphStyle('EngName', fontSize=10, fontName='Helvetica-Bold', textColor=dark_color)))
        sig_content.append(Paragraph(f"{engineer.position or ''}", ParagraphStyle('EngPos', fontSize=9, fontName='Helvetica', textColor=text_color)))
        sig_content.append(Paragraph(f"{engineer.department or ''}", ParagraphStyle('EngDept', fontSize=9, fontName='Helvetica', textColor=text_color)))
        if engineer.certification:
            sig_content.append(Paragraph(f"Cert: {engineer.certification}", ParagraphStyle('Cert', fontSize=8, fontName='Helvetica-Oblique', textColor=colors.HexColor("#6B7280"))))

        client_col = [
            Paragraph("<b>CLIENT APPROVAL</b>", ParagraphStyle('ClientTitle', fontSize=9, fontName='Helvetica-Bold', textColor=primary_color)),
            Spacer(1, 0.2*cm),
            Spacer(1, 1.5*cm),
            HRFlowable(width=5*cm, thickness=0.5, color=border_gray),
            Paragraph("Authorized Representative", ParagraphStyle('ClientRep', fontSize=9, fontName='Helvetica', textColor=text_color)),
            Paragraph(f"Client: {report.client_name or ''}", ParagraphStyle('ClientName', fontSize=9, fontName='Helvetica', textColor=text_color)),
        ]

        sig_table_data = [[sig_content, client_col]]
        from reportlab.platypus import KeepInFrame
        sig_table = Table([[sig_content, client_col]], colWidths=[sig_col_width, sig_col_width])
        sig_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('PADDING', (0, 0), (-1, -1), 8),
            ('BOX', (0, 0), (0, 0), 0.5, border_gray),
            ('BOX', (1, 0), (1, 0), 0.5, border_gray),
            ('BACKGROUND', (0, 0), (0, 0), accent_color),
        ]))
        elements.append(sig_table)
    else:
        # no engineer, simple sig block
        sig_data = [[
            Paragraph("<b>ENGINEER SIGNATURE</b>", ParagraphStyle('SigT', fontSize=9, fontName='Helvetica-Bold', textColor=primary_color)),
            Paragraph("<b>CLIENT APPROVAL</b>", ParagraphStyle('SigT2', fontSize=9, fontName='Helvetica-Bold', textColor=primary_color))
        ],[
            Spacer(1, 2*cm), Spacer(1, 2*cm)
        ],[
            HRFlowable(width=6*cm, thickness=0.5, color=border_gray),
            HRFlowable(width=6*cm, thickness=0.5, color=border_gray)
        ]]
        sig_t = Table(sig_data, colWidths=[sig_col_width, sig_col_width])
        sig_t.setStyle(TableStyle([
            ('PADDING', (0, 0), (-1, -1), 8),
            ('BOX', (0, 0), (0, -1), 0.5, border_gray),
            ('BOX', (1, 0), (1, -1), 0.5, border_gray),
        ]))
        elements.append(sig_t)

    # Footer
    elements.append(Spacer(1, 0.5*cm))
    footer_style = ParagraphStyle('Footer', fontSize=8, fontName='Helvetica', textColor=colors.HexColor("#9CA3AF"), alignment=1)
    elements.append(Paragraph(f"Generated by Flotech Engineering Report System | {datetime.now().strftime('%d %B %Y %H:%M')}", footer_style))

    doc.build(elements)
    buffer.seek(0)

    return send_file(
        buffer,
        as_attachment=True,
        download_name=f"{report.report_number or 'report'}_{report.report_type}.pdf",
        mimetype="application/pdf"
    )