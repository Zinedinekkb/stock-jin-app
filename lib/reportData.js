// lib/reportData.js
// Server-only helpers for reports. Pass the Admin Firestore instance (getAdminDb()) as `db`.

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const pad2 = (n) => String(n).padStart(2, '0');

// ---------------------------------------------------------------
// Bangkok time helpers (UTC+7, no DST)
// ---------------------------------------------------------------

// Shift a UTC ms timestamp so getUTC* returns Bangkok wall-clock parts
function bangkokParts(ms) {
  const d = new Date(ms + BANGKOK_OFFSET_MS);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate() };
}

// 'YYYY-MM-DD' for the Bangkok calendar day that contains `now` (ms, default Date.now())
export function todayKeyBangkok(now = Date.now()) {
  const { y, m, d } = bangkokParts(now);
  return `${y}-${pad2(m + 1)}-${pad2(d)}`;
}

// Parse 'YYYY-MM-DD' -> ms of Bangkok midnight
function bangkokMidnightMs(y, m, d) {
  return Date.UTC(y, m, d) - BANGKOK_OFFSET_MS;
}

// {start, end} ms for a Bangkok day ('YYYY-MM-DD'); end is exclusive
export function dayRangeBangkok(dateKey) {
  const [y, m, d] = String(dateKey).split('-').map(Number);
  const start = bangkokMidnightMs(y, m - 1, d);
  return { start, end: start + DAY_MS };
}

// Period just finished for a half-month summary.
// Run on the 1st  -> 16th..end of previous month
// Run on the 16th -> 1st..15th of current month
// Other days (manual run) -> the half that most recently ended.
export function halfMonthRangeBangkok(now = Date.now()) {
  const { y, m, d } = bangkokParts(now);
  let startY, startM, startD, endY, endM, endD; // end exclusive
  let labelY, labelM, labelFrom, labelTo;

  const useSecondHalfOfPrevMonth = d === 1 || d < 16;
  if (useSecondHalfOfPrevMonth) {
    // 16..end of previous month
    const prevY = m === 0 ? y - 1 : y;
    const prevM = m === 0 ? 11 : m - 1;
    const prevLast = new Date(Date.UTC(prevY, prevM + 1, 0)).getUTCDate();
    startY = prevY; startM = prevM; startD = 16;
    endY = y; endM = m; endD = 1;
    labelY = prevY; labelM = prevM; labelFrom = 16; labelTo = prevLast;
  } else {
    // 1..15 of current month
    startY = y; startM = m; startD = 1;
    endY = y; endM = m; endD = 16;
    labelY = y; labelM = m; labelFrom = 1; labelTo = 15;
  }

  const start = bangkokMidnightMs(startY, startM, startD);
  const end = bangkokMidnightMs(endY, endM, endD);
  const label = `${labelFrom}–${labelTo} ${THAI_MONTHS[labelM]} ${labelY + 543}`;
  return { start, end, label };
}

// Thai date label for 'YYYY-MM-DD', e.g. '8 พฤศจิกายน 2569'
export function thaiDateLabel(dateKey) {
  const [y, m, d] = String(dateKey).split('-').map(Number);
  return `${d} ${THAI_MONTHS[m - 1]} ${y + 543}`;
}

// ---------------------------------------------------------------
// Movement (IN / OUT) summary
// ---------------------------------------------------------------

