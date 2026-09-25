// app/services/taskService.js
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { db } from '../../lib/firebase.js';

// ============================================
// แม่แบบงานประจำวันเริ่มต้นตามตำแหน่งงาน (Default Routine Checklist)
// ============================================
export const DEFAULT_ROUTINE_TEMPLATES = [
  // 1. เจ้าหน้าที่สต็อก / คลังสินค้า (Warehouse & Stock)
  {
    title: '📦 ตรวจนับสต็อกเปิดกะ / ตรวจสอบสินค้าสำคัญ',
    description: 'ตรวจนับสินค้าขายดีและสินค้ามูลค่าสูงในคลัง เปรียบเทียบกับยอดในระบบก่อนเริ่มงาน',
    type: 'routine',
    category: 'warehouse',
    targetType: 'position',
    targetPosition: 'เจ้าหน้าที่สต็อก',
    targetDepartment: 'warehouse',
    priority: 'high',
    dueTime: '10:00',
    status: 'pending',
    isRoutine: true,
  },
  {
    title: '📥 ตรวจรับสินค้าเข้าคลัง และตรวจนับตามใบส่งของ (PO)',
    description: 'ตรวจสอบความถูกต้องของสินค้าที่นำส่ง ตรวจสภาพบรรจุภัณฑ์ วันหมดอายุ และลงบันทึกรับเข้าคลัง',
    type: 'routine',
    category: 'warehouse',
    targetType: 'position',
    targetPosition: 'เจ้าหน้าที่สต็อก',
    targetDepartment: 'warehouse',
    priority: 'high',
    dueTime: '13:00',
    status: 'pending',
    isRoutine: true,
  },
  {
    title: '🏷️ ตรวจสอบป้ายชื่อ บาร์โค้ด และจัดเรียงสินค้าเข้าเชลฟ์',
    description: 'จัดระเบียบชั้นวางสินค้า เติมป้ายราคา บาร์โค้ดสินค้าที่เลือนหาย และแยกสินค้าตามหมวดหมู่',
    type: 'routine',
    category: 'warehouse',
    targetType: 'position',
    targetPosition: 'เจ้าหน้าที่สต็อก',
    targetDepartment: 'warehouse',
    priority: 'normal',
    dueTime: '15:00',
    status: 'pending',
    isRoutine: true,
  },
  {
    title: '⚠️ ตรวจเช็คสินค้าใกล้หมดสต็อก (Safety Stock) และสต็อกติดลบ',
    description: 'ตรวจสอบเมนูแจ้งเตือนสต็อกต่ำ ทำรายการส่งต่อให้ฝ่ายจัดซื้อหรือผู้จัดการเพื่อสั่งสินค้าเพิ่ม',
    type: 'routine',
    category: 'warehouse',
    targetType: 'position',
    targetPosition: 'เจ้าหน้าที่สต็อก',
    targetDepartment: 'warehouse',
    priority: 'high',
    dueTime: '16:30',
    status: 'pending',
    isRoutine: true,
  },
  {
    title: '🔒 ปิดคลังสินค้า ตรวจเช็คประตู หน้าต่าง และระบบความปลอดภัย',
    description: 'ตรวจเช็คความเรียบร้อยของคลังสินค้า ดับไฟ ปิดสวิตช์อุปกรณ์ไฟฟ้า และล็อคประตูคลังให้แน่นหนา',
    type: 'routine',
    category: 'warehouse',
    targetType: 'position',
    targetPosition: 'เจ้าหน้าที่สต็อก',
    targetDepartment: 'warehouse',
    priority: 'urgent',
    dueTime: '18:00',
    status: 'pending',
    isRoutine: true,
  },

  // 2. เชฟ / แม่ครัว / ครัว (Kitchen & Food Prep)
  {
    title: '❄️ ตรวจอุณหภูมิตู้เย็น/แช่แข็ง และเช็คความสดของวัตถุดิบ',
    description: 'บันทึกอุณหภูมิตู้แช่แข็ง (-18°C) และตู้เย็น (0-4°C) ตรวจสอบกลิ่น สภาพ และความสดของวัตถุดิบก่อนปรุงอาหาร',
    type: 'routine',
    category: 'kitchen',
    targetType: 'position',
    targetPosition: 'เชฟ / แม่ครัว',
    targetDepartment: 'kitchen',
    priority: 'urgent',
    dueTime: '08:30',
    status: 'pending',
    isRoutine: true,
  },
  {
    title: '🥩 ตรวจสอบวันหมดอายุวัตถุดิบ และจัดเรียงตามระบบ FIFO',
    description: 'คัดแยกวัตถุดิบใกล้หมดอายุ นำวัตถุดิบเข้ามาก่อนมาใช้ก่อน ป้องกันของเน่าเสียและสูญเปล่าในครัว',
    type: 'routine',
    category: 'kitchen',
    targetType: 'position',
    targetPosition: 'เชฟ / แม่ครัว',
    targetDepartment: 'kitchen',
    priority: 'high',
    dueTime: '10:30',
    status: 'pending',
    isRoutine: true,
  },
  {
    title: '🍳 จัดเตรียมวัตถุดิบและอุปกรณ์ปรุงอาหาร (Mise en Place) ก่อนเปิดรอบ',
    description: 'ล้าง หั่น ชั่งตวงวัตถุดิบหลัก จัดเตรียมเครื่องเทศและภาชนะให้พร้อมสำหรับปรุงอาหารช่วงพีก',
    type: 'routine',
    category: 'kitchen',
    targetType: 'position',
    targetPosition: 'เชฟ / แม่ครัว',
    targetDepartment: 'kitchen',
    priority: 'normal',
    dueTime: '11:00',
    status: 'pending',
    isRoutine: true,
  },
  {
    title: '🔥 ตรวจความสะอาดครัว สเตชั่นทำอาหาร ดับแก๊ส และถอดปลั๊กอุปกรณ์',
    description: 'ทำความสะอาดพื้นผิวเตา ซิงค์ล้างจาน ทิ้งขยะ ปิดวาล์วถังแก๊สให้สนิท และตรวจเช็คปลั๊กไฟก่อนปิดครัว',
    type: 'routine',
    category: 'kitchen',
    targetType: 'position',
    targetPosition: 'เชฟ / แม่ครัว',
    targetDepartment: 'kitchen',
    priority: 'urgent',
    dueTime: '21:00',
    status: 'pending',
    isRoutine: true,
  },

  // 3. แคชเชียร์ / การเงิน / บัญชี (Cashier & Finance)
  {
    title: '💵 ตรวจนับเงินทอนเปิดกะ และตั้งยอดเงินสดในลิ้นชัก',
    description: 'นับเงินสดเงินทอนเริ่มต้นกะ ตรวจสอบความถูกต้องและบันทึกยอดเงินเปิดกะในระบบ',
    type: 'routine',
    category: 'finance',
    targetType: 'position',
    targetPosition: 'แคชเชียร์/การเงิน',
    targetDepartment: 'finance',
    priority: 'urgent',
    dueTime: '09:00',
    status: 'pending',
    isRoutine: true,
  },
  {
    title: '🧾 รวบรวมและตรวจสอบสลิปโอนเงิน / ใบเสร็จรับเงินประจำวัน',
    description: 'รวบรวมหลักฐานการชำระเงิน ตรวจสอบยอดเงินโอนเข้าบัญชีธนาคารกับรายการขายให้ตรงกันทุกออเดอร์',
    type: 'routine',
    category: 'finance',
    targetType: 'position',
    targetPosition: 'แคชเชียร์/การเงิน',
    targetDepartment: 'finance',
    priority: 'normal',
    dueTime: '14:00',
    status: 'pending',
    isRoutine: true,
  },
  {
    title: '📑 ตรวจสอบรายการเบิกค้างชำระ / สรุปยอดลูกหนี้การค้า',
    description: 'ตรวจเช็ครายการเบิกสินค้าที่ยังค้างชำระหรือรอวางบิล แจ้งเตือนฝ่ายที่เกี่ยวข้อง',
    type: 'routine',
    category: 'finance',
    targetType: 'position',
    targetPosition: 'แคชเชียร์/การเงิน',
    targetDepartment: 'finance',
    priority: 'normal',
    dueTime: '16:00',
    status: 'pending',
    isRoutine: true,
  },
  {
    title: '💳 กระทบยอดเงินสด เงินโอน และรายการขายในระบบ',
    description: 'เปรียบเทียบยอดขายรวมจากทุกช่องทางกับเงินสดในมือและยอดเงินในบัญชีธนาคาร (Reconciliation)',
    type: 'routine',
    category: 'finance',
    targetType: 'position',
    targetPosition: 'แคชเชียร์/การเงิน',
    targetDepartment: 'finance',
    priority: 'high',
    dueTime: '17:30',
    status: 'pending',
    isRoutine: true,
  },
  {
    title: '🔒 สรุปยอดเงินปิดกะ บันทึกสมุดบัญชี และจัดเก็บเงินสดในเซฟ',
    description: 'พิมพ์หรือเซฟรายงานสรุปยอดประจำวัน แยกเงินทอนสำหรับวันถัดไป และนำเงินสดเก็บเข้าตู้นิรภัย',
    type: 'routine',
    category: 'finance',
    targetType: 'position',
    targetPosition: 'แคชเชียร์/การเงิน',
    targetDepartment: 'finance',
    priority: 'urgent',
    dueTime: '18:00',
    status: 'pending',
    isRoutine: true,
  },

  // 4. จัดส่ง / โลจิสติกส์ / คลังสินค้า (Shipping & Logistics)
  {
    title: '📋 ตรวจสอบรายการใบเบิกและออเดอร์ที่รอจัดส่งรอบเช้า',
    description: 'ดึงรายการใบสั่งซื้อและใบเบิกที่พร้อมส่ง ตรวจสอบสต็อกว่ามีครบถ้วนก่อนเริ่มแพ็คสินค้า',
    type: 'routine',
    category: 'shipping',
    targetType: 'position',
    targetPosition: 'จัดส่ง/คลัง',
    targetDepartment: 'warehouse',
    priority: 'high',
    dueTime: '09:30',
    status: 'pending',
    isRoutine: true,
  },
  {
    title: '📦 แพ็คพัสดุและติดสติกเกอร์ที่อยู่จัดส่งรอบที่ 1',
    description: 'ห่อกันกระแทก บรรจุกล่องอย่างปลอดภัย ติดสติกเกอร์ที่อยู่และใบปะหน้าให้ถูกต้องครบถ้วน',
    type: 'routine',
    category: 'shipping',
    targetType: 'position',
    targetPosition: 'จัดส่ง/คลัง',
    targetDepartment: 'warehouse',
    priority: 'normal',
    dueTime: '11:30',
    status: 'pending',
    isRoutine: true,
  },
  {
    title: '🚚 ส่งมอบพัสดุให้บริษัทขนส่งรอบเช้า และตรวจรับใบส่งของ',
    description: 'ตรวจนับจำนวนกล่องพัสดุร่วมกับพนักงานขนส่ง และรับใบเสร็จหรือลายเซ็นส่งมอบ',
    type: 'routine',
    category: 'shipping',
    targetType: 'position',
    targetPosition: 'จัดส่ง/คลัง',
    targetDepartment: 'warehouse',
    priority: 'high',
    dueTime: '12:00',
    status: 'pending',
    isRoutine: true,
  },
  {
    title: '📦 ตรวจเช็คและแพ็คพัสดุเตรียมจัดส่งรอบบ่าย/เย็น',
    description: 'เคลียร์ออเดอร์ที่สั่งเข้ามาระหว่างวัน แพ็คสินค้าเตรียมส่งมอบให้ขนส่งรอบตัดรอบเย็น',
    type: 'routine',
    category: 'shipping',
    targetType: 'position',
    targetPosition: 'จัดส่ง/คลัง',
    targetDepartment: 'warehouse',
    priority: 'normal',
    dueTime: '15:30',
    status: 'pending',
    isRoutine: true,
  },
  {
    title: '📍 กรอกเลขพัสดุ (Tracking Number) เข้าระบบและส่งให้ลูกค้า',
    description: 'อัปเดตหมายเลขพัสดุในระบบ แจ้งให้ลูกค้าหรือฝ่ายบริการลูกค้าทราบเพื่อติดตามสถานะ',
    type: 'routine',
    category: 'shipping',
    targetType: 'position',
    targetPosition: 'จัดส่ง/คลัง',
    targetDepartment: 'warehouse',
    priority: 'normal',
    dueTime: '17:00',
    status: 'pending',
    isRoutine: true,
  },

  // 5. ผู้จัดการ / ผู้ดูแลระบบ / เจ้าของ (Management & Admin)
  {
    title: '👥 ตรวจสอบและอนุมัติบัญชีผู้ใช้ใหม่ที่รอดำเนินการ',
    description: 'ตรวจสอบพนักงานใหม่ที่ลงทะเบียน กำหนดตำแหน่งและสิทธิ์การใช้งาน (Admin หรือ Staff)',
    type: 'routine',
    category: 'management',
    targetType: 'position',
    targetPosition: 'ผู้ดูแลระบบ',
    targetDepartment: 'management',
    priority: 'normal',
    dueTime: '10:00',
    status: 'pending',
    isRoutine: true,
  },
  {
    title: '⏱️ ตรวจสอบคำขอลาและการลงเวลาเข้า-ออกงานของพนักงาน',
    description: 'ตรวจสอบคำขอลาพักร้อน/ลาป่วย และตรวจสอบพนักงานที่ลงเวลาทำงานประจำวัน',
    type: 'routine',
    category: 'management',
    targetType: 'position',
    targetPosition: 'ผู้ดูแลระบบ',
    targetDepartment: 'management',
    priority: 'normal',
    dueTime: '11:00',
    status: 'pending',
    isRoutine: true,
  },
  {
    title: '📋 ตรวจสอบและอนุมัติรายการขอเบิก/รับสินค้าค้างยืนยัน',
    description: 'ตรวจสอบความถูกต้องของรายการเบิกสินค้าและรับเข้าในแท็บสถานะรายการ เพื่อให้สต็อกตรงตามจริง',
    type: 'routine',
    category: 'management',
    targetType: 'position',
    targetPosition: 'ผู้ดูแลระบบ',
    targetDepartment: 'management',
    priority: 'high',
    dueTime: '14:00',
    status: 'pending',
    isRoutine: true,
  },
  {
    title: '📊 ตรวจสอบรายงานยอดสต็อกเคลื่อนไหวประจำวัน',
    description: 'ดูรายงานสรุปยอดรับ-จ่ายสินค้า ตรวจเช็คมูลค่าสินค้าคงคลัง และส่งรายงานสรุปเข้า LINE กลุ่ม',
    type: 'routine',
    category: 'management',
    targetType: 'position',
    targetPosition: 'ผู้ดูแลระบบ',
    targetDepartment: 'management',
    priority: 'normal',
    dueTime: '17:30',
    status: 'pending',
    isRoutine: true,
  },
  {
    title: '🎯 ติดตามและประเมินงานที่มอบหมายให้พนักงานแต่ละฝ่าย',
    description: 'ตรวจสอบความคืบหน้าของงานประจำวันและงานด่วนที่มอบหมายให้ลูกทีม ให้คำแนะนำกรณีติดปัญหา',
    type: 'routine',
    category: 'management',
    targetType: 'position',
    targetPosition: 'ผู้ดูแลระบบ',
    targetDepartment: 'management',
    priority: 'high',
    dueTime: '17:45',
    status: 'pending',
    isRoutine: true,
  },

  // 6. หน้าร้าน / บริการ (Storefront & Service)
  {
    title: '🏪 เปิดร้าน ตรวจเช็คความสะอาดและจัดเตรียมพื้นที่หน้าร้าน',
    description: 'เปิดไฟ ป้ายหน้าร้าน ตรวจเช็คความสะอาดเคาน์เตอร์ และความพร้อมของระบบชำระเงิน',
    type: 'routine',
    category: 'service',
    targetType: 'position',
    targetPosition: 'หน้าร้าน / บริการ',
    targetDepartment: 'service',
    priority: 'normal',
    dueTime: '09:00',
    status: 'pending',
    isRoutine: true,
  },
  {
    title: '🛒 จัดเรียงสินค้าหน้าร้านและเติมสินค้าบนชั้นวางให้พร้อมขาย',
    description: 'ตรวจเช็คสินค้าบนชั้นวาง เติมสินค้าที่พร่อง จัดเรียงให้สวยงามและเช็คป้ายราคา',
    type: 'routine',
    category: 'service',
    targetType: 'position',
    targetPosition: 'หน้าร้าน / บริการ',
    targetDepartment: 'service',
    priority: 'normal',
    dueTime: '11:00',
    status: 'pending',
    isRoutine: true,
  },
  {
    title: '🚪 ตรวจเช็คความเรียบร้อย ปิดไฟ แอร์ และล็อคประตูก่อนกลับ',
    description: 'ตรวจเช็คความสะอาดรอบร้าน ปิดอุปกรณ์ไฟฟ้าทั้งหมด และล็อคประตูหน้าร้าน',
    type: 'routine',
    category: 'service',
    targetType: 'position',
    targetPosition: 'หน้าร้าน / บริการ',
    targetDepartment: 'service',
    priority: 'high',
    dueTime: '18:00',
    status: 'pending',
    isRoutine: true,
  },
];

