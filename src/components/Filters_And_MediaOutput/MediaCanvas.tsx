import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {appStore} from '../../store/appStore';
import {Canvas} from '@react-three/fiber';
import {FilteredMedia} from './FilteredMedia';
import {rnLogger} from '../../utils/rnLogger';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
  faPlay,
  faPause,
  faVolumeXmark,
  faVolumeHigh,
} from '@fortawesome/free-solid-svg-icons';
import ClipLoader from 'react-spinners/ClipLoader';
import {useActiveMediaIndex} from '../../hooks/useActiveMediaIndex';
import {
  useVerifiedMediaFiles,
  type MediaItem,
} from '../../hooks/useVerifiedMediaFiles';

export const MediaCanvas = React.memo(
  ({post}: {post: boolean}): React.JSX.Element => {
    const activeFilter = appStore(state => state.activeFilter);
    const mediaFiles = appStore(state => state.mediaFiles);
    const isApplyingFilter = appStore(state => state.isApplyingFilter);

    const [aspectType, setAspectType] = useState<
      'square' | 'landscape' | 'vertical'
    >('vertical');

    // keep this memo so mapping identity is stable
    const Files = useMemo(() => mediaFiles.map(m => m), [mediaFiles]);

    const mediaList: MediaItem[] = useVerifiedMediaFiles(Files);
    const aspectList = useRef<MediaItem | null>(null);

    //  returns originals with aspect info
    useEffect(() => {
      if (mediaList.length > 0) {
        setAspectType(mediaList[0].aspectType);
        aspectList.current = mediaList[0];
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

    // UPDATED: toggle play/pause with timeout (like RN code)
    const togglePlayForIndex = useCallback(
      async (index: number) => {
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
              'MediaCanvas',
              'error',
              `togglePlayForIndex failed, ${err}`,
            );
            console.error('togglePlayForIndex failed', err);
            setPlayingMap(pm => ({...pm, [index]: false}));
          }
        }, 180);
      },
      [getVideoRef],
    );

    // called when canvas/mesh is tapped (from FilteredMedia)
    const handleTap = useCallback(
      (index: number) => {
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
      [togglePlayForIndex],
    );

    // NEW: Effect to hide playerIconTapped after delay (like RN code)
    useEffect(() => {
      Object.entries(playerIconTappedMap).forEach(([indexStr, tapped]) => {
        if (tapped) {
          const index = parseInt(indexStr);
          const timeout = setTimeout(() => {
            setPlayerIconTappedMap(prev => ({...prev, [index]: false}));
          }, 300); // Same as RN: 300ms

          return () => clearTimeout(timeout);
        }
      });
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
                'MediaCanvas',
                'error',
                `❌ Failed to pause video on unmount, ${e}`,
              );
              console.error('❌ Failed to pause video on unmount', e);
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

        // Clear existing timeout
        if (muteTimeoutRefs.current[index]) {
          clearTimeout(muteTimeoutRefs.current[index]!);
        }

        const willMute = !vid.muted;

        // Execute mute after delay (like RN: 180ms)
        muteTimeoutRefs.current[index] = setTimeout(() => {
          vid.muted = willMute;
          setMutedMap(mm => ({...mm, [index]: vid.muted}));
        }, 180);
      },
      [getVideoRef],
    );

    // attach mute state listeners when refs are available
    useEffect(() => {
      Object.keys(videoRefs.current).forEach(k => {
        const idx = Number(k);
        const ref = videoRefs.current[idx];
        const vid = ref?.current;
        if (!vid) return;

        const onVolumeChange = () =>
          setMutedMap(mm => ({...mm, [idx]: vid.muted}));

        vid.removeEventListener('volumechange', onVolumeChange);
        vid.addEventListener('volumechange', onVolumeChange);
      });
    }, [Files]);
    const {activeIndex, setItemRef} = useActiveMediaIndex<HTMLDivElement>();
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
    }, [Files]);

    if (!post && aspectList.current && activeFilter !== null) {
      return (
        <div className="h-full w-full flex-shrink-0 snap-center overflow-hidden bg-gray-950">
          {aspectList.current && aspectList.current.mediaType === 'video' ? (
            <div
              ref={setItemRef(0)}
              data-index={0}
              className={`relative h-full w-full ${getMediaClasses(aspectType)} overflow-hidden rounded-lg`}>
              {aspectList.current.uri &&
              aspectList.current.width &&
              aspectList.current.height ? (
                <Canvas
                  id={`canvas-${aspectType}`}
                  style={{width: '100%', height: '100%', zIndex: 100}}
                  camera={{position: [0, 0, 5], fov: 50}}
                  gl={{antialias: true, alpha: true}}>
                  <FilteredMedia
                    uri={aspectList.current.uri}
                    isVideo={true}
                    aspectType={aspectType}
                    originalWidth={aspectList.current.width}
                    originalHeight={aspectList.current.height}
                    fit={post ? 'cover' : undefined}
                    videoRef={getVideoRef(0)}
                    handleTap={() => handleTap(0)}
                    muted={mutedMap[0] ?? false}
                  />
                </Canvas>
              ) : (
                <></>
              )}

              {/* UPDATED: Show button logic (like RN code) */}
              {(playerIconTappedMap[0] ||
                !playingMap[0] ||
                showButtonMap[0]) && (
                <button
                  onClick={() => void togglePlayForIndex(0)}
                  className="absolute top-1/2 left-1/2 z-500 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/40 p-4 text-white hover:bg-black/80">
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
                </button>
              )}

              <button
                onClick={() => toggleMuteForIndex(0)}
                className="absolute top-6 left-1/2 z-9999 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white hover:bg-black/80">
                <FontAwesomeIcon
                  icon={mutedMap[0] ? faVolumeXmark : faVolumeHigh}
                  size="lg"
                />
              </button>

              {isApplyingFilter && (
                <div className="absolute top-0 right-0 bottom-0 left-0 flex items-center justify-center">
                  <ClipLoader
                    size={40}
                    color="#FF4800"
                    className="z-1000"
                    cssOverride={{borderWidth: '3.5px'}}
                  />
                </div>
              )}
            </div>
          ) : (
            <div
              dir="ltr"
              className={`relativeh-full w-full ${getMediaClasses(aspectType)} overflow-hidden rounded-lg`}>
              {aspectList.current.uri &&
              aspectList.current.width &&
              aspectList.current.height ? (
                <Canvas
                  id={`canvas-${aspectType}`}
                  style={{width: '100%', height: '100%', zIndex: 100}}
                  camera={{position: [0, 0, 5], fov: 50}}
                  gl={{antialias: true, alpha: true}}>
                  <FilteredMedia
                    uri={aspectList.current.uri}
                    isVideo={false}
                    aspectType={aspectType}
                    originalWidth={aspectList.current.width}
                    originalHeight={aspectList.current.height}
                    fit={post ? 'cover' : undefined}
                  />
                </Canvas>
              ) : (
                <></>
              )}
              {isApplyingFilter && (
                <div className="absolute top-0 right-0 bottom-0 left-0 flex items-center justify-center">
                  <ClipLoader
                    size={40}
                    color="#FF4800"
                    className="z-1000"
                    cssOverride={{borderWidth: '3.5px'}}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      );
    } else if (post && mediaList && mediaList.length && activeFilter !== null) {
      return (
        <>
          {mediaList.map((media, index) => (
            <div
              ref={setItemRef(index)}
              data-index={index}
              key={`media-${index}`}
              className="relative h-full w-full flex-shrink-0 snap-center overflow-hidden rounded-lg border-[0.5px] border-gray-500 bg-gray-950">
              {Files.length > 1 && (
                <div className="absolute top-0 right-0 z-500 mt-2 mr-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#FF4800]">
                  <p className="rounded-full p-1 text-xs text-white">
                    {`${index + 1}/${Files.length}`}
                  </p>
                </div>
              )}
              {media.mediaType === 'video' ? (
                <div
                  className={
                    'relative h-full w-full overflow-hidden rounded-lg object-cover'
                  }>
                  {media.uri && media.width && media.height ? (
                    <Canvas
                      id={`canvas-${index}`}
                      style={{width: '100%', height: '100%', zIndex: 100}}
                      camera={{position: [0, 0, 5], fov: 50}}
                      gl={{antialias: true, alpha: true}}>
                      <FilteredMedia
                        uri={media.uri}
                        isVideo={true}
                        aspectType={aspectType}
                        originalWidth={media.width}
                        originalHeight={media.height}
                        fit={'cover'}
                        videoRef={getVideoRef(index)}
                        handleTap={() => handleTap(index)}
                        muted={mutedMap[index] ?? false}
                      />
                    </Canvas>
                  ) : (
                    <></>
                  )}

                  {/* UPDATED: Show button logic (like RN code) */}
                  {(playerIconTappedMap[index] ||
                    !playingMap[index] ||
                    showButtonMap[index]) && (
                    <button
                      onClick={() => void togglePlayForIndex(index)}
                      className="absolute top-1/2 left-1/2 z-500 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/40 p-4 text-white hover:bg-black/80">
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
                    </button>
                  )}

                  <button
                    onClick={() => toggleMuteForIndex(index)}
                    className="absolute top-6 left-1/2 z-9999 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white hover:bg-black/80">
                    <FontAwesomeIcon
                      icon={mutedMap[index] ? faVolumeXmark : faVolumeHigh}
                      size="lg"
                    />
                  </button>

                  {isApplyingFilter && (
                    <div className="absolute top-0 right-0 bottom-0 left-0 flex items-center justify-center">
                      <ClipLoader
                        size={40}
                        color="#FF4800"
                        className="z-1000"
                        cssOverride={{borderWidth: '3.5px'}}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className={
                    'relative h-full w-full overflow-hidden rounded-lg object-cover'
                  }>
                  {media.uri && media.width && media.height ? (
                    <Canvas
                      id={`canvas-${index}`}
                      style={{width: '100%', height: '100%', zIndex: 100}}
                      camera={{position: [0, 0, 5], fov: 50}}
                      gl={{antialias: true, alpha: true}}>
                      <FilteredMedia
                        uri={media.uri}
                        isVideo={false}
                        aspectType={aspectType}
                        originalWidth={media.width}
                        originalHeight={media.height}
                        fit={'cover'}
                      />
                    </Canvas>
                  ) : (
                    <></>
                  )}
                  {isApplyingFilter && (
                    <div className="absolute top-0 right-0 bottom-0 left-0 flex items-center justify-center">
                      <ClipLoader
                        size={40}
                        color="#FF4800"
                        className="z-1000"
                        cssOverride={{borderWidth: '3.5px'}}
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

    return <></>; // or some fallback UI
  },
);

/*
 * @displayName MediaCanvas
 */
MediaCanvas.displayName = 'MediaCanvas';
