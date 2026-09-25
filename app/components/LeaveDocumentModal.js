// app/components/LeaveDocumentModal.js
'use client';

import React, { useState, useRef } from 'react';
import {
  X, Download, Printer, Save, CheckCircle, FileText,
  Sliders, Eye, Loader2
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

function toThaiNumerals(str) {
  if (typeof str !== 'string' && typeof str !== 'number') return '';
  return String(str).replace(/[0-9]/g, (d) => '๐๑๒๓๔๕๖๗๘๙'[d]);
}

function formatThaiDate(dateInput, useThaiDigits = false) {
  if (!dateInput) return '................................';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return dateInput;
  const day = d.getDate();
  const month = THAI_MONTHS[d.getMonth()];
  const year = d.getFullYear() + 543;
  const res = `${day} ${month} พ.ศ. ${year}`;
  return useThaiDigits ? toThaiNumerals(res) : res;
}

function calculateDays(startDate, endDate) {
  if (!startDate || !endDate) return 1;
  const s = new Date(startDate);
  const e = new Date(endDate);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 1;
  const diffTime = Math.abs(e - s);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays > 0 ? diffDays : 1;
}

export default function LeaveDocumentModal({
  isOpen,
  onClose,
  leave,
  currentUser,
  onSuccessSave,
}) {
  const sheetRef = useRef(null);

  // Modal mode: 'preview' or 'customize'
  const [activeTab, setActiveTab] = useState('preview');

  // Customization state
  const [priorityTag, setPriorityTag] = useState('ด่วนที่สุด');
  const [showPriority, setShowPriority] = useState(true);
  const [useThaiDigits, setUseThaiDigits] = useState(false);
  const [recipient, setRecipient] = useState('หัวหน้างาน / ผู้จัดการฝ่ายปฏิบัติการ');
  const [department, setDepartment] = useState(leave?.department || currentUser?.department || 'ฝ่ายคลังสินค้าและการจัดส่ง');
  const [position, setPosition] = useState(leave?.position || currentUser?.position || 'เจ้าหน้าที่ปฏิบัติการ');
  const [approverName, setApproverName] = useState(
    leave?.approvedBy || (currentUser?.role === 'admin' || currentUser?.role === 'owner' ? (currentUser?.name || '') : '')
  );
  const [approverPosition, setApproverPosition] = useState('ผู้จัดการฝ่าย / ผู้มีอำนาจอนุมัติ');
  const [organizationName, setOrganizationName] = useState('บริษัท สต็อกโปร จำกัด (StockPro)');

  // Processing state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavedToDocs, setIsSavedToDocs] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  if (!isOpen || !leave) return null;

  const leaveTypeMap = {
    sick: 'ลาป่วย',
    personal: 'ลากิจ',
    vacation: 'ลาพักร้อน',
  };
  const leaveTypeLabel = leaveTypeMap[leave.type] || 'การลา';
  const totalDays = calculateDays(leave.startDate, leave.endDate);
  const totalDaysStr = useThaiDigits ? toThaiNumerals(totalDays) : String(totalDays);

  const formattedStart = formatThaiDate(leave.startDate, useThaiDigits);
  const formattedEnd = formatThaiDate(leave.endDate, useThaiDigits);

  const isUserAdmin = currentUser?.role === 'admin' || currentUser?.role === 'owner';
  const applicantFullName = leave.userName || currentUser?.name || 'พนักงาน';

  const isApproved = leave.status === 'approved';
  const isRejected = leave.status === 'rejected';

  const submittedRawDate = leave.createdAt?.toDate ? leave.createdAt.toDate() : (leave.createdAt ? new Date(leave.createdAt) : new Date());
  const formattedSubmittedDate = formatThaiDate(submittedRawDate, useThaiDigits);

  // 1. Download PDF to computer
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
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      const fileName = `ใบขอลา_${leave.userName || 'พนักงาน'}_${leave.startDate}.pdf`;
      pdf.save(fileName);
      setStatusMessage('ดาวน์โหลดสำเร็จ');
      setTimeout(() => setStatusMessage(''), 2500);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('เกิดข้อผิดพลาดในการสร้างไฟล์ PDF: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // 2. Direct browser print
  const handlePrint = () => {
    window.print();
  };

  // 3. Save PDF into Firebase Storage & Firestore 'documents'
  const handleSaveToDocuments = async () => {
    if (!sheetRef.current || isGenerating) return;
    setIsGenerating(true);
    setStatusMessage('กำลังสร้าง PDF และบันทึกเข้าคลังเอกสาร...');
    try {
      const canvas = await html2canvas(sheetRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      const pdfBlob = pdf.output('blob');
      const cleanName = (leave.userName || 'พนักงาน').replace(/\s+/g, '_');
      const storageFileName = `ใบขอลา_${cleanName}_${leave.startDate}_${Date.now()}.pdf`;
      const storageRef = ref(storage, `documents/leaves/${storageFileName}`);

      // Upload to Firebase Storage
      await uploadBytes(storageRef, pdfBlob, { contentType: 'application/pdf' });
      const downloadUrl = await getDownloadURL(storageRef);

      // Save metadata to Firestore collection 'documents'
      await addDoc(collection(db, 'documents'), {
        name: `ใบขอลา_${leave.userName}_${leave.startDate}.pdf`,
        url: downloadUrl,
        category: 'leave',
        note: `ใบขอลา (${leaveTypeLabel}) - ${leave.reason} [สถานะ: ${isApproved ? 'อนุมัติแล้ว' : isRejected ? 'ปฏิเสธ' : 'รอพิจารณา'}]`,
        createdAt: serverTimestamp(),
        createdBy: currentUser?.name || leave.userName || 'ระบบ',
        leaveId: leave.id || '',
        fileSizeKb: Math.round(pdfBlob.size / 1024),
        starred: false,
      });

      setIsSavedToDocs(true);
      setStatusMessage('✅ บันทึกเข้าแท็บเอกสารเรียบร้อยแล้ว!');
      if (onSuccessSave) {
        onSuccessSave('✅ บันทึกเอกสารใบลาเข้าแท็บ "เอกสาร" เรียบร้อยแล้ว');
      }
      setTimeout(() => setStatusMessage(''), 3500);
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
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-xs">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-800">
                เอกสารใบขออนุญาตลา (Official Leave Form)
              </h3>
              <p className="text-[11px] text-gray-500">
                {leave.userName} · {leaveTypeLabel} ({leave.startDate} ถึง {leave.endDate})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View/Edit toggle */}
            <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all ${
                  activeTab === 'preview' ? 'bg-white text-gray-800 shadow-xs' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <Eye size={13} /> หน้ากระดาษ
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('customize')}
                className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all ${
                  activeTab === 'customize' ? 'bg-white text-gray-800 shadow-xs' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <Sliders size={13} /> ปรับแต่งข้อความ
              </button>
            </div>

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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveToDocuments}
              disabled={isGenerating}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
            >
              {isGenerating ? (
                <Loader2 size={14} className="animate-spin" />
              ) : isSavedToDocs ? (
                <CheckCircle size={14} className="text-green-300" />
              ) : (
                <Save size={14} />
              )}
              <span>{isSavedToDocs ? 'บันทึกแล้ว (กดบันทึกซ้ำได้)' : 'บันทึกเข้าแท็บเอกสาร'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGenerating}
              className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-2xs disabled:opacity-50"
            >
              <Download size={14} className="text-blue-600" />
              <span>ดาวน์โหลด PDF</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isGenerating}
              className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-2xs disabled:opacity-50"
            >
              <Printer size={14} className="text-gray-600" />
              <span>สั่งพิมพ์</span>
            </button>
          </div>

          {statusMessage && (
            <div className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg animate-fade-in">
              {statusMessage}
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="leave-modal-body">
          {activeTab === 'customize' ? (
            /* Customization Form */
            <div className="p-6 max-w-xl mx-auto bg-white rounded-2xl border border-gray-100 shadow-sm space-y-4 my-4 no-print">
              <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2 border-b pb-2">
                <Sliders size={16} className="text-purple-600" /> ปรับแต่งข้อความในโครงร่างเอกสาร
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">ตราประทับหัวกระดาษ</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showPri"
                      checked={showPriority}
                      onChange={(e) => setShowPriority(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="showPri" className="text-xs text-gray-700">แสดงข้อความ</label>
                    {showPriority && (
                      <input
                        type="text"
                        value={priorityTag}
                        onChange={(e) => setPriorityTag(e.target.value)}
                        className="flex-1 text-xs border rounded-lg px-2.5 py-1"
                        placeholder="ด่วนที่สุด"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">รูปแบบตัวเลข</label>
                  <div className="flex items-center gap-2 pt-1.5">
                    <label className="text-xs flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="numFormat"
                        checked={!useThaiDigits}
                        onChange={() => setUseThaiDigits(false)}
                      />
                      เลขอารบิก (2569)
                    </label>
                    <label className="text-xs flex items-center gap-1.5 cursor-pointer ml-2">
                      <input
                        type="radio"
                        name="numFormat"
                        checked={useThaiDigits}
                        onChange={() => setUseThaiDigits(true)}
                      />
                      เลขไทย (๒๕๖๙)
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">ชื่อองค์กร / บริษัท</label>
                  <input
                    type="text"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5"
                    placeholder="ชื่อบริษัทหรือหน่วยงาน"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">เรียน (ผู้รับหนังสือ)</label>
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5"
                    placeholder="หัวหน้างาน ฝ่าย..."
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">ตำแหน่งผู้ขอลา</label>
                  <input
                    type="text"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5"
                    placeholder="ระบุตำแหน่ง"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">สังกัด / แผนก</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5"
                    placeholder="ระบุแผนก"
                  />
                </div>

                {isUserAdmin ? (
                  <>
                    <div>
                      <label className="text-xs font-bold text-gray-600 block mb-1">ชื่อผู้อนุมัติ</label>
                      <input
                        type="text"
                        value={approverName}
                        onChange={(e) => setApproverName(e.target.value)}
                        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="ชื่อ-นามสกุล ผู้อนุมัติ"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-600 block mb-1">ตำแหน่งผู้อนุมัติ</label>
                      <input
                        type="text"
                        value={approverPosition}
                        onChange={(e) => setApproverPosition(e.target.value)}
                        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="ผู้จัดการฝ่าย / ผู้บังคับบัญชา"
                      />
                    </div>
                  </>
                ) : (
                  <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                    <span className="text-sm">🔒</span>
                    <div>
                      <span className="font-bold block">ส่วนของผู้อนุมัติ (จำกัดสิทธิ์)</span>
                      <span>เฉพาะผู้ดูแลระบบหรือหัวหน้างานที่มีสิทธิ์เท่านั้นที่สามารถระบุหรือแก้ไขข้อมูลผู้อนุมัติได้</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-all"
                >
                  เสร็จสิ้นและดูตัวอย่าง
                </button>
              </div>
            </div>
          ) : null}

          {/* A4 Paper Sheet Wrapper */}
          <div className="leave-sheet-scroller">
            <div
              id="leave-document-sheet"
              ref={sheetRef}
              className="leave-doc-sheet"
            >
              {/* Header: Priority & Emblem */}
              <div className="leave-doc-header">
                <div className="w-1/4">
                  {showPriority && (
                    <span className="text-red-700 font-bold text-base tracking-widest border border-red-300 px-2 py-0.5 rounded">
                      {priorityTag}
                    </span>
                  )}
                </div>

                {/* Center Corporate Emblem / Seal */}
                <div className="w-2/4 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-700 to-indigo-500 text-white flex items-center justify-center shadow-sm mb-1.5">
                    <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                  </div>
                  <div className="text-xs font-extrabold text-gray-800 tracking-wider uppercase">
                    {organizationName}
                  </div>
                  <div className="text-[10px] text-gray-500 tracking-tight">
                    ใบขออนุมัติลางานและหยุดปฏิบัติงาน
                  </div>
                </div>

                <div className="w-1/4 text-right">
                  {/* Empty right column for symmetry */}
                </div>
              </div>

              {/* Date line */}
              <div className="text-right text-sm mt-5 mb-4 text-gray-800 font-medium">
                วันที่ {formattedSubmittedDate}
              </div>

              {/* Salutation & Subject */}
              <div className="space-y-1.5 text-sm text-gray-900 font-medium">
                <div className="flex">
                  <span className="font-bold w-14">เรียน</span>
                  <span className="flex-1">{recipient}</span>
                </div>
                <div className="flex">
                  <span className="font-bold w-14">เรื่อง</span>
                  <span className="flex-1">ขออนุญาต{leaveTypeLabel}</span>
                </div>
              </div>

              {/* Body Paragraph 1 */}
              <div className="mt-6 text-sm text-gray-900 leading-[1.9] text-justify">
                <p className="indent-12">
                  เนื่องด้วย ข้าพเจ้า <strong>{leave.userName || '...................................................'}</strong>{' '}
                  ตำแหน่ง <strong>{position}</strong>{' '}
                  สังกัดฝ่าย/แผนก <strong>{department}</strong>{' '}
                  มีความประสงค์ขออนุญาต<strong>{leaveTypeLabel}</strong>{' '}
                  เนื่องจาก <strong>{leave.reason || 'มีความจำเป็นส่วนตัว'}</strong>
                </p>

                <p className="indent-12 mt-3">
                  โดยข้าพเจ้าขออนุญาตหยุดปฏิบัติงานตั้งแต่วันที่{' '}
                  <strong>{formattedStart}</strong>{' '}
                  ถึงวันที่ <strong>{formattedEnd}</strong>{' '}
                  กำหนดระยะเวลารวมทั้งสิ้น <strong>{totalDaysStr}</strong> วัน{' '}
                  เมื่อครบกำหนดระยะเวลาการลาดังกล่าวแล้ว ข้าพเจ้าจะกลับมาปฏิบัติหน้าที่ตามปกติ
                </p>

                <p className="indent-12 mt-3">
                  จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ
                </p>
              </div>

              {/* Applicant Signature Section */}
              <div className="mt-8 flex justify-end">
                <div className="w-64 text-center text-sm text-gray-800 space-y-1">
                  <div className="mb-4">ด้วยความเคารพอย่างสูง</div>
                  <div className="text-gray-700 flex items-center justify-center gap-1.5">
                    <span>ลงชื่อ</span>
                    <span className="font-semibold text-gray-900 border-b border-gray-400 min-w-[150px] text-center px-2">
                      {applicantFullName}
                    </span>
                  </div>
                  <div className="font-bold text-gray-900 pt-1">
                    ({applicantFullName})
                  </div>
                  <div className="text-xs text-gray-600">ผู้ขออนุญาตลา</div>
                  <div className="text-xs text-gray-500">วันที่ {formattedSubmittedDate}</div>
                </div>
              </div>

              {/* Approval / Supervisor Consideration Section */}
              <div className="mt-10 pt-5 border-t border-dashed border-gray-400">
                <div className="text-sm font-bold text-gray-900 mb-3 flex items-center justify-between">
                  <span>ความเห็นและคำสั่งของผู้บังคับบัญชา / ผู้อนุมัติ :</span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                    isApproved ? 'bg-green-100 text-green-700' : isRejected ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {isApproved ? '● อนุมัติแล้ว' : isRejected ? '● ไม่อนุมัติ' : '○ รอการอนุมัติ'}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2 text-sm text-gray-800 pl-4">
                  <div className="flex items-center gap-2.5">
                    <span className="w-4 h-4 border border-gray-700 rounded-sm flex items-center justify-center text-xs font-black">
                      {isApproved ? '✓' : ''}
                    </span>
                    <span>อนุญาตให้ลาหยุดงานตามที่เสนอได้</span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="w-4 h-4 border border-gray-700 rounded-sm flex items-center justify-center text-xs font-black">
                      {isRejected ? '✓' : ''}
                    </span>
                    <span>
                      ไม่อนุญาต {isRejected ? `(เนื่องจากมีความจำเป็นเร่งด่วนในสายงาน)` : 'เนื่องจาก...........................................................................................'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="w-4 h-4 border border-gray-700 rounded-sm flex items-center justify-center text-xs font-black">
                    </span>
                    <span>อื่นๆ ............................................................................................................................................</span>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <div className="w-64 text-center text-sm text-gray-800 space-y-1">
                    <div className="text-gray-700 flex items-center justify-center gap-1.5">
                      <span>ลงชื่อ</span>
                      {isApproved && approverName ? (
                        <span className="font-semibold text-indigo-900 border-b border-gray-400 min-w-[150px] text-center px-2">
                          {approverName}
                        </span>
                      ) : (
                        <span className="text-gray-400 border-b border-dotted border-gray-400 min-w-[150px] text-center text-xs pb-0.5">
                          {isUserAdmin ? '(ลงนาม ณ ที่นี้)' : '........................................'}
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-gray-900 pt-1">
                      ({approverName || (isApproved ? 'ผู้อนุมัติ' : '................................................................')})
                    </div>
                    <div className="text-xs text-gray-600">
                      ตำแหน่ง {approverPosition}
                    </div>
                    <div className="text-xs text-gray-500">
                      วันที่ {leave.approvedAt ? formatThaiDate(leave.approvedAt, useThaiDigits) : (isApproved ? formattedSubmittedDate : '..... / ..... / ..........')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
