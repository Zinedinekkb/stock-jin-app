// app/components/TabUserDirectory.js
'use client';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, Search, Shield, ShieldCheck, UserCheck, UserX, Building2,
  ChevronDown, ChevronUp, Mail, Calendar, Briefcase, Filter,
  ArrowUpDown, MoreHorizontal, X, Check, Loader2, AlertTriangle
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

const DEPARTMENTS = [
  { key: 'all', label: 'ทั้งหมด', emoji: '👥' },
  { key: 'warehouse', label: 'คลังสินค้า', emoji: '📦' },
  { key: 'procurement', label: 'จัดซื้อ', emoji: '🛒' },
  { key: 'service', label: 'หน้าร้าน / บริการ', emoji: '🏪' },
  { key: 'finance', label: 'การเงิน / บัญชี', emoji: '💰' },
  { key: 'management', label: 'บริหาร', emoji: '👔' },
  { key: 'unassigned', label: 'ไม่ระบุ', emoji: '❓' },
];

export default function TabUserDirectory({ user }) {
  const [allUsers, setAllUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [sortBy, setSortBy] = useState('name'); // name, role, date
  const [editingUser, setEditingUser] = useState(null);
  const [editDepartment, setEditDepartment] = useState('');
  const [editPosition, setEditPosition] = useState('');
  const [editRole, setEditRole] = useState('staff');
  const [isSaving, setIsSaving] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(null);

  // Fetch all users
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllUsers(users);
    });
    return () => unsub();
  }, []);

  // Stats
  const stats = useMemo(() => {
    const total = allUsers.length;
    const active = allUsers.filter(u => u.status === 'approved').length;
    const pending = allUsers.filter(u => u.status === 'pending').length;
    const deactivated = allUsers.filter(u => u.status === 'deactivated').length;
    const admins = allUsers.filter(u => u.role === 'admin' && u.status !== 'deactivated').length;
    const staff = allUsers.filter(u => u.role === 'staff' && u.status !== 'deactivated').length;
    return { total, active, pending, deactivated, admins, staff };
  }, [allUsers]);

  // Department counts
  const deptCounts = useMemo(() => {
    const counts = {};
    DEPARTMENTS.forEach(d => { counts[d.key] = 0; });
    allUsers.filter(u => u.status !== 'deactivated').forEach(u => {
      const dept = u.department || 'unassigned';
      if (counts[dept] !== undefined) counts[dept]++;
      else counts['unassigned']++;
    });
    counts['all'] = allUsers.filter(u => u.status !== 'deactivated').length;
    return counts;
  }, [allUsers]);

  // Filtered & sorted users
  const filteredUsers = useMemo(() => {
    let result = allUsers;

    // Filter by department
    if (selectedDept !== 'all') {
      if (selectedDept === 'unassigned') {
        result = result.filter(u => !u.department || u.department === 'unassigned');
      } else {
        result = result.filter(u => u.department === selectedDept);
      }
    }

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(u =>
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.position || '').toLowerCase().includes(q)
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'role') {
        if (a.role === 'admin' && b.role !== 'admin') return -1;
        if (a.role !== 'admin' && b.role === 'admin') return 1;
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortBy === 'date') {
        const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return tb - ta;
      }
      return 0;
    });

    return result;
  }, [allUsers, selectedDept, searchQuery, sortBy]);

  // Open edit modal
  const openEditUser = (u) => {
    setEditingUser(u);
    setEditDepartment(u.department || 'unassigned');
    setEditPosition(u.position || '');
    setEditRole(u.role || 'staff');
  };

  // Save changes
  const handleSaveUserEdit = async () => {
    if (!editingUser) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', editingUser.id), {
        department: editDepartment,
        position: editPosition,
        role: editRole,
        updatedAt: serverTimestamp(),
        updatedBy: user?.name || 'Admin',
      });
      setEditingUser(null);
    } catch (err) {
      console.error('Update user error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Deactivate user
  const handleDeactivateUser = async (targetUser) => {
    try {
      await updateDoc(doc(db, 'users', targetUser.id), {
        status: 'deactivated',
        deactivatedAt: serverTimestamp(),
        deactivatedBy: user?.name || 'Admin',
      });
      setShowDeactivateConfirm(null);
    } catch (err) {
      console.error('Deactivate user error:', err);
    }
  };

  // Reactivate user
  const handleReactivateUser = async (targetUser) => {
    try {
      await updateDoc(doc(db, 'users', targetUser.id), {
        status: 'approved',
        reactivatedAt: serverTimestamp(),
        reactivatedBy: user?.name || 'Admin',
      });
    } catch (err) {
      console.error('Reactivate user error:', err);
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'approved') return { label: 'Active', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    if (status === 'pending') return { label: 'Pending', cls: 'bg-amber-100 text-amber-700 border-amber-200' };
    if (status === 'deactivated') return { label: 'Inactive', cls: 'bg-red-100 text-red-700 border-red-200' };
    return { label: status || '—', cls: 'bg-gray-100 text-gray-600 border-gray-200' };
  };

  const getRoleBadge = (role) => {
    if (role === 'admin') return { label: '👑 Admin', cls: 'bg-indigo-100 text-indigo-700 border-indigo-200' };
    return { label: '✅ Staff', cls: 'bg-slate-100 text-slate-600 border-slate-200' };
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '—';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 24 }}>
      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
        {[
          { label: 'บัญชีทั้งหมด', value: stats.total, icon: Users, color: '#6366f1' },
          { label: 'ใช้งานอยู่', value: stats.active, icon: UserCheck, color: '#10b981' },
          { label: 'รอดำเนินการ', value: stats.pending, icon: AlertTriangle, color: '#f59e0b' },
          { label: 'Admin', value: stats.admins, icon: Shield, color: '#8b5cf6' },
          { label: 'Staff', value: stats.staff, icon: ShieldCheck, color: '#64748b' },
          { label: 'ถูกระงับ', value: stats.deactivated, icon: UserX, color: '#ef4444' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} style={{
              background: 'white',
              borderRadius: 16,
              padding: '18px 16px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              border: '1px solid #f3f4f6',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12,
                background: `${s.color}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={20} color={s.color} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#111827', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search + Sort */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            placeholder="ค้นหาชื่อ, อีเมล, ตำแหน่ง..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px 10px 36px',
              border: '1.5px solid #e5e7eb', borderRadius: 12,
              fontSize: 13, color: '#374151', outline: 'none',
              background: 'white', boxSizing: 'border-box',
            }}
          />
        </div>
        <button
          onClick={() => setSortBy(sortBy === 'name' ? 'role' : sortBy === 'role' ? 'date' : 'name')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 14px', borderRadius: 12,
            border: '1.5px solid #e5e7eb', background: 'white',
            fontSize: 12, fontWeight: 600, color: '#6b7280',
            cursor: 'pointer',
          }}
        >
          <ArrowUpDown size={14} />
          {sortBy === 'name' ? 'ชื่อ' : sortBy === 'role' ? 'สิทธิ์' : 'วันที่'}
        </button>
      </div>

      {/* Department Filters */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        {DEPARTMENTS.map(dept => (
          <button
            key={dept.key}
            onClick={() => setSelectedDept(dept.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 20,
              border: selectedDept === dept.key ? '1.5px solid #4f46e5' : '1.5px solid #e5e7eb',
              background: selectedDept === dept.key ? '#4f46e5' : 'white',
              color: selectedDept === dept.key ? '#ffffff' : '#6b7280',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              whiteSpace: 'nowrap', flexShrink: 0,
              transition: 'all 0.15s',
            }}
          >
            <span>{dept.emoji}</span>
            <span>{dept.label}</span>
            <span style={{
              background: selectedDept === dept.key ? 'rgba(255,255,255,0.25)' : '#f3f4f6',
              color: selectedDept === dept.key ? '#ffffff' : '#9ca3af',
              padding: '1px 7px', borderRadius: 10, fontSize: 10, fontWeight: 800,
            }}>{deptCounts[dept.key] || 0}</span>
          </button>
        ))}
      </div>

      {/* User Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredUsers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
            <Users size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p style={{ fontSize: 14, fontWeight: 700, color: '#6b7280' }}>ไม่พบผู้ใช้</p>
            <p style={{ fontSize: 12 }}>ลองเปลี่ยนตัวกรองหรือคำค้นหา</p>
          </div>
        ) : (
          filteredUsers.map(u => {
            const statusBadge = getStatusBadge(u.status);
            const roleBadge = getRoleBadge(u.role);
            const isCurrentUser = u.id === user?.uid;

            return (
              <div key={u.id} style={{
                background: 'white',
                borderRadius: 16,
                border: isCurrentUser ? '2px solid #c7d2fe' : '1px solid #f3f4f6',
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                overflow: 'hidden',
                transition: 'all 0.2s',
                opacity: u.status === 'deactivated' ? 0.6 : 1,
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 16px',
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: 44, height: 44, minWidth: 44,
                    borderRadius: '50%',
                    background: u.photoURL ? 'transparent' : 'linear-gradient(135deg, #6366f1, #818cf8)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 800, fontSize: 16,
                    overflow: 'hidden',
                    border: '2px solid #e5e7eb',
                  }}>
                    {u.photoURL ? (
                      <img src={u.photoURL} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      (u.name || '?').charAt(0).toUpperCase()
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
                        {u.name || 'ไม่ระบุชื่อ'}
                      </span>
                      {isCurrentUser && (
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: '1px 6px',
                          borderRadius: 6, background: '#eef2ff', color: '#6366f1',
                        }}>คุณ</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <Mail size={10} /> {u.email || '—'}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px',
                        borderRadius: 6, border: '1px solid',
                        ...(() => { const b = statusBadge; return { background: b.cls.includes('emerald') ? '#d1fae5' : b.cls.includes('amber') ? '#fef3c7' : b.cls.includes('red') ? '#fee2e2' : '#f3f4f6', color: b.cls.includes('emerald') ? '#059669' : b.cls.includes('amber') ? '#d97706' : b.cls.includes('red') ? '#dc2626' : '#6b7280', borderColor: b.cls.includes('emerald') ? '#a7f3d0' : b.cls.includes('amber') ? '#fde68a' : b.cls.includes('red') ? '#fecaca' : '#e5e7eb' }; })(),
                      }}>{statusBadge.label}</span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px',
                        borderRadius: 6, border: '1px solid',
                        background: u.role === 'admin' ? '#eef2ff' : '#f8fafc',
                        color: u.role === 'admin' ? '#4f46e5' : '#64748b',
                        borderColor: u.role === 'admin' ? '#c7d2fe' : '#e2e8f0',
                      }}>{roleBadge.label}</span>
                      {u.position && (
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '2px 8px',
                          borderRadius: 6, background: '#f9fafb', color: '#6b7280',
                          border: '1px solid #f3f4f6',
                        }}>{u.position}</span>
                      )}
                      {u.department && u.department !== 'unassigned' && (
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '2px 8px',
                          borderRadius: 6, background: '#f0f9ff', color: '#0284c7',
                          border: '1px solid #bae6fd',
                          display: 'flex', alignItems: 'center', gap: 3,
                        }}>
                          <Building2 size={9} />
                          {DEPARTMENTS.find(d => d.key === u.department)?.label || u.department}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {!isCurrentUser && u.status !== 'pending' && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => openEditUser(u)}
                        style={{
                          padding: '6px 12px', borderRadius: 8,
                          border: '1px solid #e5e7eb', background: 'white',
                          fontSize: 11, fontWeight: 600, color: '#6b7280',
                          cursor: 'pointer',
                        }}
                      >แก้ไข</button>
                      {u.status === 'deactivated' ? (
                        <button
                          onClick={() => handleReactivateUser(u)}
                          style={{
                            padding: '6px 12px', borderRadius: 8,
                            border: '1px solid #a7f3d0', background: '#d1fae5',
                            fontSize: 11, fontWeight: 600, color: '#059669',
                            cursor: 'pointer',
                          }}
                        >เปิดใช้</button>
                      ) : (
                        <button
                          onClick={() => setShowDeactivateConfirm(u)}
                          style={{
                            padding: '6px 12px', borderRadius: 8,
                            border: '1px solid #fecaca', background: '#fee2e2',
                            fontSize: 11, fontWeight: 600, color: '#dc2626',
                            cursor: 'pointer',
                          }}
                        >ระงับ</button>
                      )}
                    </div>
                  )}
                </div>

                {/* Date footer */}
                <div style={{
                  padding: '6px 16px',
                  background: '#f9fafb',
                  borderTop: '1px solid #f3f4f6',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  fontSize: 10, color: '#9ca3af',
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Calendar size={10} /> สมัครเมื่อ {formatDate(u.createdAt)}
                  </span>
                  {u.approvedBy && (
                    <span>อนุมัติโดย {u.approvedBy}</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 60,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
        }}>
          <div style={{
            background: 'white', width: '100%', maxWidth: 420,
            borderRadius: 24, boxShadow: '0 25px 60px -15px rgba(0,0,0,0.3)',
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #1e293b, #334155)',
              padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <h3 style={{ color: '#a5b4fc', fontSize: 16, fontWeight: 800, margin: 0 }}>
                  แก้ไขข้อมูลผู้ใช้
                </h3>
                <p style={{ color: 'rgba(203,213,225,0.8)', fontSize: 12, marginTop: 2 }}>
                  {editingUser.name} ({editingUser.email})
                </p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}
              ><X size={16} /></button>
            </div>

            {/* Body */}
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Department */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, display: 'block' }}>
                  <Building2 size={12} style={{ display: 'inline', marginRight: 4 }} /> แผนก / หน่วยงาน
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {DEPARTMENTS.filter(d => d.key !== 'all').map(dept => (
                    <button
                      key={dept.key}
                      onClick={() => setEditDepartment(dept.key)}
                      style={{
                        padding: '6px 12px', borderRadius: 8,
                        border: editDepartment === dept.key ? '2px solid #4f46e5' : '1.5px solid #e5e7eb',
                        background: editDepartment === dept.key ? '#eef2ff' : 'white',
                        color: editDepartment === dept.key ? '#4f46e5' : '#6b7280',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}
                    >{dept.emoji} {dept.label}</button>
                  ))}
                </div>
              </div>

              {/* Position */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, display: 'block' }}>
                  <Briefcase size={12} style={{ display: 'inline', marginRight: 4 }} /> ตำแหน่งงาน
                </label>
                <input
                  value={editPosition}
                  onChange={e => setEditPosition(e.target.value)}
                  placeholder="เช่น พนักงานคลัง, ผู้จัดการ, เชฟ..."
                  style={{
                    width: '100%', padding: '10px 12px',
                    border: '1.5px solid #e5e7eb', borderRadius: 10,
                    fontSize: 13, color: '#374151', outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Role */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, display: 'block' }}>
                  <Shield size={12} style={{ display: 'inline', marginRight: 4 }} /> สิทธิ์การเข้าถึง
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setEditRole('staff')}
                    style={{
                      flex: 1, padding: 10, borderRadius: 10,
                      border: editRole === 'staff' ? '2px solid #4f46e5' : '1.5px solid #e5e7eb',
                      background: editRole === 'staff' ? '#eef2ff' : 'white',
                      color: editRole === 'staff' ? '#4f46e5' : '#6b7280',
                      fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >✅ Staff</button>
                  <button
                    onClick={() => setEditRole('admin')}
                    style={{
                      flex: 1, padding: 10, borderRadius: 10,
                      border: editRole === 'admin' ? '2px solid #8b5cf6' : '1.5px solid #e5e7eb',
                      background: editRole === 'admin' ? '#f5f3ff' : 'white',
                      color: editRole === 'admin' ? '#7c3aed' : '#6b7280',
                      fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >👑 Admin</button>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button
                  onClick={() => setEditingUser(null)}
                  style={{
                    flex: 1, padding: 12, borderRadius: 12,
                    background: '#f3f4f6', color: '#6b7280',
                    border: '1px solid #e5e7eb', fontSize: 14,
                    fontWeight: 700, cursor: 'pointer',
                  }}
                >ยกเลิก</button>
                <button
                  onClick={handleSaveUserEdit}
                  disabled={isSaving}
                  style={{
                    flex: 2, padding: 12, borderRadius: 12,
                    background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                    color: 'white', border: 'none', fontSize: 14,
                    fontWeight: 700, cursor: isSaving ? 'not-allowed' : 'pointer',
                    opacity: isSaving ? 0.6 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate Confirm */}
      {showDeactivateConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 60,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
        }}>
          <div style={{
            background: 'white', width: '100%', maxWidth: 380,
            borderRadius: 20, padding: 24, textAlign: 'center',
            boxShadow: '0 25px 60px -15px rgba(0,0,0,0.3)',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: '#fee2e2', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <AlertTriangle size={28} color="#dc2626" />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginBottom: 8 }}>
              ระงับบัญชี "{showDeactivateConfirm.name}"?
            </h3>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
              ผู้ใช้คนนี้จะไม่สามารถเข้าสู่ระบบได้จนกว่าจะเปิดใช้งานใหม่
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowDeactivateConfirm(null)}
                style={{
                  flex: 1, padding: 12, borderRadius: 12,
                  background: '#f3f4f6', color: '#6b7280',
                  border: '1px solid #e5e7eb', fontSize: 14,
                  fontWeight: 700, cursor: 'pointer',
                }}
              >ยกเลิก</button>
              <button
                onClick={() => handleDeactivateUser(showDeactivateConfirm)}
                style={{
                  flex: 1, padding: 12, borderRadius: 12,
                  background: '#dc2626', color: 'white',
                  border: 'none', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer',
                }}
              >ระงับบัญชี</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
