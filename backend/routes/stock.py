from flask import Blueprint, request, jsonify
from extensions import db
from flask_jwt_extended import jwt_required
from datetime import datetime

from flask import send_file
from io import BytesIO
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import ParagraphStyle


stock_bp = Blueprint('stock', __name__)


class StockUnit(db.Model):
    __tablename__ = "stock_units"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    brand = db.Column(db.String(100), nullable=False)
    model = db.Column(db.String(150))
    serial_number = db.Column(db.String(100))
    asset_tag = db.Column(db.String(100))
    type = db.Column(db.String(100))
    category = db.Column(db.String(20), default="stock")  # stock / demo
    condition = db.Column(db.String(20), default="good")
    status = db.Column(db.String(30), default="available")
    location = db.Column(db.String(200))
    loan_to = db.Column(db.String(200))
    loan_date = db.Column(db.Date)
    return_date = db.Column(db.Date)
    purchase_date = db.Column(db.Date)
    purchase_price = db.Column(db.Float)
    description = db.Column(db.Text)
    remarks = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


def parse_date(s):
    if not s: return None
    try: return datetime.strptime(s, "%Y-%m-%d").date()
    except: return None


def unit_to_dict(u):
    return {
        "id": u.id, "name": u.name, "brand": u.brand, "model": u.model,
        "serial_number": u.serial_number, "asset_tag": u.asset_tag,
        "type": u.type, "category": u.category, "condition": u.condition,
        "status": u.status, "location": u.location, "loan_to": u.loan_to,
        "loan_date": u.loan_date.isoformat() if u.loan_date else None,
        "return_date": u.return_date.isoformat() if u.return_date else None,
        "purchase_date": u.purchase_date.isoformat() if u.purchase_date else None,
        "purchase_price": u.purchase_price,
        "description": u.description, "remarks": u.remarks,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    }


@stock_bp.route('/list', methods=['GET'])
@jwt_required()
def list_units():
    units = StockUnit.query.order_by(StockUnit.created_at.desc()).all()
    return jsonify([unit_to_dict(u) for u in units]), 200


@stock_bp.route('/create', methods=['POST'])
@jwt_required()
def create_unit():
    data = request.get_json()
    u = StockUnit(
        name=data.get("name"), brand=data.get("brand"), model=data.get("model"),
        serial_number=data.get("serial_number"), asset_tag=data.get("asset_tag"),
        type=data.get("type"), category=data.get("category", "stock"),
        condition=data.get("condition", "good"), status=data.get("status", "available"),
        location=data.get("location"), loan_to=data.get("loan_to"),
        loan_date=parse_date(data.get("loan_date")),
        return_date=parse_date(data.get("return_date")),
        purchase_date=parse_date(data.get("purchase_date")),
        purchase_price=data.get("purchase_price"),
        description=data.get("description"), remarks=data.get("remarks"),
    )
    db.session.add(u)
    db.session.commit()
    return jsonify({"message": "Unit created", "id": u.id}), 201


@stock_bp.route('/update/<int:uid>', methods=['PUT'])
@jwt_required()
def update_unit(uid):
    u = StockUnit.query.get(uid)
    if not u: return jsonify({"error": "Not found"}), 404
    data = request.get_json()
    for field in ["name","brand","model","serial_number","asset_tag","type","category",
                  "condition","status","location","loan_to","description","remarks"]:
        if field in data: setattr(u, field, data[field])
    u.loan_date = parse_date(data.get("loan_date"))
    u.return_date = parse_date(data.get("return_date"))
    u.purchase_date = parse_date(data.get("purchase_date"))
    if "purchase_price" in data: u.purchase_price = data["purchase_price"]
    u.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"message": "Updated"}), 200


@stock_bp.route('/delete/<int:uid>', methods=['DELETE'])
@jwt_required()
def delete_unit(uid):
    u = StockUnit.query.get(uid)
    if not u: return jsonify({"error": "Not found"}), 404
    db.session.delete(u)
    db.session.commit()
    return jsonify({"message": "Deleted"}), 200


FLOTECH_INFO = {
    "name":    "PT FLOTECH CONTROLS INDONESIA",
    "address": "Jl. Raya Cakung No.123, Jakarta Timur",
    "city":    "Jakarta 13910, Indonesia",
    "telp":    "Telp: +62 21 XXXX XXXX",
    "email":   "info@flotech.co.id",
}

