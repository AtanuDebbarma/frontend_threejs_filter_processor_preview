// src/helpers/filter_helper.ts
import {rnLogger} from '../utils/rnLogger';

/** URIs the <video> element can load without fetch (RN hydration uses file:// for videos). */
const isDirectVideoSrc = (uri: string): boolean =>
  uri.startsWith('blob:') ||
  uri.startsWith('data:') ||
  uri.startsWith('file:') ||
  uri.startsWith('content:') ||
  uri.startsWith('ph:');

/**
 * Get (or return cached) video thumbnail for a given media index.
 * Caches the generated thumbnail (dataURL) in thumbCache Map.
 *
 * @param uri - Video file URI
 * @param index - Media index (used as cache key)
 * @param seekTo - Seconds to seek for frame (default 0.5)
 * @param maxWidth - Max width of thumbnail (default 320)
 * @param thumbCache - Map<number,string> of cached thumbnails
 * @param setThumbCache - Store updater: (index, dataUrl) => void
 */
export const getVideoThumbnail = async (
  uri: string,
  index: number,
  seekTo = 0.5,
  maxWidth = 320,
  thumbCache?: Map<number, string>,
  setThumbCache?: (idx: number, dataUrl: string) => void,
): Promise<string> => {
  // ✅ Early return if already cached
  if (thumbCache?.has(index)) {
    return thumbCache.get(index)!;
  }

  const video = document.createElement('video');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  let sourceUri = uri;
  let createdObjectUrl: string | null = null;

  try {
    // http(s) / localhost only — fetch → blob URL. file:// must not use fetch (fails in WebView).
    if (!isDirectVideoSrc(uri)) {
      const res = await fetch(uri);
      if (!res.ok) {
        throw new Error(`Failed to fetch video: ${res.status}`);
      }
      const blob = await res.blob();
      sourceUri = URL.createObjectURL(blob);
      createdObjectUrl = sourceUri;
    }

    video.src = sourceUri;
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    // Wait for metadata
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('Error loading video metadata'));
    });

    // Safe seek
    const safeSeek = Math.min(seekTo, video.duration || seekTo);
    video.currentTime = Math.min(
      safeSeek,
      Math.max(0, (video.duration || safeSeek) - 0.001),
    );

    // Wait for frame to be decoded
    await new Promise<void>((resolve, reject) => {
      video.onseeked = () => {
        requestAnimationFrame(() => {
          setTimeout(resolve, 100);
        });
      };
      video.onerror = () => reject(new Error('Error seeking video'));
    });
    // Draw frame to canvas
    const scale = Math.min(maxWidth / video.videoWidth, 1);
    canvas.width = Math.floor(video.videoWidth * scale);
    canvas.height = Math.floor(video.videoHeight * scale);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const thumbnail = canvas.toDataURL('image/jpeg', 0.8);

    // ✅ Save to cache
    setThumbCache?.(index, thumbnail);

    return thumbnail;
  } catch (err) {
    rnLogger.error?.('getVideoThumbnail', err);
    throw err;
  } finally {
    if (createdObjectUrl) URL.revokeObjectURL(createdObjectUrl);
    video.src = '';
  }
};
