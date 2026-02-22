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

def format_rupiah(amount):
    try:
        return f"Rp {amount:,.0f}".replace(",", ".")
    except:
        return "Rp 0"

@quotation_bp.route('/list', methods=['GET'])
@jwt_required()
def list_quotations():
    qs = Quotation.query.order_by(Quotation.created_at.desc()).all()
    result = []
    for q in qs:
        result.append({
            "id": q.id, "quotation_number": q.quotation_number,
            "customer_name": q.customer_name, "customer_company": q.customer_company,
            "project_name": q.project_name, "category": q.category,
            "status": q.status, "total_amount": q.total_amount,
            "currency": q.currency,
            "created_at": q.created_at.isoformat() if q.created_at else None,
            "valid_until": q.valid_until.isoformat() if q.valid_until else None,
        })
    return jsonify(result), 200

@quotation_bp.route('/create', methods=['POST'])
@jwt_required()
def create_quotation():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    valid_until = None
    if data.get("valid_until"):
        try: valid_until = datetime.strptime(data["valid_until"], "%Y-%m-%d").date()
        except: pass
    q = Quotation(
        quotation_number=data.get("quotation_number"),
        customer_name=data.get("customer_name"), customer_company=data.get("customer_company"),
        customer_email=data.get("customer_email"), customer_phone=data.get("customer_phone"),
        customer_address=data.get("customer_address"), project_name=data.get("project_name"),
        category=data.get("category"), status=data.get("status", "draft"),
        valid_until=valid_until, currency=data.get("currency", "IDR"),
        total_amount=data.get("total_amount", 0), notes=data.get("notes"),
        terms=data.get("terms"), items=data.get("items", []), created_by=user_id,
    )
    db.session.add(q); db.session.commit()
    return jsonify({"message": "Quotation created", "id": q.id}), 201

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
        "currency": q.currency, "total_amount": q.total_amount,
        "notes": q.notes, "terms": q.terms, "items": q.items or [],
        "created_at": q.created_at.isoformat() if q.created_at else None,
    }), 200

@quotation_bp.route('/update/<int:qid>', methods=['PUT'])
@jwt_required()
def update_quotation(qid):
    q = Quotation.query.get(qid)
    if not q: return jsonify({"error": "Not found"}), 404
    data = request.get_json()
    for f in ["customer_name","customer_company","customer_email","customer_phone","customer_address",
              "project_name","category","currency","notes","terms","items","total_amount","status"]:
        if f in data: setattr(q, f, data[f])
    if data.get("valid_until"):
        try: q.valid_until = datetime.strptime(data["valid_until"], "%Y-%m-%d").date()
        except: pass
    q.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"message": "Updated"}), 200

@quotation_bp.route('/status/<int:qid>', methods=['PUT'])
@jwt_required()
def update_status(qid):
    q = Quotation.query.get(qid)
    if not q: return jsonify({"error": "Not found"}), 404
    q.status = request.get_json().get("status", q.status)
    db.session.commit()
    return jsonify({"message": "Status updated"}), 200

@quotation_bp.route('/delete/<int:qid>', methods=['DELETE'])
@jwt_required()
def delete_quotation(qid):
    q = Quotation.query.get(qid)
    if not q: return jsonify({"error": "Not found"}), 404
    db.session.delete(q); db.session.commit()
    return jsonify({"message": "Deleted"}), 200

