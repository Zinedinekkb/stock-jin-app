// lib/integrations.js
// ตรวจว่าช่องทางเสริม (LINE / อีเมล / Push) ถูกตั้งค่าไว้หรือไม่ — relative imports only

export function integrationStatus(env = process.env) {
  return {
    line: Boolean(env.LINE_ACCESS_TOKEN || env.LINE_CHANNEL_ACCESS_TOKEN),
    email: Boolean(env.EMAIL_USER && env.EMAIL_PASS),
    push: Boolean(env.NEXT_PUBLIC_FIREBASE_VAPID_KEY && env.FIREBASE_SERVICE_ACCOUNT),
  };
}

// URL ของแอป: NEXT_PUBLIC_APP_URL > origin ของ request > ''
export function appUrl(request, env = process.env) {
  const fromEnv = (env.NEXT_PUBLIC_APP_URL || '').trim().replace(/\/+$/, '');
  if (fromEnv) return fromEnv;
  try {
    if (request?.url) return new URL(request.url).origin;
  } catch {}
  return '';
}

export const LINE_SKIPPED = { ok: true, skipped: 'line_not_configured' };
