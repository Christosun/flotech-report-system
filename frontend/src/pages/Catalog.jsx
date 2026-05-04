import { useState, useEffect, useRef } from "react";
import API from "../services/api";
import toast from "react-hot-toast";

// ─── Lucide SVG Icons ──────────────────────────────────────────────────────────
const Icon = ({ d, size = 16, className = "", strokeWidth = 1.75, viewBox = "0 0 24 24", ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox={viewBox}
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {Array.isArray(d) ? d.map((path, i) => <path key={i} d={path} />) : <path d={d} />}
  </svg>
);

// Individual icon components
const BookOpen       = (p) => <Icon {...p} d={["M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z","M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"]} />;
const BookMarked     = (p) => <Icon {...p} d={["M4 19.5A2.5 2.5 0 0 1 6.5 17H20","M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z","M12 2v6l2-1.5L16 8V2"]} />;
const BarChart2      = (p) => <Icon {...p} d={["M18 20V10","M12 20V4","M6 20v-6"]} />;
const Award          = (p) => <Icon {...p} d={["M12 15l-2 5 2-1 2 1-2-5","M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14"]} />;
const Newspaper      = (p) => <Icon {...p} d={["M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z","M8 7h8","M8 11h8","M8 15h5"]} />;
const FileText       = (p) => <Icon {...p} d={["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z","M14 2v6h6","M16 13H8","M16 17H8","M10 9H8"]} />;
const FilePdf        = (p) => <Icon {...p} d={["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z","M14 2v6h6"]} />;
const FileSpreadsheet= (p) => <Icon {...p} d={["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z","M14 2v6h6","M8 13h2","M8 17h2","M14 13h2","M14 17h2"]} />;
const Archive        = (p) => <Icon {...p} d={["M21 8v13H3V8","M1 3h22v5H1z","M10 12h4"]} />;
const Image          = (p) => <Icon {...p} d={["M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"]} />;
const Trash2         = (p) => <Icon {...p} d={["M3 6h18","M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2","M10 11v6","M14 11v6"]} />;
const Download       = (p) => <Icon {...p} d={["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4","M7 10l5 5 5-5","M12 15V3"]} />;
const Eye            = (p) => <Icon {...p} d={["M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z","M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6"]} />;
const Upload         = (p) => <Icon {...p} d={["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4","M17 8l-5-5-5 5","M12 3v12"]} />;
const Package        = (p) => <Icon {...p} d={["M16.5 9.4l-9-5.19","M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z","M3.27 6.96L12 12.01l8.73-5.05","M12 22.08V12"]} />;
const Search         = (p) => <Icon {...p} d={["M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0"]} />;
const X              = (p) => <Icon {...p} d={["M18 6L6 18","M6 6l12 12"]} />;
const CheckSquare    = (p) => <Icon {...p} d={["M9 11l3 3L22 4","M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"]} />;
const Square         = (p) => <Icon {...p} d="M3 3h18v18H3z" />;
const ChevronUp      = (p) => <Icon {...p} d="M18 15l-6-6-6 6" />;
const ChevronDown    = (p) => <Icon {...p} d="M6 9l6 6 6-6" />;
const Plus           = (p) => <Icon {...p} d={["M12 5v14","M5 12h14"]} />;
const Tag            = (p) => <Icon {...p} d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z M7 7h.01" />;
const Pencil         = (p) => <Icon {...p} d={["M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7","M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"]} />;
const AlertTriangle  = (p) => <Icon {...p} d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01" />;
const Loader2        = (p) => <Icon {...p} className={`animate-spin ${p.className || ""}`} d="M21 12a9 9 0 1 1-6.219-8.56" />;
const Books          = (p) => <Icon {...p} d={["M4 19.5A2.5 2.5 0 0 1 6.5 17H20","M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"]} />;
const FolderOpen     = (p) => <Icon {...p} d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />;
const Paperclip      = (p) => <Icon {...p} d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />;
const ZipFile        = (p) => <Icon {...p} d={["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z","M14 2v6h6","M12 18v-6","M9.5 15h5"]} />;
const FileImage      = (p) => <Icon {...p} d={["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z","M14 2v6h6","M10.5 15.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5","M20 21l-5-5"]} />;
const Zap            = (p) => <Icon {...p} d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />;
const CheckCircle    = (p) => <Icon {...p} d={["M22 11.08V12a10 10 0 1 1-5.93-9.14","M22 4L12 14.01l-3-3"]} />;
const XCircle        = (p) => <Icon {...p} d={["M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z","M15 9l-6 6","M9 9l6 6"]} />;
const Grid           = (p) => <Icon {...p} d={["M3 3h7v7H3z","M14 3h7v7h-7z","M14 14h7v7h-7z","M3 14h7v7H3z"]} />;

// ─── Type Config (icons replaced) ────────────────────────────────────────────
const TYPE_CONFIG = {
  catalog:     { label: "Catalog",     IconComp: BookOpen,    bg: "bg-blue-50",    text: "text-blue-700",   border: "border-blue-200",   accent: "#1d4ed8" },
  manual:      { label: "Manual Book", IconComp: BookMarked,  bg: "bg-emerald-50", text: "text-emerald-700",border: "border-emerald-200", accent: "#047857" },
  datasheet:   { label: "Datasheet",   IconComp: BarChart2,   bg: "bg-violet-50",  text: "text-violet-700", border: "border-violet-200",  accent: "#6d28d9" },
  certificate: { label: "Certificate", IconComp: Award,       bg: "bg-amber-50",   text: "text-amber-700",  border: "border-amber-200",   accent: "#b45309" },
  brochure:    { label: "Brochure",    IconComp: Newspaper,   bg: "bg-orange-50",  text: "text-orange-700", border: "border-orange-200",  accent: "#c2410c" },
  other:       { label: "Other",       IconComp: FileText,    bg: "bg-gray-50",    text: "text-gray-600",   border: "border-gray-200",    accent: "#4b5563" },
};

// Extension → icon component
function getExtIconComp(filename) {
  const ext = filename?.split(".").pop()?.toLowerCase();
  const map = {
    pdf: FilePdf, doc: FileText, docx: FileText,
    xls: FileSpreadsheet, xlsx: FileSpreadsheet,
    zip: ZipFile, rar: Archive,
    png: FileImage, jpg: FileImage, jpeg: FileImage,
  };
  return map[ext] || FileText;
}

function formatSize(bytes) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/* ─── Delete Dialog ──────────────────────────────────────────────────────────── */
function DeleteDialog({ title, count, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-gradient-to-br from-red-50 to-rose-100 px-6 pt-6 pb-4 text-center">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Trash2 size={24} className="text-red-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-800">
            {count > 1 ? `Delete ${count} Documents?` : "Delete Document?"}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {count > 1
              ? <><span className="font-semibold text-gray-700">{count} documents</span> will be permanently deleted and cannot be restored.</>
              : <><span className="font-semibold text-gray-700">"{title}"</span> will be permanently deleted and cannot be restored.</>
            }
          </p>
        </div>
        <div className="px-6 py-4 flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? <Loader2 size={14} className="text-white" /> : null}
            {count > 1 ? `Delete ${count} Files` : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Bulk Action Toolbar ────────────────────────────────────────────────────── */
function BulkToolbar({ selectedCount, totalVisible, onSelectAll, onClearSelect, onBulkDownload, onBulkDelete, downloading, deleting }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-4 w-full max-w-2xl pointer-events-none">
      <div className="pointer-events-auto bg-gray-900 text-white rounded-2xl shadow-2xl px-5 py-3.5 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-6 h-6 bg-[#0B3D91] rounded-lg flex items-center justify-center text-xs font-bold">
            {selectedCount}
          </div>
          <span className="text-sm font-semibold">{selectedCount === 1 ? "document" : "documents"} selected</span>
        </div>
        <div className="h-4 w-px bg-gray-600 flex-shrink-0" />
        <button
          onClick={selectedCount === totalVisible ? onClearSelect : onSelectAll}
          className="text-xs text-gray-300 hover:text-white transition-colors font-medium whitespace-nowrap">
          {selectedCount === totalVisible ? "Deselect all" : `Select all ${totalVisible}`}
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <button onClick={onBulkDownload} disabled={downloading}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-60">
            {downloading
              ? <><Loader2 size={12} /> Zipping...</>
              : <><Download size={12} /> Download ZIP</>}
          </button>
          <button onClick={onBulkDelete} disabled={deleting}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-60">
            <Trash2 size={12} /> Delete
          </button>
          <button onClick={onClearSelect}
            className="p-2 text-gray-400 hover:text-white rounded-xl transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Checkbox ───────────────────────────────────────────────────────────────── */
function Checkbox({ checked, indeterminate, onChange, className = "" }) {
  const ref = useRef();
  useEffect(() => { if (ref.current) ref.current.indeterminate = !!indeterminate; }, [indeterminate]);
  return (
    <input ref={ref} type="checkbox" checked={checked} onChange={onChange}
      onClick={e => e.stopPropagation()}
      className={`w-4 h-4 rounded border-gray-300 accent-[#0B3D91] cursor-pointer flex-shrink-0 ${className}`} />
  );
}

/* ─── Single Upload Modal ────────────────────────────────────────────────────── */
function SingleUploadModal({ onClose, onSuccess, allTags }) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [form, setForm] = useState({
    title: "", brand: "", model_series: "", document_type: "catalog",
    description: "", tags: "", file: null,
  });
  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white";
  const labelClass = "block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5";
  const handleFileSelect = file => setForm(f => ({ ...f, file, title: f.title || file.name.replace(/\.[^.]+$/, "") }));
  const handleSubmit = async () => {
    if (!form.title || !form.file) { toast.error("Title and file must be selected"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      ["file","title","brand","model_series","document_type","description","tags"].forEach(k => fd.append(k, form[k] || ""));
      await API.post("/catalog/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Document uploaded successfully!");
      onSuccess();
    } catch (err) { toast.error(err.response?.data?.error || "Upload failed"); }
    finally { setUploading(false); }
  };
  const ExtIconComp = form.file ? getExtIconComp(form.file.name) : Paperclip;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <Upload size={16} className="text-[#0B3D91]" />
            </div>
            <h2 className="font-bold text-gray-800">Upload Document</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div
            onDragOver={e=>{e.preventDefault();setDragActive(true);}}
            onDragLeave={()=>setDragActive(false)}
            onDrop={e=>{e.preventDefault();setDragActive(false);const f=e.dataTransfer.files[0];if(f)handleFileSelect(f);}}
            onClick={()=>document.getElementById("file-input-single").click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${dragActive?"border-[#0B3D91] bg-blue-50":"border-gray-200 hover:border-[#0B3D91] hover:bg-blue-50/30"}`}>
            <input id="file-input-single" type="file" className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.png,.jpg,.jpeg"
              onChange={e=>{const f=e.target.files[0];if(f)handleFileSelect(f);}} />
            {form.file ? (
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mb-2">
                  <ExtIconComp size={20} className="text-green-600" />
                </div>
                <p className="text-sm font-semibold text-[#0B3D91]">{form.file.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{formatSize(form.file.size)}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mb-2">
                  <Paperclip size={20} className="text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">Drag & drop or <span className="text-[#0B3D91] font-semibold">click to select file</span></p>
                <p className="text-xs text-gray-400 mt-1">PDF, DOC, XLS, ZIP, JPG, PNG</p>
              </div>
            )}
          </div>
          <div><label className={labelClass}>Document Title *</label><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Document name" className={inputClass}/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelClass}>Brand</label><input value={form.brand} onChange={e=>setForm({...form,brand:e.target.value})} placeholder="e.g. iSOLV" className={inputClass}/></div>
            <div><label className={labelClass}>Model/Series</label><input value={form.model_series} onChange={e=>setForm({...form,model_series:e.target.value})} placeholder="e.g. EFS803" className={inputClass}/></div>
          </div>
          <div>
            <label className={labelClass}>Document Type</label>
            <select value={form.document_type} onChange={e=>setForm({...form,document_type:e.target.value})} className={inputClass}>
              {Object.entries(TYPE_CONFIG).map(([k,v])=>(
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div><label className={labelClass}>Description</label><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} rows={2} placeholder="Brief description" className={inputClass+" resize-none"}/></div>
          <div>
            <label className={labelClass}>Tags <span className="text-gray-400 font-normal normal-case">(comma separated)</span></label>
            <input value={form.tags} onChange={e=>setForm({...form,tags:e.target.value})} placeholder="flow, magnetic, wastewater" className={inputClass}/>
            {allTags.length>0&&(
              <div className="mt-2">
                <p className="text-xs text-gray-400 mb-1.5">Existing tags:</p>
                <div className="flex flex-wrap gap-1">
                  {allTags.slice(0,20).map(tag=>{
                    const already=form.tags.split(",").map(t=>t.trim()).includes(tag);
                    return(
                      <button key={tag} type="button"
                        onClick={()=>{if(already)return;const current=form.tags.split(",").map(t=>t.trim()).filter(Boolean);setForm(f=>({...f,tags:[...current,tag].join(", ")}));}}
                        className={`text-[10px] px-2 py-0.5 rounded-md border transition-all ${already?"bg-[#0B3D91] text-white border-[#0B3D91]":"bg-gray-50 text-gray-500 border-gray-200 hover:border-[#0B3D91]"}`}>
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
          <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={uploading||!form.file}
            className="px-6 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-bold hover:bg-[#1E5CC6] disabled:opacity-60 flex items-center gap-2">
            {uploading
              ? <><Loader2 size={14} /> Uploading...</>
              : <><Upload size={14} /> Upload Document</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Bulk Upload Modal ──────────────────────────────────────────────────────── */
function BulkUploadModal({ onClose, onSuccess, allTags }) {
  const [queue, setQueue] = useState([]);
  const [globalBrand, setGlobalBrand] = useState("");
  const [globalType, setGlobalType] = useState("catalog");
  const [globalTags, setGlobalTags] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeEdit, setActiveEdit] = useState(null);
  const [expandedGlobal, setExpandedGlobal] = useState(true);
  const fileInputRef = useRef();
  const ALLOWED = new Set([".pdf",".doc",".docx",".xls",".xlsx",".zip",".rar",".png",".jpg",".jpeg"]);
  const addFiles = (fileList) => {
    const newItems = Array.from(fileList)
      .filter(f=>ALLOWED.has("."+f.name.split(".").pop().toLowerCase()))
      .filter(f=>!queue.find(q=>q.file.name===f.name&&q.file.size===f.size))
      .map(f=>({
        file:f, id:`${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
        title:f.name.replace(/\.[^.]+$/,""), brand:"", model_series:"",
        document_type:"catalog", description:"", tags:"",
        status:"idle", progress:0, error:null
      }));
    if(newItems.length<Array.from(fileList).length) toast.error("Some files skipped — unsupported format");
    setQueue(prev=>[...prev,...newItems]);
  };
  const removeItem = id=>{setQueue(prev=>prev.filter(q=>q.id!==id));if(activeEdit===id)setActiveEdit(null);};
  const updateItem = (id,patch)=>setQueue(prev=>prev.map(q=>q.id===id?{...q,...patch}:q));
  const applyGlobalSettings = ()=>{
    setQueue(prev=>prev.map(q=>({...q,brand:globalBrand||q.brand,document_type:globalType,tags:globalTags?[...new Set([...q.tags.split(","),...globalTags.split(",")].map(t=>t.trim()).filter(Boolean))].join(", "):q.tags})));
    toast.success("Global settings applied to all files");setExpandedGlobal(false);
  };
  const handleUpload = async()=>{
    const pending=queue.filter(q=>q.status==="idle"||q.status==="error");
    if(pending.length===0){toast("No files to upload");return;}
    setIsUploading(true);
    for(const item of pending){
      updateItem(item.id,{status:"uploading",progress:0,error:null});
      try{
        const fd=new FormData();
        fd.append("file",item.file);fd.append("title",item.title||item.file.name);
        fd.append("brand",item.brand);fd.append("model_series",item.model_series);
        fd.append("document_type",item.document_type);fd.append("description",item.description);fd.append("tags",item.tags);
        await API.post("/catalog/upload",fd,{headers:{"Content-Type":"multipart/form-data"},onUploadProgress:(e)=>{const pct=e.total?Math.round((e.loaded/e.total)*100):0;updateItem(item.id,{progress:pct});}});
        updateItem(item.id,{status:"done",progress:100});
      }catch(err){updateItem(item.id,{status:"error",error:err.response?.data?.error||"Upload failed"});}
    }
    setIsUploading(false);onSuccess();toast.success(`${pending.length} file(s) processed`);
  };
  const doneCount=queue.filter(q=>q.status==="done").length;
  const errorCount=queue.filter(q=>q.status==="error").length;
  const idleCount=queue.filter(q=>q.status==="idle").length;
  const uploadingCount=queue.filter(q=>q.status==="uploading").length;
  const inputClass="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white";
  const pendingCount = queue.filter(q=>q.status==="idle"||q.status==="error").length;
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
              <Package size={18} className="text-[#0B3D91]" />
            </div>
            <div>
              <h2 className="font-bold text-gray-800 text-base">Bulk Upload Documents</h2>
              <p className="text-xs text-gray-400">Upload multiple files at once with individual metadata</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 pt-5">
            <div
              onDragOver={e=>{e.preventDefault();setDragActive(true);}}
              onDragLeave={()=>setDragActive(false)}
              onDrop={e=>{e.preventDefault();setDragActive(false);addFiles(e.dataTransfer.files);}}
              onClick={()=>fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all select-none ${dragActive?"border-[#0B3D91] bg-blue-50":"border-gray-200 hover:border-[#0B3D91] hover:bg-blue-50/30"}`}>
              <input ref={fileInputRef} type="file" multiple className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.png,.jpg,.jpeg"
                onChange={e=>addFiles(e.target.files)}/>
              <div className="flex flex-col items-center gap-2">
                <div className="flex gap-2 mb-1">
                  <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center"><FilePdf size={16} className="text-red-500" /></div>
                  <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center"><FileSpreadsheet size={16} className="text-green-600" /></div>
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center"><BookOpen size={16} className="text-blue-600" /></div>
                </div>
                <p className="text-sm font-semibold text-gray-700">{dragActive?"Release to add files":"Drag & drop multiple files here"}</p>
                <p className="text-xs text-gray-400">or <span className="text-[#0B3D91] font-semibold">click to browse</span> — PDF, DOC, XLS, ZIP, JPG, PNG</p>
              </div>
            </div>
          </div>

          {queue.length>0&&(<>
            <div className="px-6 pt-4">
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <button onClick={()=>setExpandedGlobal(v=>!v)}
                  className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-2">
                    <Zap size={14} className="text-amber-500" />
                    <span className="text-sm font-semibold text-gray-700">Apply Global Settings to All Files</span>
                  </div>
                  {expandedGlobal ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                </button>
                {expandedGlobal&&(
                  <div className="p-4 space-y-3 bg-white">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Brand</label><input value={globalBrand} onChange={e=>setGlobalBrand(e.target.value)} placeholder="e.g. iSOLV" className={inputClass}/></div>
                      <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Document Type</label>
                        <select value={globalType} onChange={e=>setGlobalType(e.target.value)} className={inputClass}>
                          {Object.entries(TYPE_CONFIG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </div>
                      <div className="col-span-2 sm:col-span-1"><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Tags (append)</label><input value={globalTags} onChange={e=>setGlobalTags(e.target.value)} placeholder="flow, pressure" className={inputClass}/></div>
                    </div>
                    {allTags.length>0&&(
                      <div className="flex flex-wrap gap-1">
                        {allTags.slice(0,15).map(tag=>{
                          const already=globalTags.split(",").map(t=>t.trim()).includes(tag);
                          return(
                            <button key={tag} type="button"
                              onClick={()=>{if(already)return;const cur=globalTags.split(",").map(t=>t.trim()).filter(Boolean);setGlobalTags([...cur,tag].join(", "));}}
                              className={`text-[10px] px-2 py-0.5 rounded-md border transition-all ${already?"bg-[#0B3D91] text-white border-[#0B3D91]":"bg-gray-50 text-gray-500 border-gray-200 hover:border-[#0B3D91]"}`}>
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <div className="flex justify-end">
                      <button onClick={applyGlobalSettings}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#0B3D91] text-white rounded-lg text-xs font-bold hover:bg-[#1E5CC6] transition-colors">
                        <Zap size={12} /> Apply to All {queue.length} Files
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 pt-3 pb-2 flex items-center gap-3 flex-wrap">
              <span className="text-xs font-bold text-gray-500">{queue.length} files queued</span>
              <div className="flex gap-2 flex-wrap">
                {doneCount>0&&<span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold"><CheckCircle size={10}/> {doneCount} done</span>}
                {errorCount>0&&<span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold"><XCircle size={10}/> {errorCount} failed</span>}
                {uploadingCount>0&&<span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold"><Loader2 size={10}/> {uploadingCount} uploading</span>}
                {idleCount>0&&<span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-bold">{idleCount} pending</span>}
              </div>
              <button onClick={()=>setQueue(prev=>prev.filter(q=>q.status!=="done"))} className="ml-auto text-xs text-gray-400 hover:text-red-500 transition-colors">Clear done</button>
            </div>

            <div className="px-6 pb-4 space-y-2">
              {queue.map(item=>{
                const tc=TYPE_CONFIG[item.document_type]||TYPE_CONFIG.other;
                const TypeIcon = tc.IconComp;
                const ExtIcon = getExtIconComp(item.file.name);
                const isEditing=activeEdit===item.id;
                const statusColors={idle:"border-gray-200",uploading:"border-blue-400 bg-blue-50/30",done:"border-green-400 bg-green-50/30",error:"border-red-400 bg-red-50/30"};
                return(
                  <div key={item.id} className={`border rounded-xl overflow-hidden transition-all ${statusColors[item.status]}`}>
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="relative flex-shrink-0">
                        <div className={`w-8 h-8 ${tc.bg} rounded-lg flex items-center justify-center`}>
                          <ExtIcon size={16} className={tc.text} />
                        </div>
                        {item.status==="done"&&<span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center"><CheckCircle size={10} className="text-white" strokeWidth={3}/></span>}
                        {item.status==="error"&&<span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center"><X size={8} className="text-white" strokeWidth={3}/></span>}
                        {item.status==="uploading"&&<span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center"><Loader2 size={8} className="text-white"/></span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{item.title||item.file.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tc.bg} ${tc.text} flex items-center gap-0.5`}>
                            <TypeIcon size={9}/> {tc.label}
                          </span>
                          {item.brand&&<span className="text-[10px] text-gray-500">{item.brand}</span>}
                          <span className="text-[10px] text-gray-400">{formatSize(item.file.size)}</span>
                        </div>
                        {item.error&&<p className="text-[10px] text-red-500 mt-0.5">{item.error}</p>}
                        {item.status==="uploading"&&(
                          <div className="mt-1.5 h-1 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-[#0B3D91] rounded-full transition-all duration-300" style={{width:`${item.progress}%`}}/>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {item.status!=="uploading"&&item.status!=="done"&&(
                          <button onClick={()=>setActiveEdit(isEditing?null:item.id)}
                            className={`p-1.5 rounded-lg transition-colors ${isEditing?"bg-[#0B3D91] text-white":"text-gray-400 hover:text-[#0B3D91] hover:bg-blue-50"}`}>
                            <Pencil size={13} />
                          </button>
                        )}
                        {item.status!=="uploading"&&(
                          <button onClick={()=>removeItem(item.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 size={13} />
                          </button>
                        )}
                        {item.status==="done"&&<span className="text-xs text-green-600 font-semibold">Uploaded!</span>}
                      </div>
                    </div>
                    {isEditing&&item.status!=="uploading"&&item.status!=="done"&&(
                      <div className="border-t border-gray-100 bg-gray-50/70 px-4 py-4 space-y-3">
                        <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Document Title *</label><input value={item.title} onChange={e=>updateItem(item.id,{title:e.target.value})} className={inputClass}/></div>
                        <div className="grid grid-cols-2 gap-3">
                          <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Brand</label><input value={item.brand} onChange={e=>updateItem(item.id,{brand:e.target.value})} placeholder="e.g. iSOLV" className={inputClass}/></div>
                          <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Model/Series</label><input value={item.model_series} onChange={e=>updateItem(item.id,{model_series:e.target.value})} placeholder="e.g. EFS803" className={inputClass}/></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Document Type</label>
                            <select value={item.document_type} onChange={e=>updateItem(item.id,{document_type:e.target.value})} className={inputClass}>
                              {Object.entries(TYPE_CONFIG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                            </select>
                          </div>
                          <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Tags</label><input value={item.tags} onChange={e=>updateItem(item.id,{tags:e.target.value})} placeholder="flow, pressure" className={inputClass}/></div>
                        </div>
                        <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Description</label><textarea value={item.description} onChange={e=>updateItem(item.id,{description:e.target.value})} rows={2} className={inputClass+" resize-none"}/></div>
                        <div className="flex justify-end">
                          <button onClick={()=>setActiveEdit(null)} className="flex items-center gap-1 text-xs text-[#0B3D91] font-semibold hover:underline">
                            <CheckCircle size={12}/> Done editing
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <button onClick={()=>fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 flex items-center justify-center gap-2 text-sm text-gray-400 hover:border-[#0B3D91] hover:text-[#0B3D91] transition-colors font-medium">
                <Plus size={14} /> Add More Files
              </button>
            </div>
          </>)}

          {queue.length===0&&(
            <div className="px-6 pb-6 pt-4 text-center text-gray-400">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <FolderOpen size={24} className="text-gray-400" />
              </div>
              <p className="text-sm">Drop files above to start building your upload queue</p>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between flex-shrink-0 bg-white rounded-b-2xl">
          <div className="text-xs text-gray-400">
            {queue.length>0 ? `${pendingCount} file(s) ready to upload` : "No files selected"}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
              {doneCount>0?"Close":"Cancel"}
            </button>
            <button onClick={handleUpload} disabled={isUploading||pendingCount===0}
              className="px-6 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-bold hover:bg-[#1E5CC6] disabled:opacity-60 flex items-center gap-2 transition-colors">
              {isUploading
                ? <><Loader2 size={14}/> Uploading...</>
                : <><Upload size={14}/> Upload {pendingCount>0?`${pendingCount} File(s)`:"All"}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Catalog Page ──────────────────────────────────────────────────────── */
export default function Catalog() {
  const [files, setFiles]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showUpload, setShowUpload]   = useState(false);
  const [showBulk, setShowBulk]       = useState(false);
  const [search, setSearch]           = useState("");
  const [filterType, setFilterType]   = useState("");
  const [filterBrand, setFilterBrand] = useState("");
  const [filterTag, setFilterTag]     = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]       = useState(false);
  const [selectMode, setSelectMode]   = useState(false);
  const [selected, setSelected]       = useState(new Set());
  const [bulkDownloading, setBulkDownloading] = useState(false);

  const fetchFiles = async () => {
    setLoading(true);
    try { const res = await API.get("/catalog/list"); setFiles(res.data); }
    catch { toast.error("Failed to load catalog"); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchFiles(); }, []);

  const exitSelectMode = () => { setSelectMode(false); setSelected(new Set()); };

  const allTags = [...new Set(files.flatMap(f=>(f.tags||"").split(",").map(t=>t.trim()).filter(Boolean)))].sort();
  const brands = [...new Set(files.map(f=>f.brand).filter(Boolean))];

  const filtered = files.filter(f => {
    const q = search.toLowerCase();
    const matchSearch = !search||[f.title,f.brand,f.model_series,f.description,f.tags].some(s=>s?.toLowerCase().includes(q));
    const matchType  = !filterType  || f.document_type===filterType;
    const matchBrand = !filterBrand || f.brand===filterBrand;
    const matchTag   = !filterTag   || (f.tags||"").split(",").map(t=>t.trim()).includes(filterTag);
    return matchSearch&&matchType&&matchBrand&&matchTag;
  });

  const toggleSelect = id => setSelected(prev => { const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });
  const selectAll = () => setSelected(new Set(filtered.map(f=>f.id)));
  const clearSelect = () => setSelected(new Set());
  const allVisibleSelected = filtered.length>0 && filtered.every(f=>selected.has(f.id));
  const someSelected = selected.size>0 && !allVisibleSelected;
  const toggleSelectAll = () => allVisibleSelected ? clearSelect() : selectAll();

  const handleDownload = async (id, filename) => {
    try {
      const res = await API.get(`/catalog/download/${id}`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data]));
      Object.assign(document.createElement("a"), { href: url, download: filename }).click();
      URL.revokeObjectURL(url);
      toast.success("Downloading...");
    } catch { toast.error("Download failed"); }
  };

  const handleView = async (id) => {
    try {
      const res = await API.get(`/catalog/download/${id}`, { responseType: "blob" });
      window.open(URL.createObjectURL(new Blob([res.data], { type: "application/pdf" })), "_blank");
    } catch { toast.error("Failed to open file"); }
  };

  const handleBulkDownload = async () => {
    if (selected.size === 0) return;
    setBulkDownloading(true);
    try {
      const res = await API.post("/catalog/bulk-download", { ids: Array.from(selected) }, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/zip" }));
      const disposition = res.headers["content-disposition"];
      const match = disposition?.match(/filename="?([^"]+)"?/);
      const zipName = match ? match[1] : `flotech_catalog_${Date.now()}.zip`;
      Object.assign(document.createElement("a"), { href: url, download: zipName }).click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${selected.size} file(s) as ZIP`);
    } catch { toast.error("Bulk download failed"); }
    finally { setBulkDownloading(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.ids) {
        const res = await API.post("/catalog/bulk-delete", { ids: deleteTarget.ids });
        toast.success(`${res.data.count} document(s) deleted`);
        setSelected(new Set()); setSelectMode(false);
      } else {
        await API.delete(`/catalog/delete/${deleteTarget.id}`);
        toast.success("Document deleted");
      }
      setDeleteTarget(null); fetchFiles();
    } catch { toast.error("Failed to delete"); }
    finally { setDeleting(false); }
  };

  const hasFilter = search||filterType||filterBrand||filterTag;
  const clearAll  = () => { setSearch(""); setFilterType(""); setFilterBrand(""); setFilterTag(""); };

  return (
    <div className="w-full pb-24">
      {deleteTarget&&<DeleteDialog title={deleteTarget.title} count={deleteTarget.count||1} onConfirm={confirmDelete} onCancel={()=>setDeleteTarget(null)} loading={deleting}/>}
      {showUpload&&<SingleUploadModal allTags={allTags} onClose={()=>setShowUpload(false)} onSuccess={()=>{setShowUpload(false);fetchFiles();}}/>}
      {showBulk&&<BulkUploadModal allTags={allTags} onClose={()=>setShowBulk(false)} onSuccess={fetchFiles}/>}

      {selectMode&&selected.size>0&&(
        <BulkToolbar
          selectedCount={selected.size} totalVisible={filtered.length}
          onSelectAll={selectAll} onClearSelect={exitSelectMode}
          onBulkDownload={handleBulkDownload}
          onBulkDelete={()=>setDeleteTarget({ids:Array.from(selected),count:selected.size})}
          downloading={bulkDownloading} deleting={deleting}
        />
      )}

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Catalogs & Manuals</h1>
          <p className="text-sm text-gray-400 mt-0.5">{files.length} saved document{files.length!==1?"s":""}</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={()=>{ selectMode?exitSelectMode():setSelectMode(true); }}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors
              ${selectMode?"bg-gray-800 text-white border-gray-800":"border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            {selectMode
              ? <><CheckSquare size={14}/> Selecting ({selected.size})</>
              : <><Square size={14}/> Select</>}
          </button>
          <button onClick={()=>setShowUpload(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 border border-[#0B3D91] text-[#0B3D91] rounded-xl text-sm font-semibold hover:bg-blue-50 transition-colors">
            <Plus size={14}/> Single
          </button>
          <button onClick={()=>setShowBulk(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-semibold hover:bg-[#1E5CC6] transition-colors">
            <Package size={14}/> Bulk Upload
          </button>
        </div>
      </div>

      {/* ── Type pills ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={()=>setFilterType("")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${!filterType?"bg-[#0B3D91] text-white border-[#0B3D91]":"bg-white text-gray-500 border-gray-200 hover:border-[#0B3D91]"}`}>
          <Grid size={11}/> All ({files.length})
        </button>
        {Object.entries(TYPE_CONFIG).map(([key,cfg])=>{
          const count=files.filter(f=>f.document_type===key).length;
          if(count===0)return null;
          const TypeIcon = cfg.IconComp;
          return(
            <button key={key} onClick={()=>setFilterType(filterType===key?"":key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all
                ${filterType===key?"border-[#0B3D91] bg-[#0B3D91] text-white":`border-transparent ${cfg.bg} ${cfg.text} hover:border-current`}`}>
              <TypeIcon size={11}/> {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      {/* ── Search + Brand ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1 min-w-0">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search by title, brand, model, description, tags..."
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white"/>
        </div>
        <select value={filterBrand} onChange={e=>setFilterBrand(e.target.value)}
          className="sm:w-40 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white flex-shrink-0">
          <option value="">All Brand</option>
          {brands.map(b=><option key={b} value={b}>{b}</option>)}
        </select>
        {hasFilter&&(
          <button onClick={clearAll} className="flex items-center gap-1 text-xs text-[#0B3D91] hover:underline px-2 whitespace-nowrap">
            <X size={12}/> Reset Filter
          </button>
        )}
      </div>

      {/* ── Tag chips ────────────────────────────────────────────────────────── */}
      {allTags.length>0&&(
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-4 py-3 mb-5">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Tag size={11} className="text-gray-400" />
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Filter by Tag</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {filterTag&&(
              <button onClick={()=>setFilterTag("")}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#0B3D91] text-white">
                <X size={10}/> Remove tag filter
              </button>
            )}
            {allTags.map(tag=>(
              <button key={tag} onClick={()=>setFilterTag(filterTag===tag?"":tag)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${filterTag===tag?"bg-[#0B3D91] text-white border-[#0B3D91]":"bg-gray-50 text-gray-600 border-gray-200 hover:border-[#0B3D91] hover:text-[#0B3D91]"}`}>
                {tag}<span className="ml-1 opacity-60">({files.filter(f=>(f.tags||"").split(",").map(t=>t.trim()).includes(tag)).length})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {hasFilter&&(
        <p className="text-xs text-gray-400 mb-3 px-1">
          Showing <span className="font-bold text-gray-700">{filtered.length}</span> of {files.length} documents
          {filterTag&&<span className="ml-1 text-[#0B3D91] font-semibold">· tag: {filterTag}</span>}
        </p>
      )}

      {/* ── File List ────────────────────────────────────────────────────────── */}
      {loading?(
        <div className="flex justify-center items-center h-40">
          <Loader2 size={32} className="text-[#0B3D91]" />
        </div>
      ):filtered.length===0?(
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Books size={28} className="text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">{hasFilter?"No documents match the filter":"There are no documents yet"}</p>
          {!hasFilter&&(
            <div className="flex items-center justify-center gap-3 mt-4">
              <button onClick={()=>setShowUpload(true)} className="flex items-center gap-1.5 px-4 py-2 border border-[#0B3D91] text-[#0B3D91] rounded-xl text-sm font-semibold hover:bg-blue-50">
                <Upload size={13}/> Upload Single
              </button>
              <button onClick={()=>setShowBulk(true)} className="flex items-center gap-1.5 px-5 py-2 bg-[#0B3D91] text-white rounded-xl text-sm font-semibold">
                <Package size={13}/> Bulk Upload
              </button>
            </div>
          )}
        </div>
      ):(
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="pl-4 pr-2 py-3 w-10">
                    {selectMode&&<Checkbox checked={allVisibleSelected} indeterminate={someSelected} onChange={toggleSelectAll}/>}
                  </th>
                  {["Document","Brand/Model","Type","Tags","Size","Date","Action"].map(h=>(
                    <th key={h} className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(file=>{
                  const tc=TYPE_CONFIG[file.document_type]||TYPE_CONFIG.other;
                  const TypeIcon = tc.IconComp;
                  const isPdf=file.filename?.toLowerCase().endsWith(".pdf");
                  const fileTags=(file.tags||"").split(",").map(t=>t.trim()).filter(Boolean);
                  const isSelected=selected.has(file.id);
                  return(
                    <tr key={file.id} onClick={()=>selectMode&&toggleSelect(file.id)}
                      className={`transition-colors ${selectMode?"cursor-pointer":""} ${isSelected?"bg-blue-50/80":"hover:bg-blue-50/40"}`}>
                      <td className="pl-4 pr-2 py-3 w-10">
                        {selectMode&&<Checkbox checked={isSelected} indeterminate={false} onChange={()=>toggleSelect(file.id)}/>}
                      </td>
                      <td className="px-4 py-3 max-w-[220px]">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 ${tc.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                            <TypeIcon size={16} className={tc.text} />
                          </div>
                          <p className="font-semibold text-gray-800 text-sm truncate">{file.title}</p>
                        </div>
                        {file.description&&<p className="text-xs text-gray-400 mt-0.5 ml-10 truncate max-w-[180px]">{file.description}</p>}
                      </td>
                      <td className="px-4 py-3">
                        {file.brand&&<p className="text-sm font-semibold text-gray-700">{file.brand}</p>}
                        {file.model_series&&<p className="text-xs text-gray-400">{file.model_series}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap ${tc.bg} ${tc.text}`}>
                          <TypeIcon size={10}/> {tc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[180px]">
                        <div className="flex flex-wrap gap-1">
                          {fileTags.slice(0,4).map(tag=>(
                            <button key={tag} onClick={e=>{e.stopPropagation();setFilterTag(filterTag===tag?"":tag);}}
                              className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border transition-all ${filterTag===tag?"bg-[#0B3D91] text-white border-[#0B3D91]":"bg-gray-50 text-gray-500 border-gray-200 hover:border-[#0B3D91] hover:text-[#0B3D91]"}`}>
                              {tag}
                            </button>
                          ))}
                          {fileTags.length>4&&<span className="text-[10px] text-gray-400 px-1">+{fileTags.length-4}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatSize(file.file_size)}</td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                        {file.created_at?new Date(file.created_at).toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"}):"—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5" onClick={e=>e.stopPropagation()}>
                          {isPdf&&(
                            <button onClick={()=>handleView(file.id)}
                              className="p-1.5 text-gray-400 hover:text-[#0B3D91] hover:bg-blue-50 rounded-lg transition-all" title="View">
                              <Eye size={15}/>
                            </button>
                          )}
                          <button onClick={()=>handleDownload(file.id,file.filename)}
                            className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="Download">
                            <Download size={15}/>
                          </button>
                          <button onClick={()=>setDeleteTarget({id:file.id,title:file.title,count:1})}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Delete">
                            <Trash2 size={15}/>
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
            {selectMode&&(
              <div className="px-4 py-2.5 bg-gray-50 flex items-center gap-2">
                <Checkbox checked={allVisibleSelected} indeterminate={someSelected} onChange={toggleSelectAll}/>
                <span className="text-xs text-gray-500 font-medium">{allVisibleSelected?"Deselect all":`Select all ${filtered.length}`}</span>
                {selected.size>0&&<span className="ml-auto text-xs text-[#0B3D91] font-semibold">{selected.size} selected</span>}
              </div>
            )}
            {filtered.map(file=>{
              const tc=TYPE_CONFIG[file.document_type]||TYPE_CONFIG.other;
              const TypeIcon = tc.IconComp;
              const isPdf=file.filename?.toLowerCase().endsWith(".pdf");
              const fileTags=(file.tags||"").split(",").map(t=>t.trim()).filter(Boolean);
              const isSelected=selected.has(file.id);
              return(
                <div key={file.id} onClick={()=>selectMode&&toggleSelect(file.id)}
                  className={`p-4 transition-colors ${selectMode?"cursor-pointer":""} ${isSelected?"bg-blue-50":""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {selectMode&&<Checkbox checked={isSelected} indeterminate={false} onChange={()=>toggleSelect(file.id)} className="mt-1"/>}
                      <div className={`w-10 h-10 ${tc.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <TypeIcon size={20} className={tc.text} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 text-sm truncate">{file.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{file.brand}{file.model_series?` · ${file.model_series}`:""}</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tc.bg} ${tc.text}`}>
                            <TypeIcon size={9}/> {tc.label}
                          </span>
                          {fileTags.slice(0,3).map(tag=>(
                            <button key={tag} onClick={e=>{e.stopPropagation();setFilterTag(filterTag===tag?"":tag);}}
                              className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border ${filterTag===tag?"bg-[#0B3D91] text-white border-[#0B3D91]":"bg-gray-50 text-gray-500 border-gray-200"}`}>
                              {tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    {!selectMode&&(
                      <div className="flex flex-col gap-1.5 flex-shrink-0" onClick={e=>e.stopPropagation()}>
                        {isPdf&&(
                          <button onClick={()=>handleView(file.id)}
                            className="flex items-center gap-1 text-xs text-[#0B3D91] font-semibold hover:underline">
                            <Eye size={12}/> View
                          </button>
                        )}
                        <button onClick={()=>handleDownload(file.id,file.filename)}
                          className="flex items-center gap-1 text-xs text-emerald-600 font-semibold hover:underline">
                          <Download size={12}/> Download
                        </button>
                        <button onClick={()=>setDeleteTarget({id:file.id,title:file.title,count:1})}
                          className="flex items-center gap-1 text-xs text-red-500 font-semibold hover:underline">
                          <Trash2 size={12}/> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectMode&&selected.size===0&&(
        <p className="text-center text-xs text-gray-400 mt-4">Click rows to select documents, then use the action toolbar at the bottom</p>
      )}
    </div>
  );
}