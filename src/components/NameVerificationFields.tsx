/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ShieldCheck, AlertTriangle, Search, X } from "lucide-react";
import { CustomSelect } from "./CustomSelect";

export interface NameVerificationValue {
  name_verification_enabled: boolean;
  name_verification_game: string;
  name_verification_region: string;
  /** معرّفات الحقول (من custom_fields الخاصة بالمنتج) التي ستُستخدم كمصدر لمعرف اللاعب عند التحقق.
   * يدعم اختيار حقل واحد أو أكثر؛ في حال اختيار أكثر من حقل تُدمج قيمها بمسافة بين كل قيمة والأخرى. */
  name_verification_source_field_ids: string[];
}

/** وصف مبسّط لحقل إدخال متاح بالمنتج (افتراضي أو مخصص) يمكن اختياره كمصدر لمعرف التحقق */
export interface NVSourceFieldOption {
  id: string;
  label: string;
}

interface NVGame {
  value: string;
  label: string;
  regions: { value: string; label: string }[];
  category?: string;
  hasZone?: boolean;
  zoneType?: "input" | "dropdown";
}

interface NameVerificationFieldsProps {
  value: NameVerificationValue;
  onChange: (val: NameVerificationValue) => void;
  adminFetch: (url: string, options?: RequestInit) => Promise<Response>;
  /** كل حقول الإدخال المتاحة حالياً بالمنتج (افتراضية + مخصصة) ليختار الأدمن منها مصدر معرف اللاعب.
   * إن كان المنتج بلا أي حقل إدخال بعد (مثل منتج داخلي عادي)، تُعرض رسالة توضيحية بدل قائمة فارغة. */
  availableFields: NVSourceFieldOption[];
}

/**
 * حقل قابل لإعادة الاستخدام: تفعيل/تعطيل التحقق من اسم اللاعب + اختيار اللعبة والمنطقة.
 * يُستخدم عند إضافة/تعديل منتج (سواء API خارجي أو داخلي).
 * قابل للتوسع: إضافة لعبة جديدة تتم بالكامل من الخادم (NAME_VERIFICATION_GAMES) دون تعديل هذا المكوّن.
 */
