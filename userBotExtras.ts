/**
 * [PHASE-BOTS] ميزات بوت المستخدمين الجديدة (مطابقة الموقع):
 *  - 🛡️ توثيق الهوية (إرسال صورتين عبر المحادثة + الحالة + سبب الرفض) وعلامة ✅ بجانب الاسم
 *  - 🏅 صفحة الرتب (الحالية/التالية/التقدّم/قواعد الخصم)
 *  - 💳 طرق الدفع: اشتراط التوثيق (تحقق السيرفر) + رمز QR (توليد تلقائي أو صورة جاهزة) + البونص/العمولة
 *  - 📢 الشريط النصي المتحرك (يظهر كسطر أعلى القائمة)
 */
import type TelegramBot from "node-telegram-bot-api";
import QRCode from "qrcode";
import crypto from "crypto";
import { loadDiscountRules } from "./discountEngine";
import { IDENTITY_BUCKET } from "./storeCore";

export interface UserExtrasDeps {
  supabase: any;
  storeCore: any;
  getBot: () => TelegramBot | null;
  states: Map<number, { step: string; data: any }>;
}

const SCOPE_LABEL: Record<string, string> = { all: "كل المنتجات", category: "قسم", subcategory: "قسم فرعي", sub_sub_category: "فرع فرعي", product: "منتج" };
const MAX_IMG = 6 * 1024 * 1024;

