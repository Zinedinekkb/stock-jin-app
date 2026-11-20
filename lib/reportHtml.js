// lib/reportHtml.js
// HTML builders for the daily report (email body + stored page). Server-only.
import { thaiDateLabel } from './reportData';
import { DEFAULT_BRANDING } from './branding/defaults.js';
import { tripletToHex } from './branding/server.js';
import { buildBrandPalette } from './theme/palette.js';

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const fmtQty = (n) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });

const LEAVE_LABELS = { sick: 'ลาป่วย', personal: 'ลากิจ', vacation: 'ลาพักร้อน' };

function movementTable(title, color, rows) {
  const body = rows.length === 0
    ? `<tr><td colspan="3" style="padding:10px;color:#94a3b8;text-align:center;">- ไม่มีรายการ -</td></tr>`
    : rows.map((r, i) => `
        <tr style="${i % 2 ? 'background:#f8fafc;' : ''}">
          <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;">${escapeHtml(r.name)}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:right;color:${color};font-weight:700;white-space:nowrap;">${fmtQty(r.totalQty)} ${escapeHtml(r.unit)}</td>
        </tr>`).join('');
  return `
    <h3 style="font-size:15px;color:${color};margin:24px 0 8px;">${title}</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px;border:1px solid #e2e8f0;border-radius:8px;">
      <thead>
        <tr style="background:#f1f5f9;">
          <th style="padding:8px 10px;text-align:left;color:#475569;">สินค้า</th>
          <th style="padding:8px 10px;text-align:right;color:#475569;">จำนวน</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>`;
}

/**
 * model = { dateKey, summary, lowStock, extras, viewUrl }
 * summary: output of buildMovementSummary, extras: output of buildDailyExtras
 */
