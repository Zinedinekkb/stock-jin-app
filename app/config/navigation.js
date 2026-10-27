// app/config/navigation.js
// Single source of truth for the app menu (desktop sidebar + mobile drawer).
import {
  Home, Package, ArrowRightLeft, ClipboardList, Bell, Clock, FolderOpen, Users, Settings,
  Star, Boxes, ChefHat, Wallet, Store, Truck, Briefcase, Globe, BarChart3
} from 'lucide-react';
import { isAdmin } from '../utils/permissions';
import { getUserCluster } from '../services/taskService';

export const NAV_ITEMS = [
  {
    key: 'dashboard',
    label: 'แดชบอร์ด & งาน',
    icon: Home,
    desc: 'ภาพรวมระบบและงานตามตำแหน่ง',
    subItems: [
      { key: 'my', label: 'งานของฉัน', icon: Star, params: { posTab: 'my', subTab: 'tasks' } },
      { key: 'warehouse', label: 'คลัง/สต็อก', icon: Boxes, params: { posTab: 'warehouse', subTab: 'tasks' } },
      { key: 'kitchen', label: 'ครัว/เชฟ', icon: ChefHat, params: { posTab: 'kitchen', subTab: 'tasks' } },
      { key: 'finance', label: 'การเงิน/แคชเชียร์', icon: Wallet, params: { posTab: 'finance', subTab: 'tasks' } },
      { key: 'service', label: 'หน้าร้าน/บริการ', icon: Store, params: { posTab: 'service', subTab: 'tasks' } },
      { key: 'shipping', label: 'จัดส่ง/พัสดุ', icon: Truck, params: { posTab: 'shipping', subTab: 'tasks' } },
      { key: 'management', label: 'บริหาร/Admin', icon: Briefcase, params: { posTab: 'management', subTab: 'tasks' } },
      { key: 'all', label: 'งานทั้งหมด', icon: Globe, params: { posTab: 'all', subTab: 'tasks' } },
      { key: 'analytics', label: 'สถิติสต็อก & รายงาน', icon: BarChart3, params: { subTab: 'analytics' } },
    ]
  },
  { key: 'stock', label: 'คลังสินค้า', icon: Package, desc: 'จัดการสินค้าและตรวจนับสต็อก' },
  { key: 'transaction', label: 'เบิก/รับสินค้า', icon: ArrowRightLeft, desc: 'เบิกจ่ายและรับสินค้าเข้าคลัง' },
  { key: 'status', label: 'สถานะรายการ', icon: ClipboardList, desc: 'ประวัติและสถานะการทำรายการ' },
  { key: 'hr', label: 'เข้า-ออกงาน / ลา', icon: Clock, desc: 'บันทึกเวลา เช็คชื่อ และยื่นใบลา' },
  { key: 'documents', label: 'เอกสาร', icon: FolderOpen, desc: 'คลังเอกสาร ใบลา ใบสั่งของ' },
  { key: 'notifications', label: 'การแจ้งเตือน', icon: Bell, desc: 'ข้อความและแจ้งเตือนระบบ' },
  { key: 'users', label: 'จัดการบัญชีผู้ใช้', icon: Users, desc: 'รายชื่อและสิทธิ์ผู้ใช้งาน', adminOnly: true },
  { key: 'menu', label: 'ตั้งค่า & บัญชี', icon: Settings, desc: 'ข้อมูลส่วนตัวและบัญชี' },
];

// Menu items the user may see
export const getVisibleNavItems = (user) => {
  const admin = isAdmin(user);
  return NAV_ITEMS.filter(item => !item.adminOnly || admin);
};

// Dashboard sub-items: staff only see their own work, their team, and analytics
export const getVisibleSubItems = (item, user) => {
  const admin = isAdmin(user);
  return (item.subItems || []).filter(sub => {
    if (sub.adminOnly && !admin) return false;
    if (item.key === 'dashboard' && !admin) {
      if (sub.key === 'my' || sub.key === 'analytics') return true;
      const userCluster = getUserCluster(user);
      return Boolean(userCluster && sub.key === userCluster);
    }
    return true;
  });
};

export const isSubItemActive = (item, sub, { activeTab, dashboardSubTab, dashboardPosTab }) => {
  if (item.key !== 'dashboard' || activeTab !== 'dashboard') return false;
  if (sub.key === 'analytics') return dashboardSubTab === 'analytics';
  return dashboardSubTab !== 'analytics' && dashboardPosTab === sub.key;
};
