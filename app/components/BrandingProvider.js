'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '../../lib/firebase'
import { DEFAULT_BRANDING } from '../../lib/branding/defaults'
import { sanitizeBranding } from '../../lib/branding/sanitize'
import { buildBrandPalette, paletteToCssVars } from '../../lib/theme/palette'

const BrandingContext = createContext(DEFAULT_BRANDING)

export function useBranding() {
  return useContext(BrandingContext)
}

function readCache() {
  try {
    const raw = localStorage.getItem('app.brandingCache')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && parsed.branding ? sanitizeBranding(parsed.branding) : null
  } catch {
    return null
  }
}

function applyBranding(branding) {
  const cssVars = paletteToCssVars(buildBrandPalette(branding.primaryColor))
  const root = document.documentElement
  for (const [k, v] of Object.entries(cssVars)) root.style.setProperty(k, v)
  document.title = branding.appName
  try {
    localStorage.setItem('app.brandingCache', JSON.stringify({ branding, cssVars }))
  } catch {}
}

export default function BrandingProvider({ children }) {
  // Start from defaults on both server and first client render to avoid hydration mismatch.
  const [branding, setBranding] = useState(DEFAULT_BRANDING)

  useEffect(() => {
    const cached = readCache()
    if (cached) setBranding(cached)

    let unsubDoc = null
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubDoc) { unsubDoc(); unsubDoc = null }
      if (!user) return
      unsubDoc = onSnapshot(
        doc(db, 'settings', 'branding'),
        (snap) => {
          const next = sanitizeBranding(snap.exists() ? snap.data() : null)
          setBranding(next)
          applyBranding(next)
        },
        (err) => console.warn('branding snapshot failed', err)
      )
    })
    return () => {
      unsubAuth()
      if (unsubDoc) unsubDoc()
    }
  }, [])

  return <BrandingContext.Provider value={branding}>{children}</BrandingContext.Provider>
}
