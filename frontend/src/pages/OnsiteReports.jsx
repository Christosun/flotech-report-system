import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import toast from "react-hot-toast";

const STATUS_CONFIG = {
  draft:     { label: "Draft",     bg: "bg-gray-100",    text: "text-gray-600" },
  submitted: { label: "Submitted", bg: "bg-blue-100",    text: "text-blue-700" },
  approved:  { label: "Approved",  bg: "bg-emerald-100", text: "text-emerald-700" },
};

const PAGE_SIZE_OPTIONS = [5, 10, 25, 100];

// ─── Pagination Component ─────────────────────────────────────────────────────
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
        {total === 0 ? "0 data" : `${from}–${to} dari ${total}`}
      </span>
      <div className="flex items-center gap-1">
        <button onClick={() => setPage(1)} disabled={page === 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-[#0B3D91] hover:text-[#0B3D91] disabled:opacity-30 disabled:cursor-not-allowed text-xs">«</button>
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-[#0B3D91] hover:text-[#0B3D91] disabled:opacity-30 disabled:cursor-not-allowed text-xs">‹</button>
        {pageNums.map((n, i) => (
          <button key={i} onClick={() => typeof n === "number" && setPage(n)} disabled={n === "..."}
            className={`min-w-[32px] h-8 rounded-lg text-xs font-bold border transition-all
              ${n === page ? "bg-[#0B3D91] text-white border-[#0B3D91] shadow-sm"
                : n === "..." ? "border-transparent text-gray-300 cursor-default"
                : "bg-white text-gray-500 border-gray-200 hover:border-[#0B3D91]/40 hover:text-[#0B3D91]"}`}>
            {n}
          </button>
        ))}
        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-[#0B3D91] hover:text-[#0B3D91] disabled:opacity-30 disabled:cursor-not-allowed text-xs">›</button>
        <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-[#0B3D91] hover:text-[#0B3D91] disabled:opacity-30 disabled:cursor-not-allowed text-xs">»</button>
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
            <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>
        <div className="px-6 py-4 flex gap-3">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Batal
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
            {loading
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
              : null}
            {loading ? "Menghapus..." : "Hapus Permanen"}
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
      await Promise.all(selectedIds.map(id => API.delete(`/onsite/delete/${id}`)));
      toast.success(`${selectedIds.length} onsite report dihapus`);
      setShowDeleteConfirm(false);
      onBulkDeleted();
    } catch { toast.error("Sebagian gagal dihapus"); }
    finally { setDeleting(false); }
  };

  return (
    <>
      {showDeleteConfirm && (
        <DeleteDialog
          title={`Hapus ${selectedIds.length} Onsite Report?`}
          description="Semua onsite report yang dipilih akan dihapus permanen. Tindakan ini tidak dapat dibatalkan."
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
            {isAllSelected ? "Batal Pilih Semua" : `Pilih Semua (${allIds.length})`}
          </span>
        </label>
        <div className="h-4 w-px bg-[#0B3D91]/20 mx-1"/>
        <span className="text-xs font-semibold text-[#0B3D91] bg-[#0B3D91]/10 px-2.5 py-1 rounded-full">
          {selectedIds.length} dipilih
        </span>
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={() => setShowDeleteConfirm(true)} disabled={deleting}
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
    </>
  );
}

export default function OnsiteReports() {
  const navigate = useNavigate();
  const [reports, setReports]     = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState({
    search: "", status: "", engineer_id: "", date_from: "", date_to: "",
  });
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectMode,  setSelectMode]  = useState(false);
  const [page,        setPage]        = useState(1);
  const [pageSize,    setPageSize]    = useState(10);

  useEffect(() => {
    Promise.all([
      API.get("/onsite/list").catch(() => ({ data: [] })),
      API.get("/engineer/").catch(() => ({ data: [] })),
    ]).then(([r, e]) => {
      setReports(r.data || []);
      setEngineers(e.data || []);
      setLoading(false);
    });
  }, []);

  const fetchReports = useCallback(async () => {
    try { const res = await API.get("/onsite/list"); setReports(res.data || []); }
    catch { toast.error("Gagal memuat data"); }
  }, []);

  // Tambah useEffect reset:
  useEffect(() => { setPage(1); setSelectedIds([]); }, [filters]);

  const filtered = reports.filter(r => {
    const s = filters.search.toLowerCase();
    const matchSearch = !filters.search ||
      [r.report_number, r.client_name, r.site_location, r.engineer_name, r.job_description]
        .some(v => v?.toLowerCase().includes(s));
    const matchStatus = !filters.status      || r.status === filters.status;
    const matchEng    = !filters.engineer_id || String(r.engineer_id) === filters.engineer_id;
    const matchFrom   = !filters.date_from   || (r.visit_date && r.visit_date >= filters.date_from);
    const matchTo     = !filters.date_to     || (r.visit_date && r.visit_date <= filters.date_to);
    return matchSearch && matchStatus && matchEng && matchFrom && matchTo;
  });

  const activeFiltersCount = Object.entries(filters).filter(([k, v]) => k !== "search" && v !== "").length;

  // Pagination
  const totalPages     = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage       = Math.min(page, totalPages);
  const paginated      = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const allFilteredIds = filtered.map(r => r.id);

  // Select helpers
  const toggleSelect  = id  => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const onSelectAll   = ()  => setSelectedIds(allFilteredIds);
  const onClearAll    = ()  => { setSelectedIds([]); setSelectMode(false); };
  const onBulkDeleted = ()  => { setSelectedIds([]); setSelectMode(false); fetchReports(); };

  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white";

  const stats = [
    { label: "Total",     val: reports.length,                                            icon: "📋", color: "bg-blue-50",    text: "text-[#0B3D91]"   },
    { label: "Draft",     val: reports.filter(r => r.status === "draft").length,          icon: "📝", color: "bg-gray-50",    text: "text-gray-600"    },
    { label: "Submitted", val: reports.filter(r => r.status === "submitted").length,      icon: "📤", color: "bg-blue-50",    text: "text-blue-600"    },
    { label: "Approved",  val: reports.filter(r => r.status === "approved").length,       icon: "✅", color: "bg-emerald-50", text: "text-emerald-600" },
  ];

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Onsite Reports</h1>
          <p className="text-gray-400 text-sm mt-0.5">Interim report of visit and field work</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setSelectMode(s => !s); setSelectedIds([]); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all
              ${selectMode
                ? "bg-amber-500 text-white border-amber-500"
                : "bg-white text-gray-600 border-gray-200 hover:border-[#0B3D91] hover:text-[#0B3D91]"}`}
          >
            {selectMode ? "✕ Batal Pilih" : "☑ Pilih"}
          </button>
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all
              ${showFilter || activeFiltersCount > 0
                ? "bg-[#0B3D91] text-white border-[#0B3D91]"
                : "bg-white text-gray-600 border-gray-200 hover:border-[#0B3D91] hover:text-[#0B3D91]"}`}
          >
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
          <button
            onClick={() => navigate("/onsite/create")}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-semibold hover:bg-[#1E5CC6] transition-colors"
          >
            + New Onsite Report
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-base mb-2 ${s.color}`}>{s.icon}</div>
            <p className={`text-2xl font-black ${s.text}`}>{s.val}</p>
            <p className="text-xs font-semibold text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Cari nomor report, client, site, engineer..."
          value={filters.search}
          onChange={e => setFilters({ ...filters, search: e.target.value })}
          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white shadow-sm"
        />
      </div>

      {/* Filter Panel */}
      {showFilter && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700 text-sm">Advanced Filter</h3>
            <button
              onClick={() => setFilters({ search: filters.search, status: "", engineer_id: "", date_from: "", date_to: "" })}
              className="text-xs text-red-500 hover:underline"
            >
              Clear filters
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Status</label>
              <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} className={inputClass}>
                <option value="">All Status</option>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Engineer</label>
              <select value={filters.engineer_id} onChange={e => setFilters({ ...filters, engineer_id: e.target.value })} className={inputClass}>
                <option value="">All Engineers</option>
                {engineers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Date From</label>
              <input type="date" value={filters.date_from} onChange={e => setFilters({ ...filters, date_from: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Date To</label>
              <input type="date" value={filters.date_to} onChange={e => setFilters({ ...filters, date_to: e.target.value })} className={inputClass} />
            </div>
          </div>
          {activeFiltersCount > 0 && (
            <p className="text-xs text-gray-400 mt-3">{filtered.length} dari {reports.length} report ditampilkan</p>
          )}
        </div>
      )}

      {/* Status Tabs */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {[["", "Semua"], ...Object.entries(STATUS_CONFIG).map(([k,v]) => [k, v.label])].map(([st, lbl]) => (
          <button key={st}
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

      {/* Bulk Action Bar */}
      {selectMode && selectedIds.length > 0 && (
        <BulkActionBar
          selectedIds={selectedIds}
          allIds={allFilteredIds}
          onSelectAll={onSelectAll}
          onClearAll={onClearAll}
          onBulkDeleted={onBulkDeleted}
        />
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B3D91]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-gray-500 font-medium">
            {filters.search || activeFiltersCount > 0 ? "Tidak ada report yang cocok" : "Belum ada onsite report"}
          </p>
          {!filters.search && activeFiltersCount === 0 && (
            <button onClick={() => navigate("/onsite/create")} className="mt-4 px-5 py-2 bg-[#0B3D91] text-white rounded-xl text-sm font-semibold">
              Buat Pertama
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {paginated.map(r => {   // ← ganti filtered → paginated
            const sc = STATUS_CONFIG[r.status] || STATUS_CONFIG.draft;
            const isSelected = selectedIds.includes(r.id);
            return (
              <div
                key={r.id}
                onClick={() => selectMode ? toggleSelect(r.id) : navigate(`/onsite/${r.id}`)}
                className={`rounded-2xl border shadow-sm p-4 transition-all cursor-pointer group
                  ${isSelected
                    ? "bg-blue-50/70 border-[#0B3D91]/30 shadow-md"
                    : "bg-white border-gray-100 hover:shadow-md hover:border-[#0B3D91]/30"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Checkbox select mode */}
                    {selectMode && (
                      <input type="checkbox" checked={isSelected}
                        onChange={e => { e.stopPropagation(); toggleSelect(r.id); }}
                        onClick={e => e.stopPropagation()}
                        className="w-4 h-4 accent-[#0B3D91] cursor-pointer mt-1 flex-shrink-0"/>
                    )}
                    <div className="w-9 h-9 bg-gradient-to-br from-[#0B3D91] to-[#1E5CC6] rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm">🔧</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900 group-hover:text-[#0B3D91] transition-colors text-sm">
                          {r.report_number}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${sc.bg} ${sc.text}`}>
                          {sc.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5 truncate">
                        {[r.client_name, r.site_location].filter(Boolean).join(" • ")}
                      </p>
                      {r.engineer_name && (
                        <p className="text-xs text-gray-400 mt-0.5">{r.engineer_name}</p>
                      )}
                      {r.job_description && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                          {r.job_description.replace(/<[^>]+>/g, ' ').trim()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    {r.visit_date_from && (
                      <span className="text-[10px] text-gray-400">
                        {new Date(r.visit_date_from + "T00:00:00").toLocaleDateString("id-ID")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Pagination */}
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
      )}
    </div>
  );
}