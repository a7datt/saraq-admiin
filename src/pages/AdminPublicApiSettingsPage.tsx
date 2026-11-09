import React, { useState, useEffect, useMemo } from "react";
import {
  Percent,
  Gauge,
  Webhook,
  BarChart2,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Send,
  Save,
  ChevronDown,
  ChevronRight,
  Package,
  LayoutGrid,
  ListChecks,
  Users,
  Activity,
  Clock,
} from "lucide-react";

interface Props {
  adminFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

function fmtDate(iso?: string | null) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; bg: string }> = ({ icon, label, value, bg }) => (
  <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-3 flex items-center gap-2.5">
    <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center shrink-0`}>{icon}</div>
    <div className="min-w-0">
      <p className="text-[10px] text-gray-400 truncate">{label}</p>
      <p className="text-sm font-black text-gray-800">{value}</p>
    </div>
  </div>
);

const AdminPublicApiSettingsPage: React.FC<Props> = ({ adminFetch }) => {
  const [tab, setTab] = useState<"scope" | "settings" | "logs" | "webhook">("scope");

  // ── stats ──
  const [stats, setStats] = useState<any>(null);

  // ── settings ──
  const [discountPercent, setDiscountPercent] = useState("0");
  const [rateLimitMax, setRateLimitMax] = useState("120");
  const [rateLimitWindow, setRateLimitWindow] = useState("60");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // ── scope ──
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [subSubCategories, setSubSubCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [scopeMode, setScopeMode] = useState<"all" | "selected">("all");
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set());
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [scopeTab, setScopeTab] = useState<"products" | "categories">("categories");
  const [loadingScope, setLoadingScope] = useState(true);

  // ── logs ──
  const [logs, setLogs] = useState<any[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const [logSearch, setLogSearch] = useState("");
  const [logStatus, setLogStatus] = useState("");
  const [logDateFrom, setLogDateFrom] = useState("");
  const [logDateTo, setLogDateTo] = useState("");
  const [loadingLogs, setLoadingLogs] = useState(false);

  // ── webhook logs ──
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const loadSettingsAndStats = async () => {
    try {
      const [sRes, statRes] = await Promise.all([
        adminFetch("/api/admin/public-api-settings"),
        adminFetch("/api/admin/public-api-settings/stats"),
      ]);
      const s = await sRes.json();
      const st = await statRes.json();
      setDiscountPercent(String(s.discount_percent ?? 0));
      setRateLimitMax(String(s.rate_limit_max ?? 120));
      setRateLimitWindow(String(s.rate_limit_window_sec ?? 60));
      setWebhookUrl(s.webhook_url || "");
      setScopeMode(s.default_scope?.scope === "selected" ? "selected" : "all");
      setSelectedCats(new Set((s.default_scope?.categories || []).map((c: any) => `${c.category_type}:${c.category_id}`)));
      setSelectedProducts(new Set(s.default_scope?.products || []));
      setStats(st);
    } catch {}
  };

  const loadScopeData = async () => {
    setLoadingScope(true);
    try {
      const [catRes, subRes, subSubRes, prodRes] = await Promise.all([
        adminFetch("/api/categories?admin=1"),
        adminFetch("/api/subcategories?admin=1"),
        adminFetch("/api/sub-sub-categories?admin=1"),
        adminFetch("/api/admin/products-all"),
      ]);
      const [cats, subs, subSubs, prods] = await Promise.all([catRes.json(), subRes.json(), subSubRes.json(), prodRes.json()]);
      setCategories(Array.isArray(cats) ? cats : []);
      setSubcategories(Array.isArray(subs) ? subs : []);
      setSubSubCategories(Array.isArray(subSubs) ? subSubs : []);
      setProducts(Array.isArray(prods) ? prods : []);
    } catch {} finally {
      setLoadingScope(false);
    }
  };

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const params = new URLSearchParams();
      if (logSearch.trim()) params.set("search", logSearch.trim());
      if (logStatus) params.set("status_code", logStatus);
      if (logDateFrom) params.set("date_from", logDateFrom);
      if (logDateTo) params.set("date_to", logDateTo);
      params.set("page", String(logsPage));
      const res = await adminFetch(`/api/admin/public-api-settings/activity-logs?${params.toString()}`);
      const data = await res.json();
      setLogs(Array.isArray(data?.data) ? data.data : []);
      setLogsTotal(data?.total || 0);
    } catch {
      setLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  const loadWebhookLogs = async () => {
    try {
      const res = await adminFetch("/api/admin/public-api-settings/webhook-logs");
      const data = await res.json();
      setWebhookLogs(Array.isArray(data) ? data : []);
    } catch {}
  };

  useEffect(() => { loadSettingsAndStats(); loadScopeData(); loadWebhookLogs(); }, []);
  useEffect(() => { if (tab === "logs") loadLogs(); }, [tab, logsPage]);

  const saveSettings = async () => {
    setSaving(true);
    setSaveMsg("");
    try {
      const body: any = {
        discount_percent: parseFloat(discountPercent) || 0,
        rate_limit_max: parseInt(rateLimitMax) || 120,
        rate_limit_window_sec: parseInt(rateLimitWindow) || 60,
        webhook_url: webhookUrl.trim(),
        default_scope: {
          scope: scopeMode,
          categories: Array.from(selectedCats).map((k: string) => {
            const [category_type, id] = k.split(":");
            return { category_type, category_id: Number(id) };
          }),
          products: Array.from(selectedProducts),
        },
      };
      const res = await adminFetch("/api/admin/public-api-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setSaveMsg("تم الحفظ بنجاح");
        loadSettingsAndStats();
      } else {
        const d = await res.json().catch(() => ({}));
        setSaveMsg(d?.error || "فشل الحفظ");
      }
    } catch {
      setSaveMsg("فشل الحفظ");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(""), 3000);
    }
  };

  const testWebhook = async () => {
    setTestingWebhook(true);
    setTestResult(null);
    try {
      const res = await adminFetch("/api/admin/public-api-settings/test-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl.trim() }),
      });
      const data = await res.json();
      setTestResult({
        success: !!data.success,
        message: data.success ? `نجح الإرسال (${data.status_code})` : (data.error || `فشل الإرسال (${data.status_code || 0})`),
      });
      loadWebhookLogs();
    } catch {
      setTestResult({ success: false, message: "فشل الإرسال" });
    } finally {
      setTestingWebhook(false);
    }
  };

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleCategory = (categoryType: string, id: number) => {
    const key = `${categoryType}:${id}`;
    setSelectedCats((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleProduct = (id: number) => {
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAllCategories = () => {
    const all = new Set<string>();
    categories.forEach((c: any) => all.add(`category:${c.id}`));
    subcategories.forEach((s: any) => all.add(`subcategory:${s.id}`));
    subSubCategories.forEach((ss: any) => all.add(`sub_sub_category:${ss.id}`));
    setSelectedCats(all);
  };

  const selectAllProducts = () => {
    setSelectedProducts(new Set(products.map((p: any) => p.id)));
  };

  const selectEverything = () => {
    selectAllCategories();
    selectAllProducts();
  };

  const maxDayCount = useMemo(() => {
    if (!stats?.last_7_days) return 1;
    return Math.max(1, ...stats.last_7_days.map((d: any) => d.count));
  }, [stats]);

  return (
    <div className="space-y-3" dir="rtl">
      {/* ══ إحصائيات سريعة ══ */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard icon={<Users size={17} className="text-emerald-600" />} label="مستخدمون بتوكن مفعّل" value={stats?.active_tokens ?? "-"} bg="bg-emerald-50" />
        <StatCard icon={<Activity size={17} className="text-blue-600" />} label="طلبات اليوم" value={stats?.today_requests ?? "-"} bg="bg-blue-50" />
        <StatCard icon={<BarChart2 size={17} className="text-purple-600" />} label="إجمالي الطلبات" value={stats?.total_requests ?? "-"} bg="bg-purple-50" />
      </div>

      {stats?.last_7_days && (
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-3">
          <p className="text-[11px] font-bold text-gray-500 mb-2 flex items-center gap-1"><Clock size={13} /> الطلبات آخر 7 أيام</p>
          <div className="flex items-end gap-1.5 h-20">
            {stats.last_7_days.map((d: any) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-[var(--brand)] rounded-t-sm transition-all"
                  style={{ height: `${Math.max(4, (d.count / maxDayCount) * 60)}px` }}
                  title={`${d.date}: ${d.count}`}
                />
                <span className="text-[8px] text-gray-400">{d.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ التبويبات ══ */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
        {[
          { key: "scope", label: "نطاق المنتجات", icon: <LayoutGrid size={13} /> },
          { key: "settings", label: "الخصم والحد", icon: <Gauge size={13} /> },
          { key: "webhook", label: "Webhooks", icon: <Webhook size={13} /> },
          { key: "logs", label: "سجل النشاط", icon: <ListChecks size={13} /> },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`flex-1 min-w-[85px] py-2 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 transition-all whitespace-nowrap ${
              tab === t.key ? "bg-white text-[var(--brand)] shadow-sm" : "text-gray-500"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ══ نطاق المنتجات الافتراضي ══ */}
      {tab === "scope" && (
        <div className="space-y-2.5">
          <p className="text-[10px] text-gray-400 bg-gray-50 rounded-md px-3 py-2">
            يُحدَّد هنا نطاق المنتجات الذي يُضاف افتراضياً عند إنشاء توكن API جديد بنطاق "منتجات محددة".
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setScopeMode("all")}
              className={`py-2.5 rounded-md text-xs font-bold border transition-all ${scopeMode === "all" ? "bg-purple-50 border-purple-300 text-purple-600" : "bg-white border-gray-100 text-gray-500"}`}
            >
              جميع المنتجات افتراضياً
            </button>
            <button
              onClick={() => setScopeMode("selected")}
              className={`py-2.5 rounded-md text-xs font-bold border transition-all ${scopeMode === "selected" ? "bg-blue-50 border-blue-300 text-blue-600" : "bg-white border-gray-100 text-gray-500"}`}
            >
              نطاق محدد افتراضياً
            </button>
          </div>

          {scopeMode === "selected" && (
            <>
              <div className="flex gap-1.5">
                <button onClick={selectEverything} className="flex-1 text-[11px] font-bold text-white bg-[var(--brand)] rounded-md py-2 active:scale-95 transition-all">
                  تحديد الكل
                </button>
                <button onClick={selectAllCategories} className="flex-1 text-[11px] font-bold text-[var(--brand)] bg-gray-50 rounded-md py-2 active:scale-95 transition-all">
                  تحديد كل الأقسام
                </button>
              </div>

              <div className="flex gap-1.5 bg-gray-100 p-1 rounded-lg">
                <button onClick={() => setScopeTab("categories")} className={`flex-1 py-2 rounded-md text-xs font-bold flex items-center justify-center gap-1 transition-all ${scopeTab === "categories" ? "bg-white text-[var(--brand)] shadow-sm" : "text-gray-500"}`}>
                  <LayoutGrid size={13} /> أقسام
                </button>
                <button onClick={() => setScopeTab("products")} className={`flex-1 py-2 rounded-md text-xs font-bold flex items-center justify-center gap-1 transition-all ${scopeTab === "products" ? "bg-white text-[var(--brand)] shadow-sm" : "text-gray-500"}`}>
                  <Package size={13} /> منتجات فردية
                </button>
              </div>

              {loadingScope ? (
                <div className="text-center py-10 text-gray-400 text-xs">جارِ التحميل...</div>
              ) : scopeTab === "categories" ? (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black text-gray-400 px-1">{selectedCats.size} قسم محدد</p>
                  <p className="text-[10px] font-black text-gray-400 px-1 pt-1">الأقسام الرئيسية</p>
                  {categories.map((c: any) => (
                    <label key={`c-${c.id}`} className="flex items-center gap-2 py-1.5 px-2 bg-white border border-gray-100 rounded-md text-xs text-gray-700">
                      <input type="checkbox" checked={selectedCats.has(`category:${c.id}`)} onChange={() => toggleCategory("category", c.id)} className="w-4 h-4 rounded" />
                      {c.name}
                    </label>
                  ))}
                  <p className="text-[10px] font-black text-gray-400 px-1 pt-2">الأقسام الفرعية</p>
                  {subcategories.map((s: any) => (
                    <label key={`s-${s.id}`} className="flex items-center gap-2 py-1.5 px-2 bg-white border border-gray-100 rounded-md text-xs text-gray-700">
                      <input type="checkbox" checked={selectedCats.has(`subcategory:${s.id}`)} onChange={() => toggleCategory("subcategory", s.id)} className="w-4 h-4 rounded" />
                      {s.name}
                    </label>
                  ))}
                  <p className="text-[10px] font-black text-gray-400 px-1 pt-2">الأفرع الفرعية</p>
                  {subSubCategories.map((ss: any) => (
                    <label key={`ss-${ss.id}`} className="flex items-center gap-2 py-1.5 px-2 bg-white border border-gray-100 rounded-md text-xs text-gray-700">
                      <input type="checkbox" checked={selectedCats.has(`sub_sub_category:${ss.id}`)} onChange={() => toggleCategory("sub_sub_category", ss.id)} className="w-4 h-4 rounded" />
                      {ss.name}
                    </label>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-gray-400 px-1">{selectedProducts.size} منتج محدد</p>
                  {categories.map((cat: any) => {
                    const catSubs = subcategories.filter((s: any) => s.category_id === cat.id);
                    const catKey = `pc-${cat.id}`;
                    return (
                      <div key={cat.id} className="border border-gray-100 rounded-lg overflow-hidden">
                        <button onClick={() => toggleExpand(catKey)} className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50">
                          <span className="text-xs font-bold text-gray-700">{cat.name}</span>
                          {expanded.has(catKey) ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                        </button>
                        {expanded.has(catKey) && (
                          <div className="px-3 py-1.5 space-y-1">
                            {catSubs.map((sub: any) => {
                              const subProducts = products.filter((p: any) => p.subcategory_id === sub.id);
                              const subKey = `ps-${sub.id}`;
                              return (
                                <div key={sub.id} className="border-r-2 border-gray-100 pr-2">
                                  <button onClick={() => toggleExpand(subKey)} className="w-full flex items-center justify-between py-1.5">
                                    <span className="text-[11px] font-bold text-gray-600">{sub.name}</span>
                                    {expanded.has(subKey) ? <ChevronDown size={12} className="text-gray-400" /> : <ChevronRight size={12} className="text-gray-400" />}
                                  </button>
                                  {expanded.has(subKey) && (
                                    <div className="space-y-1 pb-1">
                                      {subProducts.map((p: any) => (
                                        <label key={p.id} className="flex items-center gap-2 py-1 text-[11px] text-gray-600">
                                          <input type="checkbox" checked={selectedProducts.has(p.id)} onChange={() => toggleProduct(p.id)} className="w-4 h-4 rounded" />
                                          {p.name}
                                        </label>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          <button onClick={saveSettings} disabled={saving} className="w-full bg-[var(--brand)] text-white text-sm font-bold py-3 rounded-lg active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-1.5">
            <Save size={15} /> {saving ? "جارِ الحفظ..." : "حفظ نطاق المنتجات"}
          </button>
          {saveMsg && <p className="text-center text-[11px] font-bold text-gray-500">{saveMsg}</p>}
        </div>
      )}

      {/* ══ الخصم والحد الأقصى للطلبات ══ */}
      {tab === "settings" && (
        <div className="space-y-3">
          <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-3 space-y-2">
            <label className="text-xs font-bold text-gray-600 flex items-center gap-1.5"><Percent size={14} /> نسبة الخصم العامة على طلبات الـ API (%)</label>
            <input
              type="number" min={0} max={99} step={0.5}
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-md px-3 py-2.5 text-xs outline-none"
            />
            <p className="text-[10px] text-gray-400">تُطبَّق تلقائياً على كل طلبات الـ API، ما لم يكن للمستخدم نسبة خصم مخصصة أعلى منها.</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-3 space-y-2">
            <label className="text-xs font-bold text-gray-600 flex items-center gap-1.5"><Gauge size={14} /> الحد الأقصى للطلبات لكل توكن</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <input
                  type="number" min={1}
                  value={rateLimitMax}
                  onChange={(e) => setRateLimitMax(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-md px-3 py-2.5 text-xs outline-none"
                />
                <p className="text-[10px] text-gray-400 mt-1">عدد الطلبات المسموح</p>
              </div>
              <div>
                <input
                  type="number" min={1}
                  value={rateLimitWindow}
                  onChange={(e) => setRateLimitWindow(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-md px-3 py-2.5 text-xs outline-none"
                />
                <p className="text-[10px] text-gray-400 mt-1">النافذة الزمنية (ثانية)</p>
              </div>
            </div>
          </div>

          <button onClick={saveSettings} disabled={saving} className="w-full bg-[var(--brand)] text-white text-sm font-bold py-3 rounded-lg active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-1.5">
            <Save size={15} /> {saving ? "جارِ الحفظ..." : "حفظ الإعدادات"}
          </button>
          {saveMsg && <p className="text-center text-[11px] font-bold text-gray-500">{saveMsg}</p>}
        </div>
      )}

      {/* ══ Webhooks ══ */}
      {tab === "webhook" && (
        <div className="space-y-3">
          <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-3 space-y-2">
            <label className="text-xs font-bold text-gray-600 flex items-center gap-1.5"><Webhook size={14} /> رابط الـ Webhook</label>
            <input
              type="text"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://example.com/webhook"
              className="w-full bg-gray-50 border border-gray-100 rounded-md px-3 py-2.5 text-xs outline-none font-mono"
              dir="ltr"
            />
            <p className="text-[10px] text-gray-400">يستقبل إشعار POST عند تغيّر حالة أي طلب مُنشأ عبر الـ API (pending / completed / rejected).</p>

            <div className="flex gap-1.5 pt-1">
              <button onClick={saveSettings} disabled={saving} className="flex-1 bg-[var(--brand)] text-white text-xs font-bold py-2.5 rounded-md active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-1">
                <Save size={13} /> حفظ
              </button>
              <button onClick={testWebhook} disabled={testingWebhook || !webhookUrl.trim()} className="flex-1 bg-blue-50 text-blue-600 text-xs font-bold py-2.5 rounded-md active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-1">
                <Send size={13} /> {testingWebhook ? "جارِ الإرسال..." : "اختبار الإرسال"}
              </button>
            </div>
            {saveMsg && <p className="text-center text-[11px] font-bold text-gray-500">{saveMsg}</p>}
            {testResult && (
              <p className={`text-center text-[11px] font-bold ${testResult.success ? "text-green-600" : "text-red-500"}`}>
                {testResult.message}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] font-black text-gray-500">آخر محاولات الإرسال</p>
              <button onClick={loadWebhookLogs} className="text-gray-400"><RefreshCw size={13} /></button>
            </div>
            {webhookLogs.length === 0 ? (
              <p className="text-center text-gray-400 text-xs py-8">لا توجد محاولات بعد</p>
            ) : (
              <div className="space-y-1.5">
                {webhookLogs.map((w: any) => (
                  <div key={w.id} className="bg-white rounded-md border border-gray-100 p-2.5 flex items-center gap-2">
                    {w.success ? <CheckCircle2 size={15} className="text-green-500 shrink-0" /> : <XCircle size={15} className="text-red-400 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-gray-700 truncate">{w.event}</p>
                      <p className="text-[10px] text-gray-400">{fmtDate(w.created_at)} · كود: {w.status_code || "-"}</p>
                      {w.error && <p className="text-[10px] text-red-400 truncate">{w.error}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ سجل النشاط ══ */}
      {tab === "logs" && (
        <div className="space-y-2.5">
          <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-3 space-y-2">
            <div className="relative">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="بحث حسب المسار..."
                className="w-full bg-gray-50 border border-gray-100 rounded-md pr-9 pl-3 py-2.5 text-xs outline-none"
              />
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <select value={logStatus} onChange={(e) => setLogStatus(e.target.value)} className="bg-gray-50 border border-gray-100 rounded-md px-2 py-2 text-[11px] outline-none">
                <option value="">كل الحالات</option>
                <option value="200">200 (نجاح)</option>
                <option value="401">401</option>
                <option value="403">403</option>
                <option value="429">429</option>
                <option value="500">500</option>
              </select>
              <input type="date" value={logDateFrom} onChange={(e) => setLogDateFrom(e.target.value)} className="bg-gray-50 border border-gray-100 rounded-md px-2 py-2 text-[11px] outline-none" />
              <input type="date" value={logDateTo} onChange={(e) => setLogDateTo(e.target.value)} className="bg-gray-50 border border-gray-100 rounded-md px-2 py-2 text-[11px] outline-none" />
            </div>
            <button onClick={() => { setLogsPage(1); loadLogs(); }} className="w-full bg-gray-100 text-gray-700 text-xs font-bold py-2 rounded-md active:scale-95 transition-all">
              تطبيق التصفية
            </button>
          </div>

          {loadingLogs ? (
            <div className="text-center py-10 text-gray-400 text-xs">جارِ التحميل...</div>
          ) : logs.length === 0 ? (
            <p className="text-center text-gray-400 text-xs py-10">لا توجد سجلات</p>
          ) : (
            <div className="space-y-1.5">
              {logs.map((l: any) => (
                <div key={l.id} className="bg-white rounded-md border border-gray-100 p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-gray-700 truncate">{l.method} {l.path}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${l.status_code < 300 ? "bg-green-50 text-green-600" : l.status_code < 500 ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-500"}`}>
                      {l.status_code}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {l.api_tokens?.name || "توكن محذوف"} · {l.users?.name || l.users?.phone || `#${l.user_id || "-"}`} · {l.ip_address} · {fmtDate(l.created_at)}
                  </p>
                </div>
              ))}
              <div className="flex items-center justify-between pt-1">
                <button disabled={logsPage <= 1} onClick={() => setLogsPage((p) => Math.max(1, p - 1))} className="text-xs font-bold text-gray-500 disabled:opacity-30 px-3 py-1.5">السابق</button>
                <span className="text-[10px] text-gray-400">صفحة {logsPage} · {logsTotal} سجل</span>
                <button disabled={logsPage * 30 >= logsTotal} onClick={() => setLogsPage((p) => p + 1)} className="text-xs font-bold text-gray-500 disabled:opacity-30 px-3 py-1.5">التالي</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPublicApiSettingsPage;
