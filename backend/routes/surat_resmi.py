"""
backend/routes/surat_resmi.py
Surat Rekomendasi & Surat Pernyataan — PT Flotech Controls Indonesia
Fixes:
  - Image from contenteditable rendered in PDF (base64 extracted)
  - Real logo.png from frontend/public or backend/static
  - Consistent left/right margins on header/footer lines
  - Cleaner PDF layout
"""
from flask import Blueprint, request, jsonify, send_file, Response, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import Engineer
from datetime import datetime
from io import BytesIO
import base64
import re as _re
import os

# ── ReportLab (all at top level) ───────────────────────────────────────────────
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.platypus import Image as RLImage
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm, mm
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from PIL import Image as PILImage

surat_resmi_bp = Blueprint("surat_resmi", __name__)

FLOTECH_INFO = {
    "name":    "PT FLOTECH CONTROLS INDONESIA",
    "address": "Rukan Artha Gading Niaga, Blok F/7",
    "city":    "Jl. Boulevard Artha Gading, Jakarta 14240",
    "telp":    "Telp: +6221 45850778 / Fax: +6221 45850779",
    "email":   "e-Mail: salesjkt@flotech.co.id / Website: www.flotech.com.sg",
}

MONTHS_ID = ["Januari","Februari","Maret","April","Mei","Juni",
             "Juli","Agustus","September","Oktober","November","Desember"]

# Page constants
PAGE_W, PAGE_H = A4          # 595.27 x 841.89 pt
MARGIN_L = MARGIN_R = 2.5 * cm
USABLE_W = PAGE_W - MARGIN_L - MARGIN_R   # ≈ 495 pt


# ── MODEL ──────────────────────────────────────────────────────────────────────
class SuratResmi(db.Model):
    __tablename__ = "surat_resmi"
    id                = db.Column(db.Integer, primary_key=True)
    nomor             = db.Column(db.String(100))
    surat_type        = db.Column(db.String(30), default="rekomendasi")
    perihal           = db.Column(db.String(500))
    lampiran          = db.Column(db.String(300))
    surat_date        = db.Column(db.Date)
    kepada_nama       = db.Column(db.String(200))
    kepada_jabatan    = db.Column(db.String(200))
    kepada_perusahaan = db.Column(db.String(300))
    kepada_alamat     = db.Column(db.Text)
    content_html      = db.Column(db.Text)
    engineer_id       = db.Column(db.Integer, db.ForeignKey("engineers.id"), nullable=True)
    include_signature = db.Column(db.Boolean, default=True)
    status            = db.Column(db.String(20), default="draft")
    created_by        = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_at        = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at        = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


def to_dict(s, include_content=False):
    eng = Engineer.query.get(s.engineer_id) if s.engineer_id else None
    d = {
        "id": s.id, "nomor": s.nomor, "surat_type": s.surat_type,
        "perihal": s.perihal, "lampiran": s.lampiran,
        "surat_date": s.surat_date.isoformat() if s.surat_date else None,
        "kepada_nama": s.kepada_nama, "kepada_jabatan": s.kepada_jabatan,
        "kepada_perusahaan": s.kepada_perusahaan, "kepada_alamat": s.kepada_alamat,
        "engineer_id": s.engineer_id,
        "engineer_name": eng.name if eng else None,
        "engineer_position": eng.position if eng else None,
        "include_signature": s.include_signature,
        "status": s.status,
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "updated_at": s.updated_at.isoformat() if s.updated_at else None,
    }
    if include_content:
        d["content_html"] = s.content_html
        if eng:
            d["engineer_signature"] = eng.signature_data
    return d


# ── CRUD ───────────────────────────────────────────────────────────────────────
@surat_resmi_bp.route("/list", methods=["GET"])
@jwt_required()
def list_surat():
    items = SuratResmi.query.order_by(SuratResmi.created_at.desc()).all()
    return jsonify([to_dict(s) for s in items]), 200


