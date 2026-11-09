// ═══════════════════════════════════════════════════════════════════════
// أداة مشاركة الطلب: صورة PNG / ملف PDF / ملف CSV — تدعم العربية واتجاه RTL
// لا تعتمد على أي مكتبة خارجية (canvas + Blob فقط) لتبقى خفيفة وجاهزة للعرض فوراً
// ═══════════════════════════════════════════════════════════════════════

export interface ShareOrderRow {
  label: string;
  value: string;
}

export interface ShareOrderData {
  orderId: number | string;
  title?: string; // عنوان البطاقة، افتراضي "تفاصيل الطلب"
  rows: ShareOrderRow[];
}

const CARD_WIDTH = 760;
const PADDING = 36;
const ROW_HEIGHT = 54;
const HEADER_HEIGHT = 110;
const FOOTER_HEIGHT = 60;
const BRAND_COLOR = "#16a34a";
const TEXT_DARK = "#1f2937";
const TEXT_MUTED = "#6b7280";
const BORDER_COLOR = "#e5e7eb";
const BG_ROW_ALT = "#f9fafb";

function wrapArabicText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = String(text ?? "").split(" ");
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const test = current ? `${current} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = w;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function buildCanvas(data: ShareOrderData): HTMLCanvasElement {
  const dpr = Math.max(2, window.devicePixelRatio || 1);
  const tmp = document.createElement("canvas");
  const tctx = tmp.getContext("2d")!;
  tctx.font = "13px Tahoma, Arial, sans-serif";

  // احسب عدد الأسطر الفعلي لكل صف مسبقاً لتحديد الطول الكلي للبطاقة
  const valueMaxWidth = CARD_WIDTH - PADDING * 2 - 190;
  const rowLineCounts = data.rows.map(r => wrapArabicText(tctx, r.value, valueMaxWidth).length);
  const rowHeights = rowLineCounts.map(n => Math.max(ROW_HEIGHT, 30 + n * 22));
  const totalRowsHeight = rowHeights.reduce((a, b) => a + b, 0);
  const height = HEADER_HEIGHT + totalRowsHeight + FOOTER_HEIGHT + PADDING;

  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);
  (ctx as any).direction = "rtl";

  // خلفية
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CARD_WIDTH, height);
  ctx.strokeStyle = BORDER_COLOR;
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, CARD_WIDTH - 1, height - 1);

  // شريط علوي بلون العلامة
  ctx.fillStyle = BRAND_COLOR;
  ctx.fillRect(0, 0, CARD_WIDTH, 6);

  // رأس البطاقة
  ctx.textAlign = "right";
  ctx.direction = "rtl" as any;
  ctx.fillStyle = TEXT_DARK;
  ctx.font = "bold 22px Tahoma, Arial, sans-serif";
  ctx.fillText(data.title || "تفاصيل الطلب", CARD_WIDTH - PADDING, 50);

  ctx.fillStyle = BRAND_COLOR;
  ctx.font = "bold 15px Tahoma, Arial, sans-serif";
  ctx.fillText(`رقم الطلب #${data.orderId}`, CARD_WIDTH - PADDING, 78);

  ctx.strokeStyle = BORDER_COLOR;
  ctx.beginPath();
  ctx.moveTo(PADDING, HEADER_HEIGHT - 10);
  ctx.lineTo(CARD_WIDTH - PADDING, HEADER_HEIGHT - 10);
  ctx.stroke();

  // الصفوف
  let y = HEADER_HEIGHT + 10;
  data.rows.forEach((row, i) => {
    const rh = rowHeights[i];
    if (i % 2 === 0) {
      ctx.fillStyle = BG_ROW_ALT;
      ctx.fillRect(PADDING - 10, y - 22, CARD_WIDTH - (PADDING - 10) * 2, rh);
    }
    ctx.fillStyle = TEXT_MUTED;
    ctx.font = "bold 12px Tahoma, Arial, sans-serif";
    ctx.fillText(row.label, CARD_WIDTH - PADDING, y);

    ctx.fillStyle = TEXT_DARK;
    ctx.font = "13px Tahoma, Arial, sans-serif";
    const lines = wrapArabicText(ctx, row.value, valueMaxWidth);
    lines.forEach((line, li) => {
      ctx.fillText(line, CARD_WIDTH - PADDING - 190, y + 20 + li * 22);
    });

    y += rh;
  });

  // تذييل
  ctx.strokeStyle = BORDER_COLOR;
  ctx.beginPath();
  ctx.moveTo(PADDING, height - FOOTER_HEIGHT + 10);
  ctx.lineTo(CARD_WIDTH - PADDING, height - FOOTER_HEIGHT + 10);
  ctx.stroke();

  ctx.fillStyle = TEXT_MUTED;
  ctx.font = "11px Tahoma, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`تم الإنشاء بتاريخ ${new Date().toLocaleString("ar-EG")}`, CARD_WIDTH / 2, height - 22);

  return canvas;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** تصدير الطلب كصورة PNG */
