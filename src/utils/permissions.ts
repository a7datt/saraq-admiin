// ════════════════════════════════════════════════════════════════
//  نظام صلاحيات المسؤولين الثانويين (Sub-Admins) — Frontend
// ════════════════════════════════════════════════════════════════
//  الحالة (State): تُخزَّن الصلاحيات في localStorage بعد تسجيل الدخول (إضافة إلى adminToken)
//  وتُحمَّل مرة واحدة عند بدء التطبيق (App.tsx) عبر /api/admin/verify-token — نفس المصدر الذي
//  يتحقق من صلاحية التوكن، حتى لا تبقى صلاحيات قديمة معروضة في الواجهة بعد تعديلها من الأدمن الرئيسي.
//
//  مهم: هذه الطبقة تحكم فقط بإخفاء/تعطيل العناصر في الواجهة (UX). الحماية الفعلية والملزمة
//  تكون دائماً من الخادم (adminAuth + requirePermission في security.ts) — لا يمكن الوثوق بالفرونت إند وحده.

export type PermissionModule =
  | "orders" | "finance" | "payment_gateways" | "users" | "store" | "elements" | "chat"
  | "analytics" | "appearance" | "rewards"
  | "settings_ai" | "settings_bots" | "settings_logs" | "settings_api"
  // [SECURITY FIX] وحدتان أُضيفتا في الخادم (security.ts) لتغطية مسارات العملات والقسائم
  // (كانت بلا permGuard إطلاقاً)، لكن هذا الملف (الواجهة) لم يُحدَّث ليعكسهما — ما كان يعني
  // عملياً أن أي كود واجهة يحاول التحقق من صلاحية "currencies"/"vouchers" سيفشل في الترجمة،
  // وأن صفحات العملات/القسائم لا تملك وسيلة لإخفاء/تعطيل أزرارها حسب صلاحية المسؤول الثانوي
  // الفعلية (الحماية الملزمة تبقى من الخادم دائماً، لكن هذا يُصلح تطابق الواجهة مع الخادم).
  | "currencies" | "vouchers";

export type PermissionAction = "view" | "create" | "edit" | "delete" | "export";

export type SubAdminPermissions = Partial<Record<PermissionModule, Partial<Record<PermissionAction, boolean>>>>;

export type AdminRole = "dev" | "admin" | "sub_admin";

export const PERMISSION_MODULES: { key: PermissionModule; label: string; sensitive?: boolean }[] = [
  { key: "orders",           label: "الطلبات" },
  { key: "finance",          label: "المالية (المدفوعات)", sensitive: true },
  { key: "payment_gateways", label: "بوابات الدفع (مفاتيح API حساسة)", sensitive: true },
  { key: "users",            label: "المستخدمون", sensitive: true },
  { key: "store",            label: "المتجر (المخزون، الربط الخارجي)" },
  { key: "elements",         label: "عناصر المتجر (أقسام، بانرات، عروض، طرق دفع)" },
  { key: "chat",             label: "الشات" },
  { key: "analytics",        label: "الإحصائيات والتحليلات" },
  { key: "appearance",       label: "المظهر والتخصيص" },
  { key: "rewards",          label: "المكافآت ولوحة المتصدرين" },
  { key: "settings_ai",      label: "إعدادات الذكاء الاصطناعي" },
  { key: "settings_bots",    label: "إعدادات البوتات (تلجرام)" },
  { key: "settings_logs",    label: "السجلات (سجل النشاط)" },
  { key: "settings_api",     label: "إعدادات الـ API (توكنات، API عامة)", sensitive: true },
  { key: "currencies",       label: "العملات وأسعار الصرف", sensitive: true },
  { key: "vouchers",         label: "قسائم الخصم" },
];

export const PERMISSION_ACTIONS: { key: PermissionAction; label: string }[] = [
  { key: "view",   label: "عرض" },
  { key: "create", label: "إضافة" },
  { key: "edit",   label: "تعديل" },
  { key: "delete", label: "حذف" },
  { key: "export", label: "تصدير" },
];

/** الوحدات/الإجراءات التي تُعتبر خطرة بما يكفي لتستوجب تأكيداً مضاعفاً عند منحها لمسؤول ثانوي. */
export function isDangerousGrant(mod: PermissionModule, action: PermissionAction): boolean {
  if (action === "delete" && (mod === "finance" || mod === "users" || mod === "payment_gateways")) return true;
  if (mod === "payment_gateways" && (action === "view" || action === "edit")) return true;
  return false;
}

// ── قوالب أدوار جاهزة (Role Templates) ──
// تُستخدم لملء مصفوفة الصلاحيات تلقائياً عند إنشاء مسؤول ثانوي جديد حسب طبيعة عمله.
export interface RoleTemplate {
  key: string;
  label: string;
  description: string;
  permissions: SubAdminPermissions;
}