@surat_resmi_bp.route("/create", methods=["POST"])
@jwt_required()
def create_surat():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    surat_date = None
    if data.get("surat_date"):
        try:
            surat_date = datetime.strptime(data["surat_date"], "%Y-%m-%d").date()
        except Exception:
            pass

    eid = data.get("engineer_id")
    engineer_id = int(eid) if eid not in (None, "", 0, "0") else None

    s = SuratResmi(
        nomor=data.get("nomor"), surat_type=data.get("surat_type", "rekomendasi"),
        perihal=data.get("perihal"), lampiran=data.get("lampiran"),
        surat_date=surat_date,
        kepada_nama=data.get("kepada_nama"), kepada_jabatan=data.get("kepada_jabatan"),
        kepada_perusahaan=data.get("kepada_perusahaan"), kepada_alamat=data.get("kepada_alamat"),
        content_html=data.get("content_html", ""),
        engineer_id=engineer_id,
        include_signature=data.get("include_signature", True),
        status=data.get("status", "draft"),
        created_by=user_id,
    )
    db.session.add(s); db.session.commit()
    return jsonify({"message": "Created", "id": s.id}), 201


@surat_resmi_bp.route("/detail/<int:sid>", methods=["GET"])
@jwt_required()
def get_detail(sid):
    s = SuratResmi.query.get(sid)
    if not s: return jsonify({"error": "Not found"}), 404
    return jsonify(to_dict(s, include_content=True)), 200


@surat_resmi_bp.route("/update/<int:sid>", methods=["PUT"])
@jwt_required()
def update_surat(sid):
    s = SuratResmi.query.get(sid)
    if not s: return jsonify({"error": "Not found"}), 404
    data = request.get_json()
    for f in ["nomor","surat_type","perihal","lampiran","kepada_nama",
              "kepada_jabatan","kepada_perusahaan","kepada_alamat",
              "content_html","include_signature","status"]:
        if f in data: setattr(s, f, data[f])
    if "engineer_id" in data:
        eid = data["engineer_id"]
        s.engineer_id = int(eid) if eid not in (None, "", 0, "0") else None
    if data.get("surat_date"):
        try: s.surat_date = datetime.strptime(data["surat_date"], "%Y-%m-%d").date()
        except: pass
    s.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"message": "Updated"}), 200


@surat_resmi_bp.route("/delete/<int:sid>", methods=["DELETE"])
@jwt_required()
def delete_surat(sid):
    s = SuratResmi.query.get(sid)
    if not s: return jsonify({"error": "Not found"}), 404
    db.session.delete(s); db.session.commit()
    return jsonify({"message": "Deleted"}), 200


# ── PDF HELPERS ────────────────────────────────────────────────────────────────
def _ps(name, **kw):
    d = dict(fontName="Helvetica", fontSize=10,
             textColor=colors.HexColor("#374151"), leading=15)
    d.update(kw)
    return ParagraphStyle(name, **d)


def _find_logo():
    """Try several paths to find the Flotech logo."""
    candidates = [
        # backend/static/logo.png
        os.path.join(os.path.dirname(__file__), "..", "static", "logo.png"),
        # project root/frontend/public/logo.png
        os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "public", "logo.png"),
        # frontend/src/assets/logo.png
        os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "src", "assets", "logo.png"),
        "/app/static/logo.png",
    ]
    for p in candidates:
        norm = os.path.normpath(p)
        if os.path.isfile(norm):
            return norm
    return None


def _b64_to_rl_image(b64_str, max_w, max_h):
    """Convert a base64 image string to a ReportLab Image flowable."""
    try:
        if "base64," in b64_str:
            b64_str = b64_str.split("base64,")[1]
        raw = base64.b64decode(b64_str)
        pil = PILImage.open(BytesIO(raw)).convert("RGBA")
        buf = BytesIO()
        pil.save(buf, format="PNG")
        buf.seek(0)

        # Scale proportionally
        ow, oh = pil.size
        ratio = min(max_w / ow, max_h / oh, 1.0)
        w, h = ow * ratio, oh * ratio

        img = RLImage(buf, width=w, height=h)
        img.hAlign = "LEFT"
        return img
    except Exception:
        return None


