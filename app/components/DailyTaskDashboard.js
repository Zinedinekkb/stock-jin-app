// app/components/DailyTaskDashboard.js
'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle2, Circle, Clock, AlertTriangle, Plus, Trash2, 
  Edit3, Filter, Search, Calendar, User, Users, Check, X, 
  ChevronRight, ChevronDown, Flame, Sparkles, ShieldCheck, 
  ArrowRight, RefreshCw, Briefcase, Package, ArrowRightLeft, 
  ClipboardList, MessageSquare, Loader2, PlayCircle, Eye,
  BarChart3, CheckSquare, Layers, UserPlus
} from 'lucide-react';
import { GlassCard, Button, Badge, SectionHeader } from './ui';
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
  getVisiblePositionTabs,
  isTaskVisibleToUser,
  getUserCluster,
  POSITION_TABS,
  DEFAULT_ROUTINE_TEMPLATES 
} from '../services/taskService';
import { isAdmin } from '../utils/permissions';
import CreateTaskModal from './CreateTaskModal';
import LeaveDocumentModal from './LeaveDocumentModal';

export default function DailyTaskDashboard({ 
  user, 
  products = [], 
  transactions = [], 
  categories = [], 
  setActiveTab = () => {},
  pendingUsers = [],
  pendingLeaves = [],
  showNotification = () => {},
  initialPosTab = 'my',
  onPosTabChange = () => {}
}) {
  const isUserAdmin = isAdmin(user);
  const visiblePositionTabs = useMemo(() => getVisiblePositionTabs(user), [user]);

  const [tasks, setTasks] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPosTab, setSelectedPosTab] = useState(initialPosTab);

  useEffect(() => {
    if (initialPosTab) {
      if (isUserAdmin || visiblePositionTabs.some(t => t.key === initialPosTab)) {
        setSelectedPosTab(initialPosTab);
      } else {
        setSelectedPosTab('my');
      }
    }
  }, [initialPosTab, visiblePositionTabs, isUserAdmin]);

  const handleSelectPosTab = (tabKey) => {
    setSelectedPosTab(tabKey);
    if (onPosTabChange) {
      onPosTabChange(tabKey);
    }
  };

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
    // 0. Base Filter: Staff ONLY see their own & their team tasks. Admin sees all.
    let result = tasks.filter(t => isTaskVisibleToUser(user, t));

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
    // 'all' includes all visible tasks

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
    const visibleTasks = tasks.filter(t => isTaskVisibleToUser(user, t));
    const applicableTasks = selectedPosTab === 'my' 
      ? visibleTasks.filter(t => matchesUserPosition(user, t))
      : visibleTasks;

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

  // "Needs attention" items for admins: only rows with something to do are emphasised
  const attentionItems = isUserAdmin ? [
    { key: 'tx', icon: ClipboardList, label: 'เบิก/รับรอยืนยัน', count: pendingTxCount, unit: 'รายการ', tone: 'brand', onClick: () => setActiveTab('status') },
    { key: 'leave', icon: Calendar, label: 'คำขอลารอพิจารณา', count: pendingLeaves.length, unit: 'ใบ', tone: 'warning', onClick: handlePendingLeavesClick },
    { key: 'stock', icon: AlertTriangle, label: 'สินค้าใกล้หมด', count: lowStockCount, unit: 'ชนิด', tone: 'danger', onClick: () => setActiveTab('stock') },
    { key: 'users', icon: UserPlus, label: 'ผู้ใช้รออนุมัติ', count: pendingUsers.length, unit: 'คน', tone: 'warning', onClick: () => setActiveTab('users') },
  ] : [];
  const TONE = {
    brand: 'bg-brand-50 text-brand-600',
    warning: 'bg-warning-50 text-warning-700',
    danger: 'bg-danger-50 text-danger-600',
  };
  const STATUS_FILTERS = [
    { key: 'all', label: 'ทั้งหมด' },
    { key: 'pending', label: 'ยังไม่เสร็จ' },
    { key: 'urgent', label: 'ด่วน' },
    { key: 'completed', label: 'เสร็จแล้ว' },
  ];
  const chipClass = (active) => `h-9 px-3.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors shrink-0 flex items-center gap-1.5 ${active ? 'bg-brand-500 text-white' : 'bg-white/70 text-ink-muted hover:bg-white'}`;

  return (
    <div className="space-y-5 animate-fade-in pb-10">
      {/* 1. Greeting + today's progress + one main action */}
      <GlassCard strong className="p-5">
        <p className="text-sm text-ink-muted">{thaiDateStr}</p>
        <h1 className="text-xl sm:text-2xl font-black text-ink tracking-tight mt-0.5">สวัสดี {user?.name?.split(' ')[0] || 'ทีมงาน'}</h1>
        <p className="text-sm text-ink-muted">{user?.position || (isUserAdmin ? 'ผู้ดูแลระบบ' : 'พนักงาน')}</p>

        <div className="mt-4 flex items-end justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-ink tabular-nums">{stats.completed}<span className="text-lg text-ink-subtle">/{stats.total}</span></span>
              <span className="text-sm font-semibold text-ink-muted">งานวันนี้เสร็จแล้ว</span>
            </div>
            <div className="w-full h-2 bg-brand-100 rounded-full overflow-hidden mt-2" role="progressbar" aria-valuenow={stats.percent} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full bg-brand-500 rounded-full transition-all duration-500" style={{ width: `${stats.percent}%` }} />
            </div>
          </div>
          {stats.urgentPending > 0 && <Badge tone="danger" icon={Flame}>ด่วน {stats.urgentPending}</Badge>}
        </div>

        <Button
          icon={Plus}
          block
          className="mt-4 sm:w-auto"
          onClick={() => { setEditingTask(null); setIsCreateModalOpen(true); }}
        >
          {isUserAdmin ? 'สั่งงานใหม่' : 'เพิ่มงานของฉัน'}
        </Button>
      </GlassCard>

      {/* 2. Admin: what needs attention, in one compact list */}
      {isUserAdmin && (
        <section>
          <SectionHeader
            title="ต้องจัดการ"
            action={
              <button onClick={() => setViewMode(viewMode === 'tasks' ? 'team' : 'tasks')} className="text-sm font-bold text-brand-600 hover:underline flex items-center gap-1">
                <Users size={15} /> {viewMode === 'team' ? 'กลับไปดูรายการงาน' : 'ดูงานรายคน'}
              </button>
            }
          />
          <GlassCard className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-white/70 overflow-hidden">
            {attentionItems.map(({ key, icon: Icon, label, count, unit, tone, onClick }) => (
              <button key={key} onClick={onClick} className="p-3.5 text-left hover:bg-white/60 transition-colors min-h-[88px] flex flex-col justify-between">
                <span className={`w-9 h-9 rounded-control flex items-center justify-center ${count > 0 ? TONE[tone] : 'bg-white/70 text-ink-subtle'}`}>
                  <Icon size={18} />
                </span>
                <span className="mt-2">
                  <span className={`text-xl font-black tabular-nums ${count > 0 ? 'text-ink' : 'text-ink-subtle'}`}>{count}</span>
                  <span className="text-xs text-ink-subtle"> {unit}</span>
                  <span className="block text-sm font-semibold text-ink-muted leading-tight">{label}</span>
                </span>
              </button>
            ))}
          </GlassCard>
        </section>
      )}

      {/* 3. Empty state: no tasks yet */}
      {tasks.length === 0 && !loading && (
        <GlassCard className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <h4 className="text-base font-bold text-ink">ยังไม่มีรายการงาน</h4>
            <p className="text-sm text-ink-muted mt-0.5 max-w-md">
              {isUserAdmin
                ? 'โหลดชุดงานประจำวันเริ่มต้น 24 รายการ (สต็อก ครัว การเงิน จัดส่ง บริหาร หน้าร้าน) เพื่อเริ่มใช้ได้ทันที'
                : 'ยังไม่มีงานที่ได้รับมอบหมาย เพิ่มงานของคุณเองได้เลย'}
            </p>
          </div>
          {isUserAdmin ? (
            <Button icon={Sparkles} loading={isSeeding} onClick={handleSeedTemplates} className="shrink-0">
              {isSeeding ? 'กำลังโหลด' : 'โหลดชุดงานเริ่มต้น'}
            </Button>
          ) : (
            <Button icon={Plus} className="shrink-0" onClick={() => { setEditingTask(null); setIsCreateModalOpen(true); }}>เพิ่มงานของฉัน</Button>
          )}
        </GlassCard>
      )}

      {/* 4. Filters: team chips, status chips, search */}
      <div className="space-y-2.5">
        {visiblePositionTabs.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {visiblePositionTabs.map(tab => (
              <button key={tab.key} onClick={() => handleSelectPosTab(tab.key)} className={chipClass(selectedPosTab === tab.key)}>
                {tab.label}
                {tab.key === 'my' && (
                  <span className={selectedPosTab === tab.key ? 'opacity-80' : 'text-ink-subtle'}>
                    {tasks.filter(t => isTaskVisibleToUser(user, t) && matchesUserPosition(user, t) && !isTaskDone(t, todayKey)).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="glass flex p-1 rounded-2xl gap-1 overflow-x-auto scrollbar-hide">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`h-9 px-3.5 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${statusFilter === f.key ? 'bg-white text-brand-600 shadow-sm' : 'text-ink-muted hover:text-ink'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <label className="relative flex-1 sm:max-w-xs">
            <span className="sr-only">ค้นหางาน</span>
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหางานหรือชื่อคน"
              className="glass w-full h-11 pl-9 pr-3 text-sm rounded-control text-ink outline-none focus:ring-2 focus:ring-brand-200"
            />
          </label>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. CONTENT: TEAM MONITOR VIEW (If viewMode === 'team') */}
      {/* ========================================================================= */}
      {viewMode === 'team' && isUserAdmin ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <Users size={16} className="text-brand-500" />
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
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-500 to-purple-400 text-white font-bold flex items-center justify-center overflow-hidden shrink-0">
                        {member.photoURL ? (
                          <img src={member.photoURL} alt={member.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{(member.name || 'U').charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-black text-slate-800 truncate group-hover:text-brand-500">
                            {member.name || 'พนักงาน'}
                          </h4>
                          {member.role === 'admin' && (
                            <span className="text-xs px-1.5 py-0.2 bg-purple-100 text-brand-500 font-bold rounded-md">
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {member.position || 'พนักงานทั่วไป'}
                        </p>
                      </div>
                    </div>

                    {/* Workload Progress Bar */}
                    <div className="mt-3.5 pt-3 border-t border-slate-50 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-500">ความคืบหน้างาน</span>
                        <span className={memPercent === 100 && memTotal > 0 ? 'text-success-600' : 'text-brand-500'}>
                          {memDone}/{memTotal} งาน ({memPercent}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            memPercent === 100 && memTotal > 0 ? 'bg-success-500' : 'bg-brand-500'
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
              <Loader2 size={32} className="animate-spin text-brand-500" />
              <p className="text-xs text-slate-500 font-bold mt-3">กำลังโหลดข้อมูลภารกิจ...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-100 space-y-3">
              <div className="w-16 h-16 rounded-full bg-purple-50 text-brand-500 text-3xl flex items-center justify-center mx-auto">
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
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-brand-500 text-white text-xs font-bold shadow-md hover:bg-[#5244c4] transition-all"
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

                const todayRecord = isRoutine 
                  ? task.completedDates?.[todayKey]
                  : (isDone ? {
                      completedAt: task.completedAt,
                      completedByName: task.completedByName,
                      note: task.completionNote
                    } : null);

                const accent = isDone ? '' : (isOverdue || task.priority === 'urgent') ? 'bg-danger-500' : task.priority === 'high' ? 'bg-warning-500' : '';
                const iconBtn = 'w-9 h-9 rounded-control flex items-center justify-center text-ink-subtle transition-colors';
                const actions = (
                  <>
                      {!isRoutine && !isDone && task.status !== 'in_progress' && (
                        <button onClick={() => handleSetInProgress(task)} className={`${iconBtn} hover:text-brand-600 hover:bg-brand-50`} aria-label="เริ่มทำ">
                          <PlayCircle size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => setNoteModalConfig({ isOpen: true, task, noteText: todayRecord?.note || task.completionNote || '' })}
                        className={`${iconBtn} hover:text-ink hover:bg-white/70`}
                        aria-label="หมายเหตุ"
                      >
                        <MessageSquare size={17} />
                      </button>
                      {(isUserAdmin || task.createdBy === user?.uid) && (
                        <button onClick={() => { setEditingTask(task); setIsCreateModalOpen(true); }} className={`${iconBtn} hover:text-brand-600 hover:bg-brand-50`} aria-label="แก้ไขงาน">
                          <Edit3 size={17} />
                        </button>
                      )}
                      {isUserAdmin && (
                        <button onClick={() => setDeleteConfirmTask(task)} className={`${iconBtn} hover:text-danger-600 hover:bg-danger-50`} aria-label="ลบงาน">
                          <Trash2 size={17} />
                        </button>
                      )}
                  </>
                );
                return (
                  <div
                    key={task.id}
                    className={`glass rounded-card relative overflow-hidden pl-3 pr-2 py-3 flex items-start gap-3 ${isDone ? 'opacity-70' : ''}`}
                  >
                    {accent && <span className={`absolute left-0 top-0 bottom-0 w-1 ${accent}`} />}

                    {/* Done toggle: a large target, since this is the most used action */}
                    <button
                      onClick={() => handleToggleTask(task)}
                      className="w-11 h-11 -my-1 flex items-center justify-center shrink-0"
                      aria-label={isDone ? `ยกเลิกเสร็จ: ${task.title}` : `ทำเครื่องหมายเสร็จ: ${task.title}`}
                      aria-pressed={isDone}
                    >
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                        isDone ? 'bg-success-600 text-white' : 'border-2 border-brand-200 bg-white text-transparent hover:border-brand-500'
                      }`}>
                        <Check size={16} strokeWidth={3} />
                      </span>
                    </button>

                    <div className="flex-1 min-w-0">
                      <h4 className={`text-[15px] font-bold leading-snug ${isDone ? 'line-through text-ink-subtle font-semibold' : 'text-ink'}`}>
                        {task.title}
                      </h4>

                      {task.description && !isDone && (
                        <p className="text-sm text-ink-muted mt-0.5 line-clamp-1">{task.description}</p>
                      )}

                      {/* One metadata line: who · when · state */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-subtle mt-1.5">
                        <span className="flex items-center gap-1">
                          {task.targetType === 'user' ? <User size={13} /> : <Briefcase size={13} />}
                          {task.targetType === 'user' ? (task.targetUserName || 'พนักงาน') : (task.targetPosition || 'ทุกคน')}
                        </span>
                        {task.dueTime && <span className="flex items-center gap-1"><Clock size={13} /> ก่อน {task.dueTime} น.</span>}
                        {!isRoutine && <span>งานสั่งเพิ่ม</span>}
                        {task.priority === 'urgent' && !isDone && <span className="font-bold text-danger-600">ด่วน</span>}
                        {task.priority === 'high' && !isDone && <span className="font-bold text-warning-700">สำคัญ</span>}
                        {isOverdue && <span className="font-bold text-danger-600">เกินกำหนด {task.dueDate}</span>}
                        {isDueToday && !isDone && <span className="font-bold text-brand-600">ครบกำหนดวันนี้</span>}
                        {task.status === 'in_progress' && !isDone && <span className="font-bold text-brand-600">กำลังทำ</span>}
                        {isDone && (
                          <span className="font-semibold text-success-700">
                            {todayRecord?.completedByName ? `เสร็จโดย ${todayRecord.completedByName}` : 'เสร็จแล้ว'}
                            {(todayRecord?.note || task.completionNote) && <span className="font-normal text-ink-subtle"> · “{todayRecord?.note || task.completionNote}”</span>}
                          </span>
                        )}
                      </div>

                      {/* Secondary actions: a row under the text on phones */}
                      <div className="flex sm:hidden items-center -ml-2 mt-1">{actions}</div>
                    </div>

                    {/* Secondary actions: a column on the right on larger screens */}
                    <div className="hidden sm:flex items-center shrink-0 -mr-0.5">{actions}</div>
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
                <MessageSquare size={16} className="text-brand-500" />
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
              className="w-full p-3 rounded-2xl border border-slate-200 focus:border-brand-500 text-xs font-medium text-slate-800 outline-none resize-none"
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
                className="px-5 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold hover:bg-[#5244c4] shadow-sm"
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
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-brand-500 flex items-center justify-center font-bold text-lg">
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
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800">
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
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-500 hover:bg-[#5244c4] text-white text-xs font-black shadow-xs transition-all shrink-0 hover:scale-105 active:scale-95 cursor-pointer"
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
