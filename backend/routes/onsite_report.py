from flask import Blueprint, request, jsonify, send_file, Response, current_app
from extensions import db
from models import Engineer
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, Image
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from io import BytesIO
from PIL import Image as PILImage
import base64
import os

onsite_bp = Blueprint('onsite', __name__)

FLOTECH_INFO = {
    "name": "PT FLOTECH CONTROLS INDONESIA",
    "address": "Rukan Artha Gading Niaga, Blok F/7",
    "city": "Jl. Boulevard Artha Gading, Jakarta 14240",
    "telp": "Telp: +6221 45850778 / Fax: +6221 45850779",
    "email": "e-Mail: salesjkt@flotech.co.id / Website: www.flotech.com.sg",
}


class OnsiteReport(db.Model):
    __tablename__ = "onsite_reports"
    id = db.Column(db.Integer, primary_key=True)
    report_number = db.Column(db.String(50))
    visit_date = db.Column(db.Date)
    client_name = db.Column(db.String(150))
    client_company = db.Column(db.String(200))
    client_address = db.Column(db.Text)
    site_location = db.Column(db.String(200))
    contact_person = db.Column(db.String(150))
    contact_phone = db.Column(db.String(30))
    engineer_id = db.Column(db.Integer, db.ForeignKey("engineers.id"), nullable=True)
    job_description = db.Column(db.Text)
    equipment_tag = db.Column(db.String(100))
    equipment_model = db.Column(db.String(150))
    serial_number = db.Column(db.String(100))
    work_performed = db.Column(db.Text)
    findings = db.Column(db.Text)
    recommendations = db.Column(db.Text)
    materials_used = db.Column(db.Text)
    customer_signature = db.Column(db.Text)  # base64
    status = db.Column(db.String(20), default="draft")
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


def report_to_dict(r, include_sig=False):
    eng = Engineer.query.get(r.engineer_id) if r.engineer_id else None
    d = {
        "id": r.id, "report_number": r.report_number,
        "visit_date": r.visit_date.isoformat() if r.visit_date else None,
        "client_name": r.client_name, "client_company": r.client_company,
        "client_address": r.client_address, "site_location": r.site_location,
        "contact_person": r.contact_person, "contact_phone": r.contact_phone,
        "engineer_id": r.engineer_id,
        "engineer_name": eng.name if eng else None,
        "engineer_position": eng.position if eng else None,
        "engineer_signature": eng.signature_data if (eng and include_sig) else None,
        "job_description": r.job_description, "equipment_tag": r.equipment_tag,
        "equipment_model": r.equipment_model, "serial_number": r.serial_number,
        "work_performed": r.work_performed, "findings": r.findings,
        "recommendations": r.recommendations, "materials_used": r.materials_used,
        "status": r.status,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }
    if include_sig:
        d["customer_signature"] = r.customer_signature
    return d


@onsite_bp.route('/list', methods=['GET'])
@jwt_required()
def list_reports():
    reports = OnsiteReport.query.order_by(OnsiteReport.created_at.desc()).all()
    return jsonify([report_to_dict(r) for r in reports]), 200


@onsite_bp.route('/create', methods=['POST'])
@jwt_required()
def create_report():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    visit_date = None
    if data.get("visit_date"):
        try: visit_date = datetime.strptime(data["visit_date"], "%Y-%m-%d").date()
        except: pass
    r = OnsiteReport(
        report_number=data.get("report_number"),
        visit_date=visit_date,
        client_name=data.get("client_name"), client_company=data.get("client_company"),
        client_address=data.get("client_address"), site_location=data.get("site_location"),
        contact_person=data.get("contact_person"), contact_phone=data.get("contact_phone"),
        engineer_id=data.get("engineer_id") or None,
        job_description=data.get("job_description"), equipment_tag=data.get("equipment_tag"),
        equipment_model=data.get("equipment_model"), serial_number=data.get("serial_number"),
        work_performed=data.get("work_performed"), findings=data.get("findings"),
        recommendations=data.get("recommendations"), materials_used=data.get("materials_used"),
        customer_signature=data.get("customer_signature"),
        status=data.get("status", "draft"), created_by=user_id,
    )
    db.session.add(r); db.session.commit()
    return jsonify({"message": "Created", "id": r.id}), 201


