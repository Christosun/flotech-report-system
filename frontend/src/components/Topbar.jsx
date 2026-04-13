// frontend/src/components/Topbar.jsx
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import UserProfilePanel from "./UserProfilePanel";
import NotificationPanel from "./NotificationPanel";
import AnnouncementModal from "./AnnouncementModal";

const PAGE_TITLES = {
  "/dashboard":      { title: "Dashboard",            sub: "Overview & Analytics" },
  "/reports":        { title: "Official Reports",     sub: "Engineering site reports" },
  "/reports/create": { title: "New Report",           sub: "Create official report" },
  "/engineers":      { title: "Engineers",            sub: "Team & profile engineers" },
  "/quotations":     { title: "Quotations",           sub: "Sales & proposals" },
  "/stock":          { title: "Stock & Demo Units",   sub: "Inventory management" },
  "/catalog":        { title: "Catalogs & Manuals",   sub: "Product documents" },
  "/leave":          { title: "Leave Management",     sub: "Leave requests & approvals" },
  "/onsite":         { title: "Onsite Reports",       sub: "Field service records" },
  "/onsite/create":  { title: "New Onsite Report",    sub: "Create onsite record" },
  "/surat":          { title: "Material Handover",    sub: "Handover documents" },
  "/surat/create":   { title: "Create Letter",        sub: "Surat serah terima baru" },
  "/surat-resmi":    { title: "Official Letter",      sub: "Recommendations & statements" },
  "/users":          { title: "User Management",      sub: "PT Flotech Controls Indonesia" },
  "/notifications":  { title: "Notifications",        sub: "Activity feed & announcements" },
};

function readPrefs() {
  try { return JSON.parse(localStorage.getItem("user_prefs") || "{}"); } catch { return {}; }
}

function getTokenExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch { return null; }
}

function ensureLoginTime(token) {
  const expiry = getTokenExpiry(token);
  if (!expiry) return null;
  if (!localStorage.getItem("login_time")) {
    // Simpan waktu login sebenarnya (sekarang), bukan dihitung mundur hardcode dari expiry
    localStorage.setItem("login_time", String(Date.now()));
  }
  return expiry;
}

function fmtCd(ms) {
  if (ms <= 0) return { text: "00:00:00", totalSeconds: 0 };
  const tot = Math.floor(ms / 1000);
  const h   = Math.floor(tot / 3600);
  const m   = Math.floor((tot % 3600) / 60);
  const s   = tot % 60;
  return {
    text: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
    totalSeconds: tot,
  };
}

