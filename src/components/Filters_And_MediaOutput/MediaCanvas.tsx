import React, {useEffect, useMemo, useState} from 'react';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faPen} from '@fortawesome/free-solid-svg-icons';
import {faPlus} from '@fortawesome/free-solid-svg-icons';
import {appStore} from '../../store/appStore';
import type {ButtonStateType} from '../../store/buttonSlices';
import MediaComponent from './MediaComponent';
import {useElementSize} from '../../hooks/useElementSize';
import useWindowSize from '../../hooks/findWindowSize';

const MediaCanvas = ({post}: {post: boolean}): React.JSX.Element => {
  const activeButton = appStore(state => state.activeButton);
  const closeAllButtons = appStore(state => state.closeAllButtons);
  const setActiveButton = appStore(state => state.setActiveButton);

  const windowSize = useWindowSize();

  const [mediaSizes, setMediaSizes] = useState<Record<
    string,
    {width: number; height: number}
  > | null>(null);

  // derived flags (cheap, but memoizing clarifies intent)
  const buttonsOpen = useMemo(() => activeButton !== null, [activeButton]);
  const filterMenuOpen = useMemo(
    () =>
      activeButton === 'filter' ||
      activeButton === 'text' ||
      activeButton === 'editor',
    [activeButton],
  );

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

  // stable callback for toggling toolbar buttons
  const handleButtonToggle = (
    button: ButtonStateType,
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setTimeout(() => setActiveButton(button), 200);
  };

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
        !post
          ? 'my-[5%] rounded-lg border-[0.5px] border-gray-500 bg-gray-950'
          : ''
      } ${filterMenuOpen ? 'mb-40' : ''}`,
    [post, filterMenuOpen],
  );

  // memoize container wrapper classes (post/non-post variants)
  const containerWrapperClass = useMemo(
    () =>
      `relative aspect-[4/5] w-full max-w-full overflow-hidden ${
        filterMenuOpen ? 'mb-10' : ''
      }`,
    [filterMenuOpen],
  );

  return (
    <section onClick={closeAllButtons} className={sectionClassName}>
      {!post ? (
        <div className="flex h-full w-full items-center justify-center">
          <div className="relative aspect-[9/16] max-h-full w-full max-w-full">
            <div className="flex h-full w-full min-w-0 snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth">
              <MediaComponent post={post} />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <div ref={containerRef} className={containerWrapperClass}>
            <div
              style={innerContainerStyle}
              className="flex min-w-0 snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth">
              <MediaComponent post={post} />
            </div>
          </div>
        </div>
      )}

      {/* Add Icon */}
      {post && !buttonsOpen && (
        <div className="absolute bottom-4 left-4 flex h-8 w-8 items-center justify-center rounded-full bg-white p-2 shadow-md">
          <FontAwesomeIcon icon={faPlus} className="text-sm text-black" />
        </div>
      )}

      {/* Edit Icon */}
      {!buttonsOpen && (
        <button
          onClick={e => handleButtonToggle('editor', e)}
          className="absolute right-4 bottom-4 flex h-8 w-8 transform touch-manipulation appearance-none items-center justify-center rounded-full bg-white p-2 shadow-md transition-transform duration-150 ease-in-out select-none focus:outline-none active:scale-95 active:bg-gray-200 active:shadow-inner">
          <FontAwesomeIcon icon={faPen} className="text-sm text-black" />
        </button>
      )}
    </section>
  );
};

export default MediaCanvas;
