/**
 * Hex/RGB/HSL conversions and parsing for the theme color picker. Theme tokens always
 * persist as hex, RGB/HSL are display/edit conveniences only.
 */

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface HslColor {
  h: number;
  s: number;
  l: number;
}

/** PrimeNG's ColorPicker emits its internal HSB (a.k.a. HSV) model on change, independent of its `format` input. */
export interface HsbColor {
  h: number;
  s: number;
  b: number;
}

export function hsbToRgb({ h, s, b }: HsbColor): RgbColor {
  const sn = s / 100;
  const bn = b / 100;
  const k = (n: number) => (n + h / 60) % 6;
  const f = (n: number) => bn - bn * sn * Math.max(0, Math.min(k(n), 4 - k(n), 1));
  return { r: 255 * f(5), g: 255 * f(3), b: 255 * f(1) };
}

export function hsbToHex(hsb: HsbColor): string {
  return rgbToHex(hsbToRgb(hsb));
}

export function isHsbColor(value: unknown): value is HsbColor {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as HsbColor).h === 'number' &&
    typeof (value as HsbColor).s === 'number' &&
    typeof (value as HsbColor).b === 'number'
  );
}

const HEX_PATTERN = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isValidHex(value: unknown): boolean {
  return typeof value === 'string' && HEX_PATTERN.test(value.trim());
}

export function normalizeHex(value: string): string {
  let hex = value.trim().replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  return `#${hex.toLowerCase()}`;
}

export function hexToRgb(hex: string | null | undefined): RgbColor | null {
  if (!isValidHex(hex)) {
    return null;
  }
  const normalized = normalizeHex(hex as string).slice(1);
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

export function rgbToHex({ r, g, b }: RgbColor): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Mixes two hex colors; weightB=0 returns hexA, weightB=1 returns hexB. */
export function mixHex(hexA: string, hexB: string, weightB: number): string {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  if (!a || !b) {
    return hexA;
  }

  return rgbToHex({
    r: a.r + (b.r - a.r) * weightB,
    g: a.g + (b.g - a.g) * weightB,
    b: a.b + (b.b - a.b) * weightB,
  });
}

/** Tailwind-style 50–900 tint/shade ramp generated from a single base color, for display only. */
export function shadeRamp(hex: string): readonly { step: number; color: string }[] {
  const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
  return steps.map((step) => {
    if (step === 500) {
      return { step, color: hex };
    }
    if (step < 500) {
      return { step, color: mixHex(hex, '#ffffff', 1 - step / 500) };
    }
    return { step, color: mixHex(hex, '#000000', (step - 500) / 400) };
  });
}

export function rgbToHsl({ r, g, b }: RgbColor): HslColor {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) {
    return { h: 0, s: 0, l: Math.round(l * 100) };
  }

  const s = delta / (1 - Math.abs(2 * l - 1));
  let h: number;
  switch (max) {
    case rn:
      h = ((gn - bn) / delta) % 6;
      break;
    case gn:
      h = (bn - rn) / delta + 2;
      break;
    default:
      h = (rn - gn) / delta + 4;
  }
  h = Math.round(h * 60);
  if (h < 0) {
    h += 360;
  }

  return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToRgb({ h, s, l }: HslColor): RgbColor {
  const sn = s / 100;
  const ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;

  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (h < 60) {
    [rp, gp, bp] = [c, x, 0];
  } else if (h < 120) {
    [rp, gp, bp] = [x, c, 0];
  } else if (h < 180) {
    [rp, gp, bp] = [0, c, x];
  } else if (h < 240) {
    [rp, gp, bp] = [0, x, c];
  } else if (h < 300) {
    [rp, gp, bp] = [x, 0, c];
  } else {
    [rp, gp, bp] = [c, 0, x];
  }

  return { r: (rp + m) * 255, g: (gp + m) * 255, b: (bp + m) * 255 };
}

export function hexToHsl(hex: string): HslColor | null {
  const rgb = hexToRgb(hex);
  return rgb ? rgbToHsl(rgb) : null;
}

export function hslToHex(hsl: HslColor): string {
  return rgbToHex(hslToRgb(hsl));
}

export function formatRgbString(hex: string): string {
  const rgb = hexToRgb(hex);
  return rgb ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : '';
}

export function formatHslString(hex: string): string {
  const hsl = hexToHsl(hex);
  return hsl ? `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)` : '';
}

/** Parses a hex ("#fff"/"#ffffff"), "rgb(r,g,b)" or "hsl(h,s%,l%)" string into a normalized hex. Returns null if unparseable. */
export function parseColorString(value: string): string | null {
  return parseColorWithAlpha(value)?.hex ?? null;
}

export interface ColorWithAlpha {
  hex: string;
  /** 0–100 */
  alpha: number;
}

/** Parses hex/rgb(a)/hsl(a) into a normalized hex plus a separate 0–100 alpha, since theme tokens are often semi-transparent (e.g. rgba borders). */
export function parseColorWithAlpha(value: string): ColorWithAlpha | null {
  const trimmed = value.trim();

  if (isValidHex(trimmed)) {
    return { hex: normalizeHex(trimmed), alpha: 100 };
  }

  const rgbMatch = trimmed.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\)/i);
  if (rgbMatch) {
    const hex = rgbToHex({ r: Number(rgbMatch[1]), g: Number(rgbMatch[2]), b: Number(rgbMatch[3]) });
    const alpha = rgbMatch[4] !== undefined ? Math.round(Number(rgbMatch[4]) * 100) : 100;
    return { hex, alpha };
  }

  const hslMatch = trimmed.match(/^hsla?\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*(?:,\s*([\d.]+))?\)/i);
  if (hslMatch) {
    const hex = hslToHex({ h: Number(hslMatch[1]), s: Number(hslMatch[2]), l: Number(hslMatch[3]) });
    const alpha = hslMatch[4] !== undefined ? Math.round(Number(hslMatch[4]) * 100) : 100;
    return { hex, alpha };
  }

  return null;
}

/** Formats a hex + 0–100 alpha back into a CSS color string: plain hex when fully opaque, rgba(...) otherwise. */
export function toColorString(hex: string, alpha: number): string {
  if (alpha >= 100) {
    return hex;
  }

  const rgb = hexToRgb(hex);
  if (!rgb) {
    return hex;
  }

  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${(alpha / 100).toFixed(2).replace(/\.?0+$/, '') || '0'})`;
}

/** Relative luminance per WCAG 2.x, used for contrast ratio calculations. */
export function relativeLuminance(hex: string | null | undefined): number | null {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return null;
  }

  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };

  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

/** WCAG contrast ratio (1–21) between two colors. Returns null if either is unparseable. */
export function contrastRatio(hexA: string | null | undefined, hexB: string | null | undefined): number | null {
  const lumA = relativeLuminance(hexA);
  const lumB = relativeLuminance(hexB);
  if (lumA === null || lumB === null) {
    return null;
  }

  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}
