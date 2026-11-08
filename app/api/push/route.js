// app/api/push/route.js
// ส่ง Push (FCM) ตามเหตุการณ์ในระบบ
// ผู้รับทั้งหมดคำนวณจาก Firestore ฝั่งเซิร์ฟเวอร์เท่านั้น ไม่เชื่อ recipient ที่ client ส่งมา
import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminDb, getAdminMessaging } from '@/lib/firebaseAdmin';
import { canVerifyStock } from '@/app/utils/permissions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ICON = '/icons/icon-192.png';
const CHUNK = 500;
const REMOVE_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);
const EVENTS = new Set(['tx_created', 'tx_verified', 'tx_cancelled', 'task_assigned', 'leave_created', 'leave_decided']);
const ALL_POSITIONS = 'ทุกคน';

const joinParts = (parts, sep = ' · ') => parts.filter(Boolean).join(sep);
const rangeText = (start, end) => (start && end ? `${start}–${end}` : '');

// ตรวจ ID token และสิทธิ์ของผู้เรียก (ต้องเป็น admin หรือ approved)
async function authenticate(request) {
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return { error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) };

  let uid;
  try {
    const decoded = await getAdminAuth().verifyIdToken(match[1]);
    uid = decoded.uid;
  } catch {
    return { error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) };
  }

  const snap = await getAdminDb().collection('users').doc(uid).get();
  if (!snap.exists) return { error: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };
  const data = snap.data();
  if (!(data.role === 'admin' || data.status === 'approved')) {
    return { error: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };
  }
  return { uid };
}

// ดึงผู้ใช้ที่ได้รับการอนุมัติแล้วทั้งหมด (ปริมาณผู้ใช้ของร้านมีน้อย)
async function approvedUsers(db) {
  const snap = await db.collection('users').where('status', '==', 'approved').get();
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
}

async function readDoc(db, collection, id) {
  if (!id || typeof id !== 'string') return null;
  const snap = await db.collection(collection).doc(id).get();
  return snap.exists ? snap.data() : null;
}

// คำนวณผู้รับและข้อความแจ้งเตือนตามเหตุการณ์
async function resolveEvent(db, event, body, callerUid) {
  switch (event) {
    case 'tx_created': {
      const tx = await readDoc(db, 'transactions', body.txId);
      if (!tx) return null;
      const recipients = (await approvedUsers(db)).filter(
        (u) => u.uid !== callerUid && (u.role === 'admin' || canVerifyStock(u))
      );
      const kind = tx.type === 'IN' ? 'รับ' : 'เบิก';
      const count = Array.isArray(tx.items) ? tx.items.length : 0;
      return {
        recipients,
        title: `📦 มีใบ${kind}ใหม่รอตรวจ`,
        body: joinParts([tx.recorder, count ? `${count} รายการ` : '', tx.docNumber || `#${String(body.txId).slice(-4).toUpperCase()}`]),
        url: '/?tab=status',
      };
    }
    case 'tx_verified':
    case 'tx_cancelled': {
      const tx = await readDoc(db, 'transactions', body.txId);
      if (!tx) return null;
      const kind = tx.type === 'IN' ? 'รับ' : 'เบิก';
      const snap = tx.recorderEmail
        ? await db.collection('users').where('email', '==', tx.recorderEmail).get()
        : null;
      const recipients = (snap ? snap.docs.map((d) => ({ uid: d.id, ...d.data() })) : [])
        .filter((u) => u.uid !== callerUid);
      const verified = event === 'tx_verified';
      return {
        recipients,
        title: verified ? `✅ ใบ${kind}ของคุณตรวจแล้ว` : `🚫 ใบ${kind}ถูกยกเลิก`,
        body: joinParts([tx.docNumber, tx.recorder]),
        url: '/?tab=status',
      };
    }
    case 'task_assigned': {
      const task = await readDoc(db, 'tasks', body.taskId);
      if (!task) return null;
      let recipients;
      if (task.targetType === 'user') {
        const snap = task.targetUserId ? await db.collection('users').doc(task.targetUserId).get() : null;
        recipients = snap && snap.exists ? [{ uid: snap.id, ...snap.data() }] : [];
      } else if (task.targetType === 'all' || !task.targetPosition || task.targetPosition === ALL_POSITIONS) {
        recipients = await approvedUsers(db);
      } else {
        const keyword = String(task.targetPosition).toLowerCase();
        recipients = (await approvedUsers(db)).filter((u) => String(u.position || '').toLowerCase().includes(keyword));
      }
      recipients = recipients.filter((u) => u.uid !== callerUid);
      const due = joinParts([task.dueDate, task.dueTime], ' ');
      return {
        recipients,
        title: `📋 งานใหม่: ${task.title || ''}`.trim(),
        body: due ? `กำหนด ${due}` : 'เปิดแอปเพื่อดูรายละเอียดงาน',
        url: '/?tab=dashboard',
      };
    }
    case 'leave_created': {
      const leave = await readDoc(db, 'leaves', body.leaveId);
      if (!leave) return null;
      const recipients = (await approvedUsers(db)).filter((u) => u.role === 'admin' && u.uid !== callerUid);
      return {
        recipients,
        title: '📝 ใบลาใหม่รออนุมัติ',
        body: joinParts([leave.userName, rangeText(leave.startDate, leave.endDate)]),
        url: '/?tab=hr',
      };
    }
    case 'leave_decided': {
      const leave = await readDoc(db, 'leaves', body.leaveId);
      if (!leave || !leave.userId) return null;
      const snap = await db.collection('users').doc(leave.userId).get();
      const recipients = snap.exists ? [{ uid: snap.id, ...snap.data() }] : [];
      const approved = leave.status === 'approved';
      return {
        recipients: recipients.filter((u) => u.uid !== callerUid),
        title: `ใบลาของคุณ${approved ? 'ได้รับอนุมัติ' : 'ไม่ได้รับอนุมัติ'}`,
        body: joinParts([leave.type, rangeText(leave.startDate, leave.endDate)]),
        url: '/?tab=hr',
      };
    }
    default:
      return null;
  }
}

