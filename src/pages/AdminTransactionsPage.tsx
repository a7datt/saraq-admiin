import VerifiedBadge from "../components/VerifiedBadge";
import React from "react";
import OptimizedImage from "../components/OptimizedImage";
import { Search, ChevronDown, User, Wallet, CheckCircle, XCircle, AlertTriangle, Clock, DollarSign, X, CalendarDays, History, Share2, Image as ImageIcon, FileText, Table, Receipt, Zap } from "lucide-react";
import { shareOrderAsImage, shareOrderAsPdf, shareOrderAsCsv, buildTransactionShareRows } from "../utils/orderShare";
import { showToast } from "../components/ToastContainer";

function TransactionShareMenu({ t }: { t: any }) {
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
    const rows = buildTransactionShareRows(t);
    const shareData = { orderId: t.id, title: "تفاصيل الدفعة", rows };
    try {
      if (kind === "image") await shareOrderAsImage(shareData);
      else if (kind === "pdf") await shareOrderAsPdf(shareData);
      else shareOrderAsCsv(shareData);
      showToast("تم تجهيز الملف للتنزيل", "success");
    } catch {
      showToast("تعذّرت المشاركة", "error");
    }
  };

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        title="مشاركة الدفعة"
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

const parseCustomFieldsData = (raw: any): Array<{ key?: string; label: string; value: string; required?: boolean; isDefault?: boolean; type?: string }> => {
  try {
    if (!raw) return [];
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
};

type StatusFilter = "pending" | "approved" | "rejected" | "invoices";

const toIsoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const INVOICE_STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending: { label: "معلّقة", cls: "bg-amber-100 text-amber-700" },
  paid: { label: "مقبولة", cls: "bg-green-100 text-green-700" },
  rejected: { label: "مرفوضة", cls: "bg-red-100 text-red-600" },
  cancelled: { label: "ملغاة", cls: "bg-gray-200 text-gray-600" },
  expired: { label: "منتهية", cls: "bg-orange-100 text-orange-600" },
};

const INVOICE_STATUS_TABS: { key: "all" | "pending" | "paid" | "rejected" | "cancelled" | "expired"; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "pending", label: "معلّقة" },
  { key: "paid", label: "مقبولة" },
  { key: "rejected", label: "مرفوضة" },
  { key: "cancelled", label: "ملغاة" },
  { key: "expired", label: "منتهية" },
];

const INVOICE_GATEWAY_LABEL: Record<string, string> = {
  shamcash: "شام كاش",
  syriatelcash: "سيرياتيل كاش",
  binance: "Binance Pay",
  crypto_usdt_trc20: "USDT (TRC20)",
  crypto_usdt_bep20: "USDT (BEP20)",
};

