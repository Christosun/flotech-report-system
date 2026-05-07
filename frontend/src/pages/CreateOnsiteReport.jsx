import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  FileText,
  Building2,
  User,
  Wrench,
  ClipboardList,
  PenLine,
  Plus,
  X,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Image,
  Rocket,
  Loader2,
  Calendar,
  Info,
  Trash2,
  CheckCircle2,
  Globe,
  UserCheck,
  UserX,
  Settings2,
} from "lucide-react";

/* ─── Signature Pad ────────────────────────────────────────── */
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

  const startDraw = (e) => {
    e.preventDefault();
    setDrawing(true);
    setHasDrawn(true);
    lastPos.current = getPos(e, canvasRef.current);
  };
  const draw = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#0B3D91";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastPos.current = pos;
  };
  const endDraw = () => setDrawing(false);
  const clearPad = () => {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };
  const saveSig = () => {
    if (!hasDrawn) {
      toast.error("Make a signature first");
      return;
    }
    onChange(canvasRef.current.toDataURL("image/png"));
    setShowPad(false);
    toast.success("Signature saved");
  };

  return (
    <div>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{label}</p>
      {value ? (
        <div className="border border-gray-200 rounded-xl bg-gray-50 p-3 relative">
          <img src={value} alt="Signature" className="h-16 mx-auto object-contain" />
          <button
            onClick={() => { onChange(""); setHasDrawn(false); }}
            className="absolute top-2 right-2 flex items-center gap-1 text-xs text-red-500 hover:underline"
          >
            <Trash2 size={12} />
            Remove
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowPad(true)}
          className="w-full border-2 border-dashed border-gray-200 rounded-xl py-5 text-gray-400 text-sm hover:border-[#0B3D91] hover:text-[#0B3D91] transition-colors flex items-center justify-center gap-2"
        >
          <PenLine size={16} />
          Add Signature
        </button>
      )}
      {showPad && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-gray-800 text-sm">{label}</p>
              <button onClick={() => setShowPad(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <canvas
              ref={canvasRef}
              width={320}
              height={150}
              className="border border-gray-200 rounded-xl w-full touch-none cursor-crosshair bg-gray-50"
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
            />
            <div className="flex gap-2 mt-3">
              <button onClick={clearPad} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                Repeat
              </button>
              <button onClick={saveSig} className="flex-1 py-2 bg-[#0B3D91] text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5">
                <CheckCircle2 size={14} />
                Save
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
    if (editorRef.current && value !== undefined && !isUpdatingRef.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || "";
      }
    }
  }, []);

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
    spans?.forEach((s) => {
      s.removeAttribute("size");
      s.style.fontSize = size;
    });
  };

  const handleFontColor = (color) => {
    setFontColor(color);
    exec("foreColor", color);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = `<img src="${ev.target.result}" style="max-width:100%;width:300px;cursor:pointer;" class="rich-img" />`;
      exec("insertHTML", img);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleEditorClick = (e) => {
    if (e.target.tagName === "IMG") {
      const img = e.target;
      const w = prompt("Image width (px):", img.style.width || img.width || "300");
      if (w) img.style.width = isNaN(w) ? w : w + "px";
      handleInput();
    }
  };

  const ToolBtn = ({ cmd, val, title, children }) => (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); exec(cmd, val); }}
      className="p-1.5 hover:bg-gray-100 rounded transition-colors text-gray-600"
    >
      {children}
    </button>
  );

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-gray-50 border-b border-gray-200">
        <select
          value={fontSize}
          onChange={(e) => handleFontSize(e.target.value)}
          className="text-xs border border-gray-200 rounded px-1.5 py-1 mr-1 bg-white"
        >
          {["10px", "12px", "13px", "14px", "16px", "18px", "20px", "24px"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <ToolBtn cmd="bold" title="Bold"><Bold size={14} /></ToolBtn>
        <ToolBtn cmd="italic" title="Italic"><Italic size={14} /></ToolBtn>
        <ToolBtn cmd="underline" title="Underline"><Underline size={14} /></ToolBtn>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <ToolBtn cmd="insertOrderedList" title="Numbered List"><ListOrdered size={14} /></ToolBtn>
        <ToolBtn cmd="insertUnorderedList" title="Bullet List"><List size={14} /></ToolBtn>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <ToolBtn cmd="justifyLeft" title="Align Left"><AlignLeft size={14} /></ToolBtn>
        <ToolBtn cmd="justifyCenter" title="Center"><AlignCenter size={14} /></ToolBtn>
        <ToolBtn cmd="justifyRight" title="Align Right"><AlignRight size={14} /></ToolBtn>
        <ToolBtn cmd="justifyFull" title="Justify"><AlignJustify size={14} /></ToolBtn>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <label
          title="Font Color"
          className="flex items-center gap-1 px-1.5 py-1.5 hover:bg-gray-100 rounded cursor-pointer"
        >
          <span className="text-sm font-bold" style={{ color: fontColor }}>A</span>
          <input
            type="color"
            value={fontColor}
            onChange={(e) => handleFontColor(e.target.value)}
            className="w-4 h-4 cursor-pointer border-0 p-0 bg-transparent"
          />
        </label>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <button
          type="button"
          title="Insert Image"
          onClick={() => fileInputRef.current?.click()}
          className="p-1.5 hover:bg-gray-100 rounded transition-colors text-gray-600"
        >
          <Image size={14} />
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onClick={handleEditorClick}
        className="rich-editor min-h-[200px] p-4 text-sm text-gray-700 focus:outline-none"
        style={{ lineHeight: "1.6" }}
        data-placeholder="Write a job description here... Use the toolbar above to format text, add lists, colors, or images."
      />
      <style>{`
        .rich-editor:empty:before { content: attr(data-placeholder); color: #9CA3AF; pointer-events: none; }
        .rich-editor ul { list-style-type: disc; padding-left: 1.5rem; margin: 0.25rem 0; }
        .rich-editor ol { list-style-type: decimal; padding-left: 1.5rem; margin: 0.25rem 0; }
        .rich-editor li { margin: 0.1rem 0; }
        .rich-editor p { margin: 0.2rem 0; }
      `}</style>
    </div>
  );
}

