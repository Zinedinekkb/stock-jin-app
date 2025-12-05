import { NextResponse } from 'next/server';

export async function POST(request) {
  console.log("🚀 API /api/notify ถูกเรียกใช้งานแล้ว!"); // เช็คว่าหน้าบ้านยิงมาถึงไหม

  try {
    const { message } = await request.json();
    console.log("📩 ข้อความที่จะส่ง:", message);

    // --- ฝังรหัสตรงๆ เพื่อทดสอบ (Test Only) ---
    // พอทดสอบผ่านแล้วค่อยเปลี่ยนกลับไปใช้ process.env ทีหลังครับ
    const CHANNEL_ACCESS_TOKEN = "uXgfoXu+wUcD8ejGyrh3pkJZ41NFYy4l5Farnqj8Hmyof+zDXsHQCr+7aF3FSKAihpxUun+Y3Nka4VFAiTdndemEsnUvK+WP6vlrS1N49uetpItwJ+KgjKiy+fyMb365nMfRJKGJOUmgIvWmnuaCVQdB04t89/1O/w1cDnyilFU=";
    const USER_ID = "Ua408b35caa93c5d8a1fd80504eaae7b8";

    console.log("🔑 กำลังส่งไปที่ User ID:", USER_ID);

    // ยิงไปที่ LINE
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: USER_ID,
        messages: [{ type: 'text', text: message }]
      }),
    });

    // เช็คผลลัพธ์จาก LINE
    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ ส่งไม่ผ่าน! LINE แจ้งว่า:", JSON.stringify(errorData, null, 2));
      return NextResponse.json({ error: errorData }, { status: 500 });
    }

    console.log("✅ ส่งสำเร็จ! LINE ตอบกลับมาว่า OK");
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("💥 เกิดข้อผิดพลาดร้ายแรง:", error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}