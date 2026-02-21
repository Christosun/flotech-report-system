import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../services/api";
import toast from "react-hot-toast";

const STATUS_CONFIG = {
  draft:     { label: "Draft",     bg: "bg-gray-100",   text: "text-gray-600" },
  sent:      { label: "Sent",      bg: "bg-blue-100",   text: "text-blue-700" },
  followup:  { label: "Follow Up", bg: "bg-yellow-100", text: "text-yellow-700" },
  won:       { label: "Won",       bg: "bg-green-100",  text: "text-green-700" },
  lost:      { label: "Lost",      bg: "bg-red-100",    text: "text-red-600" },
  cancelled: { label: "Cancelled", bg: "bg-gray-200",   text: "text-gray-500" },
};
const CATEGORY_OPTIONS = ["Flow Measurement","Level Measurement","Pressure Measurement","Energy Measurement","Process Analyzers","Calibration Services","Commissioning Services","Maintenance Services","Spare Parts","Other"];
const EMPTY_ITEM = { description: "", brand: "", model: "", qty: 1, unit: "pcs", unit_price: 0, discount: 0, remarks: "" };

function formatRupiah(val) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(parseFloat(val) || 0);
}

/* ─── Delete Dialog ─────────────────────────────────────────────── */
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
          <button onClick={onCancel} disabled={loading} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Batal</button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── PDF Preview Modal ─────────────────────────────────────────── */
function PDFPreviewModal({ url, quotationNumber, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
      <div className="flex items-center justify-between px-5 py-3 bg-[#0B3D91]">
        <span className="text-white font-bold text-sm">📄 {quotationNumber} — Preview</span>
        <div className="flex items-center gap-2">
          <a href={url} download className="px-4 py-1.5 bg-white text-[#0B3D91] rounded-lg text-xs font-bold hover:bg-blue-50 flex items-center gap-1.5 transition-colors">⬇ Download</a>
          <button onClick={onClose} className="text-white/70 hover:text-white text-xl px-2 transition-colors">✕</button>
        </div>
      </div>
      <iframe src={url} className="flex-1 w-full" title="PDF Preview" style={{ border: "none" }} />
    </div>
  );
}

