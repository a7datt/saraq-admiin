import React, { useState, useEffect, useRef, useMemo } from "react";
import { uploadImage } from "../utils/uploadImage";
import {
  Home,
  Wallet,
  ShoppingBag,
  Zap,
  Hash,
  User,
  Bell,
  KeyRound,
  Menu,
  ChevronRight,
  ChevronDown,
  Plus,
  Image as ImageIcon,
  LogOut,
  ShieldCheck,
  Settings,
  MessageSquare,
  Ticket,
  LayoutGrid,
  Search,
  Lock,
  ExternalLink,
  Upload,
  Download,
  RefreshCw,
  Star,
  Crown,
  X,
  BarChart2,
  Filter,
  DollarSign,
  Shield,
  Tag,
  Send,
  Pencil,
  Trash2,
  Palette,
  CheckCircle,
  Store,
  Package,
  AlertTriangle,
  Plug,
  Bot,
  ClipboardList,
  Users,
  CreditCard,
  Key,
  Globe,
  Eye,
  ImageOff,
  Award,
  Percent,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  AdminPanelProps,
} from "../types";
import { showToast } from "../components/ToastContainer";
import OptimizedImage from "../components/OptimizedImage";
import { showDialog, showConfirm, showPromptDialog } from "../components/CustomDialogContainer";
import AdminUserCard from "../components/AdminUserCard";
import AdminImageUpload from "../components/AdminImageUpload";
import NameVerificationFields, { NameVerificationValue } from "../components/NameVerificationFields";
import MoreDetailsSection from "../components/MoreDetailsSection";
import FieldKeyboardTypePicker, { FieldKeyboardType } from "../components/FieldKeyboardTypePicker";
import ProductCheckoutPreview from "../components/ProductCheckoutPreview";
import NameVerificationKeysModal from "../components/NameVerificationKeysModal";
import CustomSelect from "../components/CustomSelect";
import { ensureDefaultFields, ensurePaymentMethodDefaultFields, PaymentFieldDef } from "../utils/defaultFields";
import CurrenciesAdminPage from "./CurrenciesAdminPage";
import AdminHomePage from "./AdminHomePage";
import AdminRanksPage from "./AdminRanksPage";
import AdminBulkMarginPage from "./AdminBulkMarginPage";
import AdminStatsPage from "./AdminStatsPage";
import SessionsActivityAdminPage from "./SessionsActivityAdminPage";
import DevManagementPage from "./DevManagementPage";
import AdminAppearancePage from "./AdminAppearancePage";
import AdminOrdersAdminPage from "./AdminOrdersAdminPage";
import AdminTransactionsPage from "./AdminTransactionsPage";
import AdminElementsPage, { type AdminElementsPageHandle } from "./AdminElementsPage";
import InventoryPage from "./InventoryPage";
import InventoryManagerModal from "../components/InventoryManagerModal";
import PaymentGatewaysAdminPage from "./PaymentGatewaysAdminPage";
import AdminUsersPage from "./AdminUsersPage";
import AdminPublicApiSettingsPage from "./AdminPublicApiSettingsPage";
import AdminApiPage from "./AdminApiPage";
import ChatSettingsPage from "./ChatSettingsPage";
import TelegramBotsSettingsPage from "./TelegramBotsSettingsPage";
import AdminSettingsPage from "./AdminSettingsPage";
import SubAdminsPage from "./SubAdminsPage";
import { canManageSubAdmins, hasAnyPermissionInModule, isSubAdmin, clearAdminSession, getAdminRole } from "../utils/permissions";
import { STORE_TYPE_OPTIONS, StoreTypePickerField } from "../components/StoreTypePickerField";
import SubscriptionCountdown from "../components/SubscriptionCountdown";

export interface AdminPageProps extends AdminPanelProps {
  adminFetch: (url: string, options?: RequestInit) => Promise<Response>;
  handleChangeAdminPassword: () => Promise<void>;
  newAdminPass: string;
  setNewAdminPass: (val: string) => void;
  adminChatView: React.ReactNode;
  setAdminAuth: (val: boolean) => void;
  focusTarget?: { type: string; id: any } | null;
  setFocusTarget?: (val: { type: string; id: any } | null) => void;
}

// تحقق تلقائي بسيط من صحة رابط الصورة
const isLikelyImageUrl = (url: string) => {
  if (!url || !/^https?:\/\//i.test(url)) return false;
  return /\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i.test(url) || /images|imgur|cloudinary|res\.cloudinary|ibb\.co|githubusercontent/i.test(url);
};

const AdminNotifModal = ({ onClose, handleSendNotification, adminFetch }: { onClose: () => void, handleSendNotification: (userId: number | null, title: string, body: string) => Promise<void>, adminFetch: (url: string, options?: RequestInit) => Promise<Response> }) => {
  const [target, setTarget] = useState<"all"|"one">("all");
  const [uid, setUid] = useState("");
  const [notifSearchQuery, setNotifSearchQuery] = useState("");
  const [notifSearchResults, setNotifSearchResults] = useState<any[]>([]);
  const [notifSelectedUser, setNotifSelectedUser] = useState<any>(null);
  const [notifSearchLoading, setNotifSearchLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const q = notifSearchQuery.trim();
    if (!q || (notifSelectedUser && q === (notifSelectedUser.name || notifSelectedUser.email || notifSelectedUser.phone || String(notifSelectedUser.id)))) {
      setNotifSearchResults([]);
      return;
    }
    setNotifSearchLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await adminFetch(`/api/admin/users/search?q=${encodeURIComponent(q)}`);
        if (res.ok) setNotifSearchResults(await res.json());
      } catch {
        // ignore
      } finally {
        setNotifSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [notifSearchQuery]);

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[60] bg-black/50 flex items-end" onClick={onClose}>
      <motion.div initial={{y:80}} animate={{y:0}} exit={{y:80}} className="bg-white w-full rounded-t-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-800 flex items-center gap-2"><Bell size={18}/>إرسال إشعار</h3>
          <button onClick={onClose} className="text-gray-400"><X size={20}/></button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTarget("all")} className={`flex-1 py-2 rounded-lg text-xs font-bold ${target==="all"?"bg-[var(--brand)] text-white":"bg-gray-100 text-gray-600"}`}>للجميع</button>
          <button onClick={() => setTarget("one")} className={`flex-1 py-2 rounded-lg text-xs font-bold ${target==="one"?"bg-[var(--brand)] text-white":"bg-gray-100 text-gray-600"}`}>لمستخدم معين</button>
        </div>
        {target==="one" && (
          <div className="relative">
            <input
              type="text"
              placeholder="ابحث بالاسم، البريد الإلكتروني، رقم الهاتف أو رقم الدخول"
              className="w-full p-3 bg-gray-50 rounded-lg text-sm outline-none"
              value={notifSearchQuery}
              onChange={e => { setNotifSearchQuery(e.target.value); setNotifSelectedUser(null); setUid(""); }}
            />
            {notifSearchLoading && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">...جارٍ البحث</span>
            )}
            {notifSearchResults.length > 0 && (
              <div className="absolute z-10 top-full mt-1 w-full bg-white border border-gray-100 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                {notifSearchResults.map((u: any) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      setNotifSelectedUser(u);
                      setUid(String(u.id));
                      setNotifSearchQuery(u.name || u.email || u.phone || String(u.id));
                      setNotifSearchResults([]);
                    }}
                    className="w-full text-right p-3 hover:bg-gray-50 flex flex-col border-b border-gray-50 last:border-0"
                  >
                    <span className="text-sm font-bold text-gray-800">{u.name || `مستخدم #${u.id}`}</span>
                    <span className="text-[11px] text-gray-400">#{u.id} · {u.email || "—"} · {u.phone || "—"}</span>
                  </button>
                ))}
              </div>
            )}
            {notifSelectedUser && (
              <div className="mt-2 text-[11px] text-gray-500 bg-gray-50 rounded-lg p-2">
                تم اختيار: <span className="font-bold text-gray-700">{notifSelectedUser.name || `#${notifSelectedUser.id}`}</span> (رقم الدخول #{notifSelectedUser.id})
              </div>
            )}
          </div>
        )}
        <input type="text" placeholder="عنوان الإشعار" className="w-full p-3 bg-gray-50 rounded-lg text-sm outline-none" value={title} onChange={e => setTitle(e.target.value)}/>
        <textarea placeholder="نص الإشعار" className="w-full p-3 bg-gray-50 rounded-lg text-sm outline-none h-20 resize-none" value={body} onChange={e => setBody(e.target.value)}/>
        <button disabled={sending||!title||!body||(target==="one"&&!uid)} onClick={async () => { setSending(true); await handleSendNotification(target==="one"&&uid?parseInt(uid):null, title, body); setSending(false); onClose(); }}
          className="w-full bg-[var(--brand)] text-white py-3.5 rounded-lg font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2">
          <Send size={16}/>{sending?"جاري الإرسال...":"إرسال الإشعار"}
        </button>
      </motion.div>
    </motion.div>
  );
};

// ── StoreTypePickerField (moved to ../components/StoreTypePickerField for shared use) ──

