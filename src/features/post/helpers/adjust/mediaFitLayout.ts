import type {ExportMode} from '@/shared/types/exportMode';
import {isPostLayoutMode} from '@/features/post/types/exportTypes';

export type MediaFitLayout = {
  /** Multiplier from intrinsic media size → fitted preview/canvas size (matches AdjustMenu CSS scale). */
  baseFitScale: number;
  displayScale: {x: number; y: number};
  displayedWidth: number;
  displayedHeight: number;
};

/**
 * Single source of truth for object-fit-style layout in AdjustMenu and FilteredMedia.
 * Post (4:5) uses cover-like fitting for wide media; reel/story (9:16) uses contain-like for wide media.
 */
export const computeMediaFitLayout = (
  containerWidth: number,
  containerHeight: number,
  mediaWidth: number,
  mediaHeight: number,
  exportMode: ExportMode,
): MediaFitLayout => {
  const cw = Math.max(1, containerWidth);
  const ch = Math.max(1, containerHeight);
  const mw = Math.max(1, mediaWidth);
  const mh = Math.max(1, mediaHeight);

  const mediaAspect = mw / mh;
  const containerAspect = cw / ch;

  let displayedWidth: number;
  let displayedHeight: number;

  if (isPostLayoutMode(exportMode)) {
    if (mediaAspect > containerAspect) {
      displayedHeight = ch;
      displayedWidth = displayedHeight * mediaAspect;
    } else {
      displayedWidth = cw;
      displayedHeight = displayedWidth / mediaAspect;
    }
  } else if (mediaAspect > containerAspect) {
    displayedWidth = cw;
    displayedHeight = displayedWidth / mediaAspect;
  } else {
    displayedHeight = ch;
    displayedWidth = displayedHeight * mediaAspect;
  }

  const baseFitScale = displayedWidth / mw;

  return {
    baseFitScale,
    displayScale: {
      x: mw / displayedWidth,
      y: mh / displayedHeight,
    },
    displayedWidth,
    displayedHeight,
  };
};
