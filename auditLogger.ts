// ============================================================
// auditLogger.ts — Centralized Audit Logging + Active Sessions
// ============================================================
// نظام مركزي لتسجيل كل الإجراءات الحساسة في لوحة التحكم (Audit Log)
// وإدارة الجلسات النشطة لتوكنات الأدمن (Active Sessions).
// ============================================================

import { Request } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getClientIp as getTrustedClientIp } from "./security.js";

// يُمرَّر عميل Supabase الحالي من server.ts (نفس العميل المُهيَّأ هناك)
// بدلاً من إنشاء عميل جديد هنا، لتفادي أي تعارض في متغيرات البيئة
// أو فشل الإقلاع قبل توفر القيم.
let supabase: SupabaseClient;

export function initAuditLogger(client: SupabaseClient): void {
  supabase = client;
}

function ready(): boolean {
  if (!supabase) {
    console.warn("[audit] auditLogger not initialized — call initAuditLogger(supabase) at server boot");
    return false;
  }
  return true;
}

// [SECURITY FIX] القسم 6.3.1 من تقرير الفحص الأمني (CWE-532: Insertion of Sensitive
// Information into Log File): طبقة تنقية تلقائية (Redaction Layer) تُطبَّق وقائياً على
// old_values/new_values قبل التخزين، حتى لو مرّر مطوّر مستقبلي حقلاً حساساً بالخطأ دون
// انتباه. نفس نمط SETTINGS_BLOCKLIST/isBlockedSettingsKey المستخدم فعلياً في server.ts،
// لكن مطبَّقاً هنا بنيوياً داخل logActivity نفسها بدل الاعتماد على انتباه كل مسار استدعاء.
const SENSITIVE_KEY_PATTERN = /pass|secret|token|api_key|private_key|encryption_key|credential/i;

function redactSensitiveFields(value: any, depth = 0): any {
  if (value == null || depth > 6) return value;
  if (Array.isArray(value)) return value.map((v) => redactSensitiveFields(v, depth + 1));
  if (typeof value !== "object") return value;
  const out: Record<string, any> = {};
  for (const [key, val] of Object.entries(value)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      out[key] = "[REDACTED]";
    } else if (val && typeof val === "object") {
      out[key] = redactSensitiveFields(val, depth + 1);
    } else {
      out[key] = val;
    }
  }
  return out;
}

// ----- Activity Notifier Hook (لإشعارات المتصفح للأدمن) --------------------
// يسمح لـ server.ts بتسجيل دالة تُستدعى تلقائياً بعد كل عملية تسجيل نشاط ناجحة،
// دون الحاجة لتعديل عشرات نقاط استدعاء logActivity المنتشرة في المشروع.
let activityNotifier: ((input: AuditLogInput) => void) | null = null;
export function setActivityNotifier(fn: (input: AuditLogInput) => void): void {
  activityNotifier = fn;
}

// ----- Helpers -----------------------------------------------------------

// [SECURITY FIX -- CWE-290/CWE-117 Trust Boundary Violation / Log Injection] كانت هذه الدالة
// تثق دائماً وبلا أي شرط بترويسة x-forwarded-for القادمة مباشرة من الطلب، بشكل مستقل تماماً
// عن متغير TRUST_PROXY المُستخدَم في security.ts (getClientIp). النتيجة: حتى مع الإعداد الآمن
// الافتراضي TRUST_PROXY=false وبدون أي بروكسي عكسي أمام الخادم إطلاقاً، كان أي زائر خارجي
// يستطيع تزوير عنوان IP عشوائي بمجرد إرسال ترويسة x-forwarded-for مخصصة، فيُسجَّل هذا العنوان
// المزوَّر مباشرة في admin_activity_logs وadmin_sessions (بما يشمل صفحة "الجلسات النشطة" التي
// يعتمد عليها الأدمن لمراجعة أي وصول مشبوه) — ما يُبطل عملياً موثوقية سجلات التدقيق الجنائي
// (Log Injection / Audit Trail Poisoning) بغض النظر عن ضبط البنية التحتية. الإصلاح: استخدام
// نفس دالة getClientIp من security.ts التي تحترم TRUST_PROXY فعلياً، بدل قراءة الترويسة هنا
// بشكل منفصل ومستقل.
export function getIp(req: Request): string {
  return getTrustedClientIp(req).replace("::ffff:", "");
}

