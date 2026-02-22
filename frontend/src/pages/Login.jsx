import { useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email || !password) { setError("Email dan password harus diisi"); return; }
    setLoading(true); setError("");
    try {
      const res = await API.post("/auth/login", { email, password });
      localStorage.setItem("token", res.data.access_token);
      localStorage.setItem("user_name", res.data.name || "User");
      navigate("/dashboard");
    } catch { setError("Email atau password salah"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0a1628] via-[#0d2347] to-[#0B3D91] px-4">
      {/* Card */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 sm:p-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img
            src="/logo.png"
            alt="Flotech Logo"
            className="h-16 w-auto object-contain mb-3"
            onError={(e) => {
              e.target.style.display = "none";
              e.target.nextElementSibling.style.display = "flex";
            }}
          />
          <div className="w-16 h-16 bg-[#0B3D91] rounded-2xl items-center justify-center mb-3" style={{display:"none"}}>
            <span className="text-white font-black text-2xl">F</span>
          </div>
          <p className="text-xs text-gray-400 tracking-widest uppercase font-semibold mt-1">Service Management System</p>
        </div>

        <h2 className="text-base font-bold text-gray-600 mb-6 text-center">Sign in to your account</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
            <input type="email" placeholder="email@flotech.co.id" value={email}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] transition-all"
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Password</label>
            <input type="password" placeholder="••••••••" value={password}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D91] transition-all"
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
          </div>
        </div>

        <button onClick={handleLogin} disabled={loading}
          className="mt-6 w-full bg-[#0B3D91] text-white py-3 rounded-xl font-bold hover:bg-[#1E5CC6] transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-sm">
          {loading
            ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Signing in...</>
            : "Sign In"}
        </button>
      </div>

      {/* Footer */}
      <p className="mt-6 text-[11px] text-blue-100 text-center opacity-60 select-none">
        Developed by PT Flotech Controls Indonesia &nbsp;·&nbsp; 2026 &nbsp;·&nbsp; All Rights Reserved
      </p>
    </div>
  );
}