// Helper: ดึงวันที่ปัจจุบันแบบ YYYY-MM-DD ตามเวลาไทย (Asia/Bangkok)
export const getTodayKey = () => {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());
  } catch {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
};

// Helper: ตรวจสอบความสอดคล้องระหว่างข้อมูลผู้ใช้กับตำแหน่งงานที่มอบหมาย
export const matchesUserPosition = (user, task) => {
  if (!user || !task) return false;

  // 1. ระบุพนักงานรายบุคคลเจาะจง
  if (task.targetUserId && (task.targetUserId === user.uid || task.targetUserId === user.id)) {
    return true;
  }

  // 2. มอบหมายให้ทุกคนในร้าน
  if (task.targetType === 'all' || task.targetPosition === 'ทุกคน' || task.targetPosition === 'all') {
    return true;
  }

  // หากระบุรายบุคคลแต่ไม่ใช่ user คนนี้
  if (task.targetType === 'user' && task.targetUserId && task.targetUserId !== user.uid && task.targetUserId !== user.id) {
    return false;
  }

  const userRole = (user.role || '').toLowerCase();
  const userPos = (user.position || '').toLowerCase();
  const targetPos = (task.targetPosition || '').toLowerCase();
  const targetDept = (task.targetDepartment || '').toLowerCase();
  const targetCat = (task.category || '').toLowerCase();

  // ผู้ดูแลระบบ / เจ้าของร้าน / ผู้จัดการ
  const isAdminUser = userRole === 'admin' || 
    userPos.includes('admin') || 
    userPos.includes('ผู้ดูแลระบบ') || 
    userPos.includes('ผู้จัดการ') || 
    userPos.includes('เจ้าของ') || 
    userPos.includes('owner');

  const isMgmtTask = targetDept === 'management' || 
    targetCat === 'management' || 
    targetPos.includes('บริหาร') || 
    targetPos.includes('ผู้ดูแลระบบ') || 
    targetPos.includes('admin') || 
    targetPos.includes('ผู้จัดการ');

  if (isAdminUser && isMgmtTask) {
    return true;
  }

  // การเทียบ string โดยตรง
  if (targetPos && userPos) {
    if (userPos.includes(targetPos) || targetPos.includes(userPos)) return true;
  }

  // คลัสเตอร์ตำแหน่งงานในร้านค้า / ร้านอาหาร / คลัง
  const CLUSTERS = {
    kitchen: ['เชฟ', 'แม่ครัว', 'ครัว', 'ผู้ช่วยเชฟ', 'cook', 'chef', 'kitchen'],
    warehouse: ['สต็อก', 'คลัง', 'stock', 'warehouse', 'พัสดุ', 'คุมสต็อก'],
    finance: ['แคชเชียร์', 'การเงิน', 'บัญชี', 'cashier', 'finance', 'accounting'],
    service: ['เสิร์ฟ', 'หน้าร้าน', 'บริการ', 'service', 'waiter', 'waitress', 'บาริสต้า', 'ต้อนรับ'],
    shipping: ['ส่ง', 'จัดส่ง', 'โลจิสติกส์', 'ไรเดอร์', 'delivery', 'logistics', 'ขนส่ง', 'พัสดุ'],
    management: ['ผู้จัดการ', 'บริหาร', 'admin', 'ผู้ดูแลระบบ', 'manager', 'owner', 'เจ้าของ', 'หัวหน้า'],
  };

  for (const [clusterKey, keywords] of Object.entries(CLUSTERS)) {
    const userInCluster = keywords.some(k => userPos.includes(k));
    if (!userInCluster) continue;

    if (targetDept === clusterKey || targetCat === clusterKey) return true;
    if (keywords.some(k => targetPos.includes(k))) return true;
  }

  return false;
};

