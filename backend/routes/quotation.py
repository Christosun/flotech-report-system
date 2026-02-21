from flask import Blueprint, request, jsonify, send_file, Response
from extensions import db
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.platypus import Image as RLImage
from PIL import Image as PILImage
from io import BytesIO
import os

quotation_bp = Blueprint('quotation', __name__)

from extensions import db

class Quotation(db.Model):
    __tablename__ = "quotations"
    id = db.Column(db.Integer, primary_key=True)
    quotation_number = db.Column(db.String(50), unique=True)
    customer_name = db.Column(db.String(150))
    customer_company = db.Column(db.String(200))
    customer_email = db.Column(db.String(120))
    customer_phone = db.Column(db.String(30))
    customer_address = db.Column(db.Text)
    project_name = db.Column(db.String(200))
    category = db.Column(db.String(100))
    status = db.Column(db.String(30), default="draft")
    valid_until = db.Column(db.Date)
    currency = db.Column(db.String(10), default="IDR")
    total_amount = db.Column(db.Float, default=0)
    notes = db.Column(db.Text)
    terms = db.Column(db.Text)
    items = db.Column(db.JSON)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


FLOTECH_INFO = {
    "name": "PT FLOTECH CONTROLS INDONESIA",
    "address": "Rukan Artha Gading Niaga, Blok F/7",
    "city": "Jl. Boulevard Artha Gading, Jakarta 14240",
    "telp": "Telp: +6221 45850778 / Fax: +6221 45850779",
    "email": "e-Mail: salesjkt@flotech.co.id / Website: www.flotech.com.sg",
}


@quotation_bp.route('/list', methods=['GET'])
@jwt_required()
def list_quotations():
    qs = Quotation.query.order_by(Quotation.created_at.desc()).all()
    result = []
    for q in qs:
        result.append({
            "id": q.id, "quotation_number": q.quotation_number,
            "customer_name": q.customer_name, "customer_company": q.customer_company,
            "customer_email": q.customer_email, "customer_phone": q.customer_phone,
            "project_name": q.project_name, "category": q.category,
            "status": q.status, "valid_until": q.valid_until.isoformat() if q.valid_until else None,
            "total_amount": q.total_amount, "created_at": q.created_at.isoformat() if q.created_at else None,
        })
    return jsonify(result), 200


@quotation_bp.route('/detail/<int:qid>', methods=['GET'])
@jwt_required()
def get_quotation(qid):
    q = Quotation.query.get(qid)
    if not q: return jsonify({"error": "Not found"}), 404
    return jsonify({
        "id": q.id, "quotation_number": q.quotation_number,
        "customer_name": q.customer_name, "customer_company": q.customer_company,
        "customer_email": q.customer_email, "customer_phone": q.customer_phone,
        "customer_address": q.customer_address, "project_name": q.project_name,
        "category": q.category, "status": q.status,
        "valid_until": q.valid_until.isoformat() if q.valid_until else None,
        "total_amount": q.total_amount, "notes": q.notes, "terms": q.terms,
        "items": q.items, "created_at": q.created_at.isoformat() if q.created_at else None,
    }), 200


@quotation_bp.route('/create', methods=['POST'])
@jwt_required()
def create_quotation():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    if Quotation.query.filter_by(quotation_number=data.get("quotation_number")).first():
        return jsonify({"error": "Nomor quotation sudah ada"}), 400
    valid_until = None
    if data.get("valid_until"):
        try: valid_until = datetime.strptime(data["valid_until"], "%Y-%m-%d").date()
        except: pass
    q = Quotation(
        quotation_number=data.get("quotation_number"),
        customer_name=data.get("customer_name"), customer_company=data.get("customer_company"),
        customer_email=data.get("customer_email"), customer_phone=data.get("customer_phone"),
        customer_address=data.get("customer_address"), project_name=data.get("project_name"),
        category=data.get("category"), valid_until=valid_until, currency=data.get("currency", "IDR"),
        total_amount=data.get("total_amount", 0), notes=data.get("notes"), terms=data.get("terms"),
        items=data.get("items", []), created_by=user_id,
    )
    db.session.add(q); db.session.commit()
    return jsonify({"message": "Quotation created", "id": q.id}), 201