export const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    key: "orders_manager",
    label: "مسؤول طلبات",
    description: "متابعة وتحديث الطلبات دون الوصول للمالية أو بيانات الدفع",
    permissions: {
      orders: { view: true, create: true, edit: true },
      chat: { view: true, create: true },
    },
  },
  {
    key: "support_agent",
    label: "دعم فني",
    description: "الرد على العملاء ومتابعة الطلبات بصلاحية عرض فقط",
    permissions: {
      orders: { view: true },
      chat: { view: true, create: true, edit: true },
      users: { view: true },
    },
  },
  {
    key: "accountant",
    label: "محاسب",
    description: "متابعة المالية والتقارير دون الوصول لمفاتيح بوابات الدفع",
    permissions: {
      finance: { view: true, export: true },
      orders: { view: true },
      analytics: { view: true, export: true },
    },
  },
  {
    key: "content_manager",
    label: "مسؤول محتوى ومظهر",
    description: "إدارة عناصر المتجر والمظهر والعروض",
    permissions: {
      elements: { view: true, create: true, edit: true },
      appearance: { view: true, edit: true },
      store: { view: true },
    },
  },
];

/** يُرجع نسخة عميقة من صلاحيات قالب معيّن، جاهزة للاستخدام كقيمة أولية في نموذج الإنشاء. */
export function applyRoleTemplate(templateKey: string): SubAdminPermissions {
  const tpl = ROLE_TEMPLATES.find(t => t.key === templateKey);
  return tpl ? JSON.parse(JSON.stringify(tpl.permissions)) : {};
}

// ── تخزين/قراءة حالة الصلاحيات محلياً ──

export function saveAdminSession(role: AdminRole, permissions?: SubAdminPermissions, name?: string) {
  localStorage.setItem("adminRole", role);
  localStorage.setItem("adminPermissions", JSON.stringify(permissions || {}));
  if (name !== undefined) localStorage.setItem("adminName", name || "");
}

export function clearAdminSession() {
  localStorage.removeItem("adminToken");
  localStorage.removeItem("adminEmail");
  localStorage.removeItem("adminRole");
  localStorage.removeItem("adminPermissions");
  localStorage.removeItem("adminName");
}

export function getAdminRole(): AdminRole {
  const r = localStorage.getItem("adminRole");
  return r === "dev" || r === "sub_admin" ? r : "admin";
}

export function getAdminPermissions(): SubAdminPermissions {
  try {
    return JSON.parse(localStorage.getItem("adminPermissions") || "{}");
  } catch {
    return {};
  }
}

/** المطور والأدمن الرئيسي يملكان كل الصلاحيات دوماً؛ المسؤول الثانوي يُفحص فعلياً حسب المصفوفة. */
export function hasPermission(mod: PermissionModule, action: PermissionAction = "view"): boolean {
  const role = getAdminRole();
  if (role === "dev" || role === "admin") return true;
  const perms = getAdminPermissions();
  return perms?.[mod]?.[action] === true;
}

/** هل يملك المسؤول الثانوي أي صلاحية ضمن وحدة معينة (يُستخدم لإخفاء القسم كاملاً من القوائم). */
export function hasAnyPermissionInModule(mod: PermissionModule): boolean {
  const role = getAdminRole();
  if (role === "dev" || role === "admin") return true;
  const perms = getAdminPermissions();
  const modPerms = perms?.[mod];
  return !!modPerms && Object.values(modPerms).some(Boolean);
}

/** هل هذا الحساب مسؤول ثانوي (يُستخدم لإخفاء أزرار "المسؤولون الثانويون" و"صفحة المطور" عنه تماماً). */
export function isSubAdmin(): boolean {
  return getAdminRole() === "sub_admin";
}

/** يمكن للأدمن الرئيسي أو المطور فقط إدارة المسؤولين الثانويين. */
export function canManageSubAdmins(): boolean {
  const role = getAdminRole();
  return role === "dev" || role === "admin";
}

/**
 * Helper مركزي لعناصر الواجهة المشتركة: يُرجع خصائص جاهزة للزر/العنصر
 * (hidden: تام الإخفاء — يُستخدم للقوائم الجانبية والأقسام الكاملة غير المصرح بها إطلاقاً،
 *  disabled: تعطيل بصري مع aria/title توضيحي — يُستخدم لأزرار داخل صفحات مشتركة قد يصل إليها
 *  المسؤول الثانوي مباشرة عبر رابط لكنه لا يملك صلاحية الإجراء بعينه).
 *
 * الاستخدام:
 *   const p = permGate("orders", "delete");
 *   if (p.hidden) return null;
 *   <button disabled={p.disabled} title={p.title} className={p.className(baseClasses)}>حذف</button>
 */
export function permGate(mod: PermissionModule, action: PermissionAction = "view", opts?: { hideInstead?: boolean }) {
  const allowed = hasPermission(mod, action);
  const hideInstead = !!opts?.hideInstead;
  return {
    allowed,
    hidden: !allowed && hideInstead,
    disabled: !allowed && !hideInstead,
    title: allowed ? undefined : "ليس لديك صلاحية للقيام بهذا الإجراء",
    className: (base: string) => (allowed ? base : `${base} opacity-40 cursor-not-allowed pointer-events-none`),
  };
}
