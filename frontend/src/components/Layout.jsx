import { Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

function readPrefs() {
  try { return JSON.parse(localStorage.getItem("user_prefs") || "{}"); } catch { return {}; }
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Track compact pref so Layout can adjust main content margin
  const [compact, setCompact] = useState(() => !!readPrefs().compact_sidebar);

  useEffect(() => {
    const handler = () => setCompact(!!readPrefs().compact_sidebar);
    window.addEventListener("prefs-updated", handler);
    return () => window.removeEventListener("prefs-updated", handler);
  }, []);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {/* Main area — no extra margin needed, sidebar is in normal flow on desktop */}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}