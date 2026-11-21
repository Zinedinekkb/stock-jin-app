// lib/demo/firestoreShim.js
// In-memory stand-in for 'firebase/firestore', used only when NEXT_PUBLIC_DEMO_MODE=true
// (see next.config.ts). Data lives in module state and resets on every page reload.
import { buildSeed } from './seed.js';

// ---------- Timestamp ----------
export class Timestamp {
  constructor(seconds, nanoseconds = 0) {
    this.seconds = seconds;
    this.nanoseconds = nanoseconds;
  }
  static now() { return Timestamp.fromMillis(Date.now()); }
  static fromDate(d) { return Timestamp.fromMillis(d.getTime()); }
  static fromMillis(ms) {
    const seconds = Math.floor(ms / 1000);
    return new Timestamp(seconds, Math.round((ms - seconds * 1000) * 1e6));
  }
  toDate() { return new Date(this.toMillis()); }
  toMillis() { return this.seconds * 1000 + Math.floor(this.nanoseconds / 1e6); }
  isEqual(o) { return !!o && o.seconds === this.seconds && o.nanoseconds === this.nanoseconds; }
  valueOf() { return this.toMillis(); }
  toJSON() { return { seconds: this.seconds, nanoseconds: this.nanoseconds }; }
}

// ---------- FieldValue sentinels ----------
class FieldValue {
  constructor(kind, arg) { this.kind = kind; this.arg = arg; }
}
export const serverTimestamp = () => new FieldValue('serverTimestamp');
export const increment = (n) => new FieldValue('increment', n);
export const arrayUnion = (...v) => new FieldValue('arrayUnion', v);
export const arrayRemove = (...v) => new FieldValue('arrayRemove', v);
export const deleteField = () => new FieldValue('deleteField');

// ---------- helpers ----------
const isPlainObject = (v) => v !== null && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype;

function clone(v) {
  if (v instanceof Timestamp) return new Timestamp(v.seconds, v.nanoseconds);
  if (v instanceof Date) return new Date(v.getTime());
  if (Array.isArray(v)) return v.map(clone);
  if (isPlainObject(v)) {
    const out = {};
    for (const k of Object.keys(v)) out[k] = clone(v[k]);
    return out;
  }
  return v;
}

function eqVal(a, b) {
  if (a instanceof Timestamp && b instanceof Timestamp) return a.isEqual(b);
  if (typeof a === 'object' && a && typeof b === 'object' && b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return a === b;
}

// Resolve sentinels inside a value being written (no dotted-path handling here).
function resolveValue(existing, v) {
  if (v instanceof FieldValue) {
    switch (v.kind) {
      case 'serverTimestamp': return Timestamp.now();
      case 'increment': return (typeof existing === 'number' ? existing : 0) + v.arg;
      case 'arrayUnion': {
        const arr = Array.isArray(existing) ? existing.slice() : [];
        for (const x of v.arg) if (!arr.some((y) => eqVal(x, y))) arr.push(clone(x));
        return arr;
      }
      case 'arrayRemove':
        return (Array.isArray(existing) ? existing : []).filter((y) => !v.arg.some((x) => eqVal(x, y)));
      default: return undefined; // deleteField
    }
  }
  if (Array.isArray(v)) return v.map((x) => resolveValue(undefined, x));
  if (isPlainObject(v)) {
    const out = {};
    for (const k of Object.keys(v)) {
      const r = resolveValue(existing && typeof existing === 'object' ? existing[k] : undefined, v[k]);
      if (r !== undefined) out[k] = r;
    }
    return out;
  }
  return clone(v);
}

// Write `data` into `target` in place. dotted: top-level keys with '.' are field paths
// (updateDoc semantics). deepMerge: nested plain objects merge instead of replace (setDoc merge).
function applyFields(target, data, { dotted, deepMerge }) {
  for (const key of Object.keys(data)) {
    const val = data[key];
    const path = dotted && key.includes('.') ? key.split('.') : [key];
    let node = target;
    for (let i = 0; i < path.length - 1; i++) {
      if (!isPlainObject(node[path[i]])) node[path[i]] = {};
      node = node[path[i]];
    }
    const last = path[path.length - 1];
    if (deepMerge && isPlainObject(val) && isPlainObject(node[last])) {
      applyFields(node[last], val, { dotted: false, deepMerge: true });
      continue;
    }
    const r = resolveValue(node[last], val);
    if (r === undefined) delete node[last]; else node[last] = r;
  }
}

function getField(data, path) {
  let node = data;
  for (const p of path.split('.')) {
    if (node == null || typeof node !== 'object') return undefined;
    node = node[p];
  }
  return node;
}

// Firestore-like ordering: null < boolean < number/timestamp < string < other
function typeRank(v) {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'boolean') return 1;
  if (typeof v === 'number' || v instanceof Timestamp || v instanceof Date) return 2;
  if (typeof v === 'string') return 3;
  if (Array.isArray(v)) return 5;
  return 6;
}
function numeric(v) {
  if (v instanceof Timestamp) return v.toMillis();
  if (v instanceof Date) return v.getTime();
  return v;
}
function compareValues(a, b) {
  const ra = typeRank(a);
  const rb = typeRank(b);
  if (ra !== rb) return ra - rb;
  if (ra === 1) return Number(a) - Number(b);
  if (ra === 2) return numeric(a) - numeric(b);
  if (ra === 3) return a < b ? -1 : a > b ? 1 : 0;
  return 0;
}

