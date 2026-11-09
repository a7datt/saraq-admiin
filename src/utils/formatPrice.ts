// دالة تنسيق موحّدة للأسعار في كامل المشروع.
// تعرض القيمة دائمًا بثلاث خانات عشرية بدون أي تقريب يفقد الدقة.
export function formatPrice(value: number | string | null | undefined, decimals = 3): string {
  const num = typeof value === "number" ? value : parseFloat(String(value ?? 0));
  const safe = isNaN(num) ? 0 : num;
  return safe.toFixed(decimals);
}

// نسخة تُرجع النص مع رمز الدولار (للاستخدام المباشر في الواجهة)
export function formatPriceUSD(value: number | string | null | undefined, decimals = 3): string {
  return `${formatPrice(value, decimals)} $`;
}
