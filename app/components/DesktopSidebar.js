// app/components/DesktopSidebar.js
'use client';
import React, { useState, useEffect } from 'react';
import { 
  Home, Package, ArrowRightLeft, ClipboardList, Bell, 
  Clock, FolderOpen, Users, Settings, ChevronDown, 
  ChevronLeft, ChevronRight, LogOut, QrCode
} from 'lucide-react';
import { isAdmin } from '../utils/permissions';

const menuItems = [
  {
    key: 'dashboard',
    label: 'แดชบอร์ด & งาน',
    icon: Home,
    emoji: '📊',
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
    emoji: '📦'
  },
  {
    key: 'transaction',
    label: 'เบิก/รับสินค้า',
    icon: ArrowRightLeft,
    emoji: '🔄'
  },
  {
    key: 'status',
    label: 'สถานะรายการ',
    icon: ClipboardList,
    emoji: '📑'
  },
  {
    key: 'hr',
    label: 'เข้า-ออกงาน / ลา',
    icon: Clock,
    emoji: '⏰'
  },
  {
    key: 'documents',
    label: 'เอกสาร',
    icon: FolderOpen,
    emoji: '📁'
  },
  {
    key: 'users',
    label: 'จัดการบัญชีผู้ใช้',
    icon: Users,
    adminOnly: true
  },
  {
    key: 'notifications',
    label: 'การแจ้งเตือน',
    icon: Bell
  },
  {
    key: 'menu',
    label: 'ตั้งค่า & บัญชี',
    icon: Settings
  }
];

