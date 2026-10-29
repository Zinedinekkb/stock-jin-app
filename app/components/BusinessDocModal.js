// app/components/BusinessDocModal.js
'use client';
import React, { useState, useRef, useLayoutEffect } from 'react';
import { X, Plus, Trash2, Download, Save, Printer, Sparkles, FileText } from 'lucide-react';
import { Button } from './ui';
import {
  BUSINESS_DOC_TYPES, getDocType, blankDocData, sampleDocData, emptyItem, calcTotals,
  buildBusinessDocHtml, generateBusinessDocPdf, saveBusinessDocument, makeDocNumber,
} from '../utils/businessDocTemplates';

// Shop header details are a per-device convenience, so they are remembered locally
const SHOP_KEY = 'stockjin.shopInfo';
const loadShop = () => {
  try { return JSON.parse(localStorage.getItem(SHOP_KEY) || '{}'); } catch { return {}; }
};
const saveShop = (data) => {
  try {
    localStorage.setItem(SHOP_KEY, JSON.stringify({
      shopName: data.shopName, shopAddress: data.shopAddress, shopTaxId: data.shopTaxId, shopPhone: data.shopPhone,
    }));
  } catch { /* storage unavailable: nothing to remember */ }
};

const inputClass = 'w-full h-11 px-3 rounded-control bg-white/80 border border-white text-sm text-ink outline-none focus:ring-2 focus:ring-brand-200';
const labelClass = 'block text-xs font-bold text-ink-muted mb-1';

// A4 preview scaled to its column width
function A4Preview({ html }) {
  const wrapRef = useRef(null);
  const [scale, setScale] = useState(0.5);
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const update = () => setScale(Math.min(1, el.clientWidth / 794));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={wrapRef} className="w-full">
      <div className="mx-auto shadow-glass-lg rounded-md overflow-hidden bg-white" style={{ width: 794 * scale, height: 1123 * scale }}>
        {/* Our own template output; user text is escaped in buildBusinessDocHtml */}
        <div style={{ width: 794, transform: `scale(${scale})`, transformOrigin: 'top left' }} dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}

