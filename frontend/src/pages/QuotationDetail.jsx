import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import API from "../services/api";

// ── Constants ──────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  draft:    { label:"Draft",     color:"bg-gray-100 text-gray-600",      dot:"bg-gray-400"     },
  sent:     { label:"Sent",      color:"bg-blue-100 text-blue-700",      dot:"bg-blue-500"     },
  followup: { label:"Follow Up", color:"bg-amber-100 text-amber-700",    dot:"bg-amber-500"    },
  won:      { label:"Won",       color:"bg-emerald-100 text-emerald-700",dot:"bg-emerald-500"  },
  lost:     { label:"Lost",      color:"bg-red-100 text-red-600",        dot:"bg-red-400"      },
  cancel:   { label:"Cancelled", color:"bg-gray-100 text-gray-400",      dot:"bg-gray-300"     },
};

const EMPTY_ITEM = { description:"", brand:"", model:"", unit:"Unit", qty:1, unit_price:0, discount:0, remarks:"" };
const CATEGORIES = ["Flow Measurement","Level Measurement","Pressure Measurement","Energy Measurement","Process Analyzer","Service / Repair","Lainnya"];

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmtRp = (v, cur="IDR") => {
  if (v==null||v==="") return "-";
  const n=Number(v);
  if (cur==="IDR") return "Rp "+n.toLocaleString("id-ID");
  return `${cur} ${n.toLocaleString("en-US",{minimumFractionDigits:2})}`;
};
const fmtDate = iso => iso ? new Date(iso).toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"}) : "-";
const fmtDT   = iso => iso ? new Date(iso).toLocaleString("id-ID",{day:"2-digit",month:"short",year:"2-digit",hour:"2-digit",minute:"2-digit"}) : "-";
const calcSub     = it => (parseFloat(it.unit_price)||0)*(parseFloat(it.qty)||0)*(1-(parseFloat(it.discount)||0)/100);
const calcGross   = it => (parseFloat(it.unit_price)||0)*(parseFloat(it.qty)||0);
const calcDiscAmt = it => calcGross(it)*(parseFloat(it.discount)||0)/100;

// ── Floating-label Field ───────────────────────────────────────────────────────
function Field({ label, type="text", value, onChange, required, className="" }) {
  const base = "peer w-full border border-gray-200 rounded-xl px-3 pt-6 pb-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white transition-all";
  const lbl  = "absolute left-3 top-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide pointer-events-none select-none";
  return (
    <div className={`relative ${className}`}>
      {type==="textarea"
        ? <textarea value={value} onChange={onChange} rows={3} placeholder=" " className={`${base} resize-none`}/>
        : <input type={type} value={value!=null?value:""} onChange={onChange} placeholder=" " required={required} className={base}/>
      }
      <label className={lbl}>{label}{required&&<span className="text-red-400 ml-0.5">*</span>}</label>
    </div>
  );
}
function SelectField({ label, value, onChange, options, placeholder, required, className="" }) {
  const base = "peer w-full border border-gray-200 rounded-xl px-3 pt-6 pb-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white cursor-pointer transition-all";
  const lbl  = "absolute left-3 top-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide pointer-events-none select-none";
  return (
    <div className={`relative ${className}`}>
      <select value={value!=null?value:""} onChange={onChange} className={base}>
        {placeholder&&<option value="">{placeholder}</option>}
        {options.map(o=><option key={o.value!=null?o.value:o} value={o.value!=null?o.value:o}>{o.label!=null?o.label:o}</option>)}
      </select>
      <label className={lbl}>{label}{required&&<span className="text-red-400 ml-0.5">*</span>}</label>
    </div>
  );
}

// ── PDF Preview Modal ──────────────────────────────────────────────────────────
function PDFPreviewModal({ url, quotationNumber, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
      <div className="flex items-center justify-between px-5 py-3 bg-[#0B3D91] shrink-0">
        <span className="text-white font-bold text-sm">📄 {quotationNumber} — Preview PDF</span>
        <div className="flex items-center gap-2">
          <a href={url} download className="px-4 py-1.5 bg-white text-[#0B3D91] rounded-lg text-xs font-bold hover:bg-blue-50 flex items-center gap-1.5">⬇ Download</a>
          <button onClick={onClose} className="text-white/70 hover:text-white text-xl px-2">✕</button>
        </div>
      </div>
      <iframe src={url} className="flex-1 w-full" title="PDF Preview" style={{border:"none"}}/>
    </div>
  );
}