/* ── Session Badge ─────────────────────────────────────────────────────── */
function SessionBadge({ onExpired, visible }) {
  const [remaining, setRemaining] = useState(null);
  const [showTip, setShowTip]     = useState(false);
  const [pulse, setPulse]         = useState(false);
  const warnedRef       = useRef(false);
  const soundedRef      = useRef(false);
  const intervalRef     = useRef(null);
  const totalDurationRef = useRef(null);  // ← TAMBAH INI

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const expiry = ensureLoginTime(token);
    if (!expiry) return;

    // ← TAMBAH: hitung total durasi session
    const loginTime = parseInt(localStorage.getItem("login_time") || "0");
    totalDurationRef.current = expiry - loginTime;

    const tick = () => {
      const diff = expiry - Date.now();
      setRemaining(diff);
      if (diff <= 10 * 60 * 1000 && !warnedRef.current) {
        warnedRef.current = true;
        setPulse(true);
        setTimeout(() => setPulse(false), 3000);
      }
      if (diff <= 5 * 60 * 1000 && diff > 0 && !soundedRef.current) {
        soundedRef.current = true;
        const prefs = readPrefs();
        if (prefs.notif_sound !== false) {
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            [[0, 880], [0.25, 1046], [0.5, 1318]].forEach(([when, freq]) => {
              const osc  = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain); gain.connect(ctx.destination);
              osc.type = "sine"; osc.frequency.value = freq;
              gain.gain.setValueAtTime(0.4, ctx.currentTime + when);
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + 0.3);
              osc.start(ctx.currentTime + when); osc.stop(ctx.currentTime + when + 0.35);
            });
          } catch (_) {}
        }
      }
      if (diff <= 0) { clearInterval(intervalRef.current); onExpired?.(); }
    };
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => clearInterval(intervalRef.current);
  }, [onExpired]);

  if (!visible || remaining === null) return null;

  const { text, totalSeconds } = fmtCd(remaining);

  // ← UBAH: progress berdasarkan total durasi token yang sebenarnya
  const totalDuration = totalDurationRef.current || 3600000;
  const progress = Math.max(0, Math.min(1, (remaining / totalDuration)));

  let bg, tc, strokeCls, dotColor, label;
  if (totalSeconds > 1200) {
    bg = "bg-emerald-50 border-emerald-200"; tc = "text-emerald-700";
    strokeCls = "stroke-emerald-500"; dotColor = "#10b981"; label = "Active";
  } else if (totalSeconds > 300) {
    bg = "bg-amber-50 border-amber-200"; tc = "text-amber-700";
    strokeCls = "stroke-amber-500"; dotColor = "#f59e0b"; label = "Expiring soon";
  } else if (totalSeconds > 0) {
    bg = "bg-red-50 border-red-200"; tc = "text-red-600";
    strokeCls = "stroke-red-500"; dotColor = "#ef4444"; label = "About to expire!";
  } else {
    bg = "bg-gray-50 border-gray-200"; tc = "text-gray-400";
    strokeCls = "stroke-gray-400"; dotColor = "#9ca3af"; label = "Expired";
  }

  const SZ = 28, SW = 2.5, R = (SZ - SW) / 2;
  const CIRC = 2 * Math.PI * R;
  const dash  = CIRC * progress;

  // ← UBAH: label di tengah ring — tampilkan jam jika > 0, else menit
  const [hh, mm] = text.split(":");
  const ringLabel = hh !== "00" ? hh : mm;

  return (
    <div className="relative select-none"
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
    >
      <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border cursor-default transition-all duration-500 ${bg} ${pulse ? "animate-bounce" : ""}`}>
        <div className="relative flex-shrink-0" style={{ width: SZ, height: SZ }}>
          <svg width={SZ} height={SZ} style={{ transform: "rotate(-90deg)" }}>
            <circle cx={SZ/2} cy={SZ/2} r={R} fill="none" stroke="#e5e7eb" strokeWidth={SW} />
            <circle cx={SZ/2} cy={SZ/2} r={R} fill="none" strokeWidth={SW} strokeLinecap="round"
              className={`${strokeCls} transition-all duration-1000`}
              strokeDasharray={`${dash} ${CIRC}`} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span style={{ fontSize: "6.5px", fontWeight: 700, fontFamily: "monospace", color: dotColor, letterSpacing: "-0.5px" }}>
              {ringLabel}  {/* ← jam atau menit */}
            </span>
          </div>
        </div>
        <div className="hidden sm:flex flex-col leading-none">
          <span className={`text-[11px] font-bold tabular-nums tracking-tight ${tc}`} style={{ fontFamily: "ui-monospace, monospace" }}>
            {text}  {/* ← HH:MM:SS */}
          </span>
          <span className={`text-[9px] font-semibold ${tc} opacity-70`}>{label}</span>
        </div>
      </div>

      {showTip && (
        <div className="absolute top-full mt-2 right-0 z-50 bg-gray-900 text-white text-xs rounded-xl shadow-2xl px-4 py-3 w-56 pointer-events-none">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
            <span className="font-bold">{label}</span>
          </div>
          <p className="text-gray-300 leading-relaxed">
            Login session ends in{" "}
            <span className="text-white font-bold font-mono">{text}</span>.{" "}
            {totalSeconds > 0 ? "Save your work before the session expires ya." : "Silakan login kembali."}
          </p>
          <div className="absolute -top-1.5 right-5 w-3 h-3 bg-gray-900 rotate-45 rounded-sm" />
        </div>
      )}
    </div>
  );
}

/* ── Live Clock ─────────────────────────────────────────────────────────── */
function LiveClock({ visible }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!visible) return null;

  const DAYS   = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return (
    <div className="hidden md:flex flex-col items-end leading-none select-none">
      <span className="text-sm font-bold text-gray-700 tabular-nums" style={{ fontFamily: "ui-monospace, monospace" }}>
        {String(time.getHours()).padStart(2,"0")}:{String(time.getMinutes()).padStart(2,"0")}
        <span className="text-gray-400 text-xs font-normal">:{String(time.getSeconds()).padStart(2,"0")}</span>
      </span>
      <span className="text-[10px] text-gray-400 font-medium mt-0.5">
        {DAYS[time.getDay()]}, {time.getDate()} {MONTHS[time.getMonth()]} {time.getFullYear()}
      </span>
    </div>
  );
}

/* ── Announce Button (only for admin/manager) ────────────────────────── */
function AnnounceButton() {
  const navigate = useNavigate();
  const myRole = localStorage.getItem("user_role");
  const [showModal, setShowModal] = useState(false);
  const [showTip,   setShowTip]   = useState(false);

  if (!["admin", "manager"].includes(myRole)) return null;

  return (
    <>
      <div className="relative"
        onMouseEnter={() => setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}>
        <button
          onClick={() => setShowModal(true)}
          className="relative w-9 h-9 flex items-center justify-center rounded-xl border transition-all
            bg-white text-gray-500 border-gray-200 hover:border-amber-400 hover:text-amber-500
            hover:bg-amber-50 group"
          title="Send Announcement"
        >
          {/* Megaphone SVG */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 11l19-9-9 19-2-8-8-2z" />
          </svg>
          {/* Pulse dot */}
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-400 rounded-full
            border-2 border-white animate-pulse" />
        </button>

        {/* Tooltip */}
        {showTip && (
          <div className="absolute top-full mt-2 right-0 z-50 bg-gray-900 text-white text-xs
            rounded-xl shadow-2xl px-3 py-2 w-40 pointer-events-none text-center">
            <span className="font-bold">Send Announcement</span>
            <p className="text-gray-400 text-[10px] mt-0.5">Quick broadcast to team</p>
            <div className="absolute -top-1.5 right-3 w-3 h-3 bg-gray-900 rotate-45 rounded-sm" />
          </div>
        )}
      </div>

      {/* Quick Send Modal */}
      {showModal && (
        <AnnouncementModal onClose={() => setShowModal(false)} />
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   TOPBAR
   ═══════════════════════════════════════════════════════════════════ */
export default function Topbar({ onMenuClick }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [panelOpen, setPanelOpen] = useState(false);
  const [userName, setUserName]   = useState(() => localStorage.getItem("user_name") || "User");
  const [prefs, setPrefs]         = useState(readPrefs);

  useEffect(() => {
    const onProfileUpdate = (e) => {
      const name = e.detail?.name || localStorage.getItem("user_name") || "User";
      setUserName(name);
    };
    const onPrefsUpdate = () => setPrefs(readPrefs());

    window.addEventListener("profile-updated", onProfileUpdate);
    window.addEventListener("prefs-updated",   onPrefsUpdate);
    return () => {
      window.removeEventListener("profile-updated", onProfileUpdate);
      window.removeEventListener("prefs-updated",   onPrefsUpdate);
    };
  }, []);

  const current =
    PAGE_TITLES[location.pathname] ||
    (location.pathname.startsWith("/reports/")    ? { title: "Report Details",    sub: "Field report view" }    :
     location.pathname.startsWith("/quotations/") ? { title: "Quotation Details", sub: "Quotation view" }       :
     location.pathname.startsWith("/onsite/")     ? { title: "Onsite Details",    sub: "Field service record" } :
     location.pathname.startsWith("/surat/")      ? { title: "Letter Details",    sub: "Handover documents" }   :
     { title: "Flotech Controls", sub: "PT Flotech Controls Indonesia" });

  const initial     = userName.charAt(0).toUpperCase();
  const showClock   = prefs.show_clock   !== false;
  const showSession = prefs.notif_session !== false;

  return (
    <>
      <header className="bg-white border-b border-gray-100 px-4 lg:px-6 py-2.5 flex items-center justify-between sticky top-0 z-10 shadow-sm">

        {/* LEFT */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors flex-shrink-0">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="min-w-0 flex flex-col justify-center">
            <h2 className="text-sm font-bold text-gray-800 leading-snug truncate">{current.title}</h2>
            <p className="text-[11px] text-gray-400 hidden sm:block truncate leading-snug mt-0">{current.sub}</p>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">

          <LiveClock visible={showClock} />
          {showClock && <div className="hidden md:block w-px h-6 bg-gray-200" />}

          <SessionBadge
            visible={showSession}
            onExpired={() => { localStorage.clear(); navigate("/"); }}
          />
          {showSession && <div className="hidden sm:block w-px h-6 bg-gray-200" />}

          {/* 📢 Announce Button — only admin/manager */}
          <AnnounceButton />

          {/* 🔔 Notification Bell */}
          <NotificationPanel />

          <div className="w-px h-6 bg-gray-200" />

          {/* User chip */}
          <button
            onClick={() => setPanelOpen(true)}
            className="group flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-all duration-150"
            title="Edit profil & preferensi">
            <div className="hidden sm:block text-right leading-none">
              <p className="text-sm font-semibold text-gray-700 leading-tight group-hover:text-[#0B3D91] transition-colors">
                {userName}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">PT Flotech Controls Indonesia</p>
            </div>
            <div className="relative">
              <div className="w-8 h-8 bg-gradient-to-br from-[#0B3D91] to-[#1E5CC6] rounded-full flex items-center justify-center
                shadow-sm ring-2 ring-blue-100 group-hover:ring-blue-300 transition-all duration-200">
                <span className="text-white text-xs font-black">{initial}</span>
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full" />
            </div>
            <svg className="w-3 h-3 text-gray-300 group-hover:text-[#0B3D91] transition-colors hidden sm:block"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </header>

      <UserProfilePanel open={panelOpen} onClose={() => setPanelOpen(false)} />
    </>
  );
}