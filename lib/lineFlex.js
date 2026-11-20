// lib/lineFlex.js
// Shared LINE Messaging API helpers + Flex builders (server-only).
// Style matches app/api/daily-report/route.js.

const LINE_API = 'https://api.line.me/v2/bot';

export function getLineToken() {
  const token = process.env.LINE_ACCESS_TOKEN;
  if (!token) throw new Error('ไม่พบ LINE_ACCESS_TOKEN');
  return token;
}

async function lineFetch(path, body) {
  const res = await fetch(`${LINE_API}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getLineToken()}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    // ไม่ log token; log เฉพาะ status และข้อความจาก LINE
    const detail = await res.text().catch(() => '');
    throw new Error(`LINE API ${path} ตอบกลับ ${res.status}: ${detail.slice(0, 200)}`);
  }
  return true;
}

// Reply API: free, does not count toward the monthly push quota
export function lineReply(replyToken, messages) {
  return lineFetch('/message/reply', { replyToken, messages });
}

// Push API: counts toward the monthly quota (use sparingly)
export function linePush(to, messages) {
  return lineFetch('/message/push', { to, messages });
}

const fmtQty = (n) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });

export function flexSectionTitle(text, color) {
  return { type: 'text', text, weight: 'bold', size: 'sm', margin: 'lg', color };
}

export function flexRow(name, qtyText, color, sub) {
  const right = [{ type: 'text', text: qtyText, size: 'sm', color, align: 'end', weight: 'bold' }];
  if (sub) right.push({ type: 'text', text: sub, size: 'xxs', color: '#aaaaaa', align: 'end' });
  return {
    type: 'box', layout: 'horizontal', margin: 'sm',
    contents: [
      { type: 'text', text: name || '-', size: 'sm', color: '#555555', flex: 4, wrap: true },
      { type: 'box', layout: 'vertical', flex: 2, contents: right },
    ],
  };
}

export function flexEmpty(text = '- ไม่มีรายการ -') {
  return { type: 'text', text, size: 'sm', color: '#aaaaaa', margin: 'sm' };
}

// Movement rows for IN/OUT list
export function movementRows(items, color, max = 10) {
  if (!items || items.length === 0) return [flexEmpty()];
  return items.slice(0, max).map(it => flexRow(it.name, `${fmtQty(it.totalQty)} ${it.unit || ''}`.trim(), color));
}

export function flexBubble({ title, subtitle, bodyContents, footerText }) {
  const contents = [
    { type: 'text', text: title, weight: 'bold', size: 'xl', color: '#1DB446', margin: 'md', wrap: true },
  ];
  if (subtitle) contents.push({ type: 'text', text: subtitle, size: 'xs', color: '#aaaaaa', margin: 'xs', wrap: true });
  contents.push({ type: 'separator', margin: 'lg' });
  contents.push(...bodyContents);
  if (footerText) {
    contents.push({ type: 'separator', margin: 'lg' });
    contents.push({ type: 'text', text: footerText, size: 'xs', color: '#aaaaaa', align: 'center', margin: 'lg', wrap: true });
  }
  return { type: 'bubble', body: { type: 'box', layout: 'vertical', contents } };
}

export function flexMessage(altText, bubble) {
  return { type: 'flex', altText, contents: bubble };
}
