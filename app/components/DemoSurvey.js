'use client'
// Demo-only usability questionnaire (SUS 10 items + satisfaction + comment). Anonymous; no personal data.
import { useState } from 'react'
import { X, Check } from 'lucide-react'
import { trackDemoEvent } from '@/lib/demo/analytics'

const SUS_ITEMS = [
  'ฉันคิดว่าฉันอยากใช้ระบบนี้บ่อยๆ',
  'ฉันรู้สึกว่าระบบนี้ซับซ้อนโดยไม่จำเป็น',
  'ฉันคิดว่าระบบนี้ใช้งานง่าย',
  'ฉันคิดว่าฉันต้องมีผู้เชี่ยวชาญคอยช่วยเพื่อจะใช้ระบบนี้ได้',
  'ฉันพบว่าฟังก์ชันต่างๆ ในระบบนี้ทำงานเชื่อมโยงกันได้ดี',
  'ฉันคิดว่าระบบนี้มีความไม่สอดคล้องกันมากเกินไป',
  'ฉันคิดว่าคนส่วนใหญ่จะเรียนรู้การใช้ระบบนี้ได้อย่างรวดเร็ว',
  'ฉันรู้สึกว่าระบบนี้ใช้งานยุ่งยากมาก',
  'ฉันรู้สึกมั่นใจเมื่อใช้ระบบนี้',
  'ฉันต้องเรียนรู้หลายอย่างก่อนจะเริ่มใช้ระบบนี้ได้',
]
const OCCUPATIONS = ['เจ้าของร้าน/ผู้บริหาร', 'พนักงานร้านอาหาร/คลังสินค้า', 'พนักงานออฟฟิศ', 'นักศึกษา', 'อื่นๆ']
const SCALE = ['ไม่เห็นด้วยอย่างยิ่ง', 'ไม่เห็นด้วย', 'เฉยๆ', 'เห็นด้วย', 'เห็นด้วยอย่างยิ่ง']

function Scale({ name, value, onChange }) {
  return (
    <div role="radiogroup" aria-label={name} className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} - ${SCALE[n - 1]}`}
          onClick={() => onChange(n)}
          className={`flex-1 h-10 rounded-xl text-sm font-bold border transition-colors ${
            value === n ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-gray-200 text-ink hover:border-brand-400'
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

export default function DemoSurvey({ onClose, roleTried }) {
  const [sus, setSus] = useState(Array(10).fill(0))
  const [satisfaction, setSatisfaction] = useState(0)
  const [occupation, setOccupation] = useState('')
  const [comment, setComment] = useState('')
  const [state, setState] = useState('idle') // idle | sending | done | error

  const answered = sus.filter(Boolean).length + (satisfaction ? 1 : 0)
  const ready = answered === 11 && occupation

  const submit = async (e) => {
    e.preventDefault()
    if (!ready || state === 'sending') return
    setState('sending')
    try {
      const res = await fetch('/api/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sus, satisfaction, occupation, comment, roleTried }),
      })
      if (!res.ok) throw new Error('failed')
      trackDemoEvent('survey_submit')
      setState('done')
    } catch {
      setState('error')
    }
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-label="แบบสอบถามหลังทดลองใช้">
      <div className="bg-white text-ink w-full sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl">
        <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h2 className="font-bold text-base">แบบสอบถามหลังทดลองใช้</h2>
          <button type="button" onClick={onClose} aria-label="ปิด" className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100"><X size={18} /></button>
        </div>

        {state === 'done' ? (
          <div className="p-8 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-success-100 text-success-600 flex items-center justify-center mb-3"><Check size={28} /></div>
            <p className="font-bold">ขอบคุณที่ตอบแบบสอบถาม</p>
            <p className="text-sm text-ink-muted mt-1">คำตอบถูกบันทึกแบบไม่ระบุตัวตน</p>
            <button type="button" onClick={onClose} className="mt-5 rounded-full bg-brand-600 text-white font-bold px-6 py-2.5">ปิด</button>
          </div>
        ) : (
          <form onSubmit={submit} className="p-5 space-y-5">
            <p className="text-xs text-ink-muted leading-relaxed">
              ตอบแบบไม่ระบุตัวตน ไม่เก็บชื่อหรืออีเมล ใช้เพื่อการวิจัยเท่านั้น (1 = ไม่เห็นด้วยอย่างยิ่ง, 5 = เห็นด้วยอย่างยิ่ง)
            </p>

            <fieldset>
              <legend className="text-sm font-semibold mb-1.5">คุณเป็นใคร</legend>
              <div className="flex flex-wrap gap-2">
                {OCCUPATIONS.map(o => (
                  <button key={o} type="button" onClick={() => setOccupation(o)} aria-pressed={occupation === o}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${occupation === o ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-gray-200 hover:border-brand-400'}`}>
                    {o}
                  </button>
                ))}
              </div>
            </fieldset>

            {SUS_ITEMS.map((text, i) => (
              <div key={i}>
                <p className="text-sm mb-1.5"><span className="font-bold text-brand-700">{i + 1}.</span> {text}</p>
                <Scale name={text} value={sus[i]} onChange={(v) => setSus(s => s.map((x, j) => (j === i ? v : x)))} />
              </div>
            ))}

            <div>
              <p className="text-sm mb-1.5 font-semibold">โดยรวมพึงพอใจกับระบบนี้เพียงใด</p>
              <Scale name="ความพึงพอใจโดยรวม" value={satisfaction} onChange={setSatisfaction} />
            </div>

            <div>
              <label htmlFor="survey-comment" className="text-sm font-semibold block mb-1.5">ข้อเสนอแนะ (ไม่บังคับ)</label>
              <textarea id="survey-comment" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} rows={3}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>

            {state === 'error' && <p role="alert" className="text-sm text-danger-600">ส่งไม่สำเร็จ ลองใหม่อีกครั้ง</p>}

            <div className="flex items-center justify-between gap-3 pt-1">
              <span className="text-xs text-ink-muted">ตอบแล้ว {answered}/11{occupation ? '' : ' · เลือกว่าคุณเป็นใคร'}</span>
              <button type="submit" disabled={!ready || state === 'sending'}
                className="rounded-full bg-brand-600 text-white font-bold px-6 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed">
                {state === 'sending' ? 'กำลังส่ง…' : 'ส่งแบบสอบถาม'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
