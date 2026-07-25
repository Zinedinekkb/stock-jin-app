// app/components/DesktopSidebar.js
'use client';
import React from 'react';
import { LayoutDashboard, ArrowRightLeft, Package, ClipboardList, Menu, LogOut, Utensils, Clock, FolderOpen } from 'lucide-react';

const menuItems = [
  { key: 'dashboard', label: 'แดชบอร์ด', icon: LayoutDashboard },
  { key: 'stock', label: 'คลังสินค้า', icon: Package },
  { key: 'transaction', label: 'เบิก/รับสินค้า', icon: ArrowRightLeft },
  { key: 'status', label: 'สถานะรายการ', icon: ClipboardList },
  { key: 'hr', label: 'เข้า-ออกงาน / ลา', icon: Clock },
  { key: 'documents', label: 'เอกสาร', icon: FolderOpen },
  { key: 'menu', label: 'ตั้งค่า', icon: Menu },
];

export default function DesktopSidebar({ activeTab, setActiveTab, user, handleLogout }) {
  return (
    <aside className="desktop-sidebar">
      {/* Logo */}
      <div className="sidebar-logo-section">
        <div className="sidebar-logo-circle">
          <Utensils size={28} strokeWidth={2.5} />
        </div>
        <div className="sidebar-logo-text">
          <h1>STOCK JIN</h1>
          <p>ข้าวมันไก่สไตล์สิงคโปร์</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span>{item.label}</span>
              {isActive && <div className="sidebar-active-indicator" />}
            </button>
          );
        })}
      </nav>

      {/* User info + Logout */}
      {user && (
        <div className="sidebar-footer">
          <div className="sidebar-user-info">
            <div className="sidebar-user-avatar">
              {user.name?.charAt(0) || 'U'}
            </div>
            <div className="sidebar-user-details">
              <span className="sidebar-user-name">{user.name}</span>
              <span className="sidebar-user-role">
                {user.role === 'admin' ? '👑 ผู้ดูแลระบบ' : '✅ พนักงาน'}
              </span>
            </div>
          </div>
          <button onClick={handleLogout} className="sidebar-logout-btn">
            <LogOut size={18} />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      )}
    </aside>
  );
}
