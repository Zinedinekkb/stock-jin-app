// app/utils/transactionPdfGenerator.js
'use client';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export function formatThaiDate(dateInput) {
  if (!dateInput) return '................................';
  const d = dateInput instanceof Date ? dateInput : (dateInput?.toDate ? dateInput.toDate() : new Date(dateInput));
  if (isNaN(d.getTime())) return String(dateInput);
  const day = d.getDate();
  const month = THAI_MONTHS[d.getMonth()];
  const year = d.getFullYear() + 543;
  return `${day} ${month} พ.ศ. ${year}`;
}

export function formatThaiTime(dateInput) {
  const d = dateInput instanceof Date ? dateInput : (dateInput?.toDate ? dateInput.toDate() : new Date(dateInput));
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' น.';
}

export function generateDocNumber(type, id, timestamp) {
  const d = timestamp ? new Date(timestamp) : new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}${mm}${dd}`;
  const suffix = (id || String(Date.now())).slice(-4).toUpperCase();
  const prefix = type === 'IN' ? 'GRN' : 'GIS';
  return `${prefix}-${dateStr}-${suffix}`;
}

/**
 * Builds HTML string for the official A4 Transaction Document
 */
export function buildTransactionHtml(transaction, options = {}) {
  const {
    organizationName = 'บริษัท สต็อกโปร ซิสเต็มส์ จำกัด (มหาชน)',
    warehouseName = 'คลังสินค้าและพัสดุส่วนกลาง (Main Warehouse Hub)',
    customApproverName = '',
    customApproverPosition = '',
  } = options;

  const isModeIn = transaction.type === 'IN';
  const isCompleted = transaction.status === 'completed';
  const docNumber = transaction.docNumber || generateDocNumber(transaction.type, transaction.id, transaction.timestamp);

  const rawDate = transaction.timestamp ? new Date(transaction.timestamp) : (transaction.date ? new Date(transaction.date) : new Date());
  const formattedDate = formatThaiDate(rawDate);
  const formattedTime = formatThaiTime(rawDate);

  const items = transaction.items || [];
  const actualItems = transaction.actualItems || {};

  let totalRequestedQty = 0;
  let totalActualQty = 0;

  items.forEach(it => {
    const req = Number(it.qty) || 0;
    const act = (actualItems[it.id] !== undefined) ? Number(actualItems[it.id]) : (isCompleted ? req : req);
    totalRequestedQty += req;
    totalActualQty += act;
  });

  const verifiedByName = customApproverName || transaction.verifiedBy || (isCompleted ? 'ผู้จัดการคลังสินค้า' : '');
  const verifiedAtText = transaction.verifiedAt || (isCompleted ? formattedDate : '');

  const docTitleThai = isModeIn 
    ? 'ใบนำส่งและตรวจรับพัสดุ / สินค้าเข้าคลัง' 
    : 'ใบขอเบิกและจ่ายพัสดุ / สินค้าออกจากคลัง';
  const docTitleEng = isModeIn 
    ? 'GOODS RECEIPT NOTE (GRN)' 
    : 'GOODS REQUISITION & ISSUE SLIP (GIS)';

  const primaryColor = isModeIn ? '#15803d' : '#b91c1c'; // green-700 or red-700
  const headerBgGradient = isModeIn 
    ? 'linear-gradient(135deg, #166534 0%, #15803d 100%)' 
    : 'linear-gradient(135deg, #991b1b 0%, #dc2626 100%)';

  const rowsHtml = items.map((item, idx) => {
    const actQty = actualItems[item.id] !== undefined ? actualItems[item.id] : (isCompleted ? item.qty : '-');
    const isQtyDiff = isCompleted && actualItems[item.id] !== undefined && Number(actualItems[item.id]) !== Number(item.qty);
    return `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 13px; line-height: 1.5;">
        <td style="padding: 9px 8px; text-align: center; color: #64748b; font-weight: 600;">${idx + 1}</td>
        <td style="padding: 9px 10px; font-family: monospace; font-size: 12px; color: #475569;">${item.sku || '-'}</td>
        <td style="padding: 9px 10px; font-weight: 600; color: #1e293b;">
          ${item.name}
          ${item.note ? `<div style="font-size: 11px; color: #64748b; font-weight: normal; margin-top: 2px;">หมายเหตุ: ${item.note}</div>` : ''}
        </td>
        <td style="padding: 9px 10px; color: #64748b; font-size: 12px;">${item.category || '-'}</td>
        <td style="padding: 9px 10px; text-align: center; font-weight: 600; color: #1e293b;">${Number(item.qty).toLocaleString()}</td>
        <td style="padding: 9px 10px; text-align: center; font-weight: 700; color: ${isQtyDiff ? '#ea580c' : isCompleted ? '#166534' : '#64748b'};">
          ${isCompleted ? Number(actQty).toLocaleString() : (isQtyDiff ? Number(actQty).toLocaleString() : '-')}
        </td>
        <td style="padding: 9px 8px; text-align: center; color: #475569;">${item.unit || 'ชิ้น'}</td>
        <td style="padding: 9px 10px; font-size: 11px; color: #64748b;">${item.remark || '-'}</td>
      </tr>
    `;
  }).join('');

  return `
    <div style="
      width: 794px;
      min-height: 1123px;
      background: #ffffff;
      color: #0f172a;
      font-family: 'Sarabun', 'TH Sarabun New', -apple-system, BlinkMacSystemFont, sans-serif;
      padding: 44px 50px;
      box-sizing: border-box;
      position: relative;
      margin: 0 auto;
    ">
      <!-- TOP EMBLEM & HEADER -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 16px; border-bottom: 2px solid #0f172a;">
        <div style="display: flex; gap: 16px; align-items: center;">
          <!-- Emblem / Logo Box -->
          <div style="
            width: 60px;
            height: 60px;
            border-radius: 12px;
            background: #0f172a;
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 900;
            font-size: 26px;
            box-shadow: 0 4px 10px rgba(15, 23, 42, 0.2);
            flex-shrink: 0;
          ">
            📦
          </div>
          <div>
            <div style="font-size: 16px; font-weight: 800; color: #0f172a; letter-spacing: 0.5px;">
              ${organizationName}
            </div>
            <div style="font-size: 12px; color: #475569; margin-top: 2px; font-weight: 500;">
              STOCKPRO INVENTORY MANAGEMENT SYSTEM
            </div>
            <div style="font-size: 11px; color: #64748b; margin-top: 1px;">
              ${warehouseName} · เอกสารคลังพัสดุทางการ
            </div>
          </div>
        </div>

        <!-- Document Number & Meta Box -->
        <div style="
          text-align: right;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 8px 14px;
          min-width: 210px;
        ">
          <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">
            เลขที่เอกสาร / DOCUMENT NO.
          </div>
          <div style="font-size: 15px; font-weight: 800; color: ${primaryColor}; font-family: monospace; letter-spacing: 0.5px; margin-top: 2px;">
            ${docNumber}
          </div>
          <div style="font-size: 11px; color: #475569; margin-top: 4px; font-weight: 600;">
            วันที่: ${formattedDate}
          </div>
          <div style="font-size: 10px; color: #64748b; margin-top: 1px;">
            เวลาบันทึก: ${formattedTime}
          </div>
        </div>
      </div>

      <!-- DOCUMENT TITLE BANNER -->
      <div style="
        margin-top: 20px;
        background: ${headerBgGradient};
        color: #ffffff;
        padding: 12px 18px;
        border-radius: 10px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      ">
        <div>
          <div style="font-size: 16px; font-weight: 800; letter-spacing: 0.5px;">
            ${docTitleThai}
          </div>
          <div style="font-size: 11px; opacity: 0.9; font-weight: 600; letter-spacing: 0.8px;">
            ${docTitleEng}
          </div>
        </div>
        <div style="
          background: #ffffff;
          color: ${primaryColor};
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.1);
        ">
          ${isCompleted ? '● ผ่านการตรวจสอบ / อนุมัติแล้ว' : '○ คำขอรอการตรวจรับ'}
        </div>
      </div>

      <!-- TRANSACTION DETAILS INFO GRID -->
      <div style="
        margin-top: 18px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 14px 18px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px 24px;
        font-size: 12.5px;
      ">
        <div>
          <span style="color: #64748b; font-weight: 600;">ผู้ทำรายการ / ผู้ขอเบิก:</span>
          <span style="font-weight: 700; color: #0f172a; margin-left: 6px;">${transaction.recorder || 'เจ้าหน้าที่'}</span>
        </div>
        <div>
          <span style="color: #64748b; font-weight: 600;">ประเภทรายการ:</span>
          <span style="font-weight: 700; color: ${primaryColor}; margin-left: 6px;">
            ${isModeIn ? '📥 รับเข้าสินค้า (STOCK IN)' : '📤 เบิกออกสินค้า (STOCK OUT)'}
          </span>
        </div>
        <div>
          <span style="color: #64748b; font-weight: 600;">แผนก / สายงาน:</span>
          <span style="font-weight: 600; color: #1e293b; margin-left: 6px;">ฝ่ายปฏิบัติการและคลังสินค้า</span>
        </div>
        <div>
          <span style="color: #64748b; font-weight: 600;">ผู้ตรวจรับ / ผู้อนุมัติ:</span>
          <span style="font-weight: 600; color: #1e293b; margin-left: 6px;">${verifiedByName || 'รอการอนุมัติ'}</span>
        </div>
        <div style="grid-column: span 2;">
          <span style="color: #64748b; font-weight: 600;">วัตถุประสงค์ / หมายเหตุ:</span>
          <span style="font-weight: 600; color: #334155; margin-left: 6px;">${transaction.note || 'เพื่อใช้ในการปฏิบัติหน้าที่ตามปกติ'}</span>
        </div>
      </div>

      <!-- ITEMS TABLE -->
      <div style="margin-top: 22px;">
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background: #0f172a; color: #ffffff; font-size: 12px; text-transform: uppercase;">
              <th style="padding: 10px 8px; width: 42px; text-align: center;">ลำดับ</th>
              <th style="padding: 10px 10px; width: 85px; text-align: left;">รหัส SKU</th>
              <th style="padding: 10px 10px; text-align: left;">รายการพัสดุ / สินค้า</th>
              <th style="padding: 10px 10px; width: 95px; text-align: left;">หมวดหมู่</th>
              <th style="padding: 10px 10px; width: 75px; text-align: center;">ยอดขอ</th>
              <th style="padding: 10px 10px; width: 75px; text-align: center;">ยอดจริง</th>
              <th style="padding: 10px 8px; width: 55px; text-align: center;">หน่วย</th>
              <th style="padding: 10px 10px; width: 80px; text-align: left;">หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td colspan="8" style="padding: 24px; text-align: center; color: #94a3b8;">ไม่มีรายการสินค้า</td></tr>`}
          </tbody>
          <tfoot>
            <tr style="background: #f1f5f9; font-weight: 800; font-size: 13px; border-top: 2px solid #cbd5e1;">
              <td colspan="4" style="padding: 10px 12px; text-align: right; color: #334155;">
                รวมทั้งหมด (${items.length} รายการ):
              </td>
              <td style="padding: 10px; text-align: center; color: #0f172a;">${totalRequestedQty.toLocaleString()}</td>
              <td style="padding: 10px; text-align: center; color: ${isCompleted ? '#166534' : '#64748b'};">
                ${isCompleted ? totalActualQty.toLocaleString() : '-'}
              </td>
              <td colspan="2" style="padding: 10px 12px; color: #64748b; font-size: 11px;">หน่วยสินค้า</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- SIGNATURE SECTION (3 BOXES) -->
      <div style="margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;">
        <!-- Box 1: Requester / Submitter -->
        <div style="
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 14px 12px;
          text-align: center;
          background: #ffffff;
        ">
          <div style="font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 24px;">
            ${isModeIn ? 'ผู้ส่งมอบสินค้า / ผู้แจ้งรับ' : 'ผู้ขอเบิกพัสดุ'}
          </div>
          <div style="border-bottom: 1px dotted #94a3b8; width: 80%; margin: 0 auto 6px; height: 18px;">
            <span style="font-size: 12px; font-weight: 600; color: #1e293b;">${transaction.recorder || ''}</span>
          </div>
          <div style="font-size: 11.5px; font-weight: 700; color: #1e293b;">
            (${transaction.recorder || '...................................................'})
          </div>
          <div style="font-size: 10.5px; color: #64748b; margin-top: 2px;">
            ตำแหน่ง: เจ้าหน้าที่ปฏิบัติการ
          </div>
          <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
            วันที่: ${formattedDate}
          </div>
        </div>

        <!-- Box 2: Warehouse Staff / Issuer -->
        <div style="
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 14px 12px;
          text-align: center;
          background: #ffffff;
        ">
          <div style="font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 24px;">
            ${isModeIn ? 'เจ้าหน้าที่คลังผู้ตรวจรับ' : 'เจ้าหน้าที่คลังผู้จ่ายพัสดุ'}
          </div>
          <div style="border-bottom: 1px dotted #94a3b8; width: 80%; margin: 0 auto 6px; height: 18px;">
            <span style="font-size: 12px; font-weight: 600; color: #1e293b;">${isCompleted ? (verifiedByName || 'เจ้าหน้าที่คลัง') : ''}</span>
          </div>
          <div style="font-size: 11.5px; font-weight: 700; color: #1e293b;">
            (${isCompleted ? (verifiedByName || 'เจ้าหน้าที่คลังสินค้า') : '...................................................'})
          </div>
          <div style="font-size: 10.5px; color: #64748b; margin-top: 2px;">
            ตำแหน่ง: เจ้าหน้าที่คลังสินค้า
          </div>
          <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
            วันที่: ${verifiedAtText || '............/............/............'}
          </div>
        </div>

        <!-- Box 3: Approver / Supervisor -->
        <div style="
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 14px 12px;
          text-align: center;
          background: #ffffff;
        ">
          <div style="font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 24px;">
            ผู้มีอำนาจอนุมัติ / หัวหน้างาน
          </div>
          <div style="border-bottom: 1px dotted #94a3b8; width: 80%; margin: 0 auto 6px; height: 18px;">
            <span style="font-size: 12px; font-weight: 600; color: #1e293b;">${isCompleted ? (verifiedByName || 'ผู้จัดการฝ่าย') : ''}</span>
          </div>
          <div style="font-size: 11.5px; font-weight: 700; color: #1e293b;">
            (${isCompleted ? (verifiedByName || 'ผู้จัดการฝ่าย') : '...................................................'})
          </div>
          <div style="font-size: 10.5px; color: #64748b; margin-top: 2px;">
            ตำแหน่ง: ผู้จัดการ / ผู้ดูแลระบบ
          </div>
          <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
            วันที่: ${verifiedAtText || '............/............/............'}
          </div>
        </div>
      </div>

      <!-- DIGITAL STAMP EMBED -->
      ${isCompleted ? `
        <div style="
          position: absolute;
          right: 60px;
          bottom: 140px;
          border: 3px double #16a34a;
          color: #16a34a;
          border-radius: 14px;
          padding: 8px 16px;
          text-align: center;
          font-weight: 900;
          font-size: 13px;
          letter-spacing: 1.5px;
          transform: rotate(-10deg);
          background: rgba(240, 253, 244, 0.85);
          box-shadow: 0 4px 12px rgba(22, 163, 74, 0.15);
          pointer-events: none;
        ">
          <div>★ STOCKPRO VERIFIED ★</div>
          <div style="font-size: 10px; font-weight: 700; letter-spacing: 0.5px; margin-top: 2px;">
            อนุมัติและปรับยอดสต็อกแล้ว
          </div>
          <div style="font-size: 9px; font-weight: 500; margin-top: 1px;">
            ${verifiedAtText || formattedDate}
          </div>
        </div>
      ` : ''}

      <!-- FOOTER & AUDIT TRAIL -->
      <div style="
        position: absolute;
        bottom: 24px;
        left: 50px;
        right: 50px;
        border-top: 1px solid #e2e8f0;
        padding-top: 10px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 9.5px;
        color: #94a3b8;
      ">
        <div>
          เอกสารนี้สร้างขึ้นโดยระบบสารสนเทศอัตโนมัติ StockPro Inventory System (ใบสำคัญทางการ)
        </div>
        <div>
          System Ref ID: ${transaction.id || '-'} · ${docNumber}
        </div>
      </div>
    </div>
  `;
}