export const NameVerificationFields: React.FC<NameVerificationFieldsProps> = ({ value, onChange, adminFetch, availableFields }) => {
  const [games, setGames] = useState<NVGame[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [keyStatus, setKeyStatus] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [gamePickerOpen, setGamePickerOpen] = useState(false);
  const [gameSearch, setGameSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dynamicRegions, setDynamicRegions] = useState<{ value: string; label: string }[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(false);
  const gamePickerBtnRef = React.useRef<HTMLButtonElement>(null);
  const [pickerPos, setPickerPos] = useState<{ top: number; left: number; width: number; openUp: boolean }>({ top: 0, left: 0, width: 0, openUp: false });

  // نحسب موضع القائمة بالنسبة للنافذة (fixed) بدل absolute، لأن هذا الحقل غالباً يُستخدم
  // داخل نافذة منبثقة (Modal) قابلة للتمرير، وlأي absolute/overflow في عنصر أب كان يقصّ القائمة
  // ويُخفي جزءاً كبيراً من نتائج البحث حتى مع النزول لآخر الصفحة.
  useEffect(() => {
    if (!gamePickerOpen || !gamePickerBtnRef.current) return;
    const updatePos = () => {
      const rect = gamePickerBtnRef.current!.getBoundingClientRect();
      const viewportH = window.innerHeight;
      const spaceBelow = viewportH - rect.bottom;
      const desiredHeight = 320; // يوافق max-h-80
      const openUp = spaceBelow < desiredHeight && rect.top > spaceBelow;
      setPickerPos({
        top: openUp ? rect.top : rect.bottom,
        left: rect.left,
        width: rect.width,
        openUp,
      });
    };
    updatePos();
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [gamePickerOpen]);

  // إغلاق القائمة عند الضغط خارجها
  useEffect(() => {
    if (!gamePickerOpen) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (gamePickerBtnRef.current?.contains(target)) return;
      const dropdown = document.getElementById("nv-game-picker-dropdown");
      if (dropdown?.contains(target)) return;
      setGamePickerOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [gamePickerOpen]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      adminFetch("/api/admin/name-verification/games").then(r => r.json()).catch(() => []),
      adminFetch("/api/admin/name-verification/keys").then(r => r.json()).catch(() => []),
      adminFetch("/api/admin/name-verification/categories").then(r => r.json()).catch(() => []),
    ]).then(([gamesRes, keysRes, catsRes]) => {
      if (!active) return;
      setGames(Array.isArray(gamesRes) ? gamesRes : []);
      setCategories(Array.isArray(catsRes) ? catsRes : []);
      const status: Record<string, boolean> = {};
      (Array.isArray(keysRes) ? keysRes : []).forEach((k: any) => { status[k.game] = !!k.configured; });
      setKeyStatus(status);
    }).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const selectedGame = games.find(g => g.value === value.name_verification_game);
  // مفتاح فري فاير مستقل عن مفتاح Volsever الموحّد لبقية الألعاب
  const gameKeyConfigured = value.name_verification_game
    ? (value.name_verification_game === "freefire" ? !!keyStatus["freefire"] : !!keyStatus["volsever"])
    : true;

  const filteredGames = useMemo(() => {
    let list = games;
    if (categoryFilter) list = list.filter(g => g.category === categoryFilter);
    if (gameSearch.trim()) {
      const q = gameSearch.trim().toLowerCase();
      list = list.filter(g => g.label.toLowerCase().includes(q) || g.value.toLowerCase().includes(q));
    }
    return list;
  }, [games, gameSearch, categoryFilter]);

  // عند اختيار لعبة تدعم مناطق ديناميكية (dropdown) من Volsever، نجلب قائمتها الفعلية
  useEffect(() => {
    const game = value.name_verification_game;
    const g = games.find(x => x.value === game);
    if (!g || game === "freefire") { setDynamicRegions([]); return; }
    if (g.hasZone && g.zoneType === "dropdown") {
      setRegionsLoading(true);
      adminFetch(`/api/admin/name-verification/zones/${game}`)
        .then(r => r.json())
        .then(data => setDynamicRegions(Array.isArray(data) ? data : []))
        .catch(() => setDynamicRegions([]))
        .finally(() => setRegionsLoading(false));
    } else {
      setDynamicRegions([]);
    }
  }, [value.name_verification_game, games]);

  return (
    <div className="space-y-3 p-3 bg-cyan-50 rounded-lg border border-cyan-100">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-cyan-700 flex items-center gap-1.5">
          <ShieldCheck size={15} /> تفعيل التحقق من الاسم
        </label>
        <button
          type="button"
          onClick={() =>
            onChange({
              ...value,
              name_verification_enabled: !value.name_verification_enabled,
              name_verification_game: !value.name_verification_enabled ? (value.name_verification_game || (games[0]?.value ?? "")) : value.name_verification_game,
            })
          }
          className={`relative w-11 h-6 rounded-full transition-colors ${value.name_verification_enabled ? "bg-cyan-500" : "bg-gray-300"}`}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              value.name_verification_enabled ? "translate-x-[-1.5rem]" : "translate-x-[-0.125rem]"
            } right-0`}
          />
        </button>
      </div>

      {value.name_verification_enabled && (
        <div className="space-y-2.5">
          <div className="relative">
            <label className="text-[11px] font-bold text-cyan-700 mb-1 block">اللعبة / التطبيق</label>
            <button
              ref={gamePickerBtnRef}
              type="button"
              onClick={() => setGamePickerOpen(o => !o)}
              className="w-full flex items-center justify-between p-2.5 bg-white border border-cyan-200 rounded-lg text-sm text-right"
            >
              <span className={selectedGame ? "text-gray-800 font-bold" : "text-gray-400"}>
                {loading ? "جارٍ التحميل..." : (selectedGame?.label || "اختر اللعبة أو التطبيق")}
              </span>
              <Search size={14} className="text-cyan-400 shrink-0" />
            </button>

            {gamePickerOpen && createPortal(
              <div
                id="nv-game-picker-dropdown"
                style={{
                  position: "fixed",
                  top: pickerPos.openUp ? undefined : pickerPos.top + 4,
                  bottom: pickerPos.openUp ? window.innerHeight - pickerPos.top + 4 : undefined,
                  left: pickerPos.left,
                  width: pickerPos.width,
                  maxHeight: 320,
                }}
                className="z-[9999] bg-white border border-cyan-200 rounded-lg shadow-xl overflow-hidden flex flex-col"
              >
                <div className="p-2 border-b border-gray-100 space-y-2 sticky top-0 bg-white shrink-0">
                  <div className="relative">
                    <Search size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      autoFocus
                      value={gameSearch}
                      onChange={(e) => setGameSearch(e.target.value)}
                      placeholder="ابحث عن لعبة أو تطبيق..."
                      className="w-full pr-8 pl-2 py-1.5 text-xs border border-gray-200 rounded-md outline-none"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => setCategoryFilter("")}
                      className={`text-[10px] font-bold px-2 py-1 rounded-full border ${!categoryFilter ? "bg-cyan-500 text-white border-cyan-500" : "bg-white text-gray-500 border-gray-200"}`}
                    >
                      الكل
                    </button>
                    {categories.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategoryFilter(cat)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-full border ${categoryFilter === cat ? "bg-cyan-500 text-white border-cyan-500" : "bg-white text-gray-500 border-gray-200"}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="overflow-y-auto flex-1 min-h-0 overscroll-contain">
                  {filteredGames.length === 0 ? (
                    <div className="text-center text-xs text-gray-400 py-4">لا توجد نتائج مطابقة</div>
                  ) : filteredGames.map(g => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => {
                        onChange({ ...value, name_verification_game: g.value, name_verification_region: "" });
                        setGamePickerOpen(false);
                        setGameSearch("");
                      }}
                      className={`w-full text-right px-3 py-2 text-xs hover:bg-cyan-50 flex items-center justify-between ${value.name_verification_game === g.value ? "bg-cyan-50 font-bold text-cyan-700" : "text-gray-700"}`}
                    >
                      <span>{g.label}</span>
                      {g.category && <span className="text-[9px] text-gray-400">{g.category}</span>}
                    </button>
                  ))}
                </div>
              </div>,
              document.body
            )}
          </div>

          {value.name_verification_game === "freefire" && selectedGame && (
            <div>
              <label className="text-[11px] font-bold text-cyan-700 mb-1 block">منطقة الخادم (Region)</label>
              <CustomSelect
                value={value.name_verification_region}
                onChange={(v) => onChange({ ...value, name_verification_region: v })}
                options={selectedGame.regions.map(r => ({ value: r.value, label: r.label }))}
                placeholder="اختر المنطقة"
                buttonClassName="bg-white border-cyan-200"
              />
            </div>
          )}

          {value.name_verification_game && value.name_verification_game !== "freefire" && selectedGame?.hasZone && (
            <div>
              <label className="text-[11px] font-bold text-cyan-700 mb-1 block">المنطقة / السيرفر (Zone)</label>
              {selectedGame.zoneType === "dropdown" ? (
                <CustomSelect
                  value={value.name_verification_region}
                  onChange={(v) => onChange({ ...value, name_verification_region: v })}
                  options={dynamicRegions}
                  placeholder={regionsLoading ? "جارٍ تحميل المناطق..." : "اختر المنطقة"}
                  buttonClassName="bg-white border-cyan-200"
                />
              ) : (
                <input
                  value={value.name_verification_region}
                  onChange={(e) => onChange({ ...value, name_verification_region: e.target.value })}
                  placeholder="مثال: القيمة الافتراضية للمنطقة/السيرفر إن وجدت (اختياري حسب اللعبة)"
                  className="w-full p-2.5 bg-white border border-cyan-200 rounded-lg text-sm outline-none"
                />
              )}
              <p className="text-[10px] text-gray-400 mt-1">
                هذه القيمة اختيارية هنا كإعداد افتراضي؛ ستُستخدم قيمة المعرف/المنطقة التي يدخلها المستخدم في صفحة تأكيد الطلب عند التحقق.
              </p>
            </div>
          )}

          {value.name_verification_game && !gameKeyConfigured && !loading && (
            <div className="flex items-start gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>لم يتم تفعيل مفتاح التحقق المطلوب لهذا المزود. أضِفه من الإجراءات السريعة ← تخصيص مفاتيح التحقق من الاسم، ثم أعد المحاولة.</span>
            </div>
          )}

          {/* [NAME VERIFICATION] اختيار حقل/حقول الإدخال التي تحتوي على معرف اللاعب — إلزامي حتى يعمل
              زر "تحقق من الاسم" لدى العميل، بما فيها المنتجات الداخلية العادية التي لا تملك حقولاً افتراضية. */}
          <div>
            <label className="text-[11px] font-bold text-cyan-700 mb-1 block">
              الخانة/الخانات التي تحتوي على المعرف <span className="text-red-500">*</span>
            </label>
            {availableFields.length === 0 ? (
              <div className="flex items-start gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>لا يوجد حقل إدخال لهذا المنتج بعد. أضِف حقلاً (افتراضياً أو مخصصاً) من قسم "الحقول" أعلاه أولاً، ثم عُد هنا لاختياره كمصدر للمعرف.</span>
              </div>
            ) : (
              <div className="space-y-1.5 bg-white border border-cyan-200 rounded-lg p-2">
                {availableFields.map(f => {
                  const checked = value.name_verification_source_field_ids.includes(f.id);
                  return (
                    <label key={f.id} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const next = checked
                            ? value.name_verification_source_field_ids.filter(id => id !== f.id)
                            : [...value.name_verification_source_field_ids, f.id];
                          onChange({ ...value, name_verification_source_field_ids: next });
                        }}
                        className="w-3.5 h-3.5 accent-cyan-500"
                      />
                      <span>{f.label}</span>
                    </label>
                  );
                })}
              </div>
            )}
            <p className="text-[10px] text-gray-400 mt-1">
              عند اختيار أكثر من خانة، تُدمج قيمها معاً (بمسافة بينها) وتُستخدم كمعرف واحد عند التحقق من الاسم.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default NameVerificationFields;
