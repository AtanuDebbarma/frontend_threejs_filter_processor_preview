import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {appStore} from '@/store/appStore';
import {rnLogger} from '@/shared/utils/rnLogger';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
  faPlay,
  faPause,
  faVolumeXmark,
  faVolumeHigh,
} from '@fortawesome/free-solid-svg-icons';
import {MediaTagIcon} from './MediaTagIcon';
import {Loader} from '@/shared/components/Loader';
import {useActiveMediaIndex} from '@/features/post/hooks/canvas/useActiveMediaIndex';
import {
  useVerifiedMediaFiles,
  type MediaItem,
} from '@/features/post/hooks/canvas/useVerifiedMediaFiles';
import {trimBase64} from '@/features/post/helpers/canvas/other_helpers';
import {MediaCanvas} from './MediaCanvas';
import type {ExportMode} from '@/features/post/types/exportTypes';
import {isEditorMenuRoot} from '@/features/post/bridge/helpers/performEditorBack';
import {scheduleSetTagMode} from '@/features/post/helpers/menuChrome/menuChromeNavigation';
import {
  pauseAllPreviewVideos,
  shouldPausePreviewVideosForOverlay,
} from '@/features/post/helpers/export/exportPreviewControl';
import {isPostLayoutMode} from '@/features/post/types/exportTypes';

