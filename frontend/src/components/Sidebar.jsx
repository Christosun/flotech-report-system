import { Link, useLocation } from "react-router-dom";
import { useState } from "react";

const navGroups = [
  {
    label: "Overview",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: "▦" },
    ]
  },
  {
    label: "Operations",
    items: [
      { to: "/quotations", label: "Quotations", icon: "📄" },
      { to: "/reports", label: "Field Reports", icon: "📋" },
      { to: "/reports/create", label: "New Report", icon: "✏️" },
    ]
  },
  {
    label: "Inventory",
    items: [
      { to: "/stock", label: "Stock & Demo Units", icon: "📦" },
      { to: "/catalog", label: "Catalogs & Manuals", icon: "📚" },
    ]
  },
  {
    label: "People",
    items: [
      { to: "/engineers", label: "Engineers", icon: "👷" },
    ]
  }
];

export default function Sidebar({ open, onClose }) {
  const location = useLocation();

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-20 lg:hidden" onClick={onClose} />
      )}

      <aside className={`
        fixed top-0 left-0 h-full z-30 w-64 flex flex-col
        bg-[#0a1628] text-white
        transform transition-transform duration-300 ease-in-out
        ${open ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0 lg:relative lg:z-auto
      `}>
        {/* Logo Area */}
        <div className="px-5 py-5 border-b border-white border-opacity-10">
          <div className="flex items-center gap-3">
            {/* Logo image — taruh logo di public/logo.png */}
            <img
              src="/logo.png"
              alt="Flotech Logo"
              className="h-10 w-auto object-contain"
              onError={(e) => {
                // Fallback jika logo tidak ada
                e.target.style.display = "none";
                e.target.nextSibling.style.display = "flex";
              }}
            />
            <div
              className="w-10 h-10 bg-blue-600 rounded-xl items-center justify-center hidden"
              style={{ display: "none" }}
            >
              <span className="text-white font-black text-lg">F</span>
            </div>
            <div>
              <h1 className="text-base font-black tracking-widest text-white leading-tight">FLOTECH</h1>
              <p className="text-[10px] text-blue-400 font-semibold tracking-widest uppercase">Controls Indonesia</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest px-3 mb-2">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = location.pathname === item.to ||
                    (item.to.length > 1 && location.pathname.startsWith(item.to) && item.to !== "/reports/create");
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={onClose}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                        ${isActive
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40"
                          : "text-blue-200 hover:bg-white hover:bg-opacity-10 hover:text-white"
                        }
                      `}
                    >
                      <span className="text-base w-5 text-center">{item.icon}</span>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User & Logout */}
        <div className="px-3 py-4 border-t border-white border-opacity-10">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">
                {(localStorage.getItem("user_name") || "U").charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {localStorage.getItem("user_name") || "User"}
              </p>
              <p className="text-xs text-blue-400">PT Flotech Controls</p>
            </div>
          </div>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.href = "/";
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500 hover:bg-opacity-20 hover:text-red-300 transition-all"
          >
            <span>🚪</span> Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
