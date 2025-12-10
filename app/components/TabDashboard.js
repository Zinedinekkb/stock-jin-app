import React, { useState } from 'react';
import { Filter, Share2, FileText, X } from 'lucide-react'; // เพิ่มไอคอน
import dynamic from 'next/dynamic';

const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });

export default function TabDashboard({ 
  transactions, 
  dateFilterType, setDateFilterType, 
  setCustomStartDate, setCustomEndDate,
  handleSendDailyReport // รับ function มา
}) {
    const [showReportModal, setShowReportModal] = useState(false); // State Modal

    // --- Logic กราฟเดิม ---
    const completedTx = transactions.filter(t => t.status === 'completed');
    const now = new Date(); let start = new Date(); let end = new Date();
    
    if (dateFilterType === 'today') {
      start.setHours(0,0,0,0); end.setHours(23,59,59,999);
    } else if (dateFilterType === '7days') { 
      start.setDate(now.getDate()-6); start.setHours(0,0,0,0); end.setHours(23,59,59); 
    } else if (dateFilterType === '30days') {
      start.setDate(now.getDate()-29); start.setHours(0,0,0,0); end.setHours(23,59,59);
    }
    
    const filtered = completedTx.filter(tx => tx.timestamp >= start.getTime() && tx.timestamp <= end.getTime());
    const chartMap = {};
    filtered.forEach(tx => {
      const d = new Date(tx.timestamp); const l = `${d.getDate()}/${d.getMonth()+1}`;
      if(!chartMap[l]) chartMap[l]={name:l,in:0,out:0};
      const items = tx.items || [];
      const total = items.reduce((s,i) => s + (tx.actualItems ? (parseInt(tx.actualItems[i.id])||0) : i.qty), 0);
      if(tx.type==='IN') chartMap[l].in+=total; else chartMap[l].out+=total;
    });
    const chartData = Object.values(chartMap);
    const totalIn = filtered.filter(t => t.type === 'IN').reduce((sum, t) => sum + (t.items || []).reduce((s, i) => s + (t.actualItems ? (parseInt(t.actualItems[i.id])||0) : i.qty), 0), 0);
    const totalOut = filtered.filter(t => t.type === 'OUT').reduce((sum, t) => sum + (t.items || []).reduce((s, i) => s + (t.actualItems ? (parseInt(t.actualItems[i.id])||0) : i.qty), 0), 0);

  return (
      <div className="space-y-4 pb-20 animate-fade-in-slide relative">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-green-900">ภาพรวมสต็อก</h2>
            
            {/* --- [เพิ่มใหม่] ปุ่มเปิด Modal ส่งรายงาน --- */}
            <button onClick={() => setShowReportModal(true)} className="bg-white text-green-700 border border-green-200 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1 active:scale-95 transition-all">
                <Share2 size={14}/> ส่งสรุปวันนี้
            </button>
            {/* -------------------------------------- */}
        </div>

        {/* Modal เลือกประเภทรายงาน */}
        {showReportModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
                <div className="bg-white w-full max-w-xs rounded-2xl shadow-2xl p-5 animate-scale-in">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><FileText size={20}/> เลือกแบบสรุป</h3>
                        <button onClick={() => setShowReportModal(false)}><X size={20} className="text-gray-400"/></button>
                    </div>
                    <div className="space-y-3">
                        <button onClick={() => { handleSendDailyReport('BOTH'); setShowReportModal(false); }} className="w-full py-3 bg-green-600 text-white rounded-xl font-bold shadow-md hover:bg-green-700 active:scale-95 transition-all">
                            📊 สรุปทั้งหมด (เข้า + ออก)
                        </button>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => { handleSendDailyReport('IN'); setShowReportModal(false); }} className="py-3 bg-green-50 text-green-700 border border-green-200 rounded-xl font-bold hover:bg-green-100 active:scale-95 transition-all">
                                📥 เฉพาะรับเข้า
                            </button>
                            <button onClick={() => { handleSendDailyReport('OUT'); setShowReportModal(false); }} className="py-3 bg-red-50 text-red-700 border border-red-200 rounded-xl font-bold hover:bg-red-100 active:scale-95 transition-all">
                                📤 เฉพาะเบิกออก
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-200 space-y-3">
          <div className="flex items-center gap-2"><Filter size={16} className="text-gray-500"/> <span className="text-xs font-bold text-gray-500">ช่วงเวลา</span></div>
          <div className="flex bg-gray-100 p-1 rounded-xl overflow-x-auto no-scrollbar gap-1">
            {['today', '7days', '30days', 'custom'].map(t => (
              <button key={t} onClick={()=>setDateFilterType(t)} className={`flex-1 min-w-[60px] py-2 text-xs font-bold rounded-lg ${dateFilterType===t?'bg-white shadow text-green-700':'text-gray-500'}`}>
                {t==='today'?'วันนี้':t==='7days'?'7 วัน':t==='30days'?'30 วัน':'กำหนด'}
              </button>
            ))}
          </div>
          {dateFilterType === 'custom' && <div className="flex gap-2"><input type="date" className="border p-1 rounded text-xs" onChange={e=>setCustomStartDate(e.target.value)}/><input type="date" className="border p-1 rounded text-xs" onChange={e=>setCustomEndDate(e.target.value)}/></div>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 p-4 rounded-2xl shadow-sm border border-green-100"><p className="text-xs text-green-700 font-bold mb-1 opacity-80">ยอดรับเข้า</p><p className="text-3xl font-black text-green-800 tracking-tight">+{totalIn}</p></div>
          <div className="bg-red-50 p-4 rounded-2xl shadow-sm border border-red-100"><p className="text-xs text-red-700 font-bold mb-1 opacity-80">ยอดเบิกออก</p><p className="text-3xl font-black text-red-800 tracking-tight">-{totalOut}</p></div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
              <YAxis tick={{fontSize: 10}} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="in" fill="#15803d" radius={[4, 4, 0, 0]} name="รับเข้า" />
              <Bar dataKey="out" fill="#dc2626" radius={[4, 4, 0, 0]} name="เบิกออก" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
  );
}