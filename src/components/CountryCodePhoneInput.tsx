/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Phone } from "lucide-react";

// قائمة رموز الدول الأكثر استخداماً (سوريا افتراضياً + دول عربية شائعة)
export const COUNTRY_CODES = [
  { code: "+963", label: "سوريا" },
  { code: "+966", label: "السعودية" },
  { code: "+971", label: "الإمارات" },
  { code: "+20",  label: "مصر" },
  { code: "+962", label: "الأردن" },
  { code: "+961", label: "لبنان" },
  { code: "+964", label: "العراق" },
  { code: "+974", label: "قطر" },
  { code: "+965", label: "الكويت" },
  { code: "+968", label: "عُمان" },
  { code: "+973", label: "البحرين" },
  { code: "+90",  label: "تركيا" },
  { code: "+49",  label: "ألمانيا" },
  { code: "+1",   label: "أمريكا/كندا" },
];

// الحد الأدنى لعدد أرقام رقم الهاتف (بدون رمز الدولة)
export const MIN_PHONE_DIGITS = 9;

/**
 * يفصل رقم هاتف مخزَّن مسبقاً (قد يحتوي على رمز دولة أو لا) إلى
 * { countryCode, digits } لتعبئة الحقلين عند فتح نموذج التعديل.
 */
export function splitStoredPhone(stored: string | null | undefined): { countryCode: string; digits: string } {
  const raw = (stored || "").trim();
  if (!raw) return { countryCode: "+963", digits: "" };
  const match = COUNTRY_CODES
    .filter((c) => raw.startsWith(c.code))
    .sort((a, b) => b.code.length - a.code.length)[0];
  if (match) {
    return { countryCode: match.code, digits: raw.slice(match.code.length).replace(/\D/g, "") };
  }
  return { countryCode: "+963", digits: raw.replace(/\D/g, "") };
}

interface CountryCodePhoneInputProps {
  countryCode: string;
  onCountryCodeChange: (code: string) => void;
  phone: string;
  onPhoneChange: (digitsRaw: string) => void;
  disabled?: boolean;
  showCounter?: boolean;
}

const CountryCodePhoneInput: React.FC<CountryCodePhoneInputProps> = ({
  countryCode, onCountryCodeChange, phone, onPhoneChange, disabled, showCounter = true,
}) => {
  const digitsOnly = phone.replace(/\D/g, "");
  const isValid = digitsOnly.length >= MIN_PHONE_DIGITS;

  return (
    <div>
      <div className="flex gap-2">
        <select
          value={countryCode}
          onChange={(e) => onCountryCodeChange(e.target.value)}
          disabled={disabled}
          className="w-28 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-2 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-light/40 shadow-sm"
        >
          {COUNTRY_CODES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} {c.label}
            </option>
          ))}
        </select>

        <div className="relative flex-1">
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none">
            <Phone size={18} />
          </span>
          <input
            type="tel"
            inputMode="numeric"
            placeholder={`رقم الهاتف (${MIN_PHONE_DIGITS} أرقام على الأقل)`}
            value={phone}
            onChange={(e) => {
              const v = e.target.value;
              if (/^[\d\s\-]{0,20}$/.test(v)) onPhoneChange(v);
            }}
            disabled={disabled}
            className="w-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl pr-12 pl-4 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-light/40 shadow-sm"
          />
        </div>
      </div>

      {showCounter && phone.length > 0 && (
        <p className={`text-[11px] mt-1.5 px-1 ${isValid ? "text-green-600" : "text-gray-400"}`}>
          {digitsOnly.length} / {MIN_PHONE_DIGITS} أرقام على الأقل
        </p>
      )}
    </div>
  );
};

export default CountryCodePhoneInput;
