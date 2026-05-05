import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import toast from "react-hot-toast";
import {
  Settings2,
  Search as SearchIcon,
  Layers,
  Wrench,
  ClipboardList,
  CheckCircle2,
  RefreshCw,
  FileText,
  Trash2,
  X,
  CheckSquare,
  Square,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  AlertTriangle,
  User,
  CalendarDays,
  SlidersHorizontal,
  BarChart3,
} from "lucide-react";

// ─── Constants ─────────────────────────────────────────────────────────────────
const TYPE_BADGES = {
  commissioning:   { label: "Commissioning",   bg: "bg-blue-100 text-blue-700",    iconComp: Settings2,   hex: "#3b82f6" },
  investigation:   { label: "Investigation",   bg: "bg-purple-100 text-purple-700", iconComp: SearchIcon,  hex: "#8b5cf6" },
  troubleshooting: { label: "Troubleshooting", bg: "bg-orange-100 text-orange-700", iconComp: Wrench,      hex: "#f97316" },
  service:         { label: "Service",         bg: "bg-green-100 text-green-700",   iconComp: Layers,      hex: "#22c55e" },
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

// ─── Pagination ───────────────────────────────────────────────────────────────
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
        <span className="text-xs text-gray-400 font-medium whitespace-nowrap">Showing</span>
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
        <span className="text-xs text-gray-400 font-medium whitespace-nowrap">rows</span>
      </div>
      <span className="text-xs text-gray-400 font-medium">
        {total === 0 ? "No data" : `${from}–${to} from ${total}`}
      </span>
      <div className="flex items-center gap-1">
        <button onClick={() => setPage(1)} disabled={page === 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-[#0B3D91]/40 hover:text-[#0B3D91] disabled:opacity-30 disabled:cursor-not-allowed transition-all">
          <ChevronFirst size={14} />
        </button>
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-[#0B3D91]/40 hover:text-[#0B3D91] disabled:opacity-30 disabled:cursor-not-allowed transition-all">
          <ChevronLeft size={14} />
        </button>
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
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-[#0B3D91]/40 hover:text-[#0B3D91] disabled:opacity-30 disabled:cursor-not-allowed transition-all">
          <ChevronRight size={14} />
        </button>
        <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-[#0B3D91]/40 hover:text-[#0B3D91] disabled:opacity-30 disabled:cursor-not-allowed transition-all">
          <ChevronLast size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Delete Dialog ────────────────────────────────────────────────────────────
function DeleteDialog({ title, description, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-gradient-to-br from-red-50 to-rose-100 px-6 pt-6 pb-4 text-center">
          <div className="w-14 h-14 bg-red-100 border-4 border-red-200 rounded-full flex items-center justify-center mx-auto mb-3">
            <Trash2 className="w-7 h-7 text-red-500" />
          </div>
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>
        <div className="px-6 py-4 flex gap-3">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
            {loading
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
              : <Trash2 size={14} />}
            {loading ? "Deleting..." : "Permanently Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Bulk Action Bar ──────────────────────────────────────────────────────────
function BulkActionBar({ selectedIds, allIds, onSelectAll, onClearAll, onBulkDeleted }) {
  const [deleting, setDeleting]                   = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isAllSelected = allIds.length > 0 && selectedIds.length === allIds.length;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await Promise.all(selectedIds.map(id => API.delete(`/report/delete/${id}`)));
      toast.success(`${selectedIds.length} report deleted`);
      setShowDeleteConfirm(false);
      onBulkDeleted();
    } catch { toast.error("Some failed to delete"); }
    finally { setDeleting(false); }
  };

  return (
    <>
      {showDeleteConfirm && (
        <DeleteDialog
          title={`Delete ${selectedIds.length} Report?`}
          description="All selected reports will be permanently deleted. This action cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          loading={deleting}
        />
      )}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#0B3D91]/5 border border-[#0B3D91]/20 rounded-xl mb-4 flex-wrap">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={isAllSelected} onChange={isAllSelected ? onClearAll : onSelectAll}
            className="w-4 h-4 accent-[#0B3D91] cursor-pointer"/>
          <span className="text-xs font-bold text-[#0B3D91]">
            {isAllSelected ? "Deselect All" : `Select All (${allIds.length})`}
          </span>
        </label>
        <div className="h-4 w-px bg-[#0B3D91]/20 mx-1"/>
        <span className="text-xs font-semibold text-[#0B3D91] bg-[#0B3D91]/10 px-2.5 py-1 rounded-full">
          {selectedIds.length} selected
        </span>
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={() => setShowDeleteConfirm(true)} disabled={deleting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-red-500 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-50 disabled:opacity-60 transition-all">
            {deleting
              ? <div className="w-3.5 h-3.5 border-2 border-red-400/40 border-t-red-500 rounded-full animate-spin"/>
              : <Trash2 size={13} />}
            {deleting ? "Deleting..." : "Delete Selected"}
          </button>
          <button onClick={onClearAll}
            className="flex items-center gap-1 px-3 py-1.5 text-gray-400 hover:text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-100 transition-all">
            <X size={13} /> Cancel
          </button>
        </div>
      </div>
    </>
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

  const [selectedIds, setSelectedIds] = useState([]);
  const [selectMode,  setSelectMode]  = useState(false);

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

  useEffect(() => { setPage(1); setSelectedIds([]); }, [filters]);

  // ─── Filter logic ──────────────────────────────────────────────────────────
  const filtered = reports.filter(r => {
    const s = filters.search.toLowerCase();
    const matchSearch = !filters.search ||
      [r.report_number, r.client_name, r.project_name, r.engineer_name]
        .some(v => v?.toLowerCase().includes(s));
    const matchType   = !filters.type        || r.report_type === filters.type;
    const matchStatus = !filters.status      || r.status === filters.status;
    const matchEng = !filters.engineer_id ||
      String(r.engineer_id) === String(filters.engineer_id) ||
      (r.engineer_name && engineers.find(e => String(e.id) === String(filters.engineer_id))?.name === r.engineer_name);
    const matchFrom   = !filters.date_from   || (r.report_date && r.report_date >= filters.date_from);
    const matchTo     = !filters.date_to     || (r.report_date && r.report_date <= filters.date_to);
    return matchSearch && matchType && matchStatus && matchEng && matchFrom && matchTo;
  });

  const activeFiltersCount = Object.entries(filters).filter(([k, v]) => k !== "search" && v !== "").length;
  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white";

  // ─── Pagination ────────────────────────────────────────────────────────────
  const totalPages     = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage       = Math.min(page, totalPages);
  const paginated      = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const allFilteredIds = filtered.map(r => r.id);

  // ─── Select helpers ────────────────────────────────────────────────────────
  const toggleSelect  = id  => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const onSelectAll   = ()  => setSelectedIds([...allFilteredIds]);
  const onClearAll    = ()  => { setSelectedIds([]); setSelectMode(false); };
  const onBulkDeleted = ()  => { fetchReports(); setSelectedIds([]); setSelectMode(false); };

  // ─── KPI stats ─────────────────────────────────────────────────────────────
  const stats = [
    { label: "Total Reports",  val: reports.length,                                        icon: ClipboardList,  color: "text-[#0B3D91]",   bg: "bg-blue-50",    iconColor: "text-[#0B3D91]",   big: true },
    { label: "Approved",       val: reports.filter(r => r.status === "approved").length,   icon: CheckCircle2,   color: "text-emerald-600", bg: "bg-emerald-50", iconColor: "text-emerald-500", big: true },
    { label: "In Progress",    val: reports.filter(r => r.status === "in-progress").length,icon: RefreshCw,      color: "text-yellow-600",  bg: "bg-yellow-50",  iconColor: "text-yellow-500"  },
    { label: "Draft",          val: reports.filter(r => r.status === "draft").length,      icon: FileText,       color: "text-gray-500",    bg: "bg-gray-50",    iconColor: "text-gray-400"    },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Reports</h1>
          <p className="text-gray-400 text-sm mt-0.5">{filtered.length} from {reports.length} reports</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Select mode toggle */}
          <button
            onClick={() => selectMode ? onClearAll() : setSelectMode(true)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all
              ${selectMode
                ? "bg-[#0B3D91] text-white border-[#0B3D91]"
                : "bg-white text-gray-600 border-gray-200 hover:border-[#0B3D91] hover:text-[#0B3D91]"}`}>
            {selectMode ? <CheckSquare size={16} /> : <Square size={16} />}
            Select
          </button>
          {/* Filter button */}
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all
              ${showFilter || activeFiltersCount > 0
                ? "bg-[#0B3D91] text-white border-[#0B3D91]"
                : "bg-white text-gray-600 border-gray-200 hover:border-[#0B3D91] hover:text-[#0B3D91]"}`}>
            <Filter size={16} />
            Filter
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {activeFiltersCount}
              </span>
            )}
          </button>
          {/* New Report button */}
          <button
            onClick={() => navigate("/reports/create")}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-semibold hover:bg-[#1E5CC6] transition-colors">
            <Plus size={16} />
            New Official Report
          </button>
        </div>
      </div>

      {/* ── KPI Stats Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 ${s.bg}`}>
                <Icon size={18} className={s.iconColor} />
              </div>
              <p className={`font-black leading-tight ${s.big ? "text-2xl" : "text-xl"} ${s.color}`}>{s.val}</p>
              <p className="text-xs text-gray-400 mt-0.5 font-medium">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* ── Type breakdown mini-bar ── */}
      {reports.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 size={14} className="text-gray-400" />
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Report per Type</p>
            </div>
            <p className="text-xs text-gray-400">{reports.length} total</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(TYPE_BADGES).map(([key, tb]) => {
              const count = reports.filter(r => r.report_type === key).length;
              const pct   = reports.length > 0 ? Math.round(count / reports.length * 100) : 0;
              const TypeIcon = tb.iconComp;
              return (
                <button
                  key={key}
                  onClick={() => setFilters(f => ({ ...f, type: f.type === key ? "" : key }))}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all text-left
                    ${filters.type === key
                      ? "border-[#0B3D91]/40 bg-[#0B3D91]/5 ring-1 ring-[#0B3D91]/20"
                      : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${tb.bg}`}>
                    <TypeIcon size={15} />
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

      {/* ── Search ── */}
      <div className="relative mb-4">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search for report number, client, project..."
          value={filters.search}
          onChange={e => setFilters({ ...filters, search: e.target.value })}
          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white shadow-sm"
        />
      </div>

      {/* ── Filter Panel ── */}
      {showFilter && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={15} className="text-gray-500" />
              <h3 className="font-semibold text-gray-700 text-sm">Advanced Filter</h3>
            </div>
            <button
              onClick={() => setFilters({ search: filters.search, type: "", status: "", engineer_id: "", date_from: "", date_to: "" })}
              className="text-xs text-red-500 hover:underline">
              Clear filters
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                <Settings2 size={11} /> Report Type
              </label>
              <select value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value })} className={inputClass}>
                <option value="">All Types</option>
                <option value="commissioning">Commissioning</option>
                <option value="investigation">Investigation</option>
                <option value="troubleshooting">Troubleshooting</option>
                <option value="service">Service</option>
              </select>
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                <CheckCircle2 size={11} /> Status
              </label>
              <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} className={inputClass}>
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="approved">Approved</option>
              </select>
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                <User size={11} /> Engineer
              </label>
              <select value={filters.engineer_id} onChange={e => setFilters({ ...filters, engineer_id: e.target.value })} className={inputClass}>
                <option value="">All Engineers</option>
                {engineers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                <CalendarDays size={11} /> Date From
              </label>
              <input type="date" value={filters.date_from} onChange={e => setFilters({ ...filters, date_from: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                <CalendarDays size={11} /> Date To
              </label>
              <input type="date" value={filters.date_to} onChange={e => setFilters({ ...filters, date_to: e.target.value })} className={inputClass} />
            </div>
          </div>
        </div>
      )}

      {/* ── Status filter tabs ── */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {[["", "All"], ...Object.entries(STATUS_LABELS)].map(([st, lbl]) => (
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

      {/* ── Bulk Action Bar ── */}
      {selectMode && selectedIds.length > 0 && (
        <BulkActionBar
          selectedIds={selectedIds}
          allIds={allFilteredIds}
          onSelectAll={onSelectAll}
          onClearAll={onClearAll}
          onBulkDeleted={onBulkDeleted}
        />
      )}

      {/* ── List / Table ── */}
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B3D91]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <ClipboardList size={32} className="text-gray-300" />
          </div>
          <p className="text-gray-500 font-medium">
            {filters.search || activeFiltersCount > 0 ? "No matching reports found" : "No reports yet"}
          </p>
        </div>
      ) : (
        <>
          {/* ── Desktop Table ── */}
          <div className="hidden lg:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gradient-to-r from-[#0B3D91] to-[#1E5CC6] text-white">
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
                  const tb = TYPE_BADGES[r.report_type] || { label: r.report_type, bg: "bg-gray-100 text-gray-600", iconComp: FileText };
                  const sb = STATUS_BADGES[r.status] || "bg-gray-100 text-gray-600";
                  const isSelected = selectedIds.includes(r.id);
                  const TypeIcon = tb.iconComp;
                  return (
                    <tr key={r.id}
                      onClick={(e) => {
                        if (selectMode) { toggleSelect(r.id); return; }
                        if (e.ctrlKey || e.metaKey || e.button === 1) {
                          window.open(`/reports/${r.id}`, "_blank");
                        } else {
                          navigate(`/reports/${r.id}`);
                        }
                      }}
                      onMouseDown={(e) => {
                        if (!selectMode && e.button === 1) window.open(`/reports/${r.id}`, "_blank");
                      }}
                      className={`transition-colors cursor-pointer group
                        ${isSelected ? "bg-blue-50/70" : i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}
                        hover:bg-blue-50/60`}>
                      {selectMode && (
                        <td className="px-4 py-4 text-center" onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(r.id)}
                            className="w-4 h-4 accent-[#0B3D91] cursor-pointer"/>
                        </td>
                      )}
                      <td className="px-5 py-4">
                        <span className="font-bold text-sm text-[#0B3D91] group-hover:underline">{r.report_number}</span>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-gray-800">{r.client_name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{r.project_name}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${tb.bg}`}>
                          <TypeIcon size={11} />
                          {tb.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <User size={13} className="text-gray-400 flex-shrink-0" />
                          {r.engineer_name || "—"}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-gray-500 whitespace-nowrap">
                          <CalendarDays size={13} className="text-gray-400 flex-shrink-0" />
                          {r.report_date ? new Date(r.report_date).toLocaleDateString("id-ID") : "—"}
                        </div>
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
            <Pagination
              total={filtered.length}
              page={safePage}
              pageSize={pageSize}
              setPage={setPage}
              setPageSize={setPageSize}
            />
          </div>

          {/* ── Mobile Cards ── */}
          <div className="lg:hidden space-y-2">
            {paginated.map(r => {
              const tb = TYPE_BADGES[r.report_type] || { label: r.report_type, bg: "bg-gray-100 text-gray-600", iconComp: FileText };
              const sb = STATUS_BADGES[r.status] || "bg-gray-100 text-gray-600";
              const isSelected = selectedIds.includes(r.id);
              const TypeIcon = tb.iconComp;
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
                      {selectMode && (
                        <input type="checkbox" checked={isSelected}
                          onChange={e => { e.stopPropagation(); toggleSelect(r.id); }}
                          onClick={e => e.stopPropagation()}
                          className="w-4 h-4 accent-[#0B3D91] cursor-pointer mt-1 flex-shrink-0"/>
                      )}
                      <div className="w-9 h-9 bg-gradient-to-br from-[#0B3D91] to-[#1E5CC6] rounded-xl flex items-center justify-center flex-shrink-0">
                        <ClipboardList size={17} className="text-white" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-[#0B3D91] text-sm group-hover:underline">{r.report_number}</span>
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${tb.bg}`}>
                            <TypeIcon size={9} />
                            {tb.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-0.5 truncate">{r.client_name}</p>
                        <p className="text-xs text-gray-400 truncate flex items-center gap-1 mt-0.5">
                          {r.engineer_name && <><User size={10} className="flex-shrink-0" />{r.engineer_name}</>}
                          {r.engineer_name && r.project_name && <span className="mx-1">·</span>}
                          {r.project_name}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${sb}`}>
                        {r.status?.replace("-", " ").toUpperCase()}
                      </span>
                      {r.report_date && (
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                          <CalendarDays size={10} />
                          {new Date(r.report_date).toLocaleDateString("id-ID")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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