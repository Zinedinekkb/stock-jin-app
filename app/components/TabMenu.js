// app/components/TabMenu.js
'use client';
import React, { useState, useRef } from 'react';
import {
  User, Settings, Smartphone, LogOut, ShieldCheck, Check, X, History, Briefcase,
  ChevronDown, Clock, Camera, Pencil, Save, Trash2, Crown, Building2, Phone, Boxes
} from 'lucide-react';
import { GlassCard, Button, Badge, SectionHeader, ListRow } from './ui';

const PRESET_POSITIONS = [
  { label: 'เชฟ / แม่ครัว' },
  { label: 'ผู้ช่วยเชฟ' },
  { label: 'พนักงานเสิร์ฟ' },
  { label: 'พนักงานแคชเชียร์' },
  { label: 'พนักงานคุมสต็อก' },
  { label: 'ผู้จัดการร้าน' },
  { label: 'ผู้ดูแลระบบ' },
];

export default function TabMenu({ 
  user, handleLogout,
  // Shop-wide stock-only mode (admin switch)
  stockOnlyMode = false, onToggleStockOnlyMode,
  // Props สำหรับแอดมินอนุมัติ
  pendingUsers = [], approvalHistory = [], handleApproveUser, handleRejectUser,
  // Props สำหรับแก้ไขโปรไฟล์
  handleUpdateProfile
}) {
  const [userToApprove, setUserToApprove] = useState(null);
  const [selectedPosition, setSelectedPosition] = useState('พนักงานเสิร์ฟ');
  const [customPosition, setCustomPosition] = useState('');
  const [selectedRole, setSelectedRole] = useState('staff');
  const [showHistory, setShowHistory] = useState(false);

  // --- Profile Edit State ---
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editNickname, setEditNickname] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [removePhoto, setRemovePhoto] = useState(false);
  const fileInputRef = useRef(null);

  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  const openProfileEdit = () => {
    setEditName(user?.name || '');
    setEditNickname(user?.nickname || '');
    setEditDepartment(user?.department || 'ฝ่ายคลังสินค้าและการจัดส่ง');
    setEditPhone(user?.phone || '');
    setPreviewPhoto(null);
    setSelectedFile(null);
    setProfileError('');
    setRemovePhoto(false);
    setShowProfileEdit(true);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileError('');

    if (!ALLOWED_TYPES.includes(file.type)) {
      setProfileError('รองรับเฉพาะไฟล์ JPEG, PNG, WebP เท่านั้น');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setProfileError(`ไฟล์ใหญ่เกินไป (${(file.size / 1024 / 1024).toFixed(1)}MB) — สูงสุด 2MB`);
      return;
    }

    setSelectedFile(file);
    setRemovePhoto(false);
    const reader = new FileReader();
    reader.onload = (ev) => setPreviewPhoto(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleRemoveCurrentPhoto = () => {
    setPreviewPhoto(null);
    setSelectedFile(null);
    setRemovePhoto(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveProfile = async () => {
    const trimmedName = editName.trim();
    if (!trimmedName) {
      setProfileError('กรุณากรอกชื่อ-นามสกุล');
      return;
    }
    const nameParts = trimmedName.split(/\s+/);
    if (nameParts.length < 2) {
      setProfileError('กรุณาระบุทั้งชื่อจริงและนามสกุล (เช่น สมชาย ใจดี)');
      return;
    }
    setProfileSaving(true);
    setProfileError('');
    try {
      await handleUpdateProfile(trimmedName, selectedFile, removePhoto, {
        nickname: editNickname.trim(),
        department: editDepartment.trim(),
        phone: editPhone.trim(),
      });
      setShowProfileEdit(false);
    } catch (err) {
      console.error('Profile update error:', err);
      setProfileError('เกิดข้อผิดพลาดในการบันทึก: ' + err.message);
    } finally {
      setProfileSaving(false);
    }
  };

  const openApproveModal = (u) => {
    setUserToApprove(u);
    setSelectedPosition('พนักงานเสิร์ฟ');
    setCustomPosition('');
    setSelectedRole('staff');
  };

  const confirmApprove = () => {
    if (!userToApprove) return;
    const finalPos = customPosition.trim() ? customPosition.trim() : selectedPosition;
    handleApproveUser(userToApprove, finalPos, selectedRole);
    setUserToApprove(null);
  };

  const formatDate = (ts) => {
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString('th-TH', {
      day: '2-digit', month: 'short', year: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  };

  if (!user) return null;

  const isUserAdmin = user.role === 'admin';
  const providerLabel = (provider = '') => provider.includes('google') ? 'Google' : provider.includes('github') ? 'GitHub' : 'Email';

  return (
      <div className="space-y-5 pb-24 animate-fade-in-slide">
        {/* Profile: the single place that shows who you are, with one edit action */}
        <GlassCard strong className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-brand-100 text-brand-600 ring-4 ring-white shadow-glass overflow-hidden flex items-center justify-center font-black text-2xl shrink-0">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user.name?.charAt(0) || 'U'
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-lg text-ink truncate">
                {user.name}
                {user.nickname && <span className="font-semibold text-ink-muted"> ({user.nickname})</span>}
              </h3>
              <p className="text-sm text-ink-muted truncate">{user.email}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge tone={isUserAdmin ? 'brand' : 'neutral'} icon={isUserAdmin ? Crown : User}>{isUserAdmin ? 'ผู้ดูแลระบบ' : 'พนักงาน'}</Badge>
                {user.position && <Badge tone="neutral" icon={Briefcase}>{user.position}</Badge>}
                {user.department && <Badge tone="neutral" icon={Building2}>{user.department}</Badge>}
              </div>
            </div>
          </div>
          {user.phone && (
            <p className="mt-4 text-sm text-ink-muted flex items-center gap-2"><Phone size={14} className="text-brand-400" /> {user.phone}</p>
          )}
          {!(user.name || '').trim().includes(' ') && (
            <p className="mt-4 text-sm text-warning-700 bg-warning-50 border border-warning-100 rounded-control px-3 py-2">
              ยังไม่ได้ระบุชื่อ-นามสกุลจริง ซึ่งต้องใช้พิมพ์ในใบลาและเอกสาร
            </p>
          )}
          <Button variant="secondary" icon={Pencil} block className="mt-4" onClick={openProfileEdit}>
            แก้ไขโปรไฟล์
          </Button>
        </GlassCard>

        {/* Admin: pending sign-ups need action, so they come first */}
        {isUserAdmin && pendingUsers.length > 0 && (
          <section>
            <SectionHeader title={`คำขอสมัครสมาชิก (${pendingUsers.length})`} />
            <GlassCard className="divide-y divide-white/70 overflow-hidden">
              {pendingUsers.map(u => (
                <div key={u.id} className="p-3.5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-warning-50 text-warning-700 font-bold flex items-center justify-center overflow-hidden shrink-0">
                    {u.photoURL ? <img src={u.photoURL} alt={u.name} className="w-full h-full object-cover" /> : (u.name?.charAt(0) || 'U').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-ink text-sm truncate">{u.name}</p>
                      {u.provider && <Badge tone="neutral">{providerLabel(u.provider)}</Badge>}
                    </div>
                    <p className="text-xs text-ink-muted truncate">{u.email}</p>
                  </div>
                  <button onClick={() => handleRejectUser(u)} className="w-10 h-10 rounded-control text-danger-600 hover:bg-danger-50 flex items-center justify-center shrink-0" aria-label={`ปฏิเสธ ${u.name}`}>
                    <X size={18}/>
                  </button>
                  <Button size="sm" icon={Check} onClick={() => openApproveModal(u)} className="shrink-0">อนุมัติ</Button>
                </div>
              ))}
            </GlassCard>
          </section>
        )}

        <section>
          <SectionHeader title="บัญชีและระบบ" />
          <GlassCard className="divide-y divide-white/70 overflow-hidden">
            {isUserAdmin && (
              <>
                <ListRow
                  icon={History}
                  label="ประวัติการอนุมัติสมาชิก"
                  description="ใครอนุมัติใคร และให้ตำแหน่งอะไร"
                  onClick={() => setShowHistory(prev => !prev)}
                  trailing={
                    <span className="flex items-center gap-2 shrink-0">
                      <Badge>{approvalHistory.length}</Badge>
                      <ChevronDown size={16} className={`text-ink-subtle transition-transform duration-200 ${showHistory ? 'rotate-180' : ''}`} />
                    </span>
                  }
                />
                {showHistory && (
                  <div className="px-4 py-3 space-y-2 max-h-80 overflow-y-auto bg-white/40">
                    {approvalHistory.length === 0 ? (
                      <p className="text-center py-6 text-sm text-ink-subtle">ยังไม่มีประวัติ</p>
                    ) : (
                      approvalHistory.map((item, idx) => (
                        <div key={item.id || idx} className="bg-white/80 p-3 rounded-control flex justify-between items-start gap-3">
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-ink">{item.userName}</span>
                              <Badge tone={item.action === 'approved' ? 'success' : 'danger'}>{item.action === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'}</Badge>
                            </div>
                            <p className="text-xs text-ink-muted truncate">{item.userEmail}</p>
                            {item.action === 'approved' && (
                              <p className="text-xs text-ink-muted">{item.position || 'พนักงานทั่วไป'} · {item.role === 'admin' ? 'ผู้ดูแลระบบ' : 'พนักงาน'}</p>
                            )}
                          </div>
                          <div className="text-right text-xs text-ink-subtle whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1"><Clock size={12}/> {formatDate(item.timestamp)}</div>
                            <div className="mt-1">โดย {item.approvedBy || 'Admin'}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
            {isUserAdmin && onToggleStockOnlyMode && (
              <ListRow
                icon={Boxes}
                label="โหมดเฉพาะสต็อก"
                description="ซ่อนเข้า-ออกงาน/ลา และรายการงานประจำวัน สำหรับทุกคนในร้าน"
                onClick={() => onToggleStockOnlyMode(!stockOnlyMode)}
                trailing={
                  <span role="switch" aria-checked={stockOnlyMode} className={`relative w-12 h-7 rounded-full shrink-0 transition-colors ${stockOnlyMode ? 'bg-brand-500' : 'bg-ink-subtle/30'}`}>
                    <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-[left] duration-150 ${stockOnlyMode ? 'left-6' : 'left-1'}`} />
                  </span>
                }
              />
            )}
            <ListRow icon={Smartphone} label="เกี่ยวกับแอป" description="StockPro · ระบบคลังสินค้าและบุคลากร" trailing={<Badge tone="neutral">v2.2</Badge>} />
          </GlassCard>
        </section>

        <Button variant="danger-ghost" icon={LogOut} block onClick={handleLogout}>
          ออกจากระบบ
        </Button>

        {/* --- MODAL ตอบรับอนุมัติสมาชิก และระบุตำแหน่ง --- */}
        {userToApprove && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-fade-in">
            <div className="glass-strong w-full max-w-md rounded-card p-6 animate-scale-in">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-brand-100">
                <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                  <ShieldCheck size={22} className="text-brand-500" /> อนุมัติสมาชิก
                </h3>
                <button onClick={() => setUserToApprove(null)} className="w-9 h-9 rounded-control flex items-center justify-center text-ink-subtle hover:bg-white/70" aria-label="ปิด">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                {/* ข้อมูลผู้สมัคร */}
                <div className="bg-brand-50/70 p-3.5 rounded-control">
                  <p className="text-xs font-bold text-brand-700">ผู้ขอสมัครใช้งาน</p>
                  <p className="text-base font-black text-ink mt-0.5">{userToApprove.name}</p>
                  <p className="text-sm text-ink-muted">{userToApprove.email}</p>
                </div>

                {/* เลือกตำแหน่ง */}
                <div>
                  <label className="text-sm font-bold text-ink flex items-center gap-1.5 mb-2">
                    <Briefcase size={15} className="text-brand-500" /> ตำแหน่งงาน
                  </label>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {PRESET_POSITIONS.map(p => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => { setSelectedPosition(p.label); setCustomPosition(''); }}
                        className={`min-h-[44px] px-3 rounded-control border text-sm font-bold text-left transition-colors ${
                          (selectedPosition === p.label && !customPosition)
                            ? 'bg-brand-500 text-white border-brand-500'
                            : 'bg-white/70 text-ink border-white hover:bg-white'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {/* ระบุตำแหน่งเอง */}
                  <input
                    type="text"
                    placeholder="หรือระบุตำแหน่งอื่นๆ..."
                    value={customPosition}
                    onChange={(e) => setCustomPosition(e.target.value)}
                    className="w-full border border-white bg-white/70 rounded-control px-3 h-11 text-sm focus:bg-white focus:ring-2 focus:ring-brand-200 outline-none"
                  />
                </div>

                {/* เลือกสิทธิ์ (Role) */}
                <div>
                  <label className="text-sm font-bold text-ink mb-2 block">สิทธิ์การเข้าถึงระบบ</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedRole('staff')}
                      className={`flex-1 h-11 rounded-control border text-sm font-bold transition-colors ${
                        selectedRole === 'staff'
                          ? 'bg-brand-500 text-white border-brand-500'
                          : 'bg-white/70 text-ink-muted border-white'
                      }`}
                    >
                      พนักงาน
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRole('admin')}
                      className={`flex-1 h-11 rounded-control border text-sm font-bold transition-colors ${
                        selectedRole === 'admin'
                          ? 'bg-brand-500 text-white border-brand-500'
                          : 'bg-white/70 text-ink-muted border-white'
                      }`}
                    >
                      ผู้ดูแลระบบ
                    </button>
                  </div>
                </div>

                {/* ปุ่ม Action */}
                <div className="flex gap-3 pt-3">
                  <Button variant="secondary" className="flex-1" onClick={() => setUserToApprove(null)}>ยกเลิก</Button>
                  <Button icon={Check} className="flex-[2]" onClick={confirmApprove}>ยืนยันการอนุมัติ</Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- MODAL แก้ไขโปรไฟล์ --- */}
        {showProfileEdit && user && (
          <div className="profile-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget && !profileSaving) setShowProfileEdit(false); }}>
            <div className="profile-modal-card">
              {/* Pinned Header */}
              <div className="profile-modal-header">
                <div className="profile-modal-header-info">
                  <h3>แก้ไขโปรไฟล์</h3>
                  <p>เปลี่ยนข้อมูลส่วนตัวและอัปโหลดรูปประจำตัว</p>
                </div>
                <button
                  type="button"
                  className="profile-modal-close"
                  onClick={() => !profileSaving && setShowProfileEdit(false)}
                  aria-label="ปิด"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable Body (Avatar + All Fields) */}
              <div className="profile-modal-body">
                {/* Avatar Upload */}
                <div className="profile-avatar-section">
                  <div className="profile-avatar-wrapper" onClick={() => fileInputRef.current?.click()}>
                    <div className="profile-avatar-circle">
                      {previewPhoto ? (
                        <img src={previewPhoto} alt="Preview" />
                      ) : (!removePhoto && user.photoURL) ? (
                        <img src={user.photoURL} alt={user.name} />
                      ) : (
                        <span className="profile-avatar-initial">{editName?.charAt(0) || user.name?.charAt(0) || 'U'}</span>
                      )}
                    </div>
                    <div className="profile-avatar-overlay">
                      <Camera size={22} className="text-white" />
                      <span className="profile-avatar-overlay-text">เปลี่ยนรูป</span>
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <p className="profile-avatar-hint">คลิกเพื่อเปลี่ยนรูป (JPEG, PNG, WebP — สูงสุด 2MB)</p>
                  {(previewPhoto || (!removePhoto && user.photoURL)) && (
                    <button onClick={handleRemoveCurrentPhoto} className="profile-remove-photo mt-1">
                      <Trash2 size={11} className="inline mr-1" />ลบรูปโปรไฟล์
                    </button>
                  )}
                </div>

                {/* Form Inputs */}
                <div className="profile-form-section">
                  {profileError && <div className="profile-file-error">{profileError}</div>}

                  <div className="profile-form-group">
                    <label className="profile-form-label">
                      <User size={14} className="text-brand-500" /> ชื่อจริง - นามสกุล (สำหรับพิมพ์ในเอกสาร) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="profile-form-input"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="เช่น สมชาย ใจดี"
                      maxLength={70}
                    />
                    <p className="text-xs text-ink-subtle mt-1">ต้องระบุทั้งชื่อและนามสกุลจริง เพื่อใช้พิมพ์ลงในใบลาและเอกสารราชการ/บริษัท</p>
                  </div>

                  <div className="profile-form-group">
                    <label className="profile-form-label">
                      <User size={14} className="text-brand-500" /> ชื่อเล่น
                    </label>
                    <input
                      type="text"
                      className="profile-form-input"
                      value={editNickname}
                      onChange={(e) => setEditNickname(e.target.value)}
                      placeholder="เช่น ต้น, จิน"
                      maxLength={30}
                    />
                  </div>

                  <div className="profile-form-group">
                    <label className="profile-form-label">
                      <Briefcase size={14} className="text-brand-500" /> แผนก / ฝ่ายสังกัด
                    </label>
                    <input
                      type="text"
                      className="profile-form-input"
                      value={editDepartment}
                      onChange={(e) => setEditDepartment(e.target.value)}
                      placeholder="เช่น ฝ่ายคลังสินค้าและการจัดส่ง"
                      maxLength={50}
                    />
                  </div>

                  <div className="profile-form-group">
                    <label className="profile-form-label">
                      <Smartphone size={14} className="text-brand-500" /> เบอร์โทรศัพท์ติดต่อ
                    </label>
                    <input
                      type="tel"
                      className="profile-form-input"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="เช่น 081-234-5678"
                      maxLength={20}
                    />
                  </div>

                  <div className="profile-form-group">
                    <label className="profile-form-label">
                      <Settings size={14} className="text-gray-400" /> อีเมล (ไม่สามารถแก้ไขได้)
                    </label>
                    <div className="profile-form-readonly">{user.email}</div>
                  </div>

                  <div className="profile-form-group">
                    <label className="profile-form-label">
                      <Briefcase size={14} className="text-gray-400" /> ตำแหน่ง (กำหนดโดยผู้ดูแล)
                    </label>
                    <div className="profile-form-readonly">{user.position || 'ยังไม่ระบุ'}</div>
                  </div>
                </div>
              </div>

              {/* Pinned Footer Actions */}
              <div className="profile-modal-footer">
                <button
                  type="button"
                  className="profile-btn-cancel"
                  onClick={() => setShowProfileEdit(false)}
                  disabled={profileSaving}
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  className="profile-btn-save"
                  onClick={handleSaveProfile}
                  disabled={profileSaving}
                >
                  {profileSaving ? (
                    <><div className="profile-upload-spinner" /> กำลังบันทึก...</>
                  ) : (
                    <><Save size={16} /> บันทึกการเปลี่ยนแปลง</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}