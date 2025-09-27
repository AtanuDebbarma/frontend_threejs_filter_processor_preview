import React, {useEffect, useMemo, useState} from 'react';
import {MediaCanvas} from './MediaCanvas';
import useWindowSize from '../../hooks/findWindowSize';
import {useElementSize} from '../../hooks/useElementSize';

type PROPS = {
  post: boolean;
};

export const MediaComponent = React.memo(({post}: PROPS): React.JSX.Element => {
  const windowSize = useWindowSize();

  const [mediaSizes, setMediaSizes] = useState<Record<
    string,
    {width: number; height: number}
  > | null>(null);

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
    () =>
      `relative flex-1 overflow-hidden ${
        !post ? 'rounded-lg border-[0.5px] border-gray-500 bg-gray-950' : ''
      }`,
    [post],
  );

  // memoize container wrapper classes (post/non-post variants)
  const containerWrapperClass = useMemo(
    () => `relative aspect-[4/5] w-full max-w-full overflow-hidden`,
    [],
  );

  return (
    <section className={sectionClassName}>
      {!post ? (
        <div className="flex h-full w-full items-center justify-center">
          <div className="relative aspect-[9/16] max-h-full w-full max-w-full">
            <div className="flex h-full w-full min-w-0 snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth">
              <MediaCanvas post={post} />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <div ref={containerRef} className={containerWrapperClass}>
            <div
              style={innerContainerStyle}
              className="flex min-w-0 snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth">
              <MediaCanvas post={post} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
});

/*
 * @displayName MediaComponent
 */
MediaComponent.displayName = 'MediaComponent';
