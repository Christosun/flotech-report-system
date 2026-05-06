import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FileText, BarChart2, Building2, Plus, Search, SlidersHorizontal,
  Upload, CheckSquare, X, ChevronLeft, ChevronRight, ChevronsLeft,
  ChevronsRight, Trash2, Download, FileSpreadsheet, CheckCircle2,
  TrendingUp, DollarSign, Pencil, AlertTriangle, ChevronDown,
  RefreshCw, Eye, ArrowUpRight, Circle
} from "lucide-react";
import API from "../services/api";

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_CFG = {
  draft:    { label: "Draft",     color: "bg-gray-100 text-gray-600",       dot: "bg-gray-400",    hex: "#94a3b8" },
  sent:     { label: "Sent",      color: "bg-blue-100 text-blue-700",       dot: "bg-blue-500",    hex: "#3b82f6" },
  followup: { label: "Follow Up", color: "bg-amber-100 text-amber-700",     dot: "bg-amber-500",   hex: "#f59e0b" },
  won:      { label: "Won",       color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500", hex: "#10b981" },
  lost:     { label: "Lost",      color: "bg-red-100 text-red-600",         dot: "bg-red-400",     hex: "#ef4444" },
  cancel:   { label: "Cancelled", color: "bg-gray-100 text-gray-400",       dot: "bg-gray-300",    hex: "#d1d5db" },
};
const STATUS_COLORS = {
  draft:"#94a3b8", sent:"#3b82f6", followup:"#f59e0b", won:"#10b981", lost:"#ef4444", cancel:"#d1d5db"
};

const EMPTY_ITEM = { description:"", brand:"", model:"", unit:"Unit", qty:1, unit_price:0, discount:0, remarks:"", sub_items:[] };
const EMPTY_SUB  = { sub_label:"", qty:1, unit_price:0, discount:0 };
const CATEGORIES = [
  "Flow Measurement","Level Measurement","Pressure Measurement",
  "Energy Measurement","Process Analyzer","Service / Repair","Others"
];
const PAGE_SIZE_OPTIONS = [5, 10, 25, 100];

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
const fmtDT = iso => {
  const d = toWIB(iso);
  if (!d) return "-";
  return d.toLocaleString("id-ID", { day:"2-digit", month:"short", year:"2-digit", hour:"2-digit", minute:"2-digit" }) + " WIB";
};
const fmtD = iso => {
  const d = toWIB(iso);
  if (!d) return "-";
  return d.toLocaleDateString("id-ID", { day:"2-digit", month:"short", year:"numeric" });
};
const calcSubItem = s =>
  (parseFloat(s.unit_price)||0) * (parseFloat(s.qty)||0) * (1 - (parseFloat(s.discount)||0) / 100);
const calcSub = it => {
  if (it.sub_items && it.sub_items.length > 0)
    return it.sub_items.reduce((s, si) => s + calcSubItem(si), 0);
  return (parseFloat(it.unit_price)||0) * (parseFloat(it.qty)||0) * (1 - (parseFloat(it.discount)||0) / 100);
};

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({ label, type="text", value, onChange, placeholder, required, children, className="", rows=3, readOnly=false }) {
  const base = `peer w-full border rounded-xl px-3 pt-6 pb-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] transition-all
    ${readOnly ? "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed" : "border-gray-200 bg-white"}`;
  const lbl = "absolute left-3 top-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide pointer-events-none select-none";
  return (
    <div className={`relative ${className}`}>
      {children ? children : (
        type === "select"
          ? <select value={value ?? ""} onChange={onChange} className={`${base} cursor-pointer`}>
              {placeholder && <option value="">{placeholder}</option>}
            </select>
          : type === "textarea"
          ? <textarea value={value ?? ""} onChange={onChange} rows={rows} placeholder=" " readOnly={readOnly} className={`${base} resize-y`}/>
          : <input type={type} value={value ?? ""} onChange={onChange} placeholder=" " required={required} readOnly={readOnly} className={base}/>
      )}
      <label className={lbl}>
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        {readOnly && <span className="text-gray-300 ml-1 font-normal normal-case">(auto)</span>}
      </label>
    </div>
  );
}

// ─── SelectField ──────────────────────────────────────────────────────────────
function SelectField({ label, value, onChange, options, placeholder, required, className="" }) {
  const base = "peer w-full border border-gray-200 rounded-xl px-3 pt-6 pb-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white transition-all cursor-pointer";
  const lbl  = "absolute left-3 top-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide pointer-events-none select-none";
  return (
    <div className={`relative ${className}`}>
      <select value={value ?? ""} onChange={onChange} className={base}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
      </select>
      <label className={lbl}>{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
    </div>
  );
}

// ─── Delete Dialog ────────────────────────────────────────────────────────────
function DeleteDialog({ title, description, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
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
            {loading
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
              : <Trash2 className="w-4 h-4" />}
            {loading ? "Deleting..." : "Permanently Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Customer Modal ───────────────────────────────────────────────────────────
function CustomerModal({ onClose, onSelect }) {
  const [list, setList]             = useState([]);
  const [search, setSearch]         = useState("");
  const [showForm, setShowForm]     = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm]             = useState({ company_name:"", address:"", phone:"", email:"", industry:"", notes:"" });
  const [saving, setSaving]         = useState(false);
  const [loading, setLoading]       = useState(true);

  const load = useCallback(async () => {
    try { const r = await API.get("/customer/list"); setList(r.data); }
    catch {}
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setEditTarget(null); setForm({ company_name:"",address:"",phone:"",email:"",industry:"",notes:"" }); setShowForm(true); };
  const openEdit = c  => { setEditTarget(c); setForm({ company_name:c.company_name,address:c.address||"",phone:c.phone||"",email:c.email||"",industry:c.industry||"",notes:c.notes||"" }); setShowForm(true); };

  const save = async () => {
    if (!form.company_name.trim()) { toast.error("Company name is mandatory"); return; }
    setSaving(true);
    try {
      if (editTarget) await API.put(`/customer/update/${editTarget.id}`, form);
      else await API.post("/customer/create", form);
      toast.success(editTarget ? "Customer updated" : "Customer added");
      setShowForm(false); load();
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  };

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]         = useState(false);

  const del = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await API.delete(`/customer/delete/${deleteTarget.id}`);
      toast.success("Customer deleted");
      setDeleteTarget(null);
      load();
    } catch { toast.error("Failed to delete"); }
    finally { setDeleting(false); }
  };

  const filtered = list.filter(c =>
    !search || [c.company_name,c.phone,c.email,c.address].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      {deleteTarget && (
        <DeleteDialog
          title="Delete Customer?"
          description={`"${deleteTarget.company_name}" will be permanently deleted.`}
          onConfirm={del}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#0B3D91]" />
            Customer Database
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={openAdd} className="flex items-center gap-1 text-xs font-bold text-[#0B3D91] hover:underline">
              <Plus className="w-3.5 h-3.5" /> Add Customer
            </button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        {showForm && (
          <div className="px-6 py-4 border-b border-gray-100 bg-blue-50/50 shrink-0">
            <p className="text-xs font-bold text-[#0B3D91] uppercase tracking-wide mb-3">{editTarget ? "Edit Customer" : "Add New Customer"}</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <Field label="Company Name" value={form.company_name} onChange={e=>setForm(p=>({...p,company_name:e.target.value}))} required className="col-span-2"/>
              <Field label="Phone"         value={form.phone}        onChange={e=>setForm(p=>({...p,phone:e.target.value}))}/>
              <Field label="Email" type="email" value={form.email}   onChange={e=>setForm(p=>({...p,email:e.target.value}))}/>
              <Field label="Industry"      value={form.industry}     onChange={e=>setForm(p=>({...p,industry:e.target.value}))}/>
              <Field label="Address"       value={form.address}      onChange={e=>setForm(p=>({...p,address:e.target.value}))}/>
            </div>
            <div className="flex gap-2">
              <button onClick={save} disabled={saving}
                className="flex-1 py-2 bg-[#0B3D91] text-white rounded-xl text-xs font-bold hover:bg-[#1E5CC6] disabled:opacity-60">
                {saving ? "Saving..." : editTarget ? "Update" : "Save"}
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        )}
        <div className="px-4 py-3 border-b border-gray-100 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search customer..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91]"/>
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {loading
            ? <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0B3D91]"/></div>
            : filtered.length === 0
              ? <p className="text-center text-gray-400 py-8 text-sm">No customers yet</p>
              : filtered.map(c => (
                <div key={c.id} className="flex items-center justify-between px-4 py-3 hover:bg-blue-50/50 border-b border-gray-50 group">
                  <div className="flex-1 cursor-pointer" onClick={() => { onSelect(c); onClose(); }}>
                    <p className="font-semibold text-gray-800 text-sm">{c.company_name}</p>
                    <p className="text-xs text-gray-400">{[c.phone, c.email].filter(Boolean).join(" · ")}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteTarget(c)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
          }
        </div>
      </div>
    </div>
  );
}

// ─── Create Modal ─────────────────────────────────────────────────────────────
function CreateModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    base_number:"", customer_name:"", customer_company:"", customer_email:"",
    customer_phone:"", customer_address:"", project_name:"", category:"",
    valid_until:"", currency:"IDR", vat_pct:"11", vat_include:false,
    sales_person:"", ref_no:"", shipment_terms:"", delivery:"", payment_terms:"",
    notes:"", terms:"", items:[{ ...EMPTY_ITEM }],
  });
  const [saving, setSaving]         = useState(false);
  const [loading, setLoading]       = useState(true);
  const [showCustDB, setShowCustDB] = useState(false);
  const f  = form;
  const sf = v => setForm(p => ({ ...p, ...v }));

  useEffect(() => {
    API.get("/quotation/next-number")
      .then(r => sf({ base_number: r.data.number }))
      .catch(() => toast.error("Failed to generate number"))
      .finally(() => setLoading(false));
  }, []);

  const addItem    = ()         => sf({ items:[...f.items, { ...EMPTY_ITEM }] });
  const rmItem     = i          => sf({ items:f.items.filter((_,idx) => idx !== i) });
  const upItem     = (i,k,v)   => sf({ items:f.items.map((it,idx) => idx===i ? { ...it,[k]:v } : it) });
  const addSubItem = i          => sf({ items:f.items.map((it,idx) => idx===i ? { ...it, sub_items:[...(it.sub_items||[]),{ ...EMPTY_SUB }] } : it) });
  const rmSubItem  = (i,si)    => sf({ items:f.items.map((it,idx) => idx===i ? { ...it, sub_items:it.sub_items.filter((_,s) => s!==si) } : it) });
  const upSubItem  = (i,si,k,v) => sf({ items:f.items.map((it,idx) => idx===i ? { ...it, sub_items:it.sub_items.map((s,sidx) => sidx===si ? { ...s,[k]:v } : s) } : it) });

  const subtotal = f.items.reduce((s,it) => s + calcSub(it), 0);
  const vatAmt   = f.vat_include ? subtotal * (parseFloat(f.vat_pct)||0) / 100 : 0;

  const selectCustomer = c => {
    sf({
      customer_company: c.company_name,
      customer_email:   c.email   || f.customer_email,
      customer_phone:   c.phone   || f.customer_phone,
      customer_address: c.address || f.customer_address,
    });
    setShowCustDB(false);
    toast.success(`"${c.company_name}" selected`);
  };

  const submit = async () => {
    if (!f.base_number || !f.customer_name || !f.customer_company) {
      toast.error("Quotation number, PIC & company are required"); return;
    }
    setSaving(true);
    try {
      await API.post("/quotation/create", { ...f, total_amount:subtotal });
      toast.success("Quotation created!"); onCreated(); onClose();
    } catch(e) { toast.error(e.response?.data?.error || "Failed"); }
    finally { setSaving(false); }
  };

  const sectionCls = "space-y-4";
  const sectionHdr = "text-xs font-extrabold text-[#0B3D91] uppercase tracking-widest border-b border-[#0B3D91]/10 pb-1.5";

  return (
    <>
      {showCustDB && <CustomerModal onClose={() => setShowCustDB(false)} onSelect={selectCustomer}/>}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-start justify-center overflow-y-auto py-6 px-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
            <div>
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#0B3D91]" />
                Create New Quotation
              </h2>
              <p className="text-xs font-mono text-[#0B3D91]">{loading ? "Generating..." : f.base_number}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-7">
            <section className={sectionCls}>
              <h3 className={sectionHdr}>① Quotation Information</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Field label="No. Quotation" value={f.base_number} onChange={() => {}} readOnly required/>
                <Field label="Sales Person"  value={f.sales_person} onChange={e=>sf({sales_person:e.target.value})}/>
                <Field label="Ref. No."      value={f.ref_no}       onChange={e=>sf({ref_no:e.target.value})}/>
                <Field label="Valid Until"   type="date" value={f.valid_until} onChange={e=>sf({valid_until:e.target.value})}/>
                <SelectField label="Currency" value={f.currency} onChange={e=>sf({currency:e.target.value})} options={["IDR","USD","SGD","EUR"]}/>
                <SelectField label="Category"  value={f.category} onChange={e=>sf({category:e.target.value})} options={CATEGORIES} placeholder="Select category"/>
              </div>
            </section>

            <section className={sectionCls}>
              <div className="flex items-center justify-between">
                <h3 className={sectionHdr}>② Customer Information</h3>
                <button onClick={() => setShowCustDB(true)} className="flex items-center gap-1 text-xs font-bold text-[#0B3D91] hover:underline">
                  <Building2 className="w-3.5 h-3.5" /> Select from Database
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Field label="PIC Name"   value={f.customer_name}    onChange={e=>sf({customer_name:e.target.value})}    required/>
                <Field label="Company" value={f.customer_company} onChange={e=>sf({customer_company:e.target.value})} required/>
                <Field label="Email" type="email" value={f.customer_email} onChange={e=>sf({customer_email:e.target.value})}/>
                <Field label="Phone"    value={f.customer_phone}   onChange={e=>sf({customer_phone:e.target.value})}/>
                <Field label="Address"     value={f.customer_address} onChange={e=>sf({customer_address:e.target.value})} className="sm:col-span-2"/>
                <Field label="Subject / Project" value={f.project_name} onChange={e=>sf({project_name:e.target.value})} className="sm:col-span-2"/>
              </div>
            </section>

            <section className={sectionCls}>
              <div className="flex items-center justify-between">
                <h3 className={sectionHdr}>③ Item &amp; Price</h3>
                <button onClick={addItem} className="flex items-center gap-1 text-xs font-bold text-[#0B3D91] hover:underline">
                  <Plus className="w-3.5 h-3.5" /> Add Item
                </button>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <input type="checkbox" id="vat_create" checked={!!f.vat_include}
                  onChange={e => sf({ vat_include:e.target.checked })} className="w-4 h-4 accent-[#0B3D91]"/>
                <label htmlFor="vat_create" className="text-sm font-semibold text-gray-700 cursor-pointer flex-1">Include VAT / PPN</label>
                {f.vat_include && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">VAT</span>
                    <input type="number" value={f.vat_pct} onChange={e => sf({ vat_pct:e.target.value })}
                      className="w-14 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#0B3D91]"
                      min="0" max="100"/>
                    <span className="text-xs text-gray-500">%</span>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                {f.items.map((item, i) => (
                  <div key={`create-item-${i}`} className="bg-gray-50/80 rounded-xl p-4 border border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-extrabold text-gray-300 uppercase">Item {i+1}</span>
                      {f.items.length > 1 && (
                        <button onClick={() => rmItem(i)} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 font-semibold">
                          <Trash2 className="w-3 h-3" /> Delete
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
                        <Field label="Qty"          type="number" value={item.qty}        onChange={e => upItem(i,"qty",e.target.value)}/>
                        <Field label="Unit (UOM)"               value={item.unit}        onChange={e => upItem(i,"unit",e.target.value)}/>
                        <Field label="Unit Price" type="number" value={item.unit_price}  onChange={e => upItem(i,"unit_price",e.target.value)}/>
                        <Field label="Discount %"     type="number" value={item.discount}    onChange={e => upItem(i,"discount",e.target.value)}/>
                      </div>
                    ) : (
                      <div className="mt-3 space-y-2">
                        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wide">Variants / Sub-Items</p>
                        {item.sub_items.map((s, si) => (
                          <div key={`create-item-${i}-sub-${si}`}
                            className="flex items-center gap-2 bg-white rounded-lg p-2.5 border border-blue-100">
                            <span className="text-[10px] font-bold text-blue-400 shrink-0">{i+1}.{si+1}</span>
                            <input placeholder="Size / Label" value={s.sub_label ?? ""}
                              onChange={e => upSubItem(i,si,"sub_label",e.target.value)}
                              className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0B3D91] min-w-0"/>
                            <input placeholder="Qty" type="number" value={s.qty ?? ""}
                              onChange={e => upSubItem(i,si,"qty",e.target.value)}
                              className="w-14 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-2 focus:ring-[#0B3D91]"/>
                            <input placeholder="Price" type="number" value={s.unit_price ?? ""}
                              onChange={e => upSubItem(i,si,"unit_price",e.target.value)}
                              className="w-28 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0B3D91]"/>
                            <input placeholder="Disc%" type="number" value={s.discount ?? ""}
                              onChange={e => upSubItem(i,si,"discount",e.target.value)}
                              className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-2 focus:ring-[#0B3D91]"/>
                            <span className="text-[10px] font-bold text-[#0B3D91] shrink-0 min-w-[60px] text-right">
                              {fmtRp(calcSubItem(s), f.currency)}
                            </span>
                            <button onClick={() => rmSubItem(i,si)} className="text-red-400 hover:text-red-600 shrink-0">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                      <button onClick={() => addSubItem(i)}
                        className="flex items-center gap-1 text-[10px] font-bold text-blue-500 hover:text-blue-700 hover:underline">
                        <Plus className="w-3 h-3" />
                        {(!item.sub_items || item.sub_items.length === 0) ? "Add Variant (Different Size)" : "Add Variant"}
                      </button>
                      <div className="text-right">
                        <span className="text-xs text-gray-400">Subtotal: </span>
                        <span className="text-sm font-black text-[#0B3D91]">{fmtRp(calcSub(item), f.currency)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 p-4 bg-[#0B3D91]/5 rounded-xl border border-[#0B3D91]/10 text-right space-y-1">
                <p><span className="text-xs text-gray-500">Subtotal: </span>
                   <span className="text-sm font-bold text-gray-700">{fmtRp(subtotal, f.currency)}</span></p>
                {f.vat_include && (
                  <p><span className="text-xs text-gray-500">VAT {f.vat_pct}%: </span>
                     <span className="text-sm font-bold text-gray-700">{fmtRp(vatAmt, f.currency)}</span></p>
                )}
                <p><span className="text-sm font-bold text-gray-600">TOTAL: </span>
                   <span className="text-lg font-black text-[#0B3D91]">{fmtRp(subtotal + vatAmt, f.currency)}</span></p>
              </div>
            </section>

            <section className={sectionCls}>
              <h3 className={sectionHdr}>④ Terms &amp; Conditions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Shipment Terms"               value={f.shipment_terms} onChange={e=>sf({shipment_terms:e.target.value})}/>
                <Field label="Payment Terms"                value={f.payment_terms}  onChange={e=>sf({payment_terms:e.target.value})}/>
                <Field label="Delivery / Lead Time"         value={f.delivery}       onChange={e=>sf({delivery:e.target.value})}/>
                <Field label="Note to Customer"          type="textarea" rows={4} value={f.notes} onChange={e=>sf({notes:e.target.value})} className="sm:col-span-2"/>
                <Field label="Additional Terms (Optional)" type="textarea" value={f.terms} onChange={e=>sf({terms:e.target.value})} className="sm:col-span-2"/>
              </div>
            </section>
          </div>

          <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-0 bg-white rounded-b-2xl">
            <p className="text-xs text-gray-400">Auto-increment revision when there are changes to items/prices/terms</p>
            <div className="flex gap-3 w-full sm:w-auto">
              <button onClick={onClose}
                className="flex-1 sm:flex-none px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={submit} disabled={saving}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-bold hover:bg-[#1E5CC6] disabled:opacity-60">
                {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>}
                {saving ? "Saving..." : "Save Quotation"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Analytics Panel ──────────────────────────────────────────────────────────
function AnalyticsPanel({ quotations, onClose }) {
  const [metric, setMetric]             = useState("count");
  const [period, setPeriod]             = useState("month");
  const [activeStatus, setActiveStatus] = useState(null);
  const [drillModal, setDrillModal]     = useState(null);
  const [hoveredIdx, setHoveredIdx]     = useState(null);
  const statuses = Object.keys(STATUS_CFG);

  const data = (() => {
    const map = {};
    quotations.forEach(q => {
      const d   = new Date(q.created_at);
      const key = period === "month"
        ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`
        : `${d.getFullYear()}`;
      if (!map[key]) map[key] = { _items: [] };
      const st = q.status || "draft";
      map[key][st]          = (map[key][st]||0) + 1;
      map[key][`${st}_val`] = (map[key][`${st}_val`]||0) + (q.total_amount||0);
      map[key]._items.push(q);
    });
    return Object.entries(map).sort(([a],[b]) => a.localeCompare(b)).map(([p, vals]) => ({ period:p, ...vals }));
  })();

  const filteredData = activeStatus
    ? data.map(d => ({ ...d, _filtered: (d._items||[]).filter(q => (q.status||"draft") === activeStatus) }))
    : data;

  const maxVal = Math.max(1, ...filteredData.map(d => {
    if (activeStatus) {
      const items = d._filtered || [];
      return metric === "count" ? items.length : items.reduce((s,q)=>s+(q.total_amount||0),0);
    }
    return metric === "count"
      ? statuses.reduce((s,st) => s+(d[st]||0), 0)
      : statuses.reduce((s,st) => s+(d[`${st}_val`]||0), 0);
  }));

  const totalByStatus = {};
  const totalValByStatus = {};
  statuses.forEach(st => {
    totalByStatus[st]    = quotations.filter(q=>(q.status||"draft")===st).length;
    totalValByStatus[st] = quotations.filter(q=>(q.status||"draft")===st).reduce((s,q)=>s+(q.total_amount||0),0);
  });

  const openDrill = (d) => {
    const items = activeStatus
      ? (d._items||[]).filter(q=>(q.status||"draft")===activeStatus)
      : (d._items||[]);
    setDrillModal({ period: d.period, items });
  };

  const hoveredData  = hoveredIdx !== null ? filteredData[hoveredIdx] : null;
  const hoveredItems = hoveredData
    ? (activeStatus ? (hoveredData._filtered||[]) : (hoveredData._items||[]))
    : [];
  const hoveredCount = hoveredData
    ? (activeStatus ? hoveredItems.length : statuses.reduce((s,st)=>s+(hoveredData[st]||0),0))
    : 0;
  const hoveredValue = hoveredData
    ? (activeStatus
        ? hoveredItems.reduce((s,q)=>s+(q.total_amount||0),0)
        : statuses.reduce((s,st)=>s+(hoveredData[`${st}_val`]||0),0))
    : 0;

  return (
    <>
      {drillModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#0B3D91]" />
                  Quotations — {drillModal.period}
                  {activeStatus && (
                    <span className={`ml-2 px-2.5 py-0.5 rounded-full text-xs font-bold ${STATUS_CFG[activeStatus]?.color}`}>
                      {STATUS_CFG[activeStatus]?.label}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">{drillModal.items.length} quotation(s) found</p>
              </div>
              <button onClick={() => setDrillModal(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
              {drillModal.items.length === 0 ? (
                <p className="text-center text-gray-400 py-10 text-sm">No quotations found</p>
              ) : drillModal.items.map(q => {
                const sc = STATUS_CFG[q.status] || STATUS_CFG.draft;
                return (
                  <div key={q.id}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-blue-50/50 cursor-pointer group transition-colors"
                    onClick={() => { setDrillModal(null); onClose(); window.location.href = `/quotations/${q.id}`; }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-[#0B3D91] text-xs">{q.quotation_number}</span>
                        {(q.revision||0) > 0 && (
                          <span className="text-[10px] bg-orange-100 text-orange-600 font-bold px-1.5 py-0.5 rounded-full">Rev.{q.revision}</span>
                        )}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${sc.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}/>{sc.label}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-gray-700 mt-0.5 truncate">{q.customer_company || "-"}</p>
                      <p className="text-xs text-gray-400 truncate">{q.project_name || "No project"}{q.sales_person ? ` · ${q.sales_person}` : ""}</p>
                    </div>
                    <div className="text-right ml-3 shrink-0">
                      <p className="text-sm font-bold text-gray-800">{fmtRp(q.total_amount, q.currency)}</p>
                      <p className="text-xs text-gray-400 mt-0.5 group-hover:text-[#0B3D91] transition-colors flex items-center gap-0.5 justify-end">
                        View <ArrowUpRight className="w-3 h-3" />
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
              <p className="text-xs text-gray-400 text-center">
                Total: <span className="font-bold text-gray-600">
                  {fmtRp(drillModal.items.reduce((s,q)=>s+(q.total_amount||0),0), "IDR")}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-[#0B3D91]" />
              Quotation Analytics
            </h2>
            <div className="flex items-center gap-2">
              {activeStatus && (
                <button onClick={() => setActiveStatus(null)}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-100 font-semibold transition-colors">
                  <X className="w-3 h-3" /> Clear filter
                </button>
              )}
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="p-6">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Click a status to filter</p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-5">
              {statuses.map(st => {
                const isActive = activeStatus === st;
                return (
                  <button key={st}
                    onClick={() => setActiveStatus(prev => prev === st ? null : st)}
                    className={`text-center p-2 rounded-xl border-2 transition-all ${
                      isActive ? "border-[#0B3D91] bg-[#0B3D91]/5 shadow-sm" : "border-transparent bg-gray-50 hover:border-gray-200 hover:bg-gray-100"
                    }`}>
                    <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ background:STATUS_COLORS[st] }}/>
                    <p className="text-xs text-gray-400">{STATUS_CFG[st].label}</p>
                    <p className={`font-black ${isActive ? "text-[#0B3D91]" : "text-gray-700"}`}>{totalByStatus[st]}</p>
                    <p className="text-[10px] text-gray-400">{fmtRp(totalValByStatus[st])}</p>
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2 mb-4 flex-wrap">
              {[["count","Count"],["value","Value"]].map(([k,l]) => (
                <button key={k} onClick={() => setMetric(k)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${metric===k?"bg-[#0B3D91] text-white":"bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{l}</button>
              ))}
              {[["month","Monthly"],["year","Yearly"]].map(([k,l]) => (
                <button key={k} onClick={() => setPeriod(k)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${period===k?"bg-[#0B3D91] text-white":"bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{l}</button>
              ))}
              <span className="ml-auto text-xs text-gray-400 flex items-center gap-1">
                <Eye className="w-3 h-3" /> Hover bar for info · Click to drill down
              </span>
            </div>
            {filteredData.length === 0 ? (
              <div className="text-center text-gray-400 py-12"><p>No data</p></div>
            ) : (
              <div className="space-y-1.5" onMouseLeave={() => setHoveredIdx(null)}>
                {filteredData.map((d, idx) => {
                  const items   = activeStatus ? (d._filtered||[]) : (d._items||[]);
                  const count   = activeStatus ? items.length : statuses.reduce((s,st) => s+(d[st]||0), 0);
                  const value   = activeStatus ? items.reduce((s,q)=>s+(q.total_amount||0),0) : statuses.reduce((s,st) => s+(d[`${st}_val`]||0), 0);
                  const barW    = metric === "count"
                    ? Math.max(items.length > 0 ? 1 : 0, count / maxVal * 100)
                    : Math.max(items.length > 0 ? 1 : 0, value / maxVal * 100);
                  const isEmpty = items.length === 0;
                  const isHov   = hoveredIdx === idx;
                  return (
                    <div key={d.period} className="flex items-center gap-3" onMouseEnter={() => !isEmpty && setHoveredIdx(idx)}>
                      <div className="w-16 text-xs font-mono font-bold shrink-0 text-right"
                        style={{ color: isHov ? "#0B3D91" : "#6B7280" }}>{d.period}</div>
                      <div className={`flex-1 relative h-9 bg-gray-100 rounded-lg overflow-hidden ${!isEmpty ? "cursor-pointer" : "cursor-default"}`}
                        onClick={() => !isEmpty && openDrill(d)}>
                        {activeStatus ? (
                          <div className="h-full rounded-lg transition-[width] duration-500"
                            style={{ width:`${barW}%`, background: STATUS_COLORS[activeStatus] }}/>
                        ) : (
                          <div className="h-full rounded-lg transition-[width] duration-500 flex overflow-hidden" style={{ width:`${barW}%` }}>
                            {statuses.map(st => {
                              const v     = metric === "count" ? (d[st]||0) : (d[`${st}_val`]||0);
                              const total = metric === "count" ? count : value;
                              const pct   = total > 0 ? v/total*100 : 0;
                              return pct > 0 ? <div key={st} style={{ width:`${pct}%`, background:STATUS_COLORS[st] }}/> : null;
                            })}
                          </div>
                        )}
                        {!isEmpty && <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity bg-black/[0.06] rounded-lg pointer-events-none" />}
                        {isEmpty && <div className="absolute inset-0 flex items-center pl-3"><span className="text-[10px] text-gray-300">No data</span></div>}
                      </div>
                      <div className="w-24 text-xs text-right shrink-0">
                        <span className="font-bold" style={{ color: isHov ? "#0B3D91" : "#374151" }}>
                          {metric === "count" ? count : fmtRp(value)}
                        </span>
                        {!isEmpty && <span className="block text-[10px] text-gray-400">{items.length} qt</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className={`mt-3 rounded-xl border transition-all duration-150 overflow-hidden ${hoveredData ? "border-[#0B3D91]/15 bg-[#0B3D91]/[0.03]" : "border-gray-100 bg-gray-50/50"}`} style={{ minHeight: "52px" }}>
              {hoveredData ? (
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold text-[#0B3D91]">{hoveredData.period}</span>
                    <div className="flex gap-4 text-xs">
                      <span className="text-gray-500">Count: <span className="font-bold text-gray-800">{hoveredCount}</span></span>
                      <span className="text-gray-500">Value: <span className="font-bold text-gray-800">{fmtRp(hoveredValue)}</span></span>
                      {activeStatus && <span className="text-gray-500">Status: <span className="font-bold" style={{ color: STATUS_COLORS[activeStatus] }}>{STATUS_CFG[activeStatus]?.label}</span></span>}
                    </div>
                    <span className="text-[10px] text-gray-400 italic">Click bar to open list</span>
                  </div>
                  {!activeStatus && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {statuses.filter(st => hoveredItems.some(q=>(q.status||"draft")===st)).map(st => {
                        const cnt = hoveredItems.filter(q=>(q.status||"draft")===st).length;
                        return cnt > 0 ? (
                          <span key={st} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_CFG[st].color}`}>
                            {STATUS_CFG[st].label}: {cnt}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="px-4 py-3 flex items-center h-full">
                  <p className="text-xs text-gray-300 italic">Hover a bar to see period details</p>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100">
              {statuses.map(st => (
                <button key={st} onClick={() => setActiveStatus(prev => prev === st ? null : st)}
                  className={`flex items-center gap-1.5 text-xs font-semibold transition-all px-2 py-1 rounded-lg ${
                    activeStatus === st ? "bg-gray-100 ring-2 ring-[#0B3D91]/30" : "hover:bg-gray-50"
                  } ${activeStatus && activeStatus !== st ? "opacity-40" : "text-gray-600"}`}>
                  <div className="w-3 h-3 rounded-full" style={{ background:STATUS_COLORS[st] }}/>
                  {STATUS_CFG[st]?.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Filter Chip ──────────────────────────────────────────────────────────────
function Chip({ label, onRm }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#0B3D91]/10 text-[#0B3D91] text-xs font-semibold rounded-full">
      {label}
      <button onClick={onRm} className="hover:bg-[#0B3D91]/20 rounded-full w-4 h-4 flex items-center justify-center">
        <X className="w-2.5 h-2.5" />
      </button>
    </span>
  );
}

// ─── Export Menu ──────────────────────────────────────────────────────────────
function ExportMenu({ filteredIds, onClose }) {
  const [exportingXls, setExportingXls] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const doExport = async type => {
    const setL = type === "excel" ? setExportingXls : setExportingPdf;
    setL(true);
    try {
      const r = await API.post(`/quotation/export/${type}`, { ids:filteredIds }, { responseType:"blob" });
      const ext = type === "excel" ? "xlsx" : "pdf";
      const url = URL.createObjectURL(new Blob([r.data]));
      Object.assign(document.createElement("a"), { href:url, download:`Quotations_Export.${ext}` }).click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast.success(`Export ${type.toUpperCase()} succeed!`);
    } catch { toast.error(`Export failed ${type}`); }
    finally { setL(false); onClose(); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Upload className="w-5 h-5 text-[#0B3D91]" />
            Export Data
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-3">
          <p className="text-xs text-gray-400 mb-4">{filteredIds.length} quotation(s) will be exported</p>
          <button onClick={() => doExport("excel")} disabled={exportingXls}
            className="w-full flex items-center gap-3 px-5 py-3.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-bold hover:bg-emerald-100 disabled:opacity-60 transition-all">
            {exportingXls ? <div className="w-5 h-5 border-2 border-emerald-400/40 border-t-emerald-600 rounded-full animate-spin"/> : <FileSpreadsheet className="w-5 h-5" />}
            <div className="text-left">
              <p className="font-bold">Export Excel (.xlsx)</p>
              <p className="text-xs font-normal text-emerald-600">Spreadsheet with all data</p>
            </div>
          </button>
          <button onClick={() => doExport("pdf")} disabled={exportingPdf}
            className="w-full flex items-center gap-3 px-5 py-3.5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-bold hover:bg-red-100 disabled:opacity-60 transition-all">
            {exportingPdf ? <div className="w-5 h-5 border-2 border-red-400/40 border-t-red-600 rounded-full animate-spin"/> : <FileText className="w-5 h-5" />}
            <div className="text-left">
              <p className="font-bold">Export PDF (.pdf)</p>
              <p className="text-xs font-normal text-red-600">PDF report</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Filter Panel ─────────────────────────────────────────────────────────────
function FilterPanel({ quotations, filters, setFilters, onClose }) {
  const [local, setLocal] = useState({ ...filters });
  const salesList = [...new Set(quotations.map(q=>q.sales_person).filter(Boolean))].sort();
  const custList  = [...new Set(quotations.map(q=>q.customer_company).filter(Boolean))].sort();
  const active    = Object.values(local).filter(v => v && v !== "").length;

  const apply = () => { setFilters(local); onClose(); };
  const reset = () => {
    const e = { search:"",status:"",sales:"",customer:"",dateFrom:"",dateTo:"",currency:"",minVal:"",maxVal:"" };
    setLocal(e); setFilters(e); onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-[#0B3D91]" />
              Advanced Filters
            </h2>
            {active > 0 && <p className="text-xs text-[#0B3D91] font-semibold">{active} active filter(s)</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Search (No/Customer/Project/PIC)" value={local.search} onChange={e=>setLocal({...local,search:e.target.value})} className="sm:col-span-2"/>
          <SelectField label="Status"       value={local.status}   onChange={e=>setLocal({...local,status:e.target.value})}   options={Object.entries(STATUS_CFG).map(([k,v])=>({value:k,label:v.label}))} placeholder="All Status"/>
          <SelectField label="Sales Person" value={local.sales}    onChange={e=>setLocal({...local,sales:e.target.value})}    options={salesList} placeholder="All Sales"/>
          <SelectField label="Customer"     value={local.customer} onChange={e=>setLocal({...local,customer:e.target.value})} options={custList}  placeholder="All Customers"/>
          <SelectField label="Currency"    value={local.currency} onChange={e=>setLocal({...local,currency:e.target.value})} options={["IDR","USD","SGD","EUR"]} placeholder="All Currencies"/>
          <Field label="Date From"   type="date"   value={local.dateFrom} onChange={e=>setLocal({...local,dateFrom:e.target.value})}/>
          <Field label="Date To" type="date"   value={local.dateTo}   onChange={e=>setLocal({...local,dateTo:e.target.value})}/>
          <Field label="Minimum Value"  type="number" value={local.minVal}   onChange={e=>setLocal({...local,minVal:e.target.value})}/>
          <Field label="Maximum Value" type="number" value={local.maxVal}   onChange={e=>setLocal({...local,maxVal:e.target.value})}/>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={reset} className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50">
            <RefreshCw className="w-3.5 h-3.5" /> Reset All
          </button>
          <button onClick={apply} className="flex-1 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-bold hover:bg-[#1E5CC6]">Apply Filter</button>
        </div>
      </div>
    </div>
  );
}

// ─── Bulk Action Bar ──────────────────────────────────────────────────────────
function BulkActionBar({ selectedIds, allIds, onSelectAll, onClearAll, onBulkDeleted }) {
  const [deleting, setDeleting]                 = useState(false);
  const [pdfing,   setPdfing]                   = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isAllSelected = allIds.length > 0 && selectedIds.length === allIds.length;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await Promise.all(selectedIds.map(id => API.delete(`/quotation/delete/${id}`)));
      toast.success(`${selectedIds.length} quotation(s) deleted`);
      setShowDeleteConfirm(false);
      onBulkDeleted();
    } catch { toast.error("Some failed to delete"); }
    finally { setDeleting(false); }
  };

  const handlePdf = async () => {
    setPdfing(true);
    try {
      const r = await API.post("/quotation/export/pdf", { ids: selectedIds }, { responseType:"blob" });
      const url = URL.createObjectURL(new Blob([r.data]));
      Object.assign(document.createElement("a"), { href:url, download:`Quotations_Selected.pdf` }).click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast.success("PDF downloaded successfully!");
    } catch { toast.error("Failed to generate PDF"); }
    finally { setPdfing(false); }
  };

  const handleExcel = async () => {
    try {
      const r = await API.post("/quotation/export/excel", { ids: selectedIds }, { responseType:"blob" });
      const url = URL.createObjectURL(new Blob([r.data]));
      Object.assign(document.createElement("a"), { href:url, download:`Quotations_Selected.xlsx` }).click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast.success("Excel downloaded successfully!");
    } catch { toast.error("Excel export failed"); }
  };

  return (
    <>
      {showDeleteConfirm && (
        <DeleteDialog
          title={`Delete ${selectedIds.length} Quotation(s)?`}
          description="All selected quotations will be permanently deleted. This action cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          loading={deleting}
        />
      )}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#0B3D91]/5 border border-[#0B3D91]/20 rounded-xl mb-3 flex-wrap">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={isAllSelected} onChange={isAllSelected ? onClearAll : onSelectAll}
            className="w-4 h-4 accent-[#0B3D91] cursor-pointer"/>
          <span className="text-xs font-bold text-[#0B3D91]">
            {isAllSelected ? "Deselect All" : `Select All (${allIds.length})`}
          </span>
        </label>
        <div className="h-4 w-px bg-[#0B3D91]/20 mx-1"/>
        <span className="text-xs font-semibold text-[#0B3D91] bg-[#0B3D91]/10 px-2.5 py-1 rounded-full">
          {selectedIds.length} selected
        </span>
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <button onClick={handlePdf} disabled={pdfing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-100 disabled:opacity-60 transition-all">
            {pdfing ? <div className="w-3.5 h-3.5 border-2 border-red-400/40 border-t-red-600 rounded-full animate-spin"/> : <FileText className="w-3.5 h-3.5" />}
            {pdfing ? "Generating..." : "Download PDF"}
          </button>
          <button onClick={handleExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-all">
            <FileSpreadsheet className="w-3.5 h-3.5" /> Export Excel
          </button>
          <button onClick={() => setShowDeleteConfirm(true)} disabled={deleting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-red-500 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-50 disabled:opacity-60 transition-all">
            {deleting ? <div className="w-3.5 h-3.5 border-2 border-red-400/40 border-t-red-500 rounded-full animate-spin"/> : <Trash2 className="w-3.5 h-3.5" />}
            {deleting ? "Deleting..." : "Delete Selected"}
          </button>
          <button onClick={onClearAll}
            className="flex items-center gap-1 px-3 py-1.5 text-gray-400 hover:text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-100 transition-all">
            <X className="w-3.5 h-3.5" /> Cancel
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({ total, page, pageSize, setPage, setPageSize }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to   = Math.min(total, page * pageSize);

  const pageNums = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [1];
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  })();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-white rounded-b-2xl">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 font-medium whitespace-nowrap">Showing</span>
        <div className="flex gap-1">
          {PAGE_SIZE_OPTIONS.map(n => (
            <button key={n} onClick={() => { setPageSize(n); setPage(1); }}
              className={`min-w-[34px] h-8 rounded-lg text-xs font-bold transition-all border
                ${pageSize === n ? "bg-[#0B3D91] text-white border-[#0B3D91] shadow-sm" : "bg-white text-gray-500 border-gray-200 hover:border-[#0B3D91]/40 hover:text-[#0B3D91]"}`}>
              {n}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400 font-medium whitespace-nowrap">rows</span>
      </div>
      <span className="text-xs text-gray-400 font-medium">
        {total === 0 ? "No data" : `${from}–${to} of ${total}`}
      </span>
      <div className="flex items-center gap-1">
        <button onClick={() => setPage(1)} disabled={page === 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-[#0B3D91]/40 hover:text-[#0B3D91] disabled:opacity-30 disabled:cursor-not-allowed transition-all">
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-[#0B3D91]/40 hover:text-[#0B3D91] disabled:opacity-30 disabled:cursor-not-allowed transition-all">
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        {pageNums.map((n, i) =>
          n === "..." ? (
            <span key={`e${i}`} className="w-8 h-8 flex items-center justify-center text-gray-300 text-xs">…</span>
          ) : (
            <button key={n} onClick={() => setPage(n)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all border
                ${page === n ? "bg-[#0B3D91] text-white border-[#0B3D91] shadow-sm" : "bg-white text-gray-500 border-gray-200 hover:border-[#0B3D91]/40 hover:text-[#0B3D91]"}`}>
              {n}
            </button>
          )
        )}
        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-[#0B3D91]/40 hover:text-[#0B3D91] disabled:opacity-30 disabled:cursor-not-allowed transition-all">
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-[#0B3D91]/40 hover:text-[#0B3D91] disabled:opacity-30 disabled:cursor-not-allowed transition-all">
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Mobile Quotation Card ─────────────────────────────────────────────────────
function QuotationCard({ q, selectMode, isSelected, onToggleSelect, onNavigate }) {
  const sc = STATUS_CFG[q.status] || STATUS_CFG.draft;
  return (
    <div
      onClick={() => {
        if (selectMode) { onToggleSelect(q.id); return; }
        onNavigate(q.id);
      }}
      className={`relative flex flex-col gap-2 px-4 py-3.5 border-b border-gray-100 last:border-b-0 transition-colors cursor-pointer
        ${isSelected ? "bg-blue-50/70" : "bg-white hover:bg-blue-50/40"}`}
    >
      {/* Top row: quotation number + status */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {selectMode && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelect(q.id)}
                onClick={e => e.stopPropagation()}
                className="w-4 h-4 accent-[#0B3D91] shrink-0"
              />
            )}
            <span className="font-mono font-bold text-[#0B3D91] text-xs">{q.quotation_number}</span>
            {q.revision > 0 && (
              <span className="text-[10px] bg-orange-100 text-orange-600 font-bold px-1.5 py-0.5 rounded-full">Rev.{q.revision}</span>
            )}
          </div>
          <p className="text-sm font-semibold text-gray-800 mt-0.5 truncate">{q.customer_company || "-"}</p>
          <p className="text-xs text-gray-400 truncate">{q.customer_name}</p>
        </div>
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${sc.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}/>{sc.label}
        </span>
      </div>

      {/* Middle row: project + sales */}
      {(q.project_name || q.sales_person) && (
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {q.project_name && (
            <span className="truncate flex-1">{q.project_name}</span>
          )}
          {q.sales_person && (
            <span className="shrink-0 font-medium text-gray-600">{q.sales_person}</span>
          )}
        </div>
      )}

      {/* Bottom row: value + dates + action */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-black text-gray-800">{fmtRp(q.total_amount, q.currency)}</p>
          {q.currency !== "IDR" && <p className="text-[10px] text-gray-400">{q.currency}</p>}
        </div>
        <div className="flex items-center gap-3 text-[10px] text-gray-400">
          <span>{fmtD(q.created_at)}</span>
          <button
            onClick={e => { e.stopPropagation(); onNavigate(q.id); }}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#0B3D91]/10 text-[#0B3D91] rounded-lg text-[10px] font-bold hover:bg-[#0B3D91]/20 transition-colors whitespace-nowrap">
            <Eye className="w-3 h-3" /> Details
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Quotations() {
  const navigate = useNavigate();
  const [quotations,    setQuotations]    = useState([]);
  const [showCreate,    setShowCreate]    = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showCustMgr,   setShowCustMgr]   = useState(false);
  const [showFilter,    setShowFilter]    = useState(false);
  const [showExport,    setShowExport]    = useState(false);
  const [filters, setFilters] = useState({
    search:"", status:"", sales:"", customer:"", dateFrom:"", dateTo:"", currency:"", minVal:"", maxVal:""
  });

  const [selectedIds, setSelectedIds] = useState([]);
  const [selectMode,  setSelectMode]  = useState(false);
  const [page,        setPage]        = useState(1);
  const [pageSize,    setPageSize]    = useState(10);

  const fetchQ = useCallback(async () => {
    try { const r = await API.get("/quotation/list"); setQuotations(r.data); }
    catch { toast.error("Failed to load quotations"); }
  }, []);
  useEffect(() => { fetchQ(); }, [fetchQ]);
  useEffect(() => { setPage(1); setSelectedIds([]); }, [filters]);

  const activeFilters = Object.values(filters).filter(v => v && v !== "").length;

  const filtered = quotations.filter(q => {
    const { search, status, sales, customer, dateFrom, dateTo, currency, minVal, maxVal } = filters;
    if (search) {
      const s = search.toLowerCase();
      if (![ q.quotation_number, q.customer_company, q.customer_name, q.project_name, q.sales_person ]
        .some(v => v?.toLowerCase().includes(s))) return false;
    }
    if (status   && (q.status||"draft") !== status)  return false;
    if (sales    && q.sales_person     !== sales)     return false;
    if (customer && q.customer_company !== customer)  return false;
    if (currency && q.currency         !== currency)  return false;
    if (dateFrom && q.created_at && q.created_at.slice(0,10) < dateFrom) return false;
    if (dateTo   && q.created_at && q.created_at.slice(0,10) > dateTo)   return false;
    if (minVal   && (q.total_amount||0) < Number(minVal)) return false;
    if (maxVal   && (q.total_amount||0) > Number(maxVal)) return false;
    return true;
  });

  const totalPages     = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage       = Math.min(page, totalPages);
  const paginated      = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const allFilteredIds = filtered.map(q => q.id);

  const totalPipeline = quotations.filter(q=>!["won","lost","cancel"].includes(q.status)).reduce((s,q)=>s+(q.total_amount||0),0);
  const totalWon      = quotations.filter(q=>q.status==="won").reduce((s,q)=>s+(q.total_amount||0),0);

  const toggleSelect  = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]);
  const onSelectAll   = ()   => setSelectedIds([...allFilteredIds]);
  const onClearAll    = ()   => { setSelectedIds([]); setSelectMode(false); };
  const onBulkDeleted = ()   => { fetchQ(); setSelectedIds([]); setSelectMode(false); };

  const handleNavigate = (id) => navigate(`/quotations/${id}`);

  return (
    <div>
      {showCreate    && <CreateModal    onClose={() => setShowCreate(false)}    onCreated={fetchQ}/>}
      {showAnalytics && <AnalyticsPanel quotations={quotations}                  onClose={() => setShowAnalytics(false)}/>}
      {showCustMgr   && <CustomerModal  onClose={() => setShowCustMgr(false)}   onSelect={() => {}}/>}
      {showFilter    && <FilterPanel    quotations={quotations} filters={filters} setFilters={setFilters} onClose={() => setShowFilter(false)}/>}
      {showExport    && <ExportMenu     filteredIds={selectedIds.length > 0 ? selectedIds : allFilteredIds} onClose={() => setShowExport(false)}/>}

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Sales Quotation</h1>
          <p className="text-sm text-gray-400">PT Flotech Controls Indonesia</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setShowCustMgr(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 shadow-sm">
            <Building2 className="w-4 h-4" /> Customers
          </button>
          <button onClick={() => setShowAnalytics(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 shadow-sm">
            <BarChart2 className="w-4 h-4" /> Analytics
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-bold hover:bg-[#1E5CC6] shadow-sm">
            <Plus className="w-4 h-4" /> New Quotation
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label:"Total Quotation",  val: quotations.length,                              Icon: FileText,    color:"text-[#0B3D91]",   iconBg:"bg-blue-50",    big:true },
          { label:"Won",              val: quotations.filter(q=>q.status==="won").length,  Icon: CheckCircle2,color:"text-emerald-600", iconBg:"bg-emerald-50", big:true },
          { label:"Pipeline Value",   val: fmtRp(totalPipeline),                           Icon: TrendingUp,  color:"text-orange-600",  iconBg:"bg-orange-50"  },
          { label:"Won Value",        val: fmtRp(totalWon),                                Icon: DollarSign,  color:"text-emerald-600", iconBg:"bg-emerald-50" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className={`w-9 h-9 ${s.iconBg} rounded-xl flex items-center justify-center mb-2`}>
              <s.Icon className={`w-4.5 h-4.5 ${s.color}`} size={18} />
            </div>
            <p className={`font-black leading-tight ${s.big ? "text-2xl" : "text-lg"} ${s.color}`}>{s.val}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Search — full width on mobile */}
        <div className="w-full sm:flex-1 sm:min-w-[180px] sm:max-w-xs relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={filters.search} onChange={e => setFilters({ ...filters, search:e.target.value })}
            placeholder="Search quotation..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] shadow-sm"/>
        </div>

        {/* Action buttons row */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Status tabs — scrollable on mobile */}
          <div className="flex rounded-xl bg-white border border-gray-200 overflow-x-auto shadow-sm max-w-full">
            {[["all","All"], ...Object.entries(STATUS_CFG).map(([k,v]) => [k, v.label])].map(([st, lbl]) => (
              <button key={st} onClick={() => setFilters({ ...filters, status: st === "all" ? "" : st })}
                className={`px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap
                  ${(filters.status === st || (st === "all" && !filters.status)) ? "bg-white shadow" : "text-gray-500"}`}
                style={(filters.status === st && st !== "all") ? { color:STATUS_CFG[st].hex } : {}}>
                {lbl}
              </button>
            ))}
          </div>

          <button onClick={() => setShowFilter(true)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all
              ${activeFilters > 0 ? "bg-[#0B3D91] text-white border-[#0B3D91]" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filter</span>{activeFilters > 0 ? ` (${activeFilters})` : ""}
          </button>
          <button onClick={() => setShowExport(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold border bg-white border-gray-200 text-gray-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all">
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button onClick={() => selectMode ? onClearAll() : setSelectMode(true)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all
              ${selectMode ? "bg-[#0B3D91] text-white border-[#0B3D91]" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            <CheckSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Select</span>
          </button>
        </div>
      </div>

      {/* ── Active Filter Chips ── */}
      {activeFilters > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {filters.search   && <Chip label={`Search: "${filters.search}"`}                    onRm={() => setFilters({...filters,search:""})}/>}
          {filters.status   && <Chip label={`Status: ${STATUS_CFG[filters.status]?.label}`}   onRm={() => setFilters({...filters,status:""})}/>}
          {filters.sales    && <Chip label={`Sales: ${filters.sales}`}                        onRm={() => setFilters({...filters,sales:""})}/>}
          {filters.customer && <Chip label={`Customer: ${filters.customer}`}                  onRm={() => setFilters({...filters,customer:""})}/>}
          {filters.currency && <Chip label={`Currency: ${filters.currency}`}                  onRm={() => setFilters({...filters,currency:""})}/>}
          {filters.dateFrom && <Chip label={`From: ${filters.dateFrom}`}                      onRm={() => setFilters({...filters,dateFrom:""})}/>}
          {filters.dateTo   && <Chip label={`To: ${filters.dateTo}`}                          onRm={() => setFilters({...filters,dateTo:""})}/>}
          {filters.minVal   && <Chip label={`Min: ${fmtRp(filters.minVal)}`}                  onRm={() => setFilters({...filters,minVal:""})}/>}
          {filters.maxVal   && <Chip label={`Max: ${fmtRp(filters.maxVal)}`}                  onRm={() => setFilters({...filters,maxVal:""})}/>}
          <button onClick={() => setFilters({search:"",status:"",sales:"",customer:"",dateFrom:"",dateTo:"",currency:"",minVal:"",maxVal:""})}
            className="px-3 py-1 text-xs font-bold text-red-500 hover:underline">Reset all</button>
        </div>
      )}

      {/* ── Bulk Action Bar ── */}
      {selectMode && selectedIds.length > 0 && (
        <BulkActionBar
          selectedIds={selectedIds}
          allIds={allFilteredIds}
          onSelectAll={onSelectAll}
          onClearAll={onClearAll}
          onBulkDeleted={onBulkDeleted}
        />
      )}

      {/* ── Table (Desktop ≥ lg) / Cards (Mobile < lg) ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        {/* ── DESKTOP TABLE ── hidden on mobile, shown on lg+ */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-[#0B3D91] to-[#1E5CC6] text-white">
                {selectMode && (
                  <th className="w-10 px-3 py-3.5 text-center">
                    <input type="checkbox"
                      checked={paginated.length > 0 && paginated.every(q => selectedIds.includes(q.id))}
                      onChange={e => {
                        if (e.target.checked) setSelectedIds(prev => [...new Set([...prev, ...paginated.map(q=>q.id)])]);
                        else setSelectedIds(prev => prev.filter(id => !paginated.some(q => q.id === id)));
                      }}
                      className="w-4 h-4 accent-white cursor-pointer"/>
                  </th>
                )}
                <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide whitespace-nowrap w-[14%]">No. Quotation</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide whitespace-nowrap w-[22%]">Customer</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide whitespace-nowrap w-[20%]">Project</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide whitespace-nowrap w-[10%]">Sales</th>
                <th className="px-4 py-3.5 text-right text-xs font-bold uppercase tracking-wide whitespace-nowrap w-[14%]">Value</th>
                <th className="px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wide whitespace-nowrap w-[10%]">Status</th>
                <th className="px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wide whitespace-nowrap w-[10%]">Created</th>
                <th className="px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wide whitespace-nowrap w-[10%]">Modified</th>
                <th className="px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wide whitespace-nowrap w-[8%]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={selectMode ? 10 : 9} className="px-4 py-12 text-center text-gray-400">
                    <div className="flex justify-center mb-2">
                      <FileText className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="font-medium">{activeFilters > 0 ? "No results for this filter" : "No quotations yet"}</p>
                    {activeFilters === 0 && <p className="text-xs mt-1">Click "+ New Quotation" to start</p>}
                  </td>
                </tr>
              ) : paginated.map((q, i) => {
                const sc         = STATUS_CFG[q.status] || STATUS_CFG.draft;
                const isSelected = selectedIds.includes(q.id);
                return (
                  <tr key={q.id}
                    onClick={(e) => {
                      if (selectMode) { toggleSelect(q.id); return; }
                      if (e.ctrlKey || e.metaKey || e.button === 1) window.open(`/quotations/${q.id}`, "_blank");
                      else navigate(`/quotations/${q.id}`);
                    }}
                    onMouseDown={(e) => {
                      if (!selectMode && e.button === 1) window.open(`/quotations/${q.id}`, "_blank");
                    }}
                    className={`${isSelected ? "bg-blue-50/70" : i%2===0?"bg-white":"bg-gray-50/40"} hover:bg-blue-50/50 cursor-pointer transition-colors`}>
                    {selectMode && (
                      <td className="px-3 py-3 text-center" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(q.id)}
                          className="w-4 h-4 accent-[#0B3D91] cursor-pointer"/>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-[#0B3D91] text-xs">{q.quotation_number}</div>
                      {q.revision > 0 && (
                        <span className="text-[10px] bg-orange-100 text-orange-600 font-bold px-1.5 py-0.5 rounded-full mt-0.5 inline-block">Rev.{q.revision}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-800 text-xs truncate max-w-[180px]">{q.customer_company || "-"}</div>
                      <div className="text-xs text-gray-400 truncate max-w-[180px]">{q.customer_name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-gray-600 truncate max-w-[160px]">{q.project_name || "-"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-gray-500 truncate max-w-[90px]">{q.sales_person || "-"}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-xs font-bold text-gray-800 whitespace-nowrap">{fmtRp(q.total_amount, q.currency)}</div>
                      {q.currency !== "IDR" && <div className="text-[10px] text-gray-400">{q.currency}</div>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${sc.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sc.dot}`}/>{sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-[10px] text-gray-400 whitespace-nowrap">{fmtD(q.created_at)}</td>
                    <td className="px-4 py-3 text-center text-[10px] text-gray-400 whitespace-nowrap">{fmtDT(q.updated_at)}</td>
                    <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                      <button onClick={() => navigate(`/quotations/${q.id}`)}
                        className="px-2.5 py-1.5 bg-[#0B3D91]/10 text-[#0B3D91] rounded-lg text-[10px] font-bold hover:bg-[#0B3D91]/20 transition-colors whitespace-nowrap flex items-center gap-1 mx-auto">
                        <Eye className="w-3 h-3" /> Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── TABLET TABLE (md–lg) — fewer columns ── */}
        <div className="hidden md:block lg:hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-[#0B3D91] to-[#1E5CC6] text-white">
                {selectMode && (
                  <th className="w-10 px-3 py-3 text-center">
                    <input type="checkbox"
                      checked={paginated.length > 0 && paginated.every(q => selectedIds.includes(q.id))}
                      onChange={e => {
                        if (e.target.checked) setSelectedIds(prev => [...new Set([...prev, ...paginated.map(q=>q.id)])]);
                        else setSelectedIds(prev => prev.filter(id => !paginated.some(q => q.id === id)));
                      }}
                      className="w-4 h-4 accent-white cursor-pointer"/>
                  </th>
                )}
                <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wide whitespace-nowrap">No. Quotation</th>
                <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wide whitespace-nowrap">Customer</th>
                <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wide whitespace-nowrap">Project</th>
                <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wide whitespace-nowrap">Value</th>
                <th className="px-3 py-3 text-center text-xs font-bold uppercase tracking-wide whitespace-nowrap">Status</th>
                <th className="px-3 py-3 text-center text-xs font-bold uppercase tracking-wide whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={selectMode ? 7 : 6} className="px-4 py-12 text-center text-gray-400">
                    <div className="flex justify-center mb-2"><FileText className="w-8 h-8 text-gray-300" /></div>
                    <p className="font-medium">{activeFilters > 0 ? "No results for this filter" : "No quotations yet"}</p>
                  </td>
                </tr>
              ) : paginated.map((q, i) => {
                const sc = STATUS_CFG[q.status] || STATUS_CFG.draft;
                const isSelected = selectedIds.includes(q.id);
                return (
                  <tr key={q.id}
                    onClick={(e) => {
                      if (selectMode) { toggleSelect(q.id); return; }
                      navigate(`/quotations/${q.id}`);
                    }}
                    className={`${isSelected ? "bg-blue-50/70" : i%2===0?"bg-white":"bg-gray-50/40"} hover:bg-blue-50/50 cursor-pointer transition-colors`}>
                    {selectMode && (
                      <td className="px-3 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(q.id)}
                          className="w-4 h-4 accent-[#0B3D91] cursor-pointer"/>
                      </td>
                    )}
                    <td className="px-3 py-2.5">
                      <div className="font-mono font-bold text-[#0B3D91] text-xs whitespace-nowrap">{q.quotation_number}</div>
                      {q.revision > 0 && <span className="text-[10px] bg-orange-100 text-orange-600 font-bold px-1.5 py-0.5 rounded-full">Rev.{q.revision}</span>}
                    </td>
                    <td className="px-3 py-2.5 max-w-[140px]">
                      <div className="font-semibold text-gray-800 text-xs truncate">{q.customer_company || "-"}</div>
                      <div className="text-xs text-gray-400 truncate">{q.customer_name}</div>
                    </td>
                    <td className="px-3 py-2.5 max-w-[130px]">
                      <div className="text-xs text-gray-600 truncate">{q.project_name || "-"}</div>
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      <div className="text-xs font-bold text-gray-800">{fmtRp(q.total_amount, q.currency)}</div>
                      {q.currency !== "IDR" && <div className="text-[10px] text-gray-400">{q.currency}</div>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${sc.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sc.dot}`}/>{sc.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                      <button onClick={() => navigate(`/quotations/${q.id}`)}
                        className="px-2.5 py-1.5 bg-[#0B3D91]/10 text-[#0B3D91] rounded-lg text-[10px] font-bold hover:bg-[#0B3D91]/20 transition-colors flex items-center gap-1 mx-auto">
                        <Eye className="w-3 h-3" /> View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── MOBILE CARDS — shown below md ── */}
        <div className="md:hidden">
          {paginated.length === 0 ? (
            <div className="px-4 py-12 text-center text-gray-400">
              <div className="flex justify-center mb-2"><FileText className="w-8 h-8 text-gray-300" /></div>
              <p className="font-medium">{activeFilters > 0 ? "No results for this filter" : "No quotations yet"}</p>
              {activeFilters === 0 && <p className="text-xs mt-1">Click "+ New Quotation" to start</p>}
            </div>
          ) : (
            <>
              {/* Mobile select-all bar */}
              {selectMode && (
                <div className="flex items-center gap-3 px-4 py-2.5 bg-[#0B3D91]/5 border-b border-[#0B3D91]/10">
                  <input type="checkbox"
                    checked={paginated.length > 0 && paginated.every(q => selectedIds.includes(q.id))}
                    onChange={e => {
                      if (e.target.checked) setSelectedIds(prev => [...new Set([...prev, ...paginated.map(q=>q.id)])]);
                      else setSelectedIds(prev => prev.filter(id => !paginated.some(q => q.id === id)));
                    }}
                    className="w-4 h-4 accent-[#0B3D91] cursor-pointer"/>
                  <span className="text-xs font-bold text-[#0B3D91]">Select page ({paginated.length})</span>
                </div>
              )}
              {paginated.map(q => (
                <QuotationCard
                  key={q.id}
                  q={q}
                  selectMode={selectMode}
                  isSelected={selectedIds.includes(q.id)}
                  onToggleSelect={toggleSelect}
                  onNavigate={handleNavigate}
                />
              ))}
            </>
          )}
        </div>

        {/* ── Pagination ── */}
        <Pagination
          total={filtered.length}
          page={safePage}
          pageSize={pageSize}
          setPage={setPage}
          setPageSize={setPageSize}
        />
      </div>
    </div>
  );
}