// app/components/MoreDrawer.js
'use client';
import React, { useEffect } from 'react';
import { Clock, FolderOpen, Settings, X, Bell } from 'lucide-react';

const drawerItems = [
  { key: 'notifications', label: 'แจ้งเตือน', icon: Bell, emoji: '🔔', desc: 'สินค้าหมด / รายการรอ' },
  { key: 'hr', label: 'เข้า-ออกงาน / ลา', icon: Clock, emoji: '🕐', desc: 'บันทึกเวลาและใบลา' },
  { key: 'documents', label: 'เอกสาร', icon: FolderOpen, emoji: '📁', desc: 'เก็บและเรียกดูเอกสาร' },
  { key: 'menu', label: 'ตั้งค่า', icon: Settings, emoji: '⚙️', desc: 'บัญชีและการตั้งค่า' },
];

export default function MoreDrawer({ isOpen, onClose, activeTab, setActiveTab }) {
  // Lock scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleSelect = (key) => {
    setActiveTab(key);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`more-drawer-backdrop ${isOpen ? 'open' : ''}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={`more-drawer ${isOpen ? 'open' : ''}`}>
        {/* Handle bar */}
        <div className="more-drawer-handle" />

        {/* Header */}
        <div className="more-drawer-header">
          <span className="more-drawer-title">เพิ่มเติม</span>
          <button className="more-drawer-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Items grid */}
        <div className="more-drawer-grid">
          {drawerItems.map(item => {
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleSelect(item.key)}
                className={`more-drawer-item ${isActive ? 'active' : ''}`}
              >
                <div className={`more-drawer-item-icon ${isActive ? 'active' : ''}`}>
                  <span>{item.emoji}</span>
                </div>
                <p className="more-drawer-item-label">{item.label}</p>
                <p className="more-drawer-item-desc">{item.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Safe area spacer */}
        <div className="more-drawer-safe-area" />
      </div>
    </>
  );
}
