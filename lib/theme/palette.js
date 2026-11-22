// Pure brand palette builder. Relative imports only; no framework deps.

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const STEPS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'];
const LADDER = { 50: 97, 100: 93, 200: 85, 300: 74, 400: 62, 600: 42, 700: 34, 800: 26, 900: 18 };

export function isValidHex(value) {
  return typeof value === 'string' && HEX_RE.test(value);
}

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return { r: Math.round(f(0) * 255), g: Math.round(f(8) * 255), b: Math.round(f(4) * 255) };
}

function luminance({ r, g, b }) {
  const [R, G, B] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function whiteContrast(rgb) {
  return 1.05 / (luminance(rgb) + 0.05);
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const fmt = ({ r, g, b }) => `${r} ${g} ${b}`;

export function buildBrandPalette(hex) {
  const base = isValidHex(hex) ? hex : '#6355d8';
  const { h, s, l } = rgbToHsl(hexToRgb(base));
  const sat = clamp(s, 35, 90);

  const lights = { ...LADDER, 500: clamp(l, 40, 52) };

  // Keep white text readable on 600 (WCAG AA 4.5:1): darken if needed.
  let l600 = lights[600];
  while (l600 > 6 && whiteContrast(hslToRgb(h, sat, l600)) < 4.5) l600 -= 1;
  lights[600] = l600;
  // Keep lightness strictly decreasing through the dark steps.
  let prev = lights[600];
  for (const k of ['700', '800', '900']) {
    lights[k] = Math.min(lights[k], prev - 2);
    prev = lights[k];
  }
  // 500 must stay lighter than 600.
  lights[500] = Math.max(lights[500], lights[600] + 2);

  const out = {};
  for (const k of STEPS) out[k] = fmt(hslToRgb(h, sat, Math.max(lights[k], 0)));
  return out;
}

export function paletteToCssVars(palette) {
  const vars = {};
  for (const k of STEPS) vars[`--brand-${k}`] = palette[k];
  return vars;
}
