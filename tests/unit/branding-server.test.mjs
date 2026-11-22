import test from 'node:test';
import assert from 'node:assert/strict';
import { getBrandingServer, _resetBrandingCache } from '../../lib/branding/server.js';
import { DEFAULT_BRANDING } from '../../lib/branding/defaults.js';

const fakeDb = (impl) => ({ collection: () => ({ doc: () => ({ get: impl }) }) });

test('no db -> defaults', async () => {
  _resetBrandingCache();
  assert.deepEqual(await getBrandingServer({ getDb: () => null }), DEFAULT_BRANDING);
});

test('reads doc and sanitizes', async () => {
  _resetBrandingCache();
  const b = await getBrandingServer({
    getDb: () => fakeDb(async () => ({ exists: true, data: () => ({ appName: 'ร้านA' }) })),
  });
  assert.equal(b.appName, 'ร้านA');
  assert.equal(b.primaryColor, DEFAULT_BRANDING.primaryColor);
  assert.equal(b.shortName, DEFAULT_BRANDING.shortName);
});

test('throwing db -> defaults', async () => {
  _resetBrandingCache();
  const b = await getBrandingServer({
    getDb: () => fakeDb(async () => { throw new Error('boom'); }),
  });
  assert.deepEqual(b, DEFAULT_BRANDING);
});

test('missing doc -> defaults', async () => {
  _resetBrandingCache();
  const b = await getBrandingServer({ getDb: () => fakeDb(async () => ({ exists: false })) });
  assert.deepEqual(b, DEFAULT_BRANDING);
});
