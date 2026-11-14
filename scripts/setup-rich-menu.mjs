#!/usr/bin/env node
/**
 * ตั้งค่า LINE Rich Menu ของ StockPro (LINE Official Account)
 * Sets up the StockPro LINE Rich Menu via the Messaging API.
 *
 * วิธีรัน / Usage:
 *   node --env-file=.env.local scripts/setup-rich-menu.mjs             (ติดตั้งจริง / real run)
 *   node scripts/setup-rich-menu.mjs --dry-run                         (สร้างรูป + พิมพ์ JSON เท่านั้น / image + JSON only, no network)
 *
 * ค่าที่ต้องมี / Required env:
 *   LINE_CHANNEL_ACCESS_TOKEN  Channel access token ของ LINE Official Account
 *   NEXT_PUBLIC_APP_URL        URL ของแอป (ค่าเริ่มต้น https://stock-jin-app.vercel.app)
 *
 * หมายเหตุ: เมื่อผู้ใช้กดปุ่มใน Rich Menu (ปุ่มข้อความ) LINE จะส่งข้อความปกติเข้ามาที่บอท
 * บอทตอบกลับด้วย reply message ซึ่ง "ไม่นับ" โควตา push 300 ข้อความ/เดือน
 * Note: a message-type tap sends a normal chat message. The bot answers with the
 * Reply API, which is free and does NOT count against the 300/month push quota.
 * Only the `uri` tap (เปิดแอป) opens the web app directly without a bot reply.
 *
 * ทำให้รันซ้ำได้ (idempotent): เมนูเดิมที่ชื่อ "stockpro-main" จะถูกลบก่อนสร้างใหม่
 * Idempotent: existing menus named "stockpro-main" are deleted before re-creating.
 */

import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const MENU_NAME = 'stockpro-main';
const WIDTH = 2500;
const HEIGHT = 843;
const TILE_W = 800;
const TILE_H = 783;
const TILE_Y = 30;
const GAP = 20;
const MARGIN = 30;
const TILE_X = [MARGIN, MARGIN + TILE_W + GAP, MARGIN + 2 * (TILE_W + GAP)];
const MAX_PNG_BYTES = 1024 * 1024;

const API = 'https://api.line.me';
const DATA_API = 'https://api-data.line.me';
const FONT = 'Leelawadee UI, Tahoma, Noto Sans Thai, sans-serif';
const OUT_PNG = path.join(path.dirname(fileURLToPath(import.meta.url)), 'rich-menu.png');

const dryRun = process.argv.slice(2).includes('--dry-run');
const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://stock-jin-app.vercel.app';

if (!dryRun && !TOKEN) {
  console.error(
    'ไม่พบ LINE_CHANNEL_ACCESS_TOKEN ใน environment กรุณาตั้งค่าใน .env.local แล้วรันด้วย:\n' +
      '  node --env-file=.env.local scripts/setup-rich-menu.mjs\n' +
      'LINE_CHANNEL_ACCESS_TOKEN is missing. Set it in .env.local and run:\n' +
      '  node --env-file=.env.local scripts/setup-rich-menu.mjs'
  );
  process.exit(1);
}

// Icons are drawn as plain SVG shapes (no emoji, no external assets).
const ICONS = {
  // bar chart
  chart: (cx) => `
    <rect x="${cx - 90}" y="300" width="40" height="80" rx="6" fill="#ffffff"/>
    <rect x="${cx - 30}" y="240" width="40" height="140" rx="6" fill="#ffffff"/>
    <rect x="${cx + 30}" y="190" width="40" height="190" rx="6" fill="#ffffff"/>
    <rect x="${cx - 110}" y="384" width="220" height="8" rx="4" fill="#ffffff"/>`,
  // box with a down arrow (stock running low)
  box: (cx) => `
    <rect x="${cx - 14}" y="170" width="28" height="90" rx="6" fill="#ffffff"/>
    <polygon points="${cx - 50},240 ${cx + 50},240 ${cx},300" fill="#ffffff"/>
    <rect x="${cx - 90}" y="290" width="180" height="96" rx="14" fill="#ffffff"/>`,
  // app window
  app: (cx) => `
    <rect x="${cx - 85}" y="170" width="170" height="220" rx="20" fill="none" stroke="#ffffff" stroke-width="12"/>
    <rect x="${cx - 85}" y="170" width="170" height="46" rx="20" fill="#ffffff"/>
    <rect x="${cx - 85}" y="196" width="170" height="20" fill="#ffffff"/>
    <rect x="${cx - 55}" y="240" width="110" height="16" rx="8" fill="#ffffff"/>
    <rect x="${cx - 55}" y="275" width="80" height="16" rx="8" fill="#ffffff"/>
    <rect x="${cx - 55}" y="310" width="130" height="16" rx="8" fill="#ffffff"/>`,
};