// Completed qty per item: actualItems[item.id] when defined, else item.qty
function completedQtyOf(tx, item) {
  const actual = tx.actualItems ? tx.actualItems[item.id] : undefined;
  const raw = actual !== undefined && actual !== null ? actual : item.qty;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Aggregates transactions whose timestamp is in [startMs, endMs).
 * Returns:
 *  {
 *    IN:  [{ id, name, unit, totalQty }],   // sorted by totalQty desc
 *    OUT: [{ id, name, unit, totalQty }],
 *    completedCount, pendingCount, cancelledCount,
 *    completedByType: { IN, OUT }
 *  }
 */
export async function buildMovementSummary(db, startMs, endMs) {
  const txCol = db.collection('transactions');

  // (a) บิลที่ "ตรวจสอบเสร็จ" ในช่วงเวลานี้ (นับตามเวลาที่ verify)
  // (b) บิลเก่าที่ไม่มี verifiedAtMs: นับตามเวลาที่สร้าง (timestamp)
  // ใช้ Map ตาม doc.id เพื่อตัดรายการซ้ำ
  const [verifiedSnap, createdSnap, pendingSnap] = await Promise.all([
    txCol.where('verifiedAtMs', '>=', startMs).where('verifiedAtMs', '<', endMs).get(),
    txCol.where('timestamp', '>=', startMs).where('timestamp', '<', endMs).get(),
    txCol.where('status', '==', 'pending').get(),
  ]);

  const completedDocs = new Map();
  verifiedSnap.forEach((doc) => {
    const tx = doc.data() || {};
    if (tx.status === 'completed') completedDocs.set(doc.id, tx);
  });
  let cancelledCount = 0;
  createdSnap.forEach((doc) => {
    const tx = doc.data() || {};
    if (tx.status === 'cancelled') cancelledCount += 1;
    if (tx.status === 'completed' && (tx.verifiedAtMs === undefined || tx.verifiedAtMs === null)) {
      completedDocs.set(doc.id, tx);
    }
  });

  const totals = { IN: new Map(), OUT: new Map() };
  const completedByType = { IN: 0, OUT: 0 };
  let completedCount = 0;

  // รอดำเนินการ "ตอนนี้" ทั้งระบบ ไม่จำกัดช่วงเวลา
  const pendingCount = pendingSnap.size;

  completedDocs.forEach((tx) => {
    const type = tx.type === 'IN' ? 'IN' : tx.type === 'OUT' ? 'OUT' : null;
    if (!type) return;

    completedCount += 1;
    completedByType[type] += 1;

    (Array.isArray(tx.items) ? tx.items : []).forEach((item) => {
      if (!item) return;
      const key = String(item.id ?? item.name ?? '');
      if (!key) return;
      const qty = completedQtyOf(tx, item);
      const prev = totals[type].get(key);
      if (prev) {
        prev.totalQty += qty;
      } else {
        totals[type].set(key, { id: key, name: item.name || '-', unit: item.unit || '', totalQty: qty });
      }
    });
  });

  const toSorted = (map) => Array.from(map.values()).sort((a, b) => b.totalQty - a.totalQty);

  return {
    IN: toSorted(totals.IN),
    OUT: toSorted(totals.OUT),
    completedCount,
    pendingCount,
    cancelledCount,
    completedByType,
  };
}

// ---------------------------------------------------------------
// Low stock
// ---------------------------------------------------------------

/** Products where stock <= (minStock ?? 5), sorted by stock asc. */
export async function getLowStock(db) {
  const snap = await db.collection('products').get();
  const rows = [];
  snap.forEach((doc) => {
    const p = doc.data() || {};
    const stock = Number(p.stock) || 0;
    const minStock = p.minStock !== undefined && p.minStock !== null && p.minStock !== '' ? Number(p.minStock) : 5;
    if (stock <= minStock) {
      rows.push({
        id: doc.id,
        name: p.name || '-',
        unit: p.unit || '',
        stock,
        minStock,
        category: p.category || '',
      });
    }
  });
  return rows.sort((a, b) => a.stock - b.stock);
}

// ---------------------------------------------------------------
// Daily extras: attendance, pending leaves, unfinished tasks
// ---------------------------------------------------------------

/**
 * Best-effort extras for a Bangkok day ('YYYY-MM-DD').
 * Returns { attendanceCount, pendingLeaves: [...], unfinishedTasks: [...] }
 */
export async function buildDailyExtras(db, dateKey) {
  const extras = { attendanceCount: 0, pendingLeaves: [], unfinishedTasks: [] };

  try {
    const att = await db.collection('attendance').where('dateStr', '==', dateKey).get();
    extras.attendanceCount = att.size;
  } catch (err) {
    console.error('[reportData] attendance query failed:', err?.message);
  }

  try {
    const leaves = await db.collection('leaves').where('status', '==', 'pending').get();
    leaves.forEach((doc) => {
      const l = doc.data() || {};
      extras.pendingLeaves.push({
        userName: l.userName || '-',
        type: l.type || l.leaveType || '',
        startDate: l.startDate || '',
        endDate: l.endDate || '',
      });
    });
  } catch (err) {
    console.error('[reportData] leaves query failed:', err?.message);
  }

  try {
    const tasks = await db.collection('tasks').where('dueDate', '==', dateKey).get();
    tasks.forEach((doc) => {
      const t = doc.data() || {};
      const done = t.isRoutine
        ? Array.isArray(t.completedDates) && t.completedDates.includes(dateKey)
        : t.status === 'completed';
      if (!done) {
        extras.unfinishedTasks.push({ title: t.title || '-', status: t.status || '' });
      }
    });
  } catch (err) {
    console.error('[reportData] tasks query failed:', err?.message);
  }

  return extras;
}
