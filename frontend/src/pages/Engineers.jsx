import { useState, useEffect, useRef } from "react";
import API from "../services/api";
import toast from "react-hot-toast";

const EMPTY_FORM = {
  name: "", employee_id: "", position: "", department: "",
  specialization: "", email: "", phone: "", years_experience: "",
  // certification intentionally removed
};

/* ─── Reusable Elegant Delete Dialog ─────────────────────────── */
function DeleteDialog({ name, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-gradient-to-br from-red-50 to-rose-100 px-6 pt-6 pb-4 text-center">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">🗑</span>
          </div>
          <h3 className="text-lg font-bold text-gray-800">Hapus Engineer?</h3>
          <p className="text-sm text-gray-500 mt-1">
            <span className="font-semibold text-gray-700">{name}</span> akan dihapus permanen dan tidak bisa dikembalikan.
          </p>
        </div>
        <div className="px-6 py-4 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Engineers() {
  const [engineers, setEngineers]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [showSigModal, setShowSigModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, name }
  const [deleting, setDeleting]     = useState(false);
  const [editId, setEditId]         = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);

  const canvasRef  = useRef(null);
  const isDrawing  = useRef(false);
  const lastPos    = useRef(null);

  const fetchEngineers = async () => {
    setLoading(true);
    try { const res = await API.get("/engineer/"); setEngineers(res.data); }
    catch { toast.error("Failed to load engineers"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchEngineers(); }, []);

  // Signature canvas setup
  useEffect(() => {
    if (!showSigModal) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#0B3D91"; ctx.lineWidth = 2.5;
    ctx.lineCap = "round"; ctx.lineJoin = "round";

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const sx = canvas.width / rect.width, sy = canvas.height / rect.height;
      if (e.touches) return { x: (e.touches[0].clientX - rect.left) * sx, y: (e.touches[0].clientY - rect.top) * sy };
      return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
    };
    const onStart = (e) => { e.preventDefault(); isDrawing.current = true; lastPos.current = getPos(e); };
    const onMove  = (e) => {
      e.preventDefault(); if (!isDrawing.current) return;
      const pos = getPos(e);
      ctx.beginPath(); ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y); ctx.stroke(); lastPos.current = pos;
    };
    const onEnd = () => { isDrawing.current = false; };

    canvas.addEventListener("mousedown", onStart); canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseup", onEnd);
    canvas.addEventListener("touchstart", onStart, { passive: false });
    canvas.addEventListener("touchmove", onMove, { passive: false });
    canvas.addEventListener("touchend", onEnd);
    return () => {
      canvas.removeEventListener("mousedown", onStart); canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseup", onEnd); canvas.removeEventListener("touchstart", onStart);
      canvas.removeEventListener("touchmove", onMove); canvas.removeEventListener("touchend", onEnd);
    };
  }, [showSigModal]);

  const clearSignature = () => {
    const c = canvasRef.current; if (!c) return;
    c.getContext("2d").clearRect(0, 0, c.width, c.height);
  };

  const saveSignature = async () => {
    const c = canvasRef.current; if (!c) return;
    setSaving(true);
    try {
      await API.post(`/engineer/signature/${showSigModal}`, { signature_data: c.toDataURL("image/png") });
      toast.success("Signature saved! ✍️"); setShowSigModal(null); fetchEngineers();
    } catch { toast.error("Failed to save signature"); }
    finally { setSaving(false); }
  };

  const handleSubmit = async () => {
    if (!form.name) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      if (editId) {
        await API.put(`/engineer/update/${editId}`, form);
        toast.success("Engineer diperbarui!");
      } else {
        await API.post("/engineer/create", form);
        toast.success("Engineer ditambahkan! 👷");
      }
      setShowModal(false); setEditId(null); setForm(EMPTY_FORM); fetchEngineers();
    } catch (err) { toast.error(err.response?.data?.error || "Gagal menyimpan"); }
    finally { setSaving(false); }
  };

  const openEdit = (eng) => {
    setForm({
      name: eng.name || "", employee_id: eng.employee_id || "",
      position: eng.position || "", department: eng.department || "",
      specialization: eng.specialization || "", email: eng.email || "",
      phone: eng.phone || "", years_experience: eng.years_experience || "",
    });
    setEditId(eng.id); setShowModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await API.delete(`/engineer/delete/${deleteTarget.id}`);
      toast.success("Engineer dihapus");
      setDeleteTarget(null); fetchEngineers();
    } catch { toast.error("Gagal menghapus"); }
    finally { setDeleting(false); }
  };

  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white transition-all";
  const labelClass = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5";

  return (
    <div>
      {/* Delete Dialog */}
      {deleteTarget && (
        <DeleteDialog
          name={deleteTarget.name}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Engineers</h1>
          <p className="text-gray-400 text-sm mt-0.5">Kelola profil engineer dan tanda tangan digital</p>
        </div>
        <button
          onClick={() => { setForm(EMPTY_FORM); setEditId(null); setShowModal(true); }}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-semibold hover:bg-[#1E5CC6] transition-colors"
        >
          + Add Engineer
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B3D91]" />
        </div>
      ) : engineers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-4xl mb-3">👷</p>
          <p className="text-gray-500 font-medium">Belum ada engineer</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {engineers.map(eng => (
            <div key={eng.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all">
              {/* Avatar + name */}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-11 h-11 bg-gradient-to-br from-[#0B3D91] to-[#1E5CC6] rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-lg">{eng.name?.charAt(0).toUpperCase()}</span>
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-gray-800 truncate">{eng.name}</p>
                  <p className="text-xs text-gray-400">{eng.position || "—"}</p>
                  {eng.employee_id && (
                    <p className="text-[10px] text-gray-400 mt-0.5 font-mono">{eng.employee_id}</p>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="space-y-1.5 mb-4">
                {eng.department && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>🏢</span><span>{eng.department}</span>
                  </div>
                )}
                {eng.specialization && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>⚙️</span><span className="truncate">{eng.specialization}</span>
                  </div>
                )}
                {eng.email && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>✉️</span><span className="truncate">{eng.email}</span>
                  </div>
                )}
                {eng.phone && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>📞</span><span>{eng.phone}</span>
                  </div>
                )}
                {eng.years_experience > 0 && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>⏱</span><span>{eng.years_experience} tahun pengalaman</span>
                  </div>
                )}
              </div>

              {/* Signature status */}
              <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg mb-4 w-fit
                ${eng.has_signature ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-400"}`}>
                <span>{eng.has_signature ? "✍️" : "○"}</span>
                <span>{eng.has_signature ? "Signature tersimpan" : "Belum ada signature"}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button onClick={() => openEdit(eng)}
                  className="flex-1 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors">
                  Edit
                </button>
                <button onClick={() => setShowSigModal(eng.id)}
                  className="flex-1 py-2 bg-[#0B3D91] text-white rounded-lg text-xs font-semibold hover:bg-[#1E5CC6] transition-colors">
                  Signature
                </button>
                <button
                  onClick={() => setDeleteTarget({ id: eng.id, name: eng.name })}
                  className="py-2 px-3 bg-red-50 text-red-500 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal — no certification field */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl z-10">
              <h2 className="text-lg font-bold text-gray-800">{editId ? "Edit Engineer" : "Tambah Engineer"}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Nama Lengkap *</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Nama lengkap engineer" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Employee ID</label>
                  <input value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })}
                    placeholder="FJKT-001" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Jabatan / Position</label>
                  <input value={form.position} onChange={e => setForm({ ...form, position: e.target.value })}
                    placeholder="Senior Engineer" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Department</label>
                  <input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}
                    placeholder="Instrumentation" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Tahun Pengalaman</label>
                  <input type="number" min="0" value={form.years_experience}
                    onChange={e => setForm({ ...form, years_experience: e.target.value })}
                    placeholder="5" className={inputClass} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Spesialisasi</label>
                  <input value={form.specialization} onChange={e => setForm({ ...form, specialization: e.target.value })}
                    placeholder="Flow, Level, Pressure, Analyzer..." className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="email@flotech.co.id" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Telepon</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                    placeholder="+62..." className={inputClass} />
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex gap-3 justify-end sticky bottom-0 bg-white rounded-b-2xl">
              <button onClick={() => setShowModal(false)}
                className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                Batal
              </button>
              <button onClick={handleSubmit} disabled={saving}
                className="px-6 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-semibold hover:bg-[#1E5CC6] disabled:opacity-60 flex items-center gap-2">
                {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Menyimpan...</> : "Simpan Engineer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Signature Modal */}
      {showSigModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Tanda Tangan Digital</h2>
                <p className="text-xs text-gray-400 mt-0.5">Gambar tanda tangan di kotak di bawah</p>
              </div>
              <button onClick={() => setShowSigModal(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-5">
              <div className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-blue-50 relative">
                <canvas ref={canvasRef} width={480} height={180}
                  className="w-full touch-none cursor-crosshair" style={{ display: "block" }} />
                <p className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-gray-300 pointer-events-none select-none">
                  Tanda tangan di sini
                </p>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={clearSignature}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                  Hapus
                </button>
                <button onClick={saveSignature} disabled={saving}
                  className="flex-1 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-semibold hover:bg-[#1E5CC6] disabled:opacity-60 flex items-center justify-center gap-2">
                  {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Menyimpan...</> : "✍️ Simpan Signature"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}