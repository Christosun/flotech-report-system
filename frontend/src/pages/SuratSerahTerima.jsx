import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import toast from "react-hot-toast";

const SURAT_TYPE = {
  serah: { label: "Serah Terima", icon: "📤", bg: "bg-blue-100", text: "text-blue-700" },
  terima: { label: "Terima Barang", icon: "📥", bg: "bg-emerald-100", text: "text-emerald-700" },
};
const STATUS_CONFIG = {
  draft:    { label: "Draft",    bg: "bg-gray-100",    text: "text-gray-600" },
  final:    { label: "Final",    bg: "bg-blue-100",    text: "text-blue-700" },
  signed:   { label: "Signed",   bg: "bg-emerald-100", text: "text-emerald-700" },
};

export default function SuratSerahTerima() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await API.get("/surat/list");
      setItems(res.data);
    } catch { toast.error("Gagal memuat data"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, []);

  const filtered = items.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !search || [s.surat_number, s.pihak_pertama_nama, s.pihak_pertama_perusahaan, s.pihak_kedua_nama, s.pihak_kedua_perusahaan]
      .some(v => v?.toLowerCase().includes(q));
    const matchType = !filterType || s.surat_type === filterType;
    const matchStatus = !filterStatus || s.status === filterStatus;
    const matchFrom = !filterDateFrom || (s.surat_date && s.surat_date >= filterDateFrom);
    const matchTo = !filterDateTo || (s.surat_date && s.surat_date <= filterDateTo);
    return matchSearch && matchType && matchStatus && matchFrom && matchTo;
  });

  const stats = [
    { label: "Total", val: items.length, icon: "📜", color: "text-[#0B3D91]" },
    { label: "Serah Terima", val: items.filter(i => i.surat_type === "serah").length, icon: "📤", color: "text-blue-600" },
    { label: "Terima Barang", val: items.filter(i => i.surat_type === "terima").length, icon: "📥", color: "text-emerald-600" },
    { label: "Signed", val: items.filter(i => i.status === "signed").length, icon: "✍", color: "text-purple-600" },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Surat Serah Terima</h1>
          <p className="text-sm text-gray-400 mt-0.5">Berita acara serah terima dan penerimaan barang</p>
        </div>
        <button onClick={() => navigate("/surat/create")}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-semibold hover:bg-[#1E5CC6] transition-colors shadow-sm">
          + Buat Surat
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
              placeholder="Cari nomor surat, nama, perusahaan..." className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91]" />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-white">
            <option value="">Semua Tipe</option>
            {Object.entries(SURAT_TYPE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-white">
            <option value="">Semua Status</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-2">
            <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91]" />
            <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91]" />
          </div>
        </div>
        {(search || filterType || filterStatus || filterDateFrom || filterDateTo) && (
          <button onClick={() => { setSearch(""); setFilterType(""); setFilterStatus(""); setFilterDateFrom(""); setFilterDateTo(""); }} className="mt-3 text-xs text-[#0B3D91] hover:underline">× Reset filter</button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center items-center h-40"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B3D91]" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-4xl mb-3">📜</p>
          <p className="text-gray-500 font-medium">Belum ada surat serah terima</p>
          <button onClick={() => navigate("/surat/create")} className="mt-4 px-5 py-2 bg-[#0B3D91] text-white rounded-xl text-sm font-semibold">Buat Pertama</button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(s => {
            const tc = SURAT_TYPE[s.surat_type] || SURAT_TYPE.serah;
            const sc = STATUS_CONFIG[s.status] || STATUS_CONFIG.draft;
            return (
              <div key={s.id} onClick={() => navigate(`/surat/${s.id}`)}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-[#0B3D91]/30 transition-all cursor-pointer group">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${tc.bg}`}>
                      <span className="text-lg">{tc.icon}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-gray-900 group-hover:text-[#0B3D91] transition-colors">{s.surat_number}</p>
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${tc.bg} ${tc.text}`}>{tc.label}</span>
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>{sc.label}</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {s.pihak_pertama_perusahaan || s.pihak_pertama_nama} → {s.pihak_kedua_perusahaan || s.pihak_kedua_nama}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-right flex-shrink-0">
                    <div>
                      {s.surat_date && <p className="text-sm font-semibold text-gray-700">{new Date(s.surat_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</p>}
                      {s.items_count > 0 && <p className="text-xs text-gray-400">{s.items_count} item barang</p>}
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
