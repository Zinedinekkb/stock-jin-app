// app/components/DailyTaskDashboard.js
'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle2, Circle, Clock, AlertTriangle, Plus, Trash2, 
  Edit3, Filter, Search, Calendar, User, Users, Check, X, 
  ChevronRight, ChevronDown, Flame, Sparkles, ShieldCheck, 
  ArrowRight, RefreshCw, Briefcase, Package, ArrowRightLeft, 
  ClipboardList, MessageSquare, Loader2, PlayCircle, Eye,
  BarChart3, CheckSquare, Layers
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { 
  createTask, 
  updateTask, 
  deleteTask, 
  toggleTaskCompletion, 
  setTaskStatus, 
  seedDefaultRoutineTasks, 
  getTodayKey, 
  isTaskDone,
  isTaskCompletedToday,
  matchesUserPosition,
  DEFAULT_ROUTINE_TEMPLATES 
} from '../services/taskService';
import { isAdmin } from '../utils/permissions';
import CreateTaskModal from './CreateTaskModal';
import LeaveDocumentModal from './LeaveDocumentModal';

const POSITION_TABS = [
  { key: 'my', label: '⭐ งานของฉัน', icon: '⭐' },
  { key: 'warehouse', label: '📦 คลัง/สต็อก', icon: '📦' },
  { key: 'kitchen', label: '👨‍🍳 ครัว/เชฟ', icon: '👨‍🍳' },
  { key: 'finance', label: '💰 การเงิน/แคชเชียร์', icon: '💰' },
  { key: 'service', label: '🍱 หน้าร้าน/บริการ', icon: '🍱' },
  { key: 'shipping', label: '🚚 จัดส่ง/พัสดุ', icon: '🚚' },
  { key: 'management', label: '👔 บริหาร/Admin', icon: '👔' },
  { key: 'all', label: '🌐 งานทั้งหมด', icon: '🌐' },
];

