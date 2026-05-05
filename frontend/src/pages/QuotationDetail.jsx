import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import API from "../services/api";

// ── Lucide SVG Icons ───────────────────────────────────────────────────────────
const Icon = ({ d, size = 16, className = "", strokeWidth = 2, viewBox = "0 0 24 24" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size} height={size}
    viewBox={viewBox}
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {Array.isArray(d) ? d.map((path, i) => <path key={i} d={path} />) : <path d={d} />}
  </svg>
);

// Individual icon components using Lucide paths
const ArrowLeft       = ({ size, className }) => <Icon size={size} className={className} d="M19 12H5M12 19l-7-7 7-7" />;
const Eye             = ({ size, className }) => <Icon size={size} className={className} d={["M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7","M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6"]} />;
const Download        = ({ size, className }) => <Icon size={size} className={className} d={["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4","M7 10l5 5 5-5","M12 15V3"]} />;
const Pencil          = ({ size, className }) => <Icon size={size} className={className} d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />;
const Trash2          = ({ size, className }) => <Icon size={size} className={className} d={["M3 6h18","M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2","M10 11v6","M14 11v6"]} />;
const X               = ({ size, className }) => <Icon size={size} className={className} d="M18 6 6 18M6 6l12 12" />;
const Save            = ({ size, className }) => <Icon size={size} className={className} d={["M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z","M17 21v-8H7v8","M7 3v5h8"]} />;
const FileText        = ({ size, className }) => <Icon size={size} className={className} d={["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z","M14 2v6h6","M16 13H8","M16 17H8","M10 9H8"]} />;
const Calendar        = ({ size, className }) => <Icon size={size} className={className} d={["M8 2v4","M16 2v4","M3 8h18","M21 6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6z"]} />;
const ClipboardEdit   = ({ size, className }) => <Icon size={size} className={className} d={["M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2","M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z","M12 11h4","M12 16h4","M8 11h.01","M8 16h.01"]} />;
const CreditCard      = ({ size, className }) => <Icon size={size} className={className} d={["M2 10h20","M21 5H3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z"]} />;
const Truck           = ({ size, className }) => <Icon size={size} className={className} d={["M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11v12H5z","M14 3h4l3 4v7h-7V3z","M5.5 17a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z","M17.5 17a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"]} />;
const User            = ({ size, className }) => <Icon size={size} className={className} d={["M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2","M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"]} />;
const ShoppingCart    = ({ size, className }) => <Icon size={size} className={className} d={["M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z","M3 6h18","M16 10a4 4 0 0 1-8 0"]} />;
const AlertTriangle   = ({ size, className }) => <Icon size={size} className={className} d={["M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z","M12 9v4","M12 17h.01"]} />;
const Clock           = ({ size, className }) => <Icon size={size} className={className} d={["M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z","M12 6v6l4 2"]} />;
const DollarSign      = ({ size, className }) => <Icon size={size} className={className} d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />;
const RefreshCw       = ({ size, className }) => <Icon size={size} className={className} d={["M23 4v6h-6","M1 20v-6h6","M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"]} />;
const Package         = ({ size, className }) => <Icon size={size} className={className} d={["M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z","M3.27 6.96 12 12.01l8.73-5.05","M12 22.08V12"]} />;
const Plus            = ({ size, className }) => <Icon size={size} className={className} d="M12 5v14M5 12h14" />;
const Minus           = ({ size, className }) => <Icon size={size} className={className} d="M5 12h14" />;
const ChevronRight    = ({ size, className }) => <Icon size={size} className={className} d="M9 18l6-6-6-6" />;
const Tag             = ({ size, className }) => <Icon size={size} className={className} d={["M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z","M7 7h.01"]} />;
const ScrollText      = ({ size, className }) => <Icon size={size} className={className} d={["M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-14a2 2 0 0 1 2-2h12v4H8","M10 13h4","M10 17h4"]} />;
const Spinner         = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

// ── Constants ──────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  draft:    { label:"Draft",     color:"bg-gray-100 text-gray-600",       dot:"bg-gray-400"    },
  sent:     { label:"Sent",      color:"bg-blue-100 text-blue-700",       dot:"bg-blue-500"    },
  followup: { label:"Follow Up", color:"bg-amber-100 text-amber-700",     dot:"bg-amber-500"   },
  won:      { label:"Won",       color:"bg-emerald-100 text-emerald-700", dot:"bg-emerald-500" },
  lost:     { label:"Lost",      color:"bg-red-100 text-red-600",         dot:"bg-red-400"     },
  cancel:   { label:"Cancelled", color:"bg-gray-100 text-gray-400",       dot:"bg-gray-300"    },
};

