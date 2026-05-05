import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Upload,
  Download,
  PenLine,
  Search,
  ChevronRight,
  Plus,
  X,
  PackageOpen,
  PackageCheck,
  ScrollText,
} from "lucide-react";
import API from "../services/api";
import toast from "react-hot-toast";

const SURAT_TYPE = {
  serah: {
    label: "Handover",
    Icon: Upload,
    bg: "bg-blue-50",
    iconColor: "text-blue-600",
    badgeBg: "bg-blue-100",
    badgeText: "text-blue-700",
  },
  terima: {
    label: "Receive Goods",
    Icon: Download,
    bg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-700",
  },
};

const STATUS_CONFIG = {
  draft:  { label: "Draft",  bg: "bg-gray-100",    text: "text-gray-600" },
  final:  { label: "Final",  bg: "bg-blue-100",    text: "text-blue-700" },
  signed: { label: "Signed", bg: "bg-emerald-100", text: "text-emerald-700" },
};

const stats = (items) => [
  {
    label: "Total Letters",
    val: items.length,
    Icon: ScrollText,
    color: "text-[#0B3D91]",
    bg: "bg-[#0B3D91]/10",
  },
  {
    label: "Handover",
    val: items.filter((i) => i.surat_type === "serah").length,
    Icon: PackageOpen,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    label: "Receive Goods",
    val: items.filter((i) => i.surat_type === "terima").length,
    Icon: PackageCheck,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    label: "Signed",
    val: items.filter((i) => i.status === "signed").length,
    Icon: PenLine,
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
];

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
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const filtered = items.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      [
        s.surat_number,
        s.pihak_pertama_nama,
        s.pihak_pertama_perusahaan,
        s.pihak_kedua_nama,
        s.pihak_kedua_perusahaan,
      ].some((v) => v?.toLowerCase().includes(q));
    const matchType = !filterType || s.surat_type === filterType;
    const matchStatus = !filterStatus || s.status === filterStatus;
    const matchFrom =
      !filterDateFrom || (s.surat_date && s.surat_date >= filterDateFrom);
    const matchTo =
      !filterDateTo || (s.surat_date && s.surat_date <= filterDateTo);
    return matchSearch && matchType && matchStatus && matchFrom && matchTo;
  });

  const hasActiveFilters =
    search || filterType || filterStatus || filterDateFrom || filterDateTo;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Material Handover</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Minutes of handover and receipt of goods
          </p>
        </div>
        <button
          onClick={() => navigate("/surat/create")}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-semibold hover:bg-[#1E5CC6] transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Create a Letter
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {stats(items).map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${s.bg}`}>
              <s.Icon className={`w-5 h-5 ${s.color}`} strokeWidth={1.75} />
            </div>
            <p className={`text-2xl font-black ${s.color}`}>{s.val}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for letter number, name, company..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91]"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-white"
          >
            <option value="">All Type</option>
            {Object.entries(SURAT_TYPE).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-white"
          >
            <option value="">All Status</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-2">
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91]"
            />
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91]"
            />
          </div>
        </div>
        {hasActiveFilters && (
          <button
            onClick={() => {
              setSearch("");
              setFilterType("");
              setFilterStatus("");
              setFilterDateFrom("");
              setFilterDateTo("");
            }}
            className="mt-3 flex items-center gap-1 text-xs text-[#0B3D91] hover:underline"
          >
            <X className="w-3 h-3" />
            Reset filter
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
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <FileText className="w-7 h-7 text-gray-400" strokeWidth={1.5} />
          </div>
          <p className="text-gray-500 font-medium">No handover letter yet</p>
          <button
            onClick={() => navigate("/surat/create")}
            className="mt-4 px-5 py-2 bg-[#0B3D91] text-white rounded-xl text-sm font-semibold"
          >
            Create First Letter
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => {
            const tc = SURAT_TYPE[s.surat_type] || SURAT_TYPE.serah;
            const sc = STATUS_CONFIG[s.status] || STATUS_CONFIG.draft;
            const TypeIcon = tc.Icon;
            return (
              <div
                key={s.id}
                onClick={() => navigate(`/surat/${s.id}`)}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-[#0B3D91]/30 transition-all cursor-pointer group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${tc.bg}`}
                    >
                      <TypeIcon
                        className={`w-5 h-5 ${tc.iconColor}`}
                        strokeWidth={1.75}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-gray-900 group-hover:text-[#0B3D91] transition-colors">
                          {s.surat_number}
                        </p>
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${tc.badgeBg} ${tc.badgeText}`}
                        >
                          {tc.label}
                        </span>
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${sc.bg} ${sc.text}`}
                        >
                          {sc.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {s.pihak_pertama_perusahaan || s.pihak_pertama_nama} →{" "}
                        {s.pihak_kedua_perusahaan || s.pihak_kedua_nama}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-right flex-shrink-0">
                    <div>
                      {s.surat_date && (
                        <p className="text-sm font-semibold text-gray-700">
                          {new Date(s.surat_date).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      )}
                      {s.items_count > 0 && (
                        <p className="text-xs text-gray-400">
                          {s.items_count} items
                        </p>
                      )}
                    </div>
                    <ChevronRight
                      className="w-5 h-5 text-gray-300 group-hover:text-[#0B3D91] transition-colors"
                      strokeWidth={2}
                    />
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