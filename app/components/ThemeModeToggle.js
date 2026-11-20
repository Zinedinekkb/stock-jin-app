// app/components/ThemeModeToggle.js
// สลับโหมด สว่าง / มืด / ตามเครื่อง (เก็บในเครื่องและในเอกสารผู้ใช้)
'use client';
import React, { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { GlassCard } from './ui';
import { applyThemeMode, readThemeMode } from './BrandingProvider';

const OPTIONS = [
  { id: 'light', label: 'สว่าง', icon: Sun },
  { id: 'dark', label: 'มืด', icon: Moon },
  { id: 'system', label: 'ตามเครื่อง', icon: Monitor },
];

export default function ThemeModeToggle({ user }) {
  const [mode, setMode] = useState('system');

  useEffect(() => { setMode(readThemeMode()); }, []);

  const choose = (next) => {
    setMode(next);
    applyThemeMode(next);
    if (user?.uid) {
      updateDoc(doc(db, 'users', user.uid), { themeMode: next }).catch(console.warn);
    }
  };

  return (
    <GlassCard className="p-5">
      <h3 className="font-black text-base text-ink">โหมดการแสดงผล</h3>
      <p className="mt-1 text-sm text-ink-muted">เลือกธีมสว่าง มืด หรือให้ตามการตั้งค่าของเครื่อง</p>
      <div role="radiogroup" aria-label="โหมดการแสดงผล" className="mt-3 grid grid-cols-3 gap-1 rounded-2xl bg-gray-100 p-1">
        {OPTIONS.map(({ id, label, icon: Icon }) => {
          const active = mode === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => choose(id)}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-bold transition-colors ${
                active ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          );
        })}
      </div>
    </GlassCard>
  );
}