@quotation_bp.route('/update/<int:qid>', methods=['PUT'])
@jwt_required()
def update_quotation(qid):
    q = Quotation.query.get(qid)
    if not q: return jsonify({"error": "Not found"}), 404
    data = request.get_json()
    if data.get("customer_name") is not None: q.customer_name = data["customer_name"]
    if data.get("customer_company") is not None: q.customer_company = data["customer_company"]
    if data.get("customer_email") is not None: q.customer_email = data["customer_email"]
    if data.get("customer_phone") is not None: q.customer_phone = data["customer_phone"]
    if data.get("customer_address") is not None: q.customer_address = data["customer_address"]
    if data.get("project_name") is not None: q.project_name = data["project_name"]
    if data.get("category") is not None: q.category = data["category"]
    if data.get("currency"): q.currency = data["currency"]
    if data.get("notes") is not None: q.notes = data["notes"]
    if data.get("terms") is not None: q.terms = data["terms"]
    if data.get("items") is not None: q.items = data["items"]
    if data.get("total_amount") is not None: q.total_amount = data["total_amount"]
    if data.get("valid_until"):
        try: q.valid_until = datetime.strptime(data["valid_until"], "%Y-%m-%d").date()
        except: pass
    q.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"message": "Quotation updated"}), 200


@quotation_bp.route('/status/<int:qid>', methods=['PUT'])
@jwt_required()
def update_status(qid):
    q = Quotation.query.get(qid)
    if not q: return jsonify({"error": "Not found"}), 404
    q.status = request.get_json().get("status", q.status)
    q.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"message": "Status updated"}), 200


@quotation_bp.route('/delete/<int:qid>', methods=['DELETE'])
@jwt_required()
def delete_quotation(qid):
    q = Quotation.query.get(qid)
    if not q: return jsonify({"error": "Not found"}), 404
    db.session.delete(q); db.session.commit()
    return jsonify({"message": "Deleted"}), 200


def format_rupiah(val):
    try: num = float(val) or 0
    except: num = 0
    return f"Rp {num:,.0f}".replace(",", ".")


