import React, { useEffect, useState } from "react";
import { ArrowRight, Link2, KeyRound, CheckCircle2, XCircle, Loader2, ShieldCheck } from "lucide-react";
import { showToast } from "../components/ToastContainer";

interface GatewayRow {
  id: number;
  gateway_code: "shamcash" | "syriatelcash" | "binance" | "crypto_usdt_trc20" | "crypto_usdt_bep20";
  gateway_name: string;
  api_url: string;
  is_active: boolean;
  last_test_at: string | null;
  last_test_ok: boolean | null;
  last_test_msg: string | null;
  has_api_key: boolean;
  has_api_secret?: boolean;
  max_age_minutes?: number;
  // غير متاح لـ Binance فقط: "transactions" = جلب المعاملات (القديم)، "invoices" = نظام الفواتير،
  // "webhook" = الشحن التلقائي (رمز مميز + استقبال تلقائي عبر Webhook)
  verification_mode?: "transactions" | "invoices" | "webhook";
  webhook_url?: string | null;
}

const ACCEPT_WINDOW_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "بلا حد زمني (قبول أي عملية)" },
  { value: 30, label: "آخر 30 دقيقة فقط" },
  { value: 60, label: "آخر ساعة فقط" },
  { value: 180, label: "آخر 3 ساعات فقط" },
];
const CUSTOM_OPTION_VALUE = -1; // قيمة خاصة تفتح حقل إدخال يدوي بالدقائق

interface PaymentGatewaysAdminPageProps {
  adminFetch: (url: string, options?: any) => Promise<Response>;
  onBack: () => void;
}

const GATEWAY_META: Record<string, { label: string; color: string; image?: string }> = {
  shamcash: { label: "شام كاش", color: "from-amber-500 to-orange-500", image: "https://i.ibb.co/mVsSyPBQ/1000033202.jpg" },
  syriatelcash: { label: "سيرياتيل كاش", color: "from-sky-500 to-blue-600", image: "https://i.ibb.co/PZ9Sgynk/1000033211.jpg" },
  binance: { label: "Binance Pay", color: "from-yellow-400 to-yellow-600", image: "https://i.ibb.co/6DPFVQD/binance-logo.png" },
  crypto_usdt_trc20: { label: "USDT (TRC20)", color: "from-emerald-500 to-teal-600", image: "https://i.ibb.co/k68drn2W/1000490523.png" },
  crypto_usdt_bep20: { label: "USDT (BEP20)", color: "from-yellow-500 to-amber-600", image: "https://i.ibb.co/CK5SZ5kW/1000490522.png" },
};

