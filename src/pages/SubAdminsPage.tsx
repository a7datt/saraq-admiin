import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, Plus, Trash2, Key, Power, X, ChevronRight, Search, Clock, Copy, AlertTriangle } from "lucide-react";
import { showToast } from "../components/ToastContainer";
import { showConfirm } from "../components/CustomDialogContainer";
import {
  PERMISSION_MODULES, PERMISSION_ACTIONS, ROLE_TEMPLATES, applyRoleTemplate, isDangerousGrant,
  type PermissionModule, type PermissionAction, type SubAdminPermissions,
} from "../utils/permissions";

interface SubAdmin {
  id: number | string;
  email: string;
  name: string | null;
  disabled: boolean;
  permissions: SubAdminPermissions;
  created_at?: string;
  created_by?: string;
  expires_at?: string | null;
  last_login_at?: string | null;
  last_action_at?: string | null;
}

interface SubAdminsPageProps {
  adminFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onBack: () => void;
}

function emptyPermissions(): SubAdminPermissions {
  return {};
}

function formatRelativeTime(iso?: string | null): string {
  if (!iso) return "لا يوجد";
  const then = new Date(iso).getTime();
  if (isNaN(then)) return "لا يوجد";
  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} د`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} س`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `منذ ${days} يوم`;
  return new Date(iso).toLocaleDateString("ar-EG");
}

function isExpired(iso?: string | null): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return !isNaN(t) && t < Date.now();
}

/** يحدّد أزواج (وحدة، إجراء) الخطرة الممنوحة حالياً — لعرض تحذير مرئي في المصفوفة والتأكيد المضاعف. */
function collectDangerousGrants(perms: SubAdminPermissions): { mod: PermissionModule; action: PermissionAction }[] {
  const out: { mod: PermissionModule; action: PermissionAction }[] = [];
  for (const mod of PERMISSION_MODULES) {
    const modPerms = perms[mod.key];
    if (!modPerms) continue;
    for (const action of PERMISSION_ACTIONS) {
      if (modPerms[action.key] === true && isDangerousGrant(mod.key, action.key)) {
        out.push({ mod: mod.key, action: action.key });
      }
    }
  }
  return out;
}

