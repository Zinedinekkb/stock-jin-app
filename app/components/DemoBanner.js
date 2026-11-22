'use client'
// Shown only in the demo build (NEXT_PUBLIC_DEMO_MODE=true).
// Floating pill with a role switcher (admin + 6 position groups). The switcher stays visible even after the
// notice text is dismissed. Switching writes role + position on the signed-in demo user's doc in the
// in-memory store, so the app's own users/{uid} listener re-renders the whole UI with no reload.
import { useEffect, useState } from 'react'
import { X, FlaskConical, Info, Check, Minus, ClipboardList } from 'lucide-react'
import { trackDemoView, trackDemoEvent } from '@/lib/demo/analytics'
import DemoSurvey from './DemoSurvey'
import {
  ACCESS_MATRIX, ACCESS_GROUPS, ACCESS_GROUP_LABELS, TRANSACTION_DOC_GROUPS, getUserAccessGroup,
} from '@/app/config/accessMatrix'

const DEMO_UID = 'demo-admin'
// role + position written onto users/demo-admin. Positions match the POSITION_CLUSTERS keywords, so the
// app's own getUserAccessGroup() resolves each one to the intended access group.
const ROLES = {
  admin: { label: 'แอดมิน', patch: { role: 'admin', position: 'ผู้ดูแลระบบ' } },
  warehouse: { label: 'คลัง/สต็อก', patch: { role: 'staff', position: 'เจ้าหน้าที่สต็อก' } },
  kitchen: { label: 'ครัว', patch: { role: 'staff', position: 'เชฟ' } },
  finance: { label: 'การเงิน', patch: { role: 'staff', position: 'แคชเชียร์' } },
  service: { label: 'หน้าร้าน', patch: { role: 'staff', position: 'พนักงานเสิร์ฟ' } },
  shipping: { label: 'จัดส่ง', patch: { role: 'staff', position: 'พนักงานจัดส่ง' } },
  general: { label: 'พนักงานทั่วไป', patch: { role: 'staff', position: 'พนักงานทั่วไป' } },
}

// Rows of the info table are generated from ACCESS_MATRIX (plus data scope rules from the same module)
const SCOPE_ROWS = [
  { label: 'ขอบเขตเอกสาร', cell: (g) => g === 'admin' ? 'ทั้งหมด' : TRANSACTION_DOC_GROUPS.includes(g) ? 'ของตน + เบิก/รับ' : 'ของตน' },
  { label: 'ขอบเขตใบลา', cell: (g) => g === 'admin' ? 'ทั้งหมด' : 'ของตน' },
]
const ADMIN_ONLY = 'เฉพาะแอดมิน: จัดการบัญชีผู้ใช้, ตั้งค่าร้าน, แก้ไข/เพิ่ม/ลบสินค้า, จัดการหมวดหมู่, อนุมัติ/ยกเลิก/แก้ไขรายการเบิก-รับ, ส่งรายงาน LINE, อนุมัติลา/ผู้ใช้'

