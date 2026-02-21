import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../services/api";
import toast from "react-hot-toast";

const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

/* ─── Field definitions (reused for edit mode) ─────────────────── */
const COMMISSIONING_FIELDS = [
  { section: "Site & Equipment Information", fields: [
    { name: "site_location", label: "Site Location", type: "text" },
    { name: "equipment_name", label: "Equipment Name", type: "text" },
    { name: "equipment_model", label: "Equipment Model", type: "text" },
    { name: "serial_number", label: "Serial Number", type: "text" },
    { name: "manufacturer", label: "Manufacturer", type: "text" },
    { name: "installation_date", label: "Installation Date", type: "date" },
  ]},
  { section: "Pre-Commissioning Checks", fields: [
    { name: "visual_inspection", label: "Visual Inspection Result", type: "textarea" },
    { name: "safety_checks", label: "Safety Checks Performed", type: "textarea" },
    { name: "electrical_checks", label: "Electrical Checks", type: "textarea" },
    { name: "mechanical_checks", label: "Mechanical Checks", type: "textarea" },
  ]},
  { section: "Commissioning Test Results", fields: [
    { name: "test_procedures", label: "Test Procedures Performed", type: "textarea" },
    { name: "performance_parameters", label: "Performance Parameters", type: "textarea" },
    { name: "test_results", label: "Test Results & Measurements", type: "textarea" },
  ]},
  { section: "Final Status", fields: [
    { name: "commissioning_result", label: "Commissioning Result", type: "text" },
    { name: "issues_found", label: "Issues Found", type: "textarea" },
    { name: "recommendations", label: "Recommendations", type: "textarea" },
    { name: "client_acceptance", label: "Client Acceptance / Notes", type: "textarea" },
  ]},
];
const INVESTIGATION_FIELDS = [
  { section: "Incident Information", fields: [
    { name: "incident_date", label: "Incident Date", type: "datetime-local" },
    { name: "incident_location", label: "Incident Location", type: "text" },
    { name: "equipment_involved", label: "Equipment / System Involved", type: "text" },
    { name: "reported_by", label: "Reported By", type: "text" },
  ]},
  { section: "Problem Description", fields: [
    { name: "incident_description", label: "Incident Description", type: "textarea" },
    { name: "symptoms_observed", label: "Symptoms Observed", type: "textarea" },
  ]},
  { section: "Investigation Findings", fields: [
    { name: "root_cause", label: "Root Cause Analysis", type: "textarea" },
    { name: "contributing_factors", label: "Contributing Factors", type: "textarea" },
    { name: "findings", label: "Findings", type: "textarea" },
  ]},
  { section: "Corrective Actions", fields: [
    { name: "immediate_actions", label: "Immediate Actions", type: "textarea" },
    { name: "long_term_actions", label: "Long Term Actions", type: "textarea" },
    { name: "preventive_measures", label: "Preventive Measures", type: "textarea" },
    { name: "investigation_result", label: "Investigation Result", type: "text" },
  ]},
];
const TROUBLESHOOTING_FIELDS = [
  { section: "Problem Identification", fields: [
    { name: "problem_description", label: "Problem Description", type: "textarea" },
    { name: "equipment_name", label: "Equipment", type: "text" },
    { name: "serial_number", label: "Serial Number", type: "text" },
    { name: "location", label: "Location", type: "text" },
  ]},
  { section: "Troubleshooting Steps", fields: [
    { name: "diagnostic_steps", label: "Diagnostic Steps", type: "textarea" },
    { name: "tests_performed", label: "Tests Performed", type: "textarea" },
    { name: "findings", label: "Findings", type: "textarea" },
  ]},
  { section: "Resolution", fields: [
    { name: "actions_taken", label: "Actions Taken", type: "textarea" },
    { name: "parts_replaced", label: "Parts Replaced", type: "textarea" },
    { name: "resolution_status", label: "Resolution Status", type: "text" },
    { name: "recommendations", label: "Recommendations", type: "textarea" },
  ]},
];
const SERVICE_FIELDS = [
  { section: "Service Information", fields: [
    { name: "service_type", label: "Service Type", type: "text" },
    { name: "equipment_name", label: "Equipment", type: "text" },
    { name: "serial_number", label: "Serial Number", type: "text" },
    { name: "location", label: "Location", type: "text" },
  ]},
  { section: "Work Performed", fields: [
    { name: "work_description", label: "Work Description", type: "textarea" },
    { name: "parts_used", label: "Parts Used", type: "textarea" },
    { name: "test_results", label: "Test Results", type: "textarea" },
  ]},
  { section: "Service Outcome", fields: [
    { name: "service_result", label: "Service Result", type: "text" },
    { name: "recommendations", label: "Recommendations", type: "textarea" },
    { name: "follow_up", label: "Follow-up Required", type: "textarea" },
  ]},
];
const FIELD_MAP = { commissioning: COMMISSIONING_FIELDS, investigation: INVESTIGATION_FIELDS, troubleshooting: TROUBLESHOOTING_FIELDS, service: SERVICE_FIELDS };

