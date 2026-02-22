import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../services/api";
import toast from "react-hot-toast";

const SURAT_TYPE = {
  serah: { label: "Serah Terima Barang", icon: "📤", bg: "bg-blue-100", text: "text-blue-700" },
  terima: { label: "Terima Barang", icon: "📥", bg: "bg-emerald-100", text: "text-emerald-700" },
};
const STATUS_CONFIG = {
  draft:  { label: "Draft",  bg: "bg-gray-100",    text: "text-gray-600" },
  final:  { label: "Final",  bg: "bg-blue-100",    text: "text-blue-700" },
  signed: { label: "Signed", bg: "bg-emerald-100", text: "text-emerald-700" },
};

function DeleteDialog({ title, description, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-gradient-to-br from-red-50 to-rose-100 px-6 pt-6 pb-4 text-center">
          <div className="w-14 h-14 bg-red-100 border-4 border-red-200 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </div>
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>
        <div className="px-6 py-4 flex gap-3">
          <button onClick={onCancel} disabled={loading} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Batal</button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 flex items-center justify-center gap-2 disabled:opacity-60">
            {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />} Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

function PDFModal({ url, name, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
      <div className="flex items-center justify-between px-5 py-3 bg-[#0B3D91]">
        <span className="text-white font-bold text-sm">📜 {name} — Preview</span>
        <div className="flex items-center gap-2">
          <a href={url} download className="px-4 py-1.5 bg-white text-[#0B3D91] rounded-lg text-xs font-bold hover:bg-blue-50">⬇ Download</a>
          <button onClick={onClose} className="text-white/70 hover:text-white text-xl px-2">✕</button>
        </div>
      </div>
      <iframe src={url} className="flex-1 w-full" style={{ border: "none" }} />
    </div>
  );
}

function SignaturePad({ label, value, onChange }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [showPad, setShowPad] = useState(false);
  const lastPos = useRef(null);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return { x: (touch.clientX - rect.left) * (canvas.width / rect.width), y: (touch.clientY - rect.top) * (canvas.height / rect.height) };
  };
  const startDraw = (e) => { e.preventDefault(); setDrawing(true); setHasDrawn(true); lastPos.current = getPos(e, canvasRef.current); };
  const draw = (e) => {
    if (!drawing) return; e.preventDefault();
    const canvas = canvasRef.current; const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.beginPath(); ctx.moveTo(lastPos.current.x, lastPos.current.y); ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#0B3D91"; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.stroke();
    lastPos.current = pos;
  };
  const endDraw = () => setDrawing(false);
  const clearPad = () => { canvasRef.current.getContext("2d").clearRect(0, 0, 440, 160); setHasDrawn(false); };
  const saveSig = () => {
    if (!hasDrawn) { toast.error("Buat tanda tangan dahulu"); return; }
    onChange(canvasRef.current.toDataURL("image/png")); setShowPad(false); toast.success("Tanda tangan disimpan ✅");
  };

  return (
    <div>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{label}</p>
      {value ? (
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
          <img src={value} alt="sig" className="h-16 mx-auto object-contain py-1" />
          <div className="border-t border-gray-100 px-3 py-2 flex gap-2">
            <button type="button" onClick={() => setShowPad(true)} className="text-xs text-[#0B3D91] hover:underline">✏ Ubah</button>
            <button type="button" onClick={() => onChange("")} className="text-xs text-red-500 hover:underline">× Hapus</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setShowPad(true)} className="w-full border-2 border-dashed border-gray-200 rounded-xl py-5 text-center hover:border-[#0B3D91] hover:bg-blue-50 transition-all">
          <p className="text-2xl mb-1">✍</p><p className="text-xs font-semibold text-gray-400">Klik untuk tanda tangan</p>
        </button>
      )}
      {showPad && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div><h3 className="font-bold text-gray-800">Tanda Tangan Digital</h3><p className="text-xs text-gray-400">{label}</p></div>
              <button type="button" onClick={() => setShowPad(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <div className="p-4">
              <div className="border-2 border-dashed border-gray-200 rounded-xl overflow-hidden bg-gray-50 relative">
                <canvas ref={canvasRef} width={440} height={160}
                  style={{ touchAction: "none", width: "100%", display: "block", cursor: "crosshair" }}
                  onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                  onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
                {!hasDrawn && <p className="absolute inset-0 flex items-center justify-center text-gray-300 text-sm pointer-events-none">Tanda tangan di sini...</p>}
              </div>
              <div className="flex gap-3 mt-3">
                <button type="button" onClick={clearPad} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600">Bersihkan</button>
                <button type="button" onClick={saveSig} className="flex-1 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-bold">✓ Simpan</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const EMPTY_ITEM = { no: 1, nama_barang: "", jumlah: 1, satuan: "unit", keterangan: "" };

export default function SuratDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [s, setS] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchS = useCallback(async () => {
    try { const res = await API.get(`/surat/detail/${id}`); setS(res.data); }
    catch { toast.error("Gagal memuat data"); }
  }, [id]);

  useEffect(() => { fetchS(); }, [fetchS]);

  const openEdit = () => {
    setForm({
      surat_number: s.surat_number || "", surat_type: s.surat_type || "serah",
      surat_date: s.surat_date || "", perihal: s.perihal || "",
      pihak_pertama_nama: s.pihak_pertama_nama || "", pihak_pertama_jabatan: s.pihak_pertama_jabatan || "",
      pihak_pertama_perusahaan: s.pihak_pertama_perusahaan || "", pihak_pertama_alamat: s.pihak_pertama_alamat || "",
      pihak_kedua_nama: s.pihak_kedua_nama || "", pihak_kedua_jabatan: s.pihak_kedua_jabatan || "",
      pihak_kedua_perusahaan: s.pihak_kedua_perusahaan || "", pihak_kedua_alamat: s.pihak_kedua_alamat || "",
      barang_items: s.barang_items ? JSON.parse(JSON.stringify(s.barang_items)) : [{ ...EMPTY_ITEM }],
      catatan: s.catatan || "", status: s.status || "draft",
      pihak_pertama_signature: s.pihak_pertama_signature || "",
      pihak_kedua_signature: s.pihak_kedua_signature || "",
    });
    setEditMode(true);
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const addItem = () => setForm(f => ({ ...f, barang_items: [...f.barang_items, { ...EMPTY_ITEM, no: f.barang_items.length + 1 }] }));
  const removeItem = i => setForm(f => ({ ...f, barang_items: f.barang_items.filter((_, idx) => idx !== i).map((item, idx) => ({ ...item, no: idx + 1 })) }));
  const updateItem = (i, field, val) => setForm(f => ({ ...f, barang_items: f.barang_items.map((item, idx) => idx === i ? { ...item, [field]: val } : item) }));

  const handleSave = async () => {
    setSaving(true);
    try { await API.put(`/surat/update/${id}`, form); toast.success("Berhasil disimpan ✅"); setEditMode(false); fetchS(); }
    catch { toast.error("Gagal menyimpan"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await API.delete(`/surat/delete/${id}`); toast.success("Surat dihapus"); navigate("/surat"); }
    catch { toast.error("Gagal menghapus"); setDeleting(false); setDeleteDialog(false); }
  };

  const previewPDF = async () => {
    setPreviewLoading(true);
    try { const res = await API.get(`/surat/pdf/preview/${id}`, { responseType: "blob" }); setPreviewUrl(URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }))); }
    catch { toast.error("Gagal memuat preview"); }
    finally { setPreviewLoading(false); }
  };

  const downloadPDF = async () => {
    setPdfLoading(true);
    try {
      const res = await API.get(`/surat/pdf/${id}`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      Object.assign(document.createElement("a"), { href: url, download: `Surat_${s.surat_number}.pdf` }).click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast.success("PDF diunduh!");
    } catch { toast.error("Gagal generate PDF"); }
    finally { setPdfLoading(false); }
  };

  if (!s) return <div className="flex justify-center items-center h-40"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B3D91]" /></div>;

  const tc = SURAT_TYPE[s.surat_type] || SURAT_TYPE.serah;
  const sc = STATUS_CONFIG[s.status] || STATUS_CONFIG.draft;
  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white transition-all";
  const labelClass = "block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5";

  return (
    <div className="max-w-4xl mx-auto">
      {previewUrl && <PDFModal url={previewUrl} name={s.surat_number} onClose={() => { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }} />}
      {deleteDialog && <DeleteDialog title="Hapus Surat?" description={`"${s.surat_number}" akan dihapus permanen.`} onConfirm={handleDelete} onCancel={() => setDeleteDialog(false)} loading={deleting} />}

      <button onClick={() => navigate("/surat")} className="flex items-center gap-2 text-sm text-gray-400 hover:text-[#0B3D91] mb-5 transition-colors">← Kembali</button>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${tc.bg} ${tc.text}`}>{tc.icon} {tc.label}</span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${sc.bg} ${sc.text}`}>{sc.label}</span>
            </div>
            <h1 className="text-2xl font-black text-[#0B3D91]">{s.surat_number}</h1>
            {s.perihal && <p className="text-gray-500 text-sm mt-1">Perihal: {s.perihal}</p>}
            {s.surat_date && <p className="text-gray-400 text-xs mt-0.5">📅 {new Date(s.surat_date).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            {!editMode && <button onClick={openEdit} className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-sm font-semibold hover:bg-amber-100 transition-colors">✏ Edit</button>}
            <button onClick={previewPDF} disabled={previewLoading} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-sm font-semibold hover:bg-blue-100 disabled:opacity-60">
              {previewLoading ? <div className="w-3.5 h-3.5 border-2 border-blue-700/30 border-t-blue-700 rounded-full animate-spin" /> : "👁"} Preview
            </button>
            <button onClick={downloadPDF} disabled={pdfLoading} className="flex items-center gap-2 px-4 py-2 bg-[#0B3D91] text-white rounded-xl text-sm font-semibold hover:bg-[#1E5CC6] disabled:opacity-60">
              {pdfLoading ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "⬇"} PDF
            </button>
            <button onClick={() => setDeleteDialog(true)} className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-semibold hover:bg-red-100">🗑</button>
          </div>
        </div>
      </div>

      {/* ── EDIT MODE ───── */}
      {editMode && (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-6 mb-4">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-amber-700 uppercase tracking-wider flex items-center gap-2"><span className="w-1.5 h-4 bg-amber-400 rounded-full" /> Edit Mode</h3>
            <button onClick={() => setEditMode(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
          </div>

          {/* Info */}
          <div className="mb-4">
            <h4 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3">Informasi Surat</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className={labelClass}>Tipe Surat</label>
                <select value={form.surat_type} onChange={e => set("surat_type", e.target.value)} className={inputClass}>
                  {Object.entries(SURAT_TYPE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div><label className={labelClass}>Nomor Surat</label><input value={form.surat_number} onChange={e => set("surat_number", e.target.value)} className={inputClass} /></div>
              <div><label className={labelClass}>Tanggal</label><input type="date" value={form.surat_date} onChange={e => set("surat_date", e.target.value)} className={inputClass} /></div>
              <div><label className={labelClass}>Status</label>
                <select value={form.status} onChange={e => set("status", e.target.value)} className={inputClass}>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2"><label className={labelClass}>Perihal</label><input value={form.perihal} onChange={e => set("perihal", e.target.value)} className={inputClass} /></div>
            </div>
          </div>

          {/* Pihak */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <h4 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3">Pihak Pertama</h4>
              <div className="space-y-2">
                <input value={form.pihak_pertama_nama} onChange={e => set("pihak_pertama_nama", e.target.value)} placeholder="Nama" className={inputClass} />
                <input value={form.pihak_pertama_jabatan} onChange={e => set("pihak_pertama_jabatan", e.target.value)} placeholder="Jabatan" className={inputClass} />
                <input value={form.pihak_pertama_perusahaan} onChange={e => set("pihak_pertama_perusahaan", e.target.value)} placeholder="Perusahaan" className={inputClass} />
                <textarea value={form.pihak_pertama_alamat} onChange={e => set("pihak_pertama_alamat", e.target.value)} placeholder="Alamat" rows={2} className={inputClass + " resize-none"} />
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-3">Pihak Kedua</h4>
              <div className="space-y-2">
                <input value={form.pihak_kedua_nama} onChange={e => set("pihak_kedua_nama", e.target.value)} placeholder="Nama" className={inputClass} />
                <input value={form.pihak_kedua_jabatan} onChange={e => set("pihak_kedua_jabatan", e.target.value)} placeholder="Jabatan" className={inputClass} />
                <input value={form.pihak_kedua_perusahaan} onChange={e => set("pihak_kedua_perusahaan", e.target.value)} placeholder="Perusahaan" className={inputClass} />
                <textarea value={form.pihak_kedua_alamat} onChange={e => set("pihak_kedua_alamat", e.target.value)} placeholder="Alamat" rows={2} className={inputClass + " resize-none"} />
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider">Daftar Barang</h4>
              <button type="button" onClick={addItem} className="px-3 py-1.5 bg-[#0B3D91] text-white rounded-lg text-xs font-semibold">+ Tambah</button>
            </div>
            <div className="space-y-2">
              {form.barang_items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 bg-gray-50 rounded-xl p-2.5 items-center">
                  <span className="col-span-1 text-center text-xs font-bold text-gray-400">{item.no}</span>
                  <input className={"col-span-4 " + inputClass} value={item.nama_barang} onChange={e => updateItem(i, "nama_barang", e.target.value)} placeholder="Nama barang" />
                  <input className={"col-span-2 " + inputClass} type="number" value={item.jumlah} onChange={e => updateItem(i, "jumlah", e.target.value)} />
                  <input className={"col-span-2 " + inputClass} value={item.satuan} onChange={e => updateItem(i, "satuan", e.target.value)} placeholder="unit" />
                  <input className={"col-span-2 " + inputClass} value={item.keterangan} onChange={e => updateItem(i, "keterangan", e.target.value)} placeholder="Keterangan" />
                  <div className="col-span-1 flex justify-center">
                    {form.barang_items.length > 1 && <button type="button" onClick={() => removeItem(i)} className="w-7 h-7 bg-red-50 text-red-500 rounded-lg text-sm">×</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Catatan */}
          <div className="mb-4">
            <h4 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-2">Catatan</h4>
            <textarea value={form.catatan} onChange={e => set("catatan", e.target.value)} rows={2} className={inputClass + " resize-none"} />
          </div>

          {/* Signatures */}
          <div className="mb-4">
            <h4 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3">Tanda Tangan</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SignaturePad label="Tanda Tangan Pihak Pertama" value={form.pihak_pertama_signature} onChange={v => set("pihak_pertama_signature", v)} />
              <SignaturePad label="Tanda Tangan Pihak Kedua" value={form.pihak_kedua_signature} onChange={v => set("pihak_kedua_signature", v)} />
            </div>
          </div>

          <div className="flex gap-3 pt-3 border-t border-gray-100">
            <button onClick={() => setEditMode(false)} className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50">Batal</button>
            <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-bold hover:bg-[#1E5CC6] disabled:opacity-60 flex items-center gap-2">
              {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Menyimpan…</> : "✓ Simpan Perubahan"}
            </button>
          </div>
        </div>
      )}

      {/* ── VIEW MODE ── */}
      {!editMode && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {[
              { title: "🏢 Pihak Pertama (Yang Menyerahkan)", nama: s.pihak_pertama_nama, jabatan: s.pihak_pertama_jabatan, perusahaan: s.pihak_pertama_perusahaan, alamat: s.pihak_pertama_alamat },
              { title: "🏢 Pihak Kedua (Yang Menerima)", nama: s.pihak_kedua_nama, jabatan: s.pihak_kedua_jabatan, perusahaan: s.pihak_kedua_perusahaan, alamat: s.pihak_kedua_alamat },
            ].map(({ title, ...info }) => (
              <div key={title} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3">{title}</h3>
                {Object.entries({ Nama: info.nama, Jabatan: info.jabatan, Perusahaan: info.perusahaan, Alamat: info.alamat })
                  .filter(([, v]) => v).map(([label, val]) => (
                    <div key={label} className="flex gap-3 py-1.5 border-b border-gray-50 last:border-0">
                      <span className="text-xs text-gray-400 w-24 flex-shrink-0 pt-0.5">{label}</span>
                      <span className="text-sm text-gray-800 font-medium">{val}</span>
                    </div>
                  ))}
              </div>
            ))}
          </div>

          {/* Items table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
            <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-4">📦 Daftar Barang</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#0B3D91] text-white text-xs">
                    {["No", "Nama Barang", "Qty", "Satuan", "Keterangan"].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left first:rounded-tl-lg last:rounded-tr-lg">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(s.barang_items || []).map((item, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-4 py-2.5 text-gray-400 text-xs font-mono">{item.no}</td>
                      <td className="px-4 py-2.5 font-semibold text-gray-800">{item.nama_barang}</td>
                      <td className="px-4 py-2.5 text-gray-700">{item.jumlah}</td>
                      <td className="px-4 py-2.5 text-gray-500">{item.satuan}</td>
                      <td className="px-4 py-2.5 text-gray-400">{item.keterangan || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {s.catatan && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
              <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3">📝 Catatan</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{s.catatan}</p>
            </div>
          )}

          {/* Signatures */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
            <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-4">✍ Tanda Tangan</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                { label: "Pihak Pertama", sig: s.pihak_pertama_signature, nama: s.pihak_pertama_nama, jabatan: s.pihak_pertama_jabatan, perusahaan: s.pihak_pertama_perusahaan },
                { label: "Pihak Kedua", sig: s.pihak_kedua_signature, nama: s.pihak_kedua_nama, jabatan: s.pihak_kedua_jabatan, perusahaan: s.pihak_kedua_perusahaan },
              ].map(({ label, sig, nama, jabatan, perusahaan }) => (
                <div key={label} className="text-center">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">{label}</p>
                  {sig ? (
                    <div className="border border-gray-200 rounded-xl bg-gray-50 p-3">
                      <img src={sig} alt="signature" className="h-16 mx-auto object-contain" />
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-200 rounded-xl py-6">
                      <p className="text-gray-300 text-sm">Belum ada tanda tangan</p>
                      <button onClick={openEdit} className="mt-1 text-xs text-[#0B3D91] hover:underline">Tambah</button>
                    </div>
                  )}
                  <p className="text-xs font-semibold text-gray-600 mt-2">{nama || "—"}</p>
                  {jabatan && <p className="text-xs text-gray-400">{jabatan}</p>}
                  {perusahaan && <p className="text-xs text-gray-400">{perusahaan}</p>}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 justify-between items-center">
        <button onClick={() => setDeleteDialog(true)} className="flex items-center gap-2 px-4 py-2 text-red-500 border border-red-200 rounded-xl text-sm font-semibold hover:bg-red-50">🗑 Hapus</button>
        <div className="flex gap-2">
          <button onClick={previewPDF} disabled={previewLoading} className="flex items-center gap-2 px-5 py-2.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-sm font-semibold hover:bg-blue-100 disabled:opacity-60">{previewLoading ? "Loading…" : "👁 Preview PDF"}</button>
          <button onClick={downloadPDF} disabled={pdfLoading} className="flex items-center gap-2 px-5 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-semibold hover:bg-[#1E5CC6] disabled:opacity-60">{pdfLoading ? "Generating…" : "⬇ Download PDF"}</button>
        </div>
      </div>
    </div>
  );
}
