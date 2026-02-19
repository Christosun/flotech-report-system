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

function formatRupiah(val) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(parseFloat(val) || 0);
}

export default function QuotationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [q, setQ] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchQ = useCallback(async () => {
    try {
      const res = await API.get(`/quotation/detail/${id}`);
      setQ(res.data);
    } catch { toast.error("Gagal memuat quotation"); }
  }, [id]);

  useEffect(() => { fetchQ(); }, [fetchQ]);

  const updateStatus = async (status) => {
    setUpdatingStatus(true);
    try {
      await API.put(`/quotation/status/${id}`, { status });
      toast.success("Status diperbarui");
      fetchQ();
    } catch { toast.error("Gagal update status"); }
    finally { setUpdatingStatus(false); }
  };

  if (!q) return (
    <div className="flex justify-center items-center h-40">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B3D91]" />
    </div>
  );

  const sc = STATUS_CONFIG[q.status] || STATUS_CONFIG.draft;
  const items = q.items || [];
  const subtotal = items.reduce((s, item) => {
    const price = parseFloat(item.unit_price) || 0;
    const qty = parseFloat(item.qty) || 0;
    const disc = parseFloat(item.discount) || 0;
    return s + price * qty * (1 - disc / 100);
  }, 0);
  const ppn = subtotal * 0.11;

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={() => navigate("/quotations")} className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#0B3D91] mb-5 transition-colors">
        ← Kembali ke Quotations
      </button>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${sc.bg} ${sc.text}`}>{sc.label}</span>
            </div>
            <h1 className="text-2xl font-black text-[#0B3D91]">{q.quotation_number}</h1>
            <p className="text-gray-500 text-sm mt-1">{q.customer_company} • {q.customer_name}</p>
            {q.project_name && <p className="text-gray-400 text-xs mt-0.5">Project: {q.project_name}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <select value={q.status} onChange={e => updateStatus(e.target.value)} disabled={updatingStatus}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white">
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Customer Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3">📋 Data Customer</h3>
          <div className="space-y-2 text-sm">
            <div><span className="text-gray-400 text-xs">Perusahaan</span><p className="font-semibold text-gray-800">{q.customer_company}</p></div>
            <div><span className="text-gray-400 text-xs">PIC</span><p className="text-gray-700">{q.customer_name}</p></div>
            {q.customer_email && <div><span className="text-gray-400 text-xs">Email</span><p className="text-gray-700">{q.customer_email}</p></div>}
            {q.customer_phone && <div><span className="text-gray-400 text-xs">Telepon</span><p className="text-gray-700">{q.customer_phone}</p></div>}
            {q.customer_address && <div><span className="text-gray-400 text-xs">Alamat</span><p className="text-gray-700">{q.customer_address}</p></div>}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3">📊 Info Quotation</h3>
          <div className="space-y-2 text-sm">
            {q.category && <div><span className="text-gray-400 text-xs">Kategori</span><p className="font-semibold text-gray-800">{q.category}</p></div>}
            {q.valid_until && <div><span className="text-gray-400 text-xs">Berlaku Sampai</span><p className="text-gray-700">{new Date(q.valid_until).toLocaleDateString("id-ID", {day:"numeric",month:"long",year:"numeric"})}</p></div>}
            <div><span className="text-gray-400 text-xs">Dibuat</span><p className="text-gray-700">{q.created_at ? new Date(q.created_at).toLocaleDateString("id-ID") : "—"}</p></div>
            <div>
              <span className="text-gray-400 text-xs">Total</span>
              <p className="text-xl font-black text-[#0B3D91]">{formatRupiah(q.total_amount)}</p>
            </div>
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
                const price = parseFloat(item.unit_price) || 0;
                const qty = parseFloat(item.qty) || 0;
                const disc = parseFloat(item.discount) || 0;
                const sub = price * qty * (1 - disc / 100);
                return (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{i + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800">{item.description}</p>
                      {item.remarks && <p className="text-xs text-gray-400 mt-0.5">{item.remarks}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {item.brand && <p className="text-xs font-semibold">{item.brand}</p>}
                      {item.model && <p className="text-xs text-gray-400">{item.model}</p>}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700">{qty} {item.unit}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{formatRupiah(price)}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{disc > 0 ? `${disc}%` : "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">{formatRupiah(sub)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200">
                <td colSpan={5} />
                <td className="px-4 py-2 text-right text-xs font-bold text-gray-500 uppercase">Subtotal</td>
                <td className="px-4 py-2 text-right font-semibold text-gray-800">{formatRupiah(subtotal)}</td>
              </tr>
              <tr>
                <td colSpan={5} />
                <td className="px-4 py-2 text-right text-xs font-bold text-gray-500 uppercase">PPN 11%</td>
                <td className="px-4 py-2 text-right font-semibold text-gray-600">{formatRupiah(ppn)}</td>
              </tr>
              <tr className="bg-[#0B3D91] rounded-b-lg">
                <td colSpan={5} />
                <td className="px-4 py-3 text-right text-sm font-bold text-white rounded-bl-lg">Total + PPN</td>
                <td className="px-4 py-3 text-right text-sm font-black text-white rounded-br-lg">{formatRupiah(subtotal + ppn)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Notes & Terms */}
      {(q.notes || q.terms) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          {q.notes && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3">📝 Catatan</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{q.notes}</p>
            </div>
          )}
          {q.terms && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3">📜 Syarat & Ketentuan</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{q.terms}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
