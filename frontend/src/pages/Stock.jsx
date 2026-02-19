import { useState, useEffect } from "react";
import API from "../services/api";
import toast from "react-hot-toast";

const CONDITION_CONFIG = {
  excellent: { label: "Excellent",    bg: "bg-green-100",  text: "text-green-700",  dot: "bg-green-500" },
  good:      { label: "Good",         bg: "bg-blue-100",   text: "text-blue-700",   dot: "bg-blue-500" },
  fair:      { label: "Fair",         bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500" },
  poor:      { label: "Poor",         bg: "bg-red-100",    text: "text-red-600",    dot: "bg-red-500" },
  damaged:   { label: "Damaged",      bg: "bg-red-200",    text: "text-red-800",    dot: "bg-red-700" },
};

const STATUS_CONFIG = {
  available:   { label: "Available",    bg: "bg-green-100",  text: "text-green-700" },
  on_loan:     { label: "On Loan",      bg: "bg-orange-100", text: "text-orange-700" },
  demo:        { label: "Demo",         bg: "bg-blue-100",   text: "text-blue-700" },
  in_repair:   { label: "In Repair",    bg: "bg-yellow-100", text: "text-yellow-700" },
  sold:        { label: "Sold",         bg: "bg-gray-100",   text: "text-gray-500" },
  retired:     { label: "Retired",      bg: "bg-gray-200",   text: "text-gray-500" },
};

const TYPE_OPTIONS = ["Flow Meter", "Level Transmitter", "Pressure Transmitter", "Temperature", "Analyzer", "Control Valve", "Calibrator", "Other"];
const EMPTY_FORM = {
  name: "", brand: "", model: "", serial_number: "", asset_tag: "",
  type: "", category: "stock", condition: "good", status: "available",
  location: "", loan_to: "", loan_date: "", return_date: "",
  purchase_date: "", purchase_price: "", description: "", remarks: "",
};

export default function Stock() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [viewItem, setViewItem] = useState(null);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await API.get("/stock/list");
      setItems(res.data);
    } catch { toast.error("Gagal memuat data stock"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleSubmit = async () => {
    if (!form.name || !form.brand) { toast.error("Nama dan brand wajib diisi"); return; }
    setSaving(true);
    try {
      if (editId) {
        await API.put(`/stock/update/${editId}`, form);
        toast.success("Unit diperbarui!");
      } else {
        await API.post("/stock/create", form);
        toast.success("Unit berhasil ditambahkan! 📦");
      }
      setShowModal(false); setEditId(null); setForm({ ...EMPTY_FORM });
      fetchItems();
    } catch (err) { toast.error(err.response?.data?.error || "Gagal menyimpan"); }
    finally { setSaving(false); }
  };

  const openEdit = (item) => {
    setForm({ ...EMPTY_FORM, ...item });
    setEditId(item.id);
    setShowModal(true);
  };

  const deleteItem = async (id) => {
    if (!confirm("Hapus unit ini?")) return;
    try { await API.delete(`/stock/delete/${id}`); toast.success("Unit dihapus"); fetchItems(); }
    catch { toast.error("Gagal menghapus"); }
  };

  const filtered = items.filter(item => {
    const matchSearch = !search || [item.name, item.brand, item.model, item.serial_number, item.asset_tag]
      .some(s => s?.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = !filterStatus || item.status === filterStatus;
    const matchCat = !filterCategory || item.category === filterCategory;
    return matchSearch && matchStatus && matchCat;
  });

  const statsData = [
    { label: "Total Unit", val: items.length, icon: "📦" },
    { label: "Available", val: items.filter(i => i.status === "available").length, icon: "✅" },
    { label: "On Loan / Demo", val: items.filter(i => ["on_loan","demo"].includes(i.status)).length, icon: "🔄" },
    { label: "In Repair", val: items.filter(i => i.status === "in_repair").length, icon: "🔧" },
  ];

  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white";
  const labelClass = "block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5";

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Stock & Demo Units</h1>
          <p className="text-sm text-gray-400 mt-0.5">Inventory alat instrumentasi Flotech</p>
        </div>
        <button onClick={() => { setForm({...EMPTY_FORM}); setEditId(null); setShowModal(true); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-semibold hover:bg-[#1E5CC6] transition-colors">
          + Tambah Unit
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {statsData.map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xl mb-1">{s.icon}</p>
            <p className="text-2xl font-black text-gray-800">{s.val}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama, brand, model, S/N..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white" />
        </div>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-white">
          <option value="">Stock & Demo</option>
          <option value="stock">Stock</option>
          <option value="demo">Demo Unit</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-white">
          <option value="">Semua Status</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center items-center h-40"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B3D91]" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-4xl mb-3">📦</p>
          <p className="text-gray-500 font-medium">Belum ada unit terdaftar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => {
            const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG.available;
            const cc = CONDITION_CONFIG[item.condition] || CONDITION_CONFIG.good;
            return (
              <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>{sc.label}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${item.category === "demo" ? "bg-purple-100 text-purple-700" : "bg-indigo-50 text-indigo-600"}`}>
                        {item.category === "demo" ? "Demo Unit" : "Stock"}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-800 truncate">{item.name}</h3>
                    <p className="text-xs text-gray-500">{item.brand} {item.model && `• ${item.model}`}</p>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-gray-500 mb-4">
                  {item.serial_number && <p>🔢 S/N: <span className="font-mono font-semibold text-gray-700">{item.serial_number}</span></p>}
                  {item.asset_tag && <p>🏷️ Tag: {item.asset_tag}</p>}
                  {item.type && <p>⚙️ {item.type}</p>}
                  {item.location && <p>📍 {item.location}</p>}
                  {item.status === "on_loan" && item.loan_to && <p>👤 Dipinjam: <span className="font-semibold text-orange-600">{item.loan_to}</span></p>}
                  {item.return_date && <p>📅 Kembali: {new Date(item.return_date).toLocaleDateString("id-ID")}</p>}
                </div>

                <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg mb-3 ${cc.bg} ${cc.text}`}>
                  <span className={`w-2 h-2 rounded-full ${cc.dot}`} />
                  Kondisi: {cc.label}
                </div>

                {item.remarks && <p className="text-xs text-gray-400 italic mb-3 line-clamp-2">{item.remarks}</p>}

                <div className="flex gap-2">
                  <button onClick={() => setViewItem(item)} className="flex-1 py-2 bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-100">Detail</button>
                  <button onClick={() => openEdit(item)} className="flex-1 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100">Edit</button>
                  <button onClick={() => deleteItem(item.id)} className="py-2 px-3 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100">🗑</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View Modal */}
      {viewItem && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <h2 className="font-bold text-gray-800">{viewItem.name}</h2>
              <button onClick={() => setViewItem(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              {[
                ["Brand", viewItem.brand], ["Model", viewItem.model], ["Type", viewItem.type],
                ["Serial Number", viewItem.serial_number], ["Asset Tag", viewItem.asset_tag],
                ["Category", viewItem.category === "demo" ? "Demo Unit" : "Stock"],
                ["Status", STATUS_CONFIG[viewItem.status]?.label],
                ["Kondisi", CONDITION_CONFIG[viewItem.condition]?.label],
                ["Lokasi", viewItem.location], ["Dipinjam ke", viewItem.loan_to],
                ["Tanggal Pinjam", viewItem.loan_date && new Date(viewItem.loan_date).toLocaleDateString("id-ID")],
                ["Tanggal Kembali", viewItem.return_date && new Date(viewItem.return_date).toLocaleDateString("id-ID")],
                ["Tanggal Beli", viewItem.purchase_date && new Date(viewItem.purchase_date).toLocaleDateString("id-ID")],
                ["Harga Beli", viewItem.purchase_price && new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",minimumFractionDigits:0}).format(viewItem.purchase_price)],
              ].filter(([,v]) => v).map(([label, val]) => (
                <div key={label} className="flex gap-3">
                  <span className="text-gray-400 w-32 flex-shrink-0">{label}</span>
                  <span className="font-medium text-gray-800">{val}</span>
                </div>
              ))}
              {viewItem.description && (
                <div><p className="text-gray-400 mb-1">Deskripsi</p><p className="text-gray-800">{viewItem.description}</p></div>
              )}
              {viewItem.remarks && (
                <div><p className="text-gray-400 mb-1">Remarks</p><p className="text-gray-800">{viewItem.remarks}</p></div>
              )}
            </div>
            <div className="p-5 border-t border-gray-100 flex gap-2">
              <button onClick={() => { setViewItem(null); openEdit(viewItem); }} className="flex-1 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-semibold">Edit Unit</button>
              <button onClick={() => setViewItem(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600">Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
            <div className="sticky top-0 bg-white rounded-t-2xl border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="font-bold text-gray-800">{editId ? "Edit Unit" : "Tambah Unit Baru"}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3">Informasi Unit</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Nama Alat *</label>
                    <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Contoh: Magnetic Flow Meter" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Brand / Principal *</label>
                    <input value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} placeholder="Endress+Hauser, Yokogawa, dll" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Model / Part Number</label>
                    <input value={form.model} onChange={e => setForm({...form, model: e.target.value})} placeholder="Model number" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Serial Number</label>
                    <input value={form.serial_number} onChange={e => setForm({...form, serial_number: e.target.value})} placeholder="S/N" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Asset Tag</label>
                    <input value={form.asset_tag} onChange={e => setForm({...form, asset_tag: e.target.value})} placeholder="FTC-ASSET-001" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Tipe Instrumen</label>
                    <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className={inputClass}>
                      <option value="">— Pilih —</option>
                      {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Kategori</label>
                    <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className={inputClass}>
                      <option value="stock">Stock</option>
                      <option value="demo">Demo Unit</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3">Status & Kondisi</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Status</label>
                    <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className={inputClass}>
                      {Object.entries(STATUS_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Kondisi</label>
                    <select value={form.condition} onChange={e => setForm({...form, condition: e.target.value})} className={inputClass}>
                      {Object.entries(CONDITION_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Lokasi Saat Ini</label>
                    <input value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="Gudang, kantor, customer..." className={inputClass} />
                  </div>
                  {(form.status === "on_loan" || form.status === "demo") && <>
                    <div>
                      <label className={labelClass}>Dipinjam / Demo ke</label>
                      <input value={form.loan_to} onChange={e => setForm({...form, loan_to: e.target.value})} placeholder="Nama customer / project" className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Tgl Pinjam</label>
                      <input type="date" value={form.loan_date} onChange={e => setForm({...form, loan_date: e.target.value})} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Tgl Kembali (Rencana)</label>
                      <input type="date" value={form.return_date} onChange={e => setForm({...form, return_date: e.target.value})} className={inputClass} />
                    </div>
                  </>}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3">Info Pembelian</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Tanggal Beli</label>
                    <input type="date" value={form.purchase_date} onChange={e => setForm({...form, purchase_date: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Harga Beli (IDR)</label>
                    <input type="number" value={form.purchase_price} onChange={e => setForm({...form, purchase_price: e.target.value})} placeholder="0" className={inputClass} />
                  </div>
                </div>
              </div>

              <div>
                <label className={labelClass}>Deskripsi</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  rows={2} placeholder="Spesifikasi teknis, fitur utama..." className={inputClass + " resize-none"} />
              </div>
              <div>
                <label className={labelClass}>Remarks / Catatan</label>
                <textarea value={form.remarks} onChange={e => setForm({...form, remarks: e.target.value})}
                  rows={2} placeholder="Catatan kondisi, history, dll..." className={inputClass + " resize-none"} />
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 rounded-b-2xl flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Batal</button>
              <button onClick={handleSubmit} disabled={saving}
                className="px-6 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-bold hover:bg-[#1E5CC6] disabled:opacity-60 flex items-center gap-2">
                {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Menyimpan...</> : "Simpan Unit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
