import { useState, useEffect } from "react";
import API from "../services/api";
import toast from "react-hot-toast";

const TYPE_CONFIG = {
  catalog:     { label: "Catalog",     icon: "📘", bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-300" },
  manual:      { label: "Manual Book", icon: "📗", bg: "bg-green-50",  text: "text-green-700",  border: "border-green-300" },
  datasheet:   { label: "Datasheet",   icon: "📊", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-300" },
  certificate: { label: "Certificate", icon: "🏆", bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-300" },
  brochure:    { label: "Brochure",    icon: "📰", bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-300" },
  other:       { label: "Other",       icon: "📄", bg: "bg-gray-50",   text: "text-gray-600",   border: "border-gray-300" },
};

/* ─── Elegant Delete Dialog ───────────────────────────────────── */
function DeleteDialog({ title, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-gradient-to-br from-red-50 to-rose-100 px-6 pt-6 pb-4 text-center">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">🗑</span>
          </div>
          <h3 className="text-lg font-bold text-gray-800">Hapus Dokumen?</h3>
          <p className="text-sm text-gray-500 mt-1">
            <span className="font-semibold text-gray-700">"{title}"</span> akan dihapus permanen dan tidak bisa dikembalikan.
          </p>
        </div>
        <div className="px-6 py-4 flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Batal
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Catalog() {
  const [files, setFiles]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [search, setSearch]         = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterBrand, setFilterBrand] = useState("");
  const [filterTag, setFilterTag]   = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, title }
  const [deleting, setDeleting]     = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [form, setForm] = useState({
    title: "", brand: "", model_series: "", document_type: "catalog",
    description: "", tags: "", file: null,
  });

  const fetchFiles = async () => {
    setLoading(true);
    try { const res = await API.get("/catalog/list"); setFiles(res.data); }
    catch { toast.error("Gagal memuat catalog"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchFiles(); }, []);

  // ── Derive all unique tags from all files ─────────────────────
  const allTags = [...new Set(
    files.flatMap(f => (f.tags || "").split(",").map(t => t.trim()).filter(Boolean))
  )].sort();

  const brands = [...new Set(files.map(f => f.brand).filter(Boolean))];

  // ── Filter logic ──────────────────────────────────────────────
  const filtered = files.filter(f => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      [f.title, f.brand, f.model_series, f.description, f.tags]
        .some(s => s?.toLowerCase().includes(q));
    const matchType  = !filterType  || f.document_type === filterType;
    const matchBrand = !filterBrand || f.brand === filterBrand;
    const matchTag   = !filterTag   || (f.tags || "").split(",").map(t => t.trim()).includes(filterTag);
    return matchSearch && matchType && matchBrand && matchTag;
  });

  const handleFileSelect = file => {
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
      Object.assign(document.createElement("a"), { href: url, download: filename }).click();
      URL.revokeObjectURL(url);
      toast.success("Mendownload...");
    } catch { toast.error("Gagal download"); }
  };

  const handleView = async (id) => {
    try {
      const res = await API.get(`/catalog/download/${id}`, { responseType: "blob" });
      window.open(URL.createObjectURL(new Blob([res.data], { type: "application/pdf" })), "_blank");
    } catch { toast.error("Gagal membuka file"); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await API.delete(`/catalog/delete/${deleteTarget.id}`);
      toast.success("Dokumen dihapus");
      setDeleteTarget(null); fetchFiles();
    } catch { toast.error("Gagal menghapus"); }
    finally { setDeleting(false); }
  };

  const formatSize = bytes => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const hasFilter = search || filterType || filterBrand || filterTag;
  const clearAll  = () => { setSearch(""); setFilterType(""); setFilterBrand(""); setFilterTag(""); };

  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white";
  const labelClass = "block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5";

  return (
    <div className="w-full">
      {/* Delete Dialog */}
      {deleteTarget && (
        <DeleteDialog
          title={deleteTarget.title}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Catalogs & Manuals</h1>
          <p className="text-sm text-gray-400 mt-0.5">{files.length} dokumen tersimpan</p>
        </div>
        <button onClick={() => setShowUpload(true)}
          className="self-start sm:self-auto flex items-center gap-2 px-5 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-semibold hover:bg-[#1E5CC6] transition-colors">
          + Upload Dokumen
        </button>
      </div>

      {/* ── Type filter pills ──────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setFilterType("")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all
            ${!filterType ? "bg-[#0B3D91] text-white border-[#0B3D91]" : "bg-white text-gray-500 border-gray-200 hover:border-[#0B3D91]"}`}>
          Semua ({files.length})
        </button>
        {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
          const count = files.filter(f => f.document_type === key).length;
          if (count === 0) return null;
          return (
            <button key={key}
              onClick={() => setFilterType(filterType === key ? "" : key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all
                ${filterType === key
                  ? "border-[#0B3D91] bg-[#0B3D91] text-white"
                  : `border-transparent ${cfg.bg} ${cfg.text} hover:border-current`}`}>
              {cfg.icon} {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      {/* ── Search + Brand filter ──────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1 min-w-0">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari judul, brand, model, deskripsi, tags..."
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white"
          />
        </div>
        <select
          value={filterBrand}
          onChange={e => setFilterBrand(e.target.value)}
          className="sm:w-40 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white flex-shrink-0">
          <option value="">Semua Brand</option>
          {brands.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        {hasFilter && (
          <button onClick={clearAll} className="text-xs text-[#0B3D91] hover:underline px-2 whitespace-nowrap">
            × Reset Filter
          </button>
        )}
      </div>

      {/* ── TAG FILTER CHIPS ───────────────────────────────────── */}
      {allTags.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-4 py-3 mb-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">🏷 Filter Tag</p>
          <div className="flex flex-wrap gap-1.5">
            {filterTag && (
              <button
                onClick={() => setFilterTag("")}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#0B3D91] text-white">
                × Hapus filter tag
              </button>
            )}
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setFilterTag(filterTag === tag ? "" : tag)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border
                  ${filterTag === tag
                    ? "bg-[#0B3D91] text-white border-[#0B3D91]"
                    : "bg-gray-50 text-gray-600 border-gray-200 hover:border-[#0B3D91] hover:text-[#0B3D91]"}`}>
                {tag}
                <span className="ml-1 opacity-60">
                  ({files.filter(f => (f.tags || "").split(",").map(t => t.trim()).includes(tag)).length})
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Results info ───────────────────────────────────────── */}
      {hasFilter && (
        <p className="text-xs text-gray-400 mb-3 px-1">
          Menampilkan <span className="font-bold text-gray-700">{filtered.length}</span> dari {files.length} dokumen
          {filterTag && <span className="ml-1 text-[#0B3D91] font-semibold">· tag: {filterTag}</span>}
        </p>
      )}

      {/* ── File List ──────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B3D91]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-4xl mb-3">📚</p>
          <p className="text-gray-500 font-medium">
            {hasFilter ? "Tidak ada dokumen yang cocok dengan filter" : "Belum ada dokumen"}
          </p>
          {!hasFilter && (
            <button onClick={() => setShowUpload(true)}
              className="mt-4 px-5 py-2 bg-[#0B3D91] text-white rounded-xl text-sm font-semibold">
              Upload Pertama
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Dokumen", "Brand / Model", "Tipe", "Tags", "Ukuran", "Tanggal", "Aksi"].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(file => {
                  const tc = TYPE_CONFIG[file.document_type] || TYPE_CONFIG.other;
                  const isPdf = file.filename?.toLowerCase().endsWith(".pdf");
                  const fileTags = (file.tags || "").split(",").map(t => t.trim()).filter(Boolean);
                  return (
                    <tr key={file.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-4 py-3 max-w-[220px]">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-8 h-8 ${tc.bg} rounded-lg flex items-center justify-center text-base flex-shrink-0`}>{tc.icon}</span>
                          <p className="font-semibold text-gray-800 text-sm truncate">{file.title}</p>
                        </div>
                        {file.description && (
                          <p className="text-xs text-gray-400 mt-0.5 ml-10 truncate max-w-[180px]">{file.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {file.brand && <p className="text-sm font-semibold text-gray-700">{file.brand}</p>}
                        {file.model_series && <p className="text-xs text-gray-400">{file.model_series}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap ${tc.bg} ${tc.text}`}>{tc.label}</span>
                      </td>
                      <td className="px-4 py-3 max-w-[180px]">
                        <div className="flex flex-wrap gap-1">
                          {fileTags.slice(0, 4).map(tag => (
                            <button
                              key={tag}
                              onClick={() => setFilterTag(filterTag === tag ? "" : tag)}
                              className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border transition-all
                                ${filterTag === tag
                                  ? "bg-[#0B3D91] text-white border-[#0B3D91]"
                                  : "bg-gray-50 text-gray-500 border-gray-200 hover:border-[#0B3D91] hover:text-[#0B3D91]"}`}>
                              {tag}
                            </button>
                          ))}
                          {fileTags.length > 4 && (
                            <span className="text-[10px] text-gray-400 px-1">+{fileTags.length - 4}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatSize(file.file_size)}</td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                        {file.created_at ? new Date(file.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {isPdf && (
                            <button onClick={() => handleView(file.id)}
                              className="p-1.5 text-gray-400 hover:text-[#0B3D91] hover:bg-blue-50 rounded-lg transition-all" title="Lihat">
                              👁
                            </button>
                          )}
                          <button onClick={() => handleDownload(file.id, file.filename)}
                            className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="Download">
                            ⬇
                          </button>
                          <button onClick={() => setDeleteTarget({ id: file.id, title: file.title })}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Hapus">
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-50">
            {filtered.map(file => {
              const tc = TYPE_CONFIG[file.document_type] || TYPE_CONFIG.other;
              const isPdf = file.filename?.toLowerCase().endsWith(".pdf");
              const fileTags = (file.tags || "").split(",").map(t => t.trim()).filter(Boolean);
              return (
                <div key={file.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className={`w-10 h-10 ${tc.bg} rounded-xl flex items-center justify-center text-xl flex-shrink-0`}>{tc.icon}</span>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 text-sm truncate">{file.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {file.brand}{file.model_series ? ` · ${file.model_series}` : ""}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tc.bg} ${tc.text}`}>{tc.label}</span>
                          {fileTags.slice(0, 3).map(tag => (
                            <button
                              key={tag}
                              onClick={() => setFilterTag(filterTag === tag ? "" : tag)}
                              className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border
                                ${filterTag === tag ? "bg-[#0B3D91] text-white border-[#0B3D91]" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                              {tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      {isPdf && (
                        <button onClick={() => handleView(file.id)} className="text-xs text-[#0B3D91] font-semibold hover:underline">Lihat</button>
                      )}
                      <button onClick={() => handleDownload(file.id, file.filename)} className="text-xs text-emerald-600 font-semibold hover:underline">Unduh</button>
                      <button onClick={() => setDeleteTarget({ id: file.id, title: file.title })} className="text-xs text-red-500 font-semibold hover:underline">Hapus</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── UPLOAD MODAL ───────────────────────────────────────── */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl">
              <h2 className="font-bold text-gray-800">📤 Upload Dokumen</h2>
              <button onClick={() => setShowUpload(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={e => { e.preventDefault(); setDragActive(false); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f); }}
                onClick={() => document.getElementById("file-input").click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
                  ${dragActive ? "border-[#0B3D91] bg-blue-50" : "border-gray-200 hover:border-[#0B3D91] hover:bg-blue-50/30"}`}>
                <input id="file-input" type="file" className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.png,.jpg,.jpeg"
                  onChange={e => { const f = e.target.files[0]; if (f) handleFileSelect(f); }} />
                {form.file ? (
                  <div>
                    <p className="text-2xl mb-1">✅</p>
                    <p className="text-sm font-semibold text-[#0B3D91]">{form.file.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatSize(form.file.size)}</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-3xl mb-2">📎</p>
                    <p className="text-sm text-gray-500">Drag & drop atau <span className="text-[#0B3D91] font-semibold">klik untuk pilih file</span></p>
                    <p className="text-xs text-gray-400 mt-1">PDF, DOC, XLS, ZIP, JPG, PNG</p>
                  </div>
                )}
              </div>

              <div>
                <label className={labelClass}>Judul Dokumen *</label>
                <input value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                  placeholder="Nama dokumen" className={inputClass} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Brand</label>
                  <input value={form.brand} onChange={e => setForm({...form, brand: e.target.value})}
                    placeholder="e.g. iSOLV, Yokogawa" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Model / Series</label>
                  <input value={form.model_series} onChange={e => setForm({...form, model_series: e.target.value})}
                    placeholder="e.g. MagFlux 3000" className={inputClass} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Tipe Dokumen</label>
                <select value={form.document_type} onChange={e => setForm({...form, document_type: e.target.value})} className={inputClass}>
                  {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.icon} {v.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Deskripsi</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  rows={2} placeholder="Deskripsi singkat isi dokumen" className={inputClass + " resize-none"} />
              </div>

              <div>
                <label className={labelClass}>Tags <span className="text-gray-400 font-normal normal-case">(pisahkan dengan koma)</span></label>
                <input value={form.tags} onChange={e => setForm({...form, tags: e.target.value})}
                  placeholder="flow, magnetic, wastewater, DN50, pressure" className={inputClass} />
                {/* Suggest existing tags */}
                {allTags.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-400 mb-1.5">Tag yang sudah ada (klik untuk menambah):</p>
                    <div className="flex flex-wrap gap-1">
                      {allTags.slice(0, 20).map(tag => {
                        const already = form.tags.split(",").map(t => t.trim()).includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              if (already) return;
                              const current = form.tags.split(",").map(t => t.trim()).filter(Boolean);
                              setForm(f => ({ ...f, tags: [...current, tag].join(", ") }));
                            }}
                            className={`text-[10px] px-2 py-0.5 rounded-md border transition-all
                              ${already ? "bg-[#0B3D91] text-white border-[#0B3D91]" : "bg-gray-50 text-gray-500 border-gray-200 hover:border-[#0B3D91]"}`}>
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 rounded-b-2xl flex gap-3 justify-end">
              <button onClick={() => setShowUpload(false)}
                className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                Batal
              </button>
              <button onClick={handleSubmit} disabled={uploading || !form.file}
                className="px-6 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-bold hover:bg-[#1E5CC6] disabled:opacity-60 flex items-center gap-2">
                {uploading
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Uploading...</>
                  : "⬆ Upload Dokumen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}