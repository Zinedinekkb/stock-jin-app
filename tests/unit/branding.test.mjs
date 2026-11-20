import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_BRANDING } from '../../lib/branding/defaults.js';
import { sanitizeBranding, displayShopName } from '../../lib/branding/sanitize.js';

test('sanitizeBranding(undefined) equals defaults', () => {
  assert.deepEqual(sanitizeBranding(undefined), DEFAULT_BRANDING);
  assert.deepEqual(sanitizeBranding(null), DEFAULT_BRANDING);
  assert.deepEqual(sanitizeBranding({}), DEFAULT_BRANDING);
});

test('invalid color falls back', () => {
  assert.equal(sanitizeBranding({ primaryColor: 'blue' }).primaryColor, '#6355d8');
});

test('non-https logoUrl cleared', () => {
  assert.equal(sanitizeBranding({ logoUrl: 'javascript:alert(1)' }).logoUrl, '');
  assert.equal(sanitizeBranding({ logoUrl: 'https://x.test/a.png' }).logoUrl, 'https://x.test/a.png');
});

test('length caps and trim', () => {
  assert.equal(sanitizeBranding({ appName: 'x'.repeat(100) }).appName.length, 40);
  assert.equal(sanitizeBranding({ tagline: 'y'.repeat(200) }).tagline.length, 80);
  assert.equal(sanitizeBranding({ shopAddress: 'z'.repeat(500) }).shopAddress.length, 200);
  assert.equal(sanitizeBranding({ appName: '  hi  ' }).appName, 'hi');
});

test('displayShopName', () => {
  assert.equal(displayShopName({ ...DEFAULT_BRANDING, shopName: '' }), 'StockPro');
  assert.equal(displayShopName({ ...DEFAULT_BRANDING, shopName: 'ร้านA' }), 'ร้านA');
});
