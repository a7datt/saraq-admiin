import React from "react";

/**
 * مكون صورة محسّن لتسريع التحميل:
 * - يمرر الصورة عبر خدمة images.weserv.nl لإعادة ضغطها وتصغيرها
 *   حسب حجم العرض الفعلي على الشاشة (بدل تحميل الصورة بحجمها الأصلي الكامل).
 * - يدعم lazy loading + decoding async بشكل تلقائي.
 * - في حال فشل خدمة الضغط (أو رابط محلي / data: / svg) يتم استخدام الرابط الأصلي تلقائياً كـ fallback.
 */

export interface OptimizedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "loading"> {
  src?: string | null;
  /** العرض المستهدف بالبكسل (يُستخدم لتحديد جودة/حجم الضغط) */
  width?: number;
  /** الارتفاع المستهدف بالبكسل */
  height?: number;
  /** جودة الصورة الناتجة 1-100 (افتراضي 75) */
  quality?: number;
  /** تعطيل التحميل الكسول (lazy) عند الحاجة لعرض فوري */
  eager?: boolean;
}

const shouldSkipOptimization = (url: string) => {
  return (
    url.startsWith("data:") ||
    url.startsWith("blob:") ||
    url.endsWith(".svg") ||
    url.includes("weserv.nl") ||
    // [FIX] صور حسابات Google (avatar عبر تسجيل الدخول بـ Google) غالباً ما ترفضها
    // خدمة weserv.nl بـ 404 (Google تمنع الجلب من طرف ثالث بلا referrer صحيح)، فنعرض
    // الرابط الأصلي مباشرة بدل المرور بالخدمة والانتظار للفشل أولاً.
    url.includes("googleusercontent.com")
  );
};

// [FIX] كانت بعض السجلات القديمة في قاعدة البيانات تحتوي على قيمة avatar_url غير صالحة
// (مثلاً حرف عربي مفرد بدل رابط فعلي)، وكان الكود يمرر أي نص غير فارغ مباشرة لخدمة weserv
// دون تحقق، فيُطلب رابط مثل https://images.weserv.nl/?url=ا وهو يفشل دائماً بـ 404 ويطبع
// أخطاء بلا فائدة بالكونسول. الآن نتحقق أن الرابط يبدأ فعلاً بـ http(s):// أو / قبل المتابعة.
const isLikelyUrl = (url: string) => /^https?:\/\/[^\s]+\.[^\s]+/i.test(url) || url.startsWith("/");

export const getOptimizedSrc = (
  url?: string | null,
  width: number = 400,
  height?: number,
  quality: number = 75
): string => {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed || !isLikelyUrl(trimmed)) return "";
  if (shouldSkipOptimization(trimmed)) return trimmed;

  try {
    // إزالة البروتوكول لأن weserv يتطلب رابطاً بدون http(s)://
    const cleanUrl = trimmed.replace(/^https?:\/\//, "");
    const params = new URLSearchParams();
    params.set("url", cleanUrl);
    params.set("w", String(Math.round(width)));
    if (height) params.set("h", String(Math.round(height)));
    params.set("q", String(quality));
    params.set("fit", "cover");
    params.set("output", "webp");
    params.set("we", ""); // without enlargement خارج هذا السياق - يحافظ على جودة جيدة
    return `https://images.weserv.nl/?${params.toString()}`;
  } catch {
    return trimmed;
  }
};

const OptimizedImage = React.forwardRef<HTMLImageElement, OptimizedImageProps>(
  ({ src, width = 400, height, quality = 75, eager = false, className, alt = "", referrerPolicy, onError, ...rest }, ref) => {
    const [failed, setFailed] = React.useState(false);
    const [loaded, setLoaded] = React.useState(false);
    React.useEffect(() => { setFailed(false); setLoaded(false); }, [src]);
    const optimizedSrc = React.useMemo(() => getOptimizedSrc(src, width, height, quality), [src, width, height, quality]);
    const trimmedSrc = (src || "").trim();
    const finalSrc = failed || !optimizedSrc ? trimmedSrc : optimizedSrc;

    // [FIX] لا تُعرض وسم <img> أصلاً إن لم يكن هناك أي رابط قابل للاستخدام (لا محسَّن ولا أصلي)،
    // بدل محاولة تحميل رابط فاسد (مثل نص غير-URL) وإصدار 404 بلا داعٍ.
    if (!trimmedSrc) return null;

    // [FIX] كانت الغلاف <span> يحمل w-full h-full inline-block بلا flex-shrink-0 ولا حجم
    // مضبوط من الأب، فيتحدد حجمه أحياناً بحسب الحجم الطبيعي للصورة الأصلية (خصوصاً صورة
    // "موحدة" كبيرة مرفوعة حديثاً) قبل أن يتقيّد بأبعاد w-8/h-8 الممرَّرة إلى <img> فقط —
    // ما يجعل صف المنتج بالكامل يتضخّم وتختفي التفاصيل المجاورة بصرياً على الموبايل.
    // الحل: نمرّر كل صنوف الحجم (w-*, h-*, flex-shrink-0..) إلى الغلاف نفسه أيضاً، ونجعل
    // <img> يملأ الغلاف بشكل مطلق (absolute inset-0) بدل أن يفرض حجمه الطبيعي على التخطيط.
    return (
      <span className={`relative inline-block overflow-hidden flex-shrink-0 ${className || ""}`}>
        {!loaded && (
          <span className="absolute inset-0 animate-pulse bg-gray-200 rounded-[inherit]" aria-hidden="true" />
        )}
        <img
          ref={ref}
          src={finalSrc}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy={referrerPolicy ?? "no-referrer"}
          className={`absolute inset-0 w-full h-full ${className || ""} ${loaded ? "opacity-100" : "opacity-0"} transition-opacity duration-300`}
          onLoad={() => setLoaded(true)}
          onError={(e) => {
            if (!failed) {
              setFailed(true);
            }
            setLoaded(true);
            onError?.(e);
          }}
          {...rest}
        />
      </span>
    );
  }
);

OptimizedImage.displayName = "OptimizedImage";

export default OptimizedImage;
