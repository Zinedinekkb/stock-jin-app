// Server-side branding reader. Pure relative imports; firebase-admin is loaded lazily.
import { DEFAULT_BRANDING } from './defaults.js';
import { sanitizeBranding } from './sanitize.js';

const TTL_MS = 60 * 1000;
let cache = null; // { at, value }

export function _resetBrandingCache() {
  cache = null;
}

async function defaultGetDb() {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) return null;
  const mod = await import('../firebaseAdmin.js');
  return mod.getAdminDb();
}

export async function getBrandingServer({ getDb } = {}) {
  const now = Date.now();
  if (!getDb && cache && now - cache.at < TTL_MS) return cache.value;

  let value = { ...DEFAULT_BRANDING };
  try {
    const db = await (getDb || defaultGetDb)();
    if (db) {
      const snap = await db.collection('settings').doc('branding').get();
      if (snap && snap.exists) value = sanitizeBranding(snap.data());
    }
  } catch {
    value = { ...DEFAULT_BRANDING };
  }
  if (!getDb) cache = { at: now, value };
  return value;
}

// "R G B" triplet -> "#rrggbb"
export function tripletToHex(triplet) {
  return '#' + String(triplet).split(' ').map((n) => Number(n).toString(16).padStart(2, '0')).join('');
}
