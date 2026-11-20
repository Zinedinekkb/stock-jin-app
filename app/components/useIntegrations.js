'use client';
import { useEffect, useState } from 'react';

let cached = null;
let inflight = null;

function load() {
  if (cached) return Promise.resolve(cached);
  if (!inflight) {
    inflight = fetch('/api/integrations')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        cached = j || { line: false, email: false, push: false };
        return cached;
      })
      .catch(() => ({ line: false, email: false, push: false }))
      .finally(() => { inflight = null; });
  }
  return inflight;
}

// null = ยังโหลดไม่เสร็จ
export function useIntegrations() {
  const [status, setStatus] = useState(cached);
  useEffect(() => {
    let alive = true;
    load().then((s) => alive && setStatus(s));
    return () => { alive = false; };
  }, []);
  return status;
}
