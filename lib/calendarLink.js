// lib/calendarLink.js
// "เพิ่มลงปฏิทิน": builds a Google Calendar "create event" link. No OAuth, the user just confirms in a new tab.
import { getTaskSteps } from '@/app/services/taskSteps';

const TZ = 'Asia/Bangkok';
const DEFAULT_DURATION_MS = 60 * 60 * 1000; // 1 hour for timed events without an end
const BANGKOK_PARTS = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

// Leave type labels, same as LEAVE_TYPES in TabHR.js (not exported there, so kept in sync here)
const LEAVE_TYPE_LABELS = {
  sick: 'ลาป่วย',
  personal: 'ลากิจ',
  vacation: 'ลาพักร้อน',
};

// Turns a Date into wall-clock parts in Bangkok time
function bangkokParts(date) {
  const parts = Object.fromEntries(BANGKOK_PARTS.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    y: Number(parts.year), mo: Number(parts.month), d: Number(parts.day),
    h: Number(parts.hour), mi: Number(parts.minute), s: 0,
  };
}

// Accepts 'YYYY-MM-DD', 'YYYY-MM-DDTHH:mm' (read as Bangkok wall time) or a Date
function toParts(value) {
  if (value instanceof Date) return bangkokParts(value);
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(String(value));
  if (!m) throw new Error(`calendarLink: invalid date "${value}"`);
  return { y: +m[1], mo: +m[2], d: +m[3], h: m[4] ? +m[4] : 0, mi: m[5] ? +m[5] : 0, s: 0 };
}

const pad = (n, len = 2) => String(n).padStart(len, '0');
const dateStamp = (p) => `${pad(p.y, 4)}${pad(p.mo)}${pad(p.d)}`;
const timeStamp = (p) => `${dateStamp(p)}T${pad(p.h)}${pad(p.mi)}${pad(p.s)}`;

// Shift wall-clock parts by a number of milliseconds (done in UTC so no DST or local-zone effects)
function addMs(p, ms) {
  const t = new Date(Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) + ms);
  return { y: t.getUTCFullYear(), mo: t.getUTCMonth() + 1, d: t.getUTCDate(), h: t.getUTCHours(), mi: t.getUTCMinutes(), s: t.getUTCSeconds() };
}

function addDays(p, days) {
  return addMs(p, days * 24 * 60 * 60 * 1000);
}

/**
 * Build a Google Calendar template URL.
 * - Timed: start/end as Date or 'YYYY-MM-DDTHH:mm' (Bangkok time). End defaults to start + 1 hour.
 * - All-day: start/end as 'YYYY-MM-DD'. End is the LAST day (inclusive); the URL gets end + 1 day as Google expects.
 */
export function googleCalendarUrl({ title, details = '', location = '', start, end, allDay = false }) {
  let dates;
  if (allDay) {
    const s = toParts(start);
    const last = end ? toParts(end) : s;
    dates = `${dateStamp(s)}/${dateStamp(addDays(last, 1))}`;
  } else {
    const s = toParts(start);
    const e = end ? toParts(end) : addMs(s, DEFAULT_DURATION_MS);
    dates = `${timeStamp(s)}/${timeStamp(e)}`;
  }

  const params = [
    ['action', 'TEMPLATE'],
    ['text', title],
    ['details', details],
    ['location', location],
    ['dates', dates],
    ['ctz', TZ],
  ].filter(([key, value]) => value || ['action', 'dates', 'ctz'].includes(key));

  const query = params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  return `https://calendar.google.com/calendar/render?${query}`;
}

/** Calendar link for a task. Only meaningful when task.dueDate is set. */
export function taskToCalendar(task) {
  const steps = getTaskSteps(task);
  const detailParts = [];
  if (task.description) detailParts.push(task.description);
  if (steps.length > 0) {
    detailParts.push(['วิธีทำ:', ...steps.map((step, i) => `${i + 1}. ${step}`)].join('\n'));
  }
  detailParts.push('จาก StockPro');

  const base = {
    title: `งาน: ${task.title}`,
    details: detailParts.join('\n\n'),
  };

  if (task.dueTime) {
    return googleCalendarUrl({ ...base, start: `${task.dueDate}T${task.dueTime}` });
  }
  return googleCalendarUrl({ ...base, start: task.dueDate, end: task.dueDate, allDay: true });
}

/** Calendar link for an approved leave request (all-day, startDate..endDate inclusive). */
export function leaveToCalendar(leave) {
  const typeLabel = LEAVE_TYPE_LABELS[leave.type] || 'ลา';
  const details = [leave.reason, 'จาก StockPro'].filter(Boolean).join('\n\n');
  return googleCalendarUrl({
    title: `${typeLabel}: ${leave.userName || ''}`.trim(),
    details,
    start: leave.startDate,
    end: leave.endDate || leave.startDate,
    allDay: true,
  });
}
