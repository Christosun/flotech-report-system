import { Link, useLocation } from "react-router-dom";
import { useState } from "react";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: "📊" },
  { to: "/reports", label: "Reports", icon: "📋" },
  { to: "/reports/create", label: "Create Report", icon: "✏️" },
  { to: "/engineers", label: "Engineers", icon: "👷" },
];

export default function Sidebar({ open, onClose }) {
  const location = useLocation();

  return (
    <>
      {/* Overlay for mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full z-30 w-64 bg-gradient-to-b from-primary to-[#0a2d6e] text-white flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:relative lg:z-auto
        `}
      >
        {/* Logo */}
        <div className="px-6 py-8 border-b border-white border-opacity-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
              <span className="text-primary font-black text-lg">F</span>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-widest">FLOTECH</h1>
              <p className="text-xs text-blue-300 font-medium tracking-wider">ENGINEERING</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to ||
              (item.to !== "/dashboard" && location.pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200
                  ${isActive
                    ? "bg-white text-primary shadow-lg"
                    : "text-blue-100 hover:bg-white hover:bg-opacity-10"
                  }
                `}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom logout */}
        <div className="px-4 pb-6">
          <button
            onClick={() => {
              localStorage.removeItem("token");
              window.location.href = "/";
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-300 hover:bg-red-500 hover:bg-opacity-20 transition-all"
          >
            <span>🚪</span> Logout
          </button>
        </div>
      </aside>
    </>
  );
}