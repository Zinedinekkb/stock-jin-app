// app/components/CreateTaskModal.js
'use client';
import React, { useState, useEffect } from 'react';
import { 
  X, Check, AlertCircle, Calendar, Clock, 
  User, Users, Briefcase, Flame, Sparkles, Loader2
} from 'lucide-react';
import { createTask, updateTask, getTodayKey, notifyTaskAssigned } from '../services/taskService';
import { isAdmin } from '../utils/permissions';

const POSITIONS = [
  { key: 'พนักงานคุมสต็อก', label: '📦 พนักงานคุมสต็อก / คลังสินค้า', dept: 'warehouse' },
  { key: 'เชฟ / แม่ครัว', label: '👨‍🍳 เชฟ / แม่ครัว / ครัว', dept: 'kitchen' },
  { key: 'พนักงานแคชเชียร์', label: '💰 พนักงานแคชเชียร์ / การเงิน / บัญชี', dept: 'finance' },
  { key: 'พนักงานเสิร์ฟ', label: '🍱 พนักงานเสิร์ฟ / หน้าร้าน / บริการ', dept: 'service' },
  { key: 'จัดส่ง/คลัง', label: '🚚 จัดส่ง / โลจิสติกส์ / ไรเดอร์', dept: 'shipping' },
  { key: 'ผู้จัดการร้าน', label: '👔 ผู้จัดการร้าน / ผู้ดูแลระบบ (Admin)', dept: 'management' },
  { key: 'ทุกคน', label: '👥 พนักงานทุกคนในร้าน (All Staff)', dept: 'all' },
];

const PRIORITIES = [
  { key: 'urgent', label: '🔴 ด่วนมาก', desc: 'ต้องรีบทำทันที', color: 'border-rose-400 bg-rose-50 text-rose-700' },
  { key: 'high', label: '🟡 สำคัญ', desc: 'ต้องเสร็จภายในกำหนด', color: 'border-amber-400 bg-amber-50 text-amber-700' },
  { key: 'normal', label: '🔵 ปกติ', desc: 'งานทั่วไปตามรอบ', color: 'border-indigo-400 bg-indigo-50 text-indigo-700' },
  { key: 'low', label: '⚪ ทั่วไป', desc: 'ไม่มีเวลาเร่งด่วน', color: 'border-slate-300 bg-slate-50 text-slate-700' },
];

