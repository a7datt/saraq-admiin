import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Store, Zap, Package, ExternalLink, Image as ImageIcon, ChevronDown, Layers } from "lucide-react";

// ── StoreTypePickerField ──────────────────────────────────────────────────────
export const STORE_TYPE_OPTIONS = [
  {
    value: "normal",
    label: "عادي",
    icon: <Store size={28} />,
    color: "text-blue-600 bg-blue-50",
    border: "border-blue-200",
  },
  {
    value: "quick_order",
    label: "طلب سريع",
    icon: <Zap size={28} />,
    color: "text-amber-600 bg-amber-50",
    border: "border-amber-200",
  },
  {
    value: "quantities",
    label: "كميات",
    icon: <Package size={28} />,
    color: "text-green-600 bg-green-50",
    border: "border-green-200",
  },
  {
    value: "external_api",
    label: "شحن فوري (API خارجي)",
    icon: <ExternalLink size={28} />,
    color: "text-red-600 bg-red-50",
    border: "border-red-200",
  },
  {
    value: "inventory",
    label: "متجر يعتمد على المخزون",
    icon: <Package size={28} />,
    color: "text-amber-600 bg-amber-50",
    border: "border-amber-200",
  },
  {
    value: "gallery",
    label: "متجر الصور",
    icon: <ImageIcon size={28} />,
    color: "text-pink-600 bg-pink-50",
    border: "border-pink-200",
  },
  {
    value: "packages",
    label: "متجر الباقات",
    icon: <Layers size={28} />,
    color: "text-indigo-600 bg-indigo-50",
    border: "border-indigo-200",
  },
];

export const StoreTypePickerField = ({ value, onChange }: { value: string; onChange: (val: string) => void }) => {
  const [open, setOpen] = useState(false);
  const selected = STORE_TYPE_OPTIONS.find(o => o.value === value);

  return (
    <div>
      <label className="text-xs text-gray-500 mb-1 block">نوع المتجر</label>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full p-3 bg-gray-50 rounded-lg text-sm text-right flex items-center justify-between border border-gray-200 hover:bg-gray-100 transition-colors"
      >
        <span className={selected ? "text-gray-800 font-medium flex items-center gap-2" : "text-gray-400"}>
          {selected ? (
            <>
              <span className={`inline-flex items-center justify-center w-6 h-6 rounded ${selected.color}`}>
                {React.cloneElement(selected.icon, { size: 14 })}
              </span>
              {selected.label}
            </>
          ) : "اختر نوع المتجر"}
        </span>
        <ChevronDown size={16} className="text-gray-400" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center"
            style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
              onClick={e => e.stopPropagation()}
              dir="rtl"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h4 className="font-bold text-gray-800 text-base flex items-center gap-2">
                  <Store size={18} className="text-[var(--brand)]" />
                  اختر نوع المتجر
                </h4>
                <button
                  onClick={() => setOpen(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                >✕</button>
              </div>

              {/* Grid */}
              <div className="p-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {STORE_TYPE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { onChange(opt.value); setOpen(false); }}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all active:scale-95 ${
                        value === opt.value
                          ? `${opt.border} ${opt.color.replace("bg-", "bg-").replace("text-", "ring-0 text-")} shadow-sm`
                          : "border-gray-100 bg-gray-50 hover:border-gray-300 text-gray-500"
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${value === opt.value ? opt.color : "bg-white text-gray-400 border border-gray-100"}`}>
                        {opt.icon}
                      </div>
                      <span className={`text-xs font-bold text-center leading-tight ${value === opt.value ? "text-gray-800" : "text-gray-500"}`}>
                        {opt.label}
                      </span>
                      {value === opt.value && (
                        <span className="text-[10px] font-black text-[var(--brand)]">✓ محدد</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
