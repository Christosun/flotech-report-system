import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../services/api";
import toast from "react-hot-toast";

const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

const STATUS_CONFIG = {
  draft:     { label: "Draft",     bg: "bg-gray-100",    text: "text-gray-600" },
  submitted: { label: "Submitted", bg: "bg-blue-100",    text: "text-blue-700" },
  approved:  { label: "Approved",  bg: "bg-emerald-100", text: "text-emerald-700" },
};

/* ─── Delete Dialog ──────────────────────────────────────── */
function DeleteDialog({ title, description, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-gradient-to-br from-red-50 to-rose-100 px-6 pt-6 pb-4 text-center">
          <div className="w-14 h-14 bg-red-100 border-4 border-red-200 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>
        <div className="px-6 py-4 flex gap-3">
          <button onClick={onCancel} disabled={loading} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Batal</button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 flex items-center justify-center gap-2 disabled:opacity-60">
            {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />} Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── PDF Preview Modal ───────────────────────────────────── */
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

/* ─── Signature Pad Component ────────────────────────────── */
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

  const startDraw = (e) => {
    e.preventDefault();
    setDrawing(true);
    setHasDrawn(true);
    const canvas = canvasRef.current;
    lastPos.current = getPos(e, canvas);
  };

  const draw = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#0B3D91";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastPos.current = pos;
  };

  const endDraw = () => setDrawing(false);

  const clearPad = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const saveSig = () => {
    if (!hasDrawn) { toast.error("Buat tanda tangan terlebih dahulu"); return; }
    const data = canvasRef.current.toDataURL("image/png");
    onChange(data);
    setShowPad(false);
    toast.success("Tanda tangan disimpan ✅");
  };

  const displaySig = value || (existingSig ? existingSig : null);

  return (
    <div>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{label}</p>
      {displaySig ? (
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
          <img src={displaySig} alt="Signature" className="h-16 mx-auto object-contain py-1" />
          <div className="border-t border-gray-100 px-3 py-2 flex gap-2">
            <button onClick={() => setShowPad(true)} className="text-xs text-[#0B3D91] hover:underline">✏ Ubah</button>
            <button onClick={() => onChange("")} className="text-xs text-red-500 hover:underline">× Hapus</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowPad(true)}
          className="w-full border-2 border-dashed border-gray-200 rounded-xl py-6 text-center hover:border-[#0B3D91] hover:bg-blue-50 transition-all">
          <p className="text-3xl mb-1">✍</p>
          <p className="text-xs font-semibold text-gray-400">Klik untuk tanda tangan</p>
        </button>
      )}

      {showPad && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-800">Tanda Tangan Digital</h3>
                <p className="text-xs text-gray-400">{label}</p>
              </div>
              <button onClick={() => setShowPad(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-4">
              <div className="border-2 border-dashed border-gray-200 rounded-xl overflow-hidden bg-gray-50 relative">
                <canvas ref={canvasRef} width={440} height={160}
                  style={{ touchAction: "none", width: "100%", display: "block", cursor: "crosshair" }}
                  onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                  onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
                {!hasDrawn && (
                  <p className="absolute inset-0 flex items-center justify-center text-gray-300 text-sm pointer-events-none">Tanda tangan di sini...</p>
                )}
              </div>
              <div className="flex gap-3 mt-3">
                <button onClick={clearPad} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Bersihkan</button>
                <button onClick={saveSig} className="flex-1 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-bold hover:bg-[#1E5CC6]">✓ Simpan Tanda Tangan</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ──────────────────────────────────────── */
export default function OnsiteReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [engineers, setEngineers] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchReport = useCallback(async () => {
    try {
      const res = await API.get(`/onsite/detail/${id}`);
      setReport(res.data);
    } catch { toast.error("Gagal memuat data"); }
  }, [id]);

  useEffect(() => { fetchReport(); }, [fetchReport]);
  useEffect(() => { API.get("/engineer/").then(r => setEngineers(r.data)).catch(() => {}); }, []);

  const openEdit = () => {
    setForm({
      report_number: report.report_number || "",
      visit_date: report.visit_date || "",
      client_name: report.client_name || "",
      client_company: report.client_company || "",
      client_address: report.client_address || "",
      site_location: report.site_location || "",
      contact_person: report.contact_person || "",
      contact_phone: report.contact_phone || "",
      engineer_id: report.engineer_id || "",
      job_description: report.job_description || "",
      equipment_tag: report.equipment_tag || "",
      equipment_model: report.equipment_model || "",
      serial_number: report.serial_number || "",
      work_performed: report.work_performed || "",
      findings: report.findings || "",
      recommendations: report.recommendations || "",
      materials_used: report.materials_used || "",
      status: report.status || "draft",
      customer_signature: report.customer_signature || "",
    });
    setEditMode(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await API.put(`/onsite/update/${id}`, form);
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

  if (!report) return <div className="flex justify-center items-center h-40"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B3D91]" /></div>;

  const sc = STATUS_CONFIG[report.status] || STATUS_CONFIG.draft;
  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white";
  const labelClass = "block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5";

  const InfoRow = ({ label, value }) => value ? (
    <div className="flex gap-3 py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 w-40 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-800 font-medium">{value}</span>
    </div>
  ) : null;

  return (
    <div className="max-w-4xl mx-auto">
      {previewUrl && <PDFModal url={previewUrl} name={report.report_number} onClose={() => { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }} />}
      {deleteDialog && <DeleteDialog title="Hapus Report?" description={`"${report.report_number}" akan dihapus permanen.`} onConfirm={handleDelete} onCancel={() => setDeleteDialog(false)} loading={deleting} />}

      {/* Back */}
      <button onClick={() => navigate("/onsite")} className="flex items-center gap-2 text-sm text-gray-400 hover:text-[#0B3D91] mb-5 transition-colors">← Kembali ke Onsite Reports</button>

      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${sc.bg} ${sc.text}`}>{sc.label}</span>
            </div>
            <h1 className="text-2xl font-black text-[#0B3D91]">{report.report_number}</h1>
            <p className="text-gray-500 text-sm mt-1">{report.client_name}{report.client_company && ` — ${report.client_company}`}</p>
            <p className="text-gray-400 text-xs mt-0.5">
              {report.site_location && `📍 ${report.site_location}  `}
              {report.visit_date && `📅 ${new Date(report.visit_date).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`}
            </p>
            {report.engineer_name && <p className="text-gray-400 text-xs mt-0.5">Engineer: <span className="font-semibold text-gray-600">{report.engineer_name}</span></p>}
          </div>
          <div className="flex flex-wrap gap-2">
            {!editMode && <button onClick={openEdit} className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-sm font-semibold hover:bg-amber-100 transition-colors">✏ Edit</button>}
            <button onClick={previewPDF} disabled={previewLoading} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-sm font-semibold hover:bg-blue-100 transition-colors disabled:opacity-60">
              {previewLoading ? <div className="w-3.5 h-3.5 border-2 border-blue-700/30 border-t-blue-700 rounded-full animate-spin" /> : "👁"} Preview
            </button>
            <button onClick={downloadPDF} disabled={pdfLoading} className="flex items-center gap-2 px-4 py-2 bg-[#0B3D91] text-white rounded-xl text-sm font-semibold hover:bg-[#1E5CC6] transition-colors disabled:opacity-60">
              {pdfLoading ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "⬇"} PDF
            </button>
            <button onClick={() => setDeleteDialog(true)} className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors">🗑</button>
          </div>
        </div>
      </div>

      {/* ── EDIT MODE ─────────────────────────────────────────── */}
      {editMode && (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-6 mb-4">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-amber-700 uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-4 bg-amber-400 rounded-full" /> Edit Mode
            </h3>
            <button onClick={() => setEditMode(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
          </div>

          <div className="space-y-5">
            {/* Info */}
            <div>
              <h4 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3">Info Report</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className={labelClass}>Nomor Report</label><input value={form.report_number} onChange={e => setForm({...form, report_number: e.target.value})} className={inputClass} /></div>
                <div><label className={labelClass}>Tanggal Kunjungan</label><input type="date" value={form.visit_date} onChange={e => setForm({...form, visit_date: e.target.value})} className={inputClass} /></div>
                <div><label className={labelClass}>Engineer</label>
                  <select value={form.engineer_id} onChange={e => setForm({...form, engineer_id: e.target.value})} className={inputClass}>
                    <option value="">— Pilih —</option>
                    {engineers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
                <div><label className={labelClass}>Status</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className={inputClass}>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Client */}
            <div>
              <h4 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3">Data Client</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className={labelClass}>Nama Client</label><input value={form.client_name} onChange={e => setForm({...form, client_name: e.target.value})} className={inputClass} /></div>
                <div><label className={labelClass}>Perusahaan</label><input value={form.client_company} onChange={e => setForm({...form, client_company: e.target.value})} className={inputClass} /></div>
                <div><label className={labelClass}>Contact Person</label><input value={form.contact_person} onChange={e => setForm({...form, contact_person: e.target.value})} className={inputClass} /></div>
                <div><label className={labelClass}>No. Telepon</label><input value={form.contact_phone} onChange={e => setForm({...form, contact_phone: e.target.value})} className={inputClass} /></div>
                <div className="sm:col-span-2"><label className={labelClass}>Lokasi / Site</label><input value={form.site_location} onChange={e => setForm({...form, site_location: e.target.value})} className={inputClass} /></div>
                <div className="sm:col-span-2"><label className={labelClass}>Alamat</label><textarea value={form.client_address} onChange={e => setForm({...form, client_address: e.target.value})} rows={2} className={inputClass + " resize-none"} /></div>
              </div>
            </div>

            {/* Equipment */}
            <div>
              <h4 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3">Data Peralatan</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className={labelClass}>Tag / ID Alat</label><input value={form.equipment_tag} onChange={e => setForm({...form, equipment_tag: e.target.value})} className={inputClass} /></div>
                <div><label className={labelClass}>Model / Type</label><input value={form.equipment_model} onChange={e => setForm({...form, equipment_model: e.target.value})} className={inputClass} /></div>
                <div><label className={labelClass}>Serial Number</label><input value={form.serial_number} onChange={e => setForm({...form, serial_number: e.target.value})} className={inputClass} /></div>
              </div>
            </div>

            {/* Work */}
            <div>
              <h4 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3">Pekerjaan</h4>
              <div className="space-y-3">
                <div><label className={labelClass}>Deskripsi Pekerjaan</label><textarea value={form.job_description} onChange={e => setForm({...form, job_description: e.target.value})} rows={3} className={inputClass + " resize-none"} /></div>
                <div><label className={labelClass}>Pekerjaan yang Dilakukan</label><textarea value={form.work_performed} onChange={e => setForm({...form, work_performed: e.target.value})} rows={4} className={inputClass + " resize-none"} /></div>
                <div><label className={labelClass}>Temuan / Findings</label><textarea value={form.findings} onChange={e => setForm({...form, findings: e.target.value})} rows={3} className={inputClass + " resize-none"} /></div>
                <div><label className={labelClass}>Rekomendasi</label><textarea value={form.recommendations} onChange={e => setForm({...form, recommendations: e.target.value})} rows={2} className={inputClass + " resize-none"} /></div>
                <div><label className={labelClass}>Material / Parts Digunakan</label><textarea value={form.materials_used} onChange={e => setForm({...form, materials_used: e.target.value})} rows={2} className={inputClass + " resize-none"} /></div>
              </div>
            </div>

            {/* Customer Signature */}
            <div>
              <h4 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3">Tanda Tangan Customer</h4>
              <SignaturePad
                label="Tanda Tangan Customer / Perwakilan"
                value={form.customer_signature}
                onChange={v => setForm({ ...form, customer_signature: v })}
              />
              <p className="text-xs text-gray-400 mt-2">💡 Tanda tangan engineer mengikuti data yang terdaftar di menu Engineers</p>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100 mt-5">
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
              <InfoRow label="Nama Client" value={report.client_name} />
              <InfoRow label="Contact Person" value={report.contact_person} />
              <InfoRow label="Telepon" value={report.contact_phone} />
              <InfoRow label="Lokasi / Site" value={report.site_location} />
              <InfoRow label="Alamat" value={report.client_address} />
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3">⚙ Data Peralatan</h3>
              <InfoRow label="Tag / ID Alat" value={report.equipment_tag} />
              <InfoRow label="Model / Type" value={report.equipment_model} />
              <InfoRow label="Serial Number" value={report.serial_number} />
              <InfoRow label="Engineer" value={report.engineer_name} />
            </div>
          </div>

          {[
            ["📋 Deskripsi Pekerjaan", report.job_description],
            ["🔧 Pekerjaan yang Dilakukan", report.work_performed],
            ["🔍 Temuan / Findings", report.findings],
            ["💡 Rekomendasi", report.recommendations],
            ["🔩 Material / Parts Digunakan", report.materials_used],
          ].map(([title, content]) => content ? (
            <div key={title} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
              <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3">{title}</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{content}</p>
            </div>
          ) : null)}

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

      {/* Bottom bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 justify-between items-center">
        <button onClick={() => setDeleteDialog(true)} className="flex items-center gap-2 px-4 py-2 text-red-500 border border-red-200 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors">🗑 Hapus</button>
        <div className="flex gap-2">
          <button onClick={previewPDF} disabled={previewLoading} className="flex items-center gap-2 px-5 py-2.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-sm font-semibold hover:bg-blue-100 transition-colors disabled:opacity-60">
            {previewLoading ? "Loading…" : "👁 Preview PDF"}
          </button>
          <button onClick={downloadPDF} disabled={pdfLoading} className="flex items-center gap-2 px-5 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-semibold hover:bg-[#1E5CC6] transition-colors disabled:opacity-60">
            {pdfLoading ? "Generating…" : "⬇ Download PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
