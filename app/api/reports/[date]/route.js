import { getAdminDb } from '@/lib/firebaseAdmin';
import { withPrintToolbar } from '@/lib/reportHtml';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const plainText = (message, status) =>
  new Response(message, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });

// GET /api/reports/YYYY-MM-DD?t=<viewToken>
export async function GET(request, { params }) {
  try {
    const { date } = await params;
    const token = new URL(request.url).searchParams.get('t') || '';

    if (!DATE_RE.test(date) || !token) {
      return plainText('ไม่พบรายงาน', 404);
    }

    const snap = await getAdminDb().collection('daily_reports').doc(date).get();
    if (!snap.exists) {
      return plainText('ไม่พบรายงาน', 404);
    }

    const data = snap.data() || {};
    if (!data.viewToken || data.viewToken !== token || typeof data.html !== 'string') {
      return plainText('ไม่พบรายงาน', 404);
    }

    return new Response(withPrintToolbar(data.html), {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'private, no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  } catch (error) {
    console.error('[reports] view failed:', error?.message || error);
    return plainText('ไม่พบรายงาน', 404);
  }
}
