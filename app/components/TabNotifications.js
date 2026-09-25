// app/components/TabNotifications.js
'use client';
import React, { useState, useMemo } from 'react';
import {
  Bell, AlertTriangle, Package, BarChart3, UserPlus,
  CheckCircle2, Clock, Filter, CheckCheck, Trash2, X,
  ChevronRight, ArrowDownCircle, ArrowUpCircle, ShieldAlert, FileText
} from 'lucide-react';
import { hasPermission, isAdmin } from '../utils/permissions';

const NOTIF_CATEGORIES = [
  { key: 'all', label: 'ทั้งหมด', icon: Bell, color: 'text-gray-600', bg: 'bg-gray-100' },
  { key: 'stock', label: 'สต็อก', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100' },
  { key: 'movement', label: 'เคลื่อนไหว', icon: Package, color: 'text-blue-600', bg: 'bg-blue-100' },
  { key: 'dashboard', label: 'รายงาน', icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-100' },
  { key: 'user', label: 'ผู้ใช้', icon: UserPlus, color: 'text-orange-600', bg: 'bg-orange-100' },
  { key: 'hr', label: 'บุคลากร/ลา', icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-100' },
];

export default function TabNotifications({
  user,
  notifications = [],
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
  onNavigate,
}) {
  const [activeFilter, setActiveFilter] = useState('all');

  // กรองตามสิทธิ์ — Staff ไม่เห็นแจ้งเตือนประเภท user หรือ hr
  const accessibleNotifs = useMemo(() => {
    return notifications.filter(n => {
      if (n.category === 'user' && !isAdmin(user)) return false;
      if (n.category === 'hr' && !isAdmin(user)) return false;
      return true;
    });
  }, [notifications, user]);

  // กรองตาม filter ที่เลือก
  const filteredNotifs = useMemo(() => {
    if (activeFilter === 'all') return accessibleNotifs;
    return accessibleNotifs.filter(n => n.category === activeFilter);
  }, [accessibleNotifs, activeFilter]);

  // นับ unread ตามหมวด
  const unreadCounts = useMemo(() => {
    const counts = { all: 0, stock: 0, movement: 0, dashboard: 0, user: 0, hr: 0 };
    accessibleNotifs.forEach(n => {
      if (!n.read) {
        counts.all++;
        if (counts[n.category] !== undefined) counts[n.category]++;
      }
    });
    return counts;
  }, [accessibleNotifs]);

  const getNotifIcon = (notif) => {
    switch (notif.category) {
      case 'stock':
        return notif.severity === 'critical'
          ? <ShieldAlert size={20} className="text-red-500" />
          : <AlertTriangle size={20} className="text-yellow-500" />;
      case 'movement':
        return notif.subType === 'IN'
          ? <ArrowDownCircle size={20} className="text-green-500" />
          : <ArrowUpCircle size={20} className="text-blue-500" />;
      case 'dashboard':
        return <BarChart3 size={20} className="text-purple-500" />;
      case 'user':
        return <UserPlus size={20} className="text-orange-500" />;
      case 'hr':
        return <FileText size={20} className="text-indigo-500" />;
      default:
        return <Bell size={20} className="text-gray-500" />;
    }
  };

  const getNotifBorderColor = (notif) => {
    switch (notif.category) {
      case 'stock': return notif.severity === 'critical' ? 'border-l-red-500' : 'border-l-yellow-500';
      case 'movement': return notif.subType === 'IN' ? 'border-l-green-500' : 'border-l-blue-500';
      case 'dashboard': return 'border-l-purple-500';
      case 'user': return 'border-l-orange-500';
      case 'hr': return 'border-l-indigo-500';
      default: return 'border-l-gray-300';
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'เมื่อสักครู่';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} นาทีที่แล้ว`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ชั่วโมงที่แล้ว`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} วันที่แล้ว`;
    return date.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' });
  };

  // Filter tabs ที่ Staff เข้าถึงได้
  const availableCategories = NOTIF_CATEGORIES.filter(cat => {
    if (cat.key === 'user' && !isAdmin(user)) return false;
    if (cat.key === 'hr' && !isAdmin(user)) return false;
    return true;
  });

  return (
    <div className="space-y-4 pb-20 animate-fade-in-slide">
      {/* Header */}
      <div className="flex justify-between items-center px-1 pt-1">
        <h2 className="text-2xl font-bold text-green-900 flex items-center gap-2">
          <Bell size={24} className="text-green-700" /> แจ้งเตือน
          {unreadCounts.all > 0 && (
            <span className="notif-badge-large">{unreadCounts.all}</span>
          )}
        </h2>
        {unreadCounts.all > 0 && (
          <button
            onClick={onMarkAllAsRead}
            className="flex items-center gap-1.5 text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-full border border-green-200 hover:bg-green-100 active:scale-95 transition-all"
          >
            <CheckCheck size={14} /> อ่านทั้งหมด
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {availableCategories.map(cat => {
          const Icon = cat.icon;
          const isActive = activeFilter === cat.key;
          const count = unreadCounts[cat.key] || 0;
          return (
            <button
              key={cat.key}
              onClick={() => setActiveFilter(cat.key)}
              className={`notif-filter-tab ${isActive ? 'active' : ''}`}
            >
              <Icon size={14} />
              <span>{cat.label}</span>
              {count > 0 && (
                <span className={`notif-filter-badge ${isActive ? 'active' : ''}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Notification List */}
      <div className="space-y-3">
        {filteredNotifs.length === 0 ? (
          <div className="notif-empty">
            <div className="notif-empty-icon">
              <Bell size={40} />
            </div>
            <p className="text-sm font-bold text-gray-500">ไม่มีแจ้งเตือน</p>
            <p className="text-xs text-gray-400">
              {activeFilter !== 'all' ? 'ลองเปลี่ยนหมวดหมู่ดูครับ' : 'ระบบกำลังทำงานปกติ'}
            </p>
          </div>
        ) : (
          filteredNotifs.map(notif => (
            <div
              key={notif.id}
              className={`notif-card ${getNotifBorderColor(notif)} ${!notif.read ? 'unread' : ''}`}
              onClick={() => {
                if (!notif.read) onMarkAsRead?.(notif.id);
                if (notif.navigateTo) onNavigate?.(notif.navigateTo, notif);
              }}
            >
              <div className="notif-card-icon">
                {getNotifIcon(notif)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className={`text-sm font-bold truncate ${!notif.read ? 'text-gray-900' : 'text-gray-600'}`}>
                    {notif.title}
                  </h4>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0">
                    {formatTime(notif.timestamp)}
                  </span>
                </div>
                <p className={`text-xs mt-0.5 line-clamp-2 ${!notif.read ? 'text-gray-600' : 'text-gray-400'}`}>
                  {notif.message}
                </p>
                {notif.items && notif.items.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {notif.items.slice(0, 3).map((item, idx) => (
                      <span key={idx} className="notif-item-tag">
                        {item}
                      </span>
                    ))}
                    {notif.items.length > 3 && (
                      <span className="notif-item-tag more">
                        +{notif.items.length - 3} อื่นๆ
                      </span>
                    )}
                  </div>
                )}
              </div>
              {!notif.read && <div className="notif-unread-dot" />}
              {notif.navigateTo && (
                <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
