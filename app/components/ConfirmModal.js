// app/components/ConfirmModal.js
import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, type = 'danger' }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100 border-2 ${type === 'danger' ? 'border-red-100' : 'border-green-100'}`}>
        <div className={`p-4 flex items-center gap-3 ${type === 'danger' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-800'}`}>
          {type === 'danger' ? <AlertTriangle size={24} /> : <Info size={24} />}
          <h3 className="text-lg font-bold">{title}</h3>
        </div>
        <div className="p-6">
          <p className="text-gray-700 text-sm leading-relaxed">{message}</p>
        </div>
        <div className="p-4 bg-gray-50 flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-200 transition-colors">ยกเลิก</button>
          <button onClick={onConfirm} className={`flex-1 py-2.5 rounded-xl font-bold text-white shadow-lg ${type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-700 hover:bg-green-800'}`}>
            ยืนยัน
          </button>
        </div>
      </div>
    </div>
  );
}