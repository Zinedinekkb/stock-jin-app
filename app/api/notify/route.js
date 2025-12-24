import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        const { message, cart, transMode, note, user, dateStr } = body;

        // 1. เช็คกุญแจ (Environment Variables)
        const CHANNEL_ACCESS_TOKEN = process.env.LINE_ACCESS_TOKEN;
        const TARGET_ID = process.env.LINE_GROUP_ID || process.env.LINE_USER_ID;

        // console.log("🔑 Checking Keys..."); // (ปิดไว้กันรก)

        if (!CHANNEL_ACCESS_TOKEN) {
            console.error("❌ Error: Missing LINE_ACCESS_TOKEN");
            return NextResponse.json({ error: 'Missing Access Token' }, { status: 500 });
        }
        if (!TARGET_ID) {
            console.error("❌ Error: Missing LINE_USER_ID or LINE_GROUP_ID");
            return NextResponse.json({ error: 'Missing Target ID' }, { status: 500 });
        }

        let linePayload = {};

        // 2. จัดเตรียมข้อมูลส่ง LINE
        if (message && !cart) {
            // --- กรณี: รายงานสรุป (Text Message) ---
            console.log("📝 Preparing Text Message...");
            linePayload = {
                to: TARGET_ID,
                messages: [{ type: 'text', text: message }]
            };

        } else if (cart && Array.isArray(cart)) {
            // --- กรณี: เบิก/รับของ (Flex Message) ---
            console.log("📦 Preparing Flex Message...");

            // สร้างแถวสินค้า (ป้องกัน Error ถ้าข้อมูลไม่ครบ)
            const itemRows = cart.map((item) => {
                // ตรวจสอบค่าว่าง
                const name = item.name || "สินค้าไม่ระบุชื่อ";
                const qty = item.qty || 0;
                const unit = item.unit || "ชิ้น";

                // *หมายเหตุ: ตัดบรรทัดคำนวณคงเหลือออกก่อน เพื่อลดโอกาส Error*

                return {
                    type: "box",
                    layout: "horizontal",
                    contents: [
                        { type: "text", text: name, size: "sm", color: "#555555", flex: 4, wrap: true },
                        { type: "text", text: `${qty} ${unit}`, size: "sm", color: "#111111", align: "end", weight: "bold", flex: 2 }
                    ],
                    margin: "sm"
                };
            });

            const themeColor = transMode === 'IN' ? "#06C755" : "#FF334B";
            const headerTitle = transMode === 'IN' ? "📥 รับสินค้าเข้า" : "📤 เบิกสินค้าออก";
            const recorderName = user?.name || "Staff";
            const timeStr = dateStr || new Date().toLocaleString('th-TH');

            linePayload = {
                to: TARGET_ID,
                messages: [{
                    type: "flex",
                    altText: `รายการใหม่: ${headerTitle}`,
                    contents: {
                        type: "bubble",
                        size: "giga",
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
                                {
                                    type: "box", layout: "vertical",
                                    contents: [
                                        { type: "box", layout: "horizontal", contents: [{ type: "text", text: "ผู้บันทึก", size: "xs", color: "#aaaaaa" }, { type: "text", text: recorderName, size: "xs", color: "#111111", align: "end" }] },
                                        { type: "box", layout: "horizontal", contents: [{ type: "text", text: "เวลา", size: "xs", color: "#aaaaaa" }, { type: "text", text: timeStr, size: "xs", color: "#111111", align: "end" }], margin: "xs" }
                                    ]
                                },
                                { type: "separator", margin: "lg" },
                                {
                                    type: "box", layout: "vertical", margin: "lg", spacing: "xs",
                                    contents: [
                                        { type: "text", text: "รายการสินค้า", weight: "bold", size: "sm", margin: "md", color: themeColor },
                                        ...itemRows
                                    ]
                                },
                                // ใส่ Note เฉพาะถ้ามี
                                ...(note ? [{ type: "separator", margin: "lg" }, { type: "box", layout: "vertical", margin: "lg", contents: [{ type: "text", text: "📝 หมายเหตุ:", size: "xs", color: "#aaaaaa" }, { type: "text", text: note, size: "sm", color: "#555555", wrap: true }] }] : [])
                            ]
                        }
                    }
                }]
            };
        } else {
            console.error("❌ Error: Invalid Payload (No message or cart)");
            return NextResponse.json({ error: 'No data to send' }, { status: 400 });
        }

        // 3. ส่งไป LINE API
        // console.log("🚀 Sending to LINE API...");
        const response = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
            },
            body: JSON.stringify(linePayload),
        });

        // 4. เช็คผลลัพธ์จาก LINE (สำคัญมาก!)
        if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ LINE API Error:", errorText); // <--- บรรทัดนี้จะบอกว่าผิดตรงไหน
            return NextResponse.json({ error: 'LINE API Failed', details: errorText }, { status: 500 });
        }

        console.log("✅ LINE API Success");
        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("❌ Server Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}