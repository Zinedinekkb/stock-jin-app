// app/components/LandingHome.js
// Public homepage shown before login. Motion reverse-engineered from fastwork.com/selling:
//   1. Tall "track" sections with a sticky inner. One rAF loop reads each track's
//      getBoundingClientRect, turns it into progress 0..1, smooths it with a 0.22 lerp
//      (snap below 8e-4, same constants as the original) and writes it to --p.
//      landing.css derives every scroll-linked transform, blur and opacity from --p.
//   2. Hero "ring splash": cards start on a ring around the centre and fly out to their
//      resting spots (keyframes animate the typed property --entered), inside a CSS 3D
//      stage (perspective 1200px) with pointer parallax.
//   3. IntersectionObserver adds .is-in to play one-shot entrance keyframes.
// Addition not in the original: a WebGL aurora shader behind the dark section.
'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Package, ArrowRight, ChevronDown, FileText, Bell, ClipboardCheck, ArrowRightLeft,
  BarChart3, CalendarCheck, Boxes, ScanLine, Truck, Users, Send, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import LandingShader from './landing/LandingShader';
import './landing/landing.css';

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

// Resting spots (percent of the stage) and sizes taken from the original hero layout.
const CARDS = [
  // m = [left, top] on phones: cards move to bands above and below the headline
  { label: 'คลังสินค้าหลัก', sub: '1,240 รายการ', icon: Boxes, grad: 'linear-gradient(135deg,#7c6cf2,#4f46e5)', left: -1.8, top: 9, w: 195, rot: 3, z: 40, m: [-8, 10] },
  { label: 'รับสินค้าเข้า', sub: 'ซัพพลายเออร์ A', icon: Truck, grad: 'linear-gradient(135deg,#34d399,#0d9488)', left: 76.4, top: -8.5, w: 193, rot: -4, z: 10, desk: true },
  { label: 'ใบเบิกวัตถุดิบ', sub: 'ครัวกลาง · วันนี้', icon: ArrowRightLeft, grad: 'linear-gradient(135deg,#fbbf24,#f97316)', left: 8.5, top: -6.9, w: 193, rot: 4, z: 70, desk: true },
  { label: 'ตรวจนับสต็อก', sub: 'สแกนบาร์โค้ด', icon: ScanLine, grad: 'linear-gradient(135deg,#f472b6,#db2777)', left: 13, top: 27, w: 203, rot: -2, z: 110, m: [36, 8] },
  { label: 'รายงานยอดขาย', sub: 'สรุปรายสัปดาห์', icon: BarChart3, grad: 'linear-gradient(135deg,#60a5fa,#2563eb)', left: -0.7, top: 44.5, w: 238, rot: 4, z: 20, desk: true },
  { label: 'งานประจำวัน', sub: '8 งาน · 3 เสร็จแล้ว', icon: CalendarCheck, grad: 'linear-gradient(135deg,#a78bfa,#7c3aed)', left: 5.3, top: 67.5, w: 258, rot: 3, z: 90, m: [-6, 74] },
  { label: 'เอกสาร PDF', sub: 'ใบรับ-ใบเบิก', icon: FileText, grad: 'linear-gradient(135deg,#94a3b8,#334155)', left: 76.3, top: 77.8, w: 214, rot: -3, z: 60, m: [74, 72] },
  { label: 'แจ้งเตือนของใกล้หมด', sub: 'ส่งเข้า LINE', icon: Bell, grad: 'linear-gradient(135deg,#fb7185,#e11d48)', left: 86.3, top: 6.4, w: 193, rot: 5, z: 30, m: [76, 11] },
  { label: 'ทีมงาน', sub: '24 คน · 5 สาขา', icon: Users, grad: 'linear-gradient(135deg,#2dd4bf,#0891b2)', left: 89, top: 65, w: 190, rot: -6, z: 50, desk: true },
  { label: 'อนุมัติรายการ', sub: 'รอ 3 รายการ', icon: ClipboardCheck, grad: 'linear-gradient(135deg,#facc15,#ca8a04)', left: 84.2, top: 34, w: 230, rot: -5, z: 120, m: [38, 78] },
];

const WORDS = ['ง่าย', 'เร็ว', 'แม่น', 'ครบ'];

const MODULES = ['คลังสินค้า', 'เบิก-รับของ', 'ตรวจนับสต็อก', 'งานประจำวัน', 'รายงาน & LINE'];