// ---------- store ----------
const collections = new Map(); // collectionPath -> Map(docId -> data)
const listeners = new Set();   // { collectionPath, schedule }
let idCounter = 0;

function col(path) {
  let c = collections.get(path);
  if (!c) { c = new Map(); collections.set(path, c); }
  return c;
}
function autoId() {
  idCounter += 1;
  const rnd = Math.random().toString(36).slice(2, 10);
  return (Date.now().toString(36) + rnd + idCounter.toString(36)).slice(0, 20);
}
function notify(collectionPath) {
  for (const l of Array.from(listeners)) {
    if (l.collectionPath === collectionPath) l.schedule();
  }
}

// ---------- references ----------
export const demoDb = { type: 'firestore', app: null, toJSON() { return {}; } };

class DocumentReference {
  constructor(firestore, path) {
    this.type = 'document';
    this.firestore = firestore;
    this.path = path;
    const parts = path.split('/');
    this.id = parts[parts.length - 1];
    this._collectionPath = parts.slice(0, -1).join('/');
  }
  get parent() { return new CollectionReference(this.firestore, this._collectionPath); }
}
class CollectionReference {
  constructor(firestore, path) {
    this.type = 'collection';
    this.firestore = firestore;
    this.path = path;
    this.id = path.split('/').pop();
  }
  get parent() {
    const parts = this.path.split('/');
    return parts.length > 1 ? new DocumentReference(this.firestore, parts.slice(0, -1).join('/')) : null;
  }
}
class Query {
  constructor(firestore, collectionPath, constraints = []) {
    this.type = 'query';
    this.firestore = firestore;
    this._collectionPath = collectionPath;
    this._constraints = constraints;
  }
}

const segs = (arr) => arr.flatMap((s) => String(s).split('/')).filter(Boolean);

export function getFirestore() { return demoDb; }
export function initializeFirestore() { return demoDb; }
export function connectFirestoreEmulator() {}
export function enableIndexedDbPersistence() { return Promise.resolve(); }

export function collection(parent, ...path) {
  const base = parent instanceof DocumentReference || parent instanceof CollectionReference ? parent.path : '';
  return new CollectionReference(demoDb, [base, ...segs(path)].filter(Boolean).join('/'));
}

export function doc(parent, ...path) {
  if (parent instanceof CollectionReference) {
    const rest = segs(path);
    return new DocumentReference(demoDb, [parent.path, rest.length ? rest.join('/') : autoId()].join('/'));
  }
  const base = parent instanceof DocumentReference ? parent.path : '';
  return new DocumentReference(demoDb, [base, ...segs(path)].filter(Boolean).join('/'));
}

// ---------- query constraints ----------
export const where = (field, op, value) => ({ kind: 'where', field, op, value });
export const orderBy = (field, dir = 'asc') => ({ kind: 'orderBy', field, dir });
export const limit = (n) => ({ kind: 'limit', n });
export const limitToLast = (n) => ({ kind: 'limitToLast', n });

export function query(base, ...constraints) {
  const path = base instanceof CollectionReference ? base.path : base._collectionPath;
  const prev = base instanceof Query ? base._constraints : [];
  return new Query(demoDb, path, [...prev, ...constraints.filter(Boolean)]);
}

function matches(data, c) {
  const v = getField(data, c.field);
  const t = c.value;
  switch (c.op) {
    case '==': return v !== undefined && eqVal(v, t);
    case '!=': return v !== undefined && !eqVal(v, t);
    case '<': return v !== undefined && typeRank(v) === typeRank(t) && compareValues(v, t) < 0;
    case '<=': return v !== undefined && typeRank(v) === typeRank(t) && compareValues(v, t) <= 0;
    case '>': return v !== undefined && typeRank(v) === typeRank(t) && compareValues(v, t) > 0;
    case '>=': return v !== undefined && typeRank(v) === typeRank(t) && compareValues(v, t) >= 0;
    case 'in': return v !== undefined && t.some((x) => eqVal(v, x));
    case 'not-in': return v !== undefined && !t.some((x) => eqVal(v, x));
    case 'array-contains': return Array.isArray(v) && v.some((x) => eqVal(x, t));
    case 'array-contains-any': return Array.isArray(v) && v.some((x) => t.some((y) => eqVal(x, y)));
    default: throw new Error(`demo firestore: unsupported where operator "${c.op}"`);
  }
}

