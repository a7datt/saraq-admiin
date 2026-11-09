import React, { useEffect, useState } from "react";
import { ArrowRight, Plus, Pencil, Trash2, Star, Loader2, DollarSign, X, Check, History } from "lucide-react";
import { showToast } from "../components/ToastContainer";
import { showConfirm } from "../components/CustomDialogContainer";
import CurrencyRateHistoryPage from "./CurrencyRateHistoryPage";

interface CurrencyRow {
  id: number;
  name: string;
  symbol: string;
  exchange_rate: number;
  is_active: boolean;
  is_default: boolean;
  created_at?: string;
}

interface CurrenciesAdminPageProps {
  adminFetch: (url: string, options?: any) => Promise<Response>;
  onBack: () => void;
}

const emptyForm = { name: "", symbol: "", exchange_rate: "", is_active: true, is_default: false };

const CurrenciesAdminPage = ({ adminFetch, onBack }: CurrenciesAdminPageProps) => {
  const [currencies, setCurrencies] = useState<CurrencyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CurrencyRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const fetchCurrencies = async () => {
    setLoading(true);
    try {
      const res = await adminFetch("/api/admin/currencies");
      const data = await res.json();
      setCurrencies(Array.isArray(data.currencies) ? data.currencies : []);
    } catch {
      showToast("فشل تحميل العملات", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCurrencies(); }, []);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (c: CurrencyRow) => {
    setEditing(c);
    setForm({ name: c.name, symbol: c.symbol, exchange_rate: String(c.exchange_rate), is_active: c.is_active, is_default: c.is_default });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.symbol.trim() || !form.exchange_rate || isNaN(Number(form.exchange_rate)) || Number(form.exchange_rate) <= 0) {
      showToast("يرجى تعبئة كل الحقول بشكل صحيح", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        symbol: form.symbol.trim(),
        exchange_rate: Number(form.exchange_rate),
        is_active: form.is_active,
        is_default: form.is_default,
      };
      const res = editing
        ? await adminFetch(`/api/admin/currencies/${editing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        : await adminFetch("/api/admin/currencies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      showToast(editing ? "تم تحديث العملة" : "تم إضافة العملة", "success");
      setShowForm(false);
      fetchCurrencies();
    } catch {
      showToast("حدث خطأ أثناء الحفظ", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: CurrencyRow) => {
    showConfirm(`هل تريد حذف "${c.name}"؟`, "حذف العملة", async () => {
      setBusyId(c.id);
      try {
        const res = await adminFetch(`/api/admin/currencies/${c.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error();
        showToast("تم حذف العملة", "success");
        fetchCurrencies();
      } catch {
        showToast("تعذر حذف العملة", "error");
      } finally {
        setBusyId(null);
      }
    }, true);
  };

  const handleToggleActive = async (c: CurrencyRow) => {
    setBusyId(c.id);
    try {
      const res = await adminFetch(`/api/admin/currencies/${c.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !c.is_active }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error || "");
      }
      fetchCurrencies();
    } catch (e: any) {
      showToast(e?.message || "تعذر تحديث الحالة", "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleSetDefault = async (c: CurrencyRow | null) => {
    const id = c ? c.id : "usd";
    setBusyId(id);
    try {
      const res = await adminFetch(`/api/admin/currencies/${id}/set-default`, { method: "POST" });
      if (!res.ok) throw new Error();
      showToast(c ? `تم تعيين ${c.name} كعملة افتراضية` : "تم الرجوع إلى الدولار كعملة أساسية", "success");
      fetchCurrencies();
    } catch {
      showToast("تعذر تعيين العملة الافتراضية", "error");
    } finally {
      setBusyId(null);
    }
  };

  const hasDefault = currencies.some(c => c.is_default);

  if (showHistory) {
    return (
      <CurrencyRateHistoryPage
        adminFetch={adminFetch}
        currencies={currencies.map(c => ({ id: c.id, name: c.name, symbol: c.symbol }))}
        onBack={() => setShowHistory(false)}
      />
    );
  }

  if (showForm) {
    return (
      <div className="px-4 space-y-6 pb-20">
        <div className="flex items-center gap-2 mb-2">
          <button onClick={() => setShowForm(false)} className="p-2 bg-gray-100 rounded-full">
            <ArrowRight size={20} />
          </button>
          <h2 className="text-lg font-black text-gray-800">{editing ? "تعديل عملة" : "إضافة عملة جديدة"}</h2>
        </div>

        <div className="bg-white rounded-xl p-4 space-y-4 shadow-sm border border-gray-100">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-700">اسم العملة</label>
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="مثال: الليرة السورية"
              className="w-full p-3 bg-gray-50 rounded-lg outline-none border-2 border-transparent focus:border-emerald-400 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-700">رمز العملة</label>
            <input
              value={form.symbol}
              onChange={e => setForm({ ...form, symbol: e.target.value })}
              placeholder="مثال: ل.س"
              className="w-full p-3 bg-gray-50 rounded-lg outline-none border-2 border-transparent focus:border-emerald-400 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-700">سعر الصرف مقابل 1 دولار</label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="0.0001"
                value={form.exchange_rate}
                onChange={e => setForm({ ...form, exchange_rate: e.target.value })}
                placeholder="مثال: 14500"
                className="w-full p-3 bg-gray-50 rounded-lg outline-none border-2 border-transparent focus:border-emerald-400 transition-colors text-right"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">لكل 1$</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-bold text-gray-700">مفعّلة</span>
            <button
              onClick={() => setForm({ ...form, is_active: !form.is_active })}
              className={`w-12 h-7 rounded-full relative transition-colors ${form.is_active ? "bg-emerald-500" : "bg-gray-300"}`}
            >
              <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all ${form.is_active ? "right-0.5" : "right-5"}`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100">
            <div>
              <span className="text-sm font-bold text-gray-700 block">تعيين كعملة افتراضية</span>
              <span className="text-[11px] text-amber-600">ستُختار تلقائياً للمستخدمين بدلاً من الدولار</span>
            </div>
            <button
              onClick={() => setForm({ ...form, is_default: !form.is_default })}
              className={`w-12 h-7 rounded-full relative transition-colors ${form.is_default ? "bg-amber-500" : "bg-gray-300"}`}
            >
              <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all ${form.is_default ? "right-0.5" : "right-5"}`} />
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-emerald-600 text-white py-3.5 rounded-lg font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
            {saving ? "جاري الحفظ..." : "حفظ"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 space-y-6 pb-20">
      <div className="flex items-center gap-2 mb-2">
        <button onClick={onBack} className="p-2 bg-gray-100 rounded-full">
          <ArrowRight size={20} />
        </button>
        <h2 className="text-lg font-black text-gray-800 flex items-center gap-2 flex-1">
          <DollarSign size={20} className="text-emerald-600" />
          إدارة العملات
        </h2>
        <button
          onClick={() => setShowHistory(true)}
          className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600 border border-gray-200 rounded-lg px-3 py-2"
        >
          <History size={14} /> سجل التغييرات
        </button>
      </div>

      {/* Base currency (USD) row */}
      <div className={`rounded-xl p-4 border flex items-center justify-between ${!hasDefault ? "bg-emerald-50 border-emerald-200" : "bg-white border-gray-100"}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 font-black">$</div>
          <div>
            <p className="font-bold text-gray-800 text-sm">الدولار الأمريكي (العملة الأساسية)</p>
            <p className="text-[11px] text-gray-500">1$ = 1$</p>
          </div>
        </div>
        {!hasDefault ? (
          <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1"><Star size={14} fill="currentColor" />افتراضية</span>
        ) : (
          <button
            onClick={() => handleSetDefault(null)}
            disabled={busyId === "usd"}
            className="text-[11px] font-bold text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 disabled:opacity-50"
          >
            {busyId === "usd" ? "..." : "اجعلها افتراضية"}
          </button>
        )}
      </div>

      <button
        onClick={openAdd}
        className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-lg font-bold text-sm"
      >
        <Plus size={18} /> إضافة عملة جديدة
      </button>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-400" size={28} /></div>
      ) : currencies.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-10">لا توجد عملات ثانوية بعد</p>
      ) : (
        <div className="space-y-2">
          {currencies.map(c => (
            <div key={c.id} className="bg-white rounded-xl p-3.5 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center font-black text-gray-700 text-xs">{c.symbol}</div>
                  <div>
                    <p className="font-bold text-gray-800 text-sm flex items-center gap-1.5">
                      {c.name}
                      {c.is_default && <Star size={13} className="text-amber-500" fill="currentColor" />}
                      {!c.is_active && <span className="text-[9px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded font-bold">معطّلة</span>}
                    </p>
                    <p className="text-[11px] text-gray-500">1$ = {Number(c.exchange_rate).toLocaleString("en-US")} {c.symbol}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => openEdit(c)} className="p-2 text-gray-400 hover:text-emerald-600"><Pencil size={16} /></button>
                  <button onClick={() => handleDelete(c)} disabled={busyId === c.id} className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-50"><Trash2 size={16} /></button>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
                <button
                  onClick={() => handleToggleActive(c)}
                  disabled={busyId === c.id}
                  className="flex-1 text-[11px] font-bold py-1.5 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-50"
                >
                  {c.is_active ? "تعطيل" : "تفعيل"}
                </button>
                {!c.is_default && (
                  <button
                    onClick={() => handleSetDefault(c)}
                    disabled={busyId === c.id}
                    className="flex-1 text-[11px] font-bold py-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 disabled:opacity-50"
                  >
                    تعيين كافتراضية
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CurrenciesAdminPage;