const formatInvoiceCurrency = (amount: number, currency: string) => {
  const amt = Number(amount || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (currency === "USD") return `${amt} $`;
  if (currency === "USDT") return `${amt} USDT`;
  return `${amt} ل.س`;
};

// فواتير نظام التحقق التلقائي (شام كاش/سيرياتيل/العملات الرقمية) تبدأ بـ invoice_number حقيقي من
// المزوّد، بينما سجلات التدقيق التلقائية لـ"نظام كود التحقق" (يشمل Binance الذي لا يملك فواتير
// حقيقية أصلاً) تُخزَّن بمعرّف مصطنع بادئته AUTO- — نميّزها هنا فقط لعرض تسمية أوضح للأدمن.
const isAutoVerifyAuditRow = (inv: any) => typeof inv.invoice_number === "string" && inv.invoice_number.startsWith("AUTO-");

const ShamCashInvoiceRow: React.FC<{
  inv: any; tranId: string; onTranIdChange: (v: string) => void; onApprove: () => void; onReject: () => void; busy: boolean;
}> = ({ inv, tranId, onTranIdChange, onApprove, onReject, busy }) => {
  const badge = INVOICE_STATUS_BADGE[inv.status] || { label: inv.status, cls: "bg-gray-100 text-gray-500" };
  const isAuto = isAutoVerifyAuditRow(inv);
  return (
    <div className="p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-gray-700 truncate">{inv.user_name}{inv.user_identity_verified && <VerifiedBadge />} <span className="text-gray-400 font-normal">#{inv.user_db_id}</span></p>
          <p className="text-[10px] text-gray-400 truncate flex items-center gap-1 flex-wrap">
            {isAuto ? <span className="inline-flex items-center gap-0.5 text-cyan-600 font-bold"><Zap size={10} />كود تحقق تلقائي</span> : <span>فاتورة {inv.invoice_number}</span>}
            <span className="text-gray-300">·</span> {inv.payment_method_name}
            <span className="text-gray-300">·</span> {INVOICE_GATEWAY_LABEL[inv.gateway_code] || inv.gateway_code}
          </p>
          <p className="text-[10px] text-gray-400">{new Date(inv.created_at).toLocaleString("ar-EG")}</p>
        </div>
        <div className="text-left shrink-0">
          <p className="text-sm font-black text-gray-700">{formatInvoiceCurrency(inv.amount, inv.currency)}</p>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
        </div>
      </div>
      {inv.status === "pending" && (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="text"
            placeholder="رقم العملية (اختياري)"
            value={tranId}
            onChange={(e) => onTranIdChange(e.target.value)}
            className="flex-1 bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1.5 text-[11px] outline-none focus:border-[var(--brand)]"
          />
          <button
            disabled={busy}
            onClick={onApprove}
            className="shrink-0 bg-green-500 text-white px-3 py-1.5 rounded-md text-[11px] font-bold flex items-center gap-1 active:scale-95 disabled:opacity-50"
          >
            <CheckCircle size={12} />قبول
          </button>
          <button
            disabled={busy}
            onClick={onReject}
            className="shrink-0 bg-red-100 text-red-600 px-3 py-1.5 rounded-md text-[11px] font-bold flex items-center gap-1 active:scale-95 disabled:opacity-50"
          >
            <XCircle size={12} />رفض
          </button>
        </div>
      )}
    </div>
  );
};

// ─── تبويب "الفواتير والشحن التلقائي" ───
// يجمع في مكان واحد كل عمليات الدفع الآلي لكل البوابات (شام كاش، سيرياتيل كاش، العملات الرقمية،
// Binance Pay) بكل حالاتها: معلّقة/مقبولة/مرفوضة/ملغاة/منتهية — سواء كانت فاتورة حقيقية من
// نظام الفواتير، أو محاولة تحقق من نظام "كود التحقق" المباشر.
const InvoicesAndAutoChargePanel = ({
  adminFetch,
  handleApproveShamcashInvoice,
  handleRejectShamcashInvoice,
  focusInvoiceId,
}: {
  adminFetch: any;
  handleApproveShamcashInvoice: (id: number, tranId?: string) => Promise<{ ok: boolean; error?: string }>;
  handleRejectShamcashInvoice: (id: number) => Promise<{ ok: boolean; error?: string }>;
  focusInvoiceId?: number | string | null;
}) => {
  const [list, setList] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState<"all" | "pending" | "paid" | "rejected" | "cancelled" | "expired">("all");
  const [search, setSearch] = React.useState("");
  const [tranIds, setTranIds] = React.useState<Record<number, string>>({});
  const [busyId, setBusyId] = React.useState<number | null>(null);
  const [visibleCount, setVisibleCount] = React.useState(50);
  const PAGE_SIZE = 50;

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch(`/api/admin/shamcash-invoices?limit=1000`);
      const data = await res.json();
      setList(Array.isArray(data?.invoices) ? data.invoices : []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  React.useEffect(() => { load(); }, [load]);

  const setTranId = (id: number, v: string) => setTranIds(prev => ({ ...prev, [id]: v }));

  const onApprove = async (id: number) => {
    setBusyId(id);
    const result = await handleApproveShamcashInvoice(id, tranIds[id]);
    setBusyId(null);
    if (result.ok) {
      showToast("تم قبول الفاتورة وشحن رصيد المستخدم", "success");
      setTranIds(prev => { const n = { ...prev }; delete n[id]; return n; });
      load();
    } else {
      showToast(result.error || "تعذّر قبول الفاتورة", "error");
    }
  };

  const onReject = async (id: number) => {
    setBusyId(id);
    const result = await handleRejectShamcashInvoice(id);
    setBusyId(null);
    if (result.ok) {
      showToast("تم رفض الفاتورة", "success");
      load();
    } else {
      showToast(result.error || "تعذّر رفض الفاتورة", "error");
    }
  };

  const counts = React.useMemo(() => ({
    all: list.length,
    pending: list.filter(i => i.status === "pending").length,
    paid: list.filter(i => i.status === "paid").length,
    rejected: list.filter(i => i.status === "rejected").length,
    cancelled: list.filter(i => i.status === "cancelled").length,
    expired: list.filter(i => i.status === "expired").length,
  }), [list]);

  const filtered = list.filter(inv => {
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
    const q = search.trim();
    const matchesSearch = !q
      || inv.user_name?.includes(q)
      || inv.user_email?.includes(q)
      || String(inv.invoice_number || "").includes(q)
      || String(inv.user_db_id ?? "").includes(q);
    return matchesStatus && matchesSearch;
  });

  React.useEffect(() => { setVisibleCount(PAGE_SIZE); }, [statusFilter, search]);

  // عند القدوم من "أحدث النشاطات" بفاتورة محددة
  React.useEffect(() => {
    if (focusInvoiceId == null) return;
    const target = list.find((i: any) => String(i.id) === String(focusInvoiceId));
    if (target) setStatusFilter(target.status === "paid" || target.status === "rejected" || target.status === "cancelled" || target.status === "expired" ? target.status : "pending");
  }, [focusInvoiceId, list]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {INVOICE_STATUS_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap border transition-all active:scale-95 ${
              statusFilter === tab.key ? "bg-cyan-600 text-white border-transparent" : "bg-white border-gray-100 text-gray-500"
            }`}
          >
            {tab.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusFilter === tab.key ? "bg-white/20" : "bg-gray-100 text-gray-500"}`}>
              {counts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      <div className="relative">
        <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="بحث بالاسم، البريد، رقم الفاتورة، أو رقم الدخول..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white border border-gray-100 rounded-lg pr-9 pl-3 py-2.5 text-xs outline-none shadow-sm"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
        {loading && <p className="text-center text-gray-400 text-xs py-8">جاري التحميل...</p>}
        {!loading && filtered.slice(0, visibleCount).map((inv) => (
          <ShamCashInvoiceRow
            key={inv.id}
            inv={inv}
            tranId={tranIds[inv.id] || ""}
            onTranIdChange={(v) => setTranId(inv.id, v)}
            onApprove={() => onApprove(inv.id)}
            onReject={() => onReject(inv.id)}
            busy={busyId === inv.id}
          />
        ))}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Receipt size={36} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">لا توجد فواتير مطابقة</p>
          </div>
        )}
      </div>

      {filtered.length > visibleCount && (
        <div className="flex flex-col items-center gap-2 pt-1 pb-1">
          <button
            onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
            className="w-full sm:w-auto px-6 py-2.5 rounded-md text-xs font-bold bg-[var(--brand)] text-white active:scale-[0.97] transition-transform"
          >
            عرض المزيد
          </button>
          <p className="text-[11px] text-gray-400">
            تم عرض {Math.min(visibleCount, filtered.length)} من {filtered.length}
          </p>
        </div>
      )}
    </div>
  );
};


const AdminTransactionsPage = ({adminTransactions, transSearch, setTransSearch, handleApproveTransaction, handleRejectTransaction, adminFetch, handleApproveShamcashInvoice, handleRejectShamcashInvoice, focusId, clearFocusId}: any) => {
  const [expandedId, setExpandedId] = React.useState<number|null>(null);
  const [customAmounts, setCustomAmounts] = React.useState<Record<number,string>>({});
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("pending");
  const [showLedger, setShowLedger] = React.useState(false);
  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const hasDateFilter = !!(dateFrom || dateTo);
  const focusRef = React.useRef<HTMLDivElement | null>(null);

  const list: any[] = Array.isArray(adminTransactions) ? adminTransactions : [];

  const pendingCount = list.filter(t => t.status === "pending").length;
  const approvedCount = list.filter(t => t.status === "approved").length;
  const rejectedCount = list.filter(t => t.status === "rejected").length;
  const totalApprovedAmount = list
    .filter(t => t.status === "approved")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const clearDateFilter = () => { setDateFrom(""); setDateTo(""); };

  const TRANS_PAGE_SIZE = 50;
  const [transVisibleCount, setTransVisibleCount] = React.useState(TRANS_PAGE_SIZE);

  const filteredTrans = list.filter(t => {
    const q = transSearch?.trim();
    const matchesSearch = !q
      || t.user_name?.includes(q)
      || t.user_email?.includes(q)
      || String(t.id).includes(q)
      || String(t.tx_number || "").includes(q)
      || String(t.user_db_id ?? t.user_id ?? "").includes(q);
    const matchesStatus = statusFilter === "all" as any || t.status === statusFilter;
    const matchesDate = (() => {
      if (!dateFrom && !dateTo) return true;
      const iso = toIsoDate(new Date(t.created_at));
      if (dateFrom && iso < dateFrom) return false;
      if (dateTo && iso > dateTo) return false;
      return true;
    })();
    return matchesSearch && matchesStatus && matchesDate;
  });

  React.useEffect(() => {
    setTransVisibleCount(TRANS_PAGE_SIZE);
  }, [statusFilter, transSearch, dateFrom, dateTo]);

  // ── عند القدوم من "أحدث النشاطات" بدفعة محددة: انتقل تلقائياً لتبويب حالتها الفعلية وامسح الفلاتر التي قد تخفيها ──
  React.useEffect(() => {
    if (focusId == null) return;
    const target = list.find((t: any) => String(t.id) === String(focusId));
    if (target && (target.status === "pending" || target.status === "approved" || target.status === "rejected")) {
      setStatusFilter(target.status as StatusFilter);
    }
    setDateFrom("");
    setDateTo("");
    if (setTransSearch) setTransSearch("");
  }, [focusId, list]);

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

  const statusTabs: { key: StatusFilter; label: string; count: number | null; activeClass: string }[] = [
    { key: "pending", label: "قيد التحقق", count: pendingCount, activeClass: "bg-amber-500 text-white border-transparent" },
    { key: "approved", label: "مكتملة", count: approvedCount, activeClass: "bg-green-500 text-white border-transparent" },
    { key: "rejected", label: "مرفوضة", count: rejectedCount, activeClass: "bg-red-500 text-white border-transparent" },
    { key: "invoices", label: "الفواتير والشحن التلقائي", count: null, activeClass: "bg-cyan-600 text-white border-transparent" },
  ];
  const isInvoicesTab = statusFilter === "invoices";

  return (

  <div className="space-y-4">
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
      <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center text-green-600 shrink-0">
        <DollarSign size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-gray-400 font-bold">إجمالي الأرصدة المقبولة</p>
        <p className="text-lg font-black text-green-600 break-all">{totalApprovedAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })} $</p>
      </div>
      <button
        onClick={() => setShowLedger(true)}
        className="shrink-0 bg-green-50 text-green-600 p-2 rounded-lg active:scale-95"
        title="سجل المدفوعات"
      >
        <History size={16} />
      </button>
    </div>

    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
      {statusTabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => setStatusFilter(tab.key)}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap border transition-all active:scale-95 ${
            statusFilter === tab.key ? tab.activeClass : "bg-white border-gray-100 text-gray-500"
          }`}
        >
          {tab.key === "pending" && <Clock size={13} />}
          {tab.key === "approved" && <CheckCircle size={13} />}
          {tab.key === "rejected" && <XCircle size={13} />}
          {tab.key === "invoices" && <Receipt size={13} />}
          {tab.label}
          {tab.count !== null && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              statusFilter === tab.key ? "bg-white/20" : "bg-gray-100 text-gray-500"
            }`}>{tab.count}</span>
          )}
        </button>
      ))}
      {!isInvoicesTab && (
        <button
          onClick={() => setShowDatePicker(v => !v)}
          className={`flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs font-bold border shrink-0 active:scale-95 ${
            hasDateFilter ? "bg-brand text-white border-transparent" : "bg-white border-gray-100 text-gray-500"
          }`}
        >
          <CalendarDays size={14} />
        </button>
      )}
    </div>

    {!isInvoicesTab && showDatePicker && (
      <div className="bg-white border border-gray-100 rounded-lg p-3 shadow-sm flex items-center gap-2">
        <div className="flex-1 space-y-1">
          <label className="text-[10px] font-bold text-gray-400">من</label>
          <input type="date" value={dateFrom} max={dateTo || undefined} onChange={e => setDateFrom(e.target.value)}
            className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand" />
        </div>
        <div className="flex-1 space-y-1">
          <label className="text-[10px] font-bold text-gray-400">حتى</label>
          <input type="date" value={dateTo} min={dateFrom || undefined} onChange={e => setDateTo(e.target.value)}
            className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand" />
        </div>
        {hasDateFilter && (
          <button onClick={clearDateFilter} className="self-end p-2 mb-0.5 bg-gray-100 rounded-lg text-gray-500 active:scale-95 shrink-0">
            <X size={16} />
          </button>
        )}
      </div>
    )}

    {isInvoicesTab ? (
      <InvoicesAndAutoChargePanel
        adminFetch={adminFetch}
        handleApproveShamcashInvoice={handleApproveShamcashInvoice}
        handleRejectShamcashInvoice={handleRejectShamcashInvoice}
      />
    ) : (
    <>
    <div className="relative">
      <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"/>
      <input type="text" placeholder="بحث بالاسم، البريد، رقم العملية، أو رقم الدخول..." value={transSearch} onChange={e => setTransSearch(e.target.value)} className="w-full bg-white border border-gray-100 rounded-lg pr-9 pl-3 py-2.5 text-xs outline-none shadow-sm"/>
    </div>

    <div className="space-y-3">
      {filteredTrans.slice(0, transVisibleCount).map(t => {
        const isExpanded = expandedId === t.id;
        const customAmt = customAmounts[t.id] ?? "";
        const isFocused = focusId != null && String(focusId) === String(t.id);
        return (
        <div key={t.id} ref={isFocused ? focusRef : undefined} className={`bg-white rounded-lg border shadow-sm overflow-hidden transition-shadow ${isFocused ? "border-green-400 ring-2 ring-green-300" : "border-gray-100"}`}>

          <div className="px-4 pt-4 pb-3 flex items-center gap-3 border-b border-gray-50">
            <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
              {t.user_avatar
                ? <OptimizedImage src={t.user_avatar} width={80} height={80} className="w-full h-full object-cover"/>
                : <User size={18} className="text-gray-400"/>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm text-gray-800 truncate">{t.user_name || "—"}{t.user_identity_verified && <VerifiedBadge />}</p>
              <p className="text-[10px] text-gray-400 truncate">{t.user_email || "—"}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-[10px] text-gray-400">#{t.user_db_id || t.user_id}</span>
                {t.user_phone && t.user_phone !== "—" && <span className="text-[10px] text-gray-400">{t.user_phone}</span>}
              </div>
            </div>
            <div className="flex-shrink-0 text-left flex items-start gap-2">
              <div>
                <p className="text-sm font-black text-green-600">{(t.amount||0).toFixed(3)} $</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.status==='approved'?'bg-green-100 text-green-700':t.status==='rejected'?'bg-red-100 text-red-600':'bg-amber-100 text-amber-700'}`}>
                  {t.status==='approved'?'مكتملة':t.status==='rejected'?'مرفوضة':'قيد التحقق'}
                </span>
              </div>
              <TransactionShareMenu t={t} />
            </div>
          </div>

          <div className="px-4 py-3 flex items-center justify-between cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : t.id)}>
            <div>
              <p className="font-bold text-xs text-gray-700">TX{t.id} · {t.payment_method_name || "—"}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{new Date(t.created_at).toLocaleString("ar-EG")}</p>
              {t.tx_number && <p className="text-[10px] text-gray-400 mt-0.5">رقم العملية: {t.tx_number}</p>}
            </div>
            <ChevronDown size={16} className={`text-gray-400 transition-transform flex-shrink-0 ${isExpanded?'rotate-180':''}`}/>
          </div>

          {isExpanded && (
            <div className="border-t border-gray-50 bg-gray-50/50 px-4 pb-4 pt-3 space-y-3">
              {t.bonus_type && t.bonus_percent ? (() => {
                // في "قيد التحقق"/"مرفوضة" لم تُطبَّق العمولة بعد على amount — فهو نفسه المبلغ الأصلي،
                // ونحسب "المتوقع بعد العمولة" هنا للعرض فقط. أما في "مكتملة" فالعمولة مُطبَّقة فعلياً:
                // amount = بعد العمولة، original_amount = قبلها (كما خزّنها مسار الموافقة).
                const isApproved = t.status === "approved";
                const pct = Number(t.bonus_percent) || 0;
                const baseAmount = isApproved ? Number(t.original_amount ?? t.amount) : Number(t.amount || 0);
                const finalAmount = isApproved
                  ? Number(t.amount || 0)
                  : (t.bonus_type === "bonus" ? baseAmount * (1 + pct / 100) : baseAmount * (1 - pct / 100));
                const diff = Math.abs(finalAmount - baseAmount);
                return (
                  <div className={`rounded-lg p-3 border ${t.bonus_type === "bonus" ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"}`}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-500 font-bold">المبلغ الأصلي</span>
                      <span className="font-bold text-gray-700">{baseAmount.toFixed(3)} $</span>
                    </div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className={`font-bold ${t.bonus_type === "bonus" ? "text-green-600" : "text-red-500"}`}>
                        {t.bonus_type === "bonus" ? `🎁 بونص ${t.bonus_percent}%` : `⚠️ عمولة ${t.bonus_percent}%`}
                      </span>
                      <span className={`font-bold ${t.bonus_type === "bonus" ? "text-green-600" : "text-red-500"}`}>
                        {t.bonus_type === "bonus" ? "+" : "-"}{diff.toFixed(3)} $
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-black/5">
                      <span className="text-gray-600 font-bold">{isApproved ? "المبلغ الذي تم شحنه فعلياً" : "المبلغ الذي سيتم شحنه فعلياً"}</span>
                      <span className="font-black text-green-600">{finalAmount.toFixed(3)} $</span>
                    </div>
                  </div>
                );
              })() : null}
              {(() => {
                const fields = parseCustomFieldsData(t.custom_fields_data);
                if (fields.length > 0) {
                  return fields.filter(f => (f.value || "").trim()).map((f, idx) => (
                    f.type === "image" ? (
                      <div key={idx}>
                        <p className="text-[9px] text-gray-400 font-bold mb-1">{f.label}</p>
                        <OptimizedImage src={f.value} width={700} quality={85} className="w-full h-44 object-cover rounded-lg cursor-pointer border border-gray-100" onClick={() => window.open(f.value, '_blank')}/>
                      </div>
                    ) : (
                      <div key={idx} className="bg-white rounded-lg p-2.5 border border-gray-100">
                        <p className="text-[9px] text-gray-400 font-bold mb-0.5">{f.label}</p>
                        <p className="text-xs text-gray-700">{f.value}</p>
                      </div>
                    )
                  ));
                }
                return (
                  <>
                    {t.receipt_image_url && (
                      <div>
                        <p className="text-[9px] text-gray-400 font-bold mb-1">صورة الإيصال</p>
                        <OptimizedImage src={t.receipt_image_url} width={700} quality={85} className="w-full h-44 object-cover rounded-lg cursor-pointer border border-gray-100" onClick={() => window.open(t.receipt_image_url, '_blank')}/>
                      </div>
                    )}
                    {t.note && (
                      <div className="bg-white rounded-lg p-2.5 border border-gray-100">
                        <p className="text-[9px] text-gray-400 font-bold mb-0.5">الملاحظة</p>
                        <p className="text-xs text-gray-700">{t.note.replace(/\[sam-api\]\s*-?\s*/gi, "")}</p>
                      </div>
                    )}
                  </>
                );
              })()}

              {t.status === 'pending' && (() => {
                // نفس حساب "المبلغ الذي سيتم شحنه فعلياً" أعلاه، بعد تطبيق العمولة/البونص إن وُجدت،
                // لأن هذا هو المبلغ الذي سيُعتمد فعلياً إن تُرك حقل التعديل فارغاً
                const pct = Number(t.bonus_percent) || 0;
                const defaultFinalAmount = (t.bonus_type && t.bonus_percent)
                  ? (t.bonus_type === "bonus" ? Number(t.amount||0) * (1 + pct/100) : Number(t.amount||0) * (1 - pct/100))
                  : Number(t.amount||0);
                return (
                <div className="space-y-2">
                  <div className="bg-white rounded-lg border border-gray-100 p-3">
                    <p className="text-[10px] text-gray-400 font-bold mb-1.5">تعديل المبلغ (اختياري)</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number" min="0.01" step="0.01"
                        placeholder={`الافتراضي: ${defaultFinalAmount.toFixed(3)}`}
                        value={customAmt}
                        onChange={e => setCustomAmounts(prev => ({...prev, [t.id]: e.target.value}))}
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-xs outline-none focus:border-[var(--brand)]"
                      />
                      <span className="text-xs text-gray-400 font-bold">$</span>
                    </div>
                    {customAmt && parseFloat(customAmt) > 0 ? (
                      <p className="text-[10px] text-amber-600 mt-1"><AlertTriangle size={12} className="inline mr-1" />سيتم إضافة {parseFloat(customAmt).toFixed(3)}$ (هذا المبلغ لن تُطبَّق عليه العمولة تلقائياً، فتأكد أنه شامل ما تريد) بدلاً من {defaultFinalAmount.toFixed(3)}$</p>
                    ) : (t.bonus_type && t.bonus_percent) ? (
                      <p className="text-[10px] text-gray-400 mt-1">اترك الحقل فارغاً لاعتماد {defaultFinalAmount.toFixed(3)}$ تلقائياً (بعد تطبيق {t.bonus_type === "bonus" ? "البونص" : "العمولة"} {t.bonus_percent}%)</p>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const amt = customAmt && parseFloat(customAmt) > 0 ? parseFloat(customAmt) : undefined;
                        handleApproveTransaction(t.id, amt);
                        setCustomAmounts(prev => { const n={...prev}; delete n[t.id]; return n; });
                      }}
                      className="flex-1 bg-green-500 text-white py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 active:scale-95">
                      <CheckCircle size={13}/>قبول{customAmt && parseFloat(customAmt)>0 ? ` (${parseFloat(customAmt).toFixed(3)}$)` : ""}
                    </button>
                    <button onClick={() => handleRejectTransaction(t.id)} className="flex-1 bg-red-100 text-red-600 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 active:scale-95">
                      <XCircle size={13}/>رفض
                    </button>
                  </div>
                </div>
                );
              })()}
            </div>
          )}
        </div>
        );
      })}
      {filteredTrans.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Wallet size={40} className="mx-auto mb-3 opacity-20"/>
          <p>لا توجد دفعات مطابقة</p>
        </div>
      )}

      {filteredTrans.length > transVisibleCount && (
        <div className="flex flex-col items-center gap-2 pt-2 pb-1">
          <button
            onClick={() => setTransVisibleCount(c => c + TRANS_PAGE_SIZE)}
            className="w-full sm:w-auto px-6 py-2.5 rounded-md text-xs font-bold bg-[var(--brand)] text-white active:scale-[0.97] transition-transform"
          >
            عرض المزيد
          </button>
          <p className="text-[11px] text-gray-400">
            تم عرض {Math.min(transVisibleCount, filteredTrans.length)} من {filteredTrans.length} — المتبقي {filteredTrans.length - Math.min(transVisibleCount, filteredTrans.length)}
          </p>
        </div>
      )}
    </div>
    </>
    )}

    {showLedger && (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowLedger(false)}>
        <div
          onClick={e => e.stopPropagation()}
          className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[85vh] flex flex-col shadow-2xl"
        >
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center text-green-600"><History size={18} /></div>
              <h3 className="font-bold text-lg text-gray-800">سجل المدفوعات المقبولة</h3>
            </div>
            <button onClick={() => setShowLedger(false)} className="p-2 bg-gray-100 rounded-full active:scale-95">
              <X size={18} className="text-gray-600" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {list.filter(t => t.status === 'approved').length === 0 && (
              <p className="text-center text-gray-400 py-10 text-sm">لا توجد مدفوعات مقبولة</p>
            )}
            {list.filter(t => t.status === 'approved').map(t => (
              <div key={t.id} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-700 truncate">{t.user_name || "—"}{t.user_identity_verified && <VerifiedBadge />}</p>
                  <p className="text-[10px] text-gray-400">TX{t.id}{t.tx_number ? ` · ${t.tx_number}` : ""} · {new Date(t.created_at).toLocaleDateString("ar-EG")}</p>
                </div>
                <p className="text-sm font-black text-green-600 shrink-0">{Number(t.amount || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })} $</p>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 px-4 py-4 shrink-0 flex items-center justify-between bg-gray-50">
            <span className="text-sm font-bold text-gray-600">إجمالي المدفوعات</span>
            <span className="text-lg font-black text-green-600 break-all">{totalApprovedAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })} $</span>
          </div>
        </div>
      </div>
    )}
  </div>

  );
};

export default AdminTransactionsPage;
