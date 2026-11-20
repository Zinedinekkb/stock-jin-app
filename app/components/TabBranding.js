// app/components/TabBranding.js
// Admin-only screen: app name, logo, brand color and shop details for documents.
'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Palette, Upload, Save, ImageOff } from 'lucide-react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { GlassCard, Button, Badge, SectionHeader } from './ui';
import { useBranding } from './BrandingProvider';
import { sanitizeBranding } from '../../lib/branding/sanitize';
import { buildBrandPalette, isValidHex } from '../../lib/theme/palette';
import { validateLogoFile, logoStoragePath } from '../../lib/branding/logoFile';

const PRESET_COLORS = ['#6355d8', '#0ea5e9', '#16a34a', '#f97316', '#e11d48', '#0f766e'];
const LEGACY_SHOP_KEY = 'stockjin.shopInfo';

const inputClass = 'w-full h-11 px-3 rounded-control bg-white/80 border border-white text-sm text-ink outline-none focus:ring-2 focus:ring-brand-200';
const labelClass = 'block text-xs font-bold text-ink-muted mb-1';

const rgb = (triplet) => `rgb(${triplet.split(' ').join(',')})`;

export default function TabBranding({ user, showNotification }) {
  const branding = useBranding();
  const [form, setForm] = useState(branding);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [migrated, setMigrated] = useState(false);
  const fileRef = useRef(null);

  // Follow live branding until the admin starts editing.
  useEffect(() => { if (!dirty) setForm(branding); }, [branding, dirty]);

  // One-time prefill from the old per-device shop info (not auto-saved).
  useEffect(() => {
    if (migrated || branding.shopName) return;
    try {
      const old = JSON.parse(localStorage.getItem(LEGACY_SHOP_KEY) || 'null');
      if (old && (old.shopName || old.shopAddress || old.shopTaxId || old.shopPhone)) {
        setForm((f) => ({
          ...f,
          shopName: old.shopName || '', shopAddress: old.shopAddress || '',
          shopTaxId: old.shopTaxId || '', shopPhone: old.shopPhone || '',
        }));
        setDirty(true);
        setMigrated(true);
      }
    } catch { /* storage unavailable or bad JSON: nothing to migrate */ }
  }, [branding.shopName, migrated]);

  const set = (patch) => { setDirty(true); setForm((f) => ({ ...f, ...patch })); };

  const colorValid = isValidHex(form.primaryColor);
  const palette = useMemo(
    () => buildBrandPalette(colorValid ? form.primaryColor : branding.primaryColor),
    [form.primaryColor, colorValid, branding.primaryColor]
  );
  const shownLogo = logoPreview || form.logoUrl;

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const res = validateLogoFile(file);
    if (!res.ok) {
      setError(res.error);
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    setError('');
    setDirty(true);
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!colorValid) { setError('สีหลักต้องเป็นรหัส #RRGGBB เช่น #6355d8'); return; }
    setSaving(true);
    setError('');
    try {
      let logoUrl = form.logoUrl;
      // Upload first: if it fails nothing is written and the old logo stays.
      if (logoFile) {
        const storageRef = ref(storage, logoStoragePath(logoFile));
        await uploadBytes(storageRef, logoFile, { contentType: logoFile.type });
        logoUrl = await getDownloadURL(storageRef);
      }
      const clean = sanitizeBranding({ ...form, logoUrl });
      await setDoc(doc(db, 'settings', 'branding'), {
        ...clean, updatedAt: serverTimestamp(), updatedBy: user?.uid || user?.id || '',
      }, { merge: true });
      setLogoFile(null);
      setLogoPreview('');
      setDirty(false);
      if (fileRef.current) fileRef.current.value = '';
      if (showNotification) showNotification('บันทึกการตั้งค่าร้านแล้ว');
    } catch (err) {
      console.error('Branding save error:', err);
      setError('บันทึกไม่สำเร็จ กรุณาลองใหม่ (โลโก้เดิมยังคงอยู่)');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 pb-24 animate-fade-in-slide">
      {error && <div className="text-sm text-danger-700 bg-danger-50 border border-danger-100 rounded-control px-3 py-2" role="alert">{error}</div>}

      <section>
        <SectionHeader title="ชื่อและโลโก้" />
        <GlassCard strong className="p-4 space-y-3">
          <label className="block"><span className={labelClass}>ชื่อแอป</span>
            <input className={inputClass} maxLength={40} value={form.appName} onChange={(e) => set({ appName: e.target.value })} /></label>
          <label className="block"><span className={labelClass}>ชื่อสั้น (แสดงใต้ไอคอนบนมือถือ)</span>
            <input className={inputClass} maxLength={40} value={form.shortName} onChange={(e) => set({ shortName: e.target.value })} /></label>
          <label className="block"><span className={labelClass}>คำอธิบายสั้น</span>
            <input className={inputClass} maxLength={80} value={form.tagline} onChange={(e) => set({ tagline: e.target.value })} /></label>

          <div>
            <span className={labelClass}>โลโก้ (PNG, JPG, WEBP ไม่เกิน 2 MB)</span>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-control bg-white border border-brand-100 flex items-center justify-center overflow-hidden shrink-0">
                {shownLogo ? <img src={shownLogo} alt="โลโก้" className="w-full h-full object-contain" /> : <ImageOff size={22} className="text-ink-subtle" />}
              </div>
              <Button variant="secondary" icon={Upload} onClick={() => fileRef.current?.click()} disabled={saving}>เลือกไฟล์โลโก้</Button>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFile} />
            </div>
          </div>
        </GlassCard>
      </section>

      <section>
        <SectionHeader title="สีหลัก" />
        <GlassCard strong className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {PRESET_COLORS.map((c) => (
              <button key={c} type="button" onClick={() => set({ primaryColor: c })} aria-label={`เลือกสี ${c}`}
                className={`w-10 h-10 rounded-full border-2 ${form.primaryColor.toLowerCase() === c ? 'border-ink' : 'border-white'} shadow-sm`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input type="color" aria-label="เลือกสีหลัก" className="w-11 h-11 rounded-control border border-white bg-white/80 p-1"
              value={colorValid ? form.primaryColor : '#6355d8'} onChange={(e) => set({ primaryColor: e.target.value })} />
            <input className={inputClass} maxLength={7} value={form.primaryColor} onChange={(e) => set({ primaryColor: e.target.value })} placeholder="#6355d8" />
          </div>

          {/* Live preview from the generated palette (not yet saved) */}
          <div className="rounded-control border border-brand-100 bg-white/70 p-3 flex flex-wrap items-center gap-3">
            <span className="px-4 h-10 inline-flex items-center rounded-control text-sm font-bold text-white" style={{ backgroundColor: rgb(palette['600']) }}>ปุ่มตัวอย่าง</span>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: rgb(palette['100']), color: rgb(palette['700']) }}>ป้ายตัวอย่าง</span>
            <span className="px-3 h-9 inline-flex items-center gap-2 rounded-control text-xs font-bold text-white" style={{ backgroundColor: rgb(palette['900']) }}>
              {shownLogo ? <img src={shownLogo} alt="" className="w-5 h-5 object-contain" /> : <Palette size={14} />}
              {form.shortName || form.appName}
            </span>
          </div>
        </GlassCard>
      </section>

      <section>
        <SectionHeader title="ข้อมูลร้าน (ใช้ในหัวเอกสาร)" action={migrated ? <Badge tone="neutral">ดึงจากข้อมูลเดิมในเครื่องนี้ กดบันทึกเพื่อยืนยัน</Badge> : null} />
        <GlassCard strong className="p-4 space-y-3">
          <label className="block"><span className={labelClass}>ชื่อร้าน / บริษัท</span>
            <input className={inputClass} maxLength={200} value={form.shopName} onChange={(e) => set({ shopName: e.target.value })} /></label>
          <label className="block"><span className={labelClass}>ที่อยู่</span>
            <input className={inputClass} maxLength={200} value={form.shopAddress} onChange={(e) => set({ shopAddress: e.target.value })} /></label>
          <div className="grid grid-cols-2 gap-2.5">
            <label className="block"><span className={labelClass}>เลขผู้เสียภาษี</span>
              <input className={inputClass} inputMode="numeric" maxLength={200} value={form.shopTaxId} onChange={(e) => set({ shopTaxId: e.target.value })} /></label>
            <label className="block"><span className={labelClass}>โทร</span>
              <input className={inputClass} inputMode="tel" maxLength={200} value={form.shopPhone} onChange={(e) => set({ shopPhone: e.target.value })} /></label>
          </div>
        </GlassCard>
      </section>

      <Button icon={Save} block loading={saving} disabled={saving || !dirty} onClick={handleSave}>บันทึกการตั้งค่าร้าน</Button>
    </div>
  );
}
