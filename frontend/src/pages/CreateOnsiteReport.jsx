import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import toast from "react-hot-toast";

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
  const clearPad = () => { const canvas = canvasRef.current; canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height); setHasDrawn(false); };
  const saveSig = () => {
    if (!hasDrawn) { toast.error("Buat tanda tangan terlebih dahulu"); return; }
    onChange(canvasRef.current.toDataURL("image/png")); setShowPad(false); toast.success("Tanda tangan disimpan ✅");
  };

  return (
    <div>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{label}</p>
      {value ? (
        <div className="border border-gray-200 rounded-xl bg-gray-50 p-3 relative">
          <img src={value} alt="Signature" className="h-16 mx-auto object-contain" />
          <button onClick={() => { onChange(""); setHasDrawn(false); }} className="absolute top-2 right-2 text-xs text-red-500 hover:underline">Hapus</button>
        </div>
      ) : (
        <button onClick={() => setShowPad(true)} className="w-full border-2 border-dashed border-gray-200 rounded-xl py-5 text-gray-400 text-sm hover:border-[#0B3D91] hover:text-[#0B3D91] transition-colors">
          + Tambah Tanda Tangan
        </button>
      )}
      {showPad && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-gray-800 text-sm">{label}</p>
              <button onClick={() => setShowPad(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <canvas ref={canvasRef} width={320} height={150} className="border border-gray-200 rounded-xl w-full touch-none cursor-crosshair bg-gray-50"
              onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
              onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
            <div className="flex gap-2 mt-3">
              <button onClick={clearPad} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Ulangi</button>
              <button onClick={saveSig} className="flex-1 py-2 bg-[#0B3D91] text-white rounded-xl text-sm font-semibold">Simpan</button>
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

  // Initialize content once
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
    spans?.forEach(s => { s.removeAttribute("size"); s.style.fontSize = size; });
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

  // Image resize on click inside editor
  const handleEditorClick = (e) => {
    if (e.target.tagName === "IMG") {
      const img = e.target;
      const w = prompt("Lebar gambar (px):", img.style.width || img.width || "300");
      if (w) img.style.width = isNaN(w) ? w : w + "px";
      handleInput();
    }
  };

  const ToolBtn = ({ cmd, val, title, children }) => (
    <button type="button" title={title}
      onMouseDown={e => { e.preventDefault(); exec(cmd, val); }}
      className="px-2 py-1.5 text-sm hover:bg-gray-100 rounded transition-colors text-gray-600 font-medium">
      {children}
    </button>
  );

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-gray-50 border-b border-gray-200">
        {/* Font size */}
        <select value={fontSize} onChange={e => handleFontSize(e.target.value)}
          className="text-xs border border-gray-200 rounded px-1.5 py-1 mr-1 bg-white">
          {["10px","12px","13px","14px","16px","18px","20px","24px"].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <ToolBtn cmd="bold" title="Bold"><b>B</b></ToolBtn>
        <ToolBtn cmd="italic" title="Italic"><i>I</i></ToolBtn>
        <ToolBtn cmd="underline" title="Underline"><u>U</u></ToolBtn>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <ToolBtn cmd="insertOrderedList" title="Numbered List">1.</ToolBtn>
        <ToolBtn cmd="insertUnorderedList" title="Bullet List">•</ToolBtn>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <ToolBtn cmd="justifyLeft" title="Align Left">⬅</ToolBtn>
        <ToolBtn cmd="justifyCenter" title="Center">↔</ToolBtn>
        <ToolBtn cmd="justifyRight" title="Align Right">➡</ToolBtn>
        <ToolBtn cmd="justifyFull" title="Justify">≡</ToolBtn>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        {/* Font color */}
        <label title="Warna Font" className="flex items-center gap-1 px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer">
          <span className="text-sm" style={{ color: fontColor }}>A</span>
          <input type="color" value={fontColor} onChange={e => handleFontColor(e.target.value)}
            className="w-4 h-4 cursor-pointer border-0 p-0 bg-transparent" />
        </label>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        {/* Image upload */}
        <button type="button" title="Insert Image" onClick={() => fileInputRef.current?.click()}
          className="px-2 py-1.5 text-sm hover:bg-gray-100 rounded transition-colors text-gray-600">
          🖼
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      </div>
      {/* Editor area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onClick={handleEditorClick}
        className="rich-editor min-h-[200px] p-4 text-sm text-gray-700 focus:outline-none"
        style={{ lineHeight: "1.6" }}
        data-placeholder="Tulis deskripsi pekerjaan di sini... Gunakan toolbar di atas untuk memformat teks, tambahkan daftar, warna, atau gambar."
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
  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white transition-all";
  const labelCls = "block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5";
  return (
    <div className="border border-gray-100 rounded-xl p-4 bg-gray-50 relative">
      {canRemove && (
        <button onClick={() => onRemove(index)}
          className="absolute top-3 right-3 text-red-400 hover:text-red-600 text-lg leading-none">×</button>
      )}
      <p className="text-xs font-bold text-[#0B3D91] uppercase tracking-wide mb-3">Alat {index + 1}</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Informasi Alat</label>
          <input value={item.description} onChange={e => onChange(index, "description", e.target.value)}
            placeholder="Nama / jenis alat, contoh: Flow Transmitter" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Model / Type</label>
          <input value={item.model} onChange={e => onChange(index, "model", e.target.value)}
            placeholder="Contoh: TUF333i, EFS808" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Serial Number</label>
          <input value={item.serial_number} onChange={e => onChange(index, "serial_number", e.target.value)}
            placeholder="Contoh: 20240001" className={inputCls} />
        </div>
      </div>
    </div>
  );
}

/* ─── EMPTY FORM ─────────────────────────────────────────────── */
const EMPTY_FORM = {
  report_number: "",
  visit_date_from: new Date().toISOString().split("T")[0],
  visit_date_to: "",
  client_company: "", client_address: "", site_location: "",
  contact_person: "", contact_phone: "",
  engineer_id: "",
  job_description: "",
  equipment_items: [{ description: "", model: "", serial_number: "" }],
  customer_signature: "",
};

/* ─── MAIN COMPONENT ─────────────────────────────────────────── */
export default function CreateOnsiteReport() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [engineers, setEngineers] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    API.get("/engineer/").then(r => setEngineers(r.data)).catch(() => {});
    // Auto generate report number: OSR-YYYYMMDD-NNN (sequential per day)
    generateReportNumber();
  }, []);

  const generateReportNumber = async () => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    try {
      const res = await API.get("/onsite/list");
      const reports = res.data || [];
      // Filter reports with same date prefix
      const prefix = `OSR-${dateStr}-`;
      const sameDay = reports
        .map(r => r.report_number || "")
        .filter(n => n.startsWith(prefix))
        .map(n => parseInt(n.replace(prefix, ""), 10))
        .filter(n => !isNaN(n));
      const nextNum = sameDay.length > 0 ? Math.max(...sameDay) + 1 : 1;
      const reportNumber = `${prefix}${String(nextNum).padStart(3, "0")}`;
      setForm(f => ({ ...f, report_number: reportNumber }));
    } catch {
      const reportNumber = `OSR-${dateStr}-001`;
      setForm(f => ({ ...f, report_number: reportNumber }));
    }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Equipment handlers
  const handleEquipmentChange = (index, field, value) => {
    setForm(f => {
      const items = [...f.equipment_items];
      items[index] = { ...items[index], [field]: value };
      return { ...f, equipment_items: items };
    });
  };
  const addEquipment = () => setForm(f => ({
    ...f, equipment_items: [...f.equipment_items, { description: "", model: "", serial_number: "" }]
  }));
  const removeEquipment = (index) => setForm(f => ({
    ...f, equipment_items: f.equipment_items.filter((_, i) => i !== index)
  }));

  const handleSubmit = async () => {
    if (!form.client_company) { toast.error("Nama perusahaan wajib diisi"); return; }
    if (!form.report_number) { toast.error("Nomor report wajib diisi"); return; }
    if (!form.visit_date_from) { toast.error("Tanggal mulai kunjungan wajib diisi"); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        // contact_person is also used as client_name for signatures & display
        client_name: form.contact_person || form.client_company,
        // backward compat: visit_date = start date
        visit_date: form.visit_date_from,
        equipment_items: form.equipment_items,
        equipment_tag: form.equipment_items[0]?.description || "",
        equipment_model: form.equipment_items[0]?.model || "",
        serial_number: form.equipment_items[0]?.serial_number || "",
      };
      const res = await API.post("/onsite/create", payload);
      toast.success("Onsite Report berhasil dibuat! 🚀");
      navigate(`/onsite/${res.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || "Gagal membuat report");
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white transition-all";
  const labelClass = "block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5";

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => navigate("/onsite")} className="flex items-center gap-2 text-sm text-gray-400 hover:text-[#0B3D91] mb-5 transition-colors">← Kembali</button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Buat Onsite Report</h1>
        <p className="text-gray-400 text-sm mt-1">Isi formulir laporan kunjungan lapangan</p>
      </div>

      <div className="space-y-4">
        {/* Report Info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-5 h-5 bg-[#0B3D91] text-white rounded-full flex items-center justify-center text-xs font-black">1</span>
            Informasi Report
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className={labelClass}>Nomor Report</label>
              <input
                value={form.report_number}
                readOnly
                className={inputClass + " bg-gray-50 text-gray-500 cursor-not-allowed font-mono"}
              />
              <p className="text-xs text-gray-400 mt-1">Nomor otomatis, tidak dapat diubah</p>
            </div>
            <div>
              <label className={labelClass}>Tanggal Mulai Kunjungan <span className="text-red-400">*</span></label>
              <input type="date" value={form.visit_date_from} onChange={e => set("visit_date_from", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Tanggal Selesai Kunjungan <span className="text-gray-400 font-normal normal-case">(opsional)</span></label>
              <input type="date" value={form.visit_date_to} min={form.visit_date_from}
                onChange={e => set("visit_date_to", e.target.value)} className={inputClass} />
              <p className="text-xs text-gray-400 mt-1">Kosongkan jika hanya 1 hari</p>
            </div>
          </div>
          {/* Visual date range preview */}
          {form.visit_date_from && form.visit_date_to && form.visit_date_to !== form.visit_date_from && (
            <div className="mt-3 bg-blue-50 rounded-xl px-4 py-2.5 flex items-center gap-2">
              <span className="text-[#0B3D91] text-sm">📅</span>
              <span className="text-xs text-[#0B3D91] font-semibold">
                Kunjungan:{" "}
                {new Date(form.visit_date_from + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}
                {" — "}
                {new Date(form.visit_date_to + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}
              </span>
            </div>
          )}
        </div>

        {/* Client Info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-5 h-5 bg-[#0B3D91] text-white rounded-full flex items-center justify-center text-xs font-black">2</span>
            Informasi Client
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Perusahaan <span className="text-red-400">*</span></label>
              <input value={form.client_company} onChange={e => set("client_company", e.target.value)} placeholder="Nama perusahaan / instansi" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Contact Person</label>
              <input value={form.contact_person} onChange={e => set("contact_person", e.target.value)} placeholder="Nama PIC / kontak" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Telepon</label>
              <input value={form.contact_phone} onChange={e => set("contact_phone", e.target.value)} placeholder="+62..." className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Lokasi / Site</label>
              <input value={form.site_location} onChange={e => set("site_location", e.target.value)} placeholder="Lokasi site pekerjaan" className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Alamat</label>
              <input value={form.client_address} onChange={e => set("client_address", e.target.value)} placeholder="Alamat lengkap" className={inputClass} />
            </div>
          </div>
        </div>

        {/* Engineer */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-5 h-5 bg-[#0B3D91] text-white rounded-full flex items-center justify-center text-xs font-black">3</span>
            Engineer
          </h3>
          <div>
            <label className={labelClass}>Pilih Engineer</label>
            <select value={form.engineer_id} onChange={e => set("engineer_id", e.target.value)} className={inputClass}>
              <option value="">— Pilih Engineer —</option>
              {engineers.map(e => (
                <option key={e.id} value={e.id}>{e.name} {e.position ? `— ${e.position}` : ""}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Equipment — multiple */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 bg-[#0B3D91] text-white rounded-full flex items-center justify-center text-xs font-black">4</span>
              Data Peralatan
            </h3>
            <button onClick={addEquipment}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#EEF3FB] text-[#0B3D91] rounded-lg text-xs font-semibold hover:bg-[#dbe8f8] transition-colors">
              + Tambah Alat
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

        {/* Detail Pekerjaan - Rich Text */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-5 h-5 bg-[#0B3D91] text-white rounded-full flex items-center justify-center text-xs font-black">5</span>
            Detail Pekerjaan
          </h3>
          <div>
            <label className={labelClass}>Deskripsi Pekerjaan</label>
            <RichTextEditor
              value={form.job_description}
              onChange={v => set("job_description", v)}
            />
            <p className="text-xs text-gray-400 mt-1.5">Gunakan toolbar untuk memformat teks, tambahkan daftar, warna font, atau gambar.</p>
          </div>
        </div>

        {/* Signature */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-5 h-5 bg-[#0B3D91] text-white rounded-full flex items-center justify-center text-xs font-black">6</span>
            Tanda Tangan Customer
          </h3>
          <SignaturePad
            label="Tanda tangan customer / perwakilan klien (opsional)"
            value={form.customer_signature}
            onChange={v => set("customer_signature", v)}
          />
          <div className="mt-3 bg-blue-50 rounded-xl px-4 py-3">
            <p className="text-xs text-blue-700">💡 <strong>Tanda tangan engineer</strong> diambil otomatis dari data yang didaftarkan di menu Engineers.</p>
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-3 mt-6">
        <button onClick={() => navigate("/onsite")} className="px-5 py-3 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50">Batal</button>
        <button onClick={handleSubmit} disabled={saving}
          className="flex-1 py-3 bg-[#0B3D91] text-white rounded-xl text-sm font-bold hover:bg-[#1E5CC6] disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm">
          {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Menyimpan…</> : "🚀 Buat Onsite Report"}
        </button>
      </div>
    </div>
  );
}