export default function DemoBanner() {
  const [noticeOpen, setNoticeOpen] = useState(true)
  const [hintOpen, setHintOpen] = useState(false)
  const [role, setRole] = useState('admin')
  const [busy, setBusy] = useState(false)
  const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
  const surveyUrl = process.env.NEXT_PUBLIC_SURVEY_URL
  const [surveyOpen, setSurveyOpen] = useState(false)
  const [visited, setVisited] = useState(['admin'])

  // Follow the demo user's doc so the control reflects the real current role
  useEffect(() => {
    if (!isDemo) return
    let unsub = () => {}
    let cancelled = false
    ;(async () => {
      const [{ db }, { doc, onSnapshot }] = await Promise.all([import('@/lib/firebase'), import('firebase/firestore')])
      if (cancelled) return
      unsub = onSnapshot(doc(db, 'users', DEMO_UID), (snap) => {
        if (snap.exists()) setRole(getUserAccessGroup(snap.data()))
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
      setVisited(v => (v.includes(key) ? v : [...v, key]))
      trackDemoView(`/role/${key}`)
      trackDemoEvent('role_switch', { role: key })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
    {surveyOpen && <DemoSurvey roleTried={visited} onClose={() => setSurveyOpen(false)} />}
    <div className="demo-banner fixed left-1/2 -translate-x-1/2 bottom-24 md:bottom-4 z-[60] max-w-[calc(100vw-1.5rem)] flex flex-col items-center gap-2">
      {hintOpen && (
        <div role="note" className="w-[min(34rem,calc(100vw-1.5rem))] rounded-2xl bg-white text-ink shadow-lg border border-brand-200 p-3 text-xs leading-relaxed">
          <p className="font-bold mb-1.5">ตอนนี้ดูในฐานะ: {ROLES[role]?.label}</p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[11px] text-center">
              <thead>
                <tr>
                  <th className="text-left font-semibold pb-1 pr-2">ฟีเจอร์</th>
                  {ACCESS_GROUPS.map(g => (
                    <th key={g} className={`px-1 pb-1 font-semibold ${g === role ? 'bg-brand-100 text-brand-700 rounded-t-md' : ''}`}>{ACCESS_GROUP_LABELS[g]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(ACCESS_MATRIX).map(([key, row]) => (
                  <tr key={key} className="border-t border-gray-100">
                    <td className="text-left py-1 pr-2">{row.label}</td>
                    {ACCESS_GROUPS.map(g => (
                      <td key={g} className={`px-1 ${g === role ? 'bg-brand-50' : ''}`}>
                        {g === 'admin' || row.groups.includes(g)
                          ? <Check size={13} className="inline text-success-600" aria-label="ทำได้" />
                          : <Minus size={13} className="inline text-gray-300" aria-label="ทำไม่ได้" />}
                      </td>
                    ))}
                  </tr>
                ))}
                {SCOPE_ROWS.map(r => (
                  <tr key={r.label} className="border-t border-gray-100">
                    <td className="text-left py-1 pr-2">{r.label}</td>
                    {ACCESS_GROUPS.map(g => (
                      <td key={g} className={`px-1 leading-tight ${g === role ? 'bg-brand-50 font-semibold' : ''}`}>{r.cell(g)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-1.5 text-ink-muted">{ADMIN_ONLY}</p>
          <p className="mt-1 text-ink-muted">ข้อมูลจะรีเซ็ตเมื่อรีเฟรชหน้า</p>
        </div>
      )}
      <div
        role="status"
        className="flex items-center gap-2 rounded-full bg-brand-600 text-white shadow-lg pl-3 pr-1.5 py-1.5 text-xs sm:text-sm font-semibold"
      >
        <FlaskConical size={16} className="shrink-0" aria-hidden="true" />
        {noticeOpen && <span className="leading-snug hidden sm:inline">โหมดทดลอง</span>}
        <select
          aria-label="สลับบทบาทผู้ใช้ (เดโม)"
          value={role}
          disabled={busy}
          onChange={(e) => switchTo(e.target.value)}
          className="rounded-full bg-white text-brand-700 text-xs font-bold pl-3 pr-2 py-1.5 outline-none cursor-pointer"
        >
          {Object.entries(ROLES).map(([key, r]) => (
            <option key={key} value={key}>{r.label}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setHintOpen(v => !v)}
          aria-label="ดูความแตกต่างของสิทธิ์"
          aria-expanded={hintOpen}
          className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
        >
          <Info size={15} />
        </button>
        {surveyUrl ? (
          <a
            href={surveyUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackDemoEvent('survey_click')}
            className="shrink-0 rounded-full bg-white/15 hover:bg-white/25 transition-colors px-2.5 py-1.5 text-xs font-bold flex items-center gap-1"
          >
            <ClipboardList size={14} aria-hidden="true" />
            <span>ทำแบบสอบถาม</span>
          </a>
        ) : (
          <button
            type="button"
            onClick={() => { setSurveyOpen(true); trackDemoEvent('survey_click') }}
            className="shrink-0 rounded-full bg-white/15 hover:bg-white/25 transition-colors px-2.5 py-1.5 text-xs font-bold flex items-center gap-1"
          >
            <ClipboardList size={14} aria-hidden="true" />
            <span>ทำแบบสอบถาม</span>
          </button>
        )}
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
    </>
  )
}
