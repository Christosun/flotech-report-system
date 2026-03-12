import os, base64, json, re
from datetime import datetime
from io import BytesIO
from flask import Blueprint, request, jsonify, send_file, Response, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import Engineer
from sqlalchemy import text

# ReportLab
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
                                 TableStyle, HRFlowable, Image, KeepTogether,
                                 PageBreak, BaseDocTemplate, Frame, PageTemplate)
from reportlab.platypus.doctemplate import ActionFlowable
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.pdfgen import canvas as rl_canvas

try:
    from PIL import Image as PILImage
except ImportError:
    PILImage = None

from html.parser import HTMLParser

onsite_bp = Blueprint("onsite", __name__)

FLOTECH_INFO = {
    "name": "PT FLOTECH CONTROLS INDONESIA",
    "address": "Rukan Artha Gading Niaga, Blok F/7",
    "city": "Jl. Boulevard Artha Gading, Jakarta 14240",
    "telp": "Telp: +6221 45850778 / Fax: +6221 45850779",
    "email": "e-Mail: salesjkt@flotech.co.id / Website: www.flotech.com.sg",
}


# ── MODEL ─────────────────────────────────────────────────────────────────────
class OnsiteReport(db.Model):
    __tablename__ = "onsite_reports"

    id              = db.Column(db.Integer, primary_key=True)
    report_number   = db.Column(db.String(50))
    visit_date      = db.Column(db.Date)
    client_name     = db.Column(db.String(150))
    client_company  = db.Column(db.String(200))
    client_address  = db.Column(db.Text)
    site_location   = db.Column(db.String(200))
    contact_person  = db.Column(db.String(150))
    contact_phone   = db.Column(db.String(30))
    engineer_id     = db.Column(db.Integer, db.ForeignKey("engineers.id"), nullable=True)
    job_description = db.Column(db.Text)
    # Legacy single-equipment fields (kept for backward compat)
    equipment_tag   = db.Column(db.String(100))
    equipment_model = db.Column(db.String(150))
    serial_number   = db.Column(db.String(100))
    # Legacy work fields (kept for backward compat)
    work_performed  = db.Column(db.Text)
    findings        = db.Column(db.Text)
    recommendations = db.Column(db.Text)
    materials_used  = db.Column(db.Text)
    # New: multiple equipment as JSON
    equipment_items = db.Column(db.JSON, default=list)
    customer_signature = db.Column(db.Text)
    status          = db.Column(db.String(20), default="draft")
    # Visit date range
    visit_date_from = db.Column(db.Date)
    visit_date_to   = db.Column(db.Date)
    created_by      = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_at      = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at      = db.Column(db.DateTime, default=datetime.utcnow)


