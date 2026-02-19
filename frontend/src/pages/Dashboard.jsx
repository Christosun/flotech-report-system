import { useEffect, useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";

function formatRupiah(val) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(parseFloat(val) || 0);
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ reports: 0, quotations: 0, stock: 0, catalog: 0, wonValue: 0, pipeline: 0 });
  const [recentReports, setRecentReports] = useState([]);
  const [recentQuotations, setRecentQuotations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      API.get("/report/list").catch(() => ({ data: [] })),
      API.get("/quotation/list").catch(() => ({ data: [] })),
      API.get("/stock/list").catch(() => ({ data: [] })),
      API.get("/catalog/list").catch(() => ({ data: [] })),
    ]).then(([r, q, s, c]) => {
      const reports = r.data || [];
      const quotations = q.data || [];
      const stock = s.data || [];
      const catalog = c.data || [];
      setStats({
        reports: reports.length,
        quotations: quotations.length,
        stock: stock.length,
        catalog: catalog.length,
        wonValue: quotations.filter(q => q.status === "won").reduce((s, q) => s + (q.total_amount || 0), 0),
        pipeline: quotations.filter(q => ["draft","sent","followup"].includes(q.status)).reduce((s, q) => s + (q.total_amount || 0), 0),
      });
      setRecentReports(reports.slice(0, 4));
      setRecentQuotations(quotations.slice(0, 4));
      setLoading(false);
    });
  }, []);

  const TYPE_COLORS = {
    commissioning: "bg-blue-100 text-blue-700",
    investigation: "bg-purple-100 text-purple-700",
    troubleshooting: "bg-orange-100 text-orange-700",
    service: "bg-green-100 text-green-700",
  };

  const QS_COLORS = {
    draft: "bg-gray-100 text-gray-600",
    sent: "bg-blue-100 text-blue-700",
    followup: "bg-yellow-100 text-yellow-700",
    won: "bg-green-100 text-green-700",
    lost: "bg-red-100 text-red-600",
  };

  if (loading) return (
    <div className="flex justify-center items-center h-40">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B3D91]" />
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-0.5">Selamat datang di sistem manajemen PT Flotech Controls Indonesia</p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Field Reports", val: stats.reports, icon: "📋", sub: "Total laporan", color: "from-blue-500 to-blue-600", link: "/reports" },
          { label: "Quotations", val: stats.quotations, icon: "📄", sub: "Total quotation", color: "from-indigo-500 to-indigo-600", link: "/quotations" },
          { label: "Stock & Demo", val: stats.stock, icon: "📦", sub: "Unit terdaftar", color: "from-purple-500 to-purple-600", link: "/stock" },
          { label: "Catalog & Manual", val: stats.catalog, icon: "📚", sub: "Dokumen", color: "from-teal-500 to-teal-600", link: "/catalog" },
        ].map(s => (
          <button key={s.label} onClick={() => navigate(s.link)}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-left hover:shadow-md transition-all hover:border-[#0B3D91] group">
            <div className="text-2xl mb-2">{s.icon}</div>
            <p className="text-2xl font-black text-gray-800 group-hover:text-[#0B3D91] transition-colors">{s.val}</p>
            <p className="text-xs font-bold text-gray-800 mt-0.5">{s.label}</p>
            <p className="text-xs text-gray-400">{s.sub}</p>
          </button>
        ))}
      </div>

      {/* Revenue cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-r from-[#0B3D91] to-[#1E5CC6] rounded-2xl p-5 text-white">
          <p className="text-xs font-bold text-blue-200 uppercase tracking-wider mb-1">💰 Won Revenue</p>
          <p className="text-2xl font-black">{formatRupiah(stats.wonValue)}</p>
          <p className="text-blue-300 text-xs mt-1">Total nilai quotation yang berhasil</p>
        </div>
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-5 text-white">
          <p className="text-xs font-bold text-orange-100 uppercase tracking-wider mb-1">📈 Pipeline Value</p>
          <p className="text-2xl font-black">{formatRupiah(stats.pipeline)}</p>
          <p className="text-orange-100 text-xs mt-1">Nilai quotation dalam proses</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { icon: "✏️", label: "Buat Report", link: "/reports/create", color: "bg-blue-50 hover:bg-blue-100 text-blue-700" },
          { icon: "📄", label: "Buat Quotation", link: "/quotations", color: "bg-indigo-50 hover:bg-indigo-100 text-indigo-700" },
          { icon: "📦", label: "Tambah Unit", link: "/stock", color: "bg-purple-50 hover:bg-purple-100 text-purple-700" },
          { icon: "📚", label: "Upload Catalog", link: "/catalog", color: "bg-teal-50 hover:bg-teal-100 text-teal-700" },
        ].map(a => (
          <button key={a.label} onClick={() => navigate(a.link)}
            className={`flex flex-col items-center gap-2 p-4 rounded-2xl font-semibold text-xs transition-all ${a.color}`}>
            <span className="text-2xl">{a.icon}</span>
            {a.label}
          </button>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Reports */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h2 className="font-bold text-gray-800 text-sm">📋 Report Terbaru</h2>
            <button onClick={() => navigate("/reports")} className="text-xs text-[#0B3D91] font-semibold hover:underline">Lihat semua →</button>
          </div>
          {recentReports.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">Belum ada report</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentReports.map(r => (
                <div key={r.id} onClick={() => navigate(`/reports/${r.id}`)}
                  className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{r.report_number}</p>
                    <p className="text-xs text-gray-400">{r.client_name}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TYPE_COLORS[r.report_type] || "bg-gray-100 text-gray-600"}`}>
                    {r.report_type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Quotations */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h2 className="font-bold text-gray-800 text-sm">📄 Quotation Terbaru</h2>
            <button onClick={() => navigate("/quotations")} className="text-xs text-[#0B3D91] font-semibold hover:underline">Lihat semua →</button>
          </div>
          {recentQuotations.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">Belum ada quotation</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentQuotations.map(q => (
                <div key={q.id} onClick={() => navigate(`/quotations/${q.id}`)}
                  className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-[#0B3D91]">{q.quotation_number}</p>
                    <p className="text-xs text-gray-400">{q.customer_company}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full block mb-1 ${QS_COLORS[q.status] || "bg-gray-100 text-gray-600"}`}>
                      {q.status?.toUpperCase()}
                    </span>
                    <p className="text-xs font-bold text-gray-700">{formatRupiah(q.total_amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
