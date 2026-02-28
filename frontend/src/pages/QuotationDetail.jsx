import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import API from "../services/api";

const STATUS_CONFIG = {
  draft:    { label: "Draft",     color: "bg-gray-100 text-gray-600",     dot: "bg-gray-400"     },
  sent:     { label: "Sent",      color: "bg-blue-100 text-blue-700",     dot: "bg-blue-500"     },
  followup: { label: "Follow Up", color: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-500"   },
  won:      { label: "Won",       color: "bg-emerald-100 text-emerald-700",dot:"bg-emerald-500"  },
  lost:     { label: "Lost",      color: "bg-red-100 text-red-600",       dot: "bg-red-400"      },
  cancel:   { label: "Cancelled", color: "bg-gray-100 text-gray-400",     dot: "bg-gray-300"     },
};

const EMPTY_ITEM = { description: "", brand: "", model: "", unit: "Unit", qty: 1, unit_price: 0, discount: 0, remarks: "" };

function formatRupiah(v, currency = "IDR") {
  if (!v && v !== 0) return "-";
  if (currency === "IDR") return "Rp " + Number(v).toLocaleString("id-ID");
  return `${currency} ${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

function formatDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

function formatDateTime(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

/* ─── PDF Preview Modal ────────────────────────────────────────────────────── */
function PDFPreviewModal({ url, quotationNumber, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
      <div className="flex items-center justify-between px-5 py-3 bg-[#0B3D91]">
        <span className="text-white font-bold text-sm">📄 {quotationNumber} — Preview PDF</span>
        <div className="flex items-center gap-2">
          <a href={url} download className="px-4 py-1.5 bg-white text-[#0B3D91] rounded-lg text-xs font-bold hover:bg-blue-50 flex items-center gap-1.5 transition-colors">⬇ Download</a>
          <button onClick={onClose} className="text-white/70 hover:text-white text-xl px-2 transition-colors">✕</button>
        </div>
      </div>
      <iframe src={url} className="flex-1 w-full" title="PDF Preview" style={{ border: "none" }} />
    </div>
  );
}

/* ─── Delete Dialog ─────────────────────────────────────────────────────────── */
function DeleteDialog({ title, message, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
        <div className="text-3xl mb-3 text-center">⚠️</div>
        <h3 className="text-lg font-bold text-gray-800 text-center mb-2">{title}</h3>
        <p className="text-sm text-gray-500 text-center mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Batal</button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-60">
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────────── */
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
      sales_person: q.sales_person || "",
      ref_no: q.ref_no || "",
      shipment_terms: q.shipment_terms || "Franco Jakarta",
      delivery: q.delivery || "10-12 Weeks ARO",
      payment_terms: q.payment_terms || "Cash Advance",
    });
    setEditMode(true);
  };

  const handleSave = async () => {
    if (!form.customer_name || !form.customer_company) { toast.error("Nama dan perusahaan customer wajib diisi"); return; }
    setSaving(true);
    try {
      const total = form.items.reduce((s, item) => {
        const p = parseFloat(item.unit_price) || 0;
        const qty = parseFloat(item.qty) || 0;
        const d = parseFloat(item.discount) || 0;
        return s + p * qty * (1 - d / 100);
      }, 0);
      const res = await API.put(`/quotation/update/${id}`, { ...form, total_amount: total });
      toast.success(`Quotation diperbarui! ${res.data.revision > 0 ? `(Rev.${res.data.revision})` : ""} ✅`);
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

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }));
  const removeItem = i => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateItem = (i, field, val) => setForm(f => ({ ...f, items: f.items.map((item, idx) => idx === i ? { ...item, [field]: val } : item) }));
  const calcSub = item => (parseFloat(item.unit_price) || 0) * (parseFloat(item.qty) || 0) * (1 - (parseFloat(item.discount) || 0) / 100);

  if (!q) return (
    <div className="flex justify-center items-center h-40">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B3D91]" />
    </div>
  );

  const sc = STATUS_CONFIG[q.status] || STATUS_CONFIG.draft;
  const items = q.items || [];
  const subtotal = items.reduce((s, item) => s + (parseFloat(item.unit_price) || 0) * (parseFloat(item.qty) || 0) * (1 - (parseFloat(item.discount) || 0) / 100), 0);
  const ppn = subtotal * 0.11;
  const total_with_tax = subtotal + ppn;

  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white";
  const labelClass = "block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5";

  return (
    <div className="max-w-4xl mx-auto">
      {previewUrl && (
        <PDFPreviewModal url={previewUrl} quotationNumber={q.quotation_number}
          onClose={() => { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }} />
      )}
      {deleteDialog && (
        <DeleteDialog title="Hapus Quotation?"
          message={`Quotation ${q.quotation_number} akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.`}
          onConfirm={handleDelete} onCancel={() => setDeleteDialog(false)} loading={deleting} />
      )}

      {/* Back + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <button onClick={() => navigate("/quotations")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#0B3D91] transition-colors font-medium">
          ← Kembali ke Daftar
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {!editMode && (
            <>
              <button onClick={previewPDF} disabled={previewLoading}
                className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-60">
                {previewLoading ? <div className="w-3 h-3 border-2 border-gray-300 border-t-[#0B3D91] rounded-full animate-spin" /> : "👁"}
                Preview PDF
              </button>
              <button onClick={downloadPDF} disabled={pdfLoading}
                className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-60">
                {pdfLoading ? <div className="w-3 h-3 border-2 border-gray-300 border-t-[#0B3D91] rounded-full animate-spin" /> : "⬇"}
                Download PDF
              </button>
              <button onClick={openEdit}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#0B3D91] text-white rounded-xl text-xs font-semibold hover:bg-[#1E5CC6] transition-colors">
                ✏️ Edit
              </button>
              <button onClick={() => setDeleteDialog(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition-colors">
                🗑
              </button>
            </>
          )}
          {editMode && (
            <>
              <button onClick={() => setEditMode(false)}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-colors">
                Batal
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2 bg-[#0B3D91] text-white rounded-xl text-xs font-bold hover:bg-[#1E5CC6] transition-colors disabled:opacity-60">
                {saving ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                {saving ? "Menyimpan..." : "💾 Simpan Perubahan"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* View Mode */}
      {!editMode && (
        <div className="space-y-5">
          {/* Header Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Blue top bar */}
            <div className="bg-gradient-to-r from-[#0B3D91] to-[#1E5CC6] px-6 py-5 text-white">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-xl font-black font-mono tracking-wide">{q.quotation_number}</h1>
                    {q.revision > 0 && (
                      <span className="px-2 py-0.5 bg-orange-400 text-white text-xs font-bold rounded-full">Rev.{q.revision}</span>
                    )}
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${sc.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />{sc.label}
                    </span>
                  </div>
                  <p className="text-blue-200 text-sm mt-1">{q.project_name || "No project name"}</p>
                  <div className="flex flex-wrap gap-4 mt-3 text-xs text-blue-100">
                    <span>📅 Created: {formatDate(q.created_at)}</span>
                    {q.updated_at && q.updated_at !== q.created_at && <span>✏️ Modified: {formatDateTime(q.updated_at)}</span>}
                    {q.valid_until && <span>⏳ Valid: {formatDate(q.valid_until)}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-blue-200 text-xs">Total Nilai</p>
                  <p className="text-2xl font-black">{formatRupiah(subtotal, q.currency)}</p>
                  <p className="text-blue-200 text-xs mt-1">+PPN: {formatRupiah(ppn, q.currency)}</p>
                </div>
              </div>
            </div>

            {/* Info grid */}
            <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-5">
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Customer</p>
                <p className="font-bold text-gray-800 text-sm">{q.customer_company || "-"}</p>
                <p className="text-xs text-gray-500">{q.customer_name}</p>
                {q.customer_email && <p className="text-xs text-gray-400">{q.customer_email}</p>}
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Sales Person</p>
                <p className="font-semibold text-gray-700 text-sm">{q.sales_person || "-"}</p>
                {q.ref_no && <p className="text-xs text-gray-400">Ref: {q.ref_no}</p>}
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Payment Terms</p>
                <p className="font-semibold text-gray-700 text-sm">{q.payment_terms || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Delivery</p>
                <p className="font-semibold text-gray-700 text-sm">{q.delivery || "-"}</p>
                {q.shipment_terms && <p className="text-xs text-gray-400">{q.shipment_terms}</p>}
              </div>
            </div>
          </div>

          {/* Status change */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Update Status</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <button key={k} onClick={() => updateStatus(k)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${q.status === k ? `${v.color} border-transparent shadow-sm` : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Items table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <h2 className="font-bold text-gray-800 text-sm">📦 Item & Harga</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#0B3D91]/5">
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">No</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Deskripsi</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">UOM</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Harga Satuan</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Disc%</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map((item, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                      <td className="px-4 py-3 text-xs text-gray-500">{i + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-800 text-xs">{item.description}</p>
                        {(item.brand || item.model) && (
                          <p className="text-xs text-gray-400">{[item.brand, item.model && `P/N: ${item.model}`].filter(Boolean).join(" | ")}</p>
                        )}
                        {item.remarks && <p className="text-xs text-gray-400 italic mt-0.5">{item.remarks}</p>}
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-gray-600">{item.unit || "Unit"}</td>
                      <td className="px-4 py-3 text-center text-xs font-semibold text-gray-800">{item.qty}</td>
                      <td className="px-4 py-3 text-right text-xs text-gray-700">{formatRupiah(item.unit_price, q.currency)}</td>
                      <td className="px-4 py-3 text-right text-xs text-gray-500">{item.discount ? `${item.discount}%` : "-"}</td>
                      <td className="px-4 py-3 text-right text-xs font-bold text-gray-800">{formatRupiah(calcSub(item), q.currency)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200">
                    <td colSpan="6" className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Subtotal (excl. PPN)</td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-gray-800">{formatRupiah(subtotal, q.currency)}</td>
                  </tr>
                  <tr>
                    <td colSpan="6" className="px-4 py-1.5 text-right text-xs text-gray-400">PPN 11%</td>
                    <td className="px-4 py-1.5 text-right text-xs text-gray-500">{formatRupiah(ppn, q.currency)}</td>
                  </tr>
                  <tr className="bg-[#0B3D91]">
                    <td colSpan="6" className="px-4 py-3 text-right text-sm font-bold text-white">TOTAL (incl. PPN)</td>
                    <td className="px-4 py-3 text-right text-sm font-black text-white">{formatRupiah(total_with_tax, q.currency)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Terms & Notes */}
          {(q.notes || q.terms) && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-bold text-gray-800 text-sm mb-4">📋 Terms & Notes</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {q.notes && (
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Catatan</p>
                    <p className="text-sm text-gray-600 whitespace-pre-line">{q.notes}</p>
                  </div>
                )}
                {q.terms && (
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Terms Tambahan</p>
                    <p className="text-sm text-gray-600 whitespace-pre-line">{q.terms}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Mode */}
      {editMode && form && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 bg-amber-50">
            <div className="flex items-center gap-2">
              <span className="text-amber-500">✏️</span>
              <div>
                <p className="text-sm font-bold text-amber-800">Mode Edit — {q.quotation_number}</p>
                <p className="text-xs text-amber-600">Perubahan pada item/harga/terms akan otomatis menambah revision number</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-6">
            {/* Customer & project */}
            <div>
              <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3">Data Customer & Project</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className={labelClass}>Nama Customer *</label>
                  <input value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} className={inputClass} /></div>
                <div><label className={labelClass}>Perusahaan *</label>
                  <input value={form.customer_company} onChange={e => setForm({ ...form, customer_company: e.target.value })} className={inputClass} /></div>
                <div><label className={labelClass}>Email</label>
                  <input type="email" value={form.customer_email} onChange={e => setForm({ ...form, customer_email: e.target.value })} className={inputClass} /></div>
                <div><label className={labelClass}>Telepon</label>
                  <input value={form.customer_phone} onChange={e => setForm({ ...form, customer_phone: e.target.value })} className={inputClass} /></div>
                <div className="sm:col-span-2"><label className={labelClass}>Alamat</label>
                  <textarea rows={2} value={form.customer_address} onChange={e => setForm({ ...form, customer_address: e.target.value })} className={`${inputClass} resize-none`} /></div>
                <div><label className={labelClass}>Sales Person</label>
                  <input value={form.sales_person} onChange={e => setForm({ ...form, sales_person: e.target.value })} className={inputClass} /></div>
                <div><label className={labelClass}>Ref. No.</label>
                  <input value={form.ref_no} onChange={e => setForm({ ...form, ref_no: e.target.value })} className={inputClass} /></div>
                <div className="sm:col-span-2"><label className={labelClass}>Subject / Project</label>
                  <input value={form.project_name} onChange={e => setForm({ ...form, project_name: e.target.value })} className={inputClass} /></div>
                <div><label className={labelClass}>Mata Uang</label>
                  <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} className={inputClass}>
                    <option>IDR</option><option>USD</option><option>SGD</option><option>EUR</option>
                  </select></div>
                <div><label className={labelClass}>Berlaku Hingga</label>
                  <input type="date" value={form.valid_until || ""} onChange={e => setForm({ ...form, valid_until: e.target.value })} className={inputClass} /></div>
              </div>
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider">Item & Harga</h3>
                <button onClick={addItem} className="text-xs font-semibold text-[#0B3D91] hover:underline">+ Tambah Item</button>
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
                      <div className="sm:col-span-2">
                        <input value={item.description} onChange={e => updateItem(i, "description", e.target.value)} placeholder="Deskripsi produk / jasa" className={inputClass} />
                      </div>
                      <input value={item.brand} onChange={e => updateItem(i, "brand", e.target.value)} placeholder="Brand" className={inputClass} />
                      <input value={item.model} onChange={e => updateItem(i, "model", e.target.value)} placeholder="Model / Part No" className={inputClass} />
                      <input value={item.remarks} onChange={e => updateItem(i, "remarks", e.target.value)} placeholder="Keterangan / Spec" className={`${inputClass} sm:col-span-2`} />
                      <div className="grid grid-cols-3 gap-2">
                        <input type="number" value={item.qty} onChange={e => updateItem(i, "qty", e.target.value)} placeholder="Qty" className={inputClass} />
                        <input value={item.unit} onChange={e => updateItem(i, "unit", e.target.value)} placeholder="Unit" className={inputClass} />
                        <input type="number" value={item.discount} onChange={e => updateItem(i, "discount", e.target.value)} placeholder="Disc%" className={inputClass} />
                      </div>
                      <div>
                        <input type="number" value={item.unit_price} onChange={e => updateItem(i, "unit_price", e.target.value)} placeholder="Harga Satuan" className={inputClass} />
                        <p className="text-right text-xs text-[#0B3D91] font-bold mt-1">{formatRupiah(calcSub(item), form.currency)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 p-3 bg-[#0B3D91]/5 rounded-xl text-right">
                <span className="text-sm font-bold text-[#0B3D91]">
                  TOTAL: {formatRupiah(form.items.reduce((s, item) => s + calcSub(item), 0), form.currency)}
                </span>
              </div>
            </div>

            {/* Terms */}
            <div>
              <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3">Terms & Conditions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className={labelClass}>Shipment Terms</label>
                  <input value={form.shipment_terms} onChange={e => setForm({ ...form, shipment_terms: e.target.value })} className={inputClass} /></div>
                <div><label className={labelClass}>Payment Terms</label>
                  <input value={form.payment_terms} onChange={e => setForm({ ...form, payment_terms: e.target.value })} className={inputClass} /></div>
                <div><label className={labelClass}>Delivery</label>
                  <input value={form.delivery} onChange={e => setForm({ ...form, delivery: e.target.value })} className={inputClass} /></div>
                <div className="sm:col-span-2"><label className={labelClass}>Notes</label>
                  <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className={`${inputClass} resize-none`} /></div>
                <div className="sm:col-span-2"><label className={labelClass}>Terms Tambahan</label>
                  <textarea rows={3} value={form.terms} onChange={e => setForm({ ...form, terms: e.target.value })} className={`${inputClass} resize-none`} /></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}