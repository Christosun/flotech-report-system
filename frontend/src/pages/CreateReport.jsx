import { useState, useEffect } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const REPORT_TYPES = [
  {
    id: "commissioning",
    label: "Commissioning Report",
    icon: "🔧",
    color: "bg-blue-50 border-blue-300 text-blue-700",
    activeColor: "bg-blue-600 border-blue-600 text-white",
    description: "For new equipment installation and commissioning activities",
    prefix: "CR",
  },
  {
    id: "investigation",
    label: "Investigation Report",
    icon: "🔍",
    color: "bg-purple-50 border-purple-300 text-purple-700",
    activeColor: "bg-purple-600 border-purple-600 text-white",
    description: "For incident investigation and root cause analysis",
    prefix: "IR",
  },
  {
    id: "troubleshooting",
    label: "Troubleshooting Report",
    icon: "⚡",
    color: "bg-orange-50 border-orange-300 text-orange-700",
    activeColor: "bg-orange-600 border-orange-600 text-white",
    description: "For diagnosing and resolving technical issues",
    prefix: "TR",
  },
  {
    id: "service",
    label: "Service Report",
    icon: "🛠️",
    color: "bg-green-50 border-green-300 text-green-700",
    activeColor: "bg-green-600 border-green-600 text-white",
    description: "For preventive maintenance and service activities",
    prefix: "SR",
  }
];

const COMMISSIONING_FIELDS = [
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

const INVESTIGATION_FIELDS = [
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

const TROUBLESHOOTING_FIELDS = [
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

const SERVICE_FIELDS = [
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
  { section: "Next Service", fields: [
    { name: "next_service_date", label: "Next Recommended Service Date", type: "date" },
    { name: "recommendations", label: "Recommendations", type: "textarea" },
    { name: "client_notes", label: "Client Notes / Sign-off", type: "textarea" },
  ]},
];

const FIELD_MAP = {
  commissioning: COMMISSIONING_FIELDS,
  investigation: INVESTIGATION_FIELDS,
  troubleshooting: TROUBLESHOOTING_FIELDS,
  service: SERVICE_FIELDS,
};

export default function CreateReport() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState(null);
  const [engineers, setEngineers] = useState([]);
  const [loading, setLoading] = useState(false);
  // sectionIncluded[si] = true/false — whether section si+1 onwards is included in PDF
  // Section 0 is always included; toggles start from index 1
  const [sectionIncluded, setSectionIncluded] = useState({});

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

  // Reset dataForm and section toggles when type changes
  useEffect(() => {
    setDataForm({});
    setSectionIncluded({});
  }, [selectedType]);

  // Auto-generate report number when type is selected
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
      // Count reports of this type in current year
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
      // Build section_visibility map to pass to backend
      const sections = FIELD_MAP[selectedType] || [];
      const sectionVisibility = {};
      sections.forEach((sec, si) => {
        sectionVisibility[si] = isSectionIncluded(si);
      });
      const res = await API.post("/report/create", {
        ...baseForm,
        report_type: selectedType,
        engineer_id: baseForm.engineer_id ? parseInt(baseForm.engineer_id) : null,
        data_json: { ...dataForm, _section_visibility: sectionVisibility },
      });
      toast.success("Report created successfully! 🚀");
      navigate(`/reports/${res.data.report_id}`);
    } catch {
      toast.error("Failed to create report");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white transition-all";
  const labelClass = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5";

  const sections = selectedType ? FIELD_MAP[selectedType] : [];

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
              ${step >= s ? "bg-primary text-white" : "bg-gray-200 text-gray-400"}`}>
              {s}
            </div>
            <span className={`text-sm font-medium hidden sm:block ${step >= s ? "text-primary" : "text-gray-400"}`}>
              {s === 1 ? "Report Type" : s === 2 ? "Basic Info" : "Report Details"}
            </span>
            {s < 3 && <div className={`w-8 h-0.5 mx-1 ${step > s ? "bg-primary" : "bg-gray-200"}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Select Report Type */}
      {step === 1 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Select Report Type</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {REPORT_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`p-5 rounded-xl border-2 text-left transition-all duration-200 hover:shadow-md
                  ${selectedType === type.id
                    ? "border-primary bg-blue-50 shadow-md scale-[1.01]"
                    : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{type.icon}</span>
                  <div>
                    <p className="font-bold text-gray-800">{type.label}</p>
                    <p className="text-xs text-gray-500 mt-1">{type.description}</p>
                  </div>
                </div>
                {selectedType === type.id && (
                  <div className="mt-3 flex items-center gap-1 text-primary text-xs font-semibold">
                    <span>✓</span> Selected
                  </div>
                )}
              </button>
            ))}
          </div>
          <button
            onClick={() => { if (selectedType) setStep(2); else toast.error("Please select a report type"); }}
            className="bg-primary text-white px-8 py-3 rounded-xl font-semibold hover:bg-secondary transition-colors"
          >
            Continue →
          </button>
        </div>
      )}

      {/* Step 2: Basic Info */}
      {step === 2 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-6">
            <span className="text-2xl">{REPORT_TYPES.find(t => t.id === selectedType)?.icon}</span>
            <div>
              <h2 className="text-lg font-bold text-gray-800">Basic Information</h2>
              <p className="text-sm text-gray-400">{REPORT_TYPES.find(t => t.id === selectedType)?.label}</p>
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

          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep(1)} className="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors">
              ← Back
            </button>
            <button
              onClick={() => {
                if (!baseForm.client_name || !baseForm.project_name) {
                  toast.error("Please fill in all required fields");
                  return;
                }
                setStep(3);
              }}
              className="bg-primary text-white px-8 py-3 rounded-xl font-semibold hover:bg-secondary transition-colors"
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Report-specific fields */}
      {step === 3 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">{REPORT_TYPES.find(t => t.id === selectedType)?.icon}</span>
            <div>
              <h2 className="text-lg font-bold text-gray-800">Report Details</h2>
              <p className="text-sm text-gray-400">{REPORT_TYPES.find(t => t.id === selectedType)?.label}</p>
            </div>
          </div>

          {/* Info hint for toggles */}
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 mb-5 text-xs text-blue-700">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Gunakan tombol <strong>Tampilkan di PDF / Sembunyikan dari PDF</strong> pada setiap seksi untuk mengontrol konten yang akan muncul di dokumen PDF.</span>
          </div>

          {sections.map((section, si) => {
            const included = isSectionIncluded(si);
            return (
              <div
                key={si}
                className={`rounded-2xl shadow-sm border p-6 mb-4 transition-all ${
                  included ? "bg-white border-gray-100" : "bg-gray-50 border-gray-200 opacity-60"
                }`}
              >
                {/* Section header with toggle */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                    <span className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs">{si + 1}</span>
                    {section.section}
                  </h3>
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
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Tampilkan di PDF
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
                        </svg>
                        Sembunyikan dari PDF
                      </>
                    )}
                  </button>
                </div>

                {/* Collapsed placeholder */}
                {!included && (
                  <p className="text-xs text-gray-400 italic">Seksi ini tidak akan ditampilkan di PDF. Klik tombol di atas untuk mengaktifkan.</p>
                )}

                {/* Fields */}
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
                            rows={3}
                            placeholder={`Enter ${field.label.toLowerCase()}...`}
                            className={inputClass + " resize-none"}
                          />
                        ) : (
                          <input
                            type={field.type || "text"}
                            name={field.name}
                            value={dataForm[field.name] || ""}
                            onChange={handleDataChange}
                            placeholder={field.type !== "date" && field.type !== "datetime-local" ? `Enter ${field.label.toLowerCase()}...` : ""}
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
            <button onClick={() => setStep(2)} className="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors">
              ← Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-primary text-white px-8 py-3 rounded-xl font-semibold hover:bg-secondary transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </>
              ) : "✓ Create Report"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}