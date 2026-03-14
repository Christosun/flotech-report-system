import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

const navGroups = [
  {
    label: "Overview",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: "▦", exact: true },
    ]
  },
  {
    label: "Operations",
    items: [
      { to: "/quotations",      label: "Quotations",           icon: "📄" },
      { to: "/reports",         label: "Official Reports",     icon: "📋", exclude: ["/reports/create"] },
      { to: "/reports/create",  label: "New Official Report",  icon: "✏️", exact: true },
      { to: "/onsite",          label: "Onsite Reports",       icon: "🔧" },
    ]
  },
  {
    label: "Documents",
    items: [
      { to: "/surat",       label: "Material Handover",                      icon: "📜", exact: true, matchPaths: ["/surat", "/surat/create", "/surat/"] },
      { to: "/surat-resmi", label: "Letter of Recommendation & Statement",   icon: "📋" },
    ]
  },
  {
    label: "Inventory",
    items: [
      { to: "/stock",   label: "Stock & Demo Units",  icon: "📦" },
      { to: "/catalog", label: "Catalogs & Manuals",  icon: "📚" },
    ]
  },
  {
    label: "People",
    items: [
      { to: "/engineers", label: "Engineers",        icon: "👷" },
      { to: "/leave",     label: "Leave Management", icon: "🏖️" },
      { to: "/users",     label: "User Management",  icon: "👥", adminOnly: true },
    ]
  }
];

function readPrefs() {
  try { return JSON.parse(localStorage.getItem("user_prefs") || "{}"); } catch { return {}; }
}

export default function Sidebar({ open, onClose }) {
  const location = useLocation();

  // ← Listen to prefs-updated event so compact mode applies without reload
  const [compact, setCompact] = useState(() => !!readPrefs().compact_sidebar);

  useEffect(() => {
    const handler = () => setCompact(!!readPrefs().compact_sidebar);
    window.addEventListener("prefs-updated", handler);
    return () => window.removeEventListener("prefs-updated", handler);
  }, []);

  const isActive = (item) => {
    const path = location.pathname;
    if (item.matchPaths) {
      return item.matchPaths.some(mp => path === mp || (mp.endsWith("/") && path.startsWith(mp)));
    }
    if (item.exact) return path === item.to;
    if (!path.startsWith(item.to)) return false;
    const nextChar = path[item.to.length];
    if (nextChar !== undefined && nextChar !== "/") return false;
    if (item.exclude && item.exclude.includes(path)) return false;
    return true;
  };

  // Width: 64px (icon only) vs 256px (full)
  const sidebarW = compact ? "w-16" : "w-64";

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-20 lg:hidden" onClick={onClose} />
      )}

      <aside className={`
        fixed top-0 left-0 h-full z-30 flex flex-col
        bg-[#0a1628] text-white
        transform transition-all duration-300 ease-in-out
        ${sidebarW}
        ${open ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0 lg:relative lg:z-auto
      `}>

        {/* Logo area */}
        <div className={`border-b border-white border-opacity-10 flex items-center min-h-[72px] transition-all duration-300 ${compact ? "justify-center px-2" : "justify-start px-5 py-5"}`}>
          {compact ? (
            /* Compact: show small F icon */
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-white font-black text-base">F</span>
            </div>
          ) : (
            /* Full: show logo */
            <>
              <img
                src="/logo.png"
                alt="Flotech"
                className="h-12 w-auto object-contain"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextElementSibling.style.display = "flex";
                }}
              />
              <div className="w-10 h-10 bg-blue-600 rounded-xl items-center justify-center" style={{ display: "none" }}>
                <span className="text-white font-black text-lg">F</span>
              </div>
            </>
          )}
        </div>

        {/* Navigation */}
        <nav
          className="sidebar-nav flex-1 overflow-y-auto py-4 space-y-5"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#1e3a5f #0a1628" }}
        >
          <style>{`
            .sidebar-nav::-webkit-scrollbar { width: 4px; }
            .sidebar-nav::-webkit-scrollbar-track { background: #0a1628; }
            .sidebar-nav::-webkit-scrollbar-thumb { background: #1e3a5f; border-radius: 4px; }
            .sidebar-nav::-webkit-scrollbar-thumb:hover { background: #2a5298; }
          `}</style>

          {navGroups.map((group) => (
            <div key={group.label}>
              {/* Group label — hidden in compact mode */}
              {!compact && (
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest px-3 mb-2">
                  {group.label}
                </p>
              )}
              {compact && (
                /* Thin separator line instead of label */
                <div className="mx-3 mb-2 h-px bg-white opacity-10" />
              )}

              <div className={`space-y-0.5 ${compact ? "px-2" : "px-3"}`}>
                {group.items
                .filter(item => !item.adminOnly || localStorage.getItem("user_role") === "admin")
                .map((item) => {
                  const active = isActive(item);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={onClose}
                      title={compact ? item.label : undefined}
                      className={`
                        flex items-center rounded-lg transition-all duration-150
                        ${compact ? "justify-center w-10 h-10 mx-auto" : "gap-3 px-3 py-2.5"}
                        text-sm font-medium
                        ${active
                          ? "bg-[#1E5CC6] text-white shadow-lg"
                          : "text-blue-200 hover:bg-white hover:bg-opacity-10 hover:text-white"
                        }
                      `}
                    >
                      <span className={`${compact ? "text-base" : "text-base w-5 text-center"}`}>
                        {item.icon}
                      </span>
                      {!compact && item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User info bottom */}
        <div className={`pt-3 border-t border-white border-opacity-10 ${compact ? "px-2" : "px-3"}`}>
          {compact ? (
            /* Compact: just avatar */
            <div className="flex justify-center py-2 mb-1">
              <div className="w-9 h-9 bg-[#1E5CC6] rounded-full flex items-center justify-center"
                title={localStorage.getItem("user_name") || "User"}>
                <span className="text-white text-xs font-bold">
                  {(localStorage.getItem("user_name") || "U").charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-3 py-2 mb-1">
              <div className="w-8 h-8 bg-[#1E5CC6] rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">
                  {(localStorage.getItem("user_name") || "U").charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {localStorage.getItem("user_name") || "User"}
                </p>
                <p className="text-xs text-blue-400 truncate">PT Flotech Controls Indonesia</p>
              </div>
            </div>
          )}

          {/* Sign out */}
          <button
            onClick={() => { localStorage.clear(); window.location.href = "/"; }}
            title={compact ? "Sign Out" : undefined}
            className={`w-full flex items-center rounded-lg text-sm text-red-400 hover:bg-red-500 hover:bg-opacity-20 hover:text-red-300 transition-all mb-2 ${
              compact ? "justify-center w-10 h-10 mx-auto" : "gap-3 px-3 py-2"
            }`}
          >
            <span>🚪</span>
            {!compact && "Sign Out"}
          </button>
        </div>

        {/* Footer — hidden in compact */}
        {!compact && (
          <div className="px-4 py-3 border-t border-white border-opacity-5">
            <p className="text-[9px] text-white opacity-40 text-center leading-relaxed select-none">
              Developed by PT Flotech Controls Indonesia<br />
              2026 · All Rights Reserved
            </p>
          </div>
        )}
      </aside>
    </>
  );
}