const NOTES = [
  { text: 'ของหมดแต่ไม่มีใครรู้ จนลูกค้าสั่ง', c: '#fde68a', x: '2%', y: '6%', r: '-6deg' },
  { text: 'สมุดจดสต็อกหาย ต้องนับใหม่ทั้งร้าน', c: '#c7d2fe', x: '27%', y: '0%', r: '4deg' },
  { text: 'ใครเบิกของไป ไม่มีหลักฐาน', c: '#fbcfe8', x: '52%', y: '8%', r: '-3deg' },
  { text: 'ยอดในไลน์กลุ่ม ไม่ตรงกับของจริง', c: '#bbf7d0', x: '76%', y: '2%', r: '6deg' },
  { text: 'ทำรายงานส่งเจ้าของทุกเย็น เสียเวลา', c: '#fed7aa', x: '14%', y: '52%', r: '5deg' },
  { text: 'พนักงานใหม่ไม่รู้ว่าของอยู่ไหน', c: '#a5f3fc', x: '58%', y: '54%', r: '-5deg' },
];

const ALERTS = ['น้ำมันพืช เหลือ 3', 'ไข่ไก่ เหลือ 12', 'ถุงพลาสติก เหลือ 40', 'แก้วกาแฟ 16oz เหลือ 25', 'น้ำตาลทราย เหลือ 2', 'นมสด เหลือ 6'];

const clamp01 = (v) => Math.min(1, Math.max(0, v));

// --- small hooks ---------------------------------------------------------------

function useInView(threshold = 0.25) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) { setInView(true); io.disconnect(); }
    }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, inView];
}

function useCountUp(target, run, duration = 1400) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!run) return undefined;
    let raf = 0;
    const t0 = performance.now();
    const step = (now) => {
      const k = clamp01((now - t0) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, run, duration]);
  return value;
}

// --- sections ------------------------------------------------------------------