// ── Delete Confirm ─────────────────────────────────────────────────────────────
function DeleteDialog({ title, message, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
        <div className="text-3xl mb-3 text-center">⚠️</div>
        <h3 className="text-lg font-bold text-gray-800 text-center mb-2">{title}</h3>
        <p className="text-sm text-gray-500 text-center mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Batal</button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-60">
            {loading&&<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>}
            Hapus Permanen
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function QuotationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [q, setQ] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving]             = useState(false);
  const [pdfLoading, setPdfLoading]     = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl]     = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleting, setDeleting]         = useState(false);

  const fetchQ = useCallback(async () => {
    try { const r=await API.get(`/quotation/detail/${id}`); setQ(r.data); }
    catch { toast.error("Gagal memuat quotation"); }
  }, [id]);
  useEffect(()=>{fetchQ();},[fetchQ]);

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
      items:            q.items ? JSON.parse(JSON.stringify(q.items)) : [{...EMPTY_ITEM}],
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
    if (!form.customer_name||!form.customer_company) { toast.error("Nama PIC & perusahaan wajib"); return; }
    setSaving(true);
    try {
      const total = form.items.reduce((s,it)=>s+calcSub(it),0);
      const res   = await API.put(`/quotation/update/${id}`, {...form, total_amount:total});
      toast.success(`Disimpan! ${res.data.revision>0 ? "(Rev."+res.data.revision+")" : ""}  ✅`);
      setEditMode(false); fetchQ();
    } catch(e) { toast.error(e.response?.data?.error||"Gagal menyimpan"); }
    finally { setSaving(false); }
  };

  const updateStatus = async status => {
    try { await API.put(`/quotation/status/${id}`,{status}); toast.success("Status diperbarui"); fetchQ(); }
    catch { toast.error("Gagal update status"); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await API.delete(`/quotation/delete/${id}`); toast.success("Quotation dihapus"); navigate("/quotations"); }
    catch { toast.error("Gagal menghapus"); setDeleting(false); setDeleteDialog(false); }
  };

  const previewPDF = async () => {
    setPreviewLoading(true);
    try { const r=await API.get(`/quotation/pdf/preview/${id}`,{responseType:"blob"}); setPreviewUrl(URL.createObjectURL(new Blob([r.data],{type:"application/pdf"}))); }
    catch { toast.error("Gagal memuat preview"); }
    finally { setPreviewLoading(false); }
  };

  const downloadPDF = async () => {
    setPdfLoading(true);
    try {
      const r=await API.get(`/quotation/pdf/${id}`,{responseType:"blob"});
      const url=URL.createObjectURL(new Blob([r.data],{type:"application/pdf"}));
      Object.assign(document.createElement("a"),{href:url,download:"Quotation_"+q.quotation_number+".pdf"}).click();
      setTimeout(()=>URL.revokeObjectURL(url),5000);
      toast.success("PDF berhasil diunduh!");
    } catch { toast.error("Gagal generate PDF"); }
    finally { setPdfLoading(false); }
  };

  const sf      = v => setForm(f=>({...f,...v}));
  const addItem = ()  => sf({items:[...form.items,{...EMPTY_ITEM}]});
  const rmItem  = i   => sf({items:form.items.filter((_,idx)=>idx!==i)});
  const upItem  = (i,k,v) => sf({items:form.items.map((it,idx)=>idx===i?{...it,[k]:v}:it)});

  if (!q) return <div className="flex justify-center items-center h-40"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B3D91]"/></div>;

  const sc           = STATUS_CONFIG[q.status]||STATUS_CONFIG.draft;
  const items        = q.items||[];
  const subtotal     = items.reduce((s,it)=>s+calcSub(it),0);
  const totalDiscAmt = items.reduce((s,it)=>s+calcDiscAmt(it),0);
  const hasDiscount  = totalDiscAmt > 0;
  const vatPct       = (q.vat_include && q.vat_pct) ? parseFloat(q.vat_pct) : 0;
  const vatAmt       = q.vat_include ? subtotal*vatPct/100 : 0;
  const grandTotal   = subtotal + vatAmt;

  const sectionHdr = "text-xs font-extrabold text-[#0B3D91] uppercase tracking-widest border-b border-[#0B3D91]/10 pb-1.5 mb-4";

  return (
    <div className="max-w-4xl mx-auto">
      {previewUrl && <PDFPreviewModal url={previewUrl} quotationNumber={q.quotation_number} onClose={()=>{URL.revokeObjectURL(previewUrl);setPreviewUrl(null);}}/>}
      {deleteDialog && <DeleteDialog title="Hapus Quotation?" message={"\""+q.quotation_number+"\" akan dihapus permanen."} onConfirm={handleDelete} onCancel={()=>setDeleteDialog(false)} loading={deleting}/>}

      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <button onClick={()=>navigate("/quotations")} className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#0B3D91] font-medium transition-colors">
          ← Kembali ke Daftar
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {!editMode && (<>
            <button onClick={previewPDF} disabled={previewLoading} className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 shadow-sm disabled:opacity-60 transition-colors">
              {previewLoading?<div className="w-3 h-3 border-2 border-gray-300 border-t-[#0B3D91] rounded-full animate-spin"/>:"👁"} Preview PDF
            </button>
            <button onClick={downloadPDF} disabled={pdfLoading} className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 shadow-sm disabled:opacity-60 transition-colors">
              {pdfLoading?<div className="w-3 h-3 border-2 border-gray-300 border-t-[#0B3D91] rounded-full animate-spin"/>:"⬇"} Download PDF
            </button>
            <button onClick={openEdit} className="flex items-center gap-1.5 px-4 py-2 bg-[#0B3D91] text-white rounded-xl text-xs font-semibold hover:bg-[#1E5CC6] transition-colors">✏️ Edit</button>
            <button onClick={()=>setDeleteDialog(true)} className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition-colors">🗑</button>
          </>)}
          {editMode && (<>
            <button onClick={()=>setEditMode(false)} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-50">Batal</button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-5 py-2 bg-[#0B3D91] text-white rounded-xl text-xs font-bold hover:bg-[#1E5CC6] disabled:opacity-60 transition-colors">
              {saving&&<div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/>}
              {saving?"Menyimpan...":"💾 Simpan Perubahan"}
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
                    {q.revision>0&&<span className="px-2 py-0.5 bg-orange-400 text-white text-xs font-bold rounded-full">Rev.{q.revision}</span>}
                    <span className={"inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold "+sc.color}>
                      <span className={"w-1.5 h-1.5 rounded-full "+sc.dot}/>{sc.label}
                    </span>
                  </div>
                  <p className="text-blue-200 text-sm mt-1">{q.project_name||"No project name"}</p>
                  <div className="flex flex-wrap gap-4 mt-3 text-xs text-blue-100">
                    <span>📅 Dibuat: {fmtDate(q.created_at)}</span>
                    {q.updated_at&&q.updated_at!==q.created_at&&<span>✏️ Diubah: {fmtDT(q.updated_at)}</span>}
                    {q.valid_until&&<span>⏳ Berlaku s/d: {fmtDate(q.valid_until)}</span>}
                    {q.currency&&q.currency!=="IDR"&&<span>💱 {q.currency}</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-blue-200 text-xs mb-1">Grand Total</p>
                  <p className="text-2xl font-black">{fmtRp(grandTotal,q.currency)}</p>
                  {hasDiscount&&<p className="text-blue-200 text-xs mt-1">Disc: ({fmtRp(totalDiscAmt,q.currency)})</p>}
                  {q.vat_include&&<p className="text-blue-200 text-xs mt-0.5">VAT {vatPct}%: {fmtRp(vatAmt,q.currency)}</p>}
                </div>
              </div>
            </div>
            <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-5">
              <div><p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Customer</p><p className="font-bold text-gray-800 text-sm">{q.customer_company||"-"}</p><p className="text-xs text-gray-500">{q.customer_name}</p>{q.customer_email&&<p className="text-xs text-gray-400 mt-0.5">{q.customer_email}</p>}</div>
              <div><p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Sales Person</p><p className="font-semibold text-gray-700 text-sm">{q.sales_person||"-"}</p>{q.ref_no&&<p className="text-xs text-gray-400 mt-0.5">Ref: {q.ref_no}</p>}</div>
              <div><p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Payment Terms</p><p className="font-semibold text-gray-700 text-sm">{q.payment_terms||"-"}</p></div>
              <div><p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Delivery</p><p className="font-semibold text-gray-700 text-sm">{q.delivery||"-"}</p>{q.shipment_terms&&<p className="text-xs text-gray-400 mt-0.5">{q.shipment_terms}</p>}</div>
            </div>
          </div>

          {/* Status */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Update Status</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(STATUS_CONFIG).map(([k,v])=>(
                <button key={k} onClick={()=>updateStatus(k)}
                  className={"px-4 py-2 rounded-xl text-xs font-semibold border transition-all "+(q.status===k ? v.color+" border-transparent shadow-sm" : "border-gray-200 text-gray-500 hover:border-gray-300")}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Items table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-sm">📦 Item & Harga</h2>
              <span className="text-xs text-gray-400">{items.length} item</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-[#0B3D91] to-[#1E5CC6] text-white">
                    {["No","Deskripsi","UOM","Qty","Harga Satuan","Disc%","Subtotal"].map(h=>(
                      <th key={h} className={"px-4 py-3 text-xs font-bold uppercase tracking-wide "+(h==="Subtotal"||h==="Harga Satuan"?"text-right":h==="No"||h==="UOM"||h==="Qty"||h==="Disc%"?"text-center":"text-left")}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map((item,i)=>(
                    <tr key={i} className={i%2===0?"bg-white":"bg-gray-50/50"}>
                      <td className="px-4 py-3 text-center text-xs text-gray-400 font-semibold">{i+1}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-800 text-xs leading-snug">{item.description}</p>
                        {(item.brand||item.model)&&<p className="text-xs text-gray-400 mt-0.5">{[item.brand,item.model&&"P/N: "+item.model].filter(Boolean).join(" | ")}</p>}
                        {item.remarks&&<p className="text-xs text-gray-400 italic mt-0.5">{item.remarks}</p>}
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-gray-500">{item.unit||"Unit"}</td>
                      <td className="px-4 py-3 text-center text-xs font-semibold text-gray-800">{item.qty}</td>
                      <td className="px-4 py-3 text-right text-xs text-gray-600">{fmtRp(item.unit_price,q.currency)}</td>
                      <td className="px-4 py-3 text-center">
                        {parseFloat(item.discount)>0
                          ? <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">{item.discount}%</span>
                          : <span className="text-xs text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-bold text-gray-800">{fmtRp(calcSub(item),q.currency)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-gray-200">
                  {hasDiscount && (
                    <tr className="bg-gray-50/40">
                      <td colSpan="6" className="px-4 py-2 text-right text-xs text-gray-500 font-semibold">Subtotal (sebelum diskon)</td>
                      <td className="px-4 py-2 text-right text-xs text-gray-500 font-semibold">{fmtRp(items.reduce((s,it)=>s+calcGross(it),0),q.currency)}</td>
                    </tr>
                  )}
                  {hasDiscount && (
                    <tr className="bg-orange-50/60">
                      <td colSpan="6" className="px-4 py-2 text-right text-xs font-bold text-orange-600">Total Diskon</td>
                      <td className="px-4 py-2 text-right text-xs font-bold text-orange-600">({fmtRp(totalDiscAmt,q.currency)})</td>
                    </tr>
                  )}
                  <tr className="bg-white">
                    <td colSpan="6" className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">{hasDiscount?"Net Subtotal":"Subtotal"}</td>
                    <td className="px-4 py-2.5 text-right text-sm font-bold text-gray-800">{fmtRp(subtotal,q.currency)}</td>
                  </tr>
                  {q.vat_include && (
                    <tr className="bg-white">
                      <td colSpan="6" className="px-4 py-1.5 text-right text-xs text-gray-400">VAT / PPN {vatPct}%</td>
                      <td className="px-4 py-1.5 text-right text-xs text-gray-500">{fmtRp(vatAmt,q.currency)}</td>
                    </tr>
                  )}
                  <tr className="bg-gradient-to-r from-[#0B3D91] to-[#1E5CC6]">
                    <td colSpan="6" className="px-4 py-3.5 text-right text-sm font-black text-white">GRAND TOTAL</td>
                    <td className="px-4 py-3.5 text-right text-base font-black text-white">{fmtRp(grandTotal,q.currency)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Terms */}
          {(q.shipment_terms||q.delivery||q.payment_terms||q.notes||q.terms)&&(
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wider mb-4">📋 Terms & Conditions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                {[["Shipment Terms",q.shipment_terms],["Payment Terms",q.payment_terms],["Delivery",q.delivery],["Notes",q.notes]].map(([l,v])=>v&&(
                  <div key={l}><p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">{l}</p><p className="text-gray-700">{v}</p></div>
                ))}
                {q.terms&&(
                  <div className="sm:col-span-2">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Terms Tambahan</p>
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
          <div className="px-6 py-4 border-b border-amber-100 bg-amber-50 rounded-t-2xl flex items-center gap-2">
            <span className="text-amber-500 text-lg">✏️</span>
            <div>
              <p className="text-sm font-bold text-amber-800">Mode Edit — {q.quotation_number}</p>
              <p className="text-xs text-amber-600">Perubahan pada item/harga/terms akan otomatis menambah nomor revision</p>
            </div>
          </div>

          <div className="p-6 space-y-8">
            {/* ① Customer */}
            <section>
              <h3 className={sectionHdr}>① Customer & Project</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Nama PIC / Contact Person" value={form.customer_name}    onChange={e=>sf({customer_name:e.target.value})}    required/>
                <Field label="Nama Perusahaan"           value={form.customer_company} onChange={e=>sf({customer_company:e.target.value})} required/>
                <Field label="Email Customer"            value={form.customer_email}   onChange={e=>sf({customer_email:e.target.value})}   type="email"/>
                <Field label="No. Telepon"               value={form.customer_phone}   onChange={e=>sf({customer_phone:e.target.value})}/>
                <Field label="Alamat"                    value={form.customer_address} onChange={e=>sf({customer_address:e.target.value})} type="textarea" className="sm:col-span-2"/>
                <Field label="Subject / Nama Project"    value={form.project_name}     onChange={e=>sf({project_name:e.target.value})}    className="sm:col-span-2"/>
              </div>
            </section>

            {/* ② Detail */}
            <section>
              <h3 className={sectionHdr}>② Detail Quotation</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Field label="Sales Person" value={form.sales_person} onChange={e=>sf({sales_person:e.target.value})}/>
                <Field label="Ref. No."     value={form.ref_no}       onChange={e=>sf({ref_no:e.target.value})}/>
                <SelectField label="Kategori" value={form.category} onChange={e=>sf({category:e.target.value})} options={CATEGORIES} placeholder="Pilih..."/>
                <SelectField label="Mata Uang" value={form.currency} onChange={e=>sf({currency:e.target.value})} options={["IDR","USD","SGD","EUR"]}/>
                <Field label="Berlaku Hingga" type="date" value={form.valid_until||""} onChange={e=>sf({valid_until:e.target.value})}/>
              </div>
              <div className="mt-3 flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                <input type="checkbox" id="vat_edit" checked={!!form.vat_include} onChange={e=>sf({vat_include:e.target.checked})} className="w-4 h-4 accent-[#0B3D91]"/>
                <label htmlFor="vat_edit" className="text-sm font-semibold text-gray-700 cursor-pointer flex-1">Sertakan VAT / PPN</label>
                {form.vat_include&&(
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">VAT</span>
                    <input type="number" value={form.vat_pct!=null?form.vat_pct:11} onChange={e=>sf({vat_pct:parseFloat(e.target.value)||11})}
                      className="w-14 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#0B3D91]" min="0" max="100"/>
                    <span className="text-xs text-gray-500">%</span>
                  </div>
                )}
              </div>
            </section>

            {/* ③ Items */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-extrabold text-[#0B3D91] uppercase tracking-widest">③ Item & Harga</h3>
                <button onClick={addItem} className="text-xs font-bold text-[#0B3D91] hover:underline">+ Tambah Item</button>
              </div>
              <div className="space-y-3">
                {form.items.map((item,i)=>(
                  <div key={i} className="bg-gray-50/80 rounded-xl p-4 border border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-extrabold text-gray-300 uppercase tracking-widest">Item {i+1}</span>
                      {form.items.length>1&&<button onClick={()=>rmItem(i)} className="text-xs text-red-400 hover:text-red-600 font-semibold">Hapus</button>}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <Field label="Deskripsi Produk / Jasa" value={item.description} onChange={e=>upItem(i,"description",e.target.value)} required className="col-span-2 sm:col-span-4"/>
                      <Field label="Brand"               value={item.brand}       onChange={e=>upItem(i,"brand",e.target.value)}/>
                      <Field label="Model / Part Number" value={item.model}       onChange={e=>upItem(i,"model",e.target.value)}/>
                      <Field label="Keterangan / Spec"   value={item.remarks}     onChange={e=>upItem(i,"remarks",e.target.value)} className="col-span-2"/>
                      <Field label="Qty"                 type="number" value={item.qty}        onChange={e=>upItem(i,"qty",e.target.value)}/>
                      <Field label="Satuan (UOM)"        value={item.unit}        onChange={e=>upItem(i,"unit",e.target.value)}/>
                      <Field label="Harga Satuan"        type="number" value={item.unit_price} onChange={e=>upItem(i,"unit_price",e.target.value)}/>
                      <Field label="Diskon %"            type="number" value={item.discount}   onChange={e=>upItem(i,"discount",e.target.value)}/>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                      {parseFloat(item.discount)>0 && (
                        <span className="text-xs text-orange-500 font-semibold">Disc: ({fmtRp(calcDiscAmt(item),form.currency)})</span>
                      )}
                      <span className="ml-auto text-xs text-gray-400">Subtotal: <span className="font-black text-[#0B3D91] text-sm">{fmtRp(calcSub(item),form.currency)}</span></span>
                    </div>
                  </div>
                ))}
              </div>
              {(()=>{
                const sub=form.items.reduce((s,it)=>s+calcSub(it),0);
                const discTot=form.items.reduce((s,it)=>s+calcDiscAmt(it),0);
                const vatA=form.vat_include?sub*(parseFloat(form.vat_pct)||11)/100:0;
                const grand=sub+vatA;
                const hasD=discTot>0;
                return (
                  <div className="mt-2 p-4 bg-[#0B3D91]/5 rounded-xl border border-[#0B3D91]/10 text-right space-y-1.5">
                    {hasD&&<p><span className="text-xs text-orange-500">Total Diskon: </span><span className="text-sm font-bold text-orange-600">({fmtRp(discTot,form.currency)})</span></p>}
                    <p><span className="text-xs text-gray-500">{hasD?"Net Subtotal:":"Subtotal:"} </span><span className="text-sm font-bold text-gray-700">{fmtRp(sub,form.currency)}</span></p>
                    {form.vat_include&&<p><span className="text-xs text-gray-500">VAT {form.vat_pct}%: </span><span className="text-sm font-bold text-gray-700">{fmtRp(vatA,form.currency)}</span></p>}
                    <p className="border-t border-[#0B3D91]/20 pt-1.5"><span className="text-sm font-bold text-gray-600">GRAND TOTAL: </span><span className="text-lg font-black text-[#0B3D91]">{fmtRp(grand,form.currency)}</span></p>
                  </div>
                );
              })()}
            </section>

            {/* ④ Terms */}
            <section>
              <h3 className={sectionHdr}>④ Terms & Conditions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Shipment Terms"            value={form.shipment_terms} onChange={e=>sf({shipment_terms:e.target.value})}/>
                <Field label="Payment Terms"             value={form.payment_terms}  onChange={e=>sf({payment_terms:e.target.value})}/>
                <Field label="Delivery / Lead Time"      value={form.delivery}       onChange={e=>sf({delivery:e.target.value})}/>
                <Field label="Note untuk Customer"       value={form.notes}          onChange={e=>sf({notes:e.target.value})}/>
                <Field label="Terms Tambahan (opsional)" value={form.terms}          onChange={e=>sf({terms:e.target.value})} type="textarea" className="sm:col-span-2"/>
              </div>
            </section>
          </div>

          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3 bg-gray-50/50 rounded-b-2xl">
            <p className="text-xs text-gray-400">Perubahan item/harga/terms → revision auto-increment</p>
            <div className="flex gap-3">
              <button onClick={()=>setEditMode(false)} className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-white">Batal</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-bold hover:bg-[#1E5CC6] disabled:opacity-60 transition-colors">
                {saving&&<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>}
                {saving?"Menyimpan...":"💾 Simpan Perubahan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}