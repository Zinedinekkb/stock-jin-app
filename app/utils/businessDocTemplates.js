// app/utils/businessDocTemplates.js
// A4 business document templates (purchase order, quotation, invoice, receipt, payment voucher, petty-cash advance).
// HTML uses inline styles at 794px wide so html2canvas renders it the same as the preview.
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { renderHtmlToPdf, uploadPdfOrDataUri, formatThaiDate } from './transactionPdfGenerator';

// Each type: what the document is called, who the other party is, and which blocks it shows
export const BUSINESS_DOC_TYPES = [
  {
    key: 'PO', title: 'ใบสั่งซื้อ', titleEn: 'PURCHASE ORDER', category: 'order',
    partyLabel: 'ผู้ขาย / ซัพพลายเออร์', hasItems: true, hasVat: true, accent: '#4636a6',
    desc: 'สั่งซื้อสินค้าหรือวัตถุดิบจากผู้ขาย',
    signatures: ['ผู้จัดทำ', 'ผู้อนุมัติสั่งซื้อ', 'ผู้ขายรับทราบ'],
  },
  {
    key: 'QT', title: 'ใบเสนอราคา', titleEn: 'QUOTATION', category: 'sales',
    partyLabel: 'ลูกค้า', hasItems: true, hasVat: true, accent: '#0f766e',
    desc: 'เสนอราคาสินค้าหรือบริการให้ลูกค้า',
    signatures: ['ผู้เสนอราคา', 'ผู้อนุมัติ', 'ลูกค้ายืนยันสั่งซื้อ'], showValidity: true,
  },
  {
    key: 'IV', title: 'ใบแจ้งหนี้ / ใบส่งของ', titleEn: 'INVOICE / DELIVERY NOTE', category: 'sales',
    partyLabel: 'ลูกค้า', hasItems: true, hasVat: true, accent: '#1d4ed8',
    desc: 'ใบขาย: ส่งสินค้าและแจ้งยอดที่ลูกค้าต้องชำระ',
    signatures: ['ผู้ส่งของ', 'ผู้รับของ', 'ผู้มีอำนาจลงนาม'], showDueDate: true,
  },
  {
    key: 'RC', title: 'ใบเสร็จรับเงิน', titleEn: 'RECEIPT', category: 'receipt',
    partyLabel: 'ได้รับเงินจาก', hasItems: true, hasVat: true, accent: '#047857',
    desc: 'หลักฐานว่าร้านได้รับเงินจากลูกค้าแล้ว',
    signatures: ['ผู้รับเงิน', 'ผู้มีอำนาจลงนาม'], showPayment: true,
  },
  {
    key: 'PV', title: 'ใบสำคัญจ่าย', titleEn: 'PAYMENT VOUCHER', category: 'payment',
    partyLabel: 'จ่ายให้', hasItems: true, hasVat: false, accent: '#b45309',
    desc: 'บันทึกการจ่ายเงินของร้าน เช่น ค่าวัตถุดิบ ค่าซ่อม',
    signatures: ['ผู้จัดทำ', 'ผู้อนุมัติจ่าย', 'ผู้รับเงิน'], showPayment: true,
  },
  {
    key: 'AD', title: 'ใบเบิกเงินสำรองจ่าย', titleEn: 'PETTY CASH / ADVANCE REQUEST', category: 'payment',
    partyLabel: 'ผู้ขอเบิก', hasItems: true, hasVat: false, accent: '#be123c',
    desc: 'ขอเบิกเงินสดล่วงหน้าไปซื้อของ แล้วนำใบเสร็จมาเคลียร์',
    signatures: ['ผู้ขอเบิก', 'ผู้อนุมัติ', 'ผู้จ่ายเงิน'], showPurpose: true,
  },
];