export default function BusinessDocModal({ isOpen, onClose, initialType = 'PO', user, showNotification }) {
  const [typeKey, setTypeKey] = useState(initialType);
  const [data, setData] = useState(() => blankDocData(initialType, typeof window !== 'undefined' ? loadShop() : {}));
  const [mobileView, setMobileView] = useState('form'); // 'form' | 'preview'
  const [busy, setBusy] = useState('');
  const [prevOpen, setPrevOpen] = useState(isOpen);
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
    if (isOpen) { setTypeKey(initialType); setData(blankDocData(initialType, loadShop())); setMobileView('form'); }
  }
  if (!isOpen) return null;

  const t = getDocType(typeKey);
  const { subtotal, vat, total } = calcTotals(data);
  const html = buildBusinessDocHtml(typeKey, data);
  const set = (patch) => setData(prev => ({ ...prev, ...patch }));
  const setItem = (i, patch) => setData(prev => ({ ...prev, items: prev.items.map((it, idx) => idx === i ? { ...it, ...patch } : it) }));

  const changeType = (key) => {
    setTypeKey(key);
    setData(prev => ({ ...prev, docNumber: makeDocNumber(key), vat: getDocType(key).hasVat }));
  };

  const notify = (msg) => (showNotification ? showNotification(msg) : null);

  const run = async (kind, fn) => {
    setBusy(kind);
    try { await fn(); } catch (err) { console.error(err); notify('ทำรายการไม่สำเร็จ กรุณาลองใหม่'); } finally { setBusy(''); }
  };

  const handleDownload = () => run('download', async () => {
    saveShop(data);
    const { pdf, fileName } = await generateBusinessDocPdf(typeKey, data);
    pdf.save(fileName);
  });

  const handleSave = () => run('save', async () => {
    saveShop(data);
    await saveBusinessDocument(typeKey, data, user);
    notify(`บันทึก${t.title}ลงคลังเอกสารแล้ว`);
    onClose();
  });

  const handlePrint = () => {
    const w = window.open('', '_blank');
    if (!w) { notify('เบราว์เซอร์บล็อกหน้าต่างพิมพ์'); return; }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${data.docNumber}</title><style>@page{size:A4;margin:0}body{margin:0}</style></head><body>${html}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-stretch sm:items-center justify-center sm:p-4 bg-ink/40 backdrop-blur-sm animate-fade-in" role="dialog" aria-modal="true" aria-label={`สร้าง${t.title}`}>
      <div className="glass-strong w-full max-w-6xl sm:rounded-card flex flex-col max-h-[100dvh] sm:max-h-[94vh] overflow-hidden">
        {/* Header: document type */}
        <div className="px-4 pt-4 pb-3 border-b border-brand-100 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-black text-ink flex items-center gap-2"><FileText size={20} className="text-brand-500" /> สร้างเอกสาร</h2>
            <button onClick={onClose} className="w-10 h-10 rounded-control flex items-center justify-center text-ink-subtle hover:bg-white/70" aria-label="ปิด"><X size={20} /></button>
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {BUSINESS_DOC_TYPES.map(dt => (
              <button key={dt.key} onClick={() => changeType(dt.key)}
                className={`h-9 px-3.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${dt.key === typeKey ? 'bg-brand-500 text-white' : 'bg-white/70 text-ink-muted hover:bg-white'}`}>
                {dt.title}
              </button>
            ))}
          </div>
          {/* Phone: switch between the form and the preview */}
          <div className="lg:hidden glass grid grid-cols-2 p-1 rounded-2xl">
            {[{ k: 'form', l: 'กรอกข้อมูล' }, { k: 'preview', l: 'ตัวอย่าง A4' }].map(v => (
              <button key={v.k} onClick={() => setMobileView(v.k)} className={`h-9 rounded-xl text-sm font-bold ${mobileView === v.k ? 'bg-white text-brand-600 shadow-sm' : 'text-ink-muted'}`}>{v.l}</button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-hidden grid lg:grid-cols-[minmax(0,420px)_1fr]">
          {/* Form */}
          <div className={`overflow-y-auto p-4 space-y-4 ${mobileView === 'form' ? 'block' : 'hidden'} lg:block`}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-ink-muted">{t.desc}</p>
              <Button size="sm" variant="ghost" icon={Sparkles} onClick={() => setData(sampleDocData(typeKey, loadShop()))}>ใส่ข้อมูลตัวอย่าง</Button>
            </div>

            <fieldset className="space-y-2.5">
              <legend className="text-sm font-bold text-ink mb-1">ข้อมูลเอกสาร</legend>
              <div className="grid grid-cols-2 gap-2.5">
                <label className="block"><span className={labelClass}>เลขที่</span><input className={inputClass} value={data.docNumber} onChange={e => set({ docNumber: e.target.value })} /></label>
                <label className="block"><span className={labelClass}>วันที่</span><input type="date" className={inputClass} value={data.date} onChange={e => set({ date: e.target.value })} /></label>
              </div>
              {(t.showDueDate || t.showValidity) && (
                <label className="block"><span className={labelClass}>{t.showDueDate ? 'ครบกำหนดชำระ' : 'ยืนราคาถึงวันที่'}</span><input type="date" className={inputClass} value={data.dueDate} onChange={e => set({ dueDate: e.target.value })} /></label>
              )}
            </fieldset>

            <fieldset className="space-y-2.5">
              <legend className="text-sm font-bold text-ink mb-1">ข้อมูลร้าน (จำไว้ในเครื่องนี้)</legend>
              <label className="block"><span className={labelClass}>ชื่อร้าน / บริษัท</span><input className={inputClass} value={data.shopName} onChange={e => set({ shopName: e.target.value })} /></label>
              <label className="block"><span className={labelClass}>ที่อยู่</span><input className={inputClass} value={data.shopAddress} onChange={e => set({ shopAddress: e.target.value })} /></label>
              <div className="grid grid-cols-2 gap-2.5">
                <label className="block"><span className={labelClass}>เลขผู้เสียภาษี</span><input className={inputClass} inputMode="numeric" value={data.shopTaxId} onChange={e => set({ shopTaxId: e.target.value })} /></label>
                <label className="block"><span className={labelClass}>โทร</span><input className={inputClass} inputMode="tel" value={data.shopPhone} onChange={e => set({ shopPhone: e.target.value })} /></label>
              </div>
            </fieldset>

            <fieldset className="space-y-2.5">
              <legend className="text-sm font-bold text-ink mb-1">{t.partyLabel}</legend>
              <label className="block"><span className={labelClass}>ชื่อ</span><input className={inputClass} value={data.partyName} onChange={e => set({ partyName: e.target.value })} /></label>
              {!t.showPurpose && <label className="block"><span className={labelClass}>ที่อยู่</span><input className={inputClass} value={data.partyAddress} onChange={e => set({ partyAddress: e.target.value })} /></label>}
              {t.hasVat && <label className="block"><span className={labelClass}>เลขผู้เสียภาษี (ถ้ามี)</span><input className={inputClass} inputMode="numeric" value={data.partyTaxId} onChange={e => set({ partyTaxId: e.target.value })} /></label>}
              {t.showPurpose && <label className="block"><span className={labelClass}>วัตถุประสงค์</span><input className={inputClass} value={data.purpose} onChange={e => set({ purpose: e.target.value })} /></label>}
              {t.showPayment && (
                <label className="block"><span className={labelClass}>ชำระโดย</span>
                  <select className={inputClass} value={data.paymentMethod} onChange={e => set({ paymentMethod: e.target.value })}>
                    {['เงินสด', 'โอนเงิน (พร้อมเพย์)', 'โอนเงินเข้าบัญชีธนาคาร', 'บัตรเครดิต', 'เช็ค'].map(m => <option key={m}>{m}</option>)}
                  </select>
                </label>
              )}
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="text-sm font-bold text-ink mb-1">รายการ</legend>
              {data.items.map((it, i) => (
                <div key={i} className="bg-white/60 rounded-control p-2.5 space-y-2">
                  <div className="flex gap-2">
                    <input className={`${inputClass} flex-1`} placeholder={`รายการที่ ${i + 1}`} aria-label={`ชื่อรายการที่ ${i + 1}`} value={it.name} onChange={e => setItem(i, { name: e.target.value })} />
                    <button onClick={() => set({ items: data.items.length > 1 ? data.items.filter((_, idx) => idx !== i) : [emptyItem()] })} className="w-11 h-11 rounded-control flex items-center justify-center text-ink-subtle hover:text-danger-600 hover:bg-danger-50 shrink-0" aria-label={`ลบรายการที่ ${i + 1}`}><Trash2 size={17} /></button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input type="number" inputMode="decimal" className={inputClass} aria-label="จำนวน" placeholder="จำนวน" value={it.qty} onChange={e => setItem(i, { qty: e.target.value })} />
                    <input className={inputClass} aria-label="หน่วย" placeholder="หน่วย" value={it.unit} onChange={e => setItem(i, { unit: e.target.value })} />
                    <input type="number" inputMode="decimal" className={inputClass} aria-label="ราคาต่อหน่วย" placeholder="ราคา/หน่วย" value={it.price} onChange={e => setItem(i, { price: e.target.value })} />
                  </div>
                </div>
              ))}
              <Button size="sm" variant="secondary" icon={Plus} onClick={() => set({ items: [...data.items, emptyItem()] })}>เพิ่มรายการ</Button>
            </fieldset>

            <div className="space-y-2.5">
              {t.hasVat && (
                <label className="flex items-center gap-2.5 text-sm text-ink cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 accent-brand-500" checked={data.vat} onChange={e => set({ vat: e.target.checked })} /> คิดภาษีมูลค่าเพิ่ม 7%
                </label>
              )}
              <label className="block"><span className={labelClass}>หมายเหตุ</span><input className={inputClass} value={data.note} onChange={e => set({ note: e.target.value })} /></label>
              <div className="bg-brand-50/70 rounded-control p-3 text-sm space-y-1">
                <div className="flex justify-between text-ink-muted"><span>รวม</span><span className="tabular-nums">{subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span></div>
                {data.vat && <div className="flex justify-between text-ink-muted"><span>VAT 7%</span><span className="tabular-nums">{vat.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span></div>}
                <div className="flex justify-between font-black text-ink text-base"><span>ยอดสุทธิ</span><span className="tabular-nums">{total.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span></div>
              </div>
            </div>
          </div>

          {/* Live A4 preview */}
          <div className={`overflow-y-auto p-4 bg-brand-50/40 ${mobileView === 'preview' ? 'block' : 'hidden'} lg:block`}>
            <A4Preview html={html} />
          </div>
        </div>

        {/* Actions */}
        <div className="p-3 border-t border-brand-100 flex flex-wrap gap-2 justify-end">
          <Button variant="secondary" icon={Printer} onClick={handlePrint} className="flex-1 sm:flex-none">พิมพ์</Button>
          <Button variant="secondary" icon={Download} loading={busy === 'download'} disabled={!!busy} onClick={handleDownload} className="flex-1 sm:flex-none">PDF</Button>
          <Button icon={Save} loading={busy === 'save'} disabled={!!busy} onClick={handleSave} className="w-full sm:w-auto">บันทึกลงคลังเอกสาร</Button>
        </div>
      </div>
    </div>
  );
}
