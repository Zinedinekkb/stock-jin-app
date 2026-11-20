import test from 'node:test';
import assert from 'node:assert/strict';
import { integrationStatus, appUrl } from '../../lib/integrations.js';

test('integrationStatus: empty env is all false', () => {
  assert.deepEqual(integrationStatus({}), { line: false, email: false, push: false });
});
test('integrationStatus: line via either token var', () => {
  assert.equal(integrationStatus({ LINE_ACCESS_TOKEN: 'x' }).line, true);
  assert.equal(integrationStatus({ LINE_CHANNEL_ACCESS_TOKEN: 'x' }).line, true);
});
test('integrationStatus: email needs user and pass', () => {
  assert.equal(integrationStatus({ EMAIL_USER: 'a' }).email, false);
  assert.equal(integrationStatus({ EMAIL_USER: 'a', EMAIL_PASS: 'b' }).email, true);
});
test('integrationStatus: push needs vapid and service account', () => {
  assert.equal(integrationStatus({ NEXT_PUBLIC_FIREBASE_VAPID_KEY: 'k' }).push, false);
  assert.equal(integrationStatus({ NEXT_PUBLIC_FIREBASE_VAPID_KEY: 'k', FIREBASE_SERVICE_ACCOUNT: '{}' }).push, true);
});
test('appUrl: falls back to request origin', () => {
  assert.equal(appUrl(new Request('https://a.example/x'), {}), 'https://a.example');
});
test('appUrl: env wins, trailing slash stripped', () => {
  assert.equal(appUrl(new Request('https://a.example/x'), { NEXT_PUBLIC_APP_URL: 'https://shop.example/' }), 'https://shop.example');
});
test('appUrl: empty with nothing', () => {
  assert.equal(appUrl(undefined, {}), '');
});
