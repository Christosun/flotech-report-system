import React from "react"
import { Outlet } from "react-router-dom";
import { useState, useEffect, useRef, useLayoutEffect } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

function readPrefs() {
  try { return JSON.parse(localStorage.getItem("user_prefs") || "{}"); } catch { return {}; }
}

// ─── Draggable Support Button ─────────────────────────────────────────────────
// Ganti fungsi SupportButton di frontend/src/components/Layout.jsx
// Pastikan import: import { useState, useEffect, useRef, useLayoutEffect } from "react";

function SupportButton() {
  const BTN  = 52;   // ukuran tombol px
  const M    = 20;   // margin dari tepi layar
  const GAP  = 8;    // jarak tetap tombol ↔ popup

  // ─── Posisi tombol ─────────────────────────────────────────────────────────
  const initPos = () => {
    try {
      const s = localStorage.getItem("support_btn_pos");
      if (s) return JSON.parse(s);
    } catch {}
    return { x: window.innerWidth - BTN - M, y: window.innerHeight - BTN - M };
  };

  const [pos,      setPos]      = useState(initPos);
  const [open,     setOpen]     = useState(false);
  const [dragging, setDragging] = useState(false);
  const [snapping, setSnapping] = useState(false);
  // posisi popup yang sudah dihitung — null = belum siap
  const [popupStyle, setPopupStyle] = useState(null);

  const posRef   = useRef(pos);
  const dragRef  = useRef(null);
  const movedRef = useRef(false);
  const popupRef = useRef(null);

  useEffect(() => { posRef.current = pos; }, [pos]);

  // ─── Hitung posisi popup setelah DOM popup muncul (tinggi sudah diketahui) ─
  useLayoutEffect(() => {
    if (!open || dragging || !popupRef.current) return;

    const POPUP_W = 288; // w-72
    const POPUP_H = popupRef.current.offsetHeight;
    const { x, y } = posRef.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Horizontal: rata dengan sisi tombol, lalu clamp
    const btnOnLeft = x < vw / 2;
    let left = btnOnLeft ? x : x + BTN - POPUP_W;
    left = Math.max(M, Math.min(vw - POPUP_W - M, left));

    // Vertical: cek ruang bawah vs atas
    const belowY  = y + BTN + GAP;
    const aboveY  = y - GAP - POPUP_H;
    const fitBelow = belowY + POPUP_H <= vh - M;
    const fitAbove = aboveY >= M;

    let top;
    if (fitBelow) {
      top = belowY;
    } else if (fitAbove) {
      top = aboveY;
    } else {
      // tidak cukup di atas maupun bawah → letakkan sedekat mungkin
      top = Math.max(M, Math.min(vh - POPUP_H - M, belowY));
    }

    setPopupStyle({ position: "fixed", left, top, width: POPUP_W, zIndex: 50 });
  }, [open, dragging, pos]);

  // ─── Clamp helpers ─────────────────────────────────────────────────────────
  const clamp = (x, y) => ({
    x: Math.max(M, Math.min(window.innerWidth  - BTN - M, x)),
    y: Math.max(M, Math.min(window.innerHeight - BTN - M, y)),
  });
  const snap = (x, y) => ({
    x: x < window.innerWidth / 2 ? M : window.innerWidth - BTN - M,
    y,
  });
  const save = (p) => { try { localStorage.setItem("support_btn_pos", JSON.stringify(p)); } catch {} };

  // ─── Mouse drag ────────────────────────────────────────────────────────────
  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    movedRef.current = false;
    dragRef.current  = { sx: e.clientX, sy: e.clientY, ox: posRef.current.x, oy: posRef.current.y };
    setDragging(true);

    const onMove = (ev) => {
      const dx = ev.clientX - dragRef.current.sx;
      const dy = ev.clientY - dragRef.current.sy;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) movedRef.current = true;
      setPos(clamp(dragRef.current.ox + dx, dragRef.current.oy + dy));
    };
    const onUp = (ev) => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
      setDragging(false);
      if (movedRef.current) {
        setSnapping(true);
        const raw     = clamp(dragRef.current.ox + ev.clientX - dragRef.current.sx,
                              dragRef.current.oy + ev.clientY - dragRef.current.sy);
        const snapped = snap(raw.x, raw.y);
        setPos(snapped);
        save(snapped);
        setTimeout(() => setSnapping(false), 350);
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
  };

  // ─── Touch drag ────────────────────────────────────────────────────────────
  const onTouchStart = (e) => {
    const t = e.touches[0];
    movedRef.current = false;
    dragRef.current  = { sx: t.clientX, sy: t.clientY, ox: posRef.current.x, oy: posRef.current.y };
    setDragging(true);

    const onMove = (ev) => {
      ev.preventDefault();
      const tc = ev.touches[0];
      const dx = tc.clientX - dragRef.current.sx;
      const dy = tc.clientY - dragRef.current.sy;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) movedRef.current = true;
      setPos(clamp(dragRef.current.ox + dx, dragRef.current.oy + dy));
    };
    const onEnd = (ev) => {
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend",  onEnd);
      setDragging(false);
      if (movedRef.current) {
        setSnapping(true);
        const tc = ev.changedTouches[0];
        const raw     = clamp(dragRef.current.ox + tc.clientX - dragRef.current.sx,
                              dragRef.current.oy + tc.clientY - dragRef.current.sy);
        const snapped = snap(raw.x, raw.y);
        setPos(snapped);
        save(snapped);
        setTimeout(() => setSnapping(false), 350);
      }
    };
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend",  onEnd);
  };

  const handleClick = () => {
    if (movedRef.current) return;
    setPopupStyle(null); // reset posisi setiap kali buka
    setOpen(o => !o);
  };

  // ─── Re-clamp on resize ────────────────────────────────────────────────────
  useEffect(() => {
    const onResize = () => setPos(p => { const c = clamp(p.x, p.y); save(c); return c; });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <>
      {/* Backdrop */}
      {open && !dragging && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}

      {/* ── Popup Card ─────────────────────────────────────────────────────── */}
      {open && !dragging && (
        <div
          ref={popupRef}
          style={popupStyle || { position: "fixed", visibility: "hidden", left: -9999, top: -9999, width: 288, zIndex: 50 }}
          className="bg-[#0a1628] rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
        >
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
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-3">Contact Person</p>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0B3D91] to-[#1E5CC6]
                flex items-center justify-center flex-shrink-0 shadow-lg ring-2 ring-blue-500/30">
                <span className="text-white text-sm font-black">B</span>
              </div>
              <div>
                <p className="text-sm font-bold text-white">Billy</p>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-emerald-400 font-medium">Available</span>
              </div>
            </div>

            <div className="space-y-2">
              <a href="mailto:billy@flotech.co.id"
                className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl
                  bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all group">
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/30 transition-colors">
                  <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] text-blue-400 font-semibold uppercase tracking-wide">Email</p>
                  <p className="text-xs text-white/80 group-hover:text-white transition-colors truncate">billy@flotech.co.id</p>
                </div>
                <svg className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 transition-colors ml-auto flex-shrink-0"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>

              <a href="https://wa.me/6281229116071" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl
                  bg-white/5 hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/30 transition-all group">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500/30 transition-colors">
                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] text-emerald-400 font-semibold uppercase tracking-wide">WhatsApp</p>
                  <p className="text-xs text-white/80 group-hover:text-white transition-colors">+62 812-2911-6071</p>
                </div>
                <svg className="w-3.5 h-3.5 text-white/20 group-hover:text-emerald-400/70 transition-colors ml-auto flex-shrink-0"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 bg-white/5 border-t border-white/5 flex items-center gap-2">
            <svg className="w-3 h-3 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3" />
            </svg>
            <p className="text-[9px] text-white/25">Drag the button to move position</p>
          </div>
        </div>
      )}

      {/* ── FAB Tombol ─────────────────────────────────────────────────────── */}
      <div
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onClick={handleClick}
        style={{
          position:         "fixed",
          left:             pos.x,
          top:              pos.y,
          width:            BTN,
          height:           BTN,
          zIndex:           50,
          cursor:           dragging ? "grabbing" : "grab",
          transition:       snapping
            ? "left 0.3s cubic-bezier(0.34,1.56,0.64,1), top 0.3s cubic-bezier(0.34,1.56,0.64,1)"
            : "none",
          userSelect:       "none",
          touchAction:      "none",
          WebkitUserSelect: "none",
        }}
      >
        {!open && !dragging && (
          <span className="absolute inset-0 rounded-2xl bg-[#0B3D91] animate-ping opacity-20"
            style={{ pointerEvents: "none" }} />
        )}
        <div className={`w-full h-full rounded-2xl flex items-center justify-center shadow-xl transition-all duration-200
          ${dragging
            ? "bg-gray-700 scale-110 shadow-2xl"
            : open
              ? "bg-gray-700"
              : "bg-gradient-to-br from-[#0B3D91] to-[#1E5CC6] hover:scale-110 active:scale-95"
          }`}>
          {dragging ? (
            <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3" />
            </svg>
          ) : open ? (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )}
        </div>
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