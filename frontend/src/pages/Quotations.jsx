import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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

const CATEGORY_OPTIONS = [
  "Flow Measurement",
  "Level Measurement",
  "Pressure Measurement",
  "Temperature Measurement",
  "Energy Measurement",
  "Process Analyzers",
  "Control Valves",
  "Calibration Services",
  "Commissioning Services",
  "Maintenance Services",
  "Spare Parts",
  "Other",
];

const EMPTY_ITEM = { description: "", brand: "", model: "", qty: 1, unit: "pcs", unit_price: 0, discount: 0, remarks: "" };

function formatRupiah(val) {
  const num = parseFloat(val) || 0;
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num);
}

export default function Quotations() {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [form, setForm] = useState({
    quotation_number: "",
    customer_name: "",
    customer_company: "",
    customer_email: "",
    customer_phone: "",
    customer_address: "",
    project_name: "",
    category: "",
    valid_until: "",
    currency: "IDR",
    notes: "",
    terms: "1. Harga belum termasuk PPN 11%\n2. Pengiriman sesuai kesepakatan\n3. Garansi sesuai kebijakan principal\n4. Pembayaran 30 hari setelah invoice",
    items: [{ ...EMPTY_ITEM }],
  });

  useEffect(() => { fetchQuotations(); }, []);

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const res = await API.get("/quotation/list");
      setQuotations(res.data);
    } catch {
      toast.error("Gagal memuat quotation");
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }));
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateItem = (i, field, val) => setForm(f => ({
    ...f,
    items: f.items.map((item, idx) => idx === i ? { ...item, [field]: val } : item)
  }));

  const calcSubtotal = (item) => {
    const price = parseFloat(item.unit_price) || 0;
    const qty = parseFloat(item.qty) || 0;
    const disc = parseFloat(item.discount) || 0;
    return price * qty * (1 - disc / 100);
  };

  const totalAmount = form.items.reduce((sum, item) => sum + calcSubtotal(item), 0);

  const handleSubmit = async () => {
    if (!form.quotation_number || !form.customer_name || !form.customer_company) {
      toast.error("Nomor quotation, nama & perusahaan customer wajib diisi");
      return;
    }
    setSaving(true);
    try {
      await API.post("/quotation/create", { ...form, total_amount: totalAmount });
      toast.success("Quotation berhasil dibuat! 🎉");
      setShowCreate(false);
      setForm({
        quotation_number: "", customer_name: "", customer_company: "", customer_email: "",
        customer_phone: "", customer_address: "", project_name: "", category: "",
        valid_until: "", currency: "IDR", notes: "",
        terms: "1. Harga belum termasuk PPN 11%\n2. Pengiriman sesuai kesepakatan\n3. Garansi sesuai kebijakan principal\n4. Pembayaran 30 hari setelah invoice",
        items: [{ ...EMPTY_ITEM }],
      });
      fetchQuotations();
    } catch (err) {
      toast.error(err.response?.data?.error || "Gagal membuat quotation");
    } finally {
      setSaving(false);
    }
  };

  const deleteQuotation = async (id) => {
    if (!confirm("Hapus quotation ini?")) return;
    try {
      await API.delete(`/quotation/delete/${id}`);
      toast.success("Quotation dihapus");
      fetchQuotations();
    } catch { toast.error("Gagal menghapus"); }
  };

  const filtered = quotations.filter(q => {
    const matchSearch = !search || [q.quotation_number, q.customer_name, q.customer_company, q.project_name]
      .some(s => s?.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = !filterStatus || q.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalWon = quotations.filter(q => q.status === "won").reduce((s, q) => s + (q.total_amount || 0), 0);
  const totalPipeline = quotations.filter(q => ["draft","sent","followup"].includes(q.status)).reduce((s, q) => s + (q.total_amount || 0), 0);

  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white";
  const labelClass = "block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5";

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quotations</h1>
          <p className="text-sm text-gray-400 mt-0.5">{quotations.length} total • {filtered.length} ditampilkan</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-semibold hover:bg-[#1E5CC6] transition-colors">
          + Buat Quotation
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Quotation", val: quotations.length, icon: "📄", color: "text-blue-600" },
          { label: "Won", val: quotations.filter(q=>q.status==="won").length, icon: "✅", color: "text-green-600" },
          { label: "Pipeline Value", val: formatRupiah(totalPipeline), icon: "📈", color: "text-orange-600", small: true },
          { label: "Won Value", val: formatRupiah(totalWon), icon: "💰", color: "text-green-600", small: true },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xl mb-1">{s.icon}</p>
            <p className={`font-black ${s.small ? "text-base" : "text-2xl"} text-gray-800`}>{s.val}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nomor, customer, project..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white">
          <option value="">Semua Status</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B3D91]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-4xl mb-3">📄</p>
          <p className="text-gray-500 font-medium">Belum ada quotation</p>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden lg:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["No. Quotation","Customer","Project / Kategori","Total","Status","Berlaku s/d","Aksi"].map(h => (
                    <th key={h} className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(q => {
                  const sc = STATUS_CONFIG[q.status] || STATUS_CONFIG.draft;
                  return (
                    <tr key={q.id} className="hover:bg-blue-50 transition-colors">
                      <td className="px-5 py-4 font-bold text-sm text-[#0B3D91]">{q.quotation_number}</td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-gray-800">{q.customer_company}</p>
                        <p className="text-xs text-gray-400">{q.customer_name}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm text-gray-700">{q.project_name || "—"}</p>
                        {q.category && <p className="text-xs text-gray-400 mt-0.5">{q.category}</p>}
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-gray-800">{formatRupiah(q.total_amount)}</td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}>{sc.label}</span>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-500">{q.valid_until ? new Date(q.valid_until).toLocaleDateString("id-ID") : "—"}</td>
                      <td className="px-5 py-4">
                        <div className="flex gap-1.5">
                          <button onClick={() => navigate(`/quotations/${q.id}`)} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100">View</button>
                          <button onClick={() => deleteQuotation(q.id)} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100">Del</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="lg:hidden space-y-3">
            {filtered.map(q => {
              const sc = STATUS_CONFIG[q.status] || STATUS_CONFIG.draft;
              return (
                <div key={q.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-[#0B3D91] text-sm">{q.quotation_number}</p>
                      <p className="text-xs text-gray-500">{q.customer_company}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>{sc.label}</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">{q.project_name} {q.category ? `• ${q.category}` : ""}</p>
                  <p className="font-bold text-gray-800 text-sm mb-3">{formatRupiah(q.total_amount)}</p>
                  <div className="flex gap-2">
                    <button onClick={() => navigate(`/quotations/${q.id}`)} className="flex-1 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold">View</button>
                    <button onClick={() => deleteQuotation(q.id)} className="flex-1 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-semibold">Hapus</button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-4">
            <div className="sticky top-0 bg-white rounded-t-2xl border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-gray-800">Buat Quotation Baru</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3">Informasi Quotation</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>No. Quotation *</label>
                    <input value={form.quotation_number} onChange={e => setForm({...form, quotation_number: e.target.value})}
                      placeholder="SQ26010001" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Kategori Produk</label>
                    <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className={inputClass}>
                      <option value="">— Pilih kategori —</option>
                      {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Berlaku Sampai</label>
                    <input type="date" value={form.valid_until} onChange={e => setForm({...form, valid_until: e.target.value})} className={inputClass} />
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div>
                <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3">Data Customer</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Nama Customer *</label>
                    <input value={form.customer_name} onChange={e => setForm({...form, customer_name: e.target.value})}
                      placeholder="Nama PIC" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Perusahaan *</label>
                    <input value={form.customer_company} onChange={e => setForm({...form, customer_company: e.target.value})}
                      placeholder="PT / CV ..." className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Email</label>
                    <input type="email" value={form.customer_email} onChange={e => setForm({...form, customer_email: e.target.value})}
                      placeholder="email@company.com" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Telepon</label>
                    <input value={form.customer_phone} onChange={e => setForm({...form, customer_phone: e.target.value})}
                      placeholder="+62..." className={inputClass} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Alamat</label>
                    <input value={form.customer_address} onChange={e => setForm({...form, customer_address: e.target.value})}
                      placeholder="Alamat lengkap" className={inputClass} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Nama Project</label>
                    <input value={form.project_name} onChange={e => setForm({...form, project_name: e.target.value})}
                      placeholder="Nama project / tender" className={inputClass} />
                  </div>
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider">Item / Produk</h3>
                  <button onClick={addItem} className="text-xs font-semibold text-[#0B3D91] hover:underline">+ Tambah Item</button>
                </div>
                <div className="space-y-3">
                  {form.items.map((item, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-gray-400">Item {i + 1}</span>
                        {form.items.length > 1 && (
                          <button onClick={() => removeItem(i)} className="text-xs text-red-500 hover:underline">Hapus</button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="col-span-2 sm:col-span-4">
                          <label className={labelClass}>Deskripsi *</label>
                          <input value={item.description} onChange={e => updateItem(i, "description", e.target.value)}
                            placeholder="Nama / deskripsi alat" className={inputClass} />
                        </div>
                        <div>
                          <label className={labelClass}>Brand / Principal</label>
                          <input value={item.brand} onChange={e => updateItem(i, "brand", e.target.value)}
                            placeholder="iSOLV, atau brand lain" className={inputClass} />
                        </div>
                        <div>
                          <label className={labelClass}>Model / Part No</label>
                          <input value={item.model} onChange={e => updateItem(i, "model", e.target.value)}
                            placeholder="Model number" className={inputClass} />
                        </div>
                        <div>
                          <label className={labelClass}>Qty</label>
                          <input type="number" value={item.qty} onChange={e => updateItem(i, "qty", e.target.value)}
                            min="1" className={inputClass} />
                        </div>
                        <div>
                          <label className={labelClass}>Satuan</label>
                          <select value={item.unit} onChange={e => updateItem(i, "unit", e.target.value)} className={inputClass}>
                            {["pcs","set","unit","lot","meter","roll","box","svc"].map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className={labelClass}>Harga Satuan (IDR)</label>
                          <input type="number" value={item.unit_price} onChange={e => updateItem(i, "unit_price", e.target.value)}
                            min="0" placeholder="0" className={inputClass} />
                        </div>
                        <div>
                          <label className={labelClass}>Diskon (%)</label>
                          <input type="number" value={item.discount} onChange={e => updateItem(i, "discount", e.target.value)}
                            min="0" max="100" placeholder="0" className={inputClass} />
                        </div>
                        <div className="col-span-2">
                          <label className={labelClass}>Remarks / Spesifikasi</label>
                          <input value={item.remarks} onChange={e => updateItem(i, "remarks", e.target.value)}
                            placeholder="Catatan teknis, tag number, dll" className={inputClass} />
                        </div>
                        <div className="col-span-2 sm:col-span-4 text-right">
                          <span className="text-sm font-bold text-gray-700">Subtotal: {formatRupiah(calcSubtotal(item))}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end mt-3 bg-[#0B3D91] text-white rounded-xl px-5 py-3">
                  <span className="font-bold">Total: {formatRupiah(totalAmount)}</span>
                </div>
              </div>

              {/* Notes & Terms */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Catatan Tambahan</label>
                  <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
                    rows={3} placeholder="Catatan untuk customer..." className={inputClass + " resize-none"} />
                </div>
                <div>
                  <label className={labelClass}>Syarat & Ketentuan</label>
                  <textarea value={form.terms} onChange={e => setForm({...form, terms: e.target.value})}
                    rows={3} className={inputClass + " resize-none text-xs"} />
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 rounded-b-2xl flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Batal</button>
              <button onClick={handleSubmit} disabled={saving}
                className="px-6 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-bold hover:bg-[#1E5CC6] disabled:opacity-60 flex items-center gap-2">
                {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Menyimpan...</> : "💾 Simpan Quotation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}