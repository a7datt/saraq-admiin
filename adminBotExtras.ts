/**
 * [PHASE-BOTS] ميزات بوت الأدمن الجديدة (مطابقة لوحة الأدمن على الموقع):
 *  - 🛡️ توثيق الهوية (مراجعة الطلبات، عرض الصور، قبول/رفض بسبب، الإعدادات)
 *  - 🏷️ قواعد الخصم (VIP / API / كل رتبة) بنفس محرك الموقع + تحذير الخسارة
 *  - 📈 تعديل الربح بالجملة (نطاقات + معاينة + تأكيد)
 *  - 🏅 الرتب (تفعيل/خصم/المبلغ) — 💳 خيارات طرق الدفع (توثيق/QR) — 📢 الشريط المتحرك
 * الواجهة أزرار فقط قدر الإمكان، وكل العمليات تمرّ عبر storeCore (مصدر الحقيقة نفسه للموقع).
 * callback_data دائماً ≤ 64 بايت: x:<وحدة>:<إجراء>:<a>:<b>
 */
import type TelegramBot from "node-telegram-bot-api";
import { loadDiscountRules } from "./discountEngine";

type ScopeType = "all" | "category" | "subcategory" | "sub_sub_category" | "product";
const SCOPE_LABEL: Record<ScopeType, string> = {
  all: "كل المنتجات", category: "قسم رئيسي", subcategory: "قسم فرعي", sub_sub_category: "فرع فرعي", product: "منتج",
};
const PER_PAGE = 8;

export interface AdminExtrasDeps {
  supabase: any;
  storeCore: any;
  getBot: () => TelegramBot | null;
  sendOrEdit: (bot: TelegramBot, chatId: number, text: string, keyboard: any[][], messageId?: number) => Promise<void>;
  hasPerm: (chatId: number | string, key: string) => boolean;
  /** خريطة حالات إدخال النص المشتركة مع بقية بوت الأدمن */
  states: Map<number, { step: string; data: any }>;
  notifyIdentityResult: (userId: number | string, approved: boolean, reason?: string) => Promise<void>;
  uploadImage: (buf: ArrayBuffer) => Promise<string>;
  adminLabel: (chatId: number | string) => string;
}

type PickerMode = "dsc" | "bpf";
interface DscSession { ownerType: "rank" | "vip" | "api_global"; ownerId: number | null; title: string; rules: any[]; names: Record<string, string> }
interface PickerSession { mode: PickerMode; want: ScopeType }
interface BpfSession { scopes: { scope_type: ScopeType; scope_id: number | null; label: string }[]; op: "increase" | "decrease" | "set"; type: "percent" | "fixed"; value: number | null; lastPreview?: number }

