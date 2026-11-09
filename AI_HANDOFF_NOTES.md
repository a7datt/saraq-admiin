# ملاحظات تسليم للذكاء الاصطناعي / AI Handoff & Change Log

> **اقرأ هذا الملف أولاً قبل أي تعديل.** يوثّق تغييرات أُجريت على **الكود + قاعدة البيانات + الخادم + خدمات خارجية** خلال معالجة مشكلة رصيد وحادثة اختراق (2026‑10‑24 → 2026‑10‑25). بعض هذه التغييرات **ليست في مستودع git** (قاعدة بيانات / بيئة / Cloudflare)، فانتبه لها كي لا تكسر شيئاً أو تُكرّره.

- **المشروع:** سراقب ستور — تطبيقان: `saraqib-user` (المتجر، منفذ 3101) و`saraqib-admin` (لوحة التحكم، منفذ 3100)، كلاهما `npx tsx server.ts` عبر pm2، خلف nginx.
- **Supabase project ref:** `rsmojstsglwwmirspgdb` (قاعدة البيانات مشتركة بين التطبيقين).
- **القاعدة تُعدَّل مباشرةً** عبر أدوات Supabase/MCP، لا يوجد migration-runner تلقائي في الكود. ملفات SQL في `migrations/` **توثيقية** — طُبّقت يدوياً على القاعدة الحيّة (ومُسجّلة في Supabase migration history).

---

## 1) تغييرات قاعدة البيانات (مطبّقة مباشرةً على Supabase — ليست ناتجة عن تشغيل الكود)

### Migrations (ملفاتها في `migrations/`، طُبّقت على القاعدة الحيّة)
- **`002_idempotent_order_refund.sql`**
  - عمود جديد `orders.refunded_at timestamptz` = علامة الاسترجاع الموثوقة (خارج حقل `meta`).
  - دالة `public.refund_order_once(p_order_id bigint)`: استرجاع **ذرّي وحيد (idempotent)** — تقفل صف الطلب (`FOR UPDATE`)، تسترجع مرة واحدة فقط إن كان `refunded_at IS NULL`، تضبط العلامة، وتُدرج معاملة `transactions` واحدة. **كل مسارات الاسترجاع في الكود تستدعيها الآن** (بدل `increment_balance` المتفرّق).
  - Backfill: كل الطلبات `cancelled/failed/rejected` القديمة عُلّمت `refunded_at` كي لا تُسترجَع ثانيةً.
- **`003_job_lease_lock.sql`**
  - جدول `public.job_locks` + دالة `public.try_acquire_job_lock(p_job, p_ttl_seconds, p_holder)`: قفل حصّة موزّع. تستدعيه حلقة `runAutoRefreshOrders` في **التطبيقين** بمفتاح `auto_refresh_orders` كي تعمل الدورة في عملية واحدة فقط لا في الاثنتين معاً.

### عمليات بيانات يدوية لمرة واحدة (❗ ليست في الكود — لا تُكرّرها)
- **حظر حسابات المهاجم `users.id BETWEEN 40 AND 52`**: `is_banned=is_blocked=chat_blocked=true`, `blocked_until='2099-01-01'`, رفع `token_version`، وحذف صفوفها من `user_sessions`. (كلها حسابات بريد مؤقت/بروكسيات — حادثة اختراق.)
- **حذف اشتراكات Push خبيثة** من `push_subscriptions` (نقاط نهاية `webhook.site` و`127.0.0.1` — محاولات SSRF) للحسابات 40–52.
- **تصحيح رصيد `users.id=29`**: استقرّ على `balance=4.470000` (القيمة الصحيحة؛ أحد طلباته نُفّذ يدوياً فعلاً). لا تُعدّله.

---

## 2) تغييرات الكود (موجودة في المستودع)

### مشتركة بين `saraqib-user` و`saraqib-admin`
- **`server.ts`** — الاسترجاع: كل مسارات إلغاء الطلب تستدعي `refund_order_once` (منع الاسترجاع المزدوج). حلقة `runAutoRefreshOrders` محميّة بـ`try_acquire_job_lock`.
- **`security.ts`**:
  - `getClientIp`: يأخذ **آخر** عنصر في `X-Forwarded-For` (العنوان الحقيقي الذي يُلحقه nginx) لا الطرف الأيسر القابل للتزوير؛ أُسقطت الثقة بـ`cf-connecting-ip` (لا Cloudflare أمام الأصل).
  - `isValidPushEndpoint`: قائمة سماح لنقاط Push (fcm/mozilla/apple/windows، HTTPS فقط) — إصلاح SSRF في `/api/push/subscribe`.
  - `isDisposableEmail`: حظر نطاقات البريد المؤقت عند التسجيل.
  - `verifyCaptcha`: تحقق Cloudflare Turnstile — **مُعطّل تلقائياً ما لم يُضبط `TURNSTILE_SECRET`** في البيئة (fail-open لئلا يتعطّل التسجيل قبل تجهيز المفاتيح).
