import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import toast from "react-hot-toast";

const ROLES = [
  { value: "engineer", label: "Engineer", color: "bg-blue-100 text-blue-700",    dot: "bg-blue-500"    },
  { value: "admin",    label: "Admin",    color: "bg-red-100 text-red-700",      dot: "bg-red-500"     },
  { value: "manager",  label: "Manager",  color: "bg-purple-100 text-purple-700",dot: "bg-purple-500"  },
  { value: "hr",       label: "HR",       color: "bg-amber-100 text-amber-700",  dot: "bg-amber-500"   },
];
const roleInfo = (role) =>
  ROLES.find(r => r.value === role) || { label: role, color: "bg-gray-100 text-gray-600", dot: "bg-gray-400" };

const inputClass =
  "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm " +
  "focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white transition-all";
const labelClass = "block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5";

function Avatar({ name, size = 40 }) {
  const ch   = (name || "U").charAt(0).toUpperCase();
  const code = (name || "U").charCodeAt(0);
  const grad = code % 3 === 0 ? "from-[#0B3D91] to-[#1E5CC6]"
             : code % 3 === 1 ? "from-[#0d2347] to-[#0B3D91]"
             :                   "from-[#1E5CC6] to-[#3b82f6]";
  return (
    <div className={`bg-gradient-to-br ${grad} rounded-full flex items-center justify-center flex-shrink-0 shadow-sm`}
      style={{ width: size, height: size }}>
      <span className="text-white font-black" style={{ fontSize: size * 0.4 }}>{ch}</span>
    </div>
  );
}

