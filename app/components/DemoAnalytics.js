'use client'
// Demo build only: loads Vercel Web Analytics. Auto page tracking is off because the app is one route;
// tab views / role switches are reported manually via lib/demo/analytics.js.
import { Analytics } from '@vercel/analytics/next'

export default function DemoAnalytics() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') return null
  return <Analytics disableAutoTrack />
}
