import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const submitTransactionService = async ({ cart, transMode, note, user }) => {
  const now = new Date();
  const dateStr = now.toLocaleString('th-TH');

  // 1. บันทึก Firebase (บันทึกทุกกรณี ทั้ง IN และ OUT)
  const newTx = {
    type: transMode,
    date: dateStr,
    timestamp: now.getTime(),
    items: cart,
    note: note || '',
    recorder: user ? user.name : 'Staff',
    recorderEmail: user ? user.email : 'Unknown',
    status: 'pending',
    actualItems: null
  };

  try {
    await addDoc(collection(db, 'transactions'), newTx);

    // 2. ส่ง LINE (*** แก้ไข: ส่งเฉพาะตอน IN เท่านั้น ***)
    if (transMode === 'IN') { 
        const cleanPayload = {
            transMode: transMode,
            note: note || '-',
            user: { name: user ? user.name : 'Staff' },
            dateStr: dateStr,
            cart: cart.map(item => ({
                name: item.name,
                qty: item.qty,
                unit: item.unit,
                currentStock: item.stock || 0
            }))
        };

        await fetch('/api/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cleanPayload)
        });
    }
    // (ถ้าเป็น OUT บรรทัดข้างบนจะไม่ทำงาน คือไม่ส่งไลน์ แต่บันทึกลง database ปกติ)

    return { success: true };

  } catch (error) {
    console.error("Service Error:", error);
    throw error;
  }
};

// --- บริการส่งรายงานสต็อก (คงเดิม) ---
export const sendStockReportService = async ({ categories, products, user }) => {
    const dateStr = new Date().toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' });
    
    try {
        const res = await fetch('/api/stock-report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ categories, products, user, dateStr })
        });

        if (!res.ok) throw new Error('API Failed');
        return { success: true };
    } catch (error) {
        console.error("Stock Report Error:", error);
        throw error;
    }
};

// --- บริการส่งสรุปยอดประจำวัน (คงเดิม) ---
export const sendDailyReportService = async (payload) => {
    try {
        const res = await fetch('/api/daily-report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('API Failed');
        return { success: true };
    } catch (error) {
        console.error("Daily Report Error:", error);
        throw error;
    }
};