import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../services/api";
import toast from "react-hot-toast";
import { compressImage, formatBytes } from "../utils/imageCompressor";
import {
  ArrowLeft,
  Trash2,
  Eye,
  Download,
  Pencil,
  X,
  Check,
  Camera,
  Building2,
  Wrench,
  ClipboardList,
  ImageIcon,
  PenLine,
  FileText,
  Plus,
  Loader2,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Palette,
  Image,
  Upload,
  ZapIcon,
  Info,
  User,
  CalendarDays,
  Globe,
  UserCheck,
  UserX,
  Settings2,
} from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_URL;

const STATUS_CONFIG = {
  draft:     { label: "Draft",     bg: "bg-gray-100",    text: "text-gray-600",    dot: "bg-gray-400"    },
  submitted: { label: "Submitted", bg: "bg-blue-100",    text: "text-blue-700",    dot: "bg-blue-500"    },
  approved:  { label: "Approved",  bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
};

/* ─── PDF Modal ──────────────────────────────────────────────── */
function PDFModal({ url, name, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
      <div className="flex items-center justify-between px-5 py-3 bg-[#0B3D91]">
        <span className="text-white font-bold text-sm flex items-center gap-2">
          <FileText className="w-4 h-4" /> {name} — Preview
        </span>
        <div className="flex items-center gap-2">
          <a href={url} download className="flex items-center gap-1.5 px-4 py-1.5 bg-white text-[#0B3D91] rounded-lg text-xs font-bold hover:bg-blue-50 transition-colors">
            <Download className="w-3.5 h-3.5" /> Download
          </a>
          <button onClick={onClose} className="text-white/70 hover:text-white px-2">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      <iframe src={url} className="flex-1 w-full" style={{ border: "none" }} />
    </div>
  );
}

/* ─── Delete Dialog ─────────────────────────────────────────── */
function DeleteDialog({ title, description, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-gradient-to-br from-red-50 to-rose-100 px-6 pt-6 pb-4 text-center">
          <div className="w-14 h-14 bg-red-100 border-4 border-red-200 rounded-full flex items-center justify-center mx-auto mb-3">
            <Trash2 className="w-7 h-7 text-red-500" />
          </div>
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
          {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
        </div>
        <div className="px-6 py-4 flex gap-3">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Signature Pad ─────────────────────────────────────────── */
function SignaturePad({ label, value, onChange }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [showPad, setShowPad] = useState(false);
  const lastPos = useRef(null);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  };
  const startDraw = (e) => { e.preventDefault(); setDrawing(true); setHasDrawn(true); lastPos.current = getPos(e, canvasRef.current); };
  const draw = (e) => {
    if (!drawing) return; e.preventDefault();
    const canvas = canvasRef.current; const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.beginPath(); ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y); ctx.strokeStyle = "#0B3D91"; ctx.lineWidth = 2.5;
    ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke(); lastPos.current = pos;
  };
  const endDraw = () => setDrawing(false);
  const clearPad = () => {
    canvasRef.current.getContext("2d").clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHasDrawn(false);
  };
  const saveSig = () => {
    if (!hasDrawn) { toast.error("Make a signature first"); return; }
    onChange(canvasRef.current.toDataURL("image/png")); setShowPad(false); toast.success("Signature saved");
  };

  return (
    <div>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{label}</p>
      {value ? (
        <div className="border border-gray-200 rounded-xl bg-gray-50 p-3 relative">
          <img src={value} alt="Signature" className="h-16 mx-auto object-contain" />
          <button onClick={() => onChange("")}
            className="absolute top-2 right-2 flex items-center gap-1 text-xs text-red-500 hover:underline">
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        </div>
      ) : (
        <button onClick={() => setShowPad(true)}
          className="w-full border-2 border-dashed border-gray-200 rounded-xl py-5 text-gray-400 text-sm hover:border-[#0B3D91] hover:text-[#0B3D91] transition-colors flex items-center justify-center gap-2">
          <PenLine className="w-4 h-4" /> Add Signature
        </button>
      )}
      {showPad && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-gray-800 text-sm">{label}</p>
              <button onClick={() => setShowPad(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <canvas ref={canvasRef} width={320} height={150}
              className="border border-gray-200 rounded-xl w-full touch-none cursor-crosshair bg-gray-50"
              onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
              onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
            <div className="flex gap-2 mt-3">
              <button onClick={clearPad} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Repeat</button>
              <button onClick={saveSig} className="flex-1 py-2 bg-[#0B3D91] text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                <Check className="w-4 h-4" /> Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Rich Text Editor ─────────────────────────────────────── */
function RichTextEditor({ value, onChange }) {
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const [fontSize, setFontSize] = useState("14px");
  const [fontColor, setFontColor] = useState("#374151");
  const isUpdatingRef = useRef(false);

  useEffect(() => {
    if (editorRef.current && !isUpdatingRef.current) {
      if (editorRef.current.innerHTML !== (value || "")) {
        editorRef.current.innerHTML = value || "";
      }
    }
  }, [value]);

  const exec = useCallback((cmd, val = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
  }, []);

  const handleInput = useCallback(() => {
    isUpdatingRef.current = true;
    onChange(editorRef.current?.innerHTML || "");
    setTimeout(() => { isUpdatingRef.current = false; }, 0);
  }, [onChange]);

  const handleFontSize = (size) => {
    setFontSize(size);
    exec("fontSize", "7");
    const spans = editorRef.current?.querySelectorAll('font[size="7"]');
    spans?.forEach(s => { s.removeAttribute("size"); s.style.fontSize = size; });
  };

  const handleFontColor = (color) => { setFontColor(color); exec("foreColor", color); };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      exec("insertHTML", `<img src="${ev.target.result}" style="max-width:100%;width:300px;cursor:pointer;" />`);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleEditorClick = (e) => {
    if (e.target.tagName === "IMG") {
      const img = e.target;
      const w = prompt("Image width (px):", img.style.width || "300");
      if (w) { img.style.width = isNaN(w) ? w : w + "px"; handleInput(); }
    }
  };

  const ToolBtn = ({ cmd, val, title, children }) => (
    <button type="button" title={title}
      onMouseDown={e => { e.preventDefault(); exec(cmd, val); }}
      className="px-2 py-1.5 text-sm hover:bg-gray-100 rounded transition-colors text-gray-600 font-medium flex items-center justify-center">
      {children}
    </button>
  );

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-gray-50 border-b border-gray-200">
        <select value={fontSize} onChange={e => handleFontSize(e.target.value)}
          className="text-xs border border-gray-200 rounded px-1.5 py-1 mr-1 bg-white">
          {["10px","12px","13px","14px","16px","18px","20px","24px"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <ToolBtn cmd="bold" title="Bold"><Bold className="w-3.5 h-3.5" /></ToolBtn>
        <ToolBtn cmd="italic" title="Italic"><Italic className="w-3.5 h-3.5" /></ToolBtn>
        <ToolBtn cmd="underline" title="Underline"><Underline className="w-3.5 h-3.5" /></ToolBtn>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <ToolBtn cmd="insertOrderedList" title="Numbered List"><ListOrdered className="w-3.5 h-3.5" /></ToolBtn>
        <ToolBtn cmd="insertUnorderedList" title="Bullet List"><List className="w-3.5 h-3.5" /></ToolBtn>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <ToolBtn cmd="justifyLeft" title="Align Left"><AlignLeft className="w-3.5 h-3.5" /></ToolBtn>
        <ToolBtn cmd="justifyCenter" title="Center"><AlignCenter className="w-3.5 h-3.5" /></ToolBtn>
        <ToolBtn cmd="justifyRight" title="Align Right"><AlignRight className="w-3.5 h-3.5" /></ToolBtn>
        <ToolBtn cmd="justifyFull" title="Justify"><AlignJustify className="w-3.5 h-3.5" /></ToolBtn>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <label title="Font Color" className="flex items-center gap-1 px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer">
          <Palette className="w-3.5 h-3.5" style={{ color: fontColor }} />
          <input type="color" value={fontColor} onChange={e => handleFontColor(e.target.value)}
            className="w-4 h-4 cursor-pointer border-0 p-0 bg-transparent" />
        </label>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <button type="button" title="Insert Image" onClick={() => fileInputRef.current?.click()}
          className="px-2 py-1.5 hover:bg-gray-100 rounded transition-colors text-gray-600 flex items-center justify-center">
          <Image className="w-3.5 h-3.5" />
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      </div>
      <div ref={editorRef} contentEditable suppressContentEditableWarning
        onInput={handleInput} onClick={handleEditorClick}
        className="rich-editor-detail min-h-[180px] p-4 text-sm text-gray-700 focus:outline-none"
        style={{ lineHeight: "1.6" }}
        data-placeholder="Job description..." />
      <style>{`
        .rich-editor-detail:empty:before { content: attr(data-placeholder); color: #9CA3AF; pointer-events: none; }
        .rich-editor-detail ul { list-style-type: disc; padding-left: 1.5rem; margin: 0.25rem 0; }
        .rich-editor-detail ol { list-style-type: decimal; padding-left: 1.5rem; margin: 0.25rem 0; }
        .rich-editor-detail li { margin: 0.1rem 0; }
        .rich-editor-detail p { margin: 0.2rem 0; }
      `}</style>
    </div>
  );
}

/* ─── Equipment Card (view) ─────────────────────────────────── */
function EquipmentCard({ item, index }) {
  return (
    <div className="border border-gray-100 rounded-xl p-3 bg-gray-50 mb-2 last:mb-0">
      <p className="text-xs font-bold text-[#0B3D91] uppercase tracking-wide mb-2 flex items-center gap-1.5">
        <Wrench className="w-3.5 h-3.5" /> Equipment/Instrument {index + 1}
      </p>
      {item.description && <p className="text-sm text-gray-700 font-medium">{item.description}</p>}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
        {item.model && (
          <span className="text-xs text-gray-500">Model: <span className="font-semibold text-gray-700">{item.model}</span></span>
        )}
        {item.serial_number && (
          <span className="text-xs text-gray-500">S/N: <span className="font-semibold text-gray-700">{item.serial_number}</span></span>
        )}
      </div>
    </div>
  );
}

/* ─── Equipment Item (edit) ─────────────────────────────────── */
function EquipmentEditItem({ item, index, onChange, onRemove, canRemove }) {
  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white";
  const labelCls = "block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1";
  return (
    <div className="border border-gray-100 rounded-xl p-4 bg-gray-50 relative">
      {canRemove && (
        <button onClick={() => onRemove(index)} className="absolute top-3 right-3 text-red-400 hover:text-red-600">
          <X className="w-4 h-4" />
        </button>
      )}
      <p className="text-xs font-bold text-[#0B3D91] uppercase tracking-wide mb-3 flex items-center gap-1.5">
        <Wrench className="w-3.5 h-3.5" /> Equipment/Instrument {index + 1}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Equipment/Instrument Information</label>
          <input value={item.description || ""} onChange={e => onChange(index, "description", e.target.value)}
            placeholder="Instrument name/type" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Model/Type</label>
          <input value={item.model || ""} onChange={e => onChange(index, "model", e.target.value)}
            placeholder="e.g. TUF333i, EFS808" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Serial Number</label>
          <input value={item.serial_number || ""} onChange={e => onChange(index, "serial_number", e.target.value)}
            placeholder="SN-..." className={inputCls} />
        </div>
      </div>
    </div>
  );
}

/* ─── Language Option Card ───────────────────────────────────── */
function LangCard({ value, selected, onClick, flag, label, sublabel }) {
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={`flex-1 relative flex flex-col items-center gap-2 px-4 py-4 rounded-xl border-2 transition-all duration-200 cursor-pointer
        ${selected
          ? "border-[#0B3D91] bg-[#EEF3FB] shadow-md"
          : "border-gray-200 bg-white hover:border-[#0B3D91]/40 hover:bg-gray-50"
        }`}
    >
      {selected && (
        <span className="absolute top-2 right-2 w-4 h-4 bg-[#0B3D91] rounded-full flex items-center justify-center">
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
      )}
      <span className="text-2xl leading-none">{flag}</span>
      <div className="text-center">
        <p className={`text-sm font-bold ${selected ? "text-[#0B3D91]" : "text-gray-700"}`}>{label}</p>
        <p className="text-[10px] text-gray-400 mt-0.5">{sublabel}</p>
      </div>
    </button>
  );
}

/* ─── Signature Option Card ──────────────────────────────────── */
function SigOptionCard({ value, selected, onClick, icon: Icon, label, sublabel }) {
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={`flex-1 relative flex flex-col items-center gap-2 px-4 py-4 rounded-xl border-2 transition-all duration-200 cursor-pointer
        ${selected
          ? "border-[#0B3D91] bg-[#EEF3FB] shadow-md"
          : "border-gray-200 bg-white hover:border-[#0B3D91]/40 hover:bg-gray-50"
        }`}
    >
      {selected && (
        <span className="absolute top-2 right-2 w-4 h-4 bg-[#0B3D91] rounded-full flex items-center justify-center">
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
      )}
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${selected ? "bg-[#0B3D91]" : "bg-gray-100"}`}>
        <Icon size={20} className={selected ? "text-white" : "text-gray-500"} />
      </span>
      <div className="text-center">
        <p className={`text-sm font-bold ${selected ? "text-[#0B3D91]" : "text-gray-700"}`}>{label}</p>
        <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{sublabel}</p>
      </div>
    </button>
  );
}

/* ─── Compression Status ─────────────────────────────────────── */
function CompressionStatus({ items }) {
  if (!items.length) return null;
  const done    = items.filter(i => i.done).length;
  const total   = items.length;
  const pct     = Math.round((done / total) * 100);
  const savings = items.reduce((acc, i) => acc + (i.savedBytes || 0), 0);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs mb-0.5">
        <span className="font-semibold text-[#0B3D91] flex items-center gap-1.5">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Compressing {total} image{total > 1 ? "s" : ""}…
        </span>
        <span className="text-gray-400">{done}/{total}</span>
      </div>
      <div className="h-1.5 bg-blue-100 rounded-full overflow-hidden">
        <div className="h-full bg-[#0B3D91] rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
      {savings > 0 && (
        <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
          <Check className="w-3 h-3" /> Saved {formatBytes(savings)} so far
        </p>
      )}
    </div>
  );
}

/* ─── Image Card ─────────────────────────────────────────────── */
function ImageCard({ img, onDelete, onCaptionSave }) {
  const [editingCaption, setEditingCaption] = useState(false);
  const [caption, setCaption]               = useState(img.caption || "");
  const [saving, setSaving]                 = useState(false);
  const [deleteDialog, setDeleteDialog]     = useState(false);
  const [deleting, setDeleting]             = useState(false);
  const inputRef = useRef(null);

  const filename = (img.file_path || "").split(/[\/\\]/).pop();
  const imgUrl   = `${BASE_URL}/uploads/${filename}`;

  const handleSaveCaption = async () => {
    setSaving(true);
    try {
      await onCaptionSave(img.id, caption);
      setEditingCaption(false);
    } catch {
      toast.error("Failed to save caption");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(img.id);
    } catch {
      toast.error("Failed to delete");
      setDeleting(false);
      setDeleteDialog(false);
    }
  };

  useEffect(() => {
    if (editingCaption && inputRef.current) inputRef.current.focus();
  }, [editingCaption]);

  return (
    <>
      {deleteDialog && (
        <DeleteDialog
          title="Delete Photo?"
          description="This photo will be permanently deleted."
          onConfirm={handleDelete}
          onCancel={() => setDeleteDialog(false)}
          loading={deleting}
        />
      )}
      <div className="group relative rounded-xl overflow-hidden border border-gray-100 shadow-sm bg-white">
        <div className="relative overflow-hidden bg-gray-50" style={{ aspectRatio: "4/3" }}>
          <img
            src={imgUrl}
            alt={caption || filename}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
            onError={e => {
              e.target.onerror = null;
              e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect width='80' height='80' fill='%23f3f4f6'/%3E%3Ctext x='40' y='44' text-anchor='middle' font-size='11' fill='%239ca3af'%3ENo image%3C/text%3E%3C/svg%3E";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-end justify-between p-2">
            <button onClick={() => setEditingCaption(true)} title="Edit caption"
              className="w-7 h-7 bg-white/90 text-[#0B3D91] rounded-lg flex items-center justify-center hover:bg-white transition-colors shadow">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setDeleteDialog(true)} title="Delete photo"
              className="w-7 h-7 bg-white/90 text-red-500 rounded-lg flex items-center justify-center hover:bg-white transition-colors shadow">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="p-2">
          {editingCaption ? (
            <div className="flex flex-col gap-1.5">
              <input
                ref={inputRef}
                value={caption}
                onChange={e => setCaption(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") handleSaveCaption();
                  if (e.key === "Escape") { setCaption(img.caption || ""); setEditingCaption(false); }
                }}
                placeholder="Caption / photo information…"
                className="w-full text-xs border border-[#0B3D91] rounded-lg px-2 py-1.5 focus:outline-none"
              />
              <div className="flex gap-1">
                <button onClick={handleSaveCaption} disabled={saving}
                  className="flex-1 py-1 bg-[#0B3D91] text-white text-xs rounded-lg font-semibold disabled:opacity-60 flex items-center justify-center gap-1">
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  {saving ? "…" : "Save"}
                </button>
                <button onClick={() => { setCaption(img.caption || ""); setEditingCaption(false); }}
                  className="px-2 py-1 border border-gray-200 text-gray-500 text-xs rounded-lg flex items-center justify-center">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ) : (
            <p
              onClick={() => setEditingCaption(true)}
              className="text-xs text-gray-400 cursor-pointer hover:text-[#0B3D91] transition-colors line-clamp-2 min-h-[2rem]"
            >
              {caption || <span className="italic text-gray-300">Add caption / photo info…</span>}
            </p>
          )}
        </div>
      </div>
    </>
  );
}

/* ─── MAIN PAGE ─────────────────────────────────────────────── */
export default function OnsiteReportDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [report,         setReport]         = useState(null);
  const [engineers,      setEngineers]      = useState([]);
  const [editMode,       setEditMode]       = useState(false);
  const [form,           setForm]           = useState({});
  const [saving,         setSaving]         = useState(false);
  const [pdfLoading,     setPdfLoading]     = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUrl,     setPreviewUrl]     = useState(null);
  const [deleteDialog,   setDeleteDialog]   = useState(false);
  const [deleting,       setDeleting]       = useState(false);

  // Image states
  const [uploading,      setUploading]      = useState(false);
  const [dragActive,     setDragActive]     = useState(false);
  const [compressItems,  setCompressItems]  = useState([]);
  const [compressing,    setCompressing]    = useState(false);

  const fetchReport = useCallback(async () => {
    try {
      const res = await API.get(`/onsite/detail/${id}`);
      setReport(res.data);
    } catch { toast.error("Failed to load data"); }
  }, [id]);

  useEffect(() => { fetchReport(); }, [fetchReport]);
  useEffect(() => { API.get("/engineer/").then(r => setEngineers(r.data)).catch(() => {}); }, []);

  const getEquipmentItems = (rpt) => {
    if (rpt.equipment_items && Array.isArray(rpt.equipment_items) && rpt.equipment_items.length > 0) {
      return rpt.equipment_items;
    }
    if (rpt.equipment_tag || rpt.equipment_model || rpt.serial_number) {
      return [{ description: rpt.equipment_tag || "", model: rpt.equipment_model || "", serial_number: rpt.serial_number || "" }];
    }
    return [{ description: "", model: "", serial_number: "" }];
  };

  const openEdit = () => {
    setForm({
      report_number:               report.report_number || "",
      visit_date_from:             report.visit_date_from || report.visit_date || "",
      visit_date_to:               report.visit_date_to || "",
      client_name:                 report.client_name || "",
      client_company:              report.client_company || "",
      client_address:              report.client_address || "",
      site_location:               report.site_location || "",
      contact_person:              report.contact_person || "",
      contact_phone:               report.contact_phone || "",
      engineer_id:                 report.engineer_id || "",
      job_description:             report.job_description || "",
      equipment_items:             getEquipmentItems(report),
      customer_signature:          report.customer_signature || "",
      status:                      report.status || "draft",
      pdf_language:                report.pdf_language || "en",
      include_customer_signature:  report.include_customer_signature !== false,
    });
    setEditMode(true);
  };

  const handleEquipmentChange = (index, field, value) => {
    setForm(f => {
      const items = [...f.equipment_items];
      items[index] = { ...items[index], [field]: value };
      return { ...f, equipment_items: items };
    });
  };
  const addEquipment    = () => setForm(f => ({ ...f, equipment_items: [...f.equipment_items, { description: "", model: "", serial_number: "" }] }));
  const removeEquipment = (index) => setForm(f => ({ ...f, equipment_items: f.equipment_items.filter((_, i) => i !== index) }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        client_name:     form.contact_person || form.client_company,
        visit_date:      form.visit_date_from,
        equipment_items: form.equipment_items,
        equipment_tag:   form.equipment_items[0]?.description || "",
        equipment_model: form.equipment_items[0]?.model || "",
        serial_number:   form.equipment_items[0]?.serial_number || "",
      };
      await API.put(`/onsite/update/${id}`, payload);
      toast.success("Saved successfully");
      setEditMode(false);
      fetchReport();
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await API.delete(`/onsite/delete/${id}`);
      toast.success("Report deleted");
      navigate("/onsite");
    } catch { toast.error("Failed to delete"); setDeleting(false); setDeleteDialog(false); }
  };

  /* ── Image upload with compression ─────────────────────────── */
  const handleFiles = async (files) => {
    const fileArr = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (!fileArr.length) return;

    setCompressing(true);
    const progressItems = fileArr.map((f, idx) => ({
      idx, name: f.name, originalSize: f.size, done: false, savedBytes: 0,
    }));
    setCompressItems(progressItems);

    const compressed = [];
    for (let i = 0; i < fileArr.length; i++) {
      const original = fileArr[i];
      try {
        const result = await compressImage(original);
        compressed.push(result);
        setCompressItems(prev =>
          prev.map(item =>
            item.idx === i
              ? { ...item, done: true, savedBytes: Math.max(0, original.size - result.size) }
              : item,
          ),
        );
      } catch {
        compressed.push(original);
        setCompressItems(prev =>
          prev.map(item => item.idx === i ? { ...item, done: true, savedBytes: 0 } : item),
        );
      }
    }

    setCompressing(false);

    const originalTotal   = fileArr.reduce((s, f) => s + f.size, 0);
    const compressedTotal = compressed.reduce((s, f) => s + f.size, 0);
    const savedTotal      = originalTotal - compressedTotal;
    const savedPct        = originalTotal > 0 ? Math.round((savedTotal / originalTotal) * 100) : 0;

    const fd = new FormData();
    compressed.forEach(f => fd.append("images", f));
    setUploading(true);
    try {
      await API.post(`/onsite/upload/${id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      if (savedTotal > 0) {
        toast.success(
          `${fileArr.length} photo uploaded\nCompressed: saved ${formatBytes(savedTotal)} (${savedPct}% smaller)`,
          { duration: 4000 },
        );
      } else {
        toast.success(`${fileArr.length} photo uploaded successfully!`);
      }
      fetchReport();
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      setCompressItems([]);
    }
  };

  const deleteImage = async (imgId) => {
    await API.delete(`/onsite/image/delete/${imgId}`);
    toast.success("Photo deleted");
    fetchReport();
  };

  const saveCaption = async (imgId, caption) => {
    await API.put(`/onsite/image/caption/${imgId}`, { caption });
    setReport(prev => ({
      ...prev,
      images: (prev.images || []).map(i => i.id === imgId ? { ...i, caption } : i),
    }));
  };

  const previewPDF = async () => {
    setPreviewLoading(true);
    try {
      const res = await API.get(`/onsite/pdf/preview/${id}`, { responseType: "blob" });
      setPreviewUrl(URL.createObjectURL(new Blob([res.data], { type: "application/pdf" })));
    } catch { toast.error("Failed to load preview"); }
    finally { setPreviewLoading(false); }
  };

  const downloadPDF = async () => {
    setPdfLoading(true);
    try {
      const res = await API.get(`/onsite/pdf/${id}`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      Object.assign(document.createElement("a"), {
        href: url,
        download: `OnsiteReport_${report.report_number}.pdf`,
      }).click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast.success("PDF downloaded!");
    } catch { toast.error("Failed to generate PDF"); }
    finally { setPdfLoading(false); }
  };

  if (!report) return (
    <div className="flex justify-center items-center h-40">
      <Loader2 className="w-10 h-10 animate-spin text-[#0B3D91]" />
    </div>
  );

  const sc = STATUS_CONFIG[report.status] || STATUS_CONFIG.draft;
  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white";
  const labelClass = "block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5";
  const equipmentItems = getEquipmentItems(report);
  const reportImages   = report.images || [];

  // PDF settings from saved report
  const pdfLang    = report.pdf_language || "en";
  const inclSig    = report.include_customer_signature !== false;

  const InfoRow = ({ label, value }) => value ? (
    <div className="flex gap-3 py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 w-36 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-800 font-medium">{value}</span>
    </div>
  ) : null;

  return (
    <div className="w-full">
      {/* Modals */}
      {previewUrl && (
        <PDFModal
          url={previewUrl}
          name={report.report_number}
          onClose={() => { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }}
        />
      )}
      {deleteDialog && (
        <DeleteDialog
          title="Delete Report?"
          description={`Report "${report.report_number}" will be permanently deleted along with all photos.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteDialog(false)}
          loading={deleting}
        />
      )}

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div className="mb-5">
        <button
          onClick={() => navigate("/onsite")}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#0B3D91] mb-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <h1 className="text-2xl font-bold text-gray-800">{report.report_number}</h1>

        {/* Badges row */}
        <div className="flex items-center gap-2 mt-1 mb-3 flex-wrap">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}>
            {sc.label}
          </span>
          {(report.visit_date_from || report.visit_date) && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />
              {(() => {
                const from = report.visit_date_from || report.visit_date;
                const to   = report.visit_date_to;
                const fmt  = d => new Date(d + "T00:00:00").toLocaleDateString("en-EN", { day: "2-digit", month: "long", year: "numeric" });
                return to && to !== from ? `${fmt(from)} — ${fmt(to)}` : fmt(from);
              })()}
            </span>
          )}
          {reportImages.length > 0 && (
            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
              <Camera className="w-3 h-3" /> {reportImages.length} photo{reportImages.length > 1 ? "s" : ""}
            </span>
          )}
          {/* PDF Settings badges */}
          <span className="text-xs bg-[#EEF3FB] text-[#0B3D91] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
            <Globe className="w-3 h-3" />
            {pdfLang === "en" ? "🇬🇧 EN" : "🇮🇩 ID"}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1
            ${inclSig ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
            {inclSig ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
            {inclSig ? "Dual Sign" : "Reported By"}
          </span>
        </div>

        {!editMode && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setDeleteDialog(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-red-500 border border-red-200 rounded-xl text-xs font-semibold hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Delete</span>
            </button>
            <button
              onClick={previewPDF}
              disabled={previewLoading}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold hover:bg-blue-100 transition-colors disabled:opacity-60"
            >
              {previewLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{previewLoading ? "Loading…" : "Preview"}</span>
            </button>
            <button
              onClick={downloadPDF}
              disabled={pdfLoading}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#0B3D91] text-white rounded-xl text-xs font-semibold hover:bg-[#1E5CC6] transition-colors disabled:opacity-60"
            >
              {pdfLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>{pdfLoading ? "Generating…" : "PDF"}</span>
            </button>
            <button
              onClick={openEdit}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          </div>
        )}
      </div>

      {/* ── EDIT MODE ─────────────────────────────────────────── */}
      {editMode && (
        <div className="space-y-4 mb-4">

          {/* PDF Settings */}
          <div className="bg-gradient-to-br from-[#0B3D91]/5 to-[#1E5CC6]/5 rounded-2xl border border-[#0B3D91]/15 shadow-sm p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-[#0B3D91] rounded-lg flex items-center justify-center flex-shrink-0">
                  <Settings2 className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0B3D91]">PDF Report Settings</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">Language and signature preferences for the generated PDF</p>
                </div>
              </div>
              <button onClick={() => setEditMode(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Language */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="w-3.5 h-3.5 text-[#0B3D91]" />
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Report Language</p>
              </div>
              <div className="flex gap-3">
                <LangCard value="en" selected={form.pdf_language === "en"}
                  onClick={v => setForm(f => ({ ...f, pdf_language: v }))}
                  flag="🇬🇧" label="English" sublabel="All labels in English" />
                <LangCard value="id" selected={form.pdf_language === "id"}
                  onClick={v => setForm(f => ({ ...f, pdf_language: v }))}
                  flag="🇮🇩" label="Bahasa Indonesia" sublabel="Semua label dalam Bahasa" />
              </div>
            </div>

            <div className="border-t border-[#0B3D91]/10 mb-5" />

            {/* Signature option */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <PenLine className="w-3.5 h-3.5 text-[#0B3D91]" />
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Customer Signature on PDF</p>
              </div>
              <div className="flex gap-3">
                <SigOptionCard value={true} selected={form.include_customer_signature === true}
                  onClick={v => setForm(f => ({ ...f, include_customer_signature: v }))}
                  icon={UserCheck} label="Include Signature" sublabel="Two signature boxes: Engineer + Customer" />
                <SigOptionCard value={false} selected={form.include_customer_signature === false}
                  onClick={v => setForm(f => ({ ...f, include_customer_signature: v }))}
                  icon={UserX} label="Reported By Only" sublabel="Elegant 'Reported by' section, engineer only" />
              </div>
              <div className={`mt-3 rounded-xl px-4 py-3 flex items-start gap-2.5 transition-all
                ${form.include_customer_signature
                  ? "bg-blue-50 border border-blue-100"
                  : "bg-amber-50 border border-amber-100"}`}>
                <Info className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${form.include_customer_signature ? "text-blue-500" : "text-amber-500"}`} />
                <p className={`text-xs leading-relaxed ${form.include_customer_signature ? "text-blue-700" : "text-amber-700"}`}>
                  {form.include_customer_signature
                    ? <><strong>With customer signature:</strong> The PDF will show two signature boxes — Engineer on the left, Customer/Client on the right.</>
                    : <><strong>Reported by only:</strong> The PDF will display an elegant <em>"Reported by"</em> section with the engineer's name, position, and signature — no customer signature box.</>
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Report Info */}
          <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-4 bg-amber-400 rounded-full" />
                <Pencil className="w-3.5 h-3.5" /> Edit Mode — Report Information
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className={labelClass}>Report Number</label>
                <input value={form.report_number} readOnly
                  className={inputClass + " bg-gray-50 text-gray-500 cursor-not-allowed font-mono"} />
              </div>
              <div>
                <label className={labelClass}>Visit Start Date <span className="text-red-400">*</span></label>
                <input type="date" value={form.visit_date_from}
                  onChange={e => setForm({ ...form, visit_date_from: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Visit End Date <span className="text-gray-400 font-normal normal-case">(optional)</span></label>
                <input type="date" value={form.visit_date_to} min={form.visit_date_from}
                  onChange={e => setForm({ ...form, visit_date_to: e.target.value })} className={inputClass} />
              </div>
              {form.visit_date_from && form.visit_date_to && form.visit_date_to !== form.visit_date_from && (
                <div className="sm:col-span-2 bg-blue-50 rounded-xl px-4 py-2.5 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-[#0B3D91] flex-shrink-0" />
                  <span className="text-xs text-[#0B3D91] font-semibold">
                    {new Date(form.visit_date_from + "T00:00:00").toLocaleDateString("en-EN", { day: "2-digit", month: "long", year: "numeric" })}
                    {" — "}
                    {new Date(form.visit_date_to + "T00:00:00").toLocaleDateString("en-EN", { day: "2-digit", month: "long", year: "numeric" })}
                  </span>
                </div>
              )}
              <div>
                <label className={labelClass}>Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className={inputClass}>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Engineer</label>
                <select value={form.engineer_id} onChange={e => setForm({ ...form, engineer_id: e.target.value })} className={inputClass}>
                  <option value="">— Select Engineer —</option>
                  {engineers.map(e => <option key={e.id} value={e.id}>{e.name}{e.position ? ` — ${e.position}` : ""}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Client */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h4 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3 flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5" /> Client Data
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Company <span className="text-red-400">*</span></label>
                <input value={form.client_company} onChange={e => setForm({ ...form, client_company: e.target.value })} className={inputClass} placeholder="Company name" />
              </div>
              <div>
                <label className={labelClass}>Contact Person</label>
                <input value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} className={inputClass} placeholder="PIC name" />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Location/Site</label>
                <input value={form.site_location} onChange={e => setForm({ ...form, site_location: e.target.value })} className={inputClass} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Address</label>
                <input value={form.client_address} onChange={e => setForm({ ...form, client_address: e.target.value })} className={inputClass} />
              </div>
            </div>
          </div>

          {/* Equipment */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider flex items-center gap-2">
                <Wrench className="w-3.5 h-3.5" /> Equipment/Instrument Data
              </h4>
              <button onClick={addEquipment}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#EEF3FB] text-[#0B3D91] rounded-lg text-xs font-semibold hover:bg-[#dbe8f8]">
                <Plus className="w-3.5 h-3.5" /> Add Equipment
              </button>
            </div>
            <div className="space-y-3">
              {(form.equipment_items || []).map((item, idx) => (
                <EquipmentEditItem key={idx} item={item} index={idx}
                  onChange={handleEquipmentChange} onRemove={removeEquipment}
                  canRemove={(form.equipment_items || []).length > 1} />
              ))}
            </div>
          </div>

          {/* Job Details */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h4 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3 flex items-center gap-2">
              <ClipboardList className="w-3.5 h-3.5" /> Job Details
            </h4>
            <label className={labelClass}>Job Description</label>
            <RichTextEditor value={form.job_description} onChange={v => setForm(f => ({ ...f, job_description: v }))} />
          </div>

          {/* Customer Signature (only if include_customer_signature) */}
          {form.include_customer_signature && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h4 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3 flex items-center gap-2">
                <PenLine className="w-3.5 h-3.5" /> Customer Signature
              </h4>
              <SignaturePad label="Customer Signature" value={form.customer_signature}
                onChange={v => setForm({ ...form, customer_signature: v })} />
            </div>
          )}

          {/* Reported By preview (when no customer sig) */}
          {!form.include_customer_signature && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h4 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3 flex items-center gap-2">
                <User className="w-3.5 h-3.5" /> Reported By Preview
              </h4>
              <div className="bg-gradient-to-br from-[#0B3D91]/5 to-[#1E5CC6]/5 border border-[#0B3D91]/15 rounded-xl p-5 flex items-center gap-4">
                <div className="w-12 h-12 bg-[#0B3D91] rounded-xl flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-bold mb-1">Reported by</p>
                  {form.engineer_id ? (
                    <>
                      <p className="text-sm font-bold text-gray-800">
                        {engineers.find(e => String(e.id) === String(form.engineer_id))?.name || "—"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {engineers.find(e => String(e.id) === String(form.engineer_id))?.position || ""}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No engineer selected</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={() => setEditMode(false)}
              className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 flex items-center gap-2">
              <X className="w-4 h-4" /> Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="px-6 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-bold hover:bg-[#1E5CC6] disabled:opacity-60 flex items-center gap-2">
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                : <><Check className="w-4 h-4" /> Save Changes</>}
            </button>
          </div>
        </div>
      )}

      {/* ── VIEW MODE ──────────────────────────────────────────── */}
      {!editMode && (
        <>
          {/* PDF Settings summary card */}
          <div className="bg-gradient-to-br from-[#0B3D91]/4 to-[#1E5CC6]/4 rounded-2xl border border-[#0B3D91]/12 p-4 mb-4 flex items-center gap-4 flex-wrap">
            <div className="w-8 h-8 bg-[#0B3D91] rounded-lg flex items-center justify-center flex-shrink-0">
              <Settings2 className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[#0B3D91] uppercase tracking-wide">PDF Settings</p>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="text-xs text-gray-600 flex items-center gap-1">
                  <Globe className="w-3 h-3 text-[#0B3D91]" />
                  Language: <strong className="ml-1">{pdfLang === "en" ? "🇬🇧 English" : "🇮🇩 Bahasa Indonesia"}</strong>
                </span>
                <span className="text-xs text-gray-300">·</span>
                <span className="text-xs text-gray-600 flex items-center gap-1">
                  {inclSig
                    ? <><UserCheck className="w-3 h-3 text-emerald-600" /> Signature: <strong className="ml-1 text-emerald-700">Engineer + Customer</strong></>
                    : <><UserX className="w-3 h-3 text-amber-600" /> Signature: <strong className="ml-1 text-amber-700">Reported By (Engineer Only)</strong></>
                  }
                </span>
              </div>
            </div>
            <button onClick={openEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#0B3D91]/20 rounded-lg text-xs font-semibold text-[#0B3D91] hover:bg-[#EEF3FB] transition-colors">
              <Pencil className="w-3 h-3" /> Change
            </button>
          </div>

          {/* Info cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3 flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5" /> Client Data
              </h3>
              <InfoRow label="Company"        value={report.client_company} />
              <InfoRow label="Contact Person" value={report.contact_person || report.client_name} />
              <InfoRow label="Phone"          value={report.contact_phone} />
              <InfoRow label="Location/Site"  value={report.site_location} />
              <InfoRow label="Address"        value={report.client_address} />
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3 flex items-center gap-2">
                <Wrench className="w-3.5 h-3.5" /> Equipment/Instrument Data
              </h3>
              {equipmentItems.map((item, idx) => (
                <EquipmentCard key={idx} item={item} index={idx} />
              ))}
              {report.engineer_name && (
                <div className="mt-3 pt-3 border-t border-gray-50">
                  <InfoRow label="Engineer" value={report.engineer_name} />
                </div>
              )}
            </div>
          </div>

          {/* Job Description */}
          {report.job_description && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
              <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3 flex items-center gap-2">
                <ClipboardList className="w-3.5 h-3.5" /> Job Details
              </h3>
              <div
                className="text-sm text-gray-700 leading-relaxed"
                style={{ lineHeight: "1.7" }}
                dangerouslySetInnerHTML={{ __html: report.job_description }}
              />
            </div>
          )}

          {/* Photos */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-4 bg-[#0B3D91] rounded-full" />
                <ImageIcon className="w-3.5 h-3.5" /> Documentation & Photos
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                  <ZapIcon className="w-2.5 h-2.5" /> Auto-compressed
                </span>
                {reportImages.length > 0 && (
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                    <Camera className="w-3 h-3" /> {reportImages.length} photo{reportImages.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>

            {reportImages.length > 0 && (
              <div className="mb-4 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  Hover over a photo for <strong>edit caption</strong> or <strong>delete</strong>. Captions will appear in the PDF.
                </p>
              </div>
            )}

            <div
              onDragOver={e => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={e => { e.preventDefault(); setDragActive(false); handleFiles(e.dataTransfer.files); }}
              onClick={() => !compressing && !uploading && document.getElementById("onsiteFileInput").click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all mb-4
                ${dragActive ? "border-[#0B3D91] bg-blue-50" : "border-gray-200 hover:border-[#0B3D91] hover:bg-blue-50"}`}
            >
              {compressing && compressItems.length > 0 ? (
                <div className="px-2 py-1">
                  <CompressionStatus items={compressItems} />
                </div>
              ) : uploading ? (
                <div className="flex items-center justify-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-[#0B3D91]" />
                  <p className="text-gray-500 text-sm">Uploading…</p>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-600 font-medium text-sm">Drop photos here or click to upload</p>
                  <p className="text-gray-400 text-xs mt-0.5">PNG, JPG, JPEG · Auto-compressed before upload</p>
                  <p className="text-[10px] text-emerald-500 font-medium mt-1.5 flex items-center justify-center gap-1">
                    <ZapIcon className="w-3 h-3" /> Images are automatically compressed — photos will appear in the PDF
                  </p>
                </>
              )}
            </div>

            <input id="onsiteFileInput" type="file" multiple accept="image/*" className="hidden"
              onChange={e => handleFiles(e.target.files)} />

            {reportImages.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {reportImages.map(img => (
                  <ImageCard key={img.id} img={img} onDelete={deleteImage} onCaptionSave={saveCaption} />
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-300 text-sm py-4 flex items-center justify-center gap-2">
                <Camera className="w-4 h-4" /> No photos yet — upload to include them in the PDF
              </p>
            )}
          </div>

          {/* Signatures section */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
            <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-4 flex items-center gap-2">
              <PenLine className="w-3.5 h-3.5" />
              {inclSig ? "Signatures" : "Reported By"}
            </h3>

            {inclSig ? (
              /* Dual signature view */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="text-center">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Engineer</p>
                  {report.engineer_signature ? (
                    <div className="border border-gray-200 rounded-xl bg-gray-50 p-3">
                      <img src={report.engineer_signature} alt="Engineer Signature" className="h-16 mx-auto object-contain" />
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-200 rounded-xl py-6 text-gray-300 flex flex-col items-center gap-1">
                      <PenLine className="w-5 h-5" />
                      <span className="text-xs">No signature yet</span>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-2 font-semibold">{report.engineer_name || "—"}</p>
                  {report.engineer_position && <p className="text-xs text-gray-400">{report.engineer_position}</p>}
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Customer</p>
                  {report.customer_signature ? (
                    <div className="border border-gray-200 rounded-xl bg-gray-50 p-3">
                      <img src={report.customer_signature} alt="Customer Signature" className="h-16 mx-auto object-contain" />
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-200 rounded-xl py-6 text-center flex flex-col items-center gap-1">
                      <PenLine className="w-5 h-5 text-gray-300" />
                      <p className="text-gray-300 text-xs">No signature yet</p>
                      <button onClick={openEdit} className="mt-1 text-xs text-[#0B3D91] hover:underline flex items-center gap-1">
                        <Plus className="w-3 h-3" /> Add Signature
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-2 font-semibold">{report.client_name || "Customer"}</p>
                  {report.client_company && <p className="text-xs text-gray-400">{report.client_company}</p>}
                </div>
              </div>
            ) : (
              /* Reported By view */
              <div className="flex items-center gap-5 p-2">
                <div className="w-16 h-16 bg-gradient-to-br from-[#0B3D91] to-[#1E5CC6] rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-200">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Reported by</p>
                  <p className="text-lg font-black text-gray-900 leading-tight">{report.engineer_name || "—"}</p>
                  {report.engineer_position && (
                    <p className="text-sm text-[#0B3D91] font-semibold mt-0.5">{report.engineer_position}</p>
                  )}
                  {report.engineer_signature && (
                    <div className="mt-3">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Signature</p>
                      <img src={report.engineer_signature} alt="Engineer Signature" className="h-12 object-contain" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Bottom action bar */}
      {!editMode && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 justify-between items-center">
          <button onClick={() => setDeleteDialog(true)}
            className="flex items-center gap-2 px-4 py-2 text-red-500 border border-red-200 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors">
            <Trash2 className="w-4 h-4" /> Delete Report
          </button>
          <div className="flex gap-2">
            <button onClick={previewPDF} disabled={previewLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-sm font-semibold hover:bg-blue-100 transition-colors disabled:opacity-60">
              {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
              {previewLoading ? "Loading…" : "Preview PDF"}
            </button>
            <button onClick={downloadPDF} disabled={pdfLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-semibold hover:bg-[#1E5CC6] transition-colors disabled:opacity-60">
              {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {pdfLoading ? "Generating…" : "Download PDF"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}