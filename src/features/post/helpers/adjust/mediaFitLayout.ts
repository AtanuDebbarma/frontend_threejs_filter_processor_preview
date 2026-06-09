import type {ExportMode} from '@/shared/types/exportMode';
import type {AspectType} from '@/features/post/hooks/canvas/useVerifiedMediaFiles';
import {computeAspectType} from '@/features/post/hooks/canvas/useVerifiedMediaFiles';
import {isPostLayoutMode} from '@/features/post/types/exportTypes';

export type MediaFitLayout = {
  /** Multiplier from intrinsic media size → fitted preview/canvas size (matches AdjustMenu CSS scale). */
  baseFitScale: number;
  displayScale: {x: number; y: number};
  displayedWidth: number;
  displayedHeight: number;
  fitMode: 'contain' | 'cover';
};

export type MediaFitMode = 'contain' | 'cover';

/**
 * Default object-fit for a slide — matches FilteredMedia fallback before MediaCanvas passed fit=cover:
 * post 4:5 → landscape/square contain, vertical cover; reel/story 9:16 → wide contain, tall cover.
 */
export const resolveMediaFitMode = (
  exportMode: ExportMode,
  mediaWidth: number,
  mediaHeight: number,
  containerWidth: number,
  containerHeight: number,
  aspectType?: AspectType,
): MediaFitMode => {
  const mw = Math.max(1, mediaWidth);
  const mh = Math.max(1, mediaHeight);
  const cw = Math.max(1, containerWidth);
  const ch = Math.max(1, containerHeight);
  const mediaAspect = mw / mh;
  const containerAspect = cw / ch;

  if (isPostLayoutMode(exportMode)) {
    const orientation =
      aspectType ?? computeAspectType(mediaWidth, mediaHeight);
    return orientation === 'vertical' ? 'cover' : 'contain';
  }

  return mediaAspect > containerAspect ? 'contain' : 'cover';
};

/**
 * Single source of truth for object-fit-style layout in AdjustMenu and FilteredMedia.
 */
export const computeMediaFitLayout = (
  containerWidth: number,
  containerHeight: number,
  mediaWidth: number,
  mediaHeight: number,
  exportMode: ExportMode,
  aspectType?: AspectType,
): MediaFitLayout => {
  const cw = Math.max(1, containerWidth);
  const ch = Math.max(1, containerHeight);
  const mw = Math.max(1, mediaWidth);
  const mh = Math.max(1, mediaHeight);

  const fitMode = resolveMediaFitMode(exportMode, mw, mh, cw, ch, aspectType);

  const baseFitScale =
    fitMode === 'contain'
      ? Math.min(cw / mw, ch / mh)
      : Math.max(cw / mw, ch / mh);

  const displayedWidth = mw * baseFitScale;
  const displayedHeight = mh * baseFitScale;

  return {
    baseFitScale,
    displayScale: {
      x: mw / displayedWidth,
      y: mh / displayedHeight,
    },
    displayedWidth,
    displayedHeight,
    fitMode,
  };
};
