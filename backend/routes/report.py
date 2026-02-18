from flask import Blueprint, request, jsonify, current_app
from extensions import db
from models import Report, ReportImage
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
import os
from werkzeug.utils import secure_filename
from flask import send_file
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from io import BytesIO



report_bp = Blueprint('report', __name__)

# CREATE REPORT
@report_bp.route('/create', methods=['POST'])
@jwt_required()
def create_report():

    user_id = int(get_jwt_identity())
    data = request.get_json()

    report_number = data.get("report_number")
    report_type = data.get("report_type")
    client_name = data.get("client_name")
    project_name = data.get("project_name")
    report_date = datetime.strptime(data.get("report_date"), "%Y-%m-%d")

    report_data = data.get("data_json")  # isi detail laporan

    new_report = Report(
        report_number=report_number,
        report_type=report_type,
        client_name=client_name,
        project_name=project_name,
        engineer_id=user_id,
        report_date=report_date,
        data_json=report_data
    )

    db.session.add(new_report)
    db.session.commit()

    return jsonify({
        "message": "Report created successfully",
        "report_id": new_report.id
    }), 201

# UPLOAD MULTIPLE IMAGES
@report_bp.route('/upload/<int:report_id>', methods=['POST'])
@jwt_required()
def upload_images(report_id):

    user_id = int(get_jwt_identity())

    # cek apakah report ada
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

        image = ReportImage(
            report_id=report_id,
            file_path=file_path
        )

        db.session.add(image)
        saved_files.append(filename)

    db.session.commit()

    return jsonify({
        "message": "Images uploaded successfully",
        "files": saved_files
    }), 201

# GET REPORT DETAIL
@report_bp.route('/detail/<int:report_id>', methods=['GET'])
@jwt_required()
def get_report_detail(report_id):

    report = Report.query.get(report_id)

    if not report:
        return jsonify({"error": "Report not found"}), 404

    images = []

    for img in report.images:
        images.append({
            "id": img.id,
            "file_path": img.file_path,
            "uploaded_at": img.uploaded_at
        })

    return jsonify({
        "id": report.id,
        "report_number": report.report_number,
        "report_type": report.report_type,
        "client_name": report.client_name,
        "project_name": report.project_name,
        "report_date": report.report_date,
        "status": report.status,
        "data_json": report.data_json,
        "images": images
    }), 200


# GENERATE PROFESSIONAL PDF (NO FILE SAVED)
@report_bp.route('/pdf/<int:report_id>', methods=['GET'])
@jwt_required()
def generate_pdf(report_id):

    report = Report.query.get(report_id)

    if not report:
        return jsonify({"error": "Report not found"}), 404

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    elements = []

    styles = getSampleStyleSheet()
    normal = styles["Normal"]
    heading = styles["Heading2"]

    # =========================
    # HEADER WITH LOGO
    # =========================

    logo_path = os.path.join(current_app.root_path, "assets", "logo.png")

    header_data = []

    if os.path.exists(logo_path):
        logo = Image(logo_path, width=1.5*inch, height=1*inch)
        header_data.append([
            logo,
            Paragraph("<b>FLOTECH ENGINEERING</b><br/>Commissioning & Service Report<br/>Jakarta, Indonesia", normal)
        ])
    else:
        header_data.append([
            "",
            Paragraph("<b>FLOTECH ENGINEERING</b><br/>Commissioning & Service Report<br/>Jakarta, Indonesia", normal)
        ])

    table = Table(header_data, colWidths=[2*inch, 4*inch])
    table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE')
    ]))

    elements.append(table)
    elements.append(Spacer(1, 0.3 * inch))

    # LINE SEPARATOR
    line = Table([[""]], colWidths=[6*inch])
    line.setStyle(TableStyle([
        ('LINEBELOW', (0,0), (-1,-1), 1, colors.black)
    ]))
    elements.append(line)
    elements.append(Spacer(1, 0.4 * inch))

    # =========================
    # REPORT INFORMATION TABLE
    # =========================

    info_data = [
        ["Report Number", report.report_number],
        ["Client", report.client_name],
        ["Project", report.project_name],
        ["Report Type", report.report_type],
        ["Date", str(report.report_date)],
        ["Status", report.status]
    ]

    info_table = Table(info_data, colWidths=[2*inch, 4*inch])
    info_table.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
        ('BACKGROUND', (0,0), (0,-1), colors.whitesmoke),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE')
    ]))

    elements.append(info_table)
    elements.append(Spacer(1, 0.5 * inch))

    # =========================
    # REPORT DETAILS SECTION
    # =========================

    if report.data_json:
        elements.append(Paragraph("<b>Report Details</b>", heading))
        elements.append(Spacer(1, 0.3 * inch))

        for key, value in report.data_json.items():
            elements.append(Paragraph(f"<b>{key}</b>: {value}", normal))
            elements.append(Spacer(1, 0.2 * inch))

    elements.append(Spacer(1, 0.5 * inch))

    # =========================
    # IMAGE ATTACHMENTS
    # =========================

    if report.images:
        elements.append(Paragraph("<b>Attachment Photos</b>", heading))
        elements.append(Spacer(1, 0.3 * inch))

        for img in report.images:
            if os.path.exists(img.file_path):
                elements.append(Image(img.file_path, width=4*inch, height=3*inch))
                elements.append(Spacer(1, 0.3 * inch))

    doc.build(elements)

    buffer.seek(0)

    return send_file(
        buffer,
        as_attachment=True,
        download_name=f"report_{report.id}.pdf",
        mimetype="application/pdf"
    )

# LIST ALL REPORTS
@report_bp.route('/list', methods=['GET'])
@jwt_required()
def list_reports():

    reports = Report.query.all()

    result = []

    for report in reports:
        result.append({
            "id": report.id,
            "report_number": report.report_number,
            "client_name": report.client_name,
            "project_name": report.project_name,
            "report_type": report.report_type,
            "status": report.status
        })

    return jsonify(result), 200

@report_bp.route('/delete/<int:report_id>', methods=['DELETE'])
@jwt_required()
def delete_report(report_id):

    report = Report.query.get(report_id)

    if not report:
        return jsonify({"error": "Report not found"}), 404

    db.session.delete(report)
    db.session.commit()

    return jsonify({"message": "Report deleted"}), 200


