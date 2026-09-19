// app/components/CameraAttendanceModal.js
'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Camera, RefreshCw, X, Check, MapPin, AlertCircle, Loader2,
  Sparkles, ShieldCheck
} from 'lucide-react';
import {
  startCameraStream, stopCameraStream, captureAndCompressFrame, getCurrentCoordinates
} from '@/app/utils/cameraUtils';

export default function CameraAttendanceModal({
  isOpen,
  onClose,
  onConfirm,
  type = 'checkIn',
  userName = 'พนักงาน',
}) {
  const videoRef = useRef(null);
  const [facingMode, setFacingMode] = useState('user'); // 'user' | 'environment'
  const [cameraError, setCameraError] = useState('');
  const [isLoadingCamera, setIsLoadingCamera] = useState(true);
  const [capturedData, setCapturedData] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('searching'); // 'searching' | 'found' | 'unavailable'
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    stopCameraStream(videoRef.current);
    setCapturedData(null);
    setCameraError('');
    setIsSubmitting(false);
    onClose();
  };

  // Initialize camera and location on modal open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const videoElem = videoRef.current;

    // 1. Fetch GPS location in background
    getCurrentCoordinates(6000).then((coords) => {
      if (!isMounted) return;
      if (coords) {
        setLocation(coords);
        setLocationStatus('found');
      } else {
        setLocationStatus('unavailable');
      }
    });

    // 2. Start Camera
    startCameraStream(videoElem, facingMode)
      .then(() => {
        if (isMounted) setIsLoadingCamera(false);
      })
      .catch((err) => {
        if (isMounted) {
          setIsLoadingCamera(false);
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            setCameraError('เบราว์เซอร์ไม่ได้รับอนุญาตให้ใช้กล้อง กรุณาเปิดสิทธิ์กล้องในการตั้งค่าเบราว์เซอร์');
          } else {
            setCameraError(err.message || 'ไม่สามารถเปิดกล้องได้');
          }
        }
      });

    return () => {
      isMounted = false;
      stopCameraStream(videoElem);
    };
  }, [isOpen, facingMode]);

  // Flip camera between front and back
  const handleToggleCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // Capture frame
  const handleCapture = async () => {
    if (!videoRef.current) return;
    try {
      const result = await captureAndCompressFrame(videoRef.current, {
        targetWidth: 480,
        quality: 0.70,
        mirror: facingMode === 'user',
      });
      // Stop stream to save battery while user reviews photo
      stopCameraStream(videoRef.current);
      setCapturedData(result);
    } catch (err) {
      console.error('Capture error:', err);
      alert('ไม่สามารถถ่ายภาพได้: ' + err.message);
    }
  };

  // Retake photo
  const handleRetake = async () => {
    if (capturedData?.previewUrl) {
      URL.revokeObjectURL(capturedData.previewUrl);
    }
    setCapturedData(null);
    setIsLoadingCamera(true);
    try {
      await startCameraStream(videoRef.current, facingMode);
      setIsLoadingCamera(false);
    } catch (err) {
      setIsLoadingCamera(false);
      setCameraError('ไม่สามารถเริ่มกล้องใหม่ได้');
    }
  };

  // Confirm and upload
  const handleConfirmSubmit = async () => {
    if (!capturedData?.blob || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onConfirm({
        blob: capturedData.blob,
        sizeKb: capturedData.sizeKb,
        location: location,
        mimeType: capturedData.mimeType,
        fileExt: capturedData.fileExt,
      });
      handleClose();
    } catch (err) {
      console.error('Submit error:', err);
      alert('เกิดข้อผิดพลาดในการบันทึก: ' + err.message);
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isCheckIn = type === 'checkIn';
  const titleText = isCheckIn ? 'ถ่ายรูปเช็คอินเข้างาน' : 'ถ่ายรูปเช็คเอาท์ออกงาน';
  const themeColor = isCheckIn ? '#16a34a' : '#dc2626';

  return (
    <div className="cam-modal-overlay">
      <div className="cam-modal-container">
        {/* Header */}
        <div className="cam-modal-header">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-sm"
              style={{ background: themeColor }}
            >
              <Camera size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-800 leading-tight">{titleText}</h3>
              <p className="text-[11px] text-gray-500">{userName} · ถ่ายภาพเพื่อยืนยันตัวตน</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="cam-close-btn"
            aria-label="ปิด"
          >
            <X size={18} />
          </button>
        </div>

        {/* Viewfinder / Preview Screen */}
        <div className="cam-viewfinder-wrapper">
          {/* Live Video */}
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            className={`cam-video-element ${capturedData ? 'hidden' : ''} ${
              facingMode === 'user' ? 'cam-mirror' : ''
            }`}
          />

          {/* Captured Image Preview */}
          {capturedData && (
            <div className="cam-preview-container">
              <img
                src={capturedData.previewUrl}
                alt="Captured attendance"
                className="cam-preview-img"
              />
              <div className="cam-compress-badge">
                <Sparkles size={13} className="text-amber-300" />
                <span>บีบอัดแล้ว {capturedData.sizeKb} KB (WebP)</span>
              </div>
            </div>
          )}

          {/* Loading Spinner */}
          {isLoadingCamera && !capturedData && !cameraError && (
            <div className="cam-overlay-state">
              <Loader2 size={32} className="animate-spin text-indigo-500 mb-2" />
              <p className="text-xs font-medium text-gray-600">กำลังเปิดกล้อง...</p>
            </div>
          )}

          {/* Camera Error Message */}
          {cameraError && (
            <div className="cam-overlay-state p-6 text-center">
              <AlertCircle size={36} className="text-red-500 mb-2" />
              <p className="text-xs font-semibold text-gray-800 mb-1">ไม่สามารถเปิดกล้องได้</p>
              <p className="text-[11px] text-gray-500 leading-relaxed mb-4">{cameraError}</p>
              <button
                type="button"
                onClick={() => {
                  setCameraError('');
                  setIsLoadingCamera(true);
                  startCameraStream(videoRef.current, facingMode)
                    .then(() => setIsLoadingCamera(false))
                    .catch((e) => {
                      setIsLoadingCamera(false);
                      setCameraError(e.message);
                    });
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 active:scale-95 transition-all"
              >
                ลองใหม่อีกครั้ง
              </button>
            </div>
          )}

          {/* Face Guide Oval (Shown only during live preview) */}
          {!capturedData && !isLoadingCamera && !cameraError && (
            <div className="cam-face-guide">
              <div className="cam-face-oval" />
              <span className="cam-guide-text">จัดใบหน้าให้อยู่ในกรอบ</span>
            </div>
          )}

          {/* Flip Camera Button */}
          {!capturedData && !cameraError && (
            <button
              type="button"
              onClick={handleToggleCamera}
              className="cam-flip-btn"
              title="สลับกล้องหน้า/หลัง"
            >
              <RefreshCw size={17} />
            </button>
          )}

          {/* Location Status Badge */}
          <div className="cam-location-badge">
            <MapPin
              size={12}
              className={
                locationStatus === 'found'
                  ? 'text-emerald-500'
                  : locationStatus === 'searching'
                  ? 'text-amber-500 animate-pulse'
                  : 'text-gray-400'
              }
            />
            <span>
              {locationStatus === 'found'
                ? `GPS: ${location.lat}, ${location.lng}`
                : locationStatus === 'searching'
                ? 'กำลังระบุพิกัด GPS...'
                : 'ไม่พบพิกัด GPS (อนุญาต)'}
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="cam-modal-footer">
          {!capturedData ? (
            <button
              type="button"
              onClick={handleCapture}
              disabled={isLoadingCamera || !!cameraError}
              className="cam-shutter-btn"
              style={{
                background: isCheckIn
                  ? 'linear-gradient(135deg, #16a34a, #15803d)'
                  : 'linear-gradient(135deg, #dc2626, #b91c1c)',
              }}
            >
              <div className="cam-shutter-inner">
                <Camera size={22} className="text-white" />
              </div>
              <span className="text-sm font-bold text-white">กดถ่ายรูป</span>
            </button>
          ) : (
            <div className="cam-confirm-actions">
              <button
                type="button"
                onClick={handleRetake}
                disabled={isSubmitting}
                className="cam-retake-btn"
              >
                <RefreshCw size={16} /> ถ่ายใหม่
              </button>

              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
                className="cam-submit-btn"
                style={{
                  background: isCheckIn
                    ? 'linear-gradient(135deg, #16a34a, #15803d)'
                    : 'linear-gradient(135deg, #dc2626, #b91c1c)',
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    กำลังบันทึกและอัปโหลด...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    ยืนยันบันทึกเวลา
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
