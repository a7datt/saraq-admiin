import React, { useEffect, useState, useCallback } from "react";
import { ArrowRight, MonitorSmartphone, ScrollText, LogOut, ShieldCheck, RefreshCw, Search } from "lucide-react";
import { showConfirm } from "../components/CustomDialogContainer";

export interface SessionsActivityAdminPageProps {
  adminFetch: (url: string, options?: RequestInit) => Promise<Response>;
  setView: (val: any) => void;
}

interface AdminSession {
  id: number;
  jti: string;
  admin_label: string;
  ip_address: string;
  country: string;
  city: string;
  device: string;
  browser: string;
  last_active_at: string;
  created_at: string;
  is_current_request?: boolean;
}

interface ActivityLog {
  id: number;
  admin_id: string;
  action_type: string;
  target_model: string | null;
  target_id: string | null;
  details: string | null;
  ip_address: string;
  created_at: string;
}

const fmt = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("ar-EG", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
};

// [FIX] كانت خانة "نوع الإجراء" حقل نص حر، والفلترة بالسيرفر كانت تطابق النص بالضبط (eq)
// بينما القيم المخزّنة إنجليزية (مثل admin_login أو admin_password_changed)، فكتابة أي
// كلمة عربية كانت تُرجع دائماً "لا توجد سجلات مطابقة" حتى لو كانت السجلات موجودة فعلاً.
// الحل: قائمة منسدلة بأسماء عربية مرتبطة بالقيم الحقيقية المخزّنة في القاعدة.
const ACTION_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "كل الإجراءات" },
  { value: "admin_login", label: "تسجيل دخول ناجح" },
  { value: "admin_login_failed", label: "محاولة دخول فاشلة" },
  { value: "admin_logout", label: "تسجيل خروج" },
  { value: "admin_password_changed", label: "تغيير كلمة مرور الأدمن" },
  { value: "session_revoked", label: "إبطال جلسة" },
  { value: "settings_updated", label: "تحديث إعداد" },
  { value: "settings_bulk_updated", label: "تحديث مجموعة إعدادات" },
];

