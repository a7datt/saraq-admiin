import React from "react";
import { CustomSelect } from "../components/CustomSelect";
import {
  BarChart2,
  RefreshCcw,
  CheckCircle,
  XCircle,
  Wallet,
  DollarSign,
  TrendingUp,
  RotateCcw,
  AlertTriangle,
  Clock,
  RotateCw,
  ShoppingCart,
  Percent,
  Layers,
  Search,
  ArrowUpDown,
  Award,
  TrendingDown,
  SlidersHorizontal,
} from "lucide-react";
import { showToast } from "../components/ToastContainer";

type FilterKey = "daily" | "weekly" | "monthly" | "custom";
type GroupBy = "day" | "week" | "month";
type ViewMode = "overview" | "deepdive" | "table" | "usage";

interface TimeSeriesRow { date: string; revenue: number; cost: number; profit: number; orders: number; }
interface SellerRow { name: string; qty: number; revenue: number; profit: number; }
interface BreakdownRow { revenue: number; profit: number; orders: number; name?: string; }

const STORE_TYPE_LABELS: Record<string, string> = {
  normal: "عادي",
  quick_order: "طلب سريع",
  quantities: "كميات",
  external_api: "API خارجي",
  inventory: "مخزون داخلي",
  gallery: "معرض",
};

const STATUS_LABELS: Record<string, string> = {
  completed: "مكتمل",
  pending: "قيد التنفيذ",
  processing: "قيد المعالجة",
  awaiting_payment: "بانتظار الدفع",
  awaiting_input: "بانتظار الإدخال",
  rejected: "مرفوض",
  failed: "فشل",
  cancelled: "ملغي",
  returned: "مرتجع",
  refunded: "مسترجع",
};

