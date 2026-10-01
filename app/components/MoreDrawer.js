// app/components/MoreDrawer.js
'use client';
import React, { useState, useEffect } from 'react';
import { 
  Home, Package, ArrowRightLeft, ClipboardList, Clock, 
  FolderOpen, Users, Bell, Settings, X, ChevronDown, 
  ChevronRight, LogOut, User, CheckCircle2, AlertTriangle,
  Layers, FileText, Check, ShieldCheck
} from 'lucide-react';
import { isAdmin } from '../utils/permissions';

export default function MoreDrawer({ 
  isOpen, 
  onClose, 
  activeTab, 
  setActiveTab, 
  onNavigateWithSub,
  dashboardPosTab = 'my',
  dashboardSubTab = 'tasks',
  user,
  unreadNotifCount = 0,
  handleLogout = () => {}
}) {
  // State for which main section is currently expanded (Accordion)
  // Default to expanding 'dashboard' if on dashboard, or null
  const [expandedSection, setExpandedSection] = useState('dashboard');

  // Lock scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Automatically expand the section corresponding to current active tab
      if (['dashboard', 'stock', 'transaction', 'status', 'hr', 'documents', 'menu'].includes(activeTab)) {
        setExpandedSection(activeTab);
      }
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, activeTab]);

  const toggleSection = (sectionKey) => {
    setExpandedSection(prev => prev === sectionKey ? null : sectionKey);
  };

  const handleSelectSub = (tabKey, params = {}) => {
    if (onNavigateWithSub) {
      onNavigateWithSub(tabKey, params);
    } else {
      setActiveTab(tabKey);
      onClose();
    }
    onClose();
  };

  const isUserAdmin = isAdmin(user);

  // Menu structure definition
  const menuItems = [
    {
      key: 'dashboard',
      label: 'แดชบอร์ด & งานประจำวัน',
      icon: Home,
      emoji: '📊',
      desc: 'ภาพรวมระบบและงานตามตำแหน่ง',
      subItems: [
        { key: 'my', label: 'งานของฉัน', icon: '⭐', params: { posTab: 'my', subTab: 'tasks' } },
        { key: 'warehouse', label: 'คลัง/สต็อก', icon: '📦', params: { posTab: 'warehouse', subTab: 'tasks' } },
        { key: 'kitchen', label: 'ครัว/เชฟ', icon: '👨‍🍳', params: { posTab: 'kitchen', subTab: 'tasks' } },
        { key: 'finance', label: 'การเงิน/แคชเชียร์', icon: '💰', params: { posTab: 'finance', subTab: 'tasks' } },
        { key: 'service', label: 'หน้าร้าน/บริการ', icon: '🍱', params: { posTab: 'service', subTab: 'tasks' } },
        { key: 'shipping', label: 'จัดส่ง/พัสดุ', icon: '🚚', params: { posTab: 'shipping', subTab: 'tasks' } },
        { key: 'management', label: 'บริหาร/Admin', icon: '👔', params: { posTab: 'management', subTab: 'tasks' } },
        { key: 'all', label: 'งานทั้งหมด', icon: '🌐', params: { posTab: 'all', subTab: 'tasks' } },
        { key: 'analytics', label: 'สถิติสต็อก & รายงาน', icon: '📈', params: { subTab: 'analytics' } },
      ]
    },
    {
      key: 'stock',
      label: 'คลังสินค้า',
      icon: Package,
      emoji: '📦',
      desc: 'จัดการสินค้าและตรวจนับสต็อก',
      subItems: [
        { key: 'all_stock', label: 'รายการสต็อกทั้งหมด', icon: '📋' },
        { key: 'low_stock', label: 'สินค้าใกล้หมด / หมด', icon: '⚠️', params: { filter: 'low' } },
      ]
    },
    {
      key: 'transaction',
      label: 'เบิก/รับสินค้า',
      icon: ArrowRightLeft,
      emoji: '🔄',
      desc: 'เบิกจ่ายและรับสินค้าเข้าคลัง',
      subItems: [
        { key: 'out', label: 'เบิกออกสินค้า (OUT)', icon: '📤', params: { mode: 'OUT' } },
        { key: 'in', label: 'รับเข้าสินค้า (IN)', icon: '📥', params: { mode: 'IN' } },
      ]
    },
    {
      key: 'status',
      label: 'สถานะรายการ',
      icon: ClipboardList,
      emoji: '📑',
      desc: 'ประวัติและสถานะการทำรายการ',
      subItems: [
        { key: 'all_status', label: 'ประวัติทั้งหมด', icon: '📑' },
        { key: 'in_status', label: 'ประวัติรับเข้า', icon: '📥' },
        { key: 'out_status', label: 'ประวัติเบิกออก', icon: '📤' },
      ]
    },
    {
      key: 'hr',
      label: 'เข้า-ออกงาน / ลา',
      icon: Clock,
      emoji: '⏰',
      desc: 'บันทึกเวลา เช็คชื่อ และยื่นใบลา',
      subItems: [
        { key: 'my_att', label: 'ลงเวลาของฉัน (เช็คอิน/เช็คเอาท์)', icon: '⏱️', params: { view: 'my', subTab: 'attendance' } },
        { key: 'my_leave', label: 'ยื่นคำขอลา / ดูประวัติลา', icon: '📝', params: { view: 'my', subTab: 'leaves' } },
        { key: 'team_att', label: 'ตรวจสอบเวลาทีมงาน', icon: '👥', adminOnly: true, params: { view: 'team', subTab: 'attendance' } },
        { key: 'team_leave', label: 'ตรวจเอกสารคำขอลาทีมงาน', icon: '📄', adminOnly: true, params: { view: 'team', subTab: 'leaves' } },
      ]
    },
    {
      key: 'documents',
      label: 'เอกสาร',
      icon: FolderOpen,
      emoji: '📁',
      desc: 'คลังเอกสาร ใบลา ใบสั่งของ',
      subItems: [
        { key: 'all_docs', label: 'เอกสารทั้งหมด', icon: '📂' },
        { key: 'leave_docs', label: 'ใบขอลา / คำขอ', icon: '📋' },
        { key: 'order_docs', label: 'ใบสั่งของ / ใบเสร็จ', icon: '🧾' },
      ]
    },
    {
      key: 'notifications',
      label: 'การแจ้งเตือน',
      icon: Bell,
      emoji: '🔔',
      desc: 'ข้อความและแจ้งเตือนระบบ',
      badge: unreadNotifCount,
      subItems: null // Direct navigation
    },
    {
      key: 'users',
      label: 'จัดการบัญชีผู้ใช้',
      icon: Users,
      emoji: '👥',
      desc: 'รายชื่อและสิทธิ์ผู้ใช้งาน',
      adminOnly: true,
      subItems: null // Direct navigation
    },
    {
      key: 'menu',
      label: 'ตั้งค่า & บัญชี',
      icon: Settings,
      emoji: '⚙️',
      desc: 'ข้อมูลส่วนตัว ข้อมูลร้าน',
      subItems: [
        { key: 'profile', label: 'แก้ไขข้อมูลโปรไฟล์', icon: '✏️', params: { openProfile: true } },
        { key: 'logout', label: 'ออกจากระบบ', icon: '🚪', isDanger: true, isAction: true },
      ]
    }
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className={`more-drawer-backdrop ${isOpen ? 'open' : ''}`}
        onClick={onClose}
      />

      {/* Slide-over Right Drawer Panel */}
      <aside 
        className={`more-drawer ${isOpen ? 'open' : ''}`}
        aria-label="เมนูหลักและหัวข้อรอง"
      >
        {/* Mobile top pill handle */}
        <div className="more-drawer-handle sm:hidden" />

        {/* Drawer Header with User Profile Snippet */}
        <div className="more-drawer-header">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#6355d8] to-purple-400 p-0.5 shrink-0 shadow-sm">
              <div className="w-full h-full rounded-[14px] bg-white flex items-center justify-center overflow-hidden">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-black text-[#6355d8]">
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </span>
                )}
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-gray-800 truncate leading-tight">
                  {user?.name || 'ผู้ใช้งาน'}
                </h3>
                {isUserAdmin && (
                  <span className="px-1.5 py-0.2 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-md">
                    Admin
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 truncate mt-0.5">
                {user?.position || user?.department || 'พนักงาน'}
              </p>
            </div>
          </div>

          <button 
            type="button"
            className="more-drawer-close" 
            onClick={onClose}
            aria-label="ปิดเมนู"
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Navigation List (Accordion) */}
        <div className="more-drawer-content">
          <div className="px-4 py-2">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              เมนูนำทาง & แผนกงาน
            </p>
          </div>

          <div className="space-y-1.5 px-3 pb-6">
            {menuItems
              .filter(item => !item.adminOnly || isUserAdmin)
              .map(item => {
                const Icon = item.icon;
                const isTabActive = activeTab === item.key;
                const isExpanded = expandedSection === item.key;
                const hasSub = item.subItems && item.subItems.length > 0;

                return (
                  <div key={item.key} className="rounded-2xl overflow-hidden transition-all duration-200">
                    {/* Main Section Button */}
                    <div 
                      className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all duration-200 select-none ${
                        isTabActive 
                          ? 'bg-purple-50 text-[#6355d8] border border-purple-100 shadow-xs' 
                          : 'hover:bg-gray-50 text-gray-700 border border-transparent'
                      }`}
                      onClick={() => {
                        if (hasSub) {
                          toggleSection(item.key);
                        } else {
                          handleSelectSub(item.key);
                        }
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          isTabActive 
                            ? 'bg-[#6355d8] text-white shadow-sm' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          <Icon size={18} strokeWidth={isTabActive ? 2.5 : 2} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold leading-tight truncate">
                            {item.label}
                          </p>
                          <p className="text-[10px] text-gray-400 truncate mt-0.5">
                            {item.desc}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {item.badge > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-500 text-white animate-pulse">
                            {item.badge > 9 ? '9+' : item.badge}
                          </span>
                        )}

                        {hasSub && (
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 transition-transform duration-300 ${
                            isExpanded ? 'rotate-180 text-[#6355d8]' : ''
                          }`}>
                            <ChevronDown size={16} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Sub-items Slide-Down Accordion Container */}
                    {hasSub && (
                      <div className={`more-drawer-sub-wrapper ${isExpanded ? 'expanded' : ''}`}>
                        <div className="more-drawer-sub-container">
                          {item.subItems
                            .filter(sub => !sub.adminOnly || isUserAdmin)
                            .map(sub => {
                              // Check if sub-item is active
                              let isSubActive = false;
                              if (item.key === 'dashboard') {
                                if (sub.params?.subTab === 'analytics') {
                                  isSubActive = isTabActive && dashboardSubTab === 'analytics';
                                } else if (sub.params?.posTab) {
                                  isSubActive = isTabActive && dashboardSubTab !== 'analytics' && dashboardPosTab === sub.params.posTab;
                                }
                              }

                              return (
                                <button
                                  key={sub.key}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (sub.key === 'logout') {
                                      handleLogout();
                                      onClose();
                                      return;
                                    }
                                    handleSelectSub(item.key, sub.params || {});
                                  }}
                                  className={`w-full flex items-center justify-between py-2 px-3 pl-11 rounded-xl text-xs font-medium transition-all text-left ${
                                    sub.isDanger 
                                      ? 'text-red-600 hover:bg-red-50' 
                                      : isSubActive 
                                        ? 'bg-[#6355d8]/10 text-[#6355d8] font-bold shadow-xs' 
                                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-sm shrink-0">{sub.icon}</span>
                                    <span className="truncate">{sub.label}</span>
                                  </div>
                                  {isSubActive && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#6355d8] shrink-0" />
                                  )}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>

        {/* Drawer Bottom Action / Quick Return */}
        <div className="more-drawer-footer">
          <button
            type="button"
            onClick={() => handleSelectSub('dashboard', { posTab: 'my' })}
            className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <span>🏠 กลับหน้าหลัก (งานของฉัน)</span>
          </button>
        </div>
      </aside>
    </>
  );
}
