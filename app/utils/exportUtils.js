'use client';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// =============================================
//  HELPER FUNCTIONS
// =============================================

/**
 * รวบรวมข้อมูลจาก transactions ตาม filter
 * พร้อมจัดกลุ่มตามหมวดหมู่
 */
function aggregateData(transactions, startDate, endDate, reportType, products, categories) {
  const startOfDay = new Date(startDate).setHours(0, 0, 0, 0);
  const endOfDay = new Date(endDate).setHours(23, 59, 59, 999);

  const filtered = transactions.filter(tx => {
    const inTime = tx.timestamp >= startOfDay && tx.timestamp <= endOfDay;
    const active = tx.status !== 'cancelled';
    const typeMatch = reportType === 'ALL' || tx.type === reportType;
    return inTime && active && typeMatch;
  });

  // สร้าง map product id -> category
  const productCatMap = {};
  (products || []).forEach(p => {
    productCatMap[p.id] = p.category || 'ไม่ระบุหมวดหมู่';
  });

  // สร้าง map ข้อมูลหมวดหมู่
  const catMap = {};
  (categories || []).forEach(c => {
    catMap[c.name] = c;
  });

  // สรุปสินค้า (รวมทุกหมวด)
  const itemSummary = {};
  // สรุปสินค้าแยกตามหมวดหมู่
  const categoryBreakdown = {};

  filtered.forEach(tx => {
    const isImport = tx.type === 'IN';
    (tx.items || []).forEach(item => {
      const qty = (tx.actualItems && tx.actualItems[item.id] !== undefined)
        ? tx.actualItems[item.id]
        : item.qty;

      const catName = item.category || productCatMap[item.id] || 'ไม่ระบุหมวดหมู่';

      // สรุปรวม
      if (!itemSummary[item.name]) {
        itemSummary[item.name] = { in: 0, out: 0, unit: item.unit || '-', category: catName };
      }
      if (isImport) itemSummary[item.name].in += qty;
      else itemSummary[item.name].out += qty;

      // สรุปตามหมวดหมู่
      if (!categoryBreakdown[catName]) {
        categoryBreakdown[catName] = { items: {}, totalIn: 0, totalOut: 0, billCount: 0 };
      }
      if (!categoryBreakdown[catName].items[item.name]) {
        categoryBreakdown[catName].items[item.name] = { in: 0, out: 0, unit: item.unit || '-' };
      }
      if (isImport) {
        categoryBreakdown[catName].items[item.name].in += qty;
        categoryBreakdown[catName].totalIn += qty;
      } else {
        categoryBreakdown[catName].items[item.name].out += qty;
        categoryBreakdown[catName].totalOut += qty;
      }
    });
  });

  // นับบิลต่อหมวด
  filtered.forEach(tx => {
    const catsSeen = new Set();
    (tx.items || []).forEach(item => {
      const catName = item.category || productCatMap[item.id] || 'ไม่ระบุหมวดหมู่';
      catsSeen.add(catName);
    });
    catsSeen.forEach(cat => {
      if (categoryBreakdown[cat]) categoryBreakdown[cat].billCount++;
    });
  });

  // สรุปบิล
  const billIn = filtered.filter(t => t.type === 'IN').length;
  const billOut = filtered.filter(t => t.type === 'OUT').length;
  const skuIn = Object.values(itemSummary).filter(d => d.in > 0).length;
  const skuOut = Object.values(itemSummary).filter(d => d.out > 0).length;

  // สรุปรายวัน (Daily breakdown)
  const dailyBreakdown = {};
  filtered.forEach(tx => {
    const dateKey = new Date(tx.timestamp).toLocaleDateString('th-TH', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
    if (!dailyBreakdown[dateKey]) {
      dailyBreakdown[dateKey] = { billIn: 0, billOut: 0, itemsIn: 0, itemsOut: 0 };
    }
    if (tx.type === 'IN') {
      dailyBreakdown[dateKey].billIn++;
      (tx.items || []).forEach(item => {
        const qty = (tx.actualItems && tx.actualItems[item.id] !== undefined) ? tx.actualItems[item.id] : item.qty;
        dailyBreakdown[dateKey].itemsIn += qty;
      });
    } else {
      dailyBreakdown[dateKey].billOut++;
      (tx.items || []).forEach(item => {
        const qty = (tx.actualItems && tx.actualItems[item.id] !== undefined) ? tx.actualItems[item.id] : item.qty;
        dailyBreakdown[dateKey].itemsOut += qty;
      });
    }
  });

  return { filtered, itemSummary, categoryBreakdown, dailyBreakdown, billIn, billOut, skuIn, skuOut, productCatMap };
}

function formatThaiDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('th-TH', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
}

function getReportTypeLabel(type) {
  if (type === 'IN') return 'เฉพาะยอดรับเข้า';
  if (type === 'OUT') return 'เฉพาะยอดเบิกออก';
  return 'รวมทั้งหมด (รับ+เบิก)';
}

// =============================================
//  EXPORT TO EXCEL (.xlsx) — Executive Edition
// =============================================

export function exportToExcel(transactions, startDate, endDate, reportType, products, categories) {
  const data = aggregateData(transactions, startDate, endDate, reportType, products, categories);
  const { filtered, itemSummary, categoryBreakdown, dailyBreakdown, billIn, billOut, skuIn, skuOut } = data;

  if (filtered.length === 0) {
    alert('❌ ไม่พบรายการในช่วงวันที่เลือก');
    return false;
  }

  const dateDisplay = startDate === endDate
    ? formatThaiDate(startDate)
    : `${formatThaiDate(startDate)} - ${formatThaiDate(endDate)}`;

  const wb = XLSX.utils.book_new();

  // ===== SHEET 1: Executive Dashboard =====
  const dashRows = [
    ['📊 StockPro — EXECUTIVE DASHBOARD'],
    [''],
    ['ช่วงเวลา:', dateDisplay],
    ['ประเภทรายงาน:', getReportTypeLabel(reportType)],
    ['วันที่สร้างรายงาน:', new Date().toLocaleString('th-TH')],
    [''],
    ['══════════════════════════════════'],
    ['📋 สรุปภาพรวม (Overview)'],
    ['══════════════════════════════════'],
    [''],
    ['หัวข้อ', 'จำนวน', 'หน่วย'],
  ];

  if (reportType === 'ALL' || reportType === 'IN') {
    dashRows.push(['📥 บิลรับเข้า', billIn, 'บิล']);
    dashRows.push(['📥 ชนิดสินค้ารับเข้า', skuIn, 'ชนิด']);
  }
  if (reportType === 'ALL' || reportType === 'OUT') {
    dashRows.push(['📤 บิลเบิกออก', billOut, 'บิล']);
    dashRows.push(['📤 ชนิดสินค้าเบิกออก', skuOut, 'ชนิด']);
  }
  dashRows.push(['📊 รวมทั้งหมด', filtered.length, 'บิล']);
  dashRows.push(['📦 หมวดหมู่ที่เคลื่อนไหว', Object.keys(categoryBreakdown).length, 'หมวดหมู่']);
  dashRows.push(['']);

  // สรุปตามหมวดหมู่ (ย่อ)
  dashRows.push(['══════════════════════════════════']);
  dashRows.push(['📁 สรุปตามหมวดหมู่ (Category Summary)']);
  dashRows.push(['══════════════════════════════════']);
  dashRows.push(['']);
  dashRows.push(['หมวดหมู่', 'รับเข้า (รวม)', 'เบิกออก (รวม)', 'จำนวนสินค้า', 'จำนวนบิล']);

  Object.keys(categoryBreakdown).forEach(catName => {
    const cat = categoryBreakdown[catName];
    const itemCount = Object.keys(cat.items).length;
    dashRows.push([catName, cat.totalIn, cat.totalOut, itemCount, cat.billCount]);
  });

  dashRows.push(['']);
  // สรุปรายวัน
  dashRows.push(['══════════════════════════════════']);
  dashRows.push(['📅 สรุปรายวัน (Daily Summary)']);
  dashRows.push(['══════════════════════════════════']);
  dashRows.push(['']);
  dashRows.push(['วันที่', 'บิลรับเข้า', 'บิลเบิกออก', 'จำนวนรับ', 'จำนวนเบิก']);

  Object.keys(dailyBreakdown).forEach(dateKey => {
    const d = dailyBreakdown[dateKey];
    dashRows.push([dateKey, d.billIn, d.billOut, d.itemsIn, d.itemsOut]);
  });

  const ws1 = XLSX.utils.aoa_to_sheet(dashRows);
  ws1['!cols'] = [{ wch: 38 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Dashboard');

  // ===== SHEET 2: รายละเอียดตามหมวดหมู่ =====
  const catDetailRows = [
    ['📁 รายละเอียดสินค้าแยกตามหมวดหมู่'],
    ['ช่วงเวลา: ' + dateDisplay],
    [''],
  ];

  Object.keys(categoryBreakdown).forEach(catName => {
    const cat = categoryBreakdown[catName];
    catDetailRows.push([`══ ${catName} ══`]);
    
    const headers = ['ลำดับ', 'ชื่อสินค้า', 'หน่วย'];
    if (reportType === 'ALL' || reportType === 'IN') headers.push('รับเข้า');
    if (reportType === 'ALL' || reportType === 'OUT') headers.push('ใช้ไป');
    if (reportType === 'ALL') headers.push('คงเหลือ (รับ-ใช้)');
    catDetailRows.push(headers);

    let idx = 1;
    let catTotalIn = 0, catTotalOut = 0;
    
    Object.keys(cat.items).forEach(name => {
      const d = cat.items[name];
      const row = [idx++, name, d.unit];
      if (reportType === 'ALL' || reportType === 'IN') { row.push(d.in); catTotalIn += d.in; }
      if (reportType === 'ALL' || reportType === 'OUT') { row.push(d.out); catTotalOut += d.out; }
      if (reportType === 'ALL') row.push(d.in - d.out);
      catDetailRows.push(row);
    });

    // แถวรวมหมวด
    const totalRow = ['', `รวม ${catName}`, ''];
    if (reportType === 'ALL' || reportType === 'IN') totalRow.push(catTotalIn);
    if (reportType === 'ALL' || reportType === 'OUT') totalRow.push(catTotalOut);
    if (reportType === 'ALL') totalRow.push(catTotalIn - catTotalOut);
    catDetailRows.push(totalRow);
    catDetailRows.push(['']); // เว้นบรรทัด
  });

  const ws2 = XLSX.utils.aoa_to_sheet(catDetailRows);
  ws2['!cols'] = [{ wch: 8 }, { wch: 32 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'แยกตามหมวดหมู่');

  // ===== SHEET 3: รายละเอียดสินค้ารวม =====
  const itemHeaders = ['ลำดับ', 'ชื่อสินค้า', 'หมวดหมู่', 'หน่วย'];
  if (reportType === 'ALL' || reportType === 'IN') itemHeaders.push('รับเข้า');
  if (reportType === 'ALL' || reportType === 'OUT') itemHeaders.push('ใช้ไป');
  if (reportType === 'ALL') itemHeaders.push('คงเหลือ (รับ-ใช้)');

  const itemRows = [itemHeaders];
  let idx = 1;
  let totalIn = 0, totalOut = 0;

  // จัดเรียงตามหมวดหมู่ แล้วตามชื่อ
  const sortedItems = Object.entries(itemSummary).sort((a, b) => {
    if (a[1].category !== b[1].category) return (a[1].category || '').localeCompare(b[1].category || '');
    return a[0].localeCompare(b[0]);
  });

  sortedItems.forEach(([name, d]) => {
    const showIn = (reportType === 'ALL' || reportType === 'IN') && d.in > 0;
    const showOut = (reportType === 'ALL' || reportType === 'OUT') && d.out > 0;

    if (showIn || showOut) {
      const row = [idx++, name, d.category || '-', d.unit];
      if (reportType === 'ALL' || reportType === 'IN') { row.push(d.in); totalIn += d.in; }
      if (reportType === 'ALL' || reportType === 'OUT') { row.push(d.out); totalOut += d.out; }
      if (reportType === 'ALL') row.push(d.in - d.out);
      itemRows.push(row);
    }
  });

  const totalRow = ['', 'รวมทั้งหมด', '', ''];
  if (reportType === 'ALL' || reportType === 'IN') totalRow.push(totalIn);
  if (reportType === 'ALL' || reportType === 'OUT') totalRow.push(totalOut);
  if (reportType === 'ALL') totalRow.push(totalIn - totalOut);
  itemRows.push(totalRow);

  const ws3 = XLSX.utils.aoa_to_sheet(itemRows);
  ws3['!cols'] = [{ wch: 8 }, { wch: 32 }, { wch: 20 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws3, 'รายละเอียดสินค้ารวม');

  // ===== SHEET 4: รายการบิลทั้งหมด =====
  const txHeaders = ['ลำดับ', 'วันที่/เวลา', 'ประเภท', 'สถานะ', 'รายการสินค้า', 'หมวดหมู่', 'จำนวน', 'หมายเหตุ', 'ผู้บันทึก'];
  const txRows = [txHeaders];

  filtered.forEach((tx, i) => {
    const typeLabel = tx.type === 'IN' ? 'รับเข้า' : 'เบิกออก';
    const statusLabel = tx.status === 'pending' ? 'รอตรวจสอบ' : tx.status === 'cancelled' ? 'ยกเลิก' : 'สำเร็จ';
    const itemNames = (tx.items || []).map(it => it.name).join(', ');
    const itemCats = [...new Set((tx.items || []).map(it => it.category || 'ไม่ระบุ'))].join(', ');
    const itemQty = (tx.items || []).map(it => {
      const qty = (tx.actualItems && tx.actualItems[it.id] !== undefined)
        ? tx.actualItems[it.id] : it.qty;
      return `${qty} ${it.unit}`;
    }).join(', ');

    txRows.push([i + 1, tx.date || '', typeLabel, statusLabel, itemNames, itemCats, itemQty, tx.note || '-', tx.recorder || '-']);
  });

  const ws4 = XLSX.utils.aoa_to_sheet(txRows);
  ws4['!cols'] = [
    { wch: 8 }, { wch: 22 }, { wch: 12 }, { wch: 12 },
    { wch: 35 }, { wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 15 }
  ];
  XLSX.utils.book_append_sheet(wb, ws4, 'รายการบิลทั้งหมด');

  // สร้างชื่อไฟล์
  const fileName = `StockJin_Report_${startDate}_to_${endDate}.xlsx`;
  XLSX.writeFile(wb, fileName);
  return true;
}


// =============================================
//  EXPORT TO PDF — Executive Formal Report
// =============================================

export function exportToPDF(transactions, startDate, endDate, reportType, products, categories) {
  const data = aggregateData(transactions, startDate, endDate, reportType, products, categories);
  const { filtered, itemSummary, categoryBreakdown, dailyBreakdown, billIn, billOut, skuIn, skuOut } = data;

  if (filtered.length === 0) {
    alert('❌ ไม่พบรายการในช่วงวันที่เลือก');
    return false;
  }

  const dateDisplay = startDate === endDate
    ? formatThaiDate(startDate)
    : `${formatThaiDate(startDate)} - ${formatThaiDate(endDate)}`;

  const now = new Date().toLocaleString('th-TH', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 14;

  // ===== HEADER SECTION =====
  const drawHeader = () => {
    // แถบหัว gradient (จำลอง 2 สี)
    pdf.setFillColor(15, 23, 42); // #0f172a
    pdf.rect(0, 0, pageWidth, 42, 'F');
    
    // แถบเส้นสี Indigo
    pdf.setFillColor(99, 102, 241); // indigo-500
    pdf.rect(0, 42, pageWidth, 2, 'F');

    // ชื่อร้าน
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.text('StockPro System', pageWidth / 2, 16, { align: 'center' });

    // ชื่อรายงาน
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Inventory Movement Report', pageWidth / 2, 25, { align: 'center' });

    // ช่วงเวลา + ประเภท
    pdf.setFontSize(9);
    pdf.setTextColor(200, 230, 200);
    pdf.text(`Period: ${dateDisplay}  |  Type: ${getReportTypeLabel(reportType)}  |  Generated: ${now}`, pageWidth / 2, 34, { align: 'center' });
  };

  drawHeader();

  // ===== SECTION 1: EXECUTIVE SUMMARY =====
  let yPos = 54;

  // Section Title
  const drawSectionTitle = (title, y) => {
    pdf.setFillColor(240, 253, 244); // green-50
    pdf.roundedRect(margin, y - 5, pageWidth - margin * 2, 8, 1.5, 1.5, 'F');
    pdf.setTextColor(20, 83, 45);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, margin + 3, y);
    return y + 6;
  };

  yPos = drawSectionTitle('EXECUTIVE SUMMARY', yPos);

  // Summary KPI boxes (2x2 layout using autoTable)
  const summaryBody = [];
  if (reportType === 'ALL' || reportType === 'IN') {
    summaryBody.push(['Stock In (Bills)', String(billIn), 'Products In (Types)', String(skuIn)]);
  }
  if (reportType === 'ALL' || reportType === 'OUT') {
    summaryBody.push(['Stock Out (Bills)', String(billOut), 'Products Out (Types)', String(skuOut)]);
  }
  summaryBody.push([
    'Total Bills', String(filtered.length),
    'Active Categories', String(Object.keys(categoryBreakdown).length)
  ]);

  pdf.autoTable({
    startY: yPos,
    head: [['Metric', 'Value', 'Metric', 'Value']],
    body: summaryBody,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 4, halign: 'center', valign: 'middle' },
    headStyles: {
      fillColor: [22, 163, 74],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8
    },
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'left', cellWidth: 42 },
      1: { halign: 'center', cellWidth: 25, fontStyle: 'bold' },
      2: { fontStyle: 'bold', halign: 'left', cellWidth: 42 },
      3: { halign: 'center', cellWidth: 25, fontStyle: 'bold' }
    },
    alternateRowStyles: { fillColor: [240, 253, 244] },
    margin: { left: margin, right: margin }
  });

  // ===== SECTION 2: CATEGORY BREAKDOWN =====
  yPos = pdf.lastAutoTable.finalY + 12;

  if (yPos > 240) { pdf.addPage(); drawHeader(); yPos = 54; }

  yPos = drawSectionTitle('CATEGORY BREAKDOWN', yPos);

  // สรุปแต่ละหมวดหมู่
  const catHead = ['Category', 'Items', 'Stock In', 'Stock Out', 'Net Movement', 'Bills'];
  const catBody = [];

  let grandTotalIn = 0, grandTotalOut = 0;

  Object.keys(categoryBreakdown).forEach(catName => {
    const cat = categoryBreakdown[catName];
    const itemCount = Object.keys(cat.items).length;
    catBody.push([
      catName,
      String(itemCount),
      String(cat.totalIn),
      String(cat.totalOut),
      String(cat.totalIn - cat.totalOut),
      String(cat.billCount)
    ]);
    grandTotalIn += cat.totalIn;
    grandTotalOut += cat.totalOut;
  });

  // Grand Total row
  catBody.push([
    'GRAND TOTAL', '',
    String(grandTotalIn), String(grandTotalOut),
    String(grandTotalIn - grandTotalOut), String(filtered.length)
  ]);

  pdf.autoTable({
    startY: yPos,
    head: [catHead],
    body: catBody,
    theme: 'striped',
    styles: { fontSize: 8.5, cellPadding: 3.5 },
    headStyles: {
      fillColor: [20, 83, 45],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 45 },
      1: { halign: 'center', cellWidth: 16 },
      2: { halign: 'center', cellWidth: 24 },
      3: { halign: 'center', cellWidth: 24 },
      4: { halign: 'center', cellWidth: 28 },
      5: { halign: 'center', cellWidth: 16 }
    },
    alternateRowStyles: { fillColor: [240, 253, 244] },
    margin: { left: margin, right: margin },
    didParseCell: function (hookData) {
      // ไฮไลท์แถว Grand Total
      if (hookData.row.index === catBody.length - 1 && hookData.section === 'body') {
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.fillColor = [187, 247, 208]; // green-200
      }
      // Net Movement สีแดงถ้าติดลบ
      if (hookData.column.index === 4 && hookData.section === 'body') {
        const val = parseInt(hookData.cell.raw);
        if (val < 0) hookData.cell.styles.textColor = [220, 38, 38];
        else if (val > 0) hookData.cell.styles.textColor = [22, 163, 74];
      }
    }
  });

  // ===== SECTION 3: PRODUCT DETAILS BY CATEGORY =====
  Object.keys(categoryBreakdown).forEach(catName => {
    const cat = categoryBreakdown[catName];
    yPos = pdf.lastAutoTable.finalY + 10;

    if (yPos > 235) { pdf.addPage(); drawHeader(); yPos = 54; }

    // Category sub-header
    pdf.setFillColor(234, 179, 8); // yellow-500
    pdf.roundedRect(margin, yPos - 4.5, pageWidth - margin * 2, 7, 1, 1, 'F');
    pdf.setTextColor(60, 30, 0);
    pdf.setFontSize(9.5);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${catName}`, margin + 3, yPos);
    yPos += 5;

    const detailHead = ['No.', 'Product Name', 'Unit'];
    if (reportType === 'ALL' || reportType === 'IN') detailHead.push('In');
    if (reportType === 'ALL' || reportType === 'OUT') detailHead.push('Out');
    if (reportType === 'ALL') detailHead.push('Net');

    const detailBody = [];
    let rowIdx = 1;
    let catSubIn = 0, catSubOut = 0;

    Object.keys(cat.items).forEach(name => {
      const d = cat.items[name];
      const showIn = (reportType === 'ALL' || reportType === 'IN') && d.in > 0;
      const showOut = (reportType === 'ALL' || reportType === 'OUT') && d.out > 0;

      if (showIn || showOut) {
        const row = [String(rowIdx++), name, d.unit];
        if (reportType === 'ALL' || reportType === 'IN') { row.push(String(d.in)); catSubIn += d.in; }
        if (reportType === 'ALL' || reportType === 'OUT') { row.push(String(d.out)); catSubOut += d.out; }
        if (reportType === 'ALL') row.push(String(d.in - d.out));
        detailBody.push(row);
      }
    });

    // Subtotal row
    const subTotalRow = ['', 'Subtotal', ''];
    if (reportType === 'ALL' || reportType === 'IN') subTotalRow.push(String(catSubIn));
    if (reportType === 'ALL' || reportType === 'OUT') subTotalRow.push(String(catSubOut));
    if (reportType === 'ALL') subTotalRow.push(String(catSubIn - catSubOut));
    detailBody.push(subTotalRow);

    pdf.autoTable({
      startY: yPos,
      head: [detailHead],
      body: detailBody,
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 2.8 },
      headStyles: {
        fillColor: [75, 85, 99], // gray-600
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { cellWidth: 55 },
        2: { halign: 'center', cellWidth: 15 },
      },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      margin: { left: margin, right: margin },
      didParseCell: function (hookData) {
        if (hookData.row.index === detailBody.length - 1 && hookData.section === 'body') {
          hookData.cell.styles.fontStyle = 'bold';
          hookData.cell.styles.fillColor = [254, 249, 195]; // yellow-100
        }
      }
    });
  });

  // ===== SECTION 4: DAILY BREAKDOWN =====
  yPos = pdf.lastAutoTable.finalY + 12;
  if (yPos > 235) { pdf.addPage(); drawHeader(); yPos = 54; }

  yPos = drawSectionTitle('DAILY BREAKDOWN', yPos);

  const dailyHead = ['Date', 'Bills In', 'Bills Out', 'Items In', 'Items Out', 'Net Items'];
  const dailyBody = [];
  let dTotalBillIn = 0, dTotalBillOut = 0, dTotalItemIn = 0, dTotalItemOut = 0;

  Object.keys(dailyBreakdown).forEach(dateKey => {
    const d = dailyBreakdown[dateKey];
    dailyBody.push([
      dateKey,
      String(d.billIn), String(d.billOut),
      String(d.itemsIn), String(d.itemsOut),
      String(d.itemsIn - d.itemsOut)
    ]);
    dTotalBillIn += d.billIn;
    dTotalBillOut += d.billOut;
    dTotalItemIn += d.itemsIn;
    dTotalItemOut += d.itemsOut;
  });

  dailyBody.push([
    'TOTAL',
    String(dTotalBillIn), String(dTotalBillOut),
    String(dTotalItemIn), String(dTotalItemOut),
    String(dTotalItemIn - dTotalItemOut)
  ]);

  pdf.autoTable({
    startY: yPos,
    head: [dailyHead],
    body: dailyBody,
    theme: 'striped',
    styles: { fontSize: 8.5, cellPadding: 3.5 },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 30 },
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center' },
      5: { halign: 'center', fontStyle: 'bold' },
    },
    alternateRowStyles: { fillColor: [239, 246, 255] },
    margin: { left: margin, right: margin },
    didParseCell: function (hookData) {
      if (hookData.row.index === dailyBody.length - 1 && hookData.section === 'body') {
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.fillColor = [191, 219, 254]; // blue-200
      }
      // Net color
      if (hookData.column.index === 5 && hookData.section === 'body') {
        const val = parseInt(hookData.cell.raw);
        if (val < 0) hookData.cell.styles.textColor = [220, 38, 38];
        else if (val > 0) hookData.cell.styles.textColor = [22, 163, 74];
      }
    }
  });

  // ===== SECTION 5: TRANSACTION BILLS =====
  yPos = pdf.lastAutoTable.finalY + 12;
  if (yPos > 235) { pdf.addPage(); drawHeader(); yPos = 54; }

  yPos = drawSectionTitle('TRANSACTION BILLS', yPos);

  const billHead = ['No.', 'Date/Time', 'Type', 'Status', 'Products', 'Category', 'Note', 'By'];
  const billBody = filtered.map((tx, i) => {
    const typeLabel = tx.type === 'IN' ? 'IN' : 'OUT';
    const statusLabel = tx.status === 'pending' ? 'Pending' : tx.status === 'cancelled' ? 'Cancelled' : 'Done';
    const items = (tx.items || []).map(it => {
      const qty = (tx.actualItems && tx.actualItems[it.id] !== undefined)
        ? tx.actualItems[it.id] : it.qty;
      return `${it.name} x${qty}`;
    }).join(', ');
    const cats = [...new Set((tx.items || []).map(it => it.category || '-'))].join(', ');
    return [String(i + 1), tx.date || '-', typeLabel, statusLabel, items, cats, tx.note || '-', tx.recorder || '-'];
  });

  pdf.autoTable({
    startY: yPos,
    head: [billHead],
    body: billBody,
    theme: 'striped',
    styles: { fontSize: 7, cellPadding: 2.5 },
    headStyles: {
      fillColor: [107, 114, 128], // gray-500
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { cellWidth: 25 },
      2: { halign: 'center', cellWidth: 10 },
      3: { halign: 'center', cellWidth: 14 },
      4: { cellWidth: 50 },
      5: { cellWidth: 25 },
      6: { cellWidth: 25 },
      7: { cellWidth: 18 },
    },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: margin, right: margin },
    didParseCell: function (hookData) {
      if (hookData.section === 'body' && hookData.column.index === 2) {
        if (hookData.cell.raw === 'IN') hookData.cell.styles.textColor = [22, 163, 74];
        else hookData.cell.styles.textColor = [220, 38, 38];
      }
    }
  });

  // ===== FOOTER (ทุกหน้า) =====
  const totalPages = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    const pageH = pdf.internal.pageSize.getHeight();

    // แถบ footer
    pdf.setFillColor(20, 83, 45);
    pdf.rect(0, pageH - 16, pageWidth, 16, 'F');

    pdf.setFontSize(7);
    pdf.setTextColor(180, 220, 180);
    pdf.setFont('helvetica', 'normal');

    pdf.text(`Generated: ${now}  |  Stock Jin System  |  Confidential — For Internal Use Only`, margin, pageH - 8);
    pdf.text(`Page ${i} / ${totalPages}`, pageWidth - margin, pageH - 8, { align: 'right' });
  }

  // บันทึกไฟล์
  const fileName = `StockJin_Report_${startDate}_to_${endDate}.pdf`;
  pdf.save(fileName);
  return true;
}
