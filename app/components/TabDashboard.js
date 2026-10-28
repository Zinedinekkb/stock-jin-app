import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Calendar, Send, FileText, Package, AlertCircle, Copy, FileSpreadsheet, Clock3 } from 'lucide-react';
import { GlassCard, Button, Badge } from './ui';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';

export default function TabDashboard({ transactions, products, categories, dateFilterType, setDateFilterType, setCustomStartDate, setCustomEndDate }) {

  // --- ส่วนของรายงานย้อนหลัง (อัปเกรด: เลือกช่วงเวลาได้) ---
  const [reportStartDate, setReportStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportType, setReportType] = useState('ALL'); // ALL, IN, OUT
  const [isSending, setIsSending] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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

  // ฟังก์ชัน 3: Export Excel
  const handleExportExcel = () => {
    setIsExporting(true);
    try {
      exportToExcel(transactions, reportStartDate, reportEndDate, reportType, products, categories);
    } catch (error) {
      console.error(error);
      alert('❌ เกิดข้อผิดพลาดในการสร้างไฟล์ Excel');
    } finally {
      setIsExporting(false);
    }
  };

  // ฟังก์ชัน 4: Export PDF
  const handleExportPDF = () => {
    setIsExporting(true);
    try {
      exportToPDF(transactions, reportStartDate, reportEndDate, reportType, products, categories);
    } catch (error) {
      console.error(error);
      alert('❌ เกิดข้อผิดพลาดในการสร้างไฟล์ PDF');
    } finally {
      setIsExporting(false);
    }
  };

  // --- ANALYTICS ---
  // Validated pair (dataviz validate_palette.js, light surface): IN teal, OUT brand purple
  const SERIES = { IN: '#0f9f8f', OUT: '#6355d8' };
  const PERIODS = [
    { key: 'today', label: 'วันนี้', days: 1 },
    { key: '7days', label: '7 วัน', days: 7 },
    { key: '30days', label: '30 วัน', days: 30 },
  ];
  const period = PERIODS.find(p => p.key === dateFilterType) || PERIODS[1];

  const analytics = useMemo(() => {
    const qtyOf = (tx, item) => {
      const actual = tx.actualItems?.[item.id];
      return Number(actual !== undefined && actual !== null ? actual : item.qty) || 0;
    };
    const dayKey = (ts) => {
      const d = new Date(ts);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    };

    // Daily buckets: at least 7 so "today" still shows a trend
    const chartDays = Math.max(7, period.days);
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const buckets = [];
    for (let i = chartDays - 1; i >= 0; i--) {
      const d = new Date(startOfToday); d.setDate(d.getDate() - i);
      buckets.push({ key: dayKey(d), label: d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }), IN: 0, OUT: 0 });
    }
    const byKey = Object.fromEntries(buckets.map(b => [b.key, b]));
    const periodStart = new Date(startOfToday); periodStart.setDate(periodStart.getDate() - (period.days - 1));

    const totals = { IN: 0, OUT: 0, bills: 0 };
    const withdrawn = {};
    // Only completed bills moved stock; pending ones are counted separately
    transactions.forEach(tx => {
      if (tx.status !== 'completed' || !tx.timestamp) return;
      const type = tx.type === 'IN' ? 'IN' : 'OUT';
      const bucket = byKey[dayKey(tx.timestamp)];
      const inPeriod = tx.timestamp >= periodStart.getTime();
      if (inPeriod) totals.bills += 1;
      (tx.items || []).forEach(item => {
        const q = qtyOf(tx, item);
        if (bucket) bucket[type] += q;
        if (inPeriod) {
          totals[type] += q;
          if (type === 'OUT') {
            const k = item.id || item.name;
            withdrawn[k] = withdrawn[k] || { name: item.name, unit: item.unit, qty: 0 };
            withdrawn[k].qty += q;
          }
        }
      });
    });

    const level = (p) => {
      const s = Number(p.stock) || 0;
      return s <= 0 ? 'out' : s <= (p.minStock || 5) ? 'low' : 'ok';
    };
    const lowList = products
      .filter(p => level(p) !== 'ok')
      .sort((a, b) => (Number(a.stock) || 0) - (Number(b.stock) || 0));

    return {
      buckets,
      totals,
      topWithdrawn: Object.values(withdrawn).sort((a, b) => b.qty - a.qty).slice(0, 5),
      lowList,
      lowCount: lowList.filter(p => level(p) === 'low').length,
      outCount: lowList.filter(p => level(p) === 'out').length,
      pendingCount: transactions.filter(tx => tx.status === 'pending').length,
      hasMovement: buckets.some(b => b.IN > 0 || b.OUT > 0),
    };
  }, [transactions, products, period.days]);

  const ChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="glass-strong rounded-control px-3 py-2 text-xs">
        <p className="font-bold text-ink mb-1">{label}</p>
        {payload.map(p => (
          <p key={p.dataKey} className="flex items-center gap-2 text-ink-muted">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: p.color }} />
            {p.name} <span className="font-bold text-ink tabular-nums">{p.value.toLocaleString('th-TH')}</span>
          </p>
        ))}
      </div>
    );
  };

  const kpis = [
    { label: 'สินค้าทั้งหมด', value: products.length, unit: 'รายการ', icon: Package, tone: 'text-brand-600 bg-brand-50' },
    { label: 'ใกล้หมด', value: analytics.lowCount, unit: 'รายการ', icon: AlertCircle, tone: 'text-warning-700 bg-warning-50' },
    { label: 'หมด / ติดลบ', value: analytics.outCount, unit: 'รายการ', icon: AlertCircle, tone: 'text-danger-600 bg-danger-50' },
    { label: 'บิลรอตรวจ', value: analytics.pendingCount, unit: 'บิล', icon: Clock3, tone: 'text-brand-600 bg-brand-50' },
  ];
  const maxWithdrawn = analytics.topWithdrawn[0]?.qty || 1;

  return (
    <div className="space-y-5 pb-20 animate-fade-in">
      {/* Period filter: one control drives every number below */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="glass grid grid-cols-3 p-1 rounded-2xl" role="tablist" aria-label="ช่วงเวลา">
          {PERIODS.map(p => (
            <button key={p.key} role="tab" aria-selected={period.key === p.key} onClick={() => setDateFilterType(p.key)}
              className={`h-9 px-4 rounded-xl text-sm font-bold transition-colors ${period.key === p.key ? 'bg-white text-brand-600 shadow-sm' : 'text-ink-muted hover:text-ink'}`}>
              {p.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-ink-subtle">นับเฉพาะบิลที่ยืนยันแล้ว</p>
      </div>

      {/* KPI tiles: a single number each, no chart needed */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {kpis.map(({ label, value, unit, icon: Icon, tone }) => (
          <GlassCard key={label} className="p-4">
            <span className={`w-9 h-9 rounded-control flex items-center justify-center ${value > 0 ? tone : 'bg-white/70 text-ink-subtle'}`}><Icon size={18} /></span>
            <p className="mt-2 text-2xl font-black text-ink tabular-nums">{value.toLocaleString('th-TH')}<span className="text-xs font-semibold text-ink-subtle"> {unit}</span></p>
            <p className="text-sm text-ink-muted">{label}</p>
          </GlassCard>
        ))}
      </div>

      {/* Movement over time: IN vs OUT quantity per day */}
      <GlassCard className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
          <div>
            <h3 className="text-base font-bold text-ink">การเคลื่อนไหวสต็อกรายวัน</h3>
            <p className="text-xs text-ink-subtle">จำนวนชิ้น {analytics.buckets.length} วันล่าสุด</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-ink-muted"><span className="w-3 h-3 rounded-sm" style={{ background: SERIES.IN }} /> รับเข้า <b className="text-ink tabular-nums">{analytics.totals.IN.toLocaleString('th-TH')}</b></span>
            <span className="flex items-center gap-1.5 text-ink-muted"><span className="w-3 h-3 rounded-sm" style={{ background: SERIES.OUT }} /> เบิกออก <b className="text-ink tabular-nums">{analytics.totals.OUT.toLocaleString('th-TH')}</b></span>
          </div>
        </div>
        {analytics.hasMovement ? (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.buckets} barGap={2} barCategoryGap={analytics.buckets.length > 14 ? '20%' : '30%'} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                <CartesianGrid vertical={false} stroke="#e8e5fc" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#6b6788' }} interval={analytics.buckets.length > 14 ? 4 : 0} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#6b6788' }} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(99,85,216,0.06)' }} />
                <Bar dataKey="IN" name="รับเข้า" fill={SERIES.IN} radius={[4, 4, 0, 0]} maxBarSize={18} />
                <Bar dataKey="OUT" name="เบิกออก" fill={SERIES.OUT} radius={[4, 4, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-40 flex flex-col items-center justify-center text-ink-subtle text-sm">
            <AlertCircle size={28} className="mb-2 text-brand-300" /> ยังไม่มีบิลที่ยืนยันในช่วงนี้
          </div>
        )}
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top withdrawn items: ranked magnitude, one hue */}
        <GlassCard className="p-4 sm:p-5">
          <h3 className="text-base font-bold text-ink">เบิกออกมากที่สุด</h3>
          <p className="text-xs text-ink-subtle mb-3">{period.label}</p>
          {analytics.topWithdrawn.length === 0 ? (
            <p className="text-sm text-ink-subtle py-6 text-center">ยังไม่มีการเบิกออก</p>
          ) : (
            <ol className="space-y-2.5">
              {analytics.topWithdrawn.map((item, i) => (
                <li key={item.name}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-ink font-semibold truncate"><span className="text-ink-subtle tabular-nums">{i + 1}.</span> {item.name}</span>
                    <span className="text-ink font-bold tabular-nums shrink-0">{item.qty.toLocaleString('th-TH')} <span className="text-xs font-normal text-ink-subtle">{item.unit}</span></span>
                  </div>
                  <div className="h-2 mt-1 rounded-full bg-brand-50 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(item.qty / maxWithdrawn) * 100}%`, background: SERIES.OUT }} />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </GlassCard>

        {/* What needs reordering */}
        <GlassCard className="p-4 sm:p-5">
          <h3 className="text-base font-bold text-ink">ต้องสั่งเพิ่ม</h3>
          <p className="text-xs text-ink-subtle mb-3">สินค้าที่ต่ำกว่าขั้นต่ำ เรียงจากน้อยไปมาก</p>
          {analytics.lowList.length === 0 ? (
            <p className="text-sm text-ink-subtle py-6 text-center">สต็อกพอทุกรายการ</p>
          ) : (
            <ul className="divide-y divide-white/70 max-h-72 overflow-y-auto -mx-1">
              {analytics.lowList.slice(0, 12).map(p => {
                const out = (Number(p.stock) || 0) <= 0;
                return (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-1 py-2 text-sm">
                    <span className="min-w-0">
                      <span className="block font-semibold text-ink truncate">{p.name}</span>
                      <span className="block text-xs text-ink-subtle">{p.category || 'ไม่มีหมวด'} · ขั้นต่ำ {p.minStock || 5}</span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className={`font-black tabular-nums ${out ? 'text-danger-600' : 'text-warning-700'}`}>{p.stock} <span className="text-xs font-normal text-ink-subtle">{p.unit}</span></span>
                      <Badge tone={out ? 'danger' : 'warning'}>{out ? 'หมด' : 'ใกล้หมด'}</Badge>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {analytics.lowList.length > 12 && <p className="text-xs text-ink-subtle mt-2">และอีก {analytics.lowList.length - 12} รายการ ดูทั้งหมดในหน้าคลังสินค้า (ตัวกรอง “ใกล้หมด”)</p>}
        </GlassCard>
      </div>

      {/* Reports: send, copy, export for any date range */}
      <GlassCard className="p-4 sm:p-5 space-y-3">
        <div>
          <h3 className="text-base font-bold text-ink flex items-center gap-2"><Calendar size={18} className="text-brand-500" /> รายงานสรุปตามช่วงวันที่</h3>
          <p className="text-xs text-ink-subtle">ส่งเข้า LINE คัดลอก หรือดาวน์โหลดเป็น Excel / PDF</p>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <label className="block">
            <span className="block text-xs font-bold text-ink-muted mb-1">ตั้งแต่</span>
            <input type="date" value={reportStartDate}
              onChange={(e) => { setReportStartDate(e.target.value); if (e.target.value > reportEndDate) setReportEndDate(e.target.value); }}
              className="w-full h-11 px-3 rounded-control bg-white/80 border border-white text-sm text-ink outline-none focus:ring-2 focus:ring-brand-200" />
          </label>
          <label className="block">
            <span className="block text-xs font-bold text-ink-muted mb-1">ถึง</span>
            <input type="date" value={reportEndDate} min={reportStartDate} onChange={(e) => setReportEndDate(e.target.value)}
              className="w-full h-11 px-3 rounded-control bg-white/80 border border-white text-sm text-ink outline-none focus:ring-2 focus:ring-brand-200" />
          </label>
        </div>
        <div className="glass grid grid-cols-3 p-1 rounded-2xl" role="tablist" aria-label="ประเภทรายงาน">
          {[{ key: 'ALL', label: 'ทั้งหมด' }, { key: 'IN', label: 'รับเข้า' }, { key: 'OUT', label: 'เบิกออก' }].map(t => (
            <button key={t.key} role="tab" aria-selected={reportType === t.key} onClick={() => setReportType(t.key)}
              className={`h-9 rounded-xl text-sm font-bold transition-colors ${reportType === t.key ? 'bg-white text-brand-600 shadow-sm' : 'text-ink-muted hover:text-ink'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Button icon={Send} loading={isSending} onClick={handleSendDailyReport}>ส่งเข้า LINE</Button>
          <Button variant="secondary" icon={Copy} onClick={handleCopyReport}>คัดลอก</Button>
          <Button variant="secondary" icon={FileSpreadsheet} disabled={isExporting} onClick={handleExportExcel}>Excel</Button>
          <Button variant="secondary" icon={FileText} disabled={isExporting} onClick={handleExportPDF}>PDF</Button>
        </div>
      </GlassCard>
    </div>
  );
}
