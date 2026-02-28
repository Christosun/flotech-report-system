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
import re

quotation_bp = Blueprint('quotation', __name__)

class Quotation(db.Model):
    __tablename__ = "quotations"
    id = db.Column(db.Integer, primary_key=True)
    quotation_number = db.Column(db.String(60), unique=True)
    base_number = db.Column(db.String(30))          # e.g. "SQ2510001" (without rev)
    revision = db.Column(db.Integer, default=0)     # 0 = no rev, 1 = Rev.1, etc.
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
    sales_person = db.Column(db.String(100))
    ref_no = db.Column(db.String(100))
    shipment_terms = db.Column(db.String(200))
    delivery = db.Column(db.String(200))
    payment_terms = db.Column(db.String(200))
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

FLOTECH_INFO = {
    "name": "PT. FLOTECH CONTROLS INDONESIA",
    "address": "Rukan Artha Gading Niaga, Blok F/7",
    "city": "Jl. Boulevard Artha Gading, Jakarta 14240",
    "telp": "Telp: (021) 4585 0778 / 4586 0625 / 4586 0690  |  Fax: (021) 4585 0779",
    "email": "Email: salesjkt@flotech.co.id  |  Website: www.flotech.co.id",
}

def format_rupiah(amount):
    try:
        return f"Rp {amount:,.0f}".replace(",", ".")
    except:
        return "Rp 0"

# ─────────────────────────────────────────────────────────────────────────────
# AUTO NUMBER GENERATOR
# ─────────────────────────────────────────────────────────────────────────────
def generate_quotation_number():
    now = datetime.utcnow()
    yy = now.strftime("%y")   # e.g. "25"
    mm = now.strftime("%m")   # e.g. "10"
    prefix = f"SQ{yy}{mm}"

    # Find highest sequence for this year (reset per year)
    year_prefix = f"SQ{yy}"
    existing = Quotation.query.filter(
        Quotation.base_number.like(f"{year_prefix}%")
    ).order_by(Quotation.id.desc()).all()

    max_seq = 0
    for q in existing:
        if q.base_number:
            # Extract sequence from base_number like SQ2510003
            try:
                seq_part = q.base_number[6:]  # after SQyymm
                seq = int(seq_part)
                if seq > max_seq:
                    max_seq = seq
            except:
                pass

    new_seq = max_seq + 1
    base = f"{prefix}{new_seq:03d}"
    return base

# ─────────────────────────────────────────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────────────────────────────────────────
@quotation_bp.route('/next-number', methods=['GET'])
@jwt_required()
def get_next_number():
    number = generate_quotation_number()
    return jsonify({"number": number}), 200

@quotation_bp.route('/list', methods=['GET'])
@jwt_required()
def list_quotations():
    qs = Quotation.query.order_by(Quotation.created_at.desc()).all()
    result = []
    for q in qs:
        result.append({
            "id": q.id,
            "quotation_number": q.quotation_number,
            "base_number": q.base_number,
            "revision": q.revision or 0,
            "customer_name": q.customer_name,
            "customer_company": q.customer_company,
            "project_name": q.project_name,
            "category": q.category,
            "status": q.status,
            "total_amount": q.total_amount,
            "currency": q.currency,
            "sales_person": q.sales_person,
            "created_at": q.created_at.isoformat() if q.created_at else None,
            "updated_at": q.updated_at.isoformat() if q.updated_at else None,
            "valid_until": q.valid_until.isoformat() if q.valid_until else None,
        })
    return jsonify(result), 200

@quotation_bp.route('/analytics', methods=['GET'])
@jwt_required()
def get_analytics():
    """Return monthly and yearly aggregated data for charts."""
    qs = Quotation.query.all()
    
    monthly = {}   # key: "YYYY-MM"
    yearly = {}    # key: "YYYY"
    
    for q in qs:
        dt = q.created_at or datetime.utcnow()
        mk = dt.strftime("%Y-%m")
        yk = dt.strftime("%Y")
        
        if mk not in monthly:
            monthly[mk] = {"period": mk, "draft": 0, "sent": 0, "followup": 0, "won": 0, "lost": 0,
                          "draft_val": 0, "sent_val": 0, "followup_val": 0, "won_val": 0, "lost_val": 0, "total": 0}
        if yk not in yearly:
            yearly[yk] = {"period": yk, "draft": 0, "sent": 0, "followup": 0, "won": 0, "lost": 0,
                         "draft_val": 0, "sent_val": 0, "followup_val": 0, "won_val": 0, "lost_val": 0, "total": 0}
        
        st = q.status or "draft"
        val = q.total_amount or 0
        
        for store in [monthly[mk], yearly[yk]]:
            store[st] = store.get(st, 0) + 1
            store[f"{st}_val"] = store.get(f"{st}_val", 0) + val
            store["total"] += 1
    
    monthly_list = sorted(monthly.values(), key=lambda x: x["period"])
    yearly_list = sorted(yearly.values(), key=lambda x: x["period"])
    
    return jsonify({"monthly": monthly_list, "yearly": yearly_list}), 200