export function createAdminExtras(d: AdminExtrasDeps) {
  const { supabase, storeCore } = d;
  const dsc = new Map<number, DscSession>();
  const picker = new Map<number, PickerSession>();
  const bpf = new Map<number, BpfSession>();
  const bpfOf = (chatId: number): BpfSession => {
    let s = bpf.get(chatId);
    if (!s) { s = { scopes: [], op: "increase", type: "percent", value: null }; bpf.set(chatId, s); }
    return s;
  };
  const cb = (...parts: (string | number)[]) => ["x", ...parts].join(":");
  const home = [{ text: "🏠 الرئيسية", callback_data: "menu:__home__:open:-:0" }];
  const back = (to: string) => [{ text: "🔙 رجوع", callback_data: to }, ...home];
  const bot = () => d.getBot();
  const fmt = (n: any) => (Number.isInteger(Number(n)) ? String(Number(n)) : String(+Number(n).toFixed(3)));
  const paged = <T,>(arr: T[], page: number) => {
    const total = Math.max(1, Math.ceil(arr.length / PER_PAGE));
    const p = Math.min(Math.max(0, page), total - 1);
    return { items: arr.slice(p * PER_PAGE, p * PER_PAGE + PER_PAGE), page: p, total };
  };
  const pagerRow = (prefix: string, page: number, total: number) => {
    const row: any[] = [];
    if (page > 0) row.push({ text: "◀️ السابق", callback_data: `${prefix}:${page - 1}` });
    if (page < total - 1) row.push({ text: "التالي ▶️", callback_data: `${prefix}:${page + 1}` });
    return row;
  };
  const clip = (s: string, n = 28) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

  async function send(chatId: number, text: string, keyboard: any[][], messageId?: number) {
    const b = bot(); if (!b) return;
    await d.sendOrEdit(b, chatId, text, keyboard, messageId);
  }

  // ═════════════ 🛡️ توثيق الهوية ═════════════
  async function identityHome(chatId: number, messageId?: number) {
    const cfg = await storeCore.getIdentitySettings();
    const pending = await storeCore.identityPendingCount();
    const text = ["🛡️ توثيق الهوية", "", `الحالة: ${cfg.enabled ? "🟢 مفعّل (الزر ظاهر للمستخدمين)" : "🔴 معطّل"}`, `طلبات قيد المراجعة: ${pending}`].join("\n");
    await send(chatId, text, [
      [{ text: `⏳ قيد المراجعة (${pending})`, callback_data: cb("idn", "list", "pending", 0) }],
      [{ text: "✅ الموثّقون", callback_data: cb("idn", "list", "approved", 0) }, { text: "❌ المرفوضة", callback_data: cb("idn", "list", "rejected", 0) }],
      [{ text: "⚙️ الإعدادات", callback_data: cb("idn", "cfg") }],
      home,
    ], messageId);
  }

  async function identityList(chatId: number, status: string, page: number, messageId?: number) {
    const rows = await storeCore.listIdentityRequests(status, 200);
    const pg = paged(rows, page);
    const titles: Record<string, string> = { pending: "⏳ قيد المراجعة", approved: "✅ الموثّقون", rejected: "❌ المرفوضة" };
    const kb: any[][] = pg.items.map((r: any) => [{ text: clip(`#${r.id} ${r.user?.name || "مستخدم"} (#${r.user_id})`, 40), callback_data: cb("idn", "view", r.id, status) }]);
    const pr = pagerRow(`x:idn:list:${status}`, pg.page, pg.total); if (pr.length) kb.push(pr);
    kb.push(back(cb("idn", "home")));
    await send(chatId, `🛡️ ${titles[status] || "الطلبات"}\nالعدد: ${rows.length} | صفحة ${pg.page + 1} من ${pg.total}${rows.length === 0 ? "\n\nلا توجد طلبات." : "\n\nاختر طلباً لعرضه:"}`, kb, messageId);
  }

  async function identityView(chatId: number, id: number, status: string) {
    const b = bot(); if (!b) return;
    const r = await storeCore.getIdentityRequest(id);
    if (!r) return send(chatId, "❌ الطلب غير موجود.", [back(cb("idn", "home"))]);
    const labels: Record<string, string> = { pending: "⏳ قيد المراجعة", approved: "✅ موثّق", rejected: "❌ مرفوض" };
    const info = [
      `🛡️ طلب توثيق #${r.id}`, "",
      `👤 ${r.user?.name || "—"} (#${r.user_id})${r.user?.identity_verified ? " ✅" : ""}`,
      r.user?.email ? `📧 ${r.user.email}` : "", r.user?.phone ? `📱 ${r.user.phone}` : "",
      `📌 الحالة: ${labels[r.status] || r.status}`,
      `🗓️ ${new Date(r.created_at).toLocaleString("ar-EG")}`,
      r.status === "rejected" && r.reject_reason ? `سبب الرفض: ${r.reject_reason}` : "",
    ].filter(Boolean).join("\n");
    // الصور تُرسل من السيرفر (المخزن خاص) كصور مباشرة للأدمن فقط
    for (const side of ["front", "back"] as const) {
      const img = await storeCore.downloadIdentityImage(id, side);
      if (img) { try { await b.sendPhoto(chatId, img.buf, { caption: side === "front" ? "الوجه الأمامي" : "الوجه الخلفي" }, { filename: `${side}.jpg`, contentType: img.mime }); } catch {} }
      else { try { await b.sendMessage(chatId, `⚠️ تعذّر تحميل صورة (${side === "front" ? "الأمامية" : "الخلفية"}).`); } catch {} }
    }
    const kb: any[][] = [];
    if (r.status === "pending" && d.hasPerm(chatId, "manual_topup")) kb.push([{ text: "✅ قبول", callback_data: cb("idn", "ok", id) }, { text: "❌ رفض", callback_data: cb("idn", "no", id) }]);
    kb.push(back(cb("idn", "list", status, 0)));
    await b.sendMessage(chatId, info, { reply_markup: { inline_keyboard: kb } });
  }

  async function identityConfig(chatId: number, messageId?: number) {
    const cfg = await storeCore.getIdentitySettings();
    await send(chatId, `⚙️ إعدادات التوثيق\n\nالحالة: ${cfg.enabled ? "🟢 مفعّل" : "🔴 معطّل"}\n\nالوصف الظاهر للمستخدم:\n${cfg.description || "—"}`, [
      [{ text: cfg.enabled ? "🔴 تعطيل التوثيق" : "🟢 تفعيل التوثيق", callback_data: cb("idn", "tg") }],
      [{ text: "✏️ تعديل الوصف", callback_data: cb("idn", "desc") }],
      back(cb("idn", "home")),
    ], messageId);
  }

  // ═════════════ اختيار النطاق (مشترك للخصم والربح) ═════════════
  async function pickerStart(chatId: number, mode: PickerMode, messageId?: number) {
    picker.set(chatId, { mode, want: "all" });
    const kb: any[][] = [];
    kb.push([{ text: "🌐 كل المنتجات", callback_data: cb("pk", "sel", "all", 0) }]);
    kb.push([{ text: "🗂️ قسم رئيسي", callback_data: cb("pk", "t", "category") }, { text: "📁 قسم فرعي", callback_data: cb("pk", "t", "subcategory") }]);
    kb.push([{ text: "📂 فرع فرعي", callback_data: cb("pk", "t", "sub_sub_category") }, { text: "📦 منتج (بحث)", callback_data: cb("pk", "t", "product") }]);
    kb.push(back(mode === "dsc" ? cb("dsc", "refresh") : cb("bpf", "open")));
    await send(chatId, "اختر نوع النطاق:", kb, messageId);
  }

  async function pickerCategories(chatId: number, page: number, messageId?: number) {
    const ps = picker.get(chatId); if (!ps) return;
    const { data } = await supabase.from("categories").select("id, name").order("order_index", { ascending: true }).order("id");
    const pg = paged(data || [], page);
    const drill = ps.want !== "category";
    const kb: any[][] = pg.items.map((c: any) => [{ text: clip(c.name), callback_data: drill ? cb("pk", "sub", c.id, 0) : cb("pk", "sel", "category", c.id) }]);
    const pr = pagerRow("x:pk:cat", pg.page, pg.total); if (pr.length) kb.push(pr);
    kb.push(back(cb("pk", "start")));
    await send(chatId, `اختر القسم الرئيسي${drill ? " (للدخول إلى أقسامه الفرعية)" : ""}:`, kb, messageId);
  }

  async function pickerSubs(chatId: number, catId: number, page: number, messageId?: number) {
    const ps = picker.get(chatId); if (!ps) return;
    const { data } = await supabase.from("subcategories").select("id, name").eq("category_id", catId).order("order_index", { ascending: true }).order("id");
    const pg = paged(data || [], page);
    const drill = ps.want === "sub_sub_category";
    const kb: any[][] = pg.items.map((c: any) => [{ text: clip(c.name), callback_data: drill ? cb("pk", "ssub", c.id, 0) : cb("pk", "sel", "subcategory", c.id) }]);
    const pr = pagerRow(`x:pk:sub:${catId}`, pg.page, pg.total); if (pr.length) kb.push(pr);
    kb.push(back(cb("pk", "cat", 0)));
    await send(chatId, `اختر القسم الفرعي${drill ? " (للدخول إلى فروعه)" : ""}:${(data || []).length === 0 ? "\n\nلا توجد أقسام فرعية." : ""}`, kb, messageId);
  }

  async function pickerSubSubs(chatId: number, subId: number, page: number, messageId?: number) {
    const { data } = await supabase.from("sub_sub_categories").select("id, name, subcategory_id").eq("subcategory_id", subId).order("order_index", { ascending: true }).order("id");
    const pg = paged(data || [], page);
    const kb: any[][] = pg.items.map((c: any) => [{ text: clip(c.name), callback_data: cb("pk", "sel", "sub_sub_category", c.id) }]);
    const pr = pagerRow(`x:pk:ssub:${subId}`, pg.page, pg.total); if (pr.length) kb.push(pr);
    const { data: sub } = await supabase.from("subcategories").select("category_id").eq("id", subId).maybeSingle();
    kb.push(back(cb("pk", "sub", sub?.category_id ?? 0, 0)));
    await send(chatId, `اختر الفرع الفرعي:${(data || []).length === 0 ? "\n\nلا توجد فروع." : ""}`, kb, messageId);
  }

  async function labelFor(type: ScopeType, id: number | null): Promise<string> {
    if (type === "all") return "كل المنتجات";
    const table = type === "category" ? "categories" : type === "subcategory" ? "subcategories" : type === "sub_sub_category" ? "sub_sub_categories" : "products";
    const { data } = await supabase.from(table).select("name").eq("id", id).maybeSingle();
    return data?.name || `#${id}`;
  }

  async function pickerSelected(chatId: number, type: ScopeType, id: number | null, messageId?: number) {
    const ps = picker.get(chatId); if (!ps) return;
    const label = await labelFor(type, id);
    picker.delete(chatId);
    if (ps.mode === "dsc") {
      const s = dsc.get(chatId); if (!s) return;
      d.states.set(chatId, { step: "x_dsc_pct", data: { scope_type: type, scope_id: id, label } });
      await send(chatId, `النطاق: ${SCOPE_LABEL[type]} — ${label}\n\n✏️ أرسل نسبة الخصم (مثال: 2.5):`, [back(cb("dsc", "refresh"))], messageId);
    } else {
      const s = bpfOf(chatId);
      if (!s.scopes.some(x => x.scope_type === type && x.scope_id === id)) s.scopes.push({ scope_type: type, scope_id: id, label });
      await bulkHome(chatId, messageId);
    }
  }

  // ═════════════ 🏷️ قواعد الخصم ═════════════
  async function discountsHome(chatId: number, messageId?: number) {
    const { data: ranks } = await supabase.from("ranks").select("id, name").order("sort_order", { ascending: true });
    const kb: any[][] = [
      [{ text: "💎 خصم VIP", callback_data: cb("dsc", "own", "vip", 0) }],
      [{ text: "🔌 خصم الـ API", callback_data: cb("dsc", "own", "api_global", 0) }],
      ...(ranks || []).map((r: any) => [{ text: `🏅 رتبة: ${clip(r.name, 24)}`, callback_data: cb("dsc", "own", "rank", r.id) }]),
      home,
    ];
    await send(chatId, "🏷️ قواعد الخصم\n\nلكل جهة قواعد متعددة (قسم/قسم فرعي/فرع فرعي/منتج/الكل) بنسب مستقلة. عند التعارض تُطبَّق القاعدة الأدق فقط: منتج ← فرع فرعي ← فرعي ← رئيسي ← الكل.\n\nاختر الجهة:", kb, messageId);
  }

  async function discountsOwner(chatId: number, messageId?: number, warning?: string) {
    const s = dsc.get(chatId); if (!s) return discountsHome(chatId, messageId);
    const rules = await loadDiscountRules(supabase, s.ownerType, s.ownerId);
    s.rules = rules;
    // أسماء النطاقات
    const lines: string[] = [];
    for (let i = 0; i < rules.length; i++) {
      const r: any = rules[i];
      const label = await labelFor(r.scope_type, r.scope_id);
      lines.push(`${i + 1}) ${SCOPE_LABEL[r.scope_type as ScopeType]}${r.scope_type === "all" ? "" : ` — ${label}`}: ${fmt(r.percent)}%`);
    }
    const kb: any[][] = rules.map((_: any, i: number) => [{ text: `🗑 حذف القاعدة ${i + 1}`, callback_data: cb("dsc", "del", i) }]);
    kb.push([{ text: "➕ إضافة قاعدة", callback_data: cb("dsc", "add") }]);
    kb.push(back(cb("dsc", "home")));
    const text = [`🏷️ ${s.title}`, "", lines.length ? lines.join("\n") : "لا توجد قواعد — لا يُطبَّق أي خصم.", warning ? `\n${warning}` : ""].filter(x => x !== "").join("\n");
    await send(chatId, text, kb, messageId);
  }

  async function discountsSave(chatId: number, rules: any[], messageId?: number) {
    const s = dsc.get(chatId); if (!s) return;
    try {
      const r = await storeCore.saveDiscountRules(s.ownerType, s.ownerId, rules.map(x => ({ scope_type: x.scope_type, scope_id: x.scope_id, percent: Number(x.percent) })));
      const warn = r.warning_count > 0
        ? `⚠️ ${r.warning_count} منتج ينزل سعره تحت التكلفة بعد هذا الخصم — سيُخفَّض الخصم تلقائياً لحدّه الآمن.\n${r.warnings.slice(0, 5).map((w: any) => `• ${clip(w.name, 30)}: ${w.requested}% ← الحد الآمن ${w.max_allowed}%`).join("\n")}`
        : "✅ تم الحفظ.";
      await discountsOwner(chatId, messageId, warn);
    } catch (e: any) {
      await send(chatId, `❌ ${e?.message || "تعذّر الحفظ"}`, [back(cb("dsc", "refresh"))], messageId);
    }
  }

  // ═════════════ 📈 تعديل الربح بالجملة ═════════════
  async function bulkHome(chatId: number, messageId?: number) {
    const s = bpfOf(chatId);
    const opL = { increase: "رفع الربح", decrease: "خفض الربح", set: "ضبط الربح" }[s.op];
    const unit = s.type === "percent" ? "%" : "$";
    const text = [
      "📈 تعديل الربح بالجملة", "",
      `النطاقات: ${s.scopes.length ? "\n" + s.scopes.map((x, i) => `${i + 1}) ${SCOPE_LABEL[x.scope_type]}${x.scope_type === "all" ? "" : ` — ${clip(x.label, 30)}`}`).join("\n") : "لم تُحدَّد بعد"}`,
      `العملية: ${opL}`, `النوع: ${s.type === "percent" ? "نسبة مئوية" : "مبلغ ثابت"}`,
      `القيمة: ${s.value === null ? "لم تُحدَّد" : fmt(s.value) + unit}`, "",
      "يُطبَّق على منتجات المزوّد الخارجي فقط (لها أساس تكلفة)، والبقية تُتخطّى.",
    ].join("\n");
    const kb: any[][] = [
      [{ text: "➕ إضافة نطاق", callback_data: cb("bpf", "add") }, ...(s.scopes.length ? [{ text: "🗑 مسح النطاقات", callback_data: cb("bpf", "clr") }] : [])],
      [{ text: s.op === "increase" ? "● رفع" : "رفع", callback_data: cb("bpf", "op", "increase") }, { text: s.op === "decrease" ? "● خفض" : "خفض", callback_data: cb("bpf", "op", "decrease") }, { text: s.op === "set" ? "● ضبط" : "ضبط", callback_data: cb("bpf", "op", "set") }],
      [{ text: s.type === "percent" ? "● نسبة %" : "نسبة %", callback_data: cb("bpf", "ty", "percent") }, { text: s.type === "fixed" ? "● مبلغ $" : "مبلغ $", callback_data: cb("bpf", "ty", "fixed") }],
      [{ text: "🔢 تحديد القيمة", callback_data: cb("bpf", "val") }],
      [{ text: "👁 معاينة قبل التطبيق", callback_data: cb("bpf", "prev") }],
      home,
    ];
    await send(chatId, text, kb, messageId);
  }

  function bpfBody(s: BpfSession) {
    return { scopes: s.scopes.map(x => ({ scope_type: x.scope_type, scope_id: x.scope_id })), op: s.op, markup_type: s.type, value: s.value };
  }

  async function bulkPreview(chatId: number, messageId?: number) {
    const s = bpfOf(chatId);
    if (!s.scopes.length) return send(chatId, "⚠️ اختر نطاقاً واحداً على الأقل أولاً.", [back(cb("bpf", "open"))], messageId);
    if (s.value === null) return send(chatId, "⚠️ حدّد القيمة أولاً.", [back(cb("bpf", "open"))], messageId);
    try {
      const p = await storeCore.bulkProfitPreview(bpfBody(s));
      s.lastPreview = p.affected;
      const text = [
        "👁 نتيجة المعاينة", "",
        `ستتأثر: ${p.affected} منتج`, `تُتخطّى (بلا مزوّد): ${p.skipped}`, `إجمالي النطاق: ${p.total_in_scope}`, "",
        p.samples.length ? "أمثلة (السعر قبل ← بعد):" : "",
        ...p.samples.map((x: any) => `• ${clip(x.name, 28)}: ${fmt(x.old_price)} ← ${fmt(x.new_price)}`),
      ].filter((x: string) => x !== "").join("\n");
      const kb: any[][] = [];
      if (p.affected > 0) kb.push([{ text: `✅ تأكيد وتطبيق على ${p.affected} منتج`, callback_data: cb("bpf", "apply") }]);
      kb.push(back(cb("bpf", "open")));
      await send(chatId, text, kb, messageId);
    } catch (e: any) { await send(chatId, `❌ ${e?.message || "فشلت المعاينة"}`, [back(cb("bpf", "open"))], messageId); }
  }

  async function bulkApply(chatId: number, messageId?: number) {
    const s = bpfOf(chatId);
    try {
      const r = await storeCore.bulkProfitApply(bpfBody(s), s.lastPreview);
      bpf.delete(chatId);
      await send(chatId, `✅ تم تعديل ${r.updated} منتج${r.failed ? ` (فشل ${r.failed})` : ""}.`, [home], messageId);
    } catch (e: any) { await send(chatId, `❌ ${e?.message || "فشل التطبيق"}`, [back(cb("bpf", "open"))], messageId); }
  }

  // ═════════════ 🏅 الرتب ═════════════
  async function ranksHome(chatId: number, messageId?: number) {
    const { data: ranks } = await supabase.from("ranks").select("id, name, required_amount, has_discount, is_active, sort_order").order("sort_order", { ascending: true });
    const kb: any[][] = (ranks || []).map((r: any) => [{ text: `${r.is_active ? "🟢" : "🔴"} ${clip(r.name, 22)} — ${fmt(r.required_amount)}$`, callback_data: cb("rnk", "view", r.id) }]);
    kb.push([{ text: "🔄 إعادة حساب رتب كل المستخدمين", callback_data: cb("rnk", "recalc") }]);
    kb.push(home);
    await send(chatId, "🏅 الرتب\n\nالرتبة تُمنح تلقائياً حسب إجمالي الشحن. اختر رتبة لإدارتها:", kb, messageId);
  }

  async function rankView(chatId: number, id: number, messageId?: number) {
    const { data: r } = await supabase.from("ranks").select("*").eq("id", id).maybeSingle();
    if (!r) return send(chatId, "❌ الرتبة غير موجودة.", [back(cb("rnk", "home"))], messageId);
    const { count } = await supabase.from("discount_rules").select("id", { count: "exact", head: true }).eq("owner_type", "rank").eq("owner_id", id);
    const { count: users } = await supabase.from("users").select("id", { count: "exact", head: true }).eq("rank_id", id);
    const text = [`🏅 ${r.name}`, "", `الحالة: ${r.is_active ? "🟢 مفعّلة" : "🔴 معطّلة"}`, `المبلغ المطلوب شحنه: ${fmt(r.required_amount)}$`,
      `الخصم: ${r.has_discount ? "🟢 مفعّل" : "🔴 معطّل"} (${count || 0} قاعدة)`, `عدد المستخدمين: ${users || 0}`].join("\n");
    await send(chatId, text, [
      [{ text: r.is_active ? "🔴 تعطيل الرتبة" : "🟢 تفعيل الرتبة", callback_data: cb("rnk", "act", id) }],
      [{ text: r.has_discount ? "🔴 تعطيل الخصم" : "🟢 تفعيل الخصم", callback_data: cb("rnk", "hd", id) }],
      [{ text: "💵 تعديل المبلغ المطلوب", callback_data: cb("rnk", "amt", id) }],
      [{ text: "🏷️ قواعد خصم الرتبة", callback_data: cb("dsc", "own", "rank", id) }],
      back(cb("rnk", "home")),
    ], messageId);
  }

  // ═════════════ 💳 خيارات طرق الدفع (توثيق + QR) ═════════════
  async function pmList(chatId: number, page: number, messageId?: number) {
    const { data } = await supabase.from("payment_methods").select("id, name, requires_identity, active").order("order_index", { ascending: true }).order("id");
    const pg = paged(data || [], page);
    const kb: any[][] = pg.items.map((m: any) => [{ text: `${m.active ? "🟢" : "⚪"} ${clip(m.name, 26)}${m.requires_identity ? " 🛡️" : ""}`, callback_data: cb("pmf", "view", m.id) }]);
    const pr = pagerRow("x:pmf:list", pg.page, pg.total); if (pr.length) kb.push(pr);
    kb.push(back("menu:store_payment_methods:open:-:0"));
    await send(chatId, "💳 خيارات طرق الدفع\n\n🛡️ = تتطلب توثيق الهوية\nاختر طريقة:", kb, messageId);
  }

  async function pmView(chatId: number, id: number, messageId?: number) {
    const { data: m } = await supabase.from("payment_methods").select("*").eq("id", id).maybeSingle();
    if (!m) return send(chatId, "❌ الطريقة غير موجودة.", [back(cb("pmf", "list", 0))], messageId);
    const hasAddr = !!String(m.wallet_address || "").trim();
    const text = [`💳 ${m.name}`, "",
      `🛡️ يتطلب توثيق الهوية: ${m.requires_identity ? "نعم" : "لا"}`,
      `🔲 رمز QR: ${m.qr_enabled && hasAddr ? "مفعّل" : "معطّل"}${hasAddr ? "" : " (أضف عنوان محفظة أولاً)"}`,
      m.qr_enabled ? `مصدر الـ QR: ${m.qr_mode === "image" ? "صورة جاهزة" : "توليد تلقائي من العنوان"}` : "",
      m.qr_enabled && m.qr_mode === "image" ? `صورة QR: ${m.qr_image_url ? "مرفوعة ✅" : "غير مرفوعة ⚠️"}` : "",
    ].filter(Boolean).join("\n");
    const kb: any[][] = [
      [{ text: m.requires_identity ? "🛡️ إلغاء اشتراط التوثيق" : "🛡️ اشتراط توثيق الهوية", callback_data: cb("pmf", "id", id) }],
      [{ text: m.qr_enabled ? "🔲 تعطيل QR" : "🔲 تفعيل QR", callback_data: cb("pmf", "qr", id) }],
    ];
    if (m.qr_enabled) {
      kb.push([{ text: m.qr_mode === "auto" ? "● توليد تلقائي" : "توليد تلقائي", callback_data: cb("pmf", "mode", id, "auto") }, { text: m.qr_mode === "image" ? "● صورة جاهزة" : "صورة جاهزة", callback_data: cb("pmf", "mode", id, "image") }]);
      if (m.qr_mode === "image") kb.push([{ text: "📤 رفع صورة QR", callback_data: cb("pmf", "up", id) }]);
    }
    kb.push(back(cb("pmf", "list", 0)));
    await send(chatId, text, kb, messageId);
  }

  // ═════════════ 📢 الشريط المتحرك ═════════════
  async function marqueeHome(chatId: number, messageId?: number) {
    const { data } = await supabase.from("store_appearance").select("marquee_enabled, marquee_text").eq("id", 1).maybeSingle();
    const on = !!data?.marquee_enabled;
    await send(chatId, `📢 الشريط النصي المتحرك (الصفحة الرئيسية)\n\nالحالة: ${on ? "🟢 مفعّل" : "🔴 معطّل"}\n\nالنص:\n${data?.marquee_text || "—"}`, [
      [{ text: on ? "🔴 تعطيل الشريط" : "🟢 تفعيل الشريط", callback_data: cb("mqe", "tg") }],
      [{ text: "✏️ تعديل النص", callback_data: cb("mqe", "txt") }],
      back("menu:settings_store:open:-:0"),
    ], messageId);
  }

  // ═════════════ نقاط الدخول ═════════════
  async function openSection(section: string, chatId: number, messageId?: number) {
    if (section === "identity") return identityHome(chatId, messageId);
    if (section === "pricing_discounts") return discountsHome(chatId, messageId);
    if (section === "pricing_bulk") return bulkHome(chatId, messageId);
    if (section === "pricing_ranks") return ranksHome(chatId, messageId);
    if (section === "marquee") return marqueeHome(chatId, messageId);
    if (section === "pm_flags") return pmList(chatId, 0, messageId);
  }

  const PERMS: Record<string, string> = { idn: "manual_topup", dsc: "manage_products", bpf: "manage_products", pk: "manage_products", rnk: "manage_rewards", pmf: "manage_categories", mqe: "settings_store" };

  /** يعالج callback_data بالبادئة x: — يرجع true إن عالجها */
  async function handleCallback(query: any): Promise<boolean> {
    const data: string = query.data || "";
    if (!data.startsWith("x:")) return false;
    const chatId: number = query.message.chat.id;
    const mid: number | undefined = query.message?.message_id;
    const b = bot(); if (!b) return true;
    const [, mod, act, a, c] = data.split(":");
    const ack = async (text?: string) => { try { await b.answerCallbackQuery(query.id, text ? { text, show_alert: false } : undefined); } catch {} };
    const need = PERMS[mod];
    if (need && !d.hasPerm(chatId, need)) { try { await b.answerCallbackQuery(query.id, { text: "⛔ لا تملك صلاحية هذا القسم", show_alert: true }); } catch {} return true; }
    try {
      // ───── توثيق الهوية
      if (mod === "idn") {
        if (act === "home") { await ack(); await identityHome(chatId, mid); }
        else if (act === "list") { await ack(); await identityList(chatId, a, parseInt(c || "0", 10) || 0, mid); }
        else if (act === "view") { await ack(); await identityView(chatId, Number(a), c || "pending"); }
        else if (act === "ok") {
          try {
            const r = await storeCore.approveIdentity(Number(a), d.adminLabel(chatId));
            await d.notifyIdentityResult(r.userId, true);
            await ack("✅ تم التوثيق");
            await send(chatId, `✅ تم توثيق المستخدم #${r.userId}.`, [back(cb("idn", "list", "pending", 0))], mid);
          } catch (e: any) { await ack(e?.message || "فشل"); await send(chatId, `❌ ${e?.message || "فشل القبول"}`, [back(cb("idn", "list", "pending", 0))], mid); }
        }
        else if (act === "no") {
          await ack();
          d.states.set(chatId, { step: "x_idn_reason", data: { id: Number(a) } });
          await send(chatId, "✏️ اكتب سبب الرفض (سيصل للمستخدم):", [back(cb("idn", "list", "pending", 0))]);
        }
        else if (act === "cfg") { await ack(); await identityConfig(chatId, mid); }
        else if (act === "tg") {
          const cfg = await storeCore.getIdentitySettings();
          await storeCore.setIdentitySettings({ enabled: !cfg.enabled });
          await ack(cfg.enabled ? "تم التعطيل" : "تم التفعيل"); await identityConfig(chatId, mid);
        }
        else if (act === "desc") {
          await ack();
          d.states.set(chatId, { step: "x_idn_desc", data: {} });
          await send(chatId, "✏️ أرسل وصف التوثيق الجديد (ما المطلوب من المستخدم):", [back(cb("idn", "cfg"))]);
        }
        return true;
      }
      // ───── اختيار النطاق
      if (mod === "pk") {
        await ack();
        const ps = picker.get(chatId);
        if (act === "start") return (await pickerStart(chatId, ps?.mode || "dsc", mid), true);
        if (!ps) { await send(chatId, "⌛ انتهت الجلسة، ابدأ من جديد.", [home], mid); return true; }
        if (act === "t") {
          ps.want = a as ScopeType;
          if (a === "product") { d.states.set(chatId, { step: "x_pk_search", data: {} }); await send(chatId, "🔎 اكتب جزءاً من اسم المنتج (حرفان على الأقل):", [back(cb("pk", "start"))], mid); }
          else await pickerCategories(chatId, 0, mid);
        }
        else if (act === "cat") await pickerCategories(chatId, parseInt(a || "0", 10) || 0, mid);
        else if (act === "sub") await pickerSubs(chatId, Number(a), parseInt(c || "0", 10) || 0, mid);
        else if (act === "ssub") await pickerSubSubs(chatId, Number(a), parseInt(c || "0", 10) || 0, mid);
        else if (act === "sel") await pickerSelected(chatId, a as ScopeType, a === "all" ? null : Number(c), mid);
        return true;
      }
      // ───── قواعد الخصم
      if (mod === "dsc") {
        await ack();
        if (act === "home") { dsc.delete(chatId); await discountsHome(chatId, mid); }
        else if (act === "own") {
          const ownerType = a as any; const ownerId = ownerType === "rank" ? Number(c) : null;
          let title = ownerType === "vip" ? "قواعد خصم VIP" : ownerType === "api_global" ? "قواعد خصم الـ API" : "قواعد خصم الرتبة";
          if (ownerType === "rank") { const { data: r } = await supabase.from("ranks").select("name").eq("id", ownerId).maybeSingle(); title = `قواعد خصم رتبة «${r?.name || ownerId}»`; }
          dsc.set(chatId, { ownerType, ownerId, title, rules: [], names: {} });
          await discountsOwner(chatId, mid);
        }
        else if (act === "refresh") { await discountsOwner(chatId, mid); }
        else if (act === "add") { await pickerStart(chatId, "dsc", mid); }
        else if (act === "del") {
          const s = dsc.get(chatId); if (!s) return true;
          const idx = Number(a); const rules = s.rules.filter((_: any, i: number) => i !== idx);
          await discountsSave(chatId, rules, mid);
        }
        return true;
      }
      // ───── الربح بالجملة
      if (mod === "bpf") {
        await ack();
        const s = bpfOf(chatId);
        if (act === "open") await bulkHome(chatId, mid);
        else if (act === "add") await pickerStart(chatId, "bpf", mid);
        else if (act === "clr") { s.scopes = []; await bulkHome(chatId, mid); }
        else if (act === "op") { s.op = a as any; s.lastPreview = undefined; await bulkHome(chatId, mid); }
        else if (act === "ty") { s.type = a as any; s.lastPreview = undefined; await bulkHome(chatId, mid); }
        else if (act === "val") { d.states.set(chatId, { step: "x_bpf_val", data: {} }); await send(chatId, "🔢 أرسل القيمة (رقم، مثال: 2.5):", [back(cb("bpf", "open"))], mid); }
        else if (act === "prev") await bulkPreview(chatId, mid);
        else if (act === "apply") await bulkApply(chatId, mid);
        return true;
      }
      // ───── الرتب
      if (mod === "rnk") {
        await ack();
        if (act === "home") await ranksHome(chatId, mid);
        else if (act === "view") await rankView(chatId, Number(a), mid);
        else if (act === "act" || act === "hd") {
          const { data: r } = await supabase.from("ranks").select("is_active, has_discount").eq("id", a).maybeSingle();
          if (r) await supabase.from("ranks").update(act === "act" ? { is_active: !r.is_active } : { has_discount: !r.has_discount, ...(r.has_discount ? { discount_percent: 0 } : {}) }).eq("id", a);
          await supabase.rpc("recalc_all_user_ranks");
          await rankView(chatId, Number(a), mid);
        }
        else if (act === "amt") { d.states.set(chatId, { step: "x_rnk_amt", data: { id: Number(a) } }); await send(chatId, "💵 أرسل المبلغ المطلوب شحنه للرتبة بالدولار:", [back(cb("rnk", "view", a))], mid); }
        else if (act === "recalc") { await supabase.rpc("recalc_all_user_ranks"); await ranksHome(chatId, mid); }
        return true;
      }
      // ───── طرق الدفع
      if (mod === "pmf") {
        await ack();
        if (act === "list") await pmList(chatId, parseInt(a || "0", 10) || 0, mid);
        else if (act === "view") await pmView(chatId, Number(a), mid);
        else if (act === "id") {
          const { data: m } = await supabase.from("payment_methods").select("requires_identity").eq("id", a).maybeSingle();
          if (m) await supabase.from("payment_methods").update({ requires_identity: !m.requires_identity }).eq("id", a);
          await pmView(chatId, Number(a), mid);
        }
        else if (act === "qr") {
          const { data: m } = await supabase.from("payment_methods").select("qr_enabled, wallet_address").eq("id", a).maybeSingle();
          if (m) {
            if (!m.qr_enabled && !String(m.wallet_address || "").trim()) { await send(chatId, "⚠️ لا يمكن تفعيل QR بدون عنوان محفظة. أضف العنوان من لوحة الأدمن أولاً.", [back(cb("pmf", "view", a))], mid); return true; }
            await supabase.from("payment_methods").update(m.qr_enabled ? { qr_enabled: false, qr_always_open: false } : { qr_enabled: true }).eq("id", a);
          }
          await pmView(chatId, Number(a), mid);
        }
        else if (act === "mode") {
          const { data: m } = await supabase.from("payment_methods").select("qr_image_url").eq("id", a).maybeSingle();
          const mode = c === "image" && m?.qr_image_url ? "image" : "auto";
          await supabase.from("payment_methods").update({ qr_mode: mode }).eq("id", a);
          if (c === "image" && !m?.qr_image_url) { d.states.set(chatId, { step: "x_pmf_qr", data: { id: Number(a) } }); await send(chatId, "📤 أرسل صورة رمز QR الآن (كصورة):", [back(cb("pmf", "view", a))], mid); }
          else await pmView(chatId, Number(a), mid);
        }
        else if (act === "up") { d.states.set(chatId, { step: "x_pmf_qr", data: { id: Number(a) } }); await send(chatId, "📤 أرسل صورة رمز QR الآن (كصورة):", [back(cb("pmf", "view", a))], mid); }
        return true;
      }
      // ───── الشريط المتحرك
      if (mod === "mqe") {
        await ack();
        if (act === "open") await marqueeHome(chatId, mid);
        else if (act === "tg") {
          const { data } = await supabase.from("store_appearance").select("marquee_enabled").eq("id", 1).maybeSingle();
          await supabase.from("store_appearance").upsert({ id: 1, marquee_enabled: !data?.marquee_enabled, updated_at: new Date().toISOString() });
          await marqueeHome(chatId, mid);
        } else if (act === "txt") {
          d.states.set(chatId, { step: "x_mqe_txt", data: {} });
          await send(chatId, "✏️ أرسل نص الشريط (جملة كاملة بأي طول، حتى 2000 حرف):", [back("menu:settings_store:open:-:0")], mid);
        }
        return true;
      }
    } catch (e: any) {
      console.error("[ADMIN BOT x] callback error:", e);
      try { await b.answerCallbackQuery(query.id, { text: "حدث خطأ، حاول مجدداً", show_alert: false }); } catch {}
    }
    return true;
  }

  /** معالج الرسائل النصية/الصور لحالات x_* — يرجع true إن عالج الرسالة */
  async function handleMessage(msg: any, state: { step: string; data: any }): Promise<boolean> {
    if (!state.step.startsWith("x_")) return false;
    const chatId: number = msg.chat.id; const text = String(msg.text || "").trim();
    const b = bot(); if (!b) return true;
    const done = () => d.states.delete(chatId);
    try {
      if (state.step === "x_idn_reason") {
        if (!d.hasPerm(chatId, "manual_topup")) return done(), true;
        try {
          const r = await storeCore.rejectIdentity(state.data.id, text, d.adminLabel(chatId));
          await d.notifyIdentityResult(r.userId, false, r.reason);
          done();
          await b.sendMessage(chatId, `❌ تم رفض الطلب وإبلاغ المستخدم.`, { reply_markup: { inline_keyboard: [back(cb("idn", "list", "pending", 0))] } });
        } catch (e: any) { await b.sendMessage(chatId, `❌ ${e?.message || "فشل الرفض"}`); if (e?.status === 409) done(); }
        return true;
      }
      if (state.step === "x_idn_desc") {
        if (!d.hasPerm(chatId, "manual_topup")) return done(), true;
        if (text.length < 5) { await b.sendMessage(chatId, "❌ الوصف قصير جداً، أعد الإرسال:"); return true; }
        await storeCore.setIdentitySettings({ description: text });
        done(); await identityConfig(chatId); return true;
      }
      if (state.step === "x_pk_search") {
        if (text.length < 2) { await b.sendMessage(chatId, "❌ اكتب حرفين على الأقل:"); return true; }
        const safe = text.slice(0, 60).replace(/[%_,()]/g, "");
        const { data } = await supabase.from("products").select("id, name").ilike("name", `%${safe}%`).order("id").limit(12);
        done();
        if (!data || data.length === 0) { d.states.set(chatId, { step: "x_pk_search", data: {} }); await b.sendMessage(chatId, "لا نتائج. جرّب كلمة أخرى:"); return true; }
        await b.sendMessage(chatId, "اختر المنتج:", { reply_markup: { inline_keyboard: [...data.map((p: any) => [{ text: clip(p.name, 40), callback_data: cb("pk", "sel", "product", p.id) }]), back(cb("pk", "start"))] } });
        return true;
      }
      if (state.step === "x_dsc_pct") {
        const pct = Number(text.replace(",", "."));
        if (!Number.isFinite(pct) || pct < 0 || pct >= 100) { await b.sendMessage(chatId, "❌ أدخل نسبة بين 0 و99.999:"); return true; }
        const s = dsc.get(chatId); if (!s) return done(), true;
        const { scope_type, scope_id } = state.data;
        const rules = s.rules.filter((r: any) => !(r.scope_type === scope_type && (r.scope_id ?? null) === (scope_id ?? null)));
        rules.push({ scope_type, scope_id, percent: pct });
        done();
        const sent = await b.sendMessage(chatId, "⏳ جاري الحفظ...");
        await discountsSave(chatId, rules, sent.message_id);
        return true;
      }
      if (state.step === "x_bpf_val") {
        const v = Number(text.replace(",", "."));
        if (!Number.isFinite(v) || v < 0 || v > 100000) { await b.sendMessage(chatId, "❌ أدخل رقماً صحيحاً (0 أو أكبر):"); return true; }
        const s = bpfOf(chatId); s.value = v; s.lastPreview = undefined; done(); await bulkHome(chatId); return true;
      }
      if (state.step === "x_rnk_amt") {
        const v = Number(text.replace(",", "."));
        if (!Number.isFinite(v) || v < 0 || v > 100000000) { await b.sendMessage(chatId, "❌ مبلغ غير صحيح:"); return true; }
        await supabase.from("ranks").update({ required_amount: v, updated_at: new Date().toISOString() }).eq("id", state.data.id);
        await supabase.rpc("recalc_all_user_ranks");
        done(); await rankView(chatId, state.data.id); return true;
      }
      if (state.step === "x_pmf_qr") {
        const photo = msg.photo;
        if (!photo || !photo.length) { await b.sendMessage(chatId, "❌ أرسل صورة (كصورة وليس كملف):"); return true; }
        const url = await b.getFileLink(photo[photo.length - 1].file_id);
        const buf = await (await fetch(url)).arrayBuffer();
        const imgUrl = await d.uploadImage(buf);
        await supabase.from("payment_methods").update({ qr_image_url: imgUrl, qr_mode: "image", qr_enabled: true }).eq("id", state.data.id);
        done(); await pmView(chatId, state.data.id); return true;
      }
      if (state.step === "x_mqe_txt") {
        if (text.length < 1) { await b.sendMessage(chatId, "❌ النص فارغ، أعد الإرسال:"); return true; }
        await supabase.from("store_appearance").upsert({ id: 1, marquee_text: text.slice(0, 2000), updated_at: new Date().toISOString() });
        done(); await marqueeHome(chatId); return true;
      }
    } catch (e: any) {
      console.error("[ADMIN BOT x] message error:", e);
      try { await b.sendMessage(chatId, "❌ حدث خطأ غير متوقع، حاول مجدداً."); } catch {}
      done();
    }
    return true;
  }

  return { openSection, handleCallback, handleMessage, _internals: { cb } };
}
