import React, {useEffect, useMemo, useState} from 'react';
import {appStore} from '../../store/appStore';
import {MediaCanvasContainer} from './MediaCanvasContainer';
import {useElementSize} from '../../hooks/useElementSize';
import useWindowSize from '../../hooks/findWindowSize';
import {faXmark, faPlus} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';

const MediaComponent = ({post}: {post: boolean}): React.JSX.Element => {
  const setActiveButton = appStore(state => state.setActiveButton);
  const mediaFiles = appStore(state => state.mediaFiles);

  const windowSize = useWindowSize();

  const [mediaSizes, setMediaSizes] = useState<Record<
    string,
    {width: number; height: number}
  > | null>(null);

  // derived flags (cheap, but memoizing clarifies intent)

  // element size hook
  const {ref: containerRef, size: containerSize} =
    useElementSize<HTMLDivElement>();

  // update mediaSizes when container rect OR window size changes
  useEffect(() => {
    // Prefer the actual DOM rect for precise pixel sizes
    const rect = (
      containerRef.current as HTMLElement | null
    )?.getBoundingClientRect();

    if (rect) {
      setMediaSizes(prev => ({
        ...prev,
        container: {width: rect.width, height: rect.height},
      }));
      return;
    }

    if (containerSize) {
      setMediaSizes(prev => ({
        ...prev,
        container: {width: containerSize.width, height: containerSize.height},
      }));
    }
    // Re-run when observed container size or viewport changes
    // Note: do NOT include containerRef in deps (it's stable)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerSize, windowSize.width, windowSize.height]);

  // memoized style object handed to inner container so identity doesn't change every render
  const innerContainerStyle = useMemo(
    () => ({
      width: mediaSizes?.container?.width || '100%',
      height: mediaSizes?.container?.height || '100%',
    }),
    [mediaSizes?.container?.width, mediaSizes?.container?.height],
  );

  // memoized top-level section classes
  const sectionClassName = useMemo(
    () => `relative h-full w-full overflow-hidden`,
    [],
  );

  // memoize container wrapper classes (post/non-post variants)
  const containerWrapperClass = useMemo(
    () => `relative aspect-[4/5] w-full max-w-full overflow-hidden`,
    [],
  );

  const handleClose = (e: any) => {
    e.preventDefault();
    setTimeout(() => {
      setActiveButton(null);
    }, 200);
  };
  const handleIconPress = (close: boolean, add: boolean) => {
    setTimeout(() => {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({
            type: 'BUTTONS_CLICK',
            payload: {
              close: close,
              add: add,
            },
          }),
        );
      }
    }, 200);
  };

  const RenderClose = () => {
    return (
      <button
        onClick={() => handleIconPress(true, false)}
        className="absolute top-5 left-6 z-500 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/60 p-1 text-sm text-white shadow-sm transition-opacity duration-180 hover:bg-black/80 active:opacity-50">
        <FontAwesomeIcon icon={faXmark} size="lg" color="white" />
      </button>
    );
  };
  const RenderPlus = () => {
    return (
      <button
        onClick={() => handleIconPress(false, true)}
        className="absolute right-2 bottom-2 z-500 rounded-full bg-black/60 p-1 text-center text-xs text-white shadow-sm transition-opacity duration-180 hover:bg-black/80 active:opacity-50">
        <FontAwesomeIcon icon={faPlus} size="lg" color="white" />
      </button>
    );
  };

  return (
    <section onClick={e => handleClose(e)} className={sectionClassName}>
      {!post ? (
        <div className="flex h-full w-full items-center justify-center">
          <div className="relative aspect-9/16 max-h-full w-full max-w-full rounded-lg border-[0.5px] border-gray-500 bg-gray-950">
            <div className="flex h-full w-full min-w-0 snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth">
              <MediaCanvasContainer post={post} />
            </div>
          </div>
        </div>
      ) : (
        <div className="relative flex h-full w-full items-start justify-start">
          <div ref={containerRef} className={containerWrapperClass}>
            <RenderClose />
            {mediaFiles.length === 1 &&
            mediaFiles[0].id.startsWith('camera-') ? (
              <></>
            ) : (
              <RenderPlus />
            )}

            <div
              style={innerContainerStyle}
              className="flex min-w-0 snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth">
              <MediaCanvasContainer post={post} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default MediaComponent;
