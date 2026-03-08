import { useState, useEffect, useCallback, useRef } from "react";
import API from "../services/api";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const YEAR = new Date().getFullYear();

const LEAVE_TYPES = [
  { value: "annual",      label: "Annual Leave",     icon: "🏖️",  color: "#0B3D91" },
  { value: "sick",        label: "Sick Leave",        icon: "🏥",  color: "#dc2626" },
  { value: "emergency",   label: "Emergency Leave",   icon: "🚨",  color: "#d97706" },
  { value: "marriage",    label: "Marriage Leave",    icon: "💍",  color: "#7c3aed" },
  { value: "maternity",   label: "Maternity Leave",   icon: "👶",  color: "#db2777" },
  { value: "paternity",   label: "Paternity Leave",   icon: "👨‍👧", color: "#0891b2" },
  { value: "bereavement", label: "Bereavement Leave", icon: "🕊️",  color: "#374151" },
];

const STATUS = {
  pending:  { label: "Pending",  color: "#d97706", bg: "#fef3c7", icon: "⏳" },
  approved: { label: "Disetujui", color: "#059669", bg: "#d1fae5", icon: "✅" },
  rejected: { label: "Ditolak",  color: "#dc2626", bg: "#fee2e2", icon: "❌" },
};

const isAdminRole = (r) => ["admin", "hr", "manager"].includes(r);

function calcWorkingDays(start, end) {
  if (!start || !end) return 1;
  let count = 0, cur = new Date(start), e = new Date(end);
  while (cur <= e) { if (cur.getDay() !== 0 && cur.getDay() !== 6) count++; cur.setDate(cur.getDate() + 1); }
  return Math.max(count, 1);
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtDatetime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type = "success") => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);
  return { toasts, add };
}

function ToastContainer({ toasts }) {
  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl text-sm font-semibold
          ${t.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
          {t.type === "success" ? "✅" : "❌"} {t.msg}
        </div>
      ))}
    </div>
  );
}

// ─── TINY UI PIECES ────────────────────────────────────────────────────────────
function Badge({ status }) {
  const c = STATUS[status] || STATUS.pending;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
      style={{ color: c.color, background: c.bg }}>
      {c.icon} {c.label}
    </span>
  );
}

function StatCard({ label, value, icon, color, highlight, sub }) {
  return (
    <div className={`bg-white rounded-2xl border ${highlight ? "border-emerald-200 shadow-emerald-50" : "border-gray-100"} shadow-sm p-4 lg:p-5`}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: color + "18" }}>{icon}</div>
        {highlight && <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full tracking-wide">SISA</span>}
      </div>
      <p className="text-3xl font-black tabular-nums" style={{ color }}>{value}</p>
      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{label}</p>
      <p className="text-xs text-gray-400">{sub || "hari"}</p>
    </div>
  );
}

