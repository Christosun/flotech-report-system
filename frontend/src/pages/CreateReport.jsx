import { useState, useEffect } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Settings2,
  Search,
  Zap,
  Wrench,
  CheckCircle2,
  Eye,
  EyeOff,
  Info,
  ChevronRight,
  ChevronLeft,
  Loader2,
  ClipboardCheck,
  Globe,
  PenLine,
  FileText,
  UserCheck,
  User,
} from "lucide-react";

// ─── Language Templates ──────────────────────────────────────────────────────
const LANG_OPTIONS = [
  { id: "en", label: "English", flag: "🇬🇧" },
  { id: "id", label: "Bahasa Indonesia", flag: "🇮🇩" },
];

const REPORT_TYPES = [
  {
    id: "commissioning",
    label: "Commissioning Report",
    icon: Settings2,
    iconColor: "text-blue-600",
    color: "bg-blue-50 border-blue-300 text-blue-700",
    activeColor: "bg-blue-600 border-blue-600 text-white",
    description: "For new equipment installation and commissioning activities",
    prefix: "CR",
  },
  {
    id: "investigation",
    label: "Investigation Report",
    icon: Search,
    iconColor: "text-purple-600",
    color: "bg-purple-50 border-purple-300 text-purple-700",
    activeColor: "bg-purple-600 border-purple-600 text-white",
    description: "For incident investigation and root cause analysis",
    prefix: "IR",
  },
  {
    id: "troubleshooting",
    label: "Troubleshooting Report",
    icon: Zap,
    iconColor: "text-orange-600",
    color: "bg-orange-50 border-orange-300 text-orange-700",
    activeColor: "bg-orange-600 border-orange-600 text-white",
    description: "For diagnosing and resolving technical issues",
    prefix: "TR",
  },
  {
    id: "service",
    label: "Service Report",
    icon: Wrench,
    iconColor: "text-green-600",
    color: "bg-green-50 border-green-300 text-green-700",
    activeColor: "bg-green-600 border-green-600 text-white",
    description: "For preventive maintenance and service activities",
    prefix: "SR",
  },
];

// ─── Field Definitions — English ─────────────────────────────────────────────
const COMMISSIONING_FIELDS_EN = [
  { section: "Site & Equipment Information", fields: [
    { name: "site_location", label: "Site Location", type: "text", required: true },
    { name: "equipment_name", label: "Equipment Name", type: "text", required: true },
    { name: "equipment_model", label: "Equipment Model / Type", type: "text" },
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
    { name: "test_procedures", label: "Test Procedures Performed", type: "textarea", required: true },
    { name: "performance_parameters", label: "Performance Parameters (setpoints, values)", type: "textarea" },
    { name: "test_results", label: "Test Results & Measurements", type: "textarea", required: true },
  ]},
  { section: "Final Status", fields: [
    { name: "commissioning_result", label: "Commissioning Result (Pass/Fail/Conditional)", type: "text", required: true },
    { name: "issues_found", label: "Issues Found (if any)", type: "textarea" },
    { name: "recommendations", label: "Recommendations", type: "textarea" },
    { name: "client_acceptance", label: "Client Acceptance / Notes", type: "textarea" },
  ]},
];

const INVESTIGATION_FIELDS_EN = [
  { section: "Incident Information", fields: [
    { name: "incident_date", label: "Incident Date & Time", type: "datetime-local", required: true },
    { name: "incident_location", label: "Incident Location", type: "text", required: true },
    { name: "equipment_involved", label: "Equipment / System Involved", type: "text" },
    { name: "reported_by", label: "Reported By", type: "text" },
  ]},
  { section: "Problem Description", fields: [
    { name: "incident_description", label: "Incident Description", type: "textarea", required: true },
    { name: "symptoms_observed", label: "Symptoms Observed", type: "textarea" },
    { name: "impact_severity", label: "Impact & Severity Level", type: "textarea" },
  ]},
  { section: "Investigation Findings", fields: [
    { name: "investigation_method", label: "Investigation Method Used", type: "textarea" },
    { name: "root_cause", label: "Root Cause Analysis", type: "textarea", required: true },
    { name: "contributing_factors", label: "Contributing Factors", type: "textarea" },
    { name: "evidence_data", label: "Evidence & Supporting Data", type: "textarea" },
  ]},
  { section: "Corrective Actions", fields: [
    { name: "immediate_actions", label: "Immediate Actions Taken", type: "textarea", required: true },
    { name: "long_term_actions", label: "Long-term Corrective Actions", type: "textarea" },
    { name: "preventive_measures", label: "Preventive Measures", type: "textarea" },
    { name: "follow_up", label: "Follow-up Required", type: "textarea" },
    { name: "conclusion", label: "Conclusion", type: "textarea" },
  ]},
];

