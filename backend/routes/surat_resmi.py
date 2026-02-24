"""
backend/routes/surat_resmi.py
Surat Rekomendasi & Surat Pernyataan — PT Flotech Controls Indonesia
"""
from flask import Blueprint, request, jsonify, send_file, Response
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import Engineer
from datetime import datetime
from io import BytesIO
import base64
import json

surat_resmi_bp = Blueprint("surat_resmi", __name__)

FLOTECH_INFO = {
    "name":    "PT FLOTECH CONTROLS INDONESIA",
    "address": "Rukan Artha Gading Niaga, Blok F/7",
    "city":    "Jl. Boulevard Artha Gading, Jakarta 14240",
    "telp":    "Telp: +6221 45850778 / Fax: +6221 45850779",
    "email":   "e-Mail: salesjkt@flotech.co.id / Website: www.flotech.com.sg",
}

# ── MODEL ─────────────────────────────────────────────────────────────────────
class SuratResmi(db.Model):
    __tablename__ = "surat_resmi"
    id              = db.Column(db.Integer, primary_key=True)
    nomor           = db.Column(db.String(100))
    surat_type      = db.Column(db.String(30), default="rekomendasi")  # rekomendasi / pernyataan
    perihal         = db.Column(db.String(500))
    lampiran        = db.Column(db.String(300))
    surat_date      = db.Column(db.Date)
    kepada_nama     = db.Column(db.String(200))
    kepada_jabatan  = db.Column(db.String(200))
    kepada_perusahaan = db.Column(db.String(300))
    kepada_alamat   = db.Column(db.Text)
    content_html    = db.Column(db.Text)   # Rich HTML content dari editor
    engineer_id     = db.Column(db.Integer, db.ForeignKey("engineers.id"), nullable=True)
    include_signature = db.Column(db.Boolean, default=True)
    status          = db.Column(db.String(20), default="draft")
    created_by      = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_at      = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at      = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


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


# ── CRUD ──────────────────────────────────────────────────────────────────────
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
        try: surat_date = datetime.strptime(data["surat_date"], "%Y-%m-%d").date()
        except: pass
    s = SuratResmi(
        nomor=data.get("nomor"), surat_type=data.get("surat_type", "rekomendasi"),
        perihal=data.get("perihal"), lampiran=data.get("lampiran"),
        surat_date=surat_date,
        kepada_nama=data.get("kepada_nama"), kepada_jabatan=data.get("kepada_jabatan"),
        kepada_perusahaan=data.get("kepada_perusahaan"), kepada_alamat=data.get("kepada_alamat"),
        content_html=data.get("content_html", ""),
        engineer_id=data.get("engineer_id"),
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
              "content_html","engineer_id","include_signature","status"]:
        if f in data: setattr(s, f, data[f])
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


