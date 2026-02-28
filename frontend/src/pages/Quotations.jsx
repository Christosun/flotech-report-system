import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import API from "../services/api";

const STATUS_CONFIG = {
  draft:    { label: "Draft",     color: "bg-gray-100 text-gray-600",    dot: "bg-gray-400"    },
  sent:     { label: "Sent",      color: "bg-blue-100 text-blue-700",    dot: "bg-blue-500"    },
  followup: { label: "Follow Up", color: "bg-yellow-100 text-yellow-700",dot: "bg-yellow-500"  },
  won:      { label: "Won",       color: "bg-emerald-100 text-emerald-700",dot:"bg-emerald-500" },
  lost:     { label: "Lost",      color: "bg-red-100 text-red-600",      dot: "bg-red-400"     },
  cancel:   { label: "Cancelled", color: "bg-gray-100 text-gray-400",    dot: "bg-gray-300"    },
};

const CHART_COLORS = {
  draft:    "#94a3b8",
  sent:     "#3b82f6",
  followup: "#f59e0b",
  won:      "#10b981",
  lost:     "#ef4444",
};

const EMPTY_ITEM = { description: "", brand: "", model: "", unit: "Unit", qty: 1, unit_price: 0, discount: 0, remarks: "" };

function formatRupiah(v) {
  if (!v && v !== 0) return "-";
  return "Rp " + Number(v).toLocaleString("id-ID");
}

function formatDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "2-digit" });
}

