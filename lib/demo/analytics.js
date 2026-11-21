// Anonymous usage stats for the public demo build only (NEXT_PUBLIC_DEMO_MODE=true). No-ops otherwise.
// Tab views and role switches are sent as virtual page views so they show in Vercel Web Analytics
// "Pages" on the free plan; track() custom events additionally need a Pro plan (ignored if unavailable).
const isDemo = () => process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

export async function trackDemoView(path) {
  if (!isDemo() || typeof window === 'undefined') return
  try {
    const { pageview } = await import('@vercel/analytics')
    pageview({ route: path, path })
  } catch {}
}

export async function trackDemoEvent(name, props) {
  if (!isDemo() || typeof window === 'undefined') return
  try {
    const { track } = await import('@vercel/analytics')
    track(name, props)
  } catch {}
}