function runQuery(q) {
  let out = Array.from(col(q._collectionPath));
  const wheres = q._constraints.filter((c) => c.kind === 'where');
  const orders = q._constraints.filter((c) => c.kind === 'orderBy');
  if (wheres.length) out = out.filter(([, d]) => wheres.every((c) => matches(d, c)));
  if (orders.length) {
    // Firestore excludes docs that lack an orderBy field
    out = out.filter(([, d]) => orders.every((o) => getField(d, o.field) !== undefined));
    out.sort(([ia, a], [ib, b]) => {
      for (const o of orders) {
        const r = compareValues(getField(a, o.field), getField(b, o.field));
        if (r !== 0) return o.dir === 'desc' ? -r : r;
      }
      return ia < ib ? -1 : ia > ib ? 1 : 0;
    });
  } else {
    out.sort(([ia], [ib]) => (ia < ib ? -1 : ia > ib ? 1 : 0));
  }
  const lim = q._constraints.find((c) => c.kind === 'limit');
  const limLast = q._constraints.find((c) => c.kind === 'limitToLast');
  if (lim) out = out.slice(0, lim.n);
  if (limLast) out = out.slice(Math.max(0, out.length - limLast.n));
  return out;
}

// ---------- snapshots ----------
class DocumentSnapshot {
  constructor(ref, data) {
    this.ref = ref;
    this.id = ref.id;
    this._data = data;
    this.metadata = { fromCache: false, hasPendingWrites: false };
  }
  exists() { return this._data !== undefined; }
  data() { return this._data === undefined ? undefined : clone(this._data); }
  get(field) { return this._data === undefined ? undefined : clone(getField(this._data, field)); }
}
class QueryDocumentSnapshot extends DocumentSnapshot {}

class QuerySnapshot {
  constructor(q, docs, changes) {
    this.query = q;
    this.docs = docs;
    this._changes = changes;
    this.metadata = { fromCache: false, hasPendingWrites: false };
  }
  get size() { return this.docs.length; }
  get empty() { return this.docs.length === 0; }
  forEach(cb, thisArg) { this.docs.forEach(cb, thisArg); }
  docChanges() { return this._changes; }
}

function snapshotOfDoc(ref) {
  const d = col(ref._collectionPath).get(ref.id);
  return new DocumentSnapshot(ref, d === undefined ? undefined : clone(d));
}
function snapshotOfQuery(q, prev) {
  const docs = runQuery(q).map(([id, d]) =>
    new QueryDocumentSnapshot(new DocumentReference(demoDb, `${q._collectionPath}/${id}`), clone(d)));
  const changes = [];
  const prevList = prev || [];
  const prevMap = new Map(prevList.map((s) => [s.id, s]));
  docs.forEach((s, newIndex) => {
    const old = prevMap.get(s.id);
    if (!old) changes.push({ type: 'added', doc: s, oldIndex: -1, newIndex });
    else if (JSON.stringify(old._data) !== JSON.stringify(s._data)) {
      changes.push({ type: 'modified', doc: s, oldIndex: prevList.indexOf(old), newIndex });
    }
  });
  prevList.forEach((old, oldIndex) => {
    if (!docs.some((s) => s.id === old.id)) changes.push({ type: 'removed', doc: old, oldIndex, newIndex: -1 });
  });
  return new QuerySnapshot(q, docs, changes);
}

// ---------- reads ----------
export async function getDoc(ref) { return snapshotOfDoc(ref); }
export async function getDocs(q) {
  const target = q instanceof CollectionReference ? new Query(demoDb, q.path) : q;
  return snapshotOfQuery(target);
}

