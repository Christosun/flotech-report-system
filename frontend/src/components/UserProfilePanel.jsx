import { useState, useEffect, useRef } from "react";
import API from "../services/api";

/* ─── SVG Icon ─────────────────────────────────────────────────────────────── */
const Ico = ({ d, size = 16, cls = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    className={cls}>
    <path d={d} />
  </svg>
);
const IC = {
  user:   "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  mail:   "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
  lock:   "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4",
  eye:    "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  eyeOff: "M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22",
  phone:  "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.9a16 16 0 0 0 6.16 6.16l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z",
  badge:  "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  bell:   "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0",
  save:   "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  check:  "M20 6L9 17l-5-5",
  x:      "M18 6 6 18M6 6l12 12",
  gear:   "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm8.93-3a8.97 8.97 0 0 1-.08 1.06L22.93 9l-3-5.2-2.19.88A8.01 8.01 0 0 0 16 3.38V1H8v2.38c-.65.27-1.25.62-1.74 1.04L4.07 3.8l-3 5.2 2.08 1.94c-.05.34-.08.7-.08 1.06s.03.72.08 1.06L1.07 15l3 5.2 2.19-.88c.49.42 1.09.77 1.74 1.04V23h8v-2.62c.65-.27 1.25-.62 1.74-1.04l2.19.88 3-5.2-2.08-1.94c.05-.34.08-.7.08-1.08z",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  info:   "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zm0-7v-4m0-4h.01",
  palette:"M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10c0 1.657-1.343 3-3 3h-1.5a1.5 1.5 0 0 0 0 3H19M8 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm4-2a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm4 2a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
};

/* ─── Toggle ───────────────────────────────────────────────────────────────── */
function Toggle({ checked, onChange, label, description }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-gray-50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-700">{label}</p>
        {description && <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative flex-shrink-0 mt-0.5 w-10 h-5 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400 ${checked ? "bg-[#0B3D91]" : "bg-gray-200"}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${checked ? "translate-x-5" : "translate-x-0"}`} />
      </button>
    </div>
  );
}

/* ─── Field ────────────────────────────────────────────────────────────────── */
function Field({ label, icon, type = "text", value, onChange, placeholder, readOnly, suffix, hint }) {
  const [show, setShow] = useState(false);
  const isPass = type === "password";
  const realType = isPass ? (show ? "text" : "password") : type;
  return (
    <div>
      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">{label}</label>
      <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all duration-200 ${
        readOnly ? "bg-gray-50 border-gray-100" : "bg-white border-gray-200 hover:border-blue-300 focus-within:border-[#0B3D91] focus-within:ring-2 focus-within:ring-blue-50"
      }`}>
        {icon && <Ico d={icon} size={14} cls="text-gray-400 flex-shrink-0" />}
        <input type={realType} value={value ?? ""} onChange={onChange} placeholder={placeholder} readOnly={readOnly}
          className="flex-1 text-sm text-gray-700 bg-transparent outline-none placeholder-gray-300 min-w-0" />
        {suffix && <span className="text-xs text-gray-400 flex-shrink-0 font-medium">{suffix}</span>}
        {isPass && !readOnly && (
          <button type="button" onClick={() => setShow(s => !s)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <Ico d={show ? IC.eyeOff : IC.eye} size={14} />
          </button>
        )}
      </div>
      {hint && <p className="text-[10px] text-gray-400 mt-1 px-1">{hint}</p>}
    </div>
  );
}

/* ─── Section heading ──────────────────────────────────────────────────────── */
function Sec({ icon, label }) {
  return (
    <div className="flex items-center gap-2 mt-6 mb-3 first:mt-0">
      <div className="w-5 h-5 bg-[#0B3D91] bg-opacity-10 rounded-md flex items-center justify-center flex-shrink-0">
        <Ico d={icon} size={11} cls="text-[#0B3D91]" />
      </div>
      <span className="text-[10px] font-black text-[#0B3D91] uppercase tracking-[0.12em]">{label}</span>
      <div className="flex-1 h-px bg-blue-100" />
    </div>
  );
}

/* ─── Avatar ───────────────────────────────────────────────────────────────── */
function Avatar({ name, size = 64 }) {
  const ch   = (name || "U").charAt(0).toUpperCase();
  const code = name?.charCodeAt(0) || 70;
  const grad = code % 3 === 0 ? "from-[#0B3D91] to-[#1E5CC6]"
             : code % 3 === 1 ? "from-[#0d2347] to-[#0B3D91]"
             : "from-[#1E5CC6] to-[#3b82f6]";
  return (
    <div className={`bg-gradient-to-br ${grad} rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0`}
      style={{ width: size, height: size }}>
      <span className="text-white font-black" style={{ fontSize: size * 0.38 }}>{ch}</span>
    </div>
  );
}

/* ─── Password strength ────────────────────────────────────────────────────── */
function PwStrength({ pw }) {
  if (!pw) return null;
  const score = (pw.length >= 6 ? 1 : 0) + (pw.length >= 10 ? 1 : 0)
    + (/[A-Z]/.test(pw) && /[0-9]/.test(pw) ? 1 : 0) + (/[^a-zA-Z0-9]/.test(pw) ? 1 : 0);
  const labels = ["", "Lemah", "Cukup", "Kuat", "Sangat kuat"];
  const clr    = ["", "bg-red-400", "bg-amber-400", "bg-blue-500", "bg-emerald-500"];
  const txt    = ["", "text-red-500", "text-amber-500", "text-blue-600", "text-emerald-600"];
  return (
    <div className="mt-1.5 px-1">
      <div className="flex gap-1">{[1,2,3,4].map(i => (
        <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= score ? clr[score] : "bg-gray-200"}`} />
      ))}</div>
      <p className={`text-[10px] mt-1 font-semibold ${txt[score]}`}>{labels[score]}</p>
    </div>
  );
}

/* ─── Toast ────────────────────────────────────────────────────────────────── */
function Toast({ data }) {
  if (!data) return null;
  return (
    <div className={`fixed bottom-6 right-6 z-[70] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl text-sm font-semibold pointer-events-none ${
      data.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
    }`}>
      <Ico d={data.type === "success" ? IC.check : IC.x} size={15} />
      {data.msg}
    </div>
  );
}

/* ─── Helpers ──────────────────────────────────────────────────────────────── */
const DEFAULT_PREFS = {
  notif_session:   true,
  notif_sound:     false,
  compact_sidebar: false,
  show_clock:      true,
};

function loadPrefs() {
  try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem("user_prefs") || "{}") }; }
  catch { return { ...DEFAULT_PREFS }; }
}

function savePrefs(next) {
  localStorage.setItem("user_prefs", JSON.stringify(next));
  // ← KEY FIX: dispatch event so Topbar & Sidebar re-read prefs without a page reload
  window.dispatchEvent(new Event("prefs-updated"));
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function UserProfilePanel({ open, onClose }) {
  const [tab,      setTab]      = useState("profile");
  const [profile,  setProfile]  = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [toastData, setToastData] = useState(null);
  const toastTimer = useRef(null);

  const [form, setForm] = useState({ name: "", email: "" });
  const [sec,  setSec]  = useState({ current_password: "", new_password: "", confirm_password: "" });

  // ← prefs stored in component state — no reading localStorage at render time
  const [prefs, setPrefs] = useState(loadPrefs);

  /* helpers */
  const showToast = (msg, type = "success") => {
    clearTimeout(toastTimer.current);
    setToastData({ msg, type });
    toastTimer.current = setTimeout(() => setToastData(null), 3200);
  };

  // ← KEY FIX: update pref both in state AND in localStorage, then broadcast
  const setP = (key, val) => {
    const next = { ...prefs, [key]: val };
    setPrefs(next);
    savePrefs(next);
    showToast("Preferences are saved");
  };

  /* Load profile when panel opens */
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setTab("profile");
    API.get("/auth/me")
      .then(r => {
        setProfile(r.data);
        setForm({ name: r.data.name || "", email: r.data.email || "" });
      })
      .catch(() => {
        setForm({ name: localStorage.getItem("user_name") || "", email: "" });
      })
      .finally(() => setLoading(false));
  }, [open]);

  /* Refresh prefs from storage whenever panel opens (another tab may have changed them) */
  useEffect(() => {
    if (open) setPrefs(loadPrefs());
  }, [open]);

  useEffect(() => {
    if (tab !== "security") setSec({ current_password: "", new_password: "", confirm_password: "" });
  }, [tab]);

  /* Save profile */
  const saveProfile = async () => {
    if (!form.name.trim()) { showToast("Name cannot be empty", "error"); return; }
    setSaving(true);
    try {
      const res = await API.put("/auth/update-profile", { name: form.name.trim(), email: form.email.trim() });
      localStorage.setItem("user_name", res.data.name);
      setProfile(prev => prev ? { ...prev, name: res.data.name, email: res.data.email } : prev);
      window.dispatchEvent(new CustomEvent("profile-updated", { detail: { name: res.data.name } }));
      showToast("Profile saved successfully!");
    } catch (e) {
      showToast(e.response?.data?.error || "Failed to save profile", "error");
    } finally { setSaving(false); }
  };

  /* Save password */
  const savePassword = async () => {
    if (!sec.current_password || !sec.new_password || !sec.confirm_password) {
      showToast("All fields must be filled in", "error"); return;
    }
    if (sec.new_password !== sec.confirm_password) {
      showToast("Confirm password does not match", "error"); return;
    }
    if (sec.new_password.length < 6) {
      showToast("Password must be at least 6 characters", "error"); return;
    }
    setSaving(true);
    try {
      await API.put("/auth/update-profile", {
        current_password: sec.current_password,
        new_password:     sec.new_password,
      });
      setSec({ current_password: "", new_password: "", confirm_password: "" });
      showToast("Password changed successfully!");
    } catch (e) {
      showToast(e.response?.data?.error || "Failed to change password", "error");
    } finally { setSaving(false); }
  };

  const displayName = form.name || localStorage.getItem("user_name") || "User";

  const TABS = [
    { id: "profile",     label: "Profile",     icon: IC.user    },
    { id: "security",    label: "Security",   icon: IC.shield  },
    { id: "preferences", label: "Preferences", icon: IC.gear    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 transition-all duration-300 ${open ? "bg-black/40 backdrop-blur-[2px]" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
      />

      {/* Panel */}
      <aside className={`fixed top-0 right-0 h-full z-50 w-full sm:w-[390px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${open ? "translate-x-0" : "translate-x-full"}`}>

        {/* Header */}
        <div className="bg-gradient-to-br from-[#0a1628] via-[#0d2347] to-[#0B3D91] px-5 pt-5 pb-7 flex-shrink-0">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.15em]">PT Flotech Controls Indonesia</p>
              <h2 className="text-white text-base font-bold mt-0.5">User Profile</h2>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors text-white mt-0.5">
              <Ico d={IC.x} size={13} />
            </button>
          </div>
          <div className="flex items-center gap-3.5">
            <Avatar name={displayName} size={58} />
            <div className="min-w-0 flex-1">
              <p className="text-white font-bold text-sm leading-tight truncate">{displayName}</p>
              <p className="text-blue-300 text-[11px] mt-0.5 truncate">{profile?.email || form.email || "—"}</p>
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="px-2 py-0.5 rounded-full bg-white/15 text-blue-200 text-[9px] font-bold uppercase tracking-wide">
                  {profile?.role || "engineer"}
                </span>
                {profile?.engineer?.position && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 text-[9px] font-bold uppercase tracking-wide truncate max-w-[120px]">
                    {profile.engineer.position}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center gap-1 pt-3 pb-2.5 text-[9px] font-black uppercase tracking-[0.1em] transition-all border-b-2 -mb-px ${
                tab === t.id ? "border-[#0B3D91] text-[#0B3D91] bg-white" : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-white/60"
              }`}>
              <Ico d={t.icon} size={14} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4" style={{ scrollbarWidth: "thin", scrollbarColor: "#cbd5e1 #f8fafc" }}>
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <div className="w-8 h-8 border-2 border-[#0B3D91] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-gray-400">Loading profile…</p>
            </div>
          ) : tab === "profile" ? (

            /* ── PROFILE ─────────────────────────────────────────────── */
            <div className="space-y-3.5">
              <Sec icon={IC.user} label="Account Information" />
              <Field label="Full Name" icon={IC.user} value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your Full Name" />
              <Field label="Email Address" icon={IC.mail} type="email" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@flotech.co.id" />

              {profile?.engineer ? (
                <>
                  <Sec icon={IC.badge} label="Engineer Profile (connected)" />
                  <div className="grid grid-cols-2 gap-2.5">
                    <Field label="Employee ID"   icon={IC.badge}  value={profile.engineer.employee_id      || "—"} readOnly />
                    <Field label="Pengalaman"    icon={IC.badge}  value={String(profile.engineer.years_experience ?? 0)} readOnly suffix="thn" />
                  </div>
                  <Field label="Jabatan"         icon={IC.user}   value={profile.engineer.position         || "—"} readOnly />
                  <Field label="Departemen"      icon={IC.gear}   value={profile.engineer.department        || "—"} readOnly />
                  <Field label="No. Telepon"     icon={IC.phone}  value={profile.engineer.phone             || "—"} readOnly />
                  <Field label="Spesialisasi"    icon={IC.badge}  value={profile.engineer.specialization    || "—"} readOnly />
                  {profile.engineer.certification && (
                    <Field label="Sertifikasi"   icon={IC.shield} value={profile.engineer.certification}   readOnly />
                  )}
                  <div className="flex items-center gap-2 mt-1 p-3 rounded-xl bg-blue-50 border border-blue-100">
                    <Ico d={IC.info} size={13} cls="text-blue-500 flex-shrink-0" />
                    <p className="text-[10px] text-blue-600 leading-relaxed">
                      Edit engineer details in the menu{" "}
                      <a href="/engineers" className="font-bold underline" onClick={onClose}>Engineers</a>
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-100 mt-1">
                  <Ico d={IC.info} size={13} cls="text-amber-500 flex-shrink-0" />
                  <p className="text-[10px] text-amber-600 leading-relaxed">
                    Not yet connected to engineer profile.{" "}
                    <a href="/engineers" className="font-bold underline" onClick={onClose}>Connect at Engineers</a>
                  </p>
                </div>
              )}

              <button onClick={saveProfile} disabled={saving}
                className="w-full mt-2 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#0B3D91] hover:bg-[#0a3280] text-white text-sm font-bold transition-all disabled:opacity-50 shadow-md shadow-blue-900/20">
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Ico d={IC.save} size={15} />}
                Save Changes
              </button>
            </div>

          ) : tab === "security" ? (

            /* ── SECURITY ─────────────────────────────────────────────── */
            <div className="space-y-3.5">
              <Sec icon={IC.lock} label="Change Password" />
              <Field label="Current Password" icon={IC.lock} type="password" value={sec.current_password}
                onChange={e => setSec(s => ({ ...s, current_password: e.target.value }))} placeholder="Enter the old password" />
              <div>
                <Field label="New Password" icon={IC.lock} type="password" value={sec.new_password}
                  onChange={e => setSec(s => ({ ...s, new_password: e.target.value }))} placeholder="Minimum 6 characters" />
                <PwStrength pw={sec.new_password} />
              </div>
              <Field label="Confirm New Password" icon={IC.lock} type="password" value={sec.confirm_password}
                onChange={e => setSec(s => ({ ...s, confirm_password: e.target.value }))} placeholder="Repeat the new password" />
              {sec.confirm_password && sec.confirm_password !== sec.new_password && (
                <p className="text-[10px] text-red-500 px-1 flex items-center gap-1 -mt-2">
                  <Ico d={IC.x} size={10} /> Passwords do not match
                </p>
              )}
              {sec.confirm_password && sec.confirm_password === sec.new_password && sec.new_password && (
                <p className="text-[10px] text-emerald-600 px-1 flex items-center gap-1 -mt-2">
                  <Ico d={IC.check} size={10} /> Passwords match
                </p>
              )}
              <button onClick={savePassword} disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#0B3D91] hover:bg-[#0a3280] text-white text-sm font-bold transition-all disabled:opacity-50 shadow-md shadow-blue-900/20">
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Ico d={IC.shield} size={15} />}
                Change Password
              </button>

              <Sec icon={IC.info} label="Session Information" />
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                {[
                  ["Session state", <span key="s" className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/>Active</span>],
                  ["Account roles",  <span key="r" className="text-xs font-bold text-gray-700 capitalize">{profile?.role || "engineer"}</span>],
                  ["Join",  <span key="j" className="text-xs text-gray-600">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"}) : "—"}</span>],
                ].map(([lbl, val], i) => (
                  <div key={i} className={`flex items-center justify-between px-3.5 py-2.5 ${i%2===0?"bg-gray-50":"bg-white"}`}>
                    <span className="text-[11px] text-gray-500 font-medium">{lbl}</span>{val}
                  </div>
                ))}
              </div>

              <button onClick={() => { localStorage.clear(); window.location.href = "/"; }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-red-200 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-bold transition-all">
                <Ico d={IC.logout} size={14} />
                Sign Out of the Application
              </button>
            </div>

          ) : (

            /* ── PREFERENCES ──────────────────────────────────────────── */
            <div>
              <Sec icon={IC.bell} label="Session Notifications" />
              <div className="rounded-xl border border-gray-100 overflow-hidden px-3.5">
                <Toggle
                  checked={prefs.notif_session}
                  onChange={v => setP("notif_session", v)}
                  label="Session timer in topbar"
                  description="Display the remaining login time countdown at the top right."
                />
                <Toggle
                  checked={prefs.notif_sound}
                  onChange={v => setP("notif_sound", v)}
                  label="Warning sound (5 minutes remaining)"
                  description="Three tones sound when the login session has less than 5 minutes remaining."
                />
              </div>

              <Sec icon={IC.palette} label="Appearance" />
              <div className="rounded-xl border border-gray-100 overflow-hidden px-3.5">
                <Toggle
                  checked={prefs.show_clock}
                  onChange={v => setP("show_clock", v)}
                  label="Real-time clock in topbar"
                  description="Display digital clock and date in the right topbar area"
                />
                <Toggle
                  checked={prefs.compact_sidebar}
                  onChange={v => setP("compact_sidebar", v)}
                  label="Compact sidebar (icon only)"
                  description="Minimize sidebar — show icons only without text labels"
                />
              </div>

              <div className="mt-5 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-4 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#0B3D91] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Ico d={IC.check} size={13} cls="text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#0B3D91]">Saved & applied automatically</p>
                  <p className="text-[10px] text-blue-600 mt-0.5 leading-relaxed">
                    All changes are immediately applied without the need to reload the page.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-5 py-2.5 flex-shrink-0 bg-gray-50/80">
          <p className="text-[9px] text-gray-400 text-center tracking-wide">
            PT Flotech Controls Indonesia · Service Management System · 2026
          </p>
        </div>
      </aside>

      <Toast data={toastData} />
    </>
  );
}