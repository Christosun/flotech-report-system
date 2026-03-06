import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import toast from "react-hot-toast";

const STATUS_CONFIG = {
  draft:     { label: "Draft",     bg: "bg-gray-100",    text: "text-gray-600" },
  submitted: { label: "Submitted", bg: "bg-blue-100",    text: "text-blue-700" },
  approved:  { label: "Approved",  bg: "bg-emerald-100", text: "text-emerald-700" },
};

export default function OnsiteReports() {
  const navigate = useNavigate();
  const [reports, setReports]     = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState({
    search: "", status: "", engineer_id: "", date_from: "", date_to: "",
  });

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
          <p className="text-gray-400 text-sm mt-0.5">Laporan kunjungan dan pekerjaan lapangan</p>
        </div>
        <div className="flex gap-2">
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
            + Buat Report
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
          {filtered.map(r => {
            const sc = STATUS_CONFIG[r.status] || STATUS_CONFIG.draft;
            return (
              <div
                key={r.id}
                onClick={() => navigate(`/onsite/${r.id}`)}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-[#0B3D91]/30 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left side */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
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
                      {r.job_description && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{r.job_description.replace(/<[^>]+>/g, ' ').trim()}</p>
                      )}
                    </div>
                  </div>
                  {/* Right side */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right hidden sm:block">
                      {r.visit_date && (
                        <p className="text-xs font-semibold text-gray-600">
                          {new Date(r.visit_date + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      )}
                      {r.engineer_name && (
                        <p className="text-xs text-gray-400 mt-0.5">{r.engineer_name}</p>
                      )}
                    </div>
                    <svg className="w-4 h-4 text-gray-300 group-hover:text-[#0B3D91] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}