const PaymentGatewaysAdminPage = ({ adminFetch, onBack }: PaymentGatewaysAdminPageProps) => {
  const [gateways, setGateways] = useState<GatewayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<GatewayRow | null>(null);

  const fetchGateways = async () => {
    setLoading(true);
    try {
      const res = await adminFetch("/api/admin/payment-gateways");
      const data = await res.json();
      setGateways(Array.isArray(data) ? data : []);
    } catch {
      showToast("فشل تحميل بوابات الدفع", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGateways(); }, []);

  if (selected) {
    return (
      <GatewaySettingsForm
        gateway={selected}
        adminFetch={adminFetch}
        onBack={() => { setSelected(null); fetchGateways(); }}
      />
    );
  }

  return (
    <div className="px-4 space-y-6 pb-20">
      <div className="flex items-center gap-2 mb-2">
        <button onClick={onBack} className="p-2 bg-gray-100 rounded-full">
          <ArrowRight size={20} className="text-gray-600" />
        </button>
        <h2 className="text-xl font-bold text-gray-800">طرق الدفع الآلية</h2>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gray-300" size={28} /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {gateways.map((g) => {
            const meta = GATEWAY_META[g.gateway_code] || { label: g.gateway_name, color: "from-gray-400 to-gray-500", image: undefined };
            return (
              <button
                key={g.gateway_code}
                onClick={() => setSelected(g)}
                className="text-right bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md active:scale-[0.98] transition-all"
              >
                <div className={`h-16 bg-gradient-to-l ${meta.color} flex items-center px-4`}>
                  <img src={meta.image} alt={g.gateway_name || meta.label} className="w-10 h-10 rounded-lg object-cover bg-white/20" />
                </div>
                <div className="p-4 space-y-2">
                  <h3 className="font-bold text-gray-800">{g.gateway_name || meta.label}</h3>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    {g.is_active ? (
                      <span className="inline-flex items-center gap-1 text-green-600 font-bold"><CheckCircle2 size={13}/> مُفعّلة</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-gray-400 font-bold"><XCircle size={13}/> غير مُفعّلة</span>
                    )}
                    <span className="text-gray-300">•</span>
                    <span className={g.has_api_key ? "text-gray-500" : "text-red-400"}>
                      {g.has_api_key ? "المفتاح محفوظ ومشفّر" : "لم يُضبط المفتاح بعد"}
                    </span>
                  </div>
                  {g.last_test_msg && (
                    <p className={`text-[10px] truncate ${g.last_test_ok ? "text-green-500" : "text-red-400"}`}>{g.last_test_msg}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const GatewaySettingsForm = ({
  gateway,
  adminFetch,
  onBack,
}: {
  gateway: GatewayRow;
  adminFetch: (url: string, options?: any) => Promise<Response>;
  onBack: () => void;
}) => {
  const meta = GATEWAY_META[gateway.gateway_code] || { label: gateway.gateway_name, color: "from-gray-400 to-gray-500" };
  const [apiUrl, setApiUrl] = useState(gateway.api_url || "");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [isActive, setIsActive] = useState(gateway.is_active);
  const [maxAgeMinutes, setMaxAgeMinutes] = useState<number>(gateway.max_age_minutes ?? 0);
  const presetValues = ACCEPT_WINDOW_OPTIONS.map(o => o.value);
  const [isCustomWindow, setIsCustomWindow] = useState<boolean>(!presetValues.includes(gateway.max_age_minutes ?? 0));
  const [customUnit, setCustomUnit] = useState<"minutes" | "hours">("minutes");
  const [customValue, setCustomValue] = useState<string>(
    !presetValues.includes(gateway.max_age_minutes ?? 0) && gateway.max_age_minutes ? String(gateway.max_age_minutes) : ""
  );
  const isBinance = gateway.gateway_code === "binance";
  const isShamCash = gateway.gateway_code === "shamcash";
  // كل البوابات عدا Binance تدعم نظام الفواتير (شام كاش/سيرياتيل كاش/العملات الرقمية TRC20+BEP20)
  const supportsInvoiceMode = !isBinance;
  const [verificationMode, setVerificationMode] = useState<"transactions" | "invoices" | "webhook">(gateway.verification_mode || "transactions");
  const isInvoiceMode = supportsInvoiceMode && verificationMode === "invoices";
  const isWebhookMode = supportsInvoiceMode && verificationMode === "webhook";
  // الفواتير والشحن التلقائي كلاهما يستخدم max_age_minutes كـ"مدة صلاحية" محدودة (5-1440 دقيقة)
  const isExpiryBoundedMode = isInvoiceMode || isWebhookMode;
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTest = async () => {
    if (!apiUrl.trim() || (!apiKey.trim() && !gateway.has_api_key)) {
      showToast("أدخل رابط API ومفتاح API أولاً", "error");
      return;
    }
    if (isBinance && !apiSecret.trim() && !gateway.has_api_secret) {
      showToast("أدخل API Secret الخاص بـ Binance أولاً", "error");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await adminFetch(`/api/admin/payment-gateways/${gateway.gateway_code}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_url: apiUrl.trim(),
          api_key: apiKey.trim() || undefined,
          ...(isBinance ? { api_secret: apiSecret.trim() || undefined } : {}),
        }),
      });
      const data = await res.json();
      setTestResult({ success: !!data.success, message: data.message || (data.success ? "تم الاتصال بنجاح" : "فشل الاتصال") });
      showToast(data.message || (data.success ? "تم الاتصال بنجاح" : "فشل الاتصال"), data.success ? "success" : "error");
    } catch {
      setTestResult({ success: false, message: "تعذّر الوصول إلى الخادم" });
      showToast("تعذّر الوصول إلى الخادم", "error");
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!apiUrl.trim()) {
      showToast("رابط API مطلوب", "error");
      return;
    }
    if (isCustomWindow && (!customValue.trim() || maxAgeMinutes <= 0)) {
      showToast("أدخل قيمة صحيحة للمدة الزمنية المخصصة", "error");
      return;
    }
    if (isExpiryBoundedMode && (maxAgeMinutes < 5 || maxAgeMinutes > 1440)) {
      showToast("مدة الصلاحية يجب أن تكون بين 5 و1440 دقيقة", "error");
      return;
    }
    setSaving(true);
    try {
      const payload: any = { api_url: apiUrl.trim(), is_active: isActive, max_age_minutes: maxAgeMinutes };
      if (supportsInvoiceMode) payload.verification_mode = verificationMode;
      if (apiKey.trim()) payload.api_key = apiKey.trim();
      if (isBinance && apiSecret.trim()) payload.api_secret = apiSecret.trim();
      const res = await adminFetch(`/api/admin/payment-gateways/${gateway.gateway_code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "فشل الحفظ");
      showToast("تم حفظ إعدادات البوابة بنجاح", "success");
      setApiKey("");
      setApiSecret("");
      onBack();
    } catch (e: any) {
      showToast(e?.message || "فشل حفظ الإعدادات", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-4 space-y-6 pb-20">
      <div className="flex items-center gap-2 mb-2">
        <button onClick={onBack} className="p-2 bg-gray-100 rounded-full">
          <ArrowRight size={20} className="text-gray-600" />
        </button>
        <h2 className="text-xl font-bold text-gray-800">{gateway.gateway_name || meta.label}</h2>
      </div>

      <div className={`rounded-2xl bg-gradient-to-l ${meta.color} p-4 text-white flex items-center gap-3`}>
        <img src={GATEWAY_META[gateway.gateway_code]?.image} alt={gateway.gateway_name || meta.label} className="w-12 h-12 rounded-lg object-cover bg-white/20" />
        <div>
          <p className="font-bold">{gateway.gateway_name || meta.label}</p>
          <p className="text-[11px] opacity-90">إعدادات API</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-gray-700">تفعيل البوابة</span>
          <button
            onClick={() => setIsActive(!isActive)}
            className={`w-10 h-5 rounded-full relative transition-colors ${isActive ? "bg-brand" : "bg-gray-200"}`}
          >
            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isActive ? "right-1" : "left-1"}`} />
          </button>
        </div>

        {supportsInvoiceMode && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 flex items-center gap-1.5"><ShieldCheck size={13}/> نظام التحقق</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setVerificationMode("transactions")}
                className={`p-2.5 rounded-lg text-[11px] font-bold border transition-colors ${verificationMode === "transactions" ? "bg-brand text-white border-brand" : "bg-gray-50 text-gray-600 border-gray-200"}`}
              >
                جلب المعاملات (القديم)
              </button>
              <button
                type="button"
                onClick={() => setVerificationMode("invoices")}
                className={`p-2.5 rounded-lg text-[11px] font-bold border transition-colors ${verificationMode === "invoices" ? "bg-brand text-white border-brand" : "bg-gray-50 text-gray-600 border-gray-200"}`}
              >
                الفواتير
              </button>
              <button
                type="button"
                onClick={() => setVerificationMode("webhook")}
                className={`p-2.5 rounded-lg text-[11px] font-bold border transition-colors ${verificationMode === "webhook" ? "bg-brand text-white border-brand" : "bg-gray-50 text-gray-600 border-gray-200"}`}
              >
                الشحن التلقائي
              </button>
            </div>
            <p className="text-[10px] text-gray-400">
              {verificationMode === "invoices"
                ? "المستخدم يُنشئ فاتورة برقم محدد قبل التحويل، وتُغلق تلقائياً عند إدخال رقم العملية."
                : verificationMode === "webhook"
                ? "المستخدم يحصل على رمز مميز يضعه بالملاحظة ويحوّل أي مبلغ — الموقع يستقبل كل عملية واردة تلقائياً عبر Webhook ويعتمد الشحن فور وصولها دون أي إدخال من المستخدم لاحقاً."
                : "المستخدم يحوّل أولاً ثم يُدخل رقم العملية، فيتحقق النظام من كل معاملات المحفظة."}
            </p>
          </div>
        )}

        {isWebhookMode && (
          <div className="space-y-1.5 p-3 bg-cyan-50 rounded-lg border border-cyan-100">
            <label className="text-xs font-bold text-cyan-700 flex items-center gap-1.5"><Link2 size={13}/> رابط الويبهوك (Webhook URL)</label>
            {gateway.webhook_url ? (
              <>
                <div className="flex items-center gap-2">
                  <p dir="ltr" className="flex-1 min-w-0 bg-white rounded-md border border-cyan-200 px-2.5 py-2 text-[11px] font-mono text-gray-700 break-all">{gateway.webhook_url}</p>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(gateway.webhook_url || "").then(() => showToast("تم نسخ الرابط", "success")).catch(() => showToast("فشل النسخ", "error"));
                    }}
                    className="shrink-0 bg-cyan-600 text-white text-[11px] font-bold px-3 py-2 rounded-md active:scale-95"
                  >
                    نسخ
                  </button>
                </div>
                <p className="text-[10px] text-cyan-600">انسخ هذا الرابط وضعه في موقع CYB Client (أو إعدادات Webhook لدى شام كاش) كرابط استقبال إشعارات المعاملات لهذه المحفظة.</p>
              </>
            ) : (
              <p className="text-[10px] text-red-500">تعذّر توليد رابط الويبهوك — تأكد من ضبط PUBLIC_SITE_URL وسر الويبهوك بالخادم.</p>
            )}
          </div>
        )}

        {isExpiryBoundedMode ? (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 flex items-center gap-1.5"><ShieldCheck size={13}/> {isWebhookMode ? "مدة صلاحية الرمز (بالدقائق)" : "مدة صلاحية الفاتورة (بالدقائق)"}</label>
            <input
              type="number"
              min={5}
              max={1440}
              value={maxAgeMinutes || 30}
              onChange={(e) => {
                const n = Math.floor(Number(e.target.value));
                setMaxAgeMinutes(isNaN(n) ? 30 : n);
              }}
              placeholder="30"
              className="w-full p-3 bg-gray-50 rounded-lg text-sm outline-none border border-gray-200 focus:border-brand"
              dir="ltr"
            />
            <p className="text-[10px] text-gray-400">
              {isWebhookMode
                ? "بين 5 و1440 دقيقة — ينتهي الرمز تلقائياً بعد هذه المدة إن لم يصل تحويل يحمله"
                : "بين 5 و1440 دقيقة — تنتهي الفاتورة تلقائياً بعد هذه المدة دون دفع"}
            </p>
            {isShamCash && isInvoiceMode && (
              <p className="text-[10px] text-amber-500 flex items-center gap-1">⚠️ تجنّب استخدام عملة اليورو (EUR) لفواتير شام كاش حالياً بسبب سلوك تحويل غير مكتمل من طرف المزوّد</p>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 flex items-center gap-1.5"><ShieldCheck size={13}/> مدة قبول العمليات</label>
            <select
              value={isCustomWindow ? CUSTOM_OPTION_VALUE : maxAgeMinutes}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v === CUSTOM_OPTION_VALUE) {
                  setIsCustomWindow(true);
                } else {
                  setIsCustomWindow(false);
                  setMaxAgeMinutes(v);
                }
              }}
              className="w-full p-3 bg-gray-50 rounded-lg text-sm outline-none border border-gray-200 focus:border-brand"
            >
              {ACCEPT_WINDOW_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
              <option value={CUSTOM_OPTION_VALUE}>تحديد يدوي (دقائق أو ساعات)</option>
            </select>

            {isCustomWindow && (
              <div className="flex gap-2 pt-1">
                <input
                  type="number"
                  min={1}
                  value={customValue}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setCustomValue(raw);
                    const n = parseFloat(raw);
                    if (!isNaN(n) && n > 0) {
                      setMaxAgeMinutes(Math.round(customUnit === "hours" ? n * 60 : n));
                    } else {
                      setMaxAgeMinutes(0);
                    }
                  }}
                  placeholder="مثال: 45"
                  className="flex-1 p-3 bg-gray-50 rounded-lg text-sm outline-none border border-gray-200 focus:border-brand"
                  dir="ltr"
                />
                <select
                  value={customUnit}
                  onChange={(e) => {
                    const unit = e.target.value as "minutes" | "hours";
                    setCustomUnit(unit);
                    const n = parseFloat(customValue);
                    if (!isNaN(n) && n > 0) {
                      setMaxAgeMinutes(Math.round(unit === "hours" ? n * 60 : n));
                    }
                  }}
                  className="w-28 p-3 bg-gray-50 rounded-lg text-sm outline-none border border-gray-200 focus:border-brand"
                >
                  <option value="minutes">دقيقة</option>
                  <option value="hours">ساعة</option>
                </select>
              </div>
            )}
            <p className="text-[10px] text-gray-400">أي رقم عملية أقدم من هذه المدة سيُرفض تلقائياً عند التحقق</p>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-500 flex items-center gap-1.5"><Link2 size={13}/> رابط API (Base URL)</label>
          <input
            type="text"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="https://apis-shamcash.com/api"
            className="w-full p-3 bg-gray-50 rounded-lg text-sm outline-none border border-gray-200 focus:border-brand"
            dir="ltr"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-500 flex items-center gap-1.5"><KeyRound size={13}/> مفتاح API (API Key)</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={gateway.has_api_key ? "•••••••••••••• (محفوظ ومشفّر — اتركه فارغاً لعدم التغيير)" : "أدخل مفتاح API"}
            className="w-full p-3 bg-gray-50 rounded-lg text-sm outline-none border border-gray-200 focus:border-brand"
            dir="ltr"
          />
          <p className="text-[10px] text-gray-400 flex items-center gap-1"><ShieldCheck size={13}/> يُشفّر تلقائياً بـ AES-256-GCM قبل الحفظ ولا يُعرض لاحقاً</p>
        </div>

        {isBinance && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 flex items-center gap-1.5"><KeyRound size={13}/> السر (API Secret)</label>
            <input
              type="password"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder={gateway.has_api_secret ? "•••••••••••••• (محفوظ ومشفّر — اتركه فارغاً لعدم التغيير)" : "أدخل API Secret الخاص بـ Binance"}
              className="w-full p-3 bg-gray-50 rounded-lg text-sm outline-none border border-gray-200 focus:border-brand"
              dir="ltr"
            />
            <p className="text-[10px] text-gray-400 flex items-center gap-1"><ShieldCheck size={13}/> يُشفّر تلقائياً بـ AES-256-GCM قبل الحفظ ولا يُعرض لاحقاً</p>
          </div>
        )}

        {testResult && (
          <div className={`text-xs font-bold p-3 rounded-lg flex items-center gap-2 ${testResult.success ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>
            {testResult.success ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
            {testResult.message}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleTest}
            disabled={testing || saving}
            className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {testing ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            اختبار
          </button>
          <button
            onClick={handleSave}
            disabled={saving || testing}
            className="flex-1 bg-[var(--brand)] text-white py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            حفظ
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentGatewaysAdminPage;