function PermissionMatrix({
  value, onChange, disabled,
}: { value: SubAdminPermissions; onChange: (v: SubAdminPermissions) => void; disabled?: boolean }) {
  const toggle = (mod: PermissionModule, action: PermissionAction) => {
    const next: SubAdminPermissions = { ...value, [mod]: { ...value[mod] } };
    const cur = !!next[mod]?.[action];
    next[mod] = { ...next[mod], [action]: !cur };
    onChange(next);
  };
  const dangerous = collectDangerousGrants(value);
  return (
    <div className="space-y-2">
      {dangerous.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-3 py-2 text-[11px] flex items-start gap-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>تنبيه: تم منح صلاحيات حسّاسة ({dangerous.map(d => `${d.mod}/${d.action}`).join("، ")}) — تأكد أن هذا مقصود قبل الحفظ.</span>
        </div>
      )}
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-xs border-collapse min-w-[560px]">
          <thead>
            <tr>
              <th className="text-right py-2 px-2 text-gray-500 font-bold">الوحدة</th>
              {PERMISSION_ACTIONS.map(a => (
                <th key={a.key} className="text-center py-2 px-2 text-gray-500 font-bold">{a.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_MODULES.map(mod => (
              <tr key={mod.key} className="border-t border-gray-100">
                <td className="py-2 px-2 font-bold text-gray-700 text-right">
                  {mod.label}
                  {mod.sensitive && <span className="text-amber-500 mr-1" title="وحدة حسّاسة">●</span>}
                </td>
                {PERMISSION_ACTIONS.map(a => {
                  const dangerCell = isDangerousGrant(mod.key, a.key);
                  return (
                    <td key={a.key} className="text-center py-2 px-2">
                      <input
                        type="checkbox"
                        disabled={disabled}
                        checked={!!value[mod.key]?.[a.key]}
                        onChange={() => toggle(mod.key, a.key)}
                        className={`w-4 h-4 ${dangerCell ? "accent-amber-500" : "accent-[var(--brand)]"}`}
                        title={dangerCell ? "صلاحية حسّاسة — يتطلب تأكيداً إضافياً عند الحفظ" : undefined}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SubAdminsPage({ adminFetch, onBack }: SubAdminsPageProps) {
  const [items, setItems] = useState<SubAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [pwModalId, setPwModalId] = useState<string | number | null>(null);
  const [newPw, setNewPw] = useState("");

  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newPerms, setNewPerms] = useState<SubAdminPermissions>(emptyPermissions());
  const [newExpiresAt, setNewExpiresAt] = useState("");
  const [cloneFromId, setCloneFromId] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [editPerms, setEditPerms] = useState<SubAdminPermissions>(emptyPermissions());
  const [editExpiresAt, setEditExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "disabled" | "expired">("all");

  // Double-confirm state for dangerous grants
  const [pendingDangerousConfirm, setPendingDangerousConfirm] = useState<null | { mode: "create" | "edit"; id?: string | number }>(null);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await adminFetch("/api/admin/sub-admins");
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setItems(data.subAdmins || []);
        if (data.warning) setLoadError(data.warning);
      } else {
        const msg = data.error || `تعذّر تحميل المسؤولين الثانويين (${res.status})`;
        setLoadError(msg);
        showToast(msg, "error");
      }
    } catch {
      setLoadError("فشل الاتصال بالسيرفر");
      showToast("فشل الاتصال بالسيرفر", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(item => {
      if (q && !item.email.toLowerCase().includes(q) && !(item.name || "").toLowerCase().includes(q)) return false;
      if (statusFilter === "active" && (item.disabled || isExpired(item.expires_at))) return false;
      if (statusFilter === "disabled" && !item.disabled) return false;
      if (statusFilter === "expired" && !isExpired(item.expires_at)) return false;
      return true;
    });
  }, [items, search, statusFilter]);

  const resetCreateForm = () => {
    setNewEmail(""); setNewName(""); setNewPass(""); setNewPerms(emptyPermissions());
    setNewExpiresAt(""); setCloneFromId(""); setSelectedTemplate("");
  };

  const submitCreate = async () => {
    setSaving(true);
    try {
      const res = await adminFetch("/api/admin/sub-admins", {
        method: "POST",
        body: JSON.stringify({
          email: newEmail.trim(), password: newPass, name: newName.trim() || undefined,
          permissions: newPerms,
          expiresAt: newExpiresAt ? new Date(newExpiresAt).toISOString() : undefined,
          cloneFromId: cloneFromId || undefined,
        }),
      });
      let data: any = null;
      try { data = await res.json(); } catch { /* استجابة غير JSON (مثلاً صفحة خطأ 502 من السيرفر) */ }
      if (res.ok) {
        showToast("تم إنشاء المسؤول الثانوي بنجاح", "success");
        setShowCreate(false);
        resetCreateForm();
        load();
      } else if (res.status === 502 || res.status === 503 || res.status === 504) {
        showToast("السيرفر غير متاح حالياً (خطأ " + res.status + ")، يرجى المحاولة مجدداً بعد قليل", "error");
      } else {
        showToast((data && data.error) || `فشل الإنشاء (${res.status})`, "error");
      }
    } catch {
      showToast("فشل الاتصال بالسيرفر", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!newEmail.trim() || !newPass.trim()) {
      showToast("البريد الإلكتروني وكلمة المرور مطلوبان", "error");
      return;
    }
    const passPolicyOk = newPass.length >= 12 && newPass.length <= 128
      && /[a-z]/.test(newPass) && /[A-Z]/.test(newPass) && /[0-9]/.test(newPass) && /[^a-zA-Z0-9]/.test(newPass);
    if (!passPolicyOk) {
      showToast("كلمة المرور يجب أن تكون 12 حرفاً على الأقل وتحتوي حرفاً كبيراً وصغيراً ورقماً ورمزاً خاصاً", "error");
      return;
    }
    if (collectDangerousGrants(newPerms).length > 0) {
      setPendingDangerousConfirm({ mode: "create" });
      return;
    }
    submitCreate();
  };

  const submitSavePermissions = async (id: string | number) => {
    setSaving(true);
    try {
      const res = await adminFetch(`/api/admin/sub-admins/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          permissions: editPerms,
          expiresAt: editExpiresAt ? new Date(editExpiresAt).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("تم تحديث الصلاحيات، وأُنهيت جلساته الحالية ليطبَّق التغيير فوراً", "success");
        setEditingId(null);
        load();
      } else {
        showToast(data.error || "فشل التحديث", "error");
      }
    } catch {
      showToast("فشل الاتصال بالسيرفر", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePermissions = async (id: string | number) => {
    if (collectDangerousGrants(editPerms).length > 0) {
      setPendingDangerousConfirm({ mode: "edit", id });
      return;
    }
    submitSavePermissions(id);
  };

  const handleToggle = async (item: SubAdmin) => {
    if (busyId !== null) return;
    setBusyId(item.id);
    try {
      const res = await adminFetch(`/api/admin/sub-admins/${item.id}/toggle`, {
        method: "POST",
        body: JSON.stringify({ disabled: !item.disabled }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(!item.disabled ? "تم تعطيل الحساب" : "تم تفعيل الحساب", "success");
        load();
      } else {
        showToast(data.error || "فشل الإجراء", "error");
      }
    } catch {
      showToast("فشل الاتصال بالسيرفر", "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (item: SubAdmin) => {
    if (busyId !== null) return;
    showConfirm(`هل أنت متأكد من حذف الحساب "${item.email}" نهائياً؟`, "حذف الحساب", async () => {
      setBusyId(item.id);
      try {
        const res = await adminFetch(`/api/admin/sub-admins/${item.id}`, { method: "DELETE" });
        const data = await res.json();
        if (res.ok) {
          showToast("تم الحذف", "success");
          load();
        } else {
          showToast(data.error || "فشل الحذف", "error");
        }
      } catch {
        showToast("فشل الاتصال بالسيرفر", "error");
      } finally {
        setBusyId(null);
      }
    }, true);
  };

  const handleChangePassword = async () => {
    if (!newPw || newPw.length < 8) {
      showToast("كلمة المرور يجب أن تكون 8 أحرف على الأقل", "error");
      return;
    }
    try {
      const res = await adminFetch(`/api/admin/sub-admins/${pwModalId}/change-password`, {
        method: "POST",
        body: JSON.stringify({ newPassword: newPw }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("تم تغيير كلمة المرور، أُنهيت كل جلساته الحالية", "success");
        setPwModalId(null); setNewPw("");
      } else {
        showToast(data.error || "فشل التغيير", "error");
      }
    } catch {
      showToast("فشل الاتصال بالسيرفر", "error");
    }
  };

  return (
    <div dir="rtl" className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-700 p-1 -m-1"><ChevronRight size={22} /></button>
        <div className="flex-1">
          <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
            <ShieldCheck size={20} className="text-[var(--brand)]" /> المسؤولون الثانويون
          </h2>
          <p className="text-xs text-gray-400">إنشاء حسابات بصلاحيات محدودة ودقيقة لفريقك</p>
        </div>
        <button
          onClick={() => setShowCreate(v => !v)}
          className="bg-[var(--brand)] text-white rounded-lg px-3 py-2 text-xs font-bold flex items-center gap-1 active:scale-95 transition-transform"
        >
          <Plus size={15} /> إضافة
        </button>
      </div>

      {showCreate && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
          <input
            type="email" placeholder="البريد الإلكتروني (فريد)" value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)]"
          />
          <input
            type="text" placeholder="الاسم (اختياري)" value={newName}
            onChange={e => setNewName(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)]"
          />
          <input
            type="password" placeholder="كلمة المرور (12 حرفاً+ حرف كبير وصغير ورقم ورمز خاص)" value={newPass}
            onChange={e => setNewPass(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)]"
          />

          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block flex items-center gap-1">
              <Clock size={13} /> تاريخ انتهاء الصلاحية (اختياري — للحسابات المؤقتة)
            </label>
            <input
              type="datetime-local" value={newExpiresAt}
              onChange={e => setNewExpiresAt(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">قالب دور جاهز (يملأ الصلاحيات تلقائياً)</label>
            <select
              value={selectedTemplate}
              onChange={e => {
                const key = e.target.value;
                setSelectedTemplate(key);
                if (key) { setNewPerms(applyRoleTemplate(key)); setCloneFromId(""); }
              }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)]"
            >
              <option value="">— بدون قالب —</option>
              {ROLE_TEMPLATES.map(t => (
                <option key={t.key} value={t.key}>{t.label} — {t.description}</option>
              ))}
            </select>
          </div>

          {items.length > 0 && (
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block flex items-center gap-1">
                <Copy size={13} /> أو انسخ صلاحيات من مسؤول موجود
              </label>
              <select
                value={cloneFromId}
                onChange={e => {
                  const id = e.target.value;
                  setCloneFromId(id);
                  if (id) {
                    const src = items.find(i => String(i.id) === id);
                    if (src) { setNewPerms(src.permissions || {}); setSelectedTemplate(""); }
                  }
                }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)]"
              >
                <option value="">— بدون نسخ —</option>
                {items.map(i => (
                  <option key={i.id} value={i.id}>{i.name || i.email}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <p className="text-xs font-bold text-gray-500 mb-2">مصفوفة الصلاحيات</p>
            <PermissionMatrix value={newPerms} onChange={setNewPerms} />
          </div>
          <button
            onClick={handleCreate} disabled={saving}
            className="w-full bg-gray-800 text-white py-3 rounded-lg font-bold text-sm disabled:opacity-50"
          >
            {saving ? "جاري الإنشاء..." : "إنشاء الحساب"}
          </button>
        </div>
      )}

      {loadError && !loading && (
        <div className="bg-red-50 border border-red-100 text-red-600 rounded-lg px-3 py-2.5 text-xs flex items-center justify-between gap-2">
          <span>{loadError}</span>
          <button onClick={load} className="font-bold underline shrink-0">إعادة المحاولة</button>
        </div>
      )}

      {items.length > 0 && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" placeholder="بحث بالاسم أو البريد..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full border border-gray-200 rounded-lg pr-9 pl-3 py-2 text-xs outline-none focus:border-[var(--brand)]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="border border-gray-200 rounded-lg px-2 py-2 text-xs outline-none focus:border-[var(--brand)]"
          >
            <option value="all">الكل</option>
            <option value="active">مفعّل</option>
            <option value="disabled">معطّل</option>
            <option value="expired">منتهي الصلاحية</option>
          </select>
        </div>
      )}

      {loading ? (
        <p className="text-center text-gray-400 text-sm py-8">جاري التحميل...</p>
      ) : items.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-8">لا يوجد مسؤولون ثانويون بعد</p>
      ) : filteredItems.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-8">لا توجد نتائج مطابقة للبحث/الفلترة</p>
      ) : (
        <div className="space-y-3">
          {filteredItems.map(item => {
            const expired = isExpired(item.expires_at);
            return (
            <div key={item.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${item.disabled || expired ? "bg-gray-100" : "bg-green-50"}`}>
                  <ShieldCheck size={18} className={item.disabled || expired ? "text-gray-400" : "text-green-600"} />
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <p className="font-bold text-sm text-gray-800 truncate">{item.name || item.email}</p>
                  <p className="text-[11px] text-gray-400 truncate">{item.email}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                  expired ? "bg-amber-50 text-amber-600" : item.disabled ? "bg-red-50 text-red-500" : "bg-green-50 text-green-600"
                }`}>
                  {expired ? "منتهي الصلاحية" : item.disabled ? "معطّل" : "مفعّل"}
                </span>
              </div>

              <div className="mt-2 pt-2 border-t border-gray-50 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-400">
                <span>آخر دخول: {formatRelativeTime(item.last_login_at)}</span>
                <span>آخر إجراء: {formatRelativeTime(item.last_action_at)}</span>
                {item.expires_at && (
                  <span className={expired ? "text-amber-600 font-bold" : ""}>
                    ينتهي: {new Date(item.expires_at).toLocaleString("ar-EG")}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  onClick={() => {
                    const opening = editingId !== item.id;
                    setEditingId(opening ? item.id : null);
                    setEditPerms(item.permissions || {});
                    setEditExpiresAt(item.expires_at ? new Date(item.expires_at).toISOString().slice(0, 16) : "");
                  }}
                  className="flex-1 bg-gray-50 text-gray-700 rounded-lg py-2 text-xs font-bold"
                >
                  {editingId === item.id ? "إغلاق" : "الصلاحيات"}
                </button>
                <button
                  onClick={() => setPwModalId(item.id)}
                  className="bg-gray-50 text-gray-700 rounded-lg px-3 py-2 text-xs font-bold flex items-center gap-1"
                >
                  <Key size={13} /> كلمة المرور
                </button>
                <button
                  onClick={() => handleToggle(item)}
                  disabled={busyId === item.id}
                  className="bg-gray-50 text-gray-700 rounded-lg px-3 py-2 text-xs font-bold flex items-center gap-1 disabled:opacity-50"
                >
                  <Power size={13} /> {item.disabled ? "تفعيل" : "تعطيل"}
                </button>
                <button
                  onClick={() => handleDelete(item)}
                  disabled={busyId === item.id}
                  className="bg-red-50 text-red-500 rounded-lg px-3 py-2 text-xs font-bold flex items-center gap-1 disabled:opacity-50"
                >
                  <Trash2 size={13} /> حذف
                </button>
              </div>

              {editingId === item.id && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block flex items-center gap-1">
                      <Clock size={13} /> تاريخ انتهاء الصلاحية (اتركه فارغاً لإزالة الانتهاء)
                    </label>
                    <input
                      type="datetime-local" value={editExpiresAt}
                      onChange={e => setEditExpiresAt(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)]"
                    />
                  </div>
                  <PermissionMatrix value={editPerms} onChange={setEditPerms} />
                  <button
                    onClick={() => handleSavePermissions(item.id)} disabled={saving}
                    className="w-full bg-[var(--brand)] text-white py-2.5 rounded-lg font-bold text-xs disabled:opacity-50"
                  >
                    {saving ? "جاري الحفظ..." : "حفظ الصلاحيات"}
                  </button>
                </div>
              )}
            </div>
          );})}
        </div>
      )}

      {pwModalId !== null && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6" onClick={() => setPwModalId(null)}>
          <div className="bg-white rounded-xl p-5 w-full max-w-sm space-y-3" onClick={e => e.stopPropagation()} dir="rtl">
            <div className="flex items-center justify-between">
              <p className="font-bold text-gray-800 text-sm">تغيير كلمة المرور</p>
              <button onClick={() => setPwModalId(null)}><X size={18} className="text-gray-400" /></button>
            </div>
            <input
              type="password" placeholder="كلمة المرور الجديدة" value={newPw}
              onChange={e => setNewPw(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)]"
            />
            <button onClick={handleChangePassword} className="w-full bg-gray-800 text-white py-2.5 rounded-lg font-bold text-sm">
              حفظ
            </button>
          </div>
        </div>
      )}

      {/* تأكيد مضاعف عند منح صلاحيات خطرة (حذف مالي/مستخدمين، أو الوصول لبوابات الدفع) */}
      {pendingDangerousConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6" onClick={() => setPendingDangerousConfirm(null)}>
          <div className="bg-white rounded-xl p-5 w-full max-w-sm space-y-3" onClick={e => e.stopPropagation()} dir="rtl">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle size={20} />
              <p className="font-bold text-sm">تأكيد صلاحيات حسّاسة</p>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              أنت على وشك منح صلاحية حسّاسة (حذف في المالية/المستخدمين أو الوصول لبوابات الدفع). هذا قد يمنح وصولاً
              خطيراً لبيانات حساسة. هل أنت متأكد من المتابعة؟
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPendingDangerousConfirm(null)}
                className="flex-1 bg-gray-50 text-gray-700 rounded-lg py-2.5 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  const pending = pendingDangerousConfirm;
                  setPendingDangerousConfirm(null);
                  if (pending?.mode === "create") submitCreate();
                  else if (pending?.mode === "edit" && pending.id !== undefined) submitSavePermissions(pending.id);
                }}
                className="flex-1 bg-red-500 text-white rounded-lg py-2.5 text-xs font-bold"
              >
                نعم، متابعة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
