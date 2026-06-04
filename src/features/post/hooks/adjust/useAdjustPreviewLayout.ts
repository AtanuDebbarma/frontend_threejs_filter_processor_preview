import {appStore} from '@/store/appStore';
import {useElementSize} from '@/features/post/hooks/canvas/useElementSize';
import type {ExportMode} from '@/features/post/types/exportTypes';
import {isPostLayoutMode} from '@/features/post/types/exportTypes';
import {useMemo} from 'react';

/** Same fit math as AdjustMenu — maps media pixels to preview box CSS. */
export const useAdjustPreviewLayout = (
  exportMode: ExportMode,
  activeIndex: number,
) => {
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

    if (isPostLayoutMode(exportMode)) {
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
  }, [activeFile, previewSize, exportMode]);

  const baseFitScale = useMemo(() => {
    if (!activeFile || !previewSize?.width || !previewSize?.height) {
      return 1;
    }

    const mediaAspect = activeFile.width / activeFile.height;
    const previewAspect = previewSize.width / previewSize.height;

    if (isPostLayoutMode(exportMode)) {
      return mediaAspect > previewAspect
        ? previewSize.height / activeFile.height
        : previewSize.width / activeFile.width;
    }
    return mediaAspect > previewAspect
      ? previewSize.width / activeFile.width
      : previewSize.height / activeFile.height;
  }, [activeFile, previewSize, exportMode]);

  return {
    activeFile,
    previewRef,
    previewSize,
    displayScale,
    baseFitScale,
  };
};