export const MediaCanvasContainer = ({
  exportMode,
}: {
  exportMode: ExportMode;
}): React.ReactNode => {
  // const activeFilter = appStore(state => state.activeFilter);
  const mediaFiles = appStore(state => state.mediaFiles);
  const isApplyingFilter = appStore(state => state.isApplyingFilter);
  const activeButton = appStore(state => state.activeButton);
  const storeActiveIndex = appStore(state => state.activeIndex);
  const setActiveIndex = appStore(state => state.setActiveIndex);
  /** Default BottomBar (`mainMenu` / `null`) still allows canvas play/pause. */
  const subMenuBlocksCanvasPlay = useMemo(
    () => !isEditorMenuRoot(activeButton),
    [activeButton],
  );
  const tagMode = appStore(state => state.tagMode);
  const setTagMode = appStore(state => state.setTagMode);
  const overlayPausesVideo = useMemo(
    () => shouldPausePreviewVideosForOverlay(activeButton, tagMode),
    [activeButton, tagMode],
  );
  const globalMutedState = appStore(state => state.videoMutedState);
  const setVideoMutedState = appStore(state => state.setVideoMutedState);
  const isSaveExporting = appStore(state => state.isSaveExporting);
  const isPostExporting = appStore(state => state.isPostExporting);

  const [initialized, setInitialized] = useState(false);
  const [aspectType, setAspectType] = useState<
    'square' | 'landscape' | 'vertical'
  >('vertical');

  const mediaList: MediaItem[] = useVerifiedMediaFiles(mediaFiles);

  // console.log('🔍 MediaCanvas conditions:', {
  //   post,
  //   mediaListExists: !!mediaList,
  //   mediaListLength: mediaList?.length,
  //   activeFilterExists: !!activeFilter,
  //   activeFilterName: activeFilter?.name,
  //   allConditionsMet: post && mediaList && mediaList.length,
  // });

  useEffect(() => {
    if (mediaList.length > 0) {
      setAspectType(mediaList[0].aspectType);
      setInitialized(true);
      const trimmed = trimBase64({files: mediaList});
      rnLogger.componentLog(
        'MediaCanvas',
        'log',
        `✅ mediaList Loaded: ${trimmed}`,
      );
    }
  }, [mediaList]);

  // per-media state and refs
  const videoRefs = useRef<
    Record<number, React.RefObject<HTMLVideoElement | null>>
  >({});
  const hideTimeouts = useRef<
    Record<number, ReturnType<typeof setTimeout> | null>
  >({});

  // NEW: Timeout refs for play/mute button actions (like RN code)
  const playTimeoutRefs = useRef<
    Record<number, ReturnType<typeof setTimeout> | null>
  >({});
  const muteTimeoutRefs = useRef<
    Record<number, ReturnType<typeof setTimeout> | null>
  >({});

  const [playingMap, setPlayingMap] = useState<Record<number, boolean>>({});
  const [mutedMap, setMutedMap] = useState<Record<number, boolean>>({});
  const [showButtonMap, setShowButtonMap] = useState<Record<number, boolean>>(
    {},
  );

  // NEW: Icon state tracking (like RN code)
  const [playerIconTappedMap, setPlayerIconTappedMap] = useState<
    Record<number, boolean>
  >({});
  const [iconToShowMap, setIconToShowMap] = useState<
    Record<number, 'play' | 'pause'>
  >({});

  // stable getter for per-index video refs
  const getVideoRef = useCallback((index: number) => {
    if (!videoRefs.current[index]) {
      videoRefs.current[index] = React.createRef<HTMLVideoElement | null>();
    }
    return videoRefs.current[index];
  }, []);

  // stable utility for classes
  const getMediaClasses = useCallback(
    (aspectType: 'square' | 'landscape' | 'vertical') => {
      switch (aspectType) {
        case 'square':
          return 'aspect-square object-contain';
        case 'landscape':
          return 'object-contain';
        case 'vertical':
          return 'object-fill';
        default:
          return 'object-contain';
      }
    },
    [],
  );

  useEffect(() => {
    const initialMutedMap: Record<number, boolean> = {};

    Object.entries(globalMutedState).forEach(([idx, {muted}]) => {
      initialMutedMap[Number(idx)] = muted;
    });

    setMutedMap(initialMutedMap);
  }, [globalMutedState]);

  // UPDATED: toggle play/pause with timeout (like RN code)
  const togglePlayForIndex = useCallback(
    async (index: number) => {
      if (isSaveExporting || isPostExporting) return;
      const ref = getVideoRef(index);
      const vid = ref.current;
      if (!vid) return;

      // Clear existing timeout
      if (playTimeoutRefs.current[index]) {
        clearTimeout(playTimeoutRefs.current[index]!);
      }

      const willPlay = vid.paused || vid.ended;

      // Set icon state immediately
      setIconToShowMap(prev => ({
        ...prev,
        [index]: willPlay ? 'play' : 'pause',
      }));
      setPlayerIconTappedMap(prev => ({...prev, [index]: true}));

      // Execute play/pause after delay (like RN: 180ms)
      playTimeoutRefs.current[index] = setTimeout(async () => {
        try {
          if (willPlay) {
            const p = vid.play();
            if (p && typeof (p as Promise<void>).then === 'function') {
              await p;
            }
            setPlayingMap(pm => ({
              ...pm,
              [index]: !vid.paused && !vid.ended,
            }));
          } else {
            vid.pause();
            setPlayingMap(pm => ({...pm, [index]: false}));
          }
        } catch (err) {
          rnLogger.componentLog(
            'MediaCanvasContainer',
            'error',
            `togglePlayForIndex failed: ${err}`,
          );
          setPlayingMap(pm => ({...pm, [index]: false}));
        }
      }, 180);
    },
    [getVideoRef, isSaveExporting, isPostExporting],
  );

  // called when canvas/mesh is tapped (from FilteredMedia)
  const handleTap = useCallback(
    (index: number) => {
      if (subMenuBlocksCanvasPlay) return;
      void togglePlayForIndex(index);

      // show per-index button (existing logic)
      setShowButtonMap(m => ({...m, [index]: true}));

      // clear previous timeout
      if (hideTimeouts.current[index]) {
        clearTimeout(
          hideTimeouts.current[index] as ReturnType<typeof setTimeout>,
        );
      }

      hideTimeouts.current[index] = setTimeout(() => {
        setShowButtonMap(m => ({...m, [index]: false}));
        hideTimeouts.current[index] = null;
      }, 1000);
    },
    [togglePlayForIndex, subMenuBlocksCanvasPlay],
  );

  // Hide playerIconTapped after delay (like RN code)
  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    Object.entries(playerIconTappedMap).forEach(([indexStr, tapped]) => {
      if (tapped) {
        const index = parseInt(indexStr, 10);
        timeouts.push(
          setTimeout(() => {
            setPlayerIconTappedMap(prev => ({...prev, [index]: false}));
          }, 300),
        );
      }
    });
    return () => {
      timeouts.forEach(t => clearTimeout(t));
    };
  }, [playerIconTappedMap]);

  // cleanup on unmount — read refs inside cleanup; don't put refs in deps
  useEffect(() => {
    const timeouts = hideTimeouts.current;
    const videoRefsCurrent = videoRefs.current;
    const playTimeouts = playTimeoutRefs.current;
    const muteTimeouts = muteTimeoutRefs.current;

    return () => {
      // Clear all timeouts
      Object.values(timeouts).forEach(t => {
        if (t) clearTimeout(t);
      });
      Object.values(playTimeouts).forEach(t => {
        if (t) clearTimeout(t);
      });
      Object.values(muteTimeouts).forEach(t => {
        if (t) clearTimeout(t);
      });

      // cleanup video elements
      Object.values(videoRefsCurrent).forEach(ref => {
        const vid = ref?.current;
        if (vid) {
          try {
            vid.pause();
          } catch (e) {
            rnLogger.componentLog(
              'MediaCanvasContainer',
              'error',
              `Failed to pause video on unmount: ${e}`,
            );
          }
        }
      });
    };
  }, []);

  // UPDATED: toggle mute with timeout (like RN code)
  const toggleMuteForIndex = useCallback(
    (index: number) => {
      const ref = getVideoRef(index);
      const vid = ref.current;
      if (!vid) return;

      if (muteTimeoutRefs.current[index]) {
        clearTimeout(muteTimeoutRefs.current[index]!);
      }

      const willMute = !vid.muted;
      const media = mediaList[index];
      if (!media) return;
      if (vid.muted === willMute) return;

      muteTimeoutRefs.current[index] = setTimeout(() => {
        vid.muted = willMute;

        // Update local state
        setMutedMap(mm => ({...mm, [index]: vid.muted}));

        // Update global Zustand state
        setVideoMutedState(index, media.id, vid.muted);
      }, 180);
    },
    [getVideoRef, setVideoMutedState, mediaList],
  );

  // attach mute state listeners when refs are available
  useEffect(() => {
    if (!mediaList.length) return;
    Object.keys(videoRefs.current).forEach(k => {
      const idx = Number(k);
      const ref = videoRefs.current[idx];
      const vid = ref?.current;
      if (!vid) return;

      const onVolumeChange = () => {
        setMutedMap(mm => ({...mm, [idx]: vid.muted}));
        setVideoMutedState(idx, mediaList[idx].id, vid.muted);
      };

      vid.removeEventListener('volumechange', onVolumeChange);
      vid.addEventListener('volumechange', onVolumeChange);
    });
  }, [mediaList, setVideoMutedState]);

  const {activeIndex, setItemRef} = useActiveMediaIndex<HTMLDivElement>();

  // Adjust / text / tag overlays: pause playback and cancel pending play toggles.
  useEffect(() => {
    if (!overlayPausesVideo) {
      return;
    }

    Object.values(playTimeoutRefs.current).forEach(timeout => {
      if (timeout) {
        clearTimeout(timeout);
      }
    });
    playTimeoutRefs.current = {};

    Object.keys(videoRefs.current).forEach(k => {
      const idx = Number(k);
      const vid = videoRefs.current[idx]?.current;
      if (!vid) {
        return;
      }
      if (!vid.paused) {
        try {
          vid.pause();
        } catch (e) {
          rnLogger.componentLog(
            'MediaCanvasContainer',
            'error',
            `Failed to pause video for overlay menu: ${e}`,
          );
        }
      }
    });

    pauseAllPreviewVideos();

    setPlayingMap(pm => {
      let changed = false;
      const next = {...pm};
      Object.keys(videoRefs.current).forEach(k => {
        const idx = Number(k);
        if (next[idx]) {
          next[idx] = false;
          changed = true;
        }
      });
      return changed ? next : pm;
    });
  }, [overlayPausesVideo]);

  // Pause non-active videos when activeIndex changes
  useEffect(() => {
    Object.keys(videoRefs.current).forEach(k => {
      const idx = Number(k);
      const ref = videoRefs.current[idx];
      const vid = ref?.current;
      if (!vid) return;

      if (idx !== activeIndex && !vid.paused) {
        vid.pause();
        setPlayingMap(pm => ({...pm, [idx]: false}));
      }
    });
  }, [activeIndex]);

  // attempt to attach play/pause listeners to discovered videos so UI stays in sync
  useEffect(() => {
    if (!mediaList.length) return;
    Object.keys(videoRefs.current).forEach(k => {
      const idx = Number(k);
      const ref = videoRefs.current[idx];
      const vid = ref?.current;
      if (!vid) return;

      const onPlay = () => setPlayingMap(pm => ({...pm, [idx]: true}));
      const onPause = () => setPlayingMap(pm => ({...pm, [idx]: false}));

      vid.removeEventListener('play', onPlay);
      vid.removeEventListener('pause', onPause);

      vid.addEventListener('play', onPlay);
      vid.addEventListener('pause', onPause);
    });
  }, [mediaList]);

  useEffect(() => {
    if (
      activeIndex !== null &&
      mediaList[activeIndex] &&
      storeActiveIndex !== activeIndex
    ) {
      setActiveIndex(activeIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, mediaList, storeActiveIndex]);

  // Video slides cannot use position tags — exit tag mode when carousel lands on video.
  useEffect(() => {
    if (activeIndex === null) return;
    const media = mediaList[activeIndex];
    if (media?.mediaType === 'video') {
      setTagMode(false);
    }
  }, [activeIndex, mediaList, setTagMode]);

  const showApplyingOnSlide = (slideIndex: number) =>
    isApplyingFilter && storeActiveIndex === slideIndex;

  // Early return for loading state - kept as is
  if (!initialized || !mediaList.length) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader
          size={40}
          color="#FF4800"
          borderWidth={3.5}
          className="z-1000"
        />
      </div>
    );
  } else if (
    !isPostLayoutMode(exportMode) &&
    mediaList[0] &&
    mediaList.length
  ) {
    return (
      <div className="h-full w-full shrink-0 snap-center overflow-hidden bg-gray-950">
        {mediaList[0].mediaType === 'video' ? (
          <div
            ref={setItemRef(0)}
            data-index={0}
            className={`relative h-full w-full ${getMediaClasses(aspectType)} overflow-hidden rounded-lg`}>
            {mediaList[0].uri && mediaList[0].width && mediaList[0].height && (
              <MediaCanvas
                id={mediaList[0].id}
                video={true}
                exportMode={exportMode}
                mediaList={mediaList}
                aspectType={aspectType}
                getVideoRef={getVideoRef}
                handleTap={handleTap}
                mutedMap={mutedMap}
                index={0}
              />
            )}
            <MediaTagIcon
              mediaIndex={0}
              mediaList={mediaList}
              onTagPress={() => scheduleSetTagMode(true)}
            />
            {/* UPDATED: Show button logic (like RN code) */}
            {(playerIconTappedMap[0] || !playingMap[0] || showButtonMap[0]) && (
              <div className="pointer-events-none absolute top-1/2 left-1/2 z-500 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/50 p-4 text-white hover:bg-black/80">
                <FontAwesomeIcon
                  icon={
                    !playingMap[0]
                      ? faPlay
                      : iconToShowMap[0] === 'play'
                        ? faPlay
                        : faPause
                  }
                  size="lg"
                />
              </div>
            )}

            <button
              onClick={() => toggleMuteForIndex(0)}
              className="absolute top-6 left-1/2 z-500 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white shadow-sm transition-opacity duration-180 hover:bg-black/80 active:opacity-50">
              <FontAwesomeIcon
                icon={mutedMap[0] ? faVolumeXmark : faVolumeHigh}
                size="lg"
              />
            </button>

            {showApplyingOnSlide(0) && (
              <div className="absolute top-0 right-0 bottom-0 left-0 flex items-center justify-center">
                <Loader
                  size={40}
                  color="#FF4800"
                  borderWidth={3.5}
                  className="z-1000"
                />
              </div>
            )}
          </div>
        ) : (
          <div
            className={`relativeh-full w-full ${getMediaClasses(aspectType)} overflow-hidden rounded-lg`}>
            {mediaList[0].uri && mediaList[0].width && mediaList[0].height && (
              <MediaCanvas
                id={mediaList[0].id}
                video={false}
                exportMode={exportMode}
                mediaList={mediaList}
                aspectType={aspectType}
                getVideoRef={undefined}
                handleTap={undefined}
                mutedMap={undefined}
                index={0}
              />
            )}
            <MediaTagIcon
              mediaIndex={0}
              mediaList={mediaList}
              onTagPress={() => scheduleSetTagMode(true)}
            />

            {showApplyingOnSlide(0) && (
              <div className="absolute top-0 right-0 bottom-0 left-0 flex items-center justify-center">
                <Loader
                  size={40}
                  color="#FF4800"
                  borderWidth={3.5}
                  className="z-1000"
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  } else if (isPostLayoutMode(exportMode) && mediaList && mediaList.length) {
    return (
      <>
        {mediaList.map((media, index) => (
          <div
            ref={setItemRef(index)}
            data-index={index}
            key={`media-${index}`}
            className="relative h-full w-full shrink-0 snap-center overflow-hidden rounded-lg border-[0.5px] border-gray-500 bg-gray-950">
            {mediaFiles.length > 1 && (
              <div className="absolute top-0 right-0 z-500 mt-2 mr-3 flex h-6 w-6 items-center justify-center rounded-full bg-[#FF4800]">
                <p className="rounded-full p-0.5 text-[10px] text-white">
                  {`${index + 1}/${mediaList.length}`}
                </p>
              </div>
            )}
            {media.mediaType === 'video' ? (
              <div
                className={
                  'relative h-full w-full overflow-hidden rounded-lg object-cover'
                }>
                {media.uri && media.width && media.height && (
                  <MediaCanvas
                    id={media.id}
                    video={true}
                    exportMode={exportMode}
                    mediaList={undefined}
                    aspectType={aspectType}
                    getVideoRef={getVideoRef}
                    handleTap={handleTap}
                    mutedMap={mutedMap}
                    media={media}
                    index={index}
                  />
                )}

                <MediaTagIcon
                  mediaIndex={index}
                  mediaList={mediaList}
                  onTagPress={() => scheduleSetTagMode(true)}
                />

                {/* UPDATED: Show button logic (like RN code) */}
                {(playerIconTappedMap[index] ||
                  !playingMap[index] ||
                  showButtonMap[index]) && (
                  <div className="pointer-events-none absolute top-1/2 left-1/2 z-500 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/50 p-4 text-white hover:bg-black/80">
                    <FontAwesomeIcon
                      icon={
                        !playingMap[index]
                          ? faPlay
                          : iconToShowMap[index] === 'play'
                            ? faPlay
                            : faPause
                      }
                      size="lg"
                    />
                  </div>
                )}

                <button
                  onClick={() => toggleMuteForIndex(index)}
                  className="absolute top-6 left-1/2 z-1000 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white shadow-sm transition-opacity duration-180 hover:bg-black/80 active:opacity-50">
                  <FontAwesomeIcon
                    icon={mutedMap[index] ? faVolumeXmark : faVolumeHigh}
                    size="lg"
                  />
                </button>

                {showApplyingOnSlide(index) && (
                  <div className="absolute top-0 right-0 bottom-0 left-0 flex items-center justify-center">
                    <Loader
                      size={40}
                      color="#FF4800"
                      borderWidth={3.5}
                      className="z-1000"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div
                className={
                  'relative h-full w-full overflow-hidden rounded-lg object-cover'
                }>
                {media.uri && media.width && media.height && (
                  <MediaCanvas
                    id={media.id}
                    video={false}
                    exportMode={exportMode}
                    mediaList={undefined}
                    aspectType={aspectType}
                    getVideoRef={undefined}
                    handleTap={undefined}
                    mutedMap={undefined}
                    media={media}
                    index={index}
                  />
                )}
                <MediaTagIcon
                  mediaIndex={index}
                  mediaList={mediaList}
                  onTagPress={() => scheduleSetTagMode(true)}
                />
                {showApplyingOnSlide(index) && (
                  <div className="absolute top-0 right-0 bottom-0 left-0 flex items-center justify-center">
                    <Loader
                      size={40}
                      color="#FF4800"
                      borderWidth={3.5}
                      className="z-1000"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </>
    );
  }

  return (
    <div style={{color: 'red'}}>
      DEBUG: MediaCanvas rendered but branch skipped
    </div>
  );
};

/*
 * @displayName MediaCanvasContainer
 */
MediaCanvasContainer.displayName = 'MediaCanvasContianer';
