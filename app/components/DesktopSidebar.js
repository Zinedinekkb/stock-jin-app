// app/components/DesktopSidebar.js
'use client';
import React, { useState } from 'react';
import { 
  Home, Package, ArrowRightLeft, ClipboardList, Bell, 
  Clock, FolderOpen, Users, Settings, SlidersHorizontal, 
  QrCode, LogOut, Sparkles
} from 'lucide-react';

const menuItems = [
  { key: 'dashboard', label: 'แดชบอร์ด', icon: Home },
  { key: 'stock', label: 'คลังสินค้า', icon: Package },
  { key: 'transaction', label: 'เบิก/รับสินค้า', icon: ArrowRightLeft },
  { key: 'status', label: 'สถานะรายการ', icon: ClipboardList },
  { key: 'hr', label: 'เข้า-ออกงาน / ลา', icon: Clock },
  { key: 'documents', label: 'เอกสาร', icon: FolderOpen },
  { key: 'users', label: 'จัดการสิทธิ์', icon: Users, adminOnly: true },
  { key: 'notifications', label: 'แจ้งเตือน', icon: Bell },
  { key: 'menu', label: 'ตั้งค่า', icon: Settings },
];

export default function DesktopSidebar({ 
  activeTab, 
  setActiveTab, 
  user, 
  handleLogout, 
  unreadNotifCount = 0 
}) {
  const [hoveredTab, setHoveredTab] = useState(null);

  return (
    <aside className="smart-sidebar">
      {/* Top Brand / Home Icon */}
      <div className="smart-sidebar-nav">
        {menuItems
          .filter(item => !item.adminOnly || user?.role === 'admin')
          .map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            const showBadge = item.key === 'notifications' && unreadNotifCount > 0;

            return (
              <div 
                key={item.key} 
                className="relative flex items-center justify-center w-full"
                onMouseEnter={() => setHoveredTab(item.key)}
                onMouseLeave={() => setHoveredTab(null)}
              >
                <button
                  onClick={() => setActiveTab(item.key)}
                  className={`smart-sidebar-item ${isActive ? 'active' : ''}`}
                  title={item.label}
                >
                  <div className="relative flex items-center justify-center">
                    <Icon 
                      size={22} 
                      strokeWidth={isActive ? 2.5 : 2} 
                      className={isActive ? 'text-[#6355d8]' : 'text-white/80 group-hover:text-white'}
                    />
                    {showBadge && (
                      <span className="smart-sidebar-badge">
                        {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                      </span>
                    )}
                  </div>
                </button>

                {/* Floating Tooltip */}
                {hoveredTab === item.key && (
                  <div className="smart-sidebar-tooltip">
                    {item.label}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Bottom Circle Action (Scan / Quick Action) */}
      <div className="smart-sidebar-bottom">
        <button 
          onClick={() => setActiveTab('stock')}
          className="smart-sidebar-circle-btn"
          title="สแกนหรือจัดการด่วน"
        >
          <QrCode size={20} strokeWidth={2.5} className="text-white" />
        </button>
      </div>
    </aside>
  );
}
