import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://stock-jin-app.vercel.app';

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

function formatThaiDate(dateInput) {
  if (!dateInput) return '-';
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  const day = d.getDate();
  const month = THAI_MONTHS[d.getMonth()];
  const year = d.getFullYear() + 543;
  return `${day} ${month} พ.ศ. ${year}`;
}

function getPriorityLabel(priority) {
  switch (priority) {
    case 'urgent': return { label: 'ด่วนมาก', color: '#dc2626', bg: '#fee2e2' };
    case 'high': return { label: 'สำคัญ', color: '#d97706', bg: '#fef3c7' };
    case 'low': return { label: 'ทั่วไป', color: '#64748b', bg: '#f1f5f9' };
    default: return { label: 'ปกติ', color: '#4f46e5', bg: '#e0e7ff' };
  }
}

function getLeaveTypeLabel(type) {
  switch (type) {
    case 'sick': return 'ลาป่วย';
    case 'personal': return 'ลากิจ';
    case 'vacation': return 'ลาพักร้อน';
    default: return type || 'การลา';
  }
}

// -------------------------------------------------------------
// HTML Email Templates
// -------------------------------------------------------------
function generateTaskAssignedHtml({ task, currentUser }) {
  const priorityInfo = getPriorityLabel(task.priority);
  const targetLabel = task.targetType === 'user' 
    ? (task.targetUserName || 'พนักงาน') 
    : (task.targetPosition || 'ทุกคน');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Sarabun', 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); color: #ffffff; padding: 28px 32px; text-align: left; }
        .logo { font-size: 24px; font-weight: 900; letter-spacing: 0.5px; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 800; text-transform: uppercase; margin-top: 12px; }
        .content { padding: 32px; }
        .title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 16px; line-height: 1.4; }
        .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px 20px; margin-bottom: 24px; }
        .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #edf2f7; font-size: 13.5px; }
        .info-row:last-child { border-bottom: none; }
        .info-label { color: #64748b; font-weight: 600; }
        .info-value { color: #0f172a; font-weight: 700; text-align: right; }
        .desc-box { background: #faf5ff; border: 1px solid #f3e8ff; border-radius: 12px; padding: 16px; margin-bottom: 28px; font-size: 13.5px; color: #581c87; line-height: 1.6; }
        .btn { display: block; text-align: center; background: #6355d8; color: #ffffff !important; padding: 14px 28px; border-radius: 12px; font-weight: 800; font-size: 14px; text-decoration: none; box-shadow: 0 4px 12px rgba(99, 85, 216, 0.25); }
        .footer { padding: 20px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">📦 StockPro Tasks</div>
          <div style="font-size: 13px; opacity: 0.85; margin-top: 4px;">ระบบแจ้งเตือนการสั่งงานและ To-Do List อัตโนมัติ</div>
          <span class="badge" style="background: ${priorityInfo.bg}; color: ${priorityInfo.color};">
            ความสำคัญ: ${priorityInfo.label}
          </span>
        </div>
        <div class="content">
          <h2 class="title">คุณได้รับมอบหมายงานใหม่ 🎯</h2>
          <div class="info-card">
            <table style="width: 100%; border-collapse: collapse; font-size: 13.5px;">
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">ชื่องาน:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 700; text-align: right;">${task.title}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">ผู้รับผิดชอบ:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 700; text-align: right;">${targetLabel}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">กำหนดส่ง (Due Date):</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 700; text-align: right;">${task.dueDate || 'วันนี้'} ${task.dueTime ? task.dueTime + ' น.' : ''}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">ผู้สั่งงาน:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 700; text-align: right;">${currentUser?.name || task.createdByName || 'ผู้ดูแลระบบ'}</td>
              </tr>
            </table>
          </div>

          ${task.description ? `
            <div style="font-weight: 700; font-size: 13px; color: #475569; margin-bottom: 6px;">รายละเอียดงาน / คำสั่งเพิ่มเติม:</div>
            <div class="desc-box">${task.description}</div>
          ` : ''}

          <a href="${APP_URL}" class="btn">🚀 เข้าสู่ระบบเพื่อดูงานและอัปเดตความคืบหน้า</a>
        </div>
        <div class="footer">
          อีเมลนี้ถูกส่งจากระบบ StockPro Team & Task Management โดยอัตโนมัติ<br>
          หากมีข้อสงสัยกรุณาติดต่อผู้มอบหมายงานหรือผู้ดูแลระบบ
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateLeaveSubmittedHtml({ leave }) {
  const leaveLabel = getLeaveTypeLabel(leave.leaveType || leave.type);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Sarabun', 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%); color: #ffffff; padding: 28px 32px; text-align: left; }
        .logo { font-size: 24px; font-weight: 900; letter-spacing: 0.5px; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 800; background: #fef3c7; color: #b45309; margin-top: 12px; }
        .content { padding: 32px; }
        .title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 16px; line-height: 1.4; }
        .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px 20px; margin-bottom: 24px; }
        .desc-box { background: #eff6ff; border: 1px solid #dbeafe; border-radius: 12px; padding: 16px; margin-bottom: 28px; font-size: 13.5px; color: #1e40af; line-height: 1.6; }
        .btn { display: block; text-align: center; background: #4338ca; color: #ffffff !important; padding: 14px 28px; border-radius: 12px; font-weight: 800; font-size: 14px; text-decoration: none; box-shadow: 0 4px 12px rgba(67, 56, 202, 0.25); }
        .footer { padding: 20px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">📋 StockPro HR System</div>
          <div style="font-size: 13px; opacity: 0.85; margin-top: 4px;">ระบบแจ้งเตือนคำขอลาบุคลากรสำหรับผู้ดูแลระบบ</div>
          <span class="badge">● มีคำขอลาใหม่รอพิจารณา</span>
        </div>
        <div class="content">
          <h2 class="title">มีคำขอลาใหม่จากพนักงาน รอการอนุมัติ ✍️</h2>
          <div class="info-card">
            <table style="width: 100%; border-collapse: collapse; font-size: 13.5px;">
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">พนักงานผู้ขอลา:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 700; text-align: right;">${leave.userName}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">ตำแหน่ง / แผนก:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 700; text-align: right;">${leave.position || 'พนักงาน'} (${leave.department || 'ทั่วไป'})</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">ประเภทการลา:</td>
                <td style="padding: 8px 0; color: #4338ca; font-weight: 700; text-align: right;">${leaveLabel}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">ช่วงวันที่ขอลา:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 700; text-align: right;">${leave.startDate} ถึง ${leave.endDate}</td>
              </tr>
            </table>
          </div>

          <div style="font-weight: 700; font-size: 13px; color: #475569; margin-bottom: 6px;">เหตุผลความจำเป็นในการลา:</div>
          <div class="desc-box">${leave.reason || 'มีความจำเป็นส่วนตัว'}</div>

          <a href="${APP_URL}" class="btn">🔍 เข้าสู่ระบบเพื่อตรวจสอบเอกสารใบลาและลงนามอนุมัติ</a>
        </div>
        <div class="footer">
          อีเมลนี้ถูกส่งถึงผู้ดูแลระบบและผู้จัดการโดยอัตโนมัติ<br>
          StockPro Inventory & Human Resources Management System
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateLeaveDecisionHtml({ leave }) {
  const isApproved = leave.status === 'approved';
  const leaveLabel = getLeaveTypeLabel(leave.leaveType || leave.type);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Sarabun', 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
        .header { background: ${isApproved ? 'linear-gradient(135deg, #14532d 0%, #16a34a 100%)' : 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)'}; color: #ffffff; padding: 28px 32px; text-align: left; }
        .logo { font-size: 24px; font-weight: 900; letter-spacing: 0.5px; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 800; background: #ffffff; color: ${isApproved ? '#15803d' : '#b91c1c'}; margin-top: 12px; }
        .content { padding: 32px; }
        .title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 16px; line-height: 1.4; }
        .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px 20px; margin-bottom: 24px; }
        .desc-box { background: ${isApproved ? '#f0fdf4' : '#fef2f2'}; border: 1px solid ${isApproved ? '#bbf7d0' : '#fecaca'}; border-radius: 12px; padding: 16px; margin-bottom: 28px; font-size: 13.5px; color: ${isApproved ? '#166534' : '#991b1b'}; line-height: 1.6; }
        .btn { display: block; text-align: center; background: ${isApproved ? '#16a34a' : '#dc2626'}; color: #ffffff !important; padding: 14px 28px; border-radius: 12px; font-weight: 800; font-size: 14px; text-decoration: none; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .footer { padding: 20px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">📋 StockPro HR System</div>
          <div style="font-size: 13px; opacity: 0.85; margin-top: 4px;">แจ้งเตือนผลการพิจารณาคำขอลาอย่างเป็นทางการ</div>
          <span class="badge">${isApproved ? '✓ ได้รับการอนุมัติแล้ว' : '✕ ไม่อนุมัติคำขอ'}</span>
        </div>
        <div class="content">
          <h2 class="title">เรียนคุณ ${leave.userName || 'พนักงาน'}</h2>
          <p style="font-size: 14px; color: #475569; margin-top: 0; margin-bottom: 18px;">
            คำขออนุญาต<strong>${leaveLabel}</strong> ประจำวันที่ <strong>${leave.startDate} ถึง ${leave.endDate}</strong> ของคุณ ได้รับการพิจารณาเรียบร้อยแล้ว
          </p>

          <div class="info-card">
            <table style="width: 100%; border-collapse: collapse; font-size: 13.5px;">
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">ผลการพิจารณา:</td>
                <td style="padding: 8px 0; color: ${isApproved ? '#16a34a' : '#dc2626'}; font-weight: 800; text-align: right;">${isApproved ? 'อนุมัติเรียบร้อย' : 'ไม่อนุมัติ'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">ผู้อนุมัติ:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 700; text-align: right;">${leave.approverName || 'ผู้ดูแลระบบ'} (${leave.approverPosition || 'ผู้จัดการ'})</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">ช่วงเวลาที่ลา:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 700; text-align: right;">${leave.startDate} ถึง ${leave.endDate}</td>
              </tr>
            </table>
          </div>

          ${leave.approverNote ? `
            <div style="font-weight: 700; font-size: 13px; color: #475569; margin-bottom: 6px;">บันทึก/ความเห็นผู้อนุมัติ:</div>
            <div class="desc-box">${leave.approverNote}</div>
          ` : ''}

          <a href="${APP_URL}" class="btn">📄 ตรวจสอบและดาวน์โหลดเอกสารใบลาทางการ</a>
        </div>
        <div class="footer">
          อีเมลนี้ถูกส่งจากระบบ StockPro HR System โดยอัตโนมัติ
        </div>
      </div>
    </body>
    </html>
  `;
}

// -------------------------------------------------------------
// POST /api/notify-email
// -------------------------------------------------------------
export async function POST(request) {
  try {
    const body = await request.json();
    const { type, to, subject, data = {}, customHtml } = body;

    const smtpHost = process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = Number(process.env.EMAIL_PORT || process.env.SMTP_PORT || 465);
    const smtpUser = process.env.EMAIL_USER || process.env.SMTP_USER;
    const smtpPass = process.env.EMAIL_PASS || process.env.SMTP_PASS;
    const adminEmails = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || smtpUser || '')
      .split(',')
      .map(e => e.trim())
      .filter(Boolean);

    // If SMTP is not yet configured, log and return graceful simulated success
    if (!smtpUser || !smtpPass) {
      console.log('ℹ️ [Email Service Notice]: SMTP credentials (EMAIL_USER / EMAIL_PASS) are not configured in .env.local yet.');
      console.log('📬 Simulated Email Dispatch:', {
        type,
        intendedTo: to || (type === 'leave_submitted' ? adminEmails : 'user'),
        subject: subject || (type === 'task_assigned' ? `[StockPro] มอบหมายงาน: ${data?.title}` : `[StockPro] แจ้งเตือน: ${type}`),
        dataSummary: { title: data?.title, user: data?.userName || data?.targetUserName, status: data?.status }
      });
      return NextResponse.json({
        success: true,
        simulated: true,
        message: 'Email service ready! To send live emails, configure EMAIL_USER and EMAIL_PASS (App Password) in .env.local',
      });
    }

    // Configure Nodemailer Transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true for 465, false for 587
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    let mailTo = to;
    let mailSubject = subject;
    let mailHtml = customHtml;

    if (type === 'task_assigned') {
      mailSubject = mailSubject || `🎯 [StockPro] คุณได้รับมอบหมายงานใหม่: ${data.title || ''}`;
      mailHtml = generateTaskAssignedHtml({ task: data, currentUser: data.currentUser });
    } else if (type === 'leave_submitted') {
      mailTo = mailTo || adminEmails;
      mailSubject = mailSubject || `📋 [StockPro] มีคำขอลาใหม่จาก ${data.userName || 'พนักงาน'} รอการพิจารณา`;
      mailHtml = generateLeaveSubmittedHtml({ leave: data });
    } else if (type === 'leave_decision') {
      const isApprove = data.status === 'approved';
      mailSubject = mailSubject || `📋 [StockPro] ผลการพิจารณาคำขอลาของคุณ: ${isApprove ? '✅ อนุมัติแล้ว' : '❌ ไม่อนุมัติ'}`;
      mailHtml = generateLeaveDecisionHtml({ leave: data });
    }

    if (!mailTo || (Array.isArray(mailTo) && mailTo.length === 0)) {
      return NextResponse.json({
        success: false,
        error: 'No recipient email specified and no default admin email available.'
      }, { status: 400 });
    }

    // Send Mail
    const info = await transporter.sendMail({
      from: `"StockPro System" <${smtpUser}>`,
      to: Array.isArray(mailTo) ? mailTo.join(', ') : mailTo,
      subject: mailSubject,
      html: mailHtml,
    });

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      accepted: info.accepted,
    });

  } catch (error) {
    console.error('Email Dispatch Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal Server Error',
    }, { status: 500 });
  }
}
