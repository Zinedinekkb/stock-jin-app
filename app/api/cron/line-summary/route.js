import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { isCronAuthorized } from '@/lib/cronAuth';
import { integrationStatus, LINE_SKIPPED } from '../../../../lib/integrations.js';
import { getBrandingServer } from '../../../../lib/branding/server.js';
import { halfMonthRangeBangkok, buildMovementSummary, getLowStock } from '@/lib/reportData';
import {
  linePush, flexBubble, flexMessage, flexSectionTitle, movementRows,
} from '@/lib/lineFlex';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ส่ง LINE push 1 ข้อความต่อครั้ง (รันวันที่ 1 และ 16 เท่านั้น เพื่อประหยัดโควตา 300 ข้อความ/เดือน)
export async function GET(request) {
  if (!isCronAuthorized(request)) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (!integrationStatus().line) return NextResponse.json(LINE_SKIPPED);

  try {
    const target = process.env.LINE_GROUP_ID || process.env.LINE_USER_ID;
    if (!target) {
      return NextResponse.json({ ok: false, error: 'ไม่พบ LINE_GROUP_ID หรือ LINE_USER_ID' }, { status: 500 });
    }

    const { start, end, label } = halfMonthRangeBangkok();
    const db = getAdminDb();
    const [summary, lowStock] = await Promise.all([
      buildMovementSummary(db, start, end),
      getLowStock(db),
    ]);

    const branding = await getBrandingServer();
    const bubble = flexBubble({
      title: `📊 สรุปครึ่งเดือน ${label}`,
      subtitle: `รายการเสร็จ ${summary.completedCount} รายการ · รอดำเนินการ ${summary.pendingCount}`,
      bodyContents: [
        flexSectionTitle('📤 เบิกออกสูงสุด 10 อันดับ', '#FF334B'),
        ...movementRows(summary.OUT, '#FF334B', 10),
        flexSectionTitle('📥 รับเข้าสูงสุด 10 อันดับ', '#06C755'),
        ...movementRows(summary.IN, '#06C755', 10),
        flexSectionTitle('⚠️ สินค้าใกล้หมดตอนนี้', lowStock.length ? '#dc2626' : '#06C755'),
        {
          type: 'text',
          text: lowStock.length ? `${lowStock.length} รายการ` : '✅ ไม่มีสินค้าใกล้หมด',
          size: 'sm', color: '#555555', margin: 'sm',
        },
      ],
      footerText: `ดูรายละเอียดเพิ่มเติมได้ในระบบ ${branding.appName}`,
    });

    await linePush(target, [flexMessage(`สรุปครึ่งเดือน ${label}`, bubble)]);

    return NextResponse.json({
      ok: true,
      period: label,
      completed: summary.completedCount,
      pending: summary.pendingCount,
      lowStock: lowStock.length,
    });
  } catch (error) {
    console.error('[line-summary] failed:', error?.message || error);
    return NextResponse.json({ ok: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