export function sniffImage(buf: Buffer): { mime: string; ext: string } | null {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (buf.length > 12 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: "image/png", ext: "png" };
  if (buf.length > 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return { mime: "image/webp", ext: "webp" };
  return null;
}

export function createUserExtras(d: UserExtrasDeps) {
  const { supabase, storeCore } = d;
  const bot = () => d.getBot();
  const fmt = (n: any) => (Number.isInteger(Number(n)) ? String(Number(n)) : String(+Number(n).toFixed(3)));

  const verifiedMark = (u: any) => (u?.identity_verified ? " ✅" : "");

  async function nameLine(userId: number | string): Promise<string> {
    const { data: u } = await supabase.from("users").select("name, identity_verified").eq("id", userId).maybeSingle();
    return u?.name ? `👤 ${u.name}${verifiedMark(u)}\n\n` : "";
  }

  async function marqueeLine(): Promise<string> {
    try {
      const { data } = await supabase.from("store_appearance").select("marquee_enabled, marquee_text").eq("id", 1).maybeSingle();
      return data?.marquee_enabled && String(data.marquee_text || "").trim() ? `📢 ${String(data.marquee_text).trim()}\n\n` : "";
    } catch { return ""; }
  }

  /** صفوف أزرار إضافية للقائمة الرئيسية (الرتبة + التوثيق إن كان مفعّلاً) */
  async function mainMenuRows(user: any): Promise<any[][]> {
    const rows: any[][] = [];
    const cfg = await storeCore.getIdentitySettings().catch(() => ({ enabled: false }));
    const row: any[] = [{ text: "🏅 رتبتي", callback_data: "my_rank" }];
    if (cfg.enabled || user?.identity_verified) row.push({ text: `🛡️ توثيق الهوية${user?.identity_verified ? " ✅" : ""}`, callback_data: "idv_home" });
    rows.push(row);
    return rows;
  }

  // ───────────── التوثيق ─────────────
  async function identityState(userId: number) {
    const cfg = await storeCore.getIdentitySettings();
    const { data: u } = await supabase.from("users").select("identity_verified").eq("id", userId).maybeSingle();
    const { data: last } = await supabase.from("identity_verifications").select("status, reject_reason, created_at")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const verified = !!u?.identity_verified;
    return { cfg, verified, status: verified ? "approved" : (last?.status || "none"), reason: !verified && last?.status === "rejected" ? (last.reject_reason || "") : "" };
  }

  async function identityHome(chatId: number, user: any) {
    const b = bot(); if (!b) return;
    const st = await identityState(user.id);
    if (!st.cfg.enabled && st.status !== "approved") return void b.sendMessage(chatId, "ℹ️ توثيق الهوية غير متاح حالياً.");
    const lines = ["🛡️ توثيق الهوية", ""];
    if (st.cfg.description) lines.push(st.cfg.description, "");
    if (st.status === "approved") lines.push("✅ حسابك موثّق — تظهر علامة التوثيق الزرقاء بجانب اسمك.");
    else if (st.status === "pending") lines.push("⏳ طلبك قيد المراجعة. لا يمكنك إرسال طلب آخر الآن.");
    else if (st.status === "rejected") lines.push("❌ تم رفض طلبك.", st.reason ? `السبب: ${st.reason}` : "", "", "يمكنك إرسال طلب جديد بصور أوضح.");
    else lines.push("حالة حسابك: غير موثّق.");
    const kb: any[][] = [];
    if (st.cfg.enabled && (st.status === "none" || st.status === "rejected")) kb.push([{ text: "📤 إرسال طلب توثيق", callback_data: "idv_start" }]);
    await b.sendMessage(chatId, lines.filter((x, i) => x !== "" || lines[i - 1] !== "").join("\n"), kb.length ? { reply_markup: { inline_keyboard: kb } } : undefined);
  }

  async function identityStart(chatId: number, user: any) {
    const b = bot(); if (!b) return;
    const st = await identityState(user.id);
    if (!st.cfg.enabled) return void b.sendMessage(chatId, "ℹ️ توثيق الهوية غير متاح حالياً.");
    if (st.verified) return void b.sendMessage(chatId, "✅ حسابك موثّق بالفعل.");
    if (st.status === "pending") return void b.sendMessage(chatId, "⏳ لديك طلب قيد المراجعة بالفعل.");
    d.states.set(chatId, { step: "idv_front", data: { userId: user.id } });
    await b.sendMessage(chatId, "📸 أرسل صورة الهوية — الوجه الأمامي (كصورة وليس كملف).\n\nيجب أن تكون البيانات واضحة وغير مقصوصة.\nللإلغاء أرسل /start", { reply_markup: { inline_keyboard: [[{ text: "❌ إلغاء", callback_data: "idv_cancel" }]] } });
  }

  async function userByChat(chatId: number) {
    const { data } = await supabase.from("users").select("*").eq("telegram_chat_id", chatId).maybeSingle();
    return data;
  }

  /** صور حالة idv_* — يرجع true إن عولجت */
  async function handlePhoto(msg: any): Promise<boolean> {
    const chatId: number = msg.chat.id; const b = bot(); if (!b) return false;
    const state = d.states.get(chatId);
    if (!state || !state.step.startsWith("idv_")) return false;
    const user = await userByChat(chatId);
    if (!user) { d.states.delete(chatId); return true; }
    try {
      const st = await identityState(user.id);
      if (!st.cfg.enabled || st.verified || st.status === "pending") { d.states.delete(chatId); await b.sendMessage(chatId, "ℹ️ لا يمكن إرسال طلب توثيق الآن."); return true; }
      const side = state.step === "idv_front" ? "front" : "back";
      const photos = msg.photo; const fileId = photos[photos.length - 1].file_id;
      const url = await b.getFileLink(fileId);
      const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
      const kind = sniffImage(buf);
      if (!kind || buf.length > MAX_IMG) { await b.sendMessage(chatId, "❌ الصورة غير صالحة أو كبيرة جداً. أرسل صورة JPG/PNG واضحة:"); return true; }
      const key = `${user.id}/${crypto.randomUUID()}-${side}.${kind.ext}`;
      const { error } = await supabase.storage.from(IDENTITY_BUCKET).upload(key, buf, { contentType: kind.mime, upsert: false });
      if (error) throw error;
      // حذف صورة الهوية من المحادثة (حفاظاً على الخصوصية) — قد يفشل بعد 48 ساعة فيُتجاهل
      b.deleteMessage(chatId, msg.message_id).catch(() => {});
      if (side === "front") {
        state.data.frontKey = key; state.step = "idv_back";
        await b.sendMessage(chatId, "✅ تم استلام الوجه الأمامي.\n\n📸 الآن أرسل صورة الوجه الخلفي:", { reply_markup: { inline_keyboard: [[{ text: "❌ إلغاء", callback_data: "idv_cancel" }]] } });
        return true;
      }
      const { error: insErr } = await supabase.from("identity_verifications").insert({ user_id: user.id, status: "pending", front_path: state.data.frontKey, back_path: key });
      d.states.delete(chatId);
      if (insErr) {
        if ((insErr as any).code === "23505") return await b.sendMessage(chatId, "⏳ لديك طلب قيد المراجعة بالفعل."), true;
        throw insErr;
      }
      await b.sendMessage(chatId, "✅ تم إرسال طلب التوثيق! سنخبرك هنا فور مراجعته.");
    } catch (e) {
      console.error("[USER BOT] identity photo error:", e);
      await b.sendMessage(chatId, "❌ حدث خطأ أثناء رفع الصورة. حاول مجدداً من «🛡️ توثيق الهوية».");
      d.states.delete(chatId);
    }
    return true;
  }

  /** نص أثناء حالة idv_* */
  async function handleText(msg: any, state: { step: string; data: any }): Promise<boolean> {
    if (!state.step.startsWith("idv_")) return false;
    const b = bot(); if (!b) return true;
    await b.sendMessage(chatId(msg), "📸 أرسل صورة الهوية (كصورة)، أو اضغط إلغاء.", { reply_markup: { inline_keyboard: [[{ text: "❌ إلغاء", callback_data: "idv_cancel" }]] } });
    return true;
  }
  const chatId = (msg: any): number => msg.chat.id;

  // ───────────── الرتب ─────────────
  async function ruleLabel(type: string, id: any): Promise<string> {
    if (type === "all") return "كل المنتجات";
    const table = type === "category" ? "categories" : type === "subcategory" ? "subcategories" : type === "sub_sub_category" ? "sub_sub_categories" : "products";
    const { data } = await supabase.from(table).select("name").eq("id", id).maybeSingle();
    return data?.name || `#${id}`;
  }

  async function rulesSummary(rankId: number, max = 6): Promise<string[]> {
    const rules: any[] = await loadDiscountRules(supabase, "rank", rankId);
    const out: string[] = [];
    for (const r of rules.slice(0, max)) out.push(`  • ${r.scope_type === "all" ? "كل المنتجات" : `${SCOPE_LABEL[r.scope_type]}: ${await ruleLabel(r.scope_type, r.scope_id)}`} — ${fmt(r.percent)}%`);
    if (rules.length > max) out.push(`  … و${rules.length - max} قاعدة أخرى`);
    return out;
  }

  async function rankPage(chatId: number, user: any) {
    const b = bot(); if (!b) return;
    const { data: ranks } = await supabase.from("ranks").select("*").eq("is_active", true).order("required_amount", { ascending: true });
    const list: any[] = ranks || [];
    if (list.length === 0) return void b.sendMessage(chatId, "لا توجد رتب حالياً.");
    const { data: stats } = await supabase.from("user_stats").select("total_recharge_sum").eq("user_id", user.id).maybeSingle();
    const total = Number(stats?.total_recharge_sum || 0);
    const current = list.find(r => r.id === user.rank_id) || null;
    const next = list.find(r => Number(r.required_amount) > total && (!current || Number(r.required_amount) > Number(current.required_amount))) || null;
    const lines: string[] = ["🏅 رتبتي", "", `الرتبة الحالية: ${current ? current.name : "—"}`, `💰 إجمالي شحنك: ${fmt(total)}$`];
    if (next) {
      const base = current ? Number(current.required_amount) : 0;
      const span = Math.max(1, Number(next.required_amount) - base);
      const pct = Math.max(0, Math.min(100, Math.round(((total - base) / span) * 100)));
      const filled = Math.round(pct / 10);
      lines.push("", `⬆️ الرتبة التالية: ${next.name}`, `يتبقى: ${fmt(Math.max(0, Number(next.required_amount) - total))}$`, `${"▓".repeat(filled)}${"░".repeat(10 - filled)} ${pct}%`);
    } else lines.push("", "🎉 وصلت لأعلى رتبة!");
    if (current?.has_discount) {
      const sum = await rulesSummary(current.id);
      lines.push("", "🏷️ خصم رتبتك:", ...(sum.length ? sum : ["  لا قواعد خصم محددة"]));
    }
    lines.push("", "📋 كل الرتب:");
    for (const r of list) {
      const rules: any[] = r.has_discount ? await loadDiscountRules(supabase, "rank", r.id) : [];
      const mx = rules.reduce((m, x) => Math.max(m, Number(x.percent)), 0);
      lines.push(`${current && r.id === current.id ? "▶️" : total >= Number(r.required_amount) ? "✅" : "🔒"} ${r.name} — ${fmt(r.required_amount)}$${mx > 0 ? ` — خصم حتى ${fmt(mx)}%` : ""}`);
    }
    await b.sendMessage(chatId, lines.join("\n"));
  }

  // ───────────── طرق الدفع ─────────────
  async function identityGate(userId: number, paymentMethodId: any): Promise<string | null> {
    try {
      const { data: m, error } = await supabase.from("payment_methods").select("requires_identity").eq("id", paymentMethodId).maybeSingle();
      if (error) return "تعذر التحقق من متطلبات طريقة الدفع، حاول مجدداً.";
      if (!m || !m.requires_identity) return null;
      const { data: u } = await supabase.from("users").select("identity_verified").eq("id", userId).maybeSingle();
      return u?.identity_verified ? null : "هذه الطريقة تتطلب توثيق الهوية. وثّق هويتك من «🛡️ توثيق الهوية» أولاً.";
    } catch { return "تعذر التحقق من حالة توثيق الهوية، حاول مجدداً."; }
  }

  function methodLabel(m: any, user: any): string {
    return `${m.name}${m.requires_identity && !user?.identity_verified ? " 🔒" : ""}`;
  }

  function bonusLine(m: any): string {
    const bp = Number(m?.bonus_percent);
    if (!m?.bonus_type || !(bp > 0) || m.bonus_visible === false) return "";
    return m.bonus_type === "bonus" ? `🎁 بونص ${fmt(bp)}% على هذه الطريقة` : `⚠️ عمولة ${fmt(bp)}% على هذه الطريقة`;
  }

  /** يرسل رمز QR للطريقة: صورة جاهزة (qr_mode=image) أو توليد من العنوان — كالموقع */
  async function sendMethodQr(chatId: number, m: any) {
    const b = bot(); if (!b) return;
    const addr = String(m?.wallet_address || "").trim();
    if (!m?.qr_enabled || !addr) return;
    try {
      if (m.qr_mode === "image" && String(m.qr_image_url || "").trim()) {
        await b.sendPhoto(chatId, String(m.qr_image_url).trim(), { caption: `رمز QR — ${m.name}` });
      } else {
        const png = await QRCode.toBuffer(addr, { width: 512, margin: 2, errorCorrectionLevel: "M" });
        await b.sendPhoto(chatId, png, { caption: `رمز QR — ${m.name}\nامسحه من تطبيق المحفظة` }, { filename: "qr.png", contentType: "image/png" });
      }
    } catch (e) { console.error("[USER BOT] QR send error:", e); }
  }

  return { verifiedMark, nameLine, marqueeLine, mainMenuRows, identityHome, identityStart, handlePhoto, handleText, rankPage, identityGate, methodLabel, bonusLine, sendMethodQr, userByChat };
}
