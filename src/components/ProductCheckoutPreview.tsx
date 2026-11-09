import React from "react";
import {
  X, ArrowRight, ExternalLink, Layers, ChevronDown, CheckCircle, PackageCheck,
  ShieldCheck, Star,
} from "lucide-react";
import OptimizedImage from "./OptimizedImage";

/**
 * معاينة مطابقة 100% لصفحة "تأكيد الطلب" (CheckoutPage.tsx) في تطبيق العميل.
 * نفس التخطيط، نفس الأقسام، نفس الشروط (نوع المتجر، الباقات، الكمية، الحقول
 * الافتراضية والمخصصة، زر التحقق من الاسم، تفصيل السعر) — لكنها للعرض فقط
 * (Read-only) داخل لوحة التحكم: لا ترسل طلباً حقيقياً ولا تستدعي أي API فعلي
 * (كالتحقق من الاسم الذي يخصم من الرصيد)، لأن الهدف هو أن يرى الأدمن بالضبط
 * ما سيراه العميل قبل الحفظ.
 *
 * الثيم الافتراضي مطابق للثيم الافتراضي في App.tsx (تطبيق العميل).
 */

const theme = {
  text: "text-[var(--brand)]",
  border: "border-red-100",
  button: "bg-[var(--brand)]",
  shadow: "shadow-red-100",
};

const fmtPrice = (usd: number, decimals: number = 3) => `${(Number(usd) || 0).toFixed(decimals)} $`;

type FieldDef = { id: string; key?: string; label: string; required: boolean; isDefault?: boolean };
type PackageDataEntry = { label: string; price: number };

const TopBar = ({ title, onBack }: { title: string; onBack: () => void }) => (
  <div className="flex items-center gap-2 mb-6">
    <button onClick={onBack} className="p-2 bg-gray-100 rounded-full active:scale-95 transition-transform">
      <ArrowRight size={20} className="text-gray-600" />
    </button>
    <h2 className="text-xl font-bold text-gray-800">{title}</h2>
  </div>
);

const TypeBadge = ({ storeType, isPackaged }: { storeType: string; isPackaged: boolean }) => {
  if (storeType === "external_api" || storeType === "inventory") {
    return (
      <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5">
        <ExternalLink size={9} /> شحن فوري
      </span>
    );
  }
  if (isPackaged) {
    return (
      <span className="text-[10px] bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5">
        <Layers size={9} /> باقات
      </span>
    );
  }
  if (storeType === "quantities") {
    return <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold">حسب الكمية</span>;
  }
  return null;
};

