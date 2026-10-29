// app/components/MoreDrawer.js
'use client';
import React, { useState, useEffect } from 'react';
import { X, ChevronDown, Home } from 'lucide-react';
import { isAdmin } from '../utils/permissions';
import { getVisibleNavItems, getVisibleSubItems, isSubItemActive } from '../config/navigation';

export default function MoreDrawer({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  onNavigateWithSub,
  dashboardPosTab = 'my',
  dashboardSubTab = 'tasks',
  stockOnlyMode = false,
  user,
  unreadNotifCount = 0,
}) {
  // Accordion section; null means "follow the active tab"
  const [manualSection, setManualSection] = useState(null);
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) setManualSection(null);
  }
  const expandedSection = manualSection ?? activeTab;

  // Lock page scroll while the drawer is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const toggleSection = (sectionKey) => {
    setManualSection(expandedSection === sectionKey ? '' : sectionKey);
  };

  const handleSelectSub = (tabKey, params = {}) => {
    if (onNavigateWithSub) {
      onNavigateWithSub(tabKey, params);
    } else {
      setActiveTab(tabKey);
    }
    onClose();
  };

  const isUserAdmin = isAdmin(user);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`more-drawer-backdrop ${isOpen ? 'open' : ''}`}
        onClick={onClose}
      />

      {/* Slide-over Drawer Panel */}
      <aside
        className={`more-drawer glass-strong ${isOpen ? 'open' : ''}`}
        aria-label="เมนูหลัก"
      >
        <div className="more-drawer-handle sm:hidden" />

        {/* Header: who is signed in */}
        <div className="more-drawer-header">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center overflow-hidden shrink-0 ring-2 ring-white">
              {user?.photoURL ? (
                <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-base font-black">{user?.name ? user.name.charAt(0).toUpperCase() : 'U'}</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-ink truncate leading-tight">{user?.name || 'ผู้ใช้งาน'}</h3>
                {isUserAdmin && (
                  <span className="px-2 py-0.5 bg-brand-50 text-brand-700 text-xs font-bold rounded-full">Admin</span>
                )}
              </div>
              <p className="text-xs text-ink-muted truncate mt-0.5">{user?.position || user?.department || 'พนักงาน'}</p>
            </div>
          </div>

          <button type="button" className="more-drawer-close" onClick={onClose} aria-label="ปิดเมนู">
            <X size={18} />
          </button>
        </div>

        {/* Navigation (accordion) */}
        <div className="more-drawer-content">
          <div className="space-y-1 px-3 pb-6 pt-1">
            {getVisibleNavItems(user, { stockOnlyMode }).map(item => {
              const Icon = item.icon;
              const isTabActive = activeTab === item.key;
              const subItems = getVisibleSubItems(item, user, { stockOnlyMode });
              const hasSub = subItems.length > 0;
              const isExpanded = hasSub && expandedSection === item.key;
              const badge = item.key === 'notifications' ? unreadNotifCount : 0;

              return (
                <div key={item.key}>
                  <button
                    type="button"
                    className={`w-full flex items-center gap-3 p-2.5 rounded-2xl text-left transition-colors duration-150 ${
                      isTabActive ? 'bg-white/90 text-brand-600 shadow-sm' : 'text-ink hover:bg-white/60'
                    }`}
                    onClick={() => (hasSub ? toggleSection(item.key) : handleSelectSub(item.key))}
                    aria-expanded={hasSub ? isExpanded : undefined}
                  >
                    <span className={`w-10 h-10 rounded-control flex items-center justify-center shrink-0 transition-colors ${
                      isTabActive ? 'bg-brand-500 text-white' : 'bg-brand-50 text-brand-500'
                    }`}>
                      <Icon size={19} strokeWidth={isTabActive ? 2.4 : 2} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-bold leading-tight truncate">{item.label}</span>
                      <span className="block text-xs text-ink-muted truncate mt-0.5">{item.desc}</span>
                    </span>
                    {badge > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-black bg-danger-500 text-white">
                        {badge > 9 ? '9+' : badge}
                      </span>
                    )}
                    {hasSub && (
                      <ChevronDown size={16} className={`shrink-0 text-ink-subtle transition-transform duration-200 ${isExpanded ? 'rotate-180 text-brand-500' : ''}`} />
                    )}
                  </button>

                  {hasSub && (
                    <div className={`more-drawer-sub-wrapper ${isExpanded ? 'expanded' : ''}`}>
                      <div className="more-drawer-sub-container">
                        {subItems.map(sub => {
                          const SubIcon = sub.icon;
                          const isSubActive = isSubItemActive(item, sub, { activeTab, dashboardSubTab, dashboardPosTab });
                          return (
                            <button
                              key={sub.key}
                              type="button"
                              onClick={() => handleSelectSub(item.key, sub.params || {})}
                              className={`w-full flex items-center gap-2.5 min-h-[40px] px-3 pl-12 rounded-xl text-sm text-left transition-colors ${
                                isSubActive ? 'bg-brand-500/10 text-brand-600 font-bold' : 'text-ink-muted hover:bg-white/60 hover:text-ink'
                              }`}
                            >
                              <SubIcon size={15} className="shrink-0" />
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
        </div>

        <div className="more-drawer-footer">
          <button
            type="button"
            onClick={() => handleSelectSub('dashboard', { posTab: 'my' })}
            className="w-full h-11 px-4 bg-white/70 hover:bg-white text-brand-700 font-bold text-sm rounded-control transition-colors flex items-center justify-center gap-2"
          >
            <Home size={16} /> กลับหน้าหลัก
          </button>
        </div>
      </aside>
    </>
  );
}
