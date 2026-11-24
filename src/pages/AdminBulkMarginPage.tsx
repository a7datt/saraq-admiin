import React, { useState } from "react";
import { ChevronRight, Percent, Eye, Check } from "lucide-react";
import { showToast } from "../components/ToastContainer";
import DiscountScopePicker, { ScopeSel } from "../components/DiscountScopePicker";

interface Props {
  adminFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onBack: () => void;
}

type Preview = { total_in_scope: number; affected: number; skipped: number; samples: { id: number; name: string; old_price: number; new_price: number }[] };

/**
 * [PHASE-2] تعديل نسبة الربح بالجملة: نفس اختيار النطاق (كل المنتجات / أقسام / فروع / منتجات محددة)،
 * رفع أو خفض أو ضبط النسبة، ثم معاينة (عدد المتأثرة + أمثلة قبل/بعد) وزر تأكيد.
 * يطبَّق على منتجات المزوّد الخارجي فقط (لها أساس تكلفة)؛ البقية تُتخطّى وتظهر بالمعاينة.
 */
export default function AdminBulkMarginPage({ adminFetch, onBack }: Props) {
  const [scopes, setScopes] = useState<ScopeSel[]>([]);
  const [op, setOp] = useState<"set" | "increase" | "decrease">("increase");
  const [markupType, setMarkupType] = useState<"percent" | "fixed">("percent");
  const [value, setValue] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);

  const body = () => ({
    scopes: scopes.map(s => ({ scope_type: s.scope_type, scope_id: s.scope_id })),
    op, markup_type: markupType, value: Number(value),
  });
  const valid = () => {
    if (scopes.length === 0) { showToast("اختر نطاقاً واحداً على الأقل", "error"); return false; }
    if (value === "" || !Number.isFinite(Number(value)) || Number(value) < 0) { showToast("أدخل قيمة صحيحة", "error"); return false; }
    return true;
  };
  const invalidate = () => setPreview(null);

  const runPreview = async () => {
    if (!valid()) return;
    setBusy(true);
    try {
      const res = await adminFetch("/api/admin/products/bulk-profit/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body()) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) showToast(data?.error || "فشلت المعاينة", "error"); else setPreview(data);
    } catch { showToast("خطأ في الاتصال", "error"); }
    setBusy(false);
  };

  const apply = async () => {
    if (!preview || preview.affected === 0) return;
    setBusy(true);
    try {
      const res = await adminFetch("/api/admin/products/bulk-profit/apply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body(), expected_count: preview.affected }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) showToast(data?.error || "فشل التطبيق", "error");
      else { showToast(`تم تعديل ${data.updated} منتج${data.failed ? ` (فشل ${data.failed})` : ""}`, "success"); setPreview(null); }
    } catch { showToast("خطأ في الاتصال", "error"); }
    setBusy(false);
  };

  const unit = markupType === "percent" ? "%" : "$";
  const fmt = (n: number) => (Math.round(n * 1e6) / 1e6).toString();

  return (
    <div className="space-y-4 pb-20" dir="rtl">
      <button onClick={onBack} className="flex items-center gap-1 text-xs font-bold text-gray-500"><ChevronRight size={16} /> رجوع</button>
      <h2 className="font-black text-gray-800 flex items-center gap-2"><Percent size={18} className="text-teal-600" /> تعديل نسبة الربح بالجملة</h2>

      <div className="bg-white border border-gray-100 rounded-lg p-3 space-y-3">
        <p className="text-xs font-bold text-gray-600">1) النطاق</p>
        <DiscountScopePicker adminFetch={adminFetch} selected={scopes} onChange={s => { setScopes(s); invalidate(); }} />
      </div>

      <div className="bg-white border border-gray-100 rounded-lg p-3 space-y-3">
        <p className="text-xs font-bold text-gray-600">2) العملية</p>
        <div className="grid grid-cols-3 gap-2">
          {([["increase", "رفع الربح"], ["decrease", "خفض الربح"], ["set", "ضبط الربح"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => { setOp(k); invalidate(); }} className={`p-2.5 rounded-lg border text-[11px] font-bold ${op === k ? "bg-blue-50 border-[var(--brand)] text-[var(--brand)]" : "bg-gray-50 border-gray-100 text-gray-500"}`}>{l}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {([["percent", "نسبة مئوية %"], ["fixed", "مبلغ ثابت $"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => { setMarkupType(k); invalidate(); }} className={`p-2.5 rounded-lg border text-[11px] font-bold ${markupType === k ? "bg-blue-50 border-[var(--brand)] text-[var(--brand)]" : "bg-gray-50 border-gray-100 text-gray-500"}`}>{l}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input type="number" min={0} step="0.1" value={value} onChange={e => { setValue(e.target.value); invalidate(); }} placeholder={op === "set" ? "قيمة الربح الجديدة" : "مقدار التغيير"}
            className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-black text-center outline-none" />
          <span className="font-bold text-gray-400">{unit}</span>
        </div>
        <p className="text-[10px] text-gray-400 leading-relaxed">الربح يُحسب فوق سعر المزوّد (التكلفة). الرفع/الخفض يُحسب من الربح الحالي لكل منتج على حدة، ولا ينزل الربح عن صفر.</p>
        <button onClick={runPreview} disabled={busy} className="w-full flex items-center justify-center gap-1.5 py-3 rounded-lg bg-gray-800 text-white text-sm font-bold disabled:opacity-40"><Eye size={15} /> معاينة قبل التطبيق</button>
      </div>

      {preview && (
        <div className="bg-white border border-teal-200 rounded-lg p-3 space-y-3">
          <p className="text-xs font-black text-teal-700">نتيجة المعاينة</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-teal-50 rounded-lg p-2"><p className="text-lg font-black text-teal-700">{preview.affected}</p><p className="text-[10px] text-gray-500">ستتأثر</p></div>
            <div className="bg-gray-50 rounded-lg p-2"><p className="text-lg font-black text-gray-600">{preview.skipped}</p><p className="text-[10px] text-gray-500">تُتخطّى (بلا مزوّد)</p></div>
            <div className="bg-gray-50 rounded-lg p-2"><p className="text-lg font-black text-gray-600">{preview.total_in_scope}</p><p className="text-[10px] text-gray-500">إجمالي النطاق</p></div>
          </div>
          {preview.samples.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-gray-400">أمثلة (السعر قبل ← بعد)</p>
              {preview.samples.map(s => (
                <div key={s.id} className="flex items-center justify-between gap-2 text-[11px] bg-gray-50 rounded-md px-2 py-1.5">
                  <span className="truncate text-gray-600">{s.name}</span>
                  <span className="whitespace-nowrap font-bold" dir="ltr">{fmt(s.old_price)} → <span className={s.new_price >= s.old_price ? "text-green-600" : "text-red-500"}>{fmt(s.new_price)}</span></span>
                </div>
              ))}
            </div>
          )}
          <button onClick={apply} disabled={busy || preview.affected === 0} className="w-full flex items-center justify-center gap-1.5 py-3 rounded-lg bg-[var(--brand)] text-white text-sm font-bold disabled:opacity-40">
            <Check size={15} /> {busy ? "جارِ التطبيق..." : `تأكيد وتطبيق على ${preview.affected} منتج`}
          </button>
        </div>
      )}
    </div>
  );
}
