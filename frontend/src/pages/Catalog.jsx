import { useState, useEffect } from "react";
import API from "../services/api";
import toast from "react-hot-toast";

const TYPE_CONFIG = {
  catalog:    { label: "Catalog",      icon: "📘", bg: "bg-blue-50",   text: "text-blue-700" },
  manual:     { label: "Manual Book",  icon: "📗", bg: "bg-green-50",  text: "text-green-700" },
  datasheet:  { label: "Datasheet",    icon: "📊", bg: "bg-purple-50", text: "text-purple-700" },
  certificate:{ label: "Certificate",  icon: "🏆", bg: "bg-yellow-50", text: "text-yellow-700" },
  brochure:   { label: "Brochure",     icon: "📰", bg: "bg-orange-50", text: "text-orange-700" },
  other:      { label: "Other",        icon: "📄", bg: "bg-gray-50",   text: "text-gray-700" },
};

const BRAND_OPTIONS = ["iSOLV", "Other"];

export default function Catalog() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterBrand, setFilterBrand] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const [form, setForm] = useState({
    title: "", brand: "", model_series: "", document_type: "catalog",
    description: "", tags: "",
    file: null,
  });

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await API.get("/catalog/list");
      setFiles(res.data);
    } catch { toast.error("Gagal memuat catalog"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchFiles(); }, []);

  const handleFileSelect = (file) => {
    setForm(f => ({ ...f, file, title: f.title || file.name.replace(/\.[^.]+$/, "") }));
  };

  const handleSubmit = async () => {
    if (!form.title || !form.file) { toast.error("Judul dan file wajib dipilih"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", form.file);
      fd.append("title", form.title);
      fd.append("brand", form.brand);
      fd.append("model_series", form.model_series);
      fd.append("document_type", form.document_type);
      fd.append("description", form.description);
      fd.append("tags", form.tags);
      await API.post("/catalog/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Dokumen berhasil diupload! 📚");
      setShowUpload(false);
      setForm({ title: "", brand: "", model_series: "", document_type: "catalog", description: "", tags: "", file: null });
      fetchFiles();
    } catch (err) { toast.error(err.response?.data?.error || "Upload gagal"); }
    finally { setUploading(false); }
  };

  const handleDownload = async (id, filename) => {
    try {
      const res = await API.get(`/catalog/download/${id}`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url; link.download = filename; link.click();
      URL.revokeObjectURL(url);
      toast.success("Mendownload...");
    } catch { toast.error("Gagal download"); }
  };

  const handleView = async (id) => {
    try {
      const res = await API.get(`/catalog/download/${id}`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      window.open(url, "_blank");
    } catch { toast.error("Gagal membuka file"); }
  };

  const deleteFile = async (id) => {
    if (!confirm("Hapus dokumen ini?")) return;
    try { await API.delete(`/catalog/delete/${id}`); toast.success("Dokumen dihapus"); fetchFiles(); }
    catch { toast.error("Gagal menghapus"); }
  };

  const formatSize = (bytes) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const filtered = files.filter(f => {
    const matchSearch = !search || [f.title, f.brand, f.model_series, f.description, f.tags]
      .some(s => s?.toLowerCase().includes(search.toLowerCase()));
    const matchType = !filterType || f.document_type === filterType;
    const matchBrand = !filterBrand || f.brand === filterBrand;
    return matchSearch && matchType && matchBrand;
  });

  const brands = [...new Set(files.map(f => f.brand).filter(Boolean))];
  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white";
  const labelClass = "block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5";

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Catalogs & Manuals</h1>
          <p className="text-sm text-gray-400 mt-0.5">{files.length} dokumen tersimpan</p>
        </div>
        <button onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-semibold hover:bg-[#1E5CC6] transition-colors">
          + Upload Dokumen
        </button>
      </div>

      {/* Stats by type */}
      <div className="flex flex-wrap gap-3 mb-6">
        {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
          const count = files.filter(f => f.document_type === key).length;
          if (count === 0) return null;
          return (
            <button key={key} onClick={() => setFilterType(filterType === key ? "" : key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all
                ${filterType === key ? "border-[#0B3D91] bg-[#0B3D91] text-white" : `border-transparent ${cfg.bg} ${cfg.text} hover:border-current`}`}>
              <span>{cfg.icon}</span> {cfg.label} <span className="font-black">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari judul, brand, model, tags..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white" />
        </div>
        <select value={filterBrand} onChange={e => setFilterBrand(e.target.value)}
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-white">
          <option value="">Semua Brand</option>
          {brands.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      {/* Files Grid */}
      {loading ? (
        <div className="flex justify-center items-center h-40"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B3D91]" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-4xl mb-3">📚</p>
          <p className="text-gray-500 font-medium">Belum ada dokumen</p>
          <p className="text-gray-400 text-sm mt-1">Upload catalog, manual, atau datasheet alat Anda</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Dokumen","Brand / Model","Tipe","Tags","Ukuran","Tanggal","Aksi"].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(file => {
                  const tc = TYPE_CONFIG[file.document_type] || TYPE_CONFIG.other;
                  const isPdf = file.filename?.toLowerCase().endsWith(".pdf");
                  return (
                    <tr key={file.id} className="hover:bg-blue-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-8 h-8 ${tc.bg} rounded-lg flex items-center justify-center text-base flex-shrink-0`}>{tc.icon}</span>
                          <p className="font-semibold text-gray-800 text-sm max-w-[200px] truncate">{file.title}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {file.brand && <p className="text-sm font-semibold text-gray-700">{file.brand}</p>}
                        {file.model_series && <p className="text-xs text-gray-400">{file.model_series}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap ${tc.bg} ${tc.text}`}>{tc.label}</span>
                      </td>
                      <td className="px-4 py-3 max-w-[160px]">
                        {file.tags ? (
                          <div className="flex flex-wrap gap-1">
                            {file.tags.split(",").slice(0,3).map(t => t.trim()).filter(Boolean).map(tag => (
                              <span key={tag} className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded text-[10px] font-medium">#{tag}</span>
                            ))}
                          </div>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatSize(file.file_size)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {file.created_at ? new Date(file.created_at).toLocaleDateString("id-ID") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          {isPdf && (
                            <button onClick={() => handleView(file.id)}
                              className="px-2.5 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100">👁 View</button>
                          )}
                          <button onClick={() => handleDownload(file.id, file.filename)}
                            className="px-2.5 py-1.5 bg-[#0B3D91] text-white rounded-lg text-xs font-semibold hover:bg-[#1E5CC6]">⬇ DL</button>
                          <button onClick={() => deleteFile(file.id)}
                            className="px-2.5 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100">🗑</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Mobile list */}
          <div className="md:hidden divide-y divide-gray-50">
            {filtered.map(file => {
              const tc = TYPE_CONFIG[file.document_type] || TYPE_CONFIG.other;
              const isPdf = file.filename?.toLowerCase().endsWith(".pdf");
              return (
                <div key={file.id} className="p-4 flex items-center gap-3">
                  <span className={`w-10 h-10 ${tc.bg} rounded-xl flex items-center justify-center text-xl flex-shrink-0`}>{tc.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm truncate">{file.title}</p>
                    <p className="text-xs text-gray-400">{file.brand}{file.model_series ? ` • ${file.model_series}` : ""}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tc.bg} ${tc.text}`}>{tc.label}</span>
                      <span className="text-[10px] text-gray-400">{formatSize(file.file_size)}</span>
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {isPdf && <button onClick={() => handleView(file.id)} className="p-2 bg-blue-50 text-blue-700 rounded-lg text-xs hover:bg-blue-100">👁</button>}
                    <button onClick={() => handleDownload(file.id, file.filename)} className="p-2 bg-[#0B3D91] text-white rounded-lg text-xs hover:bg-[#1E5CC6]">⬇</button>
                    <button onClick={() => deleteFile(file.id)} className="p-2 bg-red-50 text-red-600 rounded-lg text-xs hover:bg-red-100">🗑</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4">
            <div className="sticky top-0 bg-white rounded-t-2xl border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="font-bold text-gray-800">Upload Dokumen Baru</h2>
              <button onClick={() => setShowUpload(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {/* Drop Zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={e => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0]); }}
                onClick={() => document.getElementById("catalogFile").click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                  ${dragActive ? "border-[#0B3D91] bg-blue-50 scale-[1.01]" : form.file ? "border-green-400 bg-green-50" : "border-gray-200 hover:border-[#0B3D91] hover:bg-blue-50"}`}
              >
                {form.file ? (
                  <>
                    <p className="text-3xl mb-2">✅</p>
                    <p className="font-semibold text-green-700 text-sm">{form.file.name}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatSize(form.file.size)} • Klik untuk ganti</p>
                  </>
                ) : (
                  <>
                    <p className="text-3xl mb-2">📄</p>
                    <p className="text-sm font-semibold text-gray-600">Drop file di sini atau klik untuk pilih</p>
                    <p className="text-xs text-gray-400 mt-1">PDF, Word, Excel, ZIP — maks 50MB</p>
                  </>
                )}
              </div>
              <input id="catalogFile" type="file" className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.png,.jpg"
                onChange={e => e.target.files[0] && handleFileSelect(e.target.files[0])} />

              <div>
                <label className={labelClass}>Judul Dokumen *</label>
                <input value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                  placeholder="Judul dokumen" className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Tipe Dokumen</label>
                  <select value={form.document_type} onChange={e => setForm({...form, document_type: e.target.value})} className={inputClass}>
                    {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Brand / Principal</label>
                  <input value={form.brand} onChange={e => setForm({...form, brand: e.target.value})}
                    list="brandList" placeholder="iSOLV atau brand lain" className={inputClass} />
                  <datalist id="brandList">
                    {BRAND_OPTIONS.map(b => <option key={b} value={b} />)}
                  </datalist>
                </div>
              </div>
              <div>
                <label className={labelClass}>Model / Series</label>
                <input value={form.model_series} onChange={e => setForm({...form, model_series: e.target.value})}
                  placeholder="Contoh: Promag W 400, EH-FMR57" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Deskripsi</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  rows={2} placeholder="Deskripsi singkat isi dokumen" className={inputClass + " resize-none"} />
              </div>
              <div>
                <label className={labelClass}>Tags (pisahkan dengan koma)</label>
                <input value={form.tags} onChange={e => setForm({...form, tags: e.target.value})}
                  placeholder="flow, magnetic, wastewater, DN50" className={inputClass} />
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 rounded-b-2xl flex gap-3 justify-end">
              <button onClick={() => setShowUpload(false)} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Batal</button>
              <button onClick={handleSubmit} disabled={uploading || !form.file}
                className="px-6 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-bold hover:bg-[#1E5CC6] disabled:opacity-60 flex items-center gap-2">
                {uploading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Uploading...</> : "⬆ Upload Dokumen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}