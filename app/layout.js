// 1. บรรทัดนี้สำคัญที่สุด! ถ้าไม่มีบรรทัดนี้ สีจะไม่มาครับ
import './globals.css'
import { IBM_Plex_Sans_Thai } from 'next/font/google'

// Thai-first font so Thai and Latin text share one look (Inter had no Thai glyphs)
const plexThai = IBM_Plex_Sans_Thai({ subsets: ['thai', 'latin'], weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-thai' })

export const metadata = {
  title: 'StockPro — ระบบจัดการสต็อกและบุคลากร',
  description: 'ระบบจัดการคลังสินค้าและบุคลากรสำหรับทุกธุรกิจ',
}

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body className={`${plexThai.variable} ${plexThai.className}`}>{children}</body>
    </html>
  )
}