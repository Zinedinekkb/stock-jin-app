// Logo upload validation. Pure module: relative imports only.
export const MAX_LOGO_BYTES = 2 * 1024 * 1024
const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }

export function validateLogoFile(file) {
  if (!file || !EXT[file.type]) return { ok: false, error: 'รองรับเฉพาะไฟล์ PNG, JPG หรือ WEBP' }
  if (file.size > MAX_LOGO_BYTES) return { ok: false, error: 'ไฟล์ใหญ่เกิน 2 MB' }
  return { ok: true }
}

export function logoStoragePath(file, now = Date.now()) {
  return `branding/logo-${now}.${EXT[file.type] || 'png'}`
}
