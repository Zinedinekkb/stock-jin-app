// 1. บรรทัดนี้สำคัญที่สุด! ถ้าไม่มีบรรทัดนี้ สีจะไม่มาครับ
import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'StockPro — ระบบจัดการสต็อกและบุคลากร',
  description: 'ระบบจัดการคลังสินค้าและบุคลากรสำหรับทุกธุรกิจ',
}

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body className={inter.className}>{children}</body>
    </html>
  )
}