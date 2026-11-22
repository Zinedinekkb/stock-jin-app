import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { getBrandingServer } from '../../../../../lib/branding/server.js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SIZES = {
  '192': { px: 192, file: 'icon-192.png', pad: 0 },
  '512': { px: 512, file: 'icon-512.png', pad: 0 },
  '180': { px: 180, file: 'apple-touch-icon.png', pad: 0 },
  'maskable-512': { px: 512, file: 'icon-maskable-512.png', pad: 0.1 },
}

const HEADERS = { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=300' }

async function fallback(file) {
  const buf = await readFile(path.join(process.cwd(), 'public', 'icons', file))
  return new Response(buf, { status: 200, headers: HEADERS })
}

export async function GET(_request, { params }) {
  const { size } = await params
  const spec = SIZES[size]
  if (!spec) return new Response('Not found', { status: 404 })

  try {
    const { logoUrl } = await getBrandingServer()
    if (!logoUrl) return await fallback(spec.file)

    const res = await fetch(logoUrl)
    if (!res.ok) return await fallback(spec.file)
    const input = Buffer.from(await res.arrayBuffer())

    const { default: sharp } = await import('sharp')
    const inner = Math.round(spec.px * (1 - spec.pad * 2))
    const logo = await sharp(input)
      .resize(inner, inner, { fit: 'contain', background: '#ffffff' })
      .flatten({ background: '#ffffff' })
      .toBuffer()
    const out = await sharp({
      create: { width: spec.px, height: spec.px, channels: 3, background: '#ffffff' },
    })
      .composite([{ input: logo, gravity: 'center' }])
      .png()
      .toBuffer()
    return new Response(out, { status: 200, headers: HEADERS })
  } catch {
    try {
      return await fallback(spec.file)
    } catch {
      return new Response('Not found', { status: 404 })
    }
  }
}