def build_quotation_pdf(q):
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
        topMargin=2*cm, bottomMargin=3.5*cm, leftMargin=2*cm, rightMargin=2*cm,
        title=f"Quotation {q.quotation_number}", author="PT Flotech Controls Indonesia")

    primary   = colors.HexColor("#0B3D91")
    secondary = colors.HexColor("#1E5CC6")
    accent    = colors.HexColor("#EEF3FB")
    dark      = colors.HexColor("#1a1a2e")
    text_clr  = colors.HexColor("#374151")
    gray      = colors.HexColor("#6B7280")
    light_gray= colors.HexColor("#F3F4F6")
    border    = colors.HexColor("#D1D5DB")
    white     = colors.white

    def ps(name, **kw):
        d = dict(fontName='Helvetica', fontSize=10, textColor=text_clr, leading=14)
        d.update(kw); return ParagraphStyle(name, **d)

    doc_title_style    = ps('DocTitle', fontSize=22, fontName='Helvetica-Bold', textColor=white, alignment=2, leading=26)
    doc_sub_style      = ps('DocSub', fontSize=10, textColor=colors.HexColor("#BFD3F5"), alignment=2, leading=13)
    section_title_style= ps('SecTitle', fontSize=10, fontName='Helvetica-Bold', textColor=primary, spaceBefore=10, spaceAfter=4)
    label_style        = ps('Label', fontSize=8, fontName='Helvetica-Bold', textColor=gray)
    value_style        = ps('Value', fontSize=10, textColor=dark)
    th_style           = ps('TH', fontSize=9, fontName='Helvetica-Bold', textColor=white, alignment=1)
    td_style           = ps('TD', fontSize=9, textColor=dark)
    td_right           = ps('TDR', fontSize=9, textColor=dark, alignment=2)
    td_center          = ps('TDC', fontSize=9, textColor=dark, alignment=1)
    total_label_style  = ps('TotalLabel', fontSize=10, fontName='Helvetica-Bold', textColor=gray, alignment=2)
    total_value_style  = ps('TotalValue', fontSize=10, fontName='Helvetica-Bold', textColor=dark, alignment=2)
    grand_label_style  = ps('GrandLabel', fontSize=11, fontName='Helvetica-Bold', textColor=white, alignment=2)
    grand_value_style  = ps('GrandValue', fontSize=11, fontName='Helvetica-Bold', textColor=white, alignment=2)
    note_style         = ps('Note', fontSize=9, textColor=text_clr, leading=13)
    terms_item_style   = ps('TermsItem', fontSize=9, textColor=text_clr, leading=13, leftIndent=10)

    elements = []

    # ─── HEADER: logo (proportional aspect) + QUOTATION title ──
    logo_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "logo.png")
    if os.path.exists(logo_path):
        try:
            pil_logo = PILImage.open(logo_path)
            lw, lh = pil_logo.size
            target_h = 1.8*cm
            target_w = min((lw / lh) * target_h, 5*cm)
            logo_cell = RLImage(logo_path, width=target_w, height=target_h)
            logo_cell.hAlign = 'LEFT'
        except:
            logo_cell = Paragraph("<b>FLOTECH</b>", ps('LogoFB', fontSize=20, fontName='Helvetica-Bold', textColor=primary))
    else:
        logo_cell = Paragraph("<b>FLOTECH</b>", ps('LogoFB', fontSize=20, fontName='Helvetica-Bold', textColor=primary))

    # Right: QUOTATION title block only (no company address)
    right_block = Table([
        [Paragraph("QUOTATION", doc_title_style)],
        [Paragraph(q.quotation_number or "", doc_sub_style)],
    ], colWidths=[8.5*cm])
    right_block.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), primary),
        ('PADDING', (0, 0), (-1, -1), 10),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))

    header_row = Table([[logo_cell, right_block]], colWidths=[8*cm, 9*cm])
    header_row.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
    ]))
    elements.append(header_row)
    elements.append(Spacer(1, 0.3*cm))
    elements.append(HRFlowable(width="100%", thickness=2, color=primary))
    elements.append(Spacer(1, 0.4*cm))

    # ─── META: date, validity ───────────────────────────────────
    date_str  = q.created_at.strftime("%d %B %Y") if q.created_at else "-"
    valid_str = q.valid_until.strftime("%d %B %Y") if q.valid_until else "-"

    meta_data = [[
        Paragraph("<b>Tanggal</b>", label_style), Paragraph(date_str, value_style),
        Paragraph("<b>Berlaku Hingga</b>", label_style), Paragraph(valid_str, value_style),
        Paragraph("<b>Mata Uang</b>", label_style), Paragraph(q.currency or "IDR", ps('Cur', fontSize=10, fontName='Helvetica-Bold', textColor=primary)),
    ]]
    meta_table = Table(meta_data, colWidths=[2.5*cm, 4*cm, 3*cm, 4*cm, 2.5*cm, 1.5*cm])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), accent),
        ('BOX', (0, 0), (-1, -1), 0.5, border),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LINEAFTER', (1, 0), (1, 0), 0.5, border),
        ('LINEAFTER', (3, 0), (3, 0), 0.5, border),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 0.5*cm))

    # ─── CUSTOMER INFO + PROJECT DETAILS (two columns) ─────────
    cust_items = [
        [Paragraph("INFORMASI CUSTOMER", ps('CustH', fontSize=9, fontName='Helvetica-Bold', textColor=white))],
        [Paragraph(q.customer_company or "-", ps('CustComp', fontSize=11, fontName='Helvetica-Bold', textColor=dark))],
        [Paragraph(q.customer_name or "", ps('CustName', fontSize=9, textColor=text_clr))],
    ]
    if q.customer_address:
        cust_items.append([Paragraph(q.customer_address, ps('CustAddr', fontSize=9, textColor=gray, leading=12))])
    if q.customer_email:
        cust_items.append([Paragraph(f"✉ {q.customer_email}", ps('CustEmail', fontSize=9, textColor=gray))])
    if q.customer_phone:
        cust_items.append([Paragraph(f"☎ {q.customer_phone}", ps('CustPhone', fontSize=9, textColor=gray))])

    cust_table = Table(cust_items, colWidths=[7.5*cm])
    cust_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, 0), primary),
        ('BACKGROUND', (0, 1), (-1, -1), accent),
        ('BOX', (0, 0), (-1, -1), 0.5, border),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))

    proj_items = [
        [Paragraph("PROJECT DETAILS", ps('ProjH', fontSize=9, fontName='Helvetica-Bold', textColor=white))],
        [Paragraph(q.project_name or "-", ps('ProjName', fontSize=11, fontName='Helvetica-Bold', textColor=dark))],
    ]
    if q.category:
        proj_items.append([Paragraph(f"Kategori: {q.category}", ps('ProjCat', fontSize=9, textColor=gray))])

    proj_table = Table(proj_items, colWidths=[7.5*cm])
    proj_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, 0), secondary),
        ('BACKGROUND', (0, 1), (-1, -1), accent),
        ('BOX', (0, 0), (-1, -1), 0.5, border),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))

    two_col = Table([[cust_table, proj_table]], colWidths=[8*cm, 8.5*cm])
    two_col.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('RIGHTPADDING', (0, 0), (0, 0), 10)]))
    elements.append(two_col)
    elements.append(Spacer(1, 0.6*cm))

    # ─── ITEMS TABLE ────────────────────────────────────────────
    elements.append(Paragraph("▌ RINCIAN PENAWARAN", section_title_style))
    elements.append(Spacer(1, 0.2*cm))

    items_header = [Paragraph(h, th_style) for h in ["No", "Deskripsi Produk / Jasa", "Brand / Model", "Qty", "Satuan", "Harga Satuan", "Disc", "Subtotal"]]
    items_data = [items_header]
    subtotal = 0
    for i, item in enumerate(q.items or []):
        price = float(item.get("unit_price") or 0)
        qty   = float(item.get("qty") or 0)
        disc  = float(item.get("discount") or 0)
        sub   = price * qty * (1 - disc / 100)
        subtotal += sub
        desc = item.get("description", "")
        if item.get("remarks"): desc += f"\n<font size='8' color='#6B7280'>{item['remarks']}</font>"
        items_data.append([
            Paragraph(str(i + 1), td_center),
            Paragraph(desc, td_style),
            Paragraph(f"<b>{item.get('brand','')}</b>\n<font size='8'>{item.get('model','')}</font>", td_style),
            Paragraph(str(int(qty)), td_center),
            Paragraph(item.get("unit", "pcs"), td_center),
            Paragraph(format_rupiah(price), td_right),
            Paragraph(f"{int(disc)}%" if disc > 0 else "—", td_center),
            Paragraph(format_rupiah(sub), td_right),
        ])

    ppn = subtotal * 0.11
    grand_total = subtotal + ppn
    n_items = len(q.items or [])

    items_data.append(["", "", "", "", "", Paragraph("Subtotal", total_label_style), "", Paragraph(format_rupiah(subtotal), total_value_style)])
    items_data.append(["", "", "", "", "", Paragraph("PPN 11%", total_label_style), "", Paragraph(format_rupiah(ppn), total_value_style)])
    items_data.append([
        Paragraph("TOTAL", ps('TFL', fontSize=11, fontName='Helvetica-Bold', textColor=white, alignment=1)),
        "", "", "", "",
        Paragraph("TOTAL + PPN", grand_label_style), "",
        Paragraph(format_rupiah(grand_total), grand_value_style),
    ])

    col_w = [1*cm, 5.5*cm, 3.5*cm, 1.2*cm, 1.5*cm, 2.8*cm, 1.2*cm, 2.8*cm]
    items_table = Table(items_data, colWidths=col_w, repeatRows=1)
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), primary),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('ROWBACKGROUNDS', (0, 1), (-1, n_items), [white, light_gray]),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('ALIGN', (3, 0), (4, -1), 'CENTER'),
        ('ALIGN', (5, 0), (-1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('PADDING', (0, 0), (-1, -1), 7),
        ('LINEBELOW', (0, 0), (-1, -3), 0.3, border),
        ('BACKGROUND', (0, n_items+1), (-1, n_items+2), accent),
        ('LINEABOVE', (0, n_items+1), (-1, n_items+1), 1.5, border),
        ('BACKGROUND', (0, n_items+3), (-1, n_items+3), primary),
        ('SPAN', (0, n_items+3), (4, n_items+3)),
        ('BOX', (0, 0), (-1, -1), 0.5, border),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 0.7*cm))

    # ─── NOTES & TERMS ──────────────────────────────────────────
    if q.notes or q.terms:
        nt_cols = []
        if q.notes:
            note_rows = [[Paragraph("CATATAN", ps('NH', fontSize=9, fontName='Helvetica-Bold', textColor=white))], [Paragraph(q.notes, note_style)]]
            note_t = Table(note_rows, colWidths=[7.5*cm])
            note_t.setStyle(TableStyle([('BACKGROUND', (0, 0), (0, 0), secondary), ('BACKGROUND', (0, 1), (-1, -1), accent), ('BOX', (0, 0), (-1, -1), 0.5, border), ('PADDING', (0, 0), (-1, -1), 9)]))
            nt_cols.append(note_t)
        if q.terms:
            lines = [l.strip() for l in q.terms.split('\n') if l.strip()]
            terms_rows = [[Paragraph("SYARAT & KETENTUAN", ps('TH2', fontSize=9, fontName='Helvetica-Bold', textColor=white))]]
            for line in lines: terms_rows.append([Paragraph(f"• {line}", terms_item_style)])
            terms_t = Table(terms_rows, colWidths=[8.5*cm] if q.notes else [16.5*cm])
            terms_t.setStyle(TableStyle([('BACKGROUND', (0, 0), (0, 0), primary), ('BACKGROUND', (0, 1), (-1, -1), accent), ('BOX', (0, 0), (-1, -1), 0.5, border), ('PADDING', (0, 0), (-1, -1), 9)]))
            nt_cols.append(terms_t)
        if len(nt_cols) == 2:
            nt_row = Table([nt_cols], colWidths=[7.5*cm, 9*cm])
            nt_row.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('RIGHTPADDING', (0, 0), (0, 0), 10)]))
        else:
            nt_row = nt_cols[0]
        elements.append(nt_row)
        elements.append(Spacer(1, 0.6*cm))

    # ─── SIGNATURES ─────────────────────────────────────────────
    elements.append(Spacer(1, 0.3*cm))
    sig_label = ps('SigLabel', fontSize=9, fontName='Helvetica-Bold', textColor=primary, alignment=1)
    sig_name  = ps('SigName', fontSize=9, textColor=gray, alignment=1)
    sig_data = [
        [Paragraph("DISIAPKAN OLEH", sig_label), Paragraph("DISETUJUI OLEH", sig_label), Paragraph("DITERIMA OLEH", sig_label)],
        [Spacer(1, 2*cm), Spacer(1, 2*cm), Spacer(1, 2*cm)],
        [HRFlowable(width=4.5*cm, thickness=0.5, color=border), HRFlowable(width=4.5*cm, thickness=0.5, color=border), HRFlowable(width=4.5*cm, thickness=0.5, color=border)],
        [Paragraph("PT Flotech Controls Indonesia", sig_name), Paragraph("PT Flotech Controls Indonesia", sig_name), Paragraph(q.customer_company or "Customer", sig_name)],
    ]
    sig_t = Table(sig_data, colWidths=[5.5*cm, 5.5*cm, 5.5*cm])
    sig_t.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('PADDING', (0, 0), (-1, -1), 6),
        ('BOX', (0, 0), (0, -1), 0.3, border), ('BOX', (1, 0), (1, -1), 0.3, border), ('BOX', (2, 0), (2, -1), 0.3, border),
    ]))
    elements.append(sig_t)

    # ─── FOOTER ─────────────────────────────────────────────────
    def footer_canvas(cv, doc_obj):
        cv.saveState()
        pw, ph = A4
        cv.setStrokeColor(primary)
        cv.setLineWidth(1.5)
        cv.line(2*cm, 2.8*cm, pw - 2*cm, 2.8*cm)
        cv.setFont("Helvetica-Bold", 9)
        cv.setFillColor(primary)
        cv.drawCentredString(pw/2, 2.3*cm, FLOTECH_INFO["name"])
        cv.setFont("Helvetica", 8)
        cv.setFillColor(colors.HexColor("#6B7280"))
        cv.drawCentredString(pw/2, 2.0*cm, f"{FLOTECH_INFO['address']}  |  {FLOTECH_INFO['city']}")
        cv.drawCentredString(pw/2, 1.7*cm, FLOTECH_INFO["telp"])
        cv.drawCentredString(pw/2, 1.4*cm, FLOTECH_INFO["email"])
        cv.setFont("Helvetica", 8)
        cv.setFillColor(colors.HexColor("#9CA3AF"))
        cv.drawRightString(pw - 2*cm, 1.1*cm, f"Halaman {doc_obj.page}")
        cv.restoreState()

    doc.build(elements, onFirstPage=footer_canvas, onLaterPages=footer_canvas)
    buffer.seek(0)
    return buffer


@quotation_bp.route('/pdf/<int:qid>', methods=['GET'])
@jwt_required()
def quotation_pdf(qid):
    q = Quotation.query.get(qid)
    if not q: return jsonify({"error": "Not found"}), 404
    buf = build_quotation_pdf(q)
    return send_file(buf, as_attachment=True, download_name=f"Quotation_{q.quotation_number}.pdf", mimetype="application/pdf")


@quotation_bp.route('/pdf/preview/<int:qid>', methods=['GET'])
@jwt_required()
def quotation_pdf_preview(qid):
    q = Quotation.query.get(qid)
    if not q: return jsonify({"error": "Not found"}), 404
    buf = build_quotation_pdf(q)
    return Response(buf, mimetype="application/pdf",
        headers={"Content-Disposition": f"inline; filename=Quotation_{q.quotation_number}.pdf"})