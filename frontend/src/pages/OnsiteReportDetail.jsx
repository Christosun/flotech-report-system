import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../services/api";
import toast from "react-hot-toast";

const STATUS_CONFIG = {
  draft:     { label: "Draft",     bg: "bg-gray-100",    text: "text-gray-600",   dot: "bg-gray-400"    },
  submitted: { label: "Submitted", bg: "bg-blue-100",    text: "text-blue-700",   dot: "bg-blue-500"    },
  approved:  { label: "Approved",  bg: "bg-emerald-100", text: "text-emerald-700",dot: "bg-emerald-500" },
};

/* ─── PDF Modal ──────────────────────────────────────────────── */
function PDFModal({ url, name, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
      <div className="flex items-center justify-between px-5 py-3 bg-[#0B3D91]">
        <span className="text-white font-bold text-sm">📋 {name} — Preview</span>
        <div className="flex items-center gap-2">
          <a href={url} download className="px-4 py-1.5 bg-white text-[#0B3D91] rounded-lg text-xs font-bold hover:bg-blue-50 transition-colors">⬇ Download</a>
          <button onClick={onClose} className="text-white/70 hover:text-white text-xl px-2">✕</button>
        </div>
      </div>
      <iframe src={url} className="flex-1 w-full" style={{ border: "none" }} />
    </div>
  );
}