// onSnapshot(target, onNext, onError?) | (target, observer) | (target, options, onNext, onError?)
export function onSnapshot(target, ...args) {
  let onNext;
  let onError;
  if (typeof args[0] === 'function') {
    onNext = args[0];
    onError = args[1];
  } else if (args[0] && typeof args[0].next === 'function') {
    onNext = args[0].next.bind(args[0]);
    onError = args[0].error ? args[0].error.bind(args[0]) : undefined;
  } else {
    onNext = args[1];
    onError = args[2];
  }
  if (typeof onNext !== 'function') onNext = () => {};

  const isDoc = target instanceof DocumentReference;
  const q = target instanceof CollectionReference ? new Query(demoDb, target.path) : target;
  const collectionPath = isDoc ? target._collectionPath : q._collectionPath;
  let active = true;
  let queued = false;
  let prevDocs = null;
  let prevDocJson = null;

  const emit = () => {
    queued = false;
    if (!active) return;
    try {
      if (isDoc) {
        const snap = snapshotOfDoc(target);
        const json = JSON.stringify(snap._data) ?? 'undefined';
        if (prevDocJson === json) return; // fire only when this doc changed
        prevDocJson = json;
        onNext(snap);
      } else {
        const snap = snapshotOfQuery(q, prevDocs);
        if (prevDocs && snap.docChanges().length === 0 && snap.docs.length === prevDocs.length
          && snap.docs.every((s, i) => s.id === prevDocs[i].id)) return; // nothing relevant changed
        prevDocs = snap.docs;
        onNext(snap);
      }
    } catch (e) {
      if (typeof onError === 'function') onError(e); else console.error(e);
    }
  };

  const entry = {
    collectionPath,
    schedule() {
      if (queued) return;
      queued = true;
      setTimeout(emit, 0);
    },
  };
  listeners.add(entry);
  entry.schedule();
  return () => { active = false; listeners.delete(entry); };
}

// ---------- writes ----------
function notFound(ref) {
  const err = new Error(`No document to update: ${ref.path}`);
  err.code = 'not-found';
  return err;
}
function applySet(ref, data, options) {
  const c = col(ref._collectionPath);
  if (options && options.merge && c.has(ref.id)) {
    const next = clone(c.get(ref.id));
    applyFields(next, data, { dotted: false, deepMerge: true });
    c.set(ref.id, next);
  } else {
    const next = {};
    applyFields(next, data, { dotted: false, deepMerge: false });
    c.set(ref.id, next);
  }
}
function applyUpdate(ref, data) {
  const c = col(ref._collectionPath);
  if (!c.has(ref.id)) throw notFound(ref);
  const next = clone(c.get(ref.id));
  applyFields(next, data, { dotted: true, deepMerge: false });
  c.set(ref.id, next);
}

export async function setDoc(ref, data, options) {
  applySet(ref, data, options);
  notify(ref._collectionPath);
}
export async function addDoc(collRef, data) {
  const ref = new DocumentReference(demoDb, `${collRef.path}/${autoId()}`);
  applySet(ref, data);
  notify(ref._collectionPath);
  return ref;
}
export async function updateDoc(ref, ...rest) {
  let data = rest[0];
  if (typeof rest[0] === 'string') { // updateDoc(ref, 'a.b', v, 'c', w)
    data = {};
    for (let i = 0; i < rest.length; i += 2) data[rest[i]] = rest[i + 1];
  }
  applyUpdate(ref, data);
  notify(ref._collectionPath);
}
export async function deleteDoc(ref) {
  col(ref._collectionPath).delete(ref.id);
  notify(ref._collectionPath);
}

function runOps(ops) {
  const touched = new Set();
  for (const op of ops) {
    if (op.kind === 'set') applySet(op.ref, op.data, op.options);
    else if (op.kind === 'update') applyUpdate(op.ref, op.data);
    else col(op.ref._collectionPath).delete(op.ref.id);
    touched.add(op.ref._collectionPath);
  }
  touched.forEach(notify);
}

export function writeBatch() {
  const ops = [];
  const batch = {
    set(ref, data, options) { ops.push({ kind: 'set', ref, data, options }); return batch; },
    update(ref, data) { ops.push({ kind: 'update', ref, data }); return batch; },
    delete(ref) { ops.push({ kind: 'delete', ref }); return batch; },
    async commit() { runOps(ops); },
  };
  return batch;
}

// Transaction: reads see current state, writes are applied after updateFn resolves.
export async function runTransaction(_db, updateFn) {
  const ops = [];
  const t = {
    async get(ref) { return snapshotOfDoc(ref); },
    set(ref, data, options) { ops.push({ kind: 'set', ref, data, options }); return t; },
    update(ref, data) { ops.push({ kind: 'update', ref, data }); return t; },
    delete(ref) { ops.push({ kind: 'delete', ref }); return t; },
  };
  const result = await updateFn(t);
  runOps(ops);
  return result;
}

export function documentId() { return '__name__'; }
export async function getCountFromServer(q) {
  const snap = await getDocs(q);
  return { data: () => ({ count: snap.size }) };
}

// ---------- seed (runs once per page load) ----------
(function loadSeed() {
  const seed = buildSeed({ Timestamp, now: Date.now() });
  for (const [collName, docs] of Object.entries(seed)) {
    const c = col(collName);
    for (const [id, data] of Object.entries(docs)) c.set(id, clone(data));
  }
})();
