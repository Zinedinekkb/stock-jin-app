// app/components/AttendancePhotoModal.js
'use client';

import React, { useState } from 'react';
import {
  X, MapPin, ExternalLink, Calendar, Clock, LogIn, LogOut, User, Image as ImageIcon
} from 'lucide-react';

export default function AttendancePhotoModal({ isOpen, onClose, record }) {
  const hasInPhoto = Boolean(record?.checkInPhotoURL || record?.photoURL);
  const hasOutPhoto = Boolean(record?.checkOutPhotoURL);

  const [activeTab, setActiveTab] = useState('in');

  React.useEffect(() => {
    if (record) {
      setActiveTab(hasInPhoto ? 'in' : 'out');
    }
  }, [record, hasInPhoto]);

  if (!isOpen || !record) return null;

  const inPhoto = record.checkInPhotoURL || record.photoURL;
  const inLoc = record.checkInLocation || record.location;
  const outPhoto = record.checkOutPhotoURL;
  const outLoc = record.checkOutLocation;

  const currentPhoto = activeTab === 'in' ? inPhoto : outPhoto;
  const currentLoc = activeTab === 'in' ? inLoc : outLoc;
  const currentTime = activeTab === 'in' ? record.checkIn : record.checkOut;

  const getMapUrl = (loc) => {
    if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') return null;
    return `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
  };

  return (
    <div className="cam-modal-overlay">
      <div className="cam-modal-container max-w-sm">
        {/* Header */}
        <div className="cam-modal-header">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ImageIcon size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-800">หลักฐานการลงเวลา</h3>
              <p className="text-[11px] text-gray-500">
                {record.userName || 'พนักงาน'} · {record.dateStr}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cam-close-btn"
            aria-label="ปิด"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switch between Check-In / Check-Out if both exist */}
        {hasInPhoto && hasOutPhoto && (
          <div className="flex border-b border-gray-100 bg-gray-50/70 p-1.5 gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('in')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'in'
                  ? 'bg-white text-green-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <LogIn size={13} /> เข้างาน ({record.checkIn})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('out')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'out'
                  ? 'bg-white text-red-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <LogOut size={13} /> ออกงาน ({record.checkOut})
            </button>
          </div>
        )}

        {/* Photo Display Body */}
        <div className="p-4 flex flex-col items-center">
          {currentPhoto ? (
            <div className="w-full relative rounded-2xl overflow-hidden border border-gray-200 shadow-inner bg-black flex items-center justify-center min-h-[260px] max-h-[360px]">
              <img
                src={currentPhoto}
                alt="Attendance proof"
                className="w-full h-full object-contain max-h-[360px]"
              />
              <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-sm rounded-xl px-3 py-1.5 flex items-center justify-between text-white text-[11px]">
                <span className="flex items-center gap-1 font-semibold">
                  <Clock size={12} className="text-amber-300" />
                  {activeTab === 'in' ? `เข้า: ${record.checkIn || '-'}` : `ออก: ${record.checkOut || '-'}`}
                </span>
                <span className="text-[10px] text-gray-300">{record.dateStr}</span>
              </div>
            </div>
          ) : (
            <div className="w-full h-48 rounded-2xl bg-gray-100 flex flex-col items-center justify-center text-gray-400 gap-2 border border-dashed border-gray-200">
              <ImageIcon size={32} className="opacity-40" />
              <span className="text-xs">ไม่มีรูปภาพบันทึกไว้</span>
            </div>
          )}

          {/* Location Details */}
          <div className="w-full mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <MapPin size={15} />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">พิกัดสถานที่</p>
                <p className="text-xs font-bold text-gray-800">
                  {currentLoc && typeof currentLoc.lat === 'number'
                    ? `${currentLoc.lat}, ${currentLoc.lng}`
                    : 'ไม่ได้บันทึกพิกัด GPS'}
                </p>
              </div>
            </div>

            {currentLoc && getMapUrl(currentLoc) && (
              <a
                href={getMapUrl(currentLoc)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                title="เปิดใน Google Maps"
              >
                <span>แผนที่</span>
                <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>

        {/* Footer Close Button */}
        <div className="p-3 border-t border-gray-100 bg-gray-50/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-xs font-bold transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}