function appBaseUrl(request) {
  const base = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  return base.replace(/\/+$/, '');
}

export async function POST(request) {
  const auth = await authenticate(request);
  if (auth.error) return auth.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const event = body?.event;
  if (!EVENTS.has(event)) return NextResponse.json({ error: 'unknown event' }, { status: 400 });

  const db = getAdminDb();
  let resolved;
  try {
    resolved = await resolveEvent(db, event, body, auth.uid);
  } catch (err) {
    console.error('push resolve error:', err?.message);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
  if (!resolved) return NextResponse.json({ error: 'not found' }, { status: 404 });

  // รวม token ของผู้รับ (จำ uid เจ้าของ token เพื่อใช้ลบ token ที่หมดอายุ)
  const ownerOf = new Map();
  for (const user of resolved.recipients) {
    for (const token of Array.isArray(user.fcmTokens) ? user.fcmTokens : []) {
      if (typeof token === 'string' && token && !ownerOf.has(token)) ownerOf.set(token, user.uid);
    }
  }
  const tokens = [...ownerOf.keys()];
  if (tokens.length === 0) return NextResponse.json({ ok: true, sent: 0, failed: 0 });

  const link = appBaseUrl(request) + resolved.url;
  const messaging = getAdminMessaging();
  let sent = 0;
  let failed = 0;
  const stale = new Map(); // uid -> [token]

  for (let i = 0; i < tokens.length; i += CHUNK) {
    const chunk = tokens.slice(i, i + CHUNK);
    try {
      const res = await messaging.sendEachForMulticast({
        tokens: chunk,
        // data-only: SW สร้างการแจ้งเตือนเอง (กันแสดงซ้ำ และ iOS ต้องมีการแสดงผลทุกครั้ง)
        data: { url: resolved.url, title: resolved.title, body: resolved.body, icon: ICON },
        webpush: {
          fcmOptions: { link },
          headers: { Urgency: 'high' },
        },
      });
      res.responses.forEach((r, idx) => {
        if (r.success) { sent += 1; return; }
        failed += 1;
        if (REMOVE_CODES.has(r.error?.code)) {
          const token = chunk[idx];
          const uid = ownerOf.get(token);
          if (!stale.has(uid)) stale.set(uid, []);
          stale.get(uid).push(token);
        }
      });
    } catch (err) {
      console.error('push send error:', err?.code || err?.message);
      failed += chunk.length;
    }
  }

  // ลบ token ที่ไม่ถูกต้องออกจากผู้ใช้ (ไม่ log ค่า token)
  for (const [uid, list] of stale) {
    try {
      await db.collection('users').doc(uid).update({ fcmTokens: FieldValue.arrayRemove(...list) });
    } catch (err) {
      console.warn('push token cleanup failed:', err?.code || err?.message);
    }
  }

  return NextResponse.json({ ok: true, sent, failed });
}
