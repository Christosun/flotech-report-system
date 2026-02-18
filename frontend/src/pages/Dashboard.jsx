import { useEffect, useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, completed: 0, draft: 0, engineers: 0 });
  const [recentReports, setRecentReports] = useState([]);

  useEffect(() => {
    API.get("/report/list").then(res => {
      const reports = res.data;
      setStats(s => ({
        ...s,
        total: reports.length,
        completed: reports.filter(r => r.status === "completed" || r.status === "approved").length,
        draft: reports.filter(r => r.status === "draft").length,
      }));
      setRecentReports(reports.slice(0, 5));
    }).catch(() => {});

    API.get("/engineer/").then(res => {
      setStats(s => ({ ...s, engineers: res.data.length }));
    }).catch(() => {});
  }, []);

  const statCards = [
    { title: "Total Reports", value: stats.total, icon: "📋", color: "from-blue-500 to-blue-600", bg: "bg-blue-50" },
    { title: "Completed", value: stats.completed, icon: "✅", color: "from-green-500 to-green-600", bg: "bg-green-50" },
    { title: "Draft", value: stats.draft, icon: "📝", color: "from-orange-500 to-orange-600", bg: "bg-orange-50" },
    { title: "Engineers", value: stats.engineers, icon: "👷", color: "from-purple-500 to-purple-600", bg: "bg-purple-50" },
  ];

  const TYPE_COLORS = {
    commissioning: "bg-blue-100 text-blue-700",
    investigation: "bg-purple-100 text-purple-700",
    troubleshooting: "bg-orange-100 text-orange-700",
    service: "bg-green-100 text-green-700",
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">Welcome back — here's an overview of your activities</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((s) => (
          <div key={s.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center text-xl mb-3`}>
              {s.icon}
            </div>
            <p className="text-2xl font-black text-gray-800">{s.value}</p>
            <p className="text-xs text-gray-400 font-medium mt-0.5">{s.title}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <button
          onClick={() => navigate("/reports/create")}
          className="flex items-center gap-4 p-5 bg-gradient-to-r from-primary to-secondary text-white rounded-2xl hover:shadow-lg transition-all hover:scale-[1.01] text-left"
        >
          <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center text-2xl">✏️</div>
          <div>
            <p className="font-bold text-lg">Create Report</p>
            <p className="text-blue-200 text-sm">Start a new commissioning, investigation, troubleshooting, or service report</p>
          </div>
        </button>

        <button
          onClick={() => navigate("/engineers")}
          className="flex items-center gap-4 p-5 bg-white border border-gray-100 rounded-2xl hover:shadow-md transition-all hover:border-primary text-left"
        >
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-2xl">👷</div>
          <div>
            <p className="font-bold text-lg text-gray-800">Manage Engineers</p>
            <p className="text-gray-400 text-sm">Add engineers & digital signatures</p>
          </div>
        </button>
      </div>

      {/* Recent Reports */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <h2 className="font-bold text-gray-800">Recent Reports</h2>
          <button onClick={() => navigate("/reports")} className="text-xs text-primary font-semibold hover:underline">View all →</button>
        </div>
        {recentReports.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No reports yet</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentReports.map(r => (
              <div
                key={r.id}
                onClick={() => navigate(`/reports/${r.id}`)}
                className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-800">{r.report_number}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{r.client_name} — {r.project_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${TYPE_COLORS[r.report_type] || "bg-gray-100 text-gray-600"}`}>
                    {r.report_type}
                  </span>
                  <span className="text-xs text-gray-400">{r.report_date ? new Date(r.report_date).toLocaleDateString("id-ID") : ""}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}