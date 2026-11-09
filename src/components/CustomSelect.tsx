/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";

export interface CustomSelectOption {
  value: string;
  label: React.ReactNode;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  className?: string;
  buttonClassName?: string;
  placeholder?: string;
  disabled?: boolean;
  /** يفعّل حقل بحث/فلترة داخل القائمة المنسدلة — مفيد للقوائم الطويلة (مثل ألعاب Volsever). */
  searchable?: boolean;
  searchPlaceholder?: string;
  /**
   * افتراضياً: الاسم المختار وأسماء الخيارات تُقطع بثلاث نقاط (truncate) إن طالت.
   * عطّلها (false) عندما يكون عرض الاسم الكامل أهم من ثبات عرض الزر (مثل أسماء فئات طويلة).
   */
  truncate?: boolean;
  /** الحد الأقصى لارتفاع القائمة المنسدلة بالبيكسل (افتراضياً 288 = max-h-72 السابقة). */
  maxMenuHeight?: number;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  className = "",
  buttonClassName = "",
  placeholder = "اختر",
  disabled = false,
  searchable = false,
  searchPlaceholder = "بحث...",
  truncate = true,
  maxMenuHeight = 288,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // [FIX] القائمة كانت تُرسَم داخل حاوية أب لديها overflow-hidden (مثل لوحات
  // الطي/الأقسام القابلة للإغلاق)، فتُقص بصرياً ولا تظهر كاملة فوق بقية العناصر.
  // الحل: رسمها عبر Portal إلى document.body بموضع ثابت (fixed) محسوب من مكان
  // الزر فعلياً، فتهرب من أي قص ناتج عن overflow-hidden في أي عنصر أب وتظهر
  // طبيعياً فوق كل شيء — تماماً كقائمة منسدلة عادية.
  const updateMenuPos = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMenuPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }, []);

  useLayoutEffect(() => {
    if (open) updateMenuPos();
  }, [open, updateMenuPos]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const handleReposition = () => updateMenuPos();
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [open, updateMenuPos]);

  useEffect(() => {
    if (open && searchable) {
      setQuery("");
      setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [open, searchable]);

  const selected = options.find((o) => o.value === value);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = !searchable || !normalizedQuery
    ? options
    : options.filter((o) => {
        const labelText = typeof o.label === "string" ? o.label : String(o.value);
        return labelText.toLowerCase().includes(normalizedQuery) || String(o.value).toLowerCase().includes(normalizedQuery);
      });

  const labelClass = truncate ? "truncate" : "whitespace-normal break-words";

  return (
    <div ref={triggerRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-1 p-2 bg-gray-50 rounded-lg text-[11px] outline-none border border-gray-100 disabled:opacity-50 disabled:cursor-not-allowed ${buttonClassName}`}
      >
        <span className={`text-right ${labelClass}`}>{selected ? selected.label : placeholder}</span>
        <ChevronDown size={14} className={`shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && menuPos && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[200] overflow-hidden flex flex-col bg-white rounded-lg border border-gray-100 shadow-xl py-1"
          style={{ top: menuPos.top, left: menuPos.left, width: Math.max(menuPos.width, 200), maxHeight: maxMenuHeight }}
          dir="rtl"
        >
          {searchable && (
            <div className="px-2 pb-1.5 pt-0.5 sticky top-0 bg-white border-b border-gray-100 mb-1">
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder={searchPlaceholder}
                className="w-full px-2.5 py-1.5 text-[11px] rounded-md border border-gray-200 outline-none focus:border-brand bg-gray-50"
                dir="rtl"
              />
            </div>
          )}
          <div className="overflow-y-auto">
            {filteredOptions.map((opt) => (
              <button
                type="button"
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-[11px] text-right hover:bg-gray-50 ${
                  opt.value === value ? "text-brand font-bold" : "text-gray-700"
                }`}
              >
                <span className={labelClass}>{opt.label}</span>
                {opt.value === value && <Check size={13} className="shrink-0 text-brand" />}
              </button>
            ))}
            {filteredOptions.length === 0 && (
              <div className="px-3 py-2 text-[11px] text-gray-400 text-center">لا توجد نتائج مطابقة</div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default CustomSelect;
