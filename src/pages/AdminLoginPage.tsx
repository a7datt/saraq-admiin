import { useState } from "react";
import { Lock, Loader2 } from "lucide-react";
import { AdminLoginViewProps } from "../types";
import { showToast } from "../components/ToastContainer";
import { saveAdminSession } from "../utils/permissions";

const AdminLoginPage = ({ setIsAdmin, setAdminAuth, setView }: AdminLoginViewProps) => {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pass })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          localStorage.setItem("adminToken", data.token);
          try {
            const b64 = data.token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
            const payload = JSON.parse(atob(b64));
            localStorage.setItem("adminEmail", payload?.email || email.trim().toLowerCase());
          } catch {
            localStorage.setItem("adminEmail", email.trim().toLowerCase());
          }
        }
        const role = data.role || (data.isDev ? "dev" : "admin");
        saveAdminSession(role, data.permissions || {}, data.name || "");
        setIsAdmin(true);
        setAdminAuth(true);
        setView({ type: "main" });
      } else {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          showToast(data.error || "كلمة مرور خاطئة", 'error');
        } else {
          showToast("كلمة مرور خاطئة", 'error');
        }
      }
    } catch (e: any) {
      if (e.name === 'TypeError' && e.message === 'Failed to fetch') {
        showToast("فشل الاتصال بالسيرفر (تأكد من اتصالك بالإنترنت)", 'error');
      } else {
        showToast("فشل الاتصال بالسيرفر", 'error');
      }
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="px-6 flex flex-col items-center justify-center min-h-[70vh] space-y-8">
      <div className="w-20 h-20 bg-gray-800 rounded-lg flex items-center justify-center text-white shadow-xl shadow-gray-100">
        <Lock size={40} />
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-800">دخول المسؤول</h2>
        <p className="text-gray-400 text-sm">يرجى إدخال البريد الإلكتروني وكلمة المرور للوصول للوحة التحكم</p>
      </div>
      <div className="w-full space-y-4">
        <input
          type="email"
          placeholder="البريد الإلكتروني"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-white border border-gray-100 rounded-lg px-6 py-4 text-center text-lg outline-none focus:border-gray-800 shadow-sm"
          autoComplete="username"
        />
        <input 
          type="password" 
          placeholder="كلمة المرور" 
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          className="w-full bg-white border border-gray-100 rounded-lg px-6 py-4 text-center text-lg outline-none focus:border-gray-800 shadow-sm"
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          autoComplete="current-password"
        />
        <button 
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-gray-800 text-white py-4 rounded-lg font-bold shadow-lg shadow-gray-100 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 size={18} className="animate-spin" />}
          {loading ? "جاري التحقق..." : "دخول"}
        </button>
        <button 
          onClick={() => setView({ type: "main" })}
          className="w-full text-gray-400 font-bold text-sm"
        >
          عودة للمتجر
        </button>
      </div>
    </div>
  );
};

export default AdminLoginPage;
