// app/config/accessMatrix.js
// ============================================
// ตารางสิทธิ์ตามตำแหน่งงาน (single source of truth)
// ไฟล์นี้ต้อง "pure": ไม่ import firebase/React เพื่อให้ทดสอบด้วย node --test ได้
// หมายเหตุ: บังคับใช้ฝั่ง client เท่านั้น (Firestore rules ยังไม่ได้จำกัดตามตำแหน่ง)
// ============================================

// กลุ่มคีย์เวิร์ดตำแหน่ง (ย้ายมาจาก taskService.js; taskService re-export ต่อ)
export const POSITION_CLUSTERS = {
  kitchen: ['เชฟ', 'แม่ครัว', 'ครัว', 'ผู้ช่วยเชฟ', 'cook', 'chef', 'kitchen'],
  warehouse: ['สต็อก', 'คลัง', 'stock', 'warehouse', 'พัสดุ', 'คุมสต็อก'],
  finance: ['แคชเชียร์', 'การเงิน', 'บัญชี', 'cashier', 'finance', 'accounting'],
  service: ['เสิร์ฟ', 'หน้าร้าน', 'บริการ', 'service', 'waiter', 'waitress', 'บาริสต้า', 'ต้อนรับ'],
  shipping: ['ส่ง', 'จัดส่ง', 'โลจิสติกส์', 'ไรเดอร์', 'delivery', 'logistics', 'ขนส่ง', 'พัสดุ'],
  management: ['ผู้จัดการ', 'บริหาร', 'admin', 'ผู้ดูแลระบบ', 'manager', 'owner', 'เจ้าของ', 'หัวหน้า'],
};

export const checkIsAdmin = (user) => {
  if (!user) return false;
  const userRole = (user.role || '').toLowerCase();
  const userPos = (user.position || '').toLowerCase();
  return userRole === 'admin' ||
    userPos.includes('admin') ||
    userPos.includes('ผู้ดูแลระบบ') ||
    userPos.includes('ผู้จัดการ') ||
    userPos.includes('เจ้าของ') ||
    userPos.includes('owner');
};

export const getUserCluster = (user) => {
  if (!user) return null;
  const userPos = (user.position || '').toLowerCase();
  if (checkIsAdmin(user)) return 'management';
  for (const [clusterKey, keywords] of Object.entries(POSITION_CLUSTERS)) {
    if (keywords.some(k => userPos.includes(k))) return clusterKey;
  }
  return null;
};

export const ACCESS_GROUPS = ['admin', 'warehouse', 'kitchen', 'finance', 'service', 'shipping', 'general'];

export const ACCESS_GROUP_LABELS = {
  admin: 'แอดมิน',
  warehouse: 'คลัง/สต็อก',
  kitchen: 'ครัว',
  finance: 'การเงิน',
  service: 'หน้าร้าน',
  shipping: 'จัดส่ง',
  general: 'พนักงานทั่วไป',
};

/**
 * จัดผู้ใช้เข้ากลุ่มสิทธิ์: admin | warehouse | kitchen | finance | service | shipping | general
 * ตำแหน่งผู้บริหาร/แอดมิน (checkIsAdmin) = admin; ตำแหน่งไม่รู้จัก = general
 */
export const getUserAccessGroup = (user) => {
  if (!user) return 'general';
  if (checkIsAdmin(user)) return 'admin';
  const cluster = getUserCluster(user);
  // 'management' ที่ไม่ใช่ admin (เช่น หัวหน้า) ไม่ได้สิทธิ์เพิ่ม
  if (cluster && cluster !== 'management' && ACCESS_GROUPS.includes(cluster)) return cluster;
  return 'general';
};

const ALL = ['admin', 'warehouse', 'kitchen', 'finance', 'service', 'shipping', 'general'];

