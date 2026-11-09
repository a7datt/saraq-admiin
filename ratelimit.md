# تعديل: استثناء `/api/internal/notify-admins` من الحظر العام والـ Rate Limit

## المشكلة

إشعارات الطلبات والدفعات (طلب جديد، شحن رصيد) توقفت عن الوصول لبوت الأدمن على
تيليجرام لساعات طويلة، رغم أن:

- التوكن صحيح ومتصل (`last_test_ok: true`)
- إعدادات `telegram_bot_settings` سليمة (Chat IDs مفعّلة، `is_disabled: false`)
- العملية (transaction) وصلت فعلياً لقاعدة البيانات بنجاح

## السبب الجذري

`saraqib-store-user` (سيرفر المتجر) بيبلّغ `saraqib-store-admin` (سيرفر لوحة التحكم)
عن كل طلب/دفعة عبر استدعاء داخلي:

```
POST http://127.0.0.1:3200/api/internal/notify-admins
Header: x-internal-secret: <ADMIN_INTERNAL_SECRET>
```

هاد المسار محمي أصلاً بمفتاح سري مشترك (`ADMIN_INTERNAL_SECRET`) يُتحقق منه
داخل الراوت نفسه. لكنه كان يمرّ أيضاً عبر نفس طبقة الحماية العامة المطبّقة على
كل مسارات الموقع:

```js
app.use(masterSecurityMiddleware);  // يشمل ipBanCheck + honeypotMiddleware + ...
app.use(generalLimiter);            // rate limit عام: 2000 طلب/دقيقة
```

`masterSecurityMiddleware` بيتضمن `ipBanCheck` — وهاد بيحظر أي IP لمدة **24 ساعة**
إذا وقع بفخ عسل (honeypot path)، أو حظر أقصر إذا تجاوز حد الـ rate limit العام
بشكل كبير. المشكلة إنه هاد الحظر مبني على IP بشكل عام، وسيرفر اليوزر بيتواصل
مع سيرفر الأدمن عبر `127.0.0.1` (نفس الجهاز) — فأي حظر يلي يلحق بـ `127.0.0.1`
(لأي سبب، حتى لو مش متعلق بهاد المسار إطلاقاً) كان يوقف كل الإشعارات الداخلية
تلقائياً بدون أي خطأ واضح غير رسالة `429`.

## الحل

استثناء هاد المسار تحديداً (`POST /api/internal/notify-admins`) من
`masterSecurityMiddleware` و `generalLimiter`، بما إنه:

- اتصال خادم-لخادم على نفس الجهاز، مش طلب متصفح عام
- محمي أصلاً بمفتاح سري خاص فيه (`ADMIN_INTERNAL_SECRET`) — طبقة حماية كافية ومستقلة
- بقية مسارات الموقع (تسجيل دخول، API عام، لوحة الأدمن...) ما تأثرت إطلاقاً —
  الحماية العامة بقيت شغالة 100% لكل شي ماعدا هاد المسار

## التعديل بالكود (`server.ts`)

**الموقع:** داخل `startServer()`، مباشرة بعد `app.use(hpp())` وقبل تسجيل
مسارات الـ API.

### قبل

```js
// ═══ masterSecurityMiddleware — 14 طبقة حماية دفعة واحدة ═══
app.use(masterSecurityMiddleware);
// Rate limiting عام إضافي
app.use(generalLimiter);
```

### بعد

```js
// ═══ masterSecurityMiddleware — 14 طبقة حماية دفعة واحدة ═══
// [FIX] استثناء /api/internal/notify-admins من الحظر العام حسب IP (ipBanCheck) وحدود
// المعدل العامة (generalLimiter). هذا المسار اتصال خادم-لخادم من saraqib-store-user نفسه
// (نفس الخادم عبر 127.0.0.1)، ومحمي أصلاً بمفتاح سري مشترك (ADMIN_INTERNAL_SECRET) يُتحقق
// منه داخل الراوت نفسه — وليس طلب متصفح عام يحتاج حماية IP/rate-limit. المشكلة التي حصلت
// فعلياً: حظر عام لعنوان 127.0.0.1 (24 ساعة بسبب فخ عسل، أو تجاوز الحد العام) كان يمنع هذا
// المسار الداخلي بالكامل ويُفقد كل إشعارات الطلبات والدفعات لساعات طويلة رغم أن الطلب شرعي
// 100%. لا يُعفى أي مسار آخر — الحماية العامة تبقى كما هي لكل بقية التطبيق.
app.use((req, res, next) => {
  if (req.method === "POST" && req.path === "/api/internal/notify-admins") return next();
  return masterSecurityMiddleware(req, res, next);
});
// Rate limiting عام إضافي
app.use((req, res, next) => {
  if (req.method === "POST" && req.path === "/api/internal/notify-admins") return next();
  return generalLimiter(req, res, next);
});
```

## نطاق التأثير

| المسار | قبل التعديل | بعد التعديل |
|---|---|---|
| `POST /api/internal/notify-admins` | محمي بـ ipBanCheck + generalLimiter + المفتاح السري | محمي بالمفتاح السري فقط |
| كل بقية المسارات (`/api/*`) | محمية بالكامل | **بدون تغيير** — نفس الحماية |

الحماية الوحيدة المتبقية على هاد المسار هي التحقق من `x-internal-secret` داخل
الراوت نفسه (`ADMIN_INTERNAL_SECRET`)، وهاد كافي لأنه:
- السر لا يُرسل ولا يُخزّن على أي جهة خارجية
- الطلب أصلاً ما بيوصل إلا من نفس الخادم (`127.0.0.1`)، ماعدا لو حد عنده وصول
  مباشر للسيرفر أصلاً (وهاد سيناريو مختلف كلياً عن حماية IP الخارجي)

## خطوات النشر

```bash
cd ~/apps/saraqib/admin
cp server.ts server.ts.bak   # نسخة احتياطية قبل التعديل
# ضع server.ts الجديد مكان القديم
pm2 restart saraqib-admin --update-env
```

ما في داعي لـ `npm run build` — التعديل بالباك إند (`server.ts`) فقط، ما مسّ
أي كود فرونت إند.

## للتحقق بعد النشر

```bash
pm2 flush saraqib-admin
pm2 logs saraqib-admin --lines 0
```

سوّي عملية شحن أو طلب تجريبي وتأكد إنه الإشعار وصل فوراً على تيليجرام بدون
أي رسالة `429` أو `طلبات كثيرة جداً` بلوج اليوزر (`saraqib-user-error.log`).
