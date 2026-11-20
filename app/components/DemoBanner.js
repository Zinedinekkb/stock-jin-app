'use client'
// Shown only in the demo build (NEXT_PUBLIC_DEMO_MODE=true).
// Floating pill with a role switcher (admin / staff). The switcher stays visible even after the
// notice text is dismissed. Switching writes role + position on the signed-in demo user's doc in the
// in-memory store, so the app's own users/{uid} listener re-renders the whole UI with no reload.
import { useEffect, useState } from 'react'
import { X, FlaskConical, Info } from 'lucide-react'

const DEMO_UID = 'demo-admin'
// Same fields the app's permission logic reads (role + position). Staff uses the default position a
// newly approved staff user gets, so no position-based extras (stock verify / team tab) apply.
const ROLES = {
  admin: { label: 'แอดมิน', patch: { role: 'admin', position: 'ผู้ดูแลระบบ' } },
  staff: { label: 'พนักงาน', patch: { role: 'staff', position: 'พนักงานทั่วไป' } },
}

// Derived from app/utils/permissions.js (PERMISSIONS), app/config/navigation.js (adminOnly)
// and getVisibleSubItems (dashboard sub-tabs).
const STAFF_HIDDEN = [
  'เมนู "จัดการบัญชีผู้ใช้" และ "ตั้งค่าร้าน"',
  'แท็บแดชบอร์ดของทีมอื่น (เห็นเฉพาะงานของฉัน, ทีมตนเอง, สถิติ)',
  'แก้ไข/เพิ่ม/ลบสินค้า และจัดการหมวดหมู่',
  'อนุมัติ/ยกเลิก/แก้ไขรายการเบิก-รับ และลบประวัติ',
  'สั่งงานให้คนอื่น, ส่งรายงานเข้า LINE, อนุมัติลา/ผู้ใช้, แจ้งเตือนฝั่งแอดมิน',
]

export default function DemoBanner() {
  const [noticeOpen, setNoticeOpen] = useState(true)
  const [hintOpen, setHintOpen] = useState(false)
  const [role, setRole] = useState('admin')
  const [busy, setBusy] = useState(false)
  const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

  // Follow the demo user's doc so the control reflects the real current role
  useEffect(() => {
    if (!isDemo) return
    let unsub = () => {}
    let cancelled = false
    ;(async () => {
      const [{ db }, { doc, onSnapshot }] = await Promise.all([import('@/lib/firebase'), import('firebase/firestore')])
      if (cancelled) return
      unsub = onSnapshot(doc(db, 'users', DEMO_UID), (snap) => {
        if (snap.exists()) setRole(snap.data().role === 'admin' ? 'admin' : 'staff')
      })
    })()
    return () => { cancelled = true; unsub() }
  }, [isDemo])

  if (!isDemo) return null

  const switchTo = async (key) => {
    if (key === role || busy) return
    setBusy(true)
    try {
      const [{ db }, { doc, updateDoc }] = await Promise.all([import('@/lib/firebase'), import('firebase/firestore')])
      await updateDoc(doc(db, 'users', DEMO_UID), ROLES[key].patch)
      setRole(key)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-24 md:bottom-4 z-[60] max-w-[calc(100vw-1.5rem)] flex flex-col items-center gap-2">
      {hintOpen && (
        <div role="note" className="w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl bg-white text-ink shadow-lg border border-brand-200 p-3 text-xs leading-relaxed">
          <p className="font-bold mb-1">
            {role === 'staff' ? 'ตอนนี้ดูในฐานะพนักงาน' : 'ตอนนี้ดูในฐานะแอดมิน'}
          </p>
          <p className="font-semibold">พนักงานจะไม่เห็น/ทำไม่ได้:</p>
          <ul className="list-disc pl-4 mt-0.5 space-y-0.5">
            {STAFF_HIDDEN.map(t => <li key={t}>{t}</li>)}
          </ul>
          <p className="mt-1 text-ink-muted">ข้อมูลจะรีเซ็ตเมื่อรีเฟรชหน้า</p>
        </div>
      )}
      <div
        role="status"
        className="flex items-center gap-2 rounded-full bg-brand-600 text-white shadow-lg pl-3 pr-1.5 py-1.5 text-xs sm:text-sm font-semibold"
      >
        <FlaskConical size={16} className="shrink-0" aria-hidden="true" />
        {noticeOpen && <span className="leading-snug hidden sm:inline">โหมดทดลอง</span>}
        <div role="group" aria-label="สลับบทบาทผู้ใช้ (เดโม)" className="flex rounded-full bg-white/20 p-0.5">
          {Object.entries(ROLES).map(([key, r]) => (
            <button
              key={key}
              type="button"
              disabled={busy}
              aria-pressed={role === key}
              onClick={() => switchTo(key)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${role === key ? 'bg-white text-brand-700' : 'text-white hover:bg-white/20'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setHintOpen(v => !v)}
          aria-label="ดูความแตกต่างของสิทธิ์"
          aria-expanded={hintOpen}
          className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
        >
          <Info size={15} />
        </button>
        {noticeOpen && (
          <button
            type="button"
            onClick={() => setNoticeOpen(false)}
            aria-label="ซ่อนข้อความโหมดทดลอง"
            className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
