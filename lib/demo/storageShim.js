// lib/demo/storageShim.js
// Stand-in for 'firebase/storage' in demo mode: files are kept in memory as data: URLs.

const files = new Map(); // fullPath -> data URL

// 1x1 transparent PNG, returned for paths nothing was uploaded to
const PLACEHOLDER =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const demoStorage = { type: 'storage', app: null, maxUploadRetryTime: 0 };

export function getStorage() { return demoStorage; }
export function connectStorageEmulator() {}

function makeRef(path) {
  const clean = String(path || '').replace(/^\/+|\/+$/g, '');
  const parts = clean.split('/');
  return {
    storage: demoStorage,
    bucket: 'demo',
    fullPath: clean,
    name: parts[parts.length - 1] || '',
    get parent() { return parts.length > 1 ? makeRef(parts.slice(0, -1).join('/')) : null; },
    get root() { return makeRef(''); },
    toString() { return `gs://demo/${clean}`; },
  };
}

export function ref(storageOrRef, path) {
  const base = storageOrRef && storageOrRef.fullPath !== undefined ? storageOrRef.fullPath : '';
  return makeRef([base, path].filter(Boolean).join('/'));
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error || new Error('read failed'));
    r.readAsDataURL(blob);
  });
}

export async function uploadBytes(storageRef, data, metadata) {
  const blob = data instanceof Blob ? data : new Blob([data], { type: metadata?.contentType });
  files.set(storageRef.fullPath, await blobToDataUrl(blob));
  return {
    ref: storageRef,
    metadata: { name: storageRef.name, fullPath: storageRef.fullPath, size: blob.size, contentType: metadata?.contentType || blob.type },
  };
}

export async function uploadString(storageRef, value, format = 'raw', metadata) {
  let url = value;
  if (format === 'raw') url = `data:${metadata?.contentType || 'text/plain'};charset=utf-8,${encodeURIComponent(value)}`;
  else if (format === 'base64') url = `data:${metadata?.contentType || 'application/octet-stream'};base64,${value}`;
  files.set(storageRef.fullPath, url);
  return { ref: storageRef, metadata: { name: storageRef.name, fullPath: storageRef.fullPath } };
}

export function uploadBytesResumable(storageRef, data, metadata) {
  const task = uploadBytes(storageRef, data, metadata);
  return Object.assign(task, {
    on(_event, _next, error, complete) {
      task.then(() => complete && complete(), (e) => error && error(e));
      return () => {};
    },
    snapshot: { ref: storageRef },
  });
}

export async function getDownloadURL(storageRef) {
  return files.get(storageRef.fullPath) || PLACEHOLDER;
}

export async function deleteObject(storageRef) {
  files.delete(storageRef.fullPath);
}

export async function listAll() { return { items: [], prefixes: [] }; }
