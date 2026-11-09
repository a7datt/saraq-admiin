/**
 * uploadImage — ضغط الصورة في المتصفح ثم رفعها إلى ImgBB
 *
 * سبب البطء الأصلي: كانت الصور تُرفع بحجمها الخام (قد يصل لعدة ميجابايت من كاميرا الموبايل)
 * مباشرة إلى ImgBB. هذه الدالة تضغط/تصغّر الصورة أولاً عبر canvas، فينخفض الحجم عادة
 * من عدة ميجابايت إلى عشرات الكيلوبايتات فقط، ما يجعل الرفع أسرع بشكل ملحوظ خصوصاً
 * على شبكات الموبايل. تُستخدم بنفس الطريقة في كل مكان بالمشروع (أدمن، مستخدم، شات..).
 */

const MAX_DIMENSION = 1600; // أقصى عرض/طول بعد الضغط، يكفي لأي استخدام (منتج، شات، إيصال، أفاتار)
const QUALITY = 0.82;

// [SECURITY FIX] حد أقصى لحجم الملف الأصلي قبل الضغط، وقائمة أنواع MIME مسموحة —
// يمنع محاولة رفع ملفات ضخمة جداً (استنزاف موارد المتصفح أثناء الضغط عبر canvas) أو ملفات
// ليست صوراً إطلاقاً (النوع المُعلَن client.type على الأقل) قبل إهدار وقت/بيانات في الرفع.
const MAX_UPLOAD_SIZE_BYTES = 15 * 1024 * 1024; // 15MB كحد أقصى للملف الأصلي (قبل الضغط)
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp", "image/avif",
]);

// [SECURITY FIX] أُزيل مفتاح ImgBB الذي كان مكتوباً صراحة كقيمة احتياطية (مفتاح حقيقي
// مكشوف علناً ضمن كود الواجهة الأمامية). يجب ضبط VITE_IMGBB_API_KEY في .env عند البناء.
function getImgbbKey(): string {
  const key = (import.meta as any).env?.VITE_IMGBB_API_KEY;
  if (!key) {
    throw new Error("VITE_IMGBB_API_KEY غير مضبوط — لا يمكن رفع الصورة. أضف المتغير في ملف .env.");
  }
  return key;
}

/**
 * يضغط/يصغّر ملف صورة عبر canvas ويعيده كـ Blob بصيغة JPEG.
 * إذا فشل الضغط لأي سبب، أو كانت الصورة GIF (حتى لا تُفقد الحركة)، يعيد الملف الأصلي كما هو.
 */
async function compressImage(file: File): Promise<Blob> {
  if (file.type === "image/gif") return file;

  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;

    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      if (width > height) {
        height = Math.round((height * MAX_DIMENSION) / width);
        width = MAX_DIMENSION;
      } else {
        width = Math.round((width * MAX_DIMENSION) / height);
        height = MAX_DIMENSION;
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY)
    );

    // إذا الضغط ما نقص الحجم فعلياً (نادراً)، نرجع الأصلي
    if (!blob || blob.size >= file.size) return file;
    return blob;
  } catch {
    // أي خطأ (صيغة غير مدعومة، متصفح قديم..) → نرفع الملف الأصلي بدون ضغط
    return file;
  }
}

/**
 * يضغط الصورة ثم يرفعها إلى ImgBB، ويعيد رابط الصورة النهائي.
 * تُستخدم بنفس الشكل بغض النظر عن مكان الاستخدام (أدمن/مستخدم/شات/إلخ).
 */
export async function uploadImage(file: File): Promise<string> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("نوع الملف غير مدعوم — يُسمح فقط بالصور (JPEG, PNG, WEBP, GIF, BMP, AVIF)");
  }
  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    throw new Error(`حجم الملف كبير جداً (الحد الأقصى ${MAX_UPLOAD_SIZE_BYTES / (1024 * 1024)}MB)`);
  }

  const compressed = await compressImage(file);

  const formData = new FormData();
  formData.append("image", compressed, file.name);

  const imgbbKey = getImgbbKey();
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  if (data.success) {
    return data.data.url as string;
  }
  throw new Error(data.error?.message || "فشل رفع الصورة");
}