export default function QuotationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [q, setQ] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchQ = useCallback(async () => {
    try {
      const res = await API.get(`/quotation/detail/${id}`);
      setQ(res.data);
    } catch { toast.error("Gagal memuat quotation"); }
  }, [id]);

  useEffect(() => { fetchQ(); }, [fetchQ]);

  const openEdit = () => {
    setForm({
      customer_name: q.customer_name || "",
      customer_company: q.customer_company || "",
      customer_email: q.customer_email || "",
      customer_phone: q.customer_phone || "",
      customer_address: q.customer_address || "",
      project_name: q.project_name || "",
      category: q.category || "",
      valid_until: q.valid_until || "",
      currency: q.currency || "IDR",
      notes: q.notes || "",
      terms: q.terms || "",
      items: q.items ? JSON.parse(JSON.stringify(q.items)) : [{ ...EMPTY_ITEM }],
    });
    setEditMode(true);
  };

  const handleSave = async () => {
    if (!form.customer_name || !form.customer_company) { toast.error("Nama dan perusahaan customer wajib diisi"); return; }
    setSaving(true);
    try {
      const total = form.items.reduce((s, item) => {
        const p = parseFloat(item.unit_price) || 0;
        const q2 = parseFloat(item.qty) || 0;
        const d = parseFloat(item.discount) || 0;
        return s + p * q2 * (1 - d / 100);
      }, 0);
      await API.put(`/quotation/update/${id}`, { ...form, total_amount: total });
      toast.success("Quotation diperbarui! ✅");
      setEditMode(false);
      fetchQ();
    } catch (err) { toast.error(err.response?.data?.error || "Gagal menyimpan"); }
    finally { setSaving(false); }
  };

  const updateStatus = async (status) => {
    try {
      await API.put(`/quotation/status/${id}`, { status });
      toast.success("Status diperbarui");
      fetchQ();
    } catch { toast.error("Gagal update status"); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await API.delete(`/quotation/delete/${id}`);
      toast.success("Quotation dihapus");
      navigate("/quotations");
    } catch { toast.error("Gagal menghapus"); setDeleting(false); setDeleteDialog(false); }
  };

  const previewPDF = async () => {
    setPreviewLoading(true);
    try {
      const res = await API.get(`/quotation/pdf/preview/${id}`, { responseType: "blob" });
      setPreviewUrl(URL.createObjectURL(new Blob([res.data], { type: "application/pdf" })));
    } catch { toast.error("Gagal memuat preview"); }
    finally { setPreviewLoading(false); }
  };

  const downloadPDF = async () => {
    setPdfLoading(true);
    try {
      const res = await API.get(`/quotation/pdf/${id}`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      Object.assign(document.createElement("a"), { href: url, download: `Quotation_${q.quotation_number}.pdf` }).click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast.success("PDF berhasil diunduh!");
    } catch { toast.error("Gagal generate PDF"); }
    finally { setPdfLoading(false); }
  };

  // Edit helpers
  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }));
  const removeItem = i => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateItem = (i, field, val) => setForm(f => ({ ...f, items: f.items.map((item, idx) => idx === i ? { ...item, [field]: val } : item) }));
  const calcSub = item => (parseFloat(item.unit_price) || 0) * (parseFloat(item.qty) || 0) * (1 - (parseFloat(item.discount) || 0) / 100);

  if (!q) return <div className="flex justify-center items-center h-40"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B3D91]" /></div>;

  const sc = STATUS_CONFIG[q.status] || STATUS_CONFIG.draft;
  const items = q.items || [];
  const subtotal = items.reduce((s, item) => s + (parseFloat(item.unit_price) || 0) * (parseFloat(item.qty) || 0) * (1 - (parseFloat(item.discount) || 0) / 100), 0);
  const ppn = subtotal * 0.11;
  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white";
  const labelClass = "block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5";

  return (
    <div className="max-w-4xl mx-auto">
      {previewUrl && <PDFPreviewModal url={previewUrl} quotationNumber={q.quotation_number} onClose={() => { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }} />}
      {deleteDialog && <DeleteDialog title="Hapus Quotation?" description={`"${q.quotation_number}" akan dihapus permanen.`} onConfirm={handleDelete} onCancel={() => setDeleteDialog(false)} loading={deleting} />}

      <button onClick={() => navigate("/quotations")} className="flex items-center gap-2 text-sm text-gray-400 hover:text-[#0B3D91] mb-5 transition-colors">← Kembali</button>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${sc.bg} ${sc.text}`}>{sc.label}</span>
            </div>
            <h1 className="text-2xl font-black text-[#0B3D91]">{q.quotation_number}</h1>
            <p className="text-gray-500 text-sm mt-1">{q.customer_company} • {q.customer_name}</p>
            {q.project_name && <p className="text-gray-400 text-xs mt-0.5">Project: {q.project_name}</p>}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <select value={q.status} onChange={e => updateStatus(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none bg-white">
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            {!editMode && (
              <button onClick={openEdit} className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-sm font-semibold hover:bg-amber-100 transition-colors">
                ✏ Edit
              </button>
            )}
            <button onClick={previewPDF} disabled={previewLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-sm font-semibold hover:bg-blue-100 transition-colors disabled:opacity-60">
              {previewLoading ? <><div className="w-3.5 h-3.5 border-2 border-blue-700/30 border-t-blue-700 rounded-full animate-spin" /> Loading…</> : "👁 Preview"}
            </button>
            <button onClick={downloadPDF} disabled={pdfLoading}
              className="flex items-center gap-2 px-4 py-2 bg-[#0B3D91] text-white rounded-xl text-sm font-semibold hover:bg-[#1E5CC6] transition-colors disabled:opacity-60">
              {pdfLoading ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> …</> : "⬇ PDF"}
            </button>
            <button onClick={() => setDeleteDialog(true)} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors">🗑</button>
          </div>
        </div>
      </div>

      {/* ── EDIT MODE ──────────────────────────────────────────── */}
      {editMode && form && (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-6 mb-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-amber-700 uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-4 bg-amber-400 rounded-full" /> Edit Mode
            </h3>
            <button onClick={() => setEditMode(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
          </div>

          {/* Customer Info */}
          <div className="mb-5">
            <h4 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3">Informasi Customer</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className={labelClass}>Nama Customer</label><input value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass}>Perusahaan</label><input value={form.customer_company} onChange={e => setForm({ ...form, customer_company: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass}>Email</label><input type="email" value={form.customer_email} onChange={e => setForm({ ...form, customer_email: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass}>Telepon</label><input value={form.customer_phone} onChange={e => setForm({ ...form, customer_phone: e.target.value })} className={inputClass} /></div>
              <div className="sm:col-span-2"><label className={labelClass}>Alamat</label><textarea value={form.customer_address} onChange={e => setForm({ ...form, customer_address: e.target.value })} rows={2} className={inputClass + " resize-none"} /></div>
            </div>
          </div>

          {/* Project Info */}
          <div className="mb-5">
            <h4 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3">Detail Quotation</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className={labelClass}>Project Name</label><input value={form.project_name} onChange={e => setForm({ ...form, project_name: e.target.value })} className={inputClass} /></div>
              <div>
                <label className={labelClass}>Kategori</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={inputClass}>
                  <option value="">— Pilih —</option>
                  {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><label className={labelClass}>Berlaku Hingga</label><input type="date" value={form.valid_until} onChange={e => setForm({ ...form, valid_until: e.target.value })} className={inputClass} /></div>
              <div>
                <label className={labelClass}>Mata Uang</label>
                <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} className={inputClass}>
                  <option value="IDR">IDR</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="SGD">SGD</option>
                </select>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider">Item / Produk</h4>
              <button onClick={addItem} className="px-3 py-1.5 bg-[#0B3D91] text-white rounded-lg text-xs font-semibold hover:bg-[#1E5CC6]">+ Tambah Item</button>
            </div>
            <div className="space-y-3">
              {form.items.map((item, i) => (
                <div key={i} className="border border-gray-100 rounded-xl p-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-400">Item #{i + 1}</span>
                    {form.items.length > 1 && (
                      <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 text-xs">Hapus</button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="sm:col-span-2"><input value={item.description} onChange={e => updateItem(i, "description", e.target.value)} placeholder="Deskripsi produk / jasa" className={inputClass} /></div>
                    <div><input value={item.brand} onChange={e => updateItem(i, "brand", e.target.value)} placeholder="Brand" className={inputClass} /></div>
                    <div><input value={item.model} onChange={e => updateItem(i, "model", e.target.value)} placeholder="Model" className={inputClass} /></div>
                    <div><input value={item.remarks} onChange={e => updateItem(i, "remarks", e.target.value)} placeholder="Keterangan" className={inputClass} /></div>
                    <div className="grid grid-cols-3 gap-2">
                      <input type="number" value={item.qty} onChange={e => updateItem(i, "qty", e.target.value)} placeholder="Qty" className={inputClass} />
                      <input value={item.unit} onChange={e => updateItem(i, "unit", e.target.value)} placeholder="Unit" className={inputClass} />
                      <input type="number" value={item.discount} onChange={e => updateItem(i, "discount", e.target.value)} placeholder="Disc%" className={inputClass} />
                    </div>
                    <div>
                      <input type="number" value={item.unit_price} onChange={e => updateItem(i, "unit_price", e.target.value)} placeholder="Harga Satuan" className={inputClass} />
                      <p className="text-xs text-[#0B3D91] font-semibold mt-1 text-right">= {formatRupiah(calcSub(item))}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Running total */}
            <div className="mt-3 bg-[#0B3D91]/5 rounded-xl p-3 text-right">
              {(() => {
                const st = form.items.reduce((s, item) => s + calcSub(item), 0);
                return (
                  <>
                    <p className="text-xs text-gray-500">Subtotal: <span className="font-semibold text-gray-800">{formatRupiah(st)}</span></p>
                    <p className="text-xs text-gray-500">PPN 11%: <span className="font-semibold text-gray-600">{formatRupiah(st * 0.11)}</span></p>
                    <p className="text-sm font-black text-[#0B3D91]">Total: {formatRupiah(st * 1.11)}</p>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Notes & Terms */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            <div>
              <label className={labelClass}>Catatan</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={4} className={inputClass + " resize-none"} />
            </div>
            <div>
              <label className={labelClass}>Syarat & Ketentuan</label>
              <textarea value={form.terms} onChange={e => setForm({ ...form, terms: e.target.value })} rows={4} className={inputClass + " resize-none"} />
            </div>
          </div>

          <div className="flex gap-3 pt-3 border-t border-gray-100">
            <button onClick={() => setEditMode(false)} className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50">Batal</button>
            <button onClick={handleSave} disabled={saving}
              className="px-6 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-bold hover:bg-[#1E5CC6] disabled:opacity-60 flex items-center gap-2">
              {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Menyimpan…</> : "✓ Simpan Perubahan"}
            </button>
          </div>
        </div>
      )}

      {/* ── VIEW MODE ──────────────────────────────────────────── */}
      {/* Customer & Project Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3">🏢 Informasi Customer</h3>
          <div className="space-y-2">
            {[["Perusahaan", q.customer_company], ["Nama", q.customer_name], ["Email", q.customer_email], ["Telepon", q.customer_phone], ["Alamat", q.customer_address]]
              .map(([label, val]) => val ? (
                <div key={label} className="flex gap-3">
                  <span className="text-gray-400 text-xs w-20 flex-shrink-0 pt-0.5">{label}</span>
                  <span className="text-sm text-gray-800 font-medium break-words">{val}</span>
                </div>
              ) : null)}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3">📋 Detail Quotation</h3>
          <div className="space-y-2">
            {[["Project", q.project_name], ["Kategori", q.category], ["Mata Uang", q.currency],
              ["Berlaku s/d", q.valid_until ? new Date(q.valid_until).toLocaleDateString("id-ID") : null],
              ["Tanggal", q.created_at ? new Date(q.created_at).toLocaleDateString("id-ID") : null],
              ["Total", formatRupiah(q.total_amount)]]
              .map(([label, val]) => val ? (
                <div key={label} className="flex gap-3">
                  <span className="text-gray-400 text-xs w-20 flex-shrink-0 pt-0.5">{label}</span>
                  <span className="text-sm text-gray-800 font-medium">{val}</span>
                </div>
              ) : null)}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
        <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-4">📦 Item / Produk</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0B3D91] text-white text-xs">
                <th className="px-4 py-3 text-left rounded-tl-lg">No</th>
                <th className="px-4 py-3 text-left">Deskripsi</th>
                <th className="px-4 py-3 text-left">Brand / Model</th>
                <th className="px-4 py-3 text-center">Qty</th>
                <th className="px-4 py-3 text-right">Harga Satuan</th>
                <th className="px-4 py-3 text-center">Disc</th>
                <th className="px-4 py-3 text-right rounded-tr-lg">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((item, i) => {
                const p = parseFloat(item.unit_price) || 0, qty = parseFloat(item.qty) || 0, disc = parseFloat(item.discount) || 0;
                return (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{i + 1}</td>
                    <td className="px-4 py-3"><p className="font-semibold text-gray-800">{item.description}</p>{item.remarks && <p className="text-xs text-gray-400">{item.remarks}</p>}</td>
                    <td className="px-4 py-3">{item.brand && <p className="text-xs font-semibold text-gray-700">{item.brand}</p>}{item.model && <p className="text-xs text-gray-400">{item.model}</p>}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{qty} {item.unit}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{formatRupiah(p)}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{disc > 0 ? `${disc}%` : "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">{formatRupiah(p * qty * (1 - disc / 100))}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200"><td colSpan={5} /><td className="px-4 py-2 text-right text-xs font-bold text-gray-500 uppercase">Subtotal</td><td className="px-4 py-2 text-right font-semibold text-gray-800">{formatRupiah(subtotal)}</td></tr>
              <tr><td colSpan={5} /><td className="px-4 py-2 text-right text-xs font-bold text-gray-500 uppercase">PPN 11%</td><td className="px-4 py-2 text-right font-semibold text-gray-600">{formatRupiah(ppn)}</td></tr>
              <tr className="bg-[#0B3D91]"><td colSpan={5} /><td className="px-4 py-3 text-right text-sm font-bold text-white">Total + PPN</td><td className="px-4 py-3 text-right text-sm font-black text-white">{formatRupiah(subtotal + ppn)}</td></tr>
            </tfoot>
          </table>
        </div>
      </div>

      {(q.notes || q.terms) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          {q.notes && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"><h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3">📝 Catatan</h3><p className="text-sm text-gray-700 whitespace-pre-wrap">{q.notes}</p></div>}
          {q.terms && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"><h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3">📜 Syarat & Ketentuan</h3><p className="text-sm text-gray-700 whitespace-pre-wrap">{q.terms}</p></div>}
        </div>
      )}

      {/* Bottom bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 justify-between items-center">
        <button onClick={() => setDeleteDialog(true)} className="flex items-center gap-2 px-4 py-2 text-red-500 border border-red-200 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors">🗑 Hapus</button>
        <div className="flex gap-2">
          <button onClick={previewPDF} disabled={previewLoading} className="flex items-center gap-2 px-5 py-2.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-sm font-semibold hover:bg-blue-100 transition-colors disabled:opacity-60">
            {previewLoading ? "Loading…" : "👁 Preview PDF"}
          </button>
          <button onClick={downloadPDF} disabled={pdfLoading} className="flex items-center gap-2 px-5 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-semibold hover:bg-[#1E5CC6] transition-colors disabled:opacity-60">
            {pdfLoading ? "Generating…" : "⬇ Export PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}