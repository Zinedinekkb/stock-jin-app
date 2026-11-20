import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { isCronAuthorized } from '@/lib/cronAuth';
import {
  todayKeyBangkok, dayRangeBangkok, buildMovementSummary, getLowStock,
  buildDailyExtras, thaiDateLabel,
} from '@/lib/reportData';
import { renderDailyReportHtml } from '@/lib/reportHtml';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://stock-jin-app.vercel.app';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function getRecipients() {
  const raw = process.env.REPORT_EMAILS || process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || process.env.EMAIL_USER || '';
  return raw.split(',').map(e => e.trim()).filter(Boolean);
}

function createTransporter() {
  // ใช้การตั้งค่า SMTP เดียวกับ /api/notify-email
  const smtpHost = process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = Number(process.env.EMAIL_PORT || process.env.SMTP_PORT || 465);
  const smtpUser = process.env.EMAIL_USER || process.env.SMTP_USER;
  const smtpPass = process.env.EMAIL_PASS || process.env.SMTP_PASS;
  if (!smtpUser || !smtpPass) return null;

  return {
    from: smtpUser,
    transporter: nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    }),
  };
}

export async function GET(request) {
  if (!isCronAuthorized(request)) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const requested = url.searchParams.get('date');
    if (requested && !DATE_RE.test(requested)) {
      return NextResponse.json({ ok: false, error: 'date ต้องเป็นรูปแบบ YYYY-MM-DD' }, { status: 400 });
    }
    const dateKey = requested || todayKeyBangkok();
    const { start, end } = dayRangeBangkok(dateKey);
    const db = getAdminDb();

    // 1) ข้อมูลรายงาน
    const [summary, lowStock, extras] = await Promise.all([
      buildMovementSummary(db, start, end),
      getLowStock(db),
      buildDailyExtras(db, dateKey),
    ]);

    // 2) เก็บรายงาน (ใช้ token เดิมถ้ามี เพื่อให้ลิงก์เดิมยังใช้ได้)
    const reportRef = db.collection('daily_reports').doc(dateKey);
    const existing = await reportRef.get();
    const viewToken = (existing.exists && existing.data()?.viewToken) || crypto.randomBytes(16).toString('hex');
    const viewUrl = `${APP_URL}/api/reports/${dateKey}?t=${viewToken}`;

    const html = renderDailyReportHtml({ dateKey, summary, lowStock, extras, viewUrl });
    const dateLabel = thaiDateLabel(dateKey);
    const note = `เสร็จ ${summary.completedCount} รายการ · รอดำเนินการ ${summary.pendingCount} · สินค้าใกล้หมด ${lowStock.length}`;

    await reportRef.set({
      dateKey,
      html,
      summary: {
        completedCount: summary.completedCount,
        pendingCount: summary.pendingCount,
        cancelledCount: summary.cancelledCount,
        inItems: summary.IN,
        outItems: summary.OUT,
        lowStockCount: lowStock.length,
        lowStock: lowStock.slice(0, 50),
        attendanceCount: extras.attendanceCount,
        pendingLeaveCount: extras.pendingLeaves.length,
        unfinishedTaskCount: extras.unfinishedTasks.length,
      },
      viewToken,
      createdAt: FieldValue.serverTimestamp(),
    });

    // 3) อัปเดต/สร้างรายการในหน้า Documents (ไม่สร้างซ้ำ)
    const docName = `รายงานประจำวัน_${dateKey}`;
    const docPayload = {
      name: docName,
      url: viewUrl,
      category: 'report',
      note,
      createdBy: 'ระบบอัตโนมัติ',
      createdAt: FieldValue.serverTimestamp(),
      starred: false,
      fileSizeKb: Math.round(html.length / 1024),
    };
    const dup = await db.collection('documents').where('name', '==', docName).limit(1).get();
    if (dup.empty) {
      await db.collection('documents').add(docPayload);
    } else {
      await dup.docs[0].ref.update(docPayload);
    }

    // 4) ส่งอีเมล
    const recipients = getRecipients();
    const mailer = createTransporter();
    let emailedTo = [];
    let emailSkipped = null;

    if (!mailer) {
      emailSkipped = 'ยังไม่ได้ตั้งค่า EMAIL_USER / EMAIL_PASS';
      console.warn('[daily-report]', emailSkipped);
    } else if (recipients.length === 0) {
      emailSkipped = 'ไม่มีผู้รับอีเมล (REPORT_EMAILS / ADMIN_EMAILS)';
      console.warn('[daily-report]', emailSkipped);
    } else {
      await mailer.transporter.sendMail({
        from: `"StockPro System" <${mailer.from}>`,
        to: recipients.join(', '),
        subject: `📊 รายงานประจำวัน ${dateLabel}`,
        html,
      });
      emailedTo = recipients;
    }

    return NextResponse.json({
      ok: true,
      dateKey,
      emailedTo,
      emailSkipped,
      summary: { completed: summary.completedCount, pending: summary.pendingCount, lowStock: lowStock.length },
    });
  } catch (error) {
    console.error('[daily-report] failed:', error?.message || error);
    return NextResponse.json({ ok: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
