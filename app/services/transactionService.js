import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const submitTransactionService = async ({ cart, transMode, note, user }) => {
  const now = new Date();
  const dateStr = now.toLocaleString('th-TH');

  // 1. บันทึก Firebase
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

    // 2. ส่ง LINE (Transaction)
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

    await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanPayload)
    });

    return { success: true };

  } catch (error) {
    console.error("Service Error:", error);
    throw error;
  }
};

// --- [ฟังก์ชันใหม่] ส่งรายงานสต็อกเข้า LINE ---
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