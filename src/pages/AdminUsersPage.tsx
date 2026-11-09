import React from "react";
import OptimizedImage from "../components/OptimizedImage";
import {
  Users, Search, X, Crown, Lock, Trash2,
  Bell, MessageCircle, Wallet, ShoppingBag, Send,
  User, Mail, Phone, Calendar, Share2, ChevronDown,
  ChevronUp, SlidersHorizontal, Star, MoreHorizontal, ChevronLeft,
  Percent, Power, PowerOff, History, ArrowDownCircle, ArrowUpCircle,
} from "lucide-react";

interface AdminUsersPageProps {
  adminUsers: any[];
  adminOrders: any[];
  adminTransactions: any[];
  fetchAdminUsers: () => void;
  handleToggleVip: (id: any, isVip: boolean) => void;
  handleBlockUser: (id: any, isCurrentlyBanned?: boolean) => void;
  handleDeleteUser: (id: any) => void;
  handleSendNotification: (userId: any, title: string, body: string) => Promise<void>;
  onOpenChatWithUser: (u: any) => void;
  adminFetch: (url: string, options?: RequestInit) => Promise<Response>;
  focusId?: any;
  clearFocusId?: () => void;
  setAdminTab?: (tab: string) => void;
  setFocusTarget?: (target: any) => void;
}

