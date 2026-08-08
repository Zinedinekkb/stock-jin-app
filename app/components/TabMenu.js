// app/components/TabMenu.js
'use client';
import React, { useState, useRef } from 'react';
import {
  User, Settings, ChevronRight, Smartphone, LogOut, UserPlus,
  ShieldCheck, Check, X, History, Briefcase, ChevronDown, ChevronUp, Clock,
  Camera, Pencil, Loader2, Save, Trash2
} from 'lucide-react';

const PRESET_POSITIONS = [
  { label: 'เชฟ / แม่ครัว', emoji: '👨‍🍳' },
  { label: 'ผู้ช่วยเชฟ', emoji: '🧑‍🍳' },
  { label: 'พนักงานเสิร์ฟ', emoji: '🍱' },
  { label: 'พนักงานแคชเชียร์', emoji: '💵' },
  { label: 'พนักงานคุมสต็อก', emoji: '📦' },
  { label: 'ผู้จัดการร้าน', emoji: '👔' },
  { label: 'ผู้ดูแลระบบ', emoji: '👑' },
];

export default function TabMenu({ 
  user, loginForm, setLoginForm, 
  handleLogin, handleLogout, loginError,
  // Props สำหรับสมัครสมาชิก
  isRegisterMode, setIsRegisterMode,
  registerForm, setRegisterForm,
  handleRegister, registerError,
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
    if (!editName.trim()) {
      setProfileError('กรุณากรอกชื่อ');
      return;
    }
    setProfileSaving(true);
    setProfileError('');
    try {
      await handleUpdateProfile(editName.trim(), selectedFile, removePhoto);
      setShowProfileEdit(false);
    } catch (err) {
      console.error('Profile update error:', err);
      setProfileError('เกิดข้อผิดพลาดในการบันทึก');
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

  return (
      <div className="space-y-4 pb-20 animate-fade-in-slide p-2">
        <h2 className="text-2xl font-bold text-green-900 px-2 pt-2">บัญชีผู้ใช้</h2>
        
        {user ? (
          /* --- ส่วนของคนที่ล็อกอินผ่านแล้ว --- */
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-green-800 to-green-600 p-5 rounded-3xl shadow-xl text-white flex items-center gap-4 border border-green-500">
              <div className="w-16 h-16 rounded-full bg-yellow-400 border-4 border-green-900 shadow-inner overflow-hidden flex items-center justify-center text-green-900 font-bold text-2xl">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  user.name?.charAt(0) || 'U'
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-xl text-yellow-300">{user.name}</h3>
                <p className="text-xs text-green-100 opacity-80">{user.email}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="text-[10px] bg-green-900/50 px-2 py-0.5 rounded text-green-200 border border-green-700 font-bold">
                    สิทธิ์: {user.role === 'admin' ? '👑 ผู้ดูแลระบบ' : '✅ พนักงาน'}
                  </span>
                  {user.position && (
                    <span className="text-[10px] bg-yellow-500/30 px-2 py-0.5 rounded text-yellow-200 border border-yellow-500/50 font-bold">
                      ตำแหน่ง: {user.position}
                    </span>
                  )}
                </div>
                <button onClick={openProfileEdit} className="profile-edit-trigger mt-2">
                  <Pencil size={12} /> แก้ไขโปรไฟล์
                </button>
              </div>
            </div>

            {/* --- ส่วนของแอดมิน: อนุมัติสมาชิกใหม่ (แสดงเฉพาะ Admin) --- */}
            {user.role === 'admin' && (
              <div className="space-y-4">
                {pendingUsers && pendingUsers.length > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 animate-scale-in">
                    <h3 className="font-bold text-orange-800 flex items-center gap-2 mb-3">
                      <UserPlus size={20}/> คำขอสมัครสมาชิก ({pendingUsers.length})
                    </h3>
                    <div className="space-y-2">
                      {pendingUsers.map(u => (
                        <div key={u.id} className="bg-white p-3 rounded-xl border border-orange-100 shadow-sm flex justify-between items-center">
                          <div>
                            <p className="font-bold text-gray-800 text-sm">{u.name}</p>
                            <p className="text-xs text-gray-500">{u.email}</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleRejectUser(u)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 active:scale-95 transition-all" title="ปฏิเสธ">
                              <X size={16}/>
                            </button>
                            <button onClick={() => openApproveModal(u)} className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 active:scale-95 transition-all text-xs font-bold flex items-center gap-1 shadow-sm">
                              <Check size={16}/> ตอบรับ / ระบุตำแหน่ง
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* --- ปุ่ม/กล่อง แสดงประวัติการอนุมัติสมาชิก --- */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
                        <History size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-gray-800">ประวัติการตอบรับ/อนุมัติสมาชิก</h4>
                        <p className="text-[11px] text-gray-400">ดูประวัติการอนุมัติและระบุตำแหน่งผู้ใช้</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                        {approvalHistory.length} รายการ
                      </span>
                      {showHistory ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                    </div>
                  </button>

                  {showHistory && (
                    <div className="p-4 border-t border-gray-100 bg-gray-50/50 space-y-2.5 max-h-80 overflow-y-auto">
                      {approvalHistory.length === 0 ? (
                        <div className="text-center py-6 text-xs text-gray-400 italic">ยังไม่มีประวัติการตอบรับ</div>
                      ) : (
                        approvalHistory.map((item, idx) => (
                          <div key={item.id || idx} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex justify-between items-start gap-2">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-gray-800">{item.userName}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                  item.action === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                  {item.action === 'approved' ? '✅ อนุมัติแล้ว' : '❌ ปฏิเสธ'}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500">{item.userEmail}</p>
                              {item.action === 'approved' && (
                                <div className="flex flex-wrap gap-1.5 pt-0.5">
                                  <span className="text-[10px] bg-yellow-50 text-yellow-800 border border-yellow-200 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                                    <Briefcase size={10} /> {item.position || 'พนักงานทั่วไป'}
                                  </span>
                                  <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded font-medium">
                                    {item.role === 'admin' ? '👑 ผู้ดูแลระบบ' : '👤 พนักงาน'}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="text-right text-[10px] text-gray-400 whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1"><Clock size={10}/> {formatDate(item.timestamp)}</div>
                              <div className="mt-1">โดย: {item.approvedBy || 'Admin'}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <p className="text-xs font-bold text-gray-400 px-2 uppercase tracking-wider">เมนูหลัก</p>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 active:bg-gray-50 cursor-pointer"><div className="flex items-center gap-3"><Settings size={20} className="text-green-600"/><span className="text-sm font-medium text-gray-700">ตั้งค่าร้านค้า</span></div><ChevronRight size={16} className="text-gray-300"/></div>
                <div className="flex items-center justify-between p-4 active:bg-gray-50 cursor-pointer"><div className="flex items-center gap-3"><Smartphone size={20} className="text-green-600"/><span className="text-sm font-medium text-gray-700">เกี่ยวกับแอป</span></div><span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">v2.2 Admin</span></div>
              </div>
            </div>
            
            <button onClick={handleLogout} className="w-full bg-red-50 text-red-600 py-3.5 rounded-2xl font-bold flex justify-center items-center gap-2 mt-6 active:scale-95 transition-transform border border-red-100"><LogOut size={20} /> ออกจากระบบ</button>
          </div>
        ) : (
          /* --- ส่วน Login / Register --- */
          <div className="bg-gradient-to-br from-slate-800 to-gray-900 p-6 rounded-3xl shadow-xl text-white animate-scale-in border-t-4 border-indigo-500">
            <div className="flex items-center gap-3 mb-4"><div className="bg-white/10 p-3 rounded-2xl"><User size={28} className="text-indigo-400"/></div><div><h3 className="font-bold text-xl text-indigo-300">StockPro</h3><p className="text-xs text-slate-400">ระบบจัดการคลังสินค้าและบุคลากร</p></div></div>
            
            <div className="space-y-3 bg-black/20 p-4 rounded-2xl backdrop-blur-sm border border-white/5">
              {/* Toggle Login/Register */}
              <div className="flex bg-black/30 p-1 rounded-xl mb-4">
                 <button onClick={() => setIsRegisterMode(false)} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${!isRegisterMode ? 'bg-indigo-500 text-white shadow' : 'text-gray-400 hover:text-white'}`}>เข้าสู่ระบบ</button>
                 <button onClick={() => setIsRegisterMode(true)} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${isRegisterMode ? 'bg-indigo-500 text-white shadow' : 'text-gray-400 hover:text-white'}`}>สมัครสมาชิก</button>
              </div>

              {!isRegisterMode ? (
                /* Login Form */
                <>
                  <input placeholder="อีเมล (เช่น admin@stockpro.com)" className="w-full bg-white/10 border-0 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-400/50 focus:bg-white/20 outline-none transition-all" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} />
                  <input type="password" placeholder="รหัสผ่าน" className="w-full bg-white/10 border-0 rounded-xl px-4 py-3 text-sm text-white placeholder-green-200/50 focus:bg-white/20 outline-none transition-all" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} />
                  {loginError && <p className="text-red-400 text-xs text-center font-bold bg-red-900/30 py-1 rounded">{loginError}</p>}
                  <button onClick={handleLogin} className="w-full bg-indigo-500 text-white py-3 rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-transform hover:bg-indigo-400">เข้าสู่ระบบ</button>
                </>
              ) : (
                /* Register Form */
                <>
                  <input placeholder="ชื่อพนักงาน / ชื่อเล่น" className="w-full bg-white/10 border-0 rounded-xl px-4 py-3 text-sm text-white placeholder-green-200/50 focus:bg-white/20 outline-none transition-all" value={registerForm.name} onChange={e => setRegisterForm({...registerForm, name: e.target.value})} />
                  <input placeholder="อีเมล" className="w-full bg-white/10 border-0 rounded-xl px-4 py-3 text-sm text-white placeholder-green-200/50 focus:bg-white/20 outline-none transition-all" value={registerForm.email} onChange={e => setRegisterForm({...registerForm, email: e.target.value})} />
                  <input type="password" placeholder="รหัสผ่าน (6 ตัวขึ้นไป)" className="w-full bg-white/10 border-0 rounded-xl px-4 py-3 text-sm text-white placeholder-green-200/50 focus:bg-white/20 outline-none transition-all" value={registerForm.password} onChange={e => setRegisterForm({...registerForm, password: e.target.value})} />
                  <input type="password" placeholder="ยืนยันรหัสผ่าน" className="w-full bg-white/10 border-0 rounded-xl px-4 py-3 text-sm text-white placeholder-green-200/50 focus:bg-white/20 outline-none transition-all" value={registerForm.confirmPassword} onChange={e => setRegisterForm({...registerForm, confirmPassword: e.target.value})} />
                  
                  {registerError && <p className="text-red-400 text-xs text-center font-bold bg-red-900/30 py-1 rounded">{registerError}</p>}
                  
                  <button onClick={handleRegister} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-transform hover:bg-green-500 border border-green-500">สมัครสมาชิก</button>
                  <p className="text-[10px] text-yellow-300/90 text-center mt-2 bg-yellow-900/30 py-1.5 px-2 rounded-lg">⚠️ สมัครแล้วต้องรอแอดมินอนุมัติก่อนจึงจะเข้าใช้งานได้</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* --- MODAL ตอบรับอนุมัติสมาชิก และระบุตำแหน่ง --- */}
        {userToApprove && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 transform transition-all animate-scale-in border-4 border-green-100">
              <div className="flex justify-between items-center mb-4 border-b pb-3">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <ShieldCheck size={24} className="text-green-600" /> อนุมัติสมาชิก & ระบุตำแหน่ง
                </h3>
                <button onClick={() => setUserToApprove(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                {/* ข้อมูลผู้สมัคร */}
                <div className="bg-green-50 p-3.5 rounded-2xl border border-green-200">
                  <p className="text-xs font-bold text-green-800">ผู้ขอสมัครใช้งาน:</p>
                  <p className="text-base font-black text-gray-800 mt-0.5">{userToApprove.name}</p>
                  <p className="text-xs text-gray-500">{userToApprove.email}</p>
                </div>

                {/* เลือกตำแหน่ง */}
                <div>
                  <label className="text-xs font-bold text-gray-700 flex items-center gap-1 mb-2">
                    <Briefcase size={14} className="text-green-600" /> เลือกตำแหน่งงาน:
                  </label>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {PRESET_POSITIONS.map(p => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => { setSelectedPosition(p.label); setCustomPosition(''); }}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                          (selectedPosition === p.label && !customPosition)
                            ? 'bg-green-700 text-yellow-300 border-green-800 shadow-md scale-[1.02]'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <span>{p.emoji}</span>
                        <span>{p.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* ระบุตำแหน่งเอง */}
                  <input
                    type="text"
                    placeholder="หรือระบุตำแหน่งอื่นๆ..."
                    value={customPosition}
                    onChange={(e) => setCustomPosition(e.target.value)}
                    className="w-full border border-gray-200 bg-gray-50 rounded-xl p-3 text-xs focus:bg-white focus:ring-2 focus:ring-green-200 outline-none"
                  />
                </div>

                {/* เลือกสิทธิ์ (Role) */}
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1.5 block">สิทธิ์การเข้าถึงระบบ:</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedRole('staff')}
                      className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                        selectedRole === 'staff'
                          ? 'bg-blue-600 text-white border-blue-700 shadow-md'
                          : 'bg-gray-50 text-gray-600 border-gray-200'
                      }`}
                    >
                      👤 พนักงาน (Staff)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRole('admin')}
                      className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                        selectedRole === 'admin'
                          ? 'bg-green-800 text-yellow-300 border-green-900 shadow-md'
                          : 'bg-gray-50 text-gray-600 border-gray-200'
                      }`}
                    >
                      👑 ผู้ดูแลระบบ (Admin)
                    </button>
                  </div>
                </div>

                {/* ปุ่ม Action */}
                <div className="flex gap-3 pt-3">
                  <button
                    onClick={() => setUserToApprove(null)}
                    className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold text-xs hover:bg-gray-200"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={confirmApprove}
                    className="flex-[2] bg-green-700 text-white py-3 rounded-xl font-bold text-xs shadow-lg hover:bg-green-800 active:scale-95 transition-transform flex items-center justify-center gap-1.5"
                  >
                    <Check size={16} /> ยืนยันการอนุมัติ
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- MODAL แก้ไขโปรไฟล์ --- */}
        {showProfileEdit && user && (
          <div className="profile-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget && !profileSaving) setShowProfileEdit(false); }}>
            <div className="profile-modal-card">
              {/* Header */}
              <div className="profile-modal-header">
                <h3>✏️ แก้ไขโปรไฟล์</h3>
                <p>เปลี่ยนชื่อบัญชีหรืออัปโหลดรูปโปรไฟล์</p>
                <button className="profile-modal-close" onClick={() => !profileSaving && setShowProfileEdit(false)}>
                  <X size={14} />
                </button>
              </div>

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

              {/* Form */}
              <div className="profile-form-section">
                {profileError && <div className="profile-file-error">{profileError}</div>}

                <div className="profile-form-group">
                  <label className="profile-form-label">
                    <User size={14} className="text-green-600" /> ชื่อบัญชี
                  </label>
                  <input
                    type="text"
                    className="profile-form-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="กรอกชื่อของคุณ"
                    maxLength={50}
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

                {/* Actions */}
                <div className="profile-actions">
                  <button
                    className="profile-btn-cancel"
                    onClick={() => setShowProfileEdit(false)}
                    disabled={profileSaving}
                  >
                    ยกเลิก
                  </button>
                  <button
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
          </div>
        )}
      </div>
  );
}