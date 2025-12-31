import React, { useState, useMemo } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid
} from 'recharts';
import { Calendar, Send, FileText, TrendingUp, TrendingDown, Package, AlertCircle, Filter, Copy, CheckCircle2, ArrowRight } from 'lucide-react';

export default function TabDashboard({ transactions, dateFilterType, setDateFilterType, setCustomStartDate, setCustomEndDate }) {

  // --- ส่วนของรายงานย้อนหลัง (อัปเกรด: เลือกช่วงเวลาได้) ---
  const [reportStartDate, setReportStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportType, setReportType] = useState('ALL'); // ALL, IN, OUT
  const [isSending, setIsSending] = useState(false);

  // ฟังก์ชันช่วย: สร้างข้อความรายงาน (รองรับช่วงเวลา)
  const generateReportMessage = () => {
    // 1. กำหนดช่วงเวลา
    const startOfDay = new Date(reportStartDate).setHours(0, 0, 0, 0);
    const endOfDay = new Date(reportEndDate).setHours(23, 59, 59, 999);

    const dateThStart = new Date(reportStartDate).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const dateThEnd = new Date(reportEndDate).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const dateDisplay = reportStartDate === reportEndDate ? dateThStart : `${dateThStart} - ${dateThEnd}`;

    // 2. กรองข้อมูล
    const targetTx = transactions.filter(tx => {
      const inTime = tx.timestamp >= startOfDay && tx.timestamp <= endOfDay;
      const active = tx.status !== 'cancelled';
      const typeMatch = reportType === 'ALL' || tx.type === reportType;
      return inTime && active && typeMatch;
    });

    if (targetTx.length === 0) {
      alert(`❌ ไม่พบรายการในช่วงวันที่เลือก`);
      return null;
    }

    // 3. คำนวณยอด (นับแยกสินค้าด้วย)
    const itemSummary = {};
    let skuCountIn = 0; // ตัวนับจำนวนสินค้า (ชนิด)
    let skuCountOut = 0;

    targetTx.forEach(tx => {
      const isImport = tx.type === 'IN';
      (tx.items || []).forEach(item => {
        const qty = (tx.actualItems && tx.actualItems[item.id] !== undefined) ? tx.actualItems[item.id] : item.qty;

        if (!itemSummary[item.name]) itemSummary[item.name] = { in: 0, out: 0, unit: item.unit };

        if (isImport) itemSummary[item.name].in += qty;
        else itemSummary[item.name].out += qty;
      });
    });

    // นับจำนวนรายการสินค้าที่มีการเคลื่อนไหวจริง
    Object.values(itemSummary).forEach(d => {
      if (d.in > 0) skuCountIn++;
      if (d.out > 0) skuCountOut++;
    });

    // 4. สร้างข้อความ
    let title = `📊 สรุปภาพรวม`;
    if (reportType === 'IN') title = `📥 สรุปยอดรับเข้า`;
    if (reportType === 'OUT') title = `📤 สรุปยอดเบิกออก`;

    let msg = `${title}\n`;
    msg += `📅 วันที่: ${dateDisplay}\n`;
    msg += `========================\n`;

    // [แก้จุดที่ 1] แสดงทั้งจำนวนบิล และ จำนวนสินค้าที่ลิสต์ออกมา
    if (reportType === 'ALL' || reportType === 'IN') {
      const billCount = targetTx.filter(t => t.type === 'IN').length;
      msg += `📥 รับเข้า: ${billCount} บิล (${skuCountIn} สินค้า)\n`;
    }
    if (reportType === 'ALL' || reportType === 'OUT') {
      const billCount = targetTx.filter(t => t.type === 'OUT').length;
      msg += `📤 เบิกออก: ${billCount} บิล (${skuCountOut} สินค้า)\n`;
    }

    msg += `========================\n`;
    msg += `📦 รายละเอียดสินค้า:\n`;

    Object.keys(itemSummary).forEach(name => {
      const data = itemSummary[name];
      const showIn = (reportType === 'ALL' || reportType === 'IN') && data.in > 0;
      const showOut = (reportType === 'ALL' || reportType === 'OUT') && data.out > 0;

      if (showIn || showOut) {
        msg += `• ${name}: `;

        // [แก้จุดที่ 2] เปลี่ยนคำว่า "เบิก" เป็น "ใช้ไป"
        if (showIn) msg += `รับ ${data.in} `;
        if (showIn && showOut) msg += `/ `; // ตัวคั่นถ้ามีทั้งรับและออก
        if (showOut) msg += `ใช้ไป ${data.out} `;

        msg += `${data.unit}\n`;
      }
    });
    msg += `========================\n`;
    msg += `รายงานโดย: Stock Jin System`;

    return msg;
  };

  // ฟังชันก์ 1: ส่งไลน์
  const handleSendDailyReport = async () => {
    const msg = generateReportMessage();
    if (!msg) return;

    setIsSending(true);
    try {
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

  // ฟังก์ชัน 2: คัดลอก
  const handleCopyReport = () => {
    const msg = generateReportMessage();
    if (!msg) return;

    navigator.clipboard.writeText(msg)
      .then(() => alert('✅ คัดลอกรายงานแล้ว!'))
      .catch(() => alert('❌ คัดลอกไม่สำเร็จ'));
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

      {/* --- [UPDATE] กล่องรายงาน (เลือกช่วงเวลาได้) --- */}
      <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-2xl shadow-sm border border-blue-100">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-bold text-blue-800 flex items-center gap-2">
            <Calendar size={18} /> รายงานสรุป (ช่วงเวลา)
          </h3>
        </div>

        <div className="flex flex-col gap-3">
          {/* เลือกวันที่ (ตั้งแต่ - ถึง) */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <p className="text-[10px] text-blue-500 mb-1 ml-1 font-bold">ตั้งแต่</p>
              <input
                type="date"
                value={reportStartDate}
                onChange={(e) => {
                  setReportStartDate(e.target.value);
                  if (e.target.value > reportEndDate) setReportEndDate(e.target.value);
                }}
                className="w-full bg-white border border-blue-200 text-gray-700 text-xs rounded-lg px-2 py-2 outline-none focus:border-blue-500"
              />
            </div>
            <div className="text-blue-300 pt-4"><ArrowRight size={16} /></div>
            <div className="flex-1">
              <p className="text-[10px] text-blue-500 mb-1 ml-1 font-bold">ถึงวันที่</p>
              <input
                type="date"
                value={reportEndDate}
                min={reportStartDate}
                onChange={(e) => setReportEndDate(e.target.value)}
                className="w-full bg-white border border-blue-200 text-gray-700 text-xs rounded-lg px-2 py-2 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* เลือกประเภทรายงาน */}
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="bg-white border border-blue-200 text-gray-700 text-sm rounded-lg px-2 py-2 outline-none focus:border-blue-500 font-bold w-full"
          >
            <option value="ALL">รวมทั้งหมด (รับ+เบิก)</option>
            <option value="IN">📥 เฉพาะยอดรับเข้า</option>
            <option value="OUT">📤 เฉพาะยอดเบิกออก</option>
          </select>

          <div className="flex gap-2">
            {/* ปุ่มส่งไลน์ */}
            <button
              onClick={handleSendDailyReport}
              disabled={isSending}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 text-white
                        ${reportType === 'IN' ? 'bg-green-600 shadow-green-200' :
                  reportType === 'OUT' ? 'bg-red-500 shadow-red-200' :
                    'bg-blue-600 shadow-blue-200'}`
              }
            >
              {isSending ? '...' : <><Send size={16} /> ส่งไลน์</>}
            </button>

            {/* ปุ่มคัดลอก */}
            <button
              onClick={handleCopyReport}
              className="flex-1 py-2.5 rounded-lg text-sm font-bold bg-yellow-400 text-yellow-900 shadow-md shadow-yellow-200 active:scale-95 transition-all flex items-center justify-center gap-2 border border-yellow-500"
            >
              <Copy size={16} /> คัดลอก
            </button>
          </div>

          <p className="text-[10px] text-gray-400 text-center">* เลือกช่วงเวลาที่ต้องการสรุปยอดได้เลย</p>
        </div>
      </div>

      {/* Cards สรุปตัวเลข (เหมือนเดิม) */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-green-500 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-400 font-bold">รับเข้า (รายการ)</p>
              <h3 className="text-2xl font-black text-green-700">{stats.countIn}</h3>
            </div>
            <div className="bg-green-100 p-2 rounded-full text-green-600"><Package size={20} /></div>
          </div>
          <p className="text-[10px] text-gray-300 mt-2">ในช่วงเวลาที่เลือก (ด้านบน)</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-red-500 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-400 font-bold">เบิกออก (รายการ)</p>
              <h3 className="text-2xl font-black text-red-700">{stats.countOut}</h3>
            </div>
            <div className="bg-red-100 p-2 rounded-full text-red-600"><TrendingDown size={20} /></div>
          </div>
          <p className="text-[10px] text-gray-300 mt-2">ในช่วงเวลาที่เลือก (ด้านบน)</p>
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