import {getExportVideo} from '@/helpers/exportVideoRegistry';
import {appStore} from '@/store/appStore';

/** Read stored playback time for a slide (seconds). */
export const getStoredVideoPlaybackTime = (index: number): number => {
  const entry = appStore.getState().videoPlaybackTimeByIndex[index];
  return entry?.currentTime ?? 0;
};

/** Prefer live canvas video time, then zustand, then fallback. */
export const resolveMenuPreviewSeekSeconds = (
  index: number,
  mediaId: string,
  fallback = 0,
): number => {
  const live = getExportVideo(index);
  if (live && Number.isFinite(live.currentTime) && live.currentTime >= 0) {
    return live.currentTime;
  }
  const entry = appStore.getState().videoPlaybackTimeByIndex[index];
  if (entry?.id === mediaId && Number.isFinite(entry.currentTime)) {
    return entry.currentTime;
  }
  return fallback;
};

export const clampVideoSeekTime = (time: number, duration: number): number => {
  const t = Math.max(0, time);
  if (!Number.isFinite(duration) || duration <= 0) {
    return t;
  }
  return Math.min(t, Math.max(0, duration - 0.001));
};

const HAVE_METADATA = 1;
const HAVE_CURRENT_DATA = 2;

/**
 * Seek menu preview <video> and call `onFrameReady` (seeked, already at time, or timeout).
 * iOS/WebView often skips `seeked` when target === 0.
 */
export const seekMenuPreviewVideo = (
  video: HTMLVideoElement,
  seekToSeconds: number,
  onFrameReady: () => void,
): (() => void) => {
  let cancelled = false;
  const finish = (): void => {
    if (!cancelled) {
      onFrameReady();
    }
  };

  const cleanups: Array<() => void> = [];

  const runSeek = (): void => {
    const target = clampVideoSeekTime(seekToSeconds, video.duration);

    if (
      video.readyState >= HAVE_CURRENT_DATA &&
      Math.abs(video.currentTime - target) < 0.05
    ) {
      finish();
      return;
    }

    const timeoutId = window.setTimeout(finish, 600);

    const onSeeked = (): void => {
      window.clearTimeout(timeoutId);
      video.removeEventListener('seeked', onSeeked);
      requestAnimationFrame(() => finish());
    };
    video.addEventListener('seeked', onSeeked);
    cleanups.push(() => {
      window.clearTimeout(timeoutId);
      video.removeEventListener('seeked', onSeeked);
    });

    try {
      video.currentTime = target;
    } catch {
      window.clearTimeout(timeoutId);
      video.removeEventListener('seeked', onSeeked);
      finish();
    }
  };

  if (video.readyState >= HAVE_METADATA) {
    runSeek();
  } else {
    const onMeta = (): void => {
      video.removeEventListener('loadedmetadata', onMeta);
      runSeek();
    };
    video.addEventListener('loadedmetadata', onMeta);
    cleanups.push(() => video.removeEventListener('loadedmetadata', onMeta));
  }

  return () => {
    cancelled = true;
    cleanups.forEach(fn => fn());
  };
};

/** Snapshot current frame from an existing <video> (e.g. canvas player). */
export const snapshotFrameFromVideoElement = (
  video: HTMLVideoElement,
  maxWidth = 1080,
): string | null => {
  if (video.readyState < HAVE_CURRENT_DATA || video.videoWidth <= 0) {
    return null;
  }
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const scale = Math.min(maxWidth / video.videoWidth, 1);
  canvas.width = Math.floor(video.videoWidth * scale);
  canvas.height = Math.floor(video.videoHeight * scale);
  try {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  } catch {
    return null;
  }
};
