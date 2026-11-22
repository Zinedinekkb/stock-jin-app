// app/components/TabStatus.js
import React, { useState, useEffect } from 'react';
import {
  Clock, CheckCircle2, ChevronRight, FileText, Ban, Search, Eye, Check
} from 'lucide-react';
import { hasPermission, canVerifyStock } from '../utils/permissions';
import StockVerifyDocument from './StockVerifyDocument';

export default function TabStatus({
  transactions, statusFilter, setStatusFilter,
  verifyingTx, setVerifyingTx,
  actualQty, setActualQty,
  openVerifyModal, handleVerifyAndSave, handleQuickApprove,
  copyToClipboard, generateSummaryText,
  handleVoidTransaction, handleEditCompletedTx,
  user, handleDeleteHistory,
  products = [],
  onOpenTransactionDoc // ฟังก์ชันเปิดดูเอกสารทางการ PDF
}) {
    const [searchTerm, setSearchTerm] = useState('');
    
    // --- State สำหรับฟีเจอร์เพิ่มของ ---
    const [extraItems, setExtraItems] = useState([]); // รายการที่เพิ่มเข้ามาเอง
    const [isAddingMode, setIsAddingMode] = useState(false); // เปิด/ปิดโหมดค้นหา
    const [addSearch, setAddSearch] = useState(''); // คำค้นหาตอนเพิ่มของ
    const [itemNotes, setItemNotes] = useState({}); // หมายเหตุรายการ (key = product id)

    // Reset extraItems / itemNotes เมื่อเปิดบิลใหม่ (prefill หมายเหตุจากบิลเดิม)
    const [prevTxId, setPrevTxId] = useState(null);
    const currentTxId = verifyingTx ? (verifyingTx.id || verifyingTx.timestamp) : null;
    if (currentTxId !== prevTxId) {
        setPrevTxId(currentTxId);
        if (verifyingTx) {
            setExtraItems([]);
            setIsAddingMode(false);
            setAddSearch('');
            const prefilledNotes = {};
            (verifyingTx.items || []).forEach(item => { if (item.note) prefilledNotes[item.id] = item.note; });
            setItemNotes(prefilledNotes);
        }
    }

    // Logic กรองสินค้าตอนกดเพิ่ม
    const filteredAddProducts = products.filter(p => 
        p.name.toLowerCase().includes(addSearch.toLowerCase()) || 
        (p.sku && p.sku.toLowerCase().includes(addSearch.toLowerCase()))
    );

    const handleAddExtraItem = (product) => {
        // เพิ่มเข้า extraItems
        setExtraItems(prev => [...prev, product]);
        // ตั้งค่า actualQty เริ่มต้นเป็น 1
        setActualQty(prev => ({...prev, [product.id]: 1}));
        // ปิดโหมดเพิ่ม
        setIsAddingMode(false);
        setAddSearch('');
    };

    const handleRemoveExtraItem = (productId) => {
        setExtraItems(prev => prev.filter(p => p.id !== productId));
        // ลบออกจาก actualQty ด้วย
        const newQty = { ...actualQty };
        delete newQty[productId];
        setActualQty(newQty);
    };

    // Logic กรองรายการบิล
    const filteredTx = transactions.filter(tx => {
      let matchStatus = false;
      if (statusFilter === 'pending') matchStatus = tx.status === 'pending';
      else if (statusFilter === 'completed') matchStatus = tx.status === 'completed';
      else if (statusFilter === 'cancelled') matchStatus = tx.status === 'cancelled';
      
      const lowerSearch = searchTerm.toLowerCase();
      const matchSearch = 
          (tx.recorder || '').toLowerCase().includes(lowerSearch) ||
          (tx.note || '').toLowerCase().includes(lowerSearch) ||
          (tx.docNumber || '').toLowerCase().includes(lowerSearch) ||
          (tx.items || []).some(item => item.name.toLowerCase().includes(lowerSearch));

      return matchStatus && matchSearch;
    });

  return (
      <div className="space-y-4 pb-20 animate-fade-in-slide relative">
        {/* Search + status filter in one sticky block (the page title already sits in the header) */}
        <div className="sticky top-0 z-20 pt-1 pb-2 space-y-2.5 bg-[var(--app-bg)]/95 backdrop-blur-md rounded-b-card">
            <label className="relative block">
                <span className="sr-only">ค้นหารายการ</span>
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none" />
                <input 
                  type="search" 
                  placeholder="ค้นหาชื่อคน สินค้า หรือเลขที่เอกสาร" 
                  className="glass w-full h-11 pl-9 pr-3 rounded-control text-sm text-ink outline-none focus:ring-2 focus:ring-brand-200" 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
            </label>
            <div className="glass grid grid-cols-3 p-1 rounded-2xl" role="tablist" aria-label="สถานะรายการ">
              {[
                { key: 'pending', label: 'รอตรวจ', icon: Clock, count: transactions.filter(t => t.status === 'pending').length },
                { key: 'completed', label: 'สำเร็จ', icon: CheckCircle2 },
                { key: 'cancelled', label: 'ยกเลิก', icon: Ban },
              ].map(({ key, label, icon: Icon, count }) => (
                <button key={key} role="tab" aria-selected={statusFilter === key} onClick={() => setStatusFilter(key)}
                  className={`h-10 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-1.5 ${statusFilter === key ? 'bg-white text-brand-600 shadow-sm' : 'text-ink-muted hover:text-ink'}`}>
                  <Icon size={16}/> {label}
                  {count > 0 && <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-brand-500 text-white text-xs flex items-center justify-center">{count}</span>}
                </button>
              ))}
            </div>
        </div>
        
        <div className="space-y-3 mt-2">
          {filteredTx.length === 0 ? (
            <div className="glass rounded-card text-center text-ink-muted text-sm py-10">{searchTerm ? 'ไม่พบรายการที่ค้นหา' : statusFilter === 'pending' ? 'ไม่มีรายการรอตรวจ' : 'ยังไม่มีรายการ'}</div>
          ) : (
            filteredTx.map(tx => (
              <div 
                key={tx.id} 
                onClick={() => openVerifyModal(tx)} 
                className={`glass relative overflow-hidden pl-4 pr-3 py-3.5 rounded-card cursor-pointer hover:bg-white/80 transition-colors flex justify-between items-center gap-3 ${
                  tx.status === 'cancelled' ? 'opacity-60' : ''
                }`}
              >
                <span className={`absolute left-0 top-0 bottom-0 w-1 ${tx.status === 'cancelled' ? 'bg-gray-300' : tx.type === 'IN' ? 'bg-success-500' : 'bg-danger-500'}`} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      tx.status === 'cancelled' ? 'bg-gray-200 text-gray-600' : tx.type==='IN'?'bg-success-100 text-success-700':'bg-red-100 text-red-800'
                    }`}>
                      {tx.status === 'cancelled' ? 'ยกเลิกแล้ว' : (tx.type === 'IN' ? 'รับเข้า' : 'เบิกออก')}
                    </span>
                    <span className="text-xs text-ink-subtle">{tx.date}</span>
                    {tx.docNumber && (
                      <span className="text-xs font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">
                        {tx.docNumber}
                      </span>
                    )}
                  </div>
                  <p className={`text-sm font-bold text-ink ${tx.status === 'cancelled' ? 'line-through' : ''}`}>
                    {(tx.items||[]).length} รายการ <span className="font-normal text-ink-subtle">· โดย {tx.recorder}</span>
                  </p>
                  {tx.status === 'pending' && (tx.items || []).length > 0 && (
                    <p className="text-xs text-ink-muted mt-1 line-clamp-2">
                      {(tx.items || []).slice(0, 3).map(item => `${item.name} ×${item.qty}`).join(' · ')}
                      {(tx.items || []).length > 3 && ` · อีก ${(tx.items || []).length - 3} รายการ`}
                    </p>
                  )}
                  {tx.status === 'cancelled' && <p className="text-xs text-red-400 mt-1">ยกเลิกโดย: {tx.cancelledBy}</p>}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* อนุมัติด่วนตามยอดที่ขอ (แตะครั้งเดียว) */}
                  {tx.status === 'pending' && handleQuickApprove && canVerifyStock(user) && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleQuickApprove(tx); }}
                      className="h-10 px-3 rounded-control bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold flex items-center gap-1.5 shadow-sm"
                      aria-label={`อนุมัติตามที่ขอ ${tx.docNumber || ''}`}
                    >
                      <Check size={16} /> อนุมัติ
                    </button>
                  )}
                  {/* ปุ่มเปิดดูเอกสาร PDF ทางการ */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onOpenTransactionDoc) onOpenTransactionDoc(tx);
                    }}
                    className="w-10 h-10 lg:w-auto lg:px-3 rounded-control bg-white/70 hover:bg-white text-brand-600 text-sm font-bold flex items-center justify-center gap-1.5 transition-colors"
                    title="ดูเอกสารทางการ PDF"
                  >
                    <FileText size={15} />
                    <span className="hidden lg:inline">เอกสาร PDF</span>
                  </button>
                  <ChevronRight size={18} className="text-ink-subtle hidden lg:block"/>
                </div>
              </div>
            ))
          )}
        </div>

        {/* --- เอกสารตรวจนับยอดจริง --- */}
        {verifyingTx && (
          <StockVerifyDocument
            tx={verifyingTx}
            onClose={() => setVerifyingTx(null)}
            actualQty={actualQty}
            setActualQty={setActualQty}
            itemNotes={itemNotes}
            setItemNotes={setItemNotes}
            extraItems={extraItems}
            isAddingMode={isAddingMode}
            setIsAddingMode={setIsAddingMode}
            addSearch={addSearch}
            setAddSearch={setAddSearch}
            filteredAddProducts={filteredAddProducts}
            handleAddExtraItem={handleAddExtraItem}
            handleRemoveExtraItem={handleRemoveExtraItem}
            canVerify={canVerifyStock(user)}
            canEditCompleted={hasPermission(user, 'EDIT_COMPLETED_TX')}
            isAdminUser={user?.role === 'admin'}
            onVerify={() => handleVerifyAndSave(extraItems, itemNotes)}
            onCopy={() => copyToClipboard(generateSummaryText(verifyingTx))}
            onOpenPdf={(tx) => onOpenTransactionDoc && onOpenTransactionDoc(tx)}
            onVoid={() => handleVoidTransaction(verifyingTx)}
            onEdit={() => handleEditCompletedTx(verifyingTx)}
            onDelete={() => handleDeleteHistory(verifyingTx)}
          />
        )}
      </div>
  );
}
