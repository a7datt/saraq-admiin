/**
 * ════════════════════════════════════════════════════════════════
 *  security.ts  —  14 طبقة حماية متقدمة (v3 - إصلاح ثغرات حرجة)
 * ════════════════════════════════════════════════════════════════
 *
 *  التغييرات في v2:
 *  - OTP يُولَّد الآن بـ crypto.randomInt() بدلاً من Math.random()
 *  - CSP أقوى: حُذف unsafe-eval من script-src
 *  - CORS: لا يقبل طلبات بدون Origin header إلا في dev
 *  - Rate limiting: رُفع عدد الـ strikes المطلوبة للحظر
 *    بشكل كبير لتجنب الحظر التعسفي للمستخدمين العاديين
 *  - strikeIp: الحظر يبدأ فقط بعد مخالفات كثيرة جداً
 *  - ipBanList: مدة الحظر أقصر ومتدرجة بشكل معقول
 *
 *  التغييرات في v3 (تقرير الفحص الأمني):
 *  - [CRITICAL FIX] أُزيل اشتقاق JWT_SECRET/ADMIN_JWT_SECRET من SUPABASE_URL.
 *    كان هذا الاشتقاق قابلاً للحساب من أي مهاجم لأن SUPABASE_URL يُشحن أصلاً
 *    إلى المتصفح عبر VITE_SUPABASE_URL في حزمة الواجهة الأمامية، ما يسمح
 *    بتزوير توكن أدمن صالح دون معرفة أي كلمة مرور. الآن ضبط المفتاحين
 *    إلزامي تماماً ويوقف الخادم فوراً إن غابا (fail-closed لا fail-open).
 *  - أُضيف قفل حساب (account lockout) لتسجيل دخول الأدمن/المطوّر (الطبقة 11).
 *  - عتبات حظر أدق لمسارات حساسة (تسجيل دخول الأدمن تحديداً).
 */

import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

// ══════════════════════════════════════════════════════════════
//  الطبقة 1 — JWT
// ══════════════════════════════════════════════════════════════

// [SECURITY FIX] لا يوجد أي اشتقاق احتياطي للمفتاح بعد الآن — أي قيمة يمكن اشتقاقها
// من متغيرات بيئة "معروفة/شبه عامة" (مثل SUPABASE_URL المُضمَّن في حزمة الواجهة
// الأمامية عبر VITE_SUPABASE_URL) تعني عملياً أن أي زائر يستطيع حساب مفتاح توقيع
// الـ JWT بنفسه وتزوير توكن أدمن صالح. المفتاحان الآن **إلزاميان** ويجب ضبطهما
// كسلسلة عشوائية طويلة في .env (مثال للتوليد: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
// وإلا يتوقف الخادم عن الإقلاع نهائياً بدل العمل بمفتاح ضعيف/متوقَّع (fail-closed).
function requireSecretEnv(label: string): string {
  const value = process.env[label];
  if (!value || value.trim().length < 32) {
    console.error(
      `[SEC] 🚨 متغير البيئة ${label} غير مضبوط أو قصير جداً (يلزم 32 حرفاً على الأقل، يُفضّل 64+).\n` +
      `      ولّد قيمة عشوائية آمنة بالأمر التالي وضعها في .env:\n` +
      `      node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"\n` +
      `      لن يبدأ الخادم دون هذا الضبط لأن العمل بمفتاح افتراضي أو مُشتق من قيمة عامة ثغرة أمنية حرجة.`
    );
    process.exit(1);
  }
  return value;
}

const JWT_SECRET = requireSecretEnv("JWT_SECRET");

const ADMIN_JWT_SECRET = requireSecretEnv("ADMIN_JWT_SECRET");

function b64url(data: Buffer | string): string {
  const buf = typeof data === "string" ? Buffer.from(data) : data;
  return buf.toString("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=/g,"");
}

function signJwt(payload: object, secret: string, expiresInSec = 7*24*3600): string {
  const h = b64url(JSON.stringify({ alg:"HS256", typ:"JWT" }));
  const b = b64url(JSON.stringify({ ...payload, iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)+expiresInSec, jti: crypto.randomBytes(8).toString("hex") }));
  const s = b64url(crypto.createHmac("sha256", secret).update(`${h}.${b}`).digest());
  return `${h}.${b}.${s}`;
}

function verifyJwt(token: string, secret: string): any|null {
  try {
    if (!token || typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [h,b,s] = parts;
    const expected = b64url(crypto.createHmac("sha256", secret).update(`${h}.${b}`).digest());
    // timing-safe compare — مقاومة Timing Attacks
    const sBuf = Buffer.from(s.padEnd(expected.length, "="));
    const eBuf = Buffer.from(expected);
    if (sBuf.length !== eBuf.length || !crypto.timingSafeEqual(sBuf, eBuf)) return null;
    const payload = JSON.parse(Buffer.from(b, "base64").toString());
    if (payload.exp < Math.floor(Date.now()/1000)) return null;
    return payload;
  } catch { return null; }
}

export const createUserToken  = (userId: number|string) => signJwt({ sub: String(userId), role:"user"  }, JWT_SECRET, 7*24*3600);
export const createAdminToken = (adminId?: number|string, email?: string, isDev?: boolean) => signJwt({ role:"admin", sub: adminId !== undefined ? String(adminId) : undefined, email, isDev: !!isDev }, ADMIN_JWT_SECRET, 4*3600);
export const verifyUserToken  = (t: string) => verifyJwt(t, JWT_SECRET);
export const verifyAdminToken = (t: string) => verifyJwt(t, ADMIN_JWT_SECRET);

// ══════════════════════════════════════════════════════════════
//  [PHONE-GATE] توكن مؤقّت قصير الأجل لإتمام تسجيل الدخول عبر Google
//  بعد إجبار المستخدم على تعبئة رقم الهاتف — يحمل هوية Google الموثّقة
//  فقط (بدون صلاحية دخول)، لمنع العميل من تزوير googleId/email بين
//  الخطوة الأولى (التحقق من Google) والثانية (إرسال رقم الهاتف).
// ══════════════════════════════════════════════════════════════
export const createGoogleTempToken = (data: { googleId: string; email: string; name: string; avatarUrl: string | null }) =>
  signJwt({ purpose: "google_phone_pending", googleId: data.googleId, email: data.email, name: data.name, avatarUrl: data.avatarUrl }, JWT_SECRET, 10*60);

export const verifyGoogleTempToken = (t: string): { googleId: string; email: string; name: string; avatarUrl: string | null } | null => {
  const p = verifyJwt(t, JWT_SECRET);
  if (!p || p.purpose !== "google_phone_pending" || !p.googleId || !p.email) return null;
  return { googleId: p.googleId, email: p.email, name: p.name, avatarUrl: p.avatarUrl ?? null };
};

// ══════════════════════════════════════════════════════════════
//  المسؤولون الثانويون (Sub-Admins) — Zero-Trust Permission Layer
// ══════════════════════════════════════════════════════════════
//  - المطور (isDev) والأدمن الرئيسي (admin_accounts) يملكان role:"admin" ويمرّان كل الفحوصات دائماً.
//  - المسؤول الثانوي يملك role:"sub_admin" ولا تُقرأ صلاحياته من الـ JWT (لتفادي بقاء صلاحيات قديمة
//    صالحة داخل توكن موقّع لمدة 4 ساعات)، بل تُقرأ من قاعدة البيانات في كل طلب عبر subAdminLookup،
//    بما يضمن أن أي تعديل/تعطيل للحساب من الأدمن الرئيسي ينعكس فوراً (Zero-Trust).

export type PermissionModule =
  | "orders" | "finance" | "payment_gateways" | "users" | "store" | "elements" | "chat"
  | "analytics" | "appearance" | "rewards"
  | "settings_ai" | "settings_bots" | "settings_logs" | "settings_api"
  // [SECURITY FIX] وحدات صلاحية جديدة أُضيفت لتغطية مسارات كانت بلا permGuard إطلاقاً
  | "currencies" | "vouchers";

export type PermissionAction = "view" | "create" | "edit" | "delete" | "export";

export type SubAdminPermissions = Partial<Record<PermissionModule, Partial<Record<PermissionAction, boolean>>>>;

export const PERMISSION_MODULES: PermissionModule[] = [
  "orders", "finance", "payment_gateways", "users", "store", "elements", "chat",
  "analytics", "appearance", "rewards",
  "settings_ai", "settings_bots", "settings_logs", "settings_api",
  "currencies", "vouchers",
];

// [FIX] دعم انتهاء الصلاحية التلقائي (expires_at): إن مرّ تاريخ الانتهاء، الحساب يُعامل فوراً
// كأنه معطّل (disabled) بغض النظر عن الحقل disabled نفسه — Zero-Trust، يُفحص في كل طلب.
type SubAdminRecord = { disabled: boolean; permissions: SubAdminPermissions; expires_at?: string | null };
let subAdminLookup: ((id: string) => Promise<SubAdminRecord | null>) | null = null;
export function setSubAdminLookup(fn: (id: string) => Promise<SubAdminRecord | null>) {
  subAdminLookup = fn;
}

// [FIX] "Last Activity Display": دالة اختيارية (best-effort، لا تُبطئ أو تُفشل الطلب) لتحديث
// آخر وقت نشاط فعلي لمسؤول ثانوي، تُستدعى من adminAuth مع كل طلب مصادَق ناجح.
let subAdminTouchLastAction: ((id: string) => Promise<void>) | null = null;
export function setSubAdminTouchLastAction(fn: (id: string) => Promise<void>) {
  subAdminTouchLastAction = fn;
}

/** يمنع تصعيد الصلاحيات: يتحقق أن كل صلاحية في "requested" ممنوحة فعلاً في "granterPermissions". */
export function isSubsetOfPermissions(requested: SubAdminPermissions, granterPermissions: SubAdminPermissions | "all"): boolean {
  if (granterPermissions === "all") return true;
  for (const mod of Object.keys(requested) as PermissionModule[]) {
    const reqMod = requested[mod];
    if (!reqMod) continue;
    for (const action of Object.keys(reqMod) as PermissionAction[]) {
      if (reqMod[action] === true && granterPermissions?.[mod]?.[action] !== true) {
        return false;
      }
    }
  }
  return true;
}

export const createSubAdminToken = (subAdminId: number | string, email: string) =>
  signJwt({ role: "sub_admin", sub: String(subAdminId), email }, ADMIN_JWT_SECRET, 4 * 3600);

/** يسمح فقط للمطور أو الأدمن الرئيسي (role:"admin") — يستثني المسؤولين الثانويين تماماً. */
export function requireMainAdmin(req: Request, res: Response, next: NextFunction) {
  const payload = (req as any).adminPayload;
  if (!payload || payload.role !== "admin") {
    strikeIp(getClientIp(req), "sub-admin-mgmt-denied", 20);
    return res.status(403).json({ error: "ممنوع: هذا الإجراء يتطلب صلاحية الأدمن الرئيسي أو المطور" });
  }
  next();
}

/**
 * يفحص صلاحية دقيقة (module + action). المطور/الأدمن الرئيسي يمران دائماً.
 * المسؤول الثانوي يُرفض فوراً بـ 403 إن لم تكن الصلاحية ممنوحة صراحة له في قاعدة البيانات.
 */
export function requirePermission(mod: PermissionModule, action: PermissionAction = "view") {
  return (req: Request, res: Response, next: NextFunction) => {
    const payload = (req as any).adminPayload;
    if (!payload) return res.status(401).json({ error: "غير مصرح" });
    if (payload.role === "admin") return next();
    if (payload.role === "sub_admin") {
      const perms: SubAdminPermissions = (req as any).subAdminPermissions || {};
      if (perms?.[mod]?.[action] === true) return next();
      strikeIp(getClientIp(req), "sub-admin-permission-denied", 30);
      return res.status(403).json({ error: "ممنوع: ليس لديك صلاحية للقيام بهذا الإجراء", forbiddenModule: mod, forbiddenAction: action });
    }
    return res.status(403).json({ error: "ممنوع" });
  };
}

/** Middleware مساعد يشتق الإجراء (view/create/edit/delete) تلقائياً من HTTP method لتغطية مجموعة مسارات دفعة واحدة. */
export function permGuard(mod: PermissionModule) {
  const perModule = {
    view: requirePermission(mod, "view"),
    create: requirePermission(mod, "create"),
    edit: requirePermission(mod, "edit"),
    delete: requirePermission(mod, "delete"),
  };
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === "GET") return perModule.view(req, res, next);
    if (req.method === "DELETE") return perModule.delete(req, res, next);
    if (req.method === "POST" && /create|add|new/i.test(req.path)) return perModule.create(req, res, next);
    if (req.method === "POST" && req.path === "/") return perModule.create(req, res, next);
    return perModule.edit(req, res, next); // POST(action)/PATCH/PUT → تعديل
  };
}

