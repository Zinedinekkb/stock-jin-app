// lib/demo/seed.js
// Demo data (Thai). Everything is relative to "now" so the demo always looks current.
// Returns { collectionName: { docId: data } }. No settings/branding on purpose (defaults show).

const DAY = 24 * 60 * 60 * 1000;

// Small deterministic PRNG so the demo looks the same on every load
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function buildSeed({ Timestamp, now = Date.now() } = {}) {
  const rand = rng(20240607);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const ts = (ms) => Timestamp.fromMillis(ms);
  const at = (daysAgo, hour, minute = 0) => {
    const d = new Date(now - daysAgo * DAY);
    d.setHours(hour, minute, 0, 0);
    return d;
  };

  // ---------- users ----------
  const users = {
    'demo-admin': {
      name: 'ผู้ดูแลระบบ (เดโม)', email: 'demo@example.com', role: 'admin', position: 'ผู้ดูแลระบบ',
      status: 'approved', photoURL: null, provider: 'password', department: 'ฝ่ายบริหาร', phone: '081-234-5678',
      createdAt: ts(now - 120 * DAY),
    },
    'demo-staff-1': {
      name: 'สมชาย ใจดี', email: 'somchai@example.com', role: 'staff', position: 'เจ้าหน้าที่สต็อก',
      status: 'approved', photoURL: null, provider: 'password', department: 'ฝ่ายคลังสินค้าและการจัดส่ง', phone: '082-345-6789',
      createdAt: ts(now - 90 * DAY),
    },
    'demo-staff-2': {
      name: 'สุดา รักงาน', email: 'suda@example.com', role: 'staff', position: 'พนักงานแคชเชียร์',
      status: 'approved', photoURL: null, provider: 'password', department: 'ฝ่ายการเงินและบัญชี', phone: '083-456-7890',
      createdAt: ts(now - 60 * DAY),
    },
    'demo-staff-3': {
      name: 'ประเสริฐ มั่นคง', email: 'prasert@example.com', role: 'staff', position: 'พนักงานเสิร์ฟ',
      status: 'approved', photoURL: null, provider: 'password', department: 'ฝ่ายบริการ', phone: '084-567-8901',
      createdAt: ts(now - 30 * DAY),
    },
    'demo-pending-1': {
      name: 'วิไล สมัครใหม่', email: 'wilai@example.com', role: 'staff', position: 'พนักงานทั่วไป',
      status: 'pending', photoURL: null, provider: 'password',
      createdAt: ts(now - 1 * DAY),
    },
  };

  // ---------- categories ----------
  const cats = [
    ['cat-food', 'วัตถุดิบอาหาร', '#16a34a'],
    ['cat-drink', 'เครื่องดื่ม', '#2563eb'],
    ['cat-pack', 'บรรจุภัณฑ์', '#f59e0b'],
    ['cat-clean', 'อุปกรณ์ทำความสะอาด', '#0d9488'],
    ['cat-office', 'เครื่องเขียนและสำนักงาน', '#9333ea'],
  ];
  const categories = {};
  cats.forEach(([id, name, color]) => { categories[id] = { name, color }; });
  const catName = Object.fromEntries(cats.map(([id, name]) => [id, name]));

  // ---------- products ----------
  // [id, name, sku, unit, stock, minStock, category]
  const prodRows = [
    ['p01', 'ข้าวหอมมะลิ 5 กก.', 'FD-001', 'ถุง', 42, 10, 'cat-food'],
    ['p02', 'น้ำมันพืช 1 ลิตร', 'FD-002', 'ขวด', 8, 12, 'cat-food'],
    ['p03', 'น้ำตาลทราย 1 กก.', 'FD-003', 'ถุง', 35, 15, 'cat-food'],
    ['p04', 'เกลือป่น 500 กรัม', 'FD-004', 'ถุง', 60, 10, 'cat-food'],
    ['p05', 'ไข่ไก่ เบอร์ 2 (แผง 30 ฟอง)', 'FD-005', 'แผง', 4, 10, 'cat-food'],
    ['p06', 'ซอสหอยนางรม 600 มล.', 'FD-006', 'ขวด', 18, 6, 'cat-food'],
    ['p07', 'น้ำปลา 700 มล.', 'FD-007', 'ขวด', 3, 8, 'cat-food'],
    ['p08', 'น้ำดื่ม 600 มล. (แพ็ค 12)', 'DR-001', 'แพ็ค', 55, 20, 'cat-drink'],
    ['p09', 'น้ำอัดลม 325 มล. (แพ็ค 6)', 'DR-002', 'แพ็ค', 24, 10, 'cat-drink'],
    ['p10', 'ชาไทยพร้อมชง 400 กรัม', 'DR-003', 'ถุง', 12, 5, 'cat-drink'],
    ['p11', 'เมล็ดกาแฟคั่ว 1 กก.', 'DR-004', 'ถุง', 5, 6, 'cat-drink'],
    ['p12', 'นมสดพาสเจอร์ไรส์ 1 ลิตร', 'DR-005', 'กล่อง', 2, 12, 'cat-drink'],
    ['p13', 'แก้วพลาสติก 16 ออนซ์ (แพ็ค 50)', 'PK-001', 'แพ็ค', 30, 10, 'cat-pack'],
    ['p14', 'ฝาปิดแก้ว (แพ็ค 100)', 'PK-002', 'แพ็ค', 14, 8, 'cat-pack'],
    ['p15', 'กล่องข้าวกระดาษ (แพ็ค 25)', 'PK-003', 'แพ็ค', 6, 8, 'cat-pack'],
    ['p16', 'ถุงหูหิ้ว 8x16 นิ้ว (กก.)', 'PK-004', 'กก.', 22, 5, 'cat-pack'],
    ['p17', 'หลอดกระดาษ (กล่อง 250)', 'PK-005', 'กล่อง', 9, 4, 'cat-pack'],
    ['p18', 'น้ำยาล้างจาน 3.6 ลิตร', 'CL-001', 'แกลลอน', 7, 3, 'cat-clean'],
    ['p19', 'ผ้าเช็ดอเนกประสงค์ (แพ็ค 3)', 'CL-002', 'แพ็ค', 16, 5, 'cat-clean'],
    ['p20', 'ถุงขยะดำ 30x40 นิ้ว (แพ็ค)', 'CL-003', 'แพ็ค', 1, 6, 'cat-clean'],
    ['p21', 'น้ำยาถูพื้น 5 ลิตร', 'CL-004', 'แกลลอน', 11, 3, 'cat-clean'],
    ['p22', 'กระดาษความร้อน 57 มม. (ม้วน)', 'OF-001', 'ม้วน', 40, 15, 'cat-office'],
    ['p23', 'ปากกาลูกลื่นสีน้ำเงิน (กล่อง 50)', 'OF-002', 'กล่อง', 4, 3, 'cat-office'],
    ['p24', 'สมุดบันทึกปกแข็ง A5', 'OF-003', 'เล่ม', 27, 8, 'cat-office'],
    ['p25', 'เทปใส 1 นิ้ว (แพ็ค 6)', 'OF-004', 'แพ็ค', 13, 4, 'cat-office'],
  ];
  const products = {};
  const prodById = {};
  prodRows.forEach(([id, name, sku, unit, stock, minStock, cat], i) => {
    const p = { name, sku, unit, stock, minStock, category: catName[cat], order: i, createdAt: ts(now - (100 - i) * DAY) };
    products[id] = p;
    prodById[id] = { id, ...p };
  });

  // ---------- transactions (~40 over the last 30 days) ----------
  const recorders = [
    ['สมชาย ใจดี', 'somchai@example.com'],
    ['สุดา รักงาน', 'suda@example.com'],
    ['ประเสริฐ มั่นคง', 'prasert@example.com'],
  ];
  const noteIn = ['รับของจากซัพพลายเออร์', 'สั่งซื้อรอบประจำสัปดาห์', 'เติมสต็อกก่อนสุดสัปดาห์', ''];
  const noteOut = ['เบิกใช้หน้าร้าน', 'เบิกใช้ในครัว', 'เบิกสำหรับกิจกรรมโปรโมชั่น', 'เบิกประจำวัน', ''];
  const txs = {};
  const COUNT = 40;
  for (let i = 0; i < COUNT; i++) {
    // spread across 30 days, oldest first; a few land on the same day
    const daysAgo = Math.max(0, 29 - Math.floor((i / COUNT) * 30) + (rand() < 0.2 ? 1 : 0));
    const when = at(daysAgo, 8 + Math.floor(rand() * 10), Math.floor(rand() * 60));
    const type = rand() < 0.4 ? 'IN' : 'OUT';
    const nItems = 1 + Math.floor(rand() * 4);
    const chosen = new Set();
    while (chosen.size < nItems) chosen.add(pick(prodRows)[0]);
    const items = [...chosen].map((pid) => {
      const p = prodById[pid];
      const qty = type === 'IN' ? 5 + Math.floor(rand() * 25) : 1 + Math.floor(rand() * 8);
      return { id: pid, name: p.name, sku: p.sku, unit: p.unit, category: p.category, qty };
    });
    const [recorder, recorderEmail] = pick(recorders);
    const isLatest = i >= COUNT - 3; // newest few await verification
    const isCancelled = i === 11 || i === 27;
    const status = isCancelled ? 'cancelled' : isLatest ? 'pending' : 'completed';
    const tx = {
      type,
      date: when.toLocaleString('th-TH'),
      timestamp: when.getTime(),
      items,
      note: pick(type === 'IN' ? noteIn : noteOut),
      recorder,
      recorderEmail,
      status,
      actualItems: null,
    };
    if (status === 'completed') {
      const verifiedAt = new Date(when.getTime() + 30 * 60 * 1000 + Math.floor(rand() * 3) * 3600 * 1000);
      tx.actualItems = Object.fromEntries(items.map((it) => [it.id, it.qty]));
      tx.verifiedBy = 'ผู้ดูแลระบบ (เดโม)';
      tx.verifiedAt = verifiedAt.toLocaleString('th-TH');
      tx.verifiedAtMs = verifiedAt.getTime();
    }
    if (status === 'cancelled') {
      tx.cancelledBy = 'ผู้ดูแลระบบ (เดโม)';
      tx.cancelReason = 'บันทึกผิดรายการ';
    }
    txs[`tx${String(i + 1).padStart(2, '0')}`] = tx;
  }

  // ---------- tasks ----------
  const today = ymd(new Date(now));
  const yesterday = ymd(new Date(now - DAY));
  const tomorrow = ymd(new Date(now + DAY));
  const nextWeek = ymd(new Date(now + 5 * DAY));
  const baseTask = {
    description: '', steps: [], type: 'assigned', isRoutine: false, category: 'general',
    targetType: 'position', targetPosition: 'ทุกคน', targetDepartment: 'general',
    targetUserId: null, targetUserName: null, targetUserEmail: null, targetUserPhoto: null,
    priority: 'normal', dueDate: today, dueTime: '', status: 'pending', completedDates: {},
    completedAt: null, completedBy: null, completedByName: null, completionNote: '',
    createdAt: now - 2 * DAY, createdBy: 'demo-admin', createdByName: 'ผู้ดูแลระบบ (เดโม)', updatedAt: now - DAY,
  };
  const doneToday = (uid, name) => ({ [today]: { completedAt: now - 3 * 3600 * 1000, completedBy: uid, completedByName: name, note: '' } });
  const tasks = {
    t01: {
      ...baseTask, title: '📦 ตรวจนับสต็อกสินค้าหมวดวัตถุดิบ', description: 'นับสินค้าจริงเทียบกับระบบ แล้วบันทึกส่วนต่าง',
      steps: ['นับสินค้าบนชั้นวาง', 'เทียบกับยอดในระบบ', 'แจ้งผู้จัดการหากยอดไม่ตรง'],
      category: 'warehouse', targetPosition: 'เจ้าหน้าที่สต็อก', targetDepartment: 'warehouse', priority: 'high', dueTime: '14:00', status: 'in_progress',
    },
    t02: {
      ...baseTask, title: '🚚 ติดต่อซัพพลายเออร์สั่งน้ำปลาและนมสด', description: 'สินค้าใกล้หมด ต้องสั่งเพิ่มภายในวันนี้',
      category: 'warehouse', targetType: 'user', targetUserId: 'demo-staff-1', targetUserName: 'สมชาย ใจดี', targetUserEmail: 'somchai@example.com',
      targetPosition: 'เจ้าหน้าที่สต็อก', targetDepartment: 'warehouse', priority: 'urgent', dueTime: '11:00',
    },
    t03: {
      ...baseTask, title: '💰 ปิดยอดขายประจำวันและนำฝากธนาคาร', category: 'finance', targetPosition: 'พนักงานแคชเชียร์',
      targetDepartment: 'finance', priority: 'high', dueDate: yesterday, dueTime: '18:00',
    },
    t04: {
      ...baseTask, title: '🧹 ทำความสะอาดห้องเก็บของ', category: 'warehouse', targetPosition: 'เจ้าหน้าที่สต็อก',
      targetDepartment: 'warehouse', dueDate: yesterday, status: 'completed', completedAt: now - DAY + 3 * 3600 * 1000,
      completedBy: 'demo-staff-1', completedByName: 'สมชาย ใจดี', completionNote: 'เรียบร้อย',
    },
    t05: {
      ...baseTask, title: '📋 จัดทำรายงานสรุปสต็อกประจำสัปดาห์', description: 'ส่งให้ผู้จัดการก่อนประชุมวันศุกร์',
      category: 'management', targetPosition: 'ผู้จัดการร้าน', targetDepartment: 'management', priority: 'normal', dueDate: nextWeek,
    },
    t06: {
      ...baseTask, title: '🍱 เตรียมจัดเรียงของสำหรับโปรโมชั่นสุดสัปดาห์', category: 'service', targetPosition: 'พนักงานเสิร์ฟ',
      targetDepartment: 'service', dueDate: tomorrow, dueTime: '09:00', status: 'in_progress',
    },
    t07: {
      ...baseTask, title: '🌅 เปิดร้านและตรวจความพร้อมก่อนเปิดบริการ', type: 'routine', isRoutine: true, category: 'service',
      targetPosition: 'ทุกคน', targetDepartment: 'general', priority: 'high', dueTime: '08:00', status: 'completed',
      completedDates: doneToday('demo-staff-3', 'ประเสริฐ มั่นคง'), lastCompletedDate: today, completedAt: now - 3 * 3600 * 1000,
      completedBy: 'demo-staff-3', completedByName: 'ประเสริฐ มั่นคง',
    },
    t08: {
      ...baseTask, title: '⚠️ ตรวจเช็คสินค้าใกล้หมดสต็อก (Safety Stock)', description: 'ตรวจเมนูแจ้งเตือนสต็อกต่ำ แล้วส่งต่อฝ่ายจัดซื้อ',
      type: 'routine', isRoutine: true, category: 'warehouse', targetPosition: 'เจ้าหน้าที่สต็อก', targetDepartment: 'warehouse',
      priority: 'high', dueTime: '16:30',
    },
    t09: {
      ...baseTask, title: '🔒 ปิดร้าน ตรวจประตู หน้าต่าง และระบบความปลอดภัย', type: 'routine', isRoutine: true, category: 'general',
      targetPosition: 'ทุกคน', targetDepartment: 'general', dueTime: '21:00',
    },
    t10: {
      ...baseTask, title: '📥 ตรวจรับสินค้าเข้าคลังตามใบส่งของ (PO)', type: 'routine', isRoutine: true, category: 'warehouse',
      targetPosition: 'เจ้าหน้าที่สต็อก', targetDepartment: 'warehouse', priority: 'high', dueTime: '13:00',
    },
  };

  // ---------- attendance (last ~12 weekdays for each staff member) ----------
  const attendance = {};
  const attUsers = [
    ['demo-admin', 'ผู้ดูแลระบบ (เดโม)'],
    ['demo-staff-1', 'สมชาย ใจดี'],
    ['demo-staff-2', 'สุดา รักงาน'],
    ['demo-staff-3', 'ประเสริฐ มั่นคง'],
  ];
  let attN = 0;
  for (let back = 0; back < 16; back++) {
    const day = at(back, 0, 0);
    const dow = day.getDay();
    if (dow === 0 || dow === 6) continue;
    for (const [uid, name] of attUsers) {
      if (rand() < 0.12 && back > 0) continue; // occasional absence
      const inH = 8, inM = Math.floor(rand() * 40);
      const outH = 17, outM = Math.floor(rand() * 50);
      const rec = {
        userId: uid,
        userName: name,
        dateStr: day.toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' }),
        dateTimestamp: ts(day.getTime()),
        checkIn: `${pad(inH)}:${pad(inM)}`,
        checkInPhotoURL: null,
        checkInStoragePath: 'inline_base64',
        checkInLocation: null,
        checkOut: back === 0 ? null : `${pad(outH)}:${pad(outM)}`,
        createdAt: ts(at(back, inH, inM).getTime()),
      };
      if (back !== 0) { rec.checkOutPhotoURL = null; rec.checkOutStoragePath = 'inline_base64'; rec.checkOutLocation = null; }
      attendance[`att${++attN}`] = rec;
    }
  }

  // ---------- leaves ----------
  const leaveBase = (uid, name, position, department) => ({ userId: uid, createdByUid: uid, userName: name, userPosition: position, department, phone: '' });
  const leaves = {
    l1: {
      ...leaveBase('demo-staff-2', 'สุดา รักงาน', 'พนักงานแคชเชียร์', 'ฝ่ายการเงินและบัญชี'),
      type: 'sick', startDate: ymd(new Date(now + 2 * DAY)), endDate: ymd(new Date(now + 3 * DAY)), reason: 'ไปพบแพทย์ตามนัด',
      status: 'pending', createdAt: ts(now - 3 * 3600 * 1000),
    },
    l2: {
      ...leaveBase('demo-staff-3', 'ประเสริฐ มั่นคง', 'พนักงานเสิร์ฟ', 'ฝ่ายบริการ'),
      type: 'personal', startDate: ymd(new Date(now + 6 * DAY)), endDate: ymd(new Date(now + 6 * DAY)), reason: 'ธุระส่วนตัวที่ต่างจังหวัด',
      status: 'pending', createdAt: ts(now - 20 * 3600 * 1000),
    },
    l3: {
      ...leaveBase('demo-staff-1', 'สมชาย ใจดี', 'เจ้าหน้าที่สต็อก', 'ฝ่ายคลังสินค้าและการจัดส่ง'),
      type: 'vacation', startDate: ymd(new Date(now - 12 * DAY)), endDate: ymd(new Date(now - 10 * DAY)), reason: 'พักร้อนกับครอบครัว',
      status: 'approved', approvedBy: 'ผู้ดูแลระบบ (เดโม)', approverNote: 'อนุมัติการลาตามที่เสนอ', createdAt: ts(now - 20 * DAY),
    },
    l4: {
      ...leaveBase('demo-staff-2', 'สุดา รักงาน', 'พนักงานแคชเชียร์', 'ฝ่ายการเงินและบัญชี'),
      type: 'personal', startDate: ymd(new Date(now - 25 * DAY)), endDate: ymd(new Date(now - 25 * DAY)), reason: 'ติดต่อราชการ',
      status: 'rejected', approvedBy: 'ผู้ดูแลระบบ (เดโม)', approverNote: 'ไม่อนุมัติคำขอลา', createdAt: ts(now - 28 * DAY),
    },
  };

  // Leaves of the demo admin id too: when the role switcher turns that user into staff, they still own items
  leaves.l5 = {
    ...leaveBase('demo-admin', 'ผู้ดูแลระบบ (เดโม)', 'ผู้ดูแลระบบ', 'ฝ่ายบริหาร'),
    type: 'vacation', startDate: ymd(new Date(now + 10 * DAY)), endDate: ymd(new Date(now + 12 * DAY)), reason: 'พักร้อนสั้น ๆ',
    status: 'pending', createdAt: ts(now - 5 * 3600 * 1000),
  };
  leaves.l6 = {
    ...leaveBase('demo-admin', 'ผู้ดูแลระบบ (เดโม)', 'ผู้ดูแลระบบ', 'ฝ่ายบริหาร'),
    type: 'sick', startDate: ymd(new Date(now - 18 * DAY)), endDate: ymd(new Date(now - 18 * DAY)), reason: 'ไม่สบาย',
    status: 'approved', approvedBy: 'ผู้ดูแลระบบ (เดโม)', approverNote: 'อนุมัติการลาตามที่เสนอ', createdAt: ts(now - 19 * DAY),
  };

  // ---------- documents (owned by different users so own-only visibility is visible) ----------
  const miniPdf = '%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF';
  const pdfUrl = 'data:application/pdf;base64,' + (typeof btoa === 'function' ? btoa(miniPdf) : Buffer.from(miniPdf).toString('base64'));
  const docBase = (uid, name, daysAgo) => ({ url: pdfUrl, starred: false, fileSizeKb: 1, createdByUid: uid, createdBy: name, createdAt: ts(now - daysAgo * DAY) });
  const ADMIN = 'ผู้ดูแลระบบ (เดโม)';
  const documents = {
    d01: { ...docBase('demo-staff-1', 'สมชาย ใจดี', 1), name: 'GRN-20240601-AB12.pdf', category: 'order', transactionId: 'tx05', docNumber: 'GRN-20240601-AB12', type: 'IN', status: 'completed', note: 'ใบรับสินค้าเข้าคลัง (รายการรับเข้า)' },
    d02: { ...docBase('demo-staff-3', 'ประเสริฐ มั่นคง', 2), name: 'GIS-20240601-CD34.pdf', category: 'receipt', transactionId: 'tx06', docNumber: 'GIS-20240601-CD34', type: 'OUT', status: 'completed', note: 'ใบเบิกสินค้าออกจากคลัง (รายการเบิกออก)' },
    d03: { ...docBase('demo-staff-2', 'สุดา รักงาน', 1), name: 'ใบขอลา_สุดา รักงาน.pdf', category: 'leave', leaveId: 'l1', note: 'ใบขอลา (ลาป่วย) [สถานะ: รอพิจารณา]' },
    d04: { ...docBase('demo-staff-2', 'สุดา รักงาน', 4), name: 'PV-20240528-EF56.pdf', category: 'payment', docNumber: 'PV-20240528-EF56', note: 'ใบสำคัญจ่าย ค่าน้ำแข็งประจำสัปดาห์' },
    d05: { ...docBase('demo-staff-3', 'ประเสริฐ มั่นคง', 6), name: 'QT-20240525-GH78.pdf', category: 'sales', docNumber: 'QT-20240525-GH78', note: 'ใบเสนอราคา งานเลี้ยงลูกค้า' },
    d06: { ...docBase('demo-staff-1', 'สมชาย ใจดี', 8), name: 'รายการตรวจนับสต็อกเดือนก่อน.pdf', category: 'report', note: 'สรุปผลตรวจนับสต็อก' },
    d07: { ...docBase('demo-admin', ADMIN, 3), name: 'สัญญาเช่าพื้นที่หน้าร้าน.pdf', category: 'contract', note: 'สัญญาเช่า (เก็บโดยผู้ดูแลระบบ)' },
    d08: { ...docBase('demo-admin', ADMIN, 5), name: 'ใบขอลา_ผู้ดูแลระบบ (เดโม).pdf', category: 'leave', leaveId: 'l5', note: 'ใบขอลา (ลาพักร้อน) [สถานะ: รอพิจารณา]' },
    d09: { ...docBase('demo-admin', ADMIN, 7), name: 'ใบสั่งซื้อวัตถุดิบ.pdf', category: 'sales', note: 'ใบสั่งซื้อที่แอดมินจัดทำเอง' },
    d10: { ...docBase('demo-staff-2', 'สุดา รักงาน', 2), name: 'ใบแจ้งหนี้ซัพพลายเออร์.pdf', category: 'sales', assignedTo: 'demo-admin', note: 'มอบหมายให้ผู้ดูแลระบบ/ผู้ที่ถูกมอบหมายเห็นได้' },
    d11: { url: pdfUrl, starred: false, fileSizeKb: 1, createdBy: 'ระบบอัตโนมัติ', createdAt: ts(now - 1 * DAY), name: 'รายงานประจำวัน_เมื่อวาน.pdf', category: 'report', note: 'รายงานประจำวัน (สร้างอัตโนมัติ — เห็นเฉพาะแอดมิน)' },
  };

  // ---------- approval history ----------
  const approval_history = {
    h1: {
      userId: 'demo-staff-3', userName: 'ประเสริฐ มั่นคง', userEmail: 'prasert@example.com', position: 'พนักงานเสิร์ฟ',
      role: 'staff', action: 'approved', approvedBy: 'ผู้ดูแลระบบ (เดโม)', timestamp: ts(now - 30 * DAY),
    },
    h2: {
      userId: 'demo-staff-2', userName: 'สุดา รักงาน', userEmail: 'suda@example.com', position: 'พนักงานแคชเชียร์',
      role: 'staff', action: 'approved', approvedBy: 'ผู้ดูแลระบบ (เดโม)', timestamp: ts(now - 60 * DAY),
    },
  };

  return {
    users,
    categories,
    products,
    transactions: txs,
    tasks,
    attendance,
    leaves,
    approval_history,
    documents,
    settings: {
      app: { stockOnlyMode: false, updatedBy: 'ผู้ดูแลระบบ (เดโม)', updatedAt: ts(now - 10 * DAY) },
      setup: { adminUid: 'demo-admin', createdAt: ts(now - 120 * DAY) },
    },
  };
}
