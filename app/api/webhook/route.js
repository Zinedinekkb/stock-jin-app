import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const events = body.events || [];

    events.forEach(event => {
      // ถ้ามีคนส่งข้อความเข้ามาในกลุ่มที่มีบอทอยู่
      if (event.source.type === 'group' || event.source.type === 'room') {
        const groupId = event.source.groupId || event.source.roomId;
        console.log("🔥🔥🔥 เจอ Group ID แล้วจ้า: ", groupId);
      }
    });

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}