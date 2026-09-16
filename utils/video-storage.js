/**
 * Utility for local video file handling, IndexedDB storage, and canvas frame capture
 */

const DB_NAME = 'mediaai_video_db';
const DB_VERSION = 1;
const STORE_NAME = 'video_blobs';

function openDB() {
  return new Promise((resolve, reject) => {
    if (!process.client || !window.indexedDB) {
      resolve(null);
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

/**
 * Save video file into IndexedDB for persistent local playback
 */
export async function saveVideoFile(videoId, file) {
  if (!process.client || !file) return;
  try {
    const db = await openDB();
    if (!db) return;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({
      id: String(videoId),
      name: file.name,
      type: file.type,
      size: file.size,
      blob: file,
      updatedAt: Date.now(),
    });
    await new Promise((resolve) => {
      tx.oncomplete = resolve;
      tx.onerror = resolve;
    });
  } catch (err) {
    console.warn('Failed to save video to IndexedDB:', err);
  }
}

/**
 * Retrieve video file blob from IndexedDB and return an object URL
 */
export async function getVideoObjectUrl(videoId) {
  if (!process.client) return null;
  try {
    const db = await openDB();
    if (!db) return null;
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(String(videoId));

    return await new Promise((resolve) => {
      request.onsuccess = () => {
        const item = request.result;
        if (item && item.blob) {
          resolve(URL.createObjectURL(item.blob));
        } else {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
  } catch (err) {
    return null;
  }
}

/**
 * Automatically capture a high-quality frame from a video file
 */
export function captureVideoThumbnail(file) {
  return new Promise((resolve) => {
    if (!process.client || !file) {
      resolve('');
      return;
    }

    try {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      const objectUrl = URL.createObjectURL(file);
      video.src = objectUrl;

      // Handle seek and capture
      video.onloadedmetadata = () => {
        // seek to 1 second or 20% of duration
        const targetTime = video.duration > 2 ? Math.min(1.5, video.duration * 0.2) : 0.5;
        video.currentTime = targetTime;
      };

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxDimension = 800;
          let width = video.videoWidth || 640;
          let height = video.videoHeight || 360;

          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, width, height);

          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          URL.revokeObjectURL(objectUrl);
          resolve(dataUrl);
        } catch (err) {
          URL.revokeObjectURL(objectUrl);
          resolve('');
        }
      };

      video.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve('');
      };

      // Fallback timeout in case video fails to fire seeked event
      setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
        resolve('');
      }, 6000);
    } catch (e) {
      resolve('');
    }
  });
}

/**
 * Format bytes to human readable format
 */
export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
