import { useEffect, useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const TYPE_BADGES = {
  commissioning: { label: "Commissioning", bg: "bg-blue-100 text-blue-700" },
  investigation: { label: "Investigation", bg: "bg-purple-100 text-purple-700" },
  troubleshooting: { label: "Troubleshooting", bg: "bg-orange-100 text-orange-700" },
  service: { label: "Service", bg: "bg-green-100 text-green-700" },
};

const STATUS_BADGES = {
  draft: "bg-gray-100 text-gray-600",
  "in-progress": "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  approved: "bg-blue-100 text-blue-700",
};

export default function Reports() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilter, setShowFilter] = useState(false);

  const [filters, setFilters] = useState({
    search: "",
    type: "",
    status: "",
    engineer_id: "",
    date_from: "",
    date_to: "",
  });

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.type) params.type = filters.type;
      if (filters.status) params.status = filters.status;
      if (filters.engineer_id) params.engineer_id = filters.engineer_id;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;

      const res = await API.get("/report/list", { params });
      setReports(res.data);
    } catch {
      toast.error("Failed to fetch reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    API.get("/engineer/").then(res => setEngineers(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchReports, 300);
    return () => clearTimeout(timer);
  }, [filters]);

  const downloadPDF = async (id, reportNumber, reportType) => {
    try {
      const res = await API.get(`/report/pdf/${id}`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${reportNumber}_${reportType}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("PDF generation failed");
    }
  };

  const deleteReport = async (id) => {
    if (!confirm("Delete this report?")) return;
    try {
      await API.delete(`/report/delete/${id}`);
      toast.success("Report deleted");
      fetchReports();
    } catch {
      toast.error("Failed to delete report");
    }
  };

  const activeFiltersCount = Object.values(filters).filter(v => v !== "").length;
  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white";

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Reports</h1>
          <p className="text-gray-500 text-sm mt-0.5">{reports.length} report{reports.length !== 1 ? "s" : ""} found</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all
              ${showFilter || activeFiltersCount > 0 ? "bg-primary text-white border-primary" : "bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary"}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filter
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
          <button
            onClick={() => navigate("/reports/create")}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-secondary transition-colors"
          >
            <span>+</span> New Report
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search by report number, client, project..."
          value={filters.search}
          onChange={e => setFilters({ ...filters, search: e.target.value })}
          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white shadow-sm"
        />
      </div>

      {/* Filter Panel */}
      {showFilter && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700 text-sm">Advanced Filter</h3>
            <button
              onClick={() => { setFilters({ search: filters.search, type: "", status: "", engineer_id: "", date_from: "", date_to: "" }); }}
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

      {/* Table / List */}
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-gray-500 font-medium">No reports found</p>
          <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or create a new report</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Report No</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Client / Project</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Type</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Engineer</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reports.map((r) => {
                  const typeBadge = TYPE_BADGES[r.report_type] || { label: r.report_type, bg: "bg-gray-100 text-gray-600" };
                  const statusBg = STATUS_BADGES[r.status] || "bg-gray-100 text-gray-600";
                  return (
                    <tr key={r.id} className="hover:bg-blue-50 transition-colors">
                      <td className="px-5 py-4 font-semibold text-sm text-gray-800">{r.report_number}</td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-gray-800">{r.client_name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{r.project_name}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${typeBadge.bg}`}>{typeBadge.label}</span>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">{r.engineer_name || "—"}</td>
                      <td className="px-5 py-4 text-sm text-gray-500">{r.report_date ? new Date(r.report_date).toLocaleDateString("id-ID") : "—"}</td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusBg}`}>
                          {r.status?.replace("-", " ").toUpperCase()}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-1.5">
                          <button onClick={() => navigate(`/reports/${r.id}`)}
                            className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors">
                            View
                          </button>
                          <button onClick={() => downloadPDF(r.id, r.report_number, r.report_type)}
                            className="px-3 py-1.5 bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-100 transition-colors">
                            PDF
                          </button>
                          <button onClick={() => deleteReport(r.id)}
                            className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors">
                            Del
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-3">
            {reports.map((r) => {
              const typeBadge = TYPE_BADGES[r.report_type] || { label: r.report_type, bg: "bg-gray-100 text-gray-600" };
              const statusBg = STATUS_BADGES[r.status] || "bg-gray-100 text-gray-600";
              return (
                <div key={r.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-gray-800 text-sm">{r.report_number}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{r.client_name}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typeBadge.bg}`}>{typeBadge.label}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusBg}`}>{r.status?.toUpperCase()}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">{r.project_name} {r.engineer_name ? `• ${r.engineer_name}` : ""} {r.report_date ? `• ${new Date(r.report_date).toLocaleDateString("id-ID")}` : ""}</p>
                  <div className="flex gap-2">
                    <button onClick={() => navigate(`/reports/${r.id}`)}
                      className="flex-1 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold">View</button>
                    <button onClick={() => downloadPDF(r.id, r.report_number, r.report_type)}
                      className="flex-1 py-2 bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold">PDF</button>
                    <button onClick={() => deleteReport(r.id)}
                      className="flex-1 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-semibold">Delete</button>
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