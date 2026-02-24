import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../services/api";
import toast from "react-hot-toast";

// ─── Constants ────────────────────────────────────────────────────────────────
const SURAT_TYPES = {
  rekomendasi: { label: "Surat Rekomendasi", icon: "📋", color: "bg-blue-100 text-blue-700", accent: "#0B3D91" },
  pernyataan:  { label: "Surat Pernyataan",  icon: "📝", color: "bg-purple-100 text-purple-700", accent: "#7C3AED" },
};

const STATUS_CFG = {
  draft:  { label: "Draft",  bg: "bg-gray-100",    text: "text-gray-600",   dot: "bg-gray-400" },
  final:  { label: "Final",  bg: "bg-blue-100",    text: "text-blue-700",   dot: "bg-blue-500" },
  signed: { label: "Signed", bg: "bg-green-100",   text: "text-green-700",  dot: "bg-green-500" },
};

const MONTHS_ID = ["Januari","Februari","Maret","April","Mei","Juni",
                   "Juli","Agustus","September","Oktober","November","Desember"];

function formatDateID(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── Rich Text Editor ─────────────────────────────────────────────────────────
function RichEditor({ value, onChange }) {
  const editorRef = useRef(null);
  const [activeFormats, setActiveFormats] = useState({});

  const exec = useCallback((cmd, val = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    editorRef.current?.dispatchEvent(new Event("input", { bubbles: true }));
  }, []);

  const updateActiveFormats = () => {
    setActiveFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      justifyLeft: document.queryCommandState("justifyLeft"),
      justifyCenter: document.queryCommandState("justifyCenter"),
      justifyRight: document.queryCommandState("justifyRight"),
      justifyFull: document.queryCommandState("justifyFull"),
      insertUnorderedList: document.queryCommandState("insertUnorderedList"),
      insertOrderedList: document.queryCommandState("insertOrderedList"),
    });
  };

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || "";
    }
  }, []);

  const handleInput = () => {
    onChange(editorRef.current?.innerHTML || "");
    updateActiveFormats();
  };

  const insertImage = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
    input.onchange = (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        exec("insertHTML", `<img src="${ev.target.result}" style="max-width:100%;height:auto;display:block;margin:8px 0;border-radius:4px;" />`);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const btn = (cmd, label, title, isActive) => (
    <button type="button" onMouseDown={(e) => { e.preventDefault(); exec(cmd); }}
      title={title}
      className={`px-2 py-1.5 rounded text-xs font-bold transition-all hover:bg-[#0B3D91] hover:text-white
        ${isActive ? "bg-[#0B3D91] text-white" : "text-gray-600 hover:bg-gray-100"}`}>
      {label}
    </button>
  );

  const fontSizes = [1,2,3,4,5,6,7];
  const fontSizeLabels = ["8","10","12","14","18","24","32"];

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-200 px-3 py-2 flex flex-wrap gap-1 items-center">
        {/* Text style */}
        <div className="flex items-center gap-0.5 border-r border-gray-200 pr-2 mr-1">
          {btn("bold",      "B", "Bold",      activeFormats.bold)}
          {btn("italic",    "I", "Italic",    activeFormats.italic)}
          {btn("underline", "U̲", "Underline", activeFormats.underline)}
        </div>

        {/* Font size */}
        <div className="flex items-center gap-1 border-r border-gray-200 pr-2 mr-1">
          <span className="text-xs text-gray-400">Size</span>
          <select onChange={(e) => exec("fontSize", e.target.value)}
            className="text-xs border border-gray-200 rounded px-1 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-[#0B3D91]">
            {fontSizes.map((s, i) => <option key={s} value={s}>{fontSizeLabels[i]}pt</option>)}
          </select>
        </div>

        {/* Font color */}
        <div className="flex items-center gap-1 border-r border-gray-200 pr-2 mr-1">
          <span className="text-xs text-gray-400">Color</span>
          <input type="color" defaultValue="#374151"
            onChange={(e) => exec("foreColor", e.target.value)}
            className="w-7 h-7 rounded cursor-pointer border border-gray-200 p-0.5" />
        </div>

        {/* Alignment */}
        <div className="flex items-center gap-0.5 border-r border-gray-200 pr-2 mr-1">
          {btn("justifyLeft",   "⬛︎", "Align Left",    activeFormats.justifyLeft)}
          {btn("justifyCenter", "☰", "Align Center",  activeFormats.justifyCenter)}
          {btn("justifyRight",  "⬛️", "Align Right",   activeFormats.justifyRight)}
          {btn("justifyFull",   "≡", "Justify",        activeFormats.justifyFull)}
        </div>

        {/* Lists */}
        <div className="flex items-center gap-0.5 border-r border-gray-200 pr-2 mr-1">
          {btn("insertUnorderedList", "• List", "Bullet List", activeFormats.insertUnorderedList)}
          {btn("insertOrderedList",   "1. List","Numbered List",activeFormats.insertOrderedList)}
        </div>

        {/* Indent */}
        <div className="flex items-center gap-0.5 border-r border-gray-200 pr-2 mr-1">
          {btn("indent",  "→ Indent",   "Indent",   false)}
          {btn("outdent", "← Outdent",  "Outdent",  false)}
        </div>

        {/* Headings */}
        <div className="flex items-center gap-0.5 border-r border-gray-200 pr-2 mr-1">
          <select onChange={(e) => {
            exec("formatBlock", e.target.value);
            e.target.value = "p";
          }} className="text-xs border border-gray-200 rounded px-1 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-[#0B3D91]">
            <option value="p">Paragraph</option>
            <option value="h2">Heading 1</option>
            <option value="h3">Heading 2</option>
            <option value="h4">Heading 3</option>
          </select>
        </div>

        {/* Extras */}
        <div className="flex items-center gap-0.5">
          <button type="button" onMouseDown={(e) => { e.preventDefault(); insertImage(); }}
            className="px-2 py-1.5 rounded text-xs font-bold text-gray-600 hover:bg-[#0B3D91] hover:text-white transition-all"
            title="Insert Image">
            🖼 Gambar
          </button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); exec("removeFormat"); }}
            className="px-2 py-1.5 rounded text-xs font-bold text-gray-600 hover:bg-red-500 hover:text-white transition-all"
            title="Clear Formatting">
            ✕ Clear
          </button>
        </div>
      </div>

      {/* Editor Area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyUp={updateActiveFormats}
        onMouseUp={updateActiveFormats}
        className="min-h-[320px] p-5 text-sm text-gray-800 focus:outline-none"
        style={{
          lineHeight: "1.8",
          fontFamily: "Georgia, serif",
        }}
        placeholder="Ketik isi surat di sini..."
      />
      <style>{`
        [contenteditable]:empty:before {
          content: attr(placeholder);
          color: #9CA3AF;
          pointer-events: none;
        }
        [contenteditable] h2 { font-size: 1.3em; font-weight: bold; margin: 0.5em 0; }
        [contenteditable] h3 { font-size: 1.1em; font-weight: bold; margin: 0.5em 0; }
        [contenteditable] h4 { font-size: 1em; font-weight: bold; margin: 0.5em 0; }
        [contenteditable] ul { list-style: disc; padding-left: 1.5em; margin: 0.5em 0; }
        [contenteditable] ol { list-style: decimal; padding-left: 1.5em; margin: 0.5em 0; }
        [contenteditable] li { margin: 0.25em 0; }
        [contenteditable] p  { margin: 0.4em 0; }
      `}</style>
    </div>
  );
}

// ─── Letter Preview ───────────────────────────────────────────────────────────
function LetterPreview({ data, engineer }) {
  const tgl = data.surat_date
    ? (() => { const d = new Date(data.surat_date); return `Jakarta, ${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`; })()
    : "Jakarta, ____________________";

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden"
         style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "13px", lineHeight: "1.7" }}>
      {/* Header */}
      <div className="px-10 pt-8 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[#0B3D91] font-bold text-base" style={{ fontFamily: "Arial, sans-serif" }}>
              PT FLOTECH CONTROLS INDONESIA
            </div>
            <div className="text-gray-500 text-xs mt-0.5" style={{ fontFamily: "Arial, sans-serif" }}>
              Rukan Artha Gading Niaga, Blok F/7<br/>
              Jl. Boulevard Artha Gading, Jakarta 14240<br/>
              Telp: +6221 45850778 / Fax: +6221 45850779<br/>
              <span className="text-[#1E5CC6]">e-Mail: salesjkt@flotech.co.id / Website: www.flotech.com.sg</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="w-28 h-10 bg-[#0B3D91] rounded flex items-center justify-center">
              <span className="text-white font-black text-sm tracking-wider">FLOTECH</span>
            </div>
            <div className="text-[8px] text-gray-400 text-right">PROCESS CONTROL & INSTRUMENTATION</div>
          </div>
        </div>
        <div className="mt-3 h-0.5 bg-[#0B3D91]" />
        <div className="h-px bg-[#1E5CC6] mt-0.5" />
      </div>

      {/* Meta info */}
      <div className="px-10 py-3">
        <table className="text-sm" style={{ fontFamily: "Arial, sans-serif" }}>
          <tbody>
            {data.nomor && <tr><td className="pr-4 pb-0.5 align-top">Nomor</td><td className="pr-2 pb-0.5">:</td><td className="pb-0.5 font-semibold">{data.nomor}</td></tr>}
            {data.perihal && <tr><td className="pr-4 pb-0.5 align-top">Perihal</td><td className="pr-2 pb-0.5">:</td><td className="pb-0.5">{data.perihal}</td></tr>}
            {data.lampiran && <tr><td className="pr-4 pb-0.5 align-top">Lampiran</td><td className="pr-2 pb-0.5">:</td><td className="pb-0.5">{data.lampiran}</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Kepada */}
      {(data.kepada_nama || data.kepada_perusahaan) && (
        <div className="px-10 py-2" style={{ fontFamily: "Arial, sans-serif", fontSize: "13px" }}>
          <div>Yth.</div>
          {data.kepada_nama && <div className="font-semibold">{data.kepada_nama}</div>}
          {data.kepada_jabatan && <div>{data.kepada_jabatan}</div>}
          {data.kepada_perusahaan && <div>{data.kepada_perusahaan}</div>}
          {data.kepada_alamat && <div className="whitespace-pre-line">{data.kepada_alamat}</div>}
          <div>Di Tempat</div>
        </div>
      )}

      {/* Salutation */}
      <div className="px-10 pt-3 pb-1" style={{ fontFamily: "Arial, sans-serif", fontSize: "13px" }}>
        Dengan hormat,
      </div>

      {/* Body */}
      <div className="px-10 py-2 prose prose-sm max-w-none"
           style={{ fontFamily: "Arial, sans-serif", fontSize: "13px" }}
           dangerouslySetInnerHTML={{ __html: data.content_html || '<p class="text-gray-400 italic">[Isi surat akan muncul di sini]</p>' }} />

      {/* Closing */}
      <div className="px-10 pt-3 pb-2" style={{ fontFamily: "Arial, sans-serif", fontSize: "13px" }}>
        <p>Demikian surat ini kami sampaikan. Atas perhatian dan kerja samanya, kami ucapkan terima kasih.</p>
      </div>

      {/* Signature */}
      <div className="px-10 pb-8 pt-2" style={{ fontFamily: "Arial, sans-serif", fontSize: "13px" }}>
        <div>{tgl}</div>
        <div className="font-bold text-[#0B3D91]">PT Flotech Controls Indonesia</div>
        <div className="mt-3 mb-1">
          {data.include_signature && engineer?.signature_data ? (
            <img src={engineer.signature_data} alt="TTD" className="h-14 object-contain" />
          ) : (
            <div className="h-12" />
          )}
        </div>
        {engineer && (
          <>
            <div className="font-semibold underline">{engineer.name}</div>
            <div className="text-gray-600">{engineer.position}</div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="border-t-2 border-[#0B3D91] bg-gray-50 px-10 py-3 text-center">
        <div className="font-bold text-[#0B3D91] text-xs">PT FLOTECH CONTROLS INDONESIA</div>
        <div className="text-gray-500 text-[10px]">
          Rukan Artha Gading Niaga, Blok F/7  |  Jl. Boulevard Artha Gading, Jakarta 14240<br/>
          Telp: +6221 45850778 / Fax: +6221 45850779  |  salesjkt@flotech.co.id  |  www.flotech.com.sg
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SuratResmi() {
  const navigate = useNavigate();
  const [view, setView] = useState("list"); // list | create | detail
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [engineers, setEngineers] = useState([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [selected, setSelected] = useState(null); // detail data
  const [saving, setSaving] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const EMPTY_FORM = {
    surat_type: "rekomendasi", nomor: "", perihal: "", lampiran: "",
    surat_date: new Date().toISOString().split("T")[0],
    kepada_nama: "", kepada_jabatan: "", kepada_perusahaan: "", kepada_alamat: "",
    content_html: "", engineer_id: "", include_signature: true, status: "draft",
  };
  const [form, setForm] = useState(EMPTY_FORM);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const fetchList = async () => {
    setLoading(true);
    try { const r = await API.get("/surat-resmi/list"); setItems(r.data); }
    catch { toast.error("Gagal memuat data"); }
    finally { setLoading(false); }
  };

  const fetchEngineers = async () => {
    try { const r = await API.get("/engineer/"); setEngineers(r.data); }
    catch {}
  };

  useEffect(() => { fetchList(); fetchEngineers(); }, []);

  const filtered = items.filter(s => {
    const q = search.toLowerCase();
    const m = !search || [s.nomor, s.perihal, s.kepada_nama, s.kepada_perusahaan, s.engineer_name]
      .some(v => v?.toLowerCase().includes(q));
    return m && (!filterType || s.surat_type === filterType)
              && (!filterStatus || s.status === filterStatus);
  });

  const selectedEngineer = engineers.find(e => e.id === Number(form.engineer_id || selected?.engineer_id)) || null;
  const engWithSig = selectedEngineer?.has_signature
    ? { ...selectedEngineer, signature_data: engineers.find(e => e.id === selectedEngineer.id)?.signature_data }
    : null;

  // Fetch engineer with signature for preview
  const [engDetail, setEngDetail] = useState(null);
  useEffect(() => {
    const eid = form.engineer_id || selected?.engineer_id;
    if (!eid) { setEngDetail(null); return; }
    API.get(`/engineer/${eid}`).then(r => setEngDetail(r.data)).catch(() => setEngDetail(null));
  }, [form.engineer_id, selected?.engineer_id]);

  const handleCreate = async () => {
    if (!form.perihal) { toast.error("Perihal wajib diisi"); return; }
    setSaving(true);
    try {
      const res = await API.post("/surat-resmi/create", form);
      toast.success("Surat berhasil dibuat! 📋");
      fetchList();
      const detail = await API.get(`/surat-resmi/detail/${res.data.id}`);
      setSelected(detail.data);
      setView("detail"); setEditMode(false);
    } catch (e) { toast.error(e.response?.data?.error || "Gagal membuat surat"); }
    finally { setSaving(false); }
  };

  const handleUpdate = async () => {
    if (!form.perihal) { toast.error("Perihal wajib diisi"); return; }
    setSaving(true);
    try {
      await API.put(`/surat-resmi/update/${selected.id}`, form);
      toast.success("Surat diperbarui! ✅");
      const detail = await API.get(`/surat-resmi/detail/${selected.id}`);
      setSelected(detail.data);
      setForm(detail.data);
      setEditMode(false); fetchList();
    } catch { toast.error("Gagal menyimpan"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await API.delete(`/surat-resmi/delete/${selected.id}`);
      toast.success("Surat dihapus");
      setView("list"); setSelected(null); setDeleteConfirm(false); fetchList();
    } catch { toast.error("Gagal menghapus"); }
    finally { setDeleting(false); }
  };

  const openDetail = async (id) => {
    try {
      const r = await API.get(`/surat-resmi/detail/${id}`);
      setSelected(r.data); setForm(r.data);
      setView("detail"); setEditMode(false);
    } catch { toast.error("Gagal memuat detail"); }
  };

  const handlePreview = async (id) => {
    setPreviewLoading(true);
    try {
      const r = await API.get(`/surat-resmi/pdf/preview/${id}`, { responseType: "blob" });
      setPreviewUrl(URL.createObjectURL(new Blob([r.data], { type: "application/pdf" })));
      setShowPreviewModal(true);
    } catch { toast.error("Gagal memuat preview"); }
    finally { setPreviewLoading(false); }
  };

  const handleDownload = async (id, nomor, type) => {
    setPdfLoading(true);
    try {
      const r = await API.get(`/surat-resmi/pdf/${id}`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([r.data], { type: "application/pdf" }));
      Object.assign(document.createElement("a"), {
        href: url, download: `Surat_${type}_${nomor || id}.pdf`
      }).click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast.success("PDF downloaded! 📥");
    } catch { toast.error("Gagal download PDF"); }
    finally { setPdfLoading(false); }
  };

  const inputCls = "w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white transition-all";
  const labelCls = "block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5";

  const stats = [
    { label: "Total", val: items.length, icon: "📄", color: "text-[#0B3D91]" },
    { label: "Rekomendasi", val: items.filter(i => i.surat_type === "rekomendasi").length, icon: "📋", color: "text-blue-600" },
    { label: "Pernyataan", val: items.filter(i => i.surat_type === "pernyataan").length, icon: "📝", color: "text-purple-600" },
    { label: "Signed", val: items.filter(i => i.status === "signed").length, icon: "✅", color: "text-green-600" },
  ];

  // ── LIST VIEW ────────────────────────────────────────────────────────────────
  if (view === "list") return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Surat Resmi</h1>
          <p className="text-sm text-gray-400 mt-0.5">Surat Rekomendasi & Surat Pernyataan PT Flotech Controls Indonesia</p>
        </div>
        <button onClick={() => { setForm(EMPTY_FORM); setView("create"); }}
          className="self-start sm:self-auto flex items-center gap-2 px-5 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-semibold hover:bg-[#1E5CC6] transition-colors shadow-md">
          + Buat Surat
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <span className="text-2xl">{s.icon}</span>
            <div>
              <div className={`text-2xl font-black ${s.color}`}>{s.val}</div>
              <div className="text-xs text-gray-400 font-medium">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Cari nomor, perihal, kepada..."
            className="flex-1 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91]" />
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white">
            <option value="">Semua Tipe</option>
            {Object.entries(SURAT_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white">
            <option value="">Semua Status</option>
            {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B3D91]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-5xl mb-3">📋</p>
          <p className="text-gray-500 font-medium mb-4">
            {search || filterType || filterStatus ? "Tidak ada surat yang cocok" : "Belum ada surat"}
          </p>
          {!search && !filterType && !filterStatus && (
            <button onClick={() => { setForm(EMPTY_FORM); setView("create"); }}
              className="px-5 py-2 bg-[#0B3D91] text-white rounded-xl text-sm font-semibold">
              Buat Surat Pertama
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
                  {["Nomor / Perihal","Tipe","Kepada","Engineer","Tanggal","Status","Aksi"].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(s => {
                  const tc = SURAT_TYPES[s.surat_type] || SURAT_TYPES.rekomendasi;
                  const sc = STATUS_CFG[s.status] || STATUS_CFG.draft;
                  return (
                    <tr key={s.id} className="hover:bg-blue-50/30 transition-colors cursor-pointer"
                        onClick={() => openDetail(s.id)}>
                      <td className="px-4 py-3 max-w-[240px]">
                        <div className="font-semibold text-gray-800 text-sm truncate">{s.nomor || "—"}</div>
                        <div className="text-xs text-gray-400 truncate">{s.perihal || "—"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${tc.color}`}>
                          {tc.icon} {tc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[160px]">
                        <div className="text-sm text-gray-700 truncate">{s.kepada_nama || "—"}</div>
                        <div className="text-xs text-gray-400 truncate">{s.kepada_perusahaan}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-700">{s.engineer_name || "—"}</div>
                        <div className="text-xs text-gray-400">{s.engineer_position}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {formatDateID(s.surat_date)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full w-fit ${sc.bg} ${sc.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />{sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1.5">
                          <button onClick={() => openDetail(s.id)}
                            className="px-3 py-1.5 bg-[#0B3D91] text-white rounded-lg text-xs font-semibold hover:bg-[#1E5CC6] transition-colors">
                            Buka
                          </button>
                          <button onClick={() => handleDownload(s.id, s.nomor, s.surat_type)}
                            className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-200 transition-colors">
                            ⬇ PDF
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
          <div className="md:hidden divide-y divide-gray-100">
            {filtered.map(s => {
              const tc = SURAT_TYPES[s.surat_type] || SURAT_TYPES.rekomendasi;
              const sc = STATUS_CFG[s.status] || STATUS_CFG.draft;
              return (
                <div key={s.id} className="p-4 hover:bg-blue-50/30 transition-colors" onClick={() => openDetail(s.id)}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-800 text-sm truncate">{s.nomor || "—"}</div>
                      <div className="text-xs text-gray-500 truncate">{s.perihal}</div>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full flex-shrink-0 ${tc.color}`}>{tc.icon}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />{sc.label}
                    </span>
                    <span className="text-xs text-gray-400">{formatDateID(s.surat_date)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  // ── CREATE VIEW ──────────────────────────────────────────────────────────────
  if (view === "create") {
    const previewEngineer = form.engineer_id ? engDetail : null;
    return (
      <div>
        <button onClick={() => setView("list")} className="flex items-center gap-2 text-sm text-gray-400 hover:text-[#0B3D91] mb-5 transition-colors">
          ← Kembali ke Daftar
        </button>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Buat Surat Resmi</h1>
          <p className="text-gray-400 text-sm mt-1">Surat Rekomendasi & Surat Pernyataan profesional</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Form Column */}
          <div className="space-y-4">
            {/* Tipe Surat */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-5 h-5 bg-[#0B3D91] text-white rounded-full flex items-center justify-center text-xs font-black">1</span>
                Tipe Surat
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(SURAT_TYPES).map(([k, v]) => (
                  <button key={k} type="button" onClick={() => set("surat_type", k)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${form.surat_type === k
                      ? "border-[#0B3D91] bg-[#EEF3FB]"
                      : "border-gray-200 hover:border-gray-300"}`}>
                    <div className="text-2xl mb-1">{v.icon}</div>
                    <div className="text-sm font-bold text-gray-800">{v.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Info Surat */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-5 h-5 bg-[#0B3D91] text-white rounded-full flex items-center justify-center text-xs font-black">2</span>
                Informasi Surat
              </h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Nomor Surat</label>
                    <input value={form.nomor} onChange={e => set("nomor", e.target.value)}
                      placeholder="BRR/04/F-JKT/18/02/2026" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Tanggal *</label>
                    <input type="date" value={form.surat_date} onChange={e => set("surat_date", e.target.value)} className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Perihal *</label>
                  <input value={form.perihal} onChange={e => set("perihal", e.target.value)}
                    placeholder="Rekomendasi Teknis Instalasi Flowmeter..." className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Lampiran</label>
                  <input value={form.lampiran} onChange={e => set("lampiran", e.target.value)}
                    placeholder="1 Berkas Dokumentasi Lapangan" className={inputCls} />
                </div>
              </div>
            </div>

            {/* Kepada */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-5 h-5 bg-[#0B3D91] text-white rounded-full flex items-center justify-center text-xs font-black">3</span>
                Ditujukan Kepada
              </h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Nama / Tim</label>
                    <input value={form.kepada_nama} onChange={e => set("kepada_nama", e.target.value)}
                      placeholder="Tim WTP R-04 ASG" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Jabatan</label>
                    <input value={form.kepada_jabatan} onChange={e => set("kepada_jabatan", e.target.value)}
                      placeholder="Project Manager" className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Perusahaan / Instansi</label>
                  <input value={form.kepada_perusahaan} onChange={e => set("kepada_perusahaan", e.target.value)}
                    placeholder="PT. Contoh Perusahaan" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Alamat</label>
                  <textarea value={form.kepada_alamat} onChange={e => set("kepada_alamat", e.target.value)}
                    rows={2} placeholder="Di Tempat" className={inputCls + " resize-none"} />
                </div>
              </div>
            </div>

            {/* Isi Surat */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-5 h-5 bg-[#0B3D91] text-white rounded-full flex items-center justify-center text-xs font-black">4</span>
                Isi Surat
              </h3>
              <RichEditor value={form.content_html} onChange={v => set("content_html", v)} />
            </div>

            {/* Signature */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-5 h-5 bg-[#0B3D91] text-white rounded-full flex items-center justify-center text-xs font-black">5</span>
                Penandatangan
              </h3>
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Pilih Engineer / Pembuat Surat</label>
                  <select value={form.engineer_id} onChange={e => set("engineer_id", e.target.value)} className={inputCls}>
                    <option value="">— Tidak ada —</option>
                    {engineers.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.name} {e.position ? `— ${e.position}` : ""} {e.has_signature ? "✍️" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                {form.engineer_id && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <div className={`relative w-10 h-5 rounded-full transition-colors ${form.include_signature ? "bg-[#0B3D91]" : "bg-gray-300"}`}
                           onClick={() => set("include_signature", !form.include_signature)}>
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.include_signature ? "translate-x-5" : "translate-x-0.5"}`} />
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {form.include_signature ? "Sertakan tanda tangan digital" : "Kosongkan tanda tangan"}
                      </span>
                    </label>
                  </div>
                )}
                {form.engineer_id && engDetail && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                    <div className="w-10 h-10 bg-[#0B3D91] rounded-xl flex items-center justify-center text-white font-bold">
                      {engDetail.name?.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800 text-sm">{engDetail.name}</div>
                      <div className="text-xs text-gray-500">{engDetail.position}</div>
                      {engDetail.signature_data
                        ? <span className="text-xs text-green-600 font-medium">✍️ Tanda tangan tersedia</span>
                        : <span className="text-xs text-orange-500 font-medium">⚠️ Belum ada tanda tangan</span>}
                    </div>
                    {engDetail.signature_data && form.include_signature && (
                      <img src={engDetail.signature_data} alt="TTD" className="h-10 ml-auto opacity-80" />
                    )}
                  </div>
                )}
                <div>
                  <label className={labelCls}>Status Surat</label>
                  <select value={form.status} onChange={e => set("status", e.target.value)} className={inputCls}>
                    {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={() => setView("list")}
                className="px-5 py-3 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:border-gray-300 transition-colors">
                Batal
              </button>
              <button onClick={handleCreate} disabled={saving}
                className="flex-1 py-3 bg-[#0B3D91] text-white rounded-xl text-sm font-bold hover:bg-[#1E5CC6] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-md">
                {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Menyimpan...</> : "💾 Simpan Surat"}
              </button>
            </div>
          </div>

          {/* Preview Column */}
          <div className="hidden xl:block">
            <div className="sticky top-20">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-bold text-gray-600">📄 Preview Surat</span>
                <span className="text-xs text-gray-400">(Update otomatis)</span>
              </div>
              <div className="overflow-y-auto max-h-[calc(100vh-8rem)]">
                <LetterPreview data={form} engineer={engDetail} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── DETAIL VIEW ──────────────────────────────────────────────────────────────
  if (view === "detail" && selected) {
    const tc = SURAT_TYPES[selected.surat_type] || SURAT_TYPES.rekomendasi;
    const sc = STATUS_CFG[selected.status] || STATUS_CFG.draft;
    const displayForm = editMode ? form : selected;
    const displayEngineer = editMode ? engDetail : engDetail;

    return (
      <div>
        {/* Delete Confirm Dialog */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <div className="text-2xl mb-3">🗑️</div>
              <h3 className="font-bold text-gray-800 mb-2">Hapus Surat?</h3>
              <p className="text-sm text-gray-500 mb-5">
                Surat <strong>{selected.nomor}</strong> akan dihapus permanen dan tidak bisa dikembalikan.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(false)}
                  className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:border-gray-300">
                  Batal
                </button>
                <button onClick={handleDelete} disabled={deleting}
                  className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2">
                  {deleting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Hapus"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PDF Preview Modal */}
        {showPreviewModal && previewUrl && (
          <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 bg-[#0B3D91]">
              <span className="text-white font-bold text-sm">📋 {selected.nomor} — Preview PDF</span>
              <div className="flex items-center gap-2">
                <a href={previewUrl} download={`Surat_${selected.surat_type}_${selected.nomor || selected.id}.pdf`}
                  className="px-4 py-1.5 bg-white text-[#0B3D91] rounded-lg text-xs font-bold hover:bg-blue-50 flex items-center gap-1.5">
                  ⬇ Download
                </a>
                <button onClick={() => { setShowPreviewModal(false); URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }}
                  className="text-white/70 hover:text-white text-xl px-2">✕</button>
              </div>
            </div>
            <iframe src={previewUrl} className="flex-1 w-full" title="PDF Preview" style={{ border: "none" }} />
          </div>
        )}

        {/* Nav */}
        <button onClick={() => { setView("list"); setSelected(null); setEditMode(false); }}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-[#0B3D91] mb-5 transition-colors">
          ← Kembali ke Daftar
        </button>

        {/* Top bar */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="text-3xl">{tc.icon}</span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${tc.color}`}>{tc.label}</span>
                  <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />{sc.label}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-gray-800 mt-1">{selected.nomor || "Tanpa Nomor"}</h2>
                <p className="text-sm text-gray-500">{selected.perihal}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatDateID(selected.surat_date)} • Dibuat {formatDateID(selected.created_at)}
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {!editMode ? (
                <>
                  <button onClick={() => { setEditMode(true); setForm(selected); }}
                    className="px-4 py-2 border-2 border-[#0B3D91] text-[#0B3D91] rounded-xl text-sm font-semibold hover:bg-[#EEF3FB] transition-colors">
                    ✏️ Edit
                  </button>
                  <button onClick={() => handlePreview(selected.id)} disabled={previewLoading}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center gap-1.5">
                    {previewLoading ? <div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-gray-700 rounded-full animate-spin" /> : "👁️"} Preview
                  </button>
                  <button onClick={() => handleDownload(selected.id, selected.nomor, selected.surat_type)} disabled={pdfLoading}
                    className="px-4 py-2 bg-[#0B3D91] text-white rounded-xl text-sm font-semibold hover:bg-[#1E5CC6] transition-colors disabled:opacity-50 flex items-center gap-1.5">
                    {pdfLoading ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "⬇️"} Download PDF
                  </button>
                  <button onClick={() => setDeleteConfirm(true)}
                    className="px-4 py-2 bg-red-50 text-red-500 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors">
                    🗑️
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => { setEditMode(false); setForm(selected); }}
                    className="px-4 py-2 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:border-gray-300">
                    Batal
                  </button>
                  <button onClick={handleUpdate} disabled={saving}
                    className="px-4 py-2 bg-[#0B3D91] text-white rounded-xl text-sm font-bold hover:bg-[#1E5CC6] disabled:opacity-50 flex items-center gap-2">
                    {saving ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                    Simpan Perubahan
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Form / Info */}
          <div className="space-y-4">
            {editMode ? (
              <>
                {/* Edit form (same as create) */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-4">Tipe Surat</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(SURAT_TYPES).map(([k, v]) => (
                      <button key={k} type="button" onClick={() => set("surat_type", k)}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${form.surat_type === k ? "border-[#0B3D91] bg-[#EEF3FB]" : "border-gray-200"}`}>
                        <div className="text-2xl mb-1">{v.icon}</div>
                        <div className="text-sm font-bold text-gray-800">{v.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-4">Informasi Surat</h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className={labelCls}>Nomor Surat</label>
                        <input value={form.nomor || ""} onChange={e => set("nomor", e.target.value)} className={inputCls} /></div>
                      <div><label className={labelCls}>Tanggal</label>
                        <input type="date" value={form.surat_date || ""} onChange={e => set("surat_date", e.target.value)} className={inputCls} /></div>
                    </div>
                    <div><label className={labelCls}>Perihal *</label>
                      <input value={form.perihal || ""} onChange={e => set("perihal", e.target.value)} className={inputCls} /></div>
                    <div><label className={labelCls}>Lampiran</label>
                      <input value={form.lampiran || ""} onChange={e => set("lampiran", e.target.value)} className={inputCls} /></div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-4">Ditujukan Kepada</h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className={labelCls}>Nama / Tim</label>
                        <input value={form.kepada_nama || ""} onChange={e => set("kepada_nama", e.target.value)} className={inputCls} /></div>
                      <div><label className={labelCls}>Jabatan</label>
                        <input value={form.kepada_jabatan || ""} onChange={e => set("kepada_jabatan", e.target.value)} className={inputCls} /></div>
                    </div>
                    <div><label className={labelCls}>Perusahaan</label>
                      <input value={form.kepada_perusahaan || ""} onChange={e => set("kepada_perusahaan", e.target.value)} className={inputCls} /></div>
                    <div><label className={labelCls}>Alamat</label>
                      <textarea value={form.kepada_alamat || ""} onChange={e => set("kepada_alamat", e.target.value)} rows={2} className={inputCls + " resize-none"} /></div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-4">Isi Surat</h3>
                  <RichEditor value={form.content_html || ""} onChange={v => set("content_html", v)} />
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-4">Penandatangan</h3>
                  <div className="space-y-3">
                    <div><label className={labelCls}>Engineer</label>
                      <select value={form.engineer_id || ""} onChange={e => set("engineer_id", e.target.value)} className={inputCls}>
                        <option value="">— Tidak ada —</option>
                        {engineers.map(e => <option key={e.id} value={e.id}>{e.name}{e.position ? ` — ${e.position}` : ""} {e.has_signature ? "✍️" : ""}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${form.include_signature ? "bg-[#0B3D91]" : "bg-gray-300"}`}
                           onClick={() => set("include_signature", !form.include_signature)}>
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.include_signature ? "translate-x-5" : "translate-x-0.5"}`} />
                      </div>
                      <span className="text-sm text-gray-700">{form.include_signature ? "Sertakan tanda tangan digital" : "Kosongkan tanda tangan"}</span>
                    </div>
                    <div><label className={labelCls}>Status</label>
                      <select value={form.status || "draft"} onChange={e => set("status", e.target.value)} className={inputCls}>
                        {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* Read-only detail view */
              <>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-[#0B3D91] rounded-full" /> Informasi Surat
                  </h3>
                  <div className="space-y-2 text-sm">
                    {[
                      ["Nomor", selected.nomor],
                      ["Tanggal", formatDateID(selected.surat_date)],
                      ["Perihal", selected.perihal],
                      ["Lampiran", selected.lampiran],
                    ].filter(([, v]) => v).map(([l, v]) => (
                      <div key={l} className="flex gap-3">
                        <span className="text-gray-400 w-20 flex-shrink-0">{l}</span>
                        <span className="text-gray-800 font-medium">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-[#0B3D91] rounded-full" /> Ditujukan Kepada
                  </h3>
                  <div className="space-y-2 text-sm">
                    {[
                      ["Nama", selected.kepada_nama],
                      ["Jabatan", selected.kepada_jabatan],
                      ["Perusahaan", selected.kepada_perusahaan],
                      ["Alamat", selected.kepada_alamat],
                    ].filter(([, v]) => v).map(([l, v]) => (
                      <div key={l} className="flex gap-3">
                        <span className="text-gray-400 w-20 flex-shrink-0">{l}</span>
                        <span className="text-gray-800 font-medium whitespace-pre-line">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {selected.engineer_name && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-4 flex items-center gap-2">
                      <span className="w-1.5 h-4 bg-[#0B3D91] rounded-full" /> Penandatangan
                    </h3>
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                      <div className="w-10 h-10 bg-[#0B3D91] rounded-xl flex items-center justify-center text-white font-bold">
                        {selected.engineer_name?.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800 text-sm">{selected.engineer_name}</div>
                        <div className="text-xs text-gray-500">{selected.engineer_position}</div>
                        <span className="text-xs text-blue-600 font-medium">
                          {selected.include_signature ? "✍️ Tanda tangan disertakan" : "⬜ Tanda tangan dikosongkan"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Preview Column */}
          <div className="hidden xl:block">
            <div className="sticky top-20">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-bold text-gray-600">📄 Preview Surat</span>
              </div>
              <div className="overflow-y-auto max-h-[calc(100vh-8rem)]">
                <LetterPreview data={editMode ? form : selected} engineer={engDetail} />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile preview toggle */}
        <div className="xl:hidden mt-6">
          <details className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <summary className="px-5 py-4 font-bold text-gray-700 cursor-pointer text-sm flex items-center gap-2">
              📄 Lihat Preview Surat
            </summary>
            <div className="px-4 pb-4">
              <LetterPreview data={editMode ? form : selected} engineer={engDetail} />
            </div>
          </details>
        </div>
      </div>
    );
  }

  return null;
}
