import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const submitTransactionService = async ({ cart, transMode, note, user }) => {
  const now = new Date();
  const dateStr = now.toLocaleString('th-TH');

  // 1. บันทึก Firebase (เหมือนเดิม)
  const newTx = {
    type: transMode,
    date: dateStr,
    timestamp: now.getTime(),
    items: cart,
    note: note || '', // กันเหนียว: ถ้าไม่มี note ให้เป็นค่าว่าง
    recorder: user ? user.name : 'Staff',
    recorderEmail: user ? user.email : 'Unknown',
    status: 'pending',
    actualItems: null
  };

  try {
    await addDoc(collection(db, 'transactions'), newTx);

    // 2. ส่ง LINE (ปรับปรุงใหม่: กรองข้อมูลให้สะอาดก่อนส่ง)
    // เราจะสร้าง object ใหม่ที่เอาเฉพาะข้อมูลที่จำเป็นจริงๆ ส่งไป (ตัดขยะทิ้ง)
    const cleanPayload = {
        transMode: transMode,
        note: note || '-',
        user: { name: user ? user.name : 'Staff' },
        dateStr: dateStr,
        cart: cart.map(item => ({
            name: item.name,
            qty: item.qty,
            unit: item.unit
        }))
    };

    console.log("🚀 Sending Payload to API:", cleanPayload);

    // ยิงไปที่ API
    const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanPayload)
    });

    if (!res.ok) {
        console.error("❌ API Error:", res.status);
    } else {
        console.log("✅ API Success");
    }

    return { success: true };

  } catch (error) {
    console.error("Service Error:", error);
    throw error;
  }
};