const AdminStatsPage = ({ adminFetch }: { adminFetch: any }) => {
  const [filter, setFilter] = React.useState<FilterKey>("monthly");
  const [groupBy, setGroupBy] = React.useState<GroupBy>("day");
  const [customFrom, setCustomFrom] = React.useState("");
  const [customTo, setCustomTo] = React.useState("");
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [resetting, setResetting] = React.useState(false);
  const [showResetConfirm, setShowResetConfirm] = React.useState(false);
  const [view, setView] = React.useState<ViewMode>("overview");

  // Deep-dive filters
  const [filtersMeta, setFiltersMeta] = React.useState<any>({ categories: [], provider_ids: [], store_types: [] });
  const [storeTypeFilter, setStoreTypeFilter] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("");
  const [providerFilter, setProviderFilter] = React.useState("");

  // Table controls
  const [search, setSearch] = React.useState("");
  const [sortKey, setSortKey] = React.useState<"date" | "revenue" | "cost" | "profit" | "orders">("date");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");

  const buildUrl = (base: string) => {
    let url = `${base}?filter=${filter}&groupBy=${groupBy}`;
    if (filter === "custom" && customFrom && customTo) url += `&from=${customFrom}&to=${customTo}`;
    if (storeTypeFilter) url += `&store_type=${storeTypeFilter}`;
    if (categoryFilter) url += `&category_id=${categoryFilter}`;
    if (providerFilter) url += `&provider_id=${providerFilter}`;
    return url;
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await adminFetch(buildUrl("/api/admin/analytics"));
      if (res.ok) setData(await res.json());
    } catch (e) {}
    setLoading(false);
  };

  const fetchFiltersMeta = async () => {
    try {
      const res = await adminFetch("/api/admin/analytics/filters");
      if (res.ok) setFiltersMeta(await res.json());
    } catch (e) {}
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      const res = await adminFetch("/api/admin/analytics/reset", { method: "POST", headers: { "Content-Type": "application/json" } });
      if (res.ok) {
        showToast(<><CheckCircle size={16} className="inline mr-1" /> تم تصفير الأرباح — لن تُحتسب أي بيانات سابقة لهذه اللحظة</>, "success");
        await fetchStats();
      } else {
        showToast("فشل تصفير الأرباح", "error");
      }
    } catch {
      showToast("فشل تصفير الأرباح", "error");
    } finally {
      setResetting(false);
      setShowResetConfirm(false);
    }
  };

  React.useEffect(() => { fetchFiltersMeta(); }, []);
  React.useEffect(() => { fetchStats(); }, [filter, groupBy, storeTypeFilter, categoryFilter, providerFilter]);

  const stats = data || {
    accepted_orders: 0, rejected_orders: 0, pending_orders: 0, returned_orders: 0, total_orders: 0,
    total_payments: 0, gross_revenue: 0, api_cost: 0, profit: 0, api_profit_total: 0, manual_profit_total: 0,
    profit_margin: 0, net_margin: 0, aov: 0, conversion_rate: 0,
    orders_with_cost: 0, orders_without_cost: 0,
    status_breakdown: {}, store_type_breakdown: {}, provider_breakdown: {},
    best_sellers: [], worst_sellers: [], time_series: [], profit_reset_at: null,
  };

  const timeSeries: TimeSeriesRow[] = stats.time_series || [];
  const bestSellers: SellerRow[] = stats.best_sellers || [];
  const worstSellers: SellerRow[] = stats.worst_sellers || [];
  const statusBreakdown: Record<string, number> = stats.status_breakdown || {};
  const storeTypeBreakdown: Record<string, BreakdownRow> = stats.store_type_breakdown || {};
  const providerBreakdown: Record<string, BreakdownRow> = stats.provider_breakdown || {};

  const filteredTable = React.useMemo(() => {
    let rows = [...timeSeries];
    if (search.trim()) {
      rows = rows.filter(r => r.date.includes(search.trim()));
    }
    rows.sort((a: any, b: any) => {
      const va = a[sortKey]; const vb = b[sortKey];
      const cmp = typeof va === "string" ? va.localeCompare(vb) : (va - vb);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [timeSeries, search, sortKey, sortDir]);

  const maxSeriesVal = Math.max(1, ...timeSeries.map(r => Math.max(r.revenue, r.cost)));

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-black text-gray-800 flex items-center gap-2"><BarChart2 size={18} className="text-brand" /> الإحصائيات ولوحة التحكم</h2>
        <button onClick={fetchStats} className="p-2 bg-gray-50 rounded-lg text-gray-400 active:scale-90"><RefreshCcw size={15} /></button>
      </div>

      {/* View Tabs */}
      <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
        {([
          { key: "overview", label: "نظرة عامة" },
          { key: "deepdive", label: "تحليل معمق" },
          { key: "table", label: "الجدول التفاعلي" },
          { key: "usage", label: "استخدام الموقع" },
        ] as { key: ViewMode; label: string }[]).map(v => (
          <button key={v.key} onClick={() => setView(v.key)}
            className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-all ${view === v.key ? "bg-white text-brand shadow-sm" : "text-gray-500"}`}>
            {v.label}
          </button>
        ))}
      </div>

      {/* Time Filter Tabs */}
      {view !== "usage" && (
      <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
        {([
          { key: "daily", label: "يومي" },
          { key: "weekly", label: "أسبوعي" },
          { key: "monthly", label: "شهري" },
          { key: "custom", label: "مخصص" },
        ] as { key: FilterKey; label: string }[]).map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-all ${filter === f.key ? "bg-white text-brand shadow-sm" : "text-gray-500"}`}>
            {f.label}
          </button>
        ))}
      </div>
      )}

      {view !== "usage" && filter === "custom" && (
        <div className="flex gap-2">
          <div className="flex-1">
            <p className="text-[10px] text-gray-400 mb-1">من</p>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              className="w-full p-2.5 bg-white rounded-lg text-xs outline-none border border-gray-100" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] text-gray-400 mb-1">إلى</p>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
              className="w-full p-2.5 bg-white rounded-lg text-xs outline-none border border-gray-100" />
          </div>
          <div className="flex items-end">
            <button onClick={fetchStats} className="bg-brand text-white px-4 py-2.5 rounded-lg text-xs font-bold">بحث</button>
          </div>
        </div>
      )}

      {/* Deep-dive filters */}
      {view === "deepdive" && (
        <div className="bg-white rounded-lg p-3 border border-gray-100 space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600 mb-1">
            <SlidersHorizontal size={13} /> فلترة متقدمة
          </div>
          <div className="grid grid-cols-3 gap-2">
            <CustomSelect
              value={storeTypeFilter}
              onChange={setStoreTypeFilter}
              options={[
                { value: "", label: "كل الأنواع" },
                ...((filtersMeta.store_types || []).map((t: string) => ({ value: t, label: STORE_TYPE_LABELS[t] || t }))),
              ]}
            />
            <CustomSelect
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[
                { value: "", label: "كل الفئات" },
                ...((filtersMeta.categories || []).map((c: any) => ({ value: c.id, label: c.name }))),
              ]}
            />
            <CustomSelect
              value={providerFilter}
              onChange={setProviderFilter}
              options={[
                { value: "", label: "كل الموردين" },
                ...((filtersMeta.provider_ids || []).map((p: string) => ({ value: p, label: `مورد #${p}` }))),
              ]}
            />
          </div>
        </div>
      )}

      {view !== "usage" && (loading ? (
        <div className="text-center py-10 text-gray-400 text-sm">جاري التحميل...</div>
      ) : (
        <>
          {view === "overview" && (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle size={16} className="text-green-500" />
                    <p className="text-[11px] font-bold text-green-700">الطلبات المكتملة</p>
                  </div>
                  <p className="text-2xl font-black text-green-700">{stats.accepted_orders}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle size={16} className="text-red-400" />
                    <p className="text-[11px] font-bold text-red-600">الطلبات المرفوضة</p>
                  </div>
                  <p className="text-2xl font-black text-red-600">{stats.rejected_orders}</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={16} className="text-amber-500" />
                    <p className="text-[11px] font-bold text-amber-700">قيد التنفيذ</p>
                  </div>
                  <p className="text-2xl font-black text-amber-700">{stats.pending_orders}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <RotateCw size={16} className="text-slate-500" />
                    <p className="text-[11px] font-bold text-slate-700">مرتجع</p>
                  </div>
                  <p className="text-2xl font-black text-slate-700">{stats.returned_orders}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet size={16} className="text-blue-500" />
                    <p className="text-[11px] font-bold text-blue-700">إجمالي المدفوعات</p>
                  </div>
                  <p className="text-2xl font-black text-blue-700">{stats.total_payments?.toFixed(3)} $</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign size={16} className="text-purple-500" />
                    <p className="text-[11px] font-bold text-purple-700">الإيرادات</p>
                  </div>
                  <p className="text-2xl font-black text-purple-700">{stats.gross_revenue?.toFixed(3)} $</p>
                </div>
              </div>

              {/* KPI Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-cyan-50 rounded-lg p-4 border border-cyan-100">
                  <div className="flex items-center gap-2 mb-2">
                    <ShoppingCart size={16} className="text-cyan-600" />
                    <p className="text-[11px] font-bold text-cyan-700">متوسط قيمة الطلب</p>
                  </div>
                  <p className="text-xl font-black text-cyan-700">{(stats.aov || 0).toFixed(3)} $</p>
                </div>
                <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Percent size={16} className="text-indigo-600" />
                    <p className="text-[11px] font-bold text-indigo-700">معدل التحويل</p>
                  </div>
                  <p className="text-xl font-black text-indigo-700">{(stats.conversion_rate || 0).toFixed(1)}%</p>
                </div>
              </div>

              {/* Profit Card - Hybrid Engine */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-5 border border-amber-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={18} className="text-amber-600" />
                    <p className="font-bold text-amber-800">صافي الأرباح (محرك هجين)</p>
                  </div>
                  <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">
                    ربح: {stats.profit_margin?.toFixed(1)}% | هامش: {stats.net_margin?.toFixed(1)}%
                  </span>
                </div>
                <p className={`text-3xl font-black ${(stats.profit || 0) >= 0 ? "text-amber-700" : "text-red-600"}`}>
                  {(stats.profit || 0) >= 0 ? "+" : ""}{(stats.profit || 0).toFixed(3)} $
                </p>
                {stats.profit_reset_at && (
                  <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                    <RotateCcw size={10} /> محسوبة منذ آخر تصفير: {new Date(stats.profit_reset_at).toLocaleString('ar')}
                  </p>
                )}
                <div className="mt-3 bg-white/60 rounded-lg p-3 space-y-1.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">سعر البيع (إيرادات)</span>
                    <span className="font-bold text-green-600">+ {(stats.gross_revenue || 0).toFixed(3)} $</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">تكلفة المنتجات (موثوقة فقط)</span>
                    <span className="font-bold text-red-500">- {(stats.api_cost || 0).toFixed(3)} $</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">ربح منتجات API الخارجي</span>
                    <span className="font-bold text-blue-600">{(stats.api_profit_total || 0).toFixed(3)} $</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">ربح المنتجات الداخلية (يدوي/افتراضي)</span>
                    <span className="font-bold text-teal-600">{(stats.manual_profit_total || 0).toFixed(3)} $</span>
                  </div>
                  <div className="border-t border-gray-200 pt-1.5 flex justify-between text-[11px]">
                    <span className="font-bold text-gray-700">إجمالي صافي الربح</span>
                    <span className={`font-black ${(stats.profit || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {(stats.profit || 0) >= 0 ? "+" : ""}{(stats.profit || 0).toFixed(3)} $
                    </span>
                  </div>
                  {(stats.orders_without_cost > 0) && (
                    <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-2.5 py-2 mt-1.5 leading-relaxed">
                      <p className="font-bold flex items-center gap-1 mb-0.5">
                        <AlertTriangle size={12} /> {stats.orders_without_cost} عنصر مباع بدون مصدر ربح موثوق
                      </p>
                      <p>
                        هذه العناصر (مثال: منتجات "كميات" أو "مخزون داخلي" بلا ربح افتراضي مُعرَّف) لم تُحتسب ضمن
                        الإيراد أو التكلفة أعلاه حتى لا تظهر أرقام خاطئة. لإصلاحها بشكل دائم: افتح المنتج من صفحة
                        العناصر وأدخل "كم ربحك من هذا المنتج؟"، أو أدخل الربح يدوياً على مستوى الطلب من صفحة الطلبات.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Reset Button */}
              {!showResetConfirm ? (
                <button onClick={() => setShowResetConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-500 py-3 rounded-lg text-sm font-bold active:scale-95">
                  <RotateCcw size={14} /> تصفير الأرباح
                </button>
              ) : (
                <div className="bg-red-50 rounded-lg p-4 border border-red-100 space-y-3">
                  <p className="text-sm font-bold text-red-700 text-center">هل أنت متأكد من تصفير سجل الأرباح؟</p>
                  <p className="text-[11px] text-red-500 text-center -mt-2">
                    سيتم تجاهل كل البيانات قبل هذه اللحظة في كل الإحصائيات القادمة (لا يمكن التراجع).
                  </p>
                  <div className="flex gap-2">
                    <button onClick={handleReset} disabled={resetting} className="flex-1 bg-red-500 text-white py-2.5 rounded-lg text-sm font-bold disabled:opacity-50">
                      {resetting ? "جارٍ التصفير..." : "تأكيد التصفير"}
                    </button>
                    <button onClick={() => setShowResetConfirm(false)} disabled={resetting} className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-lg text-sm font-bold disabled:opacity-50">إلغاء</button>
                  </div>
                </div>
              )}
            </>
          )}

          {view === "deepdive" && (
            <>
              {/* Status Breakdown */}
              <div className="bg-white rounded-lg p-4 border border-gray-100">
                <p className="text-[11px] font-bold text-gray-600 mb-3 flex items-center gap-1.5"><Layers size={13} /> حسب حالة الطلب</p>
                <div className="space-y-2">
                  {Object.entries(statusBreakdown).length === 0 && (
                    <p className="text-[11px] text-gray-400 text-center py-2">لا توجد بيانات</p>
                  )}
                  {Object.entries(statusBreakdown).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-600">{STATUS_LABELS[status] || status}</span>
                      <span className="font-bold text-gray-800 bg-gray-50 px-2 py-0.5 rounded-full">{count as number}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Store Type Breakdown */}
              <div className="bg-white rounded-lg p-4 border border-gray-100">
                <p className="text-[11px] font-bold text-gray-600 mb-3 flex items-center gap-1.5"><Layers size={13} /> حسب نوع المتجر</p>
                <div className="space-y-2">
                  {Object.keys(storeTypeBreakdown).length === 0 && (
                    <p className="text-[11px] text-gray-400 text-center py-2">لا توجد بيانات</p>
                  )}
                  {Object.entries(storeTypeBreakdown).map(([type, row]) => (
                    <div key={type} className="flex items-center justify-between text-[11px] border-b border-gray-50 pb-2">
                      <span className="text-gray-700 font-bold">{STORE_TYPE_LABELS[type] || type}</span>
                      <div className="flex gap-3">
                        <span className="text-purple-600">إيراد {(row as BreakdownRow).revenue.toFixed(3)}$</span>
                        <span className={(row as BreakdownRow).profit >= 0 ? "text-green-600" : "text-red-600"}>ربح {(row as BreakdownRow).profit.toFixed(3)}$</span>
                      </div>
                    </div>
                  ))}
                  {(storeTypeBreakdown["quantities"] || storeTypeBreakdown["inventory"]) && (
                    <p className="text-[10px] text-gray-400 leading-relaxed pt-1">
                      💡 إن ظهر ربح "كميات" أو "مخزون داخلي" صفراً رغم وجود مبيعات، فهذا يعني أن منتجات هذا النوع
                      بلا "ربح افتراضي" مُعرَّف — أضِفه من صفحة العناصر لكل منتج.
                    </p>
                  )}
                </div>
              </div>

              {/* Provider Breakdown */}
              {Object.keys(providerBreakdown).length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-gray-100">
                  <p className="text-[11px] font-bold text-gray-600 mb-3 flex items-center gap-1.5"><Layers size={13} /> حسب المورد</p>
                  <div className="space-y-2">
                    {Object.entries(providerBreakdown).map(([id, row]) => (
                      <div key={id} className="flex items-center justify-between text-[11px] border-b border-gray-50 pb-2">
                        <span className="text-gray-700 font-bold">{(row as BreakdownRow).name}</span>
                        <div className="flex gap-3">
                          <span className="text-purple-600">إيراد {(row as BreakdownRow).revenue.toFixed(3)}$</span>
                          <span className={(row as BreakdownRow).profit >= 0 ? "text-green-600" : "text-red-600"}>ربح {(row as BreakdownRow).profit.toFixed(3)}$</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Best Sellers */}
              <div className="bg-white rounded-lg p-4 border border-gray-100">
                <p className="text-[11px] font-bold text-gray-600 mb-3 flex items-center gap-1.5"><Award size={13} className="text-amber-500" /> الأكثر مبيعاً</p>
                <div className="space-y-2">
                  {bestSellers.length === 0 && <p className="text-[11px] text-gray-400 text-center py-2">لا توجد بيانات</p>}
                  {bestSellers.map((s, i) => (
                    <div key={i} className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-700 truncate max-w-[45%]">{i + 1}. {s.name}</span>
                      <span className="text-gray-500">{s.qty} قطعة</span>
                      <span className="font-bold text-green-600">{s.profit.toFixed(3)}$</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Worst Sellers */}
              <div className="bg-white rounded-lg p-4 border border-gray-100">
                <p className="text-[11px] font-bold text-gray-600 mb-3 flex items-center gap-1.5"><TrendingDown size={13} className="text-gray-400" /> الأقل مبيعاً</p>
                <div className="space-y-2">
                  {worstSellers.length === 0 && <p className="text-[11px] text-gray-400 text-center py-2">لا توجد بيانات</p>}
                  {worstSellers.map((s, i) => (
                    <div key={i} className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-700 truncate max-w-[45%]">{s.name}</span>
                      <span className="text-gray-500">{s.qty} قطعة</span>
                      <span className="font-bold text-gray-600">{s.profit.toFixed(3)}$</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Simple bar chart of revenue vs cost over time */}
              {timeSeries.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-gray-100">
                  <p className="text-[11px] font-bold text-gray-600 mb-3">الإيراد مقابل التكلفة عبر الزمن</p>
                  <div className="flex items-end gap-1 h-28">
                    {timeSeries.slice(-14).map((r, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                        <div className="w-full flex flex-col justify-end h-24 gap-0.5">
                          <div className="bg-purple-300 rounded-t-sm" style={{ height: `${(r.revenue / maxSeriesVal) * 100}%` }} title={`إيراد ${r.revenue.toFixed(3)}`} />
                          <div className="bg-red-300 rounded-t-sm" style={{ height: `${(r.cost / maxSeriesVal) * 100}%` }} title={`تكلفة ${r.cost.toFixed(3)}`} />
                        </div>
                        <span className="text-[7px] text-gray-400 rotate-0">{r.date.slice(5)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3 mt-2 text-[9px] text-gray-500">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-purple-300 rounded-full inline-block" /> إيراد</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-300 rounded-full inline-block" /> تكلفة</span>
                  </div>
                </div>
              )}
            </>
          )}

          {view === "table" && (
            <>
              {/* Group-by control */}
              <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
                {([
                  { key: "day", label: "يومي" },
                  { key: "week", label: "أسبوعي" },
                  { key: "month", label: "شهري" },
                ] as { key: GroupBy; label: string }[]).map(g => (
                  <button key={g.key} onClick={() => setGroupBy(g.key)}
                    className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-all ${groupBy === g.key ? "bg-white text-brand shadow-sm" : "text-gray-500"}`}>
                    {g.label}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالتاريخ (YYYY-MM-DD)"
                  className="w-full p-2.5 pr-9 bg-white rounded-lg text-xs outline-none border border-gray-100" />
              </div>

              {/* Data Grid */}
              <div className="bg-white rounded-lg border border-gray-100 overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500">
                      {([
                        { key: "date", label: "التاريخ" },
                        { key: "orders", label: "الطلبات" },
                        { key: "revenue", label: "الإيراد" },
                        { key: "cost", label: "التكلفة" },
                        { key: "profit", label: "الربح" },
                      ] as { key: typeof sortKey; label: string }[]).map(col => (
                        <th key={col.key} onClick={() => toggleSort(col.key)}
                          className="p-2.5 text-right font-bold cursor-pointer select-none whitespace-nowrap">
                          <span className="flex items-center gap-1">{col.label} <ArrowUpDown size={10} /></span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTable.length === 0 && (
                      <tr><td colSpan={5} className="text-center text-gray-400 py-6">لا توجد بيانات</td></tr>
                    )}
                    {filteredTable.map((r, i) => (
                      <tr key={i} className="border-t border-gray-50">
                        <td className="p-2.5 whitespace-nowrap">{r.date}</td>
                        <td className="p-2.5">{r.orders}</td>
                        <td className="p-2.5 text-purple-600 font-bold">{r.revenue.toFixed(3)}$</td>
                        <td className="p-2.5 text-red-500 font-bold">{r.cost.toFixed(3)}$</td>
                        <td className={`p-2.5 font-bold ${r.profit >= 0 ? "text-green-600" : "text-red-600"}`}>{r.profit.toFixed(3)}$</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      ))}

      {view === "usage" && <UsageAnalyticsSection adminFetch={adminFetch} />}
    </div>
  );
};

// ── تبويب "استخدام الموقع": إحصاءات ذاتية (بدون أي خدمة خارجية) — أكثر الصفحات زيارة، الأجهزة، آخر أخطاء العميل ──
function UsageAnalyticsSection({ adminFetch }: { adminFetch: any }) {
  const [days, setDays] = React.useState(7);
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  const fetchUsage = React.useCallback(() => {
    setLoading(true);
    adminFetch(`/api/admin/analytics/summary?days=${days}`)
      .then((r: Response) => r.json())
      .then((d: any) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [days, adminFetch]);

  React.useEffect(() => { fetchUsage(); }, [fetchUsage]);

  const PAGE_LABELS: Record<string, string> = {
    "/main": "الرئيسية", "/home": "الرئيسية", "/checkout": "صفحة الدفع", "/quick_order": "الطلب السريع",
    "/products": "المنتجات", "/categories": "الأقسام", "/favorites": "المفضلة", "/wallet": "المحفظة",
    "/settings": "الإعدادات", "/orders": "طلباتي",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${days === d ? "bg-white text-brand shadow-sm" : "text-gray-500"}`}>
              {d} يوم
            </button>
          ))}
        </div>
        <button onClick={fetchUsage} className="p-2 bg-gray-50 rounded-lg text-gray-400 active:scale-90"><RefreshCcw size={14} /></button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-400 text-sm">جاري التحميل...</div>
      ) : !data ? (
        <div className="text-center py-10 text-gray-400 text-sm">تعذر تحميل البيانات</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <p className="text-[10px] text-blue-500 font-bold mb-1">إجمالي الأحداث</p>
              <p className="text-xl font-black text-blue-700">{data.totalEvents}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4 border border-red-100">
              <p className="text-[10px] text-red-500 font-bold mb-1">أخطاء العميل (آخر {days} يوم)</p>
              <p className="text-xl font-black text-red-600">{(data.recentErrors || []).length}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg p-3 border border-gray-100">
            <p className="text-[11px] font-bold text-gray-600 mb-2 flex items-center gap-1.5"><BarChart2 size={13} /> أكثر الصفحات زيارة</p>
            {(data.topPaths || []).length === 0 ? (
              <p className="text-center text-gray-400 text-xs py-3">لا توجد بيانات كافية بعد</p>
            ) : (data.topPaths || []).map((p: any) => (
              <div key={p.key} className="flex items-center justify-between py-1.5 border-t border-gray-50 first:border-t-0">
                <span className="text-xs text-gray-600">{PAGE_LABELS[p.key] || p.key}</span>
                <span className="text-xs font-bold text-gray-800">{p.count}</span>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-lg p-3 border border-gray-100">
            <p className="text-[11px] font-bold text-gray-600 mb-2 flex items-center gap-1.5"><Layers size={13} /> نوع الأجهزة</p>
            {(data.deviceTypes || []).length === 0 ? (
              <p className="text-center text-gray-400 text-xs py-3">لا توجد بيانات كافية بعد</p>
            ) : (data.deviceTypes || []).map((d: any) => (
              <div key={d.key} className="flex items-center justify-between py-1.5 border-t border-gray-50 first:border-t-0">
                <span className="text-xs text-gray-600">{d.key === "mobile" ? "موبايل" : d.key === "tablet" ? "تابلت" : d.key === "desktop" ? "كمبيوتر" : d.key}</span>
                <span className="text-xs font-bold text-gray-800">{d.count}</span>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-lg p-3 border border-gray-100">
            <p className="text-[11px] font-bold text-gray-600 mb-2 flex items-center gap-1.5"><AlertTriangle size={13} className="text-red-500" /> آخر أخطاء العميل</p>
            {(data.recentErrors || []).length === 0 ? (
              <p className="text-center text-gray-400 text-xs py-3">لا توجد أخطاء مسجّلة</p>
            ) : (data.recentErrors || []).map((e: any, i: number) => (
              <div key={i} className="py-2 border-t border-gray-50 first:border-t-0 space-y-0.5">
                <p className="text-xs text-red-600 font-bold break-words">{e.message}</p>
                <p className="text-[10px] text-gray-400 truncate">{e.url} · {new Date(e.created_at).toLocaleString("ar-EG")}{e.user_id ? ` · مستخدم #${e.user_id}` : ""}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default AdminStatsPage;
