import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import toast from "react-hot-toast";

const TYPE_BADGES = {
  commissioning:  { label: "Commissioning",  bg: "bg-blue-100 text-blue-700" },
  investigation:  { label: "Investigation",  bg: "bg-purple-100 text-purple-700" },
  troubleshooting:{ label: "Troubleshooting",bg: "bg-orange-100 text-orange-700" },
  service:        { label: "Service",        bg: "bg-green-100 text-green-700" },
};
const STATUS_BADGES = {
  draft:        "bg-gray-100 text-gray-600",
  "in-progress":"bg-yellow-100 text-yellow-700",
  completed:    "bg-blue-100 text-blue-700",
  approved:     "bg-emerald-100 text-emerald-700",
};

export default function Reports() {
  const navigate = useNavigate();
  const [reports, setReports]       = useState([]);
  const [engineers, setEngineers]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState({
    search: "", type: "", status: "", engineer_id: "", date_from: "", date_to: "",
  });

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

  const fetchReports = async () => {
    try { const res = await API.get("/report/list"); setReports(res.data); }
    catch { toast.error("Failed to load reports"); }
  };

  const filtered = reports.filter(r => {
    const s = filters.search.toLowerCase();
    const matchSearch = !filters.search ||
      [r.report_number, r.client_name, r.project_name, r.engineer_name]
        .some(v => v?.toLowerCase().includes(s));
    const matchType    = !filters.type        || r.report_type === filters.type;
    const matchStatus  = !filters.status      || r.status === filters.status;
    const matchEng     = !filters.engineer_id || String(r.engineer_id) === filters.engineer_id;
    const matchFrom    = !filters.date_from   || (r.report_date && r.report_date >= filters.date_from);
    const matchTo      = !filters.date_to     || (r.report_date && r.report_date <= filters.date_to);
    return matchSearch && matchType && matchStatus && matchEng && matchFrom && matchTo;
  });

  const activeFiltersCount = Object.entries(filters).filter(([k, v]) => k !== "search" && v !== "").length;
  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white";

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Reports</h1>
          <p className="text-gray-400 text-sm mt-0.5">{filtered.length} dari {reports.length} laporan</p>
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
            onClick={() => navigate("/reports/create")}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-semibold hover:bg-[#1E5CC6] transition-colors"
          >
            + New Report
          </button>
        </div>
      </div>

      {/* Search */}
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

      {/* Filter Panel */}
      {showFilter && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700 text-sm">Advanced Filter</h3>
            <button
              onClick={() => setFilters({ search: filters.search, type: "", status: "", engineer_id: "", date_from: "", date_to: "" })}
              className="text-xs text-red-500 hover:underline"
            >
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

      {/* List */}
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
          {/* Desktop Table — full row clickable, no Actions column */}
          <div className="hidden lg:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Report No", "Client / Project", "Type", "Engineer", "Date", "Status"].map(h => (
                    <th key={h} className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(r => {
                  const tb = TYPE_BADGES[r.report_type] || { label: r.report_type, bg: "bg-gray-100 text-gray-600" };
                  const sb = STATUS_BADGES[r.status] || "bg-gray-100 text-gray-600";
                  return (
                    <tr
                      key={r.id}
                      onClick={() => navigate(`/reports/${r.id}`)}
                      className="hover:bg-blue-50/60 transition-colors cursor-pointer group"
                    >
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
          </div>

          {/* Mobile Cards — full card clickable */}
          <div className="lg:hidden space-y-2">
            {filtered.map(r => {
              const tb = TYPE_BADGES[r.report_type] || { label: r.report_type, bg: "bg-gray-100 text-gray-600" };
              const sb = STATUS_BADGES[r.status] || "bg-gray-100 text-gray-600";
              return (
                <div
                  key={r.id}
                  onClick={() => navigate(`/reports/${r.id}`)}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 cursor-pointer hover:shadow-md hover:border-[#0B3D91]/30 transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
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
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-right">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full block ${sb}`}>
                          {r.status?.replace("-"," ").toUpperCase()}
                        </span>
                        {r.report_date && (
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(r.report_date).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}
                          </p>
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
        </>
      )}
    </div>
  );
}