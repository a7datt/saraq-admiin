// Default (built-in) fields per store type.
// Stored inside the product's `custom_fields` JSON array alongside user-added
// custom fields, distinguished by `isDefault: true` and a stable `key`.
export interface FieldDef {
  id: string;
  key?: string;
  label: string;
  required: boolean;
  isDefault?: boolean;
}

export const DEFAULT_FIELD_KEYS: Record<string, { key: string; defaultLabel: string }[]> = {
  quick_order: [
    { key: "default_id", defaultLabel: "أدخل المعرف (ID)" },
  ],
  quantities: [
    { key: "default_account_number", defaultLabel: "معرف الحساب (ID)" },
  ],
  packages: [
    { key: "default_phone", defaultLabel: "ضع رقم هاتفك" },
  ],
};

// Ensures the fields array contains the required default-field entries for
// the given store type (adding missing ones, preserving existing edits).
export function ensureDefaultFields(storeType: string, fields: FieldDef[]): FieldDef[] {
  // external_api: عدد ونوع الحقول المطلوبة (وأيها "افتراضي") يأتي ديناميكياً من ap.params
  // الخاصة بالمزوّد عند المزامنة (custom_fields المُخزّنة على المنتج مباشرة) — لا يوجد حقل
  // افتراضي ثابت واحد كما في الأنواع الأخرى، لذا لا نحذف ولا نُضيف شيئاً هنا؛ نُبقي على كل ما
  // هو مخزَّن فعلياً على المنتج كما هو (بما فيها أي حقل isDefault جاء من المزامنة).
  if (storeType === "external_api") {
    return fields;
  }
  const defs = DEFAULT_FIELD_KEYS[storeType] || [];
  if (defs.length === 0) {
    // Strip any leftover default fields if store type no longer needs them
    return fields.filter(f => !f.isDefault);
  }
  const result: FieldDef[] = [];
  for (const def of defs) {
    const existing = fields.find(f => f.isDefault && f.key === def.key);
    result.push(existing || { id: def.key, key: def.key, label: def.defaultLabel, required: true, isDefault: true });
  }
  // append non-default (custom) fields and default fields from a previous, different store type filtered out
  for (const f of fields) {
    if (!f.isDefault) result.push(f);
  }
  return result;
}

export function splitFields(fields: FieldDef[]): { defaultFields: FieldDef[]; customFields: FieldDef[] } {
  return {
    defaultFields: fields.filter(f => f.isDefault),
    customFields: fields.filter(f => !f.isDefault),
  };
}

export function parseFieldsJson(raw: any): FieldDef[] {
  try {
    if (!raw) return [];
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ── Payment Method custom fields (Note / Upload Image / up to 3 custom text fields) ──
// Stored inside the payment method's `custom_fields` JSON array, mirroring the
// products mechanism above but with an extra `enabled` flag (default fields can
// be shown/hidden) and a `type` ("text" | "image") so the checkout page knows
// how to render each field.
export interface PaymentFieldDef {
  id: string;
  key?: string;
  label: string;
  required: boolean;
  enabled?: boolean;
  isDefault?: boolean;
  type?: "text" | "image";
}

export const PAYMENT_METHOD_DEFAULT_FIELDS: { key: string; defaultLabel: string; type: "text" | "image" }[] = [
  { key: "note", defaultLabel: "ملاحظة", type: "text" },
  { key: "receipt_image", defaultLabel: "صورة الإيصال", type: "image" },
];

// Ensures the two default fields (Note, Upload Image) always exist, preserving
// any admin edits (rename / required / enabled) and appending custom fields.
export function ensurePaymentMethodDefaultFields(fields: PaymentFieldDef[]): PaymentFieldDef[] {
  const result: PaymentFieldDef[] = [];
  for (const def of PAYMENT_METHOD_DEFAULT_FIELDS) {
    const existing = fields.find(f => f.isDefault && f.key === def.key);
    result.push(
      existing
        ? { ...existing, type: def.type }
        : { id: def.key, key: def.key, label: def.defaultLabel, required: def.key === "receipt_image", enabled: true, isDefault: true, type: def.type }
    );
  }
  for (const f of fields) {
    if (!f.isDefault) result.push(f);
  }
  return result;
}

export function parsePaymentFieldsJson(raw: any): PaymentFieldDef[] {
  try {
    if (!raw) return [];
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