export function parseUserAgent(ua: string): { device: string; browser: string } {
  const s = (ua || "").toLowerCase();
  let device = "Desktop";
  if (/mobile|android|iphone/.test(s)) device = "Mobile";
  else if (/ipad|tablet/.test(s)) device = "Tablet";

  let browser = "Unknown";
  if (s.includes("edg/")) browser = "Edge";
  else if (s.includes("chrome/") && !s.includes("edg/")) browser = "Chrome";
  else if (s.includes("firefox/")) browser = "Firefox";
  else if (s.includes("safari/") && !s.includes("chrome/")) browser = "Safari";
  else if (s.includes("opr/") || s.includes("opera")) browser = "Opera";

  return { device, browser };
}

// Best-effort free IP geolocation (no key required). Fails silently.
export async function geolocateIp(ip: string): Promise<{ country: string; city: string }> {
  try {
    if (!ip || ip === "unknown" || ip.startsWith("127.") || ip.startsWith("::1") || ip.startsWith("192.168.") || ip.startsWith("10.")) {
      return { country: "محلي", city: "-" };
    }
    const resp = await fetch(`https://ipapi.co/${ip}/json/`);
    if (!resp.ok) return { country: "-", city: "-" };
    const data: any = await resp.json();
    return { country: data.country_name || "-", city: data.city || "-" };
  } catch {
    return { country: "-", city: "-" };
  }
}

// ----- Audit Log -----------------------------------------------------------

