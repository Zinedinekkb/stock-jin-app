import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const submitTransactionService = async ({ cart, transMode, note, user }) => {
  console.log("🟢 [Service] เริ่มทำงาน..."); 

  const now = new Date();
  const dateStr = now.toLocaleString('th-TH');

  // 1. บันทึก Firebase (เหมือนเดิม)
  const newTx = {
    type: transMode,
    date: dateStr,
    timestamp: now.getTime(),
    items: cart,
    note: note,
    recorder: user ? user.name : 'Staff',
    recorderEmail: user ? user.email : 'Unknown',
    status: 'pending',
    actualItems: null
  };

  try {
    await addDoc(collection(db, 'transactions'), newTx);
    console.log("✅ บันทึก Firebase สำเร็จ");

    // 2. ส่งข้อมูลไป API (แก้ตรงนี้! ส่งไปทั้งก้อนเลย เดี๋ยวให้ API ไปจัดสวยๆ เอง)
    console.log("🟠 กำลังส่งข้อมูลดิบไป API...");
    
    await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            cart, 
            transMode, 
            note, 
            user,
            dateStr 
        })
    });

    console.log("✅ ส่งข้อมูลสำเร็จ");
    return { success: true };

  } catch (error) {
    console.error("🔴 Error:", error);
    throw error;
  }
};