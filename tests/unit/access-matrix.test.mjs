import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACCESS_MATRIX, ACCESS_GROUPS, ACCESS_GROUP_LABELS, canAccess, getUserAccessGroup, canAccessTab,
  canSeeDocument, canSeeLeave, filterVisibleDocuments, filterVisibleLeaves,
} from '../../app/config/accessMatrix.js';

const u = (position, role = 'staff') => ({ uid: 'u1', name: 'สมชาย ใจดี', role, position });

const SAMPLE = {
  admin: u('ผู้ดูแลระบบ', 'admin'),
  warehouse: u('เจ้าหน้าที่สต็อก'),
  kitchen: u('เชฟ'),
  finance: u('แคชเชียร์'),
  service: u('พนักงานเสิร์ฟ'),
  shipping: u('พนักงานจัดส่ง'),
  general: u('พนักงานทั่วไป'),
};

const EXPECTED = {
  dashboard:     { admin: 1, warehouse: 1, kitchen: 1, finance: 1, service: 1, shipping: 1, general: 1 },
  stockView:     { admin: 1, warehouse: 1, kitchen: 1, finance: 1, service: 1, shipping: 1, general: 1 },
  txCreate:      { admin: 1, warehouse: 1, kitchen: 1, finance: 1, service: 0, shipping: 1, general: 0 },
  txHistory:     { admin: 1, warehouse: 1, kitchen: 0, finance: 1, service: 0, shipping: 1, general: 0 },
  txVerify:      { admin: 1, warehouse: 1, kitchen: 0, finance: 0, service: 0, shipping: 0, general: 0 },
  documents:     { admin: 1, warehouse: 1, kitchen: 1, finance: 1, service: 1, shipping: 1, general: 1 },
  hr:            { admin: 1, warehouse: 1, kitchen: 1, finance: 1, service: 1, shipping: 1, general: 1 },
  notifications: { admin: 1, warehouse: 1, kitchen: 1, finance: 1, service: 1, shipping: 1, general: 1 },
};

test('group detection', () => {
  for (const [group, user] of Object.entries(SAMPLE)) assert.equal(getUserAccessGroup(user), group);
});

test('every group x feature', () => {
  assert.deepEqual(Object.keys(EXPECTED).sort(), Object.keys(ACCESS_MATRIX).sort());
  for (const [feature, row] of Object.entries(EXPECTED)) {
    for (const [group, user] of Object.entries(SAMPLE)) {
      assert.equal(canAccess(user, feature), Boolean(row[group]), `${group} / ${feature}`);
    }
  }
});

test('admin by position (ผู้จัดการ) with role staff', () => {
  const m = u('ผู้จัดการร้าน');
  assert.equal(getUserAccessGroup(m), 'admin');
  assert.ok(canAccess(m, 'txHistory'));
  assert.ok(canSeeDocument(m, { createdByUid: 'other' }));
});

test('unknown / missing position -> general', () => {
  assert.equal(getUserAccessGroup(u('นักบินอวกาศ')), 'general');
  assert.equal(getUserAccessGroup(u('')), 'general');
  assert.equal(getUserAccessGroup({ role: 'staff' }), 'general');
  assert.equal(getUserAccessGroup(null), 'general');
  assert.equal(getUserAccessGroup(u('หัวหน้า')), 'general');
  assert.equal(canAccess(null, 'dashboard'), false);
  assert.equal(canAccess(SAMPLE.admin, 'nope'), false);
});

test('groups and labels consistent', () => {
  for (const g of ACCESS_GROUPS) assert.ok(ACCESS_GROUP_LABELS[g]);
  for (const row of Object.values(ACCESS_MATRIX)) for (const g of row.groups) assert.ok(ACCESS_GROUPS.includes(g));
});

test('canAccessTab', () => {
  assert.equal(canAccessTab(SAMPLE.general, 'transaction'), false);
  assert.equal(canAccessTab(SAMPLE.general, 'menu'), true);
  assert.equal(canAccessTab(SAMPLE.finance, 'status'), true);
});

test('documents: own only, legacy fallback, transaction docs for finance/warehouse', () => {
  const me = SAMPLE.general;
  const mine = { id: 1, createdByUid: 'u1' };
  const legacy = { id: 2, createdBy: 'สมชาย ใจดี' };
  const assigned = { id: 3, createdByUid: 'x', assignedTo: 'u1' };
  const other = { id: 4, createdByUid: 'x', createdBy: 'สมชาย ใจดี' };
  const txDoc = { id: 5, createdByUid: 'x', category: 'order', transactionId: 't1' };
  assert.deepEqual(filterVisibleDocuments(me, [mine, legacy, assigned, other, txDoc]).map(d => d.id), [1, 2, 3]);
  assert.ok(canSeeDocument(SAMPLE.finance, txDoc));
  assert.ok(canSeeDocument(SAMPLE.warehouse, txDoc));
  assert.ok(!canSeeDocument(SAMPLE.shipping, txDoc));
  assert.ok(!canSeeDocument(SAMPLE.finance, { createdByUid: 'x', category: 'leave' }));
  assert.equal(filterVisibleDocuments(SAMPLE.admin, [mine, other, txDoc]).length, 3);
});

test('leaves: own only', () => {
  const me = SAMPLE.kitchen;
  const mine = { id: 1, userId: 'u1' };
  const mine2 = { id: 2, createdByUid: 'u1', userId: 'u1' };
  const legacy = { id: 3, userName: 'สมชาย ใจดี' };
  const other = { id: 4, userId: 'x', userName: 'สมชาย ใจดี' };
  assert.deepEqual(filterVisibleLeaves(me, [mine, mine2, legacy, other]).map(l => l.id), [1, 2, 3]);
  assert.equal(filterVisibleLeaves(SAMPLE.admin, [mine, other]).length, 2);
});
