from flask import Blueprint, request, jsonify, send_file, Response, current_app
from extensions import db
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

surat_bp = Blueprint('surat', __name__)

FLOTECH_INFO = {
    "name": "PT FLOTECH CONTROLS INDONESIA",
    "address": "Rukan Artha Gading Niaga, Blok F/7",
    "city": "Jl. Boulevard Artha Gading, Jakarta 14240",
    "telp": "Telp: +6221 45850778 / Fax: +6221 45850779",
    "email": "e-Mail: salesjkt@flotech.co.id / Website: www.flotech.com.sg",
}


class SuratSerahTerima(db.Model):
    __tablename__ = "surat_serah_terima"
    id                      = db.Column(db.Integer, primary_key=True)
    surat_number            = db.Column(db.String(50))
    surat_type              = db.Column(db.String(20), default="serah")  # serah / terima
    surat_date              = db.Column(db.Date)
    perihal                 = db.Column(db.String(300))
    pihak_pertama_nama      = db.Column(db.String(150))
    pihak_pertama_jabatan   = db.Column(db.String(100))
    pihak_pertama_perusahaan= db.Column(db.String(200))
    pihak_pertama_alamat    = db.Column(db.Text)
    pihak_pertama_signature = db.Column(db.Text)
    pihak_kedua_nama        = db.Column(db.String(150))
    pihak_kedua_jabatan     = db.Column(db.String(100))
    pihak_kedua_perusahaan  = db.Column(db.String(200))
    pihak_kedua_alamat      = db.Column(db.Text)
    pihak_kedua_signature   = db.Column(db.Text)
    barang_items            = db.Column(db.JSON)
    catatan                 = db.Column(db.Text)
    status                  = db.Column(db.String(20), default="draft")
    created_by              = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_at              = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at              = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


def surat_to_dict(s, include_sig=False):
    d = {
        "id": s.id, "surat_number": s.surat_number, "surat_type": s.surat_type,
        "surat_date": s.surat_date.isoformat() if s.surat_date else None,
        "perihal": s.perihal,
        "pihak_pertama_nama": s.pihak_pertama_nama, "pihak_pertama_jabatan": s.pihak_pertama_jabatan,
        "pihak_pertama_perusahaan": s.pihak_pertama_perusahaan, "pihak_pertama_alamat": s.pihak_pertama_alamat,
        "pihak_kedua_nama": s.pihak_kedua_nama, "pihak_kedua_jabatan": s.pihak_kedua_jabatan,
        "pihak_kedua_perusahaan": s.pihak_kedua_perusahaan, "pihak_kedua_alamat": s.pihak_kedua_alamat,
        "barang_items": s.barang_items or [], "catatan": s.catatan,
        "status": s.status, "items_count": len(s.barang_items) if s.barang_items else 0,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }
    if include_sig:
        d["pihak_pertama_signature"] = s.pihak_pertama_signature
        d["pihak_kedua_signature"]   = s.pihak_kedua_signature
    return d


@surat_bp.route('/list', methods=['GET'])
@jwt_required()
def list_surat():
    items = SuratSerahTerima.query.order_by(SuratSerahTerima.created_at.desc()).all()
    return jsonify([surat_to_dict(s) for s in items]), 200


