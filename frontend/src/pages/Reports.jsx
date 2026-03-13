import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import toast from "react-hot-toast";

// ─── Constants (ORIGINAL — tidak diubah) ─────────────────────────────────────
const TYPE_BADGES = {
  commissioning:   { label: "Commissioning",   bg: "bg-blue-100 text-blue-700",    icon: "⚙️",  hex: "#3b82f6" },
  investigation:   { label: "Investigation",   bg: "bg-purple-100 text-purple-700", icon: "🔍", hex: "#8b5cf6" },
  troubleshooting: { label: "Troubleshooting", bg: "bg-orange-100 text-orange-700", icon: "🔧", hex: "#f97316" },
  service:         { label: "Service",         bg: "bg-green-100 text-green-700",   icon: "🛠️", hex: "#22c55e" },
};
const STATUS_BADGES = {
  draft:         "bg-gray-100 text-gray-600",
  "in-progress": "bg-yellow-100 text-yellow-700",
  completed:     "bg-blue-100 text-blue-700",
  approved:      "bg-emerald-100 text-emerald-700",
};
const STATUS_LABELS = {
  draft: "Draft", "in-progress": "In Progress", completed: "Completed", approved: "Approved",
};

const PAGE_SIZE_OPTIONS = [5, 10, 25, 100];

