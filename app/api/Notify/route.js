import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // รับข้อมูลดิบมา (ไม่ใช่ message แล้ว)
    const { cart, transMode, note, user, dateStr } = await request.json();

    const CHANNEL_ACCESS_TOKEN = process.env.LINE_ACCESS_TOKEN;
    const USER_ID = process.env.LINE_USER_ID;

    if (!CHANNEL_ACCESS_TOKEN || !USER_ID) return NextResponse.json({ error: 'Config missing' }, { status: 500 });

    // --- สร้างรายการสินค้า (Dynamic Rows) ---
    // วนลูปสร้างแถวสินค้า ตามจำนวนที่มีในตะกร้า
    const itemRows = cart.map((item) => ({
        type: "box",
        layout: "horizontal",
        contents: [
            { type: "text", text: item.name, size: "sm", color: "#555555", flex: 4, wrap: true },
            { type: "text", text: `${item.qty} ${item.unit}`, size: "sm", color: "#111111", align: "end", flex: 2 }
        ],
        margin: "sm"
    }));

    // --- สีธีม (เขียวรับเข้า / แดงเบิกออก) ---
    const themeColor = transMode === 'IN' ? "#06C755" : "#FF334B"; // เขียว LINE หรือ แดง
    const headerTitle = transMode === 'IN' ? "📥 รับสินค้าเข้า" : "📤 เบิกสินค้าออก";

    // --- โครงสร้าง Flex Message (JSON) ---
    const flexMessage = {
        type: "flex",
        altText: `รายการใหม่: ${headerTitle}`, // ข้อความที่จะเห็นตอนแจ้งเตือนเด้ง
        contents: {
            type: "bubble",
            size: "giga", // ขนาดใหญ่
            header: {
                type: "box",
                layout: "vertical",
                backgroundColor: themeColor,
                paddingAll: "lg",
                contents: [
                    { type: "text", text: "STOCK JIN UPDATE", color: "#ffffff", weight: "bold", size: "xs" },
                    { type: "text", text: headerTitle, color: "#ffffff", weight: "bold", size: "xl", margin: "sm" }
                ]
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    // ส่วนข้อมูลทั่วไป
                    {
                        type: "box",
                        layout: "vertical",
                        contents: [
                            {
                                type: "box",
                                layout: "horizontal",
                                contents: [
                                    { type: "text", text: "ผู้บันทึก", size: "xs", color: "#aaaaaa" },
                                    { type: "text", text: user ? user.name : "Staff", size: "xs", color: "#111111", align: "end" }
                                ]
                            },
                            {
                                type: "box",
                                layout: "horizontal",
                                contents: [
                                    { type: "text", text: "เวลา", size: "xs", color: "#aaaaaa" },
                                    { type: "text", text: dateStr, size: "xs", color: "#111111", align: "end" }
                                ],
                                margin: "xs"
                            }
                        ]
                    },
                    { type: "separator", margin: "lg" },
                    
                    // ส่วนรายการสินค้า (เอาที่เราวนลูปไว้มาใส่ตรงนี้)
                    {
                        type: "box",
                        layout: "vertical",
                        margin: "lg",
                        spacing: "xs",
                        contents: [
                             { type: "text", text: "รายการสินค้า", weight: "bold", size: "sm", margin: "md", color: themeColor },
                             ...itemRows 
                        ]
                    },
                    
                    // ส่วนหมายเหตุ (ถ้ามี)
                    ...(note ? [
                        { type: "separator", margin: "lg" },
                        {
                            type: "box",
                            layout: "vertical",
                            margin: "lg",
                            contents: [
                                { type: "text", text: "📝 หมายเหตุ:", size: "xs", color: "#aaaaaa" },
                                { type: "text", text: note, size: "sm", color: "#555555", wrap: true }
                            ]
                        }
                    ] : [])
                ]
            },
            // ส่วนท้าย (ปุ่มกดไปดู)
            footer: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "button",
                        action: { type: "uri", label: "ตรวจสอบในระบบ", uri: "https://stock-jin-app.vercel.app/" }, // ใส่เว็บเฮียตรงนี้
                        style: "primary",
                        color: themeColor,
                        height: "sm"
                    }
                ]
            }
        }
    };

    // ส่งไป LINE
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: USER_ID,
        messages: [flexMessage] // ส่งแบบ Flex
      }),
    });

    if (!response.ok) return NextResponse.json({ error: 'Failed' }, { status: 500 });
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}