# ── PDF BUILDER ───────────────────────────────────────────────────────────────
def build_pdf(sid):
    from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
                                     TableStyle, HRFlowable, Image as RLImage)
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.units import cm
    from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
    from PIL import Image as PILImage
    import html, re

    s = SuratResmi.query.get(sid)
    if not s: return None

    eng = Engineer.query.get(s.engineer_id) if s.engineer_id else None

    buffer = BytesIO()
    LEFT = RIGHT = 2.5*cm
    USABLE_W = 16.5*cm

    doc = SimpleDocTemplate(buffer, pagesize=A4,
        topMargin=1.5*cm, bottomMargin=3.5*cm, leftMargin=LEFT, rightMargin=RIGHT)

    primary   = colors.HexColor("#0B3D91")
    secondary = colors.HexColor("#1E5CC6")
    accent    = colors.HexColor("#EEF3FB")
    dark      = colors.HexColor("#1a1a2e")
    text_clr  = colors.HexColor("#374151")
    gray      = colors.HexColor("#6B7280")
    border    = colors.HexColor("#D1D5DB")
    white     = colors.white
    black     = colors.black

    def ps(name, **kw):
        d = dict(fontName="Helvetica", fontSize=10, textColor=text_clr, leading=15)
        d.update(kw); return ParagraphStyle(name, **d)

    elements = []

    # ── HEADER WITH LOGO AREA ───────────────────────────────────
    import os, sys
    # Try to find logo
    logo_paths = [
        os.path.join(os.path.dirname(__file__), "..", "static", "logo.png"),
        "/app/static/logo.png",
    ]
    logo_el = None
    for lp in logo_paths:
        if os.path.exists(lp):
            try:
                logo_el = RLImage(lp, width=4*cm, height=1.5*cm)
                logo_el.hAlign = "RIGHT"
            except: pass
            break

    header_left_lines = [
        Paragraph(f"<b>{FLOTECH_INFO['name']}</b>",
                  ps("H1", fontSize=11, textColor=primary, fontName="Helvetica-Bold", leading=14)),
        Paragraph(FLOTECH_INFO["address"], ps("H2", fontSize=8.5, textColor=gray, leading=12)),
        Paragraph(FLOTECH_INFO["city"],    ps("H3", fontSize=8.5, textColor=gray, leading=12)),
        Paragraph(FLOTECH_INFO["telp"],    ps("H4", fontSize=8.5, textColor=gray, leading=12)),
        Paragraph(FLOTECH_INFO["email"],   ps("H5", fontSize=8.5, textColor=secondary, leading=12)),
    ]

    header_left = [Spacer(1, 0.1*cm)] + header_left_lines

    if logo_el:
        header_table = Table([[header_left_lines, logo_el]], colWidths=[11*cm, 5.5*cm])
        header_table.setStyle(TableStyle([
            ("VALIGN", (0,0), (-1,-1), "TOP"),
            ("ALIGN",  (1,0), (1,-1), "RIGHT"),
        ]))
        elements.append(header_table)
    else:
        for p in header_left_lines: elements.append(p)

    # Horizontal line separator
    elements.append(Spacer(1, 0.3*cm))
    elements.append(HRFlowable(width=USABLE_W, thickness=2, color=primary))
    elements.append(HRFlowable(width=USABLE_W, thickness=0.5, color=secondary, spaceAfter=0.4*cm))
    elements.append(Spacer(1, 0.3*cm))

    # ── NOMOR / PERIHAL / LAMPIRAN / TANGGAL ───────────────────
    tgl = ""
    if s.surat_date:
        MONTHS = ["Januari","Februari","Maret","April","Mei","Juni",
                  "Juli","Agustus","September","Oktober","November","Desember"]
        tgl = f"Jakarta, {s.surat_date.day} {MONTHS[s.surat_date.month-1]} {s.surat_date.year}"

    meta_style = ps("Meta", fontSize=10, leading=15)
    meta_bold  = ps("MetaB", fontSize=10, leading=15, fontName="Helvetica-Bold")
    
    meta_rows = []
    if s.nomor:
        meta_rows.append([
            Paragraph("Nomor", meta_style),
            Paragraph(": ", meta_style),
            Paragraph(s.nomor or "-", meta_bold),
        ])
    if s.perihal:
        meta_rows.append([
            Paragraph("Perihal", meta_style),
            Paragraph(": ", meta_style),
            Paragraph(s.perihal or "-", meta_style),
        ])
    if s.lampiran:
        meta_rows.append([
            Paragraph("Lampiran", meta_style),
            Paragraph(": ", meta_style),
            Paragraph(s.lampiran or "-", meta_style),
        ])
    if tgl:
        meta_rows.append([
            Paragraph("Tanggal", meta_style),
            Paragraph(": ", meta_style),
            Paragraph(tgl, meta_style),
        ])

    if meta_rows:
        meta_t = Table(meta_rows, colWidths=[2.5*cm, 0.4*cm, 13.6*cm])
        meta_t.setStyle(TableStyle([
            ("VALIGN", (0,0), (-1,-1), "TOP"),
            ("TOPPADDING", (0,0), (-1,-1), 1),
            ("BOTTOMPADDING", (0,0), (-1,-1), 1),
        ]))
        elements.append(meta_t)
        elements.append(Spacer(1, 0.5*cm))

    # ── KEPADA ──────────────────────────────────────────────────
    if s.kepada_nama or s.kepada_perusahaan:
        elements.append(Paragraph("Yth.", meta_style))
        if s.kepada_nama:
            elements.append(Paragraph(f"<b>{s.kepada_nama}</b>",
                ps("Kpd", fontName="Helvetica-Bold", fontSize=10, leading=14)))
        if s.kepada_jabatan:
            elements.append(Paragraph(s.kepada_jabatan, meta_style))
        if s.kepada_perusahaan:
            elements.append(Paragraph(s.kepada_perusahaan, meta_style))
        if s.kepada_alamat:
            elements.append(Paragraph(s.kepada_alamat, meta_style))
        elements.append(Paragraph("Di Tempat", meta_style))
        elements.append(Spacer(1, 0.5*cm))

    # ── SALUTATION ──────────────────────────────────────────────
    elements.append(Paragraph("Dengan hormat,", meta_style))
    elements.append(Spacer(1, 0.3*cm))

    # ── BODY CONTENT (HTML → ReportLab) ─────────────────────────
    # Simple HTML-to-ReportLab converter
    content = s.content_html or ""
    
    def html_to_paragraphs(html_str):
        """Convert basic HTML to ReportLab paragraphs."""
        paras = []
        # Clean up
        html_str = html_str.strip()
        if not html_str:
            return paras
        
        # Split by block elements
        # Handle ordered lists
        import re as _re
        
        # Process line by line via tag splitting
        # Replace common block tags with newlines for splitting
        processed = html_str
        processed = _re.sub(r'<br\s*/?>', '\n', processed, flags=_re.IGNORECASE)
        
        # Handle lists
        def proc_list(m):
            tag = m.group(1).lower()
            inner = m.group(2)
            items = _re.findall(r'<li[^>]*>(.*?)</li>', inner, _re.DOTALL|_re.IGNORECASE)
            result = []
            for i, item in enumerate(items):
                clean = _re.sub(r'<[^>]+>', '', item).strip()
                if tag == 'ol':
                    result.append(f"__OL__{i+1}. {clean}")
                else:
                    result.append(f"__UL__• {clean}")
            return '\n'.join(result) + '\n'
        
        processed = _re.sub(r'<(ol|ul)[^>]*>(.*?)</(ol|ul)>', proc_list, processed, flags=_re.DOTALL|_re.IGNORECASE)
        
        # Split by block-level elements
        blocks = _re.split(r'<(?:p|div|h[1-6])[^>]*>|</(?:p|div|h[1-6])>', processed, flags=_re.IGNORECASE)
        
        for block in blocks:
            block = block.strip()
            if not block: continue
            
            lines = block.split('\n')
            for line in lines:
                line = line.strip()
                if not line: continue
                
                # Determine style
                if line.startswith('__OL__'):
                    text = line[6:]
                    p = Paragraph(text, ps("OL", leftIndent=1*cm, leading=15))
                elif line.startswith('__UL__'):
                    text = line[6:]
                    p = Paragraph(text, ps("UL", leftIndent=1*cm, leading=15))
                else:
                    # Clean remaining HTML tags but preserve bold/italic
                    line = _re.sub(r'<strong[^>]*>(.*?)</strong>', r'<b>\1</b>', line, flags=_re.IGNORECASE|_re.DOTALL)
                    line = _re.sub(r'<em[^>]*>(.*?)</em>', r'<i>\1</i>', line, flags=_re.IGNORECASE|_re.DOTALL)
                    line = _re.sub(r'<u[^>]*>(.*?)</u>', r'<u>\1</u>', line, flags=_re.IGNORECASE|_re.DOTALL)
                    # Remove remaining tags
                    line = _re.sub(r'<(?!b>|/b>|i>|/i>|u>|/u>)[^>]+>', '', line)
                    line = line.replace('&nbsp;', ' ').replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').strip()
                    if not line: continue
                    p = Paragraph(line, ps("Body", alignment=TA_JUSTIFY, leading=16))
                
                paras.append(p)
                paras.append(Spacer(1, 0.1*cm))
        
        return paras

    body_paras = html_to_paragraphs(content)
    elements.extend(body_paras)
    elements.append(Spacer(1, 0.5*cm))

    # ── CLOSING & SIGNATURE ─────────────────────────────────────
    elements.append(Paragraph("Demikian surat ini kami sampaikan. Atas perhatian dan kerja samanya, kami ucapkan terima kasih.", 
                               ps("Closing", alignment=TA_JUSTIFY, leading=16)))
    elements.append(Spacer(1, 0.6*cm))

    # Date + company
    if s.surat_date:
        MONTHS = ["Januari","Februari","Maret","April","Mei","Juni",
                  "Juli","Agustus","September","Oktober","November","Desember"]
        tgl_str = f"Jakarta, {s.surat_date.day} {MONTHS[s.surat_date.month-1]} {s.surat_date.year}"
        elements.append(Paragraph(tgl_str, ps("Tgl", fontSize=10, leading=14)))
    elements.append(Paragraph("PT Flotech Controls Indonesia",
                               ps("Company", fontName="Helvetica-Bold", fontSize=10, leading=14, textColor=primary)))
    elements.append(Spacer(1, 0.2*cm))

    # Signature block
    sig_space = Spacer(1, 1.8*cm)
    if s.include_signature and eng and eng.signature_data:
        try:
            sig_b64 = eng.signature_data
            if "base64," in sig_b64: sig_b64 = sig_b64.split("base64,")[1]
            sig_bytes = base64.b64decode(sig_b64)
            sig_pil = PILImage.open(BytesIO(sig_bytes)).convert("RGBA")
            sig_buf = BytesIO(); sig_pil.save(sig_buf, format="PNG"); sig_buf.seek(0)
            sig_img = RLImage(sig_buf, width=4*cm, height=1.5*cm)
            sig_img.hAlign = "LEFT"
            elements.append(sig_img)
        except: elements.append(sig_space)
    else:
        elements.append(sig_space)

    if eng:
        elements.append(Paragraph(f"<u><b>{eng.name}</b></u>",
                                   ps("SigName", fontName="Helvetica-Bold", fontSize=10, leading=14)))
        elements.append(Paragraph(eng.position or "",
                                   ps("SigPos", fontSize=9, textColor=gray, leading=13)))

    # ── FOOTER ──────────────────────────────────────────────────
    def footer_canvas(cv, doc_obj):
        cv.saveState()
        pw, ph = A4
        cv.setStrokeColor(primary); cv.setLineWidth(1.5)
        cv.line(LEFT, 2.8*cm, pw - RIGHT, 2.8*cm)
        cv.setFont("Helvetica-Bold", 9); cv.setFillColor(primary)
        cv.drawCentredString(pw/2, 2.3*cm, FLOTECH_INFO["name"])
        cv.setFont("Helvetica", 8); cv.setFillColor(colors.HexColor("#6B7280"))
        cv.drawCentredString(pw/2, 2.0*cm, f"{FLOTECH_INFO['address']}  |  {FLOTECH_INFO['city']}")
        cv.drawCentredString(pw/2, 1.7*cm, FLOTECH_INFO["telp"])
        cv.drawCentredString(pw/2, 1.4*cm, FLOTECH_INFO["email"])
        cv.setFillColor(colors.HexColor("#9CA3AF"))
        cv.drawCentredString(pw/2, 1.0*cm, f"Generated: {datetime.now().strftime('%d %B %Y %H:%M')}  |  Halaman {doc_obj.page}")
        cv.restoreState()

    doc.build(elements, onFirstPage=footer_canvas, onLaterPages=footer_canvas)
    buffer.seek(0)
    return buffer


@surat_resmi_bp.route("/pdf/<int:sid>", methods=["GET"])
@jwt_required()
def download_pdf(sid):
    s = SuratResmi.query.get(sid)
    if not s: return jsonify({"error": "Not found"}), 404
    buf = build_pdf(sid)
    if not buf: return jsonify({"error": "Failed"}), 500
    fname = f"Surat_{s.surat_type.capitalize()}_{s.nomor or sid}.pdf".replace("/", "-").replace(" ", "_")
    return send_file(buf, as_attachment=True, download_name=fname, mimetype="application/pdf")


@surat_resmi_bp.route("/pdf/preview/<int:sid>", methods=["GET"])
@jwt_required()
def preview_pdf(sid):
    s = SuratResmi.query.get(sid)
    if not s: return jsonify({"error": "Not found"}), 404
    buf = build_pdf(sid)
    if not buf: return jsonify({"error": "Failed"}), 500
    fname = f"Surat_{s.surat_type.capitalize()}_{s.nomor or sid}.pdf".replace("/", "-").replace(" ", "_")
    return Response(buf, mimetype="application/pdf",
        headers={"Content-Disposition": f"inline; filename={fname}"})
