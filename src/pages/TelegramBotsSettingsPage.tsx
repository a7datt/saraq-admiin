import React, { useEffect, useState } from "react";
import { ArrowRight, ChevronDown, Link2, Unlink, Loader2, CheckCircle2, XCircle, Bell, MessageSquare, Power, AtSign, ExternalLink, Trash2, Save, Users, ShieldCheck } from "lucide-react";
import { showToast } from "../components/ToastContainer";
import { showConfirm } from "../components/CustomDialogContainer";

interface TelegramBotsSettingsPageProps {
  setView: (v: any) => void;
  adminFetch: (url: string, options?: any) => Promise<Response>;
}

interface AdminChatIdEntry {
  chat_id: string;
  label: string;
  permissions: Record<string, boolean>;
  notifications: Record<string, boolean>;
}

const PERMISSION_LABELS: { key: string; label: string }[] = [
  { key: "manage_categories", label: "إدارة الأقسام (إضافة/حذف/تعديل)" },
  { key: "manage_products", label: "إدارة المنتجات (إضافة/حذف/تعديل الأسعار)" },
  { key: "manage_banners_offers", label: "إدارة البانرات والعروض" },
  { key: "manage_vouchers", label: "إدارة القسائم (Vouchers)" },
  { key: "manual_topup", label: "الشحن اليدوي للرصيد (Top-up)" },
  { key: "ban_delete_users", label: "حظر/حذف المستخدمين" },
  { key: "grant_vip", label: "ترقية لـ VIP" },
  { key: "super_admin", label: "عرض كل قوائم/أوامر الإدارة الكاملة (Super Admin)" },
];

const NOTIFICATION_LABELS: { key: string; label: string }[] = [
  { key: "new_orders", label: "إشعار الطلبات الجديدة" },
  { key: "topup_transactions", label: "إشعار الشحن/المعاملات المالية" },
  { key: "new_registrations", label: "إشعار تسجيل مستخدمين جدد" },
  { key: "system_alerts", label: "إشعارات عامة/تنبيهات النظام" },
];

const GET_CHAT_ID_BOT_URL = "https://t.me/syrabit_id_chatbot?start=get_id";

interface BotStatus {
  is_connected: boolean;
  is_disabled: boolean;
  linked_users_count: number;
  bot_username: string | null;
  settings: {
    welcome_message?: string;
    notify_orders?: boolean;
    notify_promotions?: boolean;
    bot_username?: string;
    channel_gate_enabled?: boolean;
    channel_gate_link?: string;
  };
  last_test_ok: boolean | null;
  last_test_msg: string | null;
}

