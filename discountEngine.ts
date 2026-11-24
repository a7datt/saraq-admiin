/**
 * [PHASE-2] محرك قواعد الخصم الموحّد (Discount Rules Engine)
 * ---------------------------------------------------------------------------
 * نسخة مطابقة تماماً في مستودعَي saraqib-user و saraqib-admin (حافظ على تطابقهما).
 * كل قاعدة = (مالك، نطاق، نسبة). المالك: rank (رتبة) | vip | api_global.
 * النطاق: all | category | subcategory | sub_sub_category | product.
 * عند التعارض تُطبَّق قاعدة واحدة فقط: الأدق (منتج > فرع فرعي > فرعي > رئيسي > كل المنتجات).
 * حماية الخسارة: إن عُرفت تكلفة المنتج لا تُترك النسبة تُنزل السعر تحت التكلفة.
 */

export type DiscountOwnerType = "rank" | "vip" | "api_global";
export type DiscountScopeType = "all" | "category" | "subcategory" | "sub_sub_category" | "product";

export interface DiscountRule {
  id?: number;
  owner_type: DiscountOwnerType;
  owner_id: number | null;
  scope_type: DiscountScopeType;
  scope_id: number | null;
  percent: number;
}

export const SCOPE_SPECIFICITY: Record<DiscountScopeType, number> = {
  all: 1, category: 2, subcategory: 3, sub_sub_category: 4, product: 5,
};

/** يحمّل قواعد مالك واحد. عند أي خطأ (مثلاً الجدول غير موجود) يُرجع [] — أي لا خصم. */
export async function loadDiscountRules(supabase: any, ownerType: DiscountOwnerType, ownerId: number | string | null = null): Promise<DiscountRule[]> {
  try {
    let q = supabase.from("discount_rules").select("id, owner_type, owner_id, scope_type, scope_id, percent").eq("owner_type", ownerType);
    q = ownerId === null || ownerId === undefined ? q.is("owner_id", null) : q.eq("owner_id", ownerId);
    const { data, error } = await q;
    if (error || !Array.isArray(data)) return [];
    return data.map((r: any) => ({ ...r, percent: Number(r.percent) || 0 }));
  } catch { return []; }
}

/** سياق المنتج المطلوب لمطابقة النطاق. */
export function productScopeIds(product: any) {
  const categoryId = product?.subcategories?.category_id ?? product?.category_id ?? null;
  return {
    productId: product?.id ?? null,
    subSubId: product?.sub_sub_category_id ?? null,
    subId: product?.subcategory_id ?? null,
    categoryId,
  };
}

/** القاعدة الأدق المنطبقة على المنتج (أو null). */
export function pickMostSpecificRule(rules: DiscountRule[], product: any): DiscountRule | null {
  if (!rules || rules.length === 0) return null;
  const ids = productScopeIds(product);
  const eq = (a: any, b: any) => a !== null && a !== undefined && b !== null && b !== undefined && String(a) === String(b);
  let best: DiscountRule | null = null;
  for (const r of rules) {
    let match = false;
    switch (r.scope_type) {
      case "all": match = true; break;
      case "category": match = eq(r.scope_id, ids.categoryId); break;
      case "subcategory": match = eq(r.scope_id, ids.subId); break;
      case "sub_sub_category": match = eq(r.scope_id, ids.subSubId); break;
      case "product": match = eq(r.scope_id, ids.productId); break;
    }
    if (!match) continue;
    if (!best || SCOPE_SPECIFICITY[r.scope_type] > SCOPE_SPECIFICITY[best.scope_type]) best = r;
  }
  return best;
}

/** تكلفة الوحدة إن كانت معروفة بيقين، وإلا null (فلا حماية). */
export function productCostPerUnit(product: any): number | null {
  if (!product) return null;
  const price = parseFloat(String(product.price));
  if (product.store_type === "external_api") {
    const base = parseFloat(String(product.price_per_unit));
    return base > 0 ? base : null;
  }
  if (product.store_type === "quantities" || product.store_type === "packages") return null;
  const dp = product.default_profit;
  if (dp === undefined || dp === null || dp === "" || isNaN(parseFloat(String(dp)))) return null;
  const profit = parseFloat(String(dp));
  if (!(profit > 0) || !(price > 0)) return null;
  const cost = price - profit;
  return cost > 0 ? cost : null;
}

/** أقصى نسبة خصم تُبقي السعر عند التكلفة أو فوقها (null = غير معروفة/بلا سقف). */
export function maxDiscountPercentForCost(product: any): number | null {
  const cost = productCostPerUnit(product);
  const price = parseFloat(String(product?.price));
  if (cost === null || !(price > 0)) return null;
  return Math.max(0, Math.floor((1 - cost / price) * 100 * 1e4) / 1e4); // تقريب لأسفل كي لا يقل السعر عن التكلفة
}

/** النسبة النهائية من القواعد بعد حماية الخسارة. */
export function resolveDiscountPercent(rules: DiscountRule[], product: any): { percent: number; rule: DiscountRule | null; capped: boolean; cap: number | null } {
  const rule = pickMostSpecificRule(rules, product);
  if (!rule) return { percent: 0, rule: null, capped: false, cap: null };
  let pct = Number(rule.percent) || 0;
  if (!(pct > 0 && pct < 100)) return { percent: 0, rule, capped: false, cap: null };
  const cap = maxDiscountPercentForCost(product);
  let capped = false;
  if (cap !== null && pct > cap) { pct = cap; capped = true; }
  return { percent: pct, rule, capped, cap };
}

/** تحقق/تنظيف قواعد واردة من الأدمن. يرمي Error برسالة عربية عند أي خلل. */
export function sanitizeRulesInput(items: any): { scope_type: DiscountScopeType; scope_id: number | null; percent: number }[] {
  if (!Array.isArray(items)) throw new Error("صيغة القواعد غير صحيحة");
  if (items.length > 500) throw new Error("عدد القواعد كبير جداً");
  const valid: DiscountScopeType[] = ["all", "category", "subcategory", "sub_sub_category", "product"];
  const seen = new Set<string>();
  const out: { scope_type: DiscountScopeType; scope_id: number | null; percent: number }[] = [];
  for (const it of items) {
    const st = it?.scope_type as DiscountScopeType;
    if (!valid.includes(st)) throw new Error("نطاق غير صحيح");
    const pct = Number(it?.percent);
    if (!Number.isFinite(pct) || pct < 0 || pct >= 100) throw new Error("نسبة الخصم يجب أن تكون بين 0 و99.999");
    let sid: number | null = null;
    if (st !== "all") {
      sid = Number(it?.scope_id);
      if (!Number.isInteger(sid) || sid <= 0) throw new Error("معرّف النطاق غير صحيح");
    }
    const key = `${st}:${sid ?? 0}`;
    if (seen.has(key)) throw new Error("لا يمكن تكرار نفس النطاق في قاعدتين");
    seen.add(key);
    out.push({ scope_type: st, scope_id: sid, percent: +pct.toFixed(3) });
  }
  return out;
}