export default function SessionsActivityAdminPage({ adminFetch, setView }: SessionsActivityAdminPageProps) {
  const [tab, setTab] = useState<"sessions" | "logs">("sessions");

  // ---- Sessions state ----
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sessionsError, setSessionsError] = useState("");
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    setSessionsError("");
    try {
      const res = await adminFetch("/api/admin/sessions");
      const data = await res.json();
      if (res.ok) setSessions(Array.isArray(data.sessions) ? data.sessions : []);
      else setSessionsError(data.error || "تعذر تحميل الجلسات");
    } catch {
      setSessionsError("خطأ في الاتصال بالخادم");
    } finally {
      setLoadingSessions(false);
    }
  }, [adminFetch]);

  const revokeSession = async (jti: string) => {
    showConfirm("هل تريد تسجيل الخروج من هذا الجهاز؟", "تسجيل الخروج", async () => {
      setRevokingId(jti);
      try {
        const res = await adminFetch(`/api/admin/sessions/${jti}/revoke`, { method: "POST" });
        if (res.ok) setSessions((prev) => prev.filter((s) => s.jti !== jti));
      } finally {
        setRevokingId(null);
      }
    }, true);
  };

  // ---- Logs state ----
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [logsError, setLogsError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 25;
  const [filterAction, setFilterAction] = useState("");
  const [filterAdmin, setFilterAdmin] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const loadLogs = useCallback(async () => {
    setLoadingLogs(true);
    setLogsError("");
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (filterAction) params.set("action_type", filterAction);
      if (filterAdmin) params.set("admin_id", filterAdmin);
      if (filterDate) params.set("date", filterDate);
      const res = await adminFetch(`/api/admin/activity-logs?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setLogs(Array.isArray(data.logs) ? data.logs : []);
        setTotal(data.total || 0);
      } else {
        setLogsError(data.error || "تعذر تحميل السجلات");
      }
    } catch {
      setLogsError("خطأ في الاتصال بالخادم");
    } finally {
      setLoadingLogs(false);
    }
  }, [adminFetch, page, filterAction, filterAdmin, filterDate]);

  useEffect(() => { loadSessions(); }, [loadSessions]);
  useEffect(() => { loadLogs(); }, [loadLogs]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="px-4 space-y-4 pb-20" dir="rtl">
      <div className="flex items-center gap-3 pt-2">
        <button onClick={() => setView({ type: "more" })} className="p-2 bg-gray-100 rounded-lg text-gray-600 active:scale-90 transition-all">
          <ArrowRight size={20} />
        </button>
        <h1 className="text-lg font-bold text-gray-800">الجلسات الحالية والنشاط</h1>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
        <button
          onClick={() => setTab("sessions")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-bold transition-all ${tab === "sessions" ? "bg-white text-[var(--brand)] shadow-sm" : "text-gray-500"}`}
        >
          <MonitorSmartphone size={16} /> الجلسات النشطة
        </button>
        <button
          onClick={() => setTab("logs")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-bold transition-all ${tab === "logs" ? "bg-white text-[var(--brand)] shadow-sm" : "text-gray-500"}`}
        >
          <ScrollText size={16} /> سجلات النشاط والتدقيق
        </button>
      </div>

      {tab === "sessions" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={loadSessions} className="text-xs flex items-center gap-1 text-gray-400 active:scale-95">
              <RefreshCw size={13} className={loadingSessions ? "animate-spin" : ""} /> تحديث
            </button>
          </div>

          {loadingSessions ? (
            <div className="text-center text-gray-400 text-sm py-8">جارِ التحميل...</div>
          ) : sessionsError ? (
            <div className="text-center text-red-500 text-sm py-8">{sessionsError}</div>
          ) : sessions.length === 0 ? (
            <div className="text-center text-gray-400 text-xs py-8 border border-dashed border-gray-200 rounded-2xl">لا توجد جلسات نشطة حالياً</div>
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => (
                <div
                  key={s.jti}
                  className={`rounded-xl border p-3 space-y-2 ${s.is_current_request ? "border-[var(--brand)]/40 bg-[var(--brand)]/5" : "border-gray-100 bg-white"}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MonitorSmartphone size={16} className={s.is_current_request ? "text-[var(--brand)]" : "text-gray-400"} />
                      <span className="text-sm font-bold text-gray-800">{s.device} · {s.browser}</span>
                    </div>
                    {s.is_current_request && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        <ShieldCheck size={11} /> جلستك الحالية
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px] text-gray-500">
                    <div><span className="text-gray-400">IP: </span><span dir="ltr" className="text-gray-700 font-medium">{s.ip_address}</span></div>
                    <div><span className="text-gray-400">الموقع: </span><span className="text-gray-700 font-medium">{s.city}, {s.country}</span></div>
                    <div><span className="text-gray-400">دخول: </span><span className="text-gray-700 font-medium">{fmt(s.created_at)}</span></div>
                    <div><span className="text-gray-400">آخر نشاط: </span><span className="text-gray-700 font-medium">{fmt(s.last_active_at)}</span></div>
                  </div>
                  {!s.is_current_request && (
                    <button
                      onClick={() => revokeSession(s.jti)}
                      disabled={revokingId === s.jti}
                      className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 rounded-lg py-2 active:scale-[0.98] transition-transform disabled:opacity-50"
                    >
                      <LogOut size={13} /> تسجيل خروج من هذا الجهاز
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "logs" && (
        <div className="space-y-3">
          {/* Filters */}
          <div className="bg-white border border-gray-100 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500"><Search size={13} /> فلاتر البحث</div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={filterAction}
                onChange={(e) => { setPage(1); setFilterAction(e.target.value); }}
                className="text-xs border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:border-[var(--brand)] bg-white"
              >
                {ACTION_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <input
                value={filterAdmin}
                onChange={(e) => { setPage(1); setFilterAdmin(e.target.value); }}
                placeholder="اسم/بريد الأدمن"
                className="text-xs border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:border-[var(--brand)]"
              />
            </div>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => { setPage(1); setFilterDate(e.target.value); }}
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:border-[var(--brand)]"
            />
          </div>

          {loadingLogs ? (
            <div className="text-center text-gray-400 text-sm py-8">جارِ التحميل...</div>
          ) : logsError ? (
            <div className="text-center text-red-500 text-sm py-8">{logsError}</div>
          ) : logs.length === 0 ? (
            <div className="text-center text-gray-400 text-xs py-8 border border-dashed border-gray-200 rounded-2xl space-y-2">
              <p>لا توجد سجلات مطابقة</p>
              {(filterAction || filterAdmin || filterDate) && (
                <button
                  onClick={() => { setPage(1); setFilterAction(""); setFilterAdmin(""); setFilterDate(""); }}
                  className="text-[11px] font-bold text-[var(--brand)] underline"
                >
                  إزالة كل الفلاتر
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((l) => (
                <div key={l.id} className="rounded-xl border border-gray-100 bg-white p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--brand)] bg-[var(--brand)]/10 px-2 py-0.5 rounded-full">
                      {ACTION_TYPE_OPTIONS.find((o) => o.value === l.action_type)?.label || l.action_type}
                    </span>
                    <span className="text-[10px] text-gray-400">{fmt(l.created_at)}</span>
                  </div>
                  <p className="text-xs text-gray-600">{l.details || "-"}</p>
                  <div className="flex items-center justify-between text-[10px] text-gray-400">
                    <span>الأدمن: {l.admin_id || "admin"}</span>
                    <span dir="ltr">IP: {l.ip_address}</span>
                  </div>
                  {l.target_model && (
                    <div className="text-[10px] text-gray-400">الهدف: {l.target_model} #{l.target_id}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {total > pageSize && (
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="text-xs font-bold text-gray-500 disabled:opacity-30 px-3 py-1.5 bg-gray-100 rounded-lg"
              >
                السابق
              </button>
              <span className="text-[11px] text-gray-400">صفحة {page} من {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="text-xs font-bold text-gray-500 disabled:opacity-30 px-3 py-1.5 bg-gray-100 rounded-lg"
              >
                التالي
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
