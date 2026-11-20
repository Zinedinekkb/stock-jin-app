// lib/cronAuth.js
// Checks `Authorization: Bearer <CRON_SECRET>` (Vercel Cron sends this header automatically).
import { timingSafeEqual } from 'crypto';

export function isCronAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get('authorization') || '';
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
