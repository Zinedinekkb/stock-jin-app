// app/components/TabMenu.js
import React from 'react';
import { User, Settings, ChevronRight, Smartphone, LogOut, UserPlus, ShieldCheck, Check, X, Loader2 } from 'lucide-react';

export default function TabMenu({ 
  user, loginForm, setLoginForm, 
  handleLogin, handleLogout, loginError,
  // Props สำหรับสมัครสมาชิก
  isRegisterMode, setIsRegisterMode,
  registerForm, setRegisterForm,
  handleRegister, registerError,
  // Props สำหรับแอดมินอนุมัติ
  pendingUsers, handleApproveUser, handleRejectUser
}) {
  return (
      <div className="space-y-4 pb-20 animate-fade-in-slide p-2">
        <h2 className="text-2xl font-bold text-green-900 px-2 pt-2">บัญชีผู้ใช้</h2>
        
        {user ? (
          /* --- ส่วนของคนที่ล็อกอินผ่านแล้ว --- */
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-green-800 to-green-600 p-5 rounded-3xl shadow-xl text-white flex items-center gap-4 border border-green-500">
              <div className="w-16 h-16 rounded-full bg-yellow-400 border-4 border-green-900 shadow-inner overflow-hidden flex items-center justify-center text-green-900 font-bold text-2xl">
                {user.name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-xl text-yellow-300">{user.name}</h3>
                <p className="text-xs text-green-100 opacity-80">{user.email}</p>
                <div className="mt-2 flex gap-2">
                  <span className="text-[10px] bg-green-900/50 px-2 py-0.5 rounded text-green-200 border border-green-700">
                    สถานะ: {user.role === 'admin' ? '👑 ผู้ดูแลระบบ' : '✅ พนักงาน'}
                  </span>
                </div>
              </div>
            </div>

            {/* --- ส่วนของแอดมิน: อนุมัติสมาชิกใหม่ (แสดงเฉพาะ Admin) --- */}
            {user.role === 'admin' && pendingUsers && pendingUsers.length > 0 && (
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
                        <button onClick={() => handleRejectUser(u.id)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"><X size={16}/></button>
                        <button onClick={() => handleApproveUser(u.id)} className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"><Check size={16}/></button>
                      </div>
                    </div>
                  ))}
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
          <div className="bg-gradient-to-br from-green-800 to-gray-900 p-6 rounded-3xl shadow-xl text-white animate-scale-in border-t-4 border-yellow-500">
            <div className="flex items-center gap-3 mb-4"><div className="bg-white/10 p-3 rounded-2xl"><User size={28} className="text-yellow-400"/></div><div><h3 className="font-bold text-xl text-yellow-400">STOCK JIN</h3><p className="text-xs text-green-200">ระบบจัดการสต็อกร้านข้าวมันไก่</p></div></div>
            
            <div className="space-y-3 bg-black/20 p-4 rounded-2xl backdrop-blur-sm border border-white/5">
              {/* Toggle Login/Register */}
              <div className="flex bg-black/30 p-1 rounded-xl mb-4">
                 <button onClick={() => setIsRegisterMode(false)} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${!isRegisterMode ? 'bg-yellow-500 text-green-900 shadow' : 'text-gray-400 hover:text-white'}`}>เข้าสู่ระบบ</button>
                 <button onClick={() => setIsRegisterMode(true)} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${isRegisterMode ? 'bg-yellow-500 text-green-900 shadow' : 'text-gray-400 hover:text-white'}`}>สมัครสมาชิก</button>
              </div>

              {!isRegisterMode ? (
                /* Login Form */
                <>
                  <input placeholder="อีเมล (เช่น admin@stockjin.com)" className="w-full bg-white/10 border-0 rounded-xl px-4 py-3 text-sm text-white placeholder-green-200/50 focus:bg-white/20 outline-none transition-all" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} />
                  <input type="password" placeholder="รหัสผ่าน" className="w-full bg-white/10 border-0 rounded-xl px-4 py-3 text-sm text-white placeholder-green-200/50 focus:bg-white/20 outline-none transition-all" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} />
                  {loginError && <p className="text-red-400 text-xs text-center font-bold bg-red-900/30 py-1 rounded">{loginError}</p>}
                  <button onClick={handleLogin} className="w-full bg-yellow-500 text-green-900 py-3 rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-transform hover:bg-yellow-400">เข้าสู่ระบบ</button>
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
                  <p className="text-[10px] text-green-200/70 text-center mt-2">* สมัครแล้วต้องรอแอดมินอนุมัติก่อนใช้งาน</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
  );
}