// app/services/transactionService.js
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
    note: note,
    recorder: user ? user.name : 'Staff',
    recorderEmail: user ? user.email : 'Unknown',
    status: 'pending',
    actualItems: null
  };

  try {
    await addDoc(collection(db, 'transactions'), newTx);

    // 2. ส่ง LINE (นี่คือส่วนที่ขาดหายไปครับ)
    let msg = `🔔 มีรายการใหม่ (รอตรวจสอบ)\n`;
    msg += `----------------------------\n`;
    msg += `📦 ประเภท: ${transMode === 'IN' ? '📥 รับสินค้าเข้า' : '📤 เบิกสินค้าออก'}\n`;
    msg += `👤 โดย: ${user ? user.name : 'Staff'}\n`;
    msg += `🕒 เวลา: ${dateStr}\n`;
    msg += `----------------------------\n`;
    msg += `รายการสินค้า:\n`;
    cart.forEach(item => {
        msg += `• ${item.name}: ${item.qty} ${item.unit}\n`;
    });
    if (note) msg += `\n📝 หมายเหตุ: ${note}\n`;
    msg += `----------------------------\n`;
    msg += `🔗 โปรดตรวจสอบในระบบ`;

    // ยิงไปที่ API หลังบ้าน
    await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg })
    });

    return { success: true };

  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};