@surat_bp.route('/create', methods=['POST'])
@jwt_required()
def create_surat():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    surat_date = None
    if data.get("surat_date"):
        try: surat_date = datetime.strptime(data["surat_date"], "%Y-%m-%d").date()
        except: pass
    s = SuratSerahTerima(
        surat_number=data.get("surat_number"), surat_type=data.get("surat_type", "serah"),
        surat_date=surat_date, perihal=data.get("perihal"),
        pihak_pertama_nama=data.get("pihak_pertama_nama"),
        pihak_pertama_jabatan=data.get("pihak_pertama_jabatan"),
        pihak_pertama_perusahaan=data.get("pihak_pertama_perusahaan"),
        pihak_pertama_alamat=data.get("pihak_pertama_alamat"),
        pihak_pertama_signature=data.get("pihak_pertama_signature"),
        pihak_kedua_nama=data.get("pihak_kedua_nama"),
        pihak_kedua_jabatan=data.get("pihak_kedua_jabatan"),
        pihak_kedua_perusahaan=data.get("pihak_kedua_perusahaan"),
        pihak_kedua_alamat=data.get("pihak_kedua_alamat"),
        pihak_kedua_signature=data.get("pihak_kedua_signature"),
        barang_items=data.get("barang_items", []), catatan=data.get("catatan"),
        status=data.get("status", "draft"), created_by=user_id,
    )
    db.session.add(s); db.session.commit()
    return jsonify({"message": "Created", "id": s.id}), 201


@surat_bp.route('/detail/<int:sid>', methods=['GET'])
@jwt_required()
def get_detail(sid):
    s = SuratSerahTerima.query.get(sid)
    if not s: return jsonify({"error": "Not found"}), 404
    return jsonify(surat_to_dict(s, include_sig=True)), 200


@surat_bp.route('/update/<int:sid>', methods=['PUT'])
@jwt_required()
def update_surat(sid):
    s = SuratSerahTerima.query.get(sid)
    if not s: return jsonify({"error": "Not found"}), 404
    data = request.get_json()
    for field in ["surat_number", "surat_type", "perihal",
                  "pihak_pertama_nama", "pihak_pertama_jabatan",
                  "pihak_pertama_perusahaan", "pihak_pertama_alamat", "pihak_pertama_signature",
                  "pihak_kedua_nama", "pihak_kedua_jabatan",
                  "pihak_kedua_perusahaan", "pihak_kedua_alamat", "pihak_kedua_signature",
                  "catatan", "status", "barang_items"]:
        if field in data: setattr(s, field, data[field])
    if data.get("surat_date"):
        try: s.surat_date = datetime.strptime(data["surat_date"], "%Y-%m-%d").date()
        except: pass
    s.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"message": "Updated"}), 200


@surat_bp.route('/delete/<int:sid>', methods=['DELETE'])
@jwt_required()
def delete_surat(sid):
    s = SuratSerahTerima.query.get(sid)
    if not s: return jsonify({"error": "Not found"}), 404
    db.session.delete(s); db.session.commit()
    return jsonify({"message": "Deleted"}), 200


