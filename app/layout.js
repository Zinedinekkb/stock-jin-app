// 1. บรรทัดนี้สำคัญที่สุด! ถ้าไม่มีบรรทัดนี้ สีจะไม่มาครับ
import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Stock Jin App',
  description: 'ระบบจัดการสต็อกร้านข้าวมันไก่',
}

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body className={inter.className}>{children}</body>
    </html>
  )
}