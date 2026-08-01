// app/utils/permissions.js
// ============================================
// ระบบสิทธิ์การเข้าถึง (Role-Based Access Control)
// ============================================

export const PERMISSIONS = {
  // คลังสินค้า
  STOCK_VIEW: ['admin', 'staff'],
  STOCK_EDIT: ['admin'],
  STOCK_ADD: ['admin'],
  STOCK_DELETE: ['admin'],

  // รายการ Transaction
  CREATE_TX: ['admin', 'staff'],
  VERIFY_TX: ['admin'],
  VOID_TX: ['admin'],
  EDIT_COMPLETED_TX: ['admin'],
  DELETE_HISTORY: ['admin'],

  // หมวดหมู่
  MANAGE_CATEGORIES: ['admin'],

  // ผู้ใช้
  MANAGE_USERS: ['admin'],
  APPROVE_USERS: ['admin'],

  // รายงาน
  SEND_LINE_REPORT: ['admin'],
  EXPORT_REPORT: ['admin', 'staff'],

  // แจ้งเตือน
  VIEW_NOTIFICATIONS: ['admin', 'staff'],
  VIEW_ADMIN_NOTIFICATIONS: ['admin'],

  // Dashboard
  VIEW_DASHBOARD: ['admin', 'staff'],
  SEND_DAILY_REPORT: ['admin'],

  // HR & Documents
  VIEW_HR: ['admin', 'staff'],
  VIEW_DOCUMENTS: ['admin', 'staff'],
};

/**
 * ตรวจสอบว่าผู้ใช้มีสิทธิ์หรือไม่
 * @param {object} user - ข้อมูลผู้ใช้ { role: 'admin' | 'staff' }
 * @param {string} permission - ชื่อสิทธิ์จาก PERMISSIONS
 * @returns {boolean}
 */
export const hasPermission = (user, permission) => {
  if (!user || !user.role) return false;
  return PERMISSIONS[permission]?.includes(user.role) || false;
};

/**
 * ตรวจสอบว่าผู้ใช้เป็น Admin หรือไม่
 * @param {object} user
 * @returns {boolean}
 */
export const isAdmin = (user) => {
  return user?.role === 'admin';
};

/**
 * ตรวจสอบว่าผู้ใช้เป็น Staff หรือไม่
 * @param {object} user
 * @returns {boolean}
 */
export const isStaff = (user) => {
  return user?.role === 'staff';
};