const AdminAhminixTab = ({ categories, subcategories, subSubCategories, fetchCategories, fetchSubcategories, fetchSubSubCategories, adminFetch }: any) => {

  // ── [PROVIDER-PRODUCTS] المنتجات الحالية المضافة من المزود المختار ─────────────
  const elementsEditorRef = useRef<AdminElementsPageHandle>(null);
  const [showCurrentProducts, setShowCurrentProducts] = useState(false);
  const [showImportSection, setShowImportSection] = useState(false);
  const [currentProducts, setCurrentProducts] = useState<any[]>([]);
  const [loadingCurrentProducts, setLoadingCurrentProducts] = useState(false);
  const [currentProductsSearch, setCurrentProductsSearch] = useState("");
  const [busyProductId, setBusyProductId] = useState<number | null>(null);
  // نافذة تأكيد الحذف بثلاثة خيارات (إلغاء / تعطيل / حذف نهائي)
  const [deleteDialog, setDeleteDialog] = useState<null | { product: any; hasOrders: boolean }>(null);
  // عرض المنتجات: "all" = قائمة واحدة لكل المنتجات، "sections" = تصفّح عبر الأقسام (قسم رئيسي ← فرعي ← فرع فرعي)
  const [currentViewMode, setCurrentViewMode] = useState<"all" | "sections">("all");
  // مسار التصفح داخل وضع الأقسام: مفاتيح مثل "cat:3" / "sub:7" / "subsub:2" أو "root"
  const [sectionNode, setSectionNode] = useState<{ level: "root" | "cat" | "sub" | "subsub"; id?: number }>({ level: "root" });
  // التحديد المتعدد (للحذف/التعطيل الجماعي)
  const [selectedCurrentIds, setSelectedCurrentIds] = useState<number[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkDialog, setBulkDialog] = useState<null | { ids: number[]; ordersCount: number | null }>(null);

  // ── State: قائمة المزودين ──────────────────────────────────────────────
  const [providers, setProviders] = useState<any[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);

  // ── State: نموذج إضافة / تعديل مزود ─────────────────────────────────
  const [showProviderForm, setShowProviderForm] = useState(false);
  const [editingProvider, setEditingProvider] = useState<any>(null); // null = إضافة جديد
  const [providerFormData, setProviderFormData] = useState({ name: "", base_url: "", api_token: "", notes: "", provider_type: "standard" });
  const [savingProvider, setSavingProvider] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // ── State: المزود المختار للعمل ────────────────────────────────────────
  const [selectedProviderId, setSelectedProviderId] = useState<number | null>(null);
  const selectedProvider = providers.find(p => p.id === selectedProviderId) || null;

  // ── State: معلومات الحساب ─────────────────────────────────────────────
  const [providerProfile, setProviderProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // ── State: منتجات المزود ─────────────────────────────────────────────
  const [providerProducts, setProviderProducts] = useState<any[]>([]);
  const [productsFetched, setProductsFetched] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  // [FIX] عدد الصفوف المعروضة من قائمة منتجات المزود — كانت القائمة تُعرض كاملة دفعة واحدة
  // (قد تصل لمئات المنتجات)، وحين تُفعَّل "صورة موحدة" يحاول المتصفح تحميل مئات الصور
  // دفعة واحدة فيتجمّد العرض على الموبايل وتختفي تفاصيل الصفوف (الاسم/السعر/المعرف/القسم)
  // بصرياً أثناء إعادة الرسم. الحل: عرض جزء محدود فقط مع زر "عرض المزيد".
  const PRODUCTS_PAGE_SIZE = 50;
  const [visibleProductsCount, setVisibleProductsCount] = useState(PRODUCTS_PAGE_SIZE);
  // عرض فردي (قائمة منتجات) أو عرض الأقسام (لإضافة قسم كامل دفعة واحدة دون المرور بـ"تحديد الكل")
  const [productsViewMode, setProductsViewMode] = useState<"individual" | "categories">("individual");

  // ── State: مزامنة المنتجات ────────────────────────────────────────────
  const [targetCategoryId, setTargetCategoryId] = useState("");
  const [targetSubcategoryId, setTargetSubcategoryId] = useState("");
  const [targetSubSubCategoryId, setTargetSubSubCategoryId] = useState("");
  const [markupType, setMarkupType] = useState<"percent" | "fixed">("percent");
  const [markupPercent, setMarkupPercent] = useState<number | "">(0);
  const [markupFixed, setMarkupFixed] = useState<number | "">(0);
  const [globalImageUrl, setGlobalImageUrl] = useState("");
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  // ── State: تخصيص منتج فردي (اسم/وصف/سعر/صورة/كمية/تسمية إدخال/نسبة أو مبلغ ربح خاص) ──
  type ProductOverride = { name?: string; description?: string; price?: string; image_url?: string; markup_type?: "percent" | "fixed"; markup_value?: string; min_quantity?: string; max_quantity?: string; input_label?: string; qty_mode?: "range" | "fixed"; fieldLabels?: string[]; name_verification_enabled?: boolean; name_verification_game?: string; name_verification_region?: string; name_verification_source_field_ids?: string[] };
  const [productOverrides, setProductOverrides] = useState<Record<number, ProductOverride>>({});
  const [customizingProduct, setCustomizingProduct] = useState<any | null>(null);

  // ── State: نافذة اختيار القسم (استيراد) ────────────────────────────
  const [showImportCatPickerModal, setShowImportCatPickerModal] = useState(false);
  const [importPickerStep, setImportPickerStep] = useState<"category" | "askSub" | "subcategory" | "askSubSub" | "subSubCategory">("category");
  const [importPickerSelectedCatId, setImportPickerSelectedCatId] = useState<string>("");
  const [importPickerSelectedSubId, setImportPickerSelectedSubId] = useState<string>("");
  const [importPickerSelectedSubSubId, setImportPickerSelectedSubSubId] = useState<string>("");

  // ── State: تحديث الطلبات ──────────────────────────────────────────────
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [refreshResult, setRefreshResult] = useState<any>(null);

  // ── State: فحص طلب ───────────────────────────────────────────────────
  const [checkOrderId, setCheckOrderId] = useState("");
  const [checkLoading, setCheckLoading] = useState(false);
  const [checkResult, setCheckResult] = useState<any>(null);

  // ── State: التبويب النشط ──────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"providers"|"products"|"orders">("providers");

  useEffect(() => {
    fetchProviders();
  }, []);

  // عند تغيير المزود المختار — نصفر الحالات المرتبطة به
  useEffect(() => {
    setProviderProfile(null);
    setProviderProducts([]);
    setProductsFetched(false);
    setSelectedProducts([]);
    setSyncResult(null);
    setCheckResult(null);
    setProductOverrides({});
    setCurrentProducts([]);
    setShowCurrentProducts(false);
    setShowImportSection(false);
    setCurrentProductsSearch("");
    setSelectedCurrentIds([]);
    setSectionNode({ level: "root" });
  }, [selectedProviderId]);

  // ── جلب قائمة المزودين ───────────────────────────────────────────────
  const fetchProviders = async () => {
    setLoadingProviders(true);
    try {
      const res = await adminFetch("/api/admin/providers");
      const data = await res.json();
      setProviders(Array.isArray(data) ? data : []);
    } catch { setProviders([]); }
    setLoadingProviders(false);
  };

  // ── حفظ مزود (إضافة أو تعديل) ──────────────────────────────────────
  const handleSaveProvider = async () => {
    if (!providerFormData.name.trim() || !providerFormData.base_url.trim()) {
      showToast("الاسم ورابط API مطلوبان", "error"); return;
    }
    if (!editingProvider && !providerFormData.api_token.trim()) {
      showToast("التوكن مطلوب عند الإضافة", "error"); return;
    }
    setSavingProvider(true);
    try {
      const body: any = {
        name: providerFormData.name.trim(),
        base_url: providerFormData.base_url.trim(),
        notes: providerFormData.notes.trim() || undefined,
        provider_type: providerFormData.provider_type,
      };
      if (providerFormData.api_token.trim()) body.api_token = providerFormData.api_token.trim();

      if (editingProvider) {
        const res = await adminFetch(`/api/admin/providers/${editingProvider.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) { showToast(data?.error || "فشل تحديث المزود", "error"); setSavingProvider(false); return; }
        showToast("تم تحديث المزود", "success");
      } else {
        const res = await adminFetch("/api/admin/providers", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) { showToast(data?.error || "فشل إضافة المزود", "error"); setSavingProvider(false); return; }
        showToast("تم إضافة المزود", "success");
      }
      setShowProviderForm(false);
      setEditingProvider(null);
      setProviderFormData({ name: "", base_url: "", api_token: "", notes: "", provider_type: "standard" });
      fetchProviders();
    } catch (e: any) {
      showToast(e.message || "حدث خطأ", "error");
    }
    setSavingProvider(false);
  };

  // ── حذف مزود ──────────────────────────────────────────────────────────
  const handleDeleteProvider = async (id: number) => {
    showConfirm("هل أنت متأكد من حذف هذا المزود؟ لا يمكن حذفه إن كان يملك منتجات مرتبطة.", "حذف المزود", async () => {
      setDeletingId(id);
      try {
        const res = await adminFetch(`/api/admin/providers/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) { showToast(data.error || "فشل الحذف", "error"); }
        else { showToast("تم حذف المزود", "success"); if (selectedProviderId === id) setSelectedProviderId(null); fetchProviders(); }
      } catch (e: any) { showToast(e.message, "error"); }
      setDeletingId(null);
    }, true);
  };

  // ── تبديل حالة المزود (نشط/معطل) ─────────────────────────────────────
  const handleToggleProvider = async (id: number, current: boolean) => {
    try {
      await adminFetch(`/api/admin/providers/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !current })
      });
      fetchProviders();
    } catch (e: any) { showToast(e.message, "error"); }
  };

  // ── [PROVIDER-PRODUCTS] جلب المنتجات الحالية المرتبطة بالمزود المختار ─────────
  const loadCurrentProducts = async () => {
    if (!selectedProviderId) return;
    setLoadingCurrentProducts(true);
    try {
      const res = await adminFetch("/api/admin/products-all");
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setCurrentProducts(list.filter((p: any) => String(p.provider_id) === String(selectedProviderId)));
    } catch {
      setCurrentProducts([]);
      showToast("فشل تحميل منتجات المزود", "error");
    }
    setLoadingCurrentProducts(false);
  };

  // ── [PROVIDER-PRODUCTS] فتح المحرر الشامل للمنتج (نفس نموذج صفحة العناصر) ────
  const editCurrentProduct = async (product: any) => {
    if (!elementsEditorRef.current) { showToast("المحرر غير جاهز، أعد المحاولة", "error"); return; }
    await elementsEditorRef.current.openProductEditor(product);
  };

  // ── [PROVIDER-PRODUCTS] تفعيل/تعطيل منتج ────────────────────────────────────
  const toggleCurrentProduct = async (product: any) => {
    setBusyProductId(product.id);
    try {
      const res = await adminFetch(`/api/admin/products/${product.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ available: !product.available }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); showToast(d.error || "فشل التحديث", "error"); }
      else { showToast(product.available ? "تم تعطيل المنتج" : "تم تفعيل المنتج", "success"); await loadCurrentProducts(); }
    } catch { showToast("خطأ في الاتصال بالخادم", "error"); }
    setBusyProductId(null);
  };

  // ── [PROVIDER-PRODUCTS] بدء حذف منتج: نتحقق من وجود طلبات ثم نعرض الخيارات ────
  const requestDeleteCurrentProduct = async (product: any) => {
    setBusyProductId(product.id);
    let hasOrders = false;
    try {
      const r = await adminFetch(`/api/admin/products/${product.id}/order-check`);
      if (r.ok) hasOrders = !!(await r.json()).hasOrders;
    } catch { /* عند فشل التحقق نعتبر أن له طلبات احتياطاً — الأأمن */ hasOrders = true; }
    setBusyProductId(null);
    setDeleteDialog({ product, hasOrders });
  };

  // force=false → السيرفر يعطّل المنتج إن كان له طلبات ويحذفه إن لم يكن. force=true → حذف نهائي.
  const executeDeleteCurrentProduct = async (mode: "disable" | "force") => {
    if (!deleteDialog) return;
    const { product } = deleteDialog;
    setDeleteDialog(null);
    setBusyProductId(product.id);
    try {
      let res: Response;
      if (mode === "disable") {
        // تعطيل صريح بدل الاعتماد على سلوك الحذف الآمن، لضمان أن النتيجة هي التعطيل دائماً
        res = await adminFetch(`/api/admin/products/${product.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ available: false }),
        });
      } else {
        res = await adminFetch(`/api/admin/products/${product.id}${deleteDialog.hasOrders ? "?force=true" : ""}`, { method: "DELETE" });
      }
      const d = await res.json().catch(() => ({}));
      if (!res.ok) showToast(d.error || "فشلت العملية", "error");
      else { showToast(mode === "disable" ? "تم تعطيل المنتج" : (d.message || "تم حذف المنتج"), "success"); await loadCurrentProducts(); }
    } catch { showToast("خطأ في الاتصال بالخادم", "error"); }
    setBusyProductId(null);
  };

  // ── [PROVIDER-PRODUCTS] التحديد المتعدد + الإجراءات الجماعية ───────────────
  const toggleSelectCurrent = (id: number) =>
    setSelectedCurrentIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // "تحديد الكل" يعمل على المنتجات المعروضة حالياً فقط (حسب الوضع/القسم/البحث)
  const toggleSelectAllVisible = (visibleIds: number[]) => {
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedCurrentIds.includes(id));
    setSelectedCurrentIds(prev => allSelected
      ? prev.filter(id => !visibleIds.includes(id))
      : Array.from(new Set([...prev, ...visibleIds])));
  };

  // تعطيل/تفعيل جماعي (طلب PATCH لكل منتج، بالتتابع لتجنّب ضغط الخادم)
  const bulkSetAvailable = async (ids: number[], available: boolean) => {
    if (ids.length === 0) return;
    setBulkBusy(true);
    let ok = 0, fail = 0;
    for (const id of ids) {
      try {
        const res = await adminFetch(`/api/admin/products/${id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ available }),
        });
        if (res.ok) ok++; else fail++;
      } catch { fail++; }
    }
    setBulkBusy(false);
    setSelectedCurrentIds([]);
    showToast(`${available ? "تم تفعيل" : "تم تعطيل"} ${ok} منتج${fail ? ` — فشل ${fail}` : ""}`, fail ? "error" : "success");
    await loadCurrentProducts();
  };

  // بدء الحذف الجماعي: نفحص كم منتجاً منها له طلبات سابقة ثم نعرض الخيارات
  const requestBulkDelete = async (ids: number[]) => {
    if (ids.length === 0) return;
    setBulkBusy(true);
    let withOrders = 0;
    let unknown = false;
    for (const id of ids) {
      try {
        const r = await adminFetch(`/api/admin/products/${id}/order-check`);
        if (r.ok) { if ((await r.json()).hasOrders) withOrders++; }
        else { withOrders++; unknown = true; }
      } catch { withOrders++; unknown = true; }
    }
    setBulkBusy(false);
    setBulkDialog({ ids, ordersCount: unknown ? null : withOrders });
  };

  // mode "disable": تعطيل الكل. mode "force": حذف نهائي للكل.
  // mode "safe": حذف المنتجات بدون طلبات وتعطيل التي لها طلبات (السلوك الآمن للسيرفر بدون force).
  const executeBulkDelete = async (mode: "disable" | "force" | "safe") => {
    if (!bulkDialog) return;
    const ids = bulkDialog.ids;
    setBulkDialog(null);
    if (mode === "disable") { await bulkSetAvailable(ids, false); return; }
    setBulkBusy(true);
    let ok = 0, fail = 0;
    for (const id of ids) {
      try {
        const res = await adminFetch(`/api/admin/products/${id}${mode === "force" ? "?force=true" : ""}`, { method: "DELETE" });
        if (res.ok) ok++; else fail++;
      } catch { fail++; }
    }
    setBulkBusy(false);
    setSelectedCurrentIds([]);
    showToast(`تمت معالجة ${ok} منتج${fail ? ` — فشل ${fail}` : ""}`, fail ? "error" : "success");
    await loadCurrentProducts();
  };

  // ── جلب بيانات حساب المزود ────────────────────────────────────────────
  const loadProviderProfile = async () => {
    if (!selectedProviderId) return;
    setLoadingProfile(true);
    try {
      const res = await adminFetch(`/api/admin/providers/${selectedProviderId}/profile`);
      setProviderProfile(await res.json());
    } catch (e: any) { setProviderProfile({ error: e.message }); }
    setLoadingProfile(false);
  };

  // ── جلب منتجات المزود ─────────────────────────────────────────────────
  const loadProviderProducts = async () => {
    if (!selectedProviderId) return;
    setLoadingProducts(true); setProductsFetched(false); setSelectedProducts([]); setSyncResult(null);
    try {
      const res = await adminFetch(`/api/admin/providers/${selectedProviderId}/products`);
      const data = await res.json();
      setProviderProducts(data.products || (Array.isArray(data) ? data : []));
      setProductsFetched(true);
    } catch { setProviderProducts([]); setProductsFetched(true); }
    setLoadingProducts(false);
  };

  // ── مزامنة المنتجات ────────────────────────────────────────────────────
  const handleSync = async () => {
    if (!targetSubcategoryId && !targetCategoryId) { showToast("اختر القسم أولاً", "info"); return; }
    if (!selectedProviderId) { showToast("اختر مزوداً أولاً", "info"); return; }
    // [NAME VERIFICATION] إلزامي اختيار خانة معرف واحدة على الأقل عند تفعيل الميزة لأي منتج مُعدَّل هنا
    const missingSource = Object.entries(productOverrides).find(
      ([, o]: [string, ProductOverride]) => o.name_verification_enabled && (!o.name_verification_source_field_ids || o.name_verification_source_field_ids.length === 0)
    );
    if (missingSource) {
      showToast("يوجد منتج مفعّل عليه التحقق من الاسم دون اختيار خانة المعرف — يرجى اختيار خانة واحدة على الأقل له", "error");
      return;
    }
    setSyncLoading(true); setSyncResult(null);
    try {
      const res = await adminFetch(`/api/admin/providers/${selectedProviderId}/sync`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: !targetSubcategoryId && targetCategoryId ? parseInt(targetCategoryId) : undefined,
          subcategoryId: targetSubcategoryId ? parseInt(targetSubcategoryId) : undefined,
          subSubCategoryId: targetSubSubCategoryId ? parseInt(targetSubSubCategoryId) : undefined,
          productIds: selectedProducts.length ? selectedProducts : undefined,
          markupType, markupPercent: Number(markupPercent || 0), markupFixed: Number(markupFixed || 0),
          globalImageUrl: globalImageUrl || undefined,
          productOverrides: Object.entries(productOverrides)
            .filter(([, o]: [string, ProductOverride]) => o.name || o.description !== undefined || o.price || o.image_url || (o.markup_value && parseFloat(o.markup_value) > 0) || o.min_quantity || o.max_quantity || o.input_label || (o.fieldLabels && o.fieldLabels.some(l => l && l.trim())) || o.name_verification_enabled !== undefined)
            .map(([id, o]: [string, ProductOverride]) => ({
              id: Number(id),
              name: o.name && o.name.trim() ? o.name.trim() : undefined,
              description: o.description !== undefined ? o.description.trim() : undefined,
              price: o.price || undefined,
              image_url: o.image_url || undefined,
              markup_type: o.markup_type,
              markup_value: o.markup_value ? parseFloat(o.markup_value) : undefined,
              min_quantity: o.min_quantity ? parseFloat(o.min_quantity) : undefined,
              max_quantity: o.max_quantity ? parseFloat(o.max_quantity) : undefined,
              input_label: o.input_label && o.input_label.trim() ? o.input_label.trim() : undefined,
              fieldLabels: o.fieldLabels && o.fieldLabels.some(l => l && l.trim()) ? o.fieldLabels : undefined,
              name_verification_enabled: o.name_verification_enabled,
              name_verification_game: o.name_verification_game,
              name_verification_region: o.name_verification_region,
              name_verification_source_field_ids: o.name_verification_source_field_ids && o.name_verification_source_field_ids.length > 0 ? o.name_verification_source_field_ids : undefined,
            }))
        })
      });
      setSyncResult(await res.json());
    } catch (e: any) { setSyncResult({ error: e.message }); }
    setSyncLoading(false);
  };

  // ── إضافة قسم كامل دفعة واحدة (كل منتجاته) دون المرور بـ"تحديد الكل" ────
  const handleSyncCategory = async (categoryName: string) => {
    if (!targetSubcategoryId && !targetCategoryId) { showToast("اختر القسم أولاً", "info"); return; }
    if (!selectedProviderId) { showToast("اختر مزوداً أولاً", "info"); return; }
    const ids = providerProducts
      .filter((p: any) => String(p?.category_name || "").trim() === categoryName)
      .map((p: any) => p.id);
    if (!ids.length) { showToast("لا توجد منتجات في هذا القسم", "info"); return; }
    setSyncLoading(true); setSyncResult(null);
    try {
      const res = await adminFetch(`/api/admin/providers/${selectedProviderId}/sync`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: !targetSubcategoryId && targetCategoryId ? parseInt(targetCategoryId) : undefined,
          subcategoryId: targetSubcategoryId ? parseInt(targetSubcategoryId) : undefined,
          subSubCategoryId: targetSubSubCategoryId ? parseInt(targetSubSubCategoryId) : undefined,
          productIds: ids,
          markupType, markupPercent: Number(markupPercent || 0), markupFixed: Number(markupFixed || 0),
          globalImageUrl: globalImageUrl || undefined,
        })
      });
      setSyncResult(await res.json());
    } catch (e: any) { setSyncResult({ error: e.message }); }
    setSyncLoading(false);
  };

  // ── تحديث الطلبات ─────────────────────────────────────────────────────
  const handleRefreshOrders = async () => {
    setRefreshLoading(true); setRefreshResult(null);
    try {
      const res = await adminFetch("/api/admin/ahminix/refresh-orders", { method: "POST" });
      setRefreshResult(await res.json());
    } catch (e: any) { setRefreshResult({ error: e.message }); }
    setRefreshLoading(false);
  };

  // ── فحص طلب ───────────────────────────────────────────────────────────
  const handleCheckOrder = async () => {
    if (!checkOrderId.trim()) return;
    if (!selectedProviderId) { showToast("اختر مزوداً أولاً", "info"); return; }
    setCheckLoading(true); setCheckResult(null);
    try {
      const raw = checkOrderId.trim();
      const isUuid = raw.includes("-");
      const res = await adminFetch(`/api/admin/providers/${selectedProviderId}/check-order/${encodeURIComponent(raw)}${isUuid ? "?uuid=1" : ""}`);
      setCheckResult(await res.json());
    } catch (e: any) { setCheckResult({ error: e.message }); }
    setCheckLoading(false);
  };

  const toggleProduct = (id: number) =>
    setSelectedProducts(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return providerProducts.filter((p: any) => {
      const matchesSearch = !q
        || String(p.name || "").toLowerCase().includes(q)
        || String(p.id ?? "").toLowerCase().includes(q)
        || String(p.category_name || "").toLowerCase().includes(q);
      const matchesCategory = !categoryFilter || p.category_name === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [providerProducts, searchQuery, categoryFilter]);
  // [FIX] إعادة ضبط عدد الصفوف المعروضة كلما تغيّر البحث/الفلتر أو قائمة المنتجات نفسها،
  // حتى لا يبقى المستخدم عالقاً على صفحة قديمة بعد تضييق نتائج البحث.
  useEffect(() => {
    setVisibleProductsCount(PRODUCTS_PAGE_SIZE);
  }, [searchQuery, categoryFilter, providerProducts]);
  const visibleFilteredProducts = useMemo(
    () => filteredProducts.slice(0, visibleProductsCount),
    [filteredProducts, visibleProductsCount]
  );
  const uniqueCategories = useMemo(() => {
    const set = new Set<string>();
    for (const p of providerProducts as any[]) {
      const cat = p?.category_name;
      if (typeof cat === "string" && cat.trim()) set.add(cat.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b, "ar"));
  }, [providerProducts]);

  // منتج من نوع "باقات" (Bundle): قيم كمية محددة مسبقاً من المزود أو باقات مسماة — تُخفى حقول الكمية بالكامل
  const isBundleProduct = (p: any): boolean => {
    return (Array.isArray(p?.qty_values) && p.qty_values.length > 0) ||
      (Array.isArray(p?.packages_data) && p.packages_data.length > 0) ||
      p?.store_type === "packages" || p?.store_type === "specificPackage";
  };
  const supplierMinQty = (p: any): number | null => {
    const v = parseFloat(p?.supplier_min_quantity ?? p?.min_quantity);
    return isNaN(v) ? null : v;
  };
  const supplierMaxQty = (p: any): number | null => {
    const v = parseFloat(p?.supplier_max_quantity ?? p?.max_quantity);
    return isNaN(v) ? null : v;
  };
  const clampQty = (val: string, p: any): string => {
    const n = parseFloat(val);
    if (isNaN(n)) return val;
    const min = supplierMinQty(p);
    const max = supplierMaxQty(p);
    let clamped = n;
    if (min != null && clamped < min) clamped = min;
    if (max != null && clamped > max) clamped = max;
    return String(clamped);
  };
  // تحقق صارم: يمنع حفظ أي كمية خارج النطاق [الحد الأدنى، الحد الأقصى] للمورد
  const validateQtyOverride = (p: any, ov: ProductOverride): string | null => {
    if (isBundleProduct(p)) return null;
    const min = supplierMinQty(p);
    const max = supplierMaxQty(p);
    const checkOne = (raw?: string) => {
      if (raw === undefined || raw === "") return null;
      const n = parseFloat(raw);
      if (isNaN(n)) return "قيمة الكمية غير صالحة";
      if (min != null && n < min) return `الكمية يجب ألا تقل عن الحد الأدنى للمورد (${min})`;
      if (max != null && n > max) return `الكمية يجب ألا تتجاوز الحد الأقصى للمورد (${max})`;
      return null;
    };
    return checkOne(ov.min_quantity) || checkOne(ov.max_quantity);
  };
  const setOverride = (id: number, patch: Partial<ProductOverride>) => {
    setProductOverrides(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };
  const clearOverride = (id: number) => {
    setProductOverrides(prev => { const n = { ...prev }; delete n[id]; return n; });
  };
  const computePreviewPrice = (p: any) => {
    const base = parseFloat(p.price) || 0;
    const ov = productOverrides[p.id];
    if (ov?.price && parseFloat(ov.price) > 0) return parseFloat(ov.price);
    if (ov?.markup_type === "fixed" && ov?.markup_value) return +(base + parseFloat(ov.markup_value)).toFixed(6);
    if (ov?.markup_type === "percent" && ov?.markup_value) return +(base * (1 + parseFloat(ov.markup_value) / 100)).toFixed(6);
    if (markupType === "fixed" && markupFixed) return +(base + Number(markupFixed || 0)).toFixed(6);
    return +(base * (1 + Number(markupPercent || 0) / 100)).toFixed(6);
  };

  return (
    <div className="space-y-5 pb-8">

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
        {([
          { key: "providers", label: "المزودون", icon: <Plug size={14}/> },
          { key: "products",  label: "المنتجات",  icon: <Package size={14}/> },
          { key: "orders",    label: "الطلبات",   icon: <RefreshCw size={14}/> },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${activeTab === t.key ? "bg-white text-[var(--brand)] shadow-sm" : "text-gray-500"}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          TAB 1: المزودون
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "providers" && (
        <div className="space-y-4">

          {/* زر إضافة مزود */}
          <button onClick={() => { setEditingProvider(null); setProviderFormData({ name: "", base_url: "", api_token: "", notes: "", provider_type: "standard" }); setShowProviderForm(true); }}
            className="w-full bg-[var(--brand)] text-white py-3.5 rounded-lg font-bold flex items-center justify-center gap-2 shadow-sm">
            <Plus size={18}/> إضافة مزود جديد
          </button>

          {/* نموذج إضافة / تعديل */}
          {showProviderForm && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-gray-800 to-gray-700 px-5 py-4 flex items-center justify-between">
                <h3 className="text-white font-bold text-sm flex items-center gap-2">
                  {editingProvider ? <><Pencil size={15}/> تعديل المزود</> : <><Plus size={15}/> مزود جديد</>}
                </h3>
                <button onClick={() => { setShowProviderForm(false); setEditingProvider(null); }} className="text-white/70 hover:text-white">
                  <X size={18}/>
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-1.5 block">الاسم <span className="text-red-400">*</span></label>
                  <input type="text" placeholder="مثال: FastCard" value={providerFormData.name}
                    onChange={e => setProviderFormData(p => ({ ...p, name: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-[var(--brand)] transition-colors"/>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-1.5 block">نوع API الخاص بالمزود <span className="text-red-400">*</span></label>
                  <CustomSelect
                    value={providerFormData.provider_type}
                    onChange={v => setProviderFormData(p => ({ ...p, provider_type: v }))}
                    options={[
                      { value: "standard", label: "قياسي (client/api — Ahminix/fastcard-style)" },
                      { value: "megaapi", label: "Fast API (مثل mega-game.net)" },
                    ]}
                    buttonClassName="py-3"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">حدّد الشكل الصحيح حسب توثيق المزوّد — كل نوع له مسارات وهيدرز مختلفة تماماً.</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-1.5 block">رابط API Base URL <span className="text-red-400">*</span></label>
                  <input type="url"
                    placeholder={providerFormData.provider_type === "megaapi" ? "https://example.com/api/fastapi" : "https://example.com/client/api"}
                    value={providerFormData.base_url}
                    onChange={e => setProviderFormData(p => ({ ...p, base_url: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-[var(--brand)] transition-colors font-mono text-xs" dir="ltr"/>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-1.5 block">
                    API Token {editingProvider ? <span className="text-gray-400 font-normal">(اتركه فارغاً للإبقاء على الحالي)</span> : <span className="text-red-400">*</span>}
                  </label>
                  <input type="password" placeholder={editingProvider ? "••••••• (لم يتغير)" : "أدخل التوكن — يُشفَّر تلقائياً"} value={providerFormData.api_token}
                    onChange={e => setProviderFormData(p => ({ ...p, api_token: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-[var(--brand)] transition-colors font-mono" dir="ltr"/>
                  <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1"><Lock size={14}/> مشفر بـ AES-256-GCM — لا يظهر في أي مكان بعد الحفظ</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-1.5 block">ملاحظات <span className="text-gray-400 font-normal">(اختياري)</span></label>
                  <input type="text" placeholder="مثال: مزود ألعاب" value={providerFormData.notes}
                    onChange={e => setProviderFormData(p => ({ ...p, notes: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-[var(--brand)] transition-colors"/>
                </div>
                <div className="flex gap-3 pt-1">
                  <button onClick={() => { setShowProviderForm(false); setEditingProvider(null); }}
                    className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-lg font-bold text-sm">إلغاء</button>
                  <button onClick={handleSaveProvider} disabled={savingProvider}
                    className="flex-1 bg-[var(--brand)] text-white py-3 rounded-lg font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                    {savingProvider ? <><RefreshCw size={14} className="animate-spin"/> جاري...</> : <><CheckCircle size={14}/> {editingProvider ? "حفظ التعديلات" : "إضافة المزود"}</>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* قائمة المزودين */}
          {loadingProviders ? (
            <div className="flex items-center justify-center py-10 gap-3">
              <RefreshCw size={20} className="animate-spin text-[var(--brand)]"/>
              <span className="text-sm text-gray-500">جاري التحميل...</span>
            </div>
          ) : providers.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-8 text-center border border-dashed border-gray-200">
              <ExternalLink size={36} className="mx-auto mb-3 text-gray-300"/>
              <p className="font-bold text-gray-500 text-sm mb-1">لا يوجد مزودون</p>
              <p className="text-xs text-gray-400">أضف مزوداً للبدء في استيراد المنتجات</p>
            </div>
          ) : (
            <div className="space-y-3">
              {providers.map(prov => (
                <div key={prov.id}
                  className={`bg-white rounded-lg border-2 transition-all overflow-hidden ${selectedProviderId === prov.id ? "border-[var(--brand)] shadow-md" : "border-gray-100"}`}>
                  {/* رأس البطاقة */}
                  <div className="p-4 flex items-center gap-3 cursor-pointer" onClick={() => setSelectedProviderId(selectedProviderId === prov.id ? null : prov.id)}>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${prov.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                      {prov.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-800 text-sm truncate">{prov.name}</p>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${prov.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {prov.is_active ? "نشط" : "معطل"}
                        </span>
                        {prov.provider_type === "megaapi" && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-700">Fast API</span>
                        )}
                        {/* [FEATURE] مراقبة صحة المزوّد — بدل اكتشاف العطل فقط من سجلات الخادم يدوياً */}
                        {prov.is_active && prov.last_sync_status && (
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${prov.last_sync_status === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${prov.last_sync_status === "success" ? "bg-green-500" : "bg-red-500 animate-pulse"}`} />
                            {prov.last_sync_status === "success" ? "متصل" : "عطل بالمزامنة"}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 font-mono truncate mt-0.5">{prov.base_url}</p>
                      {prov.notes && <p className="text-[10px] text-gray-400 mt-0.5 italic">{prov.notes}</p>}
                      {prov.is_active && prov.last_sync_at && (
                        <p className={`text-[10px] mt-0.5 ${prov.last_sync_status === "error" ? "text-red-500 font-bold" : "text-gray-400"}`}>
                          آخر مزامنة: {new Date(prov.last_sync_at).toLocaleString("ar-EG", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                          {prov.last_sync_status === "error" && prov.last_sync_message ? ` — ${prov.last_sync_message}` : ""}
                        </p>
                      )}
                    </div>
                    <ChevronDown size={16} className={`text-gray-400 transition-transform flex-shrink-0 ${selectedProviderId === prov.id ? "rotate-180" : ""}`}/>
                  </div>

                  {/* أزرار الإجراءات */}
                  {selectedProviderId === prov.id && (
                    <div className="px-4 pb-4 space-y-3 border-t border-gray-50 pt-3">
                      {/* أزرار الإجراءات */}
                      <div className="grid grid-cols-4 gap-2">
                        <button onClick={() => { setActiveTab("products"); }}
                          className="bg-blue-50 text-blue-700 py-2.5 rounded-lg text-[10px] font-bold flex flex-col items-center gap-1">
                          <Download size={14}/> استيراد
                        </button>
                        <button onClick={loadProviderProfile} disabled={loadingProfile}
                          className="bg-green-50 text-green-700 py-2.5 rounded-lg text-[10px] font-bold flex flex-col items-center gap-1 disabled:opacity-50">
                          <Wallet size={14}/> الرصيد
                        </button>
                        <button onClick={() => { setEditingProvider(prov); setProviderFormData({ name: prov.name, base_url: prov.base_url, api_token: "", notes: prov.notes || "", provider_type: prov.provider_type || "standard" }); setShowProviderForm(true); }}
                          className="bg-amber-50 text-amber-700 py-2.5 rounded-lg text-[10px] font-bold flex flex-col items-center gap-1">
                          <Pencil size={14}/> تعديل
                        </button>
                        <button onClick={() => handleDeleteProvider(prov.id)} disabled={deletingId === prov.id}
                          className="bg-red-50 text-red-600 py-2.5 rounded-lg text-[10px] font-bold flex flex-col items-center gap-1 disabled:opacity-50">
                          <Trash2 size={14}/> حذف
                        </button>
                      </div>

                      {/* زر تبديل الحالة */}
                      <button onClick={() => handleToggleProvider(prov.id, prov.is_active)}
                        className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all ${prov.is_active ? "bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600" : "bg-green-50 text-green-700"}`}>
                        {prov.is_active ? "⏸ تعطيل المزود" : "▶ تفعيل المزود"}
                      </button>

                      {/* بيانات الحساب */}
                      {providerProfile && (
                        providerProfile.error ? (
                          <div className="bg-red-50 p-3 rounded-lg text-red-600 text-xs">{providerProfile.error}</div>
                        ) : (
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gray-50 p-3 rounded-lg text-center">
                              <p className="text-[9px] text-gray-400 mb-1">البريد الإلكتروني</p>
                              <p className="font-bold text-gray-800 text-xs truncate">{providerProfile.email || "—"}</p>
                            </div>
                            <div className="bg-green-50 p-3 rounded-lg text-center">
                              <p className="text-[9px] text-gray-400 mb-1">الرصيد</p>
                              <p className="font-bold text-green-700 text-base">{parseFloat(providerProfile.balance || 0).toFixed(3)} $</p>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 2: المنتجات — استيراد ومزامنة
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "products" && (
        <div className="space-y-4">

          {/* اختيار المزود */}
          <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm space-y-3">
            <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
              <ExternalLink size={16} className="text-[var(--brand)]"/> اختر المزود
            </h3>
            {providers.filter(p => p.is_active).length === 0 ? (
              <div className="bg-amber-50 p-3 rounded-lg text-amber-700 text-xs font-bold text-center">
                لا يوجد مزود نشط — أضف مزوداً من تبويب المزودون أولاً
              </div>
            ) : (
              <div className="space-y-2">
                {providers.filter(p => p.is_active).map(prov => (
                  <button key={prov.id} onClick={() => setSelectedProviderId(prov.id)}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-lg border-2 transition-all text-right ${selectedProviderId === prov.id ? "border-[var(--brand)] bg-red-50" : "border-gray-100 bg-gray-50 hover:border-gray-200"}`}>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${selectedProviderId === prov.id ? "bg-[var(--brand)] text-white" : "bg-white text-gray-600 border border-gray-200"}`}>
                      {prov.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 text-right">
                      <p className={`font-bold text-sm ${selectedProviderId === prov.id ? "text-[var(--brand)]" : "text-gray-700"}`}>{prov.name}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{prov.base_url}</p>
                    </div>
                    {selectedProviderId === prov.id && <CheckCircle size={18} className="text-[var(--brand)] flex-shrink-0"/>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedProviderId && (
            <>
              {/* ═══ [PROVIDER-PRODUCTS] المنتجات الحالية المضافة من هذا المزود (حاوية مغلقة) ═══ */}
              <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
                <button type="button"
                  onClick={() => { const next = !showCurrentProducts; setShowCurrentProducts(next); if (next && currentProducts.length === 0) loadCurrentProducts(); }}
                  className="w-full flex items-center justify-between gap-2 p-5 text-right">
                  <span className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                    <Package size={16} className="text-[var(--brand)]"/> المنتجات الحالية المضافة من هذا المزود
                    {currentProducts.length > 0 && <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold">{currentProducts.length}</span>}
                  </span>
                  <ChevronDown size={18} className={`text-gray-400 transition-transform flex-shrink-0 ${showCurrentProducts ? "rotate-180" : ""}`}/>
                </button>

                {showCurrentProducts && (() => {
                  // ── تجهيز البيانات: البحث + المنتجات المعروضة حسب الوضع/القسم ──
                  const q = currentProductsSearch.trim().toLowerCase();
                  const matchesSearch = (p: any) => !q || String(p.name || "").toLowerCase().includes(q) || String(p.external_id ?? "").toLowerCase().includes(q);
                  const subOf = (p: any) => subcategories.find((s: any) => String(s.id) === String(p.subcategory_id));
                  const catIdOf = (p: any) => p.category_id ?? subOf(p)?.category_id ?? null;
                  const pathOf = (p: any) => {
                    const sub = subOf(p);
                    const cat = categories.find((c: any) => String(c.id) === String(catIdOf(p)));
                    const subSub = subSubCategories.find((ss: any) => String(ss.id) === String(p.sub_sub_category_id));
                    return [cat?.name, sub?.name, subSub?.name].filter(Boolean).join(" ← ") || "بدون قسم";
                  };
                  const searched = currentProducts.filter(matchesSearch);

                  // عدّاد منتجات لكل عقدة في شجرة الأقسام (يشمل ما تحتها)
                  const countIn = (level: "cat" | "sub" | "subsub", id: number) => searched.filter((p: any) =>
                    level === "cat" ? String(catIdOf(p)) === String(id)
                    : level === "sub" ? String(p.subcategory_id) === String(id)
                    : String(p.sub_sub_category_id) === String(id)).length;

                  // المنتجات المعروضة الآن (هي التي يعمل عليها "تحديد الكل")
                  let visible: any[] = searched;
                  let crumbs: { label: string; node: typeof sectionNode }[] = [];
                  let folders: { key: string; name: string; image?: string; count: number; node: typeof sectionNode }[] = [];
                  if (currentViewMode === "sections") {
                    const catsWith = categories.filter((c: any) => countIn("cat", c.id) > 0);
                    if (sectionNode.level === "root") {
                      visible = searched.filter((p: any) => !catIdOf(p));   // منتجات بلا قسم فقط على مستوى الجذر
                      folders = catsWith.map((c: any) => ({ key: `cat${c.id}`, name: c.name, image: c.image_url, count: countIn("cat", c.id), node: { level: "cat" as const, id: c.id } }));
                    } else if (sectionNode.level === "cat") {
                      const cat = categories.find((c: any) => String(c.id) === String(sectionNode.id));
                      crumbs = [{ label: cat?.name || "قسم", node: sectionNode }];
                      visible = searched.filter((p: any) => String(catIdOf(p)) === String(sectionNode.id) && !p.subcategory_id);
                      folders = subcategories.filter((s: any) => String(s.category_id) === String(sectionNode.id) && countIn("sub", s.id) > 0)
                        .map((s: any) => ({ key: `sub${s.id}`, name: s.name, image: s.image_url, count: countIn("sub", s.id), node: { level: "sub" as const, id: s.id } }));
                    } else if (sectionNode.level === "sub") {
                      const sub = subcategories.find((s: any) => String(s.id) === String(sectionNode.id));
                      const cat = categories.find((c: any) => String(c.id) === String(sub?.category_id));
                      crumbs = [{ label: cat?.name || "قسم", node: { level: "cat", id: cat?.id } }, { label: sub?.name || "فرعي", node: sectionNode }];
                      visible = searched.filter((p: any) => String(p.subcategory_id) === String(sectionNode.id) && !p.sub_sub_category_id);
                      folders = subSubCategories.filter((ss: any) => String(ss.subcategory_id) === String(sectionNode.id) && countIn("subsub", ss.id) > 0)
                        .map((ss: any) => ({ key: `ss${ss.id}`, name: ss.name, image: ss.image_url, count: countIn("subsub", ss.id), node: { level: "subsub" as const, id: ss.id } }));
                    } else {
                      const ss = subSubCategories.find((x: any) => String(x.id) === String(sectionNode.id));
                      const sub = subcategories.find((s: any) => String(s.id) === String(ss?.subcategory_id));
                      const cat = categories.find((c: any) => String(c.id) === String(sub?.category_id));
                      crumbs = [{ label: cat?.name || "قسم", node: { level: "cat", id: cat?.id } }, { label: sub?.name || "فرعي", node: { level: "sub", id: sub?.id } }, { label: ss?.name || "فرع فرعي", node: sectionNode }];
                      visible = searched.filter((p: any) => String(p.sub_sub_category_id) === String(sectionNode.id));
                    }
                  }

                  const visibleIds: number[] = visible.map((p: any) => p.id);
                  const selectedVisible = visibleIds.filter(id => selectedCurrentIds.includes(id));
                  const allVisibleSelected = visibleIds.length > 0 && selectedVisible.length === visibleIds.length;

                  return (
                  <div className="px-5 pb-5 space-y-3 border-t border-gray-50 pt-4">
                    {/* تبديل الوضع */}
                    <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
                      <button type="button" onClick={() => setCurrentViewMode("all")}
                        className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${currentViewMode === "all" ? "bg-white text-[var(--brand)] shadow-sm" : "text-gray-500"}`}>عرض كل المنتجات</button>
                      <button type="button" onClick={() => { setCurrentViewMode("sections"); setSectionNode({ level: "root" }); }}
                        className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${currentViewMode === "sections" ? "bg-white text-[var(--brand)] shadow-sm" : "text-gray-500"}`}>التصفح عبر الأقسام</button>
                    </div>

                    <div className="flex gap-2">
                      <input type="text" value={currentProductsSearch} onChange={e => setCurrentProductsSearch(e.target.value)}
                        placeholder="ابحث باسم المنتج أو المعرف..." className="flex-1 p-2.5 bg-gray-50 rounded-lg text-xs outline-none border border-gray-100"/>
                      <button type="button" onClick={loadCurrentProducts} disabled={loadingCurrentProducts}
                        className="px-3 bg-gray-100 rounded-lg text-gray-600 disabled:opacity-40" title="تحديث">
                        <RefreshCw size={14} className={loadingCurrentProducts ? "animate-spin" : ""}/>
                      </button>
                    </div>

                    {/* مسار التنقل داخل الأقسام */}
                    {currentViewMode === "sections" && sectionNode.level !== "root" && (
                      <div className="flex items-center flex-wrap gap-1 text-[11px]">
                        <button type="button" onClick={() => setSectionNode({ level: "root" })} className="px-2 py-1 rounded-md bg-gray-100 text-gray-600 font-bold">الأقسام</button>
                        {crumbs.map((c, i) => (
                          <React.Fragment key={i}>
                            <span className="text-gray-300">‹</span>
                            <button type="button" onClick={() => setSectionNode(c.node)}
                              className={`px-2 py-1 rounded-md font-bold ${i === crumbs.length - 1 ? "bg-[var(--brand)] text-white" : "bg-gray-100 text-gray-600"}`}>{c.label}</button>
                          </React.Fragment>
                        ))}
                      </div>
                    )}

                    {/* مجلدات الأقسام (وضع الأقسام فقط) */}
                    {currentViewMode === "sections" && folders.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {folders.map(f => (
                          <button key={f.key} type="button" onClick={() => setSectionNode(f.node)}
                            className="flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 border-gray-100 bg-gray-50 hover:border-gray-300 transition-all">
                            <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                              {f.image ? <img src={f.image} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}/> : <span className="text-2xl">📁</span>}
                            </div>
                            <span className="text-[11px] text-center text-gray-700 font-bold leading-tight line-clamp-2">{f.name}</span>
                            <span className="text-[10px] text-gray-400">{f.count} منتج</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* شريط تحديد الكل + الإجراءات الجماعية */}
                    {visible.length > 0 && (
                      <div className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                        <button type="button" onClick={() => toggleSelectAllVisible(visibleIds)} className="flex items-center gap-2 text-xs font-bold text-gray-700">
                          <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center text-[11px] leading-none ${allVisibleSelected ? "bg-[var(--brand)] border-[var(--brand)] text-white" : "border-gray-300 bg-white"}`}>{allVisibleSelected ? "✓" : ""}</span>
                          {allVisibleSelected ? "إلغاء تحديد الكل" : `تحديد الكل (${visibleIds.length})`}
                        </button>
                        <span className="text-[11px] text-gray-500 font-bold">{selectedVisible.length > 0 ? `المحدّد: ${selectedVisible.length}` : ""}</span>
                      </div>
                    )}
                    {selectedVisible.length > 0 && (
                      <div className="flex gap-2">
                        <button type="button" disabled={bulkBusy} onClick={() => bulkSetAvailable(selectedVisible, false)}
                          className="flex-1 py-2.5 rounded-lg text-xs font-bold bg-amber-500 text-white disabled:opacity-40">{bulkBusy ? "جارٍ التنفيذ..." : `تعطيل المحدّد (${selectedVisible.length})`}</button>
                        <button type="button" disabled={bulkBusy} onClick={() => requestBulkDelete(selectedVisible)}
                          className="flex-1 py-2.5 rounded-lg text-xs font-bold bg-red-600 text-white disabled:opacity-40">{bulkBusy ? "جارٍ التنفيذ..." : `حذف المحدّد (${selectedVisible.length})`}</button>
                      </div>
                    )}

                    {/* قائمة المنتجات */}
                    {loadingCurrentProducts ? (
                      <p className="text-center text-xs text-gray-400 py-6">جاري التحميل...</p>
                    ) : currentProducts.length === 0 ? (
                      <p className="text-center text-xs text-gray-400 py-6">لا توجد منتجات مضافة من هذا المزود بعد</p>
                    ) : searched.length === 0 ? (
                      <p className="text-center text-xs text-gray-400 py-6">لا نتائج مطابقة للبحث</p>
                    ) : visible.length === 0 ? (
                      currentViewMode === "sections" && folders.length > 0
                        ? null
                        : <p className="text-center text-xs text-gray-400 py-6">لا منتجات في هذا المستوى</p>
                    ) : (
                      <div className="space-y-2 max-h-[28rem] overflow-y-auto">
                        {visible.map((p: any) => {
                          const checked = selectedCurrentIds.includes(p.id);
                          return (
                          <div key={p.id} className={`flex items-center gap-3 p-3 rounded-lg border ${checked ? "border-[var(--brand)] bg-red-50/40" : p.available === false ? "bg-gray-50 border-gray-200 opacity-70" : "bg-white border-gray-100"}`}>
                            <button type="button" onClick={() => toggleSelectCurrent(p.id)} aria-label="تحديد"
                              className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center text-[11px] leading-none ${checked ? "bg-[var(--brand)] border-[var(--brand)] text-white" : "border-gray-300 bg-white"}`}>{checked ? "✓" : ""}</button>
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
                              {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}/> : <Package size={18} className="text-gray-300"/>}
                            </div>
                            <div className="flex-1 min-w-0 text-right">
                              <p className="font-bold text-xs text-gray-800 truncate">{p.name}</p>
                              <p className="text-[10px] text-gray-400 truncate">{pathOf(p)}</p>
                              <p className="text-[10px] text-gray-500 font-mono">
                                ${p.price} · ID:{p.external_id ?? "—"}
                                {p.available === false && <span className="mr-1 text-red-500 font-bold">· معطّل</span>}
                              </p>
                            </div>
                            <div className="flex flex-col gap-1 flex-shrink-0">
                              <button type="button" disabled={busyProductId === p.id || bulkBusy} onClick={() => editCurrentProduct(p)}
                                className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-600 disabled:opacity-40">
                                <Pencil size={12}/> تعديل
                              </button>
                              <button type="button" disabled={busyProductId === p.id || bulkBusy} onClick={() => toggleCurrentProduct(p)}
                                className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold bg-gray-100 text-gray-600 disabled:opacity-40">
                                {p.available === false ? "تفعيل" : "تعطيل"}
                              </button>
                              <button type="button" disabled={busyProductId === p.id || bulkBusy} onClick={() => requestDeleteCurrentProduct(p)}
                                className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold bg-red-50 text-red-600 disabled:opacity-40">
                                <Trash2 size={12}/> حذف
                              </button>
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  );
                })()}
              </div>

              {/* ═══ [PROVIDER-PRODUCTS] إضافة منتجات وجلبها من المزود (حاوية مغلقة) ═══ */}
              <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
                <button type="button" onClick={() => setShowImportSection(v => !v)} className="w-full flex items-center justify-between gap-2 p-5 text-right">
                  <span className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                    <Download size={16} className="text-[var(--brand)]"/> إضافة منتجات وجلبها من المزود
                  </span>
                  <ChevronDown size={18} className={`text-gray-400 transition-transform flex-shrink-0 ${showImportSection ? "rotate-180" : ""}`}/>
                </button>
                {showImportSection && (
                  <div className="px-3 pb-4 space-y-4 border-t border-gray-50 pt-4">
              {/* إعدادات الاستيراد */}
              <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm space-y-4">
                <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                  <Download size={16} className="text-[var(--brand)]"/> إعدادات الاستيراد
                </h3>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">القسم <span className="text-red-400">*</span></label>
                  <button
                    type="button"
                    onClick={() => {
                      setImportPickerStep("category");
                      setImportPickerSelectedCatId(targetCategoryId || "");
                      setImportPickerSelectedSubId(targetSubcategoryId || "");
                      setImportPickerSelectedSubSubId(targetSubSubCategoryId || "");
                      setShowImportCatPickerModal(true);
                    }}
                    className="w-full p-3 bg-gray-50 rounded-lg text-sm text-right flex items-center justify-between border border-gray-100 hover:bg-gray-100 transition-colors"
                  >
                    <span className={(targetSubcategoryId || targetCategoryId) ? "text-gray-800 font-medium" : "text-gray-400"}>
                      {targetSubcategoryId ? (() => {
                        const cat = categories.find((c: any) => String(c.id) === String(targetCategoryId));
                        const sub = subcategories.find((s: any) => String(s.id) === String(targetSubcategoryId));
                        const subSub = targetSubSubCategoryId ? subSubCategories.find((ss: any) => String(ss.id) === String(targetSubSubCategoryId)) : null;
                        return [cat?.name, sub?.name, subSub?.name].filter(Boolean).join(" ← ");
                      })() : "اختر القسم الرئيسي ثم الفرعي"}
                    </span>
                    <span className="text-gray-400 text-xs mr-1">{targetSubcategoryId ? "✓" : "▼"}</span>
                  </button>
                </div>

                {/* Import Category Picker Modal */}
                {showImportCatPickerModal && (
                  <div
                    className="fixed inset-0 z-[80] flex items-center justify-center"
                    style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
                    onClick={() => setShowImportCatPickerModal(false)}
                  >
                    <div
                      className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
                      onClick={e => e.stopPropagation()}
                      dir="rtl"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          {(importPickerStep === "askSub" || importPickerStep === "subcategory" || importPickerStep === "askSubSub" || importPickerStep === "subSubCategory") && (
                            <button
                              onClick={() => {
                                if (importPickerStep === "askSub") setImportPickerStep("category");
                                else if (importPickerStep === "subcategory") setImportPickerStep("askSub");
                                else if (importPickerStep === "askSubSub") setImportPickerStep("subcategory");
                                else if (importPickerStep === "subSubCategory") setImportPickerStep("askSubSub");
                              }}
                              className="text-gray-400 hover:text-gray-700 text-lg leading-none ml-1"
                            >‹</button>
                          )}
                          <h4 className="font-bold text-gray-800 text-base">
                            {importPickerStep === "category" ? "اختر القسم الرئيسي" :
                             importPickerStep === "askSub" ? "هل تود الاستيراد داخل قسم فرعي؟" :
                             importPickerStep === "subcategory" ? "اختر القسم الفرعي" :
                             importPickerStep === "askSubSub" ? "هل تود الاستيراد داخل فرع فرعي؟" :
                             "اختر الفرع الفرعي"}
                          </h4>
                        </div>
                        <button
                          onClick={() => setShowImportCatPickerModal(false)}
                          className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                        >✕</button>
                      </div>

                      {/* Step Indicator */}
                      <div className="flex items-center gap-1 px-4 pt-3 pb-1">
                        {["category","subcategory","askSubSub","subSubCategory"].map((step, i) => (
                          <div key={step} className={`h-1.5 flex-1 rounded-full transition-colors ${
                            importPickerStep === step ? "bg-[var(--brand)]" :
                            ["category","askSub","subcategory","askSubSub","subSubCategory"].indexOf(importPickerStep) > i ? "bg-[var(--brand)] opacity-40" :
                            "bg-gray-200"
                          }`}/>
                        ))}
                      </div>

                      {/* Body */}
                      <div className="p-4 overflow-y-auto" style={{ maxHeight: "60vh" }}>
                        {/* Step 1: اختيار القسم الرئيسي */}
                        {importPickerStep === "category" && (
                          categories.length === 0 ? (
                            <p className="text-center text-gray-400 text-sm py-6">لا توجد أقسام رئيسية بعد</p>
                          ) : (
                            <div className="grid grid-cols-3 gap-3">
                              {categories.map((c: any) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => {
                                    setImportPickerSelectedCatId(String(c.id));
                                    setImportPickerSelectedSubId("");
                                    setImportPickerSelectedSubSubId("");
                                    setImportPickerStep("askSub");
                                  }}
                                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${
                                    importPickerSelectedCatId === String(c.id) ? "border-[var(--brand)] bg-blue-50" : "border-gray-100 bg-gray-50 hover:border-gray-300"
                                  }`}
                                >
                                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                                    {c.image_url ? (
                                      <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                                    ) : <span className="text-2xl">🗂️</span>}
                                  </div>
                                  <span className="text-xs text-center text-gray-700 font-medium leading-tight line-clamp-2">{c.name}</span>
                                </button>
                              ))}
                            </div>
                          )
                        )}

                        {/* Step: هل تريد الاستيراد داخل قسم فرعي؟ */}
                        {importPickerStep === "askSub" && (
                          <div className="space-y-3 py-2">
                            <p className="text-sm text-gray-600 text-center pb-2">هل تريد استيراد المنتجات داخل قسم فرعي؟</p>
                            <button
                              type="button"
                              onClick={() => setImportPickerStep("subcategory")}
                              className="w-full py-3.5 rounded-xl font-bold text-sm bg-[var(--brand)] text-white"
                            >نعم، اختر القسم الفرعي</button>
                            <button
                              type="button"
                              onClick={() => {
                                setTargetCategoryId(importPickerSelectedCatId);
                                setTargetSubcategoryId("");
                                setTargetSubSubCategoryId("");
                                setShowImportCatPickerModal(false);
                              }}
                              className="w-full py-3.5 rounded-xl font-bold text-sm bg-gray-100 text-gray-700"
                            >لا، اعتمد القسم الرئيسي فقط</button>
                          </div>
                        )}

                        {/* Step 2: اختيار القسم الفرعي */}
                        {importPickerStep === "subcategory" && (() => {
                          const filteredSubs = subcategories.filter((s: any) => String(s.category_id) === String(importPickerSelectedCatId));
                          return filteredSubs.length === 0 ? (
                            <p className="text-center text-gray-400 text-sm py-6">لا توجد أقسام فرعية لهذا القسم</p>
                          ) : (
                            <div className="grid grid-cols-3 gap-3">
                              {filteredSubs.map((s: any) => (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => {
                                    setImportPickerSelectedSubId(String(s.id));
                                    setImportPickerSelectedSubSubId("");
                                    const hasSubSubs = subSubCategories.filter((ss: any) => String(ss.subcategory_id) === String(s.id)).length > 0;
                                    if (hasSubSubs) {
                                      setImportPickerStep("askSubSub");
                                    } else {
                                      setTargetCategoryId(importPickerSelectedCatId);
                                      setTargetSubcategoryId(String(s.id));
                                      setTargetSubSubCategoryId("");
                                      setShowImportCatPickerModal(false);
                                    }
                                  }}
                                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${
                                    importPickerSelectedSubId === String(s.id) ? "border-[var(--brand)] bg-blue-50" : "border-gray-100 bg-gray-50 hover:border-gray-300"
                                  }`}
                                >
                                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                                    {s.image_url ? (
                                      <img src={s.image_url} alt={s.name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                                    ) : <span className="text-2xl">📂</span>}
                                  </div>
                                  <span className="text-xs text-center text-gray-700 font-medium leading-tight line-clamp-2">{s.name}</span>
                                </button>
                              ))}
                            </div>
                          );
                        })()}

                        {/* Step 3: هل تود الاستيراد داخل فرع فرعي؟ */}
                        {importPickerStep === "askSubSub" && (
                          <div className="space-y-3 py-2">
                            <p className="text-sm text-gray-600 text-center pb-2">هل تود استيراد المنتجات داخل قسم فرع فرعي؟</p>
                            <button
                              type="button"
                              onClick={() => setImportPickerStep("subSubCategory")}
                              className="w-full py-3.5 rounded-xl font-bold text-sm bg-[var(--brand)] text-white"
                            >نعم، اختر الفرع الفرعي</button>
                            <button
                              type="button"
                              onClick={() => {
                                setTargetCategoryId(importPickerSelectedCatId);
                                setTargetSubcategoryId(importPickerSelectedSubId);
                                setTargetSubSubCategoryId("");
                                setShowImportCatPickerModal(false);
                              }}
                              className="w-full py-3.5 rounded-xl font-bold text-sm bg-gray-100 text-gray-700"
                            >لا، استورد في القسم الفرعي فقط</button>
                          </div>
                        )}

                        {/* Step 4: اختيار الفرع الفرعي */}
                        {importPickerStep === "subSubCategory" && (() => {
                          const filteredSubSubs = subSubCategories.filter((ss: any) => String(ss.subcategory_id) === String(importPickerSelectedSubId));
                          return filteredSubSubs.length === 0 ? (
                            <p className="text-center text-gray-400 text-sm py-6">لا توجد فروع فرعية لهذا القسم</p>
                          ) : (
                            <div className="space-y-4">
                              <div className="grid grid-cols-3 gap-3">
                                {filteredSubSubs.map((ss: any) => (
                                  <button
                                    key={ss.id}
                                    type="button"
                                    onClick={() => setImportPickerSelectedSubSubId(String(ss.id))}
                                    className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${
                                      importPickerSelectedSubSubId === String(ss.id) ? "border-[var(--brand)] bg-blue-50" : "border-gray-100 bg-gray-50 hover:border-gray-300"
                                    }`}
                                  >
                                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                                      {ss.image_url ? (
                                        <img src={ss.image_url} alt={ss.name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                                      ) : <span className="text-2xl">📁</span>}
                                    </div>
                                    <span className="text-xs text-center text-gray-700 font-medium leading-tight line-clamp-2">{ss.name}</span>
                                  </button>
                                ))}
                              </div>
                              <button
                                type="button"
                                disabled={!importPickerSelectedSubSubId}
                                onClick={() => {
                                  setTargetCategoryId(importPickerSelectedCatId);
                                  setTargetSubcategoryId(importPickerSelectedSubId);
                                  setTargetSubSubCategoryId(importPickerSelectedSubSubId);
                                  setShowImportCatPickerModal(false);
                                }}
                                className="w-full bg-[var(--brand)] text-white py-3 rounded-xl font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                              >تأكيد الاختيار</button>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block font-bold">طريقة احتساب الربح الموحّد</label>
                  <div className="flex bg-gray-100 rounded-lg p-1 gap-1 mb-2">
                    <button type="button" onClick={() => setMarkupType("percent")}
                      className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${markupType === "percent" ? "bg-white text-[var(--brand)] shadow-sm" : "text-gray-500"}`}>
                      نسبة مئوية %
                    </button>
                    <button type="button" onClick={() => setMarkupType("fixed")}
                      className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${markupType === "fixed" ? "bg-white text-[var(--brand)] shadow-sm" : "text-gray-500"}`}>
                      مبلغ ثابت $
                    </button>
                  </div>
                  {markupType === "percent" ? (
                    <div className="relative">
                      <input type="number" min={0} max={500} value={markupPercent} onChange={e => setMarkupPercent(e.target.value === "" ? "" : parseFloat(e.target.value))}
                        className="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 text-sm outline-none pl-8" placeholder="0 = بدون هامش"/>
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">%</span>
                    </div>
                  ) : (
                    <div className="relative">
                      <input type="number" min={0} step={0.01} value={markupFixed} onChange={e => setMarkupFixed(e.target.value === "" ? "" : parseFloat(e.target.value))}
                        className="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 text-sm outline-none pl-8" placeholder="0 = بدون إضافة"/>
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">$</span>
                    </div>
                  )}
                  <p className="text-[10px] text-gray-400 mt-1">
                    {markupType === "percent"
                      ? "يُضاف كنسبة % فوق سعر المزود لكل المنتجات غير المخصصة"
                      : "يُضاف كمبلغ ثابت فوق سعر المزود لكل المنتجات غير المخصصة"}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">صورة موحدة <span className="text-gray-300">(اختياري)</span></label>
                  <div className="flex gap-2">
                    <input type="text" value={globalImageUrl} onChange={e => setGlobalImageUrl(e.target.value)}
                      className="flex-1 bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 text-sm outline-none" placeholder="https://... رابط الصورة"/>
                    <label className="bg-gray-100 text-gray-600 px-3 py-3 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1 whitespace-nowrap hover:bg-gray-200 transition-colors">
                      <Upload size={14}/> رفع
                      <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0]; if (!file) return;
                        try {
                          const url = await uploadImage(file);
                          setGlobalImageUrl(url);
                        } catch { showToast("خطأ في رفع الصورة", "error"); }
                      }}/>
                    </label>
                  </div>
                  {globalImageUrl && (
                    <div className="mt-2 flex items-center gap-2">
                      <OptimizedImage src={globalImageUrl} width={96} height={96} className="w-12 h-12 object-cover rounded-md border border-gray-100"/>
                      <button onClick={() => setGlobalImageUrl("")} className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded-md">حذف</button>
                    </div>
                  )}
                </div>
              </div>

              {/* جلب المنتجات وعرضها */}
              <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm"><Download size={16} className="text-[var(--brand)]"/>منتجات المزود</h3>
                  <button onClick={loadProviderProducts} disabled={loadingProducts}
                    className="bg-[var(--brand)] text-white px-4 py-2 rounded-lg text-xs font-bold disabled:opacity-50 flex items-center gap-1">
                    <RefreshCw size={12} className={loadingProducts ? "animate-spin" : ""}/>{loadingProducts ? "جاري..." : "جلب المنتجات"}
                  </button>
                </div>

                {loadingProducts && (
                  <div className="flex items-center justify-center py-8 gap-3">
                    <RefreshCw size={20} className="animate-spin text-[var(--brand)]"/>
                    <span className="text-sm text-gray-500">جاري الجلب...</span>
                  </div>
                )}

                {!loadingProducts && providerProducts.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-gray-600">المنتجات ({providerProducts.length})</p>
                      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                        <button type="button" onClick={() => setProductsViewMode("individual")}
                          className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-colors ${productsViewMode === "individual" ? "bg-white shadow-sm text-[var(--brand)]" : "text-gray-500"}`}>
                          عرض فردي
                        </button>
                        <button type="button" onClick={() => setProductsViewMode("categories")}
                          className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-colors ${productsViewMode === "categories" ? "bg-white shadow-sm text-[var(--brand)]" : "text-gray-500"}`}>
                          الأقسام ({uniqueCategories.length})
                        </button>
                      </div>
                    </div>

                    {productsViewMode === "individual" && (<>
                    <div className="flex items-center justify-between">
                      <div/>
                      <div className="flex gap-2">
                        <button onClick={() => setSelectedProducts(filteredProducts.map((p: any) => p.id))} className="text-xs text-[var(--brand)] font-bold">تحديد الكل</button>
                        <span className="text-gray-300">|</span>
                        <button onClick={() => setSelectedProducts([])} className="text-xs text-gray-400 font-bold">إلغاء الكل</button>
                      </div>
                    </div>
                    <div className="relative">
                      <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                      <input type="text" placeholder="بحث بالاسم أو الرقم أو الفئة..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 focus:border-[var(--brand)] focus:bg-white rounded-lg pr-9 pl-8 py-2.5 text-xs outline-none transition-colors"/>
                      {searchQuery && (
                        <button type="button" onClick={() => setSearchQuery("")}
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                          <X size={14}/>
                        </button>
                      )}
                    </div>
                    <CustomSelect
                      value={categoryFilter}
                      onChange={setCategoryFilter}
                      searchable
                      searchPlaceholder="بحث عن فئة..."
                      placeholder="كل الفئات"
                      truncate={false}
                      maxMenuHeight={360}
                      className="w-full"
                      buttonClassName="py-2.5"
                      options={[{ value: "", label: "كل الفئات" }, ...uniqueCategories.map((c: any) => ({ value: String(c), label: String(c) }))]}
                    />
                    {(searchQuery || categoryFilter) && (
                      <p className="text-[10px] text-gray-400 -mt-1">
                        {filteredProducts.length} نتيجة من أصل {providerProducts.length}
                      </p>
                    )}
                    {selectedProducts.length > 0 && (
                      <div className="bg-red-50 text-[var(--brand)] text-xs font-bold px-3 py-2 rounded-lg">
                        تم تحديد {selectedProducts.length} منتج
                      </div>
                    )}
                    <div className="space-y-2 max-h-72 overflow-y-auto overflow-x-hidden rounded-lg border border-gray-100">
                      {filteredProducts.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 text-xs flex flex-col items-center gap-2">
                          <Search size={22} className="text-gray-200"/>
                          لا توجد منتجات مطابقة لبحثك
                        </div>
                      ) : visibleFilteredProducts.map((p: any) => {
                        const ov = productOverrides[p.id];
                        const hasOverride = !!(ov?.name || ov?.description || ov?.price || ov?.image_url || ov?.markup_value || ov?.min_quantity || ov?.max_quantity || ov?.input_label || (ov?.fieldLabels && ov.fieldLabels.some(l => l && l.trim())));
                        const preview = computePreviewPrice(p);
                        const isPackageProduct = Array.isArray(p.qty_values) && p.qty_values.length > 0;
                        return (
                          <div key={p.id}
                            className={`flex items-start gap-2 p-3 w-full transition-all overflow-hidden ${selectedProducts.includes(p.id) ? "bg-red-50 border-r-2 border-[var(--brand)]" : "bg-white hover:bg-gray-50"}`}>
                            <div onClick={() => toggleProduct(p.id)} className="cursor-pointer flex items-start gap-2 flex-1 min-w-0 overflow-hidden">
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${selectedProducts.includes(p.id) ? "border-[var(--brand)] bg-[var(--brand)]" : "border-gray-300"}`}>
                                {selectedProducts.includes(p.id) && <CheckCircle size={12} className="text-white"/>}
                              </div>
                              {/*
                                [FIX] لما تُرفع "صورة موحدة" (globalImageUrl) كانت تُعرض كمعاينة
                                مكرَّرة داخل *كل* صف من صفوف المنتجات (تصل لمئات الصفوف دفعة واحدة).
                                هذا يعني عشرات/مئات من عناصر <img> تحاول تحميل نفس الرابط بنفس اللحظة
                                فور اختيار الصورة، فيتجمّد عرض القائمة على الموبايل وتنكسر الصفوف
                                بصرياً (تراكب زر التخصيص، اختفاء الاسم/السعر). المعاينة الفردية لكل
                                صف مفيدة فقط للصور المخصّصة (ov?.image_url) لأنها قليلة العدد عادة —
                                أما الصورة الموحّدة فتُعرض مرة واحدة فوق القائمة (انظر منطقة الرفع
                                أعلاه) وليس بالتكرار هنا.
                              */}
                              {ov?.image_url && (
                                <OptimizedImage src={ov.image_url} width={64} height={64} className="w-8 h-8 rounded-md object-cover border border-gray-100 flex-shrink-0"/>
                              )}
                              <div className="flex-1 min-w-0 overflow-hidden">
                                <p className="text-xs font-bold text-gray-800 break-words leading-snug" title={ov?.name || p.name}>{ov?.name || p.name}</p>
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  {p.category_name && <span className="text-[10px] text-gray-400 truncate max-w-[90px]">{p.category_name}</span>}
                                  <span className="text-[10px] text-gray-300 line-through whitespace-nowrap">{p.price} $</span>
                                  <span className="text-[10px] font-bold text-[var(--brand)] whitespace-nowrap">{preview} $</span>
                                  {p.id !== undefined && <span className="text-[9px] text-gray-300 whitespace-nowrap">#{p.id}</span>}
                                  {isPackageProduct && (
                                    <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 whitespace-nowrap" title={p.qty_values.join(", ")}>
                                      باقات ({p.qty_values.length})
                                    </span>
                                  )}
                                  {hasOverride && (
                                    <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 whitespace-nowrap">
                                      <Settings size={8}/> مخصص
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <button type="button" onClick={(e) => { e.stopPropagation(); setCustomizingProduct(p); }}
                              className={`relative z-10 flex-shrink-0 p-2 rounded-lg transition-colors ${hasOverride ? "bg-amber-100 text-amber-600" : "bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600"}`}
                              title="تخصيص هذا المنتج">
                              <Settings size={13}/>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    {visibleProductsCount < filteredProducts.length && (
                      <button
                        type="button"
                        onClick={() => setVisibleProductsCount(c => c + PRODUCTS_PAGE_SIZE)}
                        className="w-full py-2.5 rounded-lg text-xs font-bold bg-gray-50 text-[var(--brand)] border border-gray-100 hover:bg-gray-100 transition-colors"
                      >
                        عرض المزيد ({filteredProducts.length - visibleProductsCount} متبقي)
                      </button>
                    )}
                    </>)}

                    {productsViewMode === "categories" && (
                      <div className="space-y-2">
                        <p className="text-[10px] text-gray-400 -mt-1">
                          اختر لكل قسم القسم الرئيسي/الفرعي الهدف وهامش الربح والصورة الموحدة من "إعدادات الاستيراد" أعلاه، ثم اضغط "إضافة القسم" — تُضاف كل منتجات القسم دفعة واحدة دون الحاجة لتحديدها فردياً.
                        </p>
                        <div className="space-y-2 max-h-96 overflow-y-auto overflow-x-hidden rounded-lg border border-gray-100">
                          {uniqueCategories.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 text-xs flex flex-col items-center gap-2">
                              <LayoutGrid size={22} className="text-gray-200"/>
                              لا توجد فئات في منتجات هذا المزود
                            </div>
                          ) : uniqueCategories.map((cat: any) => {
                            const catName = String(cat);
                            const count = providerProducts.filter((p: any) => String(p?.category_name || "").trim() === catName).length;
                            return (
                              <div key={catName} className="flex items-center justify-between gap-2 p-3 bg-white hover:bg-gray-50">
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-gray-800 truncate">{catName}</p>
                                  <p className="text-[10px] text-gray-400">{count} منتج</p>
                                </div>
                                <button type="button" disabled={syncLoading || (!targetSubcategoryId && !targetCategoryId)}
                                  onClick={() => handleSyncCategory(catName)}
                                  className="shrink-0 bg-[var(--brand)] text-white px-3 py-2 rounded-lg text-[11px] font-bold disabled:opacity-40 flex items-center gap-1">
                                  <Download size={12} className={syncLoading ? "animate-bounce" : ""}/> إضافة القسم
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!loadingProducts && productsFetched && providerProducts.length === 0 && (
                  <div className="text-center py-6 bg-red-50 rounded-lg border border-red-100">
                    <Download size={32} className="mx-auto mb-2 text-red-300"/>
                    <p className="text-xs text-red-600 font-bold">لم يتم العثور على منتجات</p>
                    <p className="text-[10px] text-red-400 mt-1">تحقق من إعدادات المزود</p>
                  </div>
                )}

                {!loadingProducts && !productsFetched && (
                  <div className="text-center py-6 bg-gray-50 rounded-lg">
                    <Download size={32} className="mx-auto mb-2 text-gray-300"/>
                    <p className="text-xs text-gray-400">اضغط "جلب المنتجات" لعرض المنتجات</p>
                  </div>
                )}

                {/* زر الاستيراد — في عرض الأقسام تتم الإضافة عبر زر "إضافة القسم" الخاص بكل قسم */}
                {productsViewMode === "individual" && (
                  <button onClick={handleSync} disabled={syncLoading || (!targetSubcategoryId && !targetCategoryId)}
                    className="w-full bg-[var(--brand)] text-white py-3.5 rounded-lg font-bold disabled:opacity-40 flex items-center justify-center gap-2">
                    <Download size={16} className={syncLoading ? "animate-bounce" : ""}/>
                    {syncLoading ? "جاري الاستيراد..." : selectedProducts.length ? `استيراد ${selectedProducts.length} منتج` : "استيراد كل المنتجات"}
                  </button>
                )}

                {syncResult && (
                  <div className={`p-4 rounded-lg text-sm ${syncResult.error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                    {syncResult.error ? `خطأ: ${syncResult.error}` : (
                      <div className="space-y-1">
                        <p className="font-bold flex items-center gap-1"><CheckCircle size={14}/>اكتمل الاستيراد — {syncResult.provider}</p>
                        <p>مضاف: {syncResult.summary?.added} · محدّث: {syncResult.summary?.updated} · تجاوز: {syncResult.summary?.skipped}</p>
                        {syncResult.errors?.length > 0 && (
                          <ul className="mt-2 text-xs text-red-600 list-disc list-inside space-y-0.5">
                            {syncResult.errors.slice(0, 5).map((er: string, i: number) => <li key={i}>{er}</li>)}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 3: الطلبات — تحديث وفحص
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "orders" && (
        <div className="space-y-4">

          {/* تحديث كل الطلبات */}
          <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
              <RefreshCw size={16} className="text-[var(--brand)]"/> تحديث حالة الطلبات
            </h3>
            <p className="text-xs text-gray-500">يفحص جميع الطلبات بحالة "processing" ويحدّثها من جميع المزودين تلقائياً</p>
            <button onClick={handleRefreshOrders} disabled={refreshLoading}
              className="w-full bg-[var(--brand)] text-white py-3 rounded-lg font-bold disabled:opacity-50 flex items-center justify-center gap-2">
              <RefreshCw size={16} className={refreshLoading ? "animate-spin" : ""}/>
              {refreshLoading ? "جاري التحديث..." : "تحديث جميع الطلبات"}
            </button>
            {refreshResult && (
              <div className={`p-4 rounded-lg text-sm font-medium ${refreshResult.error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                {refreshResult.error ? `خطأ: ${refreshResult.error}` : `تم تحديث ${refreshResult.updated} طلب`}
              </div>
            )}
          </div>

          {/* فحص طلب محدد */}
          <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
              <Search size={16} className="text-[var(--brand)]"/> فحص طلب محدد
            </h3>

            {/* اختيار المزود للفحص */}
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">المزود</label>
              <select value={selectedProviderId || ""} onChange={e => setSelectedProviderId(e.target.value ? Number(e.target.value) : null)}
                className="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 text-sm outline-none">
                <option value="">-- اختر المزود --</option>
                {providers.filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className="flex gap-2">
              <input type="text" placeholder="ID الطلب أو UUID" value={checkOrderId} onChange={e => setCheckOrderId(e.target.value)}
                className="flex-1 bg-gray-50 rounded-lg px-4 py-3 text-sm outline-none border border-gray-100" dir="ltr"/>
              <button onClick={handleCheckOrder} disabled={checkLoading || !selectedProviderId}
                className="bg-[var(--brand)] text-white px-4 py-3 rounded-lg font-bold text-sm disabled:opacity-50">
                {checkLoading ? "..." : "فحص"}
              </button>
            </div>

            {checkResult && (
              <div className="bg-gray-50 p-4 rounded-lg">
                {checkResult.error ? (
                  <p className="text-red-500 text-sm">{checkResult.error}</p>
                ) : checkResult.data?.[0] ? (() => {
                  const d = checkResult.data[0];
                  const replayCodes: string[] = (() => {
                    if (!d.replay_api) return [];
                    const arr = Array.isArray(d.replay_api) ? d.replay_api : [d.replay_api];
                    return arr.filter(Boolean).map((x: any) => {
                      if (typeof x === "string") return x;
                      if (typeof x === "number") return String(x);
                      if (typeof x === "object") { const v = x.replay ?? x.code ?? x.value ?? null; return v !== null ? String(v) : JSON.stringify(x); }
                      return String(x);
                    });
                  })();
                  const statusColor = d.status === "accept" ? "text-green-700 bg-green-100" : d.status === "reject" ? "text-red-700 bg-red-100" : "text-amber-700 bg-amber-100";
                  return (
                    <div className="space-y-3">
                      <p className="text-[10px] font-bold text-gray-400 border-b border-gray-200 pb-2">تفاصيل الطلب</p>
                      {d.order_id !== undefined && <div className="flex justify-between"><span className="text-gray-500 text-sm">رقم العملية</span><span className="font-bold text-sm">{d.order_id}</span></div>}
                      {d.product_name && <div className="flex justify-between gap-2"><span className="text-gray-500 text-sm shrink-0">المنتج</span><span className="font-bold text-xs text-left">{d.product_name}</span></div>}
                      {d.qty !== undefined && <div className="flex justify-between"><span className="text-gray-500 text-sm">الكمية</span><span className="font-bold text-sm">{d.qty}</span></div>}
                      <div className="flex justify-between items-center"><span className="text-gray-500 text-sm">الحالة</span><span className={`font-bold text-sm px-3 py-1 rounded-full ${statusColor}`}>{d.status}</span></div>
                      {replayCodes.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-gray-500 text-sm font-semibold">الرد</p>
                          <div className="bg-white p-3 rounded-lg border border-gray-200">
                            <p className="text-xs text-gray-800 font-mono break-all whitespace-pre-wrap">{replayCodes.join("\n")}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })() : <p className="text-gray-500 text-sm text-center">لم يتم العثور على الطلب</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          Modal: تخصيص منتج فردي — سعر ثابت / صورة خاصة / نسبة أو مبلغ ربح خاص
      ══════════════════════════════════════════════════════════════════ */}
      {customizingProduct && (() => {
        const p = customizingProduct;
        const ov = productOverrides[p.id] || {};
        const basePrice = parseFloat(p.price) || 0;
        const draftMarkupType = ov.markup_type || "percent";
        const preview = computePreviewPrice(p);
        return (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setCustomizingProduct(null)}>
            <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 bg-white p-4 border-b border-gray-100 flex items-center justify-between z-10">
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-800 text-sm flex items-center gap-1.5"><Settings size={15} className="text-[var(--brand)]"/>تخصيص المنتج</h3>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{p.name} <span className="text-gray-300">#{p.id}</span></p>
                </div>
                <button onClick={() => setCustomizingProduct(null)} className="p-1.5 rounded-lg hover:bg-gray-100 flex-shrink-0"><X size={18} className="text-gray-400"/></button>
              </div>

              <div className="p-4 space-y-5">
                {/* اسم مخصص للمنتج */}
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block font-bold">اسم المنتج <span className="text-gray-300 font-normal">(يتجاوز اسم المزود)</span></label>
                  <input type="text" value={ov.name ?? p.name ?? ""} onChange={e => setOverride(p.id, { name: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 text-sm outline-none" placeholder="اسم المنتج"/>
                </div>

                {/* وصف مخصص للمنتج */}
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block font-bold">وصف المنتج <span className="text-gray-300 font-normal">(يتجاوز وصف المزود)</span></label>
                  <textarea value={ov.description ?? ""} onChange={e => setOverride(p.id, { description: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 text-sm outline-none h-20 resize-none" placeholder="وصف المنتج (اختياري)"/>
                </div>

                {/* السعر الأساسي والمعاينة */}
                <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-gray-400">سعر المزود الأساسي</p>
                    <p className="text-sm font-bold text-gray-600">{basePrice} $</p>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 rotate-180"/>
                  <div className="text-left">
                    <p className="text-[10px] text-gray-400">السعر النهائي المعاين</p>
                    <p className="text-base font-extrabold text-[var(--brand)]">{preview} $</p>
                  </div>
                </div>

                {/* سعر ثابت مخصص */}
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block font-bold">سعر ثابت مخصص لهذا المنتج <span className="text-gray-300 font-normal">(يتجاوز أي نسبة ربح)</span></label>
                  <div className="relative">
                    <input type="number" min={0} step={0.01} value={ov.price || ""} onChange={e => setOverride(p.id, { price: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 text-sm outline-none pl-8" placeholder="اتركه فارغاً لاستخدام الربح المحسوب"/>
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">$</span>
                  </div>
                </div>

                <div className="text-center text-[10px] text-gray-300 font-bold">— أو —</div>

                {/* ربح مخصص: نسبة أو مبلغ */}
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block font-bold">ربح مخصص لهذا المنتج فقط</label>
                  <div className="flex bg-gray-100 rounded-lg p-1 gap-1 mb-2">
                    <button type="button" onClick={() => setOverride(p.id, { markup_type: "percent" })}
                      className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${draftMarkupType === "percent" ? "bg-white text-[var(--brand)] shadow-sm" : "text-gray-500"}`}>
                      نسبة %
                    </button>
                    <button type="button" onClick={() => setOverride(p.id, { markup_type: "fixed" })}
                      className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${draftMarkupType === "fixed" ? "bg-white text-[var(--brand)] shadow-sm" : "text-gray-500"}`}>
                      مبلغ ثابت $
                    </button>
                  </div>
                  <div className="relative">
                    <input type="number" min={0} step={0.01} value={ov.markup_value || ""} onChange={e => setOverride(p.id, { markup_value: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 text-sm outline-none pl-8"
                      placeholder={draftMarkupType === "percent" ? "مثال: 15" : "مثال: 0.5"}/>
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">{draftMarkupType === "percent" ? "%" : "$"}</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {draftMarkupType === "percent" ? "يُضاف كنسبة فوق سعر المزود لهذا المنتج فقط" : "يُضاف كمبلغ ثابت فوق سعر المزود لهذا المنتج فقط"}
                  </p>
                </div>

                {/* صورة مخصصة */}
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block font-bold">صورة مخصصة لهذا المنتج</label>
                  <div className="flex gap-2">
                    <input type="text" value={ov.image_url || ""} onChange={e => setOverride(p.id, { image_url: e.target.value })}
                      className="flex-1 bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 text-sm outline-none" placeholder="https://... رابط الصورة"/>
                    <label className="bg-gray-100 text-gray-600 px-3 py-3 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1 whitespace-nowrap hover:bg-gray-200 transition-colors">
                      <Upload size={14}/> رفع
                      <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0]; if (!file) return;
                        try {
                          const url = await uploadImage(file);
                          setOverride(p.id, { image_url: url });
                        } catch { showToast("خطأ في رفع الصورة", "error"); }
                      }}/>
                    </label>
                  </div>
                  {ov.image_url && (
                    <div className="mt-2 flex items-center gap-2">
                      <OptimizedImage src={ov.image_url} width={96} height={96} className="w-12 h-12 object-cover rounded-md border border-gray-100"/>
                      <button onClick={() => setOverride(p.id, { image_url: "" })} className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded-md">حذف</button>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-100 pt-4">
                  {/* قاعدة صارمة: أي منتج من نوع "باقات" (bundle) يُخفي حقول الكمية كلياً ويعرض رسالة الباقة فقط */}
                  {isBundleProduct(p) ? (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                      <p className="text-xs font-bold text-blue-700 mb-1">هذا المنتج من نوع "باقات محددة" ({Array.isArray(p.qty_values) ? p.qty_values.length : (p.packages_data?.length || 0)} باقة)</p>
                      <p className="text-[10px] text-blue-500 leading-relaxed">
                        سيتم تلقائياً حفظ كل القيم التالية وعرضها للعميل كقائمة منسدلة يختار منها بصفحة تأكيد الطلب{Array.isArray(p.qty_values) && p.qty_values.length > 0 ? `: ${p.qty_values.join("، ")}` : ""}
                      </p>
                      <p className="text-[10px] text-blue-400 mt-1">حقول الكمية غير متاحة لهذا النوع من المنتجات — العميل يختار الباقة مباشرة.</p>
                    </div>
                  ) : (
                    <>
                      {/* كمية مخصصة لهذا المنتج (تتجاوز كمية المزود) — مقيّدة صارمة ضمن حدود المزوّد */}
                      <label className="text-xs text-gray-500 mb-1.5 block font-bold">
                        الكمية المسموحة لهذا المنتج <span className="text-gray-300 font-normal">(تتجاوز كمية المزود — مفيد مثلاً لشحن رصيد سيرياتيل بكميات محددة)</span>
                      </label>
                      {(supplierMinQty(p) != null || supplierMaxQty(p) != null) && (
                        <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100 rounded-md px-2 py-1 mb-2">
                          حدود المزوّد: {supplierMinQty(p) != null ? `الحد الأدنى ${supplierMinQty(p)}` : "بدون حد أدنى"} — {supplierMaxQty(p) != null ? `الحد الأقصى ${supplierMaxQty(p)}` : "بدون حد أقصى"}. لا يمكن تجاوز هذا النطاق.
                        </p>
                      )}
                      {/* اختيار وضع الكمية: نطاق (أقل/أكثر) أو كمية محددة ثابتة */}
                      <div className="flex gap-2 p-1 bg-gray-50 rounded-md border border-gray-100 mb-2">
                        <button
                          type="button"
                          onClick={() => setOverride(p.id, { qty_mode: "range", max_quantity: ov.min_quantity === ov.max_quantity ? "" : ov.max_quantity })}
                          className={`flex-1 py-1.5 rounded text-xs font-bold transition-colors ${(ov.qty_mode ?? (ov.min_quantity && ov.min_quantity === ov.max_quantity ? "fixed" : "range")) === "range" ? "bg-teal-500 text-white" : "text-gray-500"}`}
                        >
                          تحديد أقل وأكثر كمية
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const fixedVal = ov.min_quantity || ov.max_quantity || "1";
                            setOverride(p.id, { qty_mode: "fixed", min_quantity: fixedVal, max_quantity: fixedVal });
                          }}
                          className={`flex-1 py-1.5 rounded text-xs font-bold transition-colors ${(ov.qty_mode ?? (ov.min_quantity && ov.min_quantity === ov.max_quantity ? "fixed" : "range")) === "fixed" ? "bg-teal-500 text-white" : "text-gray-500"}`}
                        >
                          كمية محددة
                        </button>
                      </div>
                      {(ov.qty_mode ?? (ov.min_quantity && ov.min_quantity === ov.max_quantity ? "fixed" : "range")) === "fixed" ? (
                        <input type="number" min={supplierMinQty(p) ?? 0.000001} max={supplierMaxQty(p) ?? undefined} step="any" value={ov.min_quantity || ""}
                          onChange={e => setOverride(p.id, { min_quantity: e.target.value, max_quantity: e.target.value })}
                          onBlur={e => {
                            const clamped = clampQty(e.target.value, p);
                            if (clamped !== e.target.value) setOverride(p.id, { min_quantity: clamped, max_quantity: clamped });
                          }}
                          className="w-full bg-gray-50 border border-teal-200 rounded-lg px-3 py-2.5 text-sm outline-none" placeholder="الكمية المحددة"/>
                      ) : (
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <input type="number" min={supplierMinQty(p) ?? 1} max={supplierMaxQty(p) ?? undefined} value={ov.min_quantity || ""}
                              onChange={e => setOverride(p.id, { min_quantity: e.target.value })}
                              onBlur={e => {
                                const clamped = clampQty(e.target.value, p);
                                if (clamped !== e.target.value) setOverride(p.id, { min_quantity: clamped });
                              }}
                              className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5 text-sm outline-none" placeholder="أقل كمية"/>
                          </div>
                          <div className="flex-1">
                            <input type="number" min={supplierMinQty(p) ?? 1} max={supplierMaxQty(p) ?? undefined} value={ov.max_quantity || ""}
                              onChange={e => setOverride(p.id, { max_quantity: e.target.value })}
                              onBlur={e => {
                                const clamped = clampQty(e.target.value, p);
                                if (clamped !== e.target.value) setOverride(p.id, { max_quantity: clamped });
                              }}
                              className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5 text-sm outline-none" placeholder="أكثر كمية"/>
                          </div>
                        </div>
                      )}
                      {(() => {
                        const err = validateQtyOverride(p, ov);
                        return err ? <p className="text-[10px] text-red-500 font-bold mt-1 bg-red-50 border border-red-100 rounded-md px-2 py-1">{err}</p> : null;
                      })()}
                      <p className="text-[10px] text-gray-400 mt-1">اتركهما فارغين لاستخدام الكمية القادمة من المزود تلقائياً. إذا حددت كمية = 1 لكل من الأقل والأكثر، سيختفي حقل الكمية عند العميل وتُحسب الكمية 1 تلقائياً.</p>
                    </>
                  )}
                </div>

                {/* [NAME VERIFICATION] تفعيل التحقق من الاسم لهذا المنتج المستورد من المزود الخارجي */}
                <NameVerificationFields
                  value={{
                    name_verification_enabled: !!ov.name_verification_enabled,
                    name_verification_game: ov.name_verification_game || "",
                    name_verification_region: ov.name_verification_region || "",
                    name_verification_source_field_ids: ov.name_verification_source_field_ids || [],
                  }}
                  onChange={(val: NameVerificationValue) => setOverride(p.id, val)}
                  adminFetch={adminFetch}
                  availableFields={
                    Array.isArray(p.params) && p.params.length > 0
                      ? p.params.map((label: any, idx: number) => {
                          // [FIX] بعض المزوّدين يرسلون params كعناصر كائن (object) بدل نص خام —
                          // عرض كائن مباشرة كـ React child يسبب خطأ React #31. نحوّل دائماً لنص آمن.
                          const safeLabel = typeof label === "string" ? label : (label?.label ?? label?.name ?? String(idx + 1));
                          return {
                            id: idx === 0 ? "__legacy_default_id__" : `provider_param_${idx}`,
                            label: (ov.fieldLabels?.[idx]?.trim()) || safeLabel,
                          };
                        })
                      : [{ id: "0", label: "المعرف (Player ID)" }]
                  }
                />


                {Array.isArray(p.params) && p.params.length > 0 ? (
                  <div>
                    {/* خانات الإدخال المطلوبة فعلياً من المزوّد لهذا المنتج تحديداً — كل خانة
                        هنا هي عنصر مستقل داخل ap.params (مثال: "Enter Player ID"، أو لمزودين
                        آخرين قد تكون أكثر من خانة مثل "Email" + "Password"). يمكن للأدمن إعادة
                        تسمية كل خانة على حدة، وستظهر بنفس الترتيب والتسمية للعميل في صفحة
                        تأكيد الطلب. اتركها فارغة لاستخدام الاسم القادم من المزوّد كما هو. */}
                    <label className="text-xs text-gray-500 mb-1.5 block font-bold">
                      خانات الإدخال المطلوبة من العميل ({p.params.length})
                    </label>
                    <div className="space-y-2">
                      {p.params.map((providerLabelRaw: any, idx: number) => {
                        // [FIX] نفس معالجة الأمان أعلاه: providerLabelRaw قد تصل ككائن من بعض المزوّدين.
                        const providerLabel = typeof providerLabelRaw === "string"
                          ? providerLabelRaw
                          : (providerLabelRaw?.label ?? providerLabelRaw?.name ?? `خانة ${idx + 1}`);
                        return (
                          <div key={idx}>
                            <label className="text-[11px] text-gray-400 mb-1 block">
                              الخانة {idx + 1} — الاسم الأصلي من المزوّد: <span className="font-bold text-gray-500">{providerLabel}</span>
                            </label>
                            <input
                              type="text"
                              value={(ov.fieldLabels && ov.fieldLabels[idx]) || ""}
                              onChange={e => {
                                const next = [...(ov.fieldLabels || [])];
                                next[idx] = e.target.value;
                                setOverride(p.id, { fieldLabels: next });
                              }}
                              className="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 text-sm outline-none"
                              placeholder={`اسم مخصص بدل "${providerLabel}" (اختياري)`}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">جميع هذه الخانات إلزامية على العميل إدخالها لإتمام الطلب (كما يتطلبها المزوّد).</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-4 py-3">
                      هذا المنتج لا يتطلب أي بيانات إضافية من العميل حسب المزوّد — لن تُعرض أي خانة إدخال في صفحة تأكيد الطلب.
                    </p>
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 bg-white p-4 border-t border-gray-100 flex gap-2">
                <button onClick={() => { clearOverride(p.id); setCustomizingProduct(null); }}
                  className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-lg font-bold text-sm">إعادة تعيين</button>
                <button
                  onClick={() => {
                    const err = validateQtyOverride(p, ov);
                    if (err) { showToast(err, "error"); return; }
                    setCustomizingProduct(null);
                  }}
                  disabled={!!validateQtyOverride(p, ov)}
                  className="flex-1 bg-[var(--brand)] text-white py-3 rounded-lg font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed">حفظ التخصيص</button>
              </div>
            </div>
          </div>
        );
      })()}


      {/* ═══ [PROVIDER-PRODUCTS] المحرر الشامل للمنتج — نفس نموذج صفحة العناصر بكل حقوله (وضع editorOnly) ═══ */}
      <AdminElementsPage
        ref={elementsEditorRef}
        editorOnly
        categories={categories}
        subcategories={subcategories}
        subSubCategories={subSubCategories}
        fetchCategories={fetchCategories}
        fetchSubcategories={fetchSubcategories}
        fetchSubSubCategories={fetchSubSubCategories}
        paymentMethods={[]}
        fetchPaymentMethods={() => {}}
        banners={[]}
        fetchBanners={() => {}}
        offers={[]}
        fetchOffers={() => {}}
        handleDelete={() => {}}
        handleToggleActive={() => {}}
        adminFetch={adminFetch}
        onProductSaved={() => { loadCurrentProducts(); }}
      />

      {/* ═══ [PROVIDER-PRODUCTS] نافذة الحذف الجماعي ═══ */}
      <AnimatePresence>
        {bulkDialog && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 z-[95] bg-black/60 flex items-center justify-center p-4" onClick={() => setBulkDialog(null)}>
            <motion.div initial={{scale:0.92,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.92,opacity:0}}
              className="bg-white w-full max-w-sm rounded-2xl p-5 space-y-4 shadow-2xl" dir="rtl" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-gray-800 text-base">حذف {bulkDialog.ids.length} منتج</h3>
              {bulkDialog.ordersCount === null ? (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-3 leading-relaxed">تعذّر التحقق من الطلبات السابقة لبعض المنتجات. الأأمن: التعطيل، أو «حذف الآمن» الذي يترك لكل منتج قرار الخادم.</p>
              ) : bulkDialog.ordersCount > 0 ? (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-3 leading-relaxed">
                  <b>{bulkDialog.ordersCount}</b> من المنتجات المحددة لها طلبات سابقة.
                  <br/>• <b>تعطيل الكل:</b> يخفيها من المتجر ويحفظ سجل الطلبات.
                  <br/>• <b>حذف آمن:</b> يحذف التي بلا طلبات ويعطّل التي لها طلبات.
                  <br/>• <b>حذف نهائي للكل:</b> لا رجعة فيه وقد يؤثر على الطلبات القديمة.
                </p>
              ) : (
                <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3 leading-relaxed">لا توجد طلبات سابقة على أي منها، يمكن حذفها نهائياً بأمان.</p>
              )}
              <div className="space-y-2">
                <button type="button" onClick={() => executeBulkDelete("disable")} className="w-full py-3 rounded-xl font-bold text-sm bg-amber-500 text-white">تعطيل الكل</button>
                {(bulkDialog.ordersCount === null || bulkDialog.ordersCount > 0) && (
                  <button type="button" onClick={() => executeBulkDelete("safe")} className="w-full py-3 rounded-xl font-bold text-sm bg-gray-800 text-white">حذف آمن (يعطّل ما له طلبات)</button>
                )}
                <button type="button" onClick={() => executeBulkDelete("force")} className="w-full py-3 rounded-xl font-bold text-sm bg-red-600 text-white">حذف نهائي للكل</button>
                <button type="button" onClick={() => setBulkDialog(null)} className="w-full py-3 rounded-xl font-bold text-sm bg-gray-100 text-gray-700">إلغاء</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ [PROVIDER-PRODUCTS] نافذة حذف المنتج: إلغاء / تعطيل / حذف نهائي ═══ */}
      <AnimatePresence>
        {deleteDialog && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 z-[95] bg-black/60 flex items-center justify-center p-4" onClick={() => setDeleteDialog(null)}>
            <motion.div initial={{scale:0.92,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.92,opacity:0}}
              className="bg-white w-full max-w-sm rounded-2xl p-5 space-y-4 shadow-2xl" dir="rtl" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-gray-800 text-base">حذف «{deleteDialog.product.name}»</h3>
              {deleteDialog.hasOrders ? (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-3 leading-relaxed">
                  لهذا المنتج طلبات سابقة. <b>التعطيل</b> يخفيه من المتجر ويُبقي سجل الطلبات والإحصائيات سليمة (موصى به).
                  أما <b>الحذف النهائي</b> فلا يمكن التراجع عنه وقد يؤثر على عرض الطلبات القديمة.
                </p>
              ) : (
                <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3 leading-relaxed">
                  لا توجد طلبات سابقة على هذا المنتج، يمكن حذفه نهائياً بأمان.
                </p>
              )}
              <div className="space-y-2">
                {deleteDialog.hasOrders && (
                  <button type="button" onClick={() => executeDeleteCurrentProduct("disable")}
                    className="w-full py-3 rounded-xl font-bold text-sm bg-amber-500 text-white">تعطيل المنتج (موصى به)</button>
                )}
                <button type="button" onClick={() => executeDeleteCurrentProduct("force")}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-red-600 text-white">حذف نهائي</button>
                <button type="button" onClick={() => setDeleteDialog(null)}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-gray-100 text-gray-700">إلغاء</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default function AdminPage({
  user,
  fetchUser,
  categories,
  subcategories,
  subSubCategories,
  fetchCategories,
  fetchSubcategories,
  fetchSubSubCategories,
  paymentMethods,
  fetchPaymentMethods,
  banners,
  fetchBanners,
  offers,
  fetchOffers,
  setIsAdmin,
  theme,
  adminTab,
  setAdminTab,
  focusTarget,
  setFocusTarget,
  setSiteSettings,
  selectedChatUser,
  setSelectedChatUser,
  adminFetch,
  handleChangeAdminPassword,
  newAdminPass,
  setNewAdminPass,
  adminChatView,
  setAdminAuth,
}: AdminPageProps) {
  const [adminOrders, setAdminOrders] = useState<any[]>([]);
    const [adminOrdersLoading, setAdminOrdersLoading] = useState(true);
    const pendingApprovalOrdersCount = adminOrders.filter((o: any) => o.status === 'pending_admin').length;
    const [adminTransactions, setAdminTransactions] = useState<any[]>([]);
    const [orderSearch, setOrderSearch] = useState("");
    const [orderDateFilter, setOrderDateFilter] = useState("");
    const [transSearch, setTransSearch] = useState("");
    const [transDateFilter, setTransDateFilter] = useState("");
    const [newCategory, setNewCategory] = useState({ name: "", image_url: "", special_id: "" });
    const [newSubcategory, setNewSubcategory] = useState({ category_special_id: "", name: "", image_url: "", special_id: "" });
    const [newSubSubCategory, setNewSubSubCategory] = useState({ subcategory_special_id: "", name: "", image_url: "", special_id: "" });
    const [showAddProductPreview, setShowAddProductPreview] = useState(false);
    const [savingAddProductDraft, setSavingAddProductDraft] = useState(false);
    const [newProduct, setNewProduct] = useState({ 
      category_special_id: "", 
      subcategory_special_id: "", 
      sub_sub_category_special_id: "",
      name: "", 
      price: "", 
      description: "", 
      image_url: "", 
      requires_input: false, 
      store_type: "normal",
      min_quantity: "",
      max_quantity: "",
      price_per_unit: "",
      external_id: "",
      input_label: "",
      inventory_group_id: "" as string | number,
      image_urls: [] as string[],
      default_profit: "",
      package_values: [] as string[],
      packages_data: [{ label: "", price: "" }] as { label: string; price: string }[],
      name_verification_enabled: false,
      name_verification_game: "",
      name_verification_region: "",
      name_verification_source_field_ids: [] as string[]
    });
    const [showNameVerificationKeysModal, setShowNameVerificationKeysModal] = useState(false);
    const [newPackageValueInput, setNewPackageValueInput] = useState("");
    const [addProductInventoryUnits, setAddProductInventoryUnits] = useState<any[]>([]);
    const [showAddProductInventoryModal, setShowAddProductInventoryModal] = useState(false);
    const [addProductNewUnitContent, setAddProductNewUnitContent] = useState("");
    const [addProductBulkImportText, setAddProductBulkImportText] = useState("");
    const [addProductInventoryBusy, setAddProductInventoryBusy] = useState(false);
    // وضع الكمية لمنتج الـ API الخارجي: "range" = تحديد أقل/أكثر كمية، "fixed" = كمية محددة واحدة فقط
    const [extApiQtyMode, setExtApiQtyMode] = useState<"range" | "fixed">("range");

    // ينشئ مجموعة مخزون تلقائياً (مرة واحدة) عند أول إضافة عنصر لمنتج جديد
    const ensureAddProductInventoryGroup = async (): Promise<number | null> => {
      if (newProduct.inventory_group_id) return Number(newProduct.inventory_group_id);
      try {
        const res = await adminFetch("/api/admin/inventory/groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newProduct.name?.trim() || `مخزون منتج جديد ${Date.now()}` })
        });
        if (!res.ok) return null;
        const data = await res.json();
        setNewProduct(p => ({ ...p, inventory_group_id: data.id }));
        return data.id;
      } catch { return null; }
    };

    const loadAddProductInventoryUnits = async (groupId: number) => {
      try {
        const res = await adminFetch(`/api/admin/inventory/groups/${groupId}/units`);
        const data = await res.json();
        setAddProductInventoryUnits(Array.isArray(data) ? data : []);
      } catch { setAddProductInventoryUnits([]); }
    };

    const addProductSingleUnit = async () => {
      if (!addProductNewUnitContent.trim()) return;
      setAddProductInventoryBusy(true);
      try {
        const groupId = await ensureAddProductInventoryGroup();
        if (!groupId) return;
        const res = await adminFetch(`/api/admin/inventory/groups/${groupId}/units`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: addProductNewUnitContent })
        });
        if (res.ok) {
          setAddProductNewUnitContent("");
          loadAddProductInventoryUnits(groupId);
        }
      } finally { setAddProductInventoryBusy(false); }
    };

    const addProductBulkImport = async () => {
      if (!addProductBulkImportText.trim()) return;
      setAddProductInventoryBusy(true);
      try {
        const groupId = await ensureAddProductInventoryGroup();
        if (!groupId) return;
        const res = await adminFetch(`/api/admin/inventory/groups/${groupId}/bulk-import`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: addProductBulkImportText })
        });
        if (res.ok) {
          setAddProductBulkImportText("");
          loadAddProductInventoryUnits(groupId);
        }
      } finally { setAddProductInventoryBusy(false); }
    };

    const deleteAddProductUnit = async (unitId: number) => {
      try {
        const res = await adminFetch(`/api/admin/inventory/units/${unitId}`, { method: "DELETE" });
        if (res.ok && newProduct.inventory_group_id) {
          loadAddProductInventoryUnits(Number(newProduct.inventory_group_id));
        }
      } catch {}
    };
    const [customFields, setCustomFields] = useState<Array<{id: string; key?: string; label: string; required: boolean; isDefault?: boolean}>>([]);
    const [newPaymentMethod, setNewPaymentMethod] = useState({ name: "", image_url: "", wallet_address: "", qr_enabled: false, min_amount: "", instructions: "", description: "", method_type: "manual", api_account: "", payment_currency: "USD", currency_id: "" as string | number, bonus_type: "" as "" | "commission" | "bonus", bonus_percent: "" });
    const [availableCurrencies, setAvailableCurrencies] = useState<Array<{ id: number; name: string; symbol: string; exchange_rate: number; is_default?: boolean }>>([]);
    // سيرياتيل كاش يقبل فقط عملة الليرة السورية (ل.س / SYP) لأن الـ API يرد بها حصراً
    const isSypCurrency = (c: { name?: string; symbol?: string }) => {
      const n = (c.name || "").toUpperCase();
      const s = (c.symbol || "").toUpperCase();
      return n === "SYP" || n.includes("ليرة") || n.includes("سوري") || s === "SYP" || s.includes("ل.س") || s.includes("ل س");
    };
    // شام كاش قد يرد عبر الـ API إما بالدولار (USD) أو بالليرة السورية (SYP) — لذلك يُسمح باختيار أي منهما
    const isUsdCurrency = (c: { name?: string; symbol?: string }) => {
      const n = (c.name || "").toUpperCase();
      const s = (c.symbol || "").toUpperCase();
      return n === "USD" || n.includes("دولار") || s === "USD" || s === "$";
    };
    // عملة الدولار الأساسية (الافتراضية) لا تأتي ضمن قائمة /api/admin/currencies لأنها ليست صفاً في القاعدة — نضيفها يدوياً هنا لتظهر في القوائم
    const USD_BASE_CURRENCY = { id: "usd" as any, name: "الدولار الأمريكي", symbol: "$", exchange_rate: 1, is_default: !availableCurrencies.some(c => c.is_default) };
    const currenciesForSelectedMethodType = newPaymentMethod.method_type === "syriatel"
      ? availableCurrencies.filter(isSypCurrency)
      : (newPaymentMethod.method_type === "shamcash" || newPaymentMethod.method_type === "binance")
      ? [USD_BASE_CURRENCY, ...availableCurrencies.filter(c => isSypCurrency(c) || isUsdCurrency(c))]
      : (newPaymentMethod.method_type === "crypto_usdt_trc20" || newPaymentMethod.method_type === "crypto_usdt_bep20")
      ? [USD_BASE_CURRENCY, ...availableCurrencies.filter(c => isUsdCurrency(c))]
      : newPaymentMethod.method_type === "manual"
      ? [USD_BASE_CURRENCY, ...availableCurrencies]
      : availableCurrencies;
    const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
    const [paymentMethodFields, setPaymentMethodFields] = useState<PaymentFieldDef[]>(() => ensurePaymentMethodDefaultFields([]));
    const [newBanner, setNewBanner] = useState({ image_url: "" });
    const [manualTopup, setManualTopup] = useState({ userId: "", amount: "" });
    const [topupSearchQuery, setTopupSearchQuery] = useState("");
    const [topupSearchResults, setTopupSearchResults] = useState<any[]>([]);
    const [topupSelectedUser, setTopupSelectedUser] = useState<any>(null);
    const [topupSearchLoading, setTopupSearchLoading] = useState(false);
    const [settings, setSettings] = useState<any[]>([]);
    const [privacyPolicy, setPrivacyPolicy] = useState("");
    const [supportWhatsapp, setSupportWhatsapp] = useState("");
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [maintenanceIp, setMaintenanceIp] = useState("");
    const [entryPopupEnabled, setEntryPopupEnabled] = useState(false);
    const [entryPopupText, setEntryPopupText] = useState("");
    const [entryPopupLink, setEntryPopupLink] = useState("");
    const [entryPopupFrequency, setEntryPopupFrequency] = useState("1");

    const [adminUsers, setAdminUsers] = useState<any[]>([]);
    const [adminVouchers, setAdminVouchers] = useState<any[]>([]);
    const [adminProducts, setAdminProducts] = useState<any[]>([]);
    const [selectedSubId, setSelectedSubId] = useState("");
    const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);
    const [adminSidebarOpen, setAdminSidebarOpen] = useState(false);

    useEffect(() => {
      if (activeSubMenu === "add_paymentMethod" && availableCurrencies.length === 0) {
        adminFetch("/api/admin/currencies")
          .then(r => r.json())
          .then(d => setAvailableCurrencies(Array.isArray(d?.currencies) ? d.currencies : []))
          .catch(() => showToast("تعذّر تحميل قائمة العملات", "error"));
      }
    }, [activeSubMenu]);

    const [showCategoryPickerModal, setShowCategoryPickerModal] = useState(false);
    const [showSubSubCatPickerModal, setShowSubSubCatPickerModal] = useState(false);
    const [subSubCatPickerStep, setSubSubCatPickerStep] = useState<"category" | "subcategory">("category");
    const [subSubCatPickerSelectedCatId, setSubSubCatPickerSelectedCatId] = useState<string>("");

    // Product Category Picker Modal state
    const [showProductCatPickerModal, setShowProductCatPickerModal] = useState(false);
    const [productPickerStep, setProductPickerStep] = useState<"category" | "askSub" | "subcategory" | "askSubSub" | "subSubCategory">("category");
    const [productPickerSelectedCatId, setProductPickerSelectedCatId] = useState<string>("");
    const [productPickerSelectedSubId, setProductPickerSelectedSubId] = useState<string>("");
    const [productPickerSelectedSubSubId, setProductPickerSelectedSubSubId] = useState<string>("");

    // Discount customization state
    const [vipDiscountVal, setVipDiscountVal] = useState("5");
    const [referralCommissionVal, setReferralCommissionVal] = useState("10");

    // Rewards customization state
    const [rewardGoals, setRewardGoals] = useState<any[]>([
      { id: 1, order: 1, target: 5,   name: "الهدف الأول",   description: "وسام البداية + لقب ناشئ + إطار برونزي",   frame: "bronze",       badge: "bronze",    title_type: "ناشئ",          discount: "" },
      { id: 2, order: 2, target: 15,  name: "الهدف الثاني",  description: "شارة النشاط + لقب نشيط + إطار فضي",         frame: "silver",       badge: "active",    title_type: "نشيط",          discount: "" },
      { id: 3, order: 3, target: 30,  name: "الهدف الثالث",  description: "شارة الطاقة + لقب متميز + رمز الطاقة",      frame: "",             badge: "energy",    title_type: "متميز",         discount: "" },
      { id: 4, order: 4, target: 50,  name: "الهدف الرابع",  description: "شارة فضية + لقب VIP + إطار VIP + أولوية",   frame: "vip",          badge: "silver",    title_type: "VIP",           discount: "" },
      { id: 5, order: 5, target: 100, name: "الهدف الخامس",  description: "تاج ذهبي + لقب نجم + إطار ذهبي متحرك",      frame: "gold_animated",badge: "gold",      title_type: "نجم",           discount: "" },
      { id: 6, order: 6, target: 200, name: "الهدف السادس",  description: "شارة الماس + لقب أسطورة + دعم خاص",          frame: "",             badge: "diamond",   title_type: "أسطورة",        discount: "3" },
      { id: 7, order: 7, target: 500, name: "الهدف السابع",  description: "شارة أسطورية + لقب أسطورة الشحن + كل الثيمات", frame: "",           badge: "legendary", title_type: "أسطورة الشحن", discount: "5" },
    ]);
    const [editingGoal, setEditingGoal] = useState<any>(null);
    const [savingDiscount, setSavingDiscount] = useState(false);
    const [savingReward, setSavingReward] = useState(false);

    const fetchAdminProducts = async (subId: string) => {
      if (!subId) return;
      const res = await fetch(`/api/products?subId=${subId}`);
      const data = await res.json();
      setAdminProducts(data);
    };

    const handleUpdateProductPrice = async (id: number, currentPrice: number, storeType?: string) => {
      const label = storeType === 'quantities' ? "السعر الجديد للكمية الأساسية" : "السعر الجديد";
      showPromptDialog(`أدخل ${label}:`, "تعديل السعر", async (newPrice) => {
        if (newPrice !== null && newPrice !== '') {
          const res = await adminFetch(`/api/admin/products/${id}/price`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ price: parseFloat(newPrice) })
          });
          if (res.ok) {
            showToast("تم التحديث بنجاح", 'success');
            fetchAdminProducts(selectedSubId);
          }
        }
      }, currentPrice.toString(), `مثال: ${currentPrice}`);
    };
    const [newVoucher, setNewVoucher] = useState({ code: "", amount: "", max_uses: "" });
    const [newOffer, setNewOffer] = useState({ title: "", description: "", image_url: "" });

    const [exportDBBusy, setExportDBBusy] = useState(false);
    const [importDBBusy, setImportDBBusy] = useState(false);

    // تحويل كائن قاعدة البيانات (جداول -> صفوف) إلى نص CSV واحد يضم كل الجداول تباعاً
    const convertDBToCSV = (data: Record<string, any>) => {
      const csvEscape = (val: any) => {
        if (val === null || val === undefined) return "";
        const str = typeof val === "object" ? JSON.stringify(val) : String(val);
        if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
        return str;
      };
      const lines: string[] = [];
      for (const [table, rows] of Object.entries(data)) {
        if (table === "__meta" || !Array.isArray(rows)) continue;
        lines.push(`# TABLE: ${table}`);
        if (rows.length === 0) {
          lines.push("");
          continue;
        }
        const columns = Array.from(rows.reduce((set: Set<string>, row: any) => {
          Object.keys(row || {}).forEach(k => set.add(k));
          return set;
        }, new Set<string>()));
        lines.push(columns.map(csvEscape).join(","));
        for (const row of rows) {
          lines.push(columns.map((c: string) => csvEscape((row as any)?.[c])).join(","));
        }
        lines.push("");
      }
      return lines.join("\n");
    };

    // تحويل كائن قاعدة البيانات إلى نص TXT مقروء (جدول تلو الآخر)
    const convertDBToTXT = (data: Record<string, any>) => {
      const lines: string[] = [];
      lines.push(`تصدير قاعدة البيانات - ${new Date().toLocaleString('ar')}`);
      lines.push("=".repeat(40));
      for (const [table, rows] of Object.entries(data)) {
        if (table === "__meta" || !Array.isArray(rows)) continue;
        lines.push("");
        lines.push(`جدول: ${table} (${rows.length} صف)`);
        lines.push("-".repeat(40));
        rows.forEach((row: any, i: number) => {
          lines.push(`[${i + 1}] ${JSON.stringify(row)}`);
        });
      }
      return lines.join("\n");
    };

    const handleExportDB = async (format: "json" | "csv" | "txt" = "json") => {
      if (exportDBBusy) return;
      setExportDBBusy(true);
      try {
        const res = await adminFetch("/api/admin/export-db", { headers: { "x-admin-token": localStorage.getItem("adminToken") || "" } });
        if (!res.ok) throw new Error("export failed");
        const data = await res.json();

        let content: string;
        let mime: string;
        if (format === "csv") {
          content = convertDBToCSV(data);
          mime = "text/csv";
        } else if (format === "txt") {
          content = convertDBToTXT(data);
          mime = "text/plain";
        } else {
          content = JSON.stringify(data, null, 2);
          mime = "application/json";
        }

        const blob = new Blob([content], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `database_export_${new Date().toISOString().split('T')[0]}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
        showToast("تم تصدير البيانات بنجاح", 'success');
      } catch (e) {
        showToast("فشل تصدير البيانات", 'error');
      } finally {
        setExportDBBusy(false);
      }
    };

    const handleImportDB = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      const inputEl = e.target;
      if (!file) return;

      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!["json", "csv", "txt"].includes(ext || "")) {
        showToast("صيغة الملف غير مدعومة. الرجاء اختيار ملف JSON أو CSV أو TXT", 'error');
        inputEl.value = "";
        return;
      }

      showConfirm("تحذير: سيتم مسح كافة البيانات الحالية واستبدالها بالبيانات المستوردة. هل أنت متأكد؟", "استيراد قاعدة البيانات", () => {
        setImportDBBusy(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const raw = event.target?.result as string;
            let data: any;

            if (ext === "json") {
              data = JSON.parse(raw);
            } else {
              // نقبل ملفات CSV/TXT فقط إذا كانت في الأصل تصديراً بصيغة JSON محفوظاً بامتداد مختلف
              try {
                data = JSON.parse(raw);
              } catch {
                throw new Error("لا يمكن استيراد ملفات CSV/TXT إلا إذا كانت تحتوي على بيانات JSON صالحة (نفس محتوى التصدير)");
              }
            }

            const res = await adminFetch("/api/admin/import-db", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data)
            });
            const result = await res.json();
            if (res.ok && result.success && !result.partial) {
              showToast(`تم استيراد البيانات بنجاح! (${result.totalImported ?? ""} صف). سيتم إعادة تحميل الصفحة.`, 'success');
              setTimeout(() => window.location.reload(), 1500);
            } else if (result.partial) {
              const errCount = (result.errors || []).length;
              const firstErrs = (result.errors || []).slice(0, 5).join(" | ");
              showToast(
                `تم استيراد ${result.totalImported ?? 0} صف بنجاح، مع ${errCount} تحذير/خطأ${firstErrs ? `: ${firstErrs}` : ""}`,
                result.totalImported ? 'info' : 'error'
              );
              if (result.totalImported) setTimeout(() => window.location.reload(), 2500);
            } else {
              showToast(`فشل الاستيراد: ${result.error || "خطأ غير معروف"}`, 'error');
            }
          } catch (err: any) {
            showToast(err?.message || "ملف غير صالح", 'info');
          } finally {
            setImportDBBusy(false);
            inputEl.value = "";
          }
        };
        reader.onerror = () => {
          setImportDBBusy(false);
          inputEl.value = "";
          showToast("تعذّرت قراءة الملف", 'error');
        };
        reader.readAsText(file);
      }, true);
    };

    const handleClearDB = async () => {
      showConfirm("هل أنت متأكد من مسح كافة بيانات الموقع؟ لا يمكن التراجع عن هذه الخطوة.", "مسح قاعدة البيانات", async () => {
        const res = await adminFetch("/api/admin/clear-db", { method: "POST" });
        if (res.ok) {
          showToast("تم مسح قاعدة البيانات بنجاح", 'success');
          window.location.reload();
        }
      }, true);
    };

    useEffect(() => {
      fetchAdminOrders();
      fetchAdminTransactions();
      fetchAdminUsers();
      fetchAdminSettings();
      fetchAdminVouchers();
    }, []);

    const fetchAdminVouchers = async () => {
      const res = await adminFetch("/api/admin/vouchers", { headers: { "x-admin-token": localStorage.getItem("adminToken") || "" } });
      const data = await res.json();
      setAdminVouchers(data);
    };

    const handleCreateVoucher = async () => {
      const res = await adminFetch("/api/admin/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newVoucher, max_uses: newVoucher.max_uses === "" ? "1" : newVoucher.max_uses })
      });
      if (res.ok) {
        setNewVoucher({ code: "", amount: "", max_uses: "" });
        fetchAdminVouchers();
        showToast("تم إنشاء الكود بنجاح", 'success');
      } else {
        const data = await res.json();
        showToast(data.error || "فشل إنشاء الكود", 'error');
      }
    };

    const handleDeleteVoucher = async (id: number) => {
      showConfirm("هل أنت متأكد من حذف هذا الكود؟", "حذف الكود", async () => {
        const res = await adminFetch(`/api/admin/vouchers/${id}`, { method: "DELETE" });
        if (res.ok) {
          fetchAdminVouchers();
          showToast("تم حذف الكود", 'success');
        }
      }, true);
    };

    const fetchAdminSettings = async () => {
      const res = await fetch("/api/settings");
      const data = await res.json();
      setSettings(data);
      const pp = data.find((s: any) => s.key === 'privacy_policy');
      const sw = data.find((s: any) => s.key === 'support_whatsapp');
      const vd = data.find((s: any) => s.key === 'vip_discount');
      const rc = data.find((s: any) => s.key === 'referral_commission');
      const mm = data.find((s: any) => s.key === 'maintenance_mode');
      const mi = data.find((s: any) => s.key === 'maintenance_allowed_ip');
      const epe = data.find((s: any) => s.key === 'entry_popup_enabled');
      const ept = data.find((s: any) => s.key === 'entry_popup_text');
      const epl = data.find((s: any) => s.key === 'entry_popup_link');
      const epf = data.find((s: any) => s.key === 'entry_popup_frequency');
      if (pp) setPrivacyPolicy(pp.value);
      if (sw) setSupportWhatsapp(sw.value);
      if (vd) setVipDiscountVal(vd.value);
      if (rc) setReferralCommissionVal(rc.value);
      if (mm) setMaintenanceMode(mm.value === 'true');
      if (mi) setMaintenanceIp(mi.value);
      setEntryPopupEnabled(epe ? epe.value === 'true' : false);
      setEntryPopupText(ept ? ept.value : "");
      setEntryPopupLink(epl ? epl.value : "");
      setEntryPopupFrequency(epf ? epf.value : "1");
    };

    const handleUpdateSetting = async (key: string, value: string) => {
      const res = await adminFetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value })
      });
      if (res.ok) {
        showToast("تم تحديث الإعداد بنجاح", 'success');
        fetchAdminSettings();
        // تحديث siteSettings في الـ App الرئيسي لتنعكس التغييرات فوراً
        fetch("/api/settings").then(r => r.json()).then((data: any[]) => setSiteSettings(data)).catch(() => {});
      }
    };

    const handleSaveEntryPopup = async () => {
      const res = await adminFetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: [
            { key: "entry_popup_enabled", value: entryPopupEnabled ? "true" : "false" },
            { key: "entry_popup_text", value: entryPopupText },
            { key: "entry_popup_link", value: entryPopupLink },
            { key: "entry_popup_frequency", value: entryPopupFrequency },
          ],
        }),
      });
      if (res.ok) {
        showToast("تم حفظ إعدادات إشعار الدخول", 'success');
        fetchAdminSettings();
        fetch("/api/settings").then(r => r.json()).then((data: any[]) => setSiteSettings(data)).catch(() => {});
      } else {
        showToast("فشل حفظ الإعدادات", 'error');
      }
    };

    const handleCloudSync = async () => {
      showConfirm("هل تريد مزامنة كافة البيانات الحالية مع قاعدة البيانات السحابية (Supabase)؟", "مزامنة سحابية", async () => {
        try {
          const res = await adminFetch("/api/admin/sync-to-cloud", { method: "POST" });
          const data = await res.json();
          if (res.ok) {
            let msg = "تمت المزامنة السحابية بنجاح!";
            showToast(msg, 'success');
          } else {
            showToast(`فشل المزامنة: ${data.error}`, 'error');
          }
        } catch (e) {
          showToast("خطأ في الاتصال بالسيرفر", 'error');
        }
      }, false);
    };

    const fetchAdminUsers = async () => {
      const res = await adminFetch("/api/admin/users", { headers: { "x-admin-token": localStorage.getItem("adminToken") || "" } });
      const data = await res.json();
      setAdminUsers(Array.isArray(data) ? data : []);
    };

    const handleToggleVip = async (userId: number, currentStatus: boolean) => {
      const res = await adminFetch(`/api/admin/users/${userId}/vip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVip: !currentStatus })
      });
      if (res.ok) {
        fetchAdminUsers();
        showToast("تم تحديث حالة VIP", 'success');
      }
    };

    const handleDeleteUser = async (userId: number) => {
      showConfirm("هل أنت متأكد من حذف هذا المستخدم نهائياً؟ لا يمكن التراجع!", "حذف المستخدم", async () => {
        try {
          const res = await adminFetch(`/api/admin/users/${userId}`, { method: "DELETE" });
          const data = await res.json();
          if (res.ok) {
            showToast("تم حذف المستخدم بنجاح", 'success');
            fetchAdminUsers();
          } else {
            showToast((data.error || "فشل الحذف"), 'error');
          }
        } catch (e) { showToast("خطأ في الاتصال", 'error'); }
      }, true);
    };

    const handleBlockUser = async (userId: number, isCurrentlyBanned?: boolean) => {
      // [FIX] إذا كان محظوراً بالفعل — نعرض خيار رفع الحظر مباشرة بدل طلب مدة جديدة
      if (isCurrentlyBanned) {
        try {
          const res = await adminFetch(`/api/admin/users/${userId}/block`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ unban: true })
          });
          const data = await res.json();
          if (res.ok) {
            showToast("تم رفع الحظر عن المستخدم", 'success');
            fetchAdminUsers();
          } else {
            showToast((data.error || "فشل رفع الحظر"), 'error');
          }
        } catch (e) { showToast("خطأ في الاتصال", 'error'); }
        return;
      }

      showPromptDialog("أدخل مدة الحظر بالدقائق (اتركه فارغاً للحظر الدائم، مثال: 60 = ساعة):", "حظر المستخدم", async (mins) => {
        const trimmed = (mins || "").trim();
        const isPermanent = trimmed === "";
        if (!isPermanent && isNaN(parseInt(trimmed))) return;
        try {
          const res = await adminFetch(`/api/admin/users/${userId}/block`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(isPermanent ? { permanent: true } : { minutes: parseInt(trimmed) })
          });
          const data = await res.json();
          if (res.ok) {
            showToast(isPermanent ? "تم حظر المستخدم بشكل دائم" : `تم حظر المستخدم لمدة ${trimmed} دقيقة`, 'success');
            fetchAdminUsers();
          } else {
            showToast((data.error || "فشل الحظر"), 'error');
          }
        } catch (e) { showToast("خطأ في الاتصال", 'error'); }
      }, "", "مثال: 60 أو فارغ للحظر الدائم");
    };

    const handleSendNotification = async (userId: number | null, title: string, body: string) => {
      try {
        const res = await adminFetch("/api/admin/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-admin-token": localStorage.getItem("adminToken") || "" },
          body: JSON.stringify({ userId, title, body })
        });
        const data = await res.json();
        if (res.ok) {
          showToast(userId ? "تم إرسال الإشعار للمستخدم" : `تم الإرسال لـ ${data.sent || "الكل"} مستخدم`, 'success');
        } else {
          showToast((data.error || "فشل الإرسال"), 'error');
        }
      } catch (e) { showToast("خطأ في الاتصال", 'error'); }
    };

    const handleAddOffer = async () => {
      const res = await adminFetch("/api/admin/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newOffer)
      });
      if (res.ok) {
        setNewOffer({ title: "", description: "", image_url: "" });
        fetchOffers();
        showToast("تمت إضافة العرض", 'info');
      }
    };

    const fetchAdminOrders = async () => {
      try {
        const res = await adminFetch("/api/admin/orders", { headers: { "x-admin-token": localStorage.getItem("adminToken") || "" } });
        const data = await res.json();
        setAdminOrders(Array.isArray(data) ? data : []);
      } catch (e) { console.error(e); }
      finally { setAdminOrdersLoading(false); }
    };

    const fetchAdminTransactions = async () => {
      try {
        const res = await adminFetch("/api/admin/transactions", { headers: { "x-admin-token": localStorage.getItem("adminToken") || "" } });
        const data = await res.json();
        setAdminTransactions(Array.isArray(data) ? data : []);
      } catch (e) { console.error(e); }
    };

    const handleApproveTransaction = async (id: number, customAmount?: number) => {
      const body: any = {};
      if (customAmount !== undefined && customAmount > 0) body.custom_amount = customAmount;
      await adminFetch(`/api/admin/transactions/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      fetchAdminTransactions();
    };

    const handleRejectTransaction = async (id: number) => {
      await adminFetch(`/api/admin/transactions/${id}/reject`, { method: "POST" });
      fetchAdminTransactions();
    };

    const handleApproveShamcashInvoice = async (id: number, tranId?: string): Promise<{ ok: boolean; error?: string }> => {
      const body: any = {};
      if (tranId && tranId.trim()) body.tranId = tranId.trim();
      const res = await adminFetch(`/api/admin/shamcash-invoices/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({} as any));
      fetchAdminTransactions();
      return { ok: res.ok, error: data?.error };
    };

    const handleAddCategory = async () => {
      if (!newCategory.name || newCategory.name.trim().length < 1) {
        return showToast("يرجى إدخال اسم القسم الرئيسي", 'error');
      }
      const res = await adminFetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCategory)
      });
      const data = await res.json();
      if (res.ok) {
        setNewCategory({ name: "", image_url: "", special_id: "" });
        fetchCategories();
        showToast("تمت إضافة القسم الرئيسي بنجاح", 'success');
      } else {
        showToast((data.error || "خطأ في الإضافة"), 'error');
      }
    };

    const handleAddSubcategory = async () => {
      if (!newSubcategory.name) return showToast("يرجى إدخال اسم القسم الفرعي", 'error');
      if (!newSubcategory.category_special_id) return showToast("يرجى إدخال رقم القسم الرئيسي الخاص", 'error');
      const res = await adminFetch("/api/admin/subcategories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSubcategory)
      });
      const data = await res.json();
      if (res.ok) {
        setNewSubcategory({ category_special_id: "", name: "", image_url: "", special_id: "" });
        fetchSubcategories();
        fetchCategories();
        showToast("تمت إضافة القسم الفرعي بنجاح", 'success');
      } else {
        showToast((data.error || "خطأ في الإضافة", 'error'));
      }
    };

    const handleAddProduct = async (saveAsDraft = false) => {
      if (saveAsDraft) setSavingAddProductDraft(true);
      if (newProduct.store_type === "inventory" && addProductInventoryUnits.length === 0) {
        return showToast("يرجى إضافة عنصر واحد على الأقل للمخزون قبل الحفظ", 'error');
      }
      if (newProduct.store_type === "gallery" && (newProduct.image_urls.length < 3 || newProduct.image_urls.length > 5)) {
        return showToast("يرجى رفع من 3 إلى 5 صور لمتجر الصور", 'error');
      }
      const validPackages = (newProduct.packages_data || []).filter(p => p.label && p.label.trim() && p.price !== "" && !isNaN(parseFloat(p.price as any)));
      if (newProduct.store_type === "packages" && validPackages.length === 0) {
        return showToast("يرجى إضافة باقة واحدة على الأقل لمتجر الباقات", 'error');
      }
      // [NAME VERIFICATION] إلزامي اختيار خانة واحدة على الأقل تحتوي على المعرف عند تفعيل الميزة،
      // وإلا يبقى زر "تحقق من الاسم" بلا أي معرف ليعمل عليه لدى العميل (كان هذا سبب عدم ظهور/عمل
      // الزر على المنتجات الداخلية التي لا تملك حقلاً افتراضياً بطبيعتها).
      if (newProduct.name_verification_enabled && (!newProduct.name_verification_source_field_ids || newProduct.name_verification_source_field_ids.length === 0)) {
        return showToast("يرجى اختيار خانة واحدة على الأقل تحتوي على معرف اللاعب لتفعيل التحقق من الاسم", 'error');
      }
      const productData: any = { ...newProduct };
      delete productData.input_label;
      delete productData.name_verification_source_field_ids;
      if (productData.default_profit === "") delete productData.default_profit;
      if (newProduct.store_type === "specificPackage") {
        productData.package_values = JSON.stringify(
          (newProduct.package_values || []).map(v => parseFloat(v as any)).filter(v => !isNaN(v))
        );
      } else {
        delete productData.package_values;
      }
      if (newProduct.store_type === "packages") {
        productData.packages_data = JSON.stringify(
          validPackages.map(p => ({ label: String(p.label).trim(), price: parseFloat(p.price as any) }))
        );
        productData.price = String(parseFloat(validPackages[0].price as any));
      } else {
        delete productData.packages_data;
      }
      if (productData.min_quantity !== undefined && productData.min_quantity !== "") {
        productData.min_quantity = parseFloat(productData.min_quantity);
      }
      if (productData.max_quantity !== undefined && productData.max_quantity !== "") {
        productData.max_quantity = parseFloat(productData.max_quantity);
      }
      if (newProduct.store_type === "gallery") {
        productData.image_urls = JSON.stringify(newProduct.image_urls);
        if (!productData.image_url) productData.image_url = newProduct.image_urls[0] || "";
      } else {
        delete productData.image_urls;
      }
      const eligibleTypes = ["normal", "quick_order", "quantities", "gallery", "inventory", "packages"];
      if (eligibleTypes.includes(newProduct.store_type)) {
        const defaults = customFields.filter(f => f.isDefault).map(f => ({...f, label: f.label.trim() || f.label}));
        const customs = customFields.filter(f => !f.isDefault && f.label.trim().length > 0);
        const nvSourceIds = new Set(newProduct.name_verification_source_field_ids || []);
        const merged = [...defaults, ...customs].map(f => nvSourceIds.has(f.id) ? { ...f, nvSource: true } : f);
        if (merged.length > 0) productData.custom_fields = JSON.stringify(merged);
      }
      const res = await adminFetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saveAsDraft ? { ...productData, available: false } : productData)
      });
      setSavingAddProductDraft(false);
      if (res.ok) {
        setNewProduct({ 
          category_special_id: "", 
          subcategory_special_id: "", 
          sub_sub_category_special_id: "",
          name: "", 
          price: "", 
          description: "", 
          image_url: "", 
          requires_input: false, 
          store_type: "normal",
          min_quantity: "",
          max_quantity: "",
          price_per_unit: "",
          external_id: "",
          input_label: "",
          inventory_group_id: "",
          image_urls: [],
          default_profit: "",
          package_values: [],
          packages_data: [{ label: "", price: "" }],
          name_verification_enabled: false,
          name_verification_game: "",
          name_verification_region: "",
          name_verification_source_field_ids: []
        });
        setNewPackageValueInput("");
        setCustomFields([]);
        setAddProductInventoryUnits([]);
        setAddProductNewUnitContent("");
        setAddProductBulkImportText("");
        setExtApiQtyMode("range");
        showToast(saveAsDraft ? "تم حفظ المسودة (غير مُفعّل للعملاء)" : "تمت إضافة المنتج", 'info');
      } else {
        const data = await res.json();
        showToast(data.error || "خطأ في الإضافة", 'error');
      }
    };

    const handleAddSubSubCategory = async () => {
      if (!newSubSubCategory.name) return showToast("يرجى إدخال اسم القسم الفرعي الفرعي", 'error');
      if (!newSubSubCategory.subcategory_special_id) return showToast("يرجى إدخال رقم القسم الفرعي الخاص", 'error');
      const res = await adminFetch("/api/admin/sub-sub-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSubSubCategory)
      });
      const data = await res.json();
      if (res.ok) {
        setNewSubSubCategory({ subcategory_special_id: "", name: "", image_url: "", special_id: "" });
        fetchSubSubCategories();
        fetchSubcategories();
        showToast("تمت إضافة القسم الفرعي الفرعي بنجاح", 'success');
      } else {
        showToast((data.error || "خطأ في الإضافة", 'error'));
      }
    };

    const handleAddPaymentMethod = async () => {
      if ((newPaymentMethod.method_type === "syriatel" || newPaymentMethod.method_type === "shamcash" || newPaymentMethod.method_type === "binance" || newPaymentMethod.method_type === "crypto_usdt_trc20" || newPaymentMethod.method_type === "crypto_usdt_bep20") && !newPaymentMethod.currency_id) {
        showToast("يرجى اختيار عملة المحفظة قبل إضافة طريقة الدفع الآلية", "error");
        return;
      }
      if (newPaymentMethod.bonus_type && (!newPaymentMethod.bonus_percent || parseFloat(newPaymentMethod.bonus_percent) <= 0 || parseFloat(newPaymentMethod.bonus_percent) > 100)) {
        showToast("يرجى إدخال نسبة مئوية صحيحة (بين 0 و100) للعمولة/البونص", "error");
        return;
      }
      const defaults = paymentMethodFields.filter(f => f.isDefault).map(f => ({...f, label: f.label.trim() || f.label}));
      const customs = paymentMethodFields.filter(f => !f.isDefault && f.label.trim().length > 0);
      const merged = newPaymentMethod.method_type === "manual" ? [...defaults, ...customs] : [];
      // ملاحظة: لا نُحوّل "usd" إلى null هنا — نُرسلها كما هي ليتمكن السيرفر من التفريق بين
      // "المستخدم اختار الدولار صراحةً" (قيمة صالحة تماماً لطرق الدفع الآلية) و"لم يُحدَّد شيء إطلاقاً".
      // السيرفر هو من يحوّلها لاحقاً إلى currency_id=null بعد أن يتحقق من أنها اختيار صريح.
      const payload: any = { ...newPaymentMethod, custom_fields: merged.length > 0 ? JSON.stringify(merged) : null, bonus_type: newPaymentMethod.bonus_type || null, bonus_percent: newPaymentMethod.bonus_type ? newPaymentMethod.bonus_percent : null };
      const res = await adminFetch("/api/admin/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setNewPaymentMethod({ name: "", image_url: "", wallet_address: "", qr_enabled: false, min_amount: "", instructions: "", description: "", method_type: "manual", api_account: "", payment_currency: "USD", currency_id: "", bonus_type: "", bonus_percent: "" });
        setPaymentMethodFields(ensurePaymentMethodDefaultFields([]));
        fetchPaymentMethods();
        showToast("تمت إضافة طريقة الدفع", 'info');
      } else {
        const data = await res.json();
        showToast(data.error || "خطأ في الإضافة", 'error');
      }
    };

    const handleAddBanner = async () => {
      const res = await adminFetch("/api/admin/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBanner)
      });
      if (res.ok) {
        setNewBanner({ image_url: "" });
        fetchBanners();
        showToast("تمت إضافة الصورة المتحركة", 'info');
      } else {
        showToast("خطأ في الإضافة", 'error');
      }
    };

    const handleDelete = async (type: string, id: number, onSuccess?: () => void) => {
      const runDelete = async (force: boolean) => {
        try {
          const res = await adminFetch(`/api/admin/${type}/${id}${force ? "?force=true" : ""}`, { method: "DELETE" });
          const result = await res.json();
          if (res.ok) {
            fetchCategories();
            fetchSubcategories();
            fetchSubSubCategories();
            if (type === 'payment-methods') fetchPaymentMethods();
            if (type === 'banners') fetchBanners();
            if (type === 'offers') fetchOffers();
            showToast(result.message || "تم الحذف بنجاح", 'success');
            if (onSuccess) onSuccess();
          } else {
            showToast((result.error || "فشل الحذف"), 'error');
          }
        } catch (e) {
          showToast("خطأ في الاتصال بالخادم", 'error');
        }
      };

      if (type === "products") {
        try {
          const checkRes = await adminFetch(`/api/admin/products/${id}/order-check`);
          const checkResult = checkRes.ok ? await checkRes.json() : null;
          if (checkResult && checkResult.hasOrders) {
            showDialog({
              type: 'confirm',
              message: "يوجد طلبات مرتبطة بهذا المنتج. اضغط التالي للمتابعة نحو الحذف.",
              title: "تنبيه",
              confirmText: "التالي",
              cancelText: "إلغاء",
              onConfirm: () => {
                showConfirm("هل أنت متأكد من حذف المنتج نهائياً؟ لا يمكن التراجع عن هذه الخطوة.", "تأكيد الحذف النهائي", () => {
                  runDelete(true);
                }, true);
              },
            });
            return;
          }
        } catch (e) {
          // فشل التحقق: نتابع بالتأكيد البسيط والحذف العادي كما كان سابقاً
        }
        showConfirm("هل أنت متأكد من الحذف؟", "تأكيد الحذف", () => {
          runDelete(false);
        }, true);
        return;
      }

      if (type === "payment-methods") {
        showConfirm(
          "سيتم حذف طريقة الدفع نهائياً حتى لو كانت هناك معاملات مرتبطة بها. هذا الإجراء لا يمكن التراجع عنه. هل أنت متأكد؟",
          "تأكيد الحذف النهائي",
          () => { runDelete(true); },
          true
        );
        return;
      }

      showConfirm("هل أنت متأكد من الحذف؟", "تأكيد الحذف", async () => {
        runDelete(false);
      }, true);
    };

    // تفعيل/تعطيل عنصر من عناصر المتجر دون حذفه — يبقى العنصر موجوداً لدى الأدمن
    // ويختفي عن واجهة المستخدم بالكامل (ما عدا المنتجات: تبقى ظاهرة لكن رمادية)
    const handleToggleActive = async (type: string, id: number, onSuccess?: () => void) => {
      try {
        const res = await adminFetch(`/api/admin/${type}/toggle-active/${id}`, { method: "PATCH" });
        const result = await res.json();
        if (res.ok) {
          fetchCategories();
          fetchSubcategories();
          fetchSubSubCategories();
          if (type === 'payment-methods') fetchPaymentMethods();
          if (type === 'banners') fetchBanners();
          if (type === 'offers') fetchOffers();
          showToast(result.active ? "تم التفعيل" : "تم التعطيل", 'success');
          if (onSuccess) onSuccess();
        } else {
          showToast((result.error || "فشلت العملية"), 'error');
        }
      } catch (e) {
        showToast("خطأ في الاتصال بالخادم", 'error');
      }
    };

    useEffect(() => {
      const q = topupSearchQuery.trim();
      if (!q || (topupSelectedUser && q === (topupSelectedUser.name || topupSelectedUser.email || topupSelectedUser.phone || String(topupSelectedUser.id)))) {
        setTopupSearchResults([]);
        return;
      }
      setTopupSearchLoading(true);
      const t = setTimeout(async () => {
        try {
          const res = await adminFetch(`/api/admin/users/search?q=${encodeURIComponent(q)}`);
          if (res.ok) setTopupSearchResults(await res.json());
        } catch {
          // ignore
        } finally {
          setTopupSearchLoading(false);
        }
      }, 300);
      return () => clearTimeout(t);
    }, [topupSearchQuery]);

    const handleManualTopup = async () => {
      const res = await adminFetch("/api/admin/manual-topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: manualTopup.userId, amount: manualTopup.amount })
      });
      if (res.ok) {
        setManualTopup({ userId: "", amount: "" });
        setTopupSearchQuery("");
        setTopupSelectedUser(null);
        setTopupSearchResults([]);
        showToast("تم شحن الرصيد بنجاح", 'success');
      } else {
        const data = await res.json();
        showToast(data.error || "خطأ في الشحن", 'error');
      }
    };

    return (
      <div className="min-h-screen bg-gray-50 pb-20 text-right" dir="rtl" data-admin-panel="true">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 p-4 sticky top-0 z-30" dir="rtl">
          <div className="flex items-center justify-between">
            <h1 className="font-bold text-lg">
              {adminTab === "admin_home" ? "لوحة التحكم"
                : adminTab === "chat" ? "المحادثات"
                : adminTab === "elements" ? "عناصر المتجر"
                : adminTab === "inventory" ? "المخزون"
                : adminTab === "users" ? "إدارة المستخدمين"
                : adminTab === "orders" ? "الطلبات"
                : adminTab === "transactions" ? "المدفوعات"
                : adminTab === "admin_stats" ? "الإحصاءات"
                : adminTab === "public_api_settings" ? "إعدادات الـ API العامة"
                : adminTab === "user_api_tokens" ? "توكنات API للمستخدمين"
                : adminTab === "admin_settings" ? "الإعدادات"
                : adminTab === "admin_chat_settings" ? "اعدادات الشات"
                : adminTab === "telegram_bots_settings" ? "إعدادات بوتات التلجرام"
                : adminTab === "admin_appearance" ? "تخصيص مظهر المتجر"
                : adminTab === "sessions_activity" ? "الجلسات الحالية والنشاط"
                : adminTab === "dev_management" ? "صفحة المطور"
                : adminTab === "sub_admins" ? "المسؤولون الثانويون"
                : adminTab === "more" ? "المزيد"
                : "لوحة التحكم"}
            </h1>
            <div className="flex items-center gap-2">
              <SubscriptionCountdown />
              <button
                onClick={() => setAdminSidebarOpen(true)}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-all"
              >
                <Menu size={20} />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-gray-500">
            {localStorage.getItem("adminEmail") && (
              <span className="truncate">{localStorage.getItem("adminEmail")}</span>
            )}
            <span className="text-gray-300">•</span>
            <span className="font-bold text-gray-600">
              {getAdminRole() === "dev" ? "مطور"
                : getAdminRole() === "admin" ? "مسؤول"
                : "مسؤول ثانوي"}
            </span>
          </div>
        </div>

        {/* Admin Sidebar */}
        <AnimatePresence>
          {adminSidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-[70]"
                onClick={() => setAdminSidebarOpen(false)}
              />
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "tween", duration: 0.25 }}
                dir="rtl"
                className="fixed top-0 right-0 h-full w-[78%] max-w-xs bg-white z-[71] shadow-xl flex flex-col"
              >
                <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
                  <div className="flex items-center gap-2">
                    <LogOut
                      size={18}
                      className="text-red-500 cursor-pointer"
                      onClick={() => { clearAdminSession(); setIsAdmin(false); setAdminAuth(false); }}
                    />
                    <span className="text-xs font-bold text-red-500 cursor-pointer" onClick={() => { clearAdminSession(); setIsAdmin(false); setAdminAuth(false); }}>تسجيل الخروج</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-gray-800 text-base">القائمة</h2>
                    <button onClick={() => setAdminSidebarOpen(false)} className="text-gray-400 p-1"><X size={20}/></button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-5">
                  {/* رئيسية */}
                  <div className="space-y-1">
                    {[
                      { key: "admin_home", label: "رئيسية", icon: <Home size={17}/> },
                      { key: "orders", label: "الطلبات", icon: <ClipboardList size={17}/>, mod: "orders" as const, badge: pendingApprovalOrdersCount },
                      { key: "transactions", label: "المدفوعات", icon: <CreditCard size={17}/>, mod: "finance" as const },
                      { key: "users", label: "المستخدمين", icon: <Users size={17}/>, mod: "users" as const },
                    ].filter(item => !item.mod || hasAnyPermissionInModule(item.mod)).map(item => (
                      <button
                        key={item.key}
                        onClick={() => { setAdminTab(item.key); setAdminSidebarOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-colors ${adminTab === item.key ? "bg-[var(--brand)]/10 text-[var(--brand)]" : "text-gray-700 hover:bg-gray-50"}`}
                      >
                        <span className="shrink-0">{item.icon}</span>
                        {item.label}
                        {!!(item as any).badge && (
                          <span className="mr-auto bg-amber-500 text-white text-[10px] font-black rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                            {(item as any).badge}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* خصائص المتجر */}
                  <div>
                    <p className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg mb-1.5 inline-flex items-center gap-1"><Store size={13}/>خصائص المتجر</p>
                    <div className="space-y-1">
                      {[
                        { label: "اضافة قسم رئيسي", icon: <LayoutGrid size={17}/>, action: () => { setActiveSubMenu("add_category"); } },
                        { label: "فرعي", icon: <ChevronDown size={17}/>, action: () => { setActiveSubMenu("add_subcategory"); } },
                        { label: "فرع فرعي", icon: <ChevronRight size={17}/>, action: () => { setActiveSubMenu("add_subSubCategory"); } },
                        { label: "منتج", icon: <ShoppingBag size={17}/>, action: () => { setAdminTab("add_product"); setActiveSubMenu("add_product"); } },
                        { label: "المخزون", icon: <Package size={17}/>, action: () => { setAdminTab("inventory"); } },
                        { label: "إرسال إشعار", icon: <Bell size={17}/>, action: () => { setActiveSubMenu("add_notification"); } },
                      ].map((item, i) => (
                        <button
                          key={i}
                          onClick={() => { item.action(); setAdminSidebarOpen(false); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <span className="shrink-0 text-indigo-500">{item.icon}</span>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* مالية */}
                  <div>
                    <p className="text-[10px] font-black text-green-600 bg-green-50 px-3 py-1.5 rounded-lg mb-1.5 inline-flex items-center gap-1"><DollarSign size={13}/>مالية</p>
                    <div className="space-y-1">
                      {[
                        { label: "اضافة طريقة دفع", icon: <Plus size={17}/>, action: () => { setAdminTab("add_paymentMethod"); setActiveSubMenu("add_paymentMethod"); } },
                        { label: "شحن الرصيد", icon: <Wallet size={17}/>, action: () => { setActiveSubMenu("add_balance"); } },
                        { label: "طرق الدفع التلقائية", icon: <Wallet size={17}/>, action: () => { setAdminTab("payment_gateways"); } },
                        { label: "انشاء قسيمة", icon: <Ticket size={17}/>, action: () => { setActiveSubMenu("add_voucher"); } },
                        { label: "تحديد الرتب", icon: <Award size={17}/>, action: () => { setAdminTab("ranks"); } },
                        { label: "تعديل نسبة الربح", icon: <Percent size={17}/>, action: () => { setAdminTab("bulk_margin"); } },
                      ].map((item, i) => (
                        <button
                          key={i}
                          onClick={() => { item.action(); setAdminSidebarOpen(false); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <span className="shrink-0 text-green-600">{item.icon}</span>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* اعدادات المتجر */}
                  <div>
                    <p className="text-[10px] font-black text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg mb-1.5 inline-flex items-center gap-1"><Settings size={13}/>اعدادات المتجر</p>
                    <div className="space-y-1">
                      {[
                        { label: "تخصيص التخفيضات", icon: <Tag size={17}/>, action: () => { setActiveSubMenu("customize_discounts"); } },
                        { label: "إدارة العملات", icon: <DollarSign size={17}/>, action: () => { setAdminTab("currencies"); } },
                        { label: "ربط API خارجي", icon: <ExternalLink size={17}/>, action: () => { setAdminTab("ahminix"); } },
                      ].map((item, i) => (
                        <button
                          key={i}
                          onClick={() => { item.action(); setAdminSidebarOpen(false); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <span className="shrink-0 text-gray-500">{item.icon}</span>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* اعدادات اخرى */}
                  <div>
                    <p className="text-[10px] font-black text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg mb-1.5 inline-flex items-center gap-1"><Plug size={13}/>اعدادات اخرى</p>
                    <div className="space-y-1">
                      {[
                        { key: "admin_settings", label: "الإعدادات", sub: "الدعم الفني، سياسة الخصوصية، قاعدة البيانات", icon: <Settings size={18} className="text-gray-600"/>, bg: "bg-gray-100" },
                        { key: "admin_chat_settings", label: "اعدادات الشات", sub: "الردود التلقائية والذكاء الاصطناعي", icon: <Bot size={18} className="text-purple-600"/>, bg: "bg-purple-50" },
                        { key: "telegram_bots_settings", label: "إعدادات بوتات التلجرام", sub: "ربط وإدارة بوت المستخدمين وبوت الأدمن", icon: <Bot size={18} className="text-sky-600"/>, bg: "bg-sky-50" },
                        { key: "admin_appearance", label: "تخصيص مظهر المتجر", sub: "الشعار، البانرات، الألوان وتخطيط البطاقات", icon: <Palette size={18} className="text-pink-600"/>, bg: "bg-pink-50" },
                        { key: "admin_stats", label: "الإحصاءات", sub: "تقارير وإحصاءات المتجر", icon: <BarChart2 size={18} className="text-blue-600"/>, bg: "bg-blue-50" },
                        { key: "public_api_settings", label: "إعدادات الـ API العامة", sub: "نطاق المنتجات، الخصم، حد الطلبات، Webhooks وسجل النشاط", icon: <Globe size={18} className="text-teal-600"/>, bg: "bg-teal-50" },
                        { key: "user_api_tokens", label: "توكنات API للمستخدمين", sub: "إدارة توكنات الوصول التي أنشأها المستخدمون، تفعيل/تعطيل وتحديد نطاق المنتجات", icon: <Key size={18} className="text-indigo-600"/>, bg: "bg-indigo-50" },
                      ].map(item => (
                        <button
                          key={item.key}
                          onClick={() => { setAdminTab(item.key); setAdminSidebarOpen(false); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-right"
                        >
                          <div className={`w-9 h-9 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>{item.icon}</div>
                          <div className="flex-1 text-right">
                            <p className="text-sm font-bold text-gray-800">{item.label}</p>
                            <p className="text-[10px] text-gray-400 leading-tight">{item.sub}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Settings Modal */}
        <AnimatePresence>
        </AnimatePresence>

        <div className="p-4 space-y-4">
          {/* ===== ADMIN HOME ===== */}
          {adminTab === "admin_home" && <AdminHomePage adminUsers={adminUsers} adminOrders={adminOrders} adminTransactions={adminTransactions} setAdminTab={setAdminTab} fetchUser={fetchUser} fetchAdminUsers={fetchAdminUsers} handleToggleVip={handleToggleVip} handleBlockUser={handleBlockUser} handleDeleteUser={handleDeleteUser} handleSendNotification={handleSendNotification} onOpenChatWithUser={(u: any) => { setSelectedChatUser(u); setAdminTab("chat"); }} adminFetch={adminFetch} setFocusTarget={setFocusTarget} />}

          {/* ===== SETTINGS ===== */}
          {adminTab === "admin_settings" && (
            <AdminSettingsPage
              setView={() => setAdminTab("more")}
              supportWhatsapp={supportWhatsapp}
              setSupportWhatsapp={setSupportWhatsapp}
              privacyPolicy={privacyPolicy}
              setPrivacyPolicy={setPrivacyPolicy}
              handleUpdateSetting={handleUpdateSetting}
              handleExportDB={handleExportDB}
              exportDBBusy={exportDBBusy}
              handleImportDB={handleImportDB}
              importDBBusy={importDBBusy}
              handleClearDB={handleClearDB}
              handleCloudSync={handleCloudSync}
              newAdminPass={newAdminPass}
              setNewAdminPass={setNewAdminPass}
              handleChangeAdminPassword={handleChangeAdminPassword}
              maintenanceMode={maintenanceMode}
              maintenanceIp={maintenanceIp}
              setMaintenanceIp={setMaintenanceIp}
              entryPopupEnabled={entryPopupEnabled}
              setEntryPopupEnabled={setEntryPopupEnabled}
              entryPopupText={entryPopupText}
              setEntryPopupText={setEntryPopupText}
              entryPopupLink={entryPopupLink}
              setEntryPopupLink={setEntryPopupLink}
              entryPopupFrequency={entryPopupFrequency}
              setEntryPopupFrequency={setEntryPopupFrequency}
              handleSaveEntryPopup={handleSaveEntryPopup}
              adminFetch={adminFetch}
            />
          )}

          {/* ===== CHAT SETTINGS ===== */}
          {adminTab === "admin_chat_settings" && (
            <ChatSettingsPage
              setView={() => setAdminTab("more")}
              adminFetch={adminFetch}
            />
          )}

          {/* ===== TELEGRAM BOTS SETTINGS ===== */}
          {adminTab === "telegram_bots_settings" && (
            <TelegramBotsSettingsPage
              setView={() => setAdminTab("more")}
              adminFetch={adminFetch}
            />
          )}

          {/* ===== STATS ===== */}
          {adminTab === "admin_stats" && <AdminStatsPage adminFetch={adminFetch} />}

          {adminTab === "admin_appearance" && <AdminAppearancePage adminFetch={adminFetch} />}

          {adminTab === "chat" && adminChatView}

          {/* ===== ORDERS ===== */}
          {adminTab === "orders" && <AdminOrdersAdminPage adminOrders={adminOrders} orderSearch={orderSearch} setOrderSearch={setOrderSearch} orderDateFilter={orderDateFilter} setOrderDateFilter={setOrderDateFilter} fetchAdminOrders={fetchAdminOrders} adminFetch={adminFetch} focusId={focusTarget?.type === "order" ? focusTarget.id : null} clearFocusId={() => setFocusTarget && setFocusTarget(null)} setAdminTab={setAdminTab} setFocusTarget={setFocusTarget} ordersLoading={adminOrdersLoading} />}

          {/* ===== TRANSACTIONS ===== */}
          {adminTab === "transactions" && <AdminTransactionsPage adminTransactions={adminTransactions} transSearch={transSearch} setTransSearch={setTransSearch} handleApproveTransaction={handleApproveTransaction} handleRejectTransaction={handleRejectTransaction} adminFetch={adminFetch} handleApproveShamcashInvoice={handleApproveShamcashInvoice} focusId={focusTarget?.type === "transaction" ? focusTarget.id : null} clearFocusId={() => setFocusTarget && setFocusTarget(null)} />}

          {/* ===== ELEMENTS ===== */}
          {adminTab === "elements" && <AdminElementsPage categories={categories} subcategories={subcategories} subSubCategories={subSubCategories} fetchCategories={fetchCategories} fetchSubcategories={fetchSubcategories} fetchSubSubCategories={fetchSubSubCategories} paymentMethods={paymentMethods} fetchPaymentMethods={fetchPaymentMethods} banners={banners} fetchBanners={fetchBanners} offers={offers} fetchOffers={fetchOffers} handleDelete={handleDelete} handleToggleActive={handleToggleActive} adminFetch={adminFetch} focusTarget={focusTarget} clearFocusTarget={() => setFocusTarget && setFocusTarget(null)} />}

          {adminTab === "inventory" && <InventoryPage adminFetch={adminFetch} onBack={() => setAdminTab("admin_home")} />}
          {adminTab === "payment_gateways" && <PaymentGatewaysAdminPage adminFetch={adminFetch} onBack={() => setAdminTab("admin_home")} />}

          {adminTab === "currencies" && <CurrenciesAdminPage adminFetch={adminFetch} onBack={() => setAdminTab("admin_home")} />}
          {adminTab === "ranks" && <AdminRanksPage adminFetch={adminFetch} onBack={() => setAdminTab("admin_home")} />}
          {adminTab === "bulk_margin" && <AdminBulkMarginPage adminFetch={adminFetch} onBack={() => setAdminTab("admin_home")} />}

          {/* ===== AHMINIX ===== */}
          {adminTab === "ahminix" && (
            <AdminAhminixTab
              categories={categories}
              subcategories={subcategories}
              subSubCategories={subSubCategories}
              fetchCategories={fetchCategories}
              fetchSubcategories={fetchSubcategories}
              fetchSubSubCategories={fetchSubSubCategories}
              adminFetch={adminFetch}
            />
          )}

          {adminTab === "public_api_settings" && (
            <AdminPublicApiSettingsPage adminFetch={adminFetch} />
          )}

          {adminTab === "user_api_tokens" && (
            <AdminApiPage adminFetch={adminFetch} adminUsers={adminUsers} />
          )}

          {adminTab === "users" && (
            <AdminUsersPage
              adminUsers={adminUsers}
              adminOrders={adminOrders}
              adminTransactions={adminTransactions}
              fetchAdminUsers={fetchAdminUsers}
              handleToggleVip={handleToggleVip}
              handleBlockUser={handleBlockUser}
              handleDeleteUser={handleDeleteUser}
              handleSendNotification={handleSendNotification}
              onOpenChatWithUser={(u: any) => { setSelectedChatUser(u); setAdminTab("chat"); }}
              adminFetch={adminFetch}
              focusId={focusTarget?.type === "user" ? focusTarget.id : null}
              clearFocusId={() => setFocusTarget && setFocusTarget(null)}
              setAdminTab={setAdminTab}
              setFocusTarget={setFocusTarget}
            />
          )}

          {/* ===== MORE ===== */}
          {adminTab === "more" && (
            <div className="space-y-3" dir="rtl">
              {/* الإعدادات */}
              {hasAnyPermissionInModule("settings_ai") && (
              <button
                onClick={() => setAdminTab("admin_settings")}
                className="w-full bg-white rounded-lg p-4 flex items-center gap-3 border border-gray-100 shadow-sm active:scale-[0.98] transition-transform">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <Settings size={20} className="text-gray-600" />
                </div>
                <div className="flex-1 text-right">
                  <p className="font-bold text-sm text-gray-800">الإعدادات</p>
                  <p className="text-[11px] text-gray-400">الدعم الفني، سياسة الخصوصية، قاعدة البيانات</p>
                </div>
                <ChevronRight size={16} className="text-gray-300" />
              </button>
              )}

              {/* اعدادات الشات */}
              {hasAnyPermissionInModule("settings_ai") && (
              <button
                onClick={() => setAdminTab("admin_chat_settings")}
                className="w-full bg-white rounded-lg p-4 flex items-center gap-3 border border-gray-100 shadow-sm active:scale-[0.98] transition-transform">
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                  <Bot size={20} className="text-purple-600" />
                </div>
                <div className="flex-1 text-right">
                  <p className="font-bold text-sm text-gray-800">اعدادات الشات</p>
                  <p className="text-[11px] text-gray-400">الردود التلقائية والذكاء الاصطناعي</p>
                </div>
                <ChevronRight size={16} className="text-gray-300" />
              </button>
              )}

              {/* إعدادات بوتات التلجرام */}
              {hasAnyPermissionInModule("settings_bots") && (
              <button
                onClick={() => setAdminTab("telegram_bots_settings")}
                className="w-full bg-white rounded-lg p-4 flex items-center gap-3 border border-gray-100 shadow-sm active:scale-[0.98] transition-transform">
                <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center shrink-0">
                  <Bot size={20} className="text-sky-600" />
                </div>
                <div className="flex-1 text-right">
                  <p className="font-bold text-sm text-gray-800">إعدادات بوتات التلجرام</p>
                  <p className="text-[11px] text-gray-400">ربط وإدارة بوت المستخدمين وبوت الأدمن</p>
                </div>
                <ChevronRight size={16} className="text-gray-300" />
              </button>
              )}

              {/* تخصيص مظهر المتجر */}
              {hasAnyPermissionInModule("elements") && (
              <button
                onClick={() => setAdminTab("admin_appearance")}
                className="w-full bg-white rounded-lg p-4 flex items-center gap-3 border border-gray-100 shadow-sm active:scale-[0.98] transition-transform">
                <div className="w-10 h-10 rounded-lg bg-pink-50 flex items-center justify-center shrink-0">
                  <Palette size={20} className="text-pink-600" />
                </div>
                <div className="flex-1 text-right">
                  <p className="font-bold text-sm text-gray-800">تخصيص مظهر المتجر</p>
                  <p className="text-[11px] text-gray-400">الشعار، البانرات، الألوان وتخطيط البطاقات</p>
                </div>
                <ChevronRight size={16} className="text-gray-300" />
              </button>
              )}

              {/* الإحصاءات — عرض عام متاح لكل حسابات الأدمن (لا يحتوي بيانات حسّاسة قابلة للتعديل) */}
              <button
                onClick={() => { setAdminTab("admin_stats"); }}
                className="w-full bg-white rounded-lg p-4 flex items-center gap-3 border border-gray-100 shadow-sm active:scale-[0.98] transition-transform">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <BarChart2 size={20} className="text-blue-600" />
                </div>
                <div className="flex-1 text-right">
                  <p className="font-bold text-sm text-gray-800">الإحصاءات</p>
                  <p className="text-[11px] text-gray-400">تقارير وإحصاءات المتجر</p>
                </div>
                <ChevronRight size={16} className="text-gray-300" />
              </button>

              {/* إعدادات الـ API العامة */}
              {hasAnyPermissionInModule("settings_api") && (
              <button
                onClick={() => setAdminTab("public_api_settings")}
                className="w-full bg-white rounded-lg p-4 flex items-center gap-3 border border-gray-100 shadow-sm active:scale-[0.98] transition-transform">
                <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                  <Globe size={20} className="text-teal-600" />
                </div>
                <div className="flex-1 text-right">
                  <p className="font-bold text-sm text-gray-800">إعدادات الـ API العامة</p>
                  <p className="text-[11px] text-gray-400">نطاق المنتجات، الخصم، حد الطلبات، Webhooks وسجل النشاط</p>
                </div>
                <ChevronRight size={16} className="text-gray-300" />
              </button>
              )}

              {/* الجلسات الحالية والنشاط */}
              {(canManageSubAdmins() || hasAnyPermissionInModule("settings_logs")) && (
              <button
                onClick={() => setAdminTab("sessions_activity")}
                className="w-full bg-white rounded-lg p-4 flex items-center gap-3 border border-gray-100 shadow-sm active:scale-[0.98] transition-transform">
                <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                  <ShieldCheck size={20} className="text-teal-600" />
                </div>
                <div className="flex-1 text-right">
                  <p className="font-bold text-sm text-gray-800">الجلسات الحالية والنشاط</p>
                  <p className="text-[11px] text-gray-400">الجلسات النشطة وسجلات التدقيق</p>
                </div>
                <ChevronRight size={16} className="text-gray-300" />
              </button>
              )}

              {/* المسؤولون الثانويون — الأدمن الرئيسي والمطور فقط */}
              {canManageSubAdmins() && (
                <button
                  onClick={() => setAdminTab("sub_admins")}
                  className="w-full bg-white rounded-lg p-4 flex items-center gap-3 border border-gray-100 shadow-sm active:scale-[0.98] transition-transform">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                    <ShieldCheck size={20} className="text-indigo-600" />
                  </div>
                  <div className="flex-1 text-right">
                    <p className="font-bold text-sm text-gray-800">المسؤولون الثانويون</p>
                    <p className="text-[11px] text-gray-400">إنشاء حسابات موظفين بصلاحيات محدودة</p>
                  </div>
                  <ChevronRight size={16} className="text-gray-300" />
                </button>
              )}

              {/* صفحة المطور — تظهر فقط لحساب المطور (ومستثناة تماماً عن المسؤولين الثانويين) */}
              {!isSubAdmin() && getAdminRole() === "dev" && (
                <button
                  onClick={() => setAdminTab("dev_management")}
                  className="w-full bg-gray-800 rounded-lg p-4 flex items-center gap-3 border border-gray-700 active:scale-[0.98] transition-transform">
                  <div className="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center shrink-0">
                    <ShieldCheck size={20} className="text-white" />
                  </div>
                  <div className="flex-1 text-right">
                    <p className="font-bold text-sm text-white">صفحة المطور</p>
                  </div>
                  <ChevronRight size={16} className="text-gray-400" />
                </button>
              )}

              {/* تسجيل الخروج */}
              <button
                onClick={() => { clearAdminSession(); setIsAdmin(false); setAdminAuth(false); }}
                className="w-full bg-red-50 rounded-lg p-4 flex items-center gap-3 border border-red-100 active:scale-[0.98] transition-transform">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                  <LogOut size={20} className="text-red-500" />
                </div>
                <div className="flex-1 text-right">
                  <p className="font-bold text-sm text-red-600">تسجيل الخروج</p>
                </div>
              </button>
            </div>
          )}

          {/* ===== SESSIONS & ACTIVITY (Super Admin) ===== */}
          {adminTab === "sessions_activity" && (
            <SessionsActivityAdminPage
              adminFetch={adminFetch}
              setView={(v: any) => setAdminTab(v?.type === "more" ? "more" : "more")}
            />
          )}

          {/* ===== صفحة المطور — تُعرض فقط داخل حساب المطور نفسه ===== */}
          {adminTab === "dev_management" && getAdminRole() === "dev" && (
            <DevManagementPage adminFetch={adminFetch} />
          )}

          {/* ===== المسؤولون الثانويون — الأدمن الرئيسي والمطور فقط ===== */}
          {adminTab === "sub_admins" && canManageSubAdmins() && (
            <SubAdminsPage adminFetch={adminFetch} onBack={() => setAdminTab("more")} />
          )}

        </div>

        {/* FAB Button */}
        <AnimatePresence>
          {activeSubMenu === "fab_open" && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[55] bg-black/40" onClick={() => setActiveSubMenu(null)}/>
          )}
        </AnimatePresence>
        {activeSubMenu === "fab_open" && (
          <motion.div initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} exit={{opacity:0,y:30}}
            className="fixed bottom-20 left-2 right-2 z-[56] bg-white rounded-lg shadow-2xl border border-gray-100 p-4 max-h-[70vh] overflow-y-auto" dir="rtl">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-black text-gray-700">إجراء سريع</p>
              <button onClick={() => setActiveSubMenu(null)} className="text-gray-400"><X size={18}/></button>
            </div>

            {/* Sector 1: خصائص المتجر */}
            <div className="mb-3">
              <p className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg mb-2 inline-flex items-center gap-1"><Store size={14}/>خصائص المتجر</p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { key:"add_category", label:"قسم رئيسي", icon:<LayoutGrid size={18}/>, color:"text-blue-600 bg-blue-50" },
                  { key:"add_subcategory", label:"قسم فرعي", icon:<ChevronDown size={18}/>, color:"text-blue-500 bg-blue-50" },
                  { key:"add_subSubCategory", label:"فرع فرعي", icon:<ChevronRight size={18}/>, color:"text-blue-400 bg-blue-50" },
                  { key:"add_product", label:"منتج", icon:<ShoppingBag size={18}/>, color:"text-indigo-600 bg-indigo-50" },
                  { key:"open_inventory", label:"المخزون", icon:<Package size={18}/>, color:"text-amber-600 bg-amber-50" },
                  { key:"add_notification", label:"إرسال إشعار", icon:<Bell size={18}/>, color:"text-red-600 bg-red-50" },
                ].map(item => (
                  <button key={item.key} onClick={() => { if(item.key==="open_inventory"){ setAdminTab("inventory"); setActiveSubMenu(null); } else if(item.key==="add_product"){ setAdminTab("add_product"); setActiveSubMenu("add_product"); } else setActiveSubMenu(item.key); }}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-gray-50 active:scale-95 transition-all">
                    <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${item.color}`}>{item.icon}</div>
                    <span className="text-[9px] font-bold text-gray-600 text-center leading-tight">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100 my-2" />

            {/* Sector 2: المالية */}
            <div className="mb-3">
              <p className="text-[10px] font-black text-green-600 bg-green-50 px-3 py-1.5 rounded-lg mb-2 inline-flex items-center gap-1"><DollarSign size={14}/>المالية</p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { key:"add_paymentMethod", label:"طريقة دفع", icon:<Plus size={18}/>, color:"text-orange-600 bg-orange-50" },
                  { key:"add_balance", label:"إضافة رصيد", icon:<Wallet size={18}/>, color:"text-green-600 bg-green-50" },
                  { key:"add_voucher", label:"قسيمة تخفيض", icon:<Ticket size={18}/>, color:"text-purple-600 bg-purple-50" },
                  { key:"payment_gateways", label:"طرق الدفع الآلية", icon:<Wallet size={18}/>, color:"text-indigo-600 bg-indigo-50" },
                  { key:"ranks", label:"تحديد الرتب", icon:<Award size={18}/>, color:"text-rose-600 bg-rose-50" },
                  { key:"bulk_margin", label:"تعديل نسبة الربح", icon:<Percent size={18}/>, color:"text-teal-600 bg-teal-50" },
                ].map(item => (
                  <button key={item.key} onClick={() => { if(item.key==="payment_gateways"){setAdminTab("payment_gateways");setActiveSubMenu(null);}else if(item.key==="ranks"||item.key==="bulk_margin"){setAdminTab(item.key);setActiveSubMenu(null);}else if(item.key==="add_paymentMethod"){setAdminTab("add_paymentMethod");setActiveSubMenu("add_paymentMethod");}else setActiveSubMenu(item.key); }}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-gray-50 active:scale-95 transition-all">
                    <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${item.color}`}>{item.icon}</div>
                    <span className="text-[9px] font-bold text-gray-600 text-center leading-tight">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100 my-2" />

            {/* Sector 3: إعدادات المتجر */}
            <div>
              <p className="text-[10px] font-black text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg mb-2 inline-flex items-center gap-1"><Settings size={14}/>إعدادات المتجر</p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { key:"customize_discounts", label:"تخصيص التخفيضات", icon:<Tag size={18}/>, color:"text-teal-600 bg-teal-50" },
                  { key:"currencies", label:"إدارة العملات", icon:<DollarSign size={18}/>, color:"text-emerald-600 bg-emerald-50" },
                  { key:"ahminix_link", label:"ربط API خارجي", icon:<ExternalLink size={18}/>, color:"text-gray-600 bg-gray-100" },
                  { key:"name_verification_keys", label:"مفاتيح التحقق من الاسم", icon:<KeyRound size={18}/>, color:"text-cyan-600 bg-cyan-50" },
                ].map(item => (
                  <button key={item.key} onClick={() => { if(item.key==="ahminix_link"){setAdminTab("ahminix");setActiveSubMenu(null);}else if(item.key==="payment_gateways"){setAdminTab("payment_gateways");setActiveSubMenu(null);}else if(item.key==="currencies"){setAdminTab("currencies");setActiveSubMenu(null);}else if(item.key==="name_verification_keys"){setShowNameVerificationKeysModal(true);}else setActiveSubMenu(item.key); }}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-gray-50 active:scale-95 transition-all">
                    <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${item.color}`}>{item.icon}</div>
                    <span className="text-[9px] font-bold text-gray-600 text-center leading-tight">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <NameVerificationKeysModal
          open={showNameVerificationKeysModal}
          onClose={() => setShowNameVerificationKeysModal(false)}
          adminFetch={adminFetch}
          showToast={showToast}
        />

        {/* Add Modals */}
        <AnimatePresence>
          {activeSubMenu && activeSubMenu.startsWith("add_") && activeSubMenu !== "add_balance" && activeSubMenu !== "add_notification" && activeSubMenu !== "add_product" && activeSubMenu !== "add_paymentMethod" && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[60] bg-black/50 flex items-end justify-center" onClick={() => setActiveSubMenu(null)}>
              <motion.div initial={{y:100,opacity:0}} animate={{y:0,opacity:1}} exit={{y:100,opacity:0}} className="bg-white w-full max-w-lg rounded-t-lg p-6 space-y-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-gray-800">{activeSubMenu==="add_category"?"إضافة قسم رئيسي":activeSubMenu==="add_subcategory"?"إضافة قسم فرعي":activeSubMenu==="add_subSubCategory"?"إضافة فرع فرعي":"إضافة قسيمة"}</h3>
                  <button onClick={() => setActiveSubMenu(null)} className="text-gray-400"><X size={22}/></button>
                </div>
                {activeSubMenu === "add_category" && (
                  <div className="space-y-3">
                    <input type="text" placeholder="اسم القسم الرئيسي" className="w-full p-3 bg-gray-50 rounded-lg text-sm outline-none" value={newCategory.name} onChange={e => setNewCategory({...newCategory,name:e.target.value})}/>
                    <AdminImageUpload label="صورة القسم" currentUrl={newCategory.image_url} onUpload={url => setNewCategory({...newCategory,image_url:url})}/>
                    <button onClick={() => { handleAddCategory(); setActiveSubMenu(null); }} className="w-full bg-[var(--brand)] text-white py-3.5 rounded-lg font-bold text-sm">إضافة القسم الرئيسي</button>
                  </div>
                )}
                {activeSubMenu === "add_subcategory" && (
                  <div className="space-y-3">
                    {/* Category Picker Button */}
                    <button
                      type="button"
                      onClick={() => setShowCategoryPickerModal(true)}
                      className="w-full p-3 bg-gray-50 rounded-lg text-sm outline-none text-right flex items-center justify-between border border-gray-200 hover:bg-gray-100 transition-colors"
                    >
                      <span className={newSubcategory.category_special_id ? "text-gray-800 font-medium" : "text-gray-400"}>
                        {newSubcategory.category_special_id
                          ? (categories.find((c: any) => String(c.id) === String(newSubcategory.category_special_id))?.name || "-- اختر قسم رئيسي --")
                          : "اختر قسم رئيسي"}
                      </span>
                      <span className="text-gray-400 text-xs mr-1">{newSubcategory.category_special_id ? "✓" : "▼"}</span>
                    </button>
                    {/* Category Picker Modal */}
                    {showCategoryPickerModal && (
                      <div
                        className="fixed inset-0 z-[80] flex items-center justify-center"
                        style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
                        onClick={() => setShowCategoryPickerModal(false)}
                      >
                        <div
                          className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
                          onClick={e => e.stopPropagation()}
                          dir="rtl"
                        >
                          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                            <h4 className="font-bold text-gray-800 text-base">اختر قسم رئيسي</h4>
                            <button
                              onClick={() => setShowCategoryPickerModal(false)}
                              className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                            >✕</button>
                          </div>
                          <div className="p-4 overflow-y-auto" style={{ maxHeight: "60vh" }}>
                            {categories.length === 0 ? (
                              <p className="text-center text-gray-400 text-sm py-6">لا توجد أقسام رئيسية بعد</p>
                            ) : (
                              <div className="grid grid-cols-3 gap-3">
                                {categories.map((c: any) => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => {
                                      setNewSubcategory({ ...newSubcategory, category_special_id: String(c.id) });
                                      setShowCategoryPickerModal(false);
                                    }}
                                    className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${
                                      String(newSubcategory.category_special_id) === String(c.id)
                                        ? "border-[var(--brand)] bg-blue-50"
                                        : "border-gray-100 bg-gray-50 hover:border-gray-300"
                                    }`}
                                  >
                                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                                      {c.image_url ? (
                                        <img
                                          src={c.image_url}
                                          alt={c.name}
                                          className="w-full h-full object-cover"
                                          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                                        />
                                      ) : (
                                        <span className="text-2xl">🗂️</span>
                                      )}
                                    </div>
                                    <span className="text-xs text-center text-gray-700 font-medium leading-tight line-clamp-2">{c.name}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    <input type="text" placeholder="اسم القسم الفرعي" className="w-full p-3 bg-gray-50 rounded-lg text-sm outline-none" value={newSubcategory.name} onChange={e => setNewSubcategory({...newSubcategory,name:e.target.value})}/>
                    <AdminImageUpload label="صورة القسم الفرعي" currentUrl={newSubcategory.image_url} onUpload={url => setNewSubcategory({...newSubcategory,image_url:url})}/>
                    <button onClick={() => { handleAddSubcategory(); setActiveSubMenu(null); }} className="w-full bg-[var(--brand)] text-white py-3.5 rounded-lg font-bold text-sm">إضافة القسم الفرعي</button>
                  </div>
                )}
                {activeSubMenu === "add_subSubCategory" && (
                  <div className="space-y-3">
                    {/* Sub-Sub-Category Picker Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setSubSubCatPickerStep("category");
                        setSubSubCatPickerSelectedCatId("");
                        setShowSubSubCatPickerModal(true);
                      }}
                      className="w-full p-3 bg-gray-50 rounded-lg text-sm outline-none text-right flex items-center justify-between border border-gray-200 hover:bg-gray-100 transition-colors"
                    >
                      <span className={newSubSubCategory.subcategory_special_id ? "text-gray-800 font-medium" : "text-gray-400"}>
                        {newSubSubCategory.subcategory_special_id
                          ? (() => {
                              const sub = subcategories.find((s: any) => String(s.id) === String(newSubSubCategory.subcategory_special_id));
                              const cat = sub ? categories.find((c: any) => String(c.id) === String(sub.category_id)) : null;
                              return cat && sub ? `${cat.name} ← ${sub.name}` : (sub?.name || "اختر القسم الرئيسي ثم الفرعي");
                            })()
                          : "اختر القسم الرئيسي ثم الفرعي"}
                      </span>
                      <span className="text-gray-400 text-xs mr-1">{newSubSubCategory.subcategory_special_id ? "✓" : "▼"}</span>
                    </button>

                    {/* Two-Step Picker Modal */}
                    {showSubSubCatPickerModal && (
                      <div
                        className="fixed inset-0 z-[80] flex items-center justify-center"
                        style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
                        onClick={() => setShowSubSubCatPickerModal(false)}
                      >
                        <div
                          className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
                          onClick={e => e.stopPropagation()}
                          dir="rtl"
                        >
                          {/* Modal Header */}
                          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                              {subSubCatPickerStep === "subcategory" && (
                                <button
                                  onClick={() => setSubSubCatPickerStep("category")}
                                  className="text-gray-400 hover:text-gray-700 text-lg leading-none ml-1"
                                >‹</button>
                              )}
                              <h4 className="font-bold text-gray-800 text-base">
                                {subSubCatPickerStep === "category" ? "اختر القسم الرئيسي" : "اختر القسم الفرعي"}
                              </h4>
                            </div>
                            <button
                              onClick={() => setShowSubSubCatPickerModal(false)}
                              className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                            >✕</button>
                          </div>

                          {/* Step indicator */}
                          <div className="flex items-center gap-1 px-4 pt-3 pb-1">
                            <div className={`h-1.5 flex-1 rounded-full transition-colors ${subSubCatPickerStep === "category" ? "bg-[var(--brand)]" : "bg-gray-200"}`}/>
                            <div className={`h-1.5 flex-1 rounded-full transition-colors ${subSubCatPickerStep === "subcategory" ? "bg-[var(--brand)]" : "bg-gray-200"}`}/>
                          </div>

                          {/* Modal Body */}
                          <div className="p-4 overflow-y-auto" style={{ maxHeight: "55vh" }}>
                            {subSubCatPickerStep === "category" ? (
                              categories.length === 0 ? (
                                <p className="text-center text-gray-400 text-sm py-6">لا توجد أقسام رئيسية بعد</p>
                              ) : (
                                <div className="grid grid-cols-3 gap-3">
                                  {categories.map((c: any) => (
                                    <button
                                      key={c.id}
                                      type="button"
                                      onClick={() => {
                                        setSubSubCatPickerSelectedCatId(String(c.id));
                                        setSubSubCatPickerStep("subcategory");
                                      }}
                                      className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${
                                        subSubCatPickerSelectedCatId === String(c.id)
                                          ? "border-[var(--brand)] bg-blue-50"
                                          : "border-gray-100 bg-gray-50 hover:border-gray-300"
                                      }`}
                                    >
                                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                                        {c.image_url ? (
                                          <img src={c.image_url} alt={c.name} className="w-full h-full object-cover"
                                            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                                        ) : (
                                          <span className="text-2xl">🗂️</span>
                                        )}
                                      </div>
                                      <span className="text-xs text-center text-gray-700 font-medium leading-tight line-clamp-2">{c.name}</span>
                                    </button>
                                  ))}
                                </div>
                              )
                            ) : (
                              (() => {
                                const filteredSubs = subcategories.filter((s: any) => String(s.category_id) === String(subSubCatPickerSelectedCatId));
                                return filteredSubs.length === 0 ? (
                                  <p className="text-center text-gray-400 text-sm py-6">لا توجد أقسام فرعية لهذا القسم</p>
                                ) : (
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-3 gap-3">
                                      {filteredSubs.map((s: any) => (
                                        <button
                                          key={s.id}
                                          type="button"
                                          onClick={() => setNewSubSubCategory({...newSubSubCategory, subcategory_special_id: String(s.id)})}
                                          className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${
                                            String(newSubSubCategory.subcategory_special_id) === String(s.id)
                                              ? "border-[var(--brand)] bg-blue-50"
                                              : "border-gray-100 bg-gray-50 hover:border-gray-300"
                                          }`}
                                        >
                                          <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                                            {s.image_url ? (
                                              <img src={s.image_url} alt={s.name} className="w-full h-full object-cover"
                                                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                                            ) : (
                                              <span className="text-2xl">📂</span>
                                            )}
                                          </div>
                                          <span className="text-xs text-center text-gray-700 font-medium leading-tight line-clamp-2">{s.name}</span>
                                        </button>
                                      ))}
                                    </div>
                                    <button
                                      type="button"
                                      disabled={!newSubSubCategory.subcategory_special_id || !filteredSubs.find((s: any) => String(s.id) === String(newSubSubCategory.subcategory_special_id))}
                                      onClick={() => setShowSubSubCatPickerModal(false)}
                                      className="w-full bg-[var(--brand)] text-white py-3 rounded-xl font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                                    >تأكيد الاختيار</button>
                                  </div>
                                );
                              })()
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <input type="text" placeholder="اسم الفرع الفرعي" className="w-full p-3 bg-gray-50 rounded-lg text-sm outline-none" value={newSubSubCategory.name} onChange={e => setNewSubSubCategory({...newSubSubCategory,name:e.target.value})}/>
                    <AdminImageUpload label="الصورة" currentUrl={newSubSubCategory.image_url} onUpload={url => setNewSubSubCategory({...newSubSubCategory,image_url:url})}/>
                    <button onClick={() => { handleAddSubSubCategory(); setActiveSubMenu(null); }} className="w-full bg-[var(--brand)] text-white py-3.5 rounded-lg font-bold text-sm">إضافة الفرع الفرعي</button>
                  </div>
                )}
                {activeSubMenu === "add_voucher" && (
                  <div className="space-y-3">
                    <input type="text" placeholder="الكود" className="w-full p-3 bg-gray-50 rounded-lg text-sm outline-none" value={newVoucher.code} onChange={e => setNewVoucher({...newVoucher,code:e.target.value})}/>
                    <div className="grid grid-cols-2 gap-2"><input type="number" placeholder="القيمة $" className="w-full p-3 bg-gray-50 rounded-lg text-sm outline-none" value={newVoucher.amount} onChange={e => setNewVoucher({...newVoucher,amount:e.target.value})}/><input type="number" placeholder="عدد الاستخدامات" className="w-full p-3 bg-gray-50 rounded-lg text-sm outline-none" value={newVoucher.max_uses} onChange={e => setNewVoucher({...newVoucher,max_uses:e.target.value})}/></div>
                    <button onClick={() => { handleCreateVoucher(); setActiveSubMenu(null); }} className="w-full bg-[var(--brand)] text-white py-3.5 rounded-lg font-bold text-sm">إنشاء القسيمة</button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add Payment Method Page */}
        {adminTab === "add_paymentMethod" && (
          <div className="fixed inset-0 z-[60] bg-gray-50 flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3.5 flex items-center gap-3 shadow-sm">
              <button onClick={() => { setAdminTab("admin_home"); setActiveSubMenu(null); }} className="text-gray-500 hover:text-gray-700 p-1 -m-1"><ChevronRight size={22}/></button>
              <h3 className="font-bold text-gray-800 flex items-center gap-2 text-base"><Wallet size={18} className="text-orange-600"/>إضافة طريقة دفع</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 pb-8">
              <div className="max-w-lg mx-auto bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
                <div className="space-y-3">
                    <input type="text" placeholder="اسم طريقة الدفع" className="w-full p-3 bg-gray-50 rounded-lg text-sm outline-none" value={newPaymentMethod.name} onChange={e => setNewPaymentMethod({...newPaymentMethod,name:e.target.value})}/>
                    <AdminImageUpload label="صورة الطريقة" currentUrl={newPaymentMethod.image_url} onUpload={url => setNewPaymentMethod({...newPaymentMethod,image_url:url})}/>
                    <select className="w-full p-3 bg-gray-50 rounded-lg text-sm outline-none" value={newPaymentMethod.method_type} onChange={e => setNewPaymentMethod({...newPaymentMethod,method_type:e.target.value,api_account:"",payment_currency:"USD",currency_id:""})}><option value="manual">يدوي (إيصال)</option><option value="syriatel">سيريتل كاش تلقائي</option><option value="shamcash">شام كاش تلقائي</option><option value="binance">Binance Pay تلقائي</option><option value="crypto_usdt_trc20">عملات رقمية USDT (TRC20)</option><option value="crypto_usdt_bep20">عملات رقمية USDT (BEP20)</option></select>
                    <div className="flex gap-2 items-stretch"><input type="text" placeholder="رقم المحفظة / العنوان" className="flex-1 min-w-0 p-3 bg-gray-50 rounded-lg text-sm outline-none" value={newPaymentMethod.wallet_address} onChange={e => setNewPaymentMethod({...newPaymentMethod,wallet_address:e.target.value,qr_enabled:e.target.value.trim() ? newPaymentMethod.qr_enabled : false})}/><button type="button" disabled={!String(newPaymentMethod.wallet_address||"").trim()} onClick={() => setNewPaymentMethod({...newPaymentMethod,qr_enabled:!newPaymentMethod.qr_enabled})} title={!String(newPaymentMethod.wallet_address||"").trim() ? "اكتب عنوان المحفظة أولاً" : ""} className={`shrink-0 px-3 rounded-lg text-xs font-bold whitespace-nowrap transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${newPaymentMethod.qr_enabled && String(newPaymentMethod.wallet_address||"").trim() ? "bg-green-500 text-white" : "bg-white text-gray-600 border border-gray-200"}`}>{newPaymentMethod.qr_enabled && String(newPaymentMethod.wallet_address||"").trim() ? "تعطيل QR" : "تفعيل QR"}</button></div>
                    <textarea placeholder="وصف طريقة الدفع (اختياري - يظهر للمستخدم)" className="w-full p-3 bg-gray-50 rounded-lg text-sm outline-none h-16 resize-none" value={newPaymentMethod.description} onChange={e => setNewPaymentMethod({...newPaymentMethod,description:e.target.value})}/>
                    {(newPaymentMethod.method_type==="syriatel"||newPaymentMethod.method_type==="shamcash"||newPaymentMethod.method_type==="binance"||newPaymentMethod.method_type==="crypto_usdt_trc20"||newPaymentMethod.method_type==="crypto_usdt_bep20") && <input type="text" placeholder={newPaymentMethod.method_type==="syriatel"?"رقم GSM أو كود الكاش (8 أرقام)":newPaymentMethod.method_type==="binance"?"Binance ID الخاص بحساب المتجر (المستلم)":(newPaymentMethod.method_type==="crypto_usdt_trc20"||newPaymentMethod.method_type==="crypto_usdt_bep20")?"عنوان محفظة USDT (TRC20/BEP20)":"عنوان المحفظة (32 hex) أو رقم الحساب"} className="w-full p-3 bg-gray-50 rounded-lg text-sm outline-none font-mono" value={newPaymentMethod.api_account} onChange={e => setNewPaymentMethod({...newPaymentMethod,api_account:e.target.value})}/>}
                    {(newPaymentMethod.method_type==="manual"||newPaymentMethod.method_type==="syriatel"||newPaymentMethod.method_type==="shamcash"||newPaymentMethod.method_type==="binance"||newPaymentMethod.method_type==="crypto_usdt_trc20"||newPaymentMethod.method_type==="crypto_usdt_bep20") && (
                      <div className="space-y-1 relative">
                        <label className="text-xs font-bold text-gray-600">
                          عملة المحفظة (تُحدد كيف يُدخل المستخدم المبلغ ويُحسب سعر الصرف)
                          {newPaymentMethod.method_type === "syriatel" && (
                            <span className="block font-normal text-[10px] text-gray-400 mt-0.5">سيرياتيل كاش يقبل فقط عملة الليرة السورية (ل.س / SYP)</span>
                          )}
                          {newPaymentMethod.method_type === "shamcash" && (
                            <span className="block font-normal text-[10px] text-gray-400 mt-0.5">شام كاش يقبل الدولار ($ / USD) أو الليرة السورية (ل.س / SYP) — حسب رد الـ API</span>
                          )}
                          {newPaymentMethod.method_type === "binance" && (
                            <span className="block font-normal text-[10px] text-gray-400 mt-0.5">Binance Pay يقبل الدولار ($ / USD) أو الليرة السورية (ل.س / SYP) — حسب رد الـ API</span>
                          )}
                          {(newPaymentMethod.method_type === "crypto_usdt_trc20" || newPaymentMethod.method_type === "crypto_usdt_bep20") && (
                            <span className="block font-normal text-[10px] text-gray-400 mt-0.5">عملات USDT تقبل الدولار ($ / USD) — يُحوَّل تلقائياً من العملة المختارة</span>
                          )}
                          {newPaymentMethod.method_type === "manual" && (
                            <span className="block font-normal text-[10px] text-gray-400 mt-0.5">اختياري — لعرض سعر الصرف والمبلغ بعملة ثانوية للمستخدم عند الدفع اليدوي (إيصال)</span>
                          )}
                        </label>
                        <button
                          type="button"
                          onClick={() => setCurrencyDropdownOpen(o => !o)}
                          className="w-full p-3 bg-gray-50 rounded-lg text-sm outline-none border border-gray-200 flex items-center justify-between text-right"
                        >
                          <span>
                            {(() => {
                              const sel = currenciesForSelectedMethodType.find(c => String(c.id) === String(newPaymentMethod.currency_id));
                              return sel ? `${sel.name} (${sel.symbol}) — سعر الصرف: ${sel.exchange_rate}` : "اختر عملة المحفظة...";
                            })()}
                          </span>
                          <ChevronDown size={16} className="text-gray-400" />
                        </button>
                        {currencyDropdownOpen && (
                          <div className="absolute z-20 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-100 max-h-56 overflow-y-auto">
                            {currenciesForSelectedMethodType.length === 0 && (
                              <div className="p-3 text-xs text-gray-400 text-center">
                                {newPaymentMethod.method_type === "syriatel"
                                  ? 'لا توجد عملة ليرة سورية (ل.س / SYP) مضافة بعد — أضفها من "إدارة العملات"'
                                  : (newPaymentMethod.method_type === "shamcash" || newPaymentMethod.method_type === "binance")
                                  ? 'لا توجد عملة دولار (USD) أو ليرة سورية (SYP) مضافة بعد — أضفها من "إدارة العملات"'
                                  : (newPaymentMethod.method_type === "crypto_usdt_trc20" || newPaymentMethod.method_type === "crypto_usdt_bep20")
                                  ? 'لا توجد عملة دولار (USD) مضافة بعد — أضفها من "إدارة العملات"'
                                  : 'لا توجد عملات مضافة بعد — أضف عملة من "إدارة العملات"'}
                              </div>
                            )}
                            {currenciesForSelectedMethodType.map(c => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => { setNewPaymentMethod({ ...newPaymentMethod, currency_id: c.id }); setCurrencyDropdownOpen(false); }}
                                className="w-full text-right px-3 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between border-b border-gray-50 last:border-0"
                              >
                                <span className="font-medium text-gray-800">{c.name} <span className="text-gray-400">({c.symbol})</span></span>
                                <span className="text-[10px] text-gray-400">{c.is_default ? "افتراضية" : `سعر: ${c.exchange_rate}`}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {newPaymentMethod.currency_id && (() => {
                          const sel = currenciesForSelectedMethodType.find(c => String(c.id) === String(newPaymentMethod.currency_id));
                          if (!sel) return null;
                          return !isUsdCurrency(sel) ? (
                            <p className="text-xs text-amber-600 flex items-center gap-1"><AlertTriangle size={14}/>المبلغ المُدخل سيُحوَّل تلقائياً إلى دولار حسب سعر صرف "{sel.name}" ({sel.exchange_rate})</p>
                          ) : null;
                        })()}
                        {!newPaymentMethod.currency_id && newPaymentMethod.method_type !== "manual" && (
                          <p className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle size={14}/>يجب اختيار عملة — بدون سعر صرف صالح سيتم رفض عمليات الشحن التلقائي تلقائياً</p>
                        )}
                      </div>
                    )}
                    <input type="number" placeholder="أقل مبلغ $" className="w-full p-3 bg-gray-50 rounded-lg text-sm outline-none" value={newPaymentMethod.min_amount} onChange={e => setNewPaymentMethod({...newPaymentMethod,min_amount:e.target.value})}/>

                    {/* عمولة أو بونص الإيداع (اختياري) — تُطبَّق على مبلغ الشحن عبر هذه الطريقة (يدوية أو تلقائية) */}
                    <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <label className="text-xs font-bold text-gray-600 block">عمولة / بونص الإيداع (اختياري)</label>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setNewPaymentMethod({...newPaymentMethod, bonus_type: newPaymentMethod.bonus_type === "commission" ? "" : "commission"})} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${newPaymentMethod.bonus_type === "commission" ? "bg-red-500 text-white" : "bg-white text-gray-500 border border-gray-200"}`}>عمولة (خصم -)</button>
                        <button type="button" onClick={() => setNewPaymentMethod({...newPaymentMethod, bonus_type: newPaymentMethod.bonus_type === "bonus" ? "" : "bonus"})} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${newPaymentMethod.bonus_type === "bonus" ? "bg-green-500 text-white" : "bg-white text-gray-500 border border-gray-200"}`}>بونص (زيادة +)</button>
                      </div>
                      {newPaymentMethod.bonus_type && (
                        <input type="number" min={0} max={100} step="0.01" placeholder="النسبة المئوية %" className="w-full p-3 bg-white rounded-lg text-sm outline-none border border-gray-200" value={newPaymentMethod.bonus_percent} onChange={e => setNewPaymentMethod({...newPaymentMethod, bonus_percent: e.target.value})}/>
                      )}
                      <p className="text-[10px] text-gray-400">
                        {newPaymentMethod.bonus_type === "commission" && "مثال: شحن 100$ بعمولة 10% ⇐ يحصل المستخدم على 90$"}
                        {newPaymentMethod.bonus_type === "bonus" && "مثال: شحن 100$ ببونص 10% ⇐ يحصل المستخدم على 110$"}
                        {!newPaymentMethod.bonus_type && "بدون تحديد، يُضاف المبلغ كما هو بدون خصم أو زيادة"}
                      </p>
                    </div>

                    {newPaymentMethod.method_type === "manual" && (
                      <>
                        {/* الحقول الافتراضية (ملاحظة / رفع صورة) */}
                        <div className="space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                          <label className="text-xs font-bold text-blue-700 block">الحقول الافتراضية (تظهر في صفحة الدفع)</label>
                          {paymentMethodFields.filter(f => f.isDefault).map(field => (
                            <div key={field.id} className="bg-white rounded-lg p-3 border border-blue-100 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-gray-500">{field.type === "image" ? "حقل صورة" : "حقل نصي"}</span>
                                <button type="button" onClick={() => setPaymentMethodFields(prev => prev.map(f => f.id === field.id ? {...f, enabled: !f.enabled} : f))} className={`w-10 h-5 rounded-full relative transition-colors ${field.enabled !== false ? "bg-brand" : "bg-gray-200"}`}>
                                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${field.enabled !== false ? "right-1" : "left-1"}`} />
                                </button>
                              </div>
                              <input
                                type="text"
                                placeholder="اسم الحقل"
                                value={field.label}
                                onChange={e => setPaymentMethodFields(prev => prev.map(f => f.id === field.id ? {...f, label: e.target.value} : f))}
                                className="w-full p-2 bg-gray-50 rounded-md text-xs outline-none border border-gray-200"
                              />
                              <div className="flex gap-2">
                                <button type="button" onClick={() => setPaymentMethodFields(prev => prev.map(f => f.id === field.id ? {...f, required: true} : f))} className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-colors ${field.required ? "bg-red-500 text-white" : "bg-gray-100 text-gray-500"}`}>إلزامي</button>
                                <button type="button" onClick={() => setPaymentMethodFields(prev => prev.map(f => f.id === field.id ? {...f, required: false} : f))} className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-colors ${!field.required ? "bg-green-500 text-white" : "bg-gray-100 text-gray-500"}`}>اختياري</button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* الحقول المخصصة (حتى 3، نفس آلية المنتجات) */}
                        <div className="space-y-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-purple-700">الحقول المخصصة</label>
                            <span className="text-[10px] text-purple-400">({paymentMethodFields.filter(f => !f.isDefault).length}/3)</span>
                          </div>
                          {paymentMethodFields.filter(f => !f.isDefault).map(field => (
                            <div key={field.id} className="bg-white rounded-lg p-3 border border-purple-100 space-y-2">
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  placeholder="مثال: أدخل رقم هاتفك"
                                  value={field.label}
                                  onChange={e => setPaymentMethodFields(prev => prev.map(f => f.id === field.id ? {...f, label: e.target.value} : f))}
                                  className="flex-1 p-2 bg-gray-50 rounded-md text-xs outline-none border border-gray-200"
                                />
                                <button type="button" onClick={() => setPaymentMethodFields(prev => prev.filter(f => f.id !== field.id))} className="text-red-400 hover:text-red-600 p-1"><X size={14}/></button>
                              </div>
                              <div className="flex gap-2">
                                <button type="button" onClick={() => setPaymentMethodFields(prev => prev.map(f => f.id === field.id ? {...f, required: true} : f))} className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-colors ${field.required ? "bg-red-500 text-white" : "bg-gray-100 text-gray-500"}`}>إلزامي</button>
                                <button type="button" onClick={() => setPaymentMethodFields(prev => prev.map(f => f.id === field.id ? {...f, required: false} : f))} className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-colors ${!field.required ? "bg-green-500 text-white" : "bg-gray-100 text-gray-500"}`}>اختياري</button>
                              </div>
                            </div>
                          ))}
                          {paymentMethodFields.filter(f => !f.isDefault).length < 3 && (
                            <button type="button" onClick={() => setPaymentMethodFields(prev => [...prev, {id: Date.now().toString(), label: "", required: true, type: "text"}])} className="w-full py-2 rounded-lg border-2 border-dashed border-purple-200 text-purple-500 text-xs font-bold hover:border-purple-400 transition-colors flex items-center justify-center gap-1">
                              <Plus size={12}/> إضافة حقل آخر
                            </button>
                          )}
                        </div>
                      </>
                    )}

                    <button onClick={() => { handleAddPaymentMethod(); setAdminTab("admin_home"); setActiveSubMenu(null); }} className="w-full bg-[var(--brand)] text-white py-3.5 rounded-lg font-bold text-sm">إضافة طريقة الدفع</button>
                </div>
              </div>
            </div>
          </div>
        )}
        {adminTab === "add_product" && (
          <div className="fixed inset-0 z-[60] bg-gray-50 flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3.5 flex items-center gap-3 shadow-sm">
              <button onClick={() => { setAdminTab("admin_home"); setActiveSubMenu(null); }} className="text-gray-500 hover:text-gray-700 p-1 -m-1"><ChevronRight size={22}/></button>
              <h3 className="font-bold text-gray-800 flex items-center gap-2 text-base"><ShoppingBag size={18} className="text-indigo-600"/>إضافة منتج</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 pb-8">
              <div className="max-w-lg mx-auto bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
                <div className="space-y-3">
                  {/* زر اختيار القسم */}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">القسم <span className="text-red-400">*</span></label>
                    <button
                      type="button"
                      onClick={() => {
                        setProductPickerStep("category");
                        setProductPickerSelectedCatId(newProduct.category_special_id || "");
                        setProductPickerSelectedSubId(newProduct.subcategory_special_id || "");
                        setProductPickerSelectedSubSubId(newProduct.sub_sub_category_special_id || "");
                        setShowProductCatPickerModal(true);
                      }}
                      className="w-full p-3 bg-gray-50 rounded-lg text-sm text-right flex items-center justify-between border border-gray-200 hover:bg-gray-100 transition-colors"
                    >
                      <span className={(newProduct.subcategory_special_id || newProduct.category_special_id) ? "text-gray-800 font-medium" : "text-gray-400"}>
                        {newProduct.subcategory_special_id ? (() => {
                          const cat = categories.find((c: any) => String(c.id) === String(newProduct.category_special_id));
                          const sub = subcategories.find((s: any) => String(s.id) === String(newProduct.subcategory_special_id));
                          const subSub = newProduct.sub_sub_category_special_id ? subSubCategories.find((ss: any) => String(ss.id) === String(newProduct.sub_sub_category_special_id)) : null;
                          return [cat?.name, sub?.name, subSub?.name].filter(Boolean).join(" ← ");
                        })() : newProduct.category_special_id ? (() => {
                          const cat = categories.find((c: any) => String(c.id) === String(newProduct.category_special_id));
                          return cat ? `${cat.name} (مباشرة)` : "-- اختر قسم --";
                        })() : "اختر القسم الرئيسي ثم الفرعي"}
                      </span>
                      <span className="text-gray-400 text-xs mr-1">{(newProduct.subcategory_special_id || newProduct.category_special_id) ? "✓" : "▼"}</span>
                    </button>
                  </div>

                  {/* Product Category Picker Modal */}
                  {showProductCatPickerModal && (
                    <div
                      className="fixed inset-0 z-[80] flex items-center justify-center"
                      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
                      onClick={() => setShowProductCatPickerModal(false)}
                    >
                      <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
                        onClick={e => e.stopPropagation()}
                        dir="rtl"
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                          <div className="flex items-center gap-2">
                            {(productPickerStep === "askSub" || productPickerStep === "subcategory" || productPickerStep === "askSubSub" || productPickerStep === "subSubCategory") && (
                              <button
                                onClick={() => {
                                  if (productPickerStep === "askSub") setProductPickerStep("category");
                                  else if (productPickerStep === "subcategory") setProductPickerStep("askSub");
                                  else if (productPickerStep === "askSubSub") setProductPickerStep("subcategory");
                                  else if (productPickerStep === "subSubCategory") setProductPickerStep("askSubSub");
                                }}
                                className="text-gray-400 hover:text-gray-700 text-lg leading-none ml-1"
                              >‹</button>
                            )}
                            <h4 className="font-bold text-gray-800 text-base">
                              {productPickerStep === "category" ? "اختر القسم الرئيسي" :
                               productPickerStep === "askSub" ? "هل تود إضافة المنتج داخل قسم فرعي؟" :
                               productPickerStep === "subcategory" ? "اختر القسم الفرعي" :
                               productPickerStep === "askSubSub" ? "هل تود إضافة المنتج داخل فرع فرعي؟" :
                               "اختر الفرع الفرعي"}
                            </h4>
                          </div>
                          <button
                            onClick={() => setShowProductCatPickerModal(false)}
                            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                          >✕</button>
                        </div>

                        {/* Step Indicator */}
                        <div className="flex items-center gap-1 px-4 pt-3 pb-1">
                          {["category","subcategory","askSubSub","subSubCategory"].map((step, i) => (
                            <div key={step} className={`h-1.5 flex-1 rounded-full transition-colors ${
                              productPickerStep === step ? "bg-[var(--brand)]" :
                              ["category","askSub","subcategory","askSubSub","subSubCategory"].indexOf(productPickerStep) > i ? "bg-[var(--brand)] opacity-40" :
                              "bg-gray-200"
                            }`}/>
                          ))}
                        </div>

                        {/* Body */}
                        <div className="p-4 overflow-y-auto" style={{ maxHeight: "60vh" }}>
                          {/* Step 1: اختيار القسم الرئيسي */}
                          {productPickerStep === "category" && (
                            categories.length === 0 ? (
                              <p className="text-center text-gray-400 text-sm py-6">لا توجد أقسام رئيسية بعد</p>
                            ) : (
                              <div className="grid grid-cols-3 gap-3">
                                {categories.map((c: any) => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => {
                                      setProductPickerSelectedCatId(String(c.id));
                                      setProductPickerSelectedSubId("");
                                      setProductPickerSelectedSubSubId("");
                                      setProductPickerStep("askSub");
                                    }}
                                    className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${
                                      productPickerSelectedCatId === String(c.id) ? "border-[var(--brand)] bg-blue-50" : "border-gray-100 bg-gray-50 hover:border-gray-300"
                                    }`}
                                  >
                                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                                      {c.image_url ? (
                                        <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                                      ) : <span className="text-2xl">🗂️</span>}
                                    </div>
                                    <span className="text-xs text-center text-gray-700 font-medium leading-tight line-clamp-2">{c.name}</span>
                                  </button>
                                ))}
                              </div>
                            )
                          )}

                          {/* Step 2: اختيار القسم الفرعي */}
                          {/* Step: هل تريد اضافته الى قسم فرعي؟ */}
                          {productPickerStep === "askSub" && (
                            <div className="space-y-3 py-2">
                              <p className="text-sm text-gray-600 text-center pb-2">هل تريد اضافته الى قسم فرعي؟</p>
                              <button
                                type="button"
                                onClick={() => setProductPickerStep("subcategory")}
                                className="w-full py-3.5 rounded-xl font-bold text-sm bg-[var(--brand)] text-white"
                              >نعم، اختر القسم الفرعي</button>
                              <button
                                type="button"
                                onClick={() => {
                                  setNewProduct({ ...newProduct, category_special_id: productPickerSelectedCatId, subcategory_special_id: "", sub_sub_category_special_id: "" });
                                  setShowProductCatPickerModal(false);
                                }}
                                className="w-full py-3.5 rounded-xl font-bold text-sm bg-gray-100 text-gray-700"
                              >لا، اعتمد القسم الرئيسي فقط</button>
                            </div>
                          )}

                          {productPickerStep === "subcategory" && (() => {
                            const filteredSubs = subcategories.filter((s: any) => String(s.category_id) === String(productPickerSelectedCatId));
                            return filteredSubs.length === 0 ? (
                              <p className="text-center text-gray-400 text-sm py-6">لا توجد أقسام فرعية لهذا القسم</p>
                            ) : (
                              <div className="grid grid-cols-3 gap-3">
                                {filteredSubs.map((s: any) => (
                                  <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => {
                                      setProductPickerSelectedSubId(String(s.id));
                                      setProductPickerSelectedSubSubId("");
                                      const hasSubSubs = subSubCategories.filter((ss: any) => String(ss.subcategory_id) === String(s.id)).length > 0;
                                      if (hasSubSubs) {
                                        setProductPickerStep("askSubSub");
                                      } else {
                                        setNewProduct({ ...newProduct, category_special_id: productPickerSelectedCatId, subcategory_special_id: String(s.id), sub_sub_category_special_id: "" });
                                        setShowProductCatPickerModal(false);
                                      }
                                    }}
                                    className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${
                                      productPickerSelectedSubId === String(s.id) ? "border-[var(--brand)] bg-blue-50" : "border-gray-100 bg-gray-50 hover:border-gray-300"
                                    }`}
                                  >
                                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                                      {s.image_url ? (
                                        <img src={s.image_url} alt={s.name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                                      ) : <span className="text-2xl">📂</span>}
                                    </div>
                                    <span className="text-xs text-center text-gray-700 font-medium leading-tight line-clamp-2">{s.name}</span>
                                  </button>
                                ))}
                              </div>
                            );
                          })()}

                          {/* Step 3: هل تود إضافة داخل فرع فرعي؟ */}
                          {productPickerStep === "askSubSub" && (
                            <div className="space-y-3 py-2">
                              <p className="text-sm text-gray-600 text-center pb-2">هل تود إضافة المنتج داخل قسم فرع فرعي؟</p>
                              <button
                                type="button"
                                onClick={() => setProductPickerStep("subSubCategory")}
                                className="w-full py-3.5 rounded-xl font-bold text-sm bg-[var(--brand)] text-white"
                              >نعم، اختر الفرع الفرعي</button>
                              <button
                                type="button"
                                onClick={() => {
                                  setNewProduct({ ...newProduct, category_special_id: productPickerSelectedCatId, subcategory_special_id: productPickerSelectedSubId, sub_sub_category_special_id: "" });
                                  setShowProductCatPickerModal(false);
                                }}
                                className="w-full py-3.5 rounded-xl font-bold text-sm bg-gray-100 text-gray-700"
                              >لا، أضف في القسم الفرعي فقط</button>
                            </div>
                          )}

                          {/* Step 4: اختيار الفرع الفرعي */}
                          {productPickerStep === "subSubCategory" && (() => {
                            const filteredSubSubs = subSubCategories.filter((ss: any) => String(ss.subcategory_id) === String(productPickerSelectedSubId));
                            return filteredSubSubs.length === 0 ? (
                              <p className="text-center text-gray-400 text-sm py-6">لا توجد فروع فرعية لهذا القسم</p>
                            ) : (
                              <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-3">
                                  {filteredSubSubs.map((ss: any) => (
                                    <button
                                      key={ss.id}
                                      type="button"
                                      onClick={() => setProductPickerSelectedSubSubId(String(ss.id))}
                                      className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${
                                        productPickerSelectedSubSubId === String(ss.id) ? "border-[var(--brand)] bg-blue-50" : "border-gray-100 bg-gray-50 hover:border-gray-300"
                                      }`}
                                    >
                                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                                        {ss.image_url ? (
                                          <img src={ss.image_url} alt={ss.name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                                        ) : <span className="text-2xl">📁</span>}
                                      </div>
                                      <span className="text-xs text-center text-gray-700 font-medium leading-tight line-clamp-2">{ss.name}</span>
                                    </button>
                                  ))}
                                </div>
                                <button
                                  type="button"
                                  disabled={!productPickerSelectedSubSubId}
                                  onClick={() => {
                                    setNewProduct({ ...newProduct, category_special_id: productPickerSelectedCatId, subcategory_special_id: productPickerSelectedSubId, sub_sub_category_special_id: productPickerSelectedSubSubId });
                                    setShowProductCatPickerModal(false);
                                  }}
                                  className="w-full bg-[var(--brand)] text-white py-3 rounded-xl font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                                >تأكيد الاختيار</button>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                  {/* اسم المنتج */}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">اسم المنتج <span className="text-red-400">*</span></label>
                    <input type="text" placeholder="اسم المنتج" className="w-full p-3 bg-gray-50 rounded-lg text-sm outline-none" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} autoFocus/>
                  </div>
                  {/* الوصف */}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">الوصف</label>
                    <textarea placeholder="وصف المنتج (اختياري)" className="w-full p-3 bg-gray-50 rounded-lg text-sm outline-none h-20 resize-none" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})}/>
                  </div>
                  {/* صورة المنتج */}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">صورة المنتج</label>
                    <div className="flex gap-2">
                      <input type="text" placeholder="https://... رابط الصورة" className="flex-1 p-3 bg-gray-50 rounded-lg text-sm outline-none" value={newProduct.image_url} onChange={e => setNewProduct({...newProduct, image_url: e.target.value})}/>
                      <label className="bg-gray-100 text-gray-600 px-3 py-3 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1 whitespace-nowrap hover:bg-gray-200 transition-colors">
                        <Upload size={14}/>رفع
                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const url = await uploadImage(file);
                            setNewProduct(p => ({...p, image_url: url}));
                          } catch { showToast("خطأ في رفع الصورة", 'error'); }
                        }}/>
                      </label>
                    </div>
                    {newProduct.image_url && (
                      <div className="mt-2 flex items-center gap-2">
                        <OptimizedImage src={newProduct.image_url} width={96} height={96} className="w-12 h-12 object-cover rounded-md border border-gray-100"/>
                        <button onClick={() => setNewProduct(p => ({...p, image_url: ""}))} className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded-md">حذف</button>
                      </div>
                    )}
                    {newProduct.image_url && !isLikelyImageUrl(newProduct.image_url) && (
                      <p className="mt-1.5 flex items-center gap-1 text-[10px] text-amber-600 font-bold">
                        <ImageOff size={11}/> الرابط لا يبدو كصورة صالحة — تأكد أنه ينتهي بامتداد صورة (jpg, png...)
                      </p>
                    )}
                  </div>
                  {/* نوع المتجر */}
                  <StoreTypePickerField
                    value={newProduct.store_type}
                    onChange={val => { setNewProduct({...newProduct, store_type: val}); setCustomFields(prev => ensureDefaultFields(val, prev)); }}
                  />
                  {["normal","quick_order","gallery","packages"].includes(newProduct.store_type||"normal") && (
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">السعر $</label>
                      <input type="number" step="0.01" placeholder="السعر $" className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100" value={newProduct.price||""} onChange={e => setNewProduct({...newProduct, price: e.target.value})}/>
                    </div>
                  )}
                  <MoreDetailsSection>
                  {/* صور متجر الصور (3-5 صور) */}
                  {newProduct.store_type === "gallery" && (
                    <div className="space-y-2 p-3 bg-pink-50 rounded-lg border border-pink-100">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-pink-700">صور المنتج (3 إلى 5 صور)</label>
                        <span className="text-[10px] text-pink-500">({newProduct.image_urls.length}/5)</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {newProduct.image_urls.map((url, i) => (
                          <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-pink-100">
                            <OptimizedImage src={url} width={200} height={200} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setNewProduct(p => ({ ...p, image_urls: p.image_urls.filter((_, idx) => idx !== i) }))}
                              className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                            >✕</button>
                          </div>
                        ))}
                        {newProduct.image_urls.length < 5 && (
                          <label className="aspect-square rounded-lg border-2 border-dashed border-pink-200 flex flex-col items-center justify-center gap-1 text-pink-400 cursor-pointer hover:border-pink-400 transition-colors">
                            <Upload size={18} />
                            <span className="text-[10px] font-bold">رفع صورة</span>
                            <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              try {
                                const url = await uploadImage(file);
                                setNewProduct(p => ({ ...p, image_urls: [...p.image_urls, url] }));
                              } catch { showToast("خطأ في رفع الصورة", 'error'); }
                            }} />
                          </label>
                        )}
                      </div>
                      {newProduct.image_urls.length < 3 && (
                        <p className="text-[11px] text-pink-600 text-center py-1">يرجى رفع 3 صور على الأقل (حتى 5)</p>
                      )}
                    </div>
                  )}
                  {/* السعر */}
                  {newProduct.store_type === "quantities" ? (
                    <div className="space-y-3 p-3 bg-teal-50 rounded-lg border border-teal-100">
                      {/* السعر للكمية الأساسية */}
                      <div>
                        <label className="text-xs font-bold text-teal-700 mb-1 block">السعر بالدولار $</label>
                        <p className="text-[10px] text-teal-600 mb-1.5 leading-relaxed">
                          💡 السعر بالدولار للكمية التي ستحددها في حقل "الكمية الأساسية" أدناه — سيُحسب سعر الوحدة تلقائياً.
                        </p>
                        <input
                          type="number" step="0.000001" min="0" placeholder="مثال: 5.00"
                          className="w-full p-2.5 bg-white rounded-md text-sm outline-none border border-teal-200 focus:border-teal-400"
                          value={newProduct.price}
                          onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                        />
                      </div>
                      {/* الكمية الأساسية — تُخزَّن في price_per_unit */}
                      <div>
                        <label className="text-xs font-bold text-teal-700 mb-1 block">
                          الكمية الأساسية <span className="text-red-400">*</span>
                        </label>
                        <p className="text-[10px] text-teal-600 mb-1.5 leading-relaxed">
                          🔢 الكمية التي يُحسب عليها السعر — مثلاً إذا السعر 5$ لـ 10 وحدات، أدخل 10 هنا.
                        </p>
                        <input
                          type="number" step="any" placeholder="مثال: 10" required
                          className="w-full p-2.5 bg-white rounded-md text-sm outline-none border border-teal-200 focus:border-teal-400"
                          value={newProduct.price_per_unit}
                          onChange={e => setNewProduct({...newProduct, price_per_unit: e.target.value})}
                        />
                      </div>
                      {/* سعر الوحدة — محسوب تلقائياً، للقراءة فقط */}
                      <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">
                          سعر الوحدة (محسوب تلقائياً)
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            tabIndex={-1}
                            value={
                              newProduct.price && newProduct.price_per_unit && Number(newProduct.price_per_unit) > 0
                                ? (Number(newProduct.price) / Number(newProduct.price_per_unit)).toFixed(6) + " $"
                                : "— أدخل السعر والكمية الأساسية"
                            }
                            className="flex-1 p-2.5 bg-gray-100 text-gray-400 rounded-md text-sm border border-gray-200 cursor-not-allowed select-none outline-none"
                            onClick={e => (e.target as HTMLInputElement).blur()}
                          />
                          <button
                            type="button"
                            title="تعديل سعر الوحدة يدوياً — سيُعدَّل السعر الأساسي تلقائياً"
                            className="p-2.5 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-md transition-colors flex items-center gap-1 text-xs whitespace-nowrap"
                            onClick={() => {
                              const baseQty = Number(newProduct.price_per_unit) || 1;
                              const currentUnit = baseQty > 0 ? (Number(newProduct.price) / baseQty).toFixed(6) : "";
                              const v = prompt("أدخل سعر الوحدة المطلوب $\n(سيتم تعديل السعر الأساسي تلقائياً بناءً على الكمية الأساسية):", currentUnit);
                              if (v !== null && v.trim() !== "" && !isNaN(Number(v)) && baseQty > 0) {
                                setNewProduct({...newProduct, price: String((Number(v) * baseQty).toFixed(6))});
                              }
                            }}
                          >
                            <Pencil size={13} />
                            تعديل
                          </button>
                        </div>
                        {newProduct.price && newProduct.price_per_unit && Number(newProduct.price_per_unit) > 0 && (
                          <p className="text-[10px] text-teal-600 mt-1">
                            مثال: 50 وحدة = <span className="font-bold">{((Number(newProduct.price) / Number(newProduct.price_per_unit)) * 50).toFixed(4)} $</span>
                          </p>
                        )}
                      </div>
                      {/* أقل كمية للطلب */}
                      <div>
                        <label className="text-xs font-bold text-gray-600 mb-1 block">أقل كمية للطلب <span className="text-red-400">*</span></label>
                        <input
                          type="number" step="any" placeholder="مثال: 1" required
                          className="w-full p-2.5 bg-white rounded-md text-sm outline-none border border-gray-200 focus:border-teal-300"
                          value={newProduct.min_quantity}
                          onChange={e => setNewProduct({...newProduct, min_quantity: e.target.value})}
                        />
                      </div>
                      {/* أكثر كمية للطلب */}
                      <div>
                        <label className="text-xs font-bold text-gray-600 mb-1 block">أكثر كمية للطلب <span className="text-gray-400 font-normal">(اختياري)</span></label>
                        <input
                          type="number" step="any" placeholder="بدون حد أقصى إذا تركت فارغاً"
                          className="w-full p-2.5 bg-white rounded-md text-sm outline-none border border-gray-200 focus:border-teal-300"
                          value={newProduct.max_quantity}
                          onChange={e => setNewProduct({...newProduct, max_quantity: e.target.value})}
                        />
                      </div>
                    </div>
                  ) : newProduct.store_type === "external_api" ? (
                    <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                      {/* اختيار وضع الكمية: نطاق (أقل/أكثر) أو كمية محددة ثابتة */}
                      <div className="flex gap-2 p-1 bg-white rounded-md border border-gray-200">
                        <button
                          type="button"
                          onClick={() => {
                            setExtApiQtyMode("range");
                            setNewProduct({...newProduct, min_quantity: "", max_quantity: ""});
                          }}
                          className={`flex-1 py-1.5 rounded text-xs font-bold transition-colors ${extApiQtyMode === "range" ? "bg-teal-500 text-white" : "text-gray-500"}`}
                        >
                          تحديد أقل وأكثر كمية
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setExtApiQtyMode("fixed");
                            setNewProduct({...newProduct, min_quantity: newProduct.min_quantity || "1", max_quantity: newProduct.min_quantity || "1"});
                          }}
                          className={`flex-1 py-1.5 rounded text-xs font-bold transition-colors ${extApiQtyMode === "fixed" ? "bg-teal-500 text-white" : "text-gray-500"}`}
                        >
                          كمية محددة
                        </button>
                      </div>
                      {extApiQtyMode === "range" ? (
                        <>
                          <input type="number" step="any" placeholder="أقل كمية (مطلوب)" required className="w-full p-2 bg-white rounded-md text-sm outline-none border border-red-100" value={newProduct.min_quantity} onChange={e => setNewProduct({...newProduct, min_quantity: e.target.value})}/>
                          <input type="number" step="any" placeholder="أكثر كمية" className="w-full p-2 bg-white rounded-md text-sm outline-none" value={newProduct.max_quantity} onChange={e => setNewProduct({...newProduct, max_quantity: e.target.value})}/>
                        </>
                      ) : (
                        <input
                          type="number" step="any" placeholder="الكمية المحددة (مطلوب)" required
                          className="w-full p-2 bg-white rounded-md text-sm outline-none border border-teal-200"
                          value={newProduct.min_quantity}
                          onChange={e => setNewProduct({...newProduct, min_quantity: e.target.value, max_quantity: e.target.value})}
                        />
                      )}
                      <input type="number" step="0.000001" placeholder="سعر الوحدة $" className="w-full p-2 bg-white rounded-md text-sm outline-none" value={newProduct.price_per_unit} onChange={e => setNewProduct({...newProduct, price_per_unit: e.target.value})}/>
                      <input type="text" placeholder="معرف المنتج الخارجي (external_id)" className="w-full p-2 bg-white rounded-md text-sm outline-none border border-blue-100" value={newProduct.external_id} onChange={e => setNewProduct({...newProduct, external_id: e.target.value})}/>
                    </div>
                  ) : newProduct.store_type === "specificPackage" ? (
                    <div className="space-y-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                      <div>
                        <label className="text-xs font-bold text-indigo-700 mb-1 block">تسمية حقل الإدخال (input_label)</label>
                        <input
                          type="text" placeholder="مثال: اختر الباقة"
                          className="w-full p-2.5 bg-white rounded-md text-sm outline-none border border-indigo-200 focus:border-indigo-400"
                          value={newProduct.input_label}
                          onChange={e => setNewProduct({...newProduct, input_label: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-indigo-700 mb-1 block">قيم الباقة (Package Values)</label>
                        <p className="text-[10px] text-indigo-600 mb-1.5 leading-relaxed">
                          تُعرض هذه القيم كقائمة اختيار للعميل بدل حقل كمية حر. تدعم الكسور العشرية.
                        </p>
                        <div className="flex gap-2">
                          <input
                            type="number" step="any" placeholder="مثال: 0.5"
                            className="flex-1 p-2.5 bg-white rounded-md text-sm outline-none border border-indigo-200 focus:border-indigo-400"
                            value={newPackageValueInput}
                            onChange={e => setNewPackageValueInput(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                const v = parseFloat(newPackageValueInput);
                                if (!isNaN(v)) {
                                  setNewProduct(p => ({...p, package_values: [...p.package_values, String(v)]}));
                                  setNewPackageValueInput("");
                                }
                              }
                            }}
                          />
                          <button
                            type="button"
                            className="bg-indigo-500 text-white px-3 py-2 rounded-md text-xs font-bold whitespace-nowrap"
                            onClick={() => {
                              const v = parseFloat(newPackageValueInput);
                              if (!isNaN(v)) {
                                setNewProduct(p => ({...p, package_values: [...p.package_values, String(v)]}));
                                setNewPackageValueInput("");
                              }
                            }}
                          >إضافة</button>
                        </div>
                        {newProduct.package_values.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {newProduct.package_values.map((v, i) => (
                              <span key={i} className="flex items-center gap-1 bg-white border border-indigo-200 rounded-full px-2.5 py-1 text-xs text-indigo-700">
                                {v}
                                <button
                                  type="button"
                                  onClick={() => setNewProduct(p => ({...p, package_values: p.package_values.filter((_, idx) => idx !== i)}))}
                                  className="text-indigo-400 hover:text-red-500"
                                >✕</button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-600 mb-1 block">أقل كمية <span className="text-gray-400 font-normal">(اختياري)</span></label>
                        <input
                          type="number" step="any" placeholder="مثال: 0.5"
                          className="w-full p-2.5 bg-white rounded-md text-sm outline-none border border-gray-200 focus:border-indigo-300"
                          value={newProduct.min_quantity}
                          onChange={e => setNewProduct({...newProduct, min_quantity: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-600 mb-1 block">أكثر كمية <span className="text-gray-400 font-normal">(اختياري)</span></label>
                        <input
                          type="number" step="any" placeholder="بدون حد أقصى إذا تركت فارغاً"
                          className="w-full p-2.5 bg-white rounded-md text-sm outline-none border border-gray-200 focus:border-indigo-300"
                          value={newProduct.max_quantity}
                          onChange={e => setNewProduct({...newProduct, max_quantity: e.target.value})}
                        />
                      </div>
                    </div>
                  ) : newProduct.store_type === "packages" ? (
                    <div className="space-y-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                      <div>
                        <label className="text-xs font-bold text-indigo-700 mb-1 block">الباقات</label>
                        <p className="text-[10px] text-indigo-600 mb-1.5 leading-relaxed">
                          تُعرض هذه الباقات للعميل كقائمة منسدلة عند تأكيد الطلب، لكل باقة اسمها وسعرها الخاص.
                        </p>
                        <div className="space-y-2">
                          {newProduct.packages_data.map((pkg, i) => (
                            <div key={i} className="bg-white border border-indigo-200 rounded-lg p-2.5">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[11px] font-bold text-indigo-500">الباقة {i + 1}</span>
                                {newProduct.packages_data.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => setNewProduct(p => ({...p, packages_data: p.packages_data.filter((_, idx) => idx !== i)}))}
                                    className="text-indigo-400 hover:text-red-500 text-xs"
                                  >✕</button>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <input
                                  type="text" placeholder="اسم الباقة (مثال: باقة 10 جيجا)"
                                  className="flex-[2] min-w-0 p-2.5 bg-gray-50 rounded-md text-sm outline-none border border-gray-200 focus:border-indigo-400"
                                  value={pkg.label}
                                  onChange={e => setNewProduct(p => ({...p, packages_data: p.packages_data.map((x, idx) => idx === i ? {...x, label: e.target.value} : x)}))}
                                />
                                <input
                                  type="number" step="0.01" placeholder="السعر $"
                                  className="flex-1 min-w-0 w-full p-2.5 bg-gray-50 rounded-md text-sm outline-none border border-gray-200 focus:border-indigo-400"
                                  value={pkg.price}
                                  onChange={e => setNewProduct(p => ({...p, packages_data: p.packages_data.map((x, idx) => idx === i ? {...x, price: e.target.value} : x)}))}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => setNewProduct(p => ({...p, packages_data: [...p.packages_data, { label: "", price: "" }]}))}
                          className="w-full mt-2 py-2 rounded-lg border-2 border-dashed border-indigo-200 text-indigo-500 text-xs font-bold hover:border-indigo-400 transition-colors flex items-center justify-center gap-1"
                        >
                          <Plus size={12}/> إضافة باقة أخرى
                        </button>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-indigo-700 mb-1 block">الخانة الافتراضية</label>
                        {customFields.filter(f => f.isDefault).map((field) => (
                          <input
                            key={field.id}
                            type="text"
                            placeholder="ضع رقم هاتفك"
                            value={field.label}
                            onChange={e => setCustomFields(prev => prev.map(f => f.id === field.id ? {...f, label: e.target.value} : f))}
                            className="w-full p-2.5 bg-white rounded-md text-sm outline-none border border-indigo-200 focus:border-indigo-400"
                          />
                        ))}
                        <p className="text-[10px] text-indigo-500 mt-1">تُعرض هذه الخانة للعميل ليدخل بياناته (رقم الهاتف افتراضياً). يمكنك تعديل تسميتها.</p>
                      </div>
                    </div>
                  ) : newProduct.store_type === "inventory" ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">السعر $</label>
                        <input type="number" step="0.01" placeholder="السعر $" className="w-full p-3 bg-gray-50 rounded-lg text-sm outline-none" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})}/>
                      </div>
                      <div className="space-y-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-amber-700 block">📦 عناصر المخزون ({addProductInventoryUnits.length})</label>
                          <button
                            type="button"
                            onClick={() => setShowAddProductInventoryModal(true)}
                            className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg"
                          >
                            اختيار مجموعة موجودة
                          </button>
                        </div>

                        {/* إضافة عنصر واحد */}
                        <div className="flex gap-2">
                          <input
                            type="text" placeholder="إضافة عنصر (كود / حساب / نص)"
                            value={addProductNewUnitContent}
                            onChange={e => setAddProductNewUnitContent(e.target.value)}
                            className="flex-1 p-2 bg-white rounded-lg text-sm outline-none border border-amber-200"
                          />
                          <button type="button" disabled={addProductInventoryBusy} onClick={addProductSingleUnit} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold disabled:opacity-50">إضافة</button>
                        </div>

                        {/* استيراد جماعي */}
                        <div className="space-y-1.5">
                          <p className="text-[10px] text-amber-700 font-bold">استيراد جماعي (كل سطر = عنصر واحد)</p>
                          <textarea
                            placeholder={"account1@gmail.com:pass123\naccount2@gmail.com:pass456"}
                            value={addProductBulkImportText}
                            onChange={e => setAddProductBulkImportText(e.target.value)}
                            className="w-full p-2 bg-white rounded-lg text-xs outline-none border border-amber-200 h-20 resize-none font-mono"
                          />
                          <button type="button" disabled={addProductInventoryBusy} onClick={addProductBulkImport} className="w-full py-2 bg-amber-500 text-white rounded-lg text-xs font-bold disabled:opacity-50">
                            استيراد ({addProductBulkImportText.split(/\r?\n/).filter(l => l.trim()).length} عنصر)
                          </button>
                        </div>

                        {/* قائمة العناصر المضافة */}
                        {addProductInventoryUnits.length > 0 && (
                          <div className="space-y-1.5 max-h-48 overflow-y-auto">
                            {addProductInventoryUnits.map((u: any) => (
                              <div key={u.id} className="p-2 bg-white rounded-lg flex items-center justify-between gap-2 border border-amber-100">
                                <span className="text-xs font-mono text-gray-700 truncate flex-1" dir="ltr">{u.content}</span>
                                <button type="button" onClick={() => deleteAddProductUnit(u.id)} className="text-red-400 hover:text-red-600 text-xs shrink-0">✕</button>
                              </div>
                            ))}
                          </div>
                        )}
                        {addProductInventoryUnits.length === 0 && (
                          <p className="text-[11px] text-amber-600 text-center py-1">أضف عنصراً واحداً على الأقل قبل حفظ المنتج</p>
                        )}
                      </div>
                      <InventoryManagerModal
                        open={showAddProductInventoryModal}
                        onClose={() => setShowAddProductInventoryModal(false)}
                        adminFetch={adminFetch}
                        currentGroupId={newProduct.inventory_group_id}
                        onSelectGroup={(g) => {
                          setNewProduct(p => ({ ...p, inventory_group_id: g.id }));
                          loadAddProductInventoryUnits(g.id);
                          setShowAddProductInventoryModal(false);
                        }}
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">السعر $</label>
                      <input type="number" step="0.01" placeholder="السعر $" className="w-full p-3 bg-gray-50 rounded-lg text-sm outline-none" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})}/>
                    </div>
                  )}
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                    <label className="text-xs font-bold text-emerald-700 mb-1 block">كم ربحك من هذا المنتج؟ (اختياري)</label>
                    <p className="text-[10px] text-emerald-600 mb-1.5 leading-relaxed">
                      💡 صافي ربح الوحدة الواحدة — يُستخدم تلقائياً في حساب الأرباح ما لم يُدخل ربح يدوي مختلف على مستوى الطلب نفسه.
                    </p>
                    <input
                      type="number" step="0.01" placeholder="مثال: 2.50"
                      className="w-full p-2.5 bg-white rounded-md text-sm outline-none border border-emerald-200 focus:border-emerald-400"
                      value={newProduct.default_profit}
                      onChange={e => setNewProduct({...newProduct, default_profit: e.target.value})}
                    />
                  </div>
                  {newProduct.store_type === "quick_order" && (
                    <div className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <label className="text-xs font-bold text-blue-700 block">الحقل الافتراضي (المعرف)</label>
                      {customFields.filter(f => f.isDefault).map((field) => (
                        <div key={field.id} className="bg-white rounded-lg p-3 border border-blue-100 space-y-2">
                          <input
                            type="text"
                            placeholder="مثال: ضع المعرف (ID)"
                            value={field.label}
                            onChange={e => setCustomFields(prev => prev.map(f => f.id === field.id ? {...f, label: e.target.value} : f))}
                            className="w-full p-2 bg-gray-50 rounded-md text-xs outline-none border border-gray-200"
                          />
                          <div className="flex gap-2">
                            <button type="button" onClick={() => setCustomFields(prev => prev.map(f => f.id === field.id ? {...f, required: true} : f))} className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-colors ${field.required ? "bg-red-500 text-white" : "bg-gray-100 text-gray-500"}`}>إلزامي</button>
                            <button type="button" onClick={() => setCustomFields(prev => prev.map(f => f.id === field.id ? {...f, required: false} : f))} className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-colors ${!field.required ? "bg-green-500 text-white" : "bg-gray-100 text-gray-500"}`}>اختياري</button>
                          </div>
                          <FieldKeyboardTypePicker
                            value={(field.keyboard_types as FieldKeyboardType[]) || ["numbers","letters","symbols"]}
                            onChange={(kt) => setCustomFields(prev => prev.map(f => f.id === field.id ? {...f, keyboard_types: kt} : f))}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  {newProduct.store_type === "quantities" && (
                    <div className="space-y-2 p-3 bg-teal-50 rounded-lg border border-teal-100">
                      <label className="text-xs font-bold text-teal-700 block">الحقول الافتراضية</label>
                      {customFields.filter(f => f.isDefault).map((field) => (
                        <div key={field.id} className="bg-white rounded-lg p-3 border border-teal-100 space-y-2">
                          <input
                            type="text"
                            placeholder="اسم الحقل"
                            value={field.label}
                            onChange={e => setCustomFields(prev => prev.map(f => f.id === field.id ? {...f, label: e.target.value} : f))}
                            className="w-full p-2 bg-gray-50 rounded-md text-xs outline-none border border-gray-200"
                          />
                          <div className="flex gap-2">
                            <button type="button" onClick={() => setCustomFields(prev => prev.map(f => f.id === field.id ? {...f, required: true} : f))} className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-colors ${field.required ? "bg-red-500 text-white" : "bg-gray-100 text-gray-500"}`}>إلزامي</button>
                            <button type="button" onClick={() => setCustomFields(prev => prev.map(f => f.id === field.id ? {...f, required: false} : f))} className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-colors ${!field.required ? "bg-green-500 text-white" : "bg-gray-100 text-gray-500"}`}>اختياري</button>
                          </div>
                          <FieldKeyboardTypePicker
                            value={(field.keyboard_types as FieldKeyboardType[]) || ["numbers","letters","symbols"]}
                            onChange={(kt) => setCustomFields(prev => prev.map(f => f.id === field.id ? {...f, keyboard_types: kt} : f))}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Custom Fields Section — for normal, quick_order, quantities, gallery, inventory, packages */}
                  {["normal", "quick_order", "quantities", "gallery", "inventory", "packages"].includes(newProduct.store_type) && (
                    <div className="space-y-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-purple-700">الحقول المخصصة</label>
                        <span className="text-[10px] text-purple-400">({customFields.filter(f => !f.isDefault).length}/3)</span>
                      </div>
                      {customFields.filter(f => !f.isDefault).map((field) => (
                        <div key={field.id} className="bg-white rounded-lg p-3 border border-purple-100 space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="مثال: أدخل رقم هاتفك"
                              value={field.label}
                              onChange={e => setCustomFields(prev => prev.map(f => f.id === field.id ? {...f, label: e.target.value} : f))}
                              className="flex-1 p-2 bg-gray-50 rounded-md text-xs outline-none border border-gray-200"
                            />
                            <button
                              type="button"
                              onClick={() => setCustomFields(prev => prev.filter(f => f.id !== field.id))}
                              className="text-red-400 hover:text-red-600 p-1"
                            >
                              <X size={14}/>
                            </button>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setCustomFields(prev => prev.map(f => f.id === field.id ? {...f, required: true} : f))}
                              className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-colors ${field.required ? "bg-red-500 text-white" : "bg-gray-100 text-gray-500"}`}
                            >
                              إلزامي
                            </button>
                            <button
                              type="button"
                              onClick={() => setCustomFields(prev => prev.map(f => f.id === field.id ? {...f, required: false} : f))}
                              className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-colors ${!field.required ? "bg-green-500 text-white" : "bg-gray-100 text-gray-500"}`}
                            >
                              اختياري
                            </button>
                          </div>
                          <FieldKeyboardTypePicker
                            value={(field.keyboard_types as FieldKeyboardType[]) || ["numbers","letters","symbols"]}
                            onChange={(kt) => setCustomFields(prev => prev.map(f => f.id === field.id ? {...f, keyboard_types: kt} : f))}
                          />
                        </div>
                      ))}
                      {customFields.filter(f => !f.isDefault).length < 3 && (
                        <button
                          type="button"
                          onClick={() => setCustomFields(prev => [...prev, {id: Date.now().toString(), label: "", required: true, keyboard_types: ["numbers","letters","symbols"]}])}
                          className="w-full py-2 rounded-lg border-2 border-dashed border-purple-200 text-purple-500 text-xs font-bold hover:border-purple-400 transition-colors flex items-center justify-center gap-1"
                        >
                          <Plus size={12}/> إضافة حقل آخر
                        </button>
                      )}
                    </div>
                  )}
                  {/* [NAME VERIFICATION] متاح لجميع أنواع المتاجر — يعمل مستقلاً عن الحقول المخصصة */}
                  <NameVerificationFields
                    value={{
                      name_verification_enabled: newProduct.name_verification_enabled,
                      name_verification_game: newProduct.name_verification_game,
                      name_verification_region: newProduct.name_verification_region,
                      name_verification_source_field_ids: newProduct.name_verification_source_field_ids || [],
                    }}
                    onChange={(val: NameVerificationValue) => setNewProduct({ ...newProduct, ...val })}
                    adminFetch={adminFetch}
                    availableFields={customFields.map(f => ({ id: f.id, label: f.label?.trim() || (f.isDefault ? "الحقل الافتراضي" : "حقل بلا اسم") }))}
                  />
                  </MoreDetailsSection>
                  <button
                    type="button"
                    onClick={() => setShowAddProductPreview(true)}
                    className="w-full py-2.5 rounded-lg text-xs font-bold border border-gray-200 text-gray-600 flex items-center justify-center gap-1.5 hover:bg-gray-50 transition-colors"
                  >
                    <Eye size={14}/> معاينة المنتج قبل الحفظ
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        if (!newProduct.name) return showToast("يرجى إدخال اسم المنتج", 'error');
                        if (!newProduct.subcategory_special_id && !newProduct.category_special_id) return showToast("يرجى اختيار القسم", 'error');
                        await handleAddProduct(true);
                        setAdminTab("admin_home");
                        setActiveSubMenu(null);
                      }}
                      disabled={savingAddProductDraft}
                      className="flex-1 bg-gray-100 text-gray-600 py-3.5 rounded-lg font-bold text-sm disabled:opacity-60"
                    >
                      حفظ كمسودة
                    </button>
                    <button
                      onClick={async () => {
                        if (!newProduct.name) return showToast("يرجى إدخال اسم المنتج", 'error');
                        if (!newProduct.subcategory_special_id && !newProduct.category_special_id) return showToast("يرجى اختيار القسم", 'error');
                        await handleAddProduct();
                        setAdminTab("admin_home");
                        setActiveSubMenu(null);
                      }}
                      className="flex-[2] bg-[var(--brand)] text-white py-3.5 rounded-lg font-bold text-sm"
                    >
                      حفظ المنتج
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <ProductCheckoutPreview
              open={showAddProductPreview}
              onClose={() => setShowAddProductPreview(false)}
              product={{
                ...newProduct,
                // [NAME VERIFICATION] نفس منطق الحفظ: نمرر حقول التعديل الحيّة (customFields) بدل
                // newProduct.custom_fields الخام غير المزامَن، لتفادي خطأ React #31 عند فتح المعاينة.
                custom_fields: customFields.length > 0 ? JSON.stringify(customFields) : null,
              }}
            />
          </div>
        )}

        {/* Add Balance Modal */}
        <AnimatePresence>
          {activeSubMenu === "add_balance" && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[60] bg-black/50 flex items-end" onClick={() => setActiveSubMenu(null)}>
              <motion.div initial={{y:80}} animate={{y:0}} exit={{y:80}} className="bg-white w-full rounded-t-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
                <h3 className="font-bold text-gray-800 flex items-center gap-2"><Wallet size={18}/>شحن رصيد يدوي</h3>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="ابحث بالاسم، البريد الإلكتروني، رقم الهاتف أو رقم الدخول"
                    className="w-full p-3 bg-gray-50 rounded-lg text-sm outline-none"
                    value={topupSearchQuery}
                    onChange={e => {
                      setTopupSearchQuery(e.target.value);
                      setTopupSelectedUser(null);
                      setManualTopup({ ...manualTopup, userId: "" });
                    }}
                  />
                  {topupSearchLoading && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">...جارٍ البحث</span>
                  )}
                  {topupSearchResults.length > 0 && (
                    <div className="absolute z-10 top-full mt-1 w-full bg-white border border-gray-100 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                      {topupSearchResults.map((u: any) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            setTopupSelectedUser(u);
                            setManualTopup({ ...manualTopup, userId: String(u.id) });
                            setTopupSearchQuery(u.name || u.email || u.phone || String(u.id));
                            setTopupSearchResults([]);
                          }}
                          className="w-full text-right p-3 hover:bg-gray-50 flex flex-col border-b border-gray-50 last:border-0"
                        >
                          <span className="text-sm font-bold text-gray-800">{u.name || `مستخدم #${u.id}`}</span>
                          <span className="text-[11px] text-gray-400">#{u.id} · {u.email || "—"} · {u.phone || "—"}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {topupSelectedUser && (
                  <div className="text-[11px] text-gray-500 bg-gray-50 rounded-lg p-2">
                    تم اختيار: <span className="font-bold text-gray-700">{topupSelectedUser.name || `#${topupSelectedUser.id}`}</span> (رقم الدخول #{topupSelectedUser.id})
                  </div>
                )}
                <input type="number" placeholder="المبلغ $" className="w-full p-3 bg-gray-50 rounded-lg text-sm outline-none" value={manualTopup.amount} onChange={e => setManualTopup({...manualTopup,amount:e.target.value})}/>
                <button
                  onClick={() => {
                    if (!manualTopup.userId) return showToast("يرجى اختيار مستخدم من نتائج البحث", "error");
                    handleManualTopup();
                    setActiveSubMenu(null);
                  }}
                  className="w-full bg-[var(--brand)] text-white py-3.5 rounded-lg font-bold text-sm"
                >
                  شحن الرصيد
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add Notification Modal */}
        <AnimatePresence>
          {activeSubMenu === "add_notification" && (
            <AdminNotifModal
              onClose={() => setActiveSubMenu(null)}
              handleSendNotification={handleSendNotification}
              adminFetch={adminFetch}
            />
          )}

          {/* Customize Discounts Modal */}
          {activeSubMenu === "customize_discounts" && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[60] bg-black/50 flex items-end justify-center" onClick={() => setActiveSubMenu(null)}>
              <motion.div initial={{y:100,opacity:0}} animate={{y:0,opacity:1}} exit={{y:100,opacity:0}} className="bg-white w-full max-w-lg rounded-t-lg p-6 space-y-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2"><Tag size={18} className="text-teal-600"/>تخصيص التخفيضات</h3>
                  <button onClick={() => setActiveSubMenu(null)} className="text-gray-400"><X size={22}/></button>
                </div>
                <div className="bg-teal-50 rounded-lg p-4 space-y-3">
                  <h4 className="font-bold text-sm text-teal-700 flex items-center gap-2"><Crown size={14}/>نسبة خصم VIP</h4>
                  <p className="text-xs text-gray-500">نسبة الخصم التي تُطبَّق تلقائياً على كل طلبات عملاء VIP</p>
                  <div className="flex gap-2 items-center">
                    <input type="number" min="0" max="100" step="0.5" value={vipDiscountVal} onChange={e => setVipDiscountVal(e.target.value)} className="flex-1 p-3 bg-white rounded-lg text-sm outline-none border border-teal-100 text-center font-bold" placeholder="مثال: 5" />
                    <span className="text-gray-500 font-bold text-lg">%</span>
                    <button disabled={savingDiscount} onClick={async () => { setSavingDiscount(true); await handleUpdateSetting('vip_discount', vipDiscountVal); setSavingDiscount(false); }} className="bg-teal-600 text-white px-5 py-3 rounded-lg text-sm font-bold disabled:opacity-50">
                      {savingDiscount ? "..." : "حفظ"}
                    </button>
                  </div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                  <h4 className="font-bold text-sm text-blue-700 flex items-center gap-2"><Star size={14}/>نسبة عمولة الإحالة</h4>
                  <p className="text-xs text-gray-500">النسبة المئوية التي يحصل عليها المستخدم من كل شحنة يجريها من أحاله</p>
                  <div className="flex gap-2 items-center">
                    <input type="number" min="0" max="100" step="0.5" value={referralCommissionVal} onChange={e => setReferralCommissionVal(e.target.value)} className="flex-1 p-3 bg-white rounded-lg text-sm outline-none border border-blue-100 text-center font-bold" placeholder="مثال: 10" />
                    <span className="text-gray-500 font-bold text-lg">%</span>
                    <button disabled={savingDiscount} onClick={async () => { setSavingDiscount(true); await handleUpdateSetting('referral_commission', referralCommissionVal); setSavingDiscount(false); }} className="bg-blue-600 text-white px-5 py-3 rounded-lg text-sm font-bold disabled:opacity-50">
                      {savingDiscount ? "..." : "حفظ"}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

        </AnimatePresence>

        {/* Bottom Admin Nav — RTL order: الرئيسية | المحادثات | FAB | عناصر المتجر | المزيد */}
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-100 flex items-center justify-around z-40" dir="rtl">
          {/* الرئيسية */}
          <button onClick={() => { setAdminTab("admin_home"); setActiveSubMenu(null); }}
            className={`flex flex-col items-center gap-0.5 ${adminTab==="admin_home"?"text-[var(--brand)]":"text-gray-400"}`}>
            <Home size={22}/>
            <span className="text-[9px] font-medium">الرئيسية</span>
          </button>
          {/* المحادثات */}
          {hasAnyPermissionInModule("chat") && (
          <button onClick={() => { setAdminTab("chat"); setActiveSubMenu(null); }}
            className={`flex flex-col items-center gap-0.5 ${adminTab==="chat"?"text-[var(--brand)]":"text-gray-400"}`}>
            <MessageSquare size={22}/>
            <span className="text-[9px] font-medium">المحادثات</span>
          </button>
          )}
          {/* FAB */}
          <button onClick={() => setActiveSubMenu(activeSubMenu==="fab_open"?null:"fab_open")}
            className="relative -top-4 w-14 h-14 bg-red-500 text-white rounded-full shadow-lg shadow-red-300 flex items-center justify-center active:scale-95 transition-all">
            <Plus size={28} className={`transition-transform duration-200 ${activeSubMenu==="fab_open"?"rotate-45":""}`}/>
          </button>
          {/* عناصر المتجر الحالية */}
          {hasAnyPermissionInModule("elements") && (
          <button onClick={() => { setAdminTab("elements"); setActiveSubMenu(null); }}
            className={`flex flex-col items-center gap-0.5 ${adminTab==="elements"?"text-[var(--brand)]":"text-gray-400"}`}>
            <LayoutGrid size={22}/>
            <span className="text-[9px] font-medium">عناصر المتجر</span>
          </button>
          )}
          {/* المزيد */}
          <button onClick={() => { setAdminTab("more"); setActiveSubMenu(null); }}
            className={`flex flex-col items-center gap-0.5 ${adminTab==="more"?"text-[var(--brand)]":"text-gray-400"}`}>
            <Menu size={22}/>
            <span className="text-[9px] font-medium">المزيد</span>
          </button>
        </nav>
      </div>
    );
}
