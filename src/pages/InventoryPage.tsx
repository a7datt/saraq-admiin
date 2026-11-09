import React from "react";
import { ArrowRight, Package, Plus, Trash2, Upload, Link2, Pencil, X } from "lucide-react";

/**
 * صفحة المخزون الكاملة (مستقلة) — تُفتح من "إجراء سريع" ← "المخزون"
 * كصفحة كاملة داخل لوحة التحكم، وليست مودال.
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

interface InventoryPageProps {
  adminFetch: (url: string, options?: any) => Promise<Response>;
  onBack: () => void;
}

export default function InventoryPage({ adminFetch, onBack }: InventoryPageProps) {
  const [groups, setGroups] = React.useState<InventoryGroup[]>([]);
  const [loading, setLoading] = React.useState(false);
  const hasLoadedOnce = React.useRef(false);
  const [activeGroup, setActiveGroup] = React.useState<InventoryGroup | null>(null);
  const [units, setUnits] = React.useState<InventoryUnit[]>([]);

  const [showNewGroupForm, setShowNewGroupForm] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newCategory, setNewCategory] = React.useState("");
  const [newThreshold, setNewThreshold] = React.useState("5");

  const [bulkText, setBulkText] = React.useState("");
  const [singleItem, setSingleItem] = React.useState("");

  const [editingGroupId, setEditingGroupId] = React.useState<number | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editCategory, setEditCategory] = React.useState("");
  const [editThreshold, setEditThreshold] = React.useState("5");
  const [groupError, setGroupError] = React.useState("");
  const [deletingGroupId, setDeletingGroupId] = React.useState<number | null>(null);

  const loadGroups = React.useCallback(async () => {
    // نعرض مؤشر "جاري التحميل" فقط في أول تحميل للصفحة، وليس في أي إعادة جلب لاحقة
    // (يمنع ظهور المؤشر بشكل متكرر بدون سبب ظاهر للمستخدم)
    if (!hasLoadedOnce.current) setLoading(true);
    try {
      const res = await adminFetch("/api/admin/inventory/groups");
      const data = await res.json();
      setGroups(Array.isArray(data) ? data : []);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
      hasLoadedOnce.current = true;
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
    loadGroups();
  }, [loadGroups]);

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

  const startEditGroup = (g: InventoryGroup) => {
    setGroupError("");
    setEditingGroupId(g.id);
    setEditName(g.name);
    setEditCategory(g.category || "");
    setEditThreshold(String(g.low_stock_threshold ?? 5));
  };

  const cancelEditGroup = () => {
    setEditingGroupId(null);
    setGroupError("");
  };

  const saveEditGroup = async (groupId: number) => {
    if (!editName.trim()) {
      setGroupError("اسم المجموعة مطلوب");
      return;
    }
    try {
      const res = await adminFetch(`/api/admin/inventory/groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          category: editCategory.trim(),
          low_stock_threshold: parseInt(editThreshold) || 5,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGroupError(data?.error || "تعذر تحديث المجموعة");
        return;
      }
      setEditingGroupId(null);
      setGroupError("");
      loadGroups();
    } catch {
      setGroupError("تعذر الاتصال بالخادم");
    }
  };

  const deleteGroup = async (groupId: number) => {
    setGroupError("");
    try {
      const res = await adminFetch(`/api/admin/inventory/groups/${groupId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGroupError(data?.error || "تعذر حذف المجموعة");
        setDeletingGroupId(null);
        return;
      }
      setDeletingGroupId(null);
      loadGroups();
    } catch {
      setGroupError("تعذر الاتصال بالخادم");
      setDeletingGroupId(null);
    }
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

  return (
    <div className="min-h-full bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-2 sticky top-0 z-10">
        {activeGroup ? (
          <button onClick={backToGroups} className="text-amber-700 hover:text-amber-900">
            <ArrowRight size={20} />
          </button>
        ) : (
          <button onClick={onBack} className="text-gray-500 hover:text-gray-800">
            <ArrowRight size={20} />
          </button>
        )}
        <Package size={18} className="text-amber-600" />
        <h2 className="font-black text-gray-800 text-base">
          {activeGroup ? activeGroup.name : "المخزون"}
        </h2>
      </div>

      <div className="p-4 max-w-2xl mx-auto">
        {loading && <p className="text-center text-xs text-gray-400 py-8">جارِ التحميل...</p>}

        {/* ── قائمة المجموعات ── */}
        {!loading && !activeGroup && (
          <div className="space-y-3">
            {!showNewGroupForm ? (
              <button
                onClick={() => setShowNewGroupForm(true)}
                className="w-full py-3 bg-blue-50 text-blue-600 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 hover:bg-blue-100 transition"
              >
                <Plus size={16} /> مجموعة مخزون جديدة
              </button>
            ) : (
              <div className="p-4 bg-white rounded-xl space-y-2 border border-gray-100 shadow-sm">
                <input
                  type="text"
                  placeholder="اسم المجموعة (مثال: حسابات جوجل)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 rounded-lg text-sm outline-none border border-gray-200"
                  autoFocus
                />
                <input
                  type="text"
                  placeholder="التصنيف (اختياري)"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 rounded-lg text-sm outline-none border border-gray-200"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="حد التنبيه"
                    value={newThreshold}
                    onChange={(e) => setNewThreshold(e.target.value)}
                    className="w-24 p-2.5 bg-gray-50 rounded-lg text-sm outline-none border border-gray-200"
                  />
                  <button onClick={createGroup} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold">
                    إنشاء
                  </button>
                  <button
                    onClick={() => setShowNewGroupForm(false)}
                    className="px-4 py-2.5 bg-gray-100 text-gray-500 rounded-lg text-sm font-bold"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {groupError && !editingGroupId && (
                <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{groupError}</p>
              )}
              {groups.length === 0 && (
                <p className="text-center text-xs text-gray-400 py-10">لا توجد مجموعات مخزون بعد</p>
              )}
              {groups.map((g) => (
                <div
                  key={g.id}
                  className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm"
                >
                  {editingGroupId === g.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="اسم المجموعة"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full p-2.5 bg-gray-50 rounded-lg text-sm outline-none border border-gray-200"
                        autoFocus
                      />
                      <input
                        type="text"
                        placeholder="التصنيف (اختياري)"
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="w-full p-2.5 bg-gray-50 rounded-lg text-sm outline-none border border-gray-200"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="حد التنبيه"
                          value={editThreshold}
                          onChange={(e) => setEditThreshold(e.target.value)}
                          className="w-24 p-2.5 bg-gray-50 rounded-lg text-sm outline-none border border-gray-200"
                        />
                        <button
                          onClick={() => saveEditGroup(g.id)}
                          className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold"
                        >
                          حفظ
                        </button>
                        <button
                          onClick={cancelEditGroup}
                          className="px-4 py-2.5 bg-gray-100 text-gray-500 rounded-lg text-sm font-bold"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      {groupError && (
                        <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{groupError}</p>
                      )}
                    </div>
                  ) : deletingGroupId === g.id ? (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-red-600">
                        هل أنت متأكد من حذف مجموعة "{g.name}"؟ سيتم حذف جميع عناصرها. لا يمكن التراجع.
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => deleteGroup(g.id)}
                          className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-bold"
                        >
                          تأكيد الحذف
                        </button>
                        <button
                          onClick={() => setDeletingGroupId(null)}
                          className="px-4 py-2.5 bg-gray-100 text-gray-500 rounded-lg text-sm font-bold"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <button className="text-right flex-1" onClick={() => openGroup(g)}>
                        <p className="text-sm font-bold text-gray-800">{g.name}</p>
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
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => openGroup(g)}
                          className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg"
                        >
                          إدارة
                        </button>
                        <button
                          onClick={() => startEditGroup(g)}
                          title="تعديل"
                          className="text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 p-1.5 rounded-lg"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => { setGroupError(""); setDeletingGroupId(g.id); }}
                          title="حذف"
                          className="text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 p-1.5 rounded-lg"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── إدارة عناصر مجموعة واحدة ── */}
        {!loading && activeGroup && (
          <div className="space-y-3">
            <div className="p-4 bg-amber-50 rounded-xl space-y-2 border border-amber-100">
              <p className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
                <Upload size={13} /> استيراد جماعي (كل سطر = عنصر واحد)
              </p>
              <textarea
                placeholder={"account1@gmail.com:pass123\naccount2@gmail.com:pass456"}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                className="w-full p-2.5 bg-white rounded-lg text-xs outline-none border border-amber-200 h-28 resize-none font-mono"
              />
              <button onClick={addBulk} className="w-full py-2.5 bg-amber-500 text-white rounded-lg text-sm font-bold">
                استيراد ({bulkText.split(/\r?\n/).filter((l) => l.trim()).length} عنصر)
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="إضافة عنصر واحد"
                value={singleItem}
                onChange={(e) => setSingleItem(e.target.value)}
                className="flex-1 p-2.5 bg-white rounded-lg text-sm outline-none border border-gray-200"
                onKeyDown={(e) => e.key === "Enter" && addSingle()}
              />
              <button onClick={addSingle} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold">
                إضافة
              </button>
            </div>

            <div className="space-y-1.5">
              {units.length === 0 && <p className="text-center text-xs text-gray-400 py-8">لا توجد عناصر</p>}
              {units.map((u) => (
                <div key={u.id} className="p-2.5 bg-white rounded-lg flex items-center justify-between gap-2 border border-gray-100">
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
          </div>
        )}
      </div>
    </div>
  );
}
