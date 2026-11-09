/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  X, ShieldCheck, Search, ChevronLeft, ChevronRight, Check, LayoutGrid,
  ListFilter, AlertTriangle, Loader2, CheckCircle2, XCircle, SlidersHorizontal, Layers,
} from "lucide-react";

/* ════════════════════════════════════════════════════════════
   التفعيل الجماعي لزر "التحقق من الاسم" على عدة منتجات دفعة واحدة.
   بدل فتح كل منتج على حدة من صفحة عناصر المتجر.

   الخطوات:
     1) طريقة الاختيار: كل المنتجات (قائمة مسطّحة + بحث) أو تصفّح الأقسام.
     2) تحديد المنتجات (checkbox + تحديد الكل + عدّاد).
     3) إعدادات التطبيق: اللعبة + المنطقة، ثم مراجعة حقل المعرّف لكل منتج.
   ════════════════════════════════════════════════════════════ */

interface NVField { id: string; label: string; isDefault: boolean; nvSource: boolean }

interface Candidate {
  id: string | number;
  name: string;
  image_url: string | null;
  available: boolean;
  category_id: string | number | null;
  subcategory_id: string | number | null;
  sub_sub_category_id: string | number | null;
  category_name: string | null;
  subcategory_name: string | null;
  sub_sub_category_name: string | null;
  nv_enabled: boolean;
  nv_game: string | null;
  nv_region: string | null;
  fields: NVField[];
  eligible: boolean;
}

interface NVGame {
  value: string;
  label: string;
  regions: { value: string; label: string }[];
  category?: string;
  hasZone?: boolean;
  zoneType?: "input" | "dropdown";
}

interface BulkResult {
  counts: { succeeded: number; skipped: number; failed: number };
  succeeded: { id: any; name: string }[];
  skipped: { id: any; name: string; reason: string }[];
  failed: { id: any; name: string; reason: string }[];
  enabled: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  adminFetch: (url: string, options?: RequestInit) => Promise<Response>;
  showToast: (msg: string, type: "success" | "error") => void;
  /** يُستدعى بعد نجاح العملية حتى تُحدِّث الصفحة الأم بياناتها */
  onApplied?: () => void;
  /** لعبة مقترحة مسبقاً عند الفتح من بطاقة مزوّد محدّد داخل نافذة المفاتيح */
  initialGame?: string;
}

type Mode = "chooser" | "all" | "categories" | "settings" | "result";

