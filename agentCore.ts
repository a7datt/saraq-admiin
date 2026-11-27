// =====================================================================================
// [AGENTS] نظام الوكلاء — منطق مشترك (نسخة مطابقة في saraqib-user و saraqib-admin)
//  - الوكيل = مستخدم يُسمح له بدعوة آخرين عبر رابط/كود وكيل.
//  - التفعيل: إعداد agents_enabled = true، والنمط agents_mode = "all" (كل المستخدمين)
//    أو "selected" (فقط من users.agent_enabled = true).
//  - العمولة = agent_commission_percent % من صافي ربح المتجر في الطلب (وليس من الشحن ولا من سعر المنتج).
//  - الإضافة ذرّية ومرة واحدة لكل طلب عبر دالة القاعدة apply_agent_commission، وتُعكس تلقائياً
//    عند استرجاع الطلب داخل refund_order_once.
// =====================================================================================

export type AgentSettings = {
  enabled: boolean;
  mode: "all" | "selected";
  percent: number;
  directoryEnabled: boolean;
};

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizeAgentCode(code: any): string | null {
  if (code === undefined || code === null) return null;
  const c = String(code).trim().toUpperCase();
  return /^[A-Z0-9]{4,16}$/.test(c) ? c : null;
}

function randomCode(len = 7): string {
  let s = "";
  for (let i = 0; i < len; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return s;
}

export function createAgentCore(supabase: any) {
  let cache: { at: number; value: AgentSettings } | null = null;

  async function getAgentSettings(fresh = false): Promise<AgentSettings> {
    if (!fresh && cache && Date.now() - cache.at < 15000) return cache.value;
    const { data } = await supabase.from("settings").select("key, value")
      .in("key", ["agents_enabled", "agents_mode", "agent_commission_percent", "agents_directory_enabled"]);
    const m: Record<string, string> = {};
    for (const r of data || []) m[r.key] = String(r.value ?? "");
    const pct = parseFloat(m.agent_commission_percent);
    const value: AgentSettings = {
      enabled: m.agents_enabled === "true",
      mode: m.agents_mode === "all" ? "all" : "selected",
      percent: Number.isFinite(pct) && pct >= 0 && pct <= 100 ? pct : 5,
      directoryEnabled: m.agents_directory_enabled !== "false",
    };
    cache = { at: Date.now(), value };
    return value;
  }

  function invalidate() { cache = null; }

  function isAgentWith(settings: AgentSettings, user: any): boolean {
    if (!settings.enabled || !user || user.is_banned) return false;
    return settings.mode === "all" || user.agent_enabled === true;
  }

  async function isAgent(user: any): Promise<boolean> {
    return isAgentWith(await getAgentSettings(), user);
  }

  // يولّد كود وكيل فريداً للمستخدم عند أول حاجة إليه
  async function ensureAgentCode(userId: number | string): Promise<string | null> {
    const { data: u } = await supabase.from("users").select("agent_code").eq("id", userId).maybeSingle();
    if (u?.agent_code) return u.agent_code;
    for (let i = 0; i < 6; i++) {
      const code = randomCode();
      const { data, error } = await supabase.from("users").update({ agent_code: code })
        .eq("id", userId).is("agent_code", null).select("agent_code").maybeSingle();
      if (!error && data?.agent_code) return data.agent_code;
      if (!error && !data) {
        const { data: again } = await supabase.from("users").select("agent_code").eq("id", userId).maybeSingle();
        if (again?.agent_code) return again.agent_code;
      }
    }
    return null;
  }

  // يحوّل كود الوكيل إلى معرّف الوكيل إن كان النظام مفعّلاً والوكيل مؤهّلاً حالياً
  async function resolveAgentIdByCode(code: any): Promise<number | null> {
    const c = normalizeAgentCode(code);
    if (!c) return null;
    const settings = await getAgentSettings();
    if (!settings.enabled) return null;
    const { data: agent } = await supabase.from("users").select("id, agent_enabled, is_banned").ilike("agent_code", c).maybeSingle();
    if (!agent || !isAgentWith(settings, agent)) return null;
    return Number(agent.id);
  }

  // عمولة الوكيل على طلب — آمنة للاستدعاء أكثر من مرة (مرة واحدة فعلياً لكل طلب)
  async function applyAgentCommission(opts: { orderId: number | string; buyerId: number | string; agentId: any; netProfit: number }): Promise<number> {
    try {
      if (!opts.agentId || Number(opts.agentId) === Number(opts.buyerId)) return 0;
      const settings = await getAgentSettings();
      if (!settings.enabled || settings.percent <= 0) return 0;
      const profit = Number(opts.netProfit) || 0;
      if (profit <= 0) return 0;
      const { data: agent } = await supabase.from("users").select("id, agent_enabled, is_banned").eq("id", opts.agentId).maybeSingle();
      if (!agent || !isAgentWith(settings, agent)) return 0;
      const amount = Math.round(profit * (settings.percent / 100) * 10000) / 10000;
      if (amount <= 0) return 0;
      const { data, error } = await supabase.rpc("apply_agent_commission", {
        p_order_id: Number(opts.orderId), p_agent_id: Number(opts.agentId), p_user_id: Number(opts.buyerId),
        p_amount: amount, p_net_profit: profit, p_percent: settings.percent,
      });
      if (error) { console.error(`[AGENTS] فشل إضافة عمولة الطلب #${opts.orderId}:`, error.message); return 0; }
      return data === true ? amount : 0;
    } catch (e) {
      console.error(`[AGENTS] خطأ عمولة الطلب #${opts.orderId}:`, e);
      return 0;
    }
  }

  // عملاء وكيل معيّن مع إجمالي الشحن والرصيد الحالي وعمولته من كل عميل
  async function getAgentClients(agentId: number | string, limit = 500) {
    const { data: clients } = await supabase.from("users")
      .select("id, name, email, balance, created_at")
      .eq("agent_id", agentId).eq("is_verified", true)
      .order("id", { ascending: false }).limit(limit);
    const list = clients || [];
    const ids = list.map((c: any) => c.id);
    const recharge: Record<string, number> = {};
    const commissionBy: Record<string, number> = {};
    if (ids.length) {
      const { data: st } = await supabase.from("user_stats").select("user_id, total_recharge_sum").in("user_id", ids);
      for (const s of st || []) recharge[s.user_id] = Number(s.total_recharge_sum) || 0;
    }
    const { data: comms } = await supabase.from("agent_commissions").select("user_id, amount, reversed_at").eq("agent_id", agentId).limit(100000);
    let totalCommission = 0;
    let ordersCount = 0;
    for (const c of comms || []) {
      if (c.reversed_at) continue;
      ordersCount++;
      totalCommission += Number(c.amount) || 0;
      commissionBy[c.user_id] = (commissionBy[c.user_id] || 0) + (Number(c.amount) || 0);
    }
    const { count } = await supabase.from("users").select("id", { count: "exact", head: true }).eq("agent_id", agentId).eq("is_verified", true);
    return {
      clients: list.map((c: any) => ({
        id: c.id, name: c.name, email: c.email,
        balance: Number(c.balance) || 0,
        total_recharge: recharge[c.id] || 0,
        commission: Math.round((commissionBy[c.id] || 0) * 10000) / 10000,
        created_at: c.created_at,
      })),
      clientsCount: count ?? list.length,
      ordersCount,
      totalCommission: Math.round(totalCommission * 10000) / 10000,
    };
  }

  return { getAgentSettings, invalidate, isAgentWith, isAgent, ensureAgentCode, resolveAgentIdByCode, applyAgentCommission, getAgentClients };
}