export default function DesktopSidebar({ 
  activeTab, 
  setActiveTab, 
  user, 
  handleLogout, 
  unreadNotifCount = 0,
  onNavigateWithSub,
  dashboardPosTab = 'my',
  dashboardSubTab = 'tasks'
}) {
  // Sidebar expanded / collapsed state
  const [isCollapsed, setIsCollapsed] = useState(false);
  // Accordion expanded section
  const [expandedSection, setExpandedSection] = useState('dashboard');
  const [hoveredTab, setHoveredTab] = useState(null);

  const isUserAdmin = isAdmin(user);

  // Auto-expand section if activeTab has subItems
  useEffect(() => {
    if (activeTab && menuItems.some(i => i.key === activeTab && i.subItems?.length)) {
      setExpandedSection(activeTab);
    }
  }, [activeTab]);

  const handleItemClick = (item) => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setExpandedSection(item.key);
      setActiveTab(item.key);
      return;
    }

    setActiveTab(item.key);
    if (item.subItems && item.subItems.length > 0) {
      setExpandedSection(prev => prev === item.key ? null : item.key);
    }
  };

  const handleSubItemClick = (parentKey, sub) => {
    if (sub.isLogout) {
      if (handleLogout) handleLogout();
      return;
    }

    if (onNavigateWithSub) {
      onNavigateWithSub(parentKey, sub.params || {});
    } else {
      setActiveTab(parentKey);
    }
  };

  return (
    <aside className={`smart-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Top Brand / Logo */}
      <div className="flex items-center justify-between px-3 pb-3 mb-1 shrink-0">
        <div 
          onClick={() => {
            if (isCollapsed) setIsCollapsed(false);
            setActiveTab('dashboard');
          }}
          className="flex items-center gap-2.5 overflow-hidden cursor-pointer group"
          title="StockPro - หน้าแรก"
        >
          <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-sm border border-white/20 group-hover:scale-105 transition-transform">
            <Package size={22} strokeWidth={2.5} />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 transition-opacity duration-200">
              <h1 className="text-base font-black text-white tracking-wide leading-none truncate">StockPro</h1>
              <p className="text-[10px] text-white/70 font-medium mt-1 truncate">Workforce & Inventory</p>
            </div>
          )}
        </div>
        <button
          onClick={() => setIsCollapsed(prev => !prev)}
          className="p-1.5 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition-colors shrink-0"
          title={isCollapsed ? 'ขยายแถบเมนู (ซ้าย)' : 'ย่อแถบเมนู (ซ้าย)'}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation List (Scrollable) */}
      <div className="smart-sidebar-nav smart-sidebar-scroll">
        {menuItems
          .filter(item => !item.adminOnly || isUserAdmin)
          .map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            const hasSub = item.subItems && item.subItems.length > 0;
            const isExpanded = expandedSection === item.key && !isCollapsed;
            const showBadge = item.key === 'notifications' && unreadNotifCount > 0;

            return (
              <div 
                key={item.key} 
                className="w-full relative"
                onMouseEnter={() => setHoveredTab(item.key)}
                onMouseLeave={() => setHoveredTab(null)}
              >
                <button
                  onClick={() => handleItemClick(item)}
                  className={`smart-sidebar-item ${isActive ? 'active' : ''}`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <div className="relative shrink-0 flex items-center justify-center">
                    <Icon 
                      size={22} 
                      strokeWidth={isActive ? 2.5 : 2} 
                      className={isActive ? 'text-[#6355d8]' : 'text-white/85 group-hover:text-white'} 
                    />
                    {showBadge && (
                      <span className="smart-sidebar-badge">
                        {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                      </span>
                    )}
                  </div>

                  {!isCollapsed && (
                    <>
                      <span className={`flex-1 text-xs truncate tracking-tight ${isActive ? 'text-[#6355d8] font-black' : 'font-semibold text-white/90'}`}>
                        {item.label}
                      </span>
                      {hasSub && (
                        <ChevronDown 
                          size={14} 
                          className={`transition-transform duration-200 shrink-0 ${isActive ? 'text-[#6355d8]' : 'text-white/60'} ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      )}
                    </>
                  )}
                </button>

                {/* Floating Tooltip in Collapsed Mode */}
                {isCollapsed && hoveredTab === item.key && (
                  <div className="smart-sidebar-tooltip">
                    {item.label}
                  </div>
                )}

                {/* Accordion Sub-items (Smooth curved pills) */}
                {!isCollapsed && hasSub && (
                  <div className={`smart-sidebar-sub-wrapper ${isExpanded ? 'expanded' : ''}`}>
                    <div className="smart-sidebar-sub-container">
                      {item.subItems
                        .filter(sub => !sub.adminOnly || isUserAdmin)
                        .map(sub => {
                          let isSubActive = false;
                          if (item.key === 'dashboard') {
                            if (sub.key === 'analytics') {
                              isSubActive = isActive && dashboardSubTab === 'analytics';
                            } else {
                              isSubActive = isActive && (dashboardSubTab === 'tasks' || !dashboardSubTab) && dashboardPosTab === sub.key;
                            }
                          }

                          return (
                            <button
                              key={sub.key}
                              onClick={() => handleSubItemClick(item.key, sub)}
                              className={`smart-sidebar-sub-item ${isSubActive ? 'active' : ''}`}
                            >
                              <span className="text-sm shrink-0">{sub.icon}</span>
                              <span className="truncate">{sub.label}</span>
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

      {/* Bottom Circle Action & User */}
      <div className="smart-sidebar-bottom flex-col gap-2 pt-2 shrink-0">
        <button 
          onClick={() => setActiveTab('stock')}
          className="smart-sidebar-circle-btn"
          title="สแกนหรือจัดการคลังด่วน"
        >
          <QrCode size={20} strokeWidth={2.5} className="text-white" />
        </button>
        {user && (
          <div 
            onClick={() => setActiveTab('menu')}
            className={`cursor-pointer transition-transform hover:scale-105 ${isCollapsed ? 'mt-1' : 'flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20'}`}
            title="โปรไฟล์และตั้งค่า"
          >
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xs shrink-0 overflow-hidden border border-white/30">
              {user?.photoURL ? (
                <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                (user?.name || 'U').charAt(0)
              )}
            </div>
            {!isCollapsed && (
              <span className="text-[11px] font-bold text-white truncate max-w-[120px]">
                {user?.name?.split(' ')[0] || 'ผู้ใช้งาน'}
              </span>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