/**
 * Renders an A4 HTML string (794px wide, inline styles) into a jsPDF document via html2canvas.
 * Shared by transaction documents and business document templates.
 */
export async function renderHtmlToPdf(html) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('renderHtmlToPdf must be run in browser environment');
  }
  // Temporary off-screen container in the DOM
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '0';
  container.style.top = '0';
  container.style.opacity = '0.01';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '-99999';
  container.style.background = '#ffffff';
  container.style.width = '794px';
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container.firstElementChild || container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.88);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    // Multi-page handling
    let heightLeft = pdfHeight - pageHeight;
    let position = 0;
    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }
    return pdf;
  } finally {
    if (container.parentNode) container.parentNode.removeChild(container);
  }
}

/**
 * Generates jsPDF and Blob from transaction data via html2canvas
 */
export async function generateTransactionPdfBlob(transaction, options = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('generateTransactionPdfBlob must be run in browser environment');
  }

  const docNumber = transaction.docNumber || generateDocNumber(transaction.type, transaction.id, transaction.timestamp);
  const isModeIn = transaction.type === 'IN';
  const prefix = isModeIn ? 'ใบรับสินค้า' : 'ใบเบิกสินค้า';
  const fileName = `${prefix}_${docNumber}.pdf`;

  const pdf = await renderHtmlToPdf(buildTransactionHtml({ ...transaction, docNumber }, options));

  return {
    pdf,
    blob: pdf.output('blob'),
    dataUri: pdf.output('datauristring'),
    docNumber,
    fileName,
  };
}