function formatDateTime(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

// ── Simple Bar Chart ─────────────────────────────────────────────────────────
function MiniBarChart({ data, metric, currency }) {
  if (!data || data.length === 0) return <div className="text-center text-sm text-gray-400 py-8">Tidak ada data</div>;
  
  const statuses = ["won", "sent", "followup", "draft", "lost"];
  const maxVal = Math.max(...data.map(d => statuses.reduce((s, st) => s + (d[metric === "value" ? `${st}_val` : st] || 0), 0)), 1);
  
  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-end gap-1 min-w-max px-2 pb-2" style={{ height: "180px" }}>
        {data.map((d, i) => {
          const total = statuses.reduce((s, st) => s + (d[metric === "value" ? `${st}_val` : st] || 0), 0);
          const pct = total / maxVal;
          const label = d.period.length === 7
            ? new Date(d.period + "-01").toLocaleDateString("id-ID", { month: "short", year: "2-digit" })
            : d.period;
          return (
            <div key={i} className="flex flex-col items-center gap-1 group" style={{ minWidth: "42px" }}>
              <div className="relative flex flex-col justify-end items-center" style={{ height: "140px", width: "28px" }}>
                {/* Stacked bar */}
                <div className="w-full flex flex-col-reverse overflow-hidden rounded-t" style={{ height: `${pct * 140}px`, minHeight: total > 0 ? 4 : 0 }}>
                  {statuses.map(st => {
                    const val = d[metric === "value" ? `${st}_val` : st] || 0;
                    const segPct = total > 0 ? val / total : 0;
                    return segPct > 0 ? (
                      <div key={st} title={`${STATUS_CONFIG[st]?.label}: ${metric === "value" ? formatRupiah(val) : val}`}
                        style={{ height: `${segPct * 100}%`, backgroundColor: CHART_COLORS[st], minHeight: 2 }}
                        className="transition-all" />
                    ) : null;
                  })}
                </div>
                {/* Tooltip on hover */}
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                  {metric === "value" ? formatRupiah(total) : `${total} quotations`}
                </div>
              </div>
              <span className="text-[9px] text-gray-500 text-center leading-tight">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Analytics Panel ───────────────────────────────────────────────────────────
function AnalyticsPanel({ onClose }) {
  const [analytics, setAnalytics] = useState(null);
  const [mode, setMode] = useState("monthly"); // monthly | yearly
  const [metric, setMetric] = useState("count"); // count | value
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    API.get("/quotation/analytics").then(r => setAnalytics(r.data)).catch(() => toast.error("Gagal memuat analytics"));
  }, []);

  const rawData = analytics ? (mode === "monthly" ? analytics.monthly : analytics.yearly) : [];

  // Filter last 12 months or all years
  const data = mode === "monthly" ? rawData.slice(-12) : rawData;

  // Summary for selected status
  const totalCount = data.reduce((s, d) => s + (filterStatus === "all" ? d.total : (d[filterStatus] || 0)), 0);
  const totalValue = data.reduce((s, d) => {
    if (filterStatus === "all") {
      return s + ["won","sent","followup","draft","lost"].reduce((ss, st) => ss + (d[`${st}_val`] || 0), 0);
    }
    return s + (d[`${filterStatus}_val`] || 0);
  }, 0);

  const chartData = filterStatus === "all" ? data : data.map(d => ({
    ...d,
    [filterStatus]: d[filterStatus] || 0,
    [`${filterStatus}_val`]: d[`${filterStatus}_val`] || 0,
  }));

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-800">📊 Quotation Analytics</h2>
            <p className="text-xs text-gray-400">Analisis trend dan performa quotation</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">✕</button>
        </div>

        <div className="p-6 space-y-6">
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Period toggle */}
            <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
              {[["monthly","Bulanan"],["yearly","Tahunan"]].map(([v,l]) => (
                <button key={v} onClick={() => setMode(v)}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${mode === v ? "bg-white shadow text-[#0B3D91]" : "text-gray-500 hover:text-gray-700"}`}>
                  {l}
                </button>
              ))}
            </div>
            {/* Metric toggle */}
            <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
              {[["count","Jumlah"],["value","Nilai (IDR)"]].map(([v,l]) => (
                <button key={v} onClick={() => setMetric(v)}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${metric === v ? "bg-white shadow text-[#0B3D91]" : "text-gray-500 hover:text-gray-700"}`}>
                  {l}
                </button>
              ))}
            </div>
            {/* Status filter */}
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setFilterStatus("all")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all ${filterStatus === "all" ? "bg-[#0B3D91] text-white border-[#0B3D91]" : "border-gray-200 text-gray-500 hover:border-[#0B3D91]"}`}>
                All
              </button>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <button key={k} onClick={() => setFilterStatus(k)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all ${filterStatus === k ? "text-white border-transparent" : "border-gray-200 text-gray-500 hover:border-current"}`}
                  style={filterStatus === k ? { backgroundColor: CHART_COLORS[k], borderColor: CHART_COLORS[k] } : {}}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Quotations", val: totalCount, icon: "📄", sub: "periode ini" },
              { label: "Total Nilai", val: formatRupiah(totalValue), icon: "💰", sub: "periode ini", small: true },
              { label: "Won", val: data.reduce((s,d) => s + (d.won||0), 0), icon: "✅", sub: "berhasil" },
              { label: "Win Rate", val: totalCount > 0 ? `${Math.round(data.reduce((s,d)=>s+(d.won||0),0)/totalCount*100)}%` : "0%", icon: "🎯", sub: "dari total" },
            ].map(s => (
              <div key={s.label} className="bg-gradient-to-br from-gray-50 to-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <div className="text-xl mb-1">{s.icon}</div>
                <div className={`font-black text-gray-800 ${s.small ? "text-sm" : "text-xl"} leading-tight`}>{s.val}</div>
                <div className="text-xs text-gray-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="bg-gray-50 rounded-2xl p-4">
            <h3 className="text-sm font-bold text-gray-700 mb-4">
              {metric === "count" ? "Jumlah Quotation" : "Nilai Quotation"} — {mode === "monthly" ? "12 Bulan Terakhir" : "Per Tahun"}
            </h3>
            {!analytics ? (
              <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0B3D91]" /></div>
            ) : (
              <MiniBarChart data={chartData} metric={metric} />
            )}
            
            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-3 justify-center">
              {(filterStatus === "all" ? Object.entries(CHART_COLORS) : [[filterStatus, CHART_COLORS[filterStatus]]]).map(([k, c]) => (
                <div key={k} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />
                  <span className="text-xs text-gray-500">{STATUS_CONFIG[k]?.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Per-status breakdown table */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3">Breakdown per Status</h3>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#0B3D91] text-white">
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Jumlah</th>
                    <th className="px-4 py-3 text-right">Total Nilai</th>
                    <th className="px-4 py-3 text-right">% dari Total</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(STATUS_CONFIG).map(([k, v], i) => {
                    const cnt = data.reduce((s, d) => s + (d[k] || 0), 0);
                    const val = data.reduce((s, d) => s + (d[`${k}_val`] || 0), 0);
                    const pct = totalCount > 0 ? Math.round(cnt / totalCount * 100) : 0;
                    return (
                      <tr key={k} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${v.dot}`} />
                            <span className="font-medium text-gray-700">{v.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-gray-800">{cnt}</td>
                        <td className="px-4 py-2.5 text-right text-gray-600">{formatRupiah(val)}</td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: CHART_COLORS[k] }} />
                            </div>
                            <span className="text-gray-500 w-8 text-right">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Quotations Page ──────────────────────────────────────────────────────
export default function Quotations() {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [loadingNumber, setLoadingNumber] = useState(false);

  const [form, setForm] = useState({
    base_number: "", customer_name: "", customer_company: "", customer_email: "",
    customer_phone: "", customer_address: "", project_name: "", category: "",
    valid_until: "", currency: "IDR", notes: "",
    terms: "",
    sales_person: "", ref_no: "",
    shipment_terms: "Franco Jakarta",
    delivery: "10-12 Weeks ARO",
    payment_terms: "Cash Advance",
    items: [{ ...EMPTY_ITEM }],
  });

  const fetchQuotations = useCallback(async () => {
    try {
      const res = await API.get("/quotation/list");
      setQuotations(res.data);
    } catch { toast.error("Gagal memuat quotation"); }
  }, []);

  useEffect(() => { fetchQuotations(); }, [fetchQuotations]);

  const openCreate = async () => {
    setLoadingNumber(true);
    try {
      const res = await API.get("/quotation/next-number");
      setForm(f => ({ ...f, base_number: res.data.number }));
    } catch {
      toast.error("Gagal generate nomor");
    } finally {
      setLoadingNumber(false);
    }
    setShowCreate(true);
  };

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }));
  const removeItem = i => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateItem = (i, field, val) => setForm(f => ({
    ...f, items: f.items.map((item, idx) => idx === i ? { ...item, [field]: val } : item),
  }));
  const calcSubtotal = item => (parseFloat(item.unit_price) || 0) * (parseFloat(item.qty) || 0) * (1 - (parseFloat(item.discount) || 0) / 100);
  const totalAmount = form.items.reduce((s, item) => s + calcSubtotal(item), 0);

  const handleSubmit = async () => {
    if (!form.base_number || !form.customer_name || !form.customer_company) {
      toast.error("Nomor quotation, nama & perusahaan customer wajib diisi"); return;
    }
    setSaving(true);
    try {
      await API.post("/quotation/create", { ...form, total_amount: totalAmount });
      toast.success("Quotation berhasil dibuat! 🎉");
      setShowCreate(false);
      setForm({
        base_number: "", customer_name: "", customer_company: "", customer_email: "",
        customer_phone: "", customer_address: "", project_name: "", category: "",
        valid_until: "", currency: "IDR", notes: "",
        terms: "",
        sales_person: "", ref_no: "",
        shipment_terms: "Franco Jakarta", delivery: "10-12 Weeks ARO", payment_terms: "Cash Advance",
        items: [{ ...EMPTY_ITEM }],
      });
      fetchQuotations();
    } catch (err) { toast.error(err.response?.data?.error || "Gagal membuat quotation"); }
    finally { setSaving(false); }
  };

  const filtered = quotations.filter(q => {
    const matchSearch = !search ||
      [q.quotation_number, q.customer_name, q.customer_company, q.project_name]
        .some(s => s?.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = !filterStatus || q.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalWon      = quotations.filter(q => q.status === "won").reduce((s, q) => s + (q.total_amount || 0), 0);
  const totalPipeline = quotations.filter(q => ["draft", "sent", "followup"].includes(q.status)).reduce((s, q) => s + (q.total_amount || 0), 0);

  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white";
  const labelClass = "block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5";

  return (
    <div className="w-full">
      {showAnalytics && <AnalyticsPanel onClose={() => setShowAnalytics(false)} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quotations</h1>
          <p className="text-sm text-gray-400 mt-0.5">{quotations.length} total • {filtered.length} ditampilkan</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowAnalytics(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors shadow-sm">
            📊 Analytics
          </button>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-semibold hover:bg-[#1E5CC6] transition-colors">
            + Buat Quotation
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Quotation", val: quotations.length,                                     icon: "📄", color: "text-blue-600",   small: false },
          { label: "Won",             val: quotations.filter(q => q.status === "won").length,     icon: "✅", color: "text-emerald-600", small: false },
          { label: "Pipeline Value",  val: formatRupiah(totalPipeline),                           icon: "📈", color: "text-orange-600", small: true  },
          { label: "Won Value",       val: formatRupiah(totalWon),                                icon: "💰", color: "text-emerald-600",small: true  },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xl mb-1">{s.icon}</p>
            <p className={`font-black ${s.small ? "text-sm" : "text-2xl"} ${s.color} leading-tight`}>{s.val}</p>
            <p className="text-xs text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari nomor, customer, project..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white min-w-[140px]">
          <option value="">Semua Status</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

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
                <th className="px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wide hidden xl:table-cell">Created At</th>
                <th className="px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wide hidden xl:table-cell">Modified At</th>
                <th className="px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wide">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr><td colSpan="9" className="px-4 py-12 text-center text-gray-400">
                  <div className="text-3xl mb-2">📋</div>
                  <p className="font-medium">Belum ada quotation</p>
                  <p className="text-xs mt-1">Klik "Buat Quotation" untuk memulai</p>
                </td></tr>
              ) : filtered.map((q, i) => {
                const sc = STATUS_CONFIG[q.status] || STATUS_CONFIG.draft;
                return (
                  <tr key={q.id} className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"} hover:bg-blue-50/40 transition-colors cursor-pointer`}
                    onClick={() => navigate(`/quotations/${q.id}`)}>
                    <td className="px-4 py-3.5">
                      <div className="font-mono font-bold text-[#0B3D91] text-xs">{q.quotation_number}</div>
                      {q.revision > 0 && (
                        <span className="text-[10px] bg-orange-100 text-orange-600 font-semibold px-1.5 py-0.5 rounded-full">Rev.{q.revision}</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-gray-800 text-xs leading-tight">{q.customer_company || "-"}</div>
                      <div className="text-gray-400 text-[11px]">{q.customer_name}</div>
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <div className="text-xs text-gray-600 max-w-[160px] truncate">{q.project_name || "-"}</div>
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <div className="text-xs text-gray-500">{q.sales_person || "-"}</div>
                    </td>
                    <td className="px-4 py-3.5 text-right hidden sm:table-cell">
                      <div className="font-bold text-gray-800 text-xs">{formatRupiah(q.total_amount)}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex justify-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${sc.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                          {sc.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center hidden xl:table-cell">
                      <div className="text-[11px] text-gray-500">{formatDateTime(q.created_at)}</div>
                    </td>
                    <td className="px-4 py-3.5 text-center hidden xl:table-cell">
                      <div className="text-[11px] text-gray-500">{formatDateTime(q.updated_at)}</div>
                    </td>
                    <td className="px-4 py-3.5 text-center" onClick={e => e.stopPropagation()}>
                      <button onClick={() => navigate(`/quotations/${q.id}`)}
                        className="px-3 py-1.5 bg-[#0B3D91] text-white rounded-lg text-xs font-semibold hover:bg-[#1E5CC6] transition-colors">
                        Detail
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto py-6 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Buat Quotation Baru</h2>
                <p className="text-xs text-gray-400 font-mono">{form.base_number || "Generating..."}</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">✕</button>
            </div>

            <div className="p-6 space-y-6">
              {/* ① Quotation Info */}
              <div>
                <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3">① Informasi Quotation</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>No. Quotation *</label>
                    <input value={form.base_number}
                      onChange={e => setForm({ ...form, base_number: e.target.value })}
                      placeholder={loadingNumber ? "Generating..." : "SQ2510001"}
                      className={`${inputClass} font-mono`} />
                  </div>
                  <div>
                    <label className={labelClass}>Sales Person</label>
                    <input value={form.sales_person} onChange={e => setForm({ ...form, sales_person: e.target.value })}
                      placeholder="Nama sales" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Ref. No.</label>
                    <input value={form.ref_no} onChange={e => setForm({ ...form, ref_no: e.target.value })}
                      placeholder="Ref customer" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Mata Uang</label>
                    <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} className={inputClass}>
                      <option>IDR</option><option>USD</option><option>SGD</option><option>EUR</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Berlaku Hingga</label>
                    <input type="date" value={form.valid_until} onChange={e => setForm({ ...form, valid_until: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Kategori</label>
                    <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={inputClass}>
                      <option value="">Pilih kategori</option>
                      <option>Flow Measurement</option>
                      <option>Level Measurement</option>
                      <option>Pressure Measurement</option>
                      <option>Energy Measurement</option>
                      <option>Process Analyzer</option>
                      <option>Service / Repair</option>
                      <option>Lainnya</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* ② Customer */}
              <div>
                <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3">② Data Customer</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Nama Customer *</label>
                    <input value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })}
                      placeholder="Nama PIC / kontak" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Perusahaan *</label>
                    <input value={form.customer_company} onChange={e => setForm({ ...form, customer_company: e.target.value })}
                      placeholder="PT / CV ..." className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Email</label>
                    <input type="email" value={form.customer_email} onChange={e => setForm({ ...form, customer_email: e.target.value })}
                      placeholder="email@company.com" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Telepon</label>
                    <input value={form.customer_phone} onChange={e => setForm({ ...form, customer_phone: e.target.value })}
                      placeholder="+62..." className={inputClass} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Alamat</label>
                    <textarea rows={2} value={form.customer_address} onChange={e => setForm({ ...form, customer_address: e.target.value })}
                      placeholder="Alamat lengkap customer" className={`${inputClass} resize-none`} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Subject / Project</label>
                    <input value={form.project_name} onChange={e => setForm({ ...form, project_name: e.target.value })}
                      placeholder="Nama project atau deskripsi singkat" className={inputClass} />
                  </div>
                </div>
              </div>

              {/* ③ Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider">③ Item & Harga</h3>
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
                            placeholder="Nama / deskripsi produk" className={inputClass} />
                        </div>
                        <div>
                          <label className={labelClass}>Brand</label>
                          <input value={item.brand} onChange={e => updateItem(i, "brand", e.target.value)}
                            placeholder="Endress+Hauser, dll" className={inputClass} />
                        </div>
                        <div>
                          <label className={labelClass}>Model / Part No</label>
                          <input value={item.model} onChange={e => updateItem(i, "model", e.target.value)}
                            placeholder="Part number" className={inputClass} />
                        </div>
                        <div>
                          <label className={labelClass}>Qty</label>
                          <input type="number" min="1" value={item.qty} onChange={e => updateItem(i, "qty", e.target.value)} className={inputClass} />
                        </div>
                        <div>
                          <label className={labelClass}>UOM</label>
                          <input value={item.unit} onChange={e => updateItem(i, "unit", e.target.value)}
                            placeholder="Unit / Set / Lot" className={inputClass} />
                        </div>
                        <div>
                          <label className={labelClass}>Harga Satuan</label>
                          <input type="number" min="0" value={item.unit_price} onChange={e => updateItem(i, "unit_price", e.target.value)}
                            className={inputClass} />
                        </div>
                        <div>
                          <label className={labelClass}>Diskon (%)</label>
                          <input type="number" min="0" max="100" value={item.discount} onChange={e => updateItem(i, "discount", e.target.value)}
                            className={inputClass} />
                        </div>
                        <div className="col-span-2 sm:col-span-4">
                          <label className={labelClass}>Keterangan / Remarks</label>
                          <textarea rows={2} value={item.remarks} onChange={e => updateItem(i, "remarks", e.target.value)}
                            placeholder="Spec tambahan, include apa saja, dst." className={`${inputClass} resize-none`} />
                        </div>
                        <div className="col-span-2 sm:col-span-4 text-right">
                          <span className="text-xs text-gray-500">Subtotal: </span>
                          <span className="text-sm font-bold text-[#0B3D91]">{formatRupiah(calcSubtotal(item))}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-4 bg-[#0B3D91]/5 rounded-xl border border-[#0B3D91]/10 text-right">
                  <span className="text-sm font-bold text-gray-600">TOTAL: </span>
                  <span className="text-lg font-black text-[#0B3D91]">{formatRupiah(totalAmount)}</span>
                  <p className="text-xs text-gray-400 mt-0.5">Belum termasuk PPN 11%</p>
                </div>
              </div>

              {/* ④ Terms */}
              <div>
                <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3">④ Terms & Conditions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Shipment Terms</label>
                    <input value={form.shipment_terms} onChange={e => setForm({ ...form, shipment_terms: e.target.value })}
                      placeholder="Franco Jakarta" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Payment Terms</label>
                    <input value={form.payment_terms} onChange={e => setForm({ ...form, payment_terms: e.target.value })}
                      placeholder="Cash Advance" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Delivery</label>
                    <input value={form.delivery} onChange={e => setForm({ ...form, delivery: e.target.value })}
                      placeholder="10-12 Weeks ARO" className={inputClass} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Notes / Catatan</label>
                    <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                      placeholder="Note tambahan untuk customer..." className={`${inputClass} resize-none`} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Terms Tambahan (opsional)</label>
                    <textarea rows={3} value={form.terms} onChange={e => setForm({ ...form, terms: e.target.value })}
                      placeholder="Tambahkan terms khusus jika diperlukan..." className={`${inputClass} resize-none`} />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-0 bg-white rounded-b-2xl">
              <p className="text-xs text-gray-400">Revision akan otomatis jika ada perubahan setelah disimpan</p>
              <div className="flex gap-3 w-full sm:w-auto">
                <button onClick={() => setShowCreate(false)}
                  className="flex-1 sm:flex-none px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
                  Batal
                </button>
                <button onClick={handleSubmit} disabled={saving}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-bold hover:bg-[#1E5CC6] transition-colors disabled:opacity-60">
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                  {saving ? "Menyimpan..." : "Simpan Quotation"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}