@quotation_bp.route('/create', methods=['POST'])
@jwt_required()
def create_quotation():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    
    valid_until = None
    if data.get("valid_until"):
        try:
            valid_until = datetime.strptime(data["valid_until"], "%Y-%m-%d").date()
        except:
            pass
    
    # Auto-generate base number if not provided / use provided
    base_num = data.get("base_number") or generate_quotation_number()
    quot_num = base_num  # No revision on create
    
    q = Quotation(
        quotation_number=quot_num,
        base_number=base_num,
        revision=0,
        customer_name=data.get("customer_name"),
        customer_company=data.get("customer_company"),
        customer_email=data.get("customer_email"),
        customer_phone=data.get("customer_phone"),
        customer_address=data.get("customer_address"),
        project_name=data.get("project_name"),
        category=data.get("category"),
        status=data.get("status", "draft"),
        valid_until=valid_until,
        currency=data.get("currency", "IDR"),
        total_amount=data.get("total_amount", 0),
        notes=data.get("notes"),
        terms=data.get("terms"),
        items=data.get("items", []),
        sales_person=data.get("sales_person"),
        ref_no=data.get("ref_no"),
        shipment_terms=data.get("shipment_terms"),
        delivery=data.get("delivery"),
        payment_terms=data.get("payment_terms"),
        created_by=user_id,
    )
    db.session.add(q)
    db.session.commit()
    return jsonify({"message": "Quotation created", "id": q.id, "quotation_number": q.quotation_number}), 201

@quotation_bp.route('/detail/<int:qid>', methods=['GET'])
@jwt_required()
def get_quotation(qid):
    q = Quotation.query.get(qid)
    if not q:
        return jsonify({"error": "Not found"}), 404
    return jsonify({
        "id": q.id,
        "quotation_number": q.quotation_number,
        "base_number": q.base_number,
        "revision": q.revision or 0,
        "customer_name": q.customer_name,
        "customer_company": q.customer_company,
        "customer_email": q.customer_email,
        "customer_phone": q.customer_phone,
        "customer_address": q.customer_address,
        "project_name": q.project_name,
        "category": q.category,
        "status": q.status,
        "valid_until": q.valid_until.isoformat() if q.valid_until else None,
        "currency": q.currency,
        "total_amount": q.total_amount,
        "notes": q.notes,
        "terms": q.terms,
        "items": q.items or [],
        "sales_person": q.sales_person,
        "ref_no": q.ref_no,
        "shipment_terms": q.shipment_terms,
        "delivery": q.delivery,
        "payment_terms": q.payment_terms,
        "created_at": q.created_at.isoformat() if q.created_at else None,
        "updated_at": q.updated_at.isoformat() if q.updated_at else None,
    }), 200

@quotation_bp.route('/update/<int:qid>', methods=['PUT'])
@jwt_required()
def update_quotation(qid):
    q = Quotation.query.get(qid)
    if not q:
        return jsonify({"error": "Not found"}), 404
    data = request.get_json()
    
    # Fields that trigger revision bump
    REVISION_FIELDS = {"items", "total_amount", "notes", "terms", "payment_terms",
                       "shipment_terms", "delivery", "currency"}
    
    bump_revision = data.get("bump_revision", False)
    # Auto detect if revision-triggering fields changed
    if not bump_revision:
        for rf in REVISION_FIELDS:
            if rf in data:
                old_val = getattr(q, rf, None)
                new_val = data[rf]
                if str(old_val) != str(new_val):
                    bump_revision = True
                    break
    
    # Update fields
    for f in ["customer_name", "customer_company", "customer_email", "customer_phone",
              "customer_address", "project_name", "category", "currency", "notes",
              "terms", "items", "total_amount", "status", "sales_person", "ref_no",
              "shipment_terms", "delivery", "payment_terms"]:
        if f in data:
            setattr(q, f, data[f])
    
    if data.get("valid_until"):
        try:
            q.valid_until = datetime.strptime(data["valid_until"], "%Y-%m-%d").date()
        except:
            pass
    
    # Bump revision in quotation_number
    if bump_revision:
        new_rev = (q.revision or 0) + 1
        q.revision = new_rev
        base = q.base_number or q.quotation_number
        q.base_number = base
        q.quotation_number = f"{base}-Rev{new_rev}"
    
    q.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"message": "Updated", "quotation_number": q.quotation_number, "revision": q.revision}), 200

