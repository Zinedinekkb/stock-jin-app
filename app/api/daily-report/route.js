import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { reportType, summaryIn, summaryOut, dateStr, user } = await request.json();
    const CHANNEL_ACCESS_TOKEN = process.env.LINE_ACCESS_TOKEN;
    const TARGET_ID = process.env.LINE_GROUP_ID || process.env.LINE_USER_ID;

    if (!CHANNEL_ACCESS_TOKEN || !TARGET_ID) return NextResponse.json({ error: 'Config missing' }, { status: 500 });

    const contents = [];

    // --- 1. หัวข้อรายงาน ---
    contents.push({
      type: "text", text: "📊 สรุปยอดประจำวัน", weight: "bold", size: "xl", color: "#1DB446", margin: "md"
    });
    contents.push({
      type: "text", text: `📅 วันที่: ${dateStr}`, size: "xs", color: "#aaaaaa", margin: "xs"
    });
    contents.push({ type: "separator", margin: "lg" });

    // ฟังก์ชันช่วยสร้าง Row สินค้า
    const createItemRows = (items, color) => {
        if (items.length === 0) return [{ type: "text", text: "- ไม่มีรายการ -", size: "sm", color: "#aaaaaa", margin: "sm" }];
        
        return items.map(item => ({
            type: "box", layout: "horizontal", margin: "sm",
            contents: [
                { type: "text", text: item.name, size: "sm", color: "#555555", flex: 4, wrap: true },
                { 
                    type: "box", 
                    layout: "vertical", 
                    flex: 2, 
                    contents: [
                        { type: "text", text: `${item.totalQty} ${item.unit}`, size: "sm", color: color, align: "end", weight: "bold" },
                        // --- [เพิ่ม] แสดงยอดคงเหลือล่าสุด ---
                        { type: "text", text: `(เหลือ ${item.currentStock})`, size: "xxs", color: "#aaaaaa", align: "end" }
                    ]
                }
            ]
        }));
    };

    // --- 2. ส่วนสรุปรับเข้า (IN) ---
    if (reportType === 'IN' || reportType === 'BOTH') {
        contents.push({ type: "text", text: "📥 ยอดรับสินค้าเข้า", weight: "bold", size: "sm", margin: "lg", color: "#06C755" });
        contents.push(...createItemRows(summaryIn, "#06C755"));
        contents.push({ type: "separator", margin: "lg" });
    }

    // --- 3. ส่วนสรุปเบิกออก (OUT) ---
    if (reportType === 'OUT' || reportType === 'BOTH') {
        contents.push({ type: "text", text: "📤 ยอดเบิกสินค้าออก", weight: "bold", size: "sm", margin: "lg", color: "#FF334B" });
        contents.push(...createItemRows(summaryOut, "#FF334B"));
        contents.push({ type: "separator", margin: "lg" });
    }

    // --- 4. ส่วนท้าย ---
    contents.push({
       type: "box", layout: "vertical", margin: "lg",
       contents: [
          { type: "text", text: `สั่งสรุปโดย: ${user ? user.name : 'System'}`, size: "xs", color: "#aaaaaa", align: "center" }
       ]
    });

    const flexMessage = {
        type: "flex",
        altText: `สรุปยอดประจำวัน (${dateStr})`,
        contents: { type: "bubble", body: { type: "box", layout: "vertical", contents: contents } }
    };

    // ส่งไป LINE
    await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ to: TARGET_ID, messages: [flexMessage] }),
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}