def _html_to_flowables(html_str):
    """
    Convert HTML from contenteditable to ReportLab flowables.
    Handles: bold/italic/underline, ol/ul lists, paragraphs,
             inline base64 images, plain text.
    """
    if not html_str or not html_str.strip():
        return []

    flowables = []

    # ── Extract and replace <img> tags first ──────────────────────
    def replace_img(m):
        src = m.group(1)
        return f"\x00IMG\x00{src}\x00IMGEND\x00"

    html_str = _re.sub(
        r'<img[^>]+src=["\']([^"\']+)["\'][^>]*>',
        replace_img, html_str, flags=_re.IGNORECASE
    )

    # Normalize breaks
    html_str = _re.sub(r'<br\s*/?>', '\n', html_str, flags=_re.IGNORECASE)
    html_str = _re.sub(r'</p>\s*<p[^>]*>', '\n', html_str, flags=_re.IGNORECASE)
    html_str = _re.sub(r'</div>\s*<div[^>]*>', '\n', html_str, flags=_re.IGNORECASE)

    # Convert lists
    def proc_list(m):
        tag = m.group(1).lower()
        inner = m.group(2)
        items = _re.findall(r'<li[^>]*>(.*?)</li>', inner, _re.DOTALL | _re.IGNORECASE)
        result = []
        for i, item in enumerate(items):
            clean = _re.sub(r'<[^>]+>', '', item).strip()
            clean = clean.replace('&nbsp;',' ').replace('&amp;','&').replace('&lt;','<').replace('&gt;','>')
            result.append(f"__OL__{i+1}. {clean}" if tag == 'ol' else f"__UL__\u2022  {clean}")
        return '\n'.join(result) + '\n'

    html_str = _re.sub(r'<(ol|ul)[^>]*>(.*?)</(ol|ul)>', proc_list,
                       html_str, flags=_re.DOTALL | _re.IGNORECASE)

    # Split by block elements
    blocks = _re.split(r'<(?:p|div|h[1-6])[^>]*>|</(?:p|div|h[1-6])>',
                       html_str, flags=_re.IGNORECASE)

    for block in blocks:
        block = block.strip()
        if not block:
            continue

        for line in block.split('\n'):
            line = line.strip()
            if not line:
                flowables.append(Spacer(1, 0.18 * cm))
                continue

            # ── Image token ───────────────────────────────────
            if '\x00IMG\x00' in line:
                img_srcs = _re.findall(r'\x00IMG\x00(.*?)\x00IMGEND\x00', line)
                for src in img_srcs:
                    if src.startswith('data:'):
                        img_el = _b64_to_rl_image(src, USABLE_W * 0.9, 12 * cm)
                        if img_el:
                            flowables.append(Spacer(1, 0.2 * cm))
                            flowables.append(img_el)
                            flowables.append(Spacer(1, 0.2 * cm))
                # Also handle any text after/before img tokens
                text_part = _re.sub(r'\x00IMG\x00.*?\x00IMGEND\x00', '', line).strip()
                if text_part:
                    text_part = _clean_inline(text_part)
                    if text_part:
                        flowables.append(Paragraph(text_part,
                            _ps('Body', alignment=TA_JUSTIFY, leading=17)))
                        flowables.append(Spacer(1, 0.1 * cm))
                continue

            # ── List items ────────────────────────────────────
            if line.startswith('__OL__') or line.startswith('__UL__'):
                text = line[6:]
                flowables.append(Paragraph(text,
                    _ps('Li', leftIndent=1.2*cm, leading=16, alignment=TA_LEFT)))
                flowables.append(Spacer(1, 0.08 * cm))
                continue

            # ── Normal paragraph ─────────────────────────────
            cleaned = _clean_inline(line)
            if cleaned:
                flowables.append(Paragraph(cleaned,
                    _ps('Body', alignment=TA_JUSTIFY, leading=17)))
                flowables.append(Spacer(1, 0.1 * cm))

    return flowables


