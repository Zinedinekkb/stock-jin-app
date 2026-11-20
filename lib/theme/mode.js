// Pure theme-mode helpers. Relative imports only.
export const THEME_MODE_KEY = 'app.themeMode'
const MODES = ['light', 'dark', 'system']

export function normalizeMode(v) {
  return MODES.includes(v) ? v : 'system'
}

export function resolveDark(mode, prefersDark) {
  const m = normalizeMode(mode)
  if (m === 'dark') return true
  if (m === 'light') return false
  return !!prefersDark
}