export async function shareOrderAsImage(data: ShareOrderData): Promise<void> {
  const canvas = buildCanvas(data);
  await new Promise<void>((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, `order-${data.orderId}.png`);
      resolve();
    }, "image/png");
  });
}

/** تصدير الطلب كملف PDF (صفحة واحدة تحتوي صورة البطاقة المُصيّرة بالعربية RTL) */
export async function shareOrderAsPdf(data: ShareOrderData): Promise<void> {
  const canvas = buildCanvas(data);
  const pngDataUrl = canvas.toDataURL("image/png");
  const imgWidthPt = 540; // نقاط PDF (~7.5 بوصة)
  const imgHeightPt = (canvas.height / canvas.width) * imgWidthPt;
  const pageWidth = imgWidthPt + 72;
  const pageHeight = imgHeightPt + 72;

  const base64 = pngDataUrl.split(",")[1];
  const binary = atob(base64);
  const imgBytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) imgBytes[i] = binary.charCodeAt(i);

  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let pos = 0;
  const push = (bytes: Uint8Array) => { chunks.push(bytes); offsets.push(pos); pos += bytes.length; };

  push(enc.encode("%PDF-1.4\n"));

  const obj1 = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
  push(enc.encode(obj1));

  const obj2 = `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`;
  push(enc.encode(obj2));

  const obj3 = `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`;
  push(enc.encode(obj3));

  // نحول إلى JPEG عبر canvas لضمان دعم DCTDecode المباشر (أخف وأوسع دعماً في PDF)
  const jpegDataUrl = canvas.toDataURL("image/jpeg", 0.92);
  const jpegBase64 = jpegDataUrl.split(",")[1];
  const jpegBinary = atob(jpegBase64);
  const jpegBytes = new Uint8Array(jpegBinary.length);
  for (let i = 0; i < jpegBinary.length; i++) jpegBytes[i] = jpegBinary.charCodeAt(i);

  const obj4Offset = pos;
  push(enc.encode(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`
  ));
  push(jpegBytes);
  push(enc.encode(`\nendstream\nendobj\n`));

  const content = `q ${imgWidthPt} 0 0 ${imgHeightPt} 36 36 cm /Im0 Do Q`;
  const obj5Offset = pos;
  const obj5 = `5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`;
  push(enc.encode(obj5));

  const xrefStart = pos;
  let xref = `xref\n0 6\n0000000000 65535 f \n`;
  const objOffsets = [offsets[1], offsets[2], offsets[3], obj4Offset, obj5Offset];
  for (const off of objOffsets) {
    xref += `${String(off).padStart(10, "0")} 00000 n \n`;
  }
  push(enc.encode(xref));

  const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  push(enc.encode(trailer));

  const totalLen = chunks.reduce((a, c) => a + c.length, 0);
  const out = new Uint8Array(totalLen);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }

  downloadBlob(new Blob([out], { type: "application/pdf" }), `order-${data.orderId}.pdf`);
}

/** تصدير الطلب كملف CSV يدعم العربية (UTF-8 BOM) */
export function shareOrderAsCsv(data: ShareOrderData): void {
  const lines = [
    ["الحقل", "القيمة"],
    ...data.rows.map(r => [r.label, r.value]),
  ];
  const escape = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = lines.map(row => row.map(escape).join(",")).join("\r\n");
  const bom = "\uFEFF"; // يضمن فتح الملف بترميز صحيح للعربية في Excel
  downloadBlob(new Blob([bom + csv], { type: "text/csv;charset=utf-8;" }), `order-${data.orderId}.csv`);
}

/** يبني صفوف البيانات القياسية لطلب واحد من كائن order الخاص بالمشروع */
const STATUS_LABELS_AR: Record<string, string> = {
  pending_admin: "بانتظار الموافقة",
  processing: "قيد المراجعة",
  pending: "قيد المراجعة",
  completed: "مقبول",
  approved: "مقبول",
  failed: "مرفوض",
  rejected: "مرفوض",
  cancelled: "ملغي",
};
function statusLabelAr(status: string): string {
  return STATUS_LABELS_AR[status] || status || "—";
}

export function buildOrderShareRows(order: any, extra?: { providerName?: string; price?: number; playerId?: string }): ShareOrderRow[] {
  let meta: any = {};
  try { meta = JSON.parse(order.meta || "{}"); } catch {}
  const rows: ShareOrderRow[] = [
    { label: "اسم المستخدم", value: order.user_name || "مستخدم محذوف" },
    { label: "رقم الدخول", value: String(order.user_db_id ?? order.user_id ?? "—") },
    { label: "المنتج", value: order.product_name || "—" },
    { label: "القسم", value: [order.category_name, order.subcategory_name].filter(Boolean).join(" ← ") || "—" },
    { label: "السعر", value: `${Number(extra?.price ?? order.total_amount ?? order.total_price ?? 0).toFixed(3)} $` },
    { label: "الحالة", value: statusLabelAr(order.status) },
    { label: "تاريخ الإنشاء", value: new Date(order.created_at).toLocaleString("ar-EG") },
  ];
  const playerId = extra?.playerId || meta.playerId || meta.input || meta.player_id;
  if (playerId) rows.push({ label: "معرف اللاعب", value: String(playerId) });
  if (order.admin_response) rows.push({ label: "رد الأدمن", value: String(order.admin_response) });
  if (meta.last_api_error) rows.push({ label: "آخر خطأ", value: String(meta.last_api_error) });
  return rows;
}

/** يبني صفوف البيانات القياسية لعملية دفع (معاملة) واحدة من كائن transaction الخاص بالمشروع */
const TX_STATUS_LABELS_AR: Record<string, string> = {
  pending: "قيد التحقق",
  approved: "مكتملة",
  rejected: "مرفوضة",
};
function txStatusLabelAr(status: string): string {
  return TX_STATUS_LABELS_AR[status] || status || "—";
}

export function buildTransactionShareRows(t: any): ShareOrderRow[] {
  const rows: ShareOrderRow[] = [
    { label: "اسم المستخدم", value: t.user_name || "مستخدم محذوف" },
    { label: "البريد الإلكتروني", value: t.user_email || "—" },
    { label: "رقم الدخول", value: String(t.user_db_id ?? t.user_id ?? "—") },
    { label: "طريقة الدفع", value: t.payment_method_name || "—" },
    { label: "المبلغ", value: `${Number(t.amount || 0).toFixed(3)} $` },
    { label: "الحالة", value: txStatusLabelAr(t.status) },
    { label: "تاريخ الإنشاء", value: new Date(t.created_at).toLocaleString("ar-EG") },
  ];
  if (t.tx_number) rows.push({ label: "رقم العملية", value: String(t.tx_number) });
  if (t.note) rows.push({ label: "الملاحظة", value: String(t.note).replace(/\[sam-api\]\s*-?\s*/gi, "") });
  return rows;
}
