import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { categories, products, user, dateStr } = await request.json();
    const CHANNEL_ACCESS_TOKEN = process.env.LINE_ACCESS_TOKEN;
    
    // --- [แก้ไขจุดสำคัญ] ---
    // ให้เช็คว่ามี Group ID ไหม? ถ้ามีให้ใช้ Group ก่อน ถ้าไม่มีให้ใช้ User ID
    const TARGET_ID = process.env.LINE_GROUP_ID || process.env.LINE_USER_ID;

    // เช็คว่าค่า Config มาครบไหม
    if (!CHANNEL_ACCESS_TOKEN || !TARGET_ID) {
        console.error("Missing Config: Token or Target ID not found");
        return NextResponse.json({ error: 'Config missing' }, { status: 500 });
    }

    // --- สร้าง Flex Message ---
    const contents = [];

    // 1. หัวข้อ
    contents.push({
      type: "text", text: "📦 สรุปสต็อกคงเหลือ", weight: "bold", size: "xl", color: "#1DB446", margin: "md"
    });
    contents.push({
      type: "text", text: `📅 ข้อมูล ณ ${dateStr}`, size: "xs", color: "#aaaaaa", margin: "xs"
    });
    contents.push({ type: "separator", margin: "lg" });

    // 2. วนลูปสร้างรายการตามหมวดหมู่
    categories.forEach(cat => {
       const catProducts = products
          .filter(p => p.category === cat.name)
          .sort((a, b) => (a.order || 0) - (b.order || 0));

       if (catProducts.length > 0) {
          // ชื่อหมวด
          contents.push({
             type: "text", text: cat.name, weight: "bold", size: "sm", margin: "lg", color: "#333333", decoration: "underline"
          });

          // รายการสินค้า
          catProducts.forEach(p => {
             const isOutOfStock = p.stock === 0;
             contents.push({
                type: "box", layout: "horizontal", margin: "sm",
                contents: [
                   { type: "text", text: p.name, size: "sm", color: isOutOfStock ? "#aaaaaa" : "#555555", flex: 4, wrap: true },
                   { type: "text", text: isOutOfStock ? "หมด" : `${p.stock} ${p.unit}`, size: "sm", color: isOutOfStock ? "#ff0000" : "#111111", align: "end", flex: 2, weight: isOutOfStock ? "bold" : "regular" }
                ]
             });
          });
          contents.push({ type: "separator", margin: "sm" });
       }
    });

    // 3. สินค้าไม่มีหมวด (ถ้ามี)
    const noCatProducts = products.filter(p => !p.category);
    if (noCatProducts.length > 0) {
        contents.push({ type: "text", text: "⚠️ อื่นๆ", weight: "bold", size: "sm", margin: "lg", color: "#333333" });
        noCatProducts.forEach(p => {
             contents.push({
                type: "box", layout: "horizontal", margin: "sm",
                contents: [
                   { type: "text", text: p.name, size: "sm", color: "#555555", flex: 4 },
                   { type: "text", text: `${p.stock} ${p.unit}`, size: "sm", color: "#111111", align: "end", flex: 2 }
                ]
             });
        });
    }

    // 4. ส่วนท้าย
    contents.push({
       type: "box", layout: "vertical", margin: "lg",
       contents: [
          { type: "text", text: `รายงานโดย: ${user ? user.name : 'System'}`, size: "xs", color: "#aaaaaa", align: "center" }
       ]
    });

    const flexMessage = {
        type: "flex",
        altText: "สรุปยอดสต็อกสินค้า",
        contents: {
            type: "bubble",
            body: {
                type: "box", layout: "vertical", contents: contents
            }
        }
    };

    // ส่งไป LINE (ใช้ TARGET_ID)
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ 
          to: TARGET_ID, // <--- ใช้ตัวแปรนี้แทน USER_ID
          messages: [flexMessage] 
      }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("LINE API Error:", errorText); // ดู log Error จาก LINE
        return NextResponse.json({ error: 'Failed to send to LINE' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Server Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}