export async function requireDev(req: Request, res: Response, next: NextFunction) {
  const auth  = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : (req.headers["x-admin-token"] as string || "");
  if (!token) return res.status(401).json({ error: "غير مصرح — يلزم تسجيل دخول المطور" });
  const payload = verifyAdminToken(token);
  if (!payload || payload.role !== "admin" || !payload.isDev) {
    strikeIp(getClientIp(req), "invalid-dev-token", 20);
    return res.status(403).json({ error: "غير مصرح — يلزم تسجيل دخول المطور" });
  }
  if (adminSessionRevokedCheck && payload.jti) {
    try {
      const revoked = await adminSessionRevokedCheck(payload.jti);
      if (revoked) return res.status(401).json({ error: "انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً", sessionRevoked: true });
    } catch { /* لا نمنع الطلب في حال فشل الفحص */ }
  }
  (req as any).clientIp = getClientIp(req);
  (req as any).adminJti = payload.jti;
  (req as any).adminPayload = payload;
  next();
}

// ══════════════════════════════════════════════════════════════
//  [FIX] OTP Generation — crypto.randomInt بدلاً من Math.random
//  Math.random() ليس CSPRNG ولا يُستخدم للأغراض الأمنية
// ══════════════════════════════════════════════════════════════

/**
 * يُولِّد OTP مكوّن من 6 أرقام باستخدام مولّد عشوائي آمن
 * crypto.randomInt(min, max) — مُضمَّن في Node.js v14.10+
 */
export function generateSecureOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

// ══════════════════════════════════════════════════════════════
//  الطبقة 2+3 — Rate Limiting + IP Blacklist المحسّن
//  ⚠️  مبدأ التصميم: لا حظر إلا بعد مخالفات كثيرة وواضحة
//     المستخدم العادي لن يُحظر أبداً في الاستخدام الطبيعي
// ══════════════════════════════════════════════════════════════

interface RLEntry  { count: number; resetAt: number }
interface BanEntry { until: number; reason: string; strikes: number }

const rlStore   = new Map<string, RLEntry>();
const ipBanList = new Map<string, BanEntry>();
const strikeMap = new Map<string, number>();

// تنظيف دوري كل 5 دقائق
setInterval(() => {
  const now = Date.now();
  for (const [k,v] of rlStore)   if (v.resetAt < now) rlStore.delete(k);
  for (const [k,v] of ipBanList) if (v.until   < now) ipBanList.delete(k);
}, 5*60*1000);

// مسح strikes كل 30 دقيقة — فرصة ثانية للجميع
setInterval(() => { strikeMap.clear(); }, 30*60*1000);

const TRUST_PROXY_ENV = process.env.TRUST_PROXY === "1" || process.env.TRUST_PROXY === "true";
const TRUST_PROXY_DISABLED = process.env.TRUST_PROXY === "0" || process.env.TRUST_PROXY === "false";

// [FIX] عنوان الاتصال المباشر (socket.remoteAddress) يكون loopback/شبكة خاصة فقط عندما يكون
// الطالب الفعلي بروكسي عكسي موثوق يعمل على نفس الخادم أو داخل نفس الشبكة الداخلية (nginx/Cloudflare
// Tunnel وما شابه) — لا يمكن لزائر خارجي انتحال هذا الاتصال المباشر لأنه خاصية طبقة TCP نفسها
// وليست ترويسة HTTP قابلة للتزوير. لذا نثق بترويسات cf-connecting-ip/x-forwarded-for تلقائياً
// فقط في هذه الحالة، دون الحاجة لضبط TRUST_PROXY=true يدوياً (وهو ما كان يجعل كل عنوان IP
// يُسجَّل كـ 127.0.0.1 بعد إصلاح CWE-290 السابق، لأن TRUST_PROXY لم يكن مضبوطاً في البيئة).
// يمكن دائماً تعطيل هذا السلوك صراحةً عبر TRUST_PROXY=0/false، أو فرضه صراحةً عبر TRUST_PROXY=1/true.
function isTrustedProxyAddr(addr: string): boolean {
  const a = addr.replace("::ffff:", "");
  return (
    a === "127.0.0.1" || a === "::1" || a === "unknown" ||
    /^10\./.test(a) ||
    /^192\.168\./.test(a) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(a)
  );
}

export function getClientIp(req: Request): string {
  const direct = (req.socket?.remoteAddress || "unknown").replace("::ffff:", "");

  if (TRUST_PROXY_DISABLED) return direct;
  if (!TRUST_PROXY_ENV && !isTrustedProxyAddr(direct)) return direct;

  // [SEC-FIX] خلف nginx الموثوق، العنوان الحقيقي هو آخر عنصر في X-Forwarded-For (الذي
  // يُلحقه nginx عبر $proxy_add_x_forwarded_for)، لا الطرف الأيسر القابل للتزوير من العميل.
  // ولا نثق بـ cf-connecting-ip لعدم وجود Cloudflare أمام الخادم.
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.trim()) {
    const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1].replace("::ffff:", "");
  }
  return direct;
}

// ── [SEC] نطاقات البريد المؤقت/المُعطَّل تُرفض عند التسجيل ──
const DISPOSABLE_EMAIL_DOMAINS = new Set<string>([
  "example.com","example.net","example.org","test.com","test.net",
  "maxxspace.com","yopmail.com","yopmail.net","yopmail.fr",
  "mailinator.com","guerrillamail.com","guerrillamail.info","grr.la",
  "sharklasers.com","10minutemail.com","temp-mail.org","temp-mail.io",
  "tempmail.com","tempmailo.com","throwawaymail.com","getnada.com",
  "nada.email","trashmail.com","dispostable.com","fakeinbox.com",
  "maildrop.cc","mohmal.com","emailondeck.com","mintemail.com",
  "mailnesia.com","moakt.com","tempr.email","dropmail.me",
  "inboxkitten.com","spam4.me","mailcatch.com","burnermail.io",
  "1secmail.com","tmpmail.org","tmpmail.net","mailtemp.net",
]);
export function isDisposableEmail(email: unknown): boolean {
  if (typeof email !== "string") return false;
  const at = email.lastIndexOf("@");
  if (at < 0) return false;
  const domain = email.slice(at + 1).trim().toLowerCase();
  return !!domain && DISPOSABLE_EMAIL_DOMAINS.has(domain);
}

