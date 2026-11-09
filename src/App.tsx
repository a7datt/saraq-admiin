/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Component, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Home, 
  Wallet, 
  ShoppingBag, 
  User, 
  UserCircle,
  Bell, 
  Menu, 
  ChevronRight, 
  ChevronLeft,
  Plus, 
  Image as ImageIcon,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
  LogOut,
  Settings,
  Key,
  History,
  MessageSquare,
  Ticket,
  Search,
  Lock,
  Copy,
  ExternalLink,
  Pencil,
  Database,
  Upload,
  Download,
  Trash2,
  PlusCircle,
  ShieldCheck,
  RefreshCw,
  FileJson,
  Eraser,
  Star,
  Award,
  Crown,
  ChevronDown,
  ChevronUp,
  Palette,
  Send,
  X,
  Paperclip,
  Bot,
  Zap,
  Trophy,
  Share2,
  HelpCircle,
  Info,
  Tag,
  BarChart2,
  TrendingUp,
  Calendar,
  ChevronDown as ChevronDownIcon,
  MessageCircle,
  Filter,
  RefreshCcw,
  DollarSign,
  Banknote,
  Sun,
  Moon,
  Shield,
  Gift,
  Headphones,
  Link2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { createClient } from "@supabase/supabase-js";
import { 
  Category, 
  Subcategory, 
  SubSubCategory, 
  Product, 
  UserData, 
  Order, 
  Transaction, 
  PaymentMethod, 
  Banner, 
  Offer,
} from "./types";
import { ToastContainer, showToast } from "./components/ToastContainer";
import GooglePhoneGateModal from "./components/GooglePhoneGateModal";
import { CustomDialogContainer, showDialog, showConfirm, showPromptDialog } from "./components/CustomDialogContainer";
import OrderPollingStatus from "./components/OrderPollingStatus";
import AdminUserCard from "./components/AdminUserCard";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminHomePage from "./pages/AdminHomePage";
import AdminStatsPage from "./pages/AdminStatsPage";
import AdminOrdersAdminPage from "./pages/AdminOrdersAdminPage";
import AdminTransactionsPage from "./pages/AdminTransactionsPage";
import AdminElementsPage from "./pages/AdminElementsPage";
import AdminPage from "./pages/AdminPage";
import DevManagementPage from "./pages/DevManagementPage";
import { saveAdminSession, clearAdminSession } from "./utils/permissions";
import { useStoreAppearance, gridColsClass, ratioToClass, applyThemeToDocument } from "./utils/useStoreAppearance";
import { uploadImage } from "./utils/uploadImage";
import AdminChatPage from "./pages/AdminChatPage";
import ChatSettingsPage from "./pages/ChatSettingsPage";
import ApiDocsPage from "./pages/ApiDocsPage";
import AdminImageUpload from "./components/AdminImageUpload";
import OptimizedImage from "./components/OptimizedImage";
import { CurrencyDropdown } from "./components/CurrencyDropdown";

// --- Supabase Configuration ---
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);



