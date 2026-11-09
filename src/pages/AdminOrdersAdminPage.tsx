import React from "react";
import { Search, Zap, CheckCircle, XCircle, ChevronDown, User, ShoppingBag, AlertTriangle, RefreshCw, CalendarDays, X, History, DollarSign, Clock, ArrowUpRight, Store, Layers, Copy, Check, Share2, Image as ImageIcon, FileText, Table, ArrowUpDown, UserSearch, Star, ShieldAlert, ExternalLink, ListChecks, MessageSquare, CheckSquare, Square } from "lucide-react";
import { showToast } from "../components/ToastContainer";
import { showPromptDialog, showDialog } from "../components/CustomDialogContainer";
import OptimizedImage from "../components/OptimizedImage";
import { shareOrderAsImage, shareOrderAsPdf, shareOrderAsCsv, buildOrderShareRows } from "../utils/orderShare";

type TabKey = 'needs_approval' | 'pending' | 'approved' | 'rejected';
type SortKey = 'newest' | 'oldest' | 'price_desc';

function formatResponseTime(seconds?: number | null): string | null {
  if (seconds == null || Number.isNaN(seconds)) return null;
  if (seconds < 60) return `${seconds} ثانية`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} دقيقة`;
  return `${(seconds / 3600).toFixed(1)} ساعة`;
}

// ── عدّاد وقت الانتظار الحي: "منذ 5 دقائق"، يتلون أحمر بعد 15 دقيقة ──
function useElapsedLabel(createdAt: string): { label: string; isLate: boolean } {
  const [, forceTick] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => forceTick(v => v + 1), 30000);
    return () => clearInterval(t);
  }, []);
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const mins = Math.floor(diffMs / 60000);
  const isLate = mins >= 15;
  let label: string;
  if (mins < 1) label = "الآن";
  else if (mins < 60) label = `منذ ${mins} دقيقة`;
  else if (mins < 1440) label = `منذ ${Math.floor(mins / 60)} ساعة`;
  else label = `منذ ${Math.floor(mins / 1440)} يوم`;
  return { label, isLate };
}

function WaitingBadge({ createdAt }: { createdAt: string }) {
  const { label, isLate } = useElapsedLabel(createdAt);
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${isLate ? "bg-red-50 text-red-600 border border-red-200" : "bg-gray-100 text-gray-500"}`}>
      <Clock size={10} /> {label}
    </span>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }).catch(() => showToast("تعذر النسخ", 'error'));
      }}
      title="نسخ"
      className={`w-6 h-6 rounded-md border flex items-center justify-center active:scale-90 transition-all shrink-0 ${copied ? "bg-green-50 border-green-200 text-green-600" : "bg-white border-gray-200 text-gray-400"}`}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

// ── شارات ثقة المستخدم: VIP / محظور + عدد الطلبات السابقة ──
function UserTrustBadges({ order, onOpenProfile }: { order: any; onOpenProfile?: () => void }) {
  const isBlockedNow = order.user_is_banned || (order.user_is_blocked && (!order.user_blocked_until || new Date(order.user_blocked_until) > new Date()));
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {order.user_is_vip && (
        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
          <Star size={9} className="fill-amber-500 text-amber-500" /> VIP
        </span>
      )}
      {isBlockedNow && (
        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
          <ShieldAlert size={9} /> محظور
        </span>
      )}
      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
        <ListChecks size={9} /> {order.user_previous_orders_count ?? 0} طلب سابق
      </span>
      {order.user_balance != null && (
        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          <DollarSign size={9} /> {Number(order.user_balance).toFixed(2)} $
        </span>
      )}
      {onOpenProfile && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpenProfile(); }}
          title="فتح ملف المستخدم"
          className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 active:scale-95 transition-transform"
        >
          <ExternalLink size={9} /> الملف الكامل
        </button>
      )}
    </div>
  );
}

