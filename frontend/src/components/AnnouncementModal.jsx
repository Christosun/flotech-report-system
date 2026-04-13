// frontend/src/components/AnnouncementModal.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import toast from "react-hot-toast";

export default function AnnouncementModal({ onClose }) {
  const navigate = useNavigate();
  const [users,   setUsers]   = useState([]);
  const [form,    setForm]    = useState({ title: "", message: "", link: "", user_id: "" });
  const [sending, setSending] = useState(false);
  const [step,    setStep]    = useState(1); // 1 = compose, 2 = success
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    API.get("/auth/users").then(r => setUsers(r.data || [])).catch(() => {});
  }, []);

  const handleSend = async () => {
    if (!form.title.trim())   { toast.error("Title is required");   return; }
    if (!form.message.trim()) { toast.error("Message is required"); return; }
    setSending(true);
    try {
      await API.post("/notification/send", {
        title:   form.title.trim(),
        message: form.message.trim(),
        link:    form.link.trim() || undefined,
        user_id: form.user_id ? parseInt(form.user_id) : undefined,
      });
      setStep(2);
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to send");
    } finally {
      setSending(false);
    }
  };


  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden
        animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">

        {step === 1 ? (
          <>
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 11l19-9-9 19-2-8-8-2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-white font-bold text-sm">Quick Announcement</h2>
                  <p className="text-white/70 text-[11px]">Broadcast to team</p>
                </div>
              </div>
              <button onClick={onClose}
                className="w-8 h-8 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-sm transition-colors">
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3.5">
              {/* Target */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                  Send To
                </label>
                <select value={form.user_id} onChange={e => set("user_id", e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                    focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white">
                  <option value="">📢 All users (Broadcast)</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      👤 {u.name} — {u.role}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  value={form.title}
                  onChange={e => set("title", e.target.value)}
                  placeholder="e.g. Team Meeting Reminder"
                  maxLength={200}
                  onKeyDown={e => e.key === "Enter" && form.message && handleSend()}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                    focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                  Message <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={form.message}
                  onChange={e => set("message", e.target.value)}
                  placeholder="Write your message here..."
                  rows={3}
                  maxLength={500}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                    focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white resize-none"
                />
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-[10px] text-gray-400">{form.message.length}/500</p>
                </div>
              </div>

              {/* Link optional */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                  Link <span className="text-gray-400 font-normal normal-case">(optional)</span>
                </label>
                <input
                  value={form.link}
                  onChange={e => set("link", e.target.value)}
                  placeholder="/reports or /quotations"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono
                    focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                />
              </div>

              {/* Preview pill */}
              {form.user_id ? (
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                  <span className="text-sm">👤</span>
                  <p className="text-xs text-blue-700 font-medium">
                    Sending to: <span className="font-bold">
                      {users.find(u => String(u.id) === String(form.user_id))?.name || "..."}
                    </span>
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                  <span className="text-sm">📢</span>
                  <p className="text-xs text-amber-700 font-medium">
                    Will be broadcast to <span className="font-bold">all {users.length} team members</span>
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-5 pb-5 flex gap-2.5">
              <button onClick={onClose}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleSend}
                disabled={sending || !form.title.trim() || !form.message.trim()}
                className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white
                  rounded-xl text-sm font-bold hover:from-amber-600 hover:to-orange-600
                  disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2 transition-all shadow-sm shadow-amber-500/30">
                {sending && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {sending ? "Sending..." : form.user_id ? "📤 Send" : "📢 Broadcast"}
              </button>
            </div>
          </>
        ) : (
          /* ── Success State ── */
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
              ✅
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">
              {form.user_id ? "Notification Sent!" : "Announcement Broadcast!"}
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              {form.user_id
                ? `Successfully sent to ${users.find(u => String(u.id) === String(form.user_id))?.name || "user"}.`
                : `Successfully broadcast to all ${users.length} team members.`
              }
            </p>
            <div className="flex gap-2.5">
              <button onClick={onClose}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50">
                Close
              </button>
              
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
