import React, { useEffect, useMemo, useState } from "react";
import { Search, ChevronDown, X } from "lucide-react";

export type ScopeType = "all" | "category" | "subcategory" | "sub_sub_category" | "product";
export interface ScopeSel { scope_type: ScopeType; scope_id: number | null; label: string }

interface Props {
  adminFetch: (url: string, options?: RequestInit) => Promise<Response>;
  selected: ScopeSel[];
  onChange: (next: ScopeSel[]) => void;
  /** السماح بخيار "كل المنتجات" */
  allowAll?: boolean;
}

const TYPE_LABEL: Record<ScopeType, string> = {
  all: "كل المنتجات", category: "قسم رئيسي", subcategory: "قسم فرعي", sub_sub_category: "فرع فرعي", product: "منتج",
};
export const scopeTypeLabel = (t: ScopeType) => TYPE_LABEL[t];

/**
 * [PHASE-2] واجهة اختيار النطاق: شجرة أقسام (رئيسي ← فرعي ← فرع فرعي) مع بحث، واختيار متعدد
 * للمنتجات عبر البحث بالاسم. تُستخدم في قواعد الخصم وتعديل الربح بالجملة.
 */
export default function DiscountScopePicker({ adminFetch, selected, onChange, allowAll = true }: Props) {
  const [tree, setTree] = useState<{ categories: any[]; subcategories: any[]; sub_sub_categories: any[] }>({ categories: [], subcategories: [], sub_sub_categories: [] });
  const [filter, setFilter] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [prodQuery, setProdQuery] = useState("");
  const [prodResults, setProdResults] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const r = await adminFetch("/api/admin/discount-scope-tree");
        if (r.ok) setTree(await r.json());
      } catch { /* تجاهل */ }
    })();
  }, []);

  useEffect(() => {
    const q = prodQuery.trim();
    if (q.length < 2) { setProdResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await adminFetch(`/api/admin/discount-scope-search?q=${encodeURIComponent(q)}`);
        if (r.ok) setProdResults(await r.json());
      } catch { /* تجاهل */ }
    }, 300);
    return () => clearTimeout(t);
  }, [prodQuery]);

  const subsByCat = useMemo(() => {
    const m: Record<string, any[]> = {};
    tree.subcategories.forEach(s => { (m[String(s.category_id)] = m[String(s.category_id)] || []).push(s); });
    return m;
  }, [tree]);
  const subsubBySub = useMemo(() => {
    const m: Record<string, any[]> = {};
    tree.sub_sub_categories.forEach(s => { (m[String(s.subcategory_id)] = m[String(s.subcategory_id)] || []).push(s); });
    return m;
  }, [tree]);

  const has = (t: ScopeType, id: number | null) => selected.some(s => s.scope_type === t && s.scope_id === id);
  const toggle = (t: ScopeType, id: number | null, label: string) => {
    if (has(t, id)) onChange(selected.filter(s => !(s.scope_type === t && s.scope_id === id)));
    else onChange([...selected, { scope_type: t, scope_id: id, label }]);
  };

  const f = filter.trim().toLowerCase();
  const matches = (name: string) => !f || String(name || "").toLowerCase().includes(f);
  // قسم رئيسي ظاهر إن طابق هو أو أي فرع تحته عند البحث
  const catVisible = (c: any) => !f || matches(c.name) || (subsByCat[String(c.id)] || []).some(sub => matches(sub.name) || (subsubBySub[String(sub.id)] || []).some(x => matches(x.name)));

  return (
    <div className="space-y-2" dir="rtl">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map(s => (
            <span key={`${s.scope_type}:${s.scope_id}`} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2 py-1 text-[10px] font-bold">
              <span className="opacity-60">{TYPE_LABEL[s.scope_type]}:</span> {s.label}
              <button type="button" onClick={() => toggle(s.scope_type, s.scope_id, s.label)}><X size={10} /></button>
            </span>
          ))}
        </div>
      )}

      {allowAll && (
        <label className="flex items-center gap-2 text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-2.5 cursor-pointer">
          <input type="checkbox" className="accent-[var(--brand)]" checked={has("all", null)} onChange={() => toggle("all", null, "كل المنتجات")} />
          كل المنتجات (وكل الأقسام)
        </label>
      )}

      <div className="relative">
        <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="بحث في الأقسام..." className="w-full pr-8 pl-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none" />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg max-h-64 overflow-y-auto divide-y divide-gray-100">
        {tree.categories.length === 0 && <p className="text-[11px] text-gray-400 p-3 text-center">جاري تحميل الأقسام...</p>}
        {tree.categories.filter(catVisible).map(cat => {
          const subs = subsByCat[String(cat.id)] || [];
          const isOpen = !!open[`c${cat.id}`] || !!f;
          return (
            <div key={cat.id}>
              <div className="flex items-center gap-2 p-2">
                <input type="checkbox" className="w-4 h-4 accent-[var(--brand)]" checked={has("category", cat.id)} onChange={() => toggle("category", cat.id, cat.name)} />
                <span className="text-xs font-bold text-gray-700 flex-1 truncate">{cat.name}</span>
                {subs.length > 0 && (
                  <button type="button" onClick={() => setOpen(o => ({ ...o, [`c${cat.id}`]: !o[`c${cat.id}`] }))} className="p-1 text-gray-400">
                    <ChevronDown size={14} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                )}
              </div>
              {isOpen && subs.map(sub => {
                const subsubs = subsubBySub[String(sub.id)] || [];
                const subOpen = !!open[`s${sub.id}`] || !!f;
                if (f && !(matches(cat.name) || matches(sub.name) || subsubs.some(x => matches(x.name)))) return null;
                return (
                  <div key={sub.id} className="pr-6">
                    <div className="flex items-center gap-2 py-1 pl-2">
                      <input type="checkbox" className="w-3.5 h-3.5 accent-[var(--brand)]" checked={has("subcategory", sub.id)} onChange={() => toggle("subcategory", sub.id, sub.name)} />
                      <span className="text-[11px] text-gray-600 flex-1 truncate">{sub.name}</span>
                      {subsubs.length > 0 && (
                        <button type="button" onClick={() => setOpen(o => ({ ...o, [`s${sub.id}`]: !o[`s${sub.id}`] }))} className="p-1 text-gray-400">
                          <ChevronDown size={12} className={`transition-transform ${subOpen ? "rotate-180" : ""}`} />
                        </button>
                      )}
                    </div>
                    {subOpen && subsubs.filter(x => !f || matches(x.name) || matches(sub.name) || matches(cat.name)).map(ss => (
                      <label key={ss.id} className="flex items-center gap-2 py-0.5 pr-6 text-[11px] text-gray-500">
                        <input type="checkbox" className="w-3.5 h-3.5 accent-[var(--brand)]" checked={has("sub_sub_category", ss.id)} onChange={() => toggle("sub_sub_category", ss.id, ss.name)} />
                        <span className="truncate">{ss.name}</span>
                      </label>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] font-bold text-gray-400">منتجات محددة (ابحث بالاسم، حرفان على الأقل)</p>
        <div className="relative">
          <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={prodQuery} onChange={e => setProdQuery(e.target.value)} placeholder="اسم المنتج..." className="w-full pr-8 pl-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none" />
        </div>
        {prodResults.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg max-h-40 overflow-y-auto divide-y divide-gray-100">
            {prodResults.map(p => (
              <label key={p.id} className="flex items-center gap-2 p-2 text-[11px] text-gray-600 cursor-pointer">
                <input type="checkbox" className="w-3.5 h-3.5 accent-[var(--brand)]" checked={has("product", p.id)} onChange={() => toggle("product", p.id, p.name)} />
                <span className="truncate">{p.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
