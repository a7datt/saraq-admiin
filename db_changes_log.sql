-- =====================================================================
-- سجل كل التعديلات التي طُبّقت على قاعدة بيانات Supabase الحيّة
-- (مشروع: yyhmxfsxqdiwdswnmair) أثناء العمل على المشروعين
-- saraqib-user + saraqib-admin، بالإضافة إلى ما هو موثّق في supabase.sql
-- (نسخة الـ schema الأصلية بتاريخ 2026-11-02).
--
-- الاستخدام: كل قسم أدناه idempotent (IF NOT EXISTS / ON CONFLICT) ويمكن
-- إعادة تنفيذه بأمان، ومرتّب بترتيب تنفيذه الزمني الفعلي على قاعدة البيانات.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) إصلاح: أعمدة متابعة مزامنة المزوّدين كانت مفقودة من جدول providers
--    (سبّبت خطأ 42703 متكرر كل 5 دقائق في صفحة "المزوّدين" بلوحة الأدمن)
-- ---------------------------------------------------------------------
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS last_sync_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS last_sync_status text,
  ADD COLUMN IF NOT EXISTS last_sync_message text;


-- ---------------------------------------------------------------------
-- 2) نظام الرتب (Ranks System) — جدول الرتب + ربطها بالمستخدمين
--    + الترقية التلقائية حسب إجمالي الشحن + المنح اليدوي من الأدمن.
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ranks (
  id bigserial primary key,
  name text not null,
  image_url text not null default '',
  color text not null default '#e11d48',
  required_amount numeric not null default 0,
  has_discount boolean not null default false,
  discount_percent numeric not null default 0,
  description text not null default '',
  benefits text not null default '',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS rank_id bigint REFERENCES public.ranks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS manual_rank_id bigint REFERENCES public.ranks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rank_updated_at timestamptz;

CREATE INDEX IF NOT EXISTS users_rank_id_idx ON public.users(rank_id);

-- الرتب الافتراضية الخمس (تُدرج مرة واحدة فقط إن كان الجدول فارغاً)
INSERT INTO public.ranks (name, image_url, color, required_amount, has_discount, discount_percent, description, benefits, sort_order)
SELECT * FROM (VALUES
  ('مستوى جديد',   'https://saraqib.store/ranks/rank-1.svg', '#9ca3af', 0,    false, 0, 'رتبة البداية لكل عضو جديد في سراقب ستور.', 'الوصول لجميع المنتجات' || chr(10) || 'دعم فني عادي', 1),
  ('متوسط',        'https://saraqib.store/ranks/rank-2.svg', '#60a5fa', 50,   false, 0, 'للمستخدمين النشطين الذين شحنوا 50$ أو أكثر.', 'أولوية أعلى في معالجة الطلبات' || chr(10) || 'إشعارات العروض الخاصة', 2),
  ('VIP',          'https://saraqib.store/ranks/rank-3.svg', '#f59e0b', 200,  true,  3, 'عضوية مميزة مع خصم دائم على كل المشتريات.', 'خصم 3% على كل المشتريات' || chr(10) || 'دعم فني مميز' || chr(10) || 'شارة VIP', 3),
  ('محلات وتجار',  'https://saraqib.store/ranks/rank-4.svg', '#a855f7', 500,  true,  5, 'للمحلات والتجار الذين يشحنون بكميات كبيرة.', 'خصم 5% على كل المشتريات' || chr(10) || 'أسعار جملة' || chr(10) || 'دعم مخصص للتجار', 4),
  ('API',          'https://saraqib.store/ranks/rank-5.svg', '#ef4444', 1000, true,  7, 'أعلى رتبة — لمزوّدي الخدمات وأصحاب الأنظمة المرتبطة عبر API.', 'خصم 7% على كل المشتريات' || chr(10) || 'صلاحيات API كاملة' || chr(10) || 'أولوية قصوى ودعم مباشر', 5)
) AS v(name, image_url, color, required_amount, has_discount, discount_percent, description, benefits, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.ranks);

-- تحسب رتبة مستخدم واحد: يأخذ الأعلى بين الرتبة المحسوبة تلقائياً (من إجمالي الشحن)
-- والرتبة الممنوحة يدوياً من الأدمن (إن وُجدت ولم تكن أقل من التلقائية).
CREATE OR REPLACE FUNCTION public.recalc_user_rank(p_user_id bigint)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total numeric := 0;
  v_auto bigint;
  v_auto_order integer;
  v_manual bigint;
  v_manual_order integer;
  v_final bigint;
BEGIN
  SELECT coalesce(total_recharge_sum, 0) INTO v_total FROM public.user_stats WHERE user_id = p_user_id;
  v_total := coalesce(v_total, 0);

  SELECT id, sort_order INTO v_auto, v_auto_order
  FROM public.ranks
  WHERE is_active AND required_amount <= v_total
  ORDER BY required_amount DESC, sort_order DESC
  LIMIT 1;

  SELECT u.manual_rank_id, r.sort_order INTO v_manual, v_manual_order
  FROM public.users u
  LEFT JOIN public.ranks r ON r.id = u.manual_rank_id AND r.is_active
  WHERE u.id = p_user_id;

  IF v_manual IS NOT NULL AND v_manual_order IS NOT NULL
     AND (v_auto IS NULL OR v_manual_order >= coalesce(v_auto_order, 0)) THEN
    v_final := v_manual;
  ELSE
    v_final := v_auto;
  END IF;

  UPDATE public.users
  SET rank_id = v_final, rank_updated_at = now()
  WHERE id = p_user_id AND rank_id IS DISTINCT FROM v_final;

  RETURN v_final;
END;
$$;

-- تعيد حساب رتب كل المستخدمين دفعة واحدة (تُستخدم عند تعديل إعدادات رتبة من الأدمن)
CREATE OR REPLACE FUNCTION public.recalc_all_user_ranks()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  n integer := 0;
BEGIN
  FOR r IN SELECT id FROM public.users LOOP
    PERFORM public.recalc_user_rank(r.id);
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

-- تزيد إجمالي شحن المستخدم (user_stats.total_recharge_sum) بشكل ذرّي — تُستدعى
-- من كل مسارات الشحن الناجحة (يدوي/تلقائي/فاتورة/كود) في كلا السيرفرين.
CREATE OR REPLACE FUNCTION public.add_recharge_sum(p_user_id bigint, p_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_stats (user_id, total_recharge_sum)
  VALUES (p_user_id, greatest(coalesce(p_amount, 0), 0))
  ON CONFLICT (user_id) DO UPDATE
    SET total_recharge_sum = coalesce(public.user_stats.total_recharge_sum, 0) + greatest(coalesce(p_amount, 0), 0),
        updated_at = now();
END;
$$;

-- Trigger: أي تغيير في total_recharge_sum يعيد حساب رتبة المستخدم فوراً
CREATE OR REPLACE FUNCTION public.trg_user_stats_recalc_rank()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF tg_op = 'INSERT' OR new.total_recharge_sum IS DISTINCT FROM old.total_recharge_sum THEN
    PERFORM public.recalc_user_rank(new.user_id);
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS user_stats_recalc_rank ON public.user_stats;
CREATE TRIGGER user_stats_recalc_rank
AFTER INSERT OR UPDATE OF total_recharge_sum ON public.user_stats
FOR EACH ROW EXECUTE FUNCTION public.trg_user_stats_recalc_rank();

-- Trigger: أي تغيير في manual_rank_id (منح/إلغاء رتبة يدوية) يعيد الحساب فوراً
CREATE OR REPLACE FUNCTION public.trg_users_recalc_rank()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF tg_op = 'INSERT' OR new.manual_rank_id IS DISTINCT FROM old.manual_rank_id THEN
    PERFORM public.recalc_user_rank(new.id);
  END IF;
  RETURN null;
END;
$$;

DROP TRIGGER IF EXISTS users_recalc_rank ON public.users;
CREATE TRIGGER users_recalc_rank
AFTER INSERT OR UPDATE OF manual_rank_id ON public.users
FOR EACH ROW EXECUTE FUNCTION public.trg_users_recalc_rank();

-- حساب أولي لرتب كل المستخدمين الموجودين وقت إضافة النظام
SELECT public.recalc_all_user_ranks();


-- ---------------------------------------------------------------------
-- 3) نطاق تطبيق خصم الرتبة على أقسام/أقسام فرعية محددة فقط
--    (الأقسام غير المختارة لا يُطبَّق عليها خصم الرتبة أبداً)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rank_categories (
  id bigserial primary key,
  rank_id bigint not null references public.ranks(id) on delete cascade,
  category_type text not null check (category_type in ('category','subcategory')),
  category_id bigint not null,
  created_at timestamptz not null default now(),
  unique(rank_id, category_type, category_id)
);

CREATE INDEX IF NOT EXISTS rank_categories_rank_id_idx ON public.rank_categories(rank_id);


-- =====================================================================
-- نهاية السجل — آخر تحديث: 2026-11-14
-- كل الاستعلامات أعلاه idempotent؛ تنفيذها مرة أخرى على نفس القاعدة آمن.
-- =====================================================================
-- نهاية السجل — آخر تحديث: 2026-11-14
-- كل الاستعلامات أعلاه idempotent؛ تنفيذها مرة أخرى على نفس القاعدة آمن.
-- =====================================================================

-- ==========================================================================
-- [PHASE-1] 2026-11-24 — مصدر QR لطرق الدفع + الشريط النصي المتحرك
-- ==========================================================================
ALTER TABLE public.payment_methods
  ADD COLUMN IF NOT EXISTS qr_mode text NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS qr_image_url text;
ALTER TABLE public.payment_methods DROP CONSTRAINT IF EXISTS payment_methods_qr_mode_check;
ALTER TABLE public.payment_methods ADD CONSTRAINT payment_methods_qr_mode_check CHECK (qr_mode IN ('auto','image'));

ALTER TABLE public.store_appearance
  ADD COLUMN IF NOT EXISTS marquee_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marquee_text text NOT NULL DEFAULT '';


-- ==========================================================================
-- [PHASE-2] 2026-11-24 — محرك قواعد الخصم الموحّد (discount_rules)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS public.discount_rules (
  id bigserial PRIMARY KEY,
  owner_type text NOT NULL CHECK (owner_type IN ('rank','vip','api_global')),
  owner_id bigint,
  scope_type text NOT NULL CHECK (scope_type IN ('all','category','subcategory','sub_sub_category','product')),
  scope_id bigint,
  percent numeric(7,3) NOT NULL CHECK (percent >= 0 AND percent < 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((scope_type = 'all' AND scope_id IS NULL) OR (scope_type <> 'all' AND scope_id IS NOT NULL)),
  CHECK ((owner_type = 'rank' AND owner_id IS NOT NULL) OR (owner_type <> 'rank' AND owner_id IS NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS discount_rules_unique_idx
  ON public.discount_rules (owner_type, COALESCE(owner_id,0), scope_type, COALESCE(scope_id,0));
CREATE INDEX IF NOT EXISTS discount_rules_owner_idx ON public.discount_rules (owner_type, owner_id);
ALTER TABLE public.discount_rules ENABLE ROW LEVEL SECURITY;

-- تحويل البيانات الحالية بلا تغيير في السلوك:
-- (1) نطاقات الرتب (rank_categories) -> قواعد بنسبة الرتبة. الرتب التي لا نطاق لها لا تطبّق خصماً حالياً فلا قواعد لها.
INSERT INTO public.discount_rules (owner_type, owner_id, scope_type, scope_id, percent)
SELECT 'rank', rc.rank_id, rc.category_type, rc.category_id, r.discount_percent
FROM public.rank_categories rc JOIN public.ranks r ON r.id = rc.rank_id
WHERE r.has_discount AND r.discount_percent > 0 AND r.discount_percent < 100 AND rc.category_type IN ('category','subcategory')
ON CONFLICT DO NOTHING;
-- (2) VIP: settings.vip_discount (أو 5% الافتراضي بالكود) -> قاعدة "كل المنتجات"
INSERT INTO public.discount_rules (owner_type, owner_id, scope_type, scope_id, percent)
SELECT 'vip', NULL, 'all', NULL,
  LEAST(99.999, GREATEST(0, COALESCE(NULLIF((SELECT value FROM public.settings WHERE key='vip_discount' LIMIT 1),'')::numeric, 5)))
WHERE COALESCE(NULLIF((SELECT value FROM public.settings WHERE key='vip_discount' LIMIT 1),'')::numeric, 5) > 0
ON CONFLICT DO NOTHING;
-- (3) الـ API العام: settings.public_api_discount_percent -> قاعدة "كل المنتجات" إن كانت > 0
INSERT INTO public.discount_rules (owner_type, owner_id, scope_type, scope_id, percent)
SELECT 'api_global', NULL, 'all', NULL, v
FROM (SELECT NULLIF((SELECT value FROM public.settings WHERE key='public_api_discount_percent' LIMIT 1),'')::numeric AS v) t
WHERE v > 0 AND v < 100
ON CONFLICT DO NOTHING;

-- ==========================================================================
-- [PHASE-3] 2026-11-24 — توثيق الهوية (identity_verifications) + ربطه بطرق الدفع
-- ==========================================================================
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS identity_verified boolean NOT NULL DEFAULT false;
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS requires_identity boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.identity_verifications (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  front_path text NOT NULL,
  back_path text NOT NULL,
  reject_reason text,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS identity_verifications_user_idx ON public.identity_verifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS identity_verifications_status_idx ON public.identity_verifications (status, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS identity_verifications_one_pending_idx ON public.identity_verifications (user_id) WHERE status = 'pending';
ALTER TABLE public.identity_verifications ENABLE ROW LEVEL SECURITY;

-- مخزن خاص (غير عام) لصور الهويات
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('identity-docs', 'identity-docs', false, 6291456, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 6291456, allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp'];

INSERT INTO public.settings (key, value) VALUES
  ('identity_verification_enabled', 'false'),
  ('identity_verification_description', 'ارفع صورة واضحة للهوية من الأمام ومن الخلف. يجب أن تكون جميع البيانات مقروءة وغير مقصوصة.')
ON CONFLICT (key) DO NOTHING;

-- ==========================================================================
-- [PERF] 2026-11-24 — فهارس لتسريع مزامنة المزوّد والتنقل بين الأقسام
-- ==========================================================================
CREATE INDEX IF NOT EXISTS idx_products_provider_external ON public.products (provider_id, external_id);
CREATE INDEX IF NOT EXISTS idx_products_subcat_order ON public.products (subcategory_id, order_index, id);
CREATE INDEX IF NOT EXISTS idx_products_category_order ON public.products (category_id, order_index, id);
CREATE INDEX IF NOT EXISTS idx_products_category_order ON public.products (category_id, order_index, id);

-- ==========================================================================
-- [INVOICES] 2026-11-24 — السماح بحالة rejected في فواتير الدفع الآلي (تبويب "الفواتير والشحن التلقائي")
-- ==========================================================================
ALTER TABLE public.shamcash_invoices DROP CONSTRAINT IF EXISTS shamcash_invoices_status_check;
ALTER TABLE public.shamcash_invoices ADD CONSTRAINT shamcash_invoices_status_check CHECK (status = ANY (ARRAY['pending'::text, 'paid'::text, 'expired'::text, 'cancelled'::text, 'rejected'::text]));

-- ============================================================
-- 2026-11-27 — migration: agents_system (نظام الوكلاء)
-- ============================================================
-- users: agent_enabled (تفعيل فردي)، agent_code (كود الوكيل الفريد)، agent_id (الوكيل الذي سجّل المستخدم عبره)
-- agent_commissions: عمولة واحدة لكل طلب (order_id UNIQUE) + reversed_at عند الاسترجاع
-- agents_directory: صفحة "وكلائنا" (اسم، صورة، رابط موقع، هاتف، موقع جغرافي، وصف، ظهور، ترتيب)
-- settings: agents_enabled=false, agents_mode=selected, agent_commission_percent=5, agents_directory_enabled=true
-- apply_agent_commission(order, agent, user, amount, net_profit, percent): إضافة ذرّية لمرة واحدة + حركة رصيد
-- refund_order_once: أصبحت تعكس عمولة الوكيل المرتبطة بالطلب (مرة واحدة) عند الاسترجاع
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS agent_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS agent_code text,
  ADD COLUMN IF NOT EXISTS agent_id bigint REFERENCES public.users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_agent_code_uidx ON public.users (upper(agent_code)) WHERE agent_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS users_agent_id_idx ON public.users (agent_id) WHERE agent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS users_agent_enabled_idx ON public.users (agent_enabled) WHERE agent_enabled;
CREATE TABLE IF NOT EXISTS public.agent_commissions (
  id bigserial PRIMARY KEY, agent_id bigint NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_id bigint REFERENCES public.users(id) ON DELETE SET NULL, order_id bigint NOT NULL UNIQUE,
  amount numeric NOT NULL CHECK (amount > 0), net_profit numeric NOT NULL DEFAULT 0, percent numeric NOT NULL DEFAULT 0,
  reversed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.agent_commissions ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public.agents_directory (
  id bigserial PRIMARY KEY, name text NOT NULL, image_url text, website_url text, phone text, location text, description text,
  is_active boolean NOT NULL DEFAULT true, sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.agents_directory ENABLE ROW LEVEL SECURITY;
-- (نص الدالتين الكامل مطبّق عبر Supabase migration "agents_system")
