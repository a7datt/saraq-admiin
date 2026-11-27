/**
 * [PHASE-BOTS] منطق الأعمال المشترك بين لوحة الأدمن (مسارات HTTP) وبوتات تيليجرام:
 * توثيق الهوية، قواعد الخصم، تعديل الربح بالجملة. مصدر الحقيقة واحد، فلا تختلف نتائج البوت عن الموقع.
 */
import { loadDiscountRules, resolveDiscountPercent, sanitizeRulesInput, DiscountOwnerType } from "./discountEngine";

export const IDENTITY_BUCKET = "identity-docs";
const PAGE_SIZE = 1000;

export class CoreError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}

export async function fetchAllRows<T = any>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await build(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

const PRODUCT_COLS = "id, name, price, price_per_unit, store_type, default_profit, subcategory_id, sub_sub_category_id, category_id, markup_type, markup_value";

export function createStoreCore(supabase: any) {
  // ───────────── توثيق الهوية ─────────────
  async function getIdentitySettings(): Promise<{ enabled: boolean; description: string }> {
    const { data } = await supabase.from("settings").select("key,value").in("key", ["identity_verification_enabled", "identity_verification_description"]);
    const m: Record<string, string> = {};
    (data || []).forEach((r: any) => { m[r.key] = r.value; });
    return { enabled: m.identity_verification_enabled === "true", description: m.identity_verification_description || "" };
  }

  async function setIdentitySettings(p: { enabled?: boolean; description?: string }) {
    const rows: { key: string; value: string }[] = [];
    if (p.enabled !== undefined) rows.push({ key: "identity_verification_enabled", value: p.enabled ? "true" : "false" });
    if (p.description !== undefined) {
      if (typeof p.description !== "string") throw new CoreError("الوصف غير صحيح");
      rows.push({ key: "identity_verification_description", value: p.description.slice(0, 3000) });
    }
    if (rows.length === 0) throw new CoreError("لا توجد حقول للتعديل");
    const { error } = await supabase.from("settings").upsert(rows, { onConflict: "key" });
    if (error) throw error;
  }

  async function identityPendingCount(): Promise<number> {
    const { count, error } = await supabase.from("identity_verifications").select("id", { count: "exact", head: true }).eq("status", "pending");
    if (error) throw error;
    return count || 0;
  }

  async function listIdentityRequests(status: string, limit = 100) {
    let q = supabase.from("identity_verifications")
      .select("id, user_id, status, reject_reason, reviewed_by, reviewed_at, created_at").order("created_at", { ascending: false }).limit(limit);
    if (["pending", "approved", "rejected"].includes(status)) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) throw error;
    const rows = data || [];
    const ids = [...new Set(rows.map((r: any) => r.user_id))];
    const users: Record<string, any> = {};
    if (ids.length) {
      const { data: us } = await supabase.from("users").select("id, name, email, phone, identity_verified, telegram_chat_id").in("id", ids);
      (us || []).forEach((u: any) => { users[String(u.id)] = u; });
    }
    return rows.map((r: any) => ({ ...r, user: users[String(r.user_id)] || null }));
  }

  async function getIdentityRequest(id: number | string) {
    const { data } = await supabase.from("identity_verifications").select("*").eq("id", id).maybeSingle();
    if (!data) return null;
    const { data: u } = await supabase.from("users").select("id, name, email, phone, identity_verified, telegram_chat_id").eq("id", data.user_id).maybeSingle();
    return { ...data, user: u || null };
  }

  async function downloadIdentityImage(id: number | string, side: "front" | "back"): Promise<{ buf: Buffer; mime: string } | null> {
    const { data: row } = await supabase.from("identity_verifications").select("front_path, back_path").eq("id", id).maybeSingle();
    if (!row) return null;
    const { data: blob, error } = await supabase.storage.from(IDENTITY_BUCKET).download(side === "front" ? row.front_path : row.back_path);
    if (error || !blob) return null;
    return { buf: Buffer.from(await blob.arrayBuffer()), mime: blob.type || "image/jpeg" };
  }

  async function approveIdentity(id: number | string, reviewer: string): Promise<{ userId: number }> {
    const { data: upd, error } = await supabase.from("identity_verifications")
      .update({ status: "approved", reject_reason: null, reviewed_by: reviewer, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", id).eq("status", "pending").select("user_id").maybeSingle();
    if (error) throw error;
    if (!upd) throw new CoreError("الطلب غير موجود أو تمت مراجعته مسبقاً", 409);
    const { error: uErr } = await supabase.from("users").update({ identity_verified: true }).eq("id", upd.user_id);
    if (uErr) throw uErr;
    return { userId: upd.user_id };
  }

  async function rejectIdentity(id: number | string, reasonRaw: string, reviewer: string): Promise<{ userId: number; reason: string }> {
    const reason = String(reasonRaw || "").trim().slice(0, 300);
    if (reason.length < 3) throw new CoreError("سبب الرفض مطلوب");
    const { data: upd, error } = await supabase.from("identity_verifications")
      .update({ status: "rejected", reject_reason: reason, reviewed_by: reviewer, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", id).eq("status", "pending").select("user_id").maybeSingle();
    if (error) throw error;
    if (!upd) throw new CoreError("الطلب غير موجود أو تمت مراجعته مسبقاً", 409);
    return { userId: upd.user_id, reason };
  }

  // ───────────── نطاقات المنتجات ─────────────
  async function fetchProductsForScope(scopeType: string, scopeId: any): Promise<any[]> {
    let subIds: any[] | null = null;
    if (scopeType === "category") {
      const { data: subs, error } = await supabase.from("subcategories").select("id").eq("category_id", scopeId);
      if (error) throw error;
      subIds = (subs || []).map((x: any) => x.id);
      if (subIds.length === 0) return [];
    }
    return fetchAllRows((from, to) => {
      let q = supabase.from("products").select(PRODUCT_COLS + ", subcategories(category_id)");
      if (scopeType === "product") q = q.eq("id", scopeId);
      else if (scopeType === "sub_sub_category") q = q.eq("sub_sub_category_id", scopeId);
      else if (scopeType === "subcategory") q = q.eq("subcategory_id", scopeId);
      else if (scopeType === "category") q = q.in("subcategory_id", subIds as any[]);
      return q.order("id", { ascending: true }).range(from, to);
    });
  }

  async function fetchProductsForScopes(scopes: { scope_type: string; scope_id: any }[]): Promise<any[]> {
    if (scopes.some(sc => sc.scope_type === "all")) return fetchProductsForScope("all", null);
    const map = new Map<string, any>();
    for (const sc of scopes) for (const r of await fetchProductsForScope(sc.scope_type, sc.scope_id)) map.set(String(r.id), r);
    return [...map.values()];
  }

  // ───────────── قواعد الخصم ─────────────
  async function discountProductNames(rules: { scope_type: string; scope_id: any }[]): Promise<Record<string, string>> {
    const ids = rules.filter(r => r.scope_type === "product").map(r => r.scope_id);
    if (ids.length === 0) return {};
    const { data } = await supabase.from("products").select("id, name").in("id", ids);
    const out: Record<string, string> = {};
    (data || []).forEach((p: any) => { out[String(p.id)] = p.name; });
    return out;
  }

  async function saveDiscountRules(ownerType: DiscountOwnerType, ownerId: number | null, items: any) {
    let clean: ReturnType<typeof sanitizeRulesInput>;
    try { clean = sanitizeRulesInput(items); } catch (e: any) { throw new CoreError(e.message); }
    const oldRules = await loadDiscountRules(supabase, ownerType, ownerId);
    let del = supabase.from("discount_rules").delete().eq("owner_type", ownerType);
    del = ownerId === null ? del.is("owner_id", null) : del.eq("owner_id", ownerId);
    const { error: delErr } = await del;
    if (delErr) throw delErr;
    const asRows = (arr: { scope_type: string; scope_id: any; percent: number }[]) =>
      arr.map(r => ({ owner_type: ownerType, owner_id: ownerId, scope_type: r.scope_type, scope_id: r.scope_id, percent: r.percent }));
    if (clean.length > 0) {
      const { error: insErr } = await supabase.from("discount_rules").insert(asRows(clean));
      if (insErr) {
        if (oldRules.length > 0) await supabase.from("discount_rules").insert(asRows(oldRules));
        throw insErr;
      }
    }
    // مزامنة قيم العرض القديمة (شارة الرتبة، إعدادات VIP والـ API)
    const maxPct = clean.reduce((m, r) => Math.max(m, r.percent), 0);
    const allPct = clean.find(r => r.scope_type === "all")?.percent ?? 0;
    try {
      if (ownerType === "rank") await supabase.from("ranks").update({ discount_percent: maxPct }).eq("id", ownerId);
      else if (ownerType === "vip") await supabase.from("settings").upsert({ key: "vip_discount", value: String(maxPct) }, { onConflict: "key" });
      else if (ownerType === "api_global") await supabase.from("settings").upsert({ key: "public_api_discount_percent", value: String(allPct) }, { onConflict: "key" });
      else if (ownerType === "api_user") await supabase.from("api_tokens").update({ custom_discount_percent: null }).eq("user_id", ownerId);
    } catch { /* مزامنة اختيارية */ }

    // تحذير الخسارة
    const warnings: any[] = [];
    let warningCount = 0;
    if (clean.some(r => r.percent > 0)) {
      const products = await fetchProductsForScopes(clean.some(r => r.scope_type === "all") ? [{ scope_type: "all", scope_id: null }] : clean.map(r => ({ scope_type: r.scope_type, scope_id: r.scope_id })));
      const ruleObjs = clean.map(r => ({ owner_type: ownerType, owner_id: ownerId, scope_type: r.scope_type, scope_id: r.scope_id, percent: r.percent }));
      for (const p of products) {
        const r = resolveDiscountPercent(ruleObjs as any, p);
        if (r.capped) {
          warningCount++;
          if (warnings.length < 15) warnings.push({ id: p.id, name: p.name, requested: r.rule?.percent, max_allowed: r.cap });
        }
      }
    }
    const rules = await loadDiscountRules(supabase, ownerType, ownerId);
    return { rules, product_names: await discountProductNames(rules), warning_count: warningCount, warnings };
  }

  // ───────────── تعديل الربح بالجملة ─────────────
  function computeBulkProfitChange(p: any, op: string, type: string, value: number) {
    const base = parseFloat(String(p.price_per_unit)) || 0;
    if (p.store_type !== "external_api" || !(base > 0)) return null;
    const oldPrice = parseFloat(String(p.price)) || 0;
    const current = type === "fixed" ? oldPrice - base : (oldPrice / base - 1) * 100;
    let m = op === "set" ? value : op === "increase" ? current + value : current - value;
    m = Math.max(0, m);
    const newPrice = type === "fixed" ? +(base + m).toFixed(6) : +(base * (1 + m / 100)).toFixed(6);
    return { base, oldPrice, newPrice, newMarkup: +m.toFixed(6) };
  }

  function parseBulkProfitBody(body: any) {
    const op = ["set", "increase", "decrease"].includes(body?.op) ? body.op : "";
    const type = body?.markup_type === "fixed" ? "fixed" : "percent";
    const value = Number(body?.value);
    if (!op) throw new CoreError("نوع العملية غير صحيح");
    if (!Number.isFinite(value) || value < 0 || value > 100000) throw new CoreError("القيمة غير صحيحة");
    const rawScopes = Array.isArray(body?.scopes) ? body.scopes : [];
    if (rawScopes.length === 0) throw new CoreError("يرجى اختيار نطاق واحد على الأقل");
    let scopes: ReturnType<typeof sanitizeRulesInput>;
    try { scopes = sanitizeRulesInput(rawScopes.map((s: any) => ({ scope_type: s?.scope_type, scope_id: s?.scope_id, percent: 0 }))); }
    catch (e: any) { throw new CoreError(e.message); }
    return { op, type, value, scopes: scopes.map(s => ({ scope_type: s.scope_type, scope_id: s.scope_id })) };
  }

  async function bulkProfitPreview(body: any) {
    const parsed = parseBulkProfitBody(body);
    const products = await fetchProductsForScopes(parsed.scopes);
    const changes: any[] = [];
    for (const p of products) {
      const c = computeBulkProfitChange(p, parsed.op, parsed.type, parsed.value);
      if (c) changes.push({ id: p.id, name: p.name, ...c });
    }
    const step = Math.max(1, Math.floor(changes.length / 8));
    const samples = changes.filter((_, i) => i % step === 0).slice(0, 8).map(c => ({ id: c.id, name: c.name, old_price: c.oldPrice, new_price: c.newPrice }));
    return { total_in_scope: products.length, affected: changes.length, skipped: products.length - changes.length, samples };
  }

  async function bulkProfitApply(body: any, expectedCount?: number) {
    const parsed = parseBulkProfitBody(body);
    const products = await fetchProductsForScopes(parsed.scopes);
    const changes: { id: any; newPrice: number; newMarkup: number }[] = [];
    for (const p of products) {
      const c = computeBulkProfitChange(p, parsed.op, parsed.type, parsed.value);
      if (c) changes.push({ id: p.id, newPrice: c.newPrice, newMarkup: c.newMarkup });
    }
    if (expectedCount !== undefined && Number(expectedCount) !== changes.length) {
      throw new CoreError("تغيّرت المنتجات منذ المعاينة، أعد المعاينة ثم أكّد", 409);
    }
    let updated = 0;
    for (let i = 0; i < changes.length; i += 25) {
      const results = await Promise.all(changes.slice(i, i + 25).map(c =>
        supabase.from("products").update({ markup_type: parsed.type, markup_value: c.newMarkup, price: c.newPrice }).eq("id", c.id)
      ));
      updated += results.filter((r: any) => !r.error).length;
    }
    return { updated, failed: changes.length - updated, op: parsed.op, type: parsed.type, value: parsed.value };
  }

  return {
    getIdentitySettings, setIdentitySettings, identityPendingCount, listIdentityRequests, getIdentityRequest, downloadIdentityImage,
    approveIdentity, rejectIdentity, fetchProductsForScope, fetchProductsForScopes, discountProductNames, saveDiscountRules,
    bulkProfitPreview, bulkProfitApply, computeBulkProfitChange,
  };
}
