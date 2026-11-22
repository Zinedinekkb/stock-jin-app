// app/firebase-messaging-sw.js/route.js
// Service worker สำหรับรับ Push จาก FCM (ตอนแอปปิดหรืออยู่เบื้องหลัง)
// เสิร์ฟที่ /firebase-messaging-sw.js ด้วย config สาธารณะของ Firebase (ไม่ใช่ความลับ)

import { getBrandingServer } from '../../lib/branding/server.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// เวอร์ชันต้องตรงกับ firebase ใน package.json (ปัจจุบัน 12.x)
const FIREBASE_SDK_VERSION = '12.6.0';

function slug(s) {
  return String(s).toLowerCase().trim().replace(/\s+/g, '-');
}

function buildServiceWorker(firebaseConfig, branding) {
  const lines = [
    "/* FCM service worker (generated) */",
    "importScripts('https://www.gstatic.com/firebasejs/" + FIREBASE_SDK_VERSION + "/firebase-app-compat.js');",
    "importScripts('https://www.gstatic.com/firebasejs/" + FIREBASE_SDK_VERSION + "/firebase-messaging-compat.js');",
    "",
    "firebase.initializeApp(" + JSON.stringify(firebaseConfig) + ");",
    "var messaging = firebase.messaging();",
    "",
    "var ICON = '/api/brand/icon/192';",
    "",
    "// แสดงการแจ้งเตือนเมื่อแอปอยู่เบื้องหลัง/ปิด",
    "// tag ซ้ำกันจะแทนที่การแจ้งเตือนเดิม (กันการแจ้งเตือนซ้ำเมื่อ FCM แสดงให้อัตโนมัติ)",
    "messaging.onBackgroundMessage(function (payload) {",
    "  var data = (payload && payload.data) || {};",
    "  var notif = (payload && payload.notification) || {};",
    "  var title = data.title || notif.title || " + JSON.stringify(branding.appName) + ";",
    "  var body = data.body || notif.body || '';",
    "  var url = data.url || '/';",
    "  return self.registration.showNotification(title, {",
    "    body: body,",
    "    icon: data.icon || ICON,",
    "    badge: ICON,",
    "    tag: " + JSON.stringify(slug(branding.appName) + '-') + " + url + '-' + title,",
    "    data: { url: url }",
    "  });",
    "});",
    "",
    "// กดการแจ้งเตือน: โฟกัสแท็บที่เปิดอยู่ หรือเปิดหน้าต่างใหม่",
    "self.addEventListener('notificationclick', function (event) {",
    "  event.notification.close();",
    "  var target = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;",
    "  event.waitUntil(",
    "    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {",
    "      for (var i = 0; i < clientList.length; i++) {",
    "        var client = clientList[i];",
    "        if (client.url.indexOf(self.location.origin) === 0 && 'focus' in client) {",
    "          if ('navigate' in client) {",
    "            return client.navigate(target).then(function (c) { return (c || client).focus(); }).catch(function () { return client.focus(); });",
    "          }",
    "          return client.focus();",
    "        }",
    "      }",
    "      if (self.clients.openWindow) return self.clients.openWindow(target);",
    "    })",
    "  );",
    "});",
    "",
    "// fetch listener ว่างไว้ เพื่อให้แอปยังผ่านเกณฑ์ติดตั้ง PWA",
    "self.addEventListener('fetch', function () {});",
    "",
  ];
  return lines.join('\n');
}

export async function GET() {
  const branding = await getBrandingServer();
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };

  return new Response(buildServiceWorker(firebaseConfig, branding), {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Service-Worker-Allowed': '/',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
