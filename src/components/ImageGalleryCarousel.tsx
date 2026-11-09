import React, { useEffect, useRef, useState } from "react";
import OptimizedImage from "./OptimizedImage";

export interface ImageGalleryCarouselProps {
  images: string[];
  alt?: string;
  /** مدة عرض كل صورة بالميلي ثانية قبل الانتقال للتالية */
  intervalMs?: number;
  className?: string;
}

// أقل مسافة سحب (بالبكسل) لاعتبارها "تمرير" فعلي بدل نقرة عادية
const SWIPE_THRESHOLD = 40;

/**
 * سلايدر صور يعمل تلقائياً (autoplay) بحلقة لا نهائية (loop) مع عداد
 * يوضح رقم الصورة الحالية من الإجمالي — مصمم لعرض صور "متجر الصور"
 * (مثل حسابات فري فاير) بحجم كبير وواضح بنسبة أبعاد 1:1.
 *
 * يدعم أيضاً التحكم اليدوي: بمجرد أن يضع المستخدم إصبعه/مؤشره على الصورة
 * تتوقف الحركة التلقائية، وبالسحب يمين/يسار ينتقل للصورة السابقة/التالية،
 * وعند رفع الإصبع تُستأنف الحركة التلقائية من جديد.
 */
const ImageGalleryCarousel: React.FC<ImageGalleryCarouselProps> = ({
  images,
  alt = "",
  intervalMs = 3000,
  className = "",
}) => {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dragState = useRef<{ startX: number; dragging: boolean } | null>(null);
  const validImages = (images || []).filter(Boolean);

  useEffect(() => {
    if (validImages.length <= 1 || isPaused) return;
    timerRef.current = setInterval(() => {
      setIndex(prev => (prev + 1) % validImages.length);
    }, intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [validImages.length, intervalMs, isPaused]);

  const goTo = (i: number) => {
    if (validImages.length === 0) return;
    setIndex(((i % validImages.length) + validImages.length) % validImages.length);
  };

  const handlePointerDown = (clientX: number) => {
    if (validImages.length <= 1) return;
    dragState.current = { startX: clientX, dragging: true };
    setIsPaused(true);
  };

  const handlePointerMove = (clientX: number) => {
    if (!dragState.current?.dragging) return;
    setDragOffset(clientX - dragState.current.startX);
  };

  const handlePointerUp = () => {
    if (!dragState.current?.dragging) {
      setIsPaused(false);
      return;
    }
    const delta = dragOffset;
    if (delta <= -SWIPE_THRESHOLD) {
      // سحب لليسار → الصورة التالية
      goTo(index + 1);
    } else if (delta >= SWIPE_THRESHOLD) {
      // سحب لليمين → الصورة السابقة
      goTo(index - 1);
    }
    dragState.current = null;
    setDragOffset(0);
    setIsPaused(false);
  };

  if (validImages.length === 0) {
    return (
      <div className={`w-full aspect-square bg-gray-100 rounded-xl flex items-center justify-center ${className}`}>
        <span className="text-gray-300 text-sm">لا توجد صورة</span>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full aspect-square rounded-xl overflow-hidden bg-gray-100 select-none touch-pan-y ${className}`}
      onMouseDown={e => handlePointerDown(e.clientX)}
      onMouseMove={e => handlePointerMove(e.clientX)}
      onMouseUp={handlePointerUp}
      onMouseLeave={() => { if (dragState.current?.dragging) handlePointerUp(); }}
      onTouchStart={e => handlePointerDown(e.touches[0].clientX)}
      onTouchMove={e => handlePointerMove(e.touches[0].clientX)}
      onTouchEnd={handlePointerUp}
    >
      {validImages.map((src, i) => {
        const isActive = i === index;
        const offset = isActive ? dragOffset : 0;
        return (
          <div
            key={i}
            className={`absolute inset-0 ${dragState.current?.dragging ? "" : "transition-all duration-700 ease-in-out"}`}
            style={{
              opacity: isActive ? 1 : 0,
              pointerEvents: isActive ? "auto" : "none",
              transform: `translateX(${offset}px)`,
            }}
          >
            <OptimizedImage
              src={src}
              width={800}
              height={800}
              alt={alt}
              eager={i === 0}
              className="w-full h-full object-cover pointer-events-none"
              draggable={false}
            />
          </div>
        );
      })}

      {validImages.length > 1 && (
        <div className="absolute bottom-3 left-3 bg-black/60 text-white text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
          {index + 1}/{validImages.length}
        </div>
      )}

      {validImages.length > 1 && (
        <div className="absolute bottom-3 right-3 flex gap-1.5">
          {validImages.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`صورة ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-white" : "w-1.5 bg-white/50"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageGalleryCarousel;