// Helper: ตรวจสอบว่างานนี้ถือว่าเสร็จสิ้นแล้วหรือไม่ (สำหรับแสดงผล checkbox)
export const isTaskDone = (task, todayKey = getTodayKey()) => {
  if (!task) return false;
  if (task.isRoutine || task.type === 'routine') {
    return Boolean(
      task.completedDates?.[todayKey] || 
      (task.lastCompletedDate === todayKey && task.status === 'completed')
    );
  }
  return task.status === 'completed';
};

// Helper: ตรวจสอบว่างานนี้ถูกทำให้เสร็จสิ้นในวันนี้หรือไม่ (สำหรับสถิติสรุปงานประจำวัน)
export const isTaskCompletedToday = (task, todayKey = getTodayKey()) => {
  if (!task) return false;
  if (task.isRoutine || task.type === 'routine') {
    return Boolean(
      task.completedDates?.[todayKey] || 
      (task.lastCompletedDate === todayKey && task.status === 'completed')
    );
  }
  if (task.status !== 'completed') return false;
  if (task.completedAt) {
    const compDate = new Date(task.completedAt);
    const y = compDate.getFullYear();
    const m = String(compDate.getMonth() + 1).padStart(2, '0');
    const d = String(compDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}` === todayKey;
  }
  return task.dueDate === todayKey;
};

// ============================================
// ฟังก์ชันจัดการ Firebase Firestore สำหรับ Tasks
// ============================================

// ส่งแจ้งเตือน LINE สำหรับงานที่มอบหมาย (ถ้ามี LINE Webhook พร้อมใช้งาน)
export const notifyTaskAssigned = async (task, currentUser) => {
  try {
    const targetLabel = task.targetType === 'user' 
      ? (task.targetUserName || 'พนักงาน') 
      : (task.targetPosition || 'ทุกคน');
    const priorityIcon = task.priority === 'urgent' ? '🔴 [ด่วนมาก]' : task.priority === 'high' ? '🟡 [สำคัญ]' : '📋';
    const message = `${priorityIcon} มอบหมายงาน: ${task.title}\nผู้รับผิดชอบ: ${targetLabel}\nกำหนด: ${task.dueDate || 'วันนี้'} ${task.dueTime ? task.dueTime + ' น.' : ''}\nสั่งโดย: ${currentUser?.name || 'ผู้ดูแลระบบ'}${task.description ? '\nรายละเอียด: ' + task.description : ''}`;

    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
  } catch (err) {
    // Non-blocking error
    console.warn('Could not send LINE notification for task:', err);
  }
};

// 1. เพิ่มงานใหม่ (มอบหมายงาน หรือ งานประจำวัน)
export const createTask = async (taskData, currentUser) => {
  const now = Date.now();
  const newTask = {
    title: (taskData.title || '').trim(),
    description: (taskData.description || '').trim(),
    type: taskData.type || 'assigned',
    isRoutine: taskData.type === 'routine' || Boolean(taskData.isRoutine),
    category: taskData.category || 'general',
    targetType: taskData.targetType || 'position',
    targetPosition: taskData.targetPosition || 'ทุกคน',
    targetDepartment: taskData.targetDepartment || 'general',
    targetUserId: taskData.targetUserId || null,
    targetUserName: taskData.targetUserName || null,
    targetUserPhoto: taskData.targetUserPhoto || null,
    priority: taskData.priority || 'normal',
    dueDate: taskData.dueDate || getTodayKey(),
    dueTime: taskData.dueTime || '',
    status: 'pending',
    completedDates: {},
    completedAt: null,
    completedBy: null,
    completedByName: null,
    completionNote: '',
    createdAt: now,
    createdBy: currentUser?.uid || 'system',
    createdByName: currentUser?.name || 'ผู้ใช้งาน',
    updatedAt: now,
  };

  const docRef = await addDoc(collection(db, 'tasks'), newTask);
  return { id: docRef.id, ...newTask };
};

// 2. อัปเดตงาน
export const updateTask = async (taskId, updateData, currentUser) => {
  const taskRef = doc(db, 'tasks', taskId);
  const data = {
    ...updateData,
    updatedAt: Date.now(),
    updatedBy: currentUser?.uid || 'user',
    updatedByName: currentUser?.name || 'ผู้ใช้งาน',
  };
  await updateDoc(taskRef, data);
  return { id: taskId, ...data };
};

// 3. สลับสถานะเสร็จสิ้น / ไม่เสร็จ (Toggle Completion)
export const toggleTaskCompletion = async (task, currentUser, note = '') => {
  const taskRef = doc(db, 'tasks', task.id);
  const todayKey = getTodayKey();
  const now = Date.now();
  const isDone = isTaskDone(task, todayKey);

  if (task.isRoutine || task.type === 'routine') {
    const existingDates = { ...(task.completedDates || {}) };
    if (isDone) {
      delete existingDates[todayKey];
      const remainingDates = Object.keys(existingDates).sort();
      const lastDate = remainingDates.length > 0 ? remainingDates[remainingDates.length - 1] : null;
      await updateDoc(taskRef, {
        completedDates: existingDates,
        status: 'pending',
        lastCompletedDate: lastDate,
        updatedAt: now,
      });
    } else {
      existingDates[todayKey] = {
        completedAt: now,
        completedBy: currentUser?.uid || 'unknown',
        completedByName: currentUser?.name || 'พนักงาน',
        note: note || '',
      };
      await updateDoc(taskRef, {
        completedDates: existingDates,
        status: 'completed',
        lastCompletedDate: todayKey,
        completedAt: now,
        completedBy: currentUser?.uid || 'unknown',
        completedByName: currentUser?.name || 'พนักงาน',
        completionNote: note || '',
        updatedAt: now,
      });
    }
  } else {
    if (task.status === 'completed') {
      await updateDoc(taskRef, {
        status: 'pending',
        completedAt: null,
        completedBy: null,
        completedByName: null,
        completionNote: '',
        updatedAt: now,
      });
    } else {
      await updateDoc(taskRef, {
        status: 'completed',
        completedAt: now,
        completedBy: currentUser?.uid || 'unknown',
        completedByName: currentUser?.name || 'พนักงาน',
        completionNote: note || task.completionNote || '',
        updatedAt: now,
      });
    }
  }
};

// 4. เปลี่ยนสถานะงานเสริม (เช่น กำลังดำเนินการ)
export const setTaskStatus = async (taskId, status, currentUser) => {
  const taskRef = doc(db, 'tasks', taskId);
  await updateDoc(taskRef, {
    status,
    updatedAt: Date.now(),
    updatedBy: currentUser?.uid || 'user',
  });
};

// 5. ลบงาน
export const deleteTask = async (taskId) => {
  const taskRef = doc(db, 'tasks', taskId);
  await deleteDoc(taskRef);
};

// 6. โหลดชุดงานประจำวันเริ่มต้นเข้า Firestore (Seed Templates)
export const seedDefaultRoutineTasks = async (currentUser) => {
  const results = [];
  for (const template of DEFAULT_ROUTINE_TEMPLATES) {
    const created = await createTask(template, currentUser);
    results.push(created);
  }
  return results;
};
