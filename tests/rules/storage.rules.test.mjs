import { test, before, after, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getBytes } from 'firebase/storage';

let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'stockpro-rules-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
    storage: { rules: readFileSync('storage.rules', 'utf8'), host: '127.0.0.1', port: 9199 },
  });
});
after(async () => { await env?.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/admin1'), { role: 'admin', status: 'approved' });
    await setDoc(doc(db, 'users/staff1'), { role: 'staff', status: 'approved' });
    await setDoc(doc(db, 'users/pending1'), { role: 'staff', status: 'pending' });
  });
});

const st = (uid) => env.authenticatedContext(uid).storage();
const bytes = (n) => new Uint8Array(n);
const MB = 1024 * 1024;

test('staff uploads branding logo: denied', async () => {
  await assertFails(uploadBytes(ref(st('staff1'), 'branding/logo-1.png'), bytes(100), { contentType: 'image/png' }));
});

test('admin uploads 1 MB png: allowed', async () => {
  await assertSucceeds(uploadBytes(ref(st('admin1'), 'branding/logo-1.png'), bytes(MB), { contentType: 'image/png' }));
});

test('admin uploads 3 MB png: denied', async () => {
  await assertFails(uploadBytes(ref(st('admin1'), 'branding/logo-2.png'), bytes(3 * MB), { contentType: 'image/png' }));
});

test('admin uploads image/gif: denied', async () => {
  await assertFails(uploadBytes(ref(st('admin1'), 'branding/logo-3.gif'), bytes(100), { contentType: 'image/gif' }));
});

test('branding logo is publicly readable', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await uploadBytes(ref(ctx.storage(), 'branding/logo-9.png'), bytes(10), { contentType: 'image/png' });
  });
  await assertSucceeds(getBytes(ref(env.unauthenticatedContext().storage(), 'branding/logo-9.png')));
});

test('documents/**: approved users write, pending and anonymous denied', async () => {
  const pdf = { contentType: 'application/pdf' };
  await assertSucceeds(uploadBytes(ref(st('staff1'), 'documents/transactions/a.pdf'), bytes(10), pdf));
  await assertFails(uploadBytes(ref(st('pending1'), 'documents/transactions/b.pdf'), bytes(10), pdf));
  await assertFails(uploadBytes(ref(env.unauthenticatedContext().storage(), 'documents/leaves/c.pdf'), bytes(10), pdf));
});

test('everything else is denied', async () => {
  await assertFails(uploadBytes(ref(st('admin1'), 'other/x.png'), bytes(10), { contentType: 'image/png' }));
});
