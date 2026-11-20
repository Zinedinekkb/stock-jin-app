import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { integrationStatus } from '../../../lib/integrations.js';
import { getAdminDb } from '@/lib/firebaseAdmin';
import {
  todayKeyBangkok, dayRangeBangkok, buildMovementSummary, getLowStock,
} from '@/lib/reportData';
import {
  lineReply, flexBubble, flexMessage, flexSectionTitle, flexRow, flexEmpty, movementRows,
} from '@/lib/lineFlex';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const HELP_TEXT = [
  '🤖 คำสั่งที่ใช้ได้',
  '• สรุปวันนี้ — ความเคลื่อนไหวสินค้าวันนี้',
  '• สต็อกต่ำ — รายการสินค้าใกล้หมด',
  '• ช่วยเหลือ — แสดงคำสั่งทั้งหมด',
].join('\n');

// ตรวจสอบลายเซ็นจาก LINE: base64(HMAC-SHA256(channelSecret, rawBody))
function isValidSignature(rawBody, signature) {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

async function buildTodaySummaryMessage() {
  const dateKey = todayKeyBangkok();
  const { start, end } = dayRangeBangkok(dateKey);
  const summary = await buildMovementSummary(getAdminDb(), start, end);

  const bubble = flexBubble({
    title: '📊 สรุปวันนี้',
    subtitle: `📅 ${dateKey}`,
    bodyContents: [
      flexSectionTitle('📤 เบิกออกวันนี้', '#FF334B'),
      ...movementRows(summary.OUT, '#FF334B', 10),
      flexSectionTitle('📥 รับเข้าวันนี้', '#06C755'),
      ...movementRows(summary.IN, '#06C755', 10),
      flexSectionTitle('⏳ รายการรอดำเนินการ', '#d97706'),
      { type: 'text', text: `${summary.pendingCount} รายการ`, size: 'sm', color: '#555555', margin: 'sm' },
    ],
  });
  return flexMessage('สรุปวันนี้', bubble);
}

async function buildLowStockMessage() {
  const rows = await getLowStock(getAdminDb());
  if (rows.length === 0) {
    return { type: 'text', text: '✅ ไม่มีสินค้าใกล้หมด' };
  }
  const shown = rows.slice(0, 20);
  const bubble = flexBubble({
    title: '⚠️ สินค้าใกล้หมด',
    subtitle: `ทั้งหมด ${rows.length} รายการ${rows.length > shown.length ? ` (แสดง ${shown.length})` : ''}`,
    bodyContents: shown.length
      ? shown.map(p => flexRow(p.name, `${p.stock} ${p.unit}`.trim(), '#dc2626', `ขั้นต่ำ ${p.minStock}`))
      : [flexEmpty()],
  });
  return flexMessage('สินค้าใกล้หมด', bubble);
}

// คืนค่าข้อความที่จะตอบ หรือ null ถ้าไม่ใช่คำสั่ง
async function messageForCommand(text) {
  const cmd = text.trim().toLowerCase();
  if (cmd === 'สรุปวันนี้' || cmd === 'สรุป') return buildTodaySummaryMessage();
  if (cmd === 'สต็อกต่ำ' || cmd === 'สต็อก') return buildLowStockMessage();
  if (cmd === 'ช่วยเหลือ' || cmd === 'help') return { type: 'text', text: HELP_TEXT };
  return null;
}

export async function POST(request) {
  // LINE ไม่ได้ตั้งค่า: ตอบ 200 เพื่อให้ปุ่ม Verify ของ LINE ผ่าน แต่ไม่ทำอะไร
  if (!integrationStatus().line) {
    return NextResponse.json({ status: 'ok', skipped: 'line_not_configured' });
  }
  try {
    // ต้องใช้ raw text เพื่อตรวจลายเซ็นให้ตรงกับที่ LINE ส่งมา
    const rawBody = await request.text();
    const signature = request.headers.get('x-line-signature');

    if (!isValidSignature(rawBody, signature)) {
      return NextResponse.json({ status: 'unauthorized' }, { status: 401 });
    }

    const body = JSON.parse(rawBody || '{}');
    const events = Array.isArray(body.events) ? body.events : [];

    for (const event of events) {
      try {
        // ถ้ามีคนส่งข้อความเข้ามาในกลุ่มที่มีบอทอยู่
        if (event?.source?.type === 'group' || event?.source?.type === 'room') {
          const groupId = event.source.groupId || event.source.roomId;
          console.log("🔥🔥🔥 เจอ Group ID แล้วจ้า: ", groupId);
        }

        if (event?.type !== 'message' || event?.message?.type !== 'text' || !event.replyToken) continue;

        const reply = await messageForCommand(event.message.text || '');
        if (!reply) continue;

        await lineReply(event.replyToken, [reply]);
      } catch (err) {
        console.error('[webhook] event failed:', err?.message || err);
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('[webhook] failed:', error?.message || error);
    return NextResponse.json({ status: 'ok' });
  }
}
