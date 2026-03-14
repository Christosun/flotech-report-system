import { Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

function readPrefs() {
  try { return JSON.parse(localStorage.getItem("user_prefs") || "{}"); } catch { return {}; }
}

// ─── Floating Support Button ──────────────────────────────────────────────────
function SupportButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Backdrop — klik di luar untuk tutup */}
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}

      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">

        {/* Popup Card */}
        {open && (
          <div className="mb-1 w-72 bg-[#0a1628] rounded-2xl shadow-2xl border border-white/10
            animate-in fade-in slide-in-from-bottom-3 duration-200 overflow-hidden">

            {/* Header */}
            <div className="px-4 py-3.5 bg-gradient-to-r from-[#0B3D91] to-[#1E5CC6] flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-white">App Support</p>
                <p className="text-[10px] text-blue-200">PT Flotech Controls Indonesia</p>
              </div>
              <button onClick={() => setOpen(false)}
                className="ml-auto w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="px-4 py-4">
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-3">
                Contact Person
              </p>

              {/* Avatar + Name */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0B3D91] to-[#1E5CC6]
                  flex items-center justify-center flex-shrink-0 shadow-lg ring-2 ring-blue-500/30">
                  <span className="text-white text-sm font-black">B</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Billy</p>
                </div>
                {/* Online indicator */}
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-emerald-400 font-medium">Available</span>
                </div>
              </div>

              {/* Contact buttons */}
              <div className="space-y-2">
                <a href="mailto:billy@flotech.co.id"
                  className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl
                    bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20
                    transition-all group">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0
                    group-hover:bg-blue-500/30 transition-colors">
                    <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] text-blue-400 font-semibold uppercase tracking-wide">Email</p>
                    <p className="text-xs text-white/80 group-hover:text-white transition-colors truncate">
                      billy@flotech.co.id
                    </p>
                  </div>
                  <svg className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 transition-colors ml-auto flex-shrink-0"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>

                <a href="https://wa.me/6281229116071" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl
                    bg-white/5 hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/30
                    transition-all group">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0
                    group-hover:bg-emerald-500/30 transition-colors">
                    <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] text-emerald-400 font-semibold uppercase tracking-wide">WhatsApp</p>
                    <p className="text-xs text-white/80 group-hover:text-white transition-colors">
                      +62 812-2911-6071
                    </p>
                  </div>
                  <svg className="w-3.5 h-3.5 text-white/20 group-hover:text-emerald-400/70 transition-colors ml-auto flex-shrink-0"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 bg-white/5 border-t border-white/5">
              <p className="text-[9px] text-white/30 text-center">
                Flotech Management System · 2026
              </p>
            </div>
          </div>
        )}

        {/* FAB Button */}
        <button
          onClick={() => setOpen(o => !o)}
          className={`w-13 h-13 rounded-2xl shadow-xl flex items-center justify-center transition-all duration-300
            hover:scale-110 active:scale-95 group relative
            ${open
              ? "bg-gray-700 shadow-gray-900/50 rotate-0"
              : "bg-gradient-to-br from-[#0B3D91] to-[#1E5CC6] shadow-blue-900/50"
            }`}
          style={{ width: 52, height: 52 }}
          title="App Support"
        >
          {/* Ping ring saat tertutup */}
          {!open && (
            <span className="absolute inset-0 rounded-2xl bg-[#0B3D91] animate-ping opacity-20" />
          )}

          {open ? (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )}
        </button>
      </div>
    </>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────
export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [compact, setCompact] = useState(() => !!readPrefs().compact_sidebar);

  useEffect(() => {
    const handler = () => setCompact(!!readPrefs().compact_sidebar);
    window.addEventListener("prefs-updated", handler);
    return () => window.removeEventListener("prefs-updated", handler);
  }, []);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      {/* Floating Support Button — muncul di semua halaman */}
      <SupportButton />
    </div>
  );
}