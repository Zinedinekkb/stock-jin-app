// app/components/ModernPendingApproval.js
'use client';

import React, { useState } from 'react';
import { 
  ShieldAlert, Clock, CheckCircle2, RefreshCw, LogOut, 
  MessageSquare, User, Mail, Sparkles, Loader2 
} from 'lucide-react';

export default function ModernPendingApproval({
  user,
  handleLogout,
  onCheckStatus
}) {
  const [isChecking, setIsChecking] = useState(false);
  const [copiedLine, setCopiedLine] = useState(false);

  const handleRefresh = async () => {
    setIsChecking(true);
    try {
      if (onCheckStatus) await onCheckStatus();
    } finally {
      setTimeout(() => setIsChecking(false), 600);
    }
  };

  const handleCopyLine = () => {
    navigator.clipboard.writeText('@stockpro_admin');
    setCopiedLine(true);
    setTimeout(() => setCopiedLine(false), 2000);
  };

  const providerLabel = user?.provider?.includes('google')
    ? 'Google (Gmail)'
    : user?.provider?.includes('github')
    ? 'GitHub'
    : 'อีเมล / รหัสผ่าน';

  return (
    <div className="min-h-screen bg-[#f4f5fa] flex items-center justify-center p-4 md:p-8 font-sans selection:bg-purple-100">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 sm:p-10 text-center relative overflow-hidden">
        
        {/* Decorative Top Ambient */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 via-[#6355d8] to-purple-400" />
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-200/40 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-purple-200/40 rounded-full blur-2xl pointer-events-none" />

        {/* Pulsing Icon */}
        <div className="relative mx-auto w-20 h-20 mb-6 flex items-center justify-center">
          <div className="absolute inset-0 bg-amber-100 rounded-full animate-ping opacity-50" />
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-100 to-amber-50 border-2 border-amber-200 flex items-center justify-center text-amber-600 shadow-md relative z-10">
            <Clock size={36} className="animate-pulse" />
          </div>
        </div>

        {/* Header Text */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200 mb-3">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          <span>อยู่ระหว่างรอการอนุมัติ</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
          บัญชีของคุณกำลังรอการอนุมัติ
        </h2>
        
        <p className="text-xs sm:text-sm text-gray-500 mt-2 leading-relaxed max-w-md mx-auto">
          ระบบได้รับข้อมูลการลงทะเบียนเรียบร้อยแล้ว กรุณารอผู้ดูแลระบบ (Admin) ตรวจสอบและกำหนดสิทธิ์เข้าใช้งาน
        </p>

        {/* User Profile Card */}
        <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-gray-50/80 border border-gray-200/70 text-left space-y-3">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-[#6355d8]/10 text-[#6355d8] font-bold text-lg flex items-center justify-center overflow-hidden border-2 border-white shadow-xs shrink-0">
              {user?.photoURL ? (
                <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                (user?.name?.charAt(0) || 'U').toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-gray-800 truncate">{user?.name || 'ผู้ใช้ใหม่'}</p>
              <p className="text-xs text-gray-500 truncate flex items-center gap-1 mt-0.5">
                <Mail size={12} className="shrink-0" />
                <span>{user?.email}</span>
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-purple-100 text-[#6355d8] border border-purple-200">
                {providerLabel}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between text-xs text-gray-500">
            <span>สถานะสิทธิ์ที่ขอ:</span>
            <span className="font-bold text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded-md">พนักงาน (Staff - รออนุมัติ)</span>
          </div>
        </div>

        {/* Step Progression Timeline */}
        <div className="mt-6 p-4 rounded-2xl bg-white border border-gray-100 shadow-xs text-left">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">ขั้นตอนการเปิดใช้งาน</p>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 size={15} />
              </div>
              <div className="text-xs flex-1">
                <p className="font-bold text-gray-800">1. ลงทะเบียนบัญชีสำเร็จ</p>
                <p className="text-[11px] text-gray-400">ยืนยันตัวตนผ่าน {providerLabel}</p>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">สำเร็จ</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <Clock size={15} className="animate-spin" />
              </div>
              <div className="text-xs flex-1">
                <p className="font-bold text-amber-900">2. ผู้ดูแลระบบตรวจสอบ & กำหนดตำแหน่ง</p>
                <p className="text-[11px] text-amber-700">กำลังรอการอนุมัติสิทธิ์เข้าถึงคลัง</p>
              </div>
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">กำลังดำเนินการ</span>
            </div>

            <div className="flex items-center gap-3 opacity-50">
              <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center shrink-0">
                <Sparkles size={15} />
              </div>
              <div className="text-xs flex-1">
                <p className="font-bold text-gray-700">3. เข้าใช้งานระบบ StockPro</p>
                <p className="text-[11px] text-gray-400">ระบบจะนำเข้าสู่แดชบอร์ดอัตโนมัติทันทีที่ได้รับอนุมัติ</p>
              </div>
              <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">รอดำเนินการ</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 space-y-2.5">
          {/* Refresh Check Status */}
          <button
            type="button"
            disabled={isChecking}
            onClick={handleRefresh}
            className="w-full py-3 px-4 rounded-2xl bg-[#6355d8] hover:bg-[#5446cc] active:scale-[0.99] text-white text-xs sm:text-sm font-bold shadow-md shadow-purple-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
          >
            <RefreshCw size={16} className={isChecking ? 'animate-spin' : ''} />
            <span>{isChecking ? 'กำลังตรวจสอบ...' : 'ตรวจสอบสถานะอีกครั้ง'}</span>
          </button>

          {/* Contact Admin & Logout */}
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={handleCopyLine}
              className="flex-1 py-2.5 px-3 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <MessageSquare size={14} className="text-emerald-600" />
              <span>{copiedLine ? 'คัดลอก LINE แล้ว!' : 'แจ้งแอดมินทาง LINE'}</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="flex-1 py-2.5 px-3 rounded-2xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <LogOut size={14} />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
