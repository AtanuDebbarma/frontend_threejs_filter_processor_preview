import {appStore} from '@/store/appStore';
import {useElementSize} from '@/hooks/useElementSize';
import {useMemo} from 'react';

/** Same fit math as AdjustMenu — maps media pixels to preview box CSS. */
export const useAdjustPreviewLayout = (post: boolean, activeIndex: number) => {
  const activeFile = appStore(state => state.mediaFiles[activeIndex]);
  const {ref: previewRef, size: previewSize} = useElementSize<HTMLDivElement>();

  const displayScale = useMemo(() => {
    if (!activeFile || !previewSize?.width || !previewSize?.height) {
      return {x: 1, y: 1};
    }

    const mediaAspect = activeFile.width / activeFile.height;
    const previewAspect = previewSize.width / previewSize.height;

    let displayedWidth: number;
    let displayedHeight: number;

    if (post) {
      if (mediaAspect > previewAspect) {
        displayedHeight = previewSize.height;
        displayedWidth = displayedHeight * mediaAspect;
      } else {
        displayedWidth = previewSize.width;
        displayedHeight = displayedWidth / mediaAspect;
      }
    } else if (mediaAspect > previewAspect) {
      displayedWidth = previewSize.width;
      displayedHeight = displayedWidth / mediaAspect;
    } else {
      displayedHeight = previewSize.height;
      displayedWidth = displayedHeight * mediaAspect;
    }

    return {
      x: activeFile.width / displayedWidth,
      y: activeFile.height / displayedHeight,
    };
  }, [activeFile, previewSize, post]);

  const baseFitScale = useMemo(() => {
    if (!activeFile || !previewSize?.width || !previewSize?.height) {
      return 1;
    }

    const mediaAspect = activeFile.width / activeFile.height;
    const previewAspect = previewSize.width / previewSize.height;

    if (post) {
      return mediaAspect > previewAspect
        ? previewSize.height / activeFile.height
        : previewSize.width / activeFile.width;
    }
    return mediaAspect > previewAspect
      ? previewSize.width / activeFile.width
      : previewSize.height / activeFile.height;
  }, [activeFile, previewSize, post]);

  return {
    activeFile,
    previewRef,
    previewSize,
    displayScale,
    baseFitScale,
  };
};