def _clean_inline(line):
    """Convert inline HTML tags to ReportLab XML and strip the rest."""
    line = _re.sub(r'<strong[^>]*>(.*?)</strong>', r'<b>\1</b>',
                   line, flags=_re.IGNORECASE | _re.DOTALL)
    line = _re.sub(r'<b[^>]*>(.*?)</b>', r'<b>\1</b>',
                   line, flags=_re.IGNORECASE | _re.DOTALL)
    line = _re.sub(r'<em[^>]*>(.*?)</em>', r'<i>\1</i>',
                   line, flags=_re.IGNORECASE | _re.DOTALL)
    line = _re.sub(r'<i[^>]*>(.*?)</i>', r'<i>\1</i>',
                   line, flags=_re.IGNORECASE | _re.DOTALL)
    line = _re.sub(r'<u[^>]*>(.*?)</u>', r'<u>\1</u>',
                   line, flags=_re.IGNORECASE | _re.DOTALL)
    # Strip remaining tags (but keep our rl tags)
    line = _re.sub(r'<(?!/?b>|/?i>|/?u>)[^>]+>', '', line)
    line = (line.replace('&nbsp;', ' ').replace('&amp;', '&')
                .replace('&lt;', '<').replace('&gt;', '>')
                .replace('&quot;', '"'))
    return line.strip()


