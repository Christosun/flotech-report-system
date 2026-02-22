import { Link, useLocation } from "react-router-dom";

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
      { to: "/onsite", label: "Onsite Reports", icon: "🔧" },
    ]
  },
  {
    label: "Documents",
    items: [
      { to: "/surat", label: "Serah Terima", icon: "📜" },
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
      {/* Mobile overlay */}
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
        <div className="px-5 py-5 border-b border-white border-opacity-10 flex items-left justify-left min-h-[72px]">
          <img
            src="/logo.png"
            alt="Flotech"
            className="h-10 w-auto object-contain"
            onError={(e) => {
              e.target.style.display = "none";
              e.target.nextElementSibling.style.display = "flex";
            }}
          />
          <div className="w-10 h-10 bg-blue-600 rounded-xl items-center justify-center" style={{display:"none"}}>
            <span className="text-white font-black text-lg">F</span>
          </div>
        </div>

        {/* Navigation */}
        <nav
          className="sidebar-nav flex-1 overflow-y-auto px-3 py-4 space-y-5"
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
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest px-3 mb-2">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive =
                    location.pathname === item.to ||
                    (item.to.length > 1 &&
                      location.pathname.startsWith(item.to) &&
                      item.to !== "/reports/create");
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={onClose}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                        ${isActive
                          ? "bg-[#1E5CC6] text-white shadow-lg"
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

        {/* User info */}
        <div className="px-3 pt-3 border-t border-white border-opacity-10">
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
          <button
            onClick={() => { localStorage.clear(); window.location.href = "/"; }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500 hover:bg-opacity-20 hover:text-red-300 transition-all mb-2"
          >
            <span>🚪</span> Sign Out
          </button>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white border-opacity-5">
          <p className="text-[9px] text-blue-600 text-center leading-relaxed select-none">
            Developed by PT Flotech Controls Indonesia<br />
            2026 · All Rights Reserved
          </p>
        </div>
      </aside>
    </>
  );
}
