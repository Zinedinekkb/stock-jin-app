// app/components/TransactionDocumentModal.js
'use client';

import React, { useState, useRef } from 'react';
import {
  X, Download, Printer, Save, CheckCircle, FileText,
  Eye, Loader2, Check, AlertCircle, Sparkles, Send, ShieldCheck
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  formatThaiDate, 
  formatThaiTime, 
  generateDocNumber, 
  uploadAndSaveTransactionDocument 
} from '../utils/transactionPdfGenerator';

export default function TransactionDocumentModal({
  isOpen,
  onClose,
  transaction,
  currentUser,
  onSuccessSave,
}) {
  const sheetRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavedToDocs, setIsSavedToDocs] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  if (!isOpen || !transaction) return null;

  const isModeIn = transaction.type === 'IN';
  const isCompleted = transaction.status === 'completed';
  const docNumber = transaction.docNumber || generateDocNumber(transaction.type, transaction.id, transaction.timestamp);

  const rawDate = transaction.timestamp 
    ? new Date(transaction.timestamp) 
    : (transaction.date ? new Date(transaction.date) : new Date());
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

  const verifiedByName = transaction.verifiedBy || (isCompleted ? 'ผู้จัดการคลังสินค้า' : '');
  const verifiedAtText = transaction.verifiedAt || (isCompleted ? formattedDate : '');

  const docTitleThai = isModeIn 
    ? 'ใบนำส่งและตรวจรับพัสดุ / สินค้าเข้าคลัง' 
    : 'ใบขอเบิกและจ่ายพัสดุ / สินค้าออกจากคลัง';
  const docTitleEng = isModeIn 
    ? 'GOODS RECEIPT NOTE (GRN)' 
    : 'GOODS REQUISITION & ISSUE SLIP (GIS)';

  const primaryColor = isModeIn ? '#15803d' : '#b91c1c';
  const headerBgGradient = isModeIn 
    ? 'from-success-700 to-success-600' 
    : 'from-rose-800 to-red-600';

  // 1. Download PDF directly to local machine
  const handleDownloadPdf = async () => {
    if (!sheetRef.current || isGenerating) return;
    setIsGenerating(true);
    setStatusMessage('กำลังสร้างไฟล์ PDF...');
    try {
      const canvas = await html2canvas(sheetRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.88);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      if (pdfHeight <= pageHeight) {
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      } else {
        let heightLeft = pdfHeight;
        let position = 0;
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
        while (heightLeft > 0) {
          position -= pageHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
          heightLeft -= pageHeight;
        }
      }

      const fileName = `${isModeIn ? 'ใบรับสินค้า' : 'ใบเบิกสินค้า'}_${docNumber}.pdf`;
      pdf.save(fileName);
      setStatusMessage('✅ ดาวน์โหลด PDF เรียบร้อยแล้ว');
      setTimeout(() => setStatusMessage(''), 2500);
    } catch (err) {
      console.error('Download PDF error:', err);
      alert('เกิดข้อผิดพลาดในการสร้าง PDF: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // 2. Browser print
  const handlePrint = () => {
    window.print();
  };

  // 3. Save to Firebase Storage and 'documents' collection in Firestore
  const handleSaveToDocuments = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setStatusMessage('กำลังจัดเก็บเข้าคลังเอกสารอัตโนมัติ...');
    try {
      const res = await uploadAndSaveTransactionDocument({
        transaction: { ...transaction, docNumber },
        user: currentUser,
        isVerified: isCompleted,
      });

      setIsSavedToDocs(true);
      setStatusMessage('✅ บันทึกเข้าแท็บเอกสารเรียบร้อยแล้ว!');
      if (onSuccessSave) {
        onSuccessSave(`บันทึก ${res.fileName} เข้าคลังเอกสารแล้ว`);
      }
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (err) {
      console.error('Save to documents error:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกเอกสาร: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="leave-modal-overlay">
      <div className="leave-modal-dialog">
        {/* Top Header Controls */}
        <div className="leave-modal-header no-print">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-xs ${
              isModeIn ? 'bg-success-50 text-success-600' : 'bg-rose-50 text-rose-600'
            }`}>
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <span>{docTitleThai}</span>
                <span className="text-xs font-mono font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                  {docNumber}
                </span>
              </h3>
              <p className="text-[11px] text-gray-500">
                โดย {transaction.recorder || 'เจ้าหน้าที่'} · {formattedDate} ({items.length} รายการ)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="ปิด"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="leave-modal-toolbar no-print">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSaveToDocuments}
              disabled={isGenerating}
              className="px-3.5 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
            >
              {isGenerating ? (
                <Loader2 size={14} className="animate-spin" />
              ) : isSavedToDocs ? (
                <CheckCircle size={14} className="text-green-300" />
              ) : (
                <Save size={14} />
              )}
              <span>{isSavedToDocs ? 'จัดเก็บแล้ว (กดบันทึกซ้ำได้)' : 'จัดเก็บลงคลังเอกสาร'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGenerating}
              className="px-3.5 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-2xs disabled:opacity-50"
            >
              <Download size={14} className="text-blue-600" />
              <span>ดาวน์โหลด PDF</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isGenerating}
              className="px-3.5 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-2xs disabled:opacity-50"
            >
              <Printer size={14} className="text-gray-600" />
              <span>สั่งพิมพ์ A4</span>
            </button>
          </div>

          {statusMessage && (
            <div className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg animate-fade-in">
              {statusMessage}
            </div>
          )}
        </div>

        {/* A4 Sheet Container */}
        <div className="leave-sheet-scroller">
          <div
            id="transaction-document-sheet"
            ref={sheetRef}
            className="leave-doc-sheet"
            style={{ width: '794px', minHeight: '1123px' }}
          >
            {/* Top Emblem & Header */}
            <div className="flex justify-between items-start pb-4 border-b-2 border-slate-900">
              <div className="flex gap-4 items-center">
                <div className="w-14 h-14 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-2xl shadow-sm shrink-0">
                  📦
                </div>
                <div>
                  <div className="text-base font-extrabold text-slate-900 tracking-wide">
                    บริษัท สต็อกโปร ซิสเต็มส์ จำกัด (มหาชน)
                  </div>
                  <div className="text-xs text-slate-600 font-semibold mt-0.5">
                    STOCKPRO INVENTORY MANAGEMENT SYSTEM
                  </div>
                  <div className="text-[11px] text-slate-500">
                    คลังสินค้าและพัสดุส่วนกลาง · เอกสารคลังพัสดุทางการ
                  </div>
                </div>
              </div>

              {/* Doc Number Box */}
              <div className="text-right bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 min-w-[210px]">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  เลขที่เอกสาร / DOCUMENT NO.
                </div>
                <div className="text-sm font-black font-mono tracking-wide mt-0.5" style={{ color: primaryColor }}>
                  {docNumber}
                </div>
                <div className="text-[11px] text-slate-700 font-semibold mt-1">
                  วันที่: {formattedDate}
                </div>
                <div className="text-[10px] text-slate-500">
                  เวลาบันทึก: {formattedTime}
                </div>
              </div>
            </div>

            {/* Document Title Banner */}
            <div className={`mt-5 bg-gradient-to-r ${headerBgGradient} text-white px-4 py-3 rounded-xl flex justify-between items-center shadow-xs`}>
              <div>
                <div className="text-base font-extrabold tracking-wide">
                  {docTitleThai}
                </div>
                <div className="text-[11px] opacity-90 font-semibold tracking-wider">
                  {docTitleEng}
                </div>
              </div>
              <div className="bg-white px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-xs" style={{ color: primaryColor }}>
                {isCompleted ? '● ผ่านการตรวจสอบ / อนุมัติแล้ว' : '○ คำขอรอการตรวจรับ'}
              </div>
            </div>

            {/* Transaction Details Info Grid */}
            <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-3.5 grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
              <div>
                <span className="text-slate-500 font-semibold">ผู้ทำรายการ / ผู้ขอเบิก:</span>
                <span className="font-bold text-slate-900 ml-1.5">{transaction.recorder || 'เจ้าหน้าที่'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold">ประเภทรายการ:</span>
                <span className="font-bold ml-1.5" style={{ color: primaryColor }}>
                  {isModeIn ? '📥 รับเข้าสินค้า (STOCK IN)' : '📤 เบิกออกสินค้า (STOCK OUT)'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold">แผนก / สายงาน:</span>
                <span className="font-semibold text-slate-800 ml-1.5">ฝ่ายปฏิบัติการและคลังสินค้า</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold">ผู้ตรวจรับ / ผู้อนุมัติ:</span>
                <span className="font-semibold text-slate-800 ml-1.5">{verifiedByName || 'รอการอนุมัติ'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 font-semibold">วัตถุประสงค์ / หมายเหตุ:</span>
                <span className="font-semibold text-slate-700 ml-1.5">{transaction.note || 'เพื่อใช้ในการปฏิบัติหน้าที่ตามปกติ'}</span>
              </div>
            </div>

            {/* Items Table */}
            <div className="mt-5">
              <table className="w-full border-collapse border border-slate-300 rounded-lg overflow-hidden text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold text-[11px] uppercase">
                    <th className="py-2.5 px-2 text-center w-10">ลำดับ</th>
                    <th className="py-2.5 px-2.5 text-left w-20">รหัส SKU</th>
                    <th className="py-2.5 px-2.5 text-left">รายการพัสดุ / สินค้า</th>
                    <th className="py-2.5 px-2.5 text-left w-24">หมวดหมู่</th>
                    <th className="py-2.5 px-2.5 text-center w-20">ยอดขอ</th>
                    <th className="py-2.5 px-2.5 text-center w-20">ยอดจริง</th>
                    <th className="py-2.5 px-2 text-center w-14">หน่วย</th>
                    <th className="py-2.5 px-2.5 text-left w-20">หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-6 text-center text-slate-400">
                        ไม่มีรายการสินค้า
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => {
                      const actQty = actualItems[item.id] !== undefined 
                        ? actualItems[item.id] 
                        : (isCompleted ? item.qty : '-');
                      const isQtyDiff = isCompleted && actualItems[item.id] !== undefined && Number(actualItems[item.id]) !== Number(item.qty);

                      return (
                        <tr key={item.id || idx} className="border-b border-slate-200">
                          <td className="py-2 px-2 text-center text-slate-500 font-semibold">{idx + 1}</td>
                          <td className="py-2 px-2.5 font-mono text-[11px] text-slate-600">{item.sku || '-'}</td>
                          <td className="py-2 px-2.5 font-semibold text-slate-800">
                            {item.name}
                            {item.note && <div className="text-[10px] text-slate-400 font-normal">หมายเหตุ: {item.note}</div>}
                          </td>
                          <td className="py-2 px-2.5 text-slate-600 text-[11px]">{item.category || '-'}</td>
                          <td className="py-2 px-2.5 text-center font-semibold text-slate-800">{Number(item.qty).toLocaleString()}</td>
                          <td className={`py-2 px-2.5 text-center font-bold ${
                            isQtyDiff ? 'text-amber-600' : isCompleted ? 'text-success-700' : 'text-slate-400'
                          }`}>
                            {isCompleted ? Number(actQty).toLocaleString() : (isQtyDiff ? Number(actQty).toLocaleString() : '-')}
                          </td>
                          <td className="py-2 px-2 text-center text-slate-600">{item.unit || 'ชิ้น'}</td>
                          <td className="py-2 px-2.5 text-[11px] text-slate-500">{item.remark || '-'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-extrabold text-xs border-t-2 border-slate-300">
                    <td colSpan="4" className="py-2.5 px-3 text-right text-slate-700">
                      รวมทั้งหมด ({items.length} รายการ):
                    </td>
                    <td className="py-2.5 px-2.5 text-center text-slate-900">{totalRequestedQty.toLocaleString()}</td>
                    <td className={`py-2.5 px-2.5 text-center ${isCompleted ? 'text-success-700' : 'text-slate-500'}`}>
                      {isCompleted ? totalActualQty.toLocaleString() : '-'}
                    </td>
                    <td colSpan="2" className="py-2.5 px-3 text-slate-500 text-[10px]">
                      หน่วยสินค้า
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Signature Section (3 Boxes) */}
            <div className="mt-9 grid grid-cols-3 gap-4">
              {/* Box 1: Requester */}
              <div className="border border-slate-300 rounded-xl p-3 text-center bg-white">
                <div className="text-[11px] font-bold text-slate-600 mb-6">
                  {isModeIn ? 'ผู้ส่งมอบสินค้า / ผู้แจ้งรับ' : 'ผู้ขอเบิกพัสดุ'}
                </div>
                <div className="border-b border-dotted border-slate-400 w-4/5 mx-auto mb-1 h-5 text-xs font-semibold text-slate-800">
                  {transaction.recorder || ''}
                </div>
                <div className="text-[11px] font-bold text-slate-800">
                  ({transaction.recorder || '...................................................'})
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">ตำแหน่ง: เจ้าหน้าที่ปฏิบัติการ</div>
                <div className="text-[10px] text-slate-500 mt-0.5">วันที่: {formattedDate}</div>
              </div>

              {/* Box 2: Warehouse Staff */}
              <div className="border border-slate-300 rounded-xl p-3 text-center bg-white">
                <div className="text-[11px] font-bold text-slate-600 mb-6">
                  {isModeIn ? 'เจ้าหน้าที่คลังผู้ตรวจรับ' : 'เจ้าหน้าที่คลังผู้จ่ายพัสดุ'}
                </div>
                <div className="border-b border-dotted border-slate-400 w-4/5 mx-auto mb-1 h-5 text-xs font-semibold text-slate-800">
                  {isCompleted ? (verifiedByName || 'เจ้าหน้าที่คลัง') : ''}
                </div>
                <div className="text-[11px] font-bold text-slate-800">
                  ({isCompleted ? (verifiedByName || 'เจ้าหน้าที่คลังสินค้า') : '...................................................'})
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">ตำแหน่ง: เจ้าหน้าที่คลังสินค้า</div>
                <div className="text-[10px] text-slate-500 mt-0.5">วันที่: {verifiedAtText || '............/............/............'}</div>
              </div>

              {/* Box 3: Approver */}
              <div className="border border-slate-300 rounded-xl p-3 text-center bg-white">
                <div className="text-[11px] font-bold text-slate-600 mb-6">
                  ผู้มีอำนาจอนุมัติ / หัวหน้างาน
                </div>
                <div className="border-b border-dotted border-slate-400 w-4/5 mx-auto mb-1 h-5 text-xs font-semibold text-slate-800">
                  {isCompleted ? (verifiedByName || 'ผู้จัดการฝ่าย') : ''}
                </div>
                <div className="text-[11px] font-bold text-slate-800">
                  ({isCompleted ? (verifiedByName || 'ผู้จัดการฝ่าย') : '...................................................'})
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">ตำแหน่ง: ผู้จัดการ / ผู้ดูแลระบบ</div>
                <div className="text-[10px] text-slate-500 mt-0.5">วันที่: {verifiedAtText || '............/............/............'}</div>
              </div>
            </div>

            {/* Stamp if completed */}
            {isCompleted && (
              <div className="absolute right-14 bottom-32 border-4 border-double border-success-600 text-success-600 rounded-2xl px-4 py-2 text-center font-black text-xs tracking-widest -rotate-12 bg-success-50/90 shadow-md pointer-events-none">
                <div>★ STOCKPRO VERIFIED ★</div>
                <div className="text-[9px] font-bold tracking-normal mt-0.5">อนุมัติและปรับยอดสต็อกแล้ว</div>
                <div className="text-[8px] font-medium mt-0.5">{verifiedAtText || formattedDate}</div>
              </div>
            )}

            {/* Document Footer */}
            <div className="absolute bottom-6 left-12 right-12 border-t border-slate-200 pt-2 flex justify-between items-center text-[9px] text-slate-400">
              <div>
                เอกสารนี้สร้างขึ้นโดยระบบสารสนเทศอัตโนมัติ StockPro Inventory System (ใบสำคัญทางการ)
              </div>
              <div>
                Ref #{transaction.id || '-'} · {docNumber}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
