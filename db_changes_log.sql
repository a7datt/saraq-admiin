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


-- =====================================================================
-- نهاية السجل — آخر تحديث: 2026-11-10
-- كل الاستعلامات أعلاه idempotent؛ تنفيذها مرة أخرى على نفس القاعدة آمن.
-- =====================================================================
