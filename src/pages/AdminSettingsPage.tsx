import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowRight,
  Settings,
  Phone,
  ShieldCheck,
  Database,
  Download,
  Upload,
  Eraser,
  RefreshCw,
  Lock,
  AlertTriangle,
  Wifi,
  ChevronDown,
  Eye,
  EyeOff,
  Bell,
  BellOff,
  ShoppingCart,
  CreditCard,
  UserCheck,
  KeyRound,
  Wrench,
  ScrollText,
  UserPlus,
  LogIn,
  Megaphone,
  Link2,
  Loader2,
} from "lucide-react";
import { showConfirm } from "../components/CustomDialogContainer";

interface AdminSettingsPageProps {
  setView: (val: any) => void;
  supportWhatsapp: string;
  setSupportWhatsapp: (val: string) => void;
  privacyPolicy: string;
  setPrivacyPolicy: (val: string) => void;
  handleUpdateSetting: (key: string, value: string) => Promise<void>;
  handleExportDB: (format?: "json" | "csv" | "txt") => Promise<void>;
  exportDBBusy?: boolean;
  handleImportDB: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  importDBBusy?: boolean;
  handleClearDB: () => Promise<void>;
  handleCloudSync: () => Promise<void>;
  newAdminPass: string;
  setNewAdminPass: (val: string) => void;
  handleChangeAdminPassword: () => Promise<void>;
  maintenanceMode: boolean;
  maintenanceIp: string;
  setMaintenanceIp: (val: string) => void;
  entryPopupEnabled: boolean;
  setEntryPopupEnabled: (val: boolean) => void;
  entryPopupText: string;
  setEntryPopupText: (val: string) => void;
  entryPopupLink: string;
  setEntryPopupLink: (val: string) => void;
  entryPopupFrequency: string;
  setEntryPopupFrequency: (val: string) => void;
  handleSaveEntryPopup: () => Promise<void>;
  adminFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

type SectionKey = "contact" | "privacy" | "data" | "maintenance" | "password" | "notifications" | "entry_popup";

const NOTIF_CATEGORIES: { key: string; label: string; icon: React.ReactNode }[] = [
  { key: "orders", label: "الطلبات الجديدة", icon: <ShoppingCart size={14} className="text-blue-500" /> },
  { key: "payments", label: "المدفوعات وعمليات الشحن", icon: <CreditCard size={14} className="text-emerald-500" /> },
  { key: "user_login", label: "تسجيل دخول مستخدم", icon: <UserCheck size={14} className="text-cyan-500" /> },
  { key: "admin_login", label: "دخول لوحة التحكم (الأدمن الرئيسي)", icon: <LogIn size={14} className="text-indigo-500" /> },
  { key: "sub_admin_login", label: "دخول مسؤول ثانوي للوحة التحكم", icon: <LogIn size={14} className="text-purple-500" /> },
  { key: "sub_admin_added", label: "إضافة مسؤول ثانوي جديد", icon: <UserPlus size={14} className="text-pink-500" /> },
  { key: "password_change", label: "تغيير كلمة المرور", icon: <KeyRound size={14} className="text-red-500" /> },
  { key: "maintenance_mode", label: "تفعيل/إيقاف وضع الصيانة", icon: <Wrench size={14} className="text-yellow-600" /> },
  { key: "admin_logs", label: "كل سجلات لوحة التحكم", icon: <ScrollText size={14} className="text-gray-500" /> },
];

function SettingsSection({
  id,
  title,
  icon,
  isOpen,
  onToggle,
  children,
}: {
  id: SectionKey;
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: (id: SectionKey) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-50 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => onToggle(id)}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between p-4 text-right"
      >
        <h4 className="font-bold text-sm text-gray-700 flex items-center gap-2">{icon}{title}</h4>
        <ChevronDown size={18} className={`text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

export default function AdminSettingsPage({
  setView,
  supportWhatsapp,
  setSupportWhatsapp,
  privacyPolicy,
  setPrivacyPolicy,
  handleUpdateSetting,
  handleExportDB,
  exportDBBusy = false,
  handleImportDB,
  importDBBusy = false,
  handleClearDB,
  handleCloudSync,
  newAdminPass,
  setNewAdminPass,
  handleChangeAdminPassword,
  maintenanceMode,
  maintenanceIp,
  setMaintenanceIp,
  entryPopupEnabled,
  setEntryPopupEnabled,
  entryPopupText,
  setEntryPopupText,
  entryPopupLink,
  setEntryPopupLink,
  entryPopupFrequency,
  setEntryPopupFrequency,
  handleSaveEntryPopup,
  adminFetch,
}: AdminSettingsPageProps) {
  const [currentIp, setCurrentIp] = useState("");
  const [savingMaintenance, setSavingMaintenance] = useState(false);
  const [exportFormat, setExportFormat] = useState<"json" | "csv" | "txt">("json");
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    contact: false,
    privacy: false,
    data: false,
    maintenance: false,
    password: false,
    notifications: false,
    entry_popup: false,
  });

  // ── إشعارات المتصفح للأدمن ──
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifCategories, setNotifCategories] = useState<Record<string, boolean>>({});
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifPermission, setNotifPermission] = useState<string>(typeof Notification !== "undefined" ? Notification.permission : "default");
  const [notifError, setNotifError] = useState("");

  const loadNotificationSettings = useCallback(async () => {
    setNotifLoading(true);
    try {
      const res = await adminFetch("/api/admin/notification-settings");
      const data = await res.json();
      setNotifEnabled(!!data.enabled);
      setNotifCategories(data.categories || {});
    } catch {
      /* تجاهل بصمت */
    } finally {
      setNotifLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => {
    loadNotificationSettings();
  }, [loadNotificationSettings]);

  const persistNotificationSettings = async (enabled: boolean, categories: Record<string, boolean>) => {
    setNotifSaving(true);
    try {
      await adminFetch("/api/admin/notification-settings", {
        method: "PUT",
        body: JSON.stringify({ enabled, categories }),
      });
    } catch {
      /* تجاهل بصمت */
    } finally {
      setNotifSaving(false);
    }
  };

  const subscribeAdminPush = async () => {
    setNotifError("");
    try {
      if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        setNotifError("المتصفح لا يدعم الإشعارات");
        return false;
      }
      if (Notification.permission === "default") await Notification.requestPermission();
      setNotifPermission(Notification.permission);
      if (Notification.permission !== "granted") {
        setNotifError("تم رفض إذن الإشعارات من المتصفح");
        return false;
      }
      const registration = await navigator.serviceWorker.ready;
      const keyRes = await fetch("/api/push/key");
      const { publicKey } = await keyRes.json();
      if (!publicKey) { setNotifError("تعذّر جلب مفتاح الإشعارات"); return false; }

      const existingSub = await registration.pushManager.getSubscription();
      if (existingSub) await existingSub.unsubscribe();

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      });

      await adminFetch("/api/admin/push/subscribe", {
        method: "POST",
        body: JSON.stringify({ subscription }),
      });
      return true;
    } catch {
      setNotifError("تعذّر تفعيل الإشعارات، حاول مجدداً");
      return false;
    }
  };

  const toggleNotifications = async () => {
    if (!notifEnabled) {
      const ok = await subscribeAdminPush();
      if (!ok) return;
      const allTrue: Record<string, boolean> = {};
      NOTIF_CATEGORIES.forEach(c => { allTrue[c.key] = notifCategories[c.key] ?? true; });
      setNotifEnabled(true);
      setNotifCategories(allTrue);
      await persistNotificationSettings(true, allTrue);
    } else {
      setNotifEnabled(false);
      await persistNotificationSettings(false, notifCategories);
      try {
        const registration = await navigator.serviceWorker.ready;
        const existingSub = await registration.pushManager.getSubscription();
        if (existingSub) await existingSub.unsubscribe();
      } catch { /* تجاهل */ }
      await adminFetch("/api/admin/push/unsubscribe", { method: "POST" }).catch(() => {});
    }
  };

  const toggleCategory = async (key: string) => {
    const updated = { ...notifCategories, [key]: !notifCategories[key] };
    setNotifCategories(updated);
    await persistNotificationSettings(notifEnabled, updated);
  };

  const toggleSection = (id: SectionKey) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    fetch("/api/maintenance-status")
      .then(r => r.json())
      .then(d => setCurrentIp(d?.ip || ""))
      .catch(() => {});
  }, []);

  const toggleMaintenance = async () => {
    setSavingMaintenance(true);
    await handleUpdateSetting("maintenance_mode", (!maintenanceMode).toString());
    setSavingMaintenance(false);
  };

  return (
    <div className="px-4 space-y-3 pb-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 pt-1 pb-2">
        <button
          onClick={() => setView({ type: "main" })}
          className="w-10 h-10 shrink-0 flex items-center justify-center bg-gray-100 rounded-full active:scale-90 transition-transform"
          aria-label="رجوع"
        >
          <ArrowRight size={18} className="text-gray-600" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-gray-900 leading-tight flex items-center gap-2">
            <Settings size={18} /> الإعدادات
          </h2>
          <p className="text-[11px] text-gray-400 leading-tight">الدعم الفني، سياسة الخصوصية، قاعدة البيانات</p>
        </div>
      </div>

      {/* التواصل */}
      <SettingsSection id="contact" title="التواصل" icon={<Phone size={15} className="text-blue-500" />} isOpen={openSections.contact} onToggle={toggleSection}>
        <div className="flex gap-2">
          <input type="text" value={supportWhatsapp} onChange={e => setSupportWhatsapp(e.target.value)} placeholder="رقم واتساب الدعم" className="flex-1 p-3 bg-white rounded-lg text-sm outline-none border border-gray-100" />
          <button onClick={() => handleUpdateSetting('support_whatsapp', supportWhatsapp)} className="bg-blue-600 text-white px-4 rounded-lg text-sm font-bold">حفظ</button>
        </div>
      </SettingsSection>

      {/* السياسة */}
      <SettingsSection id="privacy" title="سياسة الخصوصية" icon={<ShieldCheck size={15} className="text-green-500" />} isOpen={openSections.privacy} onToggle={toggleSection}>
        <textarea value={privacyPolicy} onChange={e => setPrivacyPolicy(e.target.value)} className="w-full p-3 bg-white rounded-lg text-sm outline-none h-28 resize-none border border-gray-100" placeholder="نص سياسة الخصوصية..." />
        <button onClick={() => handleUpdateSetting('privacy_policy', privacyPolicy)} className="w-full bg-green-600 text-white py-2.5 rounded-lg font-bold text-sm">حفظ السياسة</button>
      </SettingsSection>

      {/* البيانات */}
      <SettingsSection id="data" title="البيانات" icon={<Database size={15} className="text-orange-500" />} isOpen={openSections.data} onToggle={toggleSection}>
        <div>
          <label className="text-xs text-gray-500 block mb-1.5">صيغة التصدير:</label>
          <div className="grid grid-cols-3 gap-2">
            {(["json", "csv", "txt"] as const).map(fmt => (
              <button
                key={fmt}
                type="button"
                onClick={() => setExportFormat(fmt)}
                className={`py-2 rounded-lg text-xs font-bold border uppercase ${exportFormat === fmt ? "bg-orange-600 text-white border-orange-600" : "bg-white text-gray-600 border-gray-100"}`}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleExportDB(exportFormat)}
            disabled={exportDBBusy}
            className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 py-3 rounded-lg text-xs font-bold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exportDBBusy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {exportDBBusy ? "جارٍ التصدير..." : "تصدير البيانات"}
          </button>
          <label
            className={`flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 py-3 rounded-lg text-xs font-bold hover:bg-gray-50 ${importDBBusy ? "opacity-50 cursor-not-allowed pointer-events-none" : "cursor-pointer"}`}
          >
            {importDBBusy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {importDBBusy ? "جارٍ الاستيراد..." : "استيراد البيانات"}
            <input type="file" className="hidden" accept=".json,.csv,.txt" disabled={importDBBusy} onChange={handleImportDB} />
          </label>
        </div>
        <button onClick={handleClearDB} className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 py-3 rounded-lg text-xs font-bold hover:bg-red-100 border border-red-100">
          <Eraser size={14} /> مسح قاعدة البيانات
        </button>
        <button onClick={handleCloudSync} className="w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-600 py-3 rounded-lg text-xs font-bold hover:bg-blue-100 border border-blue-100">
          <RefreshCw size={14} /> مزامنة السحابة
        </button>
      </SettingsSection>

      {/* وضع الصيانة */}
      <SettingsSection id="maintenance" title="وضع الصيانة" icon={<AlertTriangle size={15} className="text-yellow-500" />} isOpen={openSections.maintenance} onToggle={toggleSection}>
        <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-100">
          <span className={`text-xs font-bold ${maintenanceMode ? "text-red-600" : "text-green-600"}`}>
            {maintenanceMode ? "🔴 الموقع في وضع الصيانة الآن" : "🟢 الموقع يعمل بشكل طبيعي"}
          </span>
          <button
            onClick={toggleMaintenance}
            disabled={savingMaintenance}
            className={`px-4 py-2 rounded-lg text-xs font-bold disabled:opacity-50 ${maintenanceMode ? "bg-red-600 text-white" : "bg-gray-800 text-white"}`}
          >
            {maintenanceMode ? "إيقاف الصيانة" : "تفعيل وضع الصيانة"}
          </button>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            dir="ltr"
            value={maintenanceIp}
            onChange={e => setMaintenanceIp(e.target.value)}
            placeholder="192.168.1.1"
            className="flex-1 p-3 bg-white rounded-lg text-sm outline-none border border-gray-100 text-left"
          />
          <button onClick={() => handleUpdateSetting('maintenance_allowed_ip', maintenanceIp)} className="bg-blue-600 text-white px-4 rounded-lg text-sm font-bold">حفظ</button>
        </div>

        {currentIp && (
          <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-gray-100">
            <span className="text-[11px] text-gray-400 flex items-center gap-1"><Wifi size={12} /> IP الخاص بك الآن: <span dir="ltr" className="font-mono text-gray-600">{currentIp}</span></span>
            <button onClick={() => setMaintenanceIp(currentIp)} className="text-[11px] text-blue-600 font-bold underline">استخدام هذا الـ IP</button>
          </div>
        )}

        <p className="text-[11px] text-gray-400 leading-relaxed">
          عند التفعيل، تظهر للزوار صفحة "الموقع في وضع الصيانة" ولا يُسمح بالدخول لواجهة المستخدم إلا من الـ IP المحدد أعلاه. لوحة التحكم تبقى متاحة دائماً لك لإيقاف الصيانة.
        </p>
      </SettingsSection>

      {/* الإشعارات */}
      <SettingsSection id="notifications" title="إشعارات المتصفح" icon={<Bell size={15} className="text-purple-500" />} isOpen={openSections.notifications} onToggle={toggleSection}>
        {notifLoading ? (
          <p className="text-xs text-gray-400">جاري التحميل...</p>
        ) : (
          <>
            <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-100">
              <div className="flex items-center gap-2">
                {notifEnabled ? <Bell size={16} className="text-purple-600" /> : <BellOff size={16} className="text-gray-400" />}
                <span className="text-xs font-bold text-gray-700">
                  {notifEnabled ? "الإشعارات مفعّلة على هذا المتصفح" : "تفعيل الإشعارات"}
                </span>
              </div>
              <button
                onClick={toggleNotifications}
                disabled={notifSaving}
                className={`px-4 py-2 rounded-lg text-xs font-bold disabled:opacity-50 ${notifEnabled ? "bg-red-50 text-red-600 border border-red-100" : "bg-purple-600 text-white"}`}
              >
                {notifEnabled ? "إلغاء التفعيل" : "تفعيل الإشعارات"}
              </button>
            </div>

            {notifError && <p className="text-[11px] text-red-500">{notifError}</p>}

            {notifEnabled && (
              <div className="space-y-1.5">
                <p className="text-[11px] text-gray-400 mb-1">اختر الإشعارات التي تريد استلامها:</p>
                {NOTIF_CATEGORIES.map(cat => (
                  <label key={cat.key} className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-gray-100 cursor-pointer">
                    <span className="flex items-center gap-2 text-xs text-gray-700">{cat.icon}{cat.label}</span>
                    <input
                      type="checkbox"
                      checked={!!notifCategories[cat.key]}
                      onChange={() => toggleCategory(cat.key)}
                      className="w-4 h-4 accent-purple-600"
                    />
                  </label>
                ))}
              </div>
            )}

            <p className="text-[11px] text-gray-400 leading-relaxed">
              عند التفعيل، يرسل الموقع إشعاراً فورياً لهذا المتصفح مع تفاصيل الحدث الفعلية (اسم المستخدم/الطلب/المبلغ...) بحسب الفئات المُختارة أعلاه فقط.
            </p>
          </>
        )}
      </SettingsSection>

      {/* إشعار الدخول (Entry Popup) */}
      <SettingsSection id="entry_popup" title="إشعار الدخول (نافذة منبثقة)" icon={<Megaphone size={15} className="text-rose-500" />} isOpen={openSections.entry_popup} onToggle={toggleSection}>
        <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-100">
          <span className={`text-xs font-bold ${entryPopupEnabled ? "text-green-600" : "text-gray-500"}`}>
            {entryPopupEnabled ? "🟢 الإشعار مفعّل الآن" : "⚪ الإشعار معطّل حالياً"}
          </span>
          <button
            type="button"
            onClick={() => setEntryPopupEnabled(!entryPopupEnabled)}
            className={`w-11 h-6 rounded-full transition-colors relative ${entryPopupEnabled ? "bg-rose-600" : "bg-gray-200"}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${entryPopupEnabled ? "right-0.5" : "right-[22px]"}`} />
          </button>
        </div>

        <textarea
          value={entryPopupText}
          onChange={e => setEntryPopupText(e.target.value)}
          className="w-full p-3 bg-white rounded-lg text-sm outline-none h-24 resize-none border border-gray-100"
          placeholder="اكتب نص الإشعار الذي سيظهر للزائر عند دخول الموقع..."
        />

        <div className="relative">
          <Link2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            dir="ltr"
            value={entryPopupLink}
            onChange={e => setEntryPopupLink(e.target.value)}
            placeholder="https://wa.me/xxxxxxx أو https://t.me/xxxxxxx أو رابط الموقع"
            className="w-full p-3 pr-9 bg-white rounded-lg text-sm outline-none border border-gray-100 text-left"
          />
        </div>
        <p className="text-[11px] text-gray-400 leading-relaxed -mt-1">
          اختياري: رابط واتساب/تلجرام/موقع، يظهر كزر داخل الإشعار. اتركه فارغاً لعدم إظهار أي زر.
        </p>

        <div>
          <label className="text-xs text-gray-500 block mb-1.5">إظهار الإشعار كل:</label>
          <div className="grid grid-cols-4 gap-2">
            {["1", "2", "3", "4"].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setEntryPopupFrequency(n)}
                className={`py-2 rounded-lg text-xs font-bold border ${entryPopupFrequency === n ? "bg-rose-600 text-white border-rose-600" : "bg-white text-gray-600 border-gray-100"}`}
              >
                {n === "1" ? "كل جلسة" : `كل ${n} جلسات`}
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleSaveEntryPopup} className="w-full bg-rose-600 text-white py-2.5 rounded-lg font-bold text-sm">
          حفظ إعدادات الإشعار
        </button>

        <p className="text-[11px] text-gray-400 leading-relaxed">
          عند التفعيل، تظهر هذه النافذة للزائر في منتصف الشاشة بالصفحة الرئيسية فقط، بلون المتجر المُعتمد من إعدادات المظهر.
        </p>
      </SettingsSection>

      {/* تغيير كلمة السر */}
      <SettingsSection id="password" title="تغيير كلمة السر" icon={<Lock size={15} className="text-red-500" />} isOpen={openSections.password} onToggle={toggleSection}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={showAdminPass ? "text" : "password"}
              placeholder="كلمة المرور الجديدة"
              className="w-full p-3 pl-10 bg-white rounded-lg text-sm outline-none border border-gray-100"
              value={newAdminPass}
              onChange={e => setNewAdminPass(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowAdminPass(v => !v)}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label={showAdminPass ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
            >
              {showAdminPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <button
            onClick={() => {
              if (!newAdminPass) return;
              showConfirm("هل أنت متأكد من تغيير كلمة السر؟ سيتم تسجيل خروج جميع الجلسات الأخرى فوراً.", "تغيير كلمة السر", () => {
                handleChangeAdminPassword();
              }, true);
            }}
            className="bg-gray-800 text-white px-4 rounded-lg text-sm font-bold"
          >
            حفظ
          </button>
        </div>
      </SettingsSection>
    </div>
  );
}