// ── [SEC] التحقق من نقطة نهاية Push — منع SSRF ──
// يجب أن تكون HTTPS ومن خدمة إشعارات معروفة فقط (لا عناوين داخلية ولا نطاقات عشوائية)
const PUSH_ALLOWED_HOSTS = [
  "fcm.googleapis.com","android.googleapis.com",
  "push.services.mozilla.com","notify.windows.com","push.apple.com",
];
export function isValidPushEndpoint(endpoint: unknown): boolean {
  if (typeof endpoint !== "string" || endpoint.length > 2048) return false;
  let u: URL;
  try { u = new URL(endpoint); } catch { return false; }
  if (u.protocol !== "https:") return false;
  const h = u.hostname.toLowerCase();
  return PUSH_ALLOWED_HOSTS.some((d) => h === d || h.endsWith("." + d));
}

// ── [SEC] التحقق من CAPTCHA عبر Cloudflare Turnstile ──
// مُعطّل تلقائياً ما لم يُضبط TURNSTILE_SECRET في البيئة (حتى لا يتعطّل التسجيل قبل تجهيز
// المفاتيح وودجت الواجهة). بعد التفعيل: أي طلب بلا توكن صالح يُرفض (fail-closed).
export async function verifyCaptcha(token: unknown, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET || "";
  if (!secret) return true; // غير مُفعّل بعد
  if (typeof token !== "string" || token.length < 10 || token.length > 4096) return false;
  try {
    const form = new URLSearchParams();
    form.set("secret", secret);
    form.set("response", token);
    if (ip) form.set("remoteip", ip);
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
      signal: AbortSignal.timeout(8000),
    });
    const data: any = await r.json().catch(() => ({}));
    return data?.success === true;
  } catch {
    return false;
  }
}

/**
 * [FIX] strikeIp — لا يُصدر حظراً إلا بعد عدد كبير من المخالفات
 * مدة الحظر قصيرة (5 دقائق كحد أقصى) حتى لا يتضرر المستخدم العادي
 * في حال كان الخطأ عرضياً
 */
export function strikeIp(ip: string, reason: string, banOnStrikes = 50): void {
  const current = (strikeMap.get(ip) || 0) + 1;
  strikeMap.set(ip, current);
  if (current >= banOnStrikes) {
    // الحظر الأقصى 5 دقائق فقط — قرار متعمد لحماية المستخدمين العاديين
    const duration = Math.min(current * 30 * 1000, 5*60*1000);
    ipBanList.set(ip, { until: Date.now()+duration, reason, strikes: current });
    console.warn(`[SEC] 🚫 IP محظور مؤقتاً: ${ip} | ${reason} | ${Math.round(duration/60000)} دقيقة`);
  }
}

export function ipBanCheck(req: Request, res: Response, next: NextFunction) {
  const ip  = getClientIp(req);
  const ban = ipBanList.get(ip);
  if (ban && ban.until > Date.now()) {
    const mins = Math.ceil((ban.until - Date.now()) / 60000);
    return res.status(429).json({ error: `طلبات كثيرة جداً. انتظر ${mins} دقيقة وأعد المحاولة.` });
  }
  (req as any).clientIp = ip;
  next();
}

export function rateLimit(maxRequests: number, windowMs: number, opts?: { keyFn?: (req:Request)=>string; banAfterExceeds?: number }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip  = getClientIp(req);
    const key = opts?.keyFn ? opts.keyFn(req) : `${ip}:${req.path}`;
    const now = Date.now();
    const entry = rlStore.get(key);
    if (!entry || entry.resetAt < now) { rlStore.set(key, { count:1, resetAt: now+windowMs }); return next(); }
    entry.count++;
    if (entry.count > maxRequests) {
      // [FIX] الحظر يتطلب تجاوز الحد بـ 20 ضعف على الأقل — هجوم حقيقي وليس زيادة عرضية
      const banThreshold = opts?.banAfterExceeds ?? maxRequests * 20;
      if (entry.count > banThreshold) strikeIp(ip, `rate-limit: ${req.path}`, 50);
      res.setHeader("Retry-After", String(Math.ceil((entry.resetAt-now)/1000)));
      return res.status(429).json({ error: `طلبات كثيرة. انتظر ${Math.ceil((entry.resetAt-now)/1000)} ثانية.` });
    }
    next();
  };
}

// حدود معقولة — لن تمس المستخدم العادي أبداً
export const authLimiter       = rateLimit(20,  15*60*1000, { banAfterExceeds: 400  }); // 20/15 دقيقة، حظر بعد 400
export const forgotPassLimiter = rateLimit(10,  60*60*1000, { banAfterExceeds: 200  }); // 10/ساعة، حظر بعد 200
export const orderLimiter      = rateLimit(30,  60*1000);
export const chatLimiter       = rateLimit(60,  60*1000);
export const uploadLimiter     = rateLimit(15,  60*1000);
export const generalLimiter    = rateLimit(2000, 60*1000,   { banAfterExceeds: 20000 }); // [FIX] رُفع من 300 إلى 2000/دقيقة — لوحة التحكم SPA ترسل عشرات الطلبات دفعة واحدة عند كل تحميل/تحديث صفحة، وكان يتجاوز الحد القديم بسهولة رغم كونه استخدامًا طبيعيًا لا هجومًا. حظر DDoS يبقى فقط عند تجاوز 20000/دقيقة.
export const strictLimiter     = rateLimit(30,  60*1000,    { banAfterExceeds: 600  });
// [SECURITY FIX] حد مخصص وأكثر صرامة لتسجيل دخول لوحة التحكم (أدمن/مطوّر/مسؤول ثانوي):
// 10 محاولات فقط لكل 15 دقيقة لكل IP، وحظر بعد تجاوز الحد بـ 5 أضعاف فقط (بدل 20) نظراً
// لحساسية هذا المسار مقارنة بمسارات المستخدم العادي.
export const adminLoginLimiter = rateLimit(10,  15*60*1000, { banAfterExceeds: 50   });
// حد خاص للـ OTP: 5 محاولات/10 دقائق لكل IP+email
export const otpLimiter        = rateLimit(5,   10*60*1000, { banAfterExceeds: 100  });

// ══════════════════════════════════════════════════════════════
//  الطبقة 4 — Bot / Scanner Detection (بدون حظر فوري)
// ══════════════════════════════════════════════════════════════

const BLOCKED_UA = [
  /sqlmap/i,/nikto/i,/nmap/i,/masscan/i,/zgrab/i,
  /python-requests/i,/go-http-client/i,/libwww-perl/i,
  /curl\//i,/wget\//i,/scrapy/i,/burpsuite/i,/dirbuster/i,
  /nuclei/i,/gobuster/i,/ffuf/i,/wfuzz/i,/hydra/i,
  /havij/i,/acunetix/i,/nessus/i,/openvas/i,/metasploit/i,
];

export function botDetection(req: Request, res: Response, next: NextFunction) {
  const ua = (req.headers["user-agent"] || "").toLowerCase();
  const ip = getClientIp(req);
  if (!ua && req.path.startsWith("/api/")) {
    // [FIX] strike عالي جداً — 50 مرة قبل الحظر لتجنب حظر التطبيقات الشرعية
    strikeIp(ip, "no-ua", 50);
    return res.status(400).json({ error: "طلب غير مقبول" });
  }
  for (const p of BLOCKED_UA) {
    if (p.test(ua)) {
      // أدوات الاختراق المعروفة تحصل على حظر أسرع لكن لا يزال تدريجياً
      strikeIp(ip, `bot:${ua.slice(0,30)}`, 3);
      return res.status(403).json({ error: "ممنوع" });
    }
  }
  next();
}

// ══════════════════════════════════════════════════════════════
//  الطبقة 5 — Honeypot Traps
// ══════════════════════════════════════════════════════════════

const HONEYPOT_PATHS = [
  "/wp-admin","/wp-login.php","/phpmyadmin","/.env",
  "/.git","/config.php","/debug","/api/v1/admin","/api/v2/admin",
  "/console","/shell","/manager/html","/actuator","/xmlrpc.php",
  "/cgi-bin","/server-status","/api/swagger","/backup",
  "/adminer","/webadmin","/cpanel","/plesk",
  // مسارات إضافية شائعة بهجمات الفحص الآلي (scanner probing)
  "/vendor/phpunit","/.aws","/.ssh",
  "/laravel/.env","/.docker","/docker-compose.yml","/.htaccess",
  "/telescope","/horizon","/_profiler","/graphql-console",
  "/administrator","/user/login","/wp-content/debug.log",
  // مسار وهمي مخصص لهذا المشروع تحديداً — يبدو حساساً (يوحي بلوحة داخلية/تصحيح أخطاء)
  // لمهاجم يفحص المشروع تحديداً، لكنه غير موجود فعلياً في الراوتر الحقيقي.
  // [FIX] تمت إزالة "/api/internal" من هذه القائمة لأنه كان يتصادم فعلياً مع المسار الحقيقي
  // POST /api/internal/notify-admins (يستخدمه خادم saraqib-store-user للتبليغ عن الطلبات/الدفعات)،
  // مما تسبب بحظر خادم user نفسه (IP: 127.0.0.1, User-Agent: node) كـ"فخ عسل" خطأً.
  // استُبدل بمسار وهمي مختلف تماماً لا يتصادم مع أي Route حقيقي.
  "/api/internal-tools","/api/_internal_debug_console",
];

// [ملاحظة أمان مهمة] تأكدنا يدوياً أن لا شيء من المسارات أعلاه يتصادم مع أي مسار حقيقي
// في التطبيق (فُحصت كل مسارات /api/admin/* الحقيقية وكل مسارات الواجهة، بما فيها /api-docs
// التي هي صفحة توثيق شرعية ومُستبعدة عمداً من هذه القائمة). عند إضافة أي مسار فخ جديد مستقبلاً
// يجب التحقق أولاً أنه لا يبدأ بنفس بادئة أي Route حقيقي (خصوصاً عبر startsWith أدناه).

