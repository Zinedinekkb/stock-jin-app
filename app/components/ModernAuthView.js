// app/components/ModernAuthView.js
'use client';

import React, { useState } from 'react';
import { 
  Mail, Lock, User, Eye, EyeOff, Package, Sparkles, 
  ShieldCheck, ArrowRight, Loader2, CheckCircle2, Clock, AlertCircle
} from 'lucide-react';

export default function ModernAuthView({
  loginForm,
  setLoginForm,
  handleLogin,
  loginError,
  isRegisterMode,
  setIsRegisterMode,
  registerForm,
  setRegisterForm,
  handleRegister,
  registerError,
  handleGoogleSignIn,
  handleGithubSignIn,
  socialLoading
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmitLogin = async (e) => {
    e?.preventDefault();
    setIsSubmitting(true);
    try {
      await handleLogin();
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmitRegister = async (e) => {
    e?.preventDefault();
    setIsSubmitting(true);
    try {
      await handleRegister();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f5fa] flex items-center justify-center p-4 md:p-8 font-sans selection:bg-purple-100">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col lg:flex-row min-h-[640px]">
        
        {/* ========================================= */}
        {/* LEFT COLUMN: HERO BRANDING (Desktop only) */}
        {/* ========================================= */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#4f42c2] via-[#6355d8] to-[#8072f5] p-12 text-white flex-col justify-between relative overflow-hidden">
          {/* Ambient Glows */}
          <div className="absolute -top-24 -left-24 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 left-1/3 w-60 h-60 bg-purple-300/20 rounded-full blur-2xl pointer-events-none" />

          {/* Top Logo */}
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-lg">
                <Package size={26} className="text-white" strokeWidth={2.2} />
              </div>
              <div>
                <span className="text-2xl font-black tracking-wide text-white">StockPro</span>
                <span className="ml-2 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 bg-white/20 rounded-full text-white/90">v2.5</span>
                <p className="text-xs text-purple-200 mt-0.5">Smart Inventory & Workforce</p>
              </div>
            </div>
          </div>

          {/* Center Showcase */}
          <div className="relative z-10 my-8 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-white/90 border border-white/10">
              <Sparkles size={14} className="text-amber-300" />
              <span>ระบบจัดการคลังและบุคลากรอัจฉริยะ</span>
            </div>

            <h2 className="text-3xl xl:text-4xl font-black leading-tight tracking-tight text-white">
              ควบคุมทุกขั้นตอน<br />
              <span className="text-amber-200">สต็อก เบิกจ่าย และเวลาทำงาน</span><br />
              ได้อย่างไร้รอยต่อ
            </h2>

            <p className="text-sm text-purple-100/80 leading-relaxed max-w-md">
              ออกแบบเพื่อความคล่องตัวสูงสุด รองรับทั้งคอมพิวเตอร์และมือถือ พร้อมการแจ้งเตือน LINE แบบเรียลไทม์ และระบบสิทธิ์อนุมัติที่ปลอดภัย
            </p>

            {/* Feature Badges */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10">
                <div className="w-8 h-8 rounded-xl bg-emerald-400/20 text-emerald-200 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">ระบบจัดการสต็อกและ POS สองคอลัมน์</p>
                  <p className="text-[11px] text-purple-200">เบิก/รับสะดวกรวดเร็ว ตรวจนับแม่นยำ</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10">
                <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-200 flex items-center justify-center shrink-0">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">ระบบสิทธิ์และการอนุมัติขั้นสูง</p>
                  <p className="text-[11px] text-purple-200">ปลอดภัย ผู้ใช้ใหม่รอการอนุมัติก่อนเริ่มงาน</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Footer Note */}
          <div className="relative z-10 text-[11px] text-purple-200/70 flex items-center justify-between border-t border-white/10 pt-4">
            <span>© 2026 StockPro Inc.</span>
            <span>Fast, Reliable & Modern</span>
          </div>
        </div>

        {/* ========================================= */}
        {/* RIGHT COLUMN: FORM & SOCIAL LOGINS       */}
        {/* ========================================= */}
        <div className="w-full lg:w-1/2 p-6 sm:p-10 md:p-12 flex flex-col justify-center">
          
          {/* Mobile Brand Header (< lg) */}
          <div className="lg:hidden flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <div className="w-10 h-10 bg-[#6355d8] rounded-2xl flex items-center justify-center text-white shadow-md">
              <Package size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-[#6355d8]">StockPro</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-100 text-[#6355d8] rounded-full">v2.5</span>
              </div>
              <p className="text-xs text-gray-400">Inventory & Workforce Platform</p>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              {isRegisterMode ? 'สร้างบัญชีใหม่' : 'ยินดีต้อนรับกลับมา'}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              {isRegisterMode 
                ? 'กรอกข้อมูลหรือเชื่อมต่อผ่านโซเชียลเพื่อขอสิทธิ์ใช้งาน' 
                : 'เข้าสู่ระบบจัดการสต็อกและบุคลากร StockPro'}
            </p>
          </div>

          {/* Tab Switcher (Sign In / Register) */}
          <div className="flex bg-gray-100 p-1 rounded-2xl mb-6 border border-gray-200/60">
            <button
              type="button"
              onClick={() => setIsRegisterMode(false)}
              className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                !isRegisterMode 
                  ? 'bg-white text-[#6355d8] shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              เข้าสู่ระบบ
            </button>
            <button
              type="button"
              onClick={() => setIsRegisterMode(true)}
              className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                isRegisterMode 
                  ? 'bg-white text-[#6355d8] shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              สมัครสมาชิก
            </button>
          </div>

          {/* Social Logins */}
          <div className="space-y-3 mb-6">
            {/* Google Sign-in */}
            <button
              type="button"
              disabled={socialLoading}
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 active:scale-[0.99] text-gray-700 text-xs sm:text-sm font-bold transition-all shadow-xs disabled:opacity-60 cursor-pointer"
            >
              {socialLoading ? (
                <Loader2 size={18} className="animate-spin text-gray-500" />
              ) : (
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>
                {isRegisterMode ? 'สมัครสมาชิกด้วย Google (Gmail)' : 'เข้าสู่ระบบด้วย Google (Gmail)'}
              </span>
            </button>

            {/* GitHub Sign-in */}
            <button
              type="button"
              disabled={socialLoading}
              onClick={handleGithubSignIn}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-gray-900 hover:bg-black active:scale-[0.99] text-white text-xs sm:text-sm font-bold transition-all shadow-xs disabled:opacity-60 cursor-pointer"
            >
              {socialLoading ? (
                <Loader2 size={18} className="animate-spin text-white" />
              ) : (
                <svg className="w-5 h-5 shrink-0 fill-current" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              )}
              <span>
                {isRegisterMode ? 'สมัครสมาชิกด้วย GitHub' : 'เข้าสู่ระบบด้วย GitHub'}
              </span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-gray-200 w-full" />
            <span className="bg-white px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
              หรือระบุด้วยอีเมล
            </span>
            <div className="border-t border-gray-200 w-full" />
          </div>

          {/* Form */}
          <form onSubmit={isRegisterMode ? onSubmitRegister : onSubmitLogin} className="space-y-4">
            
            {/* Name (Register only) */}
            {isRegisterMode && (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">ชื่อ-นามสกุล / ชื่อเล่น</label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <User size={16} />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="เช่น สมชาย ใจดี (ต้น)"
                    value={registerForm.name}
                    onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#6355d8] focus:ring-4 focus:ring-purple-500/10 text-xs sm:text-sm outline-none transition-all"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">อีเมล</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  required
                  placeholder="เช่น user@stockpro.com"
                  value={isRegisterMode ? registerForm.email : loginForm.username}
                  onChange={(e) => {
                    if (isRegisterMode) {
                      setRegisterForm({ ...registerForm, email: e.target.value });
                    } else {
                      setLoginForm({ ...loginForm, username: e.target.value });
                    }
                  }}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#6355d8] focus:ring-4 focus:ring-purple-500/10 text-xs sm:text-sm outline-none transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                {isRegisterMode ? 'รหัสผ่าน (6 ตัวอักษรขึ้นไป)' : 'รหัสผ่าน'}
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={isRegisterMode ? registerForm.password : loginForm.password}
                  onChange={(e) => {
                    if (isRegisterMode) {
                      setRegisterForm({ ...registerForm, password: e.target.value });
                    } else {
                      setLoginForm({ ...loginForm, password: e.target.value });
                    }
                  }}
                  className="w-full pl-10 pr-11 py-3 rounded-2xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#6355d8] focus:ring-4 focus:ring-purple-500/10 text-xs sm:text-sm outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password (Register only) */}
            {isRegisterMode && (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">ยืนยันรหัสผ่าน</label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={registerForm.confirmPassword}
                    onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                    className="w-full pl-10 pr-11 py-3 rounded-2xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#6355d8] focus:ring-4 focus:ring-purple-500/10 text-xs sm:text-sm outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            {/* Error Display */}
            {(loginError || registerError) && (
              <div className="p-3 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-red-600 text-xs font-bold animate-shake">
                <AlertCircle size={16} className="shrink-0" />
                <span>{loginError || registerError}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#6355d8] to-[#7b6ef6] hover:from-[#5749cc] hover:to-[#6f62ea] active:scale-[0.98] text-white text-sm font-bold shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>กำลังดำเนินการ...</span>
                </>
              ) : (
                <>
                  <span>{isRegisterMode ? 'สร้างบัญชีและขอสิทธิ์' : 'เข้าสู่ระบบ'}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Admin Approval Notice Banner */}
          <div className="mt-6 p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start gap-2.5 text-amber-800">
            <Clock size={16} className="shrink-0 text-amber-600 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>ข้อกำหนดด้านความปลอดภัย:</strong> บัญชีใหม่ทุกบัญชี (ทั้ง Gmail, GitHub และอีเมล) จะต้องได้รับการอนุมัติสิทธิ์จากผู้ดูแลระบบ (Admin) ก่อนจึงจะสามารถเข้าใช้งานคลังสินค้าได้
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
