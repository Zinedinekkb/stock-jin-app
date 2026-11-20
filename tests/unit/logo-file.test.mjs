import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateLogoFile, logoStoragePath } from '../../lib/branding/logoFile.js'

test('rejects gif', () => {
  assert.deepEqual(validateLogoFile({ type: 'image/gif', size: 10 }), { ok: false, error: 'รองรับเฉพาะไฟล์ PNG, JPG หรือ WEBP' })
})
test('rejects over 2MB', () => {
  assert.deepEqual(validateLogoFile({ type: 'image/png', size: 2 * 1024 * 1024 + 1 }), { ok: false, error: 'ไฟล์ใหญ่เกิน 2 MB' })
})
test('accepts exactly 2MB and webp', () => {
  assert.deepEqual(validateLogoFile({ type: 'image/png', size: 2 * 1024 * 1024 }), { ok: true })
  assert.deepEqual(validateLogoFile({ type: 'image/webp', size: 100 }), { ok: true })
})
test('rejects missing file', () => {
  assert.equal(validateLogoFile(null).ok, false)
})
test('storage path', () => {
  assert.equal(logoStoragePath({ type: 'image/jpeg' }, 5), 'branding/logo-5.jpg')
  assert.equal(logoStoragePath({ type: 'image/png' }, 7), 'branding/logo-7.png')
  assert.equal(logoStoragePath({ type: 'image/webp' }, 9), 'branding/logo-9.webp')
})
