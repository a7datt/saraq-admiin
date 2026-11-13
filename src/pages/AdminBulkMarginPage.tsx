import React, { useEffect, useMemo, useState } from "react";
import { ChevronRight, Percent, LayoutGrid, ChevronDown, Save } from "lucide-react";
import { showToast } from "../components/ToastContainer";

interface Props {
  adminFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onBack: () => void;
}

type ScopeItem = { category_type: "category" | "subcategory"; category_id: number };

export default function AdminBulkMarginPage({ adminFetch, onBack }: Props) {
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [scope, setScope] = useState<ScopeItem[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [markupType, setMarkupType] = useState<"percent" | "fixed">("percent");
  const [markupValue, setMarkupValue] = useState("0");
  const [previewBase, setPreviewBase] = useState("100");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [catsRes, subsRes] = await Promise.all([
          adminFetch("/api/categories?admin=1"), adminFetch("/api/subcategories?admin=1"),
        ]);
        setCategories(await catsRes.json().catch(() => []));
        setSubcategories(await subsRes.json().catch(() => []));
      } catch { setCategories([]); setSubcategories([]); }
    })();
  }, []);

  const subsByCategory = useMemo(() => {
    const m: Record<string, any[]> = {};
    for (const s of subcategories) { (m[String(s.category_id)] = m[String(s.category_id)] || []).push(s); }
    return m;
  }, [subcategories]);

  const isSelected = (type: "category" | "subcategory", id: number) =>
    scope.some(s => s.category_type === type && Number(s.category_id) === Number(id));

  const toggleCategory = (catId: number) => {
    const subs = subsByCategory[String(catId)] || [];
    setScope(prev => {
      const without = prev.filter(s => !(s.category_type === "category" && Number(s.category_id) === catId) && !(s.category_type === "subcategory" && subs.some((sc: any) => Number(sc.id) === Number(s.category_id))));
      return isSelected("category", catId) ? without : [...without, { category_type: "category", category_id: catId }];
    });
  };

  const toggleSubcategory = (subId: number, catId: number) => {
    setScope(prev => {
      const withoutParent = prev.filter(s => !(s.category_type === "category" && Number(s.category_id) === catId));
      const already = withoutParent.some(s => s.category_type === "subcategory" && Number(s.category_id) === subId);
      return already
        ? withoutParent.filter(s => !(s.category_type === "subcategory" && Number(s.category_id) === subId))
        : [...withoutParent, { category_type: "subcategory", category_id: subId }];
    });
  };

  const previewResult = useMemo(() => {
    const base = Number(previewBase) || 0;
    const v = Number(markupValue) || 0;
    return markupType === "fixed" ? base + v : base * (1 + v / 100);
  }, [previewBase, markupValue, markupType]);

  const apply = async () => {
    if (scope.length === 0) { showToast("يرجى اختيار قسم واحد على الأقل", "error"); return; }
    if (markupValue === "" || isNaN(Number(markupValue))) { showToast("أدخل نسبة/مبلغ ربح صحيح", "error"); return; }
    setSaving(true);
    try {
      const res = await adminFetch("/api/admin/products/bulk-margin", {
        method: "POST",
        body: JSON.stringify({ items: scope, markup_type: markupType, markup_value: Number(markupValue) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { showToast(data?.error || "فشل التطبيق", "error"); setSaving(false); return; }
      showToast(`تم تعديل الربح على ${data.updated} منتج${data.skipped ? ` (تم تجاهل ${data.skipped} منتج غير مرتبط بمزوّد خارجي)` : ""}`, "success");
    } catch { showToast("خطأ في الاتصال", "error"); }
    setSaving(false);
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-700 p-1 -m-1"><ChevronRight size={22} /></button>
        <h2 className="font-black text-lg text-gray-800 flex items-center gap-2"><Percent size={18} className="text-[var(--brand)]" /> تعديل نسبة الربح</h2>
      </div>

      <p className="text-[11px] text-gray-500 leading-relaxed bg-gray-50 border border-gray-200 rounded-lg p-3">
        اختر أقساماً رئيسية كاملة و/أو أقساماً فرعية محددة، ثم طبّق نسبة/مبلغ ربح موحّداً على جميع منتجاتها المرتبطة بمزوّد خارجي (store_type: API) دفعة واحدة — يُعاد حساب السعر النهائي لكل منتج فوراً.
      </p>

      <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400">نوع الربح</label>
            <div className="flex bg-gray-50 border border-gray-200 rounded-lg p-1">
              <button onClick={() => setMarkupType("percent")} className={`flex-1 py-1.5 rounded-md text-xs font-black ${markupType === "percent" ? "bg-[var(--brand)] text-white" : "text-gray-500"}`}>نسبة %</button>
              <button onClick={() => setMarkupType("fixed")} className={`flex-1 py-1.5 rounded-md text-xs font-black ${markupType === "fixed" ? "bg-[var(--brand)] text-white" : "text-gray-500"}`}>مبلغ ثابت</button>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400">القيمة {markupType === "percent" ? "(%)" : "($)"}</label>
            <input type="number" step="0.5" value={markupValue} onChange={e => setMarkupValue(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-black outline-none text-center" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-400">الأقسام المستهدفة</label>
          <div className="bg-gray-50 border border-gray-200 rounded-lg max-h-56 overflow-y-auto divide-y divide-gray-100">
            {categories.length === 0 && <p className="text-[11px] text-gray-400 p-3 text-center">جاري تحميل الأقسام...</p>}
            {categories.map((cat: any) => {
              const subs = subsByCategory[String(cat.id)] || [];
              const catSelected = isSelected("category", cat.id);
              const isOpen = !!expanded[cat.id];
              return (
                <div key={cat.id}>
                  <div className="flex items-center gap-2 p-2">
                    <input type="checkbox" checked={catSelected} onChange={() => toggleCategory(cat.id)} className="w-4 h-4 accent-[var(--brand)]" />
                    <LayoutGrid size={12} className="text-gray-400 shrink-0" />
                    <span className="text-xs font-bold text-gray-700 flex-1 truncate">{cat.name}</span>
                    {subs.length > 0 && (
                      <button type="button" onClick={() => setExpanded(e => ({ ...e, [cat.id]: !e[cat.id] }))} className="p-1 text-gray-400">
                        <ChevronDown size={14} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                    )}
                  </div>
                  {isOpen && subs.length > 0 && (
                    <div className="pr-8 pb-1.5 space-y-1">
                      {subs.map((sub: any) => (
                        <label key={sub.id} className="flex items-center gap-2 text-[11px] text-gray-600">
                          <input type="checkbox" disabled={catSelected} checked={catSelected || isSelected("subcategory", sub.id)}
                            onChange={() => toggleSubcategory(sub.id, cat.id)} className="w-3.5 h-3.5 accent-[var(--brand)]" />
                          <span className={catSelected ? "opacity-50" : ""}>{sub.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-gray-400">{scope.length === 0 ? "لم يُحدَّد أي قسم." : `تم اختيار ${scope.length} قسم/قسم فرعي.`}</p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 flex items-center gap-2">
          <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap">معاينة: سعر تجريبي (التكلفة) $</span>
          <input type="number" min={0} value={previewBase} onChange={e => setPreviewBase(e.target.value)} className="w-20 p-1.5 bg-white border border-gray-200 rounded-md text-xs font-black text-center outline-none" />
          <span className="text-gray-300">⇐</span>
          <span className="text-sm font-black text-[var(--brand)]">{previewResult.toFixed(2)}$</span>
          <span className="text-[10px] text-gray-400">السعر النهائي بعد الربح</span>
        </div>

        <button onClick={apply} disabled={saving} className="w-full bg-[var(--brand)] text-white py-3 rounded-xl font-black text-sm flex items-center justify-center gap-1.5 disabled:opacity-60 active:scale-[0.98]">
          <Save size={15} /> {saving ? "جاري التطبيق..." : "تطبيق على الأقسام المختارة"}
        </button>
      </div>
    </div>
  );
}