// --- Error Boundary ---
export class ErrorBoundary extends (Component as any) {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    const userStr = localStorage.getItem("userId");
    const user = userStr ? JSON.parse(userStr) : null;
    fetch("/api/report-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: error?.toString(),
        stack: errorInfo?.componentStack,
        userInfo: user ? { id: user.id, name: user.name } : "Guest"
      })
    }).catch(console.error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-gray-50">
          <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
            <XCircle size={48} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">عذراً، حدث خطأ في هذه الصفحة</h1>
          <p className="text-gray-600 mb-4 max-w-md">
            لقد واجه التطبيق مشكلة أثناء عرض هذا القسم. تفاصيل الخطأ موضحة أدناه، ويمكنك إعادة تحميل الصفحة للمتابعة.
          </p>
          <div dir="ltr" className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-left text-sm text-red-700 max-w-md overflow-auto whitespace-pre-wrap break-words">
            {this.state.error?.message || this.state.error?.toString() || "تفاصيل الخطأ غير متوفرة"}
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-brand text-white rounded-lg font-bold shadow-lg shadow-brand-soft"
          >
            إعادة تحميل التطبيق
          </button>
          {process.env.NODE_ENV === 'development' && (
            <pre className="mt-8 p-4 bg-gray-100 rounded-md text-left text-xs overflow-auto max-w-full">
              {this.state.error?.stack || this.state.error?.toString()}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// AdminImageUpload extracted to src/components/AdminImageUpload.tsx

// Toast system (ToastContainer + showToast) extracted to ./components/ToastContainer
// Custom dialog system (CustomDialogContainer + showDialog/showConfirm/showPromptDialog) extracted to ./components/CustomDialogContainer

// WalletChargeView extracted (together with WalletView, its sole consumer) to src/pages/WalletPage.tsx

// ===== PIXEL MORPH SPINNER =====
const pixelMorphStyles = `
  @keyframes pixMorph {
    0%, 100% { transform: scale(1); opacity: 1; border-radius: 2px; }
    40%       { transform: scale(0.2); opacity: 0.2; border-radius: 50%; }
    70%       { transform: scale(1.2); opacity: 0.9; border-radius: 3px; }
  }
  .spinner-pixel {
    display: grid;
    grid-template-columns: repeat(5, 12px);
    grid-template-rows: repeat(5, 12px);
    gap: 2px;
  }
  .px {
    width: 12px;
    height: 12px;
    border-radius: 2px;
    background-color: var(--c1);
    animation: pixMorph 2.4s ease-in-out infinite;
  }
  .px:nth-child(3n)  { background-color: var(--c2); animation-delay: 0.2s; }
  .px:nth-child(5n)  { background-color: var(--c3); animation-delay: 0.5s; }
  .px:nth-child(7n)  { animation-delay: 0.8s; }
  .px:nth-child(11n) { animation-delay: 1.1s; }
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
        root.style.setProperty("--c1", "hsl(0, 0%, 75%)");
        root.style.setProperty("--c2", "hsl(0, 0%, 45%)");
        root.style.setProperty("--c3", "hsl(0, 0%, 20%)");
        return;
      }
      const [h, s] = hsl;
      root.style.setProperty("--c1", `hsl(${h}, ${s}%, 75%)`);
      root.style.setProperty("--c2", `hsl(${h}, ${s}%, 50%)`);
      root.style.setProperty("--c3", `hsl(${h}, ${s}%, 30%)`);
    };

    applyFromBrand();
    const observer = new MutationObserver(applyFromBrand);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <style>{pixelMorphStyles}</style>
      <div className="spinner-pixel">
        {Array.from({ length: 25 }).map((_, i) => (
          <div key={i} className="px" />
        ))}
      </div>
    </>
  );
}
// ===== END PIXEL MORPH SPINNER =====

export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [user, setUser] = useState<UserData | null>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const [view, setView] = useState<{ type: string; id?: number; data?: any; catId?: number; fromSubSub?: boolean; subId?: number; subName?: string; fromFav?: boolean }>({ type: "main" });
  const [pageLoading, setPageLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [subSubCategories, setSubSubCategories] = useState<SubSubCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [checkoutQuantity, setCheckoutQuantity] = useState<number>(0);
  const [checkoutOrderResult, setCheckoutOrderResult] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const { appearance } = useStoreAppearance();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedChatUser, setSelectedChatUser] = useState<any>(null);
  const [adminAuth, setAdminAuth] = useState(false);
  const [adminTab, setAdminTab] = useState("admin_home");
  const [focusTarget, setFocusTarget] = useState<{ type: string; id: any } | null>(null);
  const [themeModal, setThemeModal] = useState({ isOpen: false, color: "#10b981" });
  const [newAdminPass, setNewAdminPass] = useState("");
  const [showAllRewards, setShowAllRewards] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [siteSettings, setSiteSettings] = useState<any[]>([]);
  const [maintenanceIpAllowed, setMaintenanceIpAllowed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem("theme") === "dark");
  // -- Currency state (dynamic multi-currency system) --
  interface CurrencyOption { id: number; name: string; symbol: string; exchange_rate: number; is_active: boolean; is_default: boolean; }
  const [availableCurrencies, setAvailableCurrencies] = useState<CurrencyOption[]>([]);
  const [currency, setCurrency] = useState<"USD" | number>(() => {
    const stored = localStorage.getItem("currencyId");
    return stored ? Number(stored) : "USD";
  });
  const [sypRate, setSypRate] = useState<number>(() => {
    const stored = localStorage.getItem("sypRate");
    return stored ? parseFloat(stored) : 0;
  });
  const [currentCurrencySymbol, setCurrentCurrencySymbol] = useState<string>(() => localStorage.getItem("currencySymbol") || "ل.س");
  const [sypRateUpdatedAt, setSypRateUpdatedAt] = useState<string>(() => localStorage.getItem("sypRateUpdatedAt") || "");
  const [showRateTooltip, setShowRateTooltip] = useState(false);
  const [userPickedCurrency, setUserPickedCurrency] = useState<boolean>(() => localStorage.getItem("userPickedCurrency") === "1");
  const [voucherCode, setVoucherCode] = useState("");
  // ── Wallet charge form states (رُفعت هنا لمنع ضياع البيانات عند إعادة الرسم) ──
  // wallet state moved inside WalletChargeView for keyboard stability
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockCountdown, setBlockCountdown] = useState(0);
  const [isPermanentlyBanned, setIsPermanentlyBanned] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [linkingModal, setLinkingModal] = useState<{ isOpen: boolean; code: string; timeLeft: number }>({
    isOpen: false,
    code: "",
    timeLeft: 0
  });
  const [telegramBotStatus, setTelegramBotStatus] = useState<{ available: boolean; bot_username: string }>({
    available: true,
    bot_username: "saraqib_store_bot"
  });

  // ===== GOOGLE OAUTH LOADING OVERLAY =====
  // نُهيّئه فوراً بناءً على الـ hash عند أول تحميل لتفادي أي وميض قبل ظهور شاشة "جاري تسجيل الدخول"
  const [googleAuthLoading, setGoogleAuthLoading] = useState<boolean>(() => {
    const h = window.location.hash;
    return h.includes('access_token') && h.includes('google_oauth');
  });

  // ===== [PHONE-GATE] رقم الهاتف إجباري بعد تسجيل الدخول عبر Google =====
  // عندما يرد الخادم بـ requiresPhone نخزّن هنا التوكن المؤقت لعرض مودال
  // إجباري لتعبئة رمز الدولة ورقم الهاتف قبل إتمام الدخول للواجهة.
  const [googlePhoneGate, setGooglePhoneGate] = useState<{ googleTempToken: string; name?: string; avatarUrl?: string | null } | null>(null);

  // ===== HOME SORT MODE & FAVORITES =====
  const [homeSortMode, setHomeSortMode] = useState<"categories" | "most_purchased" | "favorites">("categories");
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [mostPurchased, setMostPurchased] = useState<any[]>([]);
  const [mostPurchasedLoading, setMostPurchasedLoading] = useState(false);
  const [favorites, setFavorites] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem("saraqib_store_favorites") || "[]"); } catch { return []; }
  });
  const [longPressTarget, setLongPressTarget] = useState<any | null>(null);
  const [longPressPos, setLongPressPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // ===== ONBOARDING TUTORIAL STATE =====
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);

  // ===== CUSTOM DIALOG STATE =====
  const [dialogOpen, setDialogOpen] = useState(false);

  // ===== NAVIGATION HISTORY STACK =====
  const [viewHistory, setViewHistory] = useState<any[]>([]);

  const navigate = useNavigate();
  const location = useLocation();

  const navigateTo = useCallback((newView: any) => {
    setViewHistory(prev => [...prev, newView]);
    setView(newView);
  }, []);

  const navigateBack = useCallback(() => {
    setViewHistory(prev => {
      if (prev.length <= 1) {
        setView({ type: "main" });
        setActiveTab("home");
        return [];
      }
      const currentView = prev[prev.length - 1];
      // إذا وصلنا للصفحة الحالية عبر most_purchased نرجع للرئيسية مباشرة
      if (currentView?.fromMostPurchased) {
        setView({ type: "main" });
        setActiveTab("home");
        setHomeSortMode("categories");
        return [];
      }
      const newHistory = prev.slice(0, -1);
      const prevView = newHistory[newHistory.length - 1];
      setView(prevView);
      return newHistory;
    });
  }, []);

  // ===== ROUTER SYNC BRIDGE =====
  // Map view.type / activeTab / adminTab → URL (runs whenever state changes)
  const _routerSyncSkip = useRef(false);
  // حفظ الـ hash فوراً عند mount قبل أن يستدعي أي navigate() ويمسحه
  const _initialHash = useRef(window.location.hash);
  useEffect(() => {
    fetch("/api/telegram-bot/user-status")
      .then(res => res.json())
      .then(data => setTelegramBotStatus({ available: !!data.available, bot_username: data.bot_username || "saraqib_store_bot" }))
      .catch(() => setTelegramBotStatus({ available: false, bot_username: "saraqib_store_bot" }));
  }, []);

  useEffect(() => {
    if (window.location.hash.includes('access_token')) return;
    if (_routerSyncSkip.current) { _routerSyncSkip.current = false; return; }
    if (location.pathname === "/api-docs" || location.pathname === "/api-docs/") return;
    let url = "/home";
    if (isAdmin) {
      switch (adminTab) {
        case "admin_home":       url = "/admin"; break;
        case "admin_stats":      url = "/admin/stats"; break;
        case "admin_orders":     url = "/admin/orders"; break;
        case "admin_transactions": url = "/admin/transactions"; break;
        case "admin_elements":   url = "/admin/elements"; break;
        case "chat":             url = "/admin/chat"; break;
        default:                 url = "/admin"; break;
      }
    } else if (view.type === "admin_login") {
      url = "/admin/login";
    }
    if (location.pathname !== url) {
      navigate(url, { replace: false });
    }
  }, [view, activeTab, adminTab, isAdmin]);

  // On mount: read URL and set matching state
  useEffect(() => {
    const path = location.pathname;
    if (path === "/api-docs" || path === "/api-docs/") return;
    const setFromUrl = () => {
      _routerSyncSkip.current = true;
      if (path === "/admin/login") {
        setView({ type: "admin_login" });
      } else if (path.startsWith("/admin")) {
        const seg = path.replace("/admin", "").replace(/^\//, "");
        if (seg === "stats") setAdminTab("admin_stats");
        else if (seg === "orders") setAdminTab("admin_orders");
        else if (seg === "transactions") setAdminTab("admin_transactions");
        else if (seg === "elements") setAdminTab("admin_elements");
        else if (seg === "chat") setAdminTab("chat");
        else setAdminTab("admin_home");
      } else {
        setAdminTab("admin_home");
      }
    };
    setFromUrl();
  }, []); // run once on mount only

  // ===== PULL TO REFRESH =====
  const pullStartY = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // حفظ المفضلة في localStorage عند التغيير
  useEffect(() => {
    localStorage.setItem("saraqib_store_favorites", JSON.stringify(favorites));
  }, [favorites]);

  const addToFavorites = (item: any) => {
    setFavorites(prev => {
      const exists = prev.some(f => f._fav_key === item._fav_key);
      if (exists) return prev;
      return [...prev, item];
    });
    setLongPressTarget(null);
  };

  const removeFromFavorites = (favKey: string) => {
    setFavorites(prev => prev.filter(f => f._fav_key !== favKey));
  };

  const isFavorite = (favKey: string) => favorites.some(f => f._fav_key === favKey);

  const fetchMostPurchased = async () => {
    if (mostPurchasedLoading) return;
    setMostPurchasedLoading(true);
    try {
      const token = localStorage.getItem("authToken") || "";
      const res = await fetch("/api/most-purchased", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setMostPurchased(data || []);
      }
    } catch {}
    setMostPurchasedLoading(false);
  };

  // useLongPress helper داخلي
  const useLongPressHandlers = (item: any, e: React.TouchEvent | React.MouseEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setLongPressTarget(item);
    setLongPressPos({ x: rect.left + rect.width / 2, y: rect.top });
  };
  // ===== END HOME SORT MODE & FAVORITES =====

  // Theme effect
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // أظهر الإشعار كل 5 جلسات فقط وليس كل جلسة
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
      if (!isStandalone) {
        const sessionKey = "saraqib_store_install_session";
        const lastShownKey = "saraqib_store_install_last_session";
        // رقم الجلسة الحالية
        const currentSession = parseInt(sessionStorage.getItem(sessionKey) || "0");
        if (currentSession === 0) {
          // جلسة جديدة — زد العداد في localStorage
          const totalSessions = parseInt(localStorage.getItem(lastShownKey) || "0") + 1;
          localStorage.setItem(lastShownKey, String(totalSessions));
          sessionStorage.setItem(sessionKey, String(totalSessions));
          // أظهر فقط إذا كانت الجلسة مضاعف 5
          if (totalSessions % 5 === 1 || totalSessions === 1) {
            setTimeout(() => setShowInstallBanner(true), 2000);
          }
        }
      }
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    setShowInstallBanner(false);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const subscribeToPush = async (userId: number) => {
    try {
      if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
      if (Notification.permission === "default") await Notification.requestPermission();
      if (Notification.permission !== "granted") return;

      const registration = await navigator.serviceWorker.ready;
      const keyRes = await fetch("/api/push/key");
      if (!keyRes.ok) return;
      const { publicKey } = await keyRes.json();
      if (!publicKey) return;

      // إلغاء الـ subscription القديم دائماً لضمان الـ key الصحيح
      const existingSub = await registration.pushManager.getSubscription();
      if (existingSub) await existingSub.unsubscribe();

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("authToken") || ""}` },
        body: JSON.stringify({ userId, subscription })
      }).catch(() => {});
    } catch (e: any) {
      // تجاهل كل أخطاء Push بصمت - لا تؤثر على عمل التطبيق
    }
  };

  useEffect(() => {
    if (user && 'serviceWorker' in navigator && 'PushManager' in window) {
      subscribeToPush(user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
    // Recompute --brand-contrast (and the other brand CSS vars) for the new
    // mode right away, so contrast updates instantly on toggle instead of
    // only after a page refresh re-runs useStoreAppearance's mount effect.
    applyThemeToDocument(appearance);
  }, [isDarkMode, appearance.theme_mode, appearance]);

  // Supabase Realtime Subscriptions
  useEffect(() => {
    const channels = [
      supabase.channel('categories-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, fetchCategories).subscribe(),
      supabase.channel('products-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        // Refresh products if we are in a product view
        if (view.type === "products" && view.id) {
          fetchProducts(view.id, view.fromSubSub);
        }
      }).subscribe(),
      supabase.channel('banners-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'banners' }, fetchBanners).subscribe(),
      supabase.channel('offers-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'offers' }, fetchOffers).subscribe(),
      supabase.channel('settings-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => {
        // لا نعيد تحميل الصفحة أبداً - نكتفي بتحديث الإعدادات بهدوء
        // window.location.reload() محذوف نهائياً لأنه يُخرج المستخدم من صفحة الدفع
        fetchSiteSettings();
      }).subscribe(),
    ];

    if (user) {
      channels.push(
        supabase.channel(`user-${user.id}-changes`).on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'users', 
          filter: `id=eq.${user.id}` 
        }, (payload) => {
          setUser(prev => prev ? { ...prev, ...payload.new } : null);
          // بيانات المستخدم تبقى في React state فقط
        }).subscribe()
      );
      
      channels.push(
        supabase.channel(`user-stats-${user.id}-changes`).on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'user_stats', 
          filter: `user_id=eq.${user.id}` 
        }, (payload) => {
          setUserStats(payload.new);
        }).subscribe()
      );

      channels.push(
        supabase.channel(`user-notifications-${user.id}`).on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, fetchNotifications).subscribe()
      );
    }

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [user?.id]);

  // Block countdown effect
  useEffect(() => {
    let interval: any;
    if (isBlocked && blockCountdown > 0) {
      interval = setInterval(() => {
        setBlockCountdown(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isBlocked, blockCountdown]);

  // Telegram linking timer effect
  useEffect(() => {
    let interval: any;
    if (linkingModal.isOpen && linkingModal.timeLeft > 0) {
      interval = setInterval(() => {
        setLinkingModal(prev => ({ ...prev, timeLeft: Math.max(0, prev.timeLeft - 1) }));
      }, 1000);
    } else if (linkingModal.timeLeft === 0 && linkingModal.isOpen) {
      setLinkingModal(prev => ({ ...prev, isOpen: false }));
    }
    return () => clearInterval(interval);
  }, [linkingModal.isOpen, linkingModal.timeLeft]);

  // ── adminFetch: جميع طلبات الأدمن تُرسل التوكن تلقائياً ──
  // ملاحظة: تم استخدام useCallback بمصفوفة اعتماديات فارغة لضمان أن adminFetch
  // يحتفظ بنفس المرجع (reference) عبر كل عمليات إعادة الرسم (re-renders).
  // بدون هذا، كانت أي صفحة تعتمد على adminFetch داخل useEffect (مثل صفحة المخزون)
  // تُعيد التحميل وتُظهر "جاري التحميل" كل مرة يُعاد فيها رسم App (مثلاً كل ثانية
  // بسبب عدّاد ربط الحساب، أو كل 30 ثانية بسبب تحديث الإشعارات).
  const adminFetch = useCallback((url: string, options: RequestInit = {}): Promise<Response> => {
    const token = localStorage.getItem("adminToken") || "";
    const existingHeaders = (options.headers as Record<string, string>) || {};
    const hasStringBody = typeof options.body === "string";
    return fetch(url, {
      ...options,
      headers: {
        ...(hasStringBody ? { "Content-Type": "application/json" } : {}),
        ...existingHeaders,
        "x-admin-token": token,
      }
    }).then((res) => {
      // [FIX] توكن الأدمن صالح 4 ساعات فقط. سابقاً عند انتهائه كانت كل صفحة تتلقى 401 وتتجاهله
      // بصمت (catch{} فارغ)، فتبقى الصفحة عالقة على "جاري التحميل" أو بيانات فارغة دون أي تنبيه،
      // ويمتلئ الكونسول بأخطاء 401 متكررة. الآن: عند 401 (وليس 403 الذي يعني نقص صلاحية فقط)
      // نُسجّل خروج الأدمن تلقائياً ونعيد التوجيه لصفحة الدخول مرة واحدة.
      if (res.status === 401 && localStorage.getItem("adminToken")) {
        clearAdminSession();
        setIsAdmin(false);
        setAdminAuth(false);
        setView({ type: "admin_login" });
      }
      return res;
    });
  }, []);

  // ===== BACK BUTTON =====
  // react-router-dom's BrowserRouter now manages browser back/forward.
  // The old manual popstate + pushState handler is removed to avoid conflicts.

  // ===== PULL TO REFRESH (DISABLED) =====
  useEffect(() => {
    if (activeTab !== 'home') return;
    const onTouchStart = (_e: TouchEvent) => {};
    const onTouchMove = (_e: TouchEvent) => {};
    const onTouchEnd = async () => {
      if (false) {
        setPullDistance(0);
        setIsPulling(false);
      }
    };
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd);
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [activeTab, pullDistance, isRefreshing]);

  // إعادة فحص وضع الصيانة دورياً حتى تنعكس التفعيل/الإيقاف على الجلسات المفتوحة فوراً تقريباً
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSiteSettings();
      fetchMaintenanceStatus();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Fetch initial data
  useEffect(() => {
    fetchCategories();
    fetchSubcategories();
    fetchSubSubCategories();
    fetchPaymentMethods();
    fetchBanners();
    fetchOffers();
    fetchSiteSettings();
    fetchMaintenanceStatus();
    fetchCurrencies(); // جلب العملات الديناميكية من قاعدة البيانات
    const savedUserId = localStorage.getItem("userId");
    if (savedUserId && !isNaN(Number(savedUserId))) {
      fetchUser(Number(savedUserId));
    }

    // Handle Google OAuth redirect callback (hash fragment contains access_token)
    const handleGoogleRedirectCallback = async () => {
      // استخدم النسخة المحفوظة من الـ hash عند الـ mount قبل أن يمسحها navigate()
      const hash = _initialHash.current;
      _initialHash.current = ''; // امسحه بعد أول قراءة
      if (!hash.includes('access_token')) return;
      const params = new URLSearchParams(hash.replace('#', ''));
      const accessToken = params.get('access_token');
      const state = params.get('state');
      if (!accessToken || state !== 'google_oauth') return;

      // Clean URL immediately
      window.history.replaceState(null, '', window.location.pathname);
      setGoogleAuthLoading(true);

      try {
        const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!profileRes.ok) {
          showToast("فشل تسجيل الدخول عبر Google، حاول مجدداً", "error");
          return;
        }
        const profile = await profileRes.json();

        const res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken, googleId: profile.sub, email: profile.email, name: profile.name, picture: profile.picture })
        });
        const data = await res.json();
        if (res.ok && data.requiresPhone) {
          // ── [PHONE-GATE] الحساب (جديد أو بدون رقم هاتف) — نعرض المودال الإجباري
          //    ولا نُدخل المستخدم للواجهة قبل تعبئته ──
          setGooglePhoneGate({ googleTempToken: data.googleTempToken, name: data.name, avatarUrl: data.avatarUrl });
          return;
        }
        if (res.ok) {
          setUser(data);
          if (data.token) localStorage.setItem('authToken', data.token);
          localStorage.setItem('userId', String(data.id));
          setView({ type: 'main' });
          setActiveTab('home');
          if (data.isNew) {
            setOnboardingStep(0);
            setShowOnboarding(true);

            // إذا دخل المستخدم عبر رابط إحالة وسجّل حساباً جديداً عبر Google، نطبّق كود الإحالة مباشرة
            const pendingReferralCode = localStorage.getItem("referralCode");
            if (pendingReferralCode && data.token) {
              try {
                const refRes = await fetch('/api/referrals/apply', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.token}` },
                  body: JSON.stringify({ referralCode: pendingReferralCode })
                });
                if (refRes.ok) localStorage.removeItem("referralCode");
              } catch { /* لا نمنع تسجيل الدخول إن فشل تطبيق الإحالة */ }
            }
          }
        } else {
          showToast(data.error || "فشل تسجيل الدخول عبر Google، حاول مجدداً", "error");
        }
      } catch {
        showToast("فشل الاتصال بالخادم أثناء تسجيل الدخول عبر Google", "error");
      } finally {
        setGoogleAuthLoading(false);
      }
    };
    handleGoogleRedirectCallback();


    // Handle referral code from URL
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    if (ref) {
      localStorage.setItem("referralCode", ref);
      if (!savedUserId) {
        setView({ type: "login" });
      }
    }

    // Handle Admin Route — استعادة الجلسة إن وُجد توكن محفوظ (يعمل الآن افتراضياً على "/")
    {
      const savedAdminToken = localStorage.getItem("adminToken");
      if (savedAdminToken) {
        // تحقق من صلاحية التوكن قبل الدخول المباشر
        fetch("/api/admin/verify-token", {
          headers: { "x-admin-token": savedAdminToken }
        })
          .then(res => res.json())
          .then(data => {
            if (data.valid) {
              saveAdminSession(data.role || "admin", data.permissions || {}, data.name || "");
              setIsAdmin(true);
              setAdminAuth(true);
              setView({ type: "main" });
            } else {
              // التوكن منتهي أو غير صالح (أو حساب مسؤول ثانوي عُطِّل) — احذفه واطلب تسجيل الدخول
              clearAdminSession();
              setView({ type: "admin_login" });
            }
          })
          .catch(() => {
            // خطأ في الاتصال — اعرض صفحة تسجيل الدخول
            setView({ type: "admin_login" });
          });
      } else {
        setView({ type: "admin_login" });
      }
    }
    return () => {};
  }, []);

  useEffect(() => {
    if (user?.stats?.custom_theme_color && user.stats.custom_theme_color.startsWith('#')) {
      document.documentElement.style.setProperty('--custom-primary', user.stats.custom_theme_color);
      document.documentElement.style.setProperty('--custom-primary-light', `${user.stats.custom_theme_color}1a`);
    } else {
      document.documentElement.style.removeProperty('--custom-primary');
      document.documentElement.style.removeProperty('--custom-primary-light');
    }
  }, [user?.stats?.custom_theme_color]);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem("authToken") || "";
      const res = await fetch(`/api/notifications/${user.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error(`Failed to fetch notifications: ${res.status}`);
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Expected JSON response from notifications API");
      }
      const data = await res.json();
      const serverNotifs = (Array.isArray(data) ? data : []).map((n: any) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        created_at: n.created_at,
        is_read: n.is_read
      }));

      // Add the TG link warning if needed
      if (user.telegram_chat_id) {
        serverNotifs.unshift({
          id: 'tg-link',
          title: 'تم ربط حسابك ببوت تلجرام',
          message: 'لقد تم ربط حسابك ببوت تلجرام. إن لم تكن أنت، يرجى الضغط على فك الارتباط وتغيير بياناتك.',
          type: 'warning',
          is_read: false
        } as any);
      }
      setNotifications(serverNotifs);
    } catch (e: any) {
      if (e.name === 'TypeError' && e.message === 'Failed to fetch') return;
      console.error("Fetch notifications error:", e);
    }
  };

  useEffect(() => {
    if (user && !isAdmin) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000); // Refresh every 30s
      return () => clearInterval(interval);
    } else if (!user) {
      setNotifications([]);
    }
  }, [user, isAdmin]);

  const markNotificationRead = async (id: number | string) => {
    // Optimistic update - mark as read in local state immediately
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    if (typeof id === 'string') return; // Local notifs - no API call needed
    try {
      await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("authToken") || ""}` },
        body: JSON.stringify({ notificationId: id })
      });
      // Re-fetch to sync with server
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const markAllNotificationsRead = async () => {
    const unread = (Array.isArray(notifications) ? notifications : []).filter(n => !n.is_read);
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    for (const n of unread) {
      if (typeof n.id !== 'string') {
        try {
          await fetch("/api/notifications/mark-read", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("authToken") || ""}` },
            body: JSON.stringify({ notificationId: n.id })
          });
        } catch {}
      }
    }
    fetchNotifications();
  };

  const handleUnlinkTelegram = async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem("authToken") || "";
      const res = await fetch("/api/user/unlink-telegram", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ userId: user.id })
      });
      if (res.ok) {
        fetchUser(user.id);
        showToast("تم فك الارتباط بنجاح.", 'success');
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || "فشل فك الارتباط، حاول مجدداً", 'error');
      }
    } catch (e) {
      console.error(e);
      showToast("فشل الاتصال بالخادم", 'error');
    }
  };

  const handleGenerateLinkingCode = async () => {
    if (!user) return;
    if (!telegramBotStatus.available) {
      showToast("لم يتم اضافة بوت بعد", 'error');
      return;
    }
    try {
      const res = await fetch("/api/user/generate-linking-code", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("authToken") || ""}` },
        body: JSON.stringify({ userId: user.id })
      });
      const data = await res.json();
      if (res.ok) {
        setLinkingModal({
          isOpen: true,
          code: data.code,
          timeLeft: 600 // 10 minutes
        });
      } else if (res.status === 503) {
        setTelegramBotStatus(prev => ({ ...prev, available: false }));
        showToast(data.error || "لم يتم اضافة بوت بعد", 'error');
      } else {
        showToast(data.error || "فشل توليد الكود", 'error');
      }
    } catch (e) {
      console.error(e);
      showToast("خطأ في الاتصال بالسيرفر", 'error');
    }
  };

  const handleUpdateTheme = async (color: string) => {
    if (!user) return;
    try {
      const res = await fetch("/api/user/update-theme", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("authToken") || ""}` },
        body: JSON.stringify({ color })
      });
      if (res.ok) {
        fetchUser(user.id);
        setThemeModal({ ...themeModal, isOpen: false });
      }
    } catch (e) {
      showToast("فشل تحديث الثيم", 'error');
    }
  };

  const handleChangeAdminPassword = async () => {
    if (!newAdminPass) return showToast("يرجى إدخال كلمة المرور الجديدة", 'error');
    try {
      const res = await adminFetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: newAdminPass })
      });
      if (res.ok) {
        showToast("تم تغيير كلمة المرور بنجاح", 'success');
        setNewAdminPass("");
      }
    } catch (e) {
      showToast("فشل تغيير كلمة المرور", 'error');
    }
  };

  // Helper: يجيب الـ auth token من localStorage
  const getAuthToken = (): string => localStorage.getItem("authToken") || "";

  // [FIX] اعتراض عام لكل طلبات fetch: أي رد 403 مع banned:true من السيرفر
  // يعني أن الحساب محظور الآن (تم فحصه في middleware الـ authenticate على كل طلب)
  // هذا يضمن التوجيه الفوري لصفحة الحظر بغض النظر عن الصفحة أو الجهاز المستخدم
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const response = await originalFetch(...args);
      if (response.status === 403) {
        try {
          const cloned = response.clone();
          const data = await cloned.json();
          if (data && data.banned) {
            setIsBlocked(true);
            setIsPermanentlyBanned(true);
            setBlockCountdown(0);
          }
        } catch {
          // تجاهل استجابات غير JSON
        }
      }
      return response;
    };
    return () => { window.fetch = originalFetch; };
  }, []);

  const fetchUser = useCallback(async (id: number) => {
    if (!id || isNaN(id)) return;
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/user/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) {
        if (res.status === 404) {
          console.warn(`User ${id} not found`);
          return;
        }
        throw new Error(`Failed to fetch user: ${res.status}`);
      }
      
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("Expected JSON but got:", text.substring(0, 100));
        return;
      }

      const data = await res.json();
      if (data) {
        setUser(data);
        if (data.token) localStorage.setItem("authToken", data.token);
        
        // [FIX] دعم الحظر الدائم (is_banned بدون تاريخ انتهاء) وليس فقط الحظر المؤقت
        if (data.blocked_until) {
          const until = new Date(data.blocked_until);
          const now = new Date();
          if (until > now) {
            setIsBlocked(true);
            setIsPermanentlyBanned(false);
            setBlockCountdown(Math.floor((until.getTime() - now.getTime()) / 1000));
          } else {
            setIsBlocked(false);
            setIsPermanentlyBanned(false);
          }
        } else if (data.is_banned) {
          setIsBlocked(true);
          setIsPermanentlyBanned(true);
          setBlockCountdown(0);
        } else {
          setIsBlocked(false);
          setIsPermanentlyBanned(false);
        }
      }
    } catch (e: any) {
      if (e.name === 'TypeError' && e.message === 'Failed to fetch') {
        // Silent network error (likely server restarting)
        return;
      }
      console.error("Fetch user error:", e);
    }
  }, []);

  const handleRedeemVoucher = async () => {
    if (!user || !voucherCode) return;
    try {
      const res = await fetch("/api/vouchers/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("authToken") || ""}` },
        body: JSON.stringify({ code: voucherCode })
      });
      
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Expected JSON response from redeem voucher API");
      }

      const data = await res.json();
      if (res.ok) {
        showToast(`تم شحن ${data.amount}$ بنجاح!`, 'success');
        setVoucherCode("");
        fetchUser(user.id);
      } else {
        showToast(`${data.error}`, 'error');
      }
    } catch (e: any) {
      if (e.name === 'TypeError' && e.message === 'Failed to fetch') {
        showToast("فشل الاتصال بالخادم (تأكد من اتصالك بالإنترنت)", 'error');
      } else {
        showToast("فشل الاتصال بالخادم", 'error');
      }
    }
  };

  const fetchSiteSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (!res.ok) return;
      const data = await res.json();
      const settingsArray = Array.isArray(data) ? data : [];
      setSiteSettings(settingsArray);
    } catch (e) { console.error("Fetch settings error:", e); }
  };

  const fetchMaintenanceStatus = async () => {
    try {
      setMaintenanceIpAllowed(true); return; // لوحة التحكم دائماً متاحة على "/"
      const res = await fetch("/api/maintenance-status");
      if (!res.ok) { setMaintenanceIpAllowed(false); return; } // فشل التحقق = عدم السماح (أكثر أماناً)
      const data = await res.json();
      setMaintenanceIpAllowed(!!data?.allowed);
    } catch (e) { setMaintenanceIpAllowed(false); } // لا نسمح بالدخول إن تعذّر التحقق أثناء تفعيل الصيانة
  };

  const fetchCurrencies = async () => {
    try {
      const res = await fetch("/api/currencies");
      if (res.ok) {
        const data = await res.json();
        const list: CurrencyOption[] = Array.isArray(data.currencies) ? data.currencies : [];
        setAvailableCurrencies(list);

        const defaultCur = data.defaultCurrency || null;
        const pickedManually = localStorage.getItem("userPickedCurrency") === "1";

        if (defaultCur) {
          setSypRate(parseFloat(defaultCur.exchange_rate));
          setCurrentCurrencySymbol(defaultCur.symbol);
          localStorage.setItem("sypRate", String(defaultCur.exchange_rate));
          localStorage.setItem("currencySymbol", defaultCur.symbol);
          const now = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
          setSypRateUpdatedAt(now);
          localStorage.setItem("sypRateUpdatedAt", now);

          // إذا لم يختر المستخدم عملة يدوياً، نفعّل العملة الافتراضية تلقائياً بدلاً من الدولار
          if (!pickedManually) {
            setCurrency(defaultCur.id);
            localStorage.setItem("currencyId", String(defaultCur.id));
          } else {
            // إذا كانت العملة المختارة يدوياً هي نفسها، حدّث سعر صرفها
            const storedId = localStorage.getItem("currencyId");
            if (storedId && Number(storedId) === defaultCur.id) {
              setCurrency(defaultCur.id);
            }
          }
        } else if (!pickedManually) {
          setCurrency("USD");
          localStorage.removeItem("currencyId");
        }
      }
    } catch (e) { /* silent */ }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`/api/categories${isAdmin ? "?admin=1" : ""}`);
      if (!res.ok) throw new Error(`Failed to fetch categories: ${res.status}`);
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Expected JSON response from categories API");
      }
      const data = await res.json();
      setCategories(data || []);
    } catch (e: any) {
      if (e.name === 'TypeError' && e.message === 'Failed to fetch') return;
      console.error("Fetch categories error:", e);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const res = await fetch(`/api/payment-methods${isAdmin ? "?admin=1" : ""}`);
      if (!res.ok) throw new Error(`Failed to fetch payment methods: ${res.status}`);
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Expected JSON response from payment methods API");
      }
      const data = await res.json();
      setPaymentMethods(data || []);
    } catch (e: any) {
      if (e.name === 'TypeError' && e.message === 'Failed to fetch') return;
      console.error("Fetch payment methods error:", e);
    }
  };

  const fetchBanners = async () => {
    try {
      const res = await fetch(`/api/banners${isAdmin ? "?admin=1" : ""}`);
      if (!res.ok) throw new Error(`Failed to fetch banners: ${res.status}`);
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Expected JSON response from banners API");
      }
      const data = await res.json();
      setBanners(data || []);
    } catch (e: any) {
      if (e.name === 'TypeError' && e.message === 'Failed to fetch') return;
      console.error("Fetch banners error:", e);
    }
  };

  const fetchOffers = async () => {
    try {
      const res = await fetch(`/api/offers${isAdmin ? "?admin=1" : ""}`);
      if (!res.ok) throw new Error(`Failed to fetch offers: ${res.status}`);
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Expected JSON response from offers API");
      }
      const data = await res.json();
      setOffers(data || []);
    } catch (e: any) {
      if (e.name === 'TypeError' && e.message === 'Failed to fetch') return;
      console.error("Fetch offers error:", e);
    }
  };

  const fetchSubcategories = async (catId?: number) => {
    try {
      const base = catId ? `/api/categories/${catId}/subcategories` : "/api/subcategories";
      const url = `${base}${isAdmin ? (base.includes("?") ? "&admin=1" : "?admin=1") : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch subcategories: ${res.status}`);
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Expected JSON response from subcategories API");
      }
      const data = await res.json();
      setSubcategories(data || []);
    } catch (e: any) {
      if (e.name === 'TypeError' && e.message === 'Failed to fetch') return;
      console.error("Fetch subcategories error:", e);
    }
  };

  const fetchSubSubCategories = async (subId?: number): Promise<SubSubCategory[]> => {
    try {
      const base = subId ? `/api/subcategories/${subId}/sub-sub-categories` : "/api/sub-sub-categories";
      const url = `${base}${isAdmin ? (base.includes("?") ? "&admin=1" : "?admin=1") : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch sub-sub-categories: ${res.status}`);
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Expected JSON response from sub-sub-categories API");
      }
      const data = await res.json();
      setSubSubCategories(data || []);
      return data || [];
    } catch (e: any) {
      if (e.name === 'TypeError' && e.message === 'Failed to fetch') return [];
      console.error("Fetch sub-sub-categories error:", e);
      return [];
    }
  };

  const fetchProducts = async (subId: number, isSubSub: boolean = false) => {
    try {
      const url = isSubSub 
        ? `/api/sub-sub-categories/${subId}/products`
        : `/api/subcategories/${subId}/products`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch products: ${res.status}`);
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Expected JSON response from products API");
      }
      const data = await res.json();
      setProducts(data || []);
    } catch (e: any) {
      if (e.name === 'TypeError' && e.message === 'Failed to fetch') return;
      console.error("Fetch products error:", e);
    }
  };

  const fetchOrders = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/orders/user/${user.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("authToken") || ""}` }
      });
      if (!res.ok) throw new Error(`Failed to fetch orders: ${res.status}`);
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Expected JSON response from orders API");
      }
      const data = await res.json();
      setOrders(data || []);
    } catch (e: any) {
      if (e.name === 'TypeError' && e.message === 'Failed to fetch') return;
      console.error("Fetch orders error:", e);
    }
  };

  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem("authToken") || "";
      const res = await fetch(`/api/transactions/user/${user.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error(`Failed to fetch transactions: ${res.status}`);
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Expected JSON response from transactions API");
      }
      const data = await res.json();
      setTransactions(data || []);
    } catch (e: any) {
      if (e.name === 'TypeError' && e.message === 'Failed to fetch') return;
      console.error("Fetch transactions error:", e);
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === "orders") fetchOrders();
    if ((activeTab === "wallet" || view.type === "payments") && transactions.length === 0) fetchTransactions();
  }, [activeTab, view.type, user]);

  // نجلب الطلبات فور تسجيل الدخول (وليس فقط عند فتح صفحة الطلبات) حتى يعمل بادج الطلبات
  // المعلّقة في الشريط السفلي، وحتى يظهر "إجمالي الرصيد المصروف" بشكل صحيح في صفحة الدفعات
  // من أول لحظة بدل أن يظهر صفر لحين زيارة صفحة الطلبات.
  useEffect(() => {
    if (user && orders.length === 0) fetchOrders();
  }, [user]);

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("authToken");
    localStorage.removeItem("userId");
    setIsDrawerOpen(false);
    setActiveTab("home");
    setView({ type: "main" });
  };

  // --- Theme Helper ---
  const getTheme = () => {
    if (user?.stats?.custom_theme_color && user.stats.custom_theme_color.startsWith('#')) {
      return {
        primary: "bg-[var(--custom-primary)]",
        primaryHover: "opacity-90",
        text: "text-[var(--custom-primary)]",
        textDark: "text-[var(--custom-primary)]",
        bgLight: "bg-[var(--custom-primary-light)]",
        border: "border-[var(--custom-primary-light)]",
        shadow: "shadow-[var(--custom-primary-light)]",
        gradient: "from-[var(--custom-primary)] to-[var(--custom-primary)]",
        icon: "text-[var(--custom-primary)]",
        button: "bg-[var(--custom-primary)]",
        buttonHover: "opacity-90"
      };
    }
    if (user?.stats?.custom_theme_color === 'brand') {
      return {
        primary: "bg-brand",
        primaryHover: "hover:opacity-90",
        text: "text-brand",
        textDark: "text-brand",
        bgLight: "bg-brand-light",
        border: "border-brand-soft",
        shadow: "shadow-brand-soft",
        gradient: "from-brand to-brand",
        icon: "text-brand",
        button: "bg-brand",
        buttonHover: "hover:opacity-90"
      };
    }
    if (user?.is_vip || user?.stats?.custom_theme_color === 'yellow') {
      return {
        primary: "bg-amber-500",
        primaryHover: "hover:bg-amber-600",
        text: "text-amber-600",
        textDark: "text-amber-700",
        bgLight: "bg-amber-50",
        border: "border-amber-100",
        shadow: "shadow-amber-100",
        gradient: "from-amber-500 to-yellow-600",
        icon: "text-amber-600",
        button: "bg-amber-600",
        buttonHover: "hover:bg-amber-700"
      };
    }
    return {
      primary: "bg-[var(--brand)]",
      primaryHover: "hover:bg-[var(--brand-dark)]",
      text: "text-[var(--brand)]",
      textDark: "text-[var(--brand-dark)]",
      bgLight: "bg-red-50",
      border: "border-red-100",
      shadow: "shadow-red-100",
      gradient: "from-[var(--brand)] to-[var(--brand-dark)]",
      icon: "text-[var(--brand)]",
      button: "bg-[var(--brand)]",
      buttonHover: "hover:bg-[var(--brand-dark)]"
    };
  };

  const theme = getTheme();

  // دالة تنسيق السعر حسب العملة المختارة (ديناميكية) - موحّدة بثلاث خانات عشرية دائمًا
  const fmtPrice = (usd: number, decimals?: number) => {
    const d = decimals !== undefined ? decimals : 3;
    const num = typeof usd === "number" && !isNaN(usd) ? usd : 0;
    if (currency !== "USD" && sypRate > 0) {
      return `${(num * sypRate).toFixed(d)} ${currentCurrencySymbol}`;
    }
    return `${num.toFixed(d)} $`;
  };

  // --- Admin Panel Helper Components (must be proper components, not IIFEs, to support useState) ---

  const AdminNotifModal = ({ onClose, handleSendNotification }: { onClose: () => void, handleSendNotification: (userId: number | null, title: string, body: string) => Promise<void> }) => {
    const [target, setTarget] = useState<"all"|"one">("all");
    const [uid, setUid] = useState("");
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [sending, setSending] = useState(false);
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
          {target==="one" && <input type="text" placeholder="ID المستخدم" className="w-full p-3 bg-gray-50 rounded-lg text-sm outline-none" value={uid} onChange={e => setUid(e.target.value)}/>}
          <input type="text" placeholder="عنوان الإشعار" className="w-full p-3 bg-gray-50 rounded-lg text-sm outline-none" value={title} onChange={e => setTitle(e.target.value)}/>
          <textarea placeholder="نص الإشعار" className="w-full p-3 bg-gray-50 rounded-lg text-sm outline-none h-20 resize-none" value={body} onChange={e => setBody(e.target.value)}/>
          <button disabled={sending||!title||!body} onClick={async () => { setSending(true); await handleSendNotification(target==="one"&&uid?parseInt(uid):null, title, body); setSending(false); onClose(); }}
            className="w-full bg-[var(--brand)] text-white py-3.5 rounded-lg font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2">
            <Send size={16}/>{sending?"جاري الإرسال...":"إرسال الإشعار"}
          </button>
        </motion.div>
      </motion.div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // AdminProvidersTab — إدارة المزودين الخارجيين (متعدد المزودين + تشفير)
  // ─────────────────────────────────────────────────────────────────────────
  const AdminAhminixTab = ({ categories, subcategories, subSubCategories, fetchCategories, fetchSubcategories, fetchSubSubCategories }: any) => {

    // ── State: قائمة المزودين ──────────────────────────────────────────────
    const [providers, setProviders] = useState<any[]>([]);
    const [loadingProviders, setLoadingProviders] = useState(false);

    // ── State: نموذج إضافة / تعديل مزود ─────────────────────────────────
    const [showProviderForm, setShowProviderForm] = useState(false);
    const [editingProvider, setEditingProvider] = useState<any>(null); // null = إضافة جديد
    const [providerFormData, setProviderFormData] = useState({ name: "", base_url: "", api_token: "", notes: "" });
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

    // ── State: مزامنة المنتجات ────────────────────────────────────────────
    const [targetSubcategoryId, setTargetSubcategoryId] = useState("");
    const [targetSubSubCategoryId, setTargetSubSubCategoryId] = useState("");
    const [markupPercent, setMarkupPercent] = useState<number | "">(0);
    const [globalImageUrl, setGlobalImageUrl] = useState("");
    const [syncLoading, setSyncLoading] = useState(false);
    const [syncResult, setSyncResult] = useState<any>(null);

    // ── State: تحديث الطلبات ──────────────────────────────────────────────
    const [refreshLoading, setRefreshLoading] = useState(false);
    const [refreshResult, setRefreshResult] = useState<any>(null);

    // ── State: فحص طلب ───────────────────────────────────────────────────
    const [checkOrderId, setCheckOrderId] = useState("");
    const [checkLoading, setCheckLoading] = useState(false);
    const [checkResult, setCheckResult] = useState<any>(null);

    // ── State: الأقسام المحلية ────────────────────────────────────────────
    const [localSubcats, setLocalSubcats] = useState<any[]>([]);
    const [localSubSubs, setLocalSubSubs] = useState<any[]>([]);

    // ── State: التبويب النشط ──────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<"providers"|"products"|"orders">("providers");

    useEffect(() => {
      fetchProviders();
      fetch("/api/subcategories").then(r=>r.json()).then(setLocalSubcats).catch(()=>{});
      fetch("/api/sub-sub-categories").then(r=>r.json()).then(setLocalSubSubs).catch(()=>{});
    }, []);

    // عند تغيير المزود المختار — نصفر الحالات المرتبطة به
    useEffect(() => {
      setProviderProfile(null);
      setProviderProducts([]);
      setProductsFetched(false);
      setSelectedProducts([]);
      setSyncResult(null);
      setCheckResult(null);
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
        };
        if (providerFormData.api_token.trim()) body.api_token = providerFormData.api_token.trim();

        if (editingProvider) {
          await adminFetch(`/api/admin/providers/${editingProvider.id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
          });
          showToast("تم تحديث المزود", "success");
        } else {
          await adminFetch("/api/admin/providers", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
          });
          showToast("تم إضافة المزود", "success");
        }
        setShowProviderForm(false);
        setEditingProvider(null);
        setProviderFormData({ name: "", base_url: "", api_token: "", notes: "" });
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
      if (!targetSubcategoryId) { showToast("اختر القسم الفرعي أولاً", "info"); return; }
      if (!selectedProviderId) { showToast("اختر مزوداً أولاً", "info"); return; }
      setSyncLoading(true); setSyncResult(null);
      try {
        const res = await adminFetch(`/api/admin/providers/${selectedProviderId}/sync`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subcategoryId: parseInt(targetSubcategoryId),
            subSubCategoryId: targetSubSubCategoryId ? parseInt(targetSubSubCategoryId) : undefined,
            productIds: selectedProducts.length ? selectedProducts : undefined,
            markupPercent: Number(markupPercent || 0), globalImageUrl: globalImageUrl || undefined
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

    const filteredProducts = providerProducts.filter(p =>
      (!searchQuery || p.name?.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (!categoryFilter || p.category_name === categoryFilter)
    );
    const uniqueCategories = [...new Set(providerProducts.map((p: any) => p.category_name).filter(Boolean))];

    return (
      <div className="space-y-5 pb-8">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-[var(--brand)] to-[var(--brand-dark)] p-6 rounded-lg text-white">
          <div className="flex items-center gap-3 mb-2">
            <ExternalLink size={24}/>
            <h2 className="text-xl font-bold">إدارة المزودين الخارجيين</h2>
          </div>
          <p className="text-white/80 text-sm">ربط مزودي API المتعددين — التوكنات مشفرة بـ AES-256</p>
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
          {([
            { key: "providers", label: "المزودون", icon: <Link2 size={13}/> },
            { key: "products",  label: "المنتجات",  icon: <ShoppingBag size={13}/> },
            { key: "orders",    label: "الطلبات",   icon: <RefreshCw size={13}/> },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === t.key ? "bg-white text-[var(--brand)] shadow-sm" : "text-gray-500"}`}>
              <span className="flex items-center justify-center gap-1">{t.icon} {t.label}</span>
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 1: المزودون
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "providers" && (
          <div className="space-y-4">

            {/* زر إضافة مزود */}
            <button onClick={() => { setEditingProvider(null); setProviderFormData({ name: "", base_url: "", api_token: "", notes: "" }); setShowProviderForm(true); }}
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
                    <label className="text-xs font-bold text-gray-600 mb-1.5 block">رابط API Base URL <span className="text-red-400">*</span></label>
                    <input type="url" placeholder="https://example.com/client/api" value={providerFormData.base_url}
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
                    <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1"><Lock size={12} className="inline mr-1"/> مشفر بـ AES-256-GCM — لا يظهر في أي مكان بعد الحفظ</p>
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
                        </div>
                        <p className="text-[10px] text-gray-400 font-mono truncate mt-0.5">{prov.base_url}</p>
                        {prov.notes && <p className="text-[10px] text-gray-400 mt-0.5 italic">{prov.notes}</p>}
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
                          <button onClick={() => { setEditingProvider(prov); setProviderFormData({ name: prov.name, base_url: prov.base_url, api_token: "", notes: prov.notes || "" }); setShowProviderForm(true); }}
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
                {/* إعدادات الاستيراد */}
                <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm space-y-4">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                    <Download size={16} className="text-[var(--brand)]"/> إعدادات الاستيراد
                  </h3>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">القسم الفرعي <span className="text-red-400">*</span></label>
                    <select value={targetSubcategoryId} onChange={e => { setTargetSubcategoryId(e.target.value); setTargetSubSubCategoryId(""); }}
                      className="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 text-sm outline-none focus:border-[var(--brand)]">
                      <option value="">-- اختر القسم الفرعي --</option>
                      {localSubcats.map((s: any) => <option key={s.id} value={s.id}>{s.name} (#{s.id})</option>)}
                    </select>
                  </div>
                  {targetSubcategoryId && localSubSubs.filter((ss: any) => String(ss.subcategory_id) === String(targetSubcategoryId)).length > 0 && (
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">فرع فرعي <span className="text-gray-300">(اختياري)</span></label>
                      <select value={targetSubSubCategoryId} onChange={e => setTargetSubSubCategoryId(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 text-sm outline-none">
                        <option value="">-- بدون فرع فرعي --</option>
                        {localSubSubs.filter((ss: any) => String(ss.subcategory_id) === String(targetSubcategoryId)).map((ss: any) => <option key={ss.id} value={ss.id}>{ss.name} (#{ss.id})</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">نسبة الربح %</label>
                    <input type="number" min={0} max={500} value={markupPercent} onChange={e => setMarkupPercent(e.target.value === "" ? "" : parseFloat(e.target.value))}
                      className="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 text-sm outline-none" placeholder="0 = بدون هامش"/>
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
                        <div className="flex gap-2">
                          <button onClick={() => setSelectedProducts(filteredProducts.map((p: any) => p.id))} className="text-xs text-[var(--brand)] font-bold">تحديد الكل</button>
                          <span className="text-gray-300">|</span>
                          <button onClick={() => setSelectedProducts([])} className="text-xs text-gray-400 font-bold">إلغاء الكل</button>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                          <input type="text" placeholder="بحث..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-100 rounded-lg pr-8 pl-3 py-2 text-xs outline-none"/>
                        </div>
                        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
                          className="bg-gray-50 border border-gray-100 rounded-lg px-2 py-2 text-xs outline-none max-w-[100px]">
                          <option value="">الكل</option>
                          {uniqueCategories.map((c: any) => <option key={String(c)} value={String(c)}>{String(c)}</option>)}
                        </select>
                      </div>
                      {selectedProducts.length > 0 && (
                        <div className="bg-red-50 text-[var(--brand)] text-xs font-bold px-3 py-2 rounded-lg">
                          تم تحديد {selectedProducts.length} منتج
                        </div>
                      )}
                      <div className="space-y-2 max-h-72 overflow-y-auto rounded-lg border border-gray-100">
                        {filteredProducts.length === 0 ? (
                          <div className="text-center py-6 text-gray-400 text-xs">لا توجد منتجات مطابقة</div>
                        ) : filteredProducts.map((p: any) => (
                          <div key={p.id} onClick={() => toggleProduct(p.id)}
                            className={`flex items-center gap-3 p-3 cursor-pointer transition-all ${selectedProducts.includes(p.id) ? "bg-red-50 border-r-2 border-[var(--brand)]" : "bg-white hover:bg-gray-50"}`}>
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${selectedProducts.includes(p.id) ? "border-[var(--brand)] bg-[var(--brand)]" : "border-gray-300"}`}>
                              {selectedProducts.includes(p.id) && <CheckCircle size={12} className="text-white"/>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-gray-800 truncate">{p.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-gray-400">{p.category_name}</span>
                                <span className="text-[10px] font-bold text-[var(--brand)]">{p.price} $</span>
                                {p.id && <span className="text-[9px] text-gray-300">#{p.id}</span>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
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

                  {/* زر الاستيراد */}
                  <button onClick={handleSync} disabled={syncLoading || !targetSubcategoryId}
                    className="w-full bg-[var(--brand)] text-white py-3.5 rounded-lg font-bold disabled:opacity-40 flex items-center justify-center gap-2">
                    <Download size={16} className={syncLoading ? "animate-bounce" : ""}/>
                    {syncLoading ? "جاري الاستيراد..." : selectedProducts.length ? `استيراد ${selectedProducts.length} منتج` : "استيراد كل المنتجات"}
                  </button>

                  {syncResult && (
                    <div className={`p-4 rounded-lg text-sm ${syncResult.error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                      {syncResult.error ? `خطأ: ${syncResult.error}` : (
                        <div className="space-y-1">
                          <p className="font-bold">اكتمل الاستيراد — {syncResult.provider}</p>
                          <p>مضاف: {syncResult.summary?.added} · محدّث: {syncResult.summary?.updated} · تجاوز: {syncResult.summary?.skipped}</p>
                        </div>
                      )}
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

      </div>
    );
  };


// OrderPollingStatus moved to src/components/OrderPollingStatus.tsx

// AdminUserCard moved to src/components/AdminUserCard.tsx



// AdminElementsTab extracted to src/pages/AdminElementsPage.tsx


  // --- Admin Panel ---
// AdminPanel moved to src/pages/AdminPage.tsx

  if (location.pathname === "/api-docs" || location.pathname === "/api-docs/") {
    return <ApiDocsPage />;
  }

  if (isAdmin) return (
    <>
      <ToastContainer />
      <CustomDialogContainer />
      <AdminPage 
        user={user}
        fetchUser={fetchUser}
        categories={categories}
        subcategories={subcategories}
        subSubCategories={subSubCategories}
        fetchCategories={fetchCategories}
        fetchSubcategories={fetchSubcategories}
        fetchSubSubCategories={fetchSubSubCategories}
        paymentMethods={paymentMethods}
        fetchPaymentMethods={fetchPaymentMethods}
        banners={banners}
        fetchBanners={fetchBanners}
        offers={offers}
        fetchOffers={fetchOffers}
        setIsAdmin={setIsAdmin}
        theme={theme}
        adminTab={adminTab}
        setAdminTab={setAdminTab}
        focusTarget={focusTarget}
        setFocusTarget={setFocusTarget}
        setSiteSettings={setSiteSettings}
        adminFetch={adminFetch}
        handleChangeAdminPassword={handleChangeAdminPassword}
        newAdminPass={newAdminPass}
        setNewAdminPass={setNewAdminPass}
        adminChatView={<AdminChatPage selectedChatUser={selectedChatUser} setSelectedChatUser={setSelectedChatUser} adminFetch={adminFetch} />}
        selectedChatUser={selectedChatUser}
        setSelectedChatUser={setSelectedChatUser}
        setAdminAuth={setAdminAuth}
      />
    </>
  );


  // Store-facing UI removed — this build is admin-only.
  // Non-admin visitors are redirected to the admin login screen.
  return (
    <>
      <ToastContainer />
      <CustomDialogContainer />
      {googlePhoneGate && (
        <GooglePhoneGateModal
          pending={googlePhoneGate}
          onCancel={() => setGooglePhoneGate(null)}
          onSuccess={(data) => {
            setGooglePhoneGate(null);
            setUser(data);
            if (data.token) localStorage.setItem('authToken', data.token);
            localStorage.setItem('userId', String(data.id));
            setView({ type: 'main' });
            setActiveTab('home');
          }}
        />
      )}
      <AdminLoginPage
        setIsAdmin={setIsAdmin}
        setAdminAuth={setAdminAuth}
        setView={setView}
      />
    </>
  );
}