- **التسجيل `/api/auth/register`**: صار يتطلّب CAPTCHA (`verifyCaptcha`) + **رقم الهاتف إجباري** (`if (!phone || !isValidPhone(phone))`) + حظر البريد المؤقت.

### خاصة بـ `saraqib-user` فقط
- **`security.ts` (CSP)**: أُضيف `https://challenges.cloudflare.com` إلى `script-src` و`frame-src` كي يظهر ودجت Turnstile.
- **`src/pages/LoginPage.tsx`**: رقم الهاتف إجباري في الواجهة + ودجت Turnstile يظهر فقط إن وُجد `VITE_TURNSTILE_SITEKEY` ويُرسل `captchaToken` مع التسجيل.

---

## 3) تغييرات الخادم/البيئة (❗ ليست في git — `.env` و`dist/` مستثناة)

- **`saraqib-user/.env`**: أُضيف `VITE_TURNSTILE_SITEKEY` (عام، لبناء الواجهة) و`TURNSTILE_SECRET` (سري، للتحقق الخادمي). **لا تُرفع إلى git.** عند أي نشر جديد يجب ضبطهما يدوياً.
- **بناء الواجهة**: أي تعديل على `VITE_TURNSTILE_SITEKEY` أو على `src/` يتطلّب `cd saraqib-user && npm run build` (الناتج في `dist/` غير المُتعقَّب، يخدمه express).
- **إعادة التشغيل**: بعد تعديل `server.ts`/`security.ts` أو `.env` → `pm2 restart saraqib-user saraqib-admin`.
- **nginx**: وكيل واحد يضيف العنوان الحقيقي في آخر `X-Forwarded-For` (`$proxy_add_x_forwarded_for`). لا يوجد Cloudflare real_ip module — لذا `getClientIp` يعتمد آخر عنصر.
- **`saraqib-admin`**: يملك نفس تحصينات الخادم، لكن **لا ودجت واجهة ولا `TURNSTILE_SECRET` مضبوط فيه** → تحقق CAPTCHA لديه خامل (عمداً).

---

## 4) خدمات خارجية
- **Cloudflare Turnstile**: أُنشئ widget للنطاق `saraqib.store` (حساب Cloudflare الخاص بالمالك). Site Key عام، Secret Key في `.env` فقط. النطاق في لوحة Turnstile يجب أن يطابق `saraqib.store` وإلا لا يُرسم المربّع.
- **Cloudflare WAF/Bot Fight Mode**: مُقترح (غير مُفعّل بعد) كطبقة أمامية إضافية.

---

## 5) ثغرات عولجت ومتبقّية
- ✅ عولج: استرجاع مزدوج، توحيد حلقة التحديث، SSRF في Push، انتحال IP عبر الترويسة، البريد المؤقت، رقم الهاتف الاختياري، CAPTCHA على التسجيل.
- ✅ فُحص وآمن (لا ثغرة): SQLi (استعلامات Supabase مُعاملة)، IDOR في `/client/api/check` (مُقيّد بالتوكن)، SSTI (ردود دردشة ثابتة).
- ⏳ متبقٍّ: **CAPTCHA على الشحن** (top-up) غير مربوط بعد (يحتاج ودجت في صفحة الشحن + تحقق خادمي). ينصح أيضاً بـ OTP هاتف بالرسائل، وتفعيل Cloudflare WAF.
- ملاحظة دفاعية: المهاجم يستخدم بروكسيات سكنية متبدّلة — حظر الـ IP بجدار الحماية غير مُجدٍ؛ الدفاع الفعّال هو CAPTCHA + حظر الحسابات + حظر البريد المؤقت.

---

## 6) قائمة تحقّق لنشر بيئة جديدة
1. طبّق `migrations/002` و`003` على قاعدة البيانات.
2. اضبط أسرار `.env` (Supabase, JWT_SECRET, `TURNSTILE_SECRET`, `VITE_TURNSTILE_SITEKEY`, ...).
3. `npm install` ثم `npm run build` في `saraqib-user`.
4. `pm2 start`/`restart` للتطبيقين.
5. تأكّد أن nginx يمرّر `X-Forwarded-For` بشكل صحيح (الوكيل يُلحق العنوان الحقيقي في النهاية).
