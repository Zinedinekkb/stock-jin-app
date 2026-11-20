'use client'
// Shown only in the demo build (NEXT_PUBLIC_DEMO_MODE=true). Floating pill, dismissible.
import { useState } from 'react'
import { X, FlaskConical } from 'lucide-react'

export default function DemoBanner() {
  const [open, setOpen] = useState(true)
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true' || !open) return null
  return (
    <div
      role="status"
      className="fixed left-1/2 -translate-x-1/2 bottom-24 md:bottom-4 z-[60] max-w-[calc(100vw-1.5rem)] flex items-center gap-2 rounded-full bg-brand-600 text-white shadow-lg pl-3 pr-1.5 py-1.5 text-xs sm:text-sm font-semibold"
    >
      <FlaskConical size={16} className="shrink-0" aria-hidden="true" />
      <span className="leading-snug">โหมดทดลอง — ข้อมูลจะรีเซ็ตเมื่อรีเฟรชหน้า</span>
      <button
        type="button"
        onClick={() => setOpen(false)}
        aria-label="ปิดแถบแจ้งเตือน"
        className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  )
}
