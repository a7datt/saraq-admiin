import React, { useEffect, useState } from "react";
import { Plus, Trash2, Save, AlertTriangle } from "lucide-react";
import { showToast } from "./ToastContainer";
import DiscountScopePicker, { ScopeSel, ScopeType, scopeTypeLabel } from "./DiscountScopePicker";

interface Props {
  adminFetch: (url: string, options?: RequestInit) => Promise<Response>;
  ownerType: "rank" | "vip" | "api_global";
  ownerId?: number | null;
  /** عنوان توضيحي يظهر أعلى المحرر */
  hint?: string;
  /** يُستدعى بعد الحفظ بنجاح */
  onSaved?: () => void;
}

interface Row { scope_type: ScopeType; scope_id: number | null; percent: string; label: string }

/**
 * [PHASE-2] محرر قواعد الخصم: قواعد متعددة، لكل منها نطاق ونسبة مستقلة. عند التعارض تُطبَّق القاعدة
 * الأدق فقط (منتج > فرع فرعي > فرعي > رئيسي > كل المنتجات). الحفظ يتحقق منه السيرفر ويعرض تحذير الخسارة.
 */
export default function DiscountRulesEditor({ adminFetch, ownerType, ownerId = null, hint, onSaved }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [pending, setPending] = useState<ScopeSel[]>([]);
  const [newPercent, setNewPercent] = useState("");
  const [warnings, setWarnings] = useState<{ count: number; items: any[] } | null>(null);
  const [names, setNames] = useState<Record<string, Record<string, string>>>({ category: {}, subcategory: {}, sub_sub_category: {} });

  const labelFor = (t: ScopeType, id: number | null, productNames: Record<string, string>) => {
    if (t === "all") return "كل المنتجات";
    if (t === "product") return productNames[String(id)] || `منتج #${id}`;
    return names[t]?.[String(id)] || `#${id}`;
  };

  const load = async () => {
    setLoading(true);
    try {
      const [tree, rules] = await Promise.all([
        adminFetch("/api/admin/discount-scope-tree").then(r => r.ok ? r.json() : null),
        adminFetch(`/api/admin/discount-rules?owner_type=${ownerType}${ownerId != null ? `&owner_id=${ownerId}` : ""}`).then(r => r.ok ? r.json() : null),
      ]);
      const nm: any = { category: {}, subcategory: {}, sub_sub_category: {} };
      (tree?.categories || []).forEach((c: any) => nm.category[String(c.id)] = c.name);
      (tree?.subcategories || []).forEach((c: any) => nm.subcategory[String(c.id)] = c.name);
      (tree?.sub_sub_categories || []).forEach((c: any) => nm.sub_sub_category[String(c.id)] = c.name);
      setNames(nm);
      const pn = rules?.product_names || {};
      setRows((rules?.rules || []).map((r: any) => ({
        scope_type: r.scope_type, scope_id: r.scope_id, percent: String(Number(r.percent)),
        label: r.scope_type === "all" ? "كل المنتجات" : r.scope_type === "product" ? (pn[String(r.scope_id)] || `منتج #${r.scope_id}`) : (nm[r.scope_type]?.[String(r.scope_id)] || `#${r.scope_id}`),
      })));
    } catch { showToast("تعذر تحميل القواعد", "error"); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [ownerType, ownerId]);

  const addRules = () => {
    const pct = Number(newPercent);
    if (pending.length === 0) { showToast("اختر نطاقاً واحداً على الأقل", "error"); return; }
    if (!Number.isFinite(pct) || pct < 0 || pct >= 100) { showToast("النسبة يجب أن تكون بين 0 و99.999", "error"); return; }
    setRows(prev => {
      const next = [...prev];
      pending.forEach(p => {
        const i = next.findIndex(r => r.scope_type === p.scope_type && r.scope_id === p.scope_id);
        const row = { scope_type: p.scope_type, scope_id: p.scope_id, percent: String(pct), label: p.label };
        if (i >= 0) next[i] = row; else next.push(row);
      });
      return next;
    });
    setPending([]); setNewPercent(""); setAdding(false);
  };

  const save = async () => {
    setSaving(true); setWarnings(null);
    try {
      const res = await adminFetch("/api/admin/discount-rules", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner_type: ownerType, owner_id: ownerId,
          items: rows.map(r => ({ scope_type: r.scope_type, scope_id: r.scope_id, percent: Number(r.percent) })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { showToast(data?.error || "فشل حفظ القواعد", "error"); setSaving(false); return; }
      if (data.warning_count > 0) setWarnings({ count: data.warning_count, items: data.warnings || [] });
      showToast("تم حفظ قواعد الخصم", "success");
      await load();
      onSaved?.();
    } catch { showToast("خطأ في الاتصال", "error"); }
    setSaving(false);
  };

  return (
    <div className="space-y-3" dir="rtl">
      {hint && <p className="text-[11px] text-gray-500 leading-relaxed">{hint}</p>}
      <p className="text-[10px] text-gray-400 leading-relaxed">عند تعارض أكثر من قاعدة على منتج واحد تُطبَّق الأدق فقط: منتج ← فرع فرعي ← قسم فرعي ← قسم رئيسي ← كل المنتجات (لا تُجمع النسب).</p>

      {loading ? <p className="text-xs text-gray-400 text-center py-3">جاري التحميل...</p> : (
        <div className="space-y-1.5">
          {rows.length === 0 && <p className="text-[11px] text-gray-400 bg-gray-50 border border-dashed border-gray-200 rounded-lg p-3 text-center">لا توجد قواعد — لا يُطبَّق أي خصم.</p>}
          {rows.map((r, i) => (
            <div key={`${r.scope_type}:${r.scope_id}`} className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-2">
              <div className="flex-1 min-w-0">
                <p className="text-[9px] text-gray-400 font-bold">{scopeTypeLabel(r.scope_type)}</p>
                <p className="text-xs font-bold text-gray-700 truncate">{r.label}</p>
              </div>
              <input type="number" min={0} max={99.999} step="0.1" value={r.percent}
                onChange={e => setRows(prev => prev.map((x, k) => k === i ? { ...x, percent: e.target.value } : x))}
                className="w-20 p-2 bg-gray-50 border border-gray-200 rounded-md text-xs font-black text-center outline-none" />
              <span className="text-xs font-bold text-gray-400">%</span>
              <button type="button" onClick={() => setRows(prev => prev.filter((_, k) => k !== i))} className="p-1.5 text-red-500"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}

      {adding ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-3">
          <DiscountScopePicker adminFetch={adminFetch} selected={pending} onChange={setPending} />
          <div className="flex items-center gap-2">
            <input type="number" min={0} max={99.999} step="0.1" value={newPercent} onChange={e => setNewPercent(e.target.value)} placeholder="نسبة الخصم"
              className="flex-1 p-2.5 bg-white border border-gray-200 rounded-lg text-sm font-black text-center outline-none" />
            <span className="text-sm font-bold text-gray-400">%</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={addRules} className="py-2.5 rounded-lg bg-[var(--brand)] text-white text-xs font-bold">إضافة القاعدة</button>
            <button type="button" onClick={() => { setAdding(false); setPending([]); }} className="py-2.5 rounded-lg bg-white border border-gray-200 text-gray-600 text-xs font-bold">إلغاء</button>
          </div>
          <p className="text-[10px] text-gray-400">إذا اخترت عدة نطاقات تُنشأ قاعدة لكل نطاق بنفس النسبة. إعادة اختيار نطاق موجود تستبدل نسبته.</p>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-dashed border-gray-300 text-gray-600 text-xs font-bold"><Plus size={14} /> إضافة قاعدة خصم</button>
      )}

      {warnings && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1.5">
          <p className="text-xs font-black text-amber-700 flex items-center gap-1.5"><AlertTriangle size={14} /> تحذير: {warnings.count} منتج ينزل سعره بعد الخصم تحت التكلفة</p>
          <p className="text-[10px] text-amber-700">لن يُسمح بذلك فعلياً — سيُخفَّض الخصم تلقائياً لهذه المنتجات إلى الحد الأقصى الآمن (أمثلة):</p>
          <ul className="text-[10px] text-amber-800 space-y-0.5">
            {warnings.items.map(w => <li key={w.id} className="truncate">• {w.name}: المطلوب {w.requested}% — الحد الآمن {w.max_allowed}%</li>)}
          </ul>
        </div>
      )}

      <button type="button" onClick={save} disabled={saving || loading} className="w-full flex items-center justify-center gap-1.5 py-3 rounded-lg bg-[var(--brand)] text-white text-sm font-bold disabled:opacity-40">
        <Save size={15} /> {saving ? "جارِ الحفظ..." : "حفظ قواعد الخصم"}
      </button>
    </div>
  );
}
