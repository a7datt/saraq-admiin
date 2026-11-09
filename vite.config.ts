import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      // [SECURITY FIX] أُزيل ربط 'process.env.GEMINI_API_KEY' — كان يخبز مفتاح Gemini API مباشرة
      // داخل حزمة JavaScript العامة المُرسَلة للمتصفح (مفتاح سري مكشوف علناً لأي زائر يقرأ كود
      // الواجهة الأمامية المُجمَّع)، رغم عدم استخدام المفتاح فعلياً في أي مكان بالواجهة الأمامية
      // (@google/genai غير مُستدعى إطلاقاً في src/). أي استدعاء لـ Gemini يجب أن يتم من الخادم
      // فقط (server.ts) عبر متغير بيئة خادمي عادي، وليس عبر "define" في Vite الذي يُقحم القيمة
      // حرفياً في الكود العام وقت البناء.
      'import.meta.env.VITE_IMGBB_API_KEY': JSON.stringify(env.VITE_IMGBB_API_KEY || env.IMGBB_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
