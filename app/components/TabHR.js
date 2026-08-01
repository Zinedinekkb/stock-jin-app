// app/components/TabHR.js
'use client';
import React, { useState, useEffect } from 'react';
import {
  Clock, LogIn, LogOut, Calendar, FileText, CheckCircle, XCircle,
  ChevronDown, User, Users, ClipboardList, AlertCircle, Plus, X
} from 'lucide-react';
import { db } from '@/lib/firebase';
import {
  collection, addDoc, onSnapshot, query, where, orderBy,
  serverTimestamp, updateDoc, doc, Timestamp
} from 'firebase/firestore';

const LEAVE_TYPES = [
  { value: 'sick', label: 'ลาป่วย', color: '#ef4444', bg: '#fef2f2' },
  { value: 'personal', label: 'ลากิจ', color: '#f59e0b', bg: '#fffbeb' },
  { value: 'vacation', label: 'ลาพักร้อน', color: '#3b82f6', bg: '#eff6ff' },
];

function getTodayStr() {
  return new Date().toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function getTimeStr() {
  return new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

function getMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function TabHR({ user }) {
  const [view, setView] = useState('my'); // 'my' | 'team' (admin)
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [todayRecord, setTodayRecord] = useState(null);
  const [leaveForm, setLeaveForm] = useState({ type: 'sick', startDate: '', endDate: '', reason: '' });
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [notification, setNotification] = useState('');

  const showNote = (msg) => { setNotification(msg); setTimeout(() => setNotification(''), 2500); };

  // Listen to own attendance
  useEffect(() => {
    if (!user) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthStartMs = monthStart.getTime();

    // Fix index error: query by userId only, filter & sort client-side
    const qAtt = query(
      collection(db, 'attendance'),
      where('userId', '==', user.uid)
    );
    const unsub1 = onSnapshot(qAtt, (snap) => {
      const records = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(r => {
          if (!r.dateTimestamp) return true;
          const ts = r.dateTimestamp.toDate ? r.dateTimestamp.toDate().getTime() : new Date(r.dateTimestamp).getTime();
          return ts >= monthStartMs;
        })
        .sort((a, b) => {
          const ta = a.dateTimestamp?.toDate ? a.dateTimestamp.toDate().getTime() : (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0);
          const tb = b.dateTimestamp?.toDate ? b.dateTimestamp.toDate().getTime() : (b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0);
          return tb - ta;
        });
      setAttendance(records);
      const todayStr = getTodayStr();
      setTodayRecord(records.find(r => r.dateStr === todayStr) || null);
    }, (error) => {
      console.error("Attendance listener error:", error);
    });

    // Fix index error: query by userId only, sort client-side
    const qLeave = query(
      collection(db, 'leaves'),
      where('userId', '==', user.uid)
    );
    const unsub2 = onSnapshot(qLeave, (snap) => {
      const records = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return tb - ta;
        });
      setLeaves(records);
    }, (error) => {
      console.error("Leaves listener error:", error);
    });

    return () => { unsub1(); unsub2(); };
  }, [user]);

  // Admin: all team leaves
  const [teamLeaves, setTeamLeaves] = useState([]);
  useEffect(() => {
    if (user?.role !== 'admin') return;
    const q = collection(db, 'leaves');
    const unsub = onSnapshot(q, (snap) => {
      const records = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return tb - ta;
        });
      setTeamLeaves(records);
    }, (error) => {
      console.error("Team leaves listener error:", error);
    });
    return () => unsub();
  }, [user]);

  const handleCheckIn = async () => {
    if (todayRecord?.checkIn) return showNote('เช็คอินวันนี้แล้ว!');
    setIsChecking(true);
    try {
      const now = new Date();
      const dateTs = new Date(now); dateTs.setHours(0, 0, 0, 0);
      await addDoc(collection(db, 'attendance'), {
        userId: user.uid,
        userName: user.name,
        dateStr: getTodayStr(),
        dateTimestamp: Timestamp.fromDate(dateTs),
        checkIn: getTimeStr(),
        checkOut: null,
        createdAt: serverTimestamp(),
      });
      showNote('✅ เช็คอินเรียบร้อย!');
    } catch (e) { showNote('เกิดข้อผิดพลาด'); }
    setIsChecking(false);
  };

  const handleCheckOut = async () => {
    if (!todayRecord) return showNote('ยังไม่ได้เช็คอิน!');
    if (todayRecord?.checkOut) return showNote('เช็คเอาท์วันนี้แล้ว!');
    setIsChecking(true);
    try {
      await updateDoc(doc(db, 'attendance', todayRecord.id), { checkOut: getTimeStr() });
      showNote('✅ เช็คเอาท์เรียบร้อย!');
    } catch (e) { showNote('เกิดข้อผิดพลาด'); }
    setIsChecking(false);
  };

  const handleSubmitLeave = async () => {
    if (!leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason.trim()) {
      return showNote('กรุณากรอกข้อมูลให้ครบ');
    }
    setIsSubmittingLeave(true);
    try {
      await addDoc(collection(db, 'leaves'), {
        userId: user.uid,
        userName: user.name,
        ...leaveForm,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setLeaveForm({ type: 'sick', startDate: '', endDate: '', reason: '' });
      setShowLeaveForm(false);
      showNote('✅ ส่งคำขอลาเรียบร้อย!');
    } catch (e) { showNote('เกิดข้อผิดพลาด'); }
    setIsSubmittingLeave(false);
  };

  const handleLeaveAction = async (id, status) => {
    try {
      await updateDoc(doc(db, 'leaves', id), {
        status,
        approvedBy: user.name,
        approvedAt: new Date().toLocaleString('th-TH'),
      });
      showNote(status === 'approved' ? '✅ อนุมัติแล้ว' : '❌ ปฏิเสธแล้ว');
    } catch (e) { showNote('เกิดข้อผิดพลาด'); }
  };

  // Stats this month
  const workedDays = attendance.filter(r => r.checkIn).length;
  const pendingLeaves = leaves.filter(r => r.status === 'pending').length;
  const approvedLeaves = leaves.filter(r => r.status === 'approved').length;

  const leaveTypeInfo = (type) => LEAVE_TYPES.find(l => l.value === type) || LEAVE_TYPES[0];

  const statusBadge = (status) => {
    if (status === 'approved') return <span className="hr-badge hr-badge-approved">อนุมัติ</span>;
    if (status === 'rejected') return <span className="hr-badge hr-badge-rejected">ปฏิเสธ</span>;
    return <span className="hr-badge hr-badge-pending">รอพิจารณา</span>;
  };

  if (!user) return null;

  return (
    <div className="hr-tab">
      {/* Notification toast */}
      {notification && (
        <div className="hr-toast">{notification}</div>
      )}

      {/* Toggle Admin / My view */}
      {user.role === 'admin' && (
        <div className="hr-view-toggle">
          <button className={`hr-toggle-btn ${view === 'my' ? 'active' : ''}`} onClick={() => setView('my')}>
            <User size={15} /> ของฉัน
          </button>
          <button className={`hr-toggle-btn ${view === 'team' ? 'active' : ''}`} onClick={() => setView('team')}>
            <Users size={15} /> ทีมงาน
          </button>
        </div>
      )}

      {view === 'my' ? (
        <>
          {/* Check-in / Check-out Card */}
          <div className="hr-checkin-card">
            <div className="hr-checkin-date">
              <Calendar size={15} />
              <span>วันนี้ {getTodayStr()}</span>
            </div>
            <div className="hr-checkin-times">
              <div className="hr-time-item">
                <LogIn size={18} className="text-green-600" />
                <div>
                  <p className="hr-time-label">เข้างาน</p>
                  <p className="hr-time-value">{todayRecord?.checkIn || '—:——'}</p>
                </div>
              </div>
              <div className="hr-time-divider" />
              <div className="hr-time-item">
                <LogOut size={18} className="text-red-500" />
                <div>
                  <p className="hr-time-label">ออกงาน</p>
                  <p className="hr-time-value">{todayRecord?.checkOut || '—:——'}</p>
                </div>
              </div>
            </div>
            <div className="hr-checkin-buttons">
              <button
                onClick={handleCheckIn}
                disabled={isChecking || !!todayRecord?.checkIn}
                className={`hr-btn hr-btn-checkin ${todayRecord?.checkIn ? 'disabled' : ''}`}
              >
                <LogIn size={16} />
                {todayRecord?.checkIn ? 'เช็คอินแล้ว' : 'เช็คอิน'}
              </button>
              <button
                onClick={handleCheckOut}
                disabled={isChecking || !todayRecord?.checkIn || !!todayRecord?.checkOut}
                className={`hr-btn hr-btn-checkout ${(!todayRecord?.checkIn || todayRecord?.checkOut) ? 'disabled' : ''}`}
              >
                <LogOut size={16} />
                {todayRecord?.checkOut ? 'เช็คเอาท์แล้ว' : 'เช็คเอาท์'}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="hr-stats-row">
            <div className="hr-stat-card">
              <span className="hr-stat-num" style={{ color: '#16a34a' }}>{workedDays}</span>
              <span className="hr-stat-label">วันทำงาน</span>
            </div>
            <div className="hr-stat-card">
              <span className="hr-stat-num" style={{ color: '#f59e0b' }}>{pendingLeaves}</span>
              <span className="hr-stat-label">รอพิจารณา</span>
            </div>
            <div className="hr-stat-card">
              <span className="hr-stat-num" style={{ color: '#3b82f6' }}>{approvedLeaves}</span>
              <span className="hr-stat-label">ลาที่อนุมัติ</span>
            </div>
          </div>

          {/* Leave Request */}
          <div className="hr-section">
            <div className="hr-section-header">
              <h3><FileText size={16} /> คำขอลาของฉัน</h3>
              <button className="hr-add-leave-btn" onClick={() => setShowLeaveForm(!showLeaveForm)}>
                {showLeaveForm ? <X size={16} /> : <Plus size={16} />}
                {showLeaveForm ? 'ยกเลิก' : 'ยื่นใบลา'}
              </button>
            </div>

            {showLeaveForm && (
              <div className="hr-leave-form">
                <div className="hr-form-group">
                  <label>ประเภทการลา</label>
                  <div className="hr-leave-types">
                    {LEAVE_TYPES.map(lt => (
                      <button
                        key={lt.value}
                        onClick={() => setLeaveForm(f => ({ ...f, type: lt.value }))}
                        className={`hr-leave-type-btn ${leaveForm.type === lt.value ? 'active' : ''}`}
                        style={leaveForm.type === lt.value ? { background: lt.bg, color: lt.color, borderColor: lt.color } : {}}
                      >
                        {lt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="hr-form-row">
                  <div className="hr-form-group">
                    <label>วันที่เริ่มลา</label>
                    <input type="date" value={leaveForm.startDate} onChange={e => setLeaveForm(f => ({ ...f, startDate: e.target.value }))} className="hr-input" />
                  </div>
                  <div className="hr-form-group">
                    <label>วันที่สิ้นสุด</label>
                    <input type="date" value={leaveForm.endDate} onChange={e => setLeaveForm(f => ({ ...f, endDate: e.target.value }))} className="hr-input" />
                  </div>
                </div>
                <div className="hr-form-group">
                  <label>เหตุผล</label>
                  <textarea
                    value={leaveForm.reason}
                    onChange={e => setLeaveForm(f => ({ ...f, reason: e.target.value }))}
                    className="hr-input hr-textarea"
                    placeholder="ระบุเหตุผลการลา..."
                    rows={3}
                  />
                </div>
                <button className="hr-submit-leave-btn" onClick={handleSubmitLeave} disabled={isSubmittingLeave}>
                  {isSubmittingLeave ? 'กำลังส่ง...' : '📤 ส่งคำขอลา'}
                </button>
              </div>
            )}

            <div className="hr-leave-list">
              {leaves.length === 0 ? (
                <div className="hr-empty">ยังไม่มีประวัติการลา</div>
              ) : leaves.map(lv => {
                const lt = leaveTypeInfo(lv.type);
                return (
                  <div key={lv.id} className="hr-leave-item">
                    <span className="hr-leave-type-dot" style={{ background: lt.color }} />
                    <div className="hr-leave-info">
                      <p className="hr-leave-type-name">{lt.label}</p>
                      <p className="hr-leave-dates">{lv.startDate} — {lv.endDate}</p>
                      <p className="hr-leave-reason">{lv.reason}</p>
                    </div>
                    {statusBadge(lv.status)}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Attendance History */}
          <div className="hr-section">
            <div className="hr-section-header">
              <h3><ClipboardList size={16} /> ประวัติเดือนนี้</h3>
            </div>
            <div className="hr-attendance-list">
              {attendance.length === 0 ? (
                <div className="hr-empty">ยังไม่มีบันทึกเดือนนี้</div>
              ) : attendance.map(r => (
                <div key={r.id} className="hr-att-item">
                  <div className="hr-att-date">{r.dateStr}</div>
                  <div className="hr-att-times">
                    <span className="hr-att-in">เข้า {r.checkIn}</span>
                    <span className="hr-att-sep">→</span>
                    <span className="hr-att-out">{r.checkOut ? `ออก ${r.checkOut}` : '(ยังไม่ออก)'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        // Admin Team View
        <div className="hr-section">
          <div className="hr-section-header">
            <h3><Users size={16} /> คำขอลาทั้งหมด</h3>
          </div>
          <div className="hr-leave-list">
            {teamLeaves.length === 0 ? (
              <div className="hr-empty">ยังไม่มีคำขอลา</div>
            ) : teamLeaves.map(lv => {
              const lt = leaveTypeInfo(lv.type);
              return (
                <div key={lv.id} className="hr-leave-item hr-leave-item-admin">
                  <span className="hr-leave-type-dot" style={{ background: lt.color }} />
                  <div className="hr-leave-info">
                    <p className="hr-leave-name">{lv.userName}</p>
                    <p className="hr-leave-type-name">{lt.label} · {lv.startDate} — {lv.endDate}</p>
                    <p className="hr-leave-reason">{lv.reason}</p>
                  </div>
                  {lv.status === 'pending' ? (
                    <div className="hr-admin-actions">
                      <button className="hr-approve-btn" onClick={() => handleLeaveAction(lv.id, 'approved')}>
                        <CheckCircle size={16} />
                      </button>
                      <button className="hr-reject-btn" onClick={() => handleLeaveAction(lv.id, 'rejected')}>
                        <XCircle size={16} />
                      </button>
                    </div>
                  ) : statusBadge(lv.status)}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
