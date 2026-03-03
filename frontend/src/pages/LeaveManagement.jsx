import { useState, useEffect, useCallback } from "react";

// ─── MOCK DATA (replace with API calls in production) ────────────────────────
const CURRENT_USER = {
  id: 1,
  name: localStorage.getItem("user_name") || "Christosun Billy Bulu Bora",
  role: localStorage.getItem("user_role") || "engineer",
};

const YEAR = new Date().getFullYear();

const JOINT_LEAVE_SCHEDULE = [
  { id: 1, name: "Idul Fitri Joint Leave", date: `${YEAR}-03-20`, total_days: 1 },
  { id: 2, name: "Idul Fitri Joint Leave", date: `${YEAR}-03-23`, total_days: 1 },
  { id: 3, name: "Idul Fitri Joint Leave", date: `${YEAR}-03-24`, total_days: 1 },
  { id: 4, name: "Christmas Joint Leave", date: `${YEAR}-12-24`, total_days: 1 },
];

const LEAVE_TYPES = [
  { value: "annual", label: "Annual Leave", icon: "🏖️", color: "#0B3D91" },
  { value: "sick", label: "Sick Leave", icon: "🏥", color: "#dc2626" },
  { value: "emergency", label: "Emergency Leave", icon: "🚨", color: "#d97706" },
  { value: "marriage", label: "Marriage Leave", icon: "💍", color: "#7c3aed" },
  { value: "maternity", label: "Maternity Leave", icon: "👶", color: "#db2777" },
  { value: "paternity", label: "Paternity Leave", icon: "👨‍👧", color: "#0891b2" },
  { value: "bereavement", label: "Bereavement Leave", icon: "🕊️", color: "#374151" },
];

const STATUS_CONFIG = {
  pending:  { label: "Pending",  color: "#d97706", bg: "#fef3c7", icon: "⏳" },
  approved: { label: "Approved", color: "#059669", bg: "#d1fae5", icon: "✅" },
  rejected: { label: "Rejected", color: "#dc2626", bg: "#fee2e2", icon: "❌" },
};

// ─── UTILITY ─────────────────────────────────────────────────────────────────
function calcWorkingDays(start, end) {
  if (!start || !end) return 1;
  const s = new Date(start), e = new Date(end);
  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return Math.max(count, 1);
}

