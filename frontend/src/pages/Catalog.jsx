import { useState, useEffect, useRef } from "react";
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

const EXT_ICON = {
  pdf: "📕", doc: "📝", docx: "📝", xls: "📊", xlsx: "📊",
  zip: "🗜", rar: "🗜", png: "🖼", jpg: "🖼", jpeg: "🖼",
};

function getExtIcon(filename) {
  const ext = filename?.split(".").pop()?.toLowerCase();
  return EXT_ICON[ext] || "📄";
}

function formatSize(bytes) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/* ─── Delete Dialog ───────────────────────────────────────────── */
function DeleteDialog({ title, count, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-gradient-to-br from-red-50 to-rose-100 px-6 pt-6 pb-4 text-center">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">🗑</span>
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
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
            {count > 1 ? `Delete ${count} Files` : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Bulk Action Toolbar (floating bottom) ───────────────────── */
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
              ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Zipping...</>
              : <>⬇ Download ZIP</>}
          </button>
          <button onClick={onBulkDelete} disabled={deleting}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-60">
            🗑 Delete
          </button>
          <button onClick={onClearSelect}
            className="p-2 text-gray-400 hover:text-white rounded-xl transition-colors text-lg leading-none">
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Checkbox ────────────────────────────────────────────────── */
function Checkbox({ checked, indeterminate, onChange, className = "" }) {
  const ref = useRef();
  useEffect(() => { if (ref.current) ref.current.indeterminate = !!indeterminate; }, [indeterminate]);
  return (
    <input ref={ref} type="checkbox" checked={checked} onChange={onChange}
      onClick={e => e.stopPropagation()}
      className={`w-4 h-4 rounded border-gray-300 accent-[#0B3D91] cursor-pointer flex-shrink-0 ${className}`} />
  );
}

/* ─── Single Upload Modal ─────────────────────────────────────── */
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
      toast.success("Document uploaded successfully! 📚");
      onSuccess();
    } catch (err) { toast.error(err.response?.data?.error || "Upload failed"); }
    finally { setUploading(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl">
          <h2 className="font-bold text-gray-800">📤 Upload Document</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div onDragOver={e=>{e.preventDefault();setDragActive(true);}} onDragLeave={()=>setDragActive(false)}
            onDrop={e=>{e.preventDefault();setDragActive(false);const f=e.dataTransfer.files[0];if(f)handleFileSelect(f);}}
            onClick={()=>document.getElementById("file-input-single").click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${dragActive?"border-[#0B3D91] bg-blue-50":"border-gray-200 hover:border-[#0B3D91] hover:bg-blue-50/30"}`}>
            <input id="file-input-single" type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.png,.jpg,.jpeg"
              onChange={e=>{const f=e.target.files[0];if(f)handleFileSelect(f);}} />
            {form.file ? (
              <div><p className="text-2xl mb-1">✅</p><p className="text-sm font-semibold text-[#0B3D91]">{form.file.name}</p><p className="text-xs text-gray-400 mt-0.5">{formatSize(form.file.size)}</p></div>
            ) : (
              <div><p className="text-3xl mb-2">📎</p><p className="text-sm text-gray-500">Drag & drop or <span className="text-[#0B3D91] font-semibold">click to select file</span></p><p className="text-xs text-gray-400 mt-1">PDF, DOC, XLS, ZIP, JPG, PNG</p></div>
            )}
          </div>
          <div><label className={labelClass}>Document Title *</label><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Document name" className={inputClass}/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelClass}>Brand</label><input value={form.brand} onChange={e=>setForm({...form,brand:e.target.value})} placeholder="e.g. iSOLV" className={inputClass}/></div>
            <div><label className={labelClass}>Model/Series</label><input value={form.model_series} onChange={e=>setForm({...form,model_series:e.target.value})} placeholder="e.g. EFS803" className={inputClass}/></div>
          </div>
          <div><label className={labelClass}>Document Type</label>
            <select value={form.document_type} onChange={e=>setForm({...form,document_type:e.target.value})} className={inputClass}>
              {Object.entries(TYPE_CONFIG).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
            </select>
          </div>
          <div><label className={labelClass}>Description</label><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} rows={2} placeholder="Brief description" className={inputClass+" resize-none"}/></div>
          <div>
            <label className={labelClass}>Tags <span className="text-gray-400 font-normal normal-case">(comma separated)</span></label>
            <input value={form.tags} onChange={e=>setForm({...form,tags:e.target.value})} placeholder="flow, magnetic, wastewater" className={inputClass}/>
            {allTags.length>0&&(<div className="mt-2"><p className="text-xs text-gray-400 mb-1.5">Existing tags:</p><div className="flex flex-wrap gap-1">{allTags.slice(0,20).map(tag=>{const already=form.tags.split(",").map(t=>t.trim()).includes(tag);return(<button key={tag} type="button" onClick={()=>{if(already)return;const current=form.tags.split(",").map(t=>t.trim()).filter(Boolean);setForm(f=>({...f,tags:[...current,tag].join(", ")}));}} className={`text-[10px] px-2 py-0.5 rounded-md border transition-all ${already?"bg-[#0B3D91] text-white border-[#0B3D91]":"bg-gray-50 text-gray-500 border-gray-200 hover:border-[#0B3D91]"}`}>{tag}</button>);})}</div></div>)}
          </div>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 rounded-b-2xl flex gap-3 justify-end">
          <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={uploading||!form.file}
            className="px-6 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-bold hover:bg-[#1E5CC6] disabled:opacity-60 flex items-center gap-2">
            {uploading?<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Uploading...</>:"⬆ Upload Document"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Bulk Upload Modal ───────────────────────────────────────── */
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
    const newItems = Array.from(fileList).filter(f=>ALLOWED.has("."+f.name.split(".").pop().toLowerCase())).filter(f=>!queue.find(q=>q.file.name===f.name&&q.file.size===f.size))
      .map(f=>({file:f,id:`${f.name}-${f.size}-${Date.now()}-${Math.random()}`,title:f.name.replace(/\.[^.]+$/,""),brand:"",model_series:"",document_type:"catalog",description:"",tags:"",status:"idle",progress:0,error:null}));
    if(newItems.length<Array.from(fileList).length)toast.error("Some files skipped — unsupported format");
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
        fd.append("file",item.file);fd.append("title",item.title||item.file.name);fd.append("brand",item.brand);fd.append("model_series",item.model_series);fd.append("document_type",item.document_type);fd.append("description",item.description);fd.append("tags",item.tags);
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
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center"><span className="text-lg">📦</span></div>
            <div><h2 className="font-bold text-gray-800 text-base">Bulk Upload Documents</h2><p className="text-xs text-gray-400">Upload multiple files at once with individual metadata</p></div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl p-1">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 pt-5">
            <div onDragOver={e=>{e.preventDefault();setDragActive(true);}} onDragLeave={()=>setDragActive(false)}
              onDrop={e=>{e.preventDefault();setDragActive(false);addFiles(e.dataTransfer.files);}}
              onClick={()=>fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all select-none ${dragActive?"border-[#0B3D91] bg-blue-50":"border-gray-200 hover:border-[#0B3D91] hover:bg-blue-50/30"}`}>
              <input ref={fileInputRef} type="file" multiple className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.png,.jpg,.jpeg" onChange={e=>addFiles(e.target.files)}/>
              <div className="flex flex-col items-center gap-2">
                <div className="flex gap-1 text-2xl">📕📊📗</div>
                <p className="text-sm font-semibold text-gray-700">{dragActive?"Release to add files":"Drag & drop multiple files here"}</p>
                <p className="text-xs text-gray-400">or <span className="text-[#0B3D91] font-semibold">click to browse</span> — PDF, DOC, XLS, ZIP, JPG, PNG</p>
              </div>
            </div>
          </div>
          {queue.length>0&&(<>
            <div className="px-6 pt-4">
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <button onClick={()=>setExpandedGlobal(v=>!v)} className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-2"><span className="text-sm">⚡</span><span className="text-sm font-semibold text-gray-700">Apply Global Settings to All Files</span></div>
                  <span className="text-gray-400 text-xs">{expandedGlobal?"▲":"▼"}</span>
                </button>
                {expandedGlobal&&(<div className="p-4 space-y-3 bg-white">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Brand</label><input value={globalBrand} onChange={e=>setGlobalBrand(e.target.value)} placeholder="e.g. iSOLV" className={inputClass}/></div>
                    <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Document Type</label><select value={globalType} onChange={e=>setGlobalType(e.target.value)} className={inputClass}>{Object.entries(TYPE_CONFIG).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}</select></div>
                    <div className="col-span-2 sm:col-span-1"><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Tags (append)</label><input value={globalTags} onChange={e=>setGlobalTags(e.target.value)} placeholder="flow, pressure" className={inputClass}/></div>
                  </div>
                  {allTags.length>0&&(<div className="flex flex-wrap gap-1">{allTags.slice(0,15).map(tag=>{const already=globalTags.split(",").map(t=>t.trim()).includes(tag);return(<button key={tag} type="button" onClick={()=>{if(already)return;const cur=globalTags.split(",").map(t=>t.trim()).filter(Boolean);setGlobalTags([...cur,tag].join(", "));}} className={`text-[10px] px-2 py-0.5 rounded-md border transition-all ${already?"bg-[#0B3D91] text-white border-[#0B3D91]":"bg-gray-50 text-gray-500 border-gray-200 hover:border-[#0B3D91]"}`}>{tag}</button>);})}</div>)}
                  <div className="flex justify-end"><button onClick={applyGlobalSettings} className="px-4 py-2 bg-[#0B3D91] text-white rounded-lg text-xs font-bold hover:bg-[#1E5CC6] transition-colors">⚡ Apply to All {queue.length} Files</button></div>
                </div>)}
              </div>
            </div>
            <div className="px-6 pt-3 pb-2 flex items-center gap-3 flex-wrap">
              <span className="text-xs font-bold text-gray-500">{queue.length} files queued</span>
              <div className="flex gap-2 flex-wrap">
                {doneCount>0&&<span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold">✓ {doneCount} done</span>}
                {errorCount>0&&<span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">✗ {errorCount} failed</span>}
                {uploadingCount>0&&<span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">↑ {uploadingCount} uploading</span>}
                {idleCount>0&&<span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-bold">{idleCount} pending</span>}
              </div>
              <button onClick={()=>setQueue(prev=>prev.filter(q=>q.status!=="done"))} className="ml-auto text-xs text-gray-400 hover:text-red-500 transition-colors">Clear done</button>
            </div>
            <div className="px-6 pb-4 space-y-2">
              {queue.map(item=>{
                const tc=TYPE_CONFIG[item.document_type]||TYPE_CONFIG.other;
                const isEditing=activeEdit===item.id;
                const statusColors={idle:"border-gray-200",uploading:"border-blue-400 bg-blue-50/30",done:"border-green-400 bg-green-50/30",error:"border-red-400 bg-red-50/30"};
                return(
                  <div key={item.id} className={`border rounded-xl overflow-hidden transition-all ${statusColors[item.status]}`}>
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="relative flex-shrink-0">
                        <span className="text-xl">{getExtIcon(item.file.name)}</span>
                        {item.status==="done"&&<span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold">✓</span>}
                        {item.status==="error"&&<span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold">✗</span>}
                        {item.status==="uploading"&&<span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center"><div className="w-2.5 h-2.5 border border-white border-t-transparent rounded-full animate-spin"/></span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{item.title||item.file.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tc.bg} ${tc.text}`}>{tc.label}</span>
                          {item.brand&&<span className="text-[10px] text-gray-500">{item.brand}</span>}
                          <span className="text-[10px] text-gray-400">{formatSize(item.file.size)}</span>
                        </div>
                        {item.error&&<p className="text-[10px] text-red-500 mt-0.5">{item.error}</p>}
                        {item.status==="uploading"&&(<div className="mt-1.5 h-1 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-[#0B3D91] rounded-full transition-all duration-300" style={{width:`${item.progress}%`}}/></div>)}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {item.status!=="uploading"&&item.status!=="done"&&(<button onClick={()=>setActiveEdit(isEditing?null:item.id)} className={`p-1.5 rounded-lg text-sm transition-colors ${isEditing?"bg-[#0B3D91] text-white":"text-gray-400 hover:text-[#0B3D91] hover:bg-blue-50"}`}>✏️</button>)}
                        {item.status!=="uploading"&&(<button onClick={()=>removeItem(item.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg text-sm transition-colors">🗑</button>)}
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
                          <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Document Type</label><select value={item.document_type} onChange={e=>updateItem(item.id,{document_type:e.target.value})} className={inputClass}>{Object.entries(TYPE_CONFIG).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}</select></div>
                          <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Tags</label><input value={item.tags} onChange={e=>updateItem(item.id,{tags:e.target.value})} placeholder="flow, pressure" className={inputClass}/></div>
                        </div>
                        <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Description</label><textarea value={item.description} onChange={e=>updateItem(item.id,{description:e.target.value})} rows={2} className={inputClass+" resize-none"}/></div>
                        <div className="flex justify-end"><button onClick={()=>setActiveEdit(null)} className="text-xs text-[#0B3D91] font-semibold hover:underline">✓ Done editing</button></div>
                      </div>
                    )}
                  </div>
                );
              })}
              <button onClick={()=>fileInputRef.current?.click()} className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-400 hover:border-[#0B3D91] hover:text-[#0B3D91] transition-colors font-medium">+ Add More Files</button>
            </div>
          </>)}
          {queue.length===0&&(<div className="px-6 pb-6 pt-4 text-center text-gray-400"><p className="text-4xl mb-2">📂</p><p className="text-sm">Drop files above to start building your upload queue</p></div>)}
        </div>
        <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between flex-shrink-0 bg-white rounded-b-2xl">
          <div className="text-xs text-gray-400">{queue.length>0?`${queue.filter(q=>q.status==="idle"||q.status==="error").length} file(s) ready to upload`:"No files selected"}</div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">{doneCount>0?"Close":"Cancel"}</button>
            <button onClick={handleUpload} disabled={isUploading||queue.filter(q=>q.status==="idle"||q.status==="error").length===0}
              className="px-6 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-bold hover:bg-[#1E5CC6] disabled:opacity-60 flex items-center gap-2 transition-colors">
              {isUploading?<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Uploading...</>:<>⬆ Upload {queue.filter(q=>q.status==="idle"||q.status==="error").length>0?`${queue.filter(q=>q.status==="idle"||q.status==="error").length} File(s)`:"All"}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Catalog Page ───────────────────────────────────────── */
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
  // ── Selection ─────────────────────────────────────────────────
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

      {/* Floating bulk toolbar */}
      {selectMode&&selected.size>0&&(
        <BulkToolbar
          selectedCount={selected.size} totalVisible={filtered.length}
          onSelectAll={selectAll} onClearSelect={exitSelectMode}
          onBulkDownload={handleBulkDownload}
          onBulkDelete={()=>setDeleteTarget({ids:Array.from(selected),count:selected.size})}
          downloading={bulkDownloading} deleting={deleting}
        />
      )}

      {/* ── Header ─────────────────────────────────────────────── */}
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
            {selectMode?`✓ Selecting (${selected.size})`:"☐ Select"}
          </button>
          <button onClick={()=>setShowUpload(true)} className="flex items-center gap-1.5 px-4 py-2.5 border border-[#0B3D91] text-[#0B3D91] rounded-xl text-sm font-semibold hover:bg-blue-50 transition-colors">+ Single</button>
          <button onClick={()=>setShowBulk(true)} className="flex items-center gap-1.5 px-4 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-semibold hover:bg-[#1E5CC6] transition-colors"><span>📦</span> Bulk Upload</button>
        </div>
      </div>

      {/* ── Type pills ─────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={()=>setFilterType("")} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${!filterType?"bg-[#0B3D91] text-white border-[#0B3D91]":"bg-white text-gray-500 border-gray-200 hover:border-[#0B3D91]"}`}>All ({files.length})</button>
        {Object.entries(TYPE_CONFIG).map(([key,cfg])=>{
          const count=files.filter(f=>f.document_type===key).length;if(count===0)return null;
          return(<button key={key} onClick={()=>setFilterType(filterType===key?"":key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${filterType===key?"border-[#0B3D91] bg-[#0B3D91] text-white":`border-transparent ${cfg.bg} ${cfg.text} hover:border-current`}`}>
            {cfg.icon} {cfg.label} ({count})</button>);
        })}
      </div>

      {/* ── Search + Brand ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1 min-w-0">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by title, brand, model, description, tags..."
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white"/>
        </div>
        <select value={filterBrand} onChange={e=>setFilterBrand(e.target.value)} className="sm:w-40 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white flex-shrink-0">
          <option value="">All Brand</option>{brands.map(b=><option key={b} value={b}>{b}</option>)}
        </select>
        {hasFilter&&<button onClick={clearAll} className="text-xs text-[#0B3D91] hover:underline px-2 whitespace-nowrap">× Reset Filter</button>}
      </div>

      {/* ── Tag chips ──────────────────────────────────────────── */}
      {allTags.length>0&&(
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-4 py-3 mb-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">🏷 Filter Tag</p>
          <div className="flex flex-wrap gap-1.5">
            {filterTag&&<button onClick={()=>setFilterTag("")} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#0B3D91] text-white">× Remove tag filter</button>}
            {allTags.map(tag=>(
              <button key={tag} onClick={()=>setFilterTag(filterTag===tag?"":tag)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${filterTag===tag?"bg-[#0B3D91] text-white border-[#0B3D91]":"bg-gray-50 text-gray-600 border-gray-200 hover:border-[#0B3D91] hover:text-[#0B3D91]"}`}>
                {tag}<span className="ml-1 opacity-60">({files.filter(f=>(f.tags||"").split(",").map(t=>t.trim()).includes(tag)).length})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {hasFilter&&<p className="text-xs text-gray-400 mb-3 px-1">Showing <span className="font-bold text-gray-700">{filtered.length}</span> of {files.length} documents{filterTag&&<span className="ml-1 text-[#0B3D91] font-semibold">· tag: {filterTag}</span>}</p>}

      {/* ── File List ──────────────────────────────────────────── */}
      {loading?(
        <div className="flex justify-center items-center h-40"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B3D91]"/></div>
      ):filtered.length===0?(
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-4xl mb-3">📚</p>
          <p className="text-gray-500 font-medium">{hasFilter?"No documents match the filter":"There are no documents yet"}</p>
          {!hasFilter&&(<div className="flex items-center justify-center gap-3 mt-4">
            <button onClick={()=>setShowUpload(true)} className="px-4 py-2 border border-[#0B3D91] text-[#0B3D91] rounded-xl text-sm font-semibold hover:bg-blue-50">Upload Single</button>
            <button onClick={()=>setShowBulk(true)} className="px-5 py-2 bg-[#0B3D91] text-white rounded-xl text-sm font-semibold">📦 Bulk Upload</button>
          </div>)}
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
                          <span className={`w-8 h-8 ${tc.bg} rounded-lg flex items-center justify-center text-base flex-shrink-0`}>{tc.icon}</span>
                          <p className="font-semibold text-gray-800 text-sm truncate">{file.title}</p>
                        </div>
                        {file.description&&<p className="text-xs text-gray-400 mt-0.5 ml-10 truncate max-w-[180px]">{file.description}</p>}
                      </td>
                      <td className="px-4 py-3">
                        {file.brand&&<p className="text-sm font-semibold text-gray-700">{file.brand}</p>}
                        {file.model_series&&<p className="text-xs text-gray-400">{file.model_series}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap ${tc.bg} ${tc.text}`}>{tc.label}</span>
                      </td>
                      <td className="px-4 py-3 max-w-[180px]">
                        <div className="flex flex-wrap gap-1">
                          {fileTags.slice(0,4).map(tag=>(
                            <button key={tag} onClick={e=>{e.stopPropagation();setFilterTag(filterTag===tag?"":tag);}}
                              className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border transition-all ${filterTag===tag?"bg-[#0B3D91] text-white border-[#0B3D91]":"bg-gray-50 text-gray-500 border-gray-200 hover:border-[#0B3D91] hover:text-[#0B3D91]"}`}>{tag}</button>
                          ))}
                          {fileTags.length>4&&<span className="text-[10px] text-gray-400 px-1">+{fileTags.length-4}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatSize(file.file_size)}</td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{file.created_at?new Date(file.created_at).toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"}):"—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5" onClick={e=>e.stopPropagation()}>
                          {isPdf&&<button onClick={()=>handleView(file.id)} className="p-1.5 text-gray-400 hover:text-[#0B3D91] hover:bg-blue-50 rounded-lg transition-all" title="View">👁</button>}
                          <button onClick={()=>handleDownload(file.id,file.filename)} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="Download">⬇</button>
                          <button onClick={()=>setDeleteTarget({id:file.id,title:file.title,count:1})} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Delete">🗑</button>
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
              const isPdf=file.filename?.toLowerCase().endsWith(".pdf");
              const fileTags=(file.tags||"").split(",").map(t=>t.trim()).filter(Boolean);
              const isSelected=selected.has(file.id);
              return(
                <div key={file.id} onClick={()=>selectMode&&toggleSelect(file.id)}
                  className={`p-4 transition-colors ${selectMode?"cursor-pointer":""} ${isSelected?"bg-blue-50":""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {selectMode&&<Checkbox checked={isSelected} indeterminate={false} onChange={()=>toggleSelect(file.id)} className="mt-1"/>}
                      <span className={`w-10 h-10 ${tc.bg} rounded-xl flex items-center justify-center text-xl flex-shrink-0`}>{tc.icon}</span>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 text-sm truncate">{file.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{file.brand}{file.model_series?` · ${file.model_series}`:""}</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tc.bg} ${tc.text}`}>{tc.label}</span>
                          {fileTags.slice(0,3).map(tag=>(
                            <button key={tag} onClick={e=>{e.stopPropagation();setFilterTag(filterTag===tag?"":tag);}}
                              className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border ${filterTag===tag?"bg-[#0B3D91] text-white border-[#0B3D91]":"bg-gray-50 text-gray-500 border-gray-200"}`}>{tag}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                    {!selectMode&&(
                      <div className="flex flex-col gap-1 flex-shrink-0" onClick={e=>e.stopPropagation()}>
                        {isPdf&&<button onClick={()=>handleView(file.id)} className="text-xs text-[#0B3D91] font-semibold hover:underline">View</button>}
                        <button onClick={()=>handleDownload(file.id,file.filename)} className="text-xs text-emerald-600 font-semibold hover:underline">Download</button>
                        <button onClick={()=>setDeleteTarget({id:file.id,title:file.title,count:1})} className="text-xs text-red-500 font-semibold hover:underline">Delete</button>
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