const EMPTY_ITEM = { description:"", brand:"", model:"", unit:"Unit", qty:1, unit_price:0, discount:0, remarks:"", sub_items:[] };
const EMPTY_SUB  = { sub_label:"", qty:1, unit_price:0, discount:0 };
const CATEGORIES = ["Flow Measurement","Level Measurement","Pressure Measurement","Energy Measurement","Process Analyzer","Service / Repair","Others"];

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmtRp = (v, cur="IDR") => {
  if (v == null || v === "") return "-";
  const n = Number(v);
  if (cur === "IDR") return "Rp " + n.toLocaleString("id-ID");
  return `${cur} ${n.toLocaleString("en-US", { minimumFractionDigits:2 })}`;
};

const toWIB = iso => {
  if (!iso) return null;
  const d = new Date(iso);
  return new Date(d.getTime() + 7 * 60 * 60 * 1000);
};
const fmtDate = iso => {
  const d = toWIB(iso);
  if (!d) return "-";
  return d.toLocaleDateString("id-ID", { day:"2-digit", month:"long", year:"numeric" });
};
const fmtDT = iso => {
  const d = toWIB(iso);
  if (!d) return "-";
  return d.toLocaleString("id-ID", { day:"2-digit", month:"short", year:"2-digit", hour:"2-digit", minute:"2-digit" }) + " WIB";
};

// ── Calculations ───────────────────────────────────────────────────────────────
const calcSubItem = s => (parseFloat(s.unit_price)||0) * (parseFloat(s.qty)||0) * (1 - (parseFloat(s.discount)||0)/100);
const calcSub     = it => {
  if (it.sub_items && it.sub_items.length > 0) return it.sub_items.reduce((s,si) => s + calcSubItem(si), 0);
  return (parseFloat(it.unit_price)||0) * (parseFloat(it.qty)||0) * (1 - (parseFloat(it.discount)||0)/100);
};
const calcGross = it => {
  if (it.sub_items && it.sub_items.length > 0)
    return it.sub_items.reduce((s,si) => s + (parseFloat(si.unit_price)||0)*(parseFloat(si.qty)||0), 0);
  return (parseFloat(it.unit_price)||0) * (parseFloat(it.qty)||0);
};
const calcDiscAmt = it => calcGross(it) - calcSub(it);

// ── Field Component ────────────────────────────────────────────────────────────
function Field({ label, type="text", value, onChange, required, className="", rows=3, readOnly=false }) {
  const base = `peer w-full border rounded-xl px-3 pt-6 pb-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] transition-all
    ${readOnly ? "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed" : "border-gray-200 bg-white"}`;
  const lbl  = "absolute left-3 top-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide pointer-events-none select-none";
  return (
    <div className={`relative ${className}`}>
      {type === "textarea"
        ? <textarea value={value} onChange={onChange} rows={rows} placeholder=" " readOnly={readOnly} className={`${base} resize-y`}/>
        : <input type={type} value={value} onChange={onChange} placeholder=" " required={required} readOnly={readOnly} className={base}/>
      }
      <label className={lbl}>
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
        {readOnly  && <span className="text-gray-300 ml-1 font-normal normal-case">(auto)</span>}
      </label>
    </div>
  );
}

