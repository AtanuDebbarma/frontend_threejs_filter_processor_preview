// /utils/filter_utils.ts
// ---------------------- Module-scope cache & helpers ----------------------

import type {RefObject} from 'react';

/**
 * Schedule a delayed clear of the `isApplyingFilter` global zustand state.
 * This function is used to create a "grace period" where the app is applying a filter,
 * and should be called when the app is done applying the filter.
 *
 * If `immediate` is true, the state is cleared immediately, and any pending timeouts are cleared.
 * Otherwise, a timeout is set to clear the state after a minimum of `MIN_APPLY_MS` milliseconds
 * from the time `setIsApplyingFilter(true)` was called (tracked by `applyingStartRef`).
 *
 * The `didSetApplyingRef` ref is used to track whether this instance of `scheduleClearApplying`
 * set the flag, and should be cleared when this instance is done.
 *
 * The `pendingClearRef` ref is used to track and cancel any previously set timeout.
 *
 * @param immediate - whether to clear the state immediately
 * @param didSetApplyingRef - a ref that tracks whether this instance set the `isApplyingFilter` flag
 * @param pendingClearRef - a ref that tracks and cancels any previously set timeout
 * @param setIsApplyingFilter - a function that sets the `isApplyingFilter` flag
 * @param applyingStartRef - a ref that tracks the time `setIsApplyingFilter(true)` was called
 */
export const scheduleClearApplying = (
  immediate = false,
  didSetApplyingRef: RefObject<boolean>,
  pendingClearRef: RefObject<number | null>,
  setIsApplyingFilter: (loading: boolean) => Promise<void>,
  applyingStartRef: RefObject<number | null>,
) => {
  const MIN_APPLY_MS = 200;

  // only clear if this instance set the flag
  if (!didSetApplyingRef.current) return;

  // cancel any previous pending timeout
  if (pendingClearRef.current) {
    window.clearTimeout(pendingClearRef.current);
    pendingClearRef.current = null;
  }

  if (immediate) {
    // clear immediately (used on unmount / hard error)
    setIsApplyingFilter(false).catch(() => {});
    didSetApplyingRef.current = false;
    applyingStartRef.current = null;
    return;
  }

  const start = applyingStartRef.current ?? 0;
  const elapsed = Date.now() - start;
  const remaining = Math.max(0, MIN_APPLY_MS - elapsed);

  if (remaining === 0) {
    setIsApplyingFilter(false).catch(() => {});
    didSetApplyingRef.current = false;
    applyingStartRef.current = null;
  } else {
    pendingClearRef.current = window.setTimeout(() => {
      setIsApplyingFilter(false).catch(() => {});
      didSetApplyingRef.current = false;
      applyingStartRef.current = null;
      pendingClearRef.current = null;
    }, remaining);
  }
};

/**
 * Ensures that an image is fully loaded and ready to be used.
 * Handles data:, blob:, and http(s) sources.
 * @param {string} uri - The image URI to load.
 * @returns {Promise<HTMLImageElement>} - A promise that resolves with the fully loaded image element.
 */
export async function ensureImageReady(uri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    const cleanup = () => {
      img.onload = null;
      img.onerror = null;
    };

    img.onload = () => {
      cleanup();
      console.log(
        `✅ Image loaded: ${img.width}x${img.height}, src: ${uri.slice(0, 60)}...`,
      );
      resolve(img);
    };

    img.onerror = e => {
      cleanup();
      console.error(`❌ Image load failed for ${uri.slice(0, 60)}...`, e);
      reject(e);
    };

    // Only set crossOrigin for non-data URIs
    if (!uri.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }

    img.src = uri;
  });
}

/**
 * Ensures that a video is fully loaded and ready to be used.
 * Handles data:, blob:, and http(s) sources.
 * @param {string} uri - The video URI to load.
 * @returns {Promise<HTMLVideoElement>} - A promise that resolves with the fully loaded video element.
 */
export async function ensureVideoReady(uri: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');

    video.autoplay = false;
    video.muted = false;
    video.playsInline = true;
    video.preload = 'auto';

    // Only set crossOrigin for non-data URIs
    if (!uri.startsWith('data:')) {
      video.crossOrigin = 'anonymous';
    }

    const cleanup = () => {
      video.removeEventListener('canplaythrough', onReady);
      video.removeEventListener('loadeddata', onReady);
      video.removeEventListener('error', onError);
    };

    const onReady = () => {
      cleanup();
      console.log(
        `✅ Video loaded: ${video.videoWidth}x${video.videoHeight}, src: ${uri.slice(
          0,
          60,
        )}...`,
      );
      resolve(video);
    };

    const onError = (e: any) => {
      cleanup();
      console.error(`❌ Video load failed for ${uri.slice(0, 60)}...`, e);
      reject(e);
    };

    // Listen to both events for robustness
    video.addEventListener('canplaythrough', onReady, {once: true});
    video.addEventListener('loadeddata', onReady, {once: true});
    video.addEventListener('error', onError, {once: true});

    video.src = uri;
  });
}
