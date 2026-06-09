import {appStore} from '@/store/appStore';
import {computeMediaFitLayout} from '@/features/post/helpers/adjust/mediaFitLayout';
import {computeAspectType} from '@/features/post/hooks/canvas/useVerifiedMediaFiles';
import {useElementSize} from '@/features/post/hooks/canvas/useElementSize';
import type {ExportMode} from '@/features/post/types/exportTypes';
import {isPostLayoutMode} from '@/features/post/types/exportTypes';
import {useMemo} from 'react';

/** Same fit math as FilteredMedia — maps media pixels to preview box CSS. */
export const useAdjustPreviewLayout = (
  exportMode: ExportMode,
  activeIndex: number,
) => {
  const activeFile = appStore(state => state.mediaFiles[activeIndex]);
  const canvasSize = appStore(state => state.canvasSize);
  const {ref: previewRef, size: previewSize} = useElementSize<HTMLDivElement>();

  const layoutSize = useMemo(() => {
    if (canvasSize.width > 0 && canvasSize.height > 0) {
      return {width: canvasSize.width, height: canvasSize.height};
    }
    if (previewSize?.width && previewSize?.height) {
      return {width: previewSize.width, height: previewSize.height};
    }
    return null;
  }, [canvasSize.width, canvasSize.height, previewSize]);

  const layout = useMemo(() => {
    if (!activeFile || !layoutSize) {
      return null;
    }
    return computeMediaFitLayout(
      layoutSize.width,
      layoutSize.height,
      activeFile.width,
      activeFile.height,
      exportMode,
      computeAspectType(activeFile.width, activeFile.height),
    );
  }, [activeFile, layoutSize, exportMode]);

  const displayScale = layout?.displayScale ?? {x: 1, y: 1};
  const baseFitScale = layout?.baseFitScale ?? 1;

  const useCanvasDimensions = canvasSize.width > 0 && canvasSize.height > 0;

  return {
    activeFile,
    previewRef,
    previewSize: layoutSize,
    displayScale,
    baseFitScale,
    useCanvasDimensions,
    canvasSize,
    isPostLayout: isPostLayoutMode(exportMode),
  };
};