function Spinner({ className = "h-40" }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="w-8 h-8 border-2 border-[#0B3D91] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

const INPUT = "w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#0B3D91] focus:ring-2 focus:ring-blue-50 bg-white transition-all";
const LABEL = "block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5";

// ─── MODAL WRAPPER ────────────────────────────────────────────────────────────
function Modal({ onClose, title, children, maxW = "max-w-md" }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxW} max-h-[92vh] flex flex-col`}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-xl transition-colors">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── REQUEST LEAVE MODAL ──────────────────────────────────────────────────────
function RequestModal({ onClose, onSubmit, balance }) {
  const [form, setForm] = useState({ leave_type: "annual", reason: "", start_date: "", end_date: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const lt   = LEAVE_TYPES.find(t => t.value === form.leave_type);
  const days = calcWorkingDays(form.start_date, form.end_date || form.start_date);
  const overQuota = form.leave_type === "annual" && days > balance;

  const submit = async () => {
    if (!form.reason.trim()) return;
    if (!form.start_date) return;
    if (overQuota) return;
    setBusy(true);
    try { await onSubmit({ ...form, end_date: form.end_date || form.start_date }); onClose(); }
    catch (e) { alert(e.response?.data?.error || "Gagal mengirim"); }
    finally { setBusy(false); }
  };

  return (
    <Modal onClose={onClose} title="🏖️ Request Leave">
      <div className="p-5 space-y-4 overflow-y-auto flex-1">
        {/* Type grid */}
        <div>
          <label className={LABEL}>Jenis Cuti</label>
          <div className="grid grid-cols-2 gap-2">
            {LEAVE_TYPES.map(t => (
              <button key={t.value} onClick={() => set("leave_type", t.value)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all text-left
                  ${form.leave_type === t.value ? "border-[#0B3D91] bg-blue-50 text-[#0B3D91]" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                <span className="text-base flex-shrink-0">{t.icon}</span>
                <span className="truncate">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Reason */}
        <div>
          <label className={LABEL}>Alasan / Keterangan *</label>
          <textarea value={form.reason} onChange={e => set("reason", e.target.value)}
            rows={3} placeholder="Jelaskan alasan cuti…" className={INPUT + " resize-none"} />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Tanggal Mulai *</label>
            <input type="date" value={form.start_date}
              onChange={e => { set("start_date", e.target.value); if (!form.end_date) set("end_date", e.target.value); }}
              className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Tanggal Selesai</label>
            <input type="date" value={form.end_date} min={form.start_date} onChange={e => set("end_date", e.target.value)} className={INPUT} />
          </div>
        </div>

        {/* Days preview */}
        {form.start_date && (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${overQuota ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-100"}`}>
            <span className="text-2xl">{lt?.icon}</span>
            <div>
              <p className={`text-sm font-black ${overQuota ? "text-red-600" : "text-[#0B3D91]"}`}>{days} hari kerja</p>
              {form.leave_type === "annual" && (
                <p className="text-[11px] text-gray-500">Saldo tersedia: <span className="font-bold">{balance} hari</span></p>
              )}
            </div>
            {overQuota && <span className="ml-auto text-xs text-red-600 font-bold">Melebihi saldo!</span>}
          </div>
        )}

        {/* Notes */}
        <div>
          <label className={LABEL}>Catatan (opsional)</label>
          <input type="text" value={form.notes} onChange={e => set("notes", e.target.value)}
            placeholder="e.g. sudah koordinasi dengan tim" className={INPUT} />
        </div>
      </div>

      <div className="px-5 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
        <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50">Batal</button>
        <button onClick={submit} disabled={busy || overQuota || !form.reason.trim() || !form.start_date}
          className="flex-1 py-2.5 bg-[#0B3D91] text-white text-sm font-bold rounded-xl hover:bg-[#0a3280] disabled:opacity-40 flex items-center justify-center gap-2">
          {busy && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          Kirim Permohonan
        </button>
      </div>
    </Modal>
  );
}

// ─── DETAIL MODAL ─────────────────────────────────────────────────────────────
function DetailModal({ req: r, onClose }) {
  const lt = LEAVE_TYPES.find(t => t.value === r.leave_type);
  const rows = [
    ["No. Permohonan",   r.request_number],
    ["Jenis Cuti",       `${lt?.icon || ""} ${lt?.label || r.leave_type}`],
    ["Alasan",           r.reason],
    ["Tanggal Mulai",    fmtDate(r.start_date)],
    ["Tanggal Selesai",  fmtDate(r.end_date)],
    ["Total Hari Kerja", `${r.total_days} hari`],
    ["Status",           <Badge key="s" status={r.status} />],
    ...(r.requester_name ? [["Pemohon", r.requester_name]] : []),
    ...(r.approved_by_name ? [["Diputuskan oleh", r.approved_by_name]] : []),
    ...(r.approved_at ? [["Waktu Keputusan", fmtDatetime(r.approved_at)]] : []),
    ...(r.rejection_reason ? [["Alasan Penolakan", <span key="rr" className="text-red-600 font-semibold">{r.rejection_reason}</span>]] : []),
    ...(r.notes ? [["Catatan", r.notes]] : []),
    ["Diajukan pada", fmtDatetime(r.created_at)],
  ];

  return (
    <Modal onClose={onClose} title="Detail Permohonan Cuti" maxW="max-w-sm">
      <div className="p-5 space-y-1 overflow-y-auto flex-1">
        {rows.map(([lbl, val], i) => (
          <div key={i} className="flex justify-between gap-3 py-1.5 border-b border-gray-50 last:border-0 items-start">
            <span className="text-[11px] text-gray-400 font-semibold flex-shrink-0 pt-0.5">{lbl}</span>
            <span className="text-xs text-gray-700 font-medium text-right">{val}</span>
          </div>
        ))}
      </div>
      <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0">
        <button onClick={onClose} className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200">Tutup</button>
      </div>
    </Modal>
  );
}

