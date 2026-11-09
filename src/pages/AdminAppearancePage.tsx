import React, { useState, useEffect } from "react";
import {
  Palette,
  Image as ImageIcon,
  Tag,
  Upload,
  Trash2,
  Pencil,
  Plus,
  GripVertical,
  Sun,
  Moon,
  Monitor,
  LayoutGrid,
  Save,
  RefreshCcw,
  X,
  ChevronDown,
  Pipette,
  Type,
  Loader2,
  Square,
  Search,
} from "lucide-react";
import { showToast } from "../components/ToastContainer";
import AdminImageUpload from "../components/AdminImageUpload";
import OptimizedImage from "../components/OptimizedImage";
import ColorWheelModal from "../components/ColorWheelModal";

const DEFAULT_SETTINGS = {
  logo_url: "",
  theme_mode: "system",
  primary_color: "#0936AD",
  cat_columns_desktop: 4,
  cat_columns_mobile: 3,
  cat_image_ratio: "1:1",
  sub_columns_desktop: 4,
  sub_columns_mobile: 3,
  sub_image_ratio: "1:1",
  subsub_columns_desktop: 4,
  subsub_columns_mobile: 3,
  subsub_image_ratio: "1:1",
  prod_columns_desktop: 4,
  prod_columns_mobile: 1,
  prod_image_ratio: "1:1",
  pay_columns_desktop: 4,
  pay_columns_mobile: 4,
  pay_image_ratio: "1:1",
  checkout_mode: "page",
  default_home_mode: "categories",
  loading_spinner_type: "pixel",
  item_card_style: "card",
  search_enabled: true,
  font_scale: 100,
  font_size_cat: null,
  font_size_sub: null,
  font_size_subsub: null,
  font_size_prod: null,
  font_size_pay: null,
};

const spinnerPreviewStyles = `
  @keyframes adminPixMorph {
    0%, 100% { transform: scale(1); opacity: 1; border-radius: 2px; }
    40% { transform: scale(0.2); opacity: 0.2; border-radius: 50%; }
    70% { transform: scale(1.2); opacity: 0.9; border-radius: 3px; }
  }
  .admin-spinner-pixel { display: grid; grid-template-columns: repeat(3, 6px); grid-template-rows: repeat(3, 6px); gap: 1px; }
  .admin-spinner-pixel .px { width: 6px; height: 6px; border-radius: 2px; background-color: var(--sp-color); animation: adminPixMorph 2.4s ease-in-out infinite; }
  .admin-spinner-pixel .px:nth-child(3n) { animation-delay: 0.2s; }
  .admin-spinner-pixel .px:nth-child(5n) { animation-delay: 0.5s; }

  @keyframes adminLogoPulseMove {
    0%, 100% { opacity: 0; transform: scale(0.88); }
    50% { opacity: 1; transform: scale(1); filter: drop-shadow(0 0 4px var(--sp-color)); }
  }
  .admin-logo-pulse-wrap { position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; }
  .admin-logo-pulse-img { width: 30px; height: 30px; object-fit: contain; animation: adminLogoPulseMove 1.9s ease-in-out infinite; }

  @keyframes adminLogoRingSpin { to { transform: rotate(360deg); } }
  .admin-logo-ring-wrap { position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; }
  .admin-logo-ring-track { position: absolute; inset: 0; border-radius: 50%; border: 3px solid color-mix(in srgb, var(--sp-color) 18%, transparent); }
  .admin-logo-ring-spin { position: absolute; inset: 0; border-radius: 50%; border: 3px solid transparent; border-top-color: var(--sp-color); border-right-color: var(--sp-color); animation: adminLogoRingSpin 1s linear infinite; }
  .admin-logo-ring-img { width: 20px; height: 20px; object-fit: contain; border-radius: 50%; position: relative; z-index: 1; }
`;

const SpinnerPreview = ({ type, logoUrl, color }: { type: string; logoUrl?: string; color: string }) => {
  const style = { "--sp-color": color || "#0936AD" } as React.CSSProperties;
  if (type === "logo_pulse") {
    return (
      <>
        <style>{spinnerPreviewStyles}</style>
        <div className="admin-logo-pulse-wrap" style={style}>
          {logoUrl ? <img src={logoUrl} alt="" className="admin-logo-pulse-img" /> : <div className="admin-logo-ring-track" />}
        </div>
      </>
    );
  }
  if (type === "logo_ring") {
    return (
      <>
        <style>{spinnerPreviewStyles}</style>
        <div className="admin-logo-ring-wrap" style={style}>
          <div className="admin-logo-ring-track" />
          <div className="admin-logo-ring-spin" />
          {logoUrl && <img src={logoUrl} alt="" className="admin-logo-ring-img" />}
        </div>
      </>
    );
  }
  return (
    <>
      <style>{spinnerPreviewStyles}</style>
      <div className="admin-spinner-pixel" style={style}>
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="px" />
        ))}
      </div>
    </>
  );
};