const TROUBLESHOOTING_FIELDS_EN = [
  { section: "Problem Identification", fields: [
    { name: "equipment_system", label: "Equipment / System", type: "text", required: true },
    { name: "location", label: "Location", type: "text" },
    { name: "problem_reported_by", label: "Problem Reported By", type: "text" },
    { name: "problem_date", label: "Date Problem Occurred", type: "date" },
    { name: "problem_description", label: "Problem Description", type: "textarea", required: true },
  ]},
  { section: "Diagnostic Process", fields: [
    { name: "symptoms", label: "Symptoms Observed", type: "textarea", required: true },
    { name: "initial_assessment", label: "Initial Assessment", type: "textarea" },
    { name: "diagnostic_steps", label: "Diagnostic Steps Taken", type: "textarea" },
    { name: "tests_measurements", label: "Tests & Measurements Performed", type: "textarea" },
    { name: "fault_found", label: "Fault / Root Cause Found", type: "textarea", required: true },
  ]},
  { section: "Resolution", fields: [
    { name: "solution_applied", label: "Solution Applied", type: "textarea", required: true },
    { name: "parts_replaced", label: "Parts / Components Replaced", type: "textarea" },
    { name: "verification_tests", label: "Verification Tests After Fix", type: "textarea" },
    { name: "result_after_fix", label: "Result After Fix", type: "text", required: true },
    { name: "recommendations", label: "Recommendations for Future", type: "textarea" },
  ]},
];

const SERVICE_FIELDS_EN = [
  { section: "Service Information", fields: [
    { name: "equipment_asset", label: "Equipment / Asset Name", type: "text", required: true },
    { name: "asset_id", label: "Asset ID / Tag Number", type: "text" },
    { name: "location", label: "Location", type: "text", required: true },
    { name: "service_type", label: "Service Type (Preventive / Corrective / Periodic)", type: "text" },
    { name: "last_service_date", label: "Last Service Date", type: "date" },
  ]},
  { section: "Service Performed", fields: [
    { name: "work_description", label: "Work Description", type: "textarea", required: true },
    { name: "activities_performed", label: "Activities Performed (Detail)", type: "textarea", required: true },
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
    { name: "service_result", label: "Service Result (Pass / Fail / Conditional)", type: "text", required: true },
    { name: "next_service_date", label: "Next Recommended Service Date", type: "date" },
    { name: "recommendations", label: "Recommendations", type: "textarea" },
    { name: "client_notes", label: "Client Notes / Sign-off", type: "textarea" },
    { name: "follow_up", label: "Follow-up Required", type: "textarea" },
  ]},
];

// ─── Field Definitions — Bahasa Indonesia ────────────────────────────────────
const COMMISSIONING_FIELDS_ID = [
  { section: "Informasi Lokasi & Peralatan", fields: [
    { name: "site_location", label: "Lokasi Site", type: "text", required: true },
    { name: "equipment_name", label: "Nama Peralatan", type: "text", required: true },
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
    { name: "test_procedures", label: "Prosedur Pengujian yang Dilakukan", type: "textarea", required: true },
    { name: "performance_parameters", label: "Parameter Kinerja (setpoint, nilai)", type: "textarea" },
    { name: "test_results", label: "Hasil Pengujian & Pengukuran", type: "textarea", required: true },
  ]},
  { section: "Status Akhir", fields: [
    { name: "commissioning_result", label: "Hasil Komisioning (Lulus/Gagal/Bersyarat)", type: "text", required: true },
    { name: "issues_found", label: "Temuan Masalah (jika ada)", type: "textarea" },
    { name: "recommendations", label: "Rekomendasi", type: "textarea" },
    { name: "client_acceptance", label: "Penerimaan / Catatan Klien", type: "textarea" },
  ]},
];

