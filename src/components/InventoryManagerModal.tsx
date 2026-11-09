import React from "react";
import { X, Package, Plus, Trash2, ArrowRight, Upload, Link2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

/**
 * مدير المخزون الموحّد — مودال واحد بسيط يُستخدم في كل مكان:
 *  - من "إجراء سريع" (وضع مستقل: عرض/إدارة فقط)
 *  - من نموذج إضافة/تعديل منتج (وضع اختيار: يسمح بربط مجموعة بالمنتج)
 *
 * لا يقوم بأي تنقّل بين الصفحات — مجرد مودال يظهر ويختفي فوق الشاشة الحالية.
 */

export type InventoryGroup = {
  id: number;
  name: string;
  category?: string;
  available_count: number;
  total_count: number;
  low_stock_threshold: number;
};

export type InventoryUnit = {
  id: number;
  content: string;
  status: "available" | "reserved" | "delivered";
};

interface InventoryManagerModalProps {
  open: boolean;
  onClose: () => void;
  adminFetch: (url: string, options?: any) => Promise<Response>;
  /** إن مُرّرت، تظهر أزرار "ربط بالمنتج" وعند الاختيار يُستدعى هذا الكولباك */
  onSelectGroup?: (group: InventoryGroup) => void;
  /** المجموعة المرتبطة حالياً (لتمييزها بصرياً) */
  currentGroupId?: number | string | null;
}

export default function InventoryManagerModal({
  open,
  onClose,
  adminFetch,
  onSelectGroup,
  currentGroupId,
}: InventoryManagerModalProps) {
  const [groups, setGroups] = React.useState<InventoryGroup[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [activeGroup, setActiveGroup] = React.useState<InventoryGroup | null>(null);
  const [units, setUnits] = React.useState<InventoryUnit[]>([]);

  const [showNewGroupForm, setShowNewGroupForm] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newCategory, setNewCategory] = React.useState("");
  const [newThreshold, setNewThreshold] = React.useState("5");

  const [bulkText, setBulkText] = React.useState("");
  const [singleItem, setSingleItem] = React.useState("");

  const loadGroups = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch("/api/admin/inventory/groups");
      const data = await res.json();
      setGroups(Array.isArray(data) ? data : []);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  const loadUnits = React.useCallback(
    async (groupId: number) => {
      try {
        const res = await adminFetch(`/api/admin/inventory/groups/${groupId}/units`);
        const data = await res.json();
        setUnits(Array.isArray(data) ? data : []);
      } catch {
        setUnits([]);
      }
    },
    [adminFetch]
  );

  React.useEffect(() => {
    if (open) {
      loadGroups();
      setActiveGroup(null);
      setUnits([]);
      setShowNewGroupForm(false);
    }
  }, [open, loadGroups]);

  const createGroup = async () => {
    if (!newName.trim()) return;
    try {
      const res = await adminFetch("/api/admin/inventory/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          category: newCategory.trim(),
          low_stock_threshold: parseInt(newThreshold) || 5,
        }),
      });
      if (res.ok) {
        setNewName("");
        setNewCategory("");
        setNewThreshold("5");
        setShowNewGroupForm(false);
        loadGroups();
      }
    } catch {}
  };

  const openGroup = (g: InventoryGroup) => {
    setActiveGroup(g);
    loadUnits(g.id);
  };

  const backToGroups = () => {
    setActiveGroup(null);
    setUnits([]);
    setBulkText("");
    setSingleItem("");
  };

  const addSingle = async () => {
    if (!activeGroup || !singleItem.trim()) return;
    try {
      const res = await adminFetch(`/api/admin/inventory/groups/${activeGroup.id}/units`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: singleItem }),
      });
      if (res.ok) {
        setSingleItem("");
        loadUnits(activeGroup.id);
        loadGroups();
      }
    } catch {}
  };

  const addBulk = async () => {
    if (!activeGroup || !bulkText.trim()) return;
    try {
      const res = await adminFetch(`/api/admin/inventory/groups/${activeGroup.id}/bulk-import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: bulkText }),
      });
      if (res.ok) {
        setBulkText("");
        loadUnits(activeGroup.id);
        loadGroups();
      }
    } catch {}
  };

  const deleteUnit = async (unitId: number) => {
    if (!activeGroup) return;
    try {
      const res = await adminFetch(`/api/admin/inventory/units/${unitId}`, { method: "DELETE" });
      if (res.ok) {
        loadUnits(activeGroup.id);
        loadGroups();
      }
    } catch {}
  };

  const statusLabel = (s: string) =>
    s === "available" ? "متاح" : s === "delivered" ? "تم التسليم" : "محجوز";
  const statusClass = (s: string) =>
    s === "available"
      ? "bg-green-100 text-green-700"
      : s === "delivered"
      ? "bg-gray-200 text-gray-500"
      : "bg-amber-100 text-amber-700";

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[95] flex items-center justify-center p-3"
        style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-amber-50">
            <div className="flex items-center gap-2">
              {activeGroup && (
                <button onClick={backToGroups} className="text-amber-700 hover:text-amber-900">
                  <ArrowRight size={18} />
                </button>
              )}
              <Package size={18} className="text-amber-600" />
              <h3 className="font-black text-gray-800 text-sm">
                {activeGroup ? activeGroup.name : "المخزون"}
              </h3>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {loading && (
              <p className="text-center text-xs text-gray-400 py-6">جارِ التحميل...</p>
            )}

            {/* ── قائمة المجموعات ── */}
            {!loading && !activeGroup && (
              <div className="space-y-3">
                {!showNewGroupForm ? (
                  <button
                    onClick={() => setShowNewGroupForm(true)}
                    className="w-full py-2.5 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-blue-100 transition"
                  >
                    <Plus size={15} /> مجموعة مخزون جديدة
                  </button>
                ) : (
                  <div className="p-3 bg-gray-50 rounded-xl space-y-2 border border-gray-100">
                    <input
                      type="text"
                      placeholder="اسم المجموعة (مثال: حسابات جوجل)"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full p-2 bg-white rounded-lg text-sm outline-none border border-gray-200"
                      autoFocus
                    />
                    <input
                      type="text"
                      placeholder="التصنيف (اختياري)"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full p-2 bg-white rounded-lg text-sm outline-none border border-gray-200"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="حد التنبيه"
                        value={newThreshold}
                        onChange={(e) => setNewThreshold(e.target.value)}
                        className="w-24 p-2 bg-white rounded-lg text-sm outline-none border border-gray-200"
                      />
                      <button onClick={createGroup} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold">
                        إنشاء
                      </button>
                      <button
                        onClick={() => setShowNewGroupForm(false)}
                        className="px-3 py-2 bg-gray-100 text-gray-500 rounded-lg text-xs font-bold"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {groups.length === 0 && (
                    <p className="text-center text-xs text-gray-400 py-6">لا توجد مجموعات مخزون بعد</p>
                  )}
                  {groups.map((g) => {
                    const isLinked = currentGroupId != null && String(currentGroupId) === String(g.id);
                    return (
                      <div
                        key={g.id}
                        className={`p-3 rounded-xl flex items-center justify-between border transition ${
                          isLinked ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-transparent hover:border-gray-200"
                        }`}
                      >
                        <button className="text-right flex-1" onClick={() => openGroup(g)}>
                          <p className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                            {g.name}
                            {isLinked && <span className="text-[10px] text-blue-600 font-black">(مرتبطة)</span>}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            متاح:{" "}
                            <span className={g.available_count === 0 ? "text-red-500 font-bold" : "text-green-600 font-bold"}>
                              {g.available_count}
                            </span>{" "}
                            / إجمالي: {g.total_count}
                            {g.available_count > 0 && g.available_count <= g.low_stock_threshold && (
                              <span className="mr-1.5 text-amber-600">⚠️ منخفض</span>
                            )}
                            {g.available_count === 0 && <span className="mr-1.5 text-red-500">نفذت الكمية</span>}
                          </p>
                        </button>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={() => openGroup(g)}
                            className="text-xs font-bold text-gray-500 bg-white px-2.5 py-1.5 rounded-lg border border-gray-200"
                          >
                            إدارة
                          </button>
                          {onSelectGroup && (
                            <button
                              onClick={() => onSelectGroup(g)}
                              className="text-xs font-bold text-white bg-blue-600 px-2.5 py-1.5 rounded-lg flex items-center gap-1"
                            >
                              <Link2 size={12} /> ربط
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── إدارة عناصر مجموعة واحدة ── */}
            {!loading && activeGroup && (
              <div className="space-y-3">
                <div className="p-3 bg-amber-50 rounded-xl space-y-2 border border-amber-100">
                  <p className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
                    <Upload size={13} /> استيراد جماعي (كل سطر = عنصر واحد)
                  </p>
                  <textarea
                    placeholder={"account1@gmail.com:pass123\naccount2@gmail.com:pass456"}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    className="w-full p-2 bg-white rounded-lg text-xs outline-none border border-amber-200 h-24 resize-none font-mono"
                  />
                  <button onClick={addBulk} className="w-full py-2 bg-amber-500 text-white rounded-lg text-xs font-bold">
                    استيراد ({bulkText.split(/\r?\n/).filter((l) => l.trim()).length} عنصر)
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="إضافة عنصر واحد"
                    value={singleItem}
                    onChange={(e) => setSingleItem(e.target.value)}
                    className="flex-1 p-2 bg-gray-50 rounded-lg text-sm outline-none border border-gray-200"
                    onKeyDown={(e) => e.key === "Enter" && addSingle()}
                  />
                  <button onClick={addSingle} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold">
                    إضافة
                  </button>
                </div>

                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {units.length === 0 && <p className="text-center text-xs text-gray-400 py-4">لا توجد عناصر</p>}
                  {units.map((u) => (
                    <div key={u.id} className="p-2 bg-gray-50 rounded-lg flex items-center justify-between gap-2">
                      <span className="text-xs font-mono text-gray-700 truncate flex-1" dir="ltr">
                        {u.content}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${statusClass(u.status)}`}>
                        {statusLabel(u.status)}
                      </span>
                      {u.status === "available" && (
                        <button onClick={() => deleteUnit(u.id)} className="text-red-400 hover:text-red-600 shrink-0">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {onSelectGroup && (
                  <button
                    onClick={() => onSelectGroup(activeGroup)}
                    className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-1.5"
                  >
                    <Link2 size={14} /> ربط هذه المجموعة بالمنتج
                  </button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