function UserModal({ user, onClose, onSaved }) {
  const isEdit = !!user;
  const [form, setForm] = useState({
    name: user?.name || "", username: user?.username || "",
    role: user?.role || "engineer", new_password: "",
  });
  const [saving, setSaving] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error("Full name is mandatory"); return; }
    if (!isEdit && !form.username.trim()) { toast.error("Username is mandatory"); return; }
    if (!isEdit && form.new_password.length < 6) { toast.error("Password minimum 6 characters"); return; }
    setSaving(true);
    try {
      if (isEdit) {
        const p = { name: form.name.trim(), role: form.role };
        if (form.new_password) p.new_password = form.new_password;
        await API.put(`/auth/users/update/${user.id}`, p);
        toast.success("User updated ✅");
      } else {
        await API.post("/auth/users/create", {
          name: form.name.trim(), username: form.username.trim().toLowerCase(),
          role: form.role, password: form.new_password,
        });
        toast.success(`User '@${form.username}' created 🎉`);
      }
      onSaved(); onClose();
    } catch (e) { toast.error(e.response?.data?.error || "Failed to save"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-[#0B3D91] to-[#1E5CC6] px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-base">{isEdit ? "Edit User" : "Add New User"}</h2>
            <p className="text-blue-200 text-xs mt-0.5">{isEdit ? `Editing: @${user.username}` : "Create account for team member"}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-sm">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className={labelClass}>Full Name *</label>
            <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="User's full name"
              className={inputClass} onKeyDown={e => e.key === "Enter" && handleSubmit()} />
          </div>
          {!isEdit && (
            <div>
              <label className={labelClass}>Username *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">@</span>
                <input value={form.username}
                  onChange={e => set("username", e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""))}
                  placeholder="eg: billy_flotech" className={inputClass + " pl-7"}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()} />
              </div>
              <p className="text-xs text-gray-400 mt-1">Lowercase, numbers, dots, underscores only.</p>
            </div>
          )}
          <div>
            <label className={labelClass}>Role *</label>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map(r => (
                <button key={r.value} type="button" onClick={() => set("role", r.value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                    form.role === r.value ? "border-[#0B3D91] bg-[#EEF3FB] text-[#0B3D91]" : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                  }`}>
                  <span className={`w-2 h-2 rounded-full ${r.dot}`} />{r.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelClass}>{isEdit ? "New Password (blank = no change)" : "Password *"}</label>
            <div className="relative">
              <input type={showPass ? "text" : "password"} value={form.new_password}
                onChange={e => set("new_password", e.target.value)}
                placeholder={isEdit ? "Fill to reset password" : "Minimum 6 characters"}
                className={inputClass + " pr-10"} onKeyDown={e => e.key === "Enter" && handleSubmit()} />
              <button type="button" onClick={() => setShowPass(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
                {showPass ? "🙈" : "👁"}
              </button>
            </div>
          </div>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 py-3 bg-[#0B3D91] text-white rounded-xl text-sm font-bold hover:bg-[#1E5CC6] disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm">
            {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Create User"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteDialog({ user, onClose, onConfirm, loading }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-br from-red-50 to-rose-100 px-6 pt-7 pb-5 text-center">
          <div className="w-16 h-16 bg-red-100 border-4 border-red-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🗑️</span>
          </div>
          <h3 className="text-base font-bold text-gray-900">Delete User?</h3>
          <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
            <strong className="text-gray-700">{user.name}</strong>{" "}
            (<code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">@{user.username}</code>)
            {" "}will be permanently deleted.
          </p>
        </div>
        <div className="px-6 py-4 flex gap-3">
          <button onClick={onClose} disabled={loading} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 flex items-center justify-center gap-2 disabled:opacity-60">
            {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UserManagement() {
  const navigate = useNavigate();
  const [users,        setUsers]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [modal,        setModal]        = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);
  const [search,       setSearch]       = useState("");

  const myId   = Number(localStorage.getItem("user_id"));
  const myRole = localStorage.getItem("user_role");

  useEffect(() => {
    if (myRole !== "admin") { toast.error("Access denied — admin only"); navigate("/dashboard"); }
  }, [myRole, navigate]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try { const res = await API.get("/auth/users"); setUsers(res.data); }
    catch { toast.error("Failed to load users"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await API.delete(`/auth/users/delete/${deleteTarget.id}`);
      toast.success(`User '${deleteTarget.username}' deleted`);
      setDeleteTarget(null); fetchUsers();
    } catch (e) { toast.error(e.response?.data?.error || "Failed to delete"); }
    finally { setDeleting(false); }
  };

  const filtered = users.filter(u =>
    !search ||
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.role?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = [
    { label: "Total User",  val: users.length,                                                icon: "👥", color: "#0B3D91", bg: "#EEF3FB" },
    { label: "Admin",       val: users.filter(u => u.role === "admin").length,                icon: "🛡️", color: "#dc2626", bg: "#fef2f2" },
    { label: "Engineer",    val: users.filter(u => u.role === "engineer").length,             icon: "👷", color: "#2563eb", bg: "#eff6ff" },
    { label: "Manager/HR",  val: users.filter(u => ["manager","hr"].includes(u.role)).length, icon: "💼", color: "#7c3aed", bg: "#f5f3ff" },
  ];

  if (myRole !== "admin") return null;

  return (
    <div className="space-y-5">

      {/* Modals */}
      {modal && <UserModal user={modal === "create" ? null : modal} onClose={() => setModal(null)} onSaved={fetchUsers} />}
      {deleteTarget && <DeleteDialog user={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} loading={deleting} />}

      {/* ══ HEADER CARD — same structure as Leave Management ══ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 lg:p-6">

        {/* Title row */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
          <div>
            <h1 className="text-xl font-black text-gray-900">User Management</h1>
            <p className="text-xs text-gray-400 mt-0.5">PT Flotech Controls Indonesia</p>
          </div>
          <button onClick={() => setModal("create")}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-[#0B3D91] text-white text-xs font-black rounded-xl hover:bg-[#1E5CC6] flex-shrink-0 transition-all shadow-sm shadow-blue-900/20">
            ＋ Add User
          </button>
        </div>

        {/* Stat cards — same style as Leave Management StatCard */}
        {loading ? (
          <div className="flex justify-center items-center h-24">
            <div className="w-8 h-8 border-2 border-[#0B3D91] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {stats.map(s => (
              <div key={s.label}
                className={`bg-white rounded-2xl border shadow-sm p-4 lg:p-5 ${s.label === "Total User" ? "border-gray-100" : "border-gray-100"}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                    style={{ background: s.bg }}>
                    {s.icon}
                  </div>
                </div>
                <p className="text-3xl font-black tabular-nums" style={{ color: s.color }}>{s.val}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{s.label}</p>
                <p className="text-xs text-gray-400">users</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══ CONTENT CARD — search + list/table ══ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        {/* Search */}
        <div className="px-4 lg:px-5 py-4 border-b border-gray-100">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" placeholder="Search name, username, or role..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm
                focus:outline-none focus:ring-2 focus:ring-[#0B3D91] bg-white transition-all" />
            {search && (
              <button onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
            )}
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="w-8 h-8 border-2 border-[#0B3D91] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-4xl mb-3">👥</p>
            <p className="text-gray-500 font-medium">{search ? "No matching users" : "No users yet"}</p>
            {!search && (
              <button onClick={() => setModal("create")}
                className="mt-4 px-5 py-2 bg-[#0B3D91] text-white rounded-xl text-sm font-semibold">Add First User</button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#0B3D91] text-white">
                    <th className="px-5 py-3 text-left text-xs font-semibold">User</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold">Username</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold">Role</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold w-32">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u, i) => {
                    const ri = roleInfo(u.role);
                    return (
                      <tr key={u.id}
                        className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50/60"} hover:bg-blue-50/50 transition-all border-b border-gray-50`}>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar name={u.name} size={34} />
                            <div>
                              <p className="font-semibold text-gray-800 text-sm leading-tight">{u.name}</p>
                              {u.id === myId && (
                                <span className="text-[10px] text-[#0B3D91] font-bold bg-blue-50 px-1.5 py-0.5 rounded-full">Your Account</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <code className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-lg font-mono">@{u.username}</code>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${ri.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${ri.dot}`} />{ri.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => setModal(u)} className="text-xs text-[#0B3D91] font-bold hover:underline">Edit</button>
                            {u.id !== myId && (
                              <button onClick={() => setDeleteTarget(u)} className="text-xs text-red-400 font-bold hover:text-red-600">Delete</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden divide-y divide-gray-100">
              {filtered.map(u => {
                const ri = roleInfo(u.role);
                return (
                  <div key={u.id} className="p-4 hover:bg-blue-50/20 transition-colors">
                    <div className="flex items-start gap-3">
                      <Avatar name={u.name} size={42} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-bold text-gray-800 text-sm leading-tight truncate">{u.name}</p>
                            <code className="text-[11px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded font-mono">@{u.username}</code>
                          </div>
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${ri.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${ri.dot}`} />{ri.label}
                          </span>
                        </div>
                        {u.id === myId && (
                          <span className="inline-block mt-1 text-[10px] text-[#0B3D91] font-bold bg-blue-50 px-2 py-0.5 rounded-full">Your Account</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
                      <button onClick={() => setModal(u)}
                        className="flex-1 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors flex items-center justify-center gap-1.5">
                        ✏️ Edit
                      </button>
                      {u.id !== myId ? (
                        <button onClick={() => setDeleteTarget(u)}
                          className="flex-1 py-2 bg-red-50 text-red-500 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5">
                          🗑 Delete
                        </button>
                      ) : (
                        <div className="flex-1 py-2 bg-gray-50 text-gray-300 rounded-xl text-xs font-bold text-center cursor-not-allowed">Delete</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer count */}
            <div className="px-5 py-3 border-t border-gray-50 bg-gray-50/50">
              <p className="text-xs text-gray-400">
                Showing <span className="font-bold text-gray-600">{filtered.length}</span> of{" "}
                <span className="font-bold text-gray-600">{users.length}</span> users
              </p>
            </div>
          </>
        )}
      </div>

      {/* Security notice */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
        <span className="text-amber-500 text-lg flex-shrink-0 mt-0.5">⚠️</span>
        <div>
          <p className="text-xs font-bold text-amber-700 mb-0.5">Security Notes</p>
          <p className="text-xs text-amber-600 leading-relaxed">
            This page is accessible only to <strong>Admin</strong>. Be careful when granting Admin roles.
            User deletion is permanent and cannot be undone.
          </p>
        </div>
      </div>

    </div>
  );
}