/**
 * [BOT-PARITY] أدوات بوت المستخدمين القابلة للاختبار بمعزل عن السيرفر.
 * حساب الخصم مطابق للموقع: القاعدة الأدق من محرك القواعد (VIP/رتبة) + خصومات مدى الحياة/المؤقت/المنتج الواحد
 * + حماية التكلفة، ثم الأعلى بينها (لا تُجمع).
 */
import { loadDiscountRules, resolveDiscountPercent } from "./discountEngine";

export function createBotPricing(supabase: any) {
  async function botDiscountPercent(userRow: any, product: any, consumeOneProduct = false): Promise<number> {
    try {
      let prod = product;
      // قواعد "القسم الرئيسي" تحتاج category_id للمنتج (البوت يجلب المنتج بلا join)
      if (prod && !prod.subcategories && prod.subcategory_id) {
        const { data: sc } = await supabase.from("subcategories").select("category_id").eq("id", prod.subcategory_id).maybeSingle();
        prod = { ...prod, subcategories: { category_id: sc?.category_id ?? null } };
      }
      let pct = 0;
      if (userRow?.is_vip) {
        pct = resolveDiscountPercent(await loadDiscountRules(supabase, "vip", null), prod).percent;
      }
      if (userRow?.rank_id != null) {
        const { data: rk } = await supabase.from("ranks").select("has_discount, is_active").eq("id", userRow.rank_id).maybeSingle();
        if (rk && rk.is_active && rk.has_discount) {
          pct = Math.max(pct, resolveDiscountPercent(await loadDiscountRules(supabase, "rank", userRow.rank_id), prod).percent);
        }
      }
      const { data: stats } = await supabase.from("user_stats")
        .select("*").eq("user_id", userRow.id).maybeSingle(); // select("*") كالموقع (بعض الأعمدة اختيارية وقد لا توجد)
      if (stats) {
        if (stats.lifetime_discount && stats.lifetime_discount > 0) pct = Math.max(pct, Number(stats.lifetime_discount));
        if (stats.discount_expires_at && new Date(stats.discount_expires_at) > new Date()) pct = Math.max(pct, Number(stats.active_discount) || 0);
        if (stats.one_product_discount_percent > 0) {
          pct = Math.max(pct, Number(stats.one_product_discount_percent));
          if (consumeOneProduct) await supabase.from("user_stats").update({ one_product_discount_percent: 0 }).eq("user_id", userRow.id);
        }
      }
      return pct > 0 && pct < 100 ? pct : 0;
    } catch { return 0; }
  }

  async function botFinalPrice(userRow: any, product: any, baseTotal: number, consumeOneProduct = false): Promise<{ final: number; percent: number }> {
    const pct = await botDiscountPercent(userRow, product, consumeOneProduct);
    return { final: pct > 0 ? baseTotal * (1 - pct / 100) : baseTotal, percent: pct };
  }

  return { botDiscountPercent, botFinalPrice };
}

// بريد/هاتف/اسم: نفس قواعد الموقع تقريباً (تطبيع + تحقق)
export const botNormEmail = (v: any) => String(v ?? "").trim().toLowerCase();
export const botValidEmail = (v: string) => v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
export const botValidPhone = (v: string) => /^\+?[0-9]{7,15}$/.test(v.replace(/[\s-]/g, ""));