/* ─── Delete Dialog ─────────────────────────────────────────── */
function DeleteDialog({ title, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <p className="text-lg font-bold text-gray-800 mb-2">{title}</p>
        <p className="text-sm text-gray-500 mb-5">Tindakan ini tidak dapat dibatalkan.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600">Batal</button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Signature Pad ─────────────────────────────────────────── */
function SignaturePad({ label, value, onChange, existingSig }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [showPad, setShowPad] = useState(false);
  const lastPos = useRef(null);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  };
  const startDraw = (e) => { e.preventDefault(); setDrawing(true); setHasDrawn(true); lastPos.current = getPos(e, canvasRef.current); };
  const draw = (e) => {
    if (!drawing) return; e.preventDefault();
    const canvas = canvasRef.current; const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.beginPath(); ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y); ctx.strokeStyle = "#0B3D91"; ctx.lineWidth = 2.5;
    ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke(); lastPos.current = pos;
  };
  const endDraw = () => setDrawing(false);
  const clearPad = () => { canvasRef.current.getContext("2d").clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); setHasDrawn(false); };
  const saveSig = () => {
    if (!hasDrawn) { toast.error("Buat tanda tangan terlebih dahulu"); return; }
    onChange(canvasRef.current.toDataURL("image/png")); setShowPad(false); toast.success("Tanda tangan disimpan ✅");
  };

  const displaySig = value || (existingSig || null);
  return (
    <div>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{label}</p>
      {displaySig ? (
        <div className="border border-gray-200 rounded-xl bg-gray-50 p-3 relative">
          <img src={displaySig} alt="Signature" className="h-16 mx-auto object-contain" />
          <button onClick={() => { onChange(""); }} className="absolute top-2 right-2 text-xs text-red-500 hover:underline">Hapus</button>
        </div>
      ) : (
        <button onClick={() => setShowPad(true)} className="w-full border-2 border-dashed border-gray-200 rounded-xl py-5 text-gray-400 text-sm hover:border-[#0B3D91] hover:text-[#0B3D91] transition-colors">
          + Tambah Tanda Tangan
        </button>
      )}
      {showPad && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-gray-800 text-sm">{label}</p>
              <button onClick={() => setShowPad(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <canvas ref={canvasRef} width={320} height={150} className="border border-gray-200 rounded-xl w-full touch-none cursor-crosshair bg-gray-50"
              onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
              onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
            <div className="flex gap-2 mt-3">
              <button onClick={clearPad} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Ulangi</button>
              <button onClick={saveSig} className="flex-1 py-2 bg-[#0B3D91] text-white rounded-xl text-sm font-semibold">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Rich Text Editor ─────────────────────────────────────── */
function RichTextEditor({ value, onChange }) {
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const [fontSize, setFontSize] = useState("14px");
  const [fontColor, setFontColor] = useState("#374151");
  const isUpdatingRef = useRef(false);

  useEffect(() => {
    if (editorRef.current && !isUpdatingRef.current) {
      if (editorRef.current.innerHTML !== (value || "")) {
        editorRef.current.innerHTML = value || "";
      }
    }
  }, [value]);

  const exec = useCallback((cmd, val = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
  }, []);

  const handleInput = useCallback(() => {
    isUpdatingRef.current = true;
    onChange(editorRef.current?.innerHTML || "");
    setTimeout(() => { isUpdatingRef.current = false; }, 0);
  }, [onChange]);

  const handleFontSize = (size) => {
    setFontSize(size);
    exec("fontSize", "7");
    const spans = editorRef.current?.querySelectorAll('font[size="7"]');
    spans?.forEach(s => { s.removeAttribute("size"); s.style.fontSize = size; });
  };

  const handleFontColor = (color) => { setFontColor(color); exec("foreColor", color); };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      exec("insertHTML", `<img src="${ev.target.result}" style="max-width:100%;width:300px;cursor:pointer;" />`);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleEditorClick = (e) => {
    if (e.target.tagName === "IMG") {
      const img = e.target;
      const w = prompt("Lebar gambar (px):", img.style.width || "300");
      if (w) { img.style.width = isNaN(w) ? w : w + "px"; handleInput(); }
    }
  };

  const ToolBtn = ({ cmd, val, title, children }) => (
    <button type="button" title={title}
      onMouseDown={e => { e.preventDefault(); exec(cmd, val); }}
      className="px-2 py-1.5 text-sm hover:bg-gray-100 rounded transition-colors text-gray-600 font-medium">
      {children}
    </button>
  );

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-gray-50 border-b border-gray-200">
        <select value={fontSize} onChange={e => handleFontSize(e.target.value)}
          className="text-xs border border-gray-200 rounded px-1.5 py-1 mr-1 bg-white">
          {["10px","12px","13px","14px","16px","18px","20px","24px"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <ToolBtn cmd="bold" title="Bold"><b>B</b></ToolBtn>
        <ToolBtn cmd="italic" title="Italic"><i>I</i></ToolBtn>
        <ToolBtn cmd="underline" title="Underline"><u>U</u></ToolBtn>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <ToolBtn cmd="insertOrderedList" title="Numbered List">1.</ToolBtn>
        <ToolBtn cmd="insertUnorderedList" title="Bullet List">•</ToolBtn>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <ToolBtn cmd="justifyLeft" title="Kiri">⬅</ToolBtn>
        <ToolBtn cmd="justifyCenter" title="Tengah">↔</ToolBtn>
        <ToolBtn cmd="justifyRight" title="Kanan">➡</ToolBtn>
        <ToolBtn cmd="justifyFull" title="Rata">≡</ToolBtn>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <label title="Warna Font" className="flex items-center gap-1 px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer">
          <span className="text-sm" style={{ color: fontColor }}>A</span>
          <input type="color" value={fontColor} onChange={e => handleFontColor(e.target.value)}
            className="w-4 h-4 cursor-pointer border-0 p-0 bg-transparent" />
        </label>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <button type="button" title="Insert Image" onClick={() => fileInputRef.current?.click()}
          className="px-2 py-1.5 text-sm hover:bg-gray-100 rounded transition-colors text-gray-600">🖼</button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      </div>
      <div ref={editorRef} contentEditable suppressContentEditableWarning
        onInput={handleInput} onClick={handleEditorClick}
        className="rich-editor-detail min-h-[180px] p-4 text-sm text-gray-700 focus:outline-none"
        style={{ lineHeight: "1.6" }}
        data-placeholder="Deskripsi pekerjaan..." />
      <style>{`
        .rich-editor-detail:empty:before { content: attr(data-placeholder); color: #9CA3AF; pointer-events: none; }
        .rich-editor-detail ul { list-style-type: disc; padding-left: 1.5rem; margin: 0.25rem 0; }
        .rich-editor-detail ol { list-style-type: decimal; padding-left: 1.5rem; margin: 0.25rem 0; }
        .rich-editor-detail li { margin: 0.1rem 0; }
        .rich-editor-detail p { margin: 0.2rem 0; }
      `}</style>
    </div>
  );
}

/* ─── Equipment Item (view) ──────────────────────────────────── */
function EquipmentCard({ item, index }) {
  return (
    <div className="border border-gray-100 rounded-xl p-3 bg-gray-50">
      <p className="text-xs font-bold text-[#0B3D91] uppercase tracking-wide mb-2">Alat {index + 1}</p>
      {item.description && <p className="text-sm text-gray-700 font-medium">{item.description}</p>}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
        {item.model && <span className="text-xs text-gray-500">Model: <span className="font-semibold text-gray-700">{item.model}</span></span>}
        {item.serial_number && <span className="text-xs text-gray-500">S/N: <span className="font-semibold text-gray-700">{item.serial_number}</span></span>}
      </div>
    </div>
  );
}

/* ─── Equipment Item (edit) ─────────────────────────────────── */
function EquipmentEditItem({ item, index, onChange, onRemove, canRemove }) {
  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white";
  const labelCls = "block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1";
  return (
    <div className="border border-gray-100 rounded-xl p-4 bg-gray-50 relative">
      {canRemove && (
        <button onClick={() => onRemove(index)} className="absolute top-3 right-3 text-red-400 hover:text-red-600 text-lg leading-none">×</button>
      )}
      <p className="text-xs font-bold text-[#0B3D91] uppercase tracking-wide mb-3">Alat {index + 1}</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Informasi Alat</label>
          <input value={item.description || ""} onChange={e => onChange(index, "description", e.target.value)}
            placeholder="Nama / jenis alat" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Model / Type</label>
          <input value={item.model || ""} onChange={e => onChange(index, "model", e.target.value)}
            placeholder="Contoh: iSOLV TUF333iB, EFS803" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Serial Number</label>
          <input value={item.serial_number || ""} onChange={e => onChange(index, "serial_number", e.target.value)}
            placeholder="SN-..." className={inputCls} />
        </div>
      </div>
    </div>
  );
}

/* ─── MAIN PAGE ─────────────────────────────────────────────── */
export default function OnsiteReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport]         = useState(null);
  const [engineers, setEngineers]   = useState([]);
  const [editMode, setEditMode]     = useState(false);
  const [form, setForm]             = useState({});
  const [saving, setSaving]         = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleting, setDeleting]     = useState(false);

  const fetchReport = useCallback(async () => {
    try {
      const res = await API.get(`/onsite/detail/${id}`);
      setReport(res.data);
    } catch { toast.error("Gagal memuat data"); }
  }, [id]);

  useEffect(() => { fetchReport(); }, [fetchReport]);
  useEffect(() => { API.get("/engineer/").then(r => setEngineers(r.data)).catch(() => {}); }, []);

  // Parse equipment_items from report (support legacy single-equipment)
  const getEquipmentItems = (rpt) => {
    if (rpt.equipment_items && Array.isArray(rpt.equipment_items) && rpt.equipment_items.length > 0) {
      return rpt.equipment_items;
    }
    // Fallback: build from legacy fields
    if (rpt.equipment_tag || rpt.equipment_model || rpt.serial_number) {
      return [{ description: rpt.equipment_tag || "", model: rpt.equipment_model || "", serial_number: rpt.serial_number || "" }];
    }
    return [{ description: "", model: "", serial_number: "" }];
  };

  const openEdit = () => {
    setForm({
      report_number: report.report_number || "",
      visit_date_from: report.visit_date_from || report.visit_date || "",
      visit_date_to: report.visit_date_to || "",
      client_name: report.client_name || "",
      client_company: report.client_company || "",
      client_address: report.client_address || "",
      site_location: report.site_location || "",
      contact_person: report.contact_person || "",
      contact_phone: report.contact_phone || "",
      engineer_id: report.engineer_id || "",
      job_description: report.job_description || "",
      equipment_items: getEquipmentItems(report),
      customer_signature: report.customer_signature || "",
      status: report.status || "draft",
    });
    setEditMode(true);
  };

  const handleEquipmentChange = (index, field, value) => {
    setForm(f => {
      const items = [...f.equipment_items];
      items[index] = { ...items[index], [field]: value };
      return { ...f, equipment_items: items };
    });
  };
  const addEquipment = () => setForm(f => ({ ...f, equipment_items: [...f.equipment_items, { description: "", model: "", serial_number: "" }] }));
  const removeEquipment = (index) => setForm(f => ({ ...f, equipment_items: f.equipment_items.filter((_, i) => i !== index) }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        client_name: form.contact_person || form.client_company,
        // backward compat
        visit_date: form.visit_date_from,
        equipment_items: form.equipment_items,
        equipment_tag: form.equipment_items[0]?.description || "",
        equipment_model: form.equipment_items[0]?.model || "",
        serial_number: form.equipment_items[0]?.serial_number || "",
      };
      await API.put(`/onsite/update/${id}`, payload);
      toast.success("Berhasil disimpan ✅");
      setEditMode(false);
      fetchReport();
    } catch { toast.error("Gagal menyimpan"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await API.delete(`/onsite/delete/${id}`);
      toast.success("Report dihapus");
      navigate("/onsite");
    } catch { toast.error("Gagal menghapus"); setDeleting(false); setDeleteDialog(false); }
  };

  const previewPDF = async () => {
    setPreviewLoading(true);
    try {
      const res = await API.get(`/onsite/pdf/preview/${id}`, { responseType: "blob" });
      setPreviewUrl(URL.createObjectURL(new Blob([res.data], { type: "application/pdf" })));
    } catch { toast.error("Gagal memuat preview"); }
    finally { setPreviewLoading(false); }
  };

  const downloadPDF = async () => {
    setPdfLoading(true);
    try {
      const res = await API.get(`/onsite/pdf/${id}`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      Object.assign(document.createElement("a"), { href: url, download: `OnsiteReport_${report.report_number}.pdf` }).click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast.success("PDF diunduh!");
    } catch { toast.error("Gagal generate PDF"); }
    finally { setPdfLoading(false); }
  };

  if (!report) return (
    <div className="flex justify-center items-center h-40">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B3D91]" />
    </div>
  );

  const sc = STATUS_CONFIG[report.status] || STATUS_CONFIG.draft;
  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white";
  const labelClass = "block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5";

  const InfoRow = ({ label, value }) => value ? (
    <div className="flex gap-3 py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 w-40 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-800 font-medium">{value}</span>
    </div>
  ) : null;

  const equipmentItems = getEquipmentItems(report);

  return (
    <div className="max-w-4xl mx-auto">
      {previewUrl && <PDFModal url={previewUrl} name={report.report_number} onClose={() => { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }} />}
      {deleteDialog && <DeleteDialog title="Hapus Report?" onConfirm={handleDelete} onCancel={() => setDeleteDialog(false)} loading={deleting} />}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <button onClick={() => navigate("/onsite")} className="flex items-center gap-2 text-sm text-gray-400 hover:text-[#0B3D91] mb-2 transition-colors">← Kembali</button>
          <h1 className="text-2xl font-bold text-gray-800">{report.report_number}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}>{sc.label}</span>
            {(report.visit_date_from || report.visit_date) && (
              <span className="text-xs text-gray-400">
                {(() => {
                  const from = report.visit_date_from || report.visit_date;
                  const to = report.visit_date_to;
                  const fmt = d => new Date(d + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
                  return to && to !== from ? `${fmt(from)} — ${fmt(to)}` : fmt(from);
                })()}
              </span>
            )}
          </div>
        </div>
        {!editMode && (
          <div className="flex flex-wrap gap-2 justify-end flex-shrink-0">
            <button onClick={() => setDeleteDialog(true)} className="flex items-center gap-1.5 px-3 py-2 text-red-500 border border-red-200 rounded-xl text-xs font-semibold hover:bg-red-50 transition-colors">🗑 Hapus</button>
            <button onClick={previewPDF} disabled={previewLoading} className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold hover:bg-blue-100 transition-colors disabled:opacity-60">
              {previewLoading ? "Loading…" : "👁 Preview"}
            </button>
            <button onClick={downloadPDF} disabled={pdfLoading} className="flex items-center gap-1.5 px-3 py-2 bg-[#0B3D91] text-white rounded-xl text-xs font-semibold hover:bg-[#1E5CC6] transition-colors disabled:opacity-60">
              {pdfLoading ? "Generating…" : "⬇ PDF"}
            </button>
            <button onClick={openEdit} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:border-[#0B3D91] hover:text-[#0B3D91] transition-colors">
              ✏ Edit
            </button>
          </div>
        )}
      </div>

      {/* ── EDIT MODE ─────────────────────────────────────────── */}
      {editMode && (
        <div className="space-y-4 mb-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h4 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3">Informasi Report</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className={labelClass}>Nomor Report</label>
                <input value={form.report_number} readOnly className={inputClass + " bg-gray-50 text-gray-500 cursor-not-allowed font-mono"} />
              </div>
              <div>
                <label className={labelClass}>Tanggal Mulai Kunjungan <span className="text-red-400">*</span></label>
                <input type="date" value={form.visit_date_from} onChange={e => setForm({ ...form, visit_date_from: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Tanggal Selesai <span className="text-gray-400 font-normal normal-case">(opsional)</span></label>
                <input type="date" value={form.visit_date_to} min={form.visit_date_from}
                  onChange={e => setForm({ ...form, visit_date_to: e.target.value })} className={inputClass} />
              </div>
              {form.visit_date_from && form.visit_date_to && form.visit_date_to !== form.visit_date_from && (
                <div className="sm:col-span-2 bg-blue-50 rounded-xl px-4 py-2.5 flex items-center gap-2">
                  <span className="text-[#0B3D91] text-sm">📅</span>
                  <span className="text-xs text-[#0B3D91] font-semibold">
                    {new Date(form.visit_date_from+"T00:00:00").toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"})}
                    {" — "}
                    {new Date(form.visit_date_to+"T00:00:00").toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"})}
                  </span>
                </div>
              )}
              <div>
                <label className={labelClass}>Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className={inputClass}>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Engineer</label>
                <select value={form.engineer_id} onChange={e => setForm({ ...form, engineer_id: e.target.value })} className={inputClass}>
                  <option value="">— Pilih Engineer —</option>
                  {engineers.map(e => <option key={e.id} value={e.id}>{e.name}{e.position ? ` — ${e.position}` : ""}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Client */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h4 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3">Data Client</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className={labelClass}>Perusahaan <span className="text-red-400">*</span></label><input value={form.client_company} onChange={e => setForm({ ...form, client_company: e.target.value })} className={inputClass} placeholder="Nama perusahaan / instansi" /></div>
              <div><label className={labelClass}>Contact Person</label><input value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} className={inputClass} placeholder="Nama PIC / kontak" /></div>
              <div><label className={labelClass}>Telepon</label><input value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass}>Lokasi / Site</label><input value={form.site_location} onChange={e => setForm({ ...form, site_location: e.target.value })} className={inputClass} /></div>
              <div className="sm:col-span-2"><label className={labelClass}>Alamat</label><input value={form.client_address} onChange={e => setForm({ ...form, client_address: e.target.value })} className={inputClass} /></div>
            </div>
          </div>

          {/* Equipment */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider">Data Peralatan</h4>
              <button onClick={addEquipment} className="flex items-center gap-1 px-3 py-1.5 bg-[#EEF3FB] text-[#0B3D91] rounded-lg text-xs font-semibold hover:bg-[#dbe8f8]">
                + Tambah Alat
              </button>
            </div>
            <div className="space-y-3">
              {(form.equipment_items || []).map((item, idx) => (
                <EquipmentEditItem key={idx} item={item} index={idx} onChange={handleEquipmentChange} onRemove={removeEquipment} canRemove={(form.equipment_items || []).length > 1} />
              ))}
            </div>
          </div>

          {/* Detail Pekerjaan */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h4 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3">Detail Pekerjaan</h4>
            <label className={labelClass}>Deskripsi Pekerjaan</label>
            <RichTextEditor value={form.job_description} onChange={v => setForm(f => ({ ...f, job_description: v }))} />
          </div>

          {/* Signature */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h4 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3">Tanda Tangan Customer</h4>
            <SignaturePad label="Tanda Tangan Customer" value={form.customer_signature} onChange={v => setForm({ ...form, customer_signature: v })} />
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setEditMode(false)} className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50">Batal</button>
            <button onClick={handleSave} disabled={saving}
              className="px-6 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-bold hover:bg-[#1E5CC6] disabled:opacity-60 flex items-center gap-2">
              {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Menyimpan…</> : "✓ Simpan Perubahan"}
            </button>
          </div>
        </div>
      )}

      {/* ── VIEW MODE ──────────────────────────────────────────── */}
      {!editMode && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3">🏢 Data Client</h3>
              <InfoRow label="Perusahaan" value={report.client_company} />
              <InfoRow label="Contact Person" value={report.contact_person || report.client_name} />
              <InfoRow label="Telepon" value={report.contact_phone} />
              <InfoRow label="Lokasi / Site" value={report.site_location} />
              <InfoRow label="Alamat" value={report.client_address} />
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3">⚙ Data Peralatan</h3>
              {equipmentItems.map((item, idx) => (
                <EquipmentCard key={idx} item={item} index={idx} />
              ))}
              {report.engineer_name && (
                <div className="mt-3 pt-3 border-t border-gray-50">
                  <InfoRow label="Engineer" value={report.engineer_name} />
                </div>
              )}
            </div>
          </div>

          {/* Detail Pekerjaan - render HTML */}
          {report.job_description && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
              <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3">📋 Detail Pekerjaan</h3>
              <div
                className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: report.job_description }}
              />
            </div>
          )}

          {/* Signatures View */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
            <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-4">✍ Tanda Tangan</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="text-center">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Engineer</p>
                {report.engineer_signature ? (
                  <div className="border border-gray-200 rounded-xl bg-gray-50 p-3">
                    <img src={report.engineer_signature} alt="Engineer Signature" className="h-16 mx-auto object-contain" />
                  </div>
                ) : <div className="border-2 border-dashed border-gray-200 rounded-xl py-6 text-gray-300 text-sm">Belum ada tanda tangan</div>}
                <p className="text-xs text-gray-500 mt-2 font-semibold">{report.engineer_name || "—"}</p>
                {report.engineer_position && <p className="text-xs text-gray-400">{report.engineer_position}</p>}
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Customer</p>
                {report.customer_signature ? (
                  <div className="border border-gray-200 rounded-xl bg-gray-50 p-3">
                    <img src={report.customer_signature} alt="Customer Signature" className="h-16 mx-auto object-contain" />
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl py-6 text-center">
                    <p className="text-gray-300 text-sm">Belum ada tanda tangan</p>
                    <button onClick={openEdit} className="mt-2 text-xs text-[#0B3D91] hover:underline">Tambah Tanda Tangan</button>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-2 font-semibold">{report.client_name || "Customer"}</p>
                {report.client_company && <p className="text-xs text-gray-400">{report.client_company}</p>}
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
}