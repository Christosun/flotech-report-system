import { useState, useEffect, useRef } from "react";
import API from "../services/api";
import toast from "react-hot-toast";

const EMPTY_FORM = {
  name: "",
  employee_id: "",
  position: "",
  department: "",
  specialization: "",
  email: "",
  phone: "",
  certification: "",
  years_experience: "",
};

export default function Engineers() {
  const [engineers, setEngineers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showSigModal, setShowSigModal] = useState(null); // engineer id
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Signature canvas
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef(null);

  const fetchEngineers = async () => {
    setLoading(true);
    try {
      const res = await API.get("/engineer/");
      setEngineers(res.data);
    } catch {
      toast.error("Failed to load engineers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEngineers(); }, []);

  // Drawing events
  useEffect(() => {
    if (!showSigModal) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#0B3D91";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      if (e.touches) {
        return {
          x: (e.touches[0].clientX - rect.left) * scaleX,
          y: (e.touches[0].clientY - rect.top) * scaleY,
        };
      }
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };

    const onStart = (e) => {
      e.preventDefault();
      isDrawing.current = true;
      lastPos.current = getPos(e);
    };

    const onMove = (e) => {
      e.preventDefault();
      if (!isDrawing.current) return;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      lastPos.current = pos;
    };

    const onEnd = () => { isDrawing.current = false; };

    canvas.addEventListener("mousedown", onStart);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseup", onEnd);
    canvas.addEventListener("touchstart", onStart, { passive: false });
    canvas.addEventListener("touchmove", onMove, { passive: false });
    canvas.addEventListener("touchend", onEnd);

    return () => {
      canvas.removeEventListener("mousedown", onStart);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseup", onEnd);
      canvas.removeEventListener("touchstart", onStart);
      canvas.removeEventListener("touchmove", onMove);
      canvas.removeEventListener("touchend", onEnd);
    };
  }, [showSigModal]);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    setSaving(true);
    try {
      await API.post(`/engineer/signature/${showSigModal}`, { signature_data: dataUrl });
      toast.success("Signature saved! ✍️");
      setShowSigModal(null);
      fetchEngineers();
    } catch {
      toast.error("Failed to save signature");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.name) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      if (editId) {
        await API.put(`/engineer/update/${editId}`, form);
        toast.success("Engineer updated!");
      } else {
        await API.post("/engineer/create", form);
        toast.success("Engineer added! 👷");
      }
      setShowModal(false);
      setEditId(null);
      setForm(EMPTY_FORM);
      fetchEngineers();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save engineer");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (eng) => {
    setForm({
      name: eng.name || "",
      employee_id: eng.employee_id || "",
      position: eng.position || "",
      department: eng.department || "",
      specialization: eng.specialization || "",
      email: eng.email || "",
      phone: eng.phone || "",
      certification: eng.certification || "",
      years_experience: eng.years_experience || "",
    });
    setEditId(eng.id);
    setShowModal(true);
  };

  const deleteEngineer = async (id) => {
    if (!confirm("Delete this engineer?")) return;
    try {
      await API.delete(`/engineer/delete/${id}`);
      toast.success("Engineer deleted");
      fetchEngineers();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white transition-all";
  const labelClass = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5";

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Engineers</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage engineer profiles and digital signatures</p>
        </div>
        <button
          onClick={() => { setForm(EMPTY_FORM); setEditId(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-secondary transition-colors"
        >
          <span>+</span> Add Engineer
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      ) : engineers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <p className="text-4xl mb-3">👷</p>
          <p className="text-gray-500 font-medium">No engineers added yet</p>
          <p className="text-gray-400 text-sm mt-1">Add engineers to assign them to reports</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {engineers.map((eng) => (
            <div key={eng.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
              {/* Avatar + Name */}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-lg">{eng.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-gray-800 truncate">{eng.name}</p>
                  <p className="text-xs text-gray-400">{eng.employee_id || "No ID"}</p>
                  <p className="text-xs text-primary font-medium mt-0.5">{eng.position || "—"}</p>
                </div>
              </div>

              {/* Info */}
              <div className="space-y-1.5 mb-4 text-xs text-gray-500">
                {eng.department && <p>🏢 {eng.department}</p>}
                {eng.specialization && <p>⚙️ {eng.specialization}</p>}
                {eng.years_experience > 0 && <p>📅 {eng.years_experience} years experience</p>}
                {eng.email && <p>✉️ {eng.email}</p>}
              </div>

              {/* Signature status */}
              <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg mb-3
                ${eng.has_signature ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-400"}`}>
                <span>{eng.has_signature ? "✍️" : "○"}</span>
                <span>{eng.has_signature ? "Signature added" : "No signature"}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button onClick={() => openEdit(eng)}
                  className="flex-1 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors">
                  Edit
                </button>
                <button onClick={() => setShowSigModal(eng.id)}
                  className="flex-1 py-2 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-secondary transition-colors">
                  Signature
                </button>
                <button onClick={() => deleteEngineer(eng.id)}
                  className="py-2 px-3 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors">
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-lg font-bold text-gray-800">{editId ? "Edit Engineer" : "Add Engineer"}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Full Name *</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Engineer full name" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Employee ID</label>
                  <input value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })} placeholder="EMP-001" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Position / Title</label>
                  <input value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} placeholder="Senior Engineer" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Department</label>
                  <input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} placeholder="Instrumentation" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Years Experience</label>
                  <input type="number" value={form.years_experience} onChange={e => setForm({ ...form, years_experience: e.target.value })} placeholder="5" className={inputClass} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Specialization</label>
                  <input value={form.specialization} onChange={e => setForm({ ...form, specialization: e.target.value })} placeholder="PLC, SCADA, Instrumentation..." className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@company.com" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+62..." className={inputClass} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Certification</label>
                  <input value={form.certification} onChange={e => setForm({ ...form, certification: e.target.value })} placeholder="e.g. ISA CCST, PMP, CompEx..." className={inputClass} />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3 justify-end sticky bottom-0 bg-white rounded-b-2xl">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSubmit} disabled={saving}
                className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-secondary disabled:opacity-60 flex items-center gap-2">
                {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</> : "Save Engineer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Signature Modal */}
      {showSigModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Digital Signature</h2>
                <p className="text-xs text-gray-400 mt-0.5">Draw your signature in the box below</p>
              </div>
              <button onClick={() => setShowSigModal(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6">
              <div className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-blue-50 relative">
                <canvas
                  ref={canvasRef}
                  width={480}
                  height={180}
                  className="w-full touch-none cursor-crosshair"
                  style={{ display: "block" }}
                />
                <p className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-gray-300 pointer-events-none select-none">
                  Sign here
                </p>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={clearSignature}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  Clear
                </button>
                <button onClick={saveSignature} disabled={saving}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-secondary disabled:opacity-60 flex items-center justify-center gap-2 transition-colors">
                  {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</> : "✍️ Save Signature"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}