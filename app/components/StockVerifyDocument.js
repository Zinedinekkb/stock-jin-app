// app/components/StockVerifyDocument.js
import React from 'react';
import { X, Copy, FileText, CheckCircle2, Ban, RotateCcw, Trash2, PackagePlus, Search } from 'lucide-react';

const STATUS_STAMP = {
  pending: { label: 'รอตรวจสอบ', cls: 'border-amber-600 text-amber-700' },
  completed: { label: 'ตรวจสอบแล้ว', cls: 'border-success-600 text-success-700' },
  cancelled: { label: 'ยกเลิก', cls: 'border-gray-500 text-gray-500' },
};

const DIFF_CLS = { ok: 'text-success-600', bad: 'text-danger-600' };

function DiffText({ diff }) {
  if (diff === 0) return <span className={`font-bold ${DIFF_CLS.ok}`}>0</span>;
  return <span className={`font-bold ${DIFF_CLS.bad}`}>{diff > 0 ? `+${diff}` : `${diff}`}</span>;
}

export default function StockVerifyDocument({
  tx,
  onClose,
  actualQty,
  setActualQty,
  itemNotes,
  setItemNotes,
  extraItems = [],
  isAddingMode,
  setIsAddingMode,
  addSearch,
  setAddSearch,
  filteredAddProducts = [],
  handleAddExtraItem,
  handleRemoveExtraItem,
  canVerify,
  canEditCompleted,
  isAdminUser,
  onVerify,
  onCopy,
  onOpenPdf,
  onVoid,
  onEdit,
  onDelete,
}) {
  if (!tx) return null;

  const isOut = tx.type !== 'IN';
  const isPending = tx.status === 'pending';
  const isCompleted = tx.status === 'completed';
  const isCancelled = tx.status === 'cancelled';
  const editable = isPending && canVerify;
  const stamp = STATUS_STAMP[tx.status] || STATUS_STAMP.pending;
  const requestedLabel = isOut ? 'ขอเบิก' : 'แจ้งรับ';

  const setQty = (id, value) => setActualQty(prev => ({ ...prev, [id]: parseInt(value) || 0 }));
  const setNote = (id, value) => setItemNotes(prev => ({ ...prev, [id]: value }));

  const txItems = tx.items || [];
  const rows = [
    ...txItems.map(item => ({
      key: `item-${item.id}`,
      item,
      isExtra: false,
      requested: Number(item.qty) || 0,
      actual: actualQty[item.id] ?? item.qty ?? 0,
    })),
    ...extraItems.map(item => ({
      key: `extra-${item.id}`,
      item,
      isExtra: true,
      requested: 0,
      actual: actualQty[item.id] ?? 0,
    })),
  ].map(row => ({ ...row, diff: row.actual - row.requested }));

  const totalRequested = txItems.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const totalActual = rows.reduce((sum, row) => sum + (Number(row.actual) || 0), 0);
  const mismatchCount = rows.filter(row => row.diff !== 0).length;

  const noteValue = (row) => (editable ? (itemNotes[row.item.id] ?? '') : (itemNotes[row.item.id] || row.item.note || ''));

  const candidates = filteredAddProducts.filter(p =>
    !txItems.some(existing => existing.id === p.id) && !extraItems.some(ex => ex.id === p.id)
  );

  const qtyInput = (row, widthCls) => (
    <input
      type="number"
      min={0}
      inputMode="numeric"
      aria-label={`ยอดจริง ${row.item.name}`}
      value={row.actual}
      onChange={(e) => setQty(row.item.id, e.target.value)}
      className={`${widthCls} text-center font-bold text-brand-600 bg-brand-50/40 border-[1.5px] border-dashed border-brand-200 rounded-md py-1 outline-none focus:border-brand-500 focus:bg-white`}
    />
  );

  const noteInput = (row, widthCls = 'w-full') => (
    <input
      type="text"
      aria-label={`หมายเหตุ ${row.item.name}`}
      placeholder="หมายเหตุ"
      value={noteValue(row)}
      onChange={(e) => setNote(row.item.id, e.target.value)}
      className={`${widthCls} text-xs text-ink bg-transparent border-b border-slate-200 focus:border-brand-500 outline-none py-0.5`}
    />
  );

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-ink/40 backdrop-blur-sm animate-fade-in">
      <div className="min-h-full flex items-center justify-center p-3 md:p-6">
        <div className="w-full max-w-[820px] animate-scale-in">
          {/* แถบบน: ชื่อหน้าต่าง + ปุ่มปิด */}
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-sm font-bold text-white drop-shadow">เอกสารตรวจนับ</span>
            <button
              type="button"
              onClick={onClose}
              aria-label="ปิด"
              className="bg-white p-1.5 rounded-full text-gray-500 hover:text-gray-800 shadow-sm"
            >
              <X size={18} />
            </button>
          </div>

          {/* ตัวกระดาษ A4 */}
          <div className="bg-white text-slate-800 rounded-md shadow-2xl p-5 md:p-8 font-sans text-[13px] leading-relaxed">
            {/* หัวเอกสาร */}
            <div className="flex justify-between items-start gap-3 border-b-2 border-brand-900 pb-3 mb-4">
              <div className="min-w-0">
                <h3 className="text-base md:text-lg font-bold text-brand-900">
                  {isOut ? 'ใบเบิกสินค้า / ใบตรวจนับยอดจริง' : 'ใบรับสินค้าเข้า / ใบตรวจนับยอดจริง'}
                </h3>
                <p className="text-xs text-slate-500">คลังสินค้า</p>
              </div>
              <div className="text-right shrink-0">
                <div className={`inline-block border-2 rounded px-2.5 py-0.5 text-xs font-bold -rotate-[4deg] ${stamp.cls}`}>
                  {stamp.label}
                </div>
                {tx.docNumber && (
                  <p className="text-xs mt-1.5">เลขที่ <b className="font-mono">{tx.docNumber}</b></p>
                )}
              </div>
            </div>

            {/* ข้อมูลหัวบิล */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 mb-4 text-xs md:text-[12.5px]">
              <p><b className="inline-block min-w-[84px] text-slate-500 font-semibold">วันที่</b> {tx.date || '-'}</p>
              <p><b className="inline-block min-w-[84px] text-slate-500 font-semibold">ประเภท</b> {isOut ? 'เบิกออก (OUT)' : 'รับเข้า (IN)'}</p>
              <p><b className="inline-block min-w-[84px] text-slate-500 font-semibold">{isOut ? 'ผู้เบิก' : 'ผู้ส่ง'}</b> {tx.recorder || '-'}</p>
              <p><b className="inline-block min-w-[84px] text-slate-500 font-semibold">วัตถุประสงค์</b> {tx.note || '-'}</p>
              {isCompleted && (
                <>
                  <p><b className="inline-block min-w-[84px] text-slate-500 font-semibold">ผู้ตรวจสอบ</b> {tx.verifiedBy || '-'}</p>
                  <p><b className="inline-block min-w-[84px] text-slate-500 font-semibold">วันที่ตรวจ</b> {tx.verifiedAt || '-'}</p>
                </>
              )}
              {isCancelled && (
                <p className="text-red-500"><b className="inline-block min-w-[84px] font-semibold">ยกเลิกโดย</b> {tx.cancelledBy || '-'}</p>
              )}
            </div>

            {/* ตารางรายการ (desktop / tablet) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse text-[12.5px]">
                <thead>
                  <tr className="bg-brand-50 text-brand-900">
                    <th className="border border-slate-300 px-1 py-1.5 w-12">ลำดับ</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-left">รายการ</th>
                    <th className="border border-slate-300 px-1 py-1.5 w-16">หน่วย</th>
                    <th className="border border-slate-300 px-1 py-1.5 w-16">{requestedLabel}</th>
                    <th className="border border-slate-300 px-1 py-1.5 w-24">ยอดจริง</th>
                    <th className="border border-slate-300 px-1 py-1.5 w-20">ส่วนต่าง</th>
                    <th className="border border-slate-300 px-2 py-1.5 w-40 text-left">หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={row.key} className={row.isExtra ? 'bg-brand-50' : ''}>
                      <td className="border border-slate-300 px-1 py-1.5 text-center">{idx + 1}</td>
                      <td className="border border-slate-300 px-2 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <span>{row.item.name}</span>
                          {row.isExtra && <span className="text-[10.5px] text-brand-600 whitespace-nowrap">(เพิ่มตอนตรวจ)</span>}
                          {row.isExtra && editable && (
                            <button
                              type="button"
                              onClick={() => handleRemoveExtraItem(row.item.id)}
                              aria-label={`ลบ ${row.item.name}`}
                              className="ml-auto shrink-0 text-red-400 hover:text-red-600"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="border border-slate-300 px-1 py-1.5 text-center">{row.item.unit || '-'}</td>
                      <td className="border border-slate-300 px-1 py-1.5 text-center">
                        {row.isExtra ? '–' : row.requested}
                      </td>
                      <td className="border border-slate-300 px-1 py-1 text-center">
                        {editable ? qtyInput(row, 'w-16') : <span className="font-bold">{row.actual}</span>}
                      </td>
                      <td className="border border-slate-300 px-1 py-1.5 text-center"><DiffText diff={row.diff} /></td>
                      <td className="border border-slate-300 px-2 py-1 text-left">
                        {editable ? noteInput(row) : <span className={isCancelled ? 'text-slate-400' : ''}>{noteValue(row)}</span>}
                      </td>
                    </tr>
                  ))}

                  {editable && (
                    <tr>
                      <td colSpan={7} className="border border-dashed border-slate-300 bg-slate-50 p-0">
                        {!isAddingMode ? (
                          <button
                            type="button"
                            onClick={() => setIsAddingMode(true)}
                            className="w-full py-2 text-slate-500 text-xs font-bold flex items-center justify-center gap-1.5 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                          >
                            <PackagePlus size={15} /> เพิ่มรายการตกหล่น / มาเกิน
                          </button>
                        ) : (
                          <AddProductSearch
                            addSearch={addSearch}
                            setAddSearch={setAddSearch}
                            onClose={() => setIsAddingMode(false)}
                            candidates={candidates}
                            onPick={handleAddExtraItem}
                          />
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* การ์ดรายการ (มือถือ) */}
            <div className="md:hidden space-y-2">
              {rows.map((row) => (
                <div
                  key={row.key}
                  className={`rounded-lg border p-2.5 ${
                    row.isExtra ? 'bg-brand-50 border-brand-200 border-solid' :
                    row.diff !== 0 ? 'bg-red-50/60 border-red-200' : 'border-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-slate-800 break-words">
                        {row.item.name}
                        {row.isExtra && <span className="ml-1.5 text-[10.5px] font-normal text-brand-600">(เพิ่มตอนตรวจ)</span>}
                      </p>
                      <p className="text-xs text-slate-500">
                        {row.isExtra ? 'มาเกิน / ตกหล่น' : `${requestedLabel} ${row.requested} ${row.item.unit || ''}`}
                        {row.diff !== 0 && <span className="ml-1.5"><DiffText diff={row.diff} /></span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-center">
                        <p className="text-[10px] text-slate-500 leading-none mb-1">ยอดจริง</p>
                        {editable ? qtyInput(row, 'w-16') : <span className="font-bold text-base">{row.actual}</span>}
                      </div>
                      {row.isExtra && editable && (
                        <button
                          type="button"
                          onClick={() => handleRemoveExtraItem(row.item.id)}
                          aria-label={`ลบ ${row.item.name}`}
                          className="text-red-400 hover:text-red-600 p-1"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                  {(editable || noteValue(row)) && (
                    <div className="mt-1.5">
                      {editable ? noteInput(row) : <p className="text-xs text-slate-500">{noteValue(row)}</p>}
                    </div>
                  )}
                </div>
              ))}

              {editable && (
                !isAddingMode ? (
                  <button
                    type="button"
                    onClick={() => setIsAddingMode(true)}
                    className="w-full rounded-lg border-2 border-dashed border-slate-300 py-2.5 text-xs font-bold text-slate-500 flex items-center justify-center gap-1.5 hover:text-brand-600 hover:border-brand-200"
                  >
                    <PackagePlus size={15} /> เพิ่มรายการตกหล่น / มาเกิน
                  </button>
                ) : (
                  <AddProductSearch
                    addSearch={addSearch}
                    setAddSearch={setAddSearch}
                    onClose={() => setIsAddingMode(false)}
                    candidates={candidates}
                    onPick={handleAddExtraItem}
                    bordered
                  />
                )
              )}
            </div>

            {/* สรุป */}
            <p className="mt-3 text-xs text-slate-500">
              รวม{requestedLabel} <b className="text-slate-700">{totalRequested}</b> · ยอดจริง <b className="text-slate-700">{totalActual}</b> · ไม่ตรง <b className={mismatchCount > 0 ? 'text-danger-600' : 'text-success-600'}>{mismatchCount}</b> รายการ
            </p>

            {/* ลายเซ็น */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6 text-center text-xs">
              <SignBlock
                title={isOut ? 'ผู้เบิก' : 'ผู้ส่ง'}
                name={tx.recorder}
                date={tx.date}
              />
              <SignBlock
                title="ผู้ตรวจนับ"
                name={isCompleted ? tx.verifiedBy : ''}
                date={isCompleted ? tx.verifiedAt : ''}
              />
              <SignBlock
                title="ผู้อนุมัติ (Admin)"
                name={isCompleted ? tx.verifiedBy : ''}
                date={isCompleted ? tx.verifiedAt : ''}
                className="col-span-2 md:col-span-1"
              />
            </div>
          </div>

          {/* แถบปุ่มด้านล่างกระดาษ */}
          <div className="mt-4 flex flex-wrap gap-2 justify-end">
            <button
              type="button"
              onClick={() => onOpenPdf && onOpenPdf(tx)}
              className="px-3.5 py-2.5 rounded-xl bg-white text-brand-600 border border-brand-200 font-bold text-xs flex items-center gap-1.5 shadow-sm hover:bg-brand-50"
            >
              <FileText size={15} /> พิมพ์ / ดู PDF
            </button>
            <button
              type="button"
              onClick={onCopy}
              className="px-3.5 py-2.5 rounded-xl bg-gray-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform"
            >
              <Copy size={15} /> {isCompleted ? 'คัดลอกประวัติ' : 'คัดลอก'}
            </button>

            {isPending && canVerify && (
              <button
                type="button"
                onClick={onVerify}
                className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-transform"
              >
                <CheckCircle2 size={16} /> ยืนยันยอดจริง และบันทึกเอกสาร
              </button>
            )}
            {isPending && !canVerify && (
              <div className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-gray-100 text-gray-400 font-bold text-xs flex items-center justify-center border border-gray-200">
                เฉพาะผู้ดูแลระบบหรือฝ่ายสต็อกยืนยันได้
              </div>
            )}

            {isCompleted && canEditCompleted && (
              <>
                <button
                  type="button"
                  onClick={onEdit}
                  className="px-3.5 py-2.5 rounded-xl bg-yellow-100 text-yellow-700 font-bold border border-yellow-200 text-xs flex items-center gap-1.5 active:scale-95 transition-transform"
                >
                  <RotateCcw size={15} /> แก้ไข
                </button>
                <button
                  type="button"
                  onClick={onVoid}
                  className="px-3.5 py-2.5 rounded-xl bg-red-100 text-red-700 font-bold border border-red-200 text-xs flex items-center gap-1.5 active:scale-95 transition-transform"
                >
                  <Ban size={15} /> ยกเลิกใบ
                </button>
              </>
            )}
          </div>

          {isAdminUser && !isPending && (
            <button
              type="button"
              onClick={onDelete}
              className="mt-2 w-full py-2 rounded-xl bg-white/90 border border-red-100 text-red-500 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-red-50"
            >
              <Trash2 size={13} /> ลบประวัตินี้ถาวร (Admin Only)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SignBlock({ title, name, date, className = '' }) {
  return (
    <div className={className}>
      <div className="h-9 border-b border-dotted border-slate-500 flex items-end justify-center font-semibold text-brand-600 pb-0.5 truncate">
        {name || ''}
      </div>
      <p className="mt-1 text-slate-700">{title}</p>
      <p className="text-slate-500">{date || '..../..../....'}</p>
    </div>
  );
}

function AddProductSearch({ addSearch, setAddSearch, onClose, candidates, onPick, bordered = false }) {
  return (
    <div className={`p-2.5 bg-slate-50 ${bordered ? 'rounded-lg border border-slate-200' : ''}`}>
      <div className="flex items-center gap-2 mb-2">
        <Search size={15} className="text-slate-400" />
        <input
          autoFocus
          placeholder="ค้นหาสินค้า..."
          aria-label="ค้นหาสินค้า"
          value={addSearch}
          onChange={e => setAddSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm outline-none"
        />
        <button type="button" onClick={onClose} aria-label="ปิดการค้นหา">
          <X size={16} className="text-slate-400" />
        </button>
      </div>
      <div className="max-h-32 overflow-y-auto space-y-1">
        {candidates.length === 0 && <p className="text-xs text-center text-slate-400 py-2">ไม่พบสินค้า</p>}
        {candidates.map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPick(p)}
            className="w-full text-left text-xs p-2 hover:bg-white rounded-lg flex justify-between items-center group"
          >
            <span className="font-bold text-slate-700">{p.name}</span>
            <span className="text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded group-hover:bg-success-100 group-hover:text-success-700">เลือก</span>
          </button>
        ))}
      </div>
    </div>
  );
}
