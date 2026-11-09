/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import CountryCodePhoneInput, { MIN_PHONE_DIGITS } from "./CountryCodePhoneInput";

export interface GooglePhoneGatePending {
  googleTempToken: string;
  name?: string;
  avatarUrl?: string | null;
}

interface GooglePhoneGateModalProps {
  pending: GooglePhoneGatePending;
  onSuccess: (data: any) => void;
  onCancel: () => void;
}

/**
 * مودال إجباري يظهر بعد نجاح المصادقة مع Google مباشرة وقبل دخول المستخدم
 * إلى الواجهة، في حال كان الحساب (جديداً أو موجوداً مسبقاً) بلا رقم هاتف.
 * لا يمكن تجاوزه دون تعبئة رمز الدولة ورقم هاتف صحيح (9 أرقام على الأقل).
 */
const GooglePhoneGateModal: React.FC<GooglePhoneGateModalProps> = ({ pending, onSuccess, onCancel }) => {
  const [countryCode, setCountryCode] = useState("+963");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const digitsOnly = phone.replace(/\D/g, "");
  const isValid = digitsOnly.length >= MIN_PHONE_DIGITS;

  const handleSubmit = async () => {
    setError("");
    if (!isValid) {
      setError(`رقم الهاتف يجب ألا يقل عن ${MIN_PHONE_DIGITS} أرقام`);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          googleTempToken: pending.googleTempToken,
          countryCode,
          phone: digitsOnly,
        }),
      });
      const data = await res.json();
      if (res.ok && !data.requiresPhone) {
        onSuccess(data);
      } else {
        setError(data.error || "تعذّر حفظ رقم الهاتف، حاول مجدداً");
      }
    } catch {
      setError("فشل الاتصال بالخادم، تحقق من اتصالك بالإنترنت");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-5">
      <div
        className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-brand/20 p-6 relative"
        dir="rtl"
      >
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-brand/10 flex items-center justify-center">
          <ShieldCheck size={26} className="text-brand" />
        </div>

        <h2 className="text-center text-base font-extrabold text-gray-800 dark:text-white mb-1">
          خطوة أخيرة قبل الدخول
        </h2>
        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
          {pending.name ? `أهلاً ${pending.name}، ` : ""}
          رقم الهاتف مطلوب لإكمال تسجيل الدخول عبر Google. الرجاء اختيار رمز الدولة وإدخال رقم هاتفك.
        </p>

        <div className="mb-3">
          <CountryCodePhoneInput
            countryCode={countryCode}
            onCountryCodeChange={setCountryCode}
            phone={phone}
            onPhoneChange={setPhone}
            disabled={loading}
          />
        </div>

        {error && (
          <p className="text-xs text-red-500 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2 mb-3 text-center">
            {error}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !isValid}
          className="w-full bg-brand text-white rounded-xl py-3 text-sm font-bold active:scale-[0.98] transition-transform disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
          {loading ? "جاري الحفظ..." : "متابعة"}
        </button>

        <button
          onClick={onCancel}
          disabled={loading}
          className="w-full mt-2 py-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          إلغاء وتسجيل الخروج
        </button>
      </div>
    </div>
  );
};

export default GooglePhoneGateModal;
