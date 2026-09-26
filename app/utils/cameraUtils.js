// app/utils/cameraUtils.js
'use client';

/**
 * Start streaming video from camera to the given video element.
 * @param {HTMLVideoElement} videoElement
 * @param {'user' | 'environment'} facingMode
 * @returns {Promise<MediaStream>}
 */
export async function startCameraStream(videoElement, facingMode = 'user') {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('อุปกรณ์หรือเบราว์เซอร์นี้ไม่รองรับการเปิดกล้อง');
  }

  // Stop previous stream if any
  stopCameraStream(videoElement);

  const constraints = {
    video: {
      facingMode: { ideal: facingMode },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
    audio: false,
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    if (videoElement) {
      videoElement.srcObject = stream;
      await videoElement.play();
    }
    return stream;
  } catch (err) {
    // If exact facingMode fails, try fallback without facingMode constraints
    if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
      const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (videoElement) {
        videoElement.srcObject = fallbackStream;
        await videoElement.play();
      }
      return fallbackStream;
    }
    throw err;
  }
}

/**
 * Stop active media stream from video element.
 * @param {HTMLVideoElement} videoElement
 */
export function stopCameraStream(videoElement) {
  if (!videoElement) return;
  const stream = videoElement.srcObject;
  if (stream && stream.getTracks) {
    stream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch (e) {
        console.warn('Track stop error:', e);
      }
    });
  }
  videoElement.srcObject = null;
}

/**
 * Capture frame from video element, resize to target width, and compress to WebP (or JPEG fallback).
 * Targets 20KB - 35KB output size.
 * @param {HTMLVideoElement} videoElement
 * @param {Object} options
 * @returns {Promise<{ blob: Blob, previewUrl: string, width: number, height: number, sizeBytes: number }>}
 */
export async function captureAndCompressFrame(videoElement, options = {}) {
  const {
    targetWidth = 480,
    quality = 0.70,
    mirror = false,
  } = options;

  if (!videoElement || videoElement.videoWidth === 0) {
    throw new Error('กล้องยังไม่พร้อมสำหรับการจับภาพ');
  }

  const vWidth = videoElement.videoWidth;
  const vHeight = videoElement.videoHeight;

  // Calculate proportional dimensions
  const scale = targetWidth / vWidth;
  const targetHeight = Math.round(vHeight * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('ไม่สามารถสร้าง canvas context ได้');

  if (mirror) {
    // Mirror horizontally for front selfie camera
    ctx.translate(targetWidth, 0);
    ctx.scale(-1, 1);
  }

  ctx.drawImage(videoElement, 0, 0, targetWidth, targetHeight);

  // Check if browser supports image/webp export via canvas
  const isWebpSupported = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  const mimeType = isWebpSupported ? 'image/webp' : 'image/jpeg';
  const fileExt = isWebpSupported ? 'webp' : 'jpg';
  const dataUrl = canvas.toDataURL(mimeType, quality);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          // If toBlob fails, construct fallback blob from dataUrl
          return resolve({
            blob: null,
            dataUrl,
            previewUrl: dataUrl,
            width: targetWidth,
            height: targetHeight,
            sizeBytes: Math.round(dataUrl.length * 0.75),
            sizeKb: ((dataUrl.length * 0.75) / 1024).toFixed(1),
            mimeType,
            fileExt,
          });
        }
        const previewUrl = URL.createObjectURL(blob);
        resolve({
          blob,
          dataUrl,
          previewUrl,
          width: targetWidth,
          height: targetHeight,
          sizeBytes: blob.size,
          sizeKb: (blob.size / 1024).toFixed(1),
          mimeType,
          fileExt,
        });
      },
      mimeType,
      quality
    );
  });
}

/**
 * Convert Blob or File to Base64 Data URL.
 * @param {Blob|File} blob
 * @returns {Promise<string>}
 */
export function blobToDataUrl(blob) {
  if (!blob) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Compress an image file to WebP (or JPEG fallback) under target dimension and size.
 * @param {File|Blob} file
 * @param {Object} options
 * @returns {Promise<{ blob: Blob, dataUrl: string, sizeKb: number }>}
 */
export async function compressImageFile(file, options = {}) {
  const { maxWidth = 400, quality = 0.75 } = options;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const isWebp = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
        const mimeType = isWebp ? 'image/webp' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(mimeType, quality);
        canvas.toBlob(
          (blob) => {
            resolve({
              blob: blob || file,
              dataUrl,
              sizeKb: Math.round((dataUrl.length * 0.75) / 1024),
            });
          },
          mimeType,
          quality
        );
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Fetch current GPS coordinates with a safe timeout.
 * @param {number} timeoutMs
 * @returns {Promise<{ lat: number, lng: number, accuracy: number } | null>}
 */
export async function getCurrentCoordinates(timeoutMs = 6000) {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return null;
  }

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve(null);
    }, timeoutMs);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        resolve({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          accuracy: Math.round(pos.coords.accuracy || 0),
        });
      },
      (err) => {
        clearTimeout(timer);
        console.warn('Geolocation warning:', err.message);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs - 500,
        maximumAge: 10000,
      }
    );
  });
}
