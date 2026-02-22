import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import toast from "react-hot-toast";

const STATUS_CONFIG = {
  draft:     { label: "Draft",     bg: "bg-gray-100",    text: "text-gray-600",    dot: "bg-gray-400" },
  submitted: { label: "Submitted", bg: "bg-blue-100",    text: "text-blue-700",    dot: "bg-blue-500" },
  approved:  { label: "Approved",  bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
};

export default function OnsiteReports() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await API.get("/onsite/list");
      setReports(res.data);
    } catch { toast.error("Gagal memuat data"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReports(); }, []);

  const filtered = reports.filter(r => {
    const s = search.toLowerCase();
    const matchSearch = !search || [r.report_number, r.client_name, r.site_location, r.engineer_name, r.job_description]
      .some(v => v?.toLowerCase().includes(s));
    const matchStatus = !filterStatus || r.status === filterStatus;
    const matchFrom = !filterDateFrom || (r.visit_date && r.visit_date >= filterDateFrom);
    const matchTo   = !filterDateTo   || (r.visit_date && r.visit_date <= filterDateTo);
    return matchSearch && matchStatus && matchFrom && matchTo;
  });

  const stats = [
    { label: "Total", val: reports.length, icon: "📋", color: "text-[#0B3D91]" },
    { label: "Draft", val: reports.filter(r => r.status === "draft").length, icon: "📝", color: "text-gray-500" },
    { label: "Submitted", val: reports.filter(r => r.status === "submitted").length, icon: "📤", color: "text-blue-600" },
    { label: "Approved", val: reports.filter(r => r.status === "approved").length, icon: "✅", color: "text-emerald-600" },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Onsite Reports</h1>
          <p className="text-sm text-gray-400 mt-0.5">Laporan kunjungan dan pekerjaan lapangan</p>
        </div>
        <button onClick={() => navigate("/onsite/create")}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-semibold hover:bg-[#1E5CC6] transition-colors shadow-sm">
          + Buat Onsite Report
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xl mb-1">{s.icon}</p>
            <p className={`text-2xl font-black ${s.color}`}>{s.val}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative lg:col-span-2">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cari nomor, client, lokasi, engineer..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91]" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-white">
            <option value="">Semua Status</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <div className="flex gap-2">
            <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91]" />
            <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91]" />
          </div>
        </div>
        {(search || filterStatus || filterDateFrom || filterDateTo) && (
          <button onClick={() => { setSearch(""); setFilterStatus(""); setFilterDateFrom(""); setFilterDateTo(""); }}
            className="mt-3 text-xs text-[#0B3D91] hover:underline">
            × Reset filter
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B3D91]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-gray-500 font-medium">Belum ada onsite report</p>
          <button onClick={() => navigate("/onsite/create")}
            className="mt-4 px-5 py-2 bg-[#0B3D91] text-white rounded-xl text-sm font-semibold">
            Buat Pertama
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => {
            const sc = STATUS_CONFIG[r.status] || STATUS_CONFIG.draft;
            return (
              <div key={r.id} onClick={() => navigate(`/onsite/${r.id}`)}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-[#0B3D91]/30 transition-all cursor-pointer group">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#0B3D91] to-[#1E5CC6] rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-lg">🔧</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-gray-900 group-hover:text-[#0B3D91] transition-colors">{r.report_number}</p>
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>{sc.label}</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{r.client_name}{r.site_location && ` • ${r.site_location}`}</p>
                      {r.job_description && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{r.job_description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-right flex-shrink-0">
                    <div>
                      {r.visit_date && (
                        <p className="text-sm font-semibold text-gray-700">
                          {new Date(r.visit_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      )}
                      {r.engineer_name && <p className="text-xs text-gray-400">{r.engineer_name}</p>}
                    </div>
                    <svg className="w-5 h-5 text-gray-300 group-hover:text-[#0B3D91] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