export default function CreateTaskModal({ 
  isOpen, 
  onClose, 
  currentUser, 
  approvedUsers = [], 
  onTaskSaved,
  editingTask = null 
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('assigned'); // 'routine' | 'assigned'
  const [targetType, setTargetType] = useState('position'); // 'position' | 'user' | 'all'
  const [targetPosition, setTargetPosition] = useState('พนักงานคุมสต็อก');
  const [targetUserId, setTargetUserId] = useState('');
  const [priority, setPriority] = useState('normal');
  const [dueDate, setDueDate] = useState(getTodayKey());
  const [dueTime, setDueTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isUserAdmin = isAdmin(currentUser);

  // Pre-fill when editing or opening
  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title || '');
      setDescription(editingTask.description || '');
      setType(editingTask.type || 'assigned');
      setTargetType(editingTask.targetType || 'position');
      setTargetPosition(editingTask.targetPosition || 'พนักงานคุมสต็อก');
      setTargetUserId(editingTask.targetUserId || '');
      setPriority(editingTask.priority || 'normal');
      setDueDate(editingTask.dueDate || getTodayKey());
      setDueTime(editingTask.dueTime || '');
    } else {
      setTitle('');
      setDescription('');
      setType('assigned');
      if (isUserAdmin) {
        setTargetType('position');
        setTargetPosition('พนักงานคุมสต็อก');
        setTargetUserId('');
      } else {
        // Staff creates task for self by default
        setTargetType('user');
        setTargetUserId(currentUser?.uid || currentUser?.id || '');
        setTargetPosition(currentUser?.position || 'พนักงานทั่วไป');
      }
      setPriority('normal');
      setDueDate(getTodayKey());
      setDueTime('');
    }
    setErrorMsg('');
  }, [editingTask, isOpen, isUserAdmin, currentUser]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('กรุณากรอกชื่องานหรือภารกิจ');
      return;
    }

    if (targetType === 'user' && !targetUserId) {
      setErrorMsg('กรุณาเลือกพนักงานผู้รับผิดชอบ');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      // Resolve assigned user info if targetType is 'user'
      let assignedUserName = null;
      let assignedUserPhoto = null;
      let assignedUserPos = targetPosition;

      if (targetType === 'user' && targetUserId) {
        const found = approvedUsers.find(u => u.id === targetUserId || u.uid === targetUserId);
        if (found) {
          assignedUserName = found.name || 'พนักงาน';
          assignedUserPhoto = found.photoURL || null;
          assignedUserPos = found.position || targetPosition;
        } else if (targetUserId === currentUser?.uid || targetUserId === currentUser?.id) {
          assignedUserName = currentUser?.name || 'พนักงาน';
          assignedUserPhoto = currentUser?.photoURL || null;
          assignedUserPos = currentUser?.position || targetPosition;
        }
      }

      // Find department category
      const matchedPosObj = POSITIONS.find(p => p.key === targetPosition);
      const category = matchedPosObj ? matchedPosObj.dept : 'general';

      const taskPayload = {
        title: title.trim(),
        description: description.trim(),
        type,
        isRoutine: type === 'routine',
        category,
        targetType,
        targetPosition: targetType === 'user' ? assignedUserPos : targetPosition,
        targetDepartment: category,
        targetUserId: targetType === 'user' ? targetUserId : null,
        targetUserName: assignedUserName,
        targetUserPhoto: assignedUserPhoto,
        priority,
        dueDate: dueDate || getTodayKey(),
        dueTime: dueTime || '',
      };

      if (editingTask && editingTask.id) {
        await updateTask(editingTask.id, taskPayload, currentUser);
      } else {
        const created = await createTask(taskPayload, currentUser);
        // Optionally send LINE notify for assigned/urgent tasks
        if (taskPayload.type === 'assigned' || taskPayload.priority === 'urgent') {
          notifyTaskAssigned({ ...created, ...taskPayload }, currentUser);
        }
      }

      if (onTaskSaved) onTaskSaved();
      onClose();
    } catch (err) {
      console.error('Error saving task:', err);
      setErrorMsg('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-purple-700 to-[#6355d8] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-bold">
              {type === 'routine' ? '🔄' : '⚡'}
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">
                {editingTask ? 'แก้ไขงาน / ภารกิจ' : isUserAdmin ? 'สั่งงานใหม่ / มอบหมายภารกิจ' : 'เพิ่มบันทึกงานของฉัน (To-Do)'}
              </h2>
              <p className="text-xs text-purple-100 font-medium">
                {isUserAdmin ? 'สำหรับผู้บริหารและผู้มอบหมายงาน' : 'รายการงานส่วนตัวที่ต้องทำ'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-bold">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Type Selector (งานประจำวัน vs งานเสริมสั่งมอบหมาย) */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-2">
              ประเภทงาน <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('routine')}
                className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-2.5 ${
                  type === 'routine' 
                    ? 'border-[#6355d8] bg-purple-50/70 shadow-sm text-purple-950 font-bold' 
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <span className="text-xl">🔄</span>
                <div>
                  <div className="text-xs font-bold">งานประจำวัน (Routine)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">เช็คลิสต์รายวันสำหรับตำแหน่งงาน</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setType('assigned')}
                className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-2.5 ${
                  type === 'assigned' 
                    ? 'border-[#6355d8] bg-purple-50/70 shadow-sm text-purple-950 font-bold' 
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <span className="text-xl">⚡</span>
                <div>
                  <div className="text-xs font-bold">งานเสริม / งานสั่งมอบหมาย</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">งานเฉพาะกิจ มีกำหนดส่งและติดตามผล</div>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Title */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1.5">
              ชื่องาน / หัวข้อภารกิจ <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น ตรวจนับสต็อกโซนแช่แข็ง, เตรียมเนื้อสัตว์สำหรับมื้อเที่ยง, สรุปเงินทอนเปิดกะ"
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:border-[#6355d8] focus:ring-4 focus:ring-purple-500/10 text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none transition-all"
            />
          </div>

          {/* 3. Assignment Target */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1.5">
              ผู้รับผิดชอบ / ตำแหน่งงาน <span className="text-rose-500">*</span>
            </label>
            
            {isUserAdmin ? (
              <div className="flex flex-wrap gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setTargetType('position')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    targetType === 'position'
                      ? 'bg-[#6355d8] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  🏢 ตามตำแหน่งงาน
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType('user')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    targetType === 'user'
                      ? 'bg-[#6355d8] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  👤 ระบุพนักงานรายบุคคล
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTargetType('all');
                    setTargetPosition('ทุกคน');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    targetType === 'all'
                      ? 'bg-[#6355d8] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  👥 พนักงานทุกคน
                </button>
              </div>
            ) : (
              <div className="mb-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 border border-purple-200 rounded-xl text-xs font-bold text-[#6355d8]">
                  👤 งานของฉัน ({currentUser?.name || 'พนักงาน'})
                </span>
              </div>
            )}

            {targetType === 'position' && isUserAdmin && (
              <select
                value={targetPosition}
                onChange={(e) => setTargetPosition(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:border-[#6355d8] text-sm font-semibold text-slate-800 outline-none bg-white"
              >
                {POSITIONS.map(p => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
              </select>
            )}

            {targetType === 'user' && isUserAdmin && (
              <select
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:border-[#6355d8] text-sm font-semibold text-slate-800 outline-none bg-white"
              >
                <option value="">-- เลือกพนักงานผู้รับผิดชอบ --</option>
                {approvedUsers
                  .filter(u => u.status !== 'deactivated')
                  .map(u => (
                    <option key={u.id || u.uid} value={u.id || u.uid}>
                      {u.name || 'พนักงาน'} ({u.position || 'พนักงานทั่วไป'})
                    </option>
                  ))}
              </select>
            )}
          </div>

          {/* 4. Priority */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-2">
              ระดับความสำคัญ (Priority)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRIORITIES.map(p => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPriority(p.key)}
                  className={`p-2.5 rounded-2xl border text-center transition-all ${
                    priority === p.key 
                      ? `${p.color} ring-2 ring-purple-600/30 font-black shadow-xs` 
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-bold">{p.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 5. Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5">
                📅 กำหนดวันที่
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:border-[#6355d8] text-sm font-semibold text-slate-800 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5">
                ⏰ เวลาที่ควรเสร็จ (ถ้ามี)
              </label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                placeholder="เช่น 16:30"
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:border-[#6355d8] text-sm font-semibold text-slate-800 outline-none"
              />
            </div>
          </div>

          {/* 6. Description / Notes */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1.5">
              รายละเอียด / ขั้นตอนการทำงาน (Instructions / Notes)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ระบุข้อควรระวัง จุดตรวจเช็ค หรือข้อมูลเพิ่มเติม..."
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:border-[#6355d8] focus:ring-4 focus:ring-purple-500/10 text-sm font-normal text-slate-800 placeholder-slate-400 outline-none transition-all resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-[#6355d8] hover:bg-[#5244c4] text-white text-xs font-black shadow-lg shadow-purple-500/25 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <Check size={16} strokeWidth={3} />
                  <span>{editingTask ? 'บันทึกการแก้ไข' : isUserAdmin ? 'บันทึกและสั่งงาน' : 'บันทึกงานของฉัน'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
