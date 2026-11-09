import React from "react";
import { ShoppingBag, Wallet, Users, X, Clock, TrendingUp, ChevronLeft, AlertTriangle } from "lucide-react";

const AdminHomePage = ({adminUsers, adminOrders, adminTransactions, setAdminTab, fetchUser, fetchAdminUsers, handleToggleVip, handleBlockUser, handleDeleteUser, handleSendNotification, onOpenChatWithUser, adminFetch, setFocusTarget}: any) => {
  const [userOrdersModal, setUserOrdersModal] = React.useState<any>(null);
  const [userTxModal, setUserTxModal] = React.useState<any>(null);
  const [userOrdersList, setUserOrdersList] = React.useState<any[]>([]);
  const [userTxList, setUserTxList] = React.useState<any[]>([]);
  const [modalLoading, setModalLoading] = React.useState(false);
  const [providers, setProviders] = React.useState<any[]>([]);

  React.useEffect(() => {
    adminFetch("/api/admin/providers")
      .then((r: Response) => r.json())
      .then((d: any) => setProviders(Array.isArray(d) ? d : []))
      .catch(() => setProviders([]));
  }, []);

  const totalBalance = adminUsers.reduce((sum: number, u: any) => sum + (parseFloat(u.balance) || 0), 0);

  const failingProviders = React.useMemo(
    () => (providers || []).filter((p: any) => p.is_active && p.last_sync_status === "error"),
    [providers]
  );

  // Recent activities: merge orders, transactions, users — sort by created_at desc, take 10
  const recentActivities = React.useMemo(() => {
    const items: any[] = [
      ...adminOrders.map((o: any) => ({ ...o, _type: "order" })),
      ...adminTransactions.map((t: any) => ({ ...t, _type: "transaction" })),
      ...adminUsers.map((u: any) => ({ ...u, _type: "user" })),
    ];
    items.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    return items.slice(0, 10);
  }, [adminOrders, adminTransactions, adminUsers]);

  const typeConfig: Record<string, { label: string; color: string; dot: string; icon: React.ReactNode }> = {
    order: { label: "طلب جديد", color: "border-[#BBDEFB]", dot: "", icon: <ShoppingBag size={14} style={{ color: "#1565C0" }} /> },
    transaction: { label: "دفعة جديدة", color: "border-[#60D78E]", dot: "", icon: <Wallet size={14} style={{ color: "#1E9C5A" }} /> },
    user: { label: "مستخدم جديد", color: "border-[#AA9FDB]", dot: "", icon: <Users size={14} style={{ color: "#6C5CB8" }} /> },
  };
  const dotColor: Record<string, string> = { order: "#BBDEFB", transaction: "#60D78E", user: "#AA9FDB" };
  const bgTint: Record<string, string> = { order: "#BBDEFB14", transaction: "#60D78E14", user: "#AA9FDB14" };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Top Cards */}
      <div className="grid grid-cols-3 gap-2.5">
        <button onClick={() => setAdminTab("orders")}
          style={{ backgroundColor: "#BBDEFB" }}
          className="rounded-md p-3.5 text-[#0D3B66] text-center active:scale-[0.97] transition-transform border border-black/5">
          <ShoppingBag size={22} className="mx-auto mb-1.5" />
          <p className="text-[11px] font-bold">الطلبات</p>
        </button>
        <button onClick={() => setAdminTab("transactions")}
          style={{ backgroundColor: "#60D78E" }}
          className="rounded-md p-3.5 text-white text-center active:scale-[0.97] transition-transform border border-black/5">
          <Wallet size={22} className="mx-auto mb-1.5" />
          <p className="text-[11px] font-bold">المدفوعات</p>
        </button>
        <button onClick={() => setAdminTab("users")}
          style={{ backgroundColor: "#AA9FDB" }}
          className="rounded-md p-3.5 text-white text-center active:scale-[0.97] transition-transform border border-black/5">
          <Users size={22} className="mx-auto mb-1.5" />
          <p className="text-[11px] font-bold">المستخدمين</p>
        </button>
      </div>

      {/* Provider Health Alert */}
      {failingProviders.length > 0 && (
        <button
          onClick={() => setAdminTab("inventory")}
          className="w-full flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-md p-3 text-right active:scale-[0.98] transition-transform"
        >
          <AlertTriangle size={18} className="text-red-600 shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-bold text-red-700">
              {failingProviders.length} مزوّد يحتاج مراجعة
            </p>
            <p className="text-[10px] text-red-500 mt-0.5 truncate">
              {failingProviders.map((p: any) => p.name).join("، ")}
            </p>
          </div>
          <ChevronLeft size={16} className="text-red-400 shrink-0" />
        </button>
      )}

      {/* Quick Stats */}
      <div className="bg-white rounded-md p-4 border border-gray-200 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp size={15} className="text-[var(--brand)]" />
          <p className="font-bold text-sm text-gray-700">إحصاءات سريعة</p>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div style={{ backgroundColor: "#BBDEFB33", borderColor: "#BBDEFB" }} className="rounded-md p-3 text-center border">
            <p className="text-xl font-black" style={{ color: "#1565C0" }}>{adminOrders.length}</p>
            <p className="text-[10px] text-gray-500 font-bold mt-0.5">إجمالي الطلبات</p>
          </div>
          <div style={{ backgroundColor: "#60D78E22", borderColor: "#60D78E" }} className="rounded-md p-3 text-center border">
            <p className="text-xl font-black" style={{ color: "#1E9C5A" }}>{adminTransactions.length}</p>
            <p className="text-[10px] text-gray-500 font-bold mt-0.5">إجمالي المدفوعات</p>
          </div>
          <div style={{ backgroundColor: "#AA9FDB22", borderColor: "#AA9FDB" }} className="rounded-md p-3 text-center border">
            <p className="text-xl font-black" style={{ color: "#6C5CB8" }}>{adminUsers.length}</p>
            <p className="text-[10px] text-gray-500 font-bold mt-0.5">إجمالي المستخدمين</p>
          </div>
          <div className="bg-orange-50 rounded-md p-3 text-center border border-orange-100">
            <p className="text-xl font-black text-orange-600">{totalBalance.toFixed(3)}</p>
            <p className="text-[10px] text-gray-500 font-bold mt-0.5">إجمالي الأرصدة</p>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-md p-4 border border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={15} className="text-[var(--brand)]" />
          <p className="font-bold text-sm text-gray-700">أحدث النشاطات</p>
        </div>
        {recentActivities.length === 0 ? (
          <p className="text-center text-xs text-gray-400 py-4">لا توجد نشاطات بعد</p>
        ) : (
          <div className="space-y-2">
            {recentActivities.map((item: any, i: number) => {
              const cfg = typeConfig[item._type] || typeConfig.order;
              const label = item._type === "order"
                ? `طلب #${item.id} — ${item.total_amount ? item.total_amount.toFixed(3) + " $" : ""}`
                : item._type === "transaction"
                ? `دفعة ${item.amount ? item.amount.toFixed(3) + " $" : ""} — ${item.status || ""}`
                : `${item.name || "مستخدم"} — #${item.id}`;
              const timeStr = item.created_at
                ? new Date(item.created_at).toLocaleDateString("ar-SA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                : "";
              const targetTab = item._type === "order" ? "orders" : item._type === "transaction" ? "transactions" : "users";
              const handleClick = () => {
                if (setFocusTarget) setFocusTarget({ type: item._type, id: item.id });
                setAdminTab(targetTab);
              };
              return (
                <button
                  type="button"
                  key={`${item._type}-${item.id}-${i}`}
                  onClick={handleClick}
                  style={{ backgroundColor: bgTint[item._type] || "transparent" }}
                  className={`w-full flex items-center gap-3 p-3 rounded-md border text-right active:scale-[0.98] transition-transform ${cfg.color}`}
                >
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dotColor[item._type] || "#999" }} />
                  <div className="flex items-center gap-1.5 shrink-0">{cfg.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-700 truncate">{label}</p>
                    {timeStr && <p className="text-[10px] text-gray-400">{timeStr}</p>}
                  </div>
                  <ChevronLeft size={16} className="text-gray-400 shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: طلبات المستخدم */}
      {userOrdersModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => setUserOrdersModal(null)}>
          <div className="bg-white w-full rounded-t-xl max-h-[75vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white p-4 flex items-center justify-between border-b border-gray-200">
              <p className="font-bold text-sm">طلبات {userOrdersModal.name}</p>
              <button onClick={() => setUserOrdersModal(null)}><X size={18}/></button>
            </div>
            <div className="p-4 space-y-2">
              {modalLoading ? <p className="text-center text-sm text-gray-400 py-6">جاري التحميل...</p> :
                userOrdersList.length === 0 ? <p className="text-center text-sm text-gray-400 py-6">لا توجد طلبات</p> :
                userOrdersList.map((o: any) => (
                  <div key={o.id} className="bg-gray-50 rounded-md p-3 border border-gray-100">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-700">#{o.id}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${o.status==='accepted'?'bg-green-100 text-green-700':o.status==='rejected'?'bg-red-100 text-red-600':'bg-yellow-100 text-yellow-700'}`}>{o.status}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1">{o.total_amount?.toFixed(3)} $</p>
                    <p className="text-[10px] text-gray-400">{o.created_at ? new Date(o.created_at).toLocaleDateString("ar") : ""}</p>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}

      {/* Modal: مدفوعات المستخدم */}
      {userTxModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => setUserTxModal(null)}>
          <div className="bg-white w-full rounded-t-xl max-h-[75vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white p-4 flex items-center justify-between border-b border-gray-200">
              <p className="font-bold text-sm">مدفوعات {userTxModal.name}</p>
              <button onClick={() => setUserTxModal(null)}><X size={18}/></button>
            </div>
            <div className="p-4 space-y-2">
              {modalLoading ? <p className="text-center text-sm text-gray-400 py-6">جاري التحميل...</p> :
                userTxList.length === 0 ? <p className="text-center text-sm text-gray-400 py-6">لا توجد مدفوعات</p> :
                userTxList.map((t: any) => (
                  <div key={t.id} className="bg-gray-50 rounded-md p-3 border border-gray-100">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-700">{t.amount?.toFixed(3)} $</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.status==='approved'?'bg-green-100 text-green-700':t.status==='rejected'?'bg-red-100 text-red-600':'bg-yellow-100 text-yellow-700'}`}>{t.status}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1">{(t.note || "").replace(/\[sam-api\]\s*-?\s*/gi, "") || "—"}</p>
                    <p className="text-[10px] text-gray-400">{t.created_at ? new Date(t.created_at).toLocaleDateString("ar") : ""}</p>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminHomePage;