const INVESTIGATION_FIELDS_ID = [
  { section: "Informasi Insiden", fields: [
    { name: "incident_date", label: "Tanggal & Waktu Insiden", type: "datetime-local", required: true },
    { name: "incident_location", label: "Lokasi Insiden", type: "text", required: true },
    { name: "equipment_involved", label: "Peralatan / Sistem yang Terlibat", type: "text" },
    { name: "reported_by", label: "Dilaporkan Oleh", type: "text" },
  ]},
  { section: "Deskripsi Masalah", fields: [
    { name: "incident_description", label: "Deskripsi Insiden", type: "textarea", required: true },
    { name: "symptoms_observed", label: "Gejala yang Teramati", type: "textarea" },
    { name: "impact_severity", label: "Dampak & Tingkat Keparahan", type: "textarea" },
  ]},
  { section: "Temuan Investigasi", fields: [
    { name: "investigation_method", label: "Metode Investigasi yang Digunakan", type: "textarea" },
    { name: "root_cause", label: "Analisis Akar Penyebab (Root Cause Analysis)", type: "textarea", required: true },
    { name: "contributing_factors", label: "Faktor-faktor Penyebab", type: "textarea" },
    { name: "evidence_data", label: "Bukti & Data Pendukung", type: "textarea" },
  ]},
  { section: "Tindakan Korektif", fields: [
    { name: "immediate_actions", label: "Tindakan Segera yang Diambil", type: "textarea", required: true },
    { name: "long_term_actions", label: "Tindakan Korektif Jangka Panjang", type: "textarea" },
    { name: "preventive_measures", label: "Langkah Pencegahan", type: "textarea" },
    { name: "follow_up", label: "Tindak Lanjut yang Diperlukan", type: "textarea" },
    { name: "conclusion", label: "Kesimpulan", type: "textarea" },
  ]},
];

const TROUBLESHOOTING_FIELDS_ID = [
  { section: "Identifikasi Masalah", fields: [
    { name: "equipment_system", label: "Peralatan / Sistem", type: "text", required: true },
    { name: "location", label: "Lokasi", type: "text" },
    { name: "problem_reported_by", label: "Masalah Dilaporkan Oleh", type: "text" },
    { name: "problem_date", label: "Tanggal Masalah Terjadi", type: "date" },
    { name: "problem_description", label: "Deskripsi Masalah", type: "textarea", required: true },
  ]},
  { section: "Proses Diagnosa", fields: [
    { name: "symptoms", label: "Gejala yang Teramati", type: "textarea", required: true },
    { name: "initial_assessment", label: "Penilaian Awal", type: "textarea" },
    { name: "diagnostic_steps", label: "Langkah-langkah Diagnosa", type: "textarea" },
    { name: "tests_measurements", label: "Pengujian & Pengukuran yang Dilakukan", type: "textarea" },
    { name: "fault_found", label: "Kerusakan / Akar Penyebab yang Ditemukan", type: "textarea", required: true },
  ]},
  { section: "Penyelesaian", fields: [
    { name: "solution_applied", label: "Solusi yang Diterapkan", type: "textarea", required: true },
    { name: "parts_replaced", label: "Suku Cadang / Komponen yang Diganti", type: "textarea" },
    { name: "verification_tests", label: "Pengujian Verifikasi Setelah Perbaikan", type: "textarea" },
    { name: "result_after_fix", label: "Hasil Setelah Perbaikan", type: "text", required: true },
    { name: "recommendations", label: "Rekomendasi untuk ke Depan", type: "textarea" },
  ]},
];