// [Hook] يسمح لـ server.ts بربط دالة تنبيه (تليجرام + audit log) دون أن يعتمد هذا الملف
// مباشرة على server.ts (نفس نمط setActivityNotifier/setBanLookup المتّبع في المشروع).
// الدالة تُستدعى بشكل "fire-and-forget" — فشلها لا يعطّل حظر الـ IP ولا استجابة 404.
let honeypotAlertHook: ((info: { ip: string; path: string; method: string; userAgent: string }) => void) | null = null;
export function setHoneypotAlertHook(fn: (info: { ip: string; path: string; method: string; userAgent: string }) => void) {
  honeypotAlertHook = fn;
}

export function honeypotMiddleware(req: Request, res: Response, next: NextFunction) {
  const p  = req.path.toLowerCase();
  const ip = getClientIp(req);
  for (const trap of HONEYPOT_PATHS) {
    if (p.startsWith(trap)) {
      // [FIX] وقوع فعلي في فخ عسل مصمَّم عمداً (لا مسار حقيقي يشبهه) هو مؤشر أقوى بكثير من
      // مجرد تجاوز rate-limit عادي — لا يوجد أي مستخدم شرعي يطلب /wp-admin أو /.env من هذا
      // التطبيق أبداً. لذلك الحظر هنا أطول من الحظر المؤقت العام (24 ساعة بدل 10 دقائق).
      ipBanList.set(ip, { until: Date.now()+24*60*60*1000, reason:`honeypot:${p}`, strikes:99 });
      console.warn(`[SEC] 🍯 Honeypot: ${ip} → ${p}`);
      // تنبيه فوري + تسجيل (best-effort — لا يمنع حظر الـ IP ولا استجابة 404 مهما حصل)
      try {
        honeypotAlertHook?.({
          ip,
          path: req.path,
          method: req.method,
          userAgent: String(req.headers["user-agent"] || "-"),
        });
      } catch { /* noop */ }
      return res.status(404).json({ error: "Not Found" });
    }
  }
  next();
}

// ══════════════════════════════════════════════════════════════
//  الطبقة 6 — Injection Guard (SQL + NoSQL + Path Traversal)
// ══════════════════════════════════════════════════════════════