_PRIMARY   = "#0B3D91"
_SECONDARY = "#1E5CC6"

STATUS_LABEL_MAP = {
    "available": "Available",
    "on_loan":   "On Loan",
    "demo":      "Demo",
    "in_repair": "In Repair",
    "sold":      "Sold",
    "retired":   "Retired",
}
STATUS_BG_MAP = {
    "available": "#D1FAE5",
    "on_loan":   "#FEF3C7",
    "demo":      "#DBEAFE",
    "in_repair": "#FEF9C3",
    "sold":      "#F3F4F6",
    "retired":   "#E5E7EB",
}
STATUS_FG_MAP = {
    "available": "#065F46",
    "on_loan":   "#92400E",
    "demo":      "#1E40AF",
    "in_repair": "#713F12",
    "sold":      "#4B5563",
    "retired":   "#374151",
}
CONDITION_LABEL_MAP = {
    "excellent": "Excellent",
    "good":      "Good",
    "fair":      "Fair",
    "poor":      "Poor",
    "damaged":   "Damaged",
}


def _ps(name, **kw):
    from reportlab.lib.styles import ParagraphStyle
    return ParagraphStyle(name, **kw)


def build_stock_pdf(units, category_filter, status_filter):
    from io import BytesIO
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib import colors
    from reportlab.lib.units import cm
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
    )
    from datetime import datetime

    buffer = BytesIO()
    W_PAGE, H_PAGE = landscape(A4)
    MARGIN = 1.5 * cm
    W = W_PAGE - 2 * MARGIN   # ≈ 25.6 cm usable

    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=2.5 * cm, bottomMargin=3.2 * cm,
    )

    PRIMARY   = colors.HexColor(_PRIMARY)
    SECONDARY = colors.HexColor(_SECONDARY)
    DARK      = colors.HexColor("#1F2937")
    GRAY      = colors.HexColor("#6B7280")
    BORDER    = colors.HexColor("#E5E7EB")
    ACCENT    = colors.HexColor("#F8FAFF")
    WHITE     = colors.white

    hdr_st   = _ps('HDR', fontSize=8,  fontName='Helvetica-Bold', textColor=WHITE, alignment=1)
    cell_st  = _ps('CEL', fontSize=8,  fontName='Helvetica',      textColor=DARK)
    cell_b   = _ps('CBL', fontSize=8,  fontName='Helvetica-Bold', textColor=DARK)
    small_st = _ps('SML', fontSize=7,  fontName='Helvetica',      textColor=GRAY)
    elements = []

    now_str   = datetime.now().strftime("%d %B %Y, %H:%M WIB")
    cat_label = {"stock": "Stock", "demo": "Demo Unit", "all": "Stock & Demo Unit"}.get(category_filter, "All")
    sta_label = STATUS_LABEL_MAP.get(status_filter, "Semua Status") if status_filter else "Semua Status"

    # ── Header ──────────────────────────────────────────────────────────────
    header_data = [[
        Paragraph(
            f"<b>{FLOTECH_INFO['name']}</b>",
            _ps('HN', fontSize=12, fontName='Helvetica-Bold', textColor=PRIMARY)
        ),
        Paragraph(
            f"<b>LAPORAN STATUS {cat_label.upper()}</b><br/>"
            f"<font size=8 color='#6B7280'>Filter: {sta_label}  &nbsp;|&nbsp;  {now_str}</font>",
            _ps('HT', fontSize=10, fontName='Helvetica-Bold', textColor=DARK, alignment=2)
        ),
    ]]
    ht = Table(header_data, colWidths=[W * 0.55, W * 0.45])
    ht.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'MIDDLE'), ('PADDING', (0,0), (-1,-1), 0)]))
    elements.append(ht)
    elements.append(Spacer(1, 0.2 * cm))
    elements.append(HRFlowable(width=W, thickness=2, color=PRIMARY))
    elements.append(Spacer(1, 0.1 * cm))
    elements.append(HRFlowable(width=W, thickness=0.5, color=SECONDARY))
    elements.append(Spacer(1, 0.4 * cm))

    # ── Stats summary ────────────────────────────────────────────────────────
    total       = len(units)
    n_available = sum(1 for u in units if u.status == "available")
    n_loan      = sum(1 for u in units if u.status == "on_loan")
    n_repair    = sum(1 for u in units if u.status == "in_repair")
    n_stock     = sum(1 for u in units if u.category == "stock")
    n_demo      = sum(1 for u in units if u.category == "demo")

    stat_items = [
        ("Total Unit",  total,       "#EEF3FB", _PRIMARY),
        ("Available",   n_available, "#D1FAE5", "#065F46"),
        ("On Loan",     n_loan,      "#FEF3C7", "#92400E"),
        ("In Repair",   n_repair,    "#FEF9C3", "#713F12"),
        ("Stock",       n_stock,     "#F3F4F6", "#374151"),
        ("Demo Unit",   n_demo,      "#DBEAFE", "#1E40AF"),
    ]
    SCOL = W / len(stat_items)
    stat_cells = []
    for i, (lbl, v, bg, tc) in enumerate(stat_items):
        box = Table([
            [Paragraph(f"<b>{v}</b>",
                       _ps(f'SV{i}', fontSize=18, fontName='Helvetica-Bold',
                           textColor=colors.HexColor(tc), alignment=1))],
            [Paragraph(lbl,
                       _ps(f'SL{i}', fontSize=7.5, fontName='Helvetica',
                           textColor=GRAY, alignment=1))],
        ], colWidths=[SCOL - 0.4 * cm])
        box.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor(bg)),
            ('BOX',        (0,0), (-1,-1), 0.5, BORDER),
            ('PADDING',    (0,0), (-1,-1), 8),
            ('ALIGN',      (0,0), (-1,-1), 'CENTER'),
        ]))
        stat_cells.append(box)

    stat_row = Table([stat_cells], colWidths=[SCOL] * len(stat_items))
    stat_row.setStyle(TableStyle([
        ('ALIGN',  (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING',(0,0), (-1,-1), 3),
    ]))
    elements.append(stat_row)
    elements.append(Spacer(1, 0.5 * cm))

    # ── Data table ───────────────────────────────────────────────────────────
    # Cols: No | Nama Alat | Brand | Model | S/N | Tipe | Kategori | Status | Kondisi | Lokasi | Keterangan
    # Total must equal W ≈ 25.6cm
    COL_W = [0.7, 3.8, 2.4, 3.0, 2.8, 2.2, 1.8, 2.2, 2.0, 2.2, 2.5]
    diff = W / cm - sum(COL_W)
    COL_W[-1] += diff          # absorb rounding into last column
    COL_W = [c * cm for c in COL_W]

    HEADERS = ["No", "Nama Alat", "Brand", "Model", "Serial Number",
               "Tipe", "Kategori", "Status", "Kondisi", "Lokasi", "Keterangan"]
    tbl_data = [[Paragraph(h, hdr_st) for h in HEADERS]]

    for idx, u in enumerate(units, 1):
        sta_bg  = colors.HexColor(STATUS_BG_MAP.get(u.status, "#F3F4F6"))
        sta_fg  = colors.HexColor(STATUS_FG_MAP.get(u.status, "#374151"))
        sta_lbl = STATUS_LABEL_MAP.get(u.status, u.status or "—")
        cnd_lbl = CONDITION_LABEL_MAP.get(u.condition, u.condition or "—")

        ket = []
        if u.loan_to:     ket.append(f"Pinjam: {u.loan_to}")
        if u.return_date: ket.append(f"Kembali: {u.return_date.strftime('%d/%m/%y')}")
        if u.remarks:     ket.append(u.remarks)
        ket_str = " | ".join(ket) if ket else "—"

        row = [
            Paragraph(str(idx), _ps(f'N{idx}', fontSize=8, fontName='Helvetica', textColor=GRAY, alignment=1)),
            Paragraph(f"<b>{u.name or '—'}</b>", cell_b),
            Paragraph(u.brand or "—", cell_st),
            Paragraph(u.model or "—", cell_st),
            Paragraph(u.serial_number or "—", small_st),
            Paragraph(u.type or "—", cell_st),
            Paragraph(
                "Demo" if u.category == "demo" else "Stock",
                _ps(f'CT{idx}', fontSize=8, fontName='Helvetica-Bold',
                    textColor=colors.HexColor("#1E40AF") if u.category == "demo" else DARK)
            ),
            Paragraph(sta_lbl, _ps(f'ST{idx}', fontSize=8, fontName='Helvetica-Bold',
                                   textColor=sta_fg, alignment=1)),
            Paragraph(cnd_lbl, cell_st),
            Paragraph(u.location or "—", cell_st),
            Paragraph(ket_str, small_st),
        ]
        tbl_data.append(row)

    tbl = Table(tbl_data, colWidths=COL_W, repeatRows=1)
    style = [
        ('BACKGROUND',  (0,0), (-1,0), PRIMARY),
        ('TEXTCOLOR',   (0,0), (-1,0), WHITE),
        ('ALIGN',       (0,0), (-1,0), 'CENTER'),
        ('FONTNAME',    (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE',    (0,0), (-1,0), 8),
        ('LINEBELOW',   (0,0), (-1,0), 1.5, SECONDARY),
        ('VALIGN',      (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING',     (0,0), (-1,-1), 5),
        ('GRID',        (0,0), (-1,-1), 0.3, BORDER),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [WHITE, ACCENT]),
        ('ALIGN',       (0,1), (0,-1), 'CENTER'),
        ('ALIGN',       (7,1), (7,-1), 'CENTER'),
    ]
    # Per-row status cell colour
    for i, u in enumerate(units, 1):
        bg = colors.HexColor(STATUS_BG_MAP.get(u.status, "#F3F4F6"))
        style.append(('BACKGROUND', (7, i), (7, i), bg))

    tbl.setStyle(TableStyle(style))
    elements.append(tbl)

    # ── Footer callback ──────────────────────────────────────────────────────
    def footer(canvas, doc_obj):
        from datetime import datetime as _dt
        canvas.saveState()
        pw, _ = landscape(A4)
        canvas.setStrokeColor(PRIMARY)
        canvas.setLineWidth(1.2)
        canvas.line(MARGIN, 2.5*cm, pw - MARGIN, 2.5*cm)
        canvas.setFont("Helvetica-Bold", 8.5)
        canvas.setFillColor(PRIMARY)
        canvas.drawCentredString(pw/2, 2.0*cm, FLOTECH_INFO["name"])
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(colors.HexColor("#6B7280"))
        canvas.drawCentredString(pw/2, 1.6*cm,
            f"{FLOTECH_INFO['address']}  |  {FLOTECH_INFO['city']}  |  {FLOTECH_INFO['telp']}")
        canvas.setFillColor(colors.HexColor("#9CA3AF"))
        canvas.drawCentredString(pw/2, 1.2*cm,
            f"Dicetak: {_dt.now().strftime('%d %B %Y %H:%M')}  |  Hal. {doc_obj.page}  |  "
            "Dokumen ini digenerate otomatis oleh sistem")
        canvas.restoreState()

    doc.build(elements, onFirstPage=footer, onLaterPages=footer)
    buffer.seek(0)
    return buffer


# ── Route ────────────────────────────────────────────────────────────────────
@stock_bp.route('/pdf/export', methods=['GET'])
@jwt_required()
def export_stock_pdf():
    """
    GET /stock/pdf/export?category=all|stock|demo&status=available|on_loan|...
    Returns a downloadable landscape-A4 PDF report.
    """
    from flask import send_file
    from datetime import datetime

    category = request.args.get('category', 'all')
    status   = request.args.get('status',   '')

    q = StockUnit.query
    if category in ('stock', 'demo'):
        q = q.filter(StockUnit.category == category)
    if status:
        q = q.filter(StockUnit.status == status)
    units = q.order_by(StockUnit.name, StockUnit.brand).all()

    if not units:
        return jsonify({"error": "Tidak ada data yang sesuai filter"}), 404

    buf = build_stock_pdf(units, category, status)

    cat_lbl = {"stock": "Stock", "demo": "DemoUnit", "all": "StockDemo"}.get(category, "Stock")
    sta_lbl = status.replace("_","").capitalize() if status else "SemuaStatus"
    filename = f"LaporanStock_{cat_lbl}_{sta_lbl}_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf"

    return send_file(buf, as_attachment=True, download_name=filename, mimetype="application/pdf")