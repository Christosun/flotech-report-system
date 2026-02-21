import { useState, useEffect } from "react";
import API from "../services/api";
import toast from "react-hot-toast";

const CONDITION_CONFIG = {
  excellent: { label: "Excellent", bg: "bg-green-100",  text: "text-green-700",  dot: "bg-green-500" },
  good:      { label: "Good",      bg: "bg-blue-100",   text: "text-blue-700",   dot: "bg-blue-500" },
  fair:      { label: "Fair",      bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500" },
  poor:      { label: "Poor",      bg: "bg-red-100",    text: "text-red-600",    dot: "bg-red-500" },
  damaged:   { label: "Damaged",   bg: "bg-red-200",    text: "text-red-800",    dot: "bg-red-700" },
};
const STATUS_CONFIG = {
  available:  { label: "Available",  bg: "bg-emerald-100", text: "text-emerald-700" },
  on_loan:    { label: "On Loan",    bg: "bg-orange-100",  text: "text-orange-700" },
  demo:       { label: "Demo",       bg: "bg-blue-100",    text: "text-blue-700" },
  in_repair:  { label: "In Repair",  bg: "bg-yellow-100",  text: "text-yellow-700" },
  sold:       { label: "Sold",       bg: "bg-gray-100",    text: "text-gray-500" },
  retired:    { label: "Retired",    bg: "bg-gray-200",    text: "text-gray-500" },
};
const TYPE_OPTIONS = ["Flow","Level","Pressure","Energy","Process Analyzer","Tools","Other"];

const EMPTY_FORM = {
  name: "", brand: "", model: "", serial_number: "", asset_tag: "",
  type: "", category: "stock", condition: "good", status: "available",
  location: "", loan_to: "", loan_date: "", return_date: "",
  purchase_date: "", purchase_price: "", description: "", remarks: "",
};

// Batch add: one product with multiple variants
const EMPTY_BATCH = {
  name: "", brand: "", type: "", category: "stock",
  variants: [{ model: "", serial_number: "", condition: "good", status: "available", location: "", remarks: "" }],
};

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

export default function Stock() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [batchForm, setBatchForm] = useState({ ...EMPTY_BATCH, variants: [{ ...EMPTY_BATCH.variants[0] }] });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [viewItem, setViewItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [viewMode, setViewMode] = useState("grouped"); // "grouped" | "list"

  const fetchItems = async () => {
    setLoading(true);
    try { const res = await API.get("/stock/list"); setItems(res.data); }
    catch { toast.error("Gagal memuat data stock"); }
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
        toast.success("Unit ditambahkan!");
      }
      setShowModal(false); setEditId(null); setForm({ ...EMPTY_FORM });
      fetchItems();
    } catch (err) { toast.error(err.response?.data?.error || "Gagal menyimpan"); }
    finally { setSaving(false); }
  };

  // Batch: add multiple variants of same product in one go
  const handleBatchSubmit = async () => {
    if (!batchForm.name || !batchForm.brand) { toast.error("Nama alat dan brand wajib diisi"); return; }
    const validVariants = batchForm.variants.filter(v => v.model || v.serial_number);
    if (validVariants.length === 0) { toast.error("Minimal isi 1 variant (model atau serial number)"); return; }
    setSaving(true);
    try {
      await Promise.all(validVariants.map(v =>
        API.post("/stock/create", {
          name: batchForm.name,
          brand: batchForm.brand,
          type: batchForm.type,
          category: batchForm.category,
          model: v.model,
          serial_number: v.serial_number,
          condition: v.condition,
          status: v.status,
          location: v.location,
          remarks: v.remarks,
        })
      ));
      toast.success(`${validVariants.length} unit berhasil ditambahkan! 📦`);
      setShowBatchModal(false);
      setBatchForm({ ...EMPTY_BATCH, variants: [{ model: "", serial_number: "", condition: "good", status: "available", location: "", remarks: "" }] });
      fetchItems();
    } catch (err) { toast.error(err.response?.data?.error || "Gagal menyimpan"); }
    finally { setSaving(false); }
  };

  const addBatchVariant = () => setBatchForm(f => ({
    ...f,
    variants: [...f.variants, { model: "", serial_number: "", condition: "good", status: "available", location: "", remarks: "" }]
  }));
  const removeBatchVariant = i => setBatchForm(f => ({ ...f, variants: f.variants.filter((_, idx) => idx !== i) }));
  const updateBatchVariant = (i, field, val) => setBatchForm(f => ({
    ...f,
    variants: f.variants.map((v, idx) => idx === i ? { ...v, [field]: val } : v)
  }));

  const openEdit = (item) => { setForm({ ...EMPTY_FORM, ...item }); setEditId(item.id); setShowModal(true); };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await API.delete(`/stock/delete/${deleteTarget.id}`);
      toast.success("Unit dihapus");
      setDeleteTarget(null);
      fetchItems();
    } catch { toast.error("Gagal menghapus"); }
    finally { setDeleting(false); }
  };

  const filtered = items.filter(item => {
    const matchSearch = !search || [item.name, item.brand, item.model, item.serial_number, item.asset_tag]
      .some(s => s?.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = !filterStatus || item.status === filterStatus;
    const matchCat = !filterCategory || item.category === filterCategory;
    return matchSearch && matchStatus && matchCat;
  });

  // Group by name+brand for grouped view
  const grouped = filtered.reduce((acc, item) => {
    const key = `${item.brand}__${item.name}`;
    if (!acc[key]) acc[key] = { name: item.name, brand: item.brand, type: item.type, category: item.category, units: [] };
    acc[key].units.push(item);
    return acc;
  }, {});

  const statsData = [
    { label: "Total Unit", val: items.length, icon: "📦", color: "text-[#0B3D91]" },
    { label: "Available", val: items.filter(i => i.status === "available").length, icon: "✅", color: "text-emerald-600" },
    { label: "On Loan / Demo", val: items.filter(i => ["on_loan", "demo"].includes(i.status)).length, icon: "🔄", color: "text-orange-600" },
    { label: "In Repair", val: items.filter(i => i.status === "in_repair").length, icon: "🔧", color: "text-yellow-600" },
  ];

  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white";
  const labelClass = "block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5";

  return (
    <div>
      {/* Delete Dialog */}
      {deleteTarget && (
        <DeleteDialog
          title="Hapus Unit?"
          description={`"${deleteTarget.name} — ${deleteTarget.model || deleteTarget.serial_number || ""}" akan dihapus permanen.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Stock & Demo Units</h1>
          <p className="text-sm text-gray-400 mt-0.5">Inventory alat instrumentasi Flotech</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setBatchForm({ name: "", brand: "", type: "", category: "stock", variants: [{ model: "", serial_number: "", condition: "good", status: "available", location: "", remarks: "" }] }); setShowBatchModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors">
            + Batch Tambah
          </button>
          <button onClick={() => { setForm({ ...EMPTY_FORM }); setEditId(null); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-semibold hover:bg-[#1E5CC6] transition-colors">
            + Tambah Unit
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {statsData.map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xl mb-1">{s.icon}</p>
            <p className={`text-2xl font-black ${s.color}`}>{s.val}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters + View Toggle */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama, brand, model, S/N…"
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white" />
        </div>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-white">
          <option value="">Stock & Demo</option>
          <option value="stock">Stock</option>
          <option value="demo">Demo Unit</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-white">
          <option value="">Semua Status</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        {/* View mode toggle */}
        <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white">
          <button onClick={() => setViewMode("grouped")}
            className={`px-3 py-2 text-xs font-semibold transition-colors ${viewMode === "grouped" ? "bg-[#0B3D91] text-white" : "text-gray-500 hover:bg-gray-50"}`}>
            ⊞ Grouped
          </button>
          <button onClick={() => setViewMode("list")}
            className={`px-3 py-2 text-xs font-semibold transition-colors ${viewMode === "list" ? "bg-[#0B3D91] text-white" : "text-gray-500 hover:bg-gray-50"}`}>
            ☰ List
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-40"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B3D91]" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-4xl mb-3">📦</p>
          <p className="text-gray-500 font-medium">Belum ada unit</p>
        </div>
      ) : viewMode === "grouped" ? (
        /* ── GROUPED VIEW ─────────────────────────────────────── */
        <div className="space-y-4">
          {Object.values(grouped).map((group, gi) => {
            const available = group.units.filter(u => u.status === "available").length;
            const onLoan = group.units.filter(u => ["on_loan", "demo"].includes(u.status)).length;
            const inRepair = group.units.filter(u => u.status === "in_repair").length;
            return (
              <div key={gi} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Group Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 bg-gradient-to-r from-[#0B3D91]/5 to-transparent border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#0B3D91]/10 rounded-xl flex items-center justify-center">
                      <span className="text-lg">📦</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{group.name}</h3>
                      <p className="text-xs text-gray-400">{group.brand}{group.type && ` • ${group.type}`}</p>
                    </div>
                  </div>
                  {/* Count badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#0B3D91]/10 text-[#0B3D91]">
                      {group.units.length} unit{group.category === "demo" ? " demo" : ""}
                    </span>
                    {available > 0 && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">{available} available</span>}
                    {onLoan > 0 && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700">{onLoan} on loan</span>}
                    {inRepair > 0 && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700">{inRepair} repair</span>}
                  </div>
                </div>
                {/* Units rows */}
                <div className="divide-y divide-gray-50">
                  {group.units.map(unit => {
                    const sc = STATUS_CONFIG[unit.status] || STATUS_CONFIG.available;
                    const cc = CONDITION_CONFIG[unit.condition] || CONDITION_CONFIG.good;
                    return (
                      <div key={unit.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cc.dot}`} />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">
                              {unit.model || <span className="text-gray-400 italic">No model</span>}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                              {unit.serial_number && <p className="text-xs text-gray-400">S/N: {unit.serial_number}</p>}
                              {unit.location && <p className="text-xs text-gray-400">📍 {unit.location}</p>}
                              {unit.loan_to && <p className="text-xs text-orange-500">→ {unit.loan_to}</p>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}>{sc.label}</span>
                          <span className={`hidden sm:inline text-xs px-2 py-0.5 rounded-full ${cc.bg} ${cc.text}`}>{cc.label}</span>
                          <button onClick={() => setViewItem(unit)} className="w-7 h-7 bg-gray-50 text-gray-600 rounded-lg text-xs hover:bg-gray-100 transition-colors">👁</button>
                          <button onClick={() => openEdit(unit)} className="w-7 h-7 bg-blue-50 text-blue-700 rounded-lg text-xs hover:bg-blue-100 transition-colors">✏</button>
                          <button onClick={() => setDeleteTarget(unit)} className="w-7 h-7 bg-red-50 text-red-500 rounded-lg text-xs hover:bg-red-100 transition-colors">🗑</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── LIST VIEW ────────────────────────────────────────── */
        <>
          {/* Desktop table */}
          <div className="hidden lg:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Nama Alat", "Brand / Model", "S/N", "Kategori", "Status", "Kondisi", "Lokasi", "Aksi"].map(h => (
                    <th key={h} className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(item => {
                  const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG.available;
                  const cc = CONDITION_CONFIG[item.condition] || CONDITION_CONFIG.good;
                  return (
                    <tr key={item.id} className="hover:bg-blue-50 transition-colors">
                      <td className="px-4 py-3"><p className="font-semibold text-sm text-gray-800">{item.name}</p></td>
                      <td className="px-4 py-3"><p className="text-xs font-semibold text-gray-700">{item.brand}</p><p className="text-xs text-gray-400">{item.model}</p></td>
                      <td className="px-4 py-3 text-xs text-gray-500">{item.serial_number || "—"}</td>
                      <td className="px-4 py-3"><span className="text-xs text-gray-500">{item.category === "demo" ? "Demo Unit" : "Stock"}</span></td>
                      <td className="px-4 py-3"><span className={`text-xs font-bold px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}>{sc.label}</span></td>
                      <td className="px-4 py-3"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cc.bg} ${cc.text}`}>{cc.label}</span></td>
                      <td className="px-4 py-3 text-xs text-gray-500">{item.location || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <button onClick={() => setViewItem(item)} className="p-1.5 bg-gray-50 text-gray-600 rounded-lg text-xs hover:bg-gray-100">👁</button>
                          <button onClick={() => openEdit(item)} className="p-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs hover:bg-blue-100">✏</button>
                          <button onClick={() => setDeleteTarget(item)} className="p-1.5 bg-red-50 text-red-500 rounded-lg text-xs hover:bg-red-100">🗑</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <div className="lg:hidden space-y-3">
            {filtered.map(item => {
              const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG.available;
              const cc = CONDITION_CONFIG[item.condition] || CONDITION_CONFIG.good;
              return (
                <div key={item.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div><p className="font-bold text-[#0B3D91] text-sm">{item.name}</p><p className="text-xs text-gray-400">{item.brand} — {item.model}</p></div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}>{sc.label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${cc.bg} ${cc.text}`}>{cc.label}</span>
                    </div>
                  </div>
                  {item.serial_number && <p className="text-xs text-gray-400 mb-2">S/N: {item.serial_number}</p>}
                  <div className="flex gap-2">
                    <button onClick={() => setViewItem(item)} className="flex-1 py-1.5 bg-gray-50 text-gray-600 rounded-lg text-xs font-semibold">Detail</button>
                    <button onClick={() => openEdit(item)} className="flex-1 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold">Edit</button>
                    <button onClick={() => setDeleteTarget(item)} className="py-1.5 px-3 bg-red-50 text-red-500 rounded-lg text-xs font-semibold">🗑</button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── View Modal ─────────────────────────────────────────── */}
      {viewItem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h2 className="font-bold text-gray-800">{viewItem.name}</h2>
                <p className="text-xs text-gray-400">{viewItem.brand}</p>
              </div>
              <button onClick={() => setViewItem(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-5 space-y-2.5 text-sm">
              {[
                ["Brand", viewItem.brand], ["Model", viewItem.model], ["Tipe", viewItem.type],
                ["Serial Number", viewItem.serial_number], ["Asset Tag", viewItem.asset_tag],
                ["Kategori", viewItem.category === "demo" ? "Demo Unit" : "Stock"],
                ["Status", STATUS_CONFIG[viewItem.status]?.label],
                ["Kondisi", CONDITION_CONFIG[viewItem.condition]?.label],
                ["Lokasi", viewItem.location], ["Dipinjam ke", viewItem.loan_to],
                ["Tanggal Pinjam", viewItem.loan_date && new Date(viewItem.loan_date).toLocaleDateString("id-ID")],
                ["Tanggal Kembali", viewItem.return_date && new Date(viewItem.return_date).toLocaleDateString("id-ID")],
                ["Tanggal Beli", viewItem.purchase_date && new Date(viewItem.purchase_date).toLocaleDateString("id-ID")],
                ["Harga Beli", viewItem.purchase_price && new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(viewItem.purchase_price)],
              ].filter(([, v]) => v).map(([label, val]) => (
                <div key={label} className="flex gap-3">
                  <span className="text-gray-400 w-32 flex-shrink-0">{label}</span>
                  <span className="font-medium text-gray-800">{val}</span>
                </div>
              ))}
              {viewItem.description && <div><p className="text-gray-400 mb-1">Deskripsi</p><p className="text-gray-800">{viewItem.description}</p></div>}
              {viewItem.remarks && <div><p className="text-gray-400 mb-1">Remarks</p><p className="text-gray-800">{viewItem.remarks}</p></div>}
            </div>
            <div className="p-4 border-t border-gray-100 flex gap-2">
              <button onClick={() => { setViewItem(null); openEdit(viewItem); }} className="flex-1 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-semibold">Edit Unit</button>
              <button onClick={() => setViewItem(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600">Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Single Add/Edit Modal ──────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
            <div className="sticky top-0 bg-white rounded-t-2xl border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="font-bold text-gray-800">{editId ? "Edit Unit" : "Tambah Unit Baru"}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3">Informasi Unit</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2"><label className={labelClass}>Nama Alat *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Magnetic Flow Meter" className={inputClass} /></div>
                  <div><label className={labelClass}>Brand *</label><input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} placeholder="iSOLV" className={inputClass} /></div>
                  <div><label className={labelClass}>Model / Part Number</label><input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} placeholder="Model number" className={inputClass} /></div>
                  <div><label className={labelClass}>Serial Number</label><input value={form.serial_number} onChange={e => setForm({ ...form, serial_number: e.target.value })} placeholder="S/N" className={inputClass} /></div>
                  <div><label className={labelClass}>Asset Tag</label><input value={form.asset_tag} onChange={e => setForm({ ...form, asset_tag: e.target.value })} placeholder="FTC-ASSET-001" className={inputClass} /></div>
                  <div>
                    <label className={labelClass}>Tipe Instrumen</label>
                    <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className={inputClass}>
                      <option value="">— Pilih —</option>
                      {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Kategori</label>
                    <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={inputClass}>
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
                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className={inputClass}>
                      {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Kondisi</label>
                    <select value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })} className={inputClass}>
                      {Object.entries(CONDITION_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                  <div><label className={labelClass}>Lokasi</label><input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Gudang / Kantor / Site" className={inputClass} /></div>
                  <div><label className={labelClass}>Dipinjam Ke</label><input value={form.loan_to} onChange={e => setForm({ ...form, loan_to: e.target.value })} placeholder="Nama perusahaan" className={inputClass} /></div>
                  <div><label className={labelClass}>Tanggal Pinjam</label><input type="date" value={form.loan_date} onChange={e => setForm({ ...form, loan_date: e.target.value })} className={inputClass} /></div>
                  <div><label className={labelClass}>Tanggal Kembali</label><input type="date" value={form.return_date} onChange={e => setForm({ ...form, return_date: e.target.value })} className={inputClass} /></div>
                </div>
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3">Info Tambahan</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className={labelClass}>Tanggal Beli</label><input type="date" value={form.purchase_date} onChange={e => setForm({ ...form, purchase_date: e.target.value })} className={inputClass} /></div>
                  <div><label className={labelClass}>Harga Beli (IDR)</label><input type="number" value={form.purchase_price} onChange={e => setForm({ ...form, purchase_price: e.target.value })} placeholder="0" className={inputClass} /></div>
                  <div className="sm:col-span-2"><label className={labelClass}>Deskripsi</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className={inputClass + " resize-none"} /></div>
                  <div className="sm:col-span-2"><label className={labelClass}>Remarks</label><textarea value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} rows={2} className={inputClass + " resize-none"} /></div>
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50">Batal</button>
              <button onClick={handleSubmit} disabled={saving}
                className="flex-1 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-bold hover:bg-[#1E5CC6] disabled:opacity-60 flex items-center justify-center gap-2">
                {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Menyimpan…</> : (editId ? "✓ Update Unit" : "✓ Tambah Unit")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Batch Add Modal ────────────────────────────────────── */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-4">
            <div className="sticky top-0 bg-white rounded-t-2xl border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-800">Batch Tambah Unit</h2>
                <p className="text-xs text-gray-400 mt-0.5">Input satu produk dengan banyak model/size/variant sekaligus</p>
              </div>
              <button onClick={() => setShowBatchModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6">
              {/* Product info */}
              <div className="bg-blue-50 rounded-xl p-4 mb-5">
                <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3">Informasi Produk (berlaku untuk semua variant)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className={labelClass}>Nama Alat *</label><input value={batchForm.name} onChange={e => setBatchForm({ ...batchForm, name: e.target.value })} placeholder="Magnetic Flow Meter" className={inputClass} /></div>
                  <div><label className={labelClass}>Brand / Principal *</label><input value={batchForm.brand} onChange={e => setBatchForm({ ...batchForm, brand: e.target.value })} placeholder="iSOLV" className={inputClass} /></div>
                  <div>
                    <label className={labelClass}>Tipe Instrumen</label>
                    <select value={batchForm.type} onChange={e => setBatchForm({ ...batchForm, type: e.target.value })} className={inputClass}>
                      <option value="">— Pilih —</option>
                      {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Kategori</label>
                    <select value={batchForm.category} onChange={e => setBatchForm({ ...batchForm, category: e.target.value })} className={inputClass}>
                      <option value="stock">Stock</option>
                      <option value="demo">Demo Unit</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Variants */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider">Variant / Size / Model ({batchForm.variants.length} unit)</h3>
                <button onClick={addBatchVariant}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0B3D91] text-white rounded-lg text-xs font-semibold hover:bg-[#1E5CC6]">
                  + Tambah Variant
                </button>
              </div>

              {/* Header row */}
              <div className="hidden sm:grid grid-cols-6 gap-2 mb-1 px-1">
                {["Model / Size", "Serial Number", "Kondisi", "Status", "Lokasi", "Remarks"].map(h => (
                  <p key={h} className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{h}</p>
                ))}
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {batchForm.variants.map((v, i) => (
                  <div key={i} className="grid grid-cols-1 sm:grid-cols-6 gap-2 bg-gray-50 rounded-xl p-3 relative group">
                    <input value={v.model} onChange={e => updateBatchVariant(i, "model", e.target.value)} placeholder="Model / Size" className={inputClass} />
                    <input value={v.serial_number} onChange={e => updateBatchVariant(i, "serial_number", e.target.value)} placeholder="S/N" className={inputClass} />
                    <select value={v.condition} onChange={e => updateBatchVariant(i, "condition", e.target.value)} className={inputClass}>
                      {Object.entries(CONDITION_CONFIG).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
                    </select>
                    <select value={v.status} onChange={e => updateBatchVariant(i, "status", e.target.value)} className={inputClass}>
                      {Object.entries(STATUS_CONFIG).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
                    </select>
                    <input value={v.location} onChange={e => updateBatchVariant(i, "location", e.target.value)} placeholder="Lokasi" className={inputClass} />
                    <div className="flex gap-1.5">
                      <input value={v.remarks} onChange={e => updateBatchVariant(i, "remarks", e.target.value)} placeholder="Remarks" className={inputClass} />
                      {batchForm.variants.length > 1 && (
                        <button onClick={() => removeBatchVariant(i)} className="w-9 h-9 flex-shrink-0 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 text-sm transition-colors">×</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 bg-emerald-50 rounded-xl text-center">
                <p className="text-sm font-bold text-emerald-700">
                  {batchForm.variants.filter(v => v.model || v.serial_number).length} unit valid akan ditambahkan
                </p>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3">
              <button onClick={() => setShowBatchModal(false)} className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50">Batal</button>
              <button onClick={handleBatchSubmit} disabled={saving}
                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2">
                {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Menyimpan…</> : `✓ Tambahkan ${batchForm.variants.filter(v => v.model || v.serial_number).length} Unit`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}