import React from "react";
import OptimizedImage from "./OptimizedImage";
import {
  User,
  Mail,
  Phone,
  KeyRound,
  Calendar,
  Wallet,
  Share2,
  ShoppingBag,
  Crown,
  Bell,
  MessageCircle,
  Lock,
  Trash2,
  Send,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface AdminUserCardProps {
  key?: React.Key;
  u: any;
  adminFetch: (url: string, options?: RequestInit) => Promise<Response>;
  fetchAdminUsers: () => void;
  handleToggleVip: (id: any, isVip: boolean) => void;
  handleBlockUser: (id: any, isCurrentlyBanned?: boolean) => void;
  handleDeleteUser: (id: any) => void;
  handleSendNotification: (userId: any, title: string, body: string) => Promise<void>;
  onOpenChat?: (user: any) => void;
  onViewOrders?: (user: any) => void;
  onViewTransactions?: (user: any) => void;
}

const AdminUserCard = ({ u, adminFetch, fetchAdminUsers, handleToggleVip, handleBlockUser, handleDeleteUser, handleSendNotification, onOpenChat, onViewOrders, onViewTransactions }: AdminUserCardProps) => {
  const [showNotif, setShowNotif] = React.useState(false);
  const [nt, setNt] = React.useState("");
  const [nb, setNb] = React.useState("");
  const [showDetails, setShowDetails] = React.useState(false);
  const [showBalance, setShowBalance] = React.useState(false);
  const [newBal, setNewBal] = React.useState(u.balance?.toString() || "0");
  const [userDetails, setUserDetails] = React.useState<any>(null);
  const [detailsLoading, setDetailsLoading] = React.useState(false);

  const loadDetails = async () => {
    if (userDetails) return;
    setDetailsLoading(true);
    try {
      const [statsRes, ordersRes, txRes] = await Promise.all([
        adminFetch(`/api/admin/users/${u.id}/details`),
        adminFetch(`/api/admin/users/${u.id}/orders-count`),
        adminFetch(`/api/admin/users/${u.id}/transactions-count`),
      ]);
      const stats = statsRes.ok ? await statsRes.json() : {};
      const ordersData = ordersRes.ok ? await ordersRes.json() : {};
      const txData = txRes.ok ? await txRes.json() : {};
      setUserDetails({ ...stats, ...ordersData, ...txData });
    } catch(e) {}
    setDetailsLoading(false);
  };

  const handleSaveBalance = async () => {
    const val = parseFloat(newBal);
    if (isNaN(val)) return;
    const res = await adminFetch(`/api/admin/users/${u.id}/balance`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({amount: val})
    });
    if (res.ok) { fetchAdminUsers(); setShowBalance(false); }
  };



  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
      {/* Header Row */}
      <div className="p-4 flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden shrink-0 border-2 border-white shadow">
          {u.avatar_url ? <OptimizedImage src={u.avatar_url} width={88} height={88} className="w-full h-full object-cover"/> : <User size={20} className="text-gray-400"/>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-bold text-sm text-gray-800 truncate">{u.name}</p>
            {u.is_vip && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold shrink-0">VIP</span>}
            {u.is_banned && <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold shrink-0">محظور</span>}
          </div>
          <p className="text-[10px] text-gray-400 truncate">#{u.id} · {u.email}</p>
          <p className="text-[10px] text-brand font-bold">{u.balance?.toFixed(3)} $ · ID: #{u.id}</p>
        </div>
        {/* Details arrow */}
        <button onClick={() => { setShowDetails(!showDetails); if (!showDetails) loadDetails(); }}
          className="p-2 rounded-lg bg-gray-50 text-gray-500 active:scale-90 transition-all">
          {showDetails ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
        </button>
      </div>

      {/* Details Panel */}
      {showDetails && (
        <div className="border-t border-gray-50 bg-gray-50/60 px-4 py-3 space-y-2">
          {detailsLoading ? (
            <p className="text-center text-xs text-gray-400 py-2">جاري التحميل...</p>
          ) : (
            <div className="space-y-1.5">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Mail size={11} className="text-gray-400 shrink-0"/>
                  <span className="text-[10px] text-gray-500 truncate">{u.email}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone size={11} className="text-gray-400 shrink-0"/>
                  <span className="text-[10px] text-gray-500">{u.phone || "—"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <KeyRound size={11} className="text-gray-400 shrink-0"/>
                  <span className="text-[10px] text-gray-500">رقم الدخول: #{u.id}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar size={11} className="text-gray-400 shrink-0"/>
                  <span className="text-[10px] text-gray-500">{u.created_at ? new Date(u.created_at).toLocaleDateString("ar") : "—"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Wallet size={11} className="text-green-500 shrink-0"/>
                  <span className="text-[10px] text-green-700 font-bold">{u.balance?.toFixed(3)} $</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Share2 size={11} className="text-purple-400 shrink-0"/>
                  <span className="text-[10px] text-gray-500">إحالات: {userDetails?.referral_count ?? "—"}</span>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => onViewOrders && onViewOrders(u)}
                  className="flex-1 flex items-center justify-center gap-1 bg-blue-50 text-blue-700 py-1.5 rounded-lg text-[10px] font-bold">
                  <ShoppingBag size={11}/> إجمالي الطلبات: {userDetails?.orders_count ?? "—"} ▼
                </button>
                <button onClick={() => onViewTransactions && onViewTransactions(u)}
                  className="flex-1 flex items-center justify-center gap-1 bg-green-50 text-green-700 py-1.5 rounded-lg text-[10px] font-bold">
                  <Wallet size={11}/> إجمالي المدفوعات: {userDetails?.transactions_count ?? "—"} ▼
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="border-t border-gray-50 px-3 py-2.5 flex items-center gap-2 flex-wrap">
        <button onClick={() => setShowBalance(!showBalance)}
          className="flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1.5 rounded-md text-[11px] font-bold active:scale-95">
          <Wallet size={12}/> الرصيد
        </button>
        <button onClick={() => handleToggleVip(u.id, u.is_vip)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-bold active:scale-95 ${u.is_vip ? "bg-gray-100 text-gray-600" : "bg-amber-50 text-amber-700"}`}>
          <Crown size={12}/> {u.is_vip ? "إلغاء VIP" : "VIP"}
        </button>
        <button onClick={() => setShowNotif(!showNotif)}
          className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-md text-[11px] font-bold active:scale-95">
          <Bell size={12}/> إشعار
        </button>
        <button onClick={() => onOpenChat && onOpenChat(u)}
          className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-md text-[11px] font-bold active:scale-95">
          <MessageCircle size={12}/> دردشة
        </button>
        <button onClick={() => handleBlockUser(u.id, u.is_banned)}
          className="flex items-center gap-1 bg-orange-50 text-orange-700 px-3 py-1.5 rounded-md text-[11px] font-bold active:scale-95">
          <Lock size={12}/> حظر
        </button>
        <button onClick={() => handleDeleteUser(u.id)}
          className="flex items-center gap-1 bg-red-50 text-red-600 px-3 py-1.5 rounded-md text-[11px] font-bold active:scale-95">
          <Trash2 size={12}/> حذف
        </button>
      </div>

      {/* Inline Balance Editor */}
      {showBalance && (
        <div className="border-t border-green-50 bg-green-50/40 px-4 py-3 space-y-2">
          <p className="text-[11px] font-bold text-green-700">تعديل رصيد {u.name}</p>
          <div className="flex gap-2">
            <input type="number" value={newBal} onChange={e => setNewBal(e.target.value)}
              className="flex-1 p-2.5 bg-white rounded-lg text-xs outline-none border border-green-100 text-center font-bold"
              placeholder="0.00"/>
            <button onClick={handleSaveBalance}
              className="bg-green-600 text-white px-4 rounded-lg text-xs font-bold active:scale-95">
              حفظ
            </button>
            <button onClick={() => setShowBalance(false)}
              className="bg-gray-100 text-gray-600 px-3 rounded-lg text-xs font-bold active:scale-95">
              <X size={12}/>
            </button>
          </div>
        </div>
      )}

      {/* Notification Panel */}
      {showNotif && (
        <div className="border-t border-blue-50 bg-blue-50/40 px-4 py-3 space-y-2">
          <p className="text-[11px] font-bold text-blue-700">إرسال إشعار لـ {u.name}</p>
          <input type="text" placeholder="عنوان الإشعار" value={nt} onChange={e => setNt(e.target.value)} className="w-full p-2.5 bg-white rounded-lg text-xs outline-none border border-blue-100"/>
          <input type="text" placeholder="نص الإشعار" value={nb} onChange={e => setNb(e.target.value)} className="w-full p-2.5 bg-white rounded-lg text-xs outline-none border border-blue-100"/>
          <button onClick={async () => { if (!nt || !nb) return; await handleSendNotification(u.id, nt, nb); setNt(""); setNb(""); setShowNotif(false); }}
            className="w-full bg-blue-600 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1">
            <Send size={12}/> إرسال
          </button>
        </div>
      )}


    </div>
  );
};

export default AdminUserCard;
