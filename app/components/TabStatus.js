// app/components/TabStatus.js
import React from 'react';
import { Clock, CheckCircle2, ChevronRight, ClipboardList, FileText, X, Minus, Plus, Copy } from 'lucide-react';

export default function TabStatus({
  transactions, statusFilter, setStatusFilter,
  verifyingTx, setVerifyingTx,
  actualQty, setActualQty,
  openVerifyModal, handleVerifyAndSave, copyToClipboard, generateSummaryText
}) {
    const filteredTx = transactions.filter(tx => statusFilter === 'pending' ? tx.status === 'pending' : tx.status === 'completed');

  return (
      <div className="space-y-4 pb-20 animate-fade-in-slide relative">
        <h2 className="text-2xl font-bold text-green-900 sticky top-0 bg-gray-50 z-10 py-2">สถานะคำสั่ง</h2>
        <div className="flex bg-gray-200 p-1 rounded-xl sticky top-12 z-10">
          <button onClick={() => setStatusFilter('pending')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${statusFilter === 'pending' ? 'bg-white shadow text-orange-600' : 'text-gray-500'}`}><Clock size={16}/> รอตรวจสอบ ({transactions.filter(t=>t.status==='pending').length})</button>
          <button onClick={() => setStatusFilter('completed')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${statusFilter === 'completed' ? 'bg-white shadow text-green-600' : 'text-gray-500'}`}><CheckCircle2 size={16}/> สำเร็จแล้ว</button>
        </div>
        
        <div className="space-y-3 mt-2">
          {filteredTx.length === 0 ? <div className="text-center text-gray-400 py-10">ไม่มีรายการ</div> : filteredTx.map(tx => (
            <div 
              key={tx.id} 
              onClick={() => openVerifyModal(tx)}
              className={`bg-white p-4 rounded-2xl shadow-sm border-l-4 cursor-pointer active:scale-95 transition-transform flex justify-between items-center ${tx.type === 'IN' ? 'border-green-500' : 'border-red-500'}`}
            >
              <div>
                <div className="flex items-center gap-2 mb-1"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tx.type==='IN'?'bg-green-100 text-green-800':'bg-red-100 text-red-800'}`}>{tx.type === 'IN' ? 'รับเข้า' : 'เบิกออก'}</span><span className="text-xs text-gray-400">{tx.date}</span></div>
                <p className="text-sm font-bold text-gray-700">{(tx.items||[]).length} รายการ <span className="font-normal text-gray-400">| โดย {tx.recorder}</span></p>
                {tx.note && <p className="text-[10px] text-gray-400 mt-1">Note: {tx.note}</p>}
              </div>
              <div className="flex items-center gap-2">
                 {statusFilter === 'pending' && <span className="text-xs font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded">ตรวจรับ</span>}
                 {statusFilter === 'completed' && <span className="text-xs font-bold text-green-500 bg-green-50 px-2 py-1 rounded">ดูข้อมูล</span>}
                 <ChevronRight size={20} className="text-gray-300"/>
              </div>
            </div>
          ))}
        </div>

        {verifyingTx && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className={`bg-white rounded-3xl shadow-2xl w-full max-w-sm m-auto overflow-hidden flex flex-col max-h-[80vh] animate-scale-in relative border-4 ${verifyingTx.status === 'pending' ? 'border-orange-100' : 'border-green-100'}`}>
              <div className={`p-4 border-b flex justify-between items-center ${verifyingTx.status === 'pending' ? 'bg-orange-50 border-orange-100' : 'bg-green-50 border-green-100'}`}>
                <div>
                  <h3 className={`font-bold flex items-center gap-2 ${verifyingTx.status === 'pending' ? 'text-orange-800' : 'text-green-800'}`}>
                    {verifyingTx.status === 'pending' ? <ClipboardList size={20}/> : <FileText size={20}/>} 
                    {verifyingTx.status === 'pending' ? 'ตรวจสอบยอดจริง' : 'รายละเอียด'}
                  </h3>
                  {verifyingTx.status === 'pending' && <p className="text-[10px] text-orange-600">โปรดระบุจำนวนที่รับ/เบิกจริง</p>}
                </div>
                <button onClick={() => setVerifyingTx(null)} className="bg-white p-1 rounded-full text-gray-400"><X size={20}/></button>
              </div>

              <div className="p-4 overflow-y-auto flex-1 bg-white space-y-4">
                {(verifyingTx.items || []).map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center border-b border-gray-100 pb-3">
                    <div className="flex-1">
                      <p className="font-bold text-gray-800 text-sm">{item.name}</p>
                      {verifyingTx.status === 'completed' ? (
                        <p className="text-xs text-gray-500">ขอ: {item.qty} → <span className="font-bold text-green-600">จริง: {actualQty[item.id]}</span> {item.unit}</p>
                      ) : (
                        <p className="text-xs text-gray-400">ยอดขอเบิก: {item.qty} {item.unit}</p>
                      )}
                    </div>
                    {verifyingTx.status === 'pending' ? (
                      <div className="flex items-center gap-3">
                        <button onClick={() => setActualQty(prev => ({...prev, [item.id]: Math.max(0, (prev[item.id]||0) - 1)}))} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600"><Minus size={14}/></button>
                        <div className="text-center w-12">
                          <input 
                            type="number" 
                            className="w-full text-center font-bold text-lg text-orange-600 outline-none border-b border-gray-200 focus:border-orange-500"
                            value={actualQty[item.id]}
                            onChange={(e) => setActualQty(prev => ({...prev, [item.id]: parseInt(e.target.value)||0}))}
                          />
                        </div>
                        <button onClick={() => setActualQty(prev => ({...prev, [item.id]: (prev[item.id]||0) + 1}))} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600"><Plus size={14}/></button>
                      </div>
                    ) : (
                      <div className="bg-gray-100 px-3 py-1 rounded-lg">
                        <span className="font-black text-gray-700">{actualQty[item.id]}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-100">
                {verifyingTx.status === 'pending' ? (
                  <button onClick={handleVerifyAndSave} className="w-full py-3.5 rounded-xl bg-orange-500 text-white font-bold shadow-lg shadow-orange-200 active:scale-95 transition-transform flex items-center justify-center gap-2">
                    <CheckCircle2 size={20}/> ยืนยันยอดและอัปเดตสต็อก
                  </button>
                ) : (
                  <button onClick={() => copyToClipboard(generateSummaryText(verifyingTx))} className="w-full py-3.5 rounded-xl bg-gray-800 text-white font-bold shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2">
                    <Copy size={20}/> คัดลอกประวัติ
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
  );
}