export function renderDailyReportHtml({ dateKey, summary, lowStock, extras, viewUrl, branding = DEFAULT_BRANDING }) {
  const appName = escapeHtml(branding.appName);
  const palette = buildBrandPalette(branding.primaryColor);
  const brand600 = tripletToHex(palette[600]);
  const brand800 = tripletToHex(palette[800]);
  const brand900 = tripletToHex(palette[900]);
  const dateLabel = thaiDateLabel(dateKey);
  const stat = (label, value, color = '#0f172a') => `
    <td style="width:33%;padding:10px;text-align:center;">
      <div style="font-size:22px;font-weight:800;color:${color};">${value}</div>
      <div style="font-size:12px;color:#64748b;margin-top:2px;">${label}</div>
    </td>`;

  const leaveRows = extras.pendingLeaves.length === 0
    ? '<li style="color:#94a3b8;">- ไม่มีคำขอลารอพิจารณา -</li>'
    : extras.pendingLeaves.slice(0, 30).map(l =>
        `<li>${escapeHtml(l.userName)} · ${escapeHtml(LEAVE_LABELS[l.type] || l.type || 'การลา')} · ${escapeHtml(l.startDate)} ถึง ${escapeHtml(l.endDate)}</li>`
      ).join('');

  const taskRows = extras.unfinishedTasks.length === 0
    ? '<li style="color:#94a3b8;">- ไม่มีงานค้าง -</li>'
    : extras.unfinishedTasks.slice(0, 30).map(t => `<li>${escapeHtml(t.title)}</li>`).join('');

  const lowRows = lowStock.length === 0
    ? `<p style="color:#16a34a;font-weight:700;margin:0;">✅ ไม่มีสินค้าใกล้หมด</p>`
    : `<table style="width:100%;border-collapse:collapse;font-size:14px;border:1px solid #fecaca;border-radius:8px;">
        <thead><tr style="background:#fef2f2;">
          <th style="padding:8px 10px;text-align:left;color:#991b1b;">สินค้า</th>
          <th style="padding:8px 10px;text-align:right;color:#991b1b;">คงเหลือ / ขั้นต่ำ</th>
        </tr></thead>
        <tbody>${lowStock.map(p => `
          <tr>
            <td style="padding:8px 10px;border-bottom:1px solid #fee2e2;">${escapeHtml(p.name)}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #fee2e2;text-align:right;font-weight:700;color:#dc2626;white-space:nowrap;">${fmtQty(p.stock)} / ${fmtQty(p.minStock)} ${escapeHtml(p.unit)}</td>
          </tr>`).join('')}
        </tbody></table>`;

  const viewButton = viewUrl
    ? `<a href="${escapeHtml(viewUrl)}" style="display:block;text-align:center;background:${brand600};color:#ffffff;padding:14px;border-radius:12px;font-weight:800;text-decoration:none;margin-top:24px;">📄 เปิดดูรายงานฉบับเต็ม</a>`
    : '';

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>รายงานประจำวัน ${escapeHtml(dateLabel)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Sarabun', 'Segoe UI', Roboto, sans-serif; background:#f8fafc; margin:0; padding:16px; color:#1e293b; }
    .container { max-width:640px; margin:0 auto; background:#ffffff; border-radius:18px; overflow:hidden; border:1px solid #e2e8f0; }
    .header { background:linear-gradient(135deg,#0f172a 0%,${brand900} 100%); color:#ffffff; padding:24px 28px; }
    .content { padding:24px 28px; }
    ul { padding-left:20px; margin:6px 0; font-size:14px; line-height:1.7; }
    .section-title { font-size:15px; font-weight:800; color:#0f172a; margin:24px 0 8px; }
    .footer { padding:16px 28px; background:#f8fafc; border-top:1px solid #e2e8f0; font-size:11px; color:#94a3b8; text-align:center; }
    @media (max-width:480px) { .content, .header { padding:18px; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="font-size:22px;font-weight:900;">📊 รายงานประจำวัน ${escapeHtml(dateLabel)}</div>
      <div style="font-size:13px;opacity:0.85;margin-top:4px;">${appName} · สรุปอัตโนมัติ</div>
    </div>
    <div class="content">
      <table style="width:100%;border-collapse:separate;border-spacing:6px;background:#f8fafc;border-radius:12px;">
        <tr>
          ${stat('รายการที่เสร็จ', summary.completedCount, '#0f172a')}
          ${stat('รอดำเนินการ', summary.pendingCount, '#d97706')}
          ${stat('สินค้าใกล้หมด', lowStock.length, '#dc2626')}
        </tr>
        <tr>
          ${stat('เช็คอินวันนี้', extras.attendanceCount, '#0f172a')}
          ${stat('ใบลารอพิจารณา', extras.pendingLeaves.length, brand600)}
          ${stat('งานค้าง', extras.unfinishedTasks.length, brand800)}
        </tr>
      </table>

      ${movementTable('📥 รับเข้าสินค้า (IN)', '#059669', summary.IN)}
      ${movementTable('📤 เบิกออกสินค้า (OUT)', '#e11d48', summary.OUT)}

      <div class="section-title">⚠️ สินค้าใกล้หมด</div>
      ${lowRows}

      <div class="section-title">📋 คำขอลารอพิจารณา</div>
      <ul>${leaveRows}</ul>

      <div class="section-title">📝 งานค้าง (ครบกำหนดวันนี้)</div>
      <ul>${taskRows}</ul>

      ${viewButton}
    </div>
    <div class="footer">
      อีเมลนี้ถูกส่งจากระบบ ${appName} โดยอัตโนมัติ · ไม่ต้องตอบกลับ
    </div>
  </div>
</body>
</html>`;
}

// Inserts a print toolbar right after <body> of a stored report page.
export function withPrintToolbar(html) {
  const toolbar = `
<style>
  .report-toolbar { position: sticky; top: 0; z-index: 10; display: flex; justify-content: flex-end; gap: 8px; padding: 10px 16px; background: #0f172a; }
  .report-toolbar button { background: #ffffff; color: #0f172a; border: 0; border-radius: 10px; padding: 8px 16px; font-weight: 800; font-size: 14px; cursor: pointer; }
  @media print { .report-toolbar { display: none !important; } }
</style>
<div class="report-toolbar"><button type="button" onclick="window.print()">🖨️ พิมพ์รายงาน</button></div>`;
  if (/<body[^>]*>/i.test(html)) {
    return html.replace(/<body[^>]*>/i, (m) => `${m}${toolbar}`);
  }
  return `${toolbar}${html}`;
}