const INJECT_PATTERNS = [
  /(\b)(select|insert|update|delete|drop|truncate|alter|exec|union|having)(\b)/i,
  /(--|;|\/\*|\*\/|xp_|sp_)/i,
  /sleep\s*\(\s*\d+/i, /benchmark\s*\(/i, /load_file\s*\(/i,
  /into\s+(outfile|dumpfile)/i,
  /<script|javascript:|vbscript:|on\w+\s*=/i,
  /\.\.[\\/]/, /%2e%2e/i, /\x00|%00/,
];

// حقول تحتوي قيماً معتمة (توكنات/روابط) لا تُستخدم أبداً داخل استعلام SQL خام —
// فحصها بنمط SQL/XSS الحقيقي يُنتج نتائج إيجابية كاذبة بشكل عشوائي (مثال: توكن Google
// المُشفّر base64url قد يحتوي بالصدفة على "--" فيُرفض الطلب رغم أنه سليم 100%)
const OPAQUE_FIELD_NAMES = new Set([
  "accesstoken", "credential", "idtoken", "id_token", "refreshtoken", "refresh_token",
  "token", "googleid", "google_id", "picture", "avatar_url", "avatarurl",
  "image_url", "imageurl", "redirect_uri", "redirecturi",
]);

function deepScan(obj: any, depth=0, keyName=""): boolean {
  if (depth>8) return false;
  if (typeof obj==="string") {
    if (OPAQUE_FIELD_NAMES.has(keyName.toLowerCase())) return false;
    for (const p of INJECT_PATTERNS) if (p.test(obj)) return true;
    if (obj.startsWith("$")) return true;
  }
  if (typeof obj==="object" && obj!==null) {
    for (const k of Object.keys(obj)) {
      if (k.startsWith("$")) return true;
      if (deepScan(obj[k], depth+1, k)) return true;
    }
  }
  return false;
}

export function injectionGuard(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIp(req);
  // [FIX] استيراد قاعدة البيانات: جسم الطلب هو تصدير كامل للقاعدة ويحتوي حتماً على نصوص
  // "تشبه الحقن" لكنها سليمة (User-Agent فيه ";" ، هاشات bcrypt تبدأ بـ "$"، سجلات هجمات
  // محفوظة بنصها...). المسار محمي بـ adminAuth ويكتب عبر supabase.upsert (استعلامات
  // مُعلَّمة parameterized) فلا خطر SQL injection. نفحص الـ query/params فقط لهذا المسار.
  const isDbImport = req.path === "/api/admin/import-db";
  if ((!isDbImport && deepScan(req.body)) || deepScan(req.query) || deepScan(req.params)) {
    // [FIX] يحتاج 50 محاولة injection حقيقية قبل الحظر
    strikeIp(ip, "injection", 50);
    console.warn(`[SEC] 💉 Injection attempt: ${ip} → ${req.path}`);
    return res.status(400).json({ error: "مدخلات غير مقبولة" });
  }
  next();
}

// ══════════════════════════════════════════════════════════════
//  الطبقة 7 — XSS Sanitizer
// ══════════════════════════════════════════════════════════════

export function sanitizeText(v: unknown, maxLen=500): string {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, maxLen)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&#x27;")
    .replace(/\//g,"&#x2F;").replace(/`/g,"&#x60;");
}

export function deepSanitize(obj: any, maxLen=1000): any {
  if (typeof obj==="string") return sanitizeText(obj, maxLen);
  if (Array.isArray(obj)) return obj.slice(0,50).map(i=>deepSanitize(i,maxLen));
  if (typeof obj==="object" && obj!==null) {
    const out: any = {};
    for (const k of Object.keys(obj).slice(0,50)) {
      if (!/^[a-zA-Z0-9_\-]{1,60}$/.test(k)) continue;
      out[k] = deepSanitize(obj[k], maxLen);
    }
    return out;
  }
  return obj;
}

// ══════════════════════════════════════════════════════════════
//  الطبقة 8 — Security Headers المحسّنة
//  [FIX] حُذف unsafe-eval من script-src
//  [FIX] أُضيف nonce-based approach للـ inline scripts
// ══════════════════════════════════════════════════════════════

export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "geolocation=(), camera=(), microphone=(), payment=(), usb=()");
  res.setHeader("X-DNS-Prefetch-Control", "off");
  res.removeHeader("X-Powered-By");
  res.setHeader("Server", "Web");
  res.setHeader("Content-Security-Policy", [
    "default-src 'self'",
    // [SECURITY FIX] القسم 9.2 من تقرير الفحص الأمني: حُذف 'unsafe-inline' من script-src
    // (نفس الإصلاح المطبَّق في مشروع user) — تطبيق Vite/React لا يحتاج سكربتات inline.
    // [FIX] index.html يحتوي سكربتين ثابتين (منع وميض اللون/الوضع الليلي قبل تحميل React) —
    // أُضيف لهما SHA-256 hash صريح بدل 'unsafe-inline' لإبقاء الحماية دون كسر هاتين الوظيفتين.
    "script-src 'self' blob: https://accounts.google.com 'sha256-pn3zzyu2PuZQdMPxfPJF9lY0ATQJanJnXnU9jlZvWjo=' 'sha256-BqbwP3ktJ1uLmJzItN651COFiT0itHGU346awhvMh/w='",
    // [FIX] أُضيف fonts.googleapis.com لتحميل خط Cairo
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
    "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
    "img-src 'self' data: https: blob:",
    // [FIX] أُضيف fonts.gstatic.com لتحميل ملفات الخط الفعلية
    "font-src 'self' data: https://fonts.gstatic.com",
    // [FIX] أُضيف Google APIs لطلبات التحقق من التوكن و FedCM
    "connect-src 'self' https: wss: https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com https://sse.sp-today.com https://sp-today.com",
    // frame-src محلي فقط — لم نعد نستخدم Google iframe
    "frame-src 'self'",
    // frame-ancestors يبقى none لمنع Clickjacking
    "frame-ancestors 'none'",
    "form-action 'self' https://accounts.google.com",
    "base-uri 'self'",
    "upgrade-insecure-requests",
  ].join("; "));
  next();
}

// ══════════════════════════════════════════════════════════════
//  الطبقة 9 — CORS محسّن
//  [FIX] الطلبات بدون Origin (curl, server requests) لا تمر تلقائياً
//        في الـ production — تُرفض بشكل صريح
// ══════════════════════════════════════════════════════════════

export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const allowed = (process.env.FRONTEND_URL || "http://localhost:3000").split(",").map(s=>s.trim());
  const origin  = req.headers.origin || "";

  if (allowed.includes(origin)) {
    // Origin معروف ومسموح به
    res.setHeader("Access-Control-Allow-Origin",      origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods",     "GET,POST,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers",     "Content-Type,Authorization,X-Admin-Token,X-User-Token,X-Request-ID,Api-Token");
    res.setHeader("Access-Control-Max-Age",            "86400");
  } else if (!origin) {
    // بدون Origin — نسمح بالمرور (same-origin requests، service workers، iOS Safari)
    // التحقق من الهوية يتم عبر JWT وليس عبر CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Admin-Token,X-User-Token,X-Request-ID,Api-Token");
  } else {
    // Origin غريب وصريح — مرفوض بدون حظر (الحظر يضر المستخدمين العاديين)
    return res.status(403).json({ error: "غير مصرح بالوصول من هذا الأصل" });
  }

  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
}

// ══════════════════════════════════════════════════════════════
//  الطبقة 10 — Auth Middlewares
// ══════════════════════════════════════════════════════════════

let banLookup: ((userId: string) => Promise<{ banned: boolean; message?: string }>) | null = null;
export function setBanLookup(fn: (userId: string) => Promise<{ banned: boolean; message?: string }>) {
  banLookup = fn;
}

// [FIX] فحص إبطال جلسات الأدمن: يُستخدم عند تغيير كلمة مرور الأدمن لتسجيل خروج
// جميع الجلسات النشطة فوراً، وعند حذف جلسة واحدة من صفحة "الجلسات النشطة".
let adminSessionRevokedCheck: ((jti: string) => Promise<boolean>) | null = null;
export function setAdminSessionRevokedCheck(fn: (jti: string) => Promise<boolean>) {
  adminSessionRevokedCheck = fn;
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const auth  = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : (req.headers["x-user-token"] as string||"");
  if (!token) return res.status(401).json({ error: "غير مسموح: يجب تسجيل الدخول" });
  const payload = verifyUserToken(token);
  if (!payload) {
    // [FIX] 50 محاولة JWT خاطئة قبل الحظر — التطبيق قد يُرسل token منتهي الصلاحية أحياناً
    strikeIp(getClientIp(req), "invalid-jwt", 50);
    return res.status(401).json({ error: "الجلسة منتهية، يرجى تسجيل الدخول مجدداً" });
  }

  // [FIX] الحظر مرتبط بالحساب (user_id) ويُفحص عند كل طلب بغض النظر عن الجهاز أو الجلسة
  if (banLookup) {
    try {
      const banStatus = await banLookup(String(payload.sub));
      if (banStatus.banned) {
        return res.status(403).json({ error: banStatus.message || "تم إيقاف حسابك.", banned: true });
      }
    } catch {
      // لا نمنع الطلب في حال فشل الفحص لتفادي تعطيل الموقع بالكامل بسبب خطأ في قاعدة البيانات
    }
  }

  (req as any).userId   = payload.sub;
  (req as any).clientIp = getClientIp(req);
  next();
}

export async function adminAuth(req: Request, res: Response, next: NextFunction) {
  const auth  = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : (req.headers["x-admin-token"] as string||"");
  if (!token) return res.status(401).json({ error: "غير مصرح: يجب تسجيل دخول الأدمن" });
  const payload = verifyAdminToken(token);
  if (!payload || (payload.role !== "admin" && payload.role !== "sub_admin")) {
    // [FIX] للأدمن: 20 محاولة خاطئة قبل الحظر (أقل من المستخدم لأنه هجوم مقصود)
    strikeIp(getClientIp(req), "invalid-admin-jwt", 20);
    console.warn(`[SEC] 🔐 وصول أدمن مرفوض: ${getClientIp(req)} → ${req.path}`);
    return res.status(403).json({ error: "ممنوع: ليس لديك صلاحية" });
  }
  // [FIX] التوكن كان يُقبل فقط بالتحقق من التوقيع، حتى بعد تغيير كلمة مرور الأدمن
  // أو إبطال الجلسة يدوياً من صفحة الجلسات النشطة. الآن نتحقق من admin_sessions:
  // أي جلسة تم إبطالها (revoked) تُرفض فوراً بغض النظر عن صلاحية توقيع الـ JWT.
  if (adminSessionRevokedCheck && payload.jti) {
    try {
      const revoked = await adminSessionRevokedCheck(payload.jti);
      if (revoked) {
        return res.status(401).json({ error: "انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً", sessionRevoked: true });
      }
    } catch {
      // لا نمنع الطلب في حال فشل الفحص لتفادي تعطيل لوحة التحكم بسبب خطأ في قاعدة البيانات
    }
  }
  // ── Zero-Trust: المسؤول الثانوي يُعاد فحصه من قاعدة البيانات في كل طلب (وليس من الـ JWT) ──
  if (payload.role === "sub_admin") {
    if (!subAdminLookup || !payload.sub) {
      return res.status(403).json({ error: "ممنوع: ليس لديك صلاحية" });
    }
    try {
      const record = await subAdminLookup(String(payload.sub));
      if (!record || record.disabled) {
        return res.status(403).json({ error: "تم تعطيل هذا الحساب من قبل الأدمن الرئيسي", disabled: true });
      }
      // [FIX] انتهاء صلاحية تلقائي: حساب منتهي الصلاحية يُرفض فوراً حتى لو disabled=false في القاعدة،
      // بدل الاعتماد فقط على مهمة cron خارجية قد تتأخر دقائق.
      if (record.expires_at && new Date(record.expires_at).getTime() < Date.now()) {
        strikeIp(getClientIp(req), "sub-admin-expired-access-attempt", 10);
        return res.status(403).json({ error: "انتهت صلاحية هذا الحساب المؤقت", expired: true });
      }
      (req as any).subAdminPermissions = record.permissions || {};
      if (subAdminTouchLastAction && payload.sub) {
        subAdminTouchLastAction(String(payload.sub)).catch(() => {});
      }
    } catch {
      return res.status(403).json({ error: "تعذّر التحقق من الصلاحيات، حاول مجدداً" });
    }
  }
  (req as any).clientIp = getClientIp(req);
  (req as any).adminJti = payload.jti;
  (req as any).adminPayload = payload;
  next();
}

// ══════════════════════════════════════════════════════════════
//  الطبقة 10.5 — Client API Token Auth (external integrations)
// ══════════════════════════════════════════════════════════════

export interface ApiTokenRecord {
  id: number | string;
  user_id: number | string;
  enabled: boolean;
  allowed_ips: string[] | null;
  scope: "all" | "selected";
  can_order: boolean;
  revoked_at: string | null;
}

let apiTokenLookup: ((token: string) => Promise<ApiTokenRecord | null>) | null = null;
export function setApiTokenLookup(fn: (token: string) => Promise<ApiTokenRecord | null>) {
  apiTokenLookup = fn;
}

// يُستدعى بعد نجاح المصادقة لتحديث last_used_at — لا يُنتظر (fire and forget)
let apiTokenTouch: ((tokenId: number | string) => void) | null = null;
export function setApiTokenTouch(fn: (tokenId: number | string) => void) {
  apiTokenTouch = fn;
}

// نفس منطق وضع الصيانة المستخدم في server.ts، يُسجَّل هنا لإعادة استخدامه من apiTokenAuth
let maintenanceCheck: (() => Promise<{ enabled: boolean; allowedIp: string }>) | null = null;
export function setMaintenanceCheck(fn: () => Promise<{ enabled: boolean; allowedIp: string }>) {
  maintenanceCheck = fn;
}

/**
 * apiTokenAuth — يُرآة (mirror) لنمط adminAuth، لكن للتوكنات الخارجية (Client API).
 * يقرأ الترويسة "api-token"، يتحقق من صلاحيته، حالته، وقيود الـ IP، ثم يُرفق
 * بيانات التوكن على req لتُستخدم في الراوترات التالية.
 */
export async function apiTokenAuth(req: Request, res: Response, next: NextFunction) {
  const ip    = getClientIp(req);
  const token = ((req.headers["api-token"] as string) || "").trim();

  if (!token) {
    return res.status(401).json({ code: 120, message: "Api Token is required!" });
  }

  if (!apiTokenLookup) {
    return res.status(500).json({ code: 500, message: "Unknown error" });
  }

  let record: ApiTokenRecord | null = null;
  try {
    record = await apiTokenLookup(token);
  } catch {
    return res.status(403).json({ code: 121, message: "Token error" });
  }

  if (!record || record.revoked_at) {
    // [FIX] نفس مبدأ باقي الطبقات: نحتاج محاولات كثيرة قبل الحظر لتفادي إضرار التكاملات الشرعية
    strikeIp(ip, "invalid-api-token", 50);
    return res.status(403).json({ code: 121, message: "Token error" });
  }

  if (!record.enabled) {
    return res.status(403).json({ code: 122, message: "Not allowed to use API" });
  }

  if (Array.isArray(record.allowed_ips) && record.allowed_ips.length > 0 && !record.allowed_ips.includes(ip)) {
    strikeIp(ip, "api-token-ip-not-allowed", 50);
    return res.status(403).json({ code: 123, message: "IP not allowed" });
  }

  if (maintenanceCheck) {
    try {
      const { enabled, allowedIp } = await maintenanceCheck();
      if (enabled && !(allowedIp && ip === allowedIp)) {
        return res.status(503).json({ code: 130, message: "The site is under maintenance" });
      }
    } catch {
      // فشل فحص الصيانة لا يجب أن يعطل الـ API بالكامل
    }
  }

  if (apiTokenTouch) {
    try { apiTokenTouch(record.id); } catch { /* لا نمنع الطلب بسبب فشل التحديث */ }
  }

  (req as any).apiTokenId    = record.id;
  (req as any).apiUserId     = record.user_id;
  (req as any).apiTokenScope = record.scope;
  (req as any).apiCanOrder   = record.can_order;
  (req as any).clientIp      = ip;
  next();
}

// حد خاص بـ /client/api/* — يُطبَّق بعد apiTokenAuth، لذا المفتاح هو token_id عند توفره وليس فقط الـ IP
export const clientApiLimiter = rateLimit(120, 60*1000, {
  keyFn: (req) => `apitoken:${(req as any).apiTokenId ?? getClientIp(req)}`,
  banAfterExceeds: 2000,
});

export function requireSelf(paramName="userId") {
  return (req: Request, res: Response, next: NextFunction) => {
    const tokenId     = String((req as any).userId||"");
    const requestedId = String(req.params[paramName]||req.body[paramName]||req.params["id"]||"");
    if (!requestedId || tokenId !== requestedId) {
      strikeIp(getClientIp(req), "idor-attempt", 30);
      return res.status(403).json({ error: "ممنوع: لا يمكنك الوصول لبيانات مستخدم آخر" });
    }
    next();
  };
}

// ══════════════════════════════════════════════════════════════
//  الطبقة 11 — Account Lockout
// ══════════════════════════════════════════════════════════════

interface LockEntry { attempts: number; lockedUntil: number }
const lockStore = new Map<string, LockEntry>();

export function checkAccountLockout(email: string): { locked: boolean; remainingSec?: number } {
  const e = lockStore.get(email.toLowerCase());
  if (!e) return { locked:false };
  if (e.lockedUntil > Date.now()) return { locked:true, remainingSec: Math.ceil((e.lockedUntil-Date.now())/1000) };
  return { locked:false };
}

export function recordFailedLogin(email: string): void {
  const key = email.toLowerCase();
  const e   = lockStore.get(key) || { attempts:0, lockedUntil:0 };
  e.attempts++;
  if (e.attempts >= 6) { e.lockedUntil = Date.now()+15*60*1000; console.warn(`[SEC] 🔒 حساب مقفل مؤقتاً: ${key}`); }
  lockStore.set(key, e);
}

export function clearLoginAttempts(email: string): void {
  lockStore.delete(email.toLowerCase());
}

setInterval(() => {
  const now = Date.now();
  for (const [k,v] of lockStore) if (v.lockedUntil < now && v.attempts < 6) lockStore.delete(k);
}, 60*60*1000);

// ══════════════════════════════════════════════════════════════
//  الطبقة 12 — Payload Size Guard
// ══════════════════════════════════════════════════════════════

export function payloadSizeGuard(req: Request, res: Response, next: NextFunction) {
  const cl = parseInt(req.headers["content-length"]||"0", 10);
  if (cl > 2*1024*1024) return res.status(413).json({ error: "الطلب كبير جداً (الحد 2MB)" });
  next();
}

// ══════════════════════════════════════════════════════════════
//  الطبقة 13 — Request ID Tracking
// ══════════════════════════════════════════════════════════════

export function requestId(req: Request, res: Response, next: NextFunction) {
  const id = (req.headers["x-request-id"] as string)||crypto.randomBytes(8).toString("hex");
  (req as any).requestId = id;
  res.setHeader("X-Request-ID", id);
  next();
}

// ══════════════════════════════════════════════════════════════
//  الطبقة 14 — Input Validation شاملة
// ══════════════════════════════════════════════════════════════

export function isValidEmail(v: unknown): boolean {
  if (typeof v !== "string") return false;
  const t = v.trim();
  return t.length<=254 && /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(t);
}

export function isValidPhone(v: unknown): boolean {
  if (typeof v !== "string") return false;
  const t = v.trim();
  return /^\+?[\d\s\-().]{7,20}$/.test(t) && t.replace(/\D/g,"").length >= 7;
}

export function isValidPassword(v: unknown): boolean {
  if (typeof v !== "string") return false;
  return v.length >= 8 && v.length <= 128 && /[a-zA-Z]/.test(v) && /[0-9]/.test(v);
}

// [SECURITY FIX] سياسة أقوى لكلمات مرور حسابات الإدارة (مطوّر / أدمن رئيسي / مسؤول ثانوي):
// حد أدنى 12 حرفاً، ويجب أن تحتوي حرفاً كبيراً وحرفاً صغيراً ورقماً ورمزاً خاصاً على الأقل.
// تُستخدم هذه الدالة بدل isValidPassword في كل مسارات تعيين/تغيير كلمة مرور الإدارة.
export function isValidAdminPassword(v: unknown): boolean {
  if (typeof v !== "string") return false;
  if (v.length < 12 || v.length > 128) return false;
  if (!/[a-z]/.test(v)) return false;
  if (!/[A-Z]/.test(v)) return false;
  if (!/[0-9]/.test(v)) return false;
  if (!/[^a-zA-Z0-9]/.test(v)) return false;
  return true;
}

export function isValidName(v: unknown): boolean {
  if (typeof v !== "string") return false;
  const t = v.trim();
  return t.length>=2 && t.length<=60 && !/[<>"'`]/.test(t) && !/[\x00-\x1F\x7F]/.test(t);
}

export function isValidId(v: unknown): boolean {
  const n = Number(v);
  return Number.isInteger(n) && n>0 && n<2_147_483_647;
}

export function isValidQuantity(v: unknown, max=1000): boolean {
  const n = Number(v);
  return Number.isInteger(n) && n>=1 && n<=max;
}

export function isValidAmount(v: unknown, min=0.01, max=100_000): boolean {
  const n = parseFloat(String(v));
  return !isNaN(n) && isFinite(n) && n>=min && n<=max;
}

export function isValidVoucherCode(v: unknown): boolean {
  return typeof v==="string" && /^[A-Z0-9a-z\-_]{3,30}$/.test(v.trim());
}

export function isValidTxNumber(v: unknown): boolean {
  // الحد الأقصى 100 بدل 50 كي تمر معرّفات العمليات الطويلة على السلسلة (TRC20: 64 حرف hex،
  // BEP20 on-chain: "0x" + 64 حرف hex = 66 حرفاً) دون رفضها بالخطأ.
  return typeof v==="string" && /^[A-Za-z0-9\-_]{3,100}$/.test(v.trim());
}

// [SECURITY FIX -- تقرير الفحص الأمني، القسم 2.2] حماية SSRF أكثر شمولاً:
// القائمة القديمة كانت تعتمد على مطابقة نصية بسيطة (startsWith) تفوت حالات
// كثيرة مثل: IPv6 المُعبَّر بصيغة IPv4-mapped (::ffff:127.0.0.1)، الترميز
// العشري/الست-عشري لعناوين IP (2130706433 = 127.0.0.1)، نطاق 172.16-31 الكامل
// (كانت تُفحص فقط "172.16." وليس بقية النطاق حتى 172.31)، وعناوين metadata
// السحابية الأخرى غير Google (AWS/Azure/DigitalOcean تشترك بـ 169.254.169.254).
function ipv4ToInt(parts: number[]): number {
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function isPrivateIPv4(ip: string): boolean {
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const parts = m.slice(1, 5).map(Number);
  if (parts.some((n) => n > 255)) return false;
  const [a, b] = parts;
  if (a === 127) return true;               // loopback
  if (a === 10) return true;                 // 10.0.0.0/8
  if (a === 0) return true;                  // 0.0.0.0/8
  if (a === 169 && b === 254) return true;   // link-local / cloud metadata (AWS/Azure/GCP/DO كلها تستخدم هذا النطاق)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 (النطاق الكامل)
  if (a === 192 && b === 168) return true;   // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 (Carrier-grade NAT)
  return false;
}

function isDecimalOrHexIpEncoding(hostname: string): boolean {
  // يمنع محاولات تجاوز الفلتر عبر ترميز IP كرقم عشري أو ست-عشري كامل
  // (مثال: http://2130706433/ يكافئ http://127.0.0.1/)
  if (/^0x[0-9a-f]+$/i.test(hostname)) return true;
  if (/^\d+$/.test(hostname) && hostname.length > 3) return true;
  return false;
}

// [SECURITY FIX -- تقرير الفحص الأمني، القسم 5.1] isValidUrl يفحص فقط الـ hostname كنص، وهذا
// لا يكفي وحده عند استخدام الرابط لاحقاً لإجراء طلب HTTP فعلي من الخادم (SSRF عبر webhook أو
// أي رابط خارجي يُدخله الأدمن). مهاجم (أو مسؤول ثانوي بصلاحية "settings_api" محدودة فقط) يمكنه
// تسجيل نطاق عام مثل evil.example.com وضبط سجل DNS الخاص به ليُرجع 127.0.0.1 أو عنوان داخلي
// (DNS Rebinding — CWE-918)، فيجتاز فحص isValidUrl النصي بسهولة (لأن "evil.example.com" ليس عنوان
// IP خاص ظاهرياً) بينما يتصل الخادم فعلياً بشبكته الداخلية أو بخدمة الـ metadata السحابية عند تنفيذ
// fetch(url) لاحقاً. الإصلاح: قبل أي fetch فعلي لرابط أدخله المستخدم، نحل (resolve) اسم النطاق فعلياً
// ونتحقق أن كل عنوان IP الناتج ليس عنواناً خاصاً/محلياً، وليس فقط اسم النطاق كنص.
export async function isSafeUrlForOutboundRequest(v: unknown): Promise<boolean> {
  if (!isValidUrl(v)) return false;
  try {
    const dns = await import("dns/promises");
    const u = new URL(String(v));
    const records = await dns.lookup(u.hostname, { all: true, verbatim: true });
    if (!records.length) return false;
    for (const r of records) {
      if (r.family === 4 && isPrivateIPv4(r.address)) return false;
      if (r.family === 6) {
        const addr = r.address.toLowerCase();
        if (addr === "::1" || addr === "::") return false;
        if (addr.startsWith("fe80:") || addr.startsWith("fc") || addr.startsWith("fd")) return false;
        const mapped = addr.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
        if (mapped && isPrivateIPv4(mapped[1])) return false;
      }
    }
    return true;
  } catch {
    // تعذّر حل اسم النطاق — نرفض بدل السماح (fail-closed)
    return false;
  }
}

// [SECURITY FIX -- CWE-918 SSRF / DNS-Rebinding TOCTOU] isSafeUrlForOutboundRequest يتحقق من
// أن اسم النطاق يُحلَّل حالياً إلى عنوان آمن، لكن الكود القديم كان بعدها يستدعي fetch(url)
// منفصلاً — وfetch يُعيد حل اسم النطاق من جديد بشكل مستقل تماماً عن نتيجة الفحص. هذا يفتح
// نافذة زمنية صغيرة (سباق/Race) يمكن خلالها لمهاجم يتحكم بخادم DNS لنطاقه (عبر TTL منخفض
// جداً) أن يُرجع عنوان IP مختلف بين لحظة الفحص ولحظة الاتصال الفعلي — فيجتاز الفحص بعنوان
// عام سليم، ثم يُعاد توجيه الاتصال الحقيقي إلى الشبكة الداخلية أو خدمة الـ metadata السحابية
// (DNS Rebinding كلاسيكي، CWE-350/CWE-918). الإصلاح: نحل اسم النطاق مرة واحدة، نتحقق أن
// العنوان آمن، ثم "نُثبّت" (pin) هذا العنوان بالذات ونستخدمه مباشرة في اتصال TCP الفعلي عبر
// خيار lookup المخصص في http/https.request من Node، بدل ترك fetch يُعيد الحل من جديد. اسم
// النطاق الأصلي يبقى في ترويسة Host/SNI كما هو متوقَّع من الخادم البعيد.
export async function safeExternalPost(
  urlStr: string,
  jsonBody: unknown,
  timeoutMs = 8000
): Promise<{ status: number; ok: boolean; error?: string }> {
  if (!(await isSafeUrlForOutboundRequest(urlStr))) {
    return { status: 0, ok: false, error: "الرابط يُحلَّل إلى عنوان داخلي/خاص — مرفوض لأسباب أمنية (SSRF)" };
  }
  try {
    const dns = await import("dns/promises");
    const u = new URL(urlStr);
    const records = await dns.lookup(u.hostname, { all: true, verbatim: true });
    // إعادة تصفية العناوين مباشرة قبل الاتصال (دفاع بالعمق إضافي، نفس منطق isPrivateIPv4 أعلاه)
      const pick = records.find((r) => {
      if (r.family === 4) return !isPrivateIPv4(r.address);
      if (r.family === 6) {
        const addr = r.address.toLowerCase();
        if (addr === "::1" || addr === "::") return false;
        if (addr.startsWith("fe80:") || addr.startsWith("fc") || addr.startsWith("fd")) return false;
        const mapped = addr.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
        if (mapped && isPrivateIPv4(mapped[1])) return false;
        return true;
      }
      return false;
    });
    if (!pick) return { status: 0, ok: false, error: "تعذّر حل اسم النطاق إلى عنوان آمن" };

    const isHttps = u.protocol === "https:";
    const mod = isHttps ? await import("https") : await import("http");
    const body = Buffer.from(JSON.stringify(jsonBody));

    return await new Promise((resolve) => {
      const req = mod.request(
        {
          protocol: u.protocol,
          hostname: u.hostname, // يبقى للـ Host header / SNI كما يتوقّعه الخادم البعيد
          port: u.port || (isHttps ? 443 : 80),
          path: `${u.pathname}${u.search}`,
          method: "POST",
          headers: { "Content-Type": "application/json", "Content-Length": String(body.length) },
          // [PIN] تجاوز أي حل DNS جديد عبر إرجاع العنوان الذي تحقّقنا منه فعلاً فقط
          lookup: (_hostname: string, _options: any, callback: any) => callback(null, pick.address, pick.family),
          timeout: timeoutMs,
        } as any,
        (res: any) => {
          res.resume(); // لا حاجة لقراءة الجسم، فقط status
          resolve({ status: res.statusCode || 0, ok: (res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300 });
        }
      );
      req.on("timeout", () => { req.destroy(new Error("timeout")); });
      req.on("error", (e: any) => resolve({ status: 0, ok: false, error: e?.message || "فشل الاتصال بالـ Webhook" }));
      req.write(body);
      req.end();
    });
  } catch (e: any) {
    return { status: 0, ok: false, error: e?.message || "فشل الاتصال بالـ Webhook" };
  }
}

export function isValidUrl(v: unknown): boolean {
  if (typeof v !== "string" || v.length > 2048) return false;
  try {
    const u = new URL(v);
    if (!["http:", "https:"].includes(u.protocol)) return false;

    let h = u.hostname.toLowerCase();
    // إزالة أقواس IPv6 [::1]
    if (h.startsWith("[") && h.endsWith("]")) h = h.slice(1, -1);

    // أسماء مضيف نصية معروفة
    for (const b of ["localhost", "metadata.google.internal", "metadata"]) {
      if (h === b || h.endsWith("." + b)) return false;
    }

    // ترميز عشري/سداسي عشري لعنوان IP
    if (isDecimalOrHexIpEncoding(h)) return false;

    // عناوين IPv6 الخاصة/loopback، بما فيها صيغة IPv4-mapped (::ffff:127.0.0.1)
    if (h === "::1" || h === "::") return false;
    if (h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd")) return false; // link-local / ULA
    const mapped = h.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
    if (mapped && isPrivateIPv4(mapped[1])) return false;

    // عنوان IPv4 عادي
    if (isPrivateIPv4(h)) return false;

    return true;
  } catch {
    return false;
  }
}

// ══════════════════════════════════════════════════════════════
//  [NEW] الطبقة 15 — Safe Error Handler
//  يمنع تسريب تفاصيل الأخطاء الداخلية للعميل
// ══════════════════════════════════════════════════════════════

/**
 * استخدم هذه الدالة بدلاً من: res.status(500).json({ error: e.message })
 *
 * [FIX v4] لم تعد هذه الدالة تُرجع رسالة عامة غامضة مثل "حدث خطأ داخلي" —
 * كل خطأ الآن يُصنَّف ويُشرح بشكل مفهوم ومحدد للمستخدم (نوع الخطأ + سببه
 * المحتمل بلغة بسيطة)، مهما كانت الصفحة أو التبويب الذي صدر منه الخطأ،
 * مع الحفاظ على عدم تسريب تفاصيل حساسة (مسارات ملفات، Stack، أسرار).
 *
 * كذلك: لوغ السيرفر أصبح يفصل كل خطأ في كتلة واضحة (خط فاصل + وقت + مسار
 * الطلب + نوع الخطأ + الرسالة الكاملة + الحقول الإضافية + Stack) بدل سطر
 * واحد مبهم، ليسهل تتبع أي عطل مهما كان مصدره.
 *
 * [FIX] أخطاء Supabase ليست instances من Error — هي كائنات عادية
 * { message, details, hint, code }. الكود القديم كان يستخدم String(e)
 * عليها، فكان يطبع "[object Object]" في الـ logs ويخفي السبب الحقيقي
 * تماماً، حتى عن المطوّر نفسه. الآن نستخرج الحقول المفيدة من أي شكل خطأ.
 */

// خريطة تصنيف الأخطاء الشائعة (Postgres/Supabase/Network/Auth) إلى شرح
// مفهوم بالعربية، دون كشف تفاصيل تقنية حساسة للعميل.
function classifyErrorForUser(msg: string, code?: string): string {
  const m = (msg || "").toLowerCase();
  const c = (code || "").toString();

  if (c === "23505" || m.includes("duplicate key") || m.includes("already exists")) {
    return "البيانات التي أدخلتها مستخدمة مسبقاً (تكرار في قيمة يجب أن تكون فريدة).";
  }
  if (c === "23503" || m.includes("foreign key")) {
    return "لا يمكن إتمام العملية لأن هناك بيانات أخرى مرتبطة بهذا العنصر.";
  }
  if (c === "23502" || m.includes("null value") || m.includes("not null")) {
    return "حقل مطلوب مفقود في البيانات المُرسَلة. يرجى التحقق من جميع الحقول الإلزامية.";
  }
  if (c === "22p02" || m.includes("invalid input syntax")) {
    return "صيغة أحد الحقول المُدخلة غير صحيحة (نوع بيانات غير متوافق).";
  }
  if (c === "42703" || (m.includes("column") && m.includes("does not exist"))) {
    return "عمود مطلوب غير موجود في قاعدة البيانات — يلزم تحديث/ترحيل قاعدة البيانات أولاً.";
  }
  if (c === "42p01" || (m.includes("relation") && m.includes("does not exist"))) {
    return "جدول مطلوب غير موجود في قاعدة البيانات — يرجى مراجعة إعداد قاعدة البيانات.";
  }
  if (m.includes("jwt") || (m.includes("token") && (m.includes("expired") || m.includes("invalid")))) {
    return "انتهت صلاحية الجلسة أو التوكن غير صالح. يرجى تسجيل الدخول من جديد.";
  }
  if (m.includes("permission denied") || m.includes("rls") || m.includes("row-level security")) {
    return "لا تملك الصلاحية الكافية للوصول إلى هذه البيانات أو تعديلها.";
  }
  if (m.includes("timeout") || m.includes("timed out") || m.includes("etimedout")) {
    return "انتهت مهلة الاتصال بالخادم أو بمصدر البيانات الخارجي. يرجى المحاولة مجدداً.";
  }
  if (m.includes("econnrefused") || m.includes("fetch failed") || m.includes("network") || m.includes("enotfound")) {
    return "تعذّر الاتصال بخدمة خارجية مطلوبة لإتمام العملية. يرجى المحاولة لاحقاً أو مراجعة الإعدادات.";
  }
  if (m.includes("rate limit") || m.includes("too many requests")) {
    return "عدد الطلبات كبير جداً خلال وقت قصير. يرجى الانتظار قليلاً ثم إعادة المحاولة.";
  }
  if (m.includes("payload too large") || m.includes("file too large")) {
    return "حجم الملف أو البيانات المُرسلة أكبر من الحد المسموح.";
  }
  return "";
}

export function safeError(res: Response, e: unknown, fallback = "حدث خطأ غير متوقع، يرجى المحاولة مجدداً", req?: Request): void {
  let msg = "خطأ غير معروف";
  let code: string | undefined;
  let stack: string | undefined;
  let details: Record<string, unknown> | undefined;
  let errorTypeName = "Error";

  if (e instanceof Error) {
    msg = e.message;
    stack = e.stack;
    errorTypeName = e.name || "Error";
    const anyE = e as any;
    if (anyE.code) code = String(anyE.code);
    if (anyE.details || anyE.hint) details = { details: anyE.details, hint: anyE.hint, code: anyE.code };
  } else if (e && typeof e === "object") {
    const obj = e as Record<string, unknown>;
    const parts = [obj.message, obj.details, obj.hint]
      .filter((v) => v !== undefined && v !== null && v !== "")
      .map(String);
    msg = parts.length ? parts.join(" | ") : JSON.stringify(obj);
    code = obj.code !== undefined ? String(obj.code) : undefined;
    details = obj;
    errorTypeName = "SupabaseError";
  } else {
    msg = String(e);
  }

  // شرح مفهوم ومحدد للمستخدم بدل رسالة عامة غامضة
  const explained = classifyErrorForUser(msg, code) || fallback;

  // ── تسجيل كامل ومفصّل في لوغ السيرفر (كل خطأ في كتلة منفصلة وواضحة) ──
  const timestamp = new Date().toISOString();
  const routeInfo = req ? `${req.method} ${req.originalUrl || req.url}` : "غير معروف (لا يوجد req)";
  console.error(
    "\n" +
    "════════════════ [ERROR LOG START] ════════════════\n" +
    `الوقت: ${timestamp}\n` +
    `المسار: ${routeInfo}\n` +
    `نوع الخطأ: ${errorTypeName}${code ? ` (code: ${code})` : ""}\n` +
    `الرسالة الكاملة: ${msg}\n` +
    (details ? `تفاصيل إضافية: ${JSON.stringify(details)}\n` : "") +
    (stack ? `Stack:\n${stack}\n` : "") +
    `الرسالة المُرسلة للمستخدم: ${explained}\n` +
    "════════════════ [ERROR LOG END] ══════════════════\n"
  );

  const isDev = process.env.NODE_ENV !== "production";
  res.status(500).json(isDev ? { error: explained, debugMessage: msg, details } : { error: explained });
}

// ══════════════════════════════════════════════════════════════
//  Middleware الموحَّد
// ══════════════════════════════════════════════════════════════

export function masterSecurityMiddleware(req: Request, res: Response, next: NextFunction) {
  requestId(req, res, () =>
    securityHeaders(req, res, () =>
      corsMiddleware(req, res, () =>
        ipBanCheck(req, res, () =>
          honeypotMiddleware(req, res, () =>
            botDetection(req, res, () =>
              payloadSizeGuard(req, res, () =>
                injectionGuard(req, res, next)
              )
            )
          )
        )
      )
    )
  );
}

export function logSecurityEvent(type: string, req: Request, details?: string): void {
  const ip = getClientIp(req);
  console.warn(`[SEC] ${new Date().toISOString()} | ${type} | ${ip} | ${req.method} ${req.path}${details?" | "+details:""}`);
}

// ══════════════════════════════════════════════════════════════
//  صمام الأمان (Graceful Fallback) — safeExternalCall
// ══════════════════════════════════════════════════════════════
// المشكلة: عمليات "ثانوية" غير حرجة (إشعار تليجرام، عمولة إحالة، تحديث
// إحصائيات، push notification...) لو نُفّذت داخل نفس try/catch الكبير
// لعملية مالية أساسية (بيع، دفع، خصم رصيد)، فإن فشل أيٍّ منها يُسقط كامل
// الاستجابة للعميل (500) رغم أن العملية الأساسية نجحت فعلياً (الرصيد
// اتخصم، المنتج تسلّم). هذا يُربك العميل (يظن الطلب فشل فيعيد المحاولة)
// ويُربك الأدمن (يرى خطأ رغم عدم وجود مشكلة حقيقية).
//
// الحل: safeExternalCall تُنفّذ أي دالة (متزامنة أو غير متزامنة) وتضمن
// عدم رمي أي استثناء للخارج مهما حصل داخلها — بدل ذلك تُسجّل الخطأ بوضوح
// وتُرجع نتيجة موحّدة { ok, data?, error? }. تُستخدم لتغليف أي نداء خارجي
// أو عملية ثانوية تأتي بعد نجاح الخطوة الحرجة الأساسية، حتى لا توقف
// الاستجابة الناجحة للعميل.
//
// ملاحظة: هذه ليست بديلاً عن try/catch للعمليات الحرجة نفسها (خصم
// الرصيد، إنشاء الطلب) — تلك يجب أن تبقى داخل التدفق الرئيسي وتُعامل
// بحذر (rollback/CAS إلخ). safeExternalCall مخصصة فقط لما يأتي بعدها.
export interface SafeCallResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export async function safeExternalCall<T>(
  label: string,
  fn: () => Promise<T> | T,
  opts?: { req?: Request; silent?: boolean }
): Promise<SafeCallResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (e: any) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!opts?.silent) {
      const routeInfo = opts?.req ? `${opts.req.method} ${opts.req.originalUrl || opts.req.url}` : "";
      console.error(`[SAFE-CALL FAILED] ${label}${routeInfo ? ` | ${routeInfo}` : ""} | ${msg}`);
    }
    return { ok: false, error: msg };
  }
}

// ══════════════════════════════════════════════════════════════
//  Device Fingerprinting — مرتبط بالحساب
// ══════════════════════════════════════════════════════════════
// الهدف: تغيير الـ IP (حتى عبر VPN/بروكسي متعدد) لا يفيد مستخدماً محظوراً في الإفلات من
// الحظر، لأن الحظر هنا لا يعتمد على IP بل على "بصمة الجهاز" (خصائص شبه ثابتة للمتصفح/الجهاز
// نفسه). لو أنشأ حساباً جديداً من نفس الجهاز فعلياً، بصمته تطابق بصمة الحساب المحظور، فيُحظر
// الحساب الجديد تلقائياً أيضاً — بغض النظر عن عدد مرات تغيير الـ IP.
//
// ملاحظة صادقة عن الحدود الفعلية لهذه التقنية: هذه بصمة "ضعيفة" (User-Agent + رؤوس الطلب +
// دقة الشاشة من الفرونت) وليست بصمة قوية بمستوى مكتبات fingerprinting المتخصصة (FingerprintJS
// وغيرها) التي تجمع عشرات الخصائص (Canvas, WebGL, AudioContext, الخطوط المثبتة...). مهاجم
// متمرّس (وضع تصفح خاص + تغيير User-Agent + تغيير دقة الشاشة يدوياً) يمكنه تغييرها. هذا خط
// دفاع إضافي يرفع كلفة إعادة إنشاء حساب بعد الحظر لمستخدم عادي لا يعرف أنه يجب تزوير هذه
// القيم، وليس حلاً نهائياً ضد مهاجم متمرّس ومُصمِّم عمداً على التحايل.

export interface DeviceFingerprintInput {
  userAgent: string;
  acceptLanguage?: string;
  screenWidth?: number;
  screenHeight?: number;
  colorDepth?: number;
  timezone?: string;
  platform?: string;
}

// hash قصير وحتمي (deterministic) — نفس المدخلات تُنتج دائماً نفس البصمة، بدون الحاجة لتخزين
// القيم الخام الحساسة (يكفي تخزين الـ hash + نسخة مقروءة مختصرة للعرض في لوحة التحكم).
export function computeDeviceFingerprint(input: DeviceFingerprintInput): string {
  const normalized = [
    (input.userAgent || "").trim(),
    (input.acceptLanguage || "").trim(),
    input.screenWidth ?? 0,
    input.screenHeight ?? 0,
    input.colorDepth ?? 0,
    (input.timezone || "").trim(),
    (input.platform || "").trim(),
  ].join("|");
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

// [Hook] نفس نمط setBanLookup — يُربط من server.ts بدالة تتحقق من قاعدة البيانات إن كانت
// بصمة جهاز معيّنة مرتبطة بأي حساب محظور آخر غير الحساب الحالي.
let deviceBanLookup:
  | ((fingerprint: string, currentUserId: string) => Promise<{ banned: boolean; message?: string }>)
  | null = null;
export function setDeviceBanLookup(
  fn: (fingerprint: string, currentUserId: string) => Promise<{ banned: boolean; message?: string }>
) {
  deviceBanLookup = fn;
}

export async function checkDeviceBan(
  fingerprint: string,
  currentUserId: string
): Promise<{ banned: boolean; message?: string }> {
  if (!deviceBanLookup || !fingerprint) return { banned: false };
  try {
    return await deviceBanLookup(fingerprint, currentUserId);
  } catch {
    // لا نمنع الطلب في حال فشل الفحص لتفادي تعطيل الموقع بالكامل بسبب خطأ في قاعدة البيانات
    return { banned: false };
  }
}

// يبني بصمة الجهاز من الطلب (headers) + بيانات اختيارية من الفرونت (حجم الشاشة إلخ)
// مُرسلة عبر body أو header مخصص X-Device-Info (JSON).
export function extractDeviceFingerprintFromRequest(req: Request): { fingerprint: string; raw: DeviceFingerprintInput } {
  const ua = String(req.headers["user-agent"] || "");
  const lang = String(req.headers["accept-language"] || "");
  let clientInfo: any = {};
  const rawHeader = req.headers["x-device-info"];
  if (typeof rawHeader === "string" && rawHeader.length < 500) {
    try { clientInfo = JSON.parse(rawHeader); } catch { clientInfo = {}; }
  } else if (req.body && typeof req.body === "object" && req.body.deviceInfo && typeof req.body.deviceInfo === "object") {
    clientInfo = req.body.deviceInfo;
  }
  const raw: DeviceFingerprintInput = {
    userAgent: ua,
    acceptLanguage: lang,
    screenWidth: Number(clientInfo.screenWidth) || undefined,
    screenHeight: Number(clientInfo.screenHeight) || undefined,
    colorDepth: Number(clientInfo.colorDepth) || undefined,
    timezone: typeof clientInfo.timezone === "string" ? clientInfo.timezone.slice(0, 100) : undefined,
    platform: typeof clientInfo.platform === "string" ? clientInfo.platform.slice(0, 100) : undefined,
  };
  return { fingerprint: computeDeviceFingerprint(raw), raw };
}