// ─── Pagination component (NEW) ───────────────────────────────────────────────
function Pagination({ total, page, pageSize, setPage, setPageSize }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to   = Math.min(total, page * pageSize);

  const pageNums = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [1];
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  })();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-white rounded-b-2xl">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 font-medium whitespace-nowrap">Tampilkan</span>
        <div className="flex gap-1">
          {PAGE_SIZE_OPTIONS.map(n => (
            <button key={n} onClick={() => { setPageSize(n); setPage(1); }}
              className={`min-w-[34px] h-8 rounded-lg text-xs font-bold transition-all border
                ${pageSize === n
                  ? "bg-[#0B3D91] text-white border-[#0B3D91] shadow-sm"
                  : "bg-white text-gray-500 border-gray-200 hover:border-[#0B3D91]/40 hover:text-[#0B3D91]"}`}>
              {n}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400 font-medium whitespace-nowrap">baris</span>
      </div>
      <span className="text-xs text-gray-400 font-medium">
        {total === 0 ? "Tidak ada data" : `${from}–${to} dari ${total}`}
      </span>
      <div className="flex items-center gap-1">
        <button onClick={() => setPage(1)} disabled={page === 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-[#0B3D91]/40 hover:text-[#0B3D91] disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold transition-all">«</button>
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-[#0B3D91]/40 hover:text-[#0B3D91] disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold transition-all">‹</button>
        {pageNums.map((n, i) =>
          n === "..." ? (
            <span key={`e${i}`} className="w-8 h-8 flex items-center justify-center text-gray-300 text-xs">…</span>
          ) : (
            <button key={n} onClick={() => setPage(n)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all border
                ${page === n
                  ? "bg-[#0B3D91] text-white border-[#0B3D91] shadow-sm"
                  : "bg-white text-gray-500 border-gray-200 hover:border-[#0B3D91]/40 hover:text-[#0B3D91]"}`}>
              {n}
            </button>
          )
        )}
        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-[#0B3D91]/40 hover:text-[#0B3D91] disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold transition-all">›</button>
        <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-[#0B3D91]/40 hover:text-[#0B3D91] disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold transition-all">»</button>
      </div>
    </div>
  );
}

// ─── Bulk Action Bar (NEW) ────────────────────────────────────────────────────
function BulkActionBar({ selectedIds, allIds, onSelectAll, onClearAll, onBulkDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const isAllSelected = allIds.length > 0 && selectedIds.length === allIds.length;

  const handleDelete = async () => {
    if (!confirm(`Hapus ${selectedIds.length} report yang dipilih? Tindakan ini tidak dapat dibatalkan.`)) return;
    setDeleting(true);
    try {
      await Promise.all(selectedIds.map(id => API.delete(`/report/delete/${id}`)));
      toast.success(`${selectedIds.length} report dihapus`);
      onBulkDeleted();
    } catch { toast.error("Sebagian gagal dihapus"); }
    finally { setDeleting(false); }
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-[#0B3D91]/5 border border-[#0B3D91]/20 rounded-xl mb-4 flex-wrap">
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input type="checkbox" checked={isAllSelected} onChange={isAllSelected ? onClearAll : onSelectAll}
          className="w-4 h-4 accent-[#0B3D91] cursor-pointer"/>
        <span className="text-xs font-bold text-[#0B3D91]">
          {isAllSelected ? "Batal Pilih Semua" : `Pilih Semua (${allIds.length})`}
        </span>
      </label>
      <div className="h-4 w-px bg-[#0B3D91]/20 mx-1"/>
      <span className="text-xs font-semibold text-[#0B3D91] bg-[#0B3D91]/10 px-2.5 py-1 rounded-full">
        {selectedIds.length} dipilih
      </span>
      <div className="flex items-center gap-2 ml-auto">
        <button onClick={handleDelete} disabled={deleting}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-red-500 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-50 disabled:opacity-60 transition-all">
          {deleting
            ? <div className="w-3.5 h-3.5 border-2 border-red-400/40 border-t-red-500 rounded-full animate-spin"/>
            : "🗑"}
          {deleting ? "Menghapus..." : "Hapus Terpilih"}
        </button>
        <button onClick={onClearAll}
          className="px-3 py-1.5 text-gray-400 hover:text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-100 transition-all">
          ✕ Batal
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Reports() {
  const navigate = useNavigate();
  const [reports,     setReports]     = useState([]);
  const [engineers,   setEngineers]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showFilter,  setShowFilter]  = useState(false);
  const [filters, setFilters] = useState({
    search: "", type: "", status: "", engineer_id: "", date_from: "", date_to: "",
  });

  // NEW: multi-select state
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectMode,  setSelectMode]  = useState(false);

  // NEW: pagination state
  const [page,     setPage]     = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    Promise.all([
      API.get("/report/list").catch(() => ({ data: [] })),
      API.get("/engineer/").catch(() => ({ data: [] })),
    ]).then(([r, e]) => {
      setReports(r.data || []);
      setEngineers(e.data || []);
      setLoading(false);
    });
  }, []);

  const fetchReports = useCallback(async () => {
    try { const res = await API.get("/report/list"); setReports(res.data); }
    catch { toast.error("Failed to load reports"); }
  }, []);

  // Reset page & selection on filter change
  useEffect(() => { setPage(1); setSelectedIds([]); }, [filters]);

  // ─── Filter logic (ORIGINAL) ───────────────────────────────────────────────
  const filtered = reports.filter(r => {
    const s = filters.search.toLowerCase();
    const matchSearch = !filters.search ||
      [r.report_number, r.client_name, r.project_name, r.engineer_name]
        .some(v => v?.toLowerCase().includes(s));
    const matchType   = !filters.type        || r.report_type === filters.type;
    const matchStatus = !filters.status      || r.status === filters.status;
    const matchEng    = !filters.engineer_id || String(r.engineer_id) === filters.engineer_id;
    const matchFrom   = !filters.date_from   || (r.report_date && r.report_date >= filters.date_from);
    const matchTo     = !filters.date_to     || (r.report_date && r.report_date <= filters.date_to);
    return matchSearch && matchType && matchStatus && matchEng && matchFrom && matchTo;
  });

  const activeFiltersCount = Object.entries(filters).filter(([k, v]) => k !== "search" && v !== "").length;
  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white";

  // ─── Pagination (NEW) ──────────────────────────────────────────────────────
  const totalPages     = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage       = Math.min(page, totalPages);
  const paginated      = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const allFilteredIds = filtered.map(r => r.id);

  // ─── Select helpers (NEW) ─────────────────────────────────────────────────
  const toggleSelect  = id  => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const onSelectAll   = ()  => setSelectedIds([...allFilteredIds]);
  const onClearAll    = ()  => { setSelectedIds([]); setSelectMode(false); };
  const onBulkDeleted = ()  => { fetchReports(); setSelectedIds([]); setSelectMode(false); };

  // ─── NEW: KPI stats ────────────────────────────────────────────────────────
  const stats = [
    { label: "Total Reports",  val: reports.length,                                                      icon: "📋", color: "text-[#0B3D91]",    bg: "bg-blue-50",    big: true },
    { label: "Approved",       val: reports.filter(r => r.status === "approved").length,                 icon: "✅", color: "text-emerald-600",  bg: "bg-emerald-50", big: true },
    { label: "In Progress",    val: reports.filter(r => r.status === "in-progress").length,              icon: "🔄", color: "text-yellow-600",   bg: "bg-yellow-50"  },
    { label: "Draft",          val: reports.filter(r => r.status === "draft").length,                    icon: "📝", color: "text-gray-500",     bg: "bg-gray-50"    },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full">

      {/* ── Header (ORIGINAL layout preserved) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Reports</h1>
          <p className="text-gray-400 text-sm mt-0.5">{filtered.length} dari {reports.length} laporan</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Select mode toggle (NEW) */}
          <button
            onClick={() => selectMode ? onClearAll() : setSelectMode(true)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all
              ${selectMode
                ? "bg-[#0B3D91] text-white border-[#0B3D91]"
                : "bg-white text-gray-600 border-gray-200 hover:border-[#0B3D91] hover:text-[#0B3D91]"}`}>
            ☑️ {selectMode ? "Mode Pilih" : "Pilih"}
          </button>
          {/* Filter button (ORIGINAL) */}
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all
              ${showFilter || activeFiltersCount > 0
                ? "bg-[#0B3D91] text-white border-[#0B3D91]"
                : "bg-white text-gray-600 border-gray-200 hover:border-[#0B3D91] hover:text-[#0B3D91]"}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filter
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {activeFiltersCount}
              </span>
            )}
          </button>
          {/* New Report button (ORIGINAL) */}
          <button
            onClick={() => navigate("/reports/create")}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-semibold hover:bg-[#1E5CC6] transition-colors">
            + New Report
          </button>
        </div>
      </div>

      {/* ── NEW: KPI Stats Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base mb-2.5 ${s.bg}`}>
              {s.icon}
            </div>
            <p className={`font-black leading-tight ${s.big ? "text-2xl" : "text-xl"} ${s.color}`}>{s.val}</p>
            <p className="text-xs text-gray-400 mt-0.5 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── NEW: Type breakdown mini-bar ── */}
      {reports.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Report per Tipe</p>
            <p className="text-xs text-gray-400">{reports.length} total</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(TYPE_BADGES).map(([key, tb]) => {
              const count = reports.filter(r => r.report_type === key).length;
              const pct   = reports.length > 0 ? Math.round(count / reports.length * 100) : 0;
              return (
                <button
                  key={key}
                  onClick={() => setFilters(f => ({ ...f, type: f.type === key ? "" : key }))}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all text-left
                    ${filters.type === key
                      ? "border-[#0B3D91]/40 bg-[#0B3D91]/5 ring-1 ring-[#0B3D91]/20"
                      : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${tb.bg}`}>
                    {tb.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-700 truncate">{tb.label}</p>
                    <p className="text-[10px] text-gray-400">{count} report · {pct}%</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Search (ORIGINAL) ── */}
      <div className="relative mb-4">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Cari nomor report, client, project..."
          value={filters.search}
          onChange={e => setFilters({ ...filters, search: e.target.value })}
          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white shadow-sm"
        />
      </div>

      {/* ── Filter Panel (ORIGINAL) ── */}
      {showFilter && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700 text-sm">Advanced Filter</h3>
            <button
              onClick={() => setFilters({ search: filters.search, type: "", status: "", engineer_id: "", date_from: "", date_to: "" })}
              className="text-xs text-red-500 hover:underline">
              Clear filters
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Report Type</label>
              <select value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value })} className={inputClass}>
                <option value="">All Types</option>
                <option value="commissioning">Commissioning</option>
                <option value="investigation">Investigation</option>
                <option value="troubleshooting">Troubleshooting</option>
                <option value="service">Service</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Status</label>
              <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} className={inputClass}>
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="approved">Approved</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Engineer</label>
              <select value={filters.engineer_id} onChange={e => setFilters({ ...filters, engineer_id: e.target.value })} className={inputClass}>
                <option value="">All Engineers</option>
                {engineers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Date From</label>
              <input type="date" value={filters.date_from} onChange={e => setFilters({ ...filters, date_from: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Date To</label>
              <input type="date" value={filters.date_to} onChange={e => setFilters({ ...filters, date_to: e.target.value })} className={inputClass} />
            </div>
          </div>
        </div>
      )}

      {/* ── NEW: Status filter tabs ── */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {[["", "Semua"], ...Object.entries(STATUS_LABELS)].map(([st, lbl]) => (
          <button
            key={st}
            onClick={() => setFilters(f => ({ ...f, status: st }))}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all
              ${filters.status === st
                ? "bg-[#0B3D91] text-white border-[#0B3D91] shadow-sm"
                : "bg-white text-gray-500 border-gray-200 hover:border-[#0B3D91]/40 hover:text-[#0B3D91]"}`}>
            {lbl}
            <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold
              ${filters.status === st ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
              {st === "" ? reports.length : reports.filter(r => r.status === st).length}
            </span>
          </button>
        ))}
      </div>

      {/* ── NEW: Bulk Action Bar ── */}
      {selectMode && selectedIds.length > 0 && (
        <BulkActionBar
          selectedIds={selectedIds}
          allIds={allFilteredIds}
          onSelectAll={onSelectAll}
          onClearAll={onClearAll}
          onBulkDeleted={onBulkDeleted}
        />
      )}

      {/* ── List / Table (ORIGINAL structure preserved, pagination + select added) ── */}
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B3D91]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-gray-500 font-medium">
            {filters.search || activeFiltersCount > 0 ? "Tidak ada report yang cocok" : "Belum ada report"}
          </p>
        </div>
      ) : (
        <>
          {/* ── Desktop Table (ORIGINAL, + select column + pagination) ── */}
          <div className="hidden lg:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gradient-to-r from-[#0B3D91] to-[#1E5CC6] text-white">
                  {/* NEW: select checkbox header */}
                  {selectMode && (
                    <th className="w-10 px-4 py-3.5 text-center">
                      <input type="checkbox"
                        checked={paginated.length > 0 && paginated.every(r => selectedIds.includes(r.id))}
                        onChange={e => {
                          if (e.target.checked) setSelectedIds(prev => [...new Set([...prev, ...paginated.map(r => r.id)])]);
                          else setSelectedIds(prev => prev.filter(id => !paginated.some(r => r.id === id)));
                        }}
                        className="w-4 h-4 accent-white cursor-pointer"/>
                    </th>
                  )}
                  {["Report No", "Client / Project", "Type", "Engineer", "Date", "Status"].map(h => (
                    <th key={h} className="px-5 py-3.5 text-xs font-bold text-white/90 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginated.map((r, i) => {
                  const tb = TYPE_BADGES[r.report_type] || { label: r.report_type, bg: "bg-gray-100 text-gray-600" };
                  const sb = STATUS_BADGES[r.status] || "bg-gray-100 text-gray-600";
                  const isSelected = selectedIds.includes(r.id);
                  return (
                    <tr
                      key={r.id}
                      onClick={() => selectMode ? toggleSelect(r.id) : navigate(`/reports/${r.id}`)}
                      className={`transition-colors cursor-pointer group
                        ${isSelected ? "bg-blue-50/70" : i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}
                        hover:bg-blue-50/60`}>
                      {/* NEW: select checkbox cell */}
                      {selectMode && (
                        <td className="px-4 py-4 text-center" onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(r.id)}
                            className="w-4 h-4 accent-[#0B3D91] cursor-pointer"/>
                        </td>
                      )}
                      {/* ORIGINAL cells */}
                      <td className="px-5 py-4">
                        <span className="font-bold text-sm text-[#0B3D91] group-hover:underline">{r.report_number}</span>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-gray-800">{r.client_name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{r.project_name}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${tb.bg}`}>{tb.label}</span>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">{r.engineer_name || "—"}</td>
                      <td className="px-5 py-4 text-sm text-gray-500 whitespace-nowrap">
                        {r.report_date ? new Date(r.report_date).toLocaleDateString("id-ID") : "—"}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${sb}`}>
                          {r.status?.replace("-", " ").toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* NEW: Pagination for desktop table */}
            <Pagination
              total={filtered.length}
              page={safePage}
              pageSize={pageSize}
              setPage={setPage}
              setPageSize={setPageSize}
            />
          </div>

          {/* ── Mobile Cards (ORIGINAL, + select mode + pagination) ── */}
          <div className="lg:hidden space-y-2">
            {paginated.map(r => {
              const tb = TYPE_BADGES[r.report_type] || { label: r.report_type, bg: "bg-gray-100 text-gray-600" };
              const sb = STATUS_BADGES[r.status] || "bg-gray-100 text-gray-600";
              const isSelected = selectedIds.includes(r.id);
              return (
                <div
                  key={r.id}
                  onClick={() => selectMode ? toggleSelect(r.id) : navigate(`/reports/${r.id}`)}
                  className={`rounded-2xl border shadow-sm p-4 cursor-pointer transition-all group
                    ${isSelected
                      ? "bg-blue-50/70 border-[#0B3D91]/30 shadow-md"
                      : "bg-white border-gray-100 hover:shadow-md hover:border-[#0B3D91]/30"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {/* NEW: checkbox in select mode */}
                      {selectMode && (
                        <input type="checkbox" checked={isSelected}
                          onChange={e => { e.stopPropagation(); toggleSelect(r.id); }}
                          onClick={e => e.stopPropagation()}
                          className="w-4 h-4 accent-[#0B3D91] cursor-pointer mt-1 flex-shrink-0"/>
                      )}
                      <div className="w-9 h-9 bg-gradient-to-br from-[#0B3D91] to-[#1E5CC6] rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm">📋</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-[#0B3D91] text-sm group-hover:underline">{r.report_number}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${tb.bg}`}>{tb.label}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-0.5 truncate">{r.client_name}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {[r.project_name, r.engineer_name].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${sb}`}>
                        {r.status?.replace("-", " ").toUpperCase()}
                      </span>
                      {r.report_date && (
                        <span className="text-[10px] text-gray-400">
                          {new Date(r.report_date).toLocaleDateString("id-ID")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* NEW: Pagination for mobile cards */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mt-2">
              <Pagination
                total={filtered.length}
                page={safePage}
                pageSize={pageSize}
                setPage={setPage}
                setPageSize={setPageSize}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}