import { useEffect, useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";

function formatRupiah(val) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(parseFloat(val) || 0);
}

function StatCard({ icon, label, value, sub, color, onClick }) {
  return (
    <button onClick={onClick}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-left hover:shadow-md transition-all hover:border-[#0B3D91]/40 group w-full">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg mb-3 ${color}`}>{icon}</div>
      <p className="text-2xl font-black text-gray-800 group-hover:text-[#0B3D91] transition-colors">{value}</p>
      <p className="text-xs font-bold text-gray-700 mt-0.5">{label}</p>
      <p className="text-xs text-gray-400">{sub}</p>
    </button>
  );
}

const TYPE_COLORS = {
  commissioning:  "bg-blue-100 text-blue-700",
  investigation:  "bg-purple-100 text-purple-700",
  troubleshooting:"bg-orange-100 text-orange-700",
  service:        "bg-green-100 text-green-700",
};
const QS_COLORS = {
  draft:    "bg-gray-100 text-gray-600",
  sent:     "bg-blue-100 text-blue-700",
  followup: "bg-yellow-100 text-yellow-700",
  won:      "bg-emerald-100 text-emerald-700",
  lost:     "bg-red-100 text-red-600",
};
const ONSITE_COLORS = {
  draft:     "bg-gray-100 text-gray-600",
  submitted: "bg-blue-100 text-blue-700",
  approved:  "bg-emerald-100 text-emerald-700",
};
const SURAT_COLORS = {
  serah:  "bg-blue-100 text-blue-700",
  terima: "bg-emerald-100 text-emerald-700",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    reports: 0, quotations: 0, stock: 0, catalog: 0,
    onsite: 0, surat: 0,
    wonValue: 0, pipeline: 0,
    onsiteDraft: 0, onsiteApproved: 0,
  });
  const [recentReports, setRecentReports]     = useState([]);
  const [recentQuotations, setRecentQuotations] = useState([]);
  const [recentOnsite, setRecentOnsite]       = useState([]);
  const [recentSurat, setRecentSurat]         = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      API.get("/report/list").catch(() => ({ data: [] })),
      API.get("/quotation/list").catch(() => ({ data: [] })),
      API.get("/stock/list").catch(() => ({ data: [] })),
      API.get("/catalog/list").catch(() => ({ data: [] })),
      API.get("/onsite/list").catch(() => ({ data: [] })),
      API.get("/surat/list").catch(() => ({ data: [] })),
    ]).then(([r, q, s, c, o, su]) => {
      const reports     = r.data  || [];
      const quotations  = q.data  || [];
      const stock       = s.data  || [];
      const catalog     = c.data  || [];
      const onsite      = o.data  || [];
      const surat       = su.data || [];

      setStats({
        reports:       reports.length,
        quotations:    quotations.length,
        stock:         stock.length,
        catalog:       catalog.length,
        onsite:        onsite.length,
        surat:         surat.length,
        wonValue:      quotations.filter(q => q.status === "won").reduce((s, q) => s + (q.total_amount || 0), 0),
        pipeline:      quotations.filter(q => ["draft","sent","followup"].includes(q.status)).reduce((s, q) => s + (q.total_amount || 0), 0),
        onsiteDraft:   onsite.filter(o => o.status === "draft").length,
        onsiteApproved:onsite.filter(o => o.status === "approved").length,
      });

      setRecentReports(reports.slice(0, 4));
      setRecentQuotations(quotations.slice(0, 4));
      setRecentOnsite(onsite.slice(0, 4));
      setRecentSurat(surat.slice(0, 4));
      setLoading(false);
    });
  }, []);

  const userName = localStorage.getItem("user_name") || "User";
  const hour = new Date().getHours();
  const greeting = hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : hour < 18 ? "Selamat sore" : "Selamat malam";

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B3D91]" />
    </div>
  );

  return (
    <div>
      {/* Welcome */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{greeting}, {userName} 👋</h1>
        <p className="text-gray-400 text-sm mt-0.5">PT Flotech Controls Indonesia — Work Management System</p>
      </div>

      {/* ── MAIN STATS (6 cards, 2 rows) ────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard icon="📋" label="Field Reports" value={stats.reports} sub="Total laporan" color="bg-blue-50" onClick={() => navigate("/reports")} />
        <StatCard icon="🔧" label="Onsite Reports" value={stats.onsite} sub={`${stats.onsiteDraft} draft`} color="bg-cyan-50" onClick={() => navigate("/onsite")} />
        <StatCard icon="📄" label="Quotations" value={stats.quotations} sub="Total quotation" color="bg-indigo-50" onClick={() => navigate("/quotations")} />
        <StatCard icon="📜" label="Serah Terima" value={stats.surat} sub="Total surat" color="bg-purple-50" onClick={() => navigate("/surat")} />
        <StatCard icon="📦" label="Stock & Demo" value={stats.stock} sub="Unit terdaftar" color="bg-orange-50" onClick={() => navigate("/stock")} />
        <StatCard icon="📚" label="Katalog" value={stats.catalog} sub="Dokumen" color="bg-teal-50" onClick={() => navigate("/catalog")} />
      </div>

      {/* ── REVENUE CARDS ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-r from-[#0B3D91] to-[#1E5CC6] rounded-2xl p-5 text-white">
          <p className="text-xs font-bold text-blue-200 uppercase tracking-wider mb-1">💰 Won Revenue</p>
          <p className="text-2xl font-black">{formatRupiah(stats.wonValue)}</p>
          <p className="text-blue-300 text-xs mt-1">Total nilai quotation yang berhasil ditutup</p>
        </div>
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-5 text-white">
          <p className="text-xs font-bold text-orange-100 uppercase tracking-wider mb-1">📈 Pipeline Value</p>
          <p className="text-2xl font-black">{formatRupiah(stats.pipeline)}</p>
          <p className="text-orange-100 text-xs mt-1">Nilai quotation sedang dalam proses</p>
        </div>
      </div>

      {/* ── QUICK ACTIONS ────────────────────────────────────── */}
      <div className="mb-6">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[
            { icon: "✏️", label: "Buat Report",   link: "/reports/create", color: "bg-blue-50 hover:bg-blue-100 text-blue-700" },
            { icon: "🔧", label: "Onsite Report", link: "/onsite/create",  color: "bg-cyan-50 hover:bg-cyan-100 text-cyan-700" },
            { icon: "📄", label: "Quotation",     link: "/quotations",     color: "bg-indigo-50 hover:bg-indigo-100 text-indigo-700" },
            { icon: "📜", label: "Serah Terima",  link: "/surat/create",   color: "bg-purple-50 hover:bg-purple-100 text-purple-700" },
            { icon: "📦", label: "Tambah Unit",   link: "/stock",          color: "bg-orange-50 hover:bg-orange-100 text-orange-700" },
            { icon: "📚", label: "Upload Katalog",link: "/catalog",        color: "bg-teal-50 hover:bg-teal-100 text-teal-700" },
          ].map(a => (
            <button key={a.label} onClick={() => navigate(a.link)}
              className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl font-semibold text-xs transition-all ${a.color}`}>
              <span className="text-xl">{a.icon}</span>
              <span className="text-center leading-tight">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── RECENT ACTIVITY: 2x2 grid ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Recent Field Reports */}
        <RecentCard
          title="📋 Field Reports Terbaru"
          link="/reports"
          empty={recentReports.length === 0}
        >
          {recentReports.map(r => (
            <div key={r.id} onClick={() => navigate(`/reports/${r.id}`)}
              className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{r.report_number}</p>
                <p className="text-xs text-gray-400 truncate">{r.client_name}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${TYPE_COLORS[r.report_type] || "bg-gray-100 text-gray-600"}`}>
                {r.report_type}
              </span>
            </div>
          ))}
        </RecentCard>

        {/* Recent Onsite Reports */}
        <RecentCard
          title="🔧 Onsite Reports Terbaru"
          link="/onsite"
          empty={recentOnsite.length === 0}
          emptyMsg="Belum ada onsite report"
        >
          {recentOnsite.map(r => (
            <div key={r.id} onClick={() => navigate(`/onsite/${r.id}`)}
              className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{r.report_number}</p>
                <p className="text-xs text-gray-400 truncate">
                  {r.client_name}{r.site_location ? ` · ${r.site_location}` : ""}
                </p>
              </div>
              <div className="flex-shrink-0 ml-2 text-right">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full block ${ONSITE_COLORS[r.status] || "bg-gray-100 text-gray-600"}`}>
                  {r.status}
                </span>
                {r.visit_date && (
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {new Date(r.visit_date).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}
                  </p>
                )}
              </div>
            </div>
          ))}
        </RecentCard>

        {/* Recent Quotations */}
        <RecentCard
          title="📄 Quotations Terbaru"
          link="/quotations"
          empty={recentQuotations.length === 0}
        >
          {recentQuotations.map(q => (
            <div key={q.id} onClick={() => navigate(`/quotations/${q.id}`)}
              className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#0B3D91] truncate">{q.quotation_number}</p>
                <p className="text-xs text-gray-400 truncate">{q.customer_company}</p>
              </div>
              <div className="flex-shrink-0 ml-2 text-right">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full block ${QS_COLORS[q.status] || "bg-gray-100 text-gray-600"}`}>
                  {q.status?.toUpperCase()}
                </span>
                <p className="text-xs font-bold text-gray-700 mt-0.5">{formatRupiah(q.total_amount)}</p>
              </div>
            </div>
          ))}
        </RecentCard>

        {/* Recent Surat Serah Terima */}
        <RecentCard
          title="📜 Surat Serah Terima Terbaru"
          link="/surat"
          empty={recentSurat.length === 0}
          emptyMsg="Belum ada surat serah terima"
        >
          {recentSurat.map(s => (
            <div key={s.id} onClick={() => navigate(`/surat/${s.id}`)}
              className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{s.surat_number}</p>
                <p className="text-xs text-gray-400 truncate">
                  {s.pihak_pertama_perusahaan || s.pihak_pertama_nama}
                  {" → "}
                  {s.pihak_kedua_perusahaan || s.pihak_kedua_nama}
                </p>
              </div>
              <div className="flex-shrink-0 ml-2 text-right">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full block ${SURAT_COLORS[s.surat_type] || "bg-gray-100 text-gray-600"}`}>
                  {s.surat_type === "serah" ? "Serah" : "Terima"}
                </span>
                {s.surat_date && (
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {new Date(s.surat_date).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}
                  </p>
                )}
              </div>
            </div>
          ))}
        </RecentCard>

      </div>
    </div>
  );
}

/* ── Reusable Recent Card ─────────────────────────────────── */
function RecentCard({ title, link, empty, emptyMsg = "Belum ada data", children }) {
  const navigate = useNavigate();
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3.5 border-b border-gray-50 flex items-center justify-between">
        <h2 className="font-bold text-gray-800 text-sm">{title}</h2>
        <button onClick={() => navigate(link)} className="text-xs text-[#0B3D91] font-semibold hover:underline">
          Lihat semua →
        </button>
      </div>
      {empty ? (
        <div className="p-8 text-center text-gray-400 text-sm">{emptyMsg}</div>
      ) : (
        <div className="divide-y divide-gray-50">{children}</div>
      )}
    </div>
  );
}