# ── PDF BUILDER ────────────────────────────────────────────────────────────────
def build_pdf(sid):
    s = SuratResmi.query.get(sid)
    if not s:
        return None

    eng = Engineer.query.get(s.engineer_id) if s.engineer_id else None

    buffer   = BytesIO()
    primary  = colors.HexColor("#0B3D91")
    secondary= colors.HexColor("#1E5CC6")
    gray     = colors.HexColor("#6B7280")

    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        topMargin=1.8 * cm,
        bottomMargin=4.0 * cm,   # space for footer
        leftMargin=MARGIN_L,
        rightMargin=MARGIN_R,
    )

    elements = []

    # ── HEADER ────────────────────────────────────────────────────
    # Left: Flotech address block
    left_paras = [
        Paragraph(f"<b>{FLOTECH_INFO['name']}</b>",
                  _ps("H1", fontSize=11, textColor=primary,
                      fontName="Helvetica-Bold", leading=14)),
        Paragraph(FLOTECH_INFO["address"],
                  _ps("H2", fontSize=8.5, textColor=gray, leading=12)),
        Paragraph(FLOTECH_INFO["city"],
                  _ps("H3", fontSize=8.5, textColor=gray, leading=12)),
        Paragraph(FLOTECH_INFO["telp"],
                  _ps("H4", fontSize=8.5, textColor=gray, leading=12)),
        Paragraph(FLOTECH_INFO["email"],
                  _ps("H5", fontSize=8.5, textColor=secondary, leading=12)),
    ]

    # Right: Logo or fallback box
    logo_path = _find_logo()
    if logo_path:
        try:
            logo_pil = PILImage.open(logo_path)
            ow, oh = logo_pil.size
            logo_h = 1.6 * cm
            logo_w = min(ow / oh * logo_h, 5 * cm)
            right_el = RLImage(logo_path, width=logo_w, height=logo_h)
            right_el.hAlign = "RIGHT"
            right_cell = [right_el]
        except Exception:
            right_cell = [Paragraph(
                '<b><font color="#FFFFFF">FLOTECH</font></b>',
                _ps("LogoFB", fontName="Helvetica-Bold", fontSize=12,
                    alignment=TA_CENTER, textColor=colors.white, leading=28))]
    else:
        right_cell = [Paragraph(
            '<b><font color="#FFFFFF">FLOTECH</font></b>',
            _ps("LogoFB", fontName="Helvetica-Bold", fontSize=12,
                alignment=TA_CENTER, textColor=colors.white, leading=28))]

    hdr = Table(
        [[left_paras, right_cell]],
        colWidths=[USABLE_W * 0.68, USABLE_W * 0.32],
    )
    hdr_style = [
        ("VALIGN",      (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN",       (1, 0), (1, -1),  "RIGHT"),
    ]
    if not logo_path:
        # Only add blue background for fallback text box
        hdr_style += [
            ("BACKGROUND",  (1, 0), (1, -1),  primary),
            ("PADDING",     (1, 0), (1, -1),  8),
            ("ROUNDEDCORNERS", [4]),
        ]
    hdr.setStyle(TableStyle(hdr_style))

    elements.append(hdr)
    elements.append(Spacer(1, 0.35 * cm))

    # ── SEPARATOR LINES (full USABLE_W, same as content) ─────────
    elements.append(HRFlowable(
        width=USABLE_W, thickness=2.5, color=primary,
        spaceAfter=1, spaceBefore=0
    ))
    elements.append(HRFlowable(
        width=USABLE_W, thickness=0.7, color=secondary,
        spaceAfter=0.4 * cm, spaceBefore=0
    ))

    # ── META TABLE ────────────────────────────────────────────────
    meta_s = _ps("Meta", fontSize=10, leading=16)
    meta_b = _ps("MetaB", fontSize=10, leading=16, fontName="Helvetica-Bold")

    meta_rows = []
    if s.nomor:
        meta_rows.append([Paragraph("Nomor",    meta_s),
                          Paragraph(":",        meta_s),
                          Paragraph(s.nomor,    meta_b)])
    if s.perihal:
        meta_rows.append([Paragraph("Perihal",  meta_s),
                          Paragraph(":",        meta_s),
                          Paragraph(s.perihal,  meta_s)])
    if s.lampiran:
        meta_rows.append([Paragraph("Lampiran", meta_s),
                          Paragraph(":",        meta_s),
                          Paragraph(s.lampiran, meta_s)])

    if meta_rows:
        mt = Table(meta_rows, colWidths=[2.8 * cm, 0.5 * cm, USABLE_W - 3.3 * cm])
        mt.setStyle(TableStyle([
            ("VALIGN",        (0,0),(-1,-1),"TOP"),
            ("TOPPADDING",    (0,0),(-1,-1), 1),
            ("BOTTOMPADDING", (0,0),(-1,-1), 1),
        ]))
        elements.append(mt)
        elements.append(Spacer(1, 0.5 * cm))

    # ── KEPADA ────────────────────────────────────────────────────
    if s.kepada_nama or s.kepada_perusahaan:
        elements.append(Paragraph("Yth.", meta_s))
        if s.kepada_nama:
            elements.append(Paragraph(f"<b>{s.kepada_nama}</b>",
                _ps("Kpd", fontName="Helvetica-Bold", fontSize=10, leading=15)))
        if s.kepada_jabatan:
            elements.append(Paragraph(s.kepada_jabatan, meta_s))
        if s.kepada_perusahaan:
            elements.append(Paragraph(s.kepada_perusahaan, meta_s))
        if s.kepada_alamat:
            for line in s.kepada_alamat.splitlines():
                if line.strip():
                    elements.append(Paragraph(line.strip(), meta_s))
        elements.append(Paragraph("Di Tempat", meta_s))
        elements.append(Spacer(1, 0.5 * cm))

    # ── SALUTATION ────────────────────────────────────────────────
    elements.append(Paragraph("Dengan hormat,", meta_s))
    elements.append(Spacer(1, 0.35 * cm))

    # ── BODY ──────────────────────────────────────────────────────
    body = _html_to_flowables(s.content_html or "")
    elements.extend(body)
    elements.append(Spacer(1, 0.5 * cm))

    # ── CLOSING ───────────────────────────────────────────────────
    elements.append(Paragraph(
        "Demikian surat ini kami sampaikan. "
        "Atas perhatian dan kerja samanya, kami ucapkan terima kasih.",
        _ps("Closing", alignment=TA_JUSTIFY, leading=17),
    ))
    elements.append(Spacer(1, 0.7 * cm))

    # ── DATE + COMPANY ────────────────────────────────────────────
    if s.surat_date:
        tgl = f"Jakarta, {s.surat_date.day} {MONTHS_ID[s.surat_date.month-1]} {s.surat_date.year}"
        elements.append(Paragraph(tgl, meta_s))
    elements.append(Paragraph(
        "PT Flotech Controls Indonesia",
        _ps("Co", fontName="Helvetica-Bold", fontSize=10, leading=14, textColor=primary)
    ))
    elements.append(Spacer(1, 0.15 * cm))

    # ── SIGNATURE ────────────────────────────────────────────────
    sig_added = False
    if s.include_signature and eng and eng.signature_data:
        sig_img = _b64_to_rl_image(eng.signature_data, 5 * cm, 1.8 * cm)
        if sig_img:
            elements.append(sig_img)
            sig_added = True
    if not sig_added:
        elements.append(Spacer(1, 1.8 * cm))

    if eng:
        elements.append(Paragraph(
            f"<u><b>{eng.name}</b></u>",
            _ps("SN", fontName="Helvetica-Bold", fontSize=10, leading=14)))
        if eng.position:
            elements.append(Paragraph(eng.position,
                _ps("SP", fontSize=9, textColor=gray, leading=13)))

    # ── FOOTER (canvas-based, SAME margins as content) ────────────
    def draw_footer(canvas, doc_obj):
        canvas.saveState()
        # Footer line exactly at MARGIN_L → PAGE_W - MARGIN_R
        canvas.setStrokeColor(primary)
        canvas.setLineWidth(1.5)
        canvas.line(MARGIN_L, 2.95 * cm, PAGE_W - MARGIN_R, 2.95 * cm)

        canvas.setFont("Helvetica-Bold", 9)
        canvas.setFillColor(primary)
        canvas.drawCentredString(PAGE_W / 2, 2.5 * cm, FLOTECH_INFO["name"])

        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.HexColor("#6B7280"))
        canvas.drawCentredString(PAGE_W / 2, 2.15 * cm,
            f"{FLOTECH_INFO['address']}  |  {FLOTECH_INFO['city']}")
        canvas.drawCentredString(PAGE_W / 2, 1.85 * cm, FLOTECH_INFO["telp"])
        canvas.drawCentredString(PAGE_W / 2, 1.55 * cm, FLOTECH_INFO["email"])

        canvas.setFillColor(colors.HexColor("#9CA3AF"))
        canvas.setFont("Helvetica", 7.5)
        canvas.drawCentredString(PAGE_W / 2, 1.1 * cm,
            f"Generated: {datetime.now().strftime('%d %B %Y %H:%M')}   |   Halaman {doc_obj.page}")
        canvas.restoreState()

    doc.build(elements, onFirstPage=draw_footer, onLaterPages=draw_footer)
    buffer.seek(0)
    return buffer


# ── PDF ROUTES ────────────────────────────────────────────────────────────────
@surat_resmi_bp.route("/pdf/<int:sid>", methods=["GET"])
@jwt_required()
def download_pdf(sid):
    s = SuratResmi.query.get(sid)
    if not s: return jsonify({"error": "Not found"}), 404
    try:
        buf = build_pdf(sid)
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"error": f"PDF error: {str(e)}"}), 500
    if not buf: return jsonify({"error": "Failed"}), 500
    fname = (f"Surat_{s.surat_type.capitalize()}_{(s.nomor or str(sid))}.pdf"
             .replace("/", "-").replace(" ", "_"))
    return send_file(buf, as_attachment=True, download_name=fname,
                     mimetype="application/pdf")


@surat_resmi_bp.route("/pdf/preview/<int:sid>", methods=["GET"])
@jwt_required()
def preview_pdf(sid):
    s = SuratResmi.query.get(sid)
    if not s: return jsonify({"error": "Not found"}), 404
    try:
        buf = build_pdf(sid)
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"error": f"PDF error: {str(e)}"}), 500
    if not buf: return jsonify({"error": "Failed"}), 500
    fname = (f"Surat_{s.surat_type.capitalize()}_{(s.nomor or str(sid))}.pdf"
             .replace("/", "-").replace(" ", "_"))
    return Response(buf, mimetype="application/pdf",
        headers={"Content-Disposition": f"inline; filename={fname}"})