const SERVICE_FIELDS_ID = [
  { section: "Informasi Servis", fields: [
    { name: "equipment_asset", label: "Nama Peralatan / Aset", type: "text", required: true },
    { name: "asset_id", label: "ID Aset / Nomor Tag", type: "text" },
    { name: "location", label: "Lokasi", type: "text", required: true },
    { name: "service_type", label: "Jenis Servis (Preventif / Korektif / Berkala)", type: "text" },
    { name: "last_service_date", label: "Tanggal Servis Terakhir", type: "date" },
  ]},
  { section: "Pekerjaan Servis", fields: [
    { name: "work_description", label: "Deskripsi Pekerjaan", type: "textarea", required: true },
    { name: "activities_performed", label: "Kegiatan yang Dilakukan (Detail)", type: "textarea", required: true },
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
    { name: "service_result", label: "Hasil Servis (Lulus / Gagal / Bersyarat)", type: "text", required: true },
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

const MULTILINE_SECTION_THRESHOLD = 1;
function getTextareaRows(sectionIndex) {
  return sectionIndex >= MULTILINE_SECTION_THRESHOLD ? 6 : 3;
}

/* ─── Compact PDF Settings Bar ─────────────────────────────── */
function PDFSettingsBar({ pdfLanguage, onLangChange, inclSig, onSigChange }) {
  const pill = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold cursor-pointer transition-all duration-150 select-none";
  const on   = "bg-[#0B3D91] text-white border-[#0B3D91]";
  const off  = "bg-white text-gray-500 border-gray-200 hover:border-[#0B3D91]/50 hover:text-[#0B3D91]";

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 mb-4">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
        <FileText className="w-3 h-3" />
        PDF Report Settings
      </p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {/* Language */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-medium">Language</span>
          <div className="flex gap-1">
            <button type="button" onClick={() => onLangChange("en")}
              className={`${pill} ${pdfLanguage === "en" ? on : off}`}>
              🇬🇧 English
            </button>
            <button type="button" onClick={() => onLangChange("id")}
              className={`${pill} ${pdfLanguage === "id" ? on : off}`}>
              🇮🇩 Bahasa
            </button>
          </div>
        </div>

        <div className="hidden sm:block w-px h-5 bg-gray-200" />

        {/* Client Signature */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-medium">Signature on PDF</span>
          <div className="flex gap-1">
            <button type="button" onClick={() => onSigChange(true)}
              className={`${pill} ${inclSig ? on : off}`}>
              <UserCheck className="w-3 h-3" /> Include Signature
            </button>
            <button type="button" onClick={() => onSigChange(false)}
              className={`${pill} ${!inclSig ? on : off}`}>
              <User className="w-3 h-3" /> Reported By Only
            </button>
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

export default function CreateReport() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState(null);
  const [engineers, setEngineers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sectionIncluded, setSectionIncluded] = useState({});
  const [lang, setLang] = useState("en");
  const [includeClientSignature, setIncludeClientSignature] = useState(true);

  const [baseForm, setBaseForm] = useState({
    report_number: "",
    client_name: "",
    project_name: "",
    report_date: new Date().toISOString().split("T")[0],
    engineer_id: "",
  });

  const [dataForm, setDataForm] = useState({});

  useEffect(() => {
    API.get("/engineer/").then(res => setEngineers(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setDataForm({});
    setSectionIncluded({});
  }, [selectedType]);

  useEffect(() => {
    if (!selectedType) return;
    generateReportNumber(selectedType);
  }, [selectedType]);

  const generateReportNumber = async (type) => {
    const typeObj = REPORT_TYPES.find(t => t.id === type);
    if (!typeObj) return;
    const prefix = typeObj.prefix;
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const yearStr = String(now.getFullYear());
    try {
      const res = await API.get("/report/list");
      const reports = (res.data || []).filter(r => r.report_type === type);
      const thisYear = reports.filter(r => {
        const num = r.report_number || "";
        return num.startsWith(`${prefix}-${yearStr}`);
      });
      const seqs = thisYear
        .map(r => parseInt((r.report_number || "").split("-").pop(), 10))
        .filter(n => !isNaN(n));
      const nextSeq = seqs.length > 0 ? Math.max(...seqs) + 1 : 1;
      setBaseForm(f => ({
        ...f,
        report_number: `${prefix}-${dateStr}-${String(nextSeq).padStart(3, "0")}`,
      }));
    } catch {
      setBaseForm(f => ({
        ...f,
        report_number: `${prefix}-${dateStr}-001`,
      }));
    }
  };

  const handleBaseChange = (e) => setBaseForm({ ...baseForm, [e.target.name]: e.target.value });
  const handleDataChange = (e) => setDataForm({ ...dataForm, [e.target.name]: e.target.value });

  const toggleSection = (si) => {
    setSectionIncluded(prev => ({ ...prev, [si]: !(prev[si] ?? true) }));
  };
  const isSectionIncluded = (si) => sectionIncluded[si] ?? true;

  const handleSubmit = async () => {
    if (!selectedType) return;
    try {
      setLoading(true);
      const sections = FIELD_MAP[lang][selectedType] || [];
      const sectionVisibility = {};
      sections.forEach((_, si) => {
        sectionVisibility[si] = isSectionIncluded(si);
      });
      const res = await API.post("/report/create", {
        ...baseForm,
        report_type: selectedType,
        engineer_id: baseForm.engineer_id ? parseInt(baseForm.engineer_id) : null,
        data_json: {
          ...dataForm,
          _section_visibility: sectionVisibility,
          _lang: lang,
          _include_client_signature: includeClientSignature,
        },
      });
      toast.success("Report created successfully!");
      navigate(`/reports/${res.data.report_id}`);
    } catch {
      toast.error("Failed to create report");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] focus:border-transparent bg-white transition-all";
  const labelClass = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5";

  const sections = selectedType ? (FIELD_MAP[lang][selectedType] || []) : [];
  const selectedTypeObj = REPORT_TYPES.find(t => t.id === selectedType);

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Create New Report</h1>
        <p className="text-gray-500 text-sm mt-1">Fill in the details to generate a professional engineering report</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
              ${step >= s ? "bg-[#0B3D91] text-white" : "bg-gray-200 text-gray-400"}`}>
              {s}
            </div>
            <span className={`text-sm font-medium hidden sm:block ${step >= s ? "text-[#0B3D91]" : "text-gray-400"}`}>
              {s === 1 ? "Report Type" : s === 2 ? "Basic Info" : "Report Details"}
            </span>
            {s < 3 && <div className={`w-8 h-0.5 mx-1 ${step > s ? "bg-[#0B3D91]" : "bg-gray-200"}`} />}
          </div>
        ))}
      </div>

      {/* ── Step 1: Select Report Type ─────────────────────────────────────────
          NOTE: Language selector removed from here — it's now in Step 2 PDF Settings
      ── */}
      {step === 1 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Select Report Type</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {REPORT_TYPES.map((type) => {
              const IconComponent = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={`p-5 rounded-xl border-2 text-left transition-all duration-200 hover:shadow-md
                    ${selectedType === type.id
                      ? "border-[#0B3D91] bg-blue-50 shadow-md scale-[1.01]"
                      : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${selectedType === type.id ? "bg-[#0B3D91]/10" : "bg-gray-100"}`}>
                      <IconComponent
                        size={22}
                        className={selectedType === type.id ? "text-[#0B3D91]" : type.iconColor}
                        strokeWidth={1.75}
                      />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">{type.label}</p>
                      <p className="text-xs text-gray-500 mt-1">{type.description}</p>
                    </div>
                  </div>
                  {selectedType === type.id && (
                    <div className="mt-3 flex items-center gap-1 text-[#0B3D91] text-xs font-semibold">
                      <CheckCircle2 size={13} strokeWidth={2.5} />
                      Selected
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => { if (selectedType) setStep(2); else toast.error("Please select a report type"); }}
            className="bg-[#0B3D91] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#1E5CC6] transition-colors flex items-center gap-2"
          >
            Continue
            <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* ── Step 2: Basic Info ──────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">

          {/* ── Compact PDF Settings Bar (replaces the old PDF Options card) ── */}
          <PDFSettingsBar
            pdfLanguage={lang}
            onLangChange={setLang}
            inclSig={includeClientSignature}
            onSigChange={setIncludeClientSignature}
          />

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6">
              {selectedTypeObj && (
                <div className="p-2.5 rounded-xl bg-[#0B3D91]/10">
                  <selectedTypeObj.icon size={22} className="text-[#0B3D91]" strokeWidth={1.75} />
                </div>
              )}
              <div>
                <h2 className="text-lg font-bold text-gray-800">Basic Information</h2>
                <p className="text-sm text-gray-400">{selectedTypeObj?.label}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Report Number</label>
                <input
                  name="report_number"
                  value={baseForm.report_number}
                  readOnly
                  className={inputClass + " bg-gray-50 text-gray-500 cursor-not-allowed font-mono"}
                />
                <p className="text-xs text-gray-400 mt-1">Auto-generated, cannot be changed</p>
              </div>
              <div>
                <label className={labelClass}>Report Date *</label>
                <input type="date" name="report_date" value={baseForm.report_date} onChange={handleBaseChange}
                  className={inputClass} required />
              </div>
              <div>
                <label className={labelClass}>Client Name *</label>
                <input name="client_name" value={baseForm.client_name} onChange={handleBaseChange}
                  placeholder="Client / Company name" className={inputClass} required />
              </div>
              <div>
                <label className={labelClass}>Project Name *</label>
                <input name="project_name" value={baseForm.project_name} onChange={handleBaseChange}
                  placeholder="Project name" className={inputClass} required />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Assign Engineer</label>
                <select name="engineer_id" value={baseForm.engineer_id} onChange={handleBaseChange} className={inputClass}>
                  <option value="">— Select Engineer —</option>
                  {engineers.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.position || e.department || "Engineer"})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <ChevronLeft size={16} strokeWidth={2.5} />
              Back
            </button>
            <button
              onClick={() => {
                if (!baseForm.client_name || !baseForm.project_name) {
                  toast.error("Please fill in all required fields");
                  return;
                }
                setStep(3);
              }}
              className="bg-[#0B3D91] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#1E5CC6] transition-colors flex items-center gap-2"
            >
              Continue
              <ChevronRight size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Report-specific fields ─────────────────────── */}
      {step === 3 && (
        <div>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              {selectedTypeObj && (
                <div className="p-2.5 rounded-xl bg-[#0B3D91]/10">
                  <selectedTypeObj.icon size={22} className="text-[#0B3D91]" strokeWidth={1.75} />
                </div>
              )}
              <div>
                <h2 className="text-lg font-bold text-gray-800">Report Details</h2>
                <p className="text-sm text-gray-400">{selectedTypeObj?.label}</p>
              </div>
            </div>
            {/* PDF settings recap badges */}
            <div className="flex gap-2 flex-shrink-0">
              <span className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-[#0B3D91]/10 text-[#0B3D91] border border-[#0B3D91]/20">
                <Globe size={11} />
                {LANG_OPTIONS.find(l => l.id === lang)?.flag} {LANG_OPTIONS.find(l => l.id === lang)?.label}
              </span>
              <span className={`hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border
                ${includeClientSignature
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                {includeClientSignature
                  ? <><UserCheck size={11} /> Client Sig. ✓</>
                  : <><User size={11} /> Reported By Only</>}
              </span>
            </div>
          </div>

          {/* Info hint */}
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-5 text-xs text-blue-700">
            <Info size={15} className="flex-shrink-0 mt-0.5" strokeWidth={2} />
            <span>
              Use <strong>Show in PDF / Hide in PDF</strong> to control what appears in the document.
              {" "}Sections 2–4 support <strong>multi-line input</strong> — press{" "}
              <kbd className="bg-blue-100 px-1 py-0.5 rounded text-[10px] font-mono">Enter</kbd> for a new line.
            </span>
          </div>

          {sections.map((section, si) => {
            const included = isSectionIncluded(si);
            const isMultilineSection = si >= MULTILINE_SECTION_THRESHOLD;
            return (
              <div
                key={si}
                className={`rounded-2xl shadow-sm border p-6 mb-4 transition-all ${
                  included ? "bg-white border-gray-100" : "bg-gray-50 border-gray-200 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[#0B3D91] uppercase tracking-wider flex items-center gap-2">
                      <span className="w-6 h-6 bg-[#0B3D91] text-white rounded-full flex items-center justify-center text-xs">{si + 1}</span>
                      {section.section}
                    </h3>
                    {isMultilineSection && included && (
                      <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-full font-semibold">
                        Multi-line
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleSection(si)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      included
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                        : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200"
                    }`}
                  >
                    {included ? (
                      <><Eye size={13} strokeWidth={2} /> Show in PDF</>
                    ) : (
                      <><EyeOff size={13} strokeWidth={2} /> Hide in PDF</>
                    )}
                  </button>
                </div>

                {!included && (
                  <p className="text-xs text-gray-400 italic">This section will not be displayed in the PDF.</p>
                )}

                {included && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {section.fields.map((field) => (
                      <div key={field.name} className={field.type === "textarea" ? "sm:col-span-2" : ""}>
                        <label className={labelClass}>
                          {field.label} {field.required && <span className="text-red-400">*</span>}
                        </label>
                        {field.type === "textarea" ? (
                          <textarea
                            name={field.name}
                            value={dataForm[field.name] || ""}
                            onChange={handleDataChange}
                            rows={getTextareaRows(si)}
                            placeholder={`${field.label}...`}
                            className={inputClass + " resize-y leading-relaxed"}
                            style={{ minHeight: isMultilineSection ? "120px" : "80px" }}
                          />
                        ) : (
                          <input
                            type={field.type || "text"}
                            name={field.name}
                            value={dataForm[field.name] || ""}
                            onChange={handleDataChange}
                            placeholder={field.type !== "date" && field.type !== "datetime-local" ? `${field.label}...` : ""}
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

          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <ChevronLeft size={16} strokeWidth={2.5} />
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-[#0B3D91] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#1E5CC6] transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> Creating...</>
              ) : (
                <><ClipboardCheck size={16} strokeWidth={2} /> Create Report</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}