function ShowcaseScreen({ index }) {
  if (index === 0) {
    return (
      <div className="lh-stagger grid gap-3">
        <div className="grid grid-cols-3 gap-3">
          {[['1,240', 'สินค้าทั้งหมด'], ['12', 'ใกล้หมด'], ['5', 'คลัง/สาขา']].map(([n, l]) => (
            <div key={l} className="rounded-2xl bg-[#f8f9fb] p-4"><p className="text-2xl font-bold">{n}</p><p className="text-xs text-slate-500">{l}</p></div>
          ))}
        </div>
        {[['น้ำมันพืช 1L', '3 ขวด', 'bg-rose-100 text-rose-700'], ['ไข่ไก่ เบอร์ 2', '12 แผง', 'bg-amber-100 text-amber-700'], ['แก้ว 16oz', '540 ใบ', 'bg-emerald-100 text-emerald-700'], ['น้ำตาลทราย', '2 กก.', 'bg-rose-100 text-rose-700']].map(([n, q, c]) => (
          <div key={n} className="lh-row"><span className="font-medium">{n}</span><span className={`lh-pill ${c}`}>{q}</span></div>
        ))}
      </div>
    );
  }
  if (index === 1) {
    return (
      <div className="lh-stagger grid gap-3">
        {[['OUT', 'เบิกวัตถุดิบ · ครัวกลาง', 'รออนุมัติ', 'bg-amber-100 text-amber-700'], ['IN', 'รับสินค้า · ซัพพลายเออร์ A', 'รับแล้ว', 'bg-emerald-100 text-emerald-700'], ['MOVE', 'โอนย้าย · สาขา 2', 'กำลังส่ง', 'bg-sky-100 text-sky-700'], ['OUT', 'เบิกบรรจุภัณฑ์ · หน้าร้าน', 'อนุมัติแล้ว', 'bg-violet-100 text-violet-700']].map(([t, n, s, c]) => (
          <div key={n} className="lh-row">
            <span className="flex items-center gap-3"><span className="text-[11px] font-bold w-12 text-center rounded-lg bg-white py-1 border">{t}</span><span className="font-medium">{n}</span></span>
            <span className={`lh-pill ${c}`}>{s}</span>
          </div>
        ))}
      </div>
    );
  }
  if (index === 2) {
    return (
      <div className="lh-stagger grid gap-3">
        <div className="rounded-2xl bg-[#f8f9fb] p-4 flex items-center justify-between"><span className="font-semibold">ตรวจนับประจำเดือน</span><span className="lh-pill bg-emerald-100 text-emerald-700">ตรงกัน 98%</span></div>
        {[['น้ำมันพืช 1L', 24, 24], ['ไข่ไก่ เบอร์ 2', 40, 38], ['แก้ว 16oz', 540, 540], ['ถุงหิ้ว L', 300, 300]].map(([n, sys, real]) => (
          <div key={n} className="lh-row">
            <span className="font-medium">{n}</span>
            <span className="text-sm tabular-nums">ระบบ {sys} · นับได้ <b className={sys === real ? 'text-emerald-600' : 'text-rose-600'}>{real}</b></span>
          </div>
        ))}
      </div>
    );
  }
  if (index === 3) {
    return (
      <div className="lh-stagger grid gap-3">
        {[['เช็คอุณหภูมิตู้แช่', true], ['รับของเช้า', true], ['นับเงินทอน', true], ['ทำความสะอาดคลัง', false], ['ส่งรายงานปิดร้าน', false]].map(([n, done]) => (
          <div key={n} className="lh-row">
            <span className="flex items-center gap-3"><CheckCircle2 size={18} className={done ? 'text-emerald-500' : 'text-slate-300'} /><span className={done ? 'line-through text-slate-400' : 'font-medium'}>{n}</span></span>
            <span className={`lh-pill ${done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{done ? 'เสร็จ' : 'รอทำ'}</span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="lh-stagger grid gap-3">
      <div className="rounded-2xl bg-[#f8f9fb] p-4">
        <p className="text-sm text-slate-500">ยอดเบิกรายวัน (7 วัน)</p>
        <div className="lh-bars">{[42, 66, 51, 80, 63, 95, 74].map((h, i) => <i key={i} style={{ height: `${h}%`, animationDelay: `${i * 0.06}s` }} />)}</div>
      </div>
      <div className="lh-row"><span className="flex items-center gap-2 font-medium"><Send size={16} className="text-emerald-500" />ส่งสรุปเข้า LINE กลุ่ม</span><span className="lh-pill bg-emerald-100 text-emerald-700">18:00 ทุกวัน</span></div>
    </div>
  );
}

function TruthSection() {
  const [ref, inView] = useInView(0.4);
  const system = useCountUp(1240, inView);
  const real = useCountUp(1240, inView, 1700);
  const done = inView && real === 1240;
  return (
    <section className="lh-truth-track" data-track="truth">
      <div className="lh-truth">
        <div ref={ref} className={`lh-truth-card ${inView ? 'is-in' : ''} ${done ? 'is-done' : ''}`}>
          <h2 className="lh-truth-title">
            <span className="muted">ไม่ต้องเดาว่าของเหลือเท่าไหร่</span>
            ยอดในระบบ <span className="lh-accent">ตรงกับของจริง
              <svg className="lh-underline" viewBox="0 0 300 16" preserveAspectRatio="none" aria-hidden="true">
                <path d="M4 10 C 70 2, 150 14, 296 6" pathLength="1" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
              </svg>
            </span>
          </h2>
          <div className="lh-ledger">
            <div className="lh-count"><b>{system.toLocaleString()}</b><span>ยอดในระบบ</span></div>
            <svg className="lh-arrow" width="120" height="60" viewBox="0 0 120 60" aria-hidden="true">
              <path d="M6 40 C 30 6, 80 6, 108 30" pathLength="1" fill="none" stroke="#151a23" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M98 22 L 110 31 L 96 36" pathLength="1" fill="none" stroke="#151a23" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="lh-count"><b>{real.toLocaleString()}</b><span>นับได้จริง</span></div>
            <div className="lh-check"><CheckCircle2 size={34} /></div>
          </div>
          <p className="max-w-xl text-center text-slate-500">ทุกการรับ เบิก และโอน ตัดสต็อกทันทีพร้อมชื่อคนทำ ตรวจนับเมื่อไหร่ก็เทียบยอดได้ทันที</p>
        </div>
      </div>
    </section>
  );
}

function Tile({ className, children }) {
  const [ref, inView] = useInView(0.2);
  return <div ref={ref} className={`lh-tile ${className} ${inView ? 'is-in' : ''}`}>{children}</div>;
}

const CONFETTI = Array.from({ length: 18 }, (_, i) => ({
  l: `${(i * 37) % 100}%`,
  c: ['#ff9a7a', '#8b7cff', '#22d3ee', '#34d399', '#facc15'][i % 5],
  d: `${2.6 + (i % 5) * 0.5}s`,
  dl: `${(i % 6) * 0.45}s`,
}));

// --- page ----------------------------------------------------------------------

export default function LandingHome({ onGetStarted }) {
  const rootRef = useRef(null);
  const stageRef = useRef(null);
  const showRef = useRef(null);
  const painRef = useRef(null);
  const [stageReady, setStageReady] = useState(false);
  const [navDark, setNavDark] = useState(false);
  const [active, setActive] = useState(0);
  const [wordIndex, setWordIndex] = useState(0);

  // Cycle the accent word in the headline (the original cycles "you" through languages).
  useEffect(() => {
    const id = setInterval(() => setWordIndex((i) => (i + 1) % WORDS.length), 2400);
    return () => clearInterval(id);
  }, []);

  // Ring splash: give each card its start offset on a ring around the centre and
  // its scatter vector for the scroll exit. Measured before paint to avoid a flash.
  useIsoLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    const place = () => {
      const W = stage.clientWidth;
      const H = stage.clientHeight;
      const R = Math.min(W, H) * 0.2;
      const cards = [...stage.querySelectorAll('[data-orbit]')];
      cards.forEach((el, i) => {
        const cx = el.offsetLeft + el.offsetWidth / 2;
        const cy = el.offsetTop + el.offsetHeight / 2;
        const a = (i / cards.length) * Math.PI * 2 - Math.PI / 2;
        el.style.setProperty('--ex', `${W / 2 + R * Math.cos(a) - cx}px`);
        el.style.setProperty('--ey', `${H / 2 + R * Math.sin(a) - cy}px`);
        el.style.setProperty('--r0', `${(a * 180) / Math.PI + 90}deg`);
        el.style.setProperty('--sx', `${(cx - W / 2) * 0.9}px`);
        el.style.setProperty('--sy', `${(cy - H / 2) * 0.9}px`);
      });
    };
    place();
    setStageReady(true);
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, []);

  // Single scroll driver for every [data-track] plus pointer parallax on the hero stage.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tracks = [...root.querySelectorAll('[data-track]')].map((el) => ({ el, cur: 0, name: el.dataset.track }));
    const mouse = { tx: 0, ty: 0, x: 0, y: 0 };
    let raf = 0;
    let lastActive = -1;
    let lastDark = null;

    const progressOf = (el) => {
      const r = el.getBoundingClientRect();
      const span = Math.max(1, r.height - window.innerHeight);
      return clamp01(-r.top / span);
    };

    const tick = () => {
      raf = 0;
      let moving = false;
      for (const t of tracks) {
        const target = progressOf(t.el);
        t.cur = reduce ? target : t.cur + (target - t.cur) * 0.22;
        if (Math.abs(target - t.cur) < 8e-4) t.cur = target; else moving = true;
        t.el.style.setProperty('--p', t.cur.toFixed(4));
        if (t.name === 'showcase') {
          const idx = Math.min(MODULES.length - 1, Math.max(0, Math.floor(((t.cur - 0.14) / 0.86) * MODULES.length)));
          if (idx !== lastActive) { lastActive = idx; setActive(idx); }
        }
      }
      const dark = window.scrollY > window.innerHeight * 1.05;
      if (dark !== lastDark) { lastDark = dark; setNavDark(dark); }

      if (!reduce && stageRef.current) {
        mouse.x += (mouse.tx - mouse.x) * 0.08;
        mouse.y += (mouse.ty - mouse.y) * 0.08;
        if (Math.abs(mouse.tx - mouse.x) > 1e-3 || Math.abs(mouse.ty - mouse.y) > 1e-3) moving = true;
        stageRef.current.style.setProperty('--mx', mouse.x.toFixed(4));
        stageRef.current.style.setProperty('--my', mouse.y.toFixed(4));
      }
      if (moving) raf = requestAnimationFrame(tick);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
    const onPointer = (e) => {
      if (e.pointerType !== 'mouse') return;
      mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
      kick();
    };

    window.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('resize', kick);
    window.addEventListener('pointermove', onPointer, { passive: true });
    tick();
    return () => {
      window.removeEventListener('scroll', kick);
      window.removeEventListener('resize', kick);
      window.removeEventListener('pointermove', onPointer);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Rail click: jump to the scroll position where that module becomes active.
  const goToModule = useCallback((i) => {
    const track = showRef.current;
    if (!track) return;
    const top = track.getBoundingClientRect().top + window.scrollY;
    const span = track.offsetHeight - window.innerHeight;
    const p = 0.14 + ((i + 0.5) / MODULES.length) * 0.86;
    window.scrollTo({ top: top + span * p, behavior: 'smooth' });
  }, []);

  const scrollToShowcase = () => goToModule(0);

  return (
    <div ref={rootRef} className="lh-root font-sans">
      <header className={`lh-nav ${navDark ? 'is-dark' : ''}`}>
        <div className="lh-nav-brand"><Package size={20} className={navDark ? 'text-white' : 'text-brand-600'} /> StockPro</div>
        <button type="button" onClick={onGetStarted} className="lh-nav-btn">เข้าสู่ระบบ</button>
      </header>

      {/* 1. Hero: ring splash in a 3D stage, scatters away as you scroll */}
      <section className="lh-hero-track" data-track="hero">
        <div className="lh-hero">
          <div ref={stageRef} className={`lh-stage ${stageReady ? 'is-ready' : ''}`} aria-hidden="true">
            {CARDS.map((c, i) => {
              const Icon = c.icon;
              return (
                <div
                  key={c.label}
                  data-orbit
                  className={`lh-card ${c.desk ? 'lh-desk' : ''}`}
                  style={{
                    '--l': `${c.left}%`, '--t': `${c.top}%`,
                    '--ml': `${(c.m ?? [c.left])[0]}%`, '--mt': `${(c.m ?? [0, c.top])[1]}%`,
                    '--w': `clamp(110px, ${(c.w / 14.4).toFixed(2)}vw, ${c.w}px)`,
                    '--rot': `${c.rot}deg`, '--z': `${c.z}px`, '--delay': `${0.05 + i * 0.045}s`,
                  }}
                >
                  <div className="lh-card-inner">
                    <div className="lh-card-art" style={{ background: c.grad }}>
                      <Icon size={38} strokeWidth={1.8} />
                      <div className="lh-card-lines"><i style={{ width: '70%' }} /><i style={{ width: '45%' }} /></div>
                    </div>
                    <div className="lh-card-meta"><b>{c.label}</b><span>{c.sub}</span></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="lh-copy">
            <h1 className="lh-title">
              จัดการสต็อก<span className="whitespace-nowrap">ร้านของคุณ</span><br />
              ให้ <span className="lh-word-slot"><span key={wordIndex} className="lh-word">{WORDS[wordIndex]}</span></span> ในที่เดียว
            </h1>
            <p className="lh-sub">ดูสต็อก เบิกของ ตรวจนับ และรายงาน ได้จากมือถือ ทุกสาขาเห็นข้อมูลชุดเดียวกัน</p>
            <div className="lh-ctas">
              <button type="button" onClick={onGetStarted} className="lh-comet">เริ่มใช้งาน <ArrowRight size={16} /></button>
              <button type="button" onClick={scrollToShowcase} className="lh-ghost">ดูฟีเจอร์</button>
            </div>
          </div>

          <button type="button" className="lh-cue" onClick={scrollToShowcase}>เลื่อนลง <ChevronDown size={16} /></button>
        </div>
      </section>

      {/* 2. Showcase: app mock scales 1.22 -> 1 then swaps screens as the rail advances */}
      <section ref={showRef} className="lh-show-track" data-track="showcase">
        <div className="lh-show">
          <nav className="lh-rail" aria-label="ฟีเจอร์">
            {MODULES.map((m, i) => (
              <button key={m} type="button" className={i === active ? 'is-active' : ''} onClick={() => goToModule(i)}>{m}</button>
            ))}
            <div className="lh-rail-bar"><i /></div>
          </nav>
          <div className="lh-mock">
            <div className="lh-mock-screen">
              <div className="lh-mock-head">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-600 to-[#8072f5] grid place-items-center text-white"><Package size={18} /></div>
                <div>
                  <p className="font-semibold leading-tight">ร้านของฉัน</p>
                  <p className="text-xs text-slate-500">กรุงเทพฯ · 5 สาขา</p>
                </div>
                <span className="ml-auto lh-pill bg-slate-100 text-slate-600">{MODULES[active]}</span>
              </div>
              <div key={active} className="lh-mock-body lh-swap">
                <ShowcaseScreen index={active} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Pain: dark sticky stage, notes stick on one by one as you scroll */}
      <section ref={painRef} className="lh-pain-track" data-track="pain">
        <div className="lh-pain">
          <LandingShader className="lh-shader" scrollVarHost={painRef} />
          <h2 className="lh-pain-title">งานสต็อกยุ่งยากพอแล้ว...</h2>
          <p className="lh-pain-sub">ปัญหาเหล่านี้ ให้ระบบจัดการแทน</p>
          <div className="lh-notes">
            {NOTES.map((n, i) => (
              <div key={n.text} className="lh-note" style={{ '--x': n.x, '--y': n.y, '--r': n.r, '--c': n.c, '--t': (0.04 + i * 0.06).toFixed(3) }}>
                {n.text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Stacked card slides over the dark stage, then shrinks as the next one arrives */}
      <TruthSection />

      {/* 5. Platform bento */}
      <section className="lh-plat-track" data-track="platform">
        <div className="lh-plat">
          <div className="lh-plat-head">
            <h2>ทุกอย่างที่ร้านต้องใช้ ในแอปเดียว</h2>
            <p>ตั้งแต่รับของเข้า จนถึงรายงานปิดร้าน</p>
          </div>
          <div className="lh-bento">
            <Tile className="lh-span-7">
              <h3>เอกสารออกให้อัตโนมัติ</h3>
              <p>ใบรับ ใบเบิก และใบตรวจนับ เป็น PDF พร้อมลายเซ็น</p>
              <div className="lh-doc">
                <div className="flex items-center justify-between"><b>ใบเบิกสินค้า #0218</b><span className="lh-pill bg-emerald-100 text-emerald-700">อนุมัติแล้ว</span></div>
                <i style={{ width: '92%' }} /><i style={{ width: '76%' }} /><i style={{ width: '84%' }} /><i style={{ width: '58%' }} /><i style={{ width: '70%' }} />
              </div>
            </Tile>
            <Tile className="lh-span-5">
              <h3>แจ้งเตือนก่อนของหมด</h3>
              <p>ตั้งจุดสั่งซื้อขั้นต่ำ ระบบเตือนเอง</p>
              <div className="lh-marquee">
                {[false, true].map((rev) => (
                  <div key={String(rev)} className={`lh-marquee-row ${rev ? 'rev' : ''}`}>
                    {[...ALERTS, ...ALERTS].map((a, i) => (
                      <span key={i} className="lh-chip"><AlertTriangle size={14} className="text-amber-300" />{a}</span>
                    ))}
                  </div>
                ))}
              </div>
            </Tile>
            <Tile className="lh-span-6">
              <h3>อนุมัติเป็นขั้นตอน</h3>
              <p>หัวหน้าอนุมัติจากมือถือ ทุกขั้นมีประวัติ</p>
              <div className="lh-orders">
                {[['เบิกวัตถุดิบ · ครัวกลาง', 'รออนุมัติ', 'bg-amber-100 text-amber-700'], ['รับสินค้า · ซัพพลายเออร์ A', 'ตรวจแล้ว', 'bg-emerald-100 text-emerald-700'], ['โอนย้าย · สาขา 2', 'กำลังส่ง', 'bg-sky-100 text-sky-700']].map(([t, s, c]) => (
                  <div key={t} className="lh-order"><span className="font-medium">{t}</span><span className={`lh-pill ${c}`}>{s}</span></div>
                ))}
              </div>
            </Tile>
            <Tile className="lh-span-6">
              <h3>สรุปเข้า LINE ทุกเย็น</h3>
              <p>เจ้าของเห็นยอดทุกสาขา โดยไม่ต้องมีใครทำรายงาน</p>
              <div className="lh-glow-card">
                <div className="lh-confetti" aria-hidden="true">
                  {CONFETTI.map((c, i) => <i key={i} style={{ '--l': c.l, '--c': c.c, '--d': c.d, '--dl': c.dl }} />)}
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 grid place-items-center"><Send size={18} /></div>
                  <div><p className="font-semibold">ส่งรายงานแล้ว</p><p className="text-xs text-slate-400">วันนี้ 18:00 · 5 สาขา</p></div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {[['86', 'รายการเบิก'], ['12', 'ใกล้หมด'], ['3', 'รออนุมัติ']].map(([n, l]) => (
                    <div key={l} className="rounded-xl bg-white/5 py-3"><p className="text-xl font-bold">{n}</p><p className="text-[11px] text-slate-400">{l}</p></div>
                  ))}
                </div>
              </div>
            </Tile>
          </div>
        </div>
      </section>

      {/* 6. CTA */}
      <section className="lh-cta">
        <h2>พร้อมจัดระเบียบสต็อกแล้วหรือยัง?</h2>
        <button type="button" onClick={onGetStarted} className="lh-comet">เริ่มใช้งานเลย <ArrowRight size={16} /></button>
      </section>
    </div>
  );
}