const COLUMNS = [
  { label: 'สรุปวันนี้', sub: 'ยอดเข้า-ออกวันนี้', icon: 'chart', action: { type: 'message', text: 'สรุปวันนี้' } },
  { label: 'สต็อกต่ำ', sub: 'สินค้าใกล้หมด', icon: 'box', action: { type: 'message', text: 'สต็อกต่ำ' } },
  { label: 'เปิดแอป', sub: 'StockPro', icon: 'app', action: { type: 'uri', uri: APP_URL } },
];

function buildSvg() {
  const tiles = COLUMNS.map((col, i) => {
    const x = TILE_X[i];
    const cx = x + TILE_W / 2;
    return `
  <rect x="${x}" y="${TILE_Y}" width="${TILE_W}" height="${TILE_H}" rx="48" fill="#2563eb"/>
  ${ICONS[col.icon](cx)}
  <text x="${cx}" y="560" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="110" fill="#ffffff">${col.label}</text>
  <text x="${cx}" y="660" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="60" fill="#ffffff" fill-opacity="0.85">${col.sub}</text>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#1e3a8a"/>${tiles}
</svg>`;
}

function buildDefinition() {
  return {
    size: { width: WIDTH, height: HEIGHT },
    selected: true,
    name: MENU_NAME,
    chatBarText: 'เมนู StockPro',
    areas: COLUMNS.map((col, i) => ({
      bounds: { x: TILE_X[i], y: TILE_Y, width: TILE_W, height: TILE_H },
      action: col.action,
    })),
  };
}

async function lineRequest(method, url, { json, body, contentType } = {}) {
  const headers = { Authorization: `Bearer ${TOKEN}` };
  let payload;
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(json);
  } else if (body !== undefined) {
    headers['Content-Type'] = contentType;
    payload = body;
  }
  const res = await fetch(url, { method, headers, body: payload });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${method} ${url} failed: HTTP ${res.status}\n${text}`);
  }
  return text ? JSON.parse(text) : {};
}

async function main() {
  const svg = buildSvg();
  const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
  if (png.length >= MAX_PNG_BYTES) {
    throw new Error(`PNG is ${png.length} bytes, must be under 1MB (${MAX_PNG_BYTES} bytes)`);
  }
  await writeFile(OUT_PNG, png);
  console.log(`Image written: ${OUT_PNG} (${(png.length / 1024).toFixed(1)} KB, ${WIDTH}x${HEIGHT})`);

  const definition = buildDefinition();
  console.log('Rich menu definition:');
  console.log(JSON.stringify(definition, null, 2));

  if (dryRun) {
    console.log('Dry run: no network calls made.');
    return;
  }

  // 1. Remove previous menus with the same name so reruns are idempotent.
  const list = await lineRequest('GET', `${API}/v2/bot/richmenu/list`);
  for (const menu of list.richmenus ?? []) {
    if (menu.name === MENU_NAME) {
      await lineRequest('DELETE', `${API}/v2/bot/richmenu/${menu.richMenuId}`);
      console.log(`Deleted old rich menu: ${menu.richMenuId}`);
    }
  }

  // 2. Create the rich menu.
  const created = await lineRequest('POST', `${API}/v2/bot/richmenu`, { json: definition });
  const richMenuId = created.richMenuId;
  console.log(`Created rich menu: ${richMenuId}`);

  // 3. Upload the image.
  await lineRequest('POST', `${DATA_API}/v2/bot/richmenu/${richMenuId}/content`, {
    body: png,
    contentType: 'image/png',
  });
  console.log('Uploaded image.');

  // 4. Make it the default for all users.
  await lineRequest('POST', `${API}/v2/bot/user/all/richmenu/${richMenuId}`);
  console.log(`Success: rich menu ${richMenuId} is now the default for all users.`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
