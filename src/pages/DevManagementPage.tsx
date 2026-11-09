import { useEffect, useRef, useState, type ReactNode } from "react";
import { showConfirm } from "../components/CustomDialogContainer";

interface DevManagementPageProps {
  adminFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-5 h-5 shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function Card({
  id, icon, title, subtitle, open, onToggle, children,
}: {
  id: string; icon: string; title: string; subtitle?: string;
  open: boolean; onToggle: () => void; children: ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl mb-4 border border-gray-100 shadow-sm overflow-hidden transition-shadow hover:shadow-md">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`panel-${id}`}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-right"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">{icon}</span>
          <div className="min-w-0">
            <h2 className="font-bold text-base text-gray-800 truncate">{title}</h2>
            {subtitle && <p className="text-xs text-gray-400 mt-0.5 truncate">{subtitle}</p>}
          </div>
        </div>
        <ChevronIcon open={open} />
      </button>
      <div
        id={`panel-${id}`}
        className={`grid transition-all duration-300 ease-in-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5 pt-1 border-t border-gray-100">{children}</div>
        </div>
      </div>
    </section>
  );
}

export default function DevManagementPage({ adminFetch }: DevManagementPageProps) {
  const [subStart, setSubStart] = useState("");
  const [subEnd, setSubEnd] = useState("");
  const [savingSub, setSavingSub] = useState(false);

  const [newDevEmail, setNewDevEmail] = useState("");
  const [newDevPass, setNewDevPass] = useState("");
  const [savingDev, setSavingDev] = useState(false);

  const [admins, setAdmins] = useState<{ id: string | number; email: string; disabled: boolean; created_at: string }[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPass, setNewAdminPass] = useState("");
  const [adminPassEdits, setAdminPassEdits] = useState<Record<string, string>>({});
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [busyAdminId, setBusyAdminId] = useState<string | null>(null);

  const [maintenance, setMaintenance] = useState(false);
  const [togglingMaint, setTogglingMaint] = useState(false);

  const [stats, setStats] = useState<{ userCount: number; recentLogs: any[] }>({ userCount: 0, recentLogs: [] });
  const [failedLogins, setFailedLogins] = useState<any[]>([]);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    subscription: false, devAccount: false, admins: false, maintenance: false, stats: false, failedLogins: false,
  });

  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const toggleSection = (key: string) =>
    setOpenSections((p) => ({ ...p, [key]: !p[key] }));

  const showMsg = (type: "success" | "error", text: string) => {
    setMsg({ type, text });
    setTimeout(() => { if (mountedRef.current) setMsg(null); }, 4000);
  };

  const loadAll = async (silent = false) => {
    if (silent) setRefreshing(true);
    try {
      const [subRes, statsRes, maintRes, failedRes, adminsRes] = await Promise.all([
        adminFetch("/api/dev/subscription"),
        adminFetch("/api/dev/stats"),
        adminFetch("/api/dev/maintenance"),
        adminFetch("/api/dev/failed-logins"),
        adminFetch("/api/dev/admins"),
      ]);
      if (!mountedRef.current) return;
      if (subRes.ok) {
        const d = await subRes.json();
        setSubStart(d.start ? d.start.slice(0, 16) : "");
        setSubEnd(d.end ? d.end.slice(0, 16) : "");
      }
      if (statsRes.ok) setStats(await statsRes.json());
      if (maintRes.ok) setMaintenance((await maintRes.json()).enabled);
      if (failedRes.ok) setFailedLogins((await failedRes.json()).items || []);
      if (adminsRes.ok) setAdmins((await adminsRes.json()).admins || []);
    } catch {
      if (!silent) showMsg("error", "تعذّر تحميل بيانات الصفحة");
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  useEffect(() => { loadAll(); }, []);

  const handleSaveSubscription = async () => {
    if (!subStart || !subEnd) { showMsg("error", "يرجى تحديد تاريخي البدء والانتهاء"); return; }
    setSavingSub(true);
    try {
      const res = await adminFetch("/api/dev/subscription", {
        method: "POST",
        body: JSON.stringify({ startDate: new Date(subStart).toISOString(), endDate: new Date(subEnd).toISOString() }),
      });
      const data = await res.json();
      if (res.ok) { showMsg("success", "تم حفظ إعدادات الاشتراك"); await loadAll(true); }
      else showMsg("error", data.error || "فشل الحفظ");
    } catch {
      showMsg("error", "خطأ في الاتصال بالخادم");
    }
    setSavingSub(false);
  };

  const handleChangeDevAccount = async () => {
    if (!newDevEmail && newDevPass.length < 8) { showMsg("error", "أدخل بريداً صالحاً أو كلمة مرور من 8 أحرف على الأقل"); return; }
    setSavingDev(true);
    try {
      const body: any = {};
      if (newDevEmail) body.newEmail = newDevEmail;
      if (newDevPass) body.newPassword = newDevPass;
      const res = await adminFetch("/api/dev/change-password", {
        method: "POST",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) { showMsg("success", "تم تحديث بيانات دخول المطور — سيلزم تسجيل الدخول من جديد بالبيانات الجديدة"); setNewDevEmail(""); setNewDevPass(""); await loadAll(true); }
      else showMsg("error", data.error || "فشل التغيير");
    } catch {
      showMsg("error", "خطأ في الاتصال بالخادم");
    }
    setSavingDev(false);
  };

  const handleCreateAdmin = async () => {
    if (!newAdminEmail || newAdminPass.length < 8) { showMsg("error", "أدخل بريداً وكلمة مرور من 8 أحرف على الأقل"); return; }
    setCreatingAdmin(true);
    try {
      const res = await adminFetch("/api/dev/admins", {
        method: "POST",
        body: JSON.stringify({ email: newAdminEmail, password: newAdminPass }),
      });
      const data = await res.json();
      if (res.ok) { showMsg("success", "تم إنشاء/تعيين حساب الأدمن"); setNewAdminEmail(""); setNewAdminPass(""); await loadAll(true); }
      else showMsg("error", data.error || "فشل الإنشاء");
    } catch {
      showMsg("error", "خطأ في الاتصال بالخادم");
    }
    setCreatingAdmin(false);
  };

  const handleChangeAdminAccountPassword = async (id: string | number) => {
    const val = adminPassEdits[String(id)] || "";
    if (val.length < 8) { showMsg("error", "كلمة المرور يجب أن تكون 8 أحرف على الأقل"); return; }
    setBusyAdminId(String(id));
    try {
      const res = await adminFetch(`/api/dev/admins/${id}/change-password`, {
        method: "POST",
        body: JSON.stringify({ newPassword: val }),
      });
      const data = await res.json();
      if (res.ok) { showMsg("success", "تم تغيير كلمة مرور الأدمن"); setAdminPassEdits((p: Record<string, string>) => ({ ...p, [String(id)]: "" })); await loadAll(true); }
      else showMsg("error", data.error || "فشل التغيير");
    } catch {
      showMsg("error", "خطأ في الاتصال بالخادم");
    }
    setBusyAdminId(null);
  };

  const handleToggleAdmin = async (id: string | number, disabled: boolean) => {
    setBusyAdminId(String(id));
    try {
      const res = await adminFetch(`/api/dev/admins/${id}/toggle`, {
        method: "POST",
        body: JSON.stringify({ disabled }),
      });
      if (res.ok) { showMsg("success", disabled ? "تم تعطيل الحساب" : "تم تفعيل الحساب"); await loadAll(true); }
      else showMsg("error", "فشل التحديث");
    } catch {
      showMsg("error", "خطأ في الاتصال بالخادم");
    }
    setBusyAdminId(null);
  };

  const handleDeleteAdmin = async (id: string | number) => {
    showConfirm("هل أنت متأكد من حذف هذا الحساب نهائياً؟", "حذف الحساب", async () => {
      setBusyAdminId(String(id));
      try {
        const res = await adminFetch(`/api/dev/admins/${id}`, { method: "DELETE" });
        if (res.ok) { showMsg("success", "تم حذف الحساب"); await loadAll(true); }
        else showMsg("error", "فشل الحذف");
      } catch {
        showMsg("error", "خطأ في الاتصال بالخادم");
      }
      setBusyAdminId(null);
    }, true);
  };

  const handleToggleMaintenance = async () => {
    const next = !maintenance;
    setTogglingMaint(true);
    try {
      const res = await adminFetch("/api/dev/maintenance", {
        method: "POST",
        body: JSON.stringify({ enabled: next }),
      });
      if (res.ok) { setMaintenance(next); showMsg("success", next ? "تم تفعيل وضع الصيانة" : "تم تعطيل وضع الصيانة"); await loadAll(true); }
      else showMsg("error", "فشل التحديث");
    } catch {
      showMsg("error", "خطأ في الاتصال بالخادم");
    }
    setTogglingMaint(false);
  };

  if (loading) {
    return (
      <div className="px-4 py-16 text-center text-gray-400 text-sm flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
        جارِ تحميل صفحة المطور...
      </div>
    );
  }

  return (
    <div className="px-4 pb-6" dir="rtl">
      <div className="flex items-center justify-between mb-4 sticky top-0 z-10 bg-gray-50/80 backdrop-blur-sm py-2 -mx-4 px-4">
        <h1 className="font-extrabold text-lg text-gray-900">⚙️ لوحة المطور</h1>
        {refreshing && (
          <span className="text-xs text-gray-400 flex items-center gap-1.5">
            <span className="w-3 h-3 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
            جارِ التحديث...
          </span>
        )}
      </div>

      {msg && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-bold animate-[fadeIn_.2s_ease] ${msg.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {msg.text}
        </div>
      )}

      {/* Subscription */}
      <Card id="subscription" icon="📅" title="إدارة اشتراك الأدمن"
        subtitle={subStart && subEnd ? `${new Date(subStart).toLocaleDateString("ar")} → ${new Date(subEnd).toLocaleDateString("ar")}` : "لم يُحدد بعد"}
        open={openSections.subscription} onToggle={() => toggleSection("subscription")}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-sm text-gray-400 block mb-1">تاريخ البدء</label>
            <input type="datetime-local" value={subStart} onChange={e => setSubStart(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-800" />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">تاريخ الانتهاء</label>
            <input type="datetime-local" value={subEnd} onChange={e => setSubEnd(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-800" />
          </div>
        </div>
        <button onClick={handleSaveSubscription} disabled={savingSub}
          className="bg-gray-800 disabled:opacity-50 hover:bg-gray-900 transition-colors text-white font-bold px-4 py-2 rounded-lg text-sm">
          {savingSub ? "جارِ الحفظ..." : "حفظ الاشتراك"}
        </button>
      </Card>

      {/* Dev account */}
      <Card id="devAccount" icon="🔑" title="بيانات دخول المطور"
        open={openSections.devAccount} onToggle={() => toggleSection("devAccount")}>
        <div className="mb-3">
          <label className="text-sm text-gray-400 block mb-1">بريد إلكتروني جديد (اختياري)</label>
          <input type="email" value={newDevEmail} onChange={e => setNewDevEmail(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-800" />
        </div>
        <div className="mb-3">
          <label className="text-sm text-gray-400 block mb-1">كلمة مرور جديدة (اختياري)</label>
          <input type="password" value={newDevPass} onChange={e => setNewDevPass(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-800" />
        </div>
        <button onClick={handleChangeDevAccount} disabled={savingDev}
          className="bg-purple-600 disabled:opacity-50 hover:bg-purple-700 transition-colors text-white font-bold px-4 py-2 rounded-lg text-sm">
          {savingDev ? "جارِ الحفظ..." : "حفظ التغييرات"}
        </button>
      </Card>

      {/* Admin accounts management */}
      <Card id="admins" icon="👤" title="إدارة حسابات الأدمن" subtitle={`${admins.length} حساب`}
        open={openSections.admins} onToggle={() => toggleSection("admins")}>
        <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-100">
          <p className="text-sm text-gray-500 mb-2">إنشاء / تعيين حساب أدمن جديد</p>
          <input type="email" placeholder="بريد الأدمن الإلكتروني" value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)}
            className="w-full mb-2 px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-800" />
          <input type="password" placeholder="كلمة المرور" value={newAdminPass} onChange={e => setNewAdminPass(e.target.value)}
            className="w-full mb-2 px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-800" />
          <button onClick={handleCreateAdmin} disabled={creatingAdmin}
            className="bg-green-600 disabled:opacity-50 hover:bg-green-700 transition-colors text-white font-bold px-4 py-2 rounded-lg text-sm">
            {creatingAdmin ? "جارِ الإنشاء..." : "إنشاء / تعيين"}
          </button>
        </div>

        <div className="space-y-3">
          {admins.length === 0 && <div className="text-gray-400 text-sm">لا توجد حسابات أدمن بعد</div>}
          {admins.map((a) => {
            const busy = busyAdminId === String(a.id);
            return (
              <div key={a.id} className={`bg-gray-50 rounded-lg p-3 border border-gray-100 transition-opacity ${busy ? "opacity-60" : ""}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-gray-800">{a.email}</span>
                  <span className={`text-xs px-2 py-1 rounded-full text-white ${a.disabled ? "bg-red-500" : "bg-green-600"}`}>
                    {a.disabled ? "معطّل" : "مفعّل"}
                  </span>
                </div>
                <div className="flex gap-2 mb-2">
                  <input type="password" placeholder="كلمة مرور جديدة" value={adminPassEdits[String(a.id)] || ""}
                    onChange={e => setAdminPassEdits(p => ({ ...p, [String(a.id)]: e.target.value }))}
                    className="flex-1 px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-800 text-sm" />
                  <button onClick={() => handleChangeAdminAccountPassword(a.id)} disabled={busy}
                    className="bg-purple-600 disabled:opacity-50 hover:bg-purple-700 transition-colors text-white font-bold px-3 py-2 rounded-lg text-xs shrink-0">تغيير</button>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleToggleAdmin(a.id, !a.disabled)} disabled={busy}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold text-white transition-colors disabled:opacity-50 ${a.disabled ? "bg-green-600 hover:bg-green-700" : "bg-yellow-600 hover:bg-yellow-700"}`}>
                    {a.disabled ? "تفعيل" : "تعطيل"}
                  </button>
                  <button onClick={() => handleDeleteAdmin(a.id)} disabled={busy}
                    className="flex-1 bg-red-600 disabled:opacity-50 hover:bg-red-700 transition-colors text-white px-3 py-2 rounded-lg text-xs font-bold">حذف نهائي</button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Maintenance */}
      <Card id="maintenance" icon="🚧" title="وضع الصيانة" subtitle={maintenance ? "مفعّل حالياً" : "معطّل حالياً"}
        open={openSections.maintenance} onToggle={() => toggleSection("maintenance")}>
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{maintenance ? "الموقع في وضع الصيانة حالياً" : "الموقع يعمل بشكل طبيعي"}</p>
          <button onClick={handleToggleMaintenance} disabled={togglingMaint}
            className={`px-4 py-2 rounded-lg font-bold text-sm text-white transition-colors disabled:opacity-50 ${maintenance ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}>
            {togglingMaint ? "جارِ التحديث..." : maintenance ? "تعطيل" : "تفعيل"}
          </button>
        </div>
      </Card>

      {/* Stats */}
      <Card id="stats" icon="📊" title="إحصائيات سريعة" subtitle={`${stats.userCount} مستخدم`}
        open={openSections.stats} onToggle={() => toggleSection("stats")}>
        <div className="text-sm text-gray-600 mb-4">عدد المستخدمين المسجلين: <span className="font-bold text-gray-900">{stats.userCount}</span></div>
        <h3 className="font-bold text-sm text-gray-400 mb-2">آخر العمليات</h3>
        <div className="max-h-60 overflow-y-auto space-y-1">
          {stats.recentLogs.length === 0 && <div className="text-gray-400 text-sm">لا يوجد سجل</div>}
          {stats.recentLogs.map((log: any, i: number) => (
            <div key={i} className="text-xs bg-gray-50 rounded-lg px-3 py-2 flex justify-between">
              <span className="text-gray-700">{log.details || log.action_type}</span>
              <span className="text-gray-400">{log.created_at ? new Date(log.created_at).toLocaleString("ar") : ""}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Failed logins */}
      <Card id="failedLogins" icon="🚨" title="محاولات الدخول الفاشلة" subtitle={`${failedLogins.length} محاولة`}
        open={openSections.failedLogins} onToggle={() => toggleSection("failedLogins")}>
        <div className="max-h-60 overflow-y-auto space-y-1">
          {failedLogins.length === 0 && <div className="text-gray-400 text-sm">لا توجد محاولات فاشلة</div>}
          {failedLogins.map((log: any, i: number) => (
            <div key={i} className="text-xs bg-gray-50 rounded-lg px-3 py-2 flex justify-between">
              <span className="text-gray-700">{log.details || log.action_type}</span>
              <span className="text-gray-400">{log.created_at ? new Date(log.created_at).toLocaleString("ar") : ""}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
