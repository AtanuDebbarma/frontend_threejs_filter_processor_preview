import {
  getVideoThumbnail,
  isDirectVideoSrc,
  resolveVideoElementSrc,
} from '@/features/post/helpers/filter/filter_helper';
import {getExportVideo} from '@/features/post/helpers/canvas/exportVideoRegistry';
import {
  resolveMenuPreviewSeekSeconds,
  seekMenuPreviewVideo,
  snapshotFrameFromVideoElement,
} from '@/features/post/helpers/adjust/videoPlaybackTime';
import {appStore} from '@/store/appStore';
import {rnLogger} from '@/shared/utils/rnLogger';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export type MenuPreviewVideoState = {
  isVideo: boolean;
  photoUri: string | undefined;
  videoSrc: string | undefined;
  posterSrc: string | undefined;
  seekToSeconds: number;
  isLoading: boolean;
  isFrameReady: boolean;
  videoCrossOrigin: '' | 'anonymous' | undefined;
  bindMenuPreviewVideo: (video: HTMLVideoElement | null) => void;
};

/**
 * Unified menu preview for Adjust / Text overlays: photo URI or seek-only video
 * at the last known playback time for `activeIndex`.
 */
export const useMenuPreviewVideo = (
  activeIndex: number,
): MenuPreviewVideoState => {
  const mediaFiles = appStore(state => state.mediaFiles);
  const setVideoPlaybackTime = appStore(state => state.setVideoPlaybackTime);
  const playbackEntry = appStore(
    state => state.videoPlaybackTimeByIndex[activeIndex],
  );

  const activeFile = mediaFiles[activeIndex];
  const isVideo = activeFile?.mediaType === 'video';

  const [videoSrc, setVideoSrc] = useState<string | undefined>();
  const [posterSrc, setPosterSrc] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [isFrameReady, setIsFrameReady] = useState(false);
  const revokeRef = useRef<(() => void) | null>(null);
  const seekCleanupRef = useRef<(() => void) | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);

  const seekToSeconds = useMemo(() => {
    if (!isVideo || !activeFile) return 0;
    return resolveMenuPreviewSeekSeconds(activeIndex, activeFile.id, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, activeFile, isVideo, playbackEntry?.currentTime]);

  const videoCrossOrigin = useMemo((): '' | 'anonymous' | undefined => {
    const uri = activeFile?.uri ?? '';
    if (!uri || isDirectVideoSrc(uri) || uri.startsWith('data:')) {
      return undefined;
    }
    return 'anonymous';
  }, [activeFile?.uri]);

  useLayoutEffect(() => {
    if (!isVideo || !activeFile) return;
    const seconds = resolveMenuPreviewSeekSeconds(
      activeIndex,
      activeFile.id,
      0,
    );
    setVideoPlaybackTime(activeIndex, activeFile.id, seconds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, activeFile?.id, isVideo, setVideoPlaybackTime]);

  const markFrameReady = useCallback(() => {
    setIsFrameReady(true);
  }, []);

  const tryPosterFromExportVideo = useCallback((): boolean => {
    const live = getExportVideo(activeIndex);
    if (!live) return false;
    const snap = snapshotFrameFromVideoElement(live);
    if (!snap) return false;
    setPosterSrc(snap);
    markFrameReady();
    return true;
  }, [activeIndex, markFrameReady]);

  const runSeekOnVideo = useCallback(
    (video: HTMLVideoElement) => {
      seekCleanupRef.current?.();
      seekCleanupRef.current = seekMenuPreviewVideo(
        video,
        seekToSeconds,
        markFrameReady,
      );
    },
    [seekToSeconds, markFrameReady],
  );

  const bindMenuPreviewVideo = useCallback(
    (video: HTMLVideoElement | null) => {
      videoElRef.current = video;
      if (!video || !videoSrc) return;
      runSeekOnVideo(video);
    },
    [videoSrc, runSeekOnVideo],
  );

  useEffect(() => {
    revokeRef.current?.();
    revokeRef.current = null;
    seekCleanupRef.current?.();
    seekCleanupRef.current = null;
    setVideoSrc(undefined);
    setPosterSrc(undefined);
    setIsFrameReady(false);

    if (!isVideo || !activeFile?.uri) {
      setIsLoading(false);
      return;
    }

    if (tryPosterFromExportVideo()) {
      setIsLoading(false);
      return;
    }

    const exportVid = getExportVideo(activeIndex);
    if (exportVid?.src) {
      setVideoSrc(exportVid.src);
      setIsLoading(false);
      return;
    }

    if (isDirectVideoSrc(activeFile.uri)) {
      setVideoSrc(activeFile.uri);
      setIsLoading(false);
      return;
    }

    let mounted = true;
    setIsLoading(true);

    void (async () => {
      try {
        const resolved = await resolveVideoElementSrc(activeFile.uri);
        if (!mounted) {
          resolved.revoke?.();
          return;
        }
        revokeRef.current = resolved.revoke ?? null;
        setVideoSrc(resolved.src);
      } catch (err) {
        rnLogger.componentLog(
          'useMenuPreviewVideo',
          'error',
          `Failed to resolve video src: ${err}`,
        );
        if (mounted && !tryPosterFromExportVideo()) {
          try {
            const thumb = await getVideoThumbnail(
              activeFile.uri,
              activeIndex,
              seekToSeconds,
              1080,
            );
            if (mounted) {
              setPosterSrc(thumb);
              markFrameReady();
            }
          } catch (thumbErr) {
            rnLogger.componentLog(
              'useMenuPreviewVideo',
              'error',
              `Thumbnail fallback failed: ${thumbErr}`,
            );
          }
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
      revokeRef.current?.();
      revokeRef.current = null;
      seekCleanupRef.current?.();
      seekCleanupRef.current = null;
    };
  }, [
    activeFile?.uri,
    activeFile?.id,
    activeIndex,
    isVideo,
    seekToSeconds,
    tryPosterFromExportVideo,
    markFrameReady,
  ]);

  useEffect(() => {
    const video = videoElRef.current;
    if (!video || !videoSrc || posterSrc) return;
    runSeekOnVideo(video);
  }, [videoSrc, seekToSeconds, posterSrc, runSeekOnVideo]);

  useEffect(() => {
    if (!isVideo || isFrameReady || posterSrc || !videoSrc) return;
    const timeoutId = window.setTimeout(() => {
      if (tryPosterFromExportVideo()) return;
      const video = videoElRef.current;
      if (video) {
        const snap = snapshotFrameFromVideoElement(video);
        if (snap) {
          setPosterSrc(snap);
          markFrameReady();
        }
      }
    }, 1200);
    return () => window.clearTimeout(timeoutId);
  }, [
    isVideo,
    isFrameReady,
    posterSrc,
    videoSrc,
    tryPosterFromExportVideo,
    markFrameReady,
  ]);

  return {
    isVideo,
    photoUri: !isVideo ? activeFile?.uri : undefined,
    videoSrc: posterSrc ? undefined : videoSrc,
    posterSrc,
    seekToSeconds,
    isLoading: isVideo && isLoading && !posterSrc,
    isFrameReady: isFrameReady || Boolean(posterSrc),
    videoCrossOrigin,
    bindMenuPreviewVideo,
  };
};