/* ─── Equipment Item ─────────────────────────────────────────── */
function EquipmentItem({ item, index, onChange, onRemove, canRemove }) {
  const inputCls =
    "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white transition-all";
  const labelCls = "block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5";
  return (
    <div className="border border-gray-100 rounded-xl p-4 bg-gray-50 relative">
      {canRemove && (
        <button
          onClick={() => onRemove(index)}
          className="absolute top-3 right-3 text-red-400 hover:text-red-600 transition-colors"
          title="Remove equipment"
        >
          <X size={16} />
        </button>
      )}
      <p className="text-xs font-bold text-[#0B3D91] uppercase tracking-wide mb-3">
        Equipment/Instrument {index + 1}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Equipment/Instrument Information</label>
          <input
            value={item.description}
            onChange={(e) => onChange(index, "description", e.target.value)}
            placeholder="Name/type, example: Flow Transmitter"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Model / Type</label>
          <input
            value={item.model}
            onChange={(e) => onChange(index, "model", e.target.value)}
            placeholder="Example: TUF333i, EFS808"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Serial Number</label>
          <input
            value={item.serial_number}
            onChange={(e) => onChange(index, "serial_number", e.target.value)}
            placeholder="Example: 20240001"
            className={inputCls}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Section Header ─────────────────────────────────────────── */
function SectionHeader({ number, icon: Icon, title }) {
  return (
    <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-4 flex items-center gap-2">
      <span className="w-5 h-5 bg-[#0B3D91] text-white rounded-full flex items-center justify-center text-xs font-black flex-shrink-0">
        {number}
      </span>
      {Icon && <Icon size={14} className="text-[#0B3D91]" />}
      {title}
    </h3>
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
function SigOptionCard({ value, selected, onClick, icon: Icon, label, sublabel, colorClass }) {
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={`flex-1 relative flex flex-col items-center gap-2 px-4 py-4 rounded-xl border-2 transition-all duration-200 cursor-pointer
        ${selected
          ? `border-[#0B3D91] bg-[#EEF3FB] shadow-md`
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

/* ─── EMPTY FORM ─────────────────────────────────────────────── */
const EMPTY_FORM = {
  report_number: "",
  visit_date_from: new Date().toISOString().split("T")[0],
  visit_date_to: "",
  client_company: "",
  client_address: "",
  site_location: "",
  contact_person: "",
  contact_phone: "",
  engineer_id: "",
  job_description: "",
  equipment_items: [{ description: "", model: "", serial_number: "" }],
  customer_signature: "",
  pdf_language: "en",
  include_customer_signature: true,
};

/* ─── MAIN COMPONENT ─────────────────────────────────────────── */
export default function CreateOnsiteReport() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [engineers, setEngineers] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    API.get("/engineer/")
      .then((r) => setEngineers(r.data))
      .catch(() => {});
    generateReportNumber();
  }, []);

  const generateReportNumber = async () => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    try {
      const res = await API.get("/onsite/list");
      const reports = res.data || [];
      const prefix = `OSR-${dateStr}-`;
      const sameDay = reports
        .map((r) => r.report_number || "")
        .filter((n) => n.startsWith(prefix))
        .map((n) => parseInt(n.replace(prefix, ""), 10))
        .filter((n) => !isNaN(n));
      const nextNum = sameDay.length > 0 ? Math.max(...sameDay) + 1 : 1;
      const reportNumber = `${prefix}${String(nextNum).padStart(3, "0")}`;
      setForm((f) => ({ ...f, report_number: reportNumber }));
    } catch {
      const reportNumber = `OSR-${dateStr}-001`;
      setForm((f) => ({ ...f, report_number: reportNumber }));
    }
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleEquipmentChange = (index, field, value) => {
    setForm((f) => {
      const items = [...f.equipment_items];
      items[index] = { ...items[index], [field]: value };
      return { ...f, equipment_items: items };
    });
  };
  const addEquipment = () =>
    setForm((f) => ({
      ...f,
      equipment_items: [...f.equipment_items, { description: "", model: "", serial_number: "" }],
    }));
  const removeEquipment = (index) =>
    setForm((f) => ({
      ...f,
      equipment_items: f.equipment_items.filter((_, i) => i !== index),
    }));

  const handleSubmit = async () => {
    if (!form.client_company) { toast.error("Company name is mandatory"); return; }
    if (!form.report_number) { toast.error("The report number is mandatory"); return; }
    if (!form.visit_date_from) { toast.error("Visit start date is required"); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        client_name: form.contact_person || form.client_company,
        visit_date: form.visit_date_from,
        equipment_items: form.equipment_items,
        equipment_tag: form.equipment_items[0]?.description || "",
        equipment_model: form.equipment_items[0]?.model || "",
        serial_number: form.equipment_items[0]?.serial_number || "",
      };
      const res = await API.post("/onsite/create", payload);
      toast.success("Onsite Report successfully created!");
      navigate(`/onsite/${res.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to make report");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white transition-all";
  const labelClass = "block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5";

  return (
    <div className="w-full">
      {/* Back button */}
      <button
        onClick={() => navigate("/onsite")}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-[#0B3D91] mb-5 transition-colors"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Create an Onsite Report</h1>
        <p className="text-gray-400 text-sm mt-1">Fill out the field visit report form</p>
      </div>

      <div className="space-y-4">

        {/* ── PDF Settings (Language + Signature) ─────────────── */}
        <div className="bg-gradient-to-br from-[#0B3D91]/5 to-[#1E5CC6]/5 rounded-2xl border border-[#0B3D91]/15 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 bg-[#0B3D91] rounded-lg flex items-center justify-center flex-shrink-0">
              <Settings2 size={14} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0B3D91]">PDF Report Settings</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">Configure language and signature preferences for the generated PDF</p>
            </div>
          </div>

          {/* Language */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <Globe size={13} className="text-[#0B3D91]" />
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Report Language</p>
            </div>
            <div className="flex gap-3">
              <LangCard
                value="en"
                selected={form.pdf_language === "en"}
                onClick={(v) => set("pdf_language", v)}
                flag="🇬🇧"
                label="English"
                sublabel="All labels in English"
              />
              <LangCard
                value="id"
                selected={form.pdf_language === "id"}
                onClick={(v) => set("pdf_language", v)}
                flag="🇮🇩"
                label="Bahasa Indonesia"
                sublabel="Semua label dalam Bahasa"
              />
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[#0B3D91]/10 mb-5" />

          {/* Customer Signature */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <PenLine size={13} className="text-[#0B3D91]" />
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Customer Signature on PDF</p>
            </div>
            <div className="flex gap-3">
              <SigOptionCard
                value={true}
                selected={form.include_customer_signature === true}
                onClick={(v) => set("include_customer_signature", v)}
                icon={UserCheck}
                label="Include Signature"
                sublabel="Two signature boxes: Engineer + Customer"
              />
              <SigOptionCard
                value={false}
                selected={form.include_customer_signature === false}
                onClick={(v) => set("include_customer_signature", v)}
                icon={UserX}
                label="Reported By Only"
                sublabel="Elegant 'Reported by' section, engineer only"
              />
            </div>

            {/* Preview hint */}
            <div className={`mt-3 rounded-xl px-4 py-3 flex items-start gap-2.5 transition-all
              ${form.include_customer_signature
                ? "bg-blue-50 border border-blue-100"
                : "bg-amber-50 border border-amber-100"}`}>
              <Info size={14} className={`flex-shrink-0 mt-0.5 ${form.include_customer_signature ? "text-blue-500" : "text-amber-500"}`} />
              <p className={`text-xs leading-relaxed ${form.include_customer_signature ? "text-blue-700" : "text-amber-700"}`}>
                {form.include_customer_signature
                  ? <><strong>With customer signature:</strong> The PDF will show two signature boxes — Engineer on the left, Customer/Client on the right. Signature captured below will appear in the PDF.</>
                  : <><strong>Reported by only:</strong> The PDF will display an elegant <em>"Reported by"</em> section with the engineer's name, position, and signature — no customer signature box.</>
                }
              </p>
            </div>
          </div>
        </div>

        {/* 1 — Report Info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <SectionHeader number="1" icon={FileText} title="Report Information" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className={labelClass}>Report Number</label>
              <input
                value={form.report_number}
                readOnly
                className={inputClass + " bg-gray-50 text-gray-500 cursor-not-allowed font-mono"}
              />
              <p className="text-xs text-gray-400 mt-1">Automatic number, cannot be changed</p>
            </div>
            <div>
              <label className={labelClass}>
                Visitation Start Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={form.visit_date_from}
                onChange={(e) => set("visit_date_from", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                Visit End Date{" "}
                <span className="text-gray-400 font-normal normal-case">(optional)</span>
              </label>
              <input
                type="date"
                value={form.visit_date_to}
                min={form.visit_date_from}
                onChange={(e) => set("visit_date_to", e.target.value)}
                className={inputClass}
              />
              <p className="text-xs text-gray-400 mt-1">Leave blank if only 1 day</p>
            </div>
          </div>
          {form.visit_date_from &&
            form.visit_date_to &&
            form.visit_date_to !== form.visit_date_from && (
              <div className="mt-3 bg-blue-50 rounded-xl px-4 py-2.5 flex items-center gap-2">
                <Calendar size={14} className="text-[#0B3D91] flex-shrink-0" />
                <span className="text-xs text-[#0B3D91] font-semibold">
                  Visit:{" "}
                  {new Date(form.visit_date_from + "T00:00:00").toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                  {" — "}
                  {new Date(form.visit_date_to + "T00:00:00").toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}
        </div>

        {/* 2 — Client Info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <SectionHeader number="2" icon={Building2} title="Client Information" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>
                Company <span className="text-red-400">*</span>
              </label>
              <input
                value={form.client_company}
                onChange={(e) => set("client_company", e.target.value)}
                placeholder="Name of company/agency"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Contact Person</label>
              <input
                value={form.contact_person}
                onChange={(e) => set("contact_person", e.target.value)}
                placeholder="PIC name/contact"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input
                value={form.contact_phone}
                onChange={(e) => set("contact_phone", e.target.value)}
                placeholder="+62..."
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Location/Site</label>
              <input
                value={form.site_location}
                onChange={(e) => set("site_location", e.target.value)}
                placeholder="Job site location"
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Address</label>
              <input
                value={form.client_address}
                onChange={(e) => set("client_address", e.target.value)}
                placeholder="Complete address"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* 3 — Engineer */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <SectionHeader number="3" icon={User} title="Engineer" />
          <div>
            <label className={labelClass}>Select Engineer</label>
            <select
              value={form.engineer_id}
              onChange={(e) => set("engineer_id", e.target.value)}
              className={inputClass}
            >
              <option value="">— Select Engineer —</option>
              {engineers.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} {e.position ? `— ${e.position}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 4 — Equipment */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 bg-[#0B3D91] text-white rounded-full flex items-center justify-center text-xs font-black flex-shrink-0">
                4
              </span>
              <Wrench size={14} className="text-[#0B3D91]" />
              Equipment/Instrument Data
            </h3>
            <button
              onClick={addEquipment}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#EEF3FB] text-[#0B3D91] rounded-lg text-xs font-semibold hover:bg-[#dbe8f8] transition-colors"
            >
              <Plus size={13} />
              Add Equipment/Instrument
            </button>
          </div>
          <div className="space-y-3">
            {form.equipment_items.map((item, idx) => (
              <EquipmentItem
                key={idx}
                item={item}
                index={idx}
                onChange={handleEquipmentChange}
                onRemove={removeEquipment}
                canRemove={form.equipment_items.length > 1}
              />
            ))}
          </div>
        </div>

        {/* 5 — Job Details */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <SectionHeader number="5" icon={ClipboardList} title="Job Details" />
          <div>
            <label className={labelClass}>Job description</label>
            <RichTextEditor
              value={form.job_description}
              onChange={(v) => set("job_description", v)}
            />
            <p className="text-xs text-gray-400 mt-1.5">
              Use the toolbar to format text, add lists, font colors, or images.
            </p>
          </div>
        </div>

        {/* 6 — Signature (only shown if include_customer_signature = true) */}
        {form.include_customer_signature && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <SectionHeader number="6" icon={PenLine} title="Customer Signature" />
            <SignaturePad
              label="Customer/client representative signature (optional)"
              value={form.customer_signature}
              onChange={(v) => set("customer_signature", v)}
            />
            <div className="mt-3 bg-blue-50 rounded-xl px-4 py-3 flex items-start gap-2">
              <Info size={14} className="text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-700">
                <strong>Engineer signature</strong> is taken automatically from the data registered in
                the Engineers menu.
              </p>
            </div>
          </div>
        )}

        {/* 6/7 — Reported By preview (only if include_customer_signature = false) */}
        {!form.include_customer_signature && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <SectionHeader number="6" icon={PenLine} title="Reported By" />
            <div className="bg-gradient-to-br from-[#0B3D91]/5 to-[#1E5CC6]/5 border border-[#0B3D91]/15 rounded-xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 bg-[#0B3D91] rounded-xl flex items-center justify-center flex-shrink-0">
                <User size={22} className="text-white" />
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
                  <p className="text-sm text-gray-400 italic">Select an engineer above to preview</p>
                )}
              </div>
            </div>
            <div className="mt-3 bg-amber-50 rounded-xl px-4 py-3 flex items-start gap-2">
              <Info size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700">
                The PDF will show an elegant <strong>"Reported by"</strong> section with the engineer's name,
                position, and signature — no customer signature box will appear.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={() => navigate("/onsite")}
          className="px-5 py-3 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex-1 py-3 bg-[#0B3D91] text-white rounded-xl text-sm font-bold hover:bg-[#1E5CC6] disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm transition-colors"
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Rocket size={16} />
              Create an Onsite Report
            </>
          )}
        </button>
      </div>
    </div>
  );
}