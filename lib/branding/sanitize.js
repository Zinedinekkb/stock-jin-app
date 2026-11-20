import { DEFAULT_BRANDING } from './defaults.js';
import { isValidHex } from '../theme/palette.js';

const CAPS = {
  appName: 40,
  shortName: 40,
  tagline: 80,
  shopName: 200,
  shopAddress: 200,
  shopTaxId: 200,
  shopPhone: 200,
};

function str(value, fallback, max) {
  if (typeof value !== 'string') return fallback;
  return value.trim().slice(0, max);
}

export function sanitizeBranding(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const out = { ...DEFAULT_BRANDING };
  for (const [key, max] of Object.entries(CAPS)) {
    out[key] = str(src[key], DEFAULT_BRANDING[key], max);
  }
  // Names must not be empty; fall back to defaults.
  if (!out.appName) out.appName = DEFAULT_BRANDING.appName;
  if (!out.shortName) out.shortName = DEFAULT_BRANDING.shortName;
  out.primaryColor = isValidHex(src.primaryColor) ? src.primaryColor.toLowerCase() : DEFAULT_BRANDING.primaryColor;
  const logo = typeof src.logoUrl === 'string' ? src.logoUrl.trim() : '';
  out.logoUrl = logo.startsWith('https://') ? logo : '';
  return out;
}

export function displayShopName(b) {
  return b.shopName || b.appName;
}
