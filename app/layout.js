// 1. บรรทัดนี้สำคัญที่สุด! ถ้าไม่มีบรรทัดนี้ สีจะไม่มาครับ
import './globals.css'
import { IBM_Plex_Sans_Thai } from 'next/font/google'

// Thai-first font so Thai and Latin text share one look (Inter had no Thai glyphs)
const plexThai = IBM_Plex_Sans_Thai({ subsets: ['thai', 'latin'], weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-thai' })

import BrandingProvider from './components/BrandingProvider'
import DemoBanner from './components/DemoBanner'
import DemoAnalytics from './components/DemoAnalytics'
import { getBrandingServer, tripletToHex } from '../lib/branding/server.js'
import { buildBrandPalette } from '../lib/theme/palette.js'

export async function generateMetadata() {
  const b = await getBrandingServer()
  return {
    title: `${b.appName} — ${b.tagline}`,
    description: 'ระบบจัดการคลังสินค้าและบุคลากรสำหรับทุกธุรกิจ',
    appleWebApp: {
      capable: true,
      title: b.shortName,
      statusBarStyle: 'default',
    },
    icons: {
      apple: '/api/brand/icon/180',
    },
  }
}

export async function generateViewport() {
  const b = await getBrandingServer()
  const brand500 = tripletToHex(buildBrandPalette(b.primaryColor)['500'])
  return {
    themeColor: [
      { media: '(prefers-color-scheme: light)', color: brand500 },
      { media: '(prefers-color-scheme: dark)', color: '#0b0b14' },
    ],
  }
}

// Runs synchronously before first paint: applies cached brand colors and dark mode.
const HEAD_SCRIPT = `(function(){try{
var c=JSON.parse(localStorage.getItem('app.brandingCache')||'null');
if(c&&c.cssVars){var r=document.documentElement;for(var k in c.cssVars){r.style.setProperty(k,c.cssVars[k]);}}
var m=localStorage.getItem('app.themeMode');
var d=m==='dark'||((m!=='light')&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);
if(d)document.documentElement.classList.add('dark');
}catch(e){}})();`

export default function RootLayout({ children }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: HEAD_SCRIPT }} />
      </head>
      <body className={`${plexThai.variable} ${plexThai.className}`}>
        <BrandingProvider>{children}</BrandingProvider>
        <DemoBanner />
        <DemoAnalytics />
      </body>
    </html>
  )
}