const ProductSummaryCard = ({
  prod,
  isGallery,
  galleryImages,
  unitPrice,
  isPackaged,
}: {
  prod: any;
  isGallery: boolean;
  galleryImages: string[];
  unitPrice: number;
  isPackaged: boolean;
}) => {
  const priceBlock = (
    <div className="flex items-center gap-2 flex-wrap mt-1">
      <p className={`${theme.text} font-bold`}>{fmtPrice(unitPrice)}</p>
      <TypeBadge storeType={prod.store_type} isPackaged={isPackaged} />
    </div>
  );

  if (isGallery) {
    return (
      <div className="space-y-4 pb-4 border-b border-gray-50">
        <div className="w-full aspect-square rounded-xl overflow-hidden bg-gray-50">
          <OptimizedImage
            src={galleryImages[0] || "https://picsum.photos/seed/prod/100/100"}
            width={400}
            height={400}
            alt={prod.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <h4 className="font-bold text-gray-800 text-lg">{prod.name || "اسم المنتج"}</h4>
          {prod.description && (
            <p className="text-sm text-gray-500 mt-1 leading-relaxed whitespace-pre-line">{prod.description}</p>
          )}
          {priceBlock}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 pb-4 border-b border-gray-50">
      <div className="w-16 h-16 bg-gray-50 rounded-lg overflow-hidden shrink-0">
        <OptimizedImage
          src={prod.image_url || "https://picsum.photos/seed/prod/100/100"}
          width={128}
          height={128}
          alt={prod.name}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-gray-800 truncate">{prod.name || "اسم المنتج"}</h4>
        {prod.description && (
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed whitespace-pre-line line-clamp-3">
            {prod.description}
          </p>
        )}
        {priceBlock}
      </div>
    </div>
  );
};

const SummaryRow = ({ label, value, bold = true }: { label: string; value: React.ReactNode; bold?: boolean }) => (
  <div className="flex justify-between text-sm">
    <span className="text-gray-500">{label}</span>
    <span className={bold ? "font-bold" : ""}>{value}</span>
  </div>
);

const InputField: React.FC<{ label: string; required: boolean; value: string }> = ({ label, required, value }) => (
  <div className="space-y-1.5">
    <label className="text-sm font-bold text-gray-700 flex items-center gap-1">
      {label}
      {required ? (
        <span className="text-red-400 text-xs">*</span>
      ) : (
        <span className="text-gray-400 text-xs font-normal">(اختياري)</span>
      )}
    </label>
    <input
      type="text"
      readOnly
      value={value}
      placeholder={`أدخل ${label} هنا...`}
      className="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 outline-none text-gray-400 cursor-not-allowed"
    />
  </div>
);

interface ProductCheckoutPreviewProps {
  open: boolean;
  onClose: () => void;
  product: any;
}

export default function ProductCheckoutPreview({ open, onClose, product }: ProductCheckoutPreviewProps) {
  if (!open || !product) return null;
  const prod = product;

  const isFixedQuantity =
    prod.min_quantity != null && prod.max_quantity != null && Number(prod.min_quantity) === Number(prod.max_quantity);
  const hasPackageValues = Array.isArray(prod.package_values) && prod.package_values.length > 0;
  const hasPackagesData = prod.store_type === "packages" && Array.isArray(prod.packages_data) && prod.packages_data.length > 0;
  const isPackaged = hasPackageValues || hasPackagesData;
  const isGallery = prod.store_type === "gallery";

  const parsedMinQty = parseFloat(String(prod.min_quantity));
  const parsedMaxQty = parseFloat(String(prod.max_quantity));
  const effectiveFixedQty = isFixedQuantity ? parsedMinQty || 1 : null;
  const singleUnitOnly =
    !isPackaged &&
    ((!isFixedQuantity && (parsedMinQty || 1) <= 1 && (parsedMaxQty || 1) <= 1) ||
      (isFixedQuantity && effectiveFixedQty === 1));

  let galleryImages: string[] = [];
  try {
    const raw = prod.image_urls;
    const parsed = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : [];
    galleryImages = Array.isArray(parsed) ? parsed.filter(Boolean) : prod.image_url ? [prod.image_url] : [];
  } catch {
    galleryImages = prod.image_url ? [prod.image_url] : [];
  }

  let allFields: FieldDef[] = [];
  try {
    if (prod.custom_fields) {
      const parsed = typeof prod.custom_fields === "string" ? JSON.parse(prod.custom_fields) : prod.custom_fields;
      allFields = Array.isArray(parsed) ? parsed : [];
    }
  } catch { allFields = []; }

  let defaultFields: FieldDef[] = allFields.filter((f) => f.isDefault);
  if (defaultFields.length === 0) {
    if (prod?.input_label && String(prod.input_label).trim().length > 0) {
      defaultFields = [{ id: "__legacy_default_id__", label: String(prod.input_label).trim(), required: true, isDefault: true }];
    } else if (prod?.store_type === "quantities" || prod?.store_type === "quick_order") {
      defaultFields = [{ id: "__legacy_default_id__", label: "ضع المعرف (ID)", required: true, isDefault: true }];
    }
  }
  const parsedCustomFields = allFields.filter((f) => !f.isDefault);

  const rawPrice = parseFloat(String(prod.price)) || 0;
  const selectedPackageEntry: PackageDataEntry | null = hasPackagesData ? prod.packages_data[0] : null;
  const unitPrice = hasPackagesData
    ? Number(selectedPackageEntry?.price) || 0
    : prod.store_type === "quantities"
    ? rawPrice / Math.max(1, parseFloat(String(prod.price_per_unit)) || 1)
    : rawPrice;

  const safeQty = hasPackagesData
    ? 1
    : hasPackageValues
    ? prod.package_values[0]
    : isFixedQuantity
    ? parseFloat(String(prod.min_quantity))
    : 1;

  const baseTotal = unitPrice * safeQty;
  const finalPrice = baseTotal;
  const showBreakdown = safeQty > 1 || isPackaged;

  const showLegacyExternalField = prod.store_type === "external_api" && defaultFields.length === 0 && !!prod.requires_input;
  const legacyLabel = (prod.input_label && String(prod.input_label).trim()) || "معرف اللاعب (Player ID)";

  const showQuantityField =
    (prod.store_type === "quantities" || prod.store_type === "external_api" || prod.store_type === "quick_order" || hasPackageValues) &&
    !singleUnitOnly;

  return (
    <div className="fixed inset-0 z-[95] bg-black/60 flex items-center justify-center p-3" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50 shrink-0">
          <span className="text-[11px] font-black text-gray-500">معاينة مطابقة لصفحة تأكيد الطلب لدى العميل</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto" dir="rtl">
          <div className="px-4 py-6 space-y-6">
            <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm space-y-4">
              <TopBar title="تأكيد الطلب" onBack={onClose} />

              <ProductSummaryCard
                prod={prod}
                isGallery={isGallery}
                galleryImages={galleryImages}
                unitPrice={unitPrice}
                isPackaged={isPackaged}
              />

              {/* اختيار باقة بسعر مستقل لكل باقة (متجر الباقات) */}
              {hasPackagesData && (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                    <PackageCheck size={15} className="text-gray-400" /> اختر الباقة
                  </label>
                  <div className="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 flex items-center justify-between">
                    <span className="font-bold text-gray-800">
                      {selectedPackageEntry?.label}
                      <span className="text-gray-400 font-normal"> — {fmtPrice(Number(selectedPackageEntry?.price) || 0)}</span>
                    </span>
                    <ChevronDown size={18} className="text-gray-400" />
                  </div>
                </div>
              )}

              {/* حقل الكمية / اختيار قيمة باقة عددية */}
              {showQuantityField && (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">
                    {hasPackageValues ? "اختر الباقة" : "الكمية المطلوبة"}
                    {!hasPackageValues && !isFixedQuantity
                      ? ` (${prod.min_quantity ? `أقل: ${prod.min_quantity}` : ""}${
                          prod.min_quantity && prod.max_quantity ? " — " : ""
                        }${prod.max_quantity ? `أكثر: ${prod.max_quantity}` : ""})`
                      : ""}
                  </label>
                  {hasPackageValues ? (
                    <div className="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 flex items-center justify-between">
                      <span className="font-bold text-gray-800">
                        {prod.package_values[0]}
                        <span className="text-gray-400 font-normal"> — {fmtPrice(unitPrice * prod.package_values[0])}</span>
                      </span>
                      <ChevronDown size={18} className="text-gray-400" />
                    </div>
                  ) : isFixedQuantity ? (
                    <div className="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 text-gray-700 font-bold">
                      {prod.min_quantity}
                    </div>
                  ) : (
                    <input
                      type="number"
                      readOnly
                      value={prod.min_quantity || 1}
                      className="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 outline-none text-gray-400 cursor-not-allowed"
                    />
                  )}
                </div>
              )}

              {/* حقل احتياطي لمنتجات external_api القديمة */}
              {showLegacyExternalField && (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">{legacyLabel} *</label>
                  <input
                    type="text"
                    readOnly
                    placeholder={`أدخل ${legacyLabel} هنا...`}
                    className="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 outline-none text-center font-bold text-lg text-gray-400 cursor-not-allowed"
                  />
                </div>
              )}

              {/* الحقول الافتراضية */}
              {defaultFields.length > 0 && (
                <div className="space-y-3">
                  {defaultFields.map((field) => (
                    <InputField key={field.id} label={field.label} required={field.required} value="" />
                  ))}
                </div>
              )}

              {/* الحقول المخصصة */}
              {parsedCustomFields.length > 0 && (
                <div className="space-y-3">
                  {parsedCustomFields.map((field) => (
                    <InputField key={field.id} label={field.label} required={field.required} value="" />
                  ))}
                </div>
              )}

              {/* زر التحقق من الاسم — عرض تعطيلي فقط، لا يستدعي أي API فعلي ولا يخصم رصيداً */}
              {!!prod.name_verification_enabled && (
                <div className="space-y-2">
                  <div
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm border-2 border-dashed opacity-70 cursor-not-allowed ${theme.border} text-gray-700`}
                  >
                    <ShieldCheck size={16} /> تحقق من الاسم
                  </div>
                  <p className="text-[11px] font-bold text-center text-gray-400">
                    (معاينة فقط — لن يُستدعى أي تحقق فعلي أو خصم رصيد هنا)
                  </p>
                </div>
              )}

              {/* ملخص السعر */}
              <div className="space-y-3 pt-4">
                {showBreakdown && <SummaryRow label="سعر الوحدة" value={fmtPrice(unitPrice)} />}
                {showBreakdown && (
                  <SummaryRow label={hasPackagesData ? "الباقة" : "الكمية"} value={hasPackagesData ? selectedPackageEntry?.label : safeQty} />
                )}
                {showBreakdown && <SummaryRow label="المجموع الفرعي" value={fmtPrice(baseTotal)} />}

                <div className="flex justify-between text-sm text-amber-600 bg-amber-50 p-2 rounded-md border border-amber-100">
                  <div className="flex items-center gap-1">
                    <Star size={14} fill="currentColor" />
                    <span>خصم VIP (5%) — مثال</span>
                  </div>
                  <span className="font-bold">- {fmtPrice(baseTotal * 0.05)}</span>
                </div>

                <div className="flex justify-between text-lg border-t border-gray-100 pt-3 mt-2">
                  <span className="font-bold text-gray-800">المبلغ النهائي</span>
                  <div className="text-left">
                    <span className={`font-bold ${theme.text} text-xl`}>{fmtPrice(finalPrice)}</span>
                    <p className="text-[10px] text-gray-400">شامل جميع الرسوم</p>
                  </div>
                </div>
              </div>

              <button
                disabled
                className={`w-full ${theme.button} text-white py-4 rounded-lg font-bold shadow-lg ${theme.shadow} flex items-center justify-center gap-2 opacity-90 cursor-not-allowed`}
              >
                تأكيد الدفع بالرصيد
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