# ── PDF BUILDER ──────────────────────────────────────────────────────────────
# usable_w = A4(210mm) - 2x2.5cm = 165mm = 16.5cm
# ─────────────────────────────────────────────────────────────────────────────
def build_surat_pdf(sid):
    s = SuratSerahTerima.query.get(sid)
    if not s: return None

    buffer = BytesIO()
    LEFT = RIGHT = 2.5*cm
    USABLE_W = 16.5*cm  # 210mm - 50mm

    doc = SimpleDocTemplate(buffer, pagesize=A4,
        topMargin=2*cm, bottomMargin=3.5*cm, leftMargin=LEFT, rightMargin=RIGHT)

    primary   = colors.HexColor("#0B3D91")
    secondary = colors.HexColor("#1E5CC6")
    emerald   = colors.HexColor("#059669")
    accent    = colors.HexColor("#EEF3FB")
    dark      = colors.HexColor("#1a1a2e")
    text_clr  = colors.HexColor("#374151")
    gray      = colors.HexColor("#6B7280")
    border    = colors.HexColor("#D1D5DB")
    white     = colors.white

    def ps(name, **kw):
        d = dict(fontName='Helvetica', fontSize=10, textColor=text_clr, leading=14)
        d.update(kw); return ParagraphStyle(name, **d)

    elements = []

    # ── Determine labels based on surat_type ────────────────────
    # serah:  pihak pertama = YANG MENYERAHKAN, pihak kedua = YANG MENERIMA
    # terima: pihak pertama = YANG MENERIMA,    pihak kedua = YANG MENYERAHKAN
    is_serah = s.surat_type != "terima"
    if is_serah:
        title_text    = "BERITA ACARA SERAH TERIMA BARANG"
        p1_role       = "PIHAK PERTAMA (Yang Menyerahkan)"
        p2_role       = "PIHAK KEDUA (Yang Menerima)"
        opening_action = "menyerahkan kepada pihak kedua"
        p1_sig_label   = "PIHAK PERTAMA\n(Yang Menyerahkan)"
        p2_sig_label   = "PIHAK KEDUA\n(Yang Menerima)"
        p1_header_color = primary
        p2_header_color = emerald
    else:
        title_text    = "BERITA ACARA PENERIMAAN BARANG"
        p1_role       = "PIHAK PERTAMA (Yang Menerima)"
        p2_role       = "PIHAK KEDUA (Yang Menyerahkan)"
        opening_action = "menerima dari pihak kedua"
        p1_sig_label   = "PIHAK PERTAMA\n(Yang Menerima)"
        p2_sig_label   = "PIHAK KEDUA\n(Yang Menyerahkan)"
        p1_header_color = emerald
        p2_header_color = primary

    # ── HEADER ──────────────────────────────────────────────────
    logo_path = os.path.join(current_app.root_path, "assets", "logo.png")
    logo_col_w = 7.5*cm
    title_col_w = USABLE_W - logo_col_w  # 9cm

    if os.path.exists(logo_path):
        try:
            pil_logo = PILImage.open(logo_path)
            lw, lh = pil_logo.size
            target_h = 1.6*cm
            target_w = min((lw / lh) * target_h, 4.5*cm)
            logo_cell = Image(logo_path, width=target_w, height=target_h)
        except:
            logo_cell = Paragraph("<b>FLOTECH</b>", ps('LF', fontSize=16, fontName='Helvetica-Bold', textColor=primary))
    else:
        logo_cell = Paragraph("<b>FLOTECH</b>", ps('LF', fontSize=16, fontName='Helvetica-Bold', textColor=primary))

    right_block = Table([
        [Paragraph(title_text, ps('TT', fontSize=12, fontName='Helvetica-Bold', textColor=white, alignment=2, leading=16))],
        [Paragraph(s.surat_number or "", ps('TS', fontSize=9, textColor=colors.HexColor("#BFD3F5"), alignment=2))],
    ], colWidths=[title_col_w])
    right_block.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,-1), primary),
        ('PADDING',(0,0),(-1,-1), 10),
        ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
    ]))

    hdr = Table([[logo_cell, right_block]], colWidths=[logo_col_w, title_col_w])
    hdr.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'MIDDLE')]))
    elements.append(hdr)
    elements.append(Spacer(1, 0.3*cm))
    elements.append(HRFlowable(width="100%", thickness=2, color=primary))
    elements.append(Spacer(1, 0.4*cm))

    # ── META TABLE (full width) ──────────────────────────────────
    date_str = s.surat_date.strftime("%d %B %Y") if s.surat_date else "-"
    # 3cm + 6cm + 3cm + 4.5cm = 16.5cm ✓
    meta_data = [[
        Paragraph("<b>Nomor Surat</b>", ps('ML', fontSize=8, fontName='Helvetica-Bold', textColor=gray)),
        Paragraph(s.surat_number or "-", ps('MV', fontSize=10, fontName='Helvetica-Bold', textColor=dark)),
        Paragraph("<b>Tanggal</b>", ps('ML2', fontSize=8, fontName='Helvetica-Bold', textColor=gray)),
        Paragraph(date_str, ps('MV2', fontSize=10, textColor=dark)),
    ]]
    meta_t = Table(meta_data, colWidths=[3*cm, 6*cm, 3*cm, 4.5*cm])
    meta_t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,-1), accent),
        ('BOX',(0,0),(-1,-1), 0.5, border),
        ('LINEAFTER',(1,0),(1,0), 0.5, border),
        ('PADDING',(0,0),(-1,-1), 9),
        ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
    ]))
    elements.append(meta_t)

    if s.perihal:
        perihal_data = [[
            Paragraph("<b>Perihal</b>", ps('PL', fontSize=8, fontName='Helvetica-Bold', textColor=gray)),
            Paragraph(s.perihal, ps('PV', fontSize=10, textColor=dark)),
        ]]
        perihal_t = Table(perihal_data, colWidths=[3*cm, 13.5*cm])
        perihal_t.setStyle(TableStyle([
            ('BACKGROUND',(0,0),(-1,-1), accent),
            ('BOX',(0,0),(-1,-1), 0.5, border),
            ('TOPPADDING',(0,0),(-1,-1), 0),
            ('PADDING',(0,0),(-1,-1), 9),
            ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
            ('LINEABOVE',(0,0),(-1,0), 0.3, border),
        ]))
        elements.append(perihal_t)

    elements.append(Spacer(1, 0.5*cm))

    # ── OPENING PARAGRAPH ───────────────────────────────────────
    p1_name = s.pihak_pertama_nama or "Pihak Pertama"
    p2_name = s.pihak_kedua_nama   or "Pihak Kedua"
    opening = (
        f"Yang bertanda tangan di bawah ini, <b>{p1_name}</b> selaku pihak pertama "
        f"menyatakan bahwa telah {opening_action} barang-barang kepada <b>{p2_name}</b> "
        f"selaku pihak kedua, dengan rincian sebagaimana tercantum di bawah ini."
    )
    elements.append(Paragraph(opening, ps('Op', fontSize=10, textColor=text_clr, leading=15)))
    elements.append(Spacer(1, 0.5*cm))

    # ── PIHAK BLOCKS (two columns, each = half USABLE_W) ────────
    gap    = 0.4*cm
    col_p  = (USABLE_W - gap) / 2  # 8.05cm each

    def pihak_block(role_label, nama, jabatan, perusahaan, alamat, header_color):
        rows = [[Paragraph(role_label, ps('PH', fontSize=9, fontName='Helvetica-Bold', textColor=white))]]
        if perusahaan: rows.append([Paragraph(perusahaan, ps('PP', fontSize=11, fontName='Helvetica-Bold', textColor=dark, leading=14))])
        if nama:       rows.append([Paragraph(nama, ps('PN', fontSize=10, textColor=text_clr))])
        if jabatan:    rows.append([Paragraph(jabatan, ps('PJ', fontSize=9, textColor=gray))])
        if alamat:     rows.append([Paragraph(alamat, ps('PA', fontSize=8, textColor=gray, leading=11))])
        t = Table(rows, colWidths=[col_p])
        t.setStyle(TableStyle([
            ('BACKGROUND',(0,0),(0,0), header_color),
            ('BACKGROUND',(0,1),(-1,-1), accent),
            ('BOX',(0,0),(-1,-1), 0.5, border),
            ('PADDING',(0,0),(-1,-1), 9),
            ('VALIGN',(0,0),(-1,-1),'TOP'),
        ]))
        return t

    p1_block = pihak_block(p1_role,
        s.pihak_pertama_nama, s.pihak_pertama_jabatan,
        s.pihak_pertama_perusahaan, s.pihak_pertama_alamat,
        p1_header_color)
    p2_block = pihak_block(p2_role,
        s.pihak_kedua_nama, s.pihak_kedua_jabatan,
        s.pihak_kedua_perusahaan, s.pihak_kedua_alamat,
        p2_header_color)

    pihak_row = Table([[p1_block, p2_block]], colWidths=[col_p, col_p])
    pihak_row.setStyle(TableStyle([
        ('VALIGN',(0,0),(-1,-1),'TOP'),
        ('RIGHTPADDING',(0,0),(0,0), gap),
    ]))
    elements.append(pihak_row)
    elements.append(Spacer(1, 0.5*cm))

    # ── BARANG TABLE (full width) ────────────────────────────────
    elements.append(Paragraph("▌ DAFTAR BARANG", ps('SH', fontSize=10, fontName='Helvetica-Bold', textColor=primary, spaceBefore=4, spaceAfter=2)))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=border))
    elements.append(Spacer(1, 0.2*cm))

    th_s = ps('TH', fontSize=9, fontName='Helvetica-Bold', textColor=white, alignment=1)
    td_s = ps('TD', fontSize=9, textColor=dark, leading=12)
    td_c = ps('TDC', fontSize=9, textColor=dark, alignment=1, leading=12)

    # Col widths sum = 16.5cm: 1.2 + 7.0 + 1.8 + 2.0 + 4.5 = 16.5cm ✓
    col_w = [1.2*cm, 7.0*cm, 1.8*cm, 2.0*cm, 4.5*cm]
    barang_header = [Paragraph(h, th_s) for h in ["No", "Nama Barang / Alat", "Jumlah", "Satuan", "Keterangan"]]
    barang_data = [barang_header]

    light_gray = colors.HexColor("#F9FAFB")
    for item in (s.barang_items or []):
        barang_data.append([
            Paragraph(str(item.get("no", "")), td_c),
            Paragraph(str(item.get("nama_barang", "")), td_s),
            Paragraph(str(item.get("jumlah", "")), td_c),
            Paragraph(str(item.get("satuan", "")), td_c),
            Paragraph(str(item.get("keterangan", "")), td_s),
        ])

    bt = Table(barang_data, colWidths=col_w, repeatRows=1)
    bt.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0), primary),
        ('ROWBACKGROUNDS',(0,1),(-1,-1), [white, light_gray]),
        ('BOX',(0,0),(-1,-1), 0.5, border),
        ('LINEBELOW',(0,0),(-1,-2), 0.2, border),
        ('PADDING',(0,0),(-1,-1), 7),
        ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
        ('ALIGN',(0,0),(0,-1),'CENTER'),
        ('ALIGN',(2,0),(3,-1),'CENTER'),
    ]))
    elements.append(bt)

    if s.catatan:
        elements.append(Spacer(1, 0.3*cm))
        note_data = [
            [Paragraph("<b>CATATAN</b>", ps('NL', fontSize=9, fontName='Helvetica-Bold', textColor=white))],
            [Paragraph(s.catatan, ps('NT', fontSize=9, textColor=text_clr, leading=13))],
        ]
        note_t = Table(note_data, colWidths=[USABLE_W])
        note_t.setStyle(TableStyle([
            ('BACKGROUND',(0,0),(-1,0), secondary),
            ('BACKGROUND',(0,1),(-1,-1), accent),
            ('BOX',(0,0),(-1,-1), 0.5, border),
            ('PADDING',(0,0),(-1,-1), 9),
        ]))
        elements.append(note_t)

    # ── CLOSING ─────────────────────────────────────────────────
    elements.append(Spacer(1, 0.5*cm))
    elements.append(Paragraph(
        f"Demikian Berita Acara ini dibuat dan ditandatangani oleh kedua belah pihak pada tanggal <b>{date_str}</b> "
        f"sebagai bukti yang sah atas serah terima barang tersebut di atas.",
        ps('Cl', fontSize=9, textColor=gray, leading=13)
    ))
    elements.append(Spacer(1, 0.4*cm))

    # ── SIGNATURES (two columns) ─────────────────────────────────
    def sig_image(b64_data):
        if not b64_data: return Spacer(1, 1.8*cm)
        try:
            data = b64_data
            if "base64," in data: data = data.split("base64,")[1]
            pil_img = PILImage.open(BytesIO(base64.b64decode(data))).convert("RGBA")
            buf = BytesIO(); pil_img.save(buf, format="PNG"); buf.seek(0)
            img = Image(buf, width=4*cm, height=1.6*cm)
            img.hAlign = 'CENTER'
            return img
        except: return Spacer(1, 1.8*cm)

    sig_l  = ps('SL',  fontSize=9, fontName='Helvetica-Bold', alignment=1)
    sig_sub = ps('SS', fontSize=8, textColor=gray, alignment=1, leading=11)
    # Use same colors as pihak blocks
    p1_sig_bg = colors.HexColor("#EEF3FB")
    p2_sig_bg = colors.HexColor("#ECFDF5") if not is_serah else colors.HexColor("#EEF3FB")

    sig_rows = [
        [Paragraph(p1_sig_label.replace("\n", "<br/>"), ps('SL1', fontSize=9, fontName='Helvetica-Bold', textColor=p1_header_color, alignment=1)),
         Paragraph(p2_sig_label.replace("\n", "<br/>"), ps('SL2', fontSize=9, fontName='Helvetica-Bold', textColor=p2_header_color, alignment=1))],
        [sig_image(s.pihak_pertama_signature), sig_image(s.pihak_kedua_signature)],
        [HRFlowable(width=col_p - 1.5*cm, thickness=0.5, color=border),
         HRFlowable(width=col_p - 1.5*cm, thickness=0.5, color=border)],
        [Paragraph(s.pihak_pertama_nama or "—", sig_sub),
         Paragraph(s.pihak_kedua_nama   or "—", sig_sub)],
        [Paragraph(f"{s.pihak_pertama_jabatan or ''}\n{s.pihak_pertama_perusahaan or ''}" if s.pihak_pertama_jabatan else (s.pihak_pertama_perusahaan or ""),
                   ps('SJ1', fontSize=8, textColor=gray, alignment=1, leading=11)),
         Paragraph(f"{s.pihak_kedua_jabatan or ''}\n{s.pihak_kedua_perusahaan or ''}" if s.pihak_kedua_jabatan else (s.pihak_kedua_perusahaan or ""),
                   ps('SJ2', fontSize=8, textColor=gray, alignment=1, leading=11))],
    ]
    sig_t = Table(sig_rows, colWidths=[col_p, col_p])
    sig_t.setStyle(TableStyle([
        ('ALIGN',(0,0),(-1,-1),'CENTER'),
        ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
        ('PADDING',(0,0),(-1,-1), 8),
        ('BOX',(0,0),(0,-1), 0.5, border),
        ('BOX',(1,0),(1,-1), 0.5, border),
        ('BACKGROUND',(0,0),(0,0), accent),
        ('BACKGROUND',(1,0),(1,0), accent),
        ('RIGHTPADDING',(0,0),(0,-1), gap),
    ]))
    elements.append(sig_t)

    # ── FOOTER ───────────────────────────────────────────────────
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


@surat_bp.route('/pdf/<int:sid>', methods=['GET'])
@jwt_required()
def download_pdf(sid):
    s = SuratSerahTerima.query.get(sid)
    if not s: return jsonify({"error": "Not found"}), 404
    buf = build_surat_pdf(sid)
    if not buf: return jsonify({"error": "Failed"}), 500
    return send_file(buf, as_attachment=True, download_name=f"Surat_{s.surat_number}.pdf", mimetype="application/pdf")


@surat_bp.route('/pdf/preview/<int:sid>', methods=['GET'])
@jwt_required()
def preview_pdf(sid):
    s = SuratSerahTerima.query.get(sid)
    if not s: return jsonify({"error": "Not found"}), 404
    buf = build_surat_pdf(sid)
    if not buf: return jsonify({"error": "Failed"}), 500
    return Response(buf, mimetype="application/pdf",
        headers={"Content-Disposition": f"inline; filename=Surat_{s.surat_number}.pdf"})