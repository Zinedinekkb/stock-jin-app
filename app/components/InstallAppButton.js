// app/components/InstallAppButton.js
'use client';

import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { Share, PlusSquare, CheckCircle2, X } from 'lucide-react';

// Platform is read from the browser only, so the server render stays empty and no hydration mismatch happens.
function noopSubscribe() {
  return () => {};
}

function detectPlatform() {
  if (typeof window === 'undefined') return 'server';
  const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (standalone) return 'standalone';
  const ua = window.navigator.userAgent || '';
  // iPadOS 13+ reports itself as Macintosh, so also check for touch support
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
  if (isIOS) {
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
    return isSafari ? 'ios-safari' : 'ios-other';
  }
  return 'other';
}

const SERVER_SNAPSHOT = 'server';

const baseClass = 'font-bold text-brand-600 bg-white/80 border border-brand-200 shadow-sm hover:bg-brand-50 active:scale-[0.99] transition-all cursor-pointer';
const variantClass = {
  full: 'flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-xs sm:text-sm',
  compact: 'inline-flex items-center gap-1.5 rounded-control px-3 py-2 text-xs',
};

const IOS_STEPS = [
  { Icon: Share, text: 'แตะปุ่ม "แชร์" ที่แถบเมนูด้านล่างของ Safari' },
  { Icon: PlusSquare, text: 'เลื่อนลงแล้วเลือก "เพิ่มไปยังหน้าจอโฮม"' },
  { Icon: CheckCircle2, text: 'กด "เพิ่ม" ที่มุมขวาบน' },
];

export default function InstallAppButton({ variant = 'full', className = '' }) {
  const platform = useSyncExternalStore(noopSubscribe, detectPlatform, () => SERVER_SNAPSHOT);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [showIOSSheet, setShowIOSSheet] = useState(false);

  // Android / desktop Chrome: keep the install prompt event so our button can trigger it
  useEffect(() => {
    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onInstalled = () => {
      setDeferredPrompt(null);
      setInstalled(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  // Close the iOS sheet with the Escape key
  useEffect(() => {
    if (!showIOSSheet) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setShowIOSSheet(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showIOSSheet]);

  if (installed || platform === 'server' || platform === 'standalone') return null;

  const isIOS = platform.startsWith('ios');
  // Other browsers without the install prompt cannot install from here, so hide the button
  if (!isIOS && !deferredPrompt) return null;

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try {
      await deferredPrompt.userChoice;
    } finally {
      // A prompt can only be shown once per event
      setDeferredPrompt(null);
    }
  };

  const onClick = isIOS ? () => setShowIOSSheet(true) : handleInstall;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={onClick}
        className={`${baseClass} ${variantClass[variant] || variantClass.full}`}
        aria-label="ติดตั้งแอป StockPro ลงหน้าจอโฮม"
      >
        <span aria-hidden="true">📲</span>
        <span>ติดตั้งแอป</span>
      </button>

      {showIOSSheet && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowIOSSheet(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-ios-title"
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 id="install-ios-title" className="text-base font-black text-ink">ติดตั้ง StockPro บน iPhone / iPad</h3>
                <p className="text-xs text-ink-muted mt-1">ทำตาม 3 ขั้นตอนนี้ใน Safari</p>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSSheet(false)}
                className="w-9 h-9 rounded-control flex items-center justify-center text-ink-subtle hover:bg-brand-50"
                aria-label="ปิด"
              >
                <X size={18} />
              </button>
            </div>

            <ol className="space-y-3">
              {IOS_STEPS.map(({ Icon, text }, i) => (
                <li key={text} className="flex items-center gap-3 rounded-2xl bg-brand-50/60 p-3">
                  <span className="w-8 h-8 rounded-xl bg-brand-500 text-white text-xs font-black flex items-center justify-center shrink-0">{i + 1}</span>
                  <span className="flex-1 text-sm text-ink leading-snug">{text}</span>
                  <Icon size={20} className="text-brand-600 shrink-0" aria-hidden="true" />
                </li>
              ))}
            </ol>

            {platform !== 'ios-safari' && (
              <p className="mt-4 text-xs font-bold text-warning-700 bg-warning-50 border border-warning-100 rounded-control px-3 py-2">
                ต้องเปิดลิงก์นี้ในเบราว์เซอร์ Safari เท่านั้น จึงจะเพิ่มลงหน้าจอโฮมได้
              </p>
            )}
            <p className="mt-3 text-xs text-ink-subtle leading-relaxed">
              หลังติดตั้งแล้ว ให้เปิดจากไอคอน StockPro บนหน้าจอโฮม การแจ้งเตือนบน iPhone / iPad ต้องใช้ iOS 16.4 ขึ้นไป
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
