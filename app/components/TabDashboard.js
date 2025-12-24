import React, { useState, useMemo } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid
} from 'recharts';
import { Calendar, Send, FileText, TrendingUp, TrendingDown, Package, AlertCircle, Filter } from 'lucide-react';

export default function TabDashboard({ transactions, dateFilterType, setDateFilterType, setCustomStartDate, setCustomEndDate }) {

  // --- ส่วนของรายงานย้อนหลัง (อัปเกรดใหม่: เลือกประเภทได้) ---
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportType, setReportType] = useState('ALL'); // ALL, IN, OUT
  const [isSending, setIsSending] = useState(false);

  const handleSendDailyReport = async () => {
    setIsSending(true);
    try {
      // 1. กำหนดช่วงเวลาของวัน
      const startOfDay = new Date(reportDate).setHours(0, 0, 0, 0);
      const endOfDay = new Date(reportDate).setHours(23, 59, 59, 999);
      const dateTh = new Date(reportDate).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });

      // 2. กรองข้อมูล (ตามวันที่ และ ตามประเภทที่เลือก)
      const targetTx = transactions.filter(tx => {
        const inTime = tx.timestamp >= startOfDay && tx.timestamp <= endOfDay;
        const active = tx.status !== 'cancelled';
        const typeMatch = reportType === 'ALL' || tx.type === reportType; // เช็คประเภทตรงนี้
        return inTime && active && typeMatch;
      });

      if (targetTx.length === 0) {
        alert(`❌ ไม่พบรายการ "${reportType === 'IN' ? 'รับเข้า' : reportType === 'OUT' ? 'เบิกออก' : 'ทั้งหมด'}" ในวันที่เลือก`);
        setIsSending(false);
        return;
      }

      // 3. คำนวณยอด
      const itemSummary = {};

      targetTx.forEach(tx => {
        const isImport = tx.type === 'IN';
        (tx.items || []).forEach(item => {
          const qty = (tx.actualItems && tx.actualItems[item.id] !== undefined) ? tx.actualItems[item.id] : item.qty;

          if (!itemSummary[item.name]) itemSummary[item.name] = { in: 0, out: 0, unit: item.unit };
          if (isImport) itemSummary[item.name].in += qty;
          else itemSummary[item.name].out += qty;
        });
      });

      // 4. สร้างหัวข้อรายงาน
      let title = `📊 สรุปภาพรวม`;
      if (reportType === 'IN') title = `📥 สรุปยอดรับเข้า`;
      if (reportType === 'OUT') title = `📤 สรุปยอดเบิกออก`;

      // 5. สร้างข้อความ
      let msg = `${title} ประจำวันที่ ${dateTh}\n`;
      msg += `========================\n`;

      // แสดงจำนวนรายการ (ตามประเภทที่เลือก)
      if (reportType === 'ALL' || reportType === 'IN') msg += `📥 รับเข้า: ${targetTx.filter(t => t.type === 'IN').length} รายการ\n`;
      if (reportType === 'ALL' || reportType === 'OUT') msg += `📤 เบิกออก: ${targetTx.filter(t => t.type === 'OUT').length} รายการ\n`;

      msg += `========================\n`;
      msg += `📦 รายละเอียดสินค้า:\n`;

      Object.keys(itemSummary).forEach(name => {
        const data = itemSummary[name];
        // โชว์เฉพาะยอดที่มีการเคลื่อนไหวตามประเภทที่เลือก
        const showIn = (reportType === 'ALL' || reportType === 'IN') && data.in > 0;
        const showOut = (reportType === 'ALL' || reportType === 'OUT') && data.out > 0;

        if (showIn || showOut) {
          msg += `• ${name}: `;
          if (showIn) msg += `รับ ${data.in} `;
          if (showOut) msg += `เบิก ${data.out} `;
          msg += `${data.unit}\n`;
        }
      });
      msg += `========================\n`;
      msg += `รายงานโดย: Stock Jin System`;

      // 6. ส่ง API
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg })
      });

      alert('✅ ส่งรายงานเรียบร้อย!');

    } catch (error) {
      console.error(error);
      alert('❌ เกิดข้อผิดพลาด');
    } finally {
      setIsSending(false);
    }
  };

  // --- LOGIC กราฟ (เหมือนเดิม) ---
  const stats = useMemo(() => {
    let filtered = transactions;
    const now = new Date();

    if (dateFilterType === 'today') {
      const start = new Date(now.setHours(0, 0, 0, 0)).getTime();
      filtered = transactions.filter(t => t.timestamp >= start);
    } else if (dateFilterType === '7days') {
      const start = new Date(now.setDate(now.getDate() - 7)).getTime();
      filtered = transactions.filter(t => t.timestamp >= start);
    } else if (dateFilterType === '30days') {
      const start = new Date(now.setDate(now.getDate() - 30)).getTime();
      filtered = transactions.filter(t => t.timestamp >= start);
    }

    let countIn = 0;
    let countOut = 0;

    filtered.forEach(tx => {
      if (tx.status === 'cancelled') return;
      if (tx.type === 'IN') countIn++;
      else countOut++;
    });

    return { countIn, countOut, total: filtered.length };
  }, [transactions, dateFilterType]);

  const dataPie = [
    { name: 'รับเข้า', value: stats.countIn, color: '#22c55e' },
    { name: 'เบิกออก', value: stats.countOut, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6 pb-20 animate-fade-in">

      {/* ส่วนหัว Dashboard */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <TrendingUp className="text-orange-500" /> ภาพรวมสต็อก
        </h2>

        <div className="flex bg-gray-100 p-1 rounded-lg mt-4 text-xs font-bold">
          <button onClick={() => setDateFilterType('today')} className={`flex-1 py-2 rounded-md transition-all ${dateFilterType === 'today' ? 'bg-white shadow text-green-700' : 'text-gray-400'}`}>วันนี้</button>
          <button onClick={() => setDateFilterType('7days')} className={`flex-1 py-2 rounded-md transition-all ${dateFilterType === '7days' ? 'bg-white shadow text-green-700' : 'text-gray-400'}`}>7 วัน</button>
          <button onClick={() => setDateFilterType('30days')} className={`flex-1 py-2 rounded-md transition-all ${dateFilterType === '30days' ? 'bg-white shadow text-green-700' : 'text-gray-400'}`}>30 วัน</button>
        </div>
      </div>

      {/* --- [UPDATE] กล่องส่งรายงานย้อนหลัง --- */}
      <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-2xl shadow-sm border border-blue-100">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-bold text-blue-800 flex items-center gap-2">
            <Calendar size={18} /> รายงานย้อนหลัง (LINE)
          </h3>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            {/* เลือกวันที่ */}
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="flex-1 bg-white border border-blue-200 text-gray-700 text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500"
            />

            {/* เลือกประเภทรายงาน (เพิ่มใหม่ตรงนี้!) */}
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="bg-white border border-blue-200 text-gray-700 text-sm rounded-lg px-2 py-2 outline-none focus:border-blue-500 font-bold"
            >
              <option value="ALL">รวมทั้งหมด</option>
              <option value="IN">📥 เฉพาะรับเข้า</option>
              <option value="OUT">📤 เฉพาะเบิกออก</option>
            </select>
          </div>

          <button
            onClick={handleSendDailyReport}
            disabled={isSending}
            className={`w-full py-2.5 rounded-lg text-sm font-bold shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 text-white
                    ${reportType === 'IN' ? 'bg-green-600 shadow-green-200' :
                reportType === 'OUT' ? 'bg-red-500 shadow-red-200' :
                  'bg-blue-600 shadow-blue-200'}`
            }
          >
            {isSending ? 'กำลังส่ง...' : <><Send size={16} /> ส่งรายงาน {reportType === 'ALL' ? 'รวม' : reportType === 'IN' ? 'รับเข้า' : 'เบิกออก'}</>}
          </button>
        </div>
      </div>

      {/* Cards สรุปตัวเลข */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-green-500 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-400 font-bold">รับเข้า (รายการ)</p>
              <h3 className="text-2xl font-black text-green-700">{stats.countIn}</h3>
            </div>
            <div className="bg-green-100 p-2 rounded-full text-green-600"><Package size={20} /></div>
          </div>
          <p className="text-[10px] text-gray-300 mt-2">ในช่วงเวลาที่เลือก</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-red-500 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-400 font-bold">เบิกออก (รายการ)</p>
              <h3 className="text-2xl font-black text-red-700">{stats.countOut}</h3>
            </div>
            <div className="bg-red-100 p-2 rounded-full text-red-600"><TrendingDown size={20} /></div>
          </div>
          <p className="text-[10px] text-gray-300 mt-2">ในช่วงเวลาที่เลือก</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 min-h-[250px] flex flex-col items-center justify-center">
        <h3 className="text-sm font-bold text-gray-600 mb-4 w-full text-left">สัดส่วนการเคลื่อนไหว</h3>
        {stats.total > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={dataPie} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                {dataPie.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-gray-300 flex flex-col items-center">
            <AlertCircle size={40} className="mb-2 opacity-50" />
            <p className="text-xs">ไม่มีข้อมูลในช่วงนี้</p>
          </div>
        )}
      </div>

    </div>
  );
}