function formatDate(d) {
  if (!d) return "-";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function genReqNumber() {
  const now = new Date();
  return `LV-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}-${String(Math.floor(Math.random()*9000)+1000)}`;
}

// ─── EXPORT HELPERS ───────────────────────────────────────────────────────────
function exportToCSV(requests, summary) {
  const rows = [
    ["Leave Management Report - PT Flotech Controls Indonesia"],
    [`Generated: ${new Date().toLocaleDateString("en-GB")}`],
    [],
    ["SUMMARY"],
    ["Annual Entitlement", summary.entitlement],
    ["Joint Leave", summary.jointLeave],
    ["Annual Leave Taken", summary.annualTaken],
    ["Balance", summary.balance],
    [],
    ["LEAVE HISTORY"],
    ["No.", "Request Number", "Type", "Reason", "Start Date", "End Date", "Days", "Status", "Approved By"],
  ];
  requests.forEach((r, i) => {
    rows.push([
      i + 1,
      r.request_number,
      LEAVE_TYPES.find(t => t.value === r.leave_type)?.label || r.leave_type,
      r.reason,
      formatDate(r.start_date),
      formatDate(r.end_date),
      r.total_days,
      STATUS_CONFIG[r.status]?.label || r.status,
      r.approved_by_name || "-",
    ]);
  });

  const csv = rows.map(row => row.map(v => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Leave_Report_${CURRENT_USER.name.replace(/ /g,"_")}_${YEAR}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function exportToPDFHtml(requests, summary, userName) {
  const leaveTypeLabel = (v) => LEAVE_TYPES.find(t => t.value === v)?.label || v;
  const rows = requests.map((r, i) => `
    <tr style="background:${i%2===0?"#f8fafc":"#fff"}">
      <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:center">${i+1}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-family:monospace;font-size:11px">${r.request_number}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0">${leaveTypeLabel(r.leave_type)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0">${r.reason || "-"}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:center">${formatDate(r.start_date)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:center">${formatDate(r.end_date)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:center">${r.total_days}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:center">
        <span style="background:${STATUS_CONFIG[r.status]?.bg};color:${STATUS_CONFIG[r.status]?.color};padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600">
          ${STATUS_CONFIG[r.status]?.label || r.status}
        </span>
      </td>
    </tr>`).join("");

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>Annual Leave Recap ${YEAR} - ${userName}</title>
<style>
  @page { margin: 2cm; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; margin: 0; }
  .header { background: #0B3D91; color: #fff; padding: 24px 30px; margin-bottom: 24px; }
  .header h1 { margin: 0 0 4px; font-size: 20px; font-weight: 700; }
  .header p { margin: 0; font-size: 13px; opacity: 0.8; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
  .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; }
  .card-label { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .card-value { font-size: 28px; font-weight: 700; color: #0B3D91; margin-top: 4px; }
  h2 { font-size: 15px; font-weight: 700; color: #0B3D91; margin: 0 0 12px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #0B3D91; color: #fff; padding: 10px; text-align: left; font-weight: 600; font-size: 11px; }
  .footer { margin-top: 30px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 14px; }
</style></head>
<body>
<div class="header">
  <h1>PT Flotech Controls Indonesia</h1>
  <p>Annual Leave Recap ${YEAR} — ${userName}</p>
</div>
<div class="grid">
  <div class="card"><div class="card-label">Entitlement</div><div class="card-value">${summary.entitlement}</div></div>
  <div class="card"><div class="card-label">Joint Leave</div><div class="card-value">${summary.jointLeave}</div></div>
  <div class="card"><div class="card-label">Leave Taken</div><div class="card-value">${summary.annualTaken}</div></div>
  <div class="card" style="background:#eff6ff"><div class="card-label">Balance</div><div class="card-value" style="color:#059669">${summary.balance}</div></div>
</div>
<h2>Leave History</h2>
<table>
  <thead><tr>
    <th style="width:32px;text-align:center">#</th>
    <th>Request No.</th><th>Type</th><th>Reason</th>
    <th style="text-align:center">Start</th><th style="text-align:center">End</th>
    <th style="text-align:center">Days</th><th style="text-align:center">Status</th>
  </tr></thead>
  <tbody>${rows || '<tr><td colspan="8" style="text-align:center;padding:20px;color:#94a3b8">No leave records found</td></tr>'}</tbody>
</table>
<div class="footer">Generated on ${new Date().toLocaleDateString("en-GB", {day:"2-digit",month:"long",year:"numeric"})} · PT Flotech Controls Indonesia Management System</div>
</body></html>`;

  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 500);
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function LeaveManagement() {
  const [tab, setTab] = useState("overview");
  const [requests, setRequests] = useState([
    {
      id: 1, request_number: "LV-20260115-1042", user_id: 1,
      leave_type: "annual", reason: "Family vacation",
      start_date: "2026-01-20", end_date: "2026-01-22",
      total_days: 3, status: "approved",
      approved_by_name: "Admin", approved_at: "2026-01-10T08:00:00",
      is_joint_leave: false, notes: "",
    },
    {
      id: 2, request_number: "LV-20260310-5591", user_id: 1,
      leave_type: "sick", reason: "Fever and flu",
      start_date: "2026-03-10", end_date: "2026-03-11",
      total_days: 2, status: "approved",
      approved_by_name: "Admin", approved_at: "2026-03-10T09:30:00",
      is_joint_leave: false, notes: "",
    },
  ]);
  const [allUsers, setAllUsers] = useState([
    { id: 1, name: "Christosun Billy Bulu Bora", role: "engineer" },
    { id: 2, name: "Admin HR", role: "admin" },
    { id: 3, name: "Budi Santoso", role: "engineer" },
  ]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(null);
  const [viewMode, setViewMode] = useState("my"); // "my" | "all" (admin)

  const isAdmin = CURRENT_USER.role === "admin";
  const entitlement = 12;
  const jointLeave = JOINT_LEAVE_SCHEDULE.length;

  const myRequests = requests.filter(r => r.user_id === CURRENT_USER.id);
  const annualTaken = myRequests.filter(r => r.status === "approved" && r.leave_type === "annual" && !r.is_joint_leave)
    .reduce((s, r) => s + r.total_days, 0);
  const balance = entitlement - annualTaken - jointLeave;

  const displayRequests = viewMode === "all" && isAdmin ? requests : myRequests;
  const filtered = displayRequests.filter(r => {
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    if (filterType !== "all" && r.leave_type !== filterType) return false;
    return true;
  });

  const summary = { entitlement, jointLeave, annualTaken, balance };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              🏖️ Leave Management
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {YEAR} · {CURRENT_USER.name}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && (
              <div className="flex bg-gray-100 rounded-xl p-1">
                <button onClick={() => setViewMode("my")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${viewMode === "my" ? "bg-white shadow text-[#0B3D91]" : "text-gray-500"}`}>
                  My Leave
                </button>
                <button onClick={() => setViewMode("all")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${viewMode === "all" ? "bg-white shadow text-[#0B3D91]" : "text-gray-500"}`}>
                  All Employees
                </button>
              </div>
            )}
            <button onClick={() => exportToCSV(myRequests, summary)}
              className="px-3 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-700 flex items-center gap-1.5 transition-all">
              📊 Export Excel
            </button>
            <button onClick={() => exportToPDFHtml(myRequests, summary, CURRENT_USER.name)}
              className="px-3 py-2 bg-rose-600 text-white text-xs font-semibold rounded-xl hover:bg-rose-700 flex items-center gap-1.5 transition-all">
              📄 Export PDF
            </button>
            <button onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-[#0B3D91] text-white text-xs font-bold rounded-xl hover:bg-[#1E5CC6] flex items-center gap-1.5 transition-all shadow-sm">
              + Request Leave
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 lg:px-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryCard label="Annual Entitlement" value={entitlement} icon="📋" color="#0B3D91" suffix="days" />
          <SummaryCard label="Joint Leave" value={jointLeave} icon="🤝" color="#7c3aed" suffix="days" />
          <SummaryCard label="Leave Taken" value={annualTaken} icon="✈️" color="#d97706" suffix="days" />
          <SummaryCard label="Balance" value={balance} icon="💚" color="#059669" suffix="days" highlight />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          {[
            { id: "overview", label: "Overview", icon: "📊" },
            { id: "history", label: "Leave History", icon: "📋" },
            { id: "joint", label: "Joint Leave Schedule", icon: "🤝" },
            ...(isAdmin ? [{ id: "pending", label: `Approvals ${requests.filter(r=>r.status==="pending").length > 0 ? `(${requests.filter(r=>r.status==="pending").length})` : ""}`, icon: "⏳" }] : []),
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5
                ${tab === t.id ? "bg-white shadow text-[#0B3D91]" : "text-gray-500 hover:text-gray-700"}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === "overview" && (
          <OverviewTab myRequests={myRequests} summary={summary} />
        )}

        {tab === "history" && (
          <HistoryTab
            requests={filtered}
            allRequests={displayRequests}
            filterStatus={filterStatus} setFilterStatus={setFilterStatus}
            filterType={filterType} setFilterType={setFilterType}
            onDetail={setShowDetailModal}
            isAdmin={isAdmin}
            viewMode={viewMode}
            allUsers={allUsers}
          />
        )}

        {tab === "joint" && (
          <JointLeaveTab schedule={JOINT_LEAVE_SCHEDULE} />
        )}

        {tab === "pending" && isAdmin && (
          <PendingApprovalsTab
            requests={requests.filter(r => r.status === "pending")}
            onApprove={(id, approved, reason) => {
              setRequests(prev => prev.map(r => r.id === id ? {
                ...r,
                status: approved ? "approved" : "rejected",
                approved_by_name: CURRENT_USER.name,
                approved_at: new Date().toISOString(),
                rejection_reason: reason,
              } : r));
              setShowApprovalModal(null);
            }}
            setShowApprovalModal={setShowApprovalModal}
          />
        )}
      </div>

      {/* Modals */}
      {showForm && (
        <RequestLeaveModal
          onClose={() => setShowForm(false)}
          onSubmit={(data) => {
            const req = {
              ...data, id: Date.now(), user_id: CURRENT_USER.id,
              request_number: genReqNumber(), status: "pending",
              approved_by_name: null, approved_at: null,
            };
            setRequests(prev => [req, ...prev]);
            setShowForm(false);
          }}
        />
      )}
      {showDetailModal && (
        <DetailModal request={showDetailModal} onClose={() => setShowDetailModal(null)} />
      )}
      {showApprovalModal && (
        <ApprovalModal
          request={showApprovalModal}
          onClose={() => setShowApprovalModal(null)}
          onDecide={(approved, reason) => {
            setRequests(prev => prev.map(r => r.id === showApprovalModal.id ? {
              ...r,
              status: approved ? "approved" : "rejected",
              approved_by_name: CURRENT_USER.name,
              approved_at: new Date().toISOString(),
              rejection_reason: reason,
            } : r));
            setShowApprovalModal(null);
          }}
        />
      )}
    </div>
  );
}

// ─── SUMMARY CARD ─────────────────────────────────────────────────────────────
function SummaryCard({ label, value, icon, color, suffix, highlight }) {
  return (
    <div className={`bg-white rounded-2xl border ${highlight ? "border-emerald-200 shadow-emerald-50" : "border-gray-100"} shadow-sm p-4 lg:p-5`}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
          style={{ background: color + "15" }}>
          {icon}
        </div>
        {highlight && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">REMAINING</span>}
      </div>
      <p className="text-3xl font-black" style={{ color }}>{value}</p>
      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">{label}</p>
      <p className="text-xs text-gray-400">{suffix} · {YEAR}</p>
    </div>
  );
}

// ─── OVERVIEW TAB ─────────────────────────────────────────────────────────────
function OverviewTab({ myRequests, summary }) {
  const approvedCount = myRequests.filter(r => r.status === "approved").length;
  const pendingCount = myRequests.filter(r => r.status === "pending").length;
  const progress = Math.min(((summary.annualTaken + summary.jointLeave) / summary.entitlement) * 100, 100);

  const byType = LEAVE_TYPES.map(lt => ({
    ...lt,
    count: myRequests.filter(r => r.leave_type === lt.value && r.status === "approved").length,
    days: myRequests.filter(r => r.leave_type === lt.value && r.status === "approved").reduce((s, r) => s + r.total_days, 0),
  })).filter(lt => lt.days > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Leave Balance */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
          📊 Leave Balance {YEAR}
        </h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs mb-2">
              <span className="text-gray-500 font-medium">Annual Leave Used</span>
              <span className="font-bold text-gray-700">{summary.annualTaken + summary.jointLeave} / {summary.entitlement} days</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#0B3D91] to-[#1E5CC6] rounded-full transition-all duration-700"
                style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>{progress.toFixed(0)}% used</span>
              <span>{summary.balance} days remaining</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-50">
            {[
              { label: "Entitlement", val: summary.entitlement, color: "#0B3D91" },
              { label: "Joint Leave", val: summary.jointLeave, color: "#7c3aed" },
              { label: "Annual Taken", val: summary.annualTaken, color: "#d97706" },
            ].map(item => (
              <div key={item.label} className="text-center p-2 rounded-xl bg-gray-50">
                <p className="text-xl font-black" style={{ color: item.color }}>{item.val}</p>
                <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Status Overview */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
          🎯 Request Status
        </h3>
        <div className="space-y-3">
          {[
            { label: "Total Requests", val: myRequests.length, icon: "📋", color: "#0B3D91" },
            { label: "Approved", val: approvedCount, icon: "✅", color: "#059669" },
            { label: "Pending", val: pendingCount, icon: "⏳", color: "#d97706" },
            { label: "Rejected", val: myRequests.filter(r=>r.status==="rejected").length, icon: "❌", color: "#dc2626" },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3">
              <span className="text-lg w-7 text-center">{item.icon}</span>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-xs text-gray-600 font-medium">{item.label}</span>
                  <span className="text-sm font-bold" style={{ color: item.color }}>{item.val}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full">
                  <div className="h-full rounded-full transition-all" style={{
                    width: myRequests.length > 0 ? `${(item.val/myRequests.length)*100}%` : "0%",
                    background: item.color
                  }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Leave by Type */}
      {byType.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 lg:col-span-2">
          <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            📈 Leave by Type (Approved)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {byType.map(lt => (
              <div key={lt.value} className="text-center p-3 rounded-xl border border-gray-100 hover:shadow-sm transition-all">
                <span className="text-2xl">{lt.icon}</span>
                <p className="text-2xl font-black mt-1" style={{ color: lt.color }}>{lt.days}</p>
                <p className="text-[10px] text-gray-500 font-semibold">{lt.label}</p>
                <p className="text-[9px] text-gray-400">{lt.count} request{lt.count !== 1 ? "s" : ""}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 lg:col-span-2">
        <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
          🕒 Recent Activity
        </h3>
        {myRequests.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-3xl mb-2">🏖️</p>
            <p className="text-sm">No leave requests yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {myRequests.slice(0, 5).map(r => {
              const lt = LEAVE_TYPES.find(t => t.value === r.leave_type);
              const sc = STATUS_CONFIG[r.status];
              return (
                <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-all">
                  <span className="text-xl">{lt?.icon || "📋"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{lt?.label || r.leave_type}</p>
                    <p className="text-xs text-gray-400">{formatDate(r.start_date)} · {r.total_days} day{r.total_days!==1?"s":""}</p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{ color: sc?.color, background: sc?.bg }}>
                    {sc?.icon} {sc?.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── HISTORY TAB ──────────────────────────────────────────────────────────────
function HistoryTab({ requests, allRequests, filterStatus, setFilterStatus, filterType, setFilterType, onDetail, isAdmin, viewMode, allUsers }) {
  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 font-semibold">Status:</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-[#0B3D91]">
            <option value="all">All Status</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 font-semibold">Type:</label>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-[#0B3D91]">
            <option value="all">All Types</option>
            {LEAVE_TYPES.map(lt => <option key={lt.value} value={lt.value}>{lt.label}</option>)}
          </select>
        </div>
        <span className="text-xs text-gray-400 ml-auto">{requests.length} record{requests.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0B3D91] text-white">
                {isAdmin && viewMode === "all" && <th className="text-left px-4 py-3 text-xs font-semibold">Employee</th>}
                <th className="text-left px-4 py-3 text-xs font-semibold">Request No.</th>
                <th className="text-left px-4 py-3 text-xs font-semibold">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold">Reason</th>
                <th className="text-center px-4 py-3 text-xs font-semibold">Start</th>
                <th className="text-center px-4 py-3 text-xs font-semibold">End</th>
                <th className="text-center px-4 py-3 text-xs font-semibold">Days</th>
                <th className="text-center px-4 py-3 text-xs font-semibold">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr><td colSpan={isAdmin && viewMode === "all" ? 9 : 8} className="text-center py-12 text-gray-400">
                  <p className="text-3xl mb-2">📋</p>
                  <p className="text-sm">No leave records found</p>
                </td></tr>
              ) : requests.map((r, i) => {
                const lt = LEAVE_TYPES.find(t => t.value === r.leave_type);
                const sc = STATUS_CONFIG[r.status];
                const emp = allUsers.find(u => u.id === r.user_id);
                return (
                  <tr key={r.id} className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50 transition-all border-b border-gray-50`}>
                    {isAdmin && viewMode === "all" && (
                      <td className="px-4 py-3 text-xs font-semibold text-gray-700">{emp?.name || `User #${r.user_id}`}</td>
                    )}
                    <td className="px-4 py-3 font-mono text-[11px] text-gray-500">{r.request_number}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: lt?.color }}>
                        {lt?.icon} {lt?.label || r.leave_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-[200px] truncate">{r.reason || "-"}</td>
                    <td className="px-4 py-3 text-xs text-center text-gray-600">{formatDate(r.start_date)}</td>
                    <td className="px-4 py-3 text-xs text-center text-gray-600">{formatDate(r.end_date)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-bold text-gray-700">{r.total_days}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{ color: sc?.color, background: sc?.bg }}>
                        {sc?.icon} {sc?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => onDetail(r)}
                        className="text-xs text-[#0B3D91] font-semibold hover:underline">
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── JOINT LEAVE TAB ──────────────────────────────────────────────────────────
function JointLeaveTab({ schedule }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-800">Joint Leave Schedule {YEAR}</h3>
          <p className="text-xs text-gray-400 mt-0.5">Company-mandated joint leave days — deducted from annual entitlement</p>
        </div>
        <span className="text-xs font-bold bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full">
          Total: {schedule.length} days
        </span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">#</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Reason</th>
            <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500">Date</th>
            <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500">Day</th>
            <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500">Days</th>
          </tr>
        </thead>
        <tbody>
          {schedule.map((s, i) => {
            const d = new Date(s.date);
            const dayName = d.toLocaleDateString("en-US", { weekday: "long" });
            return (
              <tr key={s.id} className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"} border-b border-gray-50`}>
                <td className="px-5 py-3 text-xs text-gray-400">{i + 1}</td>
                <td className="px-5 py-3">
                  <span className="text-sm font-semibold text-purple-700">{s.name}</span>
                </td>
                <td className="px-5 py-3 text-xs text-center text-gray-600">{formatDate(s.date)}</td>
                <td className="px-5 py-3 text-xs text-center text-gray-500">{dayName}</td>
                <td className="px-5 py-3 text-center">
                  <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{s.total_days}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── PENDING APPROVALS TAB ───────────────────────────────────────────────────
function PendingApprovalsTab({ requests, setShowApprovalModal }) {
  if (requests.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
        <p className="text-4xl mb-3">✅</p>
        <p className="text-gray-500 font-semibold">No pending approvals</p>
        <p className="text-sm text-gray-400 mt-1">All leave requests have been processed</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {requests.map(r => {
        const lt = LEAVE_TYPES.find(t => t.value === r.leave_type);
        return (
          <div key={r.id} className="bg-white rounded-2xl border border-amber-200 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl bg-amber-50">{lt?.icon || "📋"}</div>
              <div>
                <p className="font-bold text-gray-800 text-sm">{lt?.label}</p>
                <p className="text-xs text-gray-500">{r.reason}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{formatDate(r.start_date)} – {formatDate(r.end_date)} · {r.total_days} day{r.total_days!==1?"s":""}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-600 bg-amber-50 font-bold px-2.5 py-1 rounded-full">⏳ Pending</span>
              <button onClick={() => setShowApprovalModal(r)}
                className="px-4 py-2 bg-[#0B3D91] text-white text-xs font-bold rounded-xl hover:bg-[#1E5CC6] transition-all">
                Review
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── REQUEST LEAVE MODAL ──────────────────────────────────────────────────────
function RequestLeaveModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({
    leave_type: "annual", reason: "",
    start_date: "", end_date: "", notes: "",
  });
  const [days, setDays] = useState(1);

  useEffect(() => {
    if (form.start_date) {
      setDays(calcWorkingDays(form.start_date, form.end_date || form.start_date));
    }
  }, [form.start_date, form.end_date]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = () => {
    if (!form.start_date || !form.reason) return alert("Please fill in required fields");
    onSubmit({ ...form, end_date: form.end_date || form.start_date, total_days: days });
  };

  const inputClass = "w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#0B3D91] focus:ring-2 focus:ring-[#0B3D91]/10 transition-all";
  const labelClass = "block text-xs font-semibold text-gray-600 mb-1.5";

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-5 py-4 border-b border-gray-100 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-base font-bold text-gray-900">Request Leave</h2>
            <p className="text-xs text-gray-400">Submit a new leave request</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-all">✕</button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className={labelClass}>Leave Type *</label>
            <div className="grid grid-cols-2 gap-2">
              {LEAVE_TYPES.map(lt => (
                <button key={lt.value} type="button"
                  onClick={() => set("leave_type", lt.value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all text-left
                    ${form.leave_type === lt.value ? "border-[#0B3D91] bg-blue-50 text-[#0B3D91]" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                  <span className="text-base">{lt.icon}</span> {lt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass}>Reason / Description *</label>
            <textarea value={form.reason} onChange={e => set("reason", e.target.value)}
              rows={3} placeholder="Describe the reason for your leave..."
              className={inputClass + " resize-none"} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Start Date *</label>
              <input type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)}
                className={inputClass} min={new Date().toISOString().split("T")[0]} />
            </div>
            <div>
              <label className={labelClass}>End Date</label>
              <input type="date" value={form.end_date} onChange={e => set("end_date", e.target.value)}
                className={inputClass} min={form.start_date || new Date().toISOString().split("T")[0]} />
            </div>
          </div>

          {form.start_date && (
            <div className="bg-blue-50 rounded-xl px-4 py-3 flex items-center gap-2">
              <span className="text-xl">📅</span>
              <div>
                <p className="text-sm font-bold text-[#0B3D91]">{days} Working Day{days !== 1 ? "s" : ""}</p>
                <p className="text-xs text-blue-600">Weekends excluded from calculation</p>
              </div>
            </div>
          )}

          <div>
            <label className={labelClass}>Additional Notes</label>
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
              rows={2} placeholder="Any additional information..."
              className={inputClass + " resize-none"} />
          </div>
        </div>

        <div className="sticky bottom-0 bg-white px-5 py-4 border-t border-gray-100 flex gap-3 rounded-b-2xl">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all">
            Cancel
          </button>
          <button onClick={handleSubmit}
            className="flex-1 py-2.5 bg-[#0B3D91] text-white rounded-xl text-sm font-bold hover:bg-[#1E5CC6] transition-all shadow-sm">
            Submit Request
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DETAIL MODAL ─────────────────────────────────────────────────────────────
function DetailModal({ request: r, onClose }) {
  const lt = LEAVE_TYPES.find(t => t.value === r.leave_type);
  const sc = STATUS_CONFIG[r.status];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Leave Details</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500">✕</button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
            <span className="text-3xl">{lt?.icon || "📋"}</span>
            <div>
              <p className="font-bold text-gray-800">{lt?.label || r.leave_type}</p>
              <p className="text-xs font-mono text-gray-400">{r.request_number}</p>
            </div>
            <span className="ml-auto text-xs font-bold px-3 py-1.5 rounded-full"
              style={{ color: sc?.color, background: sc?.bg }}>
              {sc?.icon} {sc?.label}
            </span>
          </div>

          {[
            { label: "Reason", value: r.reason || "-" },
            { label: "Start Date", value: formatDate(r.start_date) },
            { label: "End Date", value: formatDate(r.end_date) },
            { label: "Total Days", value: `${r.total_days} day${r.total_days !== 1 ? "s" : ""}` },
            { label: "Submitted", value: r.created_at ? new Date(r.created_at).toLocaleString("en-GB") : "-" },
            ...(r.approved_by_name ? [{ label: "Approved By", value: r.approved_by_name }] : []),
            ...(r.rejection_reason ? [{ label: "Rejection Reason", value: r.rejection_reason }] : []),
            ...(r.notes ? [{ label: "Notes", value: r.notes }] : []),
          ].map(row => (
            <div key={row.label} className="flex justify-between gap-3 py-1 border-b border-gray-50 last:border-0">
              <span className="text-xs text-gray-400 font-semibold">{row.label}</span>
              <span className="text-xs text-gray-700 font-medium text-right">{row.value}</span>
            </div>
          ))}
        </div>

        <div className="px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-all">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── APPROVAL MODAL ───────────────────────────────────────────────────────────
function ApprovalModal({ request: r, onClose, onDecide }) {
  const [rejReason, setRejReason] = useState("");
  const [mode, setMode] = useState(null); // "approve" | "reject"
  const lt = LEAVE_TYPES.find(t => t.value === r.leave_type);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Review Leave Request</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500">✕</button>
        </div>

        <div className="p-5 space-y-3">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{lt?.icon || "📋"}</span>
              <span className="font-bold text-gray-800 text-sm">{lt?.label}</span>
            </div>
            <p className="text-xs text-gray-600 mb-1">Reason: <span className="font-semibold">{r.reason}</span></p>
            <p className="text-xs text-gray-600">Duration: <span className="font-semibold">{formatDate(r.start_date)} – {formatDate(r.end_date)} ({r.total_days} days)</span></p>
            <p className="text-xs font-mono text-gray-400 mt-1">{r.request_number}</p>
          </div>

          {mode === "reject" && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Rejection Reason *</label>
              <textarea value={rejReason} onChange={e => setRejReason(e.target.value)}
                rows={3} placeholder="Please provide reason for rejection..."
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-red-400 resize-none" />
            </div>
          )}

          {!mode ? (
            <div className="flex gap-3">
              <button onClick={() => setMode("reject")}
                className="flex-1 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-bold hover:bg-red-100 transition-all">
                ❌ Reject
              </button>
              <button onClick={() => onDecide(true, "")}
                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all">
                ✅ Approve
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button onClick={() => setMode(null)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all">
                Back
              </button>
              <button onClick={() => { if (!rejReason.trim()) return alert("Please enter rejection reason"); onDecide(false, rejReason); }}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-all">
                Confirm Reject
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
