/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from "react";
import { Copy, Check } from "lucide-react";

function CodeBlock({ code, lang = "" }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <div className="relative group rounded-lg overflow-hidden border border-gray-200 bg-[#0d1117] my-3" dir="ltr">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#161b22] border-b border-gray-800">
        <span className="text-[11px] text-gray-400 font-mono">{lang || "text"}</span>
        <button
          onClick={onCopy}
          className="flex items-center gap-1 text-[11px] text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 px-2 py-1 rounded transition-colors"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          <span dir="rtl">{copied ? "تم النسخ" : "نسخ"}</span>
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-[12.5px] leading-relaxed font-mono text-gray-200">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 mb-10">
      <h2 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">{title}</h2>
      <div className="text-sm text-gray-700 leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

const NAV = [
  { id: "base", label: "الرابط الأساسي" },
  { id: "auth", label: "المصادقة" },
  { id: "endpoints", label: "نقاط الاتصال" },
  { id: "profile", label: "١) البيانات الشخصية والرصيد" },
  { id: "products", label: "٢) المنتجات" },
  { id: "content", label: "٣) المحتوى" },
  { id: "neworder", label: "٤) إنشاء طلب" },
  { id: "check", label: "٥) الاستعلام عن الطلبات" },
  { id: "errors", label: "رموز الأخطاء" },
  { id: "curl", label: "أمثلة cURL" },
  { id: "snippets", label: "أمثلة تكامل سريعة" },
];

export default function ApiDocsPage() {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const siteOrigin = typeof window !== "undefined" ? window.location.origin : "https://yourdomain.com";
  const apiBaseUrl = `${siteOrigin}/client/api`;

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="bg-brand-light/20 border-b border-brand/20 px-4 py-3">
        <p className="text-xs md:text-sm text-gray-800 max-w-5xl mx-auto leading-relaxed">
          يُرجى نسخ رابط هذه الصفحة <code className="font-mono bg-white px-1.5 py-0.5 rounded text-brand" dir="ltr">/api-docs/</code> وتسليمه إلى المبرمج المسؤول عن الربط،
          إضافةً إلى رابط نقطة الاتصال الرئيسية <code className="font-mono bg-white px-1.5 py-0.5 rounded text-brand" dir="ltr">/client/api/</code>،
          مع عدم نسيان مشاركة <span className="font-bold">مفتاح الـ API (API TOKEN)</span> الظاهر في صفحة "الـ API" الخاصة بحسابك عند الحاجة.
        </p>
      </div>

      <header className="border-b border-gray-200 bg-white px-4 py-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-extrabold text-gray-900" dir="ltr">API</h1>
          <p className="text-sm text-gray-500 mt-1">توثيق واجهة برمجة التطبيقات (API) القائمة على مفتاح وصول، الخاصة بالمنتجات والطلبات.</p>
        </div>
      </header>

      <div className="max-w-5xl mx-auto flex gap-8 px-4 py-8">
        <aside className="hidden md:block w-56 shrink-0">
          <nav className="sticky top-6 space-y-1">
            {NAV.map(item => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className="block w-full text-right text-[13px] text-gray-600 hover:text-brand hover:bg-brand-light/10 px-3 py-2 rounded-md transition-colors"
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 min-w-0">
          <Section id="base" title="الرابط الأساسي (Base URL)">
            <p>جميع نقاط الاتصال المذكورة أدناه هي مسارات نسبية إلى الرابط الأساسي التالي:</p>
            <CodeBlock code={apiBaseUrl} lang="text" />
          </Section>

          <Section id="auth" title="المصادقة (Authentication)">
            <p>يجب إرسال الترويسة (Header) التالية مع كل طلب دون استثناء:</p>
            <CodeBlock code={`api-token: YOUR_API_TOKEN`} lang="http" />
            <p>
              يمكنك الحصول على مفتاحك الخاص من صفحة "الـ API" داخل حسابك. في حال كان المفتاح مفقوداً أو غير صحيح
              أو معطّلاً، أو كان الطلب صادراً من عنوان IP غير مدرج ضمن "قائمة السماح"، سيُرفض الطلب ويُعاد أحد رموز الحالة
              <code className="font-mono bg-gray-100 px-1 rounded mx-1" dir="ltr">401</code> أو
              <code className="font-mono bg-gray-100 px-1 rounded mx-1" dir="ltr">403</code>، مع رسالة توضيحية ورمز خطأ مفصّل (راجع جدول رموز الأخطاء).
            </p>
          </Section>

          <Section id="endpoints" title="نقاط الاتصال (Endpoints)">
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm border border-gray-200 rounded-lg overflow-hidden" dir="ltr">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold">الطريقة</th>
                    <th className="px-3 py-2 text-left font-bold">المسار</th>
                    <th className="px-3 py-2 text-left font-bold" dir="rtl">الوصف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="px-3 py-2 font-mono text-brand">GET</td>
                    <td className="px-3 py-2 font-mono">/profile</td>
                    <td className="px-3 py-2" dir="rtl">جلب البريد الإلكتروني ورصيد المحفظة الخاصين بمالك المفتاح.</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono text-brand">GET</td>
                    <td className="px-3 py-2 font-mono">/products</td>
                    <td className="px-3 py-2" dir="rtl">عرض قائمة المنتجات المتاحة عبر الـ API (تدعم عوامل تصفية).</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono text-brand">GET</td>
                    <td className="px-3 py-2 font-mono">/content/{"{categoryId}"}</td>
                    <td className="px-3 py-2" dir="rtl">جلب قسم معيّن ومنتجاته دفعة واحدة.</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono text-brand">POST و GET</td>
                    <td className="px-3 py-2 font-mono">/newOrder/{"{productId}"} أو /newOrder/{"{productId}"}/params</td>
                    <td className="px-3 py-2" dir="rtl">إنشاء طلب جديد (متكرر الأمان idempotent عبر order_uuid).</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono text-brand">GET</td>
                    <td className="px-3 py-2 font-mono">/check?orders=[...]&amp;uuid=1</td>
                    <td className="px-3 py-2" dir="rtl">الاستعلام عن حالة طلب أو أكثر عبر المعرّف الرقمي أو الـ UUID.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Section>

          <Section id="profile" title="١) البيانات الشخصية والرصيد">
            <CodeBlock code={`GET /client/api/profile`} lang="http" />
            <p>مثال على الاستجابة:</p>
            <CodeBlock
              lang="json"
              code={`{
  "status": "OK",
  "balance": "8788.683",
  "email": "email@gmail.com"
}`}
            />
            <p>يُعيد هذا الطلب البريد الإلكتروني ورصيد المحفظة الحاليين للمستخدم صاحب المفتاح، وهو مفيد للتحقق من كفاية الرصيد قبل إنشاء الطلبات.</p>
          </Section>

          <Section id="products" title="٢) المنتجات">
            <CodeBlock code={`GET /client/api/products`} lang="http" />
            <p>عوامل التصفية المتاحة (اختيارية):</p>
            <CodeBlock code={`?products_id=1,2,3\n?base=1`} lang="text" />
            <p>
              استخدم <code className="font-mono bg-gray-100 px-1 rounded" dir="ltr">products_id</code> لجلب منتجات محددة عبر معرّفاتها مفصولة بفاصلة،
              واستخدم <code className="font-mono bg-gray-100 px-1 rounded" dir="ltr">base=1</code> لجلب بيانات مختصرة (المعرّف والاسم فقط) بدلاً من التفاصيل الكاملة.
              يُعاد فقط ما تم تضمينه ضمن نطاق مفتاحك عبر لوحة التحكم (منتجات محددة، أقسام كاملة، أو الكل).
            </p>
            <p>مثال على الاستجابة:</p>
            <CodeBlock
              lang="json"
              code={`{
  "status": "OK",
  "data": [
    {
      "id": 364,
      "name": "اسم المنتج",
      "price": "1.250",
      "params": null,
      "category_name": "اسم القسم",
      "available": true,
      "qty_values": { "min": 1, "max": 100 },
      "product_type": "quantity",
      "parent_id": 12
    }
  ]
}`}
            />
            <p className="text-xs text-gray-500">ملاحظة: السعر المُعاد قد يكون شاملاً لنسبة الخصم العامة أو نسبة الخصم المخصصة لحسابك إن كانت مفعّلة من قِبل الإدارة.</p>
          </Section>

          <Section id="content" title="٣) المحتوى (قسم كامل مع منتجاته)">
            <CodeBlock code={`GET /client/api/content/0`} lang="http" />
            <p>يستخدم لجلب قسم معيّن مع كل منتجاته وأقسامه الفرعية دفعة واحدة، لتقليل عدد الطلبات اللازمة عند بناء متجر متكامل.</p>
            <p>مثال على الاستجابة:</p>
            <CodeBlock
              lang="json"
              code={`{
  "status": "OK",
  "categories": [ ... ],
  "products": [ ... ]
}`}
            />
          </Section>

          <Section id="neworder" title="٤) إنشاء طلب (متكرر الأمان)">
            <CodeBlock code={`POST /client/api/newOrder/{productId}\n(أو /client/api/newOrder/{productId}/params)`} lang="http" />
            <p>
              المعاملات المقبولة: <code className="font-mono bg-gray-100 px-1 rounded" dir="ltr">qty</code> (الكمية)،{" "}
              <code className="font-mono bg-gray-100 px-1 rounded" dir="ltr">playerId</code> (معرّف اللاعب/الحساب إن وُجد)،{" "}
              <code className="font-mono bg-gray-100 px-1 rounded" dir="ltr">order_uuid</code> (معرّف فريد من طرفك لمنع تكرار الطلب)،
              بالإضافة إلى أي معاملات مخصصة إضافية يتطلبها المنتج — تُقبل وتُخزَّن جميعها.
            </p>
            <p>
              استخدام <code className="font-mono bg-gray-100 px-1 rounded" dir="ltr">order_uuid</code> إلزامي عملياً لضمان عدم إنشاء طلبات مكررة
              في حال إعادة إرسال نفس الطلب بسبب انقطاع الشبكة مثلاً؛ إذ سيُعاد نفس الطلب الأصلي دون خصم إضافي من الرصيد عند تكرار نفس القيمة.
            </p>
            <p>مثال على الاستجابة عند النجاح:</p>
            <CodeBlock
              lang="json"
              code={`{
  "status": "OK",
  "data": {
    "order_id": 123456,
    "status": "pending",
    "price": "1.250",
    "data": "...",
    "replay_api": []
  }
}`}
            />
          </Section>

          <Section id="check" title="٥) الاستعلام عن حالة الطلبات">
            <p>عبر المعرّفات الرقمية:</p>
            <CodeBlock code={`GET /client/api/check?orders=[123456,123457]`} lang="http" />
            <p>عبر معرّف الـ UUID:</p>
            <CodeBlock code={`GET /client/api/check?orders=["YOUR_UUID"]&uuid=1`} lang="http" />
            <p>مثال على الاستجابة:</p>
            <CodeBlock
              lang="json"
              code={`{
  "status": "OK",
  "data": [
    {
      "order_id": 123456,
      "quantity": 1,
      "data": "...",
      "created_at": "2026-07-11T12:00:00Z",
      "product_name": "اسم المنتج",
      "price": "1.250",
      "status": "completed",
      "replay_api": []
    }
  ]
}`}
            />
            <p className="text-xs text-gray-500">القيم الممكنة لحقل الحالة: pending (قيد التنفيذ)، completed (مكتمل)، rejected (مرفوض)، وقد تختلف حسب إعدادات المنتج.</p>
          </Section>

          <Section id="errors" title="رموز الأخطاء (Error Codes)">
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm border border-gray-200 rounded-lg overflow-hidden" dir="ltr">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold">الرمز</th>
                    <th className="px-3 py-2 text-left font-bold" dir="rtl">المعنى</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-mono">
                  {[
                    ["120", "مفتاح الـ API مطلوب ولم يُرسَل"],
                    ["121", "خطأ في المفتاح: غير صحيح أو غير موجود"],
                    ["122", "غير مسموح لهذا الحساب باستخدام الـ API (معطّل)"],
                    ["123", "عنوان الـ IP غير مسموح له بالوصول"],
                    ["130", "الموقع تحت الصيانة حالياً"],
                    ["100", "الرصيد غير كافٍ لإتمام الطلب"],
                    ["105", "الكمية المطلوبة غير متوفرة"],
                    ["112", "الكمية أقل من الحد الأدنى المسموح"],
                    ["113", "الكمية أكبر من الحد الأقصى المسموح"],
                    ["114", "معامل غير معروف أو غير صالح"],
                    ["500", "خطأ غير معروف في الخادم"],
                  ].map(([code, msg]) => (
                    <tr key={code}>
                      <td className="px-3 py-2 text-brand">{code}</td>
                      <td className="px-3 py-2 text-gray-700" dir="rtl">{msg}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section id="curl" title="أمثلة cURL">
            <p>جلب قائمة المنتجات:</p>
            <CodeBlock
              lang="bash"
              code={`curl -X GET "${apiBaseUrl}/products" \\
  -H "api-token: YOUR_API_TOKEN"`}
            />
            <p>إنشاء طلب جديد:</p>
            <CodeBlock
              lang="bash"
              code={`curl -X POST "${apiBaseUrl}/newOrder/364/params" \\
  -H "api-token: YOUR_API_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"qty": 1, "playerId": "123456", "order_uuid": "uuid-value"}'`}
            />
          </Section>

          <Section id="snippets" title="أمثلة تكامل سريعة">
            <p className="font-bold text-gray-800">جافاسكريبت (fetch)</p>
            <CodeBlock
              lang="javascript"
              code={`const res = await fetch("${apiBaseUrl}/products", {
  headers: {
    "api-token": "YOUR_API_TOKEN"
  }
});
const data = await res.json();
console.log(data);`}
            />
            <p className="font-bold text-gray-800">PHP (cURL)</p>
            <CodeBlock
              lang="php"
              code={`<?php
$ch = curl_init("${apiBaseUrl}/products");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "api-token: YOUR_API_TOKEN"
]);
$response = curl_exec($ch);
curl_close($ch);
$data = json_decode($response, true);
print_r($data);`}
            />
          </Section>
        </main>
      </div>
    </div>
  );
}
