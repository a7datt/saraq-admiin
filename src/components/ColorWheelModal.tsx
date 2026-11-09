import React, { useEffect, useRef, useState, useCallback } from "react";
import { Pipette, Pencil, X, Check, Upload } from "lucide-react";

interface ColorWheelModalProps {
  open: boolean;
  initialColor: string;
  onCancel: () => void;
  onConfirm: (hex: string) => void;
}

function hsvToRgb(h: number, s: number, v: number) {
  s /= 100;
  v /= 100;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

function rgbToHsv(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : (d / max) * 100;
  const v = max * 100;
  return { h, s, v };
}

function componentToHex(c: number) {
  return Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, "0");
}

function toHex(r: number, g: number, b: number) {
  return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;
}

function parseHexToRgb(hex: string) {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) return null;
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return { r, g, b };
}

/** Generic horizontal slider — always computed/rendered left-to-right (dir="ltr")
 * so the handle tracks the pointer 1:1 regardless of the page's text direction. */
const SliderTrack: React.FC<{
  value: number; // 0-100
  onChange: (v: number) => void;
  background: string;
  knobColor: string;
  label: string;
}> = ({ value, onChange, background, knobColor, label }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const setFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      let ratio = (clientX - rect.left) / rect.width;
      ratio = Math.max(0, Math.min(1, ratio));
      onChange(ratio * 100);
    },
    [onChange]
  );

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (dragging.current) setFromClientX(e.clientX);
    };
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [setFromClientX]);

  return (
    <div dir="ltr" className="space-y-1">
      <div
        ref={trackRef}
        onPointerDown={(e) => {
          dragging.current = true;
          setFromClientX(e.clientX);
        }}
        className="relative h-9 rounded-full cursor-pointer select-none border border-gray-200 shadow-inner"
        style={{ background, touchAction: "none" }}
        role="slider"
        aria-label={label}
        aria-valuenow={Math.round(value)}
      >
        <div
          className="absolute top-1/2 w-6 h-6 rounded-full border-2 border-white -translate-y-1/2 -translate-x-1/2 pointer-events-none"
          style={{
            left: `${value}%`,
            backgroundColor: knobColor,
            boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
          }}
        />
      </div>
    </div>
  );
};

