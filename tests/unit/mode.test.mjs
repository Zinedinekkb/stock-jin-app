import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeMode, resolveDark } from '../../lib/theme/mode.js'

test('normalizeMode', () => {
  assert.equal(normalizeMode('dark'), 'dark')
  assert.equal(normalizeMode('light'), 'light')
  assert.equal(normalizeMode('system'), 'system')
  assert.equal(normalizeMode('blue'), 'system')
  assert.equal(normalizeMode(undefined), 'system')
  assert.equal(normalizeMode(null), 'system')
})

test('resolveDark', () => {
  assert.equal(resolveDark('system', true), true)
  assert.equal(resolveDark('system', false), false)
  assert.equal(resolveDark('light', true), false)
  assert.equal(resolveDark('dark', false), true)
  assert.equal(resolveDark('garbage', true), true)
})
