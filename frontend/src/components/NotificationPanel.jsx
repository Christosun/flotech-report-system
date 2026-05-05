// frontend/src/components/NotificationPanel.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import {
  Bell,
  FileText,
  Edit3,
  Trophy,
  TrendingDown,
  ClipboardList,
  Wrench,
  CheckCircle,
  Umbrella,
  XCircle,
  Clock,
  Info,
  X,
  CheckCheck,
  Trash2,
} from "lucide-react";

// ── Notification type config ──────────────────────────────────────────────────
const TYPE_CFG = {
  quotation_created: {
    Icon: FileText,
    color: "bg-blue-100 text-blue-600",
    label: "Quotation",
  },
  quotation_updated: {
    Icon: Edit3,
    color: "bg-indigo-100 text-indigo-600",
    label: "Quotation",
  },
  quotation_won: {
    Icon: Trophy,
    color: "bg-emerald-100 text-emerald-600",
    label: "Won!",
  },
  quotation_lost: {
    Icon: TrendingDown,
    color: "bg-red-100 text-red-500",
    label: "Lost",
  },
  report_created: {
    Icon: ClipboardList,
    color: "bg-purple-100 text-purple-600",
    label: "Report",
  },
  onsite_created: {
    Icon: Wrench,
    color: "bg-orange-100 text-orange-600",
    label: "Onsite",
  },
  onsite_approved: {
    Icon: CheckCircle,
    color: "bg-emerald-100 text-emerald-600",
    label: "Approved",
  },
  leave_approved: {
    Icon: Umbrella,
    color: "bg-teal-100 text-teal-600",
    label: "Leave",
  },
  leave_rejected: {
    Icon: XCircle,
    color: "bg-red-100 text-red-500",
    label: "Leave",
  },
  leave_pending: {
    Icon: Clock,
    color: "bg-amber-100 text-amber-600",
    label: "Leave",
  },
  general: {
    Icon: Info,
    color: "bg-gray-100 text-gray-600",
    label: "Info",
  },
};

// ── Relative time helper ──────────────────────────────────────────────────────
function timeAgo(isoStr) {
  const normalized =
    isoStr && !isoStr.endsWith("Z") && !isoStr.match(/[+-]\d{2}:\d{2}$/)
      ? isoStr + "Z"
      : isoStr;
  const diff = Math.floor((Date.now() - new Date(normalized)) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  return new Date(normalized).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Bell size={28} className="text-gray-400" strokeWidth={1.5} />
      </div>
      <p className="text-sm font-semibold text-gray-600 mb-1">
        No notification yet
      </p>
      <p className="text-xs text-gray-400">
        Your team's latest activities will appear here.
      </p>
    </div>
  );
}

// ── Single notification item ──────────────────────────────────────────────────
function NotifItem({ notif, onRead, onDelete, onNavigate }) {
  const cfg = TYPE_CFG[notif.type] || TYPE_CFG.general;
  const { Icon } = cfg;

  const handleClick = () => {
    if (!notif.is_read) onRead(notif.id);
    if (notif.link) onNavigate(notif.link);
  };

  return (
    <div
      onClick={handleClick}
      className={`group relative flex gap-3 px-4 py-3 transition-colors cursor-pointer
        ${
          notif.is_read
            ? "bg-white hover:bg-gray-50"
            : "bg-blue-50/60 hover:bg-blue-50 border-l-2 border-[#0B3D91]"
        }`}
    >
      {/* Icon */}
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.color}`}
      >
        <Icon size={16} strokeWidth={2} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-8">
        <div className="flex items-start justify-between gap-2">
          <p
            className={`text-xs font-semibold leading-snug line-clamp-2
            ${notif.is_read ? "text-gray-700" : "text-gray-900"}`}
          >
            {notif.title}
          </p>
          {!notif.is_read && (
            <span className="w-2 h-2 bg-[#0B3D91] rounded-full flex-shrink-0 mt-1" />
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5 leading-snug line-clamp-2">
          {notif.message}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cfg.color}`}
          >
            {cfg.label}
          </span>
          {notif.actor_name && (
            <span className="text-[10px] text-gray-400">
              by {notif.actor_name}
            </span>
          )}
          <span className="text-[10px] text-gray-400 ml-auto">
            {timeAgo(notif.created_at)}
          </span>
        </div>
      </div>

      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(notif.id);
        }}
        className="absolute right-3 top-3 w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-100
          text-gray-400 hover:text-red-500 flex items-center justify-center
          opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
      >
        <X size={12} strokeWidth={2.5} />
      </button>
    </div>
  );
}

