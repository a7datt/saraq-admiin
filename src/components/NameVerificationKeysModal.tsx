/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { X, KeyRound, Check, Trash2, ListChecks } from "lucide-react";
import BulkNameVerificationModal from "./BulkNameVerificationModal";

interface NameVerificationKeysModalProps {
  open: boolean;
  onClose: () => void;
  adminFetch: (url: string, options?: RequestInit) => Promise<Response>;
  showToast: (msg: string, type: "success" | "error") => void;
}

interface KeyRow {
  game: string;
  label: string;
  configured: boolean;
  provider_enabled: boolean;
  price_per_check: number;
}

/**
 * نافذة "تخصيص مفاتيح التحقق من الاسم" — تُتاح من الإجراءات السريعة، إعدادات المتجر.
 * المفاتيح تُشفَّر في قاعدة البيانات (settings) ولا تُخزَّن أبداً داخل الكود المصدري.
 */
export const NameVerificationKeysModal: React.FC<NameVerificationKeysModalProps> = ({ open, onClose, adminFetch, showToast }) => {
  const [rows, setRows] = useState<KeyRow[]>([]);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [savingPrice, setSavingPrice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  // [NV BULK] نافذة التفعيل الجماعي — تُفتح من زر أسفل النافذة أو من بطاقة مزوّد محدّد
  const [bulkOpen, setBulkOpen] = useState(false);

  const load = () => {
    setLoading(true);
    adminFetch("/api/admin/name-verification/keys")
      .then(r => r.json())
      .then(data => {
        const list: KeyRow[] = Array.isArray(data) ? data : [];
        setRows(list);
        // نملأ حقول السعر بالقيم المحفوظة حالياً حتى لا تظهر فارغة لأدمن يعيد فتح النافذة
        setPriceInputs(prev => {
          const next = { ...prev };
          for (const r of list) {
            if (next[r.game] === undefined) next[r.game] = String(r.price_per_check ?? 0);
          }
          return next;
        });
      })
      .catch(() => showToast("تعذر تحميل حالة المفاتيح", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  if (!open) return null;

  const handleSave = async (game: string) => {
    const key = (inputs[game] || "").trim();
    if (!key) return showToast("يرجى إدخال مفتاح API", "error");
    setSaving(game);
    try {
      const res = await adminFetch("/api/admin/name-verification/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game, api_key: key }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("تم حفظ المفتاح وتشفيره بنجاح", "success");
        setInputs(prev => ({ ...prev, [game]: "" }));
        load();
      } else {
        showToast(data.error || "فشل حفظ المفتاح", "error");
      }
    } catch {
      showToast("فشل الاتصال بالخادم", "error");
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (game: string) => {
    setSaving(game);
    try {
      const res = await adminFetch(`/api/admin/name-verification/keys/${game}`, { method: "DELETE" });
      if (res.ok) {
        showToast("تم حذف المفتاح", "success");
        load();
      } else {
        showToast("فشل حذف المفتاح", "error");
      }
    } catch {
      showToast("فشل الاتصال بالخادم", "error");
    } finally {
      setSaving(null);
    }
  };

  const handleToggleProvider = async (game: string, nextEnabled: boolean) => {
    setToggling(game);
    // تحديث متفائل فوري للواجهة، مع تراجع تلقائي إن فشل الطلب
    setRows(prev => prev.map(r => (r.game === game ? { ...r, provider_enabled: nextEnabled } : r)));
    try {
      const res = await adminFetch(`/api/admin/name-verification/keys/${game}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextEnabled }),
      });
      if (res.ok) {
        showToast(nextEnabled ? "تم تفعيل المزوّد — عاد زر التحقق للظهور في كل المنتجات المرتبطة به" : "تم تعطيل المزوّد — اختفى زر التحقق مؤقتاً من كل المنتجات المرتبطة به", "success");
      } else {
        setRows(prev => prev.map(r => (r.game === game ? { ...r, provider_enabled: !nextEnabled } : r)));
        showToast("فشل تحديث حالة التفعيل", "error");
      }
    } catch {
      setRows(prev => prev.map(r => (r.game === game ? { ...r, provider_enabled: !nextEnabled } : r)));
      showToast("فشل الاتصال بالخادم", "error");
    } finally {
      setToggling(null);
    }
  };

  const handleSavePrice = async (game: string) => {
    const raw = (priceInputs[game] ?? "").trim();
    // نقبل عشرياً (مثل 0.01) وصفراً (0 = بدون أي خصم) — نرفض فقط القيم غير الرقمية أو السالبة
    const normalizedRaw = raw.replace(",", ".");
    const parsed = normalizedRaw === "" ? 0 : parseFloat(normalizedRaw);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return showToast("يرجى إدخال سعر صالح (رقم عشري أكبر من أو يساوي صفر)", "error");
    }
    setSavingPrice(game);
    try {
      const res = await adminFetch(`/api/admin/name-verification/keys/${game}/price`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: parsed }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(parsed === 0 ? "تم الحفظ — لا يوجد خصم على عملية التحقق لهذا المزوّد" : `تم حفظ سعر التحقق: ${data.price_per_check} لكل عملية`, "success");
        setRows(prev => prev.map(r => (r.game === game ? { ...r, price_per_check: data.price_per_check } : r)));
        setPriceInputs(prev => ({ ...prev, [game]: String(data.price_per_check) }));
      } else {
        showToast(data.error || "فشل حفظ السعر", "error");
      }
    } catch {
      showToast("فشل الاتصال بالخادم", "error");
    } finally {
      setSavingPrice(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <KeyRound size={18} className="text-cyan-600" /> تخصيص مفاتيح التحقق من الاسم
          </h3>
          <button onClick={onClose} className="text-gray-400"><X size={22} /></button>
        </div>
        <p className="text-[11px] text-gray-500 leading-relaxed">
          تُشفَّر هذه المفاتيح فور الحفظ وتُخزَّن في قاعدة البيانات فقط — لا تُستخدم أبداً داخل الكود المصدري لتفادي أي تسريب.
          إن لم تُضَف هنا، سيظهر تنبيه بضرورة تفعيلها عند محاولة استخدام ميزة التحقق من الاسم لأي منتج.
        </p>

        {loading ? (
          <div className="text-center text-sm text-gray-400 py-6">جارٍ التحميل...</div>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <div key={row.game} className={`p-3 rounded-lg border space-y-2 transition-opacity ${row.provider_enabled ? "bg-gray-50 border-gray-100" : "bg-gray-50/60 border-gray-100 opacity-70"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-700">{row.label}</span>
                  {row.configured ? (
                    <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Check size={11} /> مفتاح مضاف
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">لا يوجد مفتاح</span>
                  )}
                </div>

                {/* مفتاح تفعيل/تعطيل المزوّد بالكامل — يُخفي/يُظهر فوراً زر "تحقق من الاسم" في كل المنتجات المرتبطة بهذا المزوّد دون المساس ببياناتها */}
                <div className="flex items-center justify-between p-2 bg-white rounded-md border border-gray-100">
                  <span className="text-[11px] font-bold text-gray-600">
                    {row.provider_enabled ? "المزوّد مفعّل — زر التحقق ظاهر للعملاء" : "المزوّد معطّل — زر التحقق مخفي عن العملاء"}
                  </span>
                  <button
                    type="button"
                    disabled={toggling === row.game}
                    onClick={() => handleToggleProvider(row.game, !row.provider_enabled)}
                    aria-pressed={row.provider_enabled}
                    className={`relative w-10 h-5.5 rounded-full transition-colors disabled:opacity-50 ${row.provider_enabled ? "bg-green-500" : "bg-gray-300"}`}
                  >
                    <span
                      className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${row.provider_enabled ? "right-0.5" : "right-5"}`}
                    />
                  </button>
                </div>

                {/* [NV BULK] تفعيل زر التحقق على عدة منتجات دفعة واحدة بدل الدخول لكل منتج على حدة */}
                <button
                  type="button"
                  onClick={() => setBulkOpen(true)}
                  className="w-full flex items-center justify-center gap-1.5 p-2 rounded-md bg-cyan-50 border border-cyan-200 text-cyan-700 text-[11px] font-bold hover:bg-cyan-100 transition-colors"
                >
                  <ListChecks size={13} /> تفعيل زر التحقق لمنتجات متعددة
                </button>

                {/* سعر الضغطة الواحدة لكل عملية تحقق من الاسم — يقبل عشرياً (مثل 0.01) والقيمة صفر (0 = بدون أي خصم من رصيد المستخدم ولا إظهار أي إشارة لذلك بصفحة تأكيد الطلب) */}
                <div className="flex items-center gap-2 p-2 bg-white rounded-md border border-gray-100">
                  <span className="text-[11px] font-bold text-gray-600 shrink-0">سعر التحقق (لكل عملية)</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={priceInputs[row.game] ?? String(row.price_per_check ?? 0)}
                    onChange={(e) => {
                      const v = e.target.value;
                      // نسمح فقط بأرقام وفاصلة عشرية واحدة أثناء الكتابة
                      if (v === "" || /^\d*\.?\d*$/.test(v)) {
                        setPriceInputs(prev => ({ ...prev, [row.game]: v }));
                      }
                    }}
                    className="flex-1 min-w-0 p-1.5 bg-gray-50 rounded-md text-xs outline-none border border-gray-200 text-left"
                    dir="ltr"
                  />
                  <span className="text-[10px] text-gray-400 shrink-0">$</span>
                  <button
                    disabled={savingPrice === row.game}
                    onClick={() => handleSavePrice(row.game)}
                    className="px-3 py-1.5 rounded-md bg-emerald-500 text-white text-xs font-bold disabled:opacity-50 shrink-0"
                  >
                    {savingPrice === row.game ? "..." : "حفظ السعر"}
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder={row.configured ? "أدخل مفتاحاً جديداً لاستبدال الحالي" : "أدخل مفتاح API"}
                    value={inputs[row.game] || ""}
                    onChange={(e) => setInputs(prev => ({ ...prev, [row.game]: e.target.value }))}
                    className="flex-1 p-2 bg-white rounded-md text-xs outline-none border border-gray-200"
                  />
                  <button
                    disabled={saving === row.game}
                    onClick={() => handleSave(row.game)}
                    className="px-3 py-2 rounded-md bg-cyan-500 text-white text-xs font-bold disabled:opacity-50"
                  >
                    {saving === row.game ? "..." : "حفظ"}
                  </button>
                  {row.configured && (
                    <button
                      disabled={saving === row.game}
                      onClick={() => handleDelete(row.game)}
                      className="px-2.5 py-2 rounded-md bg-red-50 text-red-500 disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* [NV BULK] نافذة التفعيل الجماعي — مستقلة عن نافذة المفاتيح وتُغلق بدونها */}
      <div onClick={(e) => e.stopPropagation()}>
        <BulkNameVerificationModal
          open={bulkOpen}
          onClose={() => setBulkOpen(false)}
          adminFetch={adminFetch}
          showToast={showToast}
        />
      </div>
    </div>
  );
};

export default NameVerificationKeysModal;