/**
 * Uploads a PDF to Firebase Storage with a 2.5s timeout; falls back to the data URI so saving never blocks.
 */
export async function uploadPdfOrDataUri(blob, storagePath, dataUri) {
  try {
    const storageRef = ref(storage, storagePath);
    const uploadTask = (async () => {
      await uploadBytes(storageRef, blob, { contentType: 'application/pdf' });
      return await getDownloadURL(storageRef);
    })();
    const timeoutTask = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Storage timeout')), 2500)
    );
    return await Promise.race([uploadTask, timeoutTask]);
  } catch (storageErr) {
    console.warn('Storage unavailable or timed out for PDF, using Data URI fallback:', storageErr);
    return dataUri;
  }
}

/**
 * Generates official PDF and automatically stores it into Firebase Storage & Firestore collection 'documents'
 */
export async function uploadAndSaveTransactionDocument({ transaction, user, isVerified = false, options = {} }) {
  try {
    const { blob, dataUri, docNumber, fileName } = await generateTransactionPdfBlob(transaction, options);

    const isModeIn = transaction.type === 'IN';
    const category = isModeIn ? 'order' : 'receipt';
    const cleanDocNumber = docNumber;
    const storageFileName = `${fileName.replace(/\.pdf$/i, '')}_${Date.now()}.pdf`;

    const downloadUrl = await uploadPdfOrDataUri(blob, `documents/transactions/${storageFileName}`, dataUri);

    const itemCount = (transaction.items || []).length;
    const actionLabel = isModeIn ? 'รับเข้าสินค้า' : 'เบิกออกสินค้า';
    const statusLabel = isVerified || transaction.status === 'completed' ? 'อนุมัติแล้ว' : 'รอตรวจสอบ';
    const noteText = `เอกสารทางการ: ใบ${actionLabel} เลขที่ ${cleanDocNumber} (${itemCount} รายการ) โดย ${transaction.recorder || user?.name || 'พนักงาน'} [สถานะ: ${statusLabel}]`;

    // Check if document record already exists for this transaction (e.g. from pending state to completed)
    let existingDocId = null;
    if (transaction.id) {
      try {
        const qDocs = query(collection(db, 'documents'), where('transactionId', '==', transaction.id));
        const snap = await getDocs(qDocs);
        if (!snap.empty) {
          existingDocId = snap.docs[0].id;
        }
      } catch (err) {
        console.warn('Error querying existing document:', err);
      }
    }

    const docPayload = {
      name: fileName,
      url: downloadUrl,
      category: category,
      note: noteText,
      createdBy: user?.name || transaction.recorder || 'ระบบอัตโนมัติ',
      transactionId: transaction.id || '',
      docNumber: cleanDocNumber,
      type: transaction.type,
      status: isVerified || transaction.status === 'completed' ? 'completed' : 'pending',
      fileSizeKb: Math.round(blob.size / 1024),
      starred: false,
      updatedAt: serverTimestamp(),
    };

    if (existingDocId) {
      await updateDoc(doc(db, 'documents', existingDocId), docPayload);
    } else {
      docPayload.createdAt = serverTimestamp();
      await addDoc(collection(db, 'documents'), docPayload);
    }

    // Also update transaction in 'transactions' collection with docNumber and pdfUrl if possible
    if (transaction.id) {
      try {
        await updateDoc(doc(db, 'transactions', transaction.id), {
          docNumber: cleanDocNumber,
          pdfUrl: downloadUrl,
          hasPdfDocument: true,
        });
      } catch (txErr) {
        console.warn('Could not update transaction with docNumber:', txErr);
      }
    }

    return {
      success: true,
      docNumber: cleanDocNumber,
      downloadUrl,
      fileName,
    };
  } catch (err) {
    console.error('Error generating and saving transaction document:', err);
    throw err;
  }
}