/** Secondary modal: upload an image and pick a color from it with a click. */
const ImageColorPickerModal: React.FC<{
  open: boolean;
  onCancel: () => void;
  onPick: (hex: string) => void;
}> = ({ open, onCancel, onPick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [pickedHex, setPickedHex] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setImgSrc(null);
      setPickedHex(null);
    }
  }, [open]);

  if (!open) return null;

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      setImgSrc(src);
      setPickedHex(null);
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const maxW = 340;
        const scale = Math.min(1, maxW / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * canvas.width);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * canvas.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
    setPickedHex(toHex(r, g, b).toUpperCase());
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" dir="rtl">
      <div className="bg-white w-full sm:w-[400px] rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-black text-sm text-gray-800">أخذ لون من صورة</h3>
          <button type="button" onClick={onCancel} className="text-gray-400" aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {!imgSrc && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-10 text-gray-500 text-sm font-bold"
            >
              <Upload size={22} />
              رفع صورة
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />

          {imgSrc && (
            <div className="space-y-3">
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                className="w-full rounded-lg border border-gray-100 cursor-crosshair"
              />
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-bold text-gray-500"
                >
                  تغيير الصورة
                </button>
                {pickedHex && (
                  <div className="flex items-center gap-2">
                    <span
                      className="w-6 h-6 rounded-full border border-gray-200"
                      style={{ backgroundColor: pickedHex }}
                    />
                    <span className="font-mono text-xs text-gray-600">{pickedHex}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-6 pt-1 text-sm font-bold">
            <button type="button" onClick={onCancel} className="text-gray-400">
              إلغاء
            </button>
            <button
              type="button"
              disabled={!pickedHex}
              onClick={() => pickedHex && onPick(pickedHex)}
              className={`flex items-center gap-1.5 ${pickedHex ? "text-[var(--brand,#0d9488)]" : "text-gray-300"}`}
            >
              <Check size={16} /> تأكيد
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ColorWheelModal: React.FC<ColorWheelModalProps> = ({ open, initialColor, onCancel, onConfirm }) => {
  const wheelRef = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(0);
  const [s, setS] = useState(0);
  const [v, setV] = useState(100);
  const draggingWheel = useRef(false);
  const [editingHex, setEditingHex] = useState(false);
  const [hexDraft, setHexDraft] = useState("");
  const [showImagePicker, setShowImagePicker] = useState(false);

  useEffect(() => {
    if (!open) return;
    const rgb = parseHexToRgb(initialColor || "#FFFFFF") || { r: 255, g: 255, b: 255 };
    const { h: hh, s: ss, v: vv } = rgbToHsv(rgb.r, rgb.g, rgb.b);
    setH(hh); setS(ss); setV(vv);
    setEditingHex(false);
    setShowImagePicker(false);
  }, [open, initialColor]);

  const rgb = hsvToRgb(h, s, v);
  const hexOut = toHex(rgb.r, rgb.g, rgb.b).toUpperCase();
  const hueColor = `hsl(${h}, 100%, 50%)`;

  const updateFromWheelPoint = useCallback((clientX: number, clientY: number) => {
    const el = wheelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const radius = rect.width / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    let dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > radius) {
      const ratio = radius / dist;
      dx *= ratio;
      dy *= ratio;
      dist = radius;
    }
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (angle < 0) angle += 360;
    setH(angle);
    setS(Math.min(100, (dist / radius) * 100));
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (draggingWheel.current) updateFromWheelPoint(e.clientX, e.clientY);
    };
    const onUp = () => {
      draggingWheel.current = false;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [updateFromWheelPoint]);

  if (!open) return null;

  const knobX = 50 + Math.cos((h * Math.PI) / 180) * (s / 100) * 50;
  const knobY = 50 + Math.sin((h * Math.PI) / 180) * (s / 100) * 50;

  const applyHexDraft = () => {
    const rgbParsed = parseHexToRgb(hexDraft);
    if (rgbParsed) {
      const { h: hh, s: ss, v: vv } = rgbToHsv(rgbParsed.r, rgbParsed.g, rgbParsed.b);
      setH(hh); setS(ss); setV(vv);
    }
    setEditingHex(false);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" dir="rtl">
        <div className="bg-white w-full sm:w-[420px] sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 p-4 bg-gray-50 border-b border-gray-100 sm:rounded-t-2xl">
            {editingHex ? (
              <input
                autoFocus
                type="text"
                dir="ltr"
                value={hexDraft}
                onChange={(e) => setHexDraft(e.target.value)}
                onBlur={applyHexDraft}
                onKeyDown={(e) => e.key === "Enter" && applyHexDraft()}
                className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-mono outline-none focus:border-[var(--brand,#0d9488)]"
                placeholder="#0936AD"
              />
            ) : (
              <span className="text-gray-700 font-mono text-sm truncate">
                {hexOut} &nbsp;·&nbsp; rgb({rgb.r}, {rgb.g}, {rgb.b})
              </span>
            )}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowImagePicker(true)}
                className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-300 transition-colors"
                title="قطارة - أخذ لون من صورة"
                aria-label="أخذ لون من صورة"
              >
                <Pipette size={16} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setHexDraft(hexOut);
                  setEditingHex((v2) => !v2);
                }}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                  editingHex ? "bg-[var(--brand,#0d9488)] text-white" : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                }`}
                title="تحرير كود اللون"
                aria-label="تحرير كود اللون"
              >
                <Pencil size={16} />
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 sm:hidden"
                aria-label="إغلاق"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {/* Wheel */}
            <div className="flex justify-center">
              <div
                ref={wheelRef}
                dir="ltr"
                onPointerDown={(e) => {
                  draggingWheel.current = true;
                  updateFromWheelPoint(e.clientX, e.clientY);
                }}
                className="relative rounded-full cursor-pointer select-none shadow-md"
                style={{
                  width: 260,
                  height: 260,
                  background:
                    "radial-gradient(circle at center, #fff 0%, rgba(255,255,255,0) 70%), conic-gradient(from 90deg, red, yellow, lime, cyan, blue, magenta, red)",
                  touchAction: "none",
                }}
              >
                <div
                  className="absolute w-6 h-6 rounded-full border-2 border-white -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  style={{
                    left: `${knobX}%`,
                    top: `${knobY}%`,
                    backgroundColor: hexOut,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
                  }}
                />
              </div>
            </div>

            {/* Light box: saturation, white -> pure hue */}
            <SliderTrack
              label="فاتح"
              value={s}
              onChange={setS}
              background={`linear-gradient(to right, #fff, ${hueColor})`}
              knobColor={`hsl(${h}, ${s}%, ${100 - s / 2}%)`}
            />

            {/* Dark box: brightness, black -> pure hue */}
            <SliderTrack
              label="غامق"
              value={v}
              onChange={setV}
              background={`linear-gradient(to right, #000, ${hueColor})`}
              knobColor={`hsl(${h}, ${s}%, ${(v / 100) * 50}%)`}
            />

            {/* Actions */}
            <div className="flex items-center justify-end gap-6 pt-1 text-sm font-bold">
              <button type="button" onClick={onCancel} className="text-gray-400">
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => onConfirm(hexOut)}
                className="text-[var(--brand,#0d9488)]"
              >
                حسنًا
              </button>
            </div>
          </div>
        </div>
      </div>

      <ImageColorPickerModal
        open={showImagePicker}
        onCancel={() => setShowImagePicker(false)}
        onPick={(hex) => {
          const rgbParsed = parseHexToRgb(hex);
          if (rgbParsed) {
            const { h: hh, s: ss, v: vv } = rgbToHsv(rgbParsed.r, rgbParsed.g, rgbParsed.b);
            setH(hh); setS(ss); setV(vv);
          }
          setShowImagePicker(false);
        }}
      />
    </>
  );
};

export default ColorWheelModal;
