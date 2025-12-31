import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        // รับข้อมูลทั้งหมดมาก่อน
        const body = await request.json();
        const { message, cart, transMode, note, user, dateStr } = body;

        const CHANNEL_ACCESS_TOKEN = process.env.LINE_ACCESS_TOKEN;
        const TARGET_ID = process.env.LINE_GROUP_ID || process.env.LINE_USER_ID;

        if (!CHANNEL_ACCESS_TOKEN || !TARGET_ID) {
            return NextResponse.json({ error: 'Config missing' }, { status: 500 });
        }

        let linePayload = {};

        // ==========================================
        // กรณีที่ 1: ส่งข้อความธรรมดา (เช่น รายงานสรุปยอด)
        // ==========================================
        if (message && !cart) {
            linePayload = {
                to: TARGET_ID,
                messages: [{ type: 'text', text: message }]
            };
        }
        // ==========================================
        // กรณีที่ 2: มีตะกร้าสินค้า (ทำรายการ รับ/เบิก) -> ส่ง Flex Message
        // ==========================================
        else if (cart && cart.length > 0) {

            // สร้างแถวสินค้า
            const itemRows = cart.map((item) => {
                // คำนวณยอดคงเหลือ (ถ้ามีข้อมูล stock ส่งมา)
                let remainingText = "";
                if (item.stock !== undefined && item.qty !== undefined) {
                    const current = parseInt(item.stock) || 0;
                    const change = parseInt(item.qty) || 0;
                    // คำนวณคร่าวๆ (เพราะ stock จริงอาจเปลี่ยนไปแล้ว)
                    const remaining = transMode === 'IN' ? current + change : current - change;
                    remainingText = `(คงเหลือ ${remaining})`;
                }

                return {
                    type: "box",
                    layout: "horizontal",
                    contents: [
                        { type: "text", text: item.name, size: "sm", color: "#555555", flex: 4, wrap: true },
                        {
                            type: "box",
                            layout: "vertical",
                            flex: 2,
                            contents: [
                                { type: "text", text: `${item.qty} ${item.unit}`, size: "sm", color: "#111111", align: "end", weight: "bold" },
                                { type: "text", text: remainingText, size: "xxs", color: "#888888", align: "end" }
                            ]
                        }
                    ],
                    margin: "sm"
                };
            });

            // กำหนดสีธีม
            const themeColor = transMode === 'IN' ? "#06C755" : "#FF334B";
            const headerTitle = transMode === 'IN' ? "📥 รับสินค้าเข้า" : "📤 เบิกสินค้าออก";

            // สร้าง Flex Message
            const flexMessage = {
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
                                type: "box",
                                layout: "vertical",
                                contents: [
                                    {
                                        type: "box",
                                        layout: "horizontal",
                                        contents: [
                                            { type: "text", text: "ผู้บันทึก", size: "xs", color: "#aaaaaa" },
                                            { type: "text", text: user?.name || "Staff", size: "xs", color: "#111111", align: "end" }
                                        ]
                                    },
                                    {
                                        type: "box",
                                        layout: "horizontal",
                                        contents: [
                                            { type: "text", text: "เวลา", size: "xs", color: "#aaaaaa" },
                                            { type: "text", text: dateStr || new Date().toLocaleString('th-TH'), size: "xs", color: "#111111", align: "end" }
                                        ],
                                        margin: "xs"
                                    }
                                ]
                            },
                            { type: "separator", margin: "lg" },
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
                    footer: {
                        type: "box",
                        layout: "vertical",
                        contents: [
                            {
                                type: "button",
                                action: { type: "uri", label: "ตรวจสอบในระบบ", uri: "https://stock-jin-app.vercel.app/" },
                                style: "primary",
                                color: themeColor,
                                height: "sm"
                            }
                        ]
                    }
                }
            };

            linePayload = {
                to: TARGET_ID,
                messages: [flexMessage]
            };
        } else {
            // กรณีไม่มีทั้ง message และ cart
            return NextResponse.json({ error: 'No data to send' }, { status: 400 });
        }

        // --- ส่งไป LINE ---
        const response = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
            },
            body: JSON.stringify(linePayload),
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("Line API Error:", errText);
            return NextResponse.json({ error: 'Failed to send to LINE' }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Server Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}