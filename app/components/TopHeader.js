// app/components/TopHeader.js
'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, Settings, ChevronDown, User, LogOut } from 'lucide-react';

export default function TopHeader({ 
  user, 
  unreadNotifCount = 0, 
  setActiveTab, 
  handleLogout,
  searchQuery = '',
  setSearchQuery = () => {},
  onSearchSubmit = () => {}
}) {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = user?.name || 'Scarlett';

  return (
    <header className="smart-top-header">
      {/* Search Bar */}
      <div className="smart-search-wrapper">
        <div className="relative flex-1 max-w-md">
          <Search className="smart-search-icon" size={18} />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onSearchSubmit(searchQuery);
              }
            }}
            className="smart-search-input"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="smart-header-actions">
        {/* Settings button */}
        <button 
          onClick={() => setActiveTab('menu')}
          title="ตั้งค่าระบบ"
          className="smart-icon-btn"
        >
          <Settings size={20} className="text-gray-600 hover:text-[#6355d8] transition-colors" />
        </button>

        {/* Notifications button */}
        <button 
          onClick={() => setActiveTab('notifications')}
          title="การแจ้งเตือน"
          className="smart-icon-btn relative"
        >
          <Bell size={20} className="text-gray-600 hover:text-[#6355d8] transition-colors" />
          {unreadNotifCount > 0 && (
            <span className="smart-notif-dot">
              {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
            </span>
          )}
        </button>

        {/* User Profile Pill */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="smart-user-pill"
          >
            <div className="smart-user-avatar">
              {user?.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={displayName} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <span className="text-sm font-bold text-white">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <span className="smart-user-name">{displayName}</span>
            <ChevronDown size={16} className={`text-gray-500 transition-transform duration-200 ${showUserDropdown ? 'rotate-180' : ''}`} />
          </button>

          {/* User Dropdown */}
          {showUserDropdown && (
            <div className="smart-user-dropdown">
              <div className="p-3 border-b border-gray-100">
                <p className="text-xs text-gray-400 font-medium">เข้าสู่ระบบในชื่อ</p>
                <p className="text-sm font-bold text-gray-800 truncate">{displayName}</p>
                <p className="text-xs text-[#6355d8] font-semibold mt-0.5">{user?.role === 'admin' ? '👑 ผู้ดูแลระบบ' : 'พนักงาน'}</p>
              </div>

              <div className="p-1">
                <button
                  onClick={() => {
                    setActiveTab('menu');
                    setShowUserDropdown(false);
                  }}
                  className="smart-dropdown-item"
                >
                  <User size={16} />
                  <span>จัดการโปรไฟล์</span>
                </button>
                <button
                  onClick={() => {
                    handleLogout();
                    setShowUserDropdown(false);
                  }}
                  className="smart-dropdown-item text-red-500 hover:bg-red-50"
                >
                  <LogOut size={16} />
                  <span>ออกจากระบบ</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