export interface AuditLogInput {
  admin_id?: string | null;
  action_type: string;
  target_model?: string | null;
  target_id?: string | number | null;
  old_values?: any;
  new_values?: any;
  details?: string;
  req?: Request;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Centralized logger — call this from ANY admin route that performs
 * a sensitive action (login/logout, settings change, order/payment update,
 * permission change, security event, etc).
 */
export async function logActivity(input: AuditLogInput): Promise<void> {
  if (!ready()) return;
  try {
    const ip = input.ip_address || (input.req ? getIp(input.req) : "unknown");
    const ua = input.user_agent || (input.req ? (input.req.headers["user-agent"] as string) || "" : "");
    await supabase.from("admin_activity_logs").insert({
      admin_id: input.admin_id ?? "admin",
      action_type: input.action_type,
      target_model: input.target_model ?? null,
      target_id: input.target_id != null ? String(input.target_id) : null,
      old_values: redactSensitiveFields(input.old_values ?? null),
      new_values: redactSensitiveFields(input.new_values ?? null),
      details: input.details ?? null,
      ip_address: ip,
      user_agent: ua,
    });
    // إشعار متصفح الأدمن (best-effort — لا يُفشل تسجيل النشاط نفسه)
    try { activityNotifier?.(input); } catch { /* noop */ }
  } catch (e) {
    // لا نُفشل الطلب الأساسي بسبب فشل تسجيل النشاط
    console.error("[audit] failed to write activity log:", (e as any)?.message || e);
  }
}

// ----- Active Sessions -----------------------------------------------------

/** Called on successful admin login — registers a new active session row.
 *  targetId: for sub_admin sessions, the sub-admin's own account id — lets a permission edit
 *  revoke exactly that person's sessions (see revokeSubAdminSessions) without a global logout. */
export async function registerSession(jti: string, req: Request, adminLabel = "admin", targetId?: string | number): Promise<void> {
  if (!ready()) return;
  try {
    const ip = getIp(req);
    const ua = (req.headers["user-agent"] as string) || "";
    const { device, browser } = parseUserAgent(ua);
    const geo = await geolocateIp(ip);
    const row: any = {
      jti,
      admin_label: adminLabel,
      ip_address: ip,
      country: geo.country,
      city: geo.city,
      device,
      browser,
      user_agent: ua,
      revoked: false,
    };
    if (targetId !== undefined) row.target_id = String(targetId);
    let { error } = await supabase.from("admin_sessions").insert(row);
    if (error && /target_id/i.test(String(error.message || ""))) {
      // توافق تدريجي: عمود target_id قد لا يكون مهاجَراً بعد
      delete row.target_id;
      await supabase.from("admin_sessions").insert(row);
    }
  } catch (e) {
    console.error("[audit] failed to register session:", (e as any)?.message || e);
  }
}

/** Touch last_active_at for a session on each authenticated admin request. */
export async function touchSession(jti: string): Promise<void> {
  if (!ready()) return;
  try {
    await supabase.from("admin_sessions").update({ last_active_at: new Date().toISOString() }).eq("jti", jti).eq("revoked", false);
  } catch {
    /* noop */
  }
}

/** Revoke a session by its jti (logs the admin out of that device). */
export async function revokeSession(jti: string): Promise<boolean> {
  if (!ready()) return false;
  try {
    const { error } = await supabase
      .from("admin_sessions")
      .update({ revoked: true, revoked_at: new Date().toISOString() })
      .eq("jti", jti);
    return !error;
  } catch {
    return false;
  }
}

/** Mark a session revoked on explicit logout. */
export async function endSession(jti: string): Promise<void> {
  await revokeSession(jti);
}

/** Check if a given session (by jti) has been revoked. Used by adminAuth on every request. */
export async function isSessionRevoked(jti: string): Promise<boolean> {
  if (!ready()) return false;
  try {
    const { data, error } = await supabase
      .from("admin_sessions")
      .select("revoked")
      .eq("jti", jti)
      .maybeSingle();
    if (error) return false;
    return !!data?.revoked;
  } catch {
    return false;
  }
}

/** Revoke ALL active admin sessions except (optionally) the one currently making the request.
 *  Used when the admin password is changed, so every other logged-in device/browser is
 *  forced to log in again with the new password immediately. */
export async function revokeAllSessions(exceptJti?: string): Promise<void> {
  if (!ready()) return;
  try {
    let query = supabase.from("admin_sessions").update({ revoked: true, revoked_at: new Date().toISOString() }).eq("revoked", false);
    if (exceptJti) query = query.neq("jti", exceptJti);
    await query;
  } catch (e) {
    console.error("[audit] failed to revoke all sessions:", (e as any)?.message || e);
  }
}

/**
 * Revoke active sessions belonging ONLY to a specific sub-admin (by their account id),
 * without affecting the main admin's session or any other sub-admin's session.
 * Used when a main admin edits a sub-admin's permissions, so the change takes effect
 * immediately instead of waiting for the sub-admin's token to expire (closes a stale-token
 * exploitation window) — while avoiding the over-broad blast radius of revokeAllSessions().
 * Requires admin_sessions to have a target_id (or subject_id) column populated at login time;
 * falls back to a no-op (relying on the Zero-Trust per-request permission re-check in adminAuth)
 * if that column isn't present in older schemas.
 */
export async function revokeSubAdminSessions(subAdminId: string): Promise<void> {
  if (!ready()) return;
  try {
    const { error } = await supabase
      .from("admin_sessions")
      .update({ revoked: true, revoked_at: new Date().toISOString() })
      .eq("revoked", false)
      .eq("target_id", subAdminId);
    if (error && /target_id/i.test(String(error.message || ""))) {
      // العمود غير موجود بعد في هذه القاعدة — لا خطر أمني إضافي لأن adminAuth يعيد فحص
      // الصلاحيات من قاعدة البيانات في كل طلب على أي حال (Zero-Trust)، فقط لا يوجد إبطال فوري إضافي.
      console.warn("[audit] admin_sessions.target_id غير موجود — تخطي إبطال جلسات المسؤول الثانوي المحدد (الفحص الحي في adminAuth يبقى فعّالاً).");
      return;
    }
  } catch (e) {
    console.error("[audit] failed to revoke sub-admin sessions:", (e as any)?.message || e);
  }
}

// ----- Retention / Archival -------------------------------------------------

const RETENTION_DAYS = 90;

/**
 * Archives (copies) then deletes activity_logs older than RETENTION_DAYS.
 * Intended to be run periodically (see server.ts cron scheduling).
 */
export async function archiveOldActivityLogs(): Promise<{ archived: number }> {
  if (!ready()) return { archived: 0 };
  try {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 3600 * 1000).toISOString();
    const { data: oldRows } = await supabase.from("admin_activity_logs").select("*").lt("created_at", cutoff).limit(5000);
    if (!oldRows || oldRows.length === 0) return { archived: 0 };

    await supabase.from("admin_activity_logs_archive").insert(oldRows);
    const ids = oldRows.map((r: any) => r.id);
    await supabase.from("admin_activity_logs").delete().in("id", ids);
    console.log(`[audit] archived ${ids.length} old activity_logs rows (older than ${RETENTION_DAYS}d)`);
    return { archived: ids.length };
  } catch (e) {
    console.error("[audit] archiveOldActivityLogs failed:", (e as any)?.message || e);
    return { archived: 0 };
  }
}

/** Schedules the archival job to run once every 24h. Call once at server boot. */
export function scheduleActivityLogArchival(): void {
  // شغّلها مرة عند الإقلاع ثم كل 24 ساعة
  archiveOldActivityLogs();
  setInterval(() => {
    archiveOldActivityLogs();
  }, 24 * 3600 * 1000);
}
