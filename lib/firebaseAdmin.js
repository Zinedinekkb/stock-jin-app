// lib/firebaseAdmin.js
// Server-only Firebase Admin SDK (use in app/api routes only, never in client components).
import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getMessaging } from 'firebase-admin/messaging';

function parseServiceAccount(raw) {
  const text = raw.trim();
  // รองรับทั้ง JSON ดิบ และ base64 ของ JSON
  if (text.startsWith('{')) return JSON.parse(text);
  return JSON.parse(Buffer.from(text, 'base64').toString('utf8'));
}

function getAdminApp() {
  if (getApps().length) return getApp();

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error('ไม่พบ FIREBASE_SERVICE_ACCOUNT ใน environment variables (ต้องเป็น service account JSON หรือ base64 ของ JSON)');
  }

  let serviceAccount;
  try {
    serviceAccount = parseServiceAccount(raw);
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT อ่านไม่ได้ ตรวจสอบว่าเป็น JSON หรือ base64 ของ JSON ที่ถูกต้อง');
  }

  return initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminMessaging() {
  return getMessaging(getAdminApp());
}
