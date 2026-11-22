// Demo-only survey intake. Validates the answers and logs one JSON line per response
// (visible in the host's runtime logs). Wire a durable store here (Blob/DB/Sheet) before relying on it.
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const int = (v, min, max) => Number.isInteger(v) && v >= min && v <= max

export async function POST(request) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
    return NextResponse.json({ ok: false, error: 'not_available' }, { status: 404 })
  }
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 })
  }

  const sus = body?.sus
  if (!Array.isArray(sus) || sus.length !== 10 || !sus.every(v => int(v, 1, 5)) || !int(body?.satisfaction, 1, 5)) {
    return NextResponse.json({ ok: false, error: 'invalid' }, { status: 400 })
  }
  const clean = {
    sus,
    susScore: sus.reduce((s, v, i) => s + (i % 2 === 0 ? v - 1 : 5 - v), 0) * 2.5,
    satisfaction: body.satisfaction,
    occupation: String(body.occupation || '').slice(0, 40),
    roleTried: Array.isArray(body.roleTried) ? body.roleTried.map(r => String(r).slice(0, 20)).slice(0, 10) : [],
    comment: String(body.comment || '').slice(0, 1000),
    at: new Date().toISOString(),
  }
  console.log('[demo-survey]', JSON.stringify(clean))
  return NextResponse.json({ ok: true })
}
