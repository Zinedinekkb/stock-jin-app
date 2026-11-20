import { test, before, after, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp } from 'firebase/firestore';

let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'stockpro-rules-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
after(async () => { await env?.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/admin1'), { role: 'admin', status: 'approved', name: 'A' });
    await setDoc(doc(db, 'users/staff1'), { role: 'staff', status: 'approved', name: 'S' });
    await setDoc(doc(db, 'users/pending1'), { role: 'staff', status: 'pending', name: 'P' });
    await setDoc(doc(db, 'products/p1'), { name: 'x', stock: 1 });
  });
});

const as = (uid) => env.authenticatedContext(uid).firestore();
const anon = () => env.unauthenticatedContext().firestore();

test('first user creates setup + admin doc in one batch: allowed', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    // fresh install: no users at all
    await deleteDoc(doc(ctx.firestore(), 'users/admin1'));
  });
  const db = as('first');
  const b = writeBatch(db);
  b.set(doc(db, 'settings/setup'), { adminUid: 'first', createdAt: serverTimestamp() });
  b.set(doc(db, 'users/first'), { role: 'admin', status: 'approved', name: 'F' });
  await assertSucceeds(b.commit());
});

test('second user creates admin doc while setup exists: denied', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'settings/setup'), { adminUid: 'admin1' });
  });
  const db = as('second');
  const b = writeBatch(db);
  b.set(doc(db, 'settings/setup'), { adminUid: 'second' });
  b.set(doc(db, 'users/second'), { role: 'admin', status: 'approved' });
  await assertFails(b.commit());
  await assertFails(setDoc(doc(db, 'users/second'), { role: 'admin', status: 'approved' }));
});

test('admin doc without setup, or setup naming another uid: denied', async () => {
  const db = as('sneaky');
  await assertFails(setDoc(doc(db, 'users/sneaky'), { role: 'admin', status: 'approved' }));
  const b = writeBatch(db);
  b.set(doc(db, 'settings/setup'), { adminUid: 'someone-else' });
  b.set(doc(db, 'users/sneaky'), { role: 'admin', status: 'approved' });
  await assertFails(b.commit());
});

test('new user may self-register as staff/pending only', async () => {
  const db = as('new1');
  await assertFails(setDoc(doc(db, 'users/new1'), { role: 'staff', status: 'approved' }));
  await assertSucceeds(setDoc(doc(db, 'users/new1'), { role: 'staff', status: 'pending', name: 'N' }));
  await assertFails(setDoc(doc(as('new2'), 'users/other'), { role: 'staff', status: 'pending' }));
});

test('settings/setup cannot be updated or deleted, even by admin', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'settings/setup'), { adminUid: 'admin1' });
  });
  await assertFails(updateDoc(doc(as('admin1'), 'settings/setup'), { adminUid: 'staff1' }));
  await assertFails(deleteDoc(doc(as('admin1'), 'settings/setup')));
});

test('staff updating own role: denied; own themeMode / profile: allowed', async () => {
  const ref = doc(as('staff1'), 'users/staff1');
  await assertFails(updateDoc(ref, { role: 'admin' }));
  await assertFails(updateDoc(ref, { status: 'approved', position: 'boss' }));
  await assertSucceeds(updateDoc(ref, { themeMode: 'dark' }));
  await assertSucceeds(updateDoc(ref, { name: 'New', nickname: 'n', department: 'd', phone: '1' }));
  await assertSucceeds(updateDoc(ref, { pushEnabledAt: serverTimestamp() }));
});

test('pending user cannot self-approve; staff cannot edit others', async () => {
  await assertFails(updateDoc(doc(as('pending1'), 'users/pending1'), { status: 'approved' }));
  await assertFails(updateDoc(doc(as('staff1'), 'users/pending1'), { status: 'approved' }));
});

test('admin can approve users, change roles, and delete users', async () => {
  const db = as('admin1');
  await assertSucceeds(updateDoc(doc(db, 'users/pending1'), { status: 'approved', role: 'staff' }));
  await assertSucceeds(deleteDoc(doc(db, 'users/pending1')));
});

test('staff writes settings/branding: denied; admin: allowed; signed-in read ok', async () => {
  await assertFails(setDoc(doc(as('staff1'), 'settings/branding'), { appName: 'X' }, { merge: true }));
  await assertSucceeds(setDoc(doc(as('admin1'), 'settings/branding'), { appName: 'X' }, { merge: true }));
  await assertSucceeds(getDoc(doc(as('staff1'), 'settings/branding')));
  await assertFails(getDoc(doc(anon(), 'settings/branding')));
});

test('pending user cannot read products; approved can', async () => {
  await assertFails(getDoc(doc(as('pending1'), 'products/p1')));
  await assertSucceeds(getDoc(doc(as('staff1'), 'products/p1')));
  await assertFails(getDoc(doc(anon(), 'products/p1')));
});

test('approved staff may write day-to-day data but only admin may delete', async () => {
  const s = as('staff1');
  await assertSucceeds(setDoc(doc(s, 'transactions/t1'), { status: 'pending' }));
  await assertSucceeds(updateDoc(doc(s, 'products/p1'), { stock: 5 }));
  await assertFails(deleteDoc(doc(s, 'products/p1')));
  await assertSucceeds(deleteDoc(doc(as('admin1'), 'products/p1')));
  await assertFails(setDoc(doc(as('pending1'), 'tasks/x'), { title: 't' }));
});

test('users: approved reads directory; pending reads only self', async () => {
  await assertSucceeds(getDoc(doc(as('staff1'), 'users/admin1')));
  await assertSucceeds(getDoc(doc(as('pending1'), 'users/pending1')));
  await assertFails(getDoc(doc(as('pending1'), 'users/admin1')));
});

test('daily_reports: admin read only, nobody writes; unknown collections denied', async () => {
  await assertSucceeds(getDoc(doc(as('admin1'), 'daily_reports/d1')));
  await assertFails(getDoc(doc(as('staff1'), 'daily_reports/d1')));
  await assertFails(setDoc(doc(as('admin1'), 'daily_reports/d1'), { a: 1 }));
  await assertFails(setDoc(doc(as('admin1'), 'mystery/m1'), { a: 1 }));
});