def report_to_dict(r, include_sig=False):
    eng = Engineer.query.get(r.engineer_id) if r.engineer_id else None
    d = {
        "id": r.id,
        "report_number": r.report_number,
        "visit_date": r.visit_date.isoformat() if r.visit_date else None,
        "visit_date_from": r.visit_date_from.isoformat() if r.visit_date_from else (r.visit_date.isoformat() if r.visit_date else None),
        "visit_date_to": r.visit_date_to.isoformat() if r.visit_date_to else None,
        "client_name": r.client_name,
        "client_company": r.client_company,
        "client_address": r.client_address,
        "site_location": r.site_location,
        "contact_person": r.contact_person,
        "contact_phone": r.contact_phone,
        "engineer_id": r.engineer_id,
        "engineer_name": eng.name if eng else None,
        "engineer_position": eng.position if eng else None,
        "engineer_signature": eng.signature_data if eng else None,
        "job_description": r.job_description,
        "equipment_tag": r.equipment_tag,
        "equipment_model": r.equipment_model,
        "serial_number": r.serial_number,
        "work_performed": r.work_performed,
        "findings": r.findings,
        "recommendations": r.recommendations,
        "materials_used": r.materials_used,
        "equipment_items": r.equipment_items or [],
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

    def parse_date(s):
        try: return datetime.strptime(s, "%Y-%m-%d").date()
        except: return None

    visit_date      = parse_date(data.get("visit_date") or data.get("visit_date_from"))
    visit_date_from = parse_date(data.get("visit_date_from") or data.get("visit_date"))
    visit_date_to   = parse_date(data.get("visit_date_to")) if data.get("visit_date_to") else None

    # Auto report number if not provided
    report_number = data.get("report_number")
    if not report_number:
        now = datetime.utcnow()
        date_str = now.strftime("%Y%m%d")
        prefix = f"OSR-{date_str}-"
        existing = OnsiteReport.query.filter(
            OnsiteReport.report_number.like(f"{prefix}%")
        ).all()
        seqs = []
        for rpt in existing:
            try: seqs.append(int(rpt.report_number.replace(prefix, "")))
            except: pass
        next_seq = max(seqs) + 1 if seqs else 1
        report_number = f"{prefix}{str(next_seq).zfill(3)}"

    r = OnsiteReport(
        report_number=report_number,
        visit_date=visit_date,
        visit_date_from=visit_date_from,
        visit_date_to=visit_date_to,
        client_name=data.get("client_name"),
        client_company=data.get("client_company"),
        client_address=data.get("client_address"),
        site_location=data.get("site_location"),
        contact_person=data.get("contact_person"),
        contact_phone=data.get("contact_phone"),
        engineer_id=data.get("engineer_id") or None,
        job_description=data.get("job_description"),
        equipment_tag=data.get("equipment_tag"),
        equipment_model=data.get("equipment_model"),
        serial_number=data.get("serial_number"),
        work_performed=data.get("work_performed"),
        findings=data.get("findings"),
        recommendations=data.get("recommendations"),
        materials_used=data.get("materials_used"),
        equipment_items=data.get("equipment_items") or [],
        customer_signature=data.get("customer_signature"),
        status=data.get("status", "draft"),
        created_by=user_id,
    )
    db.session.add(r)
    db.session.commit()
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
        if field in data:
            setattr(r, field, data[field])
    if "engineer_id" in data:
        r.engineer_id = data["engineer_id"] or None
    if "equipment_items" in data:
        r.equipment_items = data["equipment_items"] or []

    def parse_date(s):
        try: return datetime.strptime(s, "%Y-%m-%d").date()
        except: return None

    if data.get("visit_date_from"):
        r.visit_date_from = parse_date(data["visit_date_from"])
        r.visit_date = r.visit_date_from  # keep legacy in sync
    elif data.get("visit_date"):
        r.visit_date = parse_date(data["visit_date"])
        r.visit_date_from = r.visit_date

    r.visit_date_to = parse_date(data["visit_date_to"]) if data.get("visit_date_to") else None
    r.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"message": "Updated"}), 200


@onsite_bp.route('/delete/<int:rid>', methods=['DELETE'])
@jwt_required()
def delete_report(rid):
    r = OnsiteReport.query.get(rid)
    if not r: return jsonify({"error": "Not found"}), 404
    db.session.delete(r)
    db.session.commit()
    return jsonify({"message": "Deleted"}), 200


# ── AUTO-MIGRATE: add new columns if not exists ───────────────────────────────
def _ensure_columns():
    """Run once at startup to add new columns if missing."""
    try:
        with db.engine.connect() as conn:
            conn.execute(text("""
                ALTER TABLE onsite_reports
                ADD COLUMN IF NOT EXISTS equipment_items JSONB DEFAULT '[]'::jsonb
            """))
            conn.execute(text("""
                ALTER TABLE onsite_reports
                ADD COLUMN IF NOT EXISTS visit_date_from DATE
            """))
            conn.execute(text("""
                ALTER TABLE onsite_reports
                ADD COLUMN IF NOT EXISTS visit_date_to DATE
            """))
            # Backfill visit_date_from from visit_date for existing records
            conn.execute(text("""
                UPDATE onsite_reports
                SET visit_date_from = visit_date
                WHERE visit_date_from IS NULL AND visit_date IS NOT NULL
            """))
            conn.commit()
    except Exception:
        pass


@onsite_bp.record_once
def _on_register(state):
    """Called automatically when this blueprint is registered with the Flask app."""
    with state.app.app_context():
        _ensure_columns()