const CardStylePreview = ({ withCard }: { withCard: boolean }) => (
  <div className="flex flex-col items-center gap-1.5">
    <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${withCard ? "bg-white border border-gray-200 shadow-sm" : ""}`}>
      <div className="w-6 h-6 rounded-md bg-gray-300" />
    </div>
    <div className="w-8 h-1.5 rounded-full bg-gray-300" />
  </div>
);

const SectionCard = ({ icon, title, children, defaultOpen = false }: any) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-4"
      >
        <h3 className="font-black text-gray-800 flex items-center gap-2 text-sm">
          {icon} {title}
        </h3>
        <ChevronDown
          size={18}
          className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="px-4 pb-4 space-y-4">{children}</div>}
    </div>
  );
};

const AdminAppearancePage = ({ adminFetch }: { adminFetch: any }) => {
  const [settings, setSettings] = useState<any>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banners, setBanners] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [newBannerUrl, setNewBannerUrl] = useState("");
  const [newBannerLink, setNewBannerLink] = useState("");
  const [showAddBanner, setShowAddBanner] = useState(false);
  const [editingBanner, setEditingBanner] = useState<any>(null);
  const [newOffer, setNewOffer] = useState({ title: "", description: "", image_url: "", link_url: "" });
  const [editingOffer, setEditingOffer] = useState<any>(null);
  const [showAddOffer, setShowAddOffer] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showWheelModal, setShowWheelModal] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [sRes, bRes, oRes] = await Promise.all([
        adminFetch("/api/admin/appearance"),
        adminFetch("/api/banners"),
        adminFetch("/api/offers"),
      ]);
      if (sRes.ok) {
        const data = await sRes.json();
        setSettings({ ...DEFAULT_SETTINGS, ...data });
      }
      if (bRes.ok) setBanners(await bRes.json());
      if (oRes.ok) setOffers(await oRes.json());
    } catch {
      showToast("تعذر تحميل الإعدادات", "error");
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const saveSettings = async (partial?: any) => {
    setSaving(true);
    try {
      const body = { ...settings, ...(partial || {}) };
      const res = await adminFetch("/api/admin/appearance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings({ ...DEFAULT_SETTINGS, ...data });
        showToast("تم حفظ الإعدادات", "success");
      } else {
        showToast("فشل حفظ الإعدادات", "error");
      }
    } catch {
      showToast("خطأ في الاتصال", "error");
    }
    setSaving(false);
  };

  const update = (key: string, value: any) => setSettings((s: any) => ({ ...s, [key]: value }));

  // ===== Banners =====
  const addBanner = async () => {
    if (!newBannerUrl) return showToast("يرجى رفع صورة البانر", "error");
    const res = await adminFetch("/api/admin/banners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: newBannerUrl, link_url: newBannerLink || null, order_index: banners.length }),
    });
    if (res.ok) {
      setNewBannerUrl("");
      setNewBannerLink("");
      const r = await adminFetch("/api/banners");
      if (r.ok) setBanners(await r.json());
      showToast("تمت إضافة البانر", "success");
    } else showToast("فشل إضافة البانر", "error");
  };

  const updateBanner = async () => {
    if (!editingBanner) return;
    const res = await adminFetch(`/api/admin/banners/${editingBanner.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: editingBanner.image_url, link_url: editingBanner.link_url || null }),
    });
    if (res.ok) {
      setBanners((list) => list.map((b) => (b.id === editingBanner.id ? editingBanner : b)));
      setEditingBanner(null);
      showToast("تم تحديث البانر", "success");
    } else showToast("فشل تحديث البانر", "error");
  };

  const deleteBanner = async (id: number) => {
    const res = await adminFetch(`/api/admin/banners/${id}`, { method: "DELETE" });
    if (res.ok) setBanners((b) => b.filter((x) => x.id !== id));
  };

  const moveBanner = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= banners.length) return;
    const list = [...banners];
    [list[index], list[target]] = [list[target], list[index]];
    setBanners(list);
    const items = list.map((b, i) => ({ id: b.id, order_index: i }));
    await adminFetch("/api/admin/reorder/banners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
  };

  // ===== Offers =====
  const addOffer = async () => {
    if (!newOffer.title) return showToast("يرجى إدخال اسم العرض", "error");
    const res = await adminFetch("/api/admin/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newOffer, active: true, order_index: offers.length }),
    });
    if (res.ok) {
      setNewOffer({ title: "", description: "", image_url: "", link_url: "" });
      const r = await adminFetch("/api/offers");
      if (r.ok) setOffers(await r.json());
      showToast("تمت إضافة العرض", "success");
    } else showToast("فشل إضافة العرض", "error");
  };

  const updateOffer = async () => {
    if (!editingOffer) return;
    const res = await adminFetch(`/api/admin/offers/${editingOffer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingOffer),
    });
    if (res.ok) {
      setOffers((list) => list.map((o) => (o.id === editingOffer.id ? editingOffer : o)));
      setEditingOffer(null);
      showToast("تم تحديث العرض", "success");
    }
  };

  const deleteOffer = async (id: number) => {
    const res = await adminFetch(`/api/admin/offers/${id}`, { method: "DELETE" });
    if (res.ok) setOffers((o) => o.filter((x) => x.id !== id));
  };

  const moveOffer = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= offers.length) return;
    const list = [...offers];
    [list[index], list[target]] = [list[target], list[index]];
    setOffers(list);
    const items = list.map((o, i) => ({ id: o.id, order_index: i }));
    await adminFetch("/api/admin/reorder/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
  };

  if (loading) {
    return <div className="py-20 text-center text-gray-400 text-sm">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="font-black text-gray-800 flex items-center gap-2">
          <Palette size={18} className="text-brand" /> تخصيص مظهر المتجر
        </h2>
        <button onClick={fetchAll} className="p-2 bg-gray-50 rounded-lg text-gray-400 active:scale-90">
          <RefreshCcw size={15} />
        </button>
      </div>

      {/* ===== A. الهوية البصرية ===== */}
      <SectionCard icon={<ImageIcon size={16} className="text-pink-500" />} title="الهوية البصرية">
        {/* شعار المتجر */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-600">شعار المتجر</p>
          <div className="flex items-center gap-3">
            {settings.logo_url ? (
              <OptimizedImage src={settings.logo_url} width={64} height={64} className="w-16 h-16 rounded-lg object-cover border border-gray-100" />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-gray-50 flex items-center justify-center text-gray-300">
                <ImageIcon size={22} />
              </div>
            )}
            <div className="flex-1">
              <AdminImageUpload
                label="رفع شعار جديد"
                currentUrl={settings.logo_url}
                onUpload={(url) => { update("logo_url", url); saveSettings({ logo_url: url }); }}
              />
            </div>
          </div>
        </div>

        {/* بانرات */}
        <div className="space-y-2 pt-2 border-t border-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-600">البانرات</p>
            <button
              onClick={() => { setNewBannerUrl(""); setNewBannerLink(""); setShowAddBanner(true); }}
              className="bg-[var(--brand)] text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
            >
              <Plus size={13} /> إضافة بانر
            </button>
          </div>
          <div className="space-y-2">
            {banners.length === 0 && <p className="text-[11px] text-gray-400 text-center py-2">لا توجد بانرات</p>}
            {banners.map((b, i) => (
              <div key={b.id} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                <GripVertical size={14} className="text-gray-300" />
                <OptimizedImage src={b.image_url} width={80} height={48} className="w-16 h-10 rounded-md object-cover" />
                <div className="flex-1 min-w-0">
                  {b.link_url ? (
                    <p className="text-[10px] text-[var(--brand)] truncate">{b.link_url}</p>
                  ) : (
                    <p className="text-[10px] text-gray-300">بدون رابط</p>
                  )}
                </div>
                <button onClick={() => moveBanner(i, -1)} disabled={i === 0} className="p-1.5 bg-white rounded-md text-gray-400 disabled:opacity-30">▲</button>
                <button onClick={() => moveBanner(i, 1)} disabled={i === banners.length - 1} className="p-1.5 bg-white rounded-md text-gray-400 disabled:opacity-30">▼</button>
                <button onClick={() => setEditingBanner(b)} className="p-1.5 bg-blue-50 text-blue-600 rounded-md"><Pencil size={13} /></button>
                <button onClick={() => deleteBanner(b.id)} className="p-1.5 bg-red-50 text-red-500 rounded-md"><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        </div>

        {/* عروض */}
        <div className="space-y-2 pt-2 border-t border-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-600">العروض</p>
            <button
              onClick={() => setShowAddOffer(true)}
              className="bg-[var(--brand)] text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
            >
              <Plus size={13} /> إضافة عرض
            </button>
          </div>
          <div className="space-y-2">
            {offers.length === 0 && <p className="text-[11px] text-gray-400 text-center py-2">لا توجد عروض</p>}
            {offers.map((o, i) => (
              <div key={o.id} className="flex items-center gap-2 bg-white border border-gray-100 rounded-lg p-2">
                {o.image_url ? (
                  <OptimizedImage src={o.image_url} width={48} height={48} className="w-11 h-11 rounded-lg object-cover" />
                ) : (
                  <div className="w-11 h-11 rounded-lg bg-gray-50 flex items-center justify-center text-gray-300"><Tag size={16} /></div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-700 truncate">{o.title}</p>
                  {o.description && <p className="text-[10px] text-gray-400 truncate">{o.description}</p>}
                </div>
                <button onClick={() => moveOffer(i, -1)} disabled={i === 0} className="p-1.5 bg-gray-50 rounded-md text-gray-400 disabled:opacity-30">▲</button>
                <button onClick={() => moveOffer(i, 1)} disabled={i === offers.length - 1} className="p-1.5 bg-gray-50 rounded-md text-gray-400 disabled:opacity-30">▼</button>
                <button onClick={() => setEditingOffer(o)} className="p-1.5 bg-blue-50 text-blue-600 rounded-md"><Pencil size={13} /></button>
                <button onClick={() => deleteOffer(o.id)} className="p-1.5 bg-red-50 text-red-500 rounded-md"><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* ===== B. المظهر العام ===== */}
      <SectionCard icon={<Sun size={16} className="text-amber-500" />} title="المظهر العام">
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-600">الوضع الافتراضي</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { val: "light", label: "فاتح", icon: <Sun size={16} /> },
              { val: "dark", label: "داكن", icon: <Moon size={16} /> },
              { val: "system", label: "حسب النظام", icon: <Monitor size={16} /> },
            ].map((opt) => (
              <button
                key={opt.val}
                onClick={() => { update("theme_mode", opt.val); saveSettings({ theme_mode: opt.val }); }}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-xs font-bold transition-colors ${
                  settings.theme_mode === opt.val ? "bg-blue-50 border-[var(--brand)] text-[var(--brand)]" : "bg-gray-50 border-gray-100 text-gray-500"
                }`}
              >
                {opt.icon} {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-gray-50 relative">
          <p className="text-xs font-bold text-gray-600">اللون الأساسي</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowColorPicker((v) => !v)}
              className="w-12 h-12 rounded-lg border border-gray-100 cursor-pointer shrink-0"
              style={{ backgroundColor: settings.primary_color }}
              title="اختر لونًا"
              aria-label="فتح منتقي الألوان"
            />
            <input
              type="text"
              value={settings.primary_color}
              onChange={(e) => update("primary_color", e.target.value)}
              onBlur={() => saveSettings()}
              className="flex-1 p-3 bg-gray-50 rounded-lg text-sm outline-none border border-gray-100 font-mono"
              placeholder="#0936AD"
            />
            <button
              type="button"
              onClick={() => setShowWheelModal(true)}
              className="shrink-0 px-3 py-3 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold text-gray-600 whitespace-nowrap"
            >
              اختيار اللون
            </button>
          </div>

          <ColorWheelModal
            open={showWheelModal}
            initialColor={settings.primary_color}
            onCancel={() => setShowWheelModal(false)}
            onConfirm={(hex) => {
              update("primary_color", hex);
              saveSettings({ primary_color: hex });
              setShowWheelModal(false);
            }}
          />

          {showColorPicker && (
            <div
              className="absolute z-20 top-full right-14 mt-1 bg-white rounded-lg border border-gray-100 shadow-xl p-3 space-y-2"
              dir="ltr"
            >
              <input
                type="color"
                value={settings.primary_color}
                onChange={(e) => update("primary_color", e.target.value)}
                onBlur={() => saveSettings()}
                className="w-40 h-40 cursor-pointer"
              />
              <div className="flex items-center gap-2" dir="rtl">
                {typeof window !== "undefined" && "EyeDropper" in window && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        // @ts-ignore - EyeDropper is not in default TS lib yet
                        const eyeDropper = new window.EyeDropper();
                        const result = await eyeDropper.open();
                        if (result?.sRGBHex) {
                          update("primary_color", result.sRGBHex);
                          saveSettings({ primary_color: result.sRGBHex });
                        }
                      } catch (e) {
                        // user cancelled the pick — no-op
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-gray-50 border border-gray-100 rounded-lg py-2 text-xs font-bold text-gray-600"
                  >
                    <Pipette size={14} /> قطارة
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { saveSettings(); setShowColorPicker(false); }}
                  className="flex-1 bg-[var(--brand)] text-white rounded-lg py-2 text-xs font-bold"
                >
                  تم
                </button>
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      {/* ===== B2. طريقة تأكيد الطلب ===== */}
      <SectionCard icon={<LayoutGrid size={16} className="text-emerald-500" />} title="طريقة تأكيد الطلب">
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-600">عند الضغط على منتج، كيف تُعرض بيانات الطلب؟</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { update("checkout_mode", "page"); saveSettings({ checkout_mode: "page" }); }}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-xs font-bold transition-colors ${
                settings.checkout_mode === "page" ? "bg-blue-50 border-[var(--brand)] text-[var(--brand)]" : "bg-gray-50 border-gray-100 text-gray-500"
              }`}
            >
              صفحة منفصلة
            </button>
            <button
              onClick={() => { update("checkout_mode", "modal"); saveSettings({ checkout_mode: "modal" }); }}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-xs font-bold transition-colors ${
                settings.checkout_mode === "modal" ? "bg-blue-50 border-[var(--brand)] text-[var(--brand)]" : "bg-gray-50 border-gray-100 text-gray-500"
              }`}
            >
              مودل منبثق
            </button>
          </div>
          <p className="text-[10px] text-gray-400 leading-relaxed">
            "صفحة منفصلة": الانتقال لصفحة تأكيد طلب كاملة كما هو معتاد.
            "مودل منبثق": فتح تأكيد الطلب كنافذة عائمة فوق خلفية شفافة دون مغادرة الصفحة الحالية.
          </p>
        </div>
      </SectionCard>

      {/* ===== B2.5. الأسلوب الافتراضي للصفحة الرئيسية ===== */}
      <SectionCard icon={<LayoutGrid size={16} className="text-orange-500" />} title="الأسلوب الافتراضي للصفحة الرئيسية">
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-600">ما الذي يظهر أولاً للمستخدم في الصفحة الرئيسية؟</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { val: "strip", label: "الأسلوب الجديد" },
              { val: "categories", label: "الأقسام الرئيسية" },
              { val: "most_purchased", label: "الأكثر شراءً" },
              { val: "favorites", label: "المفضلة" },
            ].map(opt => (
              <button
                key={opt.val}
                onClick={() => { update("default_home_mode", opt.val); saveSettings({ default_home_mode: opt.val }); }}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-xs font-bold transition-colors ${
                  settings.default_home_mode === opt.val ? "bg-blue-50 border-[var(--brand)] text-[var(--brand)]" : "bg-gray-50 border-gray-100 text-gray-500"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 leading-relaxed">
            هذا هو الخيار الذي يظهر دائماً لأي مستخدم (مسجّل أو زائر، أول زيارة أو بعد تحديث
            الصفحة) ما دام لم يختر بنفسه من القائمة المنسدلة في الصفحة الرئيسية. بمجرد أن يختار
            المستخدم أسلوباً بنفسه، يُحفظ اختياره على جهازه ويبقى مفضَّلاً عنده حتى لو غيّرتَ هذا
            الإعداد لاحقاً.
          </p>
        </div>
      </SectionCard>

      {/* ===== B2.6. شارة التحميل بين الصفحات ===== */}
      <SectionCard icon={<Loader2 size={16} className="text-cyan-500" />} title="شارة التحميل بين الصفحات">
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-600">
            الشكل الذي يظهر فوق الشاشة أثناء الدخول للأقسام والمنتجات بجميع أنواعها
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { val: "pixel", label: "بكسل متحرك" },
              { val: "logo_pulse", label: "نبض اللوغو" },
              { val: "logo_ring", label: "دائرة + لوغو" },
            ].map((opt) => (
              <button
                key={opt.val}
                onClick={() => { update("loading_spinner_type", opt.val); saveSettings({ loading_spinner_type: opt.val }); }}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border text-[11px] font-bold transition-colors ${
                  settings.loading_spinner_type === opt.val ? "bg-blue-50 border-[var(--brand)] text-[var(--brand)]" : "bg-gray-50 border-gray-100 text-gray-500"
                }`}
              >
                <SpinnerPreview type={opt.val} logoUrl={settings.logo_url} color={settings.primary_color} />
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 leading-relaxed">
            "نبض اللوغو" و"دائرة + لوغو" يستخدمان شعار المتجر المرفوع أعلى هذه الصفحة ولون المتجر
            الأساسي. إن لم يكن هناك شعار مرفوع، يُفضَّل اختيار "بكسل متحرك".
          </p>
        </div>
      </SectionCard>

      {/* ===== B2.7. شكل عرض العناصر (بطاقة / بدون بطاقة) ===== */}
      <SectionCard icon={<Square size={16} className="text-slate-500" />} title="شكل عرض العناصر">
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-600">
            هل تظهر صورة واسم كل عنصر (طرق الدفع، الأقسام بكل مستوياتها، المنتجات) داخل بطاقة أم بلا بطاقة؟
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { val: "card", label: "مع بطاقة" },
              { val: "plain", label: "بدون بطاقة" },
            ].map((opt) => (
              <button
                key={opt.val}
                onClick={() => { update("item_card_style", opt.val); saveSettings({ item_card_style: opt.val }); }}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border text-[11px] font-bold transition-colors ${
                  settings.item_card_style === opt.val ? "bg-blue-50 border-[var(--brand)] text-[var(--brand)]" : "bg-gray-50 border-gray-100 text-gray-500"
                }`}
              >
                <CardStylePreview withCard={opt.val === "card"} />
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 leading-relaxed">
            "بدون بطاقة": تبقى الصورة والاسم كما هما لكن دون خلفية بيضاء (أو سوداء بالوضع الليلي)
            خلفهما — تظهر الصورة مباشرة فوق خلفية الصفحة. يشمل هذا طرق الدفع، الأقسام الرئيسية
            والفرعية والفرعية الثانوية، وبطاقات المنتجات.
          </p>
        </div>
      </SectionCard>

      {/* ===== B2.8. زر البحث بالصفحة الرئيسية ===== */}
      <SectionCard icon={<Search size={16} className="text-slate-500" />} title="البحث بالمتجر">
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-600">
            شريط بحث يظهر أعلى الصفحة الرئيسية (فوق "الأسلوب الجديد" والأقسام) يتيح للمستخدم البحث عن منتج أو قسم بالاسم.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { val: true, label: "مُفعَّل" },
              { val: false, label: "مُعطَّل" },
            ].map((opt) => (
              <button
                key={String(opt.val)}
                onClick={() => { update("search_enabled", opt.val); saveSettings({ search_enabled: opt.val }); }}
                className={`p-3 rounded-lg border text-[11px] font-bold transition-colors ${
                  settings.search_enabled === opt.val ? "bg-blue-50 border-[var(--brand)] text-[var(--brand)]" : "bg-gray-50 border-gray-100 text-gray-500"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* ===== B3. حجم الخط ===== */}
      <SectionCard icon={<Type size={16} className="text-violet-500" />} title="حجم الخط">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-600">حجم خط كامل الموقع</p>
            <span className="text-[11px] font-bold text-[var(--brand)]">{settings.font_scale}%</span>
          </div>
          <input
            type="range"
            min={80}
            max={130}
            step={5}
            value={settings.font_scale}
            onChange={(e) => update("font_scale", Number(e.target.value))}
            onMouseUp={() => saveSettings()}
            onTouchEnd={() => saveSettings()}
            className="w-full accent-[var(--brand)]"
          />
          <div className="flex justify-between text-[10px] text-gray-400">
            <span>أصغر</span>
            <span>افتراضي</span>
            <span>أكبر</span>
          </div>
          <p className="text-[10px] text-gray-400 leading-relaxed">
            يتحكم بحجم النصوص في كامل صفحات المتجر. الأحجام المخصصة أدناه تُطبَّق فوق هذا التحجيم العام.
          </p>
        </div>

        {[
          { key: "font_size_cat", label: "اسم الأقسام الرئيسية", min: 9, max: 16 },
          { key: "font_size_sub", label: "اسم الأقسام الفرعية", min: 8, max: 15 },
          { key: "font_size_subsub", label: "اسم الأقسام الفرعية الثانوية", min: 8, max: 15 },
          { key: "font_size_prod", label: "اسم المنتجات", min: 9, max: 16 },
          { key: "font_size_pay", label: "اسم طرق الدفع", min: 8, max: 15 },
        ].map((f) => (
          <div key={f.key} className="space-y-1.5 pt-2 border-t border-gray-50">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-600">{f.label}</p>
              <span className="text-[11px] font-bold text-gray-500">
                {settings[f.key] ? `${settings[f.key]}px` : "تلقائي"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={f.min}
                max={f.max}
                step={1}
                value={settings[f.key] || f.min + Math.round((f.max - f.min) / 2)}
                onChange={(e) => update(f.key, Number(e.target.value))}
                onMouseUp={() => saveSettings()}
                onTouchEnd={() => saveSettings()}
                className="flex-1 accent-[var(--brand)]"
              />
              <button
                type="button"
                onClick={() => { update(f.key, null); saveSettings({ [f.key]: null }); }}
                className="shrink-0 px-2.5 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-[10px] font-bold text-gray-500"
              >
                تلقائي
              </button>
            </div>
          </div>
        ))}
      </SectionCard>

      {/* ===== C. إعدادات الشبكة ===== */}
      <SectionCard icon={<LayoutGrid size={16} className="text-indigo-500" />} title="إعدادات الشبكة">
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-600">عدد أعمدة بطاقات الأقسام</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-gray-400 mb-1">كمبيوتر</p>
              <div className="flex gap-1.5">
                {[2, 3, 4].map((n) => (
                  <button key={n} onClick={() => { update("cat_columns_desktop", n); saveSettings({ cat_columns_desktop: n }); }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border ${settings.cat_columns_desktop === n ? "bg-blue-50 border-[var(--brand)] text-[var(--brand)]" : "bg-gray-50 border-gray-100 text-gray-500"}`}>{n}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 mb-1">جوال</p>
              <div className="flex gap-1.5">
                {[2, 3, 4].map((n) => (
                  <button key={n} onClick={() => { update("cat_columns_mobile", n); saveSettings({ cat_columns_mobile: n }); }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border ${settings.cat_columns_mobile === n ? "bg-blue-50 border-[var(--brand)] text-[var(--brand)]" : "bg-gray-50 border-gray-100 text-gray-500"}`}>{n}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-1 pt-2 border-t border-gray-50">
          <p className="text-xs font-bold text-gray-600">نسبة صورة الأقسام</p>
          <select
            value={settings.cat_image_ratio}
            onChange={(e) => { update("cat_image_ratio", e.target.value); saveSettings({ cat_image_ratio: e.target.value }); }}
            className="w-full p-3 bg-gray-50 rounded-lg text-sm outline-none border border-gray-100"
          >
            {["1:1", "4:3", "16:9", "3:4"].map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div className="space-y-2 pt-2 border-t border-gray-50">
          <p className="text-xs font-bold text-gray-600">عدد أعمدة بطاقات الأقسام الفرعية</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-gray-400 mb-1">كمبيوتر</p>
              <div className="flex gap-1.5">
                {[2, 3, 4].map((n) => (
                  <button key={n} onClick={() => { update("sub_columns_desktop", n); saveSettings({ sub_columns_desktop: n }); }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border ${settings.sub_columns_desktop === n ? "bg-blue-50 border-[var(--brand)] text-[var(--brand)]" : "bg-gray-50 border-gray-100 text-gray-500"}`}>{n}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 mb-1">جوال</p>
              <div className="flex gap-1.5">
                {[2, 3, 4].map((n) => (
                  <button key={n} onClick={() => { update("sub_columns_mobile", n); saveSettings({ sub_columns_mobile: n }); }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border ${settings.sub_columns_mobile === n ? "bg-blue-50 border-[var(--brand)] text-[var(--brand)]" : "bg-gray-50 border-gray-100 text-gray-500"}`}>{n}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-1 pt-2 border-t border-gray-50">
          <p className="text-xs font-bold text-gray-600">نسبة صورة الأقسام الفرعية</p>
          <select
            value={settings.sub_image_ratio}
            onChange={(e) => { update("sub_image_ratio", e.target.value); saveSettings({ sub_image_ratio: e.target.value }); }}
            className="w-full p-3 bg-gray-50 rounded-lg text-sm outline-none border border-gray-100"
          >
            {["1:1", "4:3", "16:9", "3:4"].map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div className="space-y-2 pt-2 border-t border-gray-50">
          <p className="text-xs font-bold text-gray-600">عدد أعمدة بطاقات الأقسام الفرعية الثانوية</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-gray-400 mb-1">كمبيوتر</p>
              <div className="flex gap-1.5">
                {[2, 3, 4].map((n) => (
                  <button key={n} onClick={() => { update("subsub_columns_desktop", n); saveSettings({ subsub_columns_desktop: n }); }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border ${settings.subsub_columns_desktop === n ? "bg-blue-50 border-[var(--brand)] text-[var(--brand)]" : "bg-gray-50 border-gray-100 text-gray-500"}`}>{n}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 mb-1">جوال</p>
              <div className="flex gap-1.5">
                {[2, 3, 4].map((n) => (
                  <button key={n} onClick={() => { update("subsub_columns_mobile", n); saveSettings({ subsub_columns_mobile: n }); }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border ${settings.subsub_columns_mobile === n ? "bg-blue-50 border-[var(--brand)] text-[var(--brand)]" : "bg-gray-50 border-gray-100 text-gray-500"}`}>{n}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-1 pt-2 border-t border-gray-50">
          <p className="text-xs font-bold text-gray-600">نسبة صورة الأقسام الفرعية الثانوية</p>
          <select
            value={settings.subsub_image_ratio}
            onChange={(e) => { update("subsub_image_ratio", e.target.value); saveSettings({ subsub_image_ratio: e.target.value }); }}
            className="w-full p-3 bg-gray-50 rounded-lg text-sm outline-none border border-gray-100"
          >
            {["1:1", "4:3", "16:9", "3:4"].map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div className="space-y-2 pt-2 border-t border-gray-50">
          <p className="text-xs font-bold text-gray-600">عدد أعمدة بطاقات المنتجات</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-gray-400 mb-1">كمبيوتر</p>
              <div className="flex gap-1.5">
                {[3, 4, 5, 6].map((n) => (
                  <button key={n} onClick={() => { update("prod_columns_desktop", n); saveSettings({ prod_columns_desktop: n }); }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border ${settings.prod_columns_desktop === n ? "bg-blue-50 border-[var(--brand)] text-[var(--brand)]" : "bg-gray-50 border-gray-100 text-gray-500"}`}>{n}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 mb-1">جوال</p>
              <div className="flex gap-1.5">
                {[1, 2, 3].map((n) => (
                  <button key={n} onClick={() => { update("prod_columns_mobile", n); saveSettings({ prod_columns_mobile: n }); }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border ${settings.prod_columns_mobile === n ? "bg-blue-50 border-[var(--brand)] text-[var(--brand)]" : "bg-gray-50 border-gray-100 text-gray-500"}`}>{n}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-1 pt-2 border-t border-gray-50">
          <p className="text-xs font-bold text-gray-600">نسبة صورة المنتجات</p>
          <select
            value={settings.prod_image_ratio}
            onChange={(e) => { update("prod_image_ratio", e.target.value); saveSettings({ prod_image_ratio: e.target.value }); }}
            className="w-full p-3 bg-gray-50 rounded-lg text-sm outline-none border border-gray-100"
          >
            {["1:1", "4:3", "16:9", "3:4"].map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div className="space-y-2 pt-2 border-t border-gray-50">
          <p className="text-xs font-bold text-gray-600">عدد أعمدة طرق الدفع</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-gray-400 mb-1">كمبيوتر</p>
              <div className="flex gap-1.5">
                {[3, 4, 5].map((n) => (
                  <button key={n} onClick={() => { update("pay_columns_desktop", n); saveSettings({ pay_columns_desktop: n }); }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border ${settings.pay_columns_desktop === n ? "bg-blue-50 border-[var(--brand)] text-[var(--brand)]" : "bg-gray-50 border-gray-100 text-gray-500"}`}>{n}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 mb-1">جوال</p>
              <div className="flex gap-1.5">
                {[2, 3, 4].map((n) => (
                  <button key={n} onClick={() => { update("pay_columns_mobile", n); saveSettings({ pay_columns_mobile: n }); }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border ${settings.pay_columns_mobile === n ? "bg-blue-50 border-[var(--brand)] text-[var(--brand)]" : "bg-gray-50 border-gray-100 text-gray-500"}`}>{n}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-1 pt-2 border-t border-gray-50">
          <p className="text-xs font-bold text-gray-600">نسبة صورة طرق الدفع</p>
          <select
            value={settings.pay_image_ratio}
            onChange={(e) => { update("pay_image_ratio", e.target.value); saveSettings({ pay_image_ratio: e.target.value }); }}
            className="w-full p-3 bg-gray-50 rounded-lg text-sm outline-none border border-gray-100"
          >
            {["1:1", "4:3", "16:9", "3:4"].map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </SectionCard>

      <button
        onClick={() => saveSettings()}
        disabled={saving}
        className="w-full bg-[var(--brand)] text-white py-3.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
      >
        <Save size={16} /> {saving ? "جاري الحفظ..." : "حفظ جميع الإعدادات"}
      </button>

      {/* Add Banner Modal */}
      {showAddBanner && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end justify-center" onClick={() => setShowAddBanner(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-lg p-6 space-y-3 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-gray-800 flex items-center gap-2"><ImageIcon size={18} className="text-pink-500" /> إضافة بانر</h3>
              <button onClick={() => setShowAddBanner(false)} className="text-gray-400"><X size={22} /></button>
            </div>
            <AdminImageUpload label="صورة البانر" currentUrl={newBannerUrl} onUpload={(url) => setNewBannerUrl(url)} />
            <input
              type="text" placeholder="رابط البانر (اختياري - يفتح عند الضغط على البانر)"
              className="w-full p-3 bg-gray-50 rounded-lg text-sm outline-none border border-gray-100"
              value={newBannerLink} onChange={(e) => setNewBannerLink(e.target.value)}
            />
            <button
              onClick={async () => { await addBanner(); setShowAddBanner(false); }}
              className="w-full bg-[var(--brand)] text-white py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-1"
            >
              <Plus size={14} /> حفظ البانر
            </button>
          </div>
        </div>
      )}

      {/* Edit Banner Modal */}
      {editingBanner && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end justify-center" onClick={() => setEditingBanner(null)}>
          <div className="bg-white w-full max-w-lg rounded-t-lg p-6 space-y-3 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-gray-800 flex items-center gap-2"><ImageIcon size={18} className="text-pink-500" /> تعديل البانر</h3>
              <button onClick={() => setEditingBanner(null)} className="text-gray-400"><X size={22} /></button>
            </div>
            <AdminImageUpload label="صورة البانر" currentUrl={editingBanner.image_url || ""} onUpload={(url) => setEditingBanner({ ...editingBanner, image_url: url })} />
            <input
              type="text" placeholder="رابط البانر (اختياري - يفتح عند الضغط على البانر)"
              className="w-full p-3 bg-gray-50 rounded-lg text-sm outline-none border border-gray-100"
              value={editingBanner.link_url || ""} onChange={(e) => setEditingBanner({ ...editingBanner, link_url: e.target.value })}
            />
            <button onClick={updateBanner} className="w-full bg-[var(--brand)] text-white py-3 rounded-lg font-bold text-sm">حفظ التعديلات</button>
          </div>
        </div>
      )}

      {/* Add Offer Modal */}
      {showAddOffer && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end justify-center" onClick={() => setShowAddOffer(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-lg p-6 space-y-3 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-gray-800 flex items-center gap-2"><Tag size={18} className="text-rose-500" /> إضافة عرض</h3>
              <button onClick={() => setShowAddOffer(false)} className="text-gray-400"><X size={22} /></button>
            </div>
            <input
              type="text" placeholder="اسم العرض"
              className="w-full p-3 bg-gray-50 rounded-lg text-sm outline-none border border-gray-100"
              value={newOffer.title} onChange={(e) => setNewOffer({ ...newOffer, title: e.target.value })}
            />
            <textarea
              placeholder="وصف العرض (اختياري)"
              className="w-full p-3 bg-gray-50 rounded-lg text-sm outline-none h-20 resize-none border border-gray-100"
              value={newOffer.description} onChange={(e) => setNewOffer({ ...newOffer, description: e.target.value })}
            />
            <input
              type="text" placeholder="رابط العرض (يفتح عند الضغط على العرض)"
              className="w-full p-3 bg-gray-50 rounded-lg text-sm outline-none border border-gray-100"
              value={newOffer.link_url} onChange={(e) => setNewOffer({ ...newOffer, link_url: e.target.value })}
            />
            <AdminImageUpload label="صورة العرض" currentUrl={newOffer.image_url} onUpload={(url) => setNewOffer({ ...newOffer, image_url: url })} />
            <button
              onClick={async () => { await addOffer(); setShowAddOffer(false); }}
              className="w-full bg-[var(--brand)] text-white py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-1"
            >
              <Plus size={14} /> حفظ العرض
            </button>
          </div>
        </div>
      )}

      {/* Edit Offer Modal */}
      {editingOffer && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end justify-center" onClick={() => setEditingOffer(null)}>
          <div className="bg-white w-full max-w-lg rounded-t-lg p-6 space-y-3 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-gray-800 flex items-center gap-2"><Tag size={18} className="text-rose-500" /> تعديل العرض</h3>
              <button onClick={() => setEditingOffer(null)} className="text-gray-400"><X size={22} /></button>
            </div>
            <input
              type="text" placeholder="اسم العرض"
              className="w-full p-3 bg-gray-50 rounded-lg text-sm outline-none border border-gray-100"
              value={editingOffer.title || ""} onChange={(e) => setEditingOffer({ ...editingOffer, title: e.target.value })}
            />
            <textarea
              placeholder="وصف العرض"
              className="w-full p-3 bg-gray-50 rounded-lg text-sm outline-none h-20 resize-none border border-gray-100"
              value={editingOffer.description || ""} onChange={(e) => setEditingOffer({ ...editingOffer, description: e.target.value })}
            />
            <input
              type="text" placeholder="رابط العرض (يفتح عند الضغط على العرض)"
              className="w-full p-3 bg-gray-50 rounded-lg text-sm outline-none border border-gray-100"
              value={editingOffer.link_url || ""} onChange={(e) => setEditingOffer({ ...editingOffer, link_url: e.target.value })}
            />
            <AdminImageUpload label="صورة العرض" currentUrl={editingOffer.image_url || ""} onUpload={(url) => setEditingOffer({ ...editingOffer, image_url: url })} />
            <button onClick={updateOffer} className="w-full bg-[var(--brand)] text-white py-3 rounded-lg font-bold text-sm">حفظ التعديلات</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAppearancePage;