const STATUS_BADGES = {
  draft: "bg-gray-100 text-gray-600",
  "in-progress": "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  approved: "bg-blue-100 text-blue-700",
};
const TYPE_BADGES = {
  commissioning: "bg-blue-100 text-blue-700",
  investigation: "bg-purple-100 text-purple-700",
  troubleshooting: "bg-orange-100 text-orange-700",
  service: "bg-green-100 text-green-700",
};

/* ─── Elegant Delete Confirmation Dialog ───────────────────────── */
function DeleteDialog({ title, description, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Icon strip */}
        <div className="bg-gradient-to-br from-red-50 to-rose-100 px-6 pt-6 pb-4 text-center">
          <div className="w-14 h-14 bg-red-100 border-4 border-red-200 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>
        <div className="px-6 py-4 flex gap-3">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Batal
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── PDF Preview Modal ─────────────────────────────────────────── */
function PDFPreviewModal({ url, reportNumber, reportType, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
      <div className="flex items-center justify-between px-5 py-3 bg-[#0B3D91]">
        <span className="text-white font-bold text-sm flex items-center gap-2">
          <span className="opacity-70">📋</span> {reportNumber} — Preview
        </span>
        <div className="flex items-center gap-2">
          <a href={url} download={`${reportNumber}_${reportType}.pdf`}
            className="px-4 py-1.5 bg-white text-[#0B3D91] rounded-lg text-xs font-bold hover:bg-blue-50 flex items-center gap-1.5 transition-colors">
            ⬇ Download
          </a>
          <button onClick={onClose} className="text-white/70 hover:text-white text-xl px-2 transition-colors">✕</button>
        </div>
      </div>
      <iframe src={url} className="flex-1 w-full" title="PDF Preview" style={{ border: "none" }} />
    </div>
  );
}

/* ─── Data Section (view mode) ─────────────────────────────────── */
function DataSection({ title, data, keys }) {
  const hasContent = keys.some(({ key }) => data?.[key]);
  if (!hasContent) return null;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
      <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-4 flex items-center gap-2">
        <span className="w-1.5 h-4 bg-[#0B3D91] rounded-full" />{title}
      </h3>
      <div className="space-y-3">
        {keys.map(({ key, label }) => {
          const val = data?.[key];
          if (!val) return null;
          return (
            <div key={key}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{val}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Image Card ────────────────────────────────────────────────── */
function ImageCard({ img, onDelete, onCaptionSave }) {
  const [editingCaption, setEditingCaption] = useState(false);
  const [caption, setCaption] = useState(img.caption || "");
  const [saving, setSaving] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const inputRef = useRef(null);

  const filename = (img.file_path || "").split(/[\/\\]/).pop();
  const imgUrl = `${BASE_URL}/uploads/${filename}`;

  const handleSaveCaption = async () => {
    setSaving(true);
    try { await onCaptionSave(img.id, caption); setEditingCaption(false); }
    catch { toast.error("Gagal menyimpan caption"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await onDelete(img.id); }
    catch { toast.error("Gagal menghapus"); setDeleting(false); setDeleteDialog(false); }
  };

  useEffect(() => { if (editingCaption && inputRef.current) inputRef.current.focus(); }, [editingCaption]);

  return (
    <>
      {deleteDialog && (
        <DeleteDialog
          title="Hapus Foto?"
          description="Foto ini akan dihapus permanen dan tidak bisa dikembalikan."
          onConfirm={handleDelete}
          onCancel={() => setDeleteDialog(false)}
          loading={deleting}
        />
      )}
      <div className="group relative rounded-xl overflow-hidden border border-gray-100 shadow-sm bg-white">
        <div className="relative overflow-hidden bg-gray-50" style={{ aspectRatio: "4/3" }}>
          <img src={imgUrl} alt={caption || filename}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
            onError={e => { e.target.onerror = null; e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect width='80' height='80' fill='%23f3f4f6'/%3E%3Ctext x='40' y='44' text-anchor='middle' font-size='11' fill='%239ca3af'%3ENo image%3C/text%3E%3C/svg%3E"; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-end justify-between p-2">
            <button onClick={() => setEditingCaption(true)} title="Edit caption"
              className="w-7 h-7 bg-white/90 text-[#0B3D91] rounded-lg flex items-center justify-center text-xs hover:bg-white transition-colors shadow">
              ✏
            </button>
            <button onClick={() => setDeleteDialog(true)} title="Hapus foto"
              className="w-7 h-7 bg-white/90 text-red-500 rounded-lg flex items-center justify-center text-xs hover:bg-white transition-colors shadow">
              🗑
            </button>
          </div>
        </div>
        <div className="p-2">
          {editingCaption ? (
            <div className="flex flex-col gap-1.5">
              <input ref={inputRef} value={caption}
                onChange={e => setCaption(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleSaveCaption(); if (e.key === "Escape") { setCaption(img.caption || ""); setEditingCaption(false); } }}
                placeholder="Keterangan gambar…"
                className="w-full text-xs border border-[#0B3D91] rounded-lg px-2 py-1.5 focus:outline-none" />
              <div className="flex gap-1">
                <button onClick={handleSaveCaption} disabled={saving}
                  className="flex-1 py-1 bg-[#0B3D91] text-white text-xs rounded-lg font-semibold disabled:opacity-60">
                  {saving ? "…" : "✓ Simpan"}
                </button>
                <button onClick={() => { setCaption(img.caption || ""); setEditingCaption(false); }}
                  className="px-2 py-1 border border-gray-200 text-gray-500 text-xs rounded-lg">✕</button>
              </div>
            </div>
          ) : (
            <p onClick={() => setEditingCaption(true)}
              className="text-xs text-gray-400 cursor-pointer hover:text-[#0B3D91] transition-colors line-clamp-2 min-h-[2rem]">
              {caption || <span className="italic text-gray-300">Tambah keterangan…</span>}
            </p>
          )}
        </div>
      </div>
    </>
  );
}

/* ─── Main Component ────────────────────────────────────────────── */
export default function ReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [engineers, setEngineers] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [editBase, setEditBase] = useState({});
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);

  // Delete report dialog
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchReport = useCallback(async () => {
    try {
      const res = await API.get(`/report/detail/${id}`);
      setReport(res.data);
    } catch { toast.error("Failed to load report"); }
  }, [id]);

  useEffect(() => { fetchReport(); }, [fetchReport]);
  useEffect(() => { API.get("/engineer/").then(r => setEngineers(r.data)).catch(() => {}); }, []);

  const openEdit = () => {
    setEditBase({
      report_number: report.report_number || "",
      client_name: report.client_name || "",
      project_name: report.project_name || "",
      report_date: report.report_date || "",
      engineer_id: report.engineer?.id || "",
      status: report.status || "draft",
    });
    setEditData({ ...(report.data_json || {}) });
    setEditMode(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await API.put(`/report/update/${id}`, {
        ...editBase,
        engineer_id: editBase.engineer_id ? parseInt(editBase.engineer_id) : null,
        data_json: editData,
      });
      toast.success("Report berhasil diperbarui! ✅");
      setEditMode(false);
      fetchReport();
    } catch { toast.error("Gagal menyimpan perubahan"); }
    finally { setSaving(false); }
  };

  const handleDeleteReport = async () => {
    setDeleting(true);
    try {
      await API.delete(`/report/delete/${id}`);
      toast.success("Report dihapus");
      navigate("/reports");
    } catch { toast.error("Gagal menghapus report"); setDeleting(false); setDeleteDialog(false); }
  };

  const handleFiles = async (files) => {
    const fd = new FormData();
    for (let f of files) fd.append("images", f);
    setUploading(true);
    try {
      await API.post(`/report/upload/${id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Foto berhasil diupload!");
      fetchReport();
    } catch { toast.error("Upload gagal"); }
    finally { setUploading(false); }
  };

  const deleteImage = async (imgId) => {
    await API.delete(`/report/image/delete/${imgId}`);
    toast.success("Foto dihapus");
    fetchReport();
  };

  const saveCaption = async (imgId, caption) => {
    await API.put(`/report/image/caption/${imgId}`, { caption });
    setReport(prev => ({ ...prev, images: prev.images.map(i => i.id === imgId ? { ...i, caption } : i) }));
  };

  const previewPDF = async () => {
    setPreviewLoading(true);
    try {
      const res = await API.get(`/report/pdf/preview/${id}`, { responseType: "blob" });
      setPreviewUrl(URL.createObjectURL(new Blob([res.data], { type: "application/pdf" })));
    } catch { toast.error("Gagal memuat preview"); }
    finally { setPreviewLoading(false); }
  };

  const downloadPDF = async () => {
    setPdfLoading(true);
    try {
      const res = await API.get(`/report/pdf/${id}`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      Object.assign(document.createElement("a"), { href: url, download: `${report.report_number}_${report.report_type}.pdf` }).click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast.success("PDF downloaded!");
    } catch { toast.error("Gagal generate PDF"); }
    finally { setPdfLoading(false); }
  };

  if (!report) return (
    <div className="flex justify-center items-center h-40">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B3D91]" />
    </div>
  );

  const sections = FIELD_MAP[report.report_type] || [];
  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white";
  const labelClass = "block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5";

  return (
    <div className="max-w-4xl mx-auto">
      {/* Modals */}
      {previewUrl && (
        <PDFPreviewModal url={previewUrl} reportNumber={report.report_number} reportType={report.report_type}
          onClose={() => { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }} />
      )}
      {deleteDialog && (
        <DeleteDialog title="Hapus Report?" description={`Report "${report.report_number}" akan dihapus permanen beserta semua foto.`}
          onConfirm={handleDeleteReport} onCancel={() => setDeleteDialog(false)} loading={deleting} />
      )}

      {/* Back */}
      <button onClick={() => navigate("/reports")} className="flex items-center gap-2 text-sm text-gray-400 hover:text-[#0B3D91] mb-5 transition-colors">
        ← Kembali ke Field Reports
      </button>

      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap gap-2 mb-2">
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${TYPE_BADGES[report.report_type] || "bg-gray-100 text-gray-600"}`}>
                {report.report_type?.charAt(0).toUpperCase() + report.report_type?.slice(1)}
              </span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${STATUS_BADGES[report.status] || "bg-gray-100 text-gray-600"}`}>
                {report.status}
              </span>
            </div>
            <h1 className="text-2xl font-black text-[#0B3D91]">{report.report_number}</h1>
            <p className="text-gray-500 text-sm mt-1">{report.client_name} • {report.project_name}</p>
            {report.report_date && (
              <p className="text-gray-400 text-xs mt-0.5">
                {new Date(report.report_date).toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
            )}
            {report.engineer && (
              <p className="text-gray-400 text-xs mt-0.5">
                Engineer: <span className="font-semibold text-gray-600">{report.engineer.name}</span>
                {report.engineer.position && ` — ${report.engineer.position}`}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {!editMode && (
              <button onClick={openEdit}
                className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-sm font-semibold hover:bg-amber-100 transition-colors">
                ✏ Edit
              </button>
            )}
            <button onClick={previewPDF} disabled={previewLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-sm font-semibold hover:bg-blue-100 transition-colors disabled:opacity-60">
              {previewLoading ? <><div className="w-3.5 h-3.5 border-2 border-blue-700/30 border-t-blue-700 rounded-full animate-spin" /> Loading…</> : "👁 Preview"}
            </button>
            <button onClick={downloadPDF} disabled={pdfLoading}
              className="flex items-center gap-2 px-4 py-2 bg-[#0B3D91] text-white rounded-xl text-sm font-semibold hover:bg-[#1E5CC6] transition-colors disabled:opacity-60">
              {pdfLoading ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating…</> : "⬇ Download PDF"}
            </button>
            <button onClick={() => setDeleteDialog(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors">
              🗑
            </button>
          </div>
        </div>
      </div>

      {/* ── EDIT MODE ─────────────────────────────────────────── */}
      {editMode && (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-6 mb-4">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-amber-700 uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-4 bg-amber-400 rounded-full" /> Edit Mode
            </h3>
            <button onClick={() => setEditMode(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
          </div>

          {/* Base fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div>
              <label className={labelClass}>Report Number</label>
              <input value={editBase.report_number} onChange={e => setEditBase({ ...editBase, report_number: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Report Date</label>
              <input type="date" value={editBase.report_date} onChange={e => setEditBase({ ...editBase, report_date: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Client Name</label>
              <input value={editBase.client_name} onChange={e => setEditBase({ ...editBase, client_name: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Project Name</label>
              <input value={editBase.project_name} onChange={e => setEditBase({ ...editBase, project_name: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Engineer</label>
              <select value={editBase.engineer_id} onChange={e => setEditBase({ ...editBase, engineer_id: e.target.value })} className={inputClass}>
                <option value="">— Pilih Engineer —</option>
                {engineers.map(eng => <option key={eng.id} value={eng.id}>{eng.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select value={editBase.status} onChange={e => setEditBase({ ...editBase, status: e.target.value })} className={inputClass}>
                {["draft", "in-progress", "completed", "approved"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Dynamic fields per report type */}
          {sections.map((sec, si) => (
            <div key={si} className="mb-4">
              <h4 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-5 h-5 bg-[#0B3D91] text-white rounded-full flex items-center justify-center text-[10px] font-bold">{si + 1}</span>
                {sec.section}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sec.fields.map(field => (
                  <div key={field.name} className={field.type === "textarea" ? "sm:col-span-2" : ""}>
                    <label className={labelClass}>{field.label}</label>
                    {field.type === "textarea" ? (
                      <textarea value={editData[field.name] || ""} rows={3}
                        onChange={e => setEditData({ ...editData, [field.name]: e.target.value })}
                        className={inputClass + " resize-none"} />
                    ) : (
                      <input type={field.type || "text"} value={editData[field.name] || ""}
                        onChange={e => setEditData({ ...editData, [field.name]: e.target.value })}
                        className={inputClass} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="flex gap-3 pt-2 border-t border-gray-100 mt-4">
            <button onClick={() => setEditMode(false)} className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50">Batal</button>
            <button onClick={handleSave} disabled={saving}
              className="px-6 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-bold hover:bg-[#1E5CC6] disabled:opacity-60 flex items-center gap-2">
              {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Menyimpan…</> : "✓ Simpan Perubahan"}
            </button>
          </div>
        </div>
      )}

      {/* ── VIEW MODE — Report Data ──────────────────────────── */}
      {!editMode && sections.map((sec, i) => (
        <DataSection key={i} title={sec.section} data={report.data_json} keys={sec.fields.map(f => ({ key: f.name, label: f.label }))} />
      ))}
      {!editMode && sections.length === 0 && report.data_json && Object.keys(report.data_json).length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
          <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-4">Report Data</h3>
          {Object.entries(report.data_json).map(([k, v]) => v ? (
            <div key={k} className="mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{k.replace(/_/g, " ")}</p>
              <p className="text-sm text-gray-800">{String(v)}</p>
            </div>
          ) : null)}
        </div>
      )}

      {/* ── IMAGES (before signatures) ──────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider flex items-center gap-2">
            <span className="w-1.5 h-4 bg-[#0B3D91] rounded-full" /> Dokumentasi & Foto
          </h3>
          {report.images?.length > 0 && (
            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold">{report.images.length} foto</span>
          )}
        </div>

        {report.images?.length > 0 && (
          <div className="mb-4 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 flex items-start gap-2">
            <span className="text-blue-400 text-sm">💡</span>
            <p className="text-xs text-blue-700">Hover foto untuk <strong>edit caption</strong> atau <strong>hapus</strong>. Caption tampil di PDF.</p>
          </div>
        )}

        {/* Drag & Drop */}
        <div
          onDragOver={e => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={e => { e.preventDefault(); setDragActive(false); handleFiles(e.dataTransfer.files); }}
          className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all mb-4 ${dragActive ? "border-[#0B3D91] bg-blue-50" : "border-gray-200 hover:border-[#0B3D91] hover:bg-blue-50"}`}
          onClick={() => document.getElementById("fileInput").click()}
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0B3D91]" />
              <p className="text-gray-500 text-sm">Uploading…</p>
            </div>
          ) : (
            <>
              <p className="text-2xl mb-1">📸</p>
              <p className="text-gray-600 font-medium text-sm">Drop foto atau klik untuk upload</p>
              <p className="text-gray-400 text-xs mt-0.5">PNG, JPG, JPEG</p>
            </>
          )}
        </div>
        <input id="fileInput" type="file" multiple accept="image/*" className="hidden" onChange={e => handleFiles(e.target.files)} />

        {report.images?.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {report.images.map(img => (
              <ImageCard key={img.id} img={img} onDelete={deleteImage} onCaptionSave={saveCaption} />
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-300 text-sm py-4">Belum ada foto</p>
        )}
      </div>

      {/* Bottom actions */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 justify-between items-center">
        <button onClick={() => setDeleteDialog(true)} className="flex items-center gap-2 px-4 py-2 text-red-500 border border-red-200 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors">
          🗑 Hapus Report
        </button>
        <div className="flex gap-2">
          <button onClick={previewPDF} disabled={previewLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-sm font-semibold hover:bg-blue-100 transition-colors disabled:opacity-60">
            {previewLoading ? "Loading…" : "👁 Preview PDF"}
          </button>
          <button onClick={downloadPDF} disabled={pdfLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-semibold hover:bg-[#1E5CC6] transition-colors disabled:opacity-60">
            {pdfLoading ? "Generating…" : "⬇ Download PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}