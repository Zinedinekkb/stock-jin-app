// app/components/TabStatus.js
import React, { useState, useEffect } from 'react'; // เพิ่ม useEffect
import { Clock, CheckCircle2, ChevronRight, ClipboardList, FileText, X, Minus, Plus, Copy, RotateCcw, Trash2, Ban, Search, PackagePlus } from 'lucide-react'; // เพิ่ม PackagePlus

export default function TabStatus({
  transactions, statusFilter, setStatusFilter,
  verifyingTx, setVerifyingTx,
  actualQty, setActualQty,
  openVerifyModal, handleVerifyAndSave,
  copyToClipboard, generateSummaryText,
  handleVoidTransaction, handleEditCompletedTx,
  user, handleDeleteHistory,
  products = [] // รับ props สินค้ามาด้วย
}) {
    const [searchTerm, setSearchTerm] = useState('');
    
    // --- State สำหรับฟีเจอร์เพิ่มของ ---
    const [extraItems, setExtraItems] = useState([]); // รายการที่เพิ่มเข้ามาเอง
    const [isAddingMode, setIsAddingMode] = useState(false); // เปิด/ปิดโหมดค้นหา
    const [addSearch, setAddSearch] = useState(''); // คำค้นหาตอนเพิ่มของ

    // Reset extraItems เมื่อเปิดบิลใหม่
    useEffect(() => {
        if (verifyingTx) {
            setExtraItems([]);
            setIsAddingMode(false);
            setAddSearch('');
        }
    }, [verifyingTx]);

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
        // ลบออกจาก actualQty ด้วย (Optional: ไม่ลบก็ได้ แต่ลบเพื่อความสะอาด)
        const newQty = { ...actualQty };
        delete newQty[productId];
        setActualQty(newQty);
    };

    // (ส่วน Logic filteredTx เหมือนเดิม)
    const filteredTx = transactions.filter(tx => {
      let matchStatus = false;
      if (statusFilter === 'pending') matchStatus = tx.status === 'pending';
      else if (statusFilter === 'completed') matchStatus = tx.status === 'completed';
      else if (statusFilter === 'cancelled') matchStatus = tx.status === 'cancelled';
      
      const lowerSearch = searchTerm.toLowerCase();
      const matchSearch = 
          (tx.recorder || '').toLowerCase().includes(lowerSearch) ||
          (tx.note || '').toLowerCase().includes(lowerSearch) ||
          (tx.items || []).some(item => item.name.toLowerCase().includes(lowerSearch));

      return matchStatus && matchSearch;
    });

  return (
      <div className="space-y-4 pb-20 animate-fade-in-slide relative">
        {/* ... (ส่วน Header, Search, Filter Tabs เหมือนเดิมเป๊ะ ไม่ต้องแก้) ... */}
        <div className="sticky top-0 bg-gray-50 z-10 py-2">
            <h2 className="text-2xl font-bold text-green-900 mb-2">สถานะคำสั่ง</h2>
            <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Search size={16} /></div>
                <input type="text" placeholder="ค้นหา (ชื่อคน, ชื่อสินค้า, Note)..." className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 bg-white shadow-sm text-sm focus:ring-2 focus:ring-green-500 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
                {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 bg-gray-100 rounded-full p-0.5"><X size={14} /></button>}
            </div>
        </div>
        
        <div className="flex bg-gray-200 p-1 rounded-xl sticky top-[88px] z-10 overflow-x-auto">
          <button onClick={() => setStatusFilter('pending')} className={`flex-1 min-w-[100px] py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${statusFilter === 'pending' ? 'bg-white shadow text-orange-600' : 'text-gray-500'}`}><Clock size={16}/> รอตรวจ</button>
          <button onClick={() => setStatusFilter('completed')} className={`flex-1 min-w-[100px] py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${statusFilter === 'completed' ? 'bg-white shadow text-green-600' : 'text-gray-500'}`}><CheckCircle2 size={16}/> สำเร็จ</button>
          <button onClick={() => setStatusFilter('cancelled')} className={`flex-1 min-w-[100px] py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${statusFilter === 'cancelled' ? 'bg-white shadow text-gray-600' : 'text-gray-500'}`}><Ban size={16}/> ยกเลิก</button>
        </div>
        
        <div className="space-y-3 mt-2">
          {filteredTx.length === 0 ? <div className="text-center text-gray-400 py-10">ไม่พบรายการที่ค้นหา</div> : filteredTx.map(tx => (
            <div key={tx.id} onClick={() => openVerifyModal(tx)} className={`bg-white p-4 rounded-2xl shadow-sm border-l-4 cursor-pointer active:scale-95 transition-transform flex justify-between items-center ${tx.status === 'cancelled' ? 'border-gray-400 opacity-60' : tx.type === 'IN' ? 'border-green-500' : 'border-red-500'}`}>
              <div>
                <div className="flex items-center gap-2 mb-1"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tx.status === 'cancelled' ? 'bg-gray-200 text-gray-600' : tx.type==='IN'?'bg-green-100 text-green-800':'bg-red-100 text-red-800'}`}>{tx.status === 'cancelled' ? 'ยกเลิกแล้ว' : (tx.type === 'IN' ? 'รับเข้า' : 'เบิกออก')}</span><span className="text-xs text-gray-400">{tx.date}</span></div>
                <p className={`text-sm font-bold text-gray-700 ${tx.status === 'cancelled' ? 'line-through' : ''}`}>{(tx.items||[]).length} รายการ <span className="font-normal text-gray-400">| โดย {tx.recorder}</span></p>
                {tx.status === 'cancelled' && <p className="text-[10px] text-red-400 mt-1">ยกเลิกโดย: {tx.cancelledBy}</p>}
              </div>
              <div className="flex items-center gap-2"><ChevronRight size={20} className="text-gray-300"/></div>
            </div>
          ))}
        </div>

        {/* --- Modal ตรวจสอบ --- */}
        {verifyingTx && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className={`bg-white rounded-3xl shadow-2xl w-full max-w-sm m-auto overflow-hidden flex flex-col max-h-[85vh] animate-scale-in relative border-4 ${
              verifyingTx.status === 'pending' ? 'border-orange-100' : 
              verifyingTx.status === 'cancelled' ? 'border-gray-300' : 'border-green-100'
            }`}>
              {/* Modal Header */}
              <div className={`p-4 border-b flex justify-between items-center ${
                verifyingTx.status === 'pending' ? 'bg-orange-50 border-orange-100' : 
                verifyingTx.status === 'cancelled' ? 'bg-gray-100 border-gray-200' : 'bg-green-50 border-green-100'
              }`}>
                <div><h3 className={`font-bold flex items-center gap-2 ${verifyingTx.status === 'pending' ? 'text-orange-800' : verifyingTx.status === 'cancelled' ? 'text-gray-600' : 'text-green-800'}`}>{verifyingTx.status === 'pending' ? <ClipboardList size={20}/> : <FileText size={20}/>} {verifyingTx.status === 'pending' ? 'ตรวจสอบยอดจริง' : verifyingTx.status === 'cancelled' ? 'รายการที่ยกเลิก' : 'รายละเอียด'}</h3></div>
                <button onClick={() => setVerifyingTx(null)} className="bg-white p-1 rounded-full text-gray-400"><X size={20}/></button>
              </div>

              {/* Items List */}
              <div className="p-4 overflow-y-auto flex-1 bg-white space-y-4">
                {/* 1. รายการเดิม */}
                {(verifyingTx.items || []).map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center border-b border-gray-100 pb-3">
                    <div className="flex-1">
                      <p className={`font-bold text-gray-800 text-sm ${verifyingTx.status === 'cancelled' ? 'line-through opacity-50' : ''}`}>{item.name}</p>
                      {verifyingTx.status === 'completed' || verifyingTx.status === 'cancelled' ? (
                        <p className="text-xs text-gray-500">ขอ: {item.qty} → <span className="font-bold text-green-600">จริง: {actualQty[item.id]}</span> {item.unit}</p>
                      ) : (
                        <p className="text-xs text-gray-400">ยอดขอเบิก: {item.qty} {item.unit}</p>
                      )}
                    </div>
                    {verifyingTx.status === 'pending' ? (
                      <div className="flex items-center gap-3">
                        <button onClick={() => setActualQty(prev => ({...prev, [item.id]: Math.max(0, (prev[item.id]||0) - 1)}))} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600"><Minus size={14}/></button>
                        <div className="text-center w-12"><input type="number" className="w-full text-center font-bold text-lg text-orange-600 outline-none border-b border-gray-200 focus:border-orange-500" value={actualQty[item.id]} onChange={(e) => setActualQty(prev => ({...prev, [item.id]: parseInt(e.target.value)||0}))}/></div>
                        <button onClick={() => setActualQty(prev => ({...prev, [item.id]: (prev[item.id]||0) + 1}))} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600"><Plus size={14}/></button>
                      </div>
                    ) : (
                      <div className="bg-gray-100 px-3 py-1 rounded-lg"><span className={`font-black text-gray-700 ${verifyingTx.status === 'cancelled' ? 'line-through opacity-50' : ''}`}>{actualQty[item.id]}</span></div>
                    )}
                  </div>
                ))}

                {/* 2. รายการที่เพิ่มเอง (Extra) */}
                {extraItems.map((item, idx) => (
                   <div key={`extra-${idx}`} className="flex justify-between items-center border-b border-orange-100 pb-3 bg-orange-50/50 p-2 rounded-lg relative">
                      <div className="absolute top-0 right-0 bg-orange-500 text-white text-[9px] px-1.5 py-0.5 rounded-bl-lg font-bold">เพิ่มเอง</div>
                      <div className="flex-1">
                        <p className="font-bold text-orange-900 text-sm">{item.name}</p>
                        <p className="text-xs text-orange-400">มาเกิน / ตกหล่น</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => setActualQty(prev => ({...prev, [item.id]: Math.max(0, (prev[item.id]||0) - 1)}))} className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-gray-600 shadow-sm"><Minus size={14}/></button>
                        <div className="text-center w-12"><input type="number" className="w-full text-center font-bold text-lg text-orange-600 outline-none bg-transparent border-b border-orange-200" value={actualQty[item.id] || 0} onChange={(e) => setActualQty(prev => ({...prev, [item.id]: parseInt(e.target.value)||0}))}/></div>
                        <button onClick={() => setActualQty(prev => ({...prev, [item.id]: (prev[item.id]||0) + 1}))} className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-gray-600 shadow-sm"><Plus size={14}/></button>
                      </div>
                      <button onClick={() => handleRemoveExtraItem(item.id)} className="absolute -left-2 -top-2 bg-red-100 text-red-500 rounded-full p-1 shadow-sm"><X size={12}/></button>
                   </div>
                ))}

                {/* 3. ปุ่มเพิ่มรายการ (เฉพาะสถานะ Pending) */}
                {verifyingTx.status === 'pending' && (
                    <div className="pt-2">
                        {!isAddingMode ? (
                            <button onClick={() => setIsAddingMode(true)} className="w-full py-2 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 text-sm font-bold flex items-center justify-center gap-2 hover:border-orange-300 hover:text-orange-500 hover:bg-orange-50 transition-all">
                                <PackagePlus size={18}/> เพิ่มรายการตกหล่น / มาเกิน
                            </button>
                        ) : (
                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 animate-scale-in">
                                <div className="flex items-center gap-2 mb-2">
                                    <Search size={16} className="text-gray-400"/>
                                    <input autoFocus placeholder="ค้นหาสินค้า..." className="flex-1 bg-transparent text-sm outline-none" value={addSearch} onChange={e => setAddSearch(e.target.value)}/>
                                    <button onClick={() => setIsAddingMode(false)}><X size={16} className="text-gray-400"/></button>
                                </div>
                                <div className="max-h-32 overflow-y-auto space-y-1">
                                    {filteredAddProducts.length === 0 && <p className="text-xs text-center text-gray-400 py-2">ไม่พบสินค้า</p>}
                                    {filteredAddProducts.map(p => {
                                        // ซ่อนสินค้าที่มีอยู่แล้วในรายการ
                                        const isExist = (verifyingTx.items || []).some(existing => existing.id === p.id) || extraItems.some(ex => ex.id === p.id);
                                        if (isExist) return null;
                                        return (
                                            <button key={p.id} onClick={() => handleAddExtraItem(p)} className="w-full text-left text-xs p-2 hover:bg-white rounded-lg flex justify-between items-center group">
                                                <span className="font-bold text-gray-700">{p.name}</span>
                                                <span className="text-[10px] text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded group-hover:bg-green-100 group-hover:text-green-700">เลือก</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-100 space-y-3">
                {/* ปุ่มสำหรับรายการ Pending */}
                {verifyingTx.status === 'pending' && (
                  <div className="flex gap-2">
                      {/* --- [เพิ่มใหม่] ปุ่ม Copy ตอน Pending --- */}
                      <button onClick={() => copyToClipboard(generateSummaryText(verifyingTx))} className="flex-1 py-3.5 rounded-xl bg-gray-800 text-white font-bold shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2">
                        <Copy size={18}/> คัดลอก
                      </button>
                      
                      {/* ปุ่มยืนยัน (ส่ง extraItems กลับไปด้วย) */}
                      <button onClick={() => handleVerifyAndSave(extraItems)} className="flex-[2] py-3.5 rounded-xl bg-orange-500 text-white font-bold shadow-lg shadow-orange-200 active:scale-95 transition-transform flex items-center justify-center gap-2">
                        <CheckCircle2 size={20}/> ยืนยันยอดจริง
                      </button>
                  </div>
                )}

                {/* ปุ่มสำหรับรายการ Completed */}
                {verifyingTx.status === 'completed' && (
                  <>
                     <button onClick={() => copyToClipboard(generateSummaryText(verifyingTx))} className="w-full py-3 rounded-xl bg-gray-800 text-white font-bold shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2">
                       <Copy size={18}/> คัดลอกประวัติ
                     </button>
                     <div className="flex gap-2">
                        <button onClick={() => handleEditCompletedTx(verifyingTx)} className="flex-1 py-3 rounded-xl bg-yellow-100 text-yellow-700 font-bold border border-yellow-200 active:scale-95 transition-transform flex items-center justify-center gap-2">
                           <RotateCcw size={18}/> แก้ไข
                        </button>
                        <button onClick={() => handleVoidTransaction(verifyingTx)} className="flex-1 py-3 rounded-xl bg-red-100 text-red-700 font-bold border border-red-200 active:scale-95 transition-transform flex items-center justify-center gap-2">
                           <Ban size={18}/> ยกเลิก
                        </button>
                     </div>
                  </>
                )}

                {/* ปุ่มลบประวัติถาวร */}
                {user?.role === 'admin' && verifyingTx.status !== 'pending' && (
                    <button onClick={() => handleDeleteHistory(verifyingTx)} className="w-full py-2.5 rounded-xl bg-white border-2 border-red-100 text-red-500 font-bold text-xs flex items-center justify-center gap-2 mt-2 hover:bg-red-50">
                        <Trash2 size={14}/> ลบประวัตินี้ถาวร (Admin Only)
                    </button>
                )}
                
              </div>
            </div>
          </div>
        )}
      </div>
  );
}