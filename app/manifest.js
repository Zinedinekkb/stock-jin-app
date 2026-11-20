// app/manifest.js
// Next.js serves this at /manifest.webmanifest and adds the <link rel="manifest"> tag automatically.
import { getBrandingServer, tripletToHex } from '../lib/branding/server.js'
import { buildBrandPalette } from '../lib/theme/palette.js'

export const dynamic = 'force-dynamic'

export default async function manifest() {
  const b = await getBrandingServer()
  const themeColor = tripletToHex(buildBrandPalette(b.primaryColor)['500'])
  return {
    name: b.appName,
    short_name: b.shortName,
    description: b.tagline,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f4f5fa',
    theme_color: themeColor,
    lang: 'th',
    dir: 'ltr',
    icons: [
      { src: '/api/brand/icon/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/api/brand/icon/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/api/brand/icon/maskable-512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
