/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import { StoreAppearance } from "../types";

export const DEFAULT_APPEARANCE: StoreAppearance = {
  logo_url: "", // يأتي من قاعدة البيانات (store_appearance) عبر /api/appearance
  theme_mode: "system",
  primary_color: "#0936AD",
  cat_columns_desktop: 4,
  cat_columns_mobile: 3,
  cat_image_ratio: "1:1",
  sub_columns_desktop: 4,
  sub_columns_mobile: 3,
  sub_image_ratio: "1:1",
  subsub_columns_desktop: 4,
  subsub_columns_mobile: 3,
  subsub_image_ratio: "1:1",
  prod_columns_desktop: 4,
  prod_columns_mobile: 1,
  prod_image_ratio: "1:1",
  pay_columns_desktop: 4,
  pay_columns_mobile: 4,
  pay_image_ratio: "1:1",
  default_home_mode: "categories",
  font_scale: 100,
  font_size_cat: null,
  font_size_sub: null,
  font_size_subsub: null,
  font_size_prod: null,
  font_size_pay: null,
};

const RATIO_CLASS: Record<string, string> = {
  "1:1": "aspect-square",
  "4:3": "aspect-[4/3]",
  "3:4": "aspect-[3/4]",
  "16:9": "aspect-video",
  "9:16": "aspect-[9/16]",
};

export const ratioToClass = (ratio: string): string => RATIO_CLASS[ratio] || "aspect-square";

const COLS_CLASS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
};

/** Builds a responsive Tailwind grid class string from mobile/desktop column counts. */
export const gridColsClass = (mobile: number, desktop: number): string =>
  `${COLS_CLASS[mobile] || "grid-cols-3"} sm:${COLS_CLASS[desktop] || "sm:grid-cols-4"}`;

const hexToRgb = (hex: string): string => {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  if (Number.isNaN(bigint) || clean.length !== 6) return "9 54 173";
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `${r} ${g} ${b}`;
};

const shade = (hex: string, percent: number): string => {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return hex;
  const num = parseInt(clean, 16);
  let r = (num >> 16) + Math.round(255 * percent);
  let g = ((num >> 8) & 0x00ff) + Math.round(255 * percent);
  let b = (num & 0x0000ff) + Math.round(255 * percent);
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

/** Relative luminance (0 = black, 1 = white) used to pick a readable contrast color. */
const luminance = (hex: string): number => {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return 1;
  const num = parseInt(clean, 16);
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};

/**
 * Picks black or white — whichever gives better contrast against the given
 * background color. Works for ANY brand color, not just pure black/white.
 */
const contrastColor = (hex: string): string => (luminance(hex) > 0.55 ? "#000000" : "#ffffff");

/**
 * If the admin's chosen brand color would be invisible against the current
 * page background (e.g. white brand on a white light-mode page, or black
 * brand on a black dark-mode page), nudge it to a visible shade instead.
 * Any color that already contrasts fine with the background passes through
 * completely unchanged.
 */
const resolvePrimaryForMode = (hex: string, mode: "light" | "dark"): string => {
  const clean = hex.trim().toLowerCase();
  const isBlack = clean === "#000000" || clean === "#000";
  const isWhite = clean === "#ffffff" || clean === "#fff";

  if (mode === "dark" && isBlack) return "#ffffff"; // black would vanish on black dark bg
  if (mode === "light" && isWhite) return "#000000"; // white would vanish on white light bg
  return hex;
};

/** يحدّث أيقونة التبويب (favicon) و apple-touch-icon من لوغو المتجر المخزّن في قاعدة البيانات. */
const applyLogoToDocument = (logo?: string | null) => {
  if (!logo || typeof document === "undefined") return;
  document
    .querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="apple-touch-icon"]')
    .forEach((l) => { l.href = logo; });
};

