// app/components/TabMenu.js
import React from 'react';
import { User, Settings, ChevronRight, Smartphone, LogOut } from 'lucide-react';

export default function TabMenu({ 
  user, loginForm, setLoginForm, 
  handleLogin, handleLogout, loginError 
}) {
  return (
      <div className="space-y-4 pb-20 animate-fade-in-slide p-2">
        <h2 className="text-2xl font-bold text-green-900 px-2 pt-2">บัญชีผู้ใช้</h2>
        {user ? (
          <div className="bg-gradient-to-r from-green-800 to-green-600 p-5 rounded-3xl shadow-xl text-white flex items-center gap-4 border border-green-500">
            <div className="w-16 h-16 rounded-full bg-yellow-400 border-4 border-green-900 shadow-inner overflow-hidden flex items-center justify-center text-green-900 font-bold text-2xl">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-xl text-yellow-300">{user.name}</h3>
              <p className="text-xs text-green-100 opacity-80">{user.email}</p>
              <div className="mt-2 text-[10px] bg-green-900/50 inline-block px-2 py-0.5 rounded text-green-200">
                สถานะ: ออนไลน์
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-green-800 to-gray-900 p-6 rounded-3xl shadow-xl text-white animate-scale-in border-t-4 border-yellow-500">
            <div className="flex items-center gap-3 mb-4"><div className="bg-white/10 p-3 rounded-2xl"><User size={28} className="text-yellow-400"/></div><div><h3 className="font-bold text-xl text-yellow-400">STOCK JIN</h3><p className="text-xs text-green-200">ระบบจัดการสต็อกร้านข้าวมันไก่</p></div></div>
            <div className="space-y-3 bg-black/20 p-4 rounded-2xl backdrop-blur-sm border border-white/5">
              <input placeholder="อีเมล (เช่น admin@stockjin.com)" className="w-full bg-white/10 border-0 rounded-xl px-4 py-3 text-sm text-white placeholder-green-200/50 focus:bg-white/20 outline-none transition-all" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} />
              <input type="password" placeholder="รหัสผ่าน" className="w-full bg-white/10 border-0 rounded-xl px-4 py-3 text-sm text-white placeholder-green-200/50 focus:bg-white/20 outline-none transition-all" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} />
              
              {loginError && <p className="text-red-400 text-xs text-center font-bold bg-red-900/30 py-1 rounded">{loginError}</p>}
              
              <button onClick={handleLogin} className="w-full bg-yellow-500 text-green-900 py-3 rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-transform hover:bg-yellow-400">เข้าสู่ระบบ</button>
            </div>
          </div>
        )}
        <div className="space-y-3 mt-4">
          <p className="text-xs font-bold text-gray-400 px-2 uppercase tracking-wider">เมนูหลัก</p>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 active:bg-gray-50 cursor-pointer"><div className="flex items-center gap-3"><Settings size={20} className="text-green-600"/><span className="text-sm font-medium text-gray-700">ตั้งค่าร้านค้า</span></div><ChevronRight size={16} className="text-gray-300"/></div>
            <div className="flex items-center justify-between p-4 active:bg-gray-50 cursor-pointer"><div className="flex items-center gap-3"><Smartphone size={20} className="text-green-600"/><span className="text-sm font-medium text-gray-700">เกี่ยวกับแอป</span></div><span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">v2.1 Auth</span></div>
          </div>
        </div>
        {user && <button onClick={handleLogout} className="w-full bg-red-50 text-red-600 py-3.5 rounded-2xl font-bold flex justify-center items-center gap-2 mt-6 active:scale-95 transition-transform border border-red-100"><LogOut size={20} /> ออกจากระบบ</button>}
      </div>
  );
}