# ── HTML → ReportLab Paragraphs ───────────────────────────────────────────────
class _HTMLtoParagraphs(HTMLParser):
    """Very lightweight HTML → list of ReportLab Paragraph/Spacer."""
    def __init__(self, usable_w, text_style, ps_fn, primary, white, accent, border, gray, dark):
        super().__init__()
        self._usable_w = usable_w
        self._ts = text_style
        self._ps = ps_fn
        self._primary = primary
        self._white = white
        self._accent = accent
        self._border = border
        self._gray = gray
        self._dark = dark
        self._paragraphs = []
        self._buf = []
        self._list_type = None   # 'ul' or 'ol'
        self._list_counter = 0
        self._img_queue = []
        # inline style tracking
        self._bold = 0
        self._italic = 0
        self._underline = 0
        self._color_stack = []
        self._size_stack = []
        self._align = TA_LEFT

    def _flush_buf(self):
        text = "".join(self._buf).strip()
        self._buf = []
        return text

    def _open_tag(self, tag):
        return f"<{tag}>"

    def _close_tag(self, tag):
        return f"</{tag}>"

    def handle_starttag(self, tag, attrs):
        attrmap = dict(attrs)
        style_str = attrmap.get("style", "")
        if tag in ("b", "strong"):
            self._buf.append("<b>"); self._bold += 1
        elif tag in ("i", "em"):
            self._buf.append("<i>"); self._italic += 1
        elif tag in ("u",):
            self._buf.append("<u>"); self._underline += 1
        elif tag == "br":
            self._buf.append("<br/>")
        elif tag in ("p", "div"):
            # flush previous
            t = self._flush_buf()
            if t:
                self._paragraphs.append(Paragraph(t, self._ps('HP', fontSize=10, textColor=self._dark, leading=14)))
            # check alignment
            align = TA_LEFT
            if "text-align:center" in style_str or "text-align: center" in style_str:
                align = TA_CENTER
            elif "text-align:right" in style_str or "text-align: right" in style_str:
                align = TA_RIGHT
            self._align = align
        elif tag in ("ul",):
            self._list_type = "ul"
        elif tag in ("ol",):
            self._list_type = "ol"; self._list_counter = 0
        elif tag == "li":
            t = self._flush_buf()
            if t:
                self._paragraphs.append(Paragraph(t, self._ps('HP', fontSize=10, textColor=self._dark, leading=14, alignment=self._align)))
            self._list_counter += 1
            if self._list_type == "ol":
                self._buf.append(f"{self._list_counter}. ")
            else:
                self._buf.append("• ")
        elif tag == "font":
            color_val = attrmap.get("color", "")
            if color_val:
                self._buf.append(f'<font color="{color_val}">')
                self._color_stack.append(True)
            size_val = attrmap.get("size", "")
            if size_val:
                # ignore size attribute, handled by style
                self._size_stack.append(True)
        elif tag == "span":
            # parse inline style for color and font-size
            color_match = re.search(r'color\s*:\s*([^;]+)', style_str)
            size_match = re.search(r'font-size\s*:\s*([^;]+)', style_str)
            if color_match:
                c = color_match.group(1).strip()
                self._buf.append(f'<font color="{c}">')
                self._color_stack.append(True)
            else:
                self._color_stack.append(False)
            if size_match:
                sz_str = size_match.group(1).strip()
                try:
                    px = float(re.sub(r'[^0-9.]', '', sz_str))
                    pt = px * 0.75
                    self._buf.append(f'<font size="{pt:.0f}">')
                    self._size_stack.append(True)
                except:
                    self._size_stack.append(False)
            else:
                self._size_stack.append(False)
        elif tag == "img":
            src = attrmap.get("src", "")
            style_i = attrmap.get("style", "")
            # Parse width
            w_cm = 10 * cm  # default
            w_match = re.search(r'width\s*:\s*(\d+(?:\.\d+)?)(px|cm|mm)?', style_i)
            if w_match:
                val = float(w_match.group(1))
                unit = w_match.group(2) or "px"
                if unit == "px": w_cm = min(val * 0.026458 * cm, self._usable_w)
                elif unit == "cm": w_cm = min(val * cm, self._usable_w)
                elif unit == "mm": w_cm = min(val * 0.1 * cm, self._usable_w)
            self._img_queue.append((src, w_cm))

    def handle_endtag(self, tag):
        if tag in ("b", "strong"):
            self._buf.append("</b>"); self._bold -= 1
        elif tag in ("i", "em"):
            self._buf.append("</i>"); self._italic -= 1
        elif tag in ("u",):
            self._buf.append("</u>"); self._underline -= 1
        elif tag in ("p", "div"):
            t = self._flush_buf()
            if t:
                self._paragraphs.append(Paragraph(t, self._ps('HP2', fontSize=10, textColor=self._dark, leading=14, alignment=self._align)))
            self._align = TA_LEFT
        elif tag == "li":
            t = self._flush_buf()
            if t:
                self._paragraphs.append(Paragraph(t, self._ps('LI', fontSize=10, textColor=self._dark, leading=14, leftIndent=12)))
        elif tag in ("ul", "ol"):
            self._list_type = None; self._list_counter = 0
        elif tag == "font":
            if self._color_stack and self._color_stack[-1]:
                self._buf.append("</font>")
            if self._color_stack: self._color_stack.pop()
        elif tag == "span":
            if self._color_stack and self._color_stack[-1]:
                self._buf.append("</font>")
            if self._color_stack: self._color_stack.pop()
            if self._size_stack and self._size_stack[-1]:
                self._buf.append("</font>")
            if self._size_stack: self._size_stack.pop()

    def handle_data(self, data):
        self._buf.append(data)

    def get_elements(self, ps_fn, primary, white, accent, border, dark, usable_w):
        """Return ReportLab flowables from parsed HTML."""
        # Flush any remaining buffer
        t = self._flush_buf()
        if t:
            self._paragraphs.append(Paragraph(t, ps_fn('HR', fontSize=10, textColor=dark, leading=14)))

        elements = []
        for p in self._paragraphs:
            elements.append(p)
        # Process queued images
        for src, w_cm in self._img_queue:
            try:
                if src.startswith("data:"):
                    # Base64 embedded image
                    if "base64," in src:
                        b64 = src.split("base64,")[1]
                        decoded = base64.b64decode(b64)
                        buf = BytesIO(decoded)
                        if PILImage:
                            pil = PILImage.open(BytesIO(decoded))
                            ratio = pil.size[1] / pil.size[0]
                            h_cm = w_cm * ratio
                            img = Image(buf, width=w_cm, height=h_cm)
                        else:
                            img = Image(buf, width=w_cm, height=w_cm * 0.6)
                        img.hAlign = 'LEFT'
                        elements.append(Spacer(1, 0.2 * cm))
                        elements.append(img)
                        elements.append(Spacer(1, 0.2 * cm))
            except Exception:
                pass

        return elements