// ── Notification Content (shared between mobile & desktop) ───────────────────
function NotifContent({
  notifs,
  unread,
  loading,
  tab,
  setTab,
  displayed,
  handleMarkAllRead,
  handleClearRead,
  handleRead,
  handleDelete,
  handleNavigate,
}) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-black text-gray-900">Notification</h3>
          {unread > 0 && (
            <span className="text-[10px] font-bold bg-[#0B3D91] text-white px-2 py-0.5 rounded-full">
              {unread} new
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unread > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 text-[11px] text-[#0B3D91] font-semibold hover:underline px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <CheckCheck size={12} strokeWidth={2.5} />
              Mark all read
            </button>
          )}
          <button
            onClick={handleClearRead}
            className="flex items-center gap-1 text-[11px] text-gray-400 font-semibold hover:text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Trash2 size={11} strokeWidth={2} />
            Clean
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 py-2 border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
        {[
          ["all", "All"],
          ["unread", "Unread"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
              ${
                tab === key
                  ? "bg-white text-[#0B3D91] shadow-sm border border-gray-200"
                  : "text-gray-500 hover:text-gray-700"
              }`}
          >
            {label}
            {key === "unread" && unread > 0 && (
              <span className="ml-1.5 bg-red-100 text-red-600 text-[10px] font-bold px-1.5 rounded-full">
                {unread}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-6 h-6 border-2 border-[#0B3D91]/30 border-t-[#0B3D91] rounded-full animate-spin" />
          </div>
        ) : displayed.length === 0 ? (
          <EmptyState />
        ) : (
          displayed.map((n) => (
            <NotifItem
              key={n.id}
              notif={n}
              onRead={handleRead}
              onDelete={handleDelete}
              onNavigate={handleNavigate}
            />
          ))
        )}
      </div>

      {/* Footer */}
      {notifs.length > 0 && (
        <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50 flex-shrink-0">
          <p className="text-[11px] text-gray-400 text-center">
            Showing {displayed.length} latest notifications
          </p>
        </div>
      )}
    </>
  );
}

// ── Main NotificationPanel ────────────────────────────────────────────────────
export default function NotificationPanel() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("all");
  const [isMobile, setIsMobile] = useState(false);
  const panelRef = useRef(null);
  const pollRef = useRef(null);

  // ── Detect mobile ─────────────────────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Fetch notifications ───────────────────────────────────────────────────
  const fetchNotifs = useCallback(async () => {
    try {
      const r = await API.get("/notification/list?limit=40");
      setNotifs(r.data.notifications || []);
      setUnread(r.data.unread_count || 0);
    } catch {}
  }, []);

  // ── Poll unread count setiap 30 detik ─────────────────────────────────────
  const pollUnread = useCallback(async () => {
    try {
      const r = await API.get("/notification/unread-count");
      setUnread(r.data.unread_count || 0);
    } catch {}
  }, []);

  useEffect(() => {
    pollUnread();
    pollRef.current = setInterval(pollUnread, 30000);
    return () => clearInterval(pollRef.current);
  }, [pollUnread]);

  // Fetch full list saat panel dibuka
  useEffect(() => {
    if (open) {
      setLoading(true);
      fetchNotifs().finally(() => setLoading(false));
    }
  }, [open, fetchNotifs]);

  // ── Lock body scroll saat mobile sheet terbuka ────────────────────────────
  useEffect(() => {
    if (isMobile && open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobile, open]);

  // ── Close on outside click (desktop only) ─────────────────────────────────
  useEffect(() => {
    if (isMobile) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target))
        setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, isMobile]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleRead = async (id) => {
    try {
      await API.put(`/notification/read/${id}`);
      setNotifs((p) => p.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnread((p) => Math.max(0, p - 1));
    } catch {}
  };

  const handleDelete = async (id) => {
    const notif = notifs.find((n) => n.id === id);
    try {
      await API.delete(`/notification/delete/${id}`);
      setNotifs((p) => p.filter((n) => n.id !== id));
      if (notif && !notif.is_read) setUnread((p) => Math.max(0, p - 1));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await API.put("/notification/read-all");
      setNotifs((p) => p.map((n) => ({ ...n, is_read: true })));
      setUnread(0);
    } catch {}
  };

  const handleClearRead = async () => {
    try {
      await API.delete("/notification/clear-read");
      setNotifs((p) => p.filter((n) => !n.is_read));
    } catch {}
  };

  const handleNavigate = (link) => {
    setOpen(false);
    navigate(link);
  };

  const displayed =
    tab === "unread" ? notifs.filter((n) => !n.is_read) : notifs;

  const contentProps = {
    notifs,
    unread,
    loading,
    tab,
    setTab,
    displayed,
    handleMarkAllRead,
    handleClearRead,
    handleRead,
    handleDelete,
    handleNavigate,
  };

  return (
    <>
      {/* ── Bell Button ────────────────────────────────────────────────────── */}
      <div className="relative" ref={panelRef}>
        <button
          onClick={() => setOpen((o) => !o)}
          className={`relative w-9 h-9 flex items-center justify-center rounded-xl border transition-all
            ${
              open
                ? "bg-[#0B3D91] text-white border-[#0B3D91]"
                : "bg-white text-gray-500 border-gray-200 hover:border-[#0B3D91]/40 hover:text-[#0B3D91]"
            }`}
        >
          <Bell size={16} strokeWidth={2} />
          {unread > 0 && (
            <span
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1
              bg-red-500 text-white text-[10px] font-black rounded-full
              flex items-center justify-center leading-none shadow-sm"
            >
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>

        {/* ── DESKTOP: Dropdown ──────────────────────────────────────────── */}
        {!isMobile && open && (
          <div
            className="absolute right-0 top-full mt-2 w-[360px]
            bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden
            flex flex-col max-h-[calc(100vh-80px)]"
          >
            <NotifContent {...contentProps} />
          </div>
        )}
      </div>

      {/* ── MOBILE: Full-screen Bottom Sheet ─────────────────────────────── */}
      {isMobile && (
        <>
          {/* Backdrop */}
          {open && (
            <div
              className="fixed inset-0 bg-black/40 z-40 transition-opacity"
              onClick={() => setOpen(false)}
            />
          )}

          {/* Sheet */}
          <div
            className={`fixed left-0 right-0 bottom-0 z-50 bg-white flex flex-col
              rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out
              ${open ? "translate-y-0" : "translate-y-full"}`}
            style={{ maxHeight: "85vh" }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            <NotifContent {...contentProps} />
          </div>
        </>
      )}
    </>
  );
}