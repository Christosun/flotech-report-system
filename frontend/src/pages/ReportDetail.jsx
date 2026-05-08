import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../services/api";
import toast from "react-hot-toast";
import { compressImages, formatBytes } from "../utils/imageCompressor";
import {
  ArrowLeft,
  Pencil,
  Eye,
  Download,
  Trash2,
  X,
  Check,
  Camera,
  FileText,
  Image as ImageIcon,
  Loader2,
  EyeOff,
  Zap,
  Info,
  Globe,
  PenLine,
  CheckCircle2,
  UserCheck,
  User,
  Settings2,
} from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_URL;
const MULTILINE_SECTION_THRESHOLD = 1;
function getTextareaRows(sectionIndex) {
  return sectionIndex >= MULTILINE_SECTION_THRESHOLD ? 6 : 3;
}

// ─── Language Options ─────────────────────────────────────────────────────────
const LANG_OPTIONS = [
  { id: "en", label: "English", flag: "🇬🇧" },
  { id: "id", label: "Bahasa Indonesia", flag: "🇮🇩" },
];

// ─── English Field Definitions ───────────────────────────────────────────────
const COMMISSIONING_FIELDS_EN = [
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
const INVESTIGATION_FIELDS_EN = [
  { section: "Incident Information", fields: [
    { name: "incident_date", label: "Incident Date & Time", type: "datetime-local" },
    { name: "incident_location", label: "Incident Location", type: "text" },
    { name: "equipment_involved", label: "Equipment / System Involved", type: "text" },
    { name: "reported_by", label: "Reported By", type: "text" },
  ]},
  { section: "Problem Description", fields: [
    { name: "incident_description", label: "Incident Description", type: "textarea" },
    { name: "symptoms_observed", label: "Symptoms Observed", type: "textarea" },
    { name: "impact_severity", label: "Impact & Severity Level", type: "textarea" },
  ]},
  { section: "Investigation Findings", fields: [
    { name: "investigation_method", label: "Investigation Method Used", type: "textarea" },
    { name: "root_cause", label: "Root Cause Analysis", type: "textarea" },
    { name: "contributing_factors", label: "Contributing Factors", type: "textarea" },
    { name: "evidence_data", label: "Evidence & Supporting Data", type: "textarea" },
  ]},
  { section: "Corrective Actions", fields: [
    { name: "immediate_actions", label: "Immediate Actions Taken", type: "textarea" },
    { name: "long_term_actions", label: "Long-term Corrective Actions", type: "textarea" },
    { name: "preventive_measures", label: "Preventive Measures", type: "textarea" },
    { name: "follow_up", label: "Follow-up Required", type: "textarea" },
    { name: "conclusion", label: "Conclusion", type: "textarea" },
  ]},
];
const TROUBLESHOOTING_FIELDS_EN = [
  { section: "Problem Identification", fields: [
    { name: "equipment_system", label: "Equipment / System", type: "text" },
    { name: "location", label: "Location", type: "text" },
    { name: "problem_reported_by", label: "Problem Reported By", type: "text" },
    { name: "problem_date", label: "Date Problem Occurred", type: "date" },
    { name: "problem_description", label: "Problem Description", type: "textarea" },
  ]},
  { section: "Diagnostic Process", fields: [
    { name: "symptoms", label: "Symptoms Observed", type: "textarea" },
    { name: "initial_assessment", label: "Initial Assessment", type: "textarea" },
    { name: "diagnostic_steps", label: "Diagnostic Steps Taken", type: "textarea" },
    { name: "tests_measurements", label: "Tests & Measurements Performed", type: "textarea" },
    { name: "fault_found", label: "Fault / Root Cause Found", type: "textarea" },
  ]},
  { section: "Resolution", fields: [
    { name: "solution_applied", label: "Solution Applied", type: "textarea" },
    { name: "parts_replaced", label: "Parts / Components Replaced", type: "textarea" },
    { name: "verification_tests", label: "Verification Tests After Fix", type: "textarea" },
    { name: "result_after_fix", label: "Result After Fix", type: "text" },
    { name: "recommendations", label: "Recommendations for Future", type: "textarea" },
  ]},
];
const SERVICE_FIELDS_EN = [
  { section: "Service Information", fields: [
    { name: "equipment_asset", label: "Equipment / Asset Name", type: "text" },
    { name: "asset_id", label: "Asset ID / Tag Number", type: "text" },
    { name: "location", label: "Location", type: "text" },
    { name: "service_type", label: "Service Type (Preventive / Corrective / Periodic)", type: "text" },
    { name: "last_service_date", label: "Last Service Date", type: "date" },
  ]},
  { section: "Service Performed", fields: [
    { name: "work_description", label: "Work Description", type: "textarea" },
    { name: "activities_performed", label: "Activities Performed (Detail)", type: "textarea" },
    { name: "parts_used", label: "Parts / Materials Used", type: "textarea" },
    { name: "calibration_data", label: "Calibration / Measurement Data", type: "textarea" },
    { name: "service_duration", label: "Service Duration (hours)", type: "text" },
  ]},
  { section: "Findings & Observations", fields: [
    { name: "condition_before", label: "Condition Before Service", type: "textarea" },
    { name: "issues_found", label: "Issues / Anomalies Found", type: "textarea" },
    { name: "condition_after", label: "Condition After Service", type: "textarea" },
  ]},
  { section: "Service Outcome", fields: [
    { name: "service_result", label: "Service Result (Pass / Fail / Conditional)", type: "text" },
    { name: "next_service_date", label: "Next Recommended Service Date", type: "date" },
    { name: "recommendations", label: "Recommendations", type: "textarea" },
    { name: "client_notes", label: "Client Notes / Sign-off", type: "textarea" },
    { name: "follow_up", label: "Follow-up Required", type: "textarea" },
  ]},
];

// ─── Bahasa Indonesia Field Definitions ──────────────────────────────────────
const COMMISSIONING_FIELDS_ID = [
  { section: "Informasi Lokasi & Peralatan", fields: [
    { name: "site_location", label: "Lokasi Site", type: "text" },
    { name: "equipment_name", label: "Nama Peralatan", type: "text" },
    { name: "equipment_model", label: "Model / Tipe Peralatan", type: "text" },
    { name: "serial_number", label: "Nomor Seri", type: "text" },
    { name: "manufacturer", label: "Pabrikan / Manufaktur", type: "text" },
    { name: "installation_date", label: "Tanggal Instalasi", type: "date" },
  ]},
  { section: "Pemeriksaan Pra-Komisioning", fields: [
    { name: "visual_inspection", label: "Hasil Inspeksi Visual", type: "textarea" },
    { name: "safety_checks", label: "Pemeriksaan Keselamatan yang Dilakukan", type: "textarea" },
    { name: "electrical_checks", label: "Pemeriksaan Kelistrikan", type: "textarea" },
    { name: "mechanical_checks", label: "Pemeriksaan Mekanikal", type: "textarea" },
  ]},
  { section: "Hasil Pengujian Komisioning", fields: [
    { name: "test_procedures", label: "Prosedur Pengujian yang Dilakukan", type: "textarea" },
    { name: "performance_parameters", label: "Parameter Kinerja (setpoint, nilai)", type: "textarea" },
    { name: "test_results", label: "Hasil Pengujian & Pengukuran", type: "textarea" },
  ]},
  { section: "Status Akhir", fields: [
    { name: "commissioning_result", label: "Hasil Komisioning (Lulus/Gagal/Bersyarat)", type: "text" },
    { name: "issues_found", label: "Temuan Masalah (jika ada)", type: "textarea" },
    { name: "recommendations", label: "Rekomendasi", type: "textarea" },
    { name: "client_acceptance", label: "Penerimaan / Catatan Klien", type: "textarea" },
  ]},
];
const INVESTIGATION_FIELDS_ID = [
  { section: "Informasi Insiden", fields: [
    { name: "incident_date", label: "Tanggal & Waktu Insiden", type: "datetime-local" },
    { name: "incident_location", label: "Lokasi Insiden", type: "text" },
    { name: "equipment_involved", label: "Peralatan / Sistem yang Terlibat", type: "text" },
    { name: "reported_by", label: "Dilaporkan Oleh", type: "text" },
  ]},
  { section: "Deskripsi Masalah", fields: [
    { name: "incident_description", label: "Deskripsi Insiden", type: "textarea" },
    { name: "symptoms_observed", label: "Gejala yang Teramati", type: "textarea" },
    { name: "impact_severity", label: "Dampak & Tingkat Keparahan", type: "textarea" },
  ]},
  { section: "Temuan Investigasi", fields: [
    { name: "investigation_method", label: "Metode Investigasi yang Digunakan", type: "textarea" },
    { name: "root_cause", label: "Analisis Akar Penyebab (Root Cause Analysis)", type: "textarea" },
    { name: "contributing_factors", label: "Faktor-faktor Penyebab", type: "textarea" },
    { name: "evidence_data", label: "Bukti & Data Pendukung", type: "textarea" },
  ]},
  { section: "Tindakan Korektif", fields: [
    { name: "immediate_actions", label: "Tindakan Segera yang Diambil", type: "textarea" },
    { name: "long_term_actions", label: "Tindakan Korektif Jangka Panjang", type: "textarea" },
    { name: "preventive_measures", label: "Langkah Pencegahan", type: "textarea" },
    { name: "follow_up", label: "Tindak Lanjut yang Diperlukan", type: "textarea" },
    { name: "conclusion", label: "Kesimpulan", type: "textarea" },
  ]},
];
const TROUBLESHOOTING_FIELDS_ID = [
  { section: "Identifikasi Masalah", fields: [
    { name: "equipment_system", label: "Peralatan / Sistem", type: "text" },
    { name: "location", label: "Lokasi", type: "text" },
    { name: "problem_reported_by", label: "Masalah Dilaporkan Oleh", type: "text" },
    { name: "problem_date", label: "Tanggal Masalah Terjadi", type: "date" },
    { name: "problem_description", label: "Deskripsi Masalah", type: "textarea" },
  ]},
  { section: "Proses Diagnosa", fields: [
    { name: "symptoms", label: "Gejala yang Teramati", type: "textarea" },
    { name: "initial_assessment", label: "Penilaian Awal", type: "textarea" },
    { name: "diagnostic_steps", label: "Langkah-langkah Diagnosa", type: "textarea" },
    { name: "tests_measurements", label: "Pengujian & Pengukuran yang Dilakukan", type: "textarea" },
    { name: "fault_found", label: "Kerusakan / Akar Penyebab yang Ditemukan", type: "textarea" },
  ]},
  { section: "Penyelesaian", fields: [
    { name: "solution_applied", label: "Solusi yang Diterapkan", type: "textarea" },
    { name: "parts_replaced", label: "Suku Cadang / Komponen yang Diganti", type: "textarea" },
    { name: "verification_tests", label: "Pengujian Verifikasi Setelah Perbaikan", type: "textarea" },
    { name: "result_after_fix", label: "Hasil Setelah Perbaikan", type: "text" },
    { name: "recommendations", label: "Rekomendasi untuk ke Depan", type: "textarea" },
  ]},
];
const SERVICE_FIELDS_ID = [
  { section: "Informasi Servis", fields: [
    { name: "equipment_asset", label: "Nama Peralatan / Aset", type: "text" },
    { name: "asset_id", label: "ID Aset / Nomor Tag", type: "text" },
    { name: "location", label: "Lokasi", type: "text" },
    { name: "service_type", label: "Jenis Servis (Preventif / Korektif / Berkala)", type: "text" },
    { name: "last_service_date", label: "Tanggal Servis Terakhir", type: "date" },
  ]},
  { section: "Pekerjaan Servis", fields: [
    { name: "work_description", label: "Deskripsi Pekerjaan", type: "textarea" },
    { name: "activities_performed", label: "Kegiatan yang Dilakukan (Detail)", type: "textarea" },
    { name: "parts_used", label: "Suku Cadang / Material yang Digunakan", type: "textarea" },
    { name: "calibration_data", label: "Data Kalibrasi / Pengukuran", type: "textarea" },
    { name: "service_duration", label: "Durasi Servis (jam)", type: "text" },
  ]},
  { section: "Temuan & Observasi", fields: [
    { name: "condition_before", label: "Kondisi Sebelum Servis", type: "textarea" },
    { name: "issues_found", label: "Masalah / Anomali yang Ditemukan", type: "textarea" },
    { name: "condition_after", label: "Kondisi Setelah Servis", type: "textarea" },
  ]},
  { section: "Hasil Servis", fields: [
    { name: "service_result", label: "Hasil Servis (Lulus / Gagal / Bersyarat)", type: "text" },
    { name: "next_service_date", label: "Tanggal Servis Berikutnya yang Direkomendasikan", type: "date" },
    { name: "recommendations", label: "Rekomendasi", type: "textarea" },
    { name: "client_notes", label: "Catatan Klien / Tanda Tangan", type: "textarea" },
    { name: "follow_up", label: "Tindak Lanjut yang Diperlukan", type: "textarea" },
  ]},
];

const FIELD_MAP = {
  en: {
    commissioning: COMMISSIONING_FIELDS_EN,
    investigation: INVESTIGATION_FIELDS_EN,
    troubleshooting: TROUBLESHOOTING_FIELDS_EN,
    service: SERVICE_FIELDS_EN,
  },
  id: {
    commissioning: COMMISSIONING_FIELDS_ID,
    investigation: INVESTIGATION_FIELDS_ID,
    troubleshooting: TROUBLESHOOTING_FIELDS_ID,
    service: SERVICE_FIELDS_ID,
  },
};

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

/* ─── Compact PDF Settings Bar ─────────────────────────────── */
function PDFSettingsBar({ pdfLanguage, onLangChange, inclSig, onSigChange, onClose, readOnly }) {
  const pill = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold cursor-pointer transition-all duration-150 select-none";
  const on   = "bg-[#0B3D91] text-white border-[#0B3D91]";
  const off  = "bg-white text-gray-500 border-gray-200 hover:border-[#0B3D91]/50 hover:text-[#0B3D91]";
  const readOnlyPill = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold select-none";

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 mb-4">
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
          <Settings2 className="w-3 h-3" />
          PDF Report Settings
        </p>
        {onClose && (
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {/* Language */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-medium">Language</span>
          <div className="flex gap-1">
            {readOnly ? (
              <>
                <span className={`${readOnlyPill} ${pdfLanguage === "en" ? on : "bg-white text-gray-400 border-gray-200"}`}>🇬🇧 English</span>
                <span className={`${readOnlyPill} ${pdfLanguage === "id" ? on : "bg-white text-gray-400 border-gray-200"}`}>🇮🇩 Bahasa</span>
              </>
            ) : (
              <>
                <button type="button" onClick={() => onLangChange("en")} className={`${pill} ${pdfLanguage === "en" ? on : off}`}>🇬🇧 English</button>
                <button type="button" onClick={() => onLangChange("id")} className={`${pill} ${pdfLanguage === "id" ? on : off}`}>🇮🇩 Bahasa</button>
              </>
            )}
          </div>
        </div>

        <div className="hidden sm:block w-px h-5 bg-gray-200" />

        {/* Signature */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-medium">Signature on PDF</span>
          <div className="flex gap-1">
            {readOnly ? (
              <>
                <span className={`${readOnlyPill} ${inclSig ? on : "bg-white text-gray-400 border-gray-200"}`}>
                  <UserCheck className="w-3 h-3" /> Include Signature
                </span>
                <span className={`${readOnlyPill} ${!inclSig ? on : "bg-white text-gray-400 border-gray-200"}`}>
                  <User className="w-3 h-3" /> Reported By Only
                </span>
              </>
            ) : (
              <>
                <button type="button" onClick={() => onSigChange(true)} className={`${pill} ${inclSig ? on : off}`}>
                  <UserCheck className="w-3 h-3" /> Include Signature
                </button>
                <button type="button" onClick={() => onSigChange(false)} className={`${pill} ${!inclSig ? on : off}`}>
                  <User className="w-3 h-3" /> Reported By Only
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <p className={`mt-2.5 text-xs px-3 py-1.5 rounded-lg flex items-start gap-1.5 transition-all
        ${inclSig ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>
        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        {inclSig
          ? "PDF will include an empty signature block for the client to sign."
          : <><em className="font-semibold not-italic">"Reported by"</em> section only — engineer name, position, and signature.</>
        }
      </p>
    </div>
  );
}

// ─── Delete Dialog ────────────────────────────────────────────────────────────
function DeleteDialog({ title, description, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-gradient-to-br from-red-50 to-rose-100 px-6 pt-6 pb-4 text-center">
          <div className="w-14 h-14 bg-red-100 border-4 border-red-200 rounded-full flex items-center justify-center mx-auto mb-3">
            <Trash2 className="w-7 h-7 text-red-500" />
          </div>
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>
        <div className="px-6 py-4 flex gap-3">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PDF Preview Modal ────────────────────────────────────────────────────────
function PDFPreviewModal({ url, reportNumber, reportType, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
      <div className="flex items-center justify-between px-5 py-3 bg-[#0B3D91]">
        <span className="text-white font-bold text-sm flex items-center gap-2">
          <FileText className="w-4 h-4 opacity-70" />
          {reportNumber} — Preview
        </span>
        <div className="flex items-center gap-2">
          <a href={url} download={`${reportNumber}_${reportType}.pdf`}
            className="px-4 py-1.5 bg-white text-[#0B3D91] rounded-lg text-xs font-bold hover:bg-blue-50 flex items-center gap-1.5 transition-colors">
            <Download className="w-3.5 h-3.5" /> Download
          </a>
          <button onClick={onClose} className="text-white/70 hover:text-white px-2 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      <iframe src={url} className="flex-1 w-full" title="PDF Preview" style={{ border: "none" }} />
    </div>
  );
}

// ─── Data Section (view mode) ─────────────────────────────────────────────────
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

// ─── Image Card ───────────────────────────────────────────────────────────────
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
    catch { toast.error("Failed to save caption"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await onDelete(img.id); }
    catch { toast.error("Failed to delete"); setDeleting(false); setDeleteDialog(false); }
  };

  useEffect(() => { if (editingCaption && inputRef.current) inputRef.current.focus(); }, [editingCaption]);

  return (
    <>
      {deleteDialog && (
        <DeleteDialog
          title="Delete Photo?"
          description="This photo will be permanently deleted and cannot be recovered."
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
            <button onClick={() => setEditingCaption(true)}
              className="w-7 h-7 bg-white/90 text-[#0B3D91] rounded-lg flex items-center justify-center hover:bg-white transition-colors shadow">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setDeleteDialog(true)}
              className="w-7 h-7 bg-white/90 text-red-500 rounded-lg flex items-center justify-center hover:bg-white transition-colors shadow">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="p-2">
          {editingCaption ? (
            <div className="flex flex-col gap-1.5">
              <input ref={inputRef} value={caption}
                onChange={e => setCaption(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") handleSaveCaption();
                  if (e.key === "Escape") { setCaption(img.caption || ""); setEditingCaption(false); }
                }}
                placeholder="Caption…"
                className="w-full text-xs border border-[#0B3D91] rounded-lg px-2 py-1.5 focus:outline-none"
              />
              <div className="flex gap-1">
                <button onClick={handleSaveCaption} disabled={saving}
                  className="flex-1 py-1 bg-[#0B3D91] text-white text-xs rounded-lg font-semibold disabled:opacity-60 flex items-center justify-center gap-1">
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  Save
                </button>
                <button onClick={() => { setCaption(img.caption || ""); setEditingCaption(false); }}
                  className="px-2 py-1 border border-gray-200 text-gray-500 text-xs rounded-lg flex items-center justify-center">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ) : (
            <p onClick={() => setEditingCaption(true)}
              className="text-xs text-gray-400 cursor-pointer hover:text-[#0B3D91] transition-colors line-clamp-2 min-h-[2rem]">
              {caption || <span className="italic text-gray-300">Add caption/information...</span>}
            </p>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Compression Status ───────────────────────────────────────────────────────
function CompressionStatus({ items }) {
  if (!items.length) return null;
  const done = items.filter(i => i.done).length;
  const total = items.length;
  const pct = Math.round((done / total) * 100);
  const savings = items.reduce((acc, i) => acc + (i.savedBytes || 0), 0);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs mb-0.5">
        <span className="font-semibold text-[#0B3D91]">Compressing {total} image{total > 1 ? "s" : ""}…</span>
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

// ─── Main Component ───────────────────────────────────────────────────────────
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

  const [compressItems, setCompressItems] = useState([]);
  const [compressing, setCompressing] = useState(false);

  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [editBase, setEditBase] = useState({});
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [editSectionVis, setEditSectionVis] = useState({});
  const [editLang, setEditLang] = useState("en");
  const [editIncludeClientSig, setEditIncludeClientSig] = useState(true);

  // Delete
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
    const savedLang = report.data_json?._lang || "en";
    const savedClientSig = report.data_json?._include_client_signature ?? true;
    setEditBase({
      report_number: report.report_number || "",
      client_name: report.client_name || "",
      project_name: report.project_name || "",
      report_date: report.report_date || "",
      engineer_id: report.engineer?.id || "",
      status: report.status || "draft",
    });
    setEditData({ ...(report.data_json || {}) });
    setEditSectionVis(report.data_json?._section_visibility || {});
    setEditLang(savedLang);
    setEditIncludeClientSig(savedClientSig);
    setEditMode(true);
  };

  const toggleEditSection = (si) => setEditSectionVis(prev => ({ ...prev, [si]: !(prev[si] ?? true) }));
  const isEditSectionIncluded = (si) => editSectionVis[si] ?? true;

  const handleSave = async () => {
    setSaving(true);
    try {
      await API.put(`/report/update/${id}`, {
        ...editBase,
        engineer_id: editBase.engineer_id ? parseInt(editBase.engineer_id) : null,
        data_json: {
          ...editData,
          _section_visibility: editSectionVis,
          _lang: editLang,
          _include_client_signature: editIncludeClientSig,
        },
      });
      toast.success("Report successfully updated! ✅");
      setEditMode(false);
      fetchReport();
    } catch { toast.error("Failed to save changes"); }
    finally { setSaving(false); }
  };

  const handleDeleteReport = async () => {
    setDeleting(true);
    try {
      await API.delete(`/report/delete/${id}`);
      toast.success("Report deleted");
      navigate("/reports");
    } catch { toast.error("Failed to delete report"); setDeleting(false); setDeleteDialog(false); }
  };

  const handleFiles = async (files) => {
    const fileArr = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (!fileArr.length) return;
    setCompressing(true);
    const progressItems = fileArr.map((f, idx) => ({ idx, name: f.name, originalSize: f.size, done: false, savedBytes: 0 }));
    setCompressItems(progressItems);
    const compressed = [];
    for (let i = 0; i < fileArr.length; i++) {
      const original = fileArr[i];
      try {
        const { compressImage } = await import("../utils/imageCompressor");
        const result = await compressImage(original);
        compressed.push(result);
        setCompressItems(prev => prev.map(item => item.idx === i ? { ...item, done: true, savedBytes: Math.max(0, original.size - result.size) } : item));
      } catch {
        compressed.push(original);
        setCompressItems(prev => prev.map(item => item.idx === i ? { ...item, done: true, savedBytes: 0 } : item));
      }
    }
    setCompressing(false);
    const originalTotal = fileArr.reduce((s, f) => s + f.size, 0);
    const compressedTotal = compressed.reduce((s, f) => s + f.size, 0);
    const savedTotal = originalTotal - compressedTotal;
    const savedPct = originalTotal > 0 ? Math.round((savedTotal / originalTotal) * 100) : 0;
    const fd = new FormData();
    compressed.forEach(f => fd.append("images", f));
    setUploading(true);
    try {
      await API.post(`/report/upload/${id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      if (savedTotal > 0) {
        toast.success(`${fileArr.length} photo uploaded ✅\nCompressed: saved ${formatBytes(savedTotal)} (${savedPct}% smaller)`, { duration: 4000 });
      } else {
        toast.success(`${fileArr.length} photo uploaded successfully!`);
      }
      fetchReport();
    } catch { toast.error("Upload failed"); }
    finally { setUploading(false); setCompressItems([]); }
  };

  const deleteImage = async (imgId) => {
    await API.delete(`/report/image/delete/${imgId}`);
    toast.success("Photo deleted");
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
    } catch { toast.error("Failed to load preview"); }
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
    } catch { toast.error("Failed to generate PDF"); }
    finally { setPdfLoading(false); }
  };

  if (!report) return (
    <div className="flex justify-center items-center h-40">
      <Loader2 className="h-10 w-10 animate-spin text-[#0B3D91]" />
    </div>
  );

  const viewLang = report.data_json?._lang || "en";
  const includeClientSig = report.data_json?._include_client_signature ?? true;
  const sections = (FIELD_MAP[viewLang]?.[report.report_type]) || (FIELD_MAP["en"]?.[report.report_type]) || [];
  const editSections = (FIELD_MAP[editLang]?.[report.report_type]) || (FIELD_MAP["en"]?.[report.report_type]) || [];

  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white";
  const labelClass = "block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5";

  return (
    <div className="w-full">
      {/* Modals */}
      {previewUrl && (
        <PDFPreviewModal
          url={previewUrl}
          reportNumber={report.report_number}
          reportType={report.report_type}
          onClose={() => { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }}
        />
      )}
      {deleteDialog && (
        <DeleteDialog
          title="Delete Report?"
          description={`Report "${report.report_number}" will be permanently deleted along with all photos.`}
          onConfirm={handleDeleteReport}
          onCancel={() => setDeleteDialog(false)}
          loading={deleting}
        />
      )}

      {/* Back */}
      <button onClick={() => navigate("/reports")}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-[#0B3D91] mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Field Reports
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
                {new Date(report.report_date).toLocaleDateString("en-EN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
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
                <Pencil className="w-4 h-4" /> Edit
              </button>
            )}
            <button onClick={previewPDF} disabled={previewLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-sm font-semibold hover:bg-blue-100 transition-colors disabled:opacity-60">
              {previewLoading
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…</>
                : <><Eye className="w-4 h-4" /> Preview</>}
            </button>
            <button onClick={downloadPDF} disabled={pdfLoading}
              className="flex items-center gap-2 px-4 py-2 bg-[#0B3D91] text-white rounded-xl text-sm font-semibold hover:bg-[#1E5CC6] transition-colors disabled:opacity-60">
              {pdfLoading
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</>
                : <><Download className="w-4 h-4" /> Download PDF</>}
            </button>
            <button onClick={() => setDeleteDialog(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── EDIT MODE ─────────────────────────────────────────────────────── */}
      {editMode && (
        <div className="space-y-4 mb-4">

          {/* Compact PDF Settings Bar in edit mode */}
          <PDFSettingsBar
            pdfLanguage={editLang}
            onLangChange={setEditLang}
            inclSig={editIncludeClientSig}
            onSigChange={setEditIncludeClientSig}
            onClose={() => setEditMode(false)}
          />

          <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-amber-700 uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-4 bg-amber-400 rounded-full" /> Edit Mode — Report Information
              </h3>
              <button onClick={() => setEditMode(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Info hint */}
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-5 text-xs text-blue-700">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                Changing the language will update the field labels displayed in the form. The actual content you've entered is preserved.
              </span>
            </div>

            {/* Base fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <div>
                <label className={labelClass}>Report Number</label>
                <input value={editBase.report_number}
                  onChange={e => setEditBase({ ...editBase, report_number: e.target.value })}
                  className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Report Date</label>
                <input type="date" value={editBase.report_date}
                  onChange={e => setEditBase({ ...editBase, report_date: e.target.value })}
                  className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Client Name</label>
                <input value={editBase.client_name}
                  onChange={e => setEditBase({ ...editBase, client_name: e.target.value })}
                  className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Project Name</label>
                <input value={editBase.project_name}
                  onChange={e => setEditBase({ ...editBase, project_name: e.target.value })}
                  className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Engineer</label>
                <select value={editBase.engineer_id}
                  onChange={e => setEditBase({ ...editBase, engineer_id: e.target.value })}
                  className={inputClass}>
                  <option value="">— Select Engineer —</option>
                  {engineers.map(eng => <option key={eng.id} value={eng.id}>{eng.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <select value={editBase.status}
                  onChange={e => setEditBase({ ...editBase, status: e.target.value })}
                  className={inputClass}>
                  {["draft", "in-progress", "completed", "approved"].map(s =>
                    <option key={s} value={s}>{s}</option>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Dynamic fields per report type */}
          {editSections.map((sec, si) => {
            const included = isEditSectionIncluded(si);
            const isMultiline = si >= MULTILINE_SECTION_THRESHOLD;
            return (
              <div key={si} className={`rounded-xl border p-4 transition-all ${
                included ? "bg-white border-gray-100" : "bg-gray-50 border-gray-200 opacity-60"
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider flex items-center gap-2">
                      <span className="w-5 h-5 bg-[#0B3D91] text-white rounded-full flex items-center justify-center text-[10px] font-bold">{si + 1}</span>
                      {sec.section}
                    </h4>
                    {isMultiline && included && (
                      <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-full font-semibold">Multi-line</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleEditSection(si)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      included
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                        : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200"
                    }`}>
                    {included ? <><Eye className="w-3.5 h-3.5" /> Show in PDF</> : <><EyeOff className="w-3.5 h-3.5" /> Hide in PDF</>}
                  </button>
                </div>

                {!included && (
                  <p className="text-xs text-gray-400 italic">This section will not appear in the PDF.</p>
                )}

                {included && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {sec.fields.map(field => (
                      <div key={field.name} className={field.type === "textarea" ? "sm:col-span-2" : ""}>
                        <label className={labelClass}>{field.label}</label>
                        {field.type === "textarea" ? (
                          <textarea
                            value={editData[field.name] || ""}
                            rows={getTextareaRows(si)}
                            onChange={e => setEditData({ ...editData, [field.name]: e.target.value })}
                            className={inputClass + " resize-y leading-relaxed"}
                            style={{ minHeight: isMultiline ? "120px" : "80px" }}
                          />
                        ) : (
                          <input
                            type={field.type || "text"}
                            value={editData[field.name] || ""}
                            onChange={e => setEditData({ ...editData, [field.name]: e.target.value })}
                            className={inputClass}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

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

      {/* ── VIEW MODE ─────────────────────────────────────────────── */}
      {!editMode && (
        <>
          {/* Compact PDF Settings Bar — read-only, shows current settings */}
          <PDFSettingsBar
            pdfLanguage={viewLang}
            onLangChange={() => openEdit()}
            inclSig={includeClientSig}
            onSigChange={() => openEdit()}
            readOnly
          />

          {/* Report data sections */}
          {sections.map((sec, i) => (
            <DataSection
              key={i}
              title={sec.section}
              data={report.data_json}
              keys={sec.fields.map(f => ({ key: f.name, label: f.label }))}
            />
          ))}
          {sections.length === 0 && report.data_json && Object.keys(report.data_json).length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
              <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-4">Report Data</h3>
              {Object.entries(report.data_json).map(([k, v]) => v && !k.startsWith("_") ? (
                <div key={k} className="mb-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{k.replace(/_/g, " ")}</p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{String(v)}</p>
                </div>
              ) : null)}
            </div>
          )}
        </>
      )}

      {/* ── IMAGES ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider flex items-center gap-2">
            <span className="w-1.5 h-4 bg-[#0B3D91] rounded-full" /> Documentation & Photos
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
              <Zap className="w-2.5 h-2.5" /> Auto-compressed
            </span>
            {report.images?.length > 0 && (
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                {report.images.length} photo
              </span>
            )}
          </div>
        </div>

        {report.images?.length > 0 && (
          <div className="mb-4 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700">
              Hover photo for <strong>edit caption</strong> or <strong>delete</strong>. Captions appear in PDF.
            </p>
          </div>
        )}

        <div
          onDragOver={e => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={e => { e.preventDefault(); setDragActive(false); handleFiles(e.dataTransfer.files); }}
          className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all mb-4
            ${dragActive ? "border-[#0B3D91] bg-blue-50" : "border-gray-200 hover:border-[#0B3D91] hover:bg-blue-50"}`}
          onClick={() => !compressing && !uploading && document.getElementById("fileInput").click()}
        >
          {compressing && compressItems.length > 0 ? (
            <div className="px-2 py-1"><CompressionStatus items={compressItems} /></div>
          ) : uploading ? (
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-[#0B3D91]" />
              <p className="text-gray-500 text-sm">Uploading…</p>
            </div>
          ) : (
            <>
              <Camera className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-600 font-medium text-sm">Drop photo or click to upload</p>
              <p className="text-gray-400 text-xs mt-0.5">PNG, JPG, JPEG · Auto-compressed before upload</p>
              <p className="text-[10px] text-emerald-500 font-medium mt-1.5 flex items-center justify-center gap-1">
                <Zap className="w-2.5 h-2.5" /> Images are automatically compressed to keep PDF fast & smooth
              </p>
            </>
          )}
        </div>

        <input id="fileInput" type="file" multiple accept="image/*" className="hidden"
          onChange={e => handleFiles(e.target.files)} />

        {report.images?.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {report.images.map(img => (
              <ImageCard key={img.id} img={img} onDelete={deleteImage} onCaptionSave={saveCaption} />
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-300 text-sm py-4 flex items-center justify-center gap-2">
            <ImageIcon className="w-4 h-4" /> No photos yet
          </p>
        )}
      </div>

      {/* Bottom actions */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 justify-between items-center">
        <button onClick={() => setDeleteDialog(true)}
          className="flex items-center gap-2 px-4 py-2 text-red-500 border border-red-200 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors">
          <Trash2 className="w-4 h-4" /> Delete Report
        </button>
        <div className="flex gap-2">
          <button onClick={previewPDF} disabled={previewLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-sm font-semibold hover:bg-blue-100 transition-colors disabled:opacity-60">
            {previewLoading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading…</>
              : <><Eye className="w-4 h-4" /> Preview PDF</>}
          </button>
          <button onClick={downloadPDF} disabled={pdfLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-semibold hover:bg-[#1E5CC6] transition-colors disabled:opacity-60">
            {pdfLoading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
              : <><Download className="w-4 h-4" /> Download PDF</>}
          </button>
        </div>
      </div>
    </div>
  );
}