const TelegramBotsSettingsPage = ({ setView, adminFetch }: TelegramBotsSettingsPageProps) => {
  const [tab, setTab] = useState<"user" | "admin">("user");
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const [welcomeMsg, setWelcomeMsg] = useState("");
  const [notifyOrders, setNotifyOrders] = useState(true);
  const [notifyPromotions, setNotifyPromotions] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [botUsernameInput, setBotUsernameInput] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);

  // ---- شرط الانضمام الإجباري إلى القناة (خاص ببوت المستخدمين) ----
  const [channelGateEnabled, setChannelGateEnabled] = useState(false);
  const [channelGateLink, setChannelGateLink] = useState("");
  const [savingChannelGate, setSavingChannelGate] = useState(false);

  // ---- Admin Bot: multi Chat ID + permissions/notifications ----
  const [chatIdsInput, setChatIdsInput] = useState("");
  const [addingChatIds, setAddingChatIds] = useState(false);
  const [adminChatIds, setAdminChatIds] = useState<AdminChatIdEntry[]>([]);
  const [loadingChatIds, setLoadingChatIds] = useState(false);
  const [savingChatId, setSavingChatId] = useState<string | null>(null);
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);
  const [chatIdDrafts, setChatIdDrafts] = useState<Record<string, AdminChatIdEntry>>({});
  const [expandedChatIds, setExpandedChatIds] = useState<Record<string, boolean>>({});
  const [showAddChatIdCard, setShowAddChatIdCard] = useState(false);
  const [showCustomSettings, setShowCustomSettings] = useState(false);

  const toggleChatIdExpanded = (chatId: string) => {
    setExpandedChatIds((prev) => ({ ...prev, [chatId]: !prev[chatId] }));
  };

  const fetchAdminChatIds = async () => {
    setLoadingChatIds(true);
    try {
      const res = await adminFetch(`/api/admin/telegram-bots/admin/chat-ids`);
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const list: AdminChatIdEntry[] = data.chat_ids || [];
        setAdminChatIds(list);
        const drafts: Record<string, AdminChatIdEntry> = {};
        list.forEach((c) => { drafts[c.chat_id] = JSON.parse(JSON.stringify(c)); });
        setChatIdDrafts(drafts);
      }
    } catch {
      showToast("فشل تحميل قائمة الـ Chat IDs", "error");
    } finally {
      setLoadingChatIds(false);
    }
  };

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await adminFetch(`/api/admin/telegram-bots/${tab}/status`);
      if (!res.ok) throw new Error("bad status");
      const data = await res.json();
      setStatus(data);
      setWelcomeMsg(data.settings?.welcome_message || "");
      setNotifyOrders(data.settings?.notify_orders !== false);
      setNotifyPromotions(data.settings?.notify_promotions !== false);
      setBotUsernameInput(data.bot_username || data.settings?.bot_username || "");
      setChannelGateEnabled(!!data.settings?.channel_gate_enabled);
      setChannelGateLink(data.settings?.channel_gate_link || "");
    } catch {
      showToast("فشل تحميل حالة البوت", "error");
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setShowModal(false);
    setTokenInput("");
    setTestResult(null);
    fetchStatus();
    if (tab === "admin") fetchAdminChatIds();
  }, [tab]);

  const isValidTokenFormat = (t: string) => /^\d{6,10}:[A-Za-z0-9_-]{30,50}$/.test(t);

  const handleTest = async () => {
    const t = tokenInput.trim();
    if (!t) return showToast("أدخل التوكن أولاً", "error");
    if (!isValidTokenFormat(t)) {
      setTestResult({ ok: false, message: "صيغة التوكن غير صحيحة (مثال: 123456789:ABCdef...)" });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await adminFetch(`/api/admin/telegram-bots/${tab}/test`, {
        method: "POST",
        body: JSON.stringify({ token: t }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTestResult({ ok: false, message: data.error || "فشل الاختبار" });
        return;
      }
      setTestResult({ ok: !!data.success, message: data.message || (data.success ? "تم التحقق بنجاح" : "توكن غير صالح") });
    } catch {
      setTestResult({ ok: false, message: "فشل الاتصال بالخادم" });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveToken = async () => {
    const t = tokenInput.trim();
    if (!t) return showToast("أدخل التوكن أولاً", "error");
    if (!isValidTokenFormat(t)) {
      showToast("صيغة التوكن غير صحيحة", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await adminFetch(`/api/admin/telegram-bots/${tab}/connect`, {
        method: "POST",
        body: JSON.stringify({ token: t }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        showToast(tab === "user" ? "تم ربط بوت المستخدمين بنجاح" : "تم ربط بوت الأدمن بنجاح", "success");
        setShowModal(false);
        setTokenInput("");
        setTestResult(null);
        if (data.bot_username) setBotUsernameInput(data.bot_username);
        fetchStatus();
      } else {
        showToast(data.error || "فشل الحفظ", "error");
      }
    } catch {
      showToast("فشل الاتصال بالخادم", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    showConfirm(tab === "user" ? "هل أنت متأكد من إلغاء ربط بوت المستخدمين؟" : "هل أنت متأكد من إلغاء ربط بوت الأدمن؟", "إلغاء الربط", async () => {
      try {
        const res = await adminFetch(`/api/admin/telegram-bots/${tab}/disconnect`, { method: "POST" });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          showToast("تم إلغاء الربط", "success");
          fetchStatus();
        } else {
          showToast(data.error || "فشل إلغاء الربط", "error");
        }
      } catch {
        showToast("فشل الاتصال بالخادم", "error");
      }
    }, true);
  };

  const handleToggleDisabled = async () => {
    if (!status) return;
    try {
      const res = await adminFetch(`/api/admin/telegram-bots/${tab}/toggle`, {
        method: "POST",
        body: JSON.stringify({ is_disabled: !status.is_disabled }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        showToast(!status.is_disabled ? "تم تعطيل البوت" : "تم تفعيل البوت", "success");
        fetchStatus();
      } else {
        showToast(data.error || "فشل التبديل", "error");
      }
    } catch {
      showToast("فشل الاتصال بالخادم", "error");
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await adminFetch(`/api/admin/telegram-bots/${tab}/settings`, {
        method: "PUT",
        body: JSON.stringify({
          settings: {
            welcome_message: welcomeMsg,
            notify_orders: notifyOrders,
            notify_promotions: notifyPromotions,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        showToast("تم حفظ الإعدادات", "success");
      } else {
        showToast(data.error || "فشل الحفظ", "error");
      }
    } catch {
      showToast("فشل الاتصال بالخادم", "error");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveChannelGate = async () => {
    const link = channelGateLink.trim();
    if (channelGateEnabled) {
      if (!link) return showToast("أدخل رابط القناة أولاً", "error");
      if (!/^https:\/\/t\.me\/[A-Za-z0-9_]+\/?$/i.test(link)) {
        return showToast("رابط القناة غير صالح، يجب أن يكون بصيغة https://t.me/username", "error");
      }
    }
    setSavingChannelGate(true);
    try {
      const res = await adminFetch(`/api/admin/telegram-bots/${tab}/settings`, {
        method: "PUT",
        body: JSON.stringify({
          settings: {
            channel_gate_enabled: channelGateEnabled,
            channel_gate_link: link,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        showToast("تم حفظ شرط الانضمام للقناة", "success");
      } else {
        showToast(data.error || "فشل الحفظ", "error");
      }
    } catch {
      showToast("فشل الاتصال بالخادم", "error");
    } finally {
      setSavingChannelGate(false);
    }
  };

  const handleSaveUsername = async () => {
    const u = botUsernameInput.trim().replace(/^@/, "");
    if (!u) return showToast("أدخل اسم مستخدم البوت (بدون @)", "error");
    if (!/^[A-Za-z0-9_]{5,32}$/.test(u)) return showToast("اسم مستخدم غير صالح (5-32 حرف، إنجليزي وأرقام و _)", "error");
    setSavingUsername(true);
    try {
      const res = await adminFetch(`/api/admin/telegram-bots/${tab}/settings`, {
        method: "PUT",
        body: JSON.stringify({ settings: { bot_username: u } }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        showToast("تم حفظ اسم البوت", "success");
        fetchStatus();
      } else {
        showToast(data.error || "فشل الحفظ", "error");
      }
    } catch {
      showToast("فشل الاتصال بالخادم", "error");
    } finally {
      setSavingUsername(false);
    }
  };

  const handleAddChatIds = async () => {
    const raw = chatIdsInput.trim();
    if (!raw) return showToast("ضع Chat ID واحداً على الأقل", "error");
    setAddingChatIds(true);
    try {
      const res = await adminFetch(`/api/admin/telegram-bots/admin/chat-ids`, {
        method: "POST",
        body: JSON.stringify({ raw_input: raw }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        showToast(`تمت إضافة ${data.added_count ?? ""} Chat ID بنجاح`.trim(), "success");
        setChatIdsInput("");
        fetchAdminChatIds();
      } else {
        showToast(data.error || "فشل إضافة الـ Chat ID", "error");
      }
    } catch {
      showToast("فشل الاتصال بالخادم", "error");
    } finally {
      setAddingChatIds(false);
    }
  };

  const updateDraft = (chatId: string, patch: Partial<AdminChatIdEntry>) => {
    setChatIdDrafts((prev) => ({ ...prev, [chatId]: { ...prev[chatId], ...patch } }));
  };

  const toggleDraftPermission = (chatId: string, key: string) => {
    setChatIdDrafts((prev) => ({
      ...prev,
      [chatId]: {
        ...prev[chatId],
        permissions: { ...prev[chatId].permissions, [key]: !prev[chatId].permissions?.[key] },
      },
    }));
  };

  const toggleDraftNotification = (chatId: string, key: string) => {
    setChatIdDrafts((prev) => ({
      ...prev,
      [chatId]: {
        ...prev[chatId],
        notifications: { ...prev[chatId].notifications, [key]: !prev[chatId].notifications?.[key] },
      },
    }));
  };

  const handleSaveChatId = async (chatId: string) => {
    const draft = chatIdDrafts[chatId];
    if (!draft) return;
    setSavingChatId(chatId);
    try {
      const res = await adminFetch(`/api/admin/telegram-bots/admin/chat-ids/${encodeURIComponent(chatId)}`, {
        method: "PUT",
        body: JSON.stringify({ label: draft.label, permissions: draft.permissions, notifications: draft.notifications }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        showToast("تم حفظ التغييرات", "success");
        fetchAdminChatIds();
      } else {
        showToast(data.error || "فشل الحفظ", "error");
      }
    } catch {
      showToast("فشل الاتصال بالخادم", "error");
    } finally {
      setSavingChatId(null);
    }
  };

  const handleDeleteChatId = async (chatId: string) => {
    showConfirm("هل أنت متأكد من حذف هذا الـ Chat ID؟", "حذف Chat ID", async () => {
      setDeletingChatId(chatId);
      try {
        const res = await adminFetch(`/api/admin/telegram-bots/admin/chat-ids/${encodeURIComponent(chatId)}`, { method: "DELETE" });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          showToast("تم حذف الـ Chat ID", "success");
          fetchAdminChatIds();
        } else {
          showToast(data.error || "فشل الحذف", "error");
        }
      } catch {
        showToast("فشل الاتصال بالخادم", "error");
      } finally {
        setDeletingChatId(null);
      }
    }, true);
  };

  return (
    <div className="px-4 space-y-6 pb-20" dir="rtl">
      <div className="flex items-center gap-2 mb-2">
        <button onClick={() => setView(null)} className="p-2 bg-gray-100 rounded-full">
          <ArrowRight size={20} className="text-gray-600" />
        </button>
        <h2 className="text-xl font-bold text-gray-800">إعدادات بوتات التلجرام</h2>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1">
        <button
          onClick={() => setTab("user")}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${tab === "user" ? "bg-white shadow-sm text-gray-800" : "text-gray-500"}`}
        >
          بوت المستخدمين
        </button>
        <button
          onClick={() => setTab("admin")}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${tab === "admin" ? "bg-white shadow-sm text-gray-800" : "text-gray-500"}`}
        >
          بوت الأدمن
        </button>
      </div>

      {(tab === "user" || tab === "admin") && (
        loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gray-300" size={28} /></div>
        ) : (
          <div className="space-y-4">
            {/* Status Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-700">حالة الربط</span>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${status?.is_connected ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"}`}>
                  {status?.is_connected ? "مربوط" : "غير مربوط"}
                </span>
              </div>
              {status?.is_connected && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-700">حالة الخدمة</span>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${status?.is_disabled ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
                    {status?.is_disabled ? "معطّل" : "مفعّل"}
                  </span>
                </div>
              )}
              {status?.is_connected && status.bot_username && (
                <div className="flex items-center justify-between bg-purple-50 rounded-lg p-3">
                  <span className="text-xs text-gray-500">اسم مستخدم البوت</span>
                  <a
                    href={`https://t.me/${status.bot_username}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-bold text-purple-600 dir-ltr"
                  >
                    @{status.bot_username}
                  </a>
                </div>
              )}
              {status?.is_connected && tab === "user" && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-700">عدد المستخدمين المربوطين بالبوت</span>
                  <span className="text-sm text-gray-600"><b>{status.linked_users_count}</b></span>
                </div>
              )}
              {status?.is_connected && status.last_test_msg && (
                <div className={`flex items-center gap-2 text-xs rounded-lg p-2.5 ${status.last_test_ok ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                  {status.last_test_ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                  <span>{status.last_test_msg}</span>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                {!status?.is_connected ? (
                  <button
                    onClick={() => { setShowModal(true); setTestResult(null); setTokenInput(""); }}
                    className="flex-1 flex items-center justify-center gap-2 bg-purple-600 text-white rounded-xl py-2.5 text-sm font-bold active:scale-[0.98] transition-transform"
                  >
                    <Link2 size={16} /> ربط البوت
                  </button>
                ) : (
                  <button
                    onClick={handleDisconnect}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-50 text-red-600 rounded-xl py-2.5 text-sm font-bold active:scale-[0.98] transition-transform"
                  >
                    <Unlink size={16} /> إلغاء الربط
                  </button>
                )}
                {status?.is_connected && (
                  <button
                    onClick={handleToggleDisabled}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold active:scale-[0.98] transition-transform ${status.is_disabled ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-600"}`}
                  >
                    <Power size={16} /> {status.is_disabled ? "تفعيل البوت" : "تعطيل البوت"}
                  </button>
                )}
              </div>
            </div>

            {/* Custom Settings */}
            {status?.is_connected && tab === "user" && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
                <button
                  type="button"
                  onClick={() => setShowCustomSettings((v) => !v)}
                  className="w-full flex items-center justify-between gap-2"
                >
                  <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <MessageSquare size={16} className="text-purple-500" /> إعدادات مخصّصة
                  </h3>
                  <ChevronDown size={18} className={`text-gray-400 transition-transform ${showCustomSettings ? "rotate-180" : ""}`} />
                </button>

                {showCustomSettings && (
                <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1 flex items-center gap-1">
                    <AtSign size={12} /> اسم مستخدم البوت (Bot Username)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={botUsernameInput}
                      onChange={(e) => setBotUsernameInput(e.target.value)}
                      placeholder="saraqib_store_bot"
                      className="flex-1 border border-gray-200 rounded-xl p-3 text-sm dir-ltr text-left focus:outline-none focus:ring-2 focus:ring-purple-400"
                      dir="ltr"
                    />
                    <button
                      onClick={handleSaveUsername}
                      disabled={savingUsername}
                      className="bg-purple-100 text-purple-700 rounded-xl px-4 text-sm font-bold active:scale-[0.98] transition-transform disabled:opacity-50"
                    >
                      {savingUsername ? "..." : "حفظ"}
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">هذا الاسم يُستخدم في رابط ربط الحساب وتسجيل الدخول عبر تلجرام (بدون @)</p>
                </div>

                <div className="border border-gray-100 rounded-xl p-3 space-y-3 bg-gray-50/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                      <ShieldCheck size={16} className="text-emerald-500" /> شرط الانضمام إلى القناة
                    </div>
                    <button
                      onClick={() => setChannelGateEnabled((v) => !v)}
                      className={`w-11 h-6 rounded-full transition-colors relative ${channelGateEnabled ? "bg-purple-600" : "bg-gray-200"}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${channelGateEnabled ? "right-0.5" : "right-[22px]"}`} />
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    عند التفعيل، يُطلب من المستخدم الانضمام إلى القناة قبل استخدام البوت. يجب إضافة البوت كمشرف (Admin) داخل القناة ليتمكن من التحقق من الأعضاء.
                  </p>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">رابط القناة</label>
                    <input
                      type="text"
                      value={channelGateLink}
                      onChange={(e) => setChannelGateLink(e.target.value)}
                      placeholder="https://t.me/your_channel"
                      className="w-full border border-gray-200 rounded-xl p-3 text-sm dir-ltr text-left focus:outline-none focus:ring-2 focus:ring-purple-400"
                      dir="ltr"
                    />
                  </div>
                  <button
                    onClick={handleSaveChannelGate}
                    disabled={savingChannelGate}
                    className="w-full bg-emerald-600 text-white rounded-xl py-2.5 text-sm font-bold active:scale-[0.98] transition-transform disabled:opacity-50"
                  >
                    {savingChannelGate ? "جارِ الحفظ..." : "حفظ شرط الانضمام"}
                  </button>
                </div>

                <div>
                  <label className="text-xs text-gray-500 block mb-1">رسالة الترحيب</label>
                  <textarea
                    value={welcomeMsg}
                    onChange={(e) => setWelcomeMsg(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-400"
                    placeholder="اكتب رسالة الترحيب هنا..."
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Bell size={16} className="text-amber-500" /> إشعارات الطلبات
                  </div>
                  <button
                    onClick={() => setNotifyOrders(!notifyOrders)}
                    className={`w-11 h-6 rounded-full transition-colors relative ${notifyOrders ? "bg-purple-600" : "bg-gray-200"}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${notifyOrders ? "right-0.5" : "right-[22px]"}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Bell size={16} className="text-pink-500" /> إشعارات العروض والترويج
                  </div>
                  <button
                    onClick={() => setNotifyPromotions(!notifyPromotions)}
                    className={`w-11 h-6 rounded-full transition-colors relative ${notifyPromotions ? "bg-purple-600" : "bg-gray-200"}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${notifyPromotions ? "right-0.5" : "right-[22px]"}`} />
                  </button>
                </div>

                <button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="w-full bg-gray-800 text-white rounded-xl py-2.5 text-sm font-bold active:scale-[0.98] transition-transform disabled:opacity-50"
                >
                  {savingSettings ? "جارِ الحفظ..." : "حفظ الإعدادات"}
                </button>
                </div>
                )}
              </div>
            )}

            {status?.is_connected && tab === "admin" && (
              <div className="space-y-4">
                {/* Add Chat ID box */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                  <button
                    type="button"
                    onClick={() => setShowAddChatIdCard((v) => !v)}
                    className="w-full flex items-center justify-between gap-2"
                  >
                    <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <Users size={16} className="text-purple-500" /> إضافة Chat ID جديد
                    </h3>
                    <ChevronDown size={18} className={`text-gray-400 transition-transform ${showAddChatIdCard ? "rotate-180" : ""}`} />
                  </button>
                  {showAddChatIdCard && (
                  <>
                  <textarea
                    value={chatIdsInput}
                    onChange={(e) => setChatIdsInput(e.target.value)}
                    rows={3}
                    placeholder={"123456789\n-1009876543210"}
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm dir-ltr text-left resize-none focus:outline-none focus:ring-2 focus:ring-purple-400"
                    dir="ltr"
                  />
                  <p className="text-[11px] text-gray-400">
                    ضع هنا العديد من الـ Chat ID حتى بوت الأدمن يرسل الإشعارات لك فقط. للحصول عليه اضغط على زر (الحصول على Chat ID).
                  </p>
                  <a
                    href={GET_CHAT_ID_BOT_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-bold active:scale-[0.98] transition-transform"
                  >
                    <ExternalLink size={16} /> الحصول على Chat ID
                  </a>
                  <button
                    onClick={handleAddChatIds}
                    disabled={addingChatIds}
                    className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white rounded-xl py-2.5 text-sm font-bold active:scale-[0.98] transition-transform disabled:opacity-50"
                  >
                    {addingChatIds ? <Loader2 size={16} className="animate-spin" /> : null} إضافة
                  </button>
                  </>
                  )}
                </div>

                {/* Existing chat ids list */}
                {loadingChatIds ? (
                  <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gray-300" size={24} /></div>
                ) : adminChatIds.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center text-sm text-gray-400">
                    لا يوجد أي Chat ID مضاف بعد
                  </div>
                ) : (
                  adminChatIds.map((entry) => {
                    const draft = chatIdDrafts[entry.chat_id] || entry;
                    const isExpanded = !!expandedChatIds[entry.chat_id];
                    return (
                      <div key={entry.chat_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                        <button
                          type="button"
                          onClick={() => toggleChatIdExpanded(entry.chat_id)}
                          className="w-full flex items-center justify-between gap-2 text-right"
                        >
                          <div className="flex-1 min-w-0">
                            {entry.label && (
                              <div className="text-sm font-bold text-gray-800 truncate">{entry.label}</div>
                            )}
                            <div className="text-xs text-gray-500 dir-ltr text-left font-mono truncate">{entry.chat_id}</div>
                          </div>
                          <ChevronDown size={18} className={`text-gray-400 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </button>

                        {isExpanded && (
                          <div className="space-y-3 pt-1 border-t border-gray-100">
                            <div className="flex items-center justify-between gap-2 pt-2">
                              <div className="flex-1">
                                <label className="text-[11px] text-gray-400 block mb-1">اسم/تسمية (اختياري)</label>
                                <input
                                  type="text"
                                  value={draft.label}
                                  onChange={(e) => updateDraft(entry.chat_id, { label: e.target.value })}
                                  placeholder="مثال: أحمد - المدير الرئيسي"
                                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                                />
                              </div>
                              <button
                                onClick={() => handleDeleteChatId(entry.chat_id)}
                                disabled={deletingChatId === entry.chat_id}
                                className="p-2.5 bg-red-50 text-red-600 rounded-xl disabled:opacity-50 shrink-0"
                              >
                                {deletingChatId === entry.chat_id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                              </button>
                            </div>
                            <div className="text-xs text-gray-500 dir-ltr text-left font-mono bg-gray-50 rounded-lg px-3 py-2">
                              Chat ID: {entry.chat_id}
                            </div>

                            <div>
                              <h4 className="text-xs font-bold text-gray-600 flex items-center gap-1.5 mb-2">
                                <ShieldCheck size={14} className="text-purple-500" /> الصلاحيات
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {PERMISSION_LABELS.map((p) => (
                                  <label key={p.key} className="flex items-center gap-2 text-xs text-gray-700 bg-gray-50 rounded-lg px-2.5 py-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={!!draft.permissions?.[p.key]}
                                      onChange={() => toggleDraftPermission(entry.chat_id, p.key)}
                                      className="accent-purple-600 w-4 h-4"
                                    />
                                    {p.label}
                                  </label>
                                ))}
                              </div>
                            </div>

                            <div>
                              <h4 className="text-xs font-bold text-gray-600 flex items-center gap-1.5 mb-2">
                                <Bell size={14} className="text-amber-500" /> الإشعارات
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {NOTIFICATION_LABELS.map((n) => (
                                  <label key={n.key} className="flex items-center gap-2 text-xs text-gray-700 bg-gray-50 rounded-lg px-2.5 py-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={!!draft.notifications?.[n.key]}
                                      onChange={() => toggleDraftNotification(entry.chat_id, n.key)}
                                      className="accent-purple-600 w-4 h-4"
                                    />
                                    {n.label}
                                  </label>
                                ))}
                              </div>
                            </div>

                            <button
                              onClick={() => handleSaveChatId(entry.chat_id)}
                              disabled={savingChatId === entry.chat_id}
                              className="w-full flex items-center justify-center gap-2 bg-gray-800 text-white rounded-xl py-2.5 text-sm font-bold active:scale-[0.98] transition-transform disabled:opacity-50"
                            >
                              {savingChatId === entry.chat_id ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                              حفظ التغييرات
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )
      )}

      {/* Connect Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowModal(false)}>
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-800">{tab === "user" ? "ربط بوت المستخدمين" : "ربط بوت الأدمن"}</h3>
            <div>
              <label className="text-xs text-gray-500 block mb-1">توكن البوت (Bot Token)</label>
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => { setTokenInput(e.target.value); setTestResult(null); }}
                placeholder="1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                className="w-full border border-gray-200 rounded-xl p-3 text-sm dir-ltr text-left focus:outline-none focus:ring-2 focus:ring-purple-400"
                dir="ltr"
              />
            </div>

            {testResult && (
              <div className={`flex items-center gap-2 text-sm rounded-lg p-3 ${testResult.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {testResult.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                <span>{testResult.message}</span>
              </div>
            )}

            {tab === "admin" && (
              <div>
                <label className="text-xs text-gray-500 block mb-1">Chat ID (يمكن إضافة أكثر من واحد)</label>
                <textarea
                  value={chatIdsInput}
                  onChange={(e) => setChatIdsInput(e.target.value)}
                  rows={3}
                  placeholder={"123456789\n-1009876543210"}
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm dir-ltr text-left resize-none focus:outline-none focus:ring-2 focus:ring-purple-400"
                  dir="ltr"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  ضع هنا العديد من الـ Chat ID حتى بوت الأدمن يرسل الإشعارات لك فقط. للحصول عليه اضغط على زر (الحصول على Chat ID).
                </p>
                <a
                  href={GET_CHAT_ID_BOT_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-bold active:scale-[0.98] transition-transform"
                >
                  <ExternalLink size={16} /> الحصول على Chat ID
                </a>
                <button
                  onClick={handleAddChatIds}
                  disabled={addingChatIds}
                  className="mt-2 w-full flex items-center justify-center gap-2 bg-gray-800 text-white rounded-xl py-2.5 text-sm font-bold active:scale-[0.98] transition-transform disabled:opacity-50"
                >
                  {addingChatIds ? <Loader2 size={16} className="animate-spin" /> : null} إضافة Chat ID
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleTest}
                disabled={testing}
                className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-2.5 text-sm font-bold active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {testing ? <Loader2 size={16} className="animate-spin" /> : null} اختبار
              </button>
              <button
                onClick={handleSaveToken}
                disabled={saving}
                className="flex-1 bg-purple-600 text-white rounded-xl py-2.5 text-sm font-bold active:scale-[0.98] transition-transform disabled:opacity-50"
              >
                {saving ? "جارِ الحفظ..." : "حفظ"}
              </button>
            </div>
            <button onClick={() => setShowModal(false)} className="w-full text-center text-xs text-gray-400 pt-1">إلغاء</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TelegramBotsSettingsPage;
