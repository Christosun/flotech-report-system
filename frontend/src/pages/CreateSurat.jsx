// ─── CreateSurat.jsx ─────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import toast from "react-hot-toast";

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
  const clearPad = () => { canvasRef.current.getContext("2d").clearRect(0, 0, 440, 160); setHasDrawn(false); };
  const saveSig = () => {
    if (!hasDrawn) { toast.error("Buat tanda tangan dahulu"); return; }
    onChange(canvasRef.current.toDataURL("image/png")); setShowPad(false); toast.success("Tanda tangan disimpan ✅");
  };

  return (
    <div>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{label}</p>
      {value ? (
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
          <img src={value} alt="sig" className="h-16 mx-auto object-contain py-1" />
          <div className="border-t border-gray-100 px-3 py-2 flex gap-2">
            <button type="button" onClick={() => setShowPad(true)} className="text-xs text-[#0B3D91] hover:underline">✏ Ubah</button>
            <button type="button" onClick={() => onChange("")} className="text-xs text-red-500 hover:underline">× Hapus</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setShowPad(true)} className="w-full border-2 border-dashed border-gray-200 rounded-xl py-5 text-center hover:border-[#0B3D91] hover:bg-blue-50 transition-all">
          <p className="text-2xl mb-1">✍</p><p className="text-xs font-semibold text-gray-400">Klik untuk tanda tangan</p>
        </button>
      )}
      {showPad && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div><h3 className="font-bold text-gray-800">Tanda Tangan Digital</h3><p className="text-xs text-gray-400">{label}</p></div>
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
                <button type="button" onClick={clearPad} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600">Bersihkan</button>
                <button type="button" onClick={saveSig} className="flex-1 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-bold">✓ Simpan</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const EMPTY_ITEM = { no: 1, nama_barang: "", jumlah: 1, satuan: "unit", keterangan: "" };

const EMPTY_FORM = {
  surat_number: "", surat_type: "serah", surat_date: new Date().toISOString().split("T")[0],
  perihal: "",
  pihak_pertama_nama: "", pihak_pertama_jabatan: "", pihak_pertama_perusahaan: "PT Flotech Controls Indonesia", pihak_pertama_alamat: "Rukan Artha Gading Niaga, Blok F/7, Jakarta 14240",
  pihak_kedua_nama: "", pihak_kedua_jabatan: "", pihak_kedua_perusahaan: "", pihak_kedua_alamat: "",
  barang_items: [{ ...EMPTY_ITEM }],
  catatan: "",
  pihak_pertama_signature: "", pihak_kedua_signature: "",
};

export default function CreateSurat() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const now = new Date();
    const num = `SST-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}-${String(Math.floor(Math.random()*900)+100)}`;
    setForm(f => ({ ...f, surat_number: num }));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const addItem = () => setForm(f => ({ ...f, barang_items: [...f.barang_items, { ...EMPTY_ITEM, no: f.barang_items.length + 1 }] }));
  const removeItem = i => setForm(f => ({ ...f, barang_items: f.barang_items.filter((_, idx) => idx !== i).map((item, idx) => ({ ...item, no: idx + 1 })) }));
  const updateItem = (i, field, val) => setForm(f => ({ ...f, barang_items: f.barang_items.map((item, idx) => idx === i ? { ...item, [field]: val } : item) }));

  const handleSubmit = async () => {
    if (!form.pihak_pertama_nama || !form.pihak_kedua_nama) { toast.error("Nama pihak pertama dan kedua wajib diisi"); return; }
    if (!form.barang_items.some(i => i.nama_barang)) { toast.error("Minimal isi 1 item barang"); return; }
    setSaving(true);
    try {
      const res = await API.post("/surat/create", form);
      toast.success("Surat berhasil dibuat! 📜");
      navigate(`/surat/${res.data.id}`);
    } catch (err) { toast.error(err.response?.data?.error || "Gagal membuat surat"); }
    finally { setSaving(false); }
  };

  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white transition-all";
  const labelClass = "block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5";

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => navigate("/surat")} className="flex items-center gap-2 text-sm text-gray-400 hover:text-[#0B3D91] mb-5 transition-colors">← Kembali</button>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Buat Surat Serah Terima</h1>
        <p className="text-gray-400 text-sm mt-1">Berita acara profesional dan modern</p>
      </div>

      <div className="space-y-4">
        {/* Tipe & Info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-5 h-5 bg-[#0B3D91] text-white rounded-full flex items-center justify-center text-xs font-black">1</span>
            Informasi Surat
          </h3>
          {/* Type selector */}
          <div className="flex gap-3 mb-4">
            {Object.entries({ serah: { label: "Serah Terima Barang", icon: "📤", desc: "Menyerahkan barang ke pihak lain" }, terima: { label: "Terima Barang", icon: "📥", desc: "Menerima barang dari pihak lain" } }).map(([k, v]) => (
              <button key={k} type="button" onClick={() => set("surat_type", k)}
                className={`flex-1 p-4 rounded-xl border-2 text-left transition-all ${form.surat_type === k ? "border-[#0B3D91] bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                <p className="text-2xl mb-1">{v.icon}</p>
                <p className="font-bold text-sm text-gray-800">{v.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{v.desc}</p>
                {form.surat_type === k && <p className="text-xs text-[#0B3D91] font-semibold mt-2">✓ Dipilih</p>}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={labelClass}>Nomor Surat</label><input value={form.surat_number} onChange={e => set("surat_number", e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>Tanggal</label><input type="date" value={form.surat_date} onChange={e => set("surat_date", e.target.value)} className={inputClass} /></div>
            <div className="sm:col-span-2"><label className={labelClass}>Perihal</label><input value={form.perihal} onChange={e => set("perihal", e.target.value)} placeholder="Misal: Penyerahan Flow Meter untuk proyek XYZ" className={inputClass} /></div>
          </div>
        </div>

        {/* Pihak */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Pihak Pertama */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-5 h-5 bg-[#0B3D91] text-white rounded-full flex items-center justify-center text-xs font-black">2</span>
              Pihak Pertama (Yang Menyerahkan)
            </h3>
            <div className="space-y-3">
              <div><label className={labelClass}>Nama *</label><input value={form.pihak_pertama_nama} onChange={e => set("pihak_pertama_nama", e.target.value)} placeholder="Nama lengkap" className={inputClass} /></div>
              <div><label className={labelClass}>Jabatan</label><input value={form.pihak_pertama_jabatan} onChange={e => set("pihak_pertama_jabatan", e.target.value)} placeholder="Sales Manager" className={inputClass} /></div>
              <div><label className={labelClass}>Perusahaan</label><input value={form.pihak_pertama_perusahaan} onChange={e => set("pihak_pertama_perusahaan", e.target.value)} className={inputClass} /></div>
              <div><label className={labelClass}>Alamat</label><textarea value={form.pihak_pertama_alamat} onChange={e => set("pihak_pertama_alamat", e.target.value)} rows={2} className={inputClass + " resize-none"} /></div>
            </div>
          </div>

          {/* Pihak Kedua */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-5 h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xs font-black">3</span>
              Pihak Kedua (Yang Menerima)
            </h3>
            <div className="space-y-3">
              <div><label className={labelClass}>Nama *</label><input value={form.pihak_kedua_nama} onChange={e => set("pihak_kedua_nama", e.target.value)} placeholder="Nama lengkap" className={inputClass} /></div>
              <div><label className={labelClass}>Jabatan</label><input value={form.pihak_kedua_jabatan} onChange={e => set("pihak_kedua_jabatan", e.target.value)} placeholder="Procurement Manager" className={inputClass} /></div>
              <div><label className={labelClass}>Perusahaan</label><input value={form.pihak_kedua_perusahaan} onChange={e => set("pihak_kedua_perusahaan", e.target.value)} className={inputClass} /></div>
              <div><label className={labelClass}>Alamat</label><textarea value={form.pihak_kedua_alamat} onChange={e => set("pihak_kedua_alamat", e.target.value)} rows={2} className={inputClass + " resize-none"} /></div>
            </div>
          </div>
        </div>

        {/* Barang */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 bg-[#0B3D91] text-white rounded-full flex items-center justify-center text-xs font-black">4</span>
              Daftar Barang
            </h3>
            <button type="button" onClick={addItem} className="px-3 py-1.5 bg-[#0B3D91] text-white rounded-lg text-xs font-semibold hover:bg-[#1E5CC6]">+ Tambah Item</button>
          </div>
          <div className="hidden sm:grid grid-cols-12 gap-2 mb-1 px-1">
            {["No", "Nama Barang", "Qty", "Satuan", "Keterangan", ""].map(h => (
              <p key={h} className={`text-[10px] font-bold text-gray-400 uppercase tracking-wide ${h === "Nama Barang" ? "col-span-4" : h === "Keterangan" ? "col-span-3" : "col-span-1"}`}>{h}</p>
            ))}
          </div>
          <div className="space-y-2">
            {form.barang_items.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 bg-gray-50 rounded-xl p-2.5 items-center">
                <div className="col-span-1 text-center"><span className="text-xs font-bold text-gray-400">{item.no}</span></div>
                <div className="col-span-4 sm:col-span-4"><input value={item.nama_barang} onChange={e => updateItem(i, "nama_barang", e.target.value)} placeholder="Nama barang" className={inputClass} /></div>
                <div className="col-span-2"><input type="number" min="1" value={item.jumlah} onChange={e => updateItem(i, "jumlah", e.target.value)} className={inputClass} /></div>
                <div className="col-span-2"><input value={item.satuan} onChange={e => updateItem(i, "satuan", e.target.value)} placeholder="unit" className={inputClass} /></div>
                <div className="col-span-2"><input value={item.keterangan} onChange={e => updateItem(i, "keterangan", e.target.value)} placeholder="Catatan" className={inputClass} /></div>
                <div className="col-span-1 flex justify-center">
                  {form.barang_items.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)} className="w-7 h-7 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 text-sm">×</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Catatan */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-5 h-5 bg-[#0B3D91] text-white rounded-full flex items-center justify-center text-xs font-black">5</span>
            Catatan / Keterangan
          </h3>
          <textarea value={form.catatan} onChange={e => set("catatan", e.target.value)} rows={3} placeholder="Kondisi barang, catatan khusus, dll..." className={inputClass + " resize-none"} />
        </div>

        {/* Signatures */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-5 h-5 bg-[#0B3D91] text-white rounded-full flex items-center justify-center text-xs font-black">6</span>
            Tanda Tangan
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <SignaturePad label="Tanda Tangan Pihak Pertama" value={form.pihak_pertama_signature} onChange={v => set("pihak_pertama_signature", v)} />
            <SignaturePad label="Tanda Tangan Pihak Kedua" value={form.pihak_kedua_signature} onChange={v => set("pihak_kedua_signature", v)} />
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button onClick={() => navigate("/surat")} className="px-5 py-3 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50">Batal</button>
        <button onClick={handleSubmit} disabled={saving}
          className="flex-1 py-3 bg-[#0B3D91] text-white rounded-xl text-sm font-bold hover:bg-[#1E5CC6] disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm">
          {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Menyimpan…</> : "📜 Buat Surat Serah Terima"}
        </button>
      </div>
    </div>
  );
}

export { CreateSurat };
