import React from "react";
import {
  LayoutGrid, Image as ImageIcon, Ticket, Wallet, ArrowRight, Pencil, Trash2, X,
  GripVertical, Info, PackageSearch, FolderTree, Boxes, CheckCircle2,
  Loader2, ChevronLeft, ChevronDown, AlertTriangle, Plus, History, User as UserIcon,
  EyeOff, Eye, Upload, Sparkles, Copy, Save, ImageOff,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { showToast } from "../components/ToastContainer";
import AdminImageUpload from "../components/AdminImageUpload";
import OptimizedImage from "../components/OptimizedImage";
import { ensureDefaultFields, DEFAULT_FIELD_KEYS, ensurePaymentMethodDefaultFields } from "../utils/defaultFields";
import InventoryManagerModal from "../components/InventoryManagerModal";
import { uploadImage } from "../utils/uploadImage";
import { StoreTypePickerField } from "../components/StoreTypePickerField";
import { showConfirm } from "../components/CustomDialogContainer";
import NameVerificationFields, { NameVerificationValue } from "../components/NameVerificationFields";
import MoreDetailsSection from "../components/MoreDetailsSection";
import FieldKeyboardTypePicker, { FieldKeyboardType } from "../components/FieldKeyboardTypePicker";
import ProductCheckoutPreview from "../components/ProductCheckoutPreview";
import { useStoreAppearance, gridColsClass } from "../utils/useStoreAppearance";

// ── Pixel Morph Spinner (مطابق للصفحة الرئيسية) ─────────────────────────────
const pixelMorphStyles = `
  @keyframes adminPixMorph {
    0%, 100% { transform: scale(1); opacity: 1; border-radius: 2px; }
    40%       { transform: scale(0.2); opacity: 0.2; border-radius: 50%; }
    70%       { transform: scale(1.2); opacity: 0.9; border-radius: 3px; }
  }
  .admin-spinner-pixel {
    display: grid;
    grid-template-columns: repeat(5, 12px);
    grid-template-rows: repeat(5, 12px);
    gap: 2px;
  }
  .admin-px {
    width: 12px;
    height: 12px;
    border-radius: 2px;
    background-color: var(--admin-c1);
    animation: adminPixMorph 2.4s ease-in-out infinite;
  }
  .admin-px:nth-child(3n)  { background-color: var(--admin-c2); animation-delay: 0.2s; }
  .admin-px:nth-child(5n)  { background-color: var(--admin-c3); animation-delay: 0.5s; }
  .admin-px:nth-child(7n)  { animation-delay: 0.8s; }
  .admin-px:nth-child(11n) { animation-delay: 1.1s; }
`;

function PixelMorphSpinner() {
  React.useEffect(() => {
    const hexToHsl = (hex: string): [number, number, number] | null => {
      const clean = hex.replace("#", "").trim();
      if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
      const r = parseInt(clean.slice(0, 2), 16) / 255;
      const g = parseInt(clean.slice(2, 4), 16) / 255;
      const b = parseInt(clean.slice(4, 6), 16) / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, s = 0;
      const l = (max + min) / 2;
      const d = max - min;
      if (d !== 0) {
        s = d / (1 - Math.abs(2 * l - 1));
        switch (max) {
          case r: h = 60 * (((g - b) / d) % 6); break;
          case g: h = 60 * ((b - r) / d + 2); break;
          case b: h = 60 * ((r - g) / d + 4); break;
        }
      }
      if (h < 0) h += 360;
      return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
    };

    const applyFromBrand = () => {
      const root = document.documentElement;
      const brand = getComputedStyle(root).getPropertyValue("--brand").trim() || "#000000";
      const hsl = hexToHsl(brand);
      if (!hsl) {
        root.style.setProperty("--admin-c1", "hsl(0, 0%, 75%)");
        root.style.setProperty("--admin-c2", "hsl(0, 0%, 45%)");
        root.style.setProperty("--admin-c3", "hsl(0, 0%, 20%)");
        return;
      }
      const [h, s] = hsl;
      root.style.setProperty("--admin-c1", `hsl(${h}, ${s}%, 75%)`);
      root.style.setProperty("--admin-c2", `hsl(${h}, ${s}%, 50%)`);
      root.style.setProperty("--admin-c3", `hsl(${h}, ${s}%, 30%)`);
    };

    applyFromBrand();
    const observer = new MutationObserver(applyFromBrand);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <style>{pixelMorphStyles}</style>
      <div className="admin-spinner-pixel">
        {Array.from({ length: 25 }).map((_, i) => (
          <div key={i} className="admin-px" />
        ))}
      </div>
    </>
  );
}

// ── Overlay spinner يظهر فوق المحتوى الحالي بخلفية ضبابية ───────────────────
// وسم "مُعدَّل حديثاً" — يظهر إن كان آخر تعديل خلال 24 ساعة
const isRecentlyModified = (updatedAt?: string | null) => {
  if (!updatedAt) return false;
  const t = new Date(updatedAt).getTime();
  if (isNaN(t)) return false;
  return Date.now() - t < 24 * 60 * 60 * 1000;
};

// تحقق تلقائي بسيط من صحة رابط الصورة (امتداد صورة معروف أو نطاق مضيف صور شائع)
const isLikelyImageUrl = (url: string) => {
  if (!url || !/^https?:\/\//i.test(url)) return false;
  return /\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i.test(url) || /images|imgur|cloudinary|res\.cloudinary|ibb\.co|githubusercontent/i.test(url);
};

const StoreLoadingOverlay = () => (
  <AnimatePresence>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl backdrop-blur-sm bg-white/65 dark:bg-black/65"
    >
      <PixelMorphSpinner />
    </motion.div>
  </AnimatePresence>
);

// [PROVIDER-PRODUCTS] المحرر الشامل للمنتج يمكن فتحه من خارج الصفحة (مثلاً من تبويب المزودين)
// عبر ref يكشف openProductEditor. وضع editorOnly يخفي واجهة الصفحة كلها ويُبقي نافذة التعديل فقط.
export type AdminElementsPageHandle = { openProductEditor: (item: any) => Promise<void> };
const AdminElementsPage = React.forwardRef<AdminElementsPageHandle, any>(({categories, subcategories, subSubCategories, fetchCategories, fetchSubcategories, fetchSubSubCategories, paymentMethods, fetchPaymentMethods, banners, fetchBanners, offers, fetchOffers, handleDelete, handleToggleActive, adminFetch, focusTarget, clearFocusTarget, editorOnly, onProductSaved}: any, ref) => {
  const [editingItem, setEditingItem] = React.useState<any>(null);
  // معاينة حيّة للمنتج قبل الحفظ
  const [showLivePreview, setShowLivePreview] = React.useState(false);
  // مؤشر جاري حفظ المسودة (لتفادي نقرات مزدوجة)
  const [savingDraft, setSavingDraft] = React.useState(false);
  // [FIX] رمز جلسة تعديل يتغيّر مع كل فتح/إغلاق لنافذة التعديل — يُستخدم لمنع نتيجة رفع صورة
  // متأخرة (وصلت بعد أن أغلق الأدمن المنتج الحالي وفتح منتجاً آخر) من الالتصاق بمنتج غير صحيح
  const editSessionRef = React.useRef(0);
  const setEditingItemSession = (item: any) => { editSessionRef.current += 1; setEditingItem(item); setShowLivePreview(false); };
  // منتج من نوع "باقات" (Bundle): يُخفي حقول الكمية بالكامل ويعرض رسالة الباقة فقط
  const isBundleStoreType = (item: any): boolean => {
    return item?.store_type === "packages" ||
      (Array.isArray(item?.packages_data) && item.packages_data.length > 0) ||
      (Array.isArray(item?.qty_values) && item.qty_values.length > 0);
  };
  const supplierMinQtyEl = (item: any): number | null => {
    const v = parseFloat(item?.supplier_min_quantity ?? item?.min_quantity);
    return isNaN(v) ? null : v;
  };
  const supplierMaxQtyEl = (item: any): number | null => {
    const v = parseFloat(item?.supplier_max_quantity ?? item?.max_quantity);
    return isNaN(v) ? null : v;
  };
  const clampQtyEl = (val: string, item: any): string => {
    const n = parseFloat(val);
    if (isNaN(n)) return val;
    const min = supplierMinQtyEl(item);
    const max = supplierMaxQtyEl(item);
    let clamped = n;
    if (min != null && clamped < min) clamped = min;
    if (max != null && clamped > max) clamped = max;
    return String(clamped);
  };
  // تحقق صارم: يمنع حفظ أي كمية خارج النطاق [الحد الأدنى، الحد الأقصى] للمورد
  const validateQtyStrict = (item: any): string | null => {
    if (!item || isBundleStoreType(item)) return null;
    const min = supplierMinQtyEl(item);
    const max = supplierMaxQtyEl(item);
    const checkOne = (raw?: any) => {
      if (raw === undefined || raw === null || raw === "") return null;
      const n = parseFloat(raw);
      if (isNaN(n)) return "قيمة الكمية غير صالحة";
      if (min != null && n < min) return `الكمية يجب ألا تقل عن الحد الأدنى للمورد (${min})`;
      if (max != null && n > max) return `الكمية يجب ألا تتجاوز الحد الأقصى للمورد (${max})`;
      return null;
    };
    return checkOne(item.min_quantity) || checkOne(item.max_quantity);
  };
  const [editPackageValueInput, setEditPackageValueInput] = React.useState("");
  const [showInventoryPicker, setShowInventoryPicker] = React.useState(false);
  // مجموعات المخزون تُستخدم فقط لعرض اسم/تفاصيل المجموعة المرتبطة بالمنتج قيد التعديل
  const [inventoryGroups, setInventoryGroups] = React.useState<any[]>([]);

  const loadInventoryGroups = React.useCallback(async () => {
    try {
      const res = await adminFetch("/api/admin/inventory/groups");
      const data = await res.json();
      setInventoryGroups(Array.isArray(data) ? data : []);
    } catch { setInventoryGroups([]); }
  }, [adminFetch]);

  const linkGroupToProduct = (group: any) => {
    setEditingItem((prev: any) => ({ ...prev, inventory_group_id: group.id }));
    setShowInventoryPicker(false);
  };

  // ملاحظة: لم يعد "إجراء سريع" ← "المخزون" يتنقّل لهذه الصفحة إطلاقاً.
  // أصبح يفتح مودال المخزون الموحّد مباشرة فوق الشاشة الحالية (انظر AdminPage.tsx).
  const [editingType, setEditingType] = React.useState<string>("");
  const [editCustomFields, setEditCustomFields] = React.useState<Array<{id: string; label: string; required: boolean}>>([]);
  const [availableCurrencies, setAvailableCurrencies] = React.useState<Array<{ id: number; name: string; symbol: string; exchange_rate: number; is_default?: boolean }>>([]);
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = React.useState(false);
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
  const currenciesForSelectedMethodType = editingItem?.method_type === "syriatel"
    ? availableCurrencies.filter(isSypCurrency)
    : (editingItem?.method_type === "shamcash" || editingItem?.method_type === "binance")
    ? [USD_BASE_CURRENCY, ...availableCurrencies.filter(c => isSypCurrency(c) || isUsdCurrency(c))]
    : (editingItem?.method_type === "crypto_usdt_trc20" || editingItem?.method_type === "crypto_usdt_bep20")
    ? [USD_BASE_CURRENCY, ...availableCurrencies.filter(isUsdCurrency)]
    : editingItem?.method_type === "manual"
    ? [USD_BASE_CURRENCY, ...availableCurrencies]
    : availableCurrencies;
  const [elementsSubTab, setElementsSubTab] = React.useState<string>("");
  const [elementsType, setElementsType] = React.useState<string>("");
  const [allElements, setAllElements] = React.useState<any[]>([]);
  const [loadingElements, setLoadingElements] = React.useState(false);
  const [allSubcats, setAllSubcats] = React.useState<any[]>([]);
  const [allSubSubs, setAllSubSubs] = React.useState<any[]>([]);
  const [showVoucherLogs, setShowVoucherLogs] = React.useState(false);
  const [voucherLogsLoading, setVoucherLogsLoading] = React.useState(false);
  const [voucherLogsData, setVoucherLogsData] = React.useState<{ voucher: any; uses: any[] } | null>(null);

  // Hierarchical navigation state
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<number|null>(null);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = React.useState<number|null>(null);
  const [selectedSubSubId, setSelectedSubSubId] = React.useState<number|null>(null);
  const [storeView, setStoreView] = React.useState<"categories"|"subcategories"|"subsubcategories"|"products">("categories");
  const [storeSubcats, setStoreSubcats] = React.useState<any[]>([]);
  const [storeSubSubs, setStoreSubSubs] = React.useState<any[]>([]);
  const [storeProducts, setStoreProducts] = React.useState<any[]>([]);
  const [allProducts, setAllProducts] = React.useState<any[]>([]);
  const [storeLoading, setStoreLoading] = React.useState(false);
  const [directSubcatProducts, setDirectSubcatProducts] = React.useState<any[]>([]);
  const [directCategoryProducts, setDirectCategoryProducts] = React.useState<any[]>([]);

  // إعدادات مظهر المتجر (نفس المصدر المستخدم في واجهة المستخدم) لتطبيق عدد الأعمدة المطابق
  const { appearance } = useStoreAppearance();
  const catGridCls = gridColsClass(appearance.cat_columns_mobile, appearance.cat_columns_desktop);
  const subGridCls = gridColsClass(appearance.sub_columns_mobile, appearance.sub_columns_desktop);
  const subsubGridCls = gridColsClass(appearance.subsub_columns_mobile, appearance.subsub_columns_desktop);
  // [FIX] عدد أعمدة بطاقات المنتجات المدمجة كان يعتمد على إعداد الأقسام الفرعية/الفرع-فرعية (subGridCls/subsubGridCls)
  // فقط لأن البطاقات تتشارك نفس الشبكة. الآن نضيف مصدر مستقل (prod_columns_*) بحال أراد الأدمن
  // التحكم بعدد أعمدة المنتجات بمعزل، لكن الشبكة المدمجة (منتجات + أقسام فرعية معاً) تبقى موحّدة
  // بعدد أعمدة واحد كي لا تتكسّر المحاذاة — لذلك نستخدم subGridCls/subsubGridCls للشبكة المدمجة نفسها،
  // ونُبقي prodGridCls جاهزة لأي عرض مستقل للمنتجات فقط مستقبلاً.
  const prodGridCls = gridColsClass(appearance.prod_columns_mobile, appearance.prod_columns_desktop);

  // ── State: نافذة اختيار القسم (زر بدل القائمة المنسدلة) ────────────────
  const [showCatPickerModal, setShowCatPickerModal] = React.useState(false);
  // mode يحدد عدد الخطوات المطلوبة: "category" لقسم رئيسي فقط، "subcategory" لقسم فرعي (مع رئيسي)، "full" لقسم فرعي + فرع فرعي اختياري
  const [catPickerMode, setCatPickerMode] = React.useState<"category"|"subcategory"|"full">("category");
  const [catPickerStep, setCatPickerStep] = React.useState<"category"|"askSub"|"subcategory"|"askSubSub"|"subSubCategory">("category");
  const [catPickerSelectedCatId, setCatPickerSelectedCatId] = React.useState<string>("");
  const [catPickerSelectedSubId, setCatPickerSelectedSubId] = React.useState<string>("");
  const [catPickerSelectedSubSubId, setCatPickerSelectedSubSubId] = React.useState<string>("");

  // Reorder modal state
  const [reorderMode, setReorderMode] = React.useState(false);
  const [reorderItems, setReorderItems] = React.useState<any[]>([]);
  const [dragIndex, setDragIndex] = React.useState<number|null>(null);
  const [dragOverIndex, setDragOverIndex] = React.useState<number|null>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const adminRoutes = new Set(["/api/admin/products-all", "/api/admin/vouchers"]);

  React.useEffect(() => {
    fetch("/api/subcategories").then(r=>r.json()).then(setAllSubcats).catch(()=>{});
    fetch("/api/sub-sub-categories").then(r=>r.json()).then(setAllSubSubs).catch(()=>{});
  }, []);

  React.useEffect(() => {
    if (editingType === "paymentMethods" && editingItem && availableCurrencies.length === 0) {
      adminFetch("/api/admin/currencies")
        .then(r => r.json())
        .then(d => setAvailableCurrencies(Array.isArray(d?.currencies) ? d.currencies : []))
        .catch(() => showToast("تعذّر تحميل قائمة العملات", "error"));
    }
  }, [editingType, editingItem]);

  const loadElements = async (type: string) => {
    setLoadingElements(true); setAllElements([]);
    const map: Record<string,string> = { categories:"/api/categories?admin=1", subcategories:"/api/subcategories?admin=1", subSubCategories:"/api/sub-sub-categories?admin=1", products:"/api/admin/products-all", paymentMethods:"/api/payment-methods?admin=1", banners:"/api/banners?admin=1", offers:"/api/offers?admin=1", vouchers:"/api/admin/vouchers" };
    const url = map[type];
    try {
      const res = adminRoutes.has(url) ? await adminFetch(url) : await fetch(url);
      const data = await res.json();
      setAllElements(Array.isArray(data)?data:[]);
    } catch { setAllElements([]); }
    setLoadingElements(false);
  };

  const loadVoucherLogs = async (voucherId: number | string) => {
    setShowVoucherLogs(true);
    setVoucherLogsLoading(true);
    setVoucherLogsData(null);
    try {
      const res = await adminFetch(`/api/admin/vouchers/${voucherId}/uses`);
      const data = await res.json();
      if (res.ok) setVoucherLogsData(data);
      else { showToast(data?.error || "تعذّر تحميل السجلات", "error"); setShowVoucherLogs(false); }
    } catch { showToast("تعذّر تحميل السجلات", "error"); setShowVoucherLogs(false); }
    setVoucherLogsLoading(false);
  };

  const handleSaveEdit = async (confirmCurrencyChange = false, saveAsDraft = false) => {
    if (!editingItem || !editingType) return;
    const epMap: Record<string,string> = { categories:"categories", subcategories:"subcategories", subSubCategories:"sub-sub-categories", products:"products", paymentMethods:"payment-methods", banners:"banners", offers:"offers", vouchers:"vouchers" };
    let payload: any = editingItem;
    if (saveAsDraft) setSavingDraft(true);
    if (editingType === "products" || editingType === "paymentMethods") {
      // [NAME VERIFICATION] إلزامي اختيار خانة معرف واحدة على الأقل عند تفعيل التحقق من الاسم
      if (editingType === "products" && editingItem.name_verification_enabled && (!editingItem.name_verification_source_field_ids || editingItem.name_verification_source_field_ids.length === 0)) {
        showToast("يرجى اختيار خانة واحدة على الأقل تحتوي على معرف اللاعب لتفعيل التحقق من الاسم", "error");
        return;
      }
      const nvSourceIds = new Set(editingItem.name_verification_source_field_ids || []);
      const defaults = editCustomFields.filter(f => f.isDefault).map(f => ({...f, label: f.label.trim() || f.label}));
      const customs = editCustomFields.filter(f => !f.isDefault && f.label.trim().length > 0);
      const merged = [...defaults, ...customs].map(f => nvSourceIds.has(f.id) ? { ...f, nvSource: true } : f);
      payload = { ...editingItem, custom_fields: merged.length > 0 ? JSON.stringify(merged) : null };
      delete payload.name_verification_source_field_ids;
      if (editingType === "products" && editingItem.store_type === "gallery") {
        if (Array.isArray(editingItem.image_urls) && (editingItem.image_urls.length < 3 || editingItem.image_urls.length > 5)) {
          showToast("يرجى رفع من 3 إلى 5 صور لمتجر الصور", "error");
          return;
        }
        payload.image_urls = JSON.stringify(editingItem.image_urls || []);
        if (!payload.image_url) payload.image_url = (editingItem.image_urls || [])[0] || "";
      } else if (editingType === "products") {
        delete payload.image_urls;
      }
      if (editingType === "products" && editingItem.store_type === "inventory" && (!editingItem.inventory_group_id)) {
        showToast("يرجى ربط مجموعة مخزون قبل الحفظ", "error");
        return;
      }
      if (editingType === "paymentMethods") {
        // "usd" هو رمز العملة الافتراضية المحلي فقط (لا يقابل صفاً حقيقياً في جدول currencies) — يجب تحويله إلى null قبل الإرسال
        payload.currency_id = editingItem.currency_id === "usd" ? null : (editingItem.currency_id || null);
        if (confirmCurrencyChange) payload.confirm_currency_change = true;
        payload.min_amount = payload.min_amount === "" || payload.min_amount === undefined || payload.min_amount === null ? 0 : Number(payload.min_amount) || 0;
        // [EDIT PARITY] نفس تحقق نسبة العمولة/البونص الموجود في نموذج الإضافة (handleAddPaymentMethod)
        if (editingItem.bonus_type && (!editingItem.bonus_percent || parseFloat(editingItem.bonus_percent) <= 0 || parseFloat(editingItem.bonus_percent) > 100)) {
          showToast("يرجى إدخال نسبة مئوية صحيحة (بين 0 و100) للعمولة/البونص", "error");
          return;
        }
        payload.bonus_type = editingItem.bonus_type || null;
        payload.bonus_percent = editingItem.bonus_type ? editingItem.bonus_percent : null;
        payload.bonus_visible = editingItem.bonus_type ? editingItem.bonus_visible !== false : true;
      }
      if (editingType === "products" && editingItem.store_type === "specificPackage") {
        payload.package_values = JSON.stringify(
          (Array.isArray(editingItem.package_values) ? editingItem.package_values : []).map((v: any) => parseFloat(v)).filter((v: number) => !isNaN(v))
        );
      } else if (editingType === "products") {
        delete payload.package_values;
      }
      if (editingType === "products" && editingItem.store_type === "packages") {
        const validPackages = (Array.isArray(editingItem.packages_data) ? editingItem.packages_data : [])
          .filter((p: any) => p.label && String(p.label).trim() && p.price !== "" && !isNaN(parseFloat(p.price)));
        if (validPackages.length === 0) {
          showToast("يرجى إضافة باقة واحدة على الأقل لمتجر الباقات", "error");
          return;
        }
        payload.packages_data = JSON.stringify(
          validPackages.map((p: any) => ({ label: String(p.label).trim(), price: parseFloat(p.price) }))
        );
        payload.price = String(parseFloat(validPackages[0].price));
      } else if (editingType === "products") {
        delete payload.packages_data;
      }
      if (editingType === "products") {
        const qtyErr = validateQtyStrict(editingItem);
        if (qtyErr) {
          showToast(qtyErr, "error");
          return;
        }
      }
      if (editingType === "products" && payload.min_quantity !== undefined && payload.min_quantity !== "") {
        payload.min_quantity = parseFloat(payload.min_quantity);
      }
      if (editingType === "products" && payload.max_quantity !== undefined && payload.max_quantity !== "") {
        payload.max_quantity = parseFloat(payload.max_quantity);
      }
      if (editingType === "products" && editingItem.store_type === "external_api") {
        payload.markup_type = editingItem.markup_type || "percent";
        payload.markup_value = payload.markup_value !== undefined && payload.markup_value !== "" ? parseFloat(payload.markup_value) : null;
      } else if (editingType === "products") {
        delete payload.markup_type;
        delete payload.markup_value;
      }
    }
    if (editingType === "products" && saveAsDraft) {
      payload = { ...payload, available: false };
    }
    if (editingType === "vouchers") {
      payload = {
        ...editingItem,
        amount: payload.amount === "" || payload.amount === undefined || payload.amount === null ? 0 : Number(payload.amount) || 0,
        max_uses: payload.max_uses === "" || payload.max_uses === undefined || payload.max_uses === null ? 1 : Number(payload.max_uses) || 1,
      };
    }
    // [FIX] عدم وجود editingItem.id يعني أن هذا عنصر جديد (إضافة) وليس تعديلاً — كان الكود
    // سابقاً يرسل PATCH دائماً إلى `/api/admin/{type}/undefined` حتى عند الإضافة، فيفشل الخادم
    // (404/400) ولا يُضاف أي عرض/بانر/عنصر جديد إطلاقاً. الآن: إن لم يوجد id نُرسل POST لإنشاء
    // عنصر جديد بدل PATCH.
    const isNew = editingItem.id === undefined || editingItem.id === null;
    const endpoint = isNew ? `/api/admin/${epMap[editingType]}` : `/api/admin/${epMap[editingType]}/${editingItem.id}`;
    try {
      const res = await adminFetch(endpoint, { method: isNew ? "POST" : "PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) });
      if (res.ok) {
        showToast(saveAsDraft ? "تم حفظ المسودة (غير مُفعّل للعملاء)" : (isNew ? "تمت الإضافة" : "تم التعديل"), 'success');
        setEditingItemSession(null); setEditingType(""); setEditCustomFields([]);
        if (editingType === "categories") { fetchCategories(); }
        if (editingType === "subcategories") { fetchSubcategories(); if (selectedCategoryId) loadSubcats(selectedCategoryId); }
        if (editingType === "subSubCategories") { fetchSubSubCategories(); if (selectedSubcategoryId) loadSubSubs(selectedSubcategoryId); }
        if (editingType === "products") {
          if (onProductSaved) onProductSaved();
          if (selectedSubSubId) loadProductsForSubSub(selectedSubSubId, true);
          else if (selectedSubcategoryId) loadProductsForSubcatView(selectedSubcategoryId, true);
        }
        loadElements(elementsType);
        fetchCategories(); fetchSubcategories(); fetchSubSubCategories(); fetchPaymentMethods(); fetchBanners(); fetchOffers();
      } else {
        const d = await res.json();
        // تنبيه تغيير عملة طريقة الدفع بينما هناك عمليات قيد التحقق — نطلب تأكيداً صريحاً من الأدمن بدل الفشل الصامت
        if (res.status === 409 && d?.requires_confirmation && !confirmCurrencyChange) {
          showConfirm(d.error || "هناك عمليات قيد التحقق قد تتأثر بتغيير عملة المحفظة. هل تريد المتابعة؟", "تأكيد التغيير", () => {
            handleSaveEdit(true);
          }, true);
          return;
        }
        showToast("فشل: "+(d.error||""), 'error');
      }
    } catch { showToast("خطأ في الاتصال", 'error'); }
    finally { setSavingDraft(false); }
  };

  // نسخ منتج موجود كقالب جديد (بدون id) — يفتح نافذة إضافة معبّأة بنفس البيانات
  const duplicateProductAsTemplate = (item: any) => {
    let parsedImageUrls: string[] = [];
    try {
      const raw = item.image_urls;
      const p = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : [];
      parsedImageUrls = Array.isArray(p) ? p : [];
    } catch { parsedImageUrls = []; }
    const clone = { ...item, id: undefined, name: item.name ? `${item.name} (نسخة)` : "", image_urls: parsedImageUrls };
    try {
      const parsed = item.custom_fields
        ? (typeof item.custom_fields === "string" ? JSON.parse(item.custom_fields) : item.custom_fields)
        : [];
      const fields = Array.isArray(parsed) ? parsed : [];
      const ensured = ensureDefaultFields(item.store_type || "normal", fields);
      setEditCustomFields(ensured);
      setEditingItemSession({ ...clone, name_verification_source_field_ids: ensured.filter((f: any) => f.nvSource).map((f: any) => f.id) });
    } catch {
      setEditCustomFields(ensureDefaultFields(item.store_type || "normal", []));
      setEditingItemSession(clone);
    }
    setEditingType("products");
    showToast("تم نسخ المنتج كقالب — عدّل ما تريد ثم احفظ", "success");
  };

  // فتح نافذة اختيار القسم بدل القائمة المنسدلة، حسب نوع العنصر الجاري تعديله
  const openCatPickerForEdit = () => {
    if (!editingItem) return;
    if (editingType === "subcategories") {
      setCatPickerMode("category");
      setCatPickerStep("category");
      setCatPickerSelectedCatId(editingItem.category_id ? String(editingItem.category_id) : "");
      setCatPickerSelectedSubId("");
      setCatPickerSelectedSubSubId("");
    } else if (editingType === "subSubCategories") {
      const curSub = editingItem.subcategory_id ? allSubcats.find((s:any) => String(s.id) === String(editingItem.subcategory_id)) : null;
      setCatPickerMode("subcategory");
      setCatPickerStep("category");
      setCatPickerSelectedCatId(curSub ? String(curSub.category_id) : "");
      setCatPickerSelectedSubId(editingItem.subcategory_id ? String(editingItem.subcategory_id) : "");
      setCatPickerSelectedSubSubId("");
    } else if (editingType === "products") {
      const curSub = editingItem.subcategory_id ? allSubcats.find((s:any) => String(s.id) === String(editingItem.subcategory_id)) : null;
      setCatPickerMode("full");
      setCatPickerStep("category");
      setCatPickerSelectedCatId(curSub ? String(curSub.category_id) : (editingItem.category_id ? String(editingItem.category_id) : ""));
      setCatPickerSelectedSubId(editingItem.subcategory_id ? String(editingItem.subcategory_id) : "");
      setCatPickerSelectedSubSubId(editingItem.sub_sub_category_id ? String(editingItem.sub_sub_category_id) : "");
    }
    setShowCatPickerModal(true);
  };

  // تأكيد اختيار قسم رئيسي فقط (subcategories edit)
  const confirmCatPickerCategoryOnly = (catId: string) => {
    setEditingItem({ ...editingItem, category_id: catId });
    setShowCatPickerModal(false);
  };

  // تأكيد اختيار قسم فرعي (subSubCategories edit): نحتاج فقط subcategory_id
  const confirmCatPickerSubcategoryOnly = (subId: string) => {
    setEditingItem({ ...editingItem, subcategory_id: subId });
    setShowCatPickerModal(false);
  };

  // تأكيد اختيار للمنتجات: قسم فرعي + فرع فرعي اختياري
  const confirmCatPickerFull = (subId: string, subSubId: string) => {
    setEditingItem({ ...editingItem, category_id: null, subcategory_id: subId, sub_sub_category_id: subSubId || null });
    setShowCatPickerModal(false);
  };

  // تأكيد اختيار للمنتجات: قسم رئيسي مباشرة (بدون قسم فرعي) — يخضع لنفس نظام الترتيب وعدد الأعمدة
  const confirmCatPickerCategoryDirect = (catId: string) => {
    setEditingItem({ ...editingItem, category_id: catId, subcategory_id: null, sub_sub_category_id: null });
    setShowCatPickerModal(false);
  };

  const delMap: Record<string,string> = { categories:"categories", subcategories:"subcategories", subSubCategories:"sub-sub-categories", products:"products", paymentMethods:"payment-methods", banners:"banners", offers:"offers", vouchers:"vouchers" };

  // ─── Reorder helpers ────────────────────────────────────────────────────────

  // [FIX] الترتيب كان يتجاهل المنتجات المدمجة (direct products) الظاهرة جنبًا إلى جنب مع
  // بطاقات الأقسام الفرعية/الفرع-فرعية — فيعيد ترتيب الأقسام فقط دون المنتجات المعروضة معها،
  // رغم أنها تظهر في نفس الشبكة بصريًا. الآن نضم النوعين معًا في نفس مصفوفة الترتيب،
  // ونعلّم كل عنصر بنوعه (__reorderType) ليُحفظ لاحقًا في الجدول الصحيح دون خلط الترتيب الحالي
  // لأي جدول آخر بالخطأ.
  // [FIX] العرض العادي (خارج وضع الترتيب) كان يرسم المنتجات دائمًا أولاً ثم الأقسام الفرعية
  // بشكل ثابت بغض النظر عن order_index الفعلي لكل عنصر — فحتى لو رتّب الأدمن قسمًا فرعيًا
  // ليظهر قبل منتج معيّن وحُفظ الترتيب بنجاح في القاعدة، كانت الواجهة تتجاهل ذلك وتُظهر كل
  // المنتجات أولًا دومًا. الحل: دمج القائمتين ثم الترتيب معًا حسب order_index (والـ id كحسم
  // تعادل) بدل تسلسلهما الثابت، لتعكس الواجهة نفس الترتيب المختلط الذي اختاره الأدمن فعليًا.
  // [FIX] عند التعادل في order_index (عناصر لم تُرتَّب يدويًا بعد، قيمتها الافتراضية 0
  // للنوعين معًا)، كان الفرز يحسم التعادل بالـ id الخام فقط، فيتوزع المنتجات والأقسام
  // بشكل عشوائي غير متوقع بدل ترتيب منطقي (زمن الإضافة). نستخدم created_at إن وُجد
  // كحسم أول للتعادل (الأقدم أولاً)، ثم id كحل أخير إن لم يتوفر created_at إطلاقًا.
  // [FIX-2] كان حسم التعادل هنا يعتمد أولاً على created_at، بينما كل نقاط جلب البيانات في
  // الخادم (وشاشة إعادة الترتيب بعد الحفظ) تحسم التعادل بـ id تصاعدياً فقط — هذا التضارب بين
  // منطق العرض في الواجهة الأمامية ومنطق الترتيب في الخادم هو ما كان يجعل "عناصر المتجر"
  // وشاشة "إعادة الترتيب" تُظهر ترتيباً مختلفاً عمّا حفظه الأدمن فعلياً (وعمّا يظهر بشكل صحيح
  // بواجهة المتجر). توحيد الحسم على order_index ASC ثم id ASC في كل مكان يضمن تطابق الترتيب
  // المعروض دائماً مع الترتيب المحفوظ، ولا يتغير من تلقاء نفسه إطلاقاً.
  const mergeByOrderIndex = (a: any[], b: any[]): any[] => {
    return [...a, ...b].sort((x: any, y: any) => {
      const ox = Number(x?.order_index) || 0;
      const oy = Number(y?.order_index) || 0;
      if (ox !== oy) return ox - oy;
      return (Number(x?.id) || 0) - (Number(y?.id) || 0);
    });
  };

  const getCurrentLevelItems = (): any[] => {
    if (elementsSubTab === "payments_tab") return allElements.map((it: any) => ({ ...it, __reorderType: "paymentMethods" }));
    if (storeView === "categories") return (categories || []).map((it: any) => ({ ...it, __reorderType: "categories" }));
    if (storeView === "subcategories") {
      return mergeByOrderIndex(
        directCategoryProducts.map((it: any) => ({ ...it, __reorderType: "products" })),
        storeSubcats.map((it: any) => ({ ...it, __reorderType: "subcategories" }))
      );
    }
    if (storeView === "subsubcategories") {
      return mergeByOrderIndex(
        directSubcatProducts.map((it: any) => ({ ...it, __reorderType: "products" })),
        storeSubSubs.map((it: any) => ({ ...it, __reorderType: "subsubcategories" }))
      );
    }
    return storeProducts.map((it: any) => ({ ...it, __reorderType: "products" }));
  };

  // عدد أعمدة شبكة الترتيب (مطابق تمامًا لعدد أعمدة الشبكة المعروضة فعليًا لنفس المستوى،
  // كي لا تختلف المحاذاة بين وضع العرض العادي ووضع إعادة الترتيب)
  const reorderGridCls =
    elementsSubTab === "payments_tab" ? "grid-cols-4" :
    storeView === "categories" ? catGridCls :
    storeView === "subcategories" ? subGridCls :
    storeView === "subsubcategories" ? subsubGridCls :
    prodGridCls;

  const openReorderModal = () => {
    setReorderItems([...getCurrentLevelItems()]);
    setDragIndex(null);
    setDragOverIndex(null);
    setIsDragging(false);
    setReorderMode(true);
  };

  const closeReorderModal = () => {
    setReorderMode(false);
    setReorderItems([]);
    setDragIndex(null);
    setDragOverIndex(null);
    setIsDragging(false);
  };

  const reloadCurrentLevel = () => {
    if (elementsSubTab === "payments_tab") { loadElements("paymentMethods"); fetchPaymentMethods(); return; }
    if (storeView === "categories") { fetchCategories(); }
    else if (storeView === "subcategories") {
      if (selectedCategoryId) { loadSubcats(selectedCategoryId); loadProductsForCategoryDirect(selectedCategoryId, true); }
    }
    else if (storeView === "subsubcategories") {
      if (selectedSubcategoryId) { loadSubSubs(selectedSubcategoryId); loadProductsForSubcatView(selectedSubcategoryId, true); }
    }
    else if (storeView === "products") {
      if (selectedSubSubId) loadProductsForSubSub(selectedSubSubId, true);
      else if (selectedSubcategoryId) loadProductsForSubcatView(selectedSubcategoryId, true);
      else if (selectedCategoryId) loadProductsForCategoryDirect(selectedCategoryId, true);
    }
  };

  // فتح محرر المنتج (مستخدَم عند عرض منتجات القسم مدمجة مع بطاقات الأقسام الفرعية)
  const openProductEditorFor = async (item: any) => {
    let freshItem = item;
    try {
      const all = await ensureAllProducts(true);
      const found = all.find((p: any) => String(p.id) === String(item.id));
      if (found) freshItem = found;
    } catch { /* استخدام النسخة المحلية عند فشل الجلب */ }
    let parsedImageUrls: string[] = [];
    try {
      const raw = freshItem.image_urls;
      const p = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : [];
      parsedImageUrls = Array.isArray(p) ? p : [];
    } catch { parsedImageUrls = []; }
    let parsedPackagesData: { label: string; price: string }[] = [];
    try {
      const raw = freshItem.packages_data;
      const p = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : [];
      parsedPackagesData = Array.isArray(p) && p.length > 0
        ? p.map((x: any) => ({ label: String(x.label ?? ""), price: String(x.price ?? "") }))
        : [{ label: "", price: "" }];
    } catch { parsedPackagesData = [{ label: "", price: "" }]; }
    try {
      const parsed = freshItem.custom_fields
        ? (typeof freshItem.custom_fields === "string" ? JSON.parse(freshItem.custom_fields) : freshItem.custom_fields)
        : [];
      const fields = Array.isArray(parsed) ? parsed : [];
      const ensured = ensureDefaultFields(freshItem.store_type || "normal", fields);
      setEditCustomFields(ensured);
      setEditingItemSession({...freshItem, image_urls: parsedImageUrls, packages_data: parsedPackagesData, name_verification_source_field_ids: ensured.filter((f: any) => f.nvSource).map((f: any) => f.id)});
    } catch {
      setEditCustomFields(ensureDefaultFields(freshItem.store_type || "normal", []));
      setEditingItemSession({...freshItem, image_urls: parsedImageUrls, packages_data: parsedPackagesData});
    }
    setEditingType("products");
  };

  React.useImperativeHandle(ref, () => ({
    openProductEditor: async (item: any) => { await openProductEditorFor(item); },
  }));

  const loadProductsForCategoryDirect = async (catId: number, force = false) => {
    setStoreLoading(true);
    const all = await ensureAllProducts(force);
    const direct = all.filter((p: any) => String(p.category_id) === String(catId) && !p.subcategory_id);
    setDirectCategoryProducts(direct);
    setStoreProducts(direct);
    setStoreLoading(false);
  };

  const handleSaveReorder = async () => {
    const endpointMap: Record<string, string> = {
      categories: "categories",
      subcategories: "subcategories",
      subsubcategories: "sub-sub-categories",
      products: "products",
      paymentMethods: "payment-methods",
    };

    // [FIX] سابقًا كان order_index يُحسب بعدّاد منفصل *لكل نوع على حدة* (منتجات تبدأ من 0،
    // أقسام فرعية تبدأ من 0 أيضًا)، فكانت قيم النوعين تتصادم (0،1،2...) رغم أن ترتيبهما
    // البصري المختلط الفعلي مختلف — وعند العرض، التعادل بينهما كان يُحسم بفرز ثابت (منتجات
    // أولًا دومًا)، فيبدو الأمر وكأن المنتجات "تقفز" للبداية دائمًا مهما رتّب الأدمن.
    // الحل: استخدام موضع العنصر *العام* داخل reorderItems (ترتيبه المختلط الفعلي الذي
    // سحبه الأدمن) كقيمة order_index مباشرة، بحيث لا يتشارك عنصران من نوعين مختلفين نفس
    // الرقم أبدًا، ويُحفظ التسلسل المختلط (قسم، منتج، قسم، منتجين...) بدقّة في كل جدول.
    const itemsByType: Record<string, { id: any; order_index: number }[]> = {};
    reorderItems.forEach((item: any, globalIdx: number) => {
      const type = item.__reorderType || (elementsSubTab === "payments_tab" ? "paymentMethods" : storeView);
      if (!itemsByType[type]) itemsByType[type] = [];
      itemsByType[type].push({ id: item.id, order_index: globalIdx });
    });

    try {
      const requests = Object.entries(itemsByType).map(([type, items]) => {
        const endpoint = endpointMap[type];
        if (!endpoint) return Promise.resolve({ ok: true, __type: type } as any);
        return adminFetch(`/api/admin/reorder/${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        }).then(async (r: any) => {
          if (!r.ok) {
            let msg = "";
            try { const d = await r.json(); msg = d?.error || ""; } catch {}
            return { ok: false, __type: type, __error: msg };
          }
          return { ok: true, __type: type };
        });
      });
      const results = await Promise.all(requests);
      const failed = results.filter((r: any) => !r.ok);
      if (failed.length === 0) {
        showToast("تم حفظ الترتيب", "success");
        closeReorderModal();
        reloadCurrentLevel();
      } else {
        // [FIX] عند فشل نوع واحد فقط ضمن الترتيب المختلط (مثلاً: عمود order_index غير موجود
        // في جدول المنتجات بعد) — كانت الرسالة تقول "فشل حفظ الترتيب" فقط دون سبب واضح،
        // فيظن الأدمن أنه خطأ عابر ويعيد المحاولة دون جدوى. الآن نعرض السبب الحقيقي القادم
        // من الخادم (مثل نقص عمود order_index) بدل رسالة عامة مبهمة.
        const specificMsg = failed.find((f: any) => f.__error)?.__error;
        showToast(specificMsg || "فشل حفظ الترتيب", "error");
        // لا نغلق نافذة الترتيب ولا نعيد التحميل عند وجود فشل جزئي، حتى لا يفقد
        // الأدمن الترتيب الذي رتّبه للتو قبل معرفة السبب وإصلاحه
      }
    } catch {
      showToast("خطأ في الاتصال", "error");
    }
  };

  // ─── Drag-and-drop handlers (سلس بدون ارتداد) ─────────────────────────────

  const longPressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragActiveRef = React.useRef(false);
  const dragIndexRef = React.useRef<number | null>(null);
  const lastTouchMoveTime = React.useRef<number>(0);
  const lastSwapIndexRef = React.useRef<number | null>(null);
  const reorderGridRef = React.useRef<HTMLDivElement | null>(null);

  const reorderList = (from: number, to: number) => {
    if (from === to) return;
    setReorderItems(prev => {
      if (from < 0 || from >= prev.length || to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const clearLongPressTimer = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const startLongPress = (index: number) => {
    clearLongPressTimer();
    longPressTimer.current = setTimeout(() => {
      dragActiveRef.current = true;
      dragIndexRef.current = index;
      lastSwapIndexRef.current = index;
      setIsDragging(true);
      setDragIndex(index);
      setDragOverIndex(index);
      if (navigator.vibrate) { try { navigator.vibrate(15); } catch {} }
    }, 280);
  };

  const cancelDrag = () => {
    clearLongPressTimer();
    dragActiveRef.current = false;
    dragIndexRef.current = null;
    lastSwapIndexRef.current = null;
    setIsDragging(false);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleMouseDownCard = (index: number) => {
    startLongPress(index);
  };

  const handleMouseUpCard = () => {
    cancelDrag();
  };

  const handleMouseEnterCard = (index: number) => {
    if (!dragActiveRef.current || dragIndexRef.current === null) return;
    if (dragIndexRef.current === index) return;
    reorderList(dragIndexRef.current, index);
    dragIndexRef.current = index;
    lastSwapIndexRef.current = index;
    setDragIndex(index);
    setDragOverIndex(index);
  };

  const handleTouchStartCard = (index: number) => {
    startLongPress(index);
  };

  // [FIX] لم يعد onTouchMove مربوطاً عبر JSX (كان React يُسجّله passive فيفشل preventDefault
  // بصمت مع تحذير بالكونسول). الآن مُسجَّل native عبر useEffect أدناه بخيار passive:false.
  const handleTouchMoveCard = (e: TouchEvent) => {
    if (!dragActiveRef.current) return;
    e.preventDefault();
    // Throttle to ~60fps to prevent jitter
    const now = Date.now();
    if (now - lastTouchMoveTime.current < 16) return;
    lastTouchMoveTime.current = now;

    const touch = e.touches[0];
    if (!touch) return;
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const cardEl = el?.closest("[data-reorder-index]") as HTMLElement | null;
    if (cardEl) {
      const idx = Number(cardEl.getAttribute("data-reorder-index"));
      if (!Number.isNaN(idx) && dragIndexRef.current !== null && idx !== dragIndexRef.current) {
        reorderList(dragIndexRef.current, idx);
        dragIndexRef.current = idx;
        lastSwapIndexRef.current = idx;
        setDragIndex(idx);
        setDragOverIndex(idx);
      }
    }
  };

  // [FIX] مستمع touchmove أصلي غير-passive مربوط بحاوية الشبكة بالكامل بدل كل بطاقة على حدة
  // (نفس السلوك لأن المنطق أصلاً يعتمد على elementFromPoint وليس على target الحدث).
  React.useEffect(() => {
    const node = reorderGridRef.current;
    if (!node) return;
    const listener = (e: TouchEvent) => handleTouchMoveCard(e);
    node.addEventListener("touchmove", listener, { passive: false });
    return () => node.removeEventListener("touchmove", listener);
  }, [reorderItems]);

  const handleTouchEndCard = () => {
    cancelDrag();
  };

  // ─── Store hierarchy helpers ───────────────────────────────────────────────

  const loadSubcats = async (catId: number) => {
    setStoreLoading(true);
    try {
      const res = await fetch(`/api/categories/${catId}/subcategories?admin=1`);
      const data = await res.json();
      setStoreSubcats(Array.isArray(data) ? data : []);
    } catch { setStoreSubcats([]); }
    setStoreLoading(false);
  };

  const loadSubSubs = async (subcatId: number) => {
    setStoreLoading(true);
    try {
      const res = await fetch(`/api/subcategories/${subcatId}/sub-sub-categories?admin=1`);
      const data = await res.json();
      setStoreSubSubs(Array.isArray(data) ? data : []);
    } catch { setStoreSubSubs([]); }
    setStoreLoading(false);
  };

  const ensureAllProducts = async (force = false): Promise<any[]> => {
    if (!force && allProducts.length > 0) return allProducts;
    try {
      const res = await adminFetch("/api/admin/products-all");
      if (!res.ok) {
        let msg = "فشل تحميل المنتجات";
        try { const d = await res.json(); if (d?.error) msg = d.error; } catch {}
        if (res.status === 401 || res.status === 403) {
          msg = "انتهت صلاحية جلسة الأدمن، يرجى تسجيل الدخول من جديد";
        }
        showToast(msg, "error");
        return allProducts;
      }
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setAllProducts(list);
      return list;
    } catch {
      showToast("خطأ في الاتصال أثناء تحميل المنتجات", "error");
      return allProducts;
    }
  };

  const loadProductsForSubcat = async (subcatId: number, force = false) => {
    setStoreLoading(true);
    const all = await ensureAllProducts(force);
    setStoreProducts(all.filter((p: any) => String(p.subcategory_id) === String(subcatId)));
    setStoreLoading(false);
  };

  const loadProductsForSubSub = async (subSubId: number, force = false) => {
    setStoreLoading(true);
    const all = await ensureAllProducts(force);
    setStoreProducts(all.filter((p: any) => String(p.sub_sub_category_id) === String(subSubId)));
    setStoreLoading(false);
  };

  const loadProductsForSubcatView = async (subcatId: number, force = false) => {
    setStoreLoading(true);
    const all = await ensureAllProducts(force);
    const direct = all.filter((p: any) =>
      String(p.subcategory_id) === String(subcatId) &&
      (p.sub_sub_category_id === null || p.sub_sub_category_id === undefined || p.sub_sub_category_id === "")
    );
    setStoreProducts(direct);
    setStoreLoading(false);
  };

  // [FIX-1] عند الضغط على قسم: نُظهر overlay أولاً فوق الأقسام الحالية
  // بدل أن ينزل المحتوى ثم يتغير — الآن يبقى المحتوى ثابتاً والـ overlay يغطيه
  const handleCategoryClick = async (cat: any) => {
    setStoreLoading(true);
    setSelectedCategoryId(cat.id);
    // تحميل منتجات مرتبطة مباشرة بالقسم الرئيسي (بدون قسم فرعي) لعرضها بنفس نظام الترتيب وعدد الأعمدة
    // [FIX-3] force=true لضمان جلب أحدث ترتيب محفوظ فعلياً بدل الاعتماد على نسخة مخزّنة قديمة
    try {
      const all = await ensureAllProducts(true);
      const direct = all.filter((p: any) => String(p.category_id) === String(cat.id) && !p.subcategory_id);
      setDirectCategoryProducts(direct);
    } catch { setDirectCategoryProducts([]); }
    await loadSubcats(cat.id);
    setStoreView("subcategories");
    // storeLoading=false يحدث داخل loadSubcats
  };

  const handleSubcatClick = async (subcat: any) => {
    setSelectedCategoryId(subcat.category_id ?? selectedCategoryId);
    setSelectedSubcategoryId(subcat.id);
    setStoreLoading(true);
    try {
      // [FIX-3] كان يُستخدم هنا ensureAllProducts() بدون force=true، فيعيد استخدام القائمة
      // المخزّنة مسبقاً (allProducts) التي قد تكون قُرئت في وقت سابق من الجلسة — قبل أي
      // إعادة ترتيب حدثت لاحقاً من مكان آخر (مثال: من شاشة "عناصر المتجر" أو من تبويب آخر).
      // هذا بالضبط ما كان يجعل شاشة الفروع الفرعية بلوحة التحكم تعرض ترتيباً قديماً/مختلفاً
      // عن الواجهة رغم تطابق منطق الفرز، لأن مصدر البيانات نفسه كان قديماً. الآن نجبر إعادة
      // الجلب (force=true) في كل مرة يفتح الأدمن فيها هذا المستوى، لضمان مطابقة تامة دائماً
      // لآخر ترتيب محفوظ فعلياً في القاعدة.
      const [subRes, all] = await Promise.all([
        fetch(`/api/subcategories/${subcat.id}/sub-sub-categories?admin=1`).then(r => r.json()).catch(() => []),
        ensureAllProducts(true),
      ]);
      const subList = Array.isArray(subRes) ? subRes : [];
      const direct = all.filter((p: any) =>
        String(p.subcategory_id) === String(subcat.id) &&
        (p.sub_sub_category_id === null || p.sub_sub_category_id === undefined || p.sub_sub_category_id === "")
      );
      setDirectSubcatProducts(direct);

      if (subList.length > 0) {
        setStoreSubSubs(subList);
        setStoreView("subsubcategories");
      } else {
        setStoreProducts(direct);
        setStoreView("products");
      }
    } catch {
      await loadProductsForSubcatView(subcat.id);
      setStoreView("products");
    }
    setStoreLoading(false);
  };

  const handleSubSubClick = async (subSub: any) => {
    setSelectedSubSubId(subSub.id);
    setStoreLoading(true);
    await loadProductsForSubSub(subSub.id);
    setStoreView("products");
    // storeLoading=false يحدث داخل loadProductsForSubSub
  };

  const handleViewDirectSubcatProducts = () => {
    setSelectedSubSubId(null);
    setStoreProducts(directSubcatProducts);
    setStoreView("products");
  };

  const handleViewDirectCategoryProducts = () => {
    setSelectedSubcategoryId(null);
    setSelectedSubSubId(null);
    setStoreProducts(directCategoryProducts);
    setStoreView("products");
  };

  const goBackFromSubcats = () => {
    setStoreView("categories");
    setSelectedCategoryId(null);
    setStoreSubcats([]);
  };

  const goBackFromSubSubs = () => {
    setStoreView("subcategories");
    setSelectedSubcategoryId(null);
    setStoreSubSubs([]);
    setDirectSubcatProducts([]);
  };

  const goBackFromProducts = () => {
    if (selectedSubSubId) {
      setStoreView("subsubcategories");
      setSelectedSubSubId(null);
    } else {
      setStoreView("subcategories");
      setSelectedSubcategoryId(null);
      setDirectSubcatProducts([]);
    }
    setStoreProducts([]);
  };

  // ─── Square grid card ──────────────────────────────────────────────────────

  const SquareCard: React.FC<{
    item: any;
    onCardClick?: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onToggleActive?: () => void;
    showPrice?: boolean;
    badge?: React.ReactNode;
  }> = ({ item, onCardClick, onEdit, onDelete, onToggleActive, showPrice = false, badge }) => {
    const isActive = item.active !== false; // افتراضياً مفعّل إن لم يُحدَّد الحقل
    return (
    <div className={`relative flex flex-col bg-white rounded-2xl border ${isActive ? "border-gray-100" : "border-red-200"} shadow-sm hover:shadow-md transition-shadow overflow-hidden isolate`}>
      {badge}
      {!isActive && (
        <span className="absolute top-1.5 left-1.5 z-10 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">معطّل</span>
      )}
      {/* Clickable image+name area */}
      <div
        className={`flex flex-col ${onCardClick ? "cursor-pointer active:opacity-80" : ""} ${!isActive ? "opacity-50 grayscale" : ""}`}
        onClick={onCardClick}
      >
        <div className="aspect-square w-full bg-gray-50 overflow-hidden">
          {item.image_url ? (
            <OptimizedImage src={item.image_url} width={200} height={200} className="w-full h-full object-cover"/>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
              <LayoutGrid size={26} className="text-gray-300"/>
            </div>
          )}
        </div>
        <p className="text-xs font-bold text-gray-700 text-center px-1.5 pt-2 pb-1 leading-tight line-clamp-2 min-h-[2rem]">
          {item.name || item.title || item.code || `#${item.id}`}
        </p>
        {showPrice && item.price !== undefined && (
          <p className="text-[10px] font-bold text-[var(--brand)] text-center pb-1">
            {item.store_type === 'quantities' ? `${Number(item.price_per_unit).toFixed(3)}$/وحدة` : item.store_type === 'specificPackage' && Array.isArray(item.package_values) && item.package_values.length > 0 ? `${item.package_values.length} باقة` : `${Number(item.price).toFixed(3)} $`}
          </p>
        )}
      </div>
      {/* Edit / Disable / Delete */}
      <div className="flex gap-1 px-1.5 pb-1.5 pt-0.5 mt-auto">
        <button
          onClick={onEdit}
          className="flex-1 flex items-center justify-center py-1.5 bg-blue-50 text-blue-600 rounded-lg active:scale-95 transition-transform"
        >
          <Pencil size={14}/>
        </button>
        {onToggleActive && (
          <button
            onClick={onToggleActive}
            className={`flex-1 flex items-center justify-center py-1.5 rounded-lg active:scale-95 transition-transform ${isActive ? "bg-amber-50 text-amber-600" : "bg-green-50 text-green-600"}`}
          >
            {isActive ? <EyeOff size={14}/> : <Eye size={14}/>}
          </button>
        )}
        <button
          onClick={onDelete}
          className="flex-1 flex items-center justify-center py-1.5 bg-red-50 text-red-500 rounded-lg active:scale-95 transition-transform"
        >
          <Trash2 size={14}/>
        </button>
      </div>
    </div>
    );
  };

  const ProductRow: React.FC<{
    item: any;
    onEdit: () => void;
    onDelete: () => void;
    onToggleActive?: () => void;
    onDuplicate?: () => void;
  }> = ({ item, onEdit, onDelete, onToggleActive, onDuplicate }) => {
    const isActive = item.available !== false;
    return (
    <div className={`flex items-center gap-3 bg-white rounded-2xl border ${isActive ? "border-gray-100" : "border-red-200"} shadow-sm hover:shadow-md transition-shadow p-2.5 ${!isActive ? "opacity-60 grayscale" : ""}`}>
      <div className="w-16 h-16 rounded-xl bg-gray-50 overflow-hidden flex-shrink-0">
        {item.image_url ? (
          <OptimizedImage src={item.image_url} width={120} height={120} className="w-full h-full object-cover"/>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-50">
            <PackageSearch size={22} className="text-gray-300"/>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-800 truncate flex items-center gap-1.5">
          {item.name || `#${item.id}`}
          {!isActive && <span className="text-[10px] font-bold text-red-500">(معطّل)</span>}
          {isRecentlyModified(item.updated_at) && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-white bg-emerald-500 px-1.5 py-0.5 rounded-full">
              <Sparkles size={9}/> مُعدَّل حديثاً
            </span>
          )}
        </p>
        {item.price !== undefined && (
          <p className="text-xs font-bold text-[var(--brand)] mt-0.5">
            {item.store_type === 'quantities' ? `${Number(item.price_per_unit).toFixed(3)}$ / وحدة` : item.store_type === 'specificPackage' && Array.isArray(item.package_values) && item.package_values.length > 0 ? `${item.package_values.length} باقة` : `${Number(item.price).toFixed(3)} $`}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={onEdit}
          className="flex items-center justify-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-[11px] font-bold active:scale-95 transition-transform"
        >
          <Pencil size={13}/> تعديل
        </button>
        {onDuplicate && (
          <button
            onClick={onDuplicate}
            className="flex items-center justify-center gap-1 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-[11px] font-bold active:scale-95 transition-transform"
            title="نسخ كقالب"
          >
            <Copy size={13}/>
          </button>
        )}
        {onToggleActive && (
          <button
            onClick={onToggleActive}
            className={`flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-[11px] font-bold active:scale-95 transition-transform ${isActive ? "bg-amber-50 text-amber-600" : "bg-green-50 text-green-600"}`}
          >
            {isActive ? <><EyeOff size={13}/> تعطيل</> : <><Eye size={13}/> تفعيل</>}
          </button>
        )}
        <button
          onClick={onDelete}
          className="flex items-center justify-center gap-1 px-3 py-2 bg-red-50 text-red-500 rounded-lg text-[11px] font-bold active:scale-95 transition-transform"
        >
          <Trash2 size={13}/> حذف
        </button>
      </div>
    </div>
    );
  };

  const NoteBanner = ({ text }: { text: string }) => (
    <div className="flex items-start gap-2 bg-blue-50/70 border border-blue-100 rounded-xl px-3 py-2.5 text-xs text-blue-700 font-semibold text-right">
      <Info size={15} className="text-blue-500 flex-shrink-0 mt-0.5"/>
      <span className="leading-relaxed">{text}</span>
    </div>
  );

  const EmptyState = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-gray-400">
      <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center">{icon}</div>
      <span className="text-sm font-bold">{text}</span>
    </div>
  );

  const LoadingState = () => (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-gray-400">
      <Loader2 size={24} className="animate-spin text-[var(--brand)]"/>
      <span className="text-sm font-bold">جاري التحميل...</span>
    </div>
  );

  const ReorderButton = () => (
    <button
      onClick={openReorderModal}
      className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all"
    >
      <GripVertical size={14}/> إعادة ترتيب
    </button>
  );

  const Breadcrumb = ({ items, onBack }: { items: string[]; onBack: () => void }) => (
    <div className="flex items-center gap-2">
      <button onClick={onBack} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl active:scale-95 transition-all flex-shrink-0">
        <ArrowRight size={16} className="text-gray-600"/>
      </button>
      <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
        {items.map((it, i) => (
          <React.Fragment key={i}>
            {i > 0 && <ChevronLeft size={12} className="text-gray-300 flex-shrink-0"/>}
            <span className={`text-sm font-bold truncate ${i === items.length - 1 ? "text-gray-800" : "text-gray-400"}`}>{it}</span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  const tabs4 = [
    { id:"store", label:"عناصر المتجر", icon:<LayoutGrid size={22}/>, color:"bg-blue-50 text-blue-600", border:"border-blue-100" },
    { id:"banners_offers", label:"البانر والعروض", icon:<ImageIcon size={22}/>, color:"bg-orange-50 text-orange-600", border:"border-orange-100" },
    { id:"vouchers", label:"القسائم", icon:<Ticket size={22}/>, color:"bg-green-50 text-green-600", border:"border-green-100" },
    { id:"payments_tab", label:"طرق الدفع", icon:<Wallet size={22}/>, color:"bg-purple-50 text-purple-600", border:"border-purple-100" },
  ];

  return (
    <div className="space-y-4 relative">
      {/* ─── Main tab selector ─────────────────────────────────────────── */}
      {!editorOnly && !elementsSubTab && (
        <div className="grid grid-cols-2 gap-3">
          {tabs4.map(tab => (
            <button key={tab.id} onClick={() => {
              setElementsSubTab(tab.id);
              if (tab.id === "store") {
                setStoreView("categories");
                setSelectedCategoryId(null);
                setSelectedSubcategoryId(null);
                setSelectedSubSubId(null);
                setStoreSubcats([]); setStoreSubSubs([]); setStoreProducts([]); setDirectSubcatProducts([]);
              }
              const ft = tab.id==="store"?"categories":tab.id==="banners_offers"?"banners":tab.id==="vouchers"?"vouchers":"paymentMethods";
              setElementsType(ft);
              if (tab.id !== "store") loadElements(ft);
            }} className={`bg-white p-5 rounded-2xl border ${tab.border} shadow-sm flex flex-col items-center gap-3 active:scale-95 transition-all hover:shadow-md`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tab.color}`}>{tab.icon}</div>
              <span className="font-bold text-gray-800 text-sm text-center">{tab.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* ─── Sub-tab content ───────────────────────────────────────────── */}
      {!editorOnly && elementsSubTab && (
        <div className="space-y-4">
          {/* Header back button */}
          <div className="flex items-center gap-3">
            <button onClick={() => {
              setElementsSubTab(""); setAllElements([]);
              setStoreView("categories");
              setSelectedCategoryId(null); setSelectedSubcategoryId(null); setSelectedSubSubId(null);
              setStoreSubcats([]); setStoreSubSubs([]); setStoreProducts([]); setDirectSubcatProducts([]);
            }} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl active:scale-95 transition-all">
              <ArrowRight size={18} className="text-gray-600"/>
            </button>
            <h3 className="font-bold text-gray-800">{tabs4.find(t=>t.id===elementsSubTab)?.label}</h3>
          </div>

          {/* ══════════════ STORE ELEMENTS TAB ══════════════ */}
          {elementsSubTab === "store" && (
            <div className="space-y-3">

              {/* ── CATEGORIES VIEW ── */}
              {storeView === "categories" && (
                <div className="relative space-y-3">
                  {/* [FIX-1] Overlay spinner فوق المحتوى الحالي بدل الـ LoadingState الذي ينزل المحتوى */}
                  {storeLoading && <StoreLoadingOverlay />}
                  <div className="flex items-center justify-end gap-2">
                    <ReorderButton/>
                  </div>
                  <NoteBanner text="اضغط على القسم لعرض أقسامه الفرعية"/>
                  {(!categories || categories.length === 0) && (
                    <EmptyState icon={<FolderTree size={26} className="text-gray-300"/>} text="لا توجد أقسام"/>
                  )}
                  <div className={`grid ${catGridCls} gap-3`}>
                    {(categories || []).map((item: any) => (
                      <SquareCard
                        key={item.id}
                        item={item}
                        onCardClick={() => handleCategoryClick(item)}
                        onEdit={() => { setEditingItem({...item}); setEditingType("categories"); }}
                        onDelete={() => handleDelete("categories", item.id, fetchCategories)}
                        onToggleActive={() => handleToggleActive("categories", item.id, fetchCategories)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ── SUBCATEGORIES VIEW ── */}
              {storeView === "subcategories" && (
                <div className="relative space-y-3">
                  {/* [FIX-1] Overlay spinner فوق المحتوى */}
                  {storeLoading && <StoreLoadingOverlay />}
                  <div className="flex items-center justify-between gap-2">
                    <Breadcrumb items={["الأقسام", "الأقسام الفرعية"]} onBack={goBackFromSubcats}/>
                    <ReorderButton/>
                  </div>
                  {!storeLoading && storeSubcats.length === 0 && directCategoryProducts.length === 0 && (
                    <EmptyState icon={<FolderTree size={26} className="text-gray-300"/>} text="لا توجد أقسام فرعية"/>
                  )}
                  <div className={`grid ${subGridCls} gap-3`}>
                    {mergeByOrderIndex(
                      directCategoryProducts.map((it: any) => ({ ...it, __kind: "product" })),
                      storeSubcats.map((it: any) => ({ ...it, __kind: "subcategory" }))
                    ).map((item: any) => (
                      item.__kind === "product" ? (
                        <SquareCard
                          key={`prod_${item.id}`}
                          item={item}
                          showPrice
                          onCardClick={undefined}
                          onEdit={async () => { await openProductEditorFor(item); }}
                          onDelete={() => handleDelete("products", item.id, () => loadProductsForCategoryDirect(selectedCategoryId!, true))}
                          onToggleActive={() => handleToggleActive("products", item.id, () => loadProductsForCategoryDirect(selectedCategoryId!, true))}
                        />
                      ) : (
                        <SquareCard
                          key={item.id}
                          item={item}
                          onCardClick={() => handleSubcatClick(item)}
                          onEdit={() => { setEditingItem({...item}); setEditingType("subcategories"); }}
                          onDelete={() => handleDelete("subcategories", item.id, () => loadSubcats(selectedCategoryId!))}
                          onToggleActive={() => handleToggleActive("subcategories", item.id, () => loadSubcats(selectedCategoryId!))}
                        />
                      )
                    ))}
                  </div>
                </div>
              )}

              {/* ── SUB-SUB-CATEGORIES VIEW ── */}
              {storeView === "subsubcategories" && (
                <div className="relative space-y-3">
                  {/* [FIX-1] Overlay spinner فوق المحتوى */}
                  {storeLoading && <StoreLoadingOverlay />}
                  <div className="flex items-center justify-between gap-2">
                    <Breadcrumb items={["الأقسام الفرعية", "الفروع الفرعية"]} onBack={goBackFromSubSubs}/>
                    <ReorderButton/>
                  </div>
                  <NoteBanner text="اضغط على الفرع الفرعي لعرض المنتجات"/>
                  {!storeLoading && storeSubSubs.length === 0 && directSubcatProducts.length === 0 && (
                    <EmptyState icon={<Boxes size={26} className="text-gray-300"/>} text="لا توجد فروع فرعية"/>
                  )}
                  <div className={`grid ${subsubGridCls} gap-3`}>
                    {mergeByOrderIndex(
                      directSubcatProducts.map((it: any) => ({ ...it, __kind: "product" })),
                      storeSubSubs.map((it: any) => ({ ...it, __kind: "subsubcategory" }))
                    ).map((item: any) => (
                      item.__kind === "product" ? (
                        <SquareCard
                          key={`prod_${item.id}`}
                          item={item}
                          showPrice
                          onCardClick={undefined}
                          onEdit={async () => { await openProductEditorFor(item); }}
                          onDelete={() => handleDelete("products", item.id, () => loadProductsForSubcatView(selectedSubcategoryId!, true))}
                          onToggleActive={() => handleToggleActive("products", item.id, () => loadProductsForSubcatView(selectedSubcategoryId!, true))}
                        />
                      ) : (
                        <SquareCard
                          key={item.id}
                          item={item}
                          onCardClick={() => handleSubSubClick(item)}
                          onEdit={() => { setEditingItem({...item}); setEditingType("subSubCategories"); }}
                          onDelete={() => handleDelete("sub-sub-categories", item.id, () => loadSubSubs(selectedSubcategoryId!))}
                          onToggleActive={() => handleToggleActive("sub-sub-categories", item.id, () => loadSubSubs(selectedSubcategoryId!))}
                        />
                      )
                    ))}
                  </div>
                </div>
              )}

              {/* ── PRODUCTS VIEW ── */}
              {storeView === "products" && (
                <div className="relative space-y-3">
                  {/* [FIX-1] Overlay spinner فوق المحتوى */}
                  {storeLoading && <StoreLoadingOverlay />}
                  <div className="flex items-center justify-between gap-2">
                    <Breadcrumb items={["الأقسام الفرعية", "المنتجات"]} onBack={goBackFromProducts}/>
                    <ReorderButton/>
                  </div>
                  {!storeLoading && storeProducts.length === 0 && (
                    <EmptyState icon={<PackageSearch size={26} className="text-gray-300"/>} text="لا توجد منتجات في هذا القسم"/>
                  )}
                  <div className="space-y-2.5">
                    {storeProducts.map((item: any) => (
                      <ProductRow
                        key={item.id}
                        item={item}
                        onDuplicate={() => duplicateProductAsTemplate(item)}
                        onEdit={async () => {
                          // إعادة جلب أحدث نسخة من المنتج من الخادم قبل فتح التخصيص
                          // (allProducts قد يكون مخزّناً مؤقتاً/قديماً عند التنقل بين الأقسام
                          // بدون تحديث الصفحة، ما يسبب ظهور خانات/بيانات قديمة لا تعكس آخر حفظ)
                          let freshItem = item;
                          try {
                            const all = await ensureAllProducts(true);
                            const found = all.find((p: any) => String(p.id) === String(item.id));
                            if (found) freshItem = found;
                          } catch { /* استخدام النسخة المحلية عند فشل الجلب */ }
                          let parsedImageUrls: string[] = [];
                          try {
                            const raw = freshItem.image_urls;
                            const p = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : [];
                            parsedImageUrls = Array.isArray(p) ? p : [];
                          } catch { parsedImageUrls = []; }
                          let parsedPackagesData: { label: string; price: string }[] = [];
                          try {
                            const raw = freshItem.packages_data;
                            const p = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : [];
                            parsedPackagesData = Array.isArray(p) && p.length > 0
                              ? p.map((x: any) => ({ label: String(x.label ?? ""), price: String(x.price ?? "") }))
                              : [{ label: "", price: "" }];
                          } catch { parsedPackagesData = [{ label: "", price: "" }]; }
                          try {
                            const parsed = freshItem.custom_fields
                              ? (typeof freshItem.custom_fields === "string" ? JSON.parse(freshItem.custom_fields) : freshItem.custom_fields)
                              : [];
                            const fields = Array.isArray(parsed) ? parsed : [];
                            const ensured = ensureDefaultFields(freshItem.store_type || "normal", fields);
                            setEditCustomFields(ensured);
                            setEditingItemSession({...freshItem, image_urls: parsedImageUrls, packages_data: parsedPackagesData, name_verification_source_field_ids: ensured.filter((f: any) => f.nvSource).map((f: any) => f.id)});
                          } catch {
                            setEditCustomFields(ensureDefaultFields(freshItem.store_type || "normal", []));
                            setEditingItemSession({...freshItem, image_urls: parsedImageUrls, packages_data: parsedPackagesData});
                          }
                          setEditingType("products");
                        }}
                        onDelete={() => handleDelete("products", item.id, () => {
                          if (selectedSubSubId) loadProductsForSubSub(selectedSubSubId, true);
                          else if (selectedSubcategoryId) loadProductsForSubcatView(selectedSubcategoryId, true);
                        })}
                        onToggleActive={() => handleToggleActive("products", item.id, () => {
                          if (selectedSubSubId) loadProductsForSubSub(selectedSubSubId, true);
                          else if (selectedSubcategoryId) loadProductsForSubcatView(selectedSubcategoryId, true);
                        })}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════ BANNERS / OFFERS TAB ══════════════ */}
          {elementsSubTab === "banners_offers" && (
            <div className="space-y-4">
              <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
                {[{val:"banners",label:"البانرات"},{val:"offers",label:"العروض"}].map(opt => (
                  <button key={opt.val} onClick={() => { setElementsType(opt.val); loadElements(opt.val); }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${elementsType===opt.val?'bg-white text-orange-600 shadow-sm':'text-gray-500'}`}>{opt.label}</button>
                ))}
              </div>
              {/* [FIX] لم يكن هناك أي زر لإضافة عرض/بانر جديد — فقط تعديل/حذف الموجود مسبقاً */}
              <button onClick={() => { setEditingItem({}); setEditingType(elementsType); }}
                className="w-full flex items-center justify-center gap-2 bg-[var(--brand)] text-white py-2.5 rounded-xl text-xs font-bold active:scale-95 transition-transform">
                <Plus size={14}/> {elementsType === "offers" ? "إضافة عرض" : "إضافة بانر"}
              </button>
              {loadingElements && <LoadingState/>}
              {!loadingElements && allElements.length === 0 && <EmptyState icon={<ImageIcon size={26} className="text-gray-300"/>} text="لا توجد عناصر"/>}
              {!loadingElements && allElements.map((item: any) => {
                const isActive = item.active !== false;
                return (
                <div key={item.id} className={`flex items-center justify-between p-3 bg-white rounded-xl border ${isActive ? "border-gray-100" : "border-red-200"} shadow-sm`}>
                  <div className={`flex items-center gap-2.5 min-w-0 ${!isActive ? "opacity-50 grayscale" : ""}`}>
                    {item.image_url ? (
                      <OptimizedImage src={item.image_url} width={80} height={80} className="w-11 h-11 rounded-lg object-cover flex-shrink-0"/>
                    ) : (
                      <div className="w-11 h-11 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                        <ImageIcon size={18} className="text-gray-300"/>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-700 truncate">{item.name||item.title||item.code||`#${item.id}`}{!isActive && <span className="mr-1.5 text-[10px] font-bold text-red-500">(معطّل)</span>}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => { setEditingItem({...item}); setEditingType(elementsType); }} className="p-2 bg-blue-50 text-blue-600 rounded-lg active:scale-95 transition-transform"><Pencil size={14}/></button>
                    <button
                      onClick={() => { handleToggleActive(delMap[elementsType]||elementsType, item.id, () => loadElements(elementsType)); }}
                      className={`p-2 rounded-lg active:scale-95 transition-transform ${isActive ? "bg-amber-50 text-amber-600" : "bg-green-50 text-green-600"}`}
                    >
                      {isActive ? <EyeOff size={14}/> : <Eye size={14}/>}
                    </button>
                    <button onClick={() => { handleDelete(delMap[elementsType]||elementsType, item.id, () => loadElements(elementsType)); }} className="p-2 bg-red-50 text-red-500 rounded-lg active:scale-95 transition-transform"><Trash2 size={14}/></button>
                  </div>
                </div>
                );
              })}
            </div>
          )}

          {/* ══════════════ VOUCHERS TAB ══════════════ */}
          {elementsSubTab === "vouchers" && (
            <div className="space-y-3">
              {loadingElements && <LoadingState/>}
              {!loadingElements && allElements.length === 0 && <EmptyState icon={<Ticket size={26} className="text-gray-300"/>} text="لا توجد عناصر"/>}
              {!loadingElements && allElements.map((item: any) => {
                const isActive = item.active !== false;
                return (
                <div key={item.id} className={`flex items-center justify-between p-3 bg-white rounded-xl border ${isActive ? "border-gray-100" : "border-red-200"} shadow-sm`}>
                  <div className={`flex items-center gap-2 min-w-0 ${!isActive ? "opacity-50 grayscale" : ""}`}>
                    <div className="w-11 h-11 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                      <Ticket size={18} className="text-green-500"/>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-700 truncate">{item.code||`#${item.id}`}{!isActive && <span className="mr-1.5 text-[10px] font-bold text-red-500">(معطّلة)</span>}</p>
                      {item.amount !== undefined && <p className="text-[10px] font-bold text-[var(--brand)]">{item.amount} $</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => loadVoucherLogs(item.id)} className="p-2 bg-purple-50 text-purple-600 rounded-lg active:scale-95 transition-transform"><History size={14}/></button>
                    <button onClick={() => { setEditingItem({...item}); setEditingType("vouchers"); }} className="p-2 bg-blue-50 text-blue-600 rounded-lg active:scale-95 transition-transform"><Pencil size={14}/></button>
                    <button
                      onClick={() => { handleToggleActive("vouchers", item.id, () => loadElements("vouchers")); }}
                      className={`p-2 rounded-lg active:scale-95 transition-transform ${isActive ? "bg-amber-50 text-amber-600" : "bg-green-50 text-green-600"}`}
                    >
                      {isActive ? <EyeOff size={14}/> : <Eye size={14}/>}
                    </button>
                    <button onClick={() => { handleDelete("vouchers", item.id, () => loadElements("vouchers")); }} className="p-2 bg-red-50 text-red-500 rounded-lg active:scale-95 transition-transform"><Trash2 size={14}/></button>
                  </div>
                </div>
                );
              })}
            </div>
          )}

          {/* ══════════════ PAYMENT METHODS TAB ══════════════ */}
          {elementsSubTab === "payments_tab" && (
            <div className="space-y-3">
              <div className="flex items-center justify-end gap-2">
                <ReorderButton/>
              </div>
              {loadingElements && <LoadingState/>}
              {!loadingElements && allElements.length === 0 && <EmptyState icon={<Wallet size={26} className="text-gray-300"/>} text="لا توجد عناصر"/>}
              <div className="grid grid-cols-4 gap-2.5">
                {!loadingElements && allElements.map((item: any) => {
                  const isActive = item.active !== false;
                  return (
                  <div key={item.id} className={`relative flex flex-col bg-white rounded-2xl border ${isActive ? "border-gray-100" : "border-red-200"} shadow-sm hover:shadow-md transition-shadow overflow-hidden`}>
                    {!isActive && (
                      <span className="absolute mt-1 ml-1 z-10 bg-red-500 text-white text-[8px] font-bold px-1 py-0.5 rounded-full self-start">معطّل</span>
                    )}
                    <div className={`aspect-square w-full bg-gray-50 overflow-hidden ${!isActive ? "opacity-50 grayscale" : ""}`}>
                      {item.image_url ? (
                        <OptimizedImage src={item.image_url} width={160} height={160} className="w-full h-full object-cover"/>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-purple-50">
                          <Wallet size={22} className="text-purple-300"/>
                        </div>
                      )}
                    </div>
                    <p className={`text-[10px] font-bold text-gray-700 text-center px-1 pt-1.5 pb-1 leading-tight line-clamp-2 min-h-[1.8rem] ${!isActive ? "opacity-50" : ""}`}>
                      {item.name || `#${item.id}`}
                    </p>
                    <div className="flex gap-1 px-1 pb-1 mt-auto">
                      <button
                        onClick={() => {
                          // currency_id يعود null من القاعدة عند اختيار الدولار الافتراضي ($) لأنه ليس صفاً حقيقياً في جدول currencies
                          // لذلك يجب إعادة تحويله إلى "usd" هنا لتظهر العملة المختارة فعلياً بدل ظهورها فارغة
                          const mt = item.method_type || "manual";
                          const restoredCurrencyId = (item.currency_id === null || item.currency_id === undefined || item.currency_id === "")
                            ? (mt !== "syriatel" ? "usd" : "")
                            : item.currency_id;
                          setEditingItem({...item, method_type: mt, api_account: item.api_account || "", currency_id: restoredCurrencyId});
                          setEditingType("paymentMethods");
                          setCurrencyDropdownOpen(false);
                          try {
                            const parsed = item.custom_fields ? (typeof item.custom_fields === "string" ? JSON.parse(item.custom_fields) : item.custom_fields) : [];
                            setEditCustomFields(ensurePaymentMethodDefaultFields(Array.isArray(parsed) ? parsed : []));
                          } catch { setEditCustomFields(ensurePaymentMethodDefaultFields([])); }
                        }}
                        className="flex-1 flex items-center justify-center py-1.5 bg-blue-50 text-blue-600 rounded-lg active:scale-95 transition-transform"
                      >
                        <Pencil size={12}/>
                      </button>
                      <button
                        onClick={() => { handleToggleActive("payment-methods", item.id, () => loadElements("paymentMethods")); }}
                        className={`flex-1 flex items-center justify-center py-1.5 rounded-lg active:scale-95 transition-transform ${isActive ? "bg-amber-50 text-amber-600" : "bg-green-50 text-green-600"}`}
                      >
                        {isActive ? <EyeOff size={12}/> : <Eye size={12}/>}
                      </button>
                      <button
                        onClick={() => { handleDelete("payment-methods", item.id, () => loadElements("paymentMethods")); }}
                        className="flex-1 flex items-center justify-center py-1.5 bg-red-50 text-red-500 rounded-lg active:scale-95 transition-transform"
                      >
                        <Trash2 size={12}/>
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Edit Modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {editingItem && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4" onClick={() => setEditingItemSession(null)}>
            <motion.div initial={{scale:0.92,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.92,opacity:0}} className="bg-white w-full max-w-md rounded-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between sticky -top-6 -mx-6 -mt-6 px-6 pt-6 pb-3 bg-white z-10">
                <h3 className="font-bold text-gray-800">تعديل العنصر</h3>
                <button onClick={() => setEditingItemSession(null)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full active:scale-95 transition-all"><X size={18}/></button>
              </div>
              {editingType === "categories" && <div className="space-y-3"><input type="text" placeholder="اسم القسم" className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100" value={editingItem.name||""} onChange={e => setEditingItem({...editingItem,name:e.target.value})} autoFocus/><AdminImageUpload label="صورة القسم" currentUrl={editingItem.image_url||""} onUpload={url => setEditingItem({...editingItem,image_url:url})}/><input type="text" placeholder="الرقم الخاص" className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100" value={editingItem.special_id||""} onChange={e => setEditingItem({...editingItem,special_id:e.target.value})}/></div>}
              {editingType === "subcategories" && <div className="space-y-3">
                <button type="button" onClick={openCatPickerForEdit} className="w-full p-3 bg-gray-50 rounded-xl text-sm text-right flex items-center justify-between border border-gray-100 hover:bg-gray-100 transition-colors">
                  <span className={editingItem.category_id ? "text-gray-800 font-medium" : "text-gray-400"}>
                    {editingItem.category_id ? (categories.find((c:any) => String(c.id)===String(editingItem.category_id))?.name || "—") : "اختر القسم الرئيسي"}
                  </span>
                  <span className="text-gray-400 text-xs mr-1">{editingItem.category_id ? "✓" : "▼"}</span>
                </button>
                <input type="text" placeholder="اسم القسم الفرعي" className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100" value={editingItem.name||""} onChange={e => setEditingItem({...editingItem,name:e.target.value})} autoFocus/>
                <AdminImageUpload label="الصورة" currentUrl={editingItem.image_url||""} onUpload={url => setEditingItem({...editingItem,image_url:url})}/>
                <input type="text" placeholder="الرقم الخاص" className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100" value={editingItem.special_id||""} onChange={e => setEditingItem({...editingItem,special_id:e.target.value})}/>
              </div>}
              {editingType === "subSubCategories" && <div className="space-y-3">
                <button type="button" onClick={openCatPickerForEdit} className="w-full p-3 bg-gray-50 rounded-xl text-sm text-right flex items-center justify-between border border-gray-100 hover:bg-gray-100 transition-colors">
                  <span className={editingItem.subcategory_id ? "text-gray-800 font-medium" : "text-gray-400"}>
                    {editingItem.subcategory_id ? (() => {
                      const sub = allSubcats.find((s:any) => String(s.id) === String(editingItem.subcategory_id));
                      const cat = sub ? categories.find((c:any) => String(c.id) === String(sub.category_id)) : null;
                      return [cat?.name, sub?.name].filter(Boolean).join(" ← ") || "—";
                    })() : "اختر القسم الرئيسي ثم الفرعي"}
                  </span>
                  <span className="text-gray-400 text-xs mr-1">{editingItem.subcategory_id ? "✓" : "▼"}</span>
                </button>
                <input type="text" placeholder="اسم الفرع الفرعي" className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100" value={editingItem.name||""} onChange={e => setEditingItem({...editingItem,name:e.target.value})} autoFocus/>
                <AdminImageUpload label="الصورة" currentUrl={editingItem.image_url||""} onUpload={url => setEditingItem({...editingItem,image_url:url})}/>
                <input type="text" placeholder="الرقم الخاص" className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100" value={editingItem.special_id||""} onChange={e => setEditingItem({...editingItem,special_id:e.target.value})}/>
              </div>}
              {editingType === "products" && (
                <div className="space-y-3">
                  <button type="button" onClick={openCatPickerForEdit} className="w-full p-3 bg-gray-50 rounded-xl text-sm text-right flex items-center justify-between border border-gray-100 hover:bg-gray-100 transition-colors">
                    <span className={(editingItem.subcategory_id || editingItem.category_id) ? "text-gray-800 font-medium" : "text-gray-400"}>
                      {editingItem.subcategory_id ? (() => {
                        const sub = allSubcats.find((s:any) => String(s.id) === String(editingItem.subcategory_id));
                        const cat = sub ? categories.find((c:any) => String(c.id) === String(sub.category_id)) : null;
                        const subSub = editingItem.sub_sub_category_id ? allSubSubs.find((ss:any) => String(ss.id) === String(editingItem.sub_sub_category_id)) : null;
                        return [cat?.name, sub?.name, subSub?.name].filter(Boolean).join(" ← ") || "—";
                      })() : editingItem.category_id ? (() => {
                        const cat = categories.find((c:any) => String(c.id) === String(editingItem.category_id));
                        return cat ? `${cat.name} (مباشرة)` : "—";
                      })() : "اختر القسم الرئيسي ثم الفرعي"}
                    </span>
                    <span className="text-gray-400 text-xs mr-1">{(editingItem.subcategory_id || editingItem.category_id) ? "✓" : "▼"}</span>
                  </button>
                  <input type="text" placeholder="اسم المنتج" className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100" value={editingItem.name||""} onChange={e => setEditingItem({...editingItem,name:e.target.value})} autoFocus/>
                  <textarea placeholder="الوصف" className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none h-20 resize-none focus:ring-2 focus:ring-blue-100" value={editingItem.description||""} onChange={e => setEditingItem({...editingItem,description:e.target.value})}/>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">صورة المنتج</label>
                    <div className="flex gap-2">
                      <input type="text" placeholder="https://... رابط الصورة" className="flex-1 p-3 bg-gray-50 rounded-lg text-sm outline-none" value={editingItem.image_url||""} onChange={e => setEditingItem({...editingItem,image_url:e.target.value})}/>
                      <label className="bg-gray-100 text-gray-600 px-3 py-3 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1 whitespace-nowrap hover:bg-gray-200 transition-colors">
                        <Upload size={14}/>رفع
                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          // [FIX] رمز جلسة التعديل وقت بدء الرفع — يمنع دمج نتيجة الرفع في منتج
                          // آخر إن أغلق الأدمن هذه النافذة وفتح منتجاً مختلفاً أثناء الرفع
                          const targetSession = editSessionRef.current;
                          try {
                            const url = await uploadImage(file);
                            if (editSessionRef.current !== targetSession) return; // تغيّرت النافذة أثناء الرفع
                            setEditingItem((p:any) => p ? ({...p, image_url: url}) : p);
                          } catch { showToast("خطأ في رفع الصورة", 'error'); }
                        }}/>
                      </label>
                    </div>
                    {editingItem.image_url && (
                      <div className="mt-2 flex items-center gap-2">
                        <OptimizedImage src={editingItem.image_url} width={96} height={96} className="w-12 h-12 object-cover rounded-md border border-gray-100"/>
                        <button onClick={() => setEditingItem((p:any) => ({...p, image_url: ""}))} className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded-md">حذف</button>
                      </div>
                    )}
                    {editingItem.image_url && !isLikelyImageUrl(editingItem.image_url) && (
                      <p className="mt-1.5 flex items-center gap-1 text-[10px] text-amber-600 font-bold">
                        <ImageOff size={11}/> الرابط لا يبدو كصورة صالحة — تأكد أنه ينتهي بامتداد صورة (jpg, png...)
                      </p>
                    )}
                  </div>
                  <StoreTypePickerField
                    value={editingItem.store_type||"normal"}
                    onChange={val => { setEditingItem({...editingItem,store_type:val}); setEditCustomFields(prev => ensureDefaultFields(val, prev)); }}
                  />
                  {["normal","quick_order","gallery","packages"].includes(editingItem.store_type||"normal") && editingItem.store_type !== "specificPackage" && (
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">السعر $</label>
                      <input type="number" step="0.01" placeholder="السعر $" className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100" value={editingItem.price||""} onChange={e => setEditingItem({...editingItem,price:e.target.value})}/>
                    </div>
                  )}
                  <MoreDetailsSection>
                  {editingItem.store_type === "gallery" && (
                    <div className="space-y-2 p-3 bg-pink-50 rounded-lg border border-pink-100">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-pink-700">صور المنتج (3 إلى 5 صور)</label>
                        <span className="text-[10px] text-pink-500">({(editingItem.image_urls||[]).length}/5)</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {(editingItem.image_urls||[]).map((url:string, i:number) => (
                          <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-pink-100">
                            <OptimizedImage src={url} width={200} height={200} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setEditingItem((p:any) => ({ ...p, image_urls: p.image_urls.filter((_:string, idx:number) => idx !== i) }))}
                              className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                            >✕</button>
                          </div>
                        ))}
                        {(editingItem.image_urls||[]).length < 5 && (
                          <label className="aspect-square rounded-lg border-2 border-dashed border-pink-200 flex flex-col items-center justify-center gap-1 text-pink-400 cursor-pointer hover:border-pink-400 transition-colors">
                            <Upload size={18} />
                            <span className="text-[10px] font-bold">رفع صورة</span>
                            <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              // [FIX] نفس حماية رمز الجلسة لمنع اختلاط صور معرض منتج بمنتج آخر
                              const targetSession = editSessionRef.current;
                              try {
                                const url = await uploadImage(file);
                                if (editSessionRef.current !== targetSession) return;
                                setEditingItem((p:any) => p ? ({ ...p, image_urls: [...(p.image_urls||[]), url] }) : p);
                              } catch { showToast("خطأ في رفع الصورة", 'error'); }
                            }} />
                          </label>
                        )}
                      </div>
                      {(editingItem.image_urls||[]).length < 3 && (
                        <p className="text-[11px] text-pink-600 text-center py-1">يرجى رفع 3 صور على الأقل (حتى 5)</p>
                      )}
                    </div>
                  )}
                  {editingItem.store_type === "inventory" && (
                    <div className="space-y-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <label className="text-xs font-bold text-amber-700 block">ربط المخزون</label>
                      {editingItem.inventory_group_id ? (
                        <div className="bg-white rounded-lg p-3 border border-amber-200 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold text-gray-800">
                              {inventoryGroups.find((g:any) => String(g.id) === String(editingItem.inventory_group_id))?.name || `مجموعة #${editingItem.inventory_group_id}`}
                            </p>
                            <p className="text-[11px] text-gray-500">
                              متاح: {inventoryGroups.find((g:any) => String(g.id) === String(editingItem.inventory_group_id))?.available_count ?? "—"}
                            </p>
                          </div>
                          <button type="button" onClick={() => { loadInventoryGroups(); setShowInventoryPicker(true); }} className="text-xs font-bold text-amber-600 bg-amber-100 px-3 py-1.5 rounded-lg">تغيير</button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => { loadInventoryGroups(); setShowInventoryPicker(true); }} className="w-full py-2.5 bg-amber-500 text-white rounded-lg text-sm font-bold">
                          📦 اختر مجموعة من المخزون
                        </button>
                      )}
                    </div>
                  )}
                  {editingItem.store_type === "inventory" ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">السعر $</label>
                        <input type="number" step="0.01" placeholder="السعر $" className="w-full p-3 bg-gray-50 rounded-lg text-sm outline-none" value={editingItem.price||""} onChange={e => setEditingItem({...editingItem,price:e.target.value})}/>
                      </div>
                      <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                        <label className="text-xs font-bold text-emerald-700 mb-1 block">كم ربحك من هذا المنتج؟ (اختياري)</label>
                        <p className="text-[10px] text-emerald-600 mb-1.5 leading-relaxed">
                          💡 صافي ربح الوحدة الواحدة — يُستخدم تلقائياً في حساب الأرباح ما لم يُدخل ربح يدوي مختلف على مستوى الطلب نفسه. بدون هذا الحقل، لن تُحتسب أي أرباح لهذا المنتج في صفحة الإحصائيات لأن عناصر المخزون لا تملك سعر تكلفة تلقائياً.
                        </p>
                        <input
                          type="number" step="0.01" placeholder="مثال: 2.50"
                          className="w-full p-2.5 bg-white rounded-md text-sm outline-none border border-emerald-200 focus:border-emerald-400"
                          value={editingItem.default_profit ?? ""}
                          onChange={e => setEditingItem({...editingItem, default_profit: e.target.value})}
                        />
                      </div>
                    </div>
                  ) : editingItem.store_type === "quantities" ? (
                    <div className="space-y-3 p-3 bg-teal-50 rounded-lg border border-teal-100">
                      <div>
                        <label className="text-xs font-bold text-teal-700 mb-1 block">السعر بالدولار $</label>
                        <p className="text-[10px] text-teal-600 mb-1.5 leading-relaxed">
                          💡 السعر بالدولار للكمية التي ستحددها في حقل "الكمية الأساسية" أدناه — سيُحسب سعر الوحدة تلقائياً.
                        </p>
                        <input
                          type="number" step="0.000001" min="0" placeholder="مثال: 5.00"
                          className="w-full p-2.5 bg-white rounded-md text-sm outline-none border border-teal-200 focus:border-teal-400"
                          value={editingItem.price||""}
                          onChange={e => setEditingItem({...editingItem,price:e.target.value})}
                        />
                      </div>
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
                          value={editingItem.price_per_unit ?? ""}
                          onChange={e => setEditingItem({...editingItem,price_per_unit:e.target.value})}
                        />
                      </div>
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
                              editingItem.price && editingItem.price_per_unit && Number(editingItem.price_per_unit) > 0
                                ? (Number(editingItem.price) / Number(editingItem.price_per_unit)).toFixed(6) + " $"
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
                              const baseQty = Number(editingItem.price_per_unit) || 1;
                              const currentUnit = baseQty > 0 ? (Number(editingItem.price) / baseQty).toFixed(6) : "";
                              const v = prompt("أدخل سعر الوحدة المطلوب $\n(سيتم تعديل السعر الأساسي تلقائياً بناءً على الكمية الأساسية):", currentUnit);
                              if (v !== null && v.trim() !== "" && !isNaN(Number(v)) && baseQty > 0) {
                                setEditingItem({...editingItem, price: String((Number(v) * baseQty).toFixed(6))});
                              }
                            }}
                          >
                            <Pencil size={13} />
                            تعديل
                          </button>
                        </div>
                        {editingItem.price && editingItem.price_per_unit && Number(editingItem.price_per_unit) > 0 && (
                          <p className="text-[10px] text-teal-600 mt-1">
                            مثال: 50 وحدة = <span className="font-bold">{((Number(editingItem.price) / Number(editingItem.price_per_unit)) * 50).toFixed(4)} $</span>
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-600 mb-1 block">أقل كمية للطلب <span className="text-red-400">*</span></label>
                        <input
                          type="number" step="any" placeholder="مثال: 1" required
                          className="w-full p-2.5 bg-white rounded-md text-sm outline-none border border-gray-200 focus:border-teal-300"
                          value={editingItem.min_quantity ?? ""}
                          onChange={e => setEditingItem({...editingItem,min_quantity:e.target.value})}
                          onBlur={e => setEditingItem((p: any) => ({...p, min_quantity: clampQtyEl(e.target.value, p)}))}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-600 mb-1 block">أكثر كمية للطلب <span className="text-gray-400 font-normal">(اختياري)</span></label>
                        <input
                          type="number" placeholder="بدون حد أقصى إذا تركت فارغاً"
                          className="w-full p-2.5 bg-white rounded-md text-sm outline-none border border-gray-200 focus:border-teal-300"
                          value={editingItem.max_quantity ?? ""}
                          onChange={e => setEditingItem({...editingItem,max_quantity:e.target.value})}
                          onBlur={e => setEditingItem((p: any) => ({...p, max_quantity: clampQtyEl(e.target.value, p)}))}
                        />
                      </div>
                      {(() => {
                        const err = validateQtyStrict(editingItem);
                        return err ? <p className="text-[10px] text-red-500 font-bold bg-red-50 border border-red-100 rounded-md px-2 py-1">{err}</p> : null;
                      })()}
                      <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                        <label className="text-xs font-bold text-emerald-700 mb-1 block">كم ربحك لكل وحدة؟ (اختياري)</label>
                        <p className="text-[10px] text-emerald-600 mb-1.5 leading-relaxed">
                          💡 صافي الربح لكل وحدة واحدة (وليس للكمية الأساسية كاملة) — يُستخدم تلقائياً في حساب الأرباح. تنبيه: "الكمية الأساسية" أعلاه هي رقم لحساب السعر فقط وليست تكلفة، لذا بدون تعبئة هذا الحقل لن تُحتسب أي أرباح لهذا المنتج.
                        </p>
                        <input
                          type="number" step="0.000001" placeholder="مثال: 0.25"
                          className="w-full p-2.5 bg-white rounded-md text-sm outline-none border border-emerald-200 focus:border-emerald-400"
                          value={editingItem.default_profit ?? ""}
                          onChange={e => setEditingItem({...editingItem, default_profit: e.target.value})}
                        />
                      </div>
                    </div>
                  ) : editingItem.store_type === "external_api" ? (
                    <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                      <input type="number" step="any" placeholder="أقل كمية (مطلوب)" required className="w-full p-2 bg-white rounded-md text-sm outline-none border border-red-100" value={editingItem.min_quantity ?? ""} onChange={e => setEditingItem({...editingItem,min_quantity:e.target.value})}/>
                      <input type="number" step="any" placeholder="أكثر كمية" className="w-full p-2 bg-white rounded-md text-sm outline-none" value={editingItem.max_quantity ?? ""} onChange={e => setEditingItem({...editingItem,max_quantity:e.target.value})}/>
                      <div>
                        <label className="text-[11px] text-gray-500 mb-1 block">سعر المزود الأساسي (price_per_unit)</label>
                        <input type="number" step="0.000001" placeholder="سعر الوحدة $" className="w-full p-2 bg-white rounded-md text-sm outline-none" value={editingItem.price_per_unit ?? ""} onChange={e => setEditingItem({...editingItem,price_per_unit:e.target.value})}/>
                      </div>
                      <input type="text" placeholder="معرف المنتج الخارجي (external_id)" className="w-full p-2 bg-white rounded-md text-sm outline-none border border-blue-100" value={editingItem.external_id||""} onChange={e => setEditingItem({...editingItem,external_id:e.target.value})}/>

                      <div className="pt-2 border-t border-gray-200">
                        <label className="text-xs font-bold text-gray-600 mb-1 block">سعر ثابت مخصص لهذا المنتج <span className="text-gray-400 font-normal">(يتجاوز أي نسبة ربح)</span></label>
                        <div className="relative">
                          <input type="number" min={0} step={0.01} placeholder="اتركه فارغاً لاستخدام الربح المحسوب" className="w-full p-2.5 bg-white rounded-md text-sm outline-none border border-gray-200 pl-8" value={editingItem.price ?? ""} onChange={e => setEditingItem({...editingItem,price:e.target.value})}/>
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">$</span>
                        </div>
                      </div>

                      <div className="text-center text-[10px] text-gray-300 font-bold">— أو —</div>

                      <div>
                        <label className="text-xs font-bold text-gray-600 mb-1 block">ربح مخصص لهذا المنتج فقط</label>
                        <div className="flex bg-gray-100 rounded-lg p-1 gap-1 mb-2">
                          <button type="button" onClick={() => setEditingItem({...editingItem, markup_type: "percent"})} className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${(editingItem.markup_type || "percent") === "percent" ? "bg-white text-[var(--brand)] shadow-sm" : "text-gray-500"}`}>نسبة %</button>
                          <button type="button" onClick={() => setEditingItem({...editingItem, markup_type: "fixed"})} className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${editingItem.markup_type === "fixed" ? "bg-white text-[var(--brand)] shadow-sm" : "text-gray-500"}`}>مبلغ ثابت $</button>
                        </div>
                        <div className="relative">
                          <input type="number" min={0} step={0.01} value={editingItem.markup_value ?? ""} onChange={e => setEditingItem({...editingItem,markup_value:e.target.value})} className="w-full p-2.5 bg-white rounded-md text-sm outline-none border border-gray-200 pl-8" placeholder={(editingItem.markup_type || "percent") === "percent" ? "مثال: 15" : "مثال: 0.5"}/>
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">{(editingItem.markup_type || "percent") === "percent" ? "%" : "$"}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">{(editingItem.markup_type || "percent") === "percent" ? "يُضاف كنسبة فوق سعر المزود لهذا المنتج فقط" : "يُضاف كمبلغ ثابت فوق سعر المزود لهذا المنتج فقط"}</p>
                      </div>
                    </div>
                  ) : editingItem.store_type === "specificPackage" ? (
                    <div className="space-y-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                      <div>
                        <label className="text-xs font-bold text-indigo-700 mb-1 block">تسمية حقل الإدخال (input_label)</label>
                        <input
                          type="text" placeholder="مثال: اختر الباقة"
                          className="w-full p-2.5 bg-white rounded-md text-sm outline-none border border-indigo-200 focus:border-indigo-400"
                          value={editingItem.input_label ?? ""}
                          onChange={e => setEditingItem({...editingItem,input_label:e.target.value})}
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
                            value={editPackageValueInput}
                            onChange={e => setEditPackageValueInput(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                const v = parseFloat(editPackageValueInput);
                                if (!isNaN(v)) {
                                  setEditingItem((p: any) => ({...p, package_values: [...(Array.isArray(p.package_values) ? p.package_values : []), String(v)]}));
                                  setEditPackageValueInput("");
                                }
                              }
                            }}
                          />
                          <button
                            type="button"
                            className="bg-indigo-500 text-white px-3 py-2 rounded-md text-xs font-bold whitespace-nowrap"
                            onClick={() => {
                              const v = parseFloat(editPackageValueInput);
                              if (!isNaN(v)) {
                                setEditingItem((p: any) => ({...p, package_values: [...(Array.isArray(p.package_values) ? p.package_values : []), String(v)]}));
                                setEditPackageValueInput("");
                              }
                            }}
                          >إضافة</button>
                        </div>
                        {Array.isArray(editingItem.package_values) && editingItem.package_values.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {editingItem.package_values.map((v: any, i: number) => (
                              <span key={i} className="flex items-center gap-1 bg-white border border-indigo-200 rounded-full px-2.5 py-1 text-xs text-indigo-700">
                                {v}
                                <button
                                  type="button"
                                  onClick={() => setEditingItem((p: any) => ({...p, package_values: p.package_values.filter((_: any, idx: number) => idx !== i)}))}
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
                          value={editingItem.min_quantity ?? ""}
                          onChange={e => setEditingItem({...editingItem,min_quantity:e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-600 mb-1 block">أكثر كمية <span className="text-gray-400 font-normal">(اختياري)</span></label>
                        <input
                          type="number" step="any" placeholder="بدون حد أقصى إذا تركت فارغاً"
                          className="w-full p-2.5 bg-white rounded-md text-sm outline-none border border-gray-200 focus:border-indigo-300"
                          value={editingItem.max_quantity ?? ""}
                          onChange={e => setEditingItem({...editingItem,max_quantity:e.target.value})}
                        />
                      </div>
                    </div>
                  ) : editingItem.store_type === "packages" ? (
                    <div className="space-y-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                      <div>
                        <label className="text-xs font-bold text-indigo-700 mb-1 block">الباقات</label>
                        <p className="text-[10px] text-indigo-600 mb-1.5 leading-relaxed">
                          تُعرض هذه الباقات للعميل كقائمة منسدلة عند تأكيد الطلب، لكل باقة اسمها وسعرها الخاص.
                        </p>
                        <div className="space-y-2">
                          {(Array.isArray(editingItem.packages_data) ? editingItem.packages_data : []).map((pkg: any, i: number) => (
                            <div key={i} className="bg-white border border-indigo-200 rounded-lg p-2.5">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[11px] font-bold text-indigo-500">الباقة {i + 1}</span>
                                {editingItem.packages_data.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => setEditingItem((p: any) => ({...p, packages_data: p.packages_data.filter((_: any, idx: number) => idx !== i)}))}
                                    className="text-indigo-400 hover:text-red-500 text-xs"
                                  >✕</button>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <input
                                  type="text" placeholder="اسم الباقة (مثال: باقة 10 جيجا)"
                                  className="flex-[2] min-w-0 p-2.5 bg-gray-50 rounded-md text-sm outline-none border border-gray-200 focus:border-indigo-400"
                                  value={pkg.label}
                                  onChange={e => setEditingItem((p: any) => ({...p, packages_data: p.packages_data.map((x: any, idx: number) => idx === i ? {...x, label: e.target.value} : x)}))}
                                />
                                <input
                                  type="number" step="0.01" placeholder="السعر $"
                                  className="flex-1 min-w-0 w-full p-2.5 bg-gray-50 rounded-md text-sm outline-none border border-gray-200 focus:border-indigo-400"
                                  value={pkg.price}
                                  onChange={e => setEditingItem((p: any) => ({...p, packages_data: p.packages_data.map((x: any, idx: number) => idx === i ? {...x, price: e.target.value} : x)}))}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingItem((p: any) => ({...p, packages_data: [...(Array.isArray(p.packages_data) ? p.packages_data : []), { label: "", price: "" }]}))}
                          className="w-full mt-2 py-2 rounded-lg border-2 border-dashed border-indigo-200 text-indigo-500 text-xs font-bold hover:border-indigo-400 transition-colors flex items-center justify-center gap-1"
                        >
                          + إضافة باقة أخرى
                        </button>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-indigo-700 mb-1 block">الخانة الافتراضية</label>
                        {editCustomFields.filter(f => f.isDefault).map((field) => (
                          <input
                            key={field.id}
                            type="text"
                            placeholder="ضع رقم هاتفك"
                            value={field.label}
                            onChange={e => setEditCustomFields(prev => prev.map(f => f.id === field.id ? {...f, label: e.target.value} : f))}
                            className="w-full p-2.5 bg-white rounded-md text-sm outline-none border border-indigo-200 focus:border-indigo-400"
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">السعر $</label>
                      <input type="number" step="0.01" placeholder="السعر $" className="w-full p-3 bg-gray-50 rounded-lg text-sm outline-none" value={editingItem.price||""} onChange={e => setEditingItem({...editingItem,price:e.target.value})}/>
                    </div>
                  )}
                  <div className="flex items-center gap-2"><input type="checkbox" checked={!!editingItem.requires_input} onChange={e => setEditingItem({...editingItem,requires_input:e.target.checked})} className="w-4 h-4 rounded"/><label className="text-xs font-bold text-gray-600">يتطلب بيانات إضافية</label></div>
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                    <label className="text-xs font-bold text-emerald-700 mb-1 block">كم ربحك من هذا المنتج؟ (اختياري)</label>
                    <p className="text-[10px] text-emerald-600 mb-1.5 leading-relaxed">
                      💡 صافي ربح الوحدة الواحدة — يُستخدم تلقائياً في حساب الأرباح ما لم يُدخل ربح يدوي مختلف على مستوى الطلب نفسه.
                    </p>
                    <input
                      type="number" step="0.01" placeholder="مثال: 2.50"
                      className="w-full p-2.5 bg-white rounded-md text-sm outline-none border border-emerald-200 focus:border-emerald-400"
                      value={editingItem.default_profit ?? ""}
                      onChange={e => setEditingItem({...editingItem, default_profit: e.target.value})}
                    />
                  </div>
                  {editingItem.store_type === "quick_order" && (
                    <div className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <label className="text-xs font-bold text-blue-700 block">الحقل الافتراضي (المعرف)</label>
                      {editCustomFields.filter(f => f.isDefault).map((field) => (
                        <div key={field.id} className="bg-white rounded-lg p-3 border border-blue-100 space-y-2">
                          <input
                            type="text"
                            placeholder="مثال: ضع المعرف (ID)"
                            value={field.label}
                            onChange={e => setEditCustomFields(prev => prev.map(f => f.id === field.id ? {...f, label: e.target.value} : f))}
                            className="w-full p-2 bg-gray-50 rounded-md text-xs outline-none border border-gray-200"
                          />
                          <div className="flex gap-2">
                            <button type="button" onClick={() => setEditCustomFields(prev => prev.map(f => f.id === field.id ? {...f, required: true} : f))} className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-colors ${field.required ? "bg-red-500 text-white" : "bg-gray-100 text-gray-500"}`}>إلزامي</button>
                            <button type="button" onClick={() => setEditCustomFields(prev => prev.map(f => f.id === field.id ? {...f, required: false} : f))} className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-colors ${!field.required ? "bg-green-500 text-white" : "bg-gray-100 text-gray-500"}`}>اختياري</button>
                          </div>
                          <FieldKeyboardTypePicker
                            value={(field.keyboard_types as FieldKeyboardType[]) || ["numbers","letters","symbols"]}
                            onChange={(kt) => setEditCustomFields(prev => prev.map(f => f.id === field.id ? {...f, keyboard_types: kt} : f))}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  {editingItem.store_type === "quantities" && (
                    <div className="space-y-2 p-3 bg-teal-50 rounded-lg border border-teal-100">
                      <label className="text-xs font-bold text-teal-700 block">الحقول الافتراضية</label>
                      {editCustomFields.filter(f => f.isDefault).map((field) => (
                        <div key={field.id} className="bg-white rounded-lg p-3 border border-teal-100 space-y-2">
                          <input
                            type="text"
                            placeholder="اسم الحقل"
                            value={field.label}
                            onChange={e => setEditCustomFields(prev => prev.map(f => f.id === field.id ? {...f, label: e.target.value} : f))}
                            className="w-full p-2 bg-gray-50 rounded-md text-xs outline-none border border-gray-200"
                          />
                          <div className="flex gap-2">
                            <button type="button" onClick={() => setEditCustomFields(prev => prev.map(f => f.id === field.id ? {...f, required: true} : f))} className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-colors ${field.required ? "bg-red-500 text-white" : "bg-gray-100 text-gray-500"}`}>إلزامي</button>
                            <button type="button" onClick={() => setEditCustomFields(prev => prev.map(f => f.id === field.id ? {...f, required: false} : f))} className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-colors ${!field.required ? "bg-green-500 text-white" : "bg-gray-100 text-gray-500"}`}>اختياري</button>
                          </div>
                          <FieldKeyboardTypePicker
                            value={(field.keyboard_types as FieldKeyboardType[]) || ["numbers","letters","symbols"]}
                            onChange={(kt) => setEditCustomFields(prev => prev.map(f => f.id === field.id ? {...f, keyboard_types: kt} : f))}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  {editingItem.store_type === "external_api" && (
                    <div className="space-y-2 p-3 bg-cyan-50 rounded-lg border border-cyan-100">
                      <label className="text-xs font-bold text-cyan-700 block">
                        خانات الإدخال المطلوبة من المزوّد ({editCustomFields.filter(f => f.isDefault).length})
                      </label>
                      <p className="text-[10px] text-cyan-600 leading-relaxed">
                        هذه الخانات جاءت تلقائياً عند مزامنة هذا المنتج من المزوّد (مثال: معرف اللاعب، أو
                        بريد إلكتروني وكلمة سر لمزودين آخرين). يمكنك تعديل اسم كل خانة كما يظهر للعميل،
                        لكن لا يُنصح بحذفها لأن المزوّد يتطلبها فعلياً لإتمام الطلب.
                      </p>
                      {editCustomFields.filter(f => f.isDefault).length === 0 && (
                        <p className="text-[11px] text-gray-400 bg-white rounded-md p-2 border border-cyan-100">
                          هذا المنتج لا يتطلب أي بيانات إضافية من العميل — لن تُعرض أي خانة إدخال في صفحة تأكيد الطلب.
                        </p>
                      )}
                      {editCustomFields.filter(f => f.isDefault).map((field) => (
                        <div key={field.id} className="bg-white rounded-lg p-3 border border-cyan-100 space-y-2">
                          <input
                            type="text"
                            placeholder="اسم الخانة كما يظهر للعميل"
                            value={field.label}
                            onChange={e => setEditCustomFields(prev => prev.map(f => f.id === field.id ? {...f, label: e.target.value} : f))}
                            className="w-full p-2 bg-gray-50 rounded-md text-xs outline-none border border-gray-200"
                          />
                          <div className="flex gap-2">
                            <button type="button" onClick={() => setEditCustomFields(prev => prev.map(f => f.id === field.id ? {...f, required: true} : f))} className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-colors ${field.required ? "bg-red-500 text-white" : "bg-gray-100 text-gray-500"}`}>إلزامي</button>
                            <button type="button" onClick={() => setEditCustomFields(prev => prev.map(f => f.id === field.id ? {...f, required: false} : f))} className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-colors ${!field.required ? "bg-green-500 text-white" : "bg-gray-100 text-gray-500"}`}>اختياري</button>
                          </div>
                          <FieldKeyboardTypePicker
                            value={(field.keyboard_types as FieldKeyboardType[]) || ["numbers","letters","symbols"]}
                            onChange={(kt) => setEditCustomFields(prev => prev.map(f => f.id === field.id ? {...f, keyboard_types: kt} : f))}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  {["normal","quick_order","quantities","gallery","inventory","packages","external_api"].includes(editingItem.store_type||"normal") && (
                    <div className="space-y-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-purple-700">الحقول المخصصة</label>
                        <span className="text-[10px] text-purple-400">({editCustomFields.filter(f => !f.isDefault).length}/3)</span>
                      </div>
                      {editCustomFields.filter(f => !f.isDefault).map((field) => (
                        <div key={field.id} className="bg-white rounded-lg p-3 border border-purple-100 space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="مثال: أدخل رقم هاتفك"
                              value={field.label}
                              onChange={e => setEditCustomFields(prev => prev.map(f => f.id === field.id ? {...f, label: e.target.value} : f))}
                              className="flex-1 p-2 bg-gray-50 rounded-md text-xs outline-none border border-gray-200"
                            />
                            <button
                              type="button"
                              onClick={() => setEditCustomFields(prev => prev.filter(f => f.id !== field.id))}
                              className="text-red-400 hover:text-red-600 p-1"
                            >
                              <X size={14}/>
                            </button>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setEditCustomFields(prev => prev.map(f => f.id === field.id ? {...f, required: true} : f))}
                              className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-colors ${field.required ? "bg-red-500 text-white" : "bg-gray-100 text-gray-500"}`}
                            >
                              إلزامي
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditCustomFields(prev => prev.map(f => f.id === field.id ? {...f, required: false} : f))}
                              className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-colors ${!field.required ? "bg-green-500 text-white" : "bg-gray-100 text-gray-500"}`}
                            >
                              اختياري
                            </button>
                          </div>
                          <FieldKeyboardTypePicker
                            value={(field.keyboard_types as FieldKeyboardType[]) || ["numbers","letters","symbols"]}
                            onChange={(kt) => setEditCustomFields(prev => prev.map(f => f.id === field.id ? {...f, keyboard_types: kt} : f))}
                          />
                        </div>
                      ))}
                      {editCustomFields.filter(f => !f.isDefault).length < 3 && (
                        <button
                          type="button"
                          onClick={() => setEditCustomFields(prev => [...prev, {id: Date.now().toString(), label: "", required: true, keyboard_types: ["numbers","letters","symbols"]}])}
                          className="w-full py-2 rounded-lg border-2 border-dashed border-purple-200 text-purple-500 text-xs font-bold hover:border-purple-400 transition-colors flex items-center justify-center gap-1"
                        >
                          <Plus size={12}/> إضافة حقل آخر
                        </button>
                      )}
                    </div>
                  )}
                  {/* [NAME VERIFICATION] تفعيل التحقق من الاسم عند إضافة/تعديل المنتج — يعمل لأي نوع متجر */}
                  <NameVerificationFields
                    value={{
                      name_verification_enabled: !!editingItem.name_verification_enabled,
                      name_verification_game: editingItem.name_verification_game || "",
                      name_verification_region: editingItem.name_verification_region || "",
                      name_verification_source_field_ids: editingItem.name_verification_source_field_ids || [],
                    }}
                    onChange={(val: NameVerificationValue) => setEditingItem({ ...editingItem, ...val })}
                    adminFetch={adminFetch}
                    availableFields={editCustomFields.map(f => ({ id: f.id, label: f.label?.trim() || (f.isDefault ? "الحقل الافتراضي" : "حقل بلا اسم") }))}
                  />
                  </MoreDetailsSection>
                </div>
              )}
              {editingType === "paymentMethods" && <div className="space-y-3">
                <input type="text" placeholder="اسم طريقة الدفع" className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100" value={editingItem.name||""} onChange={e => setEditingItem({...editingItem,name:e.target.value})}/>
                <AdminImageUpload label="صورة الطريقة" currentUrl={editingItem.image_url||""} onUpload={url => setEditingItem({...editingItem,image_url:url})}/>
                <select className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100" value={editingItem.method_type||"manual"} onChange={e => setEditingItem({...editingItem,method_type:e.target.value,api_account:"",currency_id:""})}><option value="manual">يدوي (إيصال)</option><option value="syriatel">سيريتل كاش تلقائي</option><option value="shamcash">شام كاش تلقائي</option><option value="binance">Binance Pay تلقائي</option><option value="crypto_usdt_trc20">USDT (TRC20) تلقائي</option><option value="crypto_usdt_bep20">USDT (BEP20) تلقائي</option></select>
                <div className="flex gap-2 items-stretch"><input type="text" placeholder="رقم المحفظة / العنوان" className="flex-1 min-w-0 p-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100" value={editingItem.wallet_address||""} onChange={e => setEditingItem({...editingItem,wallet_address:e.target.value,qr_enabled:e.target.value.trim() ? editingItem.qr_enabled : false, qr_always_open:e.target.value.trim() ? editingItem.qr_always_open : false})}/><button type="button" disabled={!String(editingItem.wallet_address||"").trim()} onClick={() => setEditingItem({...editingItem,qr_enabled:!editingItem.qr_enabled, qr_always_open: editingItem.qr_enabled ? false : editingItem.qr_always_open})} title={!String(editingItem.wallet_address||"").trim() ? "اكتب عنوان المحفظة أولاً" : ""} className={`shrink-0 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${editingItem.qr_enabled && String(editingItem.wallet_address||"").trim() ? "bg-green-500 text-white" : "bg-white text-gray-600 border border-gray-200"}`}>{editingItem.qr_enabled && String(editingItem.wallet_address||"").trim() ? "تعطيل QR" : "تفعيل QR"}</button>
                {/* [INVOICE-RESTYLE] قفل QR مفتوحاً دائماً — يظهر الرمز مباشرة للمستخدم بلا حاجة للضغط على زر "اظهار الـQR". لا معنى له إلا بعد تفعيل QR أصلاً. */}
                <button type="button" disabled={!editingItem.qr_enabled || !String(editingItem.wallet_address||"").trim()} onClick={() => setEditingItem({...editingItem,qr_always_open:!editingItem.qr_always_open})} title={!editingItem.qr_enabled ? "فعّل QR أولاً" : editingItem.qr_always_open ? "عطّل القفل ليعود QR خلف زر الإظهار" : "اجعل QR مفتوحاً دائماً بلا ضغط زر"} className={`shrink-0 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 ${editingItem.qr_always_open && editingItem.qr_enabled ? "bg-amber-500 text-white" : "bg-white text-gray-600 border border-gray-200"}`}>{editingItem.qr_always_open ? "🔒" : "🔓"} قفل مفتوح</button></div>
                <textarea placeholder="وصف طريقة الدفع (اختياري)" className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none h-16 resize-none focus:ring-2 focus:ring-blue-100" value={editingItem.description||""} onChange={e => setEditingItem({...editingItem,description:e.target.value})}/>
                {(editingItem.method_type==="syriatel"||editingItem.method_type==="shamcash"||editingItem.method_type==="binance"||editingItem.method_type==="crypto_usdt_trc20"||editingItem.method_type==="crypto_usdt_bep20") && <input type="text" placeholder={editingItem.method_type==="syriatel"?"رقم GSM أو كود الكاش (8 أرقام)":editingItem.method_type==="binance"?"Binance ID الخاص بحساب المتجر (المستلم)":editingItem.method_type==="crypto_usdt_trc20"?"عنوان محفظة Tron (TRC20)":editingItem.method_type==="crypto_usdt_bep20"?"عنوان محفظة BSC (BEP20 — 0x...)":"عنوان المحفظة (32 hex) أو رقم الحساب"} className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none font-mono focus:ring-2 focus:ring-blue-100" value={editingItem.api_account||""} onChange={e => setEditingItem({...editingItem,api_account:e.target.value})}/>}
                {(editingItem.method_type==="manual"||editingItem.method_type==="syriatel"||editingItem.method_type==="shamcash"||editingItem.method_type==="binance"||editingItem.method_type==="crypto_usdt_trc20"||editingItem.method_type==="crypto_usdt_bep20") && (
                  <div className="space-y-1 relative">
                    <label className="text-xs font-bold text-gray-600">
                      عملة المحفظة (تُحدد كيف يُدخل المستخدم المبلغ ويُحسب سعر الصرف)
                      {editingItem.method_type === "syriatel" && (
                        <span className="block font-normal text-[10px] text-gray-400 mt-0.5">سيرياتيل كاش يقبل فقط عملة الليرة السورية (ل.س / SYP)</span>
                      )}
                      {editingItem.method_type === "shamcash" && (
                        <span className="block font-normal text-[10px] text-gray-400 mt-0.5">شام كاش يقبل الدولار ($ / USD) أو الليرة السورية (ل.س / SYP) — حسب رد الـ API</span>
                      )}
                      {editingItem.method_type === "binance" && (
                        <span className="block font-normal text-[10px] text-gray-400 mt-0.5">Binance Pay يقبل الدولار ($ / USD) أو الليرة السورية (ل.س / SYP) — حسب رد الـ API</span>
                      )}
                      {(editingItem.method_type === "crypto_usdt_trc20" || editingItem.method_type === "crypto_usdt_bep20") && (
                        <span className="block font-normal text-[10px] text-gray-400 mt-0.5">العملات الرقمية (USDT) تُعامَل كمكافئ للدولار ($ / USD) فقط — لا تدعم الليرة السورية</span>
                      )}
                      {editingItem.method_type === "manual" && (
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
                          const sel = currenciesForSelectedMethodType.find(c => String(c.id) === String(editingItem.currency_id));
                          return sel ? `${sel.name} (${sel.symbol}) — سعر الصرف: ${sel.exchange_rate}` : "اختر عملة المحفظة...";
                        })()}
                      </span>
                      <ChevronDown size={16} className="text-gray-400" />
                    </button>
                    {currencyDropdownOpen && (
                      <div className="absolute z-20 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-100 max-h-56 overflow-y-auto">
                        {currenciesForSelectedMethodType.length === 0 && (
                          <div className="p-3 text-xs text-gray-400 text-center">
                            {editingItem.method_type === "syriatel"
                              ? 'لا توجد عملة ليرة سورية (ل.س / SYP) مضافة بعد — أضفها من "إدارة العملات"'
                              : (editingItem.method_type === "shamcash" || editingItem.method_type === "binance")
                              ? 'لا توجد عملة دولار (USD) أو ليرة سورية (SYP) مضافة بعد — أضفها من "إدارة العملات"'
                              : (editingItem.method_type === "crypto_usdt_trc20" || editingItem.method_type === "crypto_usdt_bep20")
                              ? 'لا توجد عملة دولار (USD) مضافة بعد — أضفها من "إدارة العملات"'
                              : 'لا توجد عملات مضافة بعد — أضف عملة من "إدارة العملات"'}
                          </div>
                        )}
                        {currenciesForSelectedMethodType.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => { setEditingItem({ ...editingItem, currency_id: c.id }); setCurrencyDropdownOpen(false); }}
                            className="w-full text-right px-3 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between border-b border-gray-50 last:border-0"
                          >
                            <span className="font-medium text-gray-800">{c.name} <span className="text-gray-400">({c.symbol})</span></span>
                            <span className="text-[10px] text-gray-400">{c.is_default ? "افتراضية" : `سعر: ${c.exchange_rate}`}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {editingItem.currency_id && (() => {
                      const sel = currenciesForSelectedMethodType.find(c => String(c.id) === String(editingItem.currency_id));
                      if (!sel) return null;
                      return !isUsdCurrency(sel) ? (
                        <p className="text-xs text-amber-600 flex items-center gap-1"><AlertTriangle size={14}/>المبلغ المُدخل سيُحوَّل تلقائياً إلى دولار حسب سعر صرف "{sel.name}" ({sel.exchange_rate})</p>
                      ) : null;
                    })()}
                    {!editingItem.currency_id && editingItem.method_type !== "manual" && (
                      <p className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle size={14}/>يجب اختيار عملة — بدون سعر صرف صالح سيتم رفض عمليات الشحن التلقائي تلقائياً</p>
                    )}
                  </div>
                )}
                <input type="number" placeholder="أقل مبلغ $" className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100" value={editingItem.min_amount||""} onChange={e => setEditingItem({...editingItem,min_amount:e.target.value})}/>
                {/* [EDIT PARITY] عمولة أو بونص الإيداع (اختياري) — نفس الحقل الموجود في نموذج الإضافة، مضاف هنا لضمان تطابق نموذج التعديل مع نموذج الإضافة */}
                <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <label className="text-xs font-bold text-gray-600 block">عمولة / بونص الإيداع (اختياري)</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setEditingItem({...editingItem, bonus_type: editingItem.bonus_type === "commission" ? "" : "commission"})} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${editingItem.bonus_type === "commission" ? "bg-red-500 text-white" : "bg-white text-gray-500 border border-gray-200"}`}>عمولة (خصم -)</button>
                    <button type="button" onClick={() => setEditingItem({...editingItem, bonus_type: editingItem.bonus_type === "bonus" ? "" : "bonus"})} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${editingItem.bonus_type === "bonus" ? "bg-green-500 text-white" : "bg-white text-gray-500 border border-gray-200"}`}>بونص (زيادة +)</button>
                  </div>
                  {editingItem.bonus_type && (
                    <input type="number" min={0} max={100} step="0.01" placeholder="النسبة المئوية %" className="w-full p-3 bg-white rounded-lg text-sm outline-none border border-gray-200" value={editingItem.bonus_percent||""} onChange={e => setEditingItem({...editingItem, bonus_percent: e.target.value})}/>
                  )}
                  {editingItem.bonus_type && (
                    <button type="button" onClick={() => setEditingItem({...editingItem, bonus_visible: editingItem.bonus_visible === false ? true : false})}
                      className={`w-full py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${editingItem.bonus_visible === false ? "bg-gray-200 text-gray-500" : "bg-blue-500 text-white"}`}>
                      {editingItem.bonus_visible === false ? "مخفي عن المستخدم — إظهار" : "ظاهر للمستخدم — إخفاء"}
                    </button>
                  )}
                  <p className="text-[10px] text-gray-400">
                    {editingItem.bonus_type === "commission" && "مثال: شحن 100$ بعمولة 10% ⇐ يحصل المستخدم على 90$"}
                    {editingItem.bonus_type === "bonus" && "مثال: شحن 100$ ببونص 10% ⇐ يحصل المستخدم على 110$"}
                    {!editingItem.bonus_type && "بدون تحديد، يُضاف المبلغ كما هو بدون خصم أو زيادة"}
                  </p>
                </div>
                {editingItem.method_type === "manual" && (
                <>
                <div className="space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <label className="text-xs font-bold text-blue-700 block">الحقول الافتراضية (تظهر في صفحة الدفع)</label>
                  {editCustomFields.filter(f => f.isDefault).map(field => (
                    <div key={field.id} className="bg-white rounded-lg p-3 border border-blue-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-500">{(field as any).type === "image" ? "حقل صورة" : "حقل نصي"}</span>
                        <button type="button" onClick={() => setEditCustomFields(prev => prev.map(f => f.id === field.id ? {...f, enabled: !(f as any).enabled} : f))} className={`w-10 h-5 rounded-full relative transition-colors ${(field as any).enabled !== false ? "bg-brand" : "bg-gray-200"}`}>
                          <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${(field as any).enabled !== false ? "right-1" : "left-1"}`} />
                        </button>
                      </div>
                      <input type="text" placeholder="اسم الحقل" value={field.label} onChange={e => setEditCustomFields(prev => prev.map(f => f.id === field.id ? {...f, label: e.target.value} : f))} className="w-full p-2 bg-gray-50 rounded-md text-xs outline-none border border-gray-200"/>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setEditCustomFields(prev => prev.map(f => f.id === field.id ? {...f, required: true} : f))} className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-colors ${field.required ? "bg-red-500 text-white" : "bg-gray-100 text-gray-500"}`}>إلزامي</button>
                        <button type="button" onClick={() => setEditCustomFields(prev => prev.map(f => f.id === field.id ? {...f, required: false} : f))} className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-colors ${!field.required ? "bg-green-500 text-white" : "bg-gray-100 text-gray-500"}`}>اختياري</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-purple-700">الحقول المخصصة</label>
                    <span className="text-[10px] text-purple-400">({editCustomFields.filter(f => !f.isDefault).length}/3)</span>
                  </div>
                  {editCustomFields.filter(f => !f.isDefault).map(field => (
                    <div key={field.id} className="bg-white rounded-lg p-3 border border-purple-100 space-y-2">
                      <div className="flex items-center gap-2">
                        <input type="text" placeholder="مثال: أدخل رقم هاتفك" value={field.label} onChange={e => setEditCustomFields(prev => prev.map(f => f.id === field.id ? {...f, label: e.target.value} : f))} className="flex-1 p-2 bg-gray-50 rounded-md text-xs outline-none border border-gray-200"/>
                        <button type="button" onClick={() => setEditCustomFields(prev => prev.filter(f => f.id !== field.id))} className="text-red-400 hover:text-red-600 p-1"><X size={14}/></button>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setEditCustomFields(prev => prev.map(f => f.id === field.id ? {...f, required: true} : f))} className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-colors ${field.required ? "bg-red-500 text-white" : "bg-gray-100 text-gray-500"}`}>إلزامي</button>
                        <button type="button" onClick={() => setEditCustomFields(prev => prev.map(f => f.id === field.id ? {...f, required: false} : f))} className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-colors ${!field.required ? "bg-green-500 text-white" : "bg-gray-100 text-gray-500"}`}>اختياري</button>
                      </div>
                    </div>
                  ))}
                  {editCustomFields.filter(f => !f.isDefault).length < 3 && (
                    <button type="button" onClick={() => setEditCustomFields(prev => [...prev, {id: Date.now().toString(), label: "", required: true, type: "text"} as any])} className="w-full py-2 rounded-lg border-2 border-dashed border-purple-200 text-purple-500 text-xs font-bold hover:border-purple-400 transition-colors flex items-center justify-center gap-1">
                      <Plus size={12}/> إضافة حقل آخر
                    </button>
                  )}
                </div>
                </>
                )}
              </div>}
              {editingType === "banners" && <div className="space-y-3"><AdminImageUpload label="صورة البانر" currentUrl={editingItem.image_url||""} onUpload={url => setEditingItem({...editingItem,image_url:url})}/><input type="text" placeholder="رابط البانر (يفتح عند الضغط على البانر - اختياري)" className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100" value={editingItem.link_url||""} onChange={e => setEditingItem({...editingItem,link_url:e.target.value})}/></div>}
              {editingType === "offers" && <div className="space-y-3"><input type="text" placeholder="عنوان العرض" className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100" value={editingItem.title||""} onChange={e => setEditingItem({...editingItem,title:e.target.value})} autoFocus/><textarea placeholder="وصف العرض (اختياري)" className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none h-20 resize-none focus:ring-2 focus:ring-blue-100" value={editingItem.description||""} onChange={e => setEditingItem({...editingItem,description:e.target.value})}/><input type="text" placeholder="رابط العرض (يفتح عند الضغط على العرض)" className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100" value={editingItem.link_url||""} onChange={e => setEditingItem({...editingItem,link_url:e.target.value})}/><AdminImageUpload label="صورة العرض" currentUrl={editingItem.image_url||""} onUpload={url => setEditingItem({...editingItem,image_url:url})}/></div>}
              {editingType === "vouchers" && <div className="space-y-3"><input type="text" placeholder="الكود" className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100" value={editingItem.code||""} onChange={e => setEditingItem({...editingItem,code:e.target.value})}/><input type="number" placeholder="القيمة $" className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100" value={editingItem.amount||""} onChange={e => setEditingItem({...editingItem,amount:e.target.value})}/><input type="number" placeholder="أقصى استخدامات" className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100" value={editingItem.max_uses||""} onChange={e => setEditingItem({...editingItem,max_uses:e.target.value})}/></div>}
              {editingType === "products" && (
                <div className="mt-2 space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowLivePreview(true)}
                    className="w-full py-2.5 rounded-xl text-xs font-bold border border-gray-200 text-gray-600 flex items-center justify-center gap-1.5 hover:bg-gray-50 transition-colors"
                  >
                    <Eye size={14}/> معاينة المنتج قبل الحفظ
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveEdit(false, true)}
                      disabled={savingDraft}
                      className="flex-1 bg-gray-100 text-gray-600 py-3.5 rounded-xl font-bold text-sm active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      <Save size={16}/> حفظ كمسودة
                    </button>
                    <button onClick={() => handleSaveEdit()} className="flex-[2] bg-[var(--brand)] text-white py-3.5 rounded-xl font-bold text-sm active:scale-95 transition-transform flex items-center justify-center gap-2">
                      <CheckCircle2 size={16}/> {editingItem.id ? "حفظ التعديلات" : "إضافة المنتج"}
                    </button>
                  </div>
                </div>
              )}
              {editingType !== "products" && (
                <button onClick={() => handleSaveEdit()} className="w-full bg-[var(--brand)] text-white py-3.5 rounded-xl font-bold text-sm mt-2 active:scale-95 transition-transform flex items-center justify-center gap-2">
                  <CheckCircle2 size={16}/> حفظ التعديلات
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
        {editingType === "products" && (
          <ProductCheckoutPreview
            open={showLivePreview}
            onClose={() => setShowLivePreview(false)}
            product={{
              ...editingItem,
              // [NAME VERIFICATION] المعاينة يجب أن تعكس حقول التعديل الحيّة (editCustomFields) وليس
              // editingItem.custom_fields الذي لا يُحدَّث إلا عند الحفظ الفعلي — وإلا يصل للمعاينة شكل
              // حقل خام غير متوافق (id/key/label/required/isDefault) فيسبب خطأ React #31 عند عرضه مباشرة.
              custom_fields: editCustomFields.length > 0 ? JSON.stringify(editCustomFields) : null,
            }}
          />
        )}
      </AnimatePresence>

      {/* ─── نافذة اختيار القسم (بديل القائمة المنسدلة) ──────────────────── */}
      {showCatPickerModal && (
        <div
          className="fixed inset-0 z-[85] flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
          onClick={() => setShowCatPickerModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
            onClick={e => e.stopPropagation()}
            dir="rtl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                {(catPickerStep === "subcategory" || catPickerStep === "askSubSub" || catPickerStep === "subSubCategory") && (
                  <button
                    onClick={() => {
                      if (catPickerStep === "subcategory") setCatPickerStep("category");
                      else if (catPickerStep === "askSubSub") setCatPickerStep("subcategory");
                      else if (catPickerStep === "subSubCategory") setCatPickerStep("askSubSub");
                    }}
                    className="text-gray-400 hover:text-gray-700 text-lg leading-none ml-1"
                  >‹</button>
                )}
                <h4 className="font-bold text-gray-800 text-base">
                  {catPickerStep === "category" ? "اختر القسم الرئيسي" :
                   catPickerStep === "subcategory" ? "اختر القسم الفرعي" :
                   catPickerStep === "askSubSub" ? "هل تود تحديد فرع فرعي؟" :
                   "اختر الفرع الفرعي"}
                </h4>
              </div>
              <button
                onClick={() => setShowCatPickerModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >✕</button>
            </div>

            {/* Step Indicator */}
            {catPickerMode !== "category" && (
              <div className="flex items-center gap-1 px-4 pt-3 pb-1">
                {(catPickerMode === "subcategory" ? ["category","subcategory"] : ["category","subcategory","askSubSub","subSubCategory"]).map((step, i, arr) => (
                  <div key={step} className={`h-1.5 flex-1 rounded-full transition-colors ${
                    catPickerStep === step ? "bg-[var(--brand)]" :
                    arr.indexOf(catPickerStep) > i ? "bg-[var(--brand)] opacity-40" :
                    "bg-gray-200"
                  }`}/>
                ))}
              </div>
            )}

            {/* Body */}
            <div className="p-4 overflow-y-auto" style={{ maxHeight: "60vh" }}>
              {/* Step 1: اختيار القسم الرئيسي */}
              {catPickerStep === "category" && (
                categories.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-6">لا توجد أقسام رئيسية بعد</p>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {categories.map((c: any) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setCatPickerSelectedCatId(String(c.id));
                          setCatPickerSelectedSubId("");
                          setCatPickerSelectedSubSubId("");
                          if (catPickerMode === "category") {
                            confirmCatPickerCategoryOnly(String(c.id));
                          } else if (catPickerMode === "full") {
                            setCatPickerStep("askSub");
                          } else {
                            setCatPickerStep("subcategory");
                          }
                        }}
                        className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${
                          catPickerSelectedCatId === String(c.id) ? "border-[var(--brand)] bg-blue-50" : "border-gray-100 bg-gray-50 hover:border-gray-300"
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

              {/* Step: هل تود اضافة المنتج داخل قسم فرعي؟ (منتجات فقط) */}
              {catPickerStep === "askSub" && (
                <div className="space-y-3 py-2">
                  <p className="text-sm text-gray-600 text-center pb-2">هل تريد اضافته الى قسم فرعي؟</p>
                  <button
                    type="button"
                    onClick={() => setCatPickerStep("subcategory")}
                    className="w-full py-3.5 rounded-xl font-bold text-sm bg-[var(--brand)] text-white"
                  >نعم، اختر القسم الفرعي</button>
                  <button
                    type="button"
                    onClick={() => confirmCatPickerCategoryDirect(catPickerSelectedCatId)}
                    className="w-full py-3.5 rounded-xl font-bold text-sm bg-gray-100 text-gray-700"
                  >لا، اعتمد القسم الرئيسي فقط</button>
                </div>
              )}

              {/* Step 2: اختيار القسم الفرعي */}
              {catPickerStep === "subcategory" && (() => {
                const filteredSubs = allSubcats.filter((s: any) => String(s.category_id) === String(catPickerSelectedCatId));
                return filteredSubs.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-6">لا توجد أقسام فرعية لهذا القسم</p>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {filteredSubs.map((s: any) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setCatPickerSelectedSubId(String(s.id));
                          setCatPickerSelectedSubSubId("");
                          if (catPickerMode === "subcategory") {
                            confirmCatPickerSubcategoryOnly(String(s.id));
                            return;
                          }
                          const hasSubSubs = allSubSubs.filter((ss: any) => String(ss.subcategory_id) === String(s.id)).length > 0;
                          if (hasSubSubs) {
                            setCatPickerStep("askSubSub");
                          } else {
                            confirmCatPickerFull(String(s.id), "");
                          }
                        }}
                        className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${
                          catPickerSelectedSubId === String(s.id) ? "border-[var(--brand)] bg-blue-50" : "border-gray-100 bg-gray-50 hover:border-gray-300"
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

              {/* Step 3: هل تود تحديد فرع فرعي؟ */}
              {catPickerStep === "askSubSub" && (
                <div className="space-y-3 py-2">
                  <p className="text-sm text-gray-600 text-center pb-2">هل تود وضع المنتج داخل فرع فرعي؟</p>
                  <button
                    type="button"
                    onClick={() => setCatPickerStep("subSubCategory")}
                    className="w-full py-3.5 rounded-xl font-bold text-sm bg-[var(--brand)] text-white"
                  >نعم، اختر الفرع الفرعي</button>
                  <button
                    type="button"
                    onClick={() => confirmCatPickerFull(catPickerSelectedSubId, "")}
                    className="w-full py-3.5 rounded-xl font-bold text-sm bg-gray-100 text-gray-700"
                  >لا، اعتمد القسم الفرعي فقط</button>
                </div>
              )}

              {/* Step 4: اختيار الفرع الفرعي */}
              {catPickerStep === "subSubCategory" && (() => {
                const filteredSubSubs = allSubSubs.filter((ss: any) => String(ss.subcategory_id) === String(catPickerSelectedSubId));
                return filteredSubSubs.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-6">لا توجد فروع فرعية لهذا القسم</p>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      {filteredSubSubs.map((ss: any) => (
                        <button
                          key={ss.id}
                          type="button"
                          onClick={() => setCatPickerSelectedSubSubId(String(ss.id))}
                          className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${
                            catPickerSelectedSubSubId === String(ss.id) ? "border-[var(--brand)] bg-blue-50" : "border-gray-100 bg-gray-50 hover:border-gray-300"
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
                      disabled={!catPickerSelectedSubSubId}
                      onClick={() => confirmCatPickerFull(catPickerSelectedSubId, catPickerSelectedSubSubId)}
                      className="w-full bg-[var(--brand)] text-white py-3 rounded-xl font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                    >تأكيد الاختيار</button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ─── Reorder Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {reorderMode && (
          <motion.div
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 z-[90] bg-black/60 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-white border-b border-gray-100 shadow-sm">
              <div className="flex items-center gap-2">
                <GripVertical size={16} className="text-gray-400"/>
                <h3 className="font-bold text-gray-800">إعادة ترتيب</h3>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={closeReorderModal} className="bg-gray-100 text-gray-700 px-3.5 py-2 rounded-xl text-xs font-bold active:scale-95 transition-all">إلغاء</button>
                <button onClick={handleSaveReorder} className="bg-green-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold active:scale-95 transition-all flex items-center gap-1">
                  <CheckCircle2 size={13}/> تأكيد
                </button>
              </div>
            </div>

            {/* Grid */}
            <div
              ref={reorderGridRef}
              className="flex-1 overflow-y-auto bg-white p-4"
              style={{ touchAction: isDragging ? "none" : "auto" }}
              onMouseLeave={() => { if (!isDragging) clearLongPressTimer(); }}
            >
              <div className={`grid ${reorderGridCls} ${elementsSubTab === "payments_tab" ? "gap-2.5" : "gap-3"}`}>
                {reorderItems.map((item, idx) => {
                  const isBeingDragged = dragIndex === idx && isDragging;
                  return (
                    <div
                      key={item.id}
                      data-reorder-index={idx}
                      onMouseDown={() => handleMouseDownCard(idx)}
                      onMouseUp={handleMouseUpCard}
                      onMouseLeave={() => { if (!isDragging) clearLongPressTimer(); }}
                      onMouseEnter={() => handleMouseEnterCard(idx)}
                      onTouchStart={() => handleTouchStartCard(idx)}
                      onTouchEnd={handleTouchEndCard}
                      onContextMenu={(e) => e.preventDefault()}
                      style={{
                        transform: isBeingDragged ? "scale(1.06)" : "scale(1)",
                        opacity: isDragging ? (isBeingDragged ? 1 : 0.45) : 1,
                        zIndex: isBeingDragged ? 10 : 1,
                        cursor: isDragging ? (isBeingDragged ? "grabbing" : "default") : "grab",
                        transition: isBeingDragged
                          ? "transform 0.15s ease, opacity 0.15s ease"
                          : "transform 0.18s ease, opacity 0.18s ease",
                        willChange: "transform, opacity",
                        position: "relative",
                      }}
                      className={`flex flex-col bg-white rounded-2xl border-2 ${
                        isBeingDragged
                          ? "border-[var(--brand)] shadow-2xl ring-4 ring-[var(--brand)]/20"
                          : "border-gray-100 shadow-sm"
                      } overflow-hidden select-none touch-none`}
                    >
                      {/* Drag handle */}
                      <div className="absolute top-1.5 right-1.5 z-10 p-1 bg-white/90 rounded-lg shadow-sm">
                        <GripVertical size={13} className="text-gray-400"/>
                      </div>
                      {/* Order index badge */}
                      <div className="absolute top-1.5 left-1.5 z-10 w-5 h-5 rounded-full bg-gray-900/70 text-white text-[10px] font-bold flex items-center justify-center">
                        {idx + 1}
                      </div>
                      <div className="aspect-square w-full bg-gray-50 overflow-hidden">
                        {item.image_url ? (
                          <OptimizedImage src={item.image_url} width={200} height={200} className="w-full h-full object-cover pointer-events-none"/>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-50">
                            <LayoutGrid size={26} className="text-gray-300"/>
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-bold text-gray-700 text-center px-1 pt-2 pb-2 leading-tight line-clamp-2 pointer-events-none">
                        {item.name || item.title || item.code || `#${item.id}`}
                      </p>
                    </div>
                  );
                })}
              </div>
              {reorderItems.length === 0 && (
                <EmptyState icon={<GripVertical size={26} className="text-gray-300"/>} text="لا توجد عناصر لترتيبها"/>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* مودال ربط مجموعة مخزون بالمنتج قيد التعديل — نفس المودال الموحّد المستخدم في كل مكان */}
      <InventoryManagerModal
        open={showInventoryPicker}
        onClose={() => setShowInventoryPicker(false)}
        adminFetch={adminFetch}
        currentGroupId={editingItem?.inventory_group_id}
        onSelectGroup={linkGroupToProduct}
      />

      {/* ══════════════ مودال سجلات استخدام القسيمة ══════════════ */}
      <AnimatePresence>
        {showVoucherLogs && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-[70] flex items-end sm:items-center justify-center"
            onClick={() => setShowVoucherLogs(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[85vh] flex flex-col"
              onClick={(e: any) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                    <History size={16} className="text-purple-600"/>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">سجلات استخدام القسيمة</p>
                    {voucherLogsData?.voucher && (
                      <p className="text-[11px] text-gray-500 truncate">
                        {voucherLogsData.voucher.code} · {voucherLogsData.voucher.amount}$ · استُخدمت {voucherLogsData.voucher.used_count ?? 0}/{voucherLogsData.voucher.max_uses ?? "∞"} مرة
                      </p>
                    )}
                  </div>
                </div>
                <button onClick={() => setShowVoucherLogs(false)} className="p-2 bg-gray-50 rounded-lg active:scale-95 transition-transform flex-shrink-0">
                  <X size={16} className="text-gray-500"/>
                </button>
              </div>

              <div className="overflow-y-auto p-4 space-y-3">
                {voucherLogsLoading && <LoadingState/>}
                {!voucherLogsLoading && voucherLogsData && voucherLogsData.uses.length === 0 && (
                  <EmptyState icon={<History size={26} className="text-gray-300"/>} text="لم يتم استخدام هذه القسيمة بعد"/>
                )}
                {!voucherLogsLoading && voucherLogsData?.uses.map((use: any) => (
                  <div key={use.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {use.user?.avatar_url ? (
                          <OptimizedImage src={use.user.avatar_url} alt={use.user?.name || ""} className="w-full h-full object-cover"/>
                        ) : (
                          <UserIcon size={16} className="text-gray-400"/>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-gray-800 truncate">{use.user?.name || `مستخدم #${use.user_id}`}</p>
                        <p className="text-[10px] text-gray-500 truncate">{use.user?.email || "—"}{use.user?.phone ? ` · ${use.user.phone}` : ""}</p>
                      </div>
                      {use.user?.is_vip && <span className="text-[9px] font-bold px-2 py-0.5 bg-yellow-50 text-yellow-600 rounded-full flex-shrink-0">VIP</span>}
                      {use.user?.is_banned && <span className="text-[9px] font-bold px-2 py-0.5 bg-red-50 text-red-500 rounded-full flex-shrink-0">محظور</span>}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="bg-white rounded-lg p-2 border border-gray-100">
                        <p className="text-gray-400">رمز القسيمة</p>
                        <p className="font-bold text-gray-700">{use.voucher_code}</p>
                      </div>
                      <div className="bg-white rounded-lg p-2 border border-gray-100">
                        <p className="text-gray-400">القيمة المستفادة</p>
                        <p className="font-bold text-[var(--brand)]">{use.voucher_amount} $</p>
                      </div>
                      <div className="bg-white rounded-lg p-2 border border-gray-100">
                        <p className="text-gray-400">رصيد المستخدم الحالي</p>
                        <p className="font-bold text-gray-700">{use.user?.balance ?? "—"} $</p>
                      </div>
                      <div className="bg-white rounded-lg p-2 border border-gray-100">
                        <p className="text-gray-400">وقت الاستخدام</p>
                        <p className="font-bold text-gray-700">
                          {use.created_at ? new Date(use.created_at).toLocaleString("ar-EG") : "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
});

export default AdminElementsPage;
