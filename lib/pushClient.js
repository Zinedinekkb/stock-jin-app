'use client';
// lib/pushClient.js
// ฝั่ง client ของการแจ้งเตือนบนมือถือ/เดสก์ท็อป (Firebase Cloud Messaging)
// โหลด firebase/messaging แบบ dynamic เพื่อไม่ให้กระทบ SSR/prerender

import { doc, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { getApp } from 'firebase/app';
import { db, auth } from './firebase';

const TOKEN_KEY = 'stockpro_fcm_token';
const SW_PATH = '/firebase-messaging-sw.js';

const readLocalToken = () => {
  try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
};
const writeLocalToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* localStorage ใช้ไม่ได้ (private mode) ไม่เป็นไร */ }
};

export const isIOS = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return /iPad|iPhone|iPod/.test(ua) || iPadOS;
};

export const isStandalone = () => {
  if (typeof window === 'undefined') return false;
  return Boolean(window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone);
};

/**
 * ตรวจว่าเบราว์เซอร์รองรับ Web Push หรือไม่
 * @returns {Promise<boolean>}
 */
export const isPushSupported = async () => {
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return false;
  try {
    const { isSupported } = await import('firebase/messaging');
    return await isSupported();
  } catch {
    return false;
  }
};

/**
 * สถานะปัจจุบันสำหรับแสดงผล
 * @returns {Promise<'unsupported'|'ios-not-installed'|'blocked'|'enabled'|'disabled'>}
 */
export const getPushStatus = async () => {
  if (isIOS() && !isStandalone()) return 'ios-not-installed';
  if (!(await isPushSupported())) return 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  if (Notification.permission === 'granted' && readLocalToken()) return 'enabled';
  return 'disabled';
};

/**
 * เปิดการแจ้งเตือนบนอุปกรณ์นี้ และบันทึก token ลง users/{uid}.fcmTokens
 * @returns {Promise<{ok: boolean, reason?: string, message?: string}>}
 */
export const enablePush = async (user) => {
  try {
    if (isIOS() && !isStandalone()) {
      return { ok: false, reason: 'ios-not-installed', message: 'บน iPhone ต้องติดตั้งแอปลงหน้าจอโฮมก่อน' };
    }
    if (!(await isPushSupported())) {
      return { ok: false, reason: 'unsupported', message: 'เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน' };
    }
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      return { ok: false, reason: 'missing-vapid', message: 'ยังไม่ได้ตั้งค่า VAPID key ของระบบแจ้งเตือน (ติดต่อผู้ดูแลระบบ)' };
    }

    const permission = Notification.permission === 'granted'
      ? 'granted'
      : (Notification.permission === 'denied' ? 'denied' : await Notification.requestPermission());
    if (permission !== 'granted') {
      return { ok: false, reason: 'denied', message: 'ยังไม่ได้อนุญาตการแจ้งเตือน ไปที่การตั้งค่าของเบราว์เซอร์เพื่ออนุญาต' };
    }

    const registration = await navigator.serviceWorker.register(SW_PATH, { scope: '/' });
    await navigator.serviceWorker.ready;

    const { getMessaging, getToken } = await import('firebase/messaging');
    const messaging = getMessaging(getApp());
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
    if (!token) {
      return { ok: false, reason: 'no-token', message: 'ไม่สามารถลงทะเบียนอุปกรณ์เพื่อรับการแจ้งเตือนได้' };
    }

    const uid = user?.uid || auth.currentUser?.uid;
    if (!uid) return { ok: false, reason: 'no-user', message: 'กรุณาเข้าสู่ระบบก่อน' };
    await updateDoc(doc(db, 'users', uid), {
      fcmTokens: arrayUnion(token),
      pushEnabledAt: serverTimestamp(),
    });
    writeLocalToken(token);
    return { ok: true };
  } catch (err) {
    console.warn('enablePush failed:', err?.code || err?.message || 'unknown');
    return { ok: false, reason: 'error', message: 'เปิดการแจ้งเตือนไม่สำเร็จ กรุณาลองใหม่' };
  }
};

/**
 * ปิดการแจ้งเตือนบนอุปกรณ์นี้ (ลบ token ออกจาก FCM และ users doc)
 * @returns {Promise<{ok: boolean, message?: string}>}
 */
export const disablePush = async (user) => {
  try {
    const token = readLocalToken();
    const { getMessaging, deleteToken } = await import('firebase/messaging');
    try {
      await deleteToken(getMessaging(getApp()));
    } catch { /* อาจยังไม่เคยลงทะเบียน */ }

    const uid = user?.uid || auth.currentUser?.uid;
    if (uid && token) {
      await updateDoc(doc(db, 'users', uid), { fcmTokens: arrayRemove(token) });
    }
    writeLocalToken('');
    return { ok: true };
  } catch (err) {
    console.warn('disablePush failed:', err?.code || err?.message || 'unknown');
    return { ok: false, message: 'ปิดการแจ้งเตือนไม่สำเร็จ กรุณาลองใหม่' };
  }
};

/**
 * รับการแจ้งเตือนขณะเปิดแอปอยู่ (foreground)
 * @param {(payload: object) => void} onMessageCb
 * @returns {Promise<(() => void) | null>} ฟังก์ชันยกเลิกการฟัง หรือ null ถ้าไม่รองรับ
 */
export const listenForeground = async (onMessageCb) => {
  try {
    if (!(await isPushSupported())) return null;
    const { getMessaging, onMessage } = await import('firebase/messaging');
    return onMessage(getMessaging(getApp()), (payload) => {
      // data-only payload เป็นหลัก (fallback ไป notification ถ้ามี)
      const data = payload?.data || {};
      const notif = payload?.notification || {};
      onMessageCb?.({
        ...payload,
        title: data.title || notif.title || '',
        body: data.body || notif.body || '',
        url: data.url || '/',
      });
    });
  } catch {
    return null;
  }
};

/**
 * ส่งเหตุการณ์ให้เซิร์ฟเวอร์คำนวณผู้รับและส่ง push (fire-and-forget, ไม่ throw)
 * @param {string} event เช่น 'tx_created' | 'tx_verified' | 'tx_cancelled' | 'task_assigned' | 'leave_created' | 'leave_decided'
 * @param {object} payload เช่น { txId }
 */
export const sendPushEvent = async (event, payload = {}) => {
  try {
    const current = auth.currentUser;
    if (!current) return;
    const idToken = await current.getIdToken();
    await fetch('/api/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ event, ...payload }),
    });
  } catch (err) {
    console.warn('sendPushEvent failed:', err?.message || 'unknown');
  }
};
