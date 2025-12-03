import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { message } = await request.json();

    // -----------------------------------------------------------
    // เปลี่ยนมาดึงค่าจาก .env แทน (ปลอดภัย 100%)
    // -----------------------------------------------------------
    const CHANNEL_ACCESS_TOKEN = process.env.LINE_ACCESS_TOKEN; 

    if (!CHANNEL_ACCESS_TOKEN) {
        return NextResponse.json({ error: 'LINE Token not found' }, { status: 500 });
    }

    // ... (ส่วน fetch เหมือนเดิมเป๊ะ ไม่ต้องแก้) ...
    const response = await fetch('https://api.line.me/v2/bot/message/broadcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        messages: [{ type: 'text', text: message }]
      }),
    });

    if (!response.ok) {
      // ... (เหมือนเดิม) ...
      return NextResponse.json({ error: 'Failed to send line' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Internal Error:", error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}