/** Applies theme mode + primary color as CSS variables / class on <html>. */
export const applyThemeToDocument = (appearance: StoreAppearance) => {
  const root = document.documentElement;
  applyLogoToDocument(appearance.logo_url);

  let resolvedMode: "light" | "dark" = "light";
  if (appearance.theme_mode === "dark") {
    resolvedMode = "dark";
  } else if (appearance.theme_mode === "system") {
    resolvedMode = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  root.classList.toggle("dark", resolvedMode === "dark");

  // If the admin's chosen color is pure black or white, resolve it per the
  // active mode (black -> white in dark mode, white -> black in light mode).
  // Any other color passes through unchanged.
  const resolvedPrimary = resolvePrimaryForMode(appearance.primary_color, resolvedMode);

  // Text/icon color placed ON TOP of a brand-colored surface (buttons,
  // badges, active nav items, etc). Computed from real luminance so it is
  // always readable no matter which color the admin picked.
  const resolvedContrast = contrastColor(resolvedPrimary);

  // "Light/soft" tint backgrounds (bg-brand-light, border-brand-soft, ...) are meant to be
  // paired with text-brand on top of them. The old approach always lightened the brand color
  // toward white — but if the brand color gets nudged to white for dark mode (see
  // resolvePrimaryForMode above), "lightening" white stays white, and text-brand (also white)
  // becomes invisible on it. Mixing a small percentage of the brand color into the CURRENT
  // MODE's neutral background (white in light mode, black in dark mode) instead guarantees the
  // tint always contrasts with the actual brand-colored text sitting on top of it.
  const neutralBase = resolvedMode === "dark" ? "#000000" : "#ffffff";
  const brandLightMix = `color-mix(in srgb, ${resolvedPrimary} 15%, ${neutralBase})`;
  const brandSoftMix = `color-mix(in srgb, ${resolvedPrimary} 25%, ${neutralBase})`;

  // The UI reads --brand / --brand-dark AND Tailwind's --color-brand token
  // (used by utility classes like bg-brand, text-brand, bg-brand-light).
  // All must be updated or the admin's saved color never reaches the UI.
  root.style.setProperty("--brand", resolvedPrimary);
  root.style.setProperty("--brand-dark", shade(resolvedPrimary, -0.15));
  root.style.setProperty("--color-brand", resolvedPrimary);
  root.style.setProperty("--color-brand-light", brandLightMix);
  root.style.setProperty("--color-brand-soft", brandSoftMix);
  root.style.setProperty("--brand-light", brandLightMix);
  root.style.setProperty("--brand-soft", brandSoftMix);
  root.style.setProperty("--color-primary", resolvedPrimary);
  root.style.setProperty("--color-primary-rgb", hexToRgb(resolvedPrimary));
  root.style.setProperty("--brand-contrast", resolvedContrast);

  // ===== حجم الخط العام + أحجام مخصصة لكل قسم =====
  const scale = Number(appearance.font_scale) || 100;
  root.style.setProperty("--font-scale", `${scale}%`);
  root.style.fontSize = `${scale}%`; // يُطبَّق على كامل الموقع عبر وحدات rem

  const setFontVar = (name: string, val: number | null | undefined) => {
    if (val && Number(val) > 0) root.style.setProperty(name, `${val}px`);
    else root.style.removeProperty(name);
  };
  setFontVar("--font-size-cat", appearance.font_size_cat);
  setFontVar("--font-size-sub", appearance.font_size_sub);
  setFontVar("--font-size-subsub", appearance.font_size_subsub);
  setFontVar("--font-size-prod", appearance.font_size_prod);
  setFontVar("--font-size-pay", appearance.font_size_pay);
};

/**
 * Fetches the storefront appearance settings (logo, theme, colors, grid config)
 * from the public API and applies the theme/color globally. Falls back to safe
 * defaults on failure so the storefront never breaks or flickers.
 */
export function useStoreAppearance(): { appearance: StoreAppearance; loading: boolean } {
  const [appearance, setAppearance] = useState<StoreAppearance>(DEFAULT_APPEARANCE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Apply whatever was cached from the previous visit immediately, before
    // the network request resolves, so there is nothing left to flash.
    try {
      const cachedRaw = localStorage.getItem("saraqib_store_appearance_cache");
      if (cachedRaw) {
        const cached: StoreAppearance = { ...DEFAULT_APPEARANCE, ...JSON.parse(cachedRaw) };
        setAppearance(cached);
        applyThemeToDocument(cached);
      }
    } catch (e) {
      // ignore malformed cache
    }

    const fetchAppearance = async () => {
      try {
        const res = await fetch("/api/appearance");
        if (!res.ok) throw new Error(`Failed to fetch appearance: ${res.status}`);
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Expected JSON response from appearance API");
        }
        const data = await res.json();
        if (cancelled) return;
        const merged: StoreAppearance = { ...DEFAULT_APPEARANCE, ...data };
        setAppearance(merged);
        applyThemeToDocument(merged);
        try {
          localStorage.setItem("saraqib_store_appearance_cache", JSON.stringify(merged));
        } catch (e) {
          // ignore storage quota / privacy-mode errors
        }
      } catch (e) {
        if (!cancelled) applyThemeToDocument(DEFAULT_APPEARANCE);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAppearance();

    let mediaQuery: MediaQueryList | null = null;
    const handleSystemChange = () => applyThemeToDocument(appearance);
    if (window.matchMedia) {
      mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      mediaQuery.addEventListener("change", handleSystemChange);
    }

    return () => {
      cancelled = true;
      mediaQuery?.removeEventListener("change", handleSystemChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { appearance, loading };
}