const AdminUsersPage = ({
  adminUsers, adminOrders, adminTransactions,
  fetchAdminUsers, handleToggleVip, handleBlockUser, handleDeleteUser,
  handleSendNotification, onOpenChatWithUser, adminFetch,
  focusId, clearFocusId, setAdminTab, setFocusTarget,
}: AdminUsersPageProps) => {
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
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<"all" | "vip" | "banned">("all");
  const [showDateFilter, setShowDateFilter] = React.useState(false);
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [sortOrder, setSortOrder] = React.useState<"newest" | "oldest">("newest");
  const hasDateFilter = !!(dateFrom || dateTo);
  const toIsoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const clearDateFilter = () => { setDateFrom(""); setDateTo(""); setSortOrder("newest"); };
  const [expandedId, setExpandedId] = React.useState<number | null>(null);
  const [moreOpenId, setMoreOpenId] = React.useState<number | null>(null);
  const [userDetails, setUserDetails] = React.useState<Record<number, any>>({});
  const [loadingDetails, setLoadingDetails] = React.useState<number | null>(null);
  const [balanceEdit, setBalanceEdit] = React.useState<number | null>(null);
  const [balanceVal, setBalanceVal] = React.useState("");
  const [notifTarget, setNotifTarget] = React.useState<number | null>(null);
  const [notifTitle, setNotifTitle] = React.useState("");
  const [notifBody, setNotifBody] = React.useState("");
  const [ordersModal, setOrdersModal] = React.useState<any>(null);
  const [txModal, setTxModal] = React.useState<any>(null);
  const [ordersList, setOrdersList] = React.useState<any[]>([]);
  const [txList, setTxList] = React.useState<any[]>([]);
  const [modalLoading, setModalLoading] = React.useState(false);
  const [balanceLogModal, setBalanceLogModal] = React.useState<any>(null);
  const [balanceLogData, setBalanceLogData] = React.useState<any>(null);
  const [balanceLogLoading, setBalanceLogLoading] = React.useState(false);

  // إعدادات الـ API الخاصة بالمستخدم (نسبة خصم مخصصة + تفعيل/تعطيل)
  const [apiDiscountPanelId, setApiDiscountPanelId] = React.useState<number | null>(null);
  const [apiTokenInfo, setApiTokenInfo] = React.useState<Record<number, any>>({});
  const [apiLoading, setApiLoading] = React.useState<number | null>(null);
  const [apiDiscountVal, setApiDiscountVal] = React.useState("");
  const [apiSaving, setApiSaving] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);

  const vipCount = adminUsers.filter(u => u.is_vip).length;
  const bannedCount = adminUsers.filter(u => u.is_banned).length;

  const filtered = React.useMemo(() => {
    let list = adminUsers;
    if (filter === "vip") list = list.filter(u => u.is_vip);
    else if (filter === "banned") list = list.filter(u => u.is_banned);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(u =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        String(u.id).includes(q) ||
        u.phone?.includes(q)
      );
    }
    if (dateFrom || dateTo) {
      list = list.filter(u => {
        if (!u.created_at) return false;
        const iso = toIsoDate(new Date(u.created_at));
        if (dateFrom && iso < dateFrom) return false;
        if (dateTo && iso > dateTo) return false;
        return true;
      });
    }
    list = [...list].sort((a, b) => {
      const diff = new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      return sortOrder === "newest" ? diff : -diff;
    });
    return list;
  }, [adminUsers, filter, search, dateFrom, dateTo, sortOrder]);

  const loadDetails = async (uid: number) => {
    if (userDetails[uid]) return;
    setLoadingDetails(uid);
    try {
      const [statsRes, ordersRes, txRes] = await Promise.all([
        adminFetch(`/api/admin/users/${uid}/details`),
        adminFetch(`/api/admin/users/${uid}/orders-count`),
        adminFetch(`/api/admin/users/${uid}/transactions-count`),
      ]);
      const stats = statsRes.ok ? await statsRes.json() : {};
      const ordersData = ordersRes.ok ? await ordersRes.json() : {};
      const txData = txRes.ok ? await txRes.json() : {};
      setUserDetails(prev => ({ ...prev, [uid]: { ...stats, ...ordersData, ...txData } }));
    } catch {}
    setLoadingDetails(null);
  };

  const toggleExpand = (uid: number) => {
    if (expandedId === uid) { setExpandedId(null); return; }
    setExpandedId(uid);
    loadDetails(uid);
  };

  const saveBalance = async (uid: number) => {
    const val = parseFloat(balanceVal);
    if (isNaN(val)) return;
    await adminFetch(`/api/admin/users/${uid}/balance`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: val }),
    });
    fetchAdminUsers();
    setBalanceEdit(null);
  };

  const loadApiToken = async (uid: number) => {
    if (apiTokenInfo[uid]) {
      setApiDiscountVal(apiTokenInfo[uid]?.custom_discount_percent != null ? String(apiTokenInfo[uid].custom_discount_percent) : "");
      return;
    }
    setApiLoading(uid);
    try {
      const res = await adminFetch(`/api/admin/users/${uid}/api-token`);
      const data = res.ok ? await res.json() : { exists: false };
      setApiTokenInfo(prev => ({ ...prev, [uid]: data }));
      setApiDiscountVal(data?.custom_discount_percent != null ? String(data.custom_discount_percent) : "");
    } catch {
      setApiTokenInfo(prev => ({ ...prev, [uid]: { exists: false } }));
    }
    setApiLoading(null);
  };

  const saveApiDiscount = async (uid: number) => {
    const raw = apiDiscountVal.trim();
    const payload: any = {};
    if (raw === "") {
      payload.custom_discount_percent = null;
    } else {
      const v = parseFloat(raw);
      if (isNaN(v) || v < 0 || v >= 100) return;
      payload.custom_discount_percent = v;
    }
    setApiSaving(true);
    setApiError(null);
    try {
      const res = await adminFetch(`/api/admin/users/${uid}/api-token`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        setApiTokenInfo(prev => ({ ...prev, [uid]: { ...prev[uid], ...data } }));
      } else {
        const err = await res.json().catch(() => ({}));
        setApiError(err?.error || "تعذر حفظ نسبة الخصم");
      }
    } catch {
      setApiError("تعذر الاتصال بالخادم");
    }
    setApiSaving(false);
  };

  const toggleApiEnabled = async (uid: number) => {
    setApiSaving(true);
    setApiError(null);
    try {
      let info = apiTokenInfo[uid];
      if (!info) {
        const infoRes = await adminFetch(`/api/admin/users/${uid}/api-token`);
        info = infoRes.ok ? await infoRes.json() : { exists: false };
        setApiTokenInfo(prev => ({ ...prev, [uid]: info }));
      }
      if (!info?.exists) { setApiSaving(false); return; }
      const res = await adminFetch(`/api/admin/users/${uid}/api-token`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !info.enabled }),
      });
      if (res.ok) {
        const data = await res.json();
        setApiTokenInfo(prev => ({ ...prev, [uid]: { ...prev[uid], ...data } }));
      } else {
        const err = await res.json().catch(() => ({}));
        setApiError(err?.error || "تعذر تحديث حالة API");
      }
    } catch {
      setApiError("تعذر الاتصال بالخادم");
    }
    setApiSaving(false);
  };

  const openOrders = async (u: any) => {
    setOrdersModal(u); setModalLoading(true);
    try {
      const res = await adminFetch(`/api/admin/users/${u.id}/orders`);
      setOrdersList(res.ok ? await res.json() : []);
    } catch { setOrdersList([]); }
    setModalLoading(false);
  };

  const openTx = async (u: any) => {
    setTxModal(u); setModalLoading(true);
    try {
      const res = await adminFetch(`/api/admin/users/${u.id}/transactions`);
      setTxList(res.ok ? await res.json() : []);
    } catch { setTxList([]); }
    setModalLoading(false);
  };

  const openBalanceLog = async (u: any) => {
    setBalanceLogModal(u); setBalanceLogLoading(true); setBalanceLogData(null);
    try {
      const res = await adminFetch(`/api/admin/users/${u.id}/balance-log`);
      setBalanceLogData(res.ok ? await res.json() : { total_credited: 0, total_debited: 0, net: 0, entries: [] });
    } catch { setBalanceLogData({ total_credited: 0, total_debited: 0, net: 0, entries: [] }); }
    setBalanceLogLoading(false);
  };

  const statusBadge = (u: any) => {
    if (u.is_banned) return <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-black">محظور</span>;
    if (u.is_vip) return <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-black flex items-center gap-0.5"><Star size={8}/>VIP</span>;
    return null;
  };

  return (
    <div className="space-y-3" dir="rtl">

      {/* Filter Tabs — 3 only: الكل / VIP / محظور */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "الكل", val: adminUsers.length, key: "all", activeColor: "bg-purple-500" },
          { label: "VIP", val: vipCount, key: "vip", activeColor: "bg-amber-500" },
          { label: "محظور", val: bannedCount, key: "banned", activeColor: "bg-red-500" },
        ].map(s => (
          <button key={s.key} onClick={() => setFilter(s.key as any)}
            className={`rounded-md p-2.5 text-center transition-all active:scale-95 border ${filter === s.key ? s.activeColor + " text-white border-transparent shadow-sm" : "bg-white border-gray-100 text-gray-700"}`}>
            <p className={`text-base font-black ${filter === s.key ? "text-white" : "text-gray-800"}`}>{s.val}</p>
            <p className={`text-[9px] font-bold mt-0.5 ${filter === s.key ? "text-white/80" : "text-gray-400"}`}>{s.label}</p>
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="بحث بالاسم، الإيميل، الرقم أو ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white border border-gray-100 rounded-md pr-9 pl-3 py-2.5 text-xs outline-none shadow-sm"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="relative">
          <button onClick={() => setShowDateFilter(v => !v)}
            className={`w-10 h-10 rounded-md flex items-center justify-center shadow-sm active:scale-95 border relative ${hasDateFilter || sortOrder !== "newest" ? "bg-purple-500 text-white border-transparent" : "bg-white border-gray-100 text-gray-500"}`}>
            <SlidersHorizontal size={15} />
            {hasDateFilter && <span className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white" />}
          </button>
          {showDateFilter && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowDateFilter(false)} />
              <div className="absolute left-0 top-12 z-40 w-64 bg-white rounded-md border border-gray-200 shadow-lg p-3 space-y-3">
                <p className="text-xs font-bold text-gray-700">فلترة حسب تاريخ الانضمام</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold">من</label>
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                      className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold">إلى</label>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                      className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs outline-none" />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold mb-1">الترتيب</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setSortOrder("newest")}
                      className={`py-1.5 rounded-md text-[11px] font-bold border ${sortOrder === "newest" ? "bg-purple-500 text-white border-transparent" : "bg-gray-50 text-gray-600 border-gray-200"}`}>الأحدث أولاً</button>
                    <button onClick={() => setSortOrder("oldest")}
                      className={`py-1.5 rounded-md text-[11px] font-bold border ${sortOrder === "oldest" ? "bg-purple-500 text-white border-transparent" : "bg-gray-50 text-gray-600 border-gray-200"}`}>الأقدم أولاً</button>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button onClick={() => { clearDateFilter(); }}
                    className="flex-1 py-1.5 rounded-md text-[11px] font-bold bg-gray-50 text-gray-500 border border-gray-200">مسح الفلاتر</button>
                  <button onClick={() => setShowDateFilter(false)}
                    className="flex-1 py-1.5 rounded-md text-[11px] font-bold bg-purple-500 text-white">تطبيق</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-gray-400 px-0.5">{filtered.length} مستخدم</p>

      {/* Users List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Users size={40} className="mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 text-sm font-medium">لا يوجد مستخدمين</p>
          <button onClick={fetchAdminUsers} className="mt-3 text-xs text-[var(--brand)] font-bold">تحديث</button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((u: any) => {
            const isExpanded = expandedId === u.id;
            const isMoreOpen = moreOpenId === u.id;
            const details = userDetails[u.id];
            const isLoadingThis = loadingDetails === u.id;

            const isFocused = focusId != null && String(focusId) === String(u.id);
            return (
              <div key={u.id} ref={isFocused ? focusRef : undefined} className={`bg-white rounded-lg border shadow-sm overflow-hidden transition-shadow ${isFocused ? "border-purple-400 ring-2 ring-purple-300" : "border-gray-100"}`}>

                {/* User Row */}
                <div className="p-3 flex items-center gap-2.5">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-md bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                      {u.avatar_url
                        ? <OptimizedImage src={u.avatar_url} width={88} height={88} className="w-full h-full object-cover"/>
                        : <User size={18} className="text-gray-400"/>
                      }
                    </div>
                    {u.is_vip && (
                      <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-amber-400 rounded-sm flex items-center justify-center border border-white">
                        <Crown size={8} className="text-white"/>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-sm text-gray-800 truncate">{u.name}</p>
                      {statusBadge(u)}
                    </div>
                    <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-gray-400">#{u.id}</span>
                      <span className="text-[10px] font-bold text-green-600">{parseFloat(u.balance || 0).toFixed(3)} $</span>
                    </div>
                  </div>

                  {/* Expand arrow */}
                  <button onClick={() => toggleExpand(u.id)}
                    className={`p-1.5 rounded-md transition-all active:scale-90 ${isExpanded ? "bg-purple-500 text-white" : "bg-gray-50 text-gray-500"}`}>
                    {isExpanded ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}
                  </button>
                </div>

                {/* Primary Action Buttons: دردشة + رصيد + المزيد */}
                <div className="border-t border-gray-50 px-3 py-2 flex items-center gap-2">
                  {/* دردشة */}
                  <button onClick={() => onOpenChatWithUser(u)}
                    className="flex-1 flex items-center justify-center gap-1 bg-indigo-50 text-indigo-700 py-2 rounded-md text-[11px] font-bold active:scale-95 border border-indigo-100">
                    <MessageCircle size={12}/> دردشة
                  </button>
                  {/* رصيد */}
                  <button onClick={() => { setBalanceEdit(balanceEdit === u.id ? null : u.id); setBalanceVal(u.balance?.toString() || "0"); setMoreOpenId(null); setNotifTarget(null); }}
                    className="flex-1 flex items-center justify-center gap-1 bg-green-50 text-green-700 py-2 rounded-md text-[11px] font-bold active:scale-95 border border-green-100">
                    <Wallet size={12}/> رصيد
                  </button>
                  {/* المزيد */}
                  <button onClick={() => { const opening = !isMoreOpen; setMoreOpenId(isMoreOpen ? null : u.id); setBalanceEdit(null); setNotifTarget(null); if (opening) loadApiToken(u.id); }}
                    className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-md text-[11px] font-bold active:scale-95 border transition-all ${isMoreOpen ? "bg-gray-700 text-white border-gray-700" : "bg-gray-50 text-gray-600 border-gray-200"}`}>
                    <MoreHorizontal size={12}/> المزيد
                  </button>
                </div>

                {/* Balance Editor */}
                {balanceEdit === u.id && (
                  <div className="border-t border-green-100 bg-green-50/50 px-3 py-2.5">
                    <p className="text-[11px] font-bold text-green-700 mb-2">تعديل رصيد {u.name}</p>
                    <div className="flex gap-2">
                      <input type="number" value={balanceVal} onChange={e => setBalanceVal(e.target.value)}
                        className="flex-1 p-2 bg-white rounded-md text-xs outline-none border border-green-200 text-center font-bold" placeholder="0.00"/>
                      <button onClick={() => saveBalance(u.id)} className="bg-green-600 text-white px-3 rounded-md text-xs font-bold active:scale-95">حفظ</button>
                      <button onClick={() => setBalanceEdit(null)} className="bg-gray-100 text-gray-600 px-2.5 rounded-md text-xs font-bold active:scale-95"><X size={12}/></button>
                    </div>
                  </div>
                )}

                {/* Extra Buttons (visible when المزيد clicked) */}
                {isMoreOpen && (
                  <div className="border-t border-gray-100 px-3 py-2.5 grid grid-cols-2 gap-2">
                    <button onClick={() => handleToggleVip(u.id, u.is_vip)}
                      className={`flex items-center justify-center gap-1 py-2 rounded-md text-[11px] font-bold active:scale-95 border ${u.is_vip ? "bg-gray-100 text-gray-600 border-gray-200" : "bg-amber-50 text-amber-700 border-amber-100"}`}>
                      <Crown size={11}/> {u.is_vip ? "إلغاء VIP" : "ترقية VIP"}
                    </button>
                    <button onClick={() => { setNotifTarget(notifTarget === u.id ? null : u.id); setNotifTitle(""); setNotifBody(""); }}
                      className="flex items-center justify-center gap-1 bg-blue-50 text-blue-700 py-2 rounded-md text-[11px] font-bold active:scale-95 border border-blue-100">
                      <Bell size={11}/> إرسال إشعار
                    </button>
                    <button onClick={() => handleBlockUser(u.id, u.is_banned)}
                      className="flex items-center justify-center gap-1 bg-orange-50 text-orange-700 py-2 rounded-md text-[11px] font-bold active:scale-95 border border-orange-100">
                      <Lock size={11}/> {u.is_banned ? "رفع الحظر" : "حظر المستخدم"}
                    </button>
                    <button onClick={() => handleDeleteUser(u.id)}
                      className="flex items-center justify-center gap-1 bg-red-50 text-red-600 py-2 rounded-md text-[11px] font-bold active:scale-95 border border-red-100">
                      <Trash2 size={11}/> حذف المستخدم
                    </button>
                    <button onClick={() => { setApiDiscountPanelId(apiDiscountPanelId === u.id ? null : u.id); setApiError(null); loadApiToken(u.id); }}
                      className="flex items-center justify-center gap-1 bg-teal-50 text-teal-700 py-2 rounded-md text-[11px] font-bold active:scale-95 border border-teal-100">
                      <Percent size={11}/> نسبة خصم API
                    </button>
                    <button onClick={() => toggleApiEnabled(u.id)}
                      className={`flex items-center justify-center gap-1 py-2 rounded-md text-[11px] font-bold active:scale-95 border ${apiTokenInfo[u.id]?.enabled === false ? "bg-green-50 text-green-700 border-green-100" : "bg-gray-100 text-gray-600 border-gray-200"}`}>
                      {apiTokenInfo[u.id]?.enabled === false ? <><Power size={11}/> تفعيل API</> : <><PowerOff size={11}/> تعطيل API</>}
                    </button>
                  </div>
                )}

                {/* API Discount Panel: نسبة خصم مخصصة لـ API هذا المستخدم */}
                {apiDiscountPanelId === u.id && (
                  <div className="border-t border-teal-100 bg-teal-50/40 px-3 py-2.5 space-y-2">
                    {apiError && (
                      <p className="text-[10px] text-red-600 font-bold bg-red-50 border border-red-100 rounded-md px-2 py-1.5">{apiError}</p>
                    )}
                    {apiLoading === u.id ? (
                      <p className="text-center text-xs text-gray-400 py-2">جاري التحميل...</p>
                    ) : !apiTokenInfo[u.id]?.exists ? (
                      <p className="text-center text-[11px] text-gray-400 py-2">لا يملك هذا المستخدم مفتاح API بعد</p>
                    ) : (
                      <>
                        <p className="text-[11px] font-bold text-teal-700">نسبة خصم API مخصصة لـ {u.name} (تُطبَّق بدل النسبة العامة بصفحة API)</p>
                        <div className="flex gap-2">
                          <input
                            type="number" min={0} max={99} step={0.1}
                            placeholder="اتركه فارغاً لاستخدام النسبة العامة"
                            value={apiDiscountVal}
                            onChange={e => setApiDiscountVal(e.target.value)}
                            className="flex-1 p-2 bg-white rounded-md text-xs outline-none border border-teal-200 text-center font-bold"
                          />
                          <button disabled={apiSaving} onClick={() => saveApiDiscount(u.id)}
                            className="bg-teal-600 text-white px-3 rounded-md text-xs font-bold active:scale-95 disabled:opacity-50">
                            حفظ
                          </button>
                          <button onClick={() => setApiDiscountPanelId(null)} className="bg-gray-100 text-gray-600 px-2.5 rounded-md text-xs font-bold active:scale-95"><X size={12}/></button>
                        </div>
                        {apiTokenInfo[u.id]?.custom_discount_percent != null && (
                          <p className="text-[10px] text-teal-600 font-bold">النسبة الحالية المطبّقة: {apiTokenInfo[u.id]?.custom_discount_percent}%</p>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Notification Panel */}
                {notifTarget === u.id && (
                  <div className="border-t border-blue-100 bg-blue-50/40 px-3 py-2.5 space-y-2">
                    <p className="text-[11px] font-bold text-blue-700">إرسال إشعار لـ {u.name}</p>
                    <input type="text" placeholder="عنوان الإشعار" value={notifTitle} onChange={e => setNotifTitle(e.target.value)}
                      className="w-full p-2 bg-white rounded-md text-xs outline-none border border-blue-100"/>
                    <input type="text" placeholder="نص الإشعار" value={notifBody} onChange={e => setNotifBody(e.target.value)}
                      className="w-full p-2 bg-white rounded-md text-xs outline-none border border-blue-100"/>
                    <button onClick={async () => { if (!notifTitle || !notifBody) return; await handleSendNotification(u.id, notifTitle, notifBody); setNotifTarget(null); }}
                      className="w-full bg-blue-600 text-white py-2 rounded-md text-xs font-bold flex items-center justify-center gap-1">
                      <Send size={11}/> إرسال الإشعار
                    </button>
                  </div>
                )}

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/60 px-3 py-3">
                    {isLoadingThis ? (
                      <p className="text-center text-xs text-gray-400 py-2">جاري التحميل...</p>
                    ) : (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-1.5">
                          {[
                            { icon: <Mail size={11} className="text-blue-400 shrink-0"/>, label: u.email || "—" },
                            { icon: <Phone size={11} className="text-green-400 shrink-0"/>, label: u.phone || "—" },
                            { icon: <Calendar size={11} className="text-purple-400 shrink-0"/>, label: u.created_at ? new Date(u.created_at).toLocaleDateString("ar-SA") : "—" },
                            { icon: <Share2 size={11} className="text-pink-400 shrink-0"/>, label: `إحالات: ${details?.referral_count ?? "—"}` },
                          ].map((item, i) => (
                            <div key={i} className="flex items-center gap-1.5 bg-white rounded-md px-2 py-1.5 border border-gray-100">
                              {item.icon}
                              <span className="text-[10px] text-gray-600 truncate">{item.label}</span>
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button onClick={() => openOrders(u)}
                            className="bg-blue-500 text-white rounded-md py-2 text-[11px] font-bold flex items-center justify-center gap-1.5 active:scale-95">
                            <ShoppingBag size={12}/> الطلبات ({details?.orders_count ?? "—"})
                          </button>
                          <button onClick={() => openTx(u)}
                            className="bg-green-500 text-white rounded-md py-2 text-[11px] font-bold flex items-center justify-center gap-1.5 active:scale-95">
                            <Wallet size={12}/> المدفوعات ({details?.transactions_count ?? "—"})
                          </button>
                        </div>
                        <button onClick={() => openBalanceLog(u)}
                          className="w-full bg-purple-500 text-white rounded-md py-2 text-[11px] font-bold flex items-center justify-center gap-1.5 active:scale-95">
                          <History size={12}/> سجلات الرصيد
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Orders Modal */}
      {ordersModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => setOrdersModal(null)}>
          <div className="bg-white w-full rounded-t-lg max-h-[75vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white p-4 flex items-center justify-between border-b border-gray-100">
              <p className="font-bold text-sm">طلبات {ordersModal.name}</p>
              <button onClick={() => setOrdersModal(null)}><X size={18}/></button>
            </div>
            <div className="p-3 space-y-2">
              {modalLoading ? <p className="text-center text-sm text-gray-400 py-6">جاري التحميل...</p> :
                ordersList.length === 0 ? <p className="text-center text-sm text-gray-400 py-6">لا توجد طلبات</p> :
                ordersList.map((o: any) => (
                  <button
                    key={o.id}
                    onClick={() => {
                      if (setFocusTarget && setAdminTab) {
                        setFocusTarget({ type: "order", id: o.id });
                        setAdminTab("orders");
                        setOrdersModal(null);
                      }
                    }}
                    className="w-full bg-gray-50 rounded-md p-3 flex items-center gap-3 text-right active:scale-[0.98] transition-transform"
                  >
                    <div className="flex-1">
                      <p className="text-xs font-bold text-gray-700">طلب #{o.id}</p>
                      <p className="text-[10px] text-gray-400">{o.created_at ? new Date(o.created_at).toLocaleDateString("ar-SA") : ""}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-black text-gray-800">{o.total_amount?.toFixed(3)} $</p>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${o.status==='accepted'?'bg-green-100 text-green-700':o.status==='rejected'?'bg-red-100 text-red-600':'bg-yellow-100 text-yellow-700'}`}>{o.status}</span>
                    </div>
                    <ChevronLeft size={16} className="text-gray-300 shrink-0"/>
                  </button>
                ))
              }
            </div>
          </div>
        </div>
      )}

      {/* Transactions Modal */}
      {txModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => setTxModal(null)}>
          <div className="bg-white w-full rounded-t-lg max-h-[75vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white p-4 flex items-center justify-between border-b border-gray-100">
              <p className="font-bold text-sm">مدفوعات {txModal.name}</p>
              <button onClick={() => setTxModal(null)}><X size={18}/></button>
            </div>
            <div className="p-3 space-y-2">
              {modalLoading ? <p className="text-center text-sm text-gray-400 py-6">جاري التحميل...</p> :
                txList.length === 0 ? <p className="text-center text-sm text-gray-400 py-6">لا توجد مدفوعات</p> :
                txList.map((t: any) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      if (setFocusTarget && setAdminTab) {
                        setFocusTarget({ type: "transaction", id: t.id });
                        setAdminTab("transactions");
                        setTxModal(null);
                      }
                    }}
                    className="w-full bg-gray-50 rounded-md p-3 flex items-center gap-3 text-right active:scale-[0.98] transition-transform"
                  >
                    <div className="flex-1">
                      <p className="text-xs font-bold text-gray-700">{t.amount?.toFixed(3)} $</p>
                      <p className="text-[10px] text-gray-400">{(t.note || "").replace(/\[sam-api\]\s*-?\s*/gi, "") || "—"}</p>
                      <p className="text-[10px] text-gray-400">{t.created_at ? new Date(t.created_at).toLocaleDateString("ar-SA") : ""}</p>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${t.status==='approved'?'bg-green-100 text-green-700':t.status==='rejected'?'bg-red-100 text-red-600':'bg-yellow-100 text-yellow-700'}`}>{t.status}</span>
                    <ChevronLeft size={16} className="text-gray-300 shrink-0"/>
                  </button>
                ))
              }
            </div>
          </div>
        </div>
      )}
      {/* Balance Log Modal */}
      {balanceLogModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => setBalanceLogModal(null)}>
          <div className="bg-white w-full rounded-t-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white p-4 flex items-center justify-between border-b border-gray-100 z-10">
              <p className="font-bold text-sm">سجلات رصيد {balanceLogModal.name}</p>
              <button onClick={() => setBalanceLogModal(null)}><X size={18}/></button>
            </div>

            {balanceLogLoading ? (
              <p className="text-center text-sm text-gray-400 py-10">جاري التحميل...</p>
            ) : (
              <>
                {/* Top summary card: totals since account creation, not current balance */}
                <div className="p-4">
                  <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl p-4 text-white shadow-md">
                    <p className="text-[10px] text-white/70 font-bold mb-2">إجمالي منذ إنشاء الحساب (وليس الرصيد الحالي)</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/10 rounded-lg p-2.5">
                        <div className="flex items-center gap-1 text-[10px] text-white/80 font-bold mb-1">
                          <ArrowUpCircle size={12}/> إجمالي الشحن
                        </div>
                        <p className="text-lg font-black">{(balanceLogData?.total_credited ?? 0).toFixed(3)} $</p>
                      </div>
                      <div className="bg-white/10 rounded-lg p-2.5">
                        <div className="flex items-center gap-1 text-[10px] text-white/80 font-bold mb-1">
                          <ArrowDownCircle size={12}/> إجمالي الصرف
                        </div>
                        <p className="text-lg font-black">{(balanceLogData?.total_debited ?? 0).toFixed(3)} $</p>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-white/20 flex items-center justify-between">
                      <span className="text-[10px] text-white/80 font-bold">الصافي</span>
                      <span className="text-sm font-black">{(balanceLogData?.net ?? 0).toFixed(3)} $</span>
                    </div>
                    <div className="mt-1 pt-1 flex items-center justify-between">
                      <span className="text-[10px] text-white/60 font-bold">الرصيد الحالي الفعلي</span>
                      <span className="text-xs font-bold text-white/90">{parseFloat(balanceLogModal.balance || 0).toFixed(3)} $</span>
                    </div>
                  </div>
                </div>

                {/* Entries list */}
                <div className="px-3 pb-4 space-y-2">
                  {(!balanceLogData?.entries || balanceLogData.entries.length === 0) ? (
                    <p className="text-center text-sm text-gray-400 py-6">لا توجد حركات رصيد</p>
                  ) : (
                    balanceLogData.entries.map((e: any) => (
                      <div key={`${e.type}-${e.id}`} className="bg-gray-50 rounded-md p-3 flex items-center gap-3 border border-gray-100">
                        <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${e.type === "credit" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                          {e.type === "credit" ? <ArrowUpCircle size={16}/> : <ArrowDownCircle size={16}/>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-700">{e.source_label}</p>
                          {e.note && <p className="text-[10px] text-gray-400 truncate">{e.note}</p>}
                          <p className="text-[10px] text-gray-400">{e.created_at ? new Date(e.created_at).toLocaleString("ar-SA") : ""}</p>
                        </div>
                        <div className="text-left shrink-0">
                          <p className={`text-xs font-black ${e.type === "credit" ? "text-green-600" : "text-red-600"}`}>
                            {e.type === "credit" ? "+" : "-"}{Number(e.amount).toFixed(3)} $
                          </p>
                          {e.status && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${e.status==='approved'||e.status==='accepted'?'bg-green-100 text-green-700':e.status==='rejected'?'bg-red-100 text-red-600':'bg-yellow-100 text-yellow-700'}`}>{e.status}</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;