export default function DailyTaskDashboard({ 
  user, 
  products = [], 
  transactions = [], 
  categories = [], 
  setActiveTab = () => {},
  pendingUsers = [],
  pendingLeaves = [],
  showNotification = () => {}
}) {
  const [tasks, setTasks] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPosTab, setSelectedPosTab] = useState('my');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'routine' | 'assigned' | 'urgent' | 'completed'
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('tasks'); // 'tasks' | 'team'
  
  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [isSeeding, setIsSeeding] = useState(false);

  // Note dialog state
  const [noteModalConfig, setNoteModalConfig] = useState({ isOpen: false, task: null, noteText: '' });
  const [deleteConfirmTask, setDeleteConfirmTask] = useState(null);

  // Leave Document & Review modal states
  const [leaveDocModalOpen, setLeaveDocModalOpen] = useState(false);
  const [selectedLeaveForDoc, setSelectedLeaveForDoc] = useState(null);
  const [pendingLeavesListModalOpen, setPendingLeavesListModalOpen] = useState(false);

  const handlePendingLeavesClick = () => {
    if (!pendingLeaves || pendingLeaves.length === 0) {
      showNotification('ไม่มีคำขอลารอการอนุมัติในขณะนี้');
      return;
    }
    if (pendingLeaves.length === 1) {
      setSelectedLeaveForDoc(pendingLeaves[0]);
      setLeaveDocModalOpen(true);
    } else {
      setPendingLeavesListModalOpen(true);
    }
  };

  const todayKey = useMemo(() => getTodayKey(), []);
  const isUserAdmin = isAdmin(user);

  // Thai Date Formatter
  const thaiDateStr = useMemo(() => {
    return new Date().toLocaleDateString('th-TH', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }, []);

  // 1. Subscribe to 'tasks' in Firestore (Real-Time)
  useEffect(() => {
    setLoading(true);
    const unsubTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      const taskArr = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTasks(taskArr);
      setLoading(false);
    }, (error) => {
      console.error('Error listening to tasks:', error);
      setLoading(false);
    });

    return () => unsubTasks();
  }, []);

  // 2. Subscribe to 'users' in Firestore (Real-Time)
  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const userArr = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsersList(userArr);
    }, (err) => {
      console.error('Error fetching users for tasks:', err);
    });

    return () => unsubUsers();
  }, []);

  // Pending items counts for Admin Executive Strip
  const pendingTxCount = useMemo(() => {
    return transactions.filter(t => t.status === 'pending').length;
  }, [transactions]);

  const lowStockCount = useMemo(() => {
    return products.filter(p => {
      const min = p.minStock || 5;
      return (p.stock || 0) <= min;
    }).length;
  }, [products]);

  // Handle Seeding default routine tasks
  const handleSeedTemplates = async () => {
    if (!isUserAdmin) return;
    setIsSeeding(true);
    try {
      await seedDefaultRoutineTasks(user);
      showNotification(`โหลดชุดงานประจำวันเริ่มต้นสำเร็จ ${DEFAULT_ROUTINE_TEMPLATES.length} รายการ`);
    } catch (error) {
      console.error('Failed to seed tasks:', error);
      alert('เกิดข้อผิดพลาดในการโหลดแม่แบบ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSeeding(false);
    }
  };

  // Filter Tasks by Position Tab, Status, and Search
  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    // 1. Filter by Position Tab
    if (selectedPosTab === 'my') {
      result = result.filter(t => matchesUserPosition(user, t));
    } else if (selectedPosTab === 'warehouse') {
      result = result.filter(t => {
        const p = (t.targetPosition || '').toLowerCase();
        return p.includes('สต็อก') || p.includes('คลัง') || t.category === 'warehouse' || t.targetDepartment === 'warehouse';
      });
    } else if (selectedPosTab === 'kitchen') {
      result = result.filter(t => {
        const p = (t.targetPosition || '').toLowerCase();
        return p.includes('เชฟ') || p.includes('ครัว') || p.includes('แม่ครัว') || t.category === 'kitchen' || t.targetDepartment === 'kitchen';
      });
    } else if (selectedPosTab === 'finance') {
      result = result.filter(t => {
        const p = (t.targetPosition || '').toLowerCase();
        return p.includes('การเงิน') || p.includes('แคชเชียร์') || p.includes('บัญชี') || t.category === 'finance' || t.targetDepartment === 'finance';
      });
    } else if (selectedPosTab === 'service') {
      result = result.filter(t => {
        const p = (t.targetPosition || '').toLowerCase();
        return p.includes('หน้าร้าน') || p.includes('บริการ') || p.includes('เสิร์ฟ') || t.category === 'service' || t.targetDepartment === 'service';
      });
    } else if (selectedPosTab === 'shipping') {
      result = result.filter(t => {
        const p = (t.targetPosition || '').toLowerCase();
        return p.includes('ส่ง') || p.includes('พัสดุ') || p.includes('โลจิสติกส์') || p.includes('ไรเดอร์') || t.category === 'shipping' || t.targetDepartment === 'shipping';
      });
    } else if (selectedPosTab === 'management') {
      result = result.filter(t => {
        const p = (t.targetPosition || '').toLowerCase();
        return p.includes('บริหาร') || p.includes('ผู้ดูแลระบบ') || p.includes('admin') || p.includes('ผู้จัดการ') || t.category === 'management' || t.targetDepartment === 'management';
      });
    }
    // 'all' includes everything

    // 2. Filter by Status Sub-filter
    if (statusFilter === 'pending') {
      result = result.filter(t => !isTaskDone(t, todayKey));
    } else if (statusFilter === 'routine') {
      result = result.filter(t => t.isRoutine || t.type === 'routine');
    } else if (statusFilter === 'assigned') {
      result = result.filter(t => !t.isRoutine && t.type !== 'routine');
    } else if (statusFilter === 'urgent') {
      result = result.filter(t => t.priority === 'urgent' && !isTaskDone(t, todayKey));
    } else if (statusFilter === 'completed') {
      result = result.filter(t => isTaskDone(t, todayKey));
    }

    // 3. Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => 
        (t.title || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        (t.targetPosition || '').toLowerCase().includes(q) ||
        (t.targetUserName || '').toLowerCase().includes(q)
      );
    }

    // 4. Sort: Incomplete first, then Priority (urgent > high > normal > low), then time
    const priorityWeight = { urgent: 4, high: 3, normal: 2, low: 1 };
    result.sort((a, b) => {
      const doneA = isTaskDone(a, todayKey) ? 1 : 0;
      const doneB = isTaskDone(b, todayKey) ? 1 : 0;
      if (doneA !== doneB) return doneA - doneB; // Incomplete first

      const weightA = priorityWeight[a.priority] || 2;
      const weightB = priorityWeight[b.priority] || 2;
      if (weightA !== weightB) return weightB - weightA; // High priority first

      return (a.dueTime || '').localeCompare(b.dueTime || '');
    });

    return result;
  }, [tasks, selectedPosTab, statusFilter, searchQuery, user, todayKey]);

  // Overall Statistics for Today
  const stats = useMemo(() => {
    const applicableTasks = selectedPosTab === 'my' 
      ? tasks.filter(t => matchesUserPosition(user, t))
      : tasks;

    // Filter tasks relevant to today's active scope:
    // 1. Routine tasks (always active for today)
    // 2. Assigned tasks that are incomplete (pending/in_progress)
    // 3. Assigned tasks completed TODAY
    const todayScopeTasks = applicableTasks.filter(t => {
      if (t.isRoutine || t.type === 'routine') return true;
      if (!isTaskDone(t, todayKey)) return true; // incomplete assigned task
      return isTaskCompletedToday(t, todayKey); // completed today
    });

    const total = todayScopeTasks.length;
    const completed = todayScopeTasks.filter(t => isTaskDone(t, todayKey)).length;
    const pending = total - completed;
    const urgentPending = todayScopeTasks.filter(t => t.priority === 'urgent' && !isTaskDone(t, todayKey)).length;
    const inProgress = todayScopeTasks.filter(t => t.status === 'in_progress' && !isTaskDone(t, todayKey)).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, pending, urgentPending, inProgress, percent };
  }, [tasks, selectedPosTab, todayKey, user]);

  // Toggle Complete / Incomplete
  const handleToggleTask = async (task) => {
    try {
      const currentlyDone = isTaskDone(task, todayKey);
      await toggleTaskCompletion(task, user);
      showNotification(
        currentlyDone 
          ? 'ยกเลิกสถานะเสร็จสิ้นแล้ว' 
          : 'ทำเครื่องหมายเสร็จสิ้นเรียบร้อย! 🎉'
      );
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  // Change status to 'in_progress'
  const handleSetInProgress = async (task) => {
    try {
      await setTaskStatus(task.id, 'in_progress', user);
      showNotification('เปลี่ยนสถานะเป็น กำลังดำเนินการ ⚡');
    } catch (err) {
      console.error('Failed to set in_progress:', err);
    }
  };

  // Save Note
  const handleSaveNote = async () => {
    if (!noteModalConfig.task) return;
    try {
      await updateTask(noteModalConfig.task.id, {
        completionNote: noteModalConfig.noteText.trim()
      }, user);
      showNotification('บันทึกหมายเหตุสำเร็จ');
      setNoteModalConfig({ isOpen: false, task: null, noteText: '' });
    } catch (err) {
      console.error('Failed to save note:', err);
    }
  };

  // Delete Task
  const handleDeleteTask = async () => {
    if (!deleteConfirmTask) return;
    try {
      await deleteTask(deleteConfirmTask.id);
      showNotification('ลบรายการงานเรียบร้อย');
      setDeleteConfirmTask(null);
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* ========================================================================= */}
      {/* 1. HERO GREETING BANNER */}
      {/* ========================================================================= */}
      <div className="smart-hero-banner relative overflow-hidden bg-gradient-to-r from-purple-800 via-indigo-700 to-[#6355d8] text-white p-6 sm:p-8 rounded-3xl shadow-xl shadow-purple-900/10 border border-white/10">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-black tracking-wide text-white border border-white/20">
                {isUserAdmin ? '👑 ผู้ดูแลระบบ (Admin)' : 'พนักงานประจำ'}
              </span>
              <span className="px-3 py-1 bg-purple-500/30 backdrop-blur-md rounded-full text-xs font-bold text-purple-100 border border-purple-300/20">
                ตำแหน่ง: {user?.position || (isUserAdmin ? 'ผู้จัดการ / Admin' : 'พนักงานทั่วไป')}
              </span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              <span>สวัสดี, {user?.name || 'ทีมงาน StockJin'}</span>
              <span className="animate-pulse">✨</span>
            </h1>
            
            <p className="text-xs sm:text-sm text-purple-100/90 font-medium">
              📅 {thaiDateStr} &bull; สรุปรายการงานประจำวันและภารกิจที่ต้องดำเนินการ
            </p>
          </div>

          {/* Quick Action Button & Summary Pill */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-2xl p-3 px-4 text-center">
              <div className="text-[11px] font-bold text-purple-200">ความคืบหน้าวันนี้</div>
              <div className="text-xl font-black text-white mt-0.5">
                {stats.completed}/{stats.total} <span className="text-xs font-normal">({stats.percent}%)</span>
              </div>
            </div>

            <button
              onClick={() => {
                setEditingTask(null);
                setIsCreateModalOpen(true);
              }}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-[#6355d8] hover:bg-purple-50 font-black text-xs shadow-lg transition-all active:scale-95"
            >
              <Plus size={18} strokeWidth={3} />
              <span>{isUserAdmin ? '➕ สั่งงานใหม่ / มอบหมายภารกิจ' : '➕ เพิ่มบันทึกงานของฉัน'}</span>
            </button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* ========================================================================= */}
      {/* 2. ADMIN EXECUTIVE OPERATIONAL STRIP (FOR ADMIN / OWNER ONLY) */}
      {/* ========================================================================= */}
      {isUserAdmin && (
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">👔</span>
              <h3 className="text-sm font-black text-slate-800">
                ระบบจัดการสำหรับผู้บริหาร (Executive Fast-Track)
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode(viewMode === 'tasks' ? 'team' : 'tasks')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  viewMode === 'team'
                    ? 'bg-[#6355d8] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Users size={14} />
                <span>{viewMode === 'team' ? 'ดูรายการงาน' : '👥 ตรวจสอบงานทีมงาน'}</span>
              </button>
            </div>
          </div>

          {/* 4 Bottleneck Metric Cards with Direct Jumps */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Card 1: Pending Users */}
            <button
              onClick={() => setActiveTab('users')}
              className="p-3.5 rounded-2xl bg-slate-50 hover:bg-purple-50/70 border border-slate-200/80 hover:border-purple-200 text-left transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xl">👥</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-black ${
                  pendingUsers.length > 0 ? 'bg-amber-100 text-amber-700 animate-pulse' : 'bg-slate-200 text-slate-600'
                }`}>
                  {pendingUsers.length} คน
                </span>
              </div>
              <div className="text-xs font-bold text-slate-800 mt-2 group-hover:text-[#6355d8]">
                ผู้ใช้รออนุมัติ
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">เปิดแท็บบัญชีผู้ใช้ →</div>
            </button>

            {/* Card 2: Pending Leaves */}
            <button
              onClick={handlePendingLeavesClick}
              className="p-3.5 rounded-2xl bg-slate-50 hover:bg-purple-50/70 border border-slate-200/80 hover:border-purple-200 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xl">⏱️</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-black ${
                  pendingLeaves.length > 0 ? 'bg-rose-100 text-rose-700 animate-pulse' : 'bg-slate-200 text-slate-600'
                }`}>
                  {pendingLeaves.length} ใบ
                </span>
              </div>
              <div className="text-xs font-bold text-slate-800 mt-2 group-hover:text-[#6355d8]">
                คำขอลารอพิจารณา
              </div>
              <div className="text-[10px] text-purple-600 font-semibold mt-0.5">
                {pendingLeaves.length > 0 ? '📄 คลิกตรวจเอกสาร & อนุมัติ →' : 'ไม่มีคำขอค้าง'}
              </div>
            </button>

            {/* Card 3: Pending Transactions */}
            <button
              onClick={() => setActiveTab('status')}
              className="p-3.5 rounded-2xl bg-slate-50 hover:bg-purple-50/70 border border-slate-200/80 hover:border-purple-200 text-left transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xl">📋</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-black ${
                  pendingTxCount > 0 ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-600'
                }`}>
                  {pendingTxCount} รายการ
                </span>
              </div>
              <div className="text-xs font-bold text-slate-800 mt-2 group-hover:text-[#6355d8]">
                รายการเบิก/รับรอยืนยัน
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">เปิดแท็บสถานะรายการ →</div>
            </button>

            {/* Card 4: Low Stock Alert */}
            <button
              onClick={() => setActiveTab('stock')}
              className="p-3.5 rounded-2xl bg-slate-50 hover:bg-purple-50/70 border border-slate-200/80 hover:border-purple-200 text-left transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xl">⚠️</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-black ${
                  lowStockCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {lowStockCount} ชนิด
                </span>
              </div>
              <div className="text-xs font-bold text-slate-800 mt-2 group-hover:text-[#6355d8]">
                สินค้าใกล้หมดสต็อก
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">เปิดคลังสินค้า →</div>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SEED ROUTINE CHECKLIST PROMPT (When 0 tasks exist and Admin is logged in) */}
      {/* ========================================================================= */}
      {tasks.length === 0 && !loading && (
        <div className="p-6 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center text-2xl shrink-0">
              ⚡
            </div>
            <div>
              <h4 className="text-sm font-black text-purple-950">
                ยังไม่มีรายการงานในระบบ
              </h4>
              <p className="text-xs text-purple-700 mt-0.5 max-w-md">
                {isUserAdmin 
                  ? 'ต้องการโหลดชุดงานประจำวันเริ่มต้นสำหรับทุกตำแหน่งงาน (สต็อก, ครัว, การเงิน, จัดส่ง, บริหาร, หน้าร้าน 24 รายการ) หรือไม่?'
                  : 'ยังไม่มีภารกิจที่ถูกมอบหมาย คุณสามารถคลิกเพิ่มงานส่วนตัวของคุณได้ทันที'}
              </p>
            </div>
          </div>
          {isUserAdmin ? (
            <button
              onClick={handleSeedTemplates}
              disabled={isSeeding}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#6355d8] hover:bg-[#5244c4] text-white text-xs font-black shadow-md shadow-purple-500/20 transition-all shrink-0 disabled:opacity-50"
            >
              {isSeeding ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              <span>{isSeeding ? 'กำลังโหลดข้อมูล...' : '⚡ โหลดชุดงานประจำวันเริ่มต้น (24 รายการ)'}</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setEditingTask(null);
                setIsCreateModalOpen(true);
              }}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#6355d8] hover:bg-[#5244c4] text-white text-xs font-black shadow-md shadow-purple-500/20 transition-all shrink-0"
            >
              <Plus size={16} />
              <span>เพิ่มงานของฉัน</span>
            </button>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. POSITION TABS & STATUS FILTER STRIP */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        {/* Row 1: Position Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {POSITION_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setSelectedPosTab(tab.key)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                selectedPosTab === tab.key
                  ? 'bg-[#6355d8] text-white shadow-md shadow-purple-500/20 scale-[1.02]'
                  : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-100'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.key === 'my' && (
                <span className="ml-1 px-1.5 py-0.2 bg-white/25 rounded-md text-[10px]">
                  {tasks.filter(t => matchesUserPosition(user, t) && !isTaskDone(t, todayKey)).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Row 2: Status Sub-Filter & Search Box */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-100">
          {/* Status Sub-Filters */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide text-xs font-bold">
            {[
              { key: 'all', label: 'ทั้งหมด' },
              { key: 'pending', label: '⏳ รอดำเนินการ' },
              { key: 'urgent', label: '🔥 งานด่วน' },
              { key: 'routine', label: '🔄 ประจำวัน' },
              { key: 'assigned', label: '⚡ งานสั่งเสริม' },
              { key: 'completed', label: '✅ เสร็จแล้ว' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`px-3 py-1.5 rounded-xl transition-all shrink-0 ${
                  statusFilter === f.key
                    ? 'bg-purple-100 text-[#6355d8]'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[200px] max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหางาน, ผู้รับผิดชอบ..."
              className="w-full pl-9 pr-8 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 focus:border-[#6355d8] outline-none text-slate-800 bg-slate-50/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. CONTENT: TEAM MONITOR VIEW (If viewMode === 'team') */}
      {/* ========================================================================= */}
      {viewMode === 'team' && isUserAdmin ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <Users size={16} className="text-[#6355d8]" />
              <span>ติดตามสถานะภารกิจทีมงานรายบุคคล ({usersList.length} คน)</span>
            </h3>
            <span className="text-xs text-slate-400 font-medium">คลิกที่พนักงานเพื่อดูกรองงานเฉพาะบุคคล</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {usersList
              .filter(u => u.status !== 'deactivated')
              .map(member => {
                const memberTasks = tasks.filter(t => matchesUserPosition(member, t));
                const memTotal = memberTasks.length;
                const memDone = memberTasks.filter(t => isTaskDone(t, todayKey)).length;
                const memPercent = memTotal > 0 ? Math.round((memDone / memTotal) * 100) : 0;

                return (
                  <div
                    key={member.id || member.uid}
                    onClick={() => {
                      setSearchQuery(member.name || '');
                      setViewMode('tasks');
                    }}
                    className="p-4 bg-white rounded-2xl border border-slate-100 hover:border-purple-300 shadow-xs hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#6355d8] to-purple-400 text-white font-bold flex items-center justify-center overflow-hidden shrink-0">
                        {member.photoURL ? (
                          <img src={member.photoURL} alt={member.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{(member.name || 'U').charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-black text-slate-800 truncate group-hover:text-[#6355d8]">
                            {member.name || 'พนักงาน'}
                          </h4>
                          {member.role === 'admin' && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-purple-100 text-[#6355d8] font-bold rounded-md">
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {member.position || 'พนักงานทั่วไป'}
                        </p>
                      </div>
                    </div>

                    {/* Workload Progress Bar */}
                    <div className="mt-3.5 pt-3 border-t border-slate-50 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-slate-500">ความคืบหน้างาน</span>
                        <span className={memPercent === 100 && memTotal > 0 ? 'text-emerald-600' : 'text-[#6355d8]'}>
                          {memDone}/{memTotal} งาน ({memPercent}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            memPercent === 100 && memTotal > 0 ? 'bg-emerald-500' : 'bg-[#6355d8]'
                          }`}
                          style={{ width: `${memPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* 6. CONTENT: TASK LIST CARDS */
        /* ========================================================================= */
        <div className="space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-slate-100">
              <Loader2 size={32} className="animate-spin text-[#6355d8]" />
              <p className="text-xs text-slate-500 font-bold mt-3">กำลังโหลดข้อมูลภารกิจ...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-100 space-y-3">
              <div className="w-16 h-16 rounded-full bg-purple-50 text-[#6355d8] text-3xl flex items-center justify-center mx-auto">
                🎉
              </div>
              <h4 className="text-base font-black text-slate-800">
                ไม่พบรายการภารกิจในเงื่อนไขนี้
              </h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                ไม่มีงานค้าง หรือยังไม่มีการสร้างงานในหมวดหมู่นี้ คุณสามารถเพิ่มงานใหม่ได้ทันที
              </p>
              <button
                onClick={() => {
                  setEditingTask(null);
                  setIsCreateModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#6355d8] text-white text-xs font-bold shadow-md hover:bg-[#5244c4] transition-all"
              >
                <Plus size={16} />
                <span>{isUserAdmin ? 'สั่งงานใหม่' : 'เพิ่มงานส่วนตัว'}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredTasks.map(task => {
                const isRoutine = task.isRoutine || task.type === 'routine';
                const isDone = isTaskDone(task, todayKey);
                const isOverdue = !isDone && !isRoutine && task.dueDate && task.dueDate < todayKey;
                const isDueToday = !isDone && !isRoutine && task.dueDate && task.dueDate === todayKey;

                // Priority Badge Styles
                const priorityStyles = {
                  urgent: 'bg-rose-100 text-rose-700 border-rose-200',
                  high: 'bg-amber-100 text-amber-800 border-amber-200',
                  normal: 'bg-indigo-50 text-indigo-700 border-indigo-100',
                  low: 'bg-slate-100 text-slate-600 border-slate-200',
                };

                const priorityLabels = {
                  urgent: '🔥 ด่วนมาก',
                  high: '🟡 สำคัญ',
                  normal: 'ปกติ',
                  low: 'ทั่วไป',
                };

                const todayRecord = isRoutine 
                  ? task.completedDates?.[todayKey]
                  : (isDone ? {
                      completedAt: task.completedAt,
                      completedByName: task.completedByName,
                      note: task.completionNote
                    } : null);

                return (
                  <div
                    key={task.id}
                    className={`p-4 rounded-3xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isDone
                        ? 'bg-slate-50/80 border-slate-200/60 opacity-80'
                        : isOverdue
                          ? 'bg-rose-50/40 border-rose-200 shadow-xs'
                          : task.priority === 'urgent'
                            ? 'bg-white border-rose-300 shadow-md ring-1 ring-rose-200'
                            : 'bg-white border-slate-100 shadow-xs hover:border-purple-200 hover:shadow-md'
                    }`}
                  >
                    {/* Left: Checkbox & Info */}
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      {/* Checkbox Button */}
                      <button
                        onClick={() => handleToggleTask(task)}
                        className={`mt-0.5 w-6 h-6 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                          isDone
                            ? 'bg-emerald-500 text-white shadow-sm'
                            : 'border-2 border-slate-300 hover:border-[#6355d8] text-transparent hover:text-purple-300'
                        }`}
                        title={isDone ? 'คลิกเพื่อยกเลิก' : 'คลิกเพื่อทำเครื่องหมายเสร็จสิ้น'}
                      >
                        <Check size={14} strokeWidth={3} />
                      </button>

                      <div className="space-y-1.5 flex-1 min-w-0">
                        {/* Title and Badges */}
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className={`text-sm font-black tracking-tight ${
                            isDone ? 'line-through text-slate-400' : 'text-slate-800'
                          }`}>
                            {task.title}
                          </h4>

                          {/* Priority Badge */}
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            priorityStyles[task.priority] || priorityStyles.normal
                          }`}>
                            {priorityLabels[task.priority] || 'ปกติ'}
                          </span>

                          {/* Routine vs Assigned Tag */}
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isRoutine 
                              ? 'bg-purple-50 text-[#6355d8] border border-purple-200/50' 
                              : 'bg-blue-50 text-blue-700 border border-blue-200/50'
                          }`}>
                            {isRoutine ? '🔄 ประจำวัน' : '⚡ สั่งเสริม'}
                          </span>

                          {/* Overdue Alert */}
                          {isOverdue && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse shadow-xs">
                              ⚠️ เกินกำหนดส่ง ({task.dueDate})
                            </span>
                          )}

                          {/* Due Today Alert */}
                          {isDueToday && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                              📅 ครบกำหนดวันนี้
                            </span>
                          )}
                        </div>

                        {/* Description */}
                        {task.description && (
                          <p className={`text-xs ${isDone ? 'text-slate-400' : 'text-slate-600'} line-clamp-2`}>
                            {task.description}
                          </p>
                        )}

                        {/* Metadata row: Target Position / User, Due time */}
                        <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-400 pt-0.5">
                          {/* Assignment Target */}
                          <div className="flex items-center gap-1 text-slate-600">
                            {task.targetType === 'user' ? (
                              <>
                                <User size={13} className="text-[#6355d8]" />
                                <span className="font-bold text-[#6355d8]">{task.targetUserName || 'พนักงาน'}</span>
                              </>
                            ) : (
                              <>
                                <Briefcase size={13} className="text-slate-400" />
                                <span>{task.targetPosition || 'ทุกคน'}</span>
                              </>
                            )}
                          </div>

                          {/* Due Time */}
                          {task.dueTime && (
                            <div className="flex items-center gap-1 text-slate-500">
                              <Clock size={13} />
                              <span>เสร็จก่อน {task.dueTime} น.</span>
                            </div>
                          )}

                          {/* Created By */}
                          {task.createdByName && isUserAdmin && (
                            <div className="hidden sm:flex items-center gap-1 text-slate-400 text-[10px]">
                              <span>สั่งโดย: {task.createdByName}</span>
                            </div>
                          )}
                        </div>

                        {/* Completion Details if Done */}
                        {isDone && (
                          <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px] font-bold text-emerald-700">
                            <span className="flex items-center gap-1">
                              <CheckCircle2 size={13} />
                              <span>
                                {todayRecord?.completedByName 
                                  ? `เสร็จโดย ${todayRecord.completedByName}` 
                                  : 'เสร็จเรียบร้อย'}
                              </span>
                            </span>
                            {(todayRecord?.note || task.completionNote) && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-100/70 text-emerald-800 font-normal italic">
                                &ldquo;{todayRecord?.note || task.completionNote}&rdquo;
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center pt-2 sm:pt-0">
                      {/* In Progress Button for Assigned Tasks */}
                      {!isRoutine && !isDone && task.status !== 'in_progress' && (
                        <button
                          onClick={() => handleSetInProgress(task)}
                          className="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#6355d8] text-xs font-bold transition-all flex items-center gap-1"
                          title="เริ่มทำภารกิจนี้"
                        >
                          <PlayCircle size={14} />
                          <span className="hidden sm:inline">เริ่มทำ</span>
                        </button>
                      )}

                      {/* Add Note Button */}
                      <button
                        onClick={() => setNoteModalConfig({ 
                          isOpen: true, 
                          task, 
                          noteText: todayRecord?.note || task.completionNote || '' 
                        })}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        title="เพิ่ม/แก้ไขหมายเหตุ"
                      >
                        <MessageSquare size={16} />
                      </button>

                      {/* Edit Button (Admin or Creator) */}
                      {(isUserAdmin || task.createdBy === user?.uid) && (
                        <button
                          onClick={() => {
                            setEditingTask(task);
                            setIsCreateModalOpen(true);
                          }}
                          className="p-2 rounded-xl text-slate-400 hover:text-[#6355d8] hover:bg-purple-50 transition-colors"
                          title="แก้ไขงานนี้"
                        >
                          <Edit3 size={16} />
                        </button>
                      )}

                      {/* Delete Button (Admin only) */}
                      {isUserAdmin && (
                        <button
                          onClick={() => setDeleteConfirmTask(task)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="ลบงานนี้"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODALS: CREATE/EDIT, NOTE, DELETE */}
      {/* ========================================================================= */}
      {/* Create / Edit Modal */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        currentUser={user}
        approvedUsers={usersList}
        editingTask={editingTask}
        onTaskSaved={() => {
          showNotification(editingTask ? 'อัปเดตภารกิจเรียบร้อย' : 'สร้างภารกิจใหม่เรียบร้อย');
        }}
      />

      {/* Note Modal */}
      {noteModalConfig.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <MessageSquare size={16} className="text-[#6355d8]" />
                <span>บันทึกหมายเหตุการทำงาน</span>
              </h3>
              <button 
                onClick={() => setNoteModalConfig({ isOpen: false, task: null, noteText: '' })}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-500 font-semibold truncate">
              {noteModalConfig.task?.title}
            </p>

            <textarea
              rows={3}
              value={noteModalConfig.noteText}
              onChange={(e) => setNoteModalConfig(prev => ({ ...prev, noteText: e.target.value }))}
              placeholder="ระบุข้อความ เช่น นับแล้วขาด 2 ชิ้น, ส่ง Kerry รอบบ่ายแล้ว 12 กล่อง..."
              className="w-full p-3 rounded-2xl border border-slate-200 focus:border-[#6355d8] text-xs font-medium text-slate-800 outline-none resize-none"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setNoteModalConfig({ isOpen: false, task: null, noteText: '' })}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSaveNote}
                className="px-5 py-2 rounded-xl bg-[#6355d8] text-white text-xs font-bold hover:bg-[#5244c4] shadow-sm"
              >
                บันทึกหมายเหตุ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-xl">
              🗑️
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">ยืนยันการลบภารกิจนี้?</h3>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                &ldquo;{deleteConfirmTask.title}&rdquo;
              </p>
            </div>

            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmTask(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDeleteTask}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-500/20"
              >
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Pending Leaves Quick Review List */}
      {pendingLeavesListModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-[#6355d8] flex items-center justify-center font-bold text-lg">
                  📄
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800">
                    คำขอลางานรอการพิจารณา ({pendingLeaves.length})
                  </h3>
                  <p className="text-xs text-slate-400">เลือกรายการเพื่อเปิดตรวจเอกสาร A4 และลงนาม</p>
                </div>
              </div>
              <button
                onClick={() => setPendingLeavesListModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto space-y-2.5 flex-1 pr-1">
              {pendingLeaves.map((lv) => (
                <div
                  key={lv.id}
                  className="p-4 rounded-2xl bg-slate-50 hover:bg-purple-50/50 border border-slate-200/80 hover:border-purple-200 transition-all flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-800 truncate">{lv.userName}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800">
                        {lv.type === 'sick' ? 'ลาป่วย' : lv.type === 'personal' ? 'ลากิจ' : 'ลาพักร้อน'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      📅 {lv.startDate} ถึง {lv.endDate} ({lv.department || 'ไม่ระบุแผนก'})
                    </p>
                    <p className="text-xs text-slate-600 italic mt-1 truncate">
                      &ldquo;{lv.reason || '-'}&rdquo;
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedLeaveForDoc(lv);
                      setLeaveDocModalOpen(true);
                      setPendingLeavesListModalOpen(false);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#6355d8] hover:bg-[#5244c4] text-white text-xs font-black shadow-xs transition-all shrink-0 hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <span>📄 ตรวจเอกสาร</span>
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setPendingLeavesListModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Leave Document A4 & PDF Generator / Signing Modal */}
      <LeaveDocumentModal
        isOpen={leaveDocModalOpen}
        onClose={() => {
          setLeaveDocModalOpen(false);
          setSelectedLeaveForDoc(null);
        }}
        leave={selectedLeaveForDoc}
        currentUser={user}
        onSuccessSave={(msg) => showNotification(msg)}
        onLeaveUpdated={() => {
          showNotification('✅ อัปเดตสถานะคำขอลาเรียบร้อยแล้ว');
        }}
      />
    </div>
  );
}