// ─── APPROVAL MODAL ───────────────────────────────────────────────────────────
function ApprovalModal({ req: r, onClose, onDecide }) {
  const [mode, setMode]         = useState(null); // null | "reject"
  const [reason, setReason]     = useState("");
  const [busy, setBusy]         = useState(false);
  const lt = LEAVE_TYPES.find(t => t.value === r.leave_type);

  const decide = async (approved) => {
    if (!approved && !reason.trim()) return;
    setBusy(true);
    try { await onDecide(r.id, approved, reason); onClose(); }
    catch (e) { alert(e.response?.data?.error || "Gagal"); setBusy(false); }
  };

  return (
    <Modal onClose={onClose} title="⚖️ Review Permohonan">
      <div className="p-5 space-y-4 flex-1 overflow-y-auto">
        {/* Request summary card */}
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{lt?.icon}</span>
            <div>
              <p className="font-black text-gray-800 text-sm">{r.requester_name || `User #${r.user_id}`}</p>
              <p className="text-xs text-gray-500">{lt?.label}</p>
            </div>
          </div>
          <div className="space-y-1 text-xs text-gray-700">
            <p><span className="font-semibold text-gray-500">Alasan:</span> {r.reason}</p>
            <p><span className="font-semibold text-gray-500">Durasi:</span> {fmtDate(r.start_date)} – {fmtDate(r.end_date)} <span className="font-black text-[#0B3D91]">({r.total_days} hari)</span></p>
            {r.notes && <p><span className="font-semibold text-gray-500">Catatan:</span> {r.notes}</p>}
          </div>
          <p className="text-[10px] font-mono text-gray-400 mt-2">{r.request_number}</p>
        </div>

        {mode === "reject" && (
          <div>
            <label className={LABEL}>Alasan Penolakan *</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
              placeholder="Jelaskan alasan penolakan permohonan ini…"
              className={INPUT + " resize-none"} />
          </div>
        )}
      </div>

      <div className="px-5 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
        {!mode ? (
          <>
            <button onClick={() => setMode("reject")}
              className="flex-1 py-2.5 border-2 border-red-200 bg-red-50 text-red-600 text-sm font-bold rounded-xl hover:bg-red-100 transition-all">
              ❌ Tolak
            </button>
            <button onClick={() => decide(true)} disabled={busy}
              className="flex-1 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {busy && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              ✅ Setujui
            </button>
          </>
        ) : (
          <>
            <button onClick={() => { setMode(null); setReason(""); }}
              className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50">
              ← Kembali
            </button>
            <button onClick={() => decide(false)} disabled={busy || !reason.trim()}
              className="flex-1 py-2.5 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {busy && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Konfirmasi Tolak
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}

// ─── ADD JOINT LEAVE MODAL ────────────────────────────────────────────────────
function JointScheduleModal({ onClose, onSaved, year }) {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim() || !date) return;
    setBusy(true);
    try {
      await API.post("/leave/joint-schedule/create", { name, date, year });
      onSaved(); onClose();
    } catch (e) { alert(e.response?.data?.error || "Gagal menyimpan"); }
    finally { setBusy(false); }
  };

  return (
    <Modal onClose={onClose} title={`➕ Tambah Cuti Bersama ${year}`} maxW="max-w-sm">
      <div className="p-5 space-y-4 flex-1">
        <div>
          <label className={LABEL}>Nama / Keterangan *</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. Cuti Bersama Idul Fitri" className={INPUT} autoFocus />
        </div>
        <div>
          <label className={LABEL}>Tanggal *</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className={INPUT} />
        </div>
      </div>
      <div className="px-5 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
        <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50">Batal</button>
        <button onClick={save} disabled={busy || !name.trim() || !date}
          className="flex-1 py-2.5 bg-[#0B3D91] text-white text-sm font-bold rounded-xl hover:bg-[#0a3280] disabled:opacity-40 flex items-center justify-center gap-2">
          {busy && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          Simpan
        </button>
      </div>
    </Modal>
  );
}

// ─── ENTITLEMENT MODAL (ADMIN) ────────────────────────────────────────────────
function EntitlementModal({ users, year, onClose, onSaved }) {
  const [vals, setVals]   = useState({});
  const [busy, setBusy]   = useState(null); // userId being saved

  useEffect(() => {
    // Fetch current entitlements for all users
    Promise.all(
      users.map(u => API.get(`/leave/summary?year=${year}`)
        .then(r => ({ userId: u.id, days: r.data.entitlement }))
        .catch(() => ({ userId: u.id, days: 12 }))
      )
    ).then(results => {
      const map = {};
      results.forEach(r => { map[r.userId] = r.days; });
      setVals(map);
    });
  }, [users, year]);

  const save = async (userId) => {
    setBusy(userId);
    try {
      await API.put(`/leave/entitlement/${userId}`, { year, entitlement_days: parseInt(vals[userId] ?? 12) });
      onSaved();
    } catch { alert("Gagal menyimpan"); }
    finally { setBusy(null); }
  };

  return (
    <Modal onClose={onClose} title={`⚙️ Hak Cuti Karyawan ${year}`} maxW="max-w-md">
      <div className="p-5 flex-1 overflow-y-auto space-y-2">
        <p className="text-xs text-gray-400 mb-3">Atur jumlah hari cuti tahunan per karyawan. Default: 12 hari.</p>
        {users.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Tidak ada data karyawan</p>}
        {users.map(u => (
          <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-blue-100 transition-colors">
            <div className="w-9 h-9 bg-gradient-to-br from-[#0B3D91] to-[#1E5CC6] rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-black">{u.name.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{u.name}</p>
              <p className="text-[10px] text-gray-400 capitalize">{u.role}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <input type="number" min={1} max={30}
                value={vals[u.id] ?? 12}
                onChange={e => setVals(p => ({ ...p, [u.id]: e.target.value }))}
                className="w-14 text-center text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#0B3D91]" />
              <span className="text-[10px] text-gray-400">hr</span>
              <button onClick={() => save(u.id)} disabled={busy === u.id}
                className="w-8 h-8 flex items-center justify-center bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex-shrink-0">
                {busy === u.id
                  ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <span className="text-xs font-black">✓</span>}
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0">
        <button onClick={onClose} className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200">Tutup</button>
      </div>
    </Modal>
  );
}

// ─── TAB: OVERVIEW ────────────────────────────────────────────────────────────
function OverviewTab({ myReqs, summary }) {
  const used    = (summary.annual_taken || 0) + (summary.joint_leave || 0);
  const total   = summary.entitlement || 12;
  const pct     = Math.min((used / total) * 100, 100);

  const byType = LEAVE_TYPES.map(lt => ({
    ...lt,
    days: myReqs.filter(r => r.leave_type === lt.value && r.status === "approved").reduce((s, r) => s + r.total_days, 0),
  })).filter(lt => lt.days > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Balance bar card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">📊 Saldo Cuti Tahunan</h3>
        <div className="mb-5">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>Terpakai ({used} hari)</span>
            <span>Total ({total} hari)</span>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-[#0B3D91] to-[#1E5CC6] transition-all duration-700"
              style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 mt-1.5">
            <span>{summary.annual_taken || 0} cuti + {summary.joint_leave || 0} cuti bersama</span>
            <span className="font-black text-emerald-600">Sisa: {summary.balance ?? 0} hari</span>
          </div>
        </div>
        {[
          ["Hak Cuti Tahunan",   total,                    "#0B3D91"],
          ["Cuti Bersama",       summary.joint_leave || 0, "#7c3aed"],
          ["Cuti Tahunan Diambil", summary.annual_taken || 0, "#d97706"],
          ["Saldo Tersisa",      summary.balance ?? 0,     "#059669"],
        ].map(([lbl, val, clr]) => (
          <div key={lbl} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
            <span className="text-xs text-gray-600">{lbl}</span>
            <span className="text-sm font-black tabular-nums" style={{ color: clr }}>
              {val} <span className="text-gray-400 font-normal text-xs">hari</span>
            </span>
          </div>
        ))}
      </div>

      {/* Usage by type */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-black text-gray-800 mb-4">📋 Penggunaan per Jenis</h3>
        {byType.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <span className="text-4xl mb-2">🏖️</span>
            <p className="text-sm">Belum ada cuti diambil</p>
          </div>
        ) : byType.map(lt => (
          <div key={lt.value} className="flex items-center gap-3 mb-3 last:mb-0">
            <span className="text-xl">{lt.icon}</span>
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-gray-700">{lt.label}</span>
                <span className="font-black tabular-nums" style={{ color: lt.color }}>{lt.days} hari</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min((lt.days / total) * 100, 100)}%`, background: lt.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 lg:col-span-2">
        <h3 className="text-sm font-black text-gray-800 mb-4">🕒 Aktivitas Terbaru</h3>
        {myReqs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <span className="text-4xl mb-2">🏖️</span><p className="text-sm">Belum ada permohonan cuti</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {myReqs.slice(0, 6).map(r => {
              const lt = LEAVE_TYPES.find(t => t.value === r.leave_type);
              return (
                <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-all">
                  <span className="text-xl">{lt?.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{lt?.label}</p>
                    <p className="text-xs text-gray-400">{fmtDate(r.start_date)} · {r.total_days} hari</p>
                  </div>
                  <Badge status={r.status} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TAB: HISTORY ─────────────────────────────────────────────────────────────
function HistoryTab({ myReqs, allReqs, isAdmin, onDetail, onDelete }) {
  const [viewMode,     setViewMode]     = useState("my");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType,   setFilterType]   = useState("all");

  const base     = (viewMode === "all" && isAdmin) ? allReqs : myReqs;
  const filtered = base.filter(r =>
    (filterStatus === "all" || r.status === filterStatus) &&
    (filterType   === "all" || r.leave_type === filterType)
  );

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        {isAdmin && (
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {[["my","Saya"],["all","Semua Karyawan"]].map(([v, l]) => (
              <button key={v} onClick={() => setViewMode(v)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${viewMode === v ? "bg-white shadow text-[#0B3D91]" : "text-gray-400 hover:text-gray-600"}`}>
                {l}
              </button>
            ))}
          </div>
        )}
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#0B3D91] bg-white">
          <option value="all">Semua Status</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#0B3D91] bg-white">
          <option value="all">Semua Jenis</option>
          {LEAVE_TYPES.map(lt => <option key={lt.value} value={lt.value}>{lt.icon} {lt.label}</option>)}
        </select>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} record</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0B3D91] text-white">
                {isAdmin && viewMode === "all" && <th className="text-left px-4 py-3 text-xs font-semibold">Karyawan</th>}
                <th className="text-left px-4 py-3 text-xs font-semibold">No. Permohonan</th>
                <th className="text-left px-4 py-3 text-xs font-semibold">Jenis</th>
                <th className="text-left px-4 py-3 text-xs font-semibold">Alasan</th>
                <th className="text-center px-4 py-3 text-xs font-semibold">Mulai</th>
                <th className="text-center px-4 py-3 text-xs font-semibold">Selesai</th>
                <th className="text-center px-4 py-3 text-xs font-semibold">Hari</th>
                <th className="text-center px-4 py-3 text-xs font-semibold">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">
                  <p className="text-3xl mb-2">📋</p><p className="text-sm">Tidak ada data</p>
                </td></tr>
              ) : filtered.map((r, i) => {
                const lt = LEAVE_TYPES.find(t => t.value === r.leave_type);
                const isOwn = String(r.user_id) === localStorage.getItem("user_id");
                return (
                  <tr key={r.id} className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50/60"} hover:bg-blue-50/50 transition-all border-b border-gray-50`}>
                    {isAdmin && viewMode === "all" && (
                      <td className="px-4 py-3 text-xs font-semibold text-gray-700">{r.requester_name || `—`}</td>
                    )}
                    <td className="px-4 py-3 font-mono text-[11px] text-gray-400">{r.request_number}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-xs font-bold" style={{ color: lt?.color }}>
                        {lt?.icon} {lt?.label || r.leave_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-[180px] truncate">{r.reason}</td>
                    <td className="px-4 py-3 text-xs text-center text-gray-600 whitespace-nowrap">{fmtDate(r.start_date)}</td>
                    <td className="px-4 py-3 text-xs text-center text-gray-600 whitespace-nowrap">{fmtDate(r.end_date)}</td>
                    <td className="px-4 py-3 text-center font-black text-gray-700">{r.total_days}</td>
                    <td className="px-4 py-3 text-center"><Badge status={r.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => onDetail(r)} className="text-xs text-[#0B3D91] font-bold hover:underline">Detail</button>
                        {r.status === "pending" && (isOwn || isAdmin) && (
                          <button onClick={() => onDelete(r.id)} className="text-xs text-red-400 font-bold hover:text-red-600">Batal</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-3xl mb-2">📋</p><p className="text-sm">Tidak ada data</p>
            </div>
          ) : filtered.map(r => {
            const lt = LEAVE_TYPES.find(t => t.value === r.leave_type);
            return (
              <div key={r.id} className="p-4 hover:bg-blue-50/30 cursor-pointer transition-colors" onClick={() => onDetail(r)}>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{lt?.icon}</span>
                    <div>
                      <p className="text-sm font-bold text-gray-800">{lt?.label}</p>
                      {isAdmin && viewMode === "all" && <p className="text-xs text-gray-500">{r.requester_name}</p>}
                    </div>
                  </div>
                  <Badge status={r.status} />
                </div>
                <p className="text-xs text-gray-400 ml-8">{fmtDate(r.start_date)} – {fmtDate(r.end_date)} · <span className="font-bold">{r.total_days} hari</span></p>
                <p className="text-xs text-gray-400 ml-8 truncate">{r.reason}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── TAB: JOINT LEAVE ─────────────────────────────────────────────────────────
function JointLeaveTab({ schedule, isAdmin, onAdd, onDelete, year }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-gray-800">Jadwal Cuti Bersama {year}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{schedule.length} hari — memotong hak cuti tahunan</p>
        </div>
        {isAdmin && (
          <button onClick={onAdd}
            className="px-3 py-2 bg-[#0B3D91] text-white text-xs font-bold rounded-xl hover:bg-[#1E5CC6] flex items-center gap-1.5 transition-all">
            ➕ Tambah
          </button>
        )}
      </div>

      {schedule.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-gray-400">
          <span className="text-4xl mb-3">🤝</span>
          <p className="font-semibold text-sm">Belum ada jadwal cuti bersama {year}</p>
          {isAdmin && <p className="text-xs mt-1 text-gray-400">Klik "Tambah" untuk menambahkan</p>}
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-purple-50 border-b border-purple-100">
              <th className="text-left px-5 py-3 text-xs font-bold text-purple-700">No.</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-purple-700">Nama / Keterangan</th>
              <th className="text-center px-5 py-3 text-xs font-bold text-purple-700">Tanggal</th>
              <th className="text-center px-5 py-3 text-xs font-bold text-purple-700">Hari</th>
              {isAdmin && <th className="text-center px-5 py-3 text-xs font-bold text-purple-700">Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {schedule.map((s, i) => {
              const d = new Date(s.date + "T00:00:00");
              const dayName = d.toLocaleDateString("id-ID", { weekday: "long" });
              return (
                <tr key={s.id} className={`${i % 2 === 0 ? "bg-white" : "bg-purple-50/30"} border-b border-gray-50`}>
                  <td className="px-5 py-3 text-xs text-gray-400">{i + 1}</td>
                  <td className="px-5 py-3 text-sm font-semibold text-purple-700">{s.name}</td>
                  <td className="px-5 py-3 text-xs text-center text-gray-700 whitespace-nowrap">{fmtDate(s.date)}</td>
                  <td className="px-5 py-3 text-xs text-center text-gray-500">{dayName}</td>
                  {isAdmin && (
                    <td className="px-5 py-3 text-center">
                      <button onClick={() => onDelete(s.id)}
                        className="text-xs text-red-400 hover:text-red-600 font-bold hover:underline transition-colors">
                        Hapus
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── TAB: PENDING APPROVALS ───────────────────────────────────────────────────
function ApprovalsTab({ pending, onReview }) {
  if (pending.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16 text-gray-400">
        <span className="text-5xl mb-3">✅</span>
        <p className="font-bold text-gray-600">Tidak ada permohonan pending</p>
        <p className="text-sm mt-1">Semua permohonan sudah diproses</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 font-semibold px-1">{pending.length} permohonan menunggu keputusan</p>
      {pending.map(r => {
        const lt = LEAVE_TYPES.find(t => t.value === r.leave_type);
        return (
          <div key={r.id} className="bg-white rounded-2xl border border-amber-200 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-2xl flex-shrink-0">{lt?.icon}</div>
              <div className="min-w-0">
                <p className="font-black text-gray-800 text-sm truncate">{r.requester_name || `User #${r.user_id}`}</p>
                <p className="text-xs text-gray-500 truncate">{lt?.label} · {r.reason}</p>
                <p className="text-[11px] text-gray-400 mt-0.5 whitespace-nowrap">
                  {fmtDate(r.start_date)} – {fmtDate(r.end_date)} · <span className="font-bold text-[#0B3D91]">{r.total_days} hari</span>
                </p>
                <p className="text-[10px] font-mono text-gray-300 mt-0.5">{r.request_number}</p>
              </div>
            </div>
            <button onClick={() => onReview(r)}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl transition-all flex-shrink-0 shadow-sm">
              Review →
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function LeaveManagement() {
  const [tab,          setTab]          = useState("overview");
  const [year,         setYear]         = useState(YEAR);
  const [loading,      setLoading]      = useState(true);
  const [myReqs,       setMyReqs]       = useState([]);
  const [allReqs,      setAllReqs]      = useState([]);
  const [allUsers,     setAllUsers]     = useState([]);
  const [summary,      setSummary]      = useState({ entitlement: 12, joint_leave: 0, annual_taken: 0, balance: 12 });
  const [jointSched,   setJointSched]   = useState([]);
  const [isAdmin,      setIsAdmin]      = useState(isAdminRole(localStorage.getItem("user_role") || "engineer"));

  const [showRequest,    setShowRequest]    = useState(false);
  const [showDetail,     setShowDetail]     = useState(null);
  const [showApproval,   setShowApproval]   = useState(null);
  const [showJointModal, setShowJointModal] = useState(false);
  const [showEntitle,    setShowEntitle]    = useState(false);

  const { toasts, add: toast } = useToast();

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      // Always refresh role from server
      const meRes = await API.get("/auth/me");
      const role  = meRes.data.role || "engineer";
      localStorage.setItem("user_role", role);
      localStorage.setItem("user_id",   String(meRes.data.id));
      const admin = isAdminRole(role);
      setIsAdmin(admin);

      const [myRes, sumRes, jRes] = await Promise.all([
        API.get("/leave/requests"),
        API.get(`/leave/summary?year=${year}`),
        API.get(`/leave/joint-schedule?year=${year}`),
      ]);
      setMyReqs(myRes.data);
      setSummary(sumRes.data);
      setJointSched(jRes.data);

      if (admin) {
        const [allReqRes, usersRes] = await Promise.all([
          API.get("/leave/requests/all"),
          API.get("/auth/users"),
        ]);
        setAllReqs(allReqRes.data);
        setAllUsers(usersRes.data);
      }
    } catch (e) {
      toast("Gagal memuat data cuti", "error");
    } finally { setLoading(false); }
  }, [year]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const submitRequest = async (data) => {
    await API.post("/leave/request/create", data);
    toast("Permohonan berhasil dikirim! 🎉");
    fetchAll();
  };

  const decideRequest = async (id, approved, reason) => {
    if (approved) {
      await API.put(`/leave/request/${id}/approve`);
      toast("Permohonan disetujui ✅");
    } else {
      await API.put(`/leave/request/${id}/reject`, { rejection_reason: reason });
      toast("Permohonan ditolak");
    }
    fetchAll();
  };

  const cancelRequest = async (id) => {
    if (!confirm("Batalkan permohonan cuti ini?")) return;
    try {
      await API.delete(`/leave/request/${id}`);
      toast("Permohonan dibatalkan");
      fetchAll();
    } catch (e) { toast(e.response?.data?.error || "Gagal membatalkan", "error"); }
  };

  const deleteJoint = async (id) => {
    if (!confirm("Hapus jadwal cuti bersama ini?")) return;
    try {
      await API.delete(`/leave/joint-schedule/${id}`);
      toast("Jadwal dihapus");
      fetchAll();
    } catch { toast("Gagal menghapus", "error"); }
  };

  const exportCSV = async () => {
    try {
      const res = await API.get(`/leave/export/csv?year=${year}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a"); a.href = url; a.download = `Leave_Report_${year}.csv`; a.click();
      window.URL.revokeObjectURL(url);
    } catch { toast("Gagal export", "error"); }
  };

  const pendingReqs = allReqs.filter(r => r.status === "pending");

  const TABS = [
    { id: "overview",  label: "Overview",        icon: "📊" },
    { id: "history",   label: "Riwayat",         icon: "📋" },
    { id: "joint",     label: "Cuti Bersama",    icon: "🤝" },
    ...(isAdmin ? [{ id: "approvals", label: pendingReqs.length > 0 ? `Approval (${pendingReqs.length})` : "Approval", icon: "⏳" }] : []),
  ];

  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 lg:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
          <div>
            <h1 className="text-xl font-black text-gray-900">Leave Management</h1>
            <p className="text-xs text-gray-400 mt-0.5">PT Flotech Controls Indonesia · {year}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Year selector */}
            <select value={year} onChange={e => setYear(Number(e.target.value))}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#0B3D91] bg-white font-bold">
              {[YEAR - 1, YEAR, YEAR + 1].map(y => <option key={y} value={y}>{y}</option>)}
            </select>

            {isAdmin && (
              <button onClick={() => setShowEntitle(true)}
                className="px-3 py-2 bg-violet-600 text-white text-xs font-bold rounded-xl hover:bg-violet-700 transition-all">
                ⚙️ Hak Cuti
              </button>
            )}
            <button onClick={exportCSV}
              className="px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 flex items-center gap-1.5 transition-all">
              📊 Export CSV
            </button>
            <button onClick={() => setShowRequest(true)}
              className="px-4 py-2 bg-[#0B3D91] text-white text-xs font-black rounded-xl hover:bg-[#1E5CC6] flex items-center gap-1.5 transition-all shadow-sm shadow-blue-900/20">
              ＋ Request Leave
            </button>
          </div>
        </div>

        {/* Summary cards */}
        {loading ? <Spinner className="h-24" /> : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Hak Cuti Tahunan"   value={summary.entitlement  || 12} icon="📋" color="#0B3D91" />
            <StatCard label="Cuti Bersama"        value={summary.joint_leave  || 0}  icon="🤝" color="#7c3aed" />
            <StatCard label="Cuti Diambil"        value={summary.annual_taken || 0}  icon="✈️" color="#d97706" />
            <StatCard label="Saldo Tersisa"       value={summary.balance      ?? 0}  icon="💚" color="#059669" highlight />
          </div>
        )}
      </div>

      {/* ── Content card ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Tab bar */}
        <div className="border-b border-gray-100 px-4 lg:px-5 flex gap-1 overflow-x-auto py-3 scrollbar-none">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 text-xs font-black rounded-xl transition-all
                ${tab === t.id
                  ? "bg-[#0B3D91] text-white shadow-sm shadow-blue-900/20"
                  : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                }`}>
              {t.icon} {t.label}
              {t.id === "approvals" && pendingReqs.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-red-500 text-[9px] font-black flex items-center justify-center ml-0.5">
                  {pendingReqs.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-4 lg:p-6">
          {loading ? <Spinner /> : (
            <>
              {tab === "overview"  && <OverviewTab myReqs={myReqs} summary={summary} />}
              {tab === "history"   && <HistoryTab myReqs={myReqs} allReqs={allReqs} isAdmin={isAdmin} onDetail={setShowDetail} onDelete={cancelRequest} />}
              {tab === "joint"     && <JointLeaveTab schedule={jointSched} isAdmin={isAdmin} onAdd={() => setShowJointModal(true)} onDelete={deleteJoint} year={year} />}
              {tab === "approvals" && isAdmin && <ApprovalsTab pending={pendingReqs} onReview={setShowApproval} />}
            </>
          )}
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {showRequest  && <RequestModal onClose={() => setShowRequest(false)}  onSubmit={submitRequest} balance={summary.balance ?? 0} />}
      {showDetail   && <DetailModal  req={showDetail}  onClose={() => setShowDetail(null)} />}
      {showApproval && <ApprovalModal req={showApproval} onClose={() => setShowApproval(null)} onDecide={decideRequest} />}
      {showJointModal && <JointScheduleModal onClose={() => setShowJointModal(false)} onSaved={fetchAll} year={year} />}
      {showEntitle && <EntitlementModal users={allUsers} year={year} onClose={() => setShowEntitle(false)} onSaved={fetchAll} />}

      <ToastContainer toasts={toasts} />
    </div>
  );
}