# ─────────────────────────────────────────────────────────────────────────────
# PDF BUILDER — Rapi, sejajar, semua kolom presisi
# ─────────────────────────────────────────────────────────────────────────────
def build_quotation_pdf(q):
    buffer = BytesIO()
    # Total usable width = 210mm - 20mm - 20mm = 170mm = 17cm
    LEFT = RIGHT = 2*cm
    usable_w = 17*cm

    doc = SimpleDocTemplate(buffer, pagesize=A4,
        topMargin=2*cm, bottomMargin=3.5*cm, leftMargin=LEFT, rightMargin=RIGHT,
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

    elements = []

    # ── HEADER ──────────────────────────────────────────────────
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
            logo_cell = Paragraph("<b>FLOTECH</b>", ps('LF', fontSize=18, fontName='Helvetica-Bold', textColor=primary))
    else:
        logo_cell = Paragraph("<b>FLOTECH</b>", ps('LF', fontSize=18, fontName='Helvetica-Bold', textColor=primary))

    logo_col_w = 8*cm
    title_col_w = usable_w - logo_col_w  # 9cm

    right_block = Table([
        [Paragraph("QUOTATION", ps('T', fontSize=22, fontName='Helvetica-Bold', textColor=white, alignment=2, leading=26))],
        [Paragraph(q.quotation_number or "", ps('S', fontSize=10, textColor=colors.HexColor("#BFD3F5"), alignment=2))],
    ], colWidths=[title_col_w])
    right_block.setStyle(TableStyle([
        ('BACKGROUND', (0,0),(-1,-1), primary),
        ('PADDING', (0,0),(-1,-1), 10),
        ('VALIGN', (0,0),(-1,-1), 'MIDDLE'),
    ]))

    header_row = Table([[logo_cell, right_block]], colWidths=[logo_col_w, title_col_w])
    header_row.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'MIDDLE')]))
    elements.append(header_row)
    elements.append(Spacer(1, 0.3*cm))
    elements.append(HRFlowable(width="100%", thickness=2, color=primary))
    elements.append(Spacer(1, 0.4*cm))

    # ── META TABLE (full width, 3 pairs = 6 cols) ────────────────
    date_str  = q.created_at.strftime("%d %B %Y") if q.created_at else "-"
    valid_str = q.valid_until.strftime("%d %B %Y") if q.valid_until else "-"
    # colWidths must sum to usable_w = 17cm
    # label=3cm, value=5cm, label=3cm, value=3cm, label=1.5cm, value=1.5cm = 17cm
    meta_col_w = [3*cm, 5*cm, 3*cm, 3.5*cm, 1.5*cm, 1*cm]
    meta_data = [[
        Paragraph("<b>Tanggal</b>", ps('ML', fontSize=8, fontName='Helvetica-Bold', textColor=gray)),
        Paragraph(date_str, ps('MV', fontSize=10, textColor=dark)),
        Paragraph("<b>Berlaku Hingga</b>", ps('ML2', fontSize=8, fontName='Helvetica-Bold', textColor=gray)),
        Paragraph(valid_str, ps('MV2', fontSize=10, textColor=dark)),
        Paragraph("<b>Mata Uang</b>", ps('ML3', fontSize=8, fontName='Helvetica-Bold', textColor=gray)),
        Paragraph(q.currency or "IDR", ps('MV3', fontSize=10, fontName='Helvetica-Bold', textColor=primary)),
    ]]
    meta_table = Table(meta_data, colWidths=meta_col_w)
    meta_table.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,-1), accent),
        ('BOX',(0,0),(-1,-1), 0.5, border),
        ('LINEAFTER',(1,0),(1,0), 0.5, border),
        ('LINEAFTER',(3,0),(3,0), 0.5, border),
        ('PADDING',(0,0),(-1,-1), 9),
        ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 0.5*cm))

    # ── CUSTOMER + PROJECT (two columns, each = half usable_w) ──
    half_w = usable_w / 2  # 8.5cm each
    gap = 0.4*cm
    col_a = half_w - gap/2  # 8.3cm
    col_b = half_w - gap/2  # 8.3cm

    cust_rows = [[Paragraph("INFORMASI CUSTOMER", ps('CH', fontSize=9, fontName='Helvetica-Bold', textColor=white))]]
    if q.customer_company: cust_rows.append([Paragraph(q.customer_company, ps('CC', fontSize=11, fontName='Helvetica-Bold', textColor=dark, leading=14))])
    if q.customer_name:    cust_rows.append([Paragraph(q.customer_name, ps('CN', fontSize=9, textColor=text_clr))])
    if q.customer_address: cust_rows.append([Paragraph(q.customer_address, ps('CA', fontSize=9, textColor=gray, leading=12))])
    if q.customer_email:   cust_rows.append([Paragraph(f"✉  {q.customer_email}", ps('CE', fontSize=9, textColor=gray))])
    if q.customer_phone:   cust_rows.append([Paragraph(f"☎  {q.customer_phone}", ps('CP', fontSize=9, textColor=gray))])
    cust_t = Table(cust_rows, colWidths=[col_a])
    cust_t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(0,0),primary), ('BACKGROUND',(0,1),(-1,-1),accent),
        ('BOX',(0,0),(-1,-1),0.5,border), ('PADDING',(0,0),(-1,-1),9), ('VALIGN',(0,0),(-1,-1),'TOP'),
    ]))

    proj_rows = [[Paragraph("PROJECT DETAILS", ps('PH', fontSize=9, fontName='Helvetica-Bold', textColor=white))]]
    proj_rows.append([Paragraph(q.project_name or "-", ps('PN', fontSize=11, fontName='Helvetica-Bold', textColor=dark, leading=14))])
    if q.category: proj_rows.append([Paragraph(f"Kategori: {q.category}", ps('PC', fontSize=9, textColor=gray))])
    proj_t = Table(proj_rows, colWidths=[col_b])
    proj_t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(0,0),secondary), ('BACKGROUND',(0,1),(-1,-1),accent),
        ('BOX',(0,0),(-1,-1),0.5,border), ('PADDING',(0,0),(-1,-1),9), ('VALIGN',(0,0),(-1,-1),'TOP'),
    ]))

    two_col = Table([[cust_t, proj_t]], colWidths=[col_a, col_b])
    two_col.setStyle(TableStyle([
        ('VALIGN',(0,0),(-1,-1),'TOP'),
        ('RIGHTPADDING',(0,0),(0,0), gap),
    ]))
    elements.append(two_col)
    elements.append(Spacer(1, 0.6*cm))

    # ── ITEMS TABLE ──────────────────────────────────────────────
    elements.append(Paragraph("▌ RINCIAN PENAWARAN", ps('SecH', fontSize=10, fontName='Helvetica-Bold', textColor=primary, spaceBefore=4, spaceAfter=4)))
    elements.append(Spacer(1, 0.2*cm))

    th_s  = ps('TH', fontSize=8, fontName='Helvetica-Bold', textColor=white, alignment=1)
    td_s  = ps('TD', fontSize=9, textColor=dark, leading=12)
    td_r  = ps('TDR', fontSize=9, textColor=dark, alignment=2)
    td_c  = ps('TDC', fontSize=9, textColor=dark, alignment=1)
    tot_l = ps('TL', fontSize=9, fontName='Helvetica-Bold', textColor=gray, alignment=2)
    tot_v = ps('TV', fontSize=9, fontName='Helvetica-Bold', textColor=dark, alignment=2)
    grd_l = ps('GL', fontSize=10, fontName='Helvetica-Bold', textColor=white, alignment=2)
    grd_v = ps('GV', fontSize=10, fontName='Helvetica-Bold', textColor=white, alignment=2)

    # Precise column widths that sum to exactly usable_w = 17cm
    # No  Desc  Brand/Model  Qty  Unit  HargaSatuan  Disc  Subtotal
    col_w = [0.7*cm, 5.3*cm, 3.0*cm, 1.0*cm, 1.2*cm, 2.8*cm, 0.9*cm, 2.1*cm]
    # sum = 0.7+5.3+3.0+1.0+1.2+2.8+0.9+2.1 = 17.0cm ✓

    items_header = [Paragraph(h, th_s) for h in ["No", "Deskripsi Produk / Jasa", "Brand / Model", "Qty", "Satuan", "Harga Satuan", "Disc", "Subtotal"]]
    items_data = [items_header]
    subtotal = 0
    for i, item in enumerate(q.items or []):
        price = float(item.get("unit_price") or 0)
        qty   = float(item.get("qty") or 0)
        disc  = float(item.get("discount") or 0)
        sub   = price * qty * (1 - disc / 100)
        subtotal += sub
        desc_text = item.get("description", "")
        if item.get("remarks"):
            desc_text += f"\n<font size='7' color='#6B7280'>{item['remarks']}</font>"
        brand_model = ""
        if item.get("brand"): brand_model += f"<b>{item['brand']}</b>"
        if item.get("model"): brand_model += f"\n<font size='7'>{item['model']}</font>"
        items_data.append([
            Paragraph(str(i+1), td_c),
            Paragraph(desc_text, td_s),
            Paragraph(brand_model, td_s),
            Paragraph(str(int(qty)), td_c),
            Paragraph(item.get("unit","pcs"), td_c),
            Paragraph(format_rupiah(price), td_r),
            Paragraph(f"{int(disc)}%" if disc > 0 else "—", td_c),
            Paragraph(format_rupiah(sub), td_r),
        ])

    ppn = subtotal * 0.11
    grand = subtotal + ppn
    n = len(q.items or [])

    # Subtotal row
    items_data.append([
        Paragraph("", td_s), Paragraph("", td_s), Paragraph("", td_s), Paragraph("", td_s), Paragraph("", td_s),
        Paragraph("Subtotal", tot_l), Paragraph("", td_s),
        Paragraph(format_rupiah(subtotal), tot_v),
    ])
    # PPN row
    items_data.append([
        Paragraph("", td_s), Paragraph("", td_s), Paragraph("", td_s), Paragraph("", td_s), Paragraph("", td_s),
        Paragraph("PPN 11%", tot_l), Paragraph("", td_s),
        Paragraph(format_rupiah(ppn), tot_v),
    ])
    # Grand total row
    items_data.append([
        Paragraph("TOTAL", ps('GTFL', fontSize=10, fontName='Helvetica-Bold', textColor=white, alignment=1)),
        Paragraph("", td_s), Paragraph("", td_s), Paragraph("", td_s),
        Paragraph("", td_s),
        Paragraph("TOTAL + PPN", grd_l), Paragraph("", td_s),
        Paragraph(format_rupiah(grand), grd_v),
    ])

    items_t = Table(items_data, colWidths=col_w, repeatRows=1)
    items_t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0), primary),
        ('ROWBACKGROUNDS',(0,1),(-1,n), [white, light_gray]),
        ('BACKGROUND',(0,n+1),(-1,n+2), accent),
        ('BACKGROUND',(0,n+3),(-1,n+3), primary),
        ('SPAN',(0,n+3),(4,n+3)),
        ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
        ('PADDING',(0,0),(-1,-1), 6),
        ('LINEBELOW',(0,0),(-1,n), 0.3, border),
        ('LINEABOVE',(0,n+1),(-1,n+1), 1.5, border),
        ('BOX',(0,0),(-1,-1), 0.5, border),
        ('ALIGN',(0,0),(0,-1),'CENTER'),
        ('ALIGN',(3,0),(4,-1),'CENTER'),
        ('ALIGN',(5,0),(-1,-1),'RIGHT'),
        ('ALIGN',(6,0),(6,-1),'CENTER'),
    ]))
    elements.append(items_t)
    elements.append(Spacer(1, 0.7*cm))

    # ── NOTES & TERMS ────────────────────────────────────────────
    if q.notes or q.terms:
        note_s = ps('Note', fontSize=9, textColor=text_clr, leading=13)
        term_s = ps('Term', fontSize=9, textColor=text_clr, leading=13, leftIndent=8)
        nt_cells = []
        if q.notes and q.terms:
            note_col_w = 8*cm
            term_col_w = usable_w - note_col_w - 0.4*cm  # gap
            note_rows = [[Paragraph("CATATAN", ps('NH', fontSize=9, fontName='Helvetica-Bold', textColor=white))],
                         [Paragraph(q.notes, note_s)]]
            note_t2 = Table(note_rows, colWidths=[note_col_w])
            note_t2.setStyle(TableStyle([('BACKGROUND',(0,0),(0,0),secondary),('BACKGROUND',(0,1),(-1,-1),accent),('BOX',(0,0),(-1,-1),0.5,border),('PADDING',(0,0),(-1,-1),9)]))

            lines = [l.strip() for l in q.terms.split('\n') if l.strip()]
            term_rows = [[Paragraph("SYARAT & KETENTUAN", ps('TH2', fontSize=9, fontName='Helvetica-Bold', textColor=white))]]
            for line in lines: term_rows.append([Paragraph(f"•  {line}", term_s)])
            term_t2 = Table(term_rows, colWidths=[term_col_w])
            term_t2.setStyle(TableStyle([('BACKGROUND',(0,0),(0,0),primary),('BACKGROUND',(0,1),(-1,-1),accent),('BOX',(0,0),(-1,-1),0.5,border),('PADDING',(0,0),(-1,-1),9)]))

            nt_row = Table([[note_t2, term_t2]], colWidths=[note_col_w, term_col_w])
            nt_row.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('RIGHTPADDING',(0,0),(0,0),0.4*cm)]))
            elements.append(nt_row)
        elif q.notes:
            note_rows = [[Paragraph("CATATAN", ps('NH2', fontSize=9, fontName='Helvetica-Bold', textColor=white))],
                         [Paragraph(q.notes, note_s)]]
            note_t3 = Table(note_rows, colWidths=[usable_w])
            note_t3.setStyle(TableStyle([('BACKGROUND',(0,0),(0,0),secondary),('BACKGROUND',(0,1),(-1,-1),accent),('BOX',(0,0),(-1,-1),0.5,border),('PADDING',(0,0),(-1,-1),9)]))
            elements.append(note_t3)
        elif q.terms:
            lines = [l.strip() for l in q.terms.split('\n') if l.strip()]
            term_rows2 = [[Paragraph("SYARAT & KETENTUAN", ps('TH3', fontSize=9, fontName='Helvetica-Bold', textColor=white))]]
            for line in lines: term_rows2.append([Paragraph(f"•  {line}", term_s)])
            term_t3 = Table(term_rows2, colWidths=[usable_w])
            term_t3.setStyle(TableStyle([('BACKGROUND',(0,0),(0,0),primary),('BACKGROUND',(0,1),(-1,-1),accent),('BOX',(0,0),(-1,-1),0.5,border),('PADDING',(0,0),(-1,-1),9)]))
            elements.append(term_t3)
        elements.append(Spacer(1, 0.6*cm))

    # ── SIGNATURES (3 cols, sum = usable_w) ─────────────────────
    sig_col_w = usable_w / 3  # 5.667cm each
    sig_l = ps('SL', fontSize=9, fontName='Helvetica-Bold', textColor=primary, alignment=1)
    sig_n = ps('SN', fontSize=9, textColor=gray, alignment=1)
    sig_data = [
        [Paragraph("DISIAPKAN OLEH", sig_l), Paragraph("DISETUJUI OLEH", sig_l), Paragraph("DITERIMA OLEH", sig_l)],
        [Spacer(1, 2*cm), Spacer(1, 2*cm), Spacer(1, 2*cm)],
        [HRFlowable(width=sig_col_w-1*cm, thickness=0.5, color=border),
         HRFlowable(width=sig_col_w-1*cm, thickness=0.5, color=border),
         HRFlowable(width=sig_col_w-1*cm, thickness=0.5, color=border)],
        [Paragraph("PT Flotech Controls Indonesia", sig_n),
         Paragraph("PT Flotech Controls Indonesia", sig_n),
         Paragraph(q.customer_company or "Customer", sig_n)],
    ]
    sig_t = Table(sig_data, colWidths=[sig_col_w, sig_col_w, sig_col_w])
    sig_t.setStyle(TableStyle([
        ('ALIGN',(0,0),(-1,-1),'CENTER'), ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
        ('PADDING',(0,0),(-1,-1), 6),
        ('BOX',(0,0),(0,-1), 0.3, border),
        ('BOX',(1,0),(1,-1), 0.3, border),
        ('BOX',(2,0),(2,-1), 0.3, border),
    ]))
    elements.append(sig_t)

    # ── FOOTER ───────────────────────────────────────────────────
    def footer_canvas(cv, doc_obj):
        cv.saveState()
        pw, ph = A4
        cv.setStrokeColor(primary); cv.setLineWidth(1.5)
        cv.line(LEFT, 2.8*cm, pw-RIGHT, 2.8*cm)
        cv.setFont("Helvetica-Bold", 9); cv.setFillColor(primary)
        cv.drawCentredString(pw/2, 2.3*cm, FLOTECH_INFO["name"])
        cv.setFont("Helvetica", 8); cv.setFillColor(colors.HexColor("#6B7280"))
        cv.drawCentredString(pw/2, 2.0*cm, f"{FLOTECH_INFO['address']}  |  {FLOTECH_INFO['city']}")
        cv.drawCentredString(pw/2, 1.7*cm, FLOTECH_INFO["telp"])
        cv.drawCentredString(pw/2, 1.4*cm, FLOTECH_INFO["email"])
        cv.setFillColor(colors.HexColor("#9CA3AF"))
        cv.drawRightString(pw-RIGHT, 1.1*cm, f"Halaman {doc_obj.page}")
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