def _html_to_flowables(html_text, usable_w, ps_fn, primary, white, accent, border, gray, dark):
    """Convert HTML string to a list of ReportLab flowables."""
    if not html_text:
        return []
    # Simple text (no HTML tags)
    if not re.search(r'<[a-z]', html_text, re.IGNORECASE):
        return [Paragraph(html_text, ps_fn('PT', fontSize=10, textColor=dark, leading=14))]

    parser = _HTMLtoParagraphs(usable_w, None, ps_fn, primary, white, accent, border, gray, dark)
    try:
        parser.feed(html_text)
    except Exception:
        pass
    return parser.get_elements(ps_fn, primary, white, accent, border, dark, usable_w)


# ── PDF BUILDER ───────────────────────────────────────────────────────────────
def build_onsite_pdf(rid):
    r = OnsiteReport.query.get(rid)
    if not r:
        return None
    eng = Engineer.query.get(r.engineer_id) if r.engineer_id else None

    buffer = BytesIO()
    LEFT = RIGHT = 2 * cm
    USABLE_W = 17 * cm  # A4 210mm - 40mm margins

    doc = SimpleDocTemplate(buffer, pagesize=A4,
                            topMargin=2 * cm, bottomMargin=3.5 * cm,
                            leftMargin=LEFT, rightMargin=RIGHT)

    primary   = colors.HexColor("#0B3D91")
    secondary = colors.HexColor("#1E5CC6")
    accent    = colors.HexColor("#EEF3FB")
    dark      = colors.HexColor("#1a1a2e")
    text_clr  = colors.HexColor("#374151")
    gray      = colors.HexColor("#6B7280")
    border    = colors.HexColor("#D1D5DB")
    white     = colors.white

    def ps(name, **kw):
        d = dict(fontName='Helvetica', fontSize=10, textColor=text_clr, leading=14)
        d.update(kw)
        return ParagraphStyle(name, **d)

    elements = []

    # ── HEADER: logo left + title right ─────────────────────────
    logo_path = os.path.join(current_app.root_path, "assets", "logo.png")
    logo_col_w = 8 * cm
    title_col_w = USABLE_W - logo_col_w  # 9cm

    if os.path.exists(logo_path):
        try:
            pil_logo = PILImage.open(logo_path)
            lw, lh = pil_logo.size
            target_h = 1.6 * cm
            target_w = min((lw / lh) * target_h, 4.5 * cm)
            logo_cell = Image(logo_path, width=target_w, height=target_h)
        except:
            logo_cell = Paragraph("<b>FLOTECH</b>", ps('LF', fontSize=16, fontName='Helvetica-Bold', textColor=primary))
    else:
        logo_cell = Paragraph("<b>FLOTECH</b>", ps('LF', fontSize=16, fontName='Helvetica-Bold', textColor=primary))

    right_block = Table([
        [Paragraph("ONSITE SERVICE REPORT", ps('TT', fontSize=14, fontName='Helvetica-Bold', textColor=white, alignment=2))],
        [Paragraph(r.report_number or "", ps('TS', fontSize=9, textColor=colors.HexColor("#BFD3F5"), alignment=2))],
    ], colWidths=[title_col_w])
    right_block.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), primary),
        ('PADDING', (0, 0), (-1, -1), 10),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))

    hdr = Table([[logo_cell, right_block]], colWidths=[logo_col_w, title_col_w])
    hdr.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'MIDDLE')]))
    elements.append(hdr)
    elements.append(Spacer(1, 0.3 * cm))
    elements.append(HRFlowable(width="100%", thickness=1, color=primary))
    elements.append(Spacer(1, 0.6 * cm))

    # ── META BAND: report number + date ─────────────────────────
    # Build date string — range if visit_date_to present
    date_from = r.visit_date_from or r.visit_date
    date_to   = r.visit_date_to
    if date_from and date_to and date_to != date_from:
        visit_str = f"{date_from.strftime('%d %b %Y')} — {date_to.strftime('%d %b %Y')}"
    elif date_from:
        visit_str = date_from.strftime("%d %B %Y")
    else:
        visit_str = "-"

    meta_col_w = [3 * cm, 5 * cm, 3 * cm, 6 * cm]
    meta_data = [[
        Paragraph("<b>Nomor Report</b>", ps('ML', fontSize=8, fontName='Helvetica-Bold', textColor=gray)),
        Paragraph(r.report_number or "-", ps('MV', fontSize=10, fontName='Helvetica-Bold', textColor=dark)),
        Paragraph("<b>Tanggal Kunjungan</b>", ps('ML2', fontSize=8, fontName='Helvetica-Bold', textColor=gray)),
        Paragraph(visit_str, ps('MV2', fontSize=9, textColor=dark)),
    ]]
    mt = Table(meta_data, colWidths=meta_col_w)
    mt.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), accent),
        ('BOX', (0, 0), (-1, -1), 0.5, border),
        ('LINEAFTER', (1, 0), (1, 0), 0.5, border),
        ('PADDING', (0, 0), (-1, -1), 9),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(mt)
    elements.append(Spacer(1, 0.4 * cm))

    def section(text):
        elements.append(Paragraph(
            f"▌ {text}",
            ps('SH', fontSize=10, fontName='Helvetica-Bold', textColor=primary, spaceBefore=8, spaceAfter=2)
        ))
        elements.append(HRFlowable(width="100%", thickness=0.5, color=border))
        elements.append(Spacer(1, 0.15 * cm))

    # ── CLIENT INFO ─────────────────────────────────────────────
    section("INFORMASI CLIENT / CUSTOMER")

    def info_grid(rows):
        """rows: list of (label, value) tuples, 2 per row in PDF"""
        table_data = []
        for i in range(0, len(rows), 2):
            left = rows[i]
            right = rows[i + 1] if i + 1 < len(rows) else ("", "")
            table_data.append([
                Paragraph(left[0], ps('IL', fontSize=8, fontName='Helvetica-Bold', textColor=gray)),
                Paragraph(str(left[1] or "—"), ps('IV', fontSize=9, textColor=dark)),
                Paragraph(right[0], ps('IL2', fontSize=8, fontName='Helvetica-Bold', textColor=gray)),
                Paragraph(str(right[1] or "—") if right[1] else "", ps('IV2', fontSize=9, textColor=dark)),
            ])
        t = Table(table_data, colWidths=[3 * cm, 5.5 * cm, 3 * cm, 5.5 * cm])
        t.setStyle(TableStyle([
            ('PADDING', (0, 0), (-1, -1), 7),
            ('LINEBELOW', (0, 0), (-1, -1), 0.2, border),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BACKGROUND', (0, 0), (0, -1), accent),
            ('BACKGROUND', (2, 0), (2, -1), accent),
        ]))
        elements.append(t)

    client_rows = [
        ("Perusahaan / Instansi", r.client_company),
        ("Nama Client / PIC", r.client_name),
        ("Contact Person", r.contact_person),
        ("No. Telepon", r.contact_phone),
        ("Lokasi / Site", r.site_location),
        ("Alamat", r.client_address),
    ]
    client_rows_filtered = [(l, v) for l, v in client_rows if v]
    if client_rows_filtered:
        info_grid(client_rows_filtered)

    elements.append(Spacer(1, 0.3 * cm))

    # ── EQUIPMENT INFO ───────────────────────────────────────────
    # Support new multiple equipment_items, fallback to legacy fields
    equip_items = r.equipment_items or []
    if not equip_items and any([r.equipment_tag, r.equipment_model, r.serial_number]):
        equip_items = [{
            "description": r.equipment_tag or "",
            "model": r.equipment_model or "",
            "serial_number": r.serial_number or "",
        }]

    if equip_items:
        section("DATA PERALATAN")
        for idx, item in enumerate(equip_items):
            desc = item.get("description", "")
            model = item.get("model", "")
            sn = item.get("serial_number", "")
            # Build rows for this equipment
            rows = []
            if len(equip_items) > 1:
                rows.append(("No.", str(idx + 1)))
            if desc:
                rows.append(("Informasi Alat", desc))
            if model:
                rows.append(("Model / Type", model))
            if sn:
                rows.append(("Serial Number", sn))
            if idx == 0 and eng:
                rows.append(("Engineer", eng.name))
            if rows:
                info_grid(rows)
            if idx < len(equip_items) - 1:
                elements.append(Spacer(1, 0.2 * cm))
        elements.append(Spacer(1, 0.3 * cm))
    elif eng:
        section("DATA PERALATAN")
        info_grid([("Engineer", eng.name), ("", "")])
        elements.append(Spacer(1, 0.3 * cm))

    # ── DETAIL PEKERJAAN ─────────────────────────────────────────
    if r.job_description:
        section("DETAIL PEKERJAAN")
        # Convert HTML to flowables
        job_flowables = _html_to_flowables(
            r.job_description, USABLE_W, ps, primary, white, accent, border, gray, dark
        )
        # Wrap in a bordered container
        if job_flowables:
            # Build a table with the content for consistent border
            inner_elements = []
            for fl in job_flowables:
                inner_elements.append(fl)
            job_container_data = [[inner_elements]]
            # We use a nested table trick: put flowables in a list-type cell
            # Actually, just add them directly with slight indentation
            for fl in job_flowables:
                elements.append(fl)
        elements.append(Spacer(1, 0.4 * cm))

    # ── SIGNATURES (with page break logic) ───────────────────────
    half_w = USABLE_W / 2  # 8.5cm each

    def sig_image(b64_data):
        if not b64_data:
            return Spacer(1, 1.8 * cm)
        try:
            data = b64_data
            if "base64," in data:
                data = data.split("base64,")[1]
            decoded = base64.b64decode(data)
            pil_img = PILImage.open(BytesIO(decoded)).convert("RGBA")
            buf = BytesIO()
            pil_img.save(buf, format="PNG")
            buf.seek(0)
            img = Image(buf, width=4 * cm, height=1.6 * cm)
            img.hAlign = 'CENTER'
            return img
        except:
            return Spacer(1, 1.8 * cm)

    sig_l = ps('SL', fontSize=9, fontName='Helvetica-Bold', textColor=primary, alignment=1)
    sig_sub = ps('SS', fontSize=8, textColor=gray, alignment=1, leading=11)

    sig_rows = [
        [Paragraph("ENGINEER", sig_l), Paragraph("CUSTOMER / CLIENT", sig_l)],
        [sig_image(eng.signature_data if eng else None), sig_image(r.customer_signature)],
        [HRFlowable(width=half_w - 1.5 * cm, thickness=0.5, color=border),
         HRFlowable(width=half_w - 1.5 * cm, thickness=0.5, color=border)],
        [Paragraph(eng.name if eng else "—", sig_sub),
         Paragraph(r.client_name or "—", sig_sub)],
        [Paragraph(
            f"{eng.position or ''}" + (f"  |  {eng.employee_id}" if eng and eng.employee_id else "") if eng else "",
            sig_sub),
         Paragraph(r.client_company or "", sig_sub)],
    ]
    sig_t = Table(sig_rows, colWidths=[half_w, half_w])
    sig_t.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('BOX', (0, 0), (0, -1), 0.5, border),
        ('BOX', (1, 0), (1, -1), 0.5, border),
        ('BACKGROUND', (0, 0), (0, 0), accent),
        ('BACKGROUND', (1, 0), (1, 0), accent),
    ]))

    # Digital document declaration
    gen_ts = datetime.now().strftime("%d %B %Y, %H:%M WIB")
    digital_notice = Table([[
        Paragraph(
            f'<font color="#6B7280" size="7.5">🔒  This document is digitally generated by the system of PT Flotech Controls Indonesia'
            f'  ·  Issued: {gen_ts}'
            f'  ·  Document number: {r.report_number or "-"}'
            f'  ·  This digital document is valid without a wet signature.</font>',
            ps('DN', fontSize=7.5, textColor=colors.HexColor("#6B7280"), alignment=1, leading=11)
        )
    ]], colWidths=[USABLE_W])
    digital_notice.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFF")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#DBEAFE")),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ]))

    # Signature section title
    sig_section_title = Paragraph(
        "▌ TANDA TANGAN",
        ps('SSH', fontSize=10, fontName='Helvetica-Bold', textColor=primary, spaceBefore=8, spaceAfter=2)
    )
    sig_hr = HRFlowable(width="100%", thickness=0.5, color=border)

    # Use KeepTogether so signature block stays on same page
    sig_block = KeepTogether([
        Spacer(1, 0.4 * cm),
        sig_section_title,
        sig_hr,
        Spacer(1, 0.15 * cm),
        sig_t,
        Spacer(1, 0.3 * cm),
        digital_notice,
    ])
    elements.append(sig_block)

    # ── NUMBERED CANVAS for "Halaman X dari Y" ───────────────────
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
            self.setStrokeColor(primary)
            self.setLineWidth(1)
            self.line(LEFT, 2.8 * cm, pw - RIGHT, 2.8 * cm)
            self.setFont("Helvetica-Bold", 9)
            self.setFillColor(primary)
            self.drawCentredString(pw / 2, 2.3 * cm, FLOTECH_INFO["name"])
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#6B7280"))
            self.drawCentredString(pw / 2, 2.0 * cm, f"{FLOTECH_INFO['address']}  |  {FLOTECH_INFO['city']}")
            self.drawCentredString(pw / 2, 1.7 * cm, FLOTECH_INFO["telp"])
            self.drawCentredString(pw / 2, 1.4 * cm, FLOTECH_INFO["email"])
            self.setFillColor(colors.HexColor("#9CA3AF"))
            self.drawCentredString(pw / 2, 1.0 * cm,
                f"Generated: {datetime.now().strftime('%d %B %Y %H:%M')}  ·  Halaman {page_num} dari {total}")
            self.restoreState()

    doc.build(elements, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    return buffer


@onsite_bp.route('/pdf/<int:rid>', methods=['GET'])
@jwt_required()
def download_pdf(rid):
    r = OnsiteReport.query.get(rid)
    if not r:
        return jsonify({"error": "Not found"}), 404
    buf = build_onsite_pdf(rid)
    if not buf:
        return jsonify({"error": "Failed"}), 500
    return send_file(buf, as_attachment=True,
                     download_name=f"OnsiteReport_{r.report_number}.pdf",
                     mimetype="application/pdf")


@onsite_bp.route('/pdf/preview/<int:rid>', methods=['GET'])
@jwt_required()
def preview_pdf(rid):
    r = OnsiteReport.query.get(rid)
    if not r:
        return jsonify({"error": "Not found"}), 404
    buf = build_onsite_pdf(rid)
    if not buf:
        return jsonify({"error": "Failed"}), 500
    return Response(buf, mimetype="application/pdf",
                    headers={"Content-Disposition": f"inline; filename=OnsiteReport_{r.report_number}.pdf"})