// ── Delete Dialog ──────────────────────────────────────────────────────────────
function DeleteDialog({ title, message, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="text-center mb-5">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Trash2 size={26} className="text-red-500" />
          </div>
          <h3 className="font-bold text-gray-800 text-lg mb-1">{title}</h3>
          <p className="text-sm text-gray-500">{message}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50">Cancel</button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-60">
            {loading
              ? <Spinner size={15} className="animate-spin" />
              : <Trash2 size={14} />
            }
            Permanently Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PDF Preview Modal ──────────────────────────────────────────────────────────
function PDFPreviewModal({ url, quotationNumber, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
      <div className="flex items-center justify-between px-5 py-3 bg-[#0B3D91]">
        <span className="text-white font-bold text-sm flex items-center gap-2">
          <FileText size={15} className="opacity-70" />
          {quotationNumber} — PDF Preview
        </span>
        <div className="flex items-center gap-2">
          <a href={url} download={`Quotation_${quotationNumber}.pdf`}
            className="px-4 py-1.5 bg-white text-[#0B3D91] rounded-lg text-xs font-bold hover:bg-blue-50 flex items-center gap-1.5 transition-colors">
            <Download size={13} /> Download
          </a>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
            <X size={18} />
          </button>
        </div>
      </div>
      <iframe src={url} className="flex-1 w-full" title="PDF Preview" style={{ border:"none" }}/>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function QuotationDetail() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [q, setQ]                       = useState(null);
  const [editMode, setEditMode]         = useState(false);
  const [form, setForm]                 = useState(null);
  const [saving, setSaving]             = useState(false);
  const [pdfLoading, setPdfLoading]     = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl]     = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleting, setDeleting]         = useState(false);

  const fetchQ = useCallback(async () => {
    try { const r = await API.get(`/quotation/detail/${id}`); setQ(r.data); }
    catch { toast.error("Failed to load quotation"); }
  }, [id]);
  useEffect(() => { fetchQ(); }, [fetchQ]);

  const openEdit = () => {
    setForm({
      customer_name:    q.customer_name    || "",
      customer_company: q.customer_company || "",
      customer_email:   q.customer_email   || "",
      customer_phone:   q.customer_phone   || "",
      customer_address: q.customer_address || "",
      project_name:     q.project_name     || "",
      category:         q.category         || "",
      valid_until:      q.valid_until       || "",
      currency:         q.currency         || "IDR",
      notes:            q.notes             || "",
      terms:            q.terms             || "",
      items:            q.items ? JSON.parse(JSON.stringify(q.items)) : [{ ...EMPTY_ITEM }],
      sales_person:     q.sales_person     || "",
      ref_no:           q.ref_no           || "",
      shipment_terms:   q.shipment_terms   || "",
      delivery:         q.delivery         || "",
      payment_terms:    q.payment_terms    || "",
      vat_pct:          q.vat_pct          != null ? q.vat_pct : 11,
      vat_include:      q.vat_include      || false,
    });
    setEditMode(true);
  };

  const handleSave = async () => {
    if (!form.customer_name || !form.customer_company) { toast.error("PIC & company name is mandatory"); return; }
    setSaving(true);
    try {
      const total = form.items.reduce((s, it) => s + calcSub(it), 0);
      const res   = await API.put(`/quotation/update/${id}`, { ...form, total_amount: total });
      toast.success(`Saved!${res.data.revision > 0 ? " (Rev." + res.data.revision + ")" : ""} ✅`);
      setEditMode(false);
      fetchQ();
    } catch(e) { toast.error(e.response?.data?.error || "Failed to save"); }
    finally { setSaving(false); }
  };

  const updateStatus = async status => {
    try { await API.put(`/quotation/status/${id}`, { status }); toast.success("Status updated"); fetchQ(); }
    catch { toast.error("Failed to update status"); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await API.delete(`/quotation/delete/${id}`); toast.success("Quotation deleted"); navigate("/quotations"); }
    catch { toast.error("Failed to delete"); setDeleting(false); setDeleteDialog(false); }
  };

  const previewPDF = async () => {
    setPreviewLoading(true);
    try {
      const r = await API.get(`/quotation/pdf/preview/${id}`, { responseType:"blob" });
      setPreviewUrl(URL.createObjectURL(new Blob([r.data], { type:"application/pdf" })));
    } catch { toast.error("Failed to load preview"); }
    finally { setPreviewLoading(false); }
  };

  const downloadPDF = async () => {
    setPdfLoading(true);
    try {
      const r   = await API.get(`/quotation/pdf/${id}`, { responseType:"blob" });
      const url = URL.createObjectURL(new Blob([r.data], { type:"application/pdf" }));
      Object.assign(document.createElement("a"), { href:url, download:`Quotation_${q.quotation_number}.pdf` }).click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast.success("PDF downloaded successfully!");
    } catch { toast.error("Failed to generate PDF"); }
    finally { setPdfLoading(false); }
  };

  // form helpers
  const sf         = v   => setForm(f => ({ ...f, ...v }));
  const addItem    = ()  => sf({ items:[...form.items, { ...EMPTY_ITEM }] });
  const rmItem     = i   => sf({ items:form.items.filter((_,idx) => idx !== i) });
  const upItem     = (i,k,v) => sf({ items:form.items.map((it,idx) => idx===i ? { ...it,[k]:v } : it) });
  const addSubItem = i   => sf({ items:form.items.map((it,idx) => idx===i ? { ...it, sub_items:[...(it.sub_items||[]),{ ...EMPTY_SUB }] } : it) });
  const rmSubItem  = (i,si) => sf({ items:form.items.map((it,idx) => idx===i ? { ...it, sub_items:it.sub_items.filter((_,s)=>s!==si) } : it) });
  const upSubItem  = (i,si,k,v) => sf({ items:form.items.map((it,idx) => idx===i ? { ...it, sub_items:it.sub_items.map((s,sidx)=>sidx===si?{...s,[k]:v}:s) } : it) });

  if (!q) return (
    <div className="flex justify-center items-center h-40">
      <Spinner size={40} className="animate-spin text-[#0B3D91]" />
    </div>
  );

  const sc           = STATUS_CONFIG[q.status] || STATUS_CONFIG.draft;
  const items        = q.items || [];
  const subtotal     = items.reduce((s,it) => s + calcSub(it), 0);
  const totalDiscAmt = items.reduce((s,it) => s + calcDiscAmt(it), 0);
  const hasDiscount  = totalDiscAmt > 0;
  const vatPct       = (q.vat_include && q.vat_pct) ? parseFloat(q.vat_pct) : 0;
  const vatAmt       = q.vat_include ? subtotal * vatPct / 100 : 0;
  const grandTotal   = subtotal + vatAmt;
  const sectionHdr   = "text-xs font-extrabold text-[#0B3D91] uppercase tracking-widest border-b border-[#0B3D91]/10 pb-1.5 mb-4";

  return (
    <div className="w-full">
      {previewUrl && (
        <PDFPreviewModal
          url={previewUrl} quotationNumber={q.quotation_number}
          onClose={() => { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }}
        />
      )}
      {deleteDialog && (
        <DeleteDialog
          title="Delete Quotation?"
          message={`"${q.quotation_number}" will be permanently deleted.`}
          onConfirm={handleDelete} onCancel={() => setDeleteDialog(false)} loading={deleting}
        />
      )}

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <button onClick={() => navigate("/quotations")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#0B3D91] font-medium transition-colors">
          <ArrowLeft size={16} /> Return to List
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {!editMode && (<>
            <button onClick={previewPDF} disabled={previewLoading}
              className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 shadow-sm disabled:opacity-60 transition-colors">
              {previewLoading
                ? <Spinner size={13} className="animate-spin text-[#0B3D91]" />
                : <Eye size={13} />
              }
              Preview PDF
            </button>
            <button onClick={downloadPDF} disabled={pdfLoading}
              className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 shadow-sm disabled:opacity-60 transition-colors">
              {pdfLoading
                ? <Spinner size={13} className="animate-spin text-[#0B3D91]" />
                : <Download size={13} />
              }
              Download PDF
            </button>
            <button onClick={openEdit}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#0B3D91] text-white rounded-xl text-xs font-semibold hover:bg-[#1E5CC6] transition-colors">
              <Pencil size={13} /> Edit
            </button>
            <button onClick={() => setDeleteDialog(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition-colors">
              <Trash2 size={13} />
            </button>
          </>)}
          {editMode && (<>
            <button onClick={() => setEditMode(false)}
              className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-50">
              <X size={13} /> Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2 bg-[#0B3D91] text-white rounded-xl text-xs font-bold hover:bg-[#1E5CC6] disabled:opacity-60 transition-colors">
              {saving
                ? <Spinner size={13} className="animate-spin" />
                : <Save size={13} />
              }
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </>)}
        </div>
      </div>

      {/* ════ VIEW MODE ═══════════════════════════════════════════════════════ */}
      {!editMode && (
        <div className="space-y-5">

          {/* Header card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-[#0B3D91] to-[#1E5CC6] px-6 py-5 text-white">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-xl font-black font-mono tracking-wide">{q.quotation_number}</h1>
                    {q.revision > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-400 text-white text-xs font-bold rounded-full">
                        <RefreshCw size={10} /> Rev.{q.revision}
                      </span>
                    )}
                    <span className={"inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold " + sc.color}>
                      <span className={"w-1.5 h-1.5 rounded-full " + sc.dot}/>{sc.label}
                    </span>
                  </div>
                  <p className="text-blue-200 text-sm mt-1">{q.project_name || "No project name"}</p>
                  <div className="flex flex-wrap gap-4 mt-3 text-xs text-blue-100">
                    <span className="flex items-center gap-1.5">
                      <Calendar size={11} className="opacity-70" /> Created: {fmtDate(q.created_at)}
                    </span>
                    {q.updated_at && q.updated_at !== q.created_at && (
                      <span className="flex items-center gap-1.5">
                        <Pencil size={11} className="opacity-70" /> Modified: {fmtDT(q.updated_at)}
                      </span>
                    )}
                    {q.valid_until && (
                      <span className="flex items-center gap-1.5">
                        <Clock size={11} className="opacity-70" /> Valid Until: {fmtDate(q.valid_until)}
                      </span>
                    )}
                    {q.currency && q.currency !== "IDR" && (
                      <span className="flex items-center gap-1.5">
                        <DollarSign size={11} className="opacity-70" /> {q.currency}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-blue-200 text-xs mb-1">Grand Total</p>
                  <p className="text-2xl font-black">{fmtRp(grandTotal, q.currency)}</p>
                  {hasDiscount && <p className="text-blue-200 text-xs mt-1">Disc: ({fmtRp(totalDiscAmt, q.currency)})</p>}
                  {q.vat_include && <p className="text-blue-200 text-xs mt-0.5">VAT {vatPct}%: {fmtRp(vatAmt, q.currency)}</p>}
                </div>
              </div>
            </div>
            <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-5">
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1 flex items-center gap-1">
                  <User size={10} /> Customer
                </p>
                <p className="font-bold text-gray-800 text-sm">{q.customer_company || "-"}</p>
                <p className="text-xs text-gray-500">{q.customer_name}</p>
                {q.customer_email && <p className="text-xs text-gray-400 mt-0.5">{q.customer_email}</p>}
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1 flex items-center gap-1">
                  <User size={10} /> Sales Person
                </p>
                <p className="font-semibold text-gray-700 text-sm">{q.sales_person || "-"}</p>
                {q.ref_no && <p className="text-xs text-gray-400 mt-0.5">Ref: {q.ref_no}</p>}
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1 flex items-center gap-1">
                  <CreditCard size={10} /> Payment Terms
                </p>
                <p className="font-semibold text-gray-700 text-sm">{q.payment_terms || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1 flex items-center gap-1">
                  <Truck size={10} /> Delivery
                </p>
                <p className="font-semibold text-gray-700 text-sm">{q.delivery || "-"}</p>
                {q.shipment_terms && <p className="text-xs text-gray-400 mt-0.5">{q.shipment_terms}</p>}
              </div>
            </div>
          </div>

          {/* Status update */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <RefreshCw size={11} /> Status Update
            </h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(STATUS_CONFIG).map(([k,v]) => (
                <button key={`status-btn-${k}`} onClick={() => updateStatus(k)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all
                    ${q.status === k
                      ? "border-[#0B3D91] bg-[#0B3D91] text-white"
                      : "border-gray-200 text-gray-600 hover:border-[#0B3D91] hover:text-[#0B3D91]"}`}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Items table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Package size={15} className="text-[#0B3D91]" /> Item &amp; Price
              </h3>
              <span className="text-xs text-gray-400 font-semibold">{items.length} item{items.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-[#0B3D91] to-[#1E5CC6] text-white">
                    {["No","Description / Inventory","UOM","Qty","Unit Price","Amount"].map((h,hi) => (
                      <th key={`th-${hi}`}
                        className={`px-4 py-3 text-xs font-bold uppercase tracking-wide
                          ${[2,3].includes(hi) ? "text-center" : [4,5].includes(hi) ? "text-right" : "text-left"}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.flatMap((item, i) => {
                    const hasSubItems = item.sub_items && item.sub_items.length > 0;
                    if (hasSubItems) {
                      return [
                        <tr key={`item-${i}-main`} className={i%2===0 ? "bg-white" : "bg-gray-50/50"}>
                          <td className="px-4 py-3 text-center text-xs text-gray-400 font-semibold align-top">{i+1}</td>
                          <td className="px-4 py-3" colSpan={5}>
                            <p className="font-semibold text-gray-800 text-xs leading-snug whitespace-pre-wrap">{item.description}</p>
                            {(item.brand || item.model) && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                {[item.brand, item.model && "P/N: " + item.model].filter(Boolean).join(" | ")}
                              </p>
                            )}
                            {item.remarks && <p className="text-xs text-gray-400 italic mt-0.5 whitespace-pre-wrap">{item.remarks}</p>}
                          </td>
                        </tr>,
                        ...item.sub_items.map((s, si) => (
                          <tr key={`item-${i}-sub-${si}`} className="bg-blue-50/40">
                            <td className="px-4 py-2.5 text-center text-[10px] text-blue-400 font-bold">{i+1}.{si+1}</td>
                            <td className="px-4 py-2.5">
                              <span className="flex items-center gap-1 text-xs text-blue-700 font-semibold">
                                <ChevronRight size={11} className="text-blue-400" /> {s.sub_label || "—"}
                              </span>
                              {parseFloat(s.discount) > 0 && (
                                <span className="ml-2 px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded-full">
                                  Disc {s.discount}%
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-center text-xs text-gray-500">{item.unit || "Unit"}</td>
                            <td className="px-4 py-2.5 text-center text-xs font-semibold text-gray-800">{s.qty}</td>
                            <td className="px-4 py-2.5 text-right text-xs text-gray-600">{fmtRp(s.unit_price, q.currency)}</td>
                            <td className="px-4 py-2.5 text-right text-xs font-bold text-gray-800">{fmtRp(calcSubItem(s), q.currency)}</td>
                          </tr>
                        ))
                      ];
                    }
                    return [
                      <tr key={`item-${i}-main`} className={i%2===0 ? "bg-white" : "bg-gray-50/50"}>
                        <td className="px-4 py-3 text-center text-xs text-gray-400 font-semibold">{i+1}</td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-800 text-xs leading-snug whitespace-pre-wrap">{item.description}</p>
                          {(item.brand || item.model) && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {[item.brand, item.model && "P/N: " + item.model].filter(Boolean).join(" | ")}
                            </p>
                          )}
                          {item.remarks && <p className="text-xs text-gray-400 italic mt-0.5 whitespace-pre-wrap">{item.remarks}</p>}
                          {parseFloat(item.discount) > 0 && (
                            <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded-full">
                              <Tag size={9} /> Disc {item.discount}%
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-gray-500">{item.unit || "Unit"}</td>
                        <td className="px-4 py-3 text-center text-xs font-semibold text-gray-800">{item.qty}</td>
                        <td className="px-4 py-3 text-right text-xs text-gray-600">{fmtRp(item.unit_price, q.currency)}</td>
                        <td className="px-4 py-3 text-right text-xs font-bold text-gray-800">{fmtRp(calcSub(item), q.currency)}</td>
                      </tr>
                    ];
                  })}
                </tbody>
                <tfoot className="border-t-2 border-gray-200">
                  {hasDiscount && (
                    <tr key="tfoot-gross">
                      <td colSpan="5" className="px-4 py-2 text-right text-xs text-gray-400 font-semibold">Subtotal (before discount)</td>
                      <td className="px-4 py-2 text-right text-xs text-gray-400 font-semibold">
                        {fmtRp(items.reduce((s,it) => s + calcGross(it), 0), q.currency)}
                      </td>
                    </tr>
                  )}
                  {hasDiscount && (
                    <tr key="tfoot-disc" className="bg-orange-50/60">
                      <td colSpan="5" className="px-4 py-2 text-right text-xs font-bold text-orange-600">Total Discount</td>
                      <td className="px-4 py-2 text-right text-xs font-bold text-orange-600">({fmtRp(totalDiscAmt, q.currency)})</td>
                    </tr>
                  )}
                  <tr key="tfoot-sub" className="bg-white">
                    <td colSpan="5" className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">
                      {hasDiscount ? "Net Subtotal:" : "Subtotal:"}
                    </td>
                    <td className="px-4 py-2.5 text-right text-sm font-bold text-gray-800">{fmtRp(subtotal, q.currency)}</td>
                  </tr>
                  {q.vat_include && (
                    <tr key="tfoot-vat" className="bg-white">
                      <td colSpan="5" className="px-4 py-1.5 text-right text-xs text-gray-400">VAT / PPN {vatPct}%</td>
                      <td className="px-4 py-1.5 text-right text-xs text-gray-500">{fmtRp(vatAmt, q.currency)}</td>
                    </tr>
                  )}
                  <tr key="tfoot-grand" className="bg-gradient-to-r from-[#0B3D91] to-[#1E5CC6]">
                    <td colSpan="5" className="px-4 py-3.5 text-right text-sm font-black text-white">GRAND TOTAL</td>
                    <td className="px-4 py-3.5 text-right text-base font-black text-white">{fmtRp(grandTotal, q.currency)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Terms */}
          {(q.shipment_terms || q.delivery || q.payment_terms || q.notes || q.terms) && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <ScrollText size={13} /> Terms &amp; Conditions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                {[["Shipment Terms",q.shipment_terms],["Payment Terms",q.payment_terms],
                  ["Delivery",q.delivery],["Notes",q.notes]].map(([l,v]) => v && (
                  <div key={`tc-${l}`}>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">{l}</p>
                    <p className={`text-gray-700 ${l === "Notes" ? "whitespace-pre-line" : ""}`}>{v}</p>
                  </div>
                ))}
                {q.terms && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Additional Terms</p>
                    <p className="text-gray-600 whitespace-pre-line text-sm">{q.terms}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════ EDIT MODE ═══════════════════════════════════════════════════════ */}
      {editMode && form && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="p-6 space-y-7">

            {/* ① Quotation Info */}
            <section>
              <h3 className={sectionHdr}>
                <span className="inline-flex items-center gap-1.5">
                  <FileText size={13} /> Quotation Information
                </span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Field
                  label="No. Quotation" value={q.quotation_number}
                  onChange={() => {}} readOnly className="col-span-1"
                />
                <Field label="Sales Person" value={form.sales_person} onChange={e => sf({ sales_person:e.target.value })}/>
                <Field label="Ref. No."     value={form.ref_no}       onChange={e => sf({ ref_no:e.target.value })}/>
                <Field label="Valid Until"  type="date" value={form.valid_until} onChange={e => sf({ valid_until:e.target.value })}/>
                <div className="relative">
                  <select value={form.currency} onChange={e => sf({ currency:e.target.value })}
                    className="peer w-full border border-gray-200 rounded-xl px-3 pt-6 pb-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white cursor-pointer">
                    {["IDR","USD","SGD","EUR"].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <label className="absolute left-3 top-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide pointer-events-none">Currency</label>
                </div>
                <div className="relative">
                  <select value={form.category} onChange={e => sf({ category:e.target.value })}
                    className="peer w-full border border-gray-200 rounded-xl px-3 pt-6 pb-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white cursor-pointer">
                    <option value="">Select Category</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <label className="absolute left-3 top-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide pointer-events-none">Category</label>
                </div>
              </div>
            </section>

            {/* ② Customer */}
            <section>
              <h3 className={sectionHdr}>
                <span className="inline-flex items-center gap-1.5">
                  <User size={13} /> Customer Information
                </span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Field label="PIC Name"   value={form.customer_name}    onChange={e => sf({ customer_name:e.target.value })}    required/>
                <Field label="Company" value={form.customer_company} onChange={e => sf({ customer_company:e.target.value })} required/>
                <Field label="Email" type="email" value={form.customer_email} onChange={e => sf({ customer_email:e.target.value })}/>
                <Field label="Phone"    value={form.customer_phone}   onChange={e => sf({ customer_phone:e.target.value })}/>
                <Field label="Address"     value={form.customer_address} onChange={e => sf({ customer_address:e.target.value })} className="sm:col-span-2"/>
                <Field label="Subject / Project" value={form.project_name} onChange={e => sf({ project_name:e.target.value })} className="sm:col-span-2"/>
              </div>
            </section>

            {/* ③ Items */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-extrabold text-[#0B3D91] uppercase tracking-widest flex items-center gap-1.5">
                  <Package size={13} /> Item &amp; Price
                </h3>
                <button onClick={addItem}
                  className="flex items-center gap-1 text-xs font-bold text-[#0B3D91] hover:underline">
                  <Plus size={13} /> Add Item
                </button>
              </div>

              {/* VAT toggle */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 mb-4">
                <input type="checkbox" id="vat_edit" checked={!!form.vat_include}
                  onChange={e => sf({ vat_include:e.target.checked })} className="w-4 h-4 accent-[#0B3D91]"/>
                <label htmlFor="vat_edit" className="text-sm font-semibold text-gray-700 cursor-pointer flex-1">Include VAT / PPN</label>
                {form.vat_include && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">VAT</span>
                    <input type="number" value={form.vat_pct != null ? form.vat_pct : 11}
                      onChange={e => sf({ vat_pct:parseFloat(e.target.value)||11 })}
                      className="w-14 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#0B3D91]"
                      min="0" max="100"/>
                    <span className="text-xs text-gray-500">%</span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {form.items.map((item, i) => (
                  <div key={`edit-item-${i}`} className="bg-gray-50/80 rounded-xl p-4 border border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-extrabold text-gray-300 uppercase tracking-widest">Item {i+1}</span>
                      {form.items.length > 1 && (
                        <button onClick={() => rmItem(i)}
                          className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 font-semibold">
                          <Minus size={11} /> Remove
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <Field label="Product / Service Description" type="textarea" rows={2}
                        value={item.description} onChange={e => upItem(i,"description",e.target.value)}
                        required className="col-span-2 sm:col-span-4"/>
                      <Field label="Brand"               value={item.brand}   onChange={e => upItem(i,"brand",e.target.value)}/>
                      <Field label="Model / Part Number" value={item.model}   onChange={e => upItem(i,"model",e.target.value)}/>
                      <Field label="Description / Specification" type="textarea" rows={2}
                        value={item.remarks} onChange={e => upItem(i,"remarks",e.target.value)} className="col-span-2"/>
                    </div>

                    {(!item.sub_items || item.sub_items.length === 0) ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-2.5">
                        <Field label="Qty"          type="number" value={item.qty}       onChange={e => upItem(i,"qty",e.target.value)}/>
                        <Field label="Unit (UOM)"               value={item.unit}       onChange={e => upItem(i,"unit",e.target.value)}/>
                        <Field label="Unit Price" type="number" value={item.unit_price} onChange={e => upItem(i,"unit_price",e.target.value)}/>
                        <Field label="Discount %"     type="number" value={item.discount}   onChange={e => upItem(i,"discount",e.target.value)}/>
                      </div>
                    ) : (
                      <div className="mt-3 space-y-2">
                        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wide flex items-center gap-1">
                          <ChevronRight size={10} /> Variants / Sub-Items
                        </p>
                        {item.sub_items.map((s, si) => (
                          <div key={`edit-item-${i}-sub-${si}`}
                            className="flex items-center gap-2 bg-white rounded-lg p-2.5 border border-blue-100">
                            <span className="text-[10px] font-bold text-blue-400 shrink-0">{i+1}.{si+1}</span>
                            <input placeholder="Size / Label" value={s.sub_label}
                              onChange={e => upSubItem(i,si,"sub_label",e.target.value)}
                              className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0B3D91] min-w-0"/>
                            <input placeholder="Qty" type="number" value={s.qty}
                              onChange={e => upSubItem(i,si,"qty",e.target.value)}
                              className="w-14 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-2 focus:ring-[#0B3D91]"/>
                            <input placeholder="Price" type="number" value={s.unit_price}
                              onChange={e => upSubItem(i,si,"unit_price",e.target.value)}
                              className="w-28 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0B3D91]"/>
                            <input placeholder="Disc%" type="number" value={s.discount}
                              onChange={e => upSubItem(i,si,"discount",e.target.value)}
                              className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-2 focus:ring-[#0B3D91]"/>
                            <span className="text-[10px] font-bold text-[#0B3D91] shrink-0 min-w-[60px] text-right">
                              {fmtRp(calcSubItem(s), form.currency)}
                            </span>
                            <button onClick={() => rmSubItem(i,si)}
                              className="text-red-400 hover:text-red-600 shrink-0 p-0.5 rounded transition-colors">
                              <X size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 gap-2">
                      <button onClick={() => addSubItem(i)}
                        className="flex items-center gap-1 text-[10px] font-bold text-blue-500 hover:text-blue-700 hover:underline shrink-0">
                        <Plus size={11} />
                        {(!item.sub_items || item.sub_items.length === 0) ? "Add Variant (Different Size)" : "Add Variant"}
                      </button>
                      {calcDiscAmt(item) > 0 && (
                        <span className="text-xs text-orange-500 font-semibold">
                          Disc: ({fmtRp(calcDiscAmt(item), form.currency)})
                        </span>
                      )}
                      <span className="ml-auto text-xs text-gray-400">
                        Subtotal: <span className="font-black text-[#0B3D91] text-sm">{fmtRp(calcSub(item), form.currency)}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Grand total preview */}
              {(() => {
                const sub   = form.items.reduce((s,it) => s + calcSub(it), 0);
                const disc  = form.items.reduce((s,it) => s + calcDiscAmt(it), 0);
                const vatA  = form.vat_include ? sub * (parseFloat(form.vat_pct)||11) / 100 : 0;
                const grand = sub + vatA;
                const hasD  = disc > 0;
                return (
                  <div className="mt-2 p-4 bg-[#0B3D91]/5 rounded-xl border border-[#0B3D91]/10 text-right space-y-1.5">
                    {hasD && <p><span className="text-xs text-orange-500">Total Discount: </span><span className="text-sm font-bold text-orange-600">({fmtRp(disc,form.currency)})</span></p>}
                    <p><span className="text-xs text-gray-500">{hasD?"Net Subtotal:":"Subtotal:"} </span><span className="text-sm font-bold text-gray-700">{fmtRp(sub,form.currency)}</span></p>
                    {form.vat_include && <p><span className="text-xs text-gray-500">VAT {form.vat_pct}%: </span><span className="text-sm font-bold text-gray-700">{fmtRp(vatA,form.currency)}</span></p>}
                    <p className="border-t border-[#0B3D91]/20 pt-1.5">
                      <span className="text-sm font-bold text-gray-600">GRAND TOTAL: </span>
                      <span className="text-lg font-black text-[#0B3D91]">{fmtRp(grand,form.currency)}</span>
                    </p>
                  </div>
                );
              })()}
            </section>

            {/* ④ Terms */}
            <section>
              <h3 className={sectionHdr}>
                <span className="inline-flex items-center gap-1.5">
                  <ScrollText size={13} /> Terms &amp; Conditions
                </span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Shipment Terms"            value={form.shipment_terms} onChange={e => sf({ shipment_terms:e.target.value })}/>
                <Field label="Payment Terms"             value={form.payment_terms}  onChange={e => sf({ payment_terms:e.target.value })}/>
                <Field label="Delivery / Lead Time"      value={form.delivery}       onChange={e => sf({ delivery:e.target.value })}/>
                <Field label="Note to Customer"       type="textarea" rows={4} value={form.notes} onChange={e => sf({ notes: e.target.value })} className="sm:col-span-2"/>
                <Field label="Additional Terms (Optional)" value={form.terms}          onChange={e => sf({ terms:e.target.value })}
                  type="textarea" className="sm:col-span-2"/>
              </div>
            </section>
          </div>

          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3 bg-gray-50/50 rounded-b-2xl">
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <AlertTriangle size={11} className="text-amber-400" />
              Changes to items/prices/terms will auto-increment revisions.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setEditMode(false)}
                className="flex items-center gap-1.5 px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-white">
                <X size={14} /> Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-bold hover:bg-[#1E5CC6] disabled:opacity-60 transition-colors">
                {saving
                  ? <Spinner size={15} className="animate-spin" />
                  : <Save size={15} />
                }
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}