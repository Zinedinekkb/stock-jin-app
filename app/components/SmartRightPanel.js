// app/components/SmartRightPanel.js
'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle2, Clock, Flame, Users, Sparkles, Plus, 
  ArrowRight, Check, AlertCircle, ChevronRight, Briefcase,
  TrendingUp, Award, Layers
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { 
  getTodayKey, 
  isTaskDone, 
  isTaskCompletedToday, 
  matchesUserPosition 
} from '../services/taskService';
import { isAdmin } from '../utils/permissions';
import CreateTaskModal from './CreateTaskModal';

export default function SmartRightPanel({ user, transactions = [], products = [] }) {
  const [tasks, setTasks] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const todayKey = useMemo(() => getTodayKey(), []);
  const isUserAdmin = isAdmin(user);

  // 1. Subscribe to 'tasks' in Firestore (Real-Time)
  useEffect(() => {
    const unsubTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      const taskArr = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTasks(taskArr);
    }, (err) => {
      console.error('Error in SmartRightPanel tasks listener:', err);
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
      console.error('Error in SmartRightPanel users listener:', err);
    });

    return () => unsubUsers();
  }, []);

  // Today's Statistics
  const stats = useMemo(() => {
    // Only count active today tasks: routine tasks + pending/in_progress assigned tasks + assigned tasks completed TODAY
    const todayTasks = tasks.filter(t => {
      if (t.isRoutine || t.type === 'routine') return true;
      if (!isTaskDone(t, todayKey)) return true;
      return isTaskCompletedToday(t, todayKey);
    });

    const total = todayTasks.length;
    const completed = todayTasks.filter(t => isTaskDone(t, todayKey)).length;
    const pending = total - completed;
    const urgentPending = todayTasks.filter(t => t.priority === 'urgent' && !isTaskDone(t, todayKey)).length;
    const inProgress = todayTasks.filter(t => t.status === 'in_progress' && !isTaskDone(t, todayKey)).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, pending, urgentPending, inProgress, percent };
  }, [tasks, todayKey]);

  // Urgent pending tasks
  const urgentTasks = useMemo(() => {
    return tasks
      .filter(t => t.priority === 'urgent' && !isTaskDone(t, todayKey))
      .slice(0, 3);
  }, [tasks, todayKey]);

  // SVG Arc calculation for percentage circle
  const radius = 60;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (stats.percent / 100) * circumference;

  return (
    <aside className="smart-right-panel w-full lg:w-80 space-y-5 animate-fade-in">
      {/* 1. Today's Progress Section */}
      <section className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-1 border-b border-slate-50">
          <div>
            <h3 className="text-sm font-black text-slate-800">
              📊 สรุปภารกิจวันนี้
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">ความคืบหน้ารวมทั้งหมด</p>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-[#6355d8] border border-purple-100">
            {todayKey}
          </span>
        </div>

        {/* Circular Progress Gauge */}
        <div className="flex flex-col items-center justify-center py-2 relative">
          <svg className="w-36 h-36 -rotate-90 transform" viewBox="0 0 140 140">
            {/* Background Track */}
            <circle
              cx="70"
              cy="70"
              r={radius}
              stroke="#f1f5f9"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Animated Progress Track */}
            <circle
              cx="70"
              cy="70"
              r={radius}
              stroke="url(#purpleGrad)"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-1000 ease-out"
            />
            <defs>
              <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#6355d8" />
              </linearGradient>
            </defs>
          </svg>

          {/* Centered Percentage Label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-black text-slate-800 tracking-tight">
              {stats.percent}%
            </span>
            <span className="text-[10px] font-bold text-slate-400 mt-0.5">
              เสร็จ {stats.completed}/{stats.total} งาน
            </span>
          </div>
        </div>

        {/* 4 Mini Stat Badges */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 text-center">
            <div className="text-[10px] font-bold text-slate-500">⏳ รอดำเนินการ</div>
            <div className="text-base font-black text-slate-800 mt-0.5">{stats.pending}</div>
          </div>
          <div className="p-2.5 rounded-2xl bg-purple-50 border border-purple-100 text-center">
            <div className="text-[10px] font-bold text-[#6355d8]">⚡ กำลังทำ</div>
            <div className="text-base font-black text-[#6355d8] mt-0.5">{stats.inProgress}</div>
          </div>
          <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-center">
            <div className="text-[10px] font-bold text-emerald-700">✅ สำเร็จแล้ว</div>
            <div className="text-base font-black text-emerald-700 mt-0.5">{stats.completed}</div>
          </div>
          <div className="p-2.5 rounded-2xl bg-rose-50 border border-rose-100 text-center">
            <div className="text-[10px] font-bold text-rose-700">🔥 งานด่วน</div>
            <div className="text-base font-black text-rose-700 mt-0.5">{stats.urgentPending}</div>
          </div>
        </div>
      </section>

      {/* 2. Urgent Attention Section (If any) */}
      {urgentTasks.length > 0 && (
        <section className="bg-rose-50/60 rounded-3xl p-4 border border-rose-200 shadow-xs space-y-2.5 animate-pulse">
          <div className="flex items-center gap-2 text-rose-800">
            <Flame size={16} className="text-rose-600 shrink-0" />
            <h4 className="text-xs font-black tracking-tight">
              งานด่วนที่ต้องทำทันที ({urgentTasks.length})
            </h4>
          </div>
          <div className="space-y-1.5">
            {urgentTasks.map(t => (
              <div key={t.id} className="p-2.5 bg-white rounded-xl border border-rose-100 shadow-2xs text-left">
                <div className="flex items-center justify-between gap-1 text-[10px] font-bold text-rose-700">
                  <span className="truncate">{t.targetPosition || 'ทุกคน'}</span>
                  {t.dueTime && <span>⏰ {t.dueTime} น.</span>}
                </div>
                <div className="text-xs font-bold text-slate-800 mt-1 line-clamp-1">
                  {t.title}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. Real Team Workload Section */}
      <section className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between pb-1 border-b border-slate-50">
          <div className="flex items-center gap-1.5">
            <Users size={16} className="text-[#6355d8]" />
            <h3 className="text-sm font-black text-slate-800">
              👥 สมาชิกทีม ({usersList.length})
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 font-bold">ความคืบหน้ารายคน</span>
        </div>

        <div className="space-y-2.5 max-h-[300px] overflow-y-auto scrollbar-hide pr-1">
          {usersList
            .filter(u => u.status !== 'deactivated')
            .map(member => {
              const memTasks = tasks.filter(t => matchesUserPosition(member, t));
              const mTotal = memTasks.length;
              const mDone = memTasks.filter(t => isTaskDone(t, todayKey)).length;
              const mPercent = mTotal > 0 ? Math.round((mDone / mTotal) * 100) : 0;

              return (
                <div 
                  key={member.id || member.uid}
                  className="p-2.5 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-xl bg-purple-100 text-[#6355d8] font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                        {member.photoURL ? (
                          <img src={member.photoURL} alt={member.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{(member.name || 'U').charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 truncate">
                          {member.name || 'พนักงาน'}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {member.position || (member.role === 'admin' ? 'ผู้ดูแลระบบ' : 'พนักงานทั่วไป')}
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md shrink-0">
                      {mDone}/{mTotal}
                    </span>
                  </div>

                  {/* Micro Progress Bar */}
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#6355d8] rounded-full transition-all duration-300"
                      style={{ width: `${mPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
        </div>

        {/* Quick Action Button */}
        <div className="pt-2">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="w-full py-2.5 px-3 rounded-2xl bg-[#6355d8] hover:bg-[#5244c4] text-white text-xs font-black shadow-md shadow-purple-500/20 transition-all flex items-center justify-center gap-1.5"
          >
            <Plus size={16} strokeWidth={3} />
            <span>{isUserAdmin ? 'สั่งงานพนักงานด่วน' : 'เพิ่มงานส่วนตัว'}</span>
          </button>
        </div>
      </section>

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        currentUser={user}
        approvedUsers={usersList}
        onTaskSaved={() => {}}
      />
    </aside>
  );
}