@onsite_bp.route('/detail/<int:rid>', methods=['GET'])
@jwt_required()
def get_detail(rid):
    r = OnsiteReport.query.get(rid)
    if not r: return jsonify({"error": "Not found"}), 404
    return jsonify(report_to_dict(r, include_sig=True)), 200


@onsite_bp.route('/update/<int:rid>', methods=['PUT'])
@jwt_required()
def update_report(rid):
    r = OnsiteReport.query.get(rid)
    if not r: return jsonify({"error": "Not found"}), 404
    data = request.get_json()
    for field in ["report_number", "client_name", "client_company", "client_address",
                  "site_location", "contact_person", "contact_phone", "job_description",
                  "equipment_tag", "equipment_model", "serial_number", "work_performed",
                  "findings", "recommendations", "materials_used", "customer_signature", "status"]:
        if field in data: setattr(r, field, data[field])
    if "engineer_id" in data: r.engineer_id = data["engineer_id"] or None
    if data.get("visit_date"):
        try: r.visit_date = datetime.strptime(data["visit_date"], "%Y-%m-%d").date()
        except: pass
    r.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"message": "Updated"}), 200


@onsite_bp.route('/delete/<int:rid>', methods=['DELETE'])
@jwt_required()
def delete_report(rid):
    r = OnsiteReport.query.get(rid)
    if not r: return jsonify({"error": "Not found"}), 404
    db.session.delete(r); db.session.commit()
    return jsonify({"message": "Deleted"}), 200


