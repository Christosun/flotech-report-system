import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import API from "../services/api";

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_CFG = {
  draft:    { label: "Draft",     color: "bg-gray-100 text-gray-600",       dot: "bg-gray-400",    hex: "#94a3b8" },
  sent:     { label: "Sent",      color: "bg-blue-100 text-blue-700",       dot: "bg-blue-500",    hex: "#3b82f6" },
  followup: { label: "Follow Up", color: "bg-amber-100 text-amber-700",     dot: "bg-amber-500",   hex: "#f59e0b" },
  won:      { label: "Won",       color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500", hex: "#10b981" },
  lost:     { label: "Lost",      color: "bg-red-100 text-red-600",         dot: "bg-red-400",     hex: "#ef4444" },
  cancel:   { label: "Cancelled", color: "bg-gray-100 text-gray-400",       dot: "bg-gray-300",    hex: "#d1d5db" },
};

const EMPTY_ITEM = { description:"", brand:"", model:"", unit:"Unit", qty:1, unit_price:0, discount:0, remarks:"", sub_items:[] };
const EMPTY_SUB  = { sub_label:"", qty:1, unit_price:0, discount:0 };

const CATEGORIES = ["Flow Measurement","Level Measurement","Pressure Measurement",
  "Energy Measurement","Process Analyzer","Service / Repair","Lainnya"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtRp = (v, cur="IDR") => {
  if (v == null || v === "") return "-";
  const n = Number(v);
  if (cur === "IDR") return "Rp " + n.toLocaleString("id-ID");
  return `${cur} ${n.toLocaleString("en-US", { minimumFractionDigits:2 })}`;
};

// Waktu Jakarta WIB (UTC+7)
const toWIB = iso => {
  if (!iso) return null;
  const d = new Date(iso);
  return new Date(d.getTime() + 7 * 60 * 60 * 1000);
};
const fmtDT = iso => {
  const d = toWIB(iso);
  if (!d) return "-";
  return d.toLocaleString("id-ID", { day:"2-digit", month:"short", year:"2-digit", hour:"2-digit", minute:"2-digit" }) + " WIB";
};
const fmtD  = iso => {
  const d = toWIB(iso);
  if (!d) return "-";
  return d.toLocaleDateString("id-ID", { day:"2-digit", month:"short", year:"numeric" });
};

const calcSubItem = s => (parseFloat(s.unit_price)||0)*(parseFloat(s.qty)||0)*(1-(parseFloat(s.discount)||0)/100);
const calcSub = it => {
  if (it.sub_items && it.sub_items.length > 0) return it.sub_items.reduce((s,si) => s+calcSubItem(si), 0);
  return (parseFloat(it.unit_price)||0)*(parseFloat(it.qty)||0)*(1-(parseFloat(it.discount)||0)/100);
};

// ─── Floating Label Field ─────────────────────────────────────────────────────
function Field({ label, type="text", value, onChange, placeholder, required, children, className="", rows=3, readOnly=false }) {
  const base = `peer w-full border rounded-xl px-3 pt-6 pb-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] transition-all
    ${readOnly ? "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed" : "border-gray-200 bg-white"}`;
  const lbl  = "absolute left-3 top-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide pointer-events-none select-none";
  return (
    <div className={`relative ${className}`}>
      {children ? children : (
        type === "select"
          ? <select value={value} onChange={onChange} className={`${base} cursor-pointer`}>{placeholder && <option value="">{placeholder}</option>}</select>
          : type === "textarea"
          ? <textarea value={value} onChange={onChange} rows={rows} placeholder=" " readOnly={readOnly} className={`${base} resize-y`}/>
          : <input type={type} value={value} onChange={onChange} placeholder=" " required={required} readOnly={readOnly} className={base}/>
      )}
      <label className={lbl}>
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        {readOnly && <span className="text-gray-300 ml-1 font-normal normal-case">(otomatis)</span>}
      </label>
    </div>
  );
}

function SelectField({ label, value, onChange, options, placeholder, required, className="" }) {
  const base = "peer w-full border border-gray-200 rounded-xl px-3 pt-6 pb-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white transition-all cursor-pointer";
  const lbl  = "absolute left-3 top-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide pointer-events-none select-none";
  return (
    <div className={`relative ${className}`}>
      <select value={value} onChange={onChange} className={base}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
      </select>
      <label className={lbl}>{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
    </div>
  );
}

// ─── Customer Manager Modal ───────────────────────────────────────────────────
function CustomerModal({ onClose, onSelect }) {
  const [list, setList] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({ company_name:"", address:"", phone:"", email:"", industry:"", notes:"" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try { const r = await API.get("/customer/list"); setList(r.data); } catch {}
  }, []);
  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setEditTarget(null); setForm({ company_name:"",address:"",phone:"",email:"",industry:"",notes:"" }); setShowForm(true); };
  const openEdit = c  => { setEditTarget(c); setForm({ company_name:c.company_name,address:c.address||"",phone:c.phone||"",email:c.email||"",industry:c.industry||"",notes:c.notes||"" }); setShowForm(true); };

  const save = async () => {
    if (!form.company_name.trim()) { toast.error("Nama perusahaan wajib"); return; }
    setSaving(true);
    try {
      if (editTarget) await API.put(`/customer/update/${editTarget.id}`, form);
      else await API.post("/customer/create", form);
      toast.success(editTarget ? "Customer diperbarui ✅" : "Customer ditambahkan 🎉");
      setShowForm(false); load();
    } catch { toast.error("Gagal menyimpan"); }
    finally { setSaving(false); }
  };

  const del = async id => {
    if (!confirm("Hapus customer ini?")) return;
    try { await API.delete(`/customer/delete/${id}`); toast.success("Dihapus"); load(); }
    catch { toast.error("Gagal menghapus"); }
  };

  const filtered = list.filter(c =>
    !search || [c.company_name,c.phone,c.email,c.address].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-bold text-gray-800">🏢 Database Customer</h2>
          <div className="flex items-center gap-2">
            <button onClick={openAdd} className="text-xs font-bold text-[#0B3D91] hover:underline">+ Tambah Baru</button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-lg">✕</button>
          </div>
        </div>

        {showForm && (
          <div className="px-6 py-4 border-b border-gray-100 bg-blue-50/50 shrink-0">
            <p className="text-xs font-bold text-[#0B3D91] uppercase tracking-wide mb-3">{editTarget ? "Edit Customer" : "Tambah Customer Baru"}</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <Field label="Nama Perusahaan" value={form.company_name} onChange={e=>setForm(p=>({...p,company_name:e.target.value}))} required className="col-span-2"/>
              <Field label="Telepon" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))}/>
              <Field label="Email" type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))}/>
              <Field label="Industri" value={form.industry} onChange={e=>setForm(p=>({...p,industry:e.target.value}))}/>
              <Field label="Alamat" value={form.address} onChange={e=>setForm(p=>({...p,address:e.target.value}))}/>
            </div>
            <div className="flex gap-2">
              <button onClick={save} disabled={saving}
                className="flex-1 py-2 bg-[#0B3D91] text-white rounded-xl text-xs font-bold hover:bg-[#1E5CC6] disabled:opacity-60">
                {saving ? "…" : "Simpan"}
              </button>
              <button onClick={() => setShowForm(false)} className="px-3 py-2 border border-gray-200 text-gray-500 text-xs rounded-xl">Batal</button>
            </div>
          </div>
        )}

        <div className="px-6 py-3 border-b border-gray-50 shrink-0">
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Cari perusahaan atau email..."
            className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91]"/>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-gray-400"><div className="text-3xl mb-2">🏢</div><p className="text-sm">Belum ada customer.</p></div>
          ) : filtered.map(c => (
            <div key={c.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50 group">
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onSelect && onSelect(c)}>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-800 text-sm truncate">{c.company_name}</p>
                  {c.industry && <span className="shrink-0 px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-semibold rounded-full">{c.industry}</span>}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                  {c.phone   && <span>📞 {c.phone}</span>}
                  {c.email   && <span>✉ {c.email}</span>}
                  {c.address && <span>📍 {c.address}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
                {onSelect && <button onClick={() => onSelect(c)} className="px-3 py-1.5 bg-[#0B3D91] text-white text-xs font-bold rounded-lg hover:bg-[#1E5CC6]">Pilih</button>}
                <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-[#0B3D91] hover:bg-blue-50 rounded-lg text-xs">✏️</button>
                <button onClick={() => del(c.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg text-xs">🗑</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Analytics Panel ──────────────────────────────────────────────────────────
function AnalyticsPanel({ onClose }) {
  const [analytics, setAnalytics] = useState(null);
  const [mode, setMode] = useState("monthly");
  const [metric, setMetric] = useState("count");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showValue, setShowValue] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]   = useState("");

  useEffect(() => {
    API.get("/quotation/analytics")
      .then(r => setAnalytics(r.data))
      .catch(() => toast.error("Gagal load analytics"));
  }, []);

  const rawData = analytics ? (mode === "monthly" ? analytics.monthly : analytics.yearly) : [];
  const data    = rawData.filter(d => {
    if (dateFrom && d.period < dateFrom.slice(0,7)) return false;
    if (dateTo   && d.period > dateTo.slice(0,7))   return false;
    return true;
  });

  const STATUS_COLORS = {
    draft:"#94a3b8", sent:"#3b82f6", followup:"#f59e0b", won:"#10b981", lost:"#ef4444", cancel:"#d1d5db",
  };
  const statuses = filterStatus === "all" ? Object.keys(STATUS_COLORS) : [filterStatus];

  const maxVal = data.reduce((mx,d) => {
    const v = metric === "count"
      ? statuses.reduce((s,st) => s+(d[st]||0), 0)
      : statuses.reduce((s,st) => s+(d[`${st}_val`]||0), 0);
    return Math.max(mx, v);
  }, 1);

  const totals = { total:0, won:0, won_val:0 };
  (analytics?.monthly || []).forEach(d => { totals.total += d.total||0; totals.won += d.won||0; totals.won_val += d.won_val||0; });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-800">📊 Analytics Quotation</h2>
            <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
              <span>Total: <b className="text-gray-700">{totals.total}</b></span>
              <span>Won: <b className="text-emerald-600">{totals.won}</b></span>
              <span>Won Value: <b className="text-emerald-600">{fmtRp(totals.won_val)}</b></span>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-lg">✕</button>
        </div>

        <div className="flex flex-wrap items-center gap-3 px-6 py-3 border-b border-gray-100 shrink-0 bg-gray-50/50">
          <div className="flex rounded-xl border border-gray-200 overflow-hidden">
            {["monthly","yearly"].map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`px-3 py-1.5 text-xs font-bold transition-all ${mode===m ? "bg-[#0B3D91] text-white" : "text-gray-500 hover:bg-gray-50"}`}>
                {m === "monthly" ? "Bulanan" : "Tahunan"}
              </button>
            ))}
          </div>
          <div className="flex rounded-xl border border-gray-200 overflow-hidden">
            {["count","value"].map(m => (
              <button key={m} onClick={() => setMetric(m)}
                className={`px-3 py-1.5 text-xs font-bold transition-all ${metric===m ? "bg-[#0B3D91] text-white" : "text-gray-500 hover:bg-gray-50"}`}>
                {m === "count" ? "Jumlah" : "Nilai (Rp)"}
              </button>
            ))}
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-[#0B3D91] cursor-pointer">
            <option value="all">Semua Status</option>
            {Object.entries(STATUS_CFG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0B3D91]"/>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0B3D91]"/>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 cursor-pointer select-none">
            <input type="checkbox" checked={showValue} onChange={e => setShowValue(e.target.checked)} className="accent-[#0B3D91]"/>
            Tampilkan Nilai
          </label>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!analytics ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0B3D91]"/>
            </div>
          ) : data.length === 0 ? (
            <div className="text-center text-gray-400 py-12"><p>Tidak ada data untuk filter ini</p></div>
          ) : (
            <div className="space-y-2">
              {data.map(d => {
                const count = statuses.reduce((s,st) => s+(d[st]||0), 0);
                const value = statuses.reduce((s,st) => s+(d[`${st}_val`]||0), 0);
                const barW  = metric === "count" ? Math.max(1, count/maxVal*100) : Math.max(1, value/maxVal*100);
                return (
                  <div key={d.period} className="flex items-center gap-3">
                    <div className="w-16 text-xs font-mono font-bold text-gray-500 shrink-0 text-right">{d.period}</div>
                    <div className="flex-1 relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                      <div className="h-full rounded-lg transition-all duration-500 flex overflow-hidden"
                        style={{ width:`${barW}%` }}>
                        {statuses.map(st => {
                          const v = metric === "count" ? (d[st]||0) : (d[`${st}_val`]||0);
                          const total = metric === "count" ? count : value;
                          const pct   = total > 0 ? v/total*100 : 0;
                          return pct > 0 ? (
                            <div key={st} style={{ width:`${pct}%`, background:STATUS_COLORS[st] }}
                              title={`${STATUS_CFG[st]?.label}: ${metric==="count"?v:fmtRp(v)}`}/>
                          ) : null;
                        })}
                      </div>
                    </div>
                    <div className="w-20 text-xs text-right shrink-0">
                      <span className="font-bold text-gray-700">{metric==="count" ? count : fmtRp(value)}</span>
                    </div>
                    {showValue && metric === "count" && value > 0 && (
                      <div className="w-28 text-xs text-gray-400 text-right shrink-0 hidden lg:block">{fmtRp(value)}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100">
            {statuses.map(st => (
              <div key={st} className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                <div className="w-3 h-3 rounded-full" style={{ background:STATUS_COLORS[st] }}/>
                {STATUS_CFG[st]?.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Filter chip ──────────────────────────────────────────────────────────────
function Chip({ label, onRm }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#0B3D91]/10 text-[#0B3D91] text-xs font-semibold rounded-full">
      {label}
      <button onClick={onRm} className="hover:bg-[#0B3D91]/20 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-black">✕</button>
    </span>
  );
}

// ─── Export Menu ──────────────────────────────────────────────────────────────
function ExportMenu({ filteredIds, onClose }) {
  const [exportingXls, setExportingXls] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const doExport = async type => {
    const setLoading = type === "excel" ? setExportingXls : setExportingPdf;
    setLoading(true);
    try {
      const r = await API.post(`/quotation/export/${type}`, { ids:filteredIds }, { responseType:"blob" });
      const ext = type === "excel" ? "xlsx" : "pdf";
      const url = URL.createObjectURL(new Blob([r.data]));
      Object.assign(document.createElement("a"), { href:url, download:`Quotations_Export.${ext}` }).click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast.success(`Export ${type.toUpperCase()} berhasil!`);
    } catch { toast.error(`Gagal export ${type}`); }
    finally { setLoading(false); onClose(); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">📤 Export Data</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-lg">✕</button>
        </div>
        <div className="p-6 space-y-3">
          <p className="text-xs text-gray-400 mb-4">{filteredIds.length} quotation akan diekspor</p>
          <button onClick={() => doExport("excel")} disabled={exportingXls}
            className="w-full flex items-center gap-3 px-5 py-3.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-bold hover:bg-emerald-100 disabled:opacity-60 transition-all">
            {exportingXls ? <div className="w-5 h-5 border-2 border-emerald-400/40 border-t-emerald-600 rounded-full animate-spin"/> : <span className="text-xl">📊</span>}
            <div className="text-left"><p className="font-bold">Export Excel (.xlsx)</p><p className="text-xs font-normal text-emerald-600">Spreadsheet dengan semua data</p></div>
          </button>
          <button onClick={() => doExport("pdf")} disabled={exportingPdf}
            className="w-full flex items-center gap-3 px-5 py-3.5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-bold hover:bg-red-100 disabled:opacity-60 transition-all">
            {exportingPdf ? <div className="w-5 h-5 border-2 border-red-400/40 border-t-red-600 rounded-full animate-spin"/> : <span className="text-xl">📄</span>}
            <div className="text-left"><p className="font-bold">Export PDF (.pdf)</p><p className="text-xs font-normal text-red-600">Laporan PDF berheader Flotech</p></div>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Filter Panel ─────────────────────────────────────────────────────────────
function FilterPanel({ quotations, filters, setFilters, onClose }) {
  const [local, setLocal] = useState({ ...filters });
  const salesList = [...new Set(quotations.map(q => q.sales_person).filter(Boolean))].sort();
  const custList  = [...new Set(quotations.map(q => q.customer_company).filter(Boolean))].sort();
  const active    = Object.values(local).filter(v => v && v !== "").length;

  const apply = () => { setFilters(local); onClose(); };
  const reset = () => {
    const e = { search:"",status:"",sales:"",customer:"",dateFrom:"",dateTo:"",currency:"",minVal:"",maxVal:"" };
    setLocal(e); setFilters(e); onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-800">🔍 Filter Lanjutan</h2>
            {active > 0 && <p className="text-xs text-[#0B3D91] font-semibold">{active} filter aktif</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-lg">✕</button>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Cari (No/Customer/Project/PIC)" value={local.search} onChange={e=>setLocal({...local,search:e.target.value})} className="sm:col-span-2"/>
          <SelectField label="Status" value={local.status} onChange={e=>setLocal({...local,status:e.target.value})} options={Object.entries(STATUS_CFG).map(([k,v])=>({value:k,label:v.label}))} placeholder="Semua Status"/>
          <SelectField label="Sales Person" value={local.sales} onChange={e=>setLocal({...local,sales:e.target.value})} options={salesList} placeholder="Semua Sales"/>
          <SelectField label="Customer" value={local.customer} onChange={e=>setLocal({...local,customer:e.target.value})} options={custList} placeholder="Semua Customer"/>
          <SelectField label="Mata Uang" value={local.currency} onChange={e=>setLocal({...local,currency:e.target.value})} options={["IDR","USD","SGD","EUR"]} placeholder="Semua Mata Uang"/>
          <Field label="Tanggal Dari"   type="date" value={local.dateFrom} onChange={e=>setLocal({...local,dateFrom:e.target.value})}/>
          <Field label="Tanggal Sampai" type="date" value={local.dateTo}   onChange={e=>setLocal({...local,dateTo:e.target.value})}/>
          <Field label="Nilai Minimum"  type="number" value={local.minVal} onChange={e=>setLocal({...local,minVal:e.target.value})}/>
          <Field label="Nilai Maksimum" type="number" value={local.maxVal} onChange={e=>setLocal({...local,maxVal:e.target.value})}/>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={reset} className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50">Reset Semua</button>
          <button onClick={apply} className="flex-1 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-bold hover:bg-[#1E5CC6]">Terapkan Filter</button>
        </div>
      </div>
    </div>
  );
}

// ─── Create Modal ─────────────────────────────────────────────────────────────
function CreateModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    base_number:"", customer_name:"", customer_company:"", customer_email:"",
    customer_phone:"", customer_address:"", project_name:"", category:"",
    valid_until:"", currency:"IDR", vat_pct:"11", vat_include:false,
    sales_person:"", ref_no:"", shipment_terms:"", delivery:"", payment_terms:"",
    notes:"", terms:"", items:[{ ...EMPTY_ITEM }],
  });
  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCustDB, setShowCustDB] = useState(false);
  const f = form, sf = v => setForm(p => ({ ...p, ...v }));

  useEffect(() => {
    API.get("/quotation/next-number")
      .then(r => sf({ base_number:r.data.number }))
      .catch(() => toast.error("Gagal generate nomor"))
      .finally(() => setLoading(false));
  }, []);

  const addItem    = () => sf({ items:[...f.items, { ...EMPTY_ITEM }] });
  const rmItem     = i  => sf({ items:f.items.filter((_,idx) => idx !== i) });
  const upItem     = (i,k,v) => sf({ items:f.items.map((it,idx) => idx===i ? { ...it,[k]:v } : it) });
  const addSubItem = i  => sf({ items:f.items.map((it,idx) => idx===i ? { ...it, sub_items:[...(it.sub_items||[]),{ ...EMPTY_SUB }] } : it) });
  const rmSubItem  = (i,si) => sf({ items:f.items.map((it,idx) => idx===i ? { ...it, sub_items:it.sub_items.filter((_,s) => s!==si) } : it) });
  const upSubItem  = (i,si,k,v) => sf({ items:f.items.map((it,idx) => idx===i ? { ...it, sub_items:it.sub_items.map((s,sidx) => sidx===si ? { ...s,[k]:v } : s) } : it) });

  const subtotal = f.items.reduce((s,it) => s + calcSub(it), 0);
  const vatAmt   = f.vat_include ? subtotal * (parseFloat(f.vat_pct)||0) / 100 : 0;

  const selectCustomer = c => {
    sf({ customer_company:c.company_name, customer_email:c.email||f.customer_email,
         customer_phone:c.phone||f.customer_phone, customer_address:c.address||f.customer_address });
    setShowCustDB(false);
    toast.success(`"${c.company_name}" dipilih`);
  };

  const submit = async () => {
    if (!f.base_number || !f.customer_name || !f.customer_company) {
      toast.error("Nomor quotation, PIC & perusahaan wajib"); return;
    }
    setSaving(true);
    try {
      await API.post("/quotation/create", { ...f, total_amount:subtotal });
      toast.success("Quotation dibuat! 🎉"); onCreated(); onClose();
    } catch(e) { toast.error(e.response?.data?.error || "Gagal"); }
    finally { setSaving(false); }
  };

  const sectionCls = "space-y-4";
  const sectionHdr = "text-xs font-extrabold text-[#0B3D91] uppercase tracking-widest border-b border-[#0B3D91]/10 pb-1.5";

  return (
    <>
      {showCustDB && <CustomerModal onClose={() => setShowCustDB(false)} onSelect={selectCustomer}/>}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-start justify-center overflow-y-auto py-6 px-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Buat Quotation Baru</h2>
              <p className="text-xs font-mono text-[#0B3D91]">{loading ? "Generating..." : f.base_number}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-lg">✕</button>
          </div>

          <div className="p-6 space-y-7">
            {/* ① Quotation Info */}
            <section className={sectionCls}>
              <h3 className={sectionHdr}>① Informasi Quotation</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* ── No. Quotation READ-ONLY — auto-generated dari server ── */}
                <Field
                  label="No. Quotation" value={f.base_number}
                  onChange={() => {}} readOnly required
                />
                <Field label="Sales Person" value={f.sales_person} onChange={e=>sf({sales_person:e.target.value})}/>
                <Field label="Ref. No."     value={f.ref_no}       onChange={e=>sf({ref_no:e.target.value})}/>
                <Field label="Berlaku s/d"  type="date" value={f.valid_until} onChange={e=>sf({valid_until:e.target.value})}/>
                <SelectField label="Mata Uang" value={f.currency} onChange={e=>sf({currency:e.target.value})} options={["IDR","USD","SGD","EUR"]}/>
                <SelectField label="Kategori" value={f.category} onChange={e=>sf({category:e.target.value})} options={CATEGORIES} placeholder="Pilih kategori"/>
              </div>
            </section>

            {/* ② Customer Info */}
            <section className={sectionCls}>
              <div className="flex items-center justify-between">
                <h3 className={sectionHdr}>② Informasi Customer</h3>
                <button onClick={() => setShowCustDB(true)} className="text-xs font-bold text-[#0B3D91] hover:underline">📋 Pilih dari Database</button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Field label="Nama PIC"   value={f.customer_name}    onChange={e=>sf({customer_name:e.target.value})}    required/>
                <Field label="Perusahaan" value={f.customer_company} onChange={e=>sf({customer_company:e.target.value})} required/>
                <Field label="Email" type="email" value={f.customer_email} onChange={e=>sf({customer_email:e.target.value})}/>
                <Field label="Telepon"    value={f.customer_phone}   onChange={e=>sf({customer_phone:e.target.value})}/>
                <Field label="Alamat"     value={f.customer_address} onChange={e=>sf({customer_address:e.target.value})} className="sm:col-span-2"/>
                <Field label="Subject / Project" value={f.project_name} onChange={e=>sf({project_name:e.target.value})} className="sm:col-span-2"/>
              </div>
            </section>

            {/* ③ Items */}
            <section className={sectionCls}>
              <div className="flex items-center justify-between">
                <h3 className={sectionHdr}>③ Item &amp; Harga</h3>
                <button onClick={addItem} className="text-xs font-bold text-[#0B3D91] hover:underline">+ Tambah Item</button>
              </div>
              {/* VAT toggle */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <input type="checkbox" id="vat_create" checked={!!f.vat_include}
                  onChange={e => sf({ vat_include:e.target.checked })} className="w-4 h-4 accent-[#0B3D91]"/>
                <label htmlFor="vat_create" className="text-sm font-semibold text-gray-700 cursor-pointer flex-1">Sertakan VAT / PPN</label>
                {f.vat_include && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">VAT</span>
                    <input type="number" value={f.vat_pct} onChange={e => sf({ vat_pct:e.target.value })}
                      className="w-14 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#0B3D91]"
                      min="0" max="100"/>
                    <span className="text-xs text-gray-500">%</span>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                {f.items.map((item, i) => (
                  <div key={`create-item-${i}`} className="bg-gray-50/80 rounded-xl p-4 border border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-extrabold text-gray-300 uppercase">Item {i+1}</span>
                      {f.items.length > 1 && <button onClick={() => rmItem(i)} className="text-xs text-red-400 hover:text-red-600 font-semibold">Hapus</button>}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <Field label="Deskripsi Produk / Jasa" type="textarea" rows={2}
                        value={item.description} onChange={e => upItem(i,"description",e.target.value)}
                        required className="col-span-2 sm:col-span-4"/>
                      <Field label="Brand"               value={item.brand}   onChange={e => upItem(i,"brand",e.target.value)}/>
                      <Field label="Model / Part Number" value={item.model}   onChange={e => upItem(i,"model",e.target.value)}/>
                      <Field label="Keterangan / Spec" type="textarea" rows={2}
                        value={item.remarks} onChange={e => upItem(i,"remarks",e.target.value)} className="col-span-2"/>
                    </div>

                    {(!item.sub_items || item.sub_items.length === 0) ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-2.5">
                        <Field label="Qty"          type="number" value={item.qty}       onChange={e => upItem(i,"qty",e.target.value)}/>
                        <Field label="Satuan (UOM)"               value={item.unit}       onChange={e => upItem(i,"unit",e.target.value)}/>
                        <Field label="Harga Satuan" type="number" value={item.unit_price} onChange={e => upItem(i,"unit_price",e.target.value)}/>
                        <Field label="Diskon %"     type="number" value={item.discount}   onChange={e => upItem(i,"discount",e.target.value)}/>
                      </div>
                    ) : (
                      <div className="mt-3 space-y-2">
                        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wide">↳ Variants / Sub-Items</p>
                        {item.sub_items.map((s, si) => (
                          <div key={`create-item-${i}-sub-${si}`}
                            className="flex items-center gap-2 bg-white rounded-lg p-2.5 border border-blue-100">
                            <span className="text-[10px] font-bold text-blue-400 shrink-0">{i+1}.{si+1}</span>
                            <input placeholder="Size / Label" value={s.sub_label}
                              onChange={e => upSubItem(i,si,"sub_label",e.target.value)}
                              className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0B3D91] min-w-0"/>
                            <input placeholder="Qty" type="number" value={s.qty}
                              onChange={e => upSubItem(i,si,"qty",e.target.value)}
                              className="w-14 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-2 focus:ring-[#0B3D91]"/>
                            <input placeholder="Harga" type="number" value={s.unit_price}
                              onChange={e => upSubItem(i,si,"unit_price",e.target.value)}
                              className="w-28 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0B3D91]"/>
                            <input placeholder="Disc%" type="number" value={s.discount}
                              onChange={e => upSubItem(i,si,"discount",e.target.value)}
                              className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-2 focus:ring-[#0B3D91]"/>
                            <span className="text-[10px] font-bold text-[#0B3D91] shrink-0 min-w-[60px] text-right">
                              {fmtRp(calcSubItem(s), f.currency)}
                            </span>
                            <button onClick={() => rmSubItem(i,si)} className="text-red-400 hover:text-red-600 shrink-0 text-xs font-bold px-1">✕</button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                      <button onClick={() => addSubItem(i)}
                        className="text-[10px] font-bold text-blue-500 hover:text-blue-700 hover:underline">
                        + {(!item.sub_items || item.sub_items.length === 0) ? "Tambah Variant (size berbeda)" : "Tambah Variant"}
                      </button>
                      <div className="text-right">
                        <span className="text-xs text-gray-400">Subtotal: </span>
                        <span className="text-sm font-black text-[#0B3D91]">{fmtRp(calcSub(item), f.currency)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 p-4 bg-[#0B3D91]/5 rounded-xl border border-[#0B3D91]/10 text-right space-y-1">
                <p><span className="text-xs text-gray-500">Subtotal: </span><span className="text-sm font-bold text-gray-700">{fmtRp(subtotal, f.currency)}</span></p>
                {f.vat_include && <p><span className="text-xs text-gray-500">VAT {f.vat_pct}%: </span><span className="text-sm font-bold text-gray-700">{fmtRp(vatAmt, f.currency)}</span></p>}
                <p><span className="text-sm font-bold text-gray-600">TOTAL: </span><span className="text-lg font-black text-[#0B3D91]">{fmtRp(subtotal + vatAmt, f.currency)}</span></p>
              </div>
            </section>

            {/* ④ Terms */}
            <section className={sectionCls}>
              <h3 className={sectionHdr}>④ Terms &amp; Conditions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Shipment Terms"            value={f.shipment_terms} onChange={e=>sf({shipment_terms:e.target.value})}/>
                <Field label="Payment Terms"             value={f.payment_terms}  onChange={e=>sf({payment_terms:e.target.value})}/>
                <Field label="Delivery / Lead Time"      value={f.delivery}       onChange={e=>sf({delivery:e.target.value})}/>
                <Field label="Note untuk Customer"       value={f.notes}          onChange={e=>sf({notes:e.target.value})}/>
                <Field label="Terms Tambahan (opsional)" type="textarea" value={f.terms} onChange={e=>sf({terms:e.target.value})} className="sm:col-span-2"/>
              </div>
            </section>
          </div>

          <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-0 bg-white rounded-b-2xl">
            <p className="text-xs text-gray-400">Revision auto-increment saat ada perubahan item/harga/terms</p>
            <div className="flex gap-3 w-full sm:w-auto">
              <button onClick={onClose} className="flex-1 sm:flex-none px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50">Batal</button>
              <button onClick={submit} disabled={saving}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-bold hover:bg-[#1E5CC6] disabled:opacity-60">
                {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>}
                {saving ? "Menyimpan..." : "Simpan Quotation"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Quotations() {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState([]);
  const [showCreate,    setShowCreate]    = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showCustMgr,   setShowCustMgr]   = useState(false);
  const [showFilter,    setShowFilter]    = useState(false);
  const [showExport,    setShowExport]    = useState(false);
  const [filters, setFilters] = useState({
    search:"", status:"", sales:"", customer:"", dateFrom:"", dateTo:"", currency:"", minVal:"", maxVal:""
  });

  const fetchQ = useCallback(async () => {
    try { const r = await API.get("/quotation/list"); setQuotations(r.data); }
    catch { toast.error("Gagal memuat quotation"); }
  }, []);
  useEffect(() => { fetchQ(); }, [fetchQ]);

  const activeFilters = Object.values(filters).filter(v => v && v !== "").length;

  const filtered = quotations.filter(q => {
    const { search,status,sales,customer,dateFrom,dateTo,currency,minVal,maxVal } = filters;
    if (search) {
      const s = search.toLowerCase();
      if (![q.quotation_number,q.customer_name,q.customer_company,q.project_name,q.sales_person].some(f => f?.toLowerCase().includes(s))) return false;
    }
    if (status   && q.status !== status)                             return false;
    if (sales    && q.sales_person !== sales)                        return false;
    if (customer && q.customer_company !== customer)                 return false;
    if (currency && q.currency !== currency)                         return false;
    if (dateFrom && q.created_at < dateFrom)                         return false;
    if (dateTo   && q.created_at > dateTo + "T23:59:59")             return false;
    if (minVal   && (q.total_amount||0) < parseFloat(minVal))        return false;
    if (maxVal   && (q.total_amount||0) > parseFloat(maxVal))        return false;
    return true;
  });

  const totalWon      = quotations.filter(q => q.status === "won").reduce((s,q) => s+(q.total_amount||0), 0);
  const totalPipeline = quotations.filter(q => ["draft","sent","followup"].includes(q.status)).reduce((s,q) => s+(q.total_amount||0), 0);

  return (
    <div className="w-full">
      {showAnalytics && <AnalyticsPanel onClose={() => setShowAnalytics(false)}/>}
      {showCustMgr   && <CustomerModal  onClose={() => setShowCustMgr(false)}/>}
      {showFilter    && <FilterPanel quotations={quotations} filters={filters} setFilters={setFilters} onClose={() => setShowFilter(false)}/>}
      {showCreate    && <CreateModal onClose={() => setShowCreate(false)} onCreated={fetchQ}/>}
      {showExport    && <ExportMenu filteredIds={filtered.map(q => q.id)} onClose={() => setShowExport(false)}/>}

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quotations</h1>
          <p className="text-sm text-gray-400 mt-0.5">{quotations.length} total • {filtered.length} ditampilkan</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setShowCustMgr(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 shadow-sm">
            🏢 Customers
          </button>
          <button onClick={() => setShowAnalytics(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 shadow-sm">
            📊 Analytics
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-bold hover:bg-[#1E5CC6] shadow-sm">
            + Buat Quotation
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label:"Total Quotation", val:quotations.length,                                         icon:"📄", color:"text-[#0B3D91]", big:true },
          { label:"Won",             val:quotations.filter(q=>q.status==="won").length,              icon:"✅", color:"text-emerald-600", big:true },
          { label:"Pipeline Value",  val:fmtRp(totalPipeline),                                      icon:"📈", color:"text-orange-600" },
          { label:"Won Value",       val:fmtRp(totalWon),                                            icon:"💰", color:"text-emerald-600" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xl mb-1">{s.icon}</p>
            <p className={`font-black leading-tight ${s.big ? "text-2xl" : "text-lg"} ${s.color}`}>{s.val}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex-1 min-w-[200px] max-w-xs relative">
          <input value={filters.search} onChange={e => setFilters({ ...filters, search:e.target.value })}
            placeholder="🔍 Cari quotation..."
            className="w-full pl-4 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] shadow-sm"/>
        </div>
        <div className="flex rounded-xl bg-white border border-gray-200 overflow-hidden shadow-sm">
          {[["all","Semua"],...Object.entries(STATUS_CFG).map(([k,v])=>[k,v.label])].map(([st,lbl]) => (
            <button key={st} onClick={() => setFilters({ ...filters, status:st === "all" ? "" : st })}
              className={`px-3 py-1.5 text-xs font-bold transition-all ${
                (filters.status === st || (st === "all" && !filters.status))
                  ? "bg-white shadow"
                  : "text-gray-500"
              }`}
              style={(filters.status === st && st !== "all") ? { color:STATUS_CFG[st].hex } : {}}>
              {lbl}
            </button>
          ))}
        </div>
        <button onClick={() => setShowFilter(true)}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all
            ${activeFilters > 0 ? "bg-[#0B3D91] text-white border-[#0B3D91]" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
          ⚙️ Filter{activeFilters > 0 ? ` (${activeFilters})` : ""}
        </button>
        <button onClick={() => setShowExport(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold border bg-white border-gray-200 text-gray-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all">
          📤 Export
        </button>
      </div>

      {/* Active filter chips */}
      {activeFilters > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {filters.search   && <Chip label={`Cari: "${filters.search}"`}         onRm={() => setFilters({...filters,search:""})}/>}
          {filters.status   && <Chip label={`Status: ${STATUS_CFG[filters.status]?.label}`} onRm={() => setFilters({...filters,status:""})}/>}
          {filters.sales    && <Chip label={`Sales: ${filters.sales}`}           onRm={() => setFilters({...filters,sales:""})}/>}
          {filters.customer && <Chip label={`Customer: ${filters.customer}`}     onRm={() => setFilters({...filters,customer:""})}/>}
          {filters.currency && <Chip label={`Mata Uang: ${filters.currency}`}    onRm={() => setFilters({...filters,currency:""})}/>}
          {filters.dateFrom && <Chip label={`Dari: ${filters.dateFrom}`}         onRm={() => setFilters({...filters,dateFrom:""})}/>}
          {filters.dateTo   && <Chip label={`Sampai: ${filters.dateTo}`}         onRm={() => setFilters({...filters,dateTo:""})}/>}
          {filters.minVal   && <Chip label={`Min: ${fmtRp(filters.minVal)}`}     onRm={() => setFilters({...filters,minVal:""})}/>}
          {filters.maxVal   && <Chip label={`Maks: ${fmtRp(filters.maxVal)}`}    onRm={() => setFilters({...filters,maxVal:""})}/>}
          <button onClick={() => setFilters({search:"",status:"",sales:"",customer:"",dateFrom:"",dateTo:"",currency:"",minVal:"",maxVal:""})}
            className="px-3 py-1 text-xs font-bold text-red-500 hover:underline">
            Reset semua
          </button>
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
                <th className="px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wide hidden xl:table-cell">Dibuat</th>
                <th className="px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wide hidden xl:table-cell">Diubah</th>
                <th className="px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wide">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr><td colSpan="9" className="px-4 py-12 text-center text-gray-400">
                  <div className="text-3xl mb-2">📋</div>
                  <p className="font-medium">{activeFilters > 0 ? "Tidak ada hasil untuk filter ini" : "Belum ada quotation"}</p>
                  {activeFilters === 0 && <p className="text-xs mt-1">Klik "+ Buat Quotation" untuk mulai</p>}
                </td></tr>
              ) : filtered.map((q, i) => {
                const sc = STATUS_CFG[q.status] || STATUS_CFG.draft;
                return (
                  <tr key={q.id} onClick={() => navigate(`/quotations/${q.id}`)}
                    className={`${i%2===0?"bg-white":"bg-gray-50/40"} hover:bg-blue-50/50 cursor-pointer transition-colors`}>
                    <td className="px-4 py-3.5">
                      <div className="font-mono font-bold text-[#0B3D91] text-xs">{q.quotation_number}</div>
                      {q.revision > 0 && (
                        <span className="text-[10px] bg-orange-100 text-orange-600 font-bold px-1.5 py-0.5 rounded-full">Rev.{q.revision}</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-gray-800 text-xs truncate max-w-[160px]">{q.customer_company || "-"}</div>
                      <div className="text-xs text-gray-400 truncate max-w-[160px]">{q.customer_name}</div>
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <div className="text-xs text-gray-600 truncate max-w-[200px]">{q.project_name || "-"}</div>
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <div className="text-xs text-gray-500">{q.sales_person || "-"}</div>
                    </td>
                    <td className="px-4 py-3.5 text-right hidden sm:table-cell">
                      <div className="text-xs font-bold text-gray-800">{fmtRp(q.total_amount, q.currency)}</div>
                      {q.currency !== "IDR" && <div className="text-[10px] text-gray-400">{q.currency}</div>}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${sc.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}/>{sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center text-[10px] text-gray-400 hidden xl:table-cell">{fmtD(q.created_at)}</td>
                    <td className="px-4 py-3.5 text-center text-[10px] text-gray-400 hidden xl:table-cell">{fmtDT(q.updated_at)}</td>
                    <td className="px-4 py-3.5 text-center" onClick={e => e.stopPropagation()}>
                      <button onClick={() => navigate(`/quotations/${q.id}`)}
                        className="px-3 py-1.5 bg-[#0B3D91]/10 text-[#0B3D91] rounded-lg text-[10px] font-bold hover:bg-[#0B3D91]/20 transition-colors">
                        Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}