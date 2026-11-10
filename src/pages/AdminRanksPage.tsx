import React, { useEffect, useState } from "react";
import { ChevronRight, Plus, Save, Trash2, X, Award, Users, RefreshCw, Percent, Eye, EyeOff, ArrowUp, ArrowDown } from "lucide-react";
import AdminImageUpload from "../components/AdminImageUpload";
import OptimizedImage from "../components/OptimizedImage";
import { showToast } from "../components/ToastContainer";
import { showConfirm } from "../components/CustomDialogContainer";

export interface AdminRank {
  id: number;
  name: string;
  image_url: string;
  color: string;
  required_amount: number | string;
  has_discount: boolean;
  discount_percent: number | string;
  description: string;
  benefits: string;
  is_active: boolean;
  sort_order: number;
  users_count?: number;
}

interface Props {
  adminFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onBack: () => void;
}

const emptyForm = (): Partial<AdminRank> => ({
  name: "", image_url: "", color: "#e11d48", required_amount: 0, has_discount: false,
  discount_percent: 0, description: "", benefits: "", is_active: true, sort_order: 0,
});

export default function AdminRanksPage({ adminFetch, onBack }: Props) {
  const [ranks, setRanks] = useState<AdminRank[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<AdminRank> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminFetch("/api/admin/ranks");
      const data = await res.json();
      setRanks(Array.isArray(data) ? data : []);
    } catch { setRanks([]); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => setEditing({ ...emptyForm(), sort_order: (ranks[ranks.length - 1]?.sort_order ?? 0) + 1 });
  const openEdit = (r: AdminRank) => setEditing({ ...r });

  const save = async () => {
    if (!editing) return;
    if (!String(editing.name || "").trim()) { showToast("اسم الرتبة مطلوب", "error"); return; }
    setSaving(true);
    try {
      const payload = {
        name: editing.name, image_url: editing.image_url, color: editing.color,
        required_amount: Number(editing.required_amount) || 0,
        has_discount: !!editing.has_discount,
        discount_percent: editing.has_discount ? Number(editing.discount_percent) || 0 : 0,
        description: editing.description || "", benefits: editing.benefits || "",
        is_active: editing.is_active !== false, sort_order: Number(editing.sort_order) || 0,
      };
      const res = await adminFetch(editing.id ? `/api/admin/ranks/${editing.id}` : "/api/admin/ranks", {
        method: editing.id ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data?.error || "فشل الحفظ", "error"); setSaving(false); return; }
      showToast(editing.id ? "تم تحديث الرتبة — ستظهر فوراً للمستخدمين" : "تمت إضافة الرتبة", "success");
      setEditing(null);
      load();
    } catch { showToast("خطأ في الاتصال", "error"); }
    setSaving(false);
  };

  const remove = (r: AdminRank) => {
    showConfirm(`حذف الرتبة "${r.name}"؟ سيُعاد حساب رتب المستخدمين المرتبطين بها تلقائياً.`, "حذف الرتبة", async () => {
      const res = await adminFetch(`/api/admin/ranks/${r.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { showToast(data?.error || "فشل الحذف", "error"); return; }
      showToast("تم حذف الرتبة", "success");
      load();
    }, true);
  };

  const move = async (r: AdminRank, dir: -1 | 1) => {
    const idx = ranks.findIndex(x => x.id === r.id);
    const other = ranks[idx + dir];
    if (!other) return;
    await Promise.all([
      adminFetch(`/api/admin/ranks/${r.id}`, { method: "PUT", body: JSON.stringify({ sort_order: other.sort_order }) }),
      adminFetch(`/api/admin/ranks/${other.id}`, { method: "PUT", body: JSON.stringify({ sort_order: r.sort_order }) }),
    ]);
    load();
  };

  const recalc = async () => {
    const res = await adminFetch("/api/admin/ranks/recalc", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) showToast(`تمت إعادة حساب رتب ${data.users ?? ""} مستخدم`, "success");
    else showToast(data?.error || "فشل إعادة الحساب", "error");
    load();
  };

  const fmt = (n: any) => { const v = Number(n) || 0; return Number.isInteger(v) ? String(v) : v.toFixed(2); };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="text-gray-500 hover:text-gray-700 p-1 -m-1"><ChevronRight size={22} /></button>
          <h2 className="font-black text-lg text-gray-800 flex items-center gap-2"><Award size={18} className="text-[var(--brand)]" /> تحديد الرتب</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={recalc} title="إعادة حساب رتب كل المستخدمين" className="p-2 rounded-lg bg-gray-100 text-gray-600 active:scale-95"><RefreshCw size={16} /></button>
          <button onClick={openNew} className="flex items-center gap-1 bg-[var(--brand)] text-white px-3 py-2 rounded-lg text-xs font-black active:scale-95"><Plus size={14} /> رتبة جديدة</button>
        </div>
      </div>

      <p className="text-[11px] text-gray-500 leading-relaxed bg-gray-50 border border-gray-200 rounded-lg p-3">
        تُرقّى رتبة المستخدم تلقائياً حسب <b>إجمالي ما شحنه بالدولار</b>، ويُطبَّق خصم رتبته على مشترياته. أي تعديل تحفظه هنا (الاسم، الصورة، المبلغ، الخصم...) يظهر فوراً في واجهة المستخدم.
      </p>

      {loading ? (
        <p className="text-center text-sm text-gray-400 py-10">جاري التحميل...</p>
      ) : ranks.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-10">لا توجد رتب — أضف أول رتبة</p>
      ) : (
        <div className="space-y-2">
          {ranks.map((r, i) => (
            <div key={r.id} className={`bg-white rounded-xl border p-3 flex items-center gap-3 ${r.is_active ? "border-gray-200" : "border-dashed border-gray-300 opacity-70"}`}>
              <div className="w-14 h-14 shrink-0 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden" style={{ boxShadow: `0 0 0 2px ${r.color}33` }}>
                {r.image_url ? <OptimizedImage src={r.image_url} width={112} height={112} alt={r.name} className="w-full h-full object-contain" /> : <Award size={22} style={{ color: r.color }} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black text-gray-400">#{i + 1}</span>
                  <p className="font-black text-sm truncate" style={{ color: r.color }}>{r.name}</p>
                  {!r.is_active && <span className="text-[9px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded flex items-center gap-0.5"><EyeOff size={9} /> معطّلة</span>}
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap text-[10px] font-bold">
                  <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">المطلوب: {fmt(r.required_amount)}$</span>
                  <span className={`px-1.5 py-0.5 rounded flex items-center gap-0.5 ${r.has_discount && Number(r.discount_percent) > 0 ? "bg-[var(--brand)]/10 text-[var(--brand)]" : "bg-gray-100 text-gray-400"}`}>
                    <Percent size={9} /> {r.has_discount && Number(r.discount_percent) > 0 ? `خصم ${fmt(r.discount_percent)}%` : "بدون خصم"}
                  </span>
                  <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded flex items-center gap-0.5"><Users size={9} /> {r.users_count ?? 0}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <div className="flex gap-1">
                  <button onClick={() => move(r, -1)} disabled={i === 0} className="p-1.5 rounded-md bg-gray-50 text-gray-500 disabled:opacity-30"><ArrowUp size={12} /></button>
                  <button onClick={() => move(r, 1)} disabled={i === ranks.length - 1} className="p-1.5 rounded-md bg-gray-50 text-gray-500 disabled:opacity-30"><ArrowDown size={12} /></button>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(r)} className="px-2 py-1.5 rounded-md bg-[var(--brand)]/10 text-[var(--brand)] text-[10px] font-black">تعديل</button>
                  <button onClick={() => remove(r)} className="p-1.5 rounded-md bg-red-50 text-red-600"><Trash2 size={12} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* نافذة التعديل/الإضافة */}
      {editing && (
        <div className="fixed inset-0 bg-black/60 z-[80] flex items-end sm:items-center justify-center" onClick={() => !saving && setEditing(null)}>
          <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()} dir="rtl">
            <div className="sticky top-0 bg-white p-4 flex items-center justify-between border-b border-gray-200 z-10">
              <p className="font-black text-sm flex items-center gap-2"><Award size={16} className="text-[var(--brand)]" /> {editing.id ? `تعديل الرتبة: ${editing.name}` : "رتبة جديدة"}</p>
              <button onClick={() => setEditing(null)} className="p-1 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-20 h-20 shrink-0 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden" style={{ boxShadow: `0 0 20px -6px ${editing.color || "#e11d48"}` }}>
                  {editing.image_url ? <OptimizedImage src={editing.image_url} width={160} height={160} alt="" className="w-full h-full object-contain" /> : <Award size={30} style={{ color: editing.color }} />}
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-bold text-gray-400">اسم الرتبة *</label>
                  <input value={editing.name || ""} onChange={e => setEditing({ ...editing, name: e.target.value })} maxLength={60}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-black outline-none focus:border-[var(--brand)]" placeholder="مثال: VIP" />
                </div>
              </div>

              <AdminImageUpload label="صورة / أيقونة الرتبة" currentUrl={editing.image_url || ""} onUpload={(url) => setEditing({ ...editing, image_url: url })} />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400">المبلغ المطلوب شحنه ($) *</label>
                  <input type="number" min={0} step="0.01" value={editing.required_amount ?? 0} onChange={e => setEditing({ ...editing, required_amount: e.target.value })}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold outline-none text-center" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400">لون الرتبة</label>
                  <div className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-lg">
                    <input type="color" value={editing.color || "#e11d48"} onChange={e => setEditing({ ...editing, color: e.target.value })} className="w-9 h-9 rounded-md border-0 bg-transparent cursor-pointer" />
                    <input value={editing.color || ""} onChange={e => setEditing({ ...editing, color: e.target.value })} className="flex-1 bg-transparent text-xs font-mono outline-none" placeholder="#e11d48" />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs font-black text-gray-700 flex items-center gap-1.5"><Percent size={13} className="text-[var(--brand)]" /> هل يوجد خصم لهذه الرتبة؟</span>
                  <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editing.has_discount ? "bg-[var(--brand)]" : "bg-gray-300"}`} onClick={() => setEditing({ ...editing, has_discount: !editing.has_discount })}>
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${editing.has_discount ? "-translate-x-5" : "-translate-x-0.5"}`} />
                  </span>
                </label>
                {editing.has_discount && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400">نسبة الخصم (%) على المشتريات</label>
                    <input type="number" min={0} max={99} step="0.5" value={editing.discount_percent ?? 0} onChange={e => setEditing({ ...editing, discount_percent: e.target.value })}
                      className="w-full p-3 bg-white border border-gray-200 rounded-lg text-sm font-black outline-none text-center" />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400">وصف الرتبة</label>
                <textarea value={editing.description || ""} onChange={e => setEditing({ ...editing, description: e.target.value })} rows={2} maxLength={1000}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none resize-none" placeholder="وصف قصير يظهر للمستخدم" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400">المزايا (كل ميزة في سطر)</label>
                <textarea value={editing.benefits || ""} onChange={e => setEditing({ ...editing, benefits: e.target.value })} rows={3} maxLength={2000}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none resize-none" placeholder={"خصم دائم\nدعم مميز"} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400">ترتيب العرض</label>
                  <input type="number" min={0} value={editing.sort_order ?? 0} onChange={e => setEditing({ ...editing, sort_order: Number(e.target.value) })}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold outline-none text-center" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400">الحالة</label>
                  <button type="button" onClick={() => setEditing({ ...editing, is_active: editing.is_active === false })}
                    className={`w-full p-3 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 border ${editing.is_active !== false ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                    {editing.is_active !== false ? <><Eye size={13} /> مفعّلة</> : <><EyeOff size={13} /> معطّلة</>}
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={save} disabled={saving} className="flex-1 bg-[var(--brand)] text-white py-3 rounded-xl font-black text-sm flex items-center justify-center gap-1.5 disabled:opacity-60 active:scale-[0.98]">
                  <Save size={15} /> {saving ? "جاري الحفظ..." : "حفظ"}
                </button>
                <button onClick={() => setEditing(null)} disabled={saving} className="px-4 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