export const getDocType = (key) => BUSINESS_DOC_TYPES.find(t => t.key === key) || BUSINESS_DOC_TYPES[0];

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const makeDocNumber = (typeKey, dateISO = todayISO()) => {
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${typeKey}-${dateISO.replace(/-/g, '')}-${rand}`;
};

export const emptyItem = () => ({ name: '', qty: 1, unit: '', price: 0 });

export const blankDocData = (typeKey, shop = {}) => ({
  docNumber: makeDocNumber(typeKey),
  date: todayISO(),
  dueDate: '',
  shopName: shop.shopName || '',
  shopAddress: shop.shopAddress || '',
  shopTaxId: shop.shopTaxId || '',
  shopPhone: shop.shopPhone || '',
  partyName: '',
  partyAddress: '',
  partyTaxId: '',
  purpose: '',
  paymentMethod: 'เงินสด',
  items: [emptyItem()],
  vat: getDocType(typeKey).hasVat,
  note: '',
});

// Complete sample content, so every template can be previewed as a full mockup
export const sampleDocData = (typeKey, shop = {}) => {
  const base = blankDocData(typeKey, shop);
  const shopDefaults = {
    shopName: shop.shopName || 'ร้านสต็อกจิน (Stock Jin)',
    shopAddress: shop.shopAddress || '99/9 ถนนสุขุมวิท แขวงคลองตัน เขตคลองเตย กรุงเทพฯ 10110',
    shopTaxId: shop.shopTaxId || '0105567000000',
    shopPhone: shop.shopPhone || '02-123-4567',
  };
  const samples = {
    PO: { partyName: 'บริษัท สยามฟู้ดซัพพลาย จำกัด', partyAddress: '12 ถนนพระราม 4 กรุงเทพฯ 10500', partyTaxId: '0105550000011',
      items: [{ name: 'หมูสับ', qty: 10, unit: 'กก.', price: 145 }, { name: 'ไข่ไก่ เบอร์ 2', qty: 6, unit: 'แผง', price: 115 }, { name: 'น้ำมันพืช 1 ลิตร', qty: 12, unit: 'ขวด', price: 52 }] },
    QT: { partyName: 'บริษัท ตัวอย่าง อีเวนต์ จำกัด', partyAddress: '88 ถนนรัชดาภิเษก กรุงเทพฯ 10400',
      items: [{ name: 'ชุดอาหารกล่อง (ข้าวกะเพราหมูสับ)', qty: 120, unit: 'กล่อง', price: 55 }, { name: 'น้ำดื่ม 600 มล.', qty: 120, unit: 'ขวด', price: 8 }] },
    IV: { partyName: 'คุณสมชาย ใจดี', partyAddress: '45/2 ซอยลาดพร้าว 71 กรุงเทพฯ 10230',
      items: [{ name: 'ชุดอาหารกล่อง', qty: 40, unit: 'กล่อง', price: 55 }, { name: 'ค่าจัดส่ง', qty: 1, unit: 'เที่ยว', price: 150 }] },
    RC: { partyName: 'คุณสมชาย ใจดี', paymentMethod: 'โอนเงิน (พร้อมเพย์)',
      items: [{ name: 'ชุดอาหารกล่อง', qty: 40, unit: 'กล่อง', price: 55 }, { name: 'ค่าจัดส่ง', qty: 1, unit: 'เที่ยว', price: 150 }] },
    PV: { partyName: 'ร้านซ่อมแอร์ช่างเอ', paymentMethod: 'เงินสด',
      items: [{ name: 'ล้างแอร์ครัว', qty: 2, unit: 'เครื่อง', price: 600 }, { name: 'เติมน้ำยาแอร์', qty: 1, unit: 'ครั้ง', price: 800 }] },
    AD: { partyName: 'นายต้น (พนักงานคุมสต็อก)', purpose: 'ซื้อวัตถุดิบด่วนที่ตลาดสำหรับออเดอร์จัดเลี้ยงวันเสาร์',
      items: [{ name: 'ผักรวม', qty: 1, unit: 'ชุด', price: 800 }, { name: 'น้ำแข็ง', qty: 5, unit: 'กระสอบ', price: 60 }] },
  };
  return { ...base, ...shopDefaults, ...samples[typeKey], note: 'เอกสารตัวอย่าง (mockup) สำหรับดูรูปแบบ' };
};

export const calcTotals = (data) => {
  const subtotal = (data.items || []).reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);
  const vat = data.vat ? Math.round(subtotal * 0.07 * 100) / 100 : 0;
  return { subtotal, vat, total: subtotal + vat };
};

const money = (n) => (Number(n) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Thai "baht text" (จำนวนเงินเป็นตัวอักษร), e.g. 1250.50 -> หนึ่งพันสองร้อยห้าสิบบาทห้าสิบสตางค์
export function bahtText(amount) {
  const digits = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const places = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน'];
  const readGroup = (numStr) => {
    // reads up to 6 digits
    let out = '';
    const len = numStr.length;
    for (let i = 0; i < len; i++) {
      const d = Number(numStr[i]);
      const pos = len - i - 1;
      if (d === 0) continue;
      if (pos === 1 && d === 1) out += 'สิบ';
      else if (pos === 1 && d === 2) out += 'ยี่สิบ';
      else if (pos === 0 && d === 1 && len > 1) out += 'เอ็ด';
      else out += digits[d] + places[pos];
    }
    return out;
  };
  const readInt = (n) => {
    if (n === 0) return 'ศูนย์';
    let s = String(n);
    let out = '';
    let millions = '';
    while (s.length > 6) {
      millions = s.slice(-6) + millions;
      s = s.slice(0, -6);
    }
    out = readGroup(s);
    for (let i = 0; i < millions.length; i += 6) {
      out += 'ล้าน' + readGroup(String(Number(millions.slice(i, i + 6))));
    }
    return out;
  };
  const value = Math.round((Number(amount) || 0) * 100);
  const baht = Math.floor(value / 100);
  const satang = value % 100;
  if (baht === 0 && satang > 0) return `${readInt(satang)}สตางค์`;
  return `${readInt(baht)}บาท${satang ? readInt(satang) + 'สตางค์' : 'ถ้วน'}`;
}

const esc = (v) => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function buildBusinessDocHtml(typeKey, data) {
  const t = getDocType(typeKey);
  const { subtotal, vat, total } = calcTotals(data);
  const items = (data.items || []).filter(it => it.name || Number(it.price));
  const rows = (items.length ? items : [emptyItem()]).map((it, i) => `
    <tr>
      <td style="padding:7px 8px;border-bottom:1px solid #e5e7eb;text-align:center;color:#6b7280">${i + 1}</td>
      <td style="padding:7px 8px;border-bottom:1px solid #e5e7eb">${esc(it.name)}</td>
      <td style="padding:7px 8px;border-bottom:1px solid #e5e7eb;text-align:right">${esc(it.qty)}</td>
      <td style="padding:7px 8px;border-bottom:1px solid #e5e7eb;text-align:center">${esc(it.unit)}</td>
      <td style="padding:7px 8px;border-bottom:1px solid #e5e7eb;text-align:right">${money(it.price)}</td>
      <td style="padding:7px 8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600">${money((Number(it.qty) || 0) * (Number(it.price) || 0))}</td>
    </tr>`).join('');

  const infoRow = (label, value) => value ? `<div style="display:flex;gap:8px;margin-top:3px"><span style="color:#6b7280;min-width:92px">${label}</span><span style="color:#111827;font-weight:600">${esc(value)}</span></div>` : '';
  const dateText = data.date ? formatThaiDate(new Date(data.date)) : '';
  const dueText = data.dueDate ? formatThaiDate(new Date(data.dueDate)) : '';

  const sigs = t.signatures.map(label => `
    <div style="flex:1;text-align:center">
      <div style="height:46px"></div>
      <div style="border-top:1px dotted #9ca3af;margin:0 12px;padding-top:6px;color:#374151">(.................................................)</div>
      <div style="margin-top:4px;font-weight:600;color:#111827">${label}</div>
      <div style="margin-top:2px;color:#6b7280">วันที่ ......../......../........</div>
    </div>`).join('');

  return `
  <div style="width:794px;min-height:1123px;box-sizing:border-box;padding:48px 52px;background:#fff;color:#111827;font-family:'IBM Plex Sans Thai','Sarabun','Tahoma',sans-serif;font-size:13px;line-height:1.5">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:24px">
      <div style="max-width:420px">
        <div style="font-size:20px;font-weight:700">${esc(data.shopName) || 'ชื่อร้าน / บริษัท'}</div>
        <div style="color:#4b5563;margin-top:4px">${esc(data.shopAddress)}</div>
        <div style="color:#4b5563">${data.shopTaxId ? 'เลขประจำตัวผู้เสียภาษี ' + esc(data.shopTaxId) : ''}${data.shopPhone ? ' · โทร ' + esc(data.shopPhone) : ''}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:24px;font-weight:800;color:${t.accent}">${t.title}</div>
        <div style="font-size:11px;letter-spacing:2px;color:#6b7280">${t.titleEn}</div>
        <div style="margin-top:10px;display:inline-block;border:1px solid ${t.accent};border-radius:8px;padding:6px 12px;text-align:left">
          <div style="color:#6b7280;font-size:11px">เลขที่</div>
          <div style="font-weight:700;color:${t.accent}">${esc(data.docNumber)}</div>
          <div style="color:#6b7280;font-size:11px;margin-top:4px">วันที่</div>
          <div style="font-weight:600">${dateText}</div>
        </div>
      </div>
    </div>

    <div style="height:3px;background:${t.accent};border-radius:2px;margin:22px 0 18px"></div>

    <div style="display:flex;gap:24px">
      <div style="flex:1;background:#f9fafb;border-radius:10px;padding:12px 14px">
        <div style="font-weight:700;color:${t.accent};margin-bottom:4px">${t.partyLabel}</div>
        <div style="font-weight:600;font-size:14px">${esc(data.partyName) || '-'}</div>
        <div style="color:#4b5563">${esc(data.partyAddress)}</div>
        ${data.partyTaxId ? `<div style="color:#4b5563">เลขประจำตัวผู้เสียภาษี ${esc(data.partyTaxId)}</div>` : ''}
      </div>
      <div style="flex:1;background:#f9fafb;border-radius:10px;padding:12px 14px">
        ${t.showDueDate ? infoRow('ครบกำหนดชำระ', dueText) : ''}
        ${t.showValidity ? infoRow('ยืนราคาถึง', dueText) : ''}
        ${t.showPayment ? infoRow('ชำระโดย', data.paymentMethod) : ''}
        ${t.showPurpose ? infoRow('วัตถุประสงค์', data.purpose) : ''}
        ${infoRow('หมายเหตุ', data.note)}
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-top:18px">
      <thead>
        <tr style="background:${t.accent};color:#fff">
          <th style="padding:8px;width:40px;text-align:center;border-radius:8px 0 0 0">ลำดับ</th>
          <th style="padding:8px;text-align:left">รายการ</th>
          <th style="padding:8px;width:70px;text-align:right">จำนวน</th>
          <th style="padding:8px;width:70px;text-align:center">หน่วย</th>
          <th style="padding:8px;width:100px;text-align:right">ราคา/หน่วย</th>
          <th style="padding:8px;width:110px;text-align:right;border-radius:0 8px 0 0">จำนวนเงิน</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div style="display:flex;justify-content:space-between;gap:24px;margin-top:14px">
      <div style="flex:1;background:#f9fafb;border-radius:10px;padding:10px 14px;align-self:flex-start">
        <div style="color:#6b7280;font-size:11px">จำนวนเงินตัวอักษร</div>
        <div style="font-weight:700">(${bahtText(total)})</div>
      </div>
      <div style="width:250px">
        <div style="display:flex;justify-content:space-between;padding:4px 0"><span style="color:#4b5563">รวมเป็นเงิน</span><span>${money(subtotal)}</span></div>
        ${data.vat ? `<div style="display:flex;justify-content:space-between;padding:4px 0"><span style="color:#4b5563">ภาษีมูลค่าเพิ่ม 7%</span><span>${money(vat)}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;padding:8px 10px;margin-top:4px;background:${t.accent};color:#fff;border-radius:8px;font-weight:700;font-size:15px"><span>ยอดรวมสุทธิ</span><span>${money(total)} บาท</span></div>
      </div>
    </div>

    <div style="display:flex;gap:12px;margin-top:64px;font-size:12px">${sigs}</div>
  </div>`;
}

export const fileNameFor = (typeKey, data) => `${getDocType(typeKey).title.replace(/\s*\/\s*/g, '-')}_${data.docNumber}.pdf`;

export async function generateBusinessDocPdf(typeKey, data) {
  const pdf = await renderHtmlToPdf(buildBusinessDocHtml(typeKey, data));
  return { pdf, blob: pdf.output('blob'), dataUri: pdf.output('datauristring'), fileName: fileNameFor(typeKey, data) };
}

// Saves the PDF to Storage (data URI fallback) and lists it in the shop's documents
export async function saveBusinessDocument(typeKey, data, user) {
  const t = getDocType(typeKey);
  const { blob, dataUri, fileName } = await generateBusinessDocPdf(typeKey, data);
  const url = await uploadPdfOrDataUri(blob, `documents/business/${fileName.replace(/\.pdf$/i, '')}_${Date.now()}.pdf`, dataUri);
  const { total } = calcTotals(data);
  await addDoc(collection(db, 'documents'), {
    name: fileName,
    url,
    category: t.category,
    docType: t.key,
    docNumber: data.docNumber,
    note: `${t.title} เลขที่ ${data.docNumber} · ${t.partyLabel} ${data.partyName || '-'} · ยอดรวม ${money(total)} บาท`,
    amount: total,
    createdBy: user?.name || 'พนักงาน',
    starred: false,
    fileSizeKb: Math.round(blob.size / 1024),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { fileName, url };
}
