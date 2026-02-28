import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import API from "../services/api";

// ── Constants ────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  draft:    { label: "Draft",     color: "bg-gray-100 text-gray-600",     dot: "bg-gray-400",     hex: "#94a3b8" },
  sent:     { label: "Sent",      color: "bg-blue-100 text-blue-700",     dot: "bg-blue-500",     hex: "#3b82f6" },
  followup: { label: "Follow Up", color: "bg-amber-100 text-amber-700",   dot: "bg-amber-500",    hex: "#f59e0b" },
  won:      { label: "Won",       color: "bg-emerald-100 text-emerald-700",dot: "bg-emerald-500", hex: "#10b981" },
  lost:     { label: "Lost",      color: "bg-red-100 text-red-600",       dot: "bg-red-400",      hex: "#ef4444" },
  cancel:   { label: "Cancelled", color: "bg-gray-100 text-gray-400",     dot: "bg-gray-300",     hex: "#d1d5db" },
};

const EMPTY_ITEM = { description: "", brand: "", model: "", unit: "Unit", qty: 1, unit_price: 0, discount: 0, remarks: "" };

const INDUSTRIES = ["Oil & Gas","Petrochemical","Power Plant","Mining","Water Treatment",
  "Food & Beverage","Pharmaceutical","Pulp & Paper","Chemical","EPC Contractor","Others"];

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtRupiah(v, cur = "IDR") {
  if (!v && v !== 0) return "-";
  const n = Number(v);
  if (cur === "IDR") return "Rp " + n.toLocaleString("id-ID");
  return cur + " " + n.toLocaleString("en-US", { minimumFractionDigits: 2 });
}
function fmtDT(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}
function fmtD(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Customer Manager Modal ────────────────────────────────────────────────────
function CustomerManagerModal({ onClose, onSelect }) {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({ company_name: "", address: "", phone: "", email: "", industry: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white";
  const labelCls = "block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1";

  const load = useCallback(async () => {
    try { const r = await API.get("/customer/list"); setCustomers(r.data); } catch {}
  }, []);
  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditTarget(null); setForm({ company_name:"",address:"",phone:"",email:"",industry:"",notes:"" }); setShowForm(true); };
  const openEdit = (c) => { setEditTarget(c); setForm({ company_name:c.company_name,address:c.address||"",phone:c.phone||"",email:c.email||"",industry:c.industry||"",notes:c.notes||"" }); setShowForm(true); };

  const save = async () => {
    if (!form.company_name.trim()) { toast.error("Nama perusahaan wajib"); return; }
    setSaving(true);
    try {
      if (editTarget) { await API.put(`/customer/update/${editTarget.id}`, form); toast.success("Customer diperbarui"); }
      else { await API.post("/customer/create", form); toast.success("Customer ditambahkan 🎉"); }
      setShowForm(false); load();
    } catch (e) { toast.error(e.response?.data?.error || "Gagal menyimpan"); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    setDeleting(id);
    try { await API.delete(`/customer/delete/${id}`); toast.success("Dihapus"); load(); } catch { toast.error("Gagal hapus"); }
    finally { setDeleting(null); }
  };

  const filtered = customers.filter(c =>
    !search || c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-800">🏢 Customer Database</h2>
            <p className="text-xs text-gray-400">{customers.length} perusahaan terdaftar</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 bg-[#0B3D91] text-white rounded-xl text-xs font-bold hover:bg-[#1E5CC6] transition-colors">
              + Tambah Customer
            </button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 text-lg">✕</button>
          </div>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
            <h3 className="text-sm font-bold text-[#0B3D91] mb-3">{editTarget ? "✏️ Edit Customer" : "➕ Tambah Customer Baru"}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className={labelCls}>Nama Perusahaan *</label>
                <input value={form.company_name} onChange={e => setForm({...form,company_name:e.target.value})} placeholder="PT / CV ..." className={inputCls} autoFocus />
              </div>
              <div>
                <label className={labelCls}>No. Telepon</label>
                <input value={form.phone} onChange={e => setForm({...form,phone:e.target.value})} placeholder="+62..." className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Email (opsional)</label>
                <input type="email" value={form.email} onChange={e => setForm({...form,email:e.target.value})} placeholder="info@company.com" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Industri</label>
                <select value={form.industry} onChange={e => setForm({...form,industry:e.target.value})} className={inputCls}>
                  <option value="">Pilih industri...</option>
                  {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Alamat</label>
                <input value={form.address} onChange={e => setForm({...form,address:e.target.value})} placeholder="Kota / Alamat singkat" className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Catatan (opsional)</label>
                <input value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} placeholder="Keterangan tambahan..." className={inputCls} />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-50">Batal</button>
              <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-5 py-2 bg-[#0B3D91] text-white rounded-xl text-xs font-bold hover:bg-[#1E5CC6] disabled:opacity-60">
                {saving ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : null}
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="px-6 py-3 border-b border-gray-50">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Cari nama perusahaan atau email..."
            className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91]" />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <div className="text-3xl mb-2">🏢</div>
              <p className="text-sm">Belum ada customer. Klik "+ Tambah Customer" untuk mulai.</p>
            </div>
          ) : filtered.map(c => (
            <div key={c.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50 group">
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onSelect && onSelect(c)}>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-800 text-sm truncate">{c.company_name}</p>
                  {c.industry && <span className="shrink-0 px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-semibold rounded-full">{c.industry}</span>}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                  {c.phone && <span>📞 {c.phone}</span>}
                  {c.email && <span>✉ {c.email}</span>}
                  {c.address && <span>📍 {c.address}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
                {onSelect && (
                  <button onClick={() => onSelect(c)} className="px-3 py-1.5 bg-[#0B3D91] text-white text-xs font-bold rounded-lg hover:bg-[#1E5CC6] transition-colors">
                    Pilih
                  </button>
                )}
                <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-[#0B3D91] hover:bg-blue-50 rounded-lg transition-colors text-xs">✏️</button>
                <button onClick={() => del(c.id)} disabled={deleting === c.id} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors text-xs">
                  {deleting === c.id ? "..." : "🗑"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Analytics Panel ───────────────────────────────────────────────────────────
function AnalyticsPanel({ onClose }) {
  const [analytics, setAnalytics] = useState(null);
  const [mode, setMode] = useState("monthly");
  const [metric, setMetric] = useState("count");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showValue, setShowValue] = useState(true);
  const canvasRef = useRef({});

  useEffect(() => {
    API.get("/quotation/analytics").then(r => setAnalytics(r.data)).catch(() => toast.error("Gagal memuat analytics"));
  }, []);

  const rawData = analytics ? (mode === "monthly" ? analytics.monthly : analytics.yearly) : [];

  let data = mode === "monthly" ? rawData.slice(-12) : rawData;

  // Date filter
  if (dateFrom || dateTo) {
    data = data.filter(d => {
      if (dateFrom && d.period < dateFrom.substring(0,7)) return false;
      if (dateTo && d.period > dateTo.substring(0,7)) return false;
      return true;
    });
  }

  const statuses = filterStatus === "all" ? Object.keys(STATUS_CONFIG) : [filterStatus];

  const totalCount = data.reduce((s, d) => s + statuses.reduce((ss, st) => ss + (d[st] || 0), 0), 0);
  const totalValue = data.reduce((s, d) => s + statuses.reduce((ss, st) => ss + (d[`${st}_val`] || 0), 0), 0);
  const wonCount   = data.reduce((s, d) => s + (d.won || 0), 0);
  const winRate    = totalCount > 0 ? Math.round(wonCount / totalCount * 100) : 0;

  const getBarVal = (d, st) => metric === "value" ? (d[`${st}_val`] || 0) : (d[st] || 0);
  const maxBarVal = Math.max(...data.map(d => statuses.reduce((s, st) => s + getBarVal(d, st), 0)), 1);

  const formatLabel = (period) => {
    if (period.length === 7) {
      const [y, m] = period.split("-");
      const months = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
      return `${months[parseInt(m)-1]} '${y.slice(2)}`;
    }
    return period;
  };

  const formatMetricVal = (v) => {
    if (metric === "value") {
      if (v >= 1e9) return `${(v/1e9).toFixed(1)}M`;
      if (v >= 1e6) return `${(v/1e6).toFixed(0)}jt`;
      if (v >= 1e3) return `${(v/1e3).toFixed(0)}rb`;
      return `${v}`;
    }
    return `${v}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-gray-800">📊 Quotation Analytics</h2>
            <p className="text-xs text-gray-400">Analisis trend dan performa penjualan</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Controls Row 1 */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Period */}
            <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
              {[["monthly","Bulanan"],["yearly","Tahunan"]].map(([v,l]) => (
                <button key={v} onClick={() => setMode(v)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${mode===v?"bg-white shadow text-[#0B3D91]":"text-gray-500 hover:text-gray-700"}`}>{l}</button>
              ))}
            </div>
            {/* Metric */}
            <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
              {[["count","Jumlah"],["value","Nilai"]].map(([v,l]) => (
                <button key={v} onClick={() => setMetric(v)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${metric===v?"bg-white shadow text-[#0B3D91]":"text-gray-500 hover:text-gray-700"}`}>{l}</button>
              ))}
            </div>
            {/* Show value on bar */}
            <button onClick={() => setShowValue(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${showValue?"bg-[#0B3D91] text-white border-[#0B3D91]":"border-gray-200 text-gray-500 hover:border-gray-300"}`}>
              {showValue ? "🏷 Nilai Tampil" : "🏷 Tampilkan Nilai"}
            </button>
          </div>

          {/* Controls Row 2 — Status filter */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-gray-400 font-semibold">Filter:</span>
            <button onClick={() => setFilterStatus("all")}
              className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all ${filterStatus==="all"?"bg-[#0B3D91] text-white border-[#0B3D91]":"border-gray-200 text-gray-500 hover:border-gray-300"}`}>All</button>
            {Object.entries(STATUS_CONFIG).map(([k,v]) => (
              <button key={k} onClick={() => setFilterStatus(k)}
                className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all ${filterStatus===k?"text-white border-transparent":"border-gray-200 text-gray-500"}`}
                style={filterStatus===k?{backgroundColor:v.hex,borderColor:v.hex}:{}}>
                {v.label}
              </button>
            ))}
            {/* Date range (monthly only) */}
            {mode === "monthly" && (
              <div className="flex items-center gap-2 ml-auto">
                <input type="month" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0B3D91]" placeholder="Dari" />
                <span className="text-gray-400 text-xs">—</span>
                <input type="month" value={dateTo} onChange={e=>setDateTo(e.target.value)}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0B3D91]" />
                {(dateFrom||dateTo) && (
                  <button onClick={()=>{setDateFrom("");setDateTo("");}} className="text-xs text-red-400 hover:text-red-600 font-semibold">Reset</button>
                )}
              </div>
            )}
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {icon:"📄",label:"Total Quotation",val:totalCount,sub:`${data.length} periode`},
              {icon:"💰",label:"Total Nilai",val:fmtRupiah(totalValue),sub:"semua status",small:true},
              {icon:"✅",label:"Won",val:wonCount,sub:"berhasil close"},
              {icon:"🎯",label:"Won Rate",val:`${winRate}%`,sub:"dari total"},
            ].map(s => (
              <div key={s.label} className="bg-gradient-to-br from-gray-50 to-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <div className="text-xl mb-1">{s.icon}</div>
                <div className={`font-black text-gray-800 leading-tight ${s.small?"text-sm":"text-xl"}`}>{s.val}</div>
                <div className="text-[10px] text-gray-400 mt-1 font-semibold uppercase tracking-wide">{s.label}</div>
                <div className="text-[10px] text-gray-300 mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Bar Chart */}
          <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl p-5 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-700">
                {metric==="count"?"Jumlah Quotation":"Nilai Quotation (IDR)"} — {mode==="monthly"?"Bulanan":"Tahunan"}
              </h3>
              <div className="flex gap-3 flex-wrap justify-end">
                {statuses.map(st => (
                  <div key={st} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{backgroundColor:STATUS_CONFIG[st]?.hex}}/>
                    <span className="text-[10px] text-gray-500">{STATUS_CONFIG[st]?.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {!analytics ? (
              <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0B3D91]"/></div>
            ) : data.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">Tidak ada data untuk periode ini</div>
            ) : (
              <div className="overflow-x-auto">
                <div className="flex items-end gap-2 pb-6 min-w-max" style={{height:"200px"}}>
                  {data.map((d, i) => {
                    const segments = statuses.map(st => ({ st, val: getBarVal(d, st) })).filter(s => s.val > 0);
                    const total = segments.reduce((s, x) => s + x.val, 0);
                    const barH = total > 0 ? (total / maxBarVal) * 150 : 0;
                    return (
                      <div key={i} className="flex flex-col items-center gap-1 group" style={{minWidth:"44px"}}>
                        {/* Value label above bar */}
                        <div className={`text-[9px] font-bold text-gray-500 transition-opacity ${showValue && total > 0 ? "opacity-100" : "opacity-0"}`} style={{height:"14px"}}>
                          {formatMetricVal(total)}
                        </div>
                        {/* Stacked bar */}
                        <div className="relative w-7 flex flex-col-reverse overflow-hidden rounded-t-lg" style={{height:`${barH}px`,minHeight:total>0?4:0}}>
                          {segments.map(({st, val}) => {
                            const segH = total > 0 ? (val/total)*100 : 0;
                            return (
                              <div key={st} title={`${STATUS_CONFIG[st]?.label}: ${metric==="value"?fmtRupiah(val):val}`}
                                className="transition-all hover:brightness-110 cursor-default"
                                style={{height:`${segH}%`, backgroundColor:STATUS_CONFIG[st]?.hex, minHeight:2}}/>
                            );
                          })}
                          {/* Hover tooltip */}
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-gray-900 text-white text-[9px] px-2 py-1 rounded whitespace-nowrap z-10 pointer-events-none">
                              {metric==="value" ? fmtRupiah(total) : `${total} qt`}
                            </div>
                          </div>
                        </div>
                        <span className="text-[9px] text-gray-400 text-center leading-tight max-w-[44px]">{formatLabel(d.period)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Breakdown Table */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3">Breakdown per Status</h3>
            <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gradient-to-r from-[#0B3D91] to-[#1E5CC6] text-white">
                    <th className="px-4 py-3 text-left font-bold">Status</th>
                    <th className="px-4 py-3 text-right font-bold">Jumlah</th>
                    <th className="px-4 py-3 text-right font-bold">Total Nilai</th>
                    <th className="px-4 py-3 text-right font-bold">Rata-rata Nilai</th>
                    <th className="px-4 py-3 text-right font-bold">% Count</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(STATUS_CONFIG).map(([k,v], i) => {
                    const cnt = data.reduce((s, d) => s+(d[k]||0), 0);
                    const val = data.reduce((s, d) => s+(d[`${k}_val`]||0), 0);
                    const avg = cnt > 0 ? val/cnt : 0;
                    const pct = totalCount > 0 ? Math.round(cnt/totalCount*100) : 0;
                    return (
                      <tr key={k} className={i%2===0?"bg-white":"bg-gray-50/60"}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor:v.hex}}/>
                            <span className="font-semibold text-gray-700">{v.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-black text-gray-800">{cnt}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{fmtRupiah(val)}</td>
                        <td className="px-4 py-3 text-right text-gray-500">{cnt>0?fmtRupiah(avg):"-"}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{width:`${pct}%`,backgroundColor:v.hex}}/>
                            </div>
                            <span className="text-gray-400 w-7 text-right">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {/* Total row */}
                  <tr className="bg-[#0B3D91]/5 border-t border-[#0B3D91]/20">
                    <td className="px-4 py-3 font-black text-[#0B3D91]">TOTAL</td>
                    <td className="px-4 py-3 text-right font-black text-[#0B3D91]">{totalCount}</td>
                    <td className="px-4 py-3 text-right font-black text-[#0B3D91]">{fmtRupiah(totalValue)}</td>
                    <td className="px-4 py-3 text-right font-bold text-[#0B3D91]">{totalCount>0?fmtRupiah(totalValue/totalCount):"-"}</td>
                    <td className="px-4 py-3 text-right font-black text-[#0B3D91]">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Advanced Filter Panel ─────────────────────────────────────────────────────
function FilterPanel({ quotations, filters, setFilters, onClose }) {
  const [local, setLocal] = useState(filters);
  const salesList  = [...new Set(quotations.map(q => q.sales_person).filter(Boolean))].sort();
  const custList   = [...new Set(quotations.map(q => q.customer_company).filter(Boolean))].sort();
  const inputCls   = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91]";
  const labelCls   = "block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1";
  const activeCount = Object.values(local).filter(v => v && v !== "").length;

  const apply = () => { setFilters(local); onClose(); };
  const reset = () => { const e={search:"",status:"",sales:"",customer:"",dateFrom:"",dateTo:"",currency:"",minVal:"",maxVal:""}; setLocal(e); setFilters(e); onClose(); };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-800">🔍 Filter Lanjutan</h2>
            {activeCount > 0 && <p className="text-xs text-[#0B3D91] font-semibold">{activeCount} filter aktif</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-lg">✕</button>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelCls}>Cari (No. Quotation / Project / PIC)</label>
            <input value={local.search} onChange={e=>setLocal({...local,search:e.target.value})}
              placeholder="Ketik kata kunci..." className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select value={local.status} onChange={e=>setLocal({...local,status:e.target.value})} className={inputCls}>
              <option value="">Semua Status</option>
              {Object.entries(STATUS_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Sales Person</label>
            <select value={local.sales} onChange={e=>setLocal({...local,sales:e.target.value})} className={inputCls}>
              <option value="">Semua Sales</option>
              {salesList.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Customer / Perusahaan</label>
            <select value={local.customer} onChange={e=>setLocal({...local,customer:e.target.value})} className={inputCls}>
              <option value="">Semua Customer</option>
              {custList.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Mata Uang</label>
            <select value={local.currency} onChange={e=>setLocal({...local,currency:e.target.value})} className={inputCls}>
              <option value="">Semua Mata Uang</option>
              {["IDR","USD","SGD","EUR"].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Tanggal Dibuat — Dari</label>
            <input type="date" value={local.dateFrom} onChange={e=>setLocal({...local,dateFrom:e.target.value})} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Tanggal Dibuat — Sampai</label>
            <input type="date" value={local.dateTo} onChange={e=>setLocal({...local,dateTo:e.target.value})} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Nilai Minimum (IDR)</label>
            <input type="number" value={local.minVal} onChange={e=>setLocal({...local,minVal:e.target.value})}
              placeholder="0" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Nilai Maksimum (IDR)</label>
            <input type="number" value={local.maxVal} onChange={e=>setLocal({...local,maxVal:e.target.value})}
              placeholder="Tidak terbatas" className={inputCls} />
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={reset} className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50">Reset Semua</button>
          <button onClick={apply} className="flex-1 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-bold hover:bg-[#1E5CC6] transition-colors">Terapkan Filter</button>
        </div>
      </div>
    </div>
  );
}

// ── Create Quotation Modal ────────────────────────────────────────────────────
function CreateModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    base_number:"", customer_name:"", customer_company:"", customer_email:"",
    customer_phone:"", customer_address:"", project_name:"", category:"",
    valid_until:"", currency:"IDR", vat_pct:"11", vat_include: false,
    sales_person:"", ref_no:"",
    shipment_terms:"", delivery:"", payment_terms:"",
    notes:"", terms:"",
    items:[{ ...EMPTY_ITEM }],
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCustDB, setShowCustDB] = useState(false);

  useEffect(() => {
    API.get("/quotation/next-number")
      .then(r => setForm(f => ({...f, base_number: r.data.number})))
      .catch(() => toast.error("Gagal generate nomor"))
      .finally(() => setLoading(false));
  }, []);

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white";
  const labelCls = "block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5";

  const addItem = () => setForm(f => ({...f, items:[...f.items,{...EMPTY_ITEM}]}));
  const rmItem  = i => setForm(f => ({...f, items:f.items.filter((_,idx)=>idx!==i)}));
  const upItem  = (i,k,v) => setForm(f => ({...f, items:f.items.map((it,idx)=>idx===i?{...it,[k]:v}:it)}));
  const calcSub = it => (parseFloat(it.unit_price)||0)*(parseFloat(it.qty)||0)*(1-(parseFloat(it.discount)||0)/100);
  const subtotal = form.items.reduce((s,it) => s+calcSub(it), 0);
  const vatAmt   = form.vat_include ? subtotal*(parseFloat(form.vat_pct)||0)/100 : 0;

  const selectCustomer = (c) => {
    setForm(f => ({...f,
      customer_company: c.company_name,
      customer_email: c.email || f.customer_email,
      customer_phone: c.phone || f.customer_phone,
      customer_address: c.address || f.customer_address,
    }));
    setShowCustDB(false);
    toast.success(`Customer "${c.company_name}" dipilih`);
  };

  const submit = async () => {
    if (!form.base_number||!form.customer_name||!form.customer_company) {
      toast.error("Nomor quotation, nama PIC & perusahaan wajib diisi"); return;
    }
    setSaving(true);
    try {
      await API.post("/quotation/create", {...form, total_amount: subtotal});
      toast.success("Quotation berhasil dibuat! 🎉");
      onCreated();
      onClose();
    } catch(e) { toast.error(e.response?.data?.error||"Gagal membuat quotation"); }
    finally { setSaving(false); }
  };

  return (
    <>
      {showCustDB && <CustomerManagerModal onClose={()=>setShowCustDB(false)} onSelect={selectCustomer} />}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-start justify-center overflow-y-auto py-6 px-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl">
          {/* Modal header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Buat Quotation Baru</h2>
              <p className="text-xs font-mono text-[#0B3D91] mt-0.5">{loading ? "Generating..." : form.base_number}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-lg">✕</button>
          </div>

          <div className="p-6 space-y-6">
            {/* ① Quotation Info */}
            <section>
              <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3">① Informasi Quotation</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>No. Quotation *</label>
                  <input value={form.base_number} onChange={e=>setForm({...form,base_number:e.target.value})}
                    className={`${inputCls} font-mono`} placeholder="SQ2602001" />
                </div>
                <div>
                  <label className={labelCls}>Sales Person</label>
                  <input value={form.sales_person} onChange={e=>setForm({...form,sales_person:e.target.value})} placeholder="Nama sales" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Ref. No.</label>
                  <input value={form.ref_no} onChange={e=>setForm({...form,ref_no:e.target.value})} placeholder="No. referensi customer" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Mata Uang</label>
                  <select value={form.currency} onChange={e=>setForm({...form,currency:e.target.value})} className={inputCls}>
                    <option>IDR</option><option>USD</option><option>SGD</option><option>EUR</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Berlaku Hingga</label>
                  <input type="date" value={form.valid_until} onChange={e=>setForm({...form,valid_until:e.target.value})} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Kategori</label>
                  <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className={inputCls}>
                    <option value="">Pilih kategori</option>
                    {["Flow Measurement","Level Measurement","Pressure Measurement","Energy Measurement","Process Analyzer","Service / Repair","Lainnya"].map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                {/* VAT */}
                <div className="flex items-center gap-3 col-span-2 sm:col-span-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                  <input type="checkbox" id="vat_chk" checked={form.vat_include} onChange={e=>setForm({...form,vat_include:e.target.checked})}
                    className="w-4 h-4 accent-[#0B3D91]" />
                  <label htmlFor="vat_chk" className="text-sm font-semibold text-gray-700 cursor-pointer">Sertakan VAT / PPN dalam quotation</label>
                  {form.vat_include && (
                    <div className="flex items-center gap-2 ml-auto">
                      <label className="text-xs text-gray-500">VAT %</label>
                      <input type="number" value={form.vat_pct} onChange={e=>setForm({...form,vat_pct:e.target.value})}
                        className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#0B3D91]" min="0" max="100" />
                      <span className="text-xs text-gray-500">%</span>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* ② Customer */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider">② Data Customer</h3>
                <button onClick={()=>setShowCustDB(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#0B3D91] hover:underline">
                  🏢 Pilih dari Database Customer
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Nama PIC *</label>
                  <input value={form.customer_name} onChange={e=>setForm({...form,customer_name:e.target.value})} placeholder="Nama contact person" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Perusahaan *</label>
                  <input value={form.customer_company} onChange={e=>setForm({...form,customer_company:e.target.value})} placeholder="PT / CV ..." className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input type="email" value={form.customer_email} onChange={e=>setForm({...form,customer_email:e.target.value})} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Telepon</label>
                  <input value={form.customer_phone} onChange={e=>setForm({...form,customer_phone:e.target.value})} className={inputCls} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Alamat</label>
                  <textarea rows={2} value={form.customer_address} onChange={e=>setForm({...form,customer_address:e.target.value})} className={`${inputCls} resize-none`} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Subject / Project</label>
                  <input value={form.project_name} onChange={e=>setForm({...form,project_name:e.target.value})} placeholder="Nama project atau deskripsi" className={inputCls} />
                </div>
              </div>
            </section>

            {/* ③ Items */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider">③ Item & Harga</h3>
                <button onClick={addItem} className="text-xs font-bold text-[#0B3D91] hover:underline">+ Tambah Item</button>
              </div>
              <div className="space-y-3">
                {form.items.map((item,i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-gray-400">Item {i+1}</span>
                      {form.items.length>1 && <button onClick={()=>rmItem(i)} className="text-xs text-red-500 hover:underline">Hapus</button>}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="col-span-2 sm:col-span-4">
                        <input value={item.description} onChange={e=>upItem(i,"description",e.target.value)} placeholder="Deskripsi produk / jasa *" className={inputCls} />
                      </div>
                      <input value={item.brand} onChange={e=>upItem(i,"brand",e.target.value)} placeholder="Brand" className={inputCls} />
                      <input value={item.model} onChange={e=>upItem(i,"model",e.target.value)} placeholder="Model / P/N" className={inputCls} />
                      <input value={item.remarks} onChange={e=>upItem(i,"remarks",e.target.value)} placeholder="Keterangan" className={`${inputCls} col-span-2`} />
                      <input type="number" value={item.qty} onChange={e=>upItem(i,"qty",e.target.value)} placeholder="Qty" className={inputCls} min="0" />
                      <input value={item.unit} onChange={e=>upItem(i,"unit",e.target.value)} placeholder="UOM" className={inputCls} />
                      <input type="number" value={item.unit_price} onChange={e=>upItem(i,"unit_price",e.target.value)} placeholder="Harga Satuan" className={inputCls} min="0" />
                      <input type="number" value={item.discount} onChange={e=>upItem(i,"discount",e.target.value)} placeholder="Disc %" className={inputCls} min="0" max="100" />
                    </div>
                    <div className="text-right mt-2">
                      <span className="text-xs text-gray-400">Subtotal: </span>
                      <span className="text-sm font-black text-[#0B3D91]">{fmtRupiah(calcSub(item), form.currency)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 p-4 bg-[#0B3D91]/5 rounded-xl border border-[#0B3D91]/10 text-right space-y-1">
                <p><span className="text-xs text-gray-500">Subtotal: </span><span className="text-sm font-bold text-gray-700">{fmtRupiah(subtotal, form.currency)}</span></p>
                {form.vat_include && <p><span className="text-xs text-gray-500">VAT {form.vat_pct}%: </span><span className="text-sm font-bold text-gray-700">{fmtRupiah(vatAmt, form.currency)}</span></p>}
                <p><span className="text-sm font-bold text-gray-600">TOTAL: </span><span className="text-lg font-black text-[#0B3D91]">{fmtRupiah(subtotal + vatAmt, form.currency)}</span></p>
              </div>
            </section>

            {/* ④ Terms */}
            <section>
              <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3">④ Terms & Conditions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Shipment Terms</label>
                  <input value={form.shipment_terms} onChange={e=>setForm({...form,shipment_terms:e.target.value})} placeholder="Contoh: Franco Surabaya" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Payment Terms</label>
                  <input value={form.payment_terms} onChange={e=>setForm({...form,payment_terms:e.target.value})} placeholder="Contoh: Cash Advance" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Delivery / Lead Time</label>
                  <input value={form.delivery} onChange={e=>setForm({...form,delivery:e.target.value})} placeholder="Contoh: 10-12 Weeks ARO" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Note untuk Customer</label>
                  <input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Catatan tambahan..." className={inputCls} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Terms Tambahan (opsional)</label>
                  <textarea rows={3} value={form.terms} onChange={e=>setForm({...form,terms:e.target.value})}
                    placeholder="Isi terms khusus jika ada, atau kosongkan jika tidak diperlukan..." className={`${inputCls} resize-none`} />
                </div>
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-0 bg-white rounded-b-2xl">
            <p className="text-xs text-gray-400">Revision otomatis bertambah jika ada perubahan item/harga/terms setelah disimpan</p>
            <div className="flex gap-3 w-full sm:w-auto">
              <button onClick={onClose} className="flex-1 sm:flex-none px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50">Batal</button>
              <button onClick={submit} disabled={saving}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-bold hover:bg-[#1E5CC6] disabled:opacity-60 transition-colors">
                {saving?<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:null}
                {saving?"Menyimpan...":"Simpan Quotation"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Quotations() {
  const navigate = useNavigate();
  const [quotations, setQuotations]   = useState([]);
  const [showCreate, setShowCreate]   = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showCustMgr, setShowCustMgr] = useState(false);
  const [showFilter, setShowFilter]   = useState(false);
  const [filters, setFilters] = useState({ search:"",status:"",sales:"",customer:"",dateFrom:"",dateTo:"",currency:"",minVal:"",maxVal:"" });

  const fetchQ = useCallback(async () => {
    try { const r = await API.get("/quotation/list"); setQuotations(r.data); } catch { toast.error("Gagal memuat quotation"); }
  }, []);
  useEffect(() => { fetchQ(); }, [fetchQ]);

  // Active filter count
  const activeFilters = Object.values(filters).filter(v => v && v !== "").length;

  // Filtered list
  const filtered = quotations.filter(q => {
    const { search, status, sales, customer, dateFrom, dateTo, currency, minVal, maxVal } = filters;
    if (search) {
      const s = search.toLowerCase();
      const match = [q.quotation_number, q.customer_name, q.customer_company, q.project_name, q.sales_person]
        .some(f => f?.toLowerCase().includes(s));
      if (!match) return false;
    }
    if (status && q.status !== status) return false;
    if (sales && q.sales_person !== sales) return false;
    if (customer && q.customer_company !== customer) return false;
    if (currency && q.currency !== currency) return false;
    if (dateFrom && q.created_at < dateFrom) return false;
    if (dateTo && q.created_at > dateTo + "T23:59:59") return false;
    if (minVal && (q.total_amount || 0) < parseFloat(minVal)) return false;
    if (maxVal && (q.total_amount || 0) > parseFloat(maxVal)) return false;
    return true;
  });

  const totalWon      = quotations.filter(q => q.status==="won").reduce((s,q)=>s+(q.total_amount||0),0);
  const totalPipeline = quotations.filter(q=>["draft","sent","followup"].includes(q.status)).reduce((s,q)=>s+(q.total_amount||0),0);

  return (
    <div className="w-full">
      {showAnalytics && <AnalyticsPanel onClose={()=>setShowAnalytics(false)} />}
      {showCustMgr   && <CustomerManagerModal onClose={()=>setShowCustMgr(false)} />}
      {showFilter    && <FilterPanel quotations={quotations} filters={filters} setFilters={setFilters} onClose={()=>setShowFilter(false)} />}
      {showCreate    && <CreateModal onClose={()=>setShowCreate(false)} onCreated={fetchQ} />}

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quotations</h1>
          <p className="text-sm text-gray-400 mt-0.5">{quotations.length} total • {filtered.length} ditampilkan</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={()=>setShowCustMgr(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 shadow-sm transition-colors">
            🏢 Customers
          </button>
          <button onClick={()=>setShowAnalytics(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 shadow-sm transition-colors">
            📊 Analytics
          </button>
          <button onClick={()=>setShowCreate(true)}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-bold hover:bg-[#1E5CC6] transition-colors shadow-sm">
            + Buat Quotation
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          {label:"Total Quotation", val:quotations.length,          icon:"📄", color:"text-[#0B3D91]", big:true},
          {label:"Won",             val:quotations.filter(q=>q.status==="won").length, icon:"✅", color:"text-emerald-600", big:true},
          {label:"Pipeline Value",  val:fmtRupiah(totalPipeline),   icon:"📈", color:"text-orange-600", big:false},
          {label:"Won Value",       val:fmtRupiah(totalWon),        icon:"💰", color:"text-emerald-600",big:false},
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xl mb-1">{s.icon}</p>
            <p className={`font-black leading-tight ${s.big?"text-2xl":"text-sm"} ${s.color}`}>{s.val}</p>
            <p className="text-xs text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search & Filter bar */}
      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input value={filters.search} onChange={e=>setFilters({...filters,search:e.target.value})}
            placeholder="Cari nomor, customer, project, sales..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white" />
        </div>
        <div className="flex gap-2">
          {/* Quick status buttons */}
          <div className="hidden md:flex gap-1 bg-gray-100 rounded-xl p-1">
            <button onClick={()=>setFilters({...filters,status:""})}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${!filters.status?"bg-white shadow text-[#0B3D91]":"text-gray-500"}`}>All</button>
            {["won","sent","followup","lost"].map(st => (
              <button key={st} onClick={()=>setFilters({...filters,status:filters.status===st?"":st})}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${filters.status===st?"bg-white shadow":"text-gray-500"}`}
                style={filters.status===st?{color:STATUS_CONFIG[st].hex}:{}}>
                {STATUS_CONFIG[st].label}
              </button>
            ))}
          </div>
          <button onClick={()=>setShowFilter(true)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${activeFilters>0?"bg-[#0B3D91] text-white border-[#0B3D91]":"bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            ⚙️ Filter{activeFilters>0?` (${activeFilters})`:""}
          </button>
        </div>
      </div>

      {/* Active filter chips */}
      {activeFilters > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {filters.search    && <Chip label={`Cari: "${filters.search}"`}    onRm={()=>setFilters({...filters,search:""})} />}
          {filters.status    && <Chip label={`Status: ${STATUS_CONFIG[filters.status]?.label}`} onRm={()=>setFilters({...filters,status:""})} />}
          {filters.sales     && <Chip label={`Sales: ${filters.sales}`}      onRm={()=>setFilters({...filters,sales:""})} />}
          {filters.customer  && <Chip label={`Customer: ${filters.customer}`}onRm={()=>setFilters({...filters,customer:""})} />}
          {filters.currency  && <Chip label={`Mata Uang: ${filters.currency}`}onRm={()=>setFilters({...filters,currency:""})} />}
          {filters.dateFrom  && <Chip label={`Dari: ${filters.dateFrom}`}    onRm={()=>setFilters({...filters,dateFrom:""})} />}
          {filters.dateTo    && <Chip label={`Sampai: ${filters.dateTo}`}    onRm={()=>setFilters({...filters,dateTo:""})} />}
          {filters.minVal    && <Chip label={`Min: ${fmtRupiah(filters.minVal)}`} onRm={()=>setFilters({...filters,minVal:""})} />}
          {filters.maxVal    && <Chip label={`Maks: ${fmtRupiah(filters.maxVal)}`} onRm={()=>setFilters({...filters,maxVal:""})} />}
          <button onClick={()=>setFilters({search:"",status:"",sales:"",customer:"",dateFrom:"",dateTo:"",currency:"",minVal:"",maxVal:""})}
            className="px-3 py-1 text-xs font-bold text-red-500 hover:text-red-700 hover:underline">Reset semua</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-[#0B3D91] to-[#1E5CC6] text-white">
                <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide">No. Quotation</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide">Customer</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide hidden md:table-cell">Project</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide hidden lg:table-cell">Sales</th>
                <th className="px-4 py-3.5 text-right text-xs font-bold uppercase tracking-wide hidden sm:table-cell">Nilai</th>
                <th className="px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wide">Status</th>
                <th className="px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wide hidden xl:table-cell">Created</th>
                <th className="px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wide hidden xl:table-cell">Modified</th>
                <th className="px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wide">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr><td colSpan="9" className="px-4 py-12 text-center text-gray-400">
                  <div className="text-3xl mb-2">📋</div>
                  <p className="font-medium">{activeFilters>0?"Tidak ada hasil untuk filter ini":"Belum ada quotation"}</p>
                  {activeFilters===0 && <p className="text-xs mt-1">Klik "+ Buat Quotation" untuk memulai</p>}
                </td></tr>
              ) : filtered.map((q, i) => {
                const sc = STATUS_CONFIG[q.status] || STATUS_CONFIG.draft;
                return (
                  <tr key={q.id} onClick={()=>navigate(`/quotations/${q.id}`)}
                    className={`${i%2===0?"bg-white":"bg-gray-50/40"} hover:bg-blue-50/50 transition-colors cursor-pointer`}>
                    <td className="px-4 py-3.5">
                      <div className="font-mono font-bold text-[#0B3D91] text-xs">{q.quotation_number}</div>
                      {q.revision>0 && <span className="text-[10px] bg-orange-100 text-orange-600 font-bold px-1.5 py-0.5 rounded-full">Rev.{q.revision}</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-gray-800 text-xs leading-tight">{q.customer_company||"-"}</div>
                      <div className="text-gray-400 text-[11px]">{q.customer_name}</div>
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <div className="text-xs text-gray-600 max-w-[160px] truncate">{q.project_name||"-"}</div>
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <div className="text-xs text-gray-500">{q.sales_person||"-"}</div>
                    </td>
                    <td className="px-4 py-3.5 text-right hidden sm:table-cell">
                      <div className="font-bold text-gray-800 text-xs">{fmtRupiah(q.total_amount, q.currency)}</div>
                      {q.currency && q.currency !== "IDR" && <div className="text-[10px] text-gray-400">{q.currency}</div>}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex justify-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${sc.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}/>{sc.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center hidden xl:table-cell">
                      <div className="text-[11px] text-gray-500">{fmtDT(q.created_at)}</div>
                    </td>
                    <td className="px-4 py-3.5 text-center hidden xl:table-cell">
                      <div className="text-[11px] text-gray-500">{fmtDT(q.updated_at)}</div>
                    </td>
                    <td className="px-4 py-3.5 text-center" onClick={e=>e.stopPropagation()}>
                      <button onClick={()=>navigate(`/quotations/${q.id}`)}
                        className="px-3 py-1.5 bg-[#0B3D91] text-white rounded-lg text-xs font-bold hover:bg-[#1E5CC6] transition-colors">
                        Detail
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between">
            <p className="text-xs text-gray-400">Menampilkan {filtered.length} dari {quotations.length} quotation</p>
            <p className="text-xs text-gray-400">Total nilai: <span className="font-bold text-gray-600">{fmtRupiah(filtered.reduce((s,q)=>s+(q.total_amount||0),0))}</span></p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Filter chip component ─────────────────────────────────────────────────────
function Chip({ label, onRm }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#0B3D91]/10 text-[#0B3D91] text-xs font-semibold rounded-full">
      {label}
      <button onClick={onRm} className="hover:bg-[#0B3D91]/20 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-black">✕</button>
    </span>
  );
}