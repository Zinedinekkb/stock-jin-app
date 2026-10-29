// app/components/ConfirmModal.js
import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { Button } from './ui';

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, type = 'danger', busy = false }) {
  if (!isOpen) return null;
  const isDanger = type === 'danger';
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="glass-strong rounded-card w-full max-w-sm overflow-hidden animate-scale-in">
        <div className="p-5 pb-0 flex items-start gap-3">
          <span className={`w-10 h-10 rounded-control flex items-center justify-center shrink-0 ${isDanger ? 'bg-danger-50 text-danger-600' : 'bg-brand-50 text-brand-500'}`}>
            {isDanger ? <AlertTriangle size={20} /> : <Info size={20} />}
          </span>
          <div className="min-w-0 pt-1.5">
            <h3 id="confirm-title" className="text-base font-bold text-ink">{title}</h3>
            <p className="text-sm text-ink-muted leading-relaxed whitespace-pre-line mt-1.5">{message}</p>
          </div>
        </div>
        <div className="p-5 flex gap-2.5">
          <Button variant="secondary" className="flex-1" onClick={onCancel} disabled={busy}>ยกเลิก</Button>
          <Button variant={isDanger ? 'danger' : 'primary'} className="flex-1" onClick={onConfirm} loading={busy}>
            {busy ? 'กำลังดำเนินการ' : 'ยืนยัน'}
          </Button>
        </div>
      </div>
    </div>
  );
}
