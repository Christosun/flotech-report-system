import { useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [showPass, setShowPass] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!username || !password) {
      setError("Username dan password harus diisi");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await API.post("/auth/login", {
        username: username.trim().toLowerCase(),
        password,
      });
      localStorage.setItem("token",     res.data.access_token);
      localStorage.setItem("user_name", res.data.name     || res.data.username || "User");
      localStorage.setItem("user_role", res.data.role     || "engineer");
      localStorage.setItem("user_id",   String(res.data.id || ""));
      navigate("/dashboard");
    } catch {
      setError("Username atau password salah");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center
      bg-gradient-to-br from-[#0a1628] via-[#0d2347] to-[#0B3D91] px-4">

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 sm:p-10">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.png" alt="Flotech Logo"
            className="h-16 w-auto object-contain mb-3"
            onError={e => {
              e.target.style.display = "none";
              e.target.nextElementSibling.style.display = "flex";
            }} />
          <div className="w-16 h-16 bg-[#0B3D91] rounded-2xl items-center justify-center mb-3"
            style={{ display: "none" }}>
            <span className="text-white font-black text-2xl">F</span>
          </div>
          <p className="text-xs text-gray-400 tracking-widest uppercase font-semibold mt-1">
            Service Management System
          </p>
        </div>

        <h2 className="text-base font-bold text-gray-600 mb-6 text-center">
          Sign in to your account
        </h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm
            px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Username */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
              Username
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
              </span>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Masukkan username"
                autoComplete="username"
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm
                  focus:outline-none focus:ring-2 focus:ring-[#0B3D91] focus:border-transparent
                  bg-gray-50 transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
              Password
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
              </span>
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Masukkan password"
                autoComplete="current-password"
                className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm
                  focus:outline-none focus:ring-2 focus:ring-[#0B3D91] focus:border-transparent
                  bg-gray-50 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPass(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400
                  hover:text-gray-600 transition-colors">
                {showPass ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21"/>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-[#0B3D91] to-[#1E5CC6] text-white
              rounded-xl font-bold text-sm hover:from-[#0d47a8] hover:to-[#2563eb]
              disabled:opacity-60 transition-all shadow-lg shadow-blue-900/30
              flex items-center justify-center gap-2 mt-2">
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                Signing in...
              </>
            ) : (
              "Sign In →"
            )}
          </button>
        </div>
      </div>
      <p className="mt-6 text-[11px] text-blue-100 text-center opacity-60 select-none">
        Developed by PT Flotech Controls Indonesia &nbsp;·&nbsp; 2026 &nbsp;·&nbsp; All Rights Reserved
      </p>
    </div>
  );
}