// ── نافذة سجل تعديلات الطلب: من غيّر الحالة ومتى ──
function OrderHistoryModal({ orderId, onClose, adminFetch }: { orderId: number; onClose: () => void; adminFetch: any }) {
  const [items, setItems] = React.useState<any[] | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    adminFetch(`/api/admin/orders/${orderId}/history`)
      .then((r: Response) => r.json())
      .then((d: any) => { if (!cancelled) setItems(Array.isArray(d.items) ? d.items : []); })
      .catch(() => { if (!cancelled) setItems([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [orderId]);

  const actionLabel = (t: string) => t === "order_status_changed" ? "تغيير حالة الطلب" : t;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-xl max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-[var(--brand-light)]/40 rounded-md flex items-center justify-center text-[var(--brand)]"><History size={18} /></div>
            <h3 className="font-bold text-base text-gray-800">سجل تعديلات الطلب #{orderId}</h3>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-md active:scale-95"><X size={18} className="text-gray-600" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {loading && (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-gray-100 rounded-md animate-pulse" />
              ))}
            </div>
          )}
          {!loading && items && items.length === 0 && (
            <p className="text-center text-gray-400 py-10 text-sm">لا يوجد سجل تعديلات لهذا الطلب</p>
          )}
          {!loading && items && items.map((it: any) => (
            <div key={it.id} className="bg-gray-50 border border-gray-200 rounded-md p-3 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-700">{actionLabel(it.action_type)}</p>
                <p className="text-[10px] text-gray-400">{new Date(it.created_at).toLocaleString("ar-EG")}</p>
              </div>
              <p className="text-[10px] text-gray-500">بواسطة: <span className="font-bold text-gray-600">{it.admin_id || "admin"}</span></p>
              {it.old_values?.status && it.new_values?.status && (
                <p className="text-[10px] text-gray-500">الحالة: <span className="font-mono">{it.old_values.status}</span> ← <span className="font-mono font-bold text-[var(--brand)]">{it.new_values.status}</span></p>
              )}
              {it.details && <p className="text-[10px] text-gray-400 break-words">{it.details}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Skeleton أثناء التحميل الأول ──
function OrderCardSkeleton() {
  return (
    <div className="bg-white rounded-md border border-gray-200 p-4 space-y-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-5 w-16 bg-gray-100 rounded-md" />
        <div className="h-5 w-20 bg-gray-100 rounded-md" />
      </div>
      <div className="h-4 w-40 bg-gray-100 rounded" />
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-100 shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-24 bg-gray-100 rounded" />
          <div className="h-3 w-32 bg-gray-100 rounded" />
        </div>
      </div>
      <div className="h-9 w-full bg-gray-100 rounded-md" />
      <div className="flex gap-2">
        <div className="h-9 flex-1 bg-gray-100 rounded-md" />
        <div className="h-9 flex-1 bg-gray-100 rounded-md" />
      </div>
    </div>
  );
}
function ShareMenu({ order, extra }: { order: any; extra?: { providerName?: string; price?: number; playerId?: string } }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const doShare = async (kind: "image" | "pdf" | "csv") => {
    setOpen(false);
    const rows = buildOrderShareRows(order, extra);
    const shareData = { orderId: order.id, title: "تفاصيل الطلب", rows };
    try {
      if (kind === "image") await shareOrderAsImage(shareData);
      else if (kind === "pdf") await shareOrderAsPdf(shareData);
      else shareOrderAsCsv(shareData);
      showToast("تم تجهيز الملف للتنزيل", 'success');
    } catch {
      showToast("تعذّرت المشاركة", 'error');
    }
  };

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        title="مشاركة الطلب"
        className="w-6 h-6 rounded-md border border-gray-200 bg-gray-50 text-gray-500 flex items-center justify-center active:scale-90 transition-transform shrink-0"
      >
        <Share2 size={12} />
      </button>
      {open && (
        <div
          onClick={e => e.stopPropagation()}
          className="absolute left-0 top-7 z-20 bg-white border border-gray-200 rounded-md shadow-lg py-1 w-40"
        >
          <button onClick={() => doShare("image")} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">
            <ImageIcon size={13} className="text-gray-400" /> مشاركة كصورة
          </button>
          <button onClick={() => doShare("pdf")} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">
            <FileText size={13} className="text-gray-400" /> مشاركة كـ PDF
          </button>
          <button onClick={() => doShare("csv")} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">
            <Table size={13} className="text-gray-400" /> مشاركة كـ CSV
          </button>
        </div>
      )}
    </div>
  );
}

const AdminOrdersAdminPage = ({adminOrders, orderSearch, setOrderSearch, orderDateFilter, setOrderDateFilter, fetchAdminOrders, adminFetch, focusId, clearFocusId, setAdminTab, setFocusTarget, ordersLoading}: any) => {
  const focusRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (focusId == null) return;
    const t = setTimeout(() => {
      if (focusRef.current) {
        focusRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      const clearT = setTimeout(() => clearFocusId && clearFocusId(), 2500);
      return () => clearTimeout(clearT);
    }, 150);
    return () => clearTimeout(t);
  }, [focusId]);

  const [orderMode, setOrderMode] = React.useState<string>("manual");
  const [modeLoading, setModeLoading] = React.useState(false);
  const [modeLoaded, setModeLoaded] = React.useState(false);
  const [expandedOrderId, setExpandedOrderId] = React.useState<number | null>(null);
  const [overridePlayerIds, setOverridePlayerIds] = React.useState<Record<number, string>>({});
  const [activeTab, setActiveTab] = React.useState<TabKey>('needs_approval');
  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [showLedger, setShowLedger] = React.useState(false);
  const [showStoreFilter, setShowStoreFilter] = React.useState(false);
  const [storeTypeFilter, setStoreTypeFilter] = React.useState<string>("");
  const [userFilter, setUserFilter] = React.useState<string>("");
  const [showUserFilter, setShowUserFilter] = React.useState(false);
  const [providerFilter, setProviderFilter] = React.useState<string>("");
  const [showProviderFilter, setShowProviderFilter] = React.useState(false);
  const [errorOnlyFilter, setErrorOnlyFilter] = React.useState(false);
  const [sortKey, setSortKey] = React.useState<SortKey>('newest');
  const [autoRefresh, setAutoRefresh] = React.useState(true);
  const [historyOrderId, setHistoryOrderId] = React.useState<number | null>(null);
  const ORDERS_PAGE_SIZE = 50;
  const [ordersVisibleCount, setOrdersVisibleCount] = React.useState(ORDERS_PAGE_SIZE);
  const autoRefreshSeconds = 20;
  const [selectMode, setSelectMode] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(new Set());
  const [bulkBusy, setBulkBusy] = React.useState(false);

  // ── تحديث تلقائي كل 20 ثانية (قابل للإيقاف) ──
  React.useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(() => { fetchAdminOrders && fetchAdminOrders(); }, autoRefreshSeconds * 1000);
    return () => clearInterval(t);
  }, [autoRefresh, fetchAdminOrders]);

  const hasDateFilter = !!(dateFrom || dateTo);
  const toIsoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const clearDateFilter = () => { setDateFrom(""); setDateTo(""); };

  // ── أنواع المتاجر: قائمة معروفة + أي نوع جديد يظهر مستقبلاً من بيانات الطلبات نفسها ──
  const getOrderStoreType = (o: any): string => o.order_items?.[0]?.products?.store_type || "normal";
  const storeTypeLabels: Record<string, string> = {
    normal: "عادي",
    quick_order: "طلب سريع",
    quantities: "كميات",
    external_api: "API خارجي",
    inventory: "منتج من المخزون",
  };
  const knownStoreTypes = Object.keys(storeTypeLabels);
  const dynamicStoreTypes = Array.from(new Set(adminOrders.map(getOrderStoreType))).filter((t: string) => !knownStoreTypes.includes(t));
  const storeTypeOptions = [...knownStoreTypes, ...dynamicStoreTypes];
  const hasStoreFilter = !!storeTypeFilter;
  const clearStoreFilter = () => setStoreTypeFilter("");

  React.useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then((data: any[]) => {
      const s = data.find((x: any) => x.key === "order_processing_mode");
      setOrderMode(s?.value || "manual");
      setModeLoaded(true);
    }).catch(() => setModeLoaded(true));
  }, []);

  const toggleMode = async (newMode: string) => {
    setModeLoading(true);
    await adminFetch("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "order_processing_mode", value: newMode }) });
    setOrderMode(newMode);
    setModeLoading(false);
  };

  // ── معالجة إجراء (قبول / رفض) ── تنقل الطلب فوراً للتبويب المناسب (SPA)
  const askSendResponse = (isRejected: boolean, onSubmit: (resp: string) => void, onSkip: () => void) => {
    showDialog({
      type: 'confirm',
      title: 'إرسال رد',
      message: 'هل تريد إرسال رد على الطلب؟',
      confirmText: 'نعم',
      cancelText: 'إلغاء',
      onConfirm: () => {
        showPromptDialog(
          isRejected ? "اكتب سبب الرفض:" : "اكتب الرد المناسب:",
          isRejected ? "رد الرفض" : "رد القبول",
          (val) => onSubmit(val || ""),
          "",
          isRejected ? "اكتب سبب الرفض..." : "اكتب ردك هنا..."
        );
      },
      onCancel: () => { onSkip(); },
    } as any);
  };

  const handleOrderAction = async (orderId: number, action: "approved" | "rejected", adminResp?: string) => {
    const overrideId = overridePlayerIds[orderId]?.trim() || undefined;
    const body: any = { status: action, admin_response: adminResp || "" };
    if (action === "approved" && overrideId) body.override_player_id = overrideId;
    const res = await adminFetch(`/api/admin/orders/${orderId}/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "حدث خطأ في السيرفر", 'error');
      fetchAdminOrders();
      return;
    }
    if (action === "approved") {
      if (data.finalStatus === "completed") {
        showToast("تم التنفيذ بنجاح", 'success');
      } else if (data.apiError) {
        showToast(`تم إرسال الطلب — قيد المعالجة\n\nملاحظة: ${data.apiError}`, 'success');
      } else {
        showToast("تم الإرسال — قيد المعالجة", 'success');
      }
    } else {
      showToast("تم رفض الطلب", 'success');
    }
    setActiveTab(action === "approved" ? 'approved' : 'rejected');
    fetchAdminOrders();
  };

  const toggleSelectOrder = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const exitSelectMode = () => { setSelectMode(false); setSelectedIds(new Set()); };

  const bulkApprove = () => {
    if (selectedIds.size === 0) return;
    showDialog({
      type: 'confirm',
      title: 'قبول جماعي',
      message: `هل تريد قبول ${selectedIds.size} طلب دون إرسالهم لأي مزوّد خارجي؟`,
      confirmText: 'نعم، قبول الكل',
      cancelText: 'إلغاء',
      onConfirm: async () => {
        setBulkBusy(true);
        const ids = Array.from(selectedIds);
        const results = await Promise.all(ids.map(id =>
          adminFetch(`/api/admin/orders/${id}/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "completed", admin_response: "" }) })
            .then((r: Response) => r.ok).catch(() => false)
        ));
        const okCount = results.filter(Boolean).length;
        showToast(okCount === ids.length ? `تم قبول ${okCount} طلب بنجاح` : `تم قبول ${okCount} من ${ids.length} — فشل الباقي`, okCount === ids.length ? 'success' : 'error');
        setBulkBusy(false);
        exitSelectMode();
        setActiveTab('approved');
        fetchAdminOrders();
      },
    } as any);
  };

  const bulkReject = () => {
    if (selectedIds.size === 0) return;
    showPromptDialog(
      `اكتب سبب رفض ${selectedIds.size} طلب (سيُطبّق على الكل):`,
      "رفض جماعي",
      async (reason) => {
        setBulkBusy(true);
        const ids = Array.from(selectedIds);
        const results = await Promise.all(ids.map(id =>
          adminFetch(`/api/admin/orders/${id}/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "rejected", admin_response: reason || "" }) })
            .then((r: Response) => r.ok).catch(() => false)
        ));
        const okCount = results.filter(Boolean).length;
        showToast(okCount === ids.length ? `تم رفض ${okCount} طلب` : `تم رفض ${okCount} من ${ids.length} — فشل الباقي`, okCount === ids.length ? 'success' : 'error');
        setBulkBusy(false);
        exitSelectMode();
        setActiveTab('rejected');
        fetchAdminOrders();
      },
      "",
      "اكتب سبب الرفض..."
    );
  };

  const isNeedsApprovalGroup = (o: any) => o.status === 'pending_admin';
  const isPendingGroup = (o: any) => o.status === 'processing' || o.status === 'pending';
  const isApprovedGroup = (o: any) => o.status === 'completed';
  const isRejectedGroup = (o: any) => o.status === 'failed' || o.status === 'cancelled' || o.status === 'rejected';

  // ── يطابق كل شيء عدا حالة التبويب نفسها، ليُستخدم في حساب بادجات كل تبويب حسب الفلاتر النشطة ──
  const hasOrderError = (o: any): boolean => {
    try { return !!JSON.parse(o.meta || "{}")?.last_api_error; } catch { return false; }
  };
  const matchesActiveFilters = (o: any) => {
    const matchesSearch = !orderSearch || o.product_name?.includes(orderSearch) || String(o.id).includes(orderSearch) || o.user_name?.includes(orderSearch);
    const matchesDate = (() => {
      if (!dateFrom && !dateTo) return true;
      const iso = toIsoDate(new Date(o.created_at));
      if (dateFrom && iso < dateFrom) return false;
      if (dateTo && iso > dateTo) return false;
      return true;
    })();
    const matchesStoreType = !storeTypeFilter || getOrderStoreType(o) === storeTypeFilter;
    const matchesUser = !userFilter || String(o.user_db_id ?? o.user_id) === userFilter;
    const matchesProvider = !providerFilter || String(o.provider_id ?? "") === providerFilter;
    const matchesError = !errorOnlyFilter || hasOrderError(o);
    return matchesSearch && matchesDate && matchesStoreType && matchesUser && matchesProvider && matchesError;
  };

  const filtersScopedOrders = adminOrders.filter(matchesActiveFilters);

  const needsApprovalCount = filtersScopedOrders.filter(isNeedsApprovalGroup).length;
  const pendingGroupCount = filtersScopedOrders.filter(isPendingGroup).length;
  const approvedGroupCount = filtersScopedOrders.filter(isApprovedGroup).length;
  const rejectedGroupCount = filtersScopedOrders.filter(isRejectedGroup).length;

  // ── قائمة المستخدمين الفريدين لفلتر "حسب المستخدم" ──
  const uniqueUsers = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const o of adminOrders) {
      const id = String(o.user_db_id ?? o.user_id ?? "");
      if (id && !map.has(id)) map.set(id, o.user_name || `مستخدم #${id}`);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [adminOrders]);

  // ── قائمة المزوّدين الفريدين لفلتر "حسب المزوّد" ──
  const uniqueProviders = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const o of adminOrders) {
      if (o.provider_id) map.set(String(o.provider_id), o.provider_name || `مزود #${o.provider_id}`);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [adminOrders]);

  const hasAnyFilter = !!(orderSearch || hasDateFilter || storeTypeFilter || userFilter || providerFilter || errorOnlyFilter);
  const clearAllFilters = () => {
    setOrderSearch("");
    setDateFrom(""); setDateTo("");
    setStoreTypeFilter("");
    setUserFilter("");
    setProviderFilter("");
    setErrorOnlyFilter(false);
    setShowStoreFilter(false); setShowDatePicker(false); setShowUserFilter(false); setShowProviderFilter(false);
  };



  const totalRequestedAmount = adminOrders.reduce((sum: number, o: any) => sum + Number(o.total_amount || o.total_price || 0), 0);

  React.useEffect(() => {
    setOrdersVisibleCount(ORDERS_PAGE_SIZE);
  }, [activeTab, orderSearch, orderDateFilter, storeTypeFilter, userFilter, providerFilter, errorOnlyFilter, sortKey]);

  React.useEffect(() => {
    if (activeTab !== 'needs_approval') exitSelectMode();
  }, [activeTab]);

  const filteredOrders = filtersScopedOrders.filter((o: any) => {
    const matchesStatus = activeTab === 'needs_approval' ? isNeedsApprovalGroup(o) : activeTab === 'pending' ? isPendingGroup(o) : activeTab === 'approved' ? isApprovedGroup(o) : isRejectedGroup(o);
    return matchesStatus;
  }).sort((a: any, b: any) => {
    if (sortKey === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sortKey === 'price_desc') return Number(b.total_amount || b.total_price || 0) - Number(a.total_amount || a.total_price || 0);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime(); // newest (افتراضي)
  });

  // ── عند القدوم من "أحدث النشاطات" بطلب محدد: انتقل تلقائياً لتبويب حالته الفعلية وامسح الفلاتر التي قد تخفيه ──
  React.useEffect(() => {
    if (focusId == null) return;
    const target = adminOrders.find((o: any) => String(o.id) === String(focusId));
    if (!target) return;
    if (isNeedsApprovalGroup(target)) setActiveTab('needs_approval');
    else if (isPendingGroup(target)) setActiveTab('pending');
    else if (isApprovedGroup(target)) setActiveTab('approved');
    else if (isRejectedGroup(target)) setActiveTab('rejected');
    setOrderSearch("");
    setDateFrom("");
    setDateTo("");
    setStoreTypeFilter("");
  }, [focusId, adminOrders]);

  const tabs: { key: TabKey; label: string; count: number; icon: React.ReactNode; activeClass: string }[] = [
    { key: 'needs_approval', label: 'الطلبات المعلقة', count: needsApprovalCount, icon: <AlertTriangle size={12} className="shrink-0" />, activeClass: 'bg-amber-500 text-white border-transparent' },
    { key: 'pending', label: 'قيد المراجعة', count: pendingGroupCount, icon: <Clock size={12} className="shrink-0" />, activeClass: 'bg-blue-500 text-white border-transparent' },
    { key: 'approved', label: 'المقبولة', count: approvedGroupCount, icon: <CheckCircle size={12} className="shrink-0" />, activeClass: 'bg-green-500 text-white border-transparent' },
    { key: 'rejected', label: 'المرفوضة', count: rejectedGroupCount, icon: <XCircle size={12} className="shrink-0" />, activeClass: 'bg-red-500 text-white border-transparent' },
  ];

  const getPriceValue = (order: any) => Number(order.total_amount || order.total_price || 0);
  const getProviderName = (order: any) =>
    order.provider_name ||
    order.order_items?.[0]?.products?.provider_name ||
    order.order_items?.[0]?.products?.store_type ||
    "Saraqib Store";
  const getProviderBaseUrl = (order: any) =>
    order.provider_base_url ||
    order.order_items?.[0]?.products?.provider_base_url ||
    null;
  const openProviderUrl = (url: string | null) => {
    if (!url) { showToast("لا يوجد رابط مسجّل لهذا المزود", 'error'); return; }
    window.open(url, "_blank", "noopener,noreferrer");
  };
  const openUserProfile = (userId: any) => {
    if (!userId) return;
    setFocusTarget && setFocusTarget({ type: "user", id: userId });
    setAdminTab && setAdminTab("users");
  };

  return (
    <div className="space-y-3" dir="rtl">

      {/* ═══════ شريط الأدوات العلوي ═══════ */}
      <div className="bg-white p-3.5 rounded-md border border-gray-200 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-md bg-[var(--brand-light)]/40 flex items-center justify-center shrink-0">
              <Zap size={15} className="text-[var(--brand)]" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-gray-800 text-sm truncate">وضع المعالجة</p>
              <p className="text-[10px] text-gray-400 truncate">{orderMode === 'auto' ? "تلقائي — يُرسل للـ API فوراً" : "يدوي — ينتظر موافقتك"}</p>
            </div>
          </div>
          {modeLoaded && (
            <div className="flex bg-gray-100 rounded-md p-1 gap-1 shrink-0">
              <button onClick={() => toggleMode("auto")} disabled={modeLoading} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${orderMode === 'auto' ? 'bg-green-500 text-white' : 'text-gray-500'}`}>تلقائي</button>
              <button onClick={() => toggleMode("manual")} disabled={modeLoading} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${orderMode === 'manual' ? 'bg-[var(--brand)] text-white' : 'text-gray-500'}`}>يدوي</button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLedger(true)}
            title="سجل الطلبات"
            aria-label="سجل الطلبات"
            className="flex-1 flex items-center justify-center px-3 py-2 rounded-md border border-gray-200 bg-gray-50 text-gray-600 active:scale-[0.97] transition-transform"
          >
            <History size={16} />
          </button>
          <button
            onClick={() => { setShowStoreFilter(v => !v); setShowDatePicker(false); setShowUserFilter(false); setShowProviderFilter(false); }}
            title="عرض الكل"
            aria-label="عرض الكل"
            className={`flex-1 flex items-center justify-center px-3 py-2 rounded-md border active:scale-[0.97] transition-transform ${hasStoreFilter ? 'bg-[var(--brand)] text-white border-transparent' : 'bg-gray-50 border-gray-200 text-gray-600'}`}
          >
            <Store size={16} />
          </button>
          <button
            onClick={() => { setShowDatePicker(v => !v); setShowStoreFilter(false); setShowUserFilter(false); setShowProviderFilter(false); }}
            title="فلترة بالتاريخ"
            aria-label="فلترة بالتاريخ"
            className={`flex-1 flex items-center justify-center px-3 py-2 rounded-md border active:scale-[0.97] transition-transform ${hasDateFilter ? 'bg-[var(--brand)] text-white border-transparent' : 'bg-gray-50 border-gray-200 text-gray-600'}`}
          >
            <CalendarDays size={16} />
          </button>
          <button
            onClick={() => { setShowUserFilter(v => !v); setShowStoreFilter(false); setShowDatePicker(false); setShowProviderFilter(false); }}
            title="فلترة حسب المستخدم"
            aria-label="فلترة حسب المستخدم"
            className={`flex-1 flex items-center justify-center px-3 py-2 rounded-md border active:scale-[0.97] transition-transform ${userFilter ? 'bg-[var(--brand)] text-white border-transparent' : 'bg-gray-50 border-gray-200 text-gray-600'}`}
          >
            <UserSearch size={16} />
          </button>
          <button
            onClick={() => { setShowProviderFilter(v => !v); setShowStoreFilter(false); setShowDatePicker(false); setShowUserFilter(false); }}
            title="فلترة حسب المزوّد"
            aria-label="فلترة حسب المزوّد"
            className={`flex-1 flex items-center justify-center px-3 py-2 rounded-md border active:scale-[0.97] transition-transform ${providerFilter ? 'bg-[var(--brand)] text-white border-transparent' : 'bg-gray-50 border-gray-200 text-gray-600'}`}
          >
            <Store size={16} className="rotate-180" />
          </button>
          <button
            onClick={() => setErrorOnlyFilter(v => !v)}
            title="عرض الطلبات المرتبطة بخطأ فقط"
            aria-label="عرض الطلبات المرتبطة بخطأ فقط"
            className={`flex-1 flex items-center justify-center px-3 py-2 rounded-md border active:scale-[0.97] transition-transform ${errorOnlyFilter ? 'bg-red-500 text-white border-transparent' : 'bg-gray-50 border-gray-200 text-gray-600'}`}
          >
            <AlertTriangle size={16} />
          </button>
          <button
            onClick={() => setAutoRefresh(v => !v)}
            title={autoRefresh ? "التحديث التلقائي مفعّل" : "التحديث التلقائي متوقف"}
            aria-label="التحديث التلقائي"
            className={`flex-1 flex items-center justify-center px-3 py-2 rounded-md border active:scale-[0.97] transition-transform ${autoRefresh ? 'bg-green-50 border-green-200 text-green-600' : 'bg-gray-50 border-gray-200 text-gray-400'}`}
          >
            <RefreshCw size={16} className={autoRefresh ? "animate-[spin_3s_linear_infinite]" : ""} />
          </button>
        </div>

        {hasAnyFilter && (
          <button
            onClick={clearAllFilters}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-red-200 bg-red-50 text-red-600 text-xs font-bold active:scale-[0.97] transition-transform"
          >
            <X size={14} /> مسح كل الفلاتر
          </button>
        )}

        {showProviderFilter && (
          <div className="bg-gray-50 border border-gray-200 rounded-md p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-gray-400">فلترة حسب المزوّد</p>
              {providerFilter && (
                <button onClick={() => setProviderFilter("")} className="p-1.5 bg-white border border-gray-200 rounded-md text-gray-500 active:scale-95 shrink-0">
                  <X size={14} />
                </button>
              )}
            </div>
            <select
              value={providerFilter}
              onChange={e => setProviderFilter(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-xs outline-none focus:border-[var(--brand)]"
            >
              <option value="">كل المزوّدين</option>
              {uniqueProviders.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        {showUserFilter && (
          <div className="bg-gray-50 border border-gray-200 rounded-md p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-gray-400">فلترة حسب المستخدم</p>
              {userFilter && (
                <button onClick={() => setUserFilter("")} className="p-1.5 bg-white border border-gray-200 rounded-md text-gray-500 active:scale-95 shrink-0">
                  <X size={14} />
                </button>
              )}
            </div>
            <select
              value={userFilter}
              onChange={e => setUserFilter(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-xs outline-none focus:border-[var(--brand)]"
            >
              <option value="">كل المستخدمين</option>
              {uniqueUsers.map(u => (
                <option key={u.id} value={u.id}>{u.name} (#{u.id})</option>
              ))}
            </select>
          </div>
        )}

        {showStoreFilter && (
          <div className="bg-gray-50 border border-gray-200 rounded-md p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-gray-400">عرض الكل — فلترة حسب نوع المتجر</p>
              {hasStoreFilter && (
                <button onClick={clearStoreFilter} className="p-1.5 bg-white border border-gray-200 rounded-md text-gray-500 active:scale-95 shrink-0">
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setStoreTypeFilter("")}
                className={`px-3 py-1.5 rounded-md text-[11px] font-bold border transition-colors ${!storeTypeFilter ? 'bg-[var(--brand)] text-white border-transparent' : 'bg-white border-gray-200 text-gray-600'}`}
              >
                الكل
              </button>
              {storeTypeOptions.map((t: string) => (
                <button
                  key={t}
                  onClick={() => setStoreTypeFilter(t)}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-bold border transition-colors ${storeTypeFilter === t ? 'bg-[var(--brand)] text-white border-transparent' : 'bg-white border-gray-200 text-gray-600'}`}
                >
                  {storeTypeLabels[t] || t}
                </button>
              ))}
            </div>
          </div>
        )}

        {showDatePicker && (
          <div className="bg-gray-50 border border-gray-200 rounded-md p-3 flex items-center gap-2">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-bold text-gray-400">من</label>
              <input type="date" value={dateFrom} max={dateTo || undefined} onChange={e => setDateFrom(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-sm outline-none focus:border-[var(--brand)]" />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-bold text-gray-400">حتى</label>
              <input type="date" value={dateTo} min={dateFrom || undefined} onChange={e => setDateTo(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-sm outline-none focus:border-[var(--brand)]" />
            </div>
            {hasDateFilter && (
              <button onClick={clearDateFilter} className="self-end p-2 mb-0.5 bg-white border border-gray-200 rounded-md text-gray-500 active:scale-95 shrink-0">
                <X size={16} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ═══════ التبويبات ═══════ */}
      <div className="grid grid-cols-4 gap-1.5">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex flex-col items-center justify-center gap-1 px-1 py-2.5 rounded-md text-[10.5px] font-bold border transition-all active:scale-[0.97] ${
              activeTab === tab.key ? tab.activeClass : "bg-white border-gray-200 text-gray-500"
            }`}
          >
            <div className="flex items-center gap-1">
              {tab.icon}
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full shrink-0 ${activeTab === tab.key ? 'bg-white/25' : 'bg-gray-100 text-gray-500'}`}>{tab.count}</span>
            </div>
            <span className="truncate leading-tight">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ═══════ بحث + ترتيب ═══════ */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="بحث في الطلبات..." value={orderSearch} onChange={e => setOrderSearch(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-md pr-9 pl-3 py-2.5 text-xs outline-none focus:border-[var(--brand)] transition-colors" />
        </div>
        <div className="relative shrink-0">
          <select
            value={sortKey}
            onChange={e => setSortKey(e.target.value as SortKey)}
            className="appearance-none bg-white border border-gray-200 rounded-md pl-7 pr-3 py-2.5 text-xs font-bold outline-none focus:border-[var(--brand)] text-gray-600"
          >
            <option value="newest">الأحدث</option>
            <option value="oldest">الأقدم</option>
            <option value="price_desc">الأعلى سعراً</option>
          </select>
          <ArrowUpDown size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        {activeTab === 'needs_approval' && (
          <button
            onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}
            title="تحديد جماعي"
            aria-label="تحديد جماعي"
            className={`shrink-0 flex items-center justify-center px-3 py-2.5 rounded-md border active:scale-[0.97] transition-transform ${selectMode ? 'bg-[var(--brand)] text-white border-transparent' : 'bg-white border-gray-200 text-gray-600'}`}
          >
            <ListChecks size={16} />
          </button>
        )}
      </div>

      {/* ═══════ شريط الإجراء الجماعي ═══════ */}
      {selectMode && activeTab === 'needs_approval' && (
        <div className="sticky top-0 z-10 bg-white border border-gray-200 rounded-md p-2.5 flex items-center gap-2 shadow-sm">
          <button
            onClick={() => {
              const idsOnPage = filteredOrders.slice(0, ordersVisibleCount).map((o: any) => o.id);
              setSelectedIds(prev => prev.size === idsOnPage.length ? new Set() : new Set(idsOnPage));
            }}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-md bg-gray-50 border border-gray-200 text-gray-600 text-[11px] font-bold shrink-0 active:scale-95"
          >
            {selectedIds.size > 0 && selectedIds.size === filteredOrders.slice(0, ordersVisibleCount).length ? <CheckSquare size={13} /> : <Square size={13} />}
            تحديد الكل
          </button>
          <span className="text-[11px] font-bold text-gray-500 flex-1 text-center">{selectedIds.size} محدد</span>
          <button
            disabled={selectedIds.size === 0 || bulkBusy}
            onClick={bulkApprove}
            className="flex items-center gap-1 px-3 py-2 rounded-md bg-green-500 text-white text-[11px] font-bold shrink-0 disabled:opacity-40 active:scale-95"
          >
            <CheckCircle size={13} /> قبول المحدد
          </button>
          <button
            disabled={selectedIds.size === 0 || bulkBusy}
            onClick={bulkReject}
            className="flex items-center gap-1 px-3 py-2 rounded-md bg-red-50 text-red-600 border border-red-200 text-[11px] font-bold shrink-0 disabled:opacity-40 active:scale-95"
          >
            <XCircle size={13} /> رفض المحدد
          </button>
        </div>
      )}

      {/* ═══════ محتوى التبويب النشط فقط — لا يوجد أي عرض آخر خارج هذه القائمة ═══════ */}
      <div className="space-y-2.5">
        {ordersLoading ? (
          <>
            <OrderCardSkeleton />
            <OrderCardSkeleton />
            <OrderCardSkeleton />
          </>
        ) : activeTab === 'needs_approval' ? (
          // ── تبويب "الطلبات المعلقة" حصراً: بطاقة القبول/الرفض المخصصة ──
          filteredOrders.slice(0, ordersVisibleCount).map((order: any) => {
            let metaParsed: any = {};
            try { metaParsed = JSON.parse(order.meta || "{}"); } catch {}
            const savedPlayerId = metaParsed.playerId || metaParsed.input || metaParsed.player_id || "";
            const lastError = metaParsed.last_api_error || "";
            const currentOverride = overridePlayerIds[order.id];
            const effectivePlayerId = (currentOverride !== undefined ? currentOverride : savedPlayerId).trim();
            const isFocused = focusId != null && String(focusId) === String(order.id);
            const providerName = getProviderName(order);
            const price = getPriceValue(order);
            const pathParts = [order.category_name, order.subcategory_name, order.subsubcategory_name, order.product_name].filter(Boolean);

            return (
              <div key={order.id} ref={isFocused ? focusRef : undefined}
                onClick={selectMode ? () => toggleSelectOrder(order.id) : undefined}
                className={`bg-white rounded-md border p-4 space-y-3 transition-shadow ${selectMode ? "cursor-pointer" : ""} ${selectedIds.has(order.id) ? "border-[var(--brand)] ring-2 ring-[var(--brand-light)]" : isFocused ? "border-blue-400 ring-2 ring-blue-200" : "border-gray-200"}`}>

                {/* 1. حالة المعالجة */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {selectMode && (
                      <button
                        type="button"
                        onClick={() => toggleSelectOrder(order.id)}
                        className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 active:scale-90 transition-transform ${selectedIds.has(order.id) ? 'bg-[var(--brand)] border-transparent text-white' : 'bg-white border-gray-300 text-transparent'}`}
                      >
                        {selectedIds.has(order.id) ? <CheckSquare size={14} /> : <Square size={14} className="text-gray-300" />}
                      </button>
                    )}
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md ${orderMode === 'auto' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                      <Zap size={11} /> {orderMode === 'auto' ? 'تلقائي' : 'يدوي'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <WaitingBadge createdAt={order.created_at} />
                    <button
                      type="button"
                      onClick={() => setHistoryOrderId(order.id)}
                      title="سجل التعديلات"
                      className="w-6 h-6 rounded-md border border-gray-200 bg-gray-50 text-gray-500 flex items-center justify-center active:scale-90 transition-transform shrink-0"
                    >
                      <History size={12} />
                    </button>
                    <ShareMenu order={order} extra={{ providerName, price, playerId: effectivePlayerId }} />
                  </div>
                </div>

                {/* 2. اسم القسم الرئيسي / الفرعي / الفرع الفرعي / المنتج */}
                <div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {pathParts.length > 0 ? pathParts.join(" ← ") : "—"}
                  </p>
                </div>

                {/* 3. رقم الطلب */}
                <p className="font-bold text-sm text-gray-800">رقم الطلب: <span className="text-[var(--brand)]">#{order.id}</span></p>

                {/* 3.5 بيانات المستخدم: الاسم، رقم الدخول، الصورة */}
                <div className="bg-gray-50 border border-gray-100 rounded-md px-3 py-2 space-y-2">
                  <div className="flex items-center gap-3">
                    {order.user_avatar ? (
                      <img src={order.user_avatar} alt={order.user_name || "مستخدم"} className="w-10 h-10 rounded-full object-cover border border-gray-200 shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-sm shrink-0">
                        {(order.user_name || "?").charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-gray-800 truncate">{order.user_name || "مستخدم محذوف"}</p>
                      <p className="text-[10px] text-gray-500">رقم الدخول: <span className="font-mono font-bold text-gray-700">#{order.user_db_id ?? order.user_id}</span></p>
                      {order.user_phone && order.user_phone !== "—" && (
                        <p className="text-[10px] text-gray-400 truncate">{order.user_phone}</p>
                      )}
                    </div>
                  </div>
                  <UserTrustBadges order={order} onOpenProfile={() => openUserProfile(order.user_db_id ?? order.user_id)} />
                </div>

                {/* 4. اسم المزود والسعر */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-gray-700">{providerName}</span>
                    <span className="text-gray-300">·</span>
                    <span className="font-bold text-gray-700">{price.toFixed(3)} $</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openProviderUrl(getProviderBaseUrl(order))}
                    title="فتح رابط المزود"
                    className="w-6 h-6 rounded-md border border-gray-200 bg-gray-50 text-gray-500 flex items-center justify-center active:scale-90 transition-transform shrink-0"
                  >
                    <ArrowUpRight size={13} />
                  </button>
                </div>

                {/* 5. معرف اللاعب */}
                {savedPlayerId && (
                  <div className="bg-gray-50 border border-gray-100 rounded-md px-3 py-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[9px] text-gray-400 mb-0.5">معرف اللاعب</p>
                      <p className="text-xs font-mono font-bold text-gray-700 break-all">{savedPlayerId}</p>
                    </div>
                    <CopyButton value={savedPlayerId} />
                  </div>
                )}

                {/* 6. تنبيه أحمر واضح إن وجد */}
                {lastError && (
                  <div className="flex items-start gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                    <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                    <span className="break-words">{lastError}</span>
                  </div>
                )}

                {/* 7. حقل تعديل Player ID (اختياري) */}
                <div>
                  <label className="text-[10px] text-gray-400 mb-1 block">تعديل Player ID قبل القبول (اختياري)</label>
                  <input
                    type="text"
                    placeholder={savedPlayerId || "أدخل Player ID..."}
                    value={currentOverride !== undefined ? currentOverride : savedPlayerId}
                    onChange={e => setOverridePlayerIds(prev => ({ ...prev, [order.id]: e.target.value }))}
                    className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-xs outline-none focus:border-[var(--brand)] font-mono transition-colors"
                  />
                </div>

                {/* 8. أزرار الإجراء: قبول / قبول بدون مزود / رفض */}
                {!selectMode && <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => {
                      const doApprove = (adminResp: string) => {
                        const body: any = { status: "approved", admin_response: adminResp || "" };
                        if (effectivePlayerId) body.override_player_id = effectivePlayerId;
                        adminFetch(`/api/admin/orders/${order.id}/status`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(body)
                        }).then((res: Response) => res.json()).then((data: any) => {
                          if (data.error) { showToast(data.error || "حدث خطأ", 'error'); }
                          else if (data.finalStatus === "completed") { showToast("تم التنفيذ بنجاح", 'success'); }
                          else if (data.apiError) { showToast(`تم إرسال الطلب — قيد المعالجة\n\nملاحظة: ${data.apiError}`, 'success'); }
                          else { showToast("تم الإرسال — قيد المعالجة", 'success'); }
                          setActiveTab('approved');
                          fetchAdminOrders();
                        });
                      };
                      askSendResponse(false, doApprove, () => doApprove(""));
                    }}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-all"
                  ><CheckCircle size={13} />قبول</button>
                  <button
                    onClick={() => {
                      // ── قبول يدوي بدون إرسال للمزود: status="completed" مباشرة، لا يمر بمنطق AUTO/API الخارجي إطلاقاً ──
                      const doApproveNoProvider = (adminResp: string) => {
                        const body: any = { status: "completed", admin_response: adminResp || "" };
                        adminFetch(`/api/admin/orders/${order.id}/status`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(body)
                        }).then((res: Response) => res.json()).then((data: any) => {
                          if (data.error) { showToast(data.error || "حدث خطأ", 'error'); }
                          else { showToast("تم قبول الطلب يدوياً دون إرساله للمزود", 'success'); }
                          setActiveTab('approved');
                          fetchAdminOrders();
                        });
                      };
                      askSendResponse(false, doApproveNoProvider, () => doApproveNoProvider(""));
                    }}
                    title="يقبل الطلب مباشرة دون إرساله لأي مزود خارجي"
                    className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 py-2.5 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 border border-blue-200 active:scale-[0.97] transition-all"
                  ><CheckCircle size={13} />قبول يدوي</button>
                  <button
                    onClick={() => {
                      askSendResponse(true, (r) => handleOrderAction(order.id, "rejected", r || ""), () => handleOrderAction(order.id, "rejected", ""));
                    }}
                    className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-2.5 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 border border-red-200 active:scale-[0.97] transition-all"
                  ><XCircle size={13} />رفض</button>
                </div>}
              </div>
            );
          })
        ) : (
          // ── باقي التبويبات (قيد المراجعة / المقبولة / المرفوضة): بطاقة عرض قابلة للتوسيع ──
          filteredOrders.slice(0, ordersVisibleCount).map((order: any) => {
            let metaParsed: any = {};
            try { metaParsed = JSON.parse(order.meta || "{}"); } catch {}
            const isExpanded = expandedOrderId === order.id;
            const statusColor = order.status === 'completed' ? 'bg-green-100 text-green-700' : isRejectedGroup(order) ? 'bg-red-100 text-red-600' : order.status === 'processing' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700';
            const statusLabel = order.status === 'completed' ? 'مقبول' : isRejectedGroup(order) ? 'مرفوض' : order.status === 'processing' ? 'معالجة' : 'قيد المراجعة';
            const isFocused = focusId != null && String(focusId) === String(order.id);
            // ── تمييز الطلبات المكتملة تلقائياً (auto) عن المقبولة يدوياً (manual/manual_approved) ──
            const wasAutoCompleted = order.status === 'completed' && metaParsed.order_mode === 'auto';
            const wasManuallyApproved = order.status === 'completed' && (metaParsed.order_mode === 'manual' || metaParsed.order_mode === 'manual_approved');
            const isExternalApiOrder = (order.order_items?.[0]?.products?.store_type === 'external_api') || !!metaParsed.ahminix_order_id;
            const isFailedExternalApi = isRejectedGroup(order) && isExternalApiOrder;
            const rejectionReason = isRejectedGroup(order) ? (order.admin_response || metaParsed.last_api_error || metaParsed.api_error_msg || null) : null;
            // ── رد المزود الفعلي (API خارجي) — يُعرض دائماً أياً كانت حالة الطلب، ويعكس آخر تحديث ──
            const providerResponse = isExternalApiOrder
              ? (metaParsed.ahminix_status_message || metaParsed.provider_message || metaParsed.provider_response
                 || metaParsed.ahminix_response || metaParsed.api_response || metaParsed.last_api_error
                 || metaParsed.api_error_msg || metaParsed.ahminix_message || null)
              : null;
            const providerResponseText = providerResponse
              ? (typeof providerResponse === 'string' ? providerResponse : JSON.stringify(providerResponse))
              : null;

            return (
              <div key={order.id} ref={isFocused ? focusRef : undefined}
                className={`bg-white rounded-md border overflow-hidden transition-shadow ${isFocused ? "border-blue-400 ring-2 ring-blue-200" : "border-gray-200"}`}>

                <div className="px-4 pt-4 pb-3 flex items-center gap-3 border-b border-gray-100">
                  <div className="w-9 h-9 rounded-md bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {order.user_avatar
                      ? <OptimizedImage src={order.user_avatar} width={80} height={80} className="w-full h-full object-cover" />
                      : <User size={16} className="text-gray-400" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm text-gray-800 truncate">{order.user_name}</p>
                    <p className="text-[10px] text-gray-400 truncate">{order.user_email || order.users?.email || "—"}</p>
                    <div className="mt-1"><UserTrustBadges order={order} onOpenProfile={() => openUserProfile(order.user_db_id ?? order.user_id)} /></div>
                  </div>
                  {activeTab === 'pending' && <WaitingBadge createdAt={order.created_at} />}
                  {wasAutoCompleted && (
                    <span title="تم تنفيذه تلقائياً بدون تدخل الأدمن" className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-1 rounded-md bg-green-50 text-green-600 border border-green-200 shrink-0">
                      <Zap size={10} /> تلقائي
                    </span>
                  )}
                  {wasManuallyApproved && (
                    <span title="تمت الموافقة عليه يدوياً من الأدمن" className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-1 rounded-md bg-blue-50 text-blue-600 border border-blue-200 shrink-0">
                      <User size={10} /> يدوي
                    </span>
                  )}
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-md flex-shrink-0 ${statusColor}`}>{statusLabel}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setHistoryOrderId(order.id); }}
                    title="سجل التعديلات"
                    className="w-6 h-6 rounded-md border border-gray-200 bg-gray-50 text-gray-500 flex items-center justify-center active:scale-90 transition-transform shrink-0"
                  >
                    <History size={12} />
                  </button>
                  <ShareMenu order={order} extra={{ providerName: getProviderName(order), price: getPriceValue(order) }} />
                  {providerResponseText && (
                    <span title="يوجد رد من المزود" className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-1 rounded-md bg-purple-50 text-purple-600 border border-purple-200 shrink-0">
                      <MessageSquare size={10} /> رد المزود
                    </span>
                  )}
                </div>

                <div className="px-4 py-3 flex items-center justify-between cursor-pointer" onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-gray-800 truncate">#{order.id} — {order.product_name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleString("ar-EG")}</p>
                      {formatResponseTime(order.response_time_seconds) && (order.status === 'completed' || isRejectedGroup(order)) && (
                        <>
                          <span className="text-gray-300 text-xs">·</span>
                          <span className={`flex items-center gap-0.5 text-[11px] font-bold ${order.status === 'completed' ? 'text-green-600' : 'text-red-500'}`}>
                            <Clock size={10} /> {formatResponseTime(order.response_time_seconds)}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs font-bold text-[var(--brand)]">{getPriceValue(order).toFixed(3)} $</p>
                      <span className="text-gray-300 text-xs">·</span>
                      <span className="text-xs font-bold text-gray-500 truncate">{getProviderName(order)}</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openProviderUrl(getProviderBaseUrl(order)); }}
                        title="فتح رابط المزود"
                        className="w-5 h-5 rounded-md border border-gray-200 bg-gray-50 text-gray-500 flex items-center justify-center active:scale-90 transition-transform shrink-0"
                      >
                        <ArrowUpRight size={11} />
                      </button>
                    </div>
                  </div>
                  <ChevronDown size={16} className={`text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                </div>

                {/* ── سبب الرفض/رد الأدمن ظاهر مباشرة على البطاقة بدون فتح تفاصيل إضافية ── */}
                {rejectionReason && (
                  <div className="mx-4 mb-3 flex items-start gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                    <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                    <span className="break-words flex-1">{rejectionReason}</span>
                  </div>
                )}


                {/* ── إعادة محاولة سريعة للطلبات الفاشلة (خصوصاً API خارجي) ── */}
                {isRejectedGroup(order) && (
                  <div className="mx-4 mb-3">
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const res = await adminFetch(`/api/admin/orders/${order.id}/retry`, { method: "POST" });
                        const d = await res.json();
                        if (d.error) showToast(`تعذّرت إعادة المحاولة: ${d.error}`, 'error');
                        else { showToast(`تمت إعادة إرسال الطلب #${order.id} للمراجعة`, 'success'); setActiveTab('needs_approval'); fetchAdminOrders(); }
                      }}
                      className="w-full flex items-center justify-center gap-1.5 text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 py-2 rounded-md active:scale-[0.97] transition-transform"
                    >
                      <RefreshCw size={13} /> {isFailedExternalApi ? "إعادة محاولة (API خارجي)" : "إعادة محاولة"}
                    </button>
                  </div>
                )}

                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/60 px-4 pb-4 pt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {order.category_name && <div className="bg-white rounded-md p-2.5 border border-gray-100"><p className="text-[9px] text-gray-400 mb-0.5">القسم الرئيسي</p><p className="font-bold text-gray-700">{order.category_name}</p></div>}
                      {order.subcategory_name && <div className="bg-white rounded-md p-2.5 border border-gray-100"><p className="text-[9px] text-gray-400 mb-0.5">القسم الفرعي</p><p className="font-bold text-gray-700">{order.subcategory_name}</p></div>}
                      {order.order_items?.[0]?.products?.store_type && <div className="bg-white rounded-md p-2.5 border border-gray-100"><p className="text-[9px] text-gray-400 mb-0.5">نوع المتجر</p><p className="font-bold text-gray-700">{order.order_items[0].products.store_type}</p></div>}
                      <div className="bg-white rounded-md p-2.5 border border-gray-100">
                        <p className="text-[9px] text-gray-400 mb-0.5">المزود</p>
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-bold text-gray-700 truncate">{getProviderName(order)}</p>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); openProviderUrl(getProviderBaseUrl(order)); }}
                            title="فتح رابط المزود"
                            className="w-5 h-5 rounded-md border border-gray-200 bg-gray-50 text-gray-500 flex items-center justify-center active:scale-90 transition-transform shrink-0"
                          >
                            <ArrowUpRight size={11} />
                          </button>
                        </div>
                      </div>
                      {(metaParsed.playerId || metaParsed.player_id) && (
                        <div className="bg-white rounded-md p-2.5 border border-gray-100 flex items-center justify-between gap-2">
                          <div className="min-w-0"><p className="text-[9px] text-gray-400 mb-0.5">معرف اللاعب</p><p className="font-bold text-gray-700 truncate">{metaParsed.playerId || metaParsed.player_id}</p></div>
                          <CopyButton value={String(metaParsed.playerId || metaParsed.player_id)} />
                        </div>
                      )}
                      {[...(Array.isArray(metaParsed.defaultFields) ? metaParsed.defaultFields : []), ...(Array.isArray(metaParsed.customFields) ? metaParsed.customFields : [])]
                        .filter((f: any) => f && String(f.value ?? "").trim() !== "")
                        .map((f: any, i: number) => (
                          <div key={i} className="bg-white rounded-md p-2.5 border border-gray-100"><p className="text-[9px] text-gray-400 mb-0.5">{f.label || "حقل"}</p><p className="font-bold text-gray-700 break-all">{String(f.value)}</p></div>
                        ))}
                      {metaParsed.ahminix_order_id && <div className="bg-white rounded-md p-2.5 border border-gray-100 col-span-2"><p className="text-[9px] text-gray-400 mb-0.5">معرف Ahminix</p><p className="font-bold text-gray-700">{metaParsed.ahminix_order_id}</p></div>}
                      {order.admin_response && <div className="bg-white rounded-md p-2.5 border border-gray-100 col-span-2"><p className="text-[9px] text-gray-400 mb-0.5">رد الأدمن</p><p className="font-bold text-gray-700">{order.admin_response}</p></div>}
                      {providerResponseText && (
                        <div className={`col-span-2 rounded-md p-2.5 border ${order.status === 'completed' ? 'bg-green-50 border-green-200' : isRejectedGroup(order) ? 'bg-red-50 border-red-200' : 'bg-purple-50 border-purple-200'}`}>
                          <p className={`text-[9px] mb-0.5 font-bold flex items-center gap-1 ${order.status === 'completed' ? 'text-green-600' : isRejectedGroup(order) ? 'text-red-600' : 'text-purple-600'}`}><MessageSquare size={10} /> رد المزود (API خارجي)</p>
                          <p className="font-bold text-gray-700 break-words">{providerResponseText}</p>
                        </div>
                      )}
                      <div className="bg-white rounded-md p-2.5 border border-gray-100"><p className="text-[9px] text-gray-400 mb-0.5">استرداد الرصيد</p><p className={`font-bold text-xs ${metaParsed.refunded ? 'text-green-600' : 'text-gray-400'}`}>{metaParsed.refunded ? <span className="flex items-center gap-1"><CheckCircle size={11} />تم</span> : "لا"}</p></div>
                    </div>

                    {metaParsed.ahminix_order_id && (order.status === 'processing' || order.status === 'pending') && (
                      <button onClick={async (e) => {
                        e.stopPropagation();
                        const res = await adminFetch(`/api/admin/ahminix/sync-order/${order.id}`, { method: "POST" });
                        const d = await res.json();
                        showToast(d.error ? `خطأ: ${d.error}` : `${d.oldStatus} ← ${d.newStatus} (API: ${d.ahminixStatus})`, 'error');
                        fetchAdminOrders();
                      }} className="w-full text-xs bg-blue-50 text-blue-600 py-2 rounded-md font-bold border border-blue-200 active:scale-[0.97] flex items-center justify-center gap-1"><RefreshCw size={13} /> مزامنة مع Ahminix</button>
                    )}

                    {/* ═══════ صافي الربح الفعلي لكل منتج بالطلب ═══════ */}
                    {(order.order_items || []).map((item: any) => {
                      const product = item.products || {};
                      const isExternalApi = product.store_type === 'external_api';
                      let itemExtra: any = {};
                      try { itemExtra = JSON.parse(item.extra_data || "{}"); } catch {}
                      const hasManual = itemExtra.manual_profit !== undefined && itemExtra.manual_profit !== null && itemExtra.manual_profit !== "";
                      const productDefaultProfit = product.default_profit;
                      const effectiveDefault = hasManual ? itemExtra.manual_profit : (productDefaultProfit !== undefined && productDefaultProfit !== null ? productDefaultProfit : "");
                      return (
                        <div key={item.id} className="bg-white rounded-md p-3 border border-gray-100 space-y-2" onClick={e => e.stopPropagation()}>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">
                            صافي الربح الفعلي — {product.name || "منتج"}
                            {isExternalApi && <span className="text-[9px] text-gray-300 font-normal mr-1">(اختياري — منتج API خارجي محسوب تلقائياً)</span>}
                          </p>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              step="0.01"
                              id={`manual-profit-${item.id}`}
                              defaultValue={effectiveDefault}
                              placeholder={hasManual ? "" : "غير محدد — استخدم قيمة المنتج الافتراضية إن وجدت"}
                              className="flex-1 border border-gray-200 rounded-md px-2 py-2 text-xs outline-none focus:border-[var(--brand)] bg-white"
                            />
                            <button
                              onClick={async () => {
                                const input = document.getElementById(`manual-profit-${item.id}`) as HTMLInputElement;
                                const val = input?.value;
                                if (val === undefined || val === "" || isNaN(parseFloat(val))) {
                                  showToast("أدخل قيمة ربح صحيحة", 'error');
                                  return;
                                }
                                const res = await adminFetch(`/api/admin/order-items/${item.id}/manual-profit`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ manual_profit: parseFloat(val) })
                                });
                                const d = await res.json();
                                if (d.error) showToast(`خطأ: ${d.error}`, 'error');
                                else { showToast("تم حفظ صافي الربح", 'success'); fetchAdminOrders(); }
                              }}
                              className="bg-[var(--brand)] text-white px-3 py-2 rounded-md text-xs font-bold active:scale-[0.97] transition-transform shrink-0"
                            >حفظ</button>
                          </div>
                          {hasManual && <p className="text-[9px] text-green-600">✓ محفوظ حالياً: {Number(itemExtra.manual_profit).toFixed(3)} $</p>}
                        </div>
                      );
                    })}


                    <div className="bg-white rounded-md p-3 border border-gray-100 space-y-2">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">تغيير حالة الطلب</p>
                      <div className="flex gap-2">
                        <select
                          defaultValue={order.status}
                          id={`status-select-${order.id}`}
                          className="flex-1 border border-gray-200 rounded-md px-2 py-2 text-xs outline-none focus:border-[var(--brand)] bg-white"
                          onClick={e => e.stopPropagation()}
                        >
                          <option value="pending_admin">الطلبات المعلقة</option>
                          <option value="processing">قيد المراجعة</option>
                          <option value="completed">مقبول</option>
                          <option value="failed">مرفوض</option>
                          <option value="cancelled">ملغي</option>
                        </select>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            const sel = document.getElementById(`status-select-${order.id}`) as HTMLSelectElement;
                            const newStatus = sel?.value;
                            if (!newStatus) return;

                            const submitStatus = async (adminResp: string) => {
                              const res = await adminFetch(`/api/admin/orders/${order.id}/status`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ status: newStatus === "failed" ? "rejected" : newStatus, admin_response: adminResp || "" })
                              });
                              const d = await res.json();
                              if (d.error) showToast(`خطأ: ${d.error}`, 'error');
                              else {
                                showToast("تم تحديث الحالة", 'success');
                                if (newStatus === 'completed') setActiveTab('approved');
                                else if (newStatus === 'failed' || newStatus === 'cancelled') setActiveTab('rejected');
                                else if (newStatus === 'pending_admin') setActiveTab('needs_approval');
                                else setActiveTab('pending');
                                fetchAdminOrders();
                              }
                            };

                            if (newStatus === 'completed' || newStatus === 'failed') {
                              askSendResponse(newStatus === 'failed', submitStatus, () => submitStatus(""));
                              return;
                            }
                            await submitStatus("");
                          }}
                          className="bg-[var(--brand)] text-white px-3 py-2 rounded-md text-xs font-bold active:scale-[0.97] transition-transform"
                        >حفظ</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}

        {!ordersLoading && filteredOrders.length === 0 && (
          <div className="text-center py-14 text-gray-400 bg-white rounded-md border border-gray-200">
            <ShoppingBag size={36} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">لا توجد طلبات</p>
          </div>
        )}

        {!ordersLoading && filteredOrders.length > ordersVisibleCount && (
          <div className="flex flex-col items-center gap-2 pt-2 pb-1">
            <button
              onClick={() => setOrdersVisibleCount(c => c + ORDERS_PAGE_SIZE)}
              className="w-full sm:w-auto px-6 py-2.5 rounded-md text-xs font-bold bg-[var(--brand)] text-white active:scale-[0.97] transition-transform"
            >
              عرض المزيد
            </button>
            <p className="text-[11px] text-gray-400">
              تم عرض {Math.min(ordersVisibleCount, filteredOrders.length)} من {filteredOrders.length} — المتبقي {filteredOrders.length - Math.min(ordersVisibleCount, filteredOrders.length)}
            </p>
          </div>
        )}
      </div>

      {/* ═══════ نافذة سجل تعديلات الطلب ═══════ */}
      {historyOrderId != null && (
        <OrderHistoryModal orderId={historyOrderId} onClose={() => setHistoryOrderId(null)} adminFetch={adminFetch} />
      )}

      {/* ═══════ نافذة سجل الطلبات ═══════ */}
      {showLedger && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowLedger(false)}>
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-xl max-h-[85vh] flex flex-col shadow-2xl"
          >
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-[var(--brand-light)]/40 rounded-md flex items-center justify-center text-[var(--brand)]"><History size={18} /></div>
                <h3 className="font-bold text-lg text-gray-800">سجل الطلبات</h3>
              </div>
              <button onClick={() => setShowLedger(false)} className="p-2 bg-gray-100 rounded-md active:scale-95">
                <X size={18} className="text-gray-600" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-1.5 px-4 pt-3 shrink-0 text-center">
              <div className="bg-amber-50 border border-amber-200 rounded-md p-2">
                <p className="text-[8px] text-amber-700 font-bold leading-tight">الطلبات المعلقة</p>
                <p className="text-sm font-black text-amber-800">{needsApprovalCount}</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-md p-2">
                <p className="text-[8px] text-blue-600 font-bold leading-tight">قيد المراجعة</p>
                <p className="text-sm font-black text-blue-700">{pendingGroupCount}</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-md p-2">
                <p className="text-[8px] text-green-600 font-bold leading-tight">المقبولة</p>
                <p className="text-sm font-black text-green-700">{approvedGroupCount}</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-md p-2">
                <p className="text-[8px] text-red-600 font-bold leading-tight">المرفوضة</p>
                <p className="text-sm font-black text-red-700">{rejectedGroupCount}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {adminOrders.length === 0 && (
                <p className="text-center text-gray-400 py-10 text-sm">لا توجد طلبات</p>
              )}
              {adminOrders.map((o: any) => {
                const isRejected = isRejectedGroup(o);
                const isApproved = o.status === 'completed';
                const isNeedsApproval = o.status === 'pending_admin';
                return (
                  <div key={o.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-md px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-700 truncate">#{o.id} — {o.product_name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-[10px] text-gray-400 truncate">{o.user_name || "—"} · {new Date(o.created_at).toLocaleDateString("ar-EG")} · {getProviderName(o)}</p>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openProviderUrl(getProviderBaseUrl(o)); }}
                          title="فتح رابط المزود"
                          className="w-4 h-4 rounded border border-gray-200 bg-white text-gray-500 flex items-center justify-center active:scale-90 transition-transform shrink-0"
                        >
                          <ArrowUpRight size={9} />
                        </button>
                      </div>
                    </div>
                    <div className="text-left shrink-0">
                      <p className="text-sm font-black text-gray-700">{Number(o.total_amount || o.total_price || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })} $</p>
                      <span className={`text-[9px] font-bold ${isApproved ? 'text-green-600' : isRejected ? 'text-red-500' : isNeedsApproval ? 'text-amber-700' : 'text-blue-600'}`}>
                        {isApproved ? 'مقبول' : isRejected ? 'مرفوض' : isNeedsApproval ? 'بانتظار الموافقة' : 'قيد المراجعة'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-gray-200 px-4 py-4 shrink-0 flex items-center justify-between bg-gray-50">
              <span className="text-sm font-bold text-gray-600 flex items-center gap-1"><DollarSign size={15} />إجمالي سعر الطلبات المطلوبة</span>
              <span className="text-lg font-black text-[var(--brand)] break-all">{totalRequestedAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })} $</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrdersAdminPage;