@quotation_bp.route('/status/<int:qid>', methods=['PUT'])
@jwt_required()
def update_status(qid):
    q = Quotation.query.get(qid)
    if not q:
        return jsonify({"error": "Not found"}), 404
    q.status = request.get_json().get("status", q.status)
    q.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"message": "Status updated"}), 200

@quotation_bp.route('/delete/<int:qid>', methods=['DELETE'])
@jwt_required()
def delete_quotation(qid):
    q = Quotation.query.get(qid)
    if not q:
        return jsonify({"error": "Not found"}), 404
    db.session.delete(q)
    db.session.commit()
    return jsonify({"message": "Deleted"}), 200


# ─────────────────────────────────────────────────────────────────────────────
# PDF BUILDER — Mirip Sales Quotation Flotech, Professional
# ─────────────────────────────────────────────────────────────────────────────
def build_quotation_pdf(q):
    buffer = BytesIO()
    LEFT = RIGHT = 2 * cm
    usable_w = 17 * cm

    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        topMargin=2.2 * cm, bottomMargin=3.8 * cm,
        leftMargin=LEFT, rightMargin=RIGHT,
        title=f"Quotation {q.quotation_number}",
        author="PT. Flotech Controls Indonesia"
    )

    primary    = colors.HexColor("#0B3D91")
    secondary  = colors.HexColor("#1E5CC6")
    accent     = colors.HexColor("#E8EEF9")
    dark       = colors.HexColor("#1a1a2e")
    text_clr   = colors.HexColor("#374151")
    gray       = colors.HexColor("#6B7280")
    light_gray = colors.HexColor("#F3F4F6")
    border_clr = colors.HexColor("#D1D5DB")
    white      = colors.white
    tbl_head   = colors.HexColor("#0B3D91")
    alt_row    = colors.HexColor("#F0F4FF")

    def ps(name, **kw):
        defaults = dict(fontName="Helvetica", fontSize=9, leading=13, textColor=text_clr)
        defaults.update(kw)
        return ParagraphStyle(name, **defaults)

    normal    = ps("normal")
    bold_s    = ps("bold_s", fontName="Helvetica-Bold")
    small_g   = ps("small_g", fontSize=7.5, textColor=gray, leading=11)
    hdr_lbl   = ps("hdr_lbl", fontName="Helvetica-Bold", fontSize=7, textColor=gray,
                   leading=10, spaceAfter=1)
    hdr_val   = ps("hdr_val", fontName="Helvetica", fontSize=8.5, leading=12)
    item_desc = ps("item_desc", fontSize=8.5, leading=12)
    item_sub  = ps("item_sub", fontSize=7.5, textColor=gray, leading=10)
    footer_p  = ps("footer_p", fontSize=7, textColor=gray, leading=10)
    title_p   = ps("title_p", fontName="Helvetica-Bold", fontSize=14, textColor=primary, leading=18)
    total_p   = ps("total_p", fontName="Helvetica-Bold", fontSize=10, textColor=white, leading=14)

    elements = []

    # ── LOGO + HEADER ─────────────────────────────────────────────────────────
    LOGO_PATH = os.path.join(os.path.dirname(__file__), "static", "flotech_logo.png")
    logo_cell = ""
    if os.path.exists(LOGO_PATH):
        try:
            pil = PILImage.open(LOGO_PATH)
            w, h = pil.size
            ratio = h / w
            logo_w = 5.5 * cm
            logo_h = logo_w * ratio
            logo_img = RLImage(LOGO_PATH, width=logo_w, height=logo_h)
            logo_cell = logo_img
        except:
            logo_cell = Paragraph("<b>FLOTECH</b>", ps("lg", fontName="Helvetica-Bold", fontSize=22, textColor=primary))
    else:
        logo_cell = Paragraph("<b>FLOTECH</b><br/><font size=8>PROCESS CONTROL &amp; INSTRUMENTATION</font>",
                              ps("lg2", fontName="Helvetica-Bold", fontSize=18, textColor=primary, leading=22))

    title_block = [
        Paragraph("SALES QUOTATION", title_p),
        Spacer(1, 4),
    ]
    
    q_date = q.created_at.strftime("%d-%b-%y") if q.created_at else datetime.utcnow().strftime("%d-%b-%y")
    rev_str = f"Rev.{q.revision}" if q.revision else "Rev.0"
    
    info_data = [
        [Paragraph("Quotation No.", hdr_lbl), Paragraph(":", hdr_val), Paragraph(q.quotation_number or "-", bold_s)],
        [Paragraph("Revision No.", hdr_lbl), Paragraph(":", hdr_val), Paragraph(rev_str, hdr_val)],
        [Paragraph("Quotation Date", hdr_lbl), Paragraph(":", hdr_val), Paragraph(q_date, hdr_val)],
        [Paragraph("Sales Person", hdr_lbl), Paragraph(":", hdr_val), Paragraph(q.sales_person or "-", hdr_val)],
        [Paragraph("Ref. No.", hdr_lbl), Paragraph(":", hdr_val), Paragraph(q.ref_no or "-", hdr_val)],
    ]
    info_t = Table(info_data, colWidths=[2.8*cm, 0.4*cm, 4.5*cm])
    info_t.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
    ]))

    top_data = [[logo_cell, [*title_block, info_t]]]
    top_t = Table(top_data, colWidths=[8*cm, 9*cm])
    top_t.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ALIGN', (1,0), (1,0), 'RIGHT'),
    ]))
    elements.append(top_t)
    elements.append(Spacer(1, 0.3*cm))
    elements.append(HRFlowable(width=usable_w, thickness=1.5, color=primary))
    elements.append(Spacer(1, 0.4*cm))

    # ── TO / RECIPIENT ────────────────────────────────────────────────────────
    addr_lines = []
    if q.customer_company:
        addr_lines.append(Paragraph(f"<b>{q.customer_company}</b>", bold_s))
    if q.customer_address:
        for line in q.customer_address.split("\n"):
            if line.strip():
                addr_lines.append(Paragraph(line.strip(), normal))
    if q.customer_name:
        addr_lines.append(Paragraph(f"Attn: {q.customer_name}", normal))
    if q.customer_email:
        addr_lines.append(Paragraph(f"Email: {q.customer_email}", normal))

    to_block = [Paragraph("<b>To:</b>", bold_s)] + addr_lines

    subj_val = q.project_name or "Instrumentation Products"
    subj_block = [
        Spacer(1, 0.2*cm),
        Paragraph(f"<b>Subject :</b> {subj_val}", normal),
        Spacer(1, 0.3*cm),
    ]

    addr_t = Table([[to_block]], colWidths=[usable_w])
    addr_t.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    elements.append(addr_t)
    for sb in subj_block:
        elements.append(sb)

    # ── ITEMS TABLE ───────────────────────────────────────────────────────────
    col_widths = [0.8*cm, 7.0*cm, 1.8*cm, 1.2*cm, 3.1*cm, 3.1*cm]
    hdr_style = ps("th", fontName="Helvetica-Bold", fontSize=8, textColor=white, leading=11)
    
    table_data = [[
        Paragraph("S/N", hdr_style),
        Paragraph("Inventory/Description", hdr_style),
        Paragraph("UOM", hdr_style),
        Paragraph("QTY Order", hdr_style),
        Paragraph(f"U/Price\n{q.currency or 'IDR'}", hdr_style),
        Paragraph(f"Amount\n{q.currency or 'IDR'}", hdr_style),
    ]]

    items = q.items or []
    row_styles = []
    for i, item in enumerate(items):
        row_num = i + 2  # row index in table (0=header, 1..n = items)
        qty = float(item.get("qty", 1) or 1)
        price = float(item.get("unit_price", 0) or 0)
        disc = float(item.get("discount", 0) or 0)
        subtotal = price * qty * (1 - disc / 100)
        
        # Description cell with sub-lines
        desc_content = []
        main_desc = item.get("description", "")
        brand = item.get("brand", "")
        model = item.get("model", "")
        remarks = item.get("remarks", "")
        
        if brand or model:
            desc_content.append(Paragraph(f"<b>{main_desc}</b>", item_desc))
            sub = []
            if brand: sub.append(brand)
            if model: sub.append(f"P/N: {model}")
            desc_content.append(Paragraph(" | ".join(sub), item_sub))
        else:
            desc_content.append(Paragraph(f"<b>{main_desc}</b>", item_desc))
        
        if remarks:
            for line in remarks.split("\n"):
                if line.strip():
                    desc_content.append(Paragraph(f"- {line.strip()}", item_sub))
        
        unit = item.get("unit", "Unit")
        
        if q.currency == "IDR":
            price_str = f"{price:,.0f}".replace(",", ".")
            amt_str = f"{subtotal:,.0f}".replace(",", ".")
        else:
            price_str = f"{price:,.2f}"
            amt_str = f"{subtotal:,.2f}"
        
        table_data.append([
            Paragraph(str(i + 1), ps("cn", fontSize=8, leading=12)),
            desc_content,
            Paragraph(unit, ps("ctr", fontSize=8, leading=12)),
            Paragraph(str(int(qty)), ps("ctr2", fontSize=8, leading=12)),
            Paragraph(price_str, ps("r", fontSize=8, leading=12)),
            Paragraph(amt_str, ps("r2", fontSize=8, leading=12)),
        ])
        if i % 2 == 1:
            row_styles.append(('BACKGROUND', (0, row_num), (-1, row_num), alt_row))

    # Total row
    total_val = sum(
        float(it.get("unit_price",0) or 0) * float(it.get("qty",1) or 1) * (1 - float(it.get("discount",0) or 0)/100)
        for it in items
    )
    if q.currency == "IDR":
        total_str = f"Rp {total_val:,.0f}".replace(",", ".")
    else:
        total_str = f"{q.currency} {total_val:,.2f}"

    table_data.append([
        "", "",
        Paragraph("", normal),
        Paragraph("", normal),
        Paragraph("<b>TOTAL :</b>", ps("tot_lbl", fontName="Helvetica-Bold", fontSize=9, leading=12, textColor=primary)),
        Paragraph(f"<b>{total_str}</b>", ps("tot_val", fontName="Helvetica-Bold", fontSize=9, leading=12, textColor=primary)),
    ])
    total_row = len(table_data) - 1

    items_table = Table(table_data, colWidths=col_widths, repeatRows=1)
    base_style = [
        # Header
        ('BACKGROUND', (0,0), (-1,0), tbl_head),
        ('TEXTCOLOR', (0,0), (-1,0), white),
        ('ALIGN', (0,0), (-1,0), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        # Body alignment
        ('ALIGN', (0,1), (0,-1), 'CENTER'),   # S/N
        ('ALIGN', (2,1), (2,-1), 'CENTER'),   # UOM
        ('ALIGN', (3,1), (3,-1), 'CENTER'),   # QTY
        ('ALIGN', (4,1), (4,-1), 'RIGHT'),    # Price
        ('ALIGN', (5,1), (5,-1), 'RIGHT'),    # Amount
        # Total row
        ('ALIGN', (4, total_row), (5, total_row), 'RIGHT'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        # Borders
        ('BOX', (0,0), (-1,-2), 0.5, border_clr),
        ('INNERGRID', (0,0), (-1,-2), 0.3, border_clr),
        ('LINEABOVE', (0, total_row), (-1, total_row), 1, primary),
        ('LINEBELOW', (0, total_row), (-1, total_row), 1, primary),
        ('BACKGROUND', (0, total_row), (-1, total_row), accent),
    ]
    items_table.setStyle(TableStyle(base_style + row_styles))
    elements.append(items_table)
    elements.append(Spacer(1, 0.3*cm))

    # ── NOTE ─────────────────────────────────────────────────────────────────
    note_text = q.notes or "Note: Upon order confirmation, any changes applied to above spec is subject to penalty up to 100% of total amount."
    elements.append(Paragraph(f"<i>{note_text}</i>", small_g))
    elements.append(Spacer(1, 0.4*cm))
    elements.append(HRFlowable(width=usable_w, thickness=0.5, color=border_clr))
    elements.append(Spacer(1, 0.4*cm))

    # ── TERMS & CONDITIONS ────────────────────────────────────────────────────
    elements.append(Paragraph("<b><u>General Terms &amp; Conditions:</u></b>", bold_s))
    elements.append(Spacer(1, 0.2*cm))

    currency_label = "IDR (Indonesia Rupiah), exclude VAT 11%" if q.currency == "IDR" else q.currency
    terms_data = [
        ["Currency", q.currency or "IDR", currency_label],
        ["Shipment Terms", q.shipment_terms or "Franco Jakarta", ""],
        ["Validity", "", "20 DAYS"],
        ["Delivery", q.delivery or "10-12 Weeks ARO", ""],
        ["Payment Terms", q.payment_terms or "Cash Advance", ""],
    ]

    # Use q.terms if provided (multi-line)
    if q.terms:
        elements.append(Paragraph(q.terms.replace("\n", "<br/>"), normal))
    else:
        tc_table_data = [
            [Paragraph("<b>Currency</b>", bold_s), Paragraph(":"), Paragraph(currency_label, normal)],
            [Paragraph("<b>Shipment Terms</b>", bold_s), Paragraph(":"), Paragraph(q.shipment_terms or "Franco Jakarta", normal)],
            [Paragraph("<b>Validity</b>", bold_s), Paragraph(":"), Paragraph("20 DAYS", normal)],
            [Paragraph("<b>Delivery</b>", bold_s), Paragraph(":"), Paragraph(q.delivery or "10-12 Weeks ARO", normal)],
            [Paragraph("<b>Payment Terms</b>", bold_s), Paragraph(":"), Paragraph(q.payment_terms or "Cash Advance", normal)],
        ]
        tc_t = Table(tc_table_data, colWidths=[3.5*cm, 0.4*cm, 13.1*cm])
        tc_t.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('TOPPADDING', (0,0), (-1,-1), 2),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
        ]))
        elements.append(tc_t)

    elements.append(Spacer(1, 0.5*cm))

    # ── REGARDS ───────────────────────────────────────────────────────────────
    elements.append(Paragraph("Regards,", normal))
    elements.append(Spacer(1, 1.0*cm))
    if q.sales_person:
        elements.append(Paragraph(f"<b>{q.sales_person}</b>", bold_s))
        elements.append(Paragraph("PT. Flotech Controls Indonesia", small_g))

    # ── FOOTER ────────────────────────────────────────────────────────────────
    def footer_canvas(cv, doc_obj):
        cv.saveState()
        pw, ph = A4
        cv.setStrokeColor(primary)
        cv.setLineWidth(1.5)
        cv.line(LEFT, 3.1*cm, pw - RIGHT, 3.1*cm)
        cv.setFont("Helvetica-Bold", 9)
        cv.setFillColor(primary)
        cv.drawCentredString(pw / 2, 2.7*cm, FLOTECH_INFO["name"])
        cv.setFont("Helvetica", 7.5)
        cv.setFillColor(colors.HexColor("#6B7280"))
        cv.drawCentredString(pw / 2, 2.35*cm, f"{FLOTECH_INFO['address']}  |  {FLOTECH_INFO['city']}")
        cv.drawCentredString(pw / 2, 2.0*cm, FLOTECH_INFO["telp"])
        cv.drawCentredString(pw / 2, 1.65*cm, FLOTECH_INFO["email"])
        cv.setFillColor(colors.HexColor("#9CA3AF"))
        cv.setFont("Helvetica", 7)
        cv.drawRightString(pw - RIGHT, 1.2*cm, f"Page {doc_obj.page} of 1")
        cv.restoreState()

    doc.build(elements, onFirstPage=footer_canvas, onLaterPages=footer_canvas)
    buffer.seek(0)
    return buffer

@quotation_bp.route('/pdf/<int:qid>', methods=['GET'])
@jwt_required()
def quotation_pdf(qid):
    q = Quotation.query.get(qid)
    if not q:
        return jsonify({"error": "Not found"}), 404
    buf = build_quotation_pdf(q)
    return send_file(buf, as_attachment=True,
                     download_name=f"Quotation_{q.quotation_number}.pdf",
                     mimetype="application/pdf")

@quotation_bp.route('/pdf/preview/<int:qid>', methods=['GET'])
@jwt_required()
def quotation_pdf_preview(qid):
    q = Quotation.query.get(qid)
    if not q:
        return jsonify({"error": "Not found"}), 404
    buf = build_quotation_pdf(q)
    return Response(buf, mimetype="application/pdf",
                    headers={"Content-Disposition": f"inline; filename=Quotation_{q.quotation_number}.pdf"})