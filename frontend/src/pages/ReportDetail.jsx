import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../services/api";
import toast from "react-hot-toast";

const TYPE_COLORS = {
  commissioning: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" },
  investigation: { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-200" },
  troubleshooting: { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200" },
  service: { bg: "bg-green-100", text: "text-green-700", border: "border-green-200" },
};

const STATUS_OPTIONS = ["draft", "in-progress", "completed", "approved"];

function DataSection({ title, data, keys }) {
  const hasContent = keys.some(k => data?.[k]);
  if (!hasContent) return null;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
      <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
        <span className="w-1.5 h-4 bg-primary rounded-full" />
        {title}
      </h3>
      <div className="space-y-3">
        {keys.map(({ key, label }) => {
          const val = data?.[key];
          if (!val) return null;
          return (
            <div key={key}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
              <p className="text-sm text-gray-800 leading-relaxed">{val}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const fetchReport = useCallback(async () => {
    try {
      const res = await API.get(`/report/detail/${id}`);
      setReport(res.data);
    } catch {
      toast.error("Failed to load report");
    }
  }, [id]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const handleFiles = async (files) => {
    const formData = new FormData();
    for (let file of files) formData.append("images", file);
    try {
      setUploading(true);
      await API.post(`/report/upload/${id}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Images uploaded! 🚀");
      fetchReport();
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const updateStatus = async (newStatus) => {
    setUpdatingStatus(true);
    try {
      await API.put(`/report/status/${id}`, { status: newStatus });
      toast.success("Status updated");
      fetchReport();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const downloadPDF = async () => {
    setDownloadingPDF(true);
    try {
      const res = await API.get(`/report/pdf/${id}`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${report.report_number}_${report.report_type}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded!");
    } catch {
      toast.error("PDF generation failed");
    } finally {
      setDownloadingPDF(false);
    }
  };

  if (!report) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  const rtype = report.report_type?.toLowerCase() || "";
  const colors = TYPE_COLORS[rtype] || { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-200" };
  const data = report.data_json || {};

  const SECTIONS_MAP = {
    commissioning: [
      { title: "Site & Equipment Information", keys: [
        { key: "site_location", label: "Site Location" },
        { key: "equipment_name", label: "Equipment Name" },
        { key: "equipment_model", label: "Model / Type" },
        { key: "serial_number", label: "Serial Number" },
        { key: "manufacturer", label: "Manufacturer" },
        { key: "installation_date", label: "Installation Date" },
      ]},
      { title: "Pre-Commissioning Checks", keys: [
        { key: "visual_inspection", label: "Visual Inspection" },
        { key: "safety_checks", label: "Safety Checks" },
        { key: "electrical_checks", label: "Electrical Checks" },
        { key: "mechanical_checks", label: "Mechanical Checks" },
      ]},
      { title: "Test Results", keys: [
        { key: "test_procedures", label: "Test Procedures" },
        { key: "performance_parameters", label: "Performance Parameters" },
        { key: "test_results", label: "Test Results" },
      ]},
      { title: "Final Status", keys: [
        { key: "commissioning_result", label: "Result" },
        { key: "issues_found", label: "Issues Found" },
        { key: "recommendations", label: "Recommendations" },
        { key: "client_acceptance", label: "Client Acceptance" },
      ]},
    ],
    investigation: [
      { title: "Incident Information", keys: [
        { key: "incident_date", label: "Incident Date" },
        { key: "incident_location", label: "Location" },
        { key: "equipment_involved", label: "Equipment Involved" },
        { key: "reported_by", label: "Reported By" },
      ]},
      { title: "Problem Description", keys: [
        { key: "incident_description", label: "Description" },
        { key: "symptoms_observed", label: "Symptoms" },
        { key: "impact_severity", label: "Impact & Severity" },
      ]},
      { title: "Findings", keys: [
        { key: "investigation_method", label: "Method" },
        { key: "root_cause", label: "Root Cause" },
        { key: "contributing_factors", label: "Contributing Factors" },
        { key: "evidence_data", label: "Evidence" },
      ]},
      { title: "Corrective Actions", keys: [
        { key: "immediate_actions", label: "Immediate Actions" },
        { key: "long_term_actions", label: "Long-term Actions" },
        { key: "preventive_measures", label: "Preventive Measures" },
        { key: "follow_up", label: "Follow-up" },
        { key: "conclusion", label: "Conclusion" },
      ]},
    ],
    troubleshooting: [
      { title: "Problem Identification", keys: [
        { key: "equipment_system", label: "Equipment / System" },
        { key: "location", label: "Location" },
        { key: "problem_reported_by", label: "Reported By" },
        { key: "problem_date", label: "Date Occurred" },
        { key: "problem_description", label: "Problem Description" },
      ]},
      { title: "Diagnostic Process", keys: [
        { key: "symptoms", label: "Symptoms" },
        { key: "initial_assessment", label: "Initial Assessment" },
        { key: "diagnostic_steps", label: "Diagnostic Steps" },
        { key: "tests_measurements", label: "Tests & Measurements" },
        { key: "fault_found", label: "Fault Found" },
      ]},
      { title: "Resolution", keys: [
        { key: "solution_applied", label: "Solution Applied" },
        { key: "parts_replaced", label: "Parts Replaced" },
        { key: "verification_tests", label: "Verification Tests" },
        { key: "result_after_fix", label: "Result After Fix" },
        { key: "recommendations", label: "Recommendations" },
      ]},
    ],
    service: [
      { title: "Service Information", keys: [
        { key: "equipment_asset", label: "Equipment / Asset" },
        { key: "asset_id", label: "Asset ID" },
        { key: "location", label: "Location" },
        { key: "service_type", label: "Service Type" },
        { key: "last_service_date", label: "Last Service Date" },
      ]},
      { title: "Work Performed", keys: [
        { key: "work_description", label: "Work Description" },
        { key: "activities_performed", label: "Activities Performed" },
        { key: "parts_used", label: "Parts Used" },
        { key: "calibration_data", label: "Calibration Data" },
        { key: "service_duration", label: "Duration" },
      ]},
      { title: "Findings & Observations", keys: [
        { key: "condition_before", label: "Condition Before" },
        { key: "issues_found", label: "Issues Found" },
        { key: "condition_after", label: "Condition After" },
      ]},
      { title: "Next Service", keys: [
        { key: "next_service_date", label: "Next Service Date" },
        { key: "recommendations", label: "Recommendations" },
        { key: "client_notes", label: "Client Notes" },
      ]},
    ],
  };

  const sections = SECTIONS_MAP[rtype] || [];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back */}
      <button onClick={() => navigate("/reports")} className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary mb-5 transition-colors">
        ← Back to Reports
      </button>

      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${colors.bg} ${colors.text}`}>
                {report.report_type?.toUpperCase()}
              </span>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-600">
                {report.status?.replace("-", " ").toUpperCase()}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">{report.report_number}</h1>
            <p className="text-gray-500 text-sm mt-1">{report.client_name} — {report.project_name}</p>
            <p className="text-gray-400 text-xs mt-0.5">
              {report.report_date ? new Date(report.report_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "No date"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={report.status}
              onChange={e => updateStatus(e.target.value)}
              disabled={updatingStatus}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary bg-white"
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s.replace("-", " ").toUpperCase()}</option>
              ))}
            </select>
            <button
              onClick={downloadPDF}
              disabled={downloadingPDF}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-secondary disabled:opacity-60 transition-colors"
            >
              {downloadingPDF ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "⬇️"}
              Download PDF
            </button>
          </div>
        </div>
      </div>

      {/* Engineer Card */}
      {report.engineer && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-5 mb-5">
          <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-3">Assigned Engineer</h3>
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-lg">{report.engineer.name?.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-800">{report.engineer.name}</p>
              <p className="text-xs text-gray-500">{report.engineer.position} {report.engineer.department ? `• ${report.engineer.department}` : ""}</p>
              {report.engineer.certification && <p className="text-xs text-gray-400 mt-0.5">Cert: {report.engineer.certification}</p>}
            </div>
            {report.engineer.signature_data && (
              <div className="text-right">
                <p className="text-xs text-gray-400 mb-1">Signature</p>
                <img
                  src={report.engineer.signature_data}
                  alt="Signature"
                  className="h-12 bg-white rounded-lg border border-blue-200 p-1 object-contain"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Report content sections */}
      {sections.length > 0 ? (
        sections.map((sec, i) => (
          <DataSection key={i} title={sec.title} data={data} keys={sec.keys} />
        ))
      ) : (
        Object.keys(data).length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
            <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-4">Report Data</h3>
            {Object.entries(data).map(([k, v]) => (
              <div key={k} className="mb-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{k.replace(/_/g, " ")}</p>
                <p className="text-sm text-gray-800">{String(v)}</p>
              </div>
            ))}
          </div>
        )
      )}

      {/* Image Upload */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
        <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
          <span className="w-1.5 h-4 bg-primary rounded-full" />
          Documentation & Photos
        </h3>

        {/* Drag & Drop */}
        <div
          onDragOver={e => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={e => {
            e.preventDefault();
            setDragActive(false);
            if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
          }}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all mb-5
            ${dragActive ? "border-primary bg-blue-50 scale-[1.01]" : "border-gray-200 hover:border-primary hover:bg-blue-50"}`}
          onClick={() => document.getElementById("fileInput").click()}
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              <p className="text-gray-500">Uploading...</p>
            </div>
          ) : (
            <>
              <p className="text-3xl mb-2">📸</p>
              <p className="text-gray-600 font-medium text-sm">Drop images here or click to upload</p>
              <p className="text-gray-400 text-xs mt-1">PNG, JPG, JPEG supported</p>
            </>
          )}
        </div>
        <input id="fileInput" type="file" multiple accept="image/*" className="hidden"
          onChange={e => handleFiles(e.target.files)} />

        {/* Image Grid */}
        {report.images?.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {report.images.map((img) => {
              const filename = img.file_path?.split("/").pop() || img.file_path?.split("\\").pop();
              return (
                <div key={img.id} className="rounded-xl overflow-hidden border border-gray-100 group relative">
                  <img
                    src={`${import.meta.env.VITE_API_BASE_URL?.replace("/api", "") || "http://localhost:5000"}/uploads/${filename}`}
                    alt="Report"
                    className="w-full h-28 object-cover"
                    onError={e => { e.target.src = ""; e.target.parentElement.innerHTML = '<div class="h-28 bg-gray-100 flex items-center justify-center text-xs text-gray-400">No preview</div>'; }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}