import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { showConfirm } from "../components/CustomDialogContainer";

const TOKEN_KEY = "dev_token";

function devFetch(url: string, opts: RequestInit = {}) {
  const token = localStorage.getItem(TOKEN_KEY) || "";
  return fetch(url, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
}

export default function DevPage() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [loadingData, setLoadingData] = useState(false);

  const [subStart, setSubStart] = useState("");
  const [subEnd, setSubEnd] = useState("");
  const [savingSub, setSavingSub] = useState(false);

  const [newDevEmail, setNewDevEmail] = useState("");
  const [newDevPass, setNewDevPass] = useState("");
  const [savingDevAccount, setSavingDevAccount] = useState(false);

  const [admins, setAdmins] = useState<{ id: string|number; email: string; disabled: boolean; created_at: string }[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPass, setNewAdminPass] = useState("");
  const [adminPassEdits, setAdminPassEdits] = useState<Record<string, string>>({});
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [adminActionLoading, setAdminActionLoading] = useState<Record<string, string>>({});

  const [maintenance, setMaintenance] = useState(false);
  const [togglingMaintenance, setTogglingMaintenance] = useState(false);

  const [stats, setStats] = useState<{ userCount: number; recentLogs: any[] }>({ userCount: 0, recentLogs: [] });
  const [failedLogins, setFailedLogins] = useState<any[]>([]);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showMsg = (type: "success" | "error", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const verifyToken = async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setChecking(false); return; }
    try {
      const res = await devFetch("/api/dev/verify");
      if (res.ok) setAuthed(true);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {}
    setChecking(false);
  };

  useEffect(() => { verifyToken(); }, []);

  useEffect(() => {
    if (!authed) return;
    loadAll();
  }, [authed]);

  const loadAll = async () => {
    setLoadingData(true);
    try {
      const [subRes, statsRes, maintRes, failedRes, adminsRes] = await Promise.all([
        devFetch("/api/dev/subscription"),
        devFetch("/api/dev/stats"),
        devFetch("/api/dev/maintenance"),
        devFetch("/api/dev/failed-logins"),
        devFetch("/api/dev/admins"),
      ]);
      if (subRes.ok) {
        const d = await subRes.json();
        setSubStart(d.start ? d.start.slice(0, 16) : "");
        setSubEnd(d.end ? d.end.slice(0, 16) : "");
      }
      if (statsRes.ok) setStats(await statsRes.json());
      if (maintRes.ok) setMaintenance((await maintRes.json()).enabled);
      if (failedRes.ok) setFailedLogins((await failedRes.json()).items || []);
      if (adminsRes.ok) setAdmins((await adminsRes.json()).admins || []);
    } catch {}
    setLoadingData(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoggingIn(true);
    try {
      // ملاحظة: /api/dev/login لم يعد موجوداً في الخادم — المطور والأدمن يسجّلان الدخول
      // من نفس /api/admin/login، ويُحدَّد الدور حسب البريد المُدخل (isDev في الرد).
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.token && data.isDev) {
        localStorage.setItem(TOKEN_KEY, data.token);
        setAuthed(true);
        setPassword("");
      } else if (res.ok && data.token) {
        // بيانات صحيحة لكن ليست لحساب المطوّر — لا نمنح وصول صفحة المطوّر
        setLoginError("هذا الحساب ليس حساب مطوّر");
      } else {
        setLoginError(data.error || "البريد الإلكتروني أو كلمة المرور غير صحيحة");
      }
    } catch {
      setLoginError("خطأ في الاتصال بالخادم");
    }
    setLoggingIn(false);
  };

  const handleSaveSubscription = async () => {
    if (!subStart || !subEnd) { showMsg("error", "يرجى تحديد تاريخي البدء والانتهاء"); return; }
    setSavingSub(true);
    try {
      const res = await devFetch("/api/dev/subscription", {
        method: "POST",
        body: JSON.stringify({ startDate: new Date(subStart).toISOString(), endDate: new Date(subEnd).toISOString() }),
      });
      const data = await res.json();
      if (res.ok) showMsg("success", "تم حفظ إعدادات الاشتراك");
      else showMsg("error", data.error || "فشل الحفظ");
    } catch {
      showMsg("error", "خطأ في الاتصال بالخادم");
    }
    setSavingSub(false);
  };

  const handleChangeDevAccount = async () => {
    if (!newDevEmail && newDevPass.length < 8) { showMsg("error", "أدخل بريداً صالحاً أو كلمة مرور من 8 أحرف على الأقل"); return; }
    setSavingDevAccount(true);
    try {
      const body: any = {};
      if (newDevEmail) body.newEmail = newDevEmail;
      if (newDevPass) body.newPassword = newDevPass;
      const res = await devFetch("/api/dev/change-password", {
        method: "POST",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) { showMsg("success", "تم تحديث بيانات دخول المطور"); setNewDevEmail(""); setNewDevPass(""); }
      else showMsg("error", data.error || "فشل التغيير");
    } catch {
      showMsg("error", "خطأ في الاتصال بالخادم");
    }
    setSavingDevAccount(false);
  };

  const handleCreateAdmin = async () => {
    if (!newAdminEmail || newAdminPass.length < 8) { showMsg("error", "أدخل بريداً وكلمة مرور من 8 أحرف على الأقل"); return; }
    setCreatingAdmin(true);
    try {
      const res = await devFetch("/api/dev/admins", {
        method: "POST",
        body: JSON.stringify({ email: newAdminEmail, password: newAdminPass }),
      });
      const data = await res.json();
      if (res.ok) { showMsg("success", "تم إنشاء/تعيين حساب الأدمن"); setNewAdminEmail(""); setNewAdminPass(""); await loadAll(); }
      else showMsg("error", data.error || "فشل الإنشاء");
    } catch {
      showMsg("error", "خطأ في الاتصال بالخادم");
    }
    setCreatingAdmin(false);
  };

  const handleChangeAdminAccountPassword = async (id: string | number) => {
    const val = adminPassEdits[String(id)] || "";
    if (val.length < 8) { showMsg("error", "كلمة المرور يجب أن تكون 8 أحرف على الأقل"); return; }
    setAdminActionLoading(p => ({ ...p, [String(id)]: "password" }));
    try {
      const res = await devFetch(`/api/dev/admins/${id}/change-password`, {
        method: "POST",
        body: JSON.stringify({ newPassword: val }),
      });
      const data = await res.json();
      if (res.ok) { showMsg("success", "تم تغيير كلمة مرور الأدمن"); setAdminPassEdits((p: Record<string, string>) => ({ ...p, [String(id)]: "" })); }
      else showMsg("error", data.error || "فشل التغيير");
    } catch {
      showMsg("error", "خطأ في الاتصال بالخادم");
    }
    setAdminActionLoading(p => { const n = { ...p }; delete n[String(id)]; return n; });
  };

  const handleToggleAdmin = async (id: string | number, disabled: boolean) => {
    setAdminActionLoading(p => ({ ...p, [String(id)]: "toggle" }));
    try {
      const res = await devFetch(`/api/dev/admins/${id}/toggle`, {
        method: "POST",
        body: JSON.stringify({ disabled }),
      });
      if (res.ok) { showMsg("success", disabled ? "تم تعطيل الحساب" : "تم تفعيل الحساب"); await loadAll(); }
      else showMsg("error", "فشل التحديث");
    } catch {
      showMsg("error", "خطأ في الاتصال بالخادم");
    }
    setAdminActionLoading(p => { const n = { ...p }; delete n[String(id)]; return n; });
  };

  const handleDeleteAdmin = async (id: string | number) => {
    showConfirm("هل أنت متأكد من حذف هذا الحساب نهائياً؟", "حذف الحساب", async () => {
      setAdminActionLoading(p => ({ ...p, [String(id)]: "delete" }));
      try {
        const res = await devFetch(`/api/dev/admins/${id}`, { method: "DELETE" });
        if (res.ok) { showMsg("success", "تم حذف الحساب"); await loadAll(); }
        else showMsg("error", "فشل الحذف");
      } catch {
        showMsg("error", "خطأ في الاتصال بالخادم");
      }
      setAdminActionLoading(p => { const n = { ...p }; delete n[String(id)]; return n; });
    }, true);
  };

  const handleToggleMaintenance = async () => {
    const next = !maintenance;
    setTogglingMaintenance(true);
    try {
      const res = await devFetch("/api/dev/maintenance", {
        method: "POST",
        body: JSON.stringify({ enabled: next }),
      });
      if (res.ok) { setMaintenance(next); showMsg("success", next ? "تم تفعيل وضع الصيانة" : "تم تعطيل وضع الصيانة"); }
      else showMsg("error", "فشل التحديث");
    } catch {
      showMsg("error", "خطأ في الاتصال بالخادم");
    }
    setTogglingMaintenance(false);
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setAuthed(false);
  };

  if (checking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-gray-900 text-white">
        <Loader2 size={28} className="animate-spin" />
        جارِ التحقق...
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4" dir="rtl">
        <form onSubmit={handleLogin} className="bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-sm border border-gray-700">
          <h1 className="text-white text-xl font-bold mb-6 text-center">🔒 صفحة المطور</h1>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="بريد المطور الإلكتروني"
            className="w-full px-4 py-3 rounded-lg bg-gray-900 text-white border border-gray-600 focus:outline-none focus:border-red-500 mb-4"
            autoFocus
            autoComplete="username"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="كلمة سر المطور"
            className="w-full px-4 py-3 rounded-lg bg-gray-900 text-white border border-gray-600 focus:outline-none focus:border-red-500 mb-4"
            autoComplete="current-password"
          />
          {loginError && <div className="text-red-400 text-sm mb-4 text-center">{loginError}</div>}
          <button type="submit" disabled={loggingIn} className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2">
            {loggingIn && <Loader2 size={16} className="animate-spin" />}
            {loggingIn ? "جارِ الدخول..." : "دخول"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6" dir="rtl">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">🛠️ لوحة المطور</h1>
          <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white">تسجيل خروج</button>
        </div>

        {msg && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-bold ${msg.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
            {msg.text}
          </div>
        )}

        {/* Subscription */}
        <section className="bg-gray-800 rounded-2xl p-5 mb-5 border border-gray-700">
          <h2 className="font-bold text-lg mb-4">📅 إدارة اشتراك الأدمن</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-sm text-gray-400 block mb-1">تاريخ البدء</label>
              <input type="datetime-local" value={subStart} onChange={e => setSubStart(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 text-white" />
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">تاريخ الانتهاء</label>
              <input type="datetime-local" value={subEnd} onChange={e => setSubEnd(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 text-white" />
            </div>
          </div>
          <button onClick={handleSaveSubscription} disabled={savingSub}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-2">
            {savingSub && <Loader2 size={14} className="animate-spin" />}
            {savingSub ? "جارِ الحفظ..." : "حفظ الاشتراك"}
          </button>
        </section>

        {/* Dev account */}
        <section className="bg-gray-800 rounded-2xl p-5 mb-5 border border-gray-700">
          <h2 className="font-bold text-lg mb-4">🔑 بيانات دخول المطور</h2>
          <div className="mb-3">
            <label className="text-sm text-gray-400 block mb-1">بريد إلكتروني جديد (اختياري)</label>
            <input type="email" value={newDevEmail} onChange={e => setNewDevEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 text-white" />
          </div>
          <div className="mb-3">
            <label className="text-sm text-gray-400 block mb-1">كلمة مرور جديدة (اختياري)</label>
            <input type="password" value={newDevPass} onChange={e => setNewDevPass(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 text-white" />
          </div>
          <button onClick={handleChangeDevAccount} disabled={savingDevAccount} className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-2">
            {savingDevAccount && <Loader2 size={14} className="animate-spin" />}
            {savingDevAccount ? "جارِ الحفظ..." : "حفظ التغييرات"}
          </button>
        </section>

        {/* Admin accounts management */}
        <section className="bg-gray-800 rounded-2xl p-5 mb-5 border border-gray-700">
          <h2 className="font-bold text-lg mb-4">👤 إدارة حسابات الأدمن</h2>

          <div className="bg-gray-900 rounded-lg p-4 mb-4 border border-gray-700">
            <p className="text-sm text-gray-400 mb-2">إنشاء / تعيين حساب أدمن جديد</p>
            <input type="email" placeholder="بريد الأدمن الإلكتروني" value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)}
              className="w-full mb-2 px-3 py-2 rounded-lg bg-gray-950 border border-gray-600 text-white" />
            <input type="password" placeholder="كلمة المرور" value={newAdminPass} onChange={e => setNewAdminPass(e.target.value)}
              className="w-full mb-2 px-3 py-2 rounded-lg bg-gray-950 border border-gray-600 text-white" />
            <button onClick={handleCreateAdmin} disabled={creatingAdmin} className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-2">
              {creatingAdmin && <Loader2 size={14} className="animate-spin" />}
              {creatingAdmin ? "جارِ الإنشاء..." : "إنشاء / تعيين"}
            </button>
          </div>

          <div className="space-y-3">
            {loadingData && admins.length === 0 && (
              <div className="flex items-center justify-center gap-2 text-gray-400 text-sm py-4">
                <Loader2 size={16} className="animate-spin" /> جارِ التحميل...
              </div>
            )}
            {!loadingData && admins.length === 0 && <div className="text-gray-500 text-sm">لا توجد حسابات أدمن بعد</div>}
            {admins.map(a => {
              const busy = adminActionLoading[String(a.id)];
              return (
                <div key={a.id} className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold">{a.email}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${a.disabled ? "bg-red-600" : "bg-green-600"}`}>
                      {a.disabled ? "معطّل" : "مفعّل"}
                    </span>
                  </div>
                  <div className="flex gap-2 mb-2">
                    <input type="password" placeholder="كلمة مرور جديدة" value={adminPassEdits[String(a.id)] || ""}
                      onChange={e => setAdminPassEdits(p => ({ ...p, [String(a.id)]: e.target.value }))}
                      disabled={!!busy}
                      className="flex-1 px-3 py-2 rounded-lg bg-gray-950 border border-gray-600 text-white text-sm disabled:opacity-50" />
                    <button onClick={() => handleChangeAdminAccountPassword(a.id)} disabled={!!busy}
                      className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold px-3 py-2 rounded-lg text-xs shrink-0 flex items-center gap-1">
                      {busy === "password" && <Loader2 size={12} className="animate-spin" />}
                      تغيير
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleToggleAdmin(a.id, !a.disabled)} disabled={!!busy}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1 ${a.disabled ? "bg-green-600 hover:bg-green-700" : "bg-yellow-600 hover:bg-yellow-700"}`}>
                      {busy === "toggle" && <Loader2 size={12} className="animate-spin" />}
                      {a.disabled ? "تفعيل" : "تعطيل"}
                    </button>
                    <button onClick={() => handleDeleteAdmin(a.id)} disabled={!!busy}
                      className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1">
                      {busy === "delete" && <Loader2 size={12} className="animate-spin" />}
                      حذف نهائي
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Maintenance */}
        <section className="bg-gray-800 rounded-2xl p-5 mb-5 border border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg">🚧 وضع الصيانة</h2>
            <p className="text-sm text-gray-400">{maintenance ? "مفعّل حالياً" : "معطّل حالياً"}</p>
          </div>
          <button onClick={handleToggleMaintenance} disabled={togglingMaintenance}
            className={`px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-50 flex items-center gap-2 ${maintenance ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}>
            {togglingMaintenance && <Loader2 size={14} className="animate-spin" />}
            {maintenance ? "تعطيل" : "تفعيل"}
          </button>
        </section>

        {/* Stats */}
        <section className="bg-gray-800 rounded-2xl p-5 mb-5 border border-gray-700">
          <h2 className="font-bold text-lg mb-4">📊 إحصائيات سريعة</h2>
          <div className="text-sm text-gray-300 mb-4">عدد المستخدمين المسجلين: <span className="font-bold text-white">{stats.userCount}</span></div>
          <h3 className="font-bold text-sm text-gray-400 mb-2">آخر العمليات</h3>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {loadingData && stats.recentLogs.length === 0 && (
              <div className="flex items-center justify-center gap-2 text-gray-400 text-sm py-4">
                <Loader2 size={16} className="animate-spin" /> جارِ التحميل...
              </div>
            )}
            {!loadingData && stats.recentLogs.length === 0 && <div className="text-gray-500 text-sm">لا يوجد سجل</div>}
            {stats.recentLogs.map((log: any, i: number) => (
              <div key={i} className="text-xs bg-gray-900 rounded-lg px-3 py-2 flex justify-between">
                <span>{log.details || log.action_type}</span>
                <span className="text-gray-500">{log.created_at ? new Date(log.created_at).toLocaleString("ar") : ""}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Failed logins */}
        <section className="bg-gray-800 rounded-2xl p-5 mb-5 border border-gray-700">
          <h2 className="font-bold text-lg mb-4">🚨 محاولات الدخول الفاشلة</h2>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {failedLogins.length === 0 && <div className="text-gray-500 text-sm">لا توجد محاولات فاشلة</div>}
            {failedLogins.map((log: any, i: number) => (
              <div key={i} className="text-xs bg-gray-900 rounded-lg px-3 py-2 flex justify-between">
                <span>{log.details || log.action_type}</span>
                <span className="text-gray-500">{log.created_at ? new Date(log.created_at).toLocaleString("ar") : ""}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
