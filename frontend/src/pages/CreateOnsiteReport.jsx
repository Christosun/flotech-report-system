import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import toast from "react-hot-toast";

/* ─── Signature Pad ──────────────────────────────────────── */
function SignaturePad({ label, value, onChange }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [showPad, setShowPad] = useState(false);
  const lastPos = useRef(null);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return { x: (touch.clientX - rect.left) * (canvas.width / rect.width), y: (touch.clientY - rect.top) * (canvas.height / rect.height) };
  };

  const startDraw = (e) => { e.preventDefault(); setDrawing(true); setHasDrawn(true); lastPos.current = getPos(e, canvasRef.current); };
  const draw = (e) => {
    if (!drawing) return; e.preventDefault();
    const canvas = canvasRef.current; const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.beginPath(); ctx.moveTo(lastPos.current.x, lastPos.current.y); ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#0B3D91"; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.stroke();
    lastPos.current = pos;
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
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
          <img src={value} alt="Signature" className="h-16 mx-auto object-contain py-1" />
          <div className="border-t border-gray-100 px-3 py-2 flex gap-2">
            <button type="button" onClick={() => setShowPad(true)} className="text-xs text-[#0B3D91] hover:underline">✏ Ubah</button>
            <button type="button" onClick={() => onChange("")} className="text-xs text-red-500 hover:underline">× Hapus</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setShowPad(true)}
          className="w-full border-2 border-dashed border-gray-200 rounded-xl py-6 text-center hover:border-[#0B3D91] hover:bg-blue-50 transition-all">
          <p className="text-3xl mb-1">✍</p>
          <p className="text-xs font-semibold text-gray-400">Klik untuk tanda tangan</p>
        </button>
      )}
      {showPad && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-800">Tanda Tangan Digital</h3>
                <p className="text-xs text-gray-400">{label}</p>
              </div>
              <button type="button" onClick={() => setShowPad(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-4">
              <div className="border-2 border-dashed border-gray-200 rounded-xl overflow-hidden bg-gray-50 relative">
                <canvas ref={canvasRef} width={440} height={160}
                  style={{ touchAction: "none", width: "100%", display: "block", cursor: "crosshair" }}
                  onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                  onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
                {!hasDrawn && <p className="absolute inset-0 flex items-center justify-center text-gray-300 text-sm pointer-events-none">Tanda tangan di sini...</p>}
              </div>
              <div className="flex gap-3 mt-3">
                <button type="button" onClick={clearPad} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Bersihkan</button>
                <button type="button" onClick={saveSig} className="flex-1 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-bold hover:bg-[#1E5CC6]">✓ Simpan</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const EMPTY_FORM = {
  report_number: "", visit_date: new Date().toISOString().split("T")[0],
  client_name: "", client_company: "", client_address: "", site_location: "",
  contact_person: "", contact_phone: "",
  engineer_id: "",
  job_description: "", equipment_tag: "", equipment_model: "", serial_number: "",
  work_performed: "", findings: "", recommendations: "", materials_used: "",
  customer_signature: "",
};

export default function CreateOnsiteReport() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [engineers, setEngineers] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    API.get("/engineer/").then(r => setEngineers(r.data)).catch(() => {});
    // Auto generate report number
    const now = new Date();
    const num = `OSR-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}-${String(Math.floor(Math.random()*900)+100)}`;
    setForm(f => ({ ...f, report_number: num }));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.client_name) { toast.error("Nama client wajib diisi"); return; }
    if (!form.report_number) { toast.error("Nomor report wajib diisi"); return; }
    setSaving(true);
    try {
      const res = await API.post("/onsite/create", form);
      toast.success("Onsite Report berhasil dibuat! 🚀");
      navigate(`/onsite/${res.data.id}`);
    } catch (err) { toast.error(err.response?.data?.error || "Gagal membuat report"); }
    finally { setSaving(false); }
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Nomor Report *</label>
              <input value={form.report_number} onChange={e => set("report_number", e.target.value)} placeholder="OSR-20250222-001" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Tanggal Kunjungan *</label>
              <input type="date" value={form.visit_date} onChange={e => set("visit_date", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Engineer</label>
              <select value={form.engineer_id} onChange={e => set("engineer_id", e.target.value)} className={inputClass}>
                <option value="">— Pilih Engineer —</option>
                {engineers.map(eng => <option key={eng.id} value={eng.id}>{eng.name}{eng.position && ` (${eng.position})`}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Client Info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-5 h-5 bg-[#0B3D91] text-white rounded-full flex items-center justify-center text-xs font-black">2</span>
            Data Client
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Nama Client *</label>
              <input value={form.client_name} onChange={e => set("client_name", e.target.value)} placeholder="Nama person in charge" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Perusahaan</label>
              <input value={form.client_company} onChange={e => set("client_company", e.target.value)} placeholder="Nama perusahaan" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Contact Person</label>
              <input value={form.contact_person} onChange={e => set("contact_person", e.target.value)} placeholder="Nama kontak" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>No. Telepon</label>
              <input value={form.contact_phone} onChange={e => set("contact_phone", e.target.value)} placeholder="+62..." className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Lokasi / Site</label>
              <input value={form.site_location} onChange={e => set("site_location", e.target.value)} placeholder="Nama plant / lokasi" className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Alamat</label>
              <textarea value={form.client_address} onChange={e => set("client_address", e.target.value)} rows={2} placeholder="Alamat lengkap" className={inputClass + " resize-none"} />
            </div>
          </div>
        </div>

        {/* Equipment */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-5 h-5 bg-[#0B3D91] text-white rounded-full flex items-center justify-center text-xs font-black">3</span>
            Data Peralatan
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Tag / ID Alat</label>
              <input value={form.equipment_tag} onChange={e => set("equipment_tag", e.target.value)} placeholder="TAG-001" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Model / Type</label>
              <input value={form.equipment_model} onChange={e => set("equipment_model", e.target.value)} placeholder="Model number" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Serial Number</label>
              <input value={form.serial_number} onChange={e => set("serial_number", e.target.value)} placeholder="S/N" className={inputClass} />
            </div>
          </div>
        </div>

        {/* Work Details */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-5 h-5 bg-[#0B3D91] text-white rounded-full flex items-center justify-center text-xs font-black">4</span>
            Detail Pekerjaan
          </h3>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Deskripsi Pekerjaan</label>
              <textarea value={form.job_description} onChange={e => set("job_description", e.target.value)} rows={2} placeholder="Tujuan dan scope pekerjaan..." className={inputClass + " resize-none"} />
            </div>
            <div>
              <label className={labelClass}>Pekerjaan yang Dilakukan</label>
              <textarea value={form.work_performed} onChange={e => set("work_performed", e.target.value)} rows={4} placeholder="Detail langkah-langkah pekerjaan yang dilakukan..." className={inputClass + " resize-none"} />
            </div>
            <div>
              <label className={labelClass}>Temuan / Findings</label>
              <textarea value={form.findings} onChange={e => set("findings", e.target.value)} rows={3} placeholder="Kondisi alat, anomali, temuan di lapangan..." className={inputClass + " resize-none"} />
            </div>
            <div>
              <label className={labelClass}>Rekomendasi</label>
              <textarea value={form.recommendations} onChange={e => set("recommendations", e.target.value)} rows={2} placeholder="Saran tindak lanjut..." className={inputClass + " resize-none"} />
            </div>
            <div>
              <label className={labelClass}>Material / Parts Digunakan</label>
              <textarea value={form.materials_used} onChange={e => set("materials_used", e.target.value)} rows={2} placeholder="Daftar material atau spare part yang digunakan..." className={inputClass + " resize-none"} />
            </div>
          </div>
        </div>

        {/* Signature */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-5 h-5 bg-[#0B3D91] text-white rounded-full flex items-center justify-center text-xs font-black">5</span>
            Tanda Tangan Customer
          </h3>
          <SignaturePad
            label="Tanda tangan customer / perwakilan klien (opsional)"
            value={form.customer_signature}
            onChange={v => set("customer_signature", v)}
          />
          <div className="mt-3 bg-blue-50 rounded-xl px-4 py-3">
            <p className="text-xs text-blue-700">💡 <strong>Tanda tangan engineer</strong> diambil otomatis dari data yang didaftarkan di menu Engineers. Pastikan engineer yang dipilih sudah upload tanda tangannya.</p>
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
