import React from "react";
import { Hash, Type, AtSign } from "lucide-react";

/**
 * محدّد نوع لوحة المفاتيح لكل خانة إدخال مخصّصة (أرقام / حروف / رموز)
 * يُستخدم داخل الحقول المخصصة لأي نوع منتج (يدوي أو API)
 */

export type FieldKeyboardType = "numbers" | "letters" | "symbols";

const OPTIONS: { value: FieldKeyboardType; label: string; icon: React.ElementType }[] = [
  { value: "numbers", label: "أرقام", icon: Hash },
  { value: "letters", label: "حروف", icon: Type },
  { value: "symbols", label: "رموز", icon: AtSign },
];

interface Props {
  value?: FieldKeyboardType[];
  onChange: (val: FieldKeyboardType[]) => void;
}

export default function FieldKeyboardTypePicker({ value, onChange }: Props) {
  // افتراضياً كل الأنواع مختارة (أرقام + حروف + رموز) ما لم يُحدَّد غير ذلك صراحة
  const selected = value ?? (["numbers", "letters", "symbols"] as FieldKeyboardType[]);
  const toggle = (v: FieldKeyboardType) => {
    if (selected.includes(v)) onChange(selected.filter((x) => x !== v));
    else onChange([...selected, v]);
  };

  return (
    <div className="flex items-center gap-1.5 mt-1.5">
      <span className="text-[10px] text-gray-400 shrink-0">لوحة المفاتيح:</span>
      <div className="flex gap-1">
        {OPTIONS.map((opt) => {
          const active = selected.includes(opt.value);
          const Icon = opt.icon;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold border transition-colors ${
                active
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
              }`}
            >
              <Icon size={11} /> {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
