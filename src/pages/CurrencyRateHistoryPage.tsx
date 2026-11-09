import React, { useEffect, useState } from "react";
import { ArrowRight, History, Loader2, TrendingUp, TrendingDown, Minus, Filter, X } from "lucide-react";
import { showToast } from "../components/ToastContainer";

interface CurrencyOption {
  id: number;
  name: string;
  symbol: string;
}

interface HistoryRow {
  id: number;
  currency_id: number | null;
  currency_name: string;
  currency_symbol: string;
  old_rate: number | null;
  new_rate: number;
  change_type: "created" | "updated";
  changed_by: string | null;
  created_at: string;
}

interface CurrencyRateHistoryPageProps {
  adminFetch: (url: string, options?: any) => Promise<Response>;
  currencies: CurrencyOption[];
  onBack: () => void;
}

const CurrencyRateHistoryPage = ({ adminFetch, currencies, onBack }: CurrencyRateHistoryPageProps) => {
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCurrencyId, setFilterCurrencyId] = useState<string>("");
  const [filterFrom, setFilterFrom] = useState<string>("");
  const [filterTo, setFilterTo] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCurrencyId) params.set("currency_id", filterCurrencyId);
      if (filterFrom) params.set("from", new Date(filterFrom).toISOString());
      if (filterTo) {
        // نضيف نهاية اليوم بالكامل لتشمل تاريخ "إلى" المحدد
        const toDate = new Date(filterTo);
        toDate.setHours(23, 59, 59, 999);
        params.set("to", toDate.toISOString());
      }
      const res = await adminFetch(`/api/admin/currencies/rate-history?${params.toString()}`);
      const data = await res.json();
      setHistory(Array.isArray(data?.history) ? data.history : []);
    } catch {
      showToast("فشل تحميل سجل تغييرات سعر الصرف", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, []);

  const applyFilters = () => { fetchHistory(); setShowFilters(false); };
  const clearFilters = () => { setFilterCurrencyId(""); setFilterFrom(""); setFilterTo(""); setTimeout(fetchHistory, 0); };
  const hasActiveFilters = !!(filterCurrencyId || filterFrom || filterTo);

  const formatRate = (v: number | null) => v === null || v === undefined ? "—" : Number(v).toLocaleString("en-US", { maximumFractionDigits: 4 });

  return (
    <div className="px-4 space-y-6 pb-20">
      <div className="flex items-center gap-2 mb-2">
        <button onClick={onBack} className="p-2 bg-gray-100 rounded-full">
          <ArrowRight size={20} />
        </button>
        <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
          <History size={20} className="text-emerald-600" />
          سجل تغييرات سعر الصرف
        </h2>
      </div>

      <button
        onClick={() => setShowFilters(s => !s)}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm border ${hasActiveFilters ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-white border-gray-200 text-gray-600"}`}
      >
        <Filter size={16} /> {hasActiveFilters ? "الفلاتر مفعّلة" : "فلترة السجل"}
      </button>

      {showFilters && (
        <div className="bg-white rounded-xl p-4 space-y-4 shadow-sm border border-gray-100">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-700">العملة</label>
            <select
              value={filterCurrencyId}
              onChange={e => setFilterCurrencyId(e.target.value)}
              className="w-full p-3 bg-gray-50 rounded-lg outline-none border-2 border-transparent focus:border-emerald-400 transition-colors"
            >
              <option value="">كل العملات</option>
              {currencies.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.symbol})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">من تاريخ</label>
              <input
                type="date"
                value={filterFrom}
                onChange={e => setFilterFrom(e.target.value)}
                className="w-full p-3 bg-gray-50 rounded-lg outline-none border-2 border-transparent focus:border-emerald-400 transition-colors text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">إلى تاريخ</label>
              <input
                type="date"
                value={filterTo}
                onChange={e => setFilterTo(e.target.value)}
                className="w-full p-3 bg-gray-50 rounded-lg outline-none border-2 border-transparent focus:border-emerald-400 transition-colors text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={applyFilters} className="flex-1 bg-emerald-600 text-white py-2.5 rounded-lg font-bold text-sm">تطبيق</button>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-1">
                <X size={14} /> مسح الفلاتر
              </button>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gray-400" size={28} /></div>
      ) : history.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-12">لا توجد تغييرات مسجّلة{hasActiveFilters ? " ضمن هذه الفلاتر" : " بعد"}</p>
      ) : (
        <div className="space-y-2">
          {history.map(h => {
            const isCreated = h.change_type === "created";
            const increased = !isCreated && h.old_rate !== null && Number(h.new_rate) > Number(h.old_rate);
            const decreased = !isCreated && h.old_rate !== null && Number(h.new_rate) < Number(h.old_rate);
            return (
              <div key={h.id} className="bg-white rounded-xl p-3.5 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="font-bold text-gray-800 text-sm">{h.currency_name} <span className="text-gray-400 font-normal">({h.currency_symbol})</span></p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isCreated ? "bg-sky-50 text-sky-600" : "bg-gray-100 text-gray-500"}`}>
                    {isCreated ? "إنشاء" : "تعديل"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {isCreated ? (
                    <span className="font-bold text-gray-700">سعر ابتدائي: {formatRate(h.new_rate)} {h.currency_symbol}</span>
                  ) : (
                    <>
                      <span className="text-gray-400 line-through">{formatRate(h.old_rate)}</span>
                      <span className="text-gray-300">←</span>
                      <span className="font-bold text-gray-800">{formatRate(h.new_rate)} {h.currency_symbol}</span>
                      {increased && <TrendingUp size={14} className="text-red-500" />}
                      {decreased && <TrendingDown size={14} className="text-emerald-500" />}
                      {!increased && !decreased && <Minus size={14} className="text-gray-300" />}
                    </>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5">{new Date(h.created_at).toLocaleString("ar-EG")}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CurrencyRateHistoryPage;