export const BulkNameVerificationModal: React.FC<Props> = ({
  open, onClose, adminFetch, showToast, onApplied, initialGame,
}) => {
  const [mode, setMode] = useState<Mode>("chooser");
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [hideEnabled, setHideEnabled] = useState(false);
  // [NV BULK] "عرض المفعّل فقط" يسهّل اختيار المنتجات لإلغاء التفعيل الجماعي بدل التصفّح بين الكل
  const [showEnabledOnly, setShowEnabledOnly] = useState(false);

  // تصفّح الأقسام: قسم ← قسم فرعي ← قسم فرعي-فرعي (اختياري) ← منتجات
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [openSubcategory, setOpenSubcategory] = useState<string | null>(null);
  const [openSubSub, setOpenSubSub] = useState<string | null>(null);

  // إعدادات التطبيق
  const [games, setGames] = useState<NVGame[]>([]);
  const [gameSearch, setGameSearch] = useState("");
  const [gamePickerOpen, setGamePickerOpen] = useState(false);
  const [game, setGame] = useState("");
  const [region, setRegion] = useState("");
  const [dynamicRegions, setDynamicRegions] = useState<{ value: string; label: string }[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(false);
  const [fieldOverrides, setFieldOverrides] = useState<Record<string, string[]>>({});
  const [showFieldReview, setShowFieldReview] = useState(false);

  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<BulkResult | null>(null);
  const [action, setAction] = useState<"enable" | "disable">("enable");

  /* ─────────── التحميل ─────────── */

  const resetAll = () => {
    setMode("chooser");
    setSelected(new Set());
    setSearch("");
    setHideEnabled(false);
    setShowEnabledOnly(false);
    setOpenCategory(null);
    setOpenSubcategory(null);
    setOpenSubSub(null);
    setFieldOverrides({});
    setShowFieldReview(false);
    setResult(null);
    setAction("enable");
    setRegion("");
  };

  useEffect(() => {
    if (!open) return;
    resetAll();
    setGame(initialGame || "");
    setLoading(true);
    Promise.all([
      adminFetch("/api/admin/name-verification/bulk-candidates").then(r => r.json()).catch(() => []),
      adminFetch("/api/admin/name-verification/games").then(r => r.json()).catch(() => []),
    ])
      .then(([cands, gs]) => {
        setCandidates(Array.isArray(cands) ? cands : []);
        setGames(Array.isArray(gs) ? gs : []);
      })
      .catch(() => showToast("تعذّر تحميل قائمة المنتجات", "error"))
      .finally(() => setLoading(false));
  }, [open]);

  // جلب المناطق الديناميكية عند اختيار لعبة تدعمها
  useEffect(() => {
    const g = games.find(x => x.value === game);
    if (!g || game === "freefire") { setDynamicRegions([]); return; }
    if (g.hasZone && g.zoneType === "dropdown") {
      setRegionsLoading(true);
      adminFetch(`/api/admin/name-verification/zones/${game}`)
        .then(r => r.json())
        .then(d => setDynamicRegions(Array.isArray(d) ? d : []))
        .catch(() => setDynamicRegions([]))
        .finally(() => setRegionsLoading(false));
    } else {
      setDynamicRegions([]);
    }
  }, [game, games]);

  /* ─────────── مشتقات ─────────── */

  const byId = useMemo(() => {
    const m = new Map<string, Candidate>();
    candidates.forEach(c => m.set(String(c.id), c));
    return m;
  }, [candidates]);

  const selectedList = useMemo(
    () => Array.from(selected).map(id => byId.get(id)).filter(Boolean) as Candidate[],
    [selected, byId]
  );

  const selectedGame = games.find(g => g.value === game);
  const requiresZone = !!selectedGame && (game === "freefire" || !!selectedGame.hasZone);
  const zoneIsDropdown = game === "freefire" || selectedGame?.zoneType === "dropdown";
  const regionOptions = game === "freefire" ? (selectedGame?.regions || []) : dynamicRegions;

  const filteredGames = useMemo(() => {
    if (!gameSearch.trim()) return games;
    const q = gameSearch.trim().toLowerCase();
    return games.filter(g => g.label.toLowerCase().includes(q) || g.value.toLowerCase().includes(q));
  }, [games, gameSearch]);

  /** فلترة موحّدة: تُخفي المفعّل (للتفعيل) أو تُظهر المفعّل فقط (لتسهيل إلغاء التفعيل) — الخياران متنافيان */
  const applyEnabledFilter = (list: Candidate[]): Candidate[] => {
    if (showEnabledOnly) return list.filter(c => c.nv_enabled);
    if (hideEnabled) return list.filter(c => !c.nv_enabled);
    return list;
  };

  /** المنتجات بعد تطبيق البحث وفلتر التفعيل — تُستخدم في وضع "كل المنتجات" */
  const visibleAll = useMemo(() => {
    let list = applyEnabledFilter(candidates);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(c =>
        (c.name || "").toLowerCase().includes(q) ||
        (c.subcategory_name || "").toLowerCase().includes(q) ||
        (c.sub_sub_category_name || "").toLowerCase().includes(q) ||
        (c.category_name || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [candidates, search, hideEnabled, showEnabledOnly]);

  /** شجرة الأقسام المبنية من المنتجات نفسها: قسم ← قسم فرعي ← قسم فرعي-فرعي (اختياري) ← منتجات.
   * المنتجات التي ليس لها قسم فرعي-فرعي تُجمَّع تحت مجموعة "منتجات مباشرة" على مستوى القسم الفرعي نفسه. */
  const tree = useMemo(() => {
    type SubSubNode = { name: string; items: Candidate[] };
    type SubNode = { name: string; items: Candidate[]; subSubs: Map<string, SubSubNode> };
    type CatNode = { name: string; subs: Map<string, SubNode> };
    const cats = new Map<string, CatNode>();
    const base = applyEnabledFilter(candidates);
    for (const c of base) {
      const catKey = c.category_name || "بدون قسم";
      if (!cats.has(catKey)) cats.set(catKey, { name: catKey, subs: new Map() });
      const cat = cats.get(catKey)!;
      const subKey = c.subcategory_name || "بدون قسم فرعي";
      if (!cat.subs.has(subKey)) cat.subs.set(subKey, { name: subKey, items: [], subSubs: new Map() });
      const sub = cat.subs.get(subKey)!;
      if (c.sub_sub_category_name) {
        const ssKey = c.sub_sub_category_name;
        if (!sub.subSubs.has(ssKey)) sub.subSubs.set(ssKey, { name: ssKey, items: [] });
        sub.subSubs.get(ssKey)!.items.push(c);
      } else {
        sub.items.push(c);
      }
    }
    return cats;
  }, [candidates, hideEnabled, showEnabledOnly]);

  /** كل منتجات قسم فرعي (المباشرة + كل أقسامه الفرعية-الفرعية) — تُستخدم لتحديد القسم الفرعي كاملاً بضغطة واحدة */
  const allItemsOfSub = (sub: { items: Candidate[]; subSubs: Map<string, { items: Candidate[] }> }): Candidate[] => {
    const nested = Array.from(sub.subSubs.values()).flatMap(ss => ss.items);
    return [...sub.items, ...nested];
  };


  /** المنتجات المحدّدة التي لا تملك أي حقل إدخال — ستُتجاهَل مع تنبيه */
  const ineligibleSelected = useMemo(
    () => selectedList.filter(c => !c.eligible),
    [selectedList]
  );
  const eligibleSelected = useMemo(
    () => selectedList.filter(c => c.eligible),
    [selectedList]
  );
  /** المنتجات التي فيها أكثر من حقل — يحتاج الأدمن مراجعتها (أول حقل يُختار تلقائياً) */
  const multiFieldSelected = useMemo(
    () => eligibleSelected.filter(c => c.fields.length > 1),
    [eligibleSelected]
  );

  /* ─────────── إجراءات التحديد ─────────── */

  const toggleOne = (id: string | number) => {
    const key = String(id);
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleMany = (items: Candidate[]) => {
    const keys = items.map(i => String(i.id));
    const allIn = keys.every(k => selected.has(k));
    setSelected(prev => {
      const next = new Set(prev);
      keys.forEach(k => (allIn ? next.delete(k) : next.add(k)));
      return next;
    });
  };

  const fieldsFor = (c: Candidate): string[] => {
    const override = fieldOverrides[String(c.id)];
    if (override && override.length > 0) return override;
    const already = c.fields.filter(f => f.nvSource).map(f => f.id);
    if (already.length > 0) return already;
    return c.fields.length > 0 ? [c.fields[0].id] : [];
  };

  const toggleField = (c: Candidate, fieldId: string) => {
    const current = fieldsFor(c);
    const next = current.includes(fieldId)
      ? current.filter(f => f !== fieldId)
      : [...current, fieldId];
    // لا نسمح بإفراغ كل الحقول — يجب بقاء حقل واحد على الأقل
    if (next.length === 0) return;
    setFieldOverrides(prev => ({ ...prev, [String(c.id)]: next }));
  };

  /* ─────────── التنفيذ ─────────── */

  const handleApply = async () => {
    if (selected.size === 0) return showToast("لم يتم تحديد أي منتج", "error");
    const enabling = action === "enable";
    if (enabling) {
      if (!game) return showToast("يرجى اختيار اللعبة أولاً", "error");
      if (requiresZone && !region.trim()) return showToast("يرجى تحديد منطقة الخادم", "error");
      if (eligibleSelected.length === 0) {
        return showToast("كل المنتجات المحدّدة بلا حقول إدخال — لا يمكن تفعيل التحقق عليها", "error");
      }
    }

    setApplying(true);
    try {
      const res = await adminFetch("/api/admin/name-verification/bulk-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: enabling,
          game: enabling ? game : undefined,
          region: enabling ? region.trim() : undefined,
          items: selectedList.map(c => ({
            product_id: c.id,
            field_ids: enabling ? fieldsFor(c) : undefined,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data?.error || "فشل تنفيذ العملية", "error");
        return;
      }
      setResult(data);
      setMode("result");
      showToast(
        `${enabling ? "تم التفعيل" : "تم التعطيل"} على ${data.counts.succeeded} منتج`,
        "success"
      );
      onApplied?.();
    } catch {
      showToast("فشل الاتصال بالخادم", "error");
    } finally {
      setApplying(false);
    }
  };

  if (!open) return null;

  /* ─────────── عناصر مشتركة ─────────── */

  const ProductRow: React.FC<{ c: Candidate; showPath?: boolean }> = ({ c, showPath }) => {
    const checked = selected.has(String(c.id));
    return (
      <button
        type="button"
        onClick={() => toggleOne(c.id)}
        className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg border text-right transition-colors ${
          checked ? "bg-cyan-50 border-cyan-300" : "bg-white border-gray-150 hover:border-gray-300"
        }`}
      >
        <span
          className={`w-4.5 h-4.5 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
            checked ? "bg-cyan-500 border-cyan-500" : "border-gray-300"
          }`}
        >
          {checked && <Check size={12} className="text-white" strokeWidth={3} />}
        </span>

        {c.image_url ? (
          <img src={c.image_url} alt="" className="w-8 h-8 rounded-md object-cover shrink-0 bg-gray-100" />
        ) : (
          <span className="w-8 h-8 rounded-md bg-gray-100 shrink-0" />
        )}

        <span className="flex-1 min-w-0">
          <span className="block text-xs font-bold text-gray-800 truncate">{c.name}</span>
          <span className="block text-[10px] text-gray-400 truncate">
            {showPath && (c.category_name || c.subcategory_name)
              ? `${c.category_name || "—"} › ${c.subcategory_name || "—"}`
              : `${c.fields.length} حقل إدخال`}
          </span>
        </span>

        <span className="flex flex-col items-end gap-1 shrink-0">
          {c.nv_enabled && (
            <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
              مفعّل
            </span>
          )}
          {!c.eligible && (
            <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
              بلا حقول
            </span>
          )}
        </span>
      </button>
    );
  };

  const SelectionBar = () => (
    <div className="sticky bottom-0 -mx-5 -mb-5 px-5 py-3 bg-white border-t border-gray-100 flex items-center gap-2">
      <span className="text-xs font-bold text-gray-600 flex-1">
        تم تحديد <span className="text-cyan-600">{selected.size}</span> منتج
      </span>
      {selected.size > 0 && (
        <button
          type="button"
          onClick={() => setSelected(new Set())}
          className="px-2.5 py-2 rounded-lg bg-gray-100 text-gray-500 text-[11px] font-bold"
        >
          إلغاء التحديد
        </button>
      )}
      <button
        type="button"
        disabled={selected.size === 0}
        onClick={() => setMode("settings")}
        className="px-4 py-2 rounded-lg bg-cyan-500 text-white text-xs font-bold disabled:opacity-40 flex items-center gap-1"
      >
        متابعة <ChevronLeft size={14} />
      </button>
    </div>
  );

  /** فلتر التفعيل: يتكيّف مع الغرض — "إخفاء المفعّل" يفيد عند التفعيل، و"عرض المفعّل فقط" يسهّل اختيار منتجات/أقسام لإلغاء التفعيل */
  const FilterRow = () => (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-2 px-1 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={hideEnabled}
          onChange={e => { setHideEnabled(e.target.checked); if (e.target.checked) setShowEnabledOnly(false); }}
          className="accent-cyan-500 w-3.5 h-3.5"
        />
        <span className="text-[11px] font-bold text-gray-500">إخفاء المنتجات المفعّل عليها التحقق مسبقاً</span>
      </label>
      <label className="flex items-center gap-2 px-1 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={showEnabledOnly}
          onChange={e => { setShowEnabledOnly(e.target.checked); if (e.target.checked) setHideEnabled(false); }}
          className="accent-red-500 w-3.5 h-3.5"
        />
        <span className="text-[11px] font-bold text-gray-500">عرض المفعّل فقط (لتسهيل اختيار منتجات لإلغاء التفعيل)</span>
      </label>
    </div>
  );

  const Header = ({ title, onBack }: { title: string; onBack?: () => void }) => (
    <div className="flex items-center justify-between sticky top-0 bg-white pb-2 z-10">
      <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm min-w-0">
        {onBack && (
          <button onClick={onBack} className="text-gray-400 shrink-0">
            <ChevronRight size={20} />
          </button>
        )}
        <ShieldCheck size={17} className="text-cyan-600 shrink-0" />
        <span className="truncate">{title}</span>
      </h3>
      <button onClick={onClose} className="text-gray-400 shrink-0">
        <X size={22} />
      </button>
    </div>
  );

  /* ─────────── الواجهة ─────────── */

  return (
    <div className="fixed inset-0 z-[95] bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-5 space-y-3 max-h-[88vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        {loading ? (
          <>
            <Header title="التفعيل الجماعي للتحقق من الاسم" />
            <div className="py-12 text-center text-sm text-gray-400 flex flex-col items-center gap-2">
              <Loader2 size={22} className="animate-spin text-cyan-500" />
              جارٍ تحميل المنتجات...
            </div>
          </>
        ) : mode === "chooser" ? (
          /* ═══ الخطوة 1: طريقة الاختيار ═══ */
          <>
            <Header title="التفعيل الجماعي للتحقق من الاسم" />
            <p className="text-[11px] text-gray-500 leading-relaxed">
              فعّل (أو عطّل) زر التحقق من الاسم على عدة منتجات دفعة واحدة، بدل الدخول لكل منتج على حدة.
              اختر طريقة استعراض المنتجات:
            </p>

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={() => setMode("all")}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-cyan-200 bg-cyan-50/60 text-right hover:bg-cyan-50 transition-colors"
              >
                <span className="w-9 h-9 rounded-lg bg-cyan-500 flex items-center justify-center shrink-0">
                  <ListFilter size={17} className="text-white" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold text-gray-800">عرض كل المنتجات</span>
                  <span className="block text-[11px] text-gray-500">
                    قائمة واحدة لكل المنتجات ({candidates.length}) مع بحث بالاسم
                  </span>
                </span>
                <ChevronLeft size={16} className="text-cyan-400 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => setMode("categories")}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-purple-200 bg-purple-50/60 text-right hover:bg-purple-50 transition-colors"
              >
                <span className="w-9 h-9 rounded-lg bg-purple-500 flex items-center justify-center shrink-0">
                  <LayoutGrid size={17} className="text-white" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold text-gray-800">فتح الأقسام لعرض المنتجات</span>
                  <span className="block text-[11px] text-gray-500">
                    تصفّح قسم ← قسم فرعي، مع تحديد القسم كاملاً بضغطة واحدة
                  </span>
                </span>
                <ChevronLeft size={16} className="text-purple-400 shrink-0" />
              </button>
            </div>
          </>
        ) : mode === "all" ? (
          /* ═══ الخطوة 2أ: كل المنتجات ═══ */
          <>
            <Header title="كل المنتجات" onBack={() => setMode("chooser")} />

            <div className="relative">
              <Search size={14} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
              <input
                type="text"
                placeholder="ابحث باسم المنتج أو القسم..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pr-9 pl-3 py-2.5 bg-gray-50 rounded-lg text-xs outline-none border border-gray-200 focus:border-cyan-300"
              />
            </div>

            <FilterRow />

            {visibleAll.length > 0 && (
              <button
                type="button"
                onClick={() => toggleMany(visibleAll)}
                className="w-full py-2 rounded-lg bg-gray-50 border border-gray-200 text-[11px] font-bold text-gray-600"
              >
                {visibleAll.every(c => selected.has(String(c.id)))
                  ? `إلغاء تحديد الظاهر (${visibleAll.length})`
                  : `تحديد كل الظاهر (${visibleAll.length})`}
              </button>
            )}

            <div className="space-y-1.5">
              {visibleAll.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">لا توجد منتجات مطابقة</div>
              ) : (
                visibleAll.map(c => <ProductRow key={c.id} c={c} showPath />)
              )}
            </div>

            <SelectionBar />
          </>
        ) : mode === "categories" ? (
          /* ═══ الخطوة 2ب: تصفّح الأقسام (قسم ← فرعي ← فرعي-فرعي ← منتجات) ═══ */
          <>
            <Header
              title={
                openSubSub ? openSubSub : openSubcategory ? openSubcategory : openCategory ? openCategory : "تصفّح الأقسام"
              }
              onBack={() => {
                if (openSubSub) setOpenSubSub(null);
                else if (openSubcategory) setOpenSubcategory(null);
                else if (openCategory) setOpenCategory(null);
                else setMode("chooser");
              }}
            />

            {!openCategory && <FilterRow />}

            <div className="space-y-1.5">
              {/* المستوى 1: الأقسام الرئيسية */}
              {!openCategory &&
                Array.from(tree.entries()).map(([key, cat]) => {
                  const total = Array.from(cat.subs.values()).reduce(
                    (n: number, s: { items: Candidate[]; subSubs: Map<string, { items: Candidate[] }> }) => n + allItemsOfSub(s).length, 0
                  );
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setOpenCategory(key)}
                      className="w-full flex items-center gap-2.5 p-3 rounded-lg border border-gray-150 bg-white text-right hover:border-purple-300 transition-colors"
                    >
                      <Layers size={16} className="text-purple-400 shrink-0" />
                      <span className="flex-1 min-w-0">
                        <span className="block text-xs font-bold text-gray-800 truncate">{cat.name}</span>
                        <span className="block text-[10px] text-gray-400">{total} منتج</span>
                      </span>
                      <ChevronLeft size={15} className="text-gray-300 shrink-0" />
                    </button>
                  );
                })}

              {/* المستوى 2: الأقسام الفرعية */}
              {openCategory && !openSubcategory &&
                Array.from(tree.get(openCategory)?.subs.entries() || []).map(([key, sub]) => {
                  const all = allItemsOfSub(sub);
                  const allIn = all.length > 0 && all.every(i => selected.has(String(i.id)));
                  const someIn = all.some(i => selected.has(String(i.id)));
                  const hasSubSubs = sub.subSubs.size > 0;
                  return (
                    <div
                      key={key}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border transition-colors ${
                        someIn ? "bg-cyan-50/60 border-cyan-200" : "bg-white border-gray-150"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleMany(all)}
                        title="تحديد كل منتجات القسم الفرعي (بما فيها أقسامه الفرعية-الفرعية)"
                        className={`w-4.5 h-4.5 shrink-0 rounded border-2 flex items-center justify-center ${
                          allIn ? "bg-cyan-500 border-cyan-500" : someIn ? "bg-cyan-200 border-cyan-400" : "border-gray-300"
                        }`}
                      >
                        {allIn && <Check size={12} className="text-white" strokeWidth={3} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setOpenSubcategory(key)}
                        className="flex-1 min-w-0 flex items-center gap-2 text-right"
                      >
                        <span className="flex-1 min-w-0">
                          <span className="block text-xs font-bold text-gray-800 truncate">{sub.name}</span>
                          <span className="block text-[10px] text-gray-400">
                            {all.length} منتج{hasSubSubs ? ` — ${sub.subSubs.size} قسم فرعي-فرعي` : ""}
                            {someIn && ` — محدّد ${all.filter(i => selected.has(String(i.id))).length}`}
                          </span>
                        </span>
                        <ChevronLeft size={15} className="text-gray-300 shrink-0" />
                      </button>
                    </div>
                  );
                })}

              {/* المستوى 3: محتوى القسم الفرعي — أقسام فرعية-فرعية (إن وُجدت) + منتجات مباشرة بلا قسم فرعي-فرعي */}
              {openCategory && openSubcategory && !openSubSub && (() => {
                const sub = tree.get(openCategory)?.subs.get(openSubcategory);
                if (!sub) return null;
                const directItems = sub.items;
                const subSubEntries = Array.from(sub.subSubs.entries());
                return (
                  <>
                    {directItems.length > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={() => toggleMany(directItems)}
                          className="w-full py-2 rounded-lg bg-gray-50 border border-gray-200 text-[11px] font-bold text-gray-600 mb-1"
                        >
                          {directItems.every(c => selected.has(String(c.id)))
                            ? `إلغاء تحديد المنتجات المباشرة (${directItems.length})`
                            : `تحديد المنتجات المباشرة (${directItems.length})`}
                        </button>
                        {directItems.map(c => <ProductRow key={c.id} c={c} />)}
                      </>
                    )}

                    {subSubEntries.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        {directItems.length > 0 && (
                          <div className="text-[10px] font-bold text-gray-400 px-1 pt-1">أقسام فرعية-فرعية</div>
                        )}
                        {subSubEntries.map(([ssKey, ss]) => {
                          const allIn = ss.items.every(i => selected.has(String(i.id)));
                          const someIn = ss.items.some(i => selected.has(String(i.id)));
                          return (
                            <div
                              key={ssKey}
                              className={`flex items-center gap-2 p-2.5 rounded-lg border transition-colors ${
                                someIn ? "bg-cyan-50/60 border-cyan-200" : "bg-white border-gray-150"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => toggleMany(ss.items)}
                                title="تحديد كل منتجات القسم الفرعي-الفرعي"
                                className={`w-4.5 h-4.5 shrink-0 rounded border-2 flex items-center justify-center ${
                                  allIn ? "bg-cyan-500 border-cyan-500" : someIn ? "bg-cyan-200 border-cyan-400" : "border-gray-300"
                                }`}
                              >
                                {allIn && <Check size={12} className="text-white" strokeWidth={3} />}
                              </button>
                              <button
                                type="button"
                                onClick={() => setOpenSubSub(ssKey)}
                                className="flex-1 min-w-0 flex items-center gap-2 text-right"
                              >
                                <span className="flex-1 min-w-0">
                                  <span className="block text-xs font-bold text-gray-800 truncate">{ss.name}</span>
                                  <span className="block text-[10px] text-gray-400">
                                    {ss.items.length} منتج
                                    {someIn && ` — محدّد ${ss.items.filter(i => selected.has(String(i.id))).length}`}
                                  </span>
                                </span>
                                <ChevronLeft size={15} className="text-gray-300 shrink-0" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {directItems.length === 0 && subSubEntries.length === 0 && (
                      <div className="py-8 text-center text-xs text-gray-400">لا توجد منتجات هنا</div>
                    )}
                  </>
                );
              })()}

              {/* المستوى 4: منتجات القسم الفرعي-الفرعي المحدّد */}
              {openCategory && openSubcategory && openSubSub && (() => {
                const items = tree.get(openCategory)?.subs.get(openSubcategory)?.subSubs.get(openSubSub)?.items || [];
                return (
                  <>
                    <button
                      type="button"
                      onClick={() => toggleMany(items)}
                      className="w-full py-2 rounded-lg bg-gray-50 border border-gray-200 text-[11px] font-bold text-gray-600 mb-1"
                    >
                      {items.every(c => selected.has(String(c.id)))
                        ? `إلغاء تحديد الكل (${items.length})`
                        : `تحديد الكل (${items.length})`}
                    </button>
                    {items.map(c => <ProductRow key={c.id} c={c} />)}
                  </>
                );
              })()}
            </div>

            <SelectionBar />
          </>
        ) : mode === "settings" ? (
          /* ═══ الخطوة 3: إعدادات التطبيق ═══ */
          <>
            <Header title={`إعدادات التطبيق (${selected.size} منتج)`} onBack={() => setMode(openCategory ? "categories" : "all")} />

            {/* اختيار الإجراء: تفعيل أم تعطيل */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
              {([["enable", "تفعيل التحقق"], ["disable", "إلغاء التفعيل"]] as const).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAction(val)}
                  className={`flex-1 py-2 rounded-md text-xs font-bold transition-colors ${
                    action === val ? "bg-white text-cyan-600 shadow-sm" : "text-gray-500"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {action === "enable" && (
              <>
                {/* اللعبة */}
                <div>
                  <label className="text-[11px] font-bold text-cyan-700 mb-1 block">اللعبة / التطبيق</label>
                  <button
                    type="button"
                    onClick={() => setGamePickerOpen(o => !o)}
                    className="w-full flex items-center justify-between p-2.5 bg-white border border-cyan-200 rounded-lg text-sm text-right"
                  >
                    <span className={selectedGame ? "text-gray-800 font-bold" : "text-gray-400"}>
                      {selectedGame?.label || "اختر اللعبة أو التطبيق"}
                    </span>
                    <Search size={14} className="text-cyan-400 shrink-0" />
                  </button>

                  {gamePickerOpen && (
                    <div className="mt-1.5 border border-cyan-200 rounded-lg bg-white overflow-hidden">
                      <div className="p-2 border-b border-gray-100">
                        <input
                          type="text"
                          autoFocus
                          placeholder="ابحث عن لعبة..."
                          value={gameSearch}
                          onChange={e => setGameSearch(e.target.value)}
                          className="w-full p-2 bg-gray-50 rounded-md text-xs outline-none"
                        />
                      </div>
                      <div className="max-h-52 overflow-y-auto">
                        {filteredGames.length === 0 ? (
                          <div className="p-4 text-center text-[11px] text-gray-400">لا توجد نتائج</div>
                        ) : (
                          filteredGames.map(g => (
                            <button
                              key={g.value}
                              type="button"
                              onClick={() => {
                                setGame(g.value);
                                setRegion("");
                                setGamePickerOpen(false);
                                setGameSearch("");
                              }}
                              className={`w-full p-2.5 text-right text-xs border-b border-gray-50 last:border-0 hover:bg-cyan-50 ${
                                g.value === game ? "bg-cyan-50 font-bold text-cyan-700" : "text-gray-700"
                              }`}
                            >
                              {g.label}
                              {g.category && <span className="text-[9px] text-gray-400 mr-1.5">({g.category})</span>}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* المنطقة */}
                {game && requiresZone && (
                  <div>
                    <label className="text-[11px] font-bold text-cyan-700 mb-1 block">منطقة الخادم</label>
                    {zoneIsDropdown ? (
                      regionsLoading ? (
                        <div className="p-2.5 text-[11px] text-gray-400 bg-gray-50 rounded-lg">جارٍ تحميل المناطق...</div>
                      ) : (
                        <select
                          value={region}
                          onChange={e => setRegion(e.target.value)}
                          className="w-full p-2.5 bg-white border border-cyan-200 rounded-lg text-sm outline-none"
                        >
                          <option value="">اختر المنطقة</option>
                          {regionOptions.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      )
                    ) : (
                      <input
                        type="text"
                        placeholder="أدخل رقم/رمز المنطقة"
                        value={region}
                        onChange={e => setRegion(e.target.value)}
                        className="w-full p-2.5 bg-white border border-cyan-200 rounded-lg text-sm outline-none"
                      />
                    )}
                  </div>
                )}

                {/* ملخّص حقول المعرّف */}
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-150 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <SlidersHorizontal size={13} className="text-gray-500" />
                    <span className="text-[11px] font-bold text-gray-700">حقل معرّف اللاعب</span>
                  </div>
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    سيُختار <span className="font-bold">أول حقل إدخال</span> في كل منتج تلقائياً كمصدر لمعرّف اللاعب.
                    يمكنك تعديل ذلك يدوياً للمنتجات التي فيها أكثر من حقل.
                  </p>

                  <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
                    <span className="px-2 py-1 rounded-full bg-green-50 text-green-600">
                      {eligibleSelected.length} منتج جاهز
                    </span>
                    {multiFieldSelected.length > 0 && (
                      <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-600">
                        {multiFieldSelected.length} فيها أكثر من حقل
                      </span>
                    )}
                    {ineligibleSelected.length > 0 && (
                      <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-600">
                        {ineligibleSelected.length} بلا حقول — سيُتجاهَل
                      </span>
                    )}
                  </div>

                  {ineligibleSelected.length > 0 && (
                    <div className="flex items-start gap-1.5 p-2 rounded-md bg-amber-50 border border-amber-150">
                      <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-amber-700 leading-relaxed">
                        {ineligibleSelected.length} منتج لا يحتوي على أي حقل إدخال، فلا يوجد مصدر لمعرّف اللاعب.
                        سيتم تخطّيها ولن تتأثر إعداداتها.
                      </p>
                    </div>
                  )}

                  {multiFieldSelected.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowFieldReview(v => !v)}
                      className="w-full py-2 rounded-md bg-white border border-gray-200 text-[11px] font-bold text-gray-600"
                    >
                      {showFieldReview ? "إخفاء المراجعة اليدوية" : `مراجعة الحقول يدوياً (${multiFieldSelected.length})`}
                    </button>
                  )}

                  {showFieldReview && (
                    <div className="space-y-2 max-h-56 overflow-y-auto pt-1">
                      {multiFieldSelected.map(c => {
                        const chosen = fieldsFor(c);
                        return (
                          <div key={c.id} className="p-2 rounded-md bg-white border border-gray-150">
                            <div className="text-[11px] font-bold text-gray-700 truncate mb-1.5">{c.name}</div>
                            <div className="flex flex-wrap gap-1.5">
                              {c.fields.map(f => (
                                <button
                                  key={f.id}
                                  type="button"
                                  onClick={() => toggleField(c, f.id)}
                                  className={`px-2 py-1 rounded-full text-[10px] font-bold border transition-colors ${
                                    chosen.includes(f.id)
                                      ? "bg-cyan-500 text-white border-cyan-500"
                                      : "bg-gray-50 text-gray-500 border-gray-200"
                                  }`}
                                >
                                  {f.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      <p className="text-[9px] text-gray-400 px-1">
                        عند اختيار أكثر من حقل، تُدمج قيمها بمسافة عند إرسال التحقق.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}

            {action === "disable" && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-150">
                <AlertTriangle size={15} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-red-700 leading-relaxed">
                  سيتم إلغاء تفعيل زر التحقق من الاسم عن <span className="font-bold">{selected.size}</span> منتج محدّد،
                  وإزالة ربط حقل المعرّف منها. باقي بيانات المنتجات لن تتأثر.
                </p>
              </div>
            )}

            <div className="sticky bottom-0 -mx-5 -mb-5 px-5 py-3 bg-white border-t border-gray-100 flex gap-2">
              <button
                type="button"
                onClick={() => setMode(openCategory ? "categories" : "all")}
                className="px-4 py-2.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold"
              >
                رجوع
              </button>
              <button
                type="button"
                disabled={applying}
                onClick={handleApply}
                className={`flex-1 py-2.5 rounded-lg text-white text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1.5 ${
                  action === "enable" ? "bg-cyan-500" : "bg-red-500"
                }`}
              >
                {applying ? (
                  <><Loader2 size={14} className="animate-spin" /> جارٍ التطبيق...</>
                ) : action === "enable" ? (
                  <><ShieldCheck size={14} /> تفعيل على {eligibleSelected.length} منتج</>
                ) : (
                  <>إلغاء التفعيل عن {selected.size} منتج</>
                )}
              </button>
            </div>
          </>
        ) : (
          /* ═══ النتيجة ═══ */
          <>
            <Header title="ملخّص العملية" />

            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-lg bg-green-50 border border-green-150 text-center">
                <div className="text-lg font-bold text-green-600">{result?.counts.succeeded ?? 0}</div>
                <div className="text-[10px] font-bold text-green-700">نجح</div>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-150 text-center">
                <div className="text-lg font-bold text-amber-600">{result?.counts.skipped ?? 0}</div>
                <div className="text-[10px] font-bold text-amber-700">تُخطّي</div>
              </div>
              <div className="p-3 rounded-lg bg-red-50 border border-red-150 text-center">
                <div className="text-lg font-bold text-red-500">{result?.counts.failed ?? 0}</div>
                <div className="text-[10px] font-bold text-red-600">فشل</div>
              </div>
            </div>

            {(result?.skipped.length || 0) > 0 && (
              <div className="space-y-1">
                <div className="text-[11px] font-bold text-amber-700 flex items-center gap-1">
                  <AlertTriangle size={12} /> منتجات تم تخطّيها
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {result!.skipped.map(s => (
                    <div key={s.id} className="flex items-center gap-1.5 p-1.5 rounded-md bg-amber-50 text-[10px]">
                      <XCircle size={11} className="text-amber-500 shrink-0" />
                      <span className="font-bold text-gray-700 truncate flex-1">{s.name}</span>
                      <span className="text-amber-600 shrink-0">{s.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(result?.failed.length || 0) > 0 && (
              <div className="space-y-1">
                <div className="text-[11px] font-bold text-red-600 flex items-center gap-1">
                  <XCircle size={12} /> منتجات فشل حفظها
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {result!.failed.map(s => (
                    <div key={s.id} className="flex items-center gap-1.5 p-1.5 rounded-md bg-red-50 text-[10px]">
                      <span className="font-bold text-gray-700 truncate flex-1">{s.name}</span>
                      <span className="text-red-500 shrink-0">{s.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(result?.counts.succeeded || 0) > 0 && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-green-50 border border-green-150">
                <CheckCircle2 size={14} className="text-green-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-green-700 leading-relaxed">
                  {result!.enabled
                    ? `ظهر زر "التحقق من الاسم" الآن في ${result!.counts.succeeded} منتج للعملاء.`
                    : `تم إخفاء زر التحقق عن ${result!.counts.succeeded} منتج.`}
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => { resetAll(); setGame(initialGame || ""); }}
                className="flex-1 py-2.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold"
              >
                عملية جديدة
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-lg bg-cyan-500 text-white text-xs font-bold"
              >
                إغلاق
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BulkNameVerificationModal;
