import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {appStore} from '../../store/appStore';
import {Canvas} from '@react-three/fiber';
import FilteredMedia from './FilteredMedia';
import {useMediaFilesWithOriginals} from '../../hooks/useMediaFilesWithOriginals';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faPlay, faPause} from '@fortawesome/free-solid-svg-icons';
import ClipLoader from 'react-spinners/ClipLoader';
import {RenderTexts} from './RenderTexts';

const MediaComponent = ({post}: {post: boolean}): React.JSX.Element => {
  const activeFilter = appStore(state => state.activeFilter);
  const activeButton = appStore(state => state.activeButton);
  const mediaFiles = appStore(state => state.mediaFiles);
  const isApplyingFilter = appStore(state => state.isApplyingFilter);

  // keep this memo so mapping identity is stable
  const files = useMemo(() => mediaFiles.map(m => m), [mediaFiles]);

  // new hook (you had this) — returns originals with aspect info
  const originals = useMediaFilesWithOriginals(files);
  const aspectList = originals.length ? originals[0] : null;

  // per-media state and refs
  const videoRefs = useRef<
    Record<number, React.RefObject<HTMLVideoElement | null>>
  >({});
  const hideTimeouts = useRef<
    Record<number, ReturnType<typeof setTimeout> | null>
  >({});
  const [playingMap, setPlayingMap] = useState<Record<number, boolean>>({});
  const [showButtonMap, setShowButtonMap] = useState<Record<number, boolean>>(
    {},
  );

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

  // toggle play/pause for a specific media index
  const togglePlayForIndex = useCallback(
    async (index: number) => {
      const ref = getVideoRef(index);
      const vid = ref.current;
      if (!vid) return;

      try {
        if (vid.paused || vid.ended) {
          const p = vid.play();
          if (p && typeof (p as Promise<void>).then === 'function') {
            await p;
          }
          // note: video .paused is updated by the browser after play resolves;
          // setPlayingMap based on actual state read from element
          setPlayingMap(pm => ({...pm, [index]: !vid.paused && !vid.ended}));
        } else {
          vid.pause();
          setPlayingMap(pm => ({...pm, [index]: false}));
        }
      } catch (err) {
        console.warn('togglePlayForIndex failed', err);
        setPlayingMap(pm => ({...pm, [index]: false}));
      }
    },
    [getVideoRef],
  );

  // called when canvas/mesh is tapped (from FilteredMedia)
  const handleTap = useCallback(
    (index: number) => {
      void togglePlayForIndex(index);

      // show per-index button
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

  // cleanup on unmount — read refs inside cleanup; don't put refs in deps
  useEffect(() => {
    const timeouts = hideTimeouts.current;
    const videoRefsCurrent = videoRefs.current;

    return () => {
      Object.values(timeouts).forEach(t => {
        if (t) clearTimeout(t);
      });
      // also try to cleanup video elements if any left
      Object.values(videoRefsCurrent).forEach(ref => {
        const vid = ref?.current;
        if (vid) {
          try {
            vid.pause();
          } catch (e) {
            // ignore
          }
        }
      });
    };
  }, []);

  // attempt to attach play/pause listeners to discovered videos so UI stays in sync
  useEffect(() => {
    // loop all known refs and attach listeners if there is a video element present
    Object.keys(videoRefs.current).forEach(k => {
      const idx = Number(k);
      const ref = videoRefs.current[idx];
      const vid = ref?.current;
      if (!vid) return;

      const onPlay = () => setPlayingMap(pm => ({...pm, [idx]: true}));
      const onPause = () => setPlayingMap(pm => ({...pm, [idx]: false}));

      // remove first (harmless) then add — keeps identity stable per effect run
      vid.removeEventListener('play', onPlay);
      vid.removeEventListener('pause', onPause);

      vid.addEventListener('play', onPlay);
      vid.addEventListener('pause', onPause);
    });
    // run whenever originals changes (new FilteredMedia mounted)
  }, [originals]);

  if (!post && aspectList && activeFilter !== null) {
    return (
      <div className="h-full w-full flex-shrink-0 snap-center overflow-hidden bg-gray-950">
        {aspectList.isVideo ? (
          <div
            dir="ltr"
            className={`relative h-full w-full ${getMediaClasses(aspectList.aspectType)}} overflow-hidden rounded-lg`}>
            {activeButton === 'text' && <RenderTexts mediaIndex={0} />}
            <Canvas
              id={`canvas-${aspectList.aspectType}`}
              className="h-full w-full"
              camera={{position: [0, 0, 5], fov: 50}}
              gl={{antialias: true, alpha: true}}>
              <FilteredMedia
                url={aspectList.url}
                isVideo={aspectList.isVideo}
                aspectType={aspectList.aspectType}
                originalWidth={aspectList.width}
                originalHeight={aspectList.height}
                fit={post ? 'cover' : undefined}
                videoRef={getVideoRef(0)}
                handleTap={() => handleTap(0)}
              />
            </Canvas>
            {isApplyingFilter && (
              <div className="absolute top-0 right-0 bottom-0 left-0 flex items-center justify-center">
                <ClipLoader
                  size={40}
                  color="#FF4800"
                  className="z-10"
                  cssOverride={{borderWidth: '3.5px'}}
                />
              </div>
            )}
          </div>
        ) : (
          <div
            dir="ltr"
            className={`relativeh-full w-full ${getMediaClasses(aspectList.aspectType)} overflow-hidden rounded-lg`}>
            {activeButton === 'text' && <RenderTexts mediaIndex={0} />}
            <Canvas
              id={`canvas-${aspectList.aspectType}`}
              className="h-full w-full"
              camera={{position: [0, 0, 5], fov: 50}}
              gl={{antialias: true, alpha: true}}>
              <FilteredMedia
                url={aspectList.url}
                isVideo={aspectList.isVideo}
                aspectType={aspectList.aspectType}
                originalWidth={aspectList.width}
                originalHeight={aspectList.height}
                fit={post ? 'cover' : undefined}
              />
            </Canvas>
            {isApplyingFilter && (
              <div className="absolute top-0 right-0 bottom-0 left-0 flex items-center justify-center">
                <ClipLoader
                  size={40}
                  color="#FF4800"
                  className="z-10"
                  cssOverride={{borderWidth: '3.5px'}}
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  } else if (post && originals && originals.length && activeFilter !== null) {
    return (
      <>
        {originals.map((media, index) => (
          <div
            key={`media-${index}`}
            className="relative h-full w-full flex-shrink-0 snap-center overflow-hidden rounded-lg border-[0.5px] border-gray-500 bg-gray-950">
            {/*mainMapWrapper*/}
            {originals.length > 1 && (
              <div className="absolute top-0 right-0 z-10 mt-2 mr-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#FF4800]/70">
                <p className="rounded-full p-1 text-xs text-white">
                  {`${index + 1}/${originals.length}`}
                </p>
              </div>
            )}
            {media.isVideo ? (
              <div
                className={
                  'relative h-full w-full overflow-hidden rounded-lg object-cover'
                }>
                {(showButtonMap[index] || !playingMap[index]) && (
                  <button
                    onClick={() => void togglePlayForIndex(index)}
                    className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/40 p-4 text-white hover:bg-black/80">
                    <FontAwesomeIcon
                      icon={playingMap[index] ? faPause : faPlay}
                      size="lg"
                    />
                  </button>
                )}
                {activeButton === 'text' && <RenderTexts mediaIndex={index} />}
                <Canvas
                  id={`canvas-${index}`}
                  style={{width: '100%', height: '100%'}}
                  camera={{position: [0, 0, 5], fov: 50}}
                  gl={{antialias: true, alpha: true}}>
                  <FilteredMedia
                    url={media.url}
                    isVideo={media.isVideo}
                    aspectType={media.aspectType}
                    originalWidth={media.width}
                    originalHeight={media.height}
                    fit={'cover'} // for your post === true you wanted object-fit: cover
                    videoRef={getVideoRef(index)}
                    handleTap={() => handleTap(index)}
                  />
                </Canvas>
                {isApplyingFilter && (
                  <div className="absolute top-0 right-0 bottom-0 left-0 flex items-center justify-center">
                    <ClipLoader
                      size={40}
                      color="#FF4800"
                      className="z-10"
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
                {activeButton === 'text' && <RenderTexts mediaIndex={index} />}
                <Canvas
                  id={`canvas-${index}`}
                  style={{width: '100%', height: '100%'}}
                  camera={{position: [0, 0, 5], fov: 50}}
                  gl={{antialias: true, alpha: true}}>
                  <FilteredMedia
                    url={media.url}
                    isVideo={media.isVideo}
                    aspectType={media.aspectType}
                    originalWidth={media.width}
                    originalHeight={media.height}
                    fit={'cover'} // for your post === true you wanted object-fit: cover
                  />
                </Canvas>
                {isApplyingFilter && (
                  <div className="absolute top-0 right-0 bottom-0 left-0 flex items-center justify-center">
                    <ClipLoader
                      size={40}
                      color="#FF4800"
                      className="z-10"
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
};

export default MediaComponent;