// ฟีเจอร์ → กลุ่มที่เข้าถึงได้ (admin ได้ทุกอย่างเสมอ)
export const ACCESS_MATRIX = {
  dashboard:     { label: 'แดชบอร์ด', groups: ALL },
  stockView:     { label: 'ดูคลังสินค้า', groups: ALL },
  txCreate:      { label: 'สร้างรายการเบิก/รับ', groups: ['admin', 'warehouse', 'kitchen', 'finance', 'shipping'] },
  txHistory:     { label: 'สถานะ/ประวัติรายการ', groups: ['admin', 'warehouse', 'finance', 'shipping'] },
  txVerify:      { label: 'ยืนยันยอดสต็อกจริง', groups: ['admin', 'warehouse'] },
  documents:     { label: 'เอกสาร (เห็นเฉพาะของตนเอง)', groups: ALL },
  hr:            { label: 'เข้า-ออกงาน/ลา (เห็นเฉพาะของตนเอง)', groups: ALL },
  notifications: { label: 'การแจ้งเตือน', groups: ALL },
};

// กลุ่มที่เห็นเอกสารประเภทรายการเบิก/รับ (transaction) ของคนอื่นได้ด้วย
export const TRANSACTION_DOC_GROUPS = ['warehouse', 'finance'];

export const canAccess = (user, feature) => {
  if (!user) return false;
  if (!ACCESS_MATRIX[feature]) return false;
  const group = getUserAccessGroup(user);
  return group === 'admin' || ACCESS_MATRIX[feature].groups.includes(group);
};

// ---------- ขอบเขตข้อมูล (data scope) ----------
const norm = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : '');
const listOf = (v) => (Array.isArray(v) ? v : v ? [v] : []);

// เป็นเจ้าของ/ผู้รับมอบหมายหรือไม่
// เอกสารเก่าที่ไม่มี uid ของเจ้าของเลย → เทียบชื่อผู้สร้างแทน (กันเอกสารหายจากเจ้าของ)
const isOwnerOrAssignee = (user, item, uidFields, legacyNameFields) => {
  if (!user || !item) return false;
  const uid = user.uid || user.id;
  const name = norm(user.name);
  if (uid) {
    if (uidFields.some(f => listOf(item[f]).includes(uid))) return true;
    if (listOf(item.assignedToUid).includes(uid) || listOf(item.assignedTo).includes(uid)) return true;
  }
  if (name && listOf(item.assignedTo).some(a => norm(a) === name)) return true;
  const hasUidField = uidFields.some(f => item[f]);
  if (!hasUidField && name) return legacyNameFields.some(f => norm(item[f]) === name);
  return false;
};

export const isTransactionDoc = (d) =>
  Boolean(d && (d.transactionId || d.category === 'order' || d.category === 'receipt'));

export const canSeeDocument = (user, d) => {
  if (!user || !d) return false;
  if (!canAccess(user, 'documents')) return false;
  const group = getUserAccessGroup(user);
  if (group === 'admin') return true;
  if (isTransactionDoc(d) && TRANSACTION_DOC_GROUPS.includes(group)) return true;
  return isOwnerOrAssignee(user, d, ['createdByUid'], ['createdBy']);
};

export const canSeeLeave = (user, leave) => {
  if (!user || !leave) return false;
  if (!canAccess(user, 'hr')) return false;
  if (getUserAccessGroup(user) === 'admin') return true;
  return isOwnerOrAssignee(user, leave, ['createdByUid', 'userId'], ['userName']);
};

export const filterVisibleDocuments = (user, docs) => (docs || []).filter(d => canSeeDocument(user, d));
export const filterVisibleLeaves = (user, leaves) => (leaves || []).filter(l => canSeeLeave(user, l));

// แท็บ → ฟีเจอร์ (ใช้ใน nav และ guard ใน page.js)
export const TAB_FEATURES = {
  dashboard: 'dashboard',
  stock: 'stockView',
  transaction: 'txCreate',
  status: 'txHistory',
  hr: 'hr',
  documents: 'documents',
  notifications: 'notifications',
};

export const canAccessTab = (user, tab) => {
  const feature = TAB_FEATURES[tab];
  return feature ? canAccess(user, feature) : true;
};