# ── PDF ─────────────────────────────────────────────────────────────────────
def build_onsite_pdf(rid):
    r = OnsiteReport.query.get(rid)
    if not r: return None
    eng = Engineer.query.get(r.engineer_id) if r.engineer_id else None

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
        topMargin=2*cm, bottomMargin=3.5*cm, leftMargin=2*cm, rightMargin=2*cm)

    primary   = colors.HexColor("#0B3D91")
    secondary = colors.HexColor("#1E5CC6")
    accent    = colors.HexColor("#EEF3FB")
    dark      = colors.HexColor("#1a1a2e")
    text_clr  = colors.HexColor("#374151")
    gray      = colors.HexColor("#6B7280")
    border    = colors.HexColor("#D1D5DB")
    light_gray= colors.HexColor("#F9FAFB")

    def ps(name, **kw):
        d = dict(fontName='Helvetica', fontSize=10, textColor=text_clr, leading=14)
        d.update(kw); return ParagraphStyle(name, **d)

    title_s    = ps('T', fontSize=16, fontName='Helvetica-Bold', textColor=colors.white, alignment=2)
    sub_s      = ps('S', fontSize=9, textColor=colors.HexColor("#BFD3F5"), alignment=2)
    sec_s      = ps('Sec', fontSize=10, fontName='Helvetica-Bold', textColor=primary, spaceBefore=10, spaceAfter=3)
    label_s    = ps('L', fontSize=8, fontName='Helvetica-Bold', textColor=gray)
    value_s    = ps('V', fontSize=10, textColor=dark)
    body_s     = ps('B', fontSize=9, textColor=text_clr, leading=13, spaceAfter=3)
    sig_lbl_s  = ps('SL', fontSize=9, fontName='Helvetica-Bold', textColor=primary, alignment=1)
    sig_sub_s  = ps('SS', fontSize=8, textColor=gray, alignment=1)

    elements = []

    # ── HEADER ──────────────────────────────────────────────────
    logo_path = os.path.join(current_app.root_path, "assets", "logo.png")
    if os.path.exists(logo_path):
        try:
            pil_logo = PILImage.open(logo_path)
            lw, lh = pil_logo.size
            target_h = 1.6*cm; target_w = min((lw/lh)*target_h, 4.5*cm)
            logo_cell = Image(logo_path, width=target_w, height=target_h)
        except:
            logo_cell = Paragraph("<b>FLOTECH</b>", ps('LF', fontSize=16, fontName='Helvetica-Bold', textColor=primary))
    else:
        logo_cell = Paragraph("<b>FLOTECH</b>", ps('LF', fontSize=16, fontName='Helvetica-Bold', textColor=primary))

    right_block = Table([[Paragraph("ONSITE SERVICE REPORT", title_s)], [Paragraph(r.report_number or "", sub_s)]], colWidths=[8.5*cm])
    right_block.setStyle(TableStyle([('BACKGROUND', (0,0),(-1,-1), primary), ('PADDING',(0,0),(-1,-1),10), ('VALIGN',(0,0),(-1,-1),'MIDDLE')]))
    header_row = Table([[logo_cell, right_block]], colWidths=[8*cm, 9*cm])
    header_row.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'MIDDLE'), ('ALIGN',(1,0),(1,0),'RIGHT')]))
    elements.append(header_row)
    elements.append(Spacer(1, 0.3*cm))
    elements.append(HRFlowable(width="100%", thickness=2, color=primary))
    elements.append(Spacer(1, 0.3*cm))

    # ── META BLOCK ──────────────────────────────────────────────
    visit_str = r.visit_date.strftime("%d %B %Y") if r.visit_date else "-"
    meta_data = [[
        Paragraph("<b>Nomor Report</b>", label_s), Paragraph(r.report_number or "-", value_s),
        Paragraph("<b>Tanggal Kunjungan</b>", label_s), Paragraph(visit_str, value_s),
        Paragraph("<b>Status</b>", label_s), Paragraph((r.status or "draft").upper(), ps('St', fontSize=9, fontName='Helvetica-Bold', textColor=secondary)),
    ]]
    mt = Table(meta_data, colWidths=[3*cm, 4.5*cm, 3.5*cm, 3.5*cm, 2*cm, 2*cm])
    mt.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),accent), ('BOX',(0,0),(-1,-1),0.5,border), ('PADDING',(0,0),(-1,-1),8), ('VALIGN',(0,0),(-1,-1),'MIDDLE')]))
    elements.append(mt)
    elements.append(Spacer(1, 0.4*cm))

    def section(text):
        elements.append(Paragraph(f"▌ {text}", sec_s))
        elements.append(HRFlowable(width="100%", thickness=0.5, color=border))
        elements.append(Spacer(1, 0.15*cm))

    def info_row(label, value):
        if not value: return
        t = Table([[Paragraph(label, label_s), Paragraph(str(value), value_s)]], colWidths=[4.5*cm, 12.5*cm])
        t.setStyle(TableStyle([('PADDING',(0,0),(-1,-1),6), ('LINEBELOW',(0,0),(-1,0),0.3,border), ('VALIGN',(0,0),(-1,-1),'TOP')]))
        elements.append(t)

    def text_box(label, text):
        if not text: return
        t = Table([[Paragraph(f"<b>{label}</b>", label_s)], [Paragraph(text, body_s)]], colWidths=[17*cm])
        t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),accent), ('BOX',(0,0),(-1,-1),0.3,border), ('PADDING',(0,0),(-1,-1),8)]))
        elements.append(t); elements.append(Spacer(1, 0.2*cm))

    # ── CLIENT & ENGINEER ────────────────────────────────────────
    section("INFORMASI CLIENT & ENGINEER")
    client_data = [
        [Paragraph("<b>INFORMASI CLIENT</b>", ps('CH', fontSize=9, fontName='Helvetica-Bold', textColor=colors.white))],
        [Paragraph(r.client_company or r.client_name or "-", ps('CN', fontSize=11, fontName='Helvetica-Bold', textColor=dark))],
    ]
    if r.client_name and r.client_company: client_data.append([Paragraph(r.client_name, ps('CP', fontSize=9, textColor=text_clr))])
    if r.contact_person: client_data.append([Paragraph(f"Contact: {r.contact_person}", ps('CC', fontSize=9, textColor=gray))])
    if r.contact_phone: client_data.append([Paragraph(f"Tel: {r.contact_phone}", ps('CT', fontSize=9, textColor=gray))])
    if r.site_location: client_data.append([Paragraph(f"Site: {r.site_location}", ps('CS', fontSize=9, textColor=gray))])
    if r.client_address: client_data.append([Paragraph(r.client_address, ps('CA', fontSize=8, textColor=gray, leading=11))])

    ct = Table(client_data, colWidths=[7.5*cm])
    ct.setStyle(TableStyle([('BACKGROUND',(0,0),(0,0),primary), ('BACKGROUND',(0,1),(-1,-1),accent), ('BOX',(0,0),(-1,-1),0.5,border), ('PADDING',(0,0),(-1,-1),8), ('VALIGN',(0,0),(-1,-1),'TOP')]))

    eng_data = [
        [Paragraph("<b>ENGINEER</b>", ps('EH', fontSize=9, fontName='Helvetica-Bold', textColor=colors.white))],
        [Paragraph(eng.name if eng else "-", ps('EN', fontSize=11, fontName='Helvetica-Bold', textColor=dark))],
    ]
    if eng:
        if eng.position: eng_data.append([Paragraph(eng.position, ps('EP', fontSize=9, textColor=text_clr))])
        if eng.employee_id: eng_data.append([Paragraph(f"ID: {eng.employee_id}", ps('EI', fontSize=9, textColor=gray))])
        if eng.certification: eng_data.append([Paragraph(f"Cert: {eng.certification}", ps('EC', fontSize=8, textColor=gray))])

    et = Table(eng_data, colWidths=[7.5*cm])
    et.setStyle(TableStyle([('BACKGROUND',(0,0),(0,0),secondary), ('BACKGROUND',(0,1),(-1,-1),accent), ('BOX',(0,0),(-1,-1),0.5,border), ('PADDING',(0,0),(-1,-1),8), ('VALIGN',(0,0),(-1,-1),'TOP')]))

    two_col = Table([[ct, et]], colWidths=[8*cm, 9*cm])
    two_col.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'), ('RIGHTPADDING',(0,0),(0,0),10)]))
    elements.append(two_col)
    elements.append(Spacer(1, 0.4*cm))

    # ── EQUIPMENT ────────────────────────────────────────────────
    if any([r.equipment_tag, r.equipment_model, r.serial_number]):
        section("DATA PERALATAN")
        info_row("Tag / ID Alat", r.equipment_tag)
        info_row("Model / Type", r.equipment_model)
        info_row("Serial Number", r.serial_number)
        elements.append(Spacer(1, 0.3*cm))

    # ── WORK DETAILS ─────────────────────────────────────────────
    section("DETAIL PEKERJAAN")
    text_box("Deskripsi Pekerjaan", r.job_description)
    text_box("Pekerjaan yang Dilakukan", r.work_performed)
    text_box("Temuan / Findings", r.findings)
    text_box("Rekomendasi", r.recommendations)
    text_box("Material / Parts Digunakan", r.materials_used)

    # ── SIGNATURES ───────────────────────────────────────────────
    elements.append(Spacer(1, 0.4*cm))
    section("TANDA TANGAN")

    def sig_image(b64_data):
        if not b64_data: return Spacer(1, 1.8*cm)
        try:
            data = b64_data
            if "base64," in data: data = data.split("base64,")[1]
            decoded = base64.b64decode(data)
            pil_img = PILImage.open(BytesIO(decoded)).convert("RGBA")
            buf = BytesIO(); pil_img.save(buf, format="PNG"); buf.seek(0)
            img = Image(buf, width=4*cm, height=1.6*cm); img.hAlign = 'CENTER'
            return img
        except: return Spacer(1, 1.8*cm)

    sig_rows = [
        [Paragraph("ENGINEER", sig_lbl_s), Paragraph("CUSTOMER / CLIENT", sig_lbl_s)],
        [sig_image(eng.signature_data if eng else None), sig_image(r.customer_signature)],
        [HRFlowable(width=6*cm, thickness=0.5, color=border), HRFlowable(width=6*cm, thickness=0.5, color=border)],
        [Paragraph(eng.name if eng else "—", sig_sub_s), Paragraph(r.client_name or "—", sig_sub_s)],
        [Paragraph(f"{eng.position or ''}{' | ' + eng.employee_id if eng and eng.employee_id else ''}" if eng else "", sig_sub_s),
         Paragraph(r.client_company or "", sig_sub_s)],
    ]
    sig_t = Table(sig_rows, colWidths=[8.5*cm, 8.5*cm])
    sig_t.setStyle(TableStyle([
        ('ALIGN',(0,0),(-1,-1),'CENTER'), ('VALIGN',(0,0),(-1,-1),'MIDDLE'), ('PADDING',(0,0),(-1,-1),8),
        ('BOX',(0,0),(0,-1),0.5,border), ('BOX',(1,0),(1,-1),0.5,border),
        ('BACKGROUND',(0,0),(0,0),accent), ('BACKGROUND',(1,0),(1,0),accent),
    ]))
    elements.append(sig_t)

    # ── FOOTER ───────────────────────────────────────────────────
    def footer_canvas(cv, doc_obj):
        cv.saveState()
        pw, ph = A4
        cv.setStrokeColor(primary); cv.setLineWidth(1.5)
        cv.line(2*cm, 2.8*cm, pw-2*cm, 2.8*cm)
        cv.setFont("Helvetica-Bold", 9); cv.setFillColor(primary)
        cv.drawCentredString(pw/2, 2.3*cm, FLOTECH_INFO["name"])
        cv.setFont("Helvetica", 8); cv.setFillColor(colors.HexColor("#6B7280"))
        cv.drawCentredString(pw/2, 2.0*cm, f"{FLOTECH_INFO['address']}  |  {FLOTECH_INFO['city']}")
        cv.drawCentredString(pw/2, 1.7*cm, FLOTECH_INFO["telp"])
        cv.drawCentredString(pw/2, 1.4*cm, FLOTECH_INFO["email"])
        cv.setFillColor(colors.HexColor("#9CA3AF"))
        cv.drawCentredString(pw/2, 1.0*cm, f"Generated: {datetime.now().strftime('%d %B %Y %H:%M')}  |  Page {doc_obj.page}")
        cv.restoreState()

    doc.build(elements, onFirstPage=footer_canvas, onLaterPages=footer_canvas)
    buffer.seek(0)
    return buffer


@onsite_bp.route('/pdf/<int:rid>', methods=['GET'])
@jwt_required()
def download_pdf(rid):
    r = OnsiteReport.query.get(rid)
    if not r: return jsonify({"error": "Not found"}), 404
    buf = build_onsite_pdf(rid)
    if not buf: return jsonify({"error": "Failed"}), 500
    return send_file(buf, as_attachment=True, download_name=f"OnsiteReport_{r.report_number}.pdf", mimetype="application/pdf")


@onsite_bp.route('/pdf/preview/<int:rid>', methods=['GET'])
@jwt_required()
def preview_pdf(rid):
    r = OnsiteReport.query.get(rid)
    if not r: return jsonify({"error": "Not found"}), 404
    buf = build_onsite_pdf(rid)
    if not buf: return jsonify({"error": "Failed"}), 500
    return Response(buf, mimetype="application/pdf", headers={"Content-Disposition": f"inline; filename